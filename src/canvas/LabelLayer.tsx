/**
 * LabelLayer — Konva layer + HTML overlay for text label placement and editing.
 *
 * Phase B of PLAN-B. Implements:
 *   - Rendering label elements as Konva Text nodes
 *   - Label tool (activeTool === 'label'): click to place text label
 *   - Double-click to edit existing label
 *   - HTML textarea overlay for inline text editing
 *   - Inverted snap: snap OFF by default, Alt ENABLES snapping (context 'label')
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useRef, useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { Layer, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { snapPoint } from '../snap/snapSystem'
import type { LabelElement } from '../types/schema'

// ─── Security helpers ───────────────────────────────────────────────────────

function sanitizeFontFamily(value: string): string {
  // Allow only safe font name characters
  return value.replace(/[^a-zA-Z0-9 ,_\-']/g, '') || 'sans-serif'
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

// ─── Label tool store ────────────────────────────────────────────────────────

interface LabelToolState {
  isEditing: boolean
  editingLabelId: string | null
  setEditing: (id: string | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLabelToolStore = create<LabelToolState>((set) => ({
  isEditing: false,
  editingLabelId: null,
  setEditing: (id: string | null) => set({ isEditing: id !== null, editingLabelId: id }),
}))

// ─── PLAN-B interface contracts ─────────────────────────────────────────────

/** AABB hit test for a label element. */
// eslint-disable-next-line react-refresh/only-export-components
export function hitTest(element: LabelElement, worldX: number, worldY: number): boolean {
  return (
    worldX >= element.x &&
    worldX <= element.x + element.width &&
    worldY >= element.y &&
    worldY <= element.y + element.height
  )
}

/** Axis-aligned bounding box of a LabelElement. */
// eslint-disable-next-line react-refresh/only-export-components
export function getAABB(element: LabelElement): { x: number; y: number; w: number; h: number } {
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface LabelLayerProps {
  width: number
  height: number
}

export default function LabelLayer({ width: _width, height: _height }: LabelLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)

  const editingLabelId = useLabelToolStore((s) => s.editingLabelId)
  const setEditing = useLabelToolStore((s) => s.setEditing)

  const isLabelTool = activeTool === 'label'

  /** Get world coordinates from a Konva event, with label-context snapping. */
  const getWorldPos = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } => {
      const stage = e.target.getStage()
      if (!stage) return { x: 0, y: 0 }
      const worldPos = stage.getRelativePointerPosition()
      if (!worldPos) return { x: 0, y: 0 }

      const proj = useProjectStore.getState().currentProject
      if (!proj) return worldPos

      // Read zoom fresh from store to avoid stale closure after zoom changes
      const currentZoom = useViewportStore.getState().zoom
      const altHeld = e.evt.altKey
      // Label context: snap is OFF by default, Alt turns it ON
      const snapped = snapPoint(
        worldPos.x,
        worldPos.y,
        'label',
        proj.elements,
        currentZoom,
        proj.gridConfig.snapIncrementCm ?? 10,
        proj.uiState.snapEnabled,
        altHeld,
      )
      return { x: snapped.x, y: snapped.y }
    },
    [],
  )

  /** Handle click on canvas to create a new label. */
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isLabelTool) return
      if (e.evt.button !== 0) return

      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      // If currently editing, don't create a new label on click
      if (editingLabelId) return

      const world = getWorldPos(e)

      // Check if clicking on an existing label — if so, don't create new one
      const clickedLabel = proj.elements.find(
        (el): el is LabelElement =>
          el.type === 'label' && hitTest(el, world.x, world.y),
      )
      if (clickedLabel) return

      // Capture snapshot BEFORE mutation
      const snapshot = structuredClone(proj)

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      updateProject((draft) => {
        draft.elements.push({
          id,
          type: 'label',
          text: 'Text',
          fontSize: 16,
          fontColor: '#000000',
          fontFamily: sanitizeFontFamily('sans-serif'),
          textAlign: 'left',
          bold: false,
          italic: false,
          x: world.x,
          y: world.y,
          width: 200,
          height: 50,
          rotation: 0,
          zIndex: 0,
          locked: false,
          layerId,
          groupId: null,
          createdAt: now,
          updatedAt: now,
        } satisfies LabelElement)
      })

      pushHistory(snapshot)

      // Enter edit mode immediately for the new label
      setEditing(id)
    },
    [isLabelTool, editingLabelId, getWorldPos, updateProject, pushHistory, setEditing],
  )

  /** Handle double-click to enter edit mode for an existing label. */
  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      const stage = e.target.getStage()
      if (!stage) return
      const worldPos = stage.getRelativePointerPosition()
      if (!worldPos) return

      const clickedLabel = proj.elements.find(
        (el): el is LabelElement =>
          el.type === 'label' && hitTest(el, worldPos.x, worldPos.y),
      )

      if (clickedLabel) {
        setEditing(clickedLabel.id)
      }
    },
    [setEditing],
  )

  if (!project) return null

  const layers = project?.layers ?? []
  const layerMap = new Map(layers.map((l) => [l.id, l]))

  const labelElements = project.elements.filter(
    (el): el is LabelElement => el.type === 'label',
  )

  return (
    <Layer listening={isLabelTool}>
      {/* Transparent hit area for placement */}
      {isLabelTool && (
        <Rect
          x={-50000}
          y={-50000}
          width={100000}
          height={100000}
          fill="rgba(0,0,0,0.001)"
          listening={true}
          onMouseDown={handleMouseDown}
          onDblClick={handleDblClick}
        />
      )}

      {/* Render existing labels */}
      {labelElements.map((el) => {
        // Hide label text while editing (textarea overlay shows instead)
        if (el.id === editingLabelId) return null

        const fontStyle = [
          el.bold ? 'bold' : '',
          el.italic ? 'italic' : '',
        ]
          .filter(Boolean)
          .join(' ') || 'normal'

        const isEffectivelyLocked = el.locked || (layerMap.get(el.layerId)?.locked ?? false)

        return (
          <Text
            key={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            text={el.text}
            fontSize={el.fontSize}
            fontStyle={fontStyle}
            fontFamily={sanitizeFontFamily(el.fontFamily)}
            fill={isValidHexColor(el.fontColor) ? el.fontColor : '#000000'}
            align={el.textAlign}
            wrap="word"
            opacity={isEffectivelyLocked ? 0.5 : 1}
            listening={false}
          />
        )
      })}
    </Layer>
  )
}

