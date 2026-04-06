import { useEffect } from 'react'
import {
  MousePointer2,
  Hand,
  Mountain,
  Leaf,
  Building2,
  Spline,
  Eraser,
  Type,
  Ruler,
  Undo2,
  Redo2,
  type LucideIcon,
} from 'lucide-react'
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
  Icon: LucideIcon
}

const TOOLS: ToolButton[] = [
  { key: 'v', id: 'select',      label: 'Select',    Icon: MousePointer2 },
  { key: 'h', id: 'hand',        label: 'Hand',      Icon: Hand          },
  { key: 'b', id: 'terrain',     label: 'Terrain',   Icon: Mountain      },
  { key: 'p', id: 'plant',       label: 'Plant',     Icon: Leaf          },
  { key: 's', id: 'structure',   label: 'Structure', Icon: Building2     },
  { key: 'a', id: 'arc',         label: 'Arc',       Icon: Spline        },
  { key: 'e', id: 'eraser',      label: 'Eraser',    Icon: Eraser        },
  { key: 't', id: 'label',       label: 'Label',     Icon: Type          },
  { key: 'm', id: 'measurement', label: 'Measure',   Icon: Ruler         },
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
            <div key={tool.id} className="relative group">
              <button
                onClick={() => setTool(tool.id)}
                aria-label={`${tool.label} (${tool.key.toUpperCase()})`}
                aria-pressed={isActive}
                className="flex flex-col items-center justify-center rounded px-2 py-0.5 gap-0.5 transition-colors"
                style={{
                  minWidth: 40,
                  height: 36,
                  background: isActive ? ACCENT_BG : 'transparent',
                  color: isActive ? ACCENT : '#374151',
                  border: isActive ? `1px solid ${ACCENT}` : '1px solid transparent',
                }}
              >
                <tool.Icon
                  size={14}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className="leading-none select-none"
                  style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}
                >
                  {tool.label}
                </span>
              </button>

              {/* Tooltip */}
              <div
                className="pointer-events-none absolute top-full left-1/2 mt-1.5 hidden group-hover:flex flex-col items-center"
                style={{ transform: 'translateX(-50%)', zIndex: 9999 }}
              >
                {/* Arrow */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderBottom: '4px solid #1f2937',
                  }}
                />
                <div
                  className="rounded px-2 py-1 text-white whitespace-nowrap shadow-md"
                  style={{ background: '#1f2937', fontSize: 11 }}
                >
                  {tool.label}
                  <span className="ml-1.5 opacity-60">{tool.key.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200 self-stretch my-2 mx-2" />

      {/* Undo / Redo */}
      <div className="relative group">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 border border-transparent transition-colors"
          aria-label="Undo (Ctrl+Z)"
          onClick={undo}
        >
          <Undo2 size={13} />
          <span>Undo</span>
        </button>
        <div
          className="pointer-events-none absolute top-full left-1/2 mt-1.5 hidden group-hover:flex flex-col items-center"
          style={{ transform: 'translateX(-50%)', zIndex: 9999 }}
        >
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid #1f2937' }} />
          <div className="rounded px-2 py-1 text-white whitespace-nowrap shadow-md" style={{ background: '#1f2937', fontSize: 11 }}>
            Undo <span className="opacity-60">Ctrl+Z</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 border border-transparent transition-colors"
          aria-label="Redo (Ctrl+Shift+Z)"
          onClick={redo}
        >
          <Redo2 size={13} />
          <span>Redo</span>
        </button>
        <div
          className="pointer-events-none absolute top-full left-1/2 mt-1.5 hidden group-hover:flex flex-col items-center"
          style={{ transform: 'translateX(-50%)', zIndex: 9999 }}
        >
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid #1f2937' }} />
          <div className="rounded px-2 py-1 text-white whitespace-nowrap shadow-md" style={{ background: '#1f2937', fontSize: 11 }}>
            Redo <span className="opacity-60">Ctrl+Shift+Z</span>
          </div>
        </div>
      </div>

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
