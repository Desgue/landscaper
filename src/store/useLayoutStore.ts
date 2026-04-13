import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LayoutMode = 'blueprint' | 'generate' | 'garden';

// Runtime allowlist to guard against invalid values reaching the store
// (e.g. from Tabs onValueChange casting with `as LayoutMode`).
const VALID_MODES: ReadonlySet<string> = new Set(['blueprint', 'generate', 'garden']);

interface PanelExpansionState {
  sidePaletteCollapsed: boolean;
  inspectorExpanded: boolean;
  layerPanelExpanded: boolean;
}

interface LayoutStore {
  mode: LayoutMode;

  // Modal / overlay visibility
  showCostSummary: boolean;

  // Per-mode panel expansion state
  blueprintPanels: PanelExpansionState;
  generatePanels: PanelExpansionState;
  gardenPanels: PanelExpansionState;

  // Actions
  setMode(mode: string): void;
  setShowCostSummary(show: boolean): void;
  setPanelExpansion(mode: LayoutMode, patch: Partial<PanelExpansionState>): void;
}

const DEFAULT_BLUEPRINT_PANELS: PanelExpansionState = {
  sidePaletteCollapsed: false,
  inspectorExpanded: true,
  layerPanelExpanded: true,
};

const DEFAULT_GENERATE_PANELS: PanelExpansionState = {
  sidePaletteCollapsed: true,
  inspectorExpanded: false,
  layerPanelExpanded: false,
};

const DEFAULT_GARDEN_PANELS: PanelExpansionState = {
  sidePaletteCollapsed: false,
  inspectorExpanded: false,
  layerPanelExpanded: false,
};

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      mode: 'blueprint',
      showCostSummary: false,

      blueprintPanels: { ...DEFAULT_BLUEPRINT_PANELS },
      generatePanels: { ...DEFAULT_GENERATE_PANELS },
      gardenPanels: { ...DEFAULT_GARDEN_PANELS },

      setMode(mode) {
        if (!VALID_MODES.has(mode)) return;
        set({ mode: mode as LayoutMode, showCostSummary: false });
      },

      setShowCostSummary(show) {
        set({ showCostSummary: show });
      },

      setPanelExpansion(mode, patch) {
        if (mode === 'blueprint') {
          set((s) => ({ blueprintPanels: { ...s.blueprintPanels, ...patch } }));
        } else if (mode === 'generate') {
          set((s) => ({ generatePanels: { ...s.generatePanels, ...patch } }));
        } else {
          set((s) => ({ gardenPanels: { ...s.gardenPanels, ...patch } }));
        }
      },
    }),
    {
      name: 'ls-layout-store',
      version: 0,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        blueprintPanels: state.blueprintPanels,
        generatePanels: state.generatePanels,
        gardenPanels: state.gardenPanels,
      }),
    },
  ),
);
