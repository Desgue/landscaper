# PLAN-A — Core Engine

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan is the hard blocker for all other plans. Nothing else starts until this is `done`.
> For cross-plan context, see `docs/plans/frontend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm Plan A is the active plan** by checking `docs/plans/frontend/IMPLEMENTATION_PLAN.md` Sub-Plan Map. If any other plan is listed as `in-progress`, coordinate before proceeding.
2. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line. Do not read full spec files unless marked "full file".
3. **Sequential phases.** Work top-to-bottom. Each phase may depend on the previous within this plan. The Snap System (Phase A2) depends on Canvas & Viewport from Phase A1.

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.

### Interfaces This Plan Must Publish

Before marking this plan `done`, verify these contracts are fulfilled (see `docs/plans/frontend/IMPLEMENTATION_PLAN.md § Cross-Plan Interface Contracts`):

- [ ] `Project` TypeScript type exported and importable by all other plans
- [ ] `toScreen()` / `toWorld()` transform functions exported
- [ ] Render pipeline with layer slot registration
- [ ] `snapPoint()` function exported
- [ ] `pushHistory()` / `markDirty()` available globally
- [ ] Pre-allocated render layer slots in correct order

### Status Vocabulary

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |
| `[-]` | Blocked |

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-A` |
| **Title** | Core Engine |
| **Scope** | App scaffold, data schema, canvas/viewport rendering pipeline, persistence layer, welcome screen, snap system. No element placement or editing tools. |
| **Blocks** | PLAN-B, PLAN-C, PLAN-D, PLAN-E |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# List sections in a doc:
grep -n "^## " docs/frontend/FILE.md

# Find a field name across all docs:
grep -rn "FIELD_NAME" docs/

# Find coordinate transform formulas:
grep -n "screenX\|worldX\|panX\|zoom\|transform" docs/frontend/spatial-math-specification.md

# Find snap algorithm:
grep -n "snap\|tolerance\|8px\|clamp\|geometry snap\|grid snap" docs/frontend/spatial-math-specification.md

# Find IndexedDB/persistence rules:
grep -n "IndexedDB\|debounce\|auto.save\|undo\|history\|ring buffer" docs/frontend/persistence-projects.md
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `docs/frontend/data-schema.md` | All JSON shapes, types, registries | `grep -n "^##\|^###" docs/frontend/data-schema.md` — read only needed element section |
| `docs/frontend/spatial-math-specification.md` | Coordinate transforms, snap math, viewport math | `grep -n "^##\|^###" docs/frontend/spatial-math-specification.md` then read target section |
| `docs/frontend/canvas-viewport.md` | Render layer order, collision matrix, coordinate system, zoom/pan | Full read — short file, needed entirely |
| `docs/frontend/snap-system.md` | Snap priority, geometry types, tolerance, Alt modifier, guides | Full read — defines the complete snap contract |
| `docs/frontend/persistence-projects.md` | Auto-save, IndexedDB schema, project lifecycle, export/import | `grep -n "^## " docs/frontend/persistence-projects.md` |
| `docs/frontend/visual-design.md` | Layout positions, color tokens, typography | `grep -n "Layout\|toolbar\|palette\|inspector\|color\|#" docs/frontend/visual-design.md` |
| `docs/frontend/keyboard-shortcuts.md` | Tool activation model, all shortcuts | `grep -n "Tools\|Toggle\|Navigation" docs/frontend/keyboard-shortcuts.md` |

---

## Phase A1 — Foundation [ ]

> Builds the app shell, all data types, the rendering pipeline, and the persistence layer.
> Snap System (Phase A2) depends on the viewport transform being complete here.

---

#### Feature: App Scaffold [ ]

**Status:** `todo`
**Spec:** `docs/frontend/visual-design.md` → `## Layout`
**Load hint:** `grep -n "Layout\|toolbar\|palette\|inspector\|minimap\|status bar" docs/frontend/visual-design.md`
**Also see:** `docs/frontend/keyboard-shortcuts.md` → tool activation model

##### Tasks

- [x] Initialize project with chosen framework (React + Canvas or equivalent); configure build tooling, linting, TypeScript — done 2026-04-06
  - Stack: React 19, Vite 8, TypeScript, ESLint + typescript-eslint; Tailwind CSS v4 also installed (not in original plan)
