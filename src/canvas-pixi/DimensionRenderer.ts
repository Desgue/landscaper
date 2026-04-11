/**
 * DimensionRenderer — Imperative PixiJS renderer for dimension annotations.
 *
 * Phase 3 of PLAN-G. Renders dimension lines using:
 *   - Graphics for leader line, extension lines, and arrowheads
 *   - Text for distance label (BitmapText+MSDF upgrade deferred)
 *   - Zoom-independent line widths and font sizes via 1/zoom scaling
 *   - Linked endpoint following (reads current element positions)
 *   - Layer visibility and locked-opacity
 *
 * Pattern: createDimensionRenderer(container, scheduler) => RendererHandle
 */

import { Container, Graphics, Text } from 'pixi.js'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import { setupWorldObject, clearGraphics } from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { DimensionElement, CanvasElement, Layer } from '../types/schema'
import type { CanvasTokens } from '../tokens/canvasTokens'
import { pixiIntToHex } from '../tokens/canvasTokens'
import { computeDimensionGeometry, formatDistance } from '../canvas/geometry'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max rendered dimensions. */
const MAX_DIMENSIONS = 200

/** Dimension line color — overridden by setTokens(). */
let DIM_COLOR = 0x1976d2

/** Dimension label text fill — overridden by setTokens(). */
let DIM_FILL_HEX = '#1976d2'

/** Arrowhead length in screen pixels (scaled by 1/zoom). */
const ARROW_SIZE_PX = 12

/** Extension line overshoot in screen pixels. */
const EXT_OVERSHOOT_PX = 4

/** Line width in screen pixels. */
const LINE_WIDTH_PX = 1.5

/** Font size in screen pixels. */
const FONT_SIZE_PX = 12

