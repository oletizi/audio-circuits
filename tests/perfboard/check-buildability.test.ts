import { test, expect } from "bun:test"
import { checkPerfboard } from "../../tools/perfboard/check.ts"
import { ADMITTED_IDS, BUILDABILITY_HEADING } from "../../tools/stripboard/buildability.ts"
import type { ConstraintId } from "../../tools/stripboard/constraints-model.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { healthyInput, inputWithFootprint, negativeInput } from "../stripboard/grade-fixtures.ts"
import {
  declaration,
  healthyBuildability,
  lineFor,
  netlist,
  withVrt,
} from "./check-fixtures.ts"

/**
 * CRITERIA `G4`: the four buildability verifiers `make check` admits, driven
 * through `checkPerfboard` itself rather than through the grader directly.
 *
 * **WHY THROUGH THIS PATH AND NOT THROUGH `gradeHardConstraints`.** `G4`'s third
 * admission condition is that *"the check is independently tested, including
 * negatively: a fixture it must reject, by name. A check that cannot fail is not
 * admitted."* `tests/stripboard/grade.test.ts` already establishes that over the
 * grader. What these tests add is that the fixtures STILL FAIL THROUGH THE NEW
 * PATH - a wiring that graded the four and then dropped the verdict, or that
 * turned a failure into a throw nobody prints, would leave every one of those
 * grader tests passing while `make check` stayed green.
 *
 * **THE VERDICT MUST ARRIVE IN `PerfboardResult.report`**, because
 * `tools/cli/perfboard.ts` prints that string under `FAIL <board>` and it is
 * what a person reads. So each of these asserts the text and not only `ok`.
 *
 * **EVERY ASSERTION IS AGAINST ONE CONSTRAINT'S OWN LINE** - see `lineFor`. The
 * section prints all four, and each held constraint's prose names parts,
 * footprints and other constraints' ids, so a regex over the whole report can
 * pass for a reason other than the one the test names.
 */
function healthyRun(): { readonly status: number; readonly output: string } {
  return { status: 0, output: "Layout state\n  all nets complete\nCuts: 0\n" }
}

/** `checkPerfboard` over one negative fixture, with everything else held still. */
function checkWithFixture(
  vrtPath: string,
  input: () => Promise<ReturnType<typeof healthyInput>>,
): Promise<{ readonly ok: boolean; readonly report: string }> {
  return checkPerfboard(declaration(vrtPath), {
    exportNetlist: netlist,
    runCheck: () => healthyRun(),
    checkBom: async () => ({ applies: false }),
    buildabilityInput: input,
  })
}

/** The three the fixture under test is NOT for; each must still hold. */
function expectOthersHeld(report: string, offending: ConstraintId): void {
  const others = ADMITTED_IDS.filter((id) => id !== offending)
  expect(others.length).toBe(3)
  for (const id of others) {
    expect(lineFor(report, id), `${id} should still hold on a single-fault fixture`)
      .toContain(`${id} held`)
  }
}

test("G4: the admitted set is exactly HC5, HC8, HC9 and HC10, and HC6 is not in it", () => {
  // HC6 is held back by OB4: pt2399-core is 17 x 36 against a declared stock of
  // 34 x 27 and it is a board that works, so admitting HC6 here would refuse a
  // built board over a figure the owner expects to change. Asserted rather than
  // left to a comment, because the way it would be lost is somebody adding a
  // fifth entry while passing.
  expect([...ADMITTED_IDS]).toEqual(["HC5", "HC8", "HC9", "HC10"])
  expect(ADMITTED_IDS).not.toContain("HC6")
  // The heading a reader scans for names the same four, so the output cannot
  // claim a set the gate did not grade.
  expect(BUILDABILITY_HEADING).toBe("Buildability (CRITERIA G4: HC5, HC8, HC9, HC10)")
})

test("G4: the healthy board passes and its report carries all four as held", async () => {
  // THE POSITIVE CONTROL, and without it every negative test below passes for a
  // gate that refuses everything.
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, healthyBuildability)
    expect(result.ok).toBe(true)
    expect(result.report).toContain(BUILDABILITY_HEADING)
    for (const id of ADMITTED_IDS) {
      expect(lineFor(result.report, id)).toContain(`${id} held`)
    }
    expect(result.report).not.toContain("NOT HELD")
    expect(result.report).not.toContain("NOT GRADED")
  })
})

test("G4: HC5 fails make check on the span-above-reach fixture, naming the part and its family's reach", async () => {
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("span-above-reach")),
    )
    expect(result.ok).toBe(false)
    const hc5 = lineFor(result.report, "HC5")
    expect(hc5).toContain("HC5 NOT HELD")
    expect(hc5).toContain("C1 spans")
    // THE BOUND IS READ BACK THROUGH `leadSpanFor` FROM THE FOOTPRINT THE LINE
    // ITSELF NAMES, rather than written here as a literal: a datasheet revision
    // then moves the assertion with the module, and the test establishes that
    // the figure printed is the RECORDED bound and not merely some number.
    const quoted = /maxSpanHoles (\d+) for (\S+?)\. /.exec(hc5)
    expect(quoted, `HC5's line did not quote a maxSpanHoles bound: ${hc5}`).not.toBeNull()
    const [, figure, footprint] = quoted ?? []
    expect(Number(figure)).toBe(leadSpanFor(footprint ?? "").maxSpanHoles)
    expectOthersHeld(result.report, "HC5")
  })
})

