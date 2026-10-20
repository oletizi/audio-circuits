/**
 * Ported from digital-pedal-platform's `tools/schgen/render/emit.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * KiCad 10 .kicad_sch emission: one child file per arranged sheet plus the root sheet that lists
 * them. Every UUID is v5 from a stable key and items are ordered by those keys, so regeneration
 * is byte-stable.
 */
import type { Circuit, PartLabel, SheetId } from "../ir/types.ts";
import {
  frame, globalLabel, junction, noConnect, partSymbol, pinMarkText, powerSymbol, property, text, wire, type ItemScope, type Keyed,
} from "./emit-items.ts";
import { pointKey, um, type Point } from "./geometry.ts";
import { sheetPage } from "./page-refs.ts";
import type { SymbolResolver } from "./library.ts";
import { int, list, mm, print, str, sym, yesNo, type SListNode } from "./sexpr-write.ts";
import type { SheetDrawing } from "./sheet-types.ts";
import { powerText } from "./power-text.ts";
import { reservedReference } from "./text-boxes.ts";
import { uuidV5 } from "./uuid.ts";

export interface EmitContext {
  readonly project: string;
  readonly circuit: Circuit;
  readonly symbols: SymbolResolver;
  readonly refs: ReadonlyMap<PartLabel, string>;
  readonly rootUuid: string;
  readonly sheetUuids: ReadonlyMap<SheetId, string>;
  readonly titleComments: readonly string[];
}

export interface PowerRefs {
  next(flag: boolean): string;
}

const POWER_REF_BLOCK = 1000;

/**
 * Power references for the sheet at 1-based `ordinal` in the circuit's sheet order: `#PWR<ordinal>001`,
 * `#PWR<ordinal>002`, … and independently `#FLG<ordinal>001`, …. Each sheet owns a block of 1000, so
 * references stay unique across the project and a change on one sheet never renumbers another.
 */
export function powerRefs(ordinal: number): PowerRefs {
  if (!Number.isInteger(ordinal) || ordinal < 1) throw new Error(`power references: sheet ordinal ${ordinal} is not a positive integer`);
  const counts = { pwr: 0, flg: 0 };
  return {
    next(flag: boolean): string {
      const kind = flag ? "flg" : "pwr";
      const prefix = flag ? "#FLG" : "#PWR";
      counts[kind] += 1;
      if (counts[kind] >= POWER_REF_BLOCK) throw new Error(`more than ${POWER_REF_BLOCK - 1} ${prefix} references on sheet ${ordinal}`);
      return `${prefix}${ordinal * POWER_REF_BLOCK + counts[kind]}`;
    },
  };
}

const MAX_COMMENTS = 9;

export function emitContext(
  project: string,
  circuit: Circuit,
  symbols: SymbolResolver,
  refs: ReadonlyMap<PartLabel, string>,
  titleComments: readonly string[],
): EmitContext {
  if (project.trim() === "") throw new Error("emit: project name must not be empty");
  if (titleComments.length > MAX_COMMENTS) {
    throw new Error(`emit: KiCad title blocks hold at most ${MAX_COMMENTS} title comments; got ${titleComments.length}`);
  }
  const sheetUuids = new Map<SheetId, string>();
  for (const s of circuit.sheets) {
    if (sheetUuids.has(s.id)) throw new Error(`emit: duplicate sheet id ${s.id}`);
    sheetUuids.set(s.id, uuidV5(`sheet:${project}:${s.id}`));
  }
  return { project, circuit, symbols, refs, rootUuid: uuidV5(`root:${project}`), sheetUuids, titleComments };
}

function header(fileUuid: string, paper: string, title: string, comments: readonly string[], libSymbols: readonly SListNode[]): SListNode[] {
  return [
    list("version", int(20260306)),
    list("generator", str("schgen")),
    list("generator_version", str("10.0")),
    list("uuid", str(fileUuid)),
    list("paper", str(paper)),
    list("title_block", list("title", str(title)), comments.map((c, i) => list("comment", int(i + 1), str(c)))),
    list("lib_symbols", libSymbols),
  ];
}

function finish(items: readonly SListNode[]): string {
  return `${print(list("kicad_sch", items, list("embedded_fonts", yesNo(false))))}\n`;
}

function sorted(group: readonly Keyed[]): SListNode[] {
  return [...group].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).map((k) => k.node);
}

function assertUniqueKeys(sheet: SheetId, groups: ReadonlyArray<readonly Keyed[]>): void {
  const seen = new Set<string>();
  for (const k of groups.flat()) {
    if (seen.has(k.key)) throw new Error(`sheet ${sheet}: duplicate item key ${k.key}`);
    seen.add(k.key);
  }
}

function partItems(d: SheetDrawing, ctx: EmitContext, scope: ItemScope): Keyed[] {
  return d.symbols.map((s) => {
    const part = ctx.circuit.parts.get(s.part);
    if (part === undefined) throw new Error(`sheet ${d.sheet.id}: unknown part ${s.part}`);
    const reference = ctx.refs.get(s.part);
    if (reference === undefined) throw new Error(`sheet ${d.sheet.id}: part ${s.part} has no reference; annotate before emitting`);
    const reserved = reservedReference(part.refPrefix);
    if (reference.length > reserved.length) {
      throw new Error(
        `sheet ${d.sheet.id}: part ${s.part}'s reference ${reference} is longer than the ${reserved.length} characters ` +
          `(${reserved}) its fields were laid out for; widen REF_DIGITS`,
      );
    }
    return partSymbol(scope, {
      label: s.part, lib: ctx.symbols.resolve(part.libId), unit: s.unit, at: s.at, rot: s.rot, fields: s.fields, reference,
      value: part.value, footprint: part.footprint, dnp: part.dnp, bom: part.bom,
    });
  });
}

