/**
 * A CELL WHOSE OWN NET REACHES TWO OF ITS OWN PINS - the shape `docs/known-gaps.md` **G94**
 * measured as NECESSARY for `elkjs`'s hitbox crash, on a different driver's graph than this one.
 *
 * Hand-written for Task 14 of the M1 schematic-authoring plan, under controller ruling **R30**.
 *
 * **THIS IS DIAGNOSTIC, NEVER A RULE, AND R30 SAYS SO IN TERMS.** `tools/schgen/elk/diagnose.ts`
 * prints `selfLoops`' result beside a raise so a reader can see whether the shape G94 measured is
 * PRESENT in the graph that produced THIS raise - it does not decide whether a block may be drawn,
 * nothing here refuses, and an EMPTY result is not clearance: it says only that this particular
 * raise's own block carries no such cell, not that the raise is unrelated to G94's family, and
 * certainly not that the block may be retried. G94's own "DECIDED" section gives the reasons a
 * retry is never on the table regardless of what this function reports.
 *
 * **STRUCTURAL, NOT SEMANTIC - AND DELIBERATELY WIDER THAN G94's OWN CASE.** G94's measured
 * instance is an op-amp's OUTPUT and INVERTING INPUT tied together (a unity-gain buffer) and a
 * pot's wiper strapped to one end (`circuits/pultec/electrical/three-band.ts`,
 * `circuits/transistor-preamp/parts.ts`). Neither role is visible here: `docs/known-gaps.md`
 * **G182** - `IrPart` carries no `ComponentKind`, so nothing downstream of the IR can ask "is this
 * pin an op-amp output." What IS visible, from `BlockUnit.pins` alone, is that a net reaches two
 * (or more) of one unit's own pins, which is the condition both of G94's real cases share and the
 * only one an `IrPin` list can answer. A diagnostic that reports a superset of the true condition
 * costs a reader an extra glance at a line that turns out not to matter; one that reports a
 * subset would silently drop the cell that explains a raise. The first is the right side to err on.
 */

import type { BlockSubgraph } from "../render/block-types.ts"
import type { NetName, PartLabel } from "../ir/types.ts"

/** Cells whose own net reaches two of their own pins: the condition G94 found NECESSARY. */
export interface SelfLoop {
  readonly part: PartLabel
  readonly unit: number
  readonly net: NetName
}

/**
 * Every `(part, unit, net)` whose unit carries two or more CONNECTED pins on `net`.
 *
 * Deterministic over `g.units`' own declared order - `subgraphOf`'s block-member order, not
 * re-sorted here - and, within a unit, over that unit's own nets sorted by name. Two calls over
 * the same subgraph therefore produce the identical list in the identical order, which is what a
 * diagnosis is compared and printed by.
 *
 * A pin with `net === null` (explicitly not connected) is not counted: it carries no edge and
 * cannot be the second end of a loop ELK ever has to route.
 */
export function selfLoops(g: BlockSubgraph): readonly SelfLoop[] {
  const out: SelfLoop[] = []
  for (const u of g.units) {
    const counts = new Map<NetName, number>()
    for (const pin of u.pins) {
      if (pin.net === null) continue
      counts.set(pin.net, (counts.get(pin.net) ?? 0) + 1)
    }
    const byNet = [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    for (const [net, count] of byNet) {
      if (count >= 2) out.push({ part: u.part.label, unit: u.unit, net })
    }
  }
  return out
}
