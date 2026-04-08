# BAU Backlog — Blueprint Garden

> **Purpose:** AI-first backlog of improvements, bug fixes, and technical debt items. Each item is scoped for an agent to pick up, create a plan from `PLAN_TEMPLATE.md`, and implement autonomously.

**Last updated:** 2026-04-08

---

## Agent Protocol

### How to use this backlog

1. **Scan the table below** — find items with status `open` in priority order (critical → high → medium → low).
2. **Pick one item or a related cluster** — items sharing a `Group` tag can be planned together.
3. **Create a plan** — copy `docs/plans/PLAN_TEMPLATE.md` to `docs/plans/PLAN_BAU-<ID>.md` and fill it using the context hints provided in each item.
4. **Implement the plan** — follow the plan's agent protocol.
5. **Update this file** — mark the item `done` with the date and link the plan file.

### Item format

Each item includes:
- **ID** — stable reference (`BAU-<number>`)
- **Group** — cluster tag for related items that could share a plan
- **Priority** — `critical` | `high` | `medium` | `low`
- **Context hints** — files, grep patterns, and doc references an agent needs to scope the work
- **Acceptance criteria** — what "done" looks like, testable by another agent

### Status vocabulary

| Symbol | Meaning |
|--------|---------|
| `open` | Available for an agent to pick up |
| `planned` | A plan exists (link provided) |
| `in-progress` | Implementation underway |
| `done` | Merged and verified |

---

## Status Summary

| ID | Title | Group | Priority | Status |
|----|-------|-------|----------|--------|
| BAU-1 | Component test coverage | testing | critical | `open` |
| BAU-2 | Error boundary for lazy imports | error-handling | critical | `open` |
| BAU-3 | File size validation on import | error-handling | critical | `open` |
| BAU-4 | Centralized error logging with user-facing toasts | error-handling | high | `open` |
| BAU-5 | Break down large components (JournalView, InspectorPanel) | refactor | high | `open` |
| BAU-6 | Consolidate inspectors to shadcn/ui | refactor | high | `open` |
| BAU-7 | Canvas keyboard accessibility | accessibility | high | `open` |
| BAU-8 | IndexedDB migration system | data | high | `open` |
| BAU-9 | API retry with exponential backoff | error-handling | high | `open` |
| BAU-10 | PNG export error feedback | error-handling | medium | `open` |
| BAU-11 | Remove generate store stubs or implement features | cleanup | medium | `open` |
| BAU-12 | Type-safe error handling (remove `as unknown` casts) | type-safety | medium | `open` |
| BAU-13 | Bold/italic keyboard shortcuts for labels | feature | medium | `open` |
| BAU-14 | Multi-select plant batch editing | feature | medium | `open` |
| BAU-15 | Go server graceful shutdown | backend | medium | `open` |
| BAU-16 | Anonymous error tracking (Sentry or similar) | observability | low | `open` |
| BAU-17 | Store method JSDoc documentation | docs | low | `open` |
| BAU-18 | ESLint rule compliance (remove disables) | cleanup | low | `open` |

---

## Items

### BAU-1: Component test coverage `critical` `testing`

**Problem:** 43+ React components under `src/components/` have zero unit tests. Regressions go undetected until manual QA.

**Context hints:**
- `ls src/components/*.tsx` — list all components
- `grep -rn "describe\|it(" src/ --include="*.test.*"` — find existing test files
- Test runner: vitest (check `vite.config.ts` or `vitest.config.ts`)

**Acceptance criteria:**
- [ ] Tests exist for critical-path components: `AppLayout`, `TopToolbar`, `SidePalette`, `InspectorPanel`, `WelcomeScreen`, `GeneratePage`
- [ ] Each tested component covers: render without crash, key user interactions, conditional rendering branches
- [ ] `npm test` / `vitest` passes with no failures
- [ ] Coverage report shows >60% line coverage for tested components

---

### BAU-2: Error boundary for lazy imports `critical` `error-handling`

**Problem:** `React.lazy()` in `src/App.tsx` (lines 13-15) chains two dynamic imports with no error boundary. If either import fails (network issue, deploy race), the app white-screens.

**Context hints:**
- `src/App.tsx` — the lazy import chain
- React docs: Error Boundaries, Suspense

**Acceptance criteria:**
- [ ] An `ErrorBoundary` component wraps the `Suspense` in `App.tsx`
- [ ] On import failure, user sees a friendly error with a "Reload" button
- [ ] Manually testable by blocking the chunk URL in DevTools Network tab

---

### BAU-3: File size validation on import `critical` `error-handling`

**Problem:** `WelcomeScreen.tsx` accepts JSON file imports and passes them to `schemaValidation.ts` without checking file size. A multi-GB file could exhaust browser memory before validation even starts.

