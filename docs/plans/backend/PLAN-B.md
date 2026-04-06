# PLAN-B — Pipeline

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan implements the four-stage image generation pipeline. Depends on PLAN-A (Foundation) being `done`.
> For cross-plan context, see `docs/plans/backend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm PLAN-A is `done`** before starting any work here. Check `docs/plans/backend/PLAN-A.md` Plan Header status.
2. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line. Do not read full spec files unless marked "full file".
3. **Sequential stages.** Stages build on each other: Stage 1 (filter) feeds Stage 2 (render) and Stage 3 (prompt). Stage 4 (Gemini) consumes outputs from Stages 2 and 3.

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.

### Interfaces This Plan Must Publish

Before marking this plan `done`, verify these contracts are fulfilled (see `docs/plans/backend/IMPLEMENTATION_PLAN.md § Cross-Plan Interface Contracts`):

- [x] Element filter function: project payload + effective options → filtered elements with resolved registry entries — done 2026-04-06
- [x] `internal/render/segmap.go`: filtered elements + yard boundary + aspect ratio → `[]byte` PNG — done 2026-04-06
- [x] `internal/prompt/builder.go`: filtered elements + effective options + location → prompt string — done 2026-04-06
- [x] `internal/gemini/client.go`: prompt + segmap PNG + optional yard photo + options → `[]byte` PNG or error — done 2026-04-06

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
| **Title** | Pipeline |
| **Scope** | Four-stage image generation pipeline: element filtering, segmentation render, prompt construction, Gemini client. No HTTP routing, validation, or integration wiring. |
| **Depends on** | PLAN-A |
| **Blocks** | PLAN-C |
| **Status** | `done` |
| **Started** | 2026-04-06 |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# List sections in a backend doc:
grep -n "^## " docs/backend/FILE.md

# Find segmentation color table entries:
grep -n "#[0-9A-Fa-f]\{6\}" docs/backend/segmentation-render.md

# Find prompt template strings:
grep -n "photorealistic\|garden_style\|season\|viewpoint" docs/backend/prompt-construction.md

# Find Gemini SDK usage patterns:
grep -n "genai\.\|GenerateContent\|InlineData\|Modality" docs/backend/gemini-client.md

# Find element type handling:
grep -n "terrain\|plant\|structure\|path\|label\|dimension" docs/backend/segmentation-render.md
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `docs/backend/go-types.md` | All Go struct definitions; field-to-JSON mapping | Full read recommended once — defines all types used across the pipeline |
| `docs/backend/segmentation-render.md` | Stage 1 element filtering, Stage 2 canvas render, color table, arc approximation, footprint sizing | `grep -n "^## \|^### " docs/backend/segmentation-render.md` then read relevant stage |
| `docs/backend/prompt-construction.md` | Stage 3 prompt assembly, season derivation, element collection caps, style suffixes, yard photo preamble | `grep -n "^## " docs/backend/prompt-construction.md` then read relevant section |
| `docs/backend/gemini-client.md` | Stage 4 Gemini SDK wrapper, request construction, response extraction, error handling | Full read recommended — short file, all sections relevant to Stage 4 |

---

## Phase B1 — Data Preparation [x]

> Implements Stage 1 (element filtering with registry resolution). This is the input pipeline that feeds all rendering and prompt stages.

---

#### Feature: Element Filtering (Stage 1) [x]

**Status:** `done`
**Spec:** `docs/backend/segmentation-render.md` → `## Stage 1: Element Filtering`
**Load hint:** `grep -n "Stage 1\|Filtering Rules\|Registry Lookup\|Layer Visibility" docs/backend/segmentation-render.md`

##### Tasks

- [x] Implement layer visibility check: build map of `layerID → visible` from `project.layers`; handle empty layers array (treat all elements as visible) — done 2026-04-06
- [x] Implement filtering rules: exclude hidden-layer elements, always exclude labels and dimensions, exclude `status: "removed"` plants, exclude `status: "planned"` plants when `include_planned` is false — done 2026-04-06
- [x] Implement registry lookup for each element type: resolve `plantTypeId`, `structureTypeId`, `terrainTypeId`, `pathTypeId` against `project.registries` — done 2026-04-06
- [x] On registry miss: exclude element, log WARN with `request_id`, `element_id`, and `missing_type_id` — done 2026-04-06
- [x] Return filtered element list with resolved registry entries attached for Stage 2 and Stage 3 — done 2026-04-06
- [x] Write unit tests: hidden layer exclusion, removed plant exclusion, planned plant with include_planned false/true, label/dimension exclusion, registry miss warning, empty layers array, locked layer inclusion — done 2026-04-06

##### Decisions

_None yet._

---

## Phase B2 — Rendering [x]

> Implements Stage 2 (2D segmentation map render). Depends on Stage 1 filtered output. This is the most complex stage — pure 2D graphics with `fogleman/gg`.

---

#### Feature: Segmentation Render (Stage 2) [x]

**Status:** `done`
**Spec:** `docs/backend/segmentation-render.md` → `## Stage 2: 2D Segmentation Render`, `## Element 2D Footprints`, `## Segmentation Color Table`, `## Arc Approximation`
**Load hint:** `grep -n "Canvas Setup\|Draw Order\|Color Table\|Footprint\|Arc Approximation" docs/backend/segmentation-render.md`

##### Tasks

