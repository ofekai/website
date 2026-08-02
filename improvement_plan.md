# Content-Independent Website Upgrade

Living checklist for Ofek's visual and interaction system. Existing copy, URLs, partner logos,
contact details, and information architecture remain unchanged. Content work stays on a separate
track.

## Current direction

The previous technical-grid direction is superseded. The design now combines:

- Haswell-inspired Lato/Open Sans typography, a centered cinematic hero, restrained motion, and
  full-width hard-edged content bands.
- Insee-inspired image presentation: crisp crops, square edges, dark mattes, consistent ratios,
  monochrome-first treatment, and directional mask reveals.
- Ofek's existing teal as an accent, not a decorative lighting or grid effect.

## Foundation

- [x] Remove all visible grid backgrounds, telemetry paths/nodes, pointer spotlights, glows,
      diagonal seams, magnetic buttons, and card tilt effects.
- [x] Self-host Haswell's font pairing through Astro: Lato `300/400/700` and Open Sans
      `300/400/700`.
- [x] Use Lato for hero/display typography and Open Sans for body copy, navigation, and controls.
- [x] Retain the internal 12-column CSS layout without rendering decorative grid lines.
- [x] Preserve Ofek teal for icons, interaction states, and the HeatVision wordmark.

## Page composition

- [x] Recompose the hero as a full-viewport monochrome photograph with centered, split-weight
      headline typography and a thin outline CTA.
- [x] Add finite load motion, restrained image depth on scroll, content fade on exit, and a fully
      static reduced-motion state.
- [x] Hide the desktop logo over the opening hero and reveal it in the compact white scrolled nav;
      keep a visible logo on mobile.
- [x] Rebuild About as a white editorial intro band followed by a pale-grey three-column feature
      band with rules instead of cards.
- [x] Rebuild Expertise as alternating full-width image/content bands: a light Consulting stripe
      and reversed dark HeatVision stripe.
- [x] Keep Partners as a compact technical logo rail with consistent optical sizing and
      grayscale-to-brand interaction.
- [x] Keep the footer as a clean charcoal closing stripe with the existing information and mailto
      flow.

## Image system

- [x] Add reusable `EditorialMedia.astro` for every current and future editorial image.
- [x] Support `landscape`, `portrait`, `square`, and `auto` ratios; configurable crop position;
      `mono` or `natural` tone; and `left`, `right`, `up`, or disabled reveals.
- [x] Generate responsive AVIF/WebP sources with a fallback through Astro's static image pipeline.
- [x] Default to sharp square crops, near-black mattes, grayscale with restrained contrast, and a
      `1.03 → 1` reveal scale.
- [x] Exclude shadows, blur, grain, glow, decorative gradients, rounded frames, and image upscaling.
- [ ] When a gallery is added, use the same component with 8–12px gutters and explicit aspect
      ratios rather than adding one-off image CSS.

## Navigation, motion, and accessibility

- [x] Preserve active-section highlighting, a neutral 1px reading-progress indicator, compact
      scrolled state, mobile scroll lock, Escape handling, focus return, and focus trapping.
- [x] Retain grouped `rise`, `mask`, and `line` entrance reveals; remove the obsolete diagonal
      reveal and pointer-effect interfaces.
- [x] Use native CSS scroll timelines for hero depth where supported and lazy-load the existing
      Motion fallback only where required.
- [x] Make the no-JavaScript page fully visible and functional.
- [x] Under reduced motion, render all elements in their final state and remove parallax, mask
      drawing, load choreography, and ambient loops.
- [ ] Keep View Transitions deferred until additional content pages exist.

## Hosting and performance guardrails

- [x] Preserve static Astro output, GitHub Actions/Pages hosting, custom-domain behavior, and the
      current CNAME.
- [x] Preserve no-backend operation and the existing mailto contact flow.
- [x] Keep initial JavaScript below 18 KB gzip, deferred animation JavaScript below 30 KB gzip,
      CSS below 15 KB gzip, and fonts below 100 KB transfer.
- [x] Keep animation to opacity, transform, and clip-path; do not add Canvas or WebGL.

## Verification snapshot — 2026-08-02

- Build: 0 errors, 0 warnings, 0 hints.
- Responsive render: 1440, 1200, 1100, 1000, 900, 868, 768, and 425px.
- Responsive result: zero horizontal overflow, console errors, or failed requests.
- No-JavaScript result: hero, About, Expertise, Partners, and footer remain laid out.
- Bundles: 4.5 KB CSS gzip, 5.3 KB initial JS gzip, 6.1 KB deferred fallback JS gzip,
  92 KB fonts transferred.
- [ ] Complete a final manual Safari check on a real Apple device before deployment.

## Deferred content track

- Product screenshots and demonstrations
- Metrics and case studies
- Testimonials and rewritten messaging
- New HeatVision, Consulting, and Resources pages
