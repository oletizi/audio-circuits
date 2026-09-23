import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { checkPerfboard, verorouteBinary } from "../../tools/perfboard/check.ts"
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

const netlist = () => Promise.resolve("( { EESchema Netlist Version 1.1 created  x }\n)\n*\n")

test("VEROROUTE has no default and says what to set", () => {
  expect(() => verorouteBinary({})).toThrow(/VEROROUTE is not set/)
  expect(() => verorouteBinary({ VEROROUTE: "  " })).toThrow(/set but empty/)
  expect(verorouteBinary({ VEROROUTE: "/bin/veroroute" })).toBe("/bin/veroroute")
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
