/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validateParts.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { Rule } from "./validate-rule.ts";

const BOM_KEYS = ["Manufacturer", "MPN", "Supplier", "SupplierPart"] as const;
const BOM_EXEMPT_PREFIXES: readonly string[] = ["TP", "H", "FID"];

export const bomFields: Rule = (c) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    if (BOM_EXEMPT_PREFIXES.includes(p.refPrefix)) continue;
    for (const k of BOM_KEYS) if (p.bom[k].trim() === "") out.push(`part ${p.label}: BOM field ${k} is empty`);
  }
  return out;
};

/** A name that stays in the directory it is joined to: no separator of either platform, no "..". */
export function isPlainFileName(name: string): boolean {
  return name !== "" && !name.includes("/") && !name.includes("\\") && !name.includes("..");
}

export const sheetFiles: Rule = (c) => {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const s of c.sheets) {
    if (!s.file.endsWith(".kicad_sch")) out.push(`sheet ${s.id}: file "${s.file}" must end in .kicad_sch`);
    if (!isPlainFileName(s.file)) {
      out.push(`sheet ${s.id}: file "${s.file}" must be a plain file name in the output directory (no path separator or "..")`);
    }
    const prior = seen.get(s.file);
    if (prior !== undefined) out.push(`sheets ${prior} and ${s.id} share file ${s.file}`);
    else seen.set(s.file, s.id);
  }
  return out;
};

export const mechanicalPads: Rule = (c, symbols) => {
  const out: string[] = [];
  for (const p of c.parts.values()) {
    const symPins = new Set(symbols.resolve(p.libId).pins.map((lp) => lp.number));
    const seen = new Set<string>();
    for (const m of p.mechanicalPads) {
      if (symPins.has(m.pad)) out.push(`part ${p.label}: mechanical pad ${m.pad} is also a symbol pin`);
      if (seen.has(m.pad)) out.push(`part ${p.label}: mechanical pad ${m.pad} listed twice`);
      // No schematic construct carries a net on a footprint pad that has no symbol pin.
      if ("net" in m.connection) {
        out.push(
          `part ${p.label}: mechanical pad ${m.pad} is declared on net ${m.connection.net}, but the schematic cannot carry a net on a pad ` +
            "without a symbol pin; use a symbol pin or declare the pad NC",
        );
      }
      seen.add(m.pad);
    }
  }
  return out;
};
