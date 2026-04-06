/**
 * TerrainLayer — Konva layer for terrain cell painting.
 *
 * Phase B1 of PLAN-B. Implements:
 *   - Rendering terrain elements as 100×100cm colored Rect nodes
 *   - Paint tool (activeTool === 'terrain'): click/drag to fill cells
 *   - Eraser tool (activeTool === 'eraser'): remove terrain cells
 *   - Amanatides-Woo DDA grid traversal for drag painting
 *   - Brush sizes 1×1, 2×2, 3×3
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useRef, useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useInspectorStore } from '../store/useInspectorStore'
import type { TerrainElement, Project } from '../types/schema'

// ─── Terrain paint store (selected terrain type) ──────────────────────────────

interface TerrainPaintState {
  selectedTerrainTypeId: string | null
  brushSize: 1 | 2 | 3
  setSelectedTerrainTypeId: (id: string) => void
  setBrushSize: (size: 1 | 2 | 3) => void
}

export const useTerrainPaintStore = create<TerrainPaintState>((set) => ({
  selectedTerrainTypeId: null,
  brushSize: 1,
  setSelectedTerrainTypeId: (id: string) => set({ selectedTerrainTypeId: id }),
  setBrushSize: (size: 1 | 2 | 3) => set({ brushSize: size }),
}))

// ─── PLAN-B interface contracts ───────────────────────────────────────────────

/** Point-in-terrain-cell hit test. */
export function hitTest(element: TerrainElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX < element.x + 100 &&
    worldY >= element.y &&
    worldY < element.y + 100
  )
}

/** Axis-aligned bounding box of a TerrainElement (always 100×100). */
export function getAABB(element: TerrainElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: 100, h: 100 }
}

// ─── Algorithms ──────────────────────────────────────────────────────────────

/** Map a world position to the top-left corner of the 100cm cell it falls in. */
function worldToCell(worldX: number, worldY: number): { cellX: number; cellY: number } {
  return {
    cellX: Math.floor(worldX / 100) * 100,
    cellY: Math.floor(worldY / 100) * 100,
  }
}

/** Amanatides-Woo DDA grid traversal — all cells the segment A→B crosses. */
function traversedCells(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Array<{ cellX: number; cellY: number }> {
  const CELL = 100
  const cells: Array<{ cellX: number; cellY: number }> = []

  let cellX = Math.floor(ax / CELL)
  let cellY = Math.floor(ay / CELL)
  const endCellX = Math.floor(bx / CELL)
  const endCellY = Math.floor(by / CELL)

  const dx = bx - ax
  const dy = by - ay
  const stepX = dx >= 0 ? 1 : -1
  const stepY = dy >= 0 ? 1 : -1

  const tDeltaX = dx !== 0 ? Math.abs(CELL / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(CELL / dy) : Infinity

  let tMaxX: number
  let tMaxY: number

  if (dx > 0) tMaxX = ((cellX + 1) * CELL - ax) / dx
  else if (dx < 0) tMaxX = (cellX * CELL - ax) / dx
  else tMaxX = Infinity

  if (dy > 0) tMaxY = ((cellY + 1) * CELL - ay) / dy
  else if (dy < 0) tMaxY = (cellY * CELL - ay) / dy
  else tMaxY = Infinity

  cells.push({ cellX: cellX * CELL, cellY: cellY * CELL })

  while (cellX !== endCellX || cellY !== endCellY) {
    if (tMaxX < tMaxY) {
      cellX += stepX
      tMaxX += tDeltaX
    } else {
      cellY += stepY
      tMaxY += tDeltaY
    }
    cells.push({ cellX: cellX * CELL, cellY: cellY * CELL })
  }

  return cells
}

/** Expand a center cell to an NxN brush region. */
function brushCells(
  centerCellX: number,
  centerCellY: number,
  brushSize: 1 | 2 | 3,
): Array<{ cellX: number; cellY: number }> {
  const cells: Array<{ cellX: number; cellY: number }> = []
  if (brushSize === 1) {
    cells.push({ cellX: centerCellX, cellY: centerCellY })
  } else if (brushSize === 2) {
    // 2×2, top-left biased: cursor cell is top-left corner
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        cells.push({ cellX: centerCellX + dx * 100, cellY: centerCellY + dy * 100 })
      }
    }
  } else {
    // 3×3 centered
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        cells.push({ cellX: centerCellX + dx * 100, cellY: centerCellY + dy * 100 })
      }
    }
  }
  return cells
}

