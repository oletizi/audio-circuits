/**
 * Ported from digital-pedal-platform's `tools/schgen/render/connectivity.ts` and DIVERGED from it
 * on 2026-10-26: `junctionPoints` also finds a same-net T. The reason, the cost and the
 * `sourceSha` are in `tools/schgen/port-manifest.json`'s `diverged[]` entry, and
 * `docs/known-gaps.md` **G296** has the measurement. **Nothing compares this file against its
 * pedals source any more**, so a re-port has to re-apply the addition by hand.
 */

/**
 * Geometric connectivity of schematic items, modelled on KiCad 10 (observed on 10.0.5):
 *
 * - Wire ends, pin ends and label anchors connect when they land on the SAME POINT.
 * - A label anchor also connects anywhere on a wire's interior.
 * - A pin end or wire end on a wire's INTERIOR connects ONLY with a junction there.
 * - Two crossing wire interiors connect only with a junction.
 * - A label at a crossing of two wire interiors joins both (and raises ERC label_multiple_wires).
 *
 * The generator never relies on the junction-dependent cases: `checkWireSafety` refuses a pin end
 * or wire end inside a wire (split the wire there instead) and a label at a crossing. This module
 * therefore connects pins and wire ends only at coincident points, and label anchors anywhere on a
 * wire. Junction dots (`junctionPoints`) are cosmetic.
 */
import type { NetName } from "../ir/types.ts";
import { fmtMm, pointKey, samePoint, type Point } from "./geometry.ts";

/** `what` names the item in messages; a wire's names it as a wire ("wire 0 of B"), so messages never add the word. */
export type ConnItem =
  | { readonly kind: "wire"; readonly a: Point; readonly b: Point; readonly net: NetName; readonly what: string }
  | { readonly kind: "pin"; readonly at: Point; readonly net: NetName | null; readonly what: string }
  | { readonly kind: "anchor"; readonly at: Point; readonly net: NetName; readonly what: string };

export interface ConnComponent {
  readonly items: readonly ConnItem[];
  readonly nets: ReadonlySet<NetName>;
  readonly ncPins: readonly ConnItem[];
}

export function fmtPoint(p: Point): string {
  return `(${fmtMm(p.x)}, ${fmtMm(p.y)})`;
}

/** True when p lies on the axis-aligned segment a-b, ends included. */
export function onSegment(p: Point, a: Point, b: Point): boolean {
  if (a.x === b.x) return p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
  return p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x);
}

/** True when p lies on the axis-aligned segment a-b but is neither end. */
export function strictlyInside(p: Point, a: Point, b: Point): boolean {
  return onSegment(p, a, b) && !samePoint(p, a) && !samePoint(p, b);
}

/** Throws on a diagonal or zero-length wire; every geometric rule here assumes axis-aligned segments. */
export function assertWireShape(w: ConnItem): void {
  if (w.kind !== "wire") return;
  if (samePoint(w.a, w.b)) throw new Error(`${w.what} has zero length`);
  if (w.a.x !== w.b.x && w.a.y !== w.b.y) throw new Error(`${w.what} is not orthogonal`);
}

/** The points at which an item connects by coincidence: wire ends, pin ends, anchors. */
function endPoints(x: ConnItem): readonly Point[] {
  return x.kind === "wire" ? [x.a, x.b] : [x.at];
}

function touches(x: ConnItem, y: ConnItem): boolean {
  if (x.kind === "anchor" && y.kind === "wire") return onSegment(x.at, y.a, y.b);
  if (y.kind === "anchor" && x.kind === "wire") return onSegment(y.at, x.a, x.b);
  return endPoints(x).some((p) => endPoints(y).some((q) => samePoint(p, q)));
}

export function connectedComponents(items: readonly ConnItem[]): ConnComponent[] {
  items.forEach(assertWireShape);
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r]!;
    let j = i;
    while (parent[j] !== r) {
      const next = parent[j]!;
      parent[j] = r;
      j = next;
    }
    return r;
  };
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (touches(items[i]!, items[j]!)) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, ConnItem[]>();
  items.forEach((item, i) => {
    const r = find(i);
    const group = groups.get(r);
    if (group === undefined) groups.set(r, [item]);
    else group.push(item);
  });
  return [...groups.values()].map((group) => ({
    items: group,
    nets: new Set(group.flatMap((g) => (g.net === null ? [] : [g.net]))),
    ncPins: group.filter((g) => g.kind === "pin" && g.net === null),
  }));
}

/**
 * Cosmetic junction dots: points where 3 or more wire ends and pin ends coincide.
 * Sorted by y then x, deduplicated.
 */
export function junctionPoints(items: readonly ConnItem[]): Point[] {
  items.forEach(assertWireShape);
  const counts = new Map<string, { readonly p: Point; n: number }>();
  for (const item of items) {
    if (item.kind === "anchor") continue;
    for (const p of endPoints(item)) {
      const key = pointKey(p);
      const c = counts.get(key);
      if (c === undefined) counts.set(key, { p, n: 1 });
      else c.n += 1;
    }
  }
  const out = new Map<string, Point>();
  for (const c of counts.values()) if (c.n >= 3) out.set(pointKey(c.p), c.p);

  // **T-JUNCTIONS, which counting ends alone cannot see.** Three ends meeting is one way a net
  // branches; the other is a wire ENDING part-way along another wire, and there only ONE end sits
  // at the branch, so the count above never reaches 3 and no junction is emitted. KiCad joins a
  // branch point only with a junction object, so the drawing would show a connection the netlist
  // does not make - which is why `lib/schgen/elk/adapt.ts` refuses on exactly this disagreement.
  //
  // It went unseen while `edgesForNet` chained a net's terminals, because a chain's routes meet
  // end to end. `docs/known-gaps.md` **G293**: the chain was replaced by a STAR so that a parallel
  // bank is laid out as a column rather than a staircase, and a star's routes leave one hub and
  // land part-way along their neighbours. The gap was always here; the star is what walked into it.
  //
  // SAME NET ONLY. Two wires of DIFFERENT nets crossing is not a connection and must never take a
  // junction - that would draw a short. Crossing is checked elsewhere; this only ever joins wire
  // of one net to wire of the same net.
  const wires = items.filter((i): i is Extract<ConnItem, { kind: "wire" }> => i.kind === "wire");
  for (const item of items) {
    if (item.kind === "anchor") continue;
    const net = item.net;
    if (net === null) continue;
    for (const p of endPoints(item)) {
      if (out.has(pointKey(p))) continue;
      if (wires.some((w) => w !== item && w.net === net && strictlyInside(p, w.a, w.b))) out.set(pointKey(p), p);
    }
  }
  return [...out.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}
