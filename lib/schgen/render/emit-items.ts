/**
 * Ported from digital-pedal-platform's `tools/schgen/render/emitItems.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * One builder per KiCad 10 schematic item kind. Each returns the item's node and the stable key
 * its UUID v5 is derived from; emit.ts orders items by those keys so output depends only on content.
 */
import type { BomFields, NetName, SheetId } from "../ir/types.ts";
import type { Wire } from "./block-types.ts";
import { pointKey, type Point, type Rotation, type Side } from "./geometry.ts";
import type { LibSymbol } from "./library.ts";
import { int, list, mm, str, sym, yesNo, type SListNode } from "./sexpr-write.ts";
import type { PinMark } from "./pin-marks.ts";
import type { Frame, GlobalLabel, SheetText } from "./sheet-types.ts";
import { frameTitleSpot, refsSpot, type Fields, type HJustify, type PowerValueSpot } from "./text-boxes.ts";
import { uuidV5 } from "./uuid.ts";

export interface Keyed {
  readonly key: string;
  readonly node: SListNode;
}

const uuid = (key: string): SListNode => list("uuid", str(uuidV5(key)));
const at2 = (p: Point): SListNode => list("at", mm(p.x), mm(p.y));
const at3 = (p: Point, angle: number): SListNode => list("at", mm(p.x), mm(p.y), int(angle));
const font = (): SListNode => list("font", list("size", sym("1.27"), sym("1.27")));

function effects(justify: string | null): SListNode {
  return justify === null ? list("effects", font()) : list("effects", font(), list("justify", justify.split(" ").map(sym)));
}

/** KiCad centres text when no horizontal justify is given. */
const justifyOf = (j: HJustify): string | null => (j === "center" ? null : j);

/**
 * A symbol field's file angle and justify for text meant to be seen horizontal (or, `vertical`,
 * reading upward) with justify `j`. KiCad turns a field with its symbol: the drawn direction is
 * (file angle + symbol rotation), and a field that would read backwards (180°) or downward (270°)
 * is drawn the readable way with its justification flipped. The position is absolute either way.
 * (Verified against kicad-cli 10.0.5 SVG export for every rotation × angle × justify.)
 */
export function fieldOrientation(rot: Rotation, vertical: boolean, j: HJustify): { angle: number; justify: string | null } {
  const quarter = rot % 180 !== 0;
  const angle = vertical === quarter ? 0 : 90;
  const drawn = (angle + rot) % 360;
  const flip = drawn === 180 || drawn === 270;
  const justify: HJustify = !flip || j === "center" ? j : j === "left" ? "right" : "left";
  return { angle, justify: justifyOf(justify) };
}

function field(name: string, value: string, spot: { at: Point; justify: HJustify }, rot: Rotation, vertical: boolean): SListNode {
  const o = fieldOrientation(rot, vertical, spot.justify);
  return property(name, value, spot.at, false, o.justify, o.angle);
}

export function property(name: string, value: string, p: Point, hidden: boolean, justify: string | null = null, angle = 0): SListNode {
  return list("property", str(name), str(value), at3(p, angle), hidden ? [list("hide", yesNo(true))] : [], effects(justify));
}

function instances(project: string, path: string, reference: string, unit: number): SListNode {
  return list("instances", list("project", str(project), list("path", str(path), list("reference", str(reference)), list("unit", int(unit)))));
}

/** Where a sheet item lives: its project and the root/sheet instance path. */
export interface ItemScope {
  readonly project: string;
  readonly sheet: SheetId;
  readonly path: string;
}

interface SymbolCommon {
  readonly key: string;
  readonly lib: LibSymbol;
  readonly unit: number;
  readonly at: Point;
  readonly rot: Rotation;
  readonly inBom: boolean;
  readonly dnp: boolean;
  readonly reference: string;
  readonly properties: readonly SListNode[];
  readonly pinKey: (pin: string) => string;
}

function placedSymbol(scope: ItemScope, s: SymbolCommon): SListNode {
  const pins = s.lib.pins.filter((p) => p.unit === s.unit || p.unit === 0);
  return list(
    "symbol",
    list("lib_id", str(s.lib.libId)),
    at3(s.at, s.rot),
    list("unit", int(s.unit)),
    list("exclude_from_sim", yesNo(false)),
    list("in_bom", yesNo(s.inBom)),
    list("on_board", yesNo(s.inBom)),
    list("dnp", yesNo(s.dnp)),
    uuid(s.key),
    s.properties,
    pins.map((p) => list("pin", str(p.number), uuid(s.pinKey(p.number)))),
    instances(scope.project, scope.path, s.reference, s.unit),
  );
}

export interface PartItem {
  readonly label: string;
  readonly lib: LibSymbol;
  readonly unit: number;
  readonly at: Point;
  readonly rot: Rotation;
  /** Reference and Value positions, placed against the body box at layout time. */
  readonly fields: Fields;
  readonly reference: string;
  readonly value: string;
  readonly footprint: string;
  readonly dnp: boolean;
  readonly bom: BomFields;
}

