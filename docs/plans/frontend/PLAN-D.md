# PLAN-D — Intelligence Layer

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> Covers the "what does the app know about your garden" layer: measurement, journal, and cost.
> **Requires PLAN-A and PLAN-B done. PLAN-C inspector hooks are a soft dependency** (start with stubs if C is in progress).

---

## Agent Protocol

### Reading This Plan

1. **Verify PLAN-A and PLAN-B are done.** Check their plan headers.
2. **Check PLAN-C inspector status.** If `registerInspectorSection()` is not yet implemented, stub it locally and note the dependency in Agent Log. Do not block — implement math and data first, wire into inspector when C is ready.
3. **This plan is read-heavy.** These features read element data and surface derived values. You do not create primary spatial elements. Call `getAABB()`, `hitTest()`, and element data directly.
4. **Three independent workstreams.** Measurement, Journal, and Cost can be developed in parallel by different sub-agents once PLAN-B elements exist. Each has its own phase.

### Updating This Plan

- `[ ]` → `[x]` when done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath.
- Feature done → `**Status:** done` + badge `[x]`.
- Phase done → phase badge `[x]`.
- Append to `## Decision Log` for decisions; `## Agent Log` for milestones.

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
| **Plan ID** | `PLAN-D` |
| **Title** | Intelligence Layer |
| **Scope** | Measurement tool · persistent dimension elements · area/perimeter/volume · journal (entries, linking, timeline, weather) · cost derivation · cost summary panel |
| **Depends on** | PLAN-A (blocking), PLAN-B (blocking), PLAN-C inspector hooks (soft) |
| **Unblocks** | PLAN-E (full dependency) |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# Measurement and area formulas:
grep -n "Measurement\|Area\|Perimeter\|Shoelace\|volume\|depth\|arc length" docs/frontend/spatial-math-specification.md

# Dimension line rendering geometry:
grep -n "Dimension Line\|leader line\|arrowhead\|isosceles\|extension line\|centered text\|offset" docs/frontend/spatial-math-specification.md

# Linked dimension update algorithm:
grep -n "Linked Dimension\|auto.update\|stale\|deleted element" docs/frontend/spatial-math-specification.md

# Journal element linking algorithm:
grep -n "Journal.*Link\|Journal Element\|linkedElementIds\|bidirectional" docs/frontend/spatial-math-specification.md

# Cost formulas per element type:
grep -n "costPerUnit\|per m\|per plant\|per meter\|linear\|cost\|Cost" docs/frontend/cost-tracking.md

