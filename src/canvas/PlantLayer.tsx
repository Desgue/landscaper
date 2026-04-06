/**
 * PlantLayer — Konva layer for plant placement and rendering.
 *
 * Phase B2 of PLAN-B. Implements:
 *   - Rendering plant elements as circles (herb, tree, shrub, groundcover, climber)
 *   - Plant tool (activeTool === 'plant'): click to stamp plants
 *   - Spacing collision detection (plant-to-plant)
 *   - Structure collision detection (blocks placement on certain categories)
 *
 * All coordinates are world units (centimeters). Y-axis points DOWN.
 */

import { useCallback } from 'react'
import { create } from 'zustand'
import { Layer, Rect, Circle, Group, Text } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useToolStore } from '../store/useToolStore'
import { useViewportStore } from '../store/useViewportStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { snapPoint } from '../snap/snapSystem'
import type { PlantElement, PlantType, StructureElement } from '../types/schema'

// ─── Plant tool store ────────────────────────────────────────────────────────

interface PlantToolState {
  selectedPlantTypeId: string | null
  setSelectedPlantTypeId: (id: string) => void
}

export const usePlantToolStore = create<PlantToolState>((set) => ({
  selectedPlantTypeId: null,
  setSelectedPlantTypeId: (id: string) => set({ selectedPlantTypeId: id }),
}))

// ─── Category-based colors (PlantType has no color field) ────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  vegetable: '#4CAF50',
  herb: '#66BB6A',
  fruit: '#FF9800',
  flower: '#E91E63',
  tree: '#795548',
  shrub: '#8BC34A',
  other: '#9E9E9E',
}

function getPlantColor(plantType: PlantType): string {
  return CATEGORY_COLORS[plantType.category] ?? CATEGORY_COLORS['other']
}

// ─── PLAN-C/D interface contracts ────────────────────────────────────────────

/** Effective visual radius for a plant element (world cm). */
function effectiveRadius(_element: PlantElement, plantType: PlantType): number {
  switch (plantType.growthForm) {
    case 'tree':
      return (plantType.canopyWidthCm ?? plantType.spacingCm) / 2
    case 'shrub':
      return ((plantType.canopyWidthCm ?? plantType.spacingCm)) / 2
    case 'climber':
      return 15
    case 'groundcover':
    case 'herb':
    default:
      return plantType.spacingCm / 2
  }
}

/** Point-in-plant hit test (circle). */
export function hitTest(element: PlantElement, worldX: number, worldY: number): boolean {
  const registries = useProjectStore.getState().registries
  const plantType = registries.plants.find((p) => p.id === element.plantTypeId)
  if (!plantType) return false
  const r = effectiveRadius(element, plantType)
  const dx = element.x - worldX
  const dy = element.y - worldY
  return Math.sqrt(dx * dx + dy * dy) < r
}

/** Axis-aligned bounding box of a PlantElement. */
export function getAABB(element: PlantElement): { x: number; y: number; w: number; h: number } {
  const registries = useProjectStore.getState().registries
  const plantType = registries.plants.find((p) => p.id === element.plantTypeId)
  if (!plantType) return { x: element.x, y: element.y, w: 0, h: 0 }
  const r = effectiveRadius(element, plantType)
  return { x: element.x - r, y: element.y - r, w: r * 2, h: r * 2 }
}

// ─── Collision helpers ───────────────────────────────────────────────────────

/** Spacing collision: blocks placement if too close to another plant. */
function hasSpacingCollision(
  worldX: number,
  worldY: number,
  newSpacingCm: number,
  existingPlants: PlantElement[],
  plantTypes: PlantType[],
): boolean {
  for (const existing of existingPlants) {
    const pt = plantTypes.find((p) => p.id === existing.plantTypeId)
    if (!pt) continue
    const dx = existing.x - worldX
    const dy = existing.y - worldY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = (pt.spacingCm + newSpacingCm) / 2
    if (dist < minDist) return true
  }
  return false
}

