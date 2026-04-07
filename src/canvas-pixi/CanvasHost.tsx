/**
 * CanvasHost — PixiJS v8 canvas host component for the garden planner.
 *
 * Phase 1-3 infrastructure: scene graph, viewport, pan/zoom, grid,
 * render-on-demand, resource management, terrain/boundary/element rendering.
 * Phase 4: interaction manager, selection state machine, tool handlers.
 *
 * Drop-in replacement for CanvasRoot (same props interface).
 * Activated via USE_PIXI feature flag.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { Application, Container, Graphics, type FederatedPointerEvent } from 'pixi.js'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { useProjectStore } from '../store/useProjectStore'
import { useCursorStore } from '../store/useCursorStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { toWorld, fitToView, clampZoom } from '../canvas/viewport'
import { boundaryGetAABB as getAABB } from '../canvas/elementAABB'
import { RenderScheduler } from './RenderScheduler'
import { DisposalManager } from './DisposalManager'
import { createGridRenderer } from './GridRenderer'
import { createTerrainRenderer } from './TerrainRenderer'
import { createBoundaryRenderer } from './BoundaryRenderer'
import { createTextureAtlas } from './textures/TextureAtlas'
import { createPlantRenderer } from './PlantRenderer'
import { createStructureRenderer } from './StructureRenderer'
import { createPathRenderer } from './PathRenderer'
import { createLabelRenderer } from './LabelRenderer'
import { createDimensionRenderer } from './DimensionRenderer'
import { createSelectionOverlay } from './SelectionOverlay'
import { createInteractionManager, type InteractionManagerHandle } from './InteractionManager'
import { createTerrainPaintHandler } from './TerrainPaintHandler'
import {
  createStructurePlacementHandler,
  createPlantPlacementHandler,
  createLabelPlacementHandler,
  createMeasurementHandler,
} from './PlacementHandlers'
import { createPathDrawingHandler } from './PathDrawingHandler'
import { createBoundaryHandler } from './BoundaryHandler'
import { setPixiApp } from './exportPNG'

interface CanvasHostProps {
  width: number
  height: number
}

// ---- Texture GC interval (ms) ----
const TEXTURE_GC_INTERVAL = 60_000

export default function CanvasHost({ width, height }: CanvasHostProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const worldRef = useRef<Container | null>(null)
  const interactionRef = useRef<Container | null>(null)
  const schedulerRef = useRef<RenderScheduler | null>(null)
  const canvasSizeRef = useRef({ width, height })
  const interactionManagerRef = useRef<InteractionManagerHandle | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [contextLost, setContextLost] = useState(false)

  // ---- Pan state (same pattern as CanvasRoot) ----
  const panStateRef = useRef({
    active: false,
    startPanX: 0,
    startPanY: 0,
    startPointerX: 0,
    startPointerY: 0,
  })

  // ---- Cursor world-position tracking ----
  const cursorRafRef = useRef(0)

  // ---- Disposal tracking ----
  const disposalRef = useRef(new DisposalManager())

  // ---- Store accessors (stable refs to avoid re-render deps) ----
  const activeTool = useToolStore((s) => s.activeTool)
  const isPanActive = activeTool === 'hand'

  // ---- Cursor ----
  const getCursor = useCallback(() => {
    if (isPanActive) return isDragging ? 'grabbing' : 'grab'
    if (activeTool === 'eraser') return 'crosshair'
    if (activeTool === 'terrain') return 'crosshair'
    if (activeTool === 'path') return 'crosshair'
    if (activeTool === 'plant' || activeTool === 'structure' || activeTool === 'arc') return 'crosshair'
    if (activeTool === 'label') return 'text'
    if (activeTool === 'measurement') return 'crosshair'
    return 'default'
  }, [isPanActive, isDragging, activeTool])

  // ======================================================================
  // Application init + scene graph setup
  // ======================================================================
  useEffect(() => {
    if (width === 0 || height === 0) return
    const container = containerRef.current
    if (!container) return

    let destroyed = false
    const disposal = disposalRef.current
    const scheduler = new RenderScheduler()
    schedulerRef.current = scheduler

    const app = new Application()

    const initApp = async () => {
      await app.init({
        background: '#f5f5f0',
        width,
        height,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        autoStart: false,
        powerPreference: 'high-performance',
      })

      // Guard against React 19 Strict Mode double-mount
      if (destroyed) {
        app.destroy(true)
        return
      }

      // Stop built-in ticker — we use render-on-demand
      app.ticker.stop()

      // Texture GC: disable auto-eviction, manual run every 60s
      if (app.renderer.textureGC) {
        app.renderer.textureGC.maxIdle = Infinity
      }

      // Mount canvas element
      container.appendChild(app.canvas)
      appRef.current = app
      setPixiApp(app)

      // ------------------------------------------------------------------
      // Scene graph
      // ------------------------------------------------------------------

      // WORLD container — holds all scene content, transformed by viewport
      const world = new Container()
      world.label = 'world'
      world.eventMode = 'none'
      world.isRenderGroup = true
      worldRef.current = world
      disposal.registerContainer(world)

      // World sub-containers (bottom to top)
      const gridContainer = new Container()
      gridContainer.label = 'grid'
      gridContainer.eventMode = 'none'

      const terrainContainer = new Container()
      terrainContainer.label = 'terrain'
      terrainContainer.eventMode = 'none'

      const pathsContainer = new Container()
      pathsContainer.label = 'paths'
      pathsContainer.eventMode = 'none'

      const elementsContainer = new Container()
      elementsContainer.label = 'elements'
      elementsContainer.eventMode = 'none'
      elementsContainer.sortableChildren = true

      const labelsContainer = new Container()
      labelsContainer.label = 'labels'
      labelsContainer.eventMode = 'none'

      const overflowDimContainer = new Container()
      overflowDimContainer.label = 'overflowDim'
      overflowDimContainer.eventMode = 'none'

      world.addChild(
        gridContainer,
        terrainContainer,
        pathsContainer,
        elementsContainer,
        labelsContainer,
        overflowDimContainer,
      )

      // INTERACTION container — transparent hit area covering full stage
      const interaction = new Container()
      interaction.label = 'interaction'
      interaction.eventMode = 'static'
      interactionRef.current = interaction

      // Draw transparent full-stage hit area
      const hitArea = new Graphics()
      hitArea.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 0.001 })
      hitArea.eventMode = 'static'
      interaction.addChild(hitArea)

      // HUD container — screen-space overlays (empty for Phase 1)
      const hud = new Container()
      hud.label = 'hud'
      hud.eventMode = 'none'

      app.stage.addChild(world, interaction, hud)

      // ------------------------------------------------------------------
      // Viewport wiring: subscribe to store, apply to world container
      // ------------------------------------------------------------------
      const applyViewport = () => {
        const { panX, panY, zoom } = useViewportStore.getState()
        world.position.set(panX, panY)
        world.scale.set(zoom, zoom)
        scheduler.markDirty()
      }

      // Apply initial viewport
      applyViewport()

      const unsubViewport = useViewportStore.subscribe(applyViewport)

      // ------------------------------------------------------------------
      // Pointer events on interaction layer
      // ------------------------------------------------------------------
      const onPointerDown = (e: FederatedPointerEvent) => {
        const nativeEvent = e.nativeEvent as PointerEvent
        const button = nativeEvent.button ?? 0

        if (button === 1) {
          // Middle-click pan
          nativeEvent.preventDefault?.()
          startPan(nativeEvent.clientX, nativeEvent.clientY)
        } else if (button === 0 && useToolStore.getState().activeTool === 'hand') {
          startPan(nativeEvent.clientX, nativeEvent.clientY)
        }
      }

      const onPointerMove = (e: FederatedPointerEvent) => {
        const nativeEvent = e.nativeEvent as PointerEvent

        // Pan
        if (panStateRef.current.active) {
          movePan(nativeEvent.clientX, nativeEvent.clientY)
        }

        // Cursor world-position tracking (throttled via rAF)
        const clientX = nativeEvent.clientX
        const clientY = nativeEvent.clientY
        if (!cursorRafRef.current) {
          cursorRafRef.current = requestAnimationFrame(() => {
            cursorRafRef.current = 0
            const rect = container.getBoundingClientRect()
            const { panX, panY, zoom } = useViewportStore.getState()
            const w = toWorld(clientX - rect.left, clientY - rect.top, panX, panY, zoom)
            useCursorStore.getState().setCursorWorld(w.x, w.y)
          })
        }
      }

      const onPointerUp = () => {
        endPan()
      }

      interaction.on('pointerdown', onPointerDown)
      interaction.on('pointermove', onPointerMove)
      interaction.on('pointerup', onPointerUp)
      interaction.on('pointerupoutside', onPointerUp)

      // ------------------------------------------------------------------
      // Wheel zoom with smooth animation (lerp over ~150ms)
      // ------------------------------------------------------------------
      let zoomAnimRaf = 0
      let zoomAnimStart = 0
      let zoomAnimFrom = 1
      let zoomAnimTo = 1
      let zoomAnimCursorX = 0
      let zoomAnimCursorY = 0
      const ZOOM_ANIM_DURATION = 150

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
          const factor = deltaY < 0 ? 1.1 : 1 / 1.1
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
      app.canvas.addEventListener('wheel', onWheel, { passive: false })

      // ------------------------------------------------------------------
      // Double-click (native DOM, since PixiJS lacks native dblclick)
      // ------------------------------------------------------------------
      const onDblClick = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const { panX, panY, zoom } = useViewportStore.getState()
        const w = toWorld(screenX, screenY, panX, panY, zoom)
        // Delegate to InteractionManager for centralized dispatch
        interactionManagerRef.current?.handleDblClick(w.x, w.y)
      }
      app.canvas.addEventListener('dblclick', onDblClick)

      // ------------------------------------------------------------------
      // WebGL context loss/restore
      // ------------------------------------------------------------------
      const onContextLost = () => {
        console.warn('[CanvasHost] WebGL context lost')
        setContextLost(true)
      }

      // Renderers with Text objects need update() on context restore (v8 bug #11685).
      // The rendererUpdaters array is populated after renderer creation below.
      const rendererUpdaters: Array<() => void> = []

      const onContextRestored = () => {
        console.info('[CanvasHost] WebGL context restored')
        setContextLost(false)
        // Force re-render all Text-bearing renderers (v8 bug #11685:
        // Text objects disappear after WebGL context restore)
        for (const update of rendererUpdaters) update()
        scheduler.markDirty()
      }

      app.canvas.addEventListener('webglcontextlost', onContextLost)
      app.canvas.addEventListener('webglcontextrestored', onContextRestored)

      // ------------------------------------------------------------------
      // Texture GC manual sweep
      // ------------------------------------------------------------------
      const gcInterval = setInterval(() => {
        if (app.renderer?.textureGC) {
          app.renderer.textureGC.run()
        }
      }, TEXTURE_GC_INTERVAL)

      // ------------------------------------------------------------------
      // Grid renderer
      // ------------------------------------------------------------------
      const gridRenderer = createGridRenderer(gridContainer, scheduler)

      // ------------------------------------------------------------------
      // Texture atlas (Phase 2)
      // ------------------------------------------------------------------
      const textureAtlas = createTextureAtlas()

      // Canvas size accessor for renderers — reads from ref so resize updates propagate
      const getCanvasSize = () => canvasSizeRef.current

      // ------------------------------------------------------------------
      // Terrain renderer (Phase 2)
      // ------------------------------------------------------------------
      const terrainRenderer = createTerrainRenderer(terrainContainer, scheduler, textureAtlas, getCanvasSize)

      // ------------------------------------------------------------------
      // Boundary renderer (Phase 2)
      // ------------------------------------------------------------------
      // BoundaryRenderer draws outlines/handles into a sub-container of world,
      // and the overflow dim into the overflowDim sub-container.
      const boundarySubContainer = new Container()
      boundarySubContainer.label = 'boundary'
      boundarySubContainer.eventMode = 'none'
      // Insert boundary visuals between paths and elements layers
      const pathsIdx = world.getChildIndex(pathsContainer)
      world.addChildAt(boundarySubContainer, pathsIdx + 1)

      const boundaryRenderer = createBoundaryRenderer(
        boundarySubContainer,
        overflowDimContainer,
        scheduler,
        getCanvasSize,
      )

      // ------------------------------------------------------------------
      // Path renderer (Phase 3) — paths sub-container
      // ------------------------------------------------------------------
      const pathRenderer = createPathRenderer(pathsContainer, scheduler)

      // ------------------------------------------------------------------
      // Plant renderer (Phase 3) — elements sub-container (Y-sorted)
      // ------------------------------------------------------------------
      const plantRenderer = createPlantRenderer(elementsContainer, scheduler, textureAtlas, getCanvasSize)

      // ------------------------------------------------------------------
      // Structure renderer (Phase 3) — elements sub-container (Y-sorted)
      // ------------------------------------------------------------------
      const structureRenderer = createStructureRenderer(elementsContainer, scheduler, textureAtlas, getCanvasSize)

      // ------------------------------------------------------------------
      // Label renderer (Phase 3) — labels sub-container
      // ------------------------------------------------------------------
      const labelRenderer = createLabelRenderer(labelsContainer, scheduler)

      // ------------------------------------------------------------------
      // Dimension renderer (Phase 3) — labels sub-container
      // ------------------------------------------------------------------
      const dimensionRenderer = createDimensionRenderer(labelsContainer, scheduler)

      // Register Text-bearing renderers for context restore (v8 bug #11685)
      rendererUpdaters.push(
        () => plantRenderer.update(),
        () => structureRenderer.update(),
        () => labelRenderer.update(),
        () => dimensionRenderer.update(),
        () => boundaryRenderer.update(),
      )

      // ------------------------------------------------------------------
      // Phase 4: Selection overlay + Interaction manager + Tool handlers
      // ------------------------------------------------------------------

      // Selection overlay renders into a dedicated sub-container of world
      // (must be in world space for correct pan/zoom transform on selection
      // boxes, handles, and snap guide lines)
      const selectionContainer = new Container()
      selectionContainer.label = 'selection'
      selectionContainer.eventMode = 'none'
      world.addChild(selectionContainer)

      const selectionOverlay = createSelectionOverlay(selectionContainer, scheduler)

      // Create tool handlers (framework-agnostic, no PixiJS deps)
      const terrainPaintHandler = createTerrainPaintHandler()
      const structurePlacementHandler = createStructurePlacementHandler()
      const plantPlacementHandler = createPlantPlacementHandler()
      const labelPlacementHandler = createLabelPlacementHandler()
      const measurementHandler = createMeasurementHandler()
      const pathDrawingHandler = createPathDrawingHandler()
      const boundaryHandler = createBoundaryHandler()

      // Canvas rect accessor for coordinate conversion
      const getCanvasRect = () => container.getBoundingClientRect()

      // Central interaction manager: dispatches events to SSM or tool handlers
      const interactionManager = createInteractionManager(
        interaction,
        scheduler,
        selectionOverlay,
        {
          terrainPaint: terrainPaintHandler,
          structurePlacement: structurePlacementHandler,
          plantPlacement: plantPlacementHandler,
          labelPlacement: labelPlacementHandler,
          measurement: measurementHandler,
          pathDrawing: pathDrawingHandler,
          boundary: boundaryHandler,
        },
        getCanvasRect,
        () => panStateRef.current.active,
        container,
      )
      interactionManagerRef.current = interactionManager

      // Register selection overlay for context restore (it uses Graphics)
      rendererUpdaters.push(() => selectionOverlay.update())

      // ------------------------------------------------------------------
      // Render scheduler
      // ------------------------------------------------------------------
      scheduler.start(app)

      // ------------------------------------------------------------------
      // Cleanup reference for teardown
      // ------------------------------------------------------------------
      cleanupRef.current = () => {
        scheduler.stop()
        interactionManager.destroy()
        selectionOverlay.destroy()
        terrainPaintHandler.destroy()
        structurePlacementHandler.destroy()
        plantPlacementHandler.destroy()
        labelPlacementHandler.destroy()
        measurementHandler.destroy()
        pathDrawingHandler.destroy()
        boundaryHandler.destroy()
        interactionManagerRef.current = null
        dimensionRenderer.destroy()
        labelRenderer.destroy()
        structureRenderer.destroy()
        plantRenderer.destroy()
        pathRenderer.destroy()
        boundaryRenderer.destroy()
        terrainRenderer.destroy()
        textureAtlas.destroy()
        gridRenderer.destroy()
        unsubViewport()
        if (cursorRafRef.current) {
          cancelAnimationFrame(cursorRafRef.current)
          cursorRafRef.current = 0
        }
        if (zoomAnimRaf) {
          cancelAnimationFrame(zoomAnimRaf)
          zoomAnimRaf = 0
        }
        clearInterval(gcInterval)
        app.canvas.removeEventListener('wheel', onWheel)
        app.canvas.removeEventListener('dblclick', onDblClick)
        app.canvas.removeEventListener('webglcontextlost', onContextLost)
        app.canvas.removeEventListener('webglcontextrestored', onContextRestored)
        interaction.off('pointerdown', onPointerDown)
        interaction.off('pointermove', onPointerMove)
        interaction.off('pointerup', onPointerUp)
        interaction.off('pointerupoutside', onPointerUp)
        disposal.destroyAll()
        if (container.contains(app.canvas)) {
          container.removeChild(app.canvas)
        }
        setPixiApp(null)
        app.destroy(true)
        appRef.current = null
        worldRef.current = null
        interactionRef.current = null
      }
    }

    const cleanupRef = { current: () => {} }

    initApp().catch((err) => {
      if (!destroyed) {
        console.error('[CanvasHost] Failed to initialize PixiJS:', err)
      }
    })

    return () => {
      destroyed = true
      cleanupRef.current()
    }
    // Only re-init if width/height change to 0 and back (rare).
    // Resize is handled by ResizeObserver below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ======================================================================
  // Resize handling
  // ======================================================================
  useEffect(() => {
    const app = appRef.current
    if (!app || width === 0 || height === 0) return

    app.renderer.resize(width, height)

    // Update canvas size ref so renderers see current dimensions
    canvasSizeRef.current = { width, height }

    // Update interaction hit area
    const interaction = interactionRef.current
    if (interaction && interaction.children.length > 0) {
      const hitArea = interaction.children[0] as Graphics
      hitArea.clear()
      hitArea.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 0.001 })
    }

    schedulerRef.current?.markDirty()
  }, [width, height])

  // ======================================================================
  // Pan helpers
  // ======================================================================
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

  // ======================================================================
  // Keyboard shortcuts
  // ======================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in input fields
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'

      // Ctrl+Shift+1: fit-to-view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
        e.preventDefault()
        const project = useProjectStore.getState().currentProject
        const fitElements: Array<{
          x: number
          y: number
          width: number
          height: number
        }> = []

        if (project?.yardBoundary && project.yardBoundary.vertices.length >= 3) {
          const aabb = getAABB(project.yardBoundary)
          fitElements.push({ x: aabb.x, y: aabb.y, width: aabb.w, height: aabb.h })
        }

        if (project?.elements) {
          for (const el of project.elements) {
            const bounds = { x: el.x, y: el.y, width: el.width, height: el.height }
            if (
              Number.isFinite(bounds.x) &&
              Number.isFinite(bounds.y) &&
              Number.isFinite(bounds.width) &&
              Number.isFinite(bounds.height)
            ) {
              fitElements.push(bounds)
            }
          }
        }

        const vp = fitToView(fitElements, width, height)
        useViewportStore.getState().setViewport(vp)
        return
      }

      if (isInput) return

      // Tab: cycle through overlapping elements at last click position
      if (e.key === 'Tab' && useToolStore.getState().activeTool === 'select') {
        e.preventDefault()
        interactionManagerRef.current?.handleTabCycle()
        return
      }

      // Delete/Backspace: remove selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useSelectionStore.getState()
        if (selectedIds.size === 0) return
        const project = useProjectStore.getState().currentProject
        if (!project) return
        e.preventDefault()
        const snapshot = structuredClone(project)
        useProjectStore.getState().updateProject((draft) => {
          draft.elements = draft.elements.filter((el) => !selectedIds.has(el.id))
          for (const g of draft.groups) {
            g.elementIds = g.elementIds.filter((id) => !selectedIds.has(id))
          }
        })
        useHistoryStore.getState().pushHistory(snapshot)
        useProjectStore.getState().markDirty()
        useSelectionStore.getState().deselectAll()
        useInspectorStore.getState().setInspectedElementId(null)
        return
      }

      // Escape: exit group editing mode
      if (e.key === 'Escape') {
        const { groupEditingId } = useSelectionStore.getState()
        if (groupEditingId !== null) {
          useSelectionStore.getState().setGroupEditing(null)
          useSelectionStore.getState().deselectAll()
          useInspectorStore.getState().setInspectedElementId(null)
        }
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [width, height])

  // ======================================================================
  // Render
  // ======================================================================
  if (width === 0 || height === 0) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width,
        height,
        cursor: getCursor(),
        overflow: 'hidden',
      }}
    >
      {contextLost && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: 18,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          WebGL context lost. Attempting to restore...
        </div>
      )}
    </div>
  )
}
