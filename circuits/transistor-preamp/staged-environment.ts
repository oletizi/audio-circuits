/**
 * The staged board's 24 V bench environment: the source, load, supply and
 * ground the board runs from on the bench, shared by everything that needs
 * to simulate it - the operating-point test
 * (tests/circuits/transistor-preamp-staged.test.ts) and the board's
 * `powerUpChecks()` (./staged-board.ts). One place to keep it correct: a
 * moved rail or a changed load would otherwise have to be edited in both
 * places in step, silently, or the two would drift apart unnoticed.
 */
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"

export const STAGED_BOARD_ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 10_000 },
  supplies: [{ port: "vcc", volts: 24 }],
  sweep: { pointsPerDecade: 20, startHz: 5, stopHz: 100_000 },
  groundPort: "ground",
}
