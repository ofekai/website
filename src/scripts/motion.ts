/**
 * Motion foundation — replaces the plain IntersectionObserver reveal.ts from
 * Phase 1. Opt in with `data-reveal` (bare fade+rise), `data-reveal="diagonal"`
 * (Expertise cards, transform-only), or group several `[data-reveal]` children
 * under `data-reveal-group` (optionally `data-reveal-group="diagonal"` plus
 * `data-stagger="<ms>"`) to animate them together with a shared stagger.
 *
 * Uses `motion/mini` rather than the full `motion` package: its `animate` has
 * a single, unambiguous DOM signature (the full package's overloaded
 * `animate` — DOM target vs. arbitrary-object target — resolves incorrectly
 * against a plain `{opacity, transform}` keyframe object under this
 * TypeScript version). `inView`/`stagger` aren't in `motion/mini`, so
 * triggering and per-child delay are done with a native IntersectionObserver
 * and an indexed delay loop below — exactly the fallback the Phase 5 spec
 * calls for if the bundle needs to shrink, and it resolves the typing issue
 * as a side effect.
 *
 * Initial hidden states live in CSS (global.css), gated on `html.js` so the
 * page is fully visible when JS is off or the module fails to load.
 *
 * Durations and the default stagger are read from tokens.css at animate time
 * (not hardcoded) so prefers-reduced-motion's token collapse — and any future
 * tuning of --dur-reveal/--stagger — takes effect without touching this file.
 */
import { animate } from 'motion/mini';

const EASE = [0.16, 1, 0.3, 1] as const; // mirrors --ease-out-expo

// `x`/`y` independent-transform shorthand is a React-component (motion.div)
// feature — the vanilla DOM `animate()` only accepts real CSS properties, so
// the settle target animates the literal `transform` property. The browser
// interpolates from whatever CSS set as the initial computed transform
// (translateY(24px) or translate3d(32px,16px,0), see global.css) to `none`.
const SETTLE = { opacity: 1, transform: 'none' };

function tokenSeconds(name: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return (Number.isFinite(n) ? n : fallbackMs) / 1000;
}

/**
 * Hero only. Phase 6 replaces this with a CSS-only mask reveal, so it's left
 * as Phase 1's exact implementation, scoped to `flip-up`, rather than routed
 * through Motion.
 */
function initLegacyFlipReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal="flip-up"]');
  if (!targets.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -5% 0px' },
  );
  targets.forEach((el) => observer.observe(el));
}

function watchSingle(el: HTMLElement): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animate(el, SETTLE, { duration: tokenSeconds('--dur-reveal', 1200), ease: EASE });
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.25 },
  );
  observer.observe(el);
  return observer;
}

function watchGroup(group: HTMLElement): IntersectionObserver | undefined {
  const children = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!children.length) return undefined;

  const staggerSeconds = group.dataset.stagger
    ? Number(group.dataset.stagger) / 1000
    : tokenSeconds('--stagger', 60);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const duration = tokenSeconds('--dur-reveal', 1200);
        children.forEach((child, i) => {
          animate(child, SETTLE, { duration, ease: EASE, delay: i * staggerSeconds });
        });
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.25 },
  );
  observer.observe(group);
  return observer;
}

export function initMotion(): void {
  initLegacyFlipReveal();

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
  const grouped = new Set<Element>();
  groups.forEach((group) => group.querySelectorAll('[data-reveal]').forEach((el) => grouped.add(el)));

  const singles = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
    (el) => el.dataset.reveal !== 'flip-up' && !grouped.has(el),
  );

  let observers: IntersectionObserver[] = [];

  function start(): void {
    observers = [
      ...groups.map(watchGroup).filter((o): o is IntersectionObserver => Boolean(o)),
      ...singles.map(watchSingle),
    ];
  }

  // If the OS toggles reduced-motion on mid-session, CSS's hiding rule
  // (gated on no-preference) stops applying, but any in-flight Motion
  // animation has already written inline opacity/transform that would
  // override the cascade — clear them and drop any pending watchers.
  function settleInstantly(): void {
    observers.forEach((o) => o.disconnect());
    observers = [];
    document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="flip-up"])').forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
    });
  }

  if (!reducedQuery.matches) start();

  reducedQuery.addEventListener('change', (event) => {
    if (event.matches) {
      settleInstantly();
    } else {
      // Reduced-motion just turned off: CSS's hiding rule starts applying
      // again with nothing left to reveal the elements — start watching.
      start();
    }
  });
}
