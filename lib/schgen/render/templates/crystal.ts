/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/crystal.ts`, and DIVERGED
 * from it by Task 8 of the M1 schematic-authoring plan: its six refusal sites are classified -
 * five shape tests and one forward of the field-placement measurement.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * crystal: a crystal with its role pins a and b on one horizontal line, a load capacitor from each
 * pin's node down to ground, and its case pins stubbed out to ground. The capacitor columns stand
 * symmetrically beyond everything the crystal draws (its fields, pin text, case grounds and their
 * values, measured on the real drawing) and their own bodies and fields. The classifier only reads the
 * IR's own connections; a crystal block that is not exactly this shape is refused.
 *
 * **FIVE OF THE SIX REFUSALS ARE `not-applicable`** - no anchor with roles a and b, the two pins
 * not on two different non-rail nets, a case pin not on a ground rail, not exactly one load
 * capacitor from each pin to ground, and no rotation putting a and b on one horizontal line. The
 * last of those is about the SYMBOL's pin geometry rather than the block's topology, and it is
 * still `not-applicable` for the reason the kind is defined by: nothing has been drawn when it
 * fires, so there is no geometry disagreeing with the IR and no defect being hidden.
 *
 * **THERE WAS A SIXTH AND TASK 24 DELETED IT**: a forward of `drawnBoxes`' measurement, which
 * refused when a unit's fields had nowhere to go. `render/field-placement.ts` no longer refuses
 * that - it takes the least-covered slot and records a `FieldFallback` - so `drawnBoxes` returns
 * the boxes and there is nothing to forward. The five that remain are unchanged.
 */
import type { NetName } from "../../ir/types.ts";
import { notApplicable, type Anchor, type BlockSubgraph, type BlockUnit, type Placement, type RealiseResult, type Template, type Wire } from "../block-types.ts";
import { shuntExtent } from "../chain-kit.ts";
import { boundsOf, drawnBoxes } from "../drawn-extent.ts";
import { GRID, gridCeil, pinEnd, pinSide, pointKey, ROTATIONS, type Point, type Rotation, type Side } from "../geometry.ts";
import { orientTwoPin, PITCH, STUB, twoPinNets } from "../layout-kit.ts";

interface LoadCap {
  readonly unit: BlockUnit;
  readonly ground: NetName;
}

function loadCapFor(others: readonly BlockUnit[], node: NetName, g: BlockSubgraph): LoadCap | null {
  const found: LoadCap[] = [];
  for (const unit of others) {
    const nets = twoPinNets(unit);
    if (nets === null || !nets.includes(node)) continue;
    const far = nets[0] === node ? nets[1] : nets[0];
    if (g.groundRails.has(far)) found.push({ unit, ground: far });
  }
  const only = found[0];
  return found.length === 1 && only !== undefined ? only : null;
}

function offsetOf(side: Side): Point {
  switch (side) {
    case "left": return { x: -STUB, y: 0 };
    case "right": return { x: STUB, y: 0 };
    case "up": return { x: 0, y: -STUB };
    case "down": return { x: 0, y: STUB };
  }
}

function realise(g: BlockSubgraph): RealiseResult {
  const r = g.block.rendering;
  const anchor = r.kind === "wired" ? r.anchor : null;
  const pinA = anchor?.roles["a"];
  const pinB = anchor?.roles["b"];
  if (anchor === null || pinA === undefined || pinB === undefined) return notApplicable("crystal needs an anchor with roles a and b");
  const xtal = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (xtal === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const netOf = (pin: string): NetName | null => xtal.pins.find((p) => p.pin === pin)?.net ?? null;
  const A = netOf(pinA);
  const B = netOf(pinB);
  if (A === null || B === null || A === B || g.rails.has(A) || g.rails.has(B)) {
    return notApplicable(`crystal pins a and b must be on two different non-rail nets (a: ${A ?? "none"}, b: ${B ?? "none"})`);
  }
  const casePins = xtal.pins.filter((p) => p.pin !== pinA && p.pin !== pinB);
  for (const p of casePins) {
    if (p.net === null || !g.groundRails.has(p.net)) return notApplicable(`case pin ${p.pin} is on ${p.net ?? "no net"}, not a ground rail`);
  }
  const others = g.units.filter((u) => u !== xtal);
  const capA = loadCapFor(others, A, g);
  const capB = loadCapFor(others, B, g);
  if (capA === null || capB === null || others.length !== 2 || capA.unit === capB.unit) {
    return notApplicable(`crystal needs one load capacitor from each crystal pin to ground (found: ${others.map((u) => u.part.label).join(", ") || "none"})`);
  }
  const libPin = (n: string) => {
    const lp = xtal.symbol.pins.find((p) => p.number === n);
    if (lp === undefined) throw new Error(`${xtal.symbol.libId} has no pin ${n}`);
    return lp;
  };
  const la = libPin(pinA);
  const lb = libPin(pinB);
  const origin: Point = { x: 0, y: 0 };
  const rot: Rotation | undefined = ROTATIONS.find((t) => {
    const ea = pinEnd(origin, t, la);
    const eb = pinEnd(origin, t, lb);
    return ea.y === eb.y && ea.x < eb.x;
  });
  if (rot === undefined) return notApplicable("crystal pins a and b cannot be put on one horizontal line");
  const aEnd = pinEnd(origin, rot, la);
  const bEnd = pinEnd(origin, rot, lb);
  const yC = aEnd.y;
  const placements: Placement[] = [{ part: xtal.part.label, unit: xtal.unit, at: origin, rot }];
  const wires: Wire[] = [];
  const anchors: Anchor[] = [];
  const stubbed = new Set<string>();
  for (const p of casePins) {
    const net = p.net;
    if (net === null) throw new Error("unreachable: case pins are on ground rails");
    const lp = libPin(p.pin);
    const end = pinEnd(origin, rot, lp);
    const key = pointKey(end);
    if (stubbed.has(key)) continue;
    stubbed.add(key);
    const side = pinSide(rot, lp);
    const off = offsetOf(side);
    const tip = { x: end.x + off.x, y: end.y + off.y };
    wires.push({ a: end, b: tip, net });
    anchors.push({ net, at: tip, side });
  }
  // The load capacitors stand beyond everything the crystal draws (its fields, pin text, case
  // grounds and their values), measured with a stub on each pin's line, so its fields keep off it.
  const lines: Wire[] = [{ a: aEnd, b: { x: aEnd.x - STUB, y: yC }, net: A }, { a: bEnd, b: { x: bEnd.x + STUB, y: yC }, net: B }];
  const reach = boundsOf(drawnBoxes({ ...g, units: [xtal] }, { placements, wires: [...wires, ...lines], anchors }));
  const extA = shuntExtent({ units: [capA.unit], node: A, far: capA.ground, side: "down" });
  const extB = shuntExtent({ units: [capB.unit], node: B, far: capB.ground, side: "down" });
  // One distance both sides, so the drawing stays symmetric about the crystal.
  const d = Math.max(PITCH, gridCeil(reach.maxX + GRID + extB.left - bEnd.x), gridCeil(aEnd.x - (reach.minX - GRID - extA.right)));
  const xA = aEnd.x - d;
  const xB = bEnd.x + d;
  wires.push({ a: aEnd, b: { x: xA, y: yC }, net: A }, { a: bEnd, b: { x: xB, y: yC }, net: B });
  for (const [x, net, load] of [[xA, A, capA], [xB, B, capB]] as const) {
    const o = orientTwoPin(load.unit, "vertical", net);
    placements.push({ part: load.unit.part.label, unit: load.unit.unit, at: { x: x - o.first.x, y: yC - o.first.y }, rot: o.rot });
    const bottom = { x, y: yC + o.span };
    const stubEnd = { x, y: bottom.y + STUB };
    wires.push({ a: bottom, b: stubEnd, net: load.ground });
    anchors.push({ net: load.ground, at: stubEnd, side: "down" });
    if (g.external.has(net)) {
      wires.push({ a: { x, y: yC }, b: { x, y: yC - STUB }, net });
      anchors.push({ net, at: { x, y: yC - STUB }, side: "up" });
    }
  }
  return { ok: true, layout: { placements, wires, anchors } };
}

export const crystal: Template = { id: "crystal", realise };
