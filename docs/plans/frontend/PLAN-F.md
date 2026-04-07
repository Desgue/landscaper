# PLAN-F — Image Generation: API Integration & UI Completion

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan wires the existing generate UI to the real backend API and fills remaining UI gaps (download, error toasts, yard boundary gate). The generate page, options panel, workspace, and navigation already exist — this plan does NOT rebuild them.

---

## Agent Protocol

### Reading This Plan

1. **Read the existing code first.** This plan modifies files that already exist. Before starting any task, read the files listed in the Context Map. Do NOT create new files for functionality that already exists.
2. **Request construction must match api-contract.md exactly.** Merge registries into the project object, extract `yard_photo` to top-level, map option names per the Field Mapping Table below.
3. **Error toasts never show raw backend errors.** Map HTTP status codes to user-friendly messages per the Error Mapping Table below.

### Updating This Plan

- `[ ]` → `[x]` when done. Append ` — done YYYY-MM-DD`.
- `[ ]` → `[-]` when blocked. Add `> Blocker: …` beneath; name the plan responsible for the fix.
- Feature done → `**Status:** done` + badge `[x]`.
- Phase done → phase badge `[x]`.
- Append to `## Decision Log`; append to `## Agent Log` for milestones.

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
| **Plan ID** | `PLAN-F` |
| **Title** | Image Generation: API Integration & UI Completion |
| **Scope** | Wire the existing generate UI to `POST /api/generate`. Fix type mismatches between `generate.ts` and API contract. Add download, error toasts, yard boundary gate, and request timeout. Excludes: rebuilding the generate page/nav/workspace (already exist), backend changes, and advanced features (chat, drafts, materials, style transfer, outpainting). |
| **Depends on** | PLAN-A (project state, `markDirty()`); existing generate UI components (already built) |
| **Unblocks** | Nothing — standalone feature |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1: Type Fixes & API Client · Phase 2: Store Integration · Phase 3: UI Completion |

---

## Context Map

### Source Files (must read before implementing)

| File | What it owns | Load hint |
|------|-------------|-----------|
| `src/types/generate.ts` | `GenerateOptions`, option value arrays, `GenerateStatus` state machine | Full read required — contains field name/value mismatches that Phase 1 fixes |
| `src/store/useGenerateStore.ts` | Zustand store: `generate()` stub, `cancel()`, `setOption()`, `restoreFromProject()` | Full read required — `generate()` at line 124 is the primary replacement target |
| `src/components/generate/features/InitialGeneration.tsx` | Options panel: dropdowns, photo upload, seed, toggles, generate button | Full read — understand what UI already exists |
| `src/components/generate/Workspace.tsx` | Display states: Loading, Error, Result, Empty | Full read — needs Download and "Generate Again" buttons added |
| `src/components/generate/GenerateShell.tsx` | Layout orchestration, feature routing | `grep -n "status\|result\|feature" src/components/generate/GenerateShell.tsx` |
| `src/components/TopToolbar.tsx` | Canvas-mode toolbar with Generate button (navigates to `/app/generate`) | `grep -n "Generate\|boundary\|disabled\|navigate" src/components/TopToolbar.tsx` |
| `src/store/useProjectStore.ts` | `currentProject`, `registries`, `updateProject()` | `grep -n "yardPhoto\|yardBoundary\|registries\|updateProject" src/store/useProjectStore.ts` |
| `src/pages/GeneratePage.tsx` | Page wrapper, calls `restoreFromProject()` on mount | Short file, full read |

### Spec Files

| File | What it owns | Load hint |
|------|-------------|-----------|
| `docs/frontend/image-generation.md` | Full frontend spec: button, panel, request, loading, result, errors, BDD scenarios | Full read required for all tasks |
| `docs/backend/api-contract.md` | API request shape, response format, validation rules, error codes, field values | Read `## Request Body`, `## Options and Defaults`, `## Request Validation`, `## Error Response Format` |

---

## Architecture Overview

### Existing Component Tree (already built — do NOT rebuild)

