# Centralized Error Logging & Toast System

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific code into context. Do not read whole files unless the task explicitly requires it.
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
| **Plan ID** | `PLAN-BAU-4` |
| **Title** | Centralized Error Logging & Toast System |
| **Scope** | Create a `logger` utility that wraps `console.error` and surfaces user-facing toasts; install a toast library; migrate all existing `console.error` calls in `src/store/` and `src/db/` to the new logger. Excludes external error tracking / Sentry integration (BAU-16). |
| **Status** | `in-progress` |
| **Started** | 2026-04-08 |
| **Last updated** | 2026-04-08 |
| **Phases** | Phase 1: Toast infrastructure + logger utility · Phase 2: Migration of existing console.error calls |

**Unblocks:** BAU-21, BAU-10, BAU-9, BAU-16

---

## Context Map

### Key source files

| File | What it owns | Load hint |
|------|-------------|-----------|
| `src/store/useProjectStore.ts` | Auto-save debounce, the primary `console.error` that needs a Retry action | Read in full (74 lines) |
| `src/db/projectsDb.ts` | All DB CRUD operations with `console.error` calls | Read in full (79 lines) |
| `src/db/db.ts` | IndexedDB open/init, `console.error` on open failure | Read in full (45 lines) |
| `src/store/useHistoryStore.ts` | Undo history persist/load errors | `grep -n "console.error" src/store/useHistoryStore.ts` |
| `src/canvas-pixi/CanvasHost.tsx` | PixiJS init failure at line 565; out of scope for Phase 2 but note it exists | `grep -n "console.error" src/canvas-pixi/CanvasHost.tsx` |
| `src/canvas-pixi/exportPNG.ts` | PNG export errors at lines 70, 140, 188; out of scope for Phase 2 but note they exist | `grep -n "console.error" src/canvas-pixi/exportPNG.ts` |
| `src/components/WelcomeScreen.tsx` | Import JSON parse and saveProject errors at lines 107, 129; uses `alert()` today | `grep -n "console.error\|alert(" src/components/WelcomeScreen.tsx` |
| `package.json` | Dependency list — no toast library present yet | Read in full to confirm before installing |

### Quick grep commands for agents

```bash
# Find every console.error in src (current state — 15 call sites across 7 files):
grep -rn "console.error" src/

# Find all imports of the new logger once it exists:
grep -rn "from.*logger\|import.*logger" src/

# Verify no bare console.error remain in stores and db after Phase 2:
grep -rn "console.error" src/store/ src/db/

# Find all toast() call sites once the library is wired up:
grep -rn "toast(" src/
```

---

## Phases

### Phase 1 — Toast infrastructure + logger utility [ ]

> Installs the toast library, mounts the `<Toaster />` provider, and creates the `src/utils/logger.ts` module. Phase 2 cannot start until this phase is `done` — every migrated call site depends on the logger existing.

---

#### Feature: Install and mount toast library [ ]

**Status:** `todo`

No toast library is currently in `package.json`. The project uses Tailwind CSS v4 and React 19. `sonner` is the preferred choice: it is headless-friendly, has a minimal API (`toast.error()`, `toast.success()`), works without a context provider wrapping the whole tree, and is actively maintained. It does not require shadcn/ui.

##### Tasks

- [ ] Run `npm install sonner` and verify the dependency appears in `package.json` under `dependencies`
- [ ] Mount `<Toaster />` from `sonner` in `src/App.tsx` (or the root layout component — confirm by reading `src/App.tsx` before editing). Place it at the bottom of the JSX tree, outside any route outlet, so it renders on every page.
- [ ] Confirm the Toaster renders in the browser by temporarily calling `toast('hello')` from a click handler, then remove the test call before committing.

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: Create logger utility [ ]

**Status:** `todo`

Create `src/utils/logger.ts`. This is the single file all migrated call sites will import from. The logger must:

- Always call through to the underlying `console` method so structured arguments and stack traces remain visible in DevTools.
- Call `toast.error()` with a sanitized, user-friendly message (never a raw `Error.message` containing stack traces or internal IDs).
- Accept an optional `options` bag so callers can attach a toast action (e.g. a Retry button) without the logger needing to know about specific business logic.
- Be typed strictly — no `any`.

**Proposed API:**

