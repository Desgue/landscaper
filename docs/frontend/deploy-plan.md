# Greenprint Frontend — Railway Deployment Plan

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
| **Plan ID** | `PLAN-DEPLOY-FE` |
| **Title** | Railway Deployment for Greenprint Frontend |
| **Scope** | Deploy the Vite React SPA as a separate Railway service within the existing `greenprint` project. Excludes CI/CD automation, multi-region, and CDN setup. |
| **Status** | `todo` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1: Build & Serve Config · Phase 2: Railway Service Setup · Phase 3: Verification |

---

## Context Map

> This section maps each spec document to the grep commands and section anchors that load targeted context. Agents must use these hints instead of reading full files.

### How to load a specific section

```bash
grep -n "## Section Name" docs/frontend/FILE.md
# then read from that line number in the file

grep -rn "CONCEPT" docs/frontend/
```

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `package.json` | Build scripts, dependencies, project metadata | Read directly |
| `vite.config.ts` | Vite build config, dev proxy, plugins | Read directly |
| `src/App.tsx` | TanStack Router setup, route tree | `grep -n "createRoute\|createRouter" src/App.tsx` |
| `src/main.tsx` | React entry point | Read directly |
| `docs/backend/deploy-plan.md` | Backend Railway deployment plan (reference) | `grep -n "^##" docs/backend/deploy-plan.md` |
| `.env.example` | Required and optional env vars | Read directly |

---

## Background

### Architecture Summary

The Greenprint frontend is a standalone React SPA that:
- Is built with **Vite 8** + **React 19** + **TypeScript 6**
- Uses **TanStack Router** for client-side routing (`/`, `/app`, `/app/canvas`)
- Uses **Zustand** for state management and **IndexedDB** (via `idb`) for local project persistence
- Uses **PixiJS v8** for WebGL2-accelerated canvas rendering (2.5D textured engine)
- Proxies `/api/*` requests to the Go backend during development (`vite.config.ts` proxy)
- Has **no server-side rendering** — purely client-side
- Build output goes to `dist/` via `npm run build` (`tsc -b && vite build`)
- Has no `start` script in `package.json` (important for Railpack SPA detection)
- Requires SPA fallback routing (all paths must serve `index.html`)

### Relationship to Backend

The frontend calls two backend endpoints:
- `POST /api/generate` — Gemini image generation
- `POST /api/validate` — image validation

In production, these must point to the deployed backend URL. Currently the proxy in `vite.config.ts` targets `localhost:8080` — this only works in development. For production, the frontend needs a `VITE_API_URL` environment variable to resolve the backend origin, or the backend must be configured as the same origin (reverse proxy).

### Railway Platform Notes (Frontend-Specific)

- **Builder:** Railpack auto-detects Vite via `vite.config.ts` and `vite build` in the build script.
- **SPA detection:** Railpack's `isSPA` check returns `true` when no `start` script exists in `package.json`. The project meets this requirement.
- **Static serving:** Railpack provisions **Caddy** as the web server for detected SPAs — no Node.js runtime in the final container image.
- **SPA fallback:** Caddy's `try_files` directive serves `index.html` for all unmatched paths, enabling TanStack Router deep links.
- **Port:** Railway injects `PORT` env var. Caddy binds to it automatically.
- **Existing project:** The backend is already deployed as the `greenprint` Railway project. The frontend will be added as a **new service** within the same project.
- **Pricing:** No additional plan cost — the frontend service runs under the same Hobby plan ($5/month). Caddy idles at ~10 MB RAM, so resource usage is minimal.

---

## Phases

### Phase 1 — Build & Serve Configuration [ ]

> Create the Caddyfile for SPA routing + caching, configure `railway.toml`, and add the `VITE_API_URL` environment variable plumbing.

#### Feature: Caddyfile [ ]

**Status:** `todo`
**Spec:** TanStack Router SPA requires all routes to serve `index.html`

##### Tasks

