/**
 * Ported from digital-pedal-platform's `tools/schgen/render/wireSafety.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { NetName } from "../ir/types.ts";
import { assertWireShape, fmtPoint, onSegment, strictlyInside, type ConnItem } from "./connectivity.ts";
import { samePoint, type Point } from "./geometry.ts";

type WireItem = Extract<ConnItem, { kind: "wire" }>;
type PinItem = Extract<ConnItem, { kind: "pin" }>;
type AnchorItem = Extract<ConnItem, { kind: "anchor" }>;

function isWire(i: ConnItem): i is WireItem {
  return i.kind === "wire";
}
function isPin(i: ConnItem): i is PinItem {
  return i.kind === "pin";
}

function netText(net: NetName | null): string {
  return net === null ? "NC" : net;
}

/**
 * Rule 1: a pin end of a different net (or an NC pin) lies anywhere on the wire. A same-net pin end
 * strictly inside the wire is refused too: KiCad connects it only with a junction, so the wire must
 * be split there.
 */
function wireOverPins(w: WireItem, items: readonly ConnItem[]): string[] {
  return items.filter(isPin).flatMap((p) => {
    if (p.net !== w.net && onSegment(p.at, w.a, w.b)) {
      return [`${w.what} (net ${w.net}) passes over pin end ${p.what} (${netText(p.net)}) at ${fmtPoint(p.at)}`];
    }
    if (strictlyInside(p.at, w.a, w.b)) {
      return [`pin end ${p.what} (${netText(p.net)}) lies mid-wire on ${w.what} at ${fmtPoint(p.at)}; split the wire there`];
    }
    return [];
  });
}

/** Overlap of two collinear axis-aligned wires, or null when not collinear or sharing at most a point. */
function collinearOverlap(w1: WireItem, w2: WireItem): readonly [Point, Point] | null {
  const h1 = w1.a.y === w1.b.y;
  const h2 = w2.a.y === w2.b.y;
  if (h1 !== h2) return null;
  if (h1 && w1.a.y !== w2.a.y) return null;
  if (!h1 && w1.a.x !== w2.a.x) return null;
  const along = (p: Point): number => (h1 ? p.x : p.y);
  const lo = Math.max(Math.min(along(w1.a), along(w1.b)), Math.min(along(w2.a), along(w2.b)));
  const hi = Math.min(Math.max(along(w1.a), along(w1.b)), Math.max(along(w2.a), along(w2.b)));
  if (hi <= lo) return null;
  const at = (v: number): Point => (h1 ? { x: v, y: w1.a.y } : { x: w1.a.x, y: v });
  return [at(lo), at(hi)];
}

/**
 * Rules 2 and 3 for wire `w` (index i) against every other wire. A collinear overlap of any nets
 * (same-net overlaps are redundant geometry) is reported once (rule 2) and suppresses the end-on-wire lines for the same pair. A same-net wire end strictly
 * inside another wire is refused: KiCad connects it only with a junction.
 */
function wireOverWires(w: WireItem, i: number, items: readonly ConnItem[]): string[] {
  const out: string[] = [];
  items.forEach((v, j) => {
    if (j === i || !isWire(v)) return;
    const foreign = v.net !== w.net;
    const overlap = collinearOverlap(w, v);
    if (overlap !== null) {
      if (j > i) {
        out.push(
          `collinear ${w.what} (${w.net}) and ${v.what} (${v.net}) overlap from ${fmtPoint(overlap[0])} to ${fmtPoint(overlap[1])}`,
        );
      }
      return;
    }
    for (const end of [w.a, w.b]) {
      if (foreign && onSegment(end, v.a, v.b)) {
        out.push(`${w.what} (net ${w.net}) ends on ${v.what} (net ${v.net}) at ${fmtPoint(end)}`);
      } else if (!foreign && strictlyInside(end, v.a, v.b)) {
        out.push(`${w.what} ends mid-wire on ${v.what} at ${fmtPoint(end)}; split the wire there`);
      }
    }
  });
  return out;
}

