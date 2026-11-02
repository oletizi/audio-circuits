/**
 * THE STANDING GUARD THAT `F`'s CUT COUNT AND THE DROP TEST'S AGREE ON REAL
 * BOARDS - the cheap check that replaced an expensive scorer.
 *
 * **WHY THIS FILE EXISTS, WHICH IS A HISTORY RATHER THAN A PREFERENCE.** For
 * four commits `F` charged the cuts a drop test could not remove
 * (`tools/stripboard/cut-necessity.ts`) instead of the `CUT ` lines the dump
 * prints, on the owner's instruction after phantom cuts were reported on moved
 * boards. It measured INERT: four before-and-after pairs identical figure for
 * figure, wire and spread candidates still never winning, and **zero
 * disagreements between the two counts over 2,267 scored candidates** - for a
 * measured 17-57% of the run's wall clock. The phantom boards had been
 * assembled BY HAND outside the search, and generalising them to the search's
 * own candidates was the reviewing agent's error. So the scorer went back to the
 * line count, and this file is what makes that safe: **if the two counts ever
 * diverge on a real board, these rows say so**, at a cost of one drop test per
 * board rather than one per candidate.
 *
 * WHAT IT ASSERTS, AND IT IS AGREEMENT RATHER THAN A FIGURE PER BOARD. Each row
 * holds `reported` against `necessary` on one board, and holds `reported`
 * against `Score.cuts` - the number `F` actually charges - so a divergence
 * between the classifier and the scorer is caught as well as a divergence
 * between the two cut counts. **The per-board cut counts are NOT written out
 * here**, and the two figures the owner named are each asserted in exactly one
 * place: *"5 of 5 cuts necessary on the owner's hand-laid low-boost"* is
 * `./cut-necessity.test.ts`'s first test, which derives the 5 from `COST
 * §1.6`'s own hand count, and *"38 of 38 on the import-placed start"* is the
 * last test below, because no other file can reach that board. A second copy of
 * either would be a second thing to keep in step.
 *
 * **THESE ROWS CANNOT PROVE THE DROP TEST HAS TEETH, AND DO NOT CLAIM TO.** A
 * `necessaryCuts` that never dropped a line would return `necessary ===
 * reported` on every board and every row here would pass. What catches that is
 * `./cut-necessity.test.ts`, whose own mutation run is recorded in its module
 * comment: with the line removal replaced by a no-op, four of its five tests
 * fail, and one of those four is a REAL board - the frozen low-boost dump with
 * a phantom cut appended, 6 reported and 5 necessary. That file is where the
 * classifier is proven to discriminate; this one is where the boards are.
 *
 * THE LAST ROW SPAWNS THE REAL FORK, three invocations, and FAILS rather than
 * skips if it cannot - *"a skipped check must never look like a passing one"*.
 * It is the only way to reach the import-placed start the search begins every
 * arm from: the committed `pultec-low-boost-imported.dump` fixture is the
 * UNPAINTED import, whose `CUT_STATE` is `UNRESOLVED`, so its cut list is
 * absent rather than empty and `HC2` excludes it from any drop test at all.
 * Measured here: about 50ms for the classification and well under a second for
 * the three invocations.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { exportNetlistFor } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { necessaryCuts } from "../../tools/stripboard/cut-necessity.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { verorouteSpawn } from "../../tools/stripboard/place.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { scoreDumpText } from "../../tools/stripboard/score.ts"
import { deriveTargets, type BoardTargets } from "../../tools/stripboard/targets.ts"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"

afterAll(cleanUpTempScratch)

const ROOT = moduleRepoRoot()

/**
 * The committed real boards, with the export each is a layout of.
 *
 * **THE SAME FOUR `./agreement.test.ts` GRADES `HC8` ON**, and the pairing is
 * that file's: four boards nobody here laid out, each with a committed
 * `--dump-board` capture and a committed netlist export, their provenance in
 * `tests/fixtures/stripboard/provenance.txt`. Rows are shared with that file by
 * being the same documented set rather than by an import, because that file's
 * table carries its own mutation runs per row and this one asserts something
 * else about the same boards.
 */
