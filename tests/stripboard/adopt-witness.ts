/**
 * What the adoption-gate tests OBSERVE: the content digest, the changed-path
 * list, and the three drivers that run one scenario and report what happened.
 *
 * **ITS OWN MODULE FOR THE REASON `./score-fixtures.ts` AND
 * `./run-dir-fixtures.ts` ARE**: `./adopt-fixtures.ts` passed this repository's
 * 500-line ceiling once the ten variants were all there, and the seam the
 * content draws is build-a-scenario versus look-at-what-it-did. Nothing here
 * builds a scenario and nothing there inspects one.
 *
 * **NOTHING HERE EVER WRITES UNDER THE REPOSITORY'S OWN `boards/`** - the
 * scenarios it drives are `./adopt-fixtures.ts`'s and each one's board is in its
 * own `mkdtemp` directory. `boardsDigest` from `./run-dir-fixtures.ts` is the
 * standing witness that the real tree is untouched.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { adoptLayout } from "../../tools/stripboard/adopt.ts"
import type { AdoptDeps } from "../../tools/stripboard/adopt-model.ts"
import { ADOPTED_RELATIVE_PATH, healthyAdoption, type Scenario } from "./adopt-fixtures.ts"

function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/**
 * A content digest over every file under `root`, in path-sorted order, with
 * each path and each content block length-prefixed.
 *
 * **IT IS A DIGEST AND NOT `git status --porcelain`, WHICH IS A DELIBERATE
 * DEPARTURE FROM THE TASK BRIEF'S OWN SKETCH.** Task 13's fix round 2 measured
 * the porcelain comparison INERT rather than merely fragile - it prints
 * ` M path` identically whether a file changed once or three times, so a change
 * made over an already-dirty tree reads the same as none - and
 * `./run-dir-fixtures.ts`'s `boardsDigest` carries the full reasoning. The
 * scenario roots here are not git repositories at all, so porcelain would also
 * have had nothing to report about them.
 */
export function digestOf(root: string): string {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) files.push(full)
      else throw new Error(`digestOf: ${full} is neither a regular file nor a directory.`)
    }
  }
  walk(root)
  const hash = createHash("sha256")
  for (const file of files.sort()) {
    for (const block of [Buffer.from(path.relative(root, file), "utf8"), fs.readFileSync(file)]) {
      const length = Buffer.alloc(4)
      length.writeUInt32BE(block.length, 0)
      hash.update(Buffer.concat([length, block]))
    }
  }
  return hash.digest("hex")
}

/** Every regular file under `root`, by relative path, with its content hash. */
function snapshot(root: string): Map<string, string> {
  const taken = new Map<string, string>()
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) taken.set(path.relative(root, full), sha256OfFile(full))
    }
  }
  walk(root)
  return taken
}

/**
 * Every path under `root` whose bytes are not what they were, as a sorted
 * relative list.
 *
 * ADDITIONS, EDITS AND DELETIONS ALL MOVE IT, which is why it is a two-way
 * comparison of hash maps rather than a count or a one-way walk: a gate that
 * deleted a file and wrote the candidate would otherwise report exactly the one
 * path the happy path expects.
 */
function changedUnder(root: string, before: ReadonlyMap<string, string>): readonly string[] {
  const now = snapshot(root)
  const touched = new Set<string>()
  for (const [relative, hash] of now) if (before.get(relative) !== hash) touched.add(relative)
  for (const relative of before.keys()) if (!now.has(relative)) touched.add(relative)
  return [...touched].sort()
}

/** Adopt, and report every path under the scenario's root the gate changed. */
export function adoptAndList(scenario: Scenario): readonly string[] {
  const before = snapshot(scenario.root)
  adoptLayout(scenario.input, scenario.deps)
  return changedUnder(scenario.root, before)
}

/** What one failing-`make check` adoption left behind, and whether the copy was reverted. */
export interface RevertedAdoption {
  readonly reverted: boolean
  readonly touched: readonly string[]
  readonly message: string
}

/**
 * Adopt with `make check` reporting a failure, and report whether the copy came
 * back out.
 *
 * `G4`: *"an adopted board on which `make check` does not exit 0 is a failed
 * adoption and is reverted."* `reverted` is read from the FILESYSTEM - the
 * destination is gone and nothing under the root changed - rather than from
 * anything the gate says about itself.
 */
export function adoptWithFailingMakeCheck(): RevertedAdoption {
  const scenario = healthyAdoption("failing-check")
  const before = snapshot(scenario.root)
  const deps: AdoptDeps = {
    ...scenario.deps,
    makeCheck: () => ({ status: 1, output: "FAIL pultec-low-boost.perfboard.vrt\n  Layout state\n" }),
  }
  let message = ""
  try {
    adoptLayout(scenario.input, deps)
  } catch (caught) {
    message = caught instanceof Error ? caught.message : String(caught)
  }
  const touched = changedUnder(scenario.root, before)
  const destination = path.join(scenario.root, ADOPTED_RELATIVE_PATH)
  return { reverted: !fs.existsSync(destination) && touched.length === 0, touched, message }
}

/** The message one scenario refuses with, or `""` when it did not refuse at all. */
export function refusalFrom(build: () => Scenario): string {
  const scenario = build()
  try {
    adoptLayout(scenario.input, scenario.deps)
  } catch (caught) {
    return caught instanceof Error ? caught.message : String(caught)
  }
  return ""
}
