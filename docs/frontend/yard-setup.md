# Yard Setup

The yard setup screen appears after creating a new project [persistence-projects.md "## New Project Flow"]. It defines the yard boundary before the canvas opens.

## Define Boundary

The user clicks to place vertices on the workspace. Each click adds a vertex to the boundary polygon. Edges are drawn between consecutive vertices with a live preview. The polygon closes when the user clicks near the first vertex (within snap tolerance — 8px screen-space, adaptive to zoom [snap-system.md "## Adaptive Tolerance"]) or clicks a "Done" button.

## Edge Dimensions

Each edge displays its current length. The user can click on an edge length and type an exact dimension in meters. Vertex positions adjust to satisfy the entered dimension.

The adjustment uses fixed-pivot edge propagation: the start vertex of the edited edge stays fixed, the end vertex moves along the edge direction to the new length, and all subsequent vertices shift by the same delta. The closing edge changes length implicitly — its updated length is displayed. See [spatial-math-specification.md "## 4. Yard Boundary Polygon"] for the algorithm and edge cases.

## Corrections

After the polygon is complete, the user can click any edge to retype its dimension. The polygon adjusts using the same propagation algorithm. Multiple corrections are applied sequentially.

Edge constraints: minimum edge length is 10cm. Self-intersecting polygons trigger a warning but are allowed (the yard may have complex shapes). See [spatial-math-specification.md "### Edge Cases"].

## Completion

When the user confirms the setup, the canvas opens with the yard boundary drawn. The canvas is bounded to the yard dimensions with overflow area [canvas-viewport.md "## Bounded Canvas"].

## Curved Edges

After the polygon is complete, any straight edge can be converted to an arc using the same drag-to-curve interaction as the Arc Tool [structures.md "## Arc Tool (A)"]: click an edge, then drag perpendicular to set curvature. Arc edges are stored via the `edgeTypes` array in the yard boundary schema [data-schema.md "### Yard Boundary Storage"]. Arc math: [spatial-math-specification.md "## 5. Arc Geometry"].

## Boundary as Element

The yard boundary behaves like a regular element on the canvas — it can be selected, moved, resized, or have individual vertices adjusted. It can also be deleted. It has no special locked or protected status. However, it is stored as a project-level object (`project.yardBoundary`) rather than in the `elements[]` array, since there is exactly one boundary per project [data-schema.md "### Yard Boundary Storage"].

## Boundary Deletion

When the yard boundary is deleted, the project becomes unbounded: no overflow dimming is applied, and all elements remain fully editable. A non-blocking banner prompts the user to re-add a boundary ("No yard boundary defined — click to set up"). The banner is dismissible. Re-adding a boundary goes through the same setup flow [## Define Boundary].

## HTML Overlay Component

`src/components/YardBoundaryHTMLOverlays.tsx` provides the DOM-based UI that sits above the PixiJS canvas for boundary placement and editing. It is mounted as a sibling of `CanvasHost` inside the canvas container in `AppLayout.tsx`.

### Architecture

The PixiJS `BoundaryHandler` (imperative, closure-scoped inside `CanvasHost`) is bridged to React via `useBoundaryUIStore` — a Zustand store that holds:
- A reference to the `BoundaryHandle` (set by `CanvasHost` on init, cleared on destroy)
- Reactive `BoundaryPlacementState` (synced after each handler mutation)
- `editingEdgeIndex` for inline edge-length editing

### Placement Mode

Shown when `placementState.isPlacing && activeTool === 'select'`. Renders a top-center instruction bar with:
- Instruction text ("Click to place yard boundary points...")
- Vertex count badge
- Self-intersection warning (uses exported `hasSelfIntersection()`)
- "Done" button (enabled when >= 3 vertices, no self-intersection)

Escape key cancels placement and resets the handler.

### Editing Mode

Shown when `yardBoundary !== null && !isPlacing`. Renders clickable edge-length labels at each edge midpoint, positioned in screen coords via `toScreen()` from `viewport.ts`. Clicking a label opens an inline `<input>` for entering exact dimensions in meters; committing calls `boundaryHandle.applyEdgeLength()`.

### Coordinate Positioning

Edge labels use `position: absolute` within the canvas container. World-to-screen conversion: `toScreen(midX, midY, panX, panY, zoom)` from `src/canvas/viewport.ts`, subscribing to `useViewportStore` for live updates on pan/zoom. Labels use `transform: translate(-50%, -50%)` to center on the midpoint.
