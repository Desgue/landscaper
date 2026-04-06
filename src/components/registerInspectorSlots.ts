/**
 * registerInspectorSlots.ts — Registers all inspector extension slot components.
 * Import this module at app startup to populate the inspector slot registry.
 */

import { registerInspectorSection } from './inspectorSlots'
import GeometryPanel from './GeometryPanel'
import CostPanel from './CostPanel'
import JournalLinksPanel from './JournalLinksPanel'

registerInspectorSection('inspector:geometry', GeometryPanel)
registerInspectorSection('inspector:cost', CostPanel)
registerInspectorSection('inspector:journal', JournalLinksPanel)