test("G4: HC9 fails make check on the span-below-minimum fixture, naming the part and its family's floor", async () => {
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("span-below-minimum")),
    )
    expect(result.ok).toBe(false)
    const hc9 = lineFor(result.report, "HC9")
    expect(hc9).toContain("HC9 NOT HELD")
    expect(hc9).toContain("C2 spans")
    const quoted = /minSpanHoles (\d+) for (\S+?)\. /.exec(hc9)
    expect(quoted, `HC9's line did not quote a minSpanHoles bound: ${hc9}`).not.toBeNull()
    const [, figure, footprint] = quoted ?? []
    expect(Number(figure)).toBe(leadSpanFor(footprint ?? "").minSpanHoles)
    expectOthersHeld(result.report, "HC9")
  })
})

test("G4: HC8 fails make check on the two-nets-shorted fixture, naming both nets the copper joins", async () => {
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("two-nets-shorted")),
    )
    expect(result.ok).toBe(false)
    const hc8 = lineFor(result.report, "HC8")
    expect(hc8).toContain("HC8 NOT HELD")
    // BOTH net names and the word SHORT, on HC8's own line. The fixture is three
    // 1x02 headers chained across four strips where two nets meet on one strip,
    // so naming only one net would not say what was joined to what.
    expect(hc8).toContain("SHORT")
    expect(hc8).toContain('"mid"')
    expect(hc8).toContain('"other"')
    expectOthersHeld(result.report, "HC8")
  })
})

test("G4: HC10's FOOTPRINT half fails make check on the round-pin-pattern fixture, naming the part and the footprint", async () => {
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("round-pin-pattern")),
    )
    expect(result.ok).toBe(false)
    const hc10 = lineFor(result.report, "HC10")
    expect(hc10).toContain("HC10 NOT HELD")
    expect(hc10).toContain("the footprint half refuses part SW1")
    expect(hc10).toContain("SYNTHETIC:Ring_5Pin_D10mm")
    expectOthersHeld(result.report, "HC10")
  })
})

test("G4: HC10's PLACEMENT half fails make check on the rows-along-a-strip fixture, naming the part and its DIRECTION", async () => {
  // THE TWO HALVES ARE TESTED SEPARATELY because they point at different
  // remedies - the footprint half at the data, the placement half at the layout
  // - and one id covering both is exactly how one of them could stop running
  // without any verdict changing.
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("rows-along-a-strip")),
    )
    expect(result.ok).toBe(false)
    const hc10 = lineFor(result.report, "HC10")
    expect(hc10).toContain("HC10 NOT HELD")
    expect(hc10).toContain("the placement half refuses part U1")
    expect(hc10).toContain("Package_DIP:DIP-16_W7.62mm")
    expect(hc10).toContain("DIRECTION")
    expectOthersHeld(result.report, "HC10")
  })
})

test("G4's fourth condition: a footprint with no recorded span refuses BY NAME through make check, and the refusal is not a pass", async () => {
  // *"Reading every threshold from stripboard/rules.json or from a committed
  // data module and refusing rather than defaulting when one is missing"* - the
  // condition that keeps an admitted verifier from deriving a criterion of its
  // own. CP_Radial_D10.0mm_P5.00mm is in neither LEAD_SPANS nor UNSOURCED, and
  // it is the footprint transistor-preamp-staged places that this gate now
  // refuses on, so the fixture is the live case rather than an invented one.
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(inputWithFootprint("Capacitor_THT:CP_Radial_D10.0mm_P5.00mm")),
    )
    expect(result.ok).toBe(false)
    expect(result.report).toContain("NOT GRADED")
    expect(result.report).toContain("no lead span is recorded for footprint")
    expect(result.report).toContain("Capacitor_THT:CP_Radial_D10.0mm_P5.00mm")
    // IT MUST NOT READ AS A VERDICT ABOUT THE LAYOUT. A refusal is the absence
    // of a datum; a NOT HELD is a fact about the board. Both are red, and the
    // wording keeps them distinguishable.
    expect(result.report).toContain("REFUSAL TO GRADE")
    expect(result.report).not.toContain("NOT HELD")
    // AND THE BINARY'S OWN REPORT SURVIVES IT. A refusal that escaped as a throw
    // replaced this with its own text, so a board failing on Layout state lost
    // the list of incomplete nets - the half of the output that says what to fix.
    expect(result.report).toStartWith(healthyRun().output)
  })
})

test("G4: a board the four hold on still prints the section, so a reader of a red board learns they ran", async () => {
  // THE SKIPPED-CHECK GUARD. A gate that printed nothing when the four held
  // would be indistinguishable, in the output a person reads, from one that did
  // not run them - and that output is the only place the admission is visible.
  await withVrt(async (vrtPath) => {
    const result = await checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      // A board failing on something else entirely: the four still ran.
      runCheck: () => ({ status: 1, output: "Layout state\n  GND incomplete\nCuts: 3\n" }),
      checkBom: async () => ({ applies: false }),
      buildabilityInput: healthyBuildability,
    })
    expect(result.ok).toBe(false)
    expect(result.report).toContain("GND incomplete")
    expect(result.report).toContain(BUILDABILITY_HEADING)
    expect(lineFor(result.report, "HC8")).toContain("HC8 held")
  })
})
