/**
 * The build checklist's `Fit` column: whether to fit a part row in the build
 * being built, on the four part sections (ICs and transistors; Resistors and
 * trim-pots; Capacitors; Wire-to-board junctions) and on **Wire links**,
 * because a zero-ohm stand-in part is routed into that section
 * (`./checklist.ts`'s module comment) and is exactly as conditional there as
 * it would be in its own part section. `./checklist.ts` appends this cell to
 * every row in those five sections. Solder bridges and Cuts get no column:
 * nothing has moved into them, and they have no group to belong to.
 *
 * **THE CELL IS A CONDITION, NOT A CLUSTER NAME.** A stand-in group's parts
 * sit on a board beside its own circuit, standing in for a section that is
 * absent from the bench in most builds, and until this column existed every
 * row - the board's own parts and every group's stand-ins alike - printed the
 * same checkbox. On `pultec-low-boost` that meant eight of its printed boxes
 * had to stay unticked in most builds, and an unticked box reads as
 * unfinished work, not as "this is scaffolding for a board not on the
 * bench". Printing `hi-boost` as the cell's value would not fix that: it is a
 * label the builder has to go look up elsewhere. `only with the hi-boost
 * group` is a sentence they can act on while holding a soldering iron, so
 * that is the cell's shape: `always` for a part in the board's own circuit,
 * `only with the <section> group` for one standing in for that absent
 * section.
 *
 * **MEMBERSHIP IS DERIVED ONCE, INTO A MAP, RATHER THAN SCANNED PER ROW.**
 * `groupMembership` walks the board's `ScaffoldDoc` - `BoardCircuit.scaffold`,
 * `tools/guide/circuit.ts`'s addition - exactly once per guide, building a
 * part id -> absent-section map that `fitCondition` then just looks up.
 *
 * **A BOARD WITH NO `ScaffoldDoc` STILL GETS THE COLUMN**, with every row
 * reading `always`: `groupMembership(undefined)` returns an empty map, so
 * every lookup misses. That is true of such a board - it has nothing to
 * populate - and it keeps one table shape across every board rather than
 * omitting the column for the boards that are not Pultec sections.
 */
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"

/**
 * The Fit cell for a part in the board's own circuit - not in any stand-in
 * group. Exported for `./checklist.ts`'s `W`-numbered wire rows, which are
 * never conditional and so never go through `fitCondition` at all - a wire
 * has no component id to look up.
 */
export const ALWAYS = "always"

/**
 * The part id -> absent section map, derived once from the board's
 * `ScaffoldDoc`. `undefined` scaffold - a board that declares no `SCAFFOLD`
 * at all - yields an empty map, so `fitCondition` resolves every row to
 * `ALWAYS`.
 */
export function groupMembership(scaffold: ScaffoldDoc | undefined): ReadonlyMap<string, string> {
  const membership = new Map<string, string>()
  if (scaffold === undefined) return membership
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) membership.set(partId, group.section)
  }
  return membership
}

/**
 * The Fit cell: a condition the builder can act on, not a cluster name they
 * would have to go look up. A component id absent from `membership` is in
 * the board's own circuit and is always fitted; one present in it is a
 * stand-in for that section's absence, fitted only when this build populates
 * that group.
 */
export function fitCondition(componentId: string, membership: ReadonlyMap<string, string>): string {
  const section = membership.get(componentId)
  return section === undefined ? ALWAYS : `only with the ${section} group`
}
