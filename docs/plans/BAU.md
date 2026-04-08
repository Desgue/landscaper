# BAU Backlog — Blueprint Garden

> **Purpose:** AI-first backlog of improvements, bug fixes, and technical debt items. Each item is scoped for an agent to pick up, create a plan from `PLAN_TEMPLATE.md`, and implement autonomously.

**Last updated:** 2026-04-08

---

## Agent Protocol

### How to use this backlog

1. **Scan the tables below** — find items with status `open` in priority order (critical → high → medium → low).
2. **Pick one item or a related cluster** — items within the same category can be planned together.
3. **Create a plan** — copy `docs/plans/PLAN_TEMPLATE.md` to `docs/plans/PLAN_BAU-<ID>.md` and fill it using the context hints provided in each item.
4. **Implement the plan** — follow the plan's agent protocol.
5. **Update this file** — mark the item `done` with the date and link the plan file.

### Item format

Each item includes:
- **ID** — stable reference (`BAU-<number>`)
- **Category** — thematic grouping (Bugs & Rendering, Error Handling, UX & Accessibility, Refactoring, Infrastructure, Cleanup, Testing, Spikes)
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

## Dependency Graph

Items are grouped into parallel tracks. Within a track, arrows indicate "must complete before". Items across tracks are independent unless noted.

### Critical paths

```
Chain 1 — UI Rethink (longest path, gates most UI work):
  BAU-30 → BAU-5 → BAU-6 → BAU-13 + BAU-14 (parallel)
       └→ BAU-23 → BAU-25 + BAU-26 (parallel)
       └→ BAU-24
       └→ Landing page plan (pause until BAU-30 done)

Chain 2 — Rendering (safe to run now, no UI chrome):
  BAU-19 → BAU-27 → BAU-22

Chain 3 — Error UX (safe to run now):
  BAU-4 → BAU-21, BAU-10, BAU-9
```

### Parallel execution tracks

| Track | Sequence | Notes |
|-------|----------|-------|
| **A — Rendering** | BAU-19 → BAU-27 → BAU-22 | Fix visibility first, then scale, then structure distortion |
| **B — Errors** | BAU-2 + BAU-3 (parallel) → BAU-4 → BAU-21 + BAU-10 + BAU-9 (parallel) | BAU-4 toast system unlocks 3 items |
| **C — UI Rethink** | BAU-30 → BAU-5 + BAU-6 + BAU-14 + BAU-23 + BAU-24 + BAU-25 + BAU-26 + LP | All UI-heavy work gates on new identity |

Tracks A and B can run now in parallel. Track C starts after BAU-30 spike completes.

### Cross-category dependencies

| Upstream | Downstream | Reason |
|----------|------------|--------|
| BAU-30 (spike) | BAU-5, BAU-6, BAU-14, BAU-23, BAU-24, BAU-25, BAU-26, Landing page | All involve significant UI; design direction must be decided first |
| BAU-30 (spike) | BAU-2, BAU-21 (partial) | Core logic is safe now; fallback page design and visual feedback style wait for BAU-30 |
| BAU-19 (rendering) | BAU-27 (rendering) | Must fix tree visibility before sprite scaling matters |
| BAU-4 (errors) | BAU-21 (UX), BAU-10 (errors), BAU-9 (errors) | All need the centralized toast system |
| BAU-5 (refactor) | BAU-6 (refactor), BAU-14 (UX) | Split InspectorPanel before restyling or batch editing |
| BAU-23 (spike) | BAU-25 (spike), BAU-26 (spike) | Plant schedule embeds in PDF; SVG/DXF shares export arch |

### No dependencies (safe to start now)

BAU-3, BAU-4, BAU-7, BAU-9, BAU-10, BAU-11, BAU-13, BAU-15, BAU-19, BAU-20, BAU-22, BAU-27, BAU-28, BAU-29

---

## Status Summary

### Bugs & Rendering

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-19 | Tree/shrub plants not visible on canvas | critical | `open` |
| BAU-20 | API yard_photo validation rejects data-URL format | critical | `open` |
| BAU-22 | Structure sprite texture includes extrusion (double south-face) | medium | `open` |
| BAU-27 | Plant sprites rendered at fixed 64px regardless of real-world size | high | `open` |
| BAU-28 | Structure bounding box doesn't rotate with shape | medium | `open` |

### Error Handling & Resilience

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-2 | Error boundary for lazy imports | critical | `open` |
| BAU-3 | File size validation on import | critical | `open` |
| BAU-4 | Centralized error logging with user-facing toasts | high | `open` |
| BAU-9 | API retry with exponential backoff | high | `open` |
| BAU-10 | PNG export error feedback | medium | `open` |

### UX & Accessibility

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-7 | Canvas keyboard accessibility | high | `open` |
| BAU-21 | No visual feedback on plant placement failure | high | `open` |
| BAU-13 | Bold/italic keyboard shortcuts for labels | medium | `open` |
| BAU-14 | Multi-select plant batch editing | medium | `open` |
| BAU-29 | Angle snapping for structure rotation | medium | `open` |

