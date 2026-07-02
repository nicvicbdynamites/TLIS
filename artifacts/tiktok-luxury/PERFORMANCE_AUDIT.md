# TLIS Mobile Rendering Performance Audit

**Scope:** Android GPU rendering artifacts / flicker during scroll on the black-and-gold luxury dashboard.
**Constraint honored:** zero changes to UI design, theme, colors, spacing, typography, layout, navigation, or functionality — this is a pure rendering-path optimization pass. Verified with `typecheck`, `build`, screenshots across desktop + mobile viewports, and an end-to-end regression test.

## Root causes identified

1. **`backdrop-filter: blur()` on scroll-adjacent elements.** Android Chrome/WebView rasterizes backdrop-blur per-frame on a separate compositor pass; on a `position: sticky` header or a full-screen overlay that sits above scrolling content, this is the single most common cause of GPU-driven flicker/tearing during scroll on Android.
2. **A continuously-animating `box-shadow`** on the "live" status pulse indicator (`.live-dot` / `pulse-ring` keyframes), used on every page's "LIVE" badges. `box-shadow` is a paint property, not a composited one — animating it every frame forces a full repaint of the element's paint layer on every tick, indefinitely, for the lifetime of the page.
3. **`transition: all` used near-universally (~220 instances)** across hover/focus states site-wide. `transition-all` watches every animatable CSS property (including layout-triggering ones like `width`/`height`/`padding`/`border-width` when they happen to change alongside color/opacity), which is more expensive to evaluate and can trigger unnecessary layout/paint work beyond what's actually visually animating.
4. **8 unmemoized `useCounter()` count-up hooks driving `setState` at ~60fps** in the Executive Command Center, each independently re-rendering the entire ~1,000-line page component tree on every tick (~8 re-renders/frame while animating). Also had a cleanup bug: the interval's `clearInterval` was returned from inside the `setTimeout` callback (a no-op — `setTimeout` callbacks' return values are discarded), so if the target value changed or the component unmounted mid-count, the `setInterval` was never cleared and kept firing indefinitely in the background.

## Fixes applied

| Fix | File(s) | Why it helps |
|---|---|---|
| Removed `backdrop-blur-md`/`backdrop-blur-sm` from the sticky mobile header and mobile sidebar overlay; replaced with plain semi-opaque backgrounds (`bg-background/95`) | `src/components/layout.tsx` | Eliminates the per-frame blur compositor pass on the two elements most likely to be visible *while actively scrolling* on mobile. |
| Rewrote `.live-dot` to animate only `transform`/`opacity` via a `::after` pseudo-element instead of animating `box-shadow` in the `pulse-ring` keyframe | `src/index.css` | `transform`/`opacity` animate on the GPU compositor thread with no repaint; `box-shadow` does not. Same visual pulse, no paint cost. |
| `.luxury-card` / `.luxury-card:hover`: `transition-all` → `transition` (color/border/shadow properties only), added `translate3d(0,0,0)` + `will-change: transform` on hover | `src/index.css` | Narrows the transition to non-layout properties and promotes the card to its own compositor layer during hover so the hover effect doesn't repaint siblings. |
| Added `transform: translateZ(0)` + `will-change` to the `body::after` grain-texture overlay | `src/index.css` | Promotes the full-viewport overlay to its own GPU layer once, instead of Android re-rasterizing it as part of the base layer on every scroll frame. |
| Bulk `transition-all` → `transition` (192 replacements across 30 files) | 30 files under `src/pages/*` and `src/components/*` (see diff) | Removes implicit tracking of layout-triggering properties from hover/focus transitions site-wide. 24 legitimate `transition-all duration-700`/`duration-1000` progress-bar width animations were deliberately left untouched since they intentionally animate `width`. |
| Extracted the 8 `useCounter()` KPI count-ups into a single memoized `<AnimatedNumber target delay />` leaf component; fixed the interval cleanup bug | `src/pages/executive-command-center.tsx` | Confines the ~60fps state updates to 8 tiny memoized leaves instead of re-rendering the full page tree on every tick. Also stops a background `setInterval` leak that could persist after unmount/target change. |

## Verification

- `pnpm --filter @workspace/tiktok-luxury run typecheck` — passes, no errors.
- `pnpm --filter @workspace/tiktok-luxury run build` — succeeds.
- Workflow restarted cleanly; no new console/server errors.
- Screenshots taken at desktop (1280px) and mobile (402px) viewports on `/`, `/command`, `/research`, `/vault` — pixel-identical styling, colors, layout, and navigation confirmed vs. pre-change design (gold/black theme, card layout, sidebar, KPI grid, live badges all intact).
- End-to-end regression test (Playwright-based) across desktop + mobile: sidebar navigation, KPI counters settling to stable values, scroll behavior, mobile hamburger menu/overlay, and vault/research pages all verified working with no functional regressions.

## Estimated impact

- **Scroll-time GPU/compositor cost:** meaningfully reduced on Android — the two elements most implicated in scroll-flicker (sticky mobile header, mobile sidebar overlay) no longer trigger a backdrop-blur compositor pass, and the grain overlay + luxury cards are now on stable GPU layers instead of being re-rasterized into the base layer each frame.
- **Paint work:** the always-on "LIVE" pulse indicators (present on every page) no longer force a `box-shadow` repaint every animation frame — this alone was a continuous per-page paint cost for as long as any page was open.
- **Re-render volume:** Executive Command Center's per-tick re-renders during the ~1.2s KPI count-up dropped from "whole ~1,000-line page tree" to "8 independent single-node leaves," which also removes the associated layout/style-recalc cost cascading through the page during that animation window.
- **Memory:** fixed a background-interval leak that could accumulate uncollected timers across repeated visits/prop changes to the Executive Command Center.

No visual, layout, navigational, or functional changes were made — every fix targets *how* the existing design is rendered, not *what* is rendered.
