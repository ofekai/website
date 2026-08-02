/**
 * Nav behaviour — ported from the pre-Astro static site's script.js.
 *
 * The scrolled state and page progress share one requestAnimationFrame update.
 * Section observers maintain the active link without a scroll-position loop.
 * The mobile overlay owns an explicit open state, body scroll lock, Escape
 * handling, focus return and a focus loop through the toggle and menu links.
 */
export function initNav(): void {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (!navbar || !menuToggle || !navLinks) return;

  const isOpen = () => navLinks.classList.contains('active');

  const setOpen = (open: boolean) => {
    navLinks.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close Menu' : 'Open Menu');
    document.body.classList.toggle('nav-open', open);
  };

  const closeMenu = () => setOpen(false);

  menuToggle.addEventListener('click', () => setOpen(!isOpen()));
  menuToggle.addEventListener('keydown', (event) => {
    if (!isOpen() || event.key !== 'Tab' || event.shiftKey) return;
    const firstLink = navLinks.querySelector<HTMLElement>('a');
    if (!firstLink) return;
    event.preventDefault();
    firstLink.focus();
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      closeMenu();
      menuToggle.focus();
      return;
    }

    if (event.key !== 'Tab') return;

    const links = Array.from(navLinks.querySelectorAll<HTMLElement>('a'));
    const focusable = [menuToggle, ...links];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (!event.shiftKey && activeIndex <= 0 && links[0]) {
      event.preventDefault();
      links[0].focus();
    } else if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const linkById = new Map<string, HTMLAnchorElement>();
  navLinks.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    const id = link.hash.slice(1);
    if (id) linkById.set(id, link);
  });

  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section][id]')).filter(
    (section) => linkById.has(section.id),
  );
  const visible = new Map<Element, IntersectionObserverEntry>();
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target, entry);
        else visible.delete(entry.target);
      });
      const active = Array.from(visible.values()).sort(
        (a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top),
      )[0]?.target as HTMLElement | undefined;
      linkById.forEach((link, id) => {
        const isActive = id === active?.id;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-30% 0px -55%', threshold: 0 },
  );
  sections.forEach((section) => sectionObserver.observe(section));

  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    navbar.classList.toggle('nav-scrolled', window.scrollY > 50);
    if (!progress) return;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const value = available > 0 ? Math.min(Math.max(window.scrollY / available, 0), 1) : 0;
    progress.style.transform = `scaleX(${value})`;
  };
  const requestProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress, { passive: true });
  updateProgress();

  window.addEventListener('resize', () => {
    if (window.innerWidth > 868 && isOpen()) closeMenu();
  }, { passive: true });
}
