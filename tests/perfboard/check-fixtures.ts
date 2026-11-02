/**
 * What `tests/perfboard/check.test.ts` and
 * `tests/perfboard/check-buildability.test.ts` both hand `checkPerfboard`.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper two test files import, following
 * `tests/stripboard/grade-fixtures.ts`. The split happened when the buildability
 * verifiers were admitted to `make check` and one file went past the line
 * ceiling; these four helpers were already shared by both halves, and a copy in
 * each would have been two declarations of one throwaway board.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import type { ConstraintId } from "../../tools/stripboard/constraints-model.ts"
import { healthyInput } from "../stripboard/grade-fixtures.ts"

/** A declaration pointing at one throwaway layout, with nothing else on disk. */
export function declaration(vrtPath: string): PerfboardDeclaration {
  return {
    file: "/tmp/perfboard.json", dir: "/tmp",
    circuitPath: "/tmp/circuit.ts", exportName: "circuit", vrtPath,
  }
}

/** A two-byte `.vrt` in a temp directory, removed afterwards. */
export function withVrt(run: (vrtPath: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-"))
  const vrtPath = path.join(dir, "board.vrt")
  fs.writeFileSync(vrtPath, "59")
  return run(vrtPath).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

/** A minimal legacy export, for the tests that are not about the netlist. */
export const netlist = (): Promise<string> =>
  Promise.resolve("( { EESchema Netlist Version 1.1 created  x }\n)\n*\n")

/**
 * The buildability input every test that is NOT about the four verifiers hands
 * `checkPerfboard`: the board on which all ten hard constraints hold.
 *
 * IT IS INJECTED RATHER THAN LEFT TO THE REAL PATH because the real path dumps
 * the declared `.vrt` with the veroroute binary, and every layout these tests
 * declare is the two bytes `withVrt` writes. The four are still GRADED - this is
 * an input, not a verdict - so each of those tests also establishes that a
 * passing board's report carries the section.
 */
export const healthyBuildability = (): Promise<ReturnType<typeof healthyInput>> =>
  Promise.resolve(healthyInput())

/**
 * The one line the buildability section prints for one constraint.
 *
 * **IT EXISTS BECAUSE A REGEX OVER THE WHOLE REPORT MATCHES THE WRONG LINE.**
 * The section prints all four constraints, and a held constraint's detail is
 * long prose that names parts, footprints, nets and other constraints' ids -
 * `HC9`'s own pass text mentions `HC10`, and `HC8`'s mentions `HC2`. So
 * `/HC10/` or `/C19/` against the report can pass for a reason other than the
 * one the test names, which is the defect class this plan hit five times.
 * Asserting against ONE constraint's line, found by its own prefix, is what
 * makes the verdict and the offending part the thing being matched.
 *
 * It refuses rather than returning `""` when the line is absent or doubled: a
 * helper that returned an empty string would make every `toContain` below fail
 * for a reason that reads like the constraint's, and a doubled line means the
 * section's own shape has moved.
 */
export function lineFor(report: string, id: ConstraintId): string {
  const prefix = `  ${id} `
  const found = report.split("\n").filter((line) => line.startsWith(prefix))
  if (found.length !== 1) {
    throw new Error(
      `expected exactly one "${prefix.trim()}" line in the buildability section and found ` +
        `${found.length}. The report, verbatim:\n${report}`,
    )
  }
  return found[0] ?? ""
}
