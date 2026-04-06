# Garden Planner — Plan Template

> **This is a template.** To create a real plan, copy this file, rename it (e.g. `PLAN_feature-name.md`), and follow the instructions in every `<!-- ADAPT: … -->` comment. Delete all `<!-- ADAPT -->` comments and this notice when done.

---

## How to Adapt This Template

Read this section once, then delete it from the real plan.

1. **Fill `## Plan Header`** — set a meaningful title, scope, and start date.
2. **Fill `## Context Map`** — list only the docs and sections an agent will actually need. Use the grep hints so agents can load targeted context without reading whole files.
3. **Define Phases in `## Phases`** — group features into sequential phases. A phase is done only when every feature inside it is `done`.
4. **Break each feature into atomic Tasks** — a task maps to roughly one agent session or one PR. Keep tasks small enough that a single agent can complete one without needing to re-read the whole plan.
5. **Remove placeholder text** — every `<!-- ADAPT -->` block must be replaced with real content. The plan is not ready until no placeholder text remains.
6. **Register the plan** — add a one-line entry to `docs/INDEX.md` pointing to this file.

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

<!-- ADAPT: fill all fields -->

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-XXX` |
| **Title** | _Short descriptive title_ |
| **Scope** | _One sentence: what this plan covers and what it explicitly excludes_ |
| **Status** | `in-progress` |
| **Started** | YYYY-MM-DD |
| **Last updated** | YYYY-MM-DD |
| **Phases** | Phase 1 · Phase 2 · … |

---

## Context Map

> This section maps each spec document to the grep commands and section anchors that load targeted context. Agents must use these hints instead of reading full files.

<!-- ADAPT: list only the docs relevant to this plan. Remove rows for unneeded docs. -->

### How to load a specific section

```bash
# Read a specific section from a doc (replace FILE and HEADING as needed):
grep -n "## Section Name" docs/frontend/FILE.md          # find the line number
# then read from that line number in the file

# Search for a concept across all docs:
grep -rn "CONCEPT" docs/

# Find all references to a data type:
grep -rn "TypeName" docs/
```

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/frontend/data-schema.md` | All JSON shapes, field names, types, registry formats | `grep -n "^##" docs/frontend/data-schema.md` to list sections; read only the section for your element type |
| `docs/frontend/spatial-math-specification.md` | All geometry algorithms, formulas, coordinate transforms | `grep -n "^##\|^###" docs/frontend/spatial-math-specification.md` then read only the relevant algorithm section |
| `docs/frontend/canvas-viewport.md` | Render layer order, coordinate system, collision matrix, zoom rules | Full read recommended once per agent session (short file) |
| `docs/frontend/snap-system.md` | Snap priority, tolerance, Alt modifier behavior, geometry snap types | Full read recommended once per agent session |
| `docs/frontend/keyboard-shortcuts.md` | Every keyboard binding in the app (SSoT) | `grep -n "SHORTCUT_NAME\|Tool\|Toggle" docs/frontend/keyboard-shortcuts.md` |
| `docs/frontend/visual-design.md` | Layout, colors, typography, UI component positions | `grep -n "## " docs/frontend/visual-design.md` then read relevant section |
| `docs/frontend/persistence-projects.md` | Auto-save, export/import, undo history, project lifecycle | `grep -n "## " docs/frontend/persistence-projects.md` then read relevant section |
| `docs/frontend/layers-groups.md` | Layer CRUD, group behavior, locked/visible semantics | Full read recommended once per relevant task |
| `docs/frontend/selection-manipulation.md` | Select, move, copy, paste, undo, inspector, group interaction | `grep -n "^###" docs/frontend/selection-manipulation.md` |
| `docs/frontend/terrain.md` | Terrain paint tool, brush, cell rules, collision | Full read recommended once per relevant task |
| `docs/frontend/plants.md` | Plant placement, visual sizing, status lifecycle, collision | Full read recommended once per relevant task |
| `docs/frontend/structures.md` | Structure placement, arc tool, categories, collision | Full read recommended once per relevant task |
| `docs/frontend/paths-borders.md` | Path drawing, arc segments, width rendering, collision | Full read recommended once per relevant task |
| `docs/frontend/labels.md` | Text annotations, styling, no-collision rule | Full read recommended once per relevant task |
| `docs/frontend/yard-setup.md` | Boundary vertex placement, edge editing, arc edges | Full read recommended once per relevant task |
| `docs/frontend/measurement-dimensions.md` | Measurement tool, persistent dimensions, area/perimeter | Full read recommended once per relevant task |
| `docs/frontend/journal.md` | Journal entries, element linking, weather, timeline views | Full read recommended once per relevant task |
| `docs/frontend/cost-tracking.md` | Cost derivation, summary grouping, hidden layer exclusion | Full read recommended once per relevant task |

---

## Phases

<!-- ADAPT: define your phases. Each phase has a status badge and contains features. -->

### Phase 1 — Name [ ]

> _One-sentence description of what this phase establishes and why it must come before Phase 2._

#### Feature: Name [ ]

**Status:** `todo`
**Spec:** `docs/frontend/FILE.md` → `## Section Name`
**Load hint:** `grep -n "## Section Name" docs/frontend/FILE.md`

##### Tasks

- [ ] Task description — _owner hint or dependency note if any_
- [ ] Task description
- [ ] Task description

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: Name [ ]

**Status:** `todo`
**Spec:** `docs/frontend/FILE.md` → `## Section Name`
**Load hint:** `grep -n "## Section Name" docs/frontend/FILE.md`

##### Tasks

- [ ] Task description
- [ ] Task description

##### Decisions

_None yet._

---

### Phase 2 — Name [ ]

> _Description._

<!-- ADAPT: repeat the feature block pattern above for each feature in this phase -->

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

<!-- ADAPT: delete this placeholder row and add real entries as implementation proceeds -->

| Date | Decision | Rationale |
|------|----------|-----------|
| YYYY-MM-DD | _What was decided_ | _Why — constraint, tradeoff, or spec ambiguity resolved_ |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

<!-- ADAPT: delete this placeholder entry -->

```
YYYY-MM-DD — [agent-session-id or description] — Plan initialized from template.
```
