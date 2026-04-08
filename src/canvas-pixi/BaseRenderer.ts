/**
 * BaseRenderer — Shared utilities for all imperative PixiJS renderer modules.
 *
 * Provides:
 *   - Layer visibility and locked-opacity handling
 *   - Y-sort key computation for depth ordering
 *   - Cullable setup for world-space objects
 *   - Graphics reuse helper (clear, don't destroy/recreate — v8 issue #10586)
 *   - Height extrusion constants
 */

import type { Container, Graphics } from 'pixi.js'
import type { CanvasElement } from '../types/schema'
import { EXTRUSION_SCALE } from './textures/constants'

// ---------------------------------------------------------------------------
// Y-sort constants
// ---------------------------------------------------------------------------

/**
 * Type-based layer order for Y-sort depth ordering.
 * Plants and extruded structures share tier 3 for correct overlap.
 */
const TYPE_LAYER_ORDER = {
  terrain: 0,
  path: 1,
  flat_structure: 2,       // surface, overhead categories
  extruded_structure: 3,   // boundary, feature, furniture, container categories
  plant: 3,                // shares tier with extruded structures
} as const

/** Structure categories that get height extrusion (sort by top edge). */
const EXTRUDED_CATEGORIES = new Set(['boundary', 'feature', 'furniture', 'container'])

// ---------------------------------------------------------------------------
// Y-sort exports
// ---------------------------------------------------------------------------

/**
 * Compute Y-sort zIndex for a structure element with known category.
 * Extruded categories sort by top edge (el.y), flat categories by bottom edge.
 */
export function computeStructureSortKey(
  el: CanvasElement,
  category: string,
): number {
  const safeY = Number.isFinite(el.y) ? el.y : 0
  const safeH = Number.isFinite(el.height) ? el.height : 0

  if (EXTRUDED_CATEGORIES.has(category)) {
    return TYPE_LAYER_ORDER.extruded_structure * 1e10 + safeY
  }
  return TYPE_LAYER_ORDER.flat_structure * 1e10 + (safeY + safeH)
}

/**
 * Compute Y-sort zIndex for a plant element.
 */
export function computePlantSortKey(el: CanvasElement): number {
  const safeY = Number.isFinite(el.y) ? el.y : 0
  const safeH = Number.isFinite(el.height) ? el.height : 0
  return TYPE_LAYER_ORDER.plant * 1e10 + (safeY + safeH)
}

/**
 * Set up a display object for world-space rendering.
 * Enables frustum culling (v8 built-in).
 */
export function setupWorldObject(obj: { cullable?: boolean; eventMode?: string }): void {
  // NOTE: Do NOT set cullable = true here. PixiJS v8's built-in frustum culling
  // interacts incorrectly with isRenderGroup on the world container, causing
  // sprites to be culled even when visible. Each renderer already performs its
  // own manual viewport culling via updateElementVisibility / updateChunkVisibility.
  obj.cullable = false
  obj.eventMode = 'none'
}

/**
 * Apply layer visibility and locked-opacity to a container.
 * Locked layers render at 50% opacity.
 */
export function applyLayerState(
  container: Container,
  visible: boolean,
  locked: boolean,
): void {
  container.visible = visible
  container.alpha = locked ? 0.5 : 1.0
}

/**
 * Safely clear and reuse a Graphics object.
 * Always call clear() before redrawing — never destroy/recreate per frame.
 * (v8 known memory leak with rapid Graphics create/destroy, issue #10586)
 */
export function clearGraphics(g: Graphics): Graphics {
  g.clear()
  return g
}

/**
 * Compute the height of the south-face extrusion strip for a structure.
 */
export function computeExtrusionHeight(heightCm: number): number {
  return heightCm * EXTRUSION_SCALE
}

/**
 * Check if a structure category is extruded (has south face).
 */
export function isExtrudedCategory(category: string): boolean {
  return EXTRUDED_CATEGORIES.has(category)
}

/**
 * Standard renderer handle interface.
 */
export interface RendererHandle {
  update: () => void
  destroy: () => void
}