export function partSymbol(scope: ItemScope, p: PartItem): Keyed {
  const key = `sym:${p.label}:${p.unit}`;
  const bomProps: Array<[string, string | null]> = [
    ["Manufacturer", p.bom.Manufacturer],
    ["MPN", p.bom.MPN],
    ["Supplier", p.bom.Supplier],
    ["SupplierPart", p.bom.SupplierPart],
    ["AbsMaxV", p.bom.AbsMaxV],
  ];
  const properties = [
    field("Reference", p.reference, p.fields.reference, p.rot, false),
    field("Value", p.value, p.fields.value, p.rot, false),
    property("Footprint", p.footprint, p.at, true),
    property("Datasheet", "", p.at, true),
    ...bomProps.flatMap(([name, v]) => (v === null ? [] : [property(name, v, p.at, true)])),
  ];
  const node = placedSymbol(scope, {
    key, lib: p.lib, unit: p.unit, at: p.at, rot: p.rot, inBom: true, dnp: p.dnp, reference: p.reference, properties,
    pinKey: (n) => `pin:${p.label}:${p.unit}:${n}`,
  });
  return { key, node };
}

export interface PowerItem {
  readonly key: string;
  readonly lib: LibSymbol;
  readonly at: Point;
  readonly rot: Rotation;
  readonly reference: string;
  /** The rail net, or "PWR_FLAG". */
  readonly value: NetName;
  readonly valueAt: PowerValueSpot;
}

export function powerSymbol(scope: ItemScope, p: PowerItem): Keyed {
  if (!p.lib.isPower) throw new Error(`sheet ${scope.sheet}: ${p.lib.libId} is not a power symbol`);
  const properties = [
    property("Reference", p.reference, p.at, true),
    field("Value", p.value, p.valueAt, p.rot, p.valueAt.vertical),
    property("Footprint", "", p.at, true),
    property("Datasheet", "", p.at, true),
  ];
  const node = placedSymbol(scope, {
    key: p.key, lib: p.lib, unit: 1, at: p.at, rot: p.rot, inBom: false, dnp: false, reference: p.reference, properties,
    pinKey: (n) => `${p.key}:pin:${n}`,
  });
  return { key: p.key, node };
}

function ordered(w: Wire): [Point, Point] {
  const aFirst = w.a.x < w.b.x || (w.a.x === w.b.x && w.a.y <= w.b.y);
  return aFirst ? [w.a, w.b] : [w.b, w.a];
}

export function wire(sheet: SheetId, w: Wire): Keyed {
  const [a, b] = ordered(w);
  const key = `wire:${sheet}:${pointKey(a)},${pointKey(b)}`;
  const node = list(
    "wire",
    list("pts", list("xy", mm(a.x), mm(a.y)), list("xy", mm(b.x), mm(b.y))),
    list("stroke", list("width", int(0)), list("type", sym("default"))),
    uuid(key),
  );
  return { key, node };
}

export function junction(sheet: SheetId, p: Point): Keyed {
  const key = `junction:${sheet}:${pointKey(p)}`;
  const node = list("junction", at2(p), list("diameter", int(0)), list("color", int(0), int(0), int(0), int(0)), uuid(key));
  return { key, node };
}

export function noConnect(sheet: SheetId, p: Point): Keyed {
  const key = `nc:${sheet}:${pointKey(p)}`;
  return { key, node: list("no_connect", at2(p), uuid(key)) };
}

const LABEL_SIDE: Record<Side, { readonly angle: number; readonly justify: string }> = {
  right: { angle: 0, justify: "left" },
  left: { angle: 180, justify: "right" },
  up: { angle: 90, justify: "left" },
  down: { angle: 270, justify: "right" },
};

export function globalLabel(sheet: SheetId, l: GlobalLabel): Keyed {
  const key = `label:${sheet}:${l.net}:${pointKey(l.at)}`;
  const { angle, justify } = LABEL_SIDE[l.side];
  const refs = refsSpot(l);
  const node = list(
    "global_label",
    str(l.net),
    list("shape", sym("bidirectional")),
    at3(l.at, angle),
    effects(justify),
    uuid(key),
    // Shown (project.ts INTERSHEET_REFS) where the layout reserved its room: beyond the outline (refsSpot).
    list("property", str("Intersheetrefs"), str("${INTERSHEET_REFS}"), at3(refs.at, refs.vertical ? 90 : 0), effects(refs.justify)),
  );
  return { key, node };
}

/** A DNP pin-polarity mark (pinMarks.ts): sheet text at its spot, with its justification. */
export function pinMarkText(sheet: SheetId, m: PinMark): Keyed {
  const key = `pinmark:${sheet}:${m.what}`;
  const node = list("text", str(m.text), list("exclude_from_sim", yesNo(false)), at3(m.spot.at, 0), effects(m.spot.justify), uuid(key));
  return { key, node };
}

export function text(key: string, t: SheetText): Keyed {
  const node = list("text", str(t.text), list("exclude_from_sim", yesNo(false)), at3(t.at, 0), effects("left"), uuid(key));
  return { key, node };
}

/** A frame's dashed rectangle and its title text (frameTitleSpot). */
export function frame(sheet: SheetId, f: Frame): [Keyed, Keyed] {
  const id = f.blockId ?? `extra:${f.title}`;
  const key = `frame:${sheet}:${id}`;
  const node = list(
    "rectangle",
    list("start", mm(f.box.minX), mm(f.box.minY)),
    list("end", mm(f.box.maxX), mm(f.box.maxY)),
    list("stroke", list("width", sym("0.254")), list("type", sym("dash"))),
    list("fill", list("type", sym("none"))),
    uuid(key),
  );
  const title = text(`frametitle:${sheet}:${id}`, { text: f.title, at: frameTitleSpot(f.box).at });
  return [{ key, node }, title];
}
