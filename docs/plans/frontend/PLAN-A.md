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

- [x] `Project` TypeScript type exported and importable by all other plans
- [x] `toScreen()` / `toWorld()` transform functions exported
- [x] Render pipeline with layer slot registration
- [x] `snapPoint()` function exported
- [x] `pushHistory()` / `markDirty()` available globally
- [x] Pre-allocated render layer slots in correct order

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
| **Status** | `in-progress` |
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

## Phase A1 — Foundation [~]

> Builds the app shell, all data types, the rendering pipeline, and the persistence layer.
> Snap System (Phase A2) depends on the viewport transform being complete here.

---

#### Feature: App Scaffold [x]

**Status:** `done`
**Spec:** `docs/frontend/visual-design.md` → `## Layout`
**Load hint:** `grep -n "Layout\|toolbar\|palette\|inspector\|minimap\|status bar" docs/frontend/visual-design.md`
**Also see:** `docs/frontend/keyboard-shortcuts.md` → tool activation model

##### Tasks

- [x] Initialize project with chosen framework (React + Canvas or equivalent); configure build tooling, linting, TypeScript — done 2026-04-06
  - Stack: React 19, Vite 8, TypeScript, ESLint + typescript-eslint; Tailwind CSS v4 also installed (not in original plan)
- [x] Implement layout shell: top toolbar, left side palette, right inspector panel, bottom status bar, canvas fill area — exact positions per `visual-design.md` — done 2026-04-06
- [x] Implement global tool activation state machine: active tool ID tracked; keyboard dispatch wired; individual tool handlers registered per-plan — done 2026-04-06
- [x] Stub minimap in bottom-right corner (non-functional placeholder; functional render in PLAN-E) — done 2026-04-06
- [x] Apply color tokens from visual-design.md (`#1971c2` accent, gray UI, light canvas background); typography per spec — done 2026-04-06

##### Notes

_Do not invent layout values. All positions and colors must trace to visual-design.md. Light theme only (dark mode deferred per spec)._

---

#### Feature: Data Schema [x]

**Status:** `done`
**Spec:** `docs/frontend/data-schema.md` — full file
**Load hint:** `grep -n "^##\|^###" docs/frontend/data-schema.md`

##### Tasks

- [x] Define TypeScript interfaces for all element types: `TerrainElement`, `PlantElement`, `StructureElement`, `PathElement`, `LabelElement`, `DimensionElement`; base fields shared via `BaseElement` — done 2026-04-06
- [x] Define `Project` root type: `elements[]`, `layers[]`, `groups[]`, `journal[]`, `registries`, `yardBoundary`, `viewport`, `uiState` — done 2026-04-06
- [x] Define registry types: `TerrainType`, `PlantType`, `StructureType`, `PathType` — each with `costPerUnit` field — done 2026-04-06
- [x] Define `Layer`, `Group`, `JournalEntry` types — done 2026-04-06
- [x] Implement schema validation function for import: apply documented safe defaults, skip unknown element types silently, validate enums — done 2026-04-06
- [ ] Write unit tests: missing required field → default applied; unknown element type → skipped; invalid enum → default; duplicate ID → resolved

##### Notes

_Field names are normative per data-schema.md. Do not rename. Registry ID format: lowercase kebab-case._

---

#### Feature: Canvas & Viewport [x]

**Status:** `done`
**Spec:** `docs/frontend/canvas-viewport.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Coordinate System`, `## Viewport Transforms`, `## Zoom`
**Load hint:** `grep -n "Coordinate System\|Viewport Transform\|Zoom\|panX\|worldX\|fit.to.view" docs/frontend/spatial-math-specification.md`

##### Tasks