**Context hints:**
- `src/components/WelcomeScreen.tsx` — file import handler
- `src/db/schemaValidation.ts` — validation entry point
- `grep -n "FileReader\|readAsText\|JSON.parse" src/components/WelcomeScreen.tsx`

**Acceptance criteria:**
- [ ] Import rejects files over a configurable size limit (suggest 50MB) with a toast message
- [ ] Check happens before `FileReader.readAsText()` is called
- [ ] Limit is defined as a named constant, not a magic number

---

### BAU-4: Centralized error logging with user-facing toasts `high` `error-handling`

**Problem:** Errors are logged to `console.error` across multiple files but users never see them. Auto-save failures (`useProjectStore.ts:55`), DB errors (`projectsDb.ts`), WebGL context loss (`CanvasHost.tsx:289`) — all silent in production.

**Context hints:**
- `grep -rn "console.error" src/` — find all error logging sites
- Existing toast system: check if `sonner`, `react-hot-toast`, or shadcn toast is already in `package.json`

**Acceptance criteria:**
- [ ] A `logger.error()` utility exists that logs to console AND shows a user-facing toast
- [ ] All existing `console.error` calls in `src/store/` and `src/db/` are migrated to the new logger
- [ ] Toast messages are user-friendly (no stack traces, no technical jargon)
- [ ] Auto-save failure toast includes a "Retry" action

---

### BAU-5: Break down large components `high` `refactor`

**Problem:** Several components exceed 700+ lines, making them hard to test, review, and modify:
- `src/components/JournalView.tsx` — 920 lines
- `src/components/InspectorPanel.tsx` — 899 lines
- `src/canvas-pixi/CanvasHost.tsx` — 770 lines

**Context hints:**
- `wc -l src/components/JournalView.tsx src/components/InspectorPanel.tsx src/canvas-pixi/CanvasHost.tsx`
- `grep -n "^const \|^function \|^export " <file>` — find component/function boundaries

**Acceptance criteria:**
- [ ] `JournalView.tsx` split into composition of sub-components (entry list, entry editor, timeline, filters)
- [ ] `InspectorPanel.tsx` split into per-element-type inspector components with a shared layout wrapper
- [ ] No file exceeds 500 lines after refactoring
- [ ] All existing functionality preserved (no behavioral changes)
- [ ] App renders identically before and after (visual regression check)

---

### BAU-6: Consolidate inspectors to shadcn/ui `high` `refactor`

**Problem:** Inspector panels use inconsistent UI patterns — raw HTML inputs, plain checkboxes, varying layouts.

**Context hints:**
- `src/components/InspectorPanel.tsx` — all inspector sub-panels
- `grep -rn "shadcn\|@/components/ui" src/` — check existing shadcn usage
- `docs/frontend/visual-design.md` → design system reference

**Acceptance criteria:**
- [ ] All inspector panels (label, plant, structure, path, terrain, dimension) use shadcn/ui components
- [ ] Shared `InspectorField`, `InspectorSection` wrapper components established
- [ ] Bold/italic toggles use icon buttons (not checkboxes)
- [ ] Consistent spacing, typography, and interaction patterns across all inspectors

---

### BAU-7: Canvas keyboard accessibility `high` `accessibility`

**Problem:** Canvas-based tools (terrain brush, plant placement, structure drawing) require mouse interaction with no keyboard alternatives. Screen readers cannot access interactive canvas elements.

**Context hints:**
- `src/canvas-pixi/InteractionManager.ts` — all pointer event handling
- `docs/frontend/keyboard-shortcuts.md` — existing shortcuts
- `src/components/TopToolbar.tsx` — toolbar buttons (check for aria-labels)
- WCAG 2.1 AA: all interactive content must be keyboard operable

**Acceptance criteria:**
- [ ] All toolbar buttons have `aria-label` attributes
- [ ] Canvas has `role="application"` with descriptive `aria-label`
- [ ] Tool activation announces to screen readers via `aria-live` region
- [ ] Keyboard users can tab to and activate all toolbar tools

---

### BAU-8: IndexedDB migration system `high` `data`

**Problem:** `DB_VERSION` is hardcoded as `1` in `src/db/db.ts` with no migration path. Any schema change to the IndexedDB stores will require users to lose data or manually export/reimport.

**Context hints:**
- `src/db/db.ts` — DB setup, version number
- `src/db/projectsDb.ts` — store operations
- IndexedDB `onupgradeneeded` event is the native migration hook

