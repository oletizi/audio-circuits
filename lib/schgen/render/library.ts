/**
 * Ported from digital-pedal-platform's `tools/schgen/render/library.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { KICAD_CLI } from "../../kicad/netlist.ts";
import { parse, type SList } from "../../kicad/sexpr.ts";
import { bodyBoxes, extractPins, unitBoxes, type Box, type LibPin } from "./lib-pins.ts";
import { pinTextStyle, unitGraphics, type PinTextStyle, type UnitGraphics } from "./lib-graphics.ts";
import { fromParsed, headOf, str, type SListNode, type SNode } from "./sexpr-write.ts";

export type { Box, LibPin, PinType } from "./lib-pins.ts";

export interface LibSymbol {
  readonly libId: string;
  readonly name: string;
  /** Flattened symbol, first atom renamed to libId, ready for (lib_symbols …). */
  readonly node: SListNode;
  readonly pins: readonly LibPin[];
  readonly unitCount: number;
  readonly isPower: boolean;
  /** Per unit: graphics and pins (both ends); used for clearance. */
  readonly boxes: ReadonlyMap<number, Box>;
  /** Per unit: graphics and the body-side pin ends only; fields and text are placed against it. */
  readonly bodies: ReadonlyMap<number, Box>;
  /** Per unit: graphic strokes and text areas, library frame. */
  readonly graphics: ReadonlyMap<number, UnitGraphics>;
  readonly pinText: PinTextStyle;
}

export interface SymbolResolver {
  resolve(libId: string): LibSymbol;
  /** nickname -> library file, for the version lock. */
  readonly files: ReadonlyMap<string, string>;
}

function topSymbol(lib: SList, name: string): SList | undefined {
  return lib.lists.find((l) => l.head === "symbol" && l.atoms[1]?.value === name);
}

function propName(n: SNode): string | null {
  if (n.kind !== "list" || headOf(n) !== "property") return null;
  const a = n.items[1];
  return a !== undefined && a.kind === "atom" ? a.text : null;
}

function isSubSymbol(n: SNode): boolean {
  return n.kind === "list" && headOf(n) === "symbol";
}

function renameFirst(n: SListNode, name: string): SListNode {
  const [h, , ...rest] = n.items;
  if (h === undefined) throw new Error("renameFirst: empty list");
  return { kind: "list", items: [h, str(name), ...rest] };
}

function renameSub(n: SNode, from: string, to: string): SNode {
  if (n.kind !== "list") return n;
  const nameAtom = n.items[1];
  if (nameAtom === undefined || nameAtom.kind !== "atom" || !nameAtom.text.startsWith(`${from}_`)) return n;
  return renameFirst(n, `${to}${nameAtom.text.slice(from.length)}`);
}

function extendsOf(sym: SListNode): string | null {
  for (const item of sym.items) {
    if (item.kind === "list" && headOf(item) === "extends") {
      const p = item.items[1];
      if (p !== undefined && p.kind === "atom") return p.text;
    }
  }
  return null;
}

