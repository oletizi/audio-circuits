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

afterAll(cleanUpTempScratch)
