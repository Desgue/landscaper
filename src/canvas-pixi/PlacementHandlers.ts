/**
 * PlacementHandlers — Element placement tool handlers for PixiJS Phase 4.
 *
 * Covers:
 *   - Structure placement (2-click drag, ghost preview)
 *   - Arc tool (3-step: start → end → curvature)
 *   - Plant placement (click-to-place with collision)
 *   - Label placement (click-to-create, enter edit mode)
 *   - Measurement tool (2-click dimension line)
 *
 * All handlers are framework-agnostic (no PixiJS imports) — they only
 * mutate Zustand stores and return placement state for ghost preview rendering.
 */

import type {
  StructureElement, PlantElement, LabelElement,
  StructureType, PlantType, Vec2,
} from '../types/schema'
import { createLogger } from '../utils/logger'
import { snapPoint } from '../snap/snapSystem'
import { arcAABB } from '../canvas/arcGeometry'
import { commitProjectUpdate } from '../store/projectActions'
import type { RendererHandle } from './BaseRenderer'
import type { CanvasContext } from './CanvasContext'

// ---------------------------------------------------------------------------
// Structure collision helper
// ---------------------------------------------------------------------------

const log = createLogger('PlacementHandlers')

const BLOCKING_CATEGORIES = new Set(['boundary', 'feature', 'furniture'])

