# Persistence & Project Management

All data is local. No backend, no user accounts.

## Welcome Screen

Shown when the app opens with no saved projects. Options: create a new project or import a JSON file. The canvas is not shown until a project is created or loaded.

When saved projects exist, the welcome screen shows a project list with options to load, rename, or delete.

## New Project Flow

1. User chooses "Create new project"
2. Prompted for a project name
3. Yard setup screen appears [yard-setup.md]
4. After confirming the yard boundary, the canvas opens

## Auto-Save

Every meaningful change (place, move, delete, edit) triggers an auto-save after a debounce period of 2–3 seconds. No user action required.

## Save & Load

Projects are persisted locally by name. When the user returns later, they select a project from the list and load it.

## Rename

The user can rename a project from the welcome screen project list or from within the app.

## Delete

Delete removes the project from the saved list. The user is asked to confirm before deletion.

## JSON Export

Exports the full project data as a downloadable JSON file.

## JSON Import

Importing a JSON file creates a new project from the file data and opens it. If a project with the same name already exists, the imported project is named "Name (2)".

## PNG Export

Exports a high-resolution image of the canvas. Includes all visible elements but not the UI chrome (toolbar, palette, inspector, status bar).
