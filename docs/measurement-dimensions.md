# Measurement & Dimensions

Measurement tools provide point-to-point distance measurement, persistent dimension annotations, and area/perimeter calculations. Dimension elements render above labels and below the selection UI [canvas-viewport.md "## Render Layer Order (bottom to top)"].

## Measurement Tool (M)

Activated via toolbar or M key [keyboard-shortcuts.md "## Tools"]. Click to set a start point, click again to set an end point. While measuring, a dashed preview line connects the start point to the cursor with a live distance tooltip [visual-design.md "## Measurement Tool Appearance"].

Measurement points snap to element edges and corners when within snap tolerance [snap-system.md "## Geometry Snap"]. By default, measurements are free-placed (no grid snap). Alt ENABLES snapping — same inversion as labels [snap-system.md "## Alt Modifier Behavior"].

### Measurement Result

After clicking the second point, the measured distance is displayed. The user has two options:

- **Dismiss**: press Escape or click elsewhere. The measurement disappears (transient).
- **Keep as dimension**: press Enter or click "Keep" in the tooltip. A persistent dimension element is created at the measured positions [## Dimension Element].

### Quick Measure (hover)

While the Measurement tool is active, hovering over an element's edge displays its length in a non-intrusive tooltip. No click required. Hovering over a terrain region or closed path shows area. This provides fast read-only measurements without creating any elements.

## Dimension Element

A dimension is a persistent annotation element that displays the distance between two points with leader lines, arrowheads, and a centered distance label. Dimensions are a distinct element type [data-schema.md "### Dimension Element"].

### Placement

Created via the Measurement tool [## Measurement Tool (M)] or by dragging from a "Dimension" button in the toolbar's measurement sub-menu. The dimension connects two world points, optionally linked to elements.

### Element Linking

When a dimension endpoint is placed on an element's edge or corner, the dimension links to that element. Linked dimensions auto-update when the linked element moves or resizes — the endpoint tracks the nearest edge or corner of the linked element's bounding box. See [spatial-math-specification.md "### Linked Dimension Updates"].

If a linked element is deleted, the dimension endpoint becomes a fixed world point at the last known position. The stale link is preserved (same pattern as journal links [data-schema.md "## Journal Entry Schema"]).

### Offset

The leader line is drawn parallel to the measurement line at a perpendicular offset (`offsetCm`). The offset can be adjusted by dragging the leader line away from or toward the measured points. Extension lines connect the measured points to the leader line endpoints. See [spatial-math-specification.md "## 13. Dimension Line Rendering"] for geometry.

### Visual Style

Leader lines, arrowheads, extension lines, and distance text. See [visual-design.md "## Dimension Line Appearance"] for colors and sizing.

### Cannot Resize or Rotate

Dimensions have no resize handles (size is determined by start/end points) and no rotation handle (orientation follows the measurement direction).

## Area & Perimeter Display

Area and perimeter are calculated and shown in the inspector — they are not separate elements.

### Per-Element Area

When a single element is selected, the inspector shows its area and perimeter where applicable:

| Element type | Area shown | Perimeter shown |
|-------------|-----------|----------------|
| Terrain cell | 1.00 m² (always) | 4.00 m (always) |
| Structure | width × height in m² | 2 × (width + height) in m |
| Closed path | Polygon area (Shoelace formula) in m² | Sum of segment lengths in m |
| Yard boundary | Polygon area in m² | Sum of edge lengths in m |
| Plant | Not shown | Not shown |
| Label | Not shown | Not shown |
| Dimension | Not shown (shows distance instead) | Not shown |

For closed paths and the yard boundary with arc edges, the area includes the circular segment contribution. See [spatial-math-specification.md "## 12. Measurement & Area Calculations"] for all formulas.

### Aggregate Area

When multiple terrain cells of the **same type** are selected, the inspector shows the aggregate area: `cellCount × 1 m²`. When terrain cells of **mixed types** are selected, the inspector shows a breakdown by type.

### Yard Boundary Area

The yard boundary area is always accessible in the inspector when the yard boundary is selected. This represents the total usable yard area.

## Material Estimates

Material estimates are derived from area and a user-specified depth or coverage factor. They appear in the inspector when a terrain element or path is selected.

### Terrain Materials

When one or more terrain cells are selected, the inspector shows:
- **Area**: total area in m²
- **Depth**: editable field (cm, default varies by type — e.g., mulch: 8cm, gravel: 5cm)
- **Volume**: area × depth, displayed in m³

The depth is a transient UI value (not stored in the data model). It defaults to a sensible value per terrain type and resets when the selection changes.

### Path Materials

When a path is selected, the inspector shows:
- **Length**: total length of all segments in meters
- **Width**: path stroke width in cm
- **Area**: length × width in m²

See [spatial-math-specification.md "### Material Volume Estimation"] for formulas.

## Inspector

Shows: start/end coordinates (in meters), distance (in meters with configured precision), offset distance, linked elements (if any). The offset is editable (drag or type a value). Linked element names are clickable — clicking selects the linked element on the canvas. All element types can be linked to journal entries [journal.md "## Element Linking"].

## Collision Rules

Dimensions are non-physical annotations and have no collision constraints [canvas-viewport.md "## Collision Rules"]. They can be placed anywhere on the canvas, overlapping any element type.