// ─── HTML Overlays ──────────────────────────────────────────────────────────

/**
 * HTML textarea overlay for inline label editing.
 * Rendered outside the Konva Stage as a sibling div.
 */
interface LabelHTMLOverlaysProps {
  width: number
  height: number
}

export function LabelHTMLOverlays({ width: _w, height: _h }: LabelHTMLOverlaysProps) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const { panX, panY, zoom } = useViewportStore()

  const editingLabelId = useLabelToolStore((s) => s.editingLabelId)
  const setEditing = useLabelToolStore((s) => s.setEditing)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Find the label being edited
  const editingLabel = project?.elements.find(
    (el): el is LabelElement => el.type === 'label' && el.id === editingLabelId,
  ) ?? null

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingLabel && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      ta.select()
    }
  }, [editingLabel?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save edits and exit edit mode
  const commitEdit = useCallback(() => {
    if (!editingLabelId) return
    const proj = useProjectStore.getState().currentProject
    if (!proj) return

    const ta = textareaRef.current
    if (!ta) {
      console.error('[LabelLayer] commitEdit: textarea ref null, edit lost', { editingLabelId })
      setEditing(null)
      return
    }

    const newText = ta.value

    // Capture snapshot BEFORE mutation
    const snapshot = structuredClone(proj)

    updateProject((draft) => {
      const el = draft.elements.find((e) => e.id === editingLabelId)
      if (el && el.type === 'label') {
        ;(el as LabelElement).text = newText
        el.updatedAt = new Date().toISOString()
      }
    })

    pushHistory(snapshot)
    console.debug('[LabelLayer] label text saved', { editingLabelId, length: newText.length })
    setEditing(null)
  }, [editingLabelId, updateProject, pushHistory, setEditing])

  // Escape to cancel/save, click outside to save
  useEffect(() => {
    if (!editingLabelId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        commitEdit()
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      // If clicking outside the textarea, commit
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        commitEdit()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    // Use a small delay so the initial click that opens edit mode doesn't immediately close it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleMouseDown, true)
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('mousedown', handleMouseDown, true)
      clearTimeout(timer)
    }
  }, [editingLabelId, commitEdit])

  if (!editingLabel) return null

  // Convert world coords to screen coords
  const screenX = editingLabel.x * zoom + panX
  const screenY = editingLabel.y * zoom + panY
  const screenW = editingLabel.width * zoom
  const screenH = editingLabel.height * zoom
  const screenFontSize = editingLabel.fontSize * zoom

  const fontStyle = editingLabel.italic ? 'italic' : 'normal'
  const fontWeight = editingLabel.bold ? 'bold' : 'normal'

  return (
    <textarea
      key={editingLabel.id + '-' + editingLabel.updatedAt}
      ref={textareaRef}
      defaultValue={editingLabel.text}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        fontSize: screenFontSize,
        fontFamily: sanitizeFontFamily(editingLabel.fontFamily),
        fontStyle,
        fontWeight,
        color: isValidHexColor(editingLabel.fontColor) ? editingLabel.fontColor : '#000000',
        textAlign: editingLabel.textAlign,
        border: '2px solid #3b82f6',
        borderRadius: 2,
        outline: 'none',
        background: 'rgba(255,255,255,0.9)',
        resize: 'both',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
        lineHeight: 1.2,
        boxSizing: 'border-box',
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    />
  )
}
