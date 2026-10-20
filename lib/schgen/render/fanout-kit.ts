/**
 * Ported from digital-pedal-platform's `tools/schgen/render/fanoutKit.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The fan-out primitive: every connected pin of an anchor unit runs straight outward through its
 * own series path of two-terminal parts to a rail or labelled net. Anchor pins sharing a non-rail
 * net are joined by a wire beside their side, split at every member so each tap is a shared wire
 * endpoint (KiCad 10's split-wire rule). It routes only the IR's own connections: `tracePaths`
 * reads them and refuses any shape `fanout` cannot draw; `fanout` only positions.
 */
import type { NetName, PinNumber } from "../ir/types.ts";
import type { Anchor, BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { jogSlots, rowExtent, spreadRows } from "./fanout-rows.ts";
import { GRID, pinEnd, pinSide, type Point, type Rotation, type Side, type Um } from "./geometry.ts";
import { orientTwoPin, otherNet, STUB, twoPinNets } from "./layout-kit.ts";
import type { LibPin } from "./lib-pins.ts";

export interface OutwardPath {
  readonly pin: PinNumber;
  readonly units: readonly BlockUnit[];
  /** `nets[0]` is the pin's net, `nets[i + 1]` the far net of `units[i]`. */
  readonly nets: readonly NetName[];
}

export type TraceResult = { readonly ok: true; readonly paths: OutwardPath[] } | { readonly ok: false; readonly reason: string };

const refuse = (reason: string): TraceResult => ({ ok: false, reason });

export function libPinOf(u: BlockUnit, pin: PinNumber): LibPin {
  const lp = u.symbol.pins.find((p) => p.number === pin);
  if (lp === undefined) throw new Error(`${u.symbol.libId} has no pin ${pin} (part ${u.part.label})`);
  return lp;
}

const labelled = (g: BlockSubgraph, net: NetName): boolean => g.rails.has(net) || g.external.has(net);

/** Nets on two or more distinct anchor-pin locations that are not rails. */
function joinedNets(g: BlockSubgraph, reps: readonly { readonly net: NetName }[]): Set<NetName> {
  const count = new Map<NetName, number>();
  for (const r of reps) if (!g.rails.has(r.net)) count.set(r.net, (count.get(r.net) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n > 1).map(([net]) => net));
}

interface Rep {
  readonly pin: PinNumber;
  readonly net: NetName;
  readonly lp: LibPin;
}

/**
 * The connected anchor pins not in `skip`, one per location (KiCad stacks hidden duplicates on one
 * end; they are drawn as one pin), each with its series path. Stacked pins on different nets and
 * joined nets spread over several sides are refused here, since no rotation changes either.
 */
export function tracePaths(g: BlockSubgraph, anchor: BlockUnit, skip: ReadonlySet<PinNumber>): TraceResult {
  const reps: Rep[] = [];
  const at = new Map<string, Rep>();
  for (const p of anchor.pins) {
    if (skip.has(p.pin) || p.net === null) continue;
    const lp = libPinOf(anchor, p.pin);
    const key = `${lp.x},${lp.y}`;
    const first = at.get(key);
    if (first === undefined) {
      const rep = { pin: p.pin, net: p.net, lp };
      at.set(key, rep);
      reps.push(rep);
    } else if (first.net !== p.net) {
      return refuse(`pins ${first.pin} and ${p.pin} share a location but are on ${first.net} and ${p.net}`);
    }
  }
  const joined = joinedNets(g, reps);
  for (const net of joined) {
    const members = reps.filter((r) => r.net === net);
    if (new Set(members.map((r) => pinSide(0, r.lp))).size > 1) {
      return refuse(`pins ${members.map((r) => r.pin).join(", ")} share net ${net} on different sides`);
    }
  }
  const owner = new Map<BlockUnit, PinNumber>();
  const started = new Set<NetName>();
  const paths: OutwardPath[] = [];
  for (const rep of reps) {
    if (started.has(rep.net) || g.rails.has(rep.net)) {
      paths.push({ pin: rep.pin, units: [], nets: [rep.net] });
      continue;
    }
    started.add(rep.net);
    const units: BlockUnit[] = [];
    const nets: NetName[] = [rep.net];
    let cur = rep.net;
    while (!g.rails.has(cur)) {
      const next = g.units.filter((u) => u !== anchor && !units.includes(u) && u.pins.some((p) => p.net === cur));
      if (next.length === 0) break;
      if (next.length > 1) return refuse(`net ${cur} branches; one series path per pin is supported`);
      const u = next[0]!;
      const prior = owner.get(u);
      if (prior !== undefined) return refuse(`${u.part.label} connects pins ${prior} and ${rep.pin}`);
      if (twoPinNets(u) === null) {
        return refuse(`${u.part.label} on net ${cur} of pin ${rep.pin} is not a two-terminal part with both pins connected`);
      }
      if (g.external.has(cur)) {
        return refuse(`net ${cur} of pin ${rep.pin} is labelled but its path continues through ${u.part.label}; only a path's far end is labelled`);
      }
      owner.set(u, rep.pin);
      units.push(u);
      cur = otherNet(u, cur);
      nets.push(cur);
    }
    if (!labelled(g, cur) && !(units.length === 0 && joined.has(cur))) {
      return refuse(`net ${cur} of pin ${rep.pin} leads nowhere in this block and is not labelled`);
    }
    paths.push({ pin: rep.pin, units, nets });
  }
  for (const u of g.units) {
    if (u !== anchor && !owner.has(u)) return refuse(`${u.part.label} is not on any pin's outward path`);
  }
  return { ok: true, paths };
}

/** Geometry along a side: depth runs outward along the pin axis, perp across it. */
interface Axis {
  readonly horizontal: boolean;
  /** +1 when outward is +x or +y. */
  readonly dir: 1 | -1;
}

function axisOf(side: Side): Axis {
  switch (side) {
    case "left": return { horizontal: true, dir: -1 };
    case "right": return { horizontal: true, dir: 1 };
    case "up": return { horizontal: false, dir: -1 };
    case "down": return { horizontal: false, dir: 1 };
  }
}

const depth = (a: Axis, p: Point): Um => (a.horizontal ? p.x : p.y);
const perp = (a: Axis, p: Point): Um => (a.horizontal ? p.y : p.x);
const pt = (a: Axis, d: Um, q: Um): Point => (a.horizontal ? { x: d, y: q } : { x: q, y: d });

interface DrawnPin {
  readonly path: OutwardPath;
  readonly end: Point;
  readonly side: Side;
}

interface Out {
  readonly placements: Placement[];
  readonly wires: Wire[];
  readonly anchors: Anchor[];
}

/** A row's route beyond its pin (or join point): across the side at `depth`, to the cross coordinate `to`. */
interface Jog {
  readonly depth: Um;
  readonly to: Um;
}

/**
 * From `from` (on the pin's line), jog across the side when the row was moved, wire to `start`
 * (on the row's own line), place the path's units outward, then stub and anchor a labelled far
 * net. An unlabelled empty path is a joined net, already wired by its join.
 */
function drawOutward(g: BlockSubgraph, a: Axis, side: Side, path: OutwardPath, joined: ReadonlySet<NetName>, pinFrom: Point, jog: Jog | null, start: Um, out: Out): void {
  const far = path.nets[path.nets.length - 1]!;
  if (path.units.length === 0 && !labelled(g, far)) {
    if (!joined.has(far)) throw new Error(`fanout: pin ${path.pin}'s net ${far} is neither labelled nor joined to another pin`);
    return;
  }
  let from = pinFrom;
  if (jog !== null) {
    const corner = pt(a, jog.depth, perp(a, pinFrom));
    const after = pt(a, jog.depth, jog.to);
    out.wires.push({ a: from, b: corner, net: path.nets[0]! });
    out.wires.push({ a: corner, b: after, net: path.nets[0]! });
    from = after;
  }
  const q = perp(a, from);
  if (path.units.length === 0) {
    const tip = pt(a, start + a.dir * STUB, q);
    out.wires.push({ a: from, b: tip, net: far });
    out.anchors.push({ net: far, at: tip, side });
    return;
  }
  let cur = pt(a, start, q);
  out.wires.push({ a: from, b: cur, net: path.nets[0]! });
  path.units.forEach((u, i) => {
    const near = path.nets[i]!;
    const away = path.nets[i + 1]!;
    const o = orientTwoPin(u, a.horizontal ? "horizontal" : "vertical", a.dir > 0 ? near : away);
    const nearEnd = a.dir > 0 ? o.first : o.second;
    out.placements.push({ part: u.part.label, unit: u.unit, at: { x: cur.x - nearEnd.x, y: cur.y - nearEnd.y }, rot: o.rot });
    cur = pt(a, depth(a, cur) + a.dir * o.span, perp(a, cur));
  });
  if (!labelled(g, far)) throw new Error(`fanout: path of pin ${path.pin} ends on unlabelled net ${far}`);
  const tip = pt(a, depth(a, cur) + a.dir * STUB, perp(a, cur));
  out.wires.push({ a: cur, b: tip, net: far });
  out.anchors.push({ net: far, at: tip, side });
}

/** The pins of one side that carry a row outward: every unjoined pin and the first member of each joined net. */
function rowsOf(here: readonly DrawnPin[], drawn: readonly DrawnPin[]): DrawnPin[] {
  return here.filter((d) => {
    const net = d.path.nets[0]!;
    return drawn.find((m) => m.path.nets[0] === net) === d;
  });
}

/**
 * Lay out `paths` (from `tracePaths`) around `anchor` placed at the origin with rotation `rot`.
 * Rows on a side that need more room across than their pins give (fanoutRows) are spread apart
 * by jogs beyond the join columns; every row's units start on one common column after the jogs.
 */
export function fanout(g: BlockSubgraph, anchor: BlockUnit, rot: Rotation, paths: readonly OutwardPath[]): BlockLayout {
  const origin: Point = { x: 0, y: 0 };
  const out: Out = { placements: [{ part: anchor.part.label, unit: anchor.unit, at: origin, rot }], wires: [], anchors: [] };
  const drawn: DrawnPin[] = paths.map((path) => {
    const lp = libPinOf(anchor, path.pin);
    return { path, end: pinEnd(origin, rot, lp), side: pinSide(rot, lp) };
  });
  const joined = joinedNets(g, paths.map((p) => ({ net: p.nets[0]! })));
  const sides: Side[] = ["left", "right", "up", "down"];
  for (const side of sides) {
    const here = drawn.filter((d) => d.side === side);
    if (here.length === 0) continue;
    const a = axisOf(side);
    const depths = here.map((d) => depth(a, d.end));
    const base = a.dir > 0 ? Math.max(...depths) : Math.min(...depths);
    const joinedOrder = [...new Set(here.map((d) => d.path.nets[0]!).filter((net) => joined.has(net)))];
    const jogBase = base + a.dir * (STUB + joinedOrder.length * 2 * GRID);
    const rows = rowsOf(here, drawn)
      .filter((d) => d.path.units.length > 0 || labelled(g, d.path.nets[d.path.nets.length - 1]!))
      .sort((p, q) => perp(a, p.end) - perp(a, q.end));
    const at = rows.map((d) => perp(a, d.end));
    const to = spreadRows(at, rows.map((d) => rowExtent(g, side, d.path.units, d.path.nets, true)));
    const slots = jogSlots(at, to);
    const jogs = Math.max(0, ...slots.map((s) => (s === null ? 0 : s + 1)));
    const start = jogBase + a.dir * jogs * 2 * GRID;
    const jogOf = (d: DrawnPin): Jog | null => {
      const k = rows.indexOf(d);
      const s = k < 0 ? null : slots[k]!;
      return s === null ? null : { depth: jogBase + a.dir * s * 2 * GRID, to: to[k]! };
    };
    for (const d of here) {
      const net = d.path.nets[0]!;
      const j = joinedOrder.indexOf(net);
      if (j < 0) {
        drawOutward(g, a, side, d.path, joined, d.end, jogOf(d), start, out);
        continue;
      }
      const column = base + a.dir * (STUB + j * 2 * GRID);
      const join = pt(a, column, perp(a, d.end));
      out.wires.push({ a: d.end, b: join, net });
      const members = drawn.filter((m) => m.path.nets[0] === net);
      if (members.some((m) => m.side !== side)) throw new Error(`fanout: joined net ${net} spans several sides`);
      if (members[0] !== d) continue;
      const qs = members.map((m) => perp(a, m.end)).sort((p, q) => p - q);
      for (let k = 1; k < qs.length; k += 1) out.wires.push({ a: pt(a, column, qs[k - 1]!), b: pt(a, column, qs[k]!), net });
      drawOutward(g, a, side, d.path, joined, join, jogOf(d), start, out);
    }
  }
  return out;
}
