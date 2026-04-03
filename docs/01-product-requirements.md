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

- Paint terrain types onto grid cells or freeform regions
- Built-in types: grass, soil, weed, concrete, gravel, mulch
- Extensible registry — users or devs can add new terrain types
- Each terrain type has: name, texture/pattern, color, metadata

### F3: Plant Placement

- Drag-and-drop plants from a categorized sidebar/palette
- Built-in plants: cherry tomatoes, tomatoes, onions, eggplant, peppers, herbs, lettuce, carrots
- Extensible registry — same pattern as terrain
- Each plant has: name, icon, spacing requirements, season info, category
- Plants snap to grid but allow sub-grid positioning

### F4: Selection & Manipulation

- Select, move, resize, rotate, delete elements
- Multi-select (box select, shift-click)
- Copy/paste, undo/redo
- Properties panel (inspector) for selected element

### F5: Garden Journal

- Timeline of journal entries tied to a garden project
- Each entry: date, text notes, optional photos, linked elements
- Track planting dates, watering, harvest, observations
- Filter/search journal history

### F6: Project Management

- Create, save, load, rename, delete garden projects
- Auto-save to local storage + explicit save/export
- Export as image (PNG/SVG) or JSON

## Out of Scope (for MVP)

- Multi-user / real-time collaboration
- Weather/climate integration
- AI-powered suggestions
- Mobile-native app (responsive web is fine)
- E-commerce / seed purchasing integration

## Success Metrics

- TODO: Define once we align on what success looks like

## Open Questions

- [ ] Should terrain be grid-cell-based (Minecraft style) or freeform shapes (Excalidraw style)?
- [ ] Do we need user accounts, or is local-only storage sufficient for MVP?
- [ ] What level of plant metadata do we want? (just visual, or growing guides too?)
- [ ] Should the journal support photo uploads or just text?
