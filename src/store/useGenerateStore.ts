import { create } from 'zustand';
import type {
  FeatureId,
  GenerateOptions,
  GenerateStatus,
  ChatMessage,
  EditVersion,
  DraftVariant,
} from '../types/generate';
import {
  DEFAULT_OPTIONS,
  GARDEN_STYLES,
  SEASONS,
  TIMES_OF_DAY,
  VIEWPOINTS,
  ASPECT_RATIOS,
  IMAGE_SIZES,
} from '../types/generate';
import { useProjectStore } from './useProjectStore';
import { httpGenerateAdapter, mapErrorToToast } from '../api/generateClient';
import type { GenerateAdapter } from '../api/generateClient';
import { createLogger } from '../utils/logger';

const log = createLogger('GenerateStore');

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

  // Lifecycle state (encapsulated in store, not module-level globals)
  _activeController: AbortController | null;
  _timeoutTimer: ReturnType<typeof setTimeout> | null;
  _isTimeoutAbort: boolean;

  // Adapter (injectable for testing)
  _adapter: GenerateAdapter;

  // Actions
  setActiveFeature(feature: FeatureId): void;
  setOption<K extends keyof GenerateOptions>(key: K, value: GenerateOptions[K]): void;
  setOptions(patch: Partial<GenerateOptions>): void;
  setYardPhoto(dataUrl: string | null, filename: string | null): void;
  setAdapter(adapter: GenerateAdapter): void;
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

  // Lifecycle state — owned by the store, not module-level globals
  _activeController: null,
  _timeoutTimer: null,
  _isTimeoutAbort: false,

  // Default to the production HTTP adapter
  _adapter: httpGenerateAdapter,

  setActiveFeature(feature) {
    set({ activeFeature: feature });
  },

  setOption(key, value) {
    const options = { ...get().options, [key]: value };
    set({ options });
    // Persist to project
    const projectStore = useProjectStore.getState();
    if (projectStore.currentProject) {
      projectStore.updateProject('setGenerateOption', (p) => {
        p.uiState.lastGenerateOptions = options;
      });
    }
  },

  setOptions(patch) {
    const options = { ...get().options, ...patch };
    set({ options });
    const projectStore = useProjectStore.getState();
    if (projectStore.currentProject) {
      projectStore.updateProject('setGenerateOptions', (p) => {
        p.uiState.lastGenerateOptions = options;
      });
    }
  },

  setYardPhoto(dataUrl, filename) {
    set({ yardPhoto: dataUrl, yardPhotoName: filename });
  },

  setAdapter(adapter) {
    set({ _adapter: adapter });
  },

  async generate() {
    // Concurrent guard: no-op if already loading
    if (get().status.kind === 'loading') return;

    const { options, yardPhoto, _adapter } = get();
    const projectStore = useProjectStore.getState();
    const project = projectStore.currentProject;
    if (!project) return;

    // Set up AbortController and timeout
    const controller = new AbortController();
    let isTimeoutAbort = false;

    const timeoutTimer = setTimeout(() => {
      isTimeoutAbort = true;
      controller.abort();
    }, 60_000);

    set({
      _activeController: controller,
      _timeoutTimer: timeoutTimer,
      _isTimeoutAbort: false,
    });

    const startTime = Date.now();
    log.info('generate: start', { feature: get().activeFeature, hasYardPhoto: !!yardPhoto });
    set({ status: { kind: 'loading', startedAt: startTime } });

    try {
      const blob = await _adapter.generate(
        project,
        projectStore.registries,
        options,
        yardPhoto,
        controller.signal,
      );

      // If cancel() already ran, don't overwrite idle status
      if (get()._activeController !== controller) return;

      // Revoke previous object URL to prevent memory leak
      const prevUrl = get().resultUrl;
      if (prevUrl && prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }

      const url = URL.createObjectURL(blob);
      const mimeType = blob.type || 'image/png';

      log.info('generate: success', { durationMs: Date.now() - startTime, mimeType });
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
      if (get()._activeController !== controller) return;

      // Attach timeout flag for mapErrorToToast
      if (isTimeoutAbort && err instanceof DOMException && err.name === 'AbortError') {
        (err as unknown as { isTimeout: boolean }).isTimeout = true;
      }

      const toast = mapErrorToToast(err);
      if (toast) {
        log.error('generate: failed', { error: String(err), isTimeout: isTimeoutAbort, durationMs: Date.now() - startTime });
        set({ status: { kind: 'error', message: toast } });
      } else {
        // User cancel — no toast
        log.debug('generate: cancelled');
        set({ status: { kind: 'idle' } });
      }
    } finally {
      const { _timeoutTimer: t } = get();
      if (t) { clearTimeout(t); }
      set({ _activeController: null, _timeoutTimer: null, _isTimeoutAbort: false });
    }
  },

  cancel() {
    const { _timeoutTimer, _activeController } = get();
    if (_timeoutTimer) {
      clearTimeout(_timeoutTimer);
    }
    if (_activeController) {
      _activeController.abort();
    }
    set({
      _activeController: null,
      _timeoutTimer: null,
      _isTimeoutAbort: false,
      status: { kind: 'idle' },
    });
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
      const persisted = project.uiState.lastGenerateOptions as unknown as Record<string, unknown>;
      const filtered: Record<string, unknown> = {};

      // Valid value sets for each enum field
      const validValues: Record<string, ReadonlySet<string>> = {
        gardenStyle: new Set(GARDEN_STYLES.map((o) => o.value)),
        season: new Set(SEASONS.map((o) => o.value)),
        timeOfDay: new Set(TIMES_OF_DAY.map((o) => o.value)),
        viewpoint: new Set(VIEWPOINTS.map((o) => o.value)),
        aspectRatio: new Set(ASPECT_RATIOS.map((o) => o.value)),
        imageSize: new Set(IMAGE_SIZES.map((o) => o.value)),
      };

      for (const key of Object.keys(persisted)) {
        if (!validKeys.has(key)) continue;
        const allowed = validValues[key];
        // For enum fields, only accept values still in the current set
        if (allowed && typeof persisted[key] === 'string') {
          if (allowed.has(persisted[key] as string)) {
            filtered[key] = persisted[key];
          }
          // else: stale value, fall through to DEFAULT_OPTIONS
        } else {
          filtered[key] = persisted[key];
        }
      }
      set({ options: { ...DEFAULT_OPTIONS, ...filtered as Partial<GenerateOptions> } });
    }
  },
}));
