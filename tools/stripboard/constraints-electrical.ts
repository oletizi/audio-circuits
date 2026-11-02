/**
 * `HC1`, `HC2`, `HC3`, `HC7` and `HC8` - the five constraints about whether the
 * board CONDUCTS what the circuit says.
 *
 * WHY THIS GROUP IS THIS GROUP, and it is CRITERIA's own line rather than one
 * drawn for file size: *"HC1, HC2, HC3 and HC7 each read VeroRoute's own
 * conclusion, from the subsystem the optimiser perturbs, and that subsystem is
 * known to have a hole."* `HC8` is in the same group because it is the answer
 * to that - the same question asked of the copper instead, reconstructed
 * outside VeroRoute. Keeping the four and their check in one file puts the
 * dependence and its remedy in front of the same reader.
 *
 * `./constraints-physical.ts` holds the other five, which are about whether the
 * thing can be BUILT: the span bounds, the stock, and the pin patterns.
 * `./constraints.ts` is the surface both are reached through, and the module
 * comment there carries the rules this file is held to.
 */
import { describeVerdict, netlistEquivalence } from "./equivalence.ts"
import {
  broken,
  holds,
  type CheckInput,
  type ConstraintResult,
} from "./constraints-model.ts"

/**
 * `HC1` - **every net electrically whole**, *"because a board that does not
 * conduct has no cost worth reporting."* CRITERIA: *"`--check BOARD --netlist
 * NET` exits 0 and reports no `incomplete` net."*
 *
 * BOTH CLAUSES, because neither implies the other here: the exit code is
 * deliberately ambiguous in the binary (five different faults map to 1), and
 * the report body can name an incomplete net on a run that exited for a
 * different reason. Negative fixture: `incomplete-net`.
 */
export function hc1(input: CheckInput): ConstraintResult {
  const { status, incompleteNets } = input.checkReport
  if (status !== 0) {
    return broken(
      "HC1",
      `--check exited ${status} rather than 0, so this board is not whole. ` +
        (incompleteNets.length > 0
          ? `${incompleteNets.length} incomplete net(s): ${incompleteNets.join(", ")}.`
          : "The report names no incomplete net, so the cause is one of the other faults exit 1 " +
            "covers - an unreadable board, an unparseable netlist, or a structural problem."),
    )
  }
  if (incompleteNets.length > 0) {
    return broken(
      "HC1",
      `--check exited 0 and still reports ${incompleteNets.length} incomplete net(s): ` +
        `${incompleteNets.join(", ")}. The two signals disagree, so the board is not whole and ` +
        "the exit code is not the one to trust.",
    )
  }
  return holds("HC1", "--check exited 0 and its Layout state reports no incomplete net.")
}

/**
 * `HC2` - **cuts actually derivable**: `CUT_STATE COMPUTED`, *"never
 * `UNRESOLVED`, never `NOT_APPLICABLE`."*
 *
 * CRITERIA's reason, carried because the number looks fine without it: *"a zero
 * cut count on an unresolved board does not mean no cuts are needed, it means
 * they could not be worked out, and `C` is the count a derivation produced."*
 * Negative fixture: `cuts-unresolved`.
 */
export function hc2(input: CheckInput): ConstraintResult {
  const state = input.dump.cutState
  if (state !== "COMPUTED") {
    return broken(
      "HC2",
      `CUT_STATE ${state} is not COMPUTED, so this board's cut list is ABSENT rather than ` +
        `empty and the ${input.dump.cuts.length} CUT lines the dump prints are not a derivation's ` +
        "answer. A zero cut count here would read as a board needing no cuts.",
    )
  }
  return holds("HC2", `CUT_STATE COMPUTED, over ${input.dump.cuts.length} derived cut(s).`)
}

/**
 * `HC3` - **nothing floating**, *"and it is the overlap check too"*:
 * `CanPutDown` refuses a colliding placement, so an overlapping move yields a
 * floating part rather than an overlapping board.
 *
 * CRITERIA's "Checked by" is explicit that it is **two assertions**: *"the
 * `PART` line's placement field is not `FLOATING` **and** every placed part
 * prints its `PIN` lines - two assertions, so a change keeping one signal and
 * dropping the other fails loudly."* Both read `Component::GetIsPlaced()`, so
 * they are one signal reported twice rather than two witnesses - which is why
 * the detail names BOTH and `tests/stripboard/grade.test.ts` asserts both words
 * appear. Negative fixture: `floated-part`.
 */
