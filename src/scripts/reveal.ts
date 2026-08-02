/**
 * Scroll reveal — replaces AOS 2.3.4 (previously loaded from unpkg with no SRI).
 *
 * Opt in with `data-reveal="up|down|left|right"` and an optional
 * `data-reveal-delay="<ms>"`. Initial states live in CSS, gated on `html.js`
 * so the page is fully visible when JS is off or the chunk fails to load.
 *
 * Phase 5 swaps the observer body for Motion while keeping these attributes.
 */
const REVEALED = 'is-revealed';

export function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!targets.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add(REVEALED));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEALED);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -5% 0px' },
  );

  targets.forEach((el) => observer.observe(el));
}
