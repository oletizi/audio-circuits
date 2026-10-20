import { afterAll, afterEach, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { VENDORED_SYMBOLS, librarySymbols, splitLibId } from "../../../lib/kicad/symbol-library.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { symbolLibraries, vendoredNicknames } from "../../../lib/schgen/render/stock-symbols.ts"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"

/**
 * `lib/schgen/render/stock-symbols.ts` is hand-written, so nothing ported
 * covers it. These tests cover the decision it implements and - the part that
 * matters - the three ways it REFUSES.
 *
 * **THE STOCK DIRECTORY IS INJECTED THROUGH `KICAD_SYMBOL_DIR`**, which
 * `stockSymbolDir()` already consults first. That is how the drift refusal is
 * driven without touching an installed KiCad: a temp directory holding a
 * doctored one-symbol `Device.kicad_sym` is a stock directory as far as this
 * code is concerned. Each test that sets it restores it in `afterEach`, so a
 * later test file in the same process sees the real one.
 *
 * **THESE DO NOT SKIP WHEN KiCad IS ABSENT.** `stockSymbolDir()` throws and
 * the test fails, for the reason `tests/kicad/symbol-library-disk.ts` gives:
 * a green suite on a machine with no KiCad would be a check that passed while
 * reading nothing.
 */

afterAll(cleanUpTempScratch)

const SAVED = process.env["KICAD_SYMBOL_DIR"]

afterEach(() => {
  if (SAVED === undefined) delete process.env["KICAD_SYMBOL_DIR"]
  else process.env["KICAD_SYMBOL_DIR"] = SAVED
})

/** A stock directory holding one library file with the given text. */
function fakeStockDir(libraryFile: string, text: string): string {
  const dir = freshTempScratch("schgen-stock-")
  fs.writeFileSync(path.join(dir, libraryFile), text)
  return dir
}

test("every vendored nickname resolves, and every vendored symbol agrees with the installed library", () => {
  // THE MEASUREMENT, not just a happy path: this is the check that all eight
  // vendored symbols are byte-identical to what the installed KiCad holds. It
  // fails loudly, naming both files and both hashes, if either side drifts.
  const nicknames = vendoredNicknames()
  expect(nicknames.length, "VENDORED_SYMBOLS covers no nickname at all").toBeGreaterThan(0)
  const libs = symbolLibraries(nicknames)
  expect([...libs.keys()].sort()).toEqual([...nicknames].sort())
  for (const [nickname, file] of libs) {
    expect(fs.existsSync(file), `${nickname} -> ${file}`).toBe(true)
    expect(file.startsWith(stockSymbolDir()), `${nickname} resolves outside the stock dir`).toBe(true)
  }
  // And the symbols themselves are there, which is what the agreement check
  // compares - a library file that resolved but held none would pass the loop
  // above for the wrong reason.
  for (const libId of VENDORED_SYMBOLS) {
    const { library, name } = splitLibId(libId)
    const file = libs.get(library)
    if (file === undefined) throw new Error(`${libId}: nickname ${library} did not resolve`)
    expect(librarySymbols(fs.readFileSync(file, "utf8")).has(name), libId).toBe(true)
  }
})

test("a non-vendored nickname resolves too, which is the stock directory as a declared extension", () => {
  // Amplifier_Operational is in no vendored file and is the library every
  // op-amp symbol this repository will want comes from.
  const libs = symbolLibraries(["Amplifier_Operational"])
  expect([...libs.keys()]).toEqual(["Amplifier_Operational"])
  const file = libs.get("Amplifier_Operational")
  if (file === undefined) throw new Error("Amplifier_Operational did not resolve")
  expect(librarySymbols(fs.readFileSync(file, "utf8")).size).toBeGreaterThan(0)
})

test("the map holds exactly what was asked for, so a version lock cannot fingerprint the machine", () => {
  const libs = symbolLibraries(["Device", "Device", "Connector"])
  expect([...libs.keys()]).toEqual(["Device", "Connector"])
  // The installed directory has far more than two. The point of taking the
  // nicknames as an argument is that the returned map is not that number.
  const installed = fs.readdirSync(stockSymbolDir()).filter((f) => f.endsWith(".kicad_sym"))
  expect(installed.length).toBeGreaterThan(libs.size)
})

test("a nickname in neither source refuses, naming both roots and both remedies", () => {
  expect(() => symbolLibraries(["Nope_Not_A_Library"])).toThrow(
    /no symbol library for nickname\(s\) Nope_Not_A_Library/,
  )
  expect(() => symbolLibraries(["Nope_Not_A_Library"])).toThrow(/the vendored set covers/)
  expect(() => symbolLibraries(["Nope_Not_A_Library"])).toThrow(/never guessed at/)
})

test("a vendored symbol that differs from the installed library refuses, naming both files and both hashes", () => {
  // Device:R, with its (property "Value" "R" ...) altered. The vendored copy
  // on disk is the authority, so this disagreement is the drift the decision
  // exists to catch - and nothing is preferred.
  //
  // The fake library holds ONLY the doctored R, so the failure message quotes
  // two short hashes rather than two megabytes of library.
  const real = path.join(stockSymbolDir(), "Device.kicad_sym")
  const block = librarySymbols(fs.readFileSync(real, "utf8")).get("R")
  if (block === undefined) throw new Error(`${real} holds no symbol "R"`)
  const doctored = block.replace('"Value" "R"', '"Value" "RR"')
  expect(doctored !== block, "the substitution matched nothing; re-derive it against the R block")
    .toBe(true)
  process.env["KICAD_SYMBOL_DIR"] = fakeStockDir(
    "Device.kicad_sym",
    `(kicad_symbol_lib (version 20251024)\n${doctored}\n)\n`,
  )
  expect(() => symbolLibraries(["Device"])).toThrow(
    /"Device:R" differs between the vendored copy and the installed library/,
  )
  expect(() => symbolLibraries(["Device"])).toThrow(/sha256 [0-9a-f]{64}[\s\S]*sha256 [0-9a-f]{64}/)
  expect(() => symbolLibraries(["Device"])).toThrow(/NOTHING IS PREFERRED/)
})

test("a vendored symbol the installed library no longer holds refuses rather than skipping it", () => {
  process.env["KICAD_SYMBOL_DIR"] = fakeStockDir(
    "Jumper.kicad_sym",
    '(kicad_symbol_lib (version 20251024) (symbol "Something_Else" (property "Reference" "J" (at 0 0 0))))\n',
  )
  expect(() => symbolLibraries(["Jumper"])).toThrow(
    /"Jumper:Jumper_2_Open" is vendored at .* but .* holds no symbol "Jumper_2_Open"/,
  )
})

test("a stock directory with no library in it refuses, rather than refusing every nickname for the wrong reason", () => {
  process.env["KICAD_SYMBOL_DIR"] = freshTempScratch("schgen-stock-empty-")
  expect(() => symbolLibraries(["Device"])).toThrow(/holds no \.kicad_sym library/)
})
