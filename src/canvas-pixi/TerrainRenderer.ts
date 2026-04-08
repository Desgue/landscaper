/**
 * TerrainRenderer — Imperative PixiJS renderer for textured terrain cells.
 *
 * Phase 2 of PLAN-G. Renders terrain elements as textured Sprites grouped
 * into 10x10 chunk Containers with cacheAsTexture() for GPU batching.
 *
 * Features:
 *   - Textured terrain cells (100x100cm each) from TextureAtlas
 *   - 10x10 chunk grouping with cacheAsTexture() (v8 API)
 *   - LRU chunk pool with MAX_CHUNK_POOL=24 eviction
 *   - Dirty-chunk tracking for paint tool responsiveness
 *   - Viewport AABB culling (chunk-level)
 *   - Terrain transition blending (alpha-gradient at edges)
 *   - Layer visibility and locked-opacity
 *
 * Pattern: createTerrainRenderer(container, scheduler, atlas, canvasSize) => RendererHandle
 */

import { Container, Sprite, Graphics } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import { setupWorldObject, applyLayerState } from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { TextureAtlas } from './textures/TextureAtlas'
import type { TerrainElement, CanvasElement, Layer } from '../types/schema'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cells per chunk edge (10x10 = 100 cells per chunk). */
const CHUNK_SIZE = 10

/** Cell size in world cm. */
const CELL_SIZE = 100

/** World size of one chunk edge in cm. */
const CHUNK_WORLD_SIZE = CHUNK_SIZE * CELL_SIZE // 1000cm

/** Maximum cached chunks before LRU eviction.
 *  At 40% zoom on a 1920×1080 screen, ~35 chunks are visible.
 *  Use 64 to comfortably handle zoomed-out views without LRU thrashing. */
const MAX_CHUNK_POOL = 64