### Refactoring & Code Quality

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-5 | Break down large components (JournalView, InspectorPanel) | high | `open` |
| BAU-6 | Consolidate inspectors to shadcn/ui | high | `open` |
| BAU-12 | ~~Type-safe error handling (remove `as unknown` casts)~~ | ~~medium~~ | `dropped` — only 14 casts, mostly PixiJS interop; fix opportunistically |

### Infrastructure & Backend

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-8 | ~~IndexedDB migration system~~ | ~~high~~ | `dropped` — over-engineered; schema evolution handled by validation on load |
| BAU-15 | Go server graceful shutdown | medium | `open` |
| BAU-16 | ~~Anonymous error tracking (Sentry or similar)~~ | ~~low~~ | `dropped` — premature for personal project; BAU-4 toasts cover user-facing errors |

### Cleanup & Documentation

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-11 | Remove generate store stubs or implement features | medium | `open` |
| BAU-17 | ~~Store method JSDoc documentation~~ | ~~low~~ | `dropped` — TypeScript types already document signatures; JSDoc decays fast |
| BAU-18 | ~~ESLint rule compliance (remove disables)~~ | ~~low~~ | `dropped` — only 5 disables; fix inline when touching those files |

### Testing

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-1 | ~~Component test coverage~~ | ~~critical~~ | `dropped` — low ROI for UI components; test critical-path logic opportunistically |

### Spikes

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| BAU-30 | Spike: UI identity rethink — move away from Excalidraw toward professional design tool | critical | `open` |
| BAU-23 | Spike: Professional design tool parity | high | `open` |
| BAU-24 | Spike: Construction lines and reference guides | high | `open` |
| BAU-25 | Spike: Plant schedule generation | medium | `open` |
| BAU-26 | Spike: SVG/DXF export | medium | `open` |

---

## Items

### Bugs & Rendering

#### BAU-19: Tree/shrub plants not visible on canvas `critical`

**Problem:** Plants with category `tree` (oak, maple, birch, fruit-tree, ornamental-pear, japanese-maple) do not appear on the canvas after placement. They are confirmed in the store (`plantCount` increments) and sprites are created (`entries` increments), but they are not visually rendered.

**Investigation so far:**
- Pipeline confirmed working: InteractionManager dispatches → PlantPlacement handler adds element → PlantRenderer rebuilds → entries created → container children increase
- Trees use `growthForm: 'tree'`, so `effectiveRadius = canopyWidthCm / 2` (e.g., Oak = 400cm, diameter = 800cm)
- Tree spacing values are very large (300–800cm), causing many placements to silently fail via `hasSpacingCollision`
- Tree base color is brown (`#795548`), drawn by `drawTree()` in PlantSprites.ts — could blend with soil terrain

**Context hints:**
- `src/canvas-pixi/PlantRenderer.ts` — `effectiveRadius()` line 96, `createPlantEntry()` line 114
- `src/canvas-pixi/textures/PlantSprites.ts` — `drawTree()` line 100, `CATEGORY_COLORS` line 22
- `src/data/builtinRegistries.ts` — tree entries (lines 97–136, canopyWidthCm 300–800)
- `src/canvas-pixi/PlacementHandlers.ts` — `hasSpacingCollision()` line 54

