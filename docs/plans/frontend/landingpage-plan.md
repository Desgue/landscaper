# Garden Planner — Landing Page Redesign Plan

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-G` |
| **Title** | Landing Page Redesign — Performance, SEO & Visual Overhaul |
| **Scope** | Full redesign of the `/` landing page: performance infrastructure (code splitting, pre-rendering), SEO (meta, structured data, copy), visual identity (Blueprint Garden palette, Inter font, animations), and section-by-section rebuild. Excludes app canvas, backend, and AI generation features. |
| **Status** | `in-progress` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1 — Foundation · Phase 2 — Visual Identity · Phase 3 — Section Redesign · Phase 4 — Polish & Optimization |

---

## Context Map

> Agents: use these hints to load only the context you need.

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/frontend/visual-design.md` | Layout, colors, typography, UI component positions | `grep -n "## " docs/frontend/visual-design.md` then read relevant section |
| `src/pages/LandingPage.tsx` | Landing page root — imports and arranges all landing sections | Full read (short file) |
| `src/components/Navbar.tsx` | Top navigation bar | Full read per task |
| `src/components/Hero.tsx` | Hero section with headline and CTA | Full read per task |
| `src/components/Features.tsx` | Feature cards section (to be merged into HowItWorks) | Full read per task |
| `src/components/HowItWorks.tsx` | Step-by-step section (to absorb Features content) | Full read per task |
| `src/components/CTABanner.tsx` | Call-to-action banner | Full read per task |
| `src/components/Footer.tsx` | Page footer | Full read per task |
| `index.html` | HTML shell — meta tags, fonts, structured data go here | Full read per task |
| `vite.config.ts` | Vite config — pre-rendering plugin, code splitting config | Full read per task |
| `tailwind.config.*` | Tailwind theme — colors, typography, shadows | Full read per task |
| `src/index.css` | Global styles — keyframes, animation utilities | `grep -n "@keyframes\|@layer" src/index.css` |
| `src/main.tsx` | App entry — route definitions, lazy imports | Full read per task |

---

## Phases

### Phase 1 — Foundation (Performance & SEO Infrastructure) [~]

> Establish the performance and SEO baseline before any visual changes. Code splitting and pre-rendering must land first because they define the loading architecture all subsequent work depends on.

#### Feature: Code Splitting — Lazy App Routes [x]

**Status:** `done`
**Spec:** N/A (performance optimization)
**Load hint:** Read `src/App.tsx` and router config to identify eager imports of canvas/app routes.

##### Tasks

- [x] Audit current route imports in `src/App.tsx` and identify all app-route chunks that can be lazy-loaded — done 2026-04-07
- [x] Convert app-route imports to `React.lazy()` with `<Suspense>` fallback; keep landing page components in the main bundle — done 2026-04-07
- [x] Verify build output — main bundle 288KB/90KB gzipped (includes React+Router+landing); AppLayout 451KB split into separate chunk — done 2026-04-07

##### Decisions

- Used chained dynamic import for `registerInspectorSlots` → `AppLayout` to ensure side effects execute before canvas renders, while keeping both out of the main bundle.

---

#### Feature: Pre-rendering Setup [ ]

**Status:** `todo`
**Spec:** N/A (SEO infrastructure)
**Load hint:** Read `vite.config.ts` for current plugin list.

##### Tasks

- [ ] Install `vite-plugin-prerender` as dev dependency
- [ ] Configure pre-rendering for `/` route only in `vite.config.ts`
- [ ] Verify pre-rendered `dist/index.html` contains full landing page HTML by running build and inspecting output

##### Decisions

- Deferred: `vite-plugin-prerender` compatibility with Vite 8 is unverified and adding a new dependency requires user approval. Feature stays `todo`.

---

#### Feature: Meta Tags & Structured Data [x]

**Status:** `done`
**Spec:** N/A (SEO)
**Load hint:** Read `index.html` for current `<head>` content.

