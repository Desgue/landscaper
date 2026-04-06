/**
 * SelectionLayer.tsx — Main selection/manipulation interaction Konva layer.
 * Handles click-to-select, box-select, move, resize, rotate, and eraser tool.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Layer, Rect, Circle, Group as KonvaGroup } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CanvasElement, PathElement, Project, Vec2 } from '../types/schema'
import { useToolStore } from '../store/useToolStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useViewportStore } from '../store/useViewportStore'
import { useInspectorStore } from '../store/useInspectorStore'
import {
  hitTestElement,
  getElementAABB,
  getElementsAtPoint,
  getSelectionAABB,
  aabbIntersects,
  aabbContains,
  type AABB,
} from './hitTestAll'
import { snapPoint } from '../snap/snapSystem'

// ---------- Types ----------

type DragMode = 'idle' | 'box_selecting' | 'moving' | 'resizing' | 'rotating' | 'path_point_dragging'

type HandlePosition =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se'

interface DragState {
  mode: DragMode
  // World coordinates of the initial mousedown
  startWorldX: number
  startWorldY: number
  // Current world position during drag
  currentWorldX: number
  currentWorldY: number
  // For box-select: whether shift was held at the start
  additiveBoxSelect: boolean
  // For box-select: previous selection to merge with
  previousSelectedIds: string[]
  // For moving: pre-move element positions keyed by id
  elementStartPositions: Map<string, { x: number; y: number; w: number; h: number }>
  // For resizing
  resizeHandle: HandlePosition | null
  resizeElementId: string | null
  resizeStartAABB: AABB | null
  // For multi-element (group) resize
  resizeMulti: boolean
  // For rotating
  rotateElementId: string | null
  rotateStartAngle: number
  // For path point dragging
  pathPointElementId: string | null
  pathPointIndex: number
  // Pre-operation snapshot for undo
  preOpSnapshot: Project | null
  // Whether alt was held during last mousemove
  altHeld: boolean
  // Whether shift was held during last mousemove
  shiftHeld: boolean
}

interface SelectionLayerProps {
  width: number
  height: number
}

// ---------- Helpers ----------

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

function getPointerWorldPos(
  e: KonvaEventObject<MouseEvent>,
  panX: number,
  panY: number,
  zoom: number,
): { worldX: number; worldY: number } | null {
  const stage = e.target.getStage()
  if (!stage) return null
  const pos = stage.getPointerPosition()
  if (!pos) return null
  return {
    worldX: (pos.x - panX) / zoom,
    worldY: (pos.y - panY) / zoom,
  }
}

const MIN_SIZE_CM = 10
const SNAP_INCREMENT_RESIZE = 10

// ---------- Component ----------

export const SelectionLayer: React.FC<SelectionLayerProps> = React.memo(
  function SelectionLayer({ width, height }) {
    const activeTool = useToolStore((s) => s.activeTool)
    const selectedIds = useSelectionStore((s) => s.selectedIds)
    const primaryId = useSelectionStore((s) => s.primaryId)
    const groupEditingId = useSelectionStore((s) => s.groupEditingId)

    const dragRef = useRef<DragState>(createIdleDragState())
    const layerRef = useRef<Konva.Layer>(null)

    // Track eraser being held down
    const eraserActiveRef = useRef(false)
    const eraserSnapshotRef = useRef<Project | null>(null)

    // State for box-select rect so React re-renders when it changes
    const [boxSelectRect, setBoxSelectRect] = useState<{x1:number,y1:number,x2:number,y2:number} | null>(null)

    const isListening = activeTool === 'select' || activeTool === 'eraser'

    // Sync inspector whenever selection changes
    useEffect(() => {
      useInspectorStore.getState().setInspectedElementId(primaryId)
    }, [primaryId])

    // Escape key handler for group editing
    useEffect(() => {
      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape' && groupEditingId !== null) {
          useSelectionStore.getState().setGroupEditing(null)
          useSelectionStore.getState().deselectAll()
          useInspectorStore.getState().setInspectedElementId(null)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [groupEditingId])

    // ---------- Eraser helpers ----------

    const eraseAtPoint = useCallback((worldX: number, worldY: number) => {
      const project = useProjectStore.getState().currentProject
      if (!project) return
      const hits = getElementsAtPoint(project.elements, project.layers, worldX, worldY)
      if (hits.length === 0) return
      const topElement = hits[0]
      useProjectStore.getState().updateProject((draft) => {
        draft.elements = draft.elements.filter((el) => el.id !== topElement.id)
        for (const g of draft.groups) {
          g.elementIds = g.elementIds.filter((id) => id !== topElement.id)
        }
      })
    }, [])

    // ---------- Mouse handlers ----------

    const handleMouseDown = useCallback(
      (e: KonvaEventObject<MouseEvent>) => {
        const { panX, panY, zoom } = useViewportStore.getState()
        const pos = getPointerWorldPos(e, panX, panY, zoom)
        if (!pos) return
        const { worldX, worldY } = pos
        const shiftHeld = e.evt.shiftKey
        const tool = useToolStore.getState().activeTool

        // --- Eraser tool ---
        if (tool === 'eraser') {
          eraserActiveRef.current = true
          const project = useProjectStore.getState().currentProject
          if (project) eraserSnapshotRef.current = structuredClone(project)
          eraseAtPoint(worldX, worldY)
          return
        }

        if (tool !== 'select') return

        const project = useProjectStore.getState().currentProject
        if (!project) return

        const {
          selectedIds: currentSelectedIds,
          primaryId: currentPrimaryId,
          groupEditingId: currentGroupEditingId,
        } = useSelectionStore.getState()

        const drag = dragRef.current

        // Check if clicking on a path point handle first
        if (currentSelectedIds.size === 1 && currentPrimaryId) {
          const selectedEl = project.elements.find((el) => el.id === currentPrimaryId)
          if (selectedEl && selectedEl.type === 'path') {
            const pathEl = selectedEl as PathElement
            const threshold = 6 / zoom
            for (let i = 0; i < pathEl.points.length; i++) {
              const pt = pathEl.points[i]
              if (Math.abs(worldX - pt.x) <= threshold && Math.abs(worldY - pt.y) <= threshold) {
                Object.assign(drag, createIdleDragState())
                drag.mode = 'path_point_dragging'
                drag.startWorldX = worldX
                drag.startWorldY = worldY
                drag.currentWorldX = worldX
                drag.currentWorldY = worldY
                drag.pathPointElementId = currentPrimaryId
                drag.pathPointIndex = i
                drag.preOpSnapshot = structuredClone(project)
                return
              }
            }
          }
        }

        // Check if clicking on a multi-element resize handle (group AABB)
        if (currentSelectedIds.size > 1) {
          const selElements = project.elements.filter((el) => currentSelectedIds.has(el.id))
          if (selElements.length > 1) {
            const combinedAABB = getSelectionAABB(selElements)
            const handle = getHandleAtPoint(combinedAABB, worldX, worldY, zoom)
            if (handle) {
              Object.assign(drag, createIdleDragState())
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
              // Store start positions and sizes for all selected elements
              for (const el of selElements) {
                drag.elementStartPositions.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height })
              }
              return
            }
          }
        }

        // Check if clicking on a resize handle first
        if (currentSelectedIds.size === 1 && currentPrimaryId) {
          const selectedEl = project.elements.find((el) => el.id === currentPrimaryId)
          if (selectedEl && (selectedEl.type === 'structure' || selectedEl.type === 'label')) {
            const aabb = getElementAABB(selectedEl)
            const handle = getHandleAtPoint(aabb, worldX, worldY, zoom)
            if (handle) {
              Object.assign(drag, createIdleDragState())
              drag.mode = 'resizing'
              drag.startWorldX = worldX
              drag.startWorldY = worldY
              drag.currentWorldX = worldX
              drag.currentWorldY = worldY
              drag.resizeHandle = handle
              drag.resizeElementId = currentPrimaryId
              drag.resizeStartAABB = { ...aabb }
              drag.preOpSnapshot = structuredClone(project)
              return
            }
          }

          // Check rotation handle (structures only)
          if (selectedEl && selectedEl.type === 'structure') {
            const aabb = getElementAABB(selectedEl)
            if (isOnRotationHandle(aabb, worldX, worldY, zoom)) {
              Object.assign(drag, createIdleDragState())
              drag.mode = 'rotating'
              drag.startWorldX = worldX
              drag.startWorldY = worldY
              drag.currentWorldX = worldX
              drag.currentWorldY = worldY
              drag.rotateElementId = currentPrimaryId
              const cx = aabb.x + aabb.w / 2
              const cy = aabb.y + aabb.h / 2
              drag.rotateStartAngle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) - selectedEl.rotation
              drag.preOpSnapshot = structuredClone(project)
              return
            }
          }
        }

        // Store click position for Tab cycling
        useSelectionStore.getState().setLastClickWorldPos({ x: worldX, y: worldY })

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
            // Select entire group
            idsToSelect = group.elementIds
          } else {
            idsToSelect = [topHit.id]
          }

          const isAlreadySelected = idsToSelect.every((id) => currentSelectedIds.has(id))

          if (shiftHeld) {
            // Toggle selection
            for (const id of idsToSelect) {
              useSelectionStore.getState().toggleSelect(id)
            }
            return
          }

          if (!isAlreadySelected) {
            useSelectionStore.getState().selectMultiple(idsToSelect)
          }

          // Start MOVING
          Object.assign(drag, createIdleDragState())
          drag.mode = 'moving'
          drag.startWorldX = worldX
          drag.startWorldY = worldY
          drag.currentWorldX = worldX
          drag.currentWorldY = worldY
          drag.preOpSnapshot = structuredClone(project)

          // Record start positions and sizes of all selected elements
          const sel = useSelectionStore.getState().selectedIds
          for (const el of project.elements) {
            if (sel.has(el.id)) {
              drag.elementStartPositions.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height })
            }
          }
        } else {
          // Clicked on empty space
          if (!shiftHeld) {
            useSelectionStore.getState().deselectAll()
            // Exit group editing if clicking outside
            if (currentGroupEditingId !== null) {
              useSelectionStore.getState().setGroupEditing(null)
            }
          }

          // Start BOX_SELECTING
          Object.assign(drag, createIdleDragState())
          drag.mode = 'box_selecting'
          drag.startWorldX = worldX
          drag.startWorldY = worldY
          drag.currentWorldX = worldX
          drag.currentWorldY = worldY
          drag.additiveBoxSelect = shiftHeld
          if (shiftHeld) {
            drag.previousSelectedIds = Array.from(currentSelectedIds)
          }
          setBoxSelectRect({ x1: worldX, y1: worldY, x2: worldX, y2: worldY })
        }
      },
      [eraseAtPoint],
    )

    const handleMouseMove = useCallback(
      (e: KonvaEventObject<MouseEvent>) => {
        const { panX, panY, zoom } = useViewportStore.getState()
        const pos = getPointerWorldPos(e, panX, panY, zoom)
        if (!pos) return
        const { worldX, worldY } = pos
        const tool = useToolStore.getState().activeTool

        // Eraser drag
        if (tool === 'eraser' && eraserActiveRef.current) {
          eraseAtPoint(worldX, worldY)
          return
        }

        const drag = dragRef.current
        if (drag.mode === 'idle') return

        drag.currentWorldX = worldX
        drag.currentWorldY = worldY
        drag.altHeld = e.evt.altKey
        drag.shiftHeld = e.evt.shiftKey

        const project = useProjectStore.getState().currentProject
        if (!project) return

        if (drag.mode === 'box_selecting') {
          // Compute box in world coords
          const boxAABB = normalizeBoxAABB(
            drag.startWorldX,
            drag.startWorldY,
            worldX,
            worldY,
          )

          // Find elements inside box
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

            if (isInside) {
              matchingIds.push(el.id)
            }
          }

          // Expand selection to include full groups
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

          useSelectionStore.getState().selectMultiple(allIds)
          setBoxSelectRect({ x1: drag.startWorldX, y1: drag.startWorldY, x2: worldX, y2: worldY })
        } else if (drag.mode === 'moving') {
          const deltaX = worldX - drag.startWorldX
          const deltaY = worldY - drag.startWorldY

          useProjectStore.getState().updateProject((draft) => {
            for (const el of draft.elements) {
              const startPos = drag.elementStartPositions.get(el.id)
              if (!startPos) continue

              let newX = startPos.x + deltaX
              let newY = startPos.y + deltaY

              // Move context: snap OFF by default, Alt enables snap
              const snapResult = snapPoint(
                newX,
                newY,
                'move',
                draft.elements,
                zoom,
                project.gridConfig.snapIncrementCm,
                project.uiState.snapEnabled,
                drag.altHeld,
              )
              newX = snapResult.x
              newY = snapResult.y

              el.x = newX
              el.y = newY
              el.updatedAt = new Date().toISOString()
            }
          })
        } else if (drag.mode === 'resizing' && drag.resizeHandle && drag.resizeMulti && drag.resizeStartAABB) {
          // Multi-element (group) proportional resize
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

          // Enforce minimum combined size (recalculate origin for w/n handles)
          if (newW < MIN_SIZE_CM) {
            if (handle.includes('w')) newX = startAABB.x + startAABB.w - MIN_SIZE_CM
            newW = MIN_SIZE_CM
          }
          if (newH < MIN_SIZE_CM) {
            if (handle.includes('n')) newY = startAABB.y + startAABB.h - MIN_SIZE_CM
            newH = MIN_SIZE_CM
          }

          const scaleX = newW / startAABB.w
          const scaleY = newH / startAABB.h

          useProjectStore.getState().updateProject((draft) => {
            for (const el of draft.elements) {
              const startPos = drag.elementStartPositions.get(el.id)
              if (!startPos) continue
              // Scale offset from old AABB origin to maintain proportional positions
              el.x = newX + (startPos.x - startAABB.x) * scaleX
              el.y = newY + (startPos.y - startAABB.y) * scaleY
              el.width = Math.max(MIN_SIZE_CM, startPos.w * scaleX)
              el.height = Math.max(MIN_SIZE_CM, startPos.h * scaleY)
              el.updatedAt = new Date().toISOString()
            }
          })
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

          // Adjust based on which handle is being dragged
          if (handle.includes('w')) {
            newX = startAABB.x + dX
            newW = startAABB.w - dX
          }
          if (handle.includes('e')) {
            newW = startAABB.w + dX
          }
          if (handle.includes('n')) {
            newY = startAABB.y + dY
            newH = startAABB.h - dY
          }
          if (handle.includes('s')) {
            newH = startAABB.h + dY
          }

          // Snap to 10cm increments (unless alt disables snap)
          if (!disableSnap) {
            newW = Math.round(newW / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
            newH = Math.round(newH / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
            newX = Math.round(newX / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
            newY = Math.round(newY / SNAP_INCREMENT_RESIZE) * SNAP_INCREMENT_RESIZE
          }

          // Enforce minimum size (recalculate origin for w/n handles)
          if (newW < MIN_SIZE_CM) {
            if (handle.includes('w')) newX = startAABB.x + startAABB.w - MIN_SIZE_CM
            newW = MIN_SIZE_CM
          }
          if (newH < MIN_SIZE_CM) {
            if (handle.includes('n')) newY = startAABB.y + startAABB.h - MIN_SIZE_CM
            newH = MIN_SIZE_CM
          }

          useProjectStore.getState().updateProject((draft) => {
            const el = draft.elements.find((e) => e.id === drag.resizeElementId)
            if (!el) return
            el.x = newX
            el.y = newY
            el.width = newW
            el.height = newH
            el.updatedAt = new Date().toISOString()
          })
        } else if (drag.mode === 'path_point_dragging' && drag.pathPointElementId !== null) {
          useProjectStore.getState().updateProject((draft) => {
            const el = draft.elements.find((e) => e.id === drag.pathPointElementId)
            if (!el || el.type !== 'path') return
            const pathEl = el as PathElement
            const idx = drag.pathPointIndex
            if (idx < 0 || idx >= pathEl.points.length) return
            pathEl.points[idx] = { x: worldX, y: worldY }
            // Recalculate AABB from updated points
            const aabb = recalcPathAABB(pathEl.points)
            pathEl.x = aabb.x
            pathEl.y = aabb.y
            pathEl.width = aabb.width || 1
            pathEl.height = aabb.height || 1
            pathEl.updatedAt = new Date().toISOString()
          })
        } else if (drag.mode === 'rotating' && drag.rotateElementId) {
          const el = project.elements.find((e) => e.id === drag.rotateElementId)
          if (!el) return
          const aabb = getElementAABB(el)
          const cx = aabb.x + aabb.w / 2
          const cy = aabb.y + aabb.h / 2
          const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI)
          let newRotation = angle - drag.rotateStartAngle
          // Normalize to [0, 360)
          newRotation = ((newRotation % 360) + 360) % 360

          useProjectStore.getState().updateProject((draft) => {
            const target = draft.elements.find((e) => e.id === drag.rotateElementId)
            if (!target) return
            target.rotation = newRotation
            target.updatedAt = new Date().toISOString()
          })
        }

        layerRef.current?.batchDraw()
      },
      [eraseAtPoint],
    )

    const handleMouseUp = useCallback(
      (_e: KonvaEventObject<MouseEvent>) => {
        const tool = useToolStore.getState().activeTool

        // Eraser release
        if (tool === 'eraser') {
          eraserActiveRef.current = false
          if (eraserSnapshotRef.current) {
            useHistoryStore.getState().pushHistory(eraserSnapshotRef.current)
            useProjectStore.getState().markDirty()
            eraserSnapshotRef.current = null
          }
          return
        }

        const drag = dragRef.current

        if (drag.mode === 'moving' || drag.mode === 'resizing' || drag.mode === 'rotating' || drag.mode === 'path_point_dragging') {
          if (drag.preOpSnapshot) {
            useHistoryStore.getState().pushHistory(drag.preOpSnapshot)
            useProjectStore.getState().markDirty()
          }
        }

        // Reset drag state
        Object.assign(dragRef.current, createIdleDragState())
        setBoxSelectRect(null)
        layerRef.current?.batchDraw()
      },
      [],
    )

    const handleDblClick = useCallback(
      (e: KonvaEventObject<MouseEvent>) => {
        if (useToolStore.getState().activeTool !== 'select') return

        const { panX, panY, zoom } = useViewportStore.getState()
        const pos = getPointerWorldPos(e, panX, panY, zoom)
        if (!pos) return

        const project = useProjectStore.getState().currentProject
        if (!project) return

        const hits = getElementsAtPoint(project.elements, project.layers, pos.worldX, pos.worldY)
        const topHit = hits[0]
        if (!topHit || !topHit.groupId) return

        const group = project.groups.find((g) => g.id === topHit.groupId)
        if (group) {
          useSelectionStore.getState().setGroupEditing(group.id)
          useSelectionStore.getState().select(topHit.id)
        }
      },
      [],
    )

    // ---------- Render helpers ----------

    const { panX, panY, zoom } = useViewportStore()
    const project = useProjectStore((s) => s.currentProject)
    const handleSize = 8 / zoom
    const rotationHandleRadius = 5 / zoom
    const rotationHandleOffset = 10 / zoom

    // Gather selected elements for rendering bounding boxes
    const selectedElements: CanvasElement[] = []
    if (project && activeTool === 'select') {
      for (const el of project.elements) {
        if (selectedIds.has(el.id)) {
          selectedElements.push(el)
        }
      }
    }

    return (
      <Layer
        ref={layerRef}
        listening={isListening}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
      >
        {/* Transparent rect to catch clicks on empty space */}
        <Rect
          x={-panX / zoom}
          y={-panY / zoom}
          width={width / zoom}
          height={height / zoom}
          fill="transparent"
        />

        {/* Selection bounding boxes and handles */}
        {activeTool === 'select' &&
          selectedElements.map((el) => {
            const aabb = getElementAABB(el)
            const isStructure = el.type === 'structure'
            const isLabel = el.type === 'label'
            const showResizeHandles = isStructure || isLabel
            const showRotationHandle = isStructure

            return (
              <KonvaGroup key={el.id}>
                {/* Dashed bounding box */}
                <Rect
                  x={aabb.x}
                  y={aabb.y}
                  width={aabb.w}
                  height={aabb.h}
                  stroke="#3B82F6"
                  strokeWidth={1.5 / zoom}
                  dash={[6 / zoom, 3 / zoom]}
                  listening={false}
                />

                {/* Resize handles */}
                {showResizeHandles &&
                  getHandlePositions(aabb).map(({ pos, x, y }) => (
                    <Rect
                      key={pos}
                      x={x - handleSize / 2}
                      y={y - handleSize / 2}
                      width={handleSize}
                      height={handleSize}
                      fill="white"
                      stroke="#3B82F6"
                      strokeWidth={1 / zoom}
                      listening={false}
                    />
                  ))}

                {/* Path point handles */}
                {el.type === 'path' &&
                  (el as PathElement).points.map((pt, idx) => (
                    <Circle
                      key={`pt-${idx}`}
                      x={pt.x}
                      y={pt.y}
                      radius={handleSize / 2}
                      fill="white"
                      stroke="#3B82F6"
                      strokeWidth={1 / zoom}
                      listening={false}
                    />
                  ))}

                {/* Rotation handle */}
                {showRotationHandle && (
                  <>
                    {/* Line from top-center to rotation handle */}
                    <Rect
                      x={aabb.x + aabb.w / 2 - 0.5 / zoom}
                      y={aabb.y - rotationHandleOffset}
                      width={1 / zoom}
                      height={rotationHandleOffset}
                      fill="#3B82F6"
                      listening={false}
                    />
                    <Circle
                      x={aabb.x + aabb.w / 2}
                      y={aabb.y - rotationHandleOffset}
                      radius={rotationHandleRadius}
                      fill="white"
                      stroke="#3B82F6"
                      strokeWidth={1 / zoom}
                      listening={false}
                    />
                  </>
                )}
              </KonvaGroup>
            )
          })}

        {/* Combined AABB bounding box + resize handles for multi-selection */}
        {activeTool === 'select' && selectedElements.length > 1 && (() => {
          const combinedAABB = getSelectionAABB(selectedElements)
          return (
            <KonvaGroup>
              <Rect
                x={combinedAABB.x}
                y={combinedAABB.y}
                width={combinedAABB.w}
                height={combinedAABB.h}
                stroke="#3B82F6"
                strokeWidth={2 / zoom}
                dash={[8 / zoom, 4 / zoom]}
                listening={false}
              />
              {getHandlePositions(combinedAABB).map(({ pos, x, y }) => (
                <Rect
                  key={`multi-${pos}`}
                  x={x - handleSize / 2}
                  y={y - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  fill="white"
                  stroke="#3B82F6"
                  strokeWidth={1 / zoom}
                  listening={false}
                />
              ))}
            </KonvaGroup>
          )
        })()}

        {/* Box-select rectangle */}
        {activeTool === 'select' && boxSelectRect && (
          <Rect
            x={Math.min(boxSelectRect.x1, boxSelectRect.x2)}
            y={Math.min(boxSelectRect.y1, boxSelectRect.y2)}
            width={Math.abs(boxSelectRect.x2 - boxSelectRect.x1)}
            height={Math.abs(boxSelectRect.y2 - boxSelectRect.y1)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3B82F6"
            strokeWidth={1 / zoom}
            listening={false}
          />
        )}
      </Layer>
    )
  },
)

// ---------- Geometry helpers ----------

interface HandleInfo {
  pos: HandlePosition
  x: number
  y: number
}

function getHandlePositions(aabb: AABB): HandleInfo[] {
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

function getHandleAtPoint(
  aabb: AABB,
  worldX: number,
  worldY: number,
  zoom: number,
): HandlePosition | null {
  const threshold = 6 / zoom // 6px in screen space
  const handles = getHandlePositions(aabb)
  for (const h of handles) {
    if (Math.abs(worldX - h.x) <= threshold && Math.abs(worldY - h.y) <= threshold) {
      return h.pos
    }
  }
  return null
}

function isOnRotationHandle(
  aabb: AABB,
  worldX: number,
  worldY: number,
  zoom: number,
): boolean {
  const threshold = 6 / zoom
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

function normalizeBoxAABB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): AABB {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}
