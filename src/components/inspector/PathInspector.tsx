import { useProjectStore } from '../../store/useProjectStore'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { PathElement } from '../../types/schema'
import { labelCls, dividerCls } from './inspectorConstants'
import {
  ReadonlyField,
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'
import { useInspectorEdit } from './useInspectorEdit'

export function PathInspector({ element }: { element: PathElement }) {
  const registries = useProjectStore((s) => s.registries)
  const pathType = registries.paths.find((p) => p.id === element.pathTypeId)
  const { update } = useInspectorEdit<PathElement>(element.id, 'path')

  // Calculate total length from segments
  const totalLengthCm = element.points.reduce((sum, pt, i) => {
    if (i === 0) return 0
    const prev = element.points[i - 1]
    const dx = pt.x - prev.x
    const dy = pt.y - prev.y
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0)

  return (
    <div>
      <ReadonlyField label="Path Type" value={pathType?.name ?? element.pathTypeId} />
      <div className={dividerCls} />

      {/* Width */}
      <div className="mb-2">
        <div className={labelCls}>Width (cm)</div>
        <Input
          type="number"
          step="1"
          min="1"
          className="h-8 text-sm"
          value={element.strokeWidthCm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 1) update((el) => { el.strokeWidthCm = v })
          }}
        />
      </div>

      <ReadonlyField label="Total Length (m)" value={(totalLengthCm / 100).toFixed(2)} />

      {/* Closed */}
      <div className="mb-2 flex items-center gap-2">
        <Checkbox
          id={`closed-${element.id}`}
          checked={element.closed}
          onCheckedChange={(checked) => update((el) => { el.closed = checked === true })}
        />
        <Label htmlFor={`closed-${element.id}`} className={labelCls + ' mb-0'}>Closed</Label>
      </div>

      <ReadonlyField label="Points" value={String(element.points.length)} />

      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}
