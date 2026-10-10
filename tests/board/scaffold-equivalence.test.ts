import { test, expect } from "bun:test"
import { REFERENCE_FLAT, allStandIns, standIn } from "../../lib/board/scaffold/index.ts"
import { resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { boundaryAdmittance } from "../../lib/board/scaffold/admittance.ts"
import { boundaryPartition } from "../../lib/board/scaffold/shorts.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

test("GATE A1: a stand-in is a SUBSET of the section's flat-resolved components", () => {
  // Exact, with no tolerance. This is the real guarantee: nothing is being fitted, so
  // no numerical threshold should ever be what decides correctness. The numerical
  // boundary gate exists only to catch these invariants being implemented wrongly.
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const live = new Map(
      resolveSectionFlat(section, modules, REFERENCE_FLAT).components.map((c) => [c.id, c]),
    )
    for (const component of derived.components) {
      const original = live.get(component.id)
      expect(original, `${section}: ${component.id} is not a component of the section`)
        .toBeDefined()
      // Identical, not merely present: same kind, same parameters, same nets on the
      // same pins. A "subset" that silently changed a value would be an approximation.
      expect(component.kind, `${section}: ${component.id} kind`).toBe(original!.kind)
      expect(component.parameters, `${section}: ${component.id} parameters`)
        .toEqual(original!.parameters)
      expect(component.units, `${section}: ${component.id} pins`).toEqual(original!.units)
    }
  }
})

test("GATE A1: boundary node identities are unchanged by derivation", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const nodes = new Set(
      derived.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
    )
    for (const boundaryNet of derived.boundary) {
      expect(nodes.has(boundaryNet), `${section}: ${boundaryNet} vanished`).toBe(true)
    }
  }
})

test("no stand-in invents a net the section does not have", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const sectionNets = new Set(
      resolveSectionFlat(section, modules, REFERENCE_FLAT).components.flatMap((c) =>
        c.units.flatMap((u) => Object.values(u.pins)),
      ),
    )
    for (const component of derived.components) {
      for (const net of Object.values(component.units[0]!.pins)) {
        expect(sectionNets.has(net), `${section}: invented net ${net}`).toBe(true)
      }
    }
  }
})

test("a stand-in carries the flat state it emulates", () => {
  expect(standIn("hi-cut", modules, REFERENCE_FLAT).flat).toEqual(REFERENCE_FLAT)
})

test("every section's stand-in is smaller than the section", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    expect(derived.components.length, section).toBeLessThan(resolved.components.length)
  }
})

test("hi-boost's stand-in is exactly its two pot arms, and carries no inductor", () => {
  // The derivation reaches hi-boost's flat network without anyone writing it down: the
  // ladder arm is `RV_HI_BOOST` at position 0, which is a 0R arm from `in` in series
  // with the full 47k to `hi_boost_out`, and nothing else in the section carries
  // current at flat. The 0.3 H tap, `R3`, `RV_HI_Q` and `C16` form a loop from `in`
  // back to `in` across that 0R arm, so they conduct nothing - and an earlier
  // graph-only liveness test kept all four, which put an inductor with NO PART NUMBER
  // (see "Limits, measured" in the design doc) on the scaffold's parts list for a dead
  // branch. That is what this pins: hi-boost needs no inductor.
  const derived = standIn("hi-boost", modules, REFERENCE_FLAT)
  expect(derived.components.map((c) => c.id).sort())
    .toEqual(["RV_HI_BOOST.ccw-wiper", "RV_HI_BOOST.wiper-cw"])
  expect(derived.components.map((c) => c.kind)).toEqual(["resistor", "resistor"])
  expect(derived.components.map((c) => c.parameters)).toEqual([{ ohms: 0 }, { ohms: 47_000 }])
})

test("mid carries the ONLY inductor in the whole scaffold", () => {
  // The scaffold's parts list asks for one part with no catalogue number - mid's 1 H
  // tap - and this is the assertion that keeps it one. A reduction that started
  // keeping dead reactive branches would quietly add hi-boost's 0.3 H back.
  const inductors = SECTIONS.flatMap((section) =>
    standIn(section, modules, REFERENCE_FLAT).components
      .filter((c) => c.kind === "inductor")
      .map((c) => `${section}/${c.id}`),
  )
  expect(inductors).toEqual(["mid/L_MID_1H"])
})

