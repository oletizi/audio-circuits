/**
 * Ported from digital-pedal-platform's `tools/schgen/render/project.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { assertAllowed, type KeyedErcExclusion } from "./erc-exclusions.ts";
import { int, list, print, str } from "./sexpr-write.ts";

/**
 * Schematic Setup > Formatting > intersheet references: every global label shows the pages its net
 * is labelled on, own page included (so the text is the same on every page and pageRefs.ts can
 * reserve its room at layout time), as a full list "[2,4]".
 */
export const INTERSHEET_REFS = {
  intersheets_ref_show: true,
  intersheets_ref_own_page: true,
  intersheets_ref_short: false,
  intersheets_ref_prefix: "[",
  intersheets_ref_suffix: "]",
} as const;

/**
 * The minimal .kicad_pro: the recorded ERC exclusions as KiCad's [key, comment] pairs, each comment
 * its reason, in declaration order (ALL-07: an error-level one needs the owner's sign-off), the
 * meta block, and the intersheet-reference settings.
 */
export function projectFile(project: string, exclusions: readonly KeyedErcExclusion[]): string {
  for (const { exclusion } of exclusions) assertAllowed(exclusion);
  const doc = {
    erc: { erc_exclusions: exclusions.map(({ key, exclusion }) => [key, exclusion.reason]) },
    meta: { filename: `${project}.kicad_pro`, version: 3 },
    schematic: { drawing: INTERSHEET_REFS },
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

const KIPRJMOD = "${KIPRJMOD}/";

/** sym-lib-table / fp-lib-table; uris must already be ${KIPRJMOD}-relative. Entries sorted by nickname. */
export function libTable(kind: "sym" | "fp", libs: Readonly<Record<string, string>>): string {
  const names = Object.keys(libs).sort();
  const entries = names.map((name) => {
    const uri = libs[name];
    if (uri === undefined || !uri.startsWith(KIPRJMOD)) {
      throw new Error(`library ${name}: uri "${uri ?? ""}" must start with ${KIPRJMOD} so the project is relocatable`);
    }
    return list("lib", list("name", str(name)), list("type", str("KiCad")), list("uri", str(uri)), list("options", str("")), list("descr", str("")));
  });
  return `${print(list(`${kind}_lib_table`, list("version", int(7)), entries))}\n`;
}
