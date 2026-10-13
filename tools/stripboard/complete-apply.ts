/**
 * PRODUCING one completion-pass candidate: the wires, in order, and the one
 * `--update` that assigns them to their net.
 *
 * **SPLIT FROM `./complete.ts` FOR THE 500-LINE CEILING, at the same seam
 * `./moves.ts` and `./moves-apply.ts` are split at**: that file answers *which
 * candidate do we take* and this one answers *how is one candidate produced*.
 * `./complete.ts` stays the module a consumer imports and re-exports both of
 * these, so the pass's interface is unchanged.
 *
 * `assignNodes` below is the whole reason this file exists at all rather than
 * being two lines in the loop. Read its comment before changing anything here:
 * without that one invocation the pass closes nothing, and it looks from the
 * outside exactly as though no wire helped.
 */
import path from "node:path"
import type { NetJoinPlan } from "./complete-joins.ts"
import { applyMove } from "./moves.ts"
import type { SpawnVeroroute } from "./seed.ts"

/** What `assignNodes` needs of the pass's input: the netlist `--update` reconciles against. */
export interface AssignInput {
  readonly netlist: string
}

/**
 * Apply a plan's wires to `board` in order, returning the candidate board.
 *
 * Each wire reads the previous one's output and only the LAST writes the
 * candidate, which is `applyMove`'s own discipline for a compound gesture
 * carried up one level: a refused wire leaves the candidate absent and the
 * staged files beside it say how far the sequence got.
 */
export function applyWires(
  board: string,
  plan: NetJoinPlan,
  runDir: string,
  tag: string,
  spawn: SpawnVeroroute,
): string {
  const candidate = path.join(runDir, `${tag}.vrt`)
  let current = board
  plan.wires.forEach((wire, index) => {
    const out =
      index === plan.wires.length - 1 ? candidate : path.join(runDir, `${tag}-w${index}.vrt`)
    applyMove(current, wire, out, spawn)
    current = out
  })
  return candidate
}

/**
 * The candidate with its new wires RECONCILED TO THE NETLIST: one `--update`,
 * and without it the whole pass is inert.
 *
 * **THIS IS THE DEFECT THE FIRST SWEEP FOUND, AND IT IS WORTH STATING AT
 * LENGTH, because the pass looked like it was working.** A wire added by
 * `--author --op add-wire` lands on holes carrying **no node id**, and
 * `--check`'s completeness reads node ids: `Board::CheckAllComplete` floods from
 * each net's pins and a hole on no net is not a hole the flood may enter. So a
 * wire that physically joins two of a net's pins leaves `--check` reporting that
 * net incomplete, `openNets` unchanged and `F` up by `ρ_w` - which the
 * acceptance rule then correctly rejects. **Measured on `constructed` seed 0's
 * best board:** one wire placed by hand down column 33 from row 0 to row 8
 * landed exactly where the plan said (`WIRE Wire1 AT 0,33 ENDS 0,33,0,0
 * 8,33,0,0`), put `C23.2` and `SW_LO_BOOST.7` in ONE copper component by
 * `copperGraph`'s reconstruction - and `--check` still called `j10_p6`
 * incomplete, with the cut count unchanged at ten. After `--update` the same
 * wire reads `ENDS 0,33,7,7` and **`j10_p6` is complete.**
 *
 * **THE CONTROL that says this is about the node id and not about wires in
 * general:** `boards/transistor-preamp-feedback` carries four wires whose
 * `ENDS` report a non-zero node id on both ends, and `--check` passes that board.
 *
 * **IT IS APPLIED TO THE CANDIDATE AND NOT INSIDE `measure`, deliberately, AND
 * THAT IS STILL TRUE NOW THAT THE MAIN SEARCH CALLS IT TOO.** The `--update` is
 * part of PRODUCING a candidate - a wire nothing has assigned to a net is an
 * unconnected jumper rather than a candidate - so it belongs beside the gestures
 * and not inside the measurement, and `measure` is untouched. `./climb.ts` calls
 * this for every move `addsWire` names, which is `add-wire` and `spread`; a
 * candidate that adds no wire costs the same four invocations it always did, and
 * one that adds a wire costs five.
 *
 * **WHAT THAT MOVED IN THE RECORD, named rather than left for a reader to
 * notice:** every `add-wire` candidate in the sweeps up to
 * `docs/stripboard/pipeline-verification.md` §6.10 was scored WITHOUT this
 * invocation, which is why §6.9 could count 7,417 of them and report `W = 0` on
 * every best board. §6.11 is the first sweep in which a wire candidate's join is
 * visible to `--check` at all, so a comparison across that boundary is comparing
 * two different scorings of the same gesture.
 *
 * **AND THE UNPAINTED, UN-UPDATED BOARD IS WHAT THE NEXT ROUND GESTURES ON.**
 * `--update` runs `AutoFillVero` itself, so its output is PAINTED, and a gesture
 * on a painted board is refused where it overlaps a part's own footprint
 * (`Measured.source` carries that measurement). The pass therefore keeps two
 * files per candidate and `Standing` names which is which.
 *
 * **THE START BOARD IS NOT UPDATED, AND THAT IS CHECKED RATHER THAN ASSUMED.**
 * The before figure has to be the same quantity route 1 reported, which is
 * autofill-then-check with no `--update`. Measured on `constructed` seed 0's
 * best board: the check report is byte-identical with and without the
 * `--update`, and so is the cut count - which is what a board with no added wire
 * should do, and is why the before and after columns are comparable.
 */
export function assignNodes(
  candidate: string,
  input: AssignInput,
  runDir: string,
  tag: string,
  spawn: SpawnVeroroute,
): string {
  const assigned = path.join(runDir, `${tag}-updated.vrt`)
  const args = ["--update", candidate, "--netlist", input.netlist, "-o", assigned]
  const result = spawn(args)
  if (result.status !== 0) {
    throw new Error(
      `completionPass: --update exited ${result.status} on ${candidate}, so this candidate's ` +
        `wires were never assigned to a net and it was not measured. The invocation was: ` +
        `${args.join(" ")}\n${result.stdout}${result.stderr}\nIt is NOT retried and the ` +
        "candidate is NOT measured without it: a wire on holes carrying no node id is invisible " +
        "to --check's completeness, so scoring it would price a repair the board does not have " +
        "and report this pass as having closed nothing. --update rewrites a board's component " +
        "set from the netlist, so a refusal here is most likely HC7's own fault - the board and " +
        "the circuit disagree - and the remedy is upstream of this pass.",
    )
  }
  return assigned
}