test("mid's stand-in keeps its inductor tap", () => {
  // Standing in for an absent mid needs a 1 H inductor, which is the part mid's model
  // specifies electrically with no part number. The contract surfaces that; it does
  // not resolve it.
  const derived = standIn("mid", modules, REFERENCE_FLAT)
  const inductors = derived.components.filter((c) => c.kind === "inductor")
  expect(inductors).toHaveLength(1)
  expect(inductors[0]!.parameters).toEqual({ henries: 1 })
})

test("a section sharing fewer than two nets refuses rather than returning nothing", () => {
  const isolated = { lonely: modules["low-boost"]!, other: [] }
  expect(() => standIn("lonely", isolated, REFERENCE_FLAT)).toThrow(/boundary net/)
})

test("allStandIns covers every section, in a stable order", () => {
  const all = allStandIns(modules, REFERENCE_FLAT)
  expect(Object.keys(all)).toEqual([...SECTIONS].sort())
})

test("derivation is deterministic", () => {
  expect(JSON.stringify(allStandIns(modules, REFERENCE_FLAT)))
    .toBe(JSON.stringify(allStandIns(modules, REFERENCE_FLAT)))
})

const BAND_LOW_HZ = 20
const BAND_HIGH_HZ = 20_000
const POINTS_PER_DECADE = 24

/** The selector corners the stand-ins were derived at. `REFERENCE_FLAT` carries these
 * as strings ("100Hz", "5kHz", "1kHz"), but `parseValue`'s unit whitelist (ohms,
 * farads, henries) has no entry for Hz, so parsing them would mean adding a
 * frequency-only parsing path for exactly one caller. Literals instead, held honest by
 * the assertion directly below rather than trusted to stay in sync by hand. */
const LOW_CORNER_HZ = 100
const MID_CORNER_HZ = 1000
const HIGH_CORNER_HZ = 5000

test("the sweep's corner literals agree with REFERENCE_FLAT", () => {
  expect(REFERENCE_FLAT.loFrequency).toBe(`${LOW_CORNER_HZ}Hz`)
  expect(REFERENCE_FLAT.midFrequency).toBe(`${MID_CORNER_HZ / 1000}kHz`)
  expect(REFERENCE_FLAT.hiFrequency).toBe(`${HIGH_CORNER_HZ / 1000}kHz`)
})

/** A logarithmic sweep from `startHz` to `endHz` inclusive, at least `perDecade`
 * points per decade. Generated rather than hand-listed so the density is evident from
 * the code and cannot silently drift: a reviewer can read `POINTS_PER_DECADE` instead
 * of counting a literal array.
 */
function logSweep(startHz: number, endHz: number, perDecade: number): readonly number[] {
  if (startHz <= 0 || endHz <= startHz) {
    throw new Error(`Invalid log sweep range: ${startHz}Hz to ${endHz}Hz`)
  }
  const decades = Math.log10(endHz / startHz)
  const steps = Math.ceil(decades * perDecade)
  const points: number[] = []
  for (let step = 0; step <= steps; step += 1) {
    points.push(startHz * 10 ** ((step * decades) / steps))
  }
  return points
}

// At least 24 points per decade over the full audio band, plus both band edges and
// all three selector corners folded in explicitly - so a change to the generator
// cannot silently drop one of them.
const SAMPLE_HZ = [
  ...new Set([
    ...logSweep(BAND_LOW_HZ, BAND_HIGH_HZ, POINTS_PER_DECADE),
    BAND_LOW_HZ,
    BAND_HIGH_HZ,
    LOW_CORNER_HZ,
    MID_CORNER_HZ,
    HIGH_CORNER_HZ,
  ]),
].sort((a, b) => a - b)

const RELATIVE = 1e-9
const FLOOR = 1e-15

/** The sections whose boundary nets are ALL joined into one electrical node by ideal
 * shorts at flat, so the admittance they present between those nets is infinite and
 * `boundaryAdmittance` refuses rather than returning a number.
 *
 * COMPUTED, NOT NAMED. This used to be the literal `["low-cut"]`, which made a general
 * property of the network into a carve-out somebody has to remember. The short-circuit
 * partition decides it instead: a boundary that falls into one class has no finite
 * admittance across it. low-cut is what the computation returns today - its flat
 * stand-in IS one 0R wire between `hi_boost_out` and `out` - and
 * `tests/board/scaffold-partition.test.ts` holds the property this derives from,
 * including the assertion that it comes out as low-cut and nothing else. Gate A1 covers
 * that section completely, so nothing is unchecked; the thing checking it is structural
 * rather than numerical. */
const SHORTED_BOUNDARY: readonly string[] = SECTIONS.filter((section) => {
  const derived = standIn(section, modules, REFERENCE_FLAT)
  return boundaryPartition(derived.components, new Set(derived.boundary)).size < 2
})

