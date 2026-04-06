import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { fitToView } from './viewport'
import GridLayer from './GridLayer'
import ScaleBar from './ScaleBar'
import { useProjectStore } from '../store/useProjectStore'
import SnapGuidesLayer from './SnapGuidesLayer'
import YardBoundaryLayer, { OverflowDimLayer, YardBoundaryHTMLOverlays, getAABB } from './YardBoundaryLayer'
import TerrainLayer from './TerrainLayer'
import PlantLayer from './PlantLayer'
import StructureLayer from './StructureLayer'
import LabelLayer, { LabelHTMLOverlays } from './LabelLayer'
import PathLayer from './PathLayer'
import { SelectionLayer } from './SelectionLayer'
import DimensionLayer, { MeasurementHTMLOverlays } from './DimensionLayer'

interface CanvasRootProps {
  width: number
  height: number
}

interface PanState {
  active: boolean
  startPanX: number
  startPanY: number
  startPointerX: number
  startPointerY: number
}

export default function CanvasRoot({ width, height }: CanvasRootProps) {
  const { panX, panY, zoom, setPan, setViewport, applyWheelZoom } = useViewportStore()
  const activeTool = useToolStore((s) => s.activeTool)

  const gridVisible = useProjectStore(
    (s) => s.currentProject?.uiState.gridVisible ?? true,
  )

  const [isDragging, setIsDragging] = useState(false)

  const panStateRef = useRef<PanState>({
    active: false,
    startPanX: 0,
    startPanY: 0,
    startPointerX: 0,
    startPointerY: 0,
  })

  // Keyboard: Ctrl+Shift+1 for fit-to-view
  // Space and Ctrl+G/Ctrl+' are handled globally in useKeyboardShortcuts + TopToolbar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
        e.preventDefault()
        const project = useProjectStore.getState().currentProject
        const fitElements: Array<{ x: number; y: number; width: number; height: number }> = []
        // Include yard boundary AABB if it exists
        if (project?.yardBoundary && project.yardBoundary.vertices.length >= 3) {
          const aabb = getAABB(project.yardBoundary)
          fitElements.push({ x: aabb.x, y: aabb.y, width: aabb.w, height: aabb.h })
        }
        // Include canvas elements
        if (project?.elements) {
          for (const el of project.elements) {
            fitElements.push({ x: el.x, y: el.y, width: el.width, height: el.height })
          }
        }
        const vp = fitToView(fitElements, width, height)
        setViewport(vp)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [width, height, setViewport])

  const isPanActive = activeTool === 'hand'

  const getCursor = () => {
    if (isPanActive) return isDragging ? 'grabbing' : 'grab'
    return 'default'
  }

  const startPan = (pointerX: number, pointerY: number) => {
    panStateRef.current = {
      active: true,
      startPanX: panX,
      startPanY: panY,
      startPointerX: pointerX,
      startPointerY: pointerY,
    }
    setIsDragging(true)
  }

  const movePan = useCallback(
    (pointerX: number, pointerY: number) => {
      const ps = panStateRef.current
      if (!ps.active) return
      setPan(ps.startPanX + (pointerX - ps.startPointerX), ps.startPanY + (pointerY - ps.startPointerY))
    },
    [setPan],
  )

  const endPan = () => {
    panStateRef.current.active = false
    setIsDragging(false)
  }

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const { button, clientX, clientY } = e.evt
    if (button === 1) { // middle-click
      e.evt.preventDefault()
      startPan(clientX, clientY)
    } else if (button === 0 && isPanActive) {
      startPan(clientX, clientY)
    }
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panStateRef.current.active) movePan(e.evt.clientX, e.evt.clientY)
  }

  const handleMouseUp = () => endPan()

  // FIX 6: Window-level mouseup to reset pan state on missed mouseup
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (panStateRef.current.active) {
        endPan()
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const { clientX, clientY, deltaX, deltaY, ctrlKey } = e.evt
    if (ctrlKey) {
      applyWheelZoom(clientX, clientY, deltaY)
    } else if (e.evt.deltaMode === 0) {
      // Two-finger pan (trackpad, pixel mode only — deltaMode 1/2 would be wildly off-scale)
      setPan(panX - deltaX, panY - deltaY)
    }
  }

  if (width === 0 || height === 0) return null

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        cursor: getCursor(),
        overflow: 'hidden',
      }}
    >
      <Stage
        width={width}
        height={height}
        x={panX}
        y={panY}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Layer order: bottom to top per canvas-viewport.md */}

        {/* 1. Grid (bottom) */}
        <GridLayer width={width} height={height} gridVisible={gridVisible} />

        {/* 2. Empty slot (reserved for spec numbering) */}
        <Layer listening={false} />

        {/* 3. Terrain layer */}
        <TerrainLayer width={width} height={height} />

        {/* 4. Yard boundary layer */}
        <YardBoundaryLayer width={width} height={height} />

        {/* 5. Paths layer */}
        <PathLayer width={width} height={height} />

        {/* 6. Structures layer */}
        <StructureLayer width={width} height={height} />

        {/* 7. Plants layer */}
        <PlantLayer width={width} height={height} />

        {/* 8. Labels layer */}
        <LabelLayer width={width} height={height} />

        {/* 9. Dimensions layer */}
        <DimensionLayer width={width} height={height} />

        {/* 10. Overflow dim layer — above all content, below selection UI */}
        <OverflowDimLayer width={width} height={height} />

        {/* 11. Selection interaction layer — handles, box-select, move, resize, rotate, eraser */}
        <SelectionLayer width={width} height={height} />

        {/* 12. Snap guides layer (topmost visual) */}
        <Layer listening={false}>
          <SnapGuidesLayer width={width} height={height} />
        </Layer>
      </Stage>

      {/* HTML overlays (not part of Konva stage) */}
      <YardBoundaryHTMLOverlays width={width} height={height} />
      <LabelHTMLOverlays width={width} height={height} />
      <MeasurementHTMLOverlays width={width} height={height} />
      <ScaleBar />
    </div>
  )
}
