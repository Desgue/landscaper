# System Architecture

## Architecture Overview

Single-page application (SPA) with a local-first architecture. No backend required for MVP — all data lives in the browser. No user accounts for MVP. Backend can be added later for sync/accounts.

```
┌────────────────────────────────────────────────────────┐
│                     Browser (SPA)                       │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐            │
│  │ Canvas   │  │ UI Shell │  │ Journal   │            │
│  │ Engine   │  │ (React)  │  │ Module    │            │
│  │          │  │          │  │           │            │
│  │ - Render │  │ - Toolbar│  │ - Entries │            │
│  │ - Pan/   │  │ - Palette│  │ - Weather │            │
│  │   Zoom   │  │ - Inspect│  │ - Timeline│            │
│  │ - Grid   │  │ - Modals │  │           │            │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘            │
│       │              │              │                   │
│  ┌────┴──────────────┴──────────────┴─────┐            │
│  │              State Management           │            │
│  │         (Zustand or similar)            │            │
│  │                                         │            │
│  │  - Garden state (elements, grid)        │            │
│  │  - UI state (tool, selection, zoom)     │            │
│  │  - Undo/redo history                    │            │
│  │  - Registries (terrain, plants, structures) │         │
│  └────────────────┬────────────────────────┘            │
│                   │                                     │
│  ┌────────────────┴────────────────────────┐            │
│  │           Persistence Layer              │            │
│  │                                         │            │
│  │  - IndexedDB (primary, via idb/Dexie)   │            │
│  │  - JSON export/import                   │            │
│  │  - Image export (canvas → PNG/SVG)      │            │
│  └─────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

## Tech Stack (Recommended)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | React + TypeScript | Ecosystem, component model, Excalidraw is React-based |
| **Canvas rendering** | HTML Canvas (2D) or **Konva.js** | Konva gives us layers, hit detection, events on a Canvas element. Alternative: pure Canvas 2D API for max control |
| **State management** | Zustand | Lightweight, works well with Canvas, easy undo/redo middleware |
| **Persistence** | IndexedDB via Dexie.js | Structured local storage, handles binary data for textures/icons |
| **Styling** | Tailwind CSS | For UI chrome (toolbar, panels). Canvas is separate. |
| **Build tool** | Vite | Fast dev server, good React/TS support |
| **Testing** | Vitest + Playwright | Unit + E2E |

### Canvas Engine Alternatives

The canvas is the hardest part. Options to evaluate:

1. **Konva.js + react-konva** — Battle-tested 2D canvas library with React bindings. Good for: shapes, layers, drag-and-drop, hit regions. Used by many whiteboard apps.
2. **Fabric.js** — Similar to Konva, more object-oriented. Slightly older, but very feature-rich.
3. **Custom Canvas 2D** — Maximum control, but we'd build our own scene graph, hit testing, etc. High effort.
4. **Excalidraw as a library** — We could fork/extend Excalidraw itself. Pro: get the UX for free. Con: heavily opinionated, may be hard to adapt for grid-based garden domain.
5. **PixiJS** — WebGL-based, very fast. Overkill unless we need to render thousands of elements.

**Recommendation**: Start with **Konva.js** — it gives us the building blocks (shapes, images, drag, zoom, layers) without the overhead of a full whiteboard framework.

## Key Architecture Decisions

### Canvas Rendering Pipeline

```
State (elements[]) → Canvas Engine → Pixel output
                   ↑
          User input (mouse, keyboard, touch)
```

- State is the source of truth. Canvas re-renders from state.
- User interactions dispatch actions that update state.
- Canvas engine handles: coordinate transforms, grid snapping, hit testing, viewport management.

### Undo/Redo

- Command pattern: each action produces a reversible command
- Store history stack in state manager
- Zustand middleware can intercept state changes and push to history

### Grid System

```
World coordinates (meters) ←→ Screen coordinates (pixels)