/** fromParsed, with the library file and symbol named in any error (e.g. an unfaithful string escape). */
function convert(raw: SList, file: string, name: string): SListNode {
  try {
    return fromParsed(raw);
  } catch (e) {
    throw new Error(`${file}: symbol "${name}": ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

function flattenNamed(lib: SList, file: string, name: string, seen: readonly string[]): SListNode {
  if (seen.includes(name)) throw new Error(`extends cycle: ${[...seen, name].join(" -> ")}`);
  const raw = topSymbol(lib, name);
  if (raw === undefined) throw new Error(`${file}: no symbol "${name}"`);
  const child = convert(raw, file, name);
  const parentName = extendsOf(child);
  if (parentName === null) return child;
  const parent = flattenNamed(lib, file, parentName, [...seen, name]);
  const childItems = child.items.slice(2).filter((i) => headOf(i) !== "extends");
  const childProps = childItems.filter((i) => propName(i) !== null);
  const childFlags = childItems.filter((i) => propName(i) === null && !isSubSymbol(i));
  const childPropNames = new Set(childProps.map(propName));
  const out: SNode[] = [];
  const parentBody = parent.items.slice(2);
  for (const item of parentBody) {
    if (propName(item) !== null || isSubSymbol(item) || headOf(item) === "embedded_fonts") continue;
    out.push(childFlags.find((f) => headOf(f) === headOf(item)) ?? item);
  }
  const parentHeads = new Set(parentBody.map(headOf));
  out.push(...childFlags.filter((f) => !parentHeads.has(headOf(f)) && headOf(f) !== "embedded_fonts"));
  out.push(...childProps);
  out.push(...parentBody.filter((i) => propName(i) !== null && !childPropNames.has(propName(i))));
  out.push(...parentBody.filter(isSubSymbol).map((s) => renameSub(s, parentName, name)));
  const fonts = parentBody.filter((i) => headOf(i) === "embedded_fonts");
  out.push(...(fonts.length > 0 ? fonts : childFlags.filter((f) => headOf(f) === "embedded_fonts")));
  const [h0, n1] = child.items;
  if (h0 === undefined || n1 === undefined) throw new Error(`${file}: malformed symbol "${name}"`);
  return { kind: "list", items: [h0, n1, ...out] };
}

export function flattenSymbol(lib: SList, name: string, libId: string, file: string): SListNode {
  return renameFirst(flattenNamed(lib, file, name, []), libId);
}

export function splitLibId(libId: string): [string, string] {
  const i = libId.indexOf(":");
  if (i <= 0 || i === libId.length - 1) throw new Error(`lib id "${libId}" is not in Lib:Name form`);
  return [libId.slice(0, i), libId.slice(i + 1)];
}

export function createResolver(libs: ReadonlyMap<string, string>): SymbolResolver {
  const parsed = new Map<string, SList>();
  const cache = new Map<string, LibSymbol>();
  function libRoot(nick: string): [SList, string] {
    const file = libs.get(nick);
    if (file === undefined) throw new Error(`library nickname "${nick}" is not configured`);
    let root = parsed.get(nick);
    if (root === undefined) {
      root = parse(fs.readFileSync(file, "utf8"));
      parsed.set(nick, root);
    }
    return [root, file];
  }
  return {
    files: libs,
    resolve(libId: string): LibSymbol {
      const hit = cache.get(libId);
      if (hit !== undefined) return hit;
      const [nick, name] = splitLibId(libId);
      const [root, file] = libRoot(nick);
      const node = flattenSymbol(root, name, libId, file);
      const isPower = node.items.some((i) => headOf(i) === "power");
      const pins = extractPins(node, libId, isPower);
      const units = new Set(pins.map((p) => p.unit).filter((u) => u > 0));
      const sym: LibSymbol = {
        libId,
        name,
        node,
        pins,
        unitCount: Math.max(1, units.size),
        isPower,
        boxes: unitBoxes(node, pins),
        bodies: bodyBoxes(node, pins),
        graphics: unitGraphics(node, libId),
        pinText: pinTextStyle(node, libId),
      };
      cache.set(libId, sym);
      return sym;
    },
  };
}

export function stockSymbolDir(): string {
  const env = process.env["KICAD_SYMBOL_DIR"];
  if (env !== undefined) {
    if (!fs.existsSync(env)) throw new Error(`KICAD_SYMBOL_DIR=${env} does not exist`);
    return env;
  }
  const candidates = [path.join(path.dirname(KICAD_CLI), "..", "SharedSupport", "symbols"), "/usr/share/kicad/symbols"];
  for (const c of candidates) if (fs.existsSync(c)) return path.resolve(c);
  throw new Error(`KiCad stock symbol directory not found; set KICAD_SYMBOL_DIR. Tried: ${candidates.join(", ")}`);
}
