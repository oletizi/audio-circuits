/**
 * Tests for tools/perfboard/netlist-sync.ts: the content-based freshness
 * check that replaced make/board.mk's `$(NETLIST): $(SCH)` mtime rule.
 *
 * `runExport` and `kicadCliExists` are always injected here - this suite
 * never spawns the real kicad-cli, per this repository's own rule that no
 * test invokes it or builds anything. Injecting `runExport` also lets these
 * tests write whatever "fresh export" content they like, including content
 * that differs only in its `(date ...)` line, which is exactly the
 * distinction this module exists to make.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  netlistsAgree, syncNetlistExport, withoutVolatileDate,
} from "../../tools/perfboard/netlist-sync.ts"

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "netlist-sync-test-"))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const NETLIST_A = [
  "(export",
  '\t(version "E")',
  "\t(design",
  '\t\t(date "2026-09-23T02:03:36")',
  '\t\t(tool "Eeschema 10.0.5")',
  "\t\t(sheet",
  "\t\t\t(title_block",
  "\t\t\t\t(date)",
  "\t\t\t)",
  "\t\t)",
  "\t)",
  ")",
].join("\n")

// Same as NETLIST_A but stamped with a different date - the ONLY difference,
// simulating two runs of kicad-cli against an unchanged schematic.
const NETLIST_A_RESTAMPED = NETLIST_A.replace(
  '(date "2026-09-23T02:03:36")',
  '(date "2026-09-23T11:25:33")',
)

// A genuine content change: a component count in the design section.
const NETLIST_B = NETLIST_A.replace(
  '(tool "Eeschema 10.0.5")',
  '(tool "Eeschema 10.0.6")',
)

// ---------------------------------------------------------------------------
// withoutVolatileDate / netlistsAgree: pure comparison
// ---------------------------------------------------------------------------

test("withoutVolatileDate blanks only the quoted design date line, leaving the empty title_block (date) alone", () => {
  const stripped = withoutVolatileDate(NETLIST_A)
  expect(stripped).toContain('(date "")')
  expect(stripped).toContain("(date)")
  expect(stripped).not.toContain("2026-09-23T02:03:36")
})

test("netlistsAgree is true for two exports differing only by their date stamp", () => {
  expect(netlistsAgree(NETLIST_A, NETLIST_A_RESTAMPED)).toBe(true)
})

test("netlistsAgree is false when anything else differs", () => {
  expect(netlistsAgree(NETLIST_A, NETLIST_B)).toBe(false)
})

test("netlistsAgree is false when the date-stamped line differs in more than its date value", () => {
  const trailingWhitespaceRemoved = NETLIST_A.replace(
    '\t\t(date "2026-09-23T02:03:36")',
    '(date "2026-09-23T02:03:36")',
  )
  expect(netlistsAgree(NETLIST_A, trailingWhitespaceRemoved)).toBe(false)
})

// ---------------------------------------------------------------------------
// syncNetlistExport: orchestration
// ---------------------------------------------------------------------------

test("kicad-cli missing refuses naming the sch/netlist/kicad-cli paths, and never attempts to export", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, NETLIST_A)
    let exported = false
    expect(() =>
      syncNetlistExport("sch.kicad_sch", netlistPath, "/no/such/kicad-cli", {
        kicadCliExists: () => false,
        runExport: () => { exported = true },
      }),
    ).toThrow(/no kicad-cli was found/)
    expect(exported).toBe(false)
  })
})

test("a fresh export that agrees with the fixture (ignoring the date) leaves the fixture untouched", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, NETLIST_A)
    const before = fs.statSync(netlistPath).mtimeMs

    const result = syncNetlistExport("sch.kicad_sch", netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      runExport: (_cli, _sch, outputPath) => fs.writeFileSync(outputPath, NETLIST_A_RESTAMPED),
    })

    expect(result.changed).toBe(false)
    expect(result.message).toBeUndefined()
    // Content AND mtime unchanged - "unchanged means the file is not touched
    // at all," not "rewritten to the same bytes."
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A)
    expect(fs.statSync(netlistPath).mtimeMs).toBe(before)
  })
})

test("a fresh export that genuinely differs replaces the fixture and says so", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, NETLIST_A)

    const result = syncNetlistExport("sch.kicad_sch", netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      runExport: (_cli, _sch, outputPath) => fs.writeFileSync(outputPath, NETLIST_B),
    })

    expect(result.changed).toBe(true)
    expect(result.message).toMatch(/schematic has moved/)
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_B)
  })
})

test("a stale fixture stamped with a NEWER mtime than the schematic is still caught - content decides, not the clock", () => {
  // This is the exact defect the mtime rule had: `touch` the fixture (as a
  // checkout with no mtime fidelity would) so it looks newer than any
  // schematic edit, while its CONTENT is the stale one. syncNetlistExport
  // never consults either file's mtime, so this must still be caught.
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, NETLIST_A) // stale content
    const future = new Date(Date.now() + 60 * 60 * 1000)
    fs.utimesSync(netlistPath, future, future) // newer than any schematic touch

    const result = syncNetlistExport("sch.kicad_sch", netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      runExport: (_cli, _sch, outputPath) => fs.writeFileSync(outputPath, NETLIST_B), // schematic moved
    })

    expect(result.changed).toBe(true)
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_B)
  })
})

test("no existing fixture creates one rather than comparing against nothing", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const result = syncNetlistExport("sch.kicad_sch", netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      runExport: (_cli, _sch, outputPath) => fs.writeFileSync(outputPath, NETLIST_A),
    })
    expect(result.changed).toBe(true)
    expect(result.message).toMatch(/created/)
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A)
  })
})

test("an export failure propagates rather than being swallowed as 'unchanged'", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    fs.writeFileSync(netlistPath, NETLIST_A)
    expect(() =>
      syncNetlistExport("sch.kicad_sch", netlistPath, "/fake/kicad-cli", {
        kicadCliExists: () => true,
        runExport: () => { throw new Error("kicad-cli exited 1: unreadable schematic") },
      }),
    ).toThrow(/unreadable schematic/)
    // The fixture must be untouched by a failed export.
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A)
  })
})
