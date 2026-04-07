# Garden Planner — Railway Deployment Plan

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific doc sections into context. Do not read whole spec files unless the task explicitly requires it.
- **Check phase status first.** Scan `## Phases` top-to-bottom and find the first phase that is not `done`. Work within that phase only.
- **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating the Plan

- **After completing a task:** change its status line from `[ ]` to `[x]` and append `— done YYYY-MM-DD` to the task line.
- **After completing a feature:** change `Status:` from `todo` / `in-progress` to `done`.
- **After completing a phase:** change the phase header badge from `[ ]` to `[x]`.
- **When you make an architectural decision:** add an entry to `## Decision Log` in the format shown.
- **When you hit a blocker:** add a `Blocker:` note to the task and set its status checkbox to `[-]` (blocked). Notify via the log.
- **Never rewrite history.** Append to the Agent Log; do not edit previous entries.
- **Keep diffs small.** Only edit the lines that changed. Do not reformat or reorder unrelated sections.

### Status Vocabulary

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Done |
| `[-]`  | Blocked |

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-DEPLOY` |
| **Title** | Railway Deployment for Greenprint Backend |
| **Scope** | Deploy the Go backend + embedded SPA to Railway. Excludes custom domain setup, CI/CD automation, and multi-region. |
| **Status** | `in-progress` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1: Build Config · Phase 2: Railway Setup · Phase 3: Verification |

---

## Context Map

> This section maps each spec document to the grep commands and section anchors that load targeted context. Agents must use these hints instead of reading full files.

### How to load a specific section

```bash
grep -n "## Section Name" docs/backend/FILE.md
# then read from that line number in the file

grep -rn "CONCEPT" docs/backend/
```

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/backend/server.md` | Project structure, routes, env vars, timeouts, build pipeline, deployment model | `grep -n "^##" docs/backend/server.md` to list sections |
| `docs/backend/api-contract.md` | HTTP endpoint contract, request/response shapes | `grep -n "^##" docs/backend/api-contract.md` |
| `docs/backend/gemini-client.md` | Gemini SDK setup, timeouts, error handling | `grep -n "^##" docs/backend/gemini-client.md` |
| `cmd/server/main.go` | Entry point: env config, server start, port binding | Read directly |
| `.env.example` | Required and optional env vars | Read directly |
| `static.go` | Embedded frontend assets via `//go:embed` | Read directly |

---

## Background

### Architecture Summary

Greenprint is a stateless Go HTTP server that:
- Serves an embedded React SPA (Vite build output via `//go:embed`)
- Exposes `POST /api/generate` — orchestrates segmentation render + Gemini image generation
- Exposes `GET /api/health` — returns `{"ok": true}`
- Reads `PORT` env var (default `8080`), binds `0.0.0.0`
- Requires `GEMINI_API_KEY` at startup (fatal if missing)
- Has no database, no auth, no persistent state

### Railway Platform Notes

- **Builder:** Railpack (auto-detects Go via `go.mod`). Explicit `buildCommand` needed because `main` is at `cmd/server/`, not repo root.
- **Frontend embed:** `frontend/dist/` is git-ignored, so the build command must run `npm run build` before `go build`.
- **Port:** Railway injects `PORT` env var automatically. The server already reads it — no code changes needed.
- **Health checks:** Railway supports HTTP path health checks. `/api/health` already exists.
- **Pricing:** Hobby plan ($5/month) is sufficient for a low-traffic personal project.
- **Secrets:** `GEMINI_API_KEY` should be sealed after setting (irreversible — value hidden from UI, CLI, and API permanently). Sealed vars are not copied to PR environments or duplicated services.

---

## Phases

### Phase 1 — Build Configuration [ ]

> Create the `railway.toml` config file and verify the build pipeline works for the monorepo (frontend + Go binary with embedded SPA).

#### Feature: railway.toml [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Build Pipeline`
**Load hint:** `grep -n "## Build Pipeline" docs/backend/server.md`

##### Tasks

- [ ] Create `railway.toml` at repo root with the following config:
  ```toml
  [build]
  builder = "RAILPACK"
  buildCommand = "make build"

  [deploy]
  startCommand = "./server/server"
  healthcheckPath = "/api/health"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
  ```
- [ ] Verify `go.mod` has a Go version that Railway/Railpack can satisfy (check if `go 1.26.1` causes issues — may need to pin to a released version like `1.23`)
- [ ] Test the build pipeline locally: `npm ci && npm run build && go build -o server ./cmd/server` — confirm the binary starts and serves both SPA and API

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: Environment Variable Documentation [ ]

