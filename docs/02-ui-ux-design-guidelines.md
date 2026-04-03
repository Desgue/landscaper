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

### Tooltips

- Every toolbar button, palette item, and interactive icon must have a tooltip on hover
- Tooltips show the action name and keyboard shortcut (e.g. "Select (V)", "Terrain Brush (B)")
- Short delay before showing (~300ms), dismiss on mouse leave
- Consistent positioning: below toolbar buttons, to the right of palette items

### Top Toolbar

Inspired by Excalidraw's toolbar. Tools (left to right):
- **Select** (V) — default pointer tool
- **Hand/Pan** (H) — drag canvas
- **Terrain brush** (B) — paint terrain onto grid cells
- **Plant tool** (P) — place plants
- **Structure tool** (S) — place structures (walls, fences, raised beds)
- **Eraser** (E) — remove elements
- **Text/Label** (T) — add annotations
- **Undo/Redo** — always visible

### Side Palette

- Collapsible panel on the left (like Garden Planner's toolbar)
- Tabs or sections: Terrain | Plants | Structures
- Search/filter within palette
- Drag from palette onto canvas, or click palette then click canvas

### Inspector Panel

- Right side, collapsible
- Shows properties of selected element
- Terrain: type, dimensions
- Plant: name, planted date, spacing, notes
- Empty state: "Nothing selected"

### Minimap

- Bottom-right corner, collapsible
- Shows full garden extent with viewport indicator

## Interaction Patterns

### Canvas Navigation
- **Pan**: Middle-click drag, Space+drag, two-finger drag
- **Zoom**: Ctrl+scroll, pinch, +/- buttons in status bar
- **Fit to view**: Double-click minimap or shortcut (Ctrl+Shift+1)

### Placing Elements
- Click tool in toolbar → click/drag on canvas
- Drag from palette → drop on canvas
- Grid snapping by default, hold Alt to disable snap

### Selection
- Click to select single element
- Shift+click to add to selection
- Click+drag on empty space for box select
- Selected elements show resize handles + bounding box

### Terrain Painting
- Select terrain type → click/drag to paint cells
- Brush size configurable (1x1, 2x2, 3x3, custom)
- Paint fills grid cells with terrain texture/color
- Option to disable grid snapping for freeform placement

## Visual Language

### Color Palette
- TODO: Define primary, secondary, accent colors
- Canvas background: light gray or white with subtle grid lines
- Terrain textures: realistic but stylized (not photographic, not hand-drawn)
- UI chrome: neutral, doesn't compete with garden content

### Typography
- TODO: Choose font families
- UI: clean sans-serif (Inter, system fonts)
- Canvas labels: same sans-serif, adjustable size

### Icons
- Toolbar icons: outlined, monochrome (like Excalidraw)
- Plant icons: colored, top-down view illustrations
- Terrain: tiling texture patterns

### Grid Appearance
- Default: subtle dotted grid (like Excalidraw)
- Optional: solid grid lines (like Garden Planner)
- Grid lines fade at low zoom, become prominent at high zoom

## Responsive Behavior

- Desktop-first (1024px+ primary target)
- Tablet: side panels collapse to icons, toolbar remains
- Mobile: simplified view, limited editing, good for journal viewing

## Accessibility

- Keyboard navigation for all tools (see shortcuts in toolbar)
- Sufficient contrast ratios for all UI text
- Screen reader labels for toolbar actions
- Focus indicators on interactive elements

## Resolved Design Decisions

- No measure tool — removed from toolbar
- Structures palette is part of MVP (not future)
- Terrain painting is grid-cell-based with optional grid-snap disable

## Open Design Questions

- [ ] Hand-drawn sketch aesthetic (Excalidraw) vs clean/flat (Garden Planner)?
- [ ] Dark mode support?
- [ ] Terrain: texture fills vs solid colors vs pattern fills?
- [ ] Plant icon style: top-down realistic, isometric, or flat icon?
