# Data Schema & Serialization

Defines the JSON structure for project export/import and the registry format for extensible element types. This is the single source of truth for data shape — TypeScript types should mirror this schema exactly.

## Export Format

```json
{
  "version": "1.0",
  "exportedAt": "2026-04-06T12:00:00Z",
  "project": {
    "id": "uuid",
    "name": "string",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime",
    "location": {
      "lat": "number | null",
      "lng": "number | null",
      "label": "string | null"
    },
    "gridConfig": {
      "cellSizeCm": 100,
      "snapIncrementCm": 10,
      "originX": 0,
      "originY": 0
    },
    "viewport": {
      "panX": 0,
      "panY": 0,
      "zoom": 1.0
    },
    "uiState": {
      "gridVisible": true,
      "snapEnabled": true
    },
    "yardBoundary": {
      "vertices": [
        { "x": "number (cm)", "y": "number (cm)" }
      ],
      "edgeLengths": ["number (cm) | null"],
      "edgeTypes": [
        {
          "type": "line | arc",
          "arcSagitta": "number (cm) | null"
        }
      ]
    },
    "currency": "string (display symbol, default '$')",
    "layers": ["...see Layer Schema below"],
    "groups": ["...see Group Schema below"],
    "elements": ["...see Element Schema below"],
    "journalEntries": ["...see Journal Entry Schema below"]
  },
  "registries": {
    "terrain": ["...see Terrain Type"],
    "plants": ["...see Plant Type"],
    "structures": ["...see Structure Type"],
    "paths": ["...see Path Type"]
  }
}
```

### Yard Boundary Storage

The yard boundary is stored at project level (`project.yardBoundary`), not in the `elements[]` array, because it defines the project's spatial extent and is created during the setup flow before any elements exist [yard-setup.md "## Define Boundary"]. However, once on the canvas it behaves like a regular editable element — it can be selected, moved, resized, or deleted [yard-setup.md "## Boundary as Element"]. The UI treats it as an element; the schema stores it separately for structural clarity.

If `yardBoundary` is `null` or omitted, the project has no boundary — the user is prompted to define one. If present, `yardBoundary` must be an object with a `vertices` array of >= 3 entries; otherwise it is treated as `null`.

### Viewport & UI State

`viewport` and `uiState` are optional. When absent on import, defaults are applied. These fields allow the user to resume where they left off when reopening a project.

## Element Schema (base)

Every element on the canvas shares this base:

