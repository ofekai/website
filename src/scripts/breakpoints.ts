/**
 * The single mobile breakpoint for client scripts. global.css repeats it as
 * `max-width: 868px` / `min-width: 869px` (custom properties can't be used in
 * media queries), so keep the two in sync.
 */
export const MOBILE_MAX_WIDTH = 868;
export const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

export const isMobileViewport = (): boolean => window.matchMedia(MOBILE_QUERY).matches;
