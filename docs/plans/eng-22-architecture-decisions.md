# ENG-22 — Architecture Decision Records: UI Identity Rethink

| Field | Value |
|-------|-------|
| **Plan ID** | `ENG-22` |
| **Title** | Architecture Decision Records — UI Identity Rethink |
| **Scope** | Four foundational architecture decisions that must be resolved before Phase 2 UI implementation begins. Covers layout architecture, component library selection, dark mode strategy, and mobile/tablet posture. |
| **Status** | `planned` |
| **Created** | 2026-04-08 |
| **Feeds into** | BAU-30 (UI Rethink spike), BAU-5, BAU-6, ENG-21 implementation |

---

## ADR 1: Layout Architecture

### Context

The current layout is a single `AppLayout.tsx` component implementing a three-panel design: `SidePalette` (240px) | Canvas | `InspectorPanel`. This is consistent with the spec in `docs/frontend/visual-design.md`.

Two secondary UI surfaces are managed via `useState` booleans inside `AppLayout`:

- Journal view: `const [showJournal, setShowJournal] = useState(false)` (line 23) — when true, replaces the entire main content area with `<JournalView>`.
- Cost summary: `const [showCostSummary, setShowCostSummary] = useState(false)` — renders `<CostSummaryPanel>` as a modal overlay.

The Generate surface is handled differently: a separate route (`/app/generate`) reached via `router.navigate({ to: '/app/generate' })` in `TopToolbar.tsx` line 241. This route renders `GenerateShell` with its own layout.

The ENG-21 audit (Part 3, Section 4) defines three distinct application modes with materially different chrome densities:

- **Blueprint mode** (current default): Dense CAD layout. All panels visible. SidePalette at 256px, InspectorPanel at 280px, status bar always present, minimap visible.
- **Generate mode** (AI output review): Minimal chrome. SidePalette collapses to icon rail or hides entirely. InspectorPanel is replaced by a Generate Options panel. Status bar hidden. Canvas is full bleed.
- **Garden Management mode** (journal, tracking, costs): Content-first layout. Left nav (220px) replaces the tool palette. No right panel unless a specific record is selected. Top bar simplified to breadcrumb and mode switcher only.

The current mixed approach — some modes via `useState`, one mode via routing — creates inconsistency: panel state is not persisted across mode switches (navigating to `/app/generate` loses inspector state), and the Journal `useState` toggle replaces the whole layout rather than adjusting panel visibility, making it impossible to view journal content alongside the canvas.

### Options Considered

**Option A: Keep the current mixed approach (useState + route)**

Pros: No migration required. Journal and cost summary already work.

Cons: Three different mechanisms for what is conceptually one thing (mode switching). Panel visibility state is ephemeral — switching to Generate via router navigation destroys Blueprint state. Journal replaces the full layout via DOM replacement rather than panel reconfiguration, which prevents future sidebar-style journal integration. Adding Garden Management mode as a fourth mechanism would make this worse. Not maintainable.

**Option B: Unify via a Zustand layout-mode store**

Introduce a `useLayoutStore` Zustand store with a `mode` field (`'blueprint' | 'generate' | 'garden'`) and per-mode panel visibility state. `AppLayout` reads from this store and renders panel configurations accordingly. Mode switching is a store dispatch, not a route navigation. All modes share the same layout shell.

Pros: Single source of truth for layout state. Panel state (which sections are expanded, inspector scroll position) can be persisted per-mode in the same store. Mode switching is instantaneous — no route unmount/remount. The mode switcher tab UI (proposed in ENG-21) is a trivial dispatch. Panel state survives mode transitions. Zustand is already in the stack.

Cons: The Generate route (`/app/generate`) must be removed or repurposed. URL-based deep-linking to specific modes is lost unless mode is mirrored into the URL as a query param. Some additional complexity in `AppLayout` conditional rendering.

**Option C: Route-based approach (a route per mode)**

Map each mode to a dedicated route: `/app/blueprint`, `/app/generate`, `/app/garden`. Each route has its own layout component.

Pros: URL encodes current mode. Browser back button works across mode transitions. Each layout component is isolated.

Cons: Shared state (current project, selected element, inspector state) must be stored globally and re-derived on each route mount. Canvas unmounts and remounts on every mode switch — PixiJS teardown and reinit on each switch is expensive (estimated 300-800ms). Layout duplication: three layout files that share 60-70% of their structure. This is how the current `/app/generate` route already works, and it is already causing the state-loss issue described above. Extending this pattern makes things worse.

### Decision

**Adopt Option B: Zustand layout-mode store.**

