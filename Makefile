# =============================================================================
# greenprint — Go + React single-binary build
#
# Stamp-file pattern: each logical step creates a hidden .*.stamp file whose
# mtime Make uses to decide whether the step is stale.  This gives genuine
# incremental builds without shelling out to custom scripts.
#
# Prerequisites for local use:
#   go 1.26+, node (version from .nvmrc / engines), npm, golangci-lint
#
# Usage:
#   make            — run full CI pipeline (lint + test + build)
#   make ci         — lint + test + build (parallel-safe with -j)
#   make test       — run all test suites (Go + frontend)
#   make test-go    — run Go tests only
#   make test-frontend — run frontend tests only
#   make lint       — run all linters (Go + frontend)
#   make lint-go    — run Go linting only
#   make lint-frontend — run frontend linting only
#   make fmt        — format all Go source files
#   make dev        — rebuild & run
#   make clean      — remove all build artefacts and stamps
# =============================================================================

# ---------------------------------------------------------------------------
# Tooling
# ---------------------------------------------------------------------------
GO      := go
NPM     := npm
LINT_GO := golangci-lint

# ---------------------------------------------------------------------------
# Version — uses git describe so the binary carries a meaningful tag.
# Falls back to "dev" when there are no tags (fresh clone, CI without fetch).
# ---------------------------------------------------------------------------
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# ---------------------------------------------------------------------------
# Output paths
# ---------------------------------------------------------------------------
BINARY := server/server

# ---------------------------------------------------------------------------
# Source file lists (evaluated once at parse time, not per-recipe).
#
# GOFILES: every .go file under cmd/, internal/, and the project root.
#   - "find . -maxdepth 1 -name '*.go'" captures static.go and any other
#     root-level files (embed declarations, doc.go, etc.) that
#     "find cmd internal" would miss.
#   - Both find expressions are guarded with 2>/dev/null so a missing
#     directory (e.g. before first checkout of a new package) does not
#     fail the parse step.
#
# FRONTEND_SRC: every file that Vite reads to produce frontend/dist.
#   - public/ is included because Vite copies it verbatim into the output;
#     a new favicon or robots.txt must invalidate the frontend stamp.
# ---------------------------------------------------------------------------
GOFILES := \
	$(shell find cmd internal -name '*.go' 2>/dev/null) \
	$(shell find . -maxdepth 1 -name '*.go' 2>/dev/null)

FRONTEND_SRC := \
	$(shell find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) 2>/dev/null) \
	$(shell find public -type f 2>/dev/null) \
	index.html \
	vite.config.ts \
	tsconfig.json \
	tsconfig.app.json \
	tsconfig.node.json

# ---------------------------------------------------------------------------
# Phony targets — never correspond to real files.
# ---------------------------------------------------------------------------
.PHONY: build ci dev run clean test test-go test-frontend lint lint-go lint-frontend fmt

# ---------------------------------------------------------------------------
# Default target — "make" with no arguments runs the full CI pipeline.
# Use "make build" for just the binary.
# ---------------------------------------------------------------------------
.DEFAULT_GOAL := ci

build: $(BINARY)

# =============================================================================
# Stamp: npm install
#
# Runs "npm ci" (not "npm install") so CI and local get identical trees.
# Depends only on the lockfile; a change to package.json alone does not
# re-install unless package-lock.json also changes, which is correct because
# npm updates the lockfile whenever package.json changes in a meaningful way.
# =============================================================================
.npm.stamp: package.json package-lock.json
	$(NPM) ci
	@touch $@

# =============================================================================
# Stamp: frontend build
#
# Depends on .npm.stamp (node_modules ready) and every source file Vite reads.
#
# IMPORTANT: vite.config.ts must set build.outDir = 'frontend/dist' so that
# "npm run build" writes directly to the directory go:embed expects.  This
# eliminates the fragile "rm -rf frontend/dist && mv dist frontend/dist"
# pattern, which could leave no frontend/dist if mv fails mid-recipe.
#
# Recipe structure — why this order matters:
#   1. Remove the stamp first so that if npm run build fails, Make will always
#      consider this target stale on the next invocation.
#   2. Run the build.
#   3. Re-create the stamp only on success (shell && semantics).
# =============================================================================
.frontend-dist.stamp: $(FRONTEND_SRC) .npm.stamp
	@rm -f $@
	$(NPM) run build
	@touch $@

