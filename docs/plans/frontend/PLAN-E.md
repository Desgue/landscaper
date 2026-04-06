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
| **Status** | `todo` |
| **Started** | — |
| **Last updated** | 2026-04-06 |

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

## Phase E1 — Delivery [ ]

---

#### Feature: PNG Export [ ]

**Status:** `todo`
**Spec:** `docs/frontend/persistence-projects.md` → `## PNG Export`
**Also see:** `docs/frontend/canvas-viewport.md` (render layer order, scale bar)
**Load hint:** `grep -n "PNG\|offscreen\|1cm.*1px\|1920\|longest side\|scale bar\|chrome\|cost summary" docs/frontend/persistence-projects.md`

##### Tasks

- [ ] Implement `exportToPNG()`: create an offscreen `<canvas>` sized to `yardWidthCm × yardHeightCm` pixels with minimum 1920px on the longest side (scale up proportionally if smaller)
- [ ] Pass the offscreen canvas and a headless viewport (no UI chrome) to the existing PLAN-A render pipeline — render all visible elements in the correct layer order
- [ ] Render the scale bar (auto-adjusted for the export resolution) in the bottom area of the image
- [ ] Do NOT render: toolbar, palette panel, inspector panel, status bar, minimap, snap guides, selection UI, cost summary overlay
- [ ] Trigger browser file download of the PNG
- [ ] Replace the stub created in PLAN-A with this functional implementation

---

#### Feature: Minimap [ ]

**Status:** `todo`
**Spec:** `docs/frontend/visual-design.md` → `## Minimap`
**Also see:** `docs/frontend/canvas-viewport.md` (viewport state)
**Load hint:** `grep -n "minimap\|Minimap\|bottom.right\|viewport rect\|click.*pan\|drag.*pan" docs/frontend/visual-design.md`

##### Tasks

- [ ] Replace the PLAN-A stub with a functional minimap rendered in the bottom-right corner
- [ ] Minimap renders the full yard extent at a fixed small size (fit-to-minimap scale)
- [ ] Draw a viewport indicator rectangle on the minimap representing the current pan/zoom state
- [ ] Click on minimap: pan the main canvas so the clicked world point is centered
- [ ] Drag on minimap: continuous pan of the main canvas
- [ ] Double-click minimap: triggers fit-to-view (same behavior as Ctrl+Shift+1 — centers and scales to show all elements with padding)
- [ ] Minimap updates in real time as user pans/zooms the main canvas

---

#### Feature: Visual Polish [ ]

**Status:** `todo`
**Spec:** `docs/frontend/visual-design.md` — full file
**Load hint:** `grep -n "^## \|color\|Color\|#1971\|font\|Font\|status bar\|scale bar\|icon\|dark mode\|texture" docs/frontend/visual-design.md`

##### Tasks

- [ ] Audit all UI element colors against visual-design.md palette: blue accent `#1971c2`, gray UI tones, light canvas background — fix any deviations
- [ ] Audit typography: verify font sizes, weights, and families for toolbar, palette, inspector, labels, tooltips against spec
- [ ] Audit icon styles: verify all tool icons and UI icons match visual-design.md
- [ ] Implement status bar content: cursor world coordinates (m, cm precision), current zoom percentage, snap on/off indicator, grid visibility on/off indicator — all update in real time (canvas-viewport.md § Status Bar)
- [ ] Confirm light theme only (dark mode is explicitly deferred per spec — do not implement)
- [ ] Confirm terrain uses solid colors only (textures are explicitly deferred — do not implement)
- [ ] Verify scale bar renders correctly at all zoom levels (auto-adjusts displayed distance)

---

#### Feature: Keyboard Shortcut Audit [ ]

**Status:** `todo`
**Spec:** `docs/frontend/keyboard-shortcuts.md` — full file (this is an audit, read the whole file)
**Load hint:** Read the entire file: `grep -n "." docs/frontend/keyboard-shortcuts.md`

##### Tasks

- [ ] Test every tool shortcut: V (select), H (pan), B (terrain), P (plant), S (structure), A (arc), E (eraser), T (label), M (measurement)
- [ ] Test navigation: Space+drag pan, middle-click+drag pan, scroll-wheel zoom, pinch-zoom
- [ ] Test selection modifiers: Shift+click multi-select, Tab cycling, box-select, Shift+box for partial
- [ ] Test manipulation: Delete/Backspace, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Shift+Z
- [ ] Test group shortcuts: Ctrl+Shift+G (group), Ctrl+Shift+U (ungroup)
- [ ] Test toggles: Ctrl+G (snap toggle), Ctrl+' (grid toggle) — verify they are independent
- [ ] Test Alt modifier behavior for each tool: placement tools (Alt disables snap), move (Alt enables snap), labels/measurement (Alt enables snap)
- [ ] File a blocker for any shortcut that is unwired or behaves incorrectly, naming the responsible plan

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | PNG export reuses PLAN-A render pipeline with headless canvas | Avoids a second renderer; ensures PNG and canvas output are always in sync |

---

## Agent Log

```
2026-04-06 — PLAN-E initialized. Waiting on PLAN-A, PLAN-B, PLAN-C, PLAN-D completion before starting.
```
