import { useEffect, useRef, useState } from 'react'
import { useViewportStore } from '../store/useViewportStore'

interface PanState {
  active: boolean
  startPanX: number
  startPanY: number
  startPointerX: number
  startPointerY: number
}

export function useCanvasPan() {
  const [isDragging, setIsDragging] = useState(false)
  const panStateRef = useRef<PanState>({
    active: false,
    startPanX: 0,
    startPanY: 0,
    startPointerX: 0,
    startPointerY: 0,
  })

  const startPan = (pointerX: number, pointerY: number) => {
    const { panX, panY } = useViewportStore.getState()
    panStateRef.current = {
      active: true,
      startPanX: panX,
      startPanY: panY,
      startPointerX: pointerX,
      startPointerY: pointerY,
    }
    setIsDragging(true)
  }

  const movePan = (pointerX: number, pointerY: number) => {
    const ps = panStateRef.current
    if (!ps.active) return
    useViewportStore
      .getState()
      .setPan(
        ps.startPanX + (pointerX - ps.startPointerX),
        ps.startPanY + (pointerY - ps.startPointerY),
      )
  }

  const endPan = () => {
    panStateRef.current.active = false
    setIsDragging(false)
  }

  // Window-level mouseup to catch missed mouseup events
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (panStateRef.current.active) {
        endPan()
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [])

  return { isDragging, panStateRef, startPan, movePan, endPan }
}
