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

- [ ] Every element has `id` (UUID), `type`, `x`, `y`, `layerId`, `groupId` (nullable), `locked`
- [ ] `hitTest(element, worldX, worldY) → boolean` exported per element type
- [ ] `getAABB(element) → { x, y, w, h }` exported per element type
- [ ] Selection priority constants exported: `dimensions > labels > plants > structures > paths > terrain > yardBoundary`
- [ ] Registry `costPerUnit` field populated for all built-in types (used by PLAN-D)

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
| **Status** | `todo` |
| **Started** | — |
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

## Phase B1 — Yard & Terrain [ ]

> Establishes the spatial container (yard boundary) and ground layer (terrain) before elements are placed.

---

#### Feature: Yard Boundary Setup [ ]

**Status:** `todo`
**Spec:** `docs/frontend/yard-setup.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Yard Boundary Polygon`, `## Arc Geometry`
**Load hint:** `grep -n "Yard Boundary\|fixed.pivot\|edge propagation\|arc\|vertex\|self.intersect" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement vertex placement mode: activate during "New project" flow (registered route from PLAN-A welcome screen); click to place vertices; close by clicking within snap tolerance of start point or pressing "Done"
- [ ] Implement edge length editing: click an edge label to type exact meter value; enforce minimum 10cm edge length
- [ ] Implement fixed-pivot edge propagation: edited edge direction preserved; subsequent edges cascade — implement algorithm from spatial-math-specification.md § Yard Boundary
- [ ] Implement arc edges: click a straight edge, then drag perpendicular to it to set curvature (sagitta); consistent with the Arc tool interaction in structures; arc math: spatial-math-specification.md § Arc Geometry
- [ ] Allow self-intersecting polygons with a persistent warning banner — do not block placement
- [ ] Store yard boundary at `Project.yardBoundary` (not in `elements[]`) per data-schema.md
- [ ] Make boundary selectable and editable on canvas as a special element after initial setup (move vertices, resize, delete)
- [ ] Handle boundary deletion: set `Project.yardBoundary = null`, show re-setup banner, canvas becomes unbounded

---

#### Feature: Terrain Painting [ ]

**Status:** `todo`
**Spec:** `docs/frontend/terrain.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Terrain Grid Traversal`
**Load hint:** `grep -n "Amanatides\|Woo\|grid traversal\|cell\|100cm\|brush\|drag paint" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement terrain cell system: 1m × 1m (100cm) cells aligned to 100cm world-coordinate boundaries
- [ ] Implement terrain paint tool (B): single click fills one cell; drag painting uses Amanatides-Woo grid traversal — no cell gaps on fast drags
- [ ] Implement brush sizes: 1×1 (default), 2×2, 3×3 — applied as square centered on cursor cell
- [ ] Snap to 100cm boundaries always active; Alt disables snap (call `snapPoint()` with inc=100)
- [ ] Overwrite existing terrain cells without confirmation; call `pushHistory()` on paint end (not per-cell during drag)
- [ ] Enforce collision: terrain cannot be painted over `surface`-category structures (check collision matrix)
- [ ] Register terrain render in terrain layer slot; render fill color from `TerrainType.color`
- [ ] Wire terrain type selection to left palette; display type names and colors
- [ ] Wire B shortcut to terrain tool
- [ ] Wire E (eraser) for terrain: when terrain is topmost element at cursor, remove it

---

## Phase B2 — Element Placement [ ]

> All five element types. Depends on Phase B1 (yard boundary establishes canvas bounds for overflow logic).
> Arc geometry is shared across structures, paths, and yard — understand it once, apply consistently.

---

#### Feature: Plant Placement [ ]

**Status:** `todo`
**Spec:** `docs/frontend/plants.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Plant Visual Sizing`, `## Plant Collision Detection`
**Load hint:** `grep -n "Plant Visual\|spacingCm\|growthForm\|canopy\|trunk\|4px\|stamp\|spacing collision" docs/frontend/plants.md`

##### Tasks

- [ ] Implement plant tool (P): click to place at cursor using active palette selection; stamp mode — place multiple without reselecting
- [ ] Grid snap 10cm; Alt disables (call `snapPoint()`)
- [ ] Implement visual rendering per `growthForm`:
  - `herb`: filled circle, radius = `spacingCm / 2`, min 4px screen-space
  - `tree`: outer semi-transparent circle = `canopyWidthCm / 2`; inner filled circle = `trunkWidthCm / 2`; min 4px screen-space
  - `shrub`: filled circle, diameter = `canopyWidthCm` if set, else `spacingCm`; min 4px screen-space
  - `groundcover`: hatched/textured fill across cell
  - `climber`: directional arrow icon pointing toward the nearest structure edge
