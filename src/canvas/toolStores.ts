/**
 * toolStores.ts — Consolidated Zustand stores for all canvas tool state.
 *
 * Extracted from the Konva layer files during Phase 5.4 (Konva removal).
 * These are pure state stores with no rendering framework dependencies.
 */

import { create } from 'zustand'

// ─── Terrain paint store ────────────────────────────────────────────────────

interface TerrainPaintState {
  selectedTerrainTypeId: string | null
  brushSize: 1 | 2 | 3
  setSelectedTerrainTypeId: (id: string) => void
  setBrushSize: (size: 1 | 2 | 3) => void
}

export const useTerrainPaintStore = create<TerrainPaintState>((set) => ({
  selectedTerrainTypeId: null,
  brushSize: 1,
  setSelectedTerrainTypeId: (id: string) => set({ selectedTerrainTypeId: id }),
  setBrushSize: (size: 1 | 2 | 3) => set({ brushSize: size }),
}))

// ─── Plant tool store ───────────────────────────────────────────────────────

interface PlantToolState {
  selectedPlantTypeId: string | null
  setSelectedPlantTypeId: (id: string) => void
}

export const usePlantToolStore = create<PlantToolState>((set) => ({
  selectedPlantTypeId: null,
  setSelectedPlantTypeId: (id: string) => set({ selectedPlantTypeId: id }),
}))

// ─── Structure tool store ───────────────────────────────────────────────────

interface StructureToolState {
  selectedStructureTypeId: string | null
  setSelectedStructureTypeId: (id: string) => void
}

export const useStructureToolStore = create<StructureToolState>((set) => ({
  selectedStructureTypeId: null,
  setSelectedStructureTypeId: (id: string) => set({ selectedStructureTypeId: id }),
}))

// ─── Path tool store ────────────────────────────────────────────────────────

interface PathToolState {
  selectedPathTypeId: string | null
  setSelectedPathTypeId: (id: string) => void
}

export const usePathToolStore = create<PathToolState>((set) => ({
  selectedPathTypeId: null,
  setSelectedPathTypeId: (id: string) => set({ selectedPathTypeId: id }),
}))

// ─── Label tool store ───────────────────────────────────────────────────────

interface LabelToolState {
  isEditing: boolean
  editingLabelId: string | null
  setEditing: (id: string | null) => void
}

export const useLabelToolStore = create<LabelToolState>((set) => ({
  isEditing: false,
  editingLabelId: null,
  setEditing: (id: string | null) => set({ isEditing: id !== null, editingLabelId: id }),
}))

// ─── Measurement store ──────────────────────────────────────────────────────

import type { Vec2 } from '../types/schema'

export type MeasurePhase = 'idle' | 'first_placed' | 'completed'

interface MeasurementStore {
  phase: MeasurePhase
  startPoint: Vec2 | null
  endPoint: Vec2 | null
  livePoint: Vec2 | null
  reset: () => void
}

export const useMeasurementStore = create<MeasurementStore>((set) => ({
  phase: 'idle',
  startPoint: null,
  endPoint: null,
  livePoint: null,
  reset: () => set({ phase: 'idle', startPoint: null, endPoint: null, livePoint: null }),
}))
