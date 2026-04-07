/**
 * StructureRenderer — Imperative PixiJS renderer for structure elements.
 *
 * Phase 3 of PLAN-G. Renders structures with 2.5D visual style:
 *   - Height extrusion: boundary/feature/furniture/container categories get a
 *     south-face strip (darkened color, EXTRUSION_SCALE=0.5) with ambient
 *     occlusion gradient at the base
 *   - Surface category: flat textured fill, no extrusion
 *   - Overhead category: semi-transparent with dashed outline
 *   - Structure name label centered on top face
 *   - Curved structures: arc outline using sampleArc()
 *   - Y-sort: extruded by top edge, flat by bottom edge
 *   - Layer visibility and locked-opacity
 *
 * Pattern: createStructureRenderer(container, scheduler, atlas) => RendererHandle
 */

import { Container, Graphics, Text } from 'pixi.js'
import { connectStore } from './connectStore'
import { useProjectStore } from '../store/useProjectStore'
import { useViewportStore } from '../store/useViewportStore'
import {
  computeStructureSortKey,
  setupWorldObject,
  clearGraphics,
  isExtrudedCategory,
  computeExtrusionHeight,
} from './BaseRenderer'
import type { RendererHandle } from './BaseRenderer'
import type { RenderScheduler } from './RenderScheduler'
import type { TextureAtlas } from './textures/TextureAtlas'
import type { StructureElement, StructureType, Layer } from '../types/schema'
import { sampleArc } from '../canvas/arcGeometry'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max rendered structures to prevent unbounded VRAM growth. */
const MAX_STRUCTURES = 500

/** Culling margin in world cm — generous to avoid pop-in during fast panning. */
const CULLING_MARGIN = 200

/** Ambient occlusion gradient height in world cm. */
const AO_HEIGHT = 18

/** Ambient occlusion max alpha. */
const AO_ALPHA = 0.2

/** Overhead category opacity. */
const OVERHEAD_ALPHA = 0.35

/** Dash pattern for overhead category outlines (world units). */
const OVERHEAD_DASH = [20, 10]

/** Max label font size in world cm. */
const LABEL_MAX_FONT_SIZE = 14

/** Min label font size in world cm. */
const LABEL_MIN_FONT_SIZE = 6

// ---------------------------------------------------------------------------
// Category color map (same as Konva StructureLayer)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, number> = {
  boundary: 0x6b7280,
  container: 0x92400e,
  surface: 0xd97706,
  overhead: 0x7c3aed,
  feature: 0x0891b2,
  furniture: 0x1d4ed8,
}

const DEFAULT_CATEGORY_COLOR = 0x6b7280

function getCategoryColor(category: string): number {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR
}

