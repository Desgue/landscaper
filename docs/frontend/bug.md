# Bugs & Improvements

Tracked bugs and improvement requests found during manual QA testing.

**Last updated:** 2026-04-07

---

## Status Summary

| ID | Title | Status |
|----|-------|--------|
| BUG-1 | Terrain painting does nothing | RESOLVED |
| BUG-2 | Done button doesn't close boundary modal | RESOLVED |
| BUG-3 | Brush size doesn't work | RESOLVED (unblocked by BUG-1) |
| BUG-4 | Arc tool UX is broken | RESOLVED |
| BUG-5 | Toolbar/palette tab not synced | RESOLVED |
| BUG-6 | Inspector position fields bypass collision | RESOLVED |
| BUG-7 | No zoom-out limit enforced | RESOLVED (already implemented) |
| BUG-8 | Scale bar has no label/tooltip | RESOLVED |
| BUG-9 | isPlacing blocks all canvas events | BY DESIGN |
| IMP-1 | Bold/italic keyboard shortcuts for labels | OPEN |
| IMP-2 | Label inspector → shadcn/ui | OPEN |
| IMP-3 | Multi-select plant batch editing | OPEN |
| IMP-4 | Consolidate all inspectors to shadcn/ui | OPEN |

---

## Bugs

### BUG-1: Terrain painting does nothing (RESOLVED)

**Symptom:** Clicking/dragging on canvas with terrain tool active produces no painted cells.

**Root cause:** `selectedTerrainTypeId` was `null` when users activated the terrain tool via toolbar button or keyboard shortcut (`B`) without first selecting a terrain swatch in the side palette. The paint handler silently skipped at `if (isTerrainTool && selectedTerrainTypeId)`.

**Fix (SidePalette.tsx):**
- Added `useEffect` that auto-selects `terrainTypes[0].id` when `activeTool === 'terrain'` and no type is selected.
- Combined with BUG-5 fix (palette tab now auto-syncs), the terrain swatches are visible immediately.

**Historical context:** Earlier investigation covered Konva hit detection, layer ordering, `hasFill()` behavior, and `hitFunc` workarounds — all of which were already correctly implemented before this fix. The core painting logic in `TerrainLayer.tsx` was never the issue.

---

### BUG-2: "Done" button doesn't close yard boundary modal (RESOLVED)

**Symptom:** The yard boundary placement banner stays on screen. Clicking "Done" has no effect even with 3+ vertices placed.

**Root cause:** The Konva stage's native `mousedown` handler was consuming the event before the HTML Done button's `click` could fire, because both occupied the same screen coordinates.

**Fix (YardBoundaryLayer.tsx):**
- Added `stopPropagation()` on both `onMouseDown` and `onClick` of the Done button.
- Added explicit `pointerEvents: 'auto'` to ensure the button is hittable above the canvas.
- Previous partial fix (disabled state for < 3 vertices) remains in place.

---

### BUG-3: Brush size doesn't work (RESOLVED — unblocked by BUG-1 fix)

**Symptom:** Changing brush size (1x1, 2x2, 3x3) has no visible effect.

**Assessment:** Implementation was already correct (`brushCells()` expands center cell to NxN). Was blocked only because painting itself didn't work. Resolved by BUG-1 fix. No code changes needed.

---

### BUG-4: Arc tool UX is broken and confusing (RESOLVED)

**Symptom:** When using the Arc tool, the red control square does not fixate on click. The interaction model is unclear — clicking does not anchor points, and dragging does not produce expected arc geometry. The tool feels non-functional.

**Root cause:** The arc tool was a stub that reused the structure tool's two-click placement, always creating `shape: 'straight'` structures with `arcSagitta: null`. No visual distinction from the structure tool existed.

**Fix (StructureLayer.tsx, SidePalette.tsx):**
- Implemented a 3-step workflow for the arc tool:
  1. Click to anchor start endpoint (blue dot appears)
  2. Click to anchor end endpoint (chord line + two blue dots)
  3. Move mouse to define arc curvature (sagitta), click to commit
- Arc tool now creates structures with `shape: 'curved'` and computed `arcSagitta`
- Curved structures render with arc outlines using `sampleArc()` instead of plain rectangles
- Live arc preview shown during curvature adjustment (step 3)
- Auto-selects first structure type when arc tool activates (palette syncs to Structures tab)

**Priority:** High — arc tool is now functional.

---

### BUG-5: Toolbar tool selection does not sync with side palette tab (RESOLVED)

**Symptom:** Switching the active tool in the top toolbar (e.g. selecting Plant, Structure, Terrain) does not update the corresponding tab in the left side palette. Keyboard shortcuts (P, S, B, etc.) also fail to switch the palette tab.

