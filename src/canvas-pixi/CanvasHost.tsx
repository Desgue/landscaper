/**
 * CanvasHost — PixiJS v8 canvas host component for the garden planner.
 *
 * Phase 1-2 infrastructure: scene graph, viewport, pan/zoom, grid,
 * render-on-demand, resource management, terrain rendering, boundary rendering.
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
import { toWorld, fitToView } from '../canvas/viewport'
import { getAABB } from '../canvas/YardBoundaryLayer'
import { RenderScheduler } from './RenderScheduler'
import { DisposalManager } from './DisposalManager'
import { connectStore } from './connectStore'
import { createGridRenderer } from './GridRenderer'
import { createTerrainRenderer } from './TerrainRenderer'
import { createBoundaryRenderer } from './BoundaryRenderer'
import { createTextureAtlas } from './textures/TextureAtlas'

/** Feature flag — set to true to use PixiJS renderer instead of Konva. */
export const USE_PIXI = false

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
  const setCursorWorld = useCursorStore((s) => s.setCursorWorld)
  const activeTool = useToolStore((s) => s.activeTool)
  const isPanActive = activeTool === 'hand'

  // ---- Cursor ----
  const getCursor = useCallback(() => {
    if (isPanActive) return isDragging ? 'grabbing' : 'grab'
    return 'default'
  }, [isPanActive, isDragging])

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
      // Wheel zoom
      // ------------------------------------------------------------------
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const { clientX, clientY, deltaX, deltaY, ctrlKey } = e
        if (ctrlKey) {
          useViewportStore.getState().applyWheelZoom(clientX, clientY, deltaY)
        } else if (e.deltaMode === 0) {
          // Trackpad two-finger pan
          const { panX, panY } = useViewportStore.getState()
          useViewportStore.getState().setPan(panX - deltaX, panY - deltaY)
        }
      }
      app.canvas.addEventListener('wheel', onWheel, { passive: false })

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
      // Render scheduler
      // ------------------------------------------------------------------
      scheduler.start(app)

      // ------------------------------------------------------------------
      // Cleanup reference for teardown
      // ------------------------------------------------------------------
      cleanupRef.current = () => {
        scheduler.stop()
        boundaryRenderer.destroy()
        terrainRenderer.destroy()
        textureAtlas.destroy()
        gridRenderer.destroy()
        unsubViewport()
        if (cursorRafRef.current) {
          cancelAnimationFrame(cursorRafRef.current)
          cursorRafRef.current = 0
        }
        clearInterval(gcInterval)
        app.canvas.removeEventListener('wheel', onWheel)
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
  // Keyboard: Ctrl+Shift+1 for fit-to-view
  // ======================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
            fitElements.push({
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
            })
          }
        }

        const vp = fitToView(fitElements, width, height)
        useViewportStore.getState().setViewport(vp)
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
