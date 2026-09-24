import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createBoard } from "../../tools/perfboard/create.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function declarationIn(dir: string): PerfboardDeclaration {
  return {
    file: path.join(dir, "perfboard.json"),
    dir,
    circuitPath: path.join(dir, "circuit.ts"),
    exportName: "board",
    vrtPath: path.join(dir, "board.vrt"),
  }
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-create-"))
}

test("create writes the layout the binary produced", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  const report = await createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: (_netPath, outPath) => {
      fs.writeFileSync(outPath, "VRT")
      return { status: 0, output: "imported 3 parts" }
    },
  })
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("VRT")
  expect(report).toContain("imported 3 parts")
})

test("create refuses when a layout already exists, and does not touch it", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  fs.writeFileSync(declaration.vrtPath, "HAND AUTHORED")
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => { throw new Error("must not run") },
  })).rejects.toThrow(/already exists/)
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("HAND AUTHORED")
})

test("a non-zero exit leaves no layout behind", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => ({ status: 1, output: "netlist unreadable" }),
  })).rejects.toThrow(/netlist unreadable/)
  expect(fs.existsSync(declaration.vrtPath)).toBe(false)
})

test("a zero exit that produced no file is an error, not a success", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => ({ status: 0, output: "ok" }),
  })).rejects.toThrow(/produced no output file/)
})

test("a stale temporary file from an interrupted run is never installed", async () => {
  // The crash-recovery case. An earlier run died after the binary wrote its
  // output and before the rename. If the temporary name were fixed, this run's
  // "did the binary produce a file?" test would find that corpse, take it for
  // its own output, and install a layout built from a netlist this run never
  // exported - reporting success the whole way.
  const dir = tempDir()
  const declaration = declarationIn(dir)
  fs.writeFileSync(`${declaration.vrtPath}.creating`, "STALE FROM A CRASHED RUN")
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith(".creating")) fs.writeFileSync(path.join(dir, name), "STALE")
  }
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => ({ status: 0, output: "ok" }),
  })).rejects.toThrow(/produced no output file/)
  expect(fs.existsSync(declaration.vrtPath)).toBe(false)
})
