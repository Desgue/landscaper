# Structures

Structures are placeable elements like walls, fences, and raised beds. They can be straight or curved. They render above paths and below plants [canvas-viewport.md "## Render Layer Order"].

## Placement

Structure tool (S). Click to place at default dimensions (defined per type in the registry, e.g., brick-wall: 200×20cm, fence: 200×10cm, raised-bed: 200×100cm). Drag to define extent (start to end, edges snap to 10cm increments). Alt disables snap [snap-system.md "## Alt Modifier Behavior"]. Geometry snapping (edge, perpendicular, midpoint) is active during placement [snap-system.md "## Geometry Snap"].

## Straight vs Curved

Each structure has a shape property: straight (default) or curved (arc). Editable via the inspector. Curved structures render as arcs between start and end points with an editable radius.

## Arc Tool (A)

Creates curved structures directly. The Arc Tool also works contextually for path curved segments — when a path is being drawn (via the Paths tab), pressing A switches the next segment to curved mode using the same interaction [paths-borders.md "### Curved Segment"].

1. Click to set start point
2. Click to set end point
3. Drag to set arc radius (perpendicular distance from chord determines curvature)

A preview line follows the cursor during step 2. An arc preview follows during step 3. The arc snaps to 10cm increments and geometry snapping is active for start/end points.

See [spatial-math-specification.md "## 5. Arc Geometry"] for the sagitta-based derivation, center/radius computation, degenerate cases, and rendering.

### Arc Editing

After placement, the arc has 3 draggable handles: start point, end point, and radius handle (at the arc apex). Dragging any handle updates the arc in real-time with snap active.

### Degenerate Cases

- Start == end: rejected, stays in "waiting for end point"
- Sagitta ≈ 0 (drag along chord): treated as straight line
- |Sagitta| > chord length: clamped to prevent arcs exceeding semicircle
- Chord < 10cm: rejected as too small

## Rotation

Structures are the only element type that can rotate. Rotation is around the center point. No angle snap by default (free rotation). Shift+15-degree snap may be added in a future phase. Other element types (terrain, plants, labels, paths) have no rotation handle.

See [spatial-math-specification.md "## 8. Rotation"] for the rotation formula and Konva integration.

## Resize

Drag resize handles to expand or contract. Edges snap to 10cm increments by default.

## Inspector

Shows: structure type, dimensions (in meters), shape (straight/curved), arc radius (when curved), and notes. All editable. Changes apply immediately. All element types can be linked to journal entries [journal.md "## Element Linking"].

## Built-in Types

brick-wall (`category: "boundary"`), fence (`category: "boundary"`), raised-bed (`category: "container"`). Extensible via registry.

## Collision Rules

Structures follow realistic placement constraints [canvas-viewport.md "## Collision Rules"]:

- **Blocked by structures**: structures cannot overlap other structures
- **Blocked by paths**: structures cannot overlap paths (and vice versa)
- **Allowed on terrain**: structures can be placed on any terrain type
- **Container category**: structures with `category: "container"` (raised beds, planters) accept plants inside their bounds. Other categories (e.g., `"boundary"`) block plants

Invalid placement shows a red ghost preview. Placement is blocked until the cursor moves to a valid position.
