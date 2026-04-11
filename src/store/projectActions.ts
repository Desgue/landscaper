/**
 * projectActions — Shared action helpers for project mutations.
 *
 * Two distinct mutation patterns exist in this codebase:
 *
 * 1. **Atomic commit** (use `commitProjectUpdate`): snapshot, mutate, and push
 *    history all happen in the same call frame. Use this for one-shot operations
 *    like placing an element, deleting, or applying an edge length.
 *
 * 2. **Drag-end commit** (do NOT use `commitProjectUpdate`): a snapshot is
 *    captured at drag-start (`onPointerDown` / `onVertexDragStart`), intermediate
 *    `updateProject` calls happen on every move event, and history is pushed only
 *    when the drag ends (`onPointerUp` / `onVertexDragEnd`). This pattern is
 *    intentional — pushing history on every move event would flood the undo stack.
 *    See `TerrainPaintHandler.ts`, `BoundaryHandler.ts` drag handlers, and
 *    `SelectionStateMachine.ts` handleUp for examples.
 */

import type { Project } from '../types/schema'
import { useProjectStore } from './useProjectStore'
import { useHistoryStore } from './useHistoryStore'

/**
 * Atomically snapshot, mutate, push history, and mark dirty in a single call.
 *
 * @param _actionName - Human-readable label for this mutation.
 *   // TODO(logging): _actionName feeds into structured logging — see audit Section 3
 * @param updater - Receives a mutable draft of the current project. Return void.
 */
export function commitProjectUpdate(
  _actionName: string,
  updater: (draft: Project) => void,
): void {
  const store = useProjectStore.getState()
  const proj = store.currentProject
  if (!proj) return
  const snapshot = structuredClone(proj)
  store.updateProject(_actionName, updater)
  useHistoryStore.getState().pushHistory(snapshot)
  // updateProject already calls markDirty internally; this second call restarts
  // the debounce timer, which is harmless. Keeping it explicit here so the full
  // 4-step contract (snapshot → mutate → pushHistory → markDirty) is visible.
  store.markDirty()
}
