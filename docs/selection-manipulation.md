# Selection & Manipulation

All element types (terrain, plants, structures, paths, labels, yard boundary) can be selected and manipulated.

## Select Tool (V)

### Single Select

Click an element to select it. Shows a bounding box with resize handles. The inspector shows that element's properties.

### Selection Priority

When elements overlap at the click point, the topmost in render order is selected: labels > plants > structures > paths > terrain. Within the same layer, the most recently added element wins. See [spatial-math-specification.md "## 7. Selection & Hit Testing"] for per-element-type hit tests.

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

Ctrl+C copies the selection. Ctrl+V pastes at the current cursor position, snapped to 10cm increments. Pasted elements become the active selection.

## Undo & Redo

Ctrl+Z undoes the last action. Ctrl+Shift+Z redoes. The history stack is in-memory (resets on page reload).

## Resize

| Element type | Resize behavior |
|-------------|----------------|
| Terrain | Drag edges, snap to 10cm increments |
| Structures | Drag edges, snap to 10cm increments |
| Labels | Drag handles to resize text box, text wraps |
| Plants | No resize (size from spacingCm) |
| Paths | Edit segment endpoints and arc radii via handles |

## Rotation

Only structures can rotate (around center point). Terrain, plants, labels, and paths have no rotation handle. See [spatial-math-specification.md "## 8. Rotation"].

## Eraser Tool (E)

The eraser removes any element the cursor touches:
- Click on any element (terrain cell, plant, structure, path, label) to remove it
- Click and drag to remove all elements the cursor passes over

The eraser is a deletion tool, not a selection tool — it removes immediately without selecting first.

## Inspector (Multi-Select)

When multiple elements are selected, the inspector shows properties of the first (primary) selected element.
