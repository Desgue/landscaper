# Garden Planner — PLAN-BAU-8: IndexedDB Migration System

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific doc sections into context. Do not read whole spec files unless the task explicitly requires it.
- **Check phase status first.** Scan `## Phases` top-to-bottom and find the first phase that is not `done`. Work within that phase only.
- **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating the Plan

- **After completing a task:** change its status line from `[ ]` to `[x]` and append `— done YYYY-MM-DD` to the task line.
- **After completing a feature:** change `Status:` from `todo` / `in-progress` to `done`.
- **After completing a phase:** change the phase header badge from `[ ]` to `[x]`.
- **When you make an architectural decision:** add an entry to `## Decision Log` in the format shown.
- **When you hit a blocker:** add a `Blocker:` note to the task and set its status checkbox to `[-]` (blocked). Notify via the log.
- **Never rewrite history.** Append to the Agent Log; do not edit previous entries.
- **Keep diffs small.** Only edit the lines that changed. Do not reformat or reorder unrelated sections.

### Status Vocabulary

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Done |
| `[-]`  | Blocked |

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-BAU-8` |
| **Title** | IndexedDB Migration System |
| **Scope** | Implement a versioned migration framework for IndexedDB; capture the v1 schema as migration baseline. Excludes actual schema changes from spikes (BAU-23, 24, 25, 26) — those add new migrations on top of this framework. |
| **Status** | `in-progress` |
| **Started** | 2026-04-08 |
| **Last updated** | 2026-04-08 |
| **Phases** | Phase 1: Migration framework + v1 baseline · Phase 2: Testing + documentation |

> **Critical infrastructure:** this plan gates all spikes that add new IndexedDB store fields (BAU-23, 24, 25, 26). No spike may bump `DB_VERSION` until this plan is `done`.

---

## Context Map

### How to load specific sections

```bash
# Inspect current DB setup (45 lines — read whole file):
# src/db/db.ts

# Inspect store operations (79 lines — read whole file):
# src/db/projectsDb.ts

# Find any existing migration or version references:
grep -n "DB_VERSION\|onupgradeneeded\|upgrade\|migration\|version" /Users/mercor/Code/personal/landscaper/src/db/db.ts

# Find idb openDB call signature:
grep -n "openDB\|upgrade\|oldVersion\|newVersion" /Users/mercor/Code/personal/landscaper/src/db/db.ts

# Locate existing db tests:
ls /Users/mercor/Code/personal/landscaper/src/db/__tests__/

# Check idb version (governs upgrade callback signature):
grep '"idb"' /Users/mercor/Code/personal/landscaper/package.json