export function hc3(input: CheckInput): ConstraintResult {
  const floating = input.dump.parts.filter((part) => part.placement === "floating")
  const placedWithNoPins = input.dump.parts.filter(
    (part) => part.placement !== "floating" && (input.dump.pins[part.ref] ?? []).length === 0,
  )
  if (floating.length > 0 || placedWithNoPins.length > 0) {
    return broken(
      "HC3",
      `signal 1, the PART line's placement field: ${floating.length} part(s) read FLOATING` +
        `${floating.length > 0 ? ` (${floating.map((part) => part.ref).join(", ")})` : ""}. ` +
        `signal 2, the PIN lines: ${placedWithNoPins.length} placed part(s) print none` +
        `${placedWithNoPins.length > 0 ? ` (${placedWithNoPins.map((part) => part.ref).join(", ")})` : ""}. ` +
        "Both derive from Component::GetIsPlaced(), so they are one signal reported twice; a " +
        "change keeping one and dropping the other fails loudly.",
    )
  }
  return holds(
    "HC3",
    `signal 1, the PART line's placement field: no part reads FLOATING. signal 2, the PIN ` +
      `lines: all ${input.dump.parts.length} placed part(s) print theirs.`,
  )
}

/**
 * `HC7` - **the layout still matches the circuit.** CRITERIA's "Checked by":
 * *"`--check`'s schematic-delta section is empty."*
 *
 * AN ABSENT HEADING IS EMPTY AND AN UNREADABLE REPORT IS NOT: `parseCheckReport`
 * owns that distinction, because *"a board whose circuit matches has no
 * `Schematic delta` section AT ALL - the heading is omitted, not left empty"*
 * and resolving an unreadable report to "no delta" is a skipped check that looks
 * like a passing one. Negative fixture: `schematic-delta`.
 */
export function hc7(input: CheckInput): ConstraintResult {
  const delta = input.checkReport.schematicDelta
  if (delta.length > 0) {
    return broken(
      "HC7",
      `--check reports a non-empty Schematic delta section of ${delta.length} line(s), so the ` +
        `layout no longer matches the circuit: ${delta.slice(0, 5).join("; ")}` +
        `${delta.length > 5 ? ` (and ${delta.length - 5} more)` : ""}.`,
    )
  }
  return holds(
    "HC7",
    "--check's Schematic delta section is empty - the heading is absent, which is what a " +
      "matching board prints rather than an empty section.",
  )
}

/**
 * `HC8` - **netlist equivalence, reconstructed from copper.**
 *
 * **IT IS HANDED `input.dumpText`, NEVER `input.dump`**, and this sentence is
 * here because the next author's reflex will be to reach for the parsed value
 * sitting right there in the same object. `netlistEquivalence`'s contract is
 * about the TEXT: two of its nine refusals - `missing-line` and
 * `unsupported-strip-axis` - are INEXPRESSIBLE through a `BoardDump`, which
 * carries a grid and a boolean axis by construction, so a pre-parsed call would
 * discard two of them and replace their wording with the parser's. Negative
 * fixture: `two-nets-shorted`.
 */
export function hc8(input: CheckInput): ConstraintResult {
  // A BOARD WHOSE CUTS ARE NOT COMPUTED HAS NO RECONSTRUCTABLE COPPER, and
  // `copperGraph` refuses it by name (`cuts-not-computed`) - correctly, because
  // under any state but COMPUTED the cut list is not emitted at all, so zero
  // CUT lines is indistinguishable from no cuts.
  //
  // THAT REFUSAL IS REPORTED AS A FAILURE HERE RATHER THAN THROWN, and the
  // distinction is the one this grader turns on. A throw says "this candidate
  // cannot be graded"; that is right for MISSING DATA, such as a footprint
  // nobody recorded (`PAR2`), because no verdict about the board is available.
  // An unresolved cut list is not missing data - it is a FACT ABOUT THE BOARD
  // that HC2 already names, and the honest verdict on equivalence is that it is
  // NOT ESTABLISHED. So HC8 does not hold, says why, and points at HC2 as the
  // constraint that owns the cause and the remedy.
  //
  // IT IS NOT A SKIP THAT LOOKS LIKE A PASS: `held` is false, so `A1` is false,
  // and the detail says equivalence was never computed rather than implying it
  // was computed and agreed.
  if (input.dump.cutState !== "COMPUTED") {
    return broken(
      "HC8",
      `equivalence was NOT established, because CUT_STATE ${input.dump.cutState} is not ` +
        "COMPUTED: under any state but COMPUTED the cut list is absent rather than empty, so " +
        "the copper cannot be reconstructed at all and no partition of the pins exists to " +
        "compare with the netlist. This is HC2's cause and HC2's remedy; HC8 reports that it " +
        "has no verdict rather than reporting agreement it did not compute.",
    )
  }
  const verdict = netlistEquivalence(input.dumpText, input.reference)
  if (!verdict.equivalent) {
    return broken(
      "HC8",
      `the copper does not partition the pins as the reference netlist does: ` +
        `${verdict.opens.length} open(s) and ${verdict.shorts.length} short(s). ` +
        describeVerdict(verdict).join(" "),
    )
  }
  return holds(
    "HC8",
    `the copper partitions all ${input.reference.size} reference nets' pins exactly as the ` +
      `netlist does - no open, no short - against geometry contract version ` +
      `${verdict.contractVersion}.`,
  )
}
