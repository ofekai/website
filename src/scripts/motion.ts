import { animate } from 'motion/mini';

const EASE = [0.16, 1, 0.3, 1] as const;

function tokenSeconds(name: string, fallbackMs: number): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return (Number.isFinite(value) ? value : fallbackMs) / 1000;
}

function finalState(el: HTMLElement): Record<string, string | number> {
  const state: Record<string, string | number> = { opacity: 1, transform: 'none' };
  if (el.dataset.reveal === 'mask' || el.dataset.reveal === 'line') {
    state.clipPath = 'inset(0 0 0 0)';
  }
  return state;
}

function initReveals(): VoidFunction {
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-group]'));
  const grouped = new Set<Element>();
  groups.forEach((group) => group.querySelectorAll('[data-reveal]').forEach((el) => grouped.add(el)));

  const watch = (target: HTMLElement, children: HTMLElement[]) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const duration = tokenSeconds('--dur-reveal', 900);
        const stagger = target.dataset.stagger
          ? Number(target.dataset.stagger) / 1000
          : tokenSeconds('--stagger', 60);
        children.forEach((child, index) => {
          animate(child, finalState(child), { duration, ease: EASE, delay: index * stagger });
          const image = child.matches('.editorial-media')
            ? child.querySelector<HTMLElement>('img')
            : child.querySelector<HTMLElement>('.editorial-media img');
          if (image) animate(image, { transform: 'scale(1)' }, { duration: duration * 1.2, ease: EASE });
        });
        observer.disconnect();
      },
      // Mask and line reveals begin fully clipped, so Chromium can report
      // `isIntersecting: true` with an intersectionRatio of 0. A positive
      // threshold deadlocks those elements in their hidden state.
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(target);
    return observer;
  };

  const observers = groups.map((group) =>
    watch(group, Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'))),
  );
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (!grouped.has(el)) observers.push(watch(el, [el]));
  });
  return () => observers.forEach((observer) => observer.disconnect());
}

function initTransitionStates(): VoidFunction {
  const track = document.querySelector<HTMLElement>('[data-transition-marquee]');
  const section = track?.closest<HTMLElement>('[data-transition]');
  if (!section) return () => {};

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      section.classList.add('is-transition-settled');
      observer.disconnect();
    },
    { threshold: 0, rootMargin: '0px 0px -35% 0px' },
  );
  observer.observe(section);
  return () => observer.disconnect();
}

function afterLoad(fn: VoidFunction): VoidFunction {
  if (document.readyState === 'complete') {
    fn();
    return () => {};
  }
  window.addEventListener('load', fn, { once: true });
  return () => window.removeEventListener('load', fn);
}

/*
 * Mirrors the CSS scroll-driven choreography for browsers without
 * `animation-timeline: view()`. The structural half of every transition --
 * scenes pinning under the nav while the next one travels over them -- is
 * plain `position: sticky` and needs no fallback at all, so only the property
 * tweens live here.
 *
 * Every CSS range is `cover <from>% cover <to>%` on a zero-height .scene-seam,
 * which makes the translation mechanical: see coverRange() below.
 */