```ts
// src/utils/logger.ts
import { toast } from 'sonner';

interface LogErrorOptions {
  /** User-visible message shown in the toast. Defaults to a generic fallback. */
  userMessage?: string;
  /** Optional action rendered inside the toast (e.g. a Retry button). */
  toastAction?: {
    label: string;
    onClick: () => void;
  };
  /** Set true to suppress the toast entirely (e.g. background operations where silence is correct). */
  silent?: boolean;
}

export const logger = {
  error(consoleMessage: string, cause: unknown, options: LogErrorOptions = {}): void {
    console.error(consoleMessage, cause);
    if (options.silent) return;
    const userMessage = options.userMessage ?? 'Something went wrong. Please try again.';
    if (options.toastAction) {
      toast.error(userMessage, {
        action: {
          label: options.toastAction.label,
          onClick: options.toastAction.onClick,
        },
      });
    } else {
      toast.error(userMessage);
    }
  },
};
```

##### Tasks

- [ ] Create `src/utils/logger.ts` implementing the API above. Ensure strict TypeScript — no implicit `any`, `cause` typed as `unknown`.
- [ ] Write a basic unit test at `src/utils/logger.test.ts` using Vitest: mock `sonner`'s `toast.error`, call `logger.error(...)`, assert that `toast.error` was called with the expected user message and that `console.error` was called with the raw message. Test the `silent: true` path suppresses the toast call.
- [ ] Export `logger` as a named export (not default) so call sites read `import { logger } from '../utils/logger'`.

##### Decisions

_None yet._

---

### Phase 2 — Migrate existing console.error call sites [ ]

> Replaces all `console.error` calls in `src/store/` and `src/db/` with `logger.error(...)`. `src/canvas-pixi/` and `src/components/` call sites are migrated opportunistically where it is low-risk; the CanvasHost and exportPNG sites are lower-priority (they surface distinct UX problems better addressed in BAU-9/BAU-21) but should be updated here for consistency.

---

#### Feature: Migrate src/db/ error sites [ ]

**Status:** `todo`

**Files:** `src/db/projectsDb.ts` (5 call sites), `src/db/db.ts` (1 call site)

**Call sites:**

| File | Line | Existing message | Suggested user message |
|------|------|-----------------|----------------------|
| `projectsDb.ts` | 10 | `getAllProjects failed` | `"Could not load your projects."` |
| `projectsDb.ts` | 21 | `getProject failed` | `"Could not load the selected project."` |
| `projectsDb.ts` | 31 | `saveProject failed` | `"Your project could not be saved."` |
| `projectsDb.ts` | 45 | `deleteProject failed` | `"Could not delete the project."` |
| `projectsDb.ts` | 76 | `exportProjectAsJSON failed` | `"Export failed. Please try again."` |
| `db.ts` | 39 | `IndexedDB open failed` | `"Could not open the local database. Try refreshing or check your browser's storage settings."` |

The `db.ts` case is special: it fires before any project is loaded, and IndexedDB failure is catastrophic. The toast for this case should be persistent (do not auto-dismiss) — pass `{ duration: Infinity }` to `toast.error`.

##### Tasks

- [ ] Update import in `src/db/projectsDb.ts`: add `import { logger } from '../utils/logger'` and replace all 5 `console.error` calls with `logger.error(...)` using the user messages from the table above.
- [ ] Update import in `src/db/db.ts`: add `import { logger } from '../utils/logger'` and replace the 1 `console.error` call; pass `{ duration: Infinity }` in the options to make the toast persistent.
- [ ] Run `grep -n "console.error" src/db/` after editing to confirm zero remaining call sites.

##### Decisions

_None yet._

---

#### Feature: Migrate src/store/ error sites [ ]

**Status:** `todo`

**Files:** `src/store/useProjectStore.ts` (1 call site, needs Retry action), `src/store/useHistoryStore.ts` (2 call sites)

**Call sites:**

| File | Line | Existing message | Suggested user message | Special |
|------|------|-----------------|----------------------|---------|
| `useProjectStore.ts` | 55 | `auto-save failed` | `"Auto-save failed."` | Must include Retry action |
| `useHistoryStore.ts` | 85 | `loadHistory failed` | `"Could not load undo history."` | Silent is acceptable — history loss is not critical |
| `useHistoryStore.ts` | 96 | `persistHistory failed` | `"Could not save undo history."` | Silent is acceptable |

**Auto-save Retry action:** The `markDirty` method in `useProjectStore` owns the `setTimeout` + `saveProject` flow. The Retry action should call `get().markDirty()` which re-triggers the debounce. The `toastAction` should look like:

```ts
toastAction: {
  label: 'Retry',
  onClick: () => get().markDirty(),
}
```

The history store errors are background operations — failing silently is acceptable per the BAU-4 spec. Use `silent: true` for `persistHistory` and optionally for `loadHistory` (agent should decide and log the decision).

##### Tasks

