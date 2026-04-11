/**
 * snapUtils — Shared snap helper for PixiJS canvas handlers.
 *
 * All placement/drawing handlers (PlacementHandlers, BoundaryHandler,
 * PathDrawingHandler) share the same snap logic. This module provides a
 * single exported function so the logic lives in exactly one place.
 */

import { snapPoint } from '../snap/snapSystem'
import type { CanvasContext } from './CanvasContext'

/**
 * Snap a world-space point using the project's snap settings.
 *
 * @param worldX  Raw world X coordinate (before snapping).
 * @param worldY  Raw world Y coordinate (before snapping).
 * @param context Snap context passed through to `snapPoint` — controls which
 *                snap rules apply ('place', 'label', or 'measurement').
 * @param altKey  When true, snap is temporarily disabled (alt-override).
 * @param ctx     Canvas context providing access to project and viewport state.
 * @returns       Snapped {x, y} in world space.  Falls back to the raw
 *                coordinates when no project is loaded.
 */
export function snapWorldPoint(
  worldX: number,
  worldY: number,
  context: 'place' | 'label' | 'measurement',
  altKey: boolean,
  ctx: CanvasContext,
): { x: number; y: number } {
  const proj = ctx.getProject()
  if (!proj) return { x: worldX, y: worldY }
  const zoom = ctx.getZoom()
  const result = snapPoint(
    worldX, worldY, context, proj.elements, zoom,
    proj.gridConfig.snapIncrementCm,
    proj.uiState.snapEnabled, altKey,
  )
  return { x: result.x, y: result.y }
}
