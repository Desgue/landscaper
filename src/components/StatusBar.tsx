import { DollarSign, Plus, Minus } from 'lucide-react'
import { useViewportStore } from '../store/useViewportStore'
import { useProjectStore } from '../store/useProjectStore'
import { useCursorStore } from '../store/useCursorStore'

interface StatusBarProps {
  onOpenCostSummary?: () => void
}

export default function StatusBar({ onOpenCostSummary }: StatusBarProps = {}) {
  const zoom = useViewportStore((s) => s.zoom)
  const applyZoomTowardCursor = useViewportStore((s) => s.applyZoomTowardCursor)
  const snapEnabled = useProjectStore((s) => s.currentProject?.uiState.snapEnabled ?? true)
  const gridVisible = useProjectStore((s) => s.currentProject?.uiState.gridVisible ?? true)
  const updateProject = useProjectStore((s) => s.updateProject)
  const worldX = useCursorStore((s) => s.worldX)
  const worldY = useCursorStore((s) => s.worldY)

  const zoomPct = Math.round(zoom * 100)
  // Display in meters with cm precision
  const cursorXm = (worldX / 100).toFixed(2)
  const cursorYm = (worldY / 100).toFixed(2)

  const handleZoomIn = () => {
    // Zoom toward center of viewport
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    applyZoomTowardCursor(cx, cy, zoom * 1.2)
  }

  const handleZoomOut = () => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    applyZoomTowardCursor(cx, cy, zoom / 1.2)
  }

  return (
    <div
      className="flex items-center gap-6 px-4 bg-white border-t border-gray-200 text-xs text-gray-600 flex-shrink-0"
      style={{ height: 32 }}
    >
      <span className="flex items-center gap-1">
        <button
          title="Zoom out (-)"
          aria-label="Zoom out"
          className="hover:text-gray-900 cursor-pointer bg-transparent border-none p-0"
          onClick={handleZoomOut}
        >
          <Minus size={12} />
        </button>
        Zoom: {zoomPct}%
        <button
          title="Zoom in (+)"
          aria-label="Zoom in"
          className="hover:text-gray-900 cursor-pointer bg-transparent border-none p-0"
          onClick={handleZoomIn}
        >
          <Plus size={12} />
        </button>
      </span>
      <span>{cursorXm}m, {cursorYm}m</span>
      <button
        title="Toggle snap (Ctrl+G)"
        aria-label="Toggle snap"
        aria-pressed={snapEnabled}
        className="hover:text-gray-900 cursor-pointer bg-transparent border-none p-0"
        onClick={() => updateProject((p) => { p.uiState.snapEnabled = !p.uiState.snapEnabled })}
      >
        Snap: {snapEnabled ? 'ON' : 'OFF'}
      </button>
      <button
        title="Toggle grid (Ctrl+')"
        aria-label="Toggle grid"
        aria-pressed={gridVisible}
        className="hover:text-gray-900 cursor-pointer bg-transparent border-none p-0"
        onClick={() => updateProject((p) => { p.uiState.gridVisible = !p.uiState.gridVisible })}
      >
        Grid: {gridVisible ? 'ON' : 'OFF'}
      </button>
      <div className="flex-1" />
      <button
        title="Cost Summary"
        aria-label="Cost Summary"
        className="flex items-center gap-1 hover:text-gray-900 cursor-pointer bg-transparent border-none p-0"
        onClick={() => onOpenCostSummary?.()}
      >
        <DollarSign size={12} />
        Cost
      </button>
    </div>
  )
}
