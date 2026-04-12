/**
 * PlacementHandlers — Barrel re-export for per-handler modules.
 *
 * Each handler factory and its associated types live in their own file under
 * `handlers/`. This module re-exports everything so existing imports continue
 * to work without change.
 *
 * Handler files:
 *   - handlers/StructurePlacementHandler.ts  (structure + arc tool)
 *   - handlers/PlantPlacementHandler.ts      (plant placement)
 *   - handlers/LabelPlacementHandler.ts      (label placement + edit)
 *   - handlers/MeasurementHandler.ts         (measurement tool)
 */

export type {
  StructurePlacementHandle,
  StructureGhostState,
} from './handlers/StructurePlacementHandler'
export { createStructurePlacementHandler } from './handlers/StructurePlacementHandler'

export type { PlantPlacementHandle } from './handlers/PlantPlacementHandler'
export { createPlantPlacementHandler } from './handlers/PlantPlacementHandler'

export type { LabelPlacementHandle } from './handlers/LabelPlacementHandler'
export { createLabelPlacementHandler } from './handlers/LabelPlacementHandler'

export type { MeasurementHandle } from './handlers/MeasurementHandler'
export { createMeasurementHandler } from './handlers/MeasurementHandler'