# Check for fake-indexeddb availability:
grep -r "fake-indexeddb" /Users/mercor/Code/personal/landscaper/package.json
```

### Document Registry

| File | What it owns | Load hint |
|------|-------------|-----------|
| `src/db/db.ts` | DB name, `DB_VERSION`, store definitions, `getDB()`, `openDB` upgrade callback | Read whole file (45 lines) |
| `src/db/projectsDb.ts` | All CRUD operations over `projects` and `undoHistory` stores | Read whole file (79 lines) |
| `src/db/schemaValidation.ts` | Import validation and normalization; exposes `generateUUID` | `grep -n "^export function\|^export interface" src/db/schemaValidation.ts` |
| `src/db/__tests__/schemaValidation.test.ts` | Existing test patterns, vitest setup, test style | Read whole file (167 lines) — follow its style for new tests |
| `package.json` | `idb` version (`^8.0.3`), `vitest` version — governs API shapes | `grep -E '"idb"|"vitest"|"fake-indexeddb"' package.json` |

### Key facts established by investigation

- `DB_NAME = 'landscape-planner'` (line 4), `DB_VERSION = 1` (line 5) — hardcoded in `src/db/db.ts`.
- `openDB` is called via the `idb` library (v8). The upgrade callback receives `(db, oldVersion, newVersion, transaction)` — the raw `IDBTransaction` is the fourth argument; `idb` wraps it as `IDBPTransaction`.
- Current `upgrade(db)` callback only checks `objectStoreNames.contains` — it has no migration logic and ignores `oldVersion`/`newVersion`.
- Two stores exist: `projects` (keyPath `id`) and `undoHistory` (keyPath `projectId`).
- No `fake-indexeddb` dependency exists yet; it must be added as a dev dependency to enable unit tests without a real browser.
- Existing tests live in `src/db/__tests__/` and use `vitest` with no special global setup file for the db layer.

---

## Phases

### Phase 1 — Migration framework + v1 baseline [ ]

> Introduces the migrations array, wires it into `onupgradeneeded`, captures the current two-store schema as migration v1, and bumps `DB_VERSION` to `1` (no-op for existing users since their database is already at version 1). Phase 2 cannot start until every feature here is `done`.

---

#### Feature: Migration type definitions [ ]

**Status:** `todo`
**File:** `src/db/migrations.ts` (new file)

The migration system needs a shared contract before any implementation can reference it. Define the types in a standalone file so both `db.ts` and future test files can import without circular deps.

##### Tasks

- [ ] Create `src/db/migrations.ts` with the following exports:
  - `DbMigration` interface: `{ version: number; upgrade: (db: IDBPDatabase<LandscapePlannerDB>, tx: IDBPTransaction<LandscapePlannerDB, ArrayLike<StoreNames<LandscapePlannerDB>>, 'versionchange'>) => void | Promise<void> }`
  - `MIGRATIONS: DbMigration[]` — the ordered array that all migration entries are registered in (exported so tests can read it directly)
  - Migration v1 entry: creates `projects` store (keyPath `id`) and `undoHistory` store (keyPath `projectId`) if they do not already exist — identical to the current `upgrade` callback body in `db.ts`
- [ ] Export `LandscapePlannerDB` from `src/db/migrations.ts` (or re-export from `db.ts`) so the type is available to both files without duplication

##### Decisions

_None yet._

---

#### Feature: Wire migrations into `getDB()` [ ]

**Status:** `todo`
**File:** `src/db/db.ts`

Replace the current hard-coded `upgrade(db)` callback with a loop that runs only the migrations whose `version` falls in the range `(oldVersion, newVersion]`.

##### Tasks

- [ ] Import `MIGRATIONS` from `src/db/migrations.ts` into `src/db/db.ts`
- [ ] Replace the `upgrade(db)` callback signature with `upgrade(db, oldVersion, newVersion, tx)` — the `idb` v8 callback exposes these four arguments
- [ ] Inside the callback, iterate `MIGRATIONS` and call each migration's `upgrade(db, tx)` for every entry where `migration.version > oldVersion && migration.version <= newVersion`
- [ ] Keep `DB_VERSION` at `1` — the v1 migration is a no-op for existing users (their `oldVersion` will already be `1`); this is intentional
- [ ] Remove the now-redundant `objectStoreNames.contains` guard blocks from `db.ts` (they move into the v1 migration entry in `migrations.ts`)
- [ ] Verify TypeScript compiles with `tsc --noEmit` after changes

##### Decisions

_None yet._

---

### Phase 2 — Testing + documentation [ ]

> Adds automated tests proving the migration framework works for the upgrade path, and records the v1 schema as the canonical baseline for future spike authors.

---

#### Feature: Migration unit tests [ ]

**Status:** `todo`
**File:** `src/db/__tests__/migrations.test.ts` (new file)

No fake-indexeddb dependency exists yet. It must be added before tests can run in Node/vitest without a browser.

##### Tasks

- [ ] Add `fake-indexeddb` as a dev dependency: `npm install --save-dev fake-indexeddb`
- [ ] Confirm vitest config does not need a custom `environment` setting — `fake-indexeddb` can be imported directly in test files without a DOM environment by using `import 'fake-indexeddb/auto'`
- [ ] Create `src/db/__tests__/migrations.test.ts`:
  - Test 1 — `MIGRATIONS` array sanity: assert `MIGRATIONS[0].version === 1` and that it is the only entry (length 1) at the time this plan is complete
  - Test 2 — v1 upgrade creates both stores: open a fresh `fake-indexeddb` database at version 1, run the v1 migration entry manually, assert `objectStoreNames` contains `'projects'` and `'undoHistory'`
  - Test 3 — upgrade from v1 to v2 with a sample migration: define a local throw-away migration `{ version: 2, upgrade: (db) => db.createObjectStore('testStore', { keyPath: 'id' }) }`, simulate the loop running only migrations where `version > 1 && version <= 2`, assert `'testStore'` exists and `'projects'` was NOT re-created (idempotency guard)
  - Test 4 — `oldVersion === newVersion` runs zero migrations: simulate a re-open where `oldVersion === 1` and `newVersion === 1`, assert the loop body is never entered
- [ ] Run `npx vitest run src/db/__tests__/migrations.test.ts` and confirm all four tests pass

##### Decisions

_None yet._

---

#### Feature: v1 schema baseline documentation [ ]

**Status:** `todo`
**File:** `src/db/migrations.ts` (inline JSDoc comment block)

Spike authors (BAU-23, 24, 25, 26) need a clear description of what v1 contains so they know exactly what their migration must transform. This lives as a JSDoc block above the `MIGRATIONS` array — not in a separate markdown file — so it stays co-located with the code.

##### Tasks

- [ ] Add a JSDoc block above the `MIGRATIONS` export in `src/db/migrations.ts` that documents:
  - v1 stores: `projects` (keyPath `id`, no indexes, value type `Project`) and `undoHistory` (keyPath `projectId`, no indexes, value type `{ projectId: string; actions: unknown[] }`)
  - How to add a new migration: increment `DB_VERSION` in `db.ts`, append a new `DbMigration` entry to `MIGRATIONS` with the next version number, run the migration tests
  - The invariant: migrations must be append-only and ordered by `version`; never edit an existing entry
- [ ] Confirm the comment renders correctly in VS Code IntelliSense by hovering over `MIGRATIONS` in `db.ts` after the import

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-08 | Keep `DB_VERSION` at `1` after this plan; do not bump to `2` | Migration v1 is a no-op for users whose DB is already at version 1. Bumping to 2 would trigger an unnecessary `onupgradeneeded` event for all existing users. The first real schema change (from a spike) will be the first version bump. |
| 2026-04-08 | Migration logic extracted to `src/db/migrations.ts`, not kept inline in `db.ts` | `db.ts` is already responsible for the `getDB` singleton; mixing migration definitions into it creates a long file that spike authors must edit directly, risking merge conflicts. A separate file lets each spike PR append a single array entry. |
| 2026-04-08 | Use `fake-indexeddb` for unit tests, not vitest browser mode | `fake-indexeddb` is the lightest addition; it works in the existing Node/vitest environment without reconfiguring the test runner. Browser mode would require additional config and slow CI. |

---

## Agent Log

> Append-only.

```
2026-04-08 — plan-init — PLAN-BAU-8 created. Investigated src/db/db.ts (DB_VERSION=1, idb v8, two stores), src/db/projectsDb.ts (CRUD ops), src/db/__tests__/ (only schemaValidation.test.ts exists, no fake-indexeddb dep). No migration logic exists anywhere in src/db/. Plan is ready for Phase 1 implementation.
```
