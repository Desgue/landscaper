# Domain Model & Data Schema

## Design Goal

All element types (terrain, plants, structures, labels) follow a **registry pattern** — a base interface with a type-specific config, making it trivial to add new types without changing core logic.

## Core Entities

### Garden (Project)

The top-level container.

```
Garden {
  id: string (uuid)
  name: string
  createdAt: datetime
  updatedAt: datetime
  gridConfig: GridConfig
  elements: Element[]          // all things placed on the canvas
  journalEntries: JournalEntry[]
}

GridConfig {
  cellSizeMeters: number       // default 1.0
  width: number                // garden width in cells (optional, can be infinite)
  height: number               // garden height in cells (optional)
  originX: number              // world-space offset
  originY: number
}
```

### Element (base)

Everything on the canvas is an Element.

```
Element {
  id: string (uuid)
  type: "terrain" | "plant" | "structure" | "label"
  x: number                    // world position (meters)
  y: number
  width: number                // meters
  height: number               // meters
  rotation: number             // degrees
  zIndex: number
  locked: boolean
  metadata: Record<string, any>  // extensible per-type data
  createdAt: datetime
  updatedAt: datetime
}
```

### Terrain Types — Registry

```
TerrainType {
  id: string                   // e.g. "soil", "grass", "concrete"
  name: string                 // display name
  category: string             // e.g. "natural", "hardscape"
  color: string                // hex fallback color
  textureUrl: string?          // optional tiling texture image
  pattern: string?             // optional CSS/SVG pattern id
  description: string?
}
```

**Built-in terrain types:**

| id | name | category | color |
|----|------|----------|-------|
| grass | Grass | natural | #4CAF50 |
| soil | Soil | natural | #8B6914 |
| weed | Weed/Wild | natural | #6B8E23 |
| concrete | Concrete | hardscape | #9E9E9E |
| gravel | Gravel | hardscape | #BDBDBD |
| mulch | Mulch | natural | #5D4037 |

**Adding a new terrain type** = add an entry to the registry (JSON/config). No code changes needed.

### Plant Types — Registry

```
PlantType {
  id: string                   // e.g. "cherry-tomato"
  name: string                 // display name
  category: string             // e.g. "vegetable", "herb", "fruit", "flower"
  iconUrl: string              // top-down icon for canvas
  thumbnailUrl: string         // sidebar thumbnail
  spacingCm: number            // defines the outer box (cell size) of the plant on the grid; configurable per plant type
  rowSpacingCm: number         // recommended row spacing
  sunRequirement: "full" | "partial" | "shade"
  waterNeed: "low" | "medium" | "high"
  season: string[]             // e.g. ["spring", "summer"]
  daysToHarvest: number?       // optional
  companionPlants: string[]    // ids of companion plants
  description: string?
}
```

**Built-in plant types:**

| id | name | category | spacingCm |
|----|------|----------|-----------|
| cherry-tomato | Cherry Tomato | vegetable | 45 |
| tomato | Tomato | vegetable | 60 |
| onion | Onion | vegetable | 10 |
| eggplant | Eggplant | vegetable | 60 |
| pepper | Pepper | vegetable | 45 |
| basil | Basil | herb | 20 |
| lettuce | Lettuce | vegetable | 25 |
| carrot | Carrot | vegetable | 5 |

**Adding a new plant type** = add an entry to the registry. No code changes needed.

### Terrain Element (extends Element)

Terrain is grid-cell-based by default. Width/height are in whole cell units unless grid snapping is disabled.

```
TerrainElement extends Element {
  type: "terrain"
  terrainTypeId: string        // references TerrainType.id
  gridSnapped: boolean         // true = locked to grid cells, false = freeform placement
  // width/height define the painted area (in grid cells when snapped, meters when freeform)
}
```

### Plant Element (extends Element)

```
PlantElement extends Element {
  type: "plant"
  plantTypeId: string          // references PlantType.id
  plantedDate: date?           // when it was planted (journal link)
  status: "planned" | "planted" | "growing" | "harvested" | "removed"
  quantity: number             // default 1
  notes: string?
}
```

### Structure Types — Registry

```
StructureType {
  id: string                   // e.g. "brick-wall", "fence", "raised-bed"
  name: string                 // display name
  category: string             // e.g. "boundary", "container"
  iconUrl: string              // canvas icon
  thumbnailUrl: string         // sidebar thumbnail
  defaultWidth: number         // default width in meters
  defaultHeight: number        // default height in meters
  description: string?
}
```

**Built-in structure types:**

| id | name | category |
|----|------|----------|
| brick-wall | Brick Wall | boundary |
| fence | Fence | boundary |
| raised-bed | Raised Bed | container |

**Adding a new structure type** = add an entry to the registry. No code changes needed.

### Structure Element (extends Element)

```
StructureElement extends Element {
  type: "structure"
  structureTypeId: string      // references StructureType.id
  notes: string?
}
```

### Label Element (extends Element)

```
LabelElement extends Element {
  type: "label"
  text: string
  fontSize: number
  fontColor: string
}
```

### Journal Entry

```
JournalEntry {
  id: string (uuid)
  gardenId: string
  date: date
  title: string?
  content: string              // markdown or rich text
  linkedElementIds: string[]   // elements this entry is about
  tags: string[]               // e.g. "planting", "harvest", "observation"
  weather: WeatherSnapshot?    // optional, auto-filled from weather API or manual
  createdAt: datetime
}

WeatherSnapshot {
  tempC: number?
  condition: string?           // "sunny", "cloudy", "rainy"
  humidity: number?
}
```

## Registry Extension Pattern

```
// registries/terrain.json
{
  "types": [
    { "id": "grass", "name": "Grass", ... },
    { "id": "soil", "name": "Soil", ... },
    // ADD NEW TYPES HERE
  ]
}

// registries/plants.json
{
  "types": [
    { "id": "cherry-tomato", "name": "Cherry Tomato", ... },
    // ADD NEW TYPES HERE — each herb/plant is a separate entry, no generic groupings
  ]
}

// registries/structures.json
{
  "types": [
    { "id": "brick-wall", "name": "Brick Wall", ... },
    { "id": "fence", "name": "Fence", ... },
    { "id": "raised-bed", "name": "Raised Bed", ... },
    // ADD NEW TYPES HERE
  ]
}
```

The app loads these registries at startup. The canvas, palette, and inspector all derive their options from the registry — no hardcoded switch statements.

## Serialization Format

Garden projects serialize to JSON for save/load/export:

```json
{
  "version": "1.0",
  "garden": { ... },
  "registries": {
    "terrain": [ ... ],
    "plants": [ ... ],
    "structures": [ ... ]
  }
}
```

This allows custom types to travel with the project file.

## Resolved Decisions

- Terrain is grid-cell-based with option to disable grid snapping
- Structures (brick walls, fences, raised beds) are in MVP
- Raised bed is a structure type, not a terrain type
- No photo support in journal (text only)
- Weather snapshots in journal entries (auto-filled via weather API or manual entry)
- Each herb/plant is a separate registry entry — no generic groupings
- Plant spacing (`spacingCm`) defines the plant's outer grid cell box, configurable per plant type

## Open Questions

- [ ] Should registries be user-editable in the UI, or config-file-only for now?
- [ ] How much plant metadata is MVP vs nice-to-have? (companion planting, days to harvest)
