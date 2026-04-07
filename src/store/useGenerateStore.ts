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
import { buildRequestBody, sendGenerateRequest, mapErrorToToast } from '../api/generateClient';

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
  resultMimeType: string | null;

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
  generate(): Promise<void>;
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

let activeController: AbortController | null = null;
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
let isTimeoutAbort = false;

export const useGenerateStore = create<GenerateStore>((set, get) => ({
  activeFeature: 'initial',
  options: { ...DEFAULT_OPTIONS },
  yardPhoto: null,
  yardPhotoName: null,
  status: { kind: 'idle' },
  resultUrl: null,
  resultMimeType: null,
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

  async generate() {
    // Concurrent guard: no-op if already loading
    if (get().status.kind === 'loading') return;

    const { options, yardPhoto } = get();
    const projectStore = useProjectStore.getState();
    const project = projectStore.currentProject;
    if (!project) return;

    const body = buildRequestBody(
      project as unknown as Record<string, unknown>,
      projectStore.registries as unknown as Record<string, unknown>,
      options,
      yardPhoto,
    );

    // Set up AbortController and timeout
    const controller = new AbortController();
    activeController = controller;
    isTimeoutAbort = false;

    timeoutTimer = setTimeout(() => {
      isTimeoutAbort = true;
      controller.abort();
    }, 60_000);

    set({ status: { kind: 'loading', startedAt: Date.now() } });

    try {
      const blob = await sendGenerateRequest(body, controller.signal);

      // If cancel() already ran, don't overwrite idle status
      if (activeController !== controller) return;

      // Revoke previous object URL to prevent memory leak
      const prevUrl = get().resultUrl;
      if (prevUrl && prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }

      const url = URL.createObjectURL(blob);
      const mimeType = blob.type || 'image/png';

      set({
        status: { kind: 'success', resultUrl: url },
        resultUrl: url,
        resultMimeType: mimeType,
      });

      // Add to edit versions
      const versions = get().editVersions;
      set({
        editVersions: [
          ...versions,
          {
            id: crypto.randomUUID(),
            label: `v${versions.length + 1}`,
            imageUrl: url,
            timestamp: Date.now(),
            source: get().activeFeature,
          },
        ],
      });
    } catch (err) {
      // If cancel() already ran, don't overwrite idle status
      if (activeController !== controller) return;

      // Attach timeout flag for mapErrorToToast
      if (isTimeoutAbort && err instanceof DOMException && err.name === 'AbortError') {
        (err as unknown as { isTimeout: boolean }).isTimeout = true;
      }

      const toast = mapErrorToToast(err);
      if (toast) {
        set({ status: { kind: 'error', message: toast } });
      } else {
        // User cancel — no toast
        set({ status: { kind: 'idle' } });
      }
    } finally {
      if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
      activeController = null;
      isTimeoutAbort = false;
    }
  },

  cancel() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    isTimeoutAbort = false;
    set({ status: { kind: 'idle' } });
  },

  clearResult() {
    const prevUrl = get().resultUrl;
    if (prevUrl && prevUrl.startsWith('blob:')) {
      URL.revokeObjectURL(prevUrl);
    }
    set({ status: { kind: 'idle' }, resultUrl: null, resultMimeType: null });
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
      const validKeys = new Set(Object.keys(DEFAULT_OPTIONS));
      const persisted = project.uiState.lastGenerateOptions as Record<string, unknown>;
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(persisted)) {
        if (validKeys.has(key)) {
          filtered[key] = persisted[key];
        }
      }
      set({ options: { ...DEFAULT_OPTIONS, ...filtered as Partial<GenerateOptions> } });
    }
  },
}));
