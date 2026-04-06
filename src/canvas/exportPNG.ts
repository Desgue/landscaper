import type Konva from 'konva'
import type { Project } from '../types/schema'
import { getAABB } from './YardBoundaryLayer'

/** Module-level reference to the Konva Stage node, set by CanvasRoot */
let _stageNode: Konva.Stage | null = null

export function setStageRef(stage: Konva.Stage | null): void {
  _stageNode = stage
}

export function getStageRef(): Konva.Stage | null {
  return _stageNode
}

const MAX_EXPORT_PX = 8192

// Scale bar distance candidates (same as ScaleBar.tsx)
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

/**
 * Export the current canvas as a PNG image.
 *
 * Strategy: temporarily modify the Konva stage (viewport, layer visibility)
 * to render a clean export, call toDataURL, then draw the scale bar on top
 * (since ScaleBar is a DOM element not captured by Konva), then trigger download.
 */
export function exportToPNG(project: Project): void {
  const stage = _stageNode
  if (!stage) {
    console.error('[exportPNG] no stage ref available')
    return
  }

  // ── 1. Compute export region from yard boundary or all elements ──────
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

  // ── 3. Save current stage attrs ──────────────────────────────────────
  const savedX = stage.x()
  const savedY = stage.y()
  const savedScaleX = stage.scaleX()
  const savedScaleY = stage.scaleY()
  const savedWidth = stage.width()
  const savedHeight = stage.height()

  // ── 4. Identify layers to hide by counting from CanvasRoot order ─────
  // CanvasRoot layer order (0-based):
  //   0: Grid, 1: Reserved, 2: Terrain, 3: YardBoundary, 4: Path,
  //   5: Structure, 6: Plant, 7: Label, 8: Dimension, 9: OverflowDim,
  //   10: Selection, 11: SnapGuides
  const layers = stage.getLayers()
  const totalLayers = layers.length
  // Hide: Grid(0), Reserved(1), OverflowDim(totalLayers-3), Selection(totalLayers-2), SnapGuides(totalLayers-1)
  const hiddenIndices = new Set([0, 1, totalLayers - 3, totalLayers - 2, totalLayers - 1])

  const savedVisibility: Map<number, boolean> = new Map()
  for (const idx of hiddenIndices) {
    if (idx >= 0 && idx < totalLayers) {
      savedVisibility.set(idx, layers[idx].visible())
      layers[idx].visible(false)
    }
  }

  // ── 5. Set export viewport ───────────────────────────────────────────
  const exportZoom = scaleFactor
  stage.width(exportW)
  stage.height(exportH)
  stage.scaleX(exportZoom)
  stage.scaleY(exportZoom)
  stage.x(-worldX * exportZoom)
  stage.y(-worldY * exportZoom)

  // ── 6. Export to data URL ────────────────────────────────────────────
  let dataUrl: string | null = null
  try {
    dataUrl = stage.toDataURL({
      pixelRatio: 1,
      mimeType: 'image/png',
      width: exportW,
      height: exportH,
    })
  } catch (err) {
    console.error('[exportPNG] toDataURL failed:', err)
  } finally {
    // ── 7. Restore everything ──────────────────────────────────────────
    stage.x(savedX)
    stage.y(savedY)
    stage.scaleX(savedScaleX)
    stage.scaleY(savedScaleY)
    stage.width(savedWidth)
    stage.height(savedHeight)

    for (const [idx, wasVisible] of savedVisibility) {
      if (idx < totalLayers) {
        layers[idx].visible(wasVisible)
      }
    }

    stage.batchDraw()
  }

  if (!dataUrl) return

  // ── 8. Draw scale bar on top of the exported image ───────────────────
  // The ScaleBar is a DOM element (not in Konva), so we composite it onto the PNG.
  const { barLengthPx, label } = pickScaleBar(exportZoom)
  const img = new Image()
  img.onload = () => {
    const offscreen = document.createElement('canvas')
    offscreen.width = exportW
    offscreen.height = exportH
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    // Draw the exported stage image
    ctx.drawImage(img, 0, 0)

    // Draw scale bar in bottom-left
    const barX = 16
    const barY = exportH - 16
    const pillPadX = 8
    const pillPadY = 4
    const pillW = barLengthPx + pillPadX * 2
    const pillH = 24

    // White semi-transparent background pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.beginPath()
    const r = 6
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
    ctx.fillRect(barX, barTopY, barLengthPx, 4)

    // Distance label
    ctx.fillStyle = '#000000'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    ctx.fillText(label, barX, barTopY + 16)

    // Trigger download from the composited canvas
    const finalUrl = offscreen.toDataURL('image/png')
    triggerDownload(finalUrl, project.name)
  }
  img.src = dataUrl
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
