/**
 * PathLayer — Konva layer for path drawing and rendering.
 *
 * Phase B of PLAN-B. Implements:
 *   - Rendering path elements as polylines with strokeWidthCm
 *   - Path tool (activeTool === 'path'): multi-click to draw segments
 *   - Escape to finish, close detection (click near first point)
 *   - Straight segments only (arc segments deferred)
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { Layer, Rect, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { snapPoint } from '../snap/snapSystem'
import type { PathElement, PathSegment, Vec2 } from '../types/schema'

// ─── Path tool store ────────────────────────────────────────────────────────

interface PathToolState {
  selectedPathTypeId: string | null
  setSelectedPathTypeId: (id: string) => void
}

export const usePathToolStore = create<PathToolState>((set) => ({
  selectedPathTypeId: null,
  setSelectedPathTypeId: (id: string) => set({ selectedPathTypeId: id }),
}))

// ─── PLAN-B interface contracts ─────────────────────────────────────────────

/** Point-in-path hit test (proximity to any segment, within half stroke width). */
export function hitTest(element: PathElement, worldX: number, worldY: number): boolean {
  const halfW = element.strokeWidthCm / 2
  const pts = element.points
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDist(worldX, worldY, pts[i], pts[i + 1])
    if (d <= halfW) return true
  }
  // For closed paths, check the closing segment
  if (element.closed && pts.length >= 2) {
    const d = pointToSegmentDist(worldX, worldY, pts[pts.length - 1], pts[0])
    if (d <= halfW) return true
  }
  return false
}

