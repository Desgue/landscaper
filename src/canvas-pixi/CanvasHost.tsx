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
import { Application, Container, type FederatedPointerEvent } from 'pixi.js'
import { useViewportStore } from '../store/useViewportStore'
import { useToolStore } from '../store/useToolStore'
import { useCursorStore } from '../store/useCursorStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { usePlacementFeedbackStore } from '../store/usePlacementFeedbackStore'
import {
  useMeasurementStore,
  useLabelToolStore,
  useStructureToolStore,
  usePlantToolStore,
  usePathToolStore,
  useTerrainPaintStore,
} from '../canvas/toolStores'
import { toWorld } from '../canvas/viewport'
import { RenderScheduler } from './RenderScheduler'
import { createTextureAtlas } from './textures/TextureAtlas'
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
import { useBoundaryUIStore } from '../store/useBoundaryUIStore'
import { setPixiApp } from './exportPNG'
import { buildCanvasTokens } from '../tokens/canvasTokens'
import { useCanvasPan } from './useCanvasPan'
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts'
import { createZoomAnimator } from './createZoomAnimator'
import { buildCanvasSceneGraph } from './buildCanvasSceneGraph'
import { createAllRenderers } from './createAllRenderers'
import type { CanvasContext } from './CanvasContext'

