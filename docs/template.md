# Documentation Template — Agentic-First Specification

This template defines the writing conventions for this project's documentation. Every doc targets an AI agent as its primary reader: precise, deterministic, cross-referenced, and unambiguous. Human readability is a secondary benefit, not the design goal.

---

## Principles

1. **Single source of truth (SSoT)**: every concept has exactly one owning doc. All other docs delegate to it via cross-ref. If you're writing something that already exists elsewhere, point to it — don't restate it.

2. **Precise cross-references**: always link as `[target-doc.md "## Section Name"]`. Never use vague references ("see the other doc", "as described elsewhere"). The agent must be able to resolve every reference to an exact file + heading pair.

3. **Deterministic language**: use exact values, formulas, enums, and thresholds. Avoid hedging ("usually", "might", "could consider"). State what happens, not what might happen.

4. **Edge cases inline**: every behavioral boundary must be explicitly handled in the section where it arises. No "undefined behavior" — if an input is degenerate, state the handling (reject, clamp, fallback, skip).

5. **Behavior separate from computation**: domain docs describe *what* the user sees. `spatial-math-specification.md` describes *how* to compute it. Domain docs cross-ref the math spec for algorithms; the math spec cross-refs domain docs for behavioral context.

6. **No duplication, only delegation**: when a concept spans multiple docs, one doc owns the canonical definition and declares SSoT. Others state a brief summary (1-2 sentences max) and cross-ref the owner. The summary exists so an agent reading the referring doc has enough context to decide whether to follow the link.

7. **Consistent skeleton per doc type**: agents predict where information lives. Element docs always have Placement, Inspector, Built-in Types, Collision Rules in the same order. Breaking the skeleton forces the agent to search instead of navigate.

8. **Tables for structured decisions**: collision matrices, modifier behavior, validation defaults, enum mappings — anything with discrete cases belongs in a table, not prose paragraphs.

9. **Code blocks for algorithms**: pseudocode or formulas go in fenced code blocks. Inline formulas (e.g., `distance < threshold`) are acceptable for single expressions within prose.

---

## Document Types

### Element Doc

One per canvas element type (terrain, plants, structures, paths, labels). Describes the behavioral spec for that element from the user's perspective.

### System Doc

Cross-cutting mechanics shared by all elements (canvas/viewport, snap system, selection/manipulation). Owns rules that apply across element types.

### Reference Doc

Lookup tables, data schemas, algorithms, keyboard shortcuts. Declares SSoT explicitly. Other docs point here — these docs rarely point outward.

### Feature Doc

Workflows and non-element features (journal, yard setup, persistence, visual design). Describes user flows and UI behavior.

---

## Element Doc Skeleton

```markdown
# {Element Name}

{One-sentence role: what it is + where it sits in the render layer order.}
{Cross-ref → canvas-viewport.md "## Render Layer Order".}

## Placement

{Tool shortcut (letter key). Interaction model (click, drag, stamp mode).}
{Default snap behavior → snap-system.md "## Grid Snap".}
{Alt modifier behavior → snap-system.md "## Alt Modifier Behavior".}

## {Core Mechanics — one or more sections unique to this element}

{Unique behavior for this element type. Deterministic language. Exact values.}
{Simple formulas inline. Complex algorithms → spatial-math-specification.md.}
{Edge cases: table or explicit list. Never leave behavior undefined.}

## Inspector

{What properties are shown when this element is selected. Which are editable.}
{Always end with: "All element types can be linked to journal entries [journal.md "## Element Linking"]."}

## Built-in Types

{Concrete list of shipped types with key dimensions.}
{"Extensible via registry."}

## Collision Rules

{This element's row from the collision matrix.}
{Cross-ref → canvas-viewport.md "## Collision Rules" for the full matrix.}
{State: what blocks it, what it's allowed on, what it coexists with.}
{Invalid placement feedback: "red ghost preview, placement blocked until valid."}
```

---

## System Doc Skeleton

```markdown
# {System Name}

{Role statement. What this system controls across all element types.}
{If this is the canonical source: "This is the single source of truth for {X}. Other docs reference this file."}

## {Concept}

{Prose explanation of the rule or mechanic.}
{Cross-ref to element docs for element-specific behavior.}

### {Sub-concept}

{Detailed behavior. Tables for multi-case decisions (e.g., Alt modifier per tool).}
{Exact thresholds, defaults, ranges.}
{Cross-ref → spatial-math-specification.md for computation details.}
```

