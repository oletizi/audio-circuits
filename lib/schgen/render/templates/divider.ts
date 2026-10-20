/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/divider.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * divider: a series chain of two-terminal steps from a top net down to a tap net, with every part
 * between the tap and the ground rail hung below it. Draws a vertical ladder; adds no connection.
 */
import type { NetName } from "../../ir/types.ts";
import { mismatch, type BlockSubgraph, type BlockUnit, type RealiseResult, type Template } from "../block-types.ts";
import { ladder, twoPinNets, type Rung } from "../layout-kit.ts";

function realise(g: BlockSubgraph): RealiseResult {
  for (const u of g.units) {
    if (twoPinNets(u) === null) {
      return mismatch(`divider needs two-terminal parts with both pins connected; ${u.part.label}#${u.unit} has ${u.pins.length} pins`);
    }
  }
  const nets = (u: BlockUnit): readonly [NetName, NetName] => {
    const n = twoPinNets(u);
    if (n === null) throw new Error("unreachable: checked above");
    return n;
  };
  const grounds = [...new Set(g.units.flatMap((u) => nets(u).filter((n) => g.groundRails.has(n))))];
  const B = grounds[0];
  if (grounds.length !== 1 || B === undefined) {
    return mismatch(`divider needs exactly one ground rail among its nets (found: ${grounds.join(", ") || "none"})`);
  }
  const eB = g.units.filter((u) => nets(u).includes(B));
  const tops = [...new Set(eB.map((u) => (nets(u)[0] === B ? nets(u)[1] : nets(u)[0])))];
  const n = tops[0];
  if (tops.length !== 1 || n === undefined) return mismatch(`parts to ${B} start from different nodes (${tops.join(", ")})`);
  const rest = g.units.filter((u) => !eB.includes(u));
  if (rest.length === 0) return mismatch(`divider needs at least one part above ${n}`);
  const pairKey = (u: BlockUnit) => [...nets(u)].sort().join("|");
  const path: Array<{ units: BlockUnit[]; upper: NetName; lower: NetName }> = [];
  const used = new Set<BlockUnit>();
  let cur = n;
  for (;;) {
    const touching = rest.filter((u) => !used.has(u) && nets(u).includes(cur));
    const steps = [...new Set(touching.map(pairKey))];
    const stepKey = steps[0];
    if (stepKey === undefined) break;
    if (steps.length > 1) return mismatch(`the parts above ${n} do not form a simple chain (node ${cur} has ${steps.length} parts)`);
    const units = touching.filter((u) => pairKey(u) === stepKey);
    for (const u of units) used.add(u);
    const first = nets(units[0]!);
    const upper = first[0] === cur ? first[1] : first[0];
    path.push({ units, upper, lower: cur });
    cur = upper;
  }
  if (used.size !== rest.length) {
    return mismatch(`the parts above ${n} do not form a simple chain (unreached: ${rest.filter((u) => !used.has(u)).map((u) => u.part.label).join(", ")})`);
  }
  const down = [...path].reverse();
  const rungs: Rung[] = down.flatMap((s, i) => s.units.map((unit) => ({ unit, row: i, topNet: s.upper, bottomNet: s.lower })));
  for (const u of eB) rungs.push({ unit: u, row: down.length, topNet: n, bottomNet: B });
  return { ok: true, layout: ladder({ rows: down.length + 2, rungs }, g, { x: 0, y: 0 }) };
}

export const divider: Template = { id: "divider", realise };
