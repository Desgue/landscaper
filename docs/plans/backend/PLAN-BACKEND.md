# PLAN-BACKEND — Image Generation Service

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan covers the Go backend that serves the React SPA and exposes `POST /api/generate`.
> For frontend coordination, see `docs/plans/frontend/IMPLEMENTATION_PLAN.md`.

---

## Agent Protocol

### Reading This Plan

1. **Load only targeted context.** Use grep hints in `## Context Map` to pull specific doc sections. Do not read full spec files unless the task explicitly requires it.
2. **Sequential phases.** Work top-to-bottom. Phase 2 depends on Phase 1 types and server scaffold. Phase 3 depends on all Phase 2 pipeline stages.
3. **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating This Plan

- `[ ]` → `[x]` when a task is done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: ...` beneath the task.
- When a feature is fully done: set `**Status:** done` and change badge `[ ]` → `[x]`.
- When a phase is fully done: change phase badge `[ ]` → `[x]`.
- When you make an architectural decision: append to `## Decision Log`.
- Append to `## Agent Log` at significant milestones. Never edit previous entries.
- **Keep diffs small.** Only edit the lines that changed.

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
| **Plan ID** | `PLAN-BACKEND` |
| **Title** | Image Generation Service |
| **Scope** | Go HTTP server, request validation, 2D segmentation render, prompt construction, Gemini API integration, embedded SPA serving. Excludes frontend UI and all frontend sub-plans. |
| **Status** | `superseded` |
| **Started** | — |
| **Last updated** | 2026-04-06 |
| **Phases** | Phase 1 (Foundation) · Phase 2 (Pipeline) · Phase 3 (Integration & Build) |

---

## Context Map

### How to load a specific section

```bash
# List sections in a backend doc:
grep -n "^## " docs/backend/FILE.md

# Find a field name across all backend docs:
grep -rn "FIELD_NAME" docs/backend/

# Find a Go type definition:
grep -n "type.*struct" docs/backend/go-types.md

# Find segmentation color table entries:
grep -n "#[0-9A-Fa-f]\{6\}" docs/backend/segmentation-render.md

# Find prompt template strings:
grep -n "photorealistic\|garden_style\|season\|viewpoint" docs/backend/prompt-construction.md

# Find Gemini SDK usage patterns:
grep -n "genai\.\|GenerateContent\|InlineData\|Modality" docs/backend/gemini-client.md

# Find validation rules and error messages:
grep -n "400\|413\|502\|504\|invalid\|required" docs/backend/api-contract.md
```

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/backend/server.md` | Go project structure, routes, embedded SPA, env vars, HTTP timeouts, health check, logging, build pipeline | `grep -n "^## " docs/backend/server.md` — read section for current task |
| `docs/backend/api-contract.md` | HTTP endpoint spec, request body shape, option defaults, validation rules, error responses, BDD scenarios | `grep -n "^## " docs/backend/api-contract.md` — read validation or response section as needed |
| `docs/backend/go-types.md` | All Go struct definitions for `internal/model/request.go`; field-to-JSON mapping | Full read recommended once — defines all types used across the pipeline |
| `docs/backend/segmentation-render.md` | Stage 1 element filtering, Stage 2 canvas render, color table, arc approximation, footprint sizing | `grep -n "^## \|^### " docs/backend/segmentation-render.md` then read relevant stage |
| `docs/backend/prompt-construction.md` | Stage 3 prompt assembly, season derivation, element collection caps, style suffixes, yard photo preamble | `grep -n "^## " docs/backend/prompt-construction.md` then read relevant section |
| `docs/backend/gemini-client.md` | Stage 4 Gemini SDK wrapper, request construction, response extraction, error handling | Full read recommended — short file, all sections relevant to Stage 4 |
| `docs/backend/INDEX.md` | Document registry for all backend docs | Quick reference to find the right doc file |

---

## Phase 1 — Foundation [ ]

> Establishes the Go module, all shared types, HTTP server with routing, request validation, and structured logging. Every Phase 2 pipeline stage depends on the types and server scaffold built here.

---

#### Feature: Go Module Init [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Go Project Structure`, `## Tech Stack`
**Load hint:** `grep -n "Go Project Structure\|Tech Stack\|go.mod" docs/backend/server.md`

##### Tasks

- [ ] Initialize Go module (`go mod init`), add dependencies: `fogleman/gg`, `google.golang.org/genai`
- [ ] Create directory structure per server.md: `cmd/server/`, `internal/handler/`, `internal/render/`, `internal/prompt/`, `internal/gemini/`, `internal/model/`
- [ ] Create placeholder `main.go` in `cmd/server/` with minimal `func main()` that compiles

##### Decisions

_None yet._

---

#### Feature: Request Types [ ]

**Status:** `todo`
**Spec:** `docs/backend/go-types.md` — full file
**Load hint:** `grep -n "type.*struct" docs/backend/go-types.md`

##### Tasks

