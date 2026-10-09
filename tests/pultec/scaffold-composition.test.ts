/**
 * GATE B: the stand-in rule composes for every combination of sections.
 *
 * The claim under test is that fitting the stand-in for each absent section keeps the
 * ladder whole, so every PRESENT section behaves as it does inside the full EQ. Five
 * sections give 31 non-empty combinations and all of them are checked, because the rule
 * is local and its whole point is that it composes - a sample would not test that.
 *
 * Control vectors matter as much as combinations. Every figure in the scaffold spec was
 * measured by sweeping one section's control with the others flat, and that is not
 * sufficient for this circuit: two controls on the same ladder influence each other,
 * and the Pultec's characteristic move is low boost and low cut raised TOGETHER at the
 * same frequency. A test that only ever moved one control would never exercise it.
 *
 * Tolerance is deliberately looser than Gate A2's arithmetic noise: this compares two
 * different netlists, so matrix ordering inside the solver differs and results are not
 * bit-identical even when the circuits are. It is not a perceptual threshold and must
 * not be relaxed to one.
 *
 * Resolution of a brief ambiguity: the measured quantity is ACTION - response with the
 * chosen controls raised MINUS response with everything flat. "all-flat" is therefore
 * the baseline every action subtracts, not a vector asserted on its own; what is
 * asserted is the action of each vector that raises something.
 */
import { test, expect } from "bun:test"
import { REFERENCE_FLAT, allStandIns } from "../../lib/board/scaffold/index.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import { THREE_BAND_REFERENCE } from "../../circuits/pultec/electrical/three-band.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { pruneFloatingBranches } from "../../lib/sim/prepare.ts"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import type { ControlState, ResolvedComponent } from "../../lib/model/control-state.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const
const STAND_INS = allStandIns(modules, REFERENCE_FLAT)

/** The level control each section's action is measured on. */
const LEVEL: Record<string, string> = {
  "hi-boost": "RV_HI_BOOST",
  "hi-cut": "RV_HI_CUT",
  "low-cut": "RV_LO_CUT",
  "low-boost": "RV_LO_BOOST",
  mid: "RV_MID",
}

const HZ = [20, 60, 200, 700, 2000, 7000, 20000]
const TOLERANCE_DB = 1e-6
const SWEEP = { pointsPerDecade: 10, startHz: 20, stopHz: 20_000 }

/** A resolved stand-in component is already net-resolved, so it goes back into a
 * `Network` as a fixed component with no control state of its own. That is the point:
 * a stand-in has no pot to turn and no switch to select. Ids are prefixed so a stand-in
 * can never collide with a reference designator already present in the live sections. */
function asComponent(resolved: ResolvedComponent): Component {
  return {
    id: `SCAF_${resolved.id}`,
    kind: resolved.kind,
    parameters: resolved.parameters,
    pins: {},
    units: resolved.units.map((unit) => ({
      name: unit.name,
      pins: Object.fromEntries(
        Object.entries(unit.pins).map(([pin, netName]) => [pin, { kind: "net" as const, net: netName }]),
      ),
    })),
  }
}

function composed(present: readonly string[]): Network {
  const components: Component[] = []
  for (const section of present) components.push(...modules[section]!)
  for (const section of SECTIONS) {
    if (present.includes(section)) continue
    for (const component of STAND_INS[section]!.components) components.push(asComponent(component))
  }
  return { components, ports: { input: "in", output: "out", ground: "0" } }
}

/** Flat for every control the network actually has, so a missing setting cannot slip
 * through - resolution refuses one, and RV_HI_Q rides on hi-boost. */
function flatState(network: Network): ControlState {
  const potPositions: Record<string, number> = {}
  const switchPositions: Record<string, string> = {}
  const wanted: Record<string, string> = {
    SW_LO_CUT: REFERENCE_FLAT.loFrequency,
    SW_LO_BOOST: REFERENCE_FLAT.loFrequency,
    SW_HI_CUT: REFERENCE_FLAT.hiFrequency,
    SW_HI_BOOST: REFERENCE_FLAT.hiFrequency,
    SW_MID: REFERENCE_FLAT.midFrequency,
    SW_MID_MODE: REFERENCE_FLAT.midMode,
  }
  for (const component of network.components) {
    if (component.kind === "potentiometer") potPositions[component.id] = 0
    if (component.kind === "switch") {
      const position = wanted[component.id]
      if (position === undefined) {
        throw new Error(`No flat setting declared for switch ${component.id} in this test's "wanted" table`)
      }
      switchPositions[component.id] = position
    }
  }
  return { potPositions, switchPositions }
}

function raise(state: ControlState, pots: readonly string[]): ControlState {
  const potPositions = { ...state.potPositions }
  for (const pot of pots) {
    if (!(pot in potPositions)) {
      throw new Error(`Control vector names pot ${pot}, which is not present in this network`)
    }
    potPositions[pot] = 1
  }
  return { potPositions, switchPositions: state.switchPositions }
}

