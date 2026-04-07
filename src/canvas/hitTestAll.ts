/**
 * hitTestAll.ts — Unified hit testing and AABB utilities for all canvas element types.
 * Dispatches to per-layer hitTest/getAABB and provides spatial query helpers.
 */

import type { CanvasElement, Layer } from '../types/schema'
import { SELECTION_PRIORITY } from './selectionPriority'

import {
  terrainHitTest,
  terrainGetAABB,
  plantHitTest,
  plantGetAABB,
  structureHitTest,
  structureGetAABB,
  pathHitTest,
  pathGetAABB,
  labelHitTest,
  labelGetAABB,
  dimensionHitTest,
  dimensionGetAABB,
} from './elementAABB'

export interface AABB {
  x: number
  y: number
  w: number
  h: number
}

/** Dispatch hit test to the correct per-type implementation. */
export function hitTestElement(element: CanvasElement, worldX: number, worldY: number): boolean {
  switch (element.type) {
    case 'terrain':
      return terrainHitTest(element, worldX, worldY)
    case 'plant':
      return plantHitTest(element, worldX, worldY)
    case 'structure':
      return structureHitTest(element, worldX, worldY)
    case 'path':
      return pathHitTest(element, worldX, worldY)
    case 'label':
      return labelHitTest(element, worldX, worldY)
    case 'dimension':
      return dimensionHitTest(element, worldX, worldY)
    default:
      return false
  }
}

/** Dispatch AABB computation to the correct per-type implementation. */
export function getElementAABB(element: CanvasElement): AABB {
  switch (element.type) {
    case 'terrain':
      return terrainGetAABB(element)
    case 'plant':
      return plantGetAABB(element)
    case 'structure':
      return structureGetAABB(element)
    case 'path':
      return pathGetAABB(element)
    case 'label':
      return labelGetAABB(element)
    case 'dimension':
      return dimensionGetAABB(element)
    default: {
      const el = element as unknown as { x: number; y: number; width: number; height: number }
      return { x: el.x, y: el.y, w: el.width, h: el.height }
    }
  }
}

function getTypePriority(type: CanvasElement['type']): number {
  switch (type) {
    case 'terrain':
      return SELECTION_PRIORITY.terrain
    case 'path':
      return SELECTION_PRIORITY.paths
    case 'structure':
      return SELECTION_PRIORITY.structures
    case 'plant':
      return SELECTION_PRIORITY.plants
    case 'label':
      return SELECTION_PRIORITY.labels
    case 'dimension':
      return SELECTION_PRIORITY.dimensions
    default:
      return 0
  }
}

interface GetElementsAtPointOpts {
  skipLocked?: boolean
  skipHidden?: boolean
}

/**
 * Returns all elements at the given world point, sorted by priority (highest first).
 * An element is effectively locked if element.locked OR its layer is locked.
 * An element is effectively hidden if its layer is not visible.
 */
export function getElementsAtPoint(
  elements: CanvasElement[],
  layers: Layer[],
  worldX: number,
  worldY: number,
  opts?: GetElementsAtPointOpts,
): CanvasElement[] {
  const skipLocked = opts?.skipLocked ?? true
  const skipHidden = opts?.skipHidden ?? true

  const layerMap = new Map<string, Layer>()
  for (const layer of layers) {
    layerMap.set(layer.id, layer)
  }

  const hits: CanvasElement[] = []

  for (const el of elements) {
    const layer = layerMap.get(el.layerId)

    if (skipHidden && layer && !layer.visible) continue
    if (skipLocked && (el.locked || (layer && layer.locked))) continue

    if (hitTestElement(el, worldX, worldY)) {
      hits.push(el)
    }
  }

  // Sort by priority: highest type priority first, then higher zIndex, then later createdAt
  hits.sort((a, b) => {
    const priorityDiff = getTypePriority(b.type) - getTypePriority(a.type)
    if (priorityDiff !== 0) return priorityDiff

    const zDiff = b.zIndex - a.zIndex
    if (zDiff !== 0) return zDiff

    // Later createdAt wins (descending)
    return b.createdAt.localeCompare(a.createdAt)
  })

  return hits
}

/** Check if two AABBs intersect (overlap at all). */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

/** Check if outer AABB fully contains inner AABB. */
export function aabbContains(outer: AABB, inner: AABB): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  )
}

/** Compute the union AABB of multiple elements. */
export function getSelectionAABB(elements: CanvasElement[]): AABB {
  if (elements.length === 0) return { x: 0, y: 0, w: 0, h: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    const aabb = getElementAABB(el)
    minX = Math.min(minX, aabb.x)
    minY = Math.min(minY, aabb.y)
    maxX = Math.max(maxX, aabb.x + aabb.w)
    maxY = Math.max(maxY, aabb.y + aabb.h)
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
