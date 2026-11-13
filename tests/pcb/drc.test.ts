import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { runDrc, verdictOf, DrcRefusal, PARITY_FETCH_DIAGNOSTIC } from "../../tools/pcb/drc.ts"
import type { KicadInvoker, KicadResult, DrcGuard } from "../../tools/pcb/drc.ts"
import { parseReport } from "../../tools/pcb/drc-report.ts"
import { defaultKicadCli } from "../../lib/kicad/install.ts"

const FIXTURES = path.resolve(import.meta.dir, "../fixtures/pcb")

/** Copies a committed fixture directory to a scratch one, optionally renaming the files. */
function scratchPair(fixture: string, names: { board: string; schematic: string | null; project: string }): {
  dir: string
  board: string
  schematic: string
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-drc-test-"))
  fs.copyFileSync(path.join(FIXTURES, fixture, "pair.kicad_pcb"), path.join(dir, `${names.board}.kicad_pcb`))
  fs.copyFileSync(path.join(FIXTURES, fixture, "pair.kicad_pro"), path.join(dir, `${names.project}.kicad_pro`))
  if (names.schematic !== null) {
    fs.copyFileSync(path.join(FIXTURES, fixture, "pair.kicad_sch"), path.join(dir, `${names.schematic}.kicad_sch`))
  }
  return {
    dir,
    board: path.join(dir, `${names.board}.kicad_pcb`),
    schematic: path.join(dir, `${names.schematic ?? "absent"}.kicad_sch`),
  }
}

function refusalOf(body: () => unknown): DrcRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof DrcRefusal) return error
    throw error
  }
  throw new Error("expected a DrcRefusal but nothing was thrown")
}

function expectGuard(body: () => unknown, guard: DrcGuard): DrcRefusal {
  const refusal = refusalOf(body)
  expect(refusal.guard).toBe(guard)
  return refusal
}

const CLEAN_REPORT = {
  included_severities: ["error", "warning", "exclusion"],
  ignored_checks: [{ key: "footprint_type_mismatch", description: "x" }],
  schematic_parity: [],
  violations: [],
  unconnected_items: [],
}

/** A stand-in for kicad-cli, for report handling only. The three integration tests below use the real tool. */
function fakeKicad(report: unknown, drc: Partial<KicadResult> = {}): KicadInvoker {
  return (args) => {
    const out = args[args.indexOf("-o") + 1] ?? ""
    if (args[0] === "sch") {
      fs.writeFileSync(out, '<export><components><comp ref="R1"/></components></export>')
      return { status: 0, stderr: "" }
    }
    fs.writeFileSync(out, typeof report === "string" ? report : JSON.stringify(report))
    return { status: 0, stderr: "", ...drc }
  }
}

function withGood<T>(body: (board: string, schematic: string) => T): T {
  const pair = scratchPair("good", { board: "pair", schematic: "pair", project: "pair" })
  try {
    return body(pair.board, pair.schematic)
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
}

function runFake(report: unknown, drc: Partial<KicadResult> = {}): ReturnType<typeof runDrc> {
  return withGood((board, schematic) => runDrc(board, { schematicPath: schematic, invoke: fakeKicad(report, drc) }))
}

function without(key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...CLEAN_REPORT }
  delete copy[key]
  return copy
}

test("a missing report file FAILS rather than reading as zero violations, naming the path", () => {
  const invoke: KicadInvoker = (args) => {
    if (args[0] === "sch") {
      fs.writeFileSync(args[args.indexOf("-o") + 1] ?? "", "<comp ref='R1'/>")
    }
    return { status: 0, stderr: "" }
  }
  const refusal = withGood((board, schematic) =>
    expectGuard(() => runDrc(board, { schematicPath: schematic, invoke }), "report-unreadable"),
  )
  expect(refusal.message).toContain("drc.json")
})

test("an unreadable report FAILS rather than reading as zero violations", () => {
  expectGuard(() => runFake("{ not json"), "report-unreadable")
})