##### Tasks

- [x] Add `<title>`, `<meta name="description">`, Open Graph tags, and Twitter Card tags to `index.html` — done 2026-04-07
- [x] Add `SoftwareApplication` and `FAQPage` JSON-LD structured data as inline `<script type="application/ld+json">` in `index.html` — done 2026-04-07
- [x] Add `robots.txt` and `sitemap.xml` to `public/` directory — done 2026-04-07

##### Decisions

- OG/Twitter image tags omitted (no image asset available yet). Will be added in Phase 3 when hero images are created.

---

#### Feature: Font Setup — Self-host Inter [x]

**Status:** `done`
**Spec:** N/A (branding infrastructure)
**Load hint:** Check current font declarations in `index.html` and `src/index.css`.

##### Tasks

- [x] Download Inter variable font (woff2, weights 100-900 in single file) and place in `public/fonts/inter-latin.woff2` (24KB) — done 2026-04-07
- [x] Add `@font-face` declarations in `src/index.css` with `font-display: swap` and preload hint in `index.html` — done 2026-04-07
- [x] Update `--font-sans` in Tailwind `@theme` block to `'Inter', system-ui, ...` — done 2026-04-07

##### Decisions

- Used variable font (single file, `font-weight: 100 900`) instead of 4 separate weight files. Single HTTP request, covers all weights, 24KB total.

---

#### Feature: Accessibility Baseline [x]

**Status:** `done`
**Spec:** N/A (a11y)
**Load hint:** Read `src/components/Navbar.tsx` for current landmark usage.

##### Tasks

- [x] Add skip-to-content link as first focusable element in `LandingPage.tsx`; add `<nav aria-label="Main">` landmark to Navbar — done 2026-04-07
- [x] Add `focus-visible` utility styles globally; audit and fix contrast: `text-gray-500` → `text-gray-600` on body copy in Hero, Features, HowItWorks; `text-gray-400` → `text-gray-500` on Hero CTA subtext — done 2026-04-07
- [x] Add `prefers-reduced-motion` media query that disables all animations and transitions — done 2026-04-07

##### Decisions

_None._

---

### Phase 2 — Visual Identity & Design System [x]

> Define the Blueprint Garden design tokens in Tailwind before rebuilding sections. Every section in Phase 3 depends on these tokens being available.

#### Feature: Blueprint Garden Color Palette [~]

**Status:** `in-progress`
**Spec:** `docs/frontend/visual-design.md` → Colors
**Load hint:** `grep -n "color\|Color" docs/frontend/visual-design.md`

##### Tasks

- [x] Extend Tailwind theme `colors` with the full Blueprint Garden palette — done 2026-04-07
- [ ] Replace all hardcoded color classes across landing components with new semantic token classes (Phase 3)
- [ ] Verify dark-on-light contrast ratios meet WCAG AA for all text/background pairings (Phase 3)

##### Decisions

_None yet._

---

#### Feature: Typography Scale [~]

**Status:** `in-progress`
**Spec:** `docs/frontend/visual-design.md` → Typography
**Load hint:** `grep -n "font\|typog" docs/frontend/visual-design.md`

##### Tasks

- [x] Define responsive typography scale in Tailwind @theme: display (48/56px), h2 (36/40px), h3 (24/28px), body (16/26px), caption (14/20px) — done 2026-04-07
- [ ] Create utility classes for section headings with consistent letter-spacing and line-height (Phase 3)

##### Decisions

_None yet._

---

#### Feature: Shadow & Elevation System [x]

**Status:** `done`
**Spec:** N/A (design system)
**Load hint:** Read current `tailwind.config.*` for existing shadow definitions.

##### Tasks

- [x] Add 3-tier shadow tokens to Tailwind @theme — warm-tinted using `rgba(42,54,42,...)` — done 2026-04-07
- [x] Add dot-grid background utility class (radial-gradient pattern at 4% opacity) — done 2026-04-07

