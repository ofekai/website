/**
 * Nav behaviour — ported from the pre-Astro static site's script.js.
 *
 * The scrolled state, page progress and active link share one
 * requestAnimationFrame update. The mobile overlay owns an explicit open
 * state, body scroll lock, Escape handling, focus return and a focus loop
 * through the toggle and menu links.
 *
 * Everything positional here works from cached LAYOUT positions. Page-level
 * scenes are sticky (see the scene stack in global.css), and a pinned section
 * reports its shifted position through both getBoundingClientRect AND
 * offsetTop — measured: .about-section reports 900 at rest and 2068 while
 * pinned. That breaks a rect-based scroll spy (a pinned section never stops
 * being "current") and breaks backward anchor navigation outright: the
 * browser scrolls an element into view from its current box, so clicking a
 * link to an already-pinned section scrolls nowhere. Both are therefore
 * derived from the same cached number — the scroll position at which a
 * section parks under the nav — measured with the stack momentarily off.
 */
export function initNav(): void {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
  const languageSwitcher = navLinks?.querySelector<HTMLDetailsElement>('[data-language-switcher]');
  if (!navbar || !menuToggle || !navLinks) return;

  const isOpen = () => navLinks.classList.contains('active');
  const closeLanguageSwitcher = () => {
    if (languageSwitcher) languageSwitcher.open = false;
  };
  const focusableMenuItems = () =>
    Array.from(navLinks.querySelectorAll<HTMLElement>('a[href], summary')).filter(
      (element) => !element.closest('details:not([open])') || element.matches('summary'),
    );

  const setOpen = (open: boolean) => {
    navLinks.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute(
      'aria-label',
      open ? menuToggle.dataset.labelClose ?? 'Close Menu' : menuToggle.dataset.labelOpen ?? 'Open Menu',
    );
    document.body.classList.toggle('nav-open', open);
    if (!open) closeLanguageSwitcher();
  };

  const closeMenu = () => setOpen(false);

  menuToggle.addEventListener('click', () => setOpen(!isOpen()));
  menuToggle.addEventListener('keydown', (event) => {
    if (!isOpen() || event.key !== 'Tab' || event.shiftKey) return;
    const firstLink = focusableMenuItems()[0];
    if (!firstLink) return;
    event.preventDefault();
    firstLink.focus();
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  navLinks.querySelectorAll<HTMLAnchorElement>('[data-locale-link]').forEach((link) => {
    link.addEventListener('click', () => {
      /* Cached layout positions, not client rects: a pinned section's rect
         straddles the nav line for the rest of the page and would always win
         here, so every locale switch would land on #about. */
      const currentSection = sections
        .filter((section) => scrollTargetFor(section) <= window.scrollY + 1)
        .at(-1);

      if (currentSection) {
        const target = new URL(link.href);
        target.hash = currentSection.id;
        link.href = target.href;
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (languageSwitcher?.open && !languageSwitcher.contains(event.target as Node)) {
      closeLanguageSwitcher();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && languageSwitcher?.open) {
      closeLanguageSwitcher();
      languageSwitcher.querySelector<HTMLElement>('summary')?.focus();
      return;
    }

    if (!isOpen()) return;

    if (event.key === 'Escape') {
      closeMenu();
      menuToggle.focus();
      return;
    }

    if (event.key !== 'Tab') return;

    const links = focusableMenuItems();
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

  /*
   * One synchronous pass with the scene stack switched off, so every position
   * is the true layout position rather than a pinned one. Cheap enough to
   * redo on resize, and it must be redone then because every offset is
   * viewport-relative.
   */
  const scrollTargets = new Map<string, number>();
  const measureLayout = () => {
    const root = document.documentElement;
    root.classList.add('is-measuring-layout');
    const scrolled = window.scrollY;
    const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    sections.forEach((section) => {
      const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
      const top = section.getBoundingClientRect().top + scrolled;
      scrollTargets.set(section.id, Math.max(0, top - padding - margin));
    });
    root.classList.remove('is-measuring-layout');
  };
  const scrollTargetFor = (el: HTMLElement) => scrollTargets.get(el.id) ?? 0;
  measureLayout();

  /*
   * Anchors are driven manually for the reason in the file header: the native
   * behaviour is a no-op once the target section is pinned. Routing them
   * through scrollTargetFor() also makes "where the link goes" and "when the
   * link highlights" the same number by construction.
   */
  const scrollToId = (id: string, behavior: ScrollBehavior) => {
    const target = sections.find((section) => section.id === id);
    if (!target) return false;
    window.scrollTo({ top: scrollTargetFor(target), behavior });
    return true;
  };

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.hash.slice(1);
      if (!id || event.defaultPrevented) return;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!scrollToId(id, smooth ? 'smooth' : 'auto')) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
    });
  });

  window.addEventListener('hashchange', () => {
    const id = window.location.hash.slice(1);
    if (id) scrollToId(id, 'auto');
  });

  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    navbar.classList.toggle('nav-scrolled', window.scrollY > 50);

    /* The last section whose parked position we have reached. */
    let active: HTMLElement | undefined;
    sections.forEach((section) => {
      if (scrollTargetFor(section) <= window.scrollY + 1) active = section;
    });
    linkById.forEach((link, id) => {
      const isActive = id === active?.id;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    if (!progress) return;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const value = available > 0 ? Math.min(Math.max(window.scrollY / available, 0), 1) : 0;
    progress.style.transform = `scaleX(${value})`;
  };
  const requestProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', requestProgress, { passive: true });
  updateProgress();

  window.addEventListener('resize', () => {
    measureLayout();
    requestProgress();
    if (window.innerWidth > 868 && isOpen()) closeMenu();
  }, { passive: true });
}