**Fix (SidePalette.tsx):**
- Added `TOOL_TO_TAB` mapping: `terrain→Terrain`, `plant→Plants`, `structure→Structures`, `path→Paths`.
- Added `useEffect` watching `activeTool` that auto-switches the palette tab when a mapped tool is selected.
- Non-palette tools (select, hand, arc, eraser, label, measurement) leave the tab unchanged.

---

### BUG-6: Inspector position fields cause collision/overlap bugs (RESOLVED)

**Symptom:** Editing X/Y position values directly in the inspector form can move elements into invalid positions that overlap or collide with other elements, bypassing the snap and collision systems.

**Fix (InspectorPanel.tsx):**
- Replaced editable X/Y position `<input>` fields with `ReadonlyField` display in both `PlantInspector` and `StructureInspector`.
- Position can now only be changed via canvas drag, which respects snap and collision rules.
- Terrain inspector already used read-only position display; no change needed there.

---

### BUG-7: No maximum zoom-out limit enforced (RESOLVED — already implemented)

**Symptom:** The user can zoom out indefinitely, making the canvas content tiny and unusable.

**Verification:** `clampZoom()` in `viewport.ts` enforces `[0.05, 10.0]`. All zoom paths in `useViewportStore` (`setZoom`, `setViewport`, `applyZoomTowardCursor`, `applyWheelZoom`) call `clampZoom()`. No fix needed — the limit was already correctly enforced.

---

### BUG-8: Scale bar has no label, no tooltip, and questionable precision (RESOLVED)

**Symptom:** The scale bar at the bottom of the canvas shows a line and a distance value (e.g. "5m") but has no label explaining what it represents. No tooltip on hover.

**Fix (ScaleBar.tsx):**
- Added "SCALE" label (uppercase, 9px, gray) above the bar.
- Added `title` attribute on the container: "Scale — shows real-world distance at current zoom level".
- Changed `pointerEvents` from `'none'` to `'auto'` so the tooltip renders on hover.
- Scale precision was verified correct — `pickScaleDistance()` selects appropriate distances for each zoom range.

---

### BUG-9: `isPlacing=true` blocks all canvas events (BY DESIGN)

When the user enters boundary placement mode (`isPlacing=true`), YardBoundaryLayer renders a full-canvas Konva Rect above TerrainLayer. All Konva `mousedown`/`click` events go to this Rect — terrain painting and other tools are impossible until placement mode exits.

This is by design: boundary placement needs exclusive pointer control. The YardBoundaryLayer now has `listening={selectToolActive}` which disables hit detection when non-select tools are active, mitigating the worst case. With BUG-2 fixed, the Done button reliably exits placement mode.

---

## Improvements (OPEN — not yet implemented)

### IMP-1: Label inspector — add keyboard shortcuts for bold/italic

**Current:** Bold and italic toggles are only available as checkboxes in the inspector panel. No keyboard shortcuts exist for text formatting.

**Requested:** When a label element is selected, support `Ctrl+B` (bold) and `Ctrl+I` (italic) keyboard shortcuts. These should only be active when a label is selected to avoid conflicts with other tool shortcuts.

---

### IMP-2: Label inspector UI — adopt component library (shadcn/ui)

**Current:** The label inspector uses plain HTML checkboxes and inputs with inconsistent styling compared to the rest of the UI.

**Requested:** Migrate the label inspector (and consolidate as a pattern for all inspector panels) to use shadcn/ui components with the existing theme. Bold/italic should use icon toggle buttons instead of checkboxes. Font size, color, alignment controls should follow standard design patterns (icon buttons, segmented controls, proper spacing).

---

### IMP-3: Multi-select plant inspector — batch editing for shared properties

**Current:** When selecting multiple plants, each must be edited individually (e.g. changing status from "planned" to "planted").

**Requested:** When multiple plants are selected, the inspector should show editable fields for properties that can logically be batch-edited (status, notes, layer). Properties that are per-element only (position X/Y) should be hidden from the multi-select inspector. Apply the same consolidation pattern from IMP-2 (shadcn/ui).

---

### IMP-4: Consolidate all inspector panels to shadcn/ui

**Current:** Inspector panels for different element types have inconsistent UI patterns (checkboxes, raw inputs, varying layouts).

**Requested:** Establish a single inspector UI pattern using shadcn/ui components. All element type inspectors (label, plant, structure, path, terrain, dimension) should share the same component library, spacing, and interaction patterns. This is a cross-cutting change that encompasses IMP-2 and IMP-3.
