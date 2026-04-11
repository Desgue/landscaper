/**
 * Structure sprite generator with per-category texture patterns.
 * Renders textured rectangles with a south-face extrusion strip.
 * Each structure category gets a distinct procedural texture:
 *   boundary → brick/wood/metal/stone patterns
 *   container → wood plank grain with soil top
 *   surface → stone tile grid
 *   overhead → crosshatch lattice
 *   feature → ripples or radial gradient
 *   furniture → wood grain or brushed metal
 */

import { EXTRUSION_SCALE, MAX_STRUCTURE_TEX_DIM } from './constants'
import {
  darkenByFactor,
  lighten,
  darkenByOffset,
  shiftHue,
  hashString,
  seededRandom,
} from './DrawingUtils'

// ---------------------------------------------------------------------------
// Token-driven colors — overridden by updateStructureColors()
// ---------------------------------------------------------------------------

let SOIL_COLOR = '#6D4C41'
let FIRE_PIT_COLOR = '#FF6F00'

/** Update structure colors from canvas tokens. Called by StructureRenderer.setTokens(). */
export function updateStructureColors(colors: { soil: string; texture: string }): void {
  SOIL_COLOR = colors.soil
  FIRE_PIT_COLOR = colors.texture
}

// ---------------------------------------------------------------------------
// Canvas creation helper
// ---------------------------------------------------------------------------

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

// ---------------------------------------------------------------------------
// Category texture drawers
// ---------------------------------------------------------------------------

function drawBoundaryTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  rng: () => number,
  material?: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  switch (material) {
    case 'wood': {
      // Plank fence pattern — vertical planks with gaps
      const plankW = 8 + Math.floor(rng() * 4)
      for (let x = 0; x < w; x += plankW) {
        // Per-plank hue variation
        const plankColor = shiftHue(color, rng() * 10 - 5)
        ctx.fillStyle = plankColor
        ctx.fillRect(x, 0, plankW - 1, h)

        // Vertical grain lines
        ctx.strokeStyle = darkenByFactor(plankColor, 0.85)
        ctx.lineWidth = 0.5
        for (let gx = x + 2; gx < x + plankW - 2; gx += 3) {
          ctx.beginPath()
          ctx.moveTo(gx, 0)
          ctx.lineTo(gx + (rng() - 0.5) * 2, h)
          ctx.stroke()
        }
      }
      break
    }

    case 'metal': {
      // Smooth with rivet dots
      ctx.fillStyle = color
      ctx.fillRect(0, 0, w, h)

      // Brushed horizontal lines
      ctx.strokeStyle = lighten(color, 8)
      ctx.lineWidth = 0.3
      for (let y = 0; y < h; y += 2) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Rivet dots at regular intervals
      const spacing = 12 + Math.floor(rng() * 4)
      ctx.fillStyle = darkenByOffset(color, 20)
      for (let rx = spacing / 2; rx < w; rx += spacing) {
        for (let ry = spacing / 2; ry < h; ry += spacing) {
          ctx.beginPath()
          ctx.arc(rx, ry, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }

    case 'stone': {
      // Irregular stone pattern
      const stoneRows = Math.max(2, Math.floor(h / 12))
      const rowH = h / stoneRows
      for (let row = 0; row < stoneRows; row++) {
        const y = row * rowH
        const stonesInRow = 2 + Math.floor(rng() * 3)
        const stoneW = w / stonesInRow
        for (let col = 0; col < stonesInRow; col++) {
          const sx = col * stoneW + (rng() - 0.5) * 2
          const sw = stoneW - 2 + rng() * 2
          const sh = rowH - 2 + rng()

          ctx.fillStyle = shiftHue(color, rng() * 12 - 6)
          ctx.fillRect(sx + 1, y + 1, sw - 1, sh)
        }

        // Mortar line between rows
        ctx.fillStyle = darkenByOffset(color, 25)
        ctx.fillRect(0, y, w, 1)
      }
      break
    }

    default: {
      // Masonry — brick-row pattern with mortar gaps and half-brick offset
      const brickH = 6 + Math.floor(rng() * 3)
      const brickW = 12 + Math.floor(rng() * 6)
      const mortarW = 1

      for (let row = 0; row * brickH < h; row++) {
        const y = row * brickH
        const offset = row % 2 === 1 ? brickW / 2 : 0

        for (let bx = -offset; bx < w; bx += brickW) {
          const bColor = shiftHue(color, rng() * 8 - 4)
          ctx.fillStyle = bColor
          ctx.fillRect(
            Math.max(0, bx + mortarW), y + mortarW,
            brickW - mortarW * 2, brickH - mortarW,
          )
        }

        // Horizontal mortar line
        ctx.fillStyle = darkenByOffset(color, 20)
        ctx.fillRect(0, y, w, mortarW)
      }
      break
    }
  }
}

function drawContainerTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  rng: () => number,
  material?: string,
): void {
  if (material === 'masonry' || material === 'stone') {
    // Stone planter variant
    drawBoundaryTexture(ctx, w, h, color, rng, 'stone')
    return
  }

  // Wood plank grain on sides
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  // Horizontal plank lines
  const plankH = 6 + Math.floor(rng() * 3)
  for (let y = 0; y < h; y += plankH) {
    ctx.fillStyle = darkenByOffset(color, 5)
    ctx.fillRect(0, y, w, 1)

    // Sinusoidal grain noise lines within each plank
    ctx.strokeStyle = darkenByFactor(color, 0.88)
    ctx.lineWidth = 0.4
    const grainCount = 2 + Math.floor(rng() * 2)
    for (let g = 0; g < grainCount; g++) {
      const grainY = y + 2 + g * (plankH / (grainCount + 1))
      ctx.beginPath()
      for (let x = 0; x < w; x += 2) {
        const dy = Math.sin(x * 0.15 + rng() * 6) * 1.5
        if (x === 0) ctx.moveTo(x, grainY + dy)
        else ctx.lineTo(x, grainY + dy)
      }
      ctx.stroke()
    }
  }

  // Soil-noise fill on top portion (top 30%)
  const soilH = Math.floor(h * 0.3)
  const soilColor = SOIL_COLOR
  ctx.fillStyle = soilColor
  ctx.fillRect(0, 0, w, soilH)

  // Add soil speckle noise
  for (let i = 0; i < soilH * w * 0.02; i++) {
    const sx = rng() * w
    const sy = rng() * soilH
    const shade = rng() * 30 - 15
    ctx.fillStyle = shade > 0 ? lighten(soilColor, shade) : darkenByOffset(soilColor, -shade)
    ctx.fillRect(sx, sy, 1 + rng(), 1 + rng())
  }
}

function drawSurfaceTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  rng: () => number,
): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  // Stone tile grid with thin mortar lines
  const tileSize = 10 + Math.floor(rng() * 6)
  const mortarColor = darkenByOffset(color, 18)

  for (let ty = 0; ty < h; ty += tileSize) {
    for (let tx = 0; tx < w; tx += tileSize) {
      // Per-tile hue variation
      const tileColor = shiftHue(color, rng() * 10 - 5)
      ctx.fillStyle = tileColor
      ctx.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2)
    }

    // Horizontal mortar
    ctx.fillStyle = mortarColor
    ctx.fillRect(0, ty, w, 1)
  }

  // Vertical mortar lines
  ctx.fillStyle = mortarColor
  for (let tx = 0; tx < w; tx += tileSize) {
    ctx.fillRect(tx, 0, 1, h)
  }
}

function drawOverheadTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  _rng: () => number,
): void {
  // Semi-transparent fill
  ctx.fillStyle = color
  ctx.globalAlpha = 0.35
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1.0

  // Crosshatch lattice lines
  const spacing = 8
  ctx.strokeStyle = darkenByFactor(color, 0.7)
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.5

  // Diagonal lines (NW-SE)
  for (let d = -h; d < w + h; d += spacing) {
    ctx.beginPath()
    ctx.moveTo(d, 0)
    ctx.lineTo(d + h, h)
    ctx.stroke()
  }

  // Diagonal lines (NE-SW)
  for (let d = -h; d < w + h; d += spacing) {
    ctx.beginPath()
    ctx.moveTo(d + h, 0)
    ctx.lineTo(d, h)
    ctx.stroke()
  }

  ctx.globalAlpha = 1.0
}

function drawFeatureTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  rng: () => number,
): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const maxR = Math.min(w, h) / 2

  // Determine sub-type from rng: water feature vs fire pit
  const isWater = rng() > 0.4

  if (isWater) {
    // Concentric ripple rings
    const ringCount = 3 + Math.floor(rng() * 3)
    for (let i = ringCount; i >= 1; i--) {
      const r = maxR * (i / ringCount)
      ctx.strokeStyle = lighten(color, 15 + i * 5)
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.4 + (i / ringCount) * 0.3
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
  } else {
    // Warm radial gradient for fire pits
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.8)
    gradient.addColorStop(0, FIRE_PIT_COLOR)
    gradient.addColorStop(0.4, lighten(FIRE_PIT_COLOR, 15))
    gradient.addColorStop(0.8, darkenByFactor(color, 0.8))
    gradient.addColorStop(1, color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }
}

function drawFurnitureTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  rng: () => number,
  material?: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  if (material === 'metal') {
    // Brushed steel lines — horizontal
    ctx.strokeStyle = lighten(color, 10)
    ctx.lineWidth = 0.3
    for (let y = 0; y < h; y += 1.5) {
      ctx.globalAlpha = 0.3 + rng() * 0.2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
  } else {
    // Wood — horizontal grain with knot patterns
    ctx.strokeStyle = darkenByFactor(color, 0.85)
    ctx.lineWidth = 0.5

    // Grain lines
    for (let y = 2; y < h; y += 3) {
      ctx.beginPath()
      for (let x = 0; x < w; x += 2) {
        const dy = Math.sin(x * 0.1 + y * 0.3 + rng() * 3) * 1.2
        if (x === 0) ctx.moveTo(x, y + dy)
        else ctx.lineTo(x, y + dy)
      }
      ctx.stroke()
    }

    // Occasional knot patterns (0-2)
    const knotCount = Math.floor(rng() * 3)
    for (let k = 0; k < knotCount; k++) {
      const kx = 4 + rng() * (w - 8)
      const ky = 4 + rng() * (h - 8)
      const kr = 2 + rng() * 2

      ctx.strokeStyle = darkenByOffset(color, 20)
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.ellipse(kx, ky, kr, kr * 0.6, rng() * Math.PI, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a textured structure sprite with a south-face extrusion strip.
 *
 * @param color - Base color (hex string, e.g. '#888888')
 * @param widthPx - Width of the structure in pixels
 * @param heightPx - Height of the top face in pixels
 * @param category - Structure category for texture dispatch
 * @param typeId - Optional type ID for per-type variation seeding
 * @param material - Optional material for sub-dispatch within category
 * @returns An offscreen HTMLCanvasElement with the rendered sprite
 */
export function generateStructureSprite(
  color: string,
  widthPx: number,
  heightPx: number,
  category?: string,
  typeId?: string,
  material?: string,
): HTMLCanvasElement {
  widthPx = Math.max(8, Math.min(widthPx, MAX_STRUCTURE_TEX_DIM))
  heightPx = Math.max(8, Math.min(heightPx, MAX_STRUCTURE_TEX_DIM))
  const extrusionHeight = Math.round(heightPx * EXTRUSION_SCALE)
  const totalHeight = heightPx + extrusionHeight

  const [canvas, ctx] = createCanvas(widthPx, totalHeight)

  // Seed PRNG for deterministic per-type variation
  const seed = typeId ? hashString(typeId) : 0
  const rng = seededRandom(seed)

  // Draw textured top face based on category
  switch (category) {
    case 'boundary':
      drawBoundaryTexture(ctx, widthPx, heightPx, color, rng, material)
      break
    case 'container':
      drawContainerTexture(ctx, widthPx, heightPx, color, rng, material)
      break
    case 'surface':
      drawSurfaceTexture(ctx, widthPx, heightPx, color, rng)
      break
    case 'overhead':
      drawOverheadTexture(ctx, widthPx, heightPx, color, rng)
      break
    case 'feature':
      drawFeatureTexture(ctx, widthPx, heightPx, color, rng)
      break
    case 'furniture':
      drawFurnitureTexture(ctx, widthPx, heightPx, color, rng, material)
      break
    default:
      // Unknown category — flat fill
      ctx.fillStyle = color
      ctx.fillRect(0, 0, widthPx, heightPx)
      break
  }

  // 1px highlight line along top edge of top face (bevel/edge catch)
  ctx.strokeStyle = lighten(color, 30)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0.5)
  ctx.lineTo(widthPx, 0.5)
  ctx.stroke()

  // South-face extrusion strip with vertical gradient (light top → dark bottom)
  const southGradient = ctx.createLinearGradient(0, heightPx, 0, totalHeight)
  southGradient.addColorStop(0, darkenByFactor(color, 0.7))
  southGradient.addColorStop(1, darkenByFactor(color, 0.5))
  ctx.fillStyle = southGradient
  ctx.fillRect(0, heightPx, widthPx, extrusionHeight)

  return canvas
}
