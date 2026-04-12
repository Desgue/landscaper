import { create } from 'zustand';
import type { Project, UUID } from '../types/schema';
import { getDB } from '../db/db';

const MAX_HISTORY = 200;

// ---------------------------------------------------------------------------
// Callback injection — keeps this store free of any project store dependency.
// Call setOnApplySnapshot() at app startup to wire up undo/redo behaviour.
// ---------------------------------------------------------------------------

type ApplySnapshotFn = (snapshot: Project) => void;

let onApplySnapshot: ApplySnapshotFn | null = null;

export function setOnApplySnapshot(fn: ApplySnapshotFn): void {
  onApplySnapshot = fn;
}

// ---------------------------------------------------------------------------

interface HistoryStore {
  past: Project[];
  future: Project[];

  // _getCurrentProject is injected so undo/redo can read the live project
  // without importing useProjectStore.
  _getCurrentProject: (() => Project | null) | null;
  setGetCurrentProject(fn: () => Project | null): void;

  pushHistory(snapshot: Project): void;
  undo(): void;
  redo(): void;
  clearHistory(): void;
  loadHistory(projectId: UUID): Promise<void>;
  persistHistory(projectId: UUID): Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  _getCurrentProject: null,

  setGetCurrentProject(fn: () => Project | null): void {
    set({ _getCurrentProject: fn });
  },

  pushHistory(snapshot: Project): void {
    const { past } = get();
    const newPast = [...past, snapshot];
    if (newPast.length > MAX_HISTORY) {
      newPast.shift(); // Drop oldest
    }
    set({ past: newPast, future: [] });
  },

  undo(): void {
    const { past, future, _getCurrentProject } = get();
    if (past.length === 0) return;

    const currentProject = _getCurrentProject?.() ?? null;
    if (!currentProject) return;

    const snapshot = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [currentProject, ...future];

    set({ past: newPast, future: newFuture });
    onApplySnapshot?.(snapshot);
  },

  redo(): void {
    const { past, future, _getCurrentProject } = get();
    if (future.length === 0) return;

    const currentProject = _getCurrentProject?.() ?? null;
    if (!currentProject) return;

    const snapshot = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, currentProject];

    set({ past: newPast, future: newFuture });
    onApplySnapshot?.(snapshot);
  },

  clearHistory(): void {
    set({ past: [], future: [] });
  },

  async loadHistory(projectId: UUID): Promise<void> {
    try {
      const db = await getDB();
      const record = await db.get('undoHistory', projectId);
      if (record && Array.isArray(record.actions)) {
        // Shallow validation: only accept entries that look like Project objects
        const valid = (record.actions as unknown[]).filter(
          (a): a is Project => typeof a === 'object' && a !== null && typeof (a as Record<string, unknown>).id === 'string',
        );
        set({ past: valid, future: [] });
      } else {
        set({ past: [], future: [] });
      }
    } catch (err) {
      console.error('[historyStore] loadHistory failed: projectId=%s', projectId, err);
      set({ past: [], future: [] });
    }
  },

  async persistHistory(projectId: UUID): Promise<void> {
    try {
      const { past } = get();
      const db = await getDB();
      await db.put('undoHistory', { projectId, actions: past });
    } catch (err) {
      console.error('[historyStore] persistHistory failed: projectId=%s', projectId, err);
    }
  },
}));
