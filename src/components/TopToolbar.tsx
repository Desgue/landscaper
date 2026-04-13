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
import { useProjectStore } from '../store/useProjectStore'
import { useLayoutStore, type LayoutMode } from '../store/useLayoutStore'
import { exportProjectAsJSON } from '../db/projectsDb'
import { useRouter } from '@tanstack/react-router'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Design tokens
const ACCENT = 'var(--ls-color-interactive)'
const ACCENT_BG = 'var(--ls-color-interactive-subtle)'

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
  const currentProject = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const closeProject = useProjectStore((s) => s.closeProject)
  const router = useRouter()

  const activeMode = useLayoutStore((s) => s.mode)
  const setMode = useLayoutStore((s) => s.setMode)

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
      className="flex items-center gap-1 px-3 border-b border-gray-200 flex-shrink-0"
      style={{ height: 48, background: 'var(--ls-surface-toolbar)', color: 'var(--ls-text-on-dark)' }}
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
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTool(tool.id)}
                  aria-label={`${tool.label} (${tool.key.toUpperCase()})`}
                  aria-pressed={isActive}
                  className="flex flex-col items-center justify-center rounded px-2 py-0.5 gap-0.5 transition-colors"
                  style={{
                    minWidth: 40,
                    height: 36,
                    background: isActive ? ACCENT_BG : 'transparent',
                    color: isActive ? ACCENT : 'var(--ls-text-on-dark-secondary)',
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
              </TooltipTrigger>
              <TooltipContent
                style={{ background: 'var(--ls-surface-tooltip)', color: 'white', fontSize: 11 }}
                sideOffset={6}
              >
                {tool.label}
                <span className="ml-1.5 opacity-60">{tool.key.toUpperCase()}</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200 self-stretch my-2 mx-2" />

      {/* Undo / Redo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 border border-transparent transition-colors"
            style={{ color: 'var(--ls-text-on-dark-secondary)' }}
            aria-label="Undo (Ctrl+Z)"
            onClick={undo}
          >
            <Undo2 size={13} />
            <span>Undo</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          style={{ background: 'var(--ls-surface-tooltip)', color: 'white', fontSize: 11 }}
          sideOffset={6}
        >
          Undo <span className="opacity-60">Ctrl+Z</span>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 border border-transparent transition-colors"
            style={{ color: 'var(--ls-text-on-dark-secondary)' }}
            aria-label="Redo (Ctrl+Shift+Z)"
            onClick={redo}
          >
            <Redo2 size={13} />
            <span>Redo</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          style={{ background: 'var(--ls-surface-tooltip)', color: 'white', fontSize: 11 }}
          sideOffset={6}
        >
          Redo <span className="opacity-60">Ctrl+Shift+Z</span>
        </TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode switcher — dispatches to useLayoutStore */}
      <Tabs value={activeMode} onValueChange={(v) => setMode(v as LayoutMode)}>
        <TabsList
          className="h-7"
          style={{ background: 'var(--ls-surface-toolbar-active)' }}
        >
          <TabsTrigger value="blueprint" className="text-xs px-2.5 h-5 data-[state=active]:bg-white/15 data-[state=active]:text-white" style={{ color: 'var(--ls-text-on-dark-secondary)' }}>
            Blueprint
          </TabsTrigger>
          <TabsTrigger value="generate" className="text-xs px-2.5 h-5 data-[state=active]:bg-white/15 data-[state=active]:text-white" style={{ color: 'var(--ls-text-on-dark-secondary)' }}>
            Generate
          </TabsTrigger>
          <TabsTrigger value="garden" className="text-xs px-2.5 h-5 data-[state=active]:bg-white/15 data-[state=active]:text-white" style={{ color: 'var(--ls-text-on-dark-secondary)' }}>
            Garden
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setMode('generate')}
            disabled={!currentProject?.yardBoundary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
            style={{
              background: 'var(--ls-color-cta)',
              color: 'var(--ls-color-cta-text)',
              opacity: currentProject?.yardBoundary ? 1 : 0.5,
              cursor: currentProject?.yardBoundary ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            Generate
          </button>
        </TooltipTrigger>
        <TooltipContent
          style={{ background: 'var(--ls-surface-tooltip)', color: 'white', fontSize: 11 }}
          sideOffset={6}
        >
          {currentProject?.yardBoundary ? 'Open AI generation view' : 'Set up a yard boundary first'}
        </TooltipContent>
      </Tooltip>

      <div className="w-px bg-gray-200 self-stretch my-2 mx-1" />

      {/* Project menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm hover:bg-white/10 border border-transparent transition-colors"
            style={{ color: 'var(--ls-text-on-dark-secondary)' }}
          >
            Project ▾
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
          <DropdownMenuItem
            onClick={() => setMode('garden')}
            disabled={!currentProject}
          >
            Journal
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setMode('garden')}
            disabled={!currentProject}
          >
            Cost Summary
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (currentProject) {
                exportProjectAsJSON(currentProject, registries)
              }
            }}
            disabled={!currentProject}
          >
            Export JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              if (currentProject) {
                const { exportToPNG } = await import('../canvas-pixi/exportPNG')
                await exportToPNG(currentProject)
              }
            }}
            disabled={!currentProject}
          >
            Export PNG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              closeProject()
              router.navigate({ to: '/' })
            }}
          >
            Back to Projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