- [x] Implement canvas setup: compute AABB from yard boundary vertices, add 10% padding, scale to output resolution with uniform scale, letterbox with `#000000` if aspect ratios differ — done 2026-04-06
- [x] Implement yard boundary polygon fill: handle line and arc edges; arc edges approximated as 12-segment polyline using the arc approximation algorithm from spec — done 2026-04-06
- [x] Implement draw order: void fill → yard boundary → terrain cells → paths → structures → plants — done 2026-04-06
- [x] Implement terrain cell rendering: 100x100cm filled rectangles at cell position, color from segmentation color table with category fallback — done 2026-04-06
- [x] Implement plant rendering: circle footprints using `spacingCm`/`canopyWidthCm`/`trunkWidthCm` per footprint table; tree dual-shape (trunk then canopy); quantity renders as 1 shape — done 2026-04-06
- [x] Implement structure rendering: filled rectangles with rotation for straight shapes; arc band for curved shapes — done 2026-04-06
- [x] Implement path rendering: stroked polyline/arc at `strokeWidthCm` width; use `pathType.defaultWidthCm` as fallback when `strokeWidthCm` is zero; handle closed paths (connect last point to first) — done 2026-04-06
- [x] Implement full segmentation color table as constants; implement fallback rules for unknown terrain types, missing material fields — done 2026-04-06
- [x] Output PNG to `[]byte` in memory using `fogleman/gg` — no temp files — done 2026-04-06
- [x] Write unit tests: AABB calculation, arc approximation output, color table lookups, fallback colors — done 2026-04-06

##### Decisions

_None yet._

---

## Phase B3 — Prompt & Gemini [x]

> Implements Stage 3 (prompt construction) and Stage 4 (Gemini client). Stage 3 is pure string assembly. Stage 4 wraps the Gemini SDK.

---

#### Feature: Prompt Construction (Stage 3) [x]

**Status:** `done`
**Spec:** `docs/backend/prompt-construction.md` — full file
**Load hint:** `grep -n "^## " docs/backend/prompt-construction.md`

##### Tasks

- [x] Implement subject template: `"A {garden_style} garden, {season}, {time_of_day}"` — done 2026-04-06
- [x] Implement season derivation: hemisphere detection from `project.location.lat`, date-to-season mapping for northern and southern hemispheres, fallback to `"summer"` — done 2026-04-06
- [x] Implement element collection: resolve names from registries (plants, structures, terrain — not paths), collect unique names only, apply cap rules (plants: 7, structures: 3, terrain: 2, total: 12) — done 2026-04-06
- [x] Implement style suffix: fixed string per viewpoint value (`eye-level`, `elevated`, `isometric`); all include `"not a floor plan"` directive — done 2026-04-06
- [x] Implement yard photo preamble: prepend fixed context sentence when `yard_photo` is present; omit entirely when absent — done 2026-04-06
- [x] Implement full prompt assembly: `{preamble} {subject}. {elements}. {style}.` — omit elements part when no names remain after filtering — done 2026-04-06
- [x] Write unit tests: subject string formatting, season derivation for each hemisphere, element cap enforcement, prompt with/without elements, prompt with/without yard photo preamble — done 2026-04-06

##### Decisions

_None yet._

---

#### Feature: Gemini Client (Stage 4) [x]

**Status:** `done`
**Spec:** `docs/backend/gemini-client.md` — full file
**Load hint:** `grep -n "^## " docs/backend/gemini-client.md`

##### Tasks

- [x] Implement client initialization: `genai.NewClient` with API key from env, 60-second context timeout per request — done 2026-04-06
- [x] Implement request construction: assemble parts array (text prompt, segmentation map PNG blob, optional yard photo blob); set `ResponseModalities` to image, `ImageConfig` with aspect ratio mapping (`square` → `1:1`, `landscape` → `16:9`, `portrait` → `9:16`) and `ImageSize: "1K"`; set `Seed` only when not `-1` — done 2026-04-06
- [x] Implement response extraction: iterate `resp.Candidates[0].Content.Parts`, find first `InlineData` with `MIMEType == "image/png"`, return data bytes — done 2026-04-06
- [x] Implement error handling: context deadline exceeded → HTTP 504 `"image generation timed out"`, API error → HTTP 502 `"Nano Banana error: {upstream message}"`, no image part → HTTP 502 `"no image in Nano Banana response"` — done 2026-04-06
- [x] Write unit tests: aspect ratio mapping, seed omission when -1, error classification — done 2026-04-06

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Split from monolithic PLAN-BACKEND Phase 2 into standalone PLAN-B | Enables focused agent work on pipeline stages without foundation or integration noise |
| 2026-04-06 | Filter package at `internal/filter/` instead of `internal/handler/` | Clean separation: handler validates, filter resolves — render and prompt both import filter |
| 2026-04-06 | Added `ColorNoMaterial` constant for nil-material fallback (#888888) | Avoids semantic coupling between path and structure nil-material cases |
| 2026-04-06 | Adapted Gemini SDK types from spec examples to match actual genai@v1.52.1 API | Spec examples use `[]genai.Modality` and `int32` Seed, but actual SDK uses `[]string` and `*int32` |

---

## Agent Log

```
2026-04-06 — PLAN-B initialized from PLAN-BACKEND Phase 2. Three phases: B1 (Data Prep), B2 (Rendering), B3 (Prompt & Gemini). All todo.
2026-04-06 — Phase B1 done: internal/filter/filter.go with FilteredElement type and Filter function. 13 unit tests passing. Reviewed by Code, Doc Sync, Security — unanimous approval.
2026-04-06 — Phase B2 done: internal/render/segmap.go with full segmentation render. 25+ color table, arc approximation, all element types. Reviewed — 1 rejection (nil-material constant), fixed, re-approved unanimously.
2026-04-06 — Phase B3 done: internal/prompt/builder.go (prompt assembly + season derivation) and internal/gemini/client.go (Gemini SDK wrapper). Adapted SDK types from spec examples to match actual genai@v1.52.1 API. Reviewed — all approved.
2026-04-06 — PLAN-B complete. All 4 pipeline stages implemented with tests. All cross-plan interface contracts fulfilled.
```