function initScrollFallback(): VoidFunction | undefined {
  if (CSS.supports('animation-timeline', 'view()')) return undefined;

  const seam = (name: string) => document.querySelector<HTMLElement>(`[data-seam="${name}"]`);
  const find = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

  /*
   * A zero-height subject's `cover 0%` is the marker sitting on the viewport
   * bottom and `cover 100%` is the marker on the viewport top, so the CSS
   * percentage maps to a Motion viewport offset by simple complement.
   */
  const coverRange = (from: number, to: number): [`start ${number}%`, `start ${number}%`] => [
    `start ${100 - from}%`,
    `start ${100 - to}%`,
  ];

  const stops: VoidFunction[] = [];
  const animated = new Set<HTMLElement>();
  let cancelled = false;

  const cancelLoad = afterLoad(() => {
    void import('motion').then(({ scroll }) => {
      if (cancelled) return;

      const drive = (
        el: HTMLElement | null | undefined,
        marker: HTMLElement | null,
        keyframes: Parameters<typeof animate>[1],
        from: number,
        to: number,
      ) => {
        if (!el || !marker) return;
        animated.add(el);
        stops.push(
          scroll(animate(el, keyframes, { ease: 'linear' }), {
            target: marker,
            offset: coverRange(from, to),
          }),
        );
      };

      const seamDraw = () => ({
        opacity: [0, 1, 0],
        transform: ['scaleX(0)', 'scaleX(1)', 'scaleX(1)'],
      });

      const fadeOut = () => ({
        opacity: [1, 0],
        transform: ['translateY(0px)', 'translateY(-24px)'],
      });

      /* ---- Hero -> About ---- */
      const heroAbout = seam('hero-about');
      drive(
        find('.hero [data-parallax]'),
        heroAbout,
        { transform: ['translateY(0) scale(1.06)', 'translateY(50%) scale(1.06)'] },
        0,
        100,
      );
      drive(find('.hero-content'), heroAbout, { opacity: [1, 0] }, 0, 68);
      drive(find('.about-section > .transition-seam'), heroAbout, seamDraw(), 30, 78);

      /* ---- About -> Expertise ---- */
      const aboutExpertise = seam('about-expertise');
      drive(find('.about-intro-band'), aboutExpertise, fadeOut(), 10, 88);
      drive(find('.about-features-band'), aboutExpertise, fadeOut(), 10, 88);
      drive(find('.about-scroll'), aboutExpertise, fadeOut(), 0, 18);
      drive(find('.expertise-heading-band > .transition-seam'), aboutExpertise, seamDraw(), 4, 92);

      /* ---- Consulting -> HeatVision ---- */
      const consultingHeatVision = seam('consulting-heatvision');
      const mobile = window.matchMedia('(max-width: 868px)').matches;
      const heatVision = find('[data-transition-panel="heatvision"]');
      const consulting = find('[data-transition-panel="consulting"]');

      drive(
        heatVision?.querySelector<HTMLElement>('[data-transition-layer="copy"]'),
        consultingHeatVision,
        mobile
          ? {
              opacity: [0, 1],
              clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
              transform: ['translateY(20px)', 'translateY(0px)'],
            }
          : {
              opacity: [0, 1],
              clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
              transform: ['translateX(-48px)', 'translateX(0px)'],
            },
        mobile ? 30 : 6,
        mobile ? 74 : 49,
      );

      drive(
        heatVision?.querySelector<HTMLElement>('[data-transition-layer="stage"]'),
        consultingHeatVision,
        mobile
          ? {
              opacity: [0, 1],
              clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
              transform: ['translateY(20px)', 'translateY(0px)'],
            }
          : {
              opacity: [0.2, 1],
              clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
              transform: ['translateX(48px)', 'translateX(0px)'],
            },
        mobile ? 8 : 0,
        mobile ? 52 : 53,
      );

      drive(
        heatVision?.querySelector<HTMLElement>('.heatvision-transition-edge'),
        consultingHeatVision,
        seamDraw(),
        9,
        43,
      );

      if (!mobile) {
        drive(
          consulting?.querySelector<HTMLElement>('[data-transition-layer="media"]'),
          consultingHeatVision,
          {
            opacity: [1, 0.66],
            transform: ['translateY(0px) scale(1)', 'translateY(-12px) scale(.985)'],
          },
          0,
          56,
        );
        drive(
          consulting?.querySelector<HTMLElement>('[data-transition-layer="copy"]'),
          consultingHeatVision,
          { opacity: [1, 0.42], transform: ['translateY(0px)', 'translateY(-24px)'] },
          0,
          50,
        );
      }

      /* ---- HeatVision -> Partners ---- */
      drive(
        find('.partners-section > .transition-seam'),
        seam('heatvision-partners'),
        seamDraw(),
        4,
        40,
      );

      /* ---- Partners -> Footer ----
         The footer is a sibling of `main`, so there is no seam between them;
         it drives its own rule off its own box, mirroring --footer-panel. */
      const footer = find('.footer');
      const footerSeam = footer?.querySelector<HTMLElement>('.transition-seam');
      if (footer && footerSeam) {
        animated.add(footerSeam);
        stops.push(
          scroll(animate(footerSeam, seamDraw(), { ease: 'linear' }), {
            target: footer,
            offset: ['start 92%', 'start 52%'],
          }),
        );
      }
    });
  });

  return () => {
    cancelled = true;
    cancelLoad();
    stops.forEach((stop) => stop());
    animated.forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.clipPath = '';
      el.style.filter = '';
    });
  };
}

export function initMotion(): void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  let teardown: VoidFunction[] = [];

  const stop = () => {
    teardown.forEach((fn) => fn());
    teardown = [];
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.clipPath = '';
    });
  };
  const start = () => {
    teardown = [initReveals(), initTransitionStates(), initScrollFallback()].filter(
      (fn): fn is VoidFunction => Boolean(fn),
    );
  };

  if (!query.matches) start();
  query.addEventListener('change', (event) => {
    stop();
    if (!event.matches) start();
  });
}