# =============================================================================
# Binary: server/server
#
# Depends on all Go source, the module files, and the frontend stamp.
# go.sum is an explicit dependency: a "go get -u patch" changes go.sum
# without touching go.mod, and the new checksums must be reflected in the
# binary's module graph.
#
# -ldflags "-X main.version=..." injects the version string derived above.
# The package path "main" resolves correctly because go build sets the
# linker's package context to the main package being compiled.
#
# CGO_ENABLED=0 is set explicitly even though this project has no CGo,
# because it prevents accidental dynamic linking if a transitive dependency
# ever adds a CGo call, and makes cross-compilation straightforward.
# =============================================================================
$(BINARY): $(GOFILES) go.mod go.sum .frontend-dist.stamp
	CGO_ENABLED=0 $(GO) build \
		-ldflags "-X main.version=$(VERSION)" \
		-o $(BINARY) \
		./cmd/server/

# =============================================================================
# Stamp: Go lint
#
# golangci-lint reads go.mod/go.sum for module context and .golangci.yml
# for configuration.  go.sum is included for the same reason as the binary.
# =============================================================================
.lint-go.stamp: $(GOFILES) go.mod go.sum .golangci.yml .frontend-dist.stamp
	$(LINT_GO) run ./...
	@touch $@

# =============================================================================
# Stamp: frontend lint
#
# eslint.config.js controls the ruleset.  .npm.stamp ensures node_modules
# is populated before eslint runs.
# =============================================================================
.lint-frontend.stamp: $(FRONTEND_SRC) .npm.stamp eslint.config.js
	$(NPM) run lint
	@touch $@

# =============================================================================
# Stamp: Go tests
#
# -count=1 disables the test result cache so stamps are the source of truth
# (otherwise "go test" may report PASS from cache without running anything).
# -race enables the race detector; pure Go, no CGo, so this is cost-free in
# terms of build complexity.
# go.sum is a dependency: a module update could change test behaviour.
# =============================================================================
.test-go.stamp: $(GOFILES) go.mod go.sum .frontend-dist.stamp
	$(GO) test -race -count=1 -timeout=60s ./...
	@touch $@

# =============================================================================
# Stamp: frontend tests (vitest)
#
# vitest.config.ts controls test discovery and transforms.
# =============================================================================
.test-frontend.stamp: $(FRONTEND_SRC) .npm.stamp vitest.config.ts
	$(NPM) run test
	@touch $@

# =============================================================================
# CI target
#
# All lint and test stamps are independent of each other (they share source
# inputs but do not share outputs), so "make ci -j$(nproc)" runs them in
# parallel.  Make respects the explicit prerequisite chain:
#
#   .npm.stamp
#     └── .frontend-dist.stamp
#           └── server/server
#
# so the frontend is never built before npm ci, and the binary is never
# linked before the frontend is embedded.  The lint/test stamps have no
# ordering dependency on each other or on the binary, so they run freely.
# =============================================================================
ci: .lint-go.stamp .lint-frontend.stamp .test-go.stamp .test-frontend.stamp $(BINARY)

# =============================================================================
# Test targets (phony convenience wrappers)
# =============================================================================

# test-go: run Go tests unconditionally (ignores stamp).
test-go:
	$(GO) test -race -count=1 -timeout=60s ./...

# test-frontend: run frontend tests unconditionally (ignores stamp).
test-frontend:
	$(NPM) run test

# test: run all test suites.
test: test-go test-frontend

# =============================================================================
# Lint targets (phony convenience wrappers)
# =============================================================================

# lint-go: run Go linting unconditionally (ignores stamp).
lint-go:
	$(LINT_GO) run ./...

# lint-frontend: run frontend linting unconditionally (ignores stamp).
lint-frontend:
	$(NPM) run lint

# lint: run all linters.
lint: lint-go lint-frontend

# fmt: format all Go source files.
fmt:
	gofmt -w $(shell find . -name '*.go' -not -path './vendor/*' -not -path './.git/*' -not -path './node_modules/*')

# =============================================================================
# Developer targets
# =============================================================================

# run: execute the binary directly (does not rebuild).
run: $(BINARY)
	./$(BINARY)

# dev: full incremental rebuild then run.
dev: build run

# =============================================================================
# Clean
#
# Removes the binary, the embedded frontend, and all stamps.
# node_modules is intentionally NOT removed; use "npm ci" or "make .npm.stamp"
# explicitly if you need a clean module tree.
# =============================================================================
clean:
	@rm -f $(BINARY)
	@rm -rf frontend/dist
	@rm -f .npm.stamp .frontend-dist.stamp .lint-go.stamp .lint-frontend.stamp \
	        .test-go.stamp .test-frontend.stamp
	@echo "cleaned"
