import { useProjectStore } from '../../store/useProjectStore'
import type { TerrainElement } from '../../types/schema'
import { dividerCls } from './inspectorConstants'
import {
  ReadonlyField,
  LayerDropdown,
  LockedToggle,
  InspectorExtensionSlots,
} from './inspectorShared'

export function TerrainInspector({ element }: { element: TerrainElement }) {
  const registries = useProjectStore((s) => s.registries)
  const terrainType = registries.terrain.find((t) => t.id === element.terrainTypeId)

  return (
    <div>
      <ReadonlyField label="Type" value={terrainType?.name ?? element.terrainTypeId} />
      <div className={dividerCls} />
      <ReadonlyField label="Position X (m)" value={(element.x / 100).toFixed(2)} />
      <ReadonlyField label="Position Y (m)" value={(element.y / 100).toFixed(2)} />
      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}
