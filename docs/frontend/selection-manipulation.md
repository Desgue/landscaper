# Selection & Manipulation

All element types (terrain, plants, structures, paths, labels, dimensions, yard boundary) can be selected and manipulated. Selection respects layer visibility and locking [layers-groups.md "## Layer Visibility"].

## Select Tool (V)

### Single Select

Click an element to select it. Shows a bounding box with resize handles. The inspector shows that element's properties.

### Selection Priority

When elements occupy the same position, the topmost in render order is selected: dimensions > labels > plants > structures > paths > terrain > yard boundary. Within the same type layer, the element with the latest `createdAt` timestamp wins. See [spatial-math-specification.md "## 7. Selection & Hit Testing"] for per-element-type hit tests, and [canvas-viewport.md "### Selection Priority"] for the full priority list.

Elements on **hidden layers** are not hit-testable (skipped entirely). Elements on **locked layers** are visible but not selectable — clicks pass through to the next element in priority. See [layers-groups.md "## Layer Visibility"] and [layers-groups.md "## Layer Locking"].

**Tab cycling**: After clicking, press Tab to cycle through all elements at the click point, from topmost to bottommost. This allows selecting lower-layer elements without moving the top one.

### Multi-Select

Shift+click adds to the current selection.

### Box Select

Drag on empty space to draw a selection box. By default, only elements **fully enclosed** by the box are selected. Shift+drag selects elements that **partially intersect** the box. Box select only affects elements on visible, unlocked layers.

When a box select fully encloses any element of a group, the entire group is selected [layers-groups.md "### Box Select"].

### Deselect

Click empty canvas space (without Shift) to deselect all. Inspector shows "Nothing selected."

## Move

Free drag by default — elements follow the cursor without snapping. Alt+drag enables snapping (10cm grid + geometry snapping) [snap-system.md "## Alt Modifier Behavior"].

## Delete

Delete or Backspace removes all selected elements.

## Copy & Paste

Ctrl+C copies the selection. Ctrl+V pastes with an offset of +20cm from the original position, snapped to 10cm increments. Elements maintain their relative positions within the group. Pasted elements become the active selection. If a group was copied, the pasted elements form a new group with a new group ID.

## Undo & Redo

Ctrl+Z undoes the last action. Ctrl+Shift+Z redoes.

### History Persistence

The undo/redo history is persisted to IndexedDB per project [persistence-projects.md "## History Storage"]. History survives page reloads and browser restarts. On project load, the history is restored from IndexedDB. If the stored history is unavailable or corrupted, the project opens with an empty history (no error shown).

### History Cap

The history stores the last 200 actions. When the cap is reached, the oldest actions are dropped. This prevents unbounded memory and storage growth on long editing sessions.

## Resize

| Element type | Resize behavior |
|-------------|----------------|
| Terrain | No resize (always 100×100cm, one grid cell) |
| Structures | Drag edges, snap to 10cm increments |
| Labels | Drag handles to resize text box, text wraps |
| Plants | No resize (size from spacingCm) |
| Paths | Edit segment endpoints and arc radii via handles |
| Dimensions | No resize (drag endpoints to reposition) |

Alt disables snap during resize [snap-system.md "## Alt Modifier Behavior"].

## Rotation

Only structures can rotate (around center point). Terrain, plants, labels, and paths have no rotation handle. See [spatial-math-specification.md "## 8. Rotation"].

## Eraser Tool (E)

The eraser removes the **topmost** element at the cursor position, following selection priority (dimensions > labels > plants > structures > paths > terrain > yard boundary):
- Click to remove the topmost element under the cursor
- Click and drag to remove the topmost element at each position the cursor passes over

To erase a lower-layer element, remove the top layer first or select the target element directly (via Tab cycling) and press Delete. The eraser is a deletion tool, not a selection tool — it removes immediately without selecting first.

## Group Selection

Groups behave as a single selectable unit [layers-groups.md "## Group Behavior"]:

- **Click** any element in a group → the entire group is selected (bounding box encompasses all group elements)
- **Double-click** a group → enters group editing mode (individual elements become selectable)
- **Escape** or click outside → exits group editing mode
- **Shift+click** → adds the group to multi-selection
- **Move** a selected group → all elements move together
- **Delete** a selected group → all elements in the group are deleted
- **Copy/paste** a group → all elements are duplicated as a new group

See [layers-groups.md "## Grouping"] for grouping/ungrouping shortcuts and constraints.

## Inspector Panel

The inspector shows type-specific properties for the selected element. Field details are defined in each element doc:
- [terrain.md "## Inspector"]
- [plants.md "## Inspector"]
- [structures.md "## Inspector"]
- [paths-borders.md "## Inspector"]
- [labels.md "## Inspector"]
- [measurement-dimensions.md "## Inspector"]
- [layers-groups.md "## Inspector"] (for groups)

When an element is selected, the inspector also shows:
- Linked journal entries [journal.md "## Element Linking"]
- Derived cost from registry type [cost-tracking.md "## Inspector Integration"]
- Area and perimeter where applicable [measurement-dimensions.md "## Area & Perimeter Display"]
- Layer assignment (dropdown to change) [layers-groups.md "### Change Element Layer"]

When multiple elements are selected, the inspector shows properties of the first-clicked (primary) element — the user's explicit selection choice. Nothing selected: inspector shows "Nothing selected."
