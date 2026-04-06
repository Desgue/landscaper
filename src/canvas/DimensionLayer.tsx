/**
 * DimensionLayer.tsx — Renders persistent dimension annotations and handles
 * measurement tool interaction (M key).
 *
 * Measurement tool: click two points to measure distance.
 * After second click: "Dismiss" discards, "Keep" saves as persistent dimension.
 * Snap: free placement by default (inverted like labels); Alt ENABLES snap.
 */

import { useCallback, useEffect, useRef } from 'react'
import { Layer, Line, Group as KonvaGroup, Text, Shape } from 'react-konva'
import type Konva from 'konva'
import { create } from 'zustand'
import type { DimensionElement, Vec2 } from '../types/schema'
import { useToolStore } from '../store/useToolStore'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useViewportStore } from '../store/useViewportStore'
import { snapPoint } from '../snap/snapSystem'
import {
  computeDimensionGeometry,
  dimensionAABB,
  formatDistance,
} from './geometry'
import type { AABB } from './hitTestAll'

// ─── Measurement state store ──────────────────────────────────────────────

type MeasurePhase = 'idle' | 'first_placed' | 'completed'

interface MeasurementStore {
  phase: MeasurePhase
  startPoint: Vec2 | null
  endPoint: Vec2 | null
  livePoint: Vec2 | null
  reset: () => void
}

export const useMeasurementStore = create<MeasurementStore>((set) => ({
  phase: 'idle',
  startPoint: null,
  endPoint: null,
  livePoint: null,
  reset: () => set({ phase: 'idle', startPoint: null, endPoint: null, livePoint: null }),
}))

// ─── Hit test & AABB exports ──────────────────────────────────────────────

function pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.001) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2)
}

export function hitTest(element: DimensionElement, worldX: number, worldY: number): boolean {
  const geo = computeDimensionGeometry(element.startPoint, element.endPoint, element.offsetCm)
  const tolerance = 15
  return (
    pointToSegmentDistance({ x: worldX, y: worldY }, geo.leaderStart, geo.leaderEnd) <= tolerance ||
    pointToSegmentDistance({ x: worldX, y: worldY }, geo.extensionStart[0], geo.extensionStart[1]) <= tolerance ||
    pointToSegmentDistance({ x: worldX, y: worldY }, geo.extensionEnd[0], geo.extensionEnd[1]) <= tolerance
  )
}

export function getAABB(element: DimensionElement): AABB {
  return dimensionAABB(element.startPoint, element.endPoint, element.offsetCm)
}

// ─── Dimension annotation rendering ───────────────────────────────────────

function DimensionAnnotation({
  startPoint,
  endPoint,
  offsetCm,
  precision,
  opacity,
}: {
  startPoint: Vec2
  endPoint: Vec2
  offsetCm: number
  precision: number
  opacity?: number
}) {
  const zoom = useViewportStore((s) => s.zoom)
  const geo = computeDimensionGeometry(startPoint, endPoint, offsetCm)
  const label = formatDistance(geo.distanceCm, precision)

  const invZoom = 1 / zoom
  const arrowSize = 12 * invZoom
  const fontSize = 12 * invZoom
  const extOvershoot = 4 * invZoom
  const lineWidth = 1.5 * invZoom

  const ldx = geo.leaderEnd.x - geo.leaderStart.x
  const ldy = geo.leaderEnd.y - geo.leaderStart.y
  const lLen = Math.sqrt(ldx * ldx + ldy * ldy)
  const dirX = lLen > 0.001 ? ldx / lLen : 1
  const dirY = lLen > 0.001 ? ldy / lLen : 0

  const perpDx = geo.leaderStart.x - startPoint.x
  const perpDy = geo.leaderStart.y - startPoint.y
  const perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy)
  const perpUnitX = perpLen > 0.001 ? perpDx / perpLen : 0
  const perpUnitY = perpLen > 0.001 ? perpDy / perpLen : -1

  return (
    <KonvaGroup opacity={opacity ?? 1} listening={false}>
      {/* Extension lines */}
      <Line
        points={[
          startPoint.x, startPoint.y,
          geo.leaderStart.x + perpUnitX * extOvershoot,
          geo.leaderStart.y + perpUnitY * extOvershoot,
        ]}
        stroke="#555"
        strokeWidth={lineWidth * 0.7}
        dash={[4 * invZoom, 3 * invZoom]}
      />
      <Line
        points={[
          endPoint.x, endPoint.y,
          geo.leaderEnd.x + perpUnitX * extOvershoot,
          geo.leaderEnd.y + perpUnitY * extOvershoot,
        ]}
        stroke="#555"
        strokeWidth={lineWidth * 0.7}
        dash={[4 * invZoom, 3 * invZoom]}
      />

      {/* Leader line */}
      <Line
        points={[geo.leaderStart.x, geo.leaderStart.y, geo.leaderEnd.x, geo.leaderEnd.y]}
        stroke="#1971c2"
        strokeWidth={lineWidth}
      />

      {/* Arrowheads */}
      <Shape
        sceneFunc={(ctx, shape) => {
          // Arrow at start (pointing inward)
          ctx.beginPath()
          ctx.moveTo(geo.leaderStart.x + dirX * arrowSize, geo.leaderStart.y + dirY * arrowSize)
          ctx.lineTo(geo.leaderStart.x + (-dirY) * arrowSize * 0.35, geo.leaderStart.y + dirX * arrowSize * 0.35)
          ctx.lineTo(geo.leaderStart.x - (-dirY) * arrowSize * 0.35, geo.leaderStart.y - dirX * arrowSize * 0.35)
          ctx.closePath()
          // Arrow at end (pointing inward)
          ctx.moveTo(geo.leaderEnd.x - dirX * arrowSize, geo.leaderEnd.y - dirY * arrowSize)
          ctx.lineTo(geo.leaderEnd.x + (-dirY) * arrowSize * 0.35, geo.leaderEnd.y + dirX * arrowSize * 0.35)
          ctx.lineTo(geo.leaderEnd.x - (-dirY) * arrowSize * 0.35, geo.leaderEnd.y - dirX * arrowSize * 0.35)
          ctx.closePath()
          ctx.fillStrokeShape(shape)
        }}
        fill="#1971c2"
      />

      {/* Distance label */}
      <Text
        x={geo.textPosition.x}
        y={geo.textPosition.y}
        text={` ${label} `}
        fontSize={fontSize}
        fontFamily="Inter, sans-serif"
        fill="#1971c2"
        fontStyle="bold"
        align="center"
        offsetY={fontSize / 2}
        rotation={(geo.textAngle * 180) / Math.PI}
        ref={(node) => {
          if (node) node.offsetX(node.width() / 2)
        }}
      />
    </KonvaGroup>
  )
}

