/**
 * exportPNG — PixiJS v8 PNG export for the garden planner.
 *
 * Replaces the Konva-based src/canvas/exportPNG.ts.
 * Uses renderer.extract (async in v8) to capture the stage,
 * composites a scale bar, and triggers a download.
 */
import type { Application, Container } from 'pixi.js'
import type { Project } from '../types/schema'
import { boundaryGetAABB as getAABB } from '../canvas/elementAABB'

// ── Module-level PixiJS Application reference ─────────────────────────────────

let _pixiApp: Application | null = null

export function setPixiApp(app: Application | null): void {
  _pixiApp = app
}

export function getPixiApp(): Application | null {
  return _pixiApp
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_EXPORT_PX = 8192

/** Scale bar distance candidates (same as ScaleBar.tsx / Konva exportPNG). */
const SCALE_CANDIDATES: Array<{ maxZoom: number; distances: number[] }> = [
  { maxZoom: 0.1, distances: [5000, 10000] },
  { maxZoom: 0.3, distances: [1000, 2000] },
  { maxZoom: 1.0, distances: [500, 1000] },
  { maxZoom: 3.0, distances: [100, 200] },
  { maxZoom: Infinity, distances: [50, 20] },
]

function pickScaleBar(zoom: number): { distanceCm: number; barLengthPx: number; label: string } {
  for (const range of SCALE_CANDIDATES) {
    if (zoom < range.maxZoom) {
      for (const d of range.distances) {
        const barPx = d * zoom
        if (barPx >= 80 && barPx <= 200) {
          return { distanceCm: d, barLengthPx: barPx, label: d >= 100 ? `${d / 100}m` : `${d}cm` }
        }
      }
      const d = range.distances[0]
      return { distanceCm: d, barLengthPx: d * zoom, label: d >= 100 ? `${d / 100}m` : `${d}cm` }
    }
  }
  const d = 50
  return { distanceCm: d, barLengthPx: d * zoom, label: `${d}cm` }
}

// ── Container label constants (must match CanvasHost scene graph) ─────────────

/** Container labels to hide during export. */
const HIDDEN_LABELS = new Set(['grid', 'overflowDim', 'selection', 'interaction'])

// ── Export function ───────────────────────────────────────────────────────────

/**
 * Export the current PixiJS canvas as a PNG image.
 *
 * @param project  The current project (used for boundary/elements AABB and filename).
 * @param resolution  Optional DPI multiplier (default 1). Clamped to stay within pixel budget.
 */
export async function exportToPNG(project: Project, resolution = 1): Promise<void> {
  const app = _pixiApp
  if (!app) {
    console.error('[exportPNG/pixi] no PixiJS app reference available')
    return
  }

  // ── 1. Compute export region from yard boundary or all elements ──────────
  let worldX = 0
  let worldY = 0
  let worldW = 1000
  let worldH = 1000

  if (project.yardBoundary && project.yardBoundary.vertices.length >= 3) {
    const aabb = getAABB(project.yardBoundary)
    worldX = aabb.x
    worldY = aabb.y
    worldW = aabb.w
    worldH = aabb.h
  } else if (project.elements.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of project.elements) {
      minX = Math.min(minX, el.x)
      minY = Math.min(minY, el.y)
      maxX = Math.max(maxX, el.x + el.width)
      maxY = Math.max(maxY, el.y + el.height)
    }
    worldX = minX
    worldY = minY
    worldW = maxX - minX
    worldH = maxY - minY
  }

  // Add small padding (2% each side, minimum 20cm)
  const padX = Math.max(worldW * 0.02, 20)
  const padY = Math.max(worldH * 0.02, 20)
  worldX -= padX
  worldY -= padY
  worldW += padX * 2
  worldH += padY * 2

  // ── 2. Calculate export pixel dimensions (1cm = 1px, min 1920px longest side)
  let exportW = worldW
  let exportH = worldH
  const longestSide = Math.max(exportW, exportH)
  let scaleFactor = 1
  if (longestSide < 1920) {
    scaleFactor = 1920 / longestSide
    exportW *= scaleFactor
    exportH *= scaleFactor
  }
  // Cap to prevent OOM on very large projects
  if (Math.max(exportW, exportH) > MAX_EXPORT_PX) {
    const cap = MAX_EXPORT_PX / Math.max(exportW, exportH)
    exportW *= cap
    exportH *= cap
    scaleFactor *= cap
  }

  // ── 3. Clamp resolution to stay within pixel budget ──────────────────────
  const maxPixels = MAX_EXPORT_PX * MAX_EXPORT_PX
  if (exportW * exportH * resolution * resolution > maxPixels) {
    resolution = Math.floor(Math.sqrt(maxPixels / (exportW * exportH)))
    if (resolution < 1) resolution = 1
  }

  // Round export dimensions to whole pixels
  exportW = Math.round(exportW)
  exportH = Math.round(exportH)

  // ── 4. Save current state & hide non-export containers ───────────────────
  const world = findChild(app.stage, 'world')
  if (!world) {
    console.error('[exportPNG/pixi] could not find world container')
    return
  }

  const savedPosition = { x: world.position.x, y: world.position.y }
  const savedScale = { x: world.scale.x, y: world.scale.y }

  // Save and hide non-export containers
  const hiddenContainers: Array<{ container: Container; wasVisible: boolean }> = []

  // Hide world-level children (grid, overflowDim, selection)
  for (const child of world.children) {
    if (HIDDEN_LABELS.has(child.label)) {
      hiddenContainers.push({ container: child as Container, wasVisible: child.visible })
      child.visible = false
    }
  }

  // Hide stage-level interaction container
  for (const child of app.stage.children) {
    if (HIDDEN_LABELS.has(child.label)) {
      hiddenContainers.push({ container: child as Container, wasVisible: child.visible })
      child.visible = false
    }
  }

  // ── 5. Set export viewport ───────────────────────────────────────────────
  const exportZoom = scaleFactor
  world.position.set(-worldX * exportZoom, -worldY * exportZoom)
  world.scale.set(exportZoom, exportZoom)

  // Resize renderer temporarily for export dimensions
  const savedRendererWidth = app.renderer.width
  const savedRendererHeight = app.renderer.height
  app.renderer.resize(exportW, exportH)

  // ── 6. Render and extract ────────────────────────────────────────────────
  let exportCanvas: HTMLCanvasElement | null = null
  try {
    // Render the current frame with export viewport
    app.renderer.render({ container: app.stage })

    // Extract to canvas (async in PixiJS v8)
    exportCanvas = await app.renderer.extract.canvas({
      target: app.stage,
      resolution,
    }) as HTMLCanvasElement
  } catch (err) {
    console.error('[exportPNG/pixi] extract failed:', err)
  } finally {
    // ── 7. Restore everything ──────────────────────────────────────────────
    world.position.set(savedPosition.x, savedPosition.y)
    world.scale.set(savedScale.x, savedScale.y)

    // Restore renderer size
    app.renderer.resize(savedRendererWidth, savedRendererHeight)

    // Restore hidden containers
    for (const { container, wasVisible } of hiddenContainers) {
      container.visible = wasVisible
    }

    // Re-render with restored state
    app.renderer.render({ container: app.stage })
  }

  if (!exportCanvas) return

  // ── 8. Draw scale bar on top of the exported image ───────────────────────
  const { barLengthPx, label } = pickScaleBar(exportZoom)

  // Scale bar dimensions account for resolution multiplier
  const barPx = barLengthPx * resolution
  const finalW = exportW * resolution
  const finalH = exportH * resolution
  const scaleMult = resolution

  const offscreen = document.createElement('canvas')
  offscreen.width = finalW
  offscreen.height = finalH
  const ctx = offscreen.getContext('2d')
  if (!ctx) return

  // Draw the exported stage image
  ctx.drawImage(exportCanvas, 0, 0, finalW, finalH)

  // Draw scale bar in bottom-left
  const barX = 16 * scaleMult
  const barY = finalH - 16 * scaleMult
  const pillPadX = 8 * scaleMult
  const pillPadY = 4 * scaleMult
  const pillW = barPx + pillPadX * 2
  const pillH = 24 * scaleMult

  // White semi-transparent background pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.beginPath()
  const r = 6 * scaleMult
  const px = barX - pillPadX
  const py = barY - pillH
  ctx.moveTo(px + r, py)
  ctx.lineTo(px + pillW - r, py)
  ctx.arcTo(px + pillW, py, px + pillW, py + r, r)
  ctx.lineTo(px + pillW, py + pillH - r)
  ctx.arcTo(px + pillW, py + pillH, px + pillW - r, py + pillH, r)
  ctx.lineTo(px + r, py + pillH)
  ctx.arcTo(px, py + pillH, px, py + pillH - r, r)
  ctx.lineTo(px, py + r)
  ctx.arcTo(px, py, px + r, py, r)
  ctx.closePath()
  ctx.fill()

  // Black bar
  ctx.fillStyle = '#000000'
  const barTopY = barY - pillH + pillPadY
  ctx.fillRect(barX, barTopY, barPx, 4 * scaleMult)

  // Distance label
  ctx.fillStyle = '#000000'
  ctx.font = `${11 * scaleMult}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  ctx.fillText(label, barX, barTopY + 16 * scaleMult)

  // ── 9. Trigger download ──────────────────────────────────────────────────
  const finalUrl = offscreen.toDataURL('image/png')
  triggerDownload(finalUrl, project.name)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findChild(parent: Container, label: string): Container | null {
  for (const child of parent.children) {
    if (child.label === label) return child as Container
  }
  return null
}

function triggerDownload(dataUrl: string, projectName: string): void {
  const safeName = projectName.replace(/[^a-zA-Z0-9 _\-]/g, '_').trim() || 'project'
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${safeName}-preview.png`
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
