/**
 * StructureLayer — Konva layer for structure placement and rendering.
 *
 * Phase B2 of PLAN-B. Implements:
 *   - Rendering structure elements as colored Rect nodes with labels
 *   - Structure tool (activeTool === 'structure'): two-click placement
 *   - Arc tool (activeTool === 'arc'): 3-step placement (start → end → curvature)
 *   - AABB collision detection (blocks placement on boundary/feature/furniture)
 *   - Ghost preview during placement
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { Layer, Rect, Group, Text, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { snapPoint } from '../snap/snapSystem'
import { sampleArc, arcAABB } from './arcGeometry'
import type { StructureElement, StructureType, Vec2 } from '../types/schema'

// ─── Structure tool store ───────────────────────────────────────────────────

interface StructureToolState {
  selectedStructureTypeId: string | null
  setSelectedStructureTypeId: (id: string) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStructureToolStore = create<StructureToolState>((set) => ({
  selectedStructureTypeId: null,
  setSelectedStructureTypeId: (id: string) => set({ selectedStructureTypeId: id }),
}))

// ─── Category color map ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  boundary: '#6b7280',
  container: '#92400e',
  surface: '#d97706',
  overhead: '#7c3aed',
  feature: '#0891b2',
  furniture: '#1d4ed8',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#6b7280'
}

// ─── Categories that block structure placement ──────────────────────────────

const BLOCKING_CATEGORIES = new Set(['boundary', 'feature', 'furniture'])

// ─── PLAN-C/D interface contracts ───────────────────────────────────────────

/** AABB hit test (ignores rotation for MVP). */
// eslint-disable-next-line react-refresh/only-export-components
export function hitTest(element: StructureElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX <= element.x + element.width &&
    worldY >= element.y &&
    worldY <= element.y + element.height
  )
}

