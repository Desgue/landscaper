/**
 * DrawingUtils — Shared color manipulation and deterministic variation helpers.
 *
 * Consolidated from PlantSprites.ts, StructureSprites.ts, and ProceduralTextures.ts
 * to eliminate duplicated color logic across procedural texture generators.
 */

// ---------------------------------------------------------------------------
// Color conversion
// ---------------------------------------------------------------------------

/** Parse a hex color string to [r, g, b] (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/** Convert RGB channels (0-255) to a hex color string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to RGB (0-255). */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/** Convert RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100). */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s * 100, l * 100]
}

// ---------------------------------------------------------------------------
// Color manipulation
// ---------------------------------------------------------------------------

/** Lighten a hex color by adding a flat RGB offset (from PlantSprites). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}

/**
 * Darken a hex color by subtracting a flat RGB offset.
 * Origin: PlantSprites — subtracts a fixed integer from each channel.
 */
export function darkenByOffset(hex: string, amount: number): string {
  return lighten(hex, -amount)
}

/**
 * Darken a hex color by multiplying each channel by a 0-1 factor.
 * Origin: StructureSprites — scales channels proportionally.
 */
export function darkenByFactor(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

/**
 * Shift a hex color's HSL hue by a given number of degrees.
 */
export function shiftHue(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  const newH = ((h + degrees) % 360 + 360) % 360
  const [nr, ng, nb] = hslToRgb(newH, s, l)
  return rgbToHex(nr, ng, nb)
}

// ---------------------------------------------------------------------------
// Deterministic variation
// ---------------------------------------------------------------------------

/** djb2 hash — deterministic integer from a string for per-type variation seeding. */
export function hashString(s: string): number {
  let hash = 5381
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0
  }
  return hash >>> 0 // ensure unsigned
}

/**
 * Simple PRNG seeded from a number.
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function seededRandom(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state * 1664525 + 1013904223) | 0
    return (state >>> 0) / 0x100000000
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/**
 * Draw a subtle white arc highlight for directional light effect.
 * Renders a crescent on the upper-left of a circular shape.
 *
 * @param ctx - Canvas 2D context
 * @param cx - Center x
 * @param cy - Center y
 * @param radius - Radius of the shape
 * @param angle - Light direction angle in radians (default: upper-left, -PI*0.75)
 */
export function drawRimHighlight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angle: number = -Math.PI * 0.75,
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, radius * 0.06)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.85, angle - 0.6, angle + 0.6)
  ctx.stroke()
  ctx.restore()
}
