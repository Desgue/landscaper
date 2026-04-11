/**
 * LabelRenderer — Imperative PixiJS renderer for text label elements.
 *
 * Phase 3 of PLAN-G. Renders labels using PixiJS Text with:
 *   - Font family, size, color, alignment, bold/italic styling
 *   - Zoom-independent sizing via scale (1/zoom) — BitmapText+MSDF upgrade
 *     deferred until font atlas is generated (Phase 3 MSDF task)
 *   - Layer visibility and locked-opacity
 *   - Security: font family sanitization, hex color validation
 *
 * Note: Editable text stays in HTML overlays (already exist). This renderer
 * handles read-only display of committed label elements only.
 *
 * Pattern: createLabelRenderer(container, scheduler) => RendererHandle
 */

import { Container, Text } from 'pixi.js'
import { useProjectStore } from '../store/useProjectStore'
import { setupWorldObject } from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { LabelElement, Layer } from '../types/schema'
import type { CanvasTokens } from '../tokens/canvasTokens'
import { pixiIntToHex } from '../tokens/canvasTokens'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max rendered labels. */
const MAX_LABELS = 300

/** Default font color fallback — overridden by setTokens(). */
let DEFAULT_FONT_COLOR = '#333333'

/** Default font family fallback. */
const DEFAULT_FONT_FAMILY = 'sans-serif'

// ---------------------------------------------------------------------------
// Security helpers (same as Konva LabelLayer)
// ---------------------------------------------------------------------------

function sanitizeFontFamily(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ,_\-']/g, '') || DEFAULT_FONT_FAMILY
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LabelEntry {
  text: Text
  elementId: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLabelRenderer(
  container: Container,
  scheduler: RenderScheduler,
): RendererHandle {
  const entries = new Map<string, LabelEntry>()
  const unsubs: Array<() => void> = []

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getTextAlign(align: string): 'left' | 'center' | 'right' {
    if (align === 'left' || align === 'center' || align === 'right') return align
    return 'left'
  }

  function createLabelEntry(el: LabelElement): LabelEntry {
    const fontFamily = sanitizeFontFamily(el.fontFamily)
    const fontColor = isValidHexColor(el.fontColor) ? el.fontColor : DEFAULT_FONT_COLOR

    const safeFontSize = Math.max(4, Math.min(200, el.fontSize || 14))

    const text = new Text({
      text: el.text,
      style: {
        fontSize: safeFontSize,
        fill: fontColor,
        fontFamily,
        fontWeight: el.bold ? 'bold' : 'normal',
        fontStyle: el.italic ? 'italic' : 'normal',
        align: getTextAlign(el.textAlign),
        wordWrap: true,
        wordWrapWidth: el.width > 0 ? el.width : 500,
      },
    })
    setupWorldObject(text)
    const safeWidth = Number.isFinite(el.width) && el.width > 0 ? el.width : 0
    text.position.set(el.x, el.y)

    // Anchor based on text alignment
    switch (el.textAlign) {
      case 'center':
        text.anchor.set(0.5, 0)
        text.position.set(el.x + safeWidth / 2, el.y)
        break
      case 'right':
        text.anchor.set(1, 0)
        text.position.set(el.x + safeWidth, el.y)
        break
      default:
        text.anchor.set(0, 0)
        break
    }

    container.addChild(text)
    return { text, elementId: el.id }
  }

  function updateLabelEntry(entry: LabelEntry, el: LabelElement): void {
    const fontFamily = sanitizeFontFamily(el.fontFamily)
    const fontColor = isValidHexColor(el.fontColor) ? el.fontColor : DEFAULT_FONT_COLOR

    entry.text.text = el.text
    entry.text.style.fontSize = Math.max(4, Math.min(200, el.fontSize || 14))
    entry.text.style.fill = fontColor
    entry.text.style.fontFamily = fontFamily
    entry.text.style.fontWeight = el.bold ? 'bold' : 'normal'
    entry.text.style.fontStyle = el.italic ? 'italic' : 'normal'
    entry.text.style.align = getTextAlign(el.textAlign)
    const safeWidth = Number.isFinite(el.width) && el.width > 0 ? el.width : 0
    entry.text.style.wordWrapWidth = safeWidth > 0 ? safeWidth : 500

    switch (el.textAlign) {
      case 'center':
        entry.text.anchor.set(0.5, 0)
        entry.text.position.set(el.x + safeWidth / 2, el.y)
        break
      case 'right':
        entry.text.anchor.set(1, 0)
        entry.text.position.set(el.x + safeWidth, el.y)
        break
      default:
        entry.text.anchor.set(0, 0)
        entry.text.position.set(el.x, el.y)
        break
    }
  }

  function removeEntry(entry: LabelEntry): void {
    container.removeChild(entry.text)
    entry.text.destroy()
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

    const labels = project.elements.filter(
      (el): el is LabelElement => el.type === 'label',
    )

    // Cap rendered labels
    const toRender = labels.slice(0, MAX_LABELS)
    if (labels.length > MAX_LABELS) {
      console.warn(
        `[LabelRenderer] Capping at ${MAX_LABELS} (total: ${labels.length})`,
      )
    }

    const currentIds = new Set(toRender.map((l) => l.id))

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
        updateLabelEntry(existing, el)
      } else {
        const entry = createLabelEntry(el)
        entries.set(el.id, entry)
      }

      // Per-element layer visibility and locked-opacity
      const entry = entries.get(el.id)
      if (entry) {
        const layer = project.layers.find((l: Layer) => l.id === el.layerId)
        entry.text.visible = layer?.visible ?? true
        entry.text.alpha = layer?.locked ? 0.5 : 1.0
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

  // Initial render
  rebuildFromStore()

  // ---------------------------------------------------------------------------
  // Public handle
  // ---------------------------------------------------------------------------

  return {
    update: rebuildFromStore,
    setTokens(tokens: CanvasTokens) {
      DEFAULT_FONT_COLOR = pixiIntToHex(tokens.textPrimary)
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
