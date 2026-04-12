/**
 * SelectionStateMachine — Framework-agnostic state machine for selection/manipulation.
 *
 * Extracted from SelectionLayer.tsx (Konva) for PixiJS Phase 4 migration.
 * Accepts pointer events as {worldX, worldY, button, shiftKey, altKey, type}
 * and mutates stores directly. No Konva or PixiJS imports.
 *
 * DragState modes: idle, box_selecting, moving, resizing, rotating, path_point_dragging
 */

import type { PathElement, Project, Vec2 } from '../types/schema'
import { createLogger } from '../utils/logger'
import type { CanvasContext } from './CanvasContext'
import {
  getElementAABB,
  getElementsAtPoint,
  getSelectionAABB,
  aabbIntersects,
  aabbContains,
  type AABB,
} from '../canvas/hitTestAll'
import { snapPoint } from '../snap/snapSystem'
import { getHandleHitThreshold } from './handleGeometry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DragMode =
  | 'idle'
  | 'box_selecting'
  | 'moving'
  | 'resizing'
  | 'rotating'
  | 'path_point_dragging'

export type HandlePosition =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se'

export interface SelectionPointerEvent {
  worldX: number
  worldY: number
  button: number
  shiftKey: boolean
  altKey: boolean
  type: 'down' | 'move' | 'up' | 'dblclick'
}

interface DragState {
  mode: DragMode
  startWorldX: number
  startWorldY: number
  currentWorldX: number
  currentWorldY: number
  additiveBoxSelect: boolean
  previousSelectedIds: string[]
  elementStartPositions: Map<string, { x: number; y: number; w: number; h: number }>
  resizeHandle: HandlePosition | null
  resizeElementId: string | null
  resizeStartAABB: AABB | null
  resizeMulti: boolean
  rotateElementId: string | null
  rotateStartAngle: number
  pathPointElementId: string | null
  pathPointIndex: number
  preOpSnapshot: Project | null
  altHeld: boolean
  shiftHeld: boolean
}

