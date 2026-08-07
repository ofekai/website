#!/usr/bin/env node
/*
 * Guards against a silent, build-only failure mode.
 *
 * Lightning CSS merges an `animation:` shorthand back together with a sibling
 * `animation-timeline` longhand, emitting e.g.
 *
 *   animation: linear both transition-scene-enter --about-panel
 *
 * `animation-timeline` was removed from the `animation` shorthand by the
 * CSSWG, so the two idents land in one <keyframes-name> slot, the declaration
 * is invalid, and the browser drops it -- animation-name computes to `none`.
 * Source stays valid, the build succeeds, nothing warns, and every
 * scroll-driven animation silently stops existing.
 *
 * The fix is to author animation longhands only in any rule that sets
 * `animation-timeline`. This check fails the build if that slips.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(SCRIPT_DIR, '..', 'dist');

/* A dashed-ident inside the `animation` shorthand is always the merge bug:
   no valid shorthand component uses that syntax except a var() reference,
   which is excluded by requiring whitespace rather than `(` before it. */
const MERGED_TIMELINE = /animation:[^;}]*\s(--[A-Za-z][\w-]*)/g;

const cssFiles = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith('.css')) {
      found.push(path.join(entry.parentPath ?? entry.path, entry.name));
    }
  }
  return found;
};

const problems = [];
const files = await cssFiles(DIST_DIR);

for (const file of files) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(MERGED_TIMELINE)) {
    problems.push(`${path.relative(DIST_DIR, file)}: ${match[0].trim()}`);
  }
}

if (problems.length > 0) {
  console.error(
    `check-css: ${problems.length} animation timeline(s) merged into the shorthand and destroyed.\n` +
      'Use animation longhands (animation-name/-duration/-timing-function/-fill-mode)\n' +
      'in any rule that also sets animation-timeline.\n',
  );
  problems.forEach((problem) => console.error(`  ${problem}`));
  process.exit(1);
}

console.log(`check-css: ${files.length} file(s) clean.`);
