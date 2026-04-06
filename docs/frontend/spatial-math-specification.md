# Spatial Math & Geometry Specification

This document specifies the computational geometry underpinning the landscape planner. It fills the gap between the BDD behavioral spec (what the user sees) and the implementation (how the math works). Every algorithm decision here directly affects accuracy and usability.

All coordinates are in **centimeters** internally. Display is in meters. The coordinate system follows HTML Canvas conventions: y-axis points down. This affects arc direction flags — see Section 5.

---

## 1. Coordinate System

### World ↔ Screen Transforms

The viewport is defined by three values: `panX`, `panY` (screen-space offset, in px) and `zoom` (scale factor, 1.0 = 100%). Positive `panX` shifts all content to the right on screen; positive `panY` shifts content down. This follows directly from the transform: increasing `panX` increases `screenX` for every world point.

```
screenX = worldX * zoom + panX
screenY = worldY * zoom + panY

worldX = (screenX - panX) / zoom
worldY = (screenY - panY) / zoom
```

With Konva, the Stage's `x`, `y` = pan offset, `scaleX`/`scaleY` = zoom. Always keep `scaleX === scaleY` (uniform zoom).

### Zoom Toward Cursor

Standard formula: the world point under the cursor must stay fixed after zoom.

```
mouseWorld = (pointer - stagePos) / oldScale
newStagePos = pointer - mouseWorld * newScale
```

### Constraints

- Zoom range: clamp to [0.05, 10.0]. At 0.05, 1m = 5px. At 10, 1cm = 10px.
- Never round world coordinates. Only round to integer pixels at final render.
- Display: `(worldCm / 100).toFixed(2)` for meters in status bar.

### Fit-to-View

Compute the AABB of all elements, add padding (10% of each dimension, minimum 100cm), then:

```
zoom = min(viewportWidth / aabbWidth, viewportHeight / aabbHeight)
panX = viewportWidth/2 - aabbCenterX * zoom
panY = viewportHeight/2 - aabbCenterY * zoom
```

---

## 2. Grid Snapping

### Core Formula

```
snap(value, increment) = Math.round(value / increment) * increment
```

For 10cm snap: `snap(274, 10)` = 270, `snap(276, 10)` = 280, `snap(275, 10)` = 280.

JavaScript's `Math.round` rounds 0.5 toward +infinity. This matches the BDD spec. Behavior is symmetric enough for negative coordinates (which occur when the yard origin isn't at 0,0).

### Terrain Cell Mapping

Terrain cells are 1m × 1m (100cm × 100cm). A cell's origin is its top-left corner. The cell containing world point `(wx, wy)` is:

```
cellX = Math.floor(wx / 100) * 100
cellY = Math.floor(wy / 100) * 100
```

Cell boundaries are always at 100cm intervals. The "10cm snap" applies to where cell boundaries can be positioned when the grid origin is offset, and to non-terrain elements. Terrain cells themselves always align to 100cm boundaries.

### Brush Drag Painting (Grid Traversal)

When the user drags a terrain brush from point A to point B, all cells the cursor path crosses must be painted. This is a grid traversal problem.

Use the **Amanatides-Woo algorithm** (DDA-based grid traversal):

```
dx = B.x - A.x, dy = B.y - A.y
cellX = floor(A.x / cellSize), cellY = floor(A.y / cellSize)
endCellX = floor(B.x / cellSize), endCellY = floor(B.y / cellSize)
stepX = sign(dx), stepY = sign(dy)

tDeltaX = dx != 0 ? abs(cellSize / dx) : Infinity
tDeltaY = dy != 0 ? abs(cellSize / dy) : Infinity

tMaxX = dx > 0 ? ((cellX + 1) * cellSize - A.x) / dx
       : dx < 0 ? (cellX * cellSize - A.x) / dx
       : Infinity
tMaxY = dy > 0 ? ((cellY + 1) * cellSize - A.y) / dy
       : dy < 0 ? (cellY * cellSize - A.y) / dy
       : Infinity

paint(cellX, cellY)
while cellX != endCellX or cellY != endCellY:
  if tMaxX < tMaxY:
    cellX += stepX; tMaxX += tDeltaX
  else:
    cellY += stepY; tMaxY += tDeltaY
  paint(cellX, cellY)
```

