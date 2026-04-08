# ENG-23 — Phase 3 Deliverable: Wireframes, Migration Strategy, and BAU Impact Assessment

| Field | Value |
|-------|-------|
| **Plan ID** | `ENG-23` |
| **Title** | Wireframes, Migration Strategy, and BAU Impact Assessment |
| **Scope** | Low-fidelity annotated wireframes for three application modes; phased migration strategy for token adoption and canvas color migration; BAU impact classification for all affected backlog items. |
| **Status** | `planned` |
| **Created** | 2026-04-08 |
| **Inputs** | ENG-21 (competitor audit, visual identity, token system), ENG-22 (ADR 1–4: layout-mode store, shadcn/ui, dark mode deferral, mobile strategy) |

---

## Part 1: Layout Wireframes

### Reading Guide

All wireframes use ASCII art at a fixed terminal width of 80 characters per panel. Annotations appear directly below each wireframe and reference:
- Pixel dimensions (height, width)
- Token names from the `--ls-` system defined in ENG-21 Part 3 Section 1
- Behavior notes from ADR decisions in ENG-22

---

### 1.1 Blueprint Mode (Dense CAD Layout)

Blueprint mode is the primary design surface. All panels visible. Status bar always present. Chrome density is high by design — this is where professional landscapers spend 80% of their session time.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TOPBAR  h=48px  bg=--ls-surface-toolbar (#2b3a4a)                          ║
║                                                                              ║
║  [≡]  Landscaper    [ Blueprint │ Generate │ Garden ]    [?] [⚙] [avatar]   ║
║  ↑                  ↑────────────────────────────                            ║
║  Logo 32px          Mode switcher — center-aligned, shadcn Tabs              ║
║  icon               Active tab: --ls-surface-toolbar-active                  ║
║                     Inactive tab: --ls-text-on-dark-secondary               ║
║  Tool groups (left-aligned, after logo):                                     ║
║  [↖] [✋] │ [✏] [⬟] [🌿] [⌒] │ [⬡] [─] │ [🗑] [↺] [↻]                    ║
║  ↑        ↑                   ↑          ↑                                   ║
║  Select   Draw group          Annotate   Modify group                        ║
║  Pan      20px icons          group      1px dividers between groups         ║
║           1.5px stroke                   --ls-border-strong on toolbar bg    ║
╠══╦══════════════════════════════════════════════════════════╦════════════════╣
║  ║                                                          ║                ║
║S ║                                                          ║ INSPECTOR      ║
║I ║                  CANVAS                                  ║ PANEL          ║
║D ║                                                          ║ w=280px        ║
║E ║   bg=--ls-surface-canvas (#ffffff)                       ║ bg=--ls-       ║
║  ║   Grid: major lines, 1px --ls-border-subtle              ║ surface-panel  ║
║P ║   Coordinate origin at center                            ║ (#f7f5f2)      ║
║A ║                                                          ║                ║
║L ║                                                          ║ ┌────────────┐ ║
║E ║                                         ┌─────────────┐  ║ │ POSITION   │ ║
║T ║                                         │  MINIMAP    │  ║ │ ──────────│ ║
║T ║                                         │  120×90px   │  ║ │ X  [──]   │ ║
║E ║                                         │  visible by │  ║ │ Y  [──]   │ ║
║  ║                                         │  default    │  ║ └────────────┘ ║
║w ║                                         │ --ls-surface│  ║ ┌────────────┐ ║
║= ║                                         │ -statusbar  │  ║ │ PLANT INFO │ ║
║2 ║                                         │ bg, 60%     │  ║ │ ──────────│ ║
║5 ║                                         │ opacity     │  ║ │ Type [──] │ ║
║6 ║                                         └─────────────┘  ║ │ Status[──]│ ║
║p ║                                                          ║ │ Cost  [──]│ ║
║x ║                                                          ║ └────────────┘ ║
║  ║                                                          ║                ║
╠══╩══════════════════════════════════════════════════════════╩════════════════╣
║  STATUSBAR  h=28px  bg=--ls-surface-statusbar (#1e2a38)                     ║
║  [100%]  [X: 12.4m  Y: 8.2m]  [Layer: Plants]  [Snap: ON]  [47 elements]  ║
║  ↑mono   ↑mono tabular-nums   ↑                ↑           ↑               ║
║  --ls-font-mono at --ls-text-2xs, color=--ls-text-on-dark-secondary         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**SIDE PALETTE detail (left column, w=256px):**

```
╔═════════════════════╗
║ SIDE PALETTE w=256px║
║ bg=--ls-surface-    ║
║    panel (#f7f5f2)  ║
║ ─────────────────── ║
║ [Plants] [Structures]  ←── shadcn Tabs, --ls-text-sm 12px
║  active=--ls-color- ║
║  interactive        ║
║  border-b 2px       ║
║ ─────────────────── ║
║ [🔍 Search...]      ║
║   input h=32px      ║
║   shadcn Input      ║
║ ─────────────────── ║
║ VEGETABLES          ║  ←── ALL CAPS, --ls-text-xs, --ls-tracking-wide
║   [🌿] Tomato       ║       --ls-text-tertiary color
║   [🌿] Pepper       ║
║   [🌿] Zucchini     ║
║ ─────────────────── ║
║ HERBS               ║
║   [🌿] Basil        ║
║   [🌿] Rosemary     ║
║ ─────────────────── ║
║ TREES               ║
║   [🌳] Oak          ║
║   [🌳] Maple        ║
╚═════════════════════╝
```

**Annotations — Blueprint Mode:**

| Element | Dimension | Token | Behavior |
|---------|-----------|-------|----------|
| TopToolbar | h=48px | `--ls-surface-toolbar` | Dark bg; icon-only tools at 20px; grouped with `--ls-border-strong` 1px dividers |
| Mode Switcher | h=32px, centered | `--ls-surface-toolbar-active` (active), `--ls-text-on-dark-secondary` (inactive) | Dispatches to `useLayoutStore` on click; no route change (ADR 1) |
| SidePalette | w=256px | `--ls-surface-panel` | Widened from 240px per ENG-21; shadcn Tabs for category headers; ALL CAPS section labels |
| InspectorPanel | w=280px | `--ls-surface-panel` | Accordion sections; shadcn form primitives; monospace for coordinate/cost values |
| Canvas | flex-1 | `--ls-surface-canvas` | Grid always visible at Blueprint zoom levels; PixiJS WebGL renderer |
| Minimap | 120×90px, bottom-right of canvas | `--ls-surface-statusbar` at 60% opacity | Default visible; collapse toggle in toolbar |
| StatusBar | h=28px | `--ls-surface-statusbar` | Always present in Blueprint mode; all data values in `--ls-font-mono` |

---

### 1.2 Generate Mode (Minimal Chrome)

Generate mode is triggered from Blueprint via the mode switcher. The generated image is the primary object. All non-essential chrome recedes. The canvas never unmounts — PixiJS is preserved across the transition (ADR 1 consequence).

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TOPBAR  h=40px  (collapsed, reduced from 48px)                             ║
║  bg=--ls-surface-toolbar (#2b3a4a)                                          ║
║                                                                              ║
║  [≡]  Landscaper    [ Blueprint │ Generate │ Garden ]    [?]               ║
║                      ↑ same switcher, Generate active                        ║
║  Icon-only tools (minimal — select, pan, undo only):                        ║
║  [↖] [✋] │ [↺]                                                             ║
║  ↑ Only   ↑ Reduced to 3 tools; draw/annotate group hidden                  ║
╠══╦══════════════════════════════════════════════════════════╦════════════════╣
║  ║                                                          ║ GENERATE       ║
║  ║                                                          ║ OPTIONS        ║
║  ║              CANVAS (full bleed)                         ║ PANEL          ║
║  ║                                                          ║ w=280px        ║
║  ║   Generated image fills this area.                       ║ bg=#ffffff     ║
║  ║   bg=--ls-surface-canvas-overflow during load            ║ (no tint —     ║
║  ║                                                          ║  clean white)  ║
║  ║   Loading state: skeleton overlay (pulsing               ║                ║
║  ║   --ls-surface-panel-header) — not a full spinner.       ║ Style [──────] ║
║  ║                                                          ║ Season[──────] ║
║  ║   ┌────────────────────────────────────────────────┐     ║ Light [──────] ║
║  ║   │  [Generated image or skeleton placeholder]     │     ║                ║
║  ║   │                                                │     ║ Aspect         ║
║  ║   │                                                │     ║ [16:9 ▼]       ║
║  ║   │                                                │     ║                ║
║  ║   └────────────────────────────────────────────────┘     ║ Emphasis       ║
║  ║                                                          ║ [Plants ▼]     ║
║  ║                                                          ║                ║
║  ║                                                          ║                ║
║  ║                                                          ║                ║
║  ║                                          ┌────────────┐  ║                ║
║  ║                                          │  GENERATE  │  ║                ║
║  ║                                          │  ━━━━━━━━━ │  ║                ║
║  ║                                          │ CTA button │  ║                ║
║  ║                                          │ fixed b-r  │  ║                ║
║  ║                                          │ amber CTA  │  ║                ║
║  ║                                          └────────────┘  ║                ║
║  ║                                          ↑                ║                ║
║  ║                                 position:fixed            ║                ║
║  ║                                 bottom:24px right:24px    ║                ║
║  ║                                 (outside right panel)     ║                ║
╠══╩══════════════════════════════════════════════════════════╩════════════════╣
║  STATUS BAR: HIDDEN in Generate mode                                         ║
║  (--ls-surface-statusbar not rendered; store.statusBarVisible = false)       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**SidePalette state in Generate mode:**

```
╔══════╗
║  ↖   ║  ←── SidePalette collapsed to 40px icon rail
║  ─── ║       Only category icons visible, no labels
║  🌿  ║       Hover: tooltip with category name
║  ─── ║       (--ls-surface-tooltip bg, --ls-text-on-dark text)
║  ⬟   ║
║  ─── ║
║  🌳  ║
╚══════╝
w=40px
```

**Generate button (amber CTA):**

```
┌──────────────────┐
│                  │
│    Generate      │
│                  │
└──────────────────┘
bg=--ls-color-cta (#f5a623 = --ls-amber-400)
color=--ls-color-cta-text (#ffffff)
h=44px, w=160px, border-radius=8px
font=--ls-font-ui, --ls-text-md, --ls-weight-semibold
position: fixed, bottom: 24px, right: 24px
On request: label → "Generating...", pulse animation, disabled state
```

**Annotations — Generate Mode:**

| Element | Dimension | Token | Behavior |
|---------|-----------|-------|----------|
| TopToolbar | h=40px (collapsed from 48px) | `--ls-surface-toolbar` | Reduced to 3 tools only; labels removed; same dark bg |
| SidePalette | w=40px icon rail | `--ls-surface-toolbar` | Category icons only; hover tooltip; clicking icon expands panel temporarily |
| Generate Options | w=280px, white bg | `#ffffff` (clean, no panel tint) | Replaces InspectorPanel in this mode; shadcn Select/Slider components |
| Canvas | flex-1 | `--ls-surface-canvas-overflow` during loading | PixiJS canvas is preserved — never unmounted during mode switch |
| Generate Button | h=44px, w=160px, fixed | `--ls-color-cta` | Amber CTA; position fixed bottom-right; one per context |
| Status Bar | hidden | — | `useLayoutStore.statusBarVisible = false` in generate mode |
| Error Toast | h=auto, bottom-center | inline | Not a modal; `useLayoutStore` dispatches to toast queue |

---

### 1.3 Garden Management Mode (Content-First Layout)

Garden Management mode is for journal review, plant tracking, cost summary, and project health. Content is the primary object. Chrome supports navigation and reading, not tool use. Left nav replaces the tool palette. The canvas is demoted to a miniature overview or hidden entirely.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TOPBAR (simplified)  h=40px  bg=--ls-surface-toolbar                       ║
║                                                                              ║
║  [≡]  Projects / My Garden Project    [ Blueprint │ Generate │ Garden ]     ║
║       ↑────────────────────────────── ↑                                      ║
║       Breadcrumb navigation            Mode switcher (same component)        ║
║       --ls-text-on-dark-secondary      No tool icons — top bar is nav only   ║
║       --ls-text-sm 12px                                                      ║
╠════════════════════╦═════════════════════════════════════════════════════════╣
║ LEFT NAV  w=220px  ║                                                         ║
║ bg=--ls-surface-   ║  CONTENT AREA                                           ║
║    panel (#f7f5f2) ║                                                         ║
║                    ║  bg=--ls-surface-canvas (white — content reads on       ║
║ [Project Name]     ║  the same white surface as the journal entries)         ║
║ Last updated: 3/1  ║                                                         ║
║ ────────────────   ║  JOURNAL VIEW (default in Garden mode):                 ║
║ [📅] Timeline      ║  ┌─────────────────────────────────────────────────┐   ║
║ [🌿] Plants        ║  │  March 2026                                      │   ║
║ [💰] Cost Summary  ║  │  ────────────────────────────────────────────── │   ║
║ [📓] Journal       ║  │                                                  │   ║
║ ────────────────   ║  │  Mar 15 — Site Visit                             │   ║
║                    ║  │  ──────────────────────                          │   ║
║ CANVAS OVERVIEW    ║  │  Installed 6 tomato seedlings in bed C.          │   ║
║ ┌──────────────┐   ║  │  Weather: 18°C, partly cloudy.                   │   ║
║ │  [miniature] │   ║  │  [Photo thumbnail] [Photo thumbnail]             │   ║
║ │   yard map   │   ║  │                                                  │   ║
║ │  112×84px    │   ║  │  Mar 10 — Plant Delivery                         │   ║
║ │  read-only   │   ║  │  ──────────────────────                          │   ║
║ └──────────────┘   ║  │  Received 12 pepper plants from nursery.         │   ║
║                    ║  │                                                  │   ║
║ [→ Open in         ║  └─────────────────────────────────────────────────┘   ║
║    Blueprint]      ║                                                         ║
╠════════════════════╩══════════════════════════════════════╦══════════════════╣
║ STATUS BAR  h=28px  bg=--ls-surface-statusbar             ║ Right panel:     ║
║ [47 plants] [Total cost: $3,840] [Last saved: 2m ago]     ║ appears only     ║
║ ↑ project stats, not canvas coords                        ║ when a specific  ║
║                                                           ║ plant/entry is   ║
║                                                           ║ selected from    ║
║                                                           ║ the left nav     ║
╚═══════════════════════════════════════════════════════════╩══════════════════╝
```

**Left Nav tab states:**

```
╔════════════════════╗
║ LEFT NAV  w=220px  ║
║ ────────────────── ║
║ [📅] Timeline      ║  ←── Tab item: 14px Inter medium, h=40px, px=12px
║ ─── active state ─ ║       active: --ls-color-interactive-subtle bg
║ [🌿] Plants   ●   ║       (--ls-brand-100), --ls-color-interactive text
║ [💰] Costs         ║       inactive: transparent bg, --ls-text-secondary
║ [📓] Journal       ║       left border 3px --ls-color-interactive on active
╚════════════════════╝
```

**Record detail panel (conditional right panel):**

```
╔════════════════════╗
║ RECORD DETAIL      ║
║ w=280px (same as   ║
║ InspectorPanel)    ║
║ bg=--ls-surface-   ║
║    panel           ║
║ ────────────────── ║
║ Tomato (Gardener's ║
║ Delight)           ║
║ ────────────────── ║
║ STATUS             ║  ←── ALL CAPS, --ls-text-xs
║ [Planted ▼]        ║       shadcn Select
║                    ║
║ PLANTED DATE       ║
║ [Mar 15, 2026]     ║
║                    ║
║ NOTES              ║
║ [textarea...]      ║
║                    ║
║ [Save changes]     ║
╚════════════════════╝
```

**Annotations — Garden Management Mode:**

| Element | Dimension | Token | Behavior |
|---------|-----------|-------|----------|
| TopToolbar | h=40px | `--ls-surface-toolbar` | Breadcrumb + mode switcher only; no tool icons |
| Left Nav | w=220px | `--ls-surface-panel` | Replaces SidePalette; tab items at 40px height; active left-border accent |
| Canvas Overview | 112×84px (in left nav) | `--ls-surface-panel` bg | Read-only miniature; "Open in Blueprint" link dispatches mode store |
| Content Area | flex-1 | `--ls-surface-canvas` | Journal/list content reads on white; typography at `--ls-text-base` 13px, `--ls-leading-relaxed` 1.6 |
| Right Panel | w=280px (conditional) | `--ls-surface-panel` | Only rendered when `layoutStore.gardenDetailRecord !== null` |
| Status Bar | h=28px | `--ls-surface-statusbar` | Shows project stats, not canvas coordinates |

---

## Part 2: Migration Strategy

### 2.1 Guiding Principles

The migration follows three inviolable constraints derived from ADR 1–4 (ENG-22):

1. **No broken intermediate state.** Each phase must leave the application in a working, deployable state. Hardcoded colors may coexist with tokens during the transition; the risk is visual inconsistency, not breakage.

2. **CSS tokens do not auto-propagate to PixiJS.** The PixiJS canvas renders via WebGL into a `<canvas>` element. CSS custom properties are not accessible inside WebGL draw calls. Every canvas color that should follow the token system must be explicitly read from the computed style at initialization and passed into the renderer. This is non-optional and must be addressed in Phase 4, not retroactively.

3. **shadcn components are additive.** The migration installs shadcn component files into `src/components/ui/` and replaces raw HTML elements one at a time. Existing raw Tailwind can coexist with shadcn components during the migration; the team replaces components incrementally, validates, and continues.

---

### 2.2 Complete Hardcoded Color Inventory

#### React Component Layer

**`src/components/TopToolbar.tsx`**

| Location | Value | Replace With |
|----------|-------|-------------|
| Line 25 — `ACCENT = '#1971c2'` | `#1971c2` | `--ls-color-interactive` |
| Line 26 — `ACCENT_BG = '#e8f0fb'` | `#e8f0fb` | `--ls-color-interactive-subtle` |
| Tooltip bg | `#1f2937` | `--ls-surface-tooltip` |
| Generate button | `#E8A838` | `--ls-color-cta` |
| Inactive tool | `#374151` | `--ls-text-on-dark-secondary` |

**`src/components/SidePalette.tsx`**

| Location | Value | Replace With |
|----------|-------|-------------|
| Tab active state (×4) | `#1971c2` | `--ls-color-interactive` |
| Selection border (×4) | `#1971c2` | `--ls-color-interactive-border` |
| Active tab bg | `#e8f0fb` | `--ls-color-interactive-subtle` |
| Inline `PLANT_COLORS` map | hardcoded hex values | Extract to `src/tokens/plantColors.ts`; values feed both CSS and canvas |
| Inline `STRUCTURE_CATEGORY_COLORS` map | hardcoded hex values | Extract to `src/tokens/structureColors.ts` |

**`src/components/InspectorPanel.tsx`**

| Location | Value | Replace With |
|----------|-------|-------------|
| Template literal `bg-blue-50 border-blue-300 text-blue-700` | Tailwind color classes | Replace element with shadcn `Alert` component using `--ls-color-interactive-subtle` bg |

#### PixiJS Canvas Layer

The PixiJS canvas does not read CSS custom properties. The following values are in TypeScript files that call PixiJS drawing APIs directly. CSS tokens cannot be applied via className or style attributes here.

**`src/canvas-pixi/DimensionRenderer.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Line 209 | `#1976d2` | Dimension line color |

**`src/canvas-pixi/PlantRenderer.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Lines 56–60 | Status colors: planned / planted / growing / harvested / removed | Plant lifecycle status indicator overlay |

**`src/canvas-pixi/BoundaryRenderer.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Line 37 — `LABEL_COLOR = '#1971c2'` | `#1971c2` | Boundary label text color |

**`src/canvas-pixi/LabelRenderer.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Line 33 — `DEFAULT_FONT_COLOR = '#333333'` | `#333333` | Default canvas text label color |

**`src/canvas-pixi/CanvasHost.tsx`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Line 119 — `background: '#f5f5f0'` | `#f5f5f0` | PixiJS application background (staging area overflow) |

**`src/canvas-pixi/textures/PlantSprites.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Lines 23–28 — category colors | vegetable / herb / fruit / flower / tree / shrub hex values | Plant category fill colors in sprite rendering |

**`src/canvas-pixi/textures/StructureSprites.ts`**

| Location | Value | Semantic meaning |
|----------|-------|-----------------|
| Line 195 | soil color | Ground/soil texture fill |
| Lines 314–315 | texture colors | Structure surface texture rendering |

---

### 2.3 Bridging CSS Tokens into PixiJS

WebGL renderers call drawing APIs with explicit color arguments (`graphics.fill()`, `graphics.stroke()`, `Sprite.tint`). These calls use JavaScript values — they have no access to the document's CSS computed style.

The bridge pattern reads CSS custom property values from the document at application initialization and stores them in a typed JavaScript object that PixiJS renderers import:

```typescript
// src/tokens/canvasTokens.ts
// Reads --ls-* CSS custom properties at runtime and exposes them as typed JS.
// Called ONCE in CanvasHost.tsx after the document is ready.
// Passed as a prop or singleton to all PixiJS renderer classes.

export interface CanvasTokens {
  colorInteractive: number;        // replaces #1971c2 in BoundaryRenderer, DimensionRenderer
  colorInteractiveSubtle: number;  // replaces #e8f0fb usage
  surfaceCanvasOverflow: number;   // replaces #f5f5f0 in CanvasHost background
  textPrimary: number;             // replaces #333333 in LabelRenderer
  plantColors: {
    vegetable: number;
    herb: number;
    fruit: number;
    flower: number;
    tree: number;
    shrub: number;
  };
  plantStatusColors: {
    planned: number;
    planted: number;
    growing: number;
    harvested: number;
    removed: number;
  };
  structureColors: {
    soil: number;
    texture: number;
  };
}

function cssColorToPixi(cssVarName: string): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();
  // Converts #rrggbb hex to PixiJS 0xRRGGBB integer
  return parseInt(raw.replace('#', '0x'), 16);
}

export function buildCanvasTokens(): CanvasTokens {
  return {
    colorInteractive:       cssColorToPixi('--ls-color-interactive'),
    colorInteractiveSubtle: cssColorToPixi('--ls-color-interactive-subtle'),
    surfaceCanvasOverflow:  cssColorToPixi('--ls-surface-canvas-overflow'),
    textPrimary:            cssColorToPixi('--ls-text-primary'),
    plantColors: {
      vegetable: cssColorToPixi('--ls-plant-vegetable'),
      herb:      cssColorToPixi('--ls-plant-herb'),
      fruit:     cssColorToPixi('--ls-plant-fruit'),
      flower:    cssColorToPixi('--ls-plant-flower'),
      tree:      cssColorToPixi('--ls-plant-tree'),
      shrub:     cssColorToPixi('--ls-plant-shrub'),
    },
    plantStatusColors: {
      planned:   cssColorToPixi('--ls-plant-status-planned'),
      planted:   cssColorToPixi('--ls-plant-status-planted'),
      growing:   cssColorToPixi('--ls-plant-status-growing'),
      harvested: cssColorToPixi('--ls-plant-status-harvested'),
      removed:   cssColorToPixi('--ls-plant-status-removed'),
    },
    structureColors: {
      soil:    cssColorToPixi('--ls-structure-soil'),
      texture: cssColorToPixi('--ls-structure-texture'),
    },
  };
}
```

The plant and structure category colors need corresponding CSS custom property entries in the token file. These extend the ENG-21 token set:

```css
/* src/styles/globals.css — extend :root block */
:root {
  /* Canvas-only tokens — not used in HTML/CSS components, only read by buildCanvasTokens() */
  --ls-plant-vegetable:       #7cb87a;
  --ls-plant-herb:            #a8c5a0;
  --ls-plant-fruit:           #e8a87c;
  --ls-plant-flower:          #c98bb8;
  --ls-plant-tree:            #4a8c6a;
  --ls-plant-shrub:           #6aa87a;

  --ls-plant-status-planned:  #94a3b8;   /* slate-400 — neutral, not yet started */
  --ls-plant-status-planted:  #60a854;   /* --ls-garden-400 — active, in ground */
  --ls-plant-status-growing:  #3d8b30;   /* --ls-garden-500 — thriving */
  --ls-plant-status-harvested:#f5a623;   /* --ls-amber-400 — complete cycle */
  --ls-plant-status-removed:  #c0392b;   /* --ls-color-destructive — removed */

  --ls-structure-soil:        #c4a882;   /* warm sandy soil */
  --ls-structure-texture:     #b8a090;   /* structure surface texture tone */
}
```

**Token reading call site in `CanvasHost.tsx`:**

`buildCanvasTokens()` is called once after the PixiJS Application is created and before renderers are initialized. The returned object is passed to each renderer class as a constructor argument or a setter:

```typescript
// CanvasHost.tsx — after pixi.Application.init()
const tokens = buildCanvasTokens();
boundaryRenderer.setTokens(tokens);
dimensionRenderer.setTokens(tokens);
plantRenderer.setTokens(tokens);
labelRenderer.setTokens(tokens);
canvasApp.renderer.background.color = tokens.surfaceCanvasOverflow;
```

Dark mode note: when dark mode ships (Phase 3 per ADR 3 in ENG-22), the `[data-theme="dark"]` CSS block will override the `--ls-*` token values. Calling `buildCanvasTokens()` again after the theme attribute changes and re-applying to renderers will propagate dark mode colors to the canvas without any renderer code changes.

---

### 2.4 Migration Phases

#### Phase 1: Token Definition (additive — zero visual change)

**Goal:** Define all `--ls-` tokens in CSS and all canvas-only tokens in `globals.css`. Define `buildCanvasTokens()`. No component code changes. This phase is purely additive.

**Files changed:**
- `src/styles/globals.css` — add full `--ls-` token block from ENG-21 plus canvas-only token extensions
- `src/tokens/canvasTokens.ts` — create new file; `buildCanvasTokens()` function

**Files not touched:** All React components, all PixiJS renderers. Hardcoded values remain in place. Tokens are defined but not yet referenced.

**Risk:** None. Unused CSS custom properties are inert.

**Acceptance:** Token file exists; `getComputedStyle(document.documentElement).getPropertyValue('--ls-surface-toolbar')` returns `#2b3a4a` in browser console.

---

#### Phase 2: Chrome Surfaces (toolbar, panels, status bar)

**Goal:** Replace hardcoded background colors on the major chrome surfaces — `TopToolbar`, `SidePalette`, `InspectorPanel` containers, and `StatusBar` — with `--ls-` token references. Structural appearance changes in this phase; users will notice the dark toolbar and warm panel backgrounds.

**Files changed:**

| File | Change |
|------|--------|
| `TopToolbar.tsx` | Replace `#1971c2` (ACCENT) → `var(--ls-color-interactive)` |
| `TopToolbar.tsx` | Replace `#e8f0fb` (ACCENT_BG) → `var(--ls-color-interactive-subtle)` |
| `TopToolbar.tsx` | Replace `#1f2937` (tooltip bg) → `var(--ls-surface-tooltip)` |
| `TopToolbar.tsx` | Replace `#E8A838` (Generate btn) → `var(--ls-color-cta)` |
| `TopToolbar.tsx` | Replace `#374151` (inactive tool) → `var(--ls-text-on-dark-secondary)` |
| `TopToolbar.tsx` | Container bg class → `bg-[--ls-surface-toolbar]` or inline style |
| `SidePalette.tsx` | All four `#1971c2` instances → `var(--ls-color-interactive)` |
| `SidePalette.tsx` | `#e8f0fb` active bg → `var(--ls-color-interactive-subtle)` |
| `SidePalette.tsx` | Container bg → `var(--ls-surface-panel)` |
| `InspectorPanel.tsx` | Replace `bg-blue-50 border-blue-300 text-blue-700` template literal → token classes |
| `InspectorPanel.tsx` | Container bg → `var(--ls-surface-panel)` |
| `StatusBar` (wherever rendered) | Container bg → `var(--ls-surface-statusbar)` |
| `AppLayout.tsx` | Layout shell background → `var(--ls-surface-canvas-overflow)` |

**Files not touched in this phase:** All PixiJS renderer files. Canvas colors remain hardcoded.

**Risk:** Low. Token values in Phase 1 were validated against the computed values they replace. Visual change is intentional and expected.

**Acceptance:** TopToolbar renders with `#2b3a4a` dark background. SidePalette renders with `#f7f5f2` warm background. Amber Generate button renders at `#f5a623`. No console errors.

---

#### Phase 3: Component Library (shadcn/ui incremental adoption)

**Goal:** Replace raw `<select>`, `<input>`, `<textarea>`, `<button>`, and `<select>` elements in `InspectorPanel.tsx` and `SidePalette.tsx` with shadcn/ui components. This is a behavior-touching change, not just a visual reskin — accessible keyboard navigation, ARIA roles, and focus management change. Install and configure shadcn/ui to remap default CSS variables to `--ls-` tokens.

**Prerequisite:** Phase 2 complete. Token references in chrome surfaces are stable.

**Setup step (one-time):**

```bash
npx shadcn@latest init
# Select: TypeScript, CSS variables mode, src/components/ui output directory
```

After init, replace shadcn's default `--background`/`--foreground` block in `globals.css` with `--ls-` token references so shadcn components inherit the Landscaper token system automatically.

**Component migration order (additive — install and replace one component type at a time):**

| Step | Component | Replaces | Behavior change |
|------|-----------|----------|-----------------|
| 3.1 | `Button` | Raw `<button>` in `InspectorPanel`, `TopToolbar` | Adds focus ring, keyboard activation, disabled state styling |
| 3.2 | `Tooltip` | Manual tooltip divs in `TopToolbar` | Full keyboard tooltip via Radix; escapes canvas z-index via Portal |
| 3.3 | `DropdownMenu` | Manual dropdown in tool menus | Focus trap on open, keyboard nav, Escape to close |
| 3.4 | `Input`, `Textarea` | Raw `<input>`, `<textarea>` in `InspectorPanel` | Consistent focus ring using `--ls-border-focus`, accessible label association |
| 3.5 | `Select` | Raw `<select>` in `InspectorPanel` | Custom styled dropdown with Radix Portal; keyboard navigation |
| 3.6 | `Tabs` | Manual tab state in `SidePalette` | Keyboard arrow-key navigation, `aria-selected` |
| 3.7 | Mode switcher | New component | 3-segment `Tabs` using `.ls-mode-tab` styles; dispatches to `useLayoutStore` |
| 3.8 | `Tabs` | Left nav tabs in Garden Management mode | Same pattern as SidePalette tabs |

**`PLANT_COLORS` and `STRUCTURE_CATEGORY_COLORS` extraction:**

These inline maps in `SidePalette.tsx` are extracted to `src/tokens/plantColors.ts` and `src/tokens/structureColors.ts` as named exports. This happens in this phase because `SidePalette.tsx` is being refactored for shadcn Tabs. The extracted values are the source of truth for both CSS custom property declarations (added to `globals.css`) and the `buildCanvasTokens()` reader (updated to import from these files as fallback hex values).

**Files changed in Phase 3:**

`src/components/InspectorPanel.tsx`, `src/components/SidePalette.tsx`, `src/components/TopToolbar.tsx`, `src/components/ui/*` (shadcn generated), `src/styles/globals.css` (shadcn variable remapping), `src/tokens/plantColors.ts` (new), `src/tokens/structureColors.ts` (new)

**Risk:** Medium. The `<select>` → shadcn `Select` replacement is not purely visual — the Radix `Select` renders into a Portal and has different DOM structure. Any code that queries `.inspector-panel select` by DOM class will break. Audit for such queries before migration.

**Acceptance:** All `InspectorPanel` controls are keyboard-navigable. Tab order is logical. Focus rings are visible using `--ls-border-focus`. No z-index conflicts between shadcn dropdowns and the PixiJS canvas.

---

#### Phase 4: Canvas Layer (PixiJS Color Migration)

**Goal:** Replace all hardcoded hex values in PixiJS renderer files with values from `buildCanvasTokens()`. This eliminates the last hardcoded colors in the application.

**Prerequisite:** Phase 3 complete. `buildCanvasTokens()` is implemented and tested. CSS canvas-only tokens (`--ls-plant-*`, `--ls-structure-*`, `--ls-plant-status-*`) are defined in `globals.css`.

**Files changed:**

| File | Lines | Change |
|------|-------|--------|
| `CanvasHost.tsx` | Line 119 | `background: '#f5f5f0'` → `tokens.surfaceCanvasOverflow` |
| `CanvasHost.tsx` | After pixi init | Add `buildCanvasTokens()` call; pass tokens to renderers |
| `DimensionRenderer.ts` | Line 209 | `'#1976d2'` → `this.tokens.colorInteractive` |
| `BoundaryRenderer.ts` | Line 37 | `LABEL_COLOR = '#1971c2'` → value from `tokens.colorInteractive` |
| `LabelRenderer.ts` | Line 33 | `DEFAULT_FONT_COLOR = '#333333'` → `tokens.textPrimary` |
| `PlantRenderer.ts` | Lines 56–60 | Status color constants → `tokens.plantStatusColors.*` |
| `PlantSprites.ts` | Lines 23–28 | Category color constants → `tokens.plantColors.*` |
| `StructureSprites.ts` | Line 195 | Soil color → `tokens.structureColors.soil` |
| `StructureSprites.ts` | Lines 314–315 | Texture colors → `tokens.structureColors.texture` |

Each renderer class receives a `setTokens(tokens: CanvasTokens): void` method. Texture caches (`TextureAtlas`, any cached `RenderTexture`) must be invalidated and regenerated after `setTokens()` is called, because sprite textures bake in color at generation time.

**Token re-application order in `CanvasHost.tsx` initialization:**

```
1. buildCanvasTokens() → tokens
2. Set pixi app background color
3. Call setTokens() on: BoundaryRenderer, DimensionRenderer, LabelRenderer
4. Call setTokens() on: PlantRenderer (triggers sprite texture rebuild)
5. Call setTokens() on: StructureSprites (triggers structure texture rebuild)
6. Trigger canvas redraw
```

**Risk:** Medium-high. Texture rebuilds at startup add a short initialization cost. Renderer setTokens() methods must guard against being called before the PixiJS Application is initialized. Invalid hex strings from malformed CSS token values will produce `0xNaN` in PixiJS, appearing as black fills — add a validation step in `cssColorToPixi()` that logs a warning and falls back to a safe default.

**Acceptance:** Canvas renders identically to pre-migration state (colors are matched, not changed). `buildCanvasTokens()` returns non-NaN integer values for all tokens. No console errors. Dark mode toggle test: switching `data-theme` attribute + calling `buildCanvasTokens()` again updates canvas colors.

---

#### Phase 5: Layout Mode Store (Zustand, replace useState/route approach)

**Goal:** Implement `useLayoutStore` per ADR 1 (ENG-22). Deprecate the `/app/generate` route. Migrate `AppLayout.tsx` `showJournal` and `showCostSummary` `useState` booleans into the store. Add mode switcher component that dispatches to the store.

**Prerequisite:** Phase 3 complete. Mode switcher component exists (Step 3.7). This phase wires it to actual layout behavior.

**Implementation order (from ADR 1 ENG-22):**

1. Create `src/store/useLayoutStore.ts` with `mode: 'blueprint' | 'generate' | 'garden'`, `statusBarVisible`, `leftPanelConfig`, `rightPanelConfig`
2. Add mode switcher dispatch in the mode switcher component (Step 3.7 already created the UI)
3. Migrate `showJournal`, `showCostSummary` useState in `AppLayout.tsx` → `useLayoutStore` slices
4. Refactor `AppLayout.tsx` conditional rendering to read from store (panel slot abstraction: `leftPanel`, `rightPanel`, `statusBar` named regions)
5. Deprecate `/app/generate` route; add TanStack Router redirect from `/app/generate` → `/app?mode=generate`
6. Refactor `GenerateShell` content panels into the shared layout's panel slots under `mode === 'generate'`
7. Add per-mode state persistence (last active mode, expanded sections) to the store

**Files changed:**

`src/store/useLayoutStore.ts` (new), `src/components/AppLayout.tsx`, `src/components/ModeSwitcher.tsx` (new or update Step 3.7 component), `src/routes/app.generate.tsx` (redirect), `src/components/GenerateShell.tsx` (refactor)

**Risk:** Medium. The `GenerateShell` refactor is the highest-risk step because it currently has its own layout structure. Refactoring it to inject content into shared panel slots requires careful separation of layout responsibility from content responsibility. Plan the `GenerateShell` refactor as a sub-task with its own review before merging.

**Acceptance:** Switching between all three modes via the mode switcher works without a page reload. PixiJS canvas does not unmount (verify by checking that PixiJS internal state — entity counts — is preserved after a Blueprint → Generate → Blueprint round trip). URL shows mode query param on mode switch. `/app/generate` redirects to app with generate mode active.

---

### 2.5 Migration Risk Summary

| Phase | Visible change | Break risk | Rollback |
|-------|---------------|-----------|---------|
| 1 — Token definition | None | None | Delete token file |
| 2 — Chrome surfaces | Yes (intentional) | Low | Revert token references to hardcoded values |
| 3 — shadcn adoption | Yes (component styling) | Medium (DOM structure) | Revert per-component; shadcn files are local |
| 4 — Canvas layer | None visible (color-matched) | Medium (NaN colors) | Revert `setTokens()` calls; restore hardcoded constants |
| 5 — Layout mode store | Yes (layout behavior) | Medium (GenerateShell) | Feature flag `useLayoutStore` behind env var; revert to useState path |

---

## Part 3: BAU Impact Assessment

This table classifies each BAU item against the ENG-21/ENG-22/ENG-23 scope. Classifications:

- **Subsumed** — the work is now fully contained within the ENG-21/22/23 scope; the BAU item should be closed or merged into the ENG work.
- **Reshaped** — the ENG work changes how the BAU item should be implemented; the BAU item remains valid but its scope, approach, or acceptance criteria must be updated.
- **Unchanged** — the BAU item is independent of the UI rethink work and can proceed as originally specified.

---

| BAU Item | Title | Classification | Rationale |
|----------|-------|----------------|-----------|
| **BAU-5** | Break down large components (JournalView, InspectorPanel) | **Reshaped** | The split is still required. However, the refactoring target has changed: InspectorPanel must be split into named panel slots (`positionSection`, `plantInfoSection`, `recordDetailSection`) that correspond to the layout slot architecture in `useLayoutStore` from ADR 1. The split must also happen before Phase 3 of the migration (shadcn adoption) because the shadcn form primitive replacement is done per sub-component, not on the monolith. BAU-5 remains a prerequisite for BAU-6 but the output shape has changed. Update acceptance criteria to reference slot compatibility with `useLayoutStore`. |
| **BAU-6** | Consolidate inspectors to shadcn/ui | **Reshaped** | shadcn adoption is now Phase 3 of the formal migration strategy above, with an explicit sequenced component list (Button, Tooltip, DropdownMenu, Input, Textarea, Select, Tabs, ModeSwitcher). BAU-6 is not dropped — it is now a named phase with a defined migration order. The critical distinction this BAU item must preserve: `InspectorPanel` currently uses bare `<select>`, `<input>`, `<textarea>`, `<button>`. Replacing these with shadcn equivalents is a behavior-touching change, not a visual reskin. Radix Select renders into a Portal; Radix Dialog adds a focus trap; Radix DropdownMenu changes keyboard behavior. The BAU-6 plan must explicitly cover: (1) DOM query audit before replacing `<select>` (check for JS that queries the raw select element), (2) focus order testing after each component replacement, (3) PixiJS z-index conflict testing for any Portal-rendered shadcn components that appear over the canvas. Do not treat this as a "style update" task — it is a component replacement task with accessibility and behavior implications. |
| **BAU-14** | Multi-select plant batch editing | **Reshaped** | BAU-14 adds batch editing controls to the InspectorPanel. The InspectorPanel is now split (BAU-5) and uses shadcn form primitives (BAU-6) as part of the migration. BAU-14 must be sequenced after BAU-5 and BAU-6 complete, because the batch editing controls should be built using the new shadcn Input/Select components and placed into the correct panel slot, not bolted onto the pre-migration monolith. The Garden Management mode's record detail panel (conditional right panel in wireframe 1.3) also exposes per-plant editing — BAU-14 should consider whether Blueprint-mode batch editing and Garden-mode single-record editing share a common form component. |
| **BAU-23** | Spike: Professional design tool parity | **Subsumed** | The ENG-21 competitor audit is the professional design tool parity spike. The deliverables — competitor analysis, visual identity proposal, token system, per-mode chrome guidance — are now documented. BAU-23 should be marked `done` with a reference to ENG-21. Any remaining discovery work (e.g., specific Vectorworks feature parity items not covered in ENG-21) should be broken out as new, specific BAU items rather than reopening the spike. |
| **BAU-24** | Spike: Construction lines and reference guides | **Unchanged** | Construction lines are a canvas-layer feature — they are drawn by PixiJS renderers, not by HTML components. The token migration (Phase 4) will need to include construction line colors when that feature is built, but the ENG-21/22/23 work does not change the construction line feature design or implementation approach. BAU-24 remains independent. Note: when BAU-24 is implemented, its dimension/guide colors should use `--ls-color-snap-guide` (defined in ENG-21 token set as `var(--ls-brand-400)`) rather than introducing new hardcoded values. |
| **BAU-25** | Spike: Plant schedule generation | **Reshaped** | Plant schedule is a Garden Management mode feature. The wireframe in section 1.3 defines the content area as a list/journal surface using `--ls-surface-canvas` white background and `--ls-leading-relaxed` 1.6 line height. The plant schedule table will live in this content area under the left nav "Plants" tab. BAU-25 must reference the Garden Management mode wireframe for layout constraints: the table renders in the flex-1 content area, not in a modal; the record detail panel (280px right) is activated when a plant row is clicked; status indicators use `--ls-plant-status-*` tokens from Phase 4. BAU-25 scope is unchanged in terms of feature functionality, but the UI context it must fit into has been defined by ENG-23. |
| **BAU-26** | Spike: SVG/DXF export | **Unchanged** | Export is a data transformation feature. It reads the canvas state and produces a file — it does not depend on the visual token system, component library, or layout mode store. The export dialog will eventually be built as a shadcn `Dialog` (benefiting from Phase 3 Radix Portal z-index safety), but BAU-26 can design and implement the export logic independently. The only constraint: do not build the export trigger as a hardcoded button with `#E8A838` — use `--ls-color-cta` from the token system. |
| **Landing page** | Marketing site redesign | **Reshaped** | The BAU dependency graph (BAU.md) correctly shows "Landing page plan — pause until BAU-30 done." BAU-30 is now represented by ENG-21 + ENG-22 + ENG-23. The visual identity defined in ENG-21 (Blueprint Garden direction, `--ls-` token system, Inter + JetBrains Mono, amber CTA, dark toolbar aesthetic) is the brand foundation the landing page must draw from. The landing page is a separate codebase concern (static site or marketing route) and does not share the PixiJS canvas or shadcn component infrastructure, but it must reference the same brand tokens and visual language. A landing page plan should be started now that ENG-21 visual identity is defined. The landing page should not be built with the pre-ENG-21 visual system. |

---

## Appendix A: File Change Summary by Phase

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|------|---------|---------|---------|---------|---------|
| `src/styles/globals.css` | New `--ls-` block | — | shadcn var remapping | Canvas token additions | — |
| `src/tokens/canvasTokens.ts` | Create | — | — | Implement fully | — |
| `src/tokens/plantColors.ts` | — | — | Extract from SidePalette | Feed into canvasTokens | — |
| `src/tokens/structureColors.ts` | — | — | Extract from SidePalette | Feed into canvasTokens | — |
| `src/components/TopToolbar.tsx` | — | Token refs, bg | shadcn Button/Tooltip | — | Mode dispatch |
| `src/components/SidePalette.tsx` | — | Token refs, bg | shadcn Tabs, Input | — | Mode-aware collapse |
| `src/components/InspectorPanel.tsx` | — | Token refs, bg | shadcn form primitives | — | Panel slot split |
| `src/components/AppLayout.tsx` | — | Layout bg token | — | — | Store-driven panels |
| `src/components/ui/*` | — | — | shadcn generated | — | — |
| `src/store/useLayoutStore.ts` | — | — | — | — | Create |
| `src/canvas-pixi/CanvasHost.tsx` | — | — | — | `buildCanvasTokens()` call | — |
| `src/canvas-pixi/DimensionRenderer.ts` | — | — | — | `tokens.colorInteractive` | — |
| `src/canvas-pixi/BoundaryRenderer.ts` | — | — | — | `tokens.colorInteractive` | — |
| `src/canvas-pixi/LabelRenderer.ts` | — | — | — | `tokens.textPrimary` | — |
| `src/canvas-pixi/PlantRenderer.ts` | — | — | — | `tokens.plantStatusColors` | — |
| `src/canvas-pixi/textures/PlantSprites.ts` | — | — | — | `tokens.plantColors` | — |
| `src/canvas-pixi/textures/StructureSprites.ts` | — | — | — | `tokens.structureColors` | — |
| `src/routes/app.generate.tsx` | — | — | — | — | Redirect |
| `src/components/GenerateShell.tsx` | — | — | — | — | Refactor to slots |

---

## Appendix B: Token Coverage Checklist

Before each phase ships, verify these tokens resolve to non-empty values in the browser:

```
Phase 1 validation:
  getComputedStyle(document.documentElement).getPropertyValue('--ls-surface-toolbar')
  → '#2b3a4a'

  getComputedStyle(document.documentElement).getPropertyValue('--ls-color-interactive')
  → resolved brand-500 value

Phase 4 validation (canvasTokens.ts):
  buildCanvasTokens().colorInteractive !== NaN
  buildCanvasTokens().plantColors.vegetable !== NaN
  buildCanvasTokens().plantStatusColors.planned !== NaN
  buildCanvasTokens().surfaceCanvasOverflow !== NaN
```

---

*References: ENG-21 (`docs/plans/eng-21-competitor-audit-visual-identity.md`) — competitor audit, visual identity, token system, per-mode chrome guidance. ENG-22 (`docs/plans/eng-22-architecture-decisions.md`) — ADR 1 (layout-mode store), ADR 2 (shadcn/ui), ADR 3 (dark mode deferral), ADR 4 (mobile strategy).*
