// tests/draught/toolchain.test.ts
import { expect, test } from "bun:test"
import path from "node:path"
import { checkToolchain, probeTool, readLock } from "../../tools/draught/toolchain.ts"
import { defaultAkcli } from "../../tools/draught/akcli-install.ts"
import { defaultCopperheadDir } from "../../tools/draught/copperhead-install.ts"

test("a tool whose found version differs from the lock is reported, with the fix", () => {
  const lock = { ...readLock(), akcli: { ...readLock().akcli, version: "0.0.1" } }
  const problems = checkToolchain(lock)
  const akcli = problems.find((p) => p.tool === "akcli")
  expect(akcli).toBeDefined()
  expect(akcli?.wanted).toBe("0.0.1")
  expect(akcli?.how).toContain("akcli-kicad==0.0.1")
})

test("an absent tool is reported with found null, not as a version mismatch", () => {
  const lock = { ...readLock(), nosuchtool: { version: "1", probe: ["definitely-not-a-tool", "--version"] } }
  expect(checkToolchain(lock).find((p) => p.tool === "nosuchtool")?.found).toBeNull()
})

/**
 * THE REGRESSION TEST FOR FINDING 7
 * (`.superpowers/sdd/2026-10-30-institutionalise-draughting/rulings.md`).
 *
 * On the machine this was written on, `kicad-cli` is NOT on `PATH` - but it
 * is fully installed and working at the path `lib/kicad/install.ts`'s
 * `defaultKicadCli()` resolves, and `make check` invokes it there on every
 * run. A probe that runs the bare name `["kicad-cli", "--version"]` via
 * `execFileSync` would throw ENOENT and report `found: null` - correct
 * version, reported as though it does not exist. This test would FAIL
 * against that naive implementation and PASSES only once the probe resolves
 * through the installed-location default the rest of this repository
 * already uses for `kicad-cli`.
 */
test("kicad-cli's probe resolves through the installed-location default, not bare PATH", () => {
  const lock = readLock()
  const found = probeTool("kicad-cli", lock["kicad-cli"].probe)
  expect(found).not.toBeNull()
  // A tool correctly resolved and matching its pinned version is not a
  // "problem" at all - checkToolchain reports disagreements, not matches.
  expect(checkToolchain(lock).find((p) => p.tool === "kicad-cli")).toBeUndefined()
})

/**
 * FIX-ROUND REGRESSION TESTS (task-1-review.md, Important 1 and 2).
 *
 * Both prove the printed `how` targets the SAME location the probe itself
 * resolved - not merely that the string contains a plausible-looking
 * command. A `how` built from a hand-written literal instead of the
 * resolver would pass a "does it mention pip install" check while still
 * failing exactly this one, which is why each test compares against the
 * live resolver's own return value rather than a literal path.
 */

test("Important 1: copperhead's fix command clones into the directory the probe actually resolves, not a written-out literal", () => {
  const lock = { ...readLock(), copperhead: { ...readLock().copperhead, version: "0.0.1" } }
  const problem = checkToolchain(lock).find((p) => p.tool === "copperhead")
  expect(problem).toBeDefined()
  const dir = defaultCopperheadDir()
  expect(problem?.how).toContain(`git clone ${lock.copperhead.upstream} ${dir}`)
  expect(problem?.how).toContain(`git -C ${dir} checkout`)
  expect(problem?.how).toContain(`cd ${dir} && npm install`)
})

test("Important 2: akcli's fix command installs with the pip that lives beside the akcli binary the probe resolved, not bare PATH pip", () => {
  const lock = { ...readLock(), akcli: { ...readLock().akcli, version: "0.0.1" } }
  const problem = checkToolchain(lock).find((p) => p.tool === "akcli")
  expect(problem).toBeDefined()
  const akcliDir = path.dirname(defaultAkcli())
  // The pip the "how" names must be the one THIS venv provides - same
  // directory as the akcli binary `probeTool` actually resolved and ran -
  // not a bare "pip install" that a plain shell would take from PATH.
  expect(problem?.how).toContain(akcliDir)
  expect(problem?.how).not.toBe(`pip install 'akcli-kicad==0.0.1'`)
  expect(problem?.how).toContain("akcli-kicad==0.0.1")
})
