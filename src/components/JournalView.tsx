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
  CloudSun,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
} from 'lucide-react'
import type {
  JournalEntry,
  WeatherCondition,
  WeatherData,
  CanvasElement,
  UUID,
} from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'

// ─── Weather helpers ──────────────────────────────────────────────────────

const WEATHER_ICONS: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
}

const WEATHER_CONDITIONS: WeatherCondition[] = [
  'sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy', 'windy',
]

function mapWmoToCondition(code: number): WeatherCondition {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'partly-cloudy'
  if (code <= 48) return 'cloudy'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'rainy'
  if (code <= 86) return 'snowy'
  return 'windy'
}

async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,relative_humidity_2m,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const current = data?.current
    if (!current || typeof current !== 'object') return null

    const tempRaw = current.temperature_2m
    const humRaw = current.relative_humidity_2m
    const codeRaw = current.weather_code

    return {
      tempC: typeof tempRaw === 'number' && isFinite(tempRaw) && tempRaw >= -100 && tempRaw <= 100
        ? tempRaw : null,
      condition: mapWmoToCondition(typeof codeRaw === 'number' ? codeRaw : 0),
      humidity: typeof humRaw === 'number' && isFinite(humRaw) && humRaw >= 0 && humRaw <= 100
        ? Math.round(humRaw) : null,
    }
  } catch {
    return null
  }
}

// ─── Safe markdown renderer ──────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function safeHref(escapedRaw: string): string {
  // Input is already HTML-escaped from renderMarkdown; unescape for URL validation
  const raw = unescapeHtml(escapedRaw)
  try {
    const url = new URL(raw)
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return escapeHtml(raw)
  } catch {
    if (raw.startsWith('/')) return escapeHtml(raw)
  }
  return '#'
}