- [ ] Update `src/store/useProjectStore.ts`: add `import { logger } from '../utils/logger'` and replace the `console.error` at line 55 with `logger.error(...)` including the `toastAction` Retry button as specified above.
- [ ] Update `src/store/useHistoryStore.ts`: add `import { logger } from '../utils/logger'` and replace both `console.error` calls. Decide whether `loadHistory` failure should be silent or show a toast; log the decision in `## Decision Log`.
- [ ] Run `grep -n "console.error" src/store/` after editing to confirm zero remaining call sites.

##### Decisions

_None yet._

---

#### Feature: Migrate src/components/ and src/canvas-pixi/ error sites [ ]

**Status:** `todo`

**Files:** `src/components/WelcomeScreen.tsx` (2 call sites, currently uses `alert()`), `src/canvas-pixi/CanvasHost.tsx` (1 call site), `src/canvas-pixi/exportPNG.ts` (3 call sites)

**WelcomeScreen note:** Lines 107 and 129 pair `console.error` with `alert()`. Both `alert()` calls must be replaced with toasts — the logger's `userMessage` is the replacement for what was previously in the `alert()` call.

| File | Line | Current behaviour | Replacement |
|------|------|-----------------|----|
| `WelcomeScreen.tsx` | 107 | `console.error` + `alert('Invalid file: not valid JSON')` | `logger.error(...)` with `userMessage: 'That file is not valid JSON.'` |
| `WelcomeScreen.tsx` | 129 | `console.error` + early return (no alert) | `logger.error(...)` with `userMessage: 'Could not import the project. Please try again.'` |
| `CanvasHost.tsx` | 565 | `console.error` only | `logger.error(...)` with `userMessage: 'Canvas failed to initialize. Try refreshing the page.'` |
| `exportPNG.ts` | 70 | `console.error` only (no app ref) | `logger.error(...)` with `userMessage: 'Export is not ready yet. Please wait a moment and try again.'` |
| `exportPNG.ts` | 140 | `console.error` only (no world container) | `logger.error(...)` with `userMessage: 'Export failed: canvas content not found.'` |
| `exportPNG.ts` | 188 | `console.error` only (extract failed) | `logger.error(...)` with `userMessage: 'Export failed. Please try again.'` |

##### Tasks

- [ ] Update `src/components/WelcomeScreen.tsx`: add `import { logger } from '../utils/logger'`, replace the 2 `console.error` + `alert()` combos with `logger.error(...)` calls using the messages in the table above. Remove the `alert()` calls entirely.
- [ ] Update `src/canvas-pixi/CanvasHost.tsx`: add `import { logger } from '../utils/logger'` and replace the 1 `console.error` at line 565.
- [ ] Update `src/canvas-pixi/exportPNG.ts`: add `import { logger } from '../utils/logger'` and replace all 3 `console.error` calls at lines 70, 140, and 188.
- [ ] Run `grep -rn "console.error" src/` after all edits to confirm the full count across the codebase is zero (or intentionally explain any survivors in the Decision Log).
- [ ] Run `grep -rn "alert(" src/components/WelcomeScreen.tsx` to confirm no bare `alert()` calls survive in WelcomeScreen. Note: `alert()` calls in `useKeyboardShortcuts.ts`, `InitialGeneration.tsx`, and the import-warnings alert at WelcomeScreen line 120 are out of scope for this plan.

##### Decisions

_None yet._

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec. Format: date · decision · rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-08 | Use `sonner` as the toast library | No toast library was present in `package.json`. `sonner` has a minimal API, does not require a wrapping context provider, is compatible with React 19 and Tailwind v4, and is the de facto standard in the Vite/React ecosystem. |
| 2026-04-08 | Place `logger` in `src/utils/logger.ts` | No `utils/` directory existed; this follows the pattern of the existing `src/hooks/` directory for cross-cutting utilities. `src/lib/` was considered but `utils/` better describes stateless helper modules. |
| 2026-04-08 | `db.ts` IndexedDB failure toast uses `duration: Infinity` | A persistent/non-dismissable toast is appropriate here because this error is catastrophic — the entire app cannot save or load projects until resolved, and auto-dismissal would cause users to miss the message. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-08 — Plan initialized. Codebase investigation found 15 console.error call sites across 7 files
             (projectsDb.ts ×5, db.ts ×1, useProjectStore.ts ×1, useHistoryStore.ts ×2,
             CanvasHost.tsx ×1, exportPNG.ts ×3, WelcomeScreen.tsx ×2).
             No toast library present in package.json. No src/components/ui/ directory exists.
             sonner selected as the toast library (see Decision Log).
```
