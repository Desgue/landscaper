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

- [ ] `POST /api/generate` with valid request returns PNG image bytes with `Content-Type: image/png`
- [ ] All error paths return correct HTTP status codes and JSON error messages
- [ ] Structured logging traces a request through all 4 pipeline stages
- [ ] `go build ./cmd/server` produces working binary (with or without embedded SPA)
- [ ] Vite dev proxy forwards `/api/*` to Go server correctly

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
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

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

## Phase C1 — Orchestration [ ]

> Wires all four pipeline stages into the generate handler. This is the core integration work — connecting PLAN-A's validation to PLAN-B's pipeline stages.

---

#### Feature: Pipeline Orchestration [ ]

**Status:** `todo`
**Spec:** `docs/backend/api-contract.md` → `## Endpoint`, `## Response Spec`; `docs/backend/server.md` → `## Logging`
**Load hint:** `grep -n "Endpoint\|Response Spec\|200\|image/png" docs/backend/api-contract.md`

##### Tasks

- [ ] Wire generate handler: validate request → apply defaults → filter elements (Stage 1) → render segmentation map (Stage 2) → construct prompt (Stage 3) → call Gemini (Stage 4) → write PNG response with `Content-Type: image/png`
- [ ] Add structured log events at each pipeline stage boundary per server.md logging table
- [ ] Handle intermediate errors: segmentation render failure → HTTP 500 `"segmentation render failed"`; Gemini errors propagated per gemini-client.md error handling
- [ ] Decode `yard_photo` base64 once during validation, pass decoded bytes and detected MIME type through the pipeline

##### Decisions

_None yet._

---

## Phase C2 — Verification [ ]

> Adds test fixtures and verifies the complete build and dev workflows. Features in this phase are independent and can be worked in any order.

---

#### Feature: Contract Test Fixtures [ ]

**Status:** `todo`
**Spec:** `docs/backend/api-contract.md` → `## BDD Scenarios`; `docs/backend/segmentation-render.md` → `## BDD Scenarios`
**Load hint:** `grep -n "Scenario:" docs/backend/api-contract.md docs/backend/segmentation-render.md`

##### Tasks

- [ ] Create `testdata/` directory at project root (or `internal/testdata/`)
- [ ] Create minimal valid project JSON fixture: yard boundary with 3 vertices, one terrain element, one plant element, minimal registries
- [ ] Create full project JSON fixture: all element types (terrain, plant, structure, path, label, dimension), all registry types populated, multiple layers with mixed visibility
- [ ] Create edge case fixtures: empty elements array, missing registries, closed path, arc edges on yard boundary, plant with `status: "removed"`, plant with `status: "planned"`
- [ ] Write integration test that exercises the full pipeline with mocked Gemini client: request → validate → filter → render → prompt → (mock) gemini → response

##### Decisions

_None yet._

---

#### Feature: Build Pipeline [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Build Pipeline`
**Load hint:** `grep -n "Build Pipeline\|npm run build\|go build\|embed" docs/backend/server.md`

##### Tasks

- [ ] Document or script the two-step build: `npm run build` (Vite output to `frontend/dist/`) → `go build ./cmd/server` (embeds `frontend/dist/`)
- [ ] Verify `frontend/dist/` is in `.gitignore`
- [ ] Verify that `go build` without prior `npm run build` produces a binary where API routes work but SPA is absent (expected behavior per spec)
- [ ] Test the full build: built binary serves SPA at `/`, health at `/api/health`, and accepts POST at `/api/generate`

##### Decisions

_None yet._

---

#### Feature: Dev Proxy Verification [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Build Pipeline` (last paragraph on local dev)
**Load hint:** `grep -n "npm run dev\|proxy\|different port\|local development" docs/backend/server.md`

##### Tasks

- [ ] Verify Vite dev server proxy config forwards `/api/*` requests to the Go server
- [ ] Document local dev workflow: terminal 1 runs `go run ./cmd/server`, terminal 2 runs `npm run dev`; Vite proxies API calls to Go server
- [ ] Test end-to-end: Vite serves frontend, Go serves API, `POST /api/generate` reaches Go handler through Vite proxy

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Split from monolithic PLAN-BACKEND Phase 3 into standalone PLAN-C | Enables focused agent work on integration without foundation or pipeline noise |

---

## Agent Log

```
2026-04-06 — PLAN-C initialized from PLAN-BACKEND Phase 3. Two phases: C1 (Orchestration) and C2 (Verification). All todo.
```
