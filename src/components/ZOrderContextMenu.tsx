/**
 * ZOrderContextMenu — Right-click context menu for "Bring to Front" / "Send to Back".
 * Rendered as an HTML overlay positioned at the right-click location.
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useSelectionStore } from '../store/useSelectionStore'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'

interface MenuState {
  visible: boolean
  x: number
  y: number
}

export default function ZOrderContextMenu() {
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  // Show context menu on right-click when elements are selected
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      const { selectedIds } = useSelectionStore.getState()
      if (selectedIds.size === 0) return

      // Only show if right-clicking inside the canvas area
      const target = e.target as HTMLElement
      const canvas = target.closest('canvas')
      if (!canvas) return

      e.preventDefault()
      setMenu({ visible: true, x: e.clientX, y: e.clientY })
    }

    window.addEventListener('contextmenu', handleContextMenu)
    return () => window.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu.visible) return

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu((m) => ({ ...m, visible: false }))
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenu((m) => ({ ...m, visible: false }))
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menu.visible])

  const bringToFront = useCallback(() => {
    const { selectedIds } = useSelectionStore.getState()
    const project = useProjectStore.getState().currentProject
    if (!project || selectedIds.size === 0) return

    const snapshot = structuredClone(project)

    useProjectStore.getState().updateProject('changeZOrder', (draft) => {
      for (const el of draft.elements) {
        if (!selectedIds.has(el.id)) continue

        // Find max zIndex among same-type elements on the same layer
        const maxZ = draft.elements
          .filter((other) => other.type === el.type && other.layerId === el.layerId && other.id !== el.id)
          .reduce((max, other) => Math.max(max, other.zIndex), 0)

        el.zIndex = maxZ + 1
        el.updatedAt = new Date().toISOString()
      }
    })

    useHistoryStore.getState().pushHistory(snapshot)
    useProjectStore.getState().markDirty()
    setMenu((m) => ({ ...m, visible: false }))
  }, [])

  const sendToBack = useCallback(() => {
    const { selectedIds } = useSelectionStore.getState()
    const project = useProjectStore.getState().currentProject
    if (!project || selectedIds.size === 0) return

    const snapshot = structuredClone(project)

    useProjectStore.getState().updateProject('changeZOrder', (draft) => {
      for (const el of draft.elements) {
        if (!selectedIds.has(el.id)) continue

        // Find min zIndex among same-type elements on the same layer
        const minZ = draft.elements
          .filter((other) => other.type === el.type && other.layerId === el.layerId && other.id !== el.id)
          .reduce((min, other) => Math.min(min, other.zIndex), 0)

        el.zIndex = minZ - 1
        el.updatedAt = new Date().toISOString()
      }
    })

    useHistoryStore.getState().pushHistory(snapshot)
    useProjectStore.getState().markDirty()
    setMenu((m) => ({ ...m, visible: false }))
  }, [])

  if (!menu.visible) return null

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded shadow-lg py-1 z-50"
      style={{ left: menu.x, top: menu.y, minWidth: 160 }}
    >
      <button
        className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        onClick={bringToFront}
      >
        Bring to Front
      </button>
      <button
        className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        onClick={sendToBack}
      >
        Send to Back
      </button>
    </div>
  )
}
