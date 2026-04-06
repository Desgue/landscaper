# Yard Setup

The yard setup screen appears after creating a new project [persistence-projects.md "## New Project Flow"]. It defines the yard boundary before the canvas opens.

## Define Boundary

The user clicks to place vertices on the workspace. Each click adds a vertex to the boundary polygon. Edges are drawn between consecutive vertices with a live preview.

## Edge Dimensions

Each edge displays its current length. The user can click on an edge length and type an exact dimension in meters. Vertex positions adjust to satisfy the entered dimension.

The adjustment uses fixed-pivot edge propagation: the start vertex of the edited edge stays fixed, the end vertex moves along the edge direction to the new length, and all subsequent vertices shift by the same delta. The closing edge changes length implicitly — its updated length is displayed. See [spatial-math-specification.md "## 4. Yard Boundary Polygon"] for the algorithm and edge cases.

## Corrections

After the polygon is complete, the user can click any edge to retype its dimension. The polygon adjusts using the same propagation algorithm. Multiple corrections are applied sequentially.

## Completion

When the user confirms the setup, the canvas opens with the yard boundary drawn. The canvas is bounded to the yard dimensions with overflow area [canvas-viewport.md "## Bounded Canvas"].

## Boundary as Element

The yard boundary is a regular editable element on the canvas. It can be selected, moved, resized, or have individual vertices adjusted. It can also be deleted. It has no special locked or protected status.
