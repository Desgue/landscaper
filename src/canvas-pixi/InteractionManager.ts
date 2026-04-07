/**
 * InteractionManager — Central event handler for the PixiJS interaction container.
 *
 * Listens to FederatedPointerEvent on the interaction container and dispatches
 * to the active tool handler. Translates PixiJS events to world coordinates
 * using viewport.ts toWorld().
 *
 * Owns the SelectionStateMachine and delegates to tool-specific handlers
 * (terrain paint, placement, path drawing, boundary).
 */

import type { Container } from 'pixi.js'
import type { FederatedPointerEvent } from 'pixi.js'
import { toWorld } from '../canvas/viewport'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { useProjectStore } from '../store/useProjectStore'
import { getElementsAtPoint } from '../canvas/hitTestAll'
import { useLabelToolStore } from '../canvas/toolStores'
import { connectStore } from './connectStore'
import type { RenderScheduler } from './RenderScheduler'
import type { RendererHandle } from './BaseRenderer'
import {
  createSelectionStateMachine,
  type SelectionPointerEvent,
} from './SelectionStateMachine'
import type { createSelectionOverlay } from './SelectionOverlay'
import type { TerrainPaintHandle } from './TerrainPaintHandler'
import type { StructurePlacementHandle } from './PlacementHandlers'
import type { PlantPlacementHandle } from './PlacementHandlers'
import type { LabelPlacementHandle } from './PlacementHandlers'
import type { MeasurementHandle } from './PlacementHandlers'
import type { PathDrawingHandle } from './PathDrawingHandler'
import type { BoundaryHandle } from './BoundaryHandler'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolHandlers {
  terrainPaint: TerrainPaintHandle
  structurePlacement: StructurePlacementHandle
  plantPlacement: PlantPlacementHandle
  labelPlacement: LabelPlacementHandle
  measurement: MeasurementHandle
  pathDrawing: PathDrawingHandle
  boundary: BoundaryHandle
}

export interface InteractionManagerHandle extends RendererHandle {
  /** Call from CanvasHost when Tab key is pressed. */
  handleTabCycle(): void
  /** Call from CanvasHost native dblclick event. */
  handleDblClick(worldX: number, worldY: number): void
}

