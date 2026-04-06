import { create } from 'zustand'
import type { SnapLine } from '../types/schema'

interface SnapState {
  guideLines: SnapLine[]
  setGuideLines(lines: SnapLine[]): void
  clearGuideLines(): void
}

export const useSnapState = create<SnapState>((set) => ({
  guideLines: [],

  setGuideLines(lines: SnapLine[]): void {
    set({ guideLines: lines })
  },

  clearGuideLines(): void {
    set({ guideLines: [] })
  },
}))
