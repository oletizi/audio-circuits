/**
 * Ported from digital-pedal-platform's `tools/kicad/footprint.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import { parse } from "./sexpr.ts";

/**
 * Sorted unique pad numbers declared by a .kicad_mod footprint.
 *
 * A pad with an empty number (`(pad "" np_thru_hole ...)`) has no
 * electrical designator — KiCad uses this for mechanical-only features
 * like a potentiometer's anti-rotation lug hole — and is excluded rather
 * than returned as a pad "numbered" the empty string. A pad missing the
 * number atom entirely is a malformed footprint and still throws.
 */
export function padNumbers(kicadModPath: string): string[] {
  const root = parse(fs.readFileSync(kicadModPath, "utf8"));
  const numbers = new Set<string>();
  for (const child of root.lists) {
    if (child.head !== "pad") continue;
    const number = child.atoms[1]?.value;
    if (number === undefined) {
      throw new Error(`${kicadModPath}: pad without a number`);
    }
    if (number === "") continue;
    numbers.add(number);
  }
  return [...numbers].sort();
}
