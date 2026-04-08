/**
 * BoundaryRenderer — Imperative PixiJS renderer for yard boundary polygon.
 *
 * Phase 2 of PLAN-G. Renders:
 *   - Dashed polygon outline (straight + arc edges)
 *   - Overflow dim overlay (full-viewport rect with boundary hole via Graphics.cut())
 *   - Edge length labels using Text (BitmapText/MSDF deferred to Phase 3)
 *   - Arc drag handles (small circles at arc edge midpoints)
 *   - Vertex handles (circles at polygon vertices)
 *
 * Pattern: createBoundaryRenderer(containers, scheduler, canvasDimensions) => RendererHandle
 */

import { Container, Graphics, Text } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import { useBoundaryUIStore } from '../store/useBoundaryUIStore'
import { sampleArc } from '../canvas/arcGeometry'
import { drawDashedLine } from './utils/dashedLine'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { Vec2, YardBoundary } from '../types/schema'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOUNDARY_COLOR = 0x1971c2  // blue
const BOUNDARY_STROKE_BASE = 2   // px at zoom=1
const VERTEX_RADIUS_BASE = 5     // px at zoom=1
const ARC_HANDLE_RADIUS_BASE = 4 // px at zoom=1
const DASH_PATTERN = [6, 4]
const OVERFLOW_DIM_COLOR = 0x64748b // slate-500
const OVERFLOW_DIM_ALPHA = 0.45
const LABEL_FONT_SIZE = 12 // constant px — scale via sprite scale, not re-rasterization
const LABEL_COLOR = '#1971c2'
const ARC_SAMPLE_STEPS = 32
/** Hard cap on boundary vertices to prevent resource exhaustion. */
const MAX_VERTICES = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function edgeMidpoint(p1: Vec2, p2: Vec2): Vec2 {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function isFiniteVec(v: Vec2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y)
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBoundaryRenderer(
  boundaryContainer: Container,
  overflowDimContainer: Container,
  scheduler: RenderScheduler,
  getCanvasSize: () => { width: number; height: number },
): RendererHandle {
  // Reusable Graphics objects (never destroy/recreate — v8 issue #10586)
  const outlineGraphics = new Graphics()
  outlineGraphics.eventMode = 'none'
  outlineGraphics.label = 'boundary-outline'
  boundaryContainer.addChild(outlineGraphics)

  const overflowGraphics = new Graphics()
  overflowGraphics.eventMode = 'none'
  overflowGraphics.label = 'overflow-dim'
  overflowDimContainer.addChild(overflowGraphics)

  const handlesGraphics = new Graphics()
  handlesGraphics.eventMode = 'none'
  handlesGraphics.label = 'boundary-handles'
  boundaryContainer.addChild(handlesGraphics)

  // Text labels container
  const labelsContainer = new Container()
  labelsContainer.label = 'boundary-labels'
  labelsContainer.eventMode = 'none'
  boundaryContainer.addChild(labelsContainer)

  // Placement preview graphics (drawn while user clicks vertices, before committing)
  const placementGraphics = new Graphics()
  placementGraphics.eventMode = 'none'
  placementGraphics.label = 'boundary-placement-preview'
  boundaryContainer.addChild(placementGraphics)

  // Pool of Text objects for edge labels
  let labelPool: Text[] = []

  // Track last zoom to avoid full re-render on pan-only changes
  let lastZoom = useViewportStore.getState().zoom

  // ---------------------------------------------------------------------------
  // Placement preview
  // ---------------------------------------------------------------------------

  /** Snap-close tolerance in screen pixels. */
  const CLOSE_TOL_PX = 8

  function renderPlacementPreview(): void {
    placementGraphics.clear()

    const { isPlacing, placedVertices, cursorWorld } = useBoundaryUIStore.getState().placementState
    if (!isPlacing || placedVertices.length === 0) return

    const { zoom } = useViewportStore.getState()
    const strokeWidth = BOUNDARY_STROKE_BASE / zoom
    const vertexRadius = VERTEX_RADIUS_BASE / zoom
    const dashPattern = DASH_PATTERN.map((d) => d / zoom)

    const verts = placedVertices.filter(isFiniteVec)
    if (verts.length === 0) return

    // Draw edges between placed vertices
    for (let i = 0; i < verts.length - 1; i++) {
      drawDashedLine(placementGraphics, verts[i].x, verts[i].y, verts[i + 1].x, verts[i + 1].y, dashPattern)
    }

    // Draw line from last vertex to cursor
    if (cursorWorld && isFiniteVec(cursorWorld)) {
      drawDashedLine(
        placementGraphics,
        verts[verts.length - 1].x, verts[verts.length - 1].y,
        cursorWorld.x, cursorWorld.y,
        dashPattern,
      )
    }

    placementGraphics.stroke({ color: BOUNDARY_COLOR, width: strokeWidth })

    // Draw vertex dots
    for (const v of verts) {
      placementGraphics.circle(v.x, v.y, vertexRadius)
        .fill({ color: BOUNDARY_COLOR })
        .stroke({ color: 0xffffff, width: 1.5 / zoom })
    }

    // Highlight first vertex when cursor is near (close detection)
    if (cursorWorld && isFiniteVec(cursorWorld) && verts.length >= 3) {
      const closeTol = CLOSE_TOL_PX / zoom
      const dx = cursorWorld.x - verts[0].x
      const dy = cursorWorld.y - verts[0].y
      if (Math.sqrt(dx * dx + dy * dy) <= closeTol) {
        placementGraphics.circle(verts[0].x, verts[0].y, vertexRadius * 1.8)
          .stroke({ color: 0x40c057, width: 2 / zoom })
      }
    }

    scheduler.markDirty()
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function render(): void {
    const project = useProjectStore.getState().currentProject
    const boundary = project?.yardBoundary ?? null
    const { zoom } = useViewportStore.getState()

    // Clear all reusable graphics
    outlineGraphics.clear()
    overflowGraphics.clear()
    handlesGraphics.clear()
    placementGraphics.clear()

    // Hide label texts
    for (const label of labelPool) {
      label.visible = false
    }

    if (!boundary || boundary.vertices.length < 3) {
      return
    }

    // Guard: edgeTypes must be in sync with vertices
    const n = Math.min(boundary.vertices.length, MAX_VERTICES)
    if (boundary.edgeTypes.length < n) {
      console.warn('[BoundaryRenderer] edgeTypes/vertices length mismatch, skipping render')
      return
    }

    // Use vertices directly (skip non-finite at draw time to keep index alignment with edgeTypes)
    const verts = boundary.vertices.slice(0, n)
    if (verts.filter(isFiniteVec).length < 3) return

    // Scale-independent sizes
    const strokeWidth = BOUNDARY_STROKE_BASE / zoom
    const vertexRadius = VERTEX_RADIUS_BASE / zoom
    const arcHandleRadius = ARC_HANDLE_RADIUS_BASE / zoom
    const dashPattern = DASH_PATTERN.map((d) => d / zoom)
    const invZoom = 1 / zoom

    // ── Outline (dashed) ──
    renderOutline(verts, boundary, strokeWidth, dashPattern)

    // ── Overflow dim overlay ──
    renderOverflowDim(verts, boundary, zoom)

    // ── Vertex handles ──
    renderVertexHandles(verts, vertexRadius, zoom)

    // ── Edge labels + arc handles ──
    renderLabelsAndHandles(verts, boundary, invZoom, arcHandleRadius, zoom)

    scheduler.markDirty()
  }

  /** Only re-render the overflow dim on pan changes (outline/handles unchanged). */
  function renderOverflowDimOnly(): void {
    const project = useProjectStore.getState().currentProject
    const boundary = project?.yardBoundary ?? null
    const { zoom } = useViewportStore.getState()

    overflowGraphics.clear()

    if (!boundary || boundary.vertices.length < 3) return
    const n = Math.min(boundary.vertices.length, MAX_VERTICES)
    if (boundary.edgeTypes.length < n) return

    const verts = boundary.vertices.slice(0, n)
    if (verts.filter(isFiniteVec).length < 3) return

    renderOverflowDim(verts, boundary, zoom)
    scheduler.markDirty()
  }

  function renderOutline(
    verts: Vec2[],
    boundary: YardBoundary,
    strokeWidth: number,
    dashPattern: number[],
  ): void {
    const n = verts.length

    for (let i = 0; i < n; i++) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      if (!isFiniteVec(p1) || !isFiniteVec(p2)) continue
      const edge = boundary.edgeTypes[i]

      if (edge?.type === 'arc' && edge.arcSagitta !== null) {
        const pts = sampleArc(p1, p2, edge.arcSagitta, ARC_SAMPLE_STEPS)
        for (let j = 0; j < pts.length - 1; j++) {
          drawDashedLine(
            outlineGraphics,
            pts[j].x, pts[j].y,
            pts[j + 1].x, pts[j + 1].y,
            dashPattern,
          )
        }
      } else {
        drawDashedLine(
          outlineGraphics,
          p1.x, p1.y,
          p2.x, p2.y,
          dashPattern,
        )
      }
    }

    outlineGraphics.stroke({ color: BOUNDARY_COLOR, width: strokeWidth })
  }

  function renderOverflowDim(
    verts: Vec2[],
    boundary: YardBoundary,
    zoom: number,
  ): void {
    const { panX, panY } = useViewportStore.getState()
    const { width: viewW, height: viewH } = getCanvasSize()
    const margin = 1000

    const wl = (-panX) / zoom - margin
    const wt = (-panY) / zoom - margin
    const wr = (viewW - panX) / zoom + margin
    const wb = (viewH - panY) / zoom + margin

    const n = verts.length

    // Draw outer rectangle (unfilled — fill after cut)
    overflowGraphics.rect(wl, wt, wr - wl, wb - wt)

    // Draw boundary polygon as hole path (skip non-finite vertices)
    const firstFinite = verts.find(isFiniteVec)
    if (!firstFinite) return
    overflowGraphics.moveTo(firstFinite.x, firstFinite.y)

    for (let i = 0; i < n; i++) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      if (!isFiniteVec(p1) || !isFiniteVec(p2)) continue
      const edge = boundary.edgeTypes[i]

      if (edge?.type === 'arc' && edge.arcSagitta !== null) {
        const pts = sampleArc(p1, p2, edge.arcSagitta, ARC_SAMPLE_STEPS)
        for (const pt of pts.slice(1)) {
          overflowGraphics.lineTo(pt.x, pt.y)
        }
      } else {
        overflowGraphics.lineTo(p2.x, p2.y)
      }
    }

    overflowGraphics.closePath()

    // Cut the boundary polygon from the outer rect, then fill
    overflowGraphics.cut()
    overflowGraphics.fill({ color: OVERFLOW_DIM_COLOR, alpha: OVERFLOW_DIM_ALPHA })
  }

  function renderVertexHandles(
    verts: Vec2[],
    vertexRadius: number,
    zoom: number,
  ): void {
    for (const v of verts) {
      if (!isFiniteVec(v)) continue
      handlesGraphics.circle(v.x, v.y, vertexRadius)
        .fill({ color: BOUNDARY_COLOR })
        .stroke({ color: 0xffffff, width: 1.5 / zoom })
    }
  }

  function renderLabelsAndHandles(
    verts: Vec2[],
    boundary: YardBoundary,
    invZoom: number,
    arcHandleRadius: number,
    zoom: number,
  ): void {
    const n = verts.length

    // Grow pool if needed
    while (labelPool.length < n) {
      const text = new Text({
        text: '',
        style: {
          fontSize: LABEL_FONT_SIZE,
          fill: LABEL_COLOR,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
      })
      text.eventMode = 'none'
      labelsContainer.addChild(text)
      labelPool.push(text)
    }

    // Shrink pool if vertices decreased — prevent unbounded growth
    while (labelPool.length > n) {
      const old = labelPool.pop()!
      labelsContainer.removeChild(old)
      old.destroy()
    }

    for (let i = 0; i < n; i++) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      if (!isFiniteVec(p1) || !isFiniteVec(p2)) continue
      const mid = edgeMidpoint(p1, p2)
      const lenCm = dist(p1, p2)
      const labelText = (lenCm / 100).toFixed(2) + 'm'

      // Edge length label — use constant fontSize + scale for zoom independence
      // (avoids Text re-rasterization on every zoom change)
      const textObj = labelPool[i]
      textObj.text = labelText
      textObj.scale.set(invZoom)
      textObj.position.set(mid.x, mid.y - LABEL_FONT_SIZE * invZoom * 1.5)
      textObj.anchor.set(0.5, 0.5)
      textObj.visible = true

      // Arc drag handle (active arc) or ghost handle (straight edge midpoint)
      const edge = boundary.edgeTypes[i]
      if (edge?.type === 'arc' && edge.arcSagitta !== null) {
        const sag = edge.arcSagitta
        const chordDx = p2.x - p1.x
        const chordDy = p2.y - p1.y
        const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)

        let handleX = mid.x
        let handleY = mid.y
        if (chordLen > 1e-6) {
          const perpX = -chordDy / chordLen
          const perpY = chordDx / chordLen
          handleX = mid.x + perpX * sag
          handleY = mid.y + perpY * sag
        }

        handlesGraphics.circle(handleX, handleY, arcHandleRadius)
          .fill({ color: 0xe7f5ff })
          .stroke({ color: BOUNDARY_COLOR, width: 1.5 / zoom })
      } else {
        // Ghost handle at midpoint — drag to curve the edge
        handlesGraphics.circle(mid.x, mid.y, arcHandleRadius)
          .fill({ color: 0xe7f5ff, alpha: 0.4 })
          .stroke({ color: BOUNDARY_COLOR, width: 1 / zoom, alpha: 0.3 })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------

  const unsubs: Array<() => void> = []

  // Re-render on boundary changes
  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.yardBoundary ?? null,
      () => render(),
    ),
  )

  // Re-render placement preview when placement state changes
  unsubs.push(
    connectStore(
      useBoundaryUIStore,
      (s) => s.placementState,
      () => renderPlacementPreview(),
    ),
  )

  // Viewport changes: full re-render on zoom change, overflow-dim-only on pan
  unsubs.push(
    connectStore(
      useViewportStore,
      (s) => ({ panX: s.panX, panY: s.panY, zoom: s.zoom }),
      (val) => {
        if (val.zoom !== lastZoom) {
          lastZoom = val.zoom
          render()
        } else {
          // Pan-only: just update the overflow dim rectangle
          renderOverflowDimOnly()
        }
      },
    ),
  )

  // Initial render
  render()

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    update() {
      // Reactivity handled by store subscriptions
    },
    destroy() {
      for (const unsub of unsubs) unsub()

      // Destroy label pool
      for (const text of labelPool) {
        labelsContainer.removeChild(text)
        text.destroy()
      }
      labelPool = []

      // Remove graphics from parents before destroying
      boundaryContainer.removeChild(outlineGraphics)
      boundaryContainer.removeChild(handlesGraphics)
      boundaryContainer.removeChild(placementGraphics)
      boundaryContainer.removeChild(labelsContainer)
      overflowDimContainer.removeChild(overflowGraphics)

      outlineGraphics.destroy()
      overflowGraphics.destroy()
      handlesGraphics.destroy()
      placementGraphics.destroy()
      labelsContainer.destroy({ children: true })
    },
  }
}