# Open-Meteo API integration:
grep -n "Open.Meteo\|API\|geolocation\|tempC\|condition\|humidity\|fetch" docs/frontend/journal.md
```

| Doc | Owns | When to load |
|-----|------|-------------|
| `docs/frontend/measurement-dimensions.md` | Measurement tool, dimension element, area/perimeter display, material estimates | Full read for Phase D1 |
| `docs/frontend/journal.md` | Journal entries, element linking, timeline, weather | Full read for Phase D2 |
| `docs/frontend/cost-tracking.md` | Cost model, calculation rules, summary panel | Full read for Phase D3 |
| `docs/frontend/spatial-math-specification.md` | Area/perimeter formulas, dimension rendering, journal linking algorithm | `grep -n "^##\|^###" docs/frontend/spatial-math-specification.md` then read target section |
| `docs/frontend/data-schema.md` | DimensionElement, JournalEntry, costPerUnit registry fields | `grep -n "Dimension\|Journal\|costPerUnit\|registry" docs/frontend/data-schema.md` |
| `docs/frontend/canvas-viewport.md` | Dimension render layer slot (top of stack) | `grep -n "dimension\|Dimension\|render layer" docs/frontend/canvas-viewport.md` |
| `docs/frontend/keyboard-shortcuts.md` | M shortcut (measurement tool) | `grep -n " M \| M$\|measurement" docs/frontend/keyboard-shortcuts.md` |
| `docs/frontend/layers-groups.md` | Layer visibility (cost exclusion) | `grep -n "visibility\|hidden\|cost" docs/frontend/layers-groups.md` |

---

## Phase D1 — Measurement & Dimensions [ ]

> Measurement tool, persistent annotations, and all area/perimeter/volume calculations.
> Area/perimeter values are exposed in the inspector's `inspector:geometry` slot (PLAN-C).

---

#### Feature: Measurement Tool [ ]

**Status:** `todo`
**Spec:** `docs/frontend/measurement-dimensions.md` → `## Measurement Tool`
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Measurement & Area Calculations`
**Load hint:** `grep -n "Measurement Tool\|two.point\|live.*tooltip\|dismiss\|keep\|persistent" docs/frontend/measurement-dimensions.md`

##### Tasks

- [ ] Implement measurement tool (M): click first point, click second point; show live distance tooltip attached to midpoint of the drawn line during placement
- [ ] Distance formula: `sqrt((x2-x1)² + (y2-y1)²)` formatted as meters with cm precision
- [ ] Snap: geometry snap active by default; Alt disables (call `snapPoint()` with measurement context)
- [ ] On second click: show inline options "Dismiss" (discard) and "Keep" (save as persistent dimension element)
- [ ] Wire M shortcut to measurement tool

---

#### Feature: Persistent Dimension Elements [ ]

**Status:** `todo`
**Spec:** `docs/frontend/measurement-dimensions.md` → `## Dimension Element`, `## Element Linking`
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Dimension Line Rendering`, `## Linked Dimension Updates`
**Load hint:** `grep -n "Dimension Line Rendering\|leader line\|extension line\|arrowhead\|isosceles\|offsetCm\|perpendicular" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement `DimensionElement` data model: `startPoint`, `endPoint`, `offsetCm` (signed perpendicular offset for leader line position), optional `linkedElementIds[]`
- [ ] Render dimension annotation per spatial-math-specification.md § Dimension Line Rendering:
  - Leader line: from startPoint to endPoint, offset perpendicularly by `offsetCm`
  - Extension lines: perpendicular from each original point to the leader line
  - Arrowheads: isosceles triangles at each leader line end
  - Text label: distance value centered on the leader line
- [ ] Implement optional element linking: when `linkedElementIds` is set, recalculate `startPoint`/`endPoint` whenever linked elements move or resize (use their AABB anchor points)
- [ ] Handle stale links: when a linked element is deleted, preserve the `linkedElementId` but show a "deleted element" indicator in the dimension tooltip
- [ ] Dimensions are selectable/movable/deletable like other elements; registered in the dimensions render layer slot (topmost, above all other elements)
- [ ] Call `pushHistory()` on creation and edits; call `markDirty()`

---

#### Feature: Area / Perimeter / Volume [ ]

**Status:** `todo`
**Spec:** `docs/frontend/measurement-dimensions.md` → `## Area & Perimeter Display`, `## Material Estimates`
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Area`, `## Perimeter`, `## Material Volume`
**Load hint:** `grep -n "Shoelace\|area\|arc.*area\|perimeter\|arc length\|volume\|depth.*area" docs/frontend/spatial-math-specification.md`

##### Tasks

- [ ] Implement Shoelace formula for polygon area: applies to terrain cell groups, straight-edged structures, closed straight paths, yard boundary
- [ ] Implement arc segment area contribution: integrate arc sector area into Shoelace for shapes with arc edges
- [ ] Implement perimeter: sum of edge lengths — straight edges use Euclidean distance; arc edges use `radius × angle` (arc length)
- [ ] Implement material volume: `volume_m³ = area_m² × depthCm / 100` for terrain and path elements that have a depth field
- [ ] Register these values into the inspector's `inspector:geometry` slot via `registerInspectorSection('inspector:geometry', GeometryPanel)` — applicable for terrain, structures, closed paths, yard boundary

---

## Phase D2 — Journal [ ]

> Project timeline with element linking and weather. Independent from Phase D1 — can run in parallel.

---

#### Feature: Journal Entry CRUD [ ]

**Status:** `todo`
**Spec:** `docs/frontend/journal.md` → `## Journal Entries`, `## Tags`
**Load hint:** `grep -n "Entry\|date\|title\|markdown\|tag\|auto.complete\|newest.first\|panel" docs/frontend/journal.md`

##### Tasks

- [ ] Implement `JournalEntry` in app state: `{ id, date, title, body (markdown), tags[], linkedElementIds[], weather? }`; `date` defaults to today
- [ ] Implement journal panel UI: toggleable side panel or modal; entry list newest-first, scrollable; create/edit/delete entry actions
- [ ] Tags: freeform text array; auto-complete suggestions from all tags used in the project
- [ ] Body: render markdown (bold, italic, lists, links at minimum); edit in a textarea or inline editor

---

#### Feature: Element Linking [ ]

**Status:** `todo`
**Spec:** `docs/frontend/journal.md` → `## Element Linking`
**Also see:** `docs/frontend/spatial-math-specification.md` → `## Journal Element Linking`
**Load hint:** `grep -n "linkedElementIds\|pre.selection\|type.to.search\|deleted element\|stale\|bidirectional" docs/frontend/journal.md`

##### Tasks