function hasStructureCollision(
  newX: number, newY: number, newW: number, newH: number,
  existingStructures: StructureElement[],
  structureRegistry: StructureType[],
): boolean {
  for (const s of existingStructures) {
    const st = structureRegistry.find((r) => r.id === s.structureTypeId)
    if (!st) continue
    if (!BLOCKING_CATEGORIES.has(st.category)) continue
    if (newX < s.x + s.width && newX + newW > s.x && newY < s.y + s.height && newY + newH > s.y) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Plant collision helpers
// ---------------------------------------------------------------------------

function hasSpacingCollision(
  worldX: number, worldY: number, newSpacingCm: number,
  existingPlants: PlantElement[], plantTypes: PlantType[],
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

function hasPlantStructureCollision(
  worldX: number, worldY: number,
  structures: StructureElement[],
  structureRegistry: Array<{ id: string; category: string }>,
): boolean {
  for (const s of structures) {
    const st = structureRegistry.find((r) => r.id === s.structureTypeId)
    if (!st) continue
    if (!BLOCKING_CATEGORIES.has(st.category)) continue
    if (worldX >= s.x && worldX <= s.x + s.width && worldY >= s.y && worldY <= s.y + s.height) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Snap helper
// ---------------------------------------------------------------------------

function snapWorld(
  worldX: number, worldY: number, context: 'place' | 'label' | 'measurement',
  altKey: boolean,
  ctx: CanvasContext,
): { x: number; y: number } {
  const proj = ctx.getProject()
  if (!proj) return { x: worldX, y: worldY }
  const zoom = ctx.getZoom()
  const result = snapPoint(
    worldX, worldY, context, proj.elements, zoom,
    proj.gridConfig.snapIncrementCm,
    proj.uiState.snapEnabled, altKey,
  )
  return { x: result.x, y: result.y }
}

// ---------------------------------------------------------------------------
// Arc helpers
// ---------------------------------------------------------------------------

function arcToRect(
  p1: Vec2, p2: Vec2, sagitta: number, depthCm: number,
): { x: number; y: number; width: number; height: number } {
  const ab = arcAABB(p1, p2, sagitta)
  const w = Math.max(ab.maxX - ab.minX, depthCm)
  const h = Math.max(ab.maxY - ab.minY, depthCm)
  return { x: ab.minX, y: ab.minY, width: w, height: h }
}

// ===========================================================================
// Structure Placement Handler
// ===========================================================================

export interface StructurePlacementHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number, altKey: boolean, isArcTool: boolean): void
  onPointerMove(worldX: number, worldY: number, altKey: boolean, isArcTool: boolean): void
  /** Ghost preview state for rendering. */
  getGhostState(): StructureGhostState | null
}

export interface StructureGhostState {
  x: number; y: number; width: number; height: number
  blocked: boolean
  /** Arc preview (arc tool only). */
  arcPreview?: { p1: Vec2; p2: Vec2; sagitta: number } | null
}

interface PlacingState {
  anchorX: number
  anchorY: number
}

export function createStructurePlacementHandler(ctx: CanvasContext): StructurePlacementHandle {
  let placing: PlacingState | null = null
  let arcAnchor: Vec2 | null = null
  let arcPlacing: { p1: Vec2; p2: Vec2; sagitta: number } | null = null
  let ghost: StructureGhostState | null = null

  function computeRect(
    anchor: PlacingState, current: Vec2, structureType: StructureType,
  ): { x: number; y: number; width: number; height: number } {
    const dx = current.x - anchor.anchorX
    const dy = current.y - anchor.anchorY
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const w = structureType.defaultWidthCm
      const h = structureType.defaultDepthCm
      return { x: anchor.anchorX - w / 2, y: anchor.anchorY - h / 2, width: w, height: h }
    }
    return {
      x: dx >= 0 ? anchor.anchorX : current.x,
      y: dy >= 0 ? anchor.anchorY : current.y,
      width: Math.abs(dx),
      height: Math.abs(dy),
    }
  }

  function commitStructure(
    rect: { x: number; y: number; width: number; height: number },
    shape: 'straight' | 'curved',
    sagitta: number | null,
  ): void {
    const proj = ctx.getProject()
    const selectedStructureTypeId = ctx.getToolState().selectedStructureTypeId
    if (!proj || !selectedStructureTypeId) return
    const regs = ctx.getRegistries()
    const existingStructures = proj.elements.filter(
      (el): el is StructureElement => el.type === 'structure',
    )
    if (hasStructureCollision(rect.x, rect.y, rect.width, rect.height, existingStructures, regs.structures)) {
      log.debug('structure placement rejected: collision', { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
      return
    }
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const layerId = proj.layers[0]?.id ?? 'default'
    commitProjectUpdate('placeStructure', (draft) => {
      draft.elements.push({
        id, type: 'structure', structureTypeId: selectedStructureTypeId,
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        rotation: 0, zIndex: 0, locked: false, layerId, groupId: null,
        createdAt: now, updatedAt: now, shape, arcSagitta: sagitta, notes: null,
      } satisfies StructureElement)
    })
    ctx.setInspectedElement(id)
  }

  return {
    onPointerDown(worldX: number, worldY: number, altKey: boolean, isArcTool: boolean): void {
      const selectedStructureTypeId = ctx.getToolState().selectedStructureTypeId
      if (!selectedStructureTypeId) return
      const proj = ctx.getProject()
      if (!proj) return
      const regs = ctx.getRegistries()
      const structureType = regs.structures.find((s) => s.id === selectedStructureTypeId)
      if (!structureType) return
      const snapped = snapWorld(worldX, worldY, 'place', altKey, ctx)

      // Arc tool: 3-step
      if (isArcTool) {
        if (!arcAnchor) {
          arcAnchor = snapped
          return
        }
        if (!arcPlacing) {
          arcPlacing = { p1: arcAnchor, p2: snapped, sagitta: 0 }
          ghost = { x: 0, y: 0, width: 0, height: 0, blocked: false, arcPreview: arcPlacing }
          return
        }
        // Step 3: commit
        const { p1, p2, sagitta } = arcPlacing
        const depthCm = structureType.defaultDepthCm
        const isCurved = Math.abs(sagitta) > 1
        const rect = arcToRect(p1, p2, sagitta, depthCm)
        commitStructure(rect, isCurved ? 'curved' : 'straight', isCurved ? sagitta : null)
        arcPlacing = null
        arcAnchor = null
        ghost = null
        return
      }

      // Structure tool: 2-click
      if (!placing) {
        placing = { anchorX: snapped.x, anchorY: snapped.y }
        const w = structureType.defaultWidthCm
        const h = structureType.defaultDepthCm
        const existingStructures = proj.elements.filter(
          (el): el is StructureElement => el.type === 'structure',
        )
        const blocked = hasStructureCollision(
          snapped.x - w / 2, snapped.y - h / 2, w, h, existingStructures, regs.structures,
        )
        ghost = { x: snapped.x - w / 2, y: snapped.y - h / 2, width: w, height: h, blocked }
      } else {
        const rect = computeRect(placing, snapped, structureType)
        commitStructure(rect, 'straight', null)
        placing = null
        ghost = null
      }
    },

    onPointerMove(worldX: number, worldY: number, altKey: boolean, isArcTool: boolean): void {
      const selectedStructureTypeId = ctx.getToolState().selectedStructureTypeId
      if (!selectedStructureTypeId) return
      const snapped = snapWorld(worldX, worldY, 'place', altKey, ctx)

      // Arc tool curvature adjustment (step 3)
      if (isArcTool && arcPlacing) {
        const { p1, p2 } = arcPlacing
        const chordDx = p2.x - p1.x, chordDy = p2.y - p1.y
        const chordLen = Math.sqrt(chordDx * chordDx + chordDy * chordDy)
        if (chordLen > 1e-6) {
          const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
          const perpX = -chordDy / chordLen, perpY = chordDx / chordLen
          const sagitta = (snapped.x - midX) * perpX + (snapped.y - midY) * perpY
          arcPlacing.sagitta = sagitta
          ghost = { x: 0, y: 0, width: 0, height: 0, blocked: false, arcPreview: { ...arcPlacing } }
        }
        return
      }

      // Arc tool: preview line (step 2)
      if (isArcTool && arcAnchor && !arcPlacing) {
        ghost = { x: 0, y: 0, width: 0, height: 0, blocked: false, arcPreview: { p1: arcAnchor, p2: snapped, sagitta: 0 } }
        return
      }

      // Structure ghost preview
      if (!placing) return
      const proj = ctx.getProject()
      if (!proj) return
      const regs = ctx.getRegistries()
      const structureType = regs.structures.find((s) => s.id === selectedStructureTypeId)
      if (!structureType) return
      const rect = computeRect(placing, snapped, structureType)
      const existingStructures = proj.elements.filter(
        (el): el is StructureElement => el.type === 'structure',
      )
      const blocked = hasStructureCollision(
        rect.x, rect.y, rect.width, rect.height, existingStructures, regs.structures,
      )
      ghost = { ...rect, blocked }
    },

    getGhostState(): StructureGhostState | null {
      return ghost
    },

    update(): void {},
    destroy(): void {
      placing = null
      arcAnchor = null
      arcPlacing = null
      ghost = null
    },
  }
}

// ===========================================================================
// Plant Placement Handler
// ===========================================================================

export interface PlantPlacementHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number, altKey: boolean): void
}

export function createPlantPlacementHandler(ctx: CanvasContext): PlantPlacementHandle {
  return {
    onPointerDown(worldX: number, worldY: number, altKey: boolean): void {
      const selectedPlantTypeId = ctx.getToolState().selectedPlantTypeId
      if (!selectedPlantTypeId) return
      const proj = ctx.getProject()
      if (!proj) return
      const regs = ctx.getRegistries()
      const plantType = regs.plants.find((p) => p.id === selectedPlantTypeId)
      if (!plantType) return

      const snapped = snapWorld(worldX, worldY, 'place', altKey, ctx)

      // Collision checks
      const existingPlants = proj.elements.filter((el): el is PlantElement => el.type === 'plant')
      if (hasSpacingCollision(snapped.x, snapped.y, plantType.spacingCm, existingPlants, regs.plants)) {
        log.debug('plant placement rejected: spacing collision', { x: snapped.x, y: snapped.y, spacingCm: plantType.spacingCm })
        ctx.showPlacementFeedback('Too close to another plant')
        return
      }
      const structures = proj.elements.filter((el): el is StructureElement => el.type === 'structure')
      if (hasPlantStructureCollision(snapped.x, snapped.y, structures, regs.structures)) {
        log.debug('plant placement rejected: structure collision', { x: snapped.x, y: snapped.y })
        ctx.showPlacementFeedback('Can\'t place on a structure')
        return
      }

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      commitProjectUpdate('placePlant', (draft) => {
        draft.elements.push({
          id, type: 'plant', plantTypeId: selectedPlantTypeId,
          x: snapped.x, y: snapped.y,
          width: plantType.spacingCm, height: plantType.spacingCm,
          rotation: 0, zIndex: 0, locked: false, layerId, groupId: null,
          createdAt: now, updatedAt: now,
          quantity: 1, status: 'planned', plantedDate: null, notes: null,
        } satisfies PlantElement)
      })
      ctx.setInspectedElement(id)
    },

    update(): void {},
    destroy(): void {},
  }
}

// ===========================================================================
// Label Placement Handler
// ===========================================================================

export interface LabelPlacementHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number): void
  onDblClick(worldX: number, worldY: number): void
}

