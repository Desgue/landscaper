# PLAN-E — Delivery

> **AI-First Living Document.** Read `## Agent Protocol` before every session.
> This is the integration and finisher plan. All prior plans (A, B, C, D) must be `done` before starting.
> Covers PNG export, minimap, visual polish, and full keyboard shortcut audit.

---

## Agent Protocol

### Reading This Plan

1. **Verify PLAN-A, PLAN-B, PLAN-C, and PLAN-D are all done** before starting any task here.
2. **This plan does not own features — it owns quality.** Do not re-implement what earlier plans built. Audit, integrate, and finalize.
3. **PNG export re-uses the render pipeline from PLAN-A.** Do not build a second renderer. Pass a headless canvas to the existing render loop with a different viewport and no UI chrome.
4. **Shortcut audit is a verification task, not a wiring task.** If you find an unwired shortcut, file it as a blocker for the responsible plan, then re-check after it is fixed.

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
| **Plan ID** | `PLAN-E` |
| **Title** | Delivery |
| **Scope** | PNG export (functional render) · minimap · visual design audit · keyboard shortcut audit |
| **Depends on** | PLAN-A, PLAN-B, PLAN-C, PLAN-D (all blocking) |
| **Unblocks** | Nothing — this is the final plan |
| **Status** | `done` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |

---

## Context Map

```bash
# PNG export rules (1cm=1px, min size, what to include/exclude):
grep -n "PNG\|1cm\|1920\|scale bar\|chrome\|offscreen\|visible" docs/frontend/persistence-projects.md

# Minimap spec (position, viewport rect, click-to-pan):
grep -n "minimap\|Minimap\|bottom.right\|viewport.*rect\|click.*pan" docs/frontend/visual-design.md

# Scale bar auto-adjust rules:
grep -n "scale bar\|Scale Bar\|auto.adjust\|zoom" docs/frontend/visual-design.md

# Color tokens and layout measurements:
grep -n "#1971\|color\|Color\|font\|Font\|toolbar\|palette\|inspector\|status bar" docs/frontend/visual-design.md

# Complete shortcut reference:
grep -n "." docs/frontend/keyboard-shortcuts.md   # read the whole file — it's the audit target
```

| Doc | Owns | When to load |
|-----|------|-------------|
| `docs/frontend/persistence-projects.md` | PNG export rules, resolution, what's included/excluded | Full read for PNG export tasks |
| `docs/frontend/visual-design.md` | All UI design tokens, minimap spec, layout, scale bar | Full read for polish tasks |
| `docs/frontend/keyboard-shortcuts.md` | Every shortcut in the app (SSoT) | Full read for audit task |
| `docs/frontend/canvas-viewport.md` | Render layer order, scale bar behavior | `grep -n "render layer\|scale bar\|Render" docs/frontend/canvas-viewport.md` |

---

## Phase E1 — Delivery [x]

---

#### Feature: PNG Export [x]

**Status:** `done`
**Spec:** `docs/frontend/persistence-projects.md` → `## PNG Export`
**Also see:** `docs/frontend/canvas-viewport.md` (render layer order, scale bar)
**Load hint:** `grep -n "PNG\|offscreen\|1cm.*1px\|1920\|longest side\|scale bar\|chrome\|cost summary" docs/frontend/persistence-projects.md`

##### Tasks

- [x] Implement `exportToPNG()`: create an offscreen `<canvas>` sized to `yardWidthCm × yardHeightCm` pixels with minimum 1920px on the longest side (scale up proportionally if smaller) — done 2026-04-07
- [x] Pass the offscreen canvas and a headless viewport (no UI chrome) to the existing PLAN-A render pipeline — render all visible elements in the correct layer order — done 2026-04-07
- [x] Render the scale bar (auto-adjusted for the export resolution) in the bottom area of the image — done 2026-04-07
- [x] Do NOT render: toolbar, palette panel, inspector panel, status bar, minimap, snap guides, selection UI, cost summary overlay — done 2026-04-07
- [x] Trigger browser file download of the PNG — done 2026-04-07
- [x] Replace the stub created in PLAN-A with this functional implementation — done 2026-04-07

---

#### Feature: Minimap [x]

**Status:** `done`
**Spec:** `docs/frontend/visual-design.md` → `## Minimap`
**Also see:** `docs/frontend/canvas-viewport.md` (viewport state)
**Load hint:** `grep -n "minimap\|Minimap\|bottom.right\|viewport rect\|click.*pan\|drag.*pan" docs/frontend/visual-design.md`

##### Tasks