/** Darken a color by a factor (0-1). */
function darkenColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor)
  const g = Math.round(((color >> 8) & 0xff) * factor)
  const b = Math.round((color & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StructureEntry {
  group: Container
  topFace: Graphics
  southFace: Graphics | null
  aoGradient: Graphics | null
  outline: Graphics | null
  castShadow: Graphics | null
  overheadShadow: Graphics | null
  label: Text
  elementId: string
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createStructureRenderer(
  container: Container,
  scheduler: RenderScheduler,
  atlas: TextureAtlas,
  getCanvasSize: () => { width: number; height: number },
): RendererHandle {
  // atlas reserved for future textured structure sprites (Phase 5 polish)
  void atlas
  const entries = new Map<string, StructureEntry>()
  const unsubs: Array<() => void> = []

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function resolveStructureType(typeId: string): StructureType | undefined {
    const { registries } = useProjectStore.getState()
    return registries.structures.find((s) => s.id === typeId)
  }

  /** Sanitize element dimensions for GPU-safe drawing. */
  function safeDims(el: StructureElement): { w: number; h: number } {
    return {
      w: Number.isFinite(el.width) && el.width > 0 ? el.width : 1,
      h: Number.isFinite(el.height) && el.height > 0 ? el.height : 1,
    }
  }

  function drawTopFace(
    g: Graphics,
    el: StructureElement,
    color: number,
    category: string,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)

    if (el.shape === 'curved' && el.arcSagitta) {
      // Curved structure: draw arc outline
      const p1 = { x: 0, y: 0 }
      const p2 = { x: w, y: 0 }
      const points = sampleArc(p1, p2, el.arcSagitta)
      if (points.length >= 2) {
        g.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          g.lineTo(points[i].x, points[i].y)
        }
        // Close to form the full shape
        g.lineTo(w, h)
        g.lineTo(0, h)
        g.closePath()
      } else {
        g.rect(0, 0, w, h)
      }
    } else {
      g.rect(0, 0, w, h)
    }

    if (category === 'overhead') {
      g.fill({ color, alpha: OVERHEAD_ALPHA })
    } else {
      g.fill({ color })
    }
  }

  function drawSouthFace(
    g: Graphics,
    el: StructureElement,
    color: number,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)
    const extHeight = computeExtrusionHeight(h)
    const darkColor = darkenColor(color, 0.6)
    g.rect(0, h, w, extHeight).fill({ color: darkColor })
  }

  function drawAmbientOcclusion(
    g: Graphics,
    el: StructureElement,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)
    const extHeight = computeExtrusionHeight(h)
    const aoY = h + extHeight

    // Gradient approximation: multiple thin strips with decreasing alpha
    const strips = 5
    const stripHeight = AO_HEIGHT / strips
    for (let i = 0; i < strips; i++) {
      const alpha = AO_ALPHA * (1 - i / strips)
      g.rect(0, aoY + i * stripHeight, w, stripHeight)
        .fill({ color: 0x000000, alpha })
    }
  }

  function drawCastShadow(
    g: Graphics,
    el: StructureElement,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)
    // Shadow offset to south-east
    g.rect(15, 20, w, h).fill({ color: 0x000000, alpha: 0.15 })
  }

  function drawOverheadShadow(
    g: Graphics,
    el: StructureElement,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)
    // Ground-level shadow fill for overhead structures (pergolas, arbors)
    g.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.12 })
  }

  function drawOverheadOutline(
    g: Graphics,
    el: StructureElement,
    color: number,
  ): void {
    clearGraphics(g)
    const { w, h } = safeDims(el)

    // Dashed rectangle outline
    const edges: Array<[number, number, number, number]> = [
      [0, 0, w, 0],
      [w, 0, w, h],
      [w, h, 0, h],
      [0, h, 0, 0],
    ]

    for (const [x1, y1, x2, y2] of edges) {
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 1) continue

      const ux = dx / len
      const uy = dy / len
      let pos = 0
      let drawing = true

      while (pos < len) {
        const dashLen = Math.max(drawing ? OVERHEAD_DASH[0] : OVERHEAD_DASH[1], 0.1)
        const end = Math.min(pos + dashLen, len)
        if (drawing) {
          g.moveTo(x1 + ux * pos, y1 + uy * pos)
          g.lineTo(x1 + ux * end, y1 + uy * end)
        }
        pos = end
        drawing = !drawing
      }
    }

    g.stroke({ color, width: 2, alpha: 0.8 })
  }

  function createStructureEntry(
    el: StructureElement,
    st: StructureType,
  ): StructureEntry {
    const category = st.category
    const color = getCategoryColor(category)
    const extruded = isExtrudedCategory(category)

    const safeRotation = Number.isFinite(el.rotation) ? el.rotation : 0

    const group = new Container()
    setupWorldObject(group)
    group.position.set(el.x, el.y)
    group.rotation = (safeRotation * Math.PI) / 180

    // Cast shadow (drawn first, underneath everything)
    let castShadow: Graphics | null = null
    if (extruded) {
      castShadow = new Graphics()
      drawCastShadow(castShadow, el)
      group.addChild(castShadow)
    }

    // Overhead ground shadow
    let overheadShadow: Graphics | null = null
    if (category === 'overhead') {
      overheadShadow = new Graphics()
      drawOverheadShadow(overheadShadow, el)
      group.addChild(overheadShadow)
    }

    // Top face
    const topFace = new Graphics()
    drawTopFace(topFace, el, color, category)

    group.addChild(topFace)

    // South face (extruded categories only)
    let southFace: Graphics | null = null
    let aoGradient: Graphics | null = null
    if (extruded) {
      southFace = new Graphics()
      drawSouthFace(southFace, el, color)
      group.addChild(southFace)

      aoGradient = new Graphics()
      drawAmbientOcclusion(aoGradient, el)
      group.addChild(aoGradient)
    }

    // Overhead dashed outline
    let outline: Graphics | null = null
    if (category === 'overhead') {
      outline = new Graphics()
      drawOverheadOutline(outline, el, color)
      group.addChild(outline)
    }

    // Name label centered on top face (truncated for GPU safety).
    // Plan specifies BitmapText+MSDF for zoom-crisp rendering, but MSDF font
    // atlas generation is deferred (see Phase 3 MSDF task). Using Text with
    // fixed fontSize as interim — same pattern as BoundaryRenderer Phase 2 labels.
    const safeW = Number.isFinite(el.width) && el.width > 0 ? el.width : 1
    const safeH = Number.isFinite(el.height) && el.height > 0 ? el.height : 1
    const safeLabel = st.name.length > 80 ? st.name.slice(0, 80) + '…' : st.name
    const fontSize = Math.max(
      LABEL_MIN_FONT_SIZE,
      Math.min(LABEL_MAX_FONT_SIZE, safeH * 0.15),
    )
    const label = new Text({
      text: safeLabel,
      style: {
        fontSize,
        fill: category === 'overhead' ? '#4a148c' : '#ffffff',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        align: 'center',
      },
    })
    label.anchor.set(0.5, 0.5)
    label.position.set(safeW / 2, safeH / 2)
    group.addChild(label)

    // Y-sort key
    group.zIndex = computeStructureSortKey(el, category)

    container.addChild(group)

    return { group, topFace, southFace, aoGradient, outline, castShadow, overheadShadow, label, elementId: el.id }
  }

  function updateStructureEntry(
    entry: StructureEntry,
    el: StructureElement,
    st: StructureType,
  ): void {
    const category = st.category
    const needsExtrusion = isExtrudedCategory(category)
    const hasExtrusion = entry.southFace !== null
    const needsOutline = category === 'overhead'
    const hasOutline = entry.outline !== null
    const needsCastShadow = needsExtrusion
    const hasCastShadow = entry.castShadow !== null
    const needsOverheadShadow = category === 'overhead'
    const hasOverheadShadow = entry.overheadShadow !== null

    // If structural composition changed (extruded↔flat, overhead↔non),
    // destroy and recreate to avoid leaking Graphics objects
    if (needsExtrusion !== hasExtrusion || needsOutline !== hasOutline ||
        needsCastShadow !== hasCastShadow || needsOverheadShadow !== hasOverheadShadow) {
      removeEntry(entry)
      entries.delete(entry.elementId)
      const newEntry = createStructureEntry(el, st)
      entries.set(el.id, newEntry)
      return
    }

    const color = getCategoryColor(category)
    const safeW = Number.isFinite(el.width) && el.width > 0 ? el.width : 1
    const safeH = Number.isFinite(el.height) && el.height > 0 ? el.height : 1
    const safeRotation = Number.isFinite(el.rotation) ? el.rotation : 0

    entry.group.position.set(el.x, el.y)
    entry.group.rotation = (safeRotation * Math.PI) / 180

    drawTopFace(entry.topFace, el, color, category)

    if (needsCastShadow && entry.castShadow) {
      drawCastShadow(entry.castShadow, el)
    }
    if (needsOverheadShadow && entry.overheadShadow) {
      drawOverheadShadow(entry.overheadShadow, el)
    }
    if (needsExtrusion && entry.southFace) {
      drawSouthFace(entry.southFace, el, color)
    }
    if (needsExtrusion && entry.aoGradient) {
      drawAmbientOcclusion(entry.aoGradient, el)
    }
    if (needsOutline && entry.outline) {
      drawOverheadOutline(entry.outline, el, color)
    }

    // Update label (truncated for GPU safety)
    const safeLabel = st.name.length > 80 ? st.name.slice(0, 80) + '…' : st.name
    const fontSize = Math.max(
      LABEL_MIN_FONT_SIZE,
      Math.min(LABEL_MAX_FONT_SIZE, safeH * 0.15),
    )
    entry.label.text = safeLabel
    entry.label.style.fontSize = fontSize
    entry.label.position.set(safeW / 2, safeH / 2)

    // Update sort key
    entry.group.zIndex = computeStructureSortKey(el, category)
  }

  function removeEntry(entry: StructureEntry): void {
    container.removeChild(entry.group)
    entry.group.destroy({ children: true })
  }

  // ---------------------------------------------------------------------------
  // Viewport culling
  // ---------------------------------------------------------------------------

  /** Viewport world bounds for element-level visibility culling. */
  function getViewportWorldBounds(): {
    worldLeft: number; worldTop: number; worldRight: number; worldBottom: number
  } {
    const { panX, panY, zoom } = useViewportStore.getState()
    const { width: viewW, height: viewH } = getCanvasSize()
    return {
      worldLeft: -panX / zoom,
      worldTop: -panY / zoom,
      worldRight: (-panX + viewW) / zoom,
      worldBottom: (-panY + viewH) / zoom,
    }
  }

  /**
   * Set .visible = false for structures whose bounding box (including
   * extrusion height) falls entirely outside the current viewport.
   * Layer-hidden structures remain hidden regardless of viewport.
   */
  function updateElementVisibility(): void {
    const { worldLeft, worldTop, worldRight, worldBottom } = getViewportWorldBounds()
    const project = useProjectStore.getState().currentProject

    for (const entry of entries.values()) {
      const el = project?.elements.find(
        (e): e is StructureElement => e.id === entry.elementId && e.type === 'structure',
      )
      if (!el) continue

      // Layer visibility takes precedence
      const layer = project?.layers.find((l: Layer) => l.id === el.layerId)
      if (layer && !layer.visible) continue

      const st = resolveStructureType(el.structureTypeId)
      const category = st?.category ?? ''
      const extHeight = isExtrudedCategory(category) ? computeExtrusionHeight(
        Number.isFinite(el.height) && el.height > 0 ? el.height : 1,
      ) : 0

      // Full AABB of the structure including extrusion
      const elLeft = el.x - CULLING_MARGIN
      const elTop = el.y - CULLING_MARGIN
      const elRight = el.x + (Number.isFinite(el.width) ? el.width : 1) + CULLING_MARGIN
      const elBottom = el.y + (Number.isFinite(el.height) ? el.height : 1) + extHeight + CULLING_MARGIN

      const inViewport =
        elRight >= worldLeft &&
        elLeft <= worldRight &&
        elBottom >= worldTop &&
        elTop <= worldBottom

      entry.group.visible = inViewport
    }

    scheduler.markDirty()
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

    const structures = project.elements.filter(
      (el): el is StructureElement => el.type === 'structure',
    )

    // Cap rendered structures
    const toRender = structures.slice(0, MAX_STRUCTURES)
    if (structures.length > MAX_STRUCTURES) {
      console.warn(
        `[StructureRenderer] Capping at ${MAX_STRUCTURES} (total: ${structures.length})`,
      )
    }

    const currentIds = new Set(toRender.map((s) => s.id))

    // Remove stale entries
    for (const [id, entry] of entries) {
      if (!currentIds.has(id)) {
        removeEntry(entry)
        entries.delete(id)
      }
    }

    // Update or create entries with per-element layer state
    for (const el of toRender) {
      const st = resolveStructureType(el.structureTypeId)
      if (!st) continue

      const existing = entries.get(el.id)
      if (existing) {
        updateStructureEntry(existing, el, st)
      } else {
        const entry = createStructureEntry(el, st)
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

    // Apply viewport culling after rebuild
    updateElementVisibility()
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
      (s) => s.registries.structures,
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

  // Update element visibility when viewport changes (pan/zoom)
  unsubs.push(
    connectStore(
      useViewportStore,
      (s) => `${s.panX},${s.panY},${s.zoom}`,
      () => updateElementVisibility(),
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
