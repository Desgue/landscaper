import { useEffect } from 'react'
import type { ToolId } from '../types/schema'
import { useToolStore } from '../store/useToolStore'
import { useHistoryStore } from '../store/useHistoryStore'

// Design tokens
const ACCENT = '#1971c2'
const ACCENT_BG = '#e8f0fb'

interface ToolButton {
  key: string
  id: ToolId
  label: string
}

const TOOLS: ToolButton[] = [
  { key: 'v', id: 'select',      label: 'Select'    },
  { key: 'h', id: 'hand',        label: 'Hand'      },
  { key: 'b', id: 'terrain',     label: 'Terrain'   },
  { key: 'p', id: 'plant',       label: 'Plant'     },
  { key: 's', id: 'structure',   label: 'Structure' },
  { key: 'a', id: 'arc',         label: 'Arc'       },
  { key: 'e', id: 'eraser',      label: 'Eraser'    },
  { key: 't', id: 'label',       label: 'Label'     },
  { key: 'm', id: 'measurement', label: 'Measure'   },
]

const KEY_TO_TOOL: Record<string, ToolId> = Object.fromEntries(
  TOOLS.map(t => [t.key, t.id])
) as Record<string, ToolId>

function isInputFocused(): boolean {
  const el = document.activeElement
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}

export default function TopToolbar() {
  const { activeTool, setTool, pushTemporaryTool, popTemporaryTool } = useToolStore()
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        pushTemporaryTool('hand')
        return
      }

      const toolId = KEY_TO_TOOL[e.key.toLowerCase()]
      if (toolId) {
        setTool(toolId)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      // Guard matches keydown: only fire if not in an input
      if (e.code === 'Space' && !isInputFocused()) {
        popTemporaryTool()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [setTool, pushTemporaryTool, popTemporaryTool])

  return (
    <div
      className="flex items-center gap-1 px-3 bg-white border-b border-gray-200 flex-shrink-0"
      style={{ height: 48 }}
    >
      {/* Logo */}
      <span className="font-bold text-base mr-3" style={{ color: ACCENT }}>
        Greenprint
      </span>

      {/* Divider */}
      <div className="w-px bg-gray-200 self-stretch my-2 mr-2" />

      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map(tool => {
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              title={`${tool.label} (${tool.key.toUpperCase()})`}
              aria-label={`${tool.label} (${tool.key.toUpperCase()})`}
              aria-pressed={isActive}
              className="flex flex-col items-center justify-center rounded px-2 py-0.5 text-xs gap-0.5 transition-colors"
              style={{
                minWidth: 40,
                height: 36,
                background: isActive ? ACCENT_BG : 'transparent',
                color: isActive ? ACCENT : '#374151',
                fontWeight: isActive ? 600 : 400,
                border: isActive ? `1px solid ${ACCENT}` : '1px solid transparent',
              }}
            >
              <span className="text-sm font-mono leading-none">
                {tool.key.toUpperCase()}
              </span>
              <span className="leading-none" style={{ fontSize: 10 }}>
                {tool.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200 self-stretch my-2 mx-2" />

      {/* Undo / Redo — wired in Phase 2 via useHistoryStore */}
      <button
        className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 border border-transparent"
        title="Undo (Ctrl+Z)"
        onClick={undo}
      >
        ↩ Undo
      </button>
      <button
        className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 border border-transparent"
        title="Redo (Ctrl+Shift+Z)"
        onClick={redo}
      >
        ↪ Redo
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project menu */}
      <button
        className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-100 border border-gray-200"
        title="Project menu"
        onClick={() => { /* TODO: project menu dropdown */ }}
      >
        Project ▾
      </button>
    </div>
  )
}
