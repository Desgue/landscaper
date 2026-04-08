/**
 * TextureAtlas — builds GPU-ready PixiJS Textures from procedural generators.
 *
 * Call `createTextureAtlas()` once at startup. The returned object provides
 * lookup methods for terrain, plant, and structure textures, with automatic
 * fallback for unknown IDs.
 */

import { Texture } from 'pixi.js'

import { generateTerrainTexture, getKnownTerrainTypes } from './ProceduralTextures'
import { generatePlantSprite } from './PlantSprites'
import { generateStructureSprite } from './StructureSprites'
import { TILE_SIZE, FALLBACK_COLOR, MAX_STRUCTURE_TEX_DIM } from './constants'
import { useProjectStore } from '../../store/useProjectStore'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max cached plant sprites before eviction (must be >= MAX_PLANTS to avoid
 *  destroying textures still referenced by active Sprites). */
const MAX_PLANT_CACHE = 512
/** Max cached structure sprites before eviction (FIFO, not true LRU). */
const MAX_STRUCTURE_CACHE = 512

/** Texture size for tree/shrub categories (reduces extreme upscaling). */
const LARGE_PLANT_SIZE = 128
const LARGE_PLANT_CATEGORIES = new Set(['tree', 'shrub'])

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface TextureAtlas {
  /** Get the terrain tile texture for a given terrain type ID. */
  getTerrainTexture(terrainTypeId: string, neighbors?: string[]): Texture

  /** Get a plant sprite texture for a given plant type ID. Category is resolved internally. */
  getPlantSprite(plantTypeId: string): Texture

  /** Get a structure sprite texture for a given structure type ID and dimensions. */
  getStructureSprite(structureTypeId: string, widthPx?: number, heightPx?: number): Texture

  /** Get the magenta/checkerboard fallback texture. */
  getFallbackTexture(): Texture

  /** Invalidate all cached plant sprite textures, forcing regeneration on next access. */
  invalidatePlantCache(): void

  /** Invalidate all cached structure sprite textures, forcing regeneration on next access. */
  invalidateStructureCache(): void

  /** Destroy all textures and free GPU memory. */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Fallback texture generator (magenta checkerboard)
// ---------------------------------------------------------------------------

function createFallbackCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const half = size / 2
  ctx.fillStyle = FALLBACK_COLOR
  ctx.fillRect(0, 0, half, half)
  ctx.fillRect(half, half, half, half)
  ctx.fillStyle = '#000000'
  ctx.fillRect(half, 0, half, half)
  ctx.fillRect(0, half, half, half)

  return canvas
}

// ---------------------------------------------------------------------------
// Category hex color map (converts StructureRenderer numeric colors to hex for Canvas2D)
// ---------------------------------------------------------------------------

const CATEGORY_HEX_COLORS: Record<string, string> = {
  boundary: '#6b7280',
  container: '#92400e',
  surface: '#d97706',
  overhead: '#7c3aed',
  feature: '#0891b2',
  furniture: '#1d4ed8',
}

const DEFAULT_CATEGORY_HEX = '#6b7280'

// ---------------------------------------------------------------------------
// FIFO cache eviction helper
// ---------------------------------------------------------------------------

/** Evict the oldest entry (by insertion order) when cache exceeds maxSize.
 *  Note: this is FIFO eviction — entries are not re-ordered on access. */
function evictOldest(cache: Map<string, Texture>, maxSize: number): void {
  if (cache.size <= maxSize) return
  // Map iterates in insertion order — delete the first entry
  const firstKey = cache.keys().next().value
  if (firstKey !== undefined) {
    const tex = cache.get(firstKey)
    tex?.destroy(true)
    cache.delete(firstKey)
  }
}