```json
{
  "id": "uuid",
  "type": "terrain | plant | structure | path | label | dimension",
  "x": "number (cm)",
  "y": "number (cm)",
  "width": "number (cm)",
  "height": "number (cm)",
  "rotation": "number (degrees, [0, 360), 0 = no rotation)",
  "zIndex": "number (integer, default 0)",
  "locked": false,
  "layerId": "uuid (references Layer.id)",
  "groupId": "uuid (references Group.id) | null",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### Rotation

### Locked

`locked` is `false` by default. Locking is primarily driven by the layer system [layers-groups.md "## Layer Locking"] — all elements on a locked layer behave as locked. The per-element `locked` field allows locking individual elements independently of their layer.

### Layer & Group Assignment

`layerId` references a layer in the project's `layers[]` array. Every element must belong to exactly one layer. If omitted on import, the element is assigned to the default layer. See [layers-groups.md "## Layer Model"] for layer behavior.

`groupId` references a group in the project's `groups[]` array, or `null` if the element is ungrouped. All elements in a group must share the same `layerId`. See [layers-groups.md "## Grouping"] for group behavior.

### Rotation

Only structures support rotation. Plants, terrain, labels, and paths always store `rotation: 0`. The UI does not show a rotation handle for these types. Rotation values are normalized to the range [0, 360) on save — negative or >= 360 values are reduced via modular arithmetic.

### Z-Index

`zIndex` controls render order within the same element type layer. Higher values render on top. Default is `0`. Elements with the same `zIndex` fall back to `createdAt` timestamp (latest on top).

The UI provides **Bring to Front** and **Send to Back** actions (via right-click context menu or keyboard shortcuts) that adjust `zIndex` relative to other elements of the same type. Z-index does not affect cross-type layer order — labels always render above plants regardless of `zIndex` [canvas-viewport.md "## Render Layer Order (bottom to top)"]. Selection also respects `zIndex` — within the same type layer, higher `zIndex` wins. If `zIndex` is equal, `createdAt` breaks the tie (latest on top).

### Width & Height: Stored vs Derived

Width and height are always **stored** on every element for uniform hit testing and selection. However, for some element types, these values are **derived** from other properties and should be recomputed when those properties change:

| Element type | Width/height derived from | When to recompute |
|---|---|---|
| Terrain | Always 100×100 (one grid cell) | Never (constant) |
| Plant | `spacingCm` from the plant type registry | When plant type changes |
| Structure | User-defined (resize handles) | On resize |
| Path | AABB of all points (bounding box) | When any point moves |
| Label | Text box bounds (user-defined) | On resize or text change |

### Terrain Element

```json
{
  "...base",
  "type": "terrain",
  "terrainTypeId": "string (references TerrainType.id)"
}
```

Width and height are always 100cm (one grid cell). Position (x, y) is the cell's top-left corner aligned to 100cm boundaries.

### Plant Element

```json
{
  "...base",
  "type": "plant",
  "plantTypeId": "string (references PlantType.id)",
  "plantedDate": "ISO 8601 date | null",
  "status": "planned | planted | growing | harvested | removed",
  "quantity": "integer >= 1",
  "notes": "string | null"
}
```

Width and height equal the plant type's `spacingCm`. These values are stored on the element but must be updated if the plant type's `spacingCm` changes. Rotation is always 0.

### Structure Element

```json
{
  "...base",
  "type": "structure",
  "structureTypeId": "string (references StructureType.id)",
  "shape": "straight | curved",
  "arcSagitta": "number (cm) | null",
  "notes": "string | null"
}
```

When `shape` is `"curved"`, `arcSagitta` stores the signed bulge height. If `shape` is `"curved"` but `arcSagitta` is `null` or `0`, the structure is treated as straight (degenerate arc). The arc's start/end points are derived from (x, y) and (x + width, y). See [spatial-math-specification.md "## 5. Arc Geometry"] for how sagitta determines center and radius.

### Path Element

```json
{
  "...base",
  "type": "path",
  "pathTypeId": "string (references PathType.id)",
  "points": [
    { "x": "number (cm)", "y": "number (cm)" }
  ],
  "segments": [
    {
      "type": "line | arc",
      "arcSagitta": "number (cm) | null"
    }
  ],
  "strokeWidthCm": "number",
  "closed": false
}
```

`points` has N+1 entries for N segments. `segments[i]` connects `points[i]` to `points[i+1]`. See [spatial-math-specification.md "## 6. Path Segment Connectivity"] for the data model.

The base `x`, `y` equals `points[0]` (redundant but required for uniform AABB hit testing). `width` and `height` are the AABB of all points — stored on the element but recomputed whenever any point moves.

#### Closed Paths

When `closed` is `true`, the path renders a closing segment from `points[N]` back to `points[0]`. This closing segment is **implicit** — it is NOT stored in the `segments` array. The `segments` array always has exactly `points.length - 1` entries regardless of `closed`. The implicit closing segment is always a straight line; to make it curved, add an explicit final segment back to the start point and set `closed: false`.

### Label Element

```json
{
  "...base",
  "type": "label",
  "text": "string",
  "fontSize": "number (px, 4-200)",
  "fontColor": "string (hex, e.g. '#333333')",
  "fontFamily": "string",
  "textAlign": "left | center | right",
  "bold": false,
  "italic": false
}
```

Width and height define the text box bounds. Rotation is always 0.

### Dimension Element

```json
{
  "...base",
  "type": "dimension",
  "startPoint": { "x": "number (cm)", "y": "number (cm)" },
  "endPoint": { "x": "number (cm)", "y": "number (cm)" },
  "startElementId": "uuid | null",
  "endElementId": "uuid | null",
  "offsetCm": "number (perpendicular offset from measurement line, default 50)",
  "displayUnit": "m",
  "precision": "number (decimal places, 0-4, default 2)"
}
```

`startPoint` and `endPoint` define the measured world positions. When `startElementId` or `endElementId` is non-null, the corresponding point tracks the linked element's nearest edge or corner — the point auto-updates when the linked element moves or resizes. See [spatial-math-specification.md "### Linked Dimension Updates"] for the tracking algorithm.

If a linked element is deleted, the link ID is preserved as a stale reference (same pattern as journal links [## Journal Entry Schema]). The dimension endpoint becomes a fixed world point at the last known position.

The base `x`, `y` equals `startPoint` (for uniform hit testing). `width` and `height` are the AABB of startPoint, endPoint, and the offset leader line — recomputed when any point or offset changes.

Rotation is always 0. Dimension lines orient based on their start/end points, not the `rotation` field.

## Layer Schema

```json
{
  "id": "uuid",
  "name": "string (max 100 chars)",
  "visible": true,
  "locked": false,
  "order": "number (integer, display order in layer panel)"
}
```

Layers are stored at project level in `project.layers[]`. Every project has at least one layer — the default layer (name: `"Default"`, cannot be deleted but can be renamed). Layer `order` controls display position in the layer panel only — it does NOT affect canvas render order, which remains type-based [canvas-viewport.md "## Render Layer Order (bottom to top)"].

Layer visibility and locking behavior: [layers-groups.md "## Layer Visibility"], [layers-groups.md "## Layer Locking"].

## Group Schema

```json
{
  "id": "uuid",
  "name": "string (max 100 chars) | null",
  "elementIds": ["uuid"],
  "layerId": "uuid (references Layer.id)"
}
```

Groups are stored at project level in `project.groups[]`. All elements in a group must share the same `layerId`. Groups are flat — no nesting (an element cannot belong to more than one group, and groups cannot contain other groups).

`elementIds` is the authoritative list. Each element also stores `groupId` as a back-reference for efficient lookup. These must stay in sync — updating one requires updating the other.

See [layers-groups.md "## Grouping"] for interaction behavior.

## Journal Entry Schema

```json
{
  "id": "uuid",
  "projectId": "uuid",
  "date": "ISO 8601 date",
  "title": "string | null",
  "content": "string (markdown)",
  "tags": ["string"],
  "linkedElementIds": ["uuid"],
  "weather": {
    "tempC": "number | null",
    "condition": "sunny | partly-cloudy | cloudy | rainy | snowy | windy | null",
    "humidity": "number (0-100) | null"
  } | null,
  "createdAt": "ISO 8601 datetime"
}
```

`linkedElementIds` stores references to element UUIDs. Element IDs are never reused, so stale links (referencing deleted elements) cannot collide with new elements. The UI shows stale links as "deleted element" (grayed out). Links are not automatically removed on element deletion — they preserve journal history. See [spatial-math-specification.md "## 11. Journal Element Linking"].

## Registry Schemas

Registries define the available types for each element category. Built-in types ship with the app. Custom types added by the user (via config file, not UI) follow the same schema. Registry IDs are unique **within their own registry** — a terrain ID `"brick"` and a path ID `"brick"` can coexist without collision since they are referenced by different fields (`terrainTypeId` vs `pathTypeId`).

### Terrain Type

```json
{
  "id": "string (slug, e.g. 'grass')",
  "name": "string (e.g. 'Grass', max 100 chars)",
  "category": "natural | hardscape | water | other",
  "color": "string (hex, 6-digit with hash, e.g. '#4CAF50')",
  "textureUrl": "string (URL or relative path) | null",
  "costPerUnit": "number | null (cost per m²)",
  "description": "string (max 500 chars) | null"
}
```

The segmentation render maps terrain type IDs to fixed colors by exact ID match before falling back to `category`. Built-in terrain type IDs and their semantic mappings: `"grass"` → lawn/grass, `"soil"` / `"mulch"` / `"bark"` → soil/mulch, `"gravel"` / `"concrete"` → gravel/stone, `"wood-decking"` / `"decking-surface"` → wood decking, `"water"` → water. Custom terrain types without a matching built-in ID fall back to their `category`: `natural` → `#00AA00`, `hardscape` → `#AAAAAA`, `water` → `#4169E1`, `other` → `#8B4513`. See [segmentation-render.md "## Segmentation Color Table"].

