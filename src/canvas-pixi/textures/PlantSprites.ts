/**
 * Placeholder plant sprite generator.
 * Renders simple category-coded shapes onto offscreen canvases.
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
// Shape drawers per category
// ---------------------------------------------------------------------------

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

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy - radius)
  ctx.lineTo(cx + radius * 0.7, cy)
  ctx.lineTo(cx, cy + radius)
  ctx.lineTo(cx - radius * 0.7, cy)
  ctx.closePath()
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a placeholder plant sprite canvas.
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
      drawCircle(ctx, cx, cy, canopyRadius, color)
      break
    case 'shrub':
      drawCircle(ctx, cx, cy, canopyRadius * 0.7, color)
      break
    case 'flower':
      drawDiamond(ctx, cx, cy, canopyRadius, color)
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
