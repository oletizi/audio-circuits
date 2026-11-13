/**
 * Checks for `lib/kicad/install.ts`, `tools/guide/browser-install.ts` and
 * `tools/guide/pdf-merge-install.ts` (`docs/known-gaps.md` **G169**): the
 * resolver is one place that owns the KiCad install root and every default is
 * a per-platform candidate list.
 *
 * **`docs/known-gaps.md` G170, and why the Makefile checks below run `make`
 * for real rather than pattern-matching this file's text.** `make/board.mk`
 * used to carry `KICAD_CLI ?= <macOS literal>`, `export`ed unconditionally -
 * and an earlier version of this test only checked that literal AGREED WITH
 * the resolver's own darwin candidate, which passed and proved nothing about
 * whether an unset `KICAD_CLI` actually REACHED the resolver anywhere else.
 * It did not: Make exported the literal regardless of platform, which
 * defeated the resolver underneath it on every non-macOS `make check`. The
 * checks below run the real `make print-%` debug target (see
 * `make/board.mk`) with `KICAD_CLI`/`HTML_TO_PDF`/`PDF_MERGE` genuinely unset, and assert
 * the OUTPUT against the resolver - a check that would have failed against
 * the Makefile this replaces, and a check an explicit override still passes
 * untouched.
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
import { execFileSync } from "node:child_process"
import path from "node:path"
import { defaultFootprintDir, defaultKicadCli, defaultKicadPython, defaultSymbolDir } from "../../lib/kicad/install.ts"
import { LIBRARY_ROOT } from "../../lib/kicad/pin-pattern-sources.ts"
import { defaultHtmlToPdf } from "../../tools/guide/browser-install.ts"
import { defaultPdfMerge } from "../../tools/guide/pdf-merge-install.ts"
import { FOOTPRINT_LIBRARY_ROOT } from "./footprint-library.ts"

const REPO_ROOT = path.join(import.meta.dir, "..", "..")

/**
 * Any directory holding a `perfboard.json` gets `make/board.mk`'s targets,
 * including `print-%`; this one is picked only because it exists and is not
 * otherwise mutated by anything here - `make print-%` writes nothing.
 */
const PROBE_BOARD = path.join(REPO_ROOT, "boards", "pt2399-core")

/**
 * Runs `make print-<variable>` in `PROBE_BOARD` with `override` applied on
 * top of this process's own environment - `override[key] === undefined`
 * UNSETS that key rather than passing through whatever this process
 * happened to have, so a test can assert "genuinely unset" rather than
 * "whatever was in the shell that ran the suite."
 */
function makePrint(variable: string, override: Readonly<Record<string, string | undefined>>): string {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) delete env[key]
    else env[key] = value
  }
  return execFileSync("make", [`print-${variable}`], { cwd: PROBE_BOARD, env, encoding: "utf8" }).trim()
}

test("make print-KICAD_CLI, with KICAD_CLI unset, reaches lib/kicad/install.ts's resolver", () => {
  expect(makePrint("KICAD_CLI", { KICAD_CLI: undefined })).toBe(defaultKicadCli())
})

test("make print-KICAD_CLI honours an explicit override, untouched by the resolver", () => {
  const sentinel = "/tmp/task-10b-round2-kicad-cli-sentinel"
  expect(makePrint("KICAD_CLI", { KICAD_CLI: sentinel })).toBe(sentinel)
})

test("make print-HTML_TO_PDF, with HTML_TO_PDF unset, reaches tools/guide/browser-install.ts's resolver", () => {
  expect(makePrint("HTML_TO_PDF", { HTML_TO_PDF: undefined })).toBe(defaultHtmlToPdf())
})

test("make print-HTML_TO_PDF honours an explicit override, untouched by the resolver", () => {
  const sentinel = "/tmp/task-10b-round2-html-to-pdf-sentinel"
  expect(makePrint("HTML_TO_PDF", { HTML_TO_PDF: sentinel })).toBe(sentinel)
})

test("make print-PDF_MERGE, with PDF_MERGE unset, reaches tools/guide/pdf-merge-install.ts's resolver", () => {
  expect(makePrint("PDF_MERGE", { PDF_MERGE: undefined })).toBe(defaultPdfMerge())
})

test("make print-PDF_MERGE honours an explicit override, untouched by the resolver", () => {
  const sentinel = "/tmp/single-document-packet-pdf-merge-sentinel"
  expect(makePrint("PDF_MERGE", { PDF_MERGE: sentinel })).toBe(sentinel)
})

