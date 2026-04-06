import { create } from 'zustand'
import type { ToolId } from '../types/schema'

interface ToolState {
  activeTool: ToolId
  previousTool: ToolId | null
  setTool: (id: ToolId) => void
  pushTemporaryTool: (id: ToolId) => void
  popTemporaryTool: () => void
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'select',
  previousTool: null,

  setTool: (id: ToolId) => {
    set({ activeTool: id, previousTool: null })
  },

  pushTemporaryTool: (id: ToolId) => {
    set({ previousTool: get().activeTool, activeTool: id })
  },

  popTemporaryTool: () => {
    const { previousTool } = get()
    if (previousTool !== null) {
      set({ activeTool: previousTool, previousTool: null })
    }
  },
}))
