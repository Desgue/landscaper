import { useState, useCallback, useRef, useContext } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import {
  inspectorSlotRegistry,
  InspectorSlotsContext,
} from './inspectorSlots'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const labelCls = 'text-xs text-[var(--ls-text-tertiary)] font-medium mb-0.5'
const readonlyCls = 'rounded border border-[var(--ls-border-subtle)] bg-[var(--ls-surface-panel)] px-2 py-1 text-sm w-full text-[var(--ls-text-secondary)]'
const dividerCls = 'border-t border-[var(--ls-border-subtle)] my-3'

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

function LockedToggle({ element }: { element: CanvasElement }) {
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)

  const handleChange = useCallback(
    (locked: boolean) => {
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

function DimensionInspector({ element }: { element: DimensionElement }) {
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
      updateProject((draft) => {
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
      <div className="mb-3 px-2 py-1.5 rounded bg-[var(--ls-color-interactive-subtle)] text-xs font-semibold text-[var(--ls-color-interactive)]">
        {selectedCount} elements selected
      </div>

      {/* Show primary element type badge */}
      <div className="mb-3">
        <span className="inline-block px-2 py-0.5 rounded bg-[var(--ls-surface-panel-header)] text-xs font-semibold text-[var(--ls-text-secondary)] uppercase tracking-wide">
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
        className="flex flex-col border-l flex-shrink-0 overflow-hidden transition-all"
        style={{ width: collapsed ? 0 : 280, background: 'var(--ls-surface-panel)', borderColor: 'var(--ls-border-subtle)' }}
      >
        {!collapsed && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ls-border-subtle)] flex-shrink-0">
              <span className="text-xs font-semibold text-[var(--ls-text-primary)] uppercase tracking-wide">
                Inspector
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="text-[var(--ls-text-disabled)] hover:text-[var(--ls-text-secondary)] text-sm"
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
                  <span className="inline-block px-2 py-0.5 rounded bg-[var(--ls-surface-panel-header)] text-xs font-semibold text-[var(--ls-text-secondary)] uppercase tracking-wide">
                    {elementTypeLabel(element)}
                  </span>
                </div>
                <ElementInspector element={element} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--ls-text-disabled)]">
                Nothing selected.
              </div>
            )}
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-full border-l border-[var(--ls-border-subtle)] text-[var(--ls-text-tertiary)] hover:bg-[var(--ls-surface-panel-header)]"
            style={{ height: '100%', width: 16, background: 'var(--ls-surface-panel)' }}
            title="Expand inspector"
          >
            ‹
          </button>
        )}
      </div>
    </InspectorSlotsContext.Provider>
  )
}
