# Labels & Annotations

Labels are text elements placed on the canvas. They render above plants and below the selection UI [canvas-viewport.md "## Render Layer Order"].

## Placement

Text/Label tool (T). Click on the canvas to place a text input at the cursor position. Labels are placed freely (no snapping) by default. Alt ENABLES snapping — this is inverted from all other tools [snap-system.md "## Alt Modifier Behavior"]. Rationale: labels are annotations, not physical objects — precise grid alignment is rarely needed, so free placement is the natural default. Alt opt-in provides alignment when desired (e.g., aligning a label to a structure edge).

## Editing

Double-click a label to enter edit mode. Modify the text. Click outside the label or press Escape to exit edit mode and save.

## Resizing

Labels have a resizable text box. Drag resize handles to expand or contract the box. Text wraps within the new bounds.

## Styling

Configurable via inspector: font size, font color, text alignment (left/center/right), bold, italic. Changes apply immediately on the canvas.

## Inspector

Shows all properties listed in [## Styling] above. All element types can be linked to journal entries [journal.md "## Element Linking"].

## Constraints

Labels cannot be rotated. Labels have no snapping by default (Alt enables it).

## Collision Rules

Labels are non-physical annotations and have no collision constraints [canvas-viewport.md "## Collision Rules"]. They can be placed anywhere on the canvas, overlapping any element type.
