# Layers & Groups

Layers organize elements into visibility and lock groups. Groups combine elements into a single selectable unit. Neither feature affects the canvas render order, which remains type-based [canvas-viewport.md "## Render Layer Order (bottom to top)"].

## Layer Model

Every element belongs to exactly one layer [data-schema.md "### Layer & Group Assignment"]. Layers are named, user-created, and stored at the project level [data-schema.md "## Layer Schema"].

Every project starts with a single layer named "Default". The default layer cannot be deleted but can be renamed. New elements are placed on the **active layer** — the layer currently selected in the layer panel.

## Layer Panel

The layer panel is on the right side, below the inspector [visual-design.md "### Layer Panel"]. It shows all layers in a vertical list ordered by `order` (drag to reorder). Each layer row shows:

- **Name** (double-click to rename)
- **Visibility toggle** (eye icon) — see [## Layer Visibility]
- **Lock toggle** (lock icon) — see [## Layer Locking]
- **Active indicator** — highlighted background for the currently active layer

Click a layer to make it the active layer. Right-click for context menu: Rename, Delete, Merge Down, Select All on Layer.

## Layer Visibility

Toggling a layer's visibility hides all elements on that layer:

- **Hidden**: elements are not rendered, not selectable, not hit-testable. They behave as if they don't exist for interaction purposes. They are still included in JSON export and cost calculations (by default — see [cost-tracking.md "## Cost Calculation Rules"]).
- **Visible**: normal behavior.

Hiding a layer does not deselect elements that were selected on it — the selection is cleared when the layer becomes hidden.

## Layer Locking

Toggling a layer's lock prevents editing of all elements on that layer:

- **Locked**: elements are visible and rendered normally but cannot be selected, moved, resized, rotated, or deleted. A subtle visual indicator (reduced opacity or lock badge) distinguishes locked elements. Click on a locked element does nothing — selection passes through to the next element in selection priority [canvas-viewport.md "### Selection Priority"].
- **Unlocked**: normal behavior.

Locking a layer deselects any selected elements on it.

The per-element `locked` field [data-schema.md "### Locked"] provides independent locking: an element can be locked individually even if its layer is unlocked. Effective lock state = `layer.locked OR element.locked`.

## Layer Operations

### Create

"New Layer" button at the bottom of the layer panel. Creates a layer with auto-generated name ("Layer 2", "Layer 3", etc.) and makes it the active layer.

### Delete

Deleting a layer moves all its elements to the default layer. The default layer cannot be deleted. Confirmation prompt before deletion.

### Merge Down

Merges the selected layer into the layer below it in the panel. All elements are moved to the target layer. The merged layer is removed. Groups whose members are on the source layer are preserved — the group's `layerId` is updated to the target layer along with its members (since groups require all members to share a layer [## Grouping]).

### Select All on Layer

Selects all elements on the chosen layer (visible and unlocked elements only). Useful for bulk operations — move an entire layer's contents, copy to another project, etc.

### Change Element Layer

An element's layer can be changed via the inspector (dropdown showing all layers) or by dragging the element in the layer panel. Moving an element to a different layer updates its `layerId`.

## Grouping

Select multiple elements and press Ctrl+Shift+G to group them [keyboard-shortcuts.md "## Groups"]. Groups are flat — no nesting. An element can belong to at most one group. Groups are stored at the project level [data-schema.md "## Group Schema"].

### Constraints

- All elements in a group must be on the same layer. If the selected elements span multiple layers, they are all moved to the active layer before grouping. A non-blocking warning is shown: "Elements moved to [active layer name] for grouping."
- Minimum 2 elements to form a group.
- An element already in a group must be ungrouped first before joining a new group.

## Group Behavior

### Selection

- **Click** on any element in a group → selects the entire group. The bounding box encompasses all group elements.
- **Double-click** on a group → enters the group. Individual elements become selectable and editable. A subtle visual border indicates "group editing mode."
- **Click outside** the group (or press Escape) → exits group editing mode.
- **Shift+click** → adds the group to multi-selection (selects the whole group, not individual elements).

### Move

Dragging a selected group moves all elements together, maintaining their relative positions. Snap applies to the group's bounding box edges [snap-system.md "## Geometry Snap"].

### Delete

Deleting a selected group deletes all elements in it. The group is removed from `project.groups[]`.

### Copy & Paste

Ctrl+C on a group copies all elements. Ctrl+V pastes them as a new group with new element IDs and a new group ID.

### Resize

Dragging a resize handle on a group's bounding box scales all elements proportionally from the group center. Element positions and dimensions are scaled relative to the group AABB.

### Box Select

During box selection, if the box fully encloses any element of a group, the entire group is selected (not just the enclosed elements). This matches the behavior of grouped objects in design tools like Figma.

## Ungroup

Select a group and press Ctrl+Shift+U [keyboard-shortcuts.md "## Groups"]. Elements return to individual selectability. The group entry is removed from `project.groups[]` and `groupId` is set to `null` on all member elements.

## Inspector

- **Group selected** (not entered): shows group name (editable), element count, combined AABB dimensions (width × height in meters), and combined cost [cost-tracking.md "## Inspector Integration"].
- **Element within group** (entered via double-click): shows that element's type-specific properties as normal.