/** Axis-aligned bounding box of a StructureElement. */
// eslint-disable-next-line react-refresh/only-export-components
export function getAABB(element: StructureElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

// ─── Collision helper ───────────────────────────────────────────────────────

/** Check if a new rect AABB overlaps any blocking structure. */
function hasStructureCollision(
  newX: number,
  newY: number,
  newW: number,
  newH: number,
  existingStructures: StructureElement[],
  structureRegistry: StructureType[],
): boolean {
  for (const s of existingStructures) {
    const st = structureRegistry.find((r) => r.id === s.structureTypeId)
    if (!st) continue
    // surface, overhead, container do NOT block other structures
    if (!BLOCKING_CATEGORIES.has(st.category)) continue
    // AABB overlap test
    if (
      newX < s.x + s.width &&
      newX + newW > s.x &&
      newY < s.y + s.height &&
      newY + newH > s.y
    ) {
      return true
    }
  }
  return false
}

// ─── Component ──────────────────────────────────────────────────────────────

interface StructureLayerProps {
  width: number
  height: number
}

interface PlacingState {
  anchorX: number
  anchorY: number
}

/** Arc tool 3-step state: after both endpoints are set, user adjusts curvature. */
interface ArcPlacingState {
  p1: Vec2
  p2: Vec2
  sagitta: number
}

interface GhostState {
  x: number
  y: number
  width: number
  height: number
  blocked: boolean
}

/** Helper: convert two endpoints + sagitta to bounding rect using correct arc AABB. */
function arcToRect(p1: Vec2, p2: Vec2, sagitta: number, depthCm: number): { x: number; y: number; width: number; height: number } {
  const { minX, minY, maxX, maxY } = arcAABB(p1, p2, sagitta)
  const w = Math.max(maxX - minX, depthCm)
  const h = Math.max(maxY - minY, depthCm)
  return { x: minX, y: minY, width: w, height: h }
}

/** Helper: convert Vec2[] to flat Konva points array. */
function toKonvaPoints(pts: Vec2[]): number[] {
  const flat: number[] = []
  for (const p of pts) flat.push(p.x, p.y)
  return flat
}

export default function StructureLayer({ width: _width, height: _height }: StructureLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)
  const zoom = useViewportStore((s) => s.zoom)

  const selectedStructureTypeId = useStructureToolStore((s) => s.selectedStructureTypeId)

  const placingRef = useRef<PlacingState | null>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  // Arc tool 3-step state
  const arcPlacingRef = useRef<ArcPlacingState | null>(null)
  const [arcPreview, setArcPreview] = useState<{ p1: Vec2; p2: Vec2; sagitta: number } | null>(null)
  const [arcAnchor, setArcAnchor] = useState<Vec2 | null>(null) // First endpoint (visible dot)

  const isStructureTool = activeTool === 'structure'
  const isArcTool = activeTool === 'arc'
  const isActive = (isStructureTool || isArcTool) && selectedStructureTypeId !== null

  // Reset all placement state when tool changes
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on tool change */
  useEffect(() => {
    placingRef.current = null
    arcPlacingRef.current = null
    setGhost(null)
    setArcPreview(null)
    setArcAnchor(null)
  }, [activeTool])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Escape key cancels in-progress placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (arcPlacingRef.current || arcAnchor || placingRef.current) {
        e.preventDefault()
        placingRef.current = null
        arcPlacingRef.current = null
        setGhost(null)
        setArcPreview(null)
        setArcAnchor(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [arcAnchor])

  /** Get snapped world coordinates from a Konva event. */
  const getSnappedWorld = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } => {
      const stage = e.target.getStage()
      if (!stage) return { x: 0, y: 0 }
      const worldPos = stage.getRelativePointerPosition()
      if (!worldPos) return { x: 0, y: 0 }

      const proj = useProjectStore.getState().currentProject
      if (!proj) return worldPos

      // Read zoom fresh from store to avoid stale closure after zoom changes
      const currentZoom = useViewportStore.getState().zoom
      const altHeld = e.evt.altKey
      const snapped = snapPoint(
        worldPos.x,
        worldPos.y,
        'place',
        proj.elements,
        currentZoom,
        proj.gridConfig.snapIncrementCm ?? 10,
        proj.uiState.snapEnabled,
        altHeld,
      )
      return { x: snapped.x, y: snapped.y }
    },
    [],
  )

  /** Compute the placement rect from anchor + current point. */
  const computeRect = useCallback(
    (anchor: PlacingState, current: { x: number; y: number }, structureType: StructureType) => {
      const dx = current.x - anchor.anchorX
      const dy = current.y - anchor.anchorY
      const samePoint = Math.abs(dx) < 1 && Math.abs(dy) < 1

      if (samePoint) {
        // Single click: use default dims, centered on anchor
        const w = structureType.defaultWidthCm
        const h = structureType.defaultDepthCm
        return { x: anchor.anchorX - w / 2, y: anchor.anchorY - h / 2, width: w, height: h }
      }

      // Drag: use delta for width/height
      const x = dx >= 0 ? anchor.anchorX : current.x
      const y = dy >= 0 ? anchor.anchorY : current.y
      const w = Math.abs(dx)
      const h = Math.abs(dy)
      return { x, y, width: w, height: h }
    },
    [],
  )

  /** Commit a structure element to the project. */
  const commitStructure = useCallback(
    (rect: { x: number; y: number; width: number; height: number }, shape: 'straight' | 'curved', sagitta: number | null) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj || !selectedStructureTypeId) return

      const regs = useProjectStore.getState().registries
      const existingStructures = proj.elements.filter(
        (el): el is StructureElement => el.type === 'structure',
      )
      if (hasStructureCollision(rect.x, rect.y, rect.width, rect.height, existingStructures, regs.structures)) {
        return
      }

      const snapshot = structuredClone(proj)
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      updateProject((draft) => {
        draft.elements.push({
          id,
          type: 'structure',
          structureTypeId: selectedStructureTypeId,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          rotation: 0,
          zIndex: 0,
          locked: false,
          layerId,
          groupId: null,
          createdAt: now,
          updatedAt: now,
          shape,
          arcSagitta: sagitta,
          notes: null,
        } satisfies StructureElement)
      })

      pushHistory(snapshot)
      useInspectorStore.getState().setInspectedElementId(id)
    },
    [selectedStructureTypeId, updateProject, pushHistory],
  )

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isActive || !selectedStructureTypeId) return
      if (e.evt.button !== 0) return

      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      const regs = useProjectStore.getState().registries
      const structureType = regs.structures.find((s) => s.id === selectedStructureTypeId)
      if (!structureType) return

      const world = getSnappedWorld(e)

      // ── Arc tool: 3-step workflow ──────────────────────────────────────
      if (isArcTool) {
        if (!arcAnchor) {
          // Step 1: Set first endpoint
          setArcAnchor(world)
          return
        }
        if (!arcPlacingRef.current) {
          // Step 2: Set second endpoint → enter curvature mode
          const p1 = arcAnchor
          const p2 = world
          arcPlacingRef.current = { p1, p2, sagitta: 0 }
          setArcPreview({ p1, p2, sagitta: 0 })
          return
        }
        // Step 3: Commit with current sagitta
        const { p1, p2, sagitta } = arcPlacingRef.current
        const depthCm = structureType.defaultDepthCm
        // If sagitta is ~0, treat as straight (no meaningful arc)
        const isCurved = Math.abs(sagitta) > 1
        const rect = arcToRect(p1, p2, sagitta, depthCm)
        commitStructure(rect, isCurved ? 'curved' : 'straight', isCurved ? sagitta : null)
        arcPlacingRef.current = null
        setArcPreview(null)
        setArcAnchor(null)
        return
      }

      // ── Structure tool: 2-click workflow ───────────────────────────────
      if (!placingRef.current) {
        placingRef.current = { anchorX: world.x, anchorY: world.y }
        const w = structureType.defaultWidthCm
        const h = structureType.defaultDepthCm
        const existingStructures = proj.elements.filter(
          (el): el is StructureElement => el.type === 'structure',
        )
        const blocked = hasStructureCollision(
          world.x - w / 2, world.y - h / 2, w, h,
          existingStructures, regs.structures,
        )
        setGhost({ x: world.x - w / 2, y: world.y - h / 2, width: w, height: h, blocked })
      } else {
        const rect = computeRect(placingRef.current, world, structureType)
        commitStructure(rect, 'straight', null)
        placingRef.current = null
        setGhost(null)
      }
    },
    [isActive, isArcTool, selectedStructureTypeId, getSnappedWorld, computeRect, commitStructure, arcAnchor],
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isActive || !selectedStructureTypeId) return

      const world = getSnappedWorld(e)

      // ── Arc tool curvature adjustment (step 3) ─────────────────────────
      if (isArcTool && arcPlacingRef.current) {
        const { p1, p2 } = arcPlacingRef.current
        // Compute sagitta from cursor position perpendicular to chord
        const chordDx = p2.x - p1.x, chordDy = p2.y - p1.y
        const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
        if (chordLen > 1e-6) {
          const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
          const perpX = -chordDy / chordLen, perpY = chordDx / chordLen
          const sagitta = (world.x - midX) * perpX + (world.y - midY) * perpY
          arcPlacingRef.current.sagitta = sagitta
          setArcPreview({ p1, p2, sagitta })
        }
        return
      }

      // ── Arc tool: show preview line from anchor to cursor (step 2) ─────
      if (isArcTool && arcAnchor && !arcPlacingRef.current) {
        setArcPreview({ p1: arcAnchor, p2: world, sagitta: 0 })
        return
      }

      // ── Structure tool ghost preview ───────────────────────────────────
      if (!placingRef.current) return

      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      const regs = useProjectStore.getState().registries
      const structureType = regs.structures.find((s) => s.id === selectedStructureTypeId)
      if (!structureType) return

      const rect = computeRect(placingRef.current, world, structureType)
      const existingStructures = proj.elements.filter(
        (el): el is StructureElement => el.type === 'structure',
      )
      const blocked = hasStructureCollision(
        rect.x, rect.y, rect.width, rect.height,
        existingStructures, regs.structures,
      )
      setGhost({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, blocked })
    },
    [isActive, isArcTool, selectedStructureTypeId, getSnappedWorld, computeRect, arcAnchor],
  )

  if (!project) return null

  const layers = project?.layers ?? []
  const layerMap = new Map(layers.map((l) => [l.id, l]))

  const structureElements = project.elements.filter(
    (el): el is StructureElement => el.type === 'structure',
  )

  return (
    <Layer listening={isActive}>
      {/* Transparent hit area for placement */}
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
        />
      )}

      {/* Render existing structures */}
      {structureElements.map((el) => {
        const structureType = registries.structures.find((s) => s.id === el.structureTypeId)
        if (!structureType) return null
        const category = structureType.category
        const color = getCategoryColor(category)
        const isOverhead = category === 'overhead'

        const isEffectivelyLocked = el.locked || (layerMap.get(el.layerId)?.locked ?? false)

        // Curved structures: render arc outline
        if (el.shape === 'curved' && el.arcSagitta !== null) {
          const p1: Vec2 = { x: el.x, y: el.y + el.height / 2 }
          const p2: Vec2 = { x: el.x + el.width, y: el.y + el.height / 2 }
          const arcPts = sampleArc(p1, p2, el.arcSagitta, 32)
          return (
            <Group key={el.id} listening={false} opacity={isEffectivelyLocked ? 0.5 : 1}>
              <Line
                points={toKonvaPoints(arcPts)}
                stroke={color}
                strokeWidth={Math.max(el.height * 0.3, 8)}
                opacity={isOverhead ? 0.5 : 1}
                lineCap="round"
                lineJoin="round"
              />
              <Line
                points={toKonvaPoints(arcPts)}
                stroke="#1e293b"
                strokeWidth={1.5 / zoom}
              />
              <Text
                x={(p1.x + p2.x) / 2 - el.width / 2}
                y={(p1.y + p2.y) / 2 - (12 / zoom)}
                width={el.width}
                text={structureType.name}
                fontSize={12 / zoom}
                fill="#fff"
                align="center"
                listening={false}
              />
            </Group>
          )
        }

        return (
          <Group key={el.id} listening={false} opacity={isEffectivelyLocked ? 0.5 : 1}>
            <Rect
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rotation={el.rotation}
              fill={color}
              opacity={isOverhead ? 0.5 : 1}
              stroke="#1e293b"
              strokeWidth={1.5 / zoom}
            />
            <Text
              x={el.x}
              y={el.y + el.height / 2 - (12 / zoom) / 2}
              width={el.width}
              text={structureType.name}
              fontSize={12 / zoom}
              fill="#fff"
              align="center"
              listening={false}
            />
          </Group>
        )
      })}

      {/* Ghost preview while placing (structure tool) */}
      {ghost && (
        <Rect
          x={ghost.x}
          y={ghost.y}
          width={ghost.width}
          height={ghost.height}
          fill={ghost.blocked ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}
          stroke={ghost.blocked ? '#ef4444' : '#3b82f6'}
          strokeWidth={1.5 / zoom}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      )}

      {/* Arc tool: anchored first endpoint */}
      {isArcTool && arcAnchor && (
        <Circle
          x={arcAnchor.x}
          y={arcAnchor.y}
          radius={6 / zoom}
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth={1.5 / zoom}
          listening={false}
        />
      )}

      {/* Arc tool: preview line or arc curve */}
      {arcPreview && (
        <>
          {Math.abs(arcPreview.sagitta) > 1 ? (
            <Line
              points={toKonvaPoints(sampleArc(arcPreview.p1, arcPreview.p2, arcPreview.sagitta, 32))}
              stroke="#3b82f6"
              strokeWidth={2 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          ) : (
            <Line
              points={[arcPreview.p1.x, arcPreview.p1.y, arcPreview.p2.x, arcPreview.p2.y]}
              stroke="#3b82f6"
              strokeWidth={2 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          )}
          {/* Both endpoint dots (visible during curvature adjustment — step 3) */}
          {arcAnchor && arcPreview.sagitta !== 0 && (
            <>
              <Circle
                x={arcPreview.p1.x}
                y={arcPreview.p1.y}
                radius={6 / zoom}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={1.5 / zoom}
                listening={false}
              />
              <Circle
                x={arcPreview.p2.x}
                y={arcPreview.p2.y}
                radius={6 / zoom}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={1.5 / zoom}
                listening={false}
              />
            </>
          )}
        </>
      )}
    </Layer>
  )
}
