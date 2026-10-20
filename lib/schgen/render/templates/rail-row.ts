/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/railRow.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * rail-row and decoupling-bank: two-terminal parts hung between one common net and their own
 * "other" nets, drawn as a two-row ladder. Neither template adds a connection: every row wire joins
 * pins the IR already puts on that net.
 */
import type { NetName } from "../../ir/types.ts";
import { mismatch, type BlockSubgraph, type BlockUnit, type RealiseResult, type Template } from "../block-types.ts";
import { ladder, otherNet, twoPinNets, type Rung } from "../layout-kit.ts";

export type CommonRailLadder =
  | { readonly ok: true; readonly common: NetName; readonly ground: boolean; readonly rungs: Rung[] }
  | { readonly ok: false; readonly reason: string };

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
      return {
        ok: false,
        reason: `rail-row needs two-terminal parts with both pins connected; ${u.part.label}#${u.unit} has ${u.pins.length} pins`,
      };
    }
  }
  const netSets = g.units.map((u) => new Set(twoPinNets(u)));
  const first = netSets[0];
  if (first === undefined) return { ok: false, reason: "rail-row block has no parts" };
  const candidates = [...first].filter((n) => netSets.every((s) => s.has(n)));
  const common = pickCommon(g, candidates);
  if (common === undefined) return { ok: false, reason: "no net is common to every part" };
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
  if (!plan.ok) return mismatch(plan.reason);
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
        return mismatch(`decoupling-bank holds only capacitors; ${u.part.label} is ${u.part.refPrefix}`);
      }
    }
    const plan = commonRailLadder(g);
    if (!plan.ok) return mismatch(plan.reason);
    if (!plan.ground) return mismatch("decoupling-bank needs every capacitor on one ground rail");
    for (const rung of plan.rungs) {
      if (!g.rails.has(rung.topNet)) {
        return mismatch(`${rung.unit.part.label}'s other pin is on ${rung.topNet}, which is not a rail`);
      }
    }
    return realiseLadder(g, plan);
  },
};
