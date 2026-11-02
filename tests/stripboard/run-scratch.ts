/**
 * The scratch directories this suite's fixtures and real runs work in, and
 * their removal.
 *
 * **NOTHING UNDER THE REPOSITORY'S OWN `boards/` IS EVER TOUCHED.** The adoption
 * gate's whole job is writing there, so every scenario's board lives in its own
 * `mkdtemp` directory and the gate's write lands in that copy.
 *
 * **`cleanUpFixtures` IS NOT HOUSEKEEPING, AND ITS ABSENCE BROKE TWENTY-THREE
 * TESTS IN NINE UNRELATED FILES.** Each adoption scenario makes one `mkdtemp`
 * root and one run directory under `build/stripboard/pultec-low-boost/`, and in
 * round 1 of that task's review nothing removed either: the mutation harness ran
 * twenty-one times over twenty-seven tests and left **4,606** run directories
 * behind, taking that one directory to 5,346 entries. At that point `spawnSync`
 * of the veroroute binary began returning exit status 0 with **empty stdout**,
 * and every test that reads a real board failed with *"--dump-board produced no
 * GRID line"* - a refusal pointing at the fork, about a fork that was fine.
 * Removing exactly those 4,606 directories restored all twenty-three. Measured
 * both ways: moving `build/` aside fixed it, moving it back broke it again.
 *
 * **`build/` BEING GITIGNORED IS WHAT HID IT.** Nothing in `git status` ever
 * mentioned the directories, so the only symptom was a suite that failed
 * somewhere else entirely. A test helper that leaves thousands of directories
 * per run is a helper that breaks the suite eventually, and the fact that this
 * one took a mutation harness to reach that scale is luck rather than design.
 *
 * **IT COVERS THE REAL `place` RUNS TOO, which is what this module was renamed
 * for.** It was `adopt-scratch.ts`, and the whole-branch review measured the
 * remaining leak at the same shape and a tenth of the scale: a full `bun test`
 * left about twenty-two new directories behind, sixteen under
 * `build/stripboard/pultec-low-boost/` from the real `place` runs in
 * `./benchmark.test.ts` and `./checkpoint-2.test.ts`, and six under
 * `build/stripboard/run-dir-test/` from `./run-dir-fixtures.ts`. Twenty-two a
 * run is slow growth and the same wall; fixing the fixtures and leaving the runs
 * would have been fixing the symptom that happened to be measured.
 *
 * **A REAL RUN IS REGISTERED BY STAMP PREFIX AND NOT BY PATH**, because
 * `placeAcrossSeeds` makes one run per seed and suffixes each one's stamp, so the
 * caller cannot name every directory in advance. `registerStampPrefix` is what a
 * test uses when it hands `place` a stamp; the prefix is unique per process and
 * per call, so it can never match another test's directory.
 *
 * **AND IT WAS APPLIED TO ONLY ONE OF THE TWO PLACES THE FIXTURES WRITE.** The
 * registry above was private to this module, so the fixtures that did not use
 * it kept leaking - into `os.tmpdir()`, where nothing counted. On 2026-10-13
 * `TMPDIR` held over 60,000 such directories and the owner's disk filled, while
 * "zero run directories" was being reported as a clean bill of health: that
 * metric counted `build/stripboard/`, the directory this comment had already
 * made correct. **A SUCCESS METRIC MEASURED THE WRONG DIRECTORY.** The
 * directory registry now lives in `../support/temp-scratch.ts` for the whole
 * suite, and `./temp-scratch.test.ts` is the standing guard over both places.
 *
 * **ITS OWN MODULE** because it is the machinery every scenario and every real
 * run shares, and because `./adopt-fixtures.ts` passed the 500-line ceiling when
 * the registry landed in it. The seam is scratch-space versus
 * what-gets-built-in-it.
 */
import fs from "node:fs"
import path from "node:path"
import {
  cleanUpTempScratch,
  freshTempScratch,
  registerTempScratch,
} from "../support/temp-scratch.ts"
import { runDirectory } from "../../tools/stripboard/run-dir.ts"

/** Every `<board>` / `<stamp prefix>` pair a real run was handed. */
const STAMP_PREFIXES: { readonly board: string; readonly prefix: string }[] = []

let counter = 0

/**
 * A unique, empty scratch directory under the system temp directory.
 *
 * **THE DIRECTORY REGISTRY LIVES IN `../support/temp-scratch.ts` AND NOT HERE.**
 * This module held its own `CREATED` list, which is why the fix it documents
 * covered `build/stripboard/` and nothing covered the other place every fixture
 * writes: the registry that worked was private to the fixtures that happened to
 * use it. There is now one registry for the whole suite, and what remains below
 * is the part that is genuinely this module's - the stamp prefixes, which are
 * run directories under `build/stripboard/` rather than temp directories.
 */
export function freshRoot(label: string): string {
  counter += 1
  return freshTempScratch(`adopt-${label}-${counter}-`)
}

/**
 * A label unique within this process, for a run directory's stamp.
 *
 * THE PID AND A UUID ARE BOTH IN IT because `runDirectory` resolves against the
 * real repository root, so two concurrent test processes would otherwise
 * collide in one directory - and a scenario reading another's `run.json` is a
 * failure nobody could reproduce.
 */
export function freshStamp(label: string): string {
  counter += 1
  return `adopt-${label}-${process.pid}-${counter}-${crypto.randomUUID()}`
}

/** Register a directory the fixtures made outside `freshRoot` - a run directory. */
export function registerCreated(created: string): void {
  registerTempScratch(created)
}

/**
 * A stamp for a REAL `place` run, with every run directory it will produce
 * registered for removal.
 *
 * **IT RETURNS A STAMP RATHER THAN A DIRECTORY** because `place` builds the
 * directory itself from the board it prepared, and a test that computed the path
 * would be a second place the layout of `build/stripboard/` is written down.
 * Everything under `<board>/<prefix>*` is removed, which covers both the single
 * run and `placeAcrossSeeds`'s one-per-seed suffixes.
 */
export function scratchStamp(board: string, label: string): string {
  const stamp = freshStamp(label)
  STAMP_PREFIXES.push({ board, prefix: stamp })
  return stamp
}

/** Also sweep `<board>/<prefix>*` - for a stamp a caller built itself. */
export function registerStampPrefix(board: string, prefix: string): void {
  STAMP_PREFIXES.push({ board, prefix })
}

/**
 * Remove every directory the fixtures made.
 *
 * **EVERY TEST FILE THAT USES THESE FIXTURES CALLS IT IN `afterAll`**, which is
 * the only place that can: a fixture cannot know when the last test that reads
 * it has finished. It sweeps BOTH places a fixture writes: the temp-directory
 * registry in `../support/temp-scratch.ts`, and the run directories under
 * `build/stripboard/` that only this module knows how to find. Each registry is
 * emptied, so a second call is a no-op rather than a second walk.
 *
 * A STAMP PREFIX WHOSE BOARD DIRECTORY DOES NOT EXIST IS NOT AN ERROR: a test
 * that registered a stamp and then refused before `place` created anything is an
 * ordinary case, and the registration is the honest thing for it to have done.
 */
export function cleanUpFixtures(): void {
  cleanUpTempScratch()
  for (const { board, prefix } of STAMP_PREFIXES) {
    const boardDir = path.dirname(runDirectory(board, prefix))
    if (!fs.existsSync(boardDir)) continue
    for (const entry of fs.readdirSync(boardDir)) {
      if (!entry.startsWith(prefix)) continue
      fs.rmSync(path.join(boardDir, entry), { recursive: true, force: true })
    }
  }
  STAMP_PREFIXES.length = 0
}
