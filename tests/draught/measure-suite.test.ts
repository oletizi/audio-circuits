// tests/draught/measure-suite.test.ts
//
// Task 4 of .superpowers/sdd/2026-10-30-institutionalise-draughting: the
// measurement scripts that used to be copied forward from run directory to
// run directory now have one home, draughting/measure/. This test drives
// that home's own positive-control suite rather than re-asserting any of its
// individual numbers - selftest.py is itself the thing that proves the
// shared KiCad-sheet reader works, by perturbing real committed sheets and
// checking the count moves. See docs/research/2026-10-30-lying-checks.md for
// why a script that cannot fail is the defect class this exists to prevent.
import { expect, test } from "bun:test"
import { execFileSync, spawnSync } from "node:child_process"
import path from "node:path"

const MEASURE_DIR = path.join(import.meta.dir, "..", "..", "draughting", "measure")

test("the measurement suite's own selftest reports every control moved or fired", () => {
  const out = execFileSync("python3", ["draughting/measure/selftest.py"], { encoding: "utf8" })
  expect(out).toContain("every one moved or fired")
  expect(out).toMatch(/\d+ controls/)
})

/**
 * FINAL REVIEW M-2: FOUR PROMOTED SCRIPTS WERE EXERCISED BY NOTHING, AND
 * THREE OF THEM REFUSED WITHOUT NAMING ANYTHING.
 *
 * `netcmp.py` and `crop.py` raised a bare `IndexError: list index out of
 * range` on missing arguments. `center.py` was worse: it refused with
 * `__doc__.strip().splitlines()[5]`, which is the BLANK line above its usage,
 * so it exited 1 having printed nothing at all. `paper_fit.py` - the one
 * `make draw` runs on every call - had the same bare `IndexError` and is
 * fixed with them.
 *
 * This drives each refusal with no arguments at all: a non-zero exit, the
 * script's own name, a count of what it got, and its own `usage:` line quoted
 * out of its docstring by SEARCH rather than by index. The index is what
 * broke `center.py`, so a test that accepted any non-empty message would miss
 * exactly the defect this closes - hence the usage assertion.
 *
 * `framegeom.py`, the fourth unexercised script, is driven by
 * `./install-script.test.ts` instead, where its numpy and Pillow imports are
 * the subject.
 */
const REFUSERS: readonly { readonly script: string; readonly needs: string }[] = [
  { script: "netcmp.py", needs: "two sheets to compare" },
  { script: "crop.py", needs: "a sheet, a side and an output prefix" },
  { script: "center.py", needs: "an input sheet, an output sheet and the frame's x bounds" },
  { script: "paper_fit.py", needs: "exactly one sheet to measure" },
]

test("the refuser list this file drives is not empty", () => {
  expect(REFUSERS.length).toBeGreaterThan(0)
})

for (const { script, needs } of REFUSERS) {
  test(`${script} run with no arguments refuses, naming itself, what it needs and its usage`, () => {
    const result = spawnSync("python3", [path.join(MEASURE_DIR, script)], { encoding: "utf8" })
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
    expect(result.status).not.toBe(0)
    expect(output).toContain(script)
    expect(output).toContain(needs)
    expect(output).toContain(`usage: ${script}`)
    // The bare IndexError this replaced named nothing about what was missing.
    expect(output).not.toContain("IndexError")
  })
}