```
TopToolbar.tsx (Canvas mode)
  └─ Generate button (gold) → navigates to /app/generate

App.tsx (/app/generate route)
  └─ GeneratePage → restoreFromProject() on mount
      └─ GenerateShell
          ├─ GenerateHeader (Canvas/Generate tab nav)
          ├─ GenerateNav (sidebar: 11 features across 5 stages)
          └─ main area
              ├─ Workspace (Loading | Error | Result | Empty states)
              └─ InitialGeneration (photo upload, 8 dropdowns, toggles, seed)
```

### What This Plan Changes

1. **`src/types/generate.ts`** — Fix field names and values to match API contract
2. **`src/store/useGenerateStore.ts`** — Replace `generate()` stub with real `fetch` + AbortController
3. **New: `src/api/generateClient.ts`** — Request body builder + fetch wrapper (single new file)
4. **`src/components/generate/Workspace.tsx`** — Add Download + "Generate Again" to ResultView
5. **`src/components/TopToolbar.tsx`** — Add yard boundary disabled state
6. **`src/components/generate/features/InitialGeneration.tsx`** — Remove deleted dropdowns/toggles, update photo validation limit, add yard boundary disabled state
7. **`src/components/generate/features/StyleTransfer.tsx`** — Remove `RENDER_STYLES` import (uses it for a selector)
8. **New: `src/components/ErrorToast.tsx`** — Toast notification component (single new file)

### Field Mapping Table (generate.ts → API request)

This is NOT a simple camelCase→snake_case conversion. Several field names and values differ:

| Frontend field (`GenerateOptions`) | API field (`options.*`) | Value mapping |
|---|---|---|
| `gardenStyle` | `garden_style` | Direct (values match) |
| `season` | `season` | `'auto'` → omit field (backend derives); other values direct |
| `timeOfDay` | `time_of_day` | Direct (after fixing `dusk` → `overcast`) |
| `viewpoint` | `viewpoint` | Direct (after fixing values — see Phase 1) |
| `aspectRatio` | `aspect_ratio` | Direct (values `square`/`landscape`/`portrait` match) |
| `imageSize` | `image_size` | Direct (after renaming — see Phase 1) |
| `includePlanned` | `include_planned` | Direct |
| `seed` | `seed` | `null` → omit field (backend uses -1); integer → send as-is |
| ~~`cameraAngle`~~ | — | **Removed** — renamed to `viewpoint` in Phase 1 |
| ~~`weather`~~ | — | **Removed** — not in API contract |
| ~~`renderStyle`~~ | — | **Removed** — not in API contract |
| ~~`resolution`~~ | — | **Removed** — replaced by `imageSize` |
| ~~`thinkingMode`~~ | — | **Removed** — not in API contract |

### Error Mapping Table

| HTTP Status | Error string contains | Toast message |
|---|---|---|
| 400 | `"project has no yard boundary"` | "Set up a yard boundary before generating." |
| 400 | `"yard photo too large"` | "Your reference photo is too large. Use an image under 3 MB." |
| 400 | `"invalid request body"` or `"project is required"` | "Something went wrong. Please try again." |
| 400 | (other) | "Generation failed: check your options and try again." |
| 413 | any | "Your project is too large to send. Try removing some elements." |
| 500 | any | "Something went wrong on the server. Please try again." |
| 502 | any | "The AI service returned an error. Try again in a moment." |
| 504 | any | "Generation timed out. Try again or simplify your garden layout." |
| — | network error (no response) | "Could not reach the server. Check your connection." |
| — | client 60s timeout abort | "Generation timed out. Try again or simplify your garden layout." |
| other 5xx | any | "Something went wrong on the server. Please try again." |
### Request Construction Flow

