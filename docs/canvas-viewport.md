# Canvas & Viewport

The canvas is bounded to the user's yard dimensions with overflow. All coordinates are stored internally in centimeters. User-facing displays show meters.

## Bounded Canvas

The canvas working area corresponds to the yard boundary defined during setup [yard-setup.md "## Complete yard setup"]. The yard boundary is visually distinct (dashed outline). The area outside the boundary is dimmed but functional — elements placed outside are fully selectable, editable, and movable.

## Coordinate System

World units: centimeters. Display: meters with cm precision (e.g., `12.45m`).

Transforms between world and screen coordinates use the viewport's pan offset and zoom scale. See [spatial-math-specification.md "## 1. Coordinate System"] for formulas, matrix form, and Konva integration.

Zoom range: 0.05 to 10.0. Never round world coordinates — only round to integer pixels at final render.

## Pan

Three methods, all equivalent:
- Middle-click drag
- Space+drag (suppresses active tool, releasing Space returns to previous tool)
- Two-finger drag (trackpad)

### Hand/Pan Tool (H)

When the Hand/Pan tool is active, left-click drag pans the canvas. No elements are selected or modified. Cursor shows a grab/hand icon.

## Zoom

- Ctrl+scroll: zoom toward/away from cursor position
- Pinch gesture: zoom toward/away from pinch center
- +/- buttons in status bar

Zoom-toward-cursor formula: the world point under the cursor stays fixed after zoom. See [spatial-math-specification.md "### Zoom Toward Cursor"].

### Fit to View

Ctrl+Shift+1 or double-click minimap: viewport adjusts to show all elements with padding, zoom set so everything fits. See [spatial-math-specification.md "### Fit-to-View"] for AABB computation.

## Multi-Resolution Grid

- Major grid lines at 1-meter intervals — always visible at any zoom level, subtle dotted
- Minor grid lines at 10cm intervals — appear when zoomed in past a threshold, lighter than major lines
- Grid visibility is toggleable independently of snap (Ctrl+') [keyboard-shortcuts.md "## Toggles"]

## Rulers

Visible along the top and left edges of the canvas. Major markings at 1m, minor markings at 10cm (visible when zoomed in). Rulers update in real-time with pan and zoom.

## Status Bar

- Current zoom percentage
- Cursor world coordinates in meters (cm precision, updates in real-time)
- Zoom +/- buttons
- Snap toggle indicator (on/off)
- Grid visibility toggle indicator (on/off)

## Minimap

Bottom-right corner, collapsible. Shows yard boundary outline and a scaled-down view of all elements. A rectangle indicates the current viewport position. Click to pan to that position. Double-click to fit-to-view.

## Render Layer Order (bottom to top)

1. Grid lines (background)
2. Terrain
3. Paths/borders
4. Structures
5. Plants
6. Labels
7. Selection overlay, handles, guides (UI layer)