- [ ] Implement status lifecycle state machine: `planned → planted → growing → harvested → removed`; any state may transition to `removed`; backward transitions allowed; `plantedDate = null` when `planned`; auto-set to today's date when transitioning to `planted`; editable after
- [ ] Implement quantity badge: integer overlay on icon; does not change icon size
- [ ] Enforce spacing collision: formula is `distance(centerA, centerB) < (spacingA + spacingB) / 2` — correctly handles cross-species pairs where each plant type has a different `spacingCm`; tree trunks additionally block non-plant ground-level elements at radius `trunkWidthCm / 2`; canopy is visual only, non-blocking
- [ ] Enforce placement collision: blocked by structures with category `boundary`, `container` (wait — containers accept plants), `surface`, `feature`, `furniture`; allowed on terrain and paths; allowed inside `container` and under `overhead`
- [ ] Call `pushHistory()` on each placement
- [ ] Wire P shortcut; wire plant types to left palette
- [ ] Plants have no resize or rotation (size is fixed by registry)

---

#### Feature: Structure Placement [ ]

**Status:** `todo`
**Spec:** `docs/frontend/structures.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Arc Geometry`, `## Rotation`
**Load hint:** `grep -n "Arc Geometry\|sagitta\|3.point\|rotation\|2D rotation matrix\|category\|boundary\|container\|surface\|overhead" docs/frontend/structures.md`

##### Tasks

- [ ] Implement structure tool (S): click to place at default dimensions (`defaultWidthCm` × `defaultDepthCm`); drag during placement to resize
- [ ] Resize snap: 10cm on edge drag; Alt disables
- [ ] Implement rotation: drag rotation handle; free rotation (no angle snap); apply 2D rotation matrix around AABB center; call `pushHistory()`
- [ ] Implement straight vs curved toggle in inspector (post-placement); curved uses `arcSagitta` field
- [ ] Implement Arc tool (A) for curved structures during placement: click start point, click end point, then drag midpoint to set curvature (sagitta); derive radius and center per spatial-math-specification.md § Arc Geometry. Note: A is also context-sensitive during path drawing (paths-borders.md "## Curved Segment") — pressing A while a path is active switches the next segment to curved mode; that behavior is wired in the Path Drawing feature below
- [ ] Implement collision per category: `boundary` — blocks all element placement; `container` — accepts plants, allows terrain inside; `surface` — blocks terrain painting; `overhead` — non-blocking, plants and paths pass through; `feature`/`furniture` — blocks structures and paths
- [ ] Register in structures render layer slot; render per type appearance
- [ ] Call `pushHistory()` on placement, resize, rotate
- [ ] Wire S shortcut to structure tool; A shortcut to arc tool; wire structure types to left palette

---

#### Feature: Path Drawing [ ]

**Status:** `todo`
**Spec:** `docs/frontend/paths-borders.md` — full file
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Arc Geometry`, `## Path Segment Connectivity`, `## Path Width Rendering`
**Load hint:** `grep -n "Path Segment\|shared endpoint\|offset curve\|strokeWidthCm\|closed\|implicit" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement path tool: activated from side palette (no keyboard shortcut)
- [ ] Implement polyline drawing: click to place start, click to add points, click near start or press "Done" to close
- [ ] Implement arc segment on placement: while placing a new point, drag to set curvature of the incoming segment (sagitta-based); straight by default. Wire A key to toggle the next segment into curved mode when path drawing is active (A is context-sensitive: structure tool when idle, curved-segment switch when path drawing is in progress)
- [ ] Implement post-placement segment toggle: click a segment in inspector to toggle straight↔curved
- [ ] Store segments: ordered points array with shared endpoints (no duplicate point storage); `closed` boolean flag for implicit closing segment (not a stored segment)
- [ ] Implement path width rendering: `strokeWidthCm` rendered proportionally in world coordinates; use thick stroke or offset curve approach per spatial-math-specification.md § Path Width Rendering
- [ ] Enforce collision: paths blocked by structures (`boundary`, `feature`, `furniture` categories); allowed on terrain; coexist with plants and labels
- [ ] Register in paths render layer slot
- [ ] Call `pushHistory()` on path completion (not per-point)
- [ ] Wire paths tool to side palette

---

#### Feature: Label Placement [ ]

**Status:** `todo`
**Spec:** `docs/frontend/labels.md` — full file
**Load hint:** `grep -n "placement\|snap\|Alt\|double.click\|edit mode\|Escape\|resize\|wrap\|font\|align\|inspector" docs/frontend/labels.md`

##### Tasks

- [ ] Implement label tool (T): click to place text input at cursor; free placement by default (no snap); Alt enables snap (call `snapPoint()`)
- [ ] Implement inline edit mode: active on placement; double-click to re-enter; Escape or click-outside saves and exits
- [ ] Implement text box resize: drag corner/edge handles to resize; text wraps inside box; snap ON during resize; Alt disables snap (snap-system.md § Alt Modifier Behavior)
- [ ] Expose styling in inspector: font size (4–200px), color (hex), text alignment (left/center/right), bold, italic, font family
- [ ] Labels have no rotation, no collision constraints (non-physical annotations)
- [ ] Register in labels render layer slot
- [ ] Call `pushHistory()` on placement and on style/text change
- [ ] Wire T shortcut to label tool

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Plan B owns all five element types together | Consistent placement feel, collision enforcement, and snap integration are easier with one owner |

---

## Agent Log

```
2026-04-06 — PLAN-B initialized. Waiting on PLAN-A completion before starting.
```
