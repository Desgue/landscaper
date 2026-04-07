import { useRef, useEffect, useCallback } from 'react'
import { useViewportStore } from '../store/useViewportStore'
import { useProjectStore } from '../store/useProjectStore'
import { boundaryGetAABB as getAABB } from '../canvas/elementAABB'
import { fitToView } from '../canvas/viewport'

const MINIMAP_W = 160
const MINIMAP_H = 120
const BG_COLOR = '#f5f5f5'
const BOUNDARY_COLOR = '#555555'
const VIEWPORT_RECT_COLOR = 'rgba(25, 113, 194, 0.3)'
const VIEWPORT_RECT_BORDER = '#1971c2'

interface MinimapProps {
  canvasWidth: number
  canvasHeight: number
}

interface WorldBounds {
  x: number
  y: number
  w: number
  h: number
}

function computeWorldBounds(project: NonNullable<ReturnType<typeof useProjectStore.getState>['currentProject']>): WorldBounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  if (project.yardBoundary && project.yardBoundary.vertices.length >= 3) {
    const aabb = getAABB(project.yardBoundary)
    minX = Math.min(minX, aabb.x)
    minY = Math.min(minY, aabb.y)
    maxX = Math.max(maxX, aabb.x + aabb.w)
    maxY = Math.max(maxY, aabb.y + aabb.h)
  }

  for (const el of project.elements) {
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  }

  if (!isFinite(minX)) {
    return { x: 0, y: 0, w: 1000, h: 1000 }
  }

  const rawW = maxX - minX
  const rawH = maxY - minY
  const padX = Math.max(rawW * 0.1, 50)
  const padY = Math.max(rawH * 0.1, 50)

  return {
    x: minX - padX,
    y: minY - padY,
    w: rawW + padX * 2,
    h: rawH + padY * 2,
  }
}

function computeMinimapTransform(bounds: WorldBounds) {
  const scaleX = MINIMAP_W / bounds.w
  const scaleY = MINIMAP_H / bounds.h
  const scale = Math.min(scaleX, scaleY) * 0.9
  if (scale <= 0) return null
  const offsetX = (MINIMAP_W - bounds.w * scale) / 2 - bounds.x * scale
  const offsetY = (MINIMAP_H - bounds.h * scale) / 2 - bounds.y * scale
  return { scale, offsetX, offsetY }
}

/** Color lookup by element type */
const TYPE_COLORS: Record<string, string> = {
  terrain: '#a3be8c',
  plant: '#4c956c',
  structure: '#8b7355',
  path: '#c4a87a',
  label: '#555555',
  dimension: '#888888',
}

export default function Minimap({ canvasWidth, canvasHeight }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const dprRef = useRef(window.devicePixelRatio || 1)

  const { panX, panY, zoom, setPan, setViewport } = useViewportStore()
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)

  // Set canvas buffer size only on mount / DPR change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !project) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = dprRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    const bounds = computeWorldBounds(project)
    const transform = computeMinimapTransform(bounds)
    if (!transform) return
    const { scale, offsetX, offsetY } = transform

    // Draw yard boundary
    if (project.yardBoundary && project.yardBoundary.vertices.length >= 3) {
      ctx.beginPath()
      const verts = project.yardBoundary.vertices
      ctx.moveTo(verts[0].x * scale + offsetX, verts[0].y * scale + offsetY)
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x * scale + offsetX, verts[i].y * scale + offsetY)
      }
      ctx.closePath()
      ctx.strokeStyle = BOUNDARY_COLOR
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 2])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw elements (simplified colored rectangles)
    const layers = new Map(project.layers.map(l => [l.id, l]))
    for (const el of project.elements) {
      const layer = layers.get(el.layerId)
      if (layer && !layer.visible) continue

      let color = TYPE_COLORS[el.type] || '#999999'
      if (el.type === 'terrain') {
        const tt = registries.terrain.find(t => t.id === (el as { terrainTypeId: string }).terrainTypeId)
        if (tt) color = tt.color
      }

      const rx = el.x * scale + offsetX
      const ry = el.y * scale + offsetY
      const rw = Math.max(el.width * scale, 1)
      const rh = Math.max(el.height * scale, 1)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.7
      ctx.fillRect(rx, ry, rw, rh)
    }
    ctx.globalAlpha = 1

    // Draw viewport indicator rectangle using actual canvas dimensions
    const vpWorldLeft = -panX / zoom
    const vpWorldTop = -panY / zoom
    const vpWorldW = canvasWidth / zoom
    const vpWorldH = canvasHeight / zoom

    const vpRx = vpWorldLeft * scale + offsetX
    const vpRy = vpWorldTop * scale + offsetY
    const vpRw = vpWorldW * scale
    const vpRh = vpWorldH * scale

    ctx.fillStyle = VIEWPORT_RECT_COLOR
    ctx.fillRect(vpRx, vpRy, vpRw, vpRh)
    ctx.strokeStyle = VIEWPORT_RECT_BORDER
    ctx.lineWidth = 1.5
    ctx.strokeRect(vpRx, vpRy, vpRw, vpRh)
  }, [project, registries, panX, panY, zoom, canvasWidth, canvasHeight])

  useEffect(() => {
    draw()
  }, [draw])

  const minimapToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !project) return null

    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const bounds = computeWorldBounds(project)
    const transform = computeMinimapTransform(bounds)
    if (!transform) return null
    const { scale, offsetX, offsetY } = transform

    const worldX = (mx - offsetX) / scale
    const worldY = (my - offsetY) / scale
    return { worldX, worldY }
  }, [project])

  const panToWorldPoint = useCallback((worldX: number, worldY: number) => {
    setPan(canvasWidth / 2 - worldX * zoom, canvasHeight / 2 - worldY * zoom)
  }, [zoom, setPan, canvasWidth, canvasHeight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    const world = minimapToWorld(e.clientX, e.clientY)
    if (world) panToWorldPoint(world.worldX, world.worldY)
  }, [minimapToWorld, panToWorldPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const world = minimapToWorld(e.clientX, e.clientY)
    if (world) panToWorldPoint(world.worldX, world.worldY)
  }, [minimapToWorld, panToWorldPoint])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    const onUp = () => { isDraggingRef.current = false }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!project) return

    const fitElements: Array<{ x: number; y: number; width: number; height: number }> = []
    if (project.yardBoundary && project.yardBoundary.vertices.length >= 3) {
      const aabb = getAABB(project.yardBoundary)
      fitElements.push({ x: aabb.x, y: aabb.y, width: aabb.w, height: aabb.h })
    }
    for (const el of project.elements) {
      fitElements.push({ x: el.x, y: el.y, width: el.width, height: el.height })
    }

    const vp = fitToView(fitElements, canvasWidth, canvasHeight)
    setViewport(vp)
  }, [project, setViewport, canvasWidth, canvasHeight])

  if (!project) return null

  return (
    <div
      className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded shadow-sm overflow-hidden"
      style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_W, height: MINIMAP_H }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}
