# PLAN-F — Image Generation UI

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This plan covers the frontend image generation feature: Generate button, options panel, API client, loading overlay, result modal, and error handling.
> PLAN-A must be `done` before starting (needs toolbar, project state, `markDirty()`). Does NOT require PLAN-E — only needs the toolbar slot from PLAN-A.

---

## Agent Protocol

### Reading This Plan

1. **Verify PLAN-A is done** before starting any task here.
2. **This plan owns the full image generation UI.** The backend pipeline is out of scope — this plan builds the frontend that calls `POST /api/generate`.
3. **Request construction must match api-contract.md exactly.** Merge registries into the project object, extract `yard_photo` to top-level, map option names to snake_case.
4. **Error toasts never show raw backend errors.** Map HTTP status codes to user-friendly messages per image-generation.md.

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
| **Title** | Image Generation UI |
| **Scope** | Generate button · options panel · API client · loading overlay · result modal · error handling. Excludes backend pipeline, segmentation render, and prompt construction |
| **Depends on** | PLAN-A (toolbar, project state, `markDirty()`) |
| **Unblocks** | Nothing — standalone feature |
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

---

## Context Map

```bash
# Generate button spec (position, disabled state, tooltip):
grep -n "Generate\|toolbar\|disabled\|yardBoundary" docs/frontend/image-generation.md

# Options panel fields and layout:
grep -n "Options Panel\|Dropdown\|Field\|Control\|Default" docs/frontend/image-generation.md

# Request construction (merge registries, snake_case mapping):
grep -n "Request Construction\|requestBody\|registries\|yard_photo\|snake" docs/frontend/image-generation.md

# API contract (request shape, response format, error codes):
grep -n "POST\|Request Body\|Response\|Error\|yard_photo\|Project Field Shape" docs/backend/api-contract.md

# Loading state and result modal:
grep -n "Loading\|overlay\|Cancel\|AbortController\|Result Modal\|Download\|Generate Again" docs/frontend/image-generation.md

# Error handling (toast messages, HTTP status mapping):
grep -n "Error Handling\|toast\|400\|502\|504\|auto-dismiss" docs/frontend/image-generation.md

# Persisting last-used options:
grep -n "lastGenerateOptions\|uiState\|Persisting" docs/frontend/image-generation.md

# Reference photo rules:
grep -n "Reference Photo\|yardPhoto\|upload\|Remove\|base64\|5 MB" docs/frontend/image-generation.md
```

| Doc | Owns | When to load |
|-----|------|-------------|
| `docs/frontend/image-generation.md` | Full frontend image generation spec: button, panel, request, loading, result, errors | Full read for all tasks in this plan |
| `docs/backend/api-contract.md` | API request shape, response format, validation rules, error codes | Read `## Request Body`, `## Project Field Shape`, `## Error Response Format` for API client tasks |
| `docs/frontend/data-schema.md` | `project.yardPhoto` storage, `project.uiState` shape | `grep -n "yardPhoto\|uiState" docs/frontend/data-schema.md` |
| `docs/frontend/visual-design.md` | Blue accent color `#1971c2`, toolbar layout | `grep -n "#1971\|toolbar\|accent" docs/frontend/visual-design.md` |

---

## Phase F1 — Image Generation UI [ ]

---

#### Feature: Generate Button [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Entry Point: Generate Button`
**Load hint:** `grep -n "Generate\|toolbar\|disabled\|yardBoundary\|spark\|wand\|pill" docs/frontend/image-generation.md`

##### Tasks

- [ ] Add "Generate Preview" button to the top toolbar right side, visually separated from tool group by a divider — spark/wand icon, label "Generate Preview" (abbreviated "Generate" at narrow widths)
- [ ] Style as blue accent `#1971c2` filled pill button
- [ ] Implement disabled state: disabled when `project.yardBoundary` is null, tooltip reads "Set up a yard boundary before generating."
- [ ] Wire click handler to open the Generate Options Panel

##### Decisions

_None yet. Add entries here when architectural choices are made during implementation._

---

#### Feature: Options Panel [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Generate Options Panel`
**Load hint:** `grep -n "Options Panel\|Dropdown\|Field\|Control\|Default\|Advanced\|Seed\|Include Planned\|Reference Photo\|lastGenerateOptions" docs/frontend/image-generation.md`

##### Tasks

