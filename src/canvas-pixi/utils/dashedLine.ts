/**
 * drawDashedLine — Draw a dashed line on a PixiJS Graphics object.
 *
 * PixiJS v8 Graphics does not natively support dash arrays, so we compute
 * individual segments as moveTo/lineTo calls.
 */
import type { Graphics } from 'pixi.js'

export function drawDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashArray: number[] = [10, 5],
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return

  // Guard: filter out non-positive dash values to prevent infinite loop
  const validDash = dashArray.filter((d) => d > 0)
  if (validDash.length === 0) {
    // No valid dash pattern — draw solid line
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    return
  }

  const ux = dx / len
  const uy = dy / len
  let dist = 0
  let dashIndex = 0
  let drawing = true

  while (dist < len) {
    const segLen = Math.min(validDash[dashIndex % validDash.length], len - dist)
    const sx = x1 + ux * dist
    const sy = y1 + uy * dist
    const ex = x1 + ux * (dist + segLen)
    const ey = y1 + uy * (dist + segLen)

    if (drawing) {
      g.moveTo(sx, sy)
      g.lineTo(ex, ey)
    }

    dist += segLen
    dashIndex++
    drawing = !drawing
  }
}
