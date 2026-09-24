/**
 * Tests for tools/perfboard/netlist-sync.ts: the content-based freshness
 * check that replaced make/board.mk's `$(NETLIST): $(SCH)` mtime rule, and
 * the path normalization that keeps the fixture free of machine-specific
 * paths (see the module's own doc comment for why both exist).
 *
 * `runExport` and `kicadCliExists` are always injected here, so this suite
 * never spawns the real kicad-cli or builds anything. Exactly one test in
 * this repository invokes kicad-cli directly - "KiCad reads the generated
 * stub as the same circuit" in tests/circuits/transistor-preamp-lab.test.ts,
 * kept because it is the only proof that KiCad reads the generated stub the
 * way the circuit means it (spec §5 item 6) - and every other test,
 * including these, injects it out instead. Injecting `runExport` also lets
 * these tests write whatever "fresh export" content they like, including
 * content that differs only in its `(date ...)` line, or only in the
 * machine-specific `(source ...)` path a different clone's kicad-cli would
 * stamp - both are exactly the distinctions this module exists to make.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  netlistsAgree, normalizeSourcePath, repoRelativePath, syncNetlistExport, withoutVolatileDate,
} from "../../tools/perfboard/netlist-sync.ts"

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "netlist-sync-test-"))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// The REPO-RELATIVE form every fixture in this suite is expected to carry -
// as if this repository's root were `dir` and the schematic lived at
// `dir/circuits/sch.kicad_sch`. Every orchestration test below passes a
// matching `schPath`/`repoRoot` pair so the normalized value is exactly this.
const NORMALIZED_SOURCE = "circuits/sch.kicad_sch"

// Already in NORMALIZED form, as the checked-in fixture always is: this is
// what "the fixture on disk" looks like BEFORE a new sync runs.
const NETLIST_A = [
  "(export",
  '\t(version "E")',
  "\t(design",
  `\t\t(source "${NORMALIZED_SOURCE}")`,
  '\t\t(date "2026-09-23T02:03:36")',
  '\t\t(tool "Eeschema 10.0.5")',
  "\t\t(sheet",
  "\t\t\t(title_block",
  '\t\t\t\t(source "sch.kicad_sch")',
  "\t\t\t\t(date)",
  "\t\t\t)",
  "\t\t)",
  "\t)",
  ")",
].join("\n")

// A RAW export, as kicad-cli would actually write it on some OTHER machine
// (or a different clone path) before normalization: a different absolute
// `(source ...)` AND a different date. After normalizeSourcePath and
// withoutVolatileDate both do their jobs, this must agree with NETLIST_A -
// that agreement is the entire point of normalizing before comparing rather
// than after.
const NETLIST_A_RAW_FROM_ANOTHER_MACHINE = [
  "(export",
  '\t(version "E")',
  "\t(design",
  '\t\t(source "/Users/someone-else/elsewhere/circuits/sch.kicad_sch")',
  '\t\t(date "2026-09-23T11:25:33")',
  '\t\t(tool "Eeschema 10.0.5")',
  "\t\t(sheet",
  "\t\t\t(title_block",
  '\t\t\t\t(source "sch.kicad_sch")',
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
// normalizeSourcePath / repoRelativePath: pure path normalization
// ---------------------------------------------------------------------------

test("normalizeSourcePath rewrites only the design section's (source ...), leaving the title_block's bare filename alone", () => {
  const normalized = normalizeSourcePath(NETLIST_A_RAW_FROM_ANOTHER_MACHINE, NORMALIZED_SOURCE)
  expect(normalized).toContain(`(source "${NORMALIZED_SOURCE}")`)
  expect(normalized).not.toContain("/Users/someone-else")
  // The title_block's own (source "sch.kicad_sch") is untouched.
  expect(normalized).toContain('(source "sch.kicad_sch")')
})

test("normalizeSourcePath throws naming what's missing when there is no (source ...) line at all", () => {
  const noSource = NETLIST_A.split("\n").filter((line) => !line.includes("(source ")).join("\n")
  expect(() => normalizeSourcePath(noSource, NORMALIZED_SOURCE)).toThrow(/no "\(source \.\.\.\)" line/)
})

test("repoRelativePath renders a repository-relative path with forward slashes", () => {
  expect(repoRelativePath("/repo", "/repo/circuits/sch.kicad_sch")).toBe("circuits/sch.kicad_sch")
})

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
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    fs.writeFileSync(netlistPath, NETLIST_A)
    const before = fs.statSync(netlistPath).mtimeMs

    const result = syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
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

test("a fresh export carrying a DIFFERENT machine's absolute source path still agrees, once normalized - this is the whole point", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    fs.writeFileSync(netlistPath, NETLIST_A)

    const result = syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
      runExport: (_cli, _sch, outputPath) =>
        fs.writeFileSync(outputPath, NETLIST_A_RAW_FROM_ANOTHER_MACHINE),
    })

    expect(result.changed).toBe(false)
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A)
  })
})

test("passes the resolved repository root through to runExport, for pinning kicad-cli's own cwd", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    let receivedRepoRoot: string | undefined
    syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
      runExport: (_cli, _sch, outputPath, repoRoot) => {
        receivedRepoRoot = repoRoot
        fs.writeFileSync(outputPath, NETLIST_A)
      },
    })
    expect(receivedRepoRoot).toBe(dir)
  })
})

test("a fresh export that genuinely differs replaces the fixture, normalized, and says so", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    fs.writeFileSync(netlistPath, NETLIST_A)

    const result = syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
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
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    fs.writeFileSync(netlistPath, NETLIST_A) // stale content
    const future = new Date(Date.now() + 60 * 60 * 1000)
    fs.utimesSync(netlistPath, future, future) // newer than any schematic touch

    const result = syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
      runExport: (_cli, _sch, outputPath) => fs.writeFileSync(outputPath, NETLIST_B), // schematic moved
    })

    expect(result.changed).toBe(true)
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_B)
  })
})

test("no existing fixture creates one, normalized, rather than comparing against nothing", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    const result = syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
      kicadCliExists: () => true,
      repoRoot: dir,
      runExport: (_cli, _sch, outputPath) =>
        fs.writeFileSync(outputPath, NETLIST_A_RAW_FROM_ANOTHER_MACHINE),
    })
    expect(result.changed).toBe(true)
    expect(result.message).toMatch(/created/)
    // Written with the normalized source - but otherwise verbatim, date
    // included: normalizing (source ...) never touches (date ...). The raw
    // export's date (11:25:33) survives; only its source path is rewritten.
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A_RESTAMPED)
  })
})

test("an export failure propagates rather than being swallowed as 'unchanged'", () => {
  withTempDir((dir) => {
    const netlistPath = path.join(dir, "board.net")
    const schPath = path.join(dir, "circuits", "sch.kicad_sch")
    fs.writeFileSync(netlistPath, NETLIST_A)
    expect(() =>
      syncNetlistExport(schPath, netlistPath, "/fake/kicad-cli", {
        kicadCliExists: () => true,
        repoRoot: dir,
        runExport: () => { throw new Error("kicad-cli exited 1: unreadable schematic") },
      }),
    ).toThrow(/unreadable schematic/)
    // The fixture must be untouched by a failed export.
    expect(fs.readFileSync(netlistPath, "utf8")).toBe(NETLIST_A)
  })
})