### Plant Type

```json
{
  "id": "string (slug, e.g. 'cherry-tomato')",
  "name": "string (e.g. 'Cherry Tomato', max 100 chars)",
  "category": "string (e.g. 'vegetable', 'herb', 'fruit', 'flower', 'tree', 'shrub', max 50 chars)",
  "growthForm": "herb | shrub | tree | groundcover | climber",
  "iconUrl": "string (URL or relative path)",
  "spacingCm": "number (1-500)",
  "rowSpacingCm": "number (1-500)",
  "canopyWidthCm": "number (1-5000) | null",
  "heightCm": "number (1-5000) | null",
  "trunkWidthCm": "number (1-500) | null",
  "sunRequirement": "full | partial | shade",
  "waterNeed": "low | medium | high",
  "season": ["spring | summer | fall | winter"],
  "daysToHarvest": "number (1-365) | null",
  "companionPlants": ["string (plant type ids)"],
  "costPerUnit": "number | null (cost per plant)",
  "description": "string (max 500 chars) | null"
}
```

`growthForm` determines the visual representation and collision behavior [plants.md "## Growth Form"]:

- `herb`: current behavior — icon centered in cell, size = `spacingCm`
- `tree`: dual-circle rendering — trunk circle (`trunkWidthCm`) + semi-transparent canopy circle (`canopyWidthCm`). Canopy is overhead and does not block ground-level elements.
- `shrub`: filled circle/oval, size = `canopyWidthCm` if set, else `spacingCm`
- `groundcover`: fills area like terrain but placed as a plant element
- `climber`: placed against structures, directional indicator

