# PLAN-C — Integration & Build

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan wires all pipeline stages together and verifies the full build. Depends on PLAN-A and PLAN-B being `done`.
> For cross-plan context, see `docs/plans/backend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm PLAN-A and PLAN-B are both `done`** before starting any work here. Check their Plan Header status fields.
2. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line. Do not read full spec files unless marked "full file".
3. **Features are mostly independent.** Pipeline Orchestration must come first (it wires the handler). Contract Test Fixtures, Build Pipeline, and Dev Proxy Verification can proceed in any order after orchestration.

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.

### Completion Checklist

Before marking this plan `done`, verify end-to-end functionality:

- [x] `POST /api/generate` with valid request returns PNG image bytes with `Content-Type: image/png` — done 2026-04-07
- [x] All error paths return correct HTTP status codes and JSON error messages — done 2026-04-07
- [x] Structured logging traces a request through all 4 pipeline stages — done 2026-04-07
- [x] `go build ./cmd/server` produces working binary (with or without embedded SPA) — done 2026-04-07
- [x] Vite dev proxy forwards `/api/*` to Go server correctly — done 2026-04-07

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
| **Title** | Integration & Build |
| **Scope** | Pipeline orchestration in generate handler, contract test fixtures, build pipeline verification, dev proxy verification. No new pipeline stages or validation logic. |
| **Depends on** | PLAN-A, PLAN-B |
| **Status** | `done` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |

---

## Context Map

```bash
# Find handler orchestration flow:
grep -n "Endpoint\|Response Spec\|200\|image/png" docs/backend/api-contract.md

# Find BDD scenarios for test fixtures:
grep -n "Scenario:" docs/backend/api-contract.md docs/backend/segmentation-render.md

# Find build pipeline steps:
grep -n "Build Pipeline\|npm run build\|go build\|embed" docs/backend/server.md

# Find dev proxy config:
grep -n "npm run dev\|proxy\|different port\|local development" docs/backend/server.md
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `docs/backend/api-contract.md` | HTTP endpoint spec, response format, BDD scenarios | `grep -n "^## " docs/backend/api-contract.md` — read Endpoint and Response Spec sections |
| `docs/backend/server.md` | Logging table, build pipeline, dev workflow | `grep -n "^## " docs/backend/server.md` — read Logging and Build Pipeline sections |
| `docs/backend/segmentation-render.md` | BDD scenarios for render stage | `grep -n "Scenario:" docs/backend/segmentation-render.md` |
| `docs/backend/gemini-client.md` | Error handling contract for Gemini errors | `grep -n "error\|timeout\|502\|504" docs/backend/gemini-client.md` |

---

## Phase C1 — Orchestration [x]

> Wires all four pipeline stages into the generate handler. This is the core integration work — connecting PLAN-A's validation to PLAN-B's pipeline stages.

---

#### Feature: Pipeline Orchestration [x]

**Status:** `done`
**Spec:** `docs/backend/api-contract.md` → `## Endpoint`, `## Response Spec`; `docs/backend/server.md` → `## Logging`
**Load hint:** `grep -n "Endpoint\|Response Spec\|200\|image/png" docs/backend/api-contract.md`

##### Tasks

- [x] Wire generate handler: validate request → apply defaults → filter elements (Stage 1) → render segmentation map (Stage 2) → construct prompt (Stage 3) → call Gemini (Stage 4) → write PNG response with `Content-Type: image/png` — done 2026-04-07
- [x] Add structured log events at each pipeline stage boundary per server.md logging table — done 2026-04-07
- [x] Handle intermediate errors: segmentation render failure → HTTP 500 `"segmentation render failed"`; Gemini errors propagated per gemini-client.md error handling — done 2026-04-07
- [x] Decode `yard_photo` base64 once during validation, pass decoded bytes and detected MIME type through the pipeline — done 2026-04-07

##### Decisions

_None yet._

---

## Phase C2 — Verification [x]

> Adds test fixtures and verifies the complete build and dev workflows. Features in this phase are independent and can be worked in any order.

---

#### Feature: Contract Test Fixtures [x]

**Status:** `done`
**Spec:** `docs/backend/api-contract.md` → `## BDD Scenarios`; `docs/backend/segmentation-render.md` → `## BDD Scenarios`
**Load hint:** `grep -n "Scenario:" docs/backend/api-contract.md docs/backend/segmentation-render.md`

##### Tasks

- [x] Create test fixtures as Go functions in `internal/handler/generate_test.go` (inline, no separate testdata directory needed) — done 2026-04-07
- [x] Create minimal valid project fixture: yard boundary with 3 vertices, one terrain element, one plant element, minimal registries — done 2026-04-07
- [x] Create full project fixture: all element types (terrain, plant, structure, path, label, dimension), all registry types populated, multiple layers with mixed visibility — done 2026-04-07
- [x] Create edge case fixtures: empty elements array, missing registries, arc edges on yard boundary, plant with `status: "removed"`, plant with `status: "planned"` — done 2026-04-07
- [x] Write integration tests (31 tests) exercising full pipeline with mocked Gemini client: success paths, all error paths (400/413/502/504), Gemini argument verification with recording mock — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Build Pipeline [x]

**Status:** `done`
**Spec:** `docs/backend/server.md` → `## Build Pipeline`
**Load hint:** `grep -n "Build Pipeline\|npm run build\|go build\|embed" docs/backend/server.md`

##### Tasks

- [x] Two-step build verified: `npm run build` → `go build ./cmd/server` (embeds `frontend/dist/`) — done 2026-04-07
- [x] Verify `frontend/dist/` is in `.gitignore` (`dist` entry covers it) — done 2026-04-07
- [x] Verify that `go build` without prior `npm run build` produces a working binary (API routes work, SPA has placeholder `index.html` from `.gitkeep`) — done 2026-04-07
- [x] Built binary verified: serves SPA at `/`, health at `/api/health`, accepts POST at `/api/generate` — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Dev Proxy Verification [x]

**Status:** `done`
**Spec:** `docs/backend/server.md` → `## Build Pipeline` (last paragraph on local dev)
**Load hint:** `grep -n "npm run dev\|proxy\|different port\|local development" docs/backend/server.md`

##### Tasks

- [x] Verify Vite dev server proxy config forwards `/api/*` requests to Go server (`vite.config.ts` proxy for `/api` → `http://localhost:8080`) — done 2026-04-07
- [x] Local dev workflow verified: terminal 1 runs `go run ./cmd/server`, terminal 2 runs `npm run dev`; Vite proxies API calls to Go server — done 2026-04-07
- [x] End-to-end: Vite serves frontend, Go serves API, `/api/*` routes reach Go handler through Vite proxy — done 2026-04-07

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Split from monolithic PLAN-BACKEND Phase 3 into standalone PLAN-C | Enables focused agent work on integration without foundation or pipeline noise |
| 2026-04-07 | `YardPhotoData` struct in validate.go to carry decoded bytes + MIME type | Avoids double base64 decode; validation already decodes to check magic bytes, so capture the result |
| 2026-04-07 | Package-level `geminiGenerateFunc` variable for test mockability | Standard Go testing pattern for function-based handlers; unexported, only swapped in `_test.go` files |
| 2026-04-07 | Test fixtures as Go functions (not JSON files in testdata/) | Inline fixtures are more maintainable for typed struct assembly; avoids JSON file drift from Go types |
| 2026-04-07 | Upstream error messages forwarded per spec — risk accepted for self-hosted service | Security reviewer flagged `"Nano Banana error: {upstream message}"` as info disclosure; spec explicitly mandates this format; self-hosted deployment model means operator is the only user |

---

## Agent Log

```
2026-04-06 — PLAN-C initialized from PLAN-BACKEND Phase 3. Two phases: C1 (Orchestration) and C2 (Verification). All todo.
2026-04-07 — Phase C1 done: Full pipeline wired in generate handler (validate → filter → render → prompt → gemini → PNG). YardPhotoData struct added to validate.go for decoded yard photo pass-through. Structured logging at all stage boundaries per server.md. Reviewed by Code/DocSync/Security — approved after fixing "Nano Banana" log event names. Security finding on upstream error forwarding accepted as spec-compliant for self-hosted model.
2026-04-07 — Phase C2 done: 31 integration tests in generate_test.go covering all BDD scenarios from api-contract.md and gemini-client.md. Recording mock verifies Gemini arguments (aspect ratio, seed, yard photo bytes/MIME, segmap PNG). Build pipeline verified: go build produces working binary, .gitignore covers frontend/dist/, vite proxy config correct. Reviewed by Code/DocSync/Security — approved after adding season derivation and validation integration tests.
2026-04-07 — PLAN-C complete. All backend plans (A, B, C) done. Full test suite: 61 handler tests, 13 filter tests, 5 gemini tests, 18 prompt tests, 10 render tests = 107 total.
```
