# Garden Planner — Implementation Plan (Coordination)

> **AI-First Coordination Document.** This file maps the full build across 6 parallel sub-plans.
> Agents working on a sub-plan open only that plan's file — not this one.
> This file is the entry point for orchestrators and for understanding cross-plan contracts.

---

## Sub-Plan Map

```
PLAN-A: Core Engine          ──► PLAN-B: Spatial Canvas
(schema · canvas · snap)         (yard · terrain · elements)
          │                                  │
          │                                  ▼
          │                       PLAN-C: Editing Engine
          │                       (select · layers · groups)
          │                                  │
          ├──────────────────────────────────┤
          │                                  │
          ▼                                  ▼
PLAN-D: Intelligence Layer       PLAN-E: Delivery
(measure · journal · cost)       (export · polish · audit)
          │
          │  (also branches from A, parallel to B/C/D)
          │
PLAN-F: Image Generation UI
(generate button · options · API client · result modal)
```

### Execution Rules

| Rule | Detail |
|------|--------|
| **A blocks everything** | No other plan can start until PLAN-A is `done` |
| **B before C** | PLAN-C requires elements on canvas to select and manipulate |
| **D starts after B** | PLAN-D reads element data; needs element IDs and types from B. Inspector hooks (C) are soft dependency — stub them in C if D starts in parallel |
| **E is last** | PLAN-E integrates work from all plans; starts only when A+B+C+D are `done` |
| **B and D may overlap** | Once B has at least terrain + one element type complete, D agents can start on measurement and cost math in isolation |
| **F starts after A** | PLAN-F depends only on PLAN-A (toolbar slot, project state, `markDirty()`). Can run in parallel with B, C, D, and E once A is `done`. Backend must be running for integration testing |

### Sub-Plan Files

| Plan | File | Owns | Status |
|------|------|------|--------|
| A | `docs/plans/frontend/PLAN-A.md` | App scaffold · data schema · canvas/viewport · persistence · snap system | `todo` |
| B | `docs/plans/frontend/PLAN-B.md` | Yard setup · terrain · plants · structures · paths · labels | `todo` |
| C | `docs/plans/frontend/PLAN-C.md` | Select · move/copy/paste · inspector · eraser · layers · groups | `todo` |
| D | `docs/plans/frontend/PLAN-D.md` | Measurement · dimensions · journal · cost tracking | `todo` |
| E | `docs/plans/frontend/PLAN-E.md` | PNG export · minimap · visual polish · shortcut audit | `todo` |
| F | `docs/plans/frontend/PLAN-F.md` | Image generation UI · API client · options panel · result modal | `todo` |

---

## Cross-Plan Interface Contracts

> What each plan delivers that subsequent plans depend on. Agents must not break these contracts.

### Plan A delivers to everyone

- Global app state shape: `Project` type with `elements[]`, `layers[]`, `groups[]`, `journal[]`, `registries`, `yardBoundary`, `viewport`, `uiState`
- `elementId` uniqueness guaranteed (UUID)
- World↔screen transform functions: `toScreen(worldX, worldY)` and `toWorld(screenX, screenY)`
- Render pipeline hook: a composable render loop that sub-plans register into by layer
- Snap function: `snapPoint(worldX, worldY, options) → { x, y, snapped, guideLines[] }`
- Undo/redo push function: `pushHistory(action)` available globally
- IndexedDB auto-save: triggered on any state mutation; sub-plans call `markDirty()`

### Plan A delivers to Plan B specifically

- Render layer slots pre-allocated in correct order (terrain → yard boundary → paths → structures → plants → labels → dimensions → selection UI)
- Grid already rendered; B agents do not re-implement grid

### Plan B delivers to Plan C

- Every placed element has: `id`, `type`, `x`, `y`, `layerId`, `groupId` (nullable), `locked`
- Hit-test function per element type: `hitTest(element, worldX, worldY) → boolean`
- AABB function per element type: `getAABB(element) → { x, y, w, h }`
- Selection priority constants exported

### Plan B delivers to Plan D

- All element types have stable `id` (referenced by journal and dimensions)
- Registry `costPerUnit` fields populated on all types
- Area/perimeter computable from element data alone (no runtime UI dependency)

### Plan C delivers to Plan D

- Inspector panel renders a right-side slot for Plan D to inject: cost display, area/perimeter display, linked journal entries list
- Selection state exposed: `getSelectedElementIds() → string[]`

### Plans A–D deliver to Plan E

- All render layers functional and stable
- All keyboard shortcuts wired (E does audit only, not re-wiring)
- PNG offscreen render re-uses the same render pipeline with a headless canvas

---

## Master Decision Log

> Record decisions that affect more than one plan here. Plan-specific decisions go in the plan file.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Split into 5 sub-plans along engine/canvas/editing/intelligence/delivery boundaries | Enables parallel execution after Plan A; each boundary matches a coherent technical domain |
| 2026-04-06 | Image generation excluded from all sub-plans | Per project scope; covered separately in `docs/backend/image-generation.md` |
| 2026-04-06 | Created PLAN-F for frontend image generation UI | Was excluded from Plans A-E but needs a plan to avoid being orphaned; can parallelize with C/D after A |
| 2026-04-06 | Created backend implementation plan (PLAN-BACKEND.md) | Backend and frontend developing in parallel; need coordinated contract testing and shared fixtures |

---

## Master Agent Log

> Append-only. Record cross-plan events: plan completions, interface contract changes, escalations.

```
2026-04-06 — Coordination document initialized. 5 sub-plans created. All status: todo.
```
