import { create } from 'zustand';
import type {
  FeatureId,
  GenerateOptions,
  GenerateStatus,
  ChatMessage,
  EditVersion,
  DraftVariant,
} from '../types/generate';
import { DEFAULT_OPTIONS } from '../types/generate';
import { useProjectStore } from './useProjectStore';

interface GenerateStore {
  // Navigation
  activeFeature: FeatureId;

  // Generation options
  options: GenerateOptions;

  // Yard photo (base64, single for now)
  yardPhoto: string | null;
  yardPhotoName: string | null;

  // Generation state
  status: GenerateStatus;
  resultUrl: string | null;

  // Feature 4: Conversational editing
  chatHistory: ChatMessage[];

  // Edit versioning (undo-to-version)
  editVersions: EditVersion[];

  // Feature 8: Draft variants
  draftVariants: DraftVariant[];

  // Feature 6: Selected material
  selectedMaterialId: string | null;
  selectedZoneId: string | null;

  // Feature 11: Style transfer
  activeStyleResult: string | null;

  // Actions
  setActiveFeature(feature: FeatureId): void;
  setOption<K extends keyof GenerateOptions>(key: K, value: GenerateOptions[K]): void;
  setOptions(patch: Partial<GenerateOptions>): void;
  setYardPhoto(dataUrl: string | null, filename: string | null): void;
  generate(): void;
  cancel(): void;
  clearResult(): void;

  // Chat actions
  sendChatMessage(text: string): void;
  acceptEdit(messageId: string): void;
  rejectEdit(messageId: string): void;
  undoToVersion(versionId: string): void;

  // Draft actions
  selectDraft(draftId: string): void;
  generateDrafts(): void;
  upscaleSelected(): void;

  // Material actions
  selectMaterial(materialId: string): void;
  selectZone(zoneId: string | null): void;
  applyMaterial(): void;

  // Style transfer actions
  applyStyle(): void;
  acceptStyle(): void;

  // Restore persisted options from project
  restoreFromProject(): void;
}

let cancelTimer: ReturnType<typeof setTimeout> | null = null;

