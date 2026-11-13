import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { preflight, writeRecord } from "../../tools/krt/preflight.ts"
import { builtCommitFile } from "../../tools/krt/acquire.ts"
import type { CommandRunner, CommandResult } from "../../tools/krt/acquire.ts"

function withRepo(body: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "krt-preflight-"))
  try {
    fs.mkdirSync(path.dirname(builtCommitFile(root)), { recursive: true })
    fs.writeFileSync(builtCommitFile(root), "abc123\n")
    body(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function arg(args: readonly string[], i: number): string {
  const value = args[i]
  if (value === undefined) throw new Error(`fake runner: argument ${i} missing`)
  return value
}

/**
 * A stand-in engine, for the preflight's own logic only. `graderAlwaysPasses`
 * is the defect the preflight exists to catch: a grader that returns 0 whatever
 * the intent says.
 */
function fakeEngine(graderAlwaysPasses: boolean, seenEnv: Array<Record<string, string | undefined>>): CommandRunner {
  return (command, args, cwd, env): CommandResult => {
    seenEnv.push({ ...env })
    const ok = (output = ""): CommandResult => ({ status: 0, output })
    const script = args[0] ?? ""
    const abs = (p: string): string => path.resolve(cwd, p)
    if (script.endsWith("place_optimize.py")) {
      fs.writeFileSync(abs(arg(args, 2)), fs.readFileSync(abs(arg(args, 1)), "utf8").replace("(at 12 12)", "(at 13 12)"))
      return ok()
    }
    if (script.endsWith("check_floorplan.py")) {
      const intent = abs(arg(args, 3))
      const parsed: { blocks: Array<{ zone: number[] }> } = JSON.parse(fs.readFileSync(intent, "utf8"))
      const holds = parsed.blocks[0]?.zone[2] === 31
      const pass = graderAlwaysPasses || holds
      fs.writeFileSync(abs(arg(args, 7)), JSON.stringify({ pass }))
      return { status: pass ? 0 : 4, output: "" }
    }
    if (script.endsWith("route.py")) {
      fs.writeFileSync(abs(arg(args, 3)), "(kicad_pcb (segment))")
      return ok()
    }
    if (script.endsWith("route_planes.py")) {
      fs.writeFileSync(abs(arg(args, 2)), "(kicad_pcb (zone))")
      return ok()
    }
    if (args[0] === "pcb") {
      fs.appendFileSync(abs(arg(args, args.length - 1)), "(filled_polygon)")
      return ok()
    }
    return { status: 1, output: `fake runner: unexpected ${command} ${args.join(" ")}` }
  }
}

test("a grader that can fail and an engine that works yield a recorded success", () => {
  withRepo((root) => {
    const seen: Array<Record<string, string | undefined>> = []
    const record = preflight({
      repoRoot: root, run: fakeEngine(false, seen), env: { PYTHONHOME: "/kicad", PYTHONPATH: "/kicad", PATH: "/bin" },
      kicadCli: "/fake/kicad-cli",
    })
    expect(record.allSucceeded).toBe(true)
    expect(record.engineCommit).toBe("abc123")
    expect(record.operations.map((o) => o.operation)).toEqual(["placement", "grading", "routing", "zone-refill"])
    const grading = record.operations[1]
    expect(grading?.invocations.map((i) => i.observedStatus)).toEqual([0, 4])
    for (const env of seen) {
      expect(env["PYTHONHOME"]).toBeUndefined()
      expect(env["PYTHONPATH"]).toBeUndefined()
    }
    expect(fs.existsSync(writeRecord(root, record))).toBe(true)
  })
})

test("a grader that passes unconditionally fails the preflight and the record is not committed", () => {
  withRepo((root) => {
    const record = preflight({
      repoRoot: root, run: fakeEngine(true, []), env: {}, kicadCli: "/fake/kicad-cli",
    })
    expect(record.allSucceeded).toBe(false)
    const grading = record.operations.find((o) => o.operation === "grading")
    expect(grading?.succeeded).toBe(false)
    expect(() => writeRecord(root, record)).toThrow(/grading/)
    expect(fs.existsSync(path.join(root, "build", "krt", "invocations.json"))).toBe(false)
  })
})

test("an unstamped engine is refused rather than given a guessed commit", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "krt-preflight-"))
  try {
    expect(() => preflight({ repoRoot: root, run: fakeEngine(false, []), env: {}, kicadCli: "/x" })).toThrow(/stamp/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a failed run leaves a pre-existing good record byte-identical and writes the failed record", () => {
  withRepo((root) => {
    const good = preflight({ repoRoot: root, run: fakeEngine(false, []), env: {}, kicadCli: "/k" })
    const file = writeRecord(root, good)
    const before = fs.readFileSync(file)
    const bad = preflight({ repoRoot: root, run: fakeEngine(true, []), env: {}, kicadCli: "/k" })
    expect(() => writeRecord(root, bad)).toThrow(/grading/)
    expect(fs.readFileSync(file).equals(before)).toBe(true)
    expect(fs.existsSync(path.join(root, "build", "krt", "invocations.failed.json"))).toBe(true)
  })
})

test("a failed pour creation is recorded as a failure, not thrown as ENOENT", () => {
  withRepo((root) => {
    const engine = fakeEngine(false, [])
    const run: CommandRunner = (command, args, cwd, env) =>
      (args[0] ?? "").endsWith("route_planes.py") ? { status: 2, output: "boom" } : engine(command, args, cwd, env)
    const record = preflight({ repoRoot: root, run, env: {}, kicadCli: "/k" })
    expect(record.operations[3]?.succeeded).toBe(false)
    expect(() => writeRecord(root, record)).toThrow(/zone-refill/)
    expect(fs.existsSync(path.join(root, "build", "krt", "invocations.failed.json"))).toBe(true)
  })
})

test("the routing and pour-creation invocations declare the .kicad_pro side effect", () => {
  withRepo((root) => {
    const record = preflight({ repoRoot: root, run: fakeEngine(false, []), env: {}, kicadCli: "/k" })
    const effects = record.operations.flatMap((o) => o.invocations).filter((i) => i.sideEffects !== undefined)
    expect(effects.map((i) => i.label)).toEqual(["route the fixture nets", "create an unfilled pour on B.Cu"])
    for (const i of effects) expect(i.sideEffects).toContain("FAB FLOOR RELAXED")
  })
})
