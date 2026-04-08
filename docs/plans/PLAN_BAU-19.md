# Garden Planner — PLAN-BAU-19

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific doc sections into context. Do not read whole spec files unless the task explicitly requires it.
- **Check phase status first.** Scan `## Phases` top-to-bottom and find the first phase that is not `done`. Work within that phase only.
- **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating the Plan

- **After completing a task:** change its status line from `[ ]` to `[x]` and append `— done YYYY-MM-DD` to the task line.
- **After completing a feature:** change `Status:` from `todo` / `in-progress` to `done`.
- **After completing a phase:** change the phase header badge from `[ ]` to `[x]`.
- **When you make an architectural decision:** add an entry to `## Decision Log` in the format shown.
- **When you hit a blocker:** add a `Blocker:` note to the task and set its status checkbox to `[-]` (blocked). Notify via the log.
- **Never rewrite history.** Append to the Agent Log; do not edit previous entries.
- **Keep diffs small.** Only edit the lines that changed. Do not reformat or reorder unrelated sections.

### Status Vocabulary

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Done |
| `[-]`  | Blocked |

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-BAU-19` |
| **Title** | Tree/Shrub Plant Visibility Fix |
| **Scope** | Fix tree-category plants not rendering visibly on the canvas after placement; excludes sprite quality improvements (covered by BAU-27) |
| **Status** | `in-progress` |
| **Started** | 2026-04-08 |
| **Last updated** | 2026-04-08 |
| **Phases** | Phase 1 — Diagnose and Fix |

---

## Context Map

> This section maps each source file to the grep commands and line anchors an agent will need. Use these hints instead of reading full files.

### How to load a specific section

```bash
# Find a function by name in a source file:
grep -n "functionName" src/canvas-pixi/PlantRenderer.ts

# Find all visibility-related logic:
grep -n "visible\|visibility\|cull" src/canvas-pixi/PlantRenderer.ts

# Find where hasSpacingCollision is called:
grep -n "hasSpacingCollision" src/canvas-pixi/PlacementHandlers.ts

# Find tree entries in registry:
grep -n "growthForm.*tree\|category.*tree" src/data/builtinRegistries.ts

# Find all CATEGORY_COLORS usage:
grep -rn "CATEGORY_COLORS\|tree.*#\|#795548" src/canvas-pixi/textures/PlantSprites.ts
```

### Source File Registry

| File | What it owns | Load hint |
|------|-------------|-----------|
| `src/canvas-pixi/PlantRenderer.ts` | `effectiveRadius()` L96, `createPlantEntry()` L114, `updateElementVisibility()` L209, `rebuildFromStore()` L245 | Read lines 96–112 for radius logic; lines 209–238 for culling logic |
| `src/canvas-pixi/textures/PlantSprites.ts` | `CATEGORY_COLORS` L22, `drawTree()` L100, `generatePlantSprite()` L414 | Read lines 22–29 for color mapping; lines 100–142 for tree draw logic |
| `src/data/builtinRegistries.ts` | Tree registry entries with `canopyWidthCm` and `spacingCm` values | Read lines 97–138 for all tree entries |
| `src/canvas-pixi/PlacementHandlers.ts` | `hasSpacingCollision()` L54, plant placement handler L316–351 | Read lines 54–68 for collision math; lines 325–332 for call site |
| `docs/frontend/plants.md` | Plant placement spec, visual sizing rules, status lifecycle | Full read recommended once per relevant task |

---

## Background

**Problem:** Plants with `category: 'tree'` (oak, maple, birch, fruit-tree, ornamental-pear, japanese-maple) do not appear on the canvas after placement. Store confirms they are added (`plantCount` increments, `entries` map grows, container children increase) but nothing is visually rendered.

**Pipeline confirmed working:** InteractionManager dispatches click → PlantPlacement handler adds element to store → PlantRenderer rebuilds → `createPlantEntry()` runs → sprite added to container.

**Key data facts:**
- Tree `growthForm: 'tree'` routes through `effectiveRadius()` as `canopyWidthCm / 2`
- Oak: `canopyWidthCm: 800` → radius 400cm; Maple: 700 → 350cm; Birch: 500 → 250cm
- Collision check at placement uses `plantType.spacingCm` (800, 700, 500…), making most placements silently reject
- Tree `CATEGORY_COLORS` entry: `'#795548'` (brown) — similar to soil terrain color

**Possible causes (investigate in this order):**
1. **Viewport culling bug** — `updateElementVisibility()` may incorrectly set `visible = false` for large-radius plants
2. **Z-order / layer issue** — large sprites may render behind terrain or boundary layers
3. **Overflow dim overlay** — 45% alpha slate overlay for out-of-boundary placement may fully obscure trees
4. **Color camouflage** — tree brown (`#795548`) blends with soil terrain, appearing invisible at low zoom