async function response(network: Network, state: ControlState): Promise<number[]> {
  const { network: pruned } = pruneFloatingBranches(resolveNetwork(network, state))
  const environment = {
    // A zero-impedance source makes some stand-in configurations a dead short (a pot
    // at flat grounds the input node), so a small non-zero series resistance is used.
    source: { port: "input", amplitude: 1, seriesOhms: 0.001 },
    load: { port: "output", ohms: 470_000 },
    supplies: [],
    sweep: SWEEP,
    groundPort: "ground",
  }
  const [series] = await runAcSweep({
    netlist: toSpiceNetlist(pruned, environment),
    nodes: ["out"],
  })
  if (!series) throw new Error("AC sweep returned no series for node 'out'")
  return HZ.map((hz) => {
    const point = series.points.reduce((best, candidate) =>
      Math.abs(candidate.frequency - hz) < Math.abs(best.frequency - hz) ? candidate : best,
    )
    return 20 * Math.log10(Math.hypot(point.real, point.imaginary))
  })
}

/** A control vector's effect: the response with those controls raised, minus all-flat.
 * Absolute insertion loss legitimately differs between a partial build and the full EQ
 * and is absorbed by makeup gain; what must match is the EQ action. */
async function action(network: Network, pots: readonly string[]): Promise<number[]> {
  const flat = flatState(network)
  const [raised, base] = await Promise.all([
    response(network, raise(flat, pots)),
    response(network, flat),
  ])
  return raised.map((value, index) => value - base[index]!)
}

function subsets(): readonly (readonly string[])[] {
  const all: string[][] = []
  for (let mask = 1; mask < 1 << SECTIONS.length; mask += 1) {
    all.push(SECTIONS.filter((_, index) => (mask & (1 << index)) !== 0))
  }
  return all
}

/** Control vectors per combination: all-flat is the baseline each action subtracts, so
 * what varies here is which controls are raised together. Each present section alone,
 * plus the two characteristic boost-and-cut pairs when both halves are present, plus
 * every present control at once. */
function vectors(present: readonly string[]): readonly { label: string; pots: string[] }[] {
  const levels = present.map((section) => LEVEL[section]!)
  const result: { label: string; pots: string[] }[] = []
  for (const section of present) result.push({ label: `${section} alone`, pots: [LEVEL[section]!] })
  // The EQP-1 move: low boost and low cut raised together at the same frequency.
  if (present.includes("low-boost") && present.includes("low-cut")) {
    result.push({ label: "low boost + low cut", pots: [LEVEL["low-boost"]!, LEVEL["low-cut"]!] })
  }
  if (present.includes("hi-boost") && present.includes("hi-cut")) {
    result.push({ label: "hi boost + hi cut", pots: [LEVEL["hi-boost"]!, LEVEL["hi-cut"]!] })
  }
  if (levels.length > 1) result.push({ label: "all at maximum", pots: levels })
  return result
}

const ALL = subsets()

test("every one of the 31 section combinations is covered", () => {
  expect(ALL).toHaveLength(31)
})

test("GATE B: every combination matches the full reference, under every control vector", async () => {
  const reference = THREE_BAND_REFERENCE
  // Cache the reference's actions: the same control vector must be compared on both
  // sides, with absent sections held at their declared reference-flat settings.
  const referenceAction = new Map<string, number[]>()
  const key = (pots: readonly string[]): string => [...pots].sort().join("+")
  for (const present of ALL) {
    for (const vector of vectors(present)) {
      if (referenceAction.has(key(vector.pots))) continue
      referenceAction.set(key(vector.pots), await action(reference, vector.pots))
    }
  }

  const failures: string[] = []
  let worst = { error: -Infinity, detail: "" }
  for (const present of ALL) {
    const network = composed(present)
    for (const vector of vectors(present)) {
      const measured = await action(network, vector.pots)
      const expected = referenceAction.get(key(vector.pots))!
      measured.forEach((value, index) => {
        const error = Math.abs(value - expected[index]!)
        if (error > worst.error) {
          worst = {
            error,
            detail:
              `${present.join("+")} / ${vector.label} @${HZ[index]}Hz: ` +
              `${value} vs ${expected[index]!} (${error} dB)`,
          }
        }
        if (error > TOLERANCE_DB) {
          failures.push(
            `${present.join("+")} / ${vector.label} @${HZ[index]}Hz: ` +
              `${value.toFixed(9)} vs ${expected[index]!.toFixed(9)} (${error.toFixed(9)} dB)`,
          )
        }
      })
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} failing comparisons:\n${failures.join("\n")}`)
  }
  // Reported for the task record even on a pass: the worst observed error across all
  // 31 subsets and every control vector, unrounded.
  console.log(`Gate B worst observed error: ${worst.error} dB (${worst.detail})`)
  expect(worst.error).toBeLessThanOrEqual(TOLERANCE_DB)
}, 600_000)
