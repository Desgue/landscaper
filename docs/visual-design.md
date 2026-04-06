# Visual Design

Cross-cutting visual and interaction design reference. For behavioral details, see the relevant domain document.

## Design Principles

1. **Canvas-first**: yard canvas is the hero, chrome is minimal
2. **Direct manipulation**: grab, drag, paint, place — minimize dialogs
3. **Progressive disclosure**: basic tools upfront, advanced on demand
4. **Forgiving**: generous undo/redo, hard to make irreversible mistakes
5. **Domain-appropriate**: landscape-relevant visuals, clean modern framework

## Layout

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

Tools: Select (V), Hand/Pan (H), Terrain Brush (B), Plant (P), Structure (S), Arc (A), Eraser (E), Text/Label (T), Undo/Redo. Active tool highlighted blue (#1971c2). See [keyboard-shortcuts.md "## Tools"].

### Side Palette

Left, collapsible. Tabs: Terrain | Plants | Structures | Paths. Search field filters across all tabs, auto-switches to matching tab. Click item for stamp mode. Drag item to canvas.

### Inspector Panel

Right, collapsible. Type-specific properties for the selected element. Multi-select: shows primary (first) element. Empty: "Nothing selected."

### Tooltips

Every toolbar button, palette item, and interactive icon. Shows action name + shortcut (e.g., "Select (V)"). 300ms delay, dismiss on mouse leave. Below toolbar buttons, right of palette items.

## Color Palette

- UI chrome: white backgrounds, subtle gray borders
- Accent: blue #1971c2 (active tool, selection, primary buttons, snap guides)
- Canvas background: light gray or white
- Yard boundary: distinct outline (dashed blue or dark gray)
- Overflow area: subtly dimmed
- Snap guides: accent blue, thin, 50% opacity

## Terrain Rendering

Solid colors in MVP. Phase 2 target: realistic but stylized tiling textures (not photographic, not hand-drawn).

## Typography

System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Canvas labels: same stack, adjustable size.

## Icons

- Toolbar: outlined, monochrome
- Plants: flat colored top-down illustrations
- Terrain: solid color swatches (MVP)

## Grid Appearance

Major lines (1m): subtle dotted, always visible. Minor lines (10cm): lighter dotted, appear when zoomed in. Visually distinguishable by weight or opacity.

## Responsive

Desktop-first (1024px+). Tablet: side panels collapse to icons, toolbar remains. Mobile: simplified view, limited editing, good for journal viewing.

## Accessibility

- Keyboard navigation for all tools [keyboard-shortcuts.md]
- Sufficient contrast ratios for all UI text
- Screen reader labels for toolbar actions
- Focus indicators on interactive elements
