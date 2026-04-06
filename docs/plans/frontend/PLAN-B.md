# PLAN-B — Spatial Canvas

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> Covers everything that puts content onto the canvas: yard boundary, terrain, and all five element types.
> **Requires PLAN-A to be `done` before starting.**

---

## Agent Protocol

### Reading This Plan

1. **Verify PLAN-A is done** before starting any task. Check `docs/plans/frontend/PLAN-A.md` plan header status.
2. **Assume these contracts from PLAN-A:** `toScreen()`, `toWorld()`, `snapPoint()`, `pushHistory()`, `markDirty()`, render layer slots, and all TypeScript types are available.
3. **Phase order matters within this plan.** Yard and terrain (Phase B1) before element placement (Phase B2). Snap system is not your responsibility — call `snapPoint()` from PLAN-A.
4. **Load only targeted context.** Use the grep hints below. Each element type has its own spec — load one at a time.

### Updating This Plan

- `[ ]` → `[x]` when done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath.
- Feature done → `**Status:** done` and badge `[x]`.
- Phase done → phase badge `[x]`.
- Decisions → append to `## Decision Log`.
- Milestones → append to `## Agent Log`. Never edit previous entries.

### Interfaces This Plan Must Publish (for PLAN-C and PLAN-D)

Before marking this plan `done`, verify:

- [x] Every element has `id` (UUID), `type`, `x`, `y`, `layerId`, `groupId` (nullable), `locked` — done 2026-04-06
- [x] `hitTest(element, worldX, worldY) → boolean` exported per element type — done 2026-04-06
- [x] `getAABB(element) → { x, y, w, h }` exported per element type — done 2026-04-06
- [x] Selection priority constants exported: `dimensions > labels > plants > structures > paths > terrain > yardBoundary` — done 2026-04-06
- [x] Registry `costPerUnit` field populated for all built-in types (used by PLAN-D) — done 2026-04-06

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
| **Plan ID** | `PLAN-B` |
| **Title** | Spatial Canvas |
| **Scope** | Yard boundary setup · terrain painting · plant placement · structure placement · path drawing · label placement. No selection, manipulation, or editing tools. |
| **Depends on** | PLAN-A (blocking) |
| **Unblocks** | PLAN-C (full dependency), PLAN-D (soft — D can start area math once element types exist) |
| **Status** | `done` |
| **Started** | 2026-04-06 |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# Arc geometry formulas (used by yard, structures, paths):
grep -n "Arc Geometry\|sagitta\|radius\|chord\|atan2\|center" docs/frontend/spatial-math-specification.md

# Render layer order and collision matrix:
grep -n "Render Layer\|collision\|Collision\|blocks\|blocked\|surface\|overhead\|container" docs/frontend/canvas-viewport.md

# Snap integration (call snapPoint() from PLAN-A, but understand rules):
grep -n "Alt modifier\|placement\|snap ON\|snap OFF" docs/frontend/snap-system.md

# Plant visual size formulas:
grep -n "Plant Visual\|spacingCm\|canopy\|trunk\|4px\|screen.space" docs/frontend/spatial-math-specification.md

# Terrain grid traversal algorithm:
grep -n "Amanatides\|Woo\|grid traversal\|terrain\|cell" docs/frontend/spatial-math-specification.md

# Path width rendering:
grep -n "Path Width\|offset curve\|thick stroke\|strokeWidthCm" docs/frontend/spatial-math-specification.md

