// tests/draught/toolchain.test.ts
import { expect, test } from "bun:test"
import path from "node:path"
import { checkToolchain, howToFix, probeTool, readLock } from "../../tools/draught/toolchain.ts"
import { defaultAkcli } from "../../tools/draught/akcli-install.ts"
import { defaultCopperheadDir } from "../../tools/draught/copperhead-install.ts"
import { defaultQpdf } from "../../tools/guide/pdf-merge-install.ts"

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

test("Important 1: copperhead's fix command targets the directory the probe actually resolves, not a written-out literal", () => {
  const lock = { ...readLock(), copperhead: { ...readLock().copperhead, version: "0.0.1" } }
  const problem = checkToolchain(lock).find((p) => p.tool === "copperhead")
  expect(problem).toBeDefined()
  const dir = defaultCopperheadDir()
  expect(problem?.how).toContain(dir)
  expect(problem?.how).toContain(`git -C ${dir} checkout`)
  expect(problem?.how).toContain(`cd ${dir} && npm ci`)
  // Final review I-1: these four assertions pinned `npm install` and so
  // DEFENDED the bug - the one command `draughting/install.sh` refuses to
  // use. `npm ci` is not a substring of `npm install`, so the positive
  // assertion above cannot catch a regression on its own; this one can.
  expect(problem?.how).not.toContain("npm install")
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

/**
 * R6 (rulings.md): BOOTSTRAP VERSUS UPGRADE ARE TWO DIFFERENT COMMANDS, AND
 * `howToFix` PRINTED THE SAME ONE FOR BOTH STATES UNTIL NOW.
 *
 * `git clone` refuses outright onto a directory that already exists; `pip
 * install` into a venv's `bin/pip` fails `No such file or directory` when
 * that venv was never created. The old, unconditional `how` strings were
 * each correct for exactly one of the two states a disagreement can be in -
 * copperhead's for "absent", akcli's for "present but wrong version" - and
 * wrong, in a way that would fail outright if run, for the other.
 *
 * These four tests drive `howToFix` directly with a synthetic `found`
 * rather than through a real probe, so each state is exercised
 * deterministically regardless of whether copperhead or akcli happen to be
 * installed on the machine the suite runs on - Important 1 and 2 above
 * already cover the "the probe really ran against what's on disk" half of
 * this; these cover the two command shapes `howToFix` must choose between.
 */

test("R6 bootstrap: copperhead's fix clones fresh when the probe found nothing at all", () => {
  const spec = readLock().copperhead
  const how = howToFix("copperhead", spec, null)
  const dir = defaultCopperheadDir()
  expect(how).toContain(`git clone ${spec.upstream} ${dir}`)
  expect(how).toContain(`git -C ${dir} checkout ${spec.commit}`)
  expect(how).toContain(`cd ${dir} && npm ci`)
  expect(how).not.toContain("npm install")
})

test("R6 upgrade: copperhead's fix fetches and checks out in place, never clones, once a checkout answers the probe at all", () => {
  const spec = readLock().copperhead
  const how = howToFix("copperhead", spec, "0.0.1-some-other-commit")
  const dir = defaultCopperheadDir()
  expect(how).not.toContain("git clone")
  expect(how).toContain(`git -C ${dir} fetch`)
  expect(how).toContain(`git -C ${dir} checkout ${spec.commit}`)
  expect(how).toContain(`cd ${dir} && npm ci`)
  expect(how).not.toContain("npm install")
})

test("R6 bootstrap: akcli's fix creates the venv before installing into it when the probe found nothing at all", () => {
  const spec = readLock().akcli
  const how = howToFix("akcli", spec, null)
  const venvDir = path.dirname(path.dirname(defaultAkcli()))
  expect(how).toContain(`python3 -m venv ${venvDir}`)
  expect(how).toContain(`install 'akcli-kicad==${spec.version}'`)
})

test("R6 upgrade: akcli's fix installs directly, with no venv creation, once the binary answers the probe at all", () => {
  const spec = readLock().akcli
  const how = howToFix("akcli", spec, "0.0.1")
  expect(how).not.toContain("python3 -m venv")
  expect(how).toContain(`install 'akcli-kicad==${spec.version}'`)
})

/**
 * FIX ROUND 2, M-2 REGRESSION (task-3-review.md). `howToFix`'s bootstrap
 * branch used to require `tool === "akcli"` literally, in ADDITION to
 * `found === null` and a resolved binary - which is exactly the bug R6
 * exists to fix, reproduced in R6's own fix: akcli is the only tool in the
 * real lock that is both pypi-backed and resolver-backed today, so the
 * literal name check was invisible until a second one existed.
 *
 * `qpdf` is a real entry in the lock with a real resolver
 * (`tools/guide/pdf-merge-install.ts`'s `defaultQpdf`) that is NOT
 * pypi-backed in reality - this test gives it a synthetic `pypi` field
 * (`spec.pypi !== undefined`, exactly the gate `howToFix` already checks)
 * to stand in for "a second pypi-backed, resolver-backed tool", and drives
 * `howToFix` directly with `found: null`. Against the unfixed code (`tool
 * === "akcli"` required) this returns a bare `pip install` with no venv
 * creation for "qpdf" - wrong, for the same reason it was wrong for akcli
 * before R6. The fix derives the branch from `found` and the spec alone,
 * so a tool's NAME is irrelevant to which command it gets.
 */
test("M-2 regression: the bootstrap venv-creation branch is not gated on the literal tool name 'akcli'", () => {
  const qpdfSpec = readLock().qpdf
  const syntheticSecondPypiTool = { ...qpdfSpec, pypi: "some-other-pypi-package==1.0.0" }
  const how = howToFix("qpdf", syntheticSecondPypiTool, null)
  const venvDir = path.dirname(path.dirname(defaultQpdf()))
  expect(how).toContain(`python3 -m venv ${venvDir}`)
  expect(how).toContain("install 'some-other-pypi-package==")
})

/**
 * FIX ROUND 3 (task-3-review.md). `howToFix`'s clone-or-fetch branch used
 * to require `tool === "copperhead"` literally, in addition to
 * `spec.commit !== undefined && spec.upstream !== undefined` - the SAME bug
 * M-2 fixed for the pypi branch, one line further down in the same
 * function. This pins the decision the fix round made: the CONDITION is
 * derived from the spec alone now, but the DIRECTORY still has to come
 * from a per-tool resolver (`RESOLVED_CHECKOUT_DIR`), because dropping the
 * name check without also keying the directory by name would make a
 * second commit-pinned tool silently receive COPPERHEAD's own checkout
 * directory - a wrong answer, not merely an incomplete one.
 *
 * A synthetic tool, NOT "copperhead", carrying `commit` and `upstream` but
 * absent from `RESOLVED_CHECKOUT_DIR` (there is no second real
 * git-checked-out tool in the lock to reuse the way M-2's test reused
 * `qpdf`'s real resolver) must fall through to the generic
 * `install ... from ...` message - proving the fix does not guess a
 * directory for a tool it does not actually know how to find.
 */
test("fix round 3 regression: a second commit-pinned tool with no known checkout directory does not get copperhead's", () => {
  const syntheticSecondCommitPinnedTool = {
    version: "1.0.0",
    probe: ["echo", "1.0.0"],
    commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    upstream: "https://example.invalid/widget",
  }
  const how = howToFix("widget", syntheticSecondCommitPinnedTool, null)
  expect(how).toBe("install widget 1.0.0 from https://example.invalid/widget")
  expect(how).not.toContain(defaultCopperheadDir())
  expect(how).not.toContain("git clone")
})

/**
 * THE OTHER HALF OF THE SAME FIX, SO THE REAL TOOL IS NOT LEFT UNCHECKED:
 * copperhead itself, the one tool actually in `RESOLVED_CHECKOUT_DIR`,
 * must still get its real clone/fetch commands after the generalisation -
 * Important 1 and "R6 bootstrap/upgrade" above already cover this through
 * `checkToolchain`'s real probe and directly, respectively; this is the
 * same claim stated once more beside the round-3 test for a reader
 * comparing the two.
 */
test("fix round 3: copperhead itself is unaffected by the generalisation - still resolves through RESOLVED_CHECKOUT_DIR", () => {
  const spec = readLock().copperhead
  const dir = defaultCopperheadDir()
  expect(howToFix("copperhead", spec, null)).toContain(`git clone ${spec.upstream} ${dir}`)
  expect(howToFix("copperhead", spec, "0.0.1-other")).toContain(`git -C ${dir} fetch`)
})
