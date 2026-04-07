# Garden Planner — Local CI Pipeline

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
| **Plan ID** | `PLAN-E` |
| **Title** | Local CI Pipeline — Linting, Hooks & Cached Builds |
| **Scope** | Makefile-based build orchestration with stamp-file caching, golangci-lint for Go, lefthook for git hooks, and a full `make ci` pipeline. Excludes remote CI (GitHub Actions), Docker, and deployment. |
| **Depends on** | None (standalone tooling plan) |
| **Status** | `done` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1 (Makefile) · Phase 2 (Go Linting) · Phase 3 (Git Hooks) · Phase 4 (Full Pipeline) |

---

## Context Map

### How to load a specific section

```bash
# List current Makefile targets:
grep -n "^[a-z]" Makefile

# Find all test commands across the repo:
grep -rn "go test\|vitest\|npm.*test" Makefile package.json

# Find embed directive:
grep -rn "go:embed" .

# Find current lint setup:
grep -rn "eslint\|golangci" package.json .golangci.yml 2>/dev/null
```

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `Makefile` | Build orchestration, all targets | Full read — short file |
| `package.json` | Frontend scripts (build, lint, test) | `grep -n "scripts" package.json` |
| `go.mod` | Go module name (`greenprint`) and version (`1.26`) | First 5 lines |
| `static.go` | `go:embed frontend/dist` directive | Full read — 9 lines |
| `vite.config.ts` | Frontend build config, dev proxy to `:8080` | Full read — 16 lines |
| `.golangci.yml` | Go linter configuration (golangci-lint v2) | Full read — short file |
| `eslint.config.js` | Frontend lint rules (flat config, TS/TSX) | Full read — short file |
| `tsconfig.json` | TypeScript project references → `tsconfig.app.json`, `tsconfig.node.json` | Full read — short file |
| `lefthook.yml` | Git hook configuration (pre-commit: fmt/lint; pre-push: test/build) | Full read — short file |

---

## Phases

### Phase 1 — Makefile Build Orchestration [x]

> Refactor the Makefile from phony-only targets to stamp-file-based incremental builds. This is the foundation — all later phases add targets to this Makefile. Must be done first because Phase 2–4 targets depend on the caching infrastructure.

#### Feature: Stamp-File Incremental Builds [x]

**Status:** `done`
**Spec:** N/A — industry pattern
**Rationale:** The current Makefile always rebuilds everything. Stamp files let Make compare mtimes against source file lists and skip work that hasn't changed, cutting iteration time from ~10s to <1s on no-change runs.

##### Tasks

- [x] Define source file variables at top of Makefile — done 2026-04-07
  - `GOFILES := $(shell find cmd internal -name '*.go' 2>/dev/null) $(wildcard *.go)`
  - `FRONTEND_SRC := $(shell find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \)) index.html`
  Note: `find` uses explicit grouping `\( ... \)` to avoid precedence bugs with `-o`. `index.html` is added explicitly — it's Vite's entry point at the repo root. Implementation also includes `public/` dir and `tsconfig.node.json`.
