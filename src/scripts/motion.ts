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
      { threshold: 0.18 },
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
  const image = hero?.querySelector<HTMLElement>('img[data-parallax]');
  const content = hero?.querySelector<HTMLElement>('.hero-content');
  if (!hero || !image || !content) return undefined;

  let stopImage: VoidFunction | undefined;
  let stopContent: VoidFunction | undefined;
  let cancelled = false;
  const cancelLoad = afterLoad(() => {
    void import('motion').then(({ scroll }) => {
      if (cancelled) return;
      stopImage = scroll(
        animate(image, { transform: ['translateY(0) scale(1.06)', 'translateY(10%) scale(1.1)'] }, { ease: 'linear' }),
        { target: hero, offset: ['start start', 'end start'] },
      );
      stopContent = scroll(
        animate(content, { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-40px)'] }, { ease: 'linear' }),
        { target: hero, offset: ['start start', '0.72 start'] },
      );
    });
  });

  return () => {
    cancelled = true;
    cancelLoad();
    stopImage?.();
    stopContent?.();
    image.style.transform = '';
    content.style.opacity = '';
    content.style.transform = '';
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
    teardown = [initReveals(), initScrollFallback()].filter((fn): fn is VoidFunction => Boolean(fn));
  };

  if (!query.matches) start();
  query.addEventListener('change', (event) => {
    stop();
    if (!event.matches) start();
  });
}
