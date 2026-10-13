/**
 * The scratch directories the adoption-gate fixtures work in, and their
 * removal.
 *
 * **NOTHING UNDER THE REPOSITORY'S OWN `boards/` IS EVER TOUCHED.** The gate's
 * whole job is writing there, so every scenario's board lives in its own
 * `mkdtemp` directory and the gate's write lands in that copy.
 *
 * **`cleanUpFixtures` IS NOT HOUSEKEEPING, AND ITS ABSENCE BROKE TWENTY-THREE
 * TESTS IN NINE UNRELATED FILES.** Each scenario makes one `mkdtemp` root and
 * one run directory under `build/stripboard/pultec-low-boost/`, and in round 1
 * of this task's review nothing removed either: the mutation harness ran
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
 * **ITS OWN MODULE** because it is the machinery every scenario shares and
 * because `./adopt-fixtures.ts` passed the 500-line ceiling when the registry
 * landed in it. The seam is scratch-space versus what-gets-built-in-it.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** Every directory the fixtures created, for `cleanUpFixtures` to remove. */
const CREATED: string[] = []

let counter = 0

/** A unique, empty scratch directory under the system temp directory. */
export function freshRoot(label: string): string {
  counter += 1
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `adopt-${label}-${counter}-`))
  CREATED.push(root)
  return root
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
  CREATED.push(created)
}

/**
 * Remove every directory the fixtures made.
 *
 * **EVERY TEST FILE THAT USES THESE FIXTURES CALLS IT IN `afterAll`**, which is
 * the only place that can: a fixture cannot know when the last test that reads
 * it has finished. `force: true` so a directory a test already removed is not
 * an error, and the registry is emptied so a second call is a no-op rather than
 * a second walk.
 */
export function cleanUpFixtures(): void {
  for (const created of CREATED) fs.rmSync(created, { recursive: true, force: true })
  CREATED.length = 0
}
