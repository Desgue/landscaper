/**
 * TerrainPaintHandler — Handles terrain paint and eraser tool interactions.
 *
 * Ported from TerrainLayer.tsx (Konva). Pure logic, no rendering framework deps.
 * Paints terrain cells on mousedown/move, erases on eraser tool.
 * Uses Amanatides-Woo DDA for gap-free brush strokes.
 */

import type { Project, TerrainElement, StructureElement } from '../types/schema'
import { createLogger } from '../utils/logger'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { useTerrainPaintStore } from '../canvas/toolStores'
import type { RendererHandle } from './BaseRenderer'

// ---------------------------------------------------------------------------
// Algorithms (ported from TerrainLayer.tsx — pure functions)
// ---------------------------------------------------------------------------

const log = createLogger('TerrainPaint')

function worldToCell(worldX: number, worldY: number): { cellX: number; cellY: number } {
  return {
    cellX: Math.floor(worldX / 100) * 100,
    cellY: Math.floor(worldY / 100) * 100,
  }
}

function traversedCells(
  ax: number, ay: number, bx: number, by: number,
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
  // Safety cap to prevent infinite loops from NaN/Infinity input
  const maxIterations = Math.abs(endCellX - Math.floor(ax / CELL)) + Math.abs(endCellY - Math.floor(ay / CELL)) + 2
  let iterations = 0
  while ((cellX !== endCellX || cellY !== endCellY) && iterations < maxIterations + 100) {
    if (tMaxX < tMaxY) { cellX += stepX; tMaxX += tDeltaX }
    else { cellY += stepY; tMaxY += tDeltaY }
    cells.push({ cellX: cellX * CELL, cellY: cellY * CELL })
    iterations++
  }
  return cells
}

function brushCells(
  centerCellX: number, centerCellY: number, brushSize: 1 | 2 | 3,
): Array<{ cellX: number; cellY: number }> {
  const cells: Array<{ cellX: number; cellY: number }> = []
  if (brushSize === 1) {
    cells.push({ cellX: centerCellX, cellY: centerCellY })
  } else if (brushSize === 2) {
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 0; dy <= 1; dy++)
        cells.push({ cellX: centerCellX + dx * 100, cellY: centerCellY + dy * 100 })
  } else {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        cells.push({ cellX: centerCellX + dx * 100, cellY: centerCellY + dy * 100 })
  }
  return cells
}

function paintCell(
  cellX: number, cellY: number, terrainTypeId: string,
  draft: Project, layerId: string,
): void {
  // Remove existing terrain at this position
  draft.elements = draft.elements.filter(
    (el) => !(el.type === 'terrain' && el.x === cellX && el.y === cellY),
  )
  // Check if surface structure blocks painting
  const regs = useProjectStore.getState().registries
  const blocked = draft.elements.some(
    (el) =>
      el.type === 'structure' &&
      regs.structures.find((s) => s.id === (el as StructureElement).structureTypeId)?.category === 'surface' &&
      el.x < cellX + 100 && el.x + el.width > cellX &&
      el.y < cellY + 100 && el.y + el.height > cellY,
  )
  if (blocked) {
    log.debug('cell blocked by structure', { cellX, cellY })
    return
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  draft.elements.push({
    id, type: 'terrain', terrainTypeId, x: cellX, y: cellY,
    width: 100, height: 100, rotation: 0, zIndex: 0, locked: false,
    layerId, groupId: null, createdAt: now, updatedAt: now,
  } satisfies TerrainElement)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export interface TerrainPaintHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number, altKey: boolean): void
  onPointerMove(worldX: number, worldY: number, altKey: boolean): void
  onPointerUp(): void
}

export function createTerrainPaintHandler(): TerrainPaintHandle {
  let isDragging = false
  let lastWorldPos: { x: number; y: number } | null = null
  let prePaintSnapshot: Project | null = null

  function onPointerDown(worldX: number, worldY: number, _altKey: boolean): void {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return
    const tool = useToolStore.getState().activeTool
    if (tool !== 'terrain') return

    const proj = useProjectStore.getState().currentProject
    if (!proj) return

    const { selectedTerrainTypeId, brushSize } = useTerrainPaintStore.getState()
    if (!selectedTerrainTypeId) return

    prePaintSnapshot = structuredClone(proj)
    isDragging = true
    lastWorldPos = { x: worldX, y: worldY }

    const { cellX, cellY } = worldToCell(worldX, worldY)
    const layerId = proj.layers[0]?.id ?? 'default'
    const cells = brushCells(cellX, cellY, brushSize)

    useProjectStore.getState().updateProject('paintTerrain', (draft) => {
      for (const cell of cells) {
        paintCell(cell.cellX, cell.cellY, selectedTerrainTypeId, draft, layerId)
      }
    })
  }

  function onPointerMove(worldX: number, worldY: number, _altKey: boolean): void {
    if (!isDragging) return
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return

    const tool = useToolStore.getState().activeTool
    if (tool !== 'terrain') return

    const proj = useProjectStore.getState().currentProject
    if (!proj) return

    const { selectedTerrainTypeId, brushSize } = useTerrainPaintStore.getState()
    if (!selectedTerrainTypeId) return

    const prev = lastWorldPos ?? { x: worldX, y: worldY }
    lastWorldPos = { x: worldX, y: worldY }

    const layerId = proj.layers[0]?.id ?? 'default'
    const traversed = traversedCells(prev.x, prev.y, worldX, worldY)

    useProjectStore.getState().updateProject('paintTerrainStroke', (draft) => {
      for (const tc of traversed) {
        const expanded = brushCells(tc.cellX, tc.cellY, brushSize)
        for (const cell of expanded) {
          paintCell(cell.cellX, cell.cellY, selectedTerrainTypeId, draft, layerId)
        }
      }
    })
  }

  function onPointerUp(): void {
    if (!isDragging) return
    isDragging = false
    lastWorldPos = null

    if (prePaintSnapshot) {
      useHistoryStore.getState().pushHistory(prePaintSnapshot)
      useProjectStore.getState().markDirty()
      prePaintSnapshot = null
    }

    // Select last painted terrain element for inspector
    const proj = useProjectStore.getState().currentProject
    if (proj) {
      const terrainEls = proj.elements.filter((el) => el.type === 'terrain')
      if (terrainEls.length > 0) {
        useInspectorStore.getState().setInspectedElementId(terrainEls[terrainEls.length - 1].id)
      }
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    update(): void {},
    destroy(): void {
      isDragging = false
      lastWorldPos = null
      prePaintSnapshot = null
    },
  }
}
