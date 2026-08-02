# ofektaiwan.com

The Ofek marketing site: one static page, built with [Astro](https://astro.build) and deployed
to GitHub Pages at **https://www.ofektaiwan.com**.

The repository holds source only. `dist/` is a build artifact and is gitignored — GitHub Actions
builds it on every push to `main`.

## Commands

Node 24 (see `.nvmrc`; anything ≥ 22.12 works).

| | |
|---|---|
| `npm install` | once, after cloning |
| `npm run dev` | dev server on http://localhost:4321, hot reloads |
| `npm run build` | type-check, then build to `dist/` |
| `npm run preview` | serve the built `dist/` as it will be served in production |
| `npm run check` | type-check only |
| `npm run visual-diff` | screenshot `dist/` at 8 widths, and fail on horizontal overflow, console errors or 404s |

`npm run build` runs `astro check` first, so a type error fails the build rather than shipping.

## Where things are

```
src/
├── pages/index.astro        the page — just composes the six sections
├── layouts/Layout.astro     <head>: SEO, Open Graph, JSON-LD, fonts, script entry
├── components/              Nav, Hero, About, Expertise, Partners, Footer
├── data/site.ts             site metadata, nav links, addresses, email
├── styles/
│   ├── tokens.css           design tokens — colour, type, space, shape, motion
│   ├── reset.css
│   └── global.css           every component style, in @layer order
├── scripts/
│   ├── main.ts              entry; calls the two below
│   ├── nav.ts               scrolled state, mobile menu, focus trap
│   └── motion.ts            scroll reveals, parallax fallback, magnetic buttons
├── assets/images/           optimised at build time by Astro
└── icons/                   inlined as SVG components
public/                      copied byte-for-byte, never optimised (CNAME, favicon, robots.txt)
```

### Editing copy

Almost all text is written directly in the component that renders it —
`src/components/About.astro` for the About paragraph and the three feature cards,
`Expertise.astro` for the two diagonal cards, `Hero.astro` for the headline. Edit it in place.

Two exceptions:

- **`src/data/site.ts`** holds anything used in more than one spot or in `<head>`: the page title
  and meta description, the email address, the LinkedIn URL, the nav links, and both office
  addresses.
- **The hero headline** in `Hero.astro` is a plain string (`const headline = '…'`) that the
  template splits into words for the reveal animation. Edit the string; the animation adapts to
  however many words it ends up with.

### Design tokens

`src/styles/tokens.css` is the single source of truth for colour, type scale, spacing, shape and
motion. Components consume the semantic aliases (`--color-accent`, `--step-3`, `--section-y`),
never raw values — so retuning the brand means editing that one file.

The motion tokens are a deliberate five-rung system (hover / chrome / secondary entrance /
entrance / ambient), documented in a table at the top of the `--- Motion ---` block. Nothing on
the site declares a raw duration; if you add an animation, put it on one of those rungs.

`prefers-reduced-motion: reduce` collapses every duration token to `1ms` from one place at the
bottom of the same file, which neutralises the whole site at once. The one exception is noted
inline: a looping animation needs an explicit `animation: none`, because collapsing an
`infinite` animation's duration makes it cycle every frame rather than stop.

### Motion

Components opt in with data attributes, so the markup stays readable:
`data-reveal`, `data-reveal-group`, `data-parallax`, `data-magnetic`. `src/scripts/motion.ts`
documents each one and explains why each effect is implemented the way it is.

Two things worth knowing before changing anything there:

- **The hero headline reveal is pure CSS on purpose.** It is the page's first text paint, and
  routing it through a JS chunk would delay the Largest Contentful Paint by however long that
  chunk takes to arrive.
- **The hero parallax is CSS where the browser supports scroll-driven animations** and lazily
  falls back to Motion only where it doesn't (Firefox, at time of writing). Importing Motion's
  `scroll()` eagerly for everyone measurably cost LCP.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. It only takes effect
once the Pages source is set to **GitHub Actions** — see `DEPLOY.md` for the one-time cutover
checklist and the rollback path.

`public/CNAME` must keep containing `www.ofektaiwan.com`. An Actions deploy replaces the entire
published tree, so if that file goes missing the custom domain breaks.
