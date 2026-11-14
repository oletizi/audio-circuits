/**
 * A refusal from the pour measurement, carrying WHICH guard refused - the shape
 * `./drc-refusal.ts` uses, and for its reason: a fixture stopped by an earlier
 * guard leaves a later one untested, and "it was refused" cannot tell the two
 * apart.
 *
 * THE GUARDS ARE A RUNTIME ARRAY AND THE TYPE IS DERIVED FROM IT, so a test can
 * iterate every guard and fail until a new one is accounted for.
 */
export const POUR_GUARDS = [
  /** The board file is missing, or is not a KiCad board this tool can read. */
  "board-unreadable",
  /** No zone on the ground net at all: there is no pour to measure. */
  "no-ground-zone",
  /** A ground zone with no saved fill on one of its layers: it was never refilled. */
  "zone-unfilled",
  /** Something the measurement needs is absent from the board or in a form it does not read. */
  "board-shape",
  /** The board has no U1, no ground pad on it, or no supply bypass capacitor to ask about. */
  "subject-missing",
  /** A bypass capacitor's ground pad is on the pour of no region U1 can reach and touches no track. */
  "bypass-unconnected",
] as const

export type PourGuard = (typeof POUR_GUARDS)[number]

export class PourRefusal extends Error {
  readonly guard: PourGuard

  constructor(guard: PourGuard, message: string) {
    super(`[${guard}] ${message}`)
    this.name = "PourRefusal"
    this.guard = guard
  }
}