```
User clicks Generate
  → Read options from useGenerateStore
  → Read project + registries from useProjectStore
  → Build request body:
      {
        project: { ...project, registries },   // merge registries INTO project
        yard_photo: project.yardPhoto ?? undefined,  // top-level, NOT inside project
        options: {
          garden_style: options.gardenStyle ?? undefined,
          season: options.season === 'auto' ? undefined : options.season,
          time_of_day: options.timeOfDay ?? undefined,
          viewpoint: options.viewpoint ?? undefined,
          aspect_ratio: options.aspectRatio ?? undefined,
          image_size: options.imageSize ?? undefined,
          include_planned: options.includePlanned,
          seed: options.seed ?? undefined,
        }
      }
  → Strip yardPhoto from the project copy (avoid double-sending)
  → POST /api/generate with AbortController
  → On 200: read blob, create object URL, set resultUrl
  → On error: parse JSON, map to toast message
```

### Testing Strategy

- **Unit tests** (Phase 1): `generateClient.ts` request body builder — verify field mapping, snake_case conversion, `auto` season omission, `null` seed omission, yardPhoto extraction to top-level, yardPhoto stripped from project copy. Mock `fetch`.
- **Unit tests** (Phase 1): Error mapper — verify all HTTP status codes produce correct toast messages, including JSON parse failure fallback.
- **Manual testing** (Phase 2-3): Requires running backend (`GEMINI_API_KEY=... make dev`). Test generate flow end-to-end, cancel, timeout, download, double-click concurrent guard (rapid clicks on Generate should produce only one request). Vite proxy (`/api` → `localhost:8080`) is already configured.

---

## Phases

### Phase 1 — Type Fixes & API Client [ ]

> Fix the generate.ts types to match the API contract, then build the API client module. No store or UI changes yet — this phase produces a pure function that later phases consume.

#### Feature: Fix generate.ts Type Mismatches [ ]

**Status:** `todo`
**Modifies:** `src/types/generate.ts`

##### Tasks

- [ ] Rename `CAMERA_ANGLES` to `VIEWPOINTS` and fix values: `'eye-level'` (keep), `'3/4 elevated'` → `'elevated'`, `'birds-eye'` → `'isometric'`. Update labels accordingly. Rename type `CameraAngle` to `Viewpoint`.
- [ ] Fix `TIMES_OF_DAY`: replace `{ value: 'dusk', label: 'Dusk' }` with `{ value: 'overcast', label: 'Overcast' }`. Update type `TimeOfDay`.
- [ ] Replace `RESOLUTIONS` with `IMAGE_SIZES`: `{ value: '1K', label: '1K' }`, `{ value: '2K', label: '2K' }`, `{ value: '4K', label: '4K' }`. Rename type `Resolution` to `ImageSize`.
- [ ] Fix `ASPECT_RATIOS` labels: `'16:9'` → `'4:3'` (landscape), `'9:16'` → `'3:4'` (portrait). Values stay `landscape`/`square`/`portrait`.
- [ ] Remove `WEATHER_OPTIONS`, `RENDER_STYLES` arrays and their types `Weather`, `RenderStyle` — not in API contract.
- [ ] Update `GenerateOptions` interface: rename `cameraAngle` → `viewpoint`, `resolution` → `imageSize`; remove `weather`, `renderStyle`, `thinkingMode` fields. Add `imageSize: ImageSize` field.
- [ ] Update `DEFAULT_OPTIONS`: `viewpoint: 'eye-level'`, `imageSize: '1K'`, remove deleted fields.
- [ ] Fix all compile errors in files that import changed types. Known importers beyond `generate.ts` itself: `useGenerateStore.ts` (uses `GenerateOptions`, `DEFAULT_OPTIONS`), `InitialGeneration.tsx` (imports `CAMERA_ANGLES`, `WEATHER_OPTIONS`, `RENDER_STYLES`, `RESOLUTIONS` and renders dropdowns/toggles for them), `StyleTransfer.tsx` (imports `RENDER_STYLES`). Search with `grep -rn "cameraAngle\|weather\|renderStyle\|thinkingMode\|resolution\|CAMERA_ANGLES\|WEATHER_OPTIONS\|RENDER_STYLES\|RESOLUTIONS" src/` to find any others.
- [ ] Update `InitialGeneration.tsx`: remove the `SelectField` components for `cameraAngle`, `weather`, and `renderStyle`; replace with `SelectField` for `viewpoint` (using `VIEWPOINTS`). Replace the `SegmentGroup` for `resolution` with one for `imageSize` (using `IMAGE_SIZES`). Remove the "Thinking mode" toggle. This changes the options grid from 6 dropdowns + 2 segments + 2 toggles to 5 dropdowns + 2 segments + 1 toggle.
- [ ] Update `InitialGeneration.tsx` photo upload validation: change the file size limit from 5 MB (`5 * 1024 * 1024`) to 3 MB (`3 * 1024 * 1024`). Update the error message from "Maximum size is 5 MB" to "Maximum size is 3 MB." This aligns with the backend's per-photo 3 MB decoded limit.
- [ ] Update `StyleTransfer.tsx`: this stub uses `RENDER_STYLES` in three places — state initialization (`RENDER_STYLES[0].value`), a `.map()` loop rendering style pill buttons, and the import. Replace all three: define a local `const PLACEHOLDER_STYLES = [{ value: 'photorealistic', label: 'Photorealistic' }] as const` at the top of the file, use it for state init and the pill loop, and remove the `RENDER_STYLES` import from `generate.ts`.
- [ ] Add migration guard in `restoreFromProject()`: when restoring `lastGenerateOptions` from persisted project state, filter out unknown keys that no longer exist in `GenerateOptions` (e.g., `weather`, `renderStyle`, `thinkingMode`, `cameraAngle`, `resolution`). Use `const validKeys = Object.keys(DEFAULT_OPTIONS)` to whitelist. This prevents stale persisted data from injecting removed fields into the options object.

