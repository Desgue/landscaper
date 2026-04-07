import { create } from 'zustand'
import type { BoundaryHandle, BoundaryPlacementState } from '../canvas-pixi/BoundaryHandler'

interface BoundaryUIState {
  boundaryHandle: BoundaryHandle | null
  placementState: BoundaryPlacementState
  editingEdgeIndex: number | null
  setBoundaryHandle: (h: BoundaryHandle | null) => void
  setPlacementState: (s: BoundaryPlacementState) => void
  setEditingEdgeIndex: (i: number | null) => void
}

export const useBoundaryUIStore = create<BoundaryUIState>((set) => ({
  boundaryHandle: null,
  placementState: { isPlacing: false, placedVertices: [], cursorWorld: null },
  editingEdgeIndex: null,

  setBoundaryHandle: (h) => set({ boundaryHandle: h }),
  setPlacementState: (s) => set({ placementState: s }),
  setEditingEdgeIndex: (i) => set({ editingEdgeIndex: i }),
}))