- [ ] Implement all Go structs from go-types.md in `internal/model/request.go`: `GenerateRequest`, `GenerateOptions`, `EffectiveOptions`, `ProjectPayload`, `Location`, `YardBoundary`, `Point`, `EdgeType`, `Layer`, `Element`, `Segment`, `Registries`, `TerrainType`, `PlantType`, `StructureType`, `PathType`
- [ ] Verify JSON tags match data-schema.md field names exactly (use `omitempty` per go-types.md)
- [ ] Add doc comments referencing spec sections on each struct

##### Decisions

_None yet._

---

#### Feature: HTTP Server & Routing [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Routes`, `## Embedded React SPA`, `## Environment Variables`, `## HTTP Server Timeouts`, `## Health Check`
**Load hint:** `grep -n "Routes\|Embedded\|Environment\|Timeout\|Health" docs/backend/server.md`

##### Tasks

- [ ] Implement `cmd/server/main.go`: read `GEMINI_API_KEY` (required — refuse to start if empty), `GEMINI_MODEL` (default `gemini-3.1-flash-image-preview`), `PORT` (default `8080`)
- [ ] Register routes: `POST /api/generate` → `handler.Generate`, `GET /api/health` → inline `{"ok": true}`, `GET /*` → embedded SPA filesystem with `index.html` fallback
- [ ] Set HTTP server timeouts: `ReadTimeout: 15s`, `WriteTimeout: 90s`, `IdleTimeout: 120s`
- [ ] Implement `//go:embed frontend/dist` for SPA serving with fallback to `index.html` for client-side routing
- [ ] Stub `handler.Generate` as HTTP 501 placeholder (functional implementation in Phase 2)

##### Decisions

_None yet._

---

#### Feature: Request Validation [ ]

**Status:** `todo`
**Spec:** `docs/backend/api-contract.md` → `## Request Validation`, `## Error Response Format`
**Load hint:** `grep -n "Validation\|Error Response\|400\|413\|invalid" docs/backend/api-contract.md`

##### Tasks

- [ ] Implement body size limit check: reject > 10 MB with HTTP 413 `"request body too large"`
- [ ] Implement JSON decode with error: HTTP 400 `"invalid request body"`
- [ ] Validate `project` present and non-null: HTTP 400 `"project is required"`
- [ ] Validate `project.yardBoundary` non-null with >= 3 vertices: HTTP 400 `"project has no yard boundary"`
- [ ] Validate all `options` enum fields against allowed values: `garden_style` (9 values), `season` (6 values), `time_of_day` (4 values), `viewpoint` (3 values), `aspect_ratio` (3 values)
- [ ] Validate `yard_photo`: if present, decode base64, check first 8 bytes for JPEG (`\xFF\xD8\xFF`) or PNG (`\x89PNG\r\n\x1a\n`) magic bytes; HTTP 400 `"invalid yard_photo"` on failure
- [ ] Implement `EffectiveOptions` resolution: apply defaults for all omitted fields per api-contract.md defaults table
- [ ] Write unit tests for each validation rule and error message

##### Decisions

_None yet._

---

#### Feature: Structured Logging [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Logging`
**Load hint:** `grep -n "Logging\|slog\|request_id\|WARN\|INFO" docs/backend/server.md`

##### Tasks

- [ ] Set up `log/slog` with JSON handler as default logger
- [ ] Implement `request_id` generation: random 8-character hex string per request
- [ ] Create logging helper or middleware that injects `request_id` into all log calls for a request
- [ ] Wire log events per server.md logging table: request received, validation passed/failed, element filtering, render complete, prompt constructed, Gemini request/response, response sent, registry miss

##### Decisions

_None yet._

---

## Phase 2 — Pipeline [ ]

> Implements the four-stage image generation pipeline: filter elements, render segmentation map, construct prompt, call Gemini. Each stage is a separate package under `internal/`. Depends on Phase 1 types and server scaffold.

---

#### Feature: Element Filtering (Stage 1) [ ]

**Status:** `todo`
**Spec:** `docs/backend/segmentation-render.md` → `## Stage 1: Element Filtering`
**Load hint:** `grep -n "Stage 1\|Filtering Rules\|Registry Lookup\|Layer Visibility" docs/backend/segmentation-render.md`

##### Tasks

- [ ] Implement layer visibility check: build map of `layerID → visible` from `project.layers`; handle empty layers array (treat all elements as visible)
- [ ] Implement filtering rules: exclude hidden-layer elements, always exclude labels and dimensions, exclude `status: "removed"` plants, exclude `status: "planned"` plants when `include_planned` is false
- [ ] Implement registry lookup for each element type: resolve `plantTypeId`, `structureTypeId`, `terrainTypeId`, `pathTypeId` against `project.registries`
- [ ] On registry miss: exclude element, log WARN with `request_id`, `element_id`, and `missing_type_id`
- [ ] Return filtered element list with resolved registry entries attached for Stage 2 and Stage 3
- [ ] Write unit tests: hidden layer exclusion, removed plant exclusion, planned plant with include_planned false/true, label/dimension exclusion, registry miss warning, empty layers array, locked layer inclusion

##### Decisions

_None yet._

---

#### Feature: Segmentation Render (Stage 2) [ ]

