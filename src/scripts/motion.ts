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

function initScrollFallback(): VoidFunction | undefined {
  if (CSS.supports('animation-timeline', 'view()')) return undefined;
  const hero = document.querySelector<HTMLElement>('.hero');
  const image = hero?.querySelector<HTMLElement>('[data-parallax]');
  const content = hero?.querySelector<HTMLElement>('.hero-content');

  const stops: VoidFunction[] = [];
  const animated = new Set<HTMLElement>();
  let cancelled = false;
  const cancelLoad = afterLoad(() => {
    void import('motion').then(({ scroll }) => {
      if (cancelled) return;

      if (hero && image && content) {
        animated.add(image);
        animated.add(content);
        stops.push(
          scroll(
            animate(
              image,
              { transform: ['translateY(0) scale(1.06)', 'translateY(50%) scale(1.06)'] },
              { ease: 'linear' },
            ),
            { target: hero, offset: ['start start', 'end start'] },
          ),
          scroll(
            animate(content, { opacity: [1, 0] }, { ease: 'linear' }),
            { target: hero, offset: ['start start', '0.68 start'] },
          ),
        );
      }

      const sceneSelectors = [
        '[data-transition="hero-about"]',
        '[data-transition="heatvision-partners"]',
        '[data-transition="partners-footer"]',
      ] as const;

      sceneSelectors.forEach((selector) => {
        const panel = document.querySelector<HTMLElement>(selector);
        if (!panel) return;
        const seam = panel.querySelector<HTMLElement>('.transition-seam');
        animated.add(panel);
        stops.push(
          scroll(
            animate(
              panel,
              { opacity: [0.94, 1], clipPath: ['inset(0 0 8% 0)', 'inset(0 0 0 0)'] },
              { ease: 'linear' },
            ),
            { target: panel, offset: ['start end', 'start 64%'] },
          ),
        );
        if (seam) {
          animated.add(seam);
          stops.push(
            scroll(
              animate(
                seam,
                { opacity: [0, 1, 0], transform: ['scaleX(0)', 'scaleX(1)', 'scaleX(1)'] },
                { ease: 'linear' },
              ),
              { target: panel, offset: ['start 92%', 'start 52%'] },
            ),
          );
        }
      });

      const heading = document.querySelector<HTMLElement>('[data-transition-heading]');
      const headingSeam = heading?.querySelector<HTMLElement>('.transition-seam');
      const features = document.querySelector<HTMLElement>('[data-transition-features] .feature-grid');
      if (heading && headingSeam) {
        animated.add(headingSeam);
        stops.push(
          scroll(
            animate(
              headingSeam,
              { opacity: [0, 1, 0], transform: ['scaleX(0)', 'scaleX(1)', 'scaleX(1)'] },
              { ease: 'linear' },
            ),
            { target: heading, offset: ['start end', 'start 62%'] },
          ),
        );
      }
      if (heading && features) {
        animated.add(features);
        stops.push(
          scroll(
            animate(
              features,
              { opacity: [1, 0.62], transform: ['translateY(0px)', 'translateY(-24px)'] },
              { ease: 'linear' },
            ),
            { target: heading, offset: ['start end', 'start 64%'] },
          ),
        );
      }

      const heatVision = document.querySelector<HTMLElement>('[data-transition-panel="heatvision"]');
      const heatCopy = heatVision?.querySelector<HTMLElement>('[data-transition-layer="copy"]');
      const heatStage = heatVision?.querySelector<HTMLElement>('[data-transition-layer="stage"]');
      const heatEdge = heatVision?.querySelector<HTMLElement>('.heatvision-transition-edge');
      const consulting = document.querySelector<HTMLElement>('[data-transition-panel="consulting"]');
      const consultingMedia = consulting?.querySelector<HTMLElement>('[data-transition-layer="media"]');
      const consultingCopy = consulting?.querySelector<HTMLElement>('[data-transition-layer="copy"]');

      if (heatVision) {
        const mobile = window.matchMedia('(max-width: 868px)').matches;

        if (heatCopy) {
          animated.add(heatCopy);
          stops.push(
            scroll(
              animate(
                heatCopy,
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
                { ease: 'linear' },
              ),
              { target: heatVision, offset: ['start end', 'start 30%'] },
            ),
          );
        }

        if (heatStage) {
          animated.add(heatStage);
          stops.push(
            scroll(
              animate(
                heatStage,
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
                { ease: 'linear' },
              ),
              { target: heatVision, offset: ['start end', 'start 30%'] },
            ),
          );
        }

        if (heatEdge) {
          animated.add(heatEdge);
          stops.push(
            scroll(
              animate(
                heatEdge,
                { opacity: [0, 1, 0], transform: ['scaleX(0)', 'scaleX(1)', 'scaleX(1)'] },
                { ease: 'linear' },
              ),
              { target: heatVision, offset: ['start 90%', 'start 36%'] },
            ),
          );
        }

        if (!mobile && consultingMedia && consultingCopy) {
          animated.add(consultingMedia);
          animated.add(consultingCopy);
          stops.push(
            scroll(
              animate(
                consultingMedia,
                { opacity: [1, 0.66], transform: ['translateY(0px) scale(1)', 'translateY(-12px) scale(.985)'] },
                { ease: 'linear' },
              ),
              { target: heatVision, offset: ['start 88%', 'start 28%'] },
            ),
            scroll(
              animate(
                consultingCopy,
                { opacity: [1, 0.42], transform: ['translateY(0px)', 'translateY(-24px)'] },
                { ease: 'linear' },
              ),
              { target: heatVision, offset: ['start 88%', 'start 34%'] },
            ),
          );
        }
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