interface CanvasHostProps {
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// CanvasContext factory
// ---------------------------------------------------------------------------

/**
 * Creates a CanvasContext by delegating each method to the appropriate
 * Zustand store. Constructed inside initApp and passed to handlers in
 * Phase 2-4 of the CanvasContext migration.
 */
function createCanvasContext(): CanvasContext {
  return {
    // ---- Project reads -----------------------------------------------------
    getProject() {
      return useProjectStore.getState().currentProject
    },
    getRegistries() {
      return useProjectStore.getState().registries
    },

    // ---- Project writes ----------------------------------------------------
    applyLiveUpdate(actionName, updater) {
      useProjectStore.getState().updateProject(actionName, updater)
    },
    pushDragHistory(snapshot) {
      useHistoryStore.getState().pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },

    // ---- Viewport ----------------------------------------------------------
    getZoom() {
      return useViewportStore.getState().zoom
    },
    getPan() {
      const { panX, panY } = useViewportStore.getState()
      return { panX, panY }
    },

    // ---- Tool state --------------------------------------------------------
    getToolState() {
      const { activeTool, previousTool } = useToolStore.getState()
      const { selectedStructureTypeId } = useStructureToolStore.getState()
      const { selectedPlantTypeId } = usePlantToolStore.getState()
      const { selectedPathTypeId } = usePathToolStore.getState()
      const { selectedTerrainTypeId, brushSize } = useTerrainPaintStore.getState()
      const { editingLabelId } = useLabelToolStore.getState()
      return {
        activeTool,
        previousTool,
        selectedStructureTypeId,
        selectedPlantTypeId,
        selectedPathTypeId,
        selectedTerrainTypeId,
        brushSize,
        editingLabelId,
      }
    },
    setLabelEditing(id) {
      useLabelToolStore.getState().setEditing(id)
    },

    // ---- Selection ---------------------------------------------------------
    getSelectionState() {
      const { selectedIds, primaryId, groupEditingId, lastClickWorldPos, tabCycleIndex } =
        useSelectionStore.getState()
      return { selectedIds: new Set(selectedIds), primaryId, groupEditingId, lastClickWorldPos, tabCycleIndex }
    },
    select(id) {
      useSelectionStore.getState().select(id)
    },
    selectMultiple(ids) {
      useSelectionStore.getState().selectMultiple(ids)
    },
    toggleSelect(id) {
      useSelectionStore.getState().toggleSelect(id)
    },
    deselectAll() {
      useSelectionStore.getState().deselectAll()
    },
    setGroupEditing(groupId) {
      useSelectionStore.getState().setGroupEditing(groupId)
    },
    setLastClickWorldPos(pos) {
      useSelectionStore.getState().setLastClickWorldPos(pos)
    },
    setTabCycleIndex(index) {
      useSelectionStore.getState().setTabCycleIndex(index)
    },

    // ---- Inspector ---------------------------------------------------------
    setInspectedElement(id) {
      useInspectorStore.getState().setInspectedElementId(id)
    },

    // ---- Placement feedback ------------------------------------------------
    showPlacementFeedback(msg) {
      usePlacementFeedbackStore.getState().showFeedback(msg)
    },

    // ---- Boundary UI -------------------------------------------------------
    setBoundaryPlacementState(state) {
      useBoundaryUIStore.getState().setPlacementState(state)
    },
    setBoundaryEditingEdge(edgeIndex) {
      useBoundaryUIStore.getState().setEditingEdgeIndex(edgeIndex)
    },

    // ---- Measurement UI ----------------------------------------------------
    getMeasurementState() {
      const { phase, startPoint, endPoint, livePoint } = useMeasurementStore.getState()
      return { phase, startPoint, endPoint, livePoint }
    },
    setMeasurementState(update) {
      useMeasurementStore.setState(update)
    },
  }
}

// ---- Texture GC interval (ms) ----
const TEXTURE_GC_INTERVAL = 60_000

// ---------------------------------------------------------------------------
// initApp setup helpers
// ---------------------------------------------------------------------------

/** Initialise the PixiJS Application, mount its canvas, and return design tokens. */
async function setupPixiApp(
  app: Application,
  container: HTMLDivElement,
  width: number,
  height: number,
) {
  await app.init({
    background: 0x000000, // overridden by tokens below
    width,
    height,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    autoStart: false,
    powerPreference: 'high-performance',
  })

  const tokens = buildCanvasTokens()

  app.renderer.background.color = tokens.surfaceCanvasOverflow

  // Stop built-in ticker — we use render-on-demand
  app.ticker.stop()

  // Texture GC: disable auto-eviction, manual run every 60s
  if (app.renderer.textureGC) {
    app.renderer.textureGC.maxIdle = Infinity
  }

  container.appendChild(app.canvas)
  setPixiApp(app)

  return { tokens }
}

/** Subscribe the world container to the viewport store and return cleanup. */
function setupViewportWiring(
  world: Container,
  scheduler: RenderScheduler,
): () => void {
  const applyViewport = () => {
    const { panX, panY, zoom } = useViewportStore.getState()
    world.position.set(panX, panY)
    world.scale.set(zoom, zoom)
    scheduler.markDirty()
  }

  applyViewport()
  return useViewportStore.subscribe(applyViewport)
}

interface PointerEventHandles {
  onPointerDown: (e: FederatedPointerEvent) => void
  onPointerMove: (e: FederatedPointerEvent) => void
  onPointerUp: () => void
  zoomAnimator: ReturnType<typeof createZoomAnimator>
  onDblClick: (e: MouseEvent) => void
}

/** Wire pointer events on the interaction layer and DOM canvas. Returns handles needed for cleanup. */
function setupPointerEvents(
  app: Application,
  interaction: Container,
  container: HTMLDivElement,
  cursorRafRef: React.MutableRefObject<number>,
  interactionManagerRef: React.MutableRefObject<InteractionManagerHandle | null>,
  panStateRef: React.MutableRefObject<{ active: boolean }>,
  startPan: (x: number, y: number) => void,
  movePan: (x: number, y: number) => void,
  endPan: () => void,
): PointerEventHandles {
  const onPointerDown = (e: FederatedPointerEvent) => {
    const nativeEvent = e.nativeEvent as PointerEvent
    const button = nativeEvent.button ?? 0

    if (button === 1) {
      nativeEvent.preventDefault?.()
      startPan(nativeEvent.clientX, nativeEvent.clientY)
    } else if (button === 0 && useToolStore.getState().activeTool === 'hand') {
      startPan(nativeEvent.clientX, nativeEvent.clientY)
    }
  }

  const onPointerMove = (e: FederatedPointerEvent) => {
    const nativeEvent = e.nativeEvent as PointerEvent

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

  // Wheel zoom
  const zoomAnimator = createZoomAnimator()
  app.canvas.addEventListener('wheel', zoomAnimator.onWheel, { passive: false })

  // Double-click (native DOM, since PixiJS lacks native dblclick)
  const onDblClick = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const { panX, panY, zoom } = useViewportStore.getState()
    const w = toWorld(screenX, screenY, panX, panY, zoom)
    interactionManagerRef.current?.handleDblClick(w.x, w.y)
  }
  app.canvas.addEventListener('dblclick', onDblClick)

  return { onPointerDown, onPointerMove, onPointerUp, zoomAnimator, onDblClick }
}

/** Register WebGL context-loss/restore listeners. Returns a cleanup function. */
function setupContextLossHandlers(
  app: Application,
  scheduler: RenderScheduler,
  setContextLost: (lost: boolean) => void,
  rendererUpdaters: Array<() => void>,
): () => void {
  const onContextLost = () => {
    console.warn('[CanvasHost] WebGL context lost')
    setContextLost(true)
  }

  const onContextRestored = () => {
    console.info('[CanvasHost] WebGL context restored')
    setContextLost(false)
    for (const update of rendererUpdaters) update()
    scheduler.markDirty()
  }

  app.canvas.addEventListener('webglcontextlost', onContextLost)
  app.canvas.addEventListener('webglcontextrestored', onContextRestored)

  return () => {
    app.canvas.removeEventListener('webglcontextlost', onContextLost)
    app.canvas.removeEventListener('webglcontextrestored', onContextRestored)
  }
}

/** Start the texture-GC interval and create the texture atlas. Returns cleanup function and atlas. */
function setupTextureResources(app: Application) {
  const gcInterval = setInterval(() => {
    if (app.renderer?.textureGC) {
      app.renderer.textureGC.run()
    }
  }, TEXTURE_GC_INTERVAL)

  const textureAtlas = createTextureAtlas()

  const destroy = () => {
    clearInterval(gcInterval)
    textureAtlas.destroy()
  }

  return { textureAtlas, destroy }
}

/** Construct all tool handlers and register the boundary handle with its store. */
function setupToolHandlers(canvasContext: CanvasContext) {
  const terrainPaintHandler = createTerrainPaintHandler(canvasContext)
  const structurePlacementHandler = createStructurePlacementHandler(canvasContext)
  const plantPlacementHandler = createPlantPlacementHandler(canvasContext)
  const labelPlacementHandler = createLabelPlacementHandler(canvasContext)
  const measurementHandler = createMeasurementHandler(canvasContext)
  const pathDrawingHandler = createPathDrawingHandler(canvasContext)
  const boundaryHandler = createBoundaryHandler(canvasContext)
  useBoundaryUIStore.getState().setBoundaryHandle(boundaryHandler)

  const destroy = () => {
    terrainPaintHandler.destroy()
    structurePlacementHandler.destroy()
    plantPlacementHandler.destroy()
    labelPlacementHandler.destroy()
    measurementHandler.destroy()
    pathDrawingHandler.destroy()
    useBoundaryUIStore.getState().setBoundaryHandle(null)
    boundaryHandler.destroy()
  }

  return {
    terrainPaintHandler,
    structurePlacementHandler,
    plantPlacementHandler,
    labelPlacementHandler,
    measurementHandler,
    pathDrawingHandler,
    boundaryHandler,
    destroy,
  }
}

/** Create the interaction manager and wire store subscriptions. Returns cleanup and the manager handle. */
function setupInteractionManager(
  interaction: Container,
  scheduler: RenderScheduler,
  selectionOverlay: ReturnType<typeof createSelectionOverlay>,
  toolHandlers: ReturnType<typeof setupToolHandlers>,
  container: HTMLDivElement,
  panStateRef: React.MutableRefObject<{ active: boolean }>,
  canvasContext: CanvasContext,
  interactionManagerRef: React.MutableRefObject<InteractionManagerHandle | null>,
) {
  const {
    terrainPaintHandler,
    structurePlacementHandler,
    plantPlacementHandler,
    labelPlacementHandler,
    measurementHandler,
    pathDrawingHandler,
    boundaryHandler,
  } = toolHandlers

  const getCanvasRect = () => container.getBoundingClientRect()

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
    canvasContext,
    container,
  )
  interactionManagerRef.current = interactionManager

