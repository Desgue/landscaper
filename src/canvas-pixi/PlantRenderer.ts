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

import { Container, Sprite, Graphics, Text } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import {
  setupWorldObject,
  clearGraphics,
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
  shadow: Graphics
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

  /**
   * Draw a foreshortened ellipse drop shadow.
   * Spec: radial gradient from rgba(0,0,0,0.33) to rgba(0,0,0,0).
   * PixiJS v8 Graphics does not support radial gradient fills natively.
   * Approximation: concentric ellipses with decreasing alpha (3 rings).
   * Full gradient is pre-baked into PlantSprites.ts textures at atlas time.
   */
  function drawShadow(g: Graphics, radius: number): void {
    clearGraphics(g)
    const rx = radius * 0.5
    const ry = radius * 0.2
    const offsetY = radius * 0.3

    // 3-ring gradient approximation: outer→inner with increasing alpha
    const rings = 3
    for (let i = rings; i >= 1; i--) {
      const t = i / rings
      const alpha = 0.33 * (1 - t) * 1.5 // fade from ~0.33 at center to 0 at edge
      g.ellipse(0, offsetY, rx * t, ry * t).fill({ color: 0x000000, alpha: Math.min(alpha, 0.33) })
    }
  }

  function createPlantEntry(el: PlantElement, pt: PlantType): PlantEntry {
    const radius = effectiveRadius(el, pt)
    const diameter = radius * 2

    // Shadow (drawn underneath sprite)
    const shadow = new Graphics()
    setupWorldObject(shadow)
    drawShadow(shadow, radius)
    shadow.position.set(el.x, el.y)

    // Plant sprite
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
    // Position at bottom-right of plant
    statusText.position.set(el.x + radius * 0.6, el.y + radius * 0.6)

    // Y-sort key: use visual bottom edge (el.y + radius) for correct overlap
    const TYPE_PLANT = 3
    const sortKey = TYPE_PLANT * 1e10 + (el.y + radius)
    shadow.zIndex = sortKey - 1 // shadow just below plant
    sprite.zIndex = sortKey
    statusText.zIndex = sortKey + 1 // status on top

    container.addChild(shadow, sprite, statusText)

    return { sprite, shadow, statusText, elementId: el.id }
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

    // Update shadow
    drawShadow(entry.shadow, radius)
    entry.shadow.position.set(el.x, el.y)

    // Update status indicator
    const iconSize = Math.max(radius * STATUS_ICON_SCALE, STATUS_ICON_MIN_SIZE)
    entry.statusText.text = STATUS_SYMBOLS[el.status] ?? ''
    entry.statusText.style.fontSize = iconSize
    entry.statusText.style.fill = STATUS_COLORS[el.status] ?? '#9E9E9E'
    entry.statusText.position.set(el.x + radius * 0.6, el.y + radius * 0.6)

    // Update sort keys: use visual bottom edge for correct overlap
    const TYPE_PLANT = 3
    const sortKey = TYPE_PLANT * 1e10 + (el.y + radius)
    entry.shadow.zIndex = sortKey - 1
    entry.sprite.zIndex = sortKey
    entry.statusText.zIndex = sortKey + 1
  }

  function removeEntry(entry: PlantEntry): void {
    container.removeChild(entry.shadow, entry.sprite, entry.statusText)
    entry.shadow.destroy()
    entry.sprite.destroy()
    entry.statusText.destroy()
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
        entry.shadow.visible = visible
        entry.shadow.alpha = alpha
        entry.statusText.visible = visible
      }
    }

    scheduler.markDirty()
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
