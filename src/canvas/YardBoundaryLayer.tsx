/**
 * YardBoundaryLayer — Konva layer + HTML overlays for yard boundary placement/editing.
 *
 * Phase B1 of PLAN-B. Architecture:
 *   - useBoundaryState: shared Zustand store that bridges the Konva layer
 *     (inside Stage) with HTML overlay divs (outside Stage).
 *   - YardBoundaryLayer (default export): Konva <Layer> rendered inside Stage.
 *   - OverflowDimLayer (named export): separate Konva <Layer> for the outside-dim effect.
 *   - YardBoundaryHTMLOverlays (named export): HTML overlays rendered outside Stage.
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useEffect, useRef, useCallback } from 'react'
import { create } from 'zustand'
import { Layer, Line, Circle, Text, Shape, Rect } from 'react-konva'
import type Konva from 'konva'
import type { Vec2, YardBoundary, YardBoundaryEdge, Project } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { snapPoint } from '../snap/snapSystem'
import { sampleArc, segmentsIntersect, arcAABB } from './arcGeometry'

// ─── PLAN-B interface contracts ───────────────────────────────────────────────

/** Point-in-polygon test via horizontal ray casting, with arc edge support (FIX 14). */
// eslint-disable-next-line react-refresh/only-export-components
export function hitTest(boundary: YardBoundary | null, worldX: number, worldY: number): boolean {
  if (!boundary || boundary.vertices.length < 3) return false
  const verts = boundary.vertices
  const n = verts.length
  let inside = false

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const edgeType = boundary.edgeTypes[j] // edge j -> i
    let edgeVerts: Vec2[]
    if (edgeType?.type === 'arc' && edgeType.arcSagitta !== null) {
      edgeVerts = sampleArc(verts[j], verts[i], edgeType.arcSagitta, 16)
    } else {
      edgeVerts = [verts[j], verts[i]]
    }
    // Ray cast across all sub-segments of this edge
    for (let k = 0; k < edgeVerts.length - 1; k++) {
      const xi = edgeVerts[k + 1].x, yi = edgeVerts[k + 1].y
      const xj = edgeVerts[k].x, yj = edgeVerts[k].y
      if (yi === yj) continue
      const intersect = (yi > worldY) !== (yj > worldY) &&
        worldX < ((xj - xi) * (worldY - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
  }
  return inside
}

/** Axis-aligned bounding box of a YardBoundary (including arc edge bulge). */
// eslint-disable-next-line react-refresh/only-export-components
export function getAABB(boundary: YardBoundary): { x: number; y: number; w: number; h: number } {
  if (boundary.vertices.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const verts = boundary.vertices
  const n = verts.length
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const v of verts) {
    minX = Math.min(minX, v.x); minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y)
  }

  // Extend for arc edges
  for (let i = 0; i < n; i++) {
    const edge = boundary.edgeTypes[i]
    if (edge?.type === 'arc' && edge.arcSagitta !== null) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      const ab = arcAABB(p1, p2, edge.arcSagitta)
      minX = Math.min(minX, ab.minX); minY = Math.min(minY, ab.minY)
      maxX = Math.max(maxX, ab.maxX); maxY = Math.max(maxY, ab.maxY)
    }
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function edgeMidpoint(p1: Vec2, p2: Vec2): Vec2 {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function toKonvaPoints(verts: Vec2[]): number[] {
  const pts: number[] = []
  for (const v of verts) pts.push(v.x, v.y)
  return pts
}

function hasSelfIntersection(vertices: Vec2[]): boolean {
  const n = vertices.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a1 = vertices[i], a2 = vertices[(i + 1) % n]
    for (let j = i + 2; j < n; j++) {
      if (j === (i + n - 1) % n) continue // skip adjacent edge
      const b1 = vertices[j], b2 = vertices[(j + 1) % n]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

/** Fixed-pivot edge propagation (spec §4). */
function propagateEdge(vertices: Vec2[], editedEdgeIndex: number, newLength: number): Vec2[] {
  const n = vertices.length
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
    cloned[idx].x += deltaX; cloned[idx].y += deltaY
    idx = (idx + 1) % n
  }
  return cloned
}

// ─── Shared boundary placement/edit state ────────────────────────────────────

interface BoundaryState {
  // Placement
  isPlacing: boolean
  placedVertices: Vec2[]
  cursorWorld: Vec2 | null
  // Edge editing
  editingEdge: number | null
  editValue: string
  editScreenPos: { x: number; y: number }
  // Actions
  setIsPlacing: (v: boolean) => void
  setPlacedVertices: (v: Vec2[]) => void
  setCursorWorld: (v: Vec2 | null) => void
  setEditingEdge: (idx: number | null) => void
  setEditValue: (v: string) => void
  setEditScreenPos: (pos: { x: number; y: number }) => void
}

const useBoundaryState = create<BoundaryState>((set) => ({
  isPlacing: false,
  placedVertices: [],
  cursorWorld: null,
  editingEdge: null,
  editValue: '',
  editScreenPos: { x: 0, y: 0 },
  setIsPlacing: (v) => set({ isPlacing: v }),
  setPlacedVertices: (v) => set({ placedVertices: v }),
  setCursorWorld: (v) => set({ cursorWorld: v }),
  setEditingEdge: (idx) => set({ editingEdge: idx }),
  setEditValue: (v) => set({ editValue: v }),
  setEditScreenPos: (pos) => set({ editScreenPos: pos }),
}))

// ─── Props ────────────────────────────────────────────────────────────────────

export interface YardBoundaryLayerProps {
  width: number
  height: number
}

// ─── Main Konva layer ─────────────────────────────────────────────────────────

export default function YardBoundaryLayer({ width: _width, height: _height }: YardBoundaryLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)
  const { panX, panY, zoom } = useViewportStore()

  const {
    isPlacing, placedVertices, cursorWorld,
    setIsPlacing, setPlacedVertices, setCursorWorld,
    setEditingEdge, setEditValue, setEditScreenPos,
  } = useBoundaryState()

  // Alt key state
  const altHeldRef = useRef(false)
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === 'Alt') altHeldRef.current = true }
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') altHeldRef.current = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Auto-enter placement when project has no boundary
  useEffect(() => {
    if (!project) return
    if (project.yardBoundary === null) {
      setIsPlacing(true)
      setPlacedVertices([])
      setCursorWorld(null)
    } else {
      setIsPlacing(false)
    }
  // Only react to project id changes (new project) or boundary going null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.yardBoundary === null])

  // ── Snapping helper ────────────────────────────────────────────────────────
  const snapWorldPoint = useCallback(
    (wx: number, wy: number): Vec2 => {
      if (!project) return { x: wx, y: wy }
      const result = snapPoint(
        wx, wy, 'place',
        project.elements, zoom,
        project.gridConfig.snapIncrementCm,
        project.uiState.snapEnabled,
        altHeldRef.current,
      )
      return { x: result.x, y: result.y }
    },
    [project, zoom],
  )

  // ── Pointer → world coord ──────────────────────────────────────────────────
  const pointerToWorld = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): Vec2 => {
      const stage = e.target.getStage()
      if (!stage) return { x: 0, y: 0 }
      const pos = stage.getRelativePointerPosition()
      if (!pos) return { x: 0, y: 0 }
      return { x: pos.x, y: pos.y }
    },
    [],   // no deps — getRelativePointerPosition reads live stage state
  )

  // ── Close tolerance ────────────────────────────────────────────────────────
  const isNearFirstVertex = useCallback(
    (pos: Vec2): boolean => {
      if (placedVertices.length < 3) return false
      const tol = 8 / zoom
      return dist(pos, placedVertices[0]) <= tol
    },
    [placedVertices, zoom],
  )

  // ── Commit boundary ────────────────────────────────────────────────────────
  const commitBoundary = useCallback(
    (verts: Vec2[]) => {
      if (verts.length < 3) return
      const n = verts.length
      const edgeTypes: YardBoundaryEdge[] = Array.from({ length: n }, () => ({ type: 'line' as const, arcSagitta: null }))
      const edgeLengths: (number | null)[] = Array.from({ length: n }, () => null)
      const snap = useProjectStore.getState().currentProject
      if (snap) pushHistory(structuredClone(snap))
      updateProject((draft) => {
        draft.yardBoundary = { vertices: verts, edgeLengths, edgeTypes }
      })
      setIsPlacing(false)
      setPlacedVertices([])
      setCursorWorld(null)
    },
    [updateProject, pushHistory, setIsPlacing, setPlacedVertices, setCursorWorld],
  )

  // ── Placement event handlers ───────────────────────────────────────────────
  const handlePlacementMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const currentTool = useToolStore.getState().activeTool
      if (currentTool !== 'select') return
      const raw = pointerToWorld(e)
      const snapped = snapWorldPoint(raw.x, raw.y)
      setCursorWorld(snapped)
    },
    [pointerToWorld, snapWorldPoint, setCursorWorld],
  )

  const handlePlacementClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return
      // FIX 3: Only allow boundary placement when select tool is active
      if (activeTool !== 'select') return
      const raw = pointerToWorld(e)
      const snapped = snapWorldPoint(raw.x, raw.y)
      if (isNearFirstVertex(snapped)) {
        commitBoundary(placedVertices)
        return
      }
      setPlacedVertices([...placedVertices, snapped])
    },
    [activeTool, pointerToWorld, snapWorldPoint, isNearFirstVertex, commitBoundary, placedVertices, setPlacedVertices],
  )

  // ── Vertex drag (post-closure) ─────────────────────────────────────────────
  const handleVertexDrag = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, _idx: number) => {
      const node = e.target
      const snapped = snapWorldPoint(node.x(), node.y())
      node.x(snapped.x)
      node.y(snapped.y)
    },
    [snapWorldPoint],
  )

  // Store pre-drag snapshot for undo
  const preDragSnapRef = useRef<Project | null>(null)

  const handleVertexDragStart = useCallback(() => {
    // FIX 3: Capture pre-mutation snapshot
    const snap = useProjectStore.getState().currentProject
    preDragSnapRef.current = snap ? structuredClone(snap) : null
  }, [])

  const handleVertexDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, idx: number) => {
      const node = e.target
      // FIX 3: Push pre-mutation snapshot
      const snap = preDragSnapRef.current
      if (snap) { pushHistory(snap); preDragSnapRef.current = null }
      updateProject((draft) => {
        if (!draft.yardBoundary) return
        draft.yardBoundary.vertices[idx] = { x: node.x(), y: node.y() }
      })
    },
    [updateProject, pushHistory],
  )

  // ── Arc sagitta drag ───────────────────────────────────────────────────────
  const handleArcHandleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, edgeIdx: number) => {
      if (!project?.yardBoundary) return
      const bnd = project.yardBoundary
      const n = bnd.vertices.length
      const p1 = bnd.vertices[edgeIdx]
      const p2 = bnd.vertices[(edgeIdx + 1) % n]
      const chordDx = p2.x - p1.x, chordDy = p2.y - p1.y
      const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
      if (chordLen < 1e-6) return
      const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
      const perpX = -chordDy / chordLen, perpY = chordDx / chordLen
      const node = e.target
      const sagitta = (node.x() - midX) * perpX + (node.y() - midY) * perpY
      updateProject((draft) => {
        if (!draft.yardBoundary) return
        draft.yardBoundary.edgeTypes[edgeIdx] = {
          type: Math.abs(sagitta) > 1 ? 'arc' : 'line',
          arcSagitta: Math.abs(sagitta) > 1 ? sagitta : null,
        }
      })
    },
    [project, updateProject],
  )

  // Store pre-arc-drag snapshot
  const preArcDragSnapRef = useRef<Project | null>(null)

  const handleArcHandleDragStart = useCallback(() => {
    const snap = useProjectStore.getState().currentProject
    preArcDragSnapRef.current = snap ? structuredClone(snap) : null
  }, [])

  const handleArcHandleDragEnd = useCallback(() => {
    // FIX 3: Push pre-mutation snapshot
    const snap = preArcDragSnapRef.current
    if (snap) { pushHistory(snap); preArcDragSnapRef.current = null }
  }, [pushHistory])

  // ── Edge label click ───────────────────────────────────────────────────────
  const handleEdgeLabelClick = useCallback(
    (edgeIdx: number, p1: Vec2, p2: Vec2, lenCm: number) => {
      // Compute screen position of midpoint
      const mid = edgeMidpoint(p1, p2)
      const sx = mid.x * zoom + panX
      const sy = mid.y * zoom + panY
      setEditingEdge(edgeIdx)
      setEditValue((lenCm / 100).toFixed(2))
      setEditScreenPos({ x: sx, y: sy })
    },
    [zoom, panX, panY, setEditingEdge, setEditValue, setEditScreenPos],
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!project) return null

  const boundary = project.yardBoundary
  const strokeWidth = 2 / zoom
  const vertexRadius = 6 / zoom
  const labelFontSize = 13 / zoom
  const hitPadding = 8 / zoom

  // FIX: Only allow YardBoundaryLayer to intercept pointer events when the
  // select tool is active. Other tools (terrain, plant, structure, path, etc.)
  // must not be blocked by this layer sitting above TerrainLayer in the z-order.
  const selectToolActive = activeTool === 'select'

  // ── Placement mode ─────────────────────────────────────────────────────────
  if (isPlacing) {
    const nearFirst = cursorWorld !== null && isNearFirstVertex(cursorWorld)
    const liveStart = placedVertices.length > 0 ? placedVertices[placedVertices.length - 1] : null

    return (
      <Layer listening={selectToolActive}>
        {/* Placed polygon outline so far */}
        {placedVertices.length >= 2 && (
          <Line
            points={toKonvaPoints(placedVertices)}
            stroke="#1971c2"
            strokeWidth={strokeWidth}
            listening={false}
          />
        )}
        {/* Live preview edge */}
        {liveStart && cursorWorld && (
          <Line
            points={[liveStart.x, liveStart.y, cursorWorld.x, cursorWorld.y]}
            stroke="#1971c2"
            strokeWidth={strokeWidth}
            opacity={0.5}
            dash={[6 / zoom, 4 / zoom]}
            listening={false}
          />
        )}
        {/* Placed vertices */}
        {placedVertices.map((v, i) => (
          <Circle
            key={i}
            x={v.x}
            y={v.y}
            radius={vertexRadius}
            fill={i === 0 && nearFirst ? '#f03e3e' : '#1971c2'}
            stroke="#fff"
            strokeWidth={1.5 / zoom}
            listening={false}
          />
        ))}
        {/* Close indicator ring */}
        {nearFirst && (
          <Circle
            x={placedVertices[0].x}
            y={placedVertices[0].y}
            radius={vertexRadius * 2.2}
            stroke="#f03e3e"
            strokeWidth={1.5 / zoom}
            fill="transparent"
            listening={false}
          />
        )}
        {/* Cursor dot */}
        {cursorWorld && !nearFirst && (
          <Circle
            x={cursorWorld.x}
            y={cursorWorld.y}
            radius={vertexRadius * 0.55}
            fill="#1971c2"
            opacity={0.45}
            listening={false}
          />
        )}
        {/* Full-stage invisible hit rect to capture pointer events */}
        {selectToolActive && (
          <Rect
            x={-50000}
            y={-50000}
            width={100000}
            height={100000}
            fill="transparent"
            listening={true}
            onMouseMove={handlePlacementMove}
            onClick={handlePlacementClick}
          />
        )}
      </Layer>
    )
  }

  if (!boundary) return null

  // ── Completed boundary ─────────────────────────────────────────────────────
  const verts = boundary.vertices
  const n = verts.length

  // Edge lines/arcs
  const edges = verts.map((_v, i) => {
    const p1 = verts[i]
    const p2 = verts[(i + 1) % n]
    const eType = boundary.edgeTypes[i]
    if (eType.type === 'arc' && eType.arcSagitta !== null) {
      const pts = sampleArc(p1, p2, eType.arcSagitta, 32)
      return (
        <Line
          key={`edge-${i}`}
          points={toKonvaPoints(pts)}
          stroke="#1971c2"
          strokeWidth={strokeWidth}
          dash={[6 / zoom, 4 / zoom]}
          listening={false}
        />
      )
    }
    return (
      <Line
        key={`edge-${i}`}
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke="#1971c2"
        strokeWidth={strokeWidth}
        dash={[6 / zoom, 4 / zoom]}
        listening={false}
      />
    )
  })

  // Edge labels + arc handles
  const labelsAndHandles = verts.map((_v, i) => {
    const p1 = verts[i]
    const p2 = verts[(i + 1) % n]
    const mid = edgeMidpoint(p1, p2)
    const lenCm = dist(p1, p2)
    const labelText = (lenCm / 100).toFixed(2) + 'm'
    const eType = boundary.edgeTypes[i]

    // Arc handle position: midpoint offset by current sagitta (or zero)
    const sagDir = (() => {
      const chordDx = p2.x - p1.x, chordDy = p2.y - p1.y
      const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
      if (chordLen < 1e-6) return { x: mid.x, y: mid.y }
      const perpX = -chordDy / chordLen, perpY = chordDx / chordLen
      const sag = eType.arcSagitta ?? 0
      return { x: mid.x + perpX * sag, y: mid.y + perpY * sag }
    })()

    return [
      <Text
        key={`label-${i}`}
        x={mid.x}
        y={mid.y - labelFontSize * 1.5}
        text={labelText}
        fontSize={labelFontSize}
        fill="#1971c2"
        align="center"
        width={labelFontSize * labelText.length * 0.65}
        offsetX={(labelFontSize * labelText.length * 0.65) / 2}
        listening={true}
        onClick={() => handleEdgeLabelClick(i, p1, p2, lenCm)}
        onTap={() => handleEdgeLabelClick(i, p1, p2, lenCm)}
      />,
      // Arc drag handle (small circle at midpoint / current arc apex)
      <Circle
        key={`arc-h-${i}`}
        x={sagDir.x}
        y={sagDir.y}
        radius={vertexRadius * 0.85}
        fill="#e7f5ff"
        stroke="#1971c2"
        strokeWidth={1.5 / zoom}
        draggable
        hitStrokeWidth={hitPadding}
        onDragStart={handleArcHandleDragStart}
        onDragMove={(e) => handleArcHandleDragMove(e, i)}
        onDragEnd={handleArcHandleDragEnd}
      />,
    ]
  })

  // Vertex handles
  const vertexHandles = verts.map((v, i) => (
    <Circle
      key={`vert-${i}`}
      x={v.x}
      y={v.y}
      radius={vertexRadius}
      fill="#1971c2"
      stroke="#fff"
      strokeWidth={1.5 / zoom}
      draggable
      hitStrokeWidth={hitPadding}
      onDragStart={handleVertexDragStart}
      onDragMove={(e) => handleVertexDrag(e, i)}
      onDragEnd={(e) => handleVertexDragEnd(e, i)}
    />
  ))

  return (
    <Layer listening={selectToolActive}>
      {edges}
      {labelsAndHandles}
      {vertexHandles}
    </Layer>
  )
}

