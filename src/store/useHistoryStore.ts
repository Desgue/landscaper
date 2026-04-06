import { create } from 'zustand';
import type { Project, UUID } from '../types/schema';
import { getDB } from '../db/db';
import { useProjectStore } from './useProjectStore';

const MAX_HISTORY = 200;

interface HistoryStore {
  past: Project[];
  future: Project[];

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

  pushHistory(snapshot: Project): void {
    const { past } = get();
    const newPast = [...past, snapshot];
    if (newPast.length > MAX_HISTORY) {
      newPast.shift(); // Drop oldest
    }
    set({ past: newPast, future: [] });
  },

  undo(): void {
    const { past, future } = get();
    if (past.length === 0) return;

    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    const snapshot = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [currentProject, ...future];

    set({ past: newPast, future: newFuture });
    const store = useProjectStore.getState();
    store.loadProject(snapshot, store.registries);
    store.markDirty();
  },

  redo(): void {
    const { past, future } = get();
    if (future.length === 0) return;

    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    const snapshot = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, currentProject];

    set({ past: newPast, future: newFuture });
    const store = useProjectStore.getState();
    store.loadProject(snapshot, store.registries);
    store.markDirty();
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
    } catch {
      set({ past: [], future: [] });
    }
  },

  async persistHistory(projectId: UUID): Promise<void> {
    try {
      const { past } = get();
      const db = await getDB();
      await db.put('undoHistory', { projectId, actions: past });
    } catch {
      // Silently ignore persistence errors
    }
  },
}));