##### Decisions

_None yet._

---

#### Feature: API Client Module [ ]

**Status:** `todo`
**Produces:** `src/api/generateClient.ts`

##### Tasks

- [ ] Create `buildRequestBody(project, registries, options, yardPhoto)` pure function: merges registries into project object, extracts yardPhoto to top-level `yard_photo` (single string, not array — multi-photo deferred), strips `yardPhoto`/`uiState`/`gridConfig`/`viewport`/`groups`/`journalEntries` from the project copy (backend ignores them, reducing payload size), maps option field names per the Field Mapping Table, omits `null`/`undefined` option values, maps `season: 'auto'` to omission
- [ ] Create `sendGenerateRequest(body, signal: AbortSignal): Promise<Blob>` function: `POST /api/generate` with `Content-Type: application/json` and `Accept: image/*`, reads response as blob on 200, throws typed error on non-200 (parses JSON `error` field with try/catch fallback for non-JSON responses)
- [ ] Create `mapErrorToToast(error): string | null` function per the Error Mapping Table: returns `null` for user cancel (AbortError without timeout flag), returns toast string for all other cases. Distinguish client 60s timeout from user cancel via a `isTimeout` flag on the error or AbortController.
- [ ] Write unit tests for `buildRequestBody`:
  - Registries merged into project at `project.registries`
  - `yardPhoto` extracted to top-level `yard_photo`, not present inside project object
  - `season: 'auto'` → no `season` field in output options
  - `seed: null` → no `seed` field in output options
  - `viewpoint: 'elevated'` → `options.viewpoint: 'elevated'` (correct snake_case)
  - `imageSize: '2K'` → `options.image_size: '2K'`
  - Fields removed from project copy: `uiState`, `gridConfig`, `viewport`, `groups`, `journalEntries`
  - `season: 'summer'` → `options.season: 'summer'` (non-auto season IS included)
  - `include_planned: false` → `options.include_planned: false` (always present, never omitted)
  - When `yardPhoto` provided: `body.project` does NOT contain `yardPhoto` key (stripped from copy)
- [ ] Write unit tests for `mapErrorToToast`:
  - HTTP 400 with `"project has no yard boundary"` → yard boundary toast
  - HTTP 400 with `"yard photo too large"` → photo size toast
  - HTTP 400 other → generic 400 toast
  - HTTP 413 → payload too large toast
  - HTTP 500 → server error toast
  - HTTP 502 → AI service toast
  - HTTP 504 → timeout toast
  - Network error (TypeError) → connection toast
  - AbortError with timeout flag → timeout toast
  - AbortError without timeout flag (user cancel) → `null`
  - Non-JSON error response body → generic fallback toast ("Something went wrong. Please try again.")
  - HTTP 400 with `"invalid request body"` → "Something went wrong" toast (not "check your options")
  - HTTP 400 with `"project is required"` → "Something went wrong" toast
  - HTTP 503 (unmapped 5xx) → generic server error toast
  - HTTP 200 success path: `sendGenerateRequest` returns a Blob with correct type