`canopyWidthCm` is the mature canopy diameter for trees and shrubs. `heightCm` is the mature real-world height of the plant (informational metadata, shown in inspector only) — it has no effect on the 2D canvas rendering. The app is 2D only; there is no Z-axis, elevation, or 3D rendering. `trunkWidthCm` is the trunk diameter for trees (used for ground-level collision). Rendering fallbacks: when `canopyWidthCm` is `null`, tree and shrub canopy renders at `spacingCm` diameter. When `trunkWidthCm` is `null`, the tree trunk renders at a fixed 20cm diameter.

`season` values are constrained to the four standard seasons. `companionPlants` references are informational — IDs that don't match a known plant type are kept as-is (they may reference user-defined types added later).

### Structure Type

```json
{
  "id": "string (slug, e.g. 'brick-wall')",
  "name": "string (e.g. 'Brick Wall', max 100 chars)",
  "category": "string (e.g. 'boundary', 'container', 'surface', 'overhead', 'feature', 'furniture', max 50 chars)",
  "material": "wood | metal | masonry | stone | other | null",
  "iconUrl": "string (URL or relative path)",
  "defaultWidthCm": "number (1-10000)",
  "defaultDepthCm": "number (1-10000)",
  "costPerUnit": "number | null (cost per structure)",
  "description": "string (max 500 chars) | null"
}
```

`defaultWidthCm` and `defaultDepthCm` are the 2D canvas footprint dimensions (X and Y axes in the top-down view) applied when a structure is first placed. They are **not** physical real-world height — the app is 2D only and has no Z-axis, elevation, or vertical dimension in its data model or rendering.

`material` drives the segmentation render color [segmentation-render.md "## Segmentation Color Table"]. Allowed values: `"wood"`, `"metal"`, `"masonry"`, `"stone"`, `"other"`, or `null`. When `null` or omitted, the backend falls back to `#888888`. Special cases: structures with `category: "feature"` whose id contains `"water"` render as water (`#4169E1`); structures whose id contains `"fire"` render as fire (`#FF6633`) regardless of material.

The `category` field has semantic meaning for collision rules [canvas-viewport.md "## Collision Rules"]:

- `"boundary"` — walls, fences. Blocks structures, paths, and plants.
- `"container"` — raised beds, planters, garden beds. Accepts plants inside bounds.
- `"surface"` — patios, decks. Blocks other surfaces and terrain painting over it. Plants and labels allowed on top.
- `"overhead"` — pergolas, arbors. Does NOT block ground-level elements beneath it. Plants, structures, and paths can exist under overhead structures.
- `"feature"` — water features, fire pits. Standalone decorative. Blocks structures and plants like `"boundary"`.
- `"furniture"` — benches, tables, planters. Blocks other structures like `"boundary"`.

