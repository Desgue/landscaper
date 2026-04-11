/**
 * Unit tests for SelectionStateMachine.
 *
 * Tests the framework-agnostic state machine for selection/manipulation
 * without requiring a canvas or PixiJS.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSelectionStateMachine,
  getHandlePositions,
  getHandleAtPoint,
  isOnRotationHandle,
  type SelectionPointerEvent,
} from '../SelectionStateMachine'
import { useProjectStore } from '../../store/useProjectStore'
import { useSelectionStore } from '../../store/useSelectionStore'
import { useToolStore } from '../../store/useToolStore'
import { useViewportStore } from '../../store/useViewportStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import type { Project, StructureElement } from '../../types/schema'
import type { CanvasContext } from '../CanvasContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(elements: Project['elements'] = []): Project {
  return {
    id: 'test-project',
    name: 'Test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    location: { lat: null, lng: null, label: null },
    gridConfig: { cellSizeCm: 100, snapIncrementCm: 10, originX: 0, originY: 0 },
    viewport: { panX: 0, panY: 0, zoom: 1 },
    uiState: { gridVisible: true, snapEnabled: false },
    yardBoundary: null,
    currency: 'USD',
    layers: [{ id: 'layer-1', name: 'Default', visible: true, locked: false, order: 0 }],
    groups: [],
    elements,
    journalEntries: [],
  }
}

function makeStructure(overrides: Partial<StructureElement> = {}): StructureElement {
  return {
    id: crypto.randomUUID(),
    type: 'structure',
    structureTypeId: 'fence',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    layerId: 'layer-1',
    groupId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    shape: 'straight',
    arcSagitta: null,
    notes: null,
    ...overrides,
  }
}

function down(worldX: number, worldY: number, opts: Partial<SelectionPointerEvent> = {}): SelectionPointerEvent {
  return { worldX, worldY, button: 0, shiftKey: false, altKey: false, type: 'down', ...opts }
}

function move(worldX: number, worldY: number, opts: Partial<SelectionPointerEvent> = {}): SelectionPointerEvent {
  return { worldX, worldY, button: 0, shiftKey: false, altKey: false, type: 'move', ...opts }
}

function up(worldX: number, worldY: number, opts: Partial<SelectionPointerEvent> = {}): SelectionPointerEvent {
  return { worldX, worldY, button: 0, shiftKey: false, altKey: false, type: 'up', ...opts }
}

// ---------------------------------------------------------------------------
// Mock CanvasContext factory
// Creates a CanvasContext that delegates to the actual Zustand stores,
// mirroring the production createCanvasContext() implementation in CanvasHost.
// ---------------------------------------------------------------------------

function makeMockCanvasContext(): CanvasContext {
  return {
    getProject() {
      return useProjectStore.getState().currentProject
    },
    getRegistries() {
      return useProjectStore.getState().registries
    },
    applyLiveUpdate(actionName, updater) {
      useProjectStore.getState().updateProject(actionName, updater)
    },
    pushDragHistory(snapshot) {
      useHistoryStore.getState().pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    getZoom() {
      return useViewportStore.getState().zoom
    },
    getPan() {
      const { panX, panY } = useViewportStore.getState()
      return { panX, panY }
    },
    getToolState() {
      const { activeTool, previousTool } = useToolStore.getState()
      return {
        activeTool,
        previousTool,
        selectedStructureTypeId: null,
        selectedPlantTypeId: null,
        selectedPathTypeId: null,
        selectedTerrainTypeId: null,
        brushSize: 1 as const,
        editingLabelId: null,
      }
    },
    setLabelEditing(_id) {},
    getSelectionState() {
      const { selectedIds, primaryId, groupEditingId, lastClickWorldPos, tabCycleIndex } =
        useSelectionStore.getState()
      return { selectedIds: new Set(selectedIds), primaryId, groupEditingId, lastClickWorldPos, tabCycleIndex }
    },
    select(id) {
      useSelectionStore.getState().select(id)
    },
    selectMultiple(ids) {
      useSelectionStore.getState().selectMultiple(ids)
    },
    toggleSelect(id) {
      useSelectionStore.getState().toggleSelect(id)
    },
    deselectAll() {
      useSelectionStore.getState().deselectAll()
    },
    setGroupEditing(groupId) {
      useSelectionStore.getState().setGroupEditing(groupId)
    },
    setLastClickWorldPos(pos) {
      useSelectionStore.getState().setLastClickWorldPos(pos)
    },
    setTabCycleIndex(index) {
      useSelectionStore.getState().setTabCycleIndex(index)
    },
    setInspectedElement(_id) {},
    showPlacementFeedback(_msg) {},
    setBoundaryPlacementState(_state) {},
    setBoundaryEditingEdge(_edgeIndex) {},
    getMeasurementState() {
      return { phase: 'idle' as const, startPoint: null, endPoint: null, livePoint: null }
    },
    setMeasurementState(_update) {},
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset all stores to clean state
  useSelectionStore.getState().deselectAll()
  useSelectionStore.getState().setGroupEditing(null)
  useToolStore.getState().setTool('select')
  useViewportStore.getState().setViewport({ panX: 0, panY: 0, zoom: 1 })
  useHistoryStore.getState().clearHistory()
})

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

describe('getHandlePositions', () => {
  it('returns 8 handles for an AABB', () => {
    const handles = getHandlePositions({ x: 100, y: 100, w: 200, h: 100 })
    expect(handles).toHaveLength(8)
    expect(handles.map((h) => h.pos)).toEqual(['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'])
  })

  it('computes correct positions', () => {
    const handles = getHandlePositions({ x: 0, y: 0, w: 100, h: 50 })
    const byPos = Object.fromEntries(handles.map((h) => [h.pos, { x: h.x, y: h.y }]))
    expect(byPos.nw).toEqual({ x: 0, y: 0 })
    expect(byPos.ne).toEqual({ x: 100, y: 0 })
    expect(byPos.se).toEqual({ x: 100, y: 50 })
    expect(byPos.sw).toEqual({ x: 0, y: 50 })
    expect(byPos.n).toEqual({ x: 50, y: 0 })
    expect(byPos.s).toEqual({ x: 50, y: 50 })
    expect(byPos.w).toEqual({ x: 0, y: 25 })
    expect(byPos.e).toEqual({ x: 100, y: 25 })
  })
})

describe('getHandleAtPoint', () => {
  it('returns handle when within threshold', () => {
    const result = getHandleAtPoint({ x: 100, y: 100, w: 200, h: 100 }, 100, 100, 1)
    expect(result).toBe('nw')
  })

  it('returns null when outside threshold', () => {
    const result = getHandleAtPoint({ x: 100, y: 100, w: 200, h: 100 }, 150, 150, 1)
    expect(result).toBeNull()
  })

  it('threshold scales with zoom', () => {
    // At zoom=2, threshold = 6/2 = 3 world units
    const result = getHandleAtPoint({ x: 100, y: 100, w: 200, h: 100 }, 103, 100, 2)
    expect(result).toBe('nw')
    // 4 units away should miss at zoom=2
    const miss = getHandleAtPoint({ x: 100, y: 100, w: 200, h: 100 }, 104, 100, 2)
    expect(miss).toBeNull()
  })
})

describe('isOnRotationHandle', () => {
  it('detects rotation handle above top-center', () => {
    const aabb = { x: 100, y: 100, w: 200, h: 100 }
    // Handle is at (200, 90) at zoom=1 (10/1=10 offset)
    expect(isOnRotationHandle(aabb, 200, 90, 1)).toBe(true)
  })

  it('misses when not near handle', () => {
    const aabb = { x: 100, y: 100, w: 200, h: 100 }
    expect(isOnRotationHandle(aabb, 200, 100, 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// State machine: click-to-select
// ---------------------------------------------------------------------------

describe('click-to-select', () => {
  it('selects an element on click', () => {
    const struct = makeStructure({ id: 'struct-1' })
    const project = makeProject([struct])
    useProjectStore.getState().loadProject(project, { terrain: [], plants: [], structures: [], paths: [] })

    const ssm = createSelectionStateMachine(makeMockCanvasContext())
    // Click on the structure (center at 200, 150)
    ssm.handlePointer(down(200, 150))
    ssm.handlePointer(up(200, 150))

    const { selectedIds } = useSelectionStore.getState()
    expect(selectedIds.has('struct-1')).toBe(true)

    ssm.destroy()
  })

  it('deselects on empty space click', () => {
    const struct = makeStructure({ id: 'struct-1' })
    const project = makeProject([struct])
    useProjectStore.getState().loadProject(project, { terrain: [], plants: [], structures: [], paths: [] })

    const ssm = createSelectionStateMachine(makeMockCanvasContext())

    // First select the structure
    ssm.handlePointer(down(200, 150))
    ssm.handlePointer(up(200, 150))
    expect(useSelectionStore.getState().selectedIds.has('struct-1')).toBe(true)

    // Click on empty space
    ssm.handlePointer(down(500, 500))
    ssm.handlePointer(up(500, 500))
    expect(useSelectionStore.getState().selectedIds.size).toBe(0)

    ssm.destroy()
  })
})

// ---------------------------------------------------------------------------
// State machine: box-select
// ---------------------------------------------------------------------------

describe('box-select', () => {
  it('returns box_selecting mode during drag on empty space', () => {
    const project = makeProject([])
    useProjectStore.getState().loadProject(project, { terrain: [], plants: [], structures: [], paths: [] })

    const ssm = createSelectionStateMachine(makeMockCanvasContext())
    const v1 = ssm.handlePointer(down(0, 0))
    expect(v1.mode).toBe('box_selecting')

    const v2 = ssm.handlePointer(move(100, 100))
    expect(v2.mode).toBe('box_selecting')
    expect(v2.boxSelectRect).toBeDefined()
    expect(v2.boxSelectRect!.x1).toBe(0)
    expect(v2.boxSelectRect!.y1).toBe(0)
    expect(v2.boxSelectRect!.x2).toBe(100)
    expect(v2.boxSelectRect!.y2).toBe(100)

    const v3 = ssm.handlePointer(up(100, 100))
    expect(v3.mode).toBe('idle')
    expect(v3.boxSelectRect).toBeNull()

    ssm.destroy()
  })
})

// ---------------------------------------------------------------------------
// State machine: move
// ---------------------------------------------------------------------------

describe('move elements', () => {
  it('moves a selected element and pushes history on mouseup', () => {
    const struct = makeStructure({ id: 'struct-1', x: 100, y: 100 })
    const project = makeProject([struct])
    useProjectStore.getState().loadProject(project, { terrain: [], plants: [], structures: [], paths: [] })

    const ssm = createSelectionStateMachine(makeMockCanvasContext())

    // Click to select + start moving
    ssm.handlePointer(down(200, 150))
    // Move by (50, 50)
    ssm.handlePointer(move(250, 200))
    // Release
    ssm.handlePointer(up(250, 200))

    // Element should have moved
    const el = useProjectStore.getState().currentProject?.elements[0]
    expect(el?.x).toBe(150) // 100 + (250 - 200)
    expect(el?.y).toBe(150) // 100 + (200 - 150)

    // History should have a snapshot
    expect(useHistoryStore.getState().past.length).toBe(1)

    ssm.destroy()
  })
})

// ---------------------------------------------------------------------------
// State machine: eraser
// ---------------------------------------------------------------------------

describe('eraser tool', () => {
  it('erases the top element at click point', () => {
    const struct = makeStructure({ id: 'struct-1' })
    const project = makeProject([struct])
    useProjectStore.getState().loadProject(project, { terrain: [], plants: [], structures: [], paths: [] })
    useToolStore.getState().setTool('eraser')

    const ssm = createSelectionStateMachine(makeMockCanvasContext())
    ssm.handlePointer(down(200, 150))
    ssm.handlePointer(up(200, 150))

    // Element should be removed
    expect(useProjectStore.getState().currentProject?.elements.length).toBe(0)
    // History should have been pushed
    expect(useHistoryStore.getState().past.length).toBe(1)

    ssm.destroy()
  })
})

// ---------------------------------------------------------------------------
// State machine: reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('resets to idle mode', () => {
    const ssm = createSelectionStateMachine(makeMockCanvasContext())
    expect(ssm.getMode()).toBe('idle')
    ssm.reset()
    expect(ssm.getMode()).toBe('idle')
    ssm.destroy()
  })
})
