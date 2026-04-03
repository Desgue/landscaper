# Product Requirements Document (PRD)

## Vision

A web-based garden planner that combines the fluid, intuitive canvas experience of Excalidraw with domain-specific tools for garden design. Users can visually design their garden layout on a scaled grid, place terrain and plants, and maintain a journal to track their garden's evolution over time.

## Target Users

- Home gardeners who want to plan and track their garden layout
- People who want a visual, spatial tool — not a spreadsheet or note app

## Core Features

### F1: Infinite Canvas with Grid

- Pan (scroll/drag), zoom (pinch/scroll wheel), fit-to-view
- Grid overlay: default 1m per square, configurable scale
- Rulers on edges showing real-world measurements (meters)
- Minimap for orientation on large gardens

### F2: Terrain Painting

- Paint terrain types onto grid cells (grid-cell-based painting)
- Option to disable grid snapping for freeform placement when needed
- Built-in types: grass, soil, weed/wild, concrete, gravel, mulch
- Extensible registry — users or devs can add new terrain types
- Each terrain type has: name, texture/pattern, color, metadata

### F3: Plant Placement

- Drag-and-drop plants from a categorized sidebar/palette
- Built-in plants: cherry tomatoes, tomatoes, onions, eggplant, peppers, basil, lettuce, carrots
- Each herb is a separate registry entry (no generic "herbs" grouping)
- Extensible registry — same pattern as terrain
- Each plant has: name, icon, spacing requirements, season info, category
- Plant spacing defines the outer box of the plant's grid cell (the cell edges); configurable per plant type since different plants have different spacing needs
- Plants snap to grid but allow sub-grid positioning

### F4: Selection & Manipulation

- Select, move, resize, rotate, delete elements
- Multi-select (box select, shift-click)
- Copy/paste, undo/redo
- Properties panel (inspector) for selected element

### F4b: Structures

- Place structure elements on the canvas
- Built-in structures: brick walls, fences, raised beds
- Extensible registry — same pattern as terrain and plants
- Each structure has: name, icon, dimensions, metadata

### F4c: Labels & Annotations

- Text/label tool to add annotations on the canvas
- Labels are standalone elements that can be selected, moved, and styled

### F5: Garden Journal

- Timeline of journal entries tied to a garden project
- Each entry: date, text notes, linked elements, optional weather snapshot
- Weather data auto-filled from weather API (Open-Meteo) or entered manually
- Track planting dates, watering, harvest, observations
- Filter/search journal history

### F6: Project Management

- Create, save, load, rename, delete garden projects
- Auto-save to local storage + explicit save/export
- Export as image (PNG/SVG) or JSON

## Out of Scope (for MVP)

- Multi-user / real-time collaboration
- Advanced weather/climate integration (forecasting, alerts, seasonal planning)
- AI-powered suggestions
- Mobile-native app (responsive web is fine)
- E-commerce / seed purchasing integration
- Journal photo support
- Measure tool

## Success Metrics

- TODO: Define once we align on what success looks like

## Resolved Decisions

- Terrain is grid-cell-based, with an option to disable grid snapping
- No photo support in journal (text only)
- Weather snapshots in journal (auto-filled via Open-Meteo API or manual)
- Each herb/plant is a separate registry entry — no generic groupings
- Structures (brick walls, fences, raised beds) are in MVP scope
- Labels/text tool is in MVP scope
- No measure tool
- Plant spacing defines the plant's grid cell outer box, configurable per plant type
- Local-only, local-first architecture — no user accounts for MVP
- Full plant metadata in MVP (spacing, sun, water, season, days to harvest, companion plants)
- Raised bed is a structure type, not a terrain type
