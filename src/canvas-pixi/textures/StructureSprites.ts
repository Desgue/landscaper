/**
 * Placeholder structure sprite generator.
 * Renders colored rectangles with a south-face extrusion strip.
 */

import { EXTRUSION_SCALE } from './constants'

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a placeholder structure sprite with a south-face extrusion strip.
 *
 * The returned canvas is sized to fit the top face plus the extrusion below it.
 *
 * @param color - Base color (hex string, e.g. '#888888')
 * @param widthPx - Width of the structure in pixels
 * @param heightPx - Height of the top face in pixels
 * @returns An offscreen HTMLCanvasElement with the rendered sprite
 */
export function generateStructureSprite(
  color: string,
  widthPx: number,
  heightPx: number,
): HTMLCanvasElement {
  widthPx = Math.max(8, Math.min(widthPx, 512))
  heightPx = Math.max(8, Math.min(heightPx, 512))
  const extrusionHeight = Math.round(heightPx * EXTRUSION_SCALE)
  const totalHeight = heightPx + extrusionHeight

  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!

  // Top face
  ctx.fillStyle = color
  ctx.fillRect(0, 0, widthPx, heightPx)

  // South-face extrusion strip (darker shade)
  ctx.fillStyle = darken(color, 0.6)
  ctx.fillRect(0, heightPx, widthPx, extrusionHeight)

  return canvas
}
