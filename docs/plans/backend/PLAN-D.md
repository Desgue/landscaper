# PLAN-D — Multi-Photo Yard Input

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan adds multi-photo support (1–4 yard photos per request). Does NOT cover prompt quality tuning (see `prompt-plan.md`).
> For cross-plan context, see `docs/plans/backend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm PLAN-A, PLAN-B, and PLAN-C are `done`** before starting any work here.
2. **Confirm `prompt-plan.md` Phase 1 (ThinkingConfig + test fixes) is done** — multi-photo changes the prompt preamble and Gemini client, which must be stable first.
3. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line.

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
| **Plan ID** | `PLAN-D` |
| **Title** | Multi-Photo Yard Input |
| **Scope** | Expand `yard_photo` from single base64 string to array of 1–4 photos. Update validation, pipeline, Gemini client, prompt preamble, and tests. Excludes frontend changes. |
| **Depends on** | PLAN-C, prompt-plan Phase 1 |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-07 |

---

## SDK Research Findings

The genai v1.52.1 SDK has **no hard limit** on input parts — `Content.Parts` is `[]*Part`. Model-side limits:

- `gemini-3.1-flash-image-preview`: up to **14 reference images** for best results
- `gemini-3-pro-image-preview`: up to **14 reference images**

**Earlier inputs have more influence** on the output. The segmentation map should always be the first image (slot 1).

There is **no API parameter** to control reference image influence strength — only prompt engineering.

### Slot Allocation Strategy

| Slot | Content | Required? |
|------|---------|-----------|
| 1 | Segmap PNG | Always |
| 2–5 | Yard photos (1–4) | Optional |
| 6+ | Reserved for future (material swatches, style refs) | Not in scope |

We cap at **4 yard photos** (not 14) to leave room for future features and keep request sizes manageable. 4 photos is enough for front/back/left/right coverage of a yard.

### Interleaved Part Ordering

Each photo gets its own instruction text immediately before the blob, following the pattern established in the prompt refactor:

```
[segmap_instruction] [segmap_blob]
[photo_1_instruction] [photo_1_blob]
[photo_2_instruction] [photo_2_blob]
...
[scene_prompt]
```

Photo instructions should indicate position context when available:
- Single photo: `"This image is a real photograph of the yard."`
- Multiple photos: `"This is yard photo 1 of N."` (model infers angle/perspective from content)

---

## Context Map

```bash
# Current yard_photo handling:
grep -n "yard_photo\|YardPhoto\|yardPhoto" internal/handler/validate.go internal/handler/generate.go internal/gemini/client.go

# Current prompt parts:
grep -n "YardPhotoInstruction\|PromptParts" internal/prompt/builder.go

# API contract:
grep -n "yard_photo" docs/backend/api-contract.md

# Model types:
grep -n "YardPhoto\|GenerateRequest" internal/model/request.go
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `docs/backend/api-contract.md` | `yard_photo` field spec, validation rules | `grep -n "yard_photo" docs/backend/api-contract.md` |
| `docs/backend/gemini-client.md` | Parts assembly, request construction | Full read |
| `docs/backend/prompt-construction.md` | Yard photo instruction text | `grep -n "Yard Photo" docs/backend/prompt-construction.md` |
| `internal/handler/validate.go` | `YardPhotoData` struct, base64 decode, magic bytes | Full read of yard_photo section |
| `internal/gemini/client.go` | Parts interleaving | Full read |

---

## Phase D1 — API & Validation [ ]

> Change the API to accept an array of yard photos. Maintain backward compatibility with single-string format.

---

#### Feature: Multi-Photo API Contract [ ]

**Status:** `todo`
**Spec:** `docs/backend/api-contract.md` — to be updated
**Load hint:** `grep -n "yard_photo" docs/backend/api-contract.md`

##### Tasks

- [ ] Change `yard_photo` field type: accept both `string` (single photo, backward compat) and `string[]` (array of photos)
- [ ] Update `GenerateRequest` in `internal/model/request.go` — use `json.RawMessage` for `yard_photo` to handle both string and array
- [ ] Update `YardPhotoData` struct to `[]PhotoEntry` where `PhotoEntry` has `Bytes []byte` and `MIMEType string`
- [ ] Update validation in `internal/handler/validate.go`:
  - If `yard_photo` is a string: decode as single photo (existing logic), return `[]PhotoEntry` with 1 entry
  - If `yard_photo` is an array: decode each element, validate each (base64 + magic bytes)
  - If any photo in array is invalid: reject entire request with 400 `"invalid yard_photo"`
  - If array has > 4 entries: reject with 400 `"too many yard photos (max 4)"`
  - If array is empty: treat as no photos
