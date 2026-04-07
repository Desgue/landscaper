# Garden Planner — Backend Implementation Plan (Coordination)

> **AI-First Coordination Document.** This file maps the full backend build across 3 sequential sub-plans.
> Agents working on a sub-plan open only that plan's file — not this one.
> This file is the entry point for orchestrators and for understanding cross-plan contracts.

---

## Sub-Plan Map

```
PLAN-A: Foundation               ──► PLAN-B: Pipeline
(module · types · server ·           (filter · segmap · prompt · gemini)
 validation · logging)                        │
                                              ▼
                                  PLAN-C: Integration & Build
                                  (orchestration · fixtures · build · dev proxy)
```

### Execution Rules

| Rule | Detail |
|------|--------|
| **A blocks everything** | No other backend plan can start until PLAN-A is `done` |
| **B depends on A** | All pipeline stages require the Go types and server scaffold from A |
| **B stages are sequential** | Stage 2 (segmap) uses Stage 1 (filter) output; Stage 3 (prompt) uses Stage 1 output; Stage 4 (Gemini) consumes Stages 2+3 output |
| **C is last** | PLAN-C wires all pipeline stages together; starts only when A+B are `done` |
| **Frontend plans are independent** | Backend plans run in parallel with frontend plans A–F; only contract testing (PLAN-C) requires both sides functional |

### Sub-Plan Files

| Plan | File | Owns | Status |
|------|------|------|--------|
| A | `docs/plans/backend/PLAN-A.md` | Go module init, request types, HTTP server & routing, request validation, structured logging | `done` |
| B | `docs/plans/backend/PLAN-B.md` | Element filtering (Stage 1), segmentation render (Stage 2), prompt construction (Stage 3), Gemini client (Stage 4) | `done` |
| C | `docs/plans/backend/PLAN-C.md` | Pipeline orchestration, contract test fixtures, build pipeline, dev proxy verification | `done` |

---

## Cross-Plan Cnterface Contracts

> What each plan delivers that subsequent plans depend on. Agents must not break these contracts.

### Plan A delivers to Plan B

- All Go types in `internal/model/request.go`: `GenerateRequest`, `GenerateOptions`, `EffectiveOptions`, `ProjectPayload`, `Element`, `Registries`, and all sub-types
- HTTP server running with `POST /api/generate` route wired to a handler function
- Request validation complete: validated `GenerateRequest` with `EffectiveOptions` (defaults applied) available to pipeline stages
- Structured logging with `request_id` injection — all pipeline stages use the same logger context
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT` environment variables parsed and available

### Plan A delivers to Plan C

- Stub handler at `POST /api/generate` returns HTTP 501 — Plan C replaces this with the full pipeline orchestration
- `GET /api/health` returns `{"ok": true}`
- Embedded SPA serving at `GET /*` with `index.html` fallback

### Plan B delivers to Plan C

- `internal/render/segmap.go`: function accepting filtered elements + yard boundary + aspect ratio → `[]byte` PNG
- `internal/prompt/builder.go`: function accepting filtered elements + effective options + project location → prompt string
- `internal/gemini/client.go`: function accepting prompt + segmentation PNG + optional yard photo + effective options → `[]byte` PNG or error
- Element filter function in `internal/handler/` or `internal/render/`: accepts project payload + effective options → filtered element list with resolved registry entries

### Frontend ↔ Backend contract

- Request/response shapes defined in `docs/backend/api-contract.md` — both sides must conform
- Frontend `GenerateRequest` TypeScript type (PLAN-F) must match backend `GenerateRequest` Go struct (PLAN-A)
- Error response format: `{"error": "string"}` with appropriate HTTP status codes

---

## Master Decision Log

> Record decisions that affect more than one backend plan here. Plan-specific decisions go in the plan file.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Plan created with 3 phases: Foundation → Pipeline → Integration | Foundation types and server scaffold must exist before pipeline stages; integration wires everything and cannot start until all stages compile |
| 2026-04-06 | Single flat `Element` struct instead of per-type structs | Matches go-types.md design; Go JSON decoder ignores unknown fields, so one struct handles all element types with zero-value fields for irrelevant type-specific data |
| 2026-04-06 | No CGo or system graphics dependencies | fogleman/gg is pure Go; keeps build simple and cross-platform per server.md tech stack |
| 2026-04-06 | Split monolithic PLAN-BACKEND into 3 sub-plans (A, B, C) | Mirrors frontend plan structure for consistency; enables targeted agent work per domain |

---

## Master Agent Log

> Append-only. Record cross-plan events: plan completions, interface contract changes, escalations.

```
2026-04-06 — PLAN-BACKEND initialized. 3 phases, all todo. Foundation → Pipeline → Integration.
2026-04-06 — Split into 3 sub-plans (PLAN-A, PLAN-B, PLAN-C) following frontend plan template structure.
2026-04-06 — PLAN-A (Foundation) completed. All interface contracts fulfilled: types, server, validation, logging. PLAN-B and PLAN-C now unblocked.
```
