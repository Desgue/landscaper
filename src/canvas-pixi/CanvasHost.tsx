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
import { toWorld } from '../canvas/viewport'
import { RenderScheduler } from './RenderScheduler'
import { DisposalManager } from './DisposalManager'
import { createTextureAtlas } from './textures/TextureAtlas'
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

  const [contextLost, setContextLost] = useState(false)

  // ---- Pan state ----
  const { isDragging, panStateRef, startPan, movePan, endPan } = useCanvasPan()

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

  // ---- Keyboard shortcuts ----
  useCanvasKeyboardShortcuts({ width, height, interactionManagerRef })

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
    const disposal = disposalRef.current
    const scheduler = new RenderScheduler()
    schedulerRef.current = scheduler

    const app = new Application()

    const initApp = async () => {
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

      // Guard against React 19 Strict Mode double-mount
      if (destroyed) {
        app.destroy(true)
        return
      }

      // Build canvas tokens once (reads CSS custom properties via getComputedStyle).
      // Cached here — never called per-frame.
      const tokens = buildCanvasTokens()

      // Apply token-derived background color
      app.renderer.background.color = tokens.surfaceCanvasOverflow

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

      const {
        gridContainer,
        terrainContainer,
        pathsContainer,
        elementsContainer,
        labelsContainer,
        overflowDimContainer,
        boundarySubContainer,
        interaction,
        hud,
      } = buildCanvasSceneGraph(app, world, width, height)

      interactionRef.current = interaction

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
      const zoomAnimator = createZoomAnimator()
      app.canvas.addEventListener('wheel', zoomAnimator.onWheel, { passive: false })

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
      // Texture atlas
      // ------------------------------------------------------------------
      const textureAtlas = createTextureAtlas()

      // Canvas size accessor for renderers — reads from ref so resize updates propagate
      const getCanvasSize = () => canvasSizeRef.current

      // Selection overlay renders into a dedicated sub-container of world
      // (must be in world space for correct pan/zoom transform on selection
      // boxes, handles, and snap guide lines)
      const selectionContainer = new Container()
      selectionContainer.label = 'selection'
      selectionContainer.eventMode = 'none'
      world.addChild(selectionContainer)

      // ------------------------------------------------------------------
      // All renderers
      // ------------------------------------------------------------------
      const {
        gridRenderer,
        terrainRenderer,
        boundaryRenderer,
        pathRenderer,
        plantRenderer,
        structureRenderer,
        labelRenderer,
        dimensionRenderer,
        selectionOverlay,
        rendererUpdaters,
      } = createAllRenderers(
        {
          gridContainer,
          terrainContainer,
          pathsContainer,
          elementsContainer,
          labelsContainer,
          overflowDimContainer,
          boundarySubContainer,
        },
        selectionContainer,
        scheduler,
        textureAtlas,
        getCanvasSize,
        tokens,
      )

      // Create tool handlers (framework-agnostic, no PixiJS deps)
      const terrainPaintHandler = createTerrainPaintHandler()
      const structurePlacementHandler = createStructurePlacementHandler()
      const plantPlacementHandler = createPlantPlacementHandler()
      const labelPlacementHandler = createLabelPlacementHandler()
      const measurementHandler = createMeasurementHandler()
      const pathDrawingHandler = createPathDrawingHandler()
      const boundaryHandler = createBoundaryHandler()
      useBoundaryUIStore.getState().setBoundaryHandle(boundaryHandler)

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
        useBoundaryUIStore.getState().setBoundaryHandle(null)
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
        zoomAnimator.destroy()
        clearInterval(gcInterval)
        app.canvas.removeEventListener('wheel', zoomAnimator.onWheel)
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
    // Re-run when dimensions become available (0→non-zero transition).
    // Subsequent resizes are handled cheaply by the resize useEffect below,
    // so we do NOT include raw width/height here to avoid destroying the
    // entire PixiJS scene graph on every resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSize])

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