  // Sync inspector with selection primary change
  const unsubInspector = useSelectionStore.subscribe((state, prevState) => {
    if (state.primaryId !== prevState.primaryId) {
      interactionManager.onSelectionPrimaryChange(state.primaryId)
    }
  })

  // Reset SSM + path drawing state on tool change
  const unsubTool = useToolStore.subscribe((state, prevState) => {
    const newTool = state.activeTool
    const oldTool = prevState.activeTool
    if (newTool !== oldTool) {
      interactionManager.onToolChange(newTool, oldTool)
      pathDrawingHandler.onToolChange(newTool, oldTool)
    }
  })

  const destroy = () => {
    interactionManager.destroy()
    unsubInspector()
    unsubTool()
    interactionManagerRef.current = null
  }

  return { interactionManager, destroy }
}

export default function CanvasHost({ width, height }: CanvasHostProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const interactionRef = useRef<Container | null>(null)
  const schedulerRef = useRef<RenderScheduler | null>(null)
  const canvasSizeRef = useRef({ width, height })
  const interactionManagerRef = useRef<InteractionManagerHandle | null>(null)

  const [contextLost, setContextLost] = useState(false)

  const { isDragging, panStateRef, startPan, movePan, endPan } = useCanvasPan()

  // ---- Cursor world-position tracking ----
  const cursorRafRef = useRef(0)

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

  // ---- Keyboard shortcuts ----
  useCanvasKeyboardShortcuts(width, height, interactionManagerRef)

  // Coerce to boolean so the init effect only re-runs on 0↔non-zero
  // transitions, not on every pixel resize.
  const hasSize = width > 0 && height > 0

  // ======================================================================
  // Application init + scene graph setup
  // ======================================================================
  useEffect(() => {
    if (!hasSize) return
    const container = containerRef.current
    if (!container) return

    let destroyed = false
    const scheduler = new RenderScheduler()
    schedulerRef.current = scheduler

    const app = new Application()

    const initApp = async () => {
      // ------------------------------------------------------------------
      // PixiJS application init
      // ------------------------------------------------------------------
      const { tokens } = await setupPixiApp(app, container, width, height)

      // Guard against React 19 Strict Mode double-mount
      if (destroyed) {
        app.destroy(true)
        return
      }

      appRef.current = app

      // ------------------------------------------------------------------
      // Scene graph
      // ------------------------------------------------------------------
      const {
        world,
        gridContainer,
        terrainContainer,
        pathsContainer,
        elementsContainer,
        labelsContainer,
        overflowDimContainer,
        interaction,
      } = buildCanvasSceneGraph(app, width, height)

      interactionRef.current = interaction

      // ------------------------------------------------------------------
      // Viewport wiring
      // ------------------------------------------------------------------
      const unsubViewport = setupViewportWiring(world, scheduler)

      // ------------------------------------------------------------------
      // Pointer events (interaction layer + DOM canvas)
      // ------------------------------------------------------------------
      const pointerHandles = setupPointerEvents(
        app,
        interaction,
        container,
        cursorRafRef,
        interactionManagerRef,
        panStateRef,
        startPan,
        movePan,
        endPan,
      )

      // ------------------------------------------------------------------
      // WebGL context loss / restore
      // ------------------------------------------------------------------
      // rendererUpdaters is populated after renderers and overlay are created
      const rendererUpdaters: Array<() => void> = []
      const cleanupContextHandlers = setupContextLossHandlers(
        app,
        scheduler,
        setContextLost,
        rendererUpdaters,
      )

      // ------------------------------------------------------------------
      // Texture GC interval + atlas
      // ------------------------------------------------------------------
      const { textureAtlas, destroy: destroyTextureResources } = setupTextureResources(app)

      const getCanvasSize = () => canvasSizeRef.current

      // ------------------------------------------------------------------
      // All renderers
      // ------------------------------------------------------------------
      const renderers = createAllRenderers({
        world,
        gridContainer,
        terrainContainer,
        pathsContainer,
        elementsContainer,
        labelsContainer,
        overflowDimContainer,
        scheduler,
        textureAtlas,
        getCanvasSize,
        tokens,
      })

      rendererUpdaters.push(...renderers.textRendererUpdaters)

      // ------------------------------------------------------------------
      // Phase 4: Selection overlay + Canvas context
      // ------------------------------------------------------------------
      const canvasContext = createCanvasContext()

      const selectionContainer = new Container()
      selectionContainer.label = 'selection'
      selectionContainer.eventMode = 'none'
      world.addChild(selectionContainer)

      const selectionOverlay = createSelectionOverlay(selectionContainer, scheduler)
      rendererUpdaters.push(() => selectionOverlay.update())

      // ------------------------------------------------------------------
      // Tool handlers
      // ------------------------------------------------------------------
      const toolHandlers = setupToolHandlers(canvasContext)

      // ------------------------------------------------------------------
      // Interaction manager + store subscriptions
      // ------------------------------------------------------------------
      const { destroy: destroyInteractionManager } = setupInteractionManager(
        interaction,
        scheduler,
        selectionOverlay,
        toolHandlers,
        container,
        panStateRef,
        canvasContext,
        interactionManagerRef,
      )

      // ------------------------------------------------------------------
      // Render scheduler start
      // ------------------------------------------------------------------
      scheduler.start(app)

      // ------------------------------------------------------------------
      // Cleanup orchestration
      // ------------------------------------------------------------------
      cleanupRef.current = () => {
        scheduler.stop()
        destroyInteractionManager()
        selectionOverlay.destroy()
        toolHandlers.destroy()
        renderers.dimensionRenderer.destroy()
        renderers.labelRenderer.destroy()
        renderers.structureRenderer.destroy()
        renderers.plantRenderer.destroy()
        renderers.pathRenderer.destroy()
        renderers.boundaryRenderer.destroy()
        renderers.terrainRenderer.destroy()
        renderers.gridRenderer.destroy()
        destroyTextureResources()
        unsubViewport()
        if (cursorRafRef.current) {
          cancelAnimationFrame(cursorRafRef.current)
          cursorRafRef.current = 0
        }
        const { zoomAnimator, onPointerDown, onPointerMove, onPointerUp, onDblClick } = pointerHandles
        zoomAnimator.destroy()
        app.canvas.removeEventListener('wheel', zoomAnimator.onWheel)
        app.canvas.removeEventListener('dblclick', onDblClick)
        cleanupContextHandlers()
        interaction.off('pointerdown', onPointerDown)
        interaction.off('pointermove', onPointerMove)
        interaction.off('pointerup', onPointerUp)
        interaction.off('pointerupoutside', onPointerUp)
        world.destroy({ children: true })
        if (container.contains(app.canvas)) {
          container.removeChild(app.canvas)
        }
        setPixiApp(null)
        app.destroy(true)
        appRef.current = null
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSize])

  // ======================================================================
  // Resize handling
  // ======================================================================
  useEffect(() => {
    const app = appRef.current
    if (!app || width === 0 || height === 0) return

    app.renderer.resize(width, height)

    canvasSizeRef.current = { width, height }

    const interaction = interactionRef.current
    if (interaction && interaction.children.length > 0) {
      const hitArea = interaction.children[0] as import('pixi.js').Graphics
      hitArea.clear()
      hitArea.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 0.001 })
    }

    schedulerRef.current?.markDirty()
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
