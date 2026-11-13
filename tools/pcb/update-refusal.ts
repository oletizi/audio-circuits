/**
 * A refusal from the headless "update PCB from schematic" tool, carrying WHICH
 * guard refused - the same shape, and for the same reason, as
 * `./drc-refusal.ts`: a fixture stopped by an earlier guard leaves a later one
 * completely untested, and "it was refused" cannot tell the two apart.
 *
 * Every guard here is distinct from a FAILURE. There is no failure mode in this
 * tool: either the board was updated and the result verified, or the tool
 * refused. `tools/pcb/update-cli.ts` exits 2 on any of these.
 */
export type UpdateGuard =
  /** Could not even run: a missing board, a missing kicad-cli, an export or interpreter that would not start. */
  | "invocation"
  /** R1: the exported netlist has no components. `kicad-cli sch export netlist` exits 0 on an empty schematic. */
  | "netlist-components"
  /** R2: the input board already holds footprints. This tool does not do incremental updates. */
  | "board-not-empty"
  /** R3: a footprint library nickname resolves in none of the `fp-lib-table` files searched. */
  | "library-nickname"
  /** R4: a footprint name is not present in its resolved library directory. */
  | "footprint-not-in-library"
  /** R5: a net member names an undeclared designator, or a pad the loaded footprint does not have. */
  | "net-member"
  /** R6: the KiCad Python interpreter is missing or not executable. */
  | "python-interpreter"
  /** R7: the written board's footprint or netted-pad count does not equal the netlist's. */
  | "post-run-counts"
  /** R8: a key present in the input board's `(setup)` block is absent from the written board's. */
  | "setup-block"
  /** A component the netlist gives no `(footprint)` for: there is nothing to place and nothing to guess. */
  | "component-footprint"

export class UpdateRefusal extends Error {
  readonly guard: UpdateGuard

  constructor(guard: UpdateGuard, message: string) {
    super(`[${guard}] ${message}`)
    this.name = "UpdateRefusal"
    this.guard = guard
  }
}
