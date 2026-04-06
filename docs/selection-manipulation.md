# Selection & Manipulation

All element types (terrain, plants, structures, paths, labels, yard boundary) can be selected and manipulated.

## Select Tool (V)

### Single Select

Click an element to select it. Shows a bounding box with resize handles. The inspector shows that element's properties.

### Selection Priority

When elements occupy the same position, the topmost in render order is selected: labels > plants > structures > paths > terrain > yard boundary. Within the same layer, the element with the latest `createdAt` timestamp wins. See [spatial-math-specification.md "## 7. Selection & Hit Testing"] for per-element-type hit tests.

**Tab cycling**: After clicking, press Tab to cycle through all elements at the click point, from topmost to bottommost. This allows selecting lower-layer elements without moving the top one.

### Multi-Select

Shift+click adds to the current selection.

### Box Select

Drag on empty space to draw a selection box. By default, only elements **fully enclosed** by the box are selected. Shift+drag selects elements that **partially intersect** the box.

### Deselect

Click empty canvas space (without Shift) to deselect all. Inspector shows "Nothing selected."

## Move

Free drag by default — elements follow the cursor without snapping. Alt+drag enables snapping (10cm grid + geometry snapping) [snap-system.md "## Alt Modifier Behavior"].

## Delete

Delete or Backspace removes all selected elements.

## Copy & Paste

Ctrl+C copies the selection. Ctrl+V pastes at the current cursor position, snapped to 10cm increments. The pasted group's AABB (axis-aligned bounding box) center is placed at the cursor position. Elements maintain their relative positions within the group. Pasted elements become the active selection.

## Undo & Redo

Ctrl+Z undoes the last action. Ctrl+Shift+Z redoes. The history stack is in-memory (resets on page reload). A `beforeunload` prompt warns the user that undo history will be lost when leaving the page.

## Resize

| Element type | Resize behavior |
|-------------|----------------|
| Terrain | No resize (always 100×100cm, one grid cell) |
| Structures | Drag edges, snap to 10cm increments |
| Labels | Drag handles to resize text box, text wraps |
| Plants | No resize (size from spacingCm) |
| Paths | Edit segment endpoints and arc radii via handles |

Alt disables snap during resize [snap-system.md "## Alt Modifier Behavior"].

## Rotation

Only structures can rotate (around center point). Terrain, plants, labels, and paths have no rotation handle. See [spatial-math-specification.md "## 8. Rotation"].

## Eraser Tool (E)

The eraser removes the **topmost** element at the cursor position, following selection priority (labels > plants > structures > paths > terrain > yard boundary):
- Click to remove the topmost element under the cursor
- Click and drag to remove the topmost element at each position the cursor passes over

To erase a lower-layer element, remove the top layer first or select the target element directly (via Tab cycling) and press Delete. The eraser is a deletion tool, not a selection tool — it removes immediately without selecting first.

## Inspector Panel

The inspector shows type-specific properties for the selected element. Field details are defined in each element doc:
- [terrain.md "## Inspector"]
- [plants.md "## Inspector"]
- [structures.md "## Inspector"]
- [paths-borders.md "## Inspector"]
- [labels.md "## Inspector"]

When an element is selected, the inspector also shows linked journal entries [journal.md "## Element Linking"].

When multiple elements are selected, the inspector shows properties of the first-clicked (primary) element — the user's explicit selection choice. Nothing selected: inspector shows "Nothing selected."