##### Decisions

_None yet._

---

### Phase 2 — Store Integration [ ]

> Replace the `generate()` stub in useGenerateStore with the real API client. Add AbortController lifecycle, timeout, and object URL management.

#### Feature: Wire generate() to Real API [ ]

**Status:** `todo`
**Modifies:** `src/store/useGenerateStore.ts`

##### Tasks

- [ ] Replace the `generate()` stub (lines 124-148) with real implementation: read `project` + `registries` from `useProjectStore.getState()`, read `options` + `yardPhoto` from generate store, call `buildRequestBody()`, create `AbortController`, set `status: { kind: 'loading', startedAt: Date.now() }`, call `sendGenerateRequest(body, controller.signal)`
- [ ] Store the `AbortController` instance in module-scope (replacing `cancelTimer`). On success: create object URL from blob, store the blob's MIME type (`response.headers.get('Content-Type')` or `blob.type`) in a new store field `resultMimeType: string | null` (needed by ResultView for download filename extension). Set `resultUrl` and `status: { kind: 'success', resultUrl }`. On error: call `mapErrorToToast()`, set `status: { kind: 'error', message: toastMessage }` (or `status: { kind: 'idle' }` if user cancel returns null).
- [ ] Implement 60-second client timeout: `setTimeout(() => { isTimeoutAbort = true; controller.abort(); }, 60_000)`. Clear timeout on success/error/cancel. Use the `isTimeoutAbort` flag in `mapErrorToToast` to distinguish timeout from user cancel.
- [ ] Fix `cancel()`: call `controller.abort()` on the stored AbortController (not `clearTimeout` on the old timer). Clear the timeout timer. Set `status: { kind: 'idle' }`.
- [ ] Add object URL lifecycle management: before setting a new `resultUrl`, revoke the previous one via `URL.revokeObjectURL(previousUrl)`. Also revoke in `clearResult()`. This prevents memory leaks on repeated generations.
- [ ] Add concurrent request guard: if `status.kind === 'loading'` when `generate()` is called, return immediately (no-op). This prevents double-submission.
- [ ] Resolve `yardPhoto` ownership: `restoreFromProject()` already syncs options but does NOT sync yardPhoto. Add `yardPhoto: project.yardPhoto ?? null` to `restoreFromProject()`. The generate store's `yardPhoto` field is the working copy during the session; `project.yardPhoto` (in useProjectStore) is the persisted source of truth.

##### Decisions

_None yet._

---

### Phase 3 — UI Completion [ ]

> Fill the remaining UI gaps: download button, "Generate Again", error toasts, and yard boundary disabled states.

#### Feature: Result View Enhancements [ ]

**Status:** `todo`
**Modifies:** `src/components/generate/Workspace.tsx`

##### Tasks

- [ ] Refactor `ResultView` in Workspace.tsx to access the store directly via `useGenerateStore` and `useProjectStore` hooks (breaking from the current props-only pattern, since it now needs `clearResult()`, `setActiveFeature()`, `resultMimeType`, and `project.name`). This is the simplest approach — alternative would be threading 4+ new props through the Workspace parent, which adds complexity for no benefit.
- [ ] Add Download button to ResultView: triggers browser download. Read `resultMimeType` from `useGenerateStore` to determine extension (`image/jpeg` → `.jpg`, otherwise `.png`). Read `project.name` from `useProjectStore`. Filename: `{project.name}-preview.{ext}`. Implementation: create a temporary `<a>` element with `href=resultUrl`, `download=filename`, click it, remove element.
- [ ] Add "Generate Again" button to ResultView: calls `clearResult()` on the store (which revokes the object URL), then calls `setActiveFeature('initial')` so the user sees the options panel again.
- [ ] Verify ResultView image handles both PNG and JPEG responses (the `<img>` tag with an object URL handles both natively — just verify no `.png` extension is hardcoded).

