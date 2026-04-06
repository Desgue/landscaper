# UI/UX Design Guidelines

## Design Principles

1. **Canvas-first**: The yard canvas is the hero. Chrome (toolbars, panels) should be minimal and non-intrusive.
2. **Direct manipulation**: Grab, drag, paint, place. Reduce modal dialogs and form-filling.
3. **Progressive disclosure**: Show basic tools upfront, reveal advanced options on demand.
4. **Forgiving**: Generous undo/redo. Hard to make irreversible mistakes.
5. **Domain-appropriate**: Use landscape-relevant visuals (textures, icons) but keep the UI framework clean and modern.

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Logo          Top Toolbar (tools)          Project Menu │
├────────┬────────────────────────────────────┬────────────┤
│        │                                    │            │
│ Side   │                                    │ Inspector  │
│ Palette│         Canvas (main area)         │ Panel      │
│        │                                    │ (context)  │
│        │                                    │            │
├────────┴────────────────────────────────────┴────────────┤
│  Status bar: zoom %, coordinates, snap/grid toggles      │
└─────────────────────────────────────────────────────────┘
```

### Top Toolbar

Tools (left to right) — see `docs/06-keyboard-shortcuts.md` for shortcuts:
- Select (V), Hand/Pan (H), Terrain Brush (B), Plant Tool (P), Structure Tool (S), Arc Tool (A), Eraser (E), Text/Label (T), Undo/Redo

### Side Palette (left, collapsible)

- Tabs: Terrain | Plants | Structures | Paths
- Search/filter across all tabs (auto-switches to matching tab)
- Click item to activate stamp mode, or drag onto canvas

### Inspector Panel (right, collapsible)

- Shows properties of the selected element (type-specific fields)
- Structures: includes shape (straight/curved) and arc radius when curved
- Paths: includes segment details (straight/curved per segment), width, total length
- Multiple selection: shows primary (first) selected element
- Empty state: "Nothing selected"

### Status Bar (bottom)

- Current zoom %, cursor world coordinates in meters (cm precision)
- Snap toggle indicator (on/off)
- Grid visibility toggle indicator (on/off)

### Minimap (bottom-right, collapsible)

- Shows yard boundary outline and all elements
- Viewport rectangle indicator
- Click to navigate, double-click to fit-to-view

### Tooltips

- Every toolbar button, palette item, and interactive icon has a tooltip on hover
- Tooltips show action name and keyboard shortcut (e.g., "Select (V)")
- Short delay (~300ms), dismiss on mouse leave
- Positioning: below toolbar buttons, to the right of palette items

## Visual Language

### Color Palette
- UI chrome: white backgrounds, subtle gray borders
- Accent color: blue (#1971c2) for active tool highlights, selection indicators, primary buttons
- Canvas background: light gray or white with subtle grid lines
- Yard boundary: distinct outline (e.g., dashed blue or dark gray)
- Overflow area (outside boundary): subtly dimmed
- Terrain textures: realistic but stylized (not photographic, not hand-drawn)
- UI chrome: neutral, doesn't compete with yard content
- Snap guides: accent blue, thin lines appearing during placement

### Typography
- Font: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)
- Canvas labels: same system font stack, adjustable size

### Icons
- Toolbar icons: outlined, monochrome
- Plant icons: flat colored top-down illustrations
- Terrain: solid colors in MVP, tiling texture patterns in Phase 2

### Grid Appearance
- Major grid lines (1m): subtle dotted, always visible
- Minor grid lines (10cm): lighter dotted, appear when zoomed in
- Major and minor lines are visually distinguishable (weight or opacity)

## Responsive Behavior

- Desktop-first (1024px+ primary target)
- Tablet: side panels collapse to icons, toolbar remains
- Mobile: simplified view, limited editing, good for journal viewing

## Accessibility

- Keyboard navigation for all tools (see `docs/06-keyboard-shortcuts.md`)
- Sufficient contrast ratios for all UI text
- Screen reader labels for toolbar actions
- Focus indicators on interactive elements

## Interaction Behaviors

For all interaction details (placement mechanics, snap system, selection, canvas navigation, etc.), see `docs/03-behavior-specifications.md`.

## Resolved Design Decisions

- Visual aesthetic: semi-realistic (stylized but somewhat realistic)
- Dark mode: no, light theme only for MVP
- Terrain rendering: solid colors in MVP, textures in Phase 2
- Plant icon style: flat colored top-down icons
- Brush size (1x1, 2x2, 3x3) included in MVP as a UI-only tool setting
- Grid: multi-resolution (1m major, 10cm minor) — not single resolution
- Snap: decoupled from grid display, independently toggleable
- Snap: 10cm default increment with geometry snapping (edge, perpendicular, midpoint)
- Canvas: bounded with overflow, not infinite
- Yard boundary: regular editable element, not locked
- Arc tool: click-start, click-end, drag-radius interaction
- Paths/borders: distinct element type with per-segment straight/curved