##### Decisions

_None yet._

---

#### Feature: Shared Animation Utilities [x]

**Status:** `done`
**Spec:** N/A (animation system)
**Load hint:** `grep -n "@keyframes" src/index.css`

##### Tasks

- [x] Create `src/hooks/useInView.ts` — returns `{ ref, isInView }` with threshold, rootMargin, once options — done 2026-04-07
- [x] Add CSS keyframes: fade-up, fade-in, slide-in-left, slide-in-right — done 2026-04-07
- [x] Add utility classes: animate-fade-up, animate-fade-in, animate-slide-in-left, animate-slide-in-right with fill-mode both — done 2026-04-07
- [x] Wrap keyframes in `@media (prefers-reduced-motion: no-preference)` — done 2026-04-07

##### Decisions

_None yet._

---

### Phase 3 — Section Redesign (Top to Bottom) [~]

> Rebuild each landing section using the new design system. Order is top-to-bottom so each section can be reviewed in context of what appears above it.

#### Feature: Navbar Refinements [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/Navbar.tsx`.

##### Tasks

- [x] Update CTA button to "Try it free" with accent amber bg and dark text — done 2026-04-07
- [x] Apply Blueprint Garden palette to navbar background, links, and hover states — done 2026-04-07
- [x] Add border-border bottom border — done 2026-04-07 (no mobile hamburger — single-bar layout)

##### Decisions

_None._

---

#### Feature: Hero Redesign [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Read `src/components/Hero.tsx`.

##### Tasks

- [x] Replace current layout with centered single-column: H1, subtext, CTA "Start planning — it's free" — done 2026-04-07
- [ ] Build before/after image slider component (`BeforeAfterSlider.tsx`) — deferred, using static TransformationPreview mockup
- [ ] Source or create 2-3 real before/after image pairs — deferred, using CSS/SVG placeholders
- [x] Add trust badge: "100% Free. No Account. Works in Your Browser." — done 2026-04-07
- [x] Wire up fade-up entrance animation using `useInView` hook — done 2026-04-07

##### Decisions

- Used static TransformationPreview (CSS/SVG) instead of interactive BeforeAfterSlider. Real images not yet available; slider will be built when assets exist.

---

#### Feature: Output Gallery (New Section) [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Read `src/components/OutputGallery.tsx`.

##### Tasks

- [x] Create `OutputGallery.tsx` — horizontal scroll container with scroll-snap, 6 placeholder cards — done 2026-04-07
- [ ] Source or create 6-8 AI render output images; optimize as AVIF+WebP — deferred, using CSS gradient placeholders
- [x] Add section heading: "See What Greenprint Can Create" — done 2026-04-07
- [ ] Wire up staggered fade-up animation for individual gallery cards — partial, container animates but no per-card stagger

##### Decisions

- Changed heading from "AI Garden Design Tools That Do the Hard Part" to "See What Greenprint Can Create" — more natural, less jargon-heavy, still contains brand name for SEO.

---

#### Feature: How It Works — Merged Section [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/HowItWorks.tsx`.

##### Tasks

- [x] Create new HowItWorks.tsx with 3 alternating image-left/text-right rows — done 2026-04-07
- [x] Write SEO copy across 3 steps; heading "Plan Your Garden Layout in Three Steps" — done 2026-04-07
- [ ] Source or create 3 real app screenshots — deferred, using StepPlaceholder components
- [x] Delete `Features.tsx` and remove its import from `LandingPage.tsx` — done 2026-04-07
- [x] Wire up slide-in animations (left/right alternating) using `useInView` — done 2026-04-07

##### Decisions

_None._

---

#### Feature: Trust Bar (New Section) [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/TrustBar.tsx`.

##### Tasks