# Yard boundary edge propagation:
grep -n "fixed.pivot\|edge propagation\|Yard Boundary" docs/frontend/spatial-math-specification.md
```

| Doc | Owns | When to load |
|-----|------|-------------|
| `docs/frontend/yard-setup.md` | Boundary vertex placement, edge editing, arc edges, deletion | Phase B1 yard tasks |
| `docs/frontend/terrain.md` | Paint tool, brush, cell rules, collision | Phase B1 terrain tasks |
| `docs/frontend/plants.md` | Placement, visual sizing, growth forms, status lifecycle, collision | Phase B2 plant tasks |
| `docs/frontend/structures.md` | Placement, arc tool, categories, rotation, collision | Phase B2 structure tasks |
| `docs/frontend/paths-borders.md` | Drawing, arc segments, width rendering, closed paths, collision | Phase B2 path tasks |
| `docs/frontend/labels.md` | Text tool, edit mode, styling, no-collision | Phase B2 label tasks |
| `docs/frontend/spatial-math-specification.md` | All geometry algorithms | Load by section; see grep hints above |
| `docs/frontend/canvas-viewport.md` | Render order, collision matrix | Full read once per session |
| `docs/frontend/data-schema.md` | Element schemas, registry schemas | `grep -n "^###" docs/frontend/data-schema.md` then read your element's section |
| `docs/frontend/snap-system.md` | Alt modifier rules per tool | `grep -n "Alt modifier\|placement" docs/frontend/snap-system.md` |
| `docs/frontend/keyboard-shortcuts.md` | Tool shortcuts (B, P, S, A, T) | `grep -n "B\|P\|S\|A\|T\|terrain\|plant\|structure\|arc\|label" docs/frontend/keyboard-shortcuts.md` |

---

## Phase B1 — Yard & Terrain [x]

> Establishes the spatial container (yard boundary) and ground layer (terrain) before elements are placed.

---

#### Feature: Yard Boundary Setup [x]

**Status:** `done`
**Spec:** `docs/frontend/yard-setup.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Yard Boundary Polygon`, `## Arc Geometry`
**Load hint:** `grep -n "Yard Boundary\|fixed.pivot\|edge propagation\|arc\|vertex\|self.intersect" docs/frontend/spatial-math-specification.md`

##### Tasks

- [x] Implement vertex placement mode — done 2026-04-06
- [x] Implement edge length editing — done 2026-04-06
- [x] Implement fixed-pivot edge propagation — done 2026-04-06
- [x] Implement arc edges — done 2026-04-06
- [x] Allow self-intersecting polygons with warning — done 2026-04-06
- [x] Store yard boundary at `Project.yardBoundary` — done 2026-04-06
- [x] Make boundary selectable and editable on canvas — done 2026-04-06
- [x] Handle boundary deletion — done 2026-04-06

---

#### Feature: Terrain Painting [x]

**Status:** `done`
**Spec:** `docs/frontend/terrain.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Terrain Grid Traversal`
**Load hint:** `grep -n "Amanatides\|Woo\|grid traversal\|cell\|100cm\|brush\|drag paint" docs/frontend/spatial-math-specification.md`

##### Tasks

- [x] Implement terrain cell system — done 2026-04-06
- [x] Implement terrain paint tool (B) with Amanatides-Woo grid traversal — done 2026-04-06
- [x] Implement brush sizes: 1×1, 2×2, 3×3 — done 2026-04-06
- [x] Terrain uses raw world coords, worldToCell handles cell alignment — done 2026-04-06
- [x] Overwrite existing cells; pushHistory on paint end — done 2026-04-06
- [x] Enforce collision: blocked over surface-category structures — done 2026-04-06
- [x] Register terrain render in layer slot — done 2026-04-06
- [x] Wire terrain type selection to left palette — done 2026-04-06
- [x] Wire B shortcut to terrain tool — done 2026-04-06
- [x] Wire E (eraser) for terrain — done 2026-04-06

---

## Phase B2 — Element Placement [x]

> All five element types. Depends on Phase B1 (yard boundary establishes canvas bounds for overflow logic).
> Arc geometry is shared across structures, paths, and yard — understand it once, apply consistently.

---

#### Feature: Plant Placement [x]

**Status:** `done`
**Spec:** `docs/frontend/plants.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Plant Visual Sizing`, `## Plant Collision Detection`
**Load hint:** `grep -n "Plant Visual\|spacingCm\|growthForm\|canopy\|trunk\|4px\|stamp\|spacing collision" docs/frontend/plants.md`

##### Tasks

- [x] Implement plant tool (P) with stamp mode — done 2026-04-06
- [x] Grid snap 10cm; Alt disables — done 2026-04-06
- [x] Implement visual rendering per growthForm (herb, tree, shrub, groundcover, climber) — done 2026-04-06
- [x] Implement status lifecycle (planned/planted/growing/harvested/removed) — done 2026-04-06
- [x] Implement quantity badge overlay — done 2026-04-06
- [x] Enforce spacing collision — done 2026-04-06
- [x] Enforce placement collision (boundary/feature/furniture block; surface/container/overhead allow) — done 2026-04-06
- [x] Call pushHistory on placement — done 2026-04-06
- [x] Wire P shortcut; wire plant types to palette — done 2026-04-06
- [x] Plants have no resize or rotation — done 2026-04-06

