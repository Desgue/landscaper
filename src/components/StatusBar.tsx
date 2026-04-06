import { useViewportStore } from '../store/useViewportStore'
import { useProjectStore } from '../store/useProjectStore'

export default function StatusBar() {
  const zoom = useViewportStore((s) => s.zoom)
  const snapEnabled = useProjectStore((s) => s.currentProject?.uiState.snapEnabled ?? true)
  const gridVisible = useProjectStore((s) => s.currentProject?.uiState.gridVisible ?? true)
  const updateProject = useProjectStore((s) => s.updateProject)

  const zoomPct = Math.round(zoom * 100)

  return (
    <div
      className="flex items-center gap-6 px-4 bg-white border-t border-gray-200 text-xs text-gray-600 flex-shrink-0"
      style={{ height: 32 }}
    >
      <span>Zoom: {zoomPct}%</span>
      {/* Cursor coords updated by CanvasRoot via a future shared atom; static for now */}
      <span>0.00m, 0.00m</span>
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
    </div>
  )
}
