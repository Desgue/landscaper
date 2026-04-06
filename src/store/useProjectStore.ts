import { create } from 'zustand';
import type { Project, Registries } from '../types/schema';
import { saveProject } from '../db/projectsDb';
import { BUILTIN_REGISTRIES } from '../data/builtinRegistries';

interface ProjectStore {
  currentProject: Project | null;
  registries: Registries;
  isDirty: boolean;
  _saveTimer: ReturnType<typeof setTimeout> | null;

  loadProject(project: Project, registries: Registries): void;
  updateProject(updater: (draft: Project) => void): void;
  markDirty(): void;
  closeProject(): void;
  setRegistries(r: Registries): void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  registries: BUILTIN_REGISTRIES,
  isDirty: false,
  _saveTimer: null,

  loadProject(project: Project, registries: Registries): void {
    const { _saveTimer } = get();
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
    }
    set({ currentProject: project, registries, isDirty: false, _saveTimer: null });
  },

  updateProject(updater: (draft: Project) => void): void {
    const { currentProject } = get();
    if (!currentProject) return;
    const cloned = structuredClone(currentProject);
    updater(cloned);
    cloned.updatedAt = new Date().toISOString();
    set({ currentProject: cloned });
    get().markDirty();
  },

  markDirty(): void {
    const { _saveTimer } = get();
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
    }
    set({ isDirty: true });
    const timer = setTimeout(() => {
      const { currentProject } = get();
      if (currentProject) {
        saveProject(currentProject).then(() => {
          set({ isDirty: false });
        }).catch((err) => {
          console.error('[projectStore] auto-save failed: id=%s', currentProject.id, err);
        });
      }
    }, 2000);
    set({ _saveTimer: timer });
  },

  closeProject(): void {
    const { _saveTimer } = get();
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
    }
    set({ currentProject: null, isDirty: false, _saveTimer: null });
  },

  setRegistries(r: Registries): void {
    set({ registries: r });
  },
}));
