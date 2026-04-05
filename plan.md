# Garden Planner — Implementation Plan

## Context

The Garden Planner is a greenfield React SPA for visually designing garden layouts on an interactive canvas. All documentation is complete (PRD, UI/UX guidelines, BDD specs, keyboard shortcuts) but no code exists yet. This plan phases the implementation into vertical slices, each delivering testable functionality. The BDD spec (`docs/03-behavior-specifications.md`) is the source of truth for all behaviors.

## Reference Documents

- `docs/01-product-requirements.md` — feature scope
- `docs/02-ui-ux-design-guidelines.md` — visual design, layout, accessibility
- `docs/03-behavior-specifications.md` — BDD scenarios (source of truth)
- `docs/06-keyboard-shortcuts.md` — shortcut reference

---

## Phase 0: Project Scaffold & Foundation

**Goal**: Buildable app with types, stores, and registries — no visual output yet.

### Tasks

- [ ] Initialize Vite + React 19 + TypeScript project
- [ ] Configure Tailwind CSS (system font stack, blue accent #1971c2, white/gray chrome)
- [ ] Install dependencies: react-konva, konva, zustand, dexie, vitest, @playwright/test
- [ ] Create TypeScript type definitions:
  - `src/types/elements.ts` — BaseElement, TerrainElement, PlantElement, StructureElement, LabelElement
  - `src/types/garden.ts` — Garden, GridConfig
  - `src/types/registries.ts` — TerrainType, PlantType, StructureType
  - `src/types/journal.ts` — JournalEntry, WeatherSnapshot
- [ ] Create JSON registries:
  - `src/registries/terrain.json` — grass, soil, weed, concrete, gravel, mulch
  - `src/registries/plants.json` — cherry-tomato, tomato, onion, eggplant, pepper, basil, lettuce, carrot (full metadata: spacingCm, sun, water, season, daysToHarvest, companionPlants)
  - `src/registries/structures.json` — brick-wall, fence, raised-bed
  - `src/registries/loader.ts` — typed registry loader
- [ ] Create Zustand stores:
  - `src/stores/gardenStore.ts` — elements[], gridConfig, CRUD actions, undo/redo middleware (zustand-temporal or custom)
  - `src/stores/uiStore.ts` — activeTool, selectedElementIds[], viewport {x, y, zoom}, panel visibility
  - `src/stores/journalStore.ts` — journal entries, CRUD actions
- [ ] Create coordinate utilities:
  - `src/utils/coordinates.ts` — worldToScreen, screenToWorld, snapToGrid (floor-based)
- [ ] Basic App shell: `src/App.tsx` with layout skeleton (toolbar, palette, canvas area, inspector, status bar)

### Test gate
- Unit tests: stores (add/remove/update elements), registry loader, coordinate transforms (floor-based snapping: (2.7, 3.1) → (2, 3))
- App builds and renders without errors

---

## Phase 1: Canvas Foundation

**Goal**: Interactive canvas with pan, zoom, grid, rulers, and status bar.

### Tasks

- [ ] `src/components/canvas/GardenCanvas.tsx` — Konva Stage with 6 layers (grid, terrain, structures, plants, labels, selection UI)
- [ ] Pan: middle-click drag, Space+drag (suppresses active tool), two-finger drag
- [ ] Zoom: Ctrl+scroll toward cursor, pinch toward pinch center
- [ ] Fit-to-view: Ctrl+Shift+1 (adjusts viewport to show all elements with padding)
- [ ] Grid rendering: 1m cells, dotted lines, fade at low zoom, prominent at high zoom
- [ ] `src/components/ui/Rulers.tsx` — HTML overlay rulers along top and left edges, meter markings, update with pan/zoom
- [ ] `src/components/ui/StatusBar.tsx` — zoom %, real-time cursor world coordinates

### BDD scenarios covered
- Feature: Canvas Navigation (all scenarios)
- Feature: Rulers (all scenarios)
- Feature: Grid System (cell size, appearance at zoom levels)

### Test gate
- Playwright: pan moves viewport, zoom changes scale, coordinates round-trip correctly
- Visual: grid renders, rulers track viewport, status bar updates in real-time

---

## Phase 2: Element Placement

**Goal**: Place terrain, plants, structures, and labels on the canvas.

### Tasks

- [ ] Tool hook pattern: one hook per tool activated by `uiStore.activeTool`
- [ ] `src/hooks/useTerrainBrush.ts`:
  - Click to paint single cell at floor(cursor position)
  - Drag to paint multiple cells
  - Brush size: 1x1, 2x2, 3x3 (clicked cell = top-left of painted area)
  - Terrain fills entire cell visually, no gaps between adjacent cells
  - Alt disables grid snapping
- [ ] `src/hooks/useEraser.ts` — remove element at clicked cell
- [ ] `src/hooks/usePlantPlacement.ts`:
  - Click to place plant at floor(cursor position)
  - Plant icon centered within grid cell
  - Visual size proportional to spacingCm / 100cm
  - Default status: "planned"
  - Alt disables grid snapping
- [ ] `src/hooks/useStructurePlacement.ts`:
  - Click for default-sized structure
  - Drag to define extent (start cell to end cell)
  - Edges align to grid cell boundaries
  - Alt disables grid snapping
- [ ] `src/hooks/useLabelTool.ts`:
  - Click to place text input at exact cursor position (free, no snap)
  - Alt ENABLES grid snapping (inverted behavior)
  - Double-click to edit, Escape/click-outside to save
- [ ] Canvas render layers (bottom to top): grid → terrain (colored rectangles) → structures → plants (icons centered in cells) → labels → selection UI
- [ ] Elements can freely overlap across layers

### BDD scenarios covered
- Feature: Terrain Painting (all)
- Feature: Plant Placement (all)
- Feature: Structure Placement (all)
- Feature: Labels & Annotations (place, edit, inverted snapping)
- Feature: Grid System (cursor-to-cell mapping, floor-based snapping, disable snapping)

### Test gate
- Unit tests: floor-based snapping, terrain cell filling, plant size calculation from spacingCm
- Playwright: place each element type, verify render order, verify terrain fills cell, verify plant centering

---

## Phase 3: Selection & Manipulation

**Goal**: Select, move, resize, rotate, delete, copy/paste, undo/redo.

### Tasks

- [ ] `src/hooks/useSelectTool.ts`:
  - Click to select single element (shows bounding box + handles)
  - Shift+click to add to selection
  - Drag on empty space: box select (fully enclosed)
  - Shift+drag on empty space: box select (partial intersection)
  - Click empty space: deselect all
- [ ] Move: free drag by default (no snapping), Alt+drag for grid snap
- [ ] Delete: Delete/Backspace removes selected elements
- [ ] Copy/paste: Ctrl+C copies, Ctrl+V pastes at cursor position (grid-snapped), pasted elements become selection
- [ ] Resize handles:
  - Terrain: drag edges, snap to grid boundaries
  - Structures: drag edges, snap to grid boundaries
  - Plants: NO resize handles (size from spacingCm only)
  - Labels: drag to resize text box, text wraps within bounds
- [ ] Structure rotation: rotation handle, rotates around center point. Only structures get rotation handle.
- [ ] Undo/redo: Zustand temporal middleware on gardenStore. Ctrl+Z / Ctrl+Shift+Z
- [ ] `src/components/canvas/SelectionLayer.tsx` — bounding boxes, resize handles, rotation handle (structures only)

### BDD scenarios covered
- Feature: Selection & Manipulation (all)
- Feature: Labels & Annotations (resize text box)

### Test gate
- Unit tests: selection logic (box enclosure vs partial intersection), undo/redo state stack
- Playwright: select, multi-select, move, resize terrain, rotate structure, undo/redo chain, copy/paste

---

## Phase 4: UI Chrome

**Goal**: Toolbar, palette, inspector, minimap, tooltips — full UI shell.

**Note**: Can begin in parallel with Phase 2 (toolbar/palette need only stores + registries from Phase 0).

### Tasks

- [ ] `src/components/ui/Toolbar.tsx`:
  - Tool buttons: Select (V), Hand (H), Terrain Brush (B), Plant (P), Structure (S), Eraser (E), Text/Label (T)
  - Undo/Redo buttons (always visible)
  - Active tool highlighted with accent blue (#1971c2)
  - Keyboard shortcuts activate tools
- [ ] `src/components/ui/Tooltip.tsx` — reusable tooltip component, 300ms delay, shows name + shortcut
- [ ] `src/components/ui/SidePalette.tsx`:
  - Tabs: Terrain | Plants | Structures
  - Each tab lists types from registry with thumbnails/swatches
  - Click item → stamp mode (active until Escape or tool switch)
  - Drag item → preview follows cursor → place on release
  - Search field filters across ALL tabs, auto-switches to matching tab
  - Collapsible (canvas expands to fill)
- [ ] `src/components/ui/InspectorPanel.tsx`:
  - Nothing selected → "Nothing selected"
  - Terrain: type dropdown, dimensions
  - Plant: ALL fields editable — name, planted date, spacing, status, quantity, notes, sun requirement, water need, season, days to harvest, companion plants
  - Structure: type dropdown, dimensions, notes
  - Label: font size, font color, text alignment, bold, italic
  - Multi-select: show primary (first) selected element
  - Changes apply immediately
  - Collapsible
- [ ] `src/components/ui/Minimap.tsx`:
  - Scaled-down view of all elements
  - Viewport rectangle indicator
  - Click to pan, double-click to fit-to-view
  - Collapsible
- [ ] Responsive behavior:
  - Desktop (1024px+): full layout
  - Tablet: side panels collapse to icons
  - Mobile: simplified view

### BDD scenarios covered
- Feature: Side Palette (all)
- Feature: Inspector Panel (all)
- Feature: Minimap (all)
- Feature: Status Bar (all)

### Test gate
- Playwright: tool switching via keyboard and click, palette search, inspector edits update canvas, minimap navigation
- Accessibility: focus indicators, screen reader labels, contrast check

---

## Phase 5: Persistence & Project Management

**Goal**: Save/load projects, export/import, welcome screen.

### Tasks

- [ ] `src/db/database.ts` — Dexie schema: gardens table, journal entries table
- [ ] Auto-save: subscribe to gardenStore changes, debounce 2-3s, write to IndexedDB
- [ ] `src/components/ui/WelcomeScreen.tsx`:
  - Shown when no projects exist
  - "Create new garden" (prompts for name) or "Import JSON"
  - Project list when projects exist (load, rename, delete)
- [ ] Save/load named projects to/from IndexedDB
- [ ] Delete project with confirmation dialog
- [ ] JSON export: download file with full garden data + registry entries
- [ ] JSON import: load file, create new project (duplicate name → "Name (2)")
- [ ] PNG export: render canvas to image (elements only, no UI chrome)

### BDD scenarios covered
- Feature: Persistence (all)

### Test gate
- Playwright: create project, place elements, reload page → elements persist. Export JSON, import → new project. Delete with confirmation. Duplicate import naming.
- Unit test: debounce logic, duplicate name generation

---

## Phase 6: Journal

**Goal**: Full journal feature with entry management, element linking, and views.

### Tasks

- [ ] `src/components/journal/JournalView.tsx` — full-screen view replacing canvas
- [ ] Navigation: open journal → canvas hidden, close journal → canvas restored
- [ ] `src/components/journal/JournalEntryForm.tsx` — create/edit entries: date (default today), title, text content (markdown), tags
- [ ] Tags: selectable from existing or create new
- [ ] Element linking:
  - Pre-selection: elements selected on canvas before opening journal auto-link to new entry
  - In-entry: search/pick elements from list to add/remove links
- [ ] `src/components/journal/JournalTimeline.tsx` — chronological list (newest first), scrollable
- [ ] `src/components/journal/JournalCalendar.tsx` — calendar view, click date to see entries
- [ ] View toggle: list ↔ calendar
- [ ] Search/filter by text or tag
- [ ] Persist journal entries via Dexie.js (same auto-save pattern)

### BDD scenarios covered
- Feature: Journal (all)

### Test gate
- Playwright: create entry, link elements, switch views, filter by tag, return to canvas
- Unit test: journal store CRUD, element linking logic

---

## Phase 7: Weather Integration

**Goal**: Weather data in journal entries via Open-Meteo API.

### Tasks

- [ ] `src/services/weather.ts` — Open-Meteo API client (https://api.open-meteo.com/v1/forecast)
- [ ] "Fetch weather" button in journal entry form
- [ ] Geolocation: request browser permission on first use, remember coordinates
- [ ] Manual location: project settings page/dialog for city or coordinates entry
- [ ] Pre-fill weather fields: temperature (C), humidity (%), condition (sunny/cloudy/rainy)
- [ ] Error handling: inline "Weather unavailable" message, fields left empty for manual entry
- [ ] Manual override: user can always edit weather fields directly

### BDD scenarios covered
- Feature: Weather Integration (all)

### Test gate
- Unit test: API client with mocked responses, error handling path
- Playwright: fetch weather (mocked API), manual entry, error state display

---

## Phase 8: Polish & Accessibility

**Goal**: Final pass for quality, accessibility, and responsive behavior.

### Tasks

- [ ] Accessibility audit: axe-core scan, fix violations
- [ ] Keyboard navigation: all tools reachable, focus indicators visible
- [ ] Screen reader labels for all toolbar actions and interactive elements
- [ ] Contrast ratio check for all UI text
- [ ] Responsive testing: tablet panel collapse, mobile simplified view
- [ ] Performance: profile canvas rendering with many elements, optimize re-renders
- [ ] Edge cases from BDD: terrain overwrite, plant-on-terrain layering, import with existing name
- [ ] Full end-to-end workflow test: create project → paint terrain → place plants → place structures → add labels → save → journal entry with weather → export JSON → export PNG

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
Phase 1 (Canvas)
  │
  ├──────────────┐
  ▼              ▼
Phase 2        Phase 4 (UI Chrome - toolbar/palette only)
(Placement)      │
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

**Parallelism opportunity**: Phase 4's toolbar and palette components can be built alongside Phases 2-3. The inspector panel should be completed after Phase 3 (needs selection).