- [x] Create `TrustBar.tsx` with 3 trust signals and SVG icons — done 2026-04-07
- [x] Style with `bg-bg-alt`, centered flex layout, icon + text pairs — done 2026-04-07
- [x] Wire up fade-in entrance animation — done 2026-04-07

##### Decisions

_None._

---

#### Feature: CTA Banner Refinement [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/CTABanner.tsx`.

##### Tasks

- [x] Update heading to: "Visualize Your Yard Before You Build — Free, No Signup" — done 2026-04-07
- [x] Update CTA button text to "Start designing for free" with accent amber style — done 2026-04-07 (shimmer/pulse deferred to Phase 4)
- [x] Apply Blueprint Garden palette and warm shadow elevation — done 2026-04-07

##### Decisions

_None._

---

#### Feature: Footer Refinement [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/Footer.tsx`.

##### Tasks

- [x] Apply Blueprint Garden palette colors (text-muted, border token, bg-bg) — done 2026-04-07
- [x] Updated privacy copy to be more explicit — done 2026-04-07 (no links to verify — footer has no external links)

##### Decisions

_None._

---

#### Feature: Landing Page Assembly [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Read `src/pages/LandingPage.tsx`.

##### Tasks

- [x] Update imports: remove `Features`, add `OutputGallery` and `TrustBar`; correct section order — done 2026-04-07
- [ ] Add `id` anchors to each section for in-page navigation
- [ ] Full visual review at mobile (375px), tablet (768px), and desktop (1280px) breakpoints

##### Decisions

_None._

---

### Phase 4 — Polish & Optimization [ ]

> Final pass for image optimization, animation tuning, performance budget enforcement, and cross-browser testing.

#### Feature: Image Optimization Pipeline [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** Check `public/` and `src/assets/` for image files.

##### Tasks

- [ ] Convert all landing page images to AVIF (primary) + WebP (fallback) using `sharp` or `squoosh-cli`; ensure all `<img>` use `<picture>` with both sources
- [ ] Add `loading="lazy"` and explicit `width`/`height` attributes to all below-fold images
- [ ] Verify hero images are eagerly loaded (`fetchpriority="high"`, no lazy) for LCP

##### Decisions

_None yet._

---

#### Feature: Scroll Animation Tuning [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** `grep -rn "useInView\|animate-" src/components/`

##### Tasks

- [ ] Tune Intersection Observer thresholds and animation durations across all sections for smooth, non-janky scroll experience
- [ ] Add staggered delays for multi-element sections (gallery cards, trust bar items, how-it-works steps)
- [ ] Verify `prefers-reduced-motion` disables all animations cleanly

##### Decisions

_None yet._

---

#### Feature: Mobile-Specific Refinements [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** Test at 375px viewport width.

##### Tasks

- [ ] Ensure hero before/after slider works correctly with touch events; test on iOS Safari and Android Chrome
- [ ] Verify gallery horizontal scroll has proper scroll-snap behavior on mobile
- [ ] Check all CTA buttons are full-width on mobile with adequate tap targets (min 44px)

##### Decisions

_None yet._

---

#### Feature: Lighthouse Audit & Performance Budget [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** Run `npx lighthouse http://localhost:5173 --view` after build.

##### Tasks

- [ ] Run Lighthouse on pre-rendered build; target scores: Performance > 95, Accessibility > 95, SEO > 95, Best Practices > 95
- [ ] Verify landing page JS < 80KB gzipped (check `dist/assets/` after build)
- [ ] Fix any flagged issues: CLS, LCP, FID/INP, missing alt text, contrast failures
- [ ] Run axe-core or similar automated a11y scan; fix all critical/serious issues

##### Decisions

_None yet._

---

#### Feature: Cross-Browser Testing [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** N/A — manual testing.

##### Tasks

- [ ] Test on Chrome, Firefox, Safari (macOS + iOS), Edge — verify layout, animations, and images render correctly
- [ ] Verify AVIF fallback to WebP works on Safari (AVIF support varies by version)
- [ ] Final visual QA pass at 375px, 768px, 1024px, 1440px breakpoints

