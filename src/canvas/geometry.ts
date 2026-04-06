/**
 * geometry.ts — Pure math functions for area, perimeter, volume, and distance calculations.
 * Used by Phase D1 (measurement/dimensions) and Phase D3 (cost derivation).
 */

import type {
  CanvasElement,
  TerrainElement,
  StructureElement,
  PathElement,
  Vec2,
  YardBoundary,
} from '../types/schema'

// ─── Distance ──────────────────────────────────────────────────────────────

/** Euclidean distance between two points (cm). */
export function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Format a distance in cm as meters with cm precision (e.g. "1.23 m"). */
export function formatDistance(cm: number, precision = 2): string {
  return `${(cm / 100).toFixed(precision)} m`
}

// ─── Area (Shoelace) ───────────────────────────────────────────────────────

/**
 * Polygon area using the Shoelace formula. Returns positive value in cm².
 * Vertices should be ordered (CW or CCW — absolute value taken).
 */
export function polygonArea(vertices: Vec2[]): number {
  if (vertices.length < 3) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    sum += curr.x * next.y - next.x * curr.y
  }
  return Math.abs(sum) / 2
}

/**
 * Arc segment area contribution (circular segment).
 * sweepAngle in radians, radius in cm.
 * Returns the area of the circular segment: 0.5 * R² * (θ - sin(θ))
 */
export function arcSegmentArea(radius: number, sweepAngle: number): number {
  return 0.5 * radius * radius * (Math.abs(sweepAngle) - Math.sin(Math.abs(sweepAngle)))
}

// ─── Perimeter ─────────────────────────────────────────────────────────────

/** Polygon perimeter from straight edges (cm). */
export function polygonPerimeter(vertices: Vec2[]): number {
  if (vertices.length < 2) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i]
    const next = vertices[(i + 1) % vertices.length]
    sum += distance(curr, next)
  }
  return sum
}

/** Arc edge length: |R × θ| */
export function arcLength(radius: number, sweepAngle: number): number {
  return Math.abs(radius * sweepAngle)
}

// ─── Path-specific calculations ────────────────────────────────────────────

/** Total path length in cm (sum of segment lengths). */
export function pathTotalLength(element: PathElement): number {
  let total = 0
  for (let i = 1; i < element.points.length; i++) {
    total += distance(element.points[i - 1], element.points[i])
  }
  // Add closing segment for closed paths
  if (element.closed && element.points.length >= 3) {
    total += distance(element.points[element.points.length - 1], element.points[0])
  }
  return total
}

/** Path area for closed paths using Shoelace (cm²). */
export function pathArea(element: PathElement): number {
  if (!element.closed || element.points.length < 3) return 0
  return polygonArea(element.points)
}

// ─── Element-specific area/perimeter ───────────────────────────────────────

/** Get area in m² for an element (returns null if not applicable). */
export function getElementAreaM2(element: CanvasElement): number | null {
  switch (element.type) {
    case 'terrain':
      // Each terrain cell is exactly 1 m²
      return 1.0
    case 'structure':
      return (element.width * element.height) / 10000 // cm² → m²
    case 'path':
      if (element.closed) {
        return pathArea(element) / 10000
      }
      return null
    default:
      return null
  }
}

/** Get perimeter in m for an element (returns null if not applicable). */
export function getElementPerimeterM(element: CanvasElement): number | null {
  switch (element.type) {
    case 'structure':
      return (2 * (element.width + element.height)) / 100 // cm → m
    case 'path':
      if (element.closed) {
        return polygonPerimeter(element.points) / 100
      }
      return null
    default:
      return null
  }
}

/** Yard boundary area in m². */
export function yardBoundaryAreaM2(boundary: YardBoundary): number {
  return polygonArea(boundary.vertices) / 10000
}

/** Yard boundary perimeter in m. */
export function yardBoundaryPerimeterM(boundary: YardBoundary): number {
  return polygonPerimeter(boundary.vertices) / 100
}

// ─── Material estimates ────────────────────────────────────────────────────

