/**
 * CostPanel.tsx — Inspector extension slot for per-element cost display.
 * Registered into inspector:cost slot.
 * Cost is read-only; derived from registry costPerUnit fields.
 * When multiple elements are selected, shows combined cost.
 */

import type { CanvasElement } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { pathTotalLength } from '../canvas/geometry'

const readonlyCls = 'rounded border border-gray-100 bg-gray-50 px-2 py-1 text-sm w-full text-gray-600'

/**
 * Compute cost for a single element given its registry type.
 * Returns { cost, formula } or null if no cost applies.
 */
export function computeElementCost(
  element: CanvasElement,
  registries: ReturnType<typeof useProjectStore.getState>['registries'],
): { cost: number; formula: string } | null {
  switch (element.type) {
    case 'terrain': {
      const type = registries.terrain.find((t) => t.id === element.terrainTypeId)
      if (!type?.costPerUnit) return null
      const cost = type.costPerUnit
      return { cost, formula: `1 m² × ${type.costPerUnit.toFixed(2)}/m²` }
    }
    case 'plant': {
      const type = registries.plants.find((p) => p.id === element.plantTypeId)
      if (!type?.costPerUnit) return null
      const cost = type.costPerUnit * element.quantity
      return { cost, formula: `${element.quantity} × ${type.costPerUnit.toFixed(2)}/plant` }
    }
    case 'structure': {
      const type = registries.structures.find((s) => s.id === element.structureTypeId)
      if (!type?.costPerUnit) return null
      return { cost: type.costPerUnit, formula: `${type.costPerUnit.toFixed(2)}/structure` }
    }
    case 'path': {
      const type = registries.paths.find((p) => p.id === element.pathTypeId)
      if (!type?.costPerUnit) return null
      const lengthM = pathTotalLength(element) / 100
      const cost = type.costPerUnit * lengthM
      return { cost, formula: `${lengthM.toFixed(1)} m × ${type.costPerUnit.toFixed(2)}/m` }
    }
    default:
      return null
  }
}

export default function CostPanel({ element }: { element: CanvasElement }) {
  const registries = useProjectStore((s) => s.registries)
  const currency = useProjectStore((s) => s.currentProject?.currency ?? '$')
  const selectedIds = useSelectionStore((s) => s.selectedIds)
  const project = useProjectStore((s) => s.currentProject)

  // Multi-select: sum costs of all selected elements
  if (selectedIds.size > 1 && project) {
    let totalCost = 0
    let hasCost = false
    for (const el of project.elements) {
      if (selectedIds.has(el.id)) {
        const r = computeElementCost(el, registries)
        if (r) {
          totalCost += r.cost
          hasCost = true
        }
      }
    }
    if (!hasCost) return null
    return (
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Cost</div>
        <div className="mb-1">
          <div className={readonlyCls + ' font-semibold text-gray-800'}>
            {currency}{totalCost.toFixed(2)}
          </div>
        </div>
        <div className="text-xs text-gray-400">{selectedIds.size} elements combined</div>
      </div>
    )
  }

  // Single element
  const result = computeElementCost(element, registries)
  if (!result) return null

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Cost</div>
      <div className="mb-1">
        <div className={readonlyCls + ' font-semibold text-gray-800'}>
          {currency}{result.cost.toFixed(2)}
        </div>
      </div>
      <div className="text-xs text-gray-400">{result.formula}</div>
    </div>
  )
}
