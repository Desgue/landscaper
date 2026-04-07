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
| **Status** | `done` |
| **Started** | 2026-04-07 |
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

## Phase D1 — API & Validation [x]

> Change the API to accept an array of yard photos. Maintain backward compatibility with single-string format.

---

#### Feature: Multi-Photo API Contract [x]

**Status:** `done`
**Spec:** `docs/backend/api-contract.md` — updated
**Load hint:** `grep -n "yard_photo" docs/backend/api-contract.md`

##### Tasks

- [x] Change `yard_photo` field type: accept both `string` (single photo, backward compat) and `string[]` (array of photos) — done 2026-04-07
- [x] Update `GenerateRequest` in `internal/model/request.go` — use `json.RawMessage` for `yard_photo` to handle both string and array — done 2026-04-07
- [x] Update `YardPhotoData` struct to `[]PhotoEntry` where `PhotoEntry` has `Bytes []byte` and `MIMEType string` — done 2026-04-07
- [x] Update validation in `internal/handler/validate.go` — done 2026-04-07:
  - If `yard_photo` is a string: decode as single photo (existing logic), return `[]PhotoEntry` with 1 entry
  - If `yard_photo` is an array: decode each element, validate each (base64 + magic bytes)
  - If any photo in array is invalid: reject entire request with 400 `"invalid yard_photo"`
  - If array has > 4 entries: reject with 400 `"too many yard photos (max 4)"`
  - If array is empty: treat as no photos
  - Added per-photo 3 MB decoded size cap with `"yard photo too large"` error
- [x] Update `docs/backend/api-contract.md` with new field spec and validation rules — done 2026-04-07

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Added 3 MB per-photo decoded size cap (`maxPhotoBytes`) | Security review finding: without a cap, 4 concurrent requests with max-size photos could allocate ~375 MB decoded heap. 3 MB per photo is generous for yard photos while bounding memory. |

---

## Phase D2 — Pipeline & Prompt [x]

> Wire multi-photo through the pipeline and adapt prompt instructions.

---

#### Feature: Multi-Photo Gemini Client [x]

**Status:** `done`
**Spec:** `docs/backend/gemini-client.md` — updated
**Load hint:** `grep -n "parts\|yardPhoto" internal/gemini/client.go`

##### Tasks

- [x] Update `gemini.Generate` signature: replace `yardPhotoBytes []byte, yardPhotoMIMEType string` with `photos []model.PhotoEntry` — done 2026-04-07
- [x] Assemble parts with interleaved text+blob per photo — done 2026-04-07
- [x] Update handler to pass `[]PhotoEntry` through pipeline — done 2026-04-07
- [x] Update `GeminiFunc` type signature in handler — done 2026-04-07
- [x] Update `docs/backend/gemini-client.md` with new parts assembly spec — done 2026-04-07

##### Decisions

_None._

---

#### Feature: Multi-Photo Prompt Adaptation [x]

**Status:** `done`
**Spec:** `docs/backend/prompt-construction.md` — updated
**Load hint:** `grep -n "YardPhotoInstruction" internal/prompt/builder.go`

##### Tasks

- [x] Update `Build` to accept photo count instead of `hasYardPhoto bool` — done 2026-04-07
- [x] Update `PromptParts` to include `YardPhotoInstructions []string` (one per photo) — done 2026-04-07
- [x] Single photo instruction: uses existing `yardPhotoInstruction` constant — done 2026-04-07
- [x] Multi-photo instruction: `"This is yard photo N of M. Use all yard photos together to understand the yard's perspective, lighting, and surroundings from different angles."` — done 2026-04-07
- [x] Update `docs/backend/prompt-construction.md` — done 2026-04-07

##### Decisions

_None._

---

## Phase D3 — Tests & Verification [x]

> Integration tests and test script updates.

---

#### Feature: Multi-Photo Tests [x]

**Status:** `done`
**Spec:** N/A — new tests
**Load hint:** N/A

##### Tasks

- [x] Write unit test: single string `yard_photo` still works (backward compat) — done 2026-04-07
- [x] Write unit test: `yard_photo` as array with 1 photo — done 2026-04-07
- [x] Write unit test: `yard_photo` as array with 2 photos — done 2026-04-07
- [x] Write unit test: `yard_photo` as array with 4 photos (max) — done 2026-04-07
- [x] Write unit test: `yard_photo` as array with 5 photos → 400 `"too many yard photos (max 4)"` — done 2026-04-07
- [x] Write unit test: `yard_photo` as array with 1 valid + 1 invalid → 400 `"invalid yard_photo"` — done 2026-04-07
- [x] Write unit test: `yard_photo` as empty array → treated as no photos — done 2026-04-07
- [x] Write unit test: per-photo size cap (`yard photo too large`) — done 2026-04-07
- [x] Write unit test: null `yard_photo` → treated as no photos — done 2026-04-07
- [x] Write integration test verifying both photos reach Gemini client via recording mock — done 2026-04-07
- [x] Write integration test verifying per-photo prompt instructions for 3 photos — done 2026-04-07
- [x] Write prompt builder tests for multi-photo instructions (0, 1, 2, 4 photos) — done 2026-04-07
- [-] Update `scripts/test-api.sh` to test sending 2 photos in array format
  > Blocker: `scripts/test-api.sh` does not exist. Manual testing via curl is sufficient.

##### Decisions

_None._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Cap at 4 yard photos, not 14 | 4 covers front/back/left/right. Leaves headroom for future material/style reference images. Keeps request size manageable (~3MB per photo × 4 = 12MB + segmap within 10MB limit needs review). |
| 2026-04-07 | Backward compat: accept string or array | Existing frontend sends single string. Array support is additive. Avoids breaking change. |
| 2026-04-07 | Interleave instruction text per photo | SDK research confirms earlier inputs have more influence. Each photo with adjacent instruction helps model understand its role. |
| 2026-04-07 | Separated from prompt-plan.md | Multi-photo is a distinct feature with its own API/validation/pipeline changes. Prompt quality fixes should land independently. |
| 2026-04-07 | Per-photo 3 MB decoded size cap | Security review: bounding per-photo heap allocation prevents DoS amplification across concurrent requests. |
| 2026-04-07 | WriteTimeout increased from 90s to 130s | Security review: Gemini timeout (120s) exceeded previous WriteTimeout (90s), causing goroutine leaks on slow generations. |

---

## Agent Log

```
2026-04-07 — PLAN-D initialized as multi-photo only (prompt quality moved to prompt-plan.md). SDK research confirmed: 14 image limit, no reference strength control, interleaved text+blob pattern works. Capped at 4 photos for practical reasons.
2026-04-07 — All phases (D1, D2, D3) implemented. Changes: model (json.RawMessage + PhotoEntry), validation (parseYardPhotos + decodePhoto + 3MB cap), handler (GeminiFunc signature), gemini client (photo loop with per-photo instructions), prompt builder (photoCount int). 20+ new tests added. Spec docs (api-contract, gemini-client, prompt-construction) updated. Security review: added per-photo size cap, fixed WriteTimeout > Gemini timeout. Code/DocSync/Security reviewers approved after fixes.
```
