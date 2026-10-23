/**
 * Ported from digital-pedal-platform's `tools/schgen/render/libPins.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { comparePinNumbers } from "../ir/order.ts";
import { fmtMm, GRID, um, type Um } from "./geometry.ts";
import { headOf, type SListNode, type SNode } from "./sexpr-write.ts";

const PIN_TYPES = [
  "input",
  "output",
  "bidirectional",
  "tri_state",
  "passive",
  "free",
  "unspecified",
  "power_in",
  "power_out",
  "open_collector",
  "open_emitter",
  "no_connect",
] as const;
export type PinType = (typeof PIN_TYPES)[number];

function isPinType(t: string): t is PinType {
  return PIN_TYPES.some((p) => p === t);
}

export type PinAngle = 0 | 90 | 180 | 270;

function isPinAngle(a: number): a is PinAngle {
  return a === 0 || a === 90 || a === 180 || a === 270;
}

/** A library pin in the library frame (Y up); `x, y` is the connection point. */
export interface LibPin {
  readonly number: string;
  readonly name: string;
  readonly type: PinType;
  readonly unit: number;
  readonly x: Um;
  readonly y: Um;
  readonly angle: PinAngle;
  readonly length: Um;
  readonly hidden: boolean;
}

export interface Box {
  readonly minX: Um;
  readonly minY: Um;
  readonly maxX: Um;
  readonly maxY: Um;
}

export interface SubSymbol {
  readonly node: SListNode;
  readonly unit: number;
}

export function isList(n: SNode): n is SListNode {
  return n.kind === "list";
}

export function atomAt(n: SListNode, i: number): string | null {
  const a = n.items[i];
  return a !== undefined && a.kind === "atom" ? a.text : null;
}

export function child(n: SListNode, head: string): SListNode | undefined {
  return n.items.filter(isList).find((c) => headOf(c) === head);
}

export function children(n: SListNode, head: string): SListNode[] {
  return n.items.filter(isList).filter((c) => headOf(c) === head);
}

export function num(text: string | null, what: string): number {
  const v = text === null ? NaN : Number(text);
  if (!Number.isFinite(v)) throw new Error(`${what}: expected a number, got ${text === null ? "nothing" : `"${text}"`}`);
  return v;
}

function umOf(text: string | null, what: string): Um {
  return um(num(text, what));
}

/** Sub-symbols `<Name>_<U>_<S>` with body style 0 or 1; De Morgan style 2 is skipped. */
export function subSymbols(sym: SListNode, libId: string): SubSymbol[] {
  const out: SubSymbol[] = [];
  for (const s of children(sym, "symbol")) {
    const name = atomAt(s, 1) ?? "";
    const m = /_(\d+)_(\d+)$/.exec(name);
    if (m === null) throw new Error(`${libId}: sub-symbol "${name}" has no _U_S suffix`);
    if (Number(m[2]) === 2) continue;
    out.push({ node: s, unit: Number(m[1]) });
  }
  return out;
}

function isHidden(pin: SListNode): boolean {
  if (pin.items.some((i) => i.kind === "atom" && !i.quoted && i.text === "hide")) return true;
  const h = child(pin, "hide");
  return h !== undefined && atomAt(h, 1) === "yes";
}

