import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { checkPerfboard, verorouteBinary } from "../../tools/perfboard/check.ts"
import { resolveBinary } from "../../tools/perfboard/acquire.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function declaration(vrtPath: string): PerfboardDeclaration {
  return {
    file: "/tmp/perfboard.json", dir: "/tmp",
    circuitPath: "/tmp/circuit.ts", exportName: "circuit", vrtPath,
  }
}

function withVrt(run: (vrtPath: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-"))
  const vrtPath = path.join(dir, "board.vrt")
  fs.writeFileSync(vrtPath, "59")
  return run(vrtPath).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-repo-"))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const netlist = () => Promise.resolve("( { EESchema Netlist Version 1.1 created  x }\n)\n*\n")

// `verorouteBinary` used to say unset always throws "VEROROUTE is not set".
// It no longer does: unset now resolves through the same rule
// `resolveBinary` (tools/perfboard/acquire.ts) implements, so it succeeds
// when a binary already sits at the acquired path and only refuses when one
// does not - and even then, RESOLVING that path must never ACQUIRE it. These
// four tests replace the old single "has no default" test with one case per
// branch of that rule.

test("VEROROUTE set to a real path is returned unchanged, with no existence check", () => {
  expect(verorouteBinary({ VEROROUTE: "/bin/veroroute" }, "/repo")).toBe("/bin/veroroute")
})

test("VEROROUTE set but empty refuses rather than guessing unset was meant", () => {
  expect(() => verorouteBinary({ VEROROUTE: "   " }, "/repo")).toThrow(/set but empty/)
})

test("VEROROUTE unset resolves to the acquired path and returns it when a binary is already there", () => {
  withTempDir((repoRoot) => {
    const acquiredPath = resolveBinary({}, repoRoot).path
    fs.mkdirSync(path.dirname(acquiredPath), { recursive: true })
    fs.writeFileSync(acquiredPath, "#!/bin/sh\n")
    expect(verorouteBinary({}, repoRoot)).toBe(acquiredPath)
  })
})

test("VEROROUTE unset with no binary built yet refuses naming the veroroute verb, and never acquires anything itself", () => {
  withTempDir((repoRoot) => {
    // No binary is created at the acquired path, and nothing here ever calls
    // acquire() - a resolution failure must never become a silent build.
    expect(() => verorouteBinary({}, repoRoot)).toThrow(/"veroroute" verb/)
  })
})

test("exit 0 is ok and exit 1 is not, both carrying the report verbatim", async () => {
  await withVrt(async (vrtPath) => {
    const clean = await checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 0, output: "Layout state\n  all nets complete\n" }),
    })
    expect(clean.ok).toBe(true)
    expect(clean.report).toBe("Layout state\n  all nets complete\n")

    const stale = await checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 1, output: "Schematic delta\n  C17 added\n" }),
    })
    expect(stale.ok).toBe(false)
    expect(stale.report).toBe("Schematic delta\n  C17 added\n")
  })
})

test("an unexpected exit status throws rather than being mapped to a verdict", async () => {
  await withVrt(async (vrtPath) => {
    await expect(checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 139, output: "" }),
    })).rejects.toThrow(/unexpected exit code 139/)
  })
})

test("a missing layout names the declaration's .vrt", async () => {
  await expect(checkPerfboard(declaration("/nonexistent/board.vrt"), {
    exportNetlist: netlist,
    runCheck: () => ({ status: 0, output: "" }),
  })).rejects.toThrow(/layout not found/)
})

test("a circuit that fails to export stops the run before the binary is reached", async () => {
  await withVrt(async (vrtPath) => {
    let ran = false
    await expect(checkPerfboard(declaration(vrtPath), {
      exportNetlist: () => Promise.reject(new Error("unmapped footprint")),
      runCheck: () => { ran = true; return { status: 0, output: "" } },
    })).rejects.toThrow(/unmapped footprint/)
    expect(ran).toBe(false)
  })
})

