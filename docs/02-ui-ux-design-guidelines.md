# UI/UX Design Guidelines

## Design Principles

1. **Canvas-first**: The garden canvas is the hero. Chrome (toolbars, panels) should be minimal and non-intrusive.
2. **Direct manipulation**: Grab, drag, paint, place. Reduce modal dialogs and form-filling.
3. **Progressive disclosure**: Show basic tools upfront, reveal advanced options on demand.
4. **Forgiving**: Generous undo/redo. Hard to make irreversible mistakes.
5. **Domain-appropriate**: Use garden-relevant visuals (textures, icons) but keep the UI framework clean and modern like Excalidraw.

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
│  Status bar: zoom %, coordinates, grid scale             │
└─────────────────────────────────────────────────────────┘
```

### Top Toolbar

Inspired by Excalidraw's toolbar. Tools (left to right) — see `docs/06-keyboard-shortcuts.md` for shortcuts:
- Select (V), Hand/Pan (H), Terrain Brush (B), Plant Tool (P), Structure Tool (S), Eraser (E), Text/Label (T), Undo/Redo

### Side Palette (left, collapsible)

- Tabs: Terrain | Plants | Structures
- Search/filter across all tabs (auto-switches to matching tab)
- Click item to activate stamp mode, or drag onto canvas

### Inspector Panel (right, collapsible)

- Shows properties of the selected element (type-specific fields)
- Multiple selection: shows primary (first) selected element
- Empty state: "Nothing selected"

### Status Bar (bottom)

- Current zoom %, cursor world coordinates in meters (updates in real-time)

### Minimap (bottom-right, collapsible)

- Shows full garden extent with viewport indicator
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
- Terrain textures: realistic but stylized (not photographic, not hand-drawn)
- UI chrome: neutral, doesn't compete with garden content

### Typography
- Font: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)
- Canvas labels: same system font stack, adjustable size

### Icons
- Toolbar icons: outlined, monochrome (like Excalidraw)
- Plant icons: flat colored top-down illustrations
- Terrain: solid colors in MVP, tiling texture patterns in Phase 2

### Grid Appearance
- Default: subtle dotted grid (like Excalidraw)
- Grid lines fade at low zoom, become prominent at high zoom

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

For all interaction details (placement mechanics, grid snapping, selection, canvas navigation, etc.), see `docs/03-behavior-specifications.md`.

## Resolved Design Decisions

- Visual aesthetic: semi-realistic (stylized but somewhat realistic)
- Dark mode: no, light theme only for MVP
- Terrain rendering: solid colors in MVP, textures in Phase 2
- Plant icon style: flat colored top-down icons
- Brush size (1x1, 2x2, 3x3) included in MVP as a UI-only tool setting
