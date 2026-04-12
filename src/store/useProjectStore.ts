import { create } from 'zustand';
import type { Project, Registries } from '../types/schema';
import { saveProject } from '../db/projectsDb';
import { BUILTIN_REGISTRIES } from '../data/builtinRegistries';
import { createLogger } from '../utils/logger';

const log = createLogger('ProjectStore');

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

interface ProjectStore {
  currentProject: Project | null;
  registries: Registries;
  isDirty: boolean;

  loadProject(project: Project, registries: Registries): void;
  updateProject(actionName: string, updater: (draft: Project) => void): void;
  markDirty(): void;
  closeProject(): void;
  setRegistries(r: Registries): void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  registries: BUILTIN_REGISTRIES,
  isDirty: false,

  loadProject(project: Project, registries: Registries): void {
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    set({ currentProject: project, registries, isDirty: false });
  },

  updateProject(actionName: string, updater: (draft: Project) => void): void {
    log.debug('updateProject', { actionName });
    const { currentProject } = get();
    if (!currentProject) return;
    const cloned = structuredClone(currentProject);
    updater(cloned);
    cloned.updatedAt = new Date().toISOString();
    set({ currentProject: cloned });
    get().markDirty();
  },

  markDirty(): void {
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
    }
    set({ isDirty: true });
    _saveTimer = setTimeout(() => {
      const { currentProject } = get();
      if (currentProject) {
        saveProject(currentProject).then(() => {
          set({ isDirty: false });
        }).catch((err) => {
          console.error('[projectStore] auto-save failed: id=%s', currentProject.id, err);
        });
      }
    }, 2000);
  },

  closeProject(): void {
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    set({ currentProject: null, isDirty: false });
  },

  setRegistries(r: Registries): void {
    set({ registries: r });
  },
}));
