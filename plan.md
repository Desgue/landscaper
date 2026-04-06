# Garden & Landscape Planner — Implementation Plan

## Context

A greenfield React SPA for visually designing yard transformations on an accurate, bounded canvas. Users define their yard boundary, then design the layout with terrain, plants, structures, paths, and borders — all at real-world proportions stored in centimeters. The BDD spec (`docs/03-behavior-specifications.md`) is the source of truth for all behaviors.

## Reference Documents

- `docs/01-product-requirements.md` — feature scope
- `docs/02-ui-ux-design-guidelines.md` — visual design, layout, accessibility
- `docs/03-behavior-specifications.md` — BDD scenarios (source of truth)
- `docs/06-keyboard-shortcuts.md` — shortcut reference

---

## Phase 0: Project Scaffold & Foundation

**Goal**: Buildable app with types, stores, registries, and coordinate math — no visual output yet.

### Tasks

- [ ] Initialize Vite + React 19 + TypeScript project
- [ ] Configure Tailwind CSS (system font stack, blue accent #1971c2, white/gray chrome)
- [ ] Install dependencies: react-konva, konva, zustand, dexie, vitest, @playwright/test
- [ ] Create TypeScript type definitions:
  - `src/types/elements.ts` — BaseElement, TerrainElement, PlantElement, StructureElement, LabelElement, PathElement, ArcElement
  - `src/types/garden.ts` — Garden, GridConfig, YardBoundary (polygon vertices + edge dimensions)
  - `src/types/registries.ts` — TerrainType, PlantType, StructureType, PathType
  - `src/types/journal.ts` — JournalEntry, WeatherSnapshot
- [ ] Create JSON registries:
  - `src/registries/terrain.json` — grass, soil, weed, concrete, gravel, mulch
  - `src/registries/plants.json` — cherry-tomato, tomato, onion, eggplant, pepper, basil, lettuce, carrot (full metadata)
  - `src/registries/structures.json` — brick-wall, fence, raised-bed
  - `src/registries/paths.json` — brick-edging (initial types)
  - `src/registries/loader.ts` — typed registry loader
- [ ] Create Zustand stores:
  - `src/stores/gardenStore.ts` — elements[], gridConfig, yardBoundary, CRUD actions, undo/redo middleware
  - `src/stores/uiStore.ts` — activeTool, selectedElementIds[], viewport {x, y, zoom}, panel visibility, snapEnabled, gridVisible
  - `src/stores/journalStore.ts` — journal entries, CRUD actions
- [ ] Create coordinate utilities:
  - `src/utils/coordinates.ts` — worldToScreen, screenToWorld (all in cm internally, display in meters)
  - `src/utils/snap.ts` — snapToIncrement (10cm nearest-round), extensible snap system interface for geometry snapping
- [ ] Basic App shell: `src/App.tsx` with layout skeleton

### Test gate
- Unit tests: stores, registry loader, coordinate transforms (cm ↔ screen), snap rounding (274cm → 270cm, 276cm → 280cm)
- App builds and renders without errors

---

## Phase 1: Yard Setup & Canvas Foundation

**Goal**: Yard boundary definition flow, then interactive bounded canvas with multi-resolution grid.

### Tasks

- [ ] `src/components/setup/YardSetup.tsx` — setup screen:
  - Click to place vertices defining boundary polygon
  - Display edge lengths, click to type exact dimensions (in meters)
  - Correct dimensions after placement (polygon adjusts)
  - Confirm to proceed to canvas
- [ ] `src/components/canvas/GardenCanvas.tsx` — Konva Stage with 7 layers (grid, terrain, paths, structures, plants, labels, selection UI)
- [ ] Bounded canvas: yard boundary visible, overflow area dimmed
- [ ] Yard boundary rendered as a distinct editable element
- [ ] Pan: middle-click drag, Space+drag (suppresses active tool), two-finger drag
- [ ] Zoom: Ctrl+scroll toward cursor, pinch toward pinch center
- [ ] Fit-to-view: Ctrl+Shift+1
- [ ] Multi-resolution grid: 1m major lines always visible, 10cm minor lines appear on zoom-in
- [ ] Grid display toggleable (Ctrl+')
- [ ] `src/components/ui/Rulers.tsx` — HTML overlay, 1m major + 10cm minor markings
- [ ] `src/components/ui/StatusBar.tsx` — zoom %, real-time cursor coordinates (meters with cm precision), snap/grid toggle indicators

### BDD scenarios covered
- Feature: Yard Setup (all)
- Feature: Bounded Canvas (all)
- Feature: Canvas Navigation (all)
- Feature: Rulers (all)
- Feature: Grid System (all)

### Test gate
- Playwright: define yard boundary, verify canvas bounds, pan/zoom, grid resolution changes with zoom
- Unit test: polygon dimension correction math, vertex placement

---

## Phase 2: Snap System & Element Placement

**Goal**: Full snap system, then place terrain, plants, structures, labels, arcs, and paths.

### Tasks

- [ ] `src/utils/snap.ts` — complete snap system:
  - 10cm increment snapping (nearest-round)
  - Geometry snapping: edge alignment, perpendicular alignment, midpoint alignment
  - Adaptive tolerance (tighter at high zoom, looser at low zoom)
  - Snap toggle (Ctrl+G)
  - Visual snap guides (accent blue lines)
- [ ] `src/hooks/useTerrainBrush.ts`:
  - Paint cells snapped to 10cm increments
  - Brush sizes 1x1, 2x2, 3x3
  - Alt disables snapping
- [ ] `src/hooks/useEraser.ts` — remove element at cursor
- [ ] `src/hooks/usePlantPlacement.ts`:
  - Place at snap-aligned position, icon centered in cell
  - Visual size proportional to spacingCm / 100cm
  - Default status: "planned"
- [ ] `src/hooks/useStructurePlacement.ts`:
  - Click for default size, drag to define extent
  - Straight or curved (arc property)
  - Edges snap to 10cm increments + geometry snapping
- [ ] `src/hooks/useArcTool.ts`:
  - Click start, click end, drag radius
  - Preview during creation
  - Snaps to 10cm + geometry snapping
  - Editable handles after placement
- [ ] `src/hooks/usePathTool.ts`:
  - Click start, click end for straight segments
  - Click start, click end, drag radius for curved segments
  - Per-segment straight/curved
  - Visual width from path type
- [ ] `src/hooks/useLabelTool.ts`:
  - Free placement by default, Alt ENABLES snapping (inverted)
  - Double-click to edit, Escape to save
- [ ] Canvas render layers (bottom to top): grid → terrain → paths → structures → plants → labels → selection UI

### BDD scenarios covered
- Feature: Snap System (all)
- Feature: Terrain Painting (all)
- Feature: Plant Placement (all)
- Feature: Structure Placement (all)
- Feature: Arc Tool (all)
- Feature: Path & Border Elements (all)
- Feature: Labels & Annotations (place, edit, inverted snapping)

### Test gate
- Unit tests: snap rounding, geometry snap detection, adaptive tolerance
- Playwright: place each element type, verify snap guides, verify 10cm alignment, verify arc creation, verify path segments

---

## Phase 3: Selection & Manipulation

**Goal**: Select, move, resize, rotate, delete, copy/paste, undo/redo.

### Tasks

- [ ] `src/hooks/useSelectTool.ts`:
  - Click to select (shows bounding box + handles)
  - Shift+click to add to selection
  - Drag on empty space: box select (fully enclosed)
  - Shift+drag: box select (partial intersection)
  - Click empty space: deselect all
- [ ] Move: free drag by default, Alt+drag for 10cm snap + geometry snapping
- [ ] Delete: Delete/Backspace
- [ ] Copy/paste: Ctrl+C/V, paste at cursor (snapped to 10cm)
- [ ] Resize handles:
  - Terrain: snap to 10cm increments
  - Structures: snap to 10cm increments
  - Plants: NO resize handles
  - Labels: resize text box, text wraps
  - Paths: edit segment endpoints and arc radii
- [ ] Structure rotation: rotation handle, around center. Only structures.
- [ ] Arc/path handle editing: drag start/end/radius handles
- [ ] Undo/redo: Zustand temporal middleware. Ctrl+Z / Ctrl+Shift+Z
- [ ] `src/components/canvas/SelectionLayer.tsx` — bounding boxes, resize handles, rotation handle, arc handles

### BDD scenarios covered
- Feature: Selection & Manipulation (all)

### Test gate
- Unit tests: selection logic, undo/redo state stack
- Playwright: select, multi-select, move (free + snapped), resize, rotate structure, edit arc, undo/redo, copy/paste

---

## Phase 4: UI Chrome

**Goal**: Toolbar, palette, inspector, minimap, tooltips — full UI shell.

**Note**: Toolbar and palette can begin in parallel with Phase 2. Inspector completes after Phase 3.

### Tasks

- [ ] `src/components/ui/Toolbar.tsx`:
  - Tools: Select (V), Hand (H), Terrain Brush (B), Plant (P), Structure (S), Arc (A), Eraser (E), Text/Label (T)
  - Undo/Redo always visible
  - Active tool highlighted blue (#1971c2)
- [ ] `src/components/ui/Tooltip.tsx` — 300ms delay, name + shortcut
- [ ] `src/components/ui/SidePalette.tsx`:
  - Tabs: Terrain | Plants | Structures | Paths
  - Stamp mode on click, drag-to-canvas
  - Cross-tab search with auto-switch
  - Collapsible
- [ ] `src/components/ui/InspectorPanel.tsx`:
  - Terrain: type, dimensions (meters)
  - Plant: all fields editable (name, date, spacing, status, quantity, notes, sun, water, season, harvest, companions)
  - Structure: type, dimensions, shape (straight/curved), arc radius when curved, notes
  - Path: type, width, length, per-segment straight/curved, arc radii
  - Label: font size, color, alignment, bold, italic
  - Multi-select: primary element
  - Collapsible
- [ ] `src/components/ui/Minimap.tsx`:
  - Yard boundary outline + all elements
  - Viewport rectangle, click to navigate, double-click fit-to-view
  - Collapsible
- [ ] Responsive: desktop full, tablet collapse panels, mobile simplified

### BDD scenarios covered
- Feature: Side Palette (all)
- Feature: Inspector Panel (all)
- Feature: Minimap (all)
- Feature: Status Bar (all)

### Test gate
- Playwright: tool switching, palette search across tabs, inspector edits, minimap navigation
- Accessibility: focus indicators, screen reader labels

---

## Phase 5: Persistence & Project Management

**Goal**: Save/load projects, export/import, welcome screen with yard setup flow.

### Tasks

- [ ] `src/db/database.ts` — Dexie schema: projects table (garden + yard boundary), journal entries table
- [ ] Auto-save: subscribe to gardenStore, debounce 2-3s, write to IndexedDB
- [ ] `src/components/ui/WelcomeScreen.tsx`:
  - No projects: create new or import JSON
  - Projects exist: list with load, rename, delete
- [ ] New project flow: name → yard setup → canvas
- [ ] Save/load named projects
- [ ] Delete with confirmation
- [ ] JSON export/import (duplicate name → "Name (2)")
- [ ] PNG export (elements only, no chrome)

### BDD scenarios covered
- Feature: Persistence (all)

### Test gate
- Playwright: full flow (welcome → yard setup → canvas → save → reload → loads), export/import, delete
- Unit test: debounce, duplicate naming

---

## Phase 6: Journal

**Goal**: Full journal feature with entry management, element linking, and views.

### Tasks

- [ ] `src/components/journal/JournalView.tsx` — full-screen, replaces canvas
- [ ] Navigation: open → canvas hidden, close → canvas restored
- [ ] `src/components/journal/JournalEntryForm.tsx` — date, title, markdown text, tags
- [ ] Tags: select existing or create new
- [ ] Element linking: pre-selection auto-link + in-entry picker
- [ ] `src/components/journal/JournalTimeline.tsx` — chronological list (newest first)
- [ ] `src/components/journal/JournalCalendar.tsx` — calendar view
- [ ] View toggle, search/filter by text or tag
- [ ] Persist via Dexie.js

### BDD scenarios covered
- Feature: Journal (all)

### Test gate
- Playwright: create entry, link elements, switch views, filter, return to canvas
- Unit test: journal store CRUD

---

## Phase 7: Weather Integration

**Goal**: Weather data in journal entries via Open-Meteo API.

### Tasks

- [ ] `src/services/weather.ts` — Open-Meteo client
- [ ] "Fetch weather" button in entry form
- [ ] Geolocation: permission on first use, remember coordinates
- [ ] Manual location: project settings for city/coordinates
- [ ] Pre-fill: temperature, humidity, condition
- [ ] Error: inline "Weather unavailable", fields empty for manual entry
- [ ] Manual override always available

### BDD scenarios covered
- Feature: Weather Integration (all)

### Test gate
- Unit test: mocked API, error handling
- Playwright: fetch (mocked), manual entry, error state

---

## Phase 8: Polish & Accessibility

**Goal**: Final quality pass.

### Tasks

- [ ] Accessibility: axe-core audit, fix violations
- [ ] Keyboard navigation: all tools, focus indicators
- [ ] Screen reader labels, contrast check
- [ ] Responsive: tablet/mobile breakpoints
- [ ] Performance: profile with many elements, optimize re-renders
- [ ] Edge cases from BDD: overlap scenarios, boundary editing, snap guide accuracy
- [ ] Full e2e test: create project → yard setup → paint terrain → place plants → place structures → draw arc → add path → add labels → save → journal with weather → export JSON → export PNG

### Test gate
- axe audit passes
- Full workflow Playwright test passes
- Responsive breakpoints tested

---

## Phase Dependency Graph

```
Phase 0 (Scaffold)
  │
  ▼
Phase 1 (Yard Setup + Canvas)
  │
  ├──────────────┐
  ▼              ▼
Phase 2        Phase 4 (UI Chrome - toolbar/palette)
(Snap + Place)   │
  │              │
  ▼              │
Phase 3 ◄────────┘ (inspector needs selection from Phase 3)
(Selection)
  │
  ▼
Phase 5 (Persistence)
  │
  ▼
Phase 6 (Journal)
  │
  ▼
Phase 7 (Weather)
  │
  ▼
Phase 8 (Polish)
```

**Parallelism**: Phase 4 toolbar/palette can start alongside Phase 2. Inspector completes after Phase 3.
