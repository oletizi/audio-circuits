import { test, expect } from "bun:test"
import path from "node:path"
import { runSchematicStub } from "../../tools/cli/schematic-stub.ts"
import type { SchematicStubDeps } from "../../tools/cli/schematic-stub.ts"

function harness(existing: ReadonlySet<string>) {
  const written = new Map<string, string>()
  const logs: string[] = []
  const errors: string[] = []
  let n = 0
  const deps: SchematicStubDeps = {
    exists: (p) => existing.has(p),
    write: (p, text) => { written.set(p, text) },
    newUuid: () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`,
  }
  return { deps, written, logs, errors, log: (l: string) => logs.push(l), error: (l: string) => errors.push(l) }
}

const MODULE = "circuits/transistor-preamp/index.ts"
const OUT = "/tmp/schematic-stub-test/lab-board.kicad_sch"

test("writes the stub for a module that exports everything it needs", async () => {
  const h = harness(new Set())
  const status = await runSchematicStub([MODULE, "transistorPreampLab", OUT], h.deps, h.log, h.error)
  expect(h.errors).toEqual([])
  expect(status).toBe(0)
  const text = h.written.get(OUT)
  if (text === undefined) throw new Error("nothing written")
  expect(text).toContain('(project "lab-board"')
  expect(text).toContain("BENCH SETTINGS")
})

test("refuses to overwrite an existing schematic", async () => {
  const h = harness(new Set([OUT]))
  const status = await runSchematicStub([MODULE, "transistorPreampLab", OUT], h.deps, h.log, h.error)
  expect(status).toBe(1)
  expect(h.written.size).toBe(0)
  expect(h.errors.join("\n")).toMatch(/already exists/)
})

test("refuses a module that does not export DESIGNATORS, naming the module path once, not twice", async () => {
  const h = harness(new Set())
  const status = await runSchematicStub(
    ["circuits/opamp-buffer.ts", "opampBuffer", OUT], h.deps, h.log, h.error)
  expect(status).toBe(1)
  const message = h.errors.join("\n")
  expect(message).toMatch(/DESIGNATORS/)
  const modulePath = path.resolve("circuits/opamp-buffer.ts")
  expect(message.split(modulePath).length - 1).toBe(1)
})

test("refuses the wrong number of arguments", async () => {
  const h = harness(new Set())
  expect(await runSchematicStub([MODULE], h.deps, h.log, h.error)).toBe(1)
  expect(h.errors.join("\n")).toMatch(/usage/)
})