// ---------------------------------------------------------------------------
// Coordinate conversion
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInteractionManager(
  interactionContainer: Container,
  _scheduler: RenderScheduler,
  selectionOverlay: ReturnType<typeof createSelectionOverlay>,
  toolHandlers: ToolHandlers,
  getCanvasRect: () => DOMRect,
  isPanActive: () => boolean,
  canvasElement?: HTMLElement,
): InteractionManagerHandle {
  const ssm = createSelectionStateMachine()

  // Cached canvas rect — avoids forced layout per pointermove.
  // Instance-scoped (not module-level) for React Strict Mode safety.
  let cachedRect: DOMRect = getCanvasRect()
  let rectDirty = false

  // Invalidate cached rect on resize
  const resizeObserver = new ResizeObserver(() => { rectDirty = true })
  if (canvasElement) {
    resizeObserver.observe(canvasElement)
  }

  function eventToWorld(e: FederatedPointerEvent): { worldX: number; worldY: number } {
    if (rectDirty) {
      cachedRect = getCanvasRect()
      rectDirty = false
    }
    const native = e.nativeEvent as PointerEvent
    const screenX = native.clientX - cachedRect.left
    const screenY = native.clientY - cachedRect.top
    const { panX, panY, zoom } = useViewportStore.getState()
    const w = toWorld(screenX, screenY, panX, panY, zoom)
    return { worldX: w.x, worldY: w.y }
  }

  // ---- Tool dispatch helpers ----

  function isSelectionTool(tool: string): boolean {
    return tool === 'select' || tool === 'eraser'
  }

  function makeSSMEvent(
    e: FederatedPointerEvent,
    type: SelectionPointerEvent['type'],
  ): SelectionPointerEvent {
    const native = e.nativeEvent as PointerEvent
    const { worldX, worldY } = eventToWorld(e)
    return {
      worldX,
      worldY,
      button: native.button ?? 0,
      shiftKey: native.shiftKey,
      altKey: native.altKey,
      type,
    }
  }

  // ---- Check if boundary placement mode is active ----

  function isBoundaryPlacing(): boolean {
    return toolHandlers.boundary.getPlacementState().isPlacing
  }

  // ---- Event handlers ----

  const onPointerDown = (e: FederatedPointerEvent) => {
    const native = e.nativeEvent as PointerEvent
    if (native.button !== 0) return // Only left-click for tool interaction

    const tool = useToolStore.getState().activeTool
    const { worldX, worldY } = eventToWorld(e)

    // Boundary placement intercepts select tool when placing
    if (tool === 'select' && isBoundaryPlacing()) {
      toolHandlers.boundary.onPlacementClick(worldX, worldY, native.altKey)
      return
    }

    if (isSelectionTool(tool)) {
      const ssmEvent = makeSSMEvent(e, 'down')
      const visual = ssm.handlePointer(ssmEvent)
      selectionOverlay.updateVisualState(visual)
      return
    }

    // Tool-specific handlers
    switch (tool) {
      case 'terrain':
        toolHandlers.terrainPaint.onPointerDown(worldX, worldY, native.altKey)
        break
      case 'structure':
      case 'arc':
        toolHandlers.structurePlacement.onPointerDown(worldX, worldY, native.altKey, tool === 'arc')
        break
      case 'plant':
        toolHandlers.plantPlacement.onPointerDown(worldX, worldY, native.altKey)
        break
      case 'label':
        toolHandlers.labelPlacement.onPointerDown(worldX, worldY)
        break
      case 'measurement':
        toolHandlers.measurement.onPointerDown(worldX, worldY, native.altKey)
        break
      case 'path':
        toolHandlers.pathDrawing.onPointerDown(worldX, worldY, native.altKey)
        break
    }
  }

  const onPointerMove = (e: FederatedPointerEvent) => {
    // Skip tool dispatch during pan operations
    if (isPanActive()) return

    const tool = useToolStore.getState().activeTool
    const native = e.nativeEvent as PointerEvent
    const { worldX, worldY } = eventToWorld(e)

    // Boundary placement move
    if (tool === 'select' && isBoundaryPlacing()) {
      toolHandlers.boundary.onPlacementMove(worldX, worldY, native.altKey)
      return
    }

    if (isSelectionTool(tool)) {
      const ssmEvent = makeSSMEvent(e, 'move')
      const visual = ssm.handlePointer(ssmEvent)
      selectionOverlay.updateVisualState(visual)

      // Hover highlight on pointermove when select tool is active
      if (tool === 'select') {
        const project = useProjectStore.getState().currentProject
        if (project) {
          const hits = getElementsAtPoint(project.elements, project.layers, worldX, worldY)
          const topHitId = hits.length > 0 ? hits[0].id : null
          selectionOverlay.setHoveredId(topHitId)
        }
      }
      return
    }

    switch (tool) {
      case 'terrain':
        toolHandlers.terrainPaint.onPointerMove(worldX, worldY, native.altKey)
        break
      case 'structure':
      case 'arc':
        toolHandlers.structurePlacement.onPointerMove(worldX, worldY, native.altKey, tool === 'arc')
        break
      case 'path':
        toolHandlers.pathDrawing.onPointerMove(worldX, worldY, native.altKey)
        break
      case 'measurement':
        toolHandlers.measurement.onPointerMove(worldX, worldY, native.altKey)
        break
    }
  }

  const onPointerUp = (e: FederatedPointerEvent) => {
    const tool = useToolStore.getState().activeTool

    if (isSelectionTool(tool)) {
      const ssmEvent = makeSSMEvent(e, 'up')
      const visual = ssm.handlePointer(ssmEvent)
      selectionOverlay.updateVisualState(visual)
      return
    }

    switch (tool) {
      case 'terrain':
        toolHandlers.terrainPaint.onPointerUp()
        break
    }
  }

  // Wire events
  interactionContainer.on('pointerdown', onPointerDown)
  interactionContainer.on('pointermove', onPointerMove)
  interactionContainer.on('pointerup', onPointerUp)
  interactionContainer.on('pointerupoutside', onPointerUp)

  // Sync inspector with selection
  const unsubInspector = connectStore(
    useSelectionStore,
    (s) => s.primaryId,
    (primaryId) => useInspectorStore.getState().setInspectedElementId(primaryId),
  )

  // Reset SSM when tool changes
  const unsubTool = connectStore(
    useToolStore,
    (s) => s.activeTool,
    (newTool, oldTool) => {
      if (newTool !== oldTool) {
        ssm.reset()
        selectionOverlay.updateVisualState(ssm.getVisualState())
      }
    },
  )

  return {
    handleTabCycle(): void {
      const project = useProjectStore.getState().currentProject
      if (!project) return
      const { lastClickWorldPos, tabCycleIndex } = useSelectionStore.getState()
      if (!lastClickWorldPos) return

      const hits = getElementsAtPoint(
        project.elements, project.layers,
        lastClickWorldPos.x, lastClickWorldPos.y,
      )
      if (hits.length === 0) return

      const newIndex = (tabCycleIndex + 1) % hits.length
      useSelectionStore.getState().select(hits[newIndex].id)
      useSelectionStore.getState().setTabCycleIndex(newIndex)
    },

    handleDblClick(worldX: number, worldY: number): void {
      const tool = useToolStore.getState().activeTool

      if (tool === 'select') {
        // Enter group editing mode on double-click
        const project = useProjectStore.getState().currentProject
        if (!project) return
        const hits = getElementsAtPoint(project.elements, project.layers, worldX, worldY)
        const topHit = hits[0]
        if (!topHit || !topHit.groupId) return
        const group = project.groups.find((g) => g.id === topHit.groupId)
        if (group) {
          useSelectionStore.getState().setGroupEditing(group.id)
          useSelectionStore.getState().select(topHit.id)
        }
      } else if (tool === 'label') {
        // Double-click on existing label to edit
        const project = useProjectStore.getState().currentProject
        if (!project) return
        const clickedLabel = project.elements.find(
          (el) =>
            el.type === 'label' &&
            worldX >= el.x && worldX <= el.x + el.width &&
            worldY >= el.y && worldY <= el.y + el.height,
        )
        if (clickedLabel) {
          useLabelToolStore.getState().setEditing(clickedLabel.id)
        }
      }
    },

    update(): void {
      selectionOverlay.update()
    },

    destroy(): void {
      interactionContainer.off('pointerdown', onPointerDown)
      interactionContainer.off('pointermove', onPointerMove)
      interactionContainer.off('pointerup', onPointerUp)
      interactionContainer.off('pointerupoutside', onPointerUp)
      unsubInspector()
      unsubTool()
      ssm.destroy()
      resizeObserver.disconnect()
    },
  }
}
