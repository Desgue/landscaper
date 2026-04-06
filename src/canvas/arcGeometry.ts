// Arc geometry utilities — shared across yard boundary, arc tool, paths, etc.
// All coordinates are in world units (centimeters). Y-axis points DOWN (HTML Canvas / Konva convention).

import type { Vec2 } from '../types/schema'

export interface ArcParams {
  center: Vec2
  radius: number
  startAngle: number // radians
  endAngle: number   // radians
  sweepAngle: number // signed sweep in radians; negative = clockwise (screen coords)
  counterclockwise: boolean
}

/**
 * Compute arc geometry from two endpoints and a signed sagitta.
 *
 * sagitta > 0 → arc bulges toward the LEFT of direction p1 → p2
 * sagitta < 0 → arc bulges toward the RIGHT
 *
 * From the spatial-math spec:
 *   R = (sagitta² + (chordLen/2)²) / (2 * |sagitta|)
 *   center = mid + perp * (sagitta - R)   (perp is left-normal of chord)
 *
 * Returns null when sagitta ≈ 0 (treat as straight line) or when p1 === p2.
 */
export function arcFromSagitta(
  p1: Vec2,
  p2: Vec2,
  sagitta: number,
): ArcParams | null {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const chordLen = Math.sqrt(dx * dx + dy * dy)

  if (chordLen < 1e-6) return null
  if (Math.abs(sagitta) < 1e-6) return null

  // Clamp |sagitta| to chordLen to avoid arcs > semicircle flipping
  const s = Math.sign(sagitta) * Math.min(Math.abs(sagitta), chordLen)

  const half = chordLen / 2
  // radius from sagitta formula
  const radius = (s * s + half * half) / (2 * Math.abs(s))

  // midpoint of chord
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2

  // left-normal unit vector of chord direction
  const perpX = -dy / chordLen
  const perpY = dx / chordLen

  // center = mid + perp * (sagitta - R)
  // The signed sagitta 's' determines whether the center is left or right of chord
  const centerOffset = s - radius
  const center: Vec2 = {
    x: midX + perpX * centerOffset,
    y: midY + perpY * centerOffset,
  }

  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x)
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x)

  // In screen-space (y down), sagitta > 0 means counterclockwise
  const counterclockwise = s > 0

  // Compute signed sweep
  let sweep = endAngle - startAngle
  if (counterclockwise) {
    // Should go counterclockwise (positive direction in math, but CCW visually on screen)
    if (sweep > 0) sweep -= 2 * Math.PI
  } else {
    if (sweep < 0) sweep += 2 * Math.PI
  }

  return {
    center,
    radius: Math.abs(radius),
    startAngle,
    endAngle,
    sweepAngle: sweep,
    counterclockwise,
  }
}

/**
 * Sample an arc defined by two endpoints and a sagitta into a polyline of points.
 * Falls back to [p1, p2] when sagitta ≈ 0 (straight line).
 */
export function sampleArc(
  p1: Vec2,
  p2: Vec2,
  sagitta: number,
  steps = 32,
): Vec2[] {
  const arc = arcFromSagitta(p1, p2, sagitta)
  if (!arc) return [p1, p2]

  const { center, radius, startAngle, sweepAngle } = arc
  const pts: Vec2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = startAngle + sweepAngle * t
    pts.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    })
  }
  return pts
}

/**
 * Segment-segment intersection test.
 * Returns true if segments a1→a2 and b1→b2 properly intersect
 * (shared endpoints count as non-intersecting — use strict inequality).
 *
 * Algorithm from spatial-math-specification.md § Segment-Segment Intersection Test.
 */
export function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const EPSILON = 1e-10

  const rx = a2.x - a1.x
  const ry = a2.y - a1.y
  const sx = b2.x - b1.x
  const sy = b2.y - b1.y

  // cross(r, s)
  const denom = rx * sy - ry * sx

  const qpx = b1.x - a1.x
  const qpy = b1.y - a1.y

  if (Math.abs(denom) < EPSILON) {
    // Parallel; check for collinear overlap
    const cross_qp_r = qpx * ry - qpy * rx
    if (Math.abs(cross_qp_r) >= EPSILON) return false // parallel, not collinear

    const rr = rx * rx + ry * ry
    if (rr < EPSILON) return false // degenerate

    const t0 = (qpx * rx + qpy * ry) / rr
    const dx2 = b2.x - a1.x
    const dy2 = b2.y - a1.y
    const t1 = (dx2 * rx + dy2 * ry) / rr

    const tMin = Math.min(t0, t1)
    const tMax = Math.max(t0, t1)

    return Math.max(0, tMin) < Math.min(1, tMax)
  }

  const t = (qpx * sy - qpy * sx) / denom
  const u = (qpx * ry - qpy * rx) / denom

  return t > 0 && t < 1 && u > 0 && u < 1
}

/**
 * Compute the AABB of an arc segment.
 * Used for fit-to-view when boundary has arc edges.
 */
export function arcAABB(
  p1: Vec2,
  p2: Vec2,
  sagitta: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const arc = arcFromSagitta(p1, p2, sagitta)
  if (!arc) {
    return {
      minX: Math.min(p1.x, p2.x),
      minY: Math.min(p1.y, p2.y),
      maxX: Math.max(p1.x, p2.x),
      maxY: Math.max(p1.y, p2.y),
    }
  }

  const { center, radius, startAngle, sweepAngle, counterclockwise } = arc

  let minX = Math.min(p1.x, p2.x)
  let minY = Math.min(p1.y, p2.y)
  let maxX = Math.max(p1.x, p2.x)
  let maxY = Math.max(p1.y, p2.y)

  // Check axis-aligned extremes at 0°, 90°, 180°, 270°
  const extremeAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
  for (const angle of extremeAngles) {
    // Check whether angle falls within the arc sweep
    let normalised = angle - startAngle
    if (counterclockwise) {
      normalised = -normalised
      if (normalised < 0) normalised += 2 * Math.PI
      if (normalised <= Math.abs(sweepAngle)) {
        const px = center.x + radius * Math.cos(angle)
        const py = center.y + radius * Math.sin(angle)
        minX = Math.min(minX, px)
        minY = Math.min(minY, py)
        maxX = Math.max(maxX, px)
        maxY = Math.max(maxY, py)
      }
    } else {
      if (normalised < 0) normalised += 2 * Math.PI
      if (normalised <= Math.abs(sweepAngle)) {
        const px = center.x + radius * Math.cos(angle)
        const py = center.y + radius * Math.sin(angle)
        minX = Math.min(minX, px)
        minY = Math.min(minY, py)
        maxX = Math.max(maxX, px)
        maxY = Math.max(maxY, py)
      }
    }
  }

  return { minX, minY, maxX, maxY }
}
