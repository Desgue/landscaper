import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useSelectionStore } from '../store/useSelectionStore'
import {
  inspectorSlotRegistry,
  InspectorSlotsContext,
} from './inspectorSlots'
import type { CanvasElement } from '../types/schema'
import { TerrainInspector } from './inspector/TerrainInspector'
import { PlantInspector } from './inspector/PlantInspector'
import { StructureInspector } from './inspector/StructureInspector'
import { PathInspector } from './inspector/PathInspector'
import { LabelInspector } from './inspector/LabelInspector'
import { DimensionInspector } from './inspector/DimensionInspector'

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
