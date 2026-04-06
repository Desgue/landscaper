import { createContext } from 'react'
import type { CanvasElement } from '../types/schema'

export type InspectorSlotComponent = React.ComponentType<{ element: CanvasElement }>

export const inspectorSlotRegistry = new Map<string, InspectorSlotComponent>()

/**
 * Register a component to render in a named inspector slot.
 * Call at module scope or in an effect before the panel mounts.
 *
 * Pre-defined slot names (empty until later phases):
 *   - inspector:cost
 *   - inspector:geometry
 *   - inspector:journal
 */
export function registerInspectorSection(
  slotName: string,
  component: InspectorSlotComponent,
): void {
  inspectorSlotRegistry.set(slotName, component)
}

export const InspectorSlotsContext = createContext<Map<string, InspectorSlotComponent>>(
  inspectorSlotRegistry,
)
