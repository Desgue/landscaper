import { useState, useMemo } from 'react'
import { CloudSun, X } from 'lucide-react'
import type { JournalEntry, WeatherData, WeatherCondition, CanvasElement, UUID } from '../../types/schema'
import { useProjectStore } from '../../store/useProjectStore'
import { WeatherDisplay } from './WeatherDisplay'
import {
  WEATHER_CONDITIONS,
  fetchWeather,
} from './weatherUtils'

interface EntryEditorProps {
  entry: JournalEntry | null // null = new entry
  onSave: (entry: JournalEntry) => void
  onCancel: () => void
  elements: CanvasElement[]
  preSelectedIds: UUID[]
}

export function EntryEditor({ entry, onSave, onCancel, elements, preSelectedIds }: EntryEditorProps) {
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