**Acceptance criteria:**
- [ ] A `migrations` array exists, each entry: `{ version: number, upgrade: (db, tx) => void }`
- [ ] `onupgradeneeded` handler iterates migrations between `oldVersion` and `newVersion`
- [ ] Existing v1 schema is captured as migration 1 (no-op for existing users)
- [ ] A test verifies upgrading from v1 to v2 with a sample migration

---

### BAU-9: API retry with exponential backoff `high` `error-handling`

**Problem:** Image generation API calls in `useGenerateStore.ts` (lines 192-213) fail permanently on transient errors (5xx, network timeouts). No retry mechanism exists.

**Context hints:**
- `src/store/useGenerateStore.ts` — API call and error handling
- `grep -n "fetch\|AbortController\|timeout" src/store/useGenerateStore.ts`

**Acceptance criteria:**
- [ ] Transient failures (HTTP 5xx, network errors) retry up to 3 times with exponential backoff
- [ ] Non-retryable errors (4xx) fail immediately
- [ ] User sees "Retrying..." status during retry attempts
- [ ] AbortController cancellation still works during retries

---

### BAU-10: PNG export error feedback `medium` `error-handling`

**Problem:** `src/canvas-pixi/exportPNG.ts` (lines 59, 62, 67) logs errors to console but gives no feedback to the user when export fails.

**Context hints:**
- `src/canvas-pixi/exportPNG.ts` — export logic and error paths
- `grep -n "console.error\|console.warn" src/canvas-pixi/exportPNG.ts`

**Acceptance criteria:**
- [ ] Export errors surface as user-facing toast notifications
- [ ] Error messages describe what went wrong in plain language
- [ ] Successful export shows a brief success toast

---

### BAU-11: Remove or implement generate store stubs `medium` `cleanup`

**Problem:** `useGenerateStore.ts` (lines 237-257) contains stub implementations returning mock data: `sendChatMessage()`, `generateDrafts()`, `upscaleSelected()`, `applyStyle()`, `acceptStyle()`. These could confuse agents or users.

**Context hints:**
- `src/store/useGenerateStore.ts` — search for `// stub` or `setTimeout`
- `grep -n "stub\|mock\|TODO\|placeholder" src/store/useGenerateStore.ts`

**Acceptance criteria:**
- [ ] Each stub is either: (a) removed if not on the roadmap, or (b) clearly marked with `@stub` JSDoc tag and a linked plan/issue
- [ ] No stub returns fake data that could be mistaken for real functionality
- [ ] If stubs are kept, calling them throws a descriptive `NotImplementedError`

---

### BAU-12: Type-safe error handling `medium` `type-safety`

**Problem:** Multiple `as unknown as` type assertions exist in error handling paths and PixiJS interop, masking potential type errors.

**Context hints:**
- `grep -rn "as unknown" src/` — find all unsafe casts
- `src/store/useGenerateStore.ts:198` — error property mutation via cast
- `src/canvas-pixi/TerrainRenderer.ts` — PixiJS internal cache casts

**Acceptance criteria:**
- [ ] Each `as unknown` cast is either: (a) replaced with a type guard, or (b) documented with a `// SAFETY:` comment explaining why it's necessary
- [ ] Error objects use proper type narrowing (`instanceof`, discriminated unions) instead of casts
- [ ] No new `as unknown` casts introduced

---

### BAU-13: Bold/italic keyboard shortcuts for labels `medium` `feature`

**Problem:** Bold and italic toggles for label elements are only available as checkboxes in the inspector. No `Ctrl+B` / `Ctrl+I` shortcuts exist.

**Context hints:**
- `docs/frontend/keyboard-shortcuts.md` — existing shortcut registry
- `src/components/InspectorPanel.tsx` — label inspector section

**Acceptance criteria:**
- [ ] `Ctrl+B` toggles bold when a label is selected
- [ ] `Ctrl+I` toggles italic when a label is selected
- [ ] Shortcuts are inactive when no label is selected (no conflict with other tools)
- [ ] Shortcuts registered in `keyboard-shortcuts.md`

---

### BAU-14: Multi-select plant batch editing `medium` `feature`

**Problem:** Selecting multiple plants requires editing each individually.

**Context hints:**
- `src/components/InspectorPanel.tsx` — plant inspector section
- `docs/frontend/selection-manipulation.md` — multi-select behavior

**Acceptance criteria:**
- [ ] Multi-select inspector shows editable fields for batch-applicable properties (status, notes, layer)
- [ ] Per-element-only properties (position X/Y) are hidden in multi-select mode
- [ ] Changes apply to all selected plants atomically (single undo step)

---

### BAU-15: Go server graceful shutdown `medium` `backend`

**Problem:** `cmd/server/main.go` (line 90) uses `log.Fatal()` on startup errors, and the server lacks signal-based graceful shutdown for in-flight requests.