Introduce `useLayoutStore` with a `mode` field and per-mode panel configuration. `AppLayout` becomes the single layout shell that responds to store state. The existing `/app/generate` route is deprecated; Generate mode becomes a mode switch within the app shell. Journal and cost summary `useState` booleans in `AppLayout` are migrated into the store.

The mode switcher (3-segment tab control in the top bar center, as specified in ENG-21 Part 3 Section 4) dispatches to this store.

### Consequences

**Positive:**
- A single layout shell means PixiJS canvas never unmounts across mode switches — eliminates the reinit cost.
- Panel state (expanded sections, scroll positions, sidebar widths) can be persisted per-mode as separate store slices, restoring the user's last state when they return to a mode.
- The mode switcher becomes a first-class UI element rather than a button that navigates to a route.
- Adding a fourth mode in the future is a store slice addition, not a new layout file.

**Negative / Migration work:**
- The `/app/generate` route must be deprecated. Any bookmarks or direct links to `/app/generate` will break; a redirect to `/app?mode=generate` (or equivalent) should be added to TanStack Router.
- The `GenerateShell` component currently renders its own layout (header, nav, workspace). Its content panels (generate options, output gallery) must be refactored to be injectable into the shared layout's panel slots.
- `AppLayout.tsx` grows in conditional complexity unless panel slots are abstracted into named regions (`leftPanel`, `rightPanel`, `statusBar`) that each mode populates.

**Implementation order:**
1. Create `useLayoutStore` with `mode`, `leftPanelConfig`, `rightPanelConfig`, `statusBarVisible` fields.
2. Add a mode switcher component in `TopToolbar` that dispatches to the store.
3. Migrate `showJournal` and `showCostSummary` useState into the store.
4. Refactor `AppLayout` to read panel configuration from the store instead of local state.
5. Deprecate `/app/generate` route; migrate `GenerateShell` content into the store-driven layout.
6. Add per-mode state persistence (last active mode, panel expansion state) to the store.

---

## ADR 2: Component Library

### Context

The current codebase uses raw Tailwind CSS with hardcoded color values throughout. There is no component library or design system abstraction. The ENG-21 audit identified this as the root cause of several professional-credibility deficits: inconsistent surface hierarchy, hardcoded accent colors (`#1971c2`, `#E8A838`, `#555555`), and panel borders using Tailwind defaults (`#e5e7eb`) rather than the proposed token system.

Constraints that any library selection must accommodate:
- Canvas is PixiJS-based (WebGL). It renders into a `<canvas>` element inside a positioned container. HTML overlays (boundary handles, minimap, yard overlays) sit in absolutely-positioned divs over the canvas using z-index layering. Any component library must not interfere with this stacking context.
- The app uses Lucide React icons, React 18, TanStack Router, and Zustand. Library compatibility with this stack is required.
- The proposed ENG-21 token system uses CSS custom properties under the `--ls-` namespace. The component library must support token-based theming via CSS custom properties, not hardcoded values.

Three options were evaluated.

### Trade-off Matrix

| Evaluation Axis | shadcn/ui | Radix Primitives + Custom Theme | Purpose-built Component Set |
|---|---|---|---|
| **Theming (CSS custom properties)** | Strong. shadcn generates unstyled component code into your repo; you own the CSS. CSS custom properties are the intended theming mechanism. `--ls-` tokens drop in directly. | Strong. Radix is fully unstyled. Token application is explicit and complete. | Strong. Full control — you write the tokens in. No competing opinions. |
| **Dark mode readiness** | Strong. The shadcn init template generates a light/dark CSS variable block. Matches the `[data-theme="dark"]` architecture proposed in ENG-21. | Strong. Same as above — Radix ships no styles, so dark mode is entirely in your token overrides. | Strong with discipline. Requires the team to maintain dark mode parity manually across every component written. Higher ongoing cost. |
| **Tree-shaking / bundle size** | Good. Components are generated into `src/components/ui/` — only imported components are bundled. No runtime library dependency. | Excellent. Radix primitives are individually importable packages. Zero unused code. | Excellent. No third-party runtime at all. |
| **Community / maintenance** | Very strong. shadcn/ui is the most actively maintained component scaffold in the React ecosystem as of 2026. Vercel backing. Wide adoption in design-tool adjacent projects. | Strong. Radix UI is maintained by WorkOS. Primitives are stable and rarely breaking. Smaller community than shadcn. | None. Entirely team-maintained. Maintenance burden scales with component count. |
| **Migration from raw Tailwind** | Low-medium effort. shadcn components use Tailwind internally; the migration is additive (drop in components, update imports). Existing raw Tailwind can coexist during migration. | Medium effort. Each primitive needs a Tailwind (or CSS) skin written from scratch. More boilerplate per component than shadcn. | High effort. Every component must be designed and built from scratch. No starting point. |
| **Accessibility (keyboard nav, ARIA, focus)** | Excellent. shadcn is built on Radix primitives. Gets keyboard navigation, ARIA attributes, and focus management from Radix without additional work. Dialogs, dropdowns, tooltips, and menus are fully accessible out of the box. | Excellent. Same Radix primitives — this is the source of shadcn's accessibility. Direct use of Radix is equivalent. | Variable. Only as accessible as the team builds it. Focus management for modals, dropdown traps, and ARIA roles must be implemented manually. Significant risk of accessibility regressions. |
| **PixiJS compatibility (z-index, pointer events, overlays)** | No conflict. shadcn components are standard HTML/CSS elements. Z-index stacking and `pointer-events: none` on overlays is handled at the layout level, not by the component library. Dialogs use Radix Portal (renders in `document.body`), which avoids stacking context issues with the canvas container. | No conflict. Same reasoning — Radix Portal for overlays means dialogs and dropdowns escape the canvas stacking context cleanly. | No conflict in principle, but the team must implement Portal-based rendering for any overlay components (dropdowns, tooltips, modals) manually to avoid z-index conflicts with the PixiJS canvas container. |