This guarantees every cell the line segment passes through is visited — no gaps, where `cellSize = 100` (cm), matching the 1m × 1m terrain cell size. For brush sizes 2×2 or 3×3, expand each visited cell to a cursor-centered NxN region: paint from `(cellX - floor(N/2), cellY - floor(N/2))` to `(cellX + floor(N/2), cellY + floor(N/2))`. For even N, offset by `floor(N/2) - 1` on the negative side (top-left biased).

---

## 3. Snap System Architecture

### Two-Pass Priority

Geometry snaps take priority over grid snaps. Each axis (X, Y) is resolved independently:

```
1. Collect geometry snap candidates within tolerance
2. For each axis:
   a. If a geometry snap is within tolerance → use it, show guide
   b. Else → fall back to grid snap (10cm increment)
3. Return snapped position + list of active guides
```

**Edge-alignment** snaps are per-axis: an element can snap to a geometry edge on X and to the grid on Y simultaneously. **Perpendicular** and **midpoint** snaps are **point snaps** — they set both X and Y simultaneously to the projected/midpoint position, since the snap target is a specific point rather than an axis-aligned line.

### Snap Candidate Collection

For performance, only test elements within a search radius of the cursor. Use either:
- **Grid-based spatial index**: divide world into coarse cells (e.g., 500cm), only check elements in adjacent cells
- **Brute force**: acceptable for <500 elements (typical yard)

For each nearby element, extract snap points:
- **Edges**: all 4 edges of rectangles, all edges of polygons, arc start/end points
- **Midpoints**: midpoint of each edge
- **Centers**: center of each element's bounding box

### Edge Alignment Snap

Test if the cursor's X (or Y) coordinate is within tolerance of any candidate's edge X (or Y):

```
For each candidate edge (a horizontal or vertical line at position edgeVal):
  distance = abs(cursorAxis - edgeVal)
  if distance < tolerance:
    snap to edgeVal on that axis
    record snap guide line
```

For non-axis-aligned edges, project the cursor position onto the edge line and check perpendicular distance.

### Perpendicular Snap

Given existing line segment AB and the cursor position C:

```
1. Project C onto line AB: t = dot(C-A, B-A) / dot(B-A, B-A)
2. If 0 <= t <= 1: projection point P = A + t*(B-A)
3. The snap fires if distance(C, P) < tolerance
```

The projection point P is always perpendicular to AB by construction. No direction-of-approach check is needed — the snap fires whenever the perpendicular foot from cursor to any nearby edge is within tolerance.

### Midpoint Snap

For each edge of each nearby element:

```
midpoint = (edgeStart + edgeEnd) / 2
distance = length(cursor - midpoint)
if distance < tolerance:
  snap cursor to midpoint
```

### Competing Snaps

When multiple geometry snaps fire simultaneously on the same axis:
1. Pick the **closest** snap (smallest distance)
2. If distances are equal (within 1cm), pick the snap from the **most recently added** element (creation order)

See [snap-system.md "## Snap Guides"] for visual guide display rules.

### Adaptive Snap Tolerance

Tolerance is defined in **screen pixels**, then converted to world units using the current zoom:

```
tolerancePx = 8               // constant: 8 pixels feels right across zoom levels
toleranceWorld = tolerancePx / zoom
```

At zoom 1.0: tolerance = 8cm. At zoom 0.1 (zoomed out): tolerance = 80cm. At zoom 5.0 (zoomed in): tolerance = 1.6cm.

Clamp to a reasonable world range: `min(100, max(2, tolerancePx / zoom))`.

This is the approach used by Excalidraw (`getSnapDistance()`) and Realtime Landscaping Architect.

### Snap Guide Rendering

