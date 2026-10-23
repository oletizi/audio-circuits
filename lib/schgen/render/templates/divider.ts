/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/divider.ts`, and DIVERGED
 * from it by Task 8 of the M1 schematic-authoring plan: its six `mismatch(...)` sites are
 * classified.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * divider: a series chain of two-terminal steps from a top net down to a tap net, with every part
 * between the tap and the ground rail hung below it. Draws a vertical ladder; adds no connection.
 *
 * **ALL SIX REFUSALS ARE `not-applicable`, AND THEY ARE ALL THE SAME KIND OF SENTENCE**: this
 * block is not a divider. Every one of them is decided from `g.units` and `g.groundRails` before
 * `ladder()` is called, so nothing has been drawn and there is no geometry to contradict - the
 * block may still be a rail row, a chain, or something only ELK can draw.
 */
import type { NetName } from "../../ir/types.ts";
import { notApplicable, type BlockSubgraph, type BlockUnit, type RealiseResult, type Template } from "../block-types.ts";
import { ladder, twoPinNets, type Rung } from "../layout-kit.ts";

function realise(g: BlockSubgraph): RealiseResult {
  for (const u of g.units) {
    if (twoPinNets(u) === null) {
      return notApplicable(`divider needs two-terminal parts with both pins connected; ${u.part.label}#${u.unit} has ${u.pins.length} pins`);
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
    return notApplicable(`divider needs exactly one ground rail among its nets (found: ${grounds.join(", ") || "none"})`);
  }
  const eB = g.units.filter((u) => nets(u).includes(B));
  const tops = [...new Set(eB.map((u) => (nets(u)[0] === B ? nets(u)[1] : nets(u)[0])))];
  const n = tops[0];
  if (tops.length !== 1 || n === undefined) return notApplicable(`parts to ${B} start from different nodes (${tops.join(", ")})`);
  const rest = g.units.filter((u) => !eB.includes(u));
  if (rest.length === 0) return notApplicable(`divider needs at least one part above ${n}`);
  const pairKey = (u: BlockUnit) => [...nets(u)].sort().join("|");
  const path: Array<{ units: BlockUnit[]; upper: NetName; lower: NetName }> = [];
  const used = new Set<BlockUnit>();
  let cur = n;
  for (;;) {
    const touching = rest.filter((u) => !used.has(u) && nets(u).includes(cur));
    const steps = [...new Set(touching.map(pairKey))];
    const stepKey = steps[0];
    if (stepKey === undefined) break;
    if (steps.length > 1) return notApplicable(`the parts above ${n} do not form a simple chain (node ${cur} has ${steps.length} parts)`);
    const units = touching.filter((u) => pairKey(u) === stepKey);
    for (const u of units) used.add(u);
    const first = nets(units[0]!);
    const upper = first[0] === cur ? first[1] : first[0];
    path.push({ units, upper, lower: cur });
    cur = upper;
  }
  if (used.size !== rest.length) {
    return notApplicable(`the parts above ${n} do not form a simple chain (unreached: ${rest.filter((u) => !used.has(u)).map((u) => u.part.label).join(", ")})`);
  }
  const down = [...path].reverse();
  const rungs: Rung[] = down.flatMap((s, i) => s.units.map((unit) => ({ unit, row: i, topNet: s.upper, bottomNet: s.lower })));
  for (const u of eB) rungs.push({ unit: u, row: down.length, topNet: n, bottomNet: B });
  return { ok: true, layout: ladder({ rows: down.length + 2, rungs }, g, { x: 0, y: 0 }) };
}

export const divider: Template = { id: "divider", realise };
