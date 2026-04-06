# Terrain Painting

Terrain fills grid cells with surface types. Terrain is the lowest content layer on the canvas [canvas-viewport.md "## Render Layer Order (bottom to top)"].

## Terrain Brush Tool (B)

Select a terrain type from the palette [visual-design.md "### Side Palette"], then click or drag on the canvas to paint.

### Cell Mapping

Terrain cells are 1m × 1m (100cm × 100cm). The cell containing a cursor position is `floor(worldPos / 100) * 100`. Cells always align to 100cm boundaries. Snap is always active during terrain placement (Alt disables it). Note: the "10cm snap" from [snap-system.md "## Grid Snap"] affects cell boundary positioning when the grid origin is offset from the default — it does not change cell size, which is always 100cm.

### Single Click

Fills the grid cell under the cursor with the selected terrain type's color. The terrain element occupies exactly one cell and its visual bounds match the cell edges exactly — no gaps between adjacent cells.

### Drag Painting

Every grid cell the cursor path crosses is filled. Uses the Amanatides-Woo grid traversal algorithm to ensure no cells are skipped during fast drags. See [spatial-math-specification.md "### Brush Drag Painting (Grid Traversal)"] for the algorithm.

Between consecutive mouse events, the traversal runs from the previous position to the current position, guaranteeing continuity.

### Brush Size

Configurable: 1×1 (default), 2×2, 3×3. Brush size is a transient tool setting in the toolbar (not persisted in the data model). Each traversed cell is expanded to a cursor-centered NxN region. For a 2×2 brush, the region offsets top-left by 1 cell (top-left biased). For 3×3, the traversed cell is the center of the 3×3 region. See [spatial-math-specification.md "### Brush Drag Painting (Grid Traversal)"] for the exact formula.

### Overwrite

Painting over an existing terrain cell replaces its type. No confirmation needed.

### Alt Modifier

Alt disables snap for terrain placement [snap-system.md "## Alt Modifier Behavior"].

## Eraser (Terrain)

The Eraser tool (E) follows the standard topmost-element priority [selection-manipulation.md "## Eraser Tool (E)"]. When terrain is the topmost element at the cursor position, the eraser removes that terrain cell (it returns to the default empty canvas background). When a higher-priority element (label, plant, structure, path) is above the terrain, the eraser removes that element instead.

## Inspector

When a terrain element is selected, the inspector shows: terrain type and dimensions (in meters). All element types can be linked to journal entries [journal.md "## Element Linking"].

## Built-in Types

**Natural**: grass, soil, weed/wild, sand. **Hardscape**: concrete, gravel, pebbles, decking-surface. **Mulch**: mulch, bark-chips. Extensible via registry (config file, not UI).

## Collision Rules

Terrain is the ground layer and has minimal collision constraints [canvas-viewport.md "## Collision Rules"]. Terrain can be painted anywhere, regardless of most other elements. Painting over an existing terrain cell replaces its type.

**Exception**: terrain cannot be painted over structures with `category: "surface"` (patios, decks). The brush skips cells occupied by surface structures. Other structure categories do not block terrain painting.

## Rendering

Solid colors in MVP. Realistic but stylized tiling textures planned for Phase 2 [visual-design.md "## Icons"].