- [ ] Create `Caddyfile` at repo root with the following config:
  ```caddyfile
  {
    admin off
    persist_config off
    auto_https off
    log {
      format json
    }
    servers {
      trusted_proxies static private_ranges 100.0.0.0/8
    }
  }

  :{$PORT:3000} {
    root * /srv
    encode gzip

    # SPA fallback for TanStack Router
    try_files {path} /index.html
    file_server

    # Hashed Vite assets — cache 1 year (immutable)
    @hashed {
      path /assets/*
    }
    header @hashed Cache-Control "public, max-age=31536000, immutable"

    # HTML — always fresh
    @html {
      path *.html
    }
    header @html Cache-Control "public, max-age=0, must-revalidate"

    # Other static files (favicon, images, etc.)
    @static {
      path *.ico *.png *.jpg *.jpeg *.svg *.woff *.woff2 *.gif *.webp
    }
    header @static Cache-Control "public, max-age=86400"

    log {
      format json
    }
  }
  ```
- [ ] Test Caddyfile locally: install Caddy (`brew install caddy`), run `npm run build`, then `PORT=3000 caddy run --config Caddyfile --adapter caddyfile` — verify SPA routes (`/app/canvas`) serve `index.html`

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: railway.toml (Frontend) [ ]

**Status:** `todo`

##### Tasks

- [ ] Create `railway.toml` at repo root with the following config:
  ```toml
  [build]
  builder = "RAILPACK"
  buildCommand = "npm ci && npm run build"

  [deploy]
  startCommand = "caddy run --config Caddyfile --adapter caddyfile"
  healthcheckPath = "/"
  healthcheckTimeout = 60
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
  ```
- [ ] Verify `package.json` has **no** `start` script (required for Railpack SPA detection)
- [ ] Verify `package-lock.json` exists at repo root (Railpack uses it to detect npm as package manager)

##### Decisions

_None yet._

---

#### Feature: VITE_API_URL Environment Variable [ ]

**Status:** `todo`
**Spec:** `vite.config.ts` → proxy config (dev only); production needs explicit backend URL

##### Tasks

- [ ] Add `VITE_API_URL` to `src/vite-env.d.ts` for type safety:
  ```typescript
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  ```
- [ ] Create a shared API base URL utility (e.g. `src/lib/api.ts`) that reads `import.meta.env.VITE_API_URL` with a fallback to `''` (same-origin, for when the backend embeds the SPA)
- [ ] Update all `fetch('/api/...')` calls to use the base URL utility
- [ ] Create `.env.railway.example` documenting frontend-specific variables:
  - `VITE_API_URL` (required — the public URL of the backend Railway service, e.g. `https://greenprint-backend.up.railway.app`)
  - `NODE_ENV=production` (set automatically by Railpack)
  - `PORT` (injected by Railway — do not set manually)
- [ ] Test locally with `VITE_API_URL=http://localhost:8080 npm run build` — verify the built bundle contains the correct URL

##### Decisions

_None yet._

---

### Phase 2 — Railway Service Setup [ ]

> Add a new `frontend` service to the existing `greenprint` Railway project, configure environment variables, and deploy.

#### Feature: Railway Service Init [ ]

**Status:** `todo`
**Spec:** n/a (platform setup, not code)

##### Tasks

- [ ] Ensure Railway CLI is installed: `brew install railway`
- [ ] Authenticate: `railway login`
- [ ] Link to the existing project: `railway link` → select `greenprint` project
- [ ] Add a new empty service: `railway add` → choose "Empty Service" → name it `frontend`
- [ ] Switch CLI context to the new service: `railway service` → select `frontend`
- [ ] Verify link: `railway status` should show `greenprint / frontend / production`

##### Decisions

_None yet._

---

#### Feature: Environment Variables [ ]

**Status:** `todo`

##### Tasks