- [ ] Update `docs/backend/api-contract.md` with new field spec and validation rules

##### Decisions

_None yet._

---

## Phase D2 — Pipeline & Prompt [ ]

> Wire multi-photo through the pipeline and adapt prompt instructions.

---

#### Feature: Multi-Photo Gemini Client [ ]

**Status:** `todo`
**Spec:** `docs/backend/gemini-client.md` — to be updated
**Load hint:** `grep -n "parts\|yardPhoto" internal/gemini/client.go`

##### Tasks

- [ ] Update `gemini.Generate` signature: replace `yardPhotoBytes []byte, yardPhotoMIMEType string` with `photos []PhotoEntry`
- [ ] Assemble parts with interleaved text+blob per photo:
  ```
  [segmap_instruction] [segmap_blob]
  [photo_1_instruction] [photo_1_blob]
  [photo_2_instruction] [photo_2_blob]
  ...
  [scene_prompt]
  ```
- [ ] Update handler to pass `[]PhotoEntry` through pipeline
- [ ] Update `GeminiFunc` type signature in handler
- [ ] Update `docs/backend/gemini-client.md` with new parts assembly spec

##### Decisions

_None yet._

---

#### Feature: Multi-Photo Prompt Adaptation [ ]

**Status:** `todo`
**Spec:** `docs/backend/prompt-construction.md` — to be updated
**Load hint:** `grep -n "YardPhotoInstruction" internal/prompt/builder.go`

##### Tasks

- [ ] Update `Build` to accept photo count instead of `hasYardPhoto bool`
- [ ] Update `PromptParts.YardPhotoInstruction` to return a slice of instructions (one per photo)
- [ ] Single photo instruction: `"This image is a real photograph of the yard. Match the perspective, camera angle, lighting, and surroundings."`
- [ ] Multi-photo instruction: `"This is yard photo N of M. Use all yard photos together to understand the yard's perspective, lighting, and surroundings from different angles."`
- [ ] Update `docs/backend/prompt-construction.md`

##### Decisions

_None yet._

---

## Phase D3 — Tests & Verification [ ]

> Integration tests and test script updates.

---

#### Feature: Multi-Photo Tests [ ]

**Status:** `todo`
**Spec:** N/A — new tests
**Load hint:** N/A

##### Tasks

- [ ] Write unit test: single string `yard_photo` still works (backward compat)
- [ ] Write unit test: `yard_photo` as array with 1 photo
- [ ] Write unit test: `yard_photo` as array with 2 photos
- [ ] Write unit test: `yard_photo` as array with 4 photos (max)
- [ ] Write unit test: `yard_photo` as array with 5 photos → 400 `"too many yard photos (max 4)"`
- [ ] Write unit test: `yard_photo` as array with 1 valid + 1 invalid → 400 `"invalid yard_photo"`
- [ ] Write unit test: `yard_photo` as empty array → treated as no photos
- [ ] Update `scripts/test-api.sh` to test sending 2 photos in array format
- [ ] Write integration test verifying both photos reach Gemini client via recording mock

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Cap at 4 yard photos, not 14 | 4 covers front/back/left/right. Leaves headroom for future material/style reference images. Keeps request size manageable (~3MB per photo × 4 = 12MB + segmap within 10MB limit needs review). |
| 2026-04-07 | Backward compat: accept string or array | Existing frontend sends single string. Array support is additive. Avoids breaking change. |
| 2026-04-07 | Interleave instruction text per photo | SDK research confirms earlier inputs have more influence. Each photo with adjacent instruction helps model understand its role. |
| 2026-04-07 | Separated from prompt-plan.md | Multi-photo is a distinct feature with its own API/validation/pipeline changes. Prompt quality fixes should land independently. |

---

## Agent Log

```
2026-04-07 — PLAN-D initialized as multi-photo only (prompt quality moved to prompt-plan.md). SDK research confirmed: 14 image limit, no reference strength control, interleaved text+blob pattern works. Capped at 4 photos for practical reasons.
```
