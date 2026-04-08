/**
 * PlantRenderer — Imperative PixiJS renderer for plant elements.
 *
 * Phase 3 of PLAN-G. Renders plants as illustrated sprites with:
 *   - Category-coded colors (vegetable=green, herb=light-green, etc.)
 *   - Foreshortened drop shadows
 *   - Plant status indicators (planned, planted, growing, harvested, removed)
 *   - Size based on growthForm (canopyWidthCm for trees/shrubs, spacingCm otherwise)
 *   - Y-sort by bottom edge for correct overlap
 *   - Layer visibility and locked-opacity
 *
 * Pattern: createPlantRenderer(container, scheduler, atlas) => RendererHandle
 */

import { Container, Sprite, Text } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import {
  setupWorldObject,
} from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { TextureAtlas } from './textures/TextureAtlas'
import type { PlantElement, PlantType, PlantStatus, Layer } from '../types/schema'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max rendered plant sprites (prevents unbounded VRAM growth). */
const MAX_PLANTS = 500

/** Culling margin in world cm — generous to avoid pop-in during fast panning. */
const CULLING_MARGIN = 200

/** Status indicator icon size relative to plant radius. */
const STATUS_ICON_SCALE = 0.25

/** Min status icon size in world cm to remain legible. */
const STATUS_ICON_MIN_SIZE = 8

// ---------------------------------------------------------------------------
// Status indicator symbols
// ---------------------------------------------------------------------------

const STATUS_SYMBOLS: Record<PlantStatus, string> = {
  planned: '◌',   // dashed outline circle
  planted: '●',   // solid dot
  growing: '🌱',  // leaf
  harvested: '✓', // check
  removed: '✕',   // x mark
}

