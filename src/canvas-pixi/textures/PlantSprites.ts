/**
 * Enhanced plant sprite generator.
 * Renders illustrated category-coded shapes onto offscreen canvases.
 */

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
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `rgb(${clamp(r + amount)},${clamp(g + amount)},${clamp(b + amount)})`
}

function darken(hex: string, amount: number): string {
  return lighten(hex, -amount)
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
// Shadow helper
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

  // Radial gradient on the ellipse
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
// Illustrated shape drawers per category
// ---------------------------------------------------------------------------

function drawTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  // Brown trunk circle at center (15% of radius)
  const trunkRadius = radius * 0.15
  ctx.fillStyle = '#5D4037'
  ctx.beginPath()
  ctx.arc(cx, cy, trunkRadius, 0, Math.PI * 2)
  ctx.fill()

  // Outer canopy ring (darker shade)
  ctx.fillStyle = darken(color, 30)
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()

  // Inner canopy highlight (lighter shade at 60% radius)
  ctx.fillStyle = lighten(color, 40)
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // Leaf detail dots
  const leafCount = 8
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2
    const dist = radius * (0.35 + (i % 3) * 0.15)
    const lx = cx + Math.cos(angle) * dist
    const ly = cy + Math.sin(angle) * dist
    const dotRadius = radius * 0.08
    ctx.fillStyle = i % 2 === 0 ? lighten(color, 25) : darken(color, 15)
    ctx.beginPath()
    ctx.arc(lx, ly, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawShrub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  const r = radius * 0.7

  // Bumpy outline: slightly randomized arc segments
  ctx.fillStyle = darken(color, 20)
  ctx.beginPath()
  const segments = 12
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    // Deterministic bump using sin — no random needed
    const bump = 1 + Math.sin(i * 2.7) * 0.12
    const px = cx + Math.cos(angle) * r * bump
    const py = cy + Math.sin(angle) * r * bump
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()

  // Inner highlight
  ctx.fillStyle = lighten(color, 30)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  // 6 teardrop petals around center
  const petalCount = 6
  const petalLength = radius * 0.7
  const petalWidth = radius * 0.3

  ctx.fillStyle = color
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    // Teardrop petal using quadratic curves
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(petalWidth, -petalLength * 0.5, 0, -petalLength)
    ctx.quadraticCurveTo(-petalWidth, -petalLength * 0.5, 0, 0)
    ctx.closePath()
    ctx.fillStyle = i % 2 === 0 ? color : lighten(color, 20)
    ctx.fill()
    ctx.restore()
  }

  // Yellow center circle
  ctx.fillStyle = '#FDD835'
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Center highlight
  ctx.fillStyle = '#FFF176'
  ctx.beginPath()
  ctx.arc(cx - radius * 0.05, cy - radius * 0.05, radius * 0.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  const half = radius * 0.75
  ctx.fillStyle = color
  ctx.fillRect(cx - half, cy - half, half * 2, half * 2)
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy - radius)
  ctx.lineTo(cx + radius * 0.87, cy + radius * 0.5)
  ctx.lineTo(cx - radius * 0.87, cy + radius * 0.5)
  ctx.closePath()
  ctx.fill()
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an illustrated plant sprite canvas.
 *
 * @param category - Plant category (tree, shrub, flower, vegetable, herb, fruit)
 * @param sizePx - Output canvas size in pixels (square)
 * @returns An offscreen HTMLCanvasElement with the rendered sprite
 */
export function generatePlantSprite(category: string, sizePx: number): HTMLCanvasElement {
  sizePx = Math.max(8, Math.min(sizePx, 512))
  const padding = sizePx * 0.15
  const canopyRadius = (sizePx - padding * 2) / 2
  const cx = sizePx / 2
  const cy = sizePx / 2

  const [canvas, ctx] = createCanvas(sizePx, sizePx)
  const color = CATEGORY_COLORS[category] ?? FALLBACK_PLANT_COLOR

  // Draw drop shadow first (underneath the shape)
  drawDropShadow(ctx, cx, cy, canopyRadius)

  // Draw shape based on category
  switch (category) {
    case 'tree':
      drawTree(ctx, cx, cy, canopyRadius, color)
      break
    case 'shrub':
      drawShrub(ctx, cx, cy, canopyRadius, color)
      break
    case 'flower':
      drawFlower(ctx, cx, cy, canopyRadius, color)
      break
    case 'vegetable':
      drawSquare(ctx, cx, cy, canopyRadius, color)
      break
    case 'herb':
      drawTriangle(ctx, cx, cy, canopyRadius, color)
      break
    case 'fruit':
      drawCircle(ctx, cx, cy, canopyRadius * 0.8, color)
      break
    default:
      // Unknown category — draw a plain circle
      drawCircle(ctx, cx, cy, canopyRadius * 0.6, color)
      break
  }

  return canvas
}
