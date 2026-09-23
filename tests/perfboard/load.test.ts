import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { loadCircuit } from "../../tools/perfboard/load.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

/**
 * Each test writes its own throwaway circuit module to a fresh temp directory
 * (mirroring `tests/perfboard/declaration.test.ts`) and gives it a unique
 * filename, so Node/Bun's module cache never returns a stale module for a
 * path a previous test already imported.
 */
function withModule(contents: string, run: (declaration: PerfboardDeclaration) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-load-"))
  const circuitPath = path.join(dir, `circuit-${Math.random().toString(36).slice(2)}.ts`)
  fs.writeFileSync(circuitPath, contents)
  const declaration: PerfboardDeclaration = {
    file: path.join(dir, "perfboard.json"),
    dir,
    circuitPath,
    exportName: "circuit",
    vrtPath: path.join(dir, "board.vrt"),
  }
  return run(declaration).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

/**
 * Capture the rejection so a test can assert on the message TWICE - once for
 * the file path, once for the specific cause - without relying on a single
 * regex to carry both. `loadCircuit`'s contract is to always throw a real
 * `Error`, so anything else (a non-Error throw, or a resolve where a reject
 * was expected) is itself a failure worth a clear message rather than a
 * `toThrow` non-match.
 */
async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error) {
    if (error instanceof Error) return error
    throw new Error(`expected an Error to be thrown, got ${String(error)}`)
  }
  throw new Error("expected the promise to reject, but it resolved")
}

test("a well-formed module round-trips to a Network", async () => {
  await withModule(
    `export function circuit() {
      return { components: [], ports: { in: "net_in" } }
    }`,
    async (declaration) => {
      const network = await loadCircuit(declaration)
      expect(network.components).toEqual([])
      expect(network.ports).toEqual({ in: "net_in" })
    },
  )
})

test("a module that throws on import names the declaration", async () => {
  await withModule(
    `throw new Error("boom during evaluation")`,
    async (declaration) => {
      await expect(loadCircuit(declaration)).rejects.toThrow(
        new RegExp(`${declaration.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*boom during evaluation`, "s"),
      )
    },
  )
})

test("a missing named export names the declaration and lists what is exported", async () => {
  await withModule(
    `export function notTheRightName() { return { components: [], ports: {} } }`,
    async (declaration) => {
      const error = await captureError(loadCircuit(declaration))
      expect(error.message).toContain(declaration.file)
      expect(error.message).toMatch(
        /has no export named "circuit"\. It exports: notTheRightName\./,
      )
    },
  )
})

test("an export that is not a function names the declaration", async () => {
  await withModule(
    `export const circuit = { components: [], ports: {} }`,
    async (declaration) => {
      const error = await captureError(loadCircuit(declaration))
      expect(error.message).toContain(declaration.file)
      expect(error.message).toMatch(
        /export "circuit" is a object, not a function returning a Network/,
      )
    },
  )
})

test("an export returning something that is not a Network names the declaration", async () => {
  await withModule(
    `export function circuit() { return { notAComponentsArray: true } }`,
    async (declaration) => {
      const error = await captureError(loadCircuit(declaration))
      expect(error.message).toContain(declaration.file)
      expect(error.message).toMatch(
        /export "circuit" did not return a Network/,
      )
    },
  )
})
