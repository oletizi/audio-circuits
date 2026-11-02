/**
 * WHICH CONTROL SETTINGS A STAND-IN ACTUALLY DEPENDS ON.
 *
 * A stand-in is the absent section at ONE setting, and the design doc's "Limits,
 * measured" states a restriction that follows: holding a stand-in at its reference
 * setting while the circuit's selectors move elsewhere is not equivalence, and where a
 * selector is ganged to a present section's shaft, turning that knob invalidates the
 * stand-in silently. The restriction is real and must be on the silkscreen.
 *
 * WHAT IS DERIVED HERE IS ITS SCOPE, which is narrower than the prose alone implies and
 * is a fact about the reduction rather than a judgement. A stand-in can only depend on a
 * selector if it carries a part that selector chooses, and that is checkable by moving
 * one field of the flat state and seeing whose components change. It belongs in a test
 * because the answer moves whenever the reduction or the reference setting does, and a
 * doc paragraph would then be quietly wrong where this fails loudly.
 */
import { test, expect } from "bun:test"
import { REFERENCE_FLAT, allStandIns, standIn } from "../../lib/board/scaffold/index.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { FlatState } from "../../lib/board/scaffold/index.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

/** The four fields of a flat state, each with a position OTHER than the reference's.
 * Real positions, from `SELECTORS` and `MID_MODES`: an invented one refuses. */
const MOVED: Readonly<Record<keyof FlatState, string>> = {
  loFrequency: "200Hz",
  hiFrequency: "10kHz",
  midFrequency: "3kHz",
  midMode: "boost",
}

test("WHICH SETTINGS A STAND-IN ACTUALLY DEPENDS ON, derived by moving each one", () => {
  // The design doc's setting-sensitivity limit rests on which stand-ins carry a part
  // the selectors choose, and that is derivable rather than something to describe: move
  // one field of the flat state and see whose components change. Recorded as a table so
  // a change in either direction fails here rather than making the doc's prose quietly
  // wrong.
  //
  // THE ANSWER IS NARROWER THAN IT WAS. With `midMode` at `off`, hi-cut's `C26` is the
  // ONLY selector-chosen part in the whole scaffold - mid's capacitors and its 1 H tap
  // are behind the open mode return and reduce away - so `hi_freq` is the only shaft
  // whose movement can invalidate a stand-in. The low-frequency gang the doc calls the
  // worse case cannot: low-cut's stand-in is a wire and low-boost's is 56k plus a 0R
  // shunt, neither of which any selector chooses.
  const dependents: Record<string, readonly string[]> = {}
  for (const field of Object.keys(MOVED) as (keyof FlatState)[]) {
    const moved = allStandIns(modules, { ...REFERENCE_FLAT, [field]: MOVED[field] })
    const base = allStandIns(modules, REFERENCE_FLAT)
    dependents[field] = SECTIONS.filter(
      (section) =>
        JSON.stringify(moved[section]!.components) !== JSON.stringify(base[section]!.components),
    )
  }
  expect(dependents).toEqual({
    loFrequency: [],
    hiFrequency: ["hi-cut"],
    midFrequency: [],
    // Moving the mode off centre is not a frequency change; it is what puts mid's whole
    // reactive branch back, and it is listed so the asymmetry is on the record.
    midMode: ["mid"],
  })
})

test("hi-cut's stand-in holds the only selector-chosen part in the scaffold", () => {
  // The same fact stated structurally rather than by perturbation, because the two can
  // come apart: a stand-in could carry a capacitor that no selector chooses. Every
  // non-resistive stand-in component in the whole scaffold, named.
  const reactive = SECTIONS.flatMap((section) =>
    standIn(section, modules, REFERENCE_FLAT).components
      .filter((component) => component.kind !== "resistor")
      .map((component) => `${section}/${component.id}`),
  )
  expect(reactive).toEqual(["hi-cut/C26"])
})