export function createLabelPlacementHandler(ctx: CanvasContext): LabelPlacementHandle {
  return {
    onPointerDown(worldX: number, worldY: number): void {
      if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return
      const proj = ctx.getProject()
      if (!proj) return
      const { editingLabelId } = ctx.getToolState()
      if (editingLabelId) return

      // Check if clicking on existing label — don't create new one
      const existingLabel = proj.elements.find(
        (el) =>
          el.type === 'label' &&
          worldX >= el.x && worldX <= el.x + el.width &&
          worldY >= el.y && worldY <= el.y + el.height,
      )
      if (existingLabel) return

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const layerId = proj.layers[0]?.id ?? 'default'

      commitProjectUpdate('placeLabel', (draft) => {
        draft.elements.push({
          id, type: 'label', text: 'Text', fontSize: 16,
          fontColor: '#000000', fontFamily: 'sans-serif',
          textAlign: 'left', bold: false, italic: false,
          x: worldX, y: worldY, width: 200, height: 50,
          rotation: 0, zIndex: 0, locked: false, layerId, groupId: null,
          createdAt: now, updatedAt: now,
        } satisfies LabelElement)
      })
      ctx.setLabelEditing(id)
    },

    onDblClick(worldX: number, worldY: number): void {
      if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return
      const proj = ctx.getProject()
      if (!proj) return

      // Double-click on existing label to edit
      const clickedLabel = proj.elements.find(
        (el) =>
          el.type === 'label' &&
          worldX >= el.x && worldX <= el.x + el.width &&
          worldY >= el.y && worldY <= el.y + el.height,
      )
      if (clickedLabel) {
        ctx.setLabelEditing(clickedLabel.id)
      }
    },

    update(): void {},
    destroy(): void {},
  }
}

