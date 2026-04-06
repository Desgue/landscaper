import { describe, it, expect } from 'vitest'
import { snapToGrid, computeTolerance, snapPoint } from '../snapSystem'
import type { CanvasElement } from '../../types/schema'

// ─── snapToGrid ─────────────────────────────────────────────────────────────

describe('snapToGrid', () => {
  it('rounds down when closer to lower grid line', () => {
    expect(snapToGrid(274, 10)).toBe(270)
  })

  it('rounds up when closer to upper grid line', () => {
    expect(snapToGrid(276, 10)).toBe(280)
  })

  it('rounds up on exact midpoint (Math.round behavior)', () => {
    expect(snapToGrid(275, 10)).toBe(280)
  })

  it('returns exact value when already on grid', () => {
    expect(snapToGrid(200, 10)).toBe(200)
  })

  it('works with non-10 increments', () => {
    expect(snapToGrid(37, 25)).toBe(25)
    expect(snapToGrid(38, 25)).toBe(50)
  })
})

// ─── computeTolerance ───────────────────────────────────────────────────────

describe('computeTolerance', () => {
  it('returns 8 at zoom=1', () => {
    expect(computeTolerance(1)).toBe(8)
  })

  it('clamps to max 100 at very low zoom', () => {
    // 8 / 0.01 = 800, clamped to 100
    expect(computeTolerance(0.01)).toBe(100)
  })

  it('clamps to min 2 at very high zoom', () => {
    // 8 / 100 = 0.08, clamped to 2
    expect(computeTolerance(100)).toBe(2)
  })

  it('returns proportional value in normal range', () => {
    // 8 / 2 = 4, within [2, 100]
    expect(computeTolerance(2)).toBe(4)
  })
})

// ─── snapPoint ──────────────────────────────────────────────────────────────

function makeElement(overrides: Partial<CanvasElement>): CanvasElement {
  return {
    type: 'terrain',
    terrainTypeId: 'grass',
    id: '00000000-0000-0000-0000-000000000001',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    layerId: '00000000-0000-0000-0000-000000000099',
    groupId: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  } as CanvasElement
}

describe('snapPoint', () => {
  it('with no elements returns grid-snapped position', () => {
    const result = snapPoint(
      274, 276,
      'place', [], 1, 10, true, false,
    )
    expect(result.x).toBe(270)
    expect(result.y).toBe(280)
    expect(result.snapped).toBe(true)
    expect(result.guideLines).toHaveLength(0)
  })

  it('with snap disabled returns raw position', () => {
    const result = snapPoint(
      274, 276,
      'place', [], 1, 10, false, false,
    )
    expect(result.x).toBe(274)
    expect(result.y).toBe(276)
    expect(result.snapped).toBe(false)
    expect(result.guideLines).toHaveLength(0)
  })

  it('with nearby element returns geometry-snapped position within tolerance', () => {
    // Element at x=100, y=100, width=100, height=100
    // Candidates include x edges at 100 and 200, y edges at 100 and 200
    const el = makeElement({ x: 100, y: 100, width: 100, height: 100 })

    // Point near the left edge (x=100) of the element
    // tolerance at zoom=1 is 8, so 103 is within 8 of 100
    const result = snapPoint(
      103, 103,
      'place', [el], 1, 10, true, false,
    )
    expect(result.x).toBe(100)
    expect(result.y).toBe(100)
    expect(result.snapped).toBe(true)
    expect(result.guideLines.length).toBeGreaterThan(0)
  })

  it('alt modifier in place context disables snap', () => {
    // 'place' context has snap on by default; alt=true should toggle it off
    const result = snapPoint(
      274, 276,
      'place', [], 1, 10, true, true,
    )
    expect(result.x).toBe(274)
    expect(result.y).toBe(276)
    expect(result.snapped).toBe(false)
  })

  it('alt modifier in move context enables snap', () => {
    // 'move' context has snap off by default; alt=true should toggle it on
    const result = snapPoint(
      274, 276,
      'move', [], 1, 10, true, true,
    )
    expect(result.x).toBe(270)
    expect(result.y).toBe(280)
    expect(result.snapped).toBe(true)
  })

  it('move context without alt does not snap', () => {
    const result = snapPoint(
      274, 276,
      'move', [], 1, 10, true, false,
    )
    expect(result.x).toBe(274)
    expect(result.y).toBe(276)
    expect(result.snapped).toBe(false)
  })
})