/** Text background padding in screen pixels. */
const TEXT_PAD_PX = 3

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DimensionEntry {
  group: Container
  lines: Graphics
  label: Text
  labelBg: Graphics
  elementId: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDimensionRenderer(
  container: Container,
  scheduler: RenderScheduler,
): RendererHandle {
  const entries = new Map<string, DimensionEntry>()
  const unsubs: Array<() => void> = []
  let currentZoom = useViewportStore.getState().zoom

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve linked element positions. If a dimension references an element
   * (startElementId / endElementId), use the element's center as the point.
   */
  function resolveEndpoint(
    point: { x: number; y: number },
    elementId: string | null,
    elements: CanvasElement[],
  ): { x: number; y: number } {
    if (!elementId) return point
    const el = elements.find((e) => e.id === elementId)
    if (!el) return point
    // Plants are center-anchored (x,y is center); other elements use top-left origin
    if (el.type === 'plant') {
      return { x: el.x, y: el.y }
    }
    return { x: el.x + el.width / 2, y: el.y + el.height / 2 }
  }

  function drawDimension(
    lines: Graphics,
    labelBg: Graphics,
    label: Text,
    el: DimensionElement,
    elements: CanvasElement[],
    invZoom: number,
  ): void {
    clearGraphics(lines)
    clearGraphics(labelBg)

    const startPt = resolveEndpoint(el.startPoint, el.startElementId, elements)
    const endPt = resolveEndpoint(el.endPoint, el.endElementId, elements)

    const geo = computeDimensionGeometry(startPt, endPt, el.offsetCm)
    const safePrecision = Number.isInteger(el.precision) && el.precision >= 0 && el.precision <= 4
      ? el.precision : 2
    const text = formatDistance(geo.distanceCm, safePrecision)

    const arrowSize = ARROW_SIZE_PX * invZoom
    const extOvershoot = EXT_OVERSHOOT_PX * invZoom
    const lineWidth = LINE_WIDTH_PX * invZoom
    const fontSize = FONT_SIZE_PX * invZoom
    const textPad = TEXT_PAD_PX * invZoom

    // Leader line direction
    const ldx = geo.leaderEnd.x - geo.leaderStart.x
    const ldy = geo.leaderEnd.y - geo.leaderStart.y
    const lLen = Math.sqrt(ldx * ldx + ldy * ldy)
    const lux = lLen > 0.001 ? ldx / lLen : 1
    const luy = lLen > 0.001 ? ldy / lLen : 0

    // --- Leader line ---
    lines.moveTo(geo.leaderStart.x, geo.leaderStart.y)
    lines.lineTo(geo.leaderEnd.x, geo.leaderEnd.y)

    // --- Arrowheads at each end of leader ---
    // Start arrowhead (pointing inward toward leader)
    lines.moveTo(
      geo.leaderStart.x + lux * arrowSize - luy * arrowSize * 0.3,
      geo.leaderStart.y + luy * arrowSize + lux * arrowSize * 0.3,
    )
    lines.lineTo(geo.leaderStart.x, geo.leaderStart.y)
    lines.lineTo(
      geo.leaderStart.x + lux * arrowSize + luy * arrowSize * 0.3,
      geo.leaderStart.y + luy * arrowSize - lux * arrowSize * 0.3,
    )

    // End arrowhead (pointing inward toward leader)
    lines.moveTo(
      geo.leaderEnd.x - lux * arrowSize - luy * arrowSize * 0.3,
      geo.leaderEnd.y - luy * arrowSize + lux * arrowSize * 0.3,
    )
    lines.lineTo(geo.leaderEnd.x, geo.leaderEnd.y)
    lines.lineTo(
      geo.leaderEnd.x - lux * arrowSize + luy * arrowSize * 0.3,
      geo.leaderEnd.y - luy * arrowSize - lux * arrowSize * 0.3,
    )

    // --- Extension lines (with overshoot) ---
    const perpDx = geo.extensionStart[1].x - geo.extensionStart[0].x
    const perpDy = geo.extensionStart[1].y - geo.extensionStart[0].y
    const perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy)
    const pux = perpLen > 0.001 ? perpDx / perpLen : 0
    const puy = perpLen > 0.001 ? perpDy / perpLen : -1

    lines.moveTo(geo.extensionStart[0].x, geo.extensionStart[0].y)
    lines.lineTo(
      geo.extensionStart[1].x + pux * extOvershoot,
      geo.extensionStart[1].y + puy * extOvershoot,
    )

    lines.moveTo(geo.extensionEnd[0].x, geo.extensionEnd[0].y)
    lines.lineTo(
      geo.extensionEnd[1].x + pux * extOvershoot,
      geo.extensionEnd[1].y + puy * extOvershoot,
    )

    lines.stroke({ color: DIM_COLOR, width: lineWidth })

    // --- Distance label ---
    label.text = text
    label.style.fill = DIM_FILL_HEX
    label.style.fontSize = fontSize
    label.position.set(geo.textPosition.x, geo.textPosition.y)
    label.rotation = geo.textAngle

    // Background behind text for readability
    const textWidth = label.width
    const textHeight = label.height
    labelBg.rect(
      -textWidth / 2 - textPad,
      -textHeight / 2 - textPad,
      textWidth + textPad * 2,
      textHeight + textPad * 2,
    ).fill({ color: 0xffffff, alpha: 0.85 })
    labelBg.position.set(geo.textPosition.x, geo.textPosition.y)
    labelBg.rotation = geo.textAngle
  }

  function createDimensionEntry(
    el: DimensionElement,
    elements: CanvasElement[],
    invZoom: number,
  ): DimensionEntry {
    const group = new Container()
    setupWorldObject(group)

    const lines = new Graphics()
    const labelBg = new Graphics()
    const label = new Text({
      text: '',
      style: {
        fontSize: FONT_SIZE_PX,
        fill: DIM_FILL_HEX,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        align: 'center',
      },
    })
    label.anchor.set(0.5, 0.5)

    group.addChild(lines, labelBg, label)
    drawDimension(lines, labelBg, label, el, elements, invZoom)

    container.addChild(group)

    return { group, lines, label, labelBg, elementId: el.id }
  }

  function updateDimensionEntry(
    entry: DimensionEntry,
    el: DimensionElement,
    elements: CanvasElement[],
    invZoom: number,
  ): void {
    drawDimension(entry.lines, entry.labelBg, entry.label, el, elements, invZoom)
  }

  function removeEntry(entry: DimensionEntry): void {
    container.removeChild(entry.group)
    entry.group.destroy({ children: true })
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

    const dimensions = project.elements.filter(
      (el): el is DimensionElement => el.type === 'dimension',
    )

    // Cap rendered dimensions
    const toRender = dimensions.slice(0, MAX_DIMENSIONS)
    if (dimensions.length > MAX_DIMENSIONS) {
      console.warn(
        `[DimensionRenderer] Capping at ${MAX_DIMENSIONS} (total: ${dimensions.length})`,
      )
    }

    const safeZoom = Math.max(currentZoom, 0.01)
    const invZoom = 1 / safeZoom
    const allElements = project.elements
    const currentIds = new Set(toRender.map((d) => d.id))

    // Remove stale entries
    for (const [id, entry] of entries) {
      if (!currentIds.has(id)) {
        removeEntry(entry)
        entries.delete(id)
      }
    }

    // Update or create entries with per-element layer state
    for (const el of toRender) {
      const existing = entries.get(el.id)
      if (existing) {
        updateDimensionEntry(existing, el, allElements, invZoom)
      } else {
        const entry = createDimensionEntry(el, allElements, invZoom)
        entries.set(el.id, entry)
      }

      // Per-element layer visibility and locked-opacity
      const entry = entries.get(el.id)
      if (entry) {
        const layer = project.layers.find((l: Layer) => l.id === el.layerId)
        entry.group.visible = layer?.visible ?? true
        entry.group.alpha = layer?.locked ? 0.5 : 1.0
      }
    }

    scheduler.markDirty()
  }

  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------

  unsubs.push(
    useProjectStore.subscribe((state, prevState) => {
      if (state.currentProject?.elements !== prevState.currentProject?.elements) rebuildFromStore()
    }),
  )

  // Rebuild when layer visibility/locked state changes
  unsubs.push(
    useProjectStore.subscribe((state, prevState) => {
      if (state.currentProject?.layers !== prevState.currentProject?.layers) rebuildFromStore()
    }),
  )

  // Re-render on zoom change (line widths and font sizes are zoom-independent)
  unsubs.push(
    useViewportStore.subscribe((state, prevState) => {
      if (state.zoom !== prevState.zoom) {
        currentZoom = state.zoom
        rebuildFromStore()
      }
    }),
  )

  // Initial render
  rebuildFromStore()

  // ---------------------------------------------------------------------------
  // Public handle
  // ---------------------------------------------------------------------------

  return {
    update: rebuildFromStore,
    setTokens(tokens: CanvasTokens) {
      DIM_COLOR = tokens.colorInteractive
      DIM_FILL_HEX = pixiIntToHex(tokens.colorInteractive)
      rebuildFromStore()
    },
    destroy(): void {
      for (const unsub of unsubs) unsub()
      unsubs.length = 0
      for (const entry of entries.values()) removeEntry(entry)
      entries.clear()
    },
  }
}
