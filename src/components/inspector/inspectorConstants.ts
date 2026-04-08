import { useContext } from 'react'
import { InspectorSlotsContext } from '../inspectorSlots'

export function useInspectorSlots() {
  return useContext(InspectorSlotsContext)
}

// ─── Shared style constants ─────────────────────────────────────────────────

export const labelCls = 'text-xs text-[var(--ls-text-tertiary)] font-medium mb-0.5'
export const readonlyCls = 'rounded border border-[var(--ls-border-subtle)] bg-[var(--ls-surface-panel)] px-2 py-1 text-sm w-full text-[var(--ls-text-secondary)]'
export const dividerCls = 'border-t border-[var(--ls-border-subtle)] my-3'
