import { useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { StructureElement, StructureShape, Project } from '../../types/schema'
import { labelCls, dividerCls } from './inspectorConstants'
import {
  ReadonlyField,
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'

export function StructureInspector({ element }: { element: StructureElement }) {
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const structureType = registries.structures.find((s) => s.id === element.structureTypeId)

  // Snapshot ref for debounced text edits (notes)
  const snapshotRef = useRef<Project | null>(null)

  const startEdit = useCallback(() => {
    if (!snapshotRef.current) {
      const proj = useProjectStore.getState().currentProject
      if (proj) snapshotRef.current = structuredClone(proj)
    }
  }, [])

  const commitEdit = useCallback(() => {
    if (snapshotRef.current) {
      pushHistory(snapshotRef.current)
      snapshotRef.current = null
    }
  }, [pushHistory])

  const update = useCallback(
    (updater: (el: StructureElement) => void) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject((draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'structure') updater(el as StructureElement)
      })
      pushHistory(snapshot)
    },
    [element.id, updateProject, pushHistory],
  )

  /** Live preview update without history push (for text inputs). */
  const updateLive = useCallback(
    (updater: (el: StructureElement) => void) => {
      updateProject((draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'structure') updater(el as StructureElement)
      })
    },
    [element.id, updateProject],
  )

  return (
    <div>
      <ReadonlyField label="Structure Type" value={structureType?.name ?? element.structureTypeId} />
      <div className={dividerCls} />

      {/* Position (read-only — BUG-6: position changes must go through canvas drag to respect snap/collision) */}
      <ReadonlyField label="Position X (m)" value={(element.x / 100).toFixed(2)} />
      <ReadonlyField label="Position Y (m)" value={(element.y / 100).toFixed(2)} />

      <div className={dividerCls} />

      {/* Dimensions (meters) */}
      <div className="mb-2">
        <div className={labelCls}>Width (m)</div>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          className="h-8 text-sm"
          value={(element.width / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v > 0) update((el) => { el.width = v * 100 })
          }}
        />
      </div>
      <div className="mb-2">
        <div className={labelCls}>Height (m)</div>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          className="h-8 text-sm"
          value={(element.height / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v > 0) update((el) => { el.height = v * 100 })
          }}
        />
      </div>

      <div className={dividerCls} />

      {/* Shape toggle */}
      <div className="mb-2">
        <div className={labelCls}>Shape</div>
        <div className="flex gap-1">
          <button
            className={`flex-1 px-2 py-1 text-xs rounded border ${element.shape === 'straight' ? 'bg-[var(--ls-color-interactive-subtle)] border-[var(--ls-color-interactive-border)] text-[var(--ls-color-interactive)]' : 'border-[var(--ls-border-subtle)] text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-panel)]'}`}
            onClick={() => update((el) => { el.shape = 'straight' as StructureShape })}
          >
            Straight
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs rounded border ${element.shape === 'curved' ? 'bg-[var(--ls-color-interactive-subtle)] border-[var(--ls-color-interactive-border)] text-[var(--ls-color-interactive)]' : 'border-[var(--ls-border-subtle)] text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-panel)]'}`}
            onClick={() => update((el) => { el.shape = 'curved' as StructureShape })}
          >
            Curved
          </button>
        </div>
      </div>

      {/* Arc Sagitta (only when curved) */}
      {element.shape === 'curved' && (
        <div className="mb-2">
          <div className={labelCls}>Arc Sagitta (cm)</div>
          <Input
            type="number"
            step="1"
            className="h-8 text-sm"
            value={element.arcSagitta ?? 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (isFinite(v)) update((el) => { el.arcSagitta = v })
            }}
          />
        </div>
      )}

      {/* Rotation */}
      <div className="mb-2">
        <div className={labelCls}>Rotation (deg)</div>
        <Input
          type="number"
          step="1"
          min="0"
          max="359"
          className="h-8 text-sm"
          value={element.rotation}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (isFinite(v)) update((el) => { el.rotation = ((v % 360) + 360) % 360 })
          }}
        />
      </div>

      <div className={dividerCls} />

      {/* Notes */}
      <div className="mb-2">
        <div className={labelCls}>Notes</div>
        <Textarea
          className="resize-y min-h-[60px] text-sm"
          value={element.notes ?? ''}
          onFocus={startEdit}
          onChange={(e) => updateLive((el) => { el.notes = e.target.value || null })}
          onBlur={commitEdit}
          rows={3}
        />
      </div>

      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}