worldToScreen(x, y) = (x - viewportX) * zoom * cellPixelSize
screenToWorld(sx, sy) = sx / (zoom * cellPixelSize) + viewportX
```

- All elements are stored in world coordinates (meters)
- Grid snapping: round to nearest `cellSizeMeters` increment
- Viewport state: { x, y, zoom } — what part of the world is visible

### Layers (render order)

1. Grid lines (background)
2. Terrain elements
3. Structure elements (brick walls, fences, raised beds)
4. Plant elements
5. Labels/annotations
6. Selection overlay, handles, guides (UI layer)

### Persistence Strategy

```
Auto-save → IndexedDB (every N seconds or on change)
Manual save → IndexedDB (named project)
Export → JSON file download
Import → JSON file upload → load into state
Image export → Canvas.toDataURL() or svg serialization
```

## Project Structure (Proposed)

```
src/
├── app/                    # App shell, routing, providers
│   ├── App.tsx
│   └── main.tsx
├── canvas/                 # Canvas engine
│   ├── CanvasView.tsx      # Main canvas React component
│   ├── grid.ts             # Grid rendering and snapping
│   ├── viewport.ts         # Pan, zoom, coordinate transforms
│   ├── layers/             # Render layers
│   │   ├── TerrainLayer.tsx
│   │   ├── StructureLayer.tsx
│   │   ├── PlantLayer.tsx
│   │   ├── LabelLayer.tsx
│   │   └── SelectionLayer.tsx
│   └── tools/              # Tool behaviors
│       ├── SelectTool.ts
│       ├── PanTool.ts
│       ├── TerrainBrushTool.ts
│       ├── PlantPlacementTool.ts
│       ├── StructurePlacementTool.ts
│       ├── LabelTool.ts
│       └── EraserTool.ts
├── ui/                     # UI chrome (non-canvas)
│   ├── Toolbar.tsx
│   ├── SidePalette.tsx
│   ├── InspectorPanel.tsx
│   ├── StatusBar.tsx
│   └── Minimap.tsx
├── journal/                # Journal feature
│   ├── JournalPanel.tsx
│   ├── JournalEntry.tsx
│   └── JournalTimeline.tsx
├── store/                  # State management
│   ├── gardenStore.ts      # Garden state (elements, grid)
│   ├── uiStore.ts          # UI state (tool, selection, zoom)
│   ├── journalStore.ts     # Journal state
│   └── undoMiddleware.ts   # Undo/redo
├── registries/             # Extensible type registries
│   ├── terrain.json
│   ├── plants.json
│   ├── structures.json
│   └── registryLoader.ts
├── weather/                # Weather API integration
│   └── openMeteo.ts        # Open-Meteo API client
├── persistence/            # Save/load/export
│   ├── indexedDb.ts
│   ├── jsonExport.ts
│   └── imageExport.ts
├── types/                  # TypeScript type definitions
│   ├── garden.ts
│   ├── elements.ts
│   ├── terrain.ts
│   ├── plants.ts
│   ├── structures.ts
│   ├── labels.ts
│   └── journal.ts
└── assets/                 # Static assets
    ├── textures/           # Terrain texture images
    └── icons/              # Plant icons
```

## Weather API Integration

**Chosen API: Open-Meteo** — free, no API key, no signup, no rate limits for personal use.

- Base URL: `https://api.open-meteo.com/v1/forecast`
- No authentication required
- Provides: current temperature, humidity, weather condition, soil temperature, soil moisture
- Historical data back to 1940 (useful for seasonal insights)
- Called when creating a journal entry to auto-fill the weather snapshot
- User can override or manually enter weather data
- Graceful degradation: if API is unreachable, weather fields are left blank for manual entry

**Alternatives evaluated (kept as reference):**

| API | Free Tier | Notes |
|-----|-----------|-------|
| Open-Meteo | Unlimited (non-commercial) | **Selected.** No key, no card, best for personal use |
| OpenWeatherMap | 1,000 calls/day | Requires API key; One Call 3.0 needs credit card |
| WeatherAPI.com | 1M calls/month | Generous, includes astronomy data (sunrise/sunset) |
| Visual Crossing | 1,000 records/day | Strong historical data |
| Tomorrow.io | 500 calls/day | Has soil temperature data but lower limits |

## Future Backend (Post-MVP)

When/if we add a backend:

- Auth: email/password or OAuth
- Storage: PostgreSQL for structured data, S3 for images
- Sync: conflict-free save (last-write-wins or CRDT)
- API: REST or tRPC
- Hosting: Vercel (frontend) + Railway/Fly (backend)

## Resolved Questions

- Canvas engine: **Konva.js** (committed, no prototype spike needed)
- Local-first architecture adopted; service worker for offline support TBD post-MVP
- Image assets (textures, plant icons): **bundled with the app**
- Canvas engine: **integrated in app** (src/canvas/), not a separate package
