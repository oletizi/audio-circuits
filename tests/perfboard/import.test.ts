import { test, expect, afterEach } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runImport } from "../../tools/perfboard/import.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import type { VerbDeps } from "../../tools/perfboard/verbs.ts"

const createdDirs: string[] = []

afterEach(() => {
  for (const dir of createdDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

function board(): PerfboardDeclaration {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-import-"))
  createdDirs.push(dir)
  return {
    file: path.join(dir, "perfboard.json"), dir,
    circuitPath: path.join(dir, "circuit.ts"), exportName: "circuit",
    vrtPath: path.join(dir, "board.vrt"),
  }
}

function deps(status: number, calls: string[][]): VerbDeps {
  return {
    exportNetlist: async () => "NETLIST",
    runVeroroute: (args) => {
      calls.push([...args])
      const out = args[args.indexOf("-o") + 1]
      if (status === 0 && out !== undefined) fs.writeFileSync(out, "VRT")
      return { status, output: status === 0 ? "" : "import failed" }
    },
  }
}

test("creates the first layout from the circuit's netlist", async () => {
  const declaration = board()
  const calls: string[][] = []
  const report = await runImport(declaration, deps(0, calls))
  expect(calls[0]?.[0]).toBe("--import")
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("VRT")
  expect(report).toMatch(/unplaced/)
})

test("refuses when the layout already exists, pointing at update", async () => {
  const declaration = board()
  fs.writeFileSync(declaration.vrtPath, "EXISTING")
  await expect(runImport(declaration, deps(0, []))).rejects.toThrow(/update/)
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("EXISTING")
})

test("a failed import writes nothing and leaves no temp file behind", async () => {
  const declaration = board()
  await expect(runImport(declaration, deps(1, []))).rejects.toThrow(/import failed/)
  expect(fs.readdirSync(declaration.dir).filter((f) => f.endsWith(".vrt"))).toEqual([])
})

test("a zero exit that produced no file is an error, not a success", async () => {
  // The binary reporting success without writing anything is not the same as
  // success. Without this, `replaceAtomically` is the only thing standing
  // between that and a board directory with no layout in it and no complaint.
  const declaration = board()
  const silent: VerbDeps = {
    exportNetlist: async () => "NETLIST",
    runVeroroute: () => ({ status: 0, output: "" }),
  }
  await expect(runImport(declaration, silent)).rejects.toThrow(/produced no output file/)
  expect(fs.existsSync(declaration.vrtPath)).toBe(false)
})

test("a temporary file left by an interrupted run is never installed", async () => {
  // The crash-recovery case. An earlier run died between the binary writing its
  // output and the rename. `tempPathAlongside` includes the pid and a
  // timestamp, so this run's produced path cannot collide with that corpse -
  // and this test is what would fail if anyone ever simplified that name to a
  // fixed one, at which point the corpse would be adopted as this run's output
  // and installed as a layout built from a netlist nobody exported.
  const declaration = board()
  const corpse = path.join(declaration.dir, ".board.import-1234-5678900.vrt")
  fs.writeFileSync(corpse, "STALE FROM A CRASHED RUN")

  const silent: VerbDeps = {
    exportNetlist: async () => "NETLIST",
    runVeroroute: () => ({ status: 0, output: "" }),
  }
  await expect(runImport(declaration, silent)).rejects.toThrow(/produced no output file/)
  expect(fs.existsSync(declaration.vrtPath)).toBe(false)
})
