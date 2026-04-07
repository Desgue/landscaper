/**
 * PathDrawingHandler — Multi-click path drawing tool for PixiJS Phase 4.
 *
 * Ported from PathLayer.tsx (Konva). Handles multi-click segment drawing,
 * close detection (click near first point), and Escape to finish.
 *
 * Framework-agnostic — mutates Zustand stores only.
 */

import type { PathElement, PathSegment, Vec2 } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { usePathToolStore } from '../canvas/PathLayer'
import { snapPoint } from '../snap/snapSystem'
import { connectStore } from './connectStore'
import type { RendererHandle } from './BaseRenderer'

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const MAX_PATH_POINTS = 500

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function computePathAABB(points: Vec2[]): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ---------------------------------------------------------------------------
// Snap helper
// ---------------------------------------------------------------------------

function snapWorld(worldX: number, worldY: number, altKey: boolean): Vec2 {
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
// Handler
// ---------------------------------------------------------------------------

export interface PathDrawingHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number, altKey: boolean): void
  onPointerMove(worldX: number, worldY: number, altKey: boolean): void
  /** Get in-progress drawing state for live preview rendering. */
  getDrawingState(): PathDrawingState | null
  /** Finalize the current path (called externally on Escape). */
  finalize(closed: boolean): void
  /** Cancel in-progress drawing. */
  cancel(): void
}

export interface PathDrawingState {
  points: Vec2[]
  segments: PathSegment[]
  cursorWorld: Vec2 | null
  isDrawing: boolean
}

export function createPathDrawingHandler(): PathDrawingHandle {
  let drawingPoints: Vec2[] = []
  let drawingSegments: PathSegment[] = []
  let isDrawing = false
  let cursorWorld: Vec2 | null = null

  // Keyboard handler for Escape
  function handleKeyDown(e: KeyboardEvent): void {
    const tag = (document.activeElement?.tagName ?? '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (e.key === 'Escape' && isDrawing) {
      e.preventDefault()
      finalizePath(false)
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  // Reset when tool changes away from path
  const unsubTool = connectStore(
    useToolStore,
    (s) => s.activeTool,
    (newTool) => {
      if (newTool !== 'path' && isDrawing) {
        resetDrawing()
      }
    },
  )

  function resetDrawing(): void {
    drawingPoints = []
    drawingSegments = []
    isDrawing = false
    cursorWorld = null
  }

  function isNearFirstPoint(pos: Vec2): boolean {
    if (drawingPoints.length < 3) return false
    const zoom = useViewportStore.getState().zoom
    const tol = 8 / zoom
    return dist(pos, drawingPoints[0]) <= tol
  }

  function finalizePath(closed: boolean): void {
    const points = drawingPoints
    const segments = drawingSegments

    if (points.length < 2) {
      resetDrawing()
      return
    }

    const proj = useProjectStore.getState().currentProject
    if (!proj) return

    const regs = useProjectStore.getState().registries
    const pathTypeId = usePathToolStore.getState().selectedPathTypeId
    if (!pathTypeId) return
    const pathType = regs.paths.find((p) => p.id === pathTypeId)
    if (!pathType) return

    const finalSegments = closed
      ? [...segments, { type: 'line' as const, arcSagitta: null }]
      : [...segments]

    const aabb = computePathAABB(points)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const layerId = proj.layers[0]?.id ?? 'default'
    const snapshot = structuredClone(proj)

    useProjectStore.getState().updateProject((draft) => {
      draft.elements.push({
        id, type: 'path', pathTypeId,
        points: points.map((p) => ({ x: p.x, y: p.y })),
        segments: finalSegments,
        strokeWidthCm: pathType.defaultWidthCm,
        closed,
        x: aabb.x, y: aabb.y,
        width: aabb.w || 1, height: aabb.h || 1,
        rotation: 0, zIndex: 0, locked: false, layerId, groupId: null,
        createdAt: now, updatedAt: now,
      } satisfies PathElement)
    })
    useHistoryStore.getState().pushHistory(snapshot)
    useProjectStore.getState().markDirty()
    resetDrawing()
  }

  return {
    onPointerDown(worldX: number, worldY: number, altKey: boolean): void {
      if (useToolStore.getState().activeTool !== 'path') return
      const snapped = snapWorld(worldX, worldY, altKey)

      if (!isDrawing) {
        drawingPoints = [snapped]
        drawingSegments = []
        isDrawing = true
        cursorWorld = snapped
      } else {
        if (isNearFirstPoint(snapped)) {
          finalizePath(true)
          return
        }
        // Cap to prevent unbounded point accumulation
        if (drawingPoints.length >= MAX_PATH_POINTS) return
        drawingPoints = [...drawingPoints, snapped]
        drawingSegments = [
          ...drawingSegments,
          { type: 'line' as const, arcSagitta: null },
        ]
        cursorWorld = snapped
      }
    },

    onPointerMove(worldX: number, worldY: number, altKey: boolean): void {
      if (!isDrawing) return
      const snapped = snapWorld(worldX, worldY, altKey)
      cursorWorld = snapped
    },

    getDrawingState(): PathDrawingState | null {
      if (!isDrawing) return null
      return {
        points: drawingPoints,
        segments: drawingSegments,
        cursorWorld,
        isDrawing,
      }
    },

    finalize(closed: boolean): void {
      if (isDrawing) finalizePath(closed)
    },

    cancel(): void {
      resetDrawing()
    },

    update(): void {},
    destroy(): void {
      window.removeEventListener('keydown', handleKeyDown)
      unsubTool()
      resetDrawing()
    },
  }
}