/** Externally observable state for the selection overlay renderer. */
export interface SelectionVisualState {
  mode: DragMode
  boxSelectRect: { x1: number; y1: number; x2: number; y2: number } | null
  snapGuideLines: Array<{ axis: 'x' | 'y'; value: number }>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SIZE_CM = 10
const SNAP_INCREMENT_RESIZE = 10

// ---------------------------------------------------------------------------
// Geometry helpers (pure, no framework deps)
// ---------------------------------------------------------------------------

export interface HandleInfo {
  pos: HandlePosition
  x: number
  y: number
}

export function getHandlePositions(aabb: AABB): HandleInfo[] {
  const { x, y, w, h } = aabb
  return [
    { pos: 'nw', x, y },
    { pos: 'n', x: x + w / 2, y },
    { pos: 'ne', x: x + w, y },
    { pos: 'w', x, y: y + h / 2 },
    { pos: 'e', x: x + w, y: y + h / 2 },
    { pos: 'sw', x, y: y + h },
    { pos: 's', x: x + w / 2, y: y + h },
    { pos: 'se', x: x + w, y: y + h },
  ]
}

export function getHandleAtPoint(
  aabb: AABB,
  worldX: number,
  worldY: number,
  zoom: number,
): HandlePosition | null {
  const threshold = getHandleHitThreshold(zoom)
  const handles = getHandlePositions(aabb)
  for (const h of handles) {
    if (Math.abs(worldX - h.x) <= threshold && Math.abs(worldY - h.y) <= threshold) {
      return h.pos
    }
  }
  return null
}

export function isOnRotationHandle(
  aabb: AABB,
  worldX: number,
  worldY: number,
  zoom: number,
): boolean {
  const threshold = getHandleHitThreshold(zoom)
  const handleX = aabb.x + aabb.w / 2
  const handleY = aabb.y - 10 / zoom
  return Math.abs(worldX - handleX) <= threshold && Math.abs(worldY - handleY) <= threshold
}

function recalcPathAABB(points: Vec2[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function normalizeBoxAABB(x1: number, y1: number, x2: number, y2: number): AABB {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}

// ---------------------------------------------------------------------------
// Mode-initialiser functions
// ---------------------------------------------------------------------------

function initPathPointDrag(
  worldX: number,
  worldY: number,
  project: Project,
  primaryId: string,
  selectedSize: number,
  zoom: number,
): DragState | null {
  if (selectedSize !== 1) return null
  const selectedEl = project.elements.find((el) => el.id === primaryId)
  if (!selectedEl || selectedEl.type !== 'path') return null
  const pathEl = selectedEl as PathElement
  const threshold = getHandleHitThreshold(zoom)
  for (let i = 0; i < pathEl.points.length; i++) {
    const pt = pathEl.points[i]
    if (Math.abs(worldX - pt.x) <= threshold && Math.abs(worldY - pt.y) <= threshold) {
      const drag = createIdleDragState()
      drag.mode = 'path_point_dragging'
      drag.startWorldX = worldX
      drag.startWorldY = worldY
      drag.currentWorldX = worldX
      drag.currentWorldY = worldY
      drag.pathPointElementId = primaryId
      drag.pathPointIndex = i
      drag.preOpSnapshot = structuredClone(project)
      log.debug('handleDown → path_point_dragging', { elementId: primaryId, pointIndex: i, worldX, worldY })
      return drag
    }
  }
  return null
}

function initMultiResizeDrag(
  worldX: number,
  worldY: number,
  project: Project,
  selectedIds: ReadonlySet<string>,
  zoom: number,
): DragState | null {
  if (selectedIds.size <= 1) return null
  const selElements = project.elements.filter((el) => selectedIds.has(el.id))
  if (selElements.length <= 1) return null
  const combinedAABB = getSelectionAABB(selElements)
  const handle = getHandleAtPoint(combinedAABB, worldX, worldY, zoom)
  if (!handle) return null
  const drag = createIdleDragState()
  drag.mode = 'resizing'
  drag.startWorldX = worldX
  drag.startWorldY = worldY
  drag.currentWorldX = worldX
  drag.currentWorldY = worldY
  drag.resizeHandle = handle
  drag.resizeElementId = null
  drag.resizeMulti = true
  drag.resizeStartAABB = { ...combinedAABB }
  drag.preOpSnapshot = structuredClone(project)
  for (const el of selElements) {
    drag.elementStartPositions.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height })
  }
  log.debug('handleDown → resizing (multi)', { handle, elementCount: selElements.length, worldX, worldY })
  return drag
}

function initSingleResizeDrag(
  worldX: number,
  worldY: number,
  project: Project,
  primaryId: string,
  selectedSize: number,
  zoom: number,
): DragState | null {
  if (selectedSize !== 1) return null
  const selectedEl = project.elements.find((el) => el.id === primaryId)
  if (!selectedEl || (selectedEl.type !== 'structure' && selectedEl.type !== 'label')) return null
  const aabb = getElementAABB(selectedEl)
  const handle = getHandleAtPoint(aabb, worldX, worldY, zoom)
  if (!handle) return null
  const drag = createIdleDragState()
  drag.mode = 'resizing'
  drag.startWorldX = worldX
  drag.startWorldY = worldY
  drag.currentWorldX = worldX
  drag.currentWorldY = worldY
  drag.resizeHandle = handle
  drag.resizeElementId = primaryId
  drag.resizeStartAABB = { ...aabb }
  drag.preOpSnapshot = structuredClone(project)
  log.debug('handleDown → resizing', { handle, elementId: primaryId, worldX, worldY })
  return drag
}

function initRotateDrag(
  worldX: number,
  worldY: number,
  project: Project,
  primaryId: string,
  selectedSize: number,
  zoom: number,
): DragState | null {
  if (selectedSize !== 1) return null
  const selectedEl = project.elements.find((el) => el.id === primaryId)
  if (!selectedEl || selectedEl.type !== 'structure') return null
  const aabb = getElementAABB(selectedEl)
  if (!isOnRotationHandle(aabb, worldX, worldY, zoom)) return null
  const drag = createIdleDragState()
  drag.mode = 'rotating'
  drag.startWorldX = worldX
  drag.startWorldY = worldY
  drag.currentWorldX = worldX
  drag.currentWorldY = worldY
  drag.rotateElementId = primaryId
  const cx = aabb.x + aabb.w / 2
  const cy = aabb.y + aabb.h / 2
  drag.rotateStartAngle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) - selectedEl.rotation
  drag.preOpSnapshot = structuredClone(project)
  log.debug('handleDown → rotating', { elementId: primaryId, worldX, worldY })
  return drag
}