**Context hints:**
- `cmd/server/main.go` — server entry point
- `grep -n "log.Fatal\|signal\|Shutdown" cmd/server/main.go`

**Acceptance criteria:**
- [ ] Server handles `SIGINT` and `SIGTERM` signals
- [ ] In-flight HTTP requests complete before shutdown (with a timeout)
- [ ] Shutdown logs a clean exit message

---

### BAU-16: Anonymous error tracking `low` `observability`

**Problem:** No production error tracking exists. Bugs are only discovered through manual QA.

**Context hints:**
- Check `package.json` for existing tracking libraries
- Candidate: Sentry (free tier), or lightweight custom reporter

**Acceptance criteria:**
- [ ] Unhandled exceptions and promise rejections are captured
- [ ] Source maps are uploaded for readable stack traces
- [ ] No PII is collected (anonymous device ID only)
- [ ] Error tracking is disabled in development

---

### BAU-17: Store method JSDoc documentation `low` `docs`

**Problem:** Zustand stores (`useProjectStore`, `useGenerateStore`, `useViewportStore`) lack JSDoc for public methods, making it harder for agents to understand side effects and async behavior.

**Context hints:**
- `grep -rn "export const use.*Store" src/store/` — find all stores
- Focus on methods that have side effects (DB writes, API calls, timer setup)

**Acceptance criteria:**
- [ ] All public store methods have `@description`, `@param`, and `@returns` JSDoc
- [ ] Async methods document what they await and potential failure modes
- [ ] Side effects (DB writes, timers, API calls) are explicitly noted

---

### BAU-18: ESLint rule compliance `low` `cleanup`

**Problem:** Some files disable ESLint rules inline instead of fixing the underlying issue.

**Context hints:**
- `grep -rn "eslint-disable" src/` — find all disabled rules
- `src/components/WelcomeScreen.tsx` — `react-hooks/set-state-in-effect` disable

**Acceptance criteria:**
- [ ] Each `eslint-disable` comment is either: (a) removed by fixing the code, or (b) justified with a `-- reason` comment
- [ ] No new blanket `eslint-disable` lines introduced
- [ ] `npm run lint` passes cleanly

---

## Resolved Bugs (historical archive)

> Migrated from `docs/frontend/bug.md` (now deleted). Kept for historical context on past root causes and fixes. Agents do not need to act on these.

### BUG-1: Terrain painting does nothing — RESOLVED

**Root cause:** `selectedTerrainTypeId` was `null` when terrain tool activated via toolbar/shortcut without selecting a swatch. Paint handler silently skipped.
**Fix:** `SidePalette.tsx` — auto-selects `terrainTypes[0].id` when `activeTool === 'terrain'` and no type is selected.

### BUG-2: Done button doesn't close boundary modal — RESOLVED

**Root cause:** Konva stage's `mousedown` consumed the event before the HTML Done button's `click` could fire.
**Fix:** `YardBoundaryLayer.tsx` — added `stopPropagation()` on `onMouseDown`/`onClick` and `pointerEvents: 'auto'`.

### BUG-3: Brush size doesn't work — RESOLVED

**Root cause:** Blocked by BUG-1. Implementation was already correct (`brushCells()` expands to NxN). No code change needed.

### BUG-4: Arc tool UX broken — RESOLVED

**Root cause:** Arc tool was a stub reusing structure tool's two-click placement, always creating `shape: 'straight'`.
**Fix:** `StructureLayer.tsx` — implemented 3-step workflow (start → end → sagitta), creates `shape: 'curved'` with arc preview.

### BUG-5: Toolbar/palette tab not synced — RESOLVED

**Root cause:** No mapping between active tool and palette tab.
**Fix:** `SidePalette.tsx` — added `TOOL_TO_TAB` mapping and `useEffect` watching `activeTool`.

### BUG-6: Inspector position fields bypass collision — RESOLVED

**Root cause:** Editable X/Y inputs allowed placing elements into invalid positions.
**Fix:** `InspectorPanel.tsx` — replaced editable inputs with `ReadonlyField` display. Position only changeable via canvas drag.

### BUG-7: No zoom-out limit — RESOLVED (already implemented)

**Verification:** `clampZoom()` in `viewport.ts` enforces `[0.05, 10.0]`. All zoom paths call it. No fix needed.

### BUG-8: Scale bar has no label/tooltip — RESOLVED

**Fix:** `ScaleBar.tsx` — added "SCALE" label, `title` attribute for tooltip, enabled `pointerEvents`.

### BUG-9: isPlacing blocks all canvas events — BY DESIGN

Boundary placement needs exclusive pointer control. `YardBoundaryLayer` has `listening={selectToolActive}` to disable hit detection for non-select tools.
