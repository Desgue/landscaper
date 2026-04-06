# Paths & Borders

Paths are a distinct element type for brick edging, curved borders, and freeform landscape paths. They render above terrain and below structures [canvas-viewport.md "## Render Layer Order"].

## Activation

The path tool has no toolbar button and no keyboard shortcut. It is activated only via the Paths tab in the side palette. Clicking a path type activates stamp mode; the user can then draw path segments on the canvas.

## Drawing Segments

### Straight Segment

Click a start point, click an end point. A straight path segment is drawn between the two points. Snaps to 10cm increments. Geometry snapping is active [snap-system.md].

### Curved Segment

Click a start point, click an end point, drag to set arc radius. A curved path segment (arc) is drawn. Same interaction as the arc tool [structures.md "## Arc Tool"]. Arc math: [spatial-math-specification.md "## 5. Arc Geometry"].

## Segment Model

A path is an ordered list of segments sharing endpoints. Each segment is independently straight or curved. Segment N's end point is segment N+1's start point — enforced by the data model (no duplicate storage). Moving a shared endpoint updates both adjacent segments.

No tangent continuity (G1) is enforced at segment junctions. Sharp corners between segments are intentional — landscape borders often have them. See [spatial-math-specification.md "## 6. Path Segment Connectivity"] for the data model and rendering.

## Segment Conversion

Each segment can be toggled between straight and curved via the inspector.

## Visual Appearance

Paths render with a width proportional to their real-world width (e.g., brick edging at 10cm). The path type determines the visual style. Width is stored in cm and scaled with zoom.

## Inspector

Shows: path type, width (in cm), total length (in meters), and per-segment details. Each segment can be toggled straight/curved with editable arc radii. All editable. Changes apply immediately.

## Built-in Types

brick-edging (initial). Extensible via registry.

## Overlap

Paths can overlap with terrain, structures, plants, and labels. All elements coexist.
