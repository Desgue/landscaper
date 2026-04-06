// Selection priority constants for PLAN-C (selection tool) and PLAN-D
// Higher number = higher priority (wins in overlap)
export const SELECTION_PRIORITY = {
  yardBoundary: 0,
  terrain: 1,
  paths: 2,
  structures: 3,
  plants: 4,
  labels: 5,
  dimensions: 6,
} as const

export type SelectionLayer = keyof typeof SELECTION_PRIORITY
