// Core viewport transform functions.
// Internal unit: centimeters. Screen unit: pixels.
// Y-axis points DOWN (HTML Canvas convention).

import type { ViewportState } from '../types/schema'

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 10.0

// Convert world coordinates (cm) to screen coordinates (px)
export function toScreen(
  worldX: number,
  worldY: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: worldX * zoom + panX,
    y: worldY * zoom + panY,
  }
}

// Convert screen coordinates (px) to world coordinates (cm)
export function toWorld(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  }
}

// Zoom toward cursor: keeps the world point under cursor fixed.
// Returns new { panX, panY } after zoom.
export function zoomTowardCursor(
  cursorScreenX: number,
  cursorScreenY: number,
  oldPanX: number,
  oldPanY: number,
  oldZoom: number,
  newZoom: number,
): { panX: number; panY: number } {
  // mouseWorld = (cursor - stagePos) / oldScale
  // newStagePos = cursor - mouseWorld * newScale
  return {
    panX: cursorScreenX - ((cursorScreenX - oldPanX) / oldZoom) * newZoom,
    panY: cursorScreenY - ((cursorScreenY - oldPanY) / oldZoom) * newZoom,
  }
}

// Clamp zoom to [ZOOM_MIN, ZOOM_MAX]
export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

// Fit-to-view: compute viewport that shows all elements with padding.
// elements: array of { x, y, width, height } in world cm.
// viewportWidth/Height: canvas element dimensions in pixels.
// Returns new viewport state.
export function fitToView(
  elements: Array<{ x: number; y: number; width: number; height: number }>,
  viewportWidth: number,
  viewportHeight: number,
): ViewportState {
  if (elements.length === 0) {
    // No elements: show a 1000cm × 1000cm area centered at origin
    const defaultSizeCm = 1000
    const zoom = clampZoom(Math.min(viewportWidth / defaultSizeCm, viewportHeight / defaultSizeCm))
    return {
      panX: viewportWidth / 2 - (defaultSizeCm / 2) * zoom,
      panY: viewportHeight / 2 - (defaultSizeCm / 2) * zoom,
      zoom,
    }
  }

  // Compute AABB of all elements
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  }

  const rawW = maxX - minX
  const rawH = maxY - minY

  // Add 10% padding on each dimension, minimum 100cm
  const padX = Math.max(rawW * 0.1, 100)
  const padY = Math.max(rawH * 0.1, 100)

  const aabbW = rawW + padX * 2
  const aabbH = rawH + padY * 2
  const aabbCenterX = (minX + maxX) / 2
  const aabbCenterY = (minY + maxY) / 2

  const zoom = clampZoom(Math.min(viewportWidth / aabbW, viewportHeight / aabbH))

  return {
    zoom,
    panX: viewportWidth / 2 - aabbCenterX * zoom,
    panY: viewportHeight / 2 - aabbCenterY * zoom,
  }
}
