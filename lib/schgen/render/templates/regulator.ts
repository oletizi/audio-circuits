/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/regulator.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * regulator: IN on the left, OUT on the right, each on a horizontal bus carrying its capacitor bank
 * (capacitors from the bus net to a rail), with other anchor pins tied to IN or OUT wired onto the
 * bus. Every remaining pin is fanned out by the fan-out primitive. The banks start beyond
 * everything the regulator and its fan-out draw (fields and labels included, measured on the real
 * drawing), their columns spaced by each capacitor's body and fields. Each bus is split at every tap,
 * so every connection is a shared wire endpoint (KiCad 10's split-wire rule). The template routes
 * only the IR's own connections and refuses anything else.
 */
import type { NetName, PinNumber } from "../../ir/types.ts";
import { mismatch, type Anchor, type BlockLayout, type BlockSubgraph, type BlockUnit, type Placement, type RealiseResult, type Template, type Wire } from "../block-types.ts";
import { fanout, libPinOf, tracePaths } from "../fanout-kit.ts";
import { shuntExtent, type ChainShunt, type Extent } from "../chain-kit.ts";
import { boundsOf, drawnBoxes } from "../drawn-extent.ts";
import type { Box } from "../lib-pins.ts";
import { fmtMm, GRID, gridCeil, gridFloor, pinEnd, pinSide, ROTATIONS, samePoint, type Point, type Rotation, type Um } from "../geometry.ts";
import { orientTwoPin, otherNet, PITCH, STUB, twoPinNets } from "../layout-kit.ts";

type Bus = "in" | "out";

interface BusSpec {
  readonly bus: Bus;
  readonly net: NetName;
  readonly end: Point;
  /** -1: the bus runs left (IN); +1: right (OUT). */
  readonly dir: 1 | -1;
  readonly bank: readonly BlockUnit[];
  readonly ties: readonly Point[];
  /** Column of each bank capacitor, outward from the regulator (bankColumns). */
  readonly capXs: readonly Um[];
  /** The bus's far end, where a labelled bus is anchored. */
  readonly farX: Um;
}

interface Drawn {
  readonly placements: Placement[];
  readonly wires: Wire[];
  readonly anchors: Anchor[];
}

/** The bus, split at the pin end, every capacitor column, every tie column and the far end. */
function drawBus(g: BlockSubgraph, b: BusSpec, out: Drawn): void {
  const y = b.end.y;
  const { capXs, farX } = b;
  const tieXs = tieColumns(b.ties, b.dir);
  const labelled = g.rails.has(b.net) || g.external.has(b.net);
  // An unlabelled bus has no far-end piece: it would end on nothing.
  const xs = [...new Set([b.end.x, ...capXs, ...tieXs, ...(labelled ? [farX] : [])])].sort((p, q) => p - q);
  for (let k = 1; k < xs.length; k += 1) out.wires.push({ a: { x: xs[k - 1]!, y }, b: { x: xs[k]!, y }, net: b.net });
  if (labelled) out.anchors.push({ net: b.net, at: { x: farX, y }, side: b.dir < 0 ? "left" : "right" });
  b.ties.forEach((t, i) => {
    const x = tieXs[i]!;
    out.wires.push({ a: t, b: { x, y: t.y }, net: b.net });
    out.wires.push({ a: { x, y: t.y }, b: { x, y }, net: b.net });
  });
  b.bank.forEach((u, i) => {
    const x = capXs[i]!;
    const rail = otherNet(u, b.net);
    if (g.groundRails.has(rail)) {
      const o = orientTwoPin(u, "vertical", b.net);
      out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x - o.first.x, y: y - o.first.y }, rot: o.rot });
      const tip = { x, y: y + o.span + STUB };
      out.wires.push({ a: { x, y: y + o.span }, b: tip, net: rail });
      out.anchors.push({ net: rail, at: tip, side: "down" });
    } else {
      const o = orientTwoPin(u, "vertical", rail);
      out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x - o.second.x, y: y - o.second.y }, rot: o.rot });
      const tip = { x, y: y - o.span - STUB };
      out.wires.push({ a: { x, y: y - o.span }, b: tip, net: rail });
      out.anchors.push({ net: rail, at: tip, side: "up" });
    }
  });
}

