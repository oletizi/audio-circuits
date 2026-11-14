/**
 * A refusal from the pour measurement, carrying WHICH guard refused - the shape
 * `./drc-refusal.ts` uses, and for its reason: a fixture stopped by an earlier
 * guard leaves a later one untested, and "it was refused" cannot tell the two
 * apart.
 *
 * THE GUARDS ARE A RUNTIME ARRAY AND THE TYPE IS DERIVED FROM IT, so a test can
 * iterate every guard and fail until a new one is accounted for.
 *
 * **A REFUSAL IS FOR WHAT MAKES EVERY FIGURE MEANINGLESS, AND ONLY THAT.** There
 * were six guards, and two of them - "this board has no U1 / through-hole ground
 * pad / bypass capacitor" and "a bypass capacitor's return is on neither pour nor
 * track" - threw away figures the board could perfectly well answer, so that one
 * absent subject silenced three others. Those are now `unavailable` readings
 * beside the figures that were measured (`./pour-types.ts`). What remains is a
 * board that cannot be read, has no ground zone, was never refilled, or holds
 * copper this reader does not understand.
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