**Status:** `todo`
**Spec:** `docs/backend/server.md` → `## Environment Variables`
**Load hint:** `grep -n "## Environment Variables" docs/backend/server.md`

##### Tasks

- [ ] Create `.env.railway.example` documenting all variables needed for Railway deployment:
  - `GEMINI_API_KEY` (required, sealed)
  - `GEMINI_MODEL` (optional, default `gemini-3.1-flash-image-preview`)
  - `PORT` (injected by Railway — do not set manually)
- [ ] Verify `cmd/server/main.go` uses `godotenv.Load()` with error discard (so it doesn't fail when no `.env` file exists on Railway)

##### Decisions

_None yet._

---

### Phase 2 — Railway Project Setup [ ]

> Create the Railway project, configure environment variables, and perform initial deployment.

#### Feature: Railway Project Init [ ]

**Status:** `todo`
**Spec:** n/a (platform setup, not code)

##### Tasks

- [ ] Install Railway CLI: `brew install railway`
- [ ] Authenticate: `railway login`
- [ ] Initialize project: `railway init` in repo root — create a new project named `greenprint`
- [ ] Set environment variables via CLI:
  - `railway variable set GEMINI_API_KEY=<key>` (seal in dashboard after — sealing is irreversible and hides the value from CLI/API permanently)
  - `railway variable set GEMINI_MODEL=gemini-3.1-flash-image-preview` (optional, only if overriding default)
- [ ] Deploy: `railway up` — watch build logs for successful `npm ci`, `npm run build`, and `go build`
- [ ] Verify Railway assigns a public domain (`*.up.railway.app`)

##### Decisions

_None yet._

---

#### Feature: Deploy First Build [ ]

**Status:** `todo`

##### Tasks

- [ ] Run `railway up` and monitor build output for errors
- [ ] If build fails on Go version (`go 1.26.1`), update `go.mod` to a supported version and redeploy
- [ ] If build fails on missing Node.js, verify Railpack installs Node when it detects `package.json` alongside `go.mod` — if not, switch to a Dockerfile approach (see Decision Log)
- [ ] Confirm Railway logs show `listening on :PORT` after deploy

##### Decisions

_None yet._

---

### Phase 3 — Verification & Hardening [ ]

> Confirm the deployed service works end-to-end and add production safeguards.

#### Feature: End-to-End Smoke Test [ ]

**Status:** `todo`
**Spec:** `docs/backend/api-contract.md` → `## Endpoint`
**Load hint:** `grep -n "## Endpoint" docs/backend/api-contract.md`

##### Tasks

- [ ] Hit `GET https://<railway-domain>/api/health` — expect `200 {"ok": true}`
- [ ] Hit `GET https://<railway-domain>/` — expect the React SPA `index.html`
- [ ] Hit `POST https://<railway-domain>/api/generate` with a minimal test payload from `testdata/minimal-project.json` — expect `200` with a PNG response
- [ ] Verify structured JSON logs appear in Railway dashboard log viewer

##### Decisions

_None yet._

---

#### Feature: Production Hardening [ ]

**Status:** `todo`

##### Tasks

- [ ] Seal `GEMINI_API_KEY` in Railway dashboard (three-dot menu next to variable > Seal). **This is irreversible** — the value will never be visible in UI/CLI/API again. Ensure you have the key stored elsewhere before sealing.
- [ ] Confirm health check is passing in Railway dashboard (Deployments tab shows green check)
- [ ] Verify zero-downtime deploys work: push a trivial change and confirm Railway rolls forward without downtime
- [ ] (Optional) Connect GitHub repo in Railway dashboard for auto-deploy on push to `main`

##### Decisions

_None yet._

---

## Fallback: Dockerfile Approach

If Railpack cannot handle the monorepo build (Node + Go in one step), use this Dockerfile instead of `railway.toml` buildCommand:

```dockerfile
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /app/server .
EXPOSE 8080
CMD ["./server"]
```

If this path is taken, update `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Target Railway Hobby plan ($5/month) | Sufficient for low-traffic personal project; includes $5 usage credit that covers a mostly-idle Go server |
| 2026-04-07 | Use Railpack with explicit buildCommand over Dockerfile | Simpler config, smaller images (~38% smaller than Nixpacks), zero Docker maintenance. Dockerfile kept as fallback if monorepo build fails. |
| 2026-04-07 | Single service (Go binary embeds SPA) | No need for separate frontend/backend services — embedded SPA is simpler and cheaper. Same-origin eliminates CORS. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — Plan initialized. Backend is a stateless Go server with embedded React SPA. Railway Hobby plan selected. Railpack preferred with Dockerfile fallback.
```
