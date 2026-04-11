import { Trash2 } from 'lucide-react'
import type { JournalEntry, CanvasElement } from '../../types/schema'
import { WeatherDisplay } from './WeatherDisplay'
import { renderMarkdown } from './markdownUtils'

export function EntryCard({
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
