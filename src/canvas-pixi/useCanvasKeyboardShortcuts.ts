import { useEffect, type RefObject } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useToolStore } from '../store/useToolStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { useViewportStore } from '../store/useViewportStore'
import { fitToView } from '../canvas/viewport'
import { boundaryGetAABB as getAABB } from '../canvas/elementAABB'
import type { InteractionManagerHandle } from './InteractionManager'

export function useCanvasKeyboardShortcuts(
  width: number,
  height: number,
  interactionManagerRef: RefObject<InteractionManagerHandle | null>,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in input fields
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'

      // Ctrl+Shift+1: fit-to-view
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
        e.preventDefault()
        const project = useProjectStore.getState().currentProject
        const fitElements: Array<{
          x: number
          y: number
          width: number
          height: number
        }> = []

        if (project?.yardBoundary && project.yardBoundary.vertices.length >= 3) {
          const aabb = getAABB(project.yardBoundary)
          fitElements.push({ x: aabb.x, y: aabb.y, width: aabb.w, height: aabb.h })
        }

        if (project?.elements) {
          for (const el of project.elements) {
            const bounds = { x: el.x, y: el.y, width: el.width, height: el.height }
            if (
              Number.isFinite(bounds.x) &&
              Number.isFinite(bounds.y) &&
              Number.isFinite(bounds.width) &&
              Number.isFinite(bounds.height)
            ) {
              fitElements.push(bounds)
            }
          }
        }

        const vp = fitToView(fitElements, width, height)
        useViewportStore.getState().setViewport(vp)
        return
      }

      if (isInput) return

      // Tab: cycle through overlapping elements at last click position
      if (e.key === 'Tab' && useToolStore.getState().activeTool === 'select') {
        e.preventDefault()
        interactionManagerRef.current?.handleTabCycle()
        return
      }

      // Delete/Backspace: remove selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useSelectionStore.getState()
        if (selectedIds.size === 0) return
        const project = useProjectStore.getState().currentProject
        if (!project) return
        e.preventDefault()
        const snapshot = structuredClone(project)
        useProjectStore.getState().updateProject((draft) => {
          draft.elements = draft.elements.filter((el) => !selectedIds.has(el.id))
          for (const g of draft.groups) {
            g.elementIds = g.elementIds.filter((id) => !selectedIds.has(id))
          }
        })
        useHistoryStore.getState().pushHistory(snapshot)
        useProjectStore.getState().markDirty()
        useSelectionStore.getState().deselectAll()
        useInspectorStore.getState().setInspectedElementId(null)
        return
      }

      // Escape: exit group editing mode
      if (e.key === 'Escape') {
        const { groupEditingId } = useSelectionStore.getState()
        if (groupEditingId !== null) {
          useSelectionStore.getState().setGroupEditing(null)
          useSelectionStore.getState().deselectAll()
          useInspectorStore.getState().setInspectedElementId(null)
        }
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // interactionManagerRef is a stable ref — read dynamically at call time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])
}
