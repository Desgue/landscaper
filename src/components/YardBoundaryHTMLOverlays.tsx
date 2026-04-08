import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useBoundaryUIStore } from '../store/useBoundaryUIStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { toScreen } from '../canvas/viewport'
import { hasSelfIntersection } from '../canvas-pixi/BoundaryHandler'
import type { Vec2 } from '../types/schema'

// ---------------------------------------------------------------------------
// Edge-length inline input
// ---------------------------------------------------------------------------

function EdgeLengthInput({
  edgeIndex,
  midScreen,
  currentLengthM,
  onCommit,
  onCancel,
}: {
  edgeIndex: number
  midScreen: { x: number; y: number }
  currentLengthM: number
  onCommit: (edgeIndex: number, meters: number) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)
  const [value, setValue] = useState(currentLengthM.toFixed(2))

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  // Clear editingEdgeIndex on unmount (e.g. project switch while input open)
  useEffect(() => {
    return () => {
      if (!committedRef.current) onCancel()
    }
  }, [onCancel])

  const commit = useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 10000) {
      onCommit(edgeIndex, parsed)
    } else {
      onCancel()
    }
  }, [value, edgeIndex, onCommit, onCancel])

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      aria-label={`Edge ${edgeIndex + 1} length in meters`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          committedRef.current = true
          onCancel()
        }
      }}
      onBlur={commit}
      className="pointer-events-auto rounded border border-blue-400 bg-white px-1 text-xs text-center shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
      style={{
        position: 'absolute',
        left: midScreen.x,
        top: midScreen.y,
        transform: 'translate(-50%, -50%)',
        width: 64,
      }}
      autoFocus
    />
  )
}

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

export default function YardBoundaryHTMLOverlays() {
  // Subscribe to individual fields to avoid re-renders on cursorWorld changes
  const isPlacing = useBoundaryUIStore((s) => s.placementState.isPlacing)
  const placedVertices = useBoundaryUIStore((s) => s.placementState.placedVertices)
  const boundaryHandle = useBoundaryUIStore((s) => s.boundaryHandle)
  const editingEdgeIndex = useBoundaryUIStore((s) => s.editingEdgeIndex)
  const setEditingEdgeIndex = useBoundaryUIStore((s) => s.setEditingEdgeIndex)

  const yardBoundary = useProjectStore((s) => s.currentProject?.yardBoundary ?? null)
  const activeTool = useToolStore((s) => s.activeTool)
  const panX = useViewportStore((s) => s.panX)
  const panY = useViewportStore((s) => s.panY)
  const zoom = useViewportStore((s) => s.zoom)

  const showPlacement = isPlacing && activeTool === 'select'
  const showEditing = yardBoundary !== null && !isPlacing

  // Stable callbacks for EdgeLengthInput (prevents cleanup effect churn on pan/zoom)
  const handleEdgeCommit = useCallback((idx: number, meters: number) => {
    useBoundaryUIStore.getState().boundaryHandle?.applyEdgeLength(idx, meters)
    useBoundaryUIStore.getState().setEditingEdgeIndex(null)
  }, [])

  const handleEdgeCancel = useCallback(() => {
    useBoundaryUIStore.getState().setEditingEdgeIndex(null)
  }, [])

  // Escape key cancels placement (stopPropagation prevents CanvasHost conflict)
  useEffect(() => {
    if (!showPlacement) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        boundaryHandle?.destroy()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [showPlacement, boundaryHandle])

  // Memoize edge midpoints — only recompute when boundary or viewport changes
  const edgeMidpoints = useMemo(() => {
    if (!showEditing || !yardBoundary) return []
    const verts = yardBoundary.vertices
    const n = verts.length
    const result: { x: number; y: number; lengthM: number }[] = []
    for (let i = 0; i < n; i++) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      const mid: Vec2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const screen = toScreen(mid.x, mid.y, panX, panY, zoom)
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const lengthCm = Math.sqrt(dx * dx + dy * dy)
      result.push({ x: screen.x, y: screen.y, lengthM: lengthCm / 100 })
    }
    return result
  }, [showEditing, yardBoundary, panX, panY, zoom])

  const selfIntersects = showPlacement && placedVertices.length >= 4 && hasSelfIntersection(placedVertices)
  const canCommit = placedVertices.length >= 3 && !selfIntersects

  if (!showPlacement && !showEditing) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* ---- Placement mode ---- */}
      {showPlacement && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 rounded-lg bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm border border-gray-200"
        >
          <p className="text-sm text-gray-700">
            {placedVertices.length >= 3
              ? 'Click the first point to close, or press Done.'
              : 'Click to place yard boundary points (3 minimum).'}
          </p>

          {placedVertices.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {placedVertices.length} {placedVertices.length === 1 ? 'point' : 'points'}
            </span>
          )}

          {selfIntersects && (
            <span className="text-xs font-medium text-red-600">
              Edges cross — adjust points
            </span>
          )}

          <button
            disabled={!canCommit}
            onClick={() => boundaryHandle?.commitBoundary()}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Done
          </button>
        </div>
      )}

      {/* ---- Editing mode: edge-length labels ---- */}
      {showEditing &&
        edgeMidpoints.map((mid, i) =>
          editingEdgeIndex === i ? (
            <EdgeLengthInput
              key={i}
              edgeIndex={i}
              midScreen={mid}
              currentLengthM={mid.lengthM}
              onCommit={handleEdgeCommit}
              onCancel={handleEdgeCancel}
            />
          ) : (
            <button
              key={i}
              onClick={() => setEditingEdgeIndex(i)}
              aria-label={`Edge ${i + 1}: ${mid.lengthM.toFixed(2)} meters — click to edit`}
              className="pointer-events-auto rounded bg-white/80 px-1 text-xs text-gray-600 shadow-sm hover:bg-white hover:text-gray-900 border border-gray-300/60"
              style={{
                position: 'absolute',
                left: mid.x,
                top: mid.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {mid.lengthM.toFixed(2)}m
            </button>
          ),
        )}
    </div>
  )
}
