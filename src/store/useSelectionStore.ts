import { create } from 'zustand'
import type { CanvasElement } from '../types/schema'

interface ClipboardData {
  elements: CanvasElement[]
}

interface SelectionStore {
  selectedIds: Set<string>
  primaryId: string | null
  groupEditingId: string | null
  clipboard: ClipboardData | null

  select(id: string): void
  toggleSelect(id: string): void
  selectMultiple(ids: string[]): void
  deselectAll(): void
  setGroupEditing(groupId: string | null): void
  setClipboard(data: ClipboardData | null): void
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedIds: new Set<string>(),
  primaryId: null,
  groupEditingId: null,
  clipboard: null,

  select(id: string) {
    console.debug('[SelectionStore] select', { id })
    set({ selectedIds: new Set([id]), primaryId: id })
  },

  toggleSelect(id: string) {
    const { selectedIds, primaryId } = get()
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
      console.debug('[SelectionStore] toggleSelect: deselected', { id })
      set({
        selectedIds: next,
        primaryId: primaryId === id ? (next.size > 0 ? next.values().next().value ?? null : null) : primaryId,
      })
    } else {
      next.add(id)
      console.debug('[SelectionStore] toggleSelect: added', { id })
      set({
        selectedIds: next,
        primaryId: primaryId ?? id,
      })
    }
  },

  selectMultiple(ids: string[]) {
    console.debug('[SelectionStore] selectMultiple', { count: ids.length })
    set({
      selectedIds: new Set(ids),
      primaryId: ids[0] ?? null,
    })
  },

  deselectAll() {
    const { selectedIds } = get()
    if (selectedIds.size === 0) return
    console.debug('[SelectionStore] deselectAll')
    set({ selectedIds: new Set(), primaryId: null })
  },

  setGroupEditing(groupId: string | null) {
    set({ groupEditingId: groupId })
  },

  setClipboard(data: ClipboardData | null) {
    set({ clipboard: data })
  },
}))