**Status:** `todo`
**Spec:** `docs/backend/segmentation-render.md` → `## Stage 2: 2D Segmentation Render`, `## Element 2D Footprints`, `## Segmentation Color Table`, `## Arc Approximation`
**Load hint:** `grep -n "Canvas Setup\|Draw Order\|Color Table\|Footprint\|Arc Approximation" docs/backend/segmentation-render.md`

##### Tasks

- [ ] Implement canvas setup: compute AABB from yard boundary vertices, add 10% padding, scale to output resolution with uniform scale, letterbox with `#000000` if aspect ratios differ
- [ ] Implement yard boundary polygon fill: handle line and arc edges; arc edges approximated as 12-segment polyline using the arc approximation algorithm from spec
- [ ] Implement draw order: void fill → yard boundary → terrain cells → paths → structures → plants
- [ ] Implement terrain cell rendering: 100x100cm filled rectangles at cell position, color from segmentation color table with category fallback
- [ ] Implement plant rendering: circle footprints using `spacingCm`/`canopyWidthCm`/`trunkWidthCm` per footprint table; tree dual-shape (trunk then canopy); quantity renders as 1 shape
- [ ] Implement structure rendering: filled rectangles with rotation for straight shapes; arc band for curved shapes
- [ ] Implement path rendering: stroked polyline/arc at `strokeWidthCm` width; use `pathType.defaultWidthCm` as fallback when `strokeWidthCm` is zero; handle closed paths (connect last point to first)
- [ ] Implement full segmentation color table as constants; implement fallback rules for unknown terrain types, missing material fields
- [ ] Output PNG to `[]byte` in memory using `fogleman/gg` — no temp files
- [ ] Write unit tests: AABB calculation, arc approximation output, color table lookups, fallback colors

##### Decisions

_None yet._

---

#### Feature: Prompt Construction (Stage 3) [ ]

**Status:** `todo`
**Spec:** `docs/backend/prompt-construction.md` — full file
**Load hint:** `grep -n "^## " docs/backend/prompt-construction.md`

##### Tasks

- [ ] Implement subject template: `"A {garden_style} garden, {season}, {time_of_day}"`
- [ ] Implement season derivation: hemisphere detection from `project.location.lat`, date-to-season mapping for northern and southern hemispheres, fallback to `"summer"`
- [ ] Implement element collection: resolve names from registries (plants, structures, terrain — not paths), collect unique names only, apply cap rules (plants: 7, structures: 3, terrain: 2, total: 12)
- [ ] Implement style suffix: fixed string per viewpoint value (`eye-level`, `elevated`, `isometric`); all include `"not a floor plan"` directive
- [ ] Implement yard photo preamble: prepend fixed context sentence when `yard_photo` is present; omit entirely when absent
- [ ] Implement full prompt assembly: `{preamble} {subject}. {elements}. {style}.` — omit elements part when no names remain after filtering
- [ ] Write unit tests: subject string formatting, season derivation for each hemisphere, element cap enforcement, prompt with/without elements, prompt with/without yard photo preamble

##### Decisions

_None yet._

---

#### Feature: Gemini Client (Stage 4) [ ]

**Status:** `todo`
**Spec:** `docs/backend/gemini-client.md` — full file
**Load hint:** `grep -n "^## " docs/backend/gemini-client.md`

##### Tasks

- [ ] Implement client initialization: `genai.NewClient` with API key from env, 60-second context timeout per request
- [ ] Implement request construction: assemble parts array (text prompt, segmentation map PNG blob, optional yard photo blob); set `ResponseModalities` to image, `ImageConfig` with aspect ratio mapping (`square` → `1:1`, `landscape` → `16:9`, `portrait` → `9:16`) and `ImageSize: "1K"`; set `Seed` only when not `-1`
- [ ] Implement response extraction: iterate `resp.Candidates[0].Content.Parts`, find first `InlineData` with `MIMEType == "image/png"`, return data bytes
- [ ] Implement error handling: context deadline exceeded → HTTP 504 `"image generation timed out"`, API error → HTTP 502 `"Nano Banana error: {upstream message}"`, no image part → HTTP 502 `"no image in Nano Banana response"`
- [ ] Write unit tests: aspect ratio mapping, seed omission when -1, error classification

##### Decisions

_None yet._

---

## Phase 3 — Integration & Build [ ]

> Wires all pipeline stages together in the generate handler, adds test fixtures, and verifies the full build pipeline (frontend + backend). Depends on all Phase 2 stages being complete.

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
| 2026-04-06 | Plan created with 3 phases: Foundation → Pipeline → Integration | Foundation types and server scaffold must exist before pipeline stages; integration wires everything and cannot start until all stages compile |
| 2026-04-06 | Single flat `Element` struct instead of per-type structs | Matches go-types.md design; Go JSON decoder ignores unknown fields, so one struct handles all element types with zero-value fields for irrelevant type-specific data |
| 2026-04-06 | No CGo or system graphics dependencies | fogleman/gg is pure Go; keeps build simple and cross-platform per server.md tech stack |

---

## Agent Log

```
2026-04-06 — PLAN-BACKEND initialized. 3 phases, all todo. Foundation → Pipeline → Integration.
```