/** Alpha for terrain transition blending at cell edges. */
const TRANSITION_BLEND_ALPHA = 0.35

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChunkEntry {
  cx: number // chunk X index
  cy: number // chunk Y index
  container: Container
  /** Maps cellKey -> Sprite. Sprites are reused across renders where possible. */
  cellSprites: Map<string, Sprite>
  transitionGraphics: Graphics
  dirty: boolean
  lastUsedFrame: number
  cached: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunkKeyStr(cx: number, cy: number): string {
  return `${cx},${cy}`
}

function cellKeyStr(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`
}

function cellToChunk(cellX: number, cellY: number): { cx: number; cy: number } {
  return {
    cx: Math.floor(cellX / CHUNK_SIZE),
    cy: Math.floor(cellY / CHUNK_SIZE),
  }
}

/** Convert terrain element position to cell grid indices. */
function posToCell(x: number, y: number): { cellX: number; cellY: number } {
  return {
    cellX: Math.floor(x / CELL_SIZE),
    cellY: Math.floor(y / CELL_SIZE),
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTerrainRenderer(
  terrainContainer: Container,
  scheduler: RenderScheduler,
  atlas: TextureAtlas,
  getCanvasSize: () => { width: number; height: number },
): RendererHandle {
  const chunks = new Map<string, ChunkEntry>()
  let frameCounter = 0
  let terrainLayerVisible = true
  let terrainLayerLocked = false

  // Spatial index of terrain cells
  let terrainCells = new Map<string, TerrainElement>()

  // Water animation state: maps sprite to its base position
  const waterSpriteBasePos = new Map<Sprite, { baseX: number; baseY: number }>()
  let waterAnimTick = 0
  const WATER_ANIM_RANGE = 3 // max pixel offset range

  const waterAnimInterval = setInterval(() => {
    if (waterSpriteBasePos.size === 0) return
    waterAnimTick++
    for (const [sprite, base] of waterSpriteBasePos) {
      // Oscillating offset using sin/cos for smooth wave motion
      const offsetX = Math.sin(waterAnimTick * 0.15) * WATER_ANIM_RANGE
      const offsetY = Math.cos(waterAnimTick * 0.12) * WATER_ANIM_RANGE * 0.6
      sprite.position.set(base.baseX + offsetX, base.baseY + offsetY)
    }
    scheduler.markDirty()
  }, 100)

  // ---------------------------------------------------------------------------
  // Chunk management
  // ---------------------------------------------------------------------------

  function getOrCreateChunk(cx: number, cy: number): ChunkEntry {
    const key = chunkKeyStr(cx, cy)
    let chunk = chunks.get(key)
    if (chunk) {
      chunk.lastUsedFrame = frameCounter
      return chunk
    }

    // Evict LRU if at capacity
    if (chunks.size >= MAX_CHUNK_POOL) {
      evictLRUChunk()
    }

    const container = new Container()
    container.label = `chunk-${cx},${cy}`
    container.position.set(cx * CHUNK_WORLD_SIZE, cy * CHUNK_WORLD_SIZE)
    container.eventMode = 'none'

    const transitionGraphics = new Graphics()
    transitionGraphics.eventMode = 'none'
    setupWorldObject(transitionGraphics)

    container.addChild(transitionGraphics)
    terrainContainer.addChild(container)

    chunk = {
      cx,
      cy,
      container,
      cellSprites: new Map(),
      transitionGraphics,
      dirty: true,
      lastUsedFrame: frameCounter,
      cached: false,
    }
    chunks.set(key, chunk)
    return chunk
  }

  function evictLRUChunk(): void {
    let oldest: [string, ChunkEntry] | null = null
    let oldestFrame = Infinity

    for (const entry of chunks.entries()) {
      if (entry[1].lastUsedFrame < oldestFrame) {
        oldestFrame = entry[1].lastUsedFrame
        oldest = entry
      }
    }

    if (oldest) {
      destroyChunk(oldest[0], oldest[1])
    }
  }

  function destroyChunk(key: string, chunk: ChunkEntry): void {
    // Uncache before destroy
    if (chunk.cached) {
      try {
        (chunk.container as unknown as { cacheAsTexture: (v: boolean) => void }).cacheAsTexture(false)
      } catch { /* ignore */ }
    }

    // Destroy individual sprites with { texture: false } — atlas owns textures
    for (const sprite of chunk.cellSprites.values()) {
      waterSpriteBasePos.delete(sprite)
      sprite.destroy({ texture: false })
    }
    chunk.cellSprites.clear()

    chunk.transitionGraphics.destroy()

    terrainContainer.removeChild(chunk.container)
    // Container children already destroyed above; use { children: false }
    chunk.container.destroy({ children: false })
    chunks.delete(key)
  }

  // ---------------------------------------------------------------------------
  // Viewport bounds helper
  // ---------------------------------------------------------------------------

  function getViewportWorldBounds(): {
    worldLeft: number; worldTop: number; worldRight: number; worldBottom: number
  } {
    const { panX, panY, zoom } = useViewportStore.getState()
    const { width: viewW, height: viewH } = getCanvasSize()
    return {
      worldLeft: -panX / zoom,
      worldTop: -panY / zoom,
      worldRight: (-panX + viewW) / zoom,
      worldBottom: (-panY + viewH) / zoom,
    }
  }

  function isChunkInViewport(cx: number, cy: number): boolean {
    const { worldLeft, worldTop, worldRight, worldBottom } = getViewportWorldBounds()
    const margin = CHUNK_WORLD_SIZE
    const chunkLeft = cx * CHUNK_WORLD_SIZE
    const chunkTop = cy * CHUNK_WORLD_SIZE
    const chunkRight = chunkLeft + CHUNK_WORLD_SIZE
    const chunkBottom = chunkTop + CHUNK_WORLD_SIZE

    return (
      chunkRight >= worldLeft - margin &&
      chunkLeft <= worldRight + margin &&
      chunkBottom >= worldTop - margin &&
      chunkTop <= worldBottom + margin
    )
  }

  // ---------------------------------------------------------------------------
  // Cell rendering
  // ---------------------------------------------------------------------------

  function renderChunk(chunk: ChunkEntry): void {
    if (!chunk.dirty) return

    const { cx, cy } = chunk
    const startCellX = cx * CHUNK_SIZE
    const startCellY = cy * CHUNK_SIZE

    // Build set of current cell keys in this chunk
    const currentCellKeys = new Set<string>()
    for (let dx = 0; dx < CHUNK_SIZE; dx++) {
      for (let dy = 0; dy < CHUNK_SIZE; dy++) {
        const cellKey = cellKeyStr(startCellX + dx, startCellY + dy)
        if (terrainCells.has(cellKey)) {
          currentCellKeys.add(cellKey)
        }
      }
    }

    // Remove sprites for cells that no longer exist
    for (const [cellKey, sprite] of chunk.cellSprites) {
      if (!currentCellKeys.has(cellKey)) {
        waterSpriteBasePos.delete(sprite)
        chunk.container.removeChild(sprite)
        sprite.destroy({ texture: false })
        chunk.cellSprites.delete(cellKey)
      }
    }

    // Add/update sprites for current cells
    for (let dx = 0; dx < CHUNK_SIZE; dx++) {
      for (let dy = 0; dy < CHUNK_SIZE; dy++) {
        const cellX = startCellX + dx
        const cellY = startCellY + dy
        const cellKey = cellKeyStr(cellX, cellY)
        const cell = terrainCells.get(cellKey)
        if (!cell) continue

        const texture = atlas.getTerrainTexture(cell.terrainTypeId)
        const existing = chunk.cellSprites.get(cellKey)

        if (existing) {
          // Reuse sprite — just update texture if changed
          if (existing.texture !== texture) {
            existing.texture = texture
          }
          // Track/untrack water sprites
          if (cell.terrainTypeId === 'water') {
            if (!waterSpriteBasePos.has(existing)) {
              waterSpriteBasePos.set(existing, { baseX: dx * CELL_SIZE, baseY: dy * CELL_SIZE })
            }
          } else {
            waterSpriteBasePos.delete(existing)
          }
        } else {
          // Create new sprite
          const sprite = new Sprite(texture)
          const baseX = dx * CELL_SIZE
          const baseY = dy * CELL_SIZE
          sprite.position.set(baseX, baseY)
          sprite.width = CELL_SIZE
          sprite.height = CELL_SIZE
          setupWorldObject(sprite)

          // Track water sprites for animation
          if (cell.terrainTypeId === 'water') {
            waterSpriteBasePos.set(sprite, { baseX, baseY })
          }

          chunk.container.addChild(sprite)
          chunk.cellSprites.set(cellKey, sprite)
        }
      }
    }

    // Render transition blending
    renderTransitions(chunk, startCellX, startCellY)

    // Update cache
    if (chunk.cached) {
      try {
        (chunk.container as unknown as { updateCacheTexture: () => void }).updateCacheTexture()
      } catch { /* ignore if not supported */ }
    } else if (chunk.cellSprites.size > 0) {
      try {
        (chunk.container as unknown as { cacheAsTexture: (opts: { resolution: number }) => void })
          .cacheAsTexture({ resolution: window.devicePixelRatio || 1 })
        chunk.cached = true
      } catch { /* cacheAsTexture may not be available in all environments */ }
    }

    chunk.dirty = false
  }

  /**
   * Render terrain transition blending at cell edges.
   * When cell A borders a different terrain type cell B, render a semi-transparent
   * darkening strip at the transition edge to soften the boundary.
   */
  function renderTransitions(
    chunk: ChunkEntry,
    startCellX: number,
    startCellY: number,
  ): void {
    const g = chunk.transitionGraphics
    g.clear()

    const blendWidth = CELL_SIZE * 0.15

    for (let dx = 0; dx < CHUNK_SIZE; dx++) {
      for (let dy = 0; dy < CHUNK_SIZE; dy++) {
        const cellX = startCellX + dx
        const cellY = startCellY + dy
        const cellKey = cellKeyStr(cellX, cellY)
        const cell = terrainCells.get(cellKey)
        if (!cell) continue

        const localX = dx * CELL_SIZE
        const localY = dy * CELL_SIZE

        const neighbors = [
          { nx: cellX - 1, ny: cellY, edge: 'left' as const },
          { nx: cellX + 1, ny: cellY, edge: 'right' as const },
          { nx: cellX, ny: cellY - 1, edge: 'top' as const },
          { nx: cellX, ny: cellY + 1, edge: 'bottom' as const },
        ]

        for (const { nx, ny, edge } of neighbors) {
          const neighborKey = cellKeyStr(nx, ny)
          const neighbor = terrainCells.get(neighborKey)
          if (!neighbor || neighbor.terrainTypeId === cell.terrainTypeId) continue

          let rx: number, ry: number, rw: number, rh: number
          switch (edge) {
            case 'left':
              rx = localX; ry = localY; rw = blendWidth; rh = CELL_SIZE; break
            case 'right':
              rx = localX + CELL_SIZE - blendWidth; ry = localY; rw = blendWidth; rh = CELL_SIZE; break
            case 'top':
              rx = localX; ry = localY; rw = CELL_SIZE; rh = blendWidth; break
            case 'bottom':
              rx = localX; ry = localY + CELL_SIZE - blendWidth; rw = CELL_SIZE; rh = blendWidth; break
          }

          g.rect(rx, ry, rw, rh)
            .fill({ color: 0x000000, alpha: TRANSITION_BLEND_ALPHA * 0.3 })
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Viewport culling
  // ---------------------------------------------------------------------------

  function updateChunkVisibility(): void {
    for (const chunk of chunks.values()) {
      chunk.container.visible = isChunkInViewport(chunk.cx, chunk.cy) && terrainLayerVisible
    }
  }

  // ---------------------------------------------------------------------------
  // Full rebuild
  // ---------------------------------------------------------------------------

  function rebuildFromStore(): void {
    const project = useProjectStore.getState().currentProject
    if (!project) return

    // Build cell index
    terrainCells.clear()
    for (const el of project.elements) {
      if (el.type !== 'terrain') continue
      if (!Number.isFinite(el.x) || !Number.isFinite(el.y)) continue
      const { cellX, cellY } = posToCell(el.x, el.y)
      terrainCells.set(cellKeyStr(cellX, cellY), el as TerrainElement)
    }

    resolveTerrainLayerState(project.elements, project.layers)

    // Determine which chunks are needed
    const neededChunks = new Set<string>()
    for (const cell of terrainCells.values()) {
      const { cellX, cellY } = posToCell(cell.x, cell.y)
      const { cx, cy } = cellToChunk(cellX, cellY)
      neededChunks.add(chunkKeyStr(cx, cy))
    }

    // Remove chunks that are no longer needed
    for (const [key, chunk] of chunks) {
      if (!neededChunks.has(key)) {
        destroyChunk(key, chunk)
      }
    }

    // Only create/render chunks within viewport (prevent unbounded GPU uploads)
    frameCounter++
    for (const key of neededChunks) {
      const parts = key.split(',')
      const cx = parseInt(parts[0], 10)
      const cy = parseInt(parts[1], 10)

      if (!isChunkInViewport(cx, cy) && chunks.size >= MAX_CHUNK_POOL) {
        continue // skip off-screen chunks when pool is full
      }

      const chunk = getOrCreateChunk(cx, cy)
      chunk.dirty = true
      renderChunk(chunk)
    }

    applyLayerState(terrainContainer, terrainLayerVisible, terrainLayerLocked)
    updateChunkVisibility()
    scheduler.markDirty()
  }

  function resolveTerrainLayerState(
    elements: CanvasElement[],
    layers: Layer[],
  ): void {
    const firstTerrain = elements.find((el) => el.type === 'terrain')
    if (firstTerrain) {
      const layer = layers.find((l) => l.id === firstTerrain.layerId)
      if (layer) {
        terrainLayerVisible = layer.visible
        terrainLayerLocked = layer.locked
        return
      }
    }
    terrainLayerVisible = true
    terrainLayerLocked = false
  }

  /**
   * Handle incremental terrain cell changes (paint/erase).
   * Only re-renders the affected chunk(s) instead of full rebuild.
   */
  function handleTerrainChange(): void {
    const project = useProjectStore.getState().currentProject
    if (!project) return

    const oldCells = terrainCells
    terrainCells = new Map()
    for (const el of project.elements) {
      if (el.type !== 'terrain') continue
      if (!Number.isFinite(el.x) || !Number.isFinite(el.y)) continue
      const { cellX, cellY } = posToCell(el.x, el.y)
      terrainCells.set(cellKeyStr(cellX, cellY), el as TerrainElement)
    }

    // Find which chunks changed
    const dirtyChunkKeys = new Set<string>()

    for (const [cellKey, cell] of terrainCells) {
      const oldCell = oldCells.get(cellKey)
      if (!oldCell || oldCell.terrainTypeId !== cell.terrainTypeId) {
        const { cellX, cellY } = posToCell(cell.x, cell.y)
        const { cx, cy } = cellToChunk(cellX, cellY)
        dirtyChunkKeys.add(chunkKeyStr(cx, cy))
      }
    }

    for (const [cellKey, cell] of oldCells) {
      if (!terrainCells.has(cellKey)) {
        const { cellX, cellY } = posToCell(cell.x, cell.y)
        const { cx, cy } = cellToChunk(cellX, cellY)
        dirtyChunkKeys.add(chunkKeyStr(cx, cy))
      }
    }

    if (dirtyChunkKeys.size === 0) return

    resolveTerrainLayerState(project.elements, project.layers)

    frameCounter++
    for (const key of dirtyChunkKeys) {
      const parts = key.split(',')
      const cx = parseInt(parts[0], 10)
      const cy = parseInt(parts[1], 10)
      const chunk = getOrCreateChunk(cx, cy)
      chunk.dirty = true
      renderChunk(chunk)
    }

    // Remove empty chunks
    for (const [key, chunk] of chunks) {
      if (chunk.cellSprites.size === 0) {
        destroyChunk(key, chunk)
      }
    }

    applyLayerState(terrainContainer, terrainLayerVisible, terrainLayerLocked)
    updateChunkVisibility()
    scheduler.markDirty()
  }

  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------

  const unsubs: Array<() => void> = []

  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.elements,
      () => handleTerrainChange(),
    ),
  )

  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.layers,
      () => {
        const project = useProjectStore.getState().currentProject
        if (!project) return
        resolveTerrainLayerState(project.elements, project.layers)
        applyLayerState(terrainContainer, terrainLayerVisible, terrainLayerLocked)
        scheduler.markDirty()
      },
    ),
  )

  unsubs.push(
    connectStore(
      useViewportStore,
      (s) => `${s.panX},${s.panY},${s.zoom}`,
      () => {
        updateChunkVisibility()
        scheduler.markDirty()
      },
    ),
  )

  // Initial build
  rebuildFromStore()

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  return {
    update() {
      // Reactivity handled by store subscriptions
    },
    destroy() {
      clearInterval(waterAnimInterval)
      waterSpriteBasePos.clear()
      for (const unsub of unsubs) unsub()
      for (const [key, chunk] of chunks) {
        destroyChunk(key, chunk)
      }
      chunks.clear()
      terrainCells.clear()
    },
  }
}
