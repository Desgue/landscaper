import { create } from 'zustand'

interface InspectorStore {
  inspectedElementId: string | null
  setInspectedElementId: (id: string | null) => void
}

export const useInspectorStore = create<InspectorStore>((set) => ({
  inspectedElementId: null,
  setInspectedElementId: (id: string | null) => set({ inspectedElementId: id }),
}))
