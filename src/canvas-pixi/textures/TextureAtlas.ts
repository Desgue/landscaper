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
import { TILE_SIZE, FALLBACK_COLOR } from './constants'
import { useProjectStore } from '../../store/useProjectStore'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max cached plant sprites before eviction (must be >= MAX_PLANTS to avoid
 *  destroying textures still referenced by active Sprites). */
const MAX_PLANT_CACHE = 512
/** Max cached structure sprites before eviction. */
const MAX_STRUCTURE_CACHE = 256

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface TextureAtlas {
  /** Get the terrain tile texture for a given terrain type ID. */
  getTerrainTexture(terrainTypeId: string, neighbors?: string[]): Texture

  /** Get a plant sprite texture for a given plant type ID. Category is resolved internally. */
  getPlantSprite(plantTypeId: string): Texture

  /** Get a structure sprite texture for a given structure type ID. */
  getStructureSprite(structureTypeId: string): Texture

  /** Get the magenta/checkerboard fallback texture. */
  getFallbackTexture(): Texture

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
// LRU cache helper
// ---------------------------------------------------------------------------

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

  // Default sizes for placeholder generation
  const DEFAULT_STRUCTURE_COLOR = '#888888'
  const DEFAULT_STRUCTURE_W = 64
  const DEFAULT_STRUCTURE_H = 48
  const DEFAULT_PLANT_SIZE = 64

  // Plant type lookup — resolve from project store at call time
  function resolvePlantTypeObject(plantTypeId: string) {
    try {
      const { registries } = useProjectStore.getState()
      return registries.plants.find((p) => p.id === plantTypeId)
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
      const canvas = generatePlantSprite(category, DEFAULT_PLANT_SIZE, plantTypeId, pt)
      const texture = Texture.from(canvas)
      plantTextureCache.set(plantTypeId, texture)
      evictOldest(plantTextureCache, MAX_PLANT_CACHE)
      return texture
    },

    getStructureSprite(structureTypeId: string): Texture {
      const cached = structureTextureCache.get(structureTypeId)
      if (cached) return cached

      const canvas = generateStructureSprite(
        DEFAULT_STRUCTURE_COLOR,
        DEFAULT_STRUCTURE_W,
        DEFAULT_STRUCTURE_H,
      )
      const texture = Texture.from(canvas)
      structureTextureCache.set(structureTypeId, texture)
      evictOldest(structureTextureCache, MAX_STRUCTURE_CACHE)
      return texture
    },

    getFallbackTexture(): Texture {
      return fallbackTexture
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