### Path Type

```json
{
  "id": "string (slug, e.g. 'brick-edging')",
  "name": "string (e.g. 'Brick Edging', max 100 chars)",
  "category": "string (e.g. 'edging', 'walkway', max 50 chars)",
  "material": "stone | gravel | brick | wood | concrete | other | null",
  "defaultWidthCm": "number (1-500)",
  "color": "string (hex, 6-digit with hash, e.g. '#8B4513')",
  "costPerUnit": "number | null (cost per linear meter)",
  "description": "string (max 500 chars) | null"
}
```

`material` drives the segmentation render color [segmentation-render.md "## Segmentation Color Table"]. Allowed values: `"stone"`, `"gravel"`, `"brick"`, `"wood"`, `"concrete"`, `"other"`, or `null`. When `null` or omitted, the backend falls back to `#888888`. The `color` field drives the 2D canvas display only and has no effect on segmentation rendering.

### Registry ID Format

All registry IDs must be **lowercase kebab-case slugs** matching the pattern `[a-z0-9]+(-[a-z0-9]+)*`. Max 50 characters. Examples: `grass`, `cherry-tomato`, `brick-wall`. This ensures URL-safe, case-insensitive, human-readable identifiers.

## Import Validation & Defaults

When importing a JSON file, every field is validated. Invalid or missing values fall back to safe defaults rather than rejecting the file. This ensures forward compatibility and robustness against hand-edited or corrupted files.

### Hex Color Format

All hex color fields use the format `#RRGGBB` — 6-digit, lowercase or uppercase, with leading hash. 3-digit shorthand (`#F00`) is expanded to 6-digit (`#FF0000`) on import. Alpha channel (`#RRGGBBAA`) is not supported — alpha is stripped on import. Invalid hex values fall back to type-specific defaults.

### Project-level defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `version` | Must be string | `"1.0"` |
| `project.id` | Must be valid UUID | Generate new UUID |
| `project.name` | Must be non-empty string, max 200 chars | `"Imported Project"` |
| `project.createdAt` | Must be valid ISO 8601 | Current datetime |
| `project.updatedAt` | Must be valid ISO 8601 | Current datetime |
| `project.location.lat` | Number in [-90, 90] or null | `null` |
| `project.location.lng` | Number in [-180, 180] or null | `null` |
| `project.location.label` | String, max 200 chars, or null | `null` |
| `project.gridConfig.cellSizeCm` | Positive number | `100` |
| `project.gridConfig.snapIncrementCm` | Positive number, <= cellSizeCm, must evenly divide cellSizeCm. If invalid, falls back to `10` | `10` |
| `project.gridConfig.originX` | Finite number | `0` |
| `project.gridConfig.originY` | Finite number | `0` |
| `project.currency` | Non-empty string, max 10 chars | `"$"` |
| `project.layers` | Array of Layer objects | `[{ id: generated, name: "Default", visible: true, locked: false, order: 0 }]` |
| `project.groups` | Array of Group objects | `[]` |

### Layer defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `id` | Valid UUID, unique within project | Generate new UUID |
| `name` | Non-empty string, max 100 chars | `"Layer"` |
| `visible` | Boolean | `true` |
| `locked` | Boolean | `false` |
| `order` | Finite integer | Next sequential integer |

### Group defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `id` | Valid UUID, unique within project | Generate new UUID |
| `name` | String, max 100 chars, or null | `null` |
| `elementIds` | Array of valid UUIDs (existence check against elements) | Remove IDs not found in elements. If < 2 remain, **skip group** |
| `layerId` | Valid UUID referencing a layer | Default layer ID |

### Viewport defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `viewport` | Object | `null` (use defaults below) |
| `viewport.panX` | Finite number | `0` |
| `viewport.panY` | Finite number | `0` |
| `viewport.zoom` | Number in [0.05, 10.0] | `1.0` |

### UI state defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `uiState` | Object | `null` (use defaults below) |
| `uiState.gridVisible` | Boolean | `true` |
| `uiState.snapEnabled` | Boolean | `true` |

