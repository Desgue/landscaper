/**
 * SelectionOverlay — Renders selection bounding boxes, resize handles,
 * rotation handles, path point handles, box-select rectangle, and snap
 * guide lines using a single reusable Graphics instance (v8 API).
 *
 * Wired to SelectionStateMachine for visual state and to Zustand stores
 * for selection state.
 */

import { Graphics, Container } from 'pixi.js'
import type { CanvasElement, PathElement } from '../types/schema'
import type { AABB } from '../canvas/hitTestAll'
import { getElementAABB, getSelectionAABB } from '../canvas/hitTestAll'
import { useSelectionStore } from '../store/useSelectionStore'
import { useToolStore } from '../store/useToolStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import { setupWorldObject } from './BaseRenderer'
import { drawDashedLine } from './utils/dashedLine'
import type { RenderScheduler } from './RenderScheduler'
import type { SelectionVisualState } from './SelectionStateMachine'
import { getHandlePositions } from './SelectionStateMachine'
import type { RendererHandle } from './BaseRenderer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SELECTION_COLOR = 0x3b82f6
const HANDLE_FILL = 0xffffff
const BOX_SELECT_FILL = 0x3b82f6
const BOX_SELECT_FILL_ALPHA = 0.1
const SNAP_GUIDE_COLOR = 0xef4444

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSelectionOverlay(
  container: Container,
  scheduler: RenderScheduler,
): RendererHandle & {
  updateVisualState(state: SelectionVisualState): void
  setHoveredId(id: string | null): void
} {
  // Single reusable Graphics for all selection visuals
  const g = new Graphics()
  g.label = 'selectionOverlay'
  setupWorldObject(g)
  g.eventMode = 'none'
  container.addChild(g)

  let currentVisualState: SelectionVisualState = {
    mode: 'idle',
    boxSelectRect: null,
    snapGuideLines: [],
  }

  let hoveredId: string | null = null
  const HOVER_COLOR = 0x2196f3

  function redraw(): void {
    g.clear()

    const tool = useToolStore.getState().activeTool
    if (tool !== 'select' && tool !== 'eraser') return

    const project = useProjectStore.getState().currentProject
    if (!project) return

    const selectedIds = useSelectionStore.getState().selectedIds
    if (selectedIds.size === 0 && !currentVisualState.boxSelectRect) return

    const zoom = useViewportStore.getState().zoom
    const strokeWidth = 1.5 / zoom
    const handleSize = 8 / zoom
    const dashArray = [6 / zoom, 3 / zoom]

    // Gather selected elements
    const selectedElements: CanvasElement[] = []
    for (const el of project.elements) {
      if (selectedIds.has(el.id)) selectedElements.push(el)
    }

    if (tool === 'select') {
      // Per-element bounding boxes + handles
      for (const el of selectedElements) {
        const aabb = getElementAABB(el)
        drawDashedBoundingBox(g, aabb, strokeWidth, dashArray, zoom)

        // Resize handles for structures and labels
        if (el.type === 'structure' || el.type === 'label') {
          drawResizeHandles(g, aabb, handleSize, strokeWidth, zoom)
        }

        // Rotation handle for structures
        if (el.type === 'structure') {
          drawRotationHandle(g, aabb, zoom)
        }

        // Path point handles
        if (el.type === 'path') {
          const pathEl = el as PathElement
          for (const pt of pathEl.points) {
            g.circle(pt.x, pt.y, handleSize / 2)
              .fill({ color: HANDLE_FILL })
              .stroke({ color: SELECTION_COLOR, width: 1 / zoom })
          }
        }
      }

      // Combined AABB + resize handles for multi-selection
      if (selectedElements.length > 1) {
        const combinedAABB = getSelectionAABB(selectedElements)
        const multiStrokeWidth = 2 / zoom
        const multiDash = [8 / zoom, 4 / zoom]
        drawDashedBoundingBox(g, combinedAABB, multiStrokeWidth, multiDash, zoom)
        drawResizeHandles(g, combinedAABB, handleSize, 1 / zoom, zoom)
      }

      // Snap guide lines (capped to prevent unbounded GPU draw calls)
      const MAX_SNAP_LINES = 16
      for (const line of currentVisualState.snapGuideLines.slice(0, MAX_SNAP_LINES)) {
        g.setStrokeStyle({ color: SNAP_GUIDE_COLOR, width: 1 / zoom })
        if (line.axis === 'x') {
          g.moveTo(line.value, -1e6).lineTo(line.value, 1e6).stroke()
        } else {
          g.moveTo(-1e6, line.value).lineTo(1e6, line.value).stroke()
        }
      }
    }

    // Hover highlight
    if (hoveredId && !selectedIds.has(hoveredId)) {
      const hoveredEl = project.elements.find((el) => el.id === hoveredId)
      if (hoveredEl) {
        const hoverAABB = getElementAABB(hoveredEl)
        const hoverStroke = 2 / zoom
        g.rect(hoverAABB.x, hoverAABB.y, hoverAABB.w, hoverAABB.h)
          .stroke({ color: HOVER_COLOR, width: hoverStroke, alpha: 0.5 })
      }
    }

    // Box-select rectangle
    if (currentVisualState.boxSelectRect) {
      const { x1, y1, x2, y2 } = currentVisualState.boxSelectRect
      const bx = Math.min(x1, x2)
      const by = Math.min(y1, y2)
      const bw = Math.abs(x2 - x1)
      const bh = Math.abs(y2 - y1)

      g.rect(bx, by, bw, bh)
        .fill({ color: BOX_SELECT_FILL, alpha: BOX_SELECT_FILL_ALPHA })
        .stroke({ color: SELECTION_COLOR, width: 1 / zoom })
    }
  }

  // Dirty-flag batching: defer redraw() to the scheduler's render callback
  // so that multiple store changes in the same frame only trigger one redraw.
  let dirty = false

  function markOverlayDirty(): void {
    if (!dirty) {
      dirty = true
      scheduler.markDirty()
    }
  }

  // Pre-render callback registered with the scheduler — runs at most once per
  // rAF frame, coalescing any number of store changes that occurred since the
  // last frame into a single redraw call.
  const onRenderCallback = (): void => {
    if (dirty) {
      dirty = false
      redraw()
    }
  }

  scheduler.onRender(onRenderCallback)

  // Subscribe to selection and tool changes — only signal dirty, never redraw
  // directly. Multiple store changes in the same synchronous tick therefore
  // cost a single redraw instead of N redraws.
  const unsubs = [
    useSelectionStore.subscribe((state, prevState) => {
      if (state.selectedIds !== prevState.selectedIds) markOverlayDirty()
    }),
    useToolStore.subscribe((state, prevState) => {
      if (state.activeTool !== prevState.activeTool) markOverlayDirty()
    }),
    useProjectStore.subscribe((state, prevState) => {
      if (state.currentProject?.elements !== prevState.currentProject?.elements) markOverlayDirty()
    }),
    useViewportStore.subscribe((state, prevState) => {
      if (state.zoom !== prevState.zoom) markOverlayDirty()
    }),
  ]

  // Initial render
  markOverlayDirty()

  return {
    updateVisualState(state: SelectionVisualState): void {
      currentVisualState = state
      markOverlayDirty()
    },

    setHoveredId(id: string | null): void {
      if (id === hoveredId) return
      hoveredId = id
      markOverlayDirty()
    },

    update(): void {
      markOverlayDirty()
    },

    destroy(): void {
      scheduler.offRender(onRenderCallback)
      for (const unsub of unsubs) unsub()
      g.clear()
      g.destroy()
    },
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawDashedBoundingBox(
  g: Graphics,
  aabb: AABB,
  strokeWidth: number,
  dashArray: number[],
  _zoom: number,
): void {
  const { x, y, w, h } = aabb
  g.setStrokeStyle({ color: SELECTION_COLOR, width: strokeWidth })
  drawDashedLine(g, x, y, x + w, y, dashArray)
  drawDashedLine(g, x + w, y, x + w, y + h, dashArray)
  drawDashedLine(g, x + w, y + h, x, y + h, dashArray)
  drawDashedLine(g, x, y + h, x, y, dashArray)
}

function drawResizeHandles(
  g: Graphics,
  aabb: AABB,
  handleSize: number,
  strokeWidth: number,
  _zoom: number,
): void {
  const handles = getHandlePositions(aabb)
  for (const h of handles) {
    g.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize)
      .fill({ color: HANDLE_FILL })
      .stroke({ color: SELECTION_COLOR, width: strokeWidth })
  }
}

function drawRotationHandle(
  g: Graphics,
  aabb: AABB,
  zoom: number,
): void {
  const handleX = aabb.x + aabb.w / 2
  const offset = 10 / zoom
  const handleY = aabb.y - offset
  const radius = 5 / zoom

  // Line from top-center to rotation handle
  g.setStrokeStyle({ color: SELECTION_COLOR, width: 1 / zoom })
  g.moveTo(handleX, aabb.y).lineTo(handleX, handleY).stroke()

  // Circle handle
  g.circle(handleX, handleY, radius)
    .fill({ color: HANDLE_FILL })
    .stroke({ color: SELECTION_COLOR, width: 1 / zoom })
}
