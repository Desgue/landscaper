# Cost Tracking

Cost tracking derives project costs from element type registries and element quantities on the canvas. Costs are read-only per element — pricing is defined at the registry type level, not per instance.

## Cost Model

Each registry type (terrain, plant, structure, path) has an optional `costPerUnit` field [data-schema.md "## Registry Schemas"]. The unit depends on element type:

| Element type | Cost unit | Derived cost formula |
|-------------|----------|---------------------|
| Terrain | per m² | `costPerUnit × cellCount` (each cell = 1 m²) |
| Plant | per plant | `costPerUnit × quantity` (instance `quantity` field) |
| Structure | per structure | `costPerUnit × 1` (each placed structure) |
| Path | per linear meter | `costPerUnit × totalLengthM` (sum of segment lengths) |
| Label | — | No cost (annotations) |
| Dimension | — | No cost (annotations) |

When `costPerUnit` is `null` or `0` for a type, elements of that type contribute nothing to the total cost and no cost line is shown in the inspector for those elements.

## Currency Setting

The project has a `currency` field (default: `"$"`), stored at the project level [data-schema.md "## Export Format"]. This is a display symbol only — no currency conversion is performed. The symbol is prepended to all cost displays (e.g., `$45.00`).

Editable in project settings (accessible from the Project Menu).

## Inspector Integration

When an element is selected, the inspector shows its derived cost below the element's properties:

- **Cost line**: `[currency][amount]` — e.g., `$12.50`
- **Calculation**: brief formula shown in muted text — e.g., `5 × $2.50/plant` or `3.2 m² × $15.00/m²`

The cost is read-only in the inspector. To change an element's cost, the user edits the `costPerUnit` on the type in the registry (via config file). The inspector shows a "Cost from type: [type name]" label to indicate the source.

When multiple elements are selected, the inspector shows the combined cost of all selected elements.

## Cost Summary Panel

Accessible from the Project Menu → "Cost Summary" or via a dedicated button in the status bar.

### Breakdown

The summary shows costs grouped by element type, then by specific type within each category:

```
Terrain
  Grass          12.0 m²    $180.00
  Gravel          4.0 m²     $60.00
Plants
  Tomato          × 8        $40.00
  Lavender        × 12       $96.00
Structures
  Raised Bed      × 2       $200.00
  Fence           × 3       $450.00
Paths
  Brick Edging    6.2 m      $93.00
                   ─────────────────
  Total                   $1,119.00
```

### Layer Breakdown

When the project has multiple layers [layers-groups.md "## Layer Model"], the summary can optionally group by layer, showing per-layer subtotals. Toggle between "by type" and "by layer" views.

### Export

The cost summary is included in the JSON export as part of the project data (the costs are derived from elements and registries, not stored separately — they are recomputed on load). The cost summary is NOT included in PNG export.

## Cost Calculation Rules

1. **Terrain**: count all terrain elements with the same `terrainTypeId`, multiply count by `costPerUnit`. Each terrain cell = 1 m².
2. **Plants**: for each plant element, cost = `plantType.costPerUnit × element.quantity`.
3. **Structures**: for each structure element, cost = `structureType.costPerUnit × 1`.
4. **Paths**: for each path element, compute total segment length in meters [spatial-math-specification.md "### Perimeter Calculation"], multiply by `pathType.costPerUnit`.
5. **Null costs**: types with `costPerUnit: null` or `0` are excluded from the summary entirely.
6. **Hidden layers**: elements on hidden layers [layers-groups.md "## Layer Visibility"] are included in cost calculations by default. The cost summary has a toggle: "Include hidden layers" (default on). Turning it off excludes hidden-layer elements from the total.