function initMoveDrag(
  worldX: number,
  worldY: number,
  project: Project,
  selectedIds: ReadonlySet<string>,
): DragState | null {
  const drag = createIdleDragState()
  drag.mode = 'moving'
  drag.startWorldX = worldX
  drag.startWorldY = worldY
  drag.currentWorldX = worldX
  drag.currentWorldY = worldY
  drag.preOpSnapshot = structuredClone(project)
  log.debug('handleDown → moving', { elementCount: selectedIds.size, worldX, worldY })
  for (const el of project.elements) {
    if (selectedIds.has(el.id)) {
      drag.elementStartPositions.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height })
    }
  }
  return drag
}

function initBoxSelect(
  worldX: number,
  worldY: number,
  shiftKey: boolean,
  currentSelectedIds: ReadonlySet<string>,
): DragState {
  const drag = createIdleDragState()
  drag.mode = 'box_selecting'
  drag.startWorldX = worldX
  drag.startWorldY = worldY
  drag.currentWorldX = worldX
  drag.currentWorldY = worldY
  drag.additiveBoxSelect = shiftKey
  log.debug('handleDown → box_selecting', { worldX, worldY, additive: shiftKey })
  if (shiftKey) {
    drag.previousSelectedIds = Array.from(currentSelectedIds)
  }
  return drag
}

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

function createIdleDragState(): DragState {
  return {
    mode: 'idle',
    startWorldX: 0,
    startWorldY: 0,
    currentWorldX: 0,
    currentWorldY: 0,
    additiveBoxSelect: false,
    previousSelectedIds: [],
    elementStartPositions: new Map(),
    resizeHandle: null,
    resizeElementId: null,
    resizeStartAABB: null,
    resizeMulti: false,
    rotateElementId: null,
    rotateStartAngle: 0,
    pathPointElementId: null,
    pathPointIndex: -1,
    preOpSnapshot: null,
    altHeld: false,
    shiftHeld: false,
  }
}

export interface SelectionStateMachine {
  /** Process a pointer event. Returns updated visual state. */
  handlePointer(event: SelectionPointerEvent): SelectionVisualState
  /** Get current visual state (for overlay rendering). */
  getVisualState(): SelectionVisualState
  /** Get current drag mode. */
  getMode(): DragMode
  /** Reset to idle state. */
  reset(): void
  /** Clean up resources. */
  destroy(): void
}

const log = createLogger('SSM')

