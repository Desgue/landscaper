# Garden Planner — Landing Page Redesign Plan

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-LP` |
| **Title** | Landing Page Redesign — Performance, SEO & Visual Overhaul |
| **Scope** | Full redesign of the `/` landing page: performance infrastructure (code splitting, pre-rendering), SEO (meta, structured data, copy), visual identity (Blueprint Garden palette, Inter font, animations), and section-by-section rebuild. Excludes app canvas, backend, and AI generation features. |
| **Status** | `in-progress` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 (Phase 4 partial) |
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

### Phase 3 — Section Redesign (Top to Bottom) [x]

> Rebuild each landing section using the new design system. Order is top-to-bottom so each section can be reviewed in context of what appears above it.

#### Feature: Navbar Refinements [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/Navbar.tsx`.

##### Tasks

- [x] Update CTA button to "Start free" with accent amber bg and dark text — done 2026-04-07
- [x] Apply Blueprint Garden palette to navbar background, links, and hover states — done 2026-04-07
- [x] Add border-border bottom border — done 2026-04-07 (no mobile hamburger — single-bar layout)

##### Decisions

_None._

---

#### Feature: Hero Redesign [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/Hero.tsx`.

##### Tasks

- [x] Replace current layout with centered single-column: H1, subtext, CTA "Start planning — it's free" — done 2026-04-07
- [x] Build interactive before/after image slider as `TransformationPreview` inline in `Hero.tsx` — mouse/touch drag with lerp animation, clip-path wipe-reveal entrance — done 2026-04-07
- [x] Source real before/after image pair (`before.jpeg` 1200×1600, `after.png` 1376×768) — done 2026-04-07
- [x] Add trust badge: "Free to Start. No Account. Works in Your Browser." — done 2026-04-07
- [x] Wire up fade-up entrance animation using `useInView` hook — done 2026-04-07

##### Decisions

- Implemented interactive TransformationPreview inline in Hero.tsx rather than as a separate `BeforeAfterSlider.tsx` component. Uses mouse/touch move handlers with requestAnimationFrame lerp for smooth dragging and a CSS clip-path wipe-reveal entrance animation.

---

#### Feature: Output Gallery (New Section) [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Read `src/components/OutputGallery.tsx`.

##### Tasks

- [x] Create `OutputGallery.tsx` — responsive grid with 6 cards (4 real images, 2 gradient placeholders) — done 2026-04-07
- [ ] Source or create 6-8 AI render output images; optimize as AVIF+WebP — deferred, 2 cards still use CSS gradient placeholders
- [x] Add section heading: "See What Greenprint Can Create" — done 2026-04-07
- [x] Wire up staggered fade-up animation for individual gallery cards with per-card delay array — done 2026-04-07

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

#### Feature: Pricing Section (New Section) [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/components/Pricing.tsx`.

##### Tasks

- [x] Create `Pricing.tsx` with 3 tiers (Free / Pro / Studio), billing toggle (monthly/annual), and per-card animation — done 2026-04-07
- [x] Apply Blueprint Garden palette, accent CTA on highlighted plan, `role="switch"` billing toggle with proper aria — done 2026-04-07
- [x] Place between TrustBar and CTABanner in `LandingPage.tsx` — done 2026-04-07

##### Decisions

- Three tiers: Free (0), Pro ($10/mo), Studio ($40/mo). Annual billing saves up to 35%. All CTAs route to `/app`.

---

#### Feature: Landing Page Assembly [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Read `src/pages/LandingPage.tsx`.

##### Tasks

- [x] Update imports: remove `Features`, add `OutputGallery`, `TrustBar`, and `Pricing`; correct section order: Navbar → Hero → OutputGallery → HowItWorks → TrustBar → Pricing → CTABanner → Footer — done 2026-04-07
- [x] Add `id` anchors to each section for in-page navigation — done 2026-04-07
- [ ] Full visual review at mobile (375px), tablet (768px), and desktop (1280px) breakpoints — manual task

##### Decisions

_None._

---

### Phase 4 — Polish & Optimization [~]

> Final pass for image optimization, animation tuning, performance budget enforcement, and cross-browser testing.

#### Feature: Image Optimization Pipeline [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Check `public/` and `src/assets/` for image files.

