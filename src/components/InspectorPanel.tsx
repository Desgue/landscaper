import { useState, useCallback, useRef, useContext } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import {
  inspectorSlotRegistry,
  InspectorSlotsContext,
} from './inspectorSlots'
import type {
  CanvasElement,
  TerrainElement,
  PlantElement,
  StructureElement,
  PathElement,
  LabelElement,
  DimensionElement,
  PlantStatus,
  StructureShape,
  TextAlign,
  Project,
  Layer,
} from '../types/schema'

function useInspectorSlots() {
  return useContext(InspectorSlotsContext)
}

// ─── Shared UI helpers ──────────────────────────────────────────────────────

const labelCls = 'text-xs text-gray-500 font-medium mb-0.5'
const inputCls = 'rounded border border-gray-200 px-2 py-1 text-sm w-full'
const readonlyCls = 'rounded border border-gray-100 bg-gray-50 px-2 py-1 text-sm w-full text-gray-600'
const dividerCls = 'border-t border-gray-100 my-3'

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className={labelCls}>{label}</div>
      <div className={readonlyCls}>{value}</div>
    </div>
  )
}

// ─── Layer Dropdown ────────────────────────────────────────────────────────

function LayerDropdown({ element }: { element: CanvasElement }) {
  const project = useProjectStore((s) => s.currentProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const selectedIds = useSelectionStore((s) => s.selectedIds)

  const layers = project?.layers ?? []

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLayerId = e.target.value
      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      // Validate that the target layer actually exists
      if (!proj.layers.some((l) => l.id === newLayerId)) return

      const snapshot = structuredClone(proj)

      // Apply to all selected elements (multi-select aware)
      const idsToUpdate = new Set(selectedIds)
      // Always include the current element
      idsToUpdate.add(element.id)

      updateProject((draft) => {
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
      <select className={inputCls} value={element.layerId} onChange={handleChange}>
        {layers.map((layer: Layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Locked Toggle ─────────────────────────────────────────────────────────

function LockedToggle({ element }: { element: CanvasElement }) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const locked = e.target.checked
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject((draft) => {
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
      <input
        type="checkbox"
        checked={element.locked}
        onChange={handleChange}
        className="rounded border-gray-300"
      />
      <span className={labelCls + ' mb-0'}>Locked</span>
    </div>
  )
}

// ─── Extension Slot Renderer ───────────────────────────────────────────────

function InspectorExtensionSlots({ element }: { element: CanvasElement }) {
  const slots = useInspectorSlots()
  const slotNames = ['inspector:cost', 'inspector:geometry', 'inspector:journal']

  return (
    <>
      {slotNames.map((name) => {
        const SlotComponent = slots.get(name)
        if (!SlotComponent) return null
        return (
          <div key={name}>
            <div className={dividerCls} />
            <SlotComponent element={element} />
          </div>
        )
      })}
    </>
  )
}

// ─── Sub-inspectors ─────────────────────────────────────────────────────────

function TerrainInspector({ element }: { element: TerrainElement }) {
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

function PlantInspector({ element }: { element: PlantElement }) {
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
      updateProject((draft) => {
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
      updateProject((draft) => {
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

      {/* Position (editable, meters <-> cm) */}
      <div className="mb-2">
        <div className={labelCls}>Position X (m)</div>
        <input
          type="number"
          step="0.01"
          className={inputCls}
          value={(element.x / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) update((el) => { el.x = v * 100 })
          }}
        />
      </div>
      <div className="mb-2">
        <div className={labelCls}>Position Y (m)</div>
        <input
          type="number"
          step="0.01"
          className={inputCls}
          value={(element.y / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) update((el) => { el.y = v * 100 })
          }}
        />
      </div>

      <div className={dividerCls} />

      {/* Status */}
      <div className="mb-2">
        <div className={labelCls}>Status</div>
        <select
          className={inputCls}
          value={element.status}
          onChange={(e) => update((el) => { el.status = e.target.value as PlantStatus })}
        >
          <option value="planned">Planned</option>
          <option value="planted">Planted</option>
          <option value="growing">Growing</option>
          <option value="harvested">Harvested</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {/* Planted Date (visible when status !== planned) */}
      {element.status !== 'planned' && (
        <div className="mb-2">
          <div className={labelCls}>Planted Date</div>
          <input
            type="date"
            className={inputCls}
            value={element.plantedDate ?? ''}
            onChange={(e) => update((el) => { el.plantedDate = e.target.value || null })}
          />
        </div>
      )}

      {/* Quantity */}
      <div className="mb-2">
        <div className={labelCls}>Quantity</div>
        <input
          type="number"
          min={1}
          step={1}
          className={inputCls}
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
        <textarea
          className={inputCls + ' resize-y min-h-[60px]'}
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

function StructureInspector({ element }: { element: StructureElement }) {
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

      {/* Position (meters) */}
      <div className="mb-2">
        <div className={labelCls}>Position X (m)</div>
        <input
          type="number"
          step="0.01"
          className={inputCls}
          value={(element.x / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) update((el) => { el.x = v * 100 })
          }}
        />
      </div>
      <div className="mb-2">
        <div className={labelCls}>Position Y (m)</div>
        <input
          type="number"
          step="0.01"
          className={inputCls}
          value={(element.y / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) update((el) => { el.y = v * 100 })
          }}
        />
      </div>

      <div className={dividerCls} />

      {/* Dimensions (meters) */}
      <div className="mb-2">
        <div className={labelCls}>Width (m)</div>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className={inputCls}
          value={(element.width / 100).toFixed(2)}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v > 0) update((el) => { el.width = v * 100 })
          }}
        />
      </div>
      <div className="mb-2">
        <div className={labelCls}>Height (m)</div>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className={inputCls}
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
            className={`flex-1 px-2 py-1 text-xs rounded border ${element.shape === 'straight' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            onClick={() => update((el) => { el.shape = 'straight' as StructureShape })}
          >
            Straight
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs rounded border ${element.shape === 'curved' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
          <input
            type="number"
            step="1"
            className={inputCls}
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
        <input
          type="number"
          step="1"
          min="0"
          max="359"
          className={inputCls}
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
        <textarea
          className={inputCls + ' resize-y min-h-[60px]'}
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

function PathInspector({ element }: { element: PathElement }) {
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const pathType = registries.paths.find((p) => p.id === element.pathTypeId)

  const update = useCallback(
    (updater: (el: PathElement) => void) => {
      const proj = useProjectStore.getState().currentProject
      if (!proj) return
      const snapshot = structuredClone(proj)
      updateProject((draft) => {
        const el = draft.elements.find((e) => e.id === element.id)
        if (el && el.type === 'path') updater(el as PathElement)
      })
      pushHistory(snapshot)
    },
    [element.id, updateProject, pushHistory],
  )

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
        <input
          type="number"
          step="1"
          min="1"
          className={inputCls}
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
        <input
          type="checkbox"
          checked={element.closed}
          onChange={(e) => update((el) => { el.closed = e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className={labelCls + ' mb-0'}>Closed</span>
      </div>

      <ReadonlyField label="Points" value={String(element.points.length)} />

      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}

function LabelInspector({ element }: { element: LabelElement }) {
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
      updateProject((draft) => {
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
      updateProject((draft) => {
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
        <textarea
          className={inputCls + ' resize-y min-h-[60px]'}
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
        <input
          type="number"
          min={4}
          max={200}
          step={1}
          className={inputCls}
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
          className="w-full h-8 rounded border border-gray-200 cursor-pointer"
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
              className={`flex-1 px-2 py-1 text-xs rounded border ${element.textAlign === align ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
        <input
          type="checkbox"
          checked={element.bold}
          onChange={(e) => update((el) => { el.bold = e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className={labelCls + ' mb-0'}>Bold</span>
      </div>

      {/* Italic */}
      <div className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={element.italic}
          onChange={(e) => update((el) => { el.italic = e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className={labelCls + ' mb-0'}>Italic</span>
      </div>

      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}

function DimensionInspector({ element }: { element: DimensionElement }) {
  return (
    <div>
      <ReadonlyField label="Type" value="Dimension" />
      <div className={dividerCls} />
      <ReadonlyField
        label="Start Point"
        value={`(${(element.startPoint.x / 100).toFixed(2)}, ${(element.startPoint.y / 100).toFixed(2)}) m`}
      />
      <ReadonlyField
        label="End Point"
        value={`(${(element.endPoint.x / 100).toFixed(2)}, ${(element.endPoint.y / 100).toFixed(2)}) m`}
      />
      <div className={dividerCls} />
      <LayerDropdown element={element} />
      <LockedToggle element={element} />
      <InspectorExtensionSlots element={element} />
    </div>
  )
}

// ─── Element type label ─────────────────────────────────────────────────────

function elementTypeLabel(el: CanvasElement): string {
  switch (el.type) {
    case 'terrain': return 'Terrain'
    case 'plant': return 'Plant'
    case 'structure': return 'Structure'
    case 'path': return 'Path'
    case 'label': return 'Label'
    case 'dimension': return 'Dimension'
  }
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

function ElementInspector({ element }: { element: CanvasElement }) {
  switch (element.type) {
    case 'terrain':
      return <TerrainInspector element={element} />
    case 'plant':
      return <PlantInspector element={element} />
    case 'structure':
      return <StructureInspector element={element} />
    case 'path':
      return <PathInspector element={element} />
    case 'label':
      return <LabelInspector element={element} />
    case 'dimension':
      return <DimensionInspector element={element} />
  }
}

// ─── Multi-select Inspector ─────────────────────────────────────────────────

function MultiSelectInspector({
  primaryElement,
  selectedCount,
}: {
  primaryElement: CanvasElement
  selectedCount: number
}) {
  return (
    <div>
      <div className="mb-3 px-2 py-1.5 rounded bg-blue-50 text-xs font-semibold text-blue-700">
        {selectedCount} elements selected
      </div>

      {/* Show primary element type badge */}
      <div className="mb-3">
        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Primary: {elementTypeLabel(primaryElement)}
        </span>
      </div>

      {/* Show primary element's inspector (includes layer dropdown + locked toggle) */}
      <ElementInspector element={primaryElement} />
    </div>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export default function InspectorPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const selectedIds = useSelectionStore((s) => s.selectedIds)
  const primaryId = useSelectionStore((s) => s.primaryId)
  const project = useProjectStore((s) => s.currentProject)

  // Derive element from selection store's primaryId
  const element = project?.elements.find((el) => el.id === primaryId) ?? null
  const selectedCount = selectedIds.size

  return (
    <InspectorSlotsContext.Provider value={inspectorSlotRegistry}>
      <div
        className="flex flex-col bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden transition-all"
        style={{ width: collapsed ? 0 : 280 }}
      >
        {!collapsed && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Inspector
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="text-gray-400 hover:text-gray-600 text-sm"
                title="Collapse inspector"
              >
                ›
              </button>
            </div>

            {/* Content */}
            {element && selectedCount > 1 ? (
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <MultiSelectInspector
                  primaryElement={element}
                  selectedCount={selectedCount}
                />
              </div>
            ) : element ? (
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {/* Element type badge */}
                <div className="mb-3">
                  <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {elementTypeLabel(element)}
                  </span>
                </div>
                <ElementInspector element={element} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Nothing selected.
              </div>
            )}
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-full bg-white border-l border-gray-200 text-gray-500 hover:bg-gray-50"
            style={{ height: '100%', width: 16 }}
            title="Expand inspector"
          >
            ‹
          </button>
        )}
      </div>
    </InspectorSlotsContext.Provider>
  )
}
