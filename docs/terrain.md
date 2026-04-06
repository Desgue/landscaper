# Terrain Painting

Terrain fills grid cells with surface types. Terrain is the lowest content layer on the canvas [canvas-viewport.md "## Render Layer Order"].

## Terrain Brush Tool (B)

Select a terrain type from the palette [visual-design.md "### Side Palette"], then click or drag on the canvas to paint.

### Cell Mapping

Terrain cells are 1m × 1m (100cm × 100cm). The cell containing a cursor position is `floor(worldPos / 100) * 100`. Cells always align to 100cm boundaries. The "10cm snap" from [snap-system.md "## Grid Snap"] applies to cell boundary positioning when the grid origin is offset, not to cell size.

### Single Click

Fills the grid cell under the cursor with the selected terrain type's color. The terrain element occupies exactly one cell and its visual bounds match the cell edges exactly — no gaps between adjacent cells.

### Drag Painting

Every grid cell the cursor path crosses is filled. Uses the Amanatides-Woo grid traversal algorithm to ensure no cells are skipped during fast drags. See [spatial-math-specification.md "### Brush Drag Painting"] for the algorithm.

Between consecutive mouse events, the traversal runs from the previous position to the current position, guaranteeing continuity.

### Brush Size

Configurable: 1×1 (default), 2×2, 3×3. The clicked/traversed cell is the top-left of the painted area. For a 2×2 brush, each traversed cell expands to a 2×2 region. For 3×3, a 3×3 region.

### Overwrite

Painting over an existing terrain cell replaces its type. No confirmation needed.

### Alt Modifier

Alt disables snap for terrain placement [snap-system.md "## Alt Modifier Behavior"].

## Eraser (Terrain)

The Eraser tool (E) removes terrain from clicked cells. The cell returns to the default empty canvas background. The eraser also removes other element types — see [selection-manipulation.md "## Eraser Tool"].

## Built-in Types

grass, soil, weed/wild, concrete, gravel, mulch. Extensible via registry (config file, not UI).

## Rendering

Solid colors in MVP. Realistic but stylized tiling textures planned for Phase 2 [visual-design.md "### Icons"].