// ─── Preview line during measurement ──────────────────────────────────────

function MeasurePreview({ startPoint, endPoint }: { startPoint: Vec2; endPoint: Vec2 }) {
  const zoom = useViewportStore((s) => s.zoom)
  const invZoom = 1 / zoom
  const dist = Math.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2)
  const label = formatDistance(dist)
  const midX = (startPoint.x + endPoint.x) / 2
  const midY = (startPoint.y + endPoint.y) / 2
  const fontSize = 12 * invZoom

  return (
    <KonvaGroup listening={false}>
      <Line
        points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
        stroke="#1971c2"
        strokeWidth={2 * invZoom}
        dash={[6 * invZoom, 4 * invZoom]}
      />
      <Text
        x={midX}
        y={midY - fontSize - 4 * invZoom}
        text={label}
        fontSize={fontSize}
        fontFamily="Inter, sans-serif"
        fill="#1971c2"
        fontStyle="bold"
        ref={(node) => {
          if (node) node.offsetX(node.width() / 2)
        }}
      />
    </KonvaGroup>
  )
}

// ─── Main DimensionLayer ──────────────────────────────────────────────────

interface DimensionLayerProps {
  width: number
  height: number
}

export default function DimensionLayer({ width, height }: DimensionLayerProps) {
  const activeTool = useToolStore((s) => s.activeTool)
  const project = useProjectStore((s) => s.currentProject)
  const phase = useMeasurementStore((s) => s.phase)
  const startPt = useMeasurementStore((s) => s.startPoint)
  const livePt = useMeasurementStore((s) => s.livePoint)
  const endPt = useMeasurementStore((s) => s.endPoint)
  const reset = useMeasurementStore((s) => s.reset)

  const isMeasuring = activeTool === 'measurement'
  const prevToolRef = useRef(activeTool)

  // Reset on tool change
  useEffect(() => {
    if (prevToolRef.current === 'measurement' && activeTool !== 'measurement') {
      reset()
    }
    prevToolRef.current = activeTool
  }, [activeTool, reset])

  // Escape to dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useMeasurementStore.getState().phase !== 'idle') {
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reset])

  const getWorldPos = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): Vec2 => {
      const stage = e.target.getStage()
      if (!stage) return { x: 0, y: 0 }
      const pointer = stage.getPointerPosition()
      if (!pointer) return { x: 0, y: 0 }
      const { panX, panY, zoom } = useViewportStore.getState()
      return { x: (pointer.x - panX) / zoom, y: (pointer.y - panY) / zoom }
    },
    [],
  )

  const snapMeasure = useCallback((pos: Vec2, altHeld: boolean): Vec2 => {
    const proj = useProjectStore.getState().currentProject
    if (!proj) return pos
    const r = snapPoint(
      pos.x, pos.y, 'measurement', proj.elements,
      useViewportStore.getState().zoom,
      proj.gridConfig.snapIncrementCm,
      proj.uiState.snapEnabled, altHeld,
    )
    return { x: r.x, y: r.y }
  }, [])

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isMeasuring || e.evt.button !== 0) return
      const store = useMeasurementStore.getState()
      const snapped = snapMeasure(getWorldPos(e), e.evt.altKey)

      if (store.phase === 'idle') {
        useMeasurementStore.setState({
          phase: 'first_placed',
          startPoint: snapped,
          endPoint: null,
          livePoint: snapped,
        })
      } else if (store.phase === 'first_placed') {
        useMeasurementStore.setState({
          phase: 'completed',
          endPoint: snapped,
          livePoint: null,
        })
      }
    },
    [isMeasuring, getWorldPos, snapMeasure],
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isMeasuring || useMeasurementStore.getState().phase !== 'first_placed') return
      const snapped = snapMeasure(getWorldPos(e), e.evt.altKey)
      useMeasurementStore.setState({ livePoint: snapped })
    },
    [isMeasuring, getWorldPos, snapMeasure],
  )

  // Visible dimensions (filtered by layer visibility)
  const visibleDimensions = (project?.elements.filter(
    (el): el is DimensionElement => el.type === 'dimension',
  ) ?? []).filter((el) => {
    const layer = project?.layers.find((l) => l.id === el.layerId)
    return !layer || layer.visible
  })

  return (
    <Layer listening={isMeasuring} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}>
      {/* Persistent dimensions */}
      {visibleDimensions.map((dim) => (
        <DimensionAnnotation
          key={dim.id}
          startPoint={dim.startPoint}
          endPoint={dim.endPoint}
          offsetCm={dim.offsetCm}
          precision={dim.precision}
        />
      ))}

      {/* Live preview during measurement */}
      {isMeasuring && phase === 'first_placed' && startPt && livePt && (
        <MeasurePreview startPoint={startPt} endPoint={livePt} />
      )}

      {/* Completed measurement preview */}
      {isMeasuring && phase === 'completed' && startPt && endPt && (
        <DimensionAnnotation
          startPoint={startPt}
          endPoint={endPt}
          offsetCm={50}
          precision={2}
          opacity={0.8}
        />
      )}
    </Layer>
  )
}

