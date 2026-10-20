/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/regulator.ts`, and DIVERGED
 * from it by Task 8 of the M1 schematic-authoring plan: its eight refusal sites are classified,
 * and **the only two `invalid-geometry` sites in the template set are here**.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * regulator: IN on the left, OUT on the right, each on a horizontal bus carrying its capacitor bank
 * (capacitors from the bus net to a rail), with other anchor pins tied to IN or OUT wired onto the
 * bus. Every remaining pin is fanned out by the fan-out primitive. The banks start beyond
 * everything the regulator and its fan-out draw (fields and labels included, measured on the real
 * drawing), their columns spaced by each capacitor's body and fields. Each bus is split at every tap,
 * so every connection is a shared wire endpoint (KiCad 10's split-wire rule). The template routes
 * only the IR's own connections and refuses anything else.
 *
 * **THE EIGHT REFUSALS SPLIT FIVE / TWO / ONE, AND THE MIDDLE PAIR IS WHY THIS TASK EXISTS.**
 *
 * - **Five `not-applicable`**: no anchor with roles in and out; no rotation putting IN left and
 *   OUT right (a fact about the symbol, decided before anything is drawn); in and out on one net;
 *   and two forwards of `classifyBanks`, which refuses a part touching a bus net that is not a
 *   two-terminal part to a rail - *"put it in its own block"*, the sentence of a shape test.
 * - **Two `invalid-geometry`**, in the tie loop: a pin on a bus net but on the wrong SIDE of the
 *   symbol, and a tied pin whose end is not in line with the bus pin's end. By the time these
 *   fire, the rotation is chosen, the bus ends are computed and the ties are being laid out
 *   against them: this template HAS applied, and what it produced disagrees with a connection the
 *   IR holds. Each names that connection - the pin and the net it is on - because *"the geometry
 *   is wrong"* without saying which connection is a refusal nobody can act on.
 * - **One forward of a `clearance`** mismatch: `reachOf` measures the real drawing through
 *   `drawnBoxes`, and its one failure is a unit whose fields have nowhere to go, which
 *   `tryPlaceFields` has already classified and named the blocker of.
 */
import type { NetName, PinNumber } from "../../ir/types.ts";
import { invalidGeometry, notApplicable, type Anchor, type BlockLayout, type BlockSubgraph, type BlockUnit, type Mismatch, type Placement, type RealiseResult, type Template, type Wire } from "../block-types.ts";
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
function reachOf(g: BlockSubgraph, base: BlockLayout, buses: readonly BusEnd[]): { readonly ok: true; readonly bounds: Box } | { readonly ok: false; readonly mismatch: Mismatch } {
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

type Banks = { readonly ok: true; readonly in: BlockUnit[]; readonly out: BlockUnit[] } | { readonly ok: false; readonly mismatch: Mismatch };

/** A shape refusal of the bank classifier: both of its refusals say "put it in its own block". */
const notBanked = (reason: string): Banks => ({ ok: false, mismatch: { kind: "not-applicable", reason } });

/** Units touching the IN or OUT net: each must be a two-terminal part from that net to a rail. */
function classifyBanks(g: BlockSubgraph, reg: BlockUnit, nets: Record<Bus, NetName>): Banks {
  const banks: Record<Bus, BlockUnit[]> = { in: [], out: [] };
  for (const u of g.units) {
    if (u === reg) continue;
    const bus: Bus | null = u.pins.some((p) => p.net === nets.in) ? "in" : u.pins.some((p) => p.net === nets.out) ? "out" : null;
    if (bus === null) continue;
    if (twoPinNets(u) === null) return notBanked(`${u.part.label} touches the ${bus} net but is not a two-terminal part; put it in its own block`);
    const other = otherNet(u, nets[bus]);
    if (!g.rails.has(other) || other === nets.in || other === nets.out) {
      return notBanked(`${u.part.label} leaves the ${bus} net toward ${other}; put it in its own block`);
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
  if (anchor === null || inPin === undefined || outPin === undefined) return notApplicable("regulator needs an anchor with roles in and out");
  const reg = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (reg === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const lin = libPinOf(reg, inPin);
  const lout = libPinOf(reg, outPin);
  const rot: Rotation | undefined = ROTATIONS.find((t) => pinSide(t, lin) === "left" && pinSide(t, lout) === "right");
  if (rot === undefined) return notApplicable("regulator: no rotation puts IN on the left and OUT on the right");
  const netOf = (pin: PinNumber): NetName | null => reg.pins.find((p) => p.pin === pin)?.net ?? null;
  const inNet = netOf(inPin);
  const outNet = netOf(outPin);
  if (inNet === null || outNet === null || inNet === outNet) {
    return notApplicable(`regulator pins in and out must be on two different nets (in: ${inNet ?? "none"}, out: ${outNet ?? "none"})`);
  }
  const banks = classifyBanks(g, reg, { in: inNet, out: outNet });
  // A FORWARD of the bank classifier's shape refusal.
  if (!banks.ok) return { ok: false, mismatch: banks.mismatch };
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
      // INVALID GEOMETRY, 1 of 2. The connection it failed to realise is this pin's tie to the bus
      // net: the IR puts them on one net and this layout cannot join them, because the pin leaves
      // the symbol on the wrong side.
      return invalidGeometry(
        "regulator",
        `${reg.part.label}.${p.pin} on net ${p.net}`,
        `pin ${p.pin} is on the ${bus} net ${p.net} but on the ${side} side; only ${busSide}-side pins are tied to the ${bus} bus`,
      );
    }
    const busEnd = bus === "in" ? inEnd : outEnd;
    if (end.x !== busEnd.x) {
      // INVALID GEOMETRY, 2 of 2. Same connection, different disagreement: the pin is on the right
      // side but its end does not share the bus column, so the tie this template would draw would
      // not be the straight run into the bus that the split-wire rule needs.
      return invalidGeometry(
        "regulator",
        `${reg.part.label}.${p.pin} on net ${p.net}`,
        `pin ${p.pin} is tied to the ${bus} bus but its end is at x ${fmtMm(end.x)}, not the ${bus} pin's ${fmtMm(busEnd.x)}`,
      );
    }
    ties[bus].push(end);
  }
  const bankUnits = new Set([...banks.in, ...banks.out]);
  const rest: BlockSubgraph = { ...g, units: g.units.filter((u) => !bankUnits.has(u)) };
  const traced = tracePaths(rest, reg, skip);
  // A FORWARD of the fan-out primitive's shape refusal.
  if (!traced.ok) return { ok: false, mismatch: traced.mismatch };
  const base = fanout(rest, reg, rot, traced.paths);
  const out: Drawn = { placements: [...base.placements], wires: [...base.wires], anchors: [...base.anchors] };
  const ends = [
    { bus: "in" as const, net: inNet, end: inEnd, dir: -1 as const, bank: banks.in, ties: ties.in },
    { bus: "out" as const, net: outNet, end: outEnd, dir: 1 as const, bank: banks.out, ties: ties.out },
  ];
  // Measured on the regulator and its fan-out alone (the banks are placed beyond what this draws).
  const reach = reachOf(rest, base, ends);
  // A FORWARD of the field-placement measurement: a `clearance` mismatch, after this template drew.
  if (!reach.ok) return { ok: false, mismatch: reach.mismatch };
  for (const e of ends) {
    const x = e.dir < 0 ? reach.bounds.minX : reach.bounds.maxX;
    drawBus(g, { ...e, ...bankColumns(g, e.bank, e.net, e.dir, x) }, out);
  }
  return { ok: true, layout: out };
}

export const regulator: Template = { id: "regulator", realise };