- [x] Replace the PLAN-A stub with a functional minimap rendered in the bottom-right corner — done 2026-04-07
- [x] Minimap renders the full yard extent at a fixed small size (fit-to-minimap scale) — done 2026-04-07
- [x] Draw a viewport indicator rectangle on the minimap representing the current pan/zoom state — done 2026-04-07
- [x] Click on minimap: pan the main canvas so the clicked world point is centered — done 2026-04-07
- [x] Drag on minimap: continuous pan of the main canvas — done 2026-04-07
- [x] Double-click minimap: triggers fit-to-view (same behavior as Ctrl+Shift+1 — centers and scales to show all elements with padding) — done 2026-04-07
- [x] Minimap updates in real time as user pans/zooms the main canvas — done 2026-04-07

---

#### Feature: Visual Polish [x]

**Status:** `done`
**Spec:** `docs/frontend/visual-design.md` — full file
**Load hint:** `grep -n "^## \|color\|Color\|#1971\|font\|Font\|status bar\|scale bar\|icon\|dark mode\|texture" docs/frontend/visual-design.md`

##### Tasks

- [x] Audit all UI element colors against visual-design.md palette: blue accent `#1971c2`, gray UI tones, light canvas background — fix any deviations — done 2026-04-07
- [x] Audit typography: verify font sizes, weights, and families for toolbar, palette, inspector, labels, tooltips against spec — done 2026-04-07
- [x] Audit icon styles: verify all tool icons and UI icons match visual-design.md — done 2026-04-07
- [x] Implement status bar content: cursor world coordinates (m, cm precision), current zoom percentage, snap on/off indicator, grid visibility on/off indicator — all update in real time (canvas-viewport.md § Status Bar) — done 2026-04-07
- [x] Confirm light theme only (dark mode is explicitly deferred per spec — do not implement) — done 2026-04-07
- [x] Confirm terrain uses solid colors only (textures are explicitly deferred — do not implement) — done 2026-04-07
- [x] Verify scale bar renders correctly at all zoom levels (auto-adjusts displayed distance) — done 2026-04-07

---

#### Feature: Keyboard Shortcut Audit [x]

**Status:** `done`
**Spec:** `docs/frontend/keyboard-shortcuts.md` — full file (this is an audit, read the whole file)
**Load hint:** Read the entire file: `grep -n "." docs/frontend/keyboard-shortcuts.md`

##### Tasks

- [x] Test every tool shortcut: V (select), H (pan), B (terrain), P (plant), S (structure), A (arc), E (eraser), T (label), M (measurement) — done 2026-04-07
- [x] Test navigation: Space+drag pan, middle-click+drag pan, scroll-wheel zoom, pinch-zoom — done 2026-04-07
- [x] Test selection modifiers: Shift+click multi-select, Tab cycling, box-select, Shift+box for partial — done 2026-04-07
- [x] Test manipulation: Delete/Backspace, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Shift+Z — done 2026-04-07
- [x] Test group shortcuts: Ctrl+Shift+G (group), Ctrl+Shift+U (ungroup) — done 2026-04-07
- [x] Test toggles: Ctrl+G (snap toggle), Ctrl+' (grid toggle) — verify they are independent — done 2026-04-07
- [x] Test Alt modifier behavior for each tool: placement tools (Alt disables snap), move (Alt enables snap), labels/measurement (Alt enables snap) — done 2026-04-07
- [x] File a blocker for any shortcut that is unwired or behaves incorrectly, naming the responsible plan — done 2026-04-07 (no blockers found, all shortcuts properly wired)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | PNG export reuses PLAN-A render pipeline with headless canvas | Avoids a second renderer; ensures PNG and canvas output are always in sync |
| 2026-04-07 | Scale bar composited onto PNG via offscreen canvas post-export | ScaleBar is a DOM element outside Konva stage; compositing it after stage.toDataURL() ensures it appears in the export |
| 2026-04-07 | Minimap uses HTML5 Canvas (not Konva Stage) for performance | A lightweight 160x120 canvas is more efficient than a second Konva stage for a simple overview |
| 2026-04-07 | Cursor tracking throttled via rAF gating | Prevents 60fps Zustand set() calls and layout reflows from getBoundingClientRect() on every mousemove |

---

## Agent Log

```
2026-04-06 — PLAN-E initialized. Waiting on PLAN-A, PLAN-B, PLAN-C, PLAN-D completion before starting.
2026-04-07 — Phase E1 implemented: PNG export (with scale bar compositing), functional minimap (HTML5 canvas, click/drag/double-click), status bar cursor coordinates (rAF-throttled), zoom +/- buttons, keyboard shortcut audit (all shortcuts verified wired). Code review, doc sync review, and security audit all passed unanimously.
```
