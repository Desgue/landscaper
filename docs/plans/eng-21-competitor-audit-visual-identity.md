# ENG-21 — Competitor UI Audit & Visual Identity Proposal

| Field | Value |
|-------|-------|
| **Plan ID** | `ENG-21` |
| **Title** | Competitor UI Audit & Visual Identity Direction |
| **Scope** | Audit 6 competitor design tools, extract professional UI patterns, propose a complete visual identity system with design tokens ready for Phase 2 implementation. |
| **Status** | `planned` |
| **Created** | 2026-04-08 |
| **Feeds into** | BAU-30 (UI Rethink spike), BAU-5, BAU-6, BAU-14, Landing page redesign |

---

## Part 1: Competitor UI Audit

### Methodology

Each tool was assessed against its **actual application UI** — not its marketing site. Evaluation dimensions:

- Layout structure: panel count, arrangement, relative weights
- Visual language: surface treatment, color weight, chrome density
- Feature patterns: symbol library, property panels, export flows
- Professional credibility signals: what makes it feel like a real tool

---

### 1. EdrawMax Garden Design

**Tool type:** Browser-based diagramming tool with a garden/landscape template set. Closest structural analogue to Landscaper.

#### Layout Structure

A three-region layout that prioritizes the canvas but does not feel minimal:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Menu]  [Home] [Insert] [Layout] [View] [Format]  [Export]      │
│                    Ribbon toolbar (40px tall)                     │
├───────────┬──────────────────────────────────────────┬───────────┤
│ Symbol    │                                          │ Property  │
│ Library   │              Canvas                      │ Panel     │
│ (220px)   │                                          │ (260px)   │
│           │                                          │           │
│ [search]  │                                          │ [Fill]    │
│ ────────  │                                          │ [Line]    │
│ Trees     │                                          │ [Shadow]  │
│ ▸ Shrubs  │                                          │ [Size]    │
│ ▸ Flowers │                                          │ [Pos]     │
│ ▸ Fences  │                                          │           │
│ ▸ Pavers  │                                          │           │
│ ▸ Water   │                                          │           │
├───────────┴──────────────────────────────────────────┴───────────┤
│  Zoom slider   Page controls   Grid toggle   [Shape count]        │
└──────────────────────────────────────────────────────────────────┘
```

- Left panel: 220px, categorized symbol tree with expand/collapse. Search sits at the top. Thumbnails are 48x48 icon grids with text labels below.
- Right panel: 260px, tabbed property accordion. Tabs are "Style", "Arrange", "Sketch". Fills, line styles, shadow sliders appear as compact inline controls.
- Ribbon: Office-style horizontal tab bar above a secondary icon row. High density. Each tab reveals a context-sensitive row of grouped tools.
- Canvas: white, grid is visible at all times (blue dots, ~20px spacing). The canvas is infinite.

#### Visual Language

- **Background:** White canvas on a mid-gray `#e5e5e5` application frame.
- **Chrome:** Significant. The ribbon adds ~80px of vertical chrome. The tool is visually "heavy" but also clearly a desktop-class tool.
- **Color weight:** Neutral charcoals (`#444`, `#555`) for all chrome text. Accent blue (`#1e73be`) for active states, selection handles, and primary buttons.
- **Icon style:** 16px filled icons in toolbar. Symbol library icons are flat color illustrations (not outlines). Property panel uses 12px outlined icons.
- **Typography:** System sans-serif, 12px body, 11px labels. All uppercase for section headings.
- **Selection:** Blue dashed rectangle, 8 resize handles. Identical to Visio.
- **Panels:** Flat sections separated by 1px `#e0e0e0` dividers. No shadows. Sections have an 8px padding.

#### Feature Patterns

- **Symbol library:** Search-first, category tree secondary. Drag to canvas. No preview on hover beyond cursor change.
- **Property panel:** Accordion sections. "Fill" always open by default. Other sections collapsed. Applying a fill color shows a swatch grid (8x8) plus "Custom" button.
- **Export:** File menu → Export As. Formats listed in a flat dialog: PDF, PNG, SVG, VSDX, DXF. Each with size/quality options on a second screen.
- **Templates:** Dedicated gallery page. 4-column grid, preview thumbnails with category tags. Opens in current file or new tab.

#### Professional Signals

The ribbon toolbar is the single strongest professional signal — it is the pattern users associate with Visio, Office, and AutoCAD. The symbol library's category tree with text labels (not just thumbnails) signals that the tool handles large inventories. Property panels using accordions rather than flat forms signal hierarchy and extensibility.

---

### 2. SketchUp (Web)

**Tool type:** Browser-based 3D modeling tool. Not a direct competitor but the industry reference for "professional 3D design in a browser."

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  [File] [Edit] [View] [Camera] [Draw] [Tools]  [Avatar]  │
├────┬─────────────────────────────────────────────────────┬───────┤
│    │                                                     │       │
│ L  │                    3D Canvas                        │   R   │
│ e  │                                                     │   i   │
│ f  │                 (WebGL viewport)                    │   g   │
│ t  │                                                     │   h   │
│    │                                                     │   t   │
│ T  │                                                     │       │
│ o  │                [On-canvas toolbar]                  │       │
│ o  │                [floating, vertical]                 │       │
│ l  │                                                     │       │
│ s  │                                                     │       │
└────┴─────────────────────────────────────────────────────┴───────┘
```

- Left tools panel: ~52px wide, vertical, floating icons only (no labels). Tools revealed on hover with tooltip.
- Right panel: Collapses to nothing when no object selected. When an object is selected, slides in a 280px material/entity panel.
- Canvas: Full bleed. No persistent grid. Axis lines (red/green/blue) always visible at the world origin.
- Top bar: Minimal. Menu bar at 32px. No ribbon. A single row of secondary tools as small icons.

#### Visual Language

- **Background:** Dark gray application frame `#1e1e1e`. Canvas background is white/sky. This creates a "dark chrome, light workspace" split that is extremely legible.
- **Chrome density:** Low. SketchUp deliberately minimizes chrome so the 3D model fills the screen. This is the anti-EdrawMax.
- **Color weight:** The dark frame makes the lighter canvas feel like a focused stage. All UI chrome reads as secondary.
- **Icon style:** Outlined, 20px, white on dark surfaces. Custom iconography — not a library. Consistent stroke weight (`1.5px`).
- **Typography:** Inter or similar geometric sans. 13px chrome labels, 11px tooltips. Bold weights used sparingly for panel section headers.
- **Panel surfaces:** `#2a2a2a` (sidebar backgrounds), `#333` (hover), `#1a1a1a` (panel header). Subtle 1px borders in `#3a3a3a`.
- **Selection:** Blue highlight `#0071bc` on selected faces. Bounding box in dashed blue.