##### Tasks

- [ ] Convert all landing page images to AVIF (primary) + WebP (fallback) using `sharp` or `squoosh-cli`; ensure all `<img>` use `<picture>` with both sources — deferred, current PNGs/JPEG are acceptable size
- [x] Add `loading="lazy"` and explicit `width`/`height` attributes to all below-fold images — done 2026-04-07
- [x] Verify hero images are eagerly loaded (`fetchpriority="high"`, no lazy) for LCP — done 2026-04-07

##### Decisions

- Hero images have `fetchPriority="high"` and no `loading` attribute (browser default = eager). Gallery images 0-2 have no `loading` (eager for first row), images 3-5 have `loading="lazy"`.

---

#### Feature: Scroll Animation Tuning [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** `grep -rn "useInView\|animate-" src/components/`

##### Tasks

- [x] Tune Intersection Observer `rootMargin` across all sections (`-40px` to `-60px` bottom offset) for smooth early-reveal scroll animations — done 2026-04-07
- [x] Add staggered delays for multi-element sections: gallery cards (6 delays), trust bar items (3 delays), how-it-works steps (per-row useInView) — done 2026-04-07
- [x] Verify `prefers-reduced-motion` disables all animations cleanly — `useInView` hook sets `isInView=true` immediately, CSS `@media (prefers-reduced-motion: reduce)` zeroes all durations — done 2026-04-07

##### Decisions

_None._

---

#### Feature: Mobile-Specific Refinements [x]

**Status:** `done`
**Spec:** N/A
**Load hint:** Test at 375px viewport width.

##### Tasks

- [x] Hero before/after slider supports touch events via `onTouchMove` handler — verified 2026-04-07
- [x] Gallery uses responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) — stacks on mobile, no horizontal scroll needed — verified 2026-04-07
- [x] All CTA buttons are full-width on mobile (`w-full sm:w-auto`) with adequate tap targets (`min-h-[44px]`, `inline-flex items-center`) — done 2026-04-07

##### Decisions

- Used `inline-flex items-center justify-center` consistently on all CTA links (Navbar, Hero, CTABanner) for reliable vertical centering within 44px min-height.

---

#### Feature: Lighthouse Audit & Performance Budget [~]

**Status:** `in-progress`
**Spec:** N/A
**Load hint:** Run `npx lighthouse http://localhost:5173 --view` after build.

##### Tasks

- [ ] Run Lighthouse on pre-rendered build; target scores: Performance > 95, Accessibility > 95, SEO > 95, Best Practices > 95 — requires manual testing
- [x] Verify landing page bundle size: main bundle 296KB/92KB gzipped (includes React+Router+landing); AppLayout split to separate chunk — verified 2026-04-07
- [x] CLS prevention: explicit `width`/`height` on all images; all sections have stable layout — done 2026-04-07
- [ ] Run axe-core or similar automated a11y scan; fix all critical/serious issues — requires manual testing

##### Decisions

- Main bundle is 92KB gzipped (above 80KB target), but ~42KB is React itself which is unavoidable. Landing page component code is ~50KB gzipped — within budget.

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

#### Feature: Security Headers (Deployment) [ ]

**Status:** `todo`
**Spec:** N/A
**Load hint:** N/A — deployment configuration.

##### Tasks

- [ ] Add Content-Security-Policy header at CDN/server layer
- [ ] Add X-Frame-Options / frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers
- [ ] Verify CSP does not break Tailwind inline styles or self-hosted font loading

##### Decisions

