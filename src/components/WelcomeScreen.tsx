import { useEffect, useRef, useState } from 'react'

const MAX_IMPORT_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
import { useRouter } from '@tanstack/react-router'
import { getAllProjects, saveProject, deleteProject } from '../db/projectsDb'
import { validateImport } from '../db/schemaValidation'
import { useProjectStore } from '../store/useProjectStore'
import { BUILTIN_REGISTRIES } from '../data/builtinRegistries'
import type { Project } from '../types/schema'

type LoadState = 'loading' | 'ready' | 'error'

function uniqueName(desired: string, existing: string[]): string {
  if (!existing.includes(desired)) return desired
  let n = 2
  while (existing.includes(`${desired} (${n})`)) n++
  return `${desired} (${n})`
}

export default function WelcomeScreen() {
  const router = useRouter()
  const loadProject = useProjectStore((s) => s.loadProject)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [projects, setProjects] = useState<Project[]>([])

  async function fetchProjects() {
    try {
      const all = await getAllProjects()
      setProjects(all)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }

  useEffect(() => {
    fetchProjects() // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch on mount
  }, [])

  function openProject(project: Project) {
    loadProject(project, BUILTIN_REGISTRIES)
    router.navigate({ to: '/app/canvas' })
  }

  async function handleRename(project: Project) {
    const newName = window.prompt('Enter new project name:', project.name)
    if (newName === null || newName.trim() === '') return
    const trimmed = newName.trim()
    const existingNames = projects.filter((p) => p.id !== project.id).map((p) => p.name)
    const finalName = uniqueName(trimmed, existingNames)
    const updated: Project = { ...project, name: finalName, updatedAt: new Date().toISOString() }
    await saveProject(updated)
    await fetchProjects()
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(`Delete "${project.name}"? This cannot be undone.`)
    if (!confirmed) return
    await deleteProject(project.id)
    await fetchProjects()
  }

  async function handleNewProject() {
    const name = window.prompt('Project name:')
    if (name === null || name.trim() === '') return
    const trimmed = name.trim()
    const existingNames = projects.map((p) => p.name)
    const finalName = uniqueName(trimmed, existingNames)
    const now = new Date().toISOString()
    const layerId = crypto.randomUUID()
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: finalName,
      createdAt: now,
      updatedAt: now,
      location: { lat: null, lng: null, label: null },
      gridConfig: { cellSizeCm: 100, snapIncrementCm: 10, originX: 0, originY: 0 },
      viewport: { panX: 0, panY: 0, zoom: 1 },
      uiState: { gridVisible: true, snapEnabled: true },
      currency: '$',
      yardBoundary: null,
      layers: [{ id: layerId, name: 'Default', visible: true, locked: false, order: 0 }],
      groups: [],
      elements: [],
      journalEntries: [],
    }
    await saveProject(newProject)
    loadProject(newProject, BUILTIN_REGISTRIES)
    router.navigate({ to: '/app/canvas' })
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      console.debug('[import] No file selected')
      return
    }
    console.debug('[import] File selected: name=%s size=%d bytes', file.name, file.size)
    // Reset so the same file can be re-imported
    e.target.value = ''
    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_IMPORT_SIZE_BYTES / 1024 / 1024} MB.`)
      return
    }
    let parsed: unknown
    try {
      const text = await file.text()
      parsed = JSON.parse(text)
      console.debug('[import] JSON parsed successfully')
    } catch (err) {
      console.error('[import] JSON parse failed:', err)
      alert('Invalid file: not valid JSON')
      return
    }
    const result = validateImport(parsed, BUILTIN_REGISTRIES)
    console.debug(
      '[import] Validation complete: project=%s id=%s warnings=%d',
      result.project.name,
      result.project.id,
      result.report.warnings.length
    )
    if (result.report.warnings.length > 0) {
      console.warn('[import] Warnings:', result.report.warnings)
      alert('Import warnings:\n' + result.report.warnings.join('\n'))
    }
    const existingNames = projects.map((p) => p.name)
    const finalName = uniqueName(result.project.name, existingNames)
    const importedProject: Project = { ...result.project, name: finalName }
    try {
      await saveProject(importedProject)
      console.debug('[import] Project saved to IndexedDB: id=%s name=%s', importedProject.id, importedProject.name)
    } catch (err) {
      console.error('[import] saveProject failed:', err)
      return
    }
    loadProject(importedProject, result.registries)
    console.debug('[import] loadProject called, navigating to /app/canvas')
    router.navigate({ to: '/app/canvas' })
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-xl p-8">
        {/* Header */}
        <h1 className="text-4xl font-bold text-[#1971c2] mb-1">Greenprint</h1>
        <p className="text-gray-500 mb-6">Your landscape planner</p>

        {/* Primary actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNewProject}
            className="px-4 py-2 rounded-lg bg-[#1971c2] text-white font-medium hover:bg-[#1565a8] transition-colors"
          >
            New Project
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {/* Project list area */}
        {loadState === 'loading' && (
          <p className="text-gray-400 text-sm">Loading...</p>
        )}

        {loadState === 'error' && (
          <p className="text-red-500 text-sm">Could not load projects.</p>
        )}

        {loadState === 'ready' && projects.length === 0 && (
          <p className="text-gray-400 text-sm">No projects yet.</p>
        )}

        {loadState === 'ready' && projects.length > 0 && (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex flex-col min-w-0 mr-4">
                  <span className="font-semibold text-gray-800 truncate">{project.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openProject(project)}
                    aria-label={`Open ${project.name}`}
                    className="px-3 py-1 rounded bg-[#1971c2] text-white text-sm font-medium hover:bg-[#1565a8] transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleRename(project)}
                    aria-label={`Rename ${project.name}`}
                    className="px-3 py-1 rounded text-gray-500 text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    aria-label={`Delete ${project.name}`}
                    className="px-3 py-1 rounded text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