test("defaultKicadCli covers darwin, linux and win32 as distinct, justified candidates", () => {
  expect(defaultKicadCli("darwin")).toBe("/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli")
  expect(defaultKicadCli("linux")).toBe("/usr/bin/kicad-cli")
  expect(defaultKicadCli("win32")).toBe("C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe")
})

test("defaultKicadCli refuses an unrecognised platform by naming KICAD_CLI", () => {
  expect(() => defaultKicadCli("plan9")).toThrow(/KICAD_CLI/)
})

/**
 * Runs `body` with `KICAD_PYTHON` genuinely unset, whatever the shell that ran
 * the suite happened to have - the same "assert unset rather than whatever was
 * there" discipline `makePrint` above applies to Make's variables, and the only
 * way the derivation under test is what gets asserted.
 */
function withoutKicadPython<T>(body: () => T): T {
  const saved = process.env["KICAD_PYTHON"]
  delete process.env["KICAD_PYTHON"]
  try {
    return body()
  } finally {
    if (saved !== undefined) process.env["KICAD_PYTHON"] = saved
  }
}

test("defaultKicadPython derives the interpreter from the resolved kicad-cli, per platform", () => {
  withoutKicadPython(() => {
    // The darwin arm is the only one that can be checked against a real install
    // here, and it is checked as the DERIVATION rather than as a literal: the
    // interpreter must be a sibling of the directory kicad-cli resolved into, so
    // a machine with KiCad somewhere else gets ITS python, not this one's.
    const cli = defaultKicadCli("darwin")
    expect(defaultKicadPython("darwin")).toBe(
      path.join(path.dirname(cli), "..", "Frameworks", "Python.framework", "Versions", "Current", "bin", "python3"),
    )
    // Pure path arithmetic, as with defaultSymbolDir's non-darwin arms above:
    // neither of these has run against a real install, and this claims no more
    // than that the derivation is the one the module documents.
    expect(defaultKicadPython("linux")).toBe("/usr/bin/python3")
    expect(defaultKicadPython("win32")).toBe("C:\\Program Files\\KiCad\\10.0\\bin\\python.exe")
  })
})

test("defaultKicadPython honours an explicit KICAD_PYTHON on every platform", () => {
  const saved = process.env["KICAD_PYTHON"]
  const sentinel = "/tmp/task-6ab-kicad-python-sentinel"
  process.env["KICAD_PYTHON"] = sentinel
  try {
    for (const platform of ["darwin", "linux", "win32"]) {
      expect(defaultKicadPython(platform)).toBe(sentinel)
    }
  } finally {
    if (saved === undefined) delete process.env["KICAD_PYTHON"]
    else process.env["KICAD_PYTHON"] = saved
  }
})

test("defaultKicadPython refuses an unrecognised platform by naming KICAD_PYTHON", () => {
  withoutKicadPython(() => {
    expect(() => defaultKicadPython("plan9")).toThrow(/KICAD_PYTHON/)
  })
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

/*
 * **THE SECOND IMPLEMENTATION OF THE SYMBOL-DIRECTORY RESOLVER IS GONE, AND SO IS THE TEST THAT
 * HELD THE TWO TOGETHER.** A test here asserted that `lib/schgen/render/library.ts`'s
 * `stockSymbolDir()` - a PORTED file that kept its own two-candidate chain verbatim, which the
 * port's fidelity rule forbade editing - answered the same directory as `defaultSymbolDir`. It
 * was the check clause (a) of the one-resolver rule needed in place of shared code, and it is
 * superseded rather than dropped: the schematic generator's removal deletes the duplicate, so
 * `defaultSymbolDir` is now the only implementation and there is nothing left to disagree with
 * it. Its readers are `tests/kicad/symbol-library-disk.ts`'s `SYMBOL_LIBRARY_ROOT` (through
 * `KICAD_SYMBOLS`) and this file's own derivation arms above.
 */

test("pin-pattern-sources.ts's LIBRARY_ROOT agrees with footprint-library.ts's FOOTPRINT_LIBRARY_ROOT", () => {
  // tests/kicad/pin-pattern.test.ts depends on these two constants never
  // disagreeing (it compares a PATTERN's recorded source.file, built from
  // LIBRARY_ROOT, against the file actually read from disk, built from
  // FOOTPRINT_LIBRARY_ROOT). This is that dependency made explicit and
  // checked on its own, rather than only as a side effect of that test.
  expect(LIBRARY_ROOT).toBe(FOOTPRINT_LIBRARY_ROOT)
})
