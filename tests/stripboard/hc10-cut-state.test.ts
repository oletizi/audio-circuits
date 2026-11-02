/**
 * `HC10`'s placement half after the owner's amendment of 2026-10-13: the two
 * COMMITTED BOARDS that measured the defect, read through the live binary, and
 * the two fixtures that bound the amended rule from either side.
 *
 * **ITS OWN FILE** because `./grade.test.ts` is at the 500-line ceiling its own
 * comment records, and because the seam is real: everything there grades a board
 * and asserts what a constraint SAYS about it, while this file's subject is one
 * clause of one constraint and the evidence the owner's amendment was made
 * against.
 *
 * **WHY THESE TWO AND WHY FROM THE REAL DUMP.** Until 2026-10-13 the placement
 * half refused a footprint row whose pins lie along one strip on the geometry
 * alone, *"because a row lying along a strip puts every pin of that row on one
 * piece of copper"* - a sentence that does not read the cut state. It refused
 * two correct placements:
 *
 *   - `transistor-preamp-loop`'s `C1` (`Capacitor_THT:CP_Radial_D8.0mm_P3.50mm`,
 *     pins at `1,31` and `1,33`), whose dump reads `CUT_STATE COMPUTED` and
 *     carries a cut sitting BETWEEN the two pins, so the two nets are separated
 *     and the board is right.
 *   - `transistor-preamp-lab`'s `C3` (`CP_Radial_D5.0mm_P2.00mm`, pins at `10,8`
 *     and `10,9`), whose dump reads `CUT_STATE UNRESOLVED`, so whether anything
 *     divides those two holes CANNOT BE READ at all.
 *
 * The owner was shown both measurements and the amended rule and approved it.
 * **His words, verbatim and complete:** *"follow your recommendation on HC10."*
 *
 * **A HAND-WRITTEN FIXTURE WOULD NOT DO FOR THIS FILE**, which is why it spawns
 * the binary the way `./checkpoint-fixtures.ts` does and fails rather than skips
 * when it is absent. The whole claim is about what the FORK EMITS for boards on
 * disk - a cut between two pins, or a cut list it could not work out - and a
 * fixture copying those lines would drift from the board the next time either
 * one is edited, leaving a green test about a board that no longer exists. The
 * input is assembled by `buildabilityInputFor`, which is the production path
 * `make check` itself uses, so nothing here is a second way to read a board.
 *
 * **IT ASSERTS THE SEPARATION AND THE VERDICT SEPARATELY.** `hc10` holding is
 * one assertion; that the dump really does carry a cut between `C1`'s two pins,
 * and that the copper partition really does put them on two pieces, are the
 * others. A test that only read the verdict would pass just as well if the
 * placement half had been deleted.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { hc10 } from "../../tools/stripboard/constraints.ts"
import type { CheckInput } from "../../tools/stripboard/constraints.ts"
import { gradeHardConstraints } from "../../tools/stripboard/grade.ts"
import { holeKey } from "../../tools/stripboard/copper.ts"
import { copperComponents, cutsAcross, netByPin, netOf } from "../../tools/stripboard/row-copper.ts"
import type { Pin } from "../../tools/guide/dump.ts"
import { exportNetlistFor, runVerorouteCheck } from "../../tools/perfboard/check.ts"
import { buildabilityInputFor } from "../../tools/perfboard/buildability-input.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { negativeInput } from "./grade-fixtures.ts"
import { cleanUpFixtures, freshRoot } from "./run-scratch.ts"

afterAll(cleanUpFixtures)

/** One committed board's `CheckInput`, through the same path `make check` builds it. */
async function boardInput(board: string): Promise<CheckInput> {
  const root = moduleRepoRoot()
  const declaration = loadDeclaration(path.join(root, "boards", board, "perfboard.json"))
  const text = await exportNetlistFor(declaration)
  const netPath = path.join(freshRoot(`hc10-${board}`), "board.net")
  fs.writeFileSync(netPath, text)
  const run = runVerorouteCheck(declaration.vrtPath, netPath, root)
  return buildabilityInputFor(declaration, text, run)
}

/** One placed part's `PIN` holes, refusing when the dump prints none for it. */
function pinsOf(input: CheckInput, ref: string): readonly Pin[] {
  const pins = input.dump.pins[ref] ?? []
  if (pins.length === 0) {
    throw new Error(
      `the dump prints no PIN line for ${ref}, so this test's subject is not on the board. ` +
        "Either the layout was edited and the part renamed, or it is floating; find it rather " +
        "than relaxing the assertion, because a test over a part that is not there passes by " +
        "having nothing to look at.",
    )
  }
  return pins
}

/*
 * THE TWO FIXTURE CASES FIRST: they bound the amended rule from either side on
 * hand-written boards, where exactly one thing differs between them - the
 * netlist. The live boards follow.
 */

test("HC10's placement half ADMITS a row along a strip whose pins are all on one net", () => {
  // THE OWNER'S AMENDMENT OF 2026-10-13, and this is the fixture that used to
  // be the placement half's negative one. His words on the whole amendment,
  // verbatim and complete: *"follow your recommendation on HC10."* The rule it
  // settles - agent wording, which he approved - is that a row whose pins share
  // a piece of copper is unbuildable only when nothing separates pins that must
  // not be joined. `row-along-a-strip-one-net` puts a DIP-16's eight-pin row
  // along ONE uncut strip with every pin of it on net `sideA`, so there is
  // nothing to separate and no cut is called for.
  const result = gradeHardConstraints(negativeInput("row-along-a-strip-one-net")).find(
    (entry) => entry.id === "HC10",
  )
  expect(result?.held, result?.detail).toBe(true)
  // AND THE PASS SAYS WHAT IT FOUND rather than only that it found nothing: two
  // rows shared a strip, neither divided, both on one net.
  expect(result?.detail).toContain("2 footprint row(s) with two or more pins on one strip")
  expect(result?.detail).toContain("2 on one piece carrying one net")
})