---

## Phases

### Phase 1 — Diagnose and Fix [ ]

> Investigate all four possible causes in sequence, apply fixes for each confirmed root cause, and verify trees are visible and distinguishable at all zoom levels.

---

#### Feature: Diagnose viewport culling for large-radius plants [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/PlantRenderer.ts` → `updateElementVisibility()` L209

**Context:** After `rebuildFromStore()` sets `entry.sprite.visible = visible` (L295–299), it immediately calls `updateElementVisibility()` (L304). That function iterates entries and uses `el.x ± margin` against viewport world bounds. For an oak at radius 400cm with `CULLING_MARGIN = 200`, margin = 600cm. If the viewport world bounds are computed from `panX/panY/zoom` and the canvas just loaded at default zoom/pan, a plant at world origin `(0, 0)` should pass the bounds check — but verify this is actually happening.

**How culling can silently fail:** `updateElementVisibility()` calls `continue` when `layer && !layer.visible` (L222) but does NOT call `entry.sprite.visible = true` before that — it skips the whole visibility assignment. So if the layer IS visible but the element is at world origin and viewport bounds are wrong (e.g. negative world extents from an unexpected pan offset), `inViewport` could be `false`.

##### Tasks

- [ ] Add a temporary `console.log` in `updateElementVisibility()` that prints, for each entry: `elementId`, `el.x`, `el.y`, `radius`, `margin`, computed `worldLeft/worldRight/worldTop/worldBottom`, and the `inViewport` result. Place a tree, open DevTools console, and capture the output.
- [ ] Verify that `getViewportWorldBounds()` returns values consistent with the visible canvas area at default zoom and pan. Check whether `panX`, `panY` from `useViewportStore` use the same sign convention assumed in the formula (`worldLeft = -panX / zoom`).
- [ ] If `inViewport` is `false` for a plant visually inside the viewport, fix the bounds formula or the margin calculation and confirm trees become visible.
- [ ] Remove temporary console.log after confirming the fix.

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: Confirm z-ordering does not bury tree sprites [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/PlantRenderer.ts` → `createPlantEntry()` L114

**Context:** The z-sort key is `TYPE_PLANT * 1e10 + (el.y + radius)` where `TYPE_PLANT = 3`. Other renderers (terrain, boundary, structures) may assign overlapping or higher z-indices. If the PixiJS container does not have `sortableChildren = true`, `zIndex` values are ignored entirely and draw order is insertion order.

##### Tasks

- [ ] Search for where the plant renderer's `container` is created and passed in. Verify `container.sortableChildren = true` is set. `grep -n "sortableChildren\|createPlantRenderer" src/canvas-pixi/` across all files.
- [ ] Check what z-index ranges other layer renderers (terrain, boundary, structure, path) assign. Confirm `TYPE_PLANT = 3` places plants above terrain (expected z-band) and below UI overlays.
- [ ] If `sortableChildren` is missing, add it on the container before the first plant is added. If z-bands overlap with terrain or overflow layers, adjust `TYPE_PLANT` constant or the other renderer's constant so plants are above terrain.

##### Decisions

_None yet._

---

#### Feature: Investigate overflow dim overlay obscuring out-of-boundary placements [ ]

**Status:** `todo`
**File:** Search for overflow/dim overlay logic: `grep -rn "overflow\|dim\|slate\|alpha.*0\.45\|boundary.*overlay" src/canvas-pixi/`

**Context:** BAU-19 notes that a 45% alpha slate overlay is applied to plants placed outside the yard boundary. If the yard boundary is not yet set up in a new project, or if all placement coordinates fall outside the boundary polygon, the overlay could cover the entire canvas. This is distinct from `layer.visible` — it is a graphical overlay on the container or sprite alpha.

##### Tasks

- [ ] Locate the overflow dim overlay: find where it is applied (sprite alpha, container alpha, or separate overlay Graphics object). Read the logic that determines whether a plant is "inside" or "outside" the boundary.
- [ ] Test whether placing a tree inside a drawn yard boundary makes it visible. If trees appear inside a boundary but not outside, the overlay is the cause for the outside case — that is expected behavior, not a bug. Document this in the Decision Log and close the feature.
- [ ] If the overlay incorrectly marks all placements as outside (e.g. boundary polygon check is broken for large-radius plants), fix the containment test.

##### Decisions

_None yet._

---

#### Feature: Fix tree color camouflage against soil terrain [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/PlantSprites.ts` → `CATEGORY_COLORS` L22

**Context:** Tree color is `'#795548'` (brown), which is nearly identical to the soil terrain fill color `'#8B6E53'` used inside `drawVegetable()` and likely the terrain renderer. At low zoom (where large trees appear small), a brown circle on brown soil is invisible. The `drawTree()` function also draws blob clusters using `darkenByOffset(color, 25+)` which pushes the blobs even darker, making them indistinguishable from shadowed soil.

This fix is cosmetic differentiation only — sprite quality redesign is out of scope (BAU-27). The fix should change the base color to something visually distinct from soil while remaining botanically sensible (e.g. a mid-green for the leaf canopy).

##### Tasks

- [ ] Change `CATEGORY_COLORS['tree']` from `'#795548'` to a green that contrasts clearly against soil terrain. Candidate: `'#388E3C'` (dark green) or `'#558B2F'` (olive green). Verify the hue shift in `generatePlantSprite()` (±15 degrees from the base) does not produce a brown variant that re-introduces camouflage.
- [ ] Verify `drawTree()` still reads as a tree shape (not a vegetable) with the new color — the trunk circle (`'#5D4037'`) provides brown contrast internally, so the blobs can safely be green.
- [ ] After color change, place trees at several zoom levels (0.2×, 0.5×, 1×, 2×) and confirm they are visible and distinguishable from soil terrain at all levels.
- [ ] Update the texture atlas cache invalidation if plant sprites are cached by `plantTypeId` — the color change must produce new textures, not return stale cached ones. `grep -n "getPlantSprite\|cache\|atlas" src/canvas-pixi/textures/TextureAtlas.ts`

##### Decisions

_None yet._

---

#### Feature: Fix silent placement rejection from spacing collision [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/PlacementHandlers.ts` → `hasSpacingCollision()` L54, plant handler L329

**Context:** `hasSpacingCollision()` uses `plantType.spacingCm` as the collision radius (not `canopyWidthCm`). For Oak, `spacingCm = 800`. The collision formula is `minDist = (existingSpacing + newSpacing) / 2`. Two oaks require 800cm of separation from each other — effectively preventing placement in any canvas that is not enormous. The handler silently returns without user feedback (L329: `if (hasSpacingCollision(...)) return`).

This is a usability problem that prevents users from ever seeing trees: they click, nothing happens, and there is no error. Even if all visibility bugs above are fixed, users cannot place a second tree near the first.

##### Tasks

- [ ] Verify the silent rejection is happening: add a temporary `console.warn('[PlantPlacement] spacing collision rejected placement')` at L329 and attempt to place two oaks. Confirm the rejection fires.
- [ ] Add visible user feedback on spacing collision rejection. Preferred approach: emit a toast/notification via the existing notification system. `grep -rn "toast\|notify\|useNotif" src/` to find the notification API. Message: `"Cannot place here — too close to an existing plant (spacing: {X}cm required)"`.
- [ ] Evaluate whether `spacingCm` is the correct input for the collision check or whether it should use `canopyWidthCm` for trees. Trees have identical `spacingCm` and `canopyWidthCm` in `builtinRegistries.ts` (both 800 for oak), so the values are the same — but verify this is intentional per `docs/frontend/plants.md`. Document the decision.
- [ ] Remove temporary console.warn after notification is confirmed working.

##### Decisions

_None yet._

---

## Acceptance Criteria

All of the following must pass before Phase 1 is marked done:

- [ ] All tree-category plants (oak, maple, birch, fruit-tree, ornamental-pear, japanese-maple) render visibly when placed on an empty canvas at default zoom
- [ ] Trees are visually distinguishable from soil terrain at zoom levels 0.2×, 0.5×, 1×, and 2×
- [ ] Placement failure due to spacing collision shows user-visible feedback (toast or similar) instead of silently returning
- [ ] No regression: vegetable, herb, flower, fruit, and shrub plants continue to render correctly

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

| Date | Decision | Rationale |
|------|----------|-----------|

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-08 — Plan initialized. Four candidate root causes identified from BAU-19 investigation notes and source code audit.
```
