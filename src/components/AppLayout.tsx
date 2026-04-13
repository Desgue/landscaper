import { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { useRouter } from '@tanstack/react-router'
import TopToolbar from './TopToolbar'
import SidePalette from './SidePalette'
import InspectorPanel from './InspectorPanel'
import LayerPanel from './LayerPanel'
import StatusBar from './StatusBar'
import Minimap from './Minimap'
import YardBoundaryHTMLOverlays from './YardBoundaryHTMLOverlays'
import PlacementFeedback from './PlacementFeedback'

const Canvas = lazy(() => import('../canvas-pixi/CanvasHost'))
import ZOrderContextMenu from './ZOrderContextMenu'
import JournalView from './JournalView'
import CostSummaryPanel from './CostSummaryPanel'
import { GenerateShell } from './generate/GenerateShell'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore, setOnApplySnapshot } from '../store/useHistoryStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { useGenerateStore } from '../store/useGenerateStore'
import { getAllProjects } from '../db/projectsDb'
import { BUILTIN_REGISTRIES } from '../data/builtinRegistries'

// Wire history → project store at module load time.
// undo/redo will call loadProject + markDirty without the history store
// needing to import useProjectStore directly.
setOnApplySnapshot((snapshot) => {
  const store = useProjectStore.getState();
  store.loadProject(snapshot, store.registries);
  store.markDirty();
});

// Provide the history store with a way to read the live current project.
useHistoryStore.getState().setGetCurrentProject(
  () => useProjectStore.getState().currentProject,
);

export default function AppLayout() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const router = useRouter()
  const currentProject = useProjectStore((s) => s.currentProject)
  const loadProject = useProjectStore((s) => s.loadProject)
  const mode = useLayoutStore((s) => s.mode)
  const showCostSummary = useLayoutStore((s) => s.showCostSummary)
  const setShowCostSummary = useLayoutStore((s) => s.setShowCostSummary)
  const restoreFromProject = useGenerateStore((s) => s.restoreFromProject)

  useKeyboardShortcuts()

  // Restore persisted generate options whenever the user enters generate mode
  useEffect(() => {
    if (mode === 'generate') {
      restoreFromProject()
    }
  }, [mode, restoreFromProject])

  // Restore last project from IndexedDB if store is empty (e.g. after page reload)
  useEffect(() => {
    if (currentProject) return
    getAllProjects().then((projects) => {
      if (projects.length > 0) {
        // getAllProjects returns sorted by updatedAt desc, so first is most recent
        loadProject(projects[0], BUILTIN_REGISTRIES)
      } else {
        // No projects exist — redirect to welcome screen
        router.navigate({ to: '/app' })
      }
    })
  }, [currentProject, loadProject, router])

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

  // Determine per-mode panel configuration
  const isGenerateMode = mode === 'generate'
  const isGardenMode = mode === 'garden'

  // Left panel: SidePalette collapses in generate mode; hidden in garden mode (future LeftNav)
  const leftPanel = isGardenMode ? null : <SidePalette />

  // Right panel: InspectorPanel/LayerPanel in blueprint; nothing in generate or garden by default
  const rightPanel = (isGenerateMode || isGardenMode) ? null : (
    <div className="flex flex-col flex-shrink-0">
      <InspectorPanel />
      <LayerPanel />
    </div>
  )

  // Generate options panel replaces right panel in generate mode (rendered inside GenerateShell)
  const generatePanel = isGenerateMode ? (
    <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 280 }}>
      <GenerateShell />
    </div>
  ) : null

  // Status bar: hidden in generate and garden modes
  const statusBarVisible = !isGenerateMode && !isGardenMode

  // The canvas must always remain mounted to preserve PixiJS internal state.
  // In generate mode and garden mode the canvas container is hidden via visibility + position
  // rather than display:none, so ResizeObserver continues to report real dimensions.
  const canvasHidden = isGenerateMode || isGardenMode

  return (
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top toolbar */}
      <TopToolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel region */}
        {leftPanel}

        {/* Center: Canvas area — never unmounts across mode switches.
            Hidden in generate/garden mode via visibility:hidden + position:absolute
            so ResizeObserver reports real dimensions and PixiJS state is preserved. */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{
            background: 'var(--ls-surface-canvas-overflow)',
            ...(canvasHidden
              ? {
                  visibility: 'hidden',
                  position: 'absolute',
                  pointerEvents: 'none',
                  // Keep the element in the layout flow with real dimensions
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }
              : undefined),
          }}
        >
          <Suspense fallback={null}>
            <Canvas width={canvasSize.width} height={canvasSize.height} />
          </Suspense>
          <YardBoundaryHTMLOverlays />
          <PlacementFeedback />
          <Minimap canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />
        </div>

        {/* Generate mode main content area */}
        {isGenerateMode && (
          <div className="flex-1 relative overflow-hidden bg-bg">
            {/* Canvas is hidden in generate mode but kept mounted above */}
          </div>
        )}

        {/* Garden mode main content area */}
        {isGardenMode && (
          <div className="flex-1 overflow-hidden">
            <JournalView onClose={() => useLayoutStore.getState().setMode('blueprint')} />
          </div>
        )}

        {/* Right panel region */}
        {rightPanel}

        {/* Generate panel (right slot when in generate mode) */}
        {generatePanel}
      </div>

      {/* Status bar region */}
      {statusBarVisible && (
        <StatusBar onOpenCostSummary={() => setShowCostSummary(true)} />
      )}

      {/* Z-order context menu overlay */}
      <ZOrderContextMenu />

      {/* Cost summary modal */}
      {showCostSummary && (
        <CostSummaryPanel onClose={() => setShowCostSummary(false)} />
      )}
    </div>
  )
}