/** Paint a single cell into the project draft. */
function paintCell(
  cellX: number,
  cellY: number,
  terrainTypeId: string,
  draft: Project,
  layerId: string,
): void {
  // Remove existing terrain cell at this position (overwrite)
  draft.elements = draft.elements.filter(
    (el) => !(el.type === 'terrain' && el.x === cellX && el.y === cellY),
  )

  // Do NOT paint over surface-category structures
  const regs = useProjectStore.getState().registries
  const blocked = draft.elements.some(
    (el) =>
      el.type === 'structure' &&
      regs.structures.find((s) => s.id === el.structureTypeId)?.category === 'surface' &&
      el.x < cellX + 100 &&
      el.x + el.width > cellX &&
      el.y < cellY + 100 &&
      el.y + el.height > cellY,
  )
  if (blocked) return

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  draft.elements.push({
    id,
    type: 'terrain',
    terrainTypeId,
    x: cellX,
    y: cellY,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    layerId,
    groupId: null,
    createdAt: now,
    updatedAt: now,
  } satisfies TerrainElement)
}

/** Erase a single terrain cell from the project draft. */
function eraseCell(cellX: number, cellY: number, draft: Project): void {
  draft.elements = draft.elements.filter(
    (el) => !(el.type === 'terrain' && el.x === cellX && el.y === cellY),
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TerrainLayerProps {
  width: number
  height: number
}

export default function TerrainLayer({ width: _width, height: _height }: TerrainLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const { updateProject } = useProjectStore()
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)

  // Currently selected terrain type (managed by SidePalette via store)
  const selectedTerrainTypeId = useTerrainPaintStore((s) => s.selectedTerrainTypeId)
  const brushSize = useTerrainPaintStore((s) => s.brushSize)

  // Track drag state in refs to avoid stale closures (FIX 5)
  const isDraggingRef = useRef(false)
  const lastWorldPosRef = useRef<{ x: number; y: number } | null>(null)
  const prePaintSnapRef = useRef<Project | null>(null)

  const isTerrainTool = activeTool === 'terrain'
  const isEraserTool = activeTool === 'eraser'
  const isActive = isTerrainTool || isEraserTool

  /** Convert a Konva event pointer to raw world coordinates.
   *  Terrain uses cell-based placement (worldToCell handles alignment),
   *  so we do NOT snap to 100cm here — that would double-round and offset
   *  the painted cell from the cursor. */
  const getWorldPos = useCallback((e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } => {
    const stage = e.target.getStage()
    if (!stage) return { x: 0, y: 0 }

    // getRelativePointerPosition returns world-space coords accounting for
    // the Stage's pan/zoom transform — correct at any zoom level.
    const worldPos = stage.getRelativePointerPosition()
    if (!worldPos) return { x: 0, y: 0 }

    return worldPos
  }, [])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isActive) return
    const proj = useProjectStore.getState().currentProject
    if (!proj) return
    if (e.evt.button !== 0) return

    // FIX 3: Capture pre-paint snapshot BEFORE mutation
    prePaintSnapRef.current = structuredClone(proj)

    isDraggingRef.current = true
    const worldPos = getWorldPos(e)
    lastWorldPosRef.current = worldPos

    const { cellX, cellY } = worldToCell(worldPos.x, worldPos.y)
    const layerId = proj.layers[0]?.id ?? 'default'

    if (isTerrainTool && !selectedTerrainTypeId) {
      console.warn('[TerrainLayer] paint attempted with no terrain type selected')
      return
    }

    if (isTerrainTool && selectedTerrainTypeId) {
      const cells = brushCells(cellX, cellY, brushSize)
      updateProject((draft) => {
        for (const cell of cells) {
          paintCell(cell.cellX, cell.cellY, selectedTerrainTypeId, draft, layerId)
        }
      })
    } else if (isEraserTool) {
      // FIX 15: Check selection priority - only erase terrain if no higher-priority element at cursor
      const higherPriorityExists = proj.elements.some(el =>
        el.type !== 'terrain' &&
        el.x < worldPos.x && el.x + el.width > worldPos.x &&
        el.y < worldPos.y && el.y + el.height > worldPos.y
      )
      if (higherPriorityExists) return
      updateProject((draft) => {
        eraseCell(cellX, cellY, draft)
      })
    }
  }, [isActive, isTerrainTool, isEraserTool, selectedTerrainTypeId, brushSize, getWorldPos, updateProject])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isActive || !isDraggingRef.current) return
    const proj = useProjectStore.getState().currentProject
    if (!proj) return

    const worldPos = getWorldPos(e)
    const prev = lastWorldPosRef.current ?? worldPos
    lastWorldPosRef.current = worldPos

    const layerId = proj.layers[0]?.id ?? 'default'

    if (isTerrainTool && selectedTerrainTypeId) {
      // Use Amanatides-Woo to collect all traversed cells
      const traversed = traversedCells(prev.x, prev.y, worldPos.x, worldPos.y)
      updateProject((draft) => {
        for (const tc of traversed) {
          const expanded = brushCells(tc.cellX, tc.cellY, brushSize)
          for (const cell of expanded) {
            paintCell(cell.cellX, cell.cellY, selectedTerrainTypeId, draft, layerId)
          }
        }
      })
    } else if (isEraserTool) {
      // FIX 15: Check selection priority
      const higherPriorityExists = proj.elements.some(el =>
        el.type !== 'terrain' &&
        el.x < worldPos.x && el.x + el.width > worldPos.x &&
        el.y < worldPos.y && el.y + el.height > worldPos.y
      )
      if (higherPriorityExists) return
      const traversed = traversedCells(prev.x, prev.y, worldPos.x, worldPos.y)
      updateProject((draft) => {
        for (const tc of traversed) {
          eraseCell(tc.cellX, tc.cellY, draft)
        }
      })
    }
  }, [isActive, isTerrainTool, isEraserTool, selectedTerrainTypeId, brushSize, getWorldPos, updateProject])

  const handleMouseUp = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isActive || !isDraggingRef.current) return
    isDraggingRef.current = false
    lastWorldPosRef.current = null

    // FIX 3: Push the pre-paint snapshot (captured in handleMouseDown)
    const snap = prePaintSnapRef.current
    if (snap) { pushHistory(snap); prePaintSnapRef.current = null }

    // Set the last-painted terrain cell as inspected element
    const proj = useProjectStore.getState().currentProject
    if (proj) {
      const terrainEls = proj.elements.filter((el) => el.type === 'terrain')
      if (terrainEls.length > 0) {
        useInspectorStore.getState().setInspectedElementId(terrainEls[terrainEls.length - 1].id)
      }
    }
  }, [isActive, pushHistory])

  // FIX 6: Window-level mouseup to reset drag state on missed mouseup
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        lastWorldPosRef.current = null
        const snap = prePaintSnapRef.current
        if (snap) { pushHistory(snap); prePaintSnapRef.current = null }
        // Set the last-painted terrain cell as inspected element
        const proj = useProjectStore.getState().currentProject
        if (proj) {
          const terrainEls = proj.elements.filter((el) => el.type === 'terrain')
          if (terrainEls.length > 0) {
            useInspectorStore.getState().setInspectedElementId(terrainEls[terrainEls.length - 1].id)
          }
        }
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [pushHistory])

  if (!project) return null

  // Render terrain elements
  const terrainElements = project.elements.filter(
    (el): el is TerrainElement => el.type === 'terrain',
  )

  return (
    <Layer listening={isActive}>
      {/* Transparent hit area — handlers MUST live on the Rect, not the Layer.
          In Konva, transparent fills have alpha=0 in the hit canvas, so the shape
          won't register pointer events unless handlers are attached directly to it. */}
      {isActive && (
        <Rect
          x={-50000}
          y={-50000}
          width={100000}
          height={100000}
          fill="rgba(0,0,0,0.001)"
          listening={true}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}

      {terrainElements.map((el) => {
        const terrainType = registries.terrain.find((t) => t.id === el.terrainTypeId)
        if (!terrainType) return null
        return (
          <Rect
            key={el.id}
            x={el.x}
            y={el.y}
            width={100}
            height={100}
            fill={terrainType.color}
            listening={false}
          />
        )
      })}
    </Layer>
  )
}
