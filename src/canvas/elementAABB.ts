/**
 * elementAABB.ts — Per-element-type hit test and AABB functions.
 *
 * Extracted from the Konva layer files during Phase 5.4 (Konva removal).
 * These are pure math functions with no rendering framework dependencies.
 */

import type {
  TerrainElement,
  PlantElement,
  StructureElement,
  PathElement,
  LabelElement,
  DimensionElement,
  Vec2,
  YardBoundary,
} from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { computeDimensionGeometry, dimensionAABB } from './geometry'
import { sampleArc, arcAABB } from './arcGeometry'
import type { AABB } from './hitTestAll'

// ─── Terrain ────────────────────────────────────────────────────────────────

/** Point-in-terrain-cell hit test. */
export function terrainHitTest(element: TerrainElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX < element.x + 100 &&
    worldY >= element.y &&
    worldY < element.y + 100
  )
}

/** Axis-aligned bounding box of a TerrainElement (always 100x100). */
export function terrainGetAABB(element: TerrainElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: 100, h: 100 }
}

// ─── Plant ──────────────────────────────────────────────────────────────────

import type { PlantType } from '../types/schema'

/** Effective visual radius for a plant element (world cm). */
function effectiveRadius(_element: PlantElement, plantType: PlantType): number {
  const spacing = Number.isFinite(plantType.spacingCm) && plantType.spacingCm > 0 ? plantType.spacingCm : 10
  const canopy = plantType.canopyWidthCm != null && Number.isFinite(plantType.canopyWidthCm) && plantType.canopyWidthCm > 0
    ? plantType.canopyWidthCm : spacing

  switch (plantType.growthForm) {
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

/** Point-in-plant hit test (circle). */
export function plantHitTest(element: PlantElement, worldX: number, worldY: number): boolean {
  const registries = useProjectStore.getState().registries
  const plantType = registries.plants.find((p) => p.id === element.plantTypeId)
  if (!plantType) return false
  const r = effectiveRadius(element, plantType)
  const dx = element.x - worldX
  const dy = element.y - worldY
  return Math.sqrt(dx * dx + dy * dy) < r
}

/** Axis-aligned bounding box of a PlantElement. */
export function plantGetAABB(element: PlantElement): { x: number; y: number; w: number; h: number } {
  const registries = useProjectStore.getState().registries
  const plantType = registries.plants.find((p) => p.id === element.plantTypeId)
  if (!plantType) return { x: element.x, y: element.y, w: 0, h: 0 }
  const r = effectiveRadius(element, plantType)
  return { x: element.x - r, y: element.y - r, w: r * 2, h: r * 2 }
}

// ─── Structure ──────────────────────────────────────────────────────────────

/** AABB hit test (ignores rotation for MVP). */
export function structureHitTest(element: StructureElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX <= element.x + element.width &&
    worldY >= element.y &&
    worldY <= element.y + element.height
  )
}

/** Axis-aligned bounding box of a StructureElement. */
export function structureGetAABB(element: StructureElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

// ─── Path ───────────────────────────────────────────────────────────────────

function pointToSegmentDist(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-10) {
    const ex = px - a.x, ey = py - a.y
    return Math.sqrt(ex * ex + ey * ey)
  }
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  const ex = px - cx, ey = py - cy
  return Math.sqrt(ex * ex + ey * ey)
}

/** Point-in-path hit test (proximity to any segment, within half stroke width). */
export function pathHitTest(element: PathElement, worldX: number, worldY: number): boolean {
  const halfW = element.strokeWidthCm / 2
  const pts = element.points
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDist(worldX, worldY, pts[i], pts[i + 1])
    if (d <= halfW) return true
  }
  if (element.closed && pts.length >= 2) {
    const d = pointToSegmentDist(worldX, worldY, pts[pts.length - 1], pts[0])
    if (d <= halfW) return true
  }
  return false
}

/** Axis-aligned bounding box of a PathElement. */
export function pathGetAABB(element: PathElement): { x: number; y: number; w: number; h: number } {
  if (element.points.length === 0) return { x: element.x, y: element.y, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of element.points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const half = element.strokeWidthCm / 2
  return {
    x: minX - half,
    y: minY - half,
    w: maxX - minX + element.strokeWidthCm,
    h: maxY - minY + element.strokeWidthCm,
  }
}

// ─── Label ──────────────────────────────────────────────────────────────────

/** AABB hit test for a label element. */
export function labelHitTest(element: LabelElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX <= element.x + element.width &&
    worldY >= element.y &&
    worldY <= element.y + element.height
  )
}

/** Axis-aligned bounding box of a LabelElement. */
export function labelGetAABB(element: LabelElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

// ─── Dimension ──────────────────────────────────────────────────────────────

function dimensionPointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.001) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2)
}

export function dimensionHitTest(element: DimensionElement, worldX: number, worldY: number): boolean {
  const geo = computeDimensionGeometry(element.startPoint, element.endPoint, element.offsetCm)
  const tolerance = 15
  return (
    dimensionPointToSegmentDistance({ x: worldX, y: worldY }, geo.leaderStart, geo.leaderEnd) <= tolerance ||
    dimensionPointToSegmentDistance({ x: worldX, y: worldY }, geo.extensionStart[0], geo.extensionStart[1]) <= tolerance ||
    dimensionPointToSegmentDistance({ x: worldX, y: worldY }, geo.extensionEnd[0], geo.extensionEnd[1]) <= tolerance
  )
}

export function dimensionGetAABB(element: DimensionElement): AABB {
  return dimensionAABB(element.startPoint, element.endPoint, element.offsetCm)
}

// ─── Yard Boundary ──────────────────────────────────────────────────────────

/** Point-in-polygon test via horizontal ray casting, with arc edge support. */
export function boundaryHitTest(boundary: YardBoundary | null, worldX: number, worldY: number): boolean {
  if (!boundary || boundary.vertices.length < 3) return false
  const verts = boundary.vertices
  const n = verts.length
  let inside = false

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const edgeType = boundary.edgeTypes[j]
    let edgeVerts: Vec2[]
    if (edgeType?.type === 'arc' && edgeType.arcSagitta !== null) {
      edgeVerts = sampleArc(verts[j], verts[i], edgeType.arcSagitta, 16)
    } else {
      edgeVerts = [verts[j], verts[i]]
    }
    for (let k = 0; k < edgeVerts.length - 1; k++) {
      const xi = edgeVerts[k + 1].x, yi = edgeVerts[k + 1].y
      const xj = edgeVerts[k].x, yj = edgeVerts[k].y
      if (yi === yj) continue
      const intersect = (yi > worldY) !== (yj > worldY) &&
        worldX < ((xj - xi) * (worldY - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
  }
  return inside
}

/** Axis-aligned bounding box of a YardBoundary (including arc edge bulge). */
export function boundaryGetAABB(boundary: YardBoundary): { x: number; y: number; w: number; h: number } {
  if (boundary.vertices.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const verts = boundary.vertices
  const n = verts.length
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const v of verts) {
    minX = Math.min(minX, v.x); minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y)
  }

  for (let i = 0; i < n; i++) {
    const edge = boundary.edgeTypes[i]
    if (edge?.type === 'arc' && edge.arcSagitta !== null) {
      const p1 = verts[i]
      const p2 = verts[(i + 1) % n]
      const ab = arcAABB(p1, p2, edge.arcSagitta)
      minX = Math.min(minX, ab.minX); minY = Math.min(minY, ab.minY)
      maxX = Math.max(maxX, ab.maxX); maxY = Math.max(maxY, ab.maxY)
    }
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