### Yard boundary defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `yardBoundary` | Object with vertices array, or null | `null` (no boundary — user prompted to set up) |
| `vertices` | Array of {x, y} with >= 3 entries | Treat boundary as `null` if < 3 valid vertices |
| `vertices[n].x`, `.y` | Finite number | Drop invalid vertex |
| `edgeLengths` | Array of numbers or null | `null` (computed from vertex positions using Euclidean distance) |
| `edgeTypes` | Array of `{ type, arcSagitta }` matching vertex count | `null` (all edges default to `"line"`) |
| `edgeTypes[n].type` | `"line"` or `"arc"` | `"line"` |
| `edgeTypes[n].arcSagitta` | Finite number or null | `null` (if type is `"arc"` and sagitta is null/0, treated as line) |

### Element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `id` | Valid UUID, unique within project | Generate new UUID (see Duplicate ID Resolution) |
| `type` | One of: terrain, plant, structure, path, label, dimension | **Skip element** (unknown type) |
| `x`, `y` | Finite number | `0` |
| `width`, `height` | Positive finite number | `100` (1m). **Note:** type-specific rules override this default — terrain forces 100×100, plant recomputes from `spacingCm`, path recomputes from AABB. The generic default only applies when the type-specific computation cannot run (e.g., missing registry entry) |
| `rotation` | Finite number | `0` (normalized to [0, 360) via `((r % 360) + 360) % 360`) |
| `zIndex` | Finite integer | `0` |
| `locked` | Boolean | `false` |
| `layerId` | Valid UUID referencing a layer | Default layer ID |
| `groupId` | Valid UUID referencing a group, or null | `null` |
| `createdAt`, `updatedAt` | Valid ISO 8601 | Current datetime |

### Terrain element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `terrainTypeId` | String matching a known terrain type | `"grass"` (built-in type, guaranteed to exist) |

### Plant element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `plantTypeId` | String matching a known plant type | **Skip element** (can't render unknown plant) |
| `plantedDate` | Valid ISO 8601 date or null | `null` |
| `status` | One of: planned, planted, growing, harvested, removed | `"planned"` |
| `quantity` | Integer >= 1 | `1` |
| `notes` | String, max 2000 chars, or null | `null` |

Note: if `plantedDate` is non-null and `status` is `"planned"`, the import keeps both values as-is. The data model allows this — the user may have set a future planting date while the plant is still in planning.

### Structure element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `structureTypeId` | String matching a known structure type | **Skip element** |
| `shape` | `"straight"` or `"curved"` | `"straight"` |
| `arcSagitta` | Finite number or null | `null` (if `shape` is `"curved"` and sagitta is null/0, treated as straight) |
| `notes` | String, max 2000 chars, or null | `null` |

### Path element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `pathTypeId` | String matching a known path type | **Skip element** |
| `points` | Array of {x, y} with >= 2 valid entries | **Skip element** |
| `segments` | Array matching points length - 1 | Fill missing with `{ type: "line" }` |
| `segments[n].type` | `"line"` or `"arc"` | `"line"` |
| `segments[n].arcSagitta` | Finite number or null | `null` (if type is `"arc"` and sagitta is null/0, treated as line) |
| `strokeWidthCm` | Positive number, 1-500 | Path type's `defaultWidthCm`, or `10` if type unavailable |
| `closed` | Boolean | `false` |

### Label element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `text` | Non-empty string after trim, max 5000 chars | **Skip element** (empty or whitespace-only label is meaningless) |
| `fontSize` | Positive number, 4-200 | `16` |
| `fontColor` | Valid hex color (see Hex Color Format) | `"#333333"` |
| `fontFamily` | Non-empty string, max 100 chars | `"system-ui"` |
| `textAlign` | `"left"`, `"center"`, or `"right"` | `"left"` |
| `bold` | Boolean | `false` |
| `italic` | Boolean | `false` |

### Dimension element defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `startPoint` | Object with finite `x` and `y` | **Skip element** |
| `endPoint` | Object with finite `x` and `y` | **Skip element** |
| `startElementId` | Valid UUID or null | `null` |
| `endElementId` | Valid UUID or null | `null` |
| `offsetCm` | Finite number | `50` |
| `displayUnit` | Must be `"m"` (only supported value) | `"m"` |
| `precision` | Integer 0-4 | `2` |