// ─── Overflow Dim Layer ───────────────────────────────────────────────────────

interface OverflowDimLayerProps {
  width: number
  height: number
}

/**
 * Semi-transparent overlay that darkens everything outside the yard boundary.
 * Uses an even-odd fill rule to cut a "hole" in the shape of the boundary polygon.
 */
export function OverflowDimLayer({ width, height }: OverflowDimLayerProps) {
  const boundary = useProjectStore((s) => s.currentProject?.yardBoundary ?? null)
  const { panX, panY, zoom } = useViewportStore()

  if (!boundary || boundary.vertices.length < 3) return null

  const verts = boundary.vertices

  // World-space corners of the visible canvas area (with large margin)
  const wl = (0 - panX) / zoom - 1000
  const wt = (0 - panY) / zoom - 1000
  const wr = (width - panX) / zoom + 1000
  const wb = (height - panY) / zoom + 1000

  return (
    <Layer listening={false}>
      <Shape
        listening={false}
        sceneFunc={(ctx, _shape) => {
          ctx.save()
          ctx.beginPath()
          // Outer rect (canvas + margin)
          ctx.rect(wl, wt, wr - wl, wb - wt)
          // Inner polygon hole (FIX 12: account for arc edges)
          const n = verts.length
          ctx.moveTo(verts[0].x, verts[0].y)
          for (let i = 0; i < n; i++) {
            const p1 = verts[i]
            const p2 = verts[(i + 1) % n]
            const edge = boundary.edgeTypes[i]
            if (edge.type === 'arc' && edge.arcSagitta !== null) {
              const pts = sampleArc(p1, p2, edge.arcSagitta, 32)
              for (const pt of pts.slice(1)) ctx.lineTo(pt.x, pt.y)
            } else {
              ctx.lineTo(p2.x, p2.y)
            }
          }
          ctx.closePath()
          ctx.fillStyle = 'rgba(100, 116, 139, 0.45)' // slate-500 at 45% — neutral, non-harsh
          ctx.fill('evenodd')
          ctx.restore()
        }}
      />
    </Layer>
  )
}