// ─── HTML Overlay for Dismiss/Keep buttons ────────────────────────────────

export function MeasurementHTMLOverlays({ width, height }: { width: number; height: number }) {
  const activeTool = useToolStore((s) => s.activeTool)
  const phase = useMeasurementStore((s) => s.phase)
  const startPt = useMeasurementStore((s) => s.startPoint)
  const endPt = useMeasurementStore((s) => s.endPoint)
  const reset = useMeasurementStore((s) => s.reset)
  const { panX, panY, zoom } = useViewportStore()
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  const isActive = activeTool === 'measurement' && phase === 'completed' && !!startPt && !!endPt

  const keepMeasurement = useCallback(() => {
    const st = useMeasurementStore.getState()
    if (!st.startPoint || !st.endPoint) return
    const currentProject = useProjectStore.getState().currentProject
    if (!currentProject) return
    const snapshot = structuredClone(currentProject)
    const now = new Date().toISOString()
    const aabb = dimensionAABB(st.startPoint, st.endPoint, 50)

    const dim: DimensionElement = {
      id: crypto.randomUUID(),
      type: 'dimension',
      x: aabb.x,
      y: aabb.y,
      width: aabb.w,
      height: aabb.h,
      rotation: 0,
      zIndex: 0,
      locked: false,
      layerId: currentProject.layers[0]?.id ?? '',
      groupId: null,
      createdAt: now,
      updatedAt: now,
      startPoint: { ...st.startPoint },
      endPoint: { ...st.endPoint },
      startElementId: null,
      endElementId: null,
      offsetCm: 50,
      displayUnit: 'm',
      precision: 2,
    }

    updateProject((draft) => { draft.elements.push(dim) })
    pushHistory(snapshot)
    useProjectStore.getState().markDirty()
    useMeasurementStore.getState().reset()
  }, [updateProject, pushHistory])

  // Enter key to keep measurement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && useMeasurementStore.getState().phase === 'completed') {
        e.preventDefault()
        keepMeasurement()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keepMeasurement])

  if (!isActive) return null

  // Position buttons at midpoint of the measurement in screen space
  const midWorldX = (startPt.x + endPt.x) / 2
  const midWorldY = (startPt.y + endPt.y) / 2
  const screenX = midWorldX * zoom + panX
  const screenY = midWorldY * zoom + panY

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY + 20,
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5">
        <button
          className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
          onClick={() => reset()}
        >
          Dismiss
        </button>
        <button
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
          onClick={keepMeasurement}
        >
          Keep
        </button>
      </div>
    </div>
  )
}