function renderMarkdown(text: string): string {
  // Escape HTML first to prevent XSS, then apply markdown substitutions
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, linkText, href) =>
      `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${linkText}</a>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)+/g, (m) => `<ul class="list-disc pl-4 space-y-0.5">${m}</ul>`)
    .replace(/\n/g, '<br />')
}

// ─── Weather display ──────────────────────────────────────────────────────

function WeatherDisplay({ weather }: { weather: WeatherData }) {
  const Icon = weather.condition ? WEATHER_ICONS[weather.condition] : CloudSun
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon size={14} />
      {weather.tempC !== null && <span>{weather.tempC}°C</span>}
      {weather.condition && (
        <span className="capitalize">{weather.condition.replace('-', ' ')}</span>
      )}
      {weather.humidity !== null && <span>{weather.humidity}%</span>}
    </div>
  )
}

// ─── Entry editor ─────────────────────────────────────────────────────────

interface EntryEditorProps {
  entry: JournalEntry | null // null = new entry
  onSave: (entry: JournalEntry) => void
  onCancel: () => void
  elements: CanvasElement[]
  preSelectedIds: UUID[]
}

function EntryEditor({ entry, onSave, onCancel, elements, preSelectedIds }: EntryEditorProps) {
  const project = useProjectStore((s) => s.currentProject)
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    project?.journalEntries.forEach((e) => e.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [project?.journalEntries])

  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [tags, setTags] = useState<string[]>(entry?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [linkedIds, setLinkedIds] = useState<UUID[]>(
    entry?.linkedElementIds ?? preSelectedIds,
  )
  const [weather, setWeather] = useState<WeatherData | null>(entry?.weather ?? null)
  const [weatherFetching, setWeatherFetching] = useState(false)
  const [weatherError, setWeatherError] = useState('')
  const [elementSearch, setElementSearch] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim().slice(0, 100)
    if (trimmed && !tags.includes(trimmed) && tags.length < 50) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const addElementLink = (id: UUID) => {
    if (!linkedIds.includes(id)) {
      setLinkedIds([...linkedIds, id])
    }
    setElementSearch('')
  }

  const removeElementLink = (id: UUID) => {
    setLinkedIds(linkedIds.filter((eid) => eid !== id))
  }

  const handleFetchWeather = async () => {
    setWeatherFetching(true)
    setWeatherError('')

    const loc = project?.location
    let lat = loc?.lat ?? null
    let lng = loc?.lng ?? null

    if (lat === null || lng === null) {
      // Try browser geolocation
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        // Validate coordinates
        if (!isFinite(lat) || Math.abs(lat) > 90 || !isFinite(lng) || Math.abs(lng) > 180) {
          setWeatherError('Invalid geolocation coordinates received.')
          setWeatherFetching(false)
          return
        }
        // Persist location
        useProjectStore.getState().updateProject((draft) => {
          draft.location.lat = lat
          draft.location.lng = lng
        })
      } catch {
        setWeatherError('Location unavailable. Set coordinates in project settings.')
        setWeatherFetching(false)
        return
      }
    }

    if (lat === null || lng === null) {
      setWeatherError('Location unavailable.')
      setWeatherFetching(false)
      return
    }
    const result = await fetchWeather(lat, lng)
    if (result) {
      setWeather(result)
    } else {
      setWeatherError('Weather unavailable.')
    }
    setWeatherFetching(false)
  }

  const handleSave = () => {
    const now = new Date().toISOString()
    const saved: JournalEntry = {
      id: entry?.id ?? crypto.randomUUID(),
      projectId: project?.id ?? '',
      date,
      title: title || null,
      content,
      tags,
      linkedElementIds: linkedIds,
      weather,
      createdAt: entry?.createdAt ?? now,
    }
    onSave(saved)
  }

  // Filter elements for search
  const filteredElements = elementSearch
    ? elements.filter((el) => {
        const term = elementSearch.toLowerCase()
        return el.type.toLowerCase().includes(term) || el.id.includes(term)
      })
    : []

  // Tag autocomplete suggestions
  const tagSuggestions = tagInput
    ? allTags.filter(
        (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t),
      )
    : []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {entry ? 'Edit Entry' : 'New Entry'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* Date */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Date</label>
        <input
          type="date"
          className="rounded border border-gray-200 px-3 py-1.5 text-sm w-full"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Title</label>
        <input
          type="text"
          className="rounded border border-gray-200 px-3 py-1.5 text-sm w-full"
          placeholder="Entry title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Content (markdown) */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">
          Content (markdown)
        </label>
        <textarea
          className="rounded border border-gray-200 px-3 py-2 text-sm w-full resize-y min-h-[120px] font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
        />
      </div>

      {/* Tags */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Tags</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            className="rounded border border-gray-200 px-3 py-1.5 text-sm w-full"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
          />
          {tagSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
              {tagSuggestions.map((t) => (
                <button
                  key={t}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => addTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linked elements */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium mb-1 block">
          Linked Elements
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {linkedIds.map((id) => {
            const el = elements.find((e) => e.id === id)
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                  el
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-gray-50 text-gray-400 italic'
                }`}
              >
                {el ? `${el.type} (${id.slice(0, 8)})` : 'deleted element'}
                <button onClick={() => removeElementLink(id)} className="hover:text-gray-900">
                  <X size={10} />
                </button>
              </span>
            )
          })}
        </div>
        <div className="relative">
          <input
            type="text"
            className="rounded border border-gray-200 px-3 py-1.5 text-sm w-full"
            placeholder="Search elements to link..."
            value={elementSearch}
            onChange={(e) => setElementSearch(e.target.value)}
          />
          {filteredElements.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
              {filteredElements.slice(0, 10).map((el) => (
                <button
                  key={el.id}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => addElementLink(el.id)}
                >
                  {el.type} ({el.id.slice(0, 8)})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weather */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Weather</label>
        {weather && <WeatherDisplay weather={weather} />}
        <div className="flex gap-2 mt-1">
          <button
            className="px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium flex items-center gap-1"
            onClick={handleFetchWeather}
            disabled={weatherFetching}
          >
            <CloudSun size={12} />
            {weatherFetching ? 'Fetching...' : 'Fetch Weather'}
          </button>
        </div>
        {weatherError && (
          <div className="text-xs text-amber-600 mt-1">{weatherError}</div>
        )}

        {/* Manual weather override */}
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.1"
              className="rounded border border-gray-200 px-2 py-1 text-xs w-full"
              placeholder="°C"
              value={weather?.tempC ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setWeather((prev) => ({
                  tempC: isFinite(v) ? v : null,
                  condition: prev?.condition ?? null,
                  humidity: prev?.humidity ?? null,
                }))
              }}
            />
          </div>
          <div className="flex-1">
            <select
              className="rounded border border-gray-200 px-2 py-1 text-xs w-full"
              value={weather?.condition ?? ''}
              onChange={(e) => {
                setWeather((prev) => ({
                  tempC: prev?.tempC ?? null,
                  condition: (e.target.value || null) as WeatherCondition | null,
                  humidity: prev?.humidity ?? null,
                }))
              }}
            >
              <option value="">Condition</option>
              {WEATHER_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c.replace('-', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <input
              type="number"
              min={0}
              max={100}
              className="rounded border border-gray-200 px-2 py-1 text-xs w-full"
              placeholder="Humidity %"
              value={weather?.humidity ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setWeather((prev) => ({
                  tempC: prev?.tempC ?? null,
                  condition: prev?.condition ?? null,
                  humidity: isFinite(v) ? v : null,
                }))
              }}
            />
          </div>
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <button
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
          onClick={handleSave}
        >
          {entry ? 'Save Changes' : 'Create Entry'}
        </button>
        <button
          className="px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Entry card ───────────────────────────────────────────────────────────

function EntryCard({
  entry,
  elements,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry
  elements: CanvasElement[]
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {entry.title || 'Untitled'}
          </h3>
          <div className="text-xs text-gray-400">{entry.date}</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-xs text-gray-400 hover:text-blue-600 px-1"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Weather */}
      {entry.weather && (
        <div className="mb-2">
          <WeatherDisplay weather={entry.weather} />
        </div>
      )}

      {/* Content preview */}
      {entry.content && (
        <div
          className="text-sm text-gray-600 mb-2 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
        />
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Linked elements */}
      {entry.linkedElementIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.linkedElementIds.map((id) => {
            const el = elements.find((e) => e.id === id)
            return (
              <span
                key={id}
                className={`px-2 py-0.5 rounded text-xs ${
                  el ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400 italic'
                }`}
              >
                {el ? `${el.type} (${id.slice(0, 8)})` : 'deleted element'}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────

function CalendarView({
  entries,
  onDateClick,
}: {
  entries: JournalEntry[]
  onDateClick: (date: string) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay()

  const entryDates = useMemo(() => {
    const dates = new Set<string>()
    entries.forEach((e) => dates.add(e.date))
    return dates
  }, [entries])

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  )

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthName}</span>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntries = entryDates.has(dateStr)
          return (
            <button
              key={dateStr}
              className={`text-xs py-1.5 rounded ${
                hasEntries
                  ? 'bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => hasEntries && onDateClick(dateStr)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