// ─── HTML Overlays ────────────────────────────────────────────────────────────

/**
 * HTML overlays rendered outside the Konva Stage (absolute-positioned divs).
 * Place this as a sibling to the Stage inside the canvas container div.
 */
export function YardBoundaryHTMLOverlays({ width: _w, height: _h }: YardBoundaryLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  const {
    isPlacing, placedVertices, editingEdge, editValue, editScreenPos,
    setIsPlacing, setPlacedVertices, setCursorWorld,
    setEditingEdge, setEditValue,
  } = useBoundaryState()

  const boundary = project?.yardBoundary ?? null
  const selfIntersects = boundary !== null ? hasSelfIntersection(boundary.vertices) : false

  const commitEdgeEdit = useCallback(() => {
    if (editingEdge === null || !project?.yardBoundary) {
      setEditingEdge(null)
      return
    }
    const meters = parseFloat(editValue)
    const MAX_EDGE_M = 10000 // 10km maximum
    if (isNaN(meters) || meters * 100 < 10 || meters > MAX_EDGE_M || !isFinite(meters)) {
      setEditingEdge(null)
      return
    }
    const newLengthCm = meters * 100
    const newVerts = propagateEdge(project.yardBoundary.vertices, editingEdge, newLengthCm)
    // FIX 3: Capture pre-mutation snapshot
    const snap = useProjectStore.getState().currentProject
    if (snap) pushHistory(structuredClone(snap))
    updateProject((draft) => {
      if (!draft.yardBoundary) return
      draft.yardBoundary.vertices = newVerts
    })
    setEditingEdge(null)
  }, [editingEdge, editValue, project, updateProject, pushHistory, setEditingEdge])

  const cancelEdgeEdit = useCallback(() => setEditingEdge(null), [setEditingEdge])

  const handleStartPlacing = useCallback(() => {
    setIsPlacing(true)
    setPlacedVertices([])
    setCursorWorld(null)
  }, [setIsPlacing, setPlacedVertices, setCursorWorld])

  // FIX 9: Delete/Backspace to delete boundary when no input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable)) return
      const bnd = useProjectStore.getState().currentProject?.yardBoundary
      if (!bnd) return
      const placing = useBoundaryState.getState().isPlacing
      if (placing) return
      e.preventDefault()
      const snap = useProjectStore.getState().currentProject
      if (snap) pushHistory(structuredClone(snap))
      updateProject((draft) => { draft.yardBoundary = null })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pushHistory, updateProject])

  if (!project) return null

  return (
    <>
      {/* Placement instruction banner */}
      {isPlacing && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(25,113,194,0.93)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          Click to place boundary vertices — click near the first vertex (or Done) to close
        </div>
      )}

      {/* Done button (during placement, ≥3 vertices) */}
      {isPlacing && (
        <button
          disabled={placedVertices.length < 3}
          title={placedVertices.length < 3 ? 'Place at least 3 vertices to close the boundary' : 'Close polygon and finish'}
          style={{
            position: 'absolute',
            top: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            background: placedVertices.length < 3 ? '#adb5bd' : '#1971c2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 20px',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            cursor: placedVertices.length < 3 ? 'not-allowed' : 'pointer',
            zIndex: 10,
            pointerEvents: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            const { placedVertices: verts } = useBoundaryState.getState()
            if (verts.length >= 3) {
              const n = verts.length
              const edgeTypes: YardBoundaryEdge[] = Array.from({ length: n }, () => ({ type: 'line' as const, arcSagitta: null }))
              const edgeLengths: (number | null)[] = Array.from({ length: n }, () => null)
              const snap = useProjectStore.getState().currentProject
              if (snap) pushHistory(structuredClone(snap))
              updateProject((draft) => {
                draft.yardBoundary = { vertices: verts, edgeLengths, edgeTypes }
              })
              setIsPlacing(false)
              setPlacedVertices([])
              setCursorWorld(null)
            }
          }}
        >
          Done
        </button>
      )}

      {/* No boundary prompt */}
      {!isPlacing && boundary === null && (
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid #dee2e6',
            color: '#495057',
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          <span>No yard boundary defined</span>
          <button
            style={{
              background: '#1971c2',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={handleStartPlacing}
          >
            Set up boundary
          </button>
        </div>
      )}

      {/* FIX 9: Delete boundary button (shown when boundary exists and not placing) */}
      {!isPlacing && boundary !== null && editingEdge === null && (
        <button
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: '#fff',
            color: '#e03131',
            border: '1px solid #e03131',
            borderRadius: 6,
            padding: '5px 14px',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          }}
          onClick={() => {
            const snap = useProjectStore.getState().currentProject
            if (snap) pushHistory(structuredClone(snap))
            updateProject((draft) => { draft.yardBoundary = null })
          }}
        >
          Delete boundary
        </button>
      )}

      {/* Self-intersection warning */}
      {selfIntersects && boundary !== null && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(224,49,49,0.93)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        >
          Warning: boundary has self-intersecting edges
        </div>
      )}

      {/* Inline edge-length input */}
      {editingEdge !== null && (
        <div
          style={{
            position: 'absolute',
            left: editScreenPos.x - 44,
            top: editScreenPos.y - 16,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <input
            type="number"
            step="0.01"
            min="0.1"
            value={editValue}
            autoFocus
            style={{
              width: 76,
              padding: '3px 6px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              border: '2px solid #1971c2',
              borderRadius: 5,
              outline: 'none',
              textAlign: 'center',
              background: '#fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdgeEdit()
              if (e.key === 'Escape') cancelEdgeEdit()
            }}
            onBlur={commitEdgeEdit}
          />
          <span style={{ fontSize: 12, color: '#495057', fontFamily: 'system-ui, sans-serif' }}>m</span>
        </div>
      )}
    </>
  )
}