/** Structure collision: blocks placement if inside a blocking structure. */
function hasStructureCollision(
  worldX: number,
  worldY: number,
  structures: StructureElement[],
  structureRegistry: Array<{ id: string; category: string }>,
): boolean {
  const BLOCKING_CATEGORIES = ['boundary', 'feature', 'furniture']
  for (const s of structures) {
    const st = structureRegistry.find((r) => r.id === s.structureTypeId)
    if (!st) continue
    // container and overhead allow plants
    if (!BLOCKING_CATEGORIES.includes(st.category)) continue
    // AABB check (rotation-aware would be more accurate, but MVP uses AABB)
    if (
      worldX >= s.x &&
      worldX <= s.x + s.width &&
      worldY >= s.y &&
      worldY <= s.y + s.height
    ) {
      return true
    }
  }
  return false
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PlantLayerProps {
  width: number
  height: number
}

export default function PlantLayer(_props: PlantLayerProps) {
  const project = useProjectStore((s) => s.currentProject)
  const registries = useProjectStore((s) => s.registries)
  const updateProject = useProjectStore((s) => s.updateProject)
  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const activeTool = useToolStore((s) => s.activeTool)
  const zoom = useViewportStore((s) => s.zoom)

  const selectedPlantTypeId = usePlantToolStore((s) => s.selectedPlantTypeId)

  const isPlantTool = activeTool === 'plant'
  const isActive = isPlantTool && selectedPlantTypeId !== null

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isActive || !selectedPlantTypeId) return
      if (e.evt.button !== 0) return

      const proj = useProjectStore.getState().currentProject
      if (!proj) return

      const regs = useProjectStore.getState().registries
      const plantType = regs.plants.find((p) => p.id === selectedPlantTypeId)
      if (!plantType) return

      const stage = e.target.getStage()
      if (!stage) return

      const worldPos = stage.getRelativePointerPosition()
      if (!worldPos) return

      // Snap: 10cm increment, snap ON by default, Alt disables
      // Read zoom fresh from store to avoid stale closure after zoom changes
      const currentZoom = useViewportStore.getState().zoom
      const altHeld = e.evt.altKey
      const snapped = snapPoint(
        worldPos.x,
        worldPos.y,
        'place',
        proj.elements,
        currentZoom,
        10,
        proj.uiState.snapEnabled,
        altHeld,
      )

      const sx = snapped.x
      const sy = snapped.y

      // Check spacing collision
      const existingPlants = proj.elements.filter(
        (el): el is PlantElement => el.type === 'plant',
      )
      if (hasSpacingCollision(sx, sy, plantType.spacingCm, existingPlants, regs.plants)) {
        return // blocked
      }

      // Check structure collision
      const structures = proj.elements.filter(
        (el): el is StructureElement => el.type === 'structure',
      )
      if (hasStructureCollision(sx, sy, structures, regs.structures)) {
        return // blocked
      }

      // Capture snapshot BEFORE mutation
      const snapshot = structuredClone(proj)

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      updateProject((draft) => {
        draft.elements.push({
          id,
          type: 'plant',
          plantTypeId: selectedPlantTypeId,
          x: sx,
          y: sy,
          width: plantType.spacingCm,
          height: plantType.spacingCm,
          rotation: 0,
          zIndex: 0,
          locked: false,
          layerId,
          groupId: null,
          createdAt: now,
          updatedAt: now,
          quantity: 1,
          status: 'planned',
          plantedDate: null,
          notes: null,
        } satisfies PlantElement)
      })

      pushHistory(snapshot)
      useInspectorStore.getState().setInspectedElementId(id)
    },
    [isActive, selectedPlantTypeId, updateProject, pushHistory],
  )

  if (!project) return null

  const plantElements = project.elements.filter(
    (el): el is PlantElement => el.type === 'plant',
  )

  return (
    <Layer listening={isActive}>
      {/* Transparent hit area for placement */}
      {isActive && (
        <Rect
          x={-50000}
          y={-50000}
          width={100000}
          height={100000}
          fill="rgba(0,0,0,0.001)"
          listening={true}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Render plant elements */}
      {plantElements.map((el) => {
        const plantType = registries.plants.find((p) => p.id === el.plantTypeId)
        if (!plantType) return null
        const color = getPlantColor(plantType)

        return (
          <PlantVisual
            key={el.id}
            element={el}
            plantType={plantType}
            color={color}
            zoom={zoom}
          />
        )
      })}
    </Layer>
  )
}