const tieColumns = (ties: readonly Point[], dir: 1 | -1): Um[] => ties.map((t) => t.x + dir * STUB);

/** A bank capacitor's column: the capacitor from the bus net down to a ground rail or up to a supply rail. */
function bankShunt(g: BlockSubgraph, u: BlockUnit, net: NetName): ChainShunt {
  const far = otherNet(u, net);
  return { units: [u], node: net, far, side: g.groundRails.has(far) ? "down" : "up" };
}

/**
 * Bank columns outward from `reach` (the furthest x the fan-out and ties draw on this side, text
 * included): the first one grid step beyond it, each next clear of its neighbour's body and
 * fields by one grid step (chainKit's shunt extents); the far end clear of the last one's.
 */
function bankColumns(g: BlockSubgraph, bank: readonly BlockUnit[], net: NetName, dir: 1 | -1, reach: Um): { capXs: Um[]; farX: Um } {
  const snap = (x: Um): Um => (dir > 0 ? gridCeil(x) : gridFloor(x));
  // Facing the regulator: a column's left extent going right, its right extent (its fields) going left.
  const near = (e: Extent): Um => (dir > 0 ? e.left : e.right);
  const far = (e: Extent): Um => (dir > 0 ? e.right : e.left);
  const extents = bank.map((u) => shuntExtent(bankShunt(g, u, net)));
  const capXs: Um[] = [];
  extents.forEach((e, i) => {
    const prev = capXs[i - 1];
    const before = extents[i - 1];
    capXs.push(
      prev === undefined || before === undefined
        ? snap(reach + dir * (GRID + near(e)))
        : prev + dir * Math.max(PITCH, gridCeil(far(before) + GRID + near(e))),
    );
  });
  const last = capXs[capXs.length - 1];
  const lastExtent = extents[extents.length - 1];
  const farX = last === undefined || lastExtent === undefined ? snap(reach + dir * PITCH) : last + dir * Math.max(PITCH, gridCeil(far(lastExtent) + GRID));
  return { capXs, farX };
}

interface BusEnd {
  readonly net: NetName;
  readonly end: Point;
  readonly dir: 1 | -1;
  readonly ties: readonly Point[];
}

/**
 * The bounds of everything drawn before the banks — the regulator and its fan-out with their
 * fields, pin text, labels and power values, each bus's first stub and its ties — measured on the
 * real drawing, or why a unit of it has no room for its fields.
 */
function reachOf(g: BlockSubgraph, base: BlockLayout, buses: readonly BusEnd[]): { readonly ok: true; readonly bounds: Box } | { readonly ok: false; readonly reason: string } {
  const wires: Wire[] = [...base.wires];
  for (const b of buses) {
    wires.push({ a: b.end, b: { x: b.end.x + b.dir * STUB, y: b.end.y }, net: b.net });
    tieColumns(b.ties, b.dir).forEach((x, i) => {
      const t = b.ties[i]!;
      wires.push({ a: t, b: { x, y: t.y }, net: b.net }, { a: { x, y: t.y }, b: { x, y: b.end.y }, net: b.net });
    });
  }
  const drawn = drawnBoxes(g, { ...base, wires });
  return drawn.ok ? { ok: true, bounds: boundsOf(drawn.boxes) } : drawn;
}

type Banks = { readonly ok: true; readonly in: BlockUnit[]; readonly out: BlockUnit[] } | { readonly ok: false; readonly reason: string };

/** Units touching the IN or OUT net: each must be a two-terminal part from that net to a rail. */
function classifyBanks(g: BlockSubgraph, reg: BlockUnit, nets: Record<Bus, NetName>): Banks {
  const banks: Record<Bus, BlockUnit[]> = { in: [], out: [] };
  for (const u of g.units) {
    if (u === reg) continue;
    const bus: Bus | null = u.pins.some((p) => p.net === nets.in) ? "in" : u.pins.some((p) => p.net === nets.out) ? "out" : null;
    if (bus === null) continue;
    if (twoPinNets(u) === null) return { ok: false, reason: `${u.part.label} touches the ${bus} net but is not a two-terminal part; put it in its own block` };
    const other = otherNet(u, nets[bus]);
    if (!g.rails.has(other) || other === nets.in || other === nets.out) {
      return { ok: false, reason: `${u.part.label} leaves the ${bus} net toward ${other}; put it in its own block` };
    }
    banks[bus].push(u);
  }
  return { ok: true, in: banks.in, out: banks.out };
}