test("a report with no parity field FAILS, because a missing field is not zero", () => {
  expectGuard(() => runFake(without("schematic_parity")), "report-shape")
})

test("a report with no violations array FAILS", () => {
  expectGuard(() => runFake(without("violations")), "report-shape")
})

test("a report with no unconnected_items array FAILS", () => {
  expectGuard(() => runFake(without("unconnected_items")), "report-shape")
})

test("a violation with no severity FAILS, because the policy is severity-scoped", () => {
  const refusal = expectGuard(() => runFake({ ...CLEAN_REPORT, violations: [{ type: "clearance" }] }), "report-shape")
  expect(refusal.message).toContain("no severity")
})

test("a non-zero kicad-cli exit FAILS even when a clean report sits at the output path", () => {
  // The fake writes a perfectly clean report and then exits 1: a stale or partial report must not be read.
  expectGuard(() => runFake(CLEAN_REPORT, { status: 1 }), "process-exit")
})

test("included_severities missing 'warning' or 'exclusion' FAILS - the severity-error trap, caught from the report", () => {
  for (const missing of ["warning", "exclusion"]) {
    const included = ["error", "warning", "exclusion"].filter((s) => s !== missing)
    const refusal = expectGuard(() => runFake({ ...CLEAN_REPORT, included_severities: included }), "severity-coverage")
    expect(refusal.message).toContain(missing)
  }
  expectGuard(() => runFake({ ...CLEAN_REPORT, included_severities: ["error"] }), "severity-coverage")
})

test("a result field holding null, a string or an object FAILS - present is not an array", () => {
  for (const field of ["schematic_parity", "violations", "unconnected_items"]) {
    for (const bad of [null, "none", {}]) {
      expectGuard(() => runFake({ ...CLEAN_REPORT, [field]: bad }), "report-shape")
    }
  }
})

test("a violation with an unrecognised severity FAILS before the policy is applied", () => {
  const refusal = expectGuard(
    () => runFake({ ...CLEAN_REPORT, violations: [{ type: "clearance", severity: "fatal" }] }),
    "report-shape",
  )
  expect(refusal.message).toContain("fatal")
})

test("ignored_checks containing any of the three gate-critical checks FAILS", () => {
  for (const key of ["items_not_allowed", "courtyards_overlap", "missing_courtyard"]) {
    const refusal = expectGuard(
      () => runFake({ ...CLEAN_REPORT, ignored_checks: [{ key, description: "x" }] }),
      "ignored-checks",
    )
    expect(refusal.message).toContain(key)
  }
})

test("a report with no ignored_checks array FAILS", () => {
  expectGuard(() => runFake(without("ignored_checks")), "report-shape")
})

test("a clean, complete report is accepted by the fake path", () => {
  const report = runFake(CLEAN_REPORT)
  expect(report.counts).toEqual({ schematicParity: 0, violations: 0, unconnectedItems: 0 })
  expect(report.netlistComponents).toBe(1)
})

// ---- project configuration equals the fabrication standard -----------------

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNode(value: unknown): Record<string, unknown> {
  if (!isObj(value)) throw new Error("fixture node is not an object")
  return value
}

/** The child object of a parsed project, by reference, so an edit lands in the project. */
function node(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  return asNode(parent[key])
}

function lowered(edit: (project: Record<string, unknown>) => void): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-drc-pro-"))
  for (const f of ["pair.kicad_pcb", "pair.kicad_sch"]) fs.copyFileSync(path.join(FIXTURES, "good", f), path.join(dir, f))
  const project = asNode(JSON.parse(fs.readFileSync(path.join(FIXTURES, "good/pair.kicad_pro"), "utf8")))
  edit(project)
  fs.writeFileSync(path.join(dir, "pair.kicad_pro"), JSON.stringify(project))
  return path.join(dir, "pair.kicad_pcb")
}

