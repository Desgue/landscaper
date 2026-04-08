/**
 * JournalView.tsx — Full-screen journal view that replaces the canvas.
 * Provides entry CRUD, element linking, search/filter, list/calendar views,
 * and weather integration via Open-Meteo API.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  List,
} from 'lucide-react'
import type { JournalEntry } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { EntryEditor } from './journal/EntryEditor'
import { EntryCard } from './journal/EntryCard'
import { CalendarView } from './journal/CalendarView'

// ─── Main journal view ────────────────────────────────────────────────────

interface JournalViewProps {
  onClose: () => void
}

export default function JournalView({ onClose }: JournalViewProps) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const selectedIds = useSelectionStore((s) => s.selectedIds)

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [editing, setEditing] = useState<JournalEntry | null | 'new'>(null) // null=not editing, 'new'=new entry
  const [searchText, setSearchText] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const entries = project?.journalEntries ?? []
  const elements = project?.elements ?? []

  // Collect all tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [entries])

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Text search
    if (searchText) {
      const term = searchText.toLowerCase()
      result = result.filter(
        (e) =>
          (e.title?.toLowerCase().includes(term) ?? false) ||
          e.content.toLowerCase().includes(term),
      )
    }

    // Tag filter
    if (tagFilter) {
      result = result.filter((e) => e.tags.includes(tagFilter))
    }

    // Date filter
    if (dateFilter) {
      result = result.filter((e) => e.date === dateFilter)
    }

    // Sort newest first
    result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

    return result
  }, [entries, searchText, tagFilter, dateFilter])

  const saveEntry = useCallback(
    (entry: JournalEntry) => {
      if (!project) return
      const snapshot = structuredClone(project)

      updateProject((draft) => {
        const idx = draft.journalEntries.findIndex((e) => e.id === entry.id)
        if (idx >= 0) {
          draft.journalEntries[idx] = entry
        } else {
          draft.journalEntries.push(entry)
        }
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
      setEditing(null)
    },
    [project, updateProject, pushHistory],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      if (!project) return
      const snapshot = structuredClone(project)
      updateProject((draft) => {
        draft.journalEntries = draft.journalEntries.filter((e) => e.id !== id)
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    [project, updateProject, pushHistory],
  )

  // Pre-selected element IDs for new entries
  const preSelectedIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds],
  )

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={16} />
          Back to canvas
        </button>
        <div className="flex-1" />
        <span className="text-sm font-semibold text-gray-700">Journal</span>
        <div className="flex-1" />
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          <Plus size={14} />
          New Entry
        </button>
      </div>

      {/* Toolbar: search, tag filter, view toggle */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            className="rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm w-full"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <select
            className="rounded border border-gray-200 px-2 py-1.5 text-sm"
            value={tagFilter ?? ''}
            onChange={(e) => setTagFilter(e.target.value || null)}
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        {dateFilter && (
          <button
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => setDateFilter(null)}
          >
            Clear date filter
          </button>
        )}
        <div className="flex border border-gray-200 rounded overflow-hidden">
          <button
            className={`px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setViewMode('list')}
          >
            <List size={14} />
          </button>
          <button
            className={`px-2 py-1 text-xs ${viewMode === 'calendar' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setViewMode('calendar')}
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {editing !== null ? (
          <EntryEditor
            entry={editing === 'new' ? null : editing}
            onSave={saveEntry}
            onCancel={() => setEditing(null)}
            elements={elements}
            preSelectedIds={editing === 'new' ? preSelectedIds : []}
          />
        ) : viewMode === 'calendar' ? (
          <div className="space-y-6">
            <CalendarView
              entries={entries}
              onDateClick={(d) => setDateFilter(d)}
            />
            {dateFilter && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600">
                  Entries for {dateFilter}
                </h3>
                {filteredEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    elements={elements}
                    onEdit={() => setEditing(entry)}
                    onDelete={() => deleteEntry(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-12">
            {entries.length === 0
              ? 'No journal entries yet. Click "New Entry" to get started.'
              : 'No entries match your filters.'}
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                elements={elements}
                onEdit={() => setEditing(entry)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
