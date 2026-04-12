/**
 * boundaryHitTest — Hit-test geometry for boundary vertex and arc handles.
 *
 * Extracted from InteractionManager so the sagitta math and handle-proximity
 * logic live in a single, testable place.  InteractionManager remains the
 * caller / orchestrator; these functions accept explicit parameters rather than
 * reading from ctx or stores.
 */

import type { YardBoundary } from '../types/schema'
import { getHandleHitThreshold } from './handleGeometry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Describes which boundary handle (vertex or arc midpoint) was hit. */
export interface BoundaryHandleHit {
  type: 'vertex' | 'arc'
  /** Zero-based index into boundary.vertices (vertex) or boundary.edgeTypes (arc). */
  index: number
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Computes the world-space position of an arc handle for edge `i`.
 *
 * The handle sits at the chord midpoint offset by `arcSagitta` along the
 * perpendicular bisector.  When the edge is a straight line (or has no sagitta)
 * the handle is simply the chord midpoint.
 *
 * @param boundary  The yard boundary data.
 * @param edgeIndex Zero-based edge index (edge `i` connects vertex `i` to `(i+1) % n`).
 * @returns The handle position in world coordinates.
 */
export function getArcHandlePosition(
  boundary: YardBoundary,
  edgeIndex: number,
): { x: number; y: number } {
  const n = boundary.vertices.length
  const p1 = boundary.vertices[edgeIndex]
  const p2 = boundary.vertices[(edgeIndex + 1) % n]

  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2

  const edge = boundary.edgeTypes[edgeIndex]
  if (edge?.type === 'arc' && edge.arcSagitta !== null) {
    const chordDx = p2.x - p1.x
    const chordDy = p2.y - p1.y
    const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
    if (chordLen > 1e-6) {
      // Unit perpendicular (rotated 90° counter-clockwise)
      const perpX = -chordDy / chordLen
      const perpY = chordDx / chordLen
      return {
        x: midX + perpX * edge.arcSagitta,
        y: midY + perpY * edge.arcSagitta,
      }
    }
  }

  return { x: midX, y: midY }
}

// ---------------------------------------------------------------------------
// Hit-test entry point
// ---------------------------------------------------------------------------

/**
 * Tests whether `(worldX, worldY)` is within hit-test range of any boundary
 * vertex or arc handle.
 *
 * Vertices have higher priority than arc handles — they are checked first.
 *
 * @param worldX   Pointer X in world coordinates.
 * @param worldY   Pointer Y in world coordinates.
 * @param boundary The yard boundary to test against.
 * @param zoom     Current canvas zoom level, used to compute the pixel-stable
 *                 hit-test threshold.
 * @returns The hit handle descriptor, or `null` if no handle was hit.
 */
export function hitTestBoundaryHandles(
  worldX: number,
  worldY: number,
  boundary: YardBoundary,
  zoom: number,
): BoundaryHandleHit | null {
  if (boundary.vertices.length < 3) return null

  const threshold = getHandleHitThreshold(zoom)
  const n = boundary.vertices.length

  // Vertices first (higher priority — smaller targets)
  for (let i = 0; i < n; i++) {
    const v = boundary.vertices[i]
    const dx = worldX - v.x
    const dy = worldY - v.y
    if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
      return { type: 'vertex', index: i }
    }
  }

  // Edge midpoints / arc handles
  for (let i = 0; i < n; i++) {
    const handle = getArcHandlePosition(boundary, i)
    const dx = worldX - handle.x
    const dy = worldY - handle.y
    if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
      return { type: 'arc', index: i }
    }
  }

  return null
}