/** Power references are allocated in key order, so they depend only on content. */
function powerItems(d: SheetDrawing, ctx: EmitContext, scope: ItemScope, pwr: PowerRefs): Keyed[] {
  const keyed = d.powers.map((p) => ({
    p,
    key: p.flag ? `flg:${d.sheet.id}:${p.net}` : `pwr:${d.sheet.id}:${p.net}:${pointKey(p.at)}`,
  }));
  keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return keyed.map(({ p, key }) =>
    powerSymbol(scope, {
      key, lib: ctx.symbols.resolve(p.libId), at: p.at, rot: p.rot, reference: pwr.next(p.flag), value: p.flag ? "PWR_FLAG" : p.net,
      valueAt: powerText(ctx.symbols, p).value,
    }),
  );
}

function libSymbols(d: SheetDrawing, ctx: EmitContext): SListNode[] {
  const ids = new Set<string>(d.powers.map((p) => p.libId));
  for (const s of d.symbols) {
    const part = ctx.circuit.parts.get(s.part);
    if (part === undefined) throw new Error(`sheet ${d.sheet.id}: unknown part ${s.part}`);
    ids.add(part.libId);
  }
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((id) => ctx.symbols.resolve(id).node);
}

export function emitSheet(d: SheetDrawing, ctx: EmitContext): string {
  const id = d.sheet.id;
  const ordinal = ctx.circuit.sheets.findIndex((s) => s.id === id) + 1;
  if (ordinal === 0) throw new Error(`emit: sheet ${id} is not a sheet of the circuit`);
  const pwr = powerRefs(ordinal);
  const sheetUuid = ctx.sheetUuids.get(id);
  if (sheetUuid === undefined) throw new Error(`emit: sheet ${id} has no uuid in the emit context`);
  const scope: ItemScope = { project: ctx.project, sheet: id, path: `/${ctx.rootUuid}/${sheetUuid}` };
  const frames = d.frames.map((f) => frame(id, f));
  const parts = partItems(d, ctx, scope);
  const groups: Keyed[][] = [
    [...d.texts.map((t, i) => text(`text:${id}:${i}`, t)), ...d.pinMarks.map((m) => pinMarkText(id, m)), ...frames.map(([, title]) => title)],
    frames.map(([rect]) => rect),
    d.junctions.map((p) => junction(id, p)),
    d.noConnects.map((p) => noConnect(id, p)),
    d.wires.map((w) => wire(id, w)),
    d.labels.map((l) => globalLabel(id, l)),
    powerItems(d, ctx, scope, pwr),
    parts,
  ];
  assertUniqueKeys(id, groups);
  const head = header(uuidV5(`sheetfile:${ctx.project}:${id}`), d.sheet.paper, d.sheet.title, ctx.titleComments, libSymbols(d, ctx));
  return finish([...head, ...groups.flatMap(sorted)]);
}

const SHEET_W = um(50.8);
const SHEET_H = um(25.4);
const ORIGIN = um(25.4);
const COL_PITCH = um(63.5);
const ROW_PITCH = um(50.8);
const PER_ROW = 4;

function rootSheet(ctx: EmitContext, i: number): SListNode {
  const s = ctx.circuit.sheets[i];
  if (s === undefined) throw new Error(`emit: no sheet at index ${i}`);
  const sheetUuid = ctx.sheetUuids.get(s.id);
  if (sheetUuid === undefined) throw new Error(`emit: sheet ${s.id} has no uuid in the emit context`);
  const at: Point = { x: ORIGIN + (i % PER_ROW) * COL_PITCH, y: ORIGIN + Math.floor(i / PER_ROW) * ROW_PITCH };
  return list(
    "sheet",
    list("at", mm(at.x), mm(at.y)),
    list("size", mm(SHEET_W), mm(SHEET_H)),
    list("exclude_from_sim", yesNo(false)),
    list("in_bom", yesNo(true)),
    list("on_board", yesNo(true)),
    list("dnp", yesNo(false)),
    list("stroke", list("width", sym("0.1524")), list("type", sym("solid"))),
    list("fill", list("color", int(0), int(0), int(0), int(0))),
    list("uuid", str(sheetUuid)),
    property("Sheetname", s.title, { x: at.x, y: at.y - um(1.27) }, false, "left bottom"),
    property("Sheetfile", s.file, { x: at.x, y: at.y + um(26.67) }, false, "left top"),
    list("instances", list("project", str(ctx.project), list("path", str(`/${ctx.rootUuid}`), list("page", str(String(sheetPage(ctx.circuit, s.id))))))),
  );
}

export function emitRoot(ctx: EmitContext): string {
  const sheets = ctx.circuit.sheets.map((_, i) => rootSheet(ctx, i));
  const instances = list("sheet_instances", list("path", str("/"), list("page", str("1"))));
  return finish([...header(ctx.rootUuid, "A4", ctx.project, ctx.titleComments, []), ...sheets, instances]);
}
