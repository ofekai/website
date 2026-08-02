/**
 * Nav behaviour — ported from _legacy/js/script.js.
 *
 * Phase 1 keeps the observable behaviour identical (scrolled state past ~50px,
 * hamburger toggle, close on link click) but replaces the unthrottled
 * per-frame `scroll` listener with a sentinel-based IntersectionObserver.
 */
export function initNav(): void {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (!navbar || !menuToggle || !navLinks) return;

  // Scrolled state: a 1px sentinel at the top of the document leaving the
  // viewport is equivalent to the old `scrollY > 50` check, minus the
  // scroll handler that fired on every frame.
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText =
    'position:absolute;top:50px;left:0;width:1px;height:1px;pointer-events:none;';
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => navbar.classList.toggle('nav-scrolled', !entry.isIntersecting),
    { threshold: 0 },
  ).observe(sentinel);

  const closeMenu = () => navLinks.classList.remove('active');

  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}
