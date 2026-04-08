/**
 * Illustrated plant sprite generator.
 * Renders category-coded shapes with per-type variation onto offscreen canvases.
 * Uses hashString(typeId) to seed a PRNG for deterministic visual differences
 * between plant types within the same category.
 */

import {
  lighten,
  darkenByOffset,
  shiftHue,
  hashString,
  seededRandom,
  drawRimHighlight,
} from './DrawingUtils'
import type { PlantType } from '../../types/schema'

// ---------------------------------------------------------------------------
// Category color mapping
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  vegetable: '#4CAF50',
  herb: '#81C784',
  fruit: '#FF9800',
  flower: '#E91E63',
  tree: '#795548',
  shrub: '#9CCC65',
}

const FALLBACK_PLANT_COLOR = '#4CAF50'

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
// Shadow helper (Canvas2D radial gradient — keep as-is per plan)
// ---------------------------------------------------------------------------

function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canopyRadius: number,
): void {
  const shadowOffsetY = canopyRadius * 0.3
  const rx = canopyRadius * 0.5
  const ry = canopyRadius * 0.2

  const gradient = ctx.createRadialGradient(
    cx, cy + shadowOffsetY, 0,
    cx, cy + shadowOffsetY, rx,
  )
  gradient.addColorStop(0, 'rgba(0,0,0,0.33)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')

  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(cx, cy + shadowOffsetY, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Radial dome gradient overlay (darker edges, lighter center)
// ---------------------------------------------------------------------------

function drawDomeGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  gradient.addColorStop(0, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(0.6, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Illustrated shape drawers per category
// ---------------------------------------------------------------------------

function drawTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // Brown trunk circle at center
  const trunkRadius = radius * 0.12
  ctx.fillStyle = '#5D4037'
  ctx.beginPath()
  ctx.arc(cx, cy, trunkRadius, 0, Math.PI * 2)
  ctx.fill()

  // 3-7 overlapping leaf-cluster blobs
  const blobCount = 3 + Math.floor(rng() * 5)
  for (let i = 0; i < blobCount; i++) {
    const angle = (i / blobCount) * Math.PI * 2 + rng() * 0.4
    const dist = radius * (0.2 + rng() * 0.35)
    const blobR = radius * (0.4 + rng() * 0.25)
    const bx = cx + Math.cos(angle) * dist
    const by = cy + Math.sin(angle) * dist

    // Outer dark edge
    ctx.fillStyle = darkenByOffset(color, 25 + Math.floor(rng() * 15))
    ctx.beginPath()
    ctx.arc(bx, by, blobR, 0, Math.PI * 2)
    ctx.fill()

    // Inner lighter center
    ctx.fillStyle = lighten(color, 20 + Math.floor(rng() * 20))
    ctx.beginPath()
    ctx.arc(bx, by, blobR * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }

  // Dome gradient overlay
  drawDomeGradient(ctx, cx, cy, radius)

  // Rim highlight
  drawRimHighlight(ctx, cx, cy, radius)
}

function drawShrub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // 3-5 overlapping ellipses at seeded positions
  const lobeCount = 3 + Math.floor(rng() * 3)
  const oblong = rng() > 0.5 // round vs oblong silhouette

  for (let i = 0; i < lobeCount; i++) {
    const angle = (i / lobeCount) * Math.PI * 2 + rng() * 0.5
    const dist = radius * (0.15 + rng() * 0.25)
    const lx = cx + Math.cos(angle) * dist
    const ly = cy + Math.sin(angle) * dist
    const rx = radius * (0.45 + rng() * 0.2)
    const ry = oblong ? rx * (0.6 + rng() * 0.3) : rx

    // Dark lobe body
    ctx.fillStyle = darkenByOffset(color, 15 + Math.floor(rng() * 15))
    ctx.beginPath()
    ctx.ellipse(lx, ly, rx, ry, rng() * Math.PI, 0, Math.PI * 2)
    ctx.fill()

    // Highlight crescent per lobe
    ctx.fillStyle = lighten(color, 25 + Math.floor(rng() * 15))
    ctx.beginPath()
    ctx.ellipse(
      lx - rx * 0.15, ly - ry * 0.15,
      rx * 0.4, ry * 0.4,
      0, 0, Math.PI * 2,
    )
    ctx.fill()
  }

  // Dome gradient
  drawDomeGradient(ctx, cx, cy, radius * 0.8)

  // Rim highlight
  drawRimHighlight(ctx, cx, cy, radius * 0.75)
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // 5-8 petals
  const petalCount = 5 + Math.floor(rng() * 4)
  const petalLength = radius * 0.7
  const petalWidth = radius * (0.25 + rng() * 0.1)

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    // Petal shape
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(petalWidth, -petalLength * 0.5, 0, -petalLength)
    ctx.quadraticCurveTo(-petalWidth, -petalLength * 0.5, 0, 0)
    ctx.closePath()
    ctx.fillStyle = i % 2 === 0 ? color : lighten(color, 20)
    ctx.fill()

    // Petal vein stroke (darker line down center)
    ctx.strokeStyle = darkenByOffset(color, 40)
    ctx.lineWidth = Math.max(0.5, radius * 0.02)
    ctx.beginPath()
    ctx.moveTo(0, -radius * 0.08)
    ctx.lineTo(0, -petalLength * 0.85)
    ctx.stroke()

    ctx.restore()
  }

  // Center dot — varied color from hash
  const centerColors = ['#FDD835', '#FF9800', '#795548']
  const centerColor = centerColors[Math.floor(rng() * centerColors.length)]
  ctx.fillStyle = centerColor
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Center highlight
  ctx.fillStyle = lighten(centerColor, 40)
  ctx.beginPath()
  ctx.arc(cx - radius * 0.05, cy - radius * 0.05, radius * 0.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawVegetable(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // Soil-circle base
  const baseR = radius * 0.65
  ctx.fillStyle = '#8B6E53'
  ctx.beginPath()
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
  ctx.fill()

  // 4-6 radiating leaf shapes over soil base
  const leafCount = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 + rng() * 0.3
    const leafLen = radius * (0.55 + rng() * 0.2)
    const leafW = radius * (0.18 + rng() * 0.08)
    const shade = Math.floor(rng() * 20) - 10

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    // Leaf body
    ctx.fillStyle = shade > 0 ? lighten(color, shade) : darkenByOffset(color, -shade)
    ctx.beginPath()
    ctx.ellipse(0, -leafLen * 0.45, leafW, leafLen * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Center vein
    ctx.strokeStyle = darkenByOffset(color, 30)
    ctx.lineWidth = Math.max(0.5, radius * 0.02)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -leafLen * 0.75)
    ctx.stroke()

    ctx.restore()
  }

  // Dome gradient
  drawDomeGradient(ctx, cx, cy, radius * 0.7)
}

function drawHerb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // Central stem
  ctx.strokeStyle = darkenByOffset(color, 30)
  ctx.lineWidth = Math.max(1, radius * 0.04)
  ctx.beginPath()
  ctx.moveTo(cx, cy + radius * 0.3)
  ctx.lineTo(cx, cy - radius * 0.1)
  ctx.stroke()

  // 3-5 elongated leaves from central stem
  const leafCount = 3 + Math.floor(rng() * 3)
  const spreadBase = 0.3 + rng() * 0.4 // angle spread variation

  for (let i = 0; i < leafCount; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const leafAngle = side * (spreadBase + rng() * 0.3)
    const stemY = cy + radius * (0.15 - i * 0.12)
    const leafLen = radius * (0.5 + rng() * 0.25)
    const leafW = radius * (0.08 + rng() * 0.05)
    const shade = Math.floor(rng() * 15) - 5

    ctx.save()
    ctx.translate(cx, stemY)
    ctx.rotate(leafAngle)

    // Elongated leaf
    ctx.fillStyle = shade > 0 ? lighten(color, shade) : darkenByOffset(color, -shade)
    ctx.beginPath()
    ctx.ellipse(0, -leafLen * 0.4, leafW, leafLen * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Center vein stroke
    ctx.strokeStyle = darkenByOffset(color, 25)
    ctx.lineWidth = Math.max(0.4, radius * 0.015)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -leafLen * 0.7)
    ctx.stroke()

    ctx.restore()
  }

  // Dome gradient
  drawDomeGradient(ctx, cx, cy, radius * 0.6)
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  rng: () => number,
): void {
  // Small tree-like canopy
  const canopyR = radius * 0.75

  // Trunk
  ctx.fillStyle = '#6D4C41'
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2)
  ctx.fill()

  // Canopy base
  ctx.fillStyle = '#558B2F'
  ctx.beginPath()
  ctx.arc(cx, cy, canopyR, 0, Math.PI * 2)
  ctx.fill()

  // Canopy highlight
  ctx.fillStyle = lighten('#558B2F', 25)
  ctx.beginPath()
  ctx.arc(cx, cy, canopyR * 0.55, 0, Math.PI * 2)
  ctx.fill()

  // 2-4 colored fruit dots
  const fruitCount = 2 + Math.floor(rng() * 3)
  for (let i = 0; i < fruitCount; i++) {
    const angle = rng() * Math.PI * 2
    const dist = canopyR * (0.25 + rng() * 0.35)
    const fx = cx + Math.cos(angle) * dist
    const fy = cy + Math.sin(angle) * dist
    const dotR = radius * (0.08 + rng() * 0.04)

    // Fruit dot color derived from category color (orange/red tones)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(fx, fy, dotR, 0, Math.PI * 2)
    ctx.fill()

    // Tiny highlight on fruit
    ctx.fillStyle = lighten(color, 50)
    ctx.beginPath()
    ctx.arc(fx - dotR * 0.2, fy - dotR * 0.2, dotR * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Dome gradient
  drawDomeGradient(ctx, cx, cy, canopyR)

  // Rim highlight
  drawRimHighlight(ctx, cx, cy, canopyR)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an illustrated plant sprite canvas.
 *
 * @param category - Plant category (tree, shrub, flower, vegetable, herb, fruit)
 * @param sizePx - Output canvas size in pixels (square)
 * @param typeId - Optional plant type ID for per-type variation seeding
 * @param plantType - Optional full PlantType for future use
 * @returns An offscreen HTMLCanvasElement with the rendered sprite
 */
export function generatePlantSprite(
  category: string,
  sizePx: number,
  typeId?: string,
  _plantType?: PlantType,
): HTMLCanvasElement {
  sizePx = Math.max(8, Math.min(sizePx, 512))
  const padding = sizePx * 0.15
  const canopyRadius = (sizePx - padding * 2) / 2
  const cx = sizePx / 2
  const cy = sizePx / 2

  const [canvas, ctx] = createCanvas(sizePx, sizePx)

  // Per-type color variation: shift hue by ±15 degrees based on typeId hash
  const seed = typeId ? hashString(typeId) : 0
  const rng = seededRandom(seed)
  const hueShift = typeId ? (rng() * 30 - 15) : 0
  const baseColor = CATEGORY_COLORS[category] ?? FALLBACK_PLANT_COLOR
  const color = typeId ? shiftHue(baseColor, hueShift) : baseColor

  // Draw drop shadow first (underneath the shape)
  drawDropShadow(ctx, cx, cy, canopyRadius)

  // Draw shape based on category
  switch (category) {
    case 'tree':
      drawTree(ctx, cx, cy, canopyRadius, color, rng)
      break
    case 'shrub':
      drawShrub(ctx, cx, cy, canopyRadius, color, rng)
      break
    case 'flower':
      drawFlower(ctx, cx, cy, canopyRadius, color, rng)
      break
    case 'vegetable':
      drawVegetable(ctx, cx, cy, canopyRadius, color, rng)
      break
    case 'herb':
      drawHerb(ctx, cx, cy, canopyRadius, color, rng)
      break
    case 'fruit':
      drawFruit(ctx, cx, cy, canopyRadius * 0.9, color, rng)
      break
    default:
      // Unknown category — draw a simple leafy circle
      drawVegetable(ctx, cx, cy, canopyRadius * 0.6, color, rng)
      break
  }

  return canvas
}
