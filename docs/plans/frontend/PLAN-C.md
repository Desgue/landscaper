# PLAN-C — Editing Engine

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> Covers everything that manipulates existing canvas content: selection, editing, organization.
> **Requires PLAN-A and PLAN-B to be `done` before starting.**

---

## Agent Protocol

### Reading This Plan

1. **Verify PLAN-A and PLAN-B are done** before starting. Check both plan headers.
2. **Assume these contracts from upstream plans:**
   - PLAN-A: `toScreen()`, `toWorld()`, `snapPoint()`, `pushHistory()`, `markDirty()`, render pipeline layer slots
   - PLAN-B: every element has `id`, `type`, `x`, `y`, `layerId`, `groupId`, `locked`; `hitTest(element, x, y)` and `getAABB(element)` available; selection priority constants exported
3. **Inspector panel hooks.** PLAN-D will inject cost, area/perimeter, and journal entries into the inspector. Implement the inspector panel with named extension slots for these (see `## Inspector Hooks Contract`).
4. **Phases are sequential within this plan.** Selection (Phase C1) before Organization (Phase C2) — groups rely on selection behavior.

### Updating This Plan

- `[ ]` → `[x]` when done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath.
- Feature done → `**Status:** done` + badge `[x]`.
- Phase done → phase badge `[x]`.
- Append to `## Decision Log` for decisions; `## Agent Log` for milestones.

### Inspector Hooks Contract

The inspector panel must expose these named slots so PLAN-D can inject without modifying PLAN-C's code:

- `inspector:cost` — read-only derived cost (filled by PLAN-D)
- `inspector:geometry` — area, perimeter, volume for applicable element types (filled by PLAN-D)
- `inspector:journal` — linked journal entries list (filled by PLAN-D)

