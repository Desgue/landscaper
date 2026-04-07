/**
 * CostSummaryPanel.tsx — Modal overlay showing cost summary grouped by element type.
 * Accessible from Project Menu → "Cost Summary" and status bar button.
 */

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '../store/useProjectStore'
import { pathTotalLength } from '../canvas/geometry'

interface CostSummaryPanelProps {
  onClose: () => void
}

interface CostLineItem {
  typeName: string
  quantity: string
  cost: number
}

interface CostGroup {
  category: string
  items: CostLineItem[]
  subtotal: number
}

export default function CostSummaryPanel({ onClose }: CostSummaryPanelProps) {
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const currency = project?.currency ?? '$'

  const [includeHidden, setIncludeHidden] = useState(true)

  const costGroups = useMemo(() => {
    if (!project) return []

    const layers = project.layers
    const layerMap = new Map(layers.map((l) => [l.id, l]))

    // Filter elements by visibility if needed
    const elements = project.elements.filter((el) => {
      if (includeHidden) return true
      const layer = layerMap.get(el.layerId)
      return !layer || layer.visible
    })

    // Group by element type, then by specific type within each category
    const terrainCosts = new Map<string, { name: string; area: number; costPerUnit: number }>()
    const plantCosts = new Map<string, { name: string; quantity: number; costPerUnit: number }>()
    const structureCosts = new Map<string, { name: string; count: number; costPerUnit: number }>()
    const pathCosts = new Map<string, { name: string; lengthM: number; costPerUnit: number }>()

    for (const el of elements) {
      switch (el.type) {
        case 'terrain': {
          const type = registries.terrain.find((t) => t.id === el.terrainTypeId)
          if (!type?.costPerUnit) break
          const existing = terrainCosts.get(el.terrainTypeId)
          if (existing) {
            existing.area += 1
          } else {
            terrainCosts.set(el.terrainTypeId, {
              name: type.name,
              area: 1,
              costPerUnit: type.costPerUnit,
            })
          }
          break
        }
        case 'plant': {
          const type = registries.plants.find((p) => p.id === el.plantTypeId)
          if (!type?.costPerUnit) break
          const existing = plantCosts.get(el.plantTypeId)
          if (existing) {
            existing.quantity += el.quantity
          } else {
            plantCosts.set(el.plantTypeId, {
              name: type.name,
              quantity: el.quantity,
              costPerUnit: type.costPerUnit,
            })
          }
          break
        }
        case 'structure': {
          const type = registries.structures.find((s) => s.id === el.structureTypeId)
          if (!type?.costPerUnit) break
          const existing = structureCosts.get(el.structureTypeId)
          if (existing) {
            existing.count += 1
          } else {
            structureCosts.set(el.structureTypeId, {
              name: type.name,
              count: 1,
              costPerUnit: type.costPerUnit,
            })
          }
          break
        }
        case 'path': {
          const type = registries.paths.find((p) => p.id === el.pathTypeId)
          if (!type?.costPerUnit) break
          const lengthM = pathTotalLength(el) / 100
          const existing = pathCosts.get(el.pathTypeId)
          if (existing) {
            existing.lengthM += lengthM
          } else {
            pathCosts.set(el.pathTypeId, {
              name: type.name,
              lengthM,
              costPerUnit: type.costPerUnit,
            })
          }
          break
        }
      }
    }

    const groups: CostGroup[] = []

    // Terrain
    if (terrainCosts.size > 0) {
      const items: CostLineItem[] = []
      let subtotal = 0
      for (const [, v] of terrainCosts) {
        const cost = v.area * v.costPerUnit
        subtotal += cost
        items.push({ typeName: v.name, quantity: `${v.area.toFixed(1)} m²`, cost })
      }
      groups.push({ category: 'Terrain', items, subtotal })
    }

    // Plants
    if (plantCosts.size > 0) {
      const items: CostLineItem[] = []
      let subtotal = 0
      for (const [, v] of plantCosts) {
        const cost = v.quantity * v.costPerUnit
        subtotal += cost
        items.push({ typeName: v.name, quantity: `× ${v.quantity}`, cost })
      }
      groups.push({ category: 'Plants', items, subtotal })
    }

    // Structures
    if (structureCosts.size > 0) {
      const items: CostLineItem[] = []
      let subtotal = 0
      for (const [, v] of structureCosts) {
        const cost = v.count * v.costPerUnit
        subtotal += cost
        items.push({ typeName: v.name, quantity: `× ${v.count}`, cost })
      }
      groups.push({ category: 'Structures', items, subtotal })
    }

    // Paths
    if (pathCosts.size > 0) {
      const items: CostLineItem[] = []
      let subtotal = 0
      for (const [, v] of pathCosts) {
        const cost = v.lengthM * v.costPerUnit
        subtotal += cost
        items.push({ typeName: v.name, quantity: `${v.lengthM.toFixed(1)} m`, cost })
      }
      groups.push({ category: 'Paths', items, subtotal })
    }

    return groups
  }, [project, registries, includeHidden])

  const grandTotal = costGroups.reduce((sum, g) => sum + g.subtotal, 0)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Cost Summary</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {costGroups.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              No cost data. Set costPerUnit on registry types to see costs.
            </div>
          ) : (
            <div className="space-y-4">
              {costGroups.map((group) => (
                <div key={group.category}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {group.category}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item, i) => (
                      <div key={i} className="flex items-center text-sm">
                        <span className="flex-1 text-gray-700">{item.typeName}</span>
                        <span className="text-gray-400 text-xs w-20 text-right mr-3">
                          {item.quantity}
                        </span>
                        <span className="font-medium text-gray-800 w-24 text-right">
                          {currency}{item.cost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include hidden layers
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {currency}{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
