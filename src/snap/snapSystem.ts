import type { CanvasElement, SnapContext, SnapLine, SnapResult } from '../types/schema'
import { createLogger } from '../utils/logger'

const log = createLogger('SnapSystem')

// Grid snap: round value to nearest increment
// snap(274, 10) = 270, snap(276, 10) = 280, snap(275, 10) = 280
export function snapToGrid(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}

// Adaptive tolerance: 8px in screen space → world units
// Clamped to [2, 100] cm
export function computeTolerance(zoom: number): number {
  return Math.min(100, Math.max(2, 8 / zoom))
}

interface SnapCandidate {
  axis: 'x' | 'y'
  value: number
  elementCreatedAt: string
}

// Extract snap candidates from an element's geometry.
//
// Perpendicular alignment snap (per snap-system.md): For the current MVP,
// all elements are axis-aligned rectangles. Perpendicular to a horizontal
// edge is vertical and vice versa, so edge + midpoint candidates below
// fully cover perpendicular alignment for this element set. A general
// projection-based perpendicular snap (for rotated elements, arcs, and
// non-rectangular shapes) is deferred — see PLAN-A Phase A2 decision log.
function extractCandidates(element: CanvasElement): SnapCandidate[] {
  const { x, y, width, height, createdAt } = element
  const right = x + width
  const bottom = y + height
  const midX = x + width / 2
  const midY = y + height / 2

  return [
    // Edge alignment: left and right edges (x-axis candidates)
    { axis: 'x', value: x, elementCreatedAt: createdAt },
    { axis: 'x', value: right, elementCreatedAt: createdAt },
    // Edge alignment: top and bottom edges (y-axis candidates)
    { axis: 'y', value: y, elementCreatedAt: createdAt },
    { axis: 'y', value: bottom, elementCreatedAt: createdAt },
    // Perpendicular bisector of left/right edges (horizontal midpoint line)
    { axis: 'y', value: midY, elementCreatedAt: createdAt },
    // Perpendicular bisector of top/bottom edges (vertical midpoint line)
    { axis: 'x', value: midX, elementCreatedAt: createdAt },
  ]
}

// Main export: snaps a world point given context and nearby elements.
// context controls Alt-modifier default behavior per spec.
export function snapPoint(
  worldX: number,
  worldY: number,
  context: SnapContext,
  elements: CanvasElement[],
  zoom: number,
  snapIncrementCm: number,
  snapEnabled: boolean,
  altHeld: boolean,
): SnapResult {
  // Per snap-system.md § Alt Modifier Behavior:
  const snapOnByDefault = context === 'place' || context === 'resize'
  const snapActive = snapEnabled && (snapOnByDefault ? !altHeld : altHeld)
  if (!snapActive) return { x: worldX, y: worldY, snapped: false, guideLines: [] }

  const tolerance = computeTolerance(zoom)
  const searchRadius = tolerance * 3

  // Pass 1 — collect geometry snap candidates from nearby elements
  const allCandidates: SnapCandidate[] = []
  for (const element of elements) {
    const { x, y, width, height } = element
    const centerX = x + width / 2
    const centerY = y + height / 2
    const dx = worldX - centerX
    const dy = worldY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= searchRadius + Math.max(width, height) / 2) {
      allCandidates.push(...extractCandidates(element))
    }
  }

  // Pass 2 — resolve per axis
  const guideLines: SnapLine[] = []

  function resolveAxis(
    cursorValue: number,
    axis: 'x' | 'y',
    gridValue: number,
  ): number {
    const axisCandidates = allCandidates.filter((c) => c.axis === axis)

    // Filter to those within tolerance
    const withinTolerance = axisCandidates.filter(
      (c) => Math.abs(cursorValue - c.value) <= tolerance,
    )

    if (withinTolerance.length > 0) {
      // Pick closest; on tie, pick most recently created
      withinTolerance.sort((a, b) => {
        const distA = Math.abs(cursorValue - a.value)
        const distB = Math.abs(cursorValue - b.value)
        if (Math.abs(distA - distB) < 1) {
          // tie-break: most recently created wins (latest createdAt)
          return b.elementCreatedAt.localeCompare(a.elementCreatedAt)
        }
        return distA - distB
      })
      const winner = withinTolerance[0]
      guideLines.push({ axis, value: winner.value })
      return winner.value
    }

    // Fall back to grid snap
    return snapToGrid(gridValue, snapIncrementCm)
  }

  const snappedX = resolveAxis(worldX, 'x', worldX)
  const snappedY = resolveAxis(worldY, 'y', worldY)

  const result: SnapResult = {
    x: snappedX,
    y: snappedY,
    snapped: snappedX !== worldX || snappedY !== worldY,
    guideLines,
  }

  if (result.snapped) {
    log.debug('snapPoint', { x: worldX, y: worldY, snappedX, snappedY, candidateCount: allCandidates.length, guideCount: guideLines.length })
  }

  return result
}
