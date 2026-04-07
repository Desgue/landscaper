# PLAN-F — Generation Quality & Consistency

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan fixes SDK misconfigurations, restructures the prompt for base vs themed modes,
> and adds multi-candidate generation with compliance scoring.
> Depends on PLAN-A, PLAN-B, PLAN-C, PLAN-D being `done`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm PLAN-A through PLAN-D are `done`** before starting any work here.
2. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line.
3. **Sequential phases.** F1 must land before F2 (SDK config must be stable). F2 before F3 (prompt structure must exist). F3 before F4 (prohibitions inform scoring).

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.

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
| **Plan ID** | `PLAN-F` |
| **Title** | Generation Quality & Consistency |
| **Scope** | SDK config fixes (ResponseModalities, Temperature, SystemInstruction), prompt restructure (base vs themed mode), enhanced prohibitions, multi-candidate generation with compliance scoring. |
| **Depends on** | PLAN-D |
| **Status** | `done` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |

---

## Context Map

```bash
# Gemini client config:
grep -n "GenerateContentConfig\|ResponseModalities\|Temperature\|ThinkingConfig" internal/gemini/client.go

# Prompt builder:
grep -n "func Build\|buildSubject\|buildStyle\|buildProhibitions" internal/prompt/builder.go

# Model types:
grep -n "EffectiveOptions\|PromptParts" internal/model/request.go

# Options resolution:
grep -n "resolveOptions\|GardenStyle\|TimeOfDay" internal/handler/validate.go
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `internal/gemini/client.go` | Gemini SDK wrapper, config | Full read |
| `internal/prompt/builder.go` | Prompt assembly | Full read |
| `internal/model/request.go` | All types | Full read |
| `internal/handler/validate.go` | Options resolution, defaults | `grep -n "resolveOptions" internal/handler/validate.go` |

---

## Motivation

The current implementation produces inconsistent outputs across runs, bakes creative theming
(garden style, time of day) into the mandatory prompt, and uses suboptimal SDK configuration.
Research on Gemini native image generation revealed:

1. **ResponseModalities `["IMAGE"]` is invalid** — both `"TEXT"` and `"IMAGE"` are required
2. **Temperature is not set** — this is the primary consistency lever (seed is ineffective on autoregressive models)
3. **SystemInstruction is unused** — ideal for persistent "you are a landscape renderer" grounding
4. **Creative theming is mandatory** — should be optional; base mode should use neutral documentary language
5. **Missing prohibitions** — no people/animals, no HDR, no elements not in map
6. **Single candidate** — generating 2–3 and scoring for layout compliance would improve reliability

---

## Phase F1 — SDK Configuration Fixes [x]

> Fix critical SDK misconfigurations. Low risk, high impact.

---

#### Feature: ResponseModalities Fix [ ]

**Status:** `todo`
**Load hint:** `grep -n "ResponseModalities" internal/gemini/client.go`

##### Tasks

- [ ] Change `ResponseModalities: []string{"IMAGE"}` to `[]string{"TEXT", "IMAGE"}` in `internal/gemini/client.go`
- [ ] Update response extraction to skip text parts and find image part (already done — loop checks `InlineData != nil`)
- [ ] Update tests if any assert on ResponseModalities value

---

#### Feature: Temperature Parameter [ ]

**Status:** `todo`
**Load hint:** `grep -n "Temperature\|GenerateContentConfig" internal/gemini/client.go`

##### Tasks

- [ ] Add `Temperature: float32Ptr(0.3)` to `GenerateContentConfig` in `internal/gemini/client.go`
- [ ] Add `float32Ptr` helper function in `internal/gemini/client.go`
- [ ] Update tests to verify temperature is set

---

#### Feature: SystemInstruction [ ]

**Status:** `todo`
**Load hint:** `grep -n "SystemInstruction" internal/gemini/client.go`

##### Tasks

- [ ] Add `SystemInstruction` to `GenerateContentConfig` with persistent grounding text:
  ```
  You are a photorealistic landscape design renderer. Your task is to generate a realistic
  photograph of a garden based on a color-coded layout map and optional yard photographs.
  Follow the layout map positions exactly. Do not add, remove, or reposition any elements.
  Every element in your output must correspond to a shape in the layout map.
  ```
- [ ] Update tests if needed

---

#### Feature: ThinkingConfig Verification [ ]

**Status:** `todo`
**Load hint:** `grep -n "ThinkingConfig\|ThinkingLevel" internal/gemini/client.go`

##### Tasks

- [ ] Keep ThinkingConfig HIGH — it was added based on prompt-plan.md and reportedly helps with spatial reasoning. If the model doesn't support it, the SDK silently ignores it (no error).
- [ ] Add a code comment documenting this: "ThinkingConfig may be a no-op on some model variants; kept for models that support it"

---

## Phase F2 — Prompt Restructure: Base vs Themed [x]

> Separate creative theming from the core layout-following prompt. Base mode uses neutral
> documentary photography language. Theme mode is opt-in when the user explicitly provides
> garden_style or time_of_day.

---

#### Feature: Theme Detection in Options [ ]

**Status:** `todo`
**Load hint:** `grep -n "EffectiveOptions\|resolveOptions" internal/model/request.go internal/handler/validate.go`

##### Tasks

- [ ] Add `Themed bool` field to `EffectiveOptions` in `internal/model/request.go`
- [ ] In `resolveOptions` (`internal/handler/validate.go`): set `Themed = true` if the client explicitly provided `garden_style` OR `time_of_day` in the request options
- [ ] When `Themed == false`: set `GardenStyle` to `""` (unused in base mode), keep `TimeOfDay` as `""`, keep derived `Season` for subtle realism cue
- [ ] When `Themed == true`: apply current defaults (`garden_style: "garden"`, `time_of_day: "golden hour"`) as before
- [ ] Update tests for resolveOptions

---

#### Feature: Base vs Themed Prompt Assembly [ ]

**Status:** `todo`
**Load hint:** `grep -n "buildSubject\|buildStyle" internal/prompt/builder.go`

##### Tasks

- [ ] Refactor `buildSubject` to branch on `Themed`:
  - Base: `"A residential garden photographed in {season} conditions"` — season from lat/date derivation for subtle realism
  - Themed: `"A {garden_style} garden, {season}, {time_of_day}"` — current behavior
- [ ] Refactor `buildStyle` to branch on `Themed`:
  - Base: `"Residential landscape photograph, {viewpoint_phrase}, overcast natural daylight, neutral color grade, sharp detail, no post-processing."` — quantified, documentary
  - Themed: current behavior with `"High-end residential landscape photography"` phrasing
- [ ] Update prompt builder tests for both modes
- [ ] Update integration tests in generate_test.go

---

## Phase F3 — Enhanced Prohibitions [x]

> Add missing prohibitions and quantified language for better layout compliance.

---

#### Feature: Additional Prohibitions [ ]

**Status:** `todo`
**Load hint:** `grep -n "buildProhibitions\|NO " internal/prompt/builder.go`

##### Tasks

- [ ] Add to prohibition block: `"NO people. NO animals. NO pets."`
- [ ] Add to prohibition block: `"NO HDR processing. NO artificial color grading. NO lens flare."`
- [ ] Add to prohibition block (reinforce constraint): `"NO elements, structures, or plants not shown in the layout map."`
- [ ] Update tests

---

## Phase F4 — Multi-Candidate with Compliance Scoring [x]

> Generate multiple candidates and score them for layout compliance using Gemini image understanding.

---

#### Feature: CandidateCount Support [ ]

**Status:** `todo`
**Load hint:** `grep -n "CandidateCount\|GenerateContentConfig" internal/gemini/client.go`

##### Tasks

- [ ] Research: verify `CandidateCount` works with image generation on the current model (it may only work for text)
- [ ] If supported: set `CandidateCount: int32Ptr(3)` in GenerateContentConfig
- [ ] Extract all image candidates from response (not just first)
- [ ] If NOT supported: implement sequential generation (call Generate 2–3 times with slight temperature variation)

---

#### Feature: Layout Compliance Scoring [ ]

**Status:** `todo`
**Load hint:** N/A — new file

##### Tasks

- [ ] Create `internal/gemini/score.go` with a `ScoreCompliance` function
- [ ] ScoreCompliance sends the generated image + segmap to Gemini (text-only mode) asking:
  ```
  Compare this generated landscape image against the layout map. Score 1-10 on:
  1. Spatial accuracy: are elements in the correct positions?
  2. Element completeness: are all layout map elements present?
  3. No hallucinations: are there elements NOT in the layout map?
  Return JSON: {"spatial": N, "completeness": N, "no_hallucinations": N, "total": N}
  ```
- [ ] Parse JSON response into a score struct
- [ ] Add timeout (10s) for scoring call — fast model (flash) is sufficient
- [ ] Write unit tests with mock

---

#### Feature: Best Candidate Selection [ ]

**Status:** `todo`
**Load hint:** `grep -n "func Generate" internal/gemini/client.go internal/handler/generate.go`

##### Tasks

- [ ] Update `gemini.Generate` to return multiple candidates (or call it N times)
- [ ] Score each candidate via `ScoreCompliance`
- [ ] Return the candidate with highest total score
- [ ] Log scoring results for debugging
- [ ] If all scores are below threshold (e.g., < 5), return the best anyway with a warning log
- [ ] Add `candidates` field to logging (how many generated, scores, which was selected)
- [ ] Update handler integration
- [ ] Update tests

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | ResponseModalities must include TEXT | Google docs: image-only `["IMAGE"]` is not valid for native Gemini image gen; both TEXT and IMAGE required |
| 2026-04-07 | Temperature 0.3 as default | Research: primary consistency lever for autoregressive models. Seed is ineffective. 0.3 tightens distribution without killing variety. |
| 2026-04-07 | SystemInstruction for persistent grounding | Separates "who you are" from per-request scene description. Reduces prompt complexity and improves layout compliance. |
| 2026-04-07 | `Themed bool` on EffectiveOptions | Clean separation: base mode (neutral documentary) vs themed (creative styling). Determined by whether user explicitly sent garden_style or time_of_day. |
| 2026-04-07 | Multi-candidate + scoring over single generation | User confirmed interest. Gemini image understanding can score spatial compliance. Cost is 2-3x generation + cheap scoring calls, but reliability improvement is significant. |

---

## Agent Log

```
2026-04-07 — PLAN-F initialized. Four phases: SDK config fixes, prompt base/themed restructure, enhanced prohibitions, multi-candidate scoring. Based on Gemini native image gen research findings.
2026-04-07 — Phase F1 done: ResponseModalities fixed to ["TEXT","IMAGE"], Temperature 0.3 added, SystemInstruction grounding text added, ThinkingConfig comment added. MIME allowlist defense-in-depth added to handler. Code+Security reviewers approved.
2026-04-07 — Phase F2 done: Themed bool added to EffectiveOptions, detected from explicit garden_style/time_of_day. Base mode uses neutral documentary language ("Residential landscape photograph, overcast natural daylight, neutral color grade"). Themed mode preserves existing creative styling. "garden garden" edge case fixed. Code+Security reviewers approved.
2026-04-07 — Phase F3 done: Added 7 new prohibitions (NO people/animals/pets, NO HDR/color grading/lens flare, NO elements not in layout map). Tests added.
2026-04-07 — Phase F4 done: Multi-candidate generation (3 concurrent) with compliance scoring via Gemini image understanding. ScoreCompliance function scores spatial accuracy, completeness, and hallucination freedom. Best candidate selected by total score. Graceful degradation on scoring failure. Reviewer fixes: robust JSON extraction (brace-matching instead of fence stripping), correct rounding formula, context cancellation check before scoring. Code+Security reviewers approved.
2026-04-07 — PLAN-F complete. All 4 phases implemented. Race-detector clean. 107+ tests passing.
```
