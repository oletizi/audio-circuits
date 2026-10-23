/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/opampStage.ts`, and DIVERGED
 * from it by Task 8 of the M1 schematic-authoring plan: its one refusal site forwards
 * `planStage`'s classified `Mismatch` instead of its bare reason.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * opamp-stage: one op-amp unit with + above - on the left and the output on the right. Each input
 * is fed by a chain ending at its pin (the inverting chain hangs below its line, the non-inverting
 * chain stands above its own), the feedback parts run as rows in a corridor below the body, and the
 * output chain leaves to the right. Every corridor vertical is split at every feedback row, so each
 * tap is a shared wire endpoint (KiCad 10's split-wire rule). The template routes only the IR's own
 * connections; `planStage` refuses any shape this layout cannot draw.
 */
import type { NetName } from "../../ir/types.ts";
import type { Anchor, BlockSubgraph, Placement, RealiseResult, Template, Wire } from "../block-types.ts";
import { chain, rowPitch, unitWidth, type ChainLayout, type ChainSpec } from "../chain-kit.ts";
import { libPinOf } from "../fanout-kit.ts";
import { GRID, gridCeil, pinEnd, pinSide, placeBox, type Point, type Side, type Um } from "../geometry.ts";
import { orientTwoPin, PITCH, STUB } from "../layout-kit.ts";
import { anchorsToSymbols, blockPowerLibs, labelRefsOf, powerText } from "../power-text.ts";
import { planStage, type StagePlan } from "./opamp-classify.ts";
import { labelBox, labelExtent, powerValueBox } from "../text-boxes.ts";

interface Drawn {
  readonly placements: Placement[];
  readonly wires: Wire[];
  readonly anchors: Anchor[];
}

const labelled = (g: BlockSubgraph, net: NetName): boolean => g.rails.has(net) || g.external.has(net);

const move = (p: Point, dx: Um, dy: Um): Point => ({ x: p.x + dx, y: p.y + dy });

/** Draw `layout` shifted so its local point `from` lands on `to`. */
function paste(layout: ChainLayout, from: Point, to: Point, out: Drawn): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  out.placements.push(...layout.placements.map((pl) => ({ ...pl, at: move(pl.at, dx, dy) })));
  out.wires.push(...layout.wires.map((w) => ({ ...w, a: move(w.a, dx, dy), b: move(w.b, dx, dy) })));
  out.anchors.push(...layout.anchors.map((a) => ({ ...a, at: move(a.at, dx, dy) })));
}

function offset(side: Side, d: Um): Point {
  switch (side) {
    case "left": return { x: -d, y: 0 };
    case "right": return { x: d, y: 0 };
    case "up": return { x: 0, y: -d };
    case "down": return { x: 0, y: d };
  }
}

/**
 * Supply pins of a single-unit op-amp: a stub outward along each pin's side to its power symbol.
 * Returns the lowest y its drawing reaches: the stub tips, the power glyphs and their values, and
 * the outline of any supply net drawn as a global label.
 */
function drawSupplies(plan: StagePlan, origin: Point, g: BlockSubgraph, out: Drawn): Um {
  const anchors: Anchor[] = [];
  for (const s of plan.supplies) {
    const lp = libPinOf(plan.amp, s.pin);
    const end = pinEnd(origin, plan.rot, lp);
    const side = pinSide(plan.rot, lp);
    const tip = move(end, offset(side, STUB).x, offset(side, STUB).y);
    out.wires.push({ a: end, b: tip, net: s.net });
    anchors.push({ net: s.net, at: tip, side });
  }
  out.anchors.push(...anchors);
  const libs = blockPowerLibs(g);
  const { powers, labels } = anchorsToSymbols(g, anchors, false);
  const texts = powers.map((p) => powerText(libs, p)).flatMap((t) => [t.glyph.maxY, powerValueBox(t.value, t.text).maxY]);
  const labelBottoms = labels.map((l) => labelBox(l).maxY);
  return Math.max(-Infinity, ...anchors.map((a) => a.at.y), ...texts, ...labelBottoms);
}

/**
 * Feedback rows in the corridor from A.x to xo, `pitch` apart, each unit centred between the
 * verticals (its fields above it clear both), the verticals split at every row; a follower's
 * single wire row.
 */
function drawFeedback(plan: StagePlan, A: Point, outPoint: Point, yf0: Um, pitch: Um, out: Drawn): void {
  const { n, o } = plan;
  const xo = outPoint.x;
  if (plan.follower) {
    out.wires.push({ a: A, b: { x: A.x, y: yf0 }, net: o });
    out.wires.push({ a: { x: A.x, y: yf0 }, b: { x: xo, y: yf0 }, net: o });
    out.wires.push({ a: { x: xo, y: yf0 }, b: outPoint, net: o });
    return;
  }
  let prev: Um | null = null;
  plan.feedback.forEach((u, k) => {
    const y = yf0 + pitch * k;
    const ori = orientTwoPin(u, "horizontal", n);
    const x0 = A.x + Math.floor((xo - A.x - ori.span) / (2 * GRID)) * GRID;
    out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x0 - ori.first.x, y: y - ori.first.y }, rot: ori.rot });
    if (A.x < x0) out.wires.push({ a: { x: A.x, y }, b: { x: x0, y }, net: n });
    if (x0 + ori.span < xo) out.wires.push({ a: { x: x0 + ori.span, y }, b: { x: xo, y }, net: o });
    out.wires.push({ a: { x: A.x, y: prev ?? A.y }, b: { x: A.x, y }, net: n });
    out.wires.push({ a: { x: xo, y: prev ?? outPoint.y }, b: { x: xo, y }, net: o });
    prev = y;
  });
}

function realise(g: BlockSubgraph): RealiseResult {
  const planned = planStage(g);
  // Site 1 of 1 in this file: a FORWARD of `planStage`'s mismatch, which is always
  // `not-applicable` - see `opamp-classify.ts`'s `refuse`. Nothing below this line can refuse:
  // once the stage is planned, every remaining failure in this template THROWS (a missing body
  // box, a symbol without a pin), and `selectRenderer` turns such a throw into `backend-raised`.
  if (!planned.ok) return { ok: false, mismatch: planned.mismatch };
  const plan = planned.plan;
  const { amp, rot, o, n, p } = plan;
  const origin: Point = { x: 0, y: 0 };
  const outEnd = pinEnd(origin, rot, libPinOf(amp, plan.pins.out));
  const invEnd = pinEnd(origin, rot, libPinOf(amp, plan.pins.inv));
  const nonEnd = pinEnd(origin, rot, libPinOf(amp, plan.pins.noninv));
  const out: Drawn = { placements: [{ part: amp.part.label, unit: amp.unit, at: origin, rot }], wires: [], anchors: [] };

  const A: Point = { x: invEnd.x - 2 * GRID, y: invEnd.y };
  out.wires.push({ a: A, b: invEnd, net: n });
  const supplyBottom = drawSupplies(plan, origin, g, out);

  const widest = Math.max(0, ...plan.feedback.map((u) => unitWidth(u, n)));
  const xo = Math.max(outEnd.x + PITCH, A.x + widest);
  const outPoint: Point = { x: xo, y: outEnd.y };
  out.wires.push({ a: outEnd, b: outPoint, net: o });
  const box = amp.symbol.boxes.get(amp.unit);
  if (box === undefined) throw new Error(`${amp.symbol.libId} has no body box for unit ${amp.unit}`);
  const bottom = gridCeil(Math.max(placeBox(origin, rot, box).maxY, supplyBottom));
  // The first row sits one pitch below the body and supply text, so its fields (above it) clear them as a row would.
  const pitch = rowPitch(plan.feedback.map((u) => ({ u, from: n })));
  const yf0 = plan.follower ? bottom + 3 * GRID : bottom + GRID + pitch;
  drawFeedback(plan, A, outPoint, yf0, pitch, out);

  if (plan.inv !== null) {
    const spec: ChainSpec = { ...plan.inv, parallelSide: "down", midAnchorSide: "down", first: "anchor", last: "open" };
    const last = plan.inv.steps[plan.inv.steps.length - 1];
    // A parallel last step would run its lead column down x = A.x, collinear with the corridor: end it one PITCH short.
    const bridge = last !== undefined && last.units.length > 1 && !plan.inv.shunts.some((s) => s.node === n);
    const end: Point = bridge ? { x: A.x - PITCH, y: A.y } : A;
    if (bridge) out.wires.push({ a: end, b: A, net: n });
    const l = chain(spec, g);
    paste(l, { x: l.lastX, y: l.mainY }, end, out);
  } else if (!plan.follower) {
    // The wire A → inv end is n's stub already: anchor at A, never a second collinear stub.
    out.anchors.push({ net: n, at: A, side: "left" });
  }

  if (plan.noninv !== null) {
    const l = chain({ ...plan.noninv, parallelSide: "up", midAnchorSide: "up", first: "anchor", last: "open" }, g);
    // Shunts hanging below the + line cross the - line: end the chain (whose fields stay left of its
    // end) left of the corridor at A.x and of n's label there, bridged along the + line.
    const crosses = plan.noninv.shunts.some((s) => s.side === "down");
    const nLabel = plan.inv === null && !plan.follower ? gridCeil(labelExtent(n, labelRefsOf(g, n))) : 0;
    const end: Point = crosses ? { x: Math.min(nonEnd.x, A.x - nLabel), y: nonEnd.y } : nonEnd;
    if (end.x < nonEnd.x) out.wires.push({ a: end, b: nonEnd, net: p });
    paste(l, { x: l.lastX, y: l.mainY }, end, out);
  } else {
    const tip = { x: nonEnd.x - STUB, y: nonEnd.y };
    out.wires.push({ a: nonEnd, b: tip, net: p });
    out.anchors.push({ net: p, at: tip, side: "left" });
  }

  const beyond: Point = { x: xo + PITCH, y: outEnd.y };
  if (plan.output !== null) {
    const l = chain({ ...plan.output, parallelSide: "up", midAnchorSide: "up", first: "column", last: "anchor" }, g);
    paste(l, { x: l.firstX, y: l.mainY }, outPoint, out);
    // A "column" first node with columns drops its first main-line piece: bridge xo to its first column piece.
    if (labelled(g, o) || plan.output.shunts.some((s) => s.node === o)) out.wires.push({ a: outPoint, b: beyond, net: o });
  } else if (labelled(g, o)) {
    out.wires.push({ a: outPoint, b: beyond, net: o });
    out.anchors.push({ net: o, at: beyond, side: "right" });
  }
  return { ok: true, layout: out };
}

export const opampStage: Template = { id: "opamp-stage", realise };