**Summary:** shadcn/ui and Radix Primitives + Custom Theme are nearly equivalent in capability. shadcn/ui wins on migration effort and community. Purpose-built components lose on accessibility risk and maintenance cost.

### Decision

**Adopt shadcn/ui as the component scaffold.**

Use shadcn/ui components for all UI chrome: panels, buttons, inputs, dropdowns, tooltips, dialogs, tabs, and the mode switcher. Apply the `--ls-` design token system (from ENG-21) by replacing shadcn's default CSS variable values with `--ls-` token references in the generated component files.

Lucide React icons are retained — they are compatible with shadcn/ui and the team is already using them. The existing raw Tailwind usage in canvas-adjacent components (`CanvasHost`, `YardBoundaryHTMLOverlays`, `Minimap`) is left as-is during the initial migration; these components interact directly with PixiJS and have no benefit from a component library.

### Consequences

**Positive:**
- Accessible keyboard navigation and ARIA roles for all panel controls, dropdowns, and modals with no additional implementation work.
- Radix Portal ensures dialogs and context menus escape the canvas stacking context, preventing z-index conflicts with PixiJS overlays.
- shadcn's generated components live in the repo — the team can modify them freely to apply `--ls-` tokens without fighting library APIs.
- Migration is additive and incremental: replace individual raw-Tailwind elements with shadcn components one at a time, validate, continue.

**Negative / Migration work:**
- shadcn/ui init will add a `components/ui/` directory and modify `tailwind.config.js`. This requires a one-time setup commit.
- shadcn's default CSS variables (`--background`, `--primary`, etc.) must be remapped to `--ls-` tokens or ignored in favor of direct `--ls-` references. The two variable systems must not coexist without explicit mapping — this is a one-time configuration decision.
- Generated component files will need manual editing to apply the `--ls-surface-panel`, `--ls-text-primary`, and other tokens where shadcn's defaults would otherwise render.

**Migration path:**
1. Run `npx shadcn@latest init` with CSS variables mode enabled.
2. Replace shadcn's default `--background`/`--foreground` variables in `globals.css` with references to `--ls-` tokens.
3. Add `Button`, `Tooltip`, `DropdownMenu` first — high-usage, high-accessibility-value components.
4. Migrate `InspectorPanel` inputs and controls to shadcn form primitives.
5. Migrate `SidePalette` tabs to shadcn `Tabs`.
6. Add the mode switcher using shadcn `Tabs` with the `.ls-mode-tab` styling from ENG-21.
7. Leave `CanvasHost`, `YardBoundaryHTMLOverlays`, and `Minimap` as raw Tailwind.

---

## ADR 3: Dark Mode

### Context

The ENG-21 audit found that the professional tools most similar to Landscaper's target market use dark chrome:

- SketchUp uses `#1e1e1e` dark application frame — the primary professional credibility signal identified in the audit.
- Vectorworks uses `#c8c8c8` medium-gray application frame.
- PRO Landscape (the closest direct competitor by industry) is light-only. This is cited in the audit as a weakness, not a model to emulate.

The target audience is professional landscapers working long hours. Long-session eye strain is a real concern, and dark mode is now a professional expectation rather than a differentiator in design tooling.

