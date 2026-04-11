/**
 * GridRenderer — Imperative renderer module for the dot grid.
 *
 * Renders a dot grid using a TilingSprite backed by a pre-rendered Canvas2D
 * pattern texture. Subscribes to viewport zoom (for minor grid threshold)
 * and project gridVisible flag via store subscriptions.
 *
 * Pattern: create(gridContainer) => { update, destroy }
 */
import { Container, TilingSprite, Texture } from 'pixi.js'
import { useViewportStore } from '../store/useViewportStore'
import { useProjectStore } from '../store/useProjectStore'
import type { RenderScheduler } from './RenderScheduler'

/** Major grid spacing in world cm. */
const GRID_MAJOR = 100
/** Minor grid spacing in world cm. */
const GRID_MINOR = 10
/** Zoom threshold below which minor dots are hidden (matches canvas-viewport.md spec). */
const MINOR_ZOOM_THRESHOLD = 1.0

interface GridRendererHandle {
  update: () => void
  destroy: () => void
}

/**
 * Create a dot pattern on an offscreen Canvas2D and return it as a PixiJS Texture.
 * The pattern tile covers one major grid cell (GRID_MAJOR x GRID_MAJOR world units).
 */
function createDotPatternTexture(showMinor: boolean): Texture {
  const size = GRID_MAJOR
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Major dot at origin of tile
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Minor dots
  if (showMinor) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.10)'
    for (let x = 0; x < size; x += GRID_MINOR) {
      for (let y = 0; y < size; y += GRID_MINOR) {
        if (x === 0 && y === 0) continue // skip major dot position
        ctx.beginPath()
        ctx.arc(x, y, 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  return Texture.from({ resource: canvas, antialias: true })
}

export function createGridRenderer(gridContainer: Container, scheduler: RenderScheduler): GridRendererHandle {
  let visible = useProjectStore.getState().currentProject?.uiState.gridVisible ?? true
  let zoom = useViewportStore.getState().zoom
  let showMinor = zoom >= MINOR_ZOOM_THRESHOLD

  // Create initial texture and tiling sprite
  let texture = createDotPatternTexture(showMinor)

  // TilingSprite needs to be large enough to cover any reasonable viewport.
  // We use a very large size in world units — the tiling handles the rest.
  const TILE_EXTENT = 200_000 // 200000 cm = 2km, more than enough
  const sprite = new TilingSprite({
    texture,
    width: TILE_EXTENT,
    height: TILE_EXTENT,
  })
  sprite.position.set(-TILE_EXTENT / 2, -TILE_EXTENT / 2)
  sprite.eventMode = 'none'
  sprite.visible = visible

  gridContainer.addChild(sprite)

  function rebuildTexture(): void {
    const newShowMinor = zoom >= MINOR_ZOOM_THRESHOLD
    if (newShowMinor !== showMinor) {
      showMinor = newShowMinor
      const oldTexture = texture
      texture = createDotPatternTexture(showMinor)
      sprite.texture = texture
      oldTexture.destroy(true)
    }
  }

  // Store subscriptions
  const unsubs: Array<() => void> = []

  unsubs.push(
    useViewportStore.subscribe((state, prevState) => {
      if (state.zoom !== prevState.zoom) {
        zoom = state.zoom
        rebuildTexture()
        scheduler.markDirty()
      }
    }),
  )

  unsubs.push(
    useProjectStore.subscribe((state, prevState) => {
      const next = state.currentProject?.uiState.gridVisible ?? true
      if (next !== (prevState.currentProject?.uiState.gridVisible ?? true)) {
        visible = next
        sprite.visible = visible
        scheduler.markDirty()
      }
    }),
  )

  return {
    update() {
      // Called before render if needed — currently a no-op since
      // reactivity is handled by store subscriptions.
    },
    destroy() {
      for (const unsub of unsubs) unsub()
      gridContainer.removeChild(sprite)
      sprite.destroy()
      texture.destroy(true)
    },
  }
}
