# Structures

Structures are placeable elements like walls, fences, and raised beds. They can be straight or curved. They render above paths and below plants [canvas-viewport.md "## Render Layer Order"].

## Placement

Structure tool (S). Click to place at default dimensions. Drag to define extent (start to end, edges snap to 10cm increments). Alt disables snap [snap-system.md "## Alt Modifier Behavior"]. Geometry snapping (edge, perpendicular, midpoint) is active during placement [snap-system.md "## Geometry Snap"].

## Straight vs Curved

Each structure has a shape property: straight (default) or curved (arc). Editable via the inspector. Curved structures render as arcs between start and end points with an editable radius.

## Arc Tool (A)

Creates curved structures directly:

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

Structures are the only element type that can rotate. Rotation is around the center point. Other element types (terrain, plants, labels, paths) have no rotation handle.

See [spatial-math-specification.md "## 8. Rotation"] for the rotation formula and Konva integration.

## Resize

Drag resize handles to expand or contract. Edges snap to 10cm increments by default.

## Inspector

Shows: structure type, dimensions (in meters), shape (straight/curved), arc radius (when curved), and notes. All editable. Changes apply immediately.

## Built-in Types

brick-wall, fence, raised-bed. Extensible via registry.

## Overlap

Structures can overlap with terrain, plants, and paths. All remain unchanged.
