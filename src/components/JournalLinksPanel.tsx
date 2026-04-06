/**
 * JournalLinksPanel.tsx — Inspector extension slot showing journal entries
 * linked to the selected element. Registered into inspector:journal slot.
 */

import type { CanvasElement } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'

export default function JournalLinksPanel({ element }: { element: CanvasElement }) {
  const project = useProjectStore((s) => s.currentProject)
  if (!project) return null

  // Find journal entries that link to this element
  const linkedEntries = project.journalEntries.filter(
    (entry) => entry.linkedElementIds.includes(element.id),
  )

  if (linkedEntries.length === 0) return null

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
        Journal Entries
      </div>
      <div className="space-y-1">
        {linkedEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs text-gray-700"
          >
            <div className="font-medium">{entry.title || 'Untitled'}</div>
            <div className="text-gray-400">{entry.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
