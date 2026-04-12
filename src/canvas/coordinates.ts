// Branded coordinate types for the canvas coordinate system.
// Screen coordinates are in pixels (px); world coordinates are in centimeters (cm).
// Y-axis points DOWN (HTML Canvas convention).

// Branded type infrastructure
declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

// Branded coordinate types
export type ScreenPoint = Brand<{ readonly x: number; readonly y: number }, 'ScreenPoint'>
export type WorldPoint = Brand<{ readonly x: number; readonly y: number }, 'WorldPoint'>

// Constructor helpers (zero runtime cost — just casts)
export function screenPoint(x: number, y: number): ScreenPoint {
  return { x, y } as ScreenPoint
}

export function worldPoint(x: number, y: number): WorldPoint {
  return { x, y } as WorldPoint
}
