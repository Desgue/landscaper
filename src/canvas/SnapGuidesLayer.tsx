import { Line } from 'react-konva'
import { useSnapState } from '../snap/useSnapState'
import { useViewportStore } from '../store/useViewportStore'
import { toWorld } from './viewport'

interface SnapGuidesLayerProps {
  width: number
  height: number
}

export default function SnapGuidesLayer({ width, height }: SnapGuidesLayerProps) {
  const guideLines = useSnapState((s) => s.guideLines)
  const { panX, panY, zoom } = useViewportStore()

  if (guideLines.length === 0) return null

  const topLeft = toWorld(0, 0, panX, panY, zoom)
  const bottomRight = toWorld(width, height, panX, panY, zoom)

  const worldLeft = topLeft.x
  const worldTop = topLeft.y
  const worldRight = bottomRight.x
  const worldBottom = bottomRight.y

  const strokeWidth = 1 / zoom

  return (
    <>
      {guideLines.map((guide, i) => {
        if (guide.axis === 'x') {
          // Vertical line at x = guide.value
          return (
            <Line
              key={i}
              points={[guide.value, worldTop, guide.value, worldBottom]}
              stroke="#1971c2"
              strokeWidth={strokeWidth}
              opacity={0.5}
              listening={false}
            />
          )
        } else {
          // Horizontal line at y = guide.value
          return (
            <Line
              key={i}
              points={[worldLeft, guide.value, worldRight, guide.value]}
              stroke="#1971c2"
              strokeWidth={strokeWidth}
              opacity={0.5}
              listening={false}
            />
          )
        }
      })}
    </>
  )
}