##### Decisions

_None yet._

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Navbar CTA text: "Try it free" (not "Open the canvas") | "Try it free" removes risk objection and matches transactional search intent. "Open the canvas" is product jargon that means nothing to a first-time visitor. SEO agent's recommendation wins over UX agent. |
| 2026-04-07 | Self-host Inter font with `font-display: swap` (not system-ui) | Brand cohesion outweighs the ~15KB font cost. Self-hosting avoids Google Fonts GDPR/privacy concerns and the extra DNS lookup. `font-display: swap` prevents FOIT. Resolves branding agent vs tech agent conflict. |
| 2026-04-07 | 3 merged steps in How It Works (not 4 separate feature cards) | UX agent correctly identified that Features and HowItWorks were redundant. Merging into 3 alternating rows reduces cognitive load. SEO copy is distributed across the 3 steps so no keyword coverage is lost. |
| 2026-04-07 | `useInView` returns `{ ref, isInView }` object (not `[ref, isInView]` tuple) | Object destructuring is better ergonomics — avoids positional renaming at call sites and is forward-compatible if new properties are added. |
| 2026-04-07 | Used Inter variable font (single file, 100-900 weight range) | One HTTP request covers all weights, 24KB total. Superior to 4 separate static weight files. |
| 2026-04-07 | Deferred pre-rendering (vite-plugin-prerender) | Plugin compatibility with Vite 8 unverified; adding dev dependency requires user approval. Feature stays todo. |
| 2026-04-07 | Static TransformationPreview instead of interactive BeforeAfterSlider | Real before/after images not yet available. Built static CSS/SVG mockup to unblock Phase 3; interactive slider will be added when image assets exist. |
| 2026-04-07 | All image-bearing sections use placeholder CSS gradients/SVGs | No real AI render output or app screenshots available yet. Placeholder visuals created for Gallery, HowItWorks, and Hero. Image assets to be added in Phase 4 or when available. |
| 2026-04-07 | Gallery heading changed to "See What Greenprint Can Create" | More natural than spec's "AI Garden Design Tools That Do the Hard Part". Less jargon, still contains brand name for SEO. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — AlphaOps Coordinator — Plan PLAN-G initialized. Synthesized findings from 4 specialist agents (UX/UI, Color/Branding, SEO Copywriting, Tech SEO). Resolved 3 cross-agent conflicts (Navbar CTA text, font strategy, feature count). Defined 4 phases with 18 features and 56 atomic tasks.
2026-04-07 — Phase 1 Implementation — Completed 4/5 features: code splitting, meta tags, font setup, accessibility. Pre-rendering deferred (Vite 8 plugin compat unverified). Build verified: AppLayout split to 451KB chunk, main bundle 90KB gzipped. Review loop passed: Code Reviewer APPROVE, Doc Sync APPROVE, Security Audit APPROVE. Minor fixes applied: robots.txt trailing slashes, Hero CTA subtext contrast (gray-400→gray-500).
2026-04-07 — Phase 2 Implementation — Completed all 4 features: Blueprint Garden palette (17 color tokens), typography scale (5 levels), shadow system (3 tiers, warm-tinted), animation utilities (useInView hook + 4 keyframes + utility classes). CSS grew 1.1KB. Review loop passed: all 3 reviewers APPROVE.
2026-04-07 — Phase 3 Implementation — Rebuilt all 8 landing sections with Blueprint Garden palette. Deleted Features.tsx (merged into HowItWorks). Created 2 new components (OutputGallery, TrustBar). All sections use useInView animations. Image assets deferred (CSS/SVG placeholders). Build: 291KB/91KB gzipped. Code review requested 2 a11y fixes (TrustBar aria-hidden, HowItWorks decorative button→div) — applied. Doc Sync + Security APPROVE.
```