/**
 * These tests exercise `exportNetlistFor` for real (no `deps.exportNetlist`
 * override), because that is the only place `DESIGNATORS`/`PIN_NUMBERS`
 * content validation lives. Each writes a throwaway circuit module to disk
 * that imports the real builder from `lib/model/index.ts`, so the whole
 * load -> validate -> lower -> write pipeline runs, with only `runCheck`
 * (the veroroute spawn) injected.
 */
const MODEL_INDEX_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..", "lib", "model", "index.ts",
)

const VALID_BOARD_SOURCE = `
import { circuit } from ${JSON.stringify(MODEL_INDEX_PATH)}

export function board() {
  return circuit()
    .resistor("r1", "10K", { a: "IN", b: "GND" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .port("input", "IN").port("ground", "GND")
    .done()
}
`

function withCircuitModule(
  source: string,
  run: (declaration: PerfboardDeclaration) => Promise<void>,
): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-mod-"))
  const circuitPath = path.join(dir, `circuit-${Math.random().toString(36).slice(2)}.ts`)
  fs.writeFileSync(circuitPath, source)
  const vrtPath = path.join(dir, "board.vrt")
  fs.writeFileSync(vrtPath, "59")
  const decl: PerfboardDeclaration = {
    file: path.join(dir, "perfboard.json"), dir,
    circuitPath, exportName: "board", vrtPath,
  }
  return run(decl).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

test("a well-formed circuit, DESIGNATORS and PIN_NUMBERS reach the binary as a real netlist", async () => {
  await withCircuitModule(
    `${VALID_BOARD_SOURCE}
     export const DESIGNATORS = { r1: "R1" }
     export const PIN_NUMBERS = { resistor: { a: "1", b: "2" } }`,
    async (decl) => {
      let netText = ""
      const result = await checkPerfboard(decl, {
        runCheck: (_vrt, netPath) => {
          netText = fs.readFileSync(netPath, "utf8")
          return { status: 0, output: "all nets complete" }
        },
      })
      expect(result.ok).toBe(true)
      expect(netText).toContain("R1")
      expect(netText).toContain("RESISTOR4")
    },
  )
})

test("a DESIGNATORS entry that is not a string names the entry and never reaches the binary", async () => {
  await withCircuitModule(
    `${VALID_BOARD_SOURCE}
     export const DESIGNATORS = { r1: 42 }
     export const PIN_NUMBERS = { resistor: { a: "1", b: "2" } }`,
    async (decl) => {
      let ran = false
      await expect(checkPerfboard(decl, {
        runCheck: () => { ran = true; return { status: 0, output: "" } },
      })).rejects.toThrow(/DESIGNATORS\["r1"\] must be a string designator, got number/)
      expect(ran).toBe(false)
    },
  )
})

test("a PIN_NUMBERS entry that is not an object names the entry and never reaches the binary", async () => {
  await withCircuitModule(
    `${VALID_BOARD_SOURCE}
     export const DESIGNATORS = { r1: "R1" }
     export const PIN_NUMBERS = { resistor: "not-an-object" }`,
    async (decl) => {
      let ran = false
      await expect(checkPerfboard(decl, {
        runCheck: () => { ran = true; return { status: 0, output: "" } },
      })).rejects.toThrow(/PIN_NUMBERS\["resistor"\] must be an object/)
      expect(ran).toBe(false)
    },
  )
})

test("a PIN_NUMBERS nested value that is not a string names the entry and never reaches the binary", async () => {
  await withCircuitModule(
    `${VALID_BOARD_SOURCE}
     export const DESIGNATORS = { r1: "R1" }
     export const PIN_NUMBERS = { resistor: { a: 1, b: "2" } }`,
    async (decl) => {
      let ran = false
      await expect(checkPerfboard(decl, {
        runCheck: () => { ran = true; return { status: 0, output: "" } },
      })).rejects.toThrow(/PIN_NUMBERS\["resistor"\]\["a"\] must be a string pin number, got number/)
      expect(ran).toBe(false)
    },
  )
})