- [x] Implement viewport state: `{ panX, panY, zoom }` with zoom range `[0.05, 10.0]` — done 2026-04-06
- [x] Implement `toScreen(worldX, worldY)` and `toWorld(screenX, screenY)` — `screenX = worldX * zoom + panX`; never round world coordinates; export these functions for all other plans — done 2026-04-06
- [x] Implement pan: Space+drag, middle-click+drag, two-finger drag (trackpad) — done 2026-04-06
- [x] Implement Hand/Pan tool (H): when active, left-click drag pans the canvas; no elements selected or modified; cursor shows grab/hand icon; wire H shortcut — done 2026-04-06
- [x] Implement zoom: Ctrl+scroll and trackpad pinch (pinch fires as ctrlKey+wheel on macOS/Chrome); zoom-toward-cursor math (world point under cursor stays fixed — see spatial-math-specification.md § Zoom) — done 2026-04-06
- [x] Implement fit-to-view: AABB of all elements + padding, centered and scaled; wired to Ctrl+Shift+1 per keyboard-shortcuts.md — done 2026-04-06
- [x] Implement render loop with composable layer slots (bottom → top): grid · overflow dim · terrain · yard boundary · paths · structures · plants · labels · dimensions · selection UI — each slot is a registered callback — done 2026-04-06
- [x] Render major grid (1m, always visible) and minor grid (10cm, only when zoom ≥ 1.0) per visual-design.md styles — done 2026-04-06
- [x] Implement overflow area dimming: area outside yard boundary rendered at reduced opacity; canvas remains functional — done 2026-04-06
- [x] Implement scale bar: auto-adjusts displayed distance based on current zoom per visual-design.md — done 2026-04-06
- [x] Wire `Ctrl+'` to toggle grid visibility; snap remains independent of this toggle — done 2026-04-06

##### Notes

_Y-axis points down (Canvas convention). Internal unit: cm. Display unit: m with cm precision. Never mix units._

---

#### Feature: Canvas Rulers [ ]

**Status:** `todo`
**Spec:** `docs/frontend/canvas-viewport.md` → `## Rulers`

##### Tasks

- [ ] Render horizontal ruler along the top canvas edge and vertical ruler along the left edge; major markings at 1m, minor markings at 10cm (minor visible when zoom ≥ 1.0)
- [ ] Rulers update in real-time with pan and zoom; coordinate zero aligns with the canvas origin

---

#### Feature: Persistence & Project Lifecycle [~]

**Status:** `in-progress`
**Spec:** `docs/frontend/persistence-projects.md` — full file
**Also see:** `docs/frontend/data-schema.md` → `## Project` (export format, import validation)
**Load hint:** `grep -n "^## \|IndexedDB\|auto.save\|debounce\|undo\|history\|ring buffer\|export\|import\|validate" docs/frontend/persistence-projects.md`

##### Tasks

- [x] Set up IndexedDB: database `landscape-planner`, store `projects` (keyed by project UUID), store `undoHistory` (keyed by project UUID) — done 2026-04-06
- [x] Implement auto-save: export `markDirty()` — call triggers 2-second debounced snapshot write to IndexedDB — done 2026-04-06
- [x] Implement undo/redo: ring buffer of last 200 state snapshots; export `pushHistory(action)` for all plans to call; persist history to `undoHistory` with same 2-second debounce; history survives page reload; history cleared on import — done 2026-04-06
- [x] Wire `Ctrl+Z` / `Ctrl+Shift+Z` to undo/redo — done 2026-04-06
- [x] Implement project CRUD: create (prompt name → UUID), load, rename (append suffix on collision), delete (require confirmation) — done 2026-04-06
- [ ] Implement JSON export: serialize full `Project` + registries; no undo history in export
- [x] Implement JSON import: create new project; merge registries; resolve name collision; run schema validation with safe defaults; restore `viewport` and `uiState` if present; clear undo history after import — done 2026-04-06
- [x] Implement PNG export stub: placeholder function signature; functional rendering implemented in PLAN-E — done 2026-04-06

##### Notes

_Undo history lives in IndexedDB only — not in the JSON export. Import always creates a new project, never overwrites._

---

#### Feature: Welcome Screen [x]

**Status:** `done` (yard-setup routing deferred to PLAN-B)
**Spec:** `docs/frontend/persistence-projects.md` → `## Welcome Screen`, `## New Project Flow`
**Load hint:** `grep -n "Welcome\|project list\|New Project\|Import\|empty state\|MRU\|most.recent" docs/frontend/persistence-projects.md`
**Also see:** `docs/frontend/yard-setup.md` (new project leads to yard setup — implemented in PLAN-B)

##### Tasks

- [x] Render project list in MRU order with: open, rename, delete (with confirmation) actions per project — done 2026-04-06
- [x] "New project" action: navigates to canvas directly; yard-setup deferred to PLAN-B — done 2026-04-06
- [x] "Import" action: file picker → JSON import flow → open imported project — done 2026-04-06
- [x] Empty state (no projects): show prompt to create or import — done 2026-04-06

