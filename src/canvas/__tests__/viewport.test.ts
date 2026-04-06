import { describe, it, expect } from 'vitest'
import {
  toScreen,
  toWorld,
  clampZoom,
  fitToView,
  zoomTowardCursor,
  ZOOM_MIN,
  ZOOM_MAX,
} from '../viewport'

// ─── toScreen ───────────────────────────────────────────────────────────────

describe('toScreen', () => {
  it('identity transform (zoom=1, pan=0,0)', () => {
    expect(toScreen(100, 200, 0, 0, 1)).toEqual({ x: 100, y: 200 })
  })

  it('applies pan offset', () => {
    expect(toScreen(100, 200, 50, 30, 1)).toEqual({ x: 150, y: 230 })
  })

  it('applies zoom', () => {
    expect(toScreen(100, 200, 0, 0, 2)).toEqual({ x: 200, y: 400 })
  })

  it('applies pan and zoom together', () => {
    expect(toScreen(100, 200, 10, 20, 0.5)).toEqual({ x: 60, y: 120 })
  })
})

// ─── toWorld ────────────────────────────────────────────────────────────────

describe('toWorld', () => {
  it('identity transform (zoom=1, pan=0,0)', () => {
    expect(toWorld(100, 200, 0, 0, 1)).toEqual({ x: 100, y: 200 })
  })

  it('applies inverse pan offset', () => {
    expect(toWorld(150, 230, 50, 30, 1)).toEqual({ x: 100, y: 200 })
  })

  it('applies inverse zoom', () => {
    expect(toWorld(200, 400, 0, 0, 2)).toEqual({ x: 100, y: 200 })
  })
})

// ─── roundtrip ──────────────────────────────────────────────────────────────

describe('toScreen/toWorld roundtrip', () => {
  it('toWorld(toScreen(x,y)) returns original coordinates', () => {
    const panX = 37
    const panY = -42
    const zoom = 1.7
    const worldX = 123.45
    const worldY = -678.9
    const screen = toScreen(worldX, worldY, panX, panY, zoom)
    const back = toWorld(screen.x, screen.y, panX, panY, zoom)
    expect(back.x).toBeCloseTo(worldX, 10)
    expect(back.y).toBeCloseTo(worldY, 10)
  })

  it('toScreen(toWorld(sx,sy)) returns original screen coordinates', () => {
    const panX = -100
    const panY = 50
    const zoom = 3.0
    const sx = 500
    const sy = 300
    const world = toWorld(sx, sy, panX, panY, zoom)
    const back = toScreen(world.x, world.y, panX, panY, zoom)
    expect(back.x).toBeCloseTo(sx, 10)
    expect(back.y).toBeCloseTo(sy, 10)
  })
})

// ─── clampZoom ──────────────────────────────────────────────────────────────

describe('clampZoom', () => {
  it('below min returns ZOOM_MIN (0.05)', () => {
    expect(clampZoom(0.001)).toBe(ZOOM_MIN)
    expect(clampZoom(-1)).toBe(ZOOM_MIN)
  })

  it('above max returns ZOOM_MAX (10.0)', () => {
    expect(clampZoom(20)).toBe(ZOOM_MAX)
    expect(clampZoom(100)).toBe(ZOOM_MAX)
  })

  it('within range passes through unchanged', () => {
    expect(clampZoom(1)).toBe(1)
    expect(clampZoom(5)).toBe(5)
    expect(clampZoom(ZOOM_MIN)).toBe(ZOOM_MIN)
    expect(clampZoom(ZOOM_MAX)).toBe(ZOOM_MAX)
  })
})

// ─── fitToView ──────────────────────────────────────────────────────────────

describe('fitToView', () => {
  it('no elements returns centered 1000cm default view', () => {
    const vp = fitToView([], 800, 600)
    // zoom = clamp(min(800/1000, 600/1000)) = clamp(0.6) = 0.6
    expect(vp.zoom).toBeCloseTo(0.6, 5)
    // panX = 800/2 - (1000/2)*0.6 = 400 - 300 = 100
    expect(vp.panX).toBeCloseTo(100, 5)
    // panY = 600/2 - (1000/2)*0.6 = 300 - 300 = 0
    expect(vp.panY).toBeCloseTo(0, 5)
  })

  it('single element centers on it', () => {
    const el = { x: 100, y: 100, width: 200, height: 200 }
    const vp = fitToView([el], 800, 600)
    // AABB: minX=100, maxX=300, minY=100, maxY=300
    // rawW=200, rawH=200
    // padX = max(200*0.1, 100) = 100, padY = 100
    // aabbW = 200+200=400, aabbH = 200+200=400
    // center = (200, 200)
    // zoom = clamp(min(800/400, 600/400)) = clamp(1.5) = 1.5
    expect(vp.zoom).toBeCloseTo(1.5, 5)
    // panX = 800/2 - 200*1.5 = 400 - 300 = 100
    expect(vp.panX).toBeCloseTo(100, 5)
    // panY = 600/2 - 200*1.5 = 300 - 300 = 0
    expect(vp.panY).toBeCloseTo(0, 5)
  })
})

// ─── zoomTowardCursor ───────────────────────────────────────────────────────

describe('zoomTowardCursor', () => {
  it('preserves cursor world position after zoom change', () => {
    const cursorX = 400
    const cursorY = 300
    const oldPanX = 50
    const oldPanY = 25
    const oldZoom = 1.0
    const newZoom = 2.0

    // World point under cursor before zoom
    const worldBefore = toWorld(cursorX, cursorY, oldPanX, oldPanY, oldZoom)

    const { panX, panY } = zoomTowardCursor(
      cursorX,
      cursorY,
      oldPanX,
      oldPanY,
      oldZoom,
      newZoom,
    )

    // World point under cursor after zoom should be the same
    const worldAfter = toWorld(cursorX, cursorY, panX, panY, newZoom)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10)
  })

  it('zoom out also preserves cursor position', () => {
    const cursorX = 200
    const cursorY = 150
    const oldPanX = -30
    const oldPanY = 80
    const oldZoom = 3.0
    const newZoom = 0.5

    const worldBefore = toWorld(cursorX, cursorY, oldPanX, oldPanY, oldZoom)
    const { panX, panY } = zoomTowardCursor(
      cursorX,
      cursorY,
      oldPanX,
      oldPanY,
      oldZoom,
      newZoom,
    )
    const worldAfter = toWorld(cursorX, cursorY, panX, panY, newZoom)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10)
  })
})
