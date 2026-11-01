// tests/draught/toolchain.test.ts
import { expect, test } from "bun:test"
import { checkToolchain, probeTool, readLock } from "../../tools/draught/toolchain.ts"

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
