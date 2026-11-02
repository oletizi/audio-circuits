// tests/draught/install-script.test.ts
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { readLock } from "../../tools/draught/toolchain.ts"
import { defaultAkcliVenvPython } from "../../tools/draught/akcli-install.ts"

const REPO_ROOT = path.join(import.meta.dir, "..", "..")
const SCRIPT_PATH = path.join(REPO_ROOT, "draughting", "install.sh")

/**
 * THE GUARD AGAINST THE SCRIPT AND THE LOCK DRIFTING APART.
 *
 * `draughting/install.sh` pins copperhead's commit and every pypi spec as
 * literal strings in its own text, rather than reading
 * `draughting/tools.lock.json` at install time - so this test reads the
 * script's own source and checks the lock's values appear in it verbatim.
 * A hand-edited lock that is not carried into the script fails this loudly
 * instead of the two drifting apart silently, which is the whole reason a
 * lockfile is worth having.
 *
 * **IT IS DERIVED FROM THE LOCK RATHER THAN FROM TWO NAMED KEYS, AND THE
 * FINAL REVIEW'S I-3 IS WHY.** This test looked up `lock.copperhead.commit`
 * and `lock.akcli.pypi` by name. `TOOLING.md`'s reproduction also installs
 * `numpy` and `pillow` into that same venv and says in bold why; the script
 * installed neither, and `draughting/measure/framegeom.py` raised
 * `ModuleNotFoundError` at HEAD as a result - with this guard passing
 * throughout, because the two packages it did not know about could not
 * disagree with it. Every `pypi` field in the lock is now checked, so a
 * package added to the lock and not to the script fails here by name.
 */
test("the install script pins exactly the versions the lockfile names", () => {
  const script = readFileSync(SCRIPT_PATH, "utf8")
  const lock = readLock()

  const copperheadCommit = lock.copperhead?.commit
  if (copperheadCommit === undefined) {
    throw new Error(
      "draughting/tools.lock.json's copperhead entry has no commit - this test has nothing to " +
        "check the script's pin against.",
    )
  }
  expect(script).toContain(copperheadCommit)

  const pypiSpecs = Object.entries(lock).flatMap(([tool, spec]) =>
    spec.pypi === undefined ? [] : [[tool, spec.pypi] as const],
  )
  if (pypiSpecs.length === 0) {
    throw new Error(
      "draughting/tools.lock.json names no pypi-backed tool at all - this half of the guard " +
        "would iterate nothing, which is a check that cannot fail.",
    )
  }
  const unpinned = pypiSpecs.filter(([, pypi]) => !script.includes(pypi))
  expect(
    unpinned.map(([tool, pypi]) => `${tool}: ${pypi}`),
    "draughting/install.sh's own text does not carry these pypi specs, so running it installs " +
      "something other than what the lock names - or, as with numpy and pillow before the final " +
      "review's I-3, does not install them at all.",
  ).toEqual([])
})

/**
 * I-3's OTHER HALF: THE PROMOTED SCRIPT THAT COULD NOT RUN.
 *
 * `draughting/measure/framegeom.py` imports `numpy` and `PIL` at module
 * scope, is a promoted member of the measurement suite, and is what
 * `paper_fit.py`'s docstring sends a reader to if this KiCad's frame
 * geometry is ever in question. It was exercised by no test and by no `make
 * draw` step, and at HEAD it raised `ModuleNotFoundError: No module named
 * 'numpy'` - so a script that could not run read as available.
 *
 * `--help` rather than a real run: argparse prints usage and exits 0, which
 * happens AFTER both imports, so this fails on a venv missing either library
 * while costing no render. It runs under the venv's own python deliberately -
 * that is the interpreter `TOOLING.md` says these libraries go into, and the
 * one `make draw` would have to use to call this script. A real run needs a
 * `--work` directory and a `kicad-cli` render; `selftest.py` is where the
 * suite's behavioural controls live.
 */
test("I-3: framegeom.py's numpy and Pillow imports are satisfied in the venv the install script fills", () => {
  const python = defaultAkcliVenvPython()
  const script = path.join(REPO_ROOT, "draughting", "measure", "framegeom.py")
  const usage = execFileSync(python, [script, "--help"], { encoding: "utf8" })
  expect(usage).toContain("--work")
})

/**
 * R2 (rulings.md): the install script's two target directories must be
 * gitignored in the SAME commit that adds the script, because the window
 * between the script creating them and something ignoring them is exactly
 * when a careless `git add -A` would sweep a vendored toolchain into the
 * repository this project explicitly chose an install script to avoid
 * vendoring in the first place. Checked individually, with `-v`, rather than
 * as one `check-ignore` call on both paths at once: `git check-ignore`'s own
 * exit status is "one or more of the given paths is ignored", so a single
 * call covering both paths would still exit 0 if only one of the two were
 * actually covered.
 */
test("both of the install script's target directories are ignored by git", () => {
  for (const target of ["draughting/copperhead", "draughting/venv-akcli"]) {
    const output = execFileSync("git", ["check-ignore", "-v", target], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
    expect(output).toContain(target)
  }
})
