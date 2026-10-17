/**
 * The rule for which board a materialisation starts from
 * (`tools/stripboard/materialize-base.ts`), and the one refusal that enforces
 * it at the one place a base is actually required
 * (`tools/stripboard/vero-export.ts`'s `materialize`).
 *
 * **WHAT THIS FILE DOES NOT TEST.** Whether a FRESH-IMPORT base and the
 * committed `.vrt` agree on everything `--materialize` reads off a base - that
 * comparison was run by hand against `pultec-low-boost` while implementing
 * this rule and is reported in this task's report rather than asserted here,
 * because the committed `.vrt` is never read by production code any more and
 * a test that opened it would be testing a file nothing but this suite still
 * touches.
 */
import { afterAll, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { Candidate } from "../../lib/stripboard/board.ts"
import type { ReferenceNets } from "../../lib/stripboard/cuts.ts"
import { exportNetlistFor, verorouteBinary } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { freshImportBase, noBaseNamedRefusal } from "../../tools/stripboard/materialize-base.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { materialize } from "../../tools/stripboard/vero-export.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()

/** Run the pinned fork, or throw naming the binary. Never skips. */
function runFork(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  const binary = verorouteBinary(process.env, REPO)
  const run = spawnSync(binary, [...args], { encoding: "utf8" })
  if (run.error !== undefined) {
    throw new Error(
      `could not run ${binary} ${args.join(" ")}: ${run.error.message}. This test does not ` +
        "skip when the fork is unavailable: a skipped check that looks like a passing one is " +
        "the failure mode the whole stripboard workflow exists to prevent.",
    )
  }
  return { status: run.status ?? -1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
}

/**
 * A `Candidate`/`ReferenceNets` pair `materialize` is never allowed to read in
 * the no-base test below - the guard fires before `layoutDocument` even looks
 * at them, which is itself part of what is being asserted.
 */
const EMPTY_CANDIDATE: Candidate = {
  grid: { strips: 1, columns: 1 },
  placements: [],
  wires: [],
  bridges: [],
}
const EMPTY_REFERENCE: ReferenceNets = new Map()

/**
 * `materialize` called with no base named, the way a caller spells "I have
 * nothing to pass" without inventing a sentinel path that would read as a real
 * one - see `tools/stripboard/materialize-base.ts`'s `MaterializeInput.base`
 * doc comment.
 */
function materializeWithoutABase(): void {
  const scratch = freshTempScratch("stripboard-materialize-base-")
  materialize(
    {
      candidate: EMPTY_CANDIDATE,
      reference: EMPTY_REFERENCE,
      base: "",
      layoutPath: path.join(scratch, "layout.txt"),
      outPath: path.join(scratch, "never-written.vrt"),
    },
    runFork,
  )
}

test("materialising names no base board, and refuses to guess one", () => {
  expect(() => materializeWithoutABase()).toThrow(/names no base board/)
})

test("the refusal names both candidate boards and why neither is defaulted", () => {
  expect(noBaseNamedRefusal(), "the committed .vrt, named as adoption's output").toMatch(
    /committed.*vrt.*adoption's OUTPUT/s,
  )
  expect(noBaseNamedRefusal(), "a base built fresh by --import, named as the other candidate").toMatch(
    /--import/,
  )
  expect(
    noBaseNamedRefusal(),
    "and the reason the committed one is not the default: it would carry the file's own incidental state forward",
  ).toMatch(/incidental/)
})

test("materialize never reaches the fork when no base is named", () => {
  // THE GUARD FIRES BEFORE ANY SPAWN. A fake spawn that throws on any call
  // proves the empty-base refusal is not a round trip through the fork that
  // happens to fail - it is a check materialize makes on its own input.
  const neverSpawn: SpawnVeroroute = () => {
    throw new Error("materialize spawned the fork despite naming no base board")
  }
  const scratch = freshTempScratch("stripboard-materialize-base-")
  expect(() =>
    materialize(
      {
        candidate: EMPTY_CANDIDATE,
        reference: EMPTY_REFERENCE,
        base: "",
        layoutPath: path.join(scratch, "layout.txt"),
        outPath: path.join(scratch, "never-written.vrt"),
      },
      neverSpawn,
    ),
  ).toThrow(/names no base board/)
})

test("freshImportBase builds a base that --dump-board can read, from the circuit's own netlist", async () => {
  const declaration = loadDeclaration(
    path.join(REPO, "boards", "pultec-low-boost", "perfboard.json"),
  )
  const netlist = await exportNetlistFor(declaration)
  const scratch = freshTempScratch("stripboard-materialize-base-")
  const outPath = path.join(scratch, "fresh-base.vrt")
  const built = freshImportBase({ netlist, outPath }, runFork)
  expect(built).toBe(outPath)
  expect(fs.existsSync(outPath), "freshImportBase wrote the board it named").toBe(true)
  const dump = runFork(["--dump-board", outPath])
  expect(dump.status, "the board freshImportBase built is one --dump-board can read").toBe(0)
  // EVERY PART UNPLACED: `--import`'s own contract, and the reason the base
  // must still be run through `--materialize` before anything is buildable.
  const partCount = dump.stdout.split("\n").filter((line) => line.startsWith("PART")).length
  const padCount = dump.stdout.split("\n").filter((line) => line.startsWith("PAD")).length
  expect(partCount + padCount, "the fresh base carries low-boost's full component set").toBe(27)
  expect(dump.stdout, "net names are --import's own, not the circuit's").toContain("NET_NAMES 0")
})

test("freshImportBase refuses by name when --import cannot read the netlist, and writes nothing", () => {
  const scratch = freshTempScratch("stripboard-materialize-base-")
  const outPath = path.join(scratch, "never-written.vrt")
  expect(() =>
    freshImportBase({ netlist: "this is not a netlist veroroute --import can parse", outPath }, runFork),
  ).toThrow(/vero-export-fresh-base-refused/)
  expect(fs.existsSync(outPath), "a refused import leaves nothing behind").toBe(false)
})

/**
 * `--import` can be killed AFTER it has already created the file at `-o`, and
 * guard 2 (`run.status !== 0`) is what catches that case - guard 3
 * (`!fs.existsSync`) alone would not, because the file is there.
 *
 * **REACHABILITY, ESTABLISHED RATHER THAN ASSUMED.** `RunImport`
 * (`Headless_commands.cpp:160-225`) never touches `-o` until
 * `Headless::SaveBoard` (`Headless.cpp:158-172`), which `Open()`s - creating
 * or truncating the file - BEFORE the write that can fail. Capping the file-
 * size `rlimit` to zero with `ulimit -f 0` before exec'ing the real fork lets
 * `Open()` succeed and the first byte written past it trip `SIGXFSZ`: on this
 * machine that is a real, reproducible kill, observed directly (not inferred)
 * before this test was written - `spawnSync` reports `status: null, signal:
 * "SIGXFSZ"` and a **zero-byte file survives at `outPath`**. Guard 2 and
 * guard 3 are therefore NOT redundant - this is the one case F3 of the fix
 * round asked for, found by reading `Headless::SaveBoard`'s own ordering
 * rather than guessed at.
 */
function spawnWithZeroFileSizeLimit(args: readonly string[]): {
  status: number
  stdout: string
  stderr: string
} {
  const binary = verorouteBinary(process.env, REPO)
  const run = spawnSync(
    "sh",
    ["-c", 'ulimit -f 0; exec "$0" "$@"', binary, ...args],
    { encoding: "utf8" },
  )
  // THE SAME LOUD FAILURE `runFork` ABOVE GIVES, for the same reason: a spawn
  // that never ran would otherwise reach the caller as a non-zero status and
  // read as the refusal this test is looking for. The size-zero assertion in
  // the test does back that up, but a check that only works because a second
  // one covers it is the shape this file refuses everywhere else.
  if (run.error !== undefined) {
    throw new Error(
      `could not run ${binary} under a zero file-size limit: ${run.error.message}\n` +
        "This test needs the real fork; it does not mock one, because what it establishes is " +
        "how THIS build behaves when killed mid-write.",
    )
  }
  // `ulimit -f 0` and SIGXFSZ are POSIX; this test does not run on Windows,
  // which is already true of every fork-dependent test in this repository.
  return { status: run.status ?? -1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
}

test("freshImportBase refuses by name when --import is killed after creating the file, which guard 3 alone would miss", async () => {
  const declaration = loadDeclaration(
    path.join(REPO, "boards", "pultec-low-boost", "perfboard.json"),
  )
  const netlist = await exportNetlistFor(declaration)
  const scratch = freshTempScratch("stripboard-materialize-base-")
  const outPath = path.join(scratch, "killed-mid-write.vrt")
  expect(() =>
    freshImportBase({ netlist, outPath }, spawnWithZeroFileSizeLimit),
  ).toThrow(/vero-export-fresh-base-refused/)
  // THE PREMISE THIS TEST RESTS ON: a file DOES exist here, zero bytes, which
  // is exactly why a version of this function with only guard 3 would have
  // returned `outPath` as a built base instead of refusing.
  expect(fs.existsSync(outPath), "the kill happens after Open(), so the file is there").toBe(true)
  expect(fs.statSync(outPath).size, "and nothing was written into it before the kill").toBe(0)
})

afterAll(cleanUpTempScratch)
