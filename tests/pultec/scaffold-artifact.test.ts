/**
 * The committed derived artifact `circuits/pultec/generated/scaffold.json` against the
 * derivation it comes from.
 *
 * WHY IT IS BACK IN `bun test`. This equality used to be asserted here and went with
 * the file that Task 4 deleted, leaving it checked only by `make pultec-scaffold-agrees`.
 * `make check` cannot currently run clean - five Pultec boards have unplaced stand-in
 * positions, which is the human designer's work - so a green `bun test` is what gets
 * looked at, and artifact drift must not be invisible in it.
 *
 * READ-ONLY, DELIBERATELY. It calls `freshScaffoldArtifact()`, which computes content
 * and touches no file, and compares that against the bytes on disk.
 * `tests/perfboard/wiring-sync.test.ts` carries the lesson: an earlier version of a
 * test like this called the WRITING function, quietly repaired the stale fixture it was
 * checking and then passed, so a run against a genuinely drifted artifact still looked
 * green. A test must not repair the thing it is checking.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { SCAFFOLD_JSON, freshScaffoldArtifact } from "../../tools/pultec/scaffold-sync.ts"

const REPO = path.resolve(import.meta.dir, "../..")

test("the committed scaffold.json equals what the derivation produces right now", () => {
  const file = path.join(REPO, SCAFFOLD_JSON)
  // Existence is asserted separately: readFileSync on a missing file throws ENOENT,
  // which reads as a broken test rather than as a missing committed artifact.
  expect(fs.existsSync(file), SCAFFOLD_JSON).toBe(true)
  expect(freshScaffoldArtifact()).toBe(fs.readFileSync(file, "utf8"))
})
