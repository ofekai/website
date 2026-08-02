/**
 * The site's single Motion entry. Components opt in with data attributes so
 * the markup stays readable:
 *
 *   data-reveal              fade + rise on scroll into view
 *   data-reveal="diagonal"   the Expertise cards, transform-only
 *   data-reveal-group        animate the [data-reveal] children together,
 *                            optionally with data-stagger="<ms>"
 *   data-parallax            the hero banner image, driven by scroll position
 *   data-magnetic            spring-follows-cursor, fine pointers only
 *
 * Everything here is JS-driven motion that has a good reason not to be CSS.
 * The hero headline's mask reveal deliberately is *not* here: it is the page's
 * first text paint and must not wait on this chunk, so it lives in global.css
 * and is stamped with per-word delays at build time (see Hero.astro).
 *
 * What is imported from where is load-bearing, and all three decisions were
 * made against measurements rather than taste:
 *
 * - `motion/mini`'s `animate`, statically. It is WAAPI-only and tiny, and its
 *   single unambiguous DOM signature avoids the full package's overload.
 * - `scroll`, *dynamically*, after the load event. It only exists in the full
 *   entry and costs 5.3 KB gzipped. Statically imported it took the page chunk
 *   from 3.9 KB to 9.9 KB and pushed LCP from 1652ms to 1910ms — not because
 *   it ran slowly (TBT stayed 0) but because its bytes competed with the hero
 *   image's on a throttled connection. Nothing can be scroll-linked before the
 *   user scrolls, so none of it belongs on the critical path.
 * - The full `animate`, never. It is the only source of a Motion spring, and
 *   the magnetic buttons want one, but it drags in the whole JS animation
 *   engine: 9.7 KB -> 25.6 KB gzipped, over the 20 KB budget, to move a button
 *   ten pixels. The plan's instruction for a budget overrun is to drop to the
 *   smaller primitive, so the spring below is integrated by hand from the same
 *   physics constants.
 *
 * Initial hidden states live in CSS, gated on `html.js`, so the page is fully
 * visible when JS is off or this module fails to load.
 *
 * Durations and the default stagger are read from tokens.css at animate time
 * rather than hardcoded, so prefers-reduced-motion's token collapse — and any
 * future tuning — takes effect without touching this file.
 */
import { animate as animateMini } from 'motion/mini';

const EASE = [0.16, 1, 0.3, 1] as const; // mirrors --ease-out-expo

// `x`/`y` shorthand is resolved by the full `animate` only. The mini/WAAPI
// path used for reveals takes real CSS properties, so its settle target
// animates the literal `transform`. The browser interpolates from whatever
// CSS set as the initial computed transform (translateY(24px) or
// translate3d(32px,16px,0), see global.css) to `none`.
const SETTLE = { opacity: 1, transform: 'none' };

// Parallax travel, as a fraction of the banner image's own height. Three
// things in global.css are tied to these two numbers and have to move with
// them: the `@keyframes hero-parallax` the native path animates (same values,
// expressed in CSS), and the `top: -14%` / `height: 114%` overscan that keeps
// the image covering the hero across the whole travel.
const PARALLAX = {
  y: '12%',
  scale: 1.05,
} as const;

// Restrained on purpose: the pull is capped at 10px regardless of how large
// the button is, which reads as the surface acknowledging the cursor rather
// than chasing it.
const MAGNETIC_PULL = 0.22;
const MAGNETIC_MAX_PX = 10;

// The spring the plan specifies. Damping ratio works out at
// 15 / (2 * sqrt(150 * 0.4)) = 0.97 — just under critical, so the button
// settles with a single almost-imperceptible overshoot rather than a wobble.
const SPRING = { stiffness: 150, damping: 15, mass: 0.4 } as const;
// Fixed integration step, decoupled from the display's refresh rate so the
// motion is identical on 60Hz and 120Hz panels and stays stable if a frame
// is late.
const SPRING_STEP_S = 1 / 240;
const REST_DISTANCE_PX = 0.05;
const REST_VELOCITY_PX_S = 0.05;

function tokenSeconds(name: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return (Number.isFinite(n) ? n : fallbackMs) / 1000;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/* --- Scroll reveals ------------------------------------------------------ */

function watchSingle(el: HTMLElement): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animateMini(el, SETTLE, { duration: tokenSeconds('--dur-reveal', 1200), ease: EASE });
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
          animateMini(child, SETTLE, { duration, ease: EASE, delay: i * staggerSeconds });
        });
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.25 },
  );
  observer.observe(group);
  return observer;
}

