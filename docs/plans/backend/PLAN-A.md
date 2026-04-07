# PLAN-A — Foundation

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan is the hard blocker for all other backend plans. Nothing else starts until this is `done`.
> For cross-plan context, see `docs/plans/backend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Confirm Plan A is the active plan** by checking `docs/plans/backend/IMPLEMENTATION_PLAN.md` Sub-Plan Map. If any other plan is listed as `in-progress`, coordinate before proceeding.
2. **Load only targeted context.** Use grep hints in each feature's `Load hint:` line. Do not read full spec files unless marked "full file".
3. **Sequential features.** Work top-to-bottom. Request Types must exist before HTTP Server & Routing. Validation depends on types and server. Logging can be wired at any point but should be done last to avoid rework.

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.

### Interfaces This Plan Must Publish

Before marking this plan `done`, verify these contracts are fulfilled (see `docs/plans/backend/IMPLEMENTATION_PLAN.md § Cross-Plan Interface Contracts`):

- [x] All Go types in `internal/model/request.go` compile and have correct JSON tags — done 2026-04-06
- [x] `POST /api/generate` route wired to handler (stub 501 OK) — done 2026-04-06
- [x] `GET /api/health` returns `{"ok": true}` — done 2026-04-06
- [x] Embedded SPA serving at `GET /*` with `index.html` fallback — done 2026-04-06
- [x] Request validation returns validated `GenerateRequest` with `EffectiveOptions` — done 2026-04-06
- [x] Structured logging with `request_id` injection functional — done 2026-04-06

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
| **Plan ID** | `PLAN-A` |
| **Title** | Foundation |
| **Scope** | Go module init, all shared types, HTTP server with routing, request validation, structured logging. No pipeline stages or integration wiring. |
| **Blocks** | PLAN-B, PLAN-C |
| **Status** | `done` |
| **Started** | 2026-04-06 |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# List sections in a backend doc:
grep -n "^## " docs/backend/FILE.md

# Find a field name across all backend docs:
grep -rn "FIELD_NAME" docs/backend/

# Find a Go type definition:
grep -n "type.*struct" docs/backend/go-types.md

# Find validation rules and error messages:
grep -n "400\|413\|502\|504\|invalid\|required" docs/backend/api-contract.md

# Find logging rules:
grep -n "Logging\|slog\|request_id\|WARN\|INFO" docs/backend/server.md
```

| Doc | Owns | Load hint |
|-----|------|-----------|
| `docs/backend/server.md` | Go project structure, routes, embedded SPA, env vars, HTTP timeouts, health check, logging, build pipeline | `grep -n "^## " docs/backend/server.md` — read section for current task |
| `docs/backend/api-contract.md` | HTTP endpoint spec, request body shape, option defaults, validation rules, error responses, BDD scenarios | `grep -n "^## " docs/backend/api-contract.md` — read validation or response section as needed |
| `docs/backend/go-types.md` | All Go struct definitions for `internal/model/request.go`; field-to-JSON mapping | Full read recommended once — defines all types used across the pipeline |

---

## Phase A1 — Scaffold [x]

> Establishes the Go module, all shared types, and the HTTP server with routing. Every subsequent feature and plan depends on these existing and compiling.

---

#### Feature: Go Module Init [x]

**Status:** `done`
**Spec:** `docs/backend/server.md` → `## Go Project Structure`, `## Tech Stack`
**Load hint:** `grep -n "Go Project Structure\|Tech Stack\|go.mod" docs/backend/server.md`

##### Tasks

- [x] Initialize Go module (`go mod init`), add dependencies: `fogleman/gg`, `google.golang.org/genai` — done 2026-04-06
- [x] Create directory structure per server.md: `cmd/server/`, `internal/handler/`, `internal/render/`, `internal/prompt/`, `internal/gemini/`, `internal/model/` — done 2026-04-06
- [x] Create placeholder `main.go` in `cmd/server/` with minimal `func main()` that compiles — done 2026-04-06

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Module name `greenprint` (not a vanity URL) | Matches project name; no public module registry needed for self-hosted service |

---

#### Feature: Request Types [x]

**Status:** `done`
**Spec:** `docs/backend/go-types.md` — full file
**Load hint:** `grep -n "type.*struct" docs/backend/go-types.md`

##### Tasks

- [x] Implement all Go structs from go-types.md in `internal/model/request.go`: `GenerateRequest`, `GenerateOptions`, `EffectiveOptions`, `ProjectPayload`, `Location`, `YardBoundary`, `Point`, `EdgeType`, `Layer`, `Element`, `Segment`, `Registries`, `TerrainType`, `PlantType`, `StructureType`, `PathType` — done 2026-04-06
- [x] Verify JSON tags match data-schema.md field names exactly (use `omitempty` per go-types.md) — done 2026-04-06
- [x] Add doc comments referencing spec sections on each struct — done 2026-04-06

##### Decisions

_None._

---

#### Feature: HTTP Server & Routing [x]

**Status:** `done`
**Spec:** `docs/backend/server.md` → `## Routes`, `## Embedded React SPA`, `## Environment Variables`, `## HTTP Server Timeouts`, `## Health Check`
**Load hint:** `grep -n "Routes\|Embedded\|Environment\|Timeout\|Health" docs/backend/server.md`

##### Tasks

- [x] Implement `cmd/server/main.go`: read `GEMINI_API_KEY` (required — refuse to start if empty), `GEMINI_MODEL` (default `gemini-3.1-flash-image-preview`), `PORT` (default `8080`) — done 2026-04-06
- [x] Register routes: `POST /api/generate` → `handler.Generate`, `GET /api/health` → inline `{"ok": true}`, `GET /*` → embedded SPA filesystem with `index.html` fallback — done 2026-04-06
- [x] Set HTTP server timeouts: `ReadTimeout: 15s`, `WriteTimeout: 90s`, `IdleTimeout: 120s` — done 2026-04-06
- [x] Implement `//go:embed frontend/dist` for SPA serving with fallback to `index.html` for client-side routing — done 2026-04-06
- [x] Stub `handler.Generate` as HTTP 501 placeholder (functional implementation in PLAN-C) — done 2026-04-06

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | `//go:embed` directive placed in root-level `static.go` (package `greenprint`) instead of in `cmd/server/main.go` | Go embed paths are relative to the source file; `main.go` is in `cmd/server/` but `frontend/dist/` is at the project root. Root-level file with exported `StaticFiles` variable allows `cmd/server/` to import it. |

---

## Phase A2 — Validation & Logging [x]

> Adds request validation and structured logging on top of the server scaffold. Pipeline stages (PLAN-B) depend on validated requests with defaults applied.

---

#### Feature: Request Validation [x]

**Status:** `done`
**Spec:** `docs/backend/api-contract.md` → `## Request Validation`, `## Error Response Format`
**Load hint:** `grep -n "Validation\|Error Response\|400\|413\|invalid" docs/backend/api-contract.md`

##### Tasks

- [x] Implement body size limit check: reject > 10 MB with HTTP 413 `"request body too large"` — done 2026-04-06
- [x] Implement JSON decode with error: HTTP 400 `"invalid request body"` — done 2026-04-06
- [x] Validate `project` present and non-null: HTTP 400 `"project is required"` — done 2026-04-06
- [x] Validate `project.yardBoundary` non-null with >= 3 vertices: HTTP 400 `"project has no yard boundary"` — done 2026-04-06
- [x] Validate all `options` enum fields against allowed values: `garden_style` (9 values), `season` (6 values), `time_of_day` (4 values), `viewpoint` (3 values), `aspect_ratio` (3 values) — done 2026-04-06
- [x] Validate `yard_photo`: if present, decode base64, check first 8 bytes for JPEG (`\xFF\xD8\xFF`) or PNG (`\x89PNG\r\n\x1a\n`) magic bytes; HTTP 400 `"invalid yard_photo"` on failure — done 2026-04-06
- [x] Implement `EffectiveOptions` resolution: apply defaults for all omitted fields per api-contract.md defaults table — done 2026-04-06
- [x] Write unit tests for each validation rule and error message — done 2026-04-06

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Two-pass JSON decode for `seed`/`include_planned` type validation | Go's `encoding/json` silently drops type mismatches into pointer fields. Raw JSON inspection before struct decode ensures specific error messages ("invalid seed", "invalid include_planned") per spec. |

---

#### Feature: Structured Logging [x]

**Status:** `done`
**Spec:** `docs/backend/server.md` → `## Logging`
**Load hint:** `grep -n "Logging\|slog\|request_id\|WARN\|INFO" docs/backend/server.md`

##### Tasks

- [x] Set up `log/slog` with JSON handler as default logger — done 2026-04-06
- [x] Implement `request_id` generation: random 8-character hex string per request — done 2026-04-06
- [x] Create logging helper or middleware that injects `request_id` into all log calls for a request — done 2026-04-06
- [x] Wire log events per server.md logging table: request received, validation passed/failed, element filtering, render complete, prompt constructed, Gemini request/response, response sent, registry miss — done 2026-04-06 (request received, validation passed/failed, response sent wired; remaining events will be wired in PLAN-B/C when pipeline stages exist)

##### Decisions

_None._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Split from monolithic PLAN-BACKEND Phase 1 into standalone PLAN-A | Enables focused agent work on foundation without pipeline noise; mirrors frontend plan structure |
| 2026-04-06 | Module name `greenprint` (not a vanity URL) | Self-hosted service; no public registry needed |
| 2026-04-06 | Embed FS in root-level `static.go` instead of `cmd/server/main.go` | Go embed paths are relative to source file; `frontend/dist/` is at root, not under `cmd/server/` |
| 2026-04-06 | Two-pass JSON decode for seed/include_planned type validation | Ensures spec-compliant error messages for type mismatches in pointer fields |

---

## Agent Log

```
2026-04-06 — PLAN-A initialized from PLAN-BACKEND Phase 1. Two phases: A1 (Scaffold) and A2 (Validation & Logging). All todo.
2026-04-06 — Phase A1 complete. Go module initialized, all 16 request types implemented, HTTP server with 3 routes, embedded SPA, env vars, timeouts. Reviewed by Code/DocSync/Security reviewers — all approved after removing `all:` prefix from embed directive.
2026-04-06 — Phase A2 complete. 12 validation rules implemented with 29 unit tests (100% pass). Structured logging with request_id middleware, validation passed/failed log events. Reviewed by Code/DocSync/Security reviewers — all approved after adding seed/include_planned type validation and validation log events.
2026-04-06 — PLAN-A marked done. All interface contracts fulfilled. PLAN-B and PLAN-C unblocked.
```