test("HC10's placement half refuses a row on one piece of copper carrying two nets", () => {
  // The other side of the amendment, and the case it must still catch: the same
  // geometry with the row's eight pins split across nets `sideA` and `other`
  // and no cut anywhere on the strip. The refusal names the constraint, the
  // part and both nets.
  const result = gradeHardConstraints(negativeInput("row-along-a-strip-two-nets")).find(
    (entry) => entry.id === "HC10",
  )
  expect(result?.held).toBe(false)
  expect(result?.detail).toContain("the placement half refuses part U1")
  expect(result?.detail).toContain("ONE piece of copper carrying 2 different reference nets")
  expect(result?.detail).toContain("other and sideA")
  // THE SUPERSEDED REMEDY IS GONE, not softened: "turn the part" was the whole
  // of what the old refusal offered, and it was the wrong advice on both live
  // boards that tripped it.
  expect(result?.detail).not.toContain("A row lying along a strip puts every pin")
})

test("HC10 HOLDS for transistor-preamp-loop's C1: two nets on one strip, divided by a cut between the pins", async () => {
  const input = await boardInput("transistor-preamp-loop")
  expect(input.dump.cutState).toBe("COMPUTED")
  expect(input.footprints.get("C1")).toBe("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")

  // THE GEOMETRY THE OLD RULE REFUSED ON: both leads on one strip. Horizontal
  // strips, so the strip is the row and both pins read row 1.
  const pins = pinsOf(input, "C1")
  expect(input.dump.verticalStrips).toBe(false)
  expect(pins.map((pin) => `${pin.pin}@${pin.row},${pin.col}`).sort()).toEqual([
    "1@1,31",
    "2@1,33",
  ])

  // THE TWO LEADS ARE ON TWO DIFFERENT NETS, read from the schematic's own
  // export, so they are pins that must NOT be joined.
  const nets = netByPin(input.reference)
  const netsOfPins = pins.map((pin) => netOf(nets, "C1", pin))
  // The names carry no leading `/`: this is the repository's OWN lowering
  // (`exportNetlistFor`), the one `make check` runs, rather than the committed
  // KiCad export whose nets read `/EMITTER`.
  expect([...new Set(netsOfPins)].sort()).toEqual(["BYPASS_CAP", "EMITTER"])

  // AND THE CUT THAT SEPARATES THEM IS IN THE DUMP. The cut is quoted without
  // its node ids, which are VeroRoute's own net assignment and are deliberately
  // never read here (see tools/stripboard/copper.ts).
  const cuts = cutsAcross(input.dump, pins)
  expect(cuts).toEqual(["CUT 1,31 1,32"])

  // SO THE COPPER PARTITION PUTS THEM ON TWO PIECES, which is the fact the
  // verdict is made of rather than the cut line itself.
  const components = copperComponents(input.dump)
  expect(components.get(holeKey({ row: 1, col: 31 }))).not.toBe(
    components.get(holeKey({ row: 1, col: 33 })),
  )

  const result = hc10(input)
  expect(result.held, result.detail).toBe(true)
  // The pass carries its figures, and the amended rule's own count among them.
  expect(result.detail).toContain("footprint row(s) with two or more pins on one strip")
  // AND THE SUPERSEDED REFUSAL IS GONE RATHER THAN RE-WORDED.
  expect(result.detail).not.toContain("the placement half refuses")
}, 60_000)

test("HC10 has NO VERDICT for transistor-preamp-lab's C3, because CUT_STATE is UNRESOLVED", async () => {
  // **WHAT AN UNRESOLVED DUMP MEANS FOR THIS PREDICATE, DECIDED AND MADE
  // LOUD.** The board's cut list is ABSENT rather than empty, so "do these two
  // holes share a piece of copper" has no answer. Both tempting readings are
  // refused: *no cuts, so refuse* would condemn five placements on this board
  // that may be perfectly correct, and *assume a cut, so pass* would be a check
  // that cannot fail. HC10 therefore reports NO VERDICT with `held` false -
  // HC8's own posture for the same cause, and HC2 owns the cause and the remedy.
  const input = await boardInput("transistor-preamp-lab")
  expect(input.dump.cutState).toBe("UNRESOLVED")
  expect(input.dump.cuts).toEqual([])
  expect(input.footprints.get("C3")).toBe("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm")

  const pins = pinsOf(input, "C3")
  expect(pins.map((pin) => `${pin.pin}@${pin.row},${pin.col}`).sort()).toEqual([
    "1@10,8",
    "2@10,9",
  ])
  // The fork itself says a cut is wanted at that location, which is why the
  // state is UNRESOLVED rather than COMPUTED with nothing to do.
  expect(input.dumpText).toContain("CUT_CONFLICT 10,9,")

  const result = hc10(input)
  expect(result.held).toBe(false)
  expect(result.detail).toContain("the placement half has NO VERDICT for part C3")
  expect(result.detail).toContain("CUT_STATE UNRESOLVED is not COMPUTED")
  expect(result.detail).toContain("HC2's cause and HC2's remedy")
  // IT IS NOT THE OLD GEOMETRY REFUSAL, whose remedy - turn the part - was
  // wrong advice about this very board.
  expect(result.detail).not.toContain("the placement half refuses")
  expect(result.detail).not.toContain("Turn the part")
  // AND IT CANNOT READ AS A PASS: the no-verdict wording says so in its own
  // words, and `held` is false.
  expect(result.detail).toContain("held is false either way")
}, 60_000)