function initReveals(): VoidFunction {
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
  const grouped = new Set<Element>();
  groups.forEach((group) => group.querySelectorAll('[data-reveal]').forEach((el) => grouped.add(el)));

  const singles = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
    (el) => !grouped.has(el),
  );

  const observers = [
    ...groups.map(watchGroup).filter((o): o is IntersectionObserver => Boolean(o)),
    ...singles.map(watchSingle),
  ];

  return () => observers.forEach((o) => o.disconnect());
}

/* --- Hero parallax ------------------------------------------------------- */

/** Runs `fn` once the page has finished loading, or immediately if it already has. */
function afterLoad(fn: VoidFunction): VoidFunction {
  if (document.readyState === 'complete') {
    fn();
    return () => {};
  }
  window.addEventListener('load', fn, { once: true });
  return () => window.removeEventListener('load', fn);
}

/**
 * The hero parallax's *fallback* path, and nothing else.
 *
 * The effect itself is declared in global.css as a scroll-driven animation,
 * which Chromium and Safari 26+ run on the compositor for zero bytes. This
 * function exists for the browsers that lack ScrollTimeline — Firefox, at time
 * of writing — where Motion's `scroll()` drives the identical keyframes from
 * rAF. Loading it only there is what keeps the effect off the critical path:
 * imported eagerly for everyone it cost 5.3 KB gzipped and pushed LCP from
 * 1429ms to 1503ms, and the browsers that pay for it were the ones that
 * needed it least.
 */
function initParallax(): VoidFunction | undefined {
  if (CSS.supports('animation-timeline', 'view()')) return undefined;

  const img = document.querySelector<HTMLElement>('img[data-parallax]');
  const hero = img?.closest('section');
  if (!img || !hero) return undefined;

  let stop: VoidFunction | undefined;
  let cancelled = false;

  const cancelLoad = afterLoad(() => {
    void import('motion').then(({ scroll }) => {
      // Reduced motion may have been switched on while the chunk was in flight.
      if (cancelled) return;
      stop = scroll(
        animateMini(
          img,
          {
            transform: [
              'translateY(0%) scale(1)',
              `translateY(${PARALLAX.y}) scale(${PARALLAX.scale})`,
            ],
          },
          { ease: 'linear' },
        ),
        { target: hero, offset: ['start start', 'end start'] },
      );
    });
  });

  // The overscan compensating for the travel is declared in global.css under
  // the same `html.js` + no-preference conditions this function runs under, so
  // the hero image is laid out at its final size before first paint instead of
  // being reflowed once this module arrives.
  return () => {
    cancelled = true;
    cancelLoad();
    stop?.();
    img.style.transform = '';
  };
}

/* --- Magnetic buttons ---------------------------------------------------- */

