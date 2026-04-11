/**
 * JournalView.tsx — Full-screen journal view that replaces the canvas.
 * Provides entry CRUD, element linking, search/filter, list/calendar views,
 * and weather integration via Open-Meteo API.
 */

import { useState, useCallback, useMemo } from 'react'
import type { JournalEntry } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { EntryEditor } from './journal/EntryEditor'
import { EntryCard } from './journal/EntryCard'
import { CalendarView } from './journal/CalendarView'
import { JournalToolbar } from './journal/JournalToolbar'

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
  const [editing, setEditing] = useState<JournalEntry | null | 'new'>(null)
  const [searchText, setSearchText] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const entries = project?.journalEntries ?? []
  const elements = project?.elements ?? []

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = [...entries]
    if (searchText) {
      const term = searchText.toLowerCase()
      result = result.filter(
        (e) =>
          (e.title?.toLowerCase().includes(term) ?? false) ||
          e.content.toLowerCase().includes(term),
      )
    }
    if (tagFilter) {
      result = result.filter((e) => e.tags.includes(tagFilter))
    }
    if (dateFilter) {
      result = result.filter((e) => e.date === dateFilter)
    }
    result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    return result
  }, [entries, searchText, tagFilter, dateFilter])

  const saveEntry = useCallback(
    (entry: JournalEntry) => {
      if (!project) return
      const snapshot = structuredClone(project)
      updateProject('saveJournalEntry', (draft) => {
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
      updateProject('deleteJournalEntry', (draft) => {
        draft.journalEntries = draft.journalEntries.filter((e) => e.id !== id)
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    [project, updateProject, pushHistory],
  )

  const preSelectedIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds],
  )

  return (
    <div className="flex flex-col h-full bg-white">
      <JournalToolbar
        entries={entries}
        onClose={onClose}
        onNewEntry={() => setEditing('new')}
        searchText={searchText}
        onSearchChange={setSearchText}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        dateFilter={dateFilter}
        onClearDateFilter={() => setDateFilter(null)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

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