##### Decisions

_None yet._

---

#### Feature: Error Toast Component [ ]

**Status:** `todo`
**Produces:** `src/components/ErrorToast.tsx` (or integrated into existing toast/notification system if one exists)

##### Tasks

- [ ] Create a toast notification component: fixed position top-center, non-blocking, 8-second auto-dismiss timer, manually dismissible via X button, slides in from top with CSS transition.
- [ ] Wire toast display: when `status.kind === 'error'` and `status.message` is non-null, show the toast with the mapped message. When dismissed (timer or click), set `status: { kind: 'idle' }`.
- [ ] Ensure abort (user cancel) does NOT show a toast — `mapErrorToToast` returns `null`, and the store sets `status: { kind: 'idle' }` directly.
- [ ] Remove the inline error display in `Workspace.tsx` (anonymous JSX block at lines ~19-28 that renders when `status.kind === 'error'`) — it conflicts with the toast. Remove the branch entirely so errors are shown via toast only. Note: there is no named `ErrorState` component — it is inline JSX in the status switch.

##### Decisions

_None yet._

---

#### Feature: Yard Boundary Gate [ ]

**Status:** `todo`
**Modifies:** `src/components/TopToolbar.tsx`, `src/components/generate/features/InitialGeneration.tsx`

##### Tasks

- [ ] In TopToolbar: disable the Generate button when `project.yardBoundary` is null. Add tooltip: "Set up a yard boundary before generating." Keep the current gold color but reduce opacity when disabled.
- [ ] In InitialGeneration: disable the Generate button when `project.yardBoundary` is null. Show inline helper text: "Set up a yard boundary on the canvas first."
- [ ] Verify: create a new project (no boundary) → Generate button disabled in toolbar → navigate to /app/generate → Generate button disabled in options panel → add boundary on canvas → return to generate → button enabled.

##### Decisions

_None yet._

---