// ─── Plant visual sub-component ──────────────────────────────────────────────

interface PlantVisualProps {
  element: PlantElement
  plantType: PlantType
  color: string
  zoom: number
}

function PlantVisual({ element, plantType, color, zoom }: PlantVisualProps) {
  const minWorldRadius = 4 / zoom

  switch (plantType.growthForm) {
    case 'tree': {
      const canopyR = Math.max((plantType.canopyWidthCm ?? plantType.spacingCm) / 2, minWorldRadius)
      const trunkR = Math.max((plantType.trunkWidthCm ?? 20) / 2, minWorldRadius)
      return (
        <Group x={element.x} y={element.y} listening={false}>
          {/* Canopy (semi-transparent) */}
          <Circle
            radius={canopyR}
            fill={color}
            opacity={0.35}
          />
          {/* Trunk */}
          <Circle
            radius={trunkR}
            fill="#5D4037"
          />
          {/* Quantity badge */}
          {element.quantity > 1 && (
            <Text
              text={String(element.quantity)}
              fontSize={Math.max(12 / zoom, 8)}
              fill="#fff"
              fontStyle="bold"
              offsetX={Math.max(12 / zoom, 8) * 0.3}
              offsetY={Math.max(12 / zoom, 8) * 0.4}
            />
          )}
        </Group>
      )
    }

    case 'shrub': {
      const r = Math.max(((plantType.canopyWidthCm ?? plantType.spacingCm)) / 2, minWorldRadius)
      return (
        <Group x={element.x} y={element.y} listening={false}>
          <Circle radius={r} fill={color} />
          {element.quantity > 1 && (
            <Text
              text={String(element.quantity)}
              fontSize={Math.max(12 / zoom, 8)}
              fill="#fff"
              fontStyle="bold"
              offsetX={Math.max(12 / zoom, 8) * 0.3}
              offsetY={Math.max(12 / zoom, 8) * 0.4}
            />
          )}
        </Group>
      )
    }

    case 'groundcover': {
      const r = Math.max(plantType.spacingCm / 2, minWorldRadius)
      return (
        <Group x={element.x} y={element.y} listening={false}>
          <Circle radius={r} fill={color} opacity={0.6} />
          {element.quantity > 1 && (
            <Text
              text={String(element.quantity)}
              fontSize={Math.max(12 / zoom, 8)}
              fill="#fff"
              fontStyle="bold"
              offsetX={Math.max(12 / zoom, 8) * 0.3}
              offsetY={Math.max(12 / zoom, 8) * 0.4}
            />
          )}
        </Group>
      )
    }

    case 'climber': {
      const r = Math.max(15, minWorldRadius)
      return (
        <Group x={element.x} y={element.y} listening={false}>
          <Circle radius={r} fill={color} />
          {element.quantity > 1 && (
            <Text
              text={String(element.quantity)}
              fontSize={Math.max(12 / zoom, 8)}
              fill="#fff"
              fontStyle="bold"
              offsetX={Math.max(12 / zoom, 8) * 0.3}
              offsetY={Math.max(12 / zoom, 8) * 0.4}
            />
          )}
        </Group>
      )
    }

    case 'herb':
    default: {
      const r = Math.max(plantType.spacingCm / 2, minWorldRadius)
      return (
        <Group x={element.x} y={element.y} listening={false}>
          <Circle radius={r} fill={color} />
          {element.quantity > 1 && (
            <Text
              text={String(element.quantity)}
              fontSize={Math.max(12 / zoom, 8)}
              fill="#fff"
              fontStyle="bold"
              offsetX={Math.max(12 / zoom, 8) * 0.3}
              offsetY={Math.max(12 / zoom, 8) * 0.4}
            />
          )}
        </Group>
      )
    }
  }
}
