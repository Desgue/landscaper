import { useViewportStore } from '../store/useViewportStore'

// Scale bar candidates: [distanceCm, zoom threshold]
// For each zoom range, try the listed distances and pick the first
// where barLengthPx = distanceCm * zoom is between 80 and 200px.
// Per spec: prefer the smaller distance first within each zoom range
const SCALE_CANDIDATES: Array<{ maxZoom: number; distances: number[] }> = [
  { maxZoom: 0.1, distances: [5000, 10000] },   // 50m, 100m
  { maxZoom: 0.3, distances: [1000, 2000] },    // 10m, 20m
  { maxZoom: 1.0, distances: [500, 1000] },     // 5m, 10m
  { maxZoom: 3.0, distances: [100, 200] },      // 1m, 2m
  { maxZoom: Infinity, distances: [20, 50] },   // 20cm, 50cm
]

function pickScaleDistance(zoom: number): { distanceCm: number; barLengthPx: number } {
  const BAR_MIN_PX = 80
  const BAR_MAX_PX = 200

  for (const range of SCALE_CANDIDATES) {
    if (zoom < range.maxZoom) {
      for (const distanceCm of range.distances) {
        const barLengthPx = distanceCm * zoom
        if (barLengthPx >= BAR_MIN_PX && barLengthPx <= BAR_MAX_PX) {
          return { distanceCm, barLengthPx }
        }
      }
      // If none fit, use the first in the range as a fallback
      const distanceCm = range.distances[0]
      return { distanceCm, barLengthPx: distanceCm * zoom }
    }
  }

  // Fallback for zoom >= 3.0 (handled by Infinity maxZoom above, but TypeScript needs this)
  const distanceCm = 50
  return { distanceCm, barLengthPx: distanceCm * zoom }
}

function formatDistance(distanceCm: number): string {
  if (distanceCm >= 100) {
    const meters = distanceCm / 100
    return `${meters}m`
  }
  return `${distanceCm}cm`
}

export default function ScaleBar() {
  const zoom = useViewportStore((s) => s.zoom)

  const { distanceCm, barLengthPx } = pickScaleDistance(zoom)
  const label = formatDistance(distanceCm)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 6,
        padding: '4px 8px',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Horizontal bar */}
      <div
        style={{
          width: barLengthPx,
          height: 4,
          background: '#000000',
          borderRadius: 2,
        }}
      />
      {/* Distance label */}
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: '#000000',
          lineHeight: 1,
        }}
      >
        {label}
      </div>
    </div>
  )
}