- [ ] Implement pre-selection linking: when a user opens "new entry" with elements selected, pre-populate `linkedElementIds` with those element IDs
- [ ] Implement in-entry element search: type-to-search by element type name or position to add links while editing an entry
- [ ] Handle deleted elements: if a `linkedElementId` no longer exists in `Project.elements`, show "deleted element" label (grayed, non-interactive) in the entry's linked elements list
- [ ] Register linked entries display in inspector's `inspector:journal` slot: for the selected element, show matching journal entries (titles, dates, clickable to open the entry)
- [ ] No bidirectional storage: links live only on journal entries; query by iterating entries to find those containing an element ID

---

#### Feature: Timeline & Calendar Views [ ]

**Status:** `todo`
**Spec:** `docs/frontend/journal.md` → `## Timeline Views`
**Load hint:** `grep -n "timeline\|calendar\|list view\|month grid\|click.*date\|filter" docs/frontend/journal.md`

##### Tasks

- [ ] Implement list view: all entries in newest-first order, scrollable, default view
- [ ] Implement calendar view: month grid; click a date cell to filter visible entries to that date; navigate months
- [ ] Toggle between list and calendar views (button or tab in journal panel)

---

#### Feature: Weather Snapshot [ ]

**Status:** `todo`
**Spec:** `docs/frontend/journal.md` → `## Weather Integration`
**Load hint:** `grep -n "Open.Meteo\|geolocation\|tempC\|condition\|humidity\|manual\|prompt\|fallback\|settings" docs/frontend/journal.md`

##### Tasks

- [ ] Implement optional weather field per entry: `{ tempC: number, condition: string, humidity: number }`
- [ ] Implement geolocation: browser `navigator.geolocation` prompt on first use; persist coordinates in `Project.uiState.location`; show manual entry fallback in settings if prompt denied
- [ ] Implement Open-Meteo API fetch: fetch historical weather for `entry.date` and stored coordinates (free API, no key required); populate weather fields on response
- [ ] Allow manual override: user can type weather values directly regardless of API result
- [ ] Render weather as a compact display line (temperature, condition icon, humidity) below the entry title when `weather` field is set

---

## Phase D3 — Cost Tracking [ ]

> Cost derivation and summary panel. Independent from D1 and D2 — can run in parallel.
> Requires `costPerUnit` fields from PLAN-B registries. Requires PLAN-C layer visibility for exclusion logic.

---

#### Feature: Cost Derivation [ ]

**Status:** `todo`
**Spec:** `docs/frontend/cost-tracking.md` → `## Cost Model`, `## Cost Calculation Rules`
**Also see:** `docs/frontend/data-schema.md` → registry type `costPerUnit` fields
**Load hint:** `grep -n "costPerUnit\|per m²\|per plant\|linear meter\|per structure\|registry.only\|not.*editable" docs/frontend/cost-tracking.md`

##### Tasks

- [ ] Implement cost computation functions (pure, no side effects):
  - Terrain: `cost = areaM² × terrainType.costPerUnit` (area from Phase D1 Shoelace)
  - Plant: `cost = element.quantity × plantType.costPerUnit`
  - Structure: `cost = structureType.costPerUnit` (flat per-instance, no size factor)
  - Path: `cost = perimeterM × pathType.costPerUnit` (linear meter, uses path perimeter from D1)
- [ ] Cost reads from registry only — no per-instance override
- [ ] Implement hidden layer exclusion: elements on hidden layers default to excluded from cost; toggle per-layer in cost summary panel (D3 next task)
- [ ] Register per-element cost in inspector's `inspector:cost` slot via `registerInspectorSection('inspector:cost', CostPanel)` — show `currencySymbol + cost.toFixed(2)` read-only

---

#### Feature: Cost Summary Panel [ ]

**Status:** `todo`
**Spec:** `docs/frontend/cost-tracking.md` → `## Cost Summary Panel`
**Load hint:** `grep -n "summary\|Summary\|group.*type\|layer breakdown\|grand total\|toggle.*hidden\|currency" docs/frontend/cost-tracking.md`

##### Tasks

- [ ] Implement cost summary panel (accessible from toolbar menu or dedicated button)
- [ ] Aggregate costs by element type: terrain subtotal, plants subtotal, structures subtotal, paths subtotal, grand total
- [ ] Optional layer breakdown: expandable per-type section showing cost per layer
- [ ] Hidden layer toggle: checkbox per layer to include/exclude hidden layers from the calculation; default excluded
- [ ] Grand total updates reactively as layer toggles change

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | D1/D2/D3 can be parallelized after B is done | No inter-dependencies among measurement, journal, and cost; only shared dependency is element data from B |
| 2026-04-06 | Cost and geometry inject into PLAN-C inspector slots | Avoids circular dependency; C owns the panel frame, D owns the content |

---

## Agent Log

```
2026-04-06 — PLAN-D initialized. Waiting on PLAN-A and PLAN-B completion. PLAN-C inspector hooks soft dependency.
```