function realise(g: BlockSubgraph): RealiseResult {
  const r = g.block.rendering;
  const anchor = r.kind === "wired" ? r.anchor : null;
  const inPin = anchor?.roles["in"];
  const outPin = anchor?.roles["out"];
  if (anchor === null || inPin === undefined || outPin === undefined) return mismatch("regulator needs an anchor with roles in and out");
  const reg = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (reg === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const lin = libPinOf(reg, inPin);
  const lout = libPinOf(reg, outPin);
  const rot: Rotation | undefined = ROTATIONS.find((t) => pinSide(t, lin) === "left" && pinSide(t, lout) === "right");
  if (rot === undefined) return mismatch("regulator: no rotation puts IN on the left and OUT on the right");
  const netOf = (pin: PinNumber): NetName | null => reg.pins.find((p) => p.pin === pin)?.net ?? null;
  const inNet = netOf(inPin);
  const outNet = netOf(outPin);
  if (inNet === null || outNet === null || inNet === outNet) {
    return mismatch(`regulator pins in and out must be on two different nets (in: ${inNet ?? "none"}, out: ${outNet ?? "none"})`);
  }
  const banks = classifyBanks(g, reg, { in: inNet, out: outNet });
  if (!banks.ok) return mismatch(banks.reason);
  const origin: Point = { x: 0, y: 0 };
  const inEnd = pinEnd(origin, rot, lin);
  const outEnd = pinEnd(origin, rot, lout);
  const skip = new Set<PinNumber>([inPin, outPin]);
  const ties: Record<Bus, Point[]> = { in: [], out: [] };
  for (const p of reg.pins) {
    if (p.pin === inPin || p.pin === outPin || (p.net !== inNet && p.net !== outNet)) continue;
    skip.add(p.pin);
    const bus: Bus = p.net === inNet ? "in" : "out";
    const busSide = bus === "in" ? "left" : "right";
    const lp = libPinOf(reg, p.pin);
    const end = pinEnd(origin, rot, lp);
    if (samePoint(end, bus === "in" ? inEnd : outEnd)) continue;
    const side = pinSide(rot, lp);
    if (side !== busSide) {
      return mismatch(`pin ${p.pin} is on the ${bus} net ${p.net} but on the ${side} side; only ${busSide}-side pins are tied to the ${bus} bus`);
    }
    const busEnd = bus === "in" ? inEnd : outEnd;
    if (end.x !== busEnd.x) {
      return mismatch(`pin ${p.pin} is tied to the ${bus} bus but its end is at x ${fmtMm(end.x)}, not the ${bus} pin's ${fmtMm(busEnd.x)}`);
    }
    ties[bus].push(end);
  }
  const bankUnits = new Set([...banks.in, ...banks.out]);
  const rest: BlockSubgraph = { ...g, units: g.units.filter((u) => !bankUnits.has(u)) };
  const traced = tracePaths(rest, reg, skip);
  if (!traced.ok) return mismatch(traced.reason);
  const base = fanout(rest, reg, rot, traced.paths);
  const out: Drawn = { placements: [...base.placements], wires: [...base.wires], anchors: [...base.anchors] };
  const ends = [
    { bus: "in" as const, net: inNet, end: inEnd, dir: -1 as const, bank: banks.in, ties: ties.in },
    { bus: "out" as const, net: outNet, end: outEnd, dir: 1 as const, bank: banks.out, ties: ties.out },
  ];
  // Measured on the regulator and its fan-out alone (the banks are placed beyond what this draws).
  const reach = reachOf(rest, base, ends);
  if (!reach.ok) return mismatch(reach.reason);
  for (const e of ends) {
    const x = e.dir < 0 ? reach.bounds.minX : reach.bounds.maxX;
    drawBus(g, { ...e, ...bankColumns(g, e.bank, e.net, e.dir, x) }, out);
  }
  return { ok: true, layout: out };
}

export const regulator: Template = { id: "regulator", realise };
