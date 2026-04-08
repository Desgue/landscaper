import { useViewportStore } from '../store/useViewportStore'
import { clampZoom } from '../canvas/viewport'

const ZOOM_ANIM_DURATION = 150

export function createZoomAnimator(): {
  onWheel: (e: WheelEvent) => void
  destroy: () => void
} {
  let zoomAnimRaf = 0
  let zoomAnimStart = 0
  let zoomAnimFrom = 1
  let zoomAnimTo = 1
  let zoomAnimCursorX = 0
  let zoomAnimCursorY = 0

  function animateZoom(now: number): void {
    const elapsed = now - zoomAnimStart
    const t = Math.min(1, elapsed / ZOOM_ANIM_DURATION)
    // Smooth ease-out
    const eased = 1 - (1 - t) * (1 - t)
    const currentZoom = zoomAnimFrom + (zoomAnimTo - zoomAnimFrom) * eased

    useViewportStore.getState().applyZoomTowardCursor(
      zoomAnimCursorX, zoomAnimCursorY, currentZoom,
    )

    if (t < 1) {
      zoomAnimRaf = requestAnimationFrame(animateZoom)
    } else {
      zoomAnimRaf = 0
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const { clientX, clientY, deltaX, deltaY, ctrlKey } = e
    if (ctrlKey) {
      // Cancel any in-flight zoom animation
      if (zoomAnimRaf) {
        cancelAnimationFrame(zoomAnimRaf)
        zoomAnimRaf = 0
      }

      const { zoom } = useViewportStore.getState()
      const factor = deltaY < 0 ? 1.25 : 1 / 1.25
      const targetZoom = clampZoom(zoom * factor)

      zoomAnimFrom = zoom
      zoomAnimTo = targetZoom
      zoomAnimCursorX = clientX
      zoomAnimCursorY = clientY
      zoomAnimStart = performance.now()
      zoomAnimRaf = requestAnimationFrame(animateZoom)
    } else if (e.deltaMode === 0) {
      // Trackpad two-finger pan
      const { panX, panY } = useViewportStore.getState()
      useViewportStore.getState().setPan(panX - deltaX, panY - deltaY)
    }
  }

  const destroy = () => {
    if (zoomAnimRaf) {
      cancelAnimationFrame(zoomAnimRaf)
      zoomAnimRaf = 0
    }
  }

  return { onWheel, destroy }
}
