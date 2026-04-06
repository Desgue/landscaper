import { useRef, useState, useEffect } from 'react'
import TopToolbar from './TopToolbar'
import SidePalette from './SidePalette'
import InspectorPanel from './InspectorPanel'
import LayerPanel from './LayerPanel'
import StatusBar from './StatusBar'
import MinimapStub from './MinimapStub'
import CanvasRoot from '../canvas/CanvasRoot'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export default function AppLayout() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useKeyboardShortcuts()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top toolbar */}
      <TopToolbar />

      {/* Main content area: palette + canvas + right panels */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Side palette */}
        <SidePalette />

        {/* Center: Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ background: '#f5f5f5' }}
        >
          <CanvasRoot width={canvasSize.width} height={canvasSize.height} />
          <MinimapStub />
        </div>

        {/* Right: Inspector + Layer panels stacked */}
        <div className="flex flex-col flex-shrink-0">
          <InspectorPanel />
          <LayerPanel />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
