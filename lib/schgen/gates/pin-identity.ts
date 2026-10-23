/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/pinIdentity.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { padNumbers } from "../../kicad/footprint.ts";
import { resolveFootprintIn, resolveFootprintInGlobal, type GlobalTable } from "../../kicad/libtable.ts";
import type { PinTable } from "./pin-table.ts";
import { comparePinNumbers } from "../ir/order.ts";
import type { Circuit, IrPart, MechanicalConnection } from "../ir/types.ts";
import type { LibPin, SymbolResolver } from "../render/library.ts";

/**
 * Gate 6, pin identity: datasheet table = symbol = circuit identity = footprint
 * pads. Every comparison is exact string equality; aliases are declared in the
 * pin table and matched exactly. Nothing is case-folded, normalised or fuzzed.
 */

export type PadLookup = (footprint: string) => readonly string[];

/**
 * Stock symbol libraries whose symbols are generic (no part-specific pinout), so
 * placing any MPN on them is not an MPN override. The spec ("Pin tables": a
 * table is required for every custom symbol and for every stock symbol whose
 * MPN is overridden) targets part-specific symbols such as the SDRAM and OPA1688.
 */
export const GENERIC_SYMBOL_LIBRARIES: ReadonlySet<string> = new Set([
  "Device",
  "power",
  "Connector",
  "Connector_Generic",
  "Connector_Audio",
  "Switch",
  "Jumper",
  "Mechanical",
]);

/**
 * Pad numbers of a footprint, resolved through the project's fp-lib-table and then `global`
 * (kicadConfig.stockFootprintTable: the install's default table), never the user's KiCad profile.
 */
export function footprintPads(projectDir: string, global: GlobalTable): PadLookup {
  return (fp) => padNumbers(resolveFootprintIn(fp, projectDir, global));
}

/**
 * Pad numbers resolved from a design's own footprint libraries (`footprintLibs`, each path
 * relative to `designDir`, exactly as the generated fp-lib-table will register them), then
 * `global`. Needs no generated project files, so gate 6 can run on a design not yet generated.
 */
export function designFootprintPads(libs: Readonly<Record<string, string>>, designDir: string, global: GlobalTable): PadLookup {
  return (fp) => {
    const sep = fp.indexOf(":");
    const nick = sep < 0 ? "" : fp.slice(0, sep);
    const lib = Object.hasOwn(libs, nick) ? libs[nick] : undefined;
    if (lib === undefined) return padNumbers(resolveFootprintInGlobal(fp, global));
    const libDir = path.resolve(designDir, lib);
    if (!fs.existsSync(libDir)) throw new Error(`design library "${nick}" (${libDir}) does not exist`);
    const name = fp.slice(sep + 1);
    const file = path.join(libDir, `${name}.kicad_mod`);
    if (!fs.existsSync(file)) throw new Error(`footprint "${name}" not found in design library "${nick}" (${file})`);
    return padNumbers(file);
  };
}

const sortPins = (xs: Iterable<string>) => [...xs].sort(comparePinNumbers);

/** Own-property lookup: a key such as "constructor" never resolves through Object.prototype. */
function own<T>(r: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(r, key) ? r[key] : undefined;
}

function describeConnection(m: MechanicalConnection | undefined): string {
  if (m === undefined) return "absent";
  return "net" in m ? `net ${m.net}` : "not connected";
}

/**
 * The symbol's pins, one per pin number (first occurrence), in pin-number order.
 * A number listed again under a different name is itself a problem.
 */
function uniquePins(part: IrPart, pins: readonly LibPin[], out: string[]): LibPin[] {
  const byNumber = new Map<string, LibPin[]>();
  for (const p of pins) {
    const seen = byNumber.get(p.number);
    if (seen === undefined) byNumber.set(p.number, [p]);
    else seen.push(p);
  }
  const unique: LibPin[] = [];
  for (const [n, group] of [...byNumber.entries()].sort((a, b) => comparePinNumbers(a[0], b[0]))) {
    const names = [...new Set(group.map((p) => p.name))];
    if (names.length > 1) {
      out.push(`part ${part.label}: symbol ${part.libId} lists pin ${n} more than once with different names ${names.map((x) => `"${x}"`).join(", ")}`);
    }
    const [first] = group;
    if (first !== undefined) unique.push(first);
  }
  return unique;
}

function irPin(c: Circuit, part: IrPart, pin: string) {
  return c.pins.find((p) => p.part === part.label && p.pin === pin);
}