function readPin(pin: SListNode, unit: number, libId: string, isPower: boolean): LibPin {
  const numberList = child(pin, "number");
  const number = numberList === undefined ? null : atomAt(numberList, 1);
  if (number === null) throw new Error(`${libId}: a pin in unit ${unit} has no number`);
  const nameList = child(pin, "name");
  const name = nameList === undefined ? null : atomAt(nameList, 1);
  if (name === null) throw new Error(`${libId}: pin ${number} has no name`);
  const type = atomAt(pin, 1) ?? "";
  if (!isPinType(type)) throw new Error(`${libId}: pin ${number} has unknown electrical type ${type}`);
  const at = child(pin, "at");
  if (at === undefined) throw new Error(`${libId}: pin ${number} has no (at …)`);
  const x = umOf(atomAt(at, 1), `${libId}: pin ${number} x`);
  const y = umOf(atomAt(at, 2), `${libId}: pin ${number} y`);
  const angle = num(atomAt(at, 3), `${libId}: pin ${number} angle`);
  const lengthList = child(pin, "length");
  if (lengthList === undefined) throw new Error(`${libId}: pin ${number} has no (length …)`);
  const length = umOf(atomAt(lengthList, 1), `${libId}: pin ${number} length`);
  const hidden = isHidden(pin);
  if (!isPower && hidden && type === "power_in") {
    throw new Error(
      `${libId}: pin ${number} (${name}) is a hidden power input; KiCad joins it implicitly to net ${name}. Use a symbol with visible power pins.`,
    );
  }
  if (x % GRID !== 0 || y % GRID !== 0) {
    throw new Error(`${libId}: pin ${number} at (${fmtMm(x)}, ${fmtMm(y)}) is off the 1.27 mm grid`);
  }
  if (!isPinAngle(angle)) throw new Error(`${libId}: pin ${number} has unsupported angle ${angle}`);
  return { number, name, type, unit, x, y, angle, length, hidden };
}

export function extractPins(sym: SListNode, libId: string, isPower: boolean): LibPin[] {
  const pins: LibPin[] = [];
  for (const sub of subSymbols(sym, libId)) {
    for (const p of children(sub.node, "pin")) pins.push(readPin(p, sub.unit, libId, isPower));
  }
  return pins.sort((a, b) => comparePinNumbers(a.number, b.number));
}

/** The far end of a pin: `length` along its angle (0 = +x, 90 = +y, 180 = −x, 270 = −y). */
function pinEnd(p: LibPin): [Um, Um] {
  switch (p.angle) {
    case 0:
      return [p.x + p.length, p.y];
    case 90:
      return [p.x, p.y + p.length];
    case 180:
      return [p.x - p.length, p.y];
    case 270:
      return [p.x, p.y - p.length];
  }
}

/** A point in micrometres that need not be integral (library graphics are not on a µm grid). */
export type RawPoint = readonly [number, number];

export function rawUm(text: string | null, what: string): number {
  return num(text, what) * 1000;
}

export function xy(l: SListNode | undefined, what: string): RawPoint {
  if (l === undefined) throw new Error(`${what}: missing point`);
  return [rawUm(atomAt(l, 1), `${what} x`), rawUm(atomAt(l, 2), `${what} y`)];
}

const TWO_PI = 2 * Math.PI;

/** Counter-clockwise angular distance from a to b, in [0, 2π). */
function ccw(a: number, b: number): number {
  const d = (b - a) % TWO_PI;
  return d < 0 ? d + TWO_PI : d;
}

/** The three defining points of an arc plus every axis extreme (centre ± r) its sweep crosses. */
export function arcPoints(s: RawPoint, m: RawPoint, e: RawPoint): RawPoint[] {
  const pts: RawPoint[] = [s, m, e];
  const d = 2 * (s[0] * (m[1] - e[1]) + m[0] * (e[1] - s[1]) + e[0] * (s[1] - m[1]));
  if (Math.abs(d) < 1e-9) return pts;
  const sq = (p: RawPoint): number => p[0] * p[0] + p[1] * p[1];
  const cx = (sq(s) * (m[1] - e[1]) + sq(m) * (e[1] - s[1]) + sq(e) * (s[1] - m[1])) / d;
  const cy = (sq(s) * (e[0] - m[0]) + sq(m) * (s[0] - e[0]) + sq(e) * (m[0] - s[0])) / d;
  const r = Math.hypot(s[0] - cx, s[1] - cy);
  const ang = (p: RawPoint): number => Math.atan2(p[1] - cy, p[0] - cx);
  const [as, am, ae] = [ang(s), ang(m), ang(e)];
  // Sweep counter-clockwise from `from` through `span`; the mid point fixes the direction.
  const [from, span] = ccw(as, am) <= ccw(as, ae) ? [as, ccw(as, ae)] : [ae, ccw(ae, as)];
  const extremes: Array<[number, RawPoint]> = [
    [0, [cx + r, cy]],
    [Math.PI / 2, [cx, cy + r]],
    [Math.PI, [cx - r, cy]],
    [(3 * Math.PI) / 2, [cx, cy - r]],
  ];
  for (const [theta, p] of extremes) if (ccw(from, theta) <= span) pts.push(p);
  return pts;
}

