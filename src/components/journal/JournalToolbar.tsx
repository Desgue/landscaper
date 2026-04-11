import { useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  List,
} from 'lucide-react'
import type { JournalEntry } from '../../types/schema'

interface JournalToolbarProps {
  entries: JournalEntry[]
  onClose: () => void
  onNewEntry: () => void
  searchText: string
  onSearchChange: (text: string) => void
  tagFilter: string | null
  onTagFilterChange: (tag: string | null) => void
  dateFilter: string | null
  onClearDateFilter: () => void
  viewMode: 'list' | 'calendar'
  onViewModeChange: (mode: 'list' | 'calendar') => void
}

export function JournalToolbar({
  entries,
  onClose,
  onNewEntry,
  searchText,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  dateFilter,
  onClearDateFilter,
  viewMode,
  onViewModeChange,
}: JournalToolbarProps) {
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [entries])

  return (
    <>
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
          onClick={onNewEntry}
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
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <select
            className="rounded border border-gray-200 px-2 py-1.5 text-sm"
            value={tagFilter ?? ''}
            onChange={(e) => onTagFilterChange(e.target.value || null)}
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
            onClick={onClearDateFilter}
          >
            Clear date filter
          </button>
        )}
        <div className="flex border border-gray-200 rounded overflow-hidden">
          <button
            className={`px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => onViewModeChange('list')}
          >
            <List size={14} />
          </button>
          <button
            className={`px-2 py-1 text-xs ${viewMode === 'calendar' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => onViewModeChange('calendar')}
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
