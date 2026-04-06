# Keyboard Shortcuts Reference

This is the single source of truth for all keyboard shortcuts. Other docs reference this file.

## Tools

| Shortcut | Action |
|----------|--------|
| V | Select tool |
| H | Hand/Pan tool (click+drag to pan) |
| B | Terrain brush |
| P | Plant placement tool |
| S | Structure tool |
| A | Arc tool |
| E | Eraser (removes topmost element on click/drag) [selection-manipulation.md "## Eraser Tool (E)"] |
| T | Text/Label tool |
| M | Measurement tool (click two points to measure distance) [measurement-dimensions.md "## Measurement Tool (M)"] |

Note: Path tool has no shortcut — activated via the Paths tab in the side palette. Undo/Redo are toolbar buttons — see Ctrl+Z / Ctrl+Shift+Z in [## Selection & Manipulation].

## Canvas Navigation

| Shortcut | Action |
|----------|--------|
| Space+drag | Pan canvas |
| Middle-click+drag | Pan canvas |
| Two-finger drag | Pan canvas (trackpad) |
| Ctrl+Scroll | Zoom in/out |
| Pinch | Zoom in/out (trackpad) |
| +/- | Zoom in/out (status bar buttons) |
| Ctrl+Shift+1 | Fit to view |
| Double-click minimap | Fit to view |

## Selection & Manipulation

| Shortcut | Action |
|----------|--------|
| Click | Select element |
| Shift+Click | Add to selection |
| Click+drag (empty area) | Box select (fully enclosed) |
| Shift+Click+drag (empty area) | Box select (partial intersection) |
| Delete / Backspace | Delete selected |
| Ctrl+C | Copy |
| Ctrl+V | Paste at cursor position |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Alt+drag (selected elements) | Move with snapping (10cm + geometry) |
| Tab | Cycle through overlapping elements at click point |

## Groups

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+G | Group selected elements [layers-groups.md "## Grouping"] |
| Ctrl+Shift+U | Ungroup selected group [layers-groups.md "## Ungroup"] |
| Double-click group | Enter group (edit individual elements) |
| Click outside group | Exit group editing |

## Toggles

| Shortcut | Action |
|----------|--------|
| Ctrl+G | Toggle snap on/off |
| Ctrl+' | Toggle grid visibility on/off |

## Modifiers

Alt behavior is context-dependent:

| Shortcut | Action |
|----------|--------|
| Alt (while placing/painting with Terrain, Plant, Structure, Arc, Path, or Eraser) | Disable snapping (10cm + geometry) |
| Alt (while moving selected elements) | Enable snapping (moves default to free) |
| Alt (while placing with Text/Label or Measurement tool) | Enable snapping (labels and measurements default to free placement) |
| Alt (while using Hand/Pan tool) | No effect |