- [ ] Implement centered modal dialog (not a popover — must not close on outside click) with close button
- [ ] Add Reference Photo section: upload button (accept JPEG/PNG only, max 5 MB), thumbnail display (max 120x80px, cover crop), Remove button that clears `project.yardPhoto` and calls `markDirty()`
- [ ] Add dropdowns: Garden Style (9 values, default "garden"), Season (6 values + "Auto (detect)", default "Auto"), Time of Day (4 values, default "golden hour"), Viewpoint (3 values, default "eye-level"), Aspect Ratio (3 values, default "square")
- [ ] Season "Auto" label: show "Auto (detect from location)" when `project.location` is set, "Auto (defaults to summer)" when not set
- [ ] Add collapsible Advanced section (collapsed by default): Seed number input (empty = random), Include Planned toggle (default on)
- [ ] Pre-fill panel from `project.uiState.lastGenerateOptions` on open (seed always resets to empty, reference photo reads from `project.yardPhoto`)
- [ ] On Generate click: persist current options (except seed and reference photo) to `project.uiState.lastGenerateOptions` via `markDirty()`, then trigger request
- [ ] Add Cancel and Generate buttons in footer

##### Decisions

_None yet._

---

#### Feature: API Client [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Request Construction`
**Also see:** `docs/backend/api-contract.md` → `## Request Body`, `## Project Field Shape`
**Load hint:** `grep -n "requestBody\|registries\|yard_photo\|snake_case\|POST.*generate\|AbortController" docs/frontend/image-generation.md`

##### Tasks

- [ ] Build request body per spec: spread full project object, merge registries into project, extract `project.yardPhoto` to top-level `yard_photo` field, strip `yardPhoto` from the project copy to avoid double-sending
- [ ] Map option names from camelCase to snake_case (`gardenStyle` → `garden_style`, etc.); omit fields that are null or "Auto"
- [ ] Send `POST /api/generate` with `Content-Type: application/json` and `Accept: image/png`
- [ ] Wire AbortController: create on request start, pass signal to fetch, expose abort function to loading overlay cancel button
- [ ] Handle success response: read response as blob (PNG bytes), create object URL for display in result modal
- [ ] Handle error responses: parse JSON body for `error` field, log to console, map HTTP status to user-facing toast message

##### Decisions

_None yet._

---

#### Feature: Loading Overlay [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Loading State`
**Load hint:** `grep -n "Loading\|overlay\|spinner\|Cancel\|AbortController\|60s\|abort" docs/frontend/image-generation.md`

##### Tasks

- [ ] Implement full-screen semi-transparent dark overlay with centered content: spinning ring icon, "Generating your preview..." text, "This may take up to 60s" subtext
- [ ] Add Cancel button that calls `AbortController.abort()` — on abort: close overlay, show no result modal, show no error toast
- [ ] Close overlay on successful response (transition to result modal) or on error (transition to error toast)
- [ ] Implement 60-second implicit timeout: if no response within 60s, abort the request and show timeout error toast

##### Decisions

_None yet._

---

#### Feature: Result Modal [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Result Modal`
**Load hint:** `grep -n "Result Modal\|Download\|Generate Again\|preview.png\|80vh" docs/frontend/image-generation.md`

##### Tasks

- [ ] Implement centered result modal displaying generated PNG at natural resolution, scaled to fit (max 80vh, maintain aspect ratio)
- [ ] Click on image expands to full screen
- [ ] Add Download button: trigger browser file download as `{project.name}-preview.png`
- [ ] Add "Generate Again" button: close result modal, reopen Generate Options Panel with same settings pre-filled
- [ ] Close button dismisses modal; generated image is not stored (discarded if not downloaded)

##### Decisions

_None yet._

---

#### Feature: Error Handling [ ]

**Status:** `todo`
**Spec:** `docs/frontend/image-generation.md` → `## Error Handling`
**Load hint:** `grep -n "Error Handling\|toast\|400\|502\|504\|auto-dismiss\|Network error\|Abort" docs/frontend/image-generation.md`

##### Tasks

- [ ] Implement error toast component: top-of-screen, non-blocking, manually dismissible, 8-second auto-dismiss
- [ ] Map HTTP 400 `"project has no yard boundary"` → "Set up a yard boundary before generating."
- [ ] Map other HTTP 400 → "Generation failed: check your options and try again."
- [ ] Map HTTP 502 → "The AI service returned an error. Try again in a moment."
- [ ] Map HTTP 504 → "Generation timed out (60s). Try again or simplify your garden layout."
- [ ] Map network error (no response) → "Could not reach the server. Check your connection."
- [ ] Abort (user cancelled): no toast shown
- [ ] Log raw backend `error` field to browser console for debugging; never show to user

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | PLAN-F created as a standalone plan parallel to C/D/E | Image generation was excluded from Plans A-E but needs a plan to avoid being orphaned; depends only on PLAN-A deliverables |

---

## Agent Log

```
2026-04-06 — PLAN-F initialized. Waiting on PLAN-A completion before starting.
```