test("the sections Gate A2 cannot cover are exactly the ones whose boundary is shorted", () => {
  // A gate that quietly covers fewer sections than it claims is the failure mode this
  // repository exists to prevent, so the refusal is asserted on BOTH sides. If the
  // reduction ever dropped low-cut's 0R arm, the derived side would stop refusing and
  // this fails; if a section's boundary became shorted, the loop below would throw.
  expect(SHORTED_BOUNDARY.length, "nothing refuses, so the refusal is untested")
    .toBeGreaterThan(0)
  for (const section of SHORTED_BOUNDARY) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const whole = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const boundary = new Set(derived.boundary)
    expect(boundary.size, `${section} boundary`).toBeGreaterThanOrEqual(2)
    expect(() => boundaryAdmittance(derived.components, boundary, 1000), `${section} derived`)
      .toThrow(/one electrical node/)
    expect(() => boundaryAdmittance(whole.components, boundary, 1000), `${section} whole`)
      .toThrow(/one electrical node/)
  }
})

test("GATE A2: stand-in and real flat section agree on boundary admittance", () => {
  // Solver-noise tolerances, not perceptual ones: Gate A1 has already shown the two
  // networks are structurally identical, so anything above arithmetic noise is a
  // defect. If this ever needs loosening, the reduction has started approximating.
  const covered: string[] = []
  for (const section of SECTIONS) {
    if (SHORTED_BOUNDARY.includes(section)) continue
    covered.push(section)
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const whole = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const boundary = new Set(derived.boundary)
    for (const hz of SAMPLE_HZ) {
      const reduced = boundaryAdmittance(derived.components, boundary, hz)
      const full = boundaryAdmittance(whole.components, boundary, hz)
      expect(reduced.size, `${section} @${hz}Hz matrix size`).toBe(full.size)
      for (const [key, expected] of full) {
        const actual = reduced.get(key)
        expect(actual, `${section} ${key} @${hz}Hz missing`).toBeDefined()
        for (const part of ["re", "im"] as const) {
          const tolerance = Math.max(Math.abs(expected[part]) * RELATIVE, FLOOR)
          expect(
            Math.abs(actual![part] - expected[part]),
            `${section} ${key}.${part} @${hz}Hz: ${actual![part]} vs ${expected[part]}`,
          ).toBeLessThanOrEqual(tolerance)
        }
      }
    }
  }
  // Non-vacuous, and the result is recorded rather than relied upon: the loop above
  // skips whatever the short-circuit partition says has no finite admittance, and this
  // pins what that came out as. A future change that shorted another section's
  // boundary fails here rather than shortening the loop in silence.
  expect(covered).toEqual(["hi-boost", "hi-cut", "low-boost", "mid"])
})

test("GATE A2 can fail: perturbing one value breaks the agreement", () => {
  // A gate that cannot fail proves nothing, exactly as with the intent gate. Change
  // low-boost's 56k by one part in a thousand and the comparison must notice.
  const derived = standIn("low-boost", modules, REFERENCE_FLAT)
  const boundary = new Set(derived.boundary)
  const perturbed = derived.components.map((component) =>
    component.id === "R2"
      ? { ...component, parameters: { ohms: 56_000 * 1.001 } }
      : component,
  )
  const good = boundaryAdmittance(derived.components, boundary, 1000)
  const bad = boundaryAdmittance(perturbed, boundary, 1000)
  let worst = 0
  for (const [key, expected] of good) {
    const actual = bad.get(key)!
    worst = Math.max(worst, Math.abs(actual.re - expected.re), Math.abs(actual.im - expected.im))
  }
  expect(worst).toBeGreaterThan(FLOOR)
})

test("boundary admittance refuses a one-terminal network", () => {
  const derived = standIn("low-boost", modules, REFERENCE_FLAT)
  expect(() => boundaryAdmittance(derived.components, new Set(["out"]), 1000))
    .toThrow(/at least two boundary nets/)
})

test("boundary admittance refuses a kind it has no branch rule for", () => {
  // Never default an unknown kind to zero: a silently omitted branch would read as
  // agreement.
  const opamp: ResolvedComponent = {
    id: "buffer_amp",
    kind: "opamp",
    parameters: {},
    pins: {},
    units: [{ name: "MAIN", pins: { "in+": "IN", out: "OUT" } }],
  }
  expect(() => boundaryAdmittance([opamp], new Set(["IN", "OUT"]), 1000))
    .toThrow(/No branch admittance/)
})
