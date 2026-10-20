/**
 * Ported from digital-pedal-platform's `tools/repo.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Walk up from `from` to the nearest ancestor containing a .git entry.
 * Throws rather than guessing: callers resolve preset names and glob roots
 * against this, and a wrong root would silently search the wrong tree.
 */
export function repoRoot(from: string = process.cwd()): string {
  let dir = path.resolve(from);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`no .git directory found in any ancestor of ${from}`);
    }
    dir = parent;
  }
}
