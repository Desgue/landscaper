# Paths & Borders

Paths are a distinct element type for brick edging, curved borders, and freeform landscape paths. They render above terrain and below structures [canvas-viewport.md "## Render Layer Order (bottom to top)"].

## Activation

The path tool has no toolbar button and no keyboard shortcut. It is activated only via the Paths tab in the side palette. Clicking a path type activates stamp mode; the user can then draw path segments on the canvas. Press Escape or switch tools to exit path drawing mode.

## Drawing Segments

### Straight Segment

Click a start point, click an end point. A straight path segment is drawn between the two points. Snaps to 10cm increments. Geometry snapping is active [snap-system.md].

### Curved Segment

Click a start point, click an end point, drag to set arc radius. A curved path segment (arc) is drawn. Same interaction as the Arc Tool (A) [structures.md "## Arc Tool (A)"]. The A key works contextually — when a path is being drawn, it switches the next segment to curved mode. Arc math: [spatial-math-specification.md "## 5. Arc Geometry"].

## Segment Model

A path is an ordered list of segments sharing endpoints. Each segment is independently straight or curved. Segment N's end point is segment N+1's start point — enforced by the data model (no duplicate storage). Moving a shared endpoint updates both adjacent segments.

No tangent continuity (G1) is enforced at segment junctions. Sharp corners between segments are intentional — landscape borders often have them. See [spatial-math-specification.md "## 6. Path Segment Connectivity"] for the data model and rendering.

## Segment Conversion

Each segment can be toggled between straight and curved via the inspector.

## Segment Deletion

Deleting a segment splits the path into two independent paths at the deletion point. Each resulting path retains its path type and stroke width. If the deletion leaves a path with fewer than 2 points, that path is removed entirely.

## Visual Appearance

Paths render with a width proportional to their real-world width (e.g., brick edging at 10cm). The path type determines the visual style. Width is stored in cm and scaled with zoom.

## Inspector

Shows: path type, width (in cm), total length (in meters), and per-segment details. Each segment can be toggled straight/curved with editable arc radii. All editable. Changes apply immediately. All element types can be linked to journal entries [journal.md "## Element Linking"].

## Built-in Types

brick-edging (10cm width, `category: "edging"`), gravel-path (60cm width, `category: "walkway"`), stepping-stones (40cm width, `category: "walkway"`), concrete-walkway (90cm width, `category: "walkway"`), flagstone (80cm width, `category: "walkway"`). Extensible via registry.

## Closed Paths

A path can be closed by connecting the last point back to the first. The closing segment is implicit (not stored in the data model). See [data-schema.md "#### Closed Paths"] for storage details.

## Collision Rules

Paths follow realistic placement constraints [canvas-viewport.md "## Collision Rules"]:

- **Blocked by structures**: paths cannot overlap structures (and vice versa)
- **Allowed on terrain**: paths can be placed on any terrain type
- **Coexist with plants**: plants can be placed near or on paths
- **Coexist with labels**: labels can be placed on paths
- **Coexist with other paths**: paths can overlap other paths