#### Feature Patterns

- **Material browser:** Search bar at top, thumbnail grid below (48x48 swatches), applied via single click. Category filter tabs across top of panel.
- **Entity info panel:** Auto-populates on selection. Shows object type, layer, material, dimensions. All editable inline.
- **Export:** File → Download → format picker. Clean, focused dialog.

#### Professional Signals

Dark chrome is the primary signal. Consumer tools (Canva, Google Slides) use white/light chrome. Professional 3D tools (Maya, Blender, Cinema 4D) universally use dark chrome because it reduces eye strain during long sessions and makes the work surface the focal point. The minimal icon-only toolbars (no text labels) assume tool fluency and reduce visual noise.

---

### 3. Vectorworks Landmark

**Tool type:** Native desktop application (macOS/Windows). Industry standard for landscape architecture and site design. The reference point for "what professionals actually use."

#### Layout Structure

Vectorworks uses a highly dense, configurable multi-panel layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  [File][Edit][View][Modify][Tool Sets][Landmark][Window]         │
│  [SmartCursor settings] [Snap indicators row]                    │
├────┬────┬─────────────────────────────────┬───────────┬──────────┤
│ T  │ Re │                                 │ Object    │ Resource │
│ o  │ so │        Drawing Canvas           │ Info      │ Manager  │
│ o  │ ur │                                 │ Panel     │          │
│ l  │ ce │                                 │           │ [Search] │
│    │    │                                 │ [Layer]   │ [browse] │
│ P  │    │                                 │ [Class]   │ [tree]   │
│ a  │    │                                 │ [X/Y/Z]   │          │
│ l  │    │                                 │ [Prop]    │          │
│ e  │    │                                 │           │          │
│ t  │    │         [Status bar]            │           │          │
│ t  │    │                                 │           │          │
│ e  │    │                                 │           │          │
└────┴────┴─────────────────────────────────┴───────────┴──────────┘
```

- Left tool palette: ~72px wide, multi-column grid of 24x24 tool icons. Tool sets are tabbed (2D/3D/Landmark). Current tool highlighted with a border.
- Resource manager: Separate floating or docked panel. Tree browser on left, thumbnail grid on right. Handles symbols, hatches, textures, plants, site modifiers.
- Object info palette: Right, 280px. Shows all editable properties for selected object. No accordion — all properties flat in a scrollable list. Dense.
- Top bars: Menu bar + two rows of snapping/mode icons. SmartCursor row shows snap state in real-time.
- Status bar: At the very bottom. Shows layer name, class, coordinates, snap mode, object count.

#### Visual Language

- **Background:** Medium gray application frame `#c8c8c8` (macOS default). Document windows have white drawing surface.
- **Chrome density:** Maximum. Vectorworks is intentionally dense because power users want maximum information density. This is the "professional legitimacy through density" paradigm.
- **Color weight:** Flat grays throughout. Accent color is used only for active tool state (blue border around active tool icon) and selection (blue handles).
- **Icon style:** 24x24 pixel-art style icons with 1px outlines. Not SVG. Not modern. But immediately legible at small sizes. This is the CAD tool iconography tradition.
- **Typography:** System fonts at 11px everywhere. Labels are dense. This is not a typographically sophisticated tool.
- **Landmark-specific panels:** Plant insertion parameters appear in a dialog (not a side panel). Site model settings open in a modal sheet with tabs.

#### Feature Patterns

- **Plant tool:** Modal dialog on placement. User specifies plant species, spacing, height, spread. Placed as a parametric symbol with associated data.
- **Resource manager:** The most important UX pattern in Vectorworks. A docked panel that functions as a file-system browser for all design assets (symbols, styles, templates). Double-click to edit, drag to canvas to place.
- **Viewport/Layer model:** Named viewports with scale, layer visibility, and class overrides per viewport. Professional presentation workflow.
- **Hardscape tools:** Specific to Vectorworks Landmark — irrigation, grading, site model tools appear as separate palette sections.

#### Professional Signals

The Resource Manager paradigm — treating all design assets as managed resources with a file-browser UI — is the most important pattern. It implies a library of reusable, editable, versioned assets. The parametric plant tool (place with specified attributes) rather than a stamp tool signals that the tool models intent, not just appearance. The layer/class system (two orthogonal organization systems) signals enterprise-level project organization.

---

### 4. PRO Landscape

