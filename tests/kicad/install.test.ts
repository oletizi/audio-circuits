/**
 * Checks for `lib/kicad/install.ts` and `tools/guide/browser-install.ts`
 * (`docs/known-gaps.md` **G169**): the resolver is one place that owns the
 * KiCad install root, every default is a per-platform candidate list, and
 * `make/board.mk`'s literal - which cannot import TypeScript and so cannot
 * share a constant with it - is checked against it rather than left to
 * drift silently.
 *
 * TWO ARMS OF THIS CANNOT RUN ON THIS MACHINE. `defaultKicadCli("linux")`
 * and `defaultKicadCli("win32")` are exercised below as pure path
 * arithmetic, because that is all a macOS test runner CAN exercise - nothing
 * here has run against a real Linux or Windows KiCad install, and the
 * module comments in both resolver files say so. A test that only ever runs
 * the darwin arm for real would be a check that cannot fail on the other
 * two; this file does not claim coverage it does not have.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { defaultFootprintDir, defaultKicadCli, defaultSymbolDir } from "../../lib/kicad/install.ts"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { LIBRARY_ROOT } from "../../lib/kicad/pin-pattern-sources.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { defaultHtmlToPdf } from "../../tools/guide/browser-install.ts"
import { FOOTPRINT_LIBRARY_ROOT } from "./footprint-library.ts"

const BOARD_MK = fs.readFileSync(path.join(import.meta.dir, "..", "..", "make", "board.mk"), "utf8")

/** The literal on one `<VARIABLE> ?= <value>` line in make/board.mk. */
function makefileDefault(variable: string): string {
  const pattern = new RegExp(`^${variable} \\?= (.+)$`, "m")
  const match = pattern.exec(BOARD_MK)
  if (match === null) {
    throw new Error(
      `make/board.mk declares no "${variable} ?= ..." line to check against. This test caught ` +
        "the Makefile's own default moving or being renamed - update the pattern above if that " +
        "was deliberate.",
    )
  }
  return match[1]
}

test("make/board.mk's KICAD_CLI default agrees with the resolver's macOS candidate", () => {
  // Make cannot import TypeScript (docs/known-gaps.md G121, G169), so the
  // Makefile's own macOS literal and lib/kicad/install.ts's macOS candidate
  // are two hand-written copies of the same fact. This is the check G169
  // says a reader will forget to write: without it, either copy can change
  // without the other, silently.
  expect(makefileDefault("KICAD_CLI")).toBe(defaultKicadCli("darwin"))
})

test("make/board.mk's HTML_TO_PDF default agrees with the resolver's macOS candidate", () => {
  expect(makefileDefault("HTML_TO_PDF")).toBe(defaultHtmlToPdf("darwin"))
})

test("defaultKicadCli covers darwin, linux and win32 as distinct, justified candidates", () => {
  expect(defaultKicadCli("darwin")).toBe("/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli")
  expect(defaultKicadCli("linux")).toBe("/usr/bin/kicad-cli")
  expect(defaultKicadCli("win32")).toBe("C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe")
})

test("defaultKicadCli refuses an unrecognised platform by naming KICAD_CLI", () => {
  expect(() => defaultKicadCli("plan9")).toThrow(/KICAD_CLI/)
})

test("defaultHtmlToPdf refuses an unrecognised platform by naming HTML_TO_PDF", () => {
  expect(() => defaultHtmlToPdf("plan9")).toThrow(/HTML_TO_PDF/)
})

test("defaultSymbolDir and defaultFootprintDir derive from the resolved cli path on linux", () => {
  // Pure path arithmetic against a fabricated root that exists nowhere, so
  // fs.existsSync is false for every candidate and each function falls
  // through to its first - which is exactly the derivation under test, not
  // an accident of what happens to be installed on this machine.
  expect(defaultSymbolDir("/opt/kicadtest/bin/kicad-cli", "linux")).toBe(
    "/opt/kicadtest/share/kicad/symbols",
  )
  expect(defaultFootprintDir("/opt/kicadtest/bin/kicad-cli", "linux")).toBe(
    "/opt/kicadtest/share/kicad/footprints",
  )
})

test("defaultSymbolDir and defaultFootprintDir derive from the resolved cli path on win32", () => {
  // The win32 branch uses path.win32 internally rather than the host's
  // native path module, specifically so this is correct - and checkable -
  // from a macOS or Linux test runner. Asserting it here is what would
  // catch a regression back to the host-native path module, which would
  // silently mis-join a backslash path on every host except Windows itself.
  const cli = "C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe"
  expect(defaultSymbolDir(cli, "win32")).toBe(
    "C:\\Program Files\\KiCad\\10.0\\share\\kicad\\symbols",
  )
  expect(defaultFootprintDir(cli, "win32")).toBe(
    "C:\\Program Files\\KiCad\\10.0\\share\\kicad\\footprints",
  )
})

test(
  "library.ts's stockSymbolDir() agrees with lib/kicad/install.ts's resolver on this machine",
  () => {
    // stockSymbolDir() lives in a ported file (tools/schgen/port-manifest.json;
    // not in diverged[], so R18 forbids editing it here) and keeps its own
    // two-candidate chain verbatim - this is the check clause (a) needs in
    // its place, because the two implementations cannot share code. It does
    // not skip when KiCad is absent - stockSymbolDir() throws, on the
    // precedent tests/circuits/kicad-round-trip.ts sets: a skipped check
    // must never look like a passing one.
    const expected = process.env["KICAD_SYMBOL_DIR"] ?? defaultSymbolDir(KICAD_CLI)
    expect(stockSymbolDir()).toBe(expected)
  },
)

test("pin-pattern-sources.ts's LIBRARY_ROOT agrees with footprint-library.ts's FOOTPRINT_LIBRARY_ROOT", () => {
  // tests/kicad/pin-pattern.test.ts depends on these two constants never
  // disagreeing (it compares a PATTERN's recorded source.file, built from
  // LIBRARY_ROOT, against the file actually read from disk, built from
  // FOOTPRINT_LIBRARY_ROOT). This is that dependency made explicit and
  // checked on its own, rather than only as a side effect of that test.
  expect(LIBRARY_ROOT).toBe(FOOTPRINT_LIBRARY_ROOT)
})
