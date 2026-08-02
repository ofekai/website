/**
 * Nav behaviour — ported from _legacy/js/script.js.
 *
 * Phase 1 kept the observable behaviour identical (scrolled state past ~50px,
 * hamburger toggle, close on link click) but replaced the unthrottled
 * per-frame `scroll` listener with a sentinel-based IntersectionObserver.
 *
 * Phase 2 adds the accessibility layer the toggle was missing: `aria-expanded`
 * tracks open state, Escape closes the menu and returns focus to the toggle
 * button, and Tab/Shift+Tab cycle within the open menu's links instead of
 * escaping into the page behind it.
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

  const isOpen = () => navLinks.classList.contains('active');

  const setOpen = (open: boolean) => {
    navLinks.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  };

  const closeMenu = () => setOpen(false);

  menuToggle.addEventListener('click', () => setOpen(!isOpen()));

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  navLinks.addEventListener('keydown', (event) => {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      closeMenu();
      menuToggle.focus();
      return;
    }

    if (event.key !== 'Tab') return;

    const links = navLinks.querySelectorAll<HTMLElement>('a');
    if (!links.length) return;
    const first = links[0];
    const last = links[links.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
