# Canvas & Viewport

The canvas is bounded to the user's yard dimensions with overflow. All coordinates are stored internally in centimeters. User-facing displays show meters.

## Bounded Canvas

The canvas working area corresponds to the yard boundary defined during setup [yard-setup.md "## Completion"]. The yard boundary is visually distinct (dashed outline, rendered above terrain in the layer order). The area outside the boundary is dimmed but functional — see "## Overflow Dimming" and "## Collision Rules" for details.

## Coordinate System

World units: centimeters. Display: meters with cm precision (e.g., `12.45m`). The canvas uses HTML Canvas conventions: the y-axis points down (increasing Y = moving down on screen). See [spatial-math-specification.md "## 5. Arc Geometry"] for how this affects arc direction flags.

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
- Minor grid lines at 10cm intervals — appear at zoom >= 1.0, lighter than major lines
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
2. Overflow dim overlay (outside yard boundary only — see Overflow Dimming below)
3. Terrain
4. Yard boundary (dashed outline)
5. Paths/borders
6. Structures
7. Plants
8. Labels
9. Selection overlay, handles, guides (UI layer)

## Overflow Dimming

The area outside the yard boundary polygon is covered by a semi-transparent overlay (background color, 40–50% opacity) rendered above the grid but below terrain (layer 2). Elements placed outside the yard render at full opacity on the dimmed background — they are fully selectable, editable, and movable.

When no yard boundary is defined (null or deleted), no overflow dimming is applied — the entire canvas is treated as unbounded. See [yard-setup.md "## Boundary Deletion"] for the user-facing behavior.

An element is considered "inside" the yard only if **all** corners of its bounding box are inside the yard boundary polygon. If any corner falls outside, the element's background area is dimmed. The point-in-polygon test uses the ray casting algorithm [spatial-math-specification.md "### Point-in-Polygon Test"].

## Collision Rules

Elements follow realistic placement constraints. When a placement violates a collision rule, the element is shown as a **red ghost** (semi-transparent red outline) at the cursor position and placement is blocked until the user moves to a valid location.

### Collision Matrix

| Placed element | Blocked by | Allowed on |
|----------------|-----------|------------|
| Structure | Other structures, paths | Terrain (any type) |
| Plant | Other plants within spacing radius, structures that don't allow plants, other plants' spacing perimeter | Terrain, bed/planter structures (`category: "container"`), paths |
| Path | Structures | Terrain, other paths, plants |
| Terrain | Nothing | Everywhere (ground layer, always paintable) |
| Label | Nothing | Everywhere (annotations, no physical presence) |

### Rule Details

**Structures block structures**: Two structures cannot overlap. Their bounding boxes (accounting for rotation) must not intersect.

**Plants respect spacing**: `spacingCm` is the minimum center-to-center distance for a plant type. Each plant's collision radius is `spacingCm / 2`. Two plants cannot be placed such that their spacing circles overlap: `distance(centerA, centerB) < (spacingA + spacingB) / 2`. This enforces realistic planting distances.

**Structures block plants (with exceptions)**: Plants cannot be placed inside structures by default. However, structures with `category: "container"` (raised beds, garden beds, planters) accept plants inside their bounds. See [data-schema.md "### Structure Type"] for category semantics.

**Paths block structures**: Structures cannot be placed overlapping a path, and vice versa. A brick wall cannot cross a brick path. Paths have a real-world width (e.g., brick edging = 10cm) used for collision detection. See [spatial-math-specification.md "## 6. Path Segment Connectivity"] for width rendering.

**Terrain is always free**: Terrain cells are the ground layer and can be painted anywhere regardless of other elements.

**Labels are always free**: Labels are non-physical annotations and can be placed anywhere.

### Collision Detection

Collision checks use AABB (axis-aligned bounding box) tests for rectangular elements and circle-distance tests for plants. For rotated structures, compute the oriented bounding box or use the AABB of the rotated shape. See [spatial-math-specification.md "## 7. Selection & Hit Testing"] for per-element-type geometry.

### Selection Priority

When elements occupy the same position, click-selection follows this priority (topmost wins):

1. Labels
2. Plants
3. Structures
4. Paths
5. Terrain
6. Yard boundary (lowest)

Within the same type layer, `zIndex` takes precedence — higher `zIndex` wins. If `zIndex` is equal, the element with the latest `createdAt` timestamp wins [data-schema.md "### Z-Index"]. **Tab** cycles through all overlapping elements at the click point, from topmost to bottommost.

### Eraser Behavior

The eraser removes the **topmost** element at the cursor position (following selection priority). To erase deeper elements, erase the top layer first or select the target element directly.
