# Journal & Weather

The journal tracks the project's evolution over time with entries linked to canvas elements.

## Access

Opening the journal replaces the canvas [canvas-viewport.md "## Bounded Canvas"] with a full-screen journal view. Closing it returns to the canvas with the project intact.

## Entries

Each entry has: date (default today), title, text content (markdown), tags, and an optional weather snapshot.

### Tags

Tags are freeform labels (e.g., "planting", "harvest", "observation"). When creating or editing an entry, the user can select from existing tags or create new ones.

## Element Linking

Entries can be linked to specific elements on the canvas. Two mechanisms:

**Pre-selection**: if elements are selected on the canvas [selection-manipulation.md "## Select Tool (V)"] when the user opens the journal and creates a new entry, those elements are automatically linked. Links can be removed from within the entry.

**In-entry linking**: while editing an entry, the user can search or pick elements from a list to add links.

### Deleted Elements

When a linked element is deleted from the canvas, the link is preserved in the journal entry. The UI shows it as "deleted element" (grayed out, non-clickable). Links are not automatically removed — this preserves journal history.

### Visibility

Links are not visible on the canvas by default. They are visible in the inspector [selection-manipulation.md "## Inspector Panel"] (selecting an element shows its linked journal entries) and in the journal view (each entry shows its linked elements).

## Timeline Views

**List view** (default): chronological, newest first, scrollable.

**Calendar view**: entries displayed on a calendar by date. Click a date to see entries for that day.

Toggle between list and calendar.

## Search & Filter

Filter entries by text search or tag selection. Only matching entries are shown.

## Weather Integration

Each journal entry has an optional weather snapshot: temperature (C), humidity (%), condition (enum: sunny, partly-cloudy, cloudy, rainy, snowy, windy).

For the data model and link behavior (deletion handling, bidirectional queries), see [spatial-math-specification.md "## 11. Journal Element Linking"].

### Fetch on Demand

The entry form has a "Fetch weather" button. Clicking it fetches current weather from the Open-Meteo API (free, no key, no signup).

### Location

**Geolocation**: on first use, the browser prompts for permission. If granted, coordinates are remembered for future requests.

**Manual**: the user can set their location (city or coordinates) in project settings. Used as fallback when geolocation is unavailable or unwanted.

### Error Handling

If the API is unreachable: an inline message displays "Weather unavailable." Fields remain empty for manual entry.

### Manual Override

The user can always manually enter or override weather fields. Manual values are saved with the entry.