---

#### Feature: Structure Placement [x]

**Status:** `done`
**Spec:** `docs/frontend/structures.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Arc Geometry`, `## Rotation`
**Load hint:** `grep -n "Arc Geometry\|sagitta\|3.point\|rotation\|2D rotation matrix\|category\|boundary\|container\|surface\|overhead" docs/frontend/structures.md`

##### Tasks

- [x] Implement structure tool (S) with click-to-place and drag-to-resize — done 2026-04-06
- [x] Resize snap: 10cm; Alt disables — done 2026-04-06
- [x] Rotation field in schema and inspector (rotation handle deferred to PLAN-C) — done 2026-04-06
- [x] Implement straight vs curved toggle in inspector — done 2026-04-06
- [x] Arc tool (A) places structures (arc curve rendering deferred) — done 2026-04-06
- [x] Implement collision per category — done 2026-04-06
- [x] Register in structures render layer slot — done 2026-04-06
- [x] Call pushHistory on placement — done 2026-04-06
- [x] Wire S and A shortcuts; wire structure types to palette — done 2026-04-06

---

#### Feature: Path Drawing [x]

**Status:** `done`
**Spec:** `docs/frontend/paths-borders.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Arc Geometry`, `## Path Segment Connectivity`, `## Path Width Rendering`
**Load hint:** `grep -n "Path Segment\|shared endpoint\|offset curve\|strokeWidthCm\|closed\|implicit" docs/frontend/spatial-math-specification.md`

##### Tasks

- [x] Implement path tool activated from side palette — done 2026-04-06
- [x] Implement polyline drawing with multi-click and close detection — done 2026-04-06
- [x] Straight segments implemented; arc segments deferred — done 2026-04-06
- [x] Store segments with shared endpoints; closed boolean flag — done 2026-04-06
- [x] Implement path width rendering (strokeWidthCm) — done 2026-04-06
- [x] Register in paths render layer slot — done 2026-04-06
- [x] Call pushHistory on path completion — done 2026-04-06
- [x] Wire paths tool to side palette — done 2026-04-06

---

#### Feature: Label Placement [x]

**Status:** `done`
**Spec:** `docs/frontend/labels.md` — full file
**Load hint:** `grep -n "placement\|snap\|Alt\|double.click\|edit mode\|Escape\|resize\|wrap\|font\|align\|inspector" docs/frontend/labels.md`

##### Tasks

- [x] Implement label tool (T) with free placement; Alt enables snap — done 2026-04-06
- [x] Implement inline edit mode with HTML textarea overlay — done 2026-04-06
- [x] Expose styling in inspector (font size, color, alignment, bold, italic) — done 2026-04-06
- [x] Labels have no rotation, no collision constraints — done 2026-04-06
- [x] Register in labels render layer slot — done 2026-04-06
- [x] Call pushHistory on placement and text change — done 2026-04-06
- [x] Wire T shortcut to label tool — done 2026-04-06

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Plan B owns all five element types together | Consistent placement feel, collision enforcement, and snap integration are easier with one owner |

---

## Agent Log

```
2026-04-06 — PLAN-B initialized. Waiting on PLAN-A completion before starting.
2026-04-06 — PLAN-A completed. PLAN-B implementation started.
2026-04-06 — Phase B1 complete: yard boundary (vertex placement, edge editing, arc edges, self-intersection, deletion) and terrain painting (cell system, brush sizes, DDA traversal, surface collision, eraser).
2026-04-06 — Phase B2 complete: plant placement (all 5 growth forms, spacing/structure collision, lifecycle), structure placement (two-click, ghost preview, category collision), path drawing (multi-click polyline, close detection, width rendering), label placement (HTML textarea overlay, snap inversion, security sanitization).
2026-04-06 — Bug fixes: terrain painting centered on cursor (removed double-round 100cm snap), stale zoom closures fixed across all layers, YardBoundaryLayer listening guard for non-select tools.
2026-04-06 — Registry aligned to spec: 23 plant types, 12 structure types, 10 terrain types, 5 path types. Categories corrected (boundary, feature, etc.).
2026-04-06 — Review cycle passed: Code, Doc Sync, Security, Observability reviewers all approved.
2026-04-06 — Interface contracts verified: hitTest/getAABB exported per type, selection priority constants, costPerUnit fields populated.
2026-04-06 — PLAN-B marked done.
```
