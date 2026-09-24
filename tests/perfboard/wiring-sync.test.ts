import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { assertSharedBy, syncWiringDoc, wiringDocumentFor } from "../../tools/perfboard/wiring-sync.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

const DECLARATION: PerfboardDeclaration = {
  file: "/tmp/perfboard.json",
  dir: "/tmp",
  circuitPath: "/tmp/circuit.ts",
  exportName: "board",
  vrtPath: "/tmp/board.vrt",
}

const REPO = path.resolve(import.meta.dir, "../..")

test("an absent SHARED_BY is an empty map, so a board without one still works", () => {
  expect(assertSharedBy(undefined, DECLARATION)).toEqual({})
})

test("a well-formed SHARED_BY is accepted", () => {
  expect(assertSharedBy({ out: ["low-boost"], "0": [] }, DECLARATION))
    .toEqual({ out: ["low-boost"], "0": [] })
})

test("a wrong-shaped SHARED_BY refuses, naming the net", () => {
  expect(() => assertSharedBy({ out: "low-boost" }, DECLARATION)).toThrow(/SHARED_BY\["out"\]/)
  expect(() => assertSharedBy({ out: [1] }, DECLARATION)).toThrow(/SHARED_BY\["out"\]/)
  expect(() => assertSharedBy("nope", DECLARATION)).toThrow(/must be an object/)
})

test("a board with nothing off it produces no guide at all", async () => {
  // pt2399-core has no panel parts and no terminal block. A document for it
  // would say "None" twice, which is noise a reader has to learn to skip.
  const declaration = loadDeclaration(path.join(REPO, "boards/pt2399-core/perfboard.json"))
  expect(await wiringDocumentFor(declaration)).toBeUndefined()
  const result = await syncWiringDoc(declaration)
  expect(result.status).toBe("not-applicable")
  expect(fs.existsSync(result.file)).toBe(false)
})

test("every committed guide matches what its circuit generates", async () => {
  // The property the whole sync rests on: an unchanged circuit must leave the
  // working tree clean, or `make check` would report drift on every run and the
  // signal would be worthless.
  //
  // READ-ONLY, deliberately. An earlier version of this called `syncWiringDoc`,
  // which WRITES when it finds drift - so a run against stale guides quietly
  // rewrote tracked files and then failed about the state it had just changed,
  // and the next run passed. A test must not repair the thing it is checking.
  for (const board of ["low-cut", "low-boost", "hi-cut", "hi-boost", "mid"]) {
    const declaration = loadDeclaration(path.join(REPO, `boards/pultec-${board}/perfboard.json`))
    const committed = fs.readFileSync(path.join(declaration.dir, "wiring.md"), "utf8")
    expect(await wiringDocumentFor(declaration), board).toBe(committed)
  }
})

test("a drifted guide is rewritten, and the message says the wiring changed", async () => {
  // Written into a scratch directory so the real board files are untouched; the
  // declaration still points at the real circuit, so the content is genuine.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wiring-sync-"))
  const declaration: PerfboardDeclaration = {
    file: path.join(scratch, "perfboard.json"),
    dir: scratch,
    circuitPath: path.join(REPO, "circuits/pultec/physical/low-cut.ts"),
    exportName: "pultecLowCut",
    vrtPath: path.join(scratch, "board.vrt"),
  }
  const stale = path.join(scratch, "wiring.md")
  fs.writeFileSync(stale, "# stale — this does not describe the circuit\n")

  const result = await syncWiringDoc(declaration)
  expect(result.status).toBe("written")
  expect(result.message).toMatch(/DID NOT MATCH/)
  expect(fs.readFileSync(stale, "utf8")).not.toContain("stale")
  expect(fs.readFileSync(stale, "utf8")).toContain("SW_LO_CUT")
})

test("the guide carries no timestamp, so a rewrite always means real drift", async () => {
  const declaration = loadDeclaration(path.join(REPO, "boards/pultec-mid/perfboard.json"))
  const first = await wiringDocumentFor(declaration)
  const second = await wiringDocumentFor(declaration)
  expect(first).toBe(second)
  expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}/)
})
