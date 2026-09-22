/**
 * Thin test-side wrappers over `resolveNetwork` + `toSpiceNetlist` +
 * `runAcSweep`, so a circuit test reads as a measurement rather than as deck
 * plumbing. `deckFor` has two callers - `tests/circuits/opamp-buffer.test.ts`
 * and `tests/circuits/optical-compressor.test.ts`; `acSweepOf` has one,
 * `tests/circuits/opamp-buffer.test.ts`. The compressor emits decks but runs no
 * sweep: its only behavioural assertion is an operating point, which needs a
 * hand-built deck (`toSpiceNetlist` requires a sweep and emits `.ac`
 * unconditionally, so nothing here can reach `.op`).
 *
 * `acSweepOf` deliberately takes a whole `SimulationEnvironment` rather than a
 * convenience shape naming just an input and an output. `toSpiceNetlist`
 * resolves THREE ports before it emits anything - ground, source and load -
 * and throws if any is missing, so a two-port argument would let every caller
 * compile and then fail at run time with "Ground port not present in
 * network". `SimulationEnvironment` makes all three required fields, which
 * turns that mistake into a type error at the call site instead.
 *
 * Nothing here defaults a source, a load, a sweep or a supply. Those are
 * modelling choices and each test states its own, as the existing fixtures in
 * tests/sim/netlist.test.ts do.
 */
import { expect } from "bun:test"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import type { Network } from "../../lib/model/types.ts"
import { spiceNodeName, toSpiceNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { AcSweep } from "../../lib/sim/ac.ts"

/** The deck `acSweepOf` would run, for a test that wants to assert on the
 * emitted text - whether or not it goes on to run a sweep. Separating the two
 * is what lets a test assert on a deck it never runs, and what lets a test
 * assert that emission THROWS, which is the only thing to assert about a
 * circuit naming a device model this repository does not carry. */
export function deckFor(
  network: Network,
  state: ControlState,
  environment: SimulationEnvironment,
): string {
  return toSpiceNetlist(resolveNetwork(network, state), environment)
}

/** Runs an AC sweep of `network` and returns the sweep at the LOAD port's
 * node - the output the environment already had to name. Control state is an
 * explicit argument, never defaulted: a circuit with a pot has no meaningful
 * "no settings" reading, and the Pultec reference network has SIX of them -
 * `reference/pultec/controls.ts`'s `POTS` lists five, and
 * `reference/pultec/three-band.ts` declares a sixth, `RV_MID`, from
 * documentation rather than from the netlist. No circuit in `circuits/`
 * declares one:
 * `pt2399-core.ts`'s delay-time control reaches the board through its header's
 * `VCO` pin rather than sitting on it, and `opamp-buffer.ts` has no control at
 * all. (The optical
 * compressor does NOT: spec section 10 makes both its panel pots external
 * controls reached through connectors, so it declares no `potentiometer` and
 * every one of its call sites passes `NO_CONTROLS`. That is a circuit whose
 * control state is genuinely empty, not one that was allowed to omit it.)
 */
export async function acSweepOf(
  network: Network,
  state: ControlState,
  environment: SimulationEnvironment,
): Promise<AcSweep> {
  const resolved = resolveNetwork(network, state)
  const outputNet = resolved.ports[environment.load.port]
  if (outputNet === undefined) {
    throw new Error(`Load port not present in network: ${environment.load.port}`)
  }
  const groundNet = resolved.ports[environment.groundPort]
  if (groundNet === undefined) {
    throw new Error(`Ground port not present in network: ${environment.groundPort}`)
  }
  if (outputNet === groundNet) {
    throw new Error(
      `Load port "${environment.load.port}" names the ground net "${groundNet}", so its response ` +
        `is identically zero and measuring it is meaningless`,
    )
  }
  const [sweep] = await runAcSweep({
    netlist: toSpiceNetlist(resolved, environment),
    nodes: [spiceNodeName(outputNet)],
  })
  return sweep
}

/** Which side of the target a gain must fall on.
 *
 * Required, with no default, because the default anyone would pick is
 * "either" and "either" is blind to the wiring error that matters most in a
 * follower. A correctly wired follower's closed-loop gain is A/(1+A), just
 * BELOW unity; transpose its inputs and the loop becomes positive feedback
 * and the gain is A/(A-1), just ABOVE unity. Both sit inside any sane
 * tolerance band around 0 dB, so a two-sided assertion passes for both, and
 * narrowing the band does not help - a tighter band is still two-sided. The
 * SIGN of the departure is the thing that carries the information.
 */
export type GainSide = "either" | "below" | "above"

export interface ExpectedGain {
  readonly db: number
  /** Half-width of the accepted band, in dB. */
  readonly tol: number
  readonly sided: GainSide
}

/** The sweep point at `hz`. Throws rather than snapping to a neighbour: a
 * silent nearest-point match would assert at a frequency the test did not
 * name. `.ac dec` places points at start * 10^(k/pointsPerDecade), so a test
 * has to pick a frequency that lands on that grid.
 */
function pointAt(sweep: AcSweep, hz: number): { real: number; imaginary: number } {
  const point = sweep.points.find(p => Math.abs(p.frequency - hz) <= hz * 1e-9)
  if (!point) {
    const near = sweep.points
      .map(p => p.frequency)
      .filter(f => f > hz / 2 && f < hz * 2)
      .map(f => f.toPrecision(6))
      .join(", ")
    throw new Error(
      `No sweep point at ${hz} Hz on node ${sweep.node}. Nearby sweep frequencies: ${near || "(none)"}`,
    )
  }
  return point
}

export function gainAt(sweep: AcSweep, hz: number): number {
  const point = pointAt(sweep, hz)
  return Math.hypot(point.real, point.imaginary)
}

/** Asserts the gain at `hz` is within `tol` dB of `db`, AND on the required
 * side of it. Both halves are asserted separately so a failure says which one
 * failed.
 */
export function expectGainAt(sweep: AcSweep, hz: number, expected: ExpectedGain): void {
  const magnitude = gainAt(sweep, hz)
  const db = 20 * Math.log10(magnitude)
  const where = `${sweep.node} at ${hz} Hz`
  expect(Math.abs(db - expected.db), `${where}: ${db} dB is not within ${expected.tol} dB of ${expected.db} dB`)
    .toBeLessThanOrEqual(expected.tol)

  if (expected.sided === "either") return
  const target = 10 ** (expected.db / 20)
  if (expected.sided === "below") {
    expect(magnitude, `${where}: ${magnitude} is not strictly below ${target}`).toBeLessThan(target)
    return
  }
  expect(magnitude, `${where}: ${magnitude} is not strictly above ${target}`).toBeGreaterThan(target)
}

/** A network with no pots and no switches still has to say so. */
export const NO_CONTROLS: ControlState = { potPositions: {}, switchPositions: {} }
