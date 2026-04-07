/**
 * PathRenderer — Imperative PixiJS renderer for path elements.
 *
 * Phase 3 of PLAN-G. Renders paths as:
 *   - Solid color strokes with path type color (textured TilingSprite fill
 *     deferred until texture atlas includes path textures — Phase 5 polish)
 *   - Arc segments via sampleArc() polyline
 *   - Subtle edge lines (1px darker stroke on both sides)
 *   - Closed paths: semi-transparent interior fill
 *   - Layer visibility and locked-opacity
 *
 * Pattern: createPathRenderer(container, scheduler) => RendererHandle
 */

import { Container, Graphics } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import { setupWorldObject, clearGraphics } from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { PathElement, PathType, Vec2, Layer } from '../types/schema'
import { sampleArc } from '../canvas/arcGeometry'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max rendered paths to prevent unbounded VRAM growth. */
const MAX_PATHS = 200

/** Max points per path to prevent unbounded GPU geometry. */
const MAX_PATH_POINTS = 2000

/** Edge line width in world cm (thin darker border on each side). */
const EDGE_LINE_WIDTH = 1

/** Edge line darkening factor. */
const EDGE_DARKEN = 0.6

/** Closed path fill alpha. */
const CLOSED_FILL_ALPHA = 0.15

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse hex color string to number. */
function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0x888888
}