Guides are rendered in the selection UI layer (topmost). Each guide is a thin line (1px screen-space, accent blue #1971c2, 50% opacity) extending across the visible viewport on the snapped axis.

---

## 4. Yard Boundary Polygon

### Vertex Placement

Vertices are placed in order (V0, V1, V2, ...). Each click adds a vertex. Edges connect consecutive vertices. The polygon closes when the user clicks near V0 or confirms.

### Edge Dimension Adjustment

When the user types a new length for edge Vi→Vj:

**Algorithm: Fixed-pivot edge propagation**

```
1. Keep Vi fixed (the start vertex of the edited edge)
2. Compute the unit direction of the edge: dir = normalize(Vj - Vi)
3. Move Vj to: Vi + dir * newLength
4. Compute delta = newVj - oldVj
5. Translate all vertices after Vj (in polygon order, up to but not including Vi) by delta
```

This preserves the direction of the edited edge and the shape of all subsequent edges. The closing edge (last vertex back to Vi) changes length implicitly — display its updated length to the user.

### Why This Approach

- **Simple**: one edge edit = one vertex move + rigid translation
- **Predictable**: the user sees the edited edge hold its direction, and everything "downstream" shifts
- **No conflicting constraints**: each edit is independent, resolved immediately
- **Non-convex safe**: works regardless of polygon convexity

### Edge Cases

- **Zero-length edge**: reject input, minimum 10cm
- **Self-intersection**: after adjustment, check all edge pairs for intersection using segment-segment test. If intersection detected, warn the user but allow (the yard may genuinely have complex shape)
- **Closing edge**: always recompute and display its length after any edit

### Segment-Segment Intersection Test

For edges A→B and C→D:

```
cross(v, w) = v.x * w.y - v.y * w.x

r = B - A
s = D - C
denom = cross(r, s)

if abs(denom) < epsilon: parallel or collinear (see below)

t = cross(C - A, s) / denom
u = cross(C - A, r) / denom

intersection exists if 0 < t < 1 AND 0 < u < 1
```

(Use strict inequality to exclude shared endpoints. Use `epsilon = 1e-10` for the parallel test to avoid floating-point fragility with exact zero.)

**Collinear overlap detection**: When `abs(denom) < epsilon`, the segments are parallel. Check if they are also collinear: `abs(cross(C - A, r)) < epsilon`. If collinear, project C and D onto the line AB as parameters `t0 = dot(C-A, r) / dot(r, r)` and `t1 = dot(D-A, r) / dot(r, r)`. The segments overlap if `max(0, min(t0,t1)) < min(1, max(t0,t1))` (intervals intersect within [0,1]).

### Point-in-Polygon Test

To determine if an element is inside the yard boundary (for overflow dimming):

**Ray casting algorithm**: cast a horizontal ray from the point to the right. Count edge crossings. Odd = inside, even = outside.

**Vertex and horizontal-edge handling**: When the ray passes exactly through a vertex, count that vertex as a crossing only if the *other* endpoint of the edge is strictly below the ray's Y coordinate. Skip horizontal edges entirely — the vertex rule handles their endpoints correctly. This prevents double-counting at shared vertices.

For polygons with arc edges, also test ray-arc intersection. For a horizontal ray from point P to the right intersecting an arc with center C and radius R:

```
1. Check if the ray's Y is within the arc's Y range: |P.y - C.y| <= R
2. If yes, compute X intersections: x = C.x ± sqrt(R² - (P.y - C.y)²)
3. Keep only intersections where x > P.x (ray goes right)
4. Keep only intersections whose angle from center falls within the arc's angular sweep
5. Count these intersections toward the crossing total
```

---

## 5. Arc Geometry

### Derivation from User Interaction

The user clicks start `P0`, clicks end `P1`, then drags to point `M` to set curvature.

**Step 1: Compute sagitta** (signed perpendicular distance from chord midpoint to the arc apex)

```
mid = (P0 + P1) / 2
chord = P1 - P0
chordLen = length(chord)
perp = normalize({ x: -chord.y, y: chord.x })   // left normal of chord
sagitta = dot(M - mid, perp)                      // signed distance
```

> The computed `sagitta` value is stored in the data schema as `arcSagitta` on structure elements, path segments, and yard boundary edge types [data-schema.md "### Structure Element", "### Path Element", "### Yard Boundary Storage"].

**Step 2: Compute radius**

From the sagitta formula: `R = (h² + (L/2)²) / (2h)` where h = sagitta, L = chordLen.

```
R = (sagitta² + (chordLen/2)²) / (2 * sagitta)
```

R is signed: positive = arc bulges in perp direction, negative = opposite.

**Step 3: Compute center**

```
center = mid + perp * (sagitta - R)
```

**Step 4: Compute angles**

```
startAngle = atan2(P0.y - center.y, P0.x - center.x)
endAngle = atan2(P1.y - center.y, P1.x - center.x)
counterclockwise = sagitta > 0   // assumes Canvas/screen coords (y-axis down)
```

> **Coordinate system note**: The `counterclockwise` flag is correct for HTML Canvas / screen coordinates where the y-axis points down. In a y-up coordinate system, the flag would be inverted.

### Rendering

Use Canvas 2D `context.arc(center.x, center.y, |R|, startAngle, endAngle, counterclockwise)`.

In Konva, use a custom `sceneFunc` on a Shape, or use `Konva.Arc` with `innerRadius: 0, outerRadius: |R|, angle: sweepDegrees, rotation: startDegrees`.

### Arc Bounding Box

For fit-to-view and minimap, compute the AABB of an arc:

```
1. Start with the two endpoints
2. Check if the arc crosses 0°, 90°, 180°, 270° (the axis-aligned extremes)
3. For each crossed angle, add the corresponding point (center ± radius) to the AABB
4. Expand AABB to include all collected points
```

### Degenerate Cases

| Condition | Handling |
|-----------|----------|
| P0 == P1 | Reject — keep in "waiting for end point" state |
| sagitta ≈ 0 (drag along chord) | Treat as straight line, no arc |
| \|sagitta\| > chordLen | Clamp to chordLen (prevents arcs > semicircle which flip) |
| chordLen < 10cm | Reject as too small for meaningful arc |

### Arc Handle for Editing

After placement, the arc has 3 draggable handles:
- **Start handle** at P0
- **End handle** at P1
- **Radius handle** at the arc apex: `mid + perp * sagitta`

Dragging start/end recalculates the arc with the new endpoint. Dragging the radius handle updates the sagitta, which recomputes R and center.

---

## 6. Path Segment Connectivity

### Data Model

A path is an ordered list of segments. Each segment has:

```
PathSegment {
  type: "line" | "arc"
  end: Vec2              // endpoint (start is previous segment's end, or path origin)
  // Arc-specific:
  sagitta?: number       // signed bulge height (only for type "arc")
}
```

The path's first point is stored separately as `pathOrigin: Vec2`. Each segment's start point is implicitly the previous segment's endpoint (or pathOrigin for the first segment).

### Endpoint Sharing

Consecutive segments share endpoints by construction — segment N's end is segment N+1's start. This is enforced by the data model (no duplicate storage).

When the user moves a shared endpoint, both adjacent segments update.

### Straight-to-Curved Transitions

No tangent continuity (G1) is enforced. The user can have a sharp angle between a straight segment and a curved segment. This is intentional — landscape borders (brick edging) often have sharp corners.

If G1 continuity is desired later, constrain the arc's sagitta direction to be tangent to the adjacent straight segment at the shared point.

### Path Width Rendering

Paths have a real-world width (e.g., brick edging = 10cm). Render by:

1. For each segment, compute the offset curves at ±width/2
2. For line segments: parallel lines offset perpendicular to the segment direction
3. For arc segments: concentric arcs at radius ± width/2
4. Join consecutive offset segments with miter or round joins
5. Fill the enclosed area

For MVP, a simpler approach: render each segment as a thick stroked line (`context.lineWidth = widthInWorldUnits`). The Konva stage transform (`scaleX/scaleY = zoom`) handles the conversion to screen pixels — do not multiply by zoom again or the width will be double-scaled.

### Closed Paths

When a path's `closed` flag is `true`, an implicit straight closing segment connects the last point back to the first. This segment is NOT stored in the data model — the `segments` array always has `points.length - 1` entries. See [data-schema.md "#### Closed Paths"] for storage details.

---

## 7. Selection & Hit Testing

### Point-in-Element

For click selection, test the cursor position against each element:

| Element type | Hit test |
|-------------|----------|
| Terrain (rectangle) | Point inside axis-aligned rectangle: `cellX <= px < cellX+100 AND cellY <= py < cellY+100` |
| Plant (circle) | Distance from plant center < spacingCm/2 |
| Structure (rectangle, possibly rotated) | Transform point into structure's local coordinate system, then test against local AABB |
| Structure (curved/arc) | Distance from arc center ≈ radius ± tolerance, and angle is within arc sweep |
| Label (rectangle) | Point inside bounding box |
| Path (line segment) | Distance from point to line segment < pathWidth/2 + tolerance |
| Path (arc segment) | Distance from arc center ≈ radius ± pathWidth/2 + tolerance, and angle within sweep |
| Yard boundary (polygon) | Ray casting point-in-polygon |

Konva has built-in hit detection (`getIntersection()`) that handles most of these. For custom shapes (arcs, paths), implement `hitFunc`.

### Selection Priority

When elements occupy the same position, select the topmost in render order: labels > plants > structures > paths > terrain > yard boundary. Within the same layer, the element with the latest `createdAt` timestamp wins. **Tab** cycles through all elements at the click point, from topmost to bottommost.

### Collision Detection

Placement validation uses these geometric tests to enforce collision rules [canvas-viewport.md "## Collision Rules"]:

**AABB overlap** (structures vs structures, structures vs paths): Two axis-aligned rectangles overlap if they overlap on both axes:

```
overlap = aLeft < bRight AND aRight > bLeft AND aTop < bBottom AND aBottom > bTop
```

For rotated structures, transform both shapes into one structure's local coordinate system, or use the AABB of the rotated shape as a conservative approximation.

**Circle spacing** (plants vs plants): `spacingCm` is the minimum center-to-center distance for a plant type; each plant's collision radius is `spacingCm / 2`. Two plants violate spacing if:

```
violation = distance(centerA, centerB) < (spacingA + spacingB) / 2
```

**Point-in-structure** (plants vs structures): A plant is inside a structure if the plant's center point passes the structure's hit test (AABB or rotated AABB). Placement is blocked unless the structure has `category: "container"`.

**Fully-enclosed boundary test**: An element is considered "inside" the yard boundary only if all corners of its AABB pass the point-in-polygon test. Elements with any corner outside are in the "outside" zone (dimmed background).

### Box Selection

**Fully enclosed**: element's AABB is entirely within the selection box.

```
enclosed = elemLeft >= boxLeft AND elemRight <= boxRight AND elemTop >= boxTop AND elemBottom <= boxBottom
```

**Partial intersection** (Shift+drag): element's AABB overlaps the selection box.

```
intersects = elemLeft < boxRight AND elemRight > boxLeft AND elemTop < boxBottom AND elemBottom > boxTop
```

For rotated structures, compute the rotated AABB (oriented bounding box) or use the axis-aligned bounding box of the rotated shape as an approximation.

---

## 8. Rotation

### Structure Rotation Around Center

```
center = { x: structure.x + structure.width/2, y: structure.y + structure.height/2 }

// Rotate point P around center by angle θ:
rotatedX = center.x + (P.x - center.x) * cos(θ) - (P.y - center.y) * sin(θ)
rotatedY = center.y + (P.x - center.x) * sin(θ) + (P.y - center.y) * cos(θ)
```

Store rotation as degrees on the element. Konva handles rotation rendering natively via the `rotation` property on nodes.

### Rotation Snap

No angle snap by default (free rotation). Holding Shift could snap to 15° increments (standard in design tools), but this is not currently specified in the BDD — can be added later.

---

## 9. Plant Visual Size

### Scaling Formula

The plant icon is rendered centered in its grid cell. The icon size is proportional to `spacingCm`:

```
iconSizeCm = spacingCm                    // the icon occupies spacingCm × spacingCm
iconSizeScreen = iconSizeCm * zoom         // convert to pixels
cellSizeScreen = 100 * zoom                // 1m cell in pixels
```

The icon is centered in the cell:

```
iconX = cellX + (100 - spacingCm) / 2
iconY = cellY + (100 - spacingCm) / 2
```

### Minimum Visible Size

Clamp icon rendering to a minimum of 4px screen-space to prevent illegibility at low zoom:

```
renderSize = max(iconSizeScreen, 4)
```

---

## 10. Element Lifecycle (Plant Status)

This section is a cross-reference only. See [plants.md "## Status Lifecycle"] for the canonical definition of the plant lifecycle state machine, transition rules, planted date behavior, and quantity semantics.

---

## 11. Journal Element Linking

### Link Model

Links are stored as an array of element IDs on the journal entry. They are **not bidirectional** in storage, but the UI can query in both directions:

- Entry → Elements: read the entry's `linkedElementIds` array
- Element → Entries: query all entries where `linkedElementIds` contains the element ID

### Deleted Element Handling

When an element is deleted:
- The element ID remains in journal entries' `linkedElementIds`
- The UI shows the link as "deleted element" (grayed out, non-clickable)
- The link is not automatically removed — it preserves journal history

Element IDs are UUIDs [data-schema.md] and are never reused, so stale links in journal entries cannot collide with newly created elements.

### Canvas Visibility

Links are not visible on the canvas by default. They are visible in the inspector when an element is selected (shows linked journal entries) and in the journal view (shows linked elements).

---

## 12. Measurement & Area Calculations

### Point-to-Point Distance

Euclidean distance between two world points:

```
distance = sqrt((x2 - x1)² + (y2 - y1)²)
displayMeters = distance / 100
```

Display with cm precision: `(distance / 100).toFixed(2)` — e.g., `3.47m`.

### Rectangle Area

For terrain cells (always 100×100cm) and rectangular structures (`width` = X-axis extent, `depth` = Y-axis extent, both 2D canvas dimensions):

```
areaCm2 = width * depth
areaM2 = areaCm2 / 10000
```

### Polygon Area (Shoelace Formula)

For the yard boundary, closed paths, or any closed polygon defined by vertices V0…Vn-1:

```
area = 0.5 * |Σ(i=0 to n-1) (x_i * y_{i+1} - x_{i+1} * y_i)|
```

where indices wrap: `V_n = V_0`.

Result is in cm². Convert to m²: `areaCm2 / 10000`.

**For polygons with arc edges**: decompose each arc segment into its contribution. The polygon area from the Shoelace formula uses the chord (straight line between arc endpoints). Add or subtract the circular segment area for each arc edge:

```
segmentArea = 0.5 * R² * (sweepAngle - sin(sweepAngle))
```

If the arc bulges outward from the polygon interior, add `segmentArea`. If inward, subtract it. The sign of the arc's sagitta relative to the polygon winding determines the direction.

### Perimeter Calculation

Sum of all edge lengths:

```
perimeter = Σ edgeLength_i
```

For straight edges: `edgeLength = sqrt((x2-x1)² + (y2-y1)²)`

For arc edges: `edgeLength = |R * sweepAngle|` where `sweepAngle` is in radians.

### Aggregate Terrain Area

For terrain cells of the same type:

```
aggregateAreaM2 = cellCount * 1.0   // each cell is 1m²
```

The inspector computes this by counting all terrain elements with the matching `terrainTypeId`.

### Material Volume Estimation

Given an area and a user-specified depth:

```
volumeM3 = areaM2 * (depthCm / 100)
```

Example: 15m² of mulch at 8cm depth = `15 * 0.08` = 1.2m³.

For paths, the coverage area is:

```
pathAreaM2 = totalLengthM * (strokeWidthCm / 100)
```

where `totalLengthM` is the sum of all segment lengths (see Perimeter Calculation).

---

## 13. Dimension Line Rendering

Dimension lines annotate distances on the canvas with leader lines, arrowheads, and a centered distance label.

### Geometry

A dimension annotation connects two world points P0 and P1 with a visual offset:

```
chord = P1 - P0
chordLen = length(chord)
dir = normalize(chord)
perp = { x: -dir.y, y: dir.x }     // perpendicular (left normal)

// Offset leader line endpoints
L0 = P0 + perp * offsetCm
L1 = P1 + perp * offsetCm
```

`offsetCm` is a signed perpendicular distance from the measurement line. Positive = left of P0→P1, negative = right.

### Extension Lines

Thin lines connecting the measured points to the offset leader line:

```
extensionStart_0 = P0 + perp * (offsetCm > 0 ? 0 : offsetCm)
extensionEnd_0   = P0 + perp * (offsetCm > 0 ? offsetCm + extensionOverhang : -extensionOverhang)
```

`extensionOverhang` = small extension past the leader line (e.g., 10cm world units). Same logic for P1.

### Arrowheads

Isosceles triangle at each end of the leader line, pointing inward along the leader:

```
arrowLength = 12 / zoom    // constant screen size (12px)
arrowWidth  = 6 / zoom     // half-width

// Arrow at L0 (pointing toward L1):
tip = L0
base1 = L0 + dir * arrowLength + perp * arrowWidth
base2 = L0 + dir * arrowLength - perp * arrowWidth

// Arrow at L1 (pointing toward L0):
tip = L1
base1 = L1 - dir * arrowLength + perp * arrowWidth
base2 = L1 - dir * arrowLength - perp * arrowWidth
```

Arrowheads are filled (solid). When the leader line is too short for two arrowheads (chordLen < 4 * arrowLength in screen px), arrowheads point outward instead.

### Text Placement

Distance label is centered on the leader line:

```
textPos = (L0 + L1) / 2
textRotation = atan2(dir.y, dir.x)    // align text with leader line
```

Text is rendered with a background knockout rectangle (white fill, slight padding) so it remains legible over grid lines and elements. If the text would be upside-down (rotation > 90° or < -90°), flip by 180°.

### Linked Dimension Updates

When a dimension is linked to elements (`startElementId` / `endElementId` are non-null), the dimension's start/end points track the linked element's nearest edge or corner. On element move or resize:

```
1. Find the linked element's bounding box
2. Snap the dimension endpoint to the nearest corner or edge midpoint of that bounding box
3. Recompute the leader line, arrowheads, and text
```

If the linked element is deleted, the dimension endpoint becomes a fixed world point (the last known position). The link ID is preserved as a stale reference [data-schema.md "### Dimension Element"].

---

## Reference Libraries

| Library | Purpose | Relevance |
|---------|---------|-----------|
| [@flatten-js/core](https://github.com/alexbol99/flatten-js) | 2D geometry primitives (Point, Segment, Arc, Polygon), intersection, distance, boolean ops | Directly models paths with mixed line/arc segments. Spatial indexing via PlanarSet. |
| [robust-predicates](https://github.com/mourner/robust-predicates) | Exact geometric predicates (orient2d, incircle) | Reliable point-in-polygon without float errors |

### Reference Implementations

| Feature | Reference | Key File/Pattern |
|---------|-----------|-----------------|
| Pan/zoom transforms | [Konva zoom-to-pointer](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html) | `newPos = pointer - mousePointTo * newScale` |
| Grid snap | [Konva grid snap](https://konvajs.org/docs/sandbox/Objects_Snapping.html) | `Math.round(value / grid) * grid` on move |
| Geometry snapping | [tldraw SnapManager](https://github.com/tldraw/tldraw) `packages/editor/src/lib/editor/managers/SnapManager/` | Per-axis snap resolution, closest wins, gap snapping |
| Zoom-adaptive tolerance | [Excalidraw snapping.ts](https://github.com/excalidraw/excalidraw) `packages/excalidraw/snapping.ts` | `getSnapDistance()` scales with zoom |
| Arc geometry | [Paper.js arcTo](https://github.com/paperjs/paper.js) `src/path/Path.js` | 3-point arc via through-point |
| Polygon with dimensions | [JSketcher](https://github.com/xibyte/jsketcher) `web/app/sketcher/constr/` | Constraint solver (overkill — use edge propagation instead) |
| Brush painting | [Tiled](https://github.com/mapeditor/tiled) | Sparse 2D map + brush stamp, grid traversal |
| Mixed-segment paths | [@flatten-js/core](https://github.com/alexbol99/flatten-js) | Polygon edges can be Segment or Arc |
| Hit testing | Konva built-in `getIntersection()` + custom `hitFunc` | Per-shape hit region |