- [x] Add `.npm.stamp` root-level file target depending on `package.json` and `package-lock.json` — runs `npm ci && touch $@`. Root-level stamp avoids fragility of `node_modules/.stamp` being deleted by `npm ci` or `rm -rf node_modules`. — done 2026-04-07
- [x] Convert `build-frontend` to file target `.frontend-dist.stamp` (root-level) depending on `$(FRONTEND_SRC)` and `.npm.stamp` — runs `npm run build && touch $@`. Vite `build.outDir` set to `frontend/dist` in `vite.config.ts`, so no `rm -rf && mv` needed. — done 2026-04-07
- [x] Convert `build-backend` to file target `server/server` depending on `$(GOFILES)`, `go.mod`, `go.sum`, and `.frontend-dist.stamp` — runs `CGO_ENABLED=0 go build -ldflags "-X main.version=$(VERSION)" -o server/server ./cmd/server/`. This enforces frontend-before-backend ordering required by `go:embed`. — done 2026-04-07
- [x] Keep `build`, `run`, `dev`, `clean` as `.PHONY` convenience targets that delegate to file targets — done 2026-04-07
- [x] Update `clean` to remove `server/server`, `frontend/dist/`, and all `.*.stamp` files — done 2026-04-07
- [x] Add `.*.stamp` and `frontend/dist/` to `.gitignore` — done 2026-04-07
- [x] Verify: `make build` twice in a row — second run prints `make: Nothing to be done for 'build'.` or `make: 'server/server' is up to date.` — done 2026-04-07
- [x] Verify: `make build` from a totally clean clone (no `node_modules/`, no `frontend/dist/`) succeeds end-to-end — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Test Targets [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** Tests currently require manual `go test ./...` and `npm run test` invocations. Makefile targets make them discoverable and allow the CI pipeline to depend on them.

##### Tasks

- [x] Add `test-go` phony target: `go test -race -count=1 -timeout=60s ./...` — done 2026-04-07
- [x] Add `test-frontend` phony target: `npm run test` — done 2026-04-07
- [x] Add `test` umbrella phony target that runs both — done 2026-04-07
- [x] Add `.test-go.stamp` file target depending on `$(GOFILES)`, `go.mod`, `go.sum` — runs `go test -race -count=1 -timeout=60s ./... && touch $@` — done 2026-04-07
- [x] Add `.test-frontend.stamp` file target depending on `$(FRONTEND_SRC)`, `.npm.stamp`, and `vitest.config.ts` — runs `npm run test && touch $@` — done 2026-04-07

##### Decisions

_None yet._

---

### Phase 2 — Go Linting with golangci-lint [x]

> Install and configure golangci-lint with a curated set of linters for the existing Go codebase. This must be done before hooks (Phase 3) so that the pre-commit hook can call `golangci-lint run`.

#### Feature: golangci-lint Configuration [x]

**Status:** `done`
**Spec:** N/A — industry standard tooling
**Rationale:** The project currently has zero Go linting beyond `go vet` (which is not explicitly run). golangci-lint aggregates 50+ linters behind one binary with caching and diff-mode support.

##### Tasks

- [x] Install golangci-lint v2: `curl -sSfL https://golangci-lint.run/install.sh | sh -s -- -b $(go env GOPATH)/bin` — done 2026-04-07
- [x] Create `.golangci.yml` in project root (with additional exclusions for node_modules, test errcheck, and debug-prompt; disabled revive/package-comments): — done 2026-04-07
  ```yaml
  version: "2"
  run:
    timeout: 5m
    go: "1.26"
    modules-download-mode: readonly
  linters:
    default: standard  # govet, errcheck, staticcheck, unused
    enable:
      - revive       # code style, superset of golint
      - gosec        # security
      - gocritic     # opinionated style + performance
      - prealloc     # slice pre-allocation
    settings:
      errcheck:
        check-type-assertions: true
        check-blank: true
      gosec:
        excludes:
          - G104     # unhandled errors (covered by errcheck)
      gocritic:
        enabled-tags:
          - diagnostic
          - performance
          - style
  issues:
    max-issues-per-linter: 0
    max-same-issues: 0
    exclude-rules:
      - path: "_test\\.go"
        linters:
          - gosec
  ```
- [x] Run `golangci-lint run ./...` and fix all reported issues (115 initial, all resolved) — done 2026-04-07
- [x] Verify `golangci-lint run --new-from-rev HEAD ./...` completes in under 3 seconds with no staged changes — done 2026-04-07
- [x] Add `.golangci.yml` to the Context Map of this plan — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Lint Makefile Targets [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** Linting needs Makefile targets so the CI pipeline and hooks invoke it consistently.

##### Tasks

- [x] Add `lint-go` phony target: `golangci-lint run ./...` — done 2026-04-07
- [x] Add `lint-frontend` phony target: `npm run lint` — done 2026-04-07
- [x] Add `lint` umbrella phony target that runs both — done 2026-04-07
- [x] Add `.lint-go.stamp` file target depending on `$(GOFILES)` and `.golangci.yml` — runs `golangci-lint run ./... && touch $@` — already existed from Phase 1
- [x] Add `.lint-frontend.stamp` file target depending on `$(FRONTEND_SRC)`, `.npm.stamp`, and `eslint.config.js` — runs `npm run lint && touch $@` — already existed from Phase 1
- [x] Add `fmt` phony target: `gofmt -w $(shell find . -name '*.go' -not -path './vendor/*' -not -path './.git/*' -not -path './node_modules/*')` — done 2026-04-07

##### Decisions

_None yet._

---

### Phase 3 — Git Hooks with Lefthook [x]

> Install lefthook and configure pre-commit and pre-push hooks. Depends on Phase 2 — golangci-lint must be installed and `.golangci.yml` must exist before hooks can call it.

#### Feature: Lefthook Installation [x]

**Status:** `done`
**Spec:** N/A — industry standard tooling
**Rationale:** No git hooks exist currently. Lefthook is Go-native, runs hooks in parallel, and supports glob-based filtering so Go hooks only fire on `.go` changes and JS hooks only on `.ts/.tsx` changes. Installed via npm so `npm install` auto-sets up hooks for all contributors.

##### Tasks

- [x] Install lefthook as npm devDependency: `npm install lefthook --save-dev` — done 2026-04-07
- [x] Add `"prepare": "lefthook install"` to `package.json` scripts — done 2026-04-07
- [x] Run `npx lefthook install` to write `.git/hooks/*` shims — done 2026-04-07
- [x] Add `lefthook-local.yml` to `.gitignore` (per-developer overrides, not committed) — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Pre-commit Hooks [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** Pre-commit hooks provide fast feedback on staged changes. Target: under 5 seconds total. Only staged files are checked. Glob filtering ensures Go hooks skip when only TS files are staged (and vice versa).

##### Tasks

- [x] Create `lefthook.yml` in project root with `pre-commit.parallel: true` — done 2026-04-07
- [x] Add `go-fmt` command: — done 2026-04-07
  ```yaml
  go-fmt:
    glob: "**/*.go"
    run: 'test -z "$(gofmt -l {staged_files})" || (echo "gofmt needed:" && gofmt -l {staged_files} && exit 1)'
  ```
  Note: `gofmt -l` always exits 0 — it prints names but never fails. The `test -z` wrapper checks for non-empty output and exits 1 if formatting is needed. Developer runs `make fmt` to fix.
- [x] Add `go-lint` command: — done 2026-04-07
  ```yaml
  go-lint:
    glob: "**/*.go"
    run: golangci-lint run --new-from-rev HEAD ./...
  ```
  Uses diff-mode to lint only code changed since HEAD. Note: checks full working tree diff, not just staged files — a known golangci-lint limitation. Skipped entirely if no `.go` files are staged.
- [x] Add `ts-lint` command: — done 2026-04-07
  ```yaml
  ts-lint:
    glob: "**/*.{ts,tsx}"
    run: npx eslint {staged_files}
  ```
- [x] Add `ts-typecheck` command: — done 2026-04-07
  ```yaml
  ts-typecheck:
    glob: "**/*.{ts,tsx}"
    run: npx tsc --noEmit
  ```
  No `{staged_files}` — tsc requires whole-project context. Runs only when TS files are staged.
- [x] Test: stage a `.go` file with a formatting error → commit blocked, message shows which file — done 2026-04-07
- [x] Test: stage only `.ts` files → Go hooks (`go-fmt`, `go-lint`) are skipped entirely — done 2026-04-07
- [x] Test: `LEFTHOOK=0 git commit -m "skip"` → all hooks bypassed — done 2026-04-07
- [x] Test: `git commit --no-verify -m "skip"` → all hooks bypassed — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Pre-push Hooks [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** Slower checks (full test suites, build verification) run on push. Catches issues before they reach the remote. Acceptable runtime: 30–90 seconds.

##### Tasks

- [x] Add `pre-push` section to `lefthook.yml` with `parallel: true` — done 2026-04-07
- [x] Add `go-test` command: — done 2026-04-07
  ```yaml
  go-test:
    glob: "**/*.go"
    run: go test -race -count=1 -timeout=60s ./...
  ```
- [x] Add `frontend-test` command: — done 2026-04-07
  ```yaml
  frontend-test:
    glob: "**/*.{ts,tsx}"
    run: npm run test
  ```
- [x] Add `frontend-build` command: — done 2026-04-07
  ```yaml
  frontend-build:
    glob: "**/*.{ts,tsx,css,html}"
    run: npm run build
  ```
  Catches bundling errors that tsc --noEmit alone misses (Vite plugin issues, CSS errors, asset resolution).
- [x] Test: push with a failing Go test → push is blocked with test output shown — done 2026-04-07

##### Decisions

_None yet._

---

### Phase 4 — Full CI Pipeline Target [x]

> Wire everything together into `make ci`. Depends on all previous phases — lint targets (Phase 2), test targets (Phase 1), and build targets (Phase 1) must all exist.

#### Feature: `make ci` Pipeline [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** A single command that validates the entire project. Stamp files ensure only changed areas are rechecked. This is the "green light" command a developer runs before pushing.

##### Tasks

- [x] Add `ci` phony target depending on: `.lint-go.stamp`, `.lint-frontend.stamp`, `.test-go.stamp`, `.test-frontend.stamp`, `server/server` — already existed from Phase 1
- [x] Verify `make ci` from clean state runs all stages: `npm ci`, lint (Go + frontend), test (Go + frontend), build (frontend then backend). Note: Make resolves the dependency graph — order is determined by prerequisites, not listing order. Independent targets (lint-go, lint-frontend, test-go, test-frontend) may run in any order or in parallel with `make -j`. — done 2026-04-07
- [x] Verify `make ci` on second run with no source changes completes in under 2 seconds (all stamps up-to-date) — done 2026-04-07 (0.061s)
- [x] Verify `make ci` after editing one `.go` file only re-runs: `.lint-go.stamp`, `.test-go.stamp`, `server/server` — frontend stamps are untouched — done 2026-04-07
- [x] Verify `make ci` after editing one `.tsx` file only re-runs: `.lint-frontend.stamp`, `.test-frontend.stamp`, `.frontend-dist.stamp`, `server/server` — Go lint/test stamps also re-run because they depend on `.frontend-dist.stamp` (required for `go:embed`) — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Developer Ergonomics [x]

**Status:** `done`
**Spec:** N/A
**Rationale:** New contributors need to know what targets exist and how hooks are set up.

##### Tasks

- [x] Add a comment header to the top of the Makefile listing all targets with one-line descriptions — already existed from Phase 1
- [x] Set `ci` or a help target as the default (first) target in the Makefile — done 2026-04-07 (`.DEFAULT_GOAL := ci`)
- [x] Verify `npm install` triggers `lefthook install` via the `prepare` script — new clone → `npm install` → hooks are active — done 2026-04-07 (confirmed: "sync hooks: ✔️" in npm ci output)
- [x] Verify `make` with no arguments prints help or runs `ci` — done 2026-04-07 (runs `ci`)

##### Decisions

_None yet._

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Makefile over go-task/just | Already in use, zero new dependencies, stamp-file pattern provides incremental builds natively. Reassess if Makefile exceeds ~120 lines or needs conditional logic. |
| 2026-04-07 | Lefthook over husky | Go-native binary, parallel hook execution, glob filtering skips irrelevant hooks, single YAML config replaces husky + lint-staged. Installed via npm for team-wide consistency. |
| 2026-04-07 | golangci-lint v2 with `standard` preset | Includes govet, errcheck, staticcheck, unused by default. Additional linters (revive, gosec, gocritic, prealloc) added selectively — not the full set of 50+. |
| 2026-04-07 | Pre-commit: lint + format only. Pre-push: test + build. | Pre-commit must stay under 5s. Full test suite + Vite build is 30–90s, acceptable only on push. |
| 2026-04-07 | Stamp files in project root (`.lint-go.stamp`, `.test-go.stamp`, etc.) | Simpler than a `.stamps/` directory. Dot-prefixed so they're hidden in `ls`. Added to `.gitignore`. Make's mtime comparison provides free incremental caching. |
| 2026-04-07 | `gofmt -l` (list mode) in pre-commit, not `gofmt -w` (write mode) | Hook should fail and show which files need formatting, not silently rewrite staged content. Developer runs `make fmt` to fix. Avoids surprising partial-stage scenarios. |
| 2026-04-07 | Frontend source is in repo root `src/`, not `frontend/src/` | Vite config and package.json are at root. `frontend/dist/` is only the build output directory, created by the Makefile. `FRONTEND_SRC` finds files from `src/` plus `index.html` (Vite entry point). |
| 2026-04-07 | All stamp files at project root with dot-prefix | Review finding: stamps inside directories (e.g., `node_modules/.stamp`, `frontend/dist/.stamp`) are fragile — deleted by `npm ci` or `rm -rf`. Root-level `.npm.stamp`, `.frontend-dist.stamp` etc. are safer and consistently matched by `.*.stamp` gitignore. |
| 2026-04-07 | Lefthook globs use `**/*.go` not `*.go` | Review finding: `*.go` only matches root-level files. `**/*.go` matches all subdirectories (`cmd/`, `internal/`). Same for `**/*.{ts,tsx}`. |
| 2026-04-07 | `gofmt -l` wrapped with `test -z` exit check | Review finding: `gofmt -l` always exits 0 regardless of formatting issues. Without the wrapper, the pre-commit hook would never block a commit. |
| 2026-04-07 | Vite `build.outDir` set to `frontend/dist` | Eliminates fragile `rm -rf frontend/dist && mv dist frontend/dist` pattern. Vite writes directly to the directory `go:embed` expects. `emptyOutDir: true` handles cleanup. |
| 2026-04-07 | Version injection via `-ldflags "-X main.version=$(VERSION)"` | Binary carries a meaningful git tag (`git describe --tags --always --dirty`). Enables version verification on deployed instances via `/api/health`. |
| 2026-04-07 | `CGO_ENABLED=0` on `go build` | Prevents accidental dynamic linking if a transitive dependency ever adds CGo. Makes cross-compilation straightforward (macOS dev → Linux deploy). |
| 2026-04-07 | `go.sum` added as dependency to all Go targets | A `go get -u` patch release changes `go.sum` without touching `go.mod`. Without this, stamp files would miss module graph changes. |
| 2026-04-07 | `.lint-go.stamp` and `.test-go.stamp` depend on `.frontend-dist.stamp` | Go lint and test require `frontend/dist` to exist (due to `go:embed` in `static.go`). Without this, `make ci` from a clean state fails because golangci-lint can't compile the Go module. |
| 2026-04-07 | `.DEFAULT_GOAL := ci` (not `build`) | `make` with no arguments should run the full pipeline, not just the binary. Developers who want only the binary use `make build`. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — plan-creation — PLAN-E initialized. Four phases: Makefile stamp-file caching, golangci-lint setup, lefthook git hooks, full CI pipeline. Research completed on lefthook (parallel, glob filtering, stage_fixed), golangci-lint v2 (standard preset, --new-from-rev), Makefile stamp patterns (mtime-based incremental builds). Key structural note: frontend source lives at repo root src/, not frontend/src/.
2026-04-07 — architect-review + devops-review — Fixed 7 issues: (1) FRONTEND_SRC find precedence bug and missing index.html, (2) stamp files moved from inside directories to root-level dot-prefix, (3) lefthook globs changed from *.go to **/*.go, (4) gofmt -l wrapped with test -z exit check, (5) added config file deps to lint/test stamps (eslint.config.js, vitest.config.ts), (6) corrected make ci verification text re: ordering, (7) added frontend/dist/ to .gitignore entries.
2026-04-07 — Phase 1 partially complete. Makefile rewritten with stamp-file pattern, version injection, CGO_ENABLED=0. vite.config.ts updated to output directly to frontend/dist (outDir change). .gitignore updated with .*.stamp and frontend/dist. Stamp targets for lint and test exist but phony convenience targets (test-go, lint-go, etc.) deferred. .golangci.yml not yet created — .lint-go.stamp will fail until Phase 2.
2026-04-07 — Phase 1 complete. Added phony test targets (test-go, test-frontend, test) to Makefile. Updated Makefile comment header to list new targets. All Phase 1 tasks done; proceeding to Phase 2.
2026-04-07 — Phase 2 complete. Installed golangci-lint v2.11.4. Created .golangci.yml with standard preset + revive/gosec/gocritic/prealloc. Fixed 115 lint issues across codebase: errcheck (handled/suppressed), gocritic (hugeParam → pointers, rangeValCopy → index, assignOp, paramTypeCombine, unnamedResult, octalLiteral), gosec (nolint with rationale), unused (removed dead code), revive (disabled package-comments). Added node_modules and test/debug exclusion rules. Added phony lint/fmt targets to Makefile. All tests pass, 0 lint issues.
2026-04-07 — Phase 3 complete. Installed lefthook v2.1.5 as npm devDependency. Added "prepare": "lefthook install" to package.json scripts. Created lefthook.yml with pre-commit (parallel: go-fmt, go-lint, ts-lint, ts-typecheck with glob filtering) and pre-push (parallel: go-test, frontend-test, frontend-build with glob filtering). Added lefthook-local.yml to .gitignore. Hooks synced successfully.
2026-04-07 — Phase 4 complete. Set .DEFAULT_GOAL := ci so bare `make` runs the full pipeline. Added .frontend-dist.stamp as dependency to .lint-go.stamp and .test-go.stamp (required for go:embed). Fixed gocritic builtinShadow in score.go (min/max → lo/hi). Fixed 62 pre-existing frontend ESLint errors across 20+ files (unused vars, react-refresh, react-hooks/refs, react-hooks/set-state-in-effect). Verified: make ci from clean state passes all stages; cached run 0.061s; selective Go-only and frontend-only rebuilds work correctly. PLAN-E fully complete.
```
