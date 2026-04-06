import { create } from 'zustand'

interface CursorStore {
  /** Cursor world X in cm */
  worldX: number
  /** Cursor world Y in cm */
  worldY: number
  setCursorWorld(x: number, y: number): void
}

export const useCursorStore = create<CursorStore>((set) => ({
  worldX: 0,
  worldY: 0,
  setCursorWorld(x: number, y: number) {
    set({ worldX: x, worldY: y })
  },
}))