/** Wires whose interiors cross at the anchor: a label there joins both (ERC label_multiple_wires). */
function anchorAtCrossing(a: AnchorItem, items: readonly ConnItem[]): string[] {
  const inside = items.filter(isWire).filter((w) => strictlyInside(a.at, w.a, w.b));
  const out: string[] = [];
  inside.forEach((w1, k) => {
    for (const w2 of inside.slice(k + 1)) {
      out.push(`anchor ${a.what} (net ${a.net}) sits where ${w1.what} and ${w2.what} cross at ${fmtPoint(a.at)}`);
    }
  });
  return out;
}

/** Rule 4: an anchor on a foreign wire, pin end, or (by the same reasoning) a foreign anchor. */
function anchorChecks(a: AnchorItem, i: number, items: readonly ConnItem[]): string[] {
  const out: string[] = [];
  items.forEach((o, j) => {
    if (j === i || o.net === a.net) return;
    if (o.kind === "wire" && onSegment(a.at, o.a, o.b)) {
      out.push(`anchor ${a.what} (net ${a.net}) lies on ${o.what} (net ${o.net}) at ${fmtPoint(a.at)}`);
    } else if (o.kind === "pin" && samePoint(a.at, o.at)) {
      out.push(`anchor ${a.what} (net ${a.net}) lies on pin end ${o.what} (${netText(o.net)}) at ${fmtPoint(a.at)}`);
    } else if (o.kind === "anchor" && j > i && samePoint(a.at, o.at)) {
      out.push(`anchor ${a.what} (net ${a.net}) coincides with anchor ${o.what} (net ${o.net}) at ${fmtPoint(a.at)}`);
    }
  });
  return [...out, ...anchorAtCrossing(a, items)];
}

/** Rule 5: coincident pin ends of different nets, or any coincidence involving an NC pin. */
function pinChecks(p: PinItem, i: number, items: readonly ConnItem[]): string[] {
  return items
    .filter((q, j): q is PinItem => j > i && isPin(q))
    .filter((q) => samePoint(p.at, q.at) && (p.net === null || q.net === null || p.net !== q.net))
    .map(
      (q) => `pin end ${p.what} (${netText(p.net)}) coincides with pin end ${q.what} (${netText(q.net)}) at ${fmtPoint(p.at)}`,
    );
}

/**
 * Wire ends that touch nothing: no pin end (power symbols included), no label anchor and no other
 * wire's end at that point. KiCad reports these only as ERC warnings. Known gap: two otherwise
 * dangling ends that meet only each other count as attached.
 */
export function danglingWireEnds(items: readonly ConnItem[]): string[] {
  const key = (p: Point): string => `${p.x},${p.y}`;
  const points = new Set(items.flatMap((i) => (i.kind === "wire" ? [] : [key(i.at)])));
  const ends = new Map<string, number>();
  for (const w of items.filter(isWire)) for (const p of [w.a, w.b]) ends.set(key(p), (ends.get(key(p)) ?? 0) + 1);
  return items.filter(isWire).flatMap((w) =>
    [w.a, w.b].flatMap((p) =>
      points.has(key(p)) || (ends.get(key(p)) ?? 0) > 1
        ? []
        : [`${w.what} (net ${w.net}) ends at ${fmtPoint(p)} touching nothing; end it on a pin, a label, a power symbol or another wire end`],
    ),
  );
}

/**
 * Every geometric contact that would create an electrical connection KiCad would make but the
 * circuit graph does not. Empty means the layout is safe. Messages follow input order.
 */
export function checkWireSafety(items: readonly ConnItem[]): string[] {
  items.forEach(assertWireShape);
  return items.flatMap((item, i) => {
    if (item.kind === "wire") return [...wireOverPins(item, items), ...wireOverWires(item, i, items)];
    if (item.kind === "anchor") return anchorChecks(item, i, items);
    return pinChecks(item, i, items);
  });
}
