import { useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PlantElement, PlantStatus, Project } from '../../types/schema'
import { labelCls, dividerCls } from './inspectorConstants'
import {
  ReadonlyField,
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'

export function PlantInspector({ element }: { element: PlantElement }) {
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const plantType = registries.plants.find((p) => p.id === element.plantTypeId)

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

  /** Immediate update with history push (for discrete controls). */
  const update = useCallback(
    (updater: (el: PlantElement) => void) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject('updatePlant', (draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'plant') updater(el as PlantElement)
      })
      pushHistory(snapshot)
    },
    [element.id, updateProject, pushHistory],
  )

  /** Live preview update without history push (for text inputs). */
  const updateLive = useCallback(
    (updater: (el: PlantElement) => void) => {
      updateProject('updatePlant', (draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'plant') updater(el as PlantElement)
      })
    },
    [element.id, updateProject],
  )

  return (
    <div>
      <ReadonlyField label="Plant Type" value={plantType?.name ?? element.plantTypeId} />
      <div className={dividerCls} />

      {/* Position (read-only — BUG-6: position changes must go through canvas drag to respect snap/collision) */}
      <ReadonlyField label="Position X (m)" value={(element.x / 100).toFixed(2)} />
      <ReadonlyField label="Position Y (m)" value={(element.y / 100).toFixed(2)} />

      <div className={dividerCls} />

      {/* Status */}
      <div className="mb-2">
        <div className={labelCls}>Status</div>
        <Select value={element.status} onValueChange={(v) => update((el) => { el.status = v as PlantStatus })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="planted">Planted</SelectItem>
            <SelectItem value="growing">Growing</SelectItem>
            <SelectItem value="harvested">Harvested</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Planted Date (visible when status !== planned) */}
      {element.status !== 'planned' && (
        <div className="mb-2">
          <div className={labelCls}>Planted Date</div>
          <Input
            type="date"
            className="h-8 text-sm"
            value={element.plantedDate ?? ''}
            onChange={(e) => update((el) => { el.plantedDate = e.target.value || null })}
          />
        </div>
      )}

      {/* Quantity */}
      <div className="mb-2">
        <div className={labelCls}>Quantity</div>
        <Input
          type="number"
          min={1}
          step={1}
          className="h-8 text-sm"
          value={element.quantity}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 1) update((el) => { el.quantity = v })
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