- [ ] Set the backend URL (use Railway's reference syntax if backend is in the same project):
  - `railway variable set VITE_API_URL=https://<backend-domain>.up.railway.app`
  - Or with Railway reference: `railway variable set 'VITE_API_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}'`
- [ ] Set production mode: `railway variable set NODE_ENV=production`
- [ ] Optionally set `RAILPACK_SPA_OUTPUT_DIR=dist` as a belt-and-suspenders guard for SPA detection

##### Decisions

_None yet._

---

#### Feature: Deploy First Build [ ]

**Status:** `todo`

##### Tasks

- [ ] Deploy: `railway up` — watch build logs for:
  - Successful `npm ci` (dependencies installed)
  - Successful `tsc -b && vite build` (TypeScript compiled, Vite bundled)
  - Caddy starting and binding to `$PORT`
- [ ] If build fails on missing Caddy binary in the Railpack image, switch to the Dockerfile approach (see Fallback section)
- [ ] If Railpack does not inject Caddy automatically with a custom `startCommand`, switch to the Dockerfile approach
- [ ] Confirm Railway logs show Caddy serving on the assigned port
- [ ] Generate a public domain: `railway domain` — note the assigned `*.up.railway.app` URL

##### Decisions

_None yet._

---

### Phase 3 — Verification & Hardening [ ]

> Confirm the deployed frontend works end-to-end and add production safeguards.

#### Feature: End-to-End Smoke Test [ ]

**Status:** `todo`

##### Tasks

- [ ] Hit `GET https://<frontend-domain>/` — expect the React SPA `index.html` with 200
- [ ] Hit `GET https://<frontend-domain>/app` — expect SPA fallback (same `index.html`, TanStack Router renders WelcomeScreen)
- [ ] Hit `GET https://<frontend-domain>/app/canvas` — expect SPA fallback (TanStack Router renders AppLayout)
- [ ] Hit a non-existent route `GET https://<frontend-domain>/doesnotexist` — expect SPA fallback (not a Caddy 404)
- [ ] Verify `/assets/*.js` responses include `Cache-Control: public, max-age=31536000, immutable` header
- [ ] Verify `/index.html` response includes `Cache-Control: public, max-age=0, must-revalidate` header
- [ ] Test the full flow: load the SPA → create a project → trigger image generation → verify the request reaches the backend at `VITE_API_URL` and returns successfully
- [ ] Verify structured JSON logs appear in Railway dashboard log viewer

##### Decisions

_None yet._

---

#### Feature: Production Hardening [ ]

**Status:** `todo`

##### Tasks

- [ ] Confirm health check is passing in Railway dashboard (Deployments tab shows green check)
- [ ] Verify zero-downtime deploys: push a trivial frontend change and confirm Railway rolls forward without downtime
- [ ] Confirm Caddy memory usage is < 50 MB in Railway metrics (expected ~10 MB idle)
- [ ] (Optional) Connect GitHub repo in Railway dashboard for auto-deploy on push to `main`
- [ ] (Optional) Configure watch paths in `railway.toml` to only redeploy frontend when frontend files change:
  ```toml
  [build]
  watchPatterns = ["src/**", "public/**", "index.html", "package.json", "vite.config.ts", "Caddyfile", "tsconfig*.json"]
  ```
- [ ] (Optional) Add custom domain via Railway dashboard → Settings → Public Networking → "+ Custom Domain"

##### Decisions

_None yet._

---

## Fallback: Dockerfile Approach

If Railpack + custom `startCommand` does not provision Caddy in the final image, use this multi-stage Dockerfile:

```dockerfile
# Stage 1: Build the Vite SPA
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build args injected from Railway service variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

WORKDIR /app
COPY Caddyfile /etc/caddy/Caddyfile
RUN caddy fmt /etc/caddy/Caddyfile --overwrite
COPY --from=build /app/dist /srv

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
```

If this path is taken, update `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Note: When using the Dockerfile approach, `VITE_API_URL` must be passed as a build arg. Railway automatically passes service variables as Docker build args.

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Separate Railway service (not embedded in backend) | Allows independent deploy cadence for frontend changes without rebuilding the Go binary. Backend still embeds the SPA for same-origin fallback — this Railway service is the primary production frontend. |
| 2026-04-07 | Caddy over nginx or `serve` | Railway's official recommendation. Handles dynamic DNS correctly (nginx has stale DNS cache issues on Railway). Lower config complexity. Railpack provisions it natively for SPAs. |
| 2026-04-07 | Custom Caddyfile over zero-config Staticfile | Need explicit cache headers (immutable for hashed assets, no-cache for HTML). Zero-config path doesn't support cache customization. |
| 2026-04-07 | `VITE_API_URL` build-time env var for backend URL | Vite bakes `VITE_*` vars into the JS bundle at build time. No runtime injection possible for static sites. Changing the backend URL requires a rebuild. |
| 2026-04-07 | No CDN in initial deploy | Railway has no built-in CDN. Cloudflare proxy can be added later as an optional hardening step. Cache headers on Caddy handle browser caching in the meantime. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — Plan initialized. Frontend is a Vite 8 + React 19 SPA with TanStack Router. Deploying as a separate Railway service ("frontend") within the existing "greenprint" project. Caddy serves static files with SPA fallback. Dockerfile kept as fallback if Railpack doesn't provision Caddy with a custom startCommand.
```
