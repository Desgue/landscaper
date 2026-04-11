import { useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import type { CanvasElement, Project } from '../../types/schema'

export function useInspectorEdit<T extends CanvasElement>(
  elementId: string,
  elementType: T['type'],
) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const snapshotRef = useRef<Project | null>(null)

  const startEdit = useCallback(() => {
    if (!snapshotRef.current) {
      const proj = useProjectStore.getState().currentProject
      if (proj) snapshotRef.current = structuredClone(proj)
    }
  }, [])

  const commitEdit = useCallback(() => {
    if (snapshotRef.current) {
      pushHistory(snapshotRef.current)
      snapshotRef.current = null
    }
  }, [pushHistory])

  const update = useCallback(
    (updater: (el: T) => void) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject(`update${elementType.charAt(0).toUpperCase()}${elementType.slice(1)}`, (draft) => {
        const el = draft.elements.find((e) => e.id === elementId)
        if (el && el.type === elementType) updater(el as T)
      })
      pushHistory(snapshot)
    },
    [elementId, elementType, updateProject, pushHistory],
  )

  const updateLive = useCallback(
    (updater: (el: T) => void) => {
      updateProject(`update${elementType.charAt(0).toUpperCase()}${elementType.slice(1)}`, (draft) => {
        const el = draft.elements.find((e) => e.id === elementId)
        if (el && el.type === elementType) updater(el as T)
      })
    },
    [elementId, elementType, updateProject],
  )

  return { startEdit, commitEdit, update, updateLive }
}