function drcOnLowered(board: string): unknown {
  return runDrc(board, { schematicPath: board.replace(".kicad_pcb", ".kicad_sch"), invoke: fakeKicad(CLEAN_REPORT) })
}

test("a project whose min_clearance was lowered is refused, naming the constraint and the value", () => {
  const board = lowered((p) => {
    node(node(node(p, "board"), "design_settings"), "rules")["min_clearance"] = 0.1
  })
  const refusal = expectGuard(() => drcOnLowered(board), "project-config")
  expect(refusal.message).toContain("min_clearance")
  expect(refusal.message).toContain("0.1")
  expect(refusal.message).toContain("0.25")
})

test("a net class whose track width was lowered is refused", () => {
  const board = lowered((p) => {
    const classes = node(p, "net_settings")["classes"]
    if (!Array.isArray(classes)) throw new Error("fixture has no classes")
    const power = classes.map((c) => asNode(c)).find((c) => c["name"] === "Power")
    if (power === undefined) throw new Error("fixture has no Power class")
    power["track_width"] = 0.2
  })
  const refusal = expectGuard(() => drcOnLowered(board), "project-config")
  expect(refusal.message).toContain("Power")
  expect(refusal.message).toContain("track_width")
})

test("a project with no .kicad_pro is refused rather than assumed to be at the standard", () => {
  const board = lowered(() => undefined)
  fs.rmSync(board.replace(".kicad_pcb", ".kicad_pro"))
  expectGuard(() => drcOnLowered(board), "project-config")
})

test("the committed good fixture's project equals the standard (no refusal)", () => {
  expect(() => drcOnLowered(lowered(() => undefined))).not.toThrow()
})

// ---- the two legs, against the REAL pinned kicad-cli ------------------------

test("the pinned kicad-cli is 10.0.5, the version the diagnostic wording was measured on", () => {
  const result = spawnSync(defaultKicadCli(), ["version"], { encoding: "utf8" })
  expect(result.stdout.trim()).toBe("10.0.5")
})

