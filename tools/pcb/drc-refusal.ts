/**
 * A refusal from the parity-and-DRC check, carrying WHICH guard refused.
 *
 * `guard` is a closed set so a test can assert the guard that fired and not
 * only that something did: a fixture stopped by an earlier guard leaves a later
 * one completely untested, and "it was refused" cannot tell the two apart.
 */
export type DrcGuard =
  | "leg1-netlist-components"
  | "leg2-parity-fetch-diagnostic"
  | "process-exit"
  | "report-unreadable"
  | "report-shape"
  | "severity-coverage"
  | "ignored-checks"
  | "project-config"
  | "schematic-pairing"
  | "kicad-version"
  | "invocation"

export class DrcRefusal extends Error {
  readonly guard: DrcGuard

  constructor(guard: DrcGuard, message: string) {
    super(`[${guard}] ${message}`)
    this.name = "DrcRefusal"
    this.guard = guard
  }
}
