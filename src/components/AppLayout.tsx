import { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { useRouter } from '@tanstack/react-router'
import TopToolbar from './TopToolbar'
import SidePalette from './SidePalette'
import InspectorPanel from './InspectorPanel'
import LayerPanel from './LayerPanel'
import StatusBar from './StatusBar'
import Minimap from './Minimap'
import YardBoundaryHTMLOverlays from './YardBoundaryHTMLOverlays'

const Canvas = lazy(() => import('../canvas-pixi/CanvasHost'))
import ZOrderContextMenu from './ZOrderContextMenu'
import JournalView from './JournalView'
import CostSummaryPanel from './CostSummaryPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useProjectStore } from '../store/useProjectStore'
import { getAllProjects } from '../db/projectsDb'
import { BUILTIN_REGISTRIES } from '../data/builtinRegistries'

export default function AppLayout() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [showJournal, setShowJournal] = useState(false)
  const [showCostSummary, setShowCostSummary] = useState(false)
  const router = useRouter()
  const currentProject = useProjectStore((s) => s.currentProject)
  const loadProject = useProjectStore((s) => s.loadProject)

  useKeyboardShortcuts()

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

  return (
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top toolbar */}
      <TopToolbar
        onOpenJournal={() => setShowJournal(true)}
        onOpenCostSummary={() => setShowCostSummary(true)}
      />

      {/* Main content area */}
      {showJournal ? (
        <div className="flex-1 overflow-hidden">
          <JournalView onClose={() => setShowJournal(false)} />
        </div>
      ) : (
        <>
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left: Side palette */}
            <SidePalette />

            {/* Center: Canvas area */}
            <div
              ref={containerRef}
              className="flex-1 relative overflow-hidden"
              style={{ background: 'var(--ls-surface-canvas-overflow)' }}
            >
              <Suspense fallback={null}>
                <Canvas width={canvasSize.width} height={canvasSize.height} />
              </Suspense>
              <YardBoundaryHTMLOverlays />
              <Minimap canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />
            </div>

            {/* Right: Inspector + Layer panels stacked */}
            <div className="flex flex-col flex-shrink-0">
              <InspectorPanel />
              <LayerPanel />
            </div>
          </div>

          {/* Status bar */}
          <StatusBar onOpenCostSummary={() => setShowCostSummary(true)} />
        </>
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