/** Darken a numeric color. */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor)
  const g = Math.round(((color >> 8) & 0xff) * factor)
  const b = Math.round((color & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

/**
 * Build the polyline points for a path, expanding arc segments.
 * Returns an array of Vec2 representing the full path shape.
 */
function buildPathPoints(el: PathElement): Vec2[] {
  const pts = el.points.slice(0, MAX_PATH_POINTS)
  const segs = el.segments
  if (pts.length < 2) return pts.slice()

  const result: Vec2[] = [pts[0]]

  const segCount = Math.min(segs.length, pts.length - 1)
  for (let i = 0; i < segCount; i++) {
    const seg = segs[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]

    if (seg.type === 'arc' && seg.arcSagitta) {
      // Arc segment: sample polyline, skip first point (already added)
      const arcPts = sampleArc(p1, p2, seg.arcSagitta)
      for (let j = 1; j < arcPts.length; j++) {
        result.push(arcPts[j])
      }
    } else {
      // Straight segment
      result.push(p2)
    }
  }

  // If path has more points than segments+1 (shouldn't happen, but safety)
  for (let i = segCount + 1; i < pts.length; i++) {
    result.push(pts[i])
  }

  return result
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PathEntry {
  fill: Graphics      // main stroke + closed fill
  edgeLines: Graphics // subtle edge lines on both sides
  elementId: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPathRenderer(
  container: Container,
  scheduler: RenderScheduler,
): RendererHandle {
  const entries = new Map<string, PathEntry>()
  const unsubs: Array<() => void> = []

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function resolvePathType(typeId: string): PathType | undefined {
    const { registries } = useProjectStore.getState()
    return registries.paths.find((p) => p.id === typeId)
  }

  function drawPath(
    fill: Graphics,
    edgeLines: Graphics,
    el: PathElement,
    pt: PathType,
  ): void {
    clearGraphics(fill)
    clearGraphics(edgeLines)

    const polyline = buildPathPoints(el)
    if (polyline.length < 2) return

    const color = hexToNum(pt.color)
    const strokeWidth = Number.isFinite(el.strokeWidthCm) && el.strokeWidthCm > 0
      ? el.strokeWidthCm : 1
    const edgeColor = darkenColor(color, EDGE_DARKEN)

    // Draw edge lines (slightly wider than main stroke) underneath
    edgeLines.moveTo(polyline[0].x, polyline[0].y)
    for (let i = 1; i < polyline.length; i++) {
      edgeLines.lineTo(polyline[i].x, polyline[i].y)
    }
    if (el.closed && polyline.length >= 3) {
      edgeLines.lineTo(polyline[0].x, polyline[0].y)
    }
    edgeLines.stroke({
      color: edgeColor,
      width: strokeWidth + EDGE_LINE_WIDTH * 2,
      cap: 'round',
      join: 'round',
    })

    // For closed paths, draw fill first on a separate path, then stroke on another
    if (el.closed && polyline.length >= 3) {
      // Fill interior
      fill.moveTo(polyline[0].x, polyline[0].y)
      for (let i = 1; i < polyline.length; i++) {
        fill.lineTo(polyline[i].x, polyline[i].y)
      }
      fill.closePath()
      fill.fill({ color, alpha: CLOSED_FILL_ALPHA })
        .stroke({ color, width: strokeWidth, cap: 'round', join: 'round' })
    } else {
      // Open path: stroke only
      fill.moveTo(polyline[0].x, polyline[0].y)
      for (let i = 1; i < polyline.length; i++) {
        fill.lineTo(polyline[i].x, polyline[i].y)
      }
      fill.stroke({ color, width: strokeWidth, cap: 'round', join: 'round' })
    }
  }

  function createPathEntry(el: PathElement, pt: PathType): PathEntry {
    const edgeLines = new Graphics()
    setupWorldObject(edgeLines)

    const fill = new Graphics()
    setupWorldObject(fill)

    drawPath(fill, edgeLines, el, pt)

    container.addChild(edgeLines, fill)

    return { fill, edgeLines, elementId: el.id }
  }

  function updatePathEntry(entry: PathEntry, el: PathElement, pt: PathType): void {
    drawPath(entry.fill, entry.edgeLines, el, pt)
  }

  function removeEntry(entry: PathEntry): void {
    container.removeChild(entry.fill, entry.edgeLines)
    entry.fill.destroy()
    entry.edgeLines.destroy()
  }

  // ---------------------------------------------------------------------------
  // Full rebuild from store
  // ---------------------------------------------------------------------------

  function rebuildFromStore(): void {
    const project = useProjectStore.getState().currentProject
    if (!project) {
      for (const entry of entries.values()) removeEntry(entry)
      entries.clear()
      scheduler.markDirty()
      return
    }

    const paths = project.elements.filter(
      (el): el is PathElement => el.type === 'path',
    )

    // Cap rendered paths
    const toRender = paths.slice(0, MAX_PATHS)
    if (paths.length > MAX_PATHS) {
      console.warn(
        `[PathRenderer] Capping at ${MAX_PATHS} (total: ${paths.length})`,
      )
    }

    const currentIds = new Set(toRender.map((p) => p.id))

    // Remove stale entries
    for (const [id, entry] of entries) {
      if (!currentIds.has(id)) {
        removeEntry(entry)
        entries.delete(id)
      }
    }

    // Update or create entries with per-element layer state
    for (const el of toRender) {
      const pt = resolvePathType(el.pathTypeId)
      if (!pt) continue

      const existing = entries.get(el.id)
      if (existing) {
        updatePathEntry(existing, el, pt)
      } else {
        const entry = createPathEntry(el, pt)
        entries.set(el.id, entry)
      }

      // Per-element layer visibility and locked-opacity
      const entry = entries.get(el.id)
      if (entry) {
        const layer = project.layers.find((l: Layer) => l.id === el.layerId)
        const visible = layer?.visible ?? true
        const alpha = layer?.locked ? 0.5 : 1.0
        entry.fill.visible = visible
        entry.fill.alpha = alpha
        entry.edgeLines.visible = visible
        entry.edgeLines.alpha = alpha
      }
    }

    scheduler.markDirty()
  }

  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------

  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.elements,
      () => rebuildFromStore(),
    ),
  )

  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.registries.paths,
      () => rebuildFromStore(),
    ),
  )

  // Rebuild when layer visibility/locked state changes
  unsubs.push(
    connectStore(
      useProjectStore,
      (s) => s.currentProject?.layers,
      () => rebuildFromStore(),
    ),
  )

  // Initial render
  rebuildFromStore()

  // ---------------------------------------------------------------------------
  // Public handle
  // ---------------------------------------------------------------------------

  return {
    update: rebuildFromStore,
    destroy(): void {
      for (const unsub of unsubs) unsub()
      unsubs.length = 0
      for (const entry of entries.values()) removeEntry(entry)
      entries.clear()
    },
  }
}
