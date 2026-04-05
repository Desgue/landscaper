# Product Requirements Document (PRD)

## Vision

A web-based garden planner that combines the fluid, intuitive canvas experience of Excalidraw with domain-specific tools for garden design. Users can visually design their garden layout on a scaled grid, place terrain and plants, and maintain a journal to track their garden's evolution over time.

## Target Users

- Home gardeners who want to plan and track their garden layout
- People who want a visual, spatial tool — not a spreadsheet or note app

## Core Features

### F1: Infinite Canvas with Grid

- Pan, zoom, fit-to-view
- Grid overlay: 1m per square, configurable scale
- Minimap for orientation on large gardens

### F2: Terrain Painting

- Paint terrain types onto grid cells (floor-based cell snapping)
- Configurable brush size (1x1, 2x2, 3x3)
- Built-in types: grass, soil, weed/wild, concrete, gravel, mulch
- Extensible registry — add new terrain types via config
- Alt modifier toggles grid snapping (disables for most tools; enables for labels which default to free placement)

### F3: Plant Placement

- Place plants from a categorized sidebar palette (click-to-stamp or drag-and-drop)
- Built-in plants: cherry tomatoes, tomatoes, onions, eggplant, peppers, basil, lettuce, carrots
- Extensible registry — same pattern as terrain
- Plant spacing (spacingCm) determines the visual size of the plant within the grid cell; the plant icon is centered in the cell
- Each plant has: name, icon, spacing, season info, category, sun requirement, water need, days to harvest, companion plants

### F4: Selection & Manipulation

- Select, move, delete elements
- Multi-select (box select, shift-click)
- Copy/paste, undo/redo
- Resize terrain regions and structures (plants have fixed size from spacing)
- Inspector panel for editing properties of the selected element

### F4b: Structures

- Place structure elements on the canvas (click for default size, or drag to define extent)
- Built-in structures: brick walls, fences, raised beds
- Extensible registry — same pattern as terrain and plants
- Structures, plants, and terrain can freely overlap

### F4c: Labels & Annotations

- Text/label tool to add annotations on the canvas
- Labels are standalone elements: selectable, movable, resizable text boxes
- Font size, color, alignment, bold, italic configurable via inspector

### F5: Garden Journal

- Full-screen journal view (replaces canvas temporarily)
- Each entry: date, title, text notes, tags
- Link entries to specific elements (pre-selection from canvas or pick from within the entry)
- Timeline views: chronological list (default) and calendar view
- Filter/search by text or tags
- Weather snapshot per entry (fetched on demand via Open-Meteo API or entered manually)

### F6: Project Management

- Welcome screen on first launch (create new or import)
- Create, save, load, rename, delete garden projects
- Auto-save on every change (debounced)
- Export as JSON or PNG image
- Import from JSON (duplicate names get a suffix)

## Out of Scope (for MVP)

- Multi-user / real-time collaboration
- Advanced weather/climate integration (forecasting, alerts, seasonal planning)
- AI-powered suggestions
- Mobile-native app (responsive web is fine)
- E-commerce / seed purchasing integration
- Journal photo support (text only)

## Behavioral Specification

For detailed interaction behaviors, grid snapping rules, placement mechanics, and edge cases, see `docs/03-behavior-specifications.md`.