**Possible causes (investigate in order):**
1. Sprites are in scene graph but `visible = false` — check `updateElementVisibility()` culling logic for large-radius plants
2. Large sprites (800cm) may have z-ordering issues or be behind terrain/boundary layers
3. Overflow dim (45% alpha slate overlay) may obscure plants placed outside boundary
4. Tree color (#795548 brown) blends with soil terrain, making them invisible at low zoom

**Acceptance criteria:**
- [ ] All tree-category plants render visibly when placed on the canvas
- [ ] Trees are visually distinguishable from terrain at all zoom levels
- [ ] Placement failure (spacing collision) shows user feedback

---

#### BAU-20: API yard_photo validation rejects data-URL format `critical`

**Problem:** All `/api/generate` requests with a yard photo fail with `400 "invalid yard_photo"`. The frontend sends photos as data URLs (`data:image/jpeg;base64,/9j/...`) but the backend expects raw base64 without the data-URL prefix.

**Root cause:** The frontend's `useGenerateStore.setYardPhoto()` stores the photo as a data URL (line 126). `buildRequestBody()` sends it verbatim as `yard_photo` (line 74). The backend's `decodePhoto()` calls `base64.StdEncoding.DecodeString()` on the full string including `data:image/jpeg;base64,` prefix, which is invalid base64.

**Context hints:**
- `src/store/useGenerateStore.ts` line 126 — stores `dataUrl` directly
- `src/api/generateClient.ts` line 73–75 — sends `yardPhoto` as-is
- `internal/handler/validate.go` line 220 — `base64.StdEncoding.DecodeString(b64)` fails on data-URL prefix
- Server logs: `"error":"invalid yard_photo"` on every request with a photo

**Fix options (choose one):**
- **Frontend fix:** Strip data-URL prefix in `buildRequestBody()` before sending: `yardPhoto.replace(/^data:image\/\w+;base64,/, '')`
- **Backend fix:** In `decodePhoto()`, detect and strip `data:` prefix before base64 decode

**Acceptance criteria:**
- [ ] Photos uploaded via the Generate page are accepted by the backend
- [ ] Both JPEG and PNG photos work
- [ ] Photos without data-URL prefix still work (backward compat)
- [ ] Existing tests pass with the fix

---

#### BAU-22: Structure sprite texture includes extrusion strip (double south-face) `medium`

**Problem:** `generateStructureSprite()` renders a canvas of height `heightPx + extrusionHeight` that includes the south-face extrusion strip. But `StructureRenderer` sets the sprite to only `w × h` (squashing the extrusion into the top face), then draws a SEPARATE south-face `Graphics` object. Result: distorted top face and doubled south face.

**Context hints:**
- `src/canvas-pixi/textures/StructureSprites.ts` lines 403–408 — canvas is `widthPx × totalHeight`
- `src/canvas-pixi/StructureRenderer.ts` lines 309–312 — sprite forced to `w × h`
- `src/canvas-pixi/StructureRenderer.ts` lines 327–336 — separate southFace Graphics drawn

**Fix:** Remove the extrusion strip from `generateStructureSprite()` — only generate the top face texture at `widthPx × heightPx`. The `StructureRenderer` already handles the south face as a separate Graphics object.

**Acceptance criteria:**
- [ ] Structure top face renders without vertical distortion
- [ ] South face appears once (Graphics only, not baked into texture)
- [ ] All structure categories render correctly

---

#### BAU-27: Plant sprites rendered at fixed 64px regardless of real-world size `high`

**Problem:** All plant sprites are generated at a fixed 64×64px canvas size (`DEFAULT_PLANT_SIZE = 64` in `TextureAtlas.ts`), then stretched to their world-space dimensions at render time. Small plants (herbs at 20-60cm) look acceptable, but trees with large canopies (300-800cm) get upscaled 5-12x from a tiny 64px texture, causing visible blurriness and making proportions feel "off" compared to correctly-scaled structures and terrain.

Structures don't have this problem because `getStructureSprite()` receives actual width/height and generates appropriately-sized textures (bucketed to power-of-2 up to 256px).

**Root cause:** `TextureAtlas.getPlantSprite()` passes a hardcoded `DEFAULT_PLANT_SIZE = 64` to `generatePlantSprite()`. The plant's actual `spacingCm` or `canopyWidthCm` is never used for texture generation — only for setting the PixiJS sprite's `width`/`height` at render time.

**Affected plants (upscale factor from 64px):**
- Oak: canopyWidthCm=800 → 12.5x upscale
- Maple: canopyWidthCm=700 → 10.9x
- Birch: canopyWidthCm=500 → 7.8x
- Fruit-tree: canopyWidthCm=400 → 6.2x
- Ornamental-pear: canopyWidthCm=350 → 5.5x
- Japanese-maple: canopyWidthCm=300 → 4.7x

**Context hints:**
- `src/canvas-pixi/textures/TextureAtlas.ts` line 136 — `DEFAULT_PLANT_SIZE = 64`
- `src/canvas-pixi/textures/TextureAtlas.ts` lines 168-184 — `getPlantSprite()` ignores plant dimensions
- `src/canvas-pixi/textures/PlantSprites.ts` line 420 — `generatePlantSprite()` uses passed `sizePx` for canvas
- `src/canvas-pixi/PlantRenderer.ts` lines 114-125 — `effectiveRadius()` and sprite sizing at world scale
- `src/canvas-pixi/textures/StructureSprites.ts` — reference for correct approach (size-aware generation)

**Fix approach:** Follow the structure sprite pattern — pass the plant's effective diameter (in cm, bucketed to power-of-2 pixel sizes) to `generatePlantSprite()` so that larger plants get higher-resolution textures. Cap at a reasonable max (e.g., 256 or 512px). Update the FIFO cache key to include the size bucket.

**Acceptance criteria:**
- [ ] Plant sprite texture size scales with the plant's effective diameter (spacingCm or canopyWidthCm)
- [ ] Large trees (300-800cm) render with crisp, detailed textures — not blurry upscaled 64px sprites
- [ ] Small plants (20-60cm) are unaffected (still render at 64px or appropriate size)
- [ ] Texture cache key includes size bucket to avoid cache collisions
- [ ] No visible regression for existing plant types at any zoom level

---

#### BAU-28: Structure bounding box doesn't rotate with shape `medium`

**Problem:** When a structure is rotated (via the Rotation field in the inspector or the rotation handle), the selection bounding box (blue dashed rectangle), resize handles, and rotation handle all stay axis-aligned instead of rotating with the shape. A Brick Wall rotated 10 degrees shows the bounding box still aligned to 0 degrees, with handles floating in empty space away from the actual shape corners.

**Root cause:** `structureGetAABB()` in `elementAABB.ts:95-98` returns raw `x, y, width, height` and completely ignores `element.rotation`:

```typescript
export function structureGetAABB(element: StructureElement) {
  return { x: element.x, y: element.y, w: element.width, h: element.height }
}
```

The entire selection rendering pipeline consumes this unrotated AABB:
- `SelectionOverlay.ts:89` — `getElementAABB(el)` feeds `drawDashedBoundingBox()` (line 90), `drawResizeHandles()` (line 94), and `drawRotationHandle()` (line 99), all with axis-aligned coordinates
- `SelectionOverlay.ts:217-230` — `drawResizeHandles()` uses `getHandlePositions(aabb)` which returns 8 positions from raw AABB
- `SelectionOverlay.ts:232-250` — `drawRotationHandle()` places the circle at `aabb.x + aabb.w / 2, aabb.y - offset` (unrotated top-center)
- `SelectionStateMachine.ts:129-139` — `isOnRotationHandle()` hit-tests against the unrotated handle position
- `structureHitTest()` in `elementAABB.ts:86-93` also ignores rotation (marked `ignores rotation for MVP` in the comment at line 85)

Note: the `structureHitTest` at `elementAABB.ts:85-93` is also axis-aligned and has the same bug — clicks miss the rotated shape and hit empty space inside the unrotated AABB. This should be fixed as part of this item.

**Fix approach:** Two viable paths:
1. **Rotated OBB overlay** — keep `structureGetAABB()` as-is but apply a rotation transform when drawing in `SelectionOverlay.ts` (rotate the Graphics context around the element center before drawing box/handles). Update `isOnRotationHandle()` and `isOnResizeHandle()` to inverse-transform the pointer into local space before hit-testing.
2. **Compute enclosing AABB** — change `structureGetAABB()` to return the axis-aligned bounding box of the rotated rectangle (rotate 4 corners, take min/max). Simpler but handles won't sit on the actual corners of the rotated shape.

Option 1 is recommended — it matches professional design tool behavior.

**Context hints:**
- `src/canvas/elementAABB.ts:85-98` — `structureHitTest()` and `structureGetAABB()`, both ignore rotation
- `src/canvas-pixi/SelectionOverlay.ts:86-100` — selection rendering consumes AABB for box, resize handles, and rotation handle
- `src/canvas-pixi/SelectionOverlay.ts:217-250` — `drawResizeHandles()` and `drawRotationHandle()` draw from unrotated AABB
- `src/canvas-pixi/SelectionStateMachine.ts:95-111` — `getHandlePositions()` returns 8 positions from raw AABB
- `src/canvas-pixi/SelectionStateMachine.ts:129-139` — `isOnRotationHandle()` hit-tests unrotated position
- `src/canvas-pixi/StructureRenderer.ts:280,418` — rotation IS correctly applied to the visual via `group.rotation = (safeRotation * Math.PI) / 180`
- `src/components/InspectorPanel.tsx:429-444` — rotation input (0–359 degrees)

**Acceptance criteria:**

- [ ] **GIVEN** a structure rotated to a non-zero angle (e.g. 10 degrees via inspector) **WHEN** the structure is selected **THEN** the dashed bounding box is drawn rotated to match the structure's visual orientation
- [ ] **GIVEN** a rotated structure is selected **WHEN** the user views the resize handles **THEN** all 8 handles sit on the actual corners and edge midpoints of the rotated shape, not on the axis-aligned AABB
- [ ] **GIVEN** a rotated structure is selected **WHEN** the user views the rotation handle **THEN** the circular handle and its connecting line extend from the rotated top-center of the structure
- [ ] **GIVEN** a rotated structure **WHEN** the user clicks on the visible shape area that falls outside the unrotated AABB **THEN** the click registers as a hit on the structure
- [ ] **GIVEN** a structure is selected and the user changes its rotation via the inspector field **WHEN** the rotation value updates **THEN** the bounding box, resize handles, and rotation handle reposition in real-time to match the new angle
- [ ] **GIVEN** a rotated structure is selected **WHEN** the user drags a resize handle **THEN** resizing operates along the structure's local axes (not the canvas axes)

---

### Error Handling & Resilience

#### BAU-2: Error boundary for lazy imports `critical`

**Problem:** `React.lazy()` in `src/App.tsx` (lines 13-15) chains two dynamic imports with no error boundary. If either import fails (network issue, deploy race), the app white-screens.

**Context hints:**
- `src/App.tsx` — the lazy import chain
- React docs: Error Boundaries, Suspense

**Acceptance criteria:**
- [ ] An `ErrorBoundary` component wraps the `Suspense` in `App.tsx`
- [ ] On import failure, user sees a friendly error with a "Reload" button
- [ ] Manually testable by blocking the chunk URL in DevTools Network tab

---

#### BAU-3: File size validation on import `critical`

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

#### BAU-4: Centralized error logging with user-facing toasts `high`

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

#### BAU-9: API retry with exponential backoff `high`

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

#### BAU-10: PNG export error feedback `medium`

**Problem:** `src/canvas-pixi/exportPNG.ts` (lines 59, 62, 67) logs errors to console but gives no feedback to the user when export fails.

**Context hints:**
- `src/canvas-pixi/exportPNG.ts` — export logic and error paths
- `grep -n "console.error\|console.warn" src/canvas-pixi/exportPNG.ts`

**Acceptance criteria:**
- [ ] Export errors surface as user-facing toast notifications
- [ ] Error messages describe what went wrong in plain language
- [ ] Successful export shows a brief success toast

---

### UX & Accessibility

#### BAU-7: Canvas keyboard accessibility `high`

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

#### BAU-21: No visual feedback on plant placement failure `high`

**Problem:** When a plant placement fails due to spacing collision or structure collision, nothing happens — no error message, no visual indicator. Users click repeatedly with no feedback, thinking the tool is broken.

**Context hints:**
- `src/canvas-pixi/PlacementHandlers.ts` lines 329–331 — collision checks return silently
- Spacing collision is especially common for trees (spacingCm: 300–800cm) and densely planted areas

**Acceptance criteria:**
- [ ] Failed placement shows a brief visual indicator (e.g., red flash, shake, or toast)
- [ ] Indicator distinguishes between spacing collision and structure collision
- [ ] Feedback disappears after ~1 second without blocking further interaction

---

#### BAU-13: Bold/italic keyboard shortcuts for labels `medium`

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

#### BAU-14: Multi-select plant batch editing `medium`

**Problem:** Selecting multiple plants requires editing each individually.

**Context hints:**
- `src/components/InspectorPanel.tsx` — plant inspector section
- `docs/frontend/selection-manipulation.md` — multi-select behavior

**Acceptance criteria:**
- [ ] Multi-select inspector shows editable fields for batch-applicable properties (status, notes, layer)
- [ ] Per-element-only properties (position X/Y) are hidden in multi-select mode
- [ ] Changes apply to all selected plants atomically (single undo step)

---

#### BAU-29: Angle snapping for structure rotation `medium`

**Problem:** The interactive drag-to-rotate handle on structures works (SelectionStateMachine.ts:625-641) but rotation is fully freehand — there is no way to constrain to common angles (0, 15, 30, 45, 90 degrees). Users must manually type exact values into the inspector rotation field (`InspectorPanel.tsx:429-444`) to get precise angles. Professional design tools allow Shift-held rotation to snap to 15-degree increments.

**Current rotation implementation (already working):**
- Rotation handle rendered as a circle above the bounding box: `SelectionOverlay.ts:232-250`
- Hit detection: `SelectionStateMachine.ts:129-139` (`isOnRotationHandle()`)
- Drag mode activation: `SelectionStateMachine.ts:333-350` (sets `drag.mode = 'rotating'`)
- Angle computation during drag: `SelectionStateMachine.ts:625-641` (free rotation via `Math.atan2`, no snapping)
- Undo support: `SelectionStateMachine.ts:644+` (history pushed on `handleUp` for `'rotating'` mode)

**What's missing:** The rotation drag handler at `SelectionStateMachine.ts:635-636` computes `newRotation` as a continuous value with no modifier key check. The snap system (`snapSystem.ts:22-28`) explicitly defers angle snapping: _"A general projection-based perpendicular snap (for rotated elements, arcs, and non-rectangular shapes) is deferred"_.

**Fix approach:** In the `'rotating'` branch of `handleMove()` (SelectionStateMachine.ts:625-641), check for Shift key held, and if so, round `newRotation` to the nearest 15-degree increment before assigning. Optionally add a visual angle indicator (arc or degree label) near the rotation handle during drag.

**Context hints:**
- `src/canvas-pixi/SelectionStateMachine.ts:625-641` — rotation drag handler (add snap logic here)
- `src/canvas-pixi/SelectionStateMachine.ts:333-350` — rotation mode activation (Shift key available on the event)
- `src/canvas-pixi/SelectionOverlay.ts:232-250` — rotation handle rendering (add angle indicator here)
- `src/snap/snapSystem.ts:22-28` — comment documenting deferred angle snap
- Related: BAU-23 sub-area 4 (angle snapping spike) covers the broader angle snap design; this item covers the specific Shift-to-snap interaction for the existing rotation handle

**Acceptance criteria:**

- [ ] **GIVEN** a structure is selected and the user drags the rotation handle **WHEN** Shift is NOT held **THEN** the structure rotates freely (existing behavior unchanged)
- [ ] **GIVEN** a structure is selected and the user drags the rotation handle **WHEN** Shift IS held **THEN** the rotation snaps to the nearest 15-degree increment (0, 15, 30, 45, ... 345)
- [ ] **GIVEN** the user is dragging the rotation handle with Shift held **WHEN** the user releases Shift mid-drag **THEN** rotation transitions smoothly to freehand mode without jumping
- [ ] **GIVEN** the user is dragging the rotation handle **WHEN** the rotation angle changes **THEN** the inspector Rotation field updates in real-time to reflect the current angle
- [ ] **GIVEN** the user completes a rotation drag (with or without Shift snap) **WHEN** the user presses Ctrl+Z **THEN** the rotation reverts to its pre-drag value in a single undo step

---

### Refactoring & Code Quality

#### BAU-5: Break down large components `high`

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

#### BAU-6: Consolidate inspectors to shadcn/ui `high`

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

#### BAU-12: Type-safe error handling `medium`

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

### Infrastructure & Backend

#### BAU-8: IndexedDB migration system `high`

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

#### BAU-15: Go server graceful shutdown `medium`

**Problem:** `cmd/server/main.go` (line 90) uses `log.Fatal()` on startup errors, and the server lacks signal-based graceful shutdown for in-flight requests.

**Context hints:**
- `cmd/server/main.go` — server entry point
- `grep -n "log.Fatal\|signal\|Shutdown" cmd/server/main.go`

**Acceptance criteria:**
- [ ] Server handles `SIGINT` and `SIGTERM` signals
- [ ] In-flight HTTP requests complete before shutdown (with a timeout)
- [ ] Shutdown logs a clean exit message

---

#### BAU-16: Anonymous error tracking `low`

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

### Cleanup & Documentation

#### BAU-11: Remove or implement generate store stubs `medium`

**Problem:** `useGenerateStore.ts` (lines 237-257) contains stub implementations returning mock data: `sendChatMessage()`, `generateDrafts()`, `upscaleSelected()`, `applyStyle()`, `acceptStyle()`. These could confuse agents or users.

**Context hints:**
- `src/store/useGenerateStore.ts` — search for `// stub` or `setTimeout`
- `grep -n "stub\|mock\|TODO\|placeholder" src/store/useGenerateStore.ts`

**Acceptance criteria:**
- [ ] Each stub is either: (a) removed if not on the roadmap, or (b) clearly marked with `@stub` JSDoc tag and a linked plan/issue
- [ ] No stub returns fake data that could be mistaken for real functionality
- [ ] If stubs are kept, calling them throws a descriptive `NotImplementedError`

---

#### BAU-17: Store method JSDoc documentation `low`

**Problem:** Zustand stores (`useProjectStore`, `useGenerateStore`, `useViewportStore`) lack JSDoc for public methods, making it harder for agents to understand side effects and async behavior.

**Context hints:**
- `grep -rn "export const use.*Store" src/store/` — find all stores
- Focus on methods that have side effects (DB writes, API calls, timer setup)

**Acceptance criteria:**
- [ ] All public store methods have `@description`, `@param`, and `@returns` JSDoc
- [ ] Async methods document what they await and potential failure modes
- [ ] Side effects (DB writes, timers, API calls) are explicitly noted

---

#### BAU-18: ESLint rule compliance `low`

**Problem:** Some files disable ESLint rules inline instead of fixing the underlying issue.

**Context hints:**
- `grep -rn "eslint-disable" src/` — find all disabled rules
- `src/components/WelcomeScreen.tsx` — `react-hooks/set-state-in-effect` disable

**Acceptance criteria:**
- [ ] Each `eslint-disable` comment is either: (a) removed by fixing the code, or (b) justified with a `-- reason` comment
- [ ] No new blanket `eslint-disable` lines introduced
- [ ] `npm run lint` passes cleanly

---

### Testing

#### BAU-1: Component test coverage `critical`

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

### Spikes

#### BAU-30: Spike — UI identity rethink `critical`

**Problem:** The current UI follows an Excalidraw-inspired canvas-first, whiteboard-style approach: minimal chrome, white backgrounds, system fonts, outlined toolbar icons, sketch-adjacent aesthetics. This works for quick diagramming but creates a mismatch with the target audience — professional landscapers, interior/exterior designers, and garden planners — who expect a tool that looks and feels like a design application, not a whiteboard.

The app serves three distinct user needs that each pull the UI in different directions:
1. **2D blueprint creation** — precise, scaled plans with measurements, snap, and export (CAD-adjacent)
2. **AI-powered visualization** — generate photorealistic renders from the blueprint (creative/visual)
3. **Garden management** — plant schedules, journal, cost tracking, seasonal planning (data/productivity)

The Excalidraw aesthetic undersells all three. A blueprint tool needs to feel precise and trustworthy. A visualization tool needs to feel polished and creative. A garden manager needs to feel organized and informative. The current "generic canvas app" identity doesn't commit to any of these.

**Key questions to investigate:**

1. **Visual identity** — What does the UI of a professional landscape/interior design tool look like? Research competitors (SketchUp, SmartDraw, PRO Landscape, iScape, Planner 5D, RoomSketcher). What visual language communicates "professional design tool" vs "whiteboard"?

2. **Layout rethink** — Is the current 3-panel layout (side palette / canvas / inspector) the right structure? Should the blueprint view and the AI generation view share the same layout or have distinct modes? How do garden management features (journal, cost, schedule) fit without cluttering the design workspace?

3. **Component library** — The current UI is raw Tailwind. BAU-6 proposes shadcn/ui, but is that the right fit? Should we adopt a more opinionated design system that carries the professional identity (e.g., Radix + custom theme, or a purpose-built component set)?

4. **Color and typography** — System font stack feels generic. The blue accent (#1971c2) is functional but has no brand personality. What palette and type choices signal "professional design tool for outdoor/indoor spaces"?

5. **Dark mode** — Currently deferred. Most professional design tools offer dark mode. Is it essential for the target audience or still deferrable?

6. **Mobile/tablet story** — Current spec says "desktop-first, tablet collapses panels, mobile is limited." Garden management (journal, photo capture) is inherently mobile. Should the garden management features have a mobile-first companion experience?

**Context hints:**
- `docs/frontend/visual-design.md` — current design spec (layout, colors, typography, icons, rationale)
- `docs/frontend/image-generation.md` — generate page UI spec
- `docs/frontend/journal.md` — journal/garden management UI spec
- `src/components/TopToolbar.tsx` — current toolbar implementation
- `src/components/SidePalette.tsx` — current palette implementation
- `src/components/InspectorPanel.tsx` — current inspector implementation
- `src/pages/GeneratePage.tsx` — AI generation page
- Competitors to study: SketchUp (free web), SmartDraw, PRO Landscape, iScape, Planner 5D, RoomSketcher, Yardzen, Garden Planner (smallblueprinter.com)

**Spike deliverable:**
- [ ] Competitor UI audit — screenshots and patterns from 4-5 professional landscape/design tools
- [ ] Proposed visual identity: palette, typography, icon style, overall aesthetic direction
- [ ] Layout wireframes for the three modes (blueprint, generate, garden management)
- [ ] Component library recommendation with rationale
- [ ] Migration strategy from current UI to new identity (phased, not big-bang)
- [ ] Impact assessment on existing BAU items (BAU-5, BAU-6, BAU-23 may be subsumed or reshaped)

**Relationships:** This spike should be completed before BAU-5 (component split) and BAU-6 (shadcn adoption) — no point refactoring into a design system you're about to replace. BAU-23's sub-areas (alignment tools, numeric input, PDF export) should be designed within the new UI identity.

---

#### BAU-23: Spike — Professional design tool parity `high`

**Problem:** The app targets professional interior/exterior designers and garden planners but lacks five foundational CAD-like capabilities that together determine whether the tool can replace existing professional software. This spike investigates all five as a cohesive unit since they share schema, interaction, and export concerns.

**Sub-areas to investigate:**

1. **Freeform polygon/region drawing** — Designers need to draw irregular garden beds, curved patios, and organic shapes. Currently every element is a rectangle or predefined type. The terrain system uses 1m grid cells which produces blocky shapes. Investigate: new `RegionElement` type with arbitrary polygon vertices + arc segments, fill rendering, area calculation, interaction with snap system.

2. **Precise numeric coordinate and dimension input** — Position fields in InspectorPanel are read-only (see BUG-6 history). Users cannot type exact coordinates or dimensions during placement. Investigate: editable position/dimension fields with collision re-validation, on-canvas dimension input during drag (type "3.5" + Enter for exact length), arrow-key nudge with configurable step size.

3. **PDF export with scale and legend** — Only PNG and JSON export exist. Professionals need print-ready output with drawing scale (1:50, 1:100), title block, plant schedule legend, and standard paper sizes (A3, A4, ANSI B). Investigate: PDF generation library (jsPDF, pdf-lib), vector rendering from PixiJS scene graph, multi-page layout, print-to-scale math.

4. **Angle snapping (15/45/90 degrees)** — Rotation handle is completely freehand. No ortho mode for constraining drawing to horizontal/vertical. Investigate: Shift-held angle constraint during rotation and path drawing, configurable snap angles, visual angle indicator overlay.

5. **Alignment and distribution tools** — No align-left, align-center, distribute-horizontally, etc. Investigate: alignment commands on multi-selection (toolbar or context menu), distribute-with-equal-spacing, align-to-grid, keyboard shortcuts.

**Context hints:**
- `src/types/schema.ts` — element type union, would need new `RegionElement`
- `src/components/InspectorPanel.tsx` lines 228, 355 — read-only position fields (BUG-6)
- `src/canvas-pixi/SelectionStateMachine.ts` — rotation handling (no angle snap)
- `src/canvas-pixi/exportPNG.ts` — current export pipeline
- `src/canvas/arcGeometry.ts` — existing arc math (reusable for freeform arcs)
- `src/snap/snapSystem.ts` — current snap infrastructure
- `docs/frontend/selection-manipulation.md` — selection behavior spec

**Spike deliverable:**
- [ ] A plan document (`docs/plans/PLAN-BAU-23.md`) covering all five sub-areas
- [ ] Schema changes required (new element types, new fields)
- [ ] Interaction design for each sub-area (tool flows, keyboard modifiers)
- [ ] Library/dependency recommendations (PDF generation, vector export)
- [ ] Implementation phases with dependency ordering
- [ ] Risk assessment: which sub-areas conflict with existing architecture

---

#### BAU-24: Spike — Construction lines and reference guides `high`

**Problem:** Professional designers use construction lines (infinite guide lines) for layout alignment — setback lines, center lines, property boundaries, and reference axes. The app has no concept of non-element reference geometry.

**Context hints:**
- `src/canvas-pixi/GridRenderer.ts` — existing grid rendering (guide lines would render in a similar layer)
- `src/snap/snapSystem.ts` — guide lines should participate as snap targets
- `src/types/schema.ts` — may need a new `GuideLine` type or a dedicated `guides` array on `Project`
- CAD reference: AutoCAD "XLINE" and "RAY" commands, SketchUp guide lines

**Spike deliverable:**
- [ ] A plan document (`docs/plans/PLAN-BAU-24.md`)
- [ ] Data model: how guides are stored (project-level array vs element type)
- [ ] Rendering approach: infinite lines clipped to viewport, distinct visual style (dashed, colored)
- [ ] Interaction: placement tool (horizontal, vertical, angled, through-point), drag to reposition, delete
- [ ] Snap integration: guides as first-class snap targets in `snapSystem.ts`
- [ ] Intersection points: auto-detected guide-guide intersections as snap candidates

---

#### BAU-25: Spike — Plant schedule generation `medium`

**Problem:** Professional landscape plans include a plant schedule — a table listing all plant species, quantities, sizes, spacing, and notes. This is a standard deliverable alongside the visual plan. The app has all the data (plant registry + placed elements) but no way to generate or export this schedule.

**Context hints:**
- `src/types/schema.ts` — `PlantElement` and `PlantType` have all needed fields (name, category, spacingCm, sunRequirement, waterNeed, season, costPerUnit)
- `src/data/builtinRegistries.ts` — plant registry with full metadata
- `src/components/GeometryPanel.tsx` — existing per-element summary (could extend pattern)
- Professional reference: landscape architecture plant schedules typically include: symbol/key, botanical name, common name, quantity, size/caliper, spacing, remarks

**Spike deliverable:**
- [ ] A plan document (`docs/plans/PLAN-BAU-25.md`)
- [ ] Schedule data model: aggregation logic (group by plant type, count, compute totals)
- [ ] UI design: panel/modal/export format for the schedule table
- [ ] Export integration: embed in PDF export (BAU-23), standalone CSV/Excel export
- [ ] Cost summary integration: tie into existing `currency` and `costPerUnit` fields
- [ ] Symbol key: map plant type → canvas visual representation for legend

---

#### BAU-26: Spike — SVG/DXF export `medium`

**Problem:** Professional designers need vector export formats for CAD interoperability and print production. PNG is raster-only and lossy at scale. SVG preserves vector precision for web/print. DXF is the industry standard for exchanging drawings with AutoCAD, SketchUp, and other CAD tools.

**Context hints:**
- `src/canvas-pixi/exportPNG.ts` — current export pipeline (rasterizes PixiJS scene)
- `src/types/schema.ts` — all element geometry is stored as coordinates in cm (clean source for vector export)
- `src/canvas/arcGeometry.ts` — arc math (needed for SVG arc path commands)
- `src/canvas-pixi/textures/` — procedural textures would need SVG pattern equivalents
- Library candidates: SVG — direct DOM/string generation; DXF — `dxf-writer` or `makerjs` npm packages

**Spike deliverable:**
- [ ] A plan document (`docs/plans/PLAN-BAU-26.md`)
- [ ] SVG export: mapping from each element type to SVG primitives (rect, circle, path, text, pattern)
- [ ] DXF export: mapping from element types to DXF entities (LINE, ARC, CIRCLE, TEXT, HATCH)
- [ ] Layer mapping: canvas layers → SVG groups / DXF layers
- [ ] Scale and units: how cm-based coordinates map to SVG viewBox and DXF units
- [ ] Texture/fill handling: procedural textures → SVG patterns / DXF hatch patterns
- [ ] Library recommendation with bundle size impact

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
