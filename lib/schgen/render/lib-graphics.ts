/**
 * Ported from digital-pedal-platform's `tools/schgen/render/libGraphics.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * What a library symbol draws besides its pins' lines, for text placement: its graphic strokes
 * and texts per unit (so fields placed inside a body avoid them), and how it shows pin names and
 * numbers (pin_names offset/hide, pin_numbers hide).
 */
import { unionBox, type Um } from "./geometry.ts";
import {
  arcPoints, atomAt, child, children, isList, num, rawUm, snap, subSymbols, xy, type Box, type RawPoint,
} from "./lib-pins.ts";
import { headOf, type SListNode } from "./sexpr-write.ts";

/** A unit's drawing in the library frame (Y up), whole µm. */
export interface UnitGraphics {
  /** Straight strokes: rectangle edges, polyline and bezier legs, arc chords, circle bounding edges. */
  readonly segments: ReadonlyArray<readonly [RawPoint, RawPoint]>;
  /** Areas text must avoid: text items (one character height per character) and arc bounds. */
  readonly blocks: readonly Box[];
}

export interface PinTextStyle {
  /** Pin names sit inside the body this far past the pin's body end; 0 puts them outside, along the pin. */
  readonly namesOffset: Um;
  readonly namesHidden: boolean;
  readonly numbersHidden: boolean;
}

/** KiCad's default pin-name offset when a symbol declares none. */
const DEFAULT_NAME_OFFSET: Um = 508;

function hiddenFlag(l: SListNode | undefined): boolean {
  if (l === undefined) return false;
  if (l.items.some((i) => i.kind === "atom" && !i.quoted && i.text === "hide")) return true;
  const h = child(l, "hide");
  return h !== undefined && atomAt(h, 1) === "yes";
}

export function pinTextStyle(sym: SListNode, libId: string): PinTextStyle {
  const names = child(sym, "pin_names");
  const offset = names === undefined ? undefined : child(names, "offset");
  return {
    namesOffset: offset === undefined ? DEFAULT_NAME_OFFSET : Math.round(num(atomAt(offset, 1), `${libId}: pin_names offset`) * 1000),
    namesHidden: hiddenFlag(names),
    numbersHidden: hiddenFlag(child(sym, "pin_numbers")),
  };
}

const r = (p: RawPoint): RawPoint => [Math.round(snap(p[0])), Math.round(snap(p[1]))];

function legs(points: readonly RawPoint[]): Array<readonly [RawPoint, RawPoint]> {
  return points.slice(1).map((p, i) => [r(points[i]!), r(p)] as const);
}

function textItem(g: SListNode, what: string): Box {
  const text = atomAt(g, 1) ?? "";
  const at = child(g, "at");
  const [x, y] = xy(at, `${what} text`);
  const angle = at === undefined ? 0 : num(atomAt(at, 3) ?? "0", `${what} text angle`);
  const effects = child(g, "effects");
  const font = effects === undefined ? undefined : child(effects, "font");
  const size = font === undefined ? undefined : child(font, "size");
  if (size === undefined) throw new Error(`${what}: text "${text}" has no font size`);
  const h = rawUm(atomAt(size, 1), `${what} text size`);
  const half = (text.length * h) / 2;
  const [hw, hh] = angle % 180 === 0 ? [half, h / 2] : [h / 2, half];
  return { minX: Math.floor(x - hw), minY: Math.floor(y - hh), maxX: Math.ceil(x + hw), maxY: Math.ceil(y + hh) };
}

function drawn(sub: SListNode, libId: string, segments: Array<readonly [RawPoint, RawPoint]>, blocks: Box[]): void {
  const what = `${libId}: ${atomAt(sub, 1) ?? "?"}`;
  for (const g of sub.items.filter(isList)) {
    const h = headOf(g);
    if (h === "rectangle") {
      const [x0, y0] = xy(child(g, "start"), `${what} rectangle start`);
      const [x1, y1] = xy(child(g, "end"), `${what} rectangle end`);
      segments.push(...legs([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]));
    } else if (h === "polyline" || h === "bezier") {
      const p = child(g, "pts");
      if (p === undefined) throw new Error(`${what}: ${h} has no (pts …)`);
      segments.push(...legs(children(p, "xy").map((q) => xy(q, `${what} ${h} point`))));
    } else if (h === "circle") {
      const [cx, cy] = xy(child(g, "center"), `${what} circle center`);
      const rl = child(g, "radius");
      const rad = rawUm(rl === undefined ? null : atomAt(rl, 1), `${what} circle radius`);
      segments.push(...legs([[cx - rad, cy - rad], [cx + rad, cy - rad], [cx + rad, cy + rad], [cx - rad, cy + rad], [cx - rad, cy - rad]]));
    } else if (h === "arc") {
      const [s, m, e] = ["start", "mid", "end"].map((k) => xy(child(g, k), `${what} arc ${k}`));
      if (s === undefined || m === undefined || e === undefined) throw new Error(`${what}: arc is incomplete`);
      const pts = arcPoints(s, m, e);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      blocks.push({ minX: Math.floor(Math.min(...xs)), minY: Math.floor(Math.min(...ys)), maxX: Math.ceil(Math.max(...xs)), maxY: Math.ceil(Math.max(...ys)) });
    } else if (h === "text") {
      blocks.push(textItem(g, what));
    }
  }
}

/**
 * Bounding box of everything a unit draws besides its pins (strokes, text items, arc areas), in the
 * library frame; null when the unit draws nothing but pins.
 */
export function graphicsBox(g: UnitGraphics): Box | null {
  const boxes: Box[] = [
    ...g.segments.map(([a, b]) => ({ minX: Math.min(a[0], b[0]), minY: Math.min(a[1], b[1]), maxX: Math.max(a[0], b[0]), maxY: Math.max(a[1], b[1]) })),
    ...g.blocks,
  ];
  const [first, ...rest] = boxes;
  if (first === undefined) return null;
  return rest.reduce(unionBox, first);
}

/** Per unit U ≥ 1 (a unit-0-only symbol is unit 1): the strokes and blocked areas of sub-symbols of unit U or 0. */
export function unitGraphics(sym: SListNode, libId: string): Map<number, UnitGraphics> {
  const subs = subSymbols(sym, libId);
  const declared = [...new Set(subs.map((s) => s.unit))];
  const units = declared.some((u) => u > 0) ? declared.filter((u) => u > 0) : [1];
  const out = new Map<number, UnitGraphics>();
  for (const u of units) {
    const segments: Array<readonly [RawPoint, RawPoint]> = [];
    const blocks: Box[] = [];
    for (const s of subs) if (s.unit === u || s.unit === 0) drawn(s.node, libId, segments, blocks);
    out.set(u, { segments, blocks });
  }
  return out;
}