interface Magnet {
  el: HTMLElement;
  /** Viewport centre of the button, sampled once when the pointer enters. */
  centreX: number;
  centreY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

function initMagnetic(): VoidFunction | undefined {
  // Gated on a real hovering, fine-grained pointer. On touch there is no
  // hover state to enter or leave, so the effect is pure jank: the button
  // would jump on tap and stay displaced with no way to undo it.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  if (!targets.length) return undefined;

  const magnets: Magnet[] = targets.map((el) => ({
    el,
    centreX: 0,
    centreY: 0,
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
  }));

  // One rAF loop shared by every magnet, running only while something is
  // actually moving. Nothing here reads layout, so the loop can never force a
  // reflow: the only DOM touch per frame is a transform write.
  let frame = 0;
  let lastTime = 0;

  function tick(now: number): void {
    // Clamp the frame delta. A backgrounded tab or a dropped frame otherwise
    // hands the integrator a huge dt and the spring explodes.
    const elapsed = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    let moving = false;

    for (const m of magnets) {
      let remaining = elapsed;
      while (remaining > 0) {
        const dt = Math.min(remaining, SPRING_STEP_S);
        remaining -= dt;
        // Damped harmonic oscillator: a = (-k*displacement - c*v) / m
        const accelerationX =
          (SPRING.stiffness * (m.targetX - m.x) - SPRING.damping * m.velocityX) / SPRING.mass;
        const accelerationY =
          (SPRING.stiffness * (m.targetY - m.y) - SPRING.damping * m.velocityY) / SPRING.mass;
        m.velocityX += accelerationX * dt;
        m.velocityY += accelerationY * dt;
        m.x += m.velocityX * dt;
        m.y += m.velocityY * dt;
      }

      const atRest =
        Math.abs(m.targetX - m.x) < REST_DISTANCE_PX &&
        Math.abs(m.targetY - m.y) < REST_DISTANCE_PX &&
        Math.abs(m.velocityX) < REST_VELOCITY_PX_S &&
        Math.abs(m.velocityY) < REST_VELOCITY_PX_S;

      if (atRest) {
        m.x = m.targetX;
        m.y = m.targetY;
        m.velocityX = 0;
        m.velocityY = 0;
      } else {
        moving = true;
      }

      // Sub-pixel values are rounded away by the compositor anyway; writing
      // the same string repeatedly is cheaper than letting it churn.
      m.el.style.transform =
        m.x === 0 && m.y === 0 ? '' : `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0)`;
    }

    frame = moving ? requestAnimationFrame(tick) : 0;
  }

  function wake(): void {
    if (frame) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  const cleanups = magnets.map((m) => {
    // Engagement is tracked against a zone of our own, not against the
    // element's `:hover`. A magnetic button pulled towards the cursor slides
    // out from under it near the edges, which fires pointerleave, springs the
    // button back, puts it under the cursor again, and oscillates. The zone is
    // the button's own box inflated by the maximum pull, so the button can
    // never move far enough to escape the region that is holding it.
    let engaged = false;
    let halfWidth = 0;
    let halfHeight = 0;

    // Measured once per engagement, not per pointermove: getBoundingClientRect
    // is a layout read, and it reports the element's *current* magnetic offset,
    // so each frame's displacement would be measured from the position the
    // previous frame put it in. Subtracting the live offset recovers the
    // element's resting centre.
    const measure = () => {
      const rect = m.el.getBoundingClientRect();
      m.centreX = rect.left + rect.width / 2 - m.x;
      m.centreY = rect.top + rect.height / 2 - m.y;
      halfWidth = rect.width / 2 + MAGNETIC_MAX_PX;
      halfHeight = rect.height / 2 + MAGNETIC_MAX_PX;
    };

    const release = () => {
      engaged = false;
      m.targetX = 0;
      m.targetY = 0;
      window.removeEventListener('pointermove', onWindowMove);
      wake();
    };

    function onWindowMove(event: PointerEvent): void {
      const dx = event.clientX - m.centreX;
      const dy = event.clientY - m.centreY;
      if (Math.abs(dx) > halfWidth || Math.abs(dy) > halfHeight) {
        release();
        return;
      }
      m.targetX = clamp(dx * MAGNETIC_PULL, -MAGNETIC_MAX_PX, MAGNETIC_MAX_PX);
      m.targetY = clamp(dy * MAGNETIC_PULL, -MAGNETIC_MAX_PX, MAGNETIC_MAX_PX);
      wake();
    }

    const onEnter = (event: PointerEvent) => {
      if (engaged) return;
      engaged = true;
      measure();
      window.addEventListener('pointermove', onWindowMove);
      onWindowMove(event);
    };

    m.el.addEventListener('pointerenter', onEnter);
    // Backstop for the pointer leaving the window entirely, where no further
    // pointermove ever arrives to take the button out of the zone.
    document.addEventListener('pointerleave', release);

    return () => {
      m.el.removeEventListener('pointerenter', onEnter);
      document.removeEventListener('pointerleave', release);
      window.removeEventListener('pointermove', onWindowMove);
      m.el.style.transform = '';
    };
  });

  return () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    cleanups.forEach((fn) => fn());
  };
}

/* --- Entry --------------------------------------------------------------- */

export function initMotion(): void {
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let teardown: VoidFunction[] = [];

  function start(): void {
    teardown = [initReveals(), initParallax(), initMagnetic()].filter(
      (fn): fn is VoidFunction => Boolean(fn),
    );
  }

  /**
   * If the OS toggles reduced-motion on mid-session, CSS's hiding rule (gated
   * on no-preference) stops applying, but any in-flight animation has already
   * written inline opacity/transform that would override the cascade — so tear
   * every effect down and clear what they wrote.
   */
  function stop(): void {
    teardown.forEach((fn) => fn());
    teardown = [];
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
    });
  }

  if (!reducedQuery.matches) start();

  reducedQuery.addEventListener('change', (event) => {
    if (event.matches) {
      stop();
    } else {
      // Reduced-motion just turned off: CSS's hiding rule starts applying
      // again with nothing left to reveal the elements — start watching.
      start();
    }
  });
}
