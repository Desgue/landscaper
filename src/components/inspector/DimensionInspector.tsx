import { useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useHistoryStore } from '../../store/useHistoryStore'
import { Input } from '@/components/ui/input'
import type { DimensionElement } from '../../types/schema'
import { labelCls, dividerCls } from './inspectorConstants'
import {
  ReadonlyField,
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'

export function DimensionInspector({ element }: { element: DimensionElement }) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const project = useProjectStore((s) => s.currentProject)

  const distanceCm = Math.sqrt(
    (element.endPoint.x - element.startPoint.x) ** 2 +
    (element.endPoint.y - element.startPoint.y) ** 2,
  )

  const updateOffset = useCallback(
    (newOffset: number) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject('updateDimension', (draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'dimension') {
          ;(el as DimensionElement).offsetCm = newOffset
        }
      })
      pushHistory(snapshot)
      useProjectStore.getState().markDirty()
    },
    [element.id, updateProject, pushHistory],
  )

  // Resolve linked element names
  const startLinked = element.startElementId
    ? project?.elements.find((e) => e.id === element.startElementId)
    : null
  const endLinked = element.endElementId
    ? project?.elements.find((e) => e.id === element.endElementId)
    : null

  return (
    <div>
      <ReadonlyField label="Type" value="Dimension" />
      <div className={dividerCls} />
      <ReadonlyField label="Distance" value={`${(distanceCm / 100).toFixed(2)} m`} />
      <ReadonlyField
        label="Start Point"
        value={`(${(element.startPoint.x / 100).toFixed(2)}, ${(element.startPoint.y / 100).toFixed(2)}) m`}
      />
      <ReadonlyField
        label="End Point"
        value={`(${(element.endPoint.x / 100).toFixed(2)}, ${(element.endPoint.y / 100).toFixed(2)}) m`}
      />
      <div className={dividerCls} />
      <div className="mb-2">
        <div className={labelCls}>Offset (cm)</div>
        <Input
          type="number"
          step="5"
          className="h-8 text-sm"
          value={element.offsetCm}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (isFinite(v)) updateOffset(v)
          }}
        />
      </div>
      {element.startElementId && (
        <ReadonlyField
          label="Start Linked To"
          value={startLinked ? `${startLinked.type} (${startLinked.id.slice(0, 8)})` : 'deleted element'}
        />
      )}
      {element.endElementId && (
        <ReadonlyField
          label="End Linked To"
          value={endLinked ? `${endLinked.type} (${endLinked.id.slice(0, 8)})` : 'deleted element'}
        />
      )}
      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}