/** Volume for terrain material estimate: area × depth in m³. */
export function materialVolume(areaM2: number, depthCm: number): number {
  return areaM2 * (depthCm / 100)
}

/** Path material area: length × width in m². */
export function pathMaterialArea(element: PathElement): number {
  const lengthM = pathTotalLength(element) / 100
  const widthM = element.strokeWidthCm / 100
  return lengthM * widthM
}

// ─── Aggregate terrain area ────────────────────────────────────────────────

/** Count terrain cells of a given type, returns area in m². */
export function aggregateTerrainArea(
  elements: CanvasElement[],
  terrainTypeId: string,
): number {
  let count = 0
  for (const el of elements) {
    if (el.type === 'terrain' && el.terrainTypeId === terrainTypeId) {
      count++
    }
  }
  return count // Each cell = 1 m²
}

// ─── Dimension line geometry ───────────────────────────────────────────────

export interface DimensionRenderData {
  /** Offset leader line endpoints */
  leaderStart: Vec2
  leaderEnd: Vec2
  /** Extension lines from original points to leader line */
  extensionStart: [Vec2, Vec2]
  extensionEnd: [Vec2, Vec2]
  /** Text label position (midpoint of leader line) */
  textPosition: Vec2
  /** Rotation angle in radians for text alignment */
  textAngle: number
  /** Distance in cm */
  distanceCm: number
}

/**
 * Compute all geometry needed to render a dimension annotation.
 * Per spatial-math-specification.md § Dimension Line Rendering.
 */
export function computeDimensionGeometry(
  startPoint: Vec2,
  endPoint: Vec2,
  offsetCm: number,
): DimensionRenderData {
  const dx = endPoint.x - startPoint.x
  const dy = endPoint.y - startPoint.y
  const len = Math.sqrt(dx * dx + dy * dy)

  // Perpendicular unit vector (rotated 90° CCW)
  let perpX: number, perpY: number
  if (len < 0.001) {
    perpX = 0
    perpY = -1
  } else {
    perpX = -dy / len
    perpY = dx / len
  }

  // Offset the leader line perpendicular to the measurement line
  const leaderStart: Vec2 = {
    x: startPoint.x + perpX * offsetCm,
    y: startPoint.y + perpY * offsetCm,
  }
  const leaderEnd: Vec2 = {
    x: endPoint.x + perpX * offsetCm,
    y: endPoint.y + perpY * offsetCm,
  }

  // Extension lines: from each original point to the leader line
  const extensionStart: [Vec2, Vec2] = [
    { x: startPoint.x, y: startPoint.y },
    { x: leaderStart.x, y: leaderStart.y },
  ]
  const extensionEnd: [Vec2, Vec2] = [
    { x: endPoint.x, y: endPoint.y },
    { x: leaderEnd.x, y: leaderEnd.y },
  ]

  // Text position: midpoint of leader line
  const textPosition: Vec2 = {
    x: (leaderStart.x + leaderEnd.x) / 2,
    y: (leaderStart.y + leaderEnd.y) / 2,
  }

  // Text angle: align with leader line direction
  let textAngle = Math.atan2(dy, dx)
  // Keep text readable (not upside down)
  if (textAngle > Math.PI / 2) textAngle -= Math.PI
  if (textAngle < -Math.PI / 2) textAngle += Math.PI

  return {
    leaderStart,
    leaderEnd,
    extensionStart,
    extensionEnd,
    textPosition,
    textAngle,
    distanceCm: len,
  }
}

/**
 * Compute AABB for a dimension element including offset leader line.
 */
export function dimensionAABB(
  startPoint: Vec2,
  endPoint: Vec2,
  offsetCm: number,
): { x: number; y: number; w: number; h: number } {
  const geo = computeDimensionGeometry(startPoint, endPoint, offsetCm)
  const allPoints = [
    startPoint,
    endPoint,
    geo.leaderStart,
    geo.leaderEnd,
  ]
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of allPoints) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