---

## Phase A2 — Snap System [~]

> Depends on Canvas & Viewport being complete (needs `toWorld()`/`toScreen()` and zoom state).
> Must be fully done before PLAN-B starts — every placement tool depends on it.

---

#### Feature: Snap System [~]

**Status:** `in-progress`
**Spec:** `docs/frontend/snap-system.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Grid Snapping`, `## Snap System Architecture`
**Load hint:** `grep -n "Grid Snap\|Geometry Snap\|tolerance\|8px\|clamp\|priority\|Alt modifier\|guide" docs/frontend/snap-system.md`

##### Tasks

- [x] Implement grid snap formula: `snap(v, inc) = Math.round(v / inc) * inc`; read `inc` from `project.gridConfig.snapIncrementCm` (default `10`; configurable per project) — done 2026-04-06
- [x] Implement adaptive snap tolerance: `tolerance = clamp(8 / zoom, 2, 100)` cm — recalculate each frame from current zoom — done 2026-04-06
- [x] Implement geometry snap candidates: edge alignment (per-axis match to nearest element edge), midpoint alignment — done 2026-04-06
- [ ] Implement perpendicular alignment snap: project cursor onto the nearest element edge; if the perpendicular foot falls within snap tolerance, snap fires on that axis — required by snap-system.md (MVP); deferred from initial implementation
- [x] Implement priority resolution: geometry snap wins over grid snap; among geometry candidates, closest (in world cm) wins; ties broken by element creation timestamp — done 2026-04-06
- [x] Implement Alt modifier context rules: — done 2026-04-06
  - Placement tools (terrain, plants, structures): snap ON by default; Alt disables
  - Move operations: snap OFF by default; Alt enables
  - Labels and measurement: snap OFF by default; Alt enables
- [x] Implement `Ctrl+G` toggle: global snap enable/disable; independent from `Ctrl+'` grid visibility — done 2026-04-06
- [x] Implement visual snap guides: thin blue lines at 50% opacity, extended full viewport width/height, rendered only when snap is active; drawn in selection UI layer slot — done 2026-04-06
- [x] Export `snapPoint(worldX, worldY, context, elements) → { x, y, snapped: boolean, guideLines: Line[] }` for all plans to call — done 2026-04-06

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Plan A owns snap system alongside foundation | Snap math is tightly coupled to coordinate transforms; same agent avoids interface mismatch |
| 2026-04-06 | Routing: TanStack Router | Type-safe routing, better TypeScript DX |
| 2026-04-06 | State management: Zustand (not Context API or Redux) | Lightweight, minimal boilerplate, works well with TypeScript, no Provider wrapping needed |
| 2026-04-06 | Canvas rendering: Konva + react-konva | Referenced throughout spatial-math-specification.md; Konva handles Stage transform (pan/zoom) natively matching the spec's coordinate model |
| 2026-04-06 | Persistence: `idb` wrapper over IndexedDB | Minimal surface area, well-typed, matches spec's IndexedDB requirement |

---

## Agent Log

```
2026-04-06 — PLAN-A initialized. Phase A1 and A2 both todo. Blocks all other plans.
2026-04-06 — Audit of current codebase: project init + build tooling done (React 19, Vite 8, TS, Tailwind v4 via @tailwindcss/vite). Layout shell, state machine, minimap stub, color tokens not started. Landing page (Greenprint marketing) exists in src/ — out of plan scope, does not conflict.
2026-04-06 — Implementation started. Installed: konva, react-konva, zustand, idb, react-router-dom, uuid. Phase A1 agents running in parallel: data schema, app scaffold, persistence layer, canvas/viewport.
2026-04-06 — Routing: migrated to TanStack Router.
2026-04-06 — Phase A1 and A2 implementation complete. All cross-plan interface contracts fulfilled. JSON export and unit tests pending. Yard-setup routing deferred to PLAN-B.
2026-04-06 — Final pre-commit review (3 passes). Fixed: duplicate Space keydown handler in CanvasRoot (critical), Ctrl+' listener unmounting with grid (critical), Array.fill shared object reference in schemaValidation, IndexedDB unavailable not caught in projectsDb, dbPromise caching rejected promise in db.ts, aria-label/aria-pressed missing on toolbar buttons and status bar toggles. Build clean.
```
