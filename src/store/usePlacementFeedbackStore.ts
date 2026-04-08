import { create } from 'zustand'

interface PlacementFeedbackStore {
  message: string | null
  timestamp: number
  showFeedback(msg: string): void
  clearFeedback(): void
}

export const usePlacementFeedbackStore = create<PlacementFeedbackStore>((set) => ({
  message: null,
  timestamp: 0,
  showFeedback(msg: string) {
    set({ message: msg, timestamp: Date.now() })
  },
  clearFeedback() {
    set({ message: null, timestamp: 0 })
  },
}))