// ===========================================================================
// Measurement Tool Handler
// ===========================================================================

export interface MeasurementHandle extends RendererHandle {
  onPointerDown(worldX: number, worldY: number, altKey: boolean): void
  onPointerMove(worldX: number, worldY: number, altKey: boolean): void
}

export function createMeasurementHandler(ctx: CanvasContext): MeasurementHandle {
  return {
    onPointerDown(worldX: number, worldY: number, altKey: boolean): void {
      const store = ctx.getMeasurementState()
      const snapped = snapWorld(worldX, worldY, 'measurement', altKey, ctx)

      if (store.phase === 'idle') {
        ctx.setMeasurementState({
          phase: 'first_placed',
          startPoint: snapped,
          endPoint: null,
          livePoint: snapped,
        })
      } else if (store.phase === 'first_placed') {
        ctx.setMeasurementState({
          phase: 'completed',
          endPoint: snapped,
          livePoint: null,
        })
      }
    },

    onPointerMove(worldX: number, worldY: number, altKey: boolean): void {
      if (ctx.getMeasurementState().phase !== 'first_placed') return
      const snapped = snapWorld(worldX, worldY, 'measurement', altKey, ctx)
      ctx.setMeasurementState({ livePoint: snapped })
    },

    update(): void {},
    destroy(): void {},
  }
}