export function createSelectionStateMachine(ctx: CanvasContext): SelectionStateMachine {
  let drag: DragState = createIdleDragState()
  let eraserActive = false
  let eraserSnapshot: Project | null = null
  let lastSnapGuideLines: Array<{ axis: 'x' | 'y'; value: number }> = []

  // ---- Eraser helper ----
  function eraseAtPoint(worldX: number, worldY: number): void {
    const project = ctx.getProject()
    if (!project) return
    const hits = getElementsAtPoint(project.elements, project.layers, worldX, worldY)
    if (hits.length === 0) return
    const topElement = hits[0]
    log.debug('eraseAtPoint', { elementId: topElement.id, elementType: topElement.type })
    ctx.applyLiveUpdate('eraseElement', (draft) => {
      draft.elements = draft.elements.filter((el) => el.id !== topElement.id)
      for (const g of draft.groups) {
        g.elementIds = g.elementIds.filter((id) => id !== topElement.id)
      }
    })
  }

  // ---- Visual state ----
  function getVisualState(): SelectionVisualState {
    const boxSelectRect = drag.mode === 'box_selecting'
      ? { x1: drag.startWorldX, y1: drag.startWorldY, x2: drag.currentWorldX, y2: drag.currentWorldY }
      : null
    return {
      mode: drag.mode,
      boxSelectRect,
      snapGuideLines: lastSnapGuideLines,
    }
  }

  // ---- Handlers ----
  function handleDown(ev: SelectionPointerEvent): void {
    const { worldX, worldY, shiftKey } = ev
    const tool = ctx.getToolState().activeTool

    // --- Eraser tool ---
    if (tool === 'eraser') {
      eraserActive = true
      const project = ctx.getProject()
      if (project) eraserSnapshot = structuredClone(project)
      eraseAtPoint(worldX, worldY)
      return
    }

    if (tool !== 'select') return

    const project = ctx.getProject()
    if (!project) return

    const {
      selectedIds: currentSelectedIds,
      primaryId: currentPrimaryId,
      groupEditingId: currentGroupEditingId,
    } = ctx.getSelectionState()

    const zoom = ctx.getZoom()

    // Handle hit-tests (path points, resize handles, rotation handle) — before click-to-select
    const handleHit =
      (currentPrimaryId
        ? initPathPointDrag(worldX, worldY, project, currentPrimaryId, currentSelectedIds.size, zoom)
        : null) ??
      initMultiResizeDrag(worldX, worldY, project, currentSelectedIds, zoom) ??
      (currentPrimaryId
        ? initSingleResizeDrag(worldX, worldY, project, currentPrimaryId, currentSelectedIds.size, zoom)
        : null) ??
      (currentPrimaryId
        ? initRotateDrag(worldX, worldY, project, currentPrimaryId, currentSelectedIds.size, zoom)
        : null) ??
      null

    if (handleHit !== null) {
      drag = handleHit
      return
    }

    // Store click position for Tab cycling
    ctx.setLastClickWorldPos({ x: worldX, y: worldY })

    // Hit test for element under cursor
    const hits = getElementsAtPoint(project.elements, project.layers, worldX, worldY)
    const topHit = hits[0] ?? null

    if (topHit) {
      // Resolve group selection
      const group = topHit.groupId
        ? project.groups.find((g) => g.id === topHit.groupId)
        : null
      const inGroupEditMode = currentGroupEditingId !== null && group?.id === currentGroupEditingId

      let idsToSelect: string[]
      if (group && !inGroupEditMode) {
        idsToSelect = group.elementIds
      } else {
        idsToSelect = [topHit.id]
      }

      const isAlreadySelected = idsToSelect.every((id) => currentSelectedIds.has(id))

      if (shiftKey) {
        for (const id of idsToSelect) {
          ctx.toggleSelect(id)
        }
        return
      }

      if (!isAlreadySelected) {
        ctx.selectMultiple(idsToSelect)
      }

      // Start MOVING — read updated selection after selectMultiple
      const sel = ctx.getSelectionState().selectedIds
      drag = initMoveDrag(worldX, worldY, project, sel) ?? drag
    } else {
      // Clicked on empty space
      if (!shiftKey) {
        ctx.deselectAll()
        if (currentGroupEditingId !== null) {
          ctx.setGroupEditing(null)
        }
      }

      drag = initBoxSelect(worldX, worldY, shiftKey, currentSelectedIds)
    }
  }

  function handleMove(ev: SelectionPointerEvent): void {
    const { worldX, worldY, altKey, shiftKey } = ev
    const tool = ctx.getToolState().activeTool

    // Eraser drag
    if (tool === 'eraser' && eraserActive) {
      eraseAtPoint(worldX, worldY)
      return
    }

    if (drag.mode === 'idle') {
      lastSnapGuideLines = []
      return
    }

    drag.currentWorldX = worldX
    drag.currentWorldY = worldY
    drag.altHeld = altKey
    drag.shiftHeld = shiftKey

    const project = ctx.getProject()
    if (!project) return

    const zoom = ctx.getZoom()

    if (drag.mode === 'box_selecting') {
      const boxAABB = normalizeBoxAABB(drag.startWorldX, drag.startWorldY, worldX, worldY)
      const matchingIds: string[] = []
      const layerMap = new Map(project.layers.map((l) => [l.id, l]))

      for (const el of project.elements) {
        const layer = layerMap.get(el.layerId)
        if (layer && !layer.visible) continue
        if (el.locked || (layer && layer.locked)) continue

        const elAABB = getElementAABB(el)
        const isInside = drag.shiftHeld
          ? aabbIntersects(boxAABB, elAABB)
          : aabbContains(boxAABB, elAABB)

        if (isInside) matchingIds.push(el.id)
      }

      // Expand to full groups
      const expandedIds = new Set(matchingIds)
      for (const id of matchingIds) {
        const el = project.elements.find((e) => e.id === id)
        if (el?.groupId) {
          const group = project.groups.find((g) => g.id === el.groupId)
          if (group) {
            for (const memberId of group.elementIds) expandedIds.add(memberId)
          }
        }
      }

      // Merge with previous selection if additive
      const allIds = drag.additiveBoxSelect
        ? [...new Set([...drag.previousSelectedIds, ...expandedIds])]
        : [...expandedIds]

      ctx.selectMultiple(allIds)
      lastSnapGuideLines = []
    } else if (drag.mode === 'moving') {
      const deltaX = worldX - drag.startWorldX
      const deltaY = worldY - drag.startWorldY

      // Compute snap once using the first selected element's position,
      // then apply the delta uniformly to all selected elements.
      // This preserves relative positions between multi-selected elements.
      const firstId = [...drag.elementStartPositions.keys()][0]
      const firstStart = firstId ? drag.elementStartPositions.get(firstId) : undefined
      let snapDX = 0
      let snapDY = 0
      if (firstStart) {
        const snapResult = snapPoint(
          firstStart.x + deltaX, firstStart.y + deltaY,
          'move', project.elements, zoom,
          project.gridConfig.snapIncrementCm,
          project.uiState.snapEnabled,
          drag.altHeld,
        )
        snapDX = snapResult.x - (firstStart.x + deltaX)
        snapDY = snapResult.y - (firstStart.y + deltaY)
        lastSnapGuideLines = snapResult.guideLines
      }

      ctx.applyLiveUpdate('moveSelection', (draft) => {
        for (const el of draft.elements) {
          const startPos = drag.elementStartPositions.get(el.id)
          if (!startPos) continue
          el.x = startPos.x + deltaX + snapDX
          el.y = startPos.y + deltaY + snapDY
          el.updatedAt = new Date().toISOString()
        }
      })
    } else if (drag.mode === 'resizing' && drag.resizeHandle && drag.resizeMulti && drag.resizeStartAABB) {
      const startAABB = drag.resizeStartAABB
      const handle = drag.resizeHandle
      const dX = worldX - drag.startWorldX
      const dY = worldY - drag.startWorldY

      let newX = startAABB.x
      let newY = startAABB.y
      let newW = startAABB.w
      let newH = startAABB.h

      if (handle.includes('w')) { newX = startAABB.x + dX; newW = startAABB.w - dX }
      if (handle.includes('e')) { newW = startAABB.w + dX }
      if (handle.includes('n')) { newY = startAABB.y + dY; newH = startAABB.h - dY }
      if (handle.includes('s')) { newH = startAABB.h + dY }

      if (newW < MIN_SIZE_CM) {
        if (handle.includes('w')) newX = startAABB.x + startAABB.w - MIN_SIZE_CM
        newW = MIN_SIZE_CM
      }
      if (newH < MIN_SIZE_CM) {
        if (handle.includes('n')) newY = startAABB.y + startAABB.h - MIN_SIZE_CM
        newH = MIN_SIZE_CM
      }

      // Guard against division by zero for degenerate selections
      const scaleX = startAABB.w > 0 ? newW / startAABB.w : 1
      const scaleY = startAABB.h > 0 ? newH / startAABB.h : 1

      ctx.applyLiveUpdate('resizeMultiSelection', (draft) => {
        for (const el of draft.elements) {
          const startPos = drag.elementStartPositions.get(el.id)
          if (!startPos) continue
          const nx = newX + (startPos.x - startAABB.x) * scaleX
          const ny = newY + (startPos.y - startAABB.y) * scaleY
          const nw = Math.max(MIN_SIZE_CM, startPos.w * scaleX)
          const nh = Math.max(MIN_SIZE_CM, startPos.h * scaleY)
          // Prevent NaN propagation to store
          if (Number.isFinite(nx)) el.x = nx
          if (Number.isFinite(ny)) el.y = ny
          if (Number.isFinite(nw)) el.width = nw
          if (Number.isFinite(nh)) el.height = nh
          el.updatedAt = new Date().toISOString()
        }
      })
      lastSnapGuideLines = []
    } else if (drag.mode === 'resizing' && drag.resizeHandle && drag.resizeElementId && drag.resizeStartAABB) {
      const startAABB = drag.resizeStartAABB
      const handle = drag.resizeHandle
      const dX = worldX - drag.startWorldX
      const dY = worldY - drag.startWorldY
      const disableSnap = drag.altHeld

      let newX = startAABB.x
      let newY = startAABB.y
      let newW = startAABB.w
      let newH = startAABB.h

      if (handle.includes('w')) { newX = startAABB.x + dX; newW = startAABB.w - dX }
      if (handle.includes('e')) { newW = startAABB.w + dX }
      if (handle.includes('n')) { newY = startAABB.y + dY; newH = startAABB.h - dY }
      if (handle.includes('s')) { newH = startAABB.h + dY }

      if (!disableSnap) {
        newW = Math.round(newW / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
        newH = Math.round(newH / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
        newX = Math.round(newX / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
        newY = Math.round(newY / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
      }

      if (newW < MIN_SIZE_CM) {
        if (handle.includes('w')) newX = startAABB.x + startAABB.w - MIN_SIZE_CM
        newW = MIN_SIZE_CM
      }
      if (newH < MIN_SIZE_CM) {
        if (handle.includes('n')) newY = startAABB.y + startAABB.h - MIN_SIZE_CM
        newH = MIN_SIZE_CM
      }

      ctx.applyLiveUpdate('resizeElement', (draft) => {
        const el = draft.elements.find((e) => e.id === drag.resizeElementId)
        if (!el) return
        el.x = newX
        el.y = newY
        el.width = newW
        el.height = newH
        el.updatedAt = new Date().toISOString()
      })
      lastSnapGuideLines = []
    } else if (drag.mode === 'path_point_dragging' && drag.pathPointElementId !== null) {
      ctx.applyLiveUpdate('dragPathPoint', (draft) => {
        const el = draft.elements.find((e) => e.id === drag.pathPointElementId)
        if (!el || el.type !== 'path') return
        const pathEl = el as PathElement
        const idx = drag.pathPointIndex
        if (idx < 0 || idx >= pathEl.points.length) return
        pathEl.points[idx] = { x: worldX, y: worldY }
        const aabb = recalcPathAABB(pathEl.points)
        pathEl.x = aabb.x
        pathEl.y = aabb.y
        pathEl.width = aabb.width || 1
        pathEl.height = aabb.height || 1
        pathEl.updatedAt = new Date().toISOString()
      })
      lastSnapGuideLines = []
    } else if (drag.mode === 'rotating' && drag.rotateElementId) {
      ctx.applyLiveUpdate('rotateElement', (draft) => {
        const target = draft.elements.find((e) => e.id === drag.rotateElementId)
        if (!target) return
        const aabb = getElementAABB(target)
        const cx = aabb.x + aabb.w / 2
        const cy = aabb.y + aabb.h / 2
        const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI)
        // Guard against NaN rotation
        if (!Number.isFinite(target.rotation)) target.rotation = 0
        let newRotation = angle - drag.rotateStartAngle
        newRotation = ((newRotation % 360) + 360) % 360
        target.rotation = newRotation
        target.updatedAt = new Date().toISOString()
      })
      lastSnapGuideLines = []
    }
  }

  function handleUp(_ev: SelectionPointerEvent): void {
    const tool = ctx.getToolState().activeTool

    // Eraser release
    // intentional: pre-captured drag snapshot (not commitProjectUpdate)
    if (tool === 'eraser') {
      eraserActive = false
      if (eraserSnapshot) {
        ctx.pushDragHistory(eraserSnapshot)
        eraserSnapshot = null
      }
      return
    }

    // intentional: pre-captured drag snapshot (not commitProjectUpdate)
    if (
      drag.mode === 'moving' ||
      drag.mode === 'resizing' ||
      drag.mode === 'rotating' ||
      drag.mode === 'path_point_dragging'
    ) {
      log.debug('handleUp', { mode: drag.mode, deltaX: drag.currentWorldX - drag.startWorldX, deltaY: drag.currentWorldY - drag.startWorldY })
      if (drag.preOpSnapshot) {
        ctx.pushDragHistory(drag.preOpSnapshot)
      }
    }

    // Reset drag state
    drag = createIdleDragState()
    lastSnapGuideLines = []
  }

  function handleDblClick(ev: SelectionPointerEvent): void {
    if (ctx.getToolState().activeTool !== 'select') return

    const project = ctx.getProject()
    if (!project) return

    const hits = getElementsAtPoint(project.elements, project.layers, ev.worldX, ev.worldY)
    const topHit = hits[0]
    if (!topHit || !topHit.groupId) return

    const group = project.groups.find((g) => g.id === topHit.groupId)
    if (group) {
      ctx.setGroupEditing(group.id)
      ctx.select(topHit.id)
    }
  }

  // ---- Public API ----
  return {
    handlePointer(event: SelectionPointerEvent): SelectionVisualState {
      switch (event.type) {
        case 'down':
          handleDown(event)
          break
        case 'move':
          handleMove(event)
          break
        case 'up':
          handleUp(event)
          break
        case 'dblclick':
          handleDblClick(event)
          break
      }
      return getVisualState()
    },

    getVisualState,

    getMode(): DragMode {
      return drag.mode
    },

    reset(): void {
      drag = createIdleDragState()
      eraserActive = false
      eraserSnapshot = null
      lastSnapGuideLines = []
    },

    destroy(): void {
      drag = createIdleDragState()
      eraserActive = false
      eraserSnapshot = null
      lastSnapGuideLines = []
    },
  }
}
