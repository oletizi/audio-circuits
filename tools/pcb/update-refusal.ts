/**
 * A refusal from the headless "update PCB from schematic" tool, carrying WHICH
 * guard refused - the same shape, and for the same reason, as
 * `./drc-refusal.ts`: a fixture stopped by an earlier guard leaves a later one
 * completely untested, and "it was refused" cannot tell the two apart.
 *
 * Every guard here is distinct from a FAILURE. Either the board was updated and
 * the result verified, or the tool refused; `./update-cli.ts` exits 2 on any of
 * these. The one exception to that claim is named in
 * `./update-from-schematic.ts`'s header, where it can be read beside the code.
 *
 * THE GUARDS ARE A RUNTIME ARRAY AND THE TYPE IS DERIVED FROM IT, not the other
 * way round. A union type cannot be enumerated at runtime, so a test over "every
 * guard" would have to carry its own hand-written copy of the list - and a
 * twelfth guard added later would quietly escape it. With the array as the
 * source, `tests/pcb/update-scratch-retention.test.ts` iterates the real thing
 * and fails until the new guard is accounted for.
 */
export const UPDATE_GUARDS = [
  /** Could not even run: a missing board, a missing kicad-cli, an export or interpreter that would not start. */
  "invocation",
  /** R1: the exported netlist has no components. `kicad-cli sch export netlist` exits 0 on an empty schematic. */
  "netlist-components",
  /**
   * The exported netlist's `(node ...)` forms outnumber the parsed nets' members - connections lost in the
   * parse, a repeated net name being the known cause. R7's right-hand side comes from the text because of
   * this; see `exportedNodeCount` in `./update-io.ts`.
   */
  "netlist-nodes",
  /** A `.kicad_pcb` this tool cannot parse, input or written: raw reader errors are not a failure mode here. */
  "board-unreadable",
  /** R2: the input board already holds footprints. This tool does not do incremental updates. */
  "board-not-empty",
  /** R3: a footprint library nickname resolves in none of the `fp-lib-table` files searched. */
  "library-nickname",
  /** R4: a footprint name is not present in its resolved library directory. */
  "footprint-not-in-library",
  /** R5: a net member names an undeclared designator, or a pad the loaded footprint does not have. */
  "net-member",
  /** R6: the KiCad Python interpreter is missing or not executable. */
  "python-interpreter",
  /** R7: the written board's footprint or netted-pad count does not equal the netlist's. */
  "post-run-counts",
  /** R8: a key present in the input board's `(setup)` block is absent from the written board's. */
  "setup-block",
  /** A component the netlist gives no `(footprint)` for: there is nothing to place and nothing to guess. */
  "component-footprint",
] as const

export type UpdateGuard = (typeof UPDATE_GUARDS)[number]

export class UpdateRefusal extends Error {
  readonly guard: UpdateGuard

  /**
   * Whether this refusal left EVIDENCE in the run's scratch directory and named
   * it in its own message - so the directory must survive for a person to open.
   *
   * ASSERTED BY THE THROWER, NEVER INFERRED FROM THE MESSAGE. The first version
   * of this decided retention with `error.message.includes(scratch)`, which
   * reads as "follows from the fact" but is a string search: rewording any
   * refusal silently changed whether its evidence was kept, and only one of the
   * four scratch-keeping guards had a test, so nothing went red. A flag set at
   * the throw site is a fact the thrower states, and the cleanup reads that
   * instead of going looking in prose. Messages can then be reworded freely.
   *
   * `tests/pcb/update-scratch-retention.test.ts` holds both halves of the
   * contract over every guard in `UPDATE_GUARDS`: the directory survives exactly
   * when this is true, and a refusal that sets it does name a path inside the
   * scratch directory in its message.
   */
  readonly keepsEvidence: boolean

  constructor(guard: UpdateGuard, message: string, keepsEvidence = false) {
    super(`[${guard}] ${message}`)
    this.name = "UpdateRefusal"
    this.guard = guard
    this.keepsEvidence = keepsEvidence
  }
}
