/**
 * `make check` routes on the declaration's `kind` (design change C1).
 *
 * A `pcb` board has no VeroRoute layout, so its `check` must run `netlist-agrees`
 * and then `tests/circuits/<board>.test.ts`, and must never reach `veroroute`,
 * `wiring`, `scaffold-membership` or `perfboard.ts check`. A perfboard board's
 * `check` is unchanged.
 *
 * THE BOARD IS BUILT UNDER `boards/` AND ITS TEST UNDER `tests/circuits/`, and
 * both are removed in `afterAll`. That is not a convenience: `make/board.mk` derives
 * the test path from `$(REPO_ROOT)`, which `make/veroroute.mk` fixes from its own
 * location, and the declaration loader and the CLI come from the same root, so a
 * board directory outside the repository cannot reach any of them. The names carry
 * the process id so two runs cannot collide.
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

const REPO = moduleRepoRoot()
const NAME = `zz-kind-route-${process.pid}`
const BOARD_DIR = path.join(REPO, "boards", NAME)
const TEST_FILE = path.join(REPO, "tests", "circuits", `${NAME}.test.ts`)
const SENTINEL = `kind routing sentinel for ${NAME} ran`

function makeCheck(): { status: number | null; output: string } {
  const run = spawnSync("make", ["-C", BOARD_DIR, "check"], { encoding: "utf8" })
  return { status: run.status, output: `${run.stdout}${run.stderr}` }
}

function removeScratch(): void {
  fs.rmSync(BOARD_DIR, { recursive: true, force: true })
  fs.rmSync(TEST_FILE, { force: true })
}

beforeAll(() => {
  removeScratch()
  fs.mkdirSync(BOARD_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(BOARD_DIR, "Makefile"),
    "include $(shell git rev-parse --show-toplevel)/make/perfboard.mk\n",
  )
  fs.writeFileSync(
    path.join(BOARD_DIR, "perfboard.json"),
    JSON.stringify({ kind: "pcb", circuit: "../../circuits/opamp-buffer/opamp-buffer.ts", export: "opampBuffer" }),
  )
})

afterAll(removeScratch)

test("a pcb board's check runs its test and never reaches the perfboard tools", () => {
  fs.writeFileSync(
    TEST_FILE,
    `import { test, expect } from "bun:test"\ntest(${JSON.stringify(SENTINEL)}, () => { console.log(${JSON.stringify(SENTINEL)}); expect(1).toBe(1) })\n`,
  )
  const { status, output } = makeCheck()
  expect(output).toContain(SENTINEL)
  expect(status).toBe(0)
  expect(output).not.toContain("veroroute")
  expect(output).not.toContain("perfboard check")
  expect(output).not.toContain("scaffold-membership")
  expect(output).not.toContain("wiring")
})

test("a pcb board with no tests/circuits/<board>.test.ts fails, naming the file", () => {
  fs.rmSync(TEST_FILE, { force: true })
  const { status, output } = makeCheck()
  expect(status).not.toBe(0)
  expect(output).toContain(`tests/circuits/${NAME}.test.ts`)
})
