import { useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { LabelElement, TextAlign, Project } from '../../types/schema'
import { labelCls, dividerCls } from './inspectorConstants'
import {
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'

export function LabelInspector({ element }: { element: LabelElement }) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  // Snapshot ref for debounced text edits
  const snapshotRef = useRef<Project | null>(null)

  const startEdit = useCallback(() => {
    if (!snapshotRef.current) {
      const proj = useProjectStore.getState().currentProject
      if (proj) snapshotRef.current = structuredClone(proj)
    }
  }, [])

  const commitTextEdit = useCallback(() => {
    if (snapshotRef.current) {
      pushHistory(snapshotRef.current)
      snapshotRef.current = null
    }
  }, [pushHistory])

  /** Immediate update with history push (for discrete controls). */
  const update = useCallback(
    (updater: (el: LabelElement) => void) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject('updateLabel', (draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'label') updater(el as LabelElement)
      })
      pushHistory(snapshot)
    },
    [element.id, updateProject, pushHistory],
  )

  /** Live preview update without history push (for text inputs). */
  const updateLive = useCallback(
    (updater: (el: LabelElement) => void) => {
      updateProject('updateLabel', (draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'label') updater(el as LabelElement)
      })
    },
    [element.id, updateProject],
  )

  return (
    <div>
      {/* Text */}
      <div className="mb-2">
        <div className={labelCls}>Text</div>
        <Textarea
          className="resize-y min-h-[60px] text-sm"
          value={element.text}
          onFocus={startEdit}
          onChange={(e) => updateLive((el) => { el.text = e.target.value })}
          onBlur={commitTextEdit}
          rows={3}
        />
      </div>

      <div className={dividerCls} />

      {/* Font Size */}
      <div className="mb-2">
        <div className={labelCls}>Font Size</div>
        <Input
          type="number"
          min={4}
          max={200}
          step={1}
          className="h-8 text-sm"
          value={element.fontSize}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 4 && v <= 200) update((el) => { el.fontSize = v })
          }}
        />
      </div>

      {/* Font Color */}
      <div className="mb-2">
        <div className={labelCls}>Font Color</div>
        <input
          type="color"
          className="w-full h-8 rounded border border-[var(--ls-border-subtle)] cursor-pointer"
          value={element.fontColor}
          onChange={(e) => update((el) => { el.fontColor = e.target.value })}
        />
      </div>

      <div className={dividerCls} />

      {/* Text Align */}
      <div className="mb-2">
        <div className={labelCls}>Text Align</div>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
            <button
              key={align}
              className={`flex-1 px-2 py-1 text-xs rounded border ${element.textAlign === align ? 'bg-[var(--ls-color-interactive-subtle)] border-[var(--ls-color-interactive-border)] text-[var(--ls-color-interactive)]' : 'border-[var(--ls-border-subtle)] text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-panel)]'}`}
              onClick={() => update((el) => { el.textAlign = align })}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={dividerCls} />

      {/* Bold */}
      <div className="mb-2 flex items-center gap-2">
        <Checkbox
          id={`bold-${element.id}`}
          checked={element.bold}
          onCheckedChange={(checked) => update((el) => { el.bold = checked === true })}
        />
        <Label htmlFor={`bold-${element.id}`} className={labelCls + ' mb-0'}>Bold</Label>
      </div>

      {/* Italic */}
      <div className="mb-2 flex items-center gap-2">
        <Checkbox
          id={`italic-${element.id}`}
          checked={element.italic}
          onCheckedChange={(checked) => update((el) => { el.italic = checked === true })}
        />
        <Label htmlFor={`italic-${element.id}`} className={labelCls + ' mb-0'}>Italic</Label>
      </div>

      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}