**Tool type:** Windows/iPad application for professional landscaping contractors. Closest direct competitor by industry (not by UI sophistication).

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]   [Project] [Design] [Estimate] [Reports] [Help]         │
├──────────────────────────────────────────────────────────────────┤
│  [Ribbon icons: Draw | Edit | Photo | Plants | Materials | 3D]   │
├──────────────┬───────────────────────────────────────────────────┤
│              │                                                    │
│  Left Panel  │           Main Canvas / Photo View                │
│  (tabbed)    │                                                    │
│              │                                                    │
│  Plants tab: │   (Satellite/photo background with plant          │
│  [search]    │    overlays drawn on top)                         │
│  [thumb grid]│                                                    │
│              │                                                    │
│  Materials:  │                                                    │
│  [swatch grid│                                                    │
└──────────────┴───────────────────────────────────────────────────┤
│  [Selection info bar]  [Zoom]  [Scale]                           │
└──────────────────────────────────────────────────────────────────┘
```

- Left panel: 240px. Tabbed between Plants, Materials, Structures, Templates. Each tab shows a searchable thumbnail grid.
- Photo overlay mode: Users import a photo or satellite image and draw on top. The canvas is not an abstract grid — it is a real-world photo. This is the signature PRO Landscape workflow.
- Ribbon: Two rows. Top row is mode switcher (Design, Photo, 3D). Second row is context-sensitive tool icons.

#### Visual Language

- **Background:** Dark navy toolbar `#1a2a4a` contrasted with a white/photo canvas. Strong brand color injection.
- **Chrome density:** Medium. The left panel is always visible. The toolbar is compact.
- **Color weight:** Heavy use of the brand navy in toolbars and panel headers. This creates a strong product identity even when the UI is otherwise generic.
- **Icon style:** 24px flat colored icons (not outlined). Green for plant tools, blue for draw tools. This is consumer-grade iconography but with consistent color coding.
- **Typography:** System fonts. Panel labels at 11px, section headers at 13px bold. Capitalized section titles.
- **Plant thumbnails:** Real photos (not illustrations). 64x64 thumbnails with the plant name below and a cultivar tag.

#### Feature Patterns

- **Photo import + scale calibration:** User imports a satellite or drone photo, clicks two known points, enters the real-world distance. Canvas scale is set. All subsequent drawn elements are to scale.
- **Plant database:** Linked to a curated plant database with real photos, hardiness zones, mature height/spread. Search by name or filter by category.
- **Estimate generation:** Select elements on canvas → auto-calculate quantities → export to a line-item estimate PDF. This is the killer workflow for contractors.
- **3D view:** Toggle to a low-fidelity 3D render of the design. Not photorealistic, but enough to show clients.

#### Professional Signals

The photo overlay workflow is the dominant professional signal — it means the design is grounded in reality, not an abstract diagram. The estimate generation from canvas selection (not a separate spreadsheet) signals an integrated professional workflow. Real plant photos (not icons) in the library signal that the tool respects domain knowledge.

---

### 5. iScape

**Tool type:** iPad/iPhone-first augmented reality garden design app. Consumer-leaning but adopted by some residential landscapers.

#### Layout Structure

Mobile-first, portrait and landscape:

```
┌───────────────────────────────┐
│  [< Back]      iScape    [?] │
├───────────────────────────────┤
│                               │
│         AR Camera View        │
│       (or photo import)       │
│                               │
│                               │
├───────────────────────────────┤
│  [Plants][Hardscape][Decor]   │  (bottom tab bar, 56px)
├───────────────────────────────┤
│  [thumb] [thumb] [thumb] ...  │  (horizontal scroll, 100px)
└───────────────────────────────┘
```

- No left panel — the entire screen is canvas.
- The only persistent chrome is a bottom tab bar and a single row of thumbnails above it.
- Placing a plant: tap a thumbnail → the plant appears anchored to a detected surface in AR → drag to position → pinch to scale.
- Property editing: tap placed element → context menu appears inline (Delete, Scale, Rotate, Info).

#### Visual Language

- **Background:** Full-screen camera or photo. UI chrome is overlaid with glass-morphism style (blurred background, white at 60% opacity).
- **Chrome density:** Minimal by necessity — mobile viewport. All chrome is concentrated at the bottom 25% of the screen.
- **Color weight:** Bright greens and earth tones in the icon illustrations. The brand color is a medium green `#4CAF50`.
- **Icon style:** Rounded-corner flat illustrations (not icons). Plants look like illustrations, not diagrams.
- **Typography:** San Francisco / Helvetica. Large touch targets. 15px minimum for any label.

#### Feature Patterns

- **AR placement:** Most distinctive feature. Point camera at a surface, plant appears as a 3D model anchored to the detected plane.
- **Photo import:** Take a photo, drag plants on top of it. Less technically impressive than AR but more practical for planning.
- **Species selection:** Thumbnail grid with common name only. No botanical detail, no hardiness data. Consumer, not professional.
- **Share:** Screenshot-based. No structured export.

#### Professional Signals

There are few. iScape is included here to understand what professional tools must differentiate from — the consumer mobile aesthetic. The AR feature is novel and impressive for client presentations, but the lack of data depth, scale calibration, and export options means professionals cannot use it for actual deliverables.

---

### 6. Planner 5D / RoomSketcher

**Tool type:** Browser-based interior and exterior space planning. Strong 2D/3D workflow, closest to a consumer-grade CAD tool.

#### Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  [File] [Edit] [View] [Insert]     [Share] [Export]      │
├──────────┬───────────────────────────────────────────────────────┤
│ Catalog  │                                                        │
│          │                 2D Floorplan View                     │
│ [search] │                (click tab for 3D)                     │
│          │                                                        │
│ [Rooms]  │                                                        │
│ [Walls]  │                                                        │
│ [Doors]  │                                                        │
│ [Windows]│                                                        │
│ [Floors] │                                                        │
│ [Outdoor]│                                                        │
│          │                                                        │
│ [item]   │                                                        │
│ [item]   │                                                        │
│ [item]   │                                                        │
└──────────┴───────────────────────────────────────────────────────┘
```

- Left panel: 200px catalog. Vertical category list. Clicking a category shows a scrollable thumbnail grid in the same panel.
- No right property panel in default view. Properties appear as a floating toolbar above the selected element.
- Canvas: White background, blue grid, infinite scroll. Grid is always visible.
- Mode toggle: 2D / 3D toggle is a prominent tab at the top of the canvas. 3D view uses a WebGL renderer.

#### Visual Language

- **Background:** White canvas on a `#f5f5f5` application frame. Very light, consumer-friendly.
- **Chrome density:** Low-medium. The left panel is the primary chrome. The canvas takes ~75% of the viewport.
- **Color weight:** Pastel blues and greens in the catalog thumbnails. The product UI is essentially white/light gray with a single blue accent.
- **Icon style:** 20px outlined icons in the toolbar (white on blue button). Catalog uses photo-realistic or semi-realistic 3D renders as thumbnails.
- **Typography:** Custom sans (similar to Nunito or DM Sans). Friendly, rounded. Consumer-facing but not unprofessional.
- **Selection:** Dashed blue rectangle with corner and midpoint handles. Blue tinted.

#### Feature Patterns

- **Catalog:** Flat hierarchy — category list, then items. No subcategories. Searchable. Favorite items pinned.
- **Element properties:** Appear inline above the element as a floating mini-toolbar. Covers: color fill, material, delete, duplicate, layer (up/down). No dedicated panel.
- **Measurement:** Toggle-on overlay that labels all walls with their dimensions. Not a dedicated tool, a view mode.
- **3D live preview:** Switch between 2D and 3D views of the same project at any time. 3D is navigable in real-time.
- **Export:** Screenshot-based in free tier. "HD Render" in paid tier (photorealistic).

#### Professional Signals

The seamless 2D/3D mode switch is the standout. It eliminates the mental model gap between planning and visualization. The white/light chrome is consumer-friendly but works against professional perception. The floating property toolbar (rather than a persistent panel) is clever for screen space but makes systematic editing (bulk property changes) awkward.

---

### Summary Comparison Table

| Dimension | EdrawMax | SketchUp | Vectorworks | PRO Landscape | iScape | Planner 5D |
|-----------|----------|----------|-------------|---------------|--------|------------|
| **Target user** | General diagram | 3D modeler | Landscape architect | Landscaping contractor | Consumer / homeowner | Consumer / small pro |
| **Platform** | Web | Web | Desktop | Desktop/iPad | iPad/iPhone | Web |
| **Chrome density** | High | Low | Maximum | Medium | Minimal | Low-medium |
| **Left panel width** | 220px | 52px | 72px | 240px | N/A | 200px |
| **Right panel** | 260px property | 280px contextual | 280px OI palette | None persistent | None | Floating toolbar |
| **Toolbar style** | Ribbon (Office) | Vertical icon strip | Multi-row pixel icon grid | Ribbon (branded) | Bottom tab bar | Top icon row |
| **Canvas bg** | White | Light (white/sky) | White document | Photo/satellite | AR/photo | White |
| **App frame bg** | `#e5e5e5` light gray | `#1e1e1e` dark | `#c8c8c8` system gray | `#1a2a4a` navy | Transparent | `#f5f5f5` near-white |
| **Icon style** | Filled/flat, 16px | Outlined, 20px | Pixel-art, 24px | Flat colored, 24px | Illustrated | Outlined, 20px |
| **Typography** | System, 12px | Geometric sans, 13px | System, 11px | System, 11px | SF/Helvetica, 15px | Custom rounded |
| **Color accent** | Blue `#1e73be` | Blue `#0071bc` | Blue (sparse) | Navy brand | Green `#4CAF50` | Blue |
| **Symbol library** | Tree + search | N/A | Resource Manager | Tabbed thumbnail grid | Bottom scroll | Category list |
| **Key professional signal** | Ribbon toolbar | Dark chrome frame | Resource Manager + parametric | Photo overlay + estimating | AR | 2D/3D toggle |
| **Biggest weakness** | Feels like Visio (generic) | Not 2D-native | Steep learning curve | Dated visual design | No professional data | Consumer-facing |

---

## Part 2: Professional vs Whiteboard Analysis

### What Makes the Current Landscaper UI Feel "Whiteboard"

The Excalidraw-inspired aesthetic was a deliberate simplicity choice. But simplicity without density signals reads as "prototype" to professional users, not "focused tool." These are the specific traits that undermine professional credibility:

#### 1. Chrome Density — Too Low for a Planning Tool

Whiteboard tools (Excalidraw, Miro, FigJam) use minimal chrome because the content is the document. Design tools (Figma, Vectorworks, AutoCAD) use higher chrome density because the tool controls are the instrument of work.

Landscaper's current 48px toolbar and 240px left panel are structurally correct but feel sparse because:
- The toolbar has no visual subdivision (no groups, no separators with weight)
- The left panel uses too much whitespace between items
- There is no status bar at the bottom (missing the bottom "grounding" layer that all CAD tools have)
- No secondary toolbars or mode bars that would appear contextually

A professional tool communicates "this has depth you haven't discovered yet." The current UI looks like you have already seen everything.

#### 2. Color Weight — Too Flat, Too Little Hierarchy

Professional design tools use surface layering to create visual hierarchy. The current single-white background treats all surfaces as equal.

Compare these surface stacks:
- **Whiteboard (current):** `white` canvas = `white` panel backgrounds = `white` toolbar background. Separated only by 1px borders.
- **Professional (target):** Three or four distinct surface levels — `canvas (lightest)` → `panel (slightly darker)` → `toolbar (slightly darker again)` → `status bar (darkest or branded)`. Users can instantly feel where they are in the interface.

The `#1971c2` blue accent is also too bright and too present. Professional tools use muted, desaturated accents for interactive states (`#2563eb` shifted toward `#3b82f6` with reduced saturation) and reserve full-chroma color for destructive actions and validation states.

#### 3. Panel Structure — No Visual Hierarchy Within Panels

Current inspector panel: a flat vertical list of labeled inputs with `#e5e7eb` borders. This is the Tailwind default form pattern.

Professional panels use accordion sections with sticky headers, sub-group labels in ALL CAPS at 10px, and inline units/helpers tightly coupled to inputs. The difference is between "a form inside a panel" vs. "a panel designed for fast expert interaction."

#### 4. Iconography — Outlined Lucide Icons Are Neutral, Not Professional

Lucide outlined icons are excellent for general UI. They read as "modern neutral." This is appropriate for consumer tools and marketing sites.

Professional design tools (SketchUp, Vectorworks, Figma) use:
- **Custom icon families** with consistent stroke weight and corner radius treatment that matches the overall brand character
- **Filled icons** for active/selected tool states, outlined for available/inactive
- **Color coding** for tool categories (not just one blue accent — distinct tints per category)
- **Larger physical icon sizes** (20-24px) in toolbars, accepting the extra space cost for faster scanning

Using default Lucide icons without modification signals that the UI design was not a primary investment.

#### 5. Typography — System Font Stack Signals No Brand Investment

System font stacks (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto...`) are the correct choice for body text and UI chrome at small sizes. They are fast, accessible, and legible.

The problem is using them as the sole typography choice across every surface including headings, labels, and the product name. Compare:
- **Whiteboard:** System font at all levels. Everything looks like OS chrome.
- **Professional:** A specific loaded font (typically Inter, DM Sans, or Geist) for UI chrome and headings, combined with a monospace font for technical data (coordinates, dimensions, measurements). The font choice communicates intentionality.

#### 6. The Generate Button — `#E8A838` is Jarring

The current generate button color (`#E8A838` amber) exists to make the button stand out against the blue-dominant UI. This was a practical decision but creates a two-accent system with no design logic (blue = interactive, amber = ???).

Professional tools solve this with a semantic color system:
- One primary interactive color (used sparingly)
- One highlight/CTA color (used once per context, maximum)
- Semantic colors for success, warning, error
- No "hardcoded one-off" accent colors

#### Professional Visual Language Traits — Consolidated

| Trait | Whiteboard aesthetic | Professional tool aesthetic |
|-------|---------------------|----------------------------|
| **Surface count** | 1 (flat white everywhere) | 3-4 (canvas, panel, toolbar, statusbar) |
| **Panel bg** | White, same as canvas | Offset by 2-4% luminance steps |
| **Toolbar style** | Icon strip, even spacing | Grouped with visual separators, state-rich |
| **Active tool** | Blue border or fill | Filled icon + background tint |
| **Icon style** | Outlined, uniform stroke | Filled active / outlined inactive |
| **Icon size** | 16-18px | 20-24px in toolbars |
| **Typography** | System font only | Loaded geometric sans + monospace for data |
| **Accent color** | Saturated blue (one) | Desaturated primary + semantic palette |
| **Color CTA button** | Any contrasting color | Primary color at full chroma, isolated use |
| **Status info** | Minimal or absent | Status bar at bottom: coordinates, mode, zoom |
| **Separator style** | 1px border | 1px border + background color change |
| **Section headers** | None or bold text | Uppercase 10px labels, often with icon |
| **Loading/states** | Spinner | Skeleton screens with accurate layout |
| **Empty state** | "Nothing selected." | Contextual guidance text with icon |

---

## Part 3: Visual Identity Proposal

### Design Direction: "Blueprint Garden"

Professional but not austere. Dense but not cluttered. Grounded in the materials of the craft — earth, stone, growing things — without becoming literal or illustrative.

The palette draws from:
- The blue-gray of architectural blueprints and CAD line drawings
- The warm earthy mid-tones of soil, stone, and timber
- The muted greens of living plants (not marketing greens — field greens)
- Pure functional whites for the working canvas surface

This direction creates a tool that looks like it belongs alongside Vectorworks and PRO Landscape, not alongside Notion and Miro.

---

### 1. Color Palette — Design Tokens

All tokens use the `--ls-` namespace. Scale values are 50–950 following the Tailwind/Radix convention (lighter = lower number).

```css
/* ============================================================
   LANDSCAPER DESIGN TOKENS — Color System
   Usage: import in :root or a [data-theme] selector.
   ============================================================ */

:root {

  /* ----------------------------------------------------------
     BRAND: Slate (Blueprint Blue-Gray)
     Primary interactive color. Used for: active tool state,
     selection handles, primary buttons, links, focus rings.
     Never use for decorative purposes.
  ---------------------------------------------------------- */
  --ls-brand-50:  #f0f4f8;   /* hover tint on dark surfaces */
  --ls-brand-100: #d9e4f0;   /* subtle selection background */
  --ls-brand-200: #b3c9e1;   /* inactive selection borders */
  --ls-brand-300: #7aa3c8;   /* tertiary interactive elements */
  --ls-brand-400: #4a7fad;   /* secondary interactive state */
  --ls-brand-500: #2b6191;   /* primary interactive (buttons, icons) */
  --ls-brand-600: #1f4d73;   /* primary hover state */
  --ls-brand-700: #163a57;   /* primary pressed state */
  --ls-brand-800: #0e253a;   /* dark surface accent */
  --ls-brand-900: #071520;   /* darkest brand surface */
  --ls-brand-950: #030b12;   /* near-black for dark mode use */

  /* ----------------------------------------------------------
     EARTH: Warm Brown-Gray (Canvas Ground Tones)
     Used for: terrain chrome, panel backgrounds in blueprint
     mode, section dividers, inactive icon tints.
     Never use for interactive controls.
  ---------------------------------------------------------- */
  --ls-earth-50:  #faf7f4;   /* lightest panel surface (blueprint mode) */
  --ls-earth-100: #f2ece4;   /* panel background warm offset */
  --ls-earth-200: #e3d5c3;   /* dividers, subtle borders */
  --ls-earth-300: #c9b49a;   /* inactive icon strokes on light bg */
  --ls-earth-400: #ab8f70;   /* secondary text on light bg */
  --ls-earth-500: #8a6f50;   /* primary text on light earth surfaces */
  --ls-earth-600: #6e5640;   /* bold text on light earth */
  --ls-earth-700: #533f2f;   /* headings on warm surfaces */
  --ls-earth-800: #382a1f;   /* dark text on earth tones */
  --ls-earth-900: #1e1510;   /* near-black earth for dark mode */
  --ls-earth-950: #100b08;   /* darkest earth */

  /* ----------------------------------------------------------
     GARDEN: Field Green (Semantic — plants, growth, success)
     Used for: plant icons, success states, health indicators.
     Not for UI chrome or interactive controls.
  ---------------------------------------------------------- */
  --ls-garden-50:  #f2f7f0;  /* very light success tint */
  --ls-garden-100: #dcecd7;  /* success background */
  --ls-garden-200: #b8d9b0;  /* plant canopy fill (low opacity) */
  --ls-garden-300: #8cc281;  /* plant icon mid-tone */
  --ls-garden-400: #60a854;  /* plant icon primary */
  --ls-garden-500: #3d8b30;  /* success state, healthy plants */
  --ls-garden-600: #2d6e23;  /* success pressed, thriving state */
  --ls-garden-700: #1f5218;  /* deep success for dark surfaces */
  --ls-garden-800: #123410;  /* near-black garden */
  --ls-garden-900: #091a08;
  --ls-garden-950: #040e04;

  /* ----------------------------------------------------------
     AMBER: Harvest (Semantic — generate, CTA, AI actions)
     Used for: generate button, AI-related actions only.
     Replaces the current hardcoded #E8A838.
     One use per context maximum.
  ---------------------------------------------------------- */
  --ls-amber-50:  #fef9ee;   /* amber tint background */
  --ls-amber-100: #fdefc8;   /* amber background hover */
  --ls-amber-200: #fbda88;   /* light amber border */
  --ls-amber-300: #f8c040;   /* amber mid */
  --ls-amber-400: #f5a623;   /* generate button default */
  --ls-amber-500: #d4880a;   /* generate button hover */
  --ls-amber-600: #a86806;   /* generate button pressed */
  --ls-amber-700: #7a4b04;   /* amber on dark surfaces */
  --ls-amber-800: #4d2e02;
  --ls-amber-900: #261701;
  --ls-amber-950: #130b00;

  /* ----------------------------------------------------------
     SEMANTIC — functional color aliases
     These are the tokens components should reference.
     Never reference scale tokens directly in components.
  ---------------------------------------------------------- */

  /* Interactive / Brand */
  --ls-color-interactive:         var(--ls-brand-500);
  --ls-color-interactive-hover:   var(--ls-brand-600);
  --ls-color-interactive-pressed: var(--ls-brand-700);
  --ls-color-interactive-subtle:  var(--ls-brand-100);
  --ls-color-interactive-border:  var(--ls-brand-300);
  --ls-color-focus-ring:          var(--ls-brand-400);

  /* Selection (canvas elements) */
  --ls-color-selection:           var(--ls-brand-400);
  --ls-color-selection-bg:        var(--ls-brand-100);
  --ls-color-selection-handle:    var(--ls-brand-500);
  --ls-color-snap-guide:          var(--ls-brand-400);   /* replaces hardcoded #1971c2 for snap guides */

  /* CTA / Generate (amber — one use only) */
  --ls-color-cta:                 var(--ls-amber-400);
  --ls-color-cta-hover:           var(--ls-amber-500);
  --ls-color-cta-pressed:         var(--ls-amber-600);
  --ls-color-cta-text:            #ffffff;               /* white text on amber */

  /* Success / Plants / Garden */
  --ls-color-success:             var(--ls-garden-500);
  --ls-color-success-bg:          var(--ls-garden-100);
  --ls-color-plant-canopy:        var(--ls-garden-200);  /* 30% opacity overlay on canvas */

  /* Warning */
  --ls-color-warning:             var(--ls-amber-400);
  --ls-color-warning-bg:          var(--ls-amber-100);

  /* Destructive */
  --ls-color-destructive:         #c0392b;
  --ls-color-destructive-hover:   #a93226;
  --ls-color-destructive-bg:      #fdf2f2;

  /* ============================================================
     SURFACES — the four-level hierarchy (light mode)
     Level 0 = canvas (work surface, lightest)
     Level 1 = panel backgrounds
     Level 2 = toolbar / header backgrounds
     Level 3 = status bar / footer
  ============================================================ */
  --ls-surface-canvas:            #ffffff;               /* Level 0: the work area */
  --ls-surface-canvas-overflow:   #f0f0ee;               /* staging area outside yard boundary */
  --ls-surface-panel:             #f7f5f2;               /* Level 1: SidePalette, InspectorPanel */
  --ls-surface-panel-header:      #ede9e4;               /* panel section headers */
  --ls-surface-toolbar:           #2b3a4a;               /* Level 2: TopToolbar — dark for pro feel */
  --ls-surface-toolbar-hover:     #364757;               /* toolbar icon hover */
  --ls-surface-toolbar-active:    #1f2d3d;               /* active tool bg in toolbar */
  --ls-surface-statusbar:         #1e2a38;               /* Level 3: status bar — deepest chrome */
  --ls-surface-modal:             #ffffff;               /* modal / dialog background */
  --ls-surface-tooltip:           #1e2a38;               /* tooltip bg — replaces hardcoded #1f2937 */

  /* ============================================================
     BORDERS
  ============================================================ */
  --ls-border-subtle:             #e8e4de;               /* low-contrast panel dividers */
  --ls-border-default:            #d1cac0;               /* standard panel borders */
  --ls-border-strong:             #b5aba0;               /* strong separators */
  --ls-border-focus:              var(--ls-brand-400);   /* keyboard focus outline */

  /* ============================================================
     TEXT
  ============================================================ */
  --ls-text-primary:              #1a1612;               /* headings, primary labels — warm near-black */
  --ls-text-secondary:            #4a4540;               /* body text, descriptions */
  --ls-text-tertiary:             #7a7570;               /* captions, hints, placeholders */
  --ls-text-disabled:             #b0aba5;               /* disabled state */
  --ls-text-on-dark:              #f5f3f0;               /* text on dark surfaces (toolbar, statusbar) */
  --ls-text-on-dark-secondary:    #a8a5a0;               /* secondary text on dark surfaces */
  --ls-text-link:                 var(--ls-brand-500);
  --ls-text-link-hover:           var(--ls-brand-600);

  /* Canvas-specific text */
  --ls-text-dimension:            #555555;               /* dimension line labels — keep as-is */
  --ls-text-cost:                 var(--ls-text-tertiary); /* cost in inspector — muted right-aligned */

}
```

---

### 2. Typography — Tokens

Load Inter from Google Fonts (or Bunny Fonts for GDPR compliance). Inter is used by Figma, Linear, Vercel, and most serious design tools released post-2020. It is not neutral — it signals design tooling.

JetBrains Mono (or `ui-monospace`) for all technical data: coordinates, dimensions, measurements, cost values.

```css
/* ============================================================
   LANDSCAPER DESIGN TOKENS — Typography
   ============================================================ */

:root {

  /* Families */
  --ls-font-ui:       'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --ls-font-mono:     'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --ls-font-canvas:   var(--ls-font-ui);   /* canvas labels use the same family */

  /* Scale — follows a 1.25 minor-third type scale */
  --ls-text-2xs:      10px;   /* panel micro-labels, kbd shortcuts in tooltips */
  --ls-text-xs:       11px;   /* section headers (ALL CAPS), secondary panel labels */
  --ls-text-sm:       12px;   /* body text in panels, input labels */
  --ls-text-base:     13px;   /* default UI text */
  --ls-text-md:       14px;   /* panel section names, important labels */
  --ls-text-lg:       16px;   /* modal headings, prominent labels */
  --ls-text-xl:       20px;   /* empty-state headings */
  --ls-text-2xl:      24px;   /* page/mode headings */

  /* Weights */
  --ls-weight-normal:   400;
  --ls-weight-medium:   500;
  --ls-weight-semibold: 600;
  --ls-weight-bold:     700;

  /* Line heights */
  --ls-leading-tight:   1.2;  /* headings */
  --ls-leading-normal:  1.4;  /* UI body text */
  --ls-leading-relaxed: 1.6;  /* readable paragraphs */

  /* Letter spacing */
  --ls-tracking-tight:  -0.01em;
  --ls-tracking-normal:  0em;
  --ls-tracking-wide:    0.06em;   /* use for ALL CAPS micro-labels */
  --ls-tracking-wider:   0.10em;   /* use for status bar mode labels */

}

/* Section header pattern (use for all panel section headers) */
.ls-panel-section-label {
  font-family: var(--ls-font-ui);
  font-size: var(--ls-text-xs);
  font-weight: var(--ls-weight-semibold);
  letter-spacing: var(--ls-tracking-wide);
  text-transform: uppercase;
  color: var(--ls-text-tertiary);
}

/* Monospace data pattern (use for coordinates, dimensions, costs) */
.ls-data-value {
  font-family: var(--ls-font-mono);
  font-size: var(--ls-text-sm);
  font-weight: var(--ls-weight-normal);
  font-variant-numeric: tabular-nums;
}
```

**Font loading recommendation:**

```html
<!-- In index.html <head> — preconnect first, then load -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

### 3. Icon Style — Recommendations

**Decision: Hybrid system — filled active / outlined inactive**

This is the pattern used by SketchUp (outlined), Figma (filled active states), and Vectorworks (pixel filled). It is not a choice between outlined and filled — it is both, used contextually.

#### Stroke weight and sizing

```
Toolbar icons:       20x20px, 1.5px stroke, rounded caps and joins
Panel icons:         16x16px, 1.5px stroke (same family, smaller)
Status bar icons:    14x14px, 1px stroke (very small, secondary)
Empty state icons:   32x32px, 1.5px stroke
```

#### Active state rule

When a tool is active (selected), the toolbar icon transitions from:
- Outlined stroke icon on `--ls-surface-toolbar` background
- to Filled icon on `--ls-surface-toolbar-active` background with `--ls-text-on-dark` fill

This switch from outline to fill is the single clearest "you are here" signal in a professional tool UI.

#### Category color coding (optional in Phase 2, recommended for Phase 3)

Color coding tool categories in the toolbar reduces cognitive load when scanning:

| Tool category | Icon tint (on toolbar dark bg) | Example tools |
|--------------|-------------------------------|---------------|
| Selection / navigation | `--ls-text-on-dark` (white) | Select, Pan, Zoom |
| Draw / plant | `--ls-garden-300` (muted green) | Plant, Terrain Brush |
| Structure / path | `--ls-earth-300` (muted tan) | Structure, Arc, Path |
| Annotation | `--ls-brand-300` (muted blue) | Label, Dimension, Measurement |
| Modify | `--ls-text-on-dark` (white) | Eraser, Undo, Redo |

This is additive — apply in Phase 2 after core chrome is established.

#### Lucide compatibility

The existing Lucide icon set can be retained for the Phase 2 transition. Apply these overrides:

```css
/* Toolbar icons — increase size and stroke for professional density */
.ls-toolbar-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
  stroke: var(--ls-text-on-dark);
}

/* Active tool icon */
.ls-toolbar-icon-active {
  stroke: var(--ls-text-on-dark);
  fill: var(--ls-text-on-dark);   /* switches to filled */
  opacity: 1;
}

/* Panel icons */
.ls-panel-icon {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
  stroke: var(--ls-text-secondary);
}
```

Custom icons for the domain-specific tools (Terrain Brush, Plant stamp, Arc tool) should be designed as part of the Phase 2 visual refresh — Lucide does not have equivalents.

---

### 4. Per-Mode Chrome Density Guidance

The application has three modes with distinct user mental models and appropriate chrome densities.

#### Blueprint Mode (CAD/Design — dense chrome)

This is the primary design surface. Users are placing, measuring, editing, and reviewing elements. They expect tool fluency, information density, and precise control.

**Target chrome density:** High. All panels visible by default. Status bar always present. Maximum information in minimum area.

```
Toolbar height:          48px (keep existing)
Toolbar style:           Dark bg (--ls-surface-toolbar), icon-only, grouped with 1px dividers
                         Groups: [Selection/Nav] | [Draw] | [Annotate] | [Modify]
SidePalette width:       256px (widen from 240px)
SidePalette style:       --ls-surface-panel bg, Inter 12px, 8px section padding
                         Section headers: ALL CAPS 10px with --ls-tracking-wide
InspectorPanel width:    280px (widen from default)
InspectorPanel style:    Same surface as SidePalette
                         Property groups use accordion with sticky collapsed headers
                         Coordinate/dimension values use --ls-font-mono
Status bar height:       28px
Status bar style:        --ls-surface-statusbar bg, --ls-text-on-dark-secondary text
                         Always shows: [Zoom%] [X,Y coords] [Active layer] [Snap: ON/OFF]
                         Coordinate display uses --ls-font-mono tabular-nums
Minimap:                 Default visible (not collapsed)
Grid:                    Visible at all zoom levels (major lines)
```

#### Generate Mode (AI preview — minimal chrome)

User has clicked Generate. The focus is on reviewing the AI output, adjusting parameters, and iterating. Distracting chrome should recede so the generated image is the full focus.

**Target chrome density:** Low. Most panels collapse. Only the generate options and result are visible.

```
Toolbar:                 Collapse to icon-only strip, 40px, no labels
                         Only essential tools remain: Select, Pan, Undo
SidePalette:             Collapsed to 40px icon rail, or hidden entirely
InspectorPanel:          Replaced by Generate Options panel (same width, different content)
                         Options panel style: clean white, no panel background tint
Status bar:              Hidden
Canvas:                  Full bleed, the generated image fills available area
Generate button:         --ls-color-cta amber, prominent, fixed position bottom-right
                         Label: "Generate" when idle, "Generating..." during request
Loading state:           Skeleton overlay on canvas (not full-page spinner)
                         Skeleton uses --ls-surface-panel-header pulsing animation
Error state:             Inline toast (bottom-center), not modal
```

#### Garden Management Mode (content-first — medium chrome)

This is the journal and tracking mode — viewing entries, plant health, costs, notes. The content is the primary object. Chrome supports navigation and reading, not tool use.

**Target chrome density:** Medium. Left nav replaces the tool palette. No right inspector panel unless viewing a specific plant or entry record.

```
Left nav width:          220px (narrower than Blueprint mode)
Left nav style:          --ls-surface-panel bg, content-first layout
                         Top: project name and date
                         Below: timeline, plant list, cost summary tabs
                         Navigation uses 14px Inter medium weight
Canvas:                  Reduced to a miniature overview (not the primary element)
                         Or hidden entirely in Journal view
Right panel:             Visible only when a specific entry or plant is selected
                         Shows entry detail: date, linked elements, weather, notes
                         Uses --ls-text-base at 13px, comfortable line-height 1.6
Top bar:                 Simplified — project breadcrumb + mode switcher only
                         No tool icons in this mode
Status bar:              Show project stats: [N plants] [Total cost: $X] [Last saved: time]
Typography emphasis:     Headings at --ls-text-lg, body at --ls-text-base
                         Journal entries are the most typographically generous surface in the app
```

#### Mode Switcher Design

The mode switcher should be a prominent persistent element in the top bar — not hidden in a menu. Recommended: a 3-segment tab control in the center of the top bar with labels "Blueprint", "Generate", "Garden".

```css
.ls-mode-tab {
  font-family: var(--ls-font-ui);
  font-size: var(--ls-text-sm);
  font-weight: var(--ls-weight-medium);
  letter-spacing: var(--ls-tracking-tight);
  padding: 4px 16px;
  border-radius: 6px;
  color: var(--ls-text-on-dark-secondary);
  background: transparent;
  transition: background 150ms ease, color 150ms ease;
}

.ls-mode-tab[aria-selected="true"] {
  background: var(--ls-surface-toolbar-active);
  color: var(--ls-text-on-dark);
}
```

---

### 5. Dark Mode Readiness

#### Does the proposed palette support dark mode?

Yes, with medium effort. The four-surface hierarchy and semantic token architecture are designed with dark mode in mind. The token names (e.g., `--ls-surface-panel`, `--ls-text-primary`) do not encode light-mode assumptions.

The toolbar is already dark (`--ls-surface-toolbar: #2b3a4a`) — this is intentional. A dark toolbar on a light canvas is the correct starting state for dark mode design because it separates the two surfaces conceptually before the canvas itself changes.

#### What changes for dark mode

A full dark mode would invert the surface hierarchy:

| Token | Light mode value | Dark mode value |
|-------|-----------------|-----------------|
| `--ls-surface-canvas` | `#ffffff` | `#141414` |
| `--ls-surface-panel` | `#f7f5f2` | `#1e1e1e` |
| `--ls-surface-panel-header` | `#ede9e4` | `#262626` |
| `--ls-surface-toolbar` | `#2b3a4a` | `#0f1923` |
| `--ls-surface-statusbar` | `#1e2a38` | `#0a1018` |
| `--ls-text-primary` | `#1a1612` | `#f0ede8` |
| `--ls-text-secondary` | `#4a4540` | `#b0ada8` |
| `--ls-text-tertiary` | `#7a7570` | `#706d68` |
| `--ls-border-subtle` | `#e8e4de` | `#2a2a2a` |
| `--ls-border-default` | `#d1cac0` | `#363636` |

The brand, garden, amber, and destructive color scales remain usable but the active tokens shift up the scale toward lighter values (e.g., `--ls-color-interactive` uses `--ls-brand-400` instead of `--ls-brand-500` in dark mode for appropriate contrast).

#### Recommendation

Dark mode should be planned as a Phase 3 feature after the light mode design system is stable. The token architecture in Part 1 above makes this a `[data-theme="dark"] :root { }` override block rather than a parallel design system. Estimated effort once tokens are in place: 2-3 days of token value adjustment and visual QA.

**One constraint to flag now:** The current hardcoded colors in the existing spec (`#1971c2`, `#1f2937`, `#E8A838`, `#555555`) must be replaced with token references before dark mode is attempted. Hardcoded values in component files will break dark mode even if the CSS token override is correct. This is a prerequisite tracked in BAU-30.

---

## Relationship to Existing Documents and Open Work

### Tokens that replace current hardcoded values

| Current hardcoded value | Location | Replace with token |
|------------------------|----------|--------------------|
| `#1971c2` (accent blue) | `visual-design.md`, multiple components | `--ls-color-interactive` |
| `#1f2937` (tooltip bg) | `visual-design.md` | `--ls-surface-tooltip` |
| `#E8A838` (generate button) | `visual-design.md` | `--ls-color-cta` |
| `#555555` (dimension lines) | `visual-design.md` | `--ls-text-dimension` |
| `#e5e7eb` (panel borders) | Tailwind defaults | `--ls-border-subtle` |
| `blue` (snap guides) | `visual-design.md` | `--ls-color-snap-guide` |

### Phase 2 implementation order (recommended)

1. Add the token definitions to `src/index.css` or a new `src/tokens.css`.
2. Load Inter font in `index.html` (alongside existing work in PLAN_landingpage.md Phase 2).
3. Apply `--ls-surface-toolbar` dark background to the TopToolbar component.
4. Apply `--ls-surface-panel` to SidePalette and InspectorPanel backgrounds.
5. Apply the status bar surface and add the status bar component (currently absent).
6. Migrate hardcoded colors to token references (dependency for BAU-30).
7. Apply `--ls-font-ui` (Inter) to the app root.
8. Apply `--ls-font-mono` to coordinate and dimension displays.
9. Apply panel section label pattern to all accordion/section headers.
10. Review icon sizes and stroke weights; apply toolbar overrides.

This order is safe because each step is additive and visually progressive — the UI becomes more professional at each step without requiring a complete rework before any step is functional.