/** Axis-aligned bounding box of a PathElement. */
export function getAABB(element: PathElement): { x: number; y: number; w: number; h: number } {
  if (element.points.length === 0) return { x: element.x, y: element.y, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of element.points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const half = element.strokeWidthCm / 2
  return {
    x: minX - half,
    y: minY - half,
    w: maxX - minX + element.strokeWidthCm,
    h: maxY - minY + element.strokeWidthCm,
  }
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

function pointToSegmentDist(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-10) {
    const ex = px - a.x, ey = py - a.y
    return Math.sqrt(ex * ex + ey * ey)
  }
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  const ex = px - cx, ey = py - cy
  return Math.sqrt(ex * ex + ey * ey)
}

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function computePathAABB(points: Vec2[]): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function toKonvaPoints(pts: Vec2[]): number[] {
  const arr: number[] = []
  for (const p of pts) arr.push(p.x, p.y)
  return arr
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PathLayerProps {
  width: number
  height: number
}

export default function PathLayer({ width: _width, height: _height }: PathLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)
  const zoom = useViewportStore((s) => s.zoom)

  const selectedPathTypeId = usePathToolStore((s) => s.selectedPathTypeId)

  const isActive = activeTool === 'path' && selectedPathTypeId !== null

  // Drawing state in refs to avoid stale closures
  const drawingPointsRef = useRef<Vec2[]>([])
  const drawingSegmentsRef = useRef<PathSegment[]>([])
  const isDrawingRef = useRef(false)
  const cursorWorldRef = useRef<Vec2 | null>(null)

  // Tick counter to force re-renders when ref-based drawing state changes
  const [_tick, setTick] = useState(0)
  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  /** Get snapped world coordinates from a Konva event. */
  const getSnappedWorld = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): Vec2 => {
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

  /** Finalize the current path drawing. */
  const finalizePath = useCallback(
    (closed: boolean) => {
      const points = drawingPointsRef.current
      const segments = drawingSegmentsRef.current
      if (points.length < 2) {
        // Cancel — not enough points
        drawingPointsRef.current = []
        drawingSegmentsRef.current = []
        isDrawingRef.current = false
        cursorWorldRef.current = null
        forceUpdate()
        return
      }

      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      const regs = useProjectStore.getState().registries
      const pathTypeId = usePathToolStore.getState().selectedPathTypeId
      if (!pathTypeId) return
      const pathType = regs.paths.find((p) => p.id === pathTypeId)
      if (!pathType) {
        console.warn('[PathLayer] finalizePath: pathTypeId not in registry, drawing discarded', { pathTypeId })
        return
      }

      // If closing, add a closing segment
      const finalSegments = closed
        ? [...segments, { type: 'line' as const, arcSagitta: null }]
        : [...segments]

      const aabb = computePathAABB(points)
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      // Capture pre-mutation snapshot
      const snapshot = structuredClone(proj)

      updateProject((draft) => {
        draft.elements.push({
          id,
          type: 'path',
          pathTypeId,
          points: points.map((p) => ({ x: p.x, y: p.y })),
          segments: finalSegments,
          strokeWidthCm: pathType.defaultWidthCm,
          closed,
          x: aabb.x,
          y: aabb.y,
          width: aabb.w || 1,
          height: aabb.h || 1,
          rotation: 0,
          zIndex: 0,
          locked: false,
          layerId,
          groupId: null,
          createdAt: now,
          updatedAt: now,
        } satisfies PathElement)
      })

      pushHistory(snapshot)
      console.debug('[PathLayer] path created', { id, points: points.length, closed, pathTypeId })

      // Reset drawing state
      drawingPointsRef.current = []
      drawingSegmentsRef.current = []
      isDrawingRef.current = false
      cursorWorldRef.current = null
      forceUpdate()
    },
    [updateProject, pushHistory, forceUpdate],
  )

  /** Close tolerance: check if a point is near the first drawn point. */
  const isNearFirstPoint = useCallback(
    (pos: Vec2): boolean => {
      const pts = drawingPointsRef.current
      if (pts.length < 3) return false
      const tol = 8 / zoom
      return dist(pos, pts[0]) <= tol
    },
    [zoom],
  )

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isActive) return
      if (e.evt.button !== 0) return

      const world = getSnappedWorld(e)

      if (!isDrawingRef.current) {
        // Start a new path
        drawingPointsRef.current = [world]
        drawingSegmentsRef.current = []
        isDrawingRef.current = true
        cursorWorldRef.current = world
        forceUpdate()
      } else {
        // Check close detection
        if (isNearFirstPoint(world)) {
          finalizePath(true)
          return
        }

        // Add point and segment
        drawingPointsRef.current = [...drawingPointsRef.current, world]
        drawingSegmentsRef.current = [
          ...drawingSegmentsRef.current,
          { type: 'line' as const, arcSagitta: null },
        ]
        cursorWorldRef.current = world
        forceUpdate()
      }
    },
    [isActive, getSnappedWorld, isNearFirstPoint, finalizePath, forceUpdate],
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isActive || !isDrawingRef.current) return
      const world = getSnappedWorld(e)
      cursorWorldRef.current = world
      forceUpdate()
    },
    [isActive, getSnappedWorld, forceUpdate],
  )

  // Escape key to finish path, or cancel if <2 points
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard events when user is typing in an input
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      if (e.key === 'Escape' && isDrawingRef.current) {
        e.preventDefault()
        finalizePath(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finalizePath])

  // Reset drawing when tool changes away from path
  useEffect(() => {
    if (activeTool !== 'path' && isDrawingRef.current) {
      // Cancel in-progress drawing
      drawingPointsRef.current = []
      drawingSegmentsRef.current = []
      isDrawingRef.current = false
      cursorWorldRef.current = null
    }
  }, [activeTool])

  if (!project) return null

  // Render existing path elements
  const pathElements = project.elements.filter(
    (el): el is PathElement => el.type === 'path',
  )

  // Current drawing state for preview
  const drawingPoints = drawingPointsRef.current
  const cursorWorld = cursorWorldRef.current
  const isDrawing = isDrawingRef.current

  return (
    <Layer listening={isActive}>
      {/* Transparent hit area for drawing */}
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

      {/* Render existing paths */}
      {pathElements.map((el) => {
        const pathType = registries.paths.find((p) => p.id === el.pathTypeId)
        if (!pathType) return null

        const pts = el.closed
          ? [...el.points, el.points[0]]
          : el.points

        return (
          <Line
            key={el.id}
            points={toKonvaPoints(pts)}
            stroke={pathType.color}
            strokeWidth={el.strokeWidthCm}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        )
      })}

      {/* Drawing preview */}
      {isDrawing && drawingPoints.length >= 1 && (
        <>
          {/* Completed segments */}
          {drawingPoints.length >= 2 && (
            <Line
              points={toKonvaPoints(drawingPoints)}
              stroke={getDrawingColor()}
              strokeWidth={getDrawingStrokeWidth()}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}

          {/* Preview line from last point to cursor */}
          {cursorWorld && (
            <Line
              points={[
                drawingPoints[drawingPoints.length - 1].x,
                drawingPoints[drawingPoints.length - 1].y,
                cursorWorld.x,
                cursorWorld.y,
              ]}
              stroke={getDrawingColor()}
              strokeWidth={getDrawingStrokeWidth()}
              opacity={0.5}
              dash={[6 / zoom, 4 / zoom]}
              lineCap="round"
              listening={false}
            />
          )}

          {/* Vertex dots */}
          {drawingPoints.map((p, i) => (
            <Circle
              key={`draw-pt-${i}`}
              x={p.x}
              y={p.y}
              radius={4 / zoom}
              fill={i === 0 && drawingPoints.length >= 3 ? '#f03e3e' : getDrawingColor()}
              stroke="#fff"
              strokeWidth={1 / zoom}
              listening={false}
            />
          ))}

          {/* Close indicator ring when near first point */}
          {cursorWorld && isNearFirstPoint(cursorWorld) && (
            <Circle
              x={drawingPoints[0].x}
              y={drawingPoints[0].y}
              radius={10 / zoom}
              stroke="#f03e3e"
              strokeWidth={1.5 / zoom}
              fill="transparent"
              listening={false}
            />
          )}
        </>
      )}
    </Layer>
  )

  /** Get the drawing color from the selected path type. */
  function getDrawingColor(): string {
    const pathType = registries.paths.find((p) => p.id === selectedPathTypeId)
    return pathType?.color ?? '#888'
  }

  /** Get the drawing stroke width from the selected path type. */
  function getDrawingStrokeWidth(): number {
    const pathType = registries.paths.find((p) => p.id === selectedPathTypeId)
    return pathType?.defaultWidthCm ?? 10
  }
}