const COMMITTED = [
  [
    "the owner's hand-laid low-boost",
    "tests/fixtures/stripboard/pultec-low-boost-frozen.dump",
    "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist",
  ],
  [
    "pt2399-core",
    "tests/fixtures/stripboard/pt2399-core.dump",
    "tests/fixtures/pt2399-core-veroroute.net",
  ],
  [
    "transistor-preamp-feedback",
    "tests/fixtures/stripboard/transistor-preamp-feedback.dump",
    "tests/fixtures/transistor-preamp-feedback.net",
  ],
  [
    "transistor-preamp-staged",
    "tests/fixtures/stripboard/transistor-preamp-staged.dump",
    "tests/fixtures/transistor-preamp-staged.net",
  ],
] as const

for (const [label, dumpPath, netlistPath] of COMMITTED) {
  test(`every cut VeroRoute reports on ${label} is one the copper needs`, async () => {
    const text = await Bun.file(path.join(ROOT, dumpPath)).text()
    const reference = referenceNetsFromExport(
      await Bun.file(path.join(ROOT, netlistPath)).text(),
    )
    const necessity = necessaryCuts(text, reference)
    // AGREEMENT, not a cut count: see the module comment on why no per-board
    // figure is written here. The message names the gap, so a failure says how
    // far the two counts went apart rather than only that they did.
    expect(
      necessity.necessary,
      `${label}: ${necessity.reported - necessity.necessary} of ${necessity.reported} ` +
        "reported cut(s) are redundant under HC8's reconstruction, so F is charging cuts the " +
        "copper does not need - the condition tools/stripboard/score.ts was reverted on the " +
        "absence of",
    ).toBe(necessity.reported)
  })
}

/** low-boost's targets as `P0` derives them, for the scorer's side of the comparison. */
function lowBoostTargets(): BoardTargets {
  return deriveTargets(physicalBoard("low-boost"), loadRules().stockRows, "pultec-low-boost")
}

test("the import-placed start the search begins from measures thirty-eight of thirty-eight", async () => {
  // THE BOARD EVERY ARM STARTS ON, built here through the fork rather than read
  // from a fixture, for the reason the module comment gives: the committed
  // import dump is UNPAINTED and `CUT_STATE UNRESOLVED`, so it has no cut list
  // to drop from. `--import` then `--author --op autofill` is the same pair
  // `tools/stripboard/place.ts` and `tools/stripboard/climb-evaluate.ts` run, in
  // that order, so this is the start the search sees and not a board assembled
  // for the test.
  //
  // THE 38 IS WRITTEN OUT because the owner named it - *"38 of 38 on the
  // import-placed start"* - and because an assertion of agreement alone would
  // pass on a board the fork had placed differently. A model change that moves
  // the figure is a figure to re-measure and restate here, which is the point of
  // it being a literal.
  const spawn = verorouteSpawn()
  const work = freshTempScratch("cut-counts-agree-")
  const declaration = loadDeclaration(
    path.join(ROOT, "boards", "pultec-low-boost", "perfboard.json"),
  )
  const netlistText = await exportNetlistFor(declaration)
  const netlistPath = path.join(work, "low-boost.net")
  fs.writeFileSync(netlistPath, netlistText)

  const imported = path.join(work, "imported.vrt")
  const importRun = spawn(["--import", netlistPath, "-o", imported, "--strips", "horizontal"])
  expect(importRun.status, `--import: ${importRun.stderr}`).toBe(0)
  const painted = path.join(work, "painted.vrt")
  const paint = spawn(["--author", imported, "--op", "autofill", "-o", painted])
  expect(paint.status, `--author --op autofill: ${paint.stderr}`).toBe(0)
  const dump = spawn(["--dump-board", painted])
  expect(dump.status, `--dump-board: ${dump.stderr}`).toBe(0)

  const necessity = necessaryCuts(dump.stdout, referenceNetsFromExport(netlistText))
  expect([necessity.reported, necessity.necessary]).toEqual([38, 38])
  // AND THE SCORER'S OWN `C` IS THE SAME NUMBER, which is what ties this guard
  // to `F`. The two counts agreeing while the scorer read a third figure would
  // leave `F` charging something nothing here measured.
  expect(scoreDumpText(dump.stdout, lowBoostTargets(), loadRules()).cuts)
    .toBe(necessity.reported)
})