- [ ] Implement layout shell: top toolbar, left side palette, right inspector panel, bottom status bar, canvas fill area — exact positions per `visual-design.md`
- [ ] Implement global tool activation state machine: active tool ID tracked; keyboard dispatch wired; individual tool handlers registered per-plan
- [ ] Stub minimap in bottom-right corner (non-functional placeholder; functional render in PLAN-E)
- [ ] Apply color tokens from visual-design.md (`#1971c2` accent, gray UI, light canvas background); typography per spec

##### Notes

_Do not invent layout values. All positions and colors must trace to visual-design.md. Light theme only (dark mode deferred per spec)._

---

#### Feature: Data Schema [ ]

**Status:** `todo`
**Spec:** `docs/frontend/data-schema.md` — full file
**Load hint:** `grep -n "^##\|^###" docs/frontend/data-schema.md`

##### Tasks

- [ ] Define TypeScript interfaces for all element types: `TerrainElement`, `PlantElement`, `StructureElement`, `PathElement`, `LabelElement`, `DimensionElement`; base fields shared via `BaseElement`
- [ ] Define `Project` root type: `elements[]`, `layers[]`, `groups[]`, `journal[]`, `registries`, `yardBoundary`, `viewport`, `uiState`
- [ ] Define registry types: `TerrainType`, `PlantType`, `StructureType`, `PathType` — each with `costPerUnit` field
- [ ] Define `Layer`, `Group`, `JournalEntry` types
- [ ] Implement schema validation function for import: apply documented safe defaults, skip unknown element types silently, validate enums
- [ ] Write unit tests: missing required field → default applied; unknown element type → skipped; invalid enum → default; duplicate ID → resolved

##### Notes

_Field names are normative per data-schema.md. Do not rename. Registry ID format: lowercase kebab-case._

---

#### Feature: Canvas & Viewport [ ]

**Status:** `todo`
**Spec:** `docs/frontend/canvas-viewport.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Coordinate System`, `## Viewport Transforms`, `## Zoom`
**Load hint:** `grep -n "Coordinate System\|Viewport Transform\|Zoom\|panX\|worldX\|fit.to.view" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement viewport state: `{ panX, panY, zoom }` with zoom range `[0.05, 10.0]`
- [ ] Implement `toScreen(worldX, worldY)` and `toWorld(screenX, screenY)` — `screenX = worldX * zoom + panX`; never round world coordinates; export these functions for all other plans
- [ ] Implement pan: Space+drag, middle-click+drag, two-finger drag (trackpad)
- [ ] Implement Hand/Pan tool (H): when active, left-click drag pans the canvas; no elements selected or modified; cursor shows grab/hand icon; wire H shortcut
- [ ] Implement zoom: scroll wheel and pinch; zoom-toward-cursor math (world point under cursor stays fixed — see spatial-math-specification.md § Zoom)
- [ ] Implement fit-to-view: AABB of all elements + padding, centered and scaled
- [ ] Implement render loop with composable layer slots (bottom → top): grid · overflow dim · terrain · yard boundary · paths · structures · plants · labels · dimensions · selection UI — each slot is a registered callback
- [ ] Render major grid (1m, always visible) and minor grid (10cm, only when zoom ≥ 1.0) per visual-design.md styles
- [ ] Implement overflow area dimming: area outside yard boundary rendered at reduced opacity; canvas remains functional
- [ ] Implement scale bar: auto-adjusts displayed distance based on current zoom per visual-design.md
- [ ] Wire `Ctrl+'` to toggle grid visibility; snap remains independent of this toggle

##### Notes

_Y-axis points down (Canvas convention). Internal unit: cm. Display unit: m with cm precision. Never mix units._

---

#### Feature: Persistence & Project Lifecycle [ ]

**Status:** `todo`
**Spec:** `docs/frontend/persistence-projects.md` — full file
**Also see:** `docs/frontend/data-schema.md` → `## Project` (export format, import validation)
**Load hint:** `grep -n "^## \|IndexedDB\|auto.save\|debounce\|undo\|history\|ring buffer\|export\|import\|validate" docs/frontend/persistence-projects.md`

##### Tasks

