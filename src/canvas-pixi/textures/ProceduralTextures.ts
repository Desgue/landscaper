import { createNoise2D } from 'simplex-noise'

import { TILE_SIZE, FALLBACK_COLOR } from './constants'

// ---------------------------------------------------------------------------
// Known terrain types and their base colors
// ---------------------------------------------------------------------------

const TERRAIN_COLORS: Record<string, string> = {
  grass: '#4CAF50',
  soil: '#8B4513',
  'weed-wild': '#7CB342',
  sand: '#F9E076',
  concrete: '#BDBDBD',
  gravel: '#9E9E9E',
  pebbles: '#B0BEC5',
  'decking-surface': '#C8A96E',
  mulch: '#6D4C41',
  'bark-chips': '#8D6E63',
}

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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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
// Canvas creation helper
// ---------------------------------------------------------------------------

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

// ---------------------------------------------------------------------------
// Wrapped noise helper — ensures seamless tiling via toroidal mapping
// ---------------------------------------------------------------------------

function wrappedNoise2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  size: number,
  frequency: number,
): number {
  // Map 2D coords onto a torus in 4D for seamless wrapping
  const nx = x / size
  const ny = y / size
  const TWO_PI = Math.PI * 2
  const r = size / TWO_PI // radius so circumference = size
  const x1 = r * Math.cos(nx * TWO_PI) * frequency
  const y1 = r * Math.sin(nx * TWO_PI) * frequency
  const x2 = r * Math.cos(ny * TWO_PI) * frequency
  const y2 = r * Math.sin(ny * TWO_PI) * frequency
  // Use pairs — simplex-noise only has 2D, so we combine two calls
  return (noise(x1, x2) + noise(y1, y2)) * 0.5
}

// ---------------------------------------------------------------------------
// Per-terrain generators
// ---------------------------------------------------------------------------

