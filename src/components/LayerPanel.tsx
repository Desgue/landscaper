import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  ChevronUp,
  ChevronDown,
  MoreVertical,
} from 'lucide-react'
import { useProjectStore } from '../store/useProjectStore'
import { useLayerStore } from '../store/useLayerStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import type { Layer, UUID } from '../types/schema'

function generateId(): UUID {
  return crypto.randomUUID()
}

const DEFAULT_LAYER_NAME = 'Default'

function getDefaultLayer(layers: Layer[]): Layer | undefined {
  if (layers.length === 0) return undefined
  return layers.reduce((min, l) => (l.order < min.order ? l : min), layers[0])
}

function getSortedLayers(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => a.order - b.order)
}

export default function LayerPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [contextMenuLayerId, setContextMenuLayerId] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const setActiveLayerId = useLayerStore((s) => s.setActiveLayerId)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const selectedIds = useSelectionStore((s) => s.selectedIds)
  const selectMultiple = useSelectionStore((s) => s.selectMultiple)
  const deselectAll = useSelectionStore((s) => s.deselectAll)

  // Ensure default layer exists and activeLayerId is valid
  useEffect(() => {
    if (!project) return

    if (project.layers.length === 0) {
      const defaultLayer: Layer = {
        id: generateId(),
        name: DEFAULT_LAYER_NAME,
        visible: true,
        locked: false,
        order: 0,
      }
      // Bootstrap only — do NOT push to undo stack (this is a system action, not user action)
      updateProject((draft) => {
        draft.layers.push(defaultLayer)
      })
      setActiveLayerId(defaultLayer.id)
      return
    }

    // Ensure activeLayerId points to a valid layer
    const validIds = new Set(project.layers.map((l) => l.id))
    if (!activeLayerId || !validIds.has(activeLayerId)) {
      const defaultLayer = getDefaultLayer(project.layers)
      if (defaultLayer) {
        setActiveLayerId(defaultLayer.id)
      }
    }
  }, [project, activeLayerId, setActiveLayerId, updateProject])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuLayerId) return
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuLayerId(null)
        setContextMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenuLayerId])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingLayerId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingLayerId])

  const deselectElementsOnLayer = useCallback(
    (layerId: string) => {
      if (!project || selectedIds.size === 0) return
      const layerElementIds = new Set(
        project.elements.filter((el) => el.layerId === layerId).map((el) => el.id),
      )
      const remaining = [...selectedIds].filter((id) => !layerElementIds.has(id))
      if (remaining.length < selectedIds.size) {
        if (remaining.length === 0) {
          deselectAll()
        } else {
          selectMultiple(remaining)
        }
      }
    },
    [project, selectedIds, deselectAll, selectMultiple],
  )

  const handleCreate = useCallback(() => {
    if (!project) return
    const snapshot = structuredClone(project)
    const maxOrder = project.layers.reduce((max, l) => Math.max(max, l.order), 0)
    const layerCount = project.layers.length
    const newLayer: Layer = {
      id: generateId(),
      name: `Layer ${layerCount + 1}`,
      visible: true,
      locked: false,
      order: maxOrder + 1,
    }
    updateProject((draft) => {
      draft.layers.push(newLayer)
    })
    pushHistory(snapshot)
    setActiveLayerId(newLayer.id)
  }, [project, updateProject, pushHistory, setActiveLayerId])

  const handleToggleVisibility = useCallback(
    (layerId: string) => {
      if (!project) return
      const layer = project.layers.find((l) => l.id === layerId)
      if (!layer) return
      const snapshot = structuredClone(project)
      const newVisible = !layer.visible
      updateProject((draft) => {
        const target = draft.layers.find((l) => l.id === layerId)
        if (target) target.visible = newVisible
      })
      pushHistory(snapshot)
      // If hiding, deselect elements on that layer
      if (!newVisible) {
        deselectElementsOnLayer(layerId)
      }
    },
    [project, updateProject, pushHistory, deselectElementsOnLayer],
  )

  const handleToggleLock = useCallback(
    (layerId: string) => {
      if (!project) return
      const layer = project.layers.find((l) => l.id === layerId)
      if (!layer) return
      const snapshot = structuredClone(project)
      const newLocked = !layer.locked
      updateProject((draft) => {
        const target = draft.layers.find((l) => l.id === layerId)
        if (target) target.locked = newLocked
      })
      pushHistory(snapshot)
      // If locking, deselect elements on that layer
      if (newLocked) {
        deselectElementsOnLayer(layerId)
      }
    },
    [project, updateProject, pushHistory, deselectElementsOnLayer],
  )

  const handleMoveUp = useCallback(
    (layerId: string) => {
      if (!project) return
      const sorted = getSortedLayers(project.layers)
      const idx = sorted.findIndex((l) => l.id === layerId)
      if (idx <= 0) return // already at top or not found
      const snapshot = structuredClone(project)
      const aboveId = sorted[idx - 1].id
      updateProject((draft) => {
        const current = draft.layers.find((l) => l.id === layerId)
        const above = draft.layers.find((l) => l.id === aboveId)
        if (current && above) {
          const tmp = current.order
          current.order = above.order
          above.order = tmp
        }
      })
      pushHistory(snapshot)
    },
    [project, updateProject, pushHistory],
  )

  const handleMoveDown = useCallback(
    (layerId: string) => {
      if (!project) return
      const sorted = getSortedLayers(project.layers)
      const idx = sorted.findIndex((l) => l.id === layerId)
      if (idx < 0 || idx >= sorted.length - 1) return // already at bottom
      const snapshot = structuredClone(project)
      const belowId = sorted[idx + 1].id
      updateProject((draft) => {
        const current = draft.layers.find((l) => l.id === layerId)
        const below = draft.layers.find((l) => l.id === belowId)
        if (current && below) {
          const tmp = current.order
          current.order = below.order
          below.order = tmp
        }
      })
      pushHistory(snapshot)
    },
    [project, updateProject, pushHistory],
  )

  const handleDelete = useCallback(
    (layerId: string) => {
      if (!project) return
      const defaultLayer = getDefaultLayer(project.layers)
      if (!defaultLayer || defaultLayer.id === layerId) return // cannot delete default

      if (!window.confirm('Delete this layer? All elements will be moved to the Default layer.')) {
        return
      }

      const snapshot = structuredClone(project)
      updateProject((draft) => {
        // Move all elements from deleted layer to default layer
        for (const el of draft.elements) {
          if (el.layerId === layerId) {
            el.layerId = defaultLayer.id
          }
        }
        // Move groups too
        for (const group of draft.groups) {
          if (group.layerId === layerId) {
            group.layerId = defaultLayer.id
          }
        }
        // Remove the layer
        draft.layers = draft.layers.filter((l) => l.id !== layerId)
      })
      pushHistory(snapshot)

      // If deleted layer was active, switch to default
      if (activeLayerId === layerId) {
        setActiveLayerId(defaultLayer.id)
      }
    },
    [project, updateProject, pushHistory, activeLayerId, setActiveLayerId],
  )

  const handleMergeDown = useCallback(
    (layerId: string) => {
      if (!project) return
      const sorted = getSortedLayers(project.layers)
      const idx = sorted.findIndex((l) => l.id === layerId)
      if (idx < 0 || idx >= sorted.length - 1) return // bottom-most, can't merge down

      const targetLayer = sorted[idx + 1]
      const snapshot = structuredClone(project)
      updateProject((draft) => {
        // Move elements to target layer
        for (const el of draft.elements) {
          if (el.layerId === layerId) {
            el.layerId = targetLayer.id
          }
        }
        // Move groups too
        for (const group of draft.groups) {
          if (group.layerId === layerId) {
            group.layerId = targetLayer.id
          }
        }
        // Remove merged layer
        draft.layers = draft.layers.filter((l) => l.id !== layerId)
      })
      pushHistory(snapshot)

      // Switch active to the target layer
      if (activeLayerId === layerId) {
        setActiveLayerId(targetLayer.id)
      }
    },
    [project, updateProject, pushHistory, activeLayerId, setActiveLayerId],
  )

  const handleSelectAllOnLayer = useCallback(
    (layerId: string) => {
      if (!project) return
      const layer = project.layers.find((l) => l.id === layerId)
      if (!layer || !layer.visible || layer.locked) return

      const ids = project.elements
        .filter((el) => el.layerId === layerId && !el.locked)
        .map((el) => el.id)
      selectMultiple(ids)
    },
    [project, selectMultiple],
  )

  const handleStartRename = useCallback(
    (layerId: string) => {
      if (!project) return
      const layer = project.layers.find((l) => l.id === layerId)
      if (!layer) return
      setRenamingLayerId(layerId)
      setRenameValue(layer.name)
    },
    [project],
  )

  const handleCommitRename = useCallback(() => {
    if (!project || !renamingLayerId) return
    const trimmed = renameValue.trim()
    if (trimmed.length === 0) {
      setRenamingLayerId(null)
      return
    }
    const layer = project.layers.find((l) => l.id === renamingLayerId)
    if (!layer || layer.name === trimmed) {
      setRenamingLayerId(null)
      return
    }
    const snapshot = structuredClone(project)
    updateProject((draft) => {
      const target = draft.layers.find((l) => l.id === renamingLayerId)
      if (target) target.name = trimmed.slice(0, 100)
    })
    pushHistory(snapshot)
    setRenamingLayerId(null)
  }, [project, renamingLayerId, renameValue, updateProject, pushHistory])

  const handleContextMenu = useCallback((layerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenuLayerId(layerId)
    setContextMenuPos({ x: rect.left, y: rect.bottom + 2 })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenuLayerId(null)
    setContextMenuPos(null)
  }, [])

  if (!project) return null

  const sortedLayers = getSortedLayers(project.layers)
  const defaultLayer = getDefaultLayer(project.layers)
  const isDefault = (id: string) => defaultLayer?.id === id
  const isBottommost = (id: string) => {
    const last = sortedLayers[sortedLayers.length - 1]
    return last?.id === id
  }

  return (
    <div
      className="flex flex-col bg-white border-l border-t border-gray-200 flex-shrink-0 overflow-hidden transition-all"
      style={{ width: collapsed ? 16 : 280, height: 240 }}
    >
      {!collapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Layers
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreate}
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
                title="New Layer"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="text-gray-400 hover:text-gray-600 text-sm ml-1"
                title="Collapse layers"
              >
                &#x203A;
              </button>
            </div>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-auto">
            {sortedLayers.map((layer) => {
              const isActive = activeLayerId === layer.id
              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-sm cursor-pointer border-l-2 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  {/* Visibility toggle */}
                  <button
                    className={`p-0.5 rounded ${
                      layer.visible
                        ? 'text-gray-500 hover:text-gray-700'
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleVisibility(layer.id)
                    }}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>

                  {/* Lock toggle */}
                  <button
                    className={`p-0.5 rounded ${
                      layer.locked
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleLock(layer.id)
                    }}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>

                  {/* Layer name (inline rename on double-click) */}
                  <div className="flex-1 min-w-0">
                    {renamingLayerId === layer.id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitRename()
                          if (e.key === 'Escape') setRenamingLayerId(null)
                        }}
                        onBlur={handleCommitRename}
                        className="w-full text-sm px-1 py-0 border border-blue-400 rounded outline-none bg-white"
                        maxLength={100}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="block truncate text-gray-700"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(layer.id)
                        }}
                        title={layer.name}
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>

                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0">
                    <button
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                      disabled={sortedLayers[0]?.id === layer.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMoveUp(layer.id)
                      }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                      disabled={isBottommost(layer.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMoveDown(layer.id)
                      }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Context menu trigger */}
                  <button
                    className="p-0.5 text-gray-300 hover:text-gray-600 rounded"
                    title="Layer options"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContextMenu(layer.id, e)
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-4 h-full bg-white border-l border-gray-200 text-gray-500 hover:bg-gray-50"
          title="Expand layers"
        >
          &#x2039;
        </button>
      )}

      {/* Context menu dropdown */}
      {contextMenuLayerId && contextMenuPos && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              handleStartRename(contextMenuLayerId)
              closeContextMenu()
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
            disabled={isDefault(contextMenuLayerId)}
            onClick={() => {
              handleDelete(contextMenuLayerId)
              closeContextMenu()
            }}
          >
            <span className={isDefault(contextMenuLayerId) ? 'text-gray-300' : 'text-red-600'}>
              Delete
            </span>
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
            disabled={isBottommost(contextMenuLayerId)}
            onClick={() => {
              handleMergeDown(contextMenuLayerId)
              closeContextMenu()
            }}
          >
            Merge Down
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              handleSelectAllOnLayer(contextMenuLayerId)
              closeContextMenu()
            }}
          >
            Select All on Layer
          </button>
        </div>
      )}
    </div>
  )
}
