import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  boardName, discoverDeclarations, loadDeclaration,
} from "../../tools/perfboard/declaration.ts"

function withDeclaration(contents: string, run: (file: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-decl-"))
  try {
    const file = path.join(dir, "perfboard.json")
    fs.writeFileSync(file, contents)
    run(file)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const VALID = JSON.stringify({
  circuit: "../../circuits/pt2399-core.ts", export: "pt2399Core", vrt: "board.vrt",
})

test("resolves both paths against the declaration's own directory", () => {
  withDeclaration(VALID, (file) => {
    const declaration = loadDeclaration(file)
    expect(declaration.exportName).toBe("pt2399Core")
    expect(declaration.vrtPath).toBe(path.join(path.dirname(file), "board.vrt"))
    expect(declaration.circuitPath).toBe(
      path.resolve(path.dirname(file), "../../circuits/pt2399-core.ts"),
    )
  })
})

test("the board name is its directory's basename, never a field", () => {
  withDeclaration(VALID, (file) => {
    expect(boardName(loadDeclaration(file))).toBe(path.basename(path.dirname(file)))
  })
})

test("absent field throws with field name", () => {
  withDeclaration(JSON.stringify({ export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/missing required string field "circuit"/)
  })
})

test("wrong-typed and empty fields throw with proper messages", () => {
  withDeclaration(JSON.stringify({ circuit: 5, export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/must be a string, got number/)
  })
  withDeclaration(JSON.stringify({ circuit: "  ", export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/must not be empty/)
  })
})

test("an unreadable or malformed declaration names the file", () => {
  withDeclaration("{not json", (file) => {
    expect(() => loadDeclaration(file)).toThrow(/is not valid JSON/)
  })
  withDeclaration(JSON.stringify([1, 2]), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/expected a JSON object at the top level/)
  })
})

test("a symlinked board directory refuses rather than being silently skipped", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-symlink-"))
  try {
    fs.mkdirSync(path.join(root, "real-board"), { recursive: true })
    fs.writeFileSync(path.join(root, "real-board", "perfboard.json"), VALID)
    const linkPath = path.join(root, "linked-board")
    fs.symlinkSync(path.join(root, "real-board"), linkPath, "dir")
    let caught: unknown
    try {
      discoverDeclarations(root)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    const message = caught instanceof Error ? caught.message : ""
    expect(message).toContain(linkPath)
    expect(message).toContain("symlink")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a board declaring neither sch nor netlist leaves both undefined", () => {
  withDeclaration(VALID, (file) => {
    const declaration = loadDeclaration(file)
    expect(declaration.schPath).toBeUndefined()
    expect(declaration.netlistPath).toBeUndefined()
  })
})

test("sch and netlist resolve against the declaration's own directory, like every other path", () => {
  const contents = JSON.stringify({
    sch: "../sch/board.kicad_sch",
    circuit: "../../circuits/pt2399-core.ts",
    export: "pt2399Core",
    netlist: "../fixtures/board.net",
    vrt: "board.vrt",
  })
  withDeclaration(contents, (file) => {
    const declaration = loadDeclaration(file)
    expect(declaration.schPath).toBe(path.resolve(path.dirname(file), "../sch/board.kicad_sch"))
    expect(declaration.netlistPath).toBe(path.resolve(path.dirname(file), "../fixtures/board.net"))
  })
})

test("an absolute sch path is honored as given, unmodified by the declaration's directory", () => {
  const contents = JSON.stringify({
    sch: "/absolute/path/board.kicad_sch",
    circuit: "../../circuits/pt2399-core.ts",
    export: "pt2399Core",
    netlist: "../fixtures/board.net",
    vrt: "board.vrt",
  })
  withDeclaration(contents, (file) => {
    expect(loadDeclaration(file).schPath).toBe("/absolute/path/board.kicad_sch")
  })
})

test("declaring sch without netlist is a refusal naming the fix", () => {
  const contents = JSON.stringify({
    sch: "../sch/board.kicad_sch",
    circuit: "../../circuits/pt2399-core.ts",
    export: "pt2399Core",
    vrt: "board.vrt",
  })
  withDeclaration(contents, (file) => {
    expect(() => loadDeclaration(file)).toThrow(/add "netlist", or remove "sch"/i)
  })
})

test("declaring netlist without sch is a refusal naming the fix", () => {
  const contents = JSON.stringify({
    circuit: "../../circuits/pt2399-core.ts",
    export: "pt2399Core",
    netlist: "../fixtures/board.net",
    vrt: "board.vrt",
  })
  withDeclaration(contents, (file) => {
    expect(() => loadDeclaration(file)).toThrow(/add "sch", or remove "netlist"/i)
  })
})

test("discovery matches the exact basename, not a suffix", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-tree-"))
  try {
    fs.mkdirSync(path.join(root, "a"), { recursive: true })
    fs.mkdirSync(path.join(root, "node_modules", "b"), { recursive: true })
    fs.writeFileSync(path.join(root, "a", "perfboard.json"), VALID)
    fs.writeFileSync(path.join(root, "a", "other.perfboard.json"), VALID)
    fs.writeFileSync(path.join(root, "node_modules", "b", "perfboard.json"), VALID)
    expect(discoverDeclarations(root)).toEqual([path.join(root, "a", "perfboard.json")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
