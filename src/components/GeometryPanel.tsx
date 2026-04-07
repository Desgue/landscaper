/**
 * GeometryPanel.tsx — Inspector extension slot for geometry info (area, perimeter, material estimates).
 * Registered into inspector:geometry slot.
 */

import { useState } from 'react'
import type { CanvasElement, PathElement, TerrainElement } from '../types/schema'
import { useProjectStore } from '../store/useProjectStore'
import {
  getElementAreaM2,
  getElementPerimeterM,
  pathTotalLength,
  pathArea,
  pathMaterialArea,
  materialVolume,
  aggregateTerrainArea,
  polygonPerimeter,
} from '../canvas/geometry'

const labelCls = 'text-xs text-gray-500 font-medium mb-0.5'
const readonlyCls = 'rounded border border-gray-100 bg-gray-50 px-2 py-1 text-sm w-full text-gray-600'

// Default depth values per terrain type category (cm)
const DEFAULT_DEPTH: Record<string, number> = {
  natural: 0,
  hardscape: 0,
  water: 0,
  other: 8,
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className={labelCls}>{label}</div>
      <div className={readonlyCls}>{value}</div>
    </div>
  )
}

function TerrainGeometry({ element }: { element: TerrainElement }) {
  const registries = useProjectStore((s) => s.registries)
  const project = useProjectStore((s) => s.currentProject)
  const terrainType = registries.terrain.find((t) => t.id === element.terrainTypeId)
  const category = terrainType?.category ?? 'other'

  // Aggregate area for same terrain type
  const totalArea = project ? aggregateTerrainArea(project.elements, element.terrainTypeId) : 1

  // Transient depth field — reset when element changes
  const defaultDepth = DEFAULT_DEPTH[category] ?? 8
  const [depthKey, setDepthKey] = useState({ terrainTypeId: element.terrainTypeId, category })
  const [depthCm, setDepthCm] = useState(defaultDepth)

  if (depthKey.terrainTypeId !== element.terrainTypeId || depthKey.category !== category) {
    setDepthKey({ terrainTypeId: element.terrainTypeId, category })
    setDepthCm(defaultDepth)
  }

  const volumeM3 = materialVolume(totalArea, depthCm)
  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Geometry</div>
      <ReadonlyField label="Area" value={`${totalArea.toFixed(2)} m²`} />
      <ReadonlyField label="Cell Perimeter" value="4.00 m" />
      <div className="mb-2">
        <div className={labelCls}>Depth (cm)</div>
        <input
          type="number"
          min={0}
          step={1}
          className="rounded border border-gray-200 px-2 py-1 text-sm w-full"
          value={depthCm}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (isFinite(v) && v >= 0) setDepthCm(v)
          }}
        />
      </div>
      {depthCm > 0 && (
        <ReadonlyField label="Volume" value={`${volumeM3.toFixed(3)} m³`} />
      )}
    </div>
  )
}

function PathGeometry({ element }: { element: PathElement }) {
  const lengthM = pathTotalLength(element) / 100
  const widthM = element.strokeWidthCm / 100

  if (element.closed) {
    // Closed paths show polygon area (Shoelace) and perimeter
    const closedAreaM2 = pathArea(element) / 10000
    const perimeterM = polygonPerimeter(element.points) / 100

    return (
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Geometry</div>
        <ReadonlyField label="Area" value={`${closedAreaM2.toFixed(2)} m²`} />
        <ReadonlyField label="Perimeter" value={`${perimeterM.toFixed(2)} m`} />
      </div>
    )
  }

  // Open paths show material estimate: length, width, stroke area
  const strokeAreaM2 = pathMaterialArea(element)

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Geometry</div>
      <ReadonlyField label="Length" value={`${lengthM.toFixed(2)} m`} />
      <ReadonlyField label="Width" value={`${widthM.toFixed(2)} m`} />
      <ReadonlyField label="Area" value={`${strokeAreaM2.toFixed(2)} m²`} />
    </div>
  )
}

function StructureGeometry({ element }: { element: CanvasElement }) {
  const area = getElementAreaM2(element)
  const perimeter = getElementPerimeterM(element)

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Geometry</div>
      {area !== null && <ReadonlyField label="Area" value={`${area.toFixed(2)} m²`} />}
      {perimeter !== null && <ReadonlyField label="Perimeter" value={`${perimeter.toFixed(2)} m`} />}
    </div>
  )
}

export default function GeometryPanel({ element }: { element: CanvasElement }) {
  switch (element.type) {
    case 'terrain':
      return <TerrainGeometry element={element} />
    case 'path':
      return <PathGeometry element={element} />
    case 'structure':
      return <StructureGeometry element={element} />
    default:
      return null
  }
}
