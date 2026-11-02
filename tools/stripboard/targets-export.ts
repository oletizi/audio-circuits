/**
 * `P0`'s targets for a board whose MODEL is only available as a netlist export,
 * and the strip count a frozen board's own dump reports.
 *
 * **IT EXISTS FOR ONE BOARD AND SAYS SO.** `B1-frozen` is stated against *"the
 * exact electrical model, footprints and board dimensions the hand layout was
 * built for - 9 nets, 27 pins"*, and the only form of that model this
 * repository keeps is `tests/fixtures/stripboard/pultec-low-boost-frozen.netlist`
 * - an EESchema v1.1 export taken at commit `2f62ee1`. Importing the model
 * itself would need a checkout of that commit; re-exporting from today's model
 * would restate the benchmark against a 14-net circuit, which the fixture's own
 * provenance forbids. So the targets for that run are derived from the export,
 * through `deriveTargetsFrom` and therefore through the same graph, ordering,
 * `N`, `P` and `C_floor` as a model-derived board's.
 *
 * **WHAT THE EXPORT CANNOT SAY, AND WHO SAYS IT INSTEAD.** EESchema v1.1 has no
 * footprint field - `tests/stripboard/checkpoint-fixtures.ts` measured that and
 * it is why low-boost was out of CHECKPOINT 1 - so *which components sit on the
 * board* is not in the file. It comes from the caller's footprint map, which is
 * the same map the grader is handed, and a component absent from it is off-board
 * exactly as `onBoard` reads a model component with a `part.symbol` and no
 * `part.footprint`. **A caller that passes an empty map therefore gets
 * `targets-residency` rather than a board of nothing**, which is the refusal
 * that would otherwise have to be re-stated here.
 */
import { boardGeometry } from "./copper.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { deriveTargetsFrom, type BoardTargets, type TargetComponent } from "./targets.ts"

/** The refusals this module raises. One arm each in `notDefaultedBecause`. */
export type TargetsExportRefusal = "export-pin-unqualified" | "export-empty"

function notDefaultedBecause(refusal: TargetsExportRefusal): string {
  switch (refusal) {
    case "export-pin-unqualified":
      return (
        "Every member of a reference net is a ref.pin pair - that is what makes HC8's " +
        "partition comparable with the board's own PIN lines - and a member with no pin " +
        "cannot be attributed to a component, so P would count a pin belonging to nobody and " +
        "the net graph would gain an edge from a part nobody can name. It is NOT defaulted to " +
        "treating the whole string as a component with one pin: that invents a part, and a " +
        "part invented here would carry an edge into the arrangement the board has no " +
        "component to justify. Fix the export, or the reader that produced these names " +
        "(tools/stripboard/equivalence.ts's referenceNetsFromExport)."
      )
    case "export-empty":
      return (
        "A reference with no nets would derive N = 0, a floor of max(0, -R) = 0 and an empty " +
        "arrangement, and every board would then be at its own floor - a pass that looks " +
        "exactly like a real one, which is the shape equivalence.ts's empty-reference refusal " +
        "exists for. It is NOT defaulted: pass the nets of the netlist export, or fix the " +
        "export that produced none."
      )
  }
}

function refuse(refusal: TargetsExportRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(PIPELINE P0 is the authority for the targets, and tools/stripboard/targets.ts's " +
      "deriveTargetsFrom is the only implementation of them.)",
  )
}

/**
 * Every component the export names, with the nets its pins name and whether the
 * footprint map says it is on the board.
 *
 * The component of `"C18.1"` is `C18`, split at the LAST dot: a pin name may not
 * contain one, and a designator could. Both lists are sorted, so the record a
 * run writes is a function of the export's content and not of its line order.
 */
export function targetComponentsFromReference(
  reference: ReferenceNets,
  footprints: ReadonlyMap<string, string>,
): readonly TargetComponent[] {
  if (reference.size === 0) {
    refuse("export-empty", "the reference netlist has no nets")
  }
  const pinNets = new Map<string, string[]>()
  for (const [net, pins] of [...reference].sort(([left], [right]) => (left < right ? -1 : 1))) {
    for (const pin of [...pins].sort()) {
      const cut = pin.lastIndexOf(".")
      if (cut <= 0 || cut === pin.length - 1) {
        refuse("export-pin-unqualified", `reference net "${net}" names the member "${pin}"`)
      }
      const ref = pin.slice(0, cut)
      const existing = pinNets.get(ref)
      if (existing === undefined) pinNets.set(ref, [net])
      else existing.push(net)
    }
  }
  return [...pinNets.keys()]
    .sort()
    .map((ref) => ({
      id: ref,
      pinNets: pinNets.get(ref) ?? [],
      onBoard: footprints.has(ref),
    }))
}

/** `P0`'s targets for a board the caller has only as an export. */
export function targetsFromReference(
  reference: ReferenceNets,
  footprints: ReadonlyMap<string, string>,
  strips: number,
  board: string,
): BoardTargets {
  return deriveTargetsFrom(targetComponentsFromReference(reference, footprints), strips, board)
}

/**
 * `R` for a board whose dimensions are a fact about the board itself: the holes
 * ACROSS its strips, which is its `GRID` row count under horizontal strips and
 * its column count under vertical ones.
 *
 * **IT READS THE DUMP'S OWN `GRID` LINE AND NEVER A LITERAL** - Task 5's rule
 * for the frozen fixture verbatim: *"no grid figure is restated in any test;
 * the fixture's own `GRID` line is the authority"*. The axis is
 * `VERTICAL_STRIPS`, the same definition `occupiedStrips` and `HC8` use, read
 * through `boardGeometry` so a dump that states neither line refuses here
 * rather than being counted on an assumed axis.
 */
export function stripsAcross(dumpText: string): number {
  const dump = boardGeometry(dumpText)
  return dump.verticalStrips ? dump.grid.cols : dump.grid.rows
}