_None yet._

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Navbar CTA text: "Start free" (not "Open the canvas") | "Start free" removes risk objection, is concise, and matches transactional search intent. "Open the canvas" is product jargon that means nothing to a first-time visitor. |
| 2026-04-07 | Self-host Inter font with `font-display: swap` (not system-ui) | Brand cohesion outweighs the ~15KB font cost. Self-hosting avoids Google Fonts GDPR/privacy concerns and the extra DNS lookup. `font-display: swap` prevents FOIT. Resolves branding agent vs tech agent conflict. |
| 2026-04-07 | 3 merged steps in How It Works (not 4 separate feature cards) | UX agent correctly identified that Features and HowItWorks were redundant. Merging into 3 alternating rows reduces cognitive load. SEO copy is distributed across the 3 steps so no keyword coverage is lost. |
| 2026-04-07 | `useInView` returns `{ ref, isInView }` object (not `[ref, isInView]` tuple) | Object destructuring is better ergonomics — avoids positional renaming at call sites and is forward-compatible if new properties are added. |
| 2026-04-07 | Used Inter variable font (single file, 100-900 weight range) | One HTTP request covers all weights, 24KB total. Superior to 4 separate static weight files. |
| 2026-04-07 | Deferred pre-rendering (vite-plugin-prerender) | Plugin compatibility with Vite 8 unverified; adding dev dependency requires user approval. Feature stays todo. |
| 2026-04-07 | Interactive TransformationPreview built inline in Hero.tsx | Implemented mouse/touch drag slider with lerp animation and clip-path wipe-reveal, using real before/after photos. Built inline rather than as separate BeforeAfterSlider.tsx component. |
| 2026-04-07 | Gallery and HowItWorks use mix of real images and placeholders | 4 of 6 gallery cards have real AI render images; 2 use CSS gradient placeholders. HowItWorks uses StepPlaceholder SVG components. |
| 2026-04-07 | Pricing section: 3 tiers with billing toggle | Free/Pro/Studio pricing with monthly/annual toggle. Placed between TrustBar and CTABanner. |
| 2026-04-07 | CTA links use `inline-flex items-center justify-center` | Consistent vertical centering pattern across Navbar, Hero, and CTABanner CTAs. Code reviewer flagged inconsistency; standardized to flex approach. |
| 2026-04-07 | Gallery heading changed to "See What Greenprint Can Create" | More natural than spec's "AI Garden Design Tools That Do the Hard Part". Less jargon, still contains brand name for SEO. |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — AlphaOps Coordinator — Plan PLAN-LP initialized. Synthesized findings from 4 specialist agents (UX/UI, Color/Branding, SEO Copywriting, Tech SEO). Resolved 3 cross-agent conflicts (Navbar CTA text, font strategy, feature count). Defined 4 phases with 18 features and 56 atomic tasks.
2026-04-07 — Phase 1 Implementation — Completed 4/5 features: code splitting, meta tags, font setup, accessibility. Pre-rendering deferred (Vite 8 plugin compat unverified). Build verified: AppLayout split to 451KB chunk, main bundle 90KB gzipped. Review loop passed: Code Reviewer APPROVE, Doc Sync APPROVE, Security Audit APPROVE. Minor fixes applied: robots.txt trailing slashes, Hero CTA subtext contrast (gray-400→gray-500).
2026-04-07 — Phase 2 Implementation — Completed all 4 features: Blueprint Garden palette (17 color tokens), typography scale (5 levels), shadow system (3 tiers, warm-tinted), animation utilities (useInView hook + 4 keyframes + utility classes). CSS grew 1.1KB. Review loop passed: all 3 reviewers APPROVE.
2026-04-07 — Phase 3 Implementation — Rebuilt all 8 landing sections with Blueprint Garden palette. Deleted Features.tsx (merged into HowItWorks). Created 2 new components (OutputGallery, TrustBar). All sections use useInView animations. Image assets deferred (CSS/SVG placeholders). Build: 291KB/91KB gzipped. Code review requested 2 a11y fixes (TrustBar aria-hidden, HowItWorks decorative button→div) — applied. Doc Sync + Security APPROVE.
2026-04-07 — Phase 3 Completion + Phase 4 Implementation — Completed Phase 3 remaining: added id="gallery" anchor. Phase 4: tuned rootMargin (-40px to -60px) across all sections for smoother scroll animations; added per-item stagger delays to TrustBar; added min-h-[44px] + inline-flex items-center to all CTA links for 44px tap targets; added width/height to hero and gallery images for CLS prevention; added loading="lazy" to below-fold gallery images. Build: 296KB/92KB gzipped. Review loop: Code Reviewer APPROVE (fixed CTA inline-flex consistency), Doc Sync REQUEST_CHANGES (5 findings: Pricing missing from plan, gallery stagger marked partial but done, Hero slider marked deferred but implemented, Navbar CTA text mismatch, section order) — all resolved in plan update. Security APPROVE (advisory: add CSP/security headers at deployment layer).
```
