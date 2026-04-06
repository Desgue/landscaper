import { Layer, Line } from 'react-konva'
import { useViewportStore } from '../store/useViewportStore'
import { toWorld } from './viewport'

const MAJOR_INTERVAL = 100  // 1m in cm
const MINOR_INTERVAL = 10   // 10cm

interface GridLayerProps {
  width: number
  height: number
  gridVisible?: boolean
}

export default function GridLayer({ width, height, gridVisible = true }: GridLayerProps) {
  const { panX, panY, zoom } = useViewportStore()

  // Ctrl+' grid toggle is handled in useKeyboardShortcuts (always mounted, survives hidden state)

  if (!gridVisible) return null

  const topLeft = toWorld(0, 0, panX, panY, zoom)
  const bottomRight = toWorld(width, height, panX, panY, zoom)

  const worldLeft = topLeft.x
  const worldTop = topLeft.y
  const worldRight = bottomRight.x
  const worldBottom = bottomRight.y

  const majorLines: React.ReactElement[] = []
  const minorLines: React.ReactElement[] = []

  const majorStrokeWidth = 1 / zoom
  const majorDash = [4 / zoom, 4 / zoom]
  const minorStrokeWidth = 0.5 / zoom
  const minorDash = [2 / zoom, 6 / zoom]

  const majorStartX = Math.floor(worldLeft / MAJOR_INTERVAL) * MAJOR_INTERVAL
  const majorStartY = Math.floor(worldTop / MAJOR_INTERVAL) * MAJOR_INTERVAL

  for (let wx = majorStartX; wx <= worldRight; wx += MAJOR_INTERVAL) {
    majorLines.push(
      <Line key={`mv-${wx}`} points={[wx, worldTop, wx, worldBottom]}
        stroke="#d4d4d4" strokeWidth={majorStrokeWidth} dash={majorDash} listening={false} />,
    )
  }

  for (let wy = majorStartY; wy <= worldBottom; wy += MAJOR_INTERVAL) {
    majorLines.push(
      <Line key={`mh-${wy}`} points={[worldLeft, wy, worldRight, wy]}
        stroke="#d4d4d4" strokeWidth={majorStrokeWidth} dash={majorDash} listening={false} />,
    )
  }

  if (zoom >= 1.0) {
    const minorStartX = Math.floor(worldLeft / MINOR_INTERVAL) * MINOR_INTERVAL
    const minorStartY = Math.floor(worldTop / MINOR_INTERVAL) * MINOR_INTERVAL

    for (let wx = minorStartX; wx <= worldRight; wx += MINOR_INTERVAL) {
      if (Math.abs(wx % MAJOR_INTERVAL) < 0.001) continue
      minorLines.push(
        <Line key={`nv-${wx}`} points={[wx, worldTop, wx, worldBottom]}
          stroke="#e8e8e8" strokeWidth={minorStrokeWidth} dash={minorDash} listening={false} />,
      )
    }

    for (let wy = minorStartY; wy <= worldBottom; wy += MINOR_INTERVAL) {
      if (Math.abs(wy % MAJOR_INTERVAL) < 0.001) continue
      minorLines.push(
        <Line key={`nh-${wy}`} points={[worldLeft, wy, worldRight, wy]}
          stroke="#e8e8e8" strokeWidth={minorStrokeWidth} dash={minorDash} listening={false} />,
      )
    }
  }

  return (
    <Layer listening={false}>
      {minorLines}
      {majorLines}
    </Layer>
  )
}