- [ ] Set up IndexedDB: database `landscape-planner`, store `projects` (keyed by project UUID), store `undoHistory` (keyed by project UUID)
- [ ] Implement auto-save: export `markDirty()` — call triggers 2-second debounced snapshot write to IndexedDB
- [ ] Implement undo/redo: ring buffer of last 200 state snapshots; export `pushHistory(action)` for all plans to call; persist history to `undoHistory` with same 2-second debounce; history survives page reload; history cleared on import
- [ ] Wire `Ctrl+Z` / `Ctrl+Shift+Z` to undo/redo
- [ ] Implement project CRUD: create (prompt name → UUID), load, rename (append suffix on collision), delete (require confirmation)
- [ ] Implement JSON export: serialize full `Project` + registries; no undo history in export
- [ ] Implement JSON import: create new project; merge registries; resolve name collision; run schema validation with safe defaults; restore `viewport` and `uiState` if present; clear undo history after import
- [ ] Implement PNG export stub: placeholder function signature; functional rendering implemented in PLAN-E

##### Notes

_Undo history lives in IndexedDB only — not in the JSON export. Import always creates a new project, never overwrites._

---

#### Feature: Welcome Screen [ ]

**Status:** `todo`
**Spec:** `docs/frontend/persistence-projects.md` → `## Welcome Screen`, `## New Project Flow`
**Load hint:** `grep -n "Welcome\|project list\|New Project\|Import\|empty state\|MRU\|most.recent" docs/frontend/persistence-projects.md`
**Also see:** `docs/frontend/yard-setup.md` (new project leads to yard setup — implemented in PLAN-B)

##### Tasks

- [ ] Render project list in MRU order with: open, rename, delete (with confirmation) actions per project
- [ ] "New project" action: prompt for name → navigate to yard-setup canvas (PLAN-B registers this route); on yard-setup complete → open main canvas
- [ ] "Import" action: file picker → JSON import flow → open imported project
- [ ] Empty state (no projects): show prompt to create or import

---

## Phase A2 — Snap System [ ]

> Depends on Canvas & Viewport being complete (needs `toWorld()`/`toScreen()` and zoom state).
> Must be fully done before PLAN-B starts — every placement tool depends on it.

---

#### Feature: Snap System [ ]

**Status:** `todo`
**Spec:** `docs/frontend/snap-system.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Grid Snapping`, `## Snap System Architecture`
**Load hint:** `grep -n "Grid Snap\|Geometry Snap\|tolerance\|8px\|clamp\|priority\|Alt modifier\|guide" docs/frontend/snap-system.md`

##### Tasks

- [ ] Implement grid snap formula: `snap(v, inc) = Math.round(v / inc) * inc`; read `inc` from `project.gridConfig.snapIncrementCm` (default `10`; configurable per project)
- [ ] Implement adaptive snap tolerance: `tolerance = clamp(8 / zoom, 2, 100)` cm — recalculate each frame from current zoom
- [ ] Implement geometry snap candidates: edge alignment (per-axis match to nearest element edge), midpoint alignment, perpendicular alignment (90° to nearest edge)
- [ ] Implement priority resolution: geometry snap wins over grid snap; among geometry candidates, closest (in world cm) wins; ties broken by element creation timestamp
- [ ] Implement Alt modifier context rules:
  - Placement tools (terrain, plants, structures): snap ON by default; Alt disables
  - Move operations: snap OFF by default; Alt enables
  - Labels and measurement: snap OFF by default; Alt enables
- [ ] Implement `Ctrl+G` toggle: global snap enable/disable; independent from `Ctrl+'` grid visibility
- [ ] Implement visual snap guides: thin blue lines at 50% opacity, extended full viewport width/height, rendered only when snap is active; drawn in selection UI layer slot
- [ ] Export `snapPoint(worldX, worldY, context, elements) → { x, y, snapped: boolean, guideLines: Line[] }` for all plans to call

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Plan A owns snap system alongside foundation | Snap math is tightly coupled to coordinate transforms; same agent avoids interface mismatch |

---

## Agent Log

```
2026-04-06 — PLAN-A initialized. Phase A1 and A2 both todo. Blocks all other plans.
2026-04-06 — Audit of current codebase: project init + build tooling done (React 19, Vite 8, TS, Tailwind v4 via @tailwindcss/vite). Layout shell, state machine, minimap stub, color tokens not started. Landing page (Greenprint marketing) exists in src/ — out of plan scope, does not conflict.
```