The ENG-21 proposed token architecture (`--ls-` CSS custom properties) is explicitly designed to support dark mode via a `[data-theme="dark"]` CSS override block. The audit estimated dark mode implementation at 2-3 days of work once tokens are in place, because the surface hierarchy and semantic token names do not encode light-mode assumptions.

A key constraint exists: the current codebase has hardcoded color values (`#1971c2`, `#E8A838`, `#555555`, `#1f2937`, `#e5e7eb`) scattered across component files. These must be replaced with `--ls-` token references before dark mode is attempted; any remaining hardcoded values will be invisible to the CSS variable override and will produce broken dark-mode renders.

### Decision Framework

To classify a feature as **essential** (must ship with Phase 2), it must meet all three criteria:
1. Its absence is a visible regression or broken experience for the primary user persona (professional landscaper, desktop, long sessions).
2. It cannot be deferred without increasing the future implementation cost.
3. It is achievable within the Phase 2 scope without blocking other deliverables.

To classify a feature as **deferrable** (Phase 3 or later), it must meet at least one criterion:
1. Its absence is not a regression from the current state — the user has not had it before.
2. Deferring it does not meaningfully increase future implementation cost (i.e., it is independent and additive).
3. The prerequisite work (token adoption) is not yet complete.

Applying these criteria to dark mode:

| Criterion | Assessment |
|---|---|
| Absence is a visible regression? | No. The current app is light-only. Dark mode does not exist yet. Shipping light-only Phase 2 is not a regression. |
| Deferring increases future cost? | Marginally. Token adoption (required before dark mode) is already planned for Phase 2. If tokens are adopted in Phase 2 and dark mode ships in Phase 3, no additional prerequisite work is needed. Cost is 2-3 days regardless of when in Phase 2 vs Phase 3 it is done. |
| Achievable in Phase 2 without blocking? | Yes — but only after token migration is complete, which is the last step in the Phase 2 implementation order from ENG-21. Attempting dark mode before token migration is complete would require double work. |

**Classification: Deferrable to Phase 3.**

The prerequisite (token adoption, hardcoded color elimination) is essential and must ship in Phase 2. Dark mode itself ships in Phase 3, once all components reference `--ls-` tokens and the light mode design system is stable and tested.

### Decision

**Ship Phase 2 in light mode only. Implement dark mode as a Phase 3 deliverable.**

The Phase 2 token adoption work is mandatory and must be completed before Phase 2 UI ships. This work (replacing hardcoded colors with `--ls-` token references, adopting `--ls-surface-toolbar` dark background on the TopToolbar) constitutes the prerequisite for dark mode without constituting dark mode itself.

The dark mode implementation (the `[data-theme="dark"]` override block with surface and text token inversions per the ENG-21 table) is targeted for Phase 3 with an estimated effort of 2-3 days plus visual QA.

Note: the TopToolbar dark surface (`--ls-surface-toolbar: #2b3a4a`) ships in Phase 2 as part of the professional chrome overhaul — this is not dark mode, it is the dark-chrome-on-light-canvas split that SketchUp uses. It is part of the light mode design.

### Consequences

**Positive:**
- Phase 2 scope is bounded. Token adoption is the hard work; dark mode is the payoff that comes after.
- Light mode stability is validated before dark mode complicates the QA matrix.
- No two-track design review in Phase 2 (light + dark surface states for every new component).

**Negative:**
- Professional landscapers who expect dark mode will not have it until Phase 3.
- If a competitor ships a dark mode update during Phase 2, this becomes more visible as a gap.

**Mitigations:**
- The dark toolbar (shipping Phase 2) provides a partial professional signal even without full dark mode.
- The Phase 3 dark mode effort is explicitly tracked and estimated (2-3 days) so it can be prioritized quickly if competitive pressure increases.

---

## ADR 4: Mobile/Tablet Strategy

### Context

The current specification in `docs/frontend/visual-design.md` states: "Desktop-first (1024px+). Tablet: side panels collapse to icons, toolbar remains. Mobile: simplified view, limited editing, good for journal viewing."

This is an aspiration, not an implementation. The current app has no responsive breakpoint logic in `AppLayout.tsx` — the three-panel layout renders identically at all viewport widths.

The competitive context from ENG-21:

- iScape succeeds as a mobile-first tool but targets consumers, not professionals. The audit concluded: "professionals cannot use it for actual deliverables" due to lack of data depth, scale calibration, and export options.
- Vectorworks and PRO Landscape are desktop-only or desktop-primary. Neither has a meaningful mobile story.
- SketchUp has a native mobile app but its core workflow is desktop.