const STATUS_COLORS: Record<PlantStatus, string> = {
  planned: '#9E9E9E',
  planted: '#4CAF50',
  growing: '#66BB6A',
  harvested: '#FF9800',
  removed: '#F44336',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlantEntry {
  sprite: Sprite
  statusText: Text
  elementId: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPlantRenderer(
  container: Container,
  scheduler: RenderScheduler,
  atlas: TextureAtlas,
  getCanvasSize: () => { width: number; height: number },
): RendererHandle {
  const entries = new Map<string, PlantEntry>()
  const unsubs: Array<() => void> = []

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function resolvePlantType(plantTypeId: string): PlantType | undefined {
    const { registries } = useProjectStore.getState()
    return registries.plants.find((p) => p.id === plantTypeId)
  }

  /** Effective visual radius for a plant element (world cm). */
  function effectiveRadius(_el: PlantElement, pt: PlantType): number {
    const spacing = Number.isFinite(pt.spacingCm) && pt.spacingCm > 0 ? pt.spacingCm : 10
    const canopy = pt.canopyWidthCm != null && Number.isFinite(pt.canopyWidthCm) && pt.canopyWidthCm > 0
      ? pt.canopyWidthCm : spacing

    switch (pt.growthForm) {
      case 'tree':
      case 'shrub':
        return canopy / 2
      case 'climber':
        return 15
      case 'groundcover':
      case 'herb':
      default:
        return spacing / 2
    }
  }

  function createPlantEntry(el: PlantElement, pt: PlantType): PlantEntry {
    const radius = effectiveRadius(el, pt)
    const diameter = radius * 2

    // Plant sprite (shadow is baked into the sprite texture by PlantSprites.ts)
    const texture = atlas.getPlantSprite(el.plantTypeId)
    const sprite = new Sprite(texture)
    setupWorldObject(sprite)
    sprite.anchor.set(0.5, 0.5)
    sprite.position.set(el.x, el.y)
    sprite.width = diameter
    sprite.height = diameter

    // Status indicator
    const iconSize = Math.max(radius * STATUS_ICON_SCALE, STATUS_ICON_MIN_SIZE)
    const statusText = new Text({
      text: STATUS_SYMBOLS[el.status] ?? '',
      style: {
        fontSize: iconSize,
        fill: STATUS_COLORS[el.status] ?? '#9E9E9E',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
      },
    })
    setupWorldObject(statusText)
    statusText.anchor.set(0.5, 0.5)
    statusText.position.set(el.x + radius * 0.6, el.y + radius * 0.6)

    // Y-sort key: use visual bottom edge (el.y + radius) for correct overlap
    const TYPE_PLANT = 3
    const sortKey = TYPE_PLANT * 1e10 + (el.y + radius)
    sprite.zIndex = sortKey
    statusText.zIndex = sortKey + 1

    container.addChild(sprite, statusText)

    return { sprite, statusText, elementId: el.id }
  }

  function updatePlantEntry(entry: PlantEntry, el: PlantElement, pt: PlantType): void {
    const radius = effectiveRadius(el, pt)
    const diameter = radius * 2

    // Update sprite
    const texture = atlas.getPlantSprite(el.plantTypeId)
    if (entry.sprite.texture !== texture) {
      entry.sprite.texture = texture
    }
    entry.sprite.position.set(el.x, el.y)
    entry.sprite.width = diameter
    entry.sprite.height = diameter

    // Update status indicator
    const iconSize = Math.max(radius * STATUS_ICON_SCALE, STATUS_ICON_MIN_SIZE)
    entry.statusText.text = STATUS_SYMBOLS[el.status] ?? ''
    entry.statusText.style.fontSize = iconSize
    entry.statusText.style.fill = STATUS_COLORS[el.status] ?? '#9E9E9E'
    entry.statusText.position.set(el.x + radius * 0.6, el.y + radius * 0.6)

    // Update sort keys: use visual bottom edge for correct overlap
    const TYPE_PLANT = 3
    const sortKey = TYPE_PLANT * 1e10 + (el.y + radius)
    entry.sprite.zIndex = sortKey
    entry.statusText.zIndex = sortKey + 1
  }

  function removeEntry(entry: PlantEntry): void {
    container.removeChild(entry.sprite, entry.statusText)
    entry.sprite.destroy()
    entry.statusText.destroy()
  }

  // ---------------------------------------------------------------------------
  // Viewport culling
  // ---------------------------------------------------------------------------

  /** Viewport world bounds for element-level visibility culling. */
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

  /**
   * Set .visible = false for plants whose position (with radius margin)
   * falls entirely outside the current viewport. Layer-hidden plants
   * remain hidden regardless of viewport.
   */
  function updateElementVisibility(): void {
    const { worldLeft, worldTop, worldRight, worldBottom } = getViewportWorldBounds()
    const project = useProjectStore.getState().currentProject

    for (const entry of entries.values()) {
      // Find the element to get its position and compute radius
      const el = project?.elements.find(
        (e): e is PlantElement => e.id === entry.elementId && e.type === 'plant',
      )
      if (!el) continue

      // Layer visibility takes precedence — if layer is hidden, stay hidden
      const layer = project?.layers.find((l: Layer) => l.id === el.layerId)
      if (layer && !layer.visible) continue

      const pt = resolvePlantType(el.plantTypeId)
      const radius = pt ? effectiveRadius(el, pt) : 30
      const margin = radius + CULLING_MARGIN

      const inViewport =
        el.x + margin >= worldLeft &&
        el.x - margin <= worldRight &&
        el.y + margin >= worldTop &&
        el.y - margin <= worldBottom

      entry.sprite.visible = inViewport
      entry.statusText.visible = inViewport
    }

    scheduler.markDirty()
  }

  // ---------------------------------------------------------------------------
  // Full rebuild from store
  // ---------------------------------------------------------------------------

  function rebuildFromStore(): void {
    const project = useProjectStore.getState().currentProject
    if (!project) {
      // Clear everything
      for (const entry of entries.values()) removeEntry(entry)
      entries.clear()
      scheduler.markDirty()
      return
    }

    const plants = project.elements.filter(
      (el): el is PlantElement => el.type === 'plant',
    )

    // Cap rendered plants to prevent unbounded growth
    const plantsToRender = plants.slice(0, MAX_PLANTS)
    if (plants.length > MAX_PLANTS) {
      console.warn(
        `[PlantRenderer] Capping rendered plants at ${MAX_PLANTS} (total: ${plants.length})`,
      )
    }

    // Build a set of current plant IDs
    const currentIds = new Set(plantsToRender.map((p) => p.id))

    // Remove entries for plants that no longer exist
    for (const [id, entry] of entries) {
      if (!currentIds.has(id)) {
        removeEntry(entry)
        entries.delete(id)
      }
    }

    // Update or create entries with per-element layer state
    for (const el of plantsToRender) {
      const pt = resolvePlantType(el.plantTypeId)
      if (!pt) continue // skip plants with unknown type

      const existing = entries.get(el.id)
      if (existing) {
        updatePlantEntry(existing, el, pt)
      } else {
        const entry = createPlantEntry(el, pt)
        entries.set(el.id, entry)
      }

      // Per-element layer visibility and locked-opacity
      const entry = entries.get(el.id)
      if (entry) {
        const layer = project.layers.find((l: Layer) => l.id === el.layerId)
        const visible = layer?.visible ?? true
        const alpha = layer?.locked ? 0.5 : 1.0
        entry.sprite.visible = visible
        entry.sprite.alpha = alpha
        entry.statusText.visible = visible
      }
    }

    // Apply viewport culling after rebuild
    updateElementVisibility()
  }

  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------

  // Rebuild when project elements change
  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.elements,
      () => rebuildFromStore(),
    ),
  )

  // Rebuild when registries change (plant type definitions may update)
  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.registries.plants,
      () => rebuildFromStore(),
    ),
  )

  // Rebuild when layer visibility/locked state changes
  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.layers,
      () => rebuildFromStore(),
    ),
  )

  // Update element visibility when viewport changes (pan/zoom)
  unsubs.push(
    connectStore(
      useViewportStore,
      (s) => `${s.panX},${s.panY},${s.zoom}`,
      () => updateElementVisibility(),
    ),
  )

  // Initial render
  rebuildFromStore()

  // ---------------------------------------------------------------------------
  // Public handle
  // ---------------------------------------------------------------------------

  return {
    update: rebuildFromStore,
    destroy(): void {
      for (const unsub of unsubs) unsub()
      unsubs.length = 0
      for (const entry of entries.values()) removeEntry(entry)
      entries.clear()
    },
  }
}
