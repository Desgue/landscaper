import { useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { useSelectionStore } from '../../store/useSelectionStore'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CanvasElement, Layer } from '../../types/schema'
import {
  labelCls,
  readonlyCls,
  dividerCls,
} from './inspectorConstants'
import GeometryPanel from '../GeometryPanel'
import CostPanel from '../CostPanel'
import JournalLinksPanel from '../JournalLinksPanel'

export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className={labelCls}>{label}</div>
      <div className={readonlyCls}>{value}</div>
    </div>
  )
}

// ─── Layer Dropdown ────────────────────────────────────────────────────────

export function LayerDropdown({ element }: { element: CanvasElement }) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const selectedIds = useSelectionStore((s) => s.selectedIds)

  const layers = project?.layers ?? []

  const handleChange = useCallback(
    (newLayerId: string) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      // Validate that the target layer actually exists
      if (!proj.layers.some((l) => l.id === newLayerId)) return

      const snapshot = structuredClone(proj)

      // Apply to all selected elements (multi-select aware)
      const idsToUpdate = new Set(selectedIds)
      // Always include the current element
      idsToUpdate.add(element.id)

      updateProject('changeElementLayer', (draft) => {
        for (const el of draft.elements) {
          if (idsToUpdate.has(el.id)) {
            el.layerId = newLayerId
          }
        }
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    [element.id, selectedIds, updateProject, pushHistory],
  )

  return (
    <div className="mb-2">
      <div className={labelCls}>Layer</div>
      <Select value={element.layerId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {layers.map((layer: Layer) => (
            <SelectItem key={layer.id} value={layer.id}>
              {layer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Locked Toggle ─────────────────────────────────────────────────────────

export function LockedToggle({ element }: { element: CanvasElement }) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  const handleChange = useCallback(
    (locked: boolean) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject('toggleElementLock', (draft) => {
        const el = draft.elements.find((item) => item.id === element.id)
        if (el) el.locked = locked
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    [element.id, updateProject, pushHistory],
  )

  return (
    <div className="mb-2 flex items-center gap-2">
      <Checkbox
        id={`locked-${element.id}`}
        checked={element.locked}
        onCheckedChange={(checked) => handleChange(checked === true)}
      />
      <Label htmlFor={`locked-${element.id}`} className={labelCls + ' mb-0'}>Locked</Label>
    </div>
  )
}

// ─── Extension Slot Renderer ───────────────────────────────────────────────

export function InspectorExtensionSlots({ element }: { element: CanvasElement }) {
  return (
    <>
      <div><div className={dividerCls} /><CostPanel element={element} /></div>
      <div><div className={dividerCls} /><GeometryPanel element={element} /></div>
      <div><div className={dividerCls} /><JournalLinksPanel element={element} /></div>
    </>
  )
}
