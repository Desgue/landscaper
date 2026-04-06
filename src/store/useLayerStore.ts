import { create } from 'zustand'

interface LayerStore {
  activeLayerId: string | null
  setActiveLayerId: (id: string) => void
}

export const useLayerStore = create<LayerStore>((set) => ({
  activeLayerId: null,
  setActiveLayerId: (id: string) => set({ activeLayerId: id }),
}))