Implement these as empty React context slots (or equivalent) with a `registerInspectorSection(slotName, component)` API.

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
| **Plan ID** | `PLAN-C` |
| **Title** | Editing Engine |
| **Scope** | Select tool · move · copy/paste · delete · inspector panel · eraser · layer management · groups. No new element types created here. |
| **Depends on** | PLAN-A (blocking), PLAN-B (blocking) |
| **Unblocks** | PLAN-D (soft — inspector hooks needed for D's injection), PLAN-E (full dependency) |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# Selection priority order:
grep -n "selection priority\|Selection Priority\|dimensions.*labels.*plants" docs/frontend/canvas-viewport.md

# Box-select algorithm (fully enclosed vs partial):
grep -n "box.select\|Box Select\|fully enclosed\|partial\|AABB overlap" docs/frontend/spatial-math-specification.md

# Layer lock and visibility rules:
grep -n "locked\|Locked\|visible\|Visible\|pass.through\|effective lock" docs/frontend/layers-groups.md

# Group AABB and resize math:
grep -n "Group\|AABB\|proportional\|scale\|double.click\|Escape" docs/frontend/layers-groups.md

# Undo/redo model:
grep -n "undo\|Undo\|redo\|history\|ring buffer\|200" docs/frontend/persistence-projects.md

# Inspector fields per element type:
grep -n "Inspector\|inspector\|layer dropdown\|cost\|area\|perimeter\|journal" docs/frontend/selection-manipulation.md
```

| Doc | Owns | When to load |
|-----|------|-------------|
| `docs/frontend/selection-manipulation.md` | Select, box-select, move, copy/paste, undo, inspector spec | Full read — this plan owns the entire doc |
| `docs/frontend/layers-groups.md` | Layer CRUD, group behavior, lock/visible semantics | Full read — this plan owns the entire doc |
| `docs/frontend/canvas-viewport.md` | Selection priority order, collision matrix | `grep -n "Selection Priority\|collision" docs/frontend/canvas-viewport.md` |
| `docs/frontend/spatial-math-specification.md` | Box-select algorithm, hit testing, group AABB, rotation math | `grep -n "^##\|^###" docs/frontend/spatial-math-specification.md` then read target section |
| `docs/frontend/keyboard-shortcuts.md` | Select (V), eraser (E), group (Ctrl+Shift+G/U), undo (Ctrl+Z) | `grep -n "V\|E\|Ctrl\|select\|group\|undo\|copy\|paste\|delete" docs/frontend/keyboard-shortcuts.md` |
| `docs/frontend/data-schema.md` | Layer and Group schema | `grep -n "Layer\|Group\|layerId\|groupId" docs/frontend/data-schema.md` |
| `docs/frontend/cost-tracking.md` | What inspector:cost slot must receive (for stub design) | `grep -n "inspector\|Inspector\|per.element" docs/frontend/cost-tracking.md` |
| `docs/frontend/measurement-dimensions.md` | What inspector:geometry slot must receive (for stub design) | `grep -n "inspector\|area\|perimeter" docs/frontend/measurement-dimensions.md` |

---

## Phase C1 — Selection & Manipulation [ ]

> The core editing loop: select, move, copy, paste, delete, inspect.

---

#### Feature: Select Tool [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md` → `## Select Tool`, `## Box Select`
**Also see:** `docs/frontend/canvas-viewport.md` → `## Selection Priority`
**Load hint:** `grep -n "selection priority\|Tab\|box.select\|multi.select\|Shift\|pass.through\|locked" docs/frontend/selection-manipulation.md`

##### Tasks

- [ ] Implement single-click select: use selection priority order from canvas-viewport.md (`dimensions > labels > plants > structures > paths > terrain > yardBoundary`); call `hitTest()` from PLAN-B per element
- [ ] Implement locked element pass-through: if topmost element is locked (`layer.locked OR element.locked`), treat click as if that element is absent and re-run priority check
- [ ] Implement Shift+click multi-select: additive toggle (Shift+clicking a selected element deselects it)
- [ ] Implement box-select: drag on empty canvas area; default = only fully enclosed elements; Shift held during drag = partial intersection allowed; use `getAABB()` from PLAN-B
- [ ] Implement Tab cycling: each Tab press at the same canvas position cycles to the next lower-priority element at that point
- [ ] Implement group selection: clicking any group member selects the whole group; double-click enters individual-edit mode (click/move/delete individual elements); Escape exits group edit
- [ ] Wire V shortcut to select tool

---

#### Feature: Move / Copy / Paste / Delete [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md` → `## Move`, `## Copy and Paste`, `## Delete`, `## Rotation`
**Load hint:** `grep -n "Move\|Alt.drag\|snap\|Copy\|Paste\|cursor\|offset\|Delete\|Backspace\|rotation\|rotate" docs/frontend/selection-manipulation.md`

##### Tasks

- [ ] Implement move: drag selected element(s); free movement by default; Alt+drag enables snap — call `snapPoint()` with move context (Alt modifier rule)
- [ ] Implement delete: Delete or Backspace removes all currently selected elements; call `pushHistory()` once for the batch
- [ ] Implement copy: Ctrl+C captures snapshot of selected elements (deep copy of data, new IDs on paste)
- [ ] Implement paste: Ctrl+V; pasted elements form a group centered at current cursor position, snapped to 10cm grid; call `pushHistory()`
- [ ] Implement structure rotation: drag rotation handle; free (no snap); call `pushHistory()` on release
- [ ] All operations call `markDirty()` after `pushHistory()`

---

#### Feature: Inspector Panel [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md` → `## Inspector Panel`
**Also see:** `docs/frontend/layers-groups.md` (layer dropdown), `docs/frontend/cost-tracking.md` (cost slot), `docs/frontend/measurement-dimensions.md` (geometry slot), `docs/frontend/journal.md` (journal slot)
**Load hint:** `grep -n "inspector\|Inspector\|layer dropdown\|multi.select\|bulk.edit\|shared properties" docs/frontend/selection-manipulation.md`

##### Tasks

- [ ] Render inspector panel in right sidebar when one or more elements are selected; collapse when nothing selected
- [ ] Single-select: show all editable properties for the selected element type (name, type-specific fields from data-schema.md)
- [ ] Show layer dropdown: list all layers; changing layer updates `element.layerId`; call `pushHistory()`
- [ ] Multi-select inspector: show only shared properties (e.g., layer); support bulk-edit for those fields
- [ ] Implement `registerInspectorSection(slotName, component)` API — registers a React component (or equivalent) into a named slot rendered below core properties
- [ ] Pre-create named slots: `inspector:cost`, `inspector:geometry`, `inspector:journal` — render as empty until PLAN-D registers implementations
- [ ] Call `markDirty()` on every inspector edit

---

#### Feature: Eraser Tool [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md` → `## Eraser Tool`
**Also see:** `docs/frontend/canvas-viewport.md` → `## Selection Priority`
**Load hint:** `grep -n "Eraser\|eraser\|topmost\|priority\|locked" docs/frontend/selection-manipulation.md`

##### Tasks

- [ ] Implement eraser tool (E): click removes the topmost unlocked element at cursor using the same priority order as selection
- [ ] Respect locked elements: skip locked elements in the priority stack; remove the topmost unlocked one
- [ ] Call `pushHistory()` on each erase; call `markDirty()`
- [ ] Wire E shortcut to eraser tool

---

## Phase C2 — Organization [ ]

> Layer management and groups. Depends on Phase C1 (selection behavior is a prerequisite for group click behavior).

---

#### Feature: Layer Management [ ]

**Status:** `todo`
**Spec:** `docs/frontend/layers-groups.md` → `## Layer Model`, `## Layer Panel`, `## Layer Operations`
**Load hint:** `grep -n "default layer\|active layer\|visibility\|locked\|merge down\|delete layer\|select all\|reorder" docs/frontend/layers-groups.md`

##### Tasks

- [ ] Implement layer data model: each element has exactly one `layerId`; a default layer always exists and cannot be deleted (can be renamed); new elements are placed on the active layer
- [ ] Implement layers panel UI: list all layers; show visibility toggle, lock toggle, name; indicate active layer
- [ ] Implement layer CRUD: create (new layer above active), rename (inline edit), delete (elements move to default layer, confirmation required), merge down (combine with layer below), reorder (drag)
- [ ] Implement layer visibility: hidden layer's elements not rendered and not selectable; include in export and JSON; cost exclusion handled by PLAN-D
- [ ] Implement layer lock: locked layer's elements are visible but not selectable or editable; click events pass through as if they don't exist
- [ ] Implement effective lock: `effective_locked = layer.locked OR element.locked`; per-element `locked` field also editable from inspector
- [ ] "Select all on layer" in layer context menu: selects all unlocked elements on that layer
- [ ] All layer operations call `pushHistory()` and `markDirty()`

---

#### Feature: Groups [ ]

**Status:** `todo`
**Spec:** `docs/frontend/layers-groups.md` → `## Grouping`, `## Group Behavior`, `## Ungroup`
**Load hint:** `grep -n "Group\|Ctrl.Shift.G\|Ctrl.Shift.U\|AABB\|proportional\|double.click\|Escape\|nesting\|flat\|box.select" docs/frontend/layers-groups.md`

##### Tasks

- [ ] Implement group creation: Ctrl+Shift+G on selected elements (min 2); all members must share the same layer; create `Group` record with new UUID and member IDs
- [ ] Compute group AABB from union of member `getAABB()` results
- [ ] Implement group selection (integrates with Phase C1 select tool): click any member → select whole group; double-click → enter individual-edit mode; Escape → exit
- [ ] Implement group operations: move (all members move together), delete (all members removed, group record removed), copy/paste (new group with new IDs)
- [ ] Implement group resize: drag AABB corner handle; scale all members proportionally from AABB center
- [ ] Implement box-select group rule: if any member's AABB is fully enclosed by the selection box, select the entire group
- [ ] Implement ungroup: Ctrl+Shift+U; removes Group record, members remain as individual elements
- [ ] Groups are flat — creating a group from elements that include group members flattens them; no nested groups
- [ ] All operations call `pushHistory()` and `markDirty()`

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Inspector uses named slot registration API | Allows PLAN-D to inject without creating a circular dependency on PLAN-C |

---

## Agent Log

```
2026-04-06 — PLAN-C initialized. Waiting on PLAN-A and PLAN-B completion before starting.
```