## Known Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| User cancels request mid-flight | AbortController.abort() called, loading overlay closes, no toast, status → idle |
| 60s client timeout fires | `isTimeoutAbort` flag set, abort called, timeout toast shown |
| Server returns 504 before 60s | Client receives 504 response normally, maps to timeout toast, clears client timer |
| Multiple rapid Generate clicks | Concurrent guard: second call is no-op while loading |
| Component unmounts during request | AbortController cleanup in store (not component) — store survives unmount; if user navigates away and back, GeneratePage re-mounts and calls restoreFromProject() |
| Non-JSON error response (proxy error page) | JSON.parse wrapped in try/catch, falls back to generic toast |
| Base64 yardPhoto exceeds 10MB total request | Backend returns 413; mapped to "project too large" toast |
| Per-photo 3MB server limit vs 5MB client limit | Client allows 5MB file, base64 adds ~33% overhead. A 3MB file → ~4MB base64, within 10MB body limit. A 5MB file → ~6.7MB base64. Backend decodes and checks 3MB raw limit → rejects. Frontend should validate against 3MB raw file size (not 5MB) to avoid silent server rejections |
| Object URL memory leak | Revoked before replacement and in clearResult(). On page unload, browser reclaims all blob URLs |
| yardPhoto stale after project reload | restoreFromProject() syncs yardPhoto from project store on GeneratePage mount |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | PLAN-F created as standalone plan parallel to C/D/E | Image generation was excluded from Plans A-E but needs a plan to avoid being orphaned |
| 2026-04-07 | Plan rewritten as API integration + UI completion (not greenfield build) | The generate page, options panel, workspace, nav, and store already exist. Original plan was outdated and would duplicate existing code |
| 2026-04-07 | Fix generate.ts types before building API client | Field names (`cameraAngle` vs `viewpoint`), values (`dusk` vs `overcast`, `3/4 elevated` vs `elevated`), and extra fields (`weather`, `renderStyle`, `thinkingMode`) diverge from API contract. Fixing types first prevents 400 errors at runtime |
| 2026-04-07 | Remove `weather`, `renderStyle`, `thinkingMode` from GenerateOptions | These fields have no corresponding API contract field. They may be future features but sending them now would be misleading or cause errors. Can be re-added when the API supports them |
| 2026-04-07 | Rename `resolution` to `imageSize` with values `1K/2K/4K` | API field is `image_size` with values `1K`, `2K`, `4K`. Frontend had `resolution` with `draft/standard/final` — completely different concept |
| 2026-04-07 | Single yardPhoto (not array) for v1 | API supports 1-4 photos as array, but frontend store and UI handle single photo only. Multi-photo is a known gap tracked in project memory. Sending as single string is backward-compatible per API contract |
| 2026-04-07 | Client-side photo validation should use 3MB limit (not 5MB) | API contract validates decoded photo at 3MB per photo. Client-side 5MB limit allows files that will be rejected server-side after base64 overhead. Tightening to 3MB avoids confusing server rejections |
| 2026-04-07 | Distinguish timeout abort from user cancel via boolean flag | Both use AbortController.abort() but need different UX: timeout shows toast, user cancel shows nothing. A module-scope `isTimeoutAbort` flag is simplest |
| 2026-04-07 | Object URLs revoked before replacement and in clearResult() | Prevents memory leaks from repeated generations. Browser reclaims on page unload as safety net |
| 2026-04-07 | Store owns AbortController lifecycle (not component) | Store persists across component mount/unmount. If user navigates away from /app/generate during a request, the store still handles the response correctly |
| 2026-04-07 | Filter stale keys in restoreFromProject() | Persisted projects may have old `lastGenerateOptions` with removed fields (`weather`, `renderStyle`, `thinkingMode`, `cameraAngle`, `resolution`). Whitelist filter against `DEFAULT_OPTIONS` keys prevents type pollution |
| 2026-04-07 | Store `resultMimeType` alongside `resultUrl` | ResultView needs MIME type to determine download filename extension (`.png` vs `.jpg`). Object URLs don't expose Content-Type. Store it from the response headers when the blob is received |
| 2026-04-07 | Remove inline ErrorState from Workspace, use toast only | Having both inline error display and toast creates duplicate error UX. Toast is the spec'd pattern; inline state removed for simplicity |
| 2026-04-07 | Generic 5xx fallback for unmapped status codes | 502 and 504 have specific toasts, but 500/503/other 5xx need a catch-all to avoid undefined behavior in the error mapper |

---

## Agent Log

```
2026-04-06 — PLAN-F initialized. Waiting on PLAN-A completion before starting.
2026-04-07 — Plan rewritten after 5-agent review (code-reviewer, architect, technical-writer, QA, react-specialist). Findings: plan was severely outdated — 16 generate UI components already exist, field names/values in generate.ts diverge from API contract (3 critical mismatches), modal-based architecture assumption wrong (dedicated page exists), no tests specified, no error handling for 413/500/non-JSON. Plan restructured as 3-phase API integration + type fix + UI completion. All existing components preserved.
2026-04-07 — Second review pass (5 agents). All critical issues confirmed resolved. Minor fixes applied: StyleTransfer.tsx import breakage addressed, stale lastGenerateOptions migration guard added, generic 5xx fallback added, error mapping expanded for "invalid request body"/"project is required", InitialGeneration UI restructuring tasks made explicit (remove 3 dropdowns + toggle), 3MB photo validation task added, resultMimeType store field for download extension, inline ErrorState removed in favor of toast-only, 3 additional test cases added.
2026-04-07 — Third review pass (5 agents). Architect and technical-writer: no issues found. Code-reviewer: 2 minor issues (StyleTransfer 3-place usage underspecified, ErrorState naming). QA: 5 minor test gaps (positive season test, project-required error, yardPhoto stripping assertion, 3MB boundary, double-click manual test). React: 2 minor issues (ResultView store wiring, React import ordering). All 9 fixes applied. Plan approved by all reviewers.
```