test("INTEGRATION, real kicad-cli: no schematic beside the board is rejected BY LEG 1", () => {
  const pair = scratchPair("good", { board: "pair", schematic: null, project: "pair" })
  try {
    const refusal = expectGuard(() => runDrc(pair.board, { schematicPath: pair.schematic }), "leg1-netlist-components")
    expect(refusal.message).toContain("nothing to export")
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

test("INTEGRATION, real kicad-cli: an empty schematic exports with exit 0 and is still rejected BY LEG 1", () => {
  const pair = scratchPair("good", { board: "pair", schematic: null, project: "pair" })
  try {
    const sch = fs.readFileSync(path.join(FIXTURES, "good/pair.kicad_sch"), "utf8")
    const header = sch.slice(0, sch.indexOf("(lib_symbols"))
    fs.writeFileSync(pair.schematic, `${header}(lib_symbols)\n\t(embedded_fonts no)\n)\n`)
    const refusal = expectGuard(() => runDrc(pair.board, { schematicPath: pair.schematic }), "leg1-netlist-components")
    expect(refusal.message).toContain("no components")
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

test("INTEGRATION, real kicad-cli: a basename mismatch passes leg 1 and is rejected BY LEG 2", () => {
  const pair = scratchPair("good", { board: "theboard", schematic: "theschematic", project: "theboard" })
  try {
    const refusal = expectGuard(() => runDrc(pair.board, { schematicPath: pair.schematic }), "leg2-parity-fetch-diagnostic")
    // Leg 1 passed: the refusal reports the component count of the schematic it did export.
    expect(refusal.message).toContain("2 component(s)")
    expect(refusal.message).toContain(PARITY_FETCH_DIAGNOSTIC)
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

test("INTEGRATION, real kicad-cli: the diagnostic wording and the exit-0/empty-array trap are still what the guard assumes", () => {
  // The measurement itself, without our guard: if a KiCad release rewords the message or starts
  // exiting non-zero, THIS test fails and says so, instead of leg 2 going quietly inert.
  const pair = scratchPair("good", { board: "theboard", schematic: "theschematic", project: "theboard" })
  try {
    const out = path.join(pair.dir, "raw.json")
    const result = spawnSync(
      defaultKicadCli(),
      ["pcb", "drc", "--schematic-parity", "--format", "json", "--severity-all", "-o", out, pair.board],
      { encoding: "utf8" },
    )
    expect(result.status).toBe(0)
    expect(result.stderr).toContain(PARITY_FETCH_DIAGNOSTIC)
    expect(JSON.parse(fs.readFileSync(out, "utf8")).schematic_parity).toEqual([])
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

test("INTEGRATION, real kicad-cli: the matching pair RUNS parity; a wrong pad-to-net assignment populates schematic_parity", () => {
  const good = scratchPair("good", { board: "pair", schematic: "pair", project: "pair" })
  const wrong = scratchPair("wrong-net", { board: "pair", schematic: "pair", project: "pair" })
  try {
    const goodReport = runDrc(good.board, { schematicPath: good.schematic })
    expect(goodReport.netlistComponents).toBe(2)
    expect(goodReport.counts.schematicParity).toBe(0)

    const wrongReport = runDrc(wrong.board, { schematicPath: wrong.schematic })
    expect(wrongReport.counts.schematicParity).toBeGreaterThan(0)
    expect(wrongReport.schematicParity[0]?.description).toContain("doesn't match net")
    expect(verdictOf(wrongReport, { routed: false }).pass).toBe(false)
  } finally {
    fs.rmSync(good.dir, { recursive: true, force: true })
    fs.rmSync(wrong.dir, { recursive: true, force: true })
  }
})

test("the known-good pair reports zero parity violations, passes both legs, and an unrouted policy counts what is left", () => {
  const pair = scratchPair("good", { board: "pair", schematic: "pair", project: "pair" })
  try {
    const report = runDrc(pair.board, { schematicPath: pair.schematic })
    expect(report.counts.schematicParity).toBe(0)
    expect(report.counts.violations).toBe(0)
    const unrouted = verdictOf(report, { routed: false })
    expect(unrouted.pass).toBe(true)
    expect(unrouted.leftUnrouted).toBe(report.counts.unconnectedItems)
    expect(unrouted.leftUnrouted).toBeGreaterThan(0)
    // The same board declared routed fails: the unrouted net is counted, not ignored.
    expect(verdictOf(report, { routed: true }).pass).toBe(false)
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

test("each run writes its report to a fresh path", () => {
  const pair = scratchPair("good", { board: "pair", schematic: "pair", project: "pair" })
  try {
    const a = runDrc(pair.board, { schematicPath: pair.schematic })
    const b = runDrc(pair.board, { schematicPath: pair.schematic })
    expect(a.reportPath).not.toBe(b.reportPath)
  } finally {
    fs.rmSync(pair.dir, { recursive: true, force: true })
  }
})

// ---- the policy -------------------------------------------------------------

function report(over: Record<string, unknown>): ReturnType<typeof parseReport> {
  return parseReport(JSON.stringify({ ...CLEAN_REPORT, ...over }), "test")
}

test("policy: parity is intolerable at any severity; a warning-severity violation is counted but does not fail", () => {
  const parity = report({ schematic_parity: [{ type: "net_conflict", severity: "warning" }] })
  expect(verdictOf(parity, { routed: false }).pass).toBe(false)
  const warned = report({ violations: [{ type: "silk_overlap", severity: "warning" }] })
  const verdict = verdictOf(warned, { routed: true })
  expect(verdict.pass).toBe(true)
  expect(verdict.counts.warningViolations).toBe(1)
  expect(verdictOf(report({ violations: [{ type: "clearance", severity: "error" }] }), { routed: false }).pass).toBe(false)
})
