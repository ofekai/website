import { initNav } from './nav';
import { initMotion } from './motion';

// Pairs with the fallback timer in Layout.astro; re-adding `js` covers a
// module that only arrived after that timer gave up on it.
document.documentElement.classList.add('js', 'js-ready');

initNav();
initMotion();