/** Quantize a dimension to the nearest power-of-2 bucket (32, 64, 128, 256). */
function bucketDim(px: number): number {
  if (px <= 32) return 32
  if (px <= 64) return 64
  if (px <= 128) return 128
  return 256
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a TextureAtlas by pre-generating all known terrain textures
 * and lazily generating plant/structure sprites on first access.
 */
export function createTextureAtlas(): TextureAtlas {
  // Pre-generate all terrain textures
  const terrainTextures = new Map<string, Texture>()
  const knownTypes = getKnownTerrainTypes()

  for (const typeId of knownTypes) {
    const canvas = generateTerrainTexture(typeId, TILE_SIZE)
    const texture = Texture.from(canvas)
    terrainTextures.set(typeId, texture)
  }

  // Fallback texture
  const fallbackCanvas = createFallbackCanvas(TILE_SIZE)
  const fallbackTexture = Texture.from(fallbackCanvas)

  // Lazy caches for plant and structure sprites (with size caps)
  const plantTextureCache = new Map<string, Texture>()
  const structureTextureCache = new Map<string, Texture>()

  // Default sizes for generation
  const DEFAULT_PLANT_SIZE = 64
  const DEFAULT_STRUCTURE_W = 64
  const DEFAULT_STRUCTURE_H = 48

  // Plant type lookup — resolve from project store at call time
  function resolvePlantTypeObject(plantTypeId: string) {
    try {
      const { registries } = useProjectStore.getState()
      return registries.plants.find((p) => p.id === plantTypeId)
    } catch {
      return undefined
    }
  }

  // Structure type lookup — resolve from project store at call time
  function resolveStructureType(structureTypeId: string) {
    try {
      const { registries } = useProjectStore.getState()
      return registries.structures.find((s) => s.id === structureTypeId)
    } catch {
      return undefined
    }
  }

  const atlas: TextureAtlas = {
    getTerrainTexture(terrainTypeId: string, _neighbors?: string[]): Texture {
      // neighbors param reserved for Phase 5 autotiling — ignored in MVP
      const tex = terrainTextures.get(terrainTypeId)
      if (tex) return tex

      // Cache fallback for unknown IDs to avoid repeated generateTerrainTexture calls
      console.warn(
        `[TextureAtlas] Unknown terrain type "${terrainTypeId}", returning fallback`,
      )
      return fallbackTexture
    },

    getPlantSprite(plantTypeId: string): Texture {
      const cached = plantTextureCache.get(plantTypeId)
      if (cached) return cached

      const pt = resolvePlantTypeObject(plantTypeId)
      const category = pt?.category ?? 'vegetable'
      const size = LARGE_PLANT_CATEGORIES.has(category) ? LARGE_PLANT_SIZE : DEFAULT_PLANT_SIZE
      const canvas = generatePlantSprite(category, size, plantTypeId, pt)
      const texture = Texture.from(canvas)
      plantTextureCache.set(plantTypeId, texture)
      evictOldest(plantTextureCache, MAX_PLANT_CACHE)
      return texture
    },

    getStructureSprite(structureTypeId: string, widthPx?: number, heightPx?: number): Texture {
      // Clamp and bucket dimensions for cache key
      const w = Math.min(widthPx ?? DEFAULT_STRUCTURE_W, MAX_STRUCTURE_TEX_DIM)
      const h = Math.min(heightPx ?? DEFAULT_STRUCTURE_H, MAX_STRUCTURE_TEX_DIM)
      const wBucket = bucketDim(w)
      const hBucket = bucketDim(h)
      const cacheKey = `${structureTypeId}:${wBucket}x${hBucket}`

      const cached = structureTextureCache.get(cacheKey)
      if (cached) return cached

      const st = resolveStructureType(structureTypeId)
      const category = st?.category ?? ''
      const color = CATEGORY_HEX_COLORS[category] ?? DEFAULT_CATEGORY_HEX
      const canvas = generateStructureSprite(
        color, wBucket, hBucket, category, structureTypeId, st?.material ?? undefined,
      )
      const texture = Texture.from(canvas)
      structureTextureCache.set(cacheKey, texture)
      evictOldest(structureTextureCache, MAX_STRUCTURE_CACHE)
      return texture
    },

    getFallbackTexture(): Texture {
      return fallbackTexture
    },

    invalidatePlantCache(): void {
      for (const tex of plantTextureCache.values()) {
        tex.destroy(true)
      }
      plantTextureCache.clear()
    },

    invalidateStructureCache(): void {
      for (const tex of structureTextureCache.values()) {
        tex.destroy(true)
      }
      structureTextureCache.clear()
    },

    destroy(): void {
      for (const tex of terrainTextures.values()) {
        tex.destroy(true)
      }
      terrainTextures.clear()

      for (const tex of plantTextureCache.values()) {
        tex.destroy(true)
      }
      plantTextureCache.clear()

      for (const tex of structureTextureCache.values()) {
        tex.destroy(true)
      }
      structureTextureCache.clear()

      fallbackTexture.destroy(true)
    },
  }

  return atlas
}