### Journal entry defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `id` | Valid UUID | Generate new UUID |
| `date` | Valid ISO 8601 date | Current date |
| `title` | String, max 200 chars, or null | `null` |
| `content` | String, max 50000 chars | `""` |
| `tags` | Array of strings | `[]` |
| `linkedElementIds` | Array of valid UUIDs (syntactic check only — no existence check) | `[]` |
| `weather.tempC` | Finite number in [-100, 100] or null | `null` |
| `weather.condition` | One of: sunny, partly-cloudy, cloudy, rainy, snowy, windy; or null | `null` |
| `weather.humidity` | Number 0-100 or null | `null` |

### Registry entry defaults

| Field | Validation | Default |
|-------|-----------|---------|
| `id` | Non-empty string matching slug format, unique within registry | **Skip type** (no valid ID = unusable) |
| `name` | Non-empty string, max 100 chars | Title-case from `id`: split on `-`, capitalize each word, join with space (e.g., `"cherry-tomato"` → `"Cherry Tomato"`) |
| `category` (terrain) | One of: `"natural"`, `"hardscape"`, `"water"`, `"other"` | `"other"` |
| `category` (plant/structure/path) | String, max 50 chars | `"other"` |
| `color` (terrain/path) | Valid hex (see Hex Color Format) | `"#999999"` |
| `iconUrl` (plant/structure) | Non-empty string | **Skip type** (can't render without icon) |
| `textureUrl` (terrain) | String or null | `null` |
| `spacingCm` (plant) | Positive number, 1-500 | `30` |
| `rowSpacingCm` (plant) | Positive number, 1-500 | Same as `spacingCm` |
| `defaultWidthCm` (structure/path) | Positive number, 1-10000 | `100` |
| `defaultDepthCm` (structure) | Positive number, 1-10000 | `100` |
| `sunRequirement` (plant) | `"full"`, `"partial"`, or `"shade"` | `"full"` |
| `waterNeed` (plant) | `"low"`, `"medium"`, or `"high"` | `"medium"` |
| `season` (plant) | Array of: `"spring"`, `"summer"`, `"fall"`, `"winter"` | `[]` (invalid values silently dropped) |
| `daysToHarvest` (plant) | Positive integer 1-365 or null | `null` |
| `companionPlants` (plant) | Array of strings | `[]` (unresolved IDs kept as-is) |
| `growthForm` (plant) | One of: `"herb"`, `"shrub"`, `"tree"`, `"groundcover"`, `"climber"` | `"herb"` |
| `canopyWidthCm` (plant) | Positive number 1-5000 or null | `null` |
| `heightCm` (plant) | Positive number 1-5000 or null | `null` |
| `trunkWidthCm` (plant) | Positive number 1-500 or null | `null` |
| `material` (structure) | One of: `"wood"`, `"metal"`, `"masonry"`, `"stone"`, `"other"`, or null | `null` |
| `material` (path) | One of: `"stone"`, `"gravel"`, `"brick"`, `"wood"`, `"concrete"`, `"other"`, or null | `null` |
| `costPerUnit` (all registries) | Positive number or null | `null` |
| `description` (all) | String, max 500 chars, or null | `null` |

### Import behavior rules

1. **Never reject an entire file** for field-level errors. Fix what can be fixed, skip what can't, import the rest.
2. **Skip unknown element types** silently — forward compatibility for future element types.
3. **Skip elements with unknown type IDs** (e.g., a plant referencing a plantTypeId not in the registries) — unless the registry is included in the import file.
4. **Merge registries**: imported registry types are added to built-in types. If an imported type has the same ID as a built-in, the imported version wins (allows overrides).
5. **Regenerate IDs** if `project.id` collides with an existing local project.
6. **Log warnings** for each defaulted field to a non-blocking import report (shown to user after import completes).
7. **Registries are optional** on import. If the `registries` object is missing or any sub-registry is missing, use built-in types only. Elements referencing unknown types are skipped per rule 3.

### Duplicate ID resolution

If two or more elements in the imported `elements[]` array share the same UUID:

1. Keep the **first** occurrence as-is (it retains the original UUID).
2. Generate a new UUID for each subsequent duplicate.
3. Journal entries' `linkedElementIds` always refer to the first occurrence — no remapping needed, since only later duplicates receive new IDs.
4. Log a warning for each regenerated ID.

