import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runImport } from "../../tools/perfboard/import.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import type { VerbDeps } from "../../tools/perfboard/verbs.ts"

function board(): PerfboardDeclaration {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-import-"))
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