export const useGenerateStore = create<GenerateStore>((set, get) => ({
  activeFeature: 'initial',
  options: { ...DEFAULT_OPTIONS },
  yardPhoto: null,
  yardPhotoName: null,
  status: { kind: 'idle' },
  resultUrl: null,
  chatHistory: [],
  editVersions: [],
  draftVariants: [],
  selectedMaterialId: null,
  selectedZoneId: null,
  activeStyleResult: null,

  setActiveFeature(feature) {
    set({ activeFeature: feature });
  },

  setOption(key, value) {
    const options = { ...get().options, [key]: value };
    set({ options });
    // Persist to project
    const projectStore = useProjectStore.getState();
    if (projectStore.currentProject) {
      projectStore.updateProject((p) => {
        p.uiState.lastGenerateOptions = options;
      });
    }
  },

  setOptions(patch) {
    const options = { ...get().options, ...patch };
    set({ options });
    const projectStore = useProjectStore.getState();
    if (projectStore.currentProject) {
      projectStore.updateProject((p) => {
        p.uiState.lastGenerateOptions = options;
      });
    }
  },

  setYardPhoto(dataUrl, filename) {
    set({ yardPhoto: dataUrl, yardPhotoName: filename });
  },

  generate() {
    // Stubbed — simulates a 3-second generation
    set({ status: { kind: 'loading', startedAt: Date.now() } });
    cancelTimer = setTimeout(() => {
      // Use a placeholder image for the mock result
      set({
        status: { kind: 'success', resultUrl: '/mock-result.png' },
        resultUrl: '/mock-result.png',
      });
      // Add to edit versions
      const versions = get().editVersions;
      set({
        editVersions: [
          ...versions,
          {
            id: crypto.randomUUID(),
            label: `v${versions.length + 1}`,
            imageUrl: '/mock-result.png',
            timestamp: Date.now(),
            source: get().activeFeature,
          },
        ],
      });
    }, 3000);
  },

  cancel() {
    if (cancelTimer) {
      clearTimeout(cancelTimer);
      cancelTimer = null;
    }
    set({ status: { kind: 'idle' } });
  },

  clearResult() {
    set({ status: { kind: 'idle' }, resultUrl: null });
  },

  // Chat actions
  sendChatMessage(text) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    set({ chatHistory: [...get().chatHistory, userMsg] });

    // Stub AI response after 2s
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Applied: "${text}"`,
        imageUrl: '/mock-result.png',
        status: 'pending',
        timestamp: Date.now(),
      };
      set({ chatHistory: [...get().chatHistory, aiMsg] });
    }, 2000);
  },

  acceptEdit(messageId) {
    const history = get().chatHistory.map((m) =>
      m.id === messageId ? { ...m, status: 'accepted' as const } : m,
    );
    const accepted = history.find((m) => m.id === messageId);
    set({
      chatHistory: history,
      resultUrl: accepted?.imageUrl ?? get().resultUrl,
    });
    if (accepted?.imageUrl) {
      const versions = get().editVersions;
      set({
        editVersions: [
          ...versions,
          {
            id: crypto.randomUUID(),
            label: `v${versions.length + 1}`,
            imageUrl: accepted.imageUrl,
            timestamp: Date.now(),
            source: 'conversational',
          },
        ],
      });
    }
  },

  rejectEdit(messageId) {
    const history = get().chatHistory.map((m) =>
      m.id === messageId ? { ...m, status: 'rejected' as const } : m,
    );
    set({ chatHistory: history });
  },

  undoToVersion(versionId) {
    const version = get().editVersions.find((v) => v.id === versionId);
    if (version) {
      set({ resultUrl: version.imageUrl });
    }
  },

  // Draft actions
  selectDraft(draftId) {
    set({
      draftVariants: get().draftVariants.map((d) => ({
        ...d,
        selected: d.id === draftId,
      })),
    });
  },

  generateDrafts() {
    set({ status: { kind: 'loading', startedAt: Date.now() } });
    setTimeout(() => {
      set({
        status: { kind: 'idle' },
        draftVariants: [
          { id: crypto.randomUUID(), imageUrl: '/mock-draft-a.png', selected: false },
          { id: crypto.randomUUID(), imageUrl: '/mock-draft-b.png', selected: false },
          { id: crypto.randomUUID(), imageUrl: '/mock-draft-c.png', selected: false },
        ],
      });
    }, 2000);
  },

  upscaleSelected() {
    const selected = get().draftVariants.find((d) => d.selected);
    if (!selected) return;
    set({ status: { kind: 'loading', startedAt: Date.now() } });
    setTimeout(() => {
      set({
        status: { kind: 'success', resultUrl: selected.imageUrl },
        resultUrl: selected.imageUrl,
      });
    }, 3000);
  },

  // Material actions
  selectMaterial(materialId) {
    set({ selectedMaterialId: materialId });
  },

  selectZone(zoneId) {
    set({ selectedZoneId: zoneId });
  },

  applyMaterial() {
    // Stub — would trigger generation with material swap
    set({ status: { kind: 'loading', startedAt: Date.now() } });
    setTimeout(() => {
      set({
        status: { kind: 'success', resultUrl: '/mock-result.png' },
        resultUrl: '/mock-result.png',
      });
    }, 2000);
  },

  // Style transfer
  applyStyle() {
    set({ status: { kind: 'loading', startedAt: Date.now() } });
    setTimeout(() => {
      set({
        status: { kind: 'idle' },
        activeStyleResult: '/mock-styled.png',
      });
    }, 2000);
  },

  acceptStyle() {
    const styled = get().activeStyleResult;
    if (styled) {
      set({ resultUrl: styled, activeStyleResult: null });
    }
  },

  restoreFromProject() {
    const project = useProjectStore.getState().currentProject;
    if (project?.uiState.lastGenerateOptions) {
      set({ options: { ...DEFAULT_OPTIONS, ...project.uiState.lastGenerateOptions } });
    }
  },
}));
