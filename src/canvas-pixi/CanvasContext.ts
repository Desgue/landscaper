/**
 * CanvasContext — Abstraction interface over the Zustand stores used by canvas handlers.
 *
 * Phase 1 of the CanvasContext migration: defines the interface and wires it in CanvasHost.
 * Handlers (SelectionStateMachine, PlacementHandlers, BoundaryHandler, etc.) will be
 * migrated to consume this interface in Phases 2-4, replacing direct store imports.
 *
 * All method signatures are derived from actual store call sites in handler files —
 * no invented types; imports come exclusively from existing codebase types.
 */

import type { Project, Registries, ToolId } from '../types/schema'
import type { BoundaryPlacementState } from './BoundaryHandler'

// ---------------------------------------------------------------------------
// Supporting types (read-only snapshots passed to handlers)
// ---------------------------------------------------------------------------

/**
 * Read-only snapshot of the selection store exposed to handlers.
 * Mirrors the shape of SelectionStore state without the mutation methods.
 */
export interface SelectionState {
  readonly selectedIds: ReadonlySet<string>
  readonly primaryId: string | null
  readonly groupEditingId: string | null
  readonly lastClickWorldPos: { readonly x: number; readonly y: number } | null
  readonly tabCycleIndex: number
}

/**
 * Read-only snapshot of the tool store state exposed to handlers.
 */
export interface ToolState {
  readonly activeTool: ToolId
  readonly previousTool: ToolId | null
}

/**
 * Read-only snapshot of the measurement store state.
 * Mirrors MeasurementStore from canvas/toolStores.ts.
 */
export type MeasurePhase = 'idle' | 'first_placed' | 'completed'

export interface MeasurementState {
  readonly phase: MeasurePhase
  readonly startPoint: { readonly x: number; readonly y: number } | null
  readonly endPoint: { readonly x: number; readonly y: number } | null
  readonly livePoint: { readonly x: number; readonly y: number } | null
}

/**
 * Partial measurement state update — mirrors useMeasurementStore.setState signature.
 */
export type MeasurementStateUpdate = Partial<{
  phase: MeasurePhase
  startPoint: { x: number; y: number } | null
  endPoint: { x: number; y: number } | null
  livePoint: { x: number; y: number } | null
}>

// ---------------------------------------------------------------------------
// CanvasContext interface
// ---------------------------------------------------------------------------

/**
 * Context object injected into canvas handlers, providing access to all
 * shared application state without hard-coding Zustand store imports in each handler.
 *
 * Grouped by concern:
 *   - Project reads
 *   - Project writes
 *   - Viewport
 *   - Tool state
 *   - Selection
 *   - Inspector
 *   - Placement feedback
 *   - Boundary UI
 *   - Measurement UI
 */
export interface CanvasContext {
  // ---- Project reads -------------------------------------------------------

  /** Returns the current project, or null if none is loaded. */
  getProject(): Project | null

  /** Returns the current registries (terrain, plants, structures, paths). */
  getRegistries(): Registries

  // ---- Project writes ------------------------------------------------------

  /**
   * Live (non-history) project mutation — maps to useProjectStore.updateProject.
   * Used during drag moves where intermediate states must NOT enter the undo stack.
   */
  applyLiveUpdate(actionName: string, updater: (draft: Project) => void): void

  /**
   * Push a previously captured snapshot onto the history stack.
   * Call this at drag-end (onPointerUp / onVertexDragEnd) using a snapshot
   * taken at drag-start — maps to useHistoryStore.pushHistory + markDirty.
   */
  pushDragHistory(snapshot: Project): void

  // ---- Viewport ------------------------------------------------------------

  /** Returns the current zoom level. */
  getZoom(): number

  // ---- Tool state ----------------------------------------------------------

  /** Returns a read-only snapshot of the current tool state. */
  getToolState(): ToolState

  /**
   * Enter label editing mode for a given label element id.
   * Maps to useLabelToolStore.setEditing(id).
   */
  setLabelEditing(id: string | null): void

  // ---- Selection -----------------------------------------------------------

  /** Returns a read-only snapshot of the current selection state. */
  getSelectionState(): SelectionState

  /** Select a single element by id. */
  select(id: string): void

  /** Replace the current selection with the given ids. */
  selectMultiple(ids: string[]): void

  /** Toggle membership of a single id in the current selection. */
  toggleSelect(id: string): void

  /** Clear the entire selection. */
  deselectAll(): void

  /** Enter / exit group-editing mode for a group by id. Pass null to exit. */
  setGroupEditing(groupId: string | null): void

  /** Record the world position of the last click (used by Tab cycling). */
  setLastClickWorldPos(pos: { x: number; y: number } | null): void

  /** Update the Tab-cycle index used when multiple elements overlap. */
  setTabCycleIndex(index: number): void

  // ---- Inspector -----------------------------------------------------------

  /**
   * Set the inspected element shown in the right-hand inspector panel.
   * Maps to useInspectorStore.setInspectedElementId(id).
   */
  setInspectedElement(id: string | null): void

  // ---- Placement feedback --------------------------------------------------

  /**
   * Display a transient placement-rejection message (e.g. "Too close to another plant").
   * Maps to usePlacementFeedbackStore.showFeedback(msg).
   */
  showPlacementFeedback(msg: string): void

  // ---- Boundary UI ---------------------------------------------------------

  /**
   * Sync the boundary placement state into the UI store so HTML overlays
   * (placement instructions, Done button) can react.
   * Maps to useBoundaryUIStore.setPlacementState(s).
   */
  setBoundaryPlacementState(state: BoundaryPlacementState): void

  /**
   * Set or clear the edge index being edited in the boundary edge-length input.
   * Maps to useBoundaryUIStore.setEditingEdgeIndex(i).
   */
  setBoundaryEditingEdge(edgeIndex: number | null): void

  // ---- Measurement UI ------------------------------------------------------

  /** Returns a read-only snapshot of the current measurement tool state. */
  getMeasurementState(): MeasurementState

  /**
   * Partially update the measurement tool state.
   * Maps to useMeasurementStore.setState(update).
   */
  setMeasurementState(update: MeasurementStateUpdate): void
}
