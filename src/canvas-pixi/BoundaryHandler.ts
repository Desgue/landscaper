/**
 * BoundaryHandler — Boundary placement and editing tool handler for PixiJS Phase 4.
 *
 * Ported from YardBoundaryLayer.tsx (Konva). Handles:
 *   - Placement mode: click to add vertices, close detection, commit boundary
 *   - Editing mode: vertex drag, arc handle drag, edge label editing
 *
 * Framework-agnostic — mutates Zustand stores only.
 * Note: The HTML overlays (placement instructions, Done button, edge-length input)
 * remain in the existing YardBoundaryHTMLOverlays component.
 */

import type { Vec2, YardBoundary, YardBoundaryEdge, Project } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { snapPoint } from '../snap/snapSystem'
import { sampleArc } from '../canvas/arcGeometry'
import type { RendererHandle } from './BaseRenderer'

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return false
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross
  return t > 0 && t < 1 && u > 0 && u < 1
}

export function hasSelfIntersection(vertices: Vec2[]): boolean {
  const n = vertices.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a1 = vertices[i], a2 = vertices[(i + 1) % n]
    for (let j = i + 2; j < n; j++) {
      if (j === (i + n - 1) % n) continue
      const b1 = vertices[j], b2 = vertices[(j + 1) % n]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

export function propagateEdge(
  vertices: Vec2[], editedEdgeIndex: number, newLength: number,
): Vec2[] {
  const n = vertices.length
  if (n === 0 || editedEdgeIndex < 0 || editedEdgeIndex >= n) return vertices.map((v) => ({ ...v }))
  const cloned = vertices.map((v) => ({ x: v.x, y: v.y }))
  const startVert = cloned[editedEdgeIndex]
  const endIdx = (editedEdgeIndex + 1) % n
  const endVert = cloned[endIdx]
  const dx = endVert.x - startVert.x, dy = endVert.y - startVert.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-6) return cloned
  const dirX = dx / len, dirY = dy / len
  const newEndX = startVert.x + dirX * newLength
  const newEndY = startVert.y + dirY * newLength
  const deltaX = newEndX - endVert.x
  const deltaY = newEndY - endVert.y
  let idx = endIdx
  while (idx !== editedEdgeIndex) {
    cloned[idx].x += deltaX
    cloned[idx].y += deltaY
    idx = (idx + 1) % n
  }
  return cloned
}

// ---------------------------------------------------------------------------
// Snap helper
// ---------------------------------------------------------------------------

function snapWorldPoint(worldX: number, worldY: number, altKey: boolean): Vec2 {
  const proj = useProjectStore.getState().currentProject
  if (!proj) return { x: worldX, y: worldY }
  const zoom = useViewportStore.getState().zoom
  const result = snapPoint(
    worldX, worldY, 'place', proj.elements, zoom,
    proj.gridConfig.snapIncrementCm,
    proj.uiState.snapEnabled, altKey,
  )
  return { x: result.x, y: result.y }
}

// ---------------------------------------------------------------------------
// Boundary state (shared with HTML overlays via store-like interface)
// ---------------------------------------------------------------------------

export interface BoundaryPlacementState {
  isPlacing: boolean
  placedVertices: Vec2[]
  cursorWorld: Vec2 | null
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export interface BoundaryHandle extends RendererHandle {
  // Placement mode
  onPlacementClick(worldX: number, worldY: number, altKey: boolean): void
  onPlacementMove(worldX: number, worldY: number, altKey: boolean): void
  commitBoundary(): void
  getPlacementState(): BoundaryPlacementState

  // Editing mode
  onVertexDragStart(vertexIndex: number): void
  onVertexDrag(vertexIndex: number, worldX: number, worldY: number, altKey: boolean): void
  onVertexDragEnd(vertexIndex: number): void
  onArcHandleDragStart(edgeIndex: number): void
  onArcHandleDrag(edgeIndex: number, worldX: number, worldY: number): void
  onArcHandleDragEnd(): void
  onEdgeLabelClick(edgeIndex: number): void
  applyEdgeLength(edgeIndex: number, newLengthMeters: number): void
  deleteBoundary(): void
}

export function createBoundaryHandler(): BoundaryHandle {
  let isPlacing = false
  let placedVertices: Vec2[] = []
  let cursorWorld: Vec2 | null = null
  let preDragSnapshot: Project | null = null
  let preArcDragSnapshot: Project | null = null

  // Auto-enter placement mode when no boundary exists
  function checkAutoPlacement(): void {
    const proj = useProjectStore.getState().currentProject
    if (proj && !proj.yardBoundary && !isPlacing) {
      isPlacing = true
      placedVertices = []
      cursorWorld = null
    }
  }

  function isNearFirstVertex(pos: Vec2): boolean {
    if (placedVertices.length < 3) return false
    const zoom = useViewportStore.getState().zoom
    const tol = 8 / zoom
    return dist(pos, placedVertices[0]) <= tol
  }

  function doCommitBoundary(verts: Vec2[]): void {
    if (verts.length < 3) return
    const n = verts.length
    const edgeTypes: YardBoundaryEdge[] = Array.from(
      { length: n },
      () => ({ type: 'line' as const, arcSagitta: null }),
    )
    const edgeLengths: (number | null)[] = Array.from({ length: n }, () => null)
    const snap = useProjectStore.getState().currentProject
    if (snap) useHistoryStore.getState().pushHistory(structuredClone(snap))
    useProjectStore.getState().updateProject((draft) => {
      draft.yardBoundary = { vertices: verts, edgeLengths, edgeTypes }
    })
    useProjectStore.getState().markDirty()
    isPlacing = false
    placedVertices = []
    cursorWorld = null
  }

  return {
    // ---- Placement mode ----
    onPlacementClick(worldX: number, worldY: number, altKey: boolean): void {
      checkAutoPlacement()
      if (!isPlacing) return
      if (useToolStore.getState().activeTool !== 'select') return
      const snapped = snapWorldPoint(worldX, worldY, altKey)
      if (isNearFirstVertex(snapped)) {
        doCommitBoundary(placedVertices)
        return
      }
      placedVertices = [...placedVertices, snapped]
    },

    onPlacementMove(worldX: number, worldY: number, altKey: boolean): void {
      if (!isPlacing) return
      if (useToolStore.getState().activeTool !== 'select') return
      const snapped = snapWorldPoint(worldX, worldY, altKey)
      cursorWorld = snapped
    },

    commitBoundary(): void {
      doCommitBoundary(placedVertices)
    },

    getPlacementState(): BoundaryPlacementState {
      checkAutoPlacement()
      return { isPlacing, placedVertices, cursorWorld }
    },

    // ---- Editing mode: vertex drag ----
    onVertexDragStart(_vertexIndex: number): void {
      const snap = useProjectStore.getState().currentProject
      preDragSnapshot = snap ? structuredClone(snap) : null
    },

    onVertexDrag(vertexIndex: number, worldX: number, worldY: number, altKey: boolean): void {
      const snapped = snapWorldPoint(worldX, worldY, altKey)
      useProjectStore.getState().updateProject((draft) => {
        if (!draft.yardBoundary) return
        if (vertexIndex < 0 || vertexIndex >= draft.yardBoundary.vertices.length) return
        draft.yardBoundary.vertices[vertexIndex] = { x: snapped.x, y: snapped.y }
      })
    },

    onVertexDragEnd(_vertexIndex: number): void {
      if (preDragSnapshot) {
        useHistoryStore.getState().pushHistory(preDragSnapshot)
        useProjectStore.getState().markDirty()
        preDragSnapshot = null
      }
    },

    // ---- Editing mode: arc handle drag ----
    onArcHandleDragStart(_edgeIndex: number): void {
      const snap = useProjectStore.getState().currentProject
      preArcDragSnapshot = snap ? structuredClone(snap) : null
    },

    onArcHandleDrag(edgeIndex: number, worldX: number, worldY: number): void {
      const proj = useProjectStore.getState().currentProject
      if (!proj?.yardBoundary) return
      const bnd = proj.yardBoundary
      const n = bnd.vertices.length
      if (edgeIndex < 0 || edgeIndex >= n) return
      const p1 = bnd.vertices[edgeIndex]
      const p2 = bnd.vertices[(edgeIndex + 1) % n]
      const chordDx = p2.x - p1.x, chordDy = p2.y - p1.y
      const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
      if (chordLen < 1e-6) return
      const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
      const perpX = -chordDy / chordLen, perpY = chordDx / chordLen
      const sagitta = (worldX - midX) * perpX + (worldY - midY) * perpY

      useProjectStore.getState().updateProject((draft) => {
        if (!draft.yardBoundary) return
        if (edgeIndex < 0 || edgeIndex >= draft.yardBoundary.edgeTypes.length) return
        draft.yardBoundary.edgeTypes[edgeIndex] = {
          type: Math.abs(sagitta) > 1 ? 'arc' : 'line',
          arcSagitta: Math.abs(sagitta) > 1 ? sagitta : null,
        }
      })
    },

    onArcHandleDragEnd(): void {
      if (preArcDragSnapshot) {
        useHistoryStore.getState().pushHistory(preArcDragSnapshot)
        useProjectStore.getState().markDirty()
        preArcDragSnapshot = null
      }
    },

    // ---- Editing mode: edge label ----
    onEdgeLabelClick(_edgeIndex: number): void {
      // Edge label editing is handled by the existing HTML overlay
      // (YardBoundaryHTMLOverlays). This handler is a placeholder
      // for the interaction routing — the actual UI is in React.
    },

    applyEdgeLength(edgeIndex: number, newLengthMeters: number): void {
      const newLengthCm = newLengthMeters * 100
      if (!Number.isFinite(newLengthCm) || newLengthCm <= 0) return

      const proj = useProjectStore.getState().currentProject
      if (!proj?.yardBoundary) return
      const n = proj.yardBoundary.vertices.length
      if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= n) return

      const snapshot = structuredClone(proj)
      const newVertices = propagateEdge(proj.yardBoundary.vertices, edgeIndex, newLengthCm)

      useProjectStore.getState().updateProject((draft) => {
        if (!draft.yardBoundary) return
        draft.yardBoundary.vertices = newVertices
      })
      useHistoryStore.getState().pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },

    deleteBoundary(): void {
      const proj = useProjectStore.getState().currentProject
      if (!proj?.yardBoundary) return
      const snapshot = structuredClone(proj)
      useProjectStore.getState().updateProject((draft) => {
        draft.yardBoundary = null
      })
      useHistoryStore.getState().pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },

    update(): void {},
    destroy(): void {
      isPlacing = false
      placedVertices = []
      cursorWorld = null
      preDragSnapshot = null
      preArcDragSnapshot = null
    },
  }
}
