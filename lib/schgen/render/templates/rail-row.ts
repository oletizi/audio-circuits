/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/railRow.ts`, and DIVERGED
 * from it by Task 8 of the M1 schematic-authoring plan: its five refusal sites are classified and
 * `CommonRailLadder` carries a `Mismatch` rather than a bare reason.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * rail-row and decoupling-bank: two-terminal parts hung between one common net and their own
 * "other" nets, drawn as a two-row ladder. Neither template adds a connection: every row wire joins
 * pins the IR already puts on that net.
 *
 * **ALL FIVE REFUSALS ARE `not-applicable`**, three of them in `commonRailLadder` and two in
 * `decouplingBank`'s own pre-checks, and every one is decided before `ladder()` draws anything: a
 * part that is not two-terminal, a block with no parts, no net common to every part, a part that
 * is not a capacitor, a common net that is not a ground rail, an "other" net that is not a rail.
 * Each says *this block is not a rail row* (or not a decoupling bank), which leaves it to another
 * renderer rather than reporting a defect.
 */
import type { NetName } from "../../ir/types.ts";
import { notApplicable, type BlockSubgraph, type BlockUnit, type Mismatch, type RealiseResult, type Template } from "../block-types.ts";
import { ladder, otherNet, twoPinNets, type Rung } from "../layout-kit.ts";

export type CommonRailLadder =
  | { readonly ok: true; readonly common: NetName; readonly ground: boolean; readonly rungs: Rung[] }
  | { readonly ok: false; readonly mismatch: Mismatch };

/** A shape refusal of the ladder planner; see this module's header for why all of them are that. */
const notLadder = (reason: string): CommonRailLadder => ({ ok: false, mismatch: { kind: "not-applicable", reason } });

const byName = (a: NetName, b: NetName): number => (a < b ? -1 : a > b ? 1 : 0);

/** Ground rails first, then supply rails, then any other net; each tier by name. */
function pickCommon(g: BlockSubgraph, candidates: readonly NetName[]): NetName | undefined {
  const sorted = [...candidates].sort(byName);
  const ground = sorted.filter((n) => g.groundRails.has(n));
  const supply = sorted.filter((n) => g.rails.has(n) && !g.groundRails.has(n));
  const rest = sorted.filter((n) => !g.rails.has(n));
  return [...ground, ...supply, ...rest][0];
}

/** Equal "other" nets adjacent, those nets in first-appearance order (member order). */
function groupByOther(units: readonly BlockUnit[], common: NetName): BlockUnit[] {
  const order: NetName[] = [];
  const groups = new Map<NetName, BlockUnit[]>();
  for (const u of units) {
    const other = otherNet(u, common);
    const group = groups.get(other);
    if (group === undefined) {
      order.push(other);
      groups.set(other, [u]);
    } else {
      group.push(u);
    }
  }
  return order.flatMap((n) => groups.get(n) ?? []);
}

export function commonRailLadder(g: BlockSubgraph): CommonRailLadder {
  for (const u of g.units) {
    if (twoPinNets(u) === null) {
      return notLadder(`rail-row needs two-terminal parts with both pins connected; ${u.part.label}#${u.unit} has ${u.pins.length} pins`);
    }
  }
  const netSets = g.units.map((u) => new Set(twoPinNets(u)));
  const first = netSets[0];
  if (first === undefined) return notLadder("rail-row block has no parts");
  const candidates = [...first].filter((n) => netSets.every((s) => s.has(n)));
  const common = pickCommon(g, candidates);
  if (common === undefined) return notLadder("no net is common to every part");
  const ground = g.groundRails.has(common);
  const rungs: Rung[] = groupByOther(g.units, common).map((unit) => {
    const other = otherNet(unit, common);
    return ground
      ? { unit, row: 0, topNet: other, bottomNet: common }
      : { unit, row: 0, topNet: common, bottomNet: other };
  });
  return { ok: true, common, ground, rungs };
}

function realiseLadder(g: BlockSubgraph, plan: CommonRailLadder): RealiseResult {
  // A FORWARD of the planner's mismatch (one of the nine in the template set).
  if (!plan.ok) return { ok: false, mismatch: plan.mismatch };
  return { ok: true, layout: ladder({ rows: 2, rungs: plan.rungs }, g, { x: 0, y: 0 }) };
}

export const railRow: Template = {
  id: "rail-row",
  realise(g: BlockSubgraph): RealiseResult {
    return realiseLadder(g, commonRailLadder(g));
  },
};

export const decouplingBank: Template = {
  id: "decoupling-bank",
  realise(g: BlockSubgraph): RealiseResult {
    for (const u of g.units) {
      if (u.part.refPrefix !== "C") {
        return notApplicable(`decoupling-bank holds only capacitors; ${u.part.label} is ${u.part.refPrefix}`);
      }
    }
    const plan = commonRailLadder(g);
    // A FORWARD, then two shape tests of this template's own.
    if (!plan.ok) return { ok: false, mismatch: plan.mismatch };
    if (!plan.ground) return notApplicable("decoupling-bank needs every capacitor on one ground rail");
    for (const rung of plan.rungs) {
      if (!g.rails.has(rung.topNet)) {
        return notApplicable(`${rung.unit.part.label}'s other pin is on ${rung.topNet}, which is not a rail`);
      }
    }
    return realiseLadder(g, plan);
  },
};