function tableProblems(part: IrPart, c: Circuit, pins: readonly LibPin[], t: PinTable): string[] {
  const out: string[] = [];
  if (t.symbol !== part.libId) out.push(`part ${part.label}: pin table ${t.key} is for symbol ${t.symbol}, not ${part.libId}`);
  if (t.mpn !== part.bom.MPN) out.push(`part ${part.label}: pin table ${t.key} is for MPN ${t.mpn}, but the part's MPN is ${part.bom.MPN}`);
  const symNums = new Set(pins.map((p) => p.number));
  const symNames = new Set(pins.map((p) => p.name));
  const tabNums = new Set(Object.keys(t.pins));
  const onlyT = sortPins([...tabNums].filter((n) => !symNums.has(n)));
  const onlyS = sortPins([...symNums].filter((n) => !tabNums.has(n)));
  if (onlyT.length > 0 || onlyS.length > 0) {
    out.push(`part ${part.label}: pin table ${t.key} and symbol ${part.libId} disagree on pin numbers: only in table [${onlyT.join(", ")}], only in symbol [${onlyS.join(", ")}]`);
  }
  for (const n of sortPins(Object.keys(t.pinAliases).filter((k) => !symNums.has(k)))) {
    out.push(`part ${part.label}: pin table ${t.key} declares a pin alias for pin ${n}, which symbol ${part.libId} does not have`);
  }
  for (const name of Object.keys(t.aliases).filter((k) => !symNames.has(k)).sort()) {
    out.push(`part ${part.label}: pin table ${t.key} declares an alias for symbol pin name "${name}", which no pin of ${part.libId} has`);
  }
  for (const lp of pins) {
    const want = own(t.pins, lp.number);
    if (want === undefined) continue;
    const pa = own(t.pinAliases, lp.number);
    if (pa !== undefined && pa.symbolName !== lp.name) {
      out.push(`part ${part.label} pin ${lp.number}: pin alias expects symbol name "${pa.symbolName}" but ${part.libId} names it "${lp.name}"`);
    }
    // No alias declared means the symbol name is used as is (the spec's rule, not a fallback value).
    const mapped = pa !== undefined ? pa.identity : (own(t.aliases, lp.name) ?? lp.name);
    if (mapped !== want) out.push(`part ${part.label} pin ${lp.number}: symbol name "${lp.name}" maps to "${mapped}" but the datasheet table says "${want}"`);
    const ir = irPin(c, part, lp.number);
    // An nc-unlisted pin's identity is the symbol name by construction; the alias check above covers it.
    if (ir !== undefined && ir.origin !== "nc-unlisted" && ir.identity !== want) {
      out.push(`part ${part.label} pin ${lp.number}: circuit expects "${ir.identity}" but the datasheet table says "${want}"`);
    }
  }
  const pads = new Set([...Object.keys(t.mechanicalPads), ...part.mechanicalPads.map((m) => m.pad)]);
  for (const pad of sortPins(pads)) {
    const irPad = part.mechanicalPads.find((m) => m.pad === pad)?.connection;
    const tabPad = own(t.mechanicalPads, pad);
    if (describeConnection(irPad) !== describeConnection(tabPad)) {
      out.push(`part ${part.label}: mechanical pad ${pad} is ${describeConnection(irPad)} in the circuit but ${describeConnection(tabPad)} in the datasheet table`);
    }
  }
  return out;
}

/** Why the part needs a pin table it does not name, or null when it needs none. */
function missingTable(part: IrPart, projectLibs: ReadonlySet<string>): string | null {
  const sep = part.libId.indexOf(":");
  const nick = part.libId.slice(0, sep);
  const entry = part.libId.slice(sep + 1);
  if (projectLibs.has(nick)) return `part ${part.label} uses project symbol ${part.libId} but names no pin table (required for every custom symbol)`;
  if (!GENERIC_SYMBOL_LIBRARIES.has(nick) && !part.bom.MPN.startsWith(entry)) {
    return `part ${part.label} places MPN ${part.bom.MPN} on stock symbol ${part.libId} but names no pin table (required for every stock symbol whose MPN is overridden)`;
  }
  return null;
}

function footprintProblem(part: IrPart, pins: readonly LibPin[], pads: PadLookup): string | null {
  if (part.footprint.trim() === "") return `part ${part.label} has no footprint`;
  let found: readonly string[];
  try {
    found = pads(part.footprint);
  } catch (e) {
    return `part ${part.label}: footprint ${part.footprint} cannot be resolved: ${e instanceof Error ? e.message : String(e)}`;
  }
  const have = new Set(found);
  const want = new Set([...pins.map((p) => p.number), ...part.mechanicalPads.map((m) => m.pad)]);
  const missing = sortPins([...want].filter((n) => !have.has(n)));
  const extra = sortPins([...have].filter((n) => !want.has(n)));
  if (missing.length === 0 && extra.length === 0) return null;
  return `part ${part.label}: footprint ${part.footprint} pads differ from symbol pins + mechanical pads: missing [${missing.join(", ")}], extra [${extra.join(", ")}]`;
}

export function checkPinIdentity(
  c: Circuit,
  symbols: SymbolResolver,
  tables: ReadonlyMap<string, PinTable>,
  pads: PadLookup,
  projectLibs: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  for (const part of [...c.parts.values()].sort((a, b) => a.order - b.order)) {
    const pins = uniquePins(part, symbols.resolve(part.libId).pins, out);
    if (part.pinTable === null) {
      const need = missingTable(part, projectLibs);
      if (need !== null) out.push(need);
      for (const lp of pins) {
        const ir = irPin(c, part, lp.number);
        if (ir !== undefined && ir.identity !== lp.name) {
          out.push(`part ${part.label} pin ${lp.number}: circuit expects "${ir.identity}" but symbol ${part.libId} names it "${lp.name}"; if they are the same pin, add a pin table with an alias`);
        }
      }
    } else {
      const t = tables.get(part.pinTable);
      if (t === undefined) out.push(`part ${part.label} names pin table ${part.pinTable}, which does not exist`);
      else out.push(...tableProblems(part, c, pins, t));
    }
    const fp = footprintProblem(part, pins, pads);
    if (fp !== null) out.push(fp);
  }
  return out;
}