function generateGrass(ctx: CanvasRenderingContext2D, size: number): void {
  const noise = createNoise2D()
  const noise2 = createNoise2D()
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 3-octave simplex for detail
      const n1 = wrappedNoise2D(noise, x, y, size, 0.04) * 0.5
      const n2 = wrappedNoise2D(noise, x, y, size, 0.08) * 0.3
      const n3 = wrappedNoise2D(noise2, x, y, size, 0.16) * 0.2
      const n = n1 + n2 + n3

      // Hue 95-110, Sat 45-55%, Light 28-38%
      const hue = 95 + n * 15
      const sat = 45 + n * 10
      const light = 28 + n * 10

      const [r, g, b] = hslToRgb(hue, sat, light)
      const idx = (y * size + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function generateSimplexTerrain(
  ctx: CanvasRenderingContext2D,
  size: number,
  baseHex: string,
  frequency: number,
  variation: number,
): void {
  const noise = createNoise2D()
  const [br, bg, bb] = hexToRgb(baseHex)
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = wrappedNoise2D(noise, x, y, size, frequency) * 0.6
      const n2 = wrappedNoise2D(noise, x, y, size, frequency * 2) * 0.4
      const n = (n1 + n2) * variation

      const idx = (y * size + x) * 4
      data[idx] = Math.max(0, Math.min(255, br + n * 255))
      data[idx + 1] = Math.max(0, Math.min(255, bg + n * 255))
      data[idx + 2] = Math.max(0, Math.min(255, bb + n * 255))
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function generateWeedWild(ctx: CanvasRenderingContext2D, size: number): void {
  const noise = createNoise2D()
  const noise2 = createNoise2D()
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = wrappedNoise2D(noise, x, y, size, 0.04) * 0.4
      const n2 = wrappedNoise2D(noise, x, y, size, 0.1) * 0.35
      const n3 = wrappedNoise2D(noise2, x, y, size, 0.2) * 0.25
      const n = n1 + n2 + n3

      // Wider hue range than grass: 80-130
      const hue = 80 + n * 50
      const sat = 40 + n * 15
      const light = 30 + n * 12

      const [r, g, b] = hslToRgb(hue, sat, light)
      const idx = (y * size + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function generateGravel(ctx: CanvasRenderingContext2D, size: number, baseHex: string): void {
  // Base fill
  const [br, bg, bb] = hexToRgb(baseHex)
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, size, size)

  // Seeded pseudo-random for deterministic output
  const noise = createNoise2D()
  const pebbleCount = Math.floor(size * size * 0.012)

  for (let i = 0; i < pebbleCount; i++) {
    // Use noise at different scales to get pseudo-random positions
    const px = ((noise(i * 0.1, 0) + 1) / 2) * size
    const py = ((noise(0, i * 0.1) + 1) / 2) * size
    const radius = 1.5 + ((noise(i * 0.2, i * 0.3) + 1) / 2) * 3
    const shade = ((noise(i * 0.15, i * 0.25) + 1) / 2) * 0.3 - 0.15

    const r = Math.max(0, Math.min(255, br + shade * 255))
    const g = Math.max(0, Math.min(255, bg + shade * 255))
    const b = Math.max(0, Math.min(255, bb + shade * 255))

    ctx.beginPath()
    ctx.arc(px % size, py % size, radius, 0, Math.PI * 2)
    ctx.fillStyle = rgbToHex(r, g, b)
    ctx.fill()
  }
}

function generatePebbles(ctx: CanvasRenderingContext2D, size: number): void {
  const baseHex = TERRAIN_COLORS['pebbles']!
  const [br, bg, bb] = hexToRgb(baseHex)
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, size, size)

  const noise = createNoise2D()
  const pebbleCount = Math.floor(size * size * 0.008)

  for (let i = 0; i < pebbleCount; i++) {
    const px = ((noise(i * 0.1, 1) + 1) / 2) * size
    const py = ((noise(1, i * 0.1) + 1) / 2) * size
    const radius = 2.5 + ((noise(i * 0.2, i * 0.3) + 1) / 2) * 4
    const shade = ((noise(i * 0.15, i * 0.25) + 1) / 2) * 0.25 - 0.1

    const r = Math.max(0, Math.min(255, br + shade * 255))
    const g = Math.max(0, Math.min(255, bg + shade * 255))
    const b = Math.max(0, Math.min(255, bb + shade * 255))

    ctx.beginPath()
    ctx.ellipse(px % size, py % size, radius, radius * 0.75, 0, 0, Math.PI * 2)
    ctx.fillStyle = rgbToHex(r, g, b)
    ctx.fill()

    // Subtle highlight on top
    ctx.beginPath()
    ctx.ellipse(px % size, (py % size) - radius * 0.2, radius * 0.4, radius * 0.25, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,0.15)`
    ctx.fill()
  }
}

function generateDecking(ctx: CanvasRenderingContext2D, size: number): void {
  const baseHex = TERRAIN_COLORS['decking-surface']!
  const [br, bg, bb] = hexToRgb(baseHex)
  const noise = createNoise2D()

  // Fill base color
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, size, size)

  // Horizontal plank lines
  const plankHeight = 12
  for (let py = 0; py < size; py += plankHeight) {
    // Gap line between planks
    ctx.fillStyle = `rgba(0,0,0,0.15)`
    ctx.fillRect(0, py, size, 1)
  }

  // Wood grain noise overlay
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Horizontal grain: high x-frequency, low y-frequency
      const n = wrappedNoise2D(noise, x, y, size, 0.08) * 0.12
      const idx = (y * size + x) * 4
      data[idx] = Math.max(0, Math.min(255, data[idx]! + n * 255))
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1]! + n * 200))
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2]! + n * 150))
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function generateMulch(ctx: CanvasRenderingContext2D, size: number): void {
  const baseHex = TERRAIN_COLORS['mulch']!
  const [br, bg, bb] = hexToRgb(baseHex)

  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, size, size)

  const noise = createNoise2D()
  const fiberCount = Math.floor(size * size * 0.015)

  for (let i = 0; i < fiberCount; i++) {
    const x = ((noise(i * 0.13, 2) + 1) / 2) * size
    const y = ((noise(2, i * 0.13) + 1) / 2) * size
    const angle = ((noise(i * 0.17, i * 0.19) + 1) / 2) * Math.PI
    const length = 3 + ((noise(i * 0.23, i * 0.29) + 1) / 2) * 6
    const shade = ((noise(i * 0.11, i * 0.31) + 1) / 2) * 0.4 - 0.2

    const r = Math.max(0, Math.min(255, br + shade * 255))
    const g = Math.max(0, Math.min(255, bg + shade * 255))
    const b = Math.max(0, Math.min(255, bb + shade * 255))

    ctx.save()
    ctx.translate(x % size, y % size)
    ctx.rotate(angle)
    ctx.strokeStyle = rgbToHex(r, g, b)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-length / 2, 0)
    ctx.lineTo(length / 2, 0)
    ctx.stroke()
    ctx.restore()
  }
}

function generateBarkChips(ctx: CanvasRenderingContext2D, size: number): void {
  const baseHex = TERRAIN_COLORS['bark-chips']!
  const [br, bg, bb] = hexToRgb(baseHex)

  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, size, size)

  const noise = createNoise2D()
  const chipCount = Math.floor(size * size * 0.006)

  for (let i = 0; i < chipCount; i++) {
    const x = ((noise(i * 0.11, 3) + 1) / 2) * size
    const y = ((noise(3, i * 0.11) + 1) / 2) * size
    const angle = ((noise(i * 0.17, i * 0.23) + 1) / 2) * Math.PI
    const w = 4 + ((noise(i * 0.19, i * 0.29) + 1) / 2) * 8
    const h = 2 + ((noise(i * 0.23, i * 0.31) + 1) / 2) * 4
    const hueShift = ((noise(i * 0.13, i * 0.37) + 1) / 2) * 20 - 10
    const lightShift = ((noise(i * 0.29, i * 0.41) + 1) / 2) * 20 - 10

    const [bh, bs, bl] = rgbToHsl(br, bg, bb)
    const [cr, cg, cb] = hslToRgb(bh + hueShift, bs, Math.max(10, Math.min(90, bl + lightShift)))

    ctx.save()
    ctx.translate(x % size, y % size)
    ctx.rotate(angle)
    ctx.fillStyle = rgbToHex(cr, cg, cb)
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a seamless terrain tile texture as an offscreen HTMLCanvasElement.
 *
 * @param terrainTypeId - One of the known terrain type IDs from builtinRegistries
 * @param size - Tile size in pixels (default: TILE_SIZE = 100)
 * @returns An offscreen canvas with the rendered texture
 */
export function generateTerrainTexture(
  terrainTypeId: string,
  size: number = TILE_SIZE,
): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(size)

  switch (terrainTypeId) {
    case 'grass':
      generateGrass(ctx, size)
      break
    case 'weed-wild':
      generateWeedWild(ctx, size)
      break
    case 'soil':
      generateSimplexTerrain(ctx, size, TERRAIN_COLORS['soil']!, 0.03, 0.18)
      break
    case 'sand':
      generateSimplexTerrain(ctx, size, TERRAIN_COLORS['sand']!, 0.05, 0.1)
      break
    case 'concrete':
      generateSimplexTerrain(ctx, size, TERRAIN_COLORS['concrete']!, 0.06, 0.06)
      break
    case 'gravel':
      generateGravel(ctx, size, TERRAIN_COLORS['gravel']!)
      break
    case 'pebbles':
      generatePebbles(ctx, size)
      break
    case 'decking-surface':
      generateDecking(ctx, size)
      break
    case 'mulch':
      generateMulch(ctx, size)
      break
    case 'bark-chips':
      generateBarkChips(ctx, size)
      break
    default: {
      // Unknown terrain type — fill with base color if available, else fallback
      const color = TERRAIN_COLORS[terrainTypeId] ?? FALLBACK_COLOR
      if (!TERRAIN_COLORS[terrainTypeId]) {
        console.warn(
          `[ProceduralTextures] Unknown terrain type "${terrainTypeId}", using fallback color`,
        )
      }
      ctx.fillStyle = color
      ctx.fillRect(0, 0, size, size)
      break
    }
  }

  return canvas
}

/** Returns the set of all known terrain type IDs. */
export function getKnownTerrainTypes(): ReadonlySet<string> {
  return new Set(Object.keys(TERRAIN_COLORS))
}
