/**
 * handleGeometry — Shared constants and utilities for selection handle hit-testing.
 *
 * Both SelectionStateMachine (hit-test logic) and any future renderers that need
 * to query handle hit areas import from here, ensuring a single source of truth
 * for the threshold radius.
 */

/**
 * Base hit-test radius for selection handles, in world-space centimetres at
 * zoom = 1.  Divide by the current zoom to get the actual threshold.
 */
export const HANDLE_HIT_RADIUS = 6

/**
 * Returns the hit-test threshold in world-space units for the given zoom level.
 *
 * Usage:
 *   const threshold = getHandleHitThreshold(zoom)
 *   if (Math.abs(worldX - handle.x) <= threshold && ...) { ... }
 */
export function getHandleHitThreshold(zoom: number): number {
  return HANDLE_HIT_RADIUS / zoom
}
