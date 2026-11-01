// tests/draught/install-script.test.ts
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { readLock } from "../../tools/draught/toolchain.ts"

const REPO_ROOT = path.join(import.meta.dir, "..", "..")
const SCRIPT_PATH = path.join(REPO_ROOT, "draughting", "install.sh")

/**
 * THE GUARD AGAINST THE SCRIPT AND THE LOCK DRIFTING APART.
 *
 * `draughting/install.sh` pins copperhead's commit and akcli's pypi spec as
 * literal strings in its own text, rather than reading
 * `draughting/tools.lock.json` at install time - so this test reads the
 * script's own source and checks the lock's values appear in it verbatim.
 * A hand-edited lock that is not carried into the script fails this loudly
 * instead of the two drifting apart silently, which is the whole reason a
 * lockfile is worth having.
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
  const akcliPypi = lock.akcli?.pypi
  if (akcliPypi === undefined) {
    throw new Error(
      "draughting/tools.lock.json's akcli entry has no pypi field - this test has nothing to " +
        "check the script's pin against.",
    )
  }

  expect(script).toContain(copperheadCommit)
  expect(script).toContain(akcliPypi)
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
