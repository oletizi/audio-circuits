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

/**
 * The admitted ids the fixture under test is NOT for; each must still hold.
 *
 * **IT TAKES MORE THAN ONE OFFENDING ID SINCE 2026-10-13**, and the reason is a
 * fact about the amended `HC10` rather than a loosening. `HC10`'s placement half
 * now refuses only where pins of one footprint row land on ONE PIECE OF COPPER
 * on DIFFERENT NETS - which is what a SHORT is, so `HC8` reports the same board
 * too, from the whole-board partition. The two differ in diagnosis, not in
 * detection: `HC10` localises it to one part, one row and one strip, and names
 * the cut that would fix it. No fixture can trip the placement half and leave
 * `HC8` held, so a helper demanding exactly three others would make that
 * impossible pair a test requirement.
 */
function expectOthersHeld(report: string, ...offending: readonly ConstraintId[]): void {
  const others = ADMITTED_IDS.filter((id) => !offending.includes(id))
  expect(others.length).toBe(ADMITTED_IDS.length - offending.length)
  expect(others.length).toBeGreaterThan(0)
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

test("G4: HC10's PLACEMENT half fails make check on the row-along-a-strip-two-nets fixture, naming the part and its DIRECTION", async () => {
  // THE TWO HALVES ARE TESTED SEPARATELY because they point at different
  // remedies - the footprint half at the data, the placement half at the layout
  // - and one id covering both is exactly how one of them could stop running
  // without any verdict changing.
  //
  // HC8 FAILS ON THIS BOARD TOO, and that is the amended rule being honest
  // rather than a fixture with two faults in it: a row on one piece of copper
  // carrying two nets IS a short, so the whole-board partition sees it as well.
  // HC10's own line is still asserted on its own, which is the point of
  // `lineFor`.
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("row-along-a-strip-two-nets")),
    )
    expect(result.ok).toBe(false)
    const hc10 = lineFor(result.report, "HC10")
    expect(hc10).toContain("HC10 NOT HELD")
    expect(hc10).toContain("the placement half refuses part U1")
    expect(hc10).toContain("Package_DIP:DIP-16_W7.62mm")
    expect(hc10).toContain("DIRECTION")
    expect(lineFor(result.report, "HC8")).toContain("HC8 NOT HELD")
    expectOthersHeld(result.report, "HC10", "HC8")
  })
})

test("G4: HC10's PLACEMENT half HOLDS through make check on the one-net board that used to fail it", async () => {
  // THE AMENDMENT'S POSITIVE CONTROL ON THIS PATH, not only on the grader's.
  // `row-along-a-strip-one-net` is the fixture the placement half refused until
  // 2026-10-13: one DIP-16 row along one uncut strip, every pin of it on one
  // net. Nothing separates those pins and nothing needs to, so all four
  // admitted constraints hold and `make check` is green on it.
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(negativeInput("row-along-a-strip-one-net")),
    )
    expect(result.ok, result.report).toBe(true)
    for (const id of ADMITTED_IDS) {
      expect(lineFor(result.report, id)).toContain(`${id} held`)
    }
    expect(result.report).not.toContain("NOT HELD")
    expect(result.report).not.toContain("NOT GRADED")
  })
})

test("G4's fourth condition: a footprint with no recorded span refuses BY NAME through make check, and the refusal is not a pass", async () => {
  // *"Reading every threshold from stripboard/rules.json or from a committed
  // data module and refusing rather than defaulting when one is missing"* - the
  // condition that keeps an admitted verifier from deriving a criterion of its
  // own.
  //
  // **THE FIXTURE WAS `CP_Radial_D10.0mm_P5.00mm` UNTIL 2026-10-30, BECAUSE THAT
  // WAS THE LIVE CASE: transistor-preamp-staged places it and nothing recorded a
  // span for it.** Recording one (Panasonic M-A ECA-1VM471, 2 to 11 holes) made
  // this test pass by making the gate green, which is the right outcome for the
  // board and the wrong fixture for this test. It now names a footprint that is
  // REAL - `tests/kicad/footprint-names.test.ts` sweeps every name in this
  // repository against `Capacitor_THT.pretty` on disk, and this one is in it -
  // and that no board places, which is the same footprint and the same reasoning
  // `tests/kicad/lead-span.test.ts` uses for its own unknown-footprint case.
  const unrecorded = "Capacitor_THT:C_Rect_L13.0mm_W4.0mm_P10.00mm_FKS3_FKP3_MKS4"
  await withVrt(async (vrtPath) => {
    const result = await checkWithFixture(vrtPath, () =>
      Promise.resolve(inputWithFootprint(unrecorded)),
    )
    expect(result.ok).toBe(false)
    expect(result.report).toContain("NOT GRADED")
    expect(result.report).toContain("no lead span is recorded for footprint")
    expect(result.report).toContain(unrecorded)
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