The application's three modes have fundamentally different mobile suitability:

- **Blueprint/CAD editing:** Inherently desktop-focused. Precise element placement, multi-panel inspection, canvas zoom, and keyboard shortcuts are all degraded or impossible on mobile. A professional will not design a yard on a phone.
- **Generate:** Marginal mobile utility. Triggering a generate action from mobile is possible, but reviewing AI output without a full canvas view is limited.
- **Garden Management (journal, photo capture, plant tracking):** Inherently mobile-friendly. Site visits happen in the field. A landscaper wanting to log a journal entry, attach a photo, or check plant status from a client's garden is a realistic primary use case.

### Options Considered

**Option A: Desktop-first with responsive collapse**

Implement breakpoints where panels collapse at tablet widths (1024px → icon rail, <768px → hidden) and the canvas takes full width. No separate mobile layout — one layout that adapts.

Pros: Single codebase path. No user confusion between "desktop app" and "mobile app." Simple to implement progressively.

Cons: A collapsed three-panel layout on mobile is still optimized for tool use, not content consumption. Journal entries and plant tracking become secondary citizens. Photo capture from mobile requires dedicated mobile UX that responsive collapse does not address.

**Option B: Mobile-first companion for garden management**

Build a separate mobile-optimized view for Garden Management mode only. Blueprint and Generate modes redirect to "please use desktop." The mobile companion is a dedicated PWA install target.

Pros: Optimizes for the realistic mobile use case (field work, journal logging). Can use native mobile APIs (camera, GPS, push notifications for plant care reminders).

Cons: Maintaining two separate layout paradigms for one application increases complexity. The "please use desktop" redirect is a poor experience if a user opens the app on mobile to check their design.

**Option C: Responsive-only**

Fully responsive design from 320px upward. All modes adapt. Mobile users get full capability with touch-optimized interactions.

Pros: No context switching. One app, all devices.

Cons: The canvas editing experience on mobile is poor regardless of responsiveness. Touch-based element placement on a 390px screen with 240px panels is not viable for professional CAD use. Investing in responsive canvas interaction is high cost for low professional utility. iScape shows this only works for consumers.

### Decision

**Adopt a hybrid of Option A and Option B: desktop-first for Blueprint and Generate modes, with a purpose-built mobile layout for Garden Management mode.**

Concretely:

- **Blueprint mode:** Implement responsive collapse (Option A) for tablet (down to 1024px) — panels collapse to icon rails. Below 768px, show a non-functional "editing requires desktop" banner rather than a degraded editor. This is not a regression from the current state (the current app does not handle mobile at all).
- **Generate mode:** Same tablet collapse as Blueprint. Mobile shows a simplified output gallery view (read-only generated images, no editing controls). This is useful for sharing outputs with clients from a phone.
- **Garden Management mode:** Build a dedicated mobile layout with full-screen journal entries, a bottom tab bar for navigation (Plants / Journal / Costs), and a floating camera-capture button. This uses the Garden Management mode's left-nav structure reorganized as a bottom nav. No canvas visible in mobile Garden Management mode.

The mobile Garden Management layout is a progressive enhancement: it activates via CSS media query when the `mode === 'garden'` store state is active, rather than being a separate route or app.

### Consequences

**Positive:**
- Field work use case (journal from mobile) is served without a separate app install.
- Desktop-first commitment is explicit and honest — professional CAD editing is not compromised by mobile constraints.
- The mobile Garden Management view can leverage the phone camera for journal photo capture, a capability that requires mobile context.
- Implementation is phased: desktop Blueprint is Phase 2, mobile Garden Management is Phase 3 alongside the garden management feature build.

**Negative:**
- Two layout modes within Garden Management (desktop left-nav vs mobile bottom-nav) must be maintained in parallel once built.
- "Editing requires desktop" messaging on mobile Blueprint mode must be handled gracefully — it should not look like an error.

**Implementation order:**
1. Phase 2: Implement responsive collapse for Blueprint mode at 1024px breakpoint (panels → icon rails). No mobile work in Phase 2.
2. Phase 3: Build mobile Garden Management layout (bottom nav, full-screen journal, camera capture) as part of the garden management feature delivery.
3. Phase 3: Add simplified Generate output gallery for mobile (read-only, image carousel).
4. Defer: PWA manifest, push notifications, offline capability — assess after Phase 3 usage data.

**Explicit non-goal:** Landscaper will not attempt to compete with iScape on the consumer mobile market. The mobile story is a professional field companion for existing desktop users, not a mobile-first acquisition channel.
