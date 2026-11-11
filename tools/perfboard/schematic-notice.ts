/**
 * The notice a board prints when its `perfboard.json` declares no
 * `sch`/`netlist` pair.
 *
 * `sch`/`netlist` stay OPTIONAL (see `./declaration.ts`'s own comment): a
 * clone of this repository without the schematic's own separate repository
 * checked out must still be able to run `make check` against the checked-in
 * netlist fixture. That optionality is sound. What was NOT sound is that a
 * board declaring neither got no freshness guard at all, and nothing said
 * so - `make check` printed `ok <path>` in exactly the words it uses for a
 * board that WAS compared against its schematic. A skipped check that looks
 * identical to a passing one is the precise failure shape this whole
 * workflow exists to prevent, and it was living in the workflow's own
 * plumbing.
 *
 * This function is the fix: it is called (from `make/board.mk`'s
 * `netlist-agrees`, through the CLI's `schematic-notice` verb) ONLY on the
 * branch where no `sch`/`netlist` pair was declared, so a board that DOES
 * declare the pair never sees this text - printing it unconditionally would
 * train an operator to ignore it. The notice itself is deliberately loud
 * (a `NOTICE:` header of its own, distinct from `ok <path>` and `FAIL
 * <path>`) and teaches all three things a refusal in this repository always
 * teaches: the thing (no schematic was declared), the observed state (the
 * circuit was not compared to one, so drift cannot have been caught), and
 * the fix (declare `sch`/`netlist` in this exact file).
 */

import type { BoardKind } from "./declaration.ts"

/**
 * The notice's lines, in print order, for `perfboardJsonPath`.
 *
 * **THE WORDING DEPENDS ON THE BOARD'S KIND, because the perfboard wording is false for a
 * `pcb` board.** The perfboard text says the check that follows "still ran, against the layout
 * this board was built from". A `pcb` board has no layout, so that sentence would claim a check
 * ran that did not - a skipped check looking like a passing one. A pcb board's notice says
 * instead what did and did not run: no layout check exists for the kind, and the board's own
 * `tests/circuits/<board>.test.ts` is what `make check` runs.
 */
export function schematicNoticeLines(perfboardJsonPath: string, kind: BoardKind): string[] {
  if (kind === "pcb") {
    return [
      `NOTICE: ${perfboardJsonPath} declares no "sch"/"netlist" pair.`,
      "  This run did NOT compare the circuit against any schematic, so drift between the",
      "  circuit and its schematic source cannot have been detected here.",
      '  This board is kind "pcb": no layout check exists for this kind, so none ran or will run.',
      "  What `make check` runs instead is this board's own tests/circuits/<board>.test.ts, and that",
      "  is the only check behind an `ok` from it.",
      `  Declare "sch" and "netlist" in ${perfboardJsonPath} to enable the schematic comparison.`,
    ]
  }
  return [
    `NOTICE: ${perfboardJsonPath} declares no "sch"/"netlist" pair.`,
    "  This run did NOT compare the circuit against any schematic, so drift between the",
    "  circuit and its schematic source cannot have been detected here. That is a legitimate",
    "  configuration, not a failure - the check below still ran, against the layout this",
    "  board was built from, and still exits 0 on a clean result.",
    `  Declare "sch" and "netlist" in ${perfboardJsonPath} to enable that comparison.`,
  ]
}