---

## Reference Doc Skeleton

```markdown
# {Reference Name}

{Role statement. SSoT declaration.}
{"This is the single source of truth for {X} — {downstream consequence, e.g., 'TypeScript types should mirror this schema exactly'}."}

## {Top-level concept}

{Schema, table, or algorithm.}

### {Sub-section}

```json or ```pseudocode
{Exact data shape, formula, or algorithm}
```

{Validation rules, defaults, edge cases — all in tables where possible.}
{Cross-ref → domain docs for behavioral context.}
```

---

## Feature Doc Skeleton

```markdown
# {Feature Name}

{One-sentence role: what this feature does and when the user encounters it.}

## {User Flow Step or Sub-feature}

{What the user does. What the system responds with.}
{Exact values, not vague descriptions.}
{Cross-ref → related system/element/reference docs.}

## {Additional Sections as needed}

{Follow the same patterns: deterministic, cross-referenced, edge-cases-inline.}
```

---

## Cross-Reference Format

Always use:

```
[filename.md "## Section Name"]
```

Examples:
- `[spatial-math-specification.md "## 5. Arc Geometry"]`
- `[canvas-viewport.md "## Collision Rules"]`
- `[snap-system.md "## Alt Modifier Behavior"]`
- `[data-schema.md "### Plant Type"]`

Rules:
- The heading must match the target exactly (case, punctuation, numbering).
- Use `##` for top-level sections, `###` for sub-sections — match the actual heading depth.
- One cross-ref per concept. Don't scatter multiple links to the same section in the same paragraph.

---

## SSoT Declaration Format

When a doc owns a concept that other docs reference, state it explicitly:

```
This is the single source of truth for {X}. Other docs reference this file.
```

or within a section:

```
This is the canonical definition of {X} — [other-doc.md "## Section"] cross-references this section.
```

The owning doc has the full definition. Referring docs carry a 1-2 sentence summary plus the cross-ref.

---

## Writing Rules

### Values and thresholds
- State exact numbers: `10cm`, `8px`, `[0.05, 10.0]`, `spacingCm / 2`.
- State units always: cm, px, degrees, milliseconds.
- State ranges with bracket notation: `[min, max]` inclusive, `(min, max)` exclusive.

### Edge cases
- List in a table when there are 3+ cases.
- Use inline prose for 1-2 cases.
- Every edge case must have an explicit handling: reject, clamp, fallback, skip, warn, or treat-as.

### Formulas and algorithms
- Simple (single expression): inline code within prose, e.g., `snap(value) = Math.round(value / increment) * increment`.
- Complex (multi-step): fenced code block with pseudocode. Language-agnostic — no TypeScript-specific syntax in specs.
- Implementation-specific notes (Konva, Canvas 2D): allowed after the language-agnostic algorithm, clearly marked.

### Tables
- Use for: collision matrices, modifier behavior per context, validation defaults, enum mappings, element-type comparisons.
- Every table cell must be a concrete value or a cross-ref — no empty cells, no "TBD".

### Prose style
- Active voice, present tense.
- Short sentences. One idea per sentence.
- Lead with the behavior, follow with the constraint or cross-ref.
- No preamble ("In order to...", "It should be noted that...").
- No hedging ("usually", "probably", "in most cases").

---

## Anti-Patterns

| Don't | Do instead |
|-------|------------|
| "See the snap documentation" | `[snap-system.md "## Grid Snap"]` |
| "The element is placed approximately at the grid" | "The element snaps to 10cm increments [snap-system.md '## Grid Snap']" |
| "Collision behavior is complex" | State the exact collision rule with formula |
| "TBD" or "TODO" in a shipped spec | Decide now or mark as "Not in MVP — deferred to Phase N" with a one-line scope statement |
| Restating a full algorithm from another doc | 1-2 sentence summary + cross-ref to the owning doc |
| "Elements render in the correct order" | "Labels render above plants and below the selection UI [canvas-viewport.md '## Render Layer Order']" |
| Empty table cells | Explicit value, "N/A", or "See {cross-ref}" |