/** Every point bounding the graphics of one sub-symbol, in non-integral micrometres. */
function graphicPoints(sub: SListNode, libId: string): RawPoint[] {
  const pts: RawPoint[] = [];
  const what = `${libId}: ${atomAt(sub, 1) ?? "?"}`;
  for (const g of sub.items.filter(isList)) {
    const h = headOf(g);
    if (h === "rectangle") {
      pts.push(xy(child(g, "start"), `${what} rectangle start`), xy(child(g, "end"), `${what} rectangle end`));
    } else if (h === "polyline" || h === "bezier") {
      const p = child(g, "pts");
      if (p === undefined) throw new Error(`${what}: ${h} has no (pts …)`);
      for (const q of children(p, "xy")) pts.push(xy(q, `${what} ${h} point`));
    } else if (h === "circle") {
      const [cx, cy] = xy(child(g, "center"), `${what} circle center`);
      const rl = child(g, "radius");
      const r = rawUm(rl === undefined ? null : atomAt(rl, 1), `${what} circle radius`);
      pts.push([cx - r, cy - r], [cx + r, cy + r]);
    } else if (h === "arc") {
      const [s, m, e] = ["start", "mid", "end"].map((k) => xy(child(g, k), `${what} arc ${k}`));
      if (s === undefined || m === undefined || e === undefined) throw new Error(`${what}: arc is incomplete`);
      pts.push(...arcPoints(s, m, e));
    }
  }
  return pts;
}

/** Snap float noise (e.g. 1.016 * 1000) to the integer, then round outward. */
export function snap(v: number): number {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-4 ? r : v;
}

/**
 * Box per unit U ≥ 1 (a unit-0-only symbol is unit 1): the union of the graphics and
 * pins (both ends) of every style-0/1 sub-symbol whose unit is U or 0, in whole µm.
 */
export function unitBoxes(sym: SListNode, pins: readonly LibPin[]): Map<number, Box> {
  return boxesOf(sym, pins, (p) => [[p.x, p.y], pinEnd(p)]);
}

/**
 * Body box per unit, pins excluded: the graphics plus each pin's body-side end (where the pin
 * meets the body). Fields and other text are placed against this box, never against pin tips.
 */
export function bodyBoxes(sym: SListNode, pins: readonly LibPin[]): Map<number, Box> {
  return boxesOf(sym, pins, (p) => [pinEnd(p)]);
}

function boxesOf(sym: SListNode, pins: readonly LibPin[], pinPoints: (p: LibPin) => RawPoint[]): Map<number, Box> {
  const libId = atomAt(sym, 1) ?? "?";
  const subs = subSymbols(sym, libId);
  const declared = [...new Set(subs.map((s) => s.unit))].sort((a, b) => a - b);
  // A symbol drawn only in unit 0 (PWR_FLAG, MountingHole) is one unit: its box is keyed 1.
  const units = declared.some((u) => u > 0) ? declared.filter((u) => u > 0) : [1];
  const boxes = new Map<number, Box>();
  for (const u of units) {
    const pts: RawPoint[] = [];
    for (const s of subs) if (s.unit === u || s.unit === 0) pts.push(...graphicPoints(s.node, libId));
    for (const p of pins) if (p.unit === u || p.unit === 0) pts.push(...pinPoints(p));
    const first = pts[0];
    if (first === undefined) throw new Error(`${libId}: unit ${u} has no geometry`);
    let [minX, minY] = first;
    let [maxX, maxY] = first;
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    // Pins are integral; graphics bounds are rounded outward to whole µm (a conservative bound).
    boxes.set(u, {
      minX: Math.floor(snap(minX)),
      minY: Math.floor(snap(minY)),
      maxX: Math.ceil(snap(maxX)),
      maxY: Math.ceil(snap(maxY)),
    });
  }
  return boxes;
}
