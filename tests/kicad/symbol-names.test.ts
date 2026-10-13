/**
 * EVERY KiCad SYMBOL NAME THIS REPOSITORY WRITES DOWN, CHECKED AGAINST THE
 * INSTALLED LIBRARIES.
 *
 * This is the symbol-side equivalent of the footprint check in
 * `tests/kicad/pin-pattern.test.ts`, and it exists because the symbol axis had
 * nothing: `Switch:SW_Rotary` reached the value field of every generated Pultec
 * netlist and no test could see it, because the only disk-backed symbol list was
 * `VENDORED_SYMBOLS` and that name was not in it. `./symbol-library-disk.ts`
 * carries the rest of that history and why it refuses rather than skips.
 *
 * **THREE SOURCES, NOT ONE, BECAUSE NO SINGLE ONE IS COMPLETE.**
 *
 * 1. A TEXT SWEEP over every `.ts` file in the repository for a part spec's
 *    quoted `symbol` field and for any constant whose name ends in `SYMBOL`
 *    assigned a quoted string. This is what catches a name written straight into
 *    a circuit or a test fixture. (Those two forms are deliberately NOT written
 *    out literally in this comment: a sweep that matched its own prose would
 *    report a finding about the file doing the looking, which is the shape
 *    `tests/stripboard/adopt.test.ts`'s own review calls a check passing for a
 *    reason other than the one it names.)
 * 2. THE DECLARED TABLES, imported rather than matched: `VENDORED_SYMBOLS` and
 *    `ROTARY_SYMBOLS`, which are array/map literals the sweep's patterns do not
 *    see.
 * 3. WHAT PRODUCTION ACTUALLY EMITS: `symbolFor` run over every off-board
 *    component of all five Pultec boards. A derived name is not a literal
 *    anywhere, so only running the deriver can check it - and this is the arm
 *    that would have caught the original defect at its source rather than at a
 *    spelling.
 *
 * **THE SWEEP IS GUARDED AGAINST FINDING NOTHING.** A regex that stopped
 * matching would make this file pass by checking an empty set, which is the
 * failure shape this repository's own rule calls a skipped check that looks like
 * a passing one. So the sweep asserts a floor on how many distinct names it
 * found and names three it must contain.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { VENDORED_SYMBOLS } from "../../lib/kicad/symbol-library.ts"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import {
  INDUCTOR_SYMBOL,
  POT_SYMBOL,
  ROTARY_SYMBOLS,
  TOGGLE_SYMBOL,
} from "../../circuits/pultec/physical/parts.ts"
import {
  SYMBOL_LIBRARY_ROOT,
  installedSymbolNames,
  symbolExistsOnDisk,
  symbolLibraryFile,
} from "./symbol-library-disk.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** Directories a source sweep must not walk into, named rather than pattern-matched. */
const NOT_SOURCE = new Set([".git", "node_modules", "build", ".tools", "guide"])

function sourceFiles(dir: string): readonly string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (NOT_SOURCE.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...sourceFiles(full))
      continue
    }
    if (entry.isFile() && full.endsWith(".ts")) found.push(full)
  }
  return found
}

/**
 * Every `<Library>:<Name>` a `.ts` file declares as a SYMBOL, with the file it
 * came from. Keyed by lib id so one bad name is reported once with every site.
 */
function sweptSymbols(): ReadonlyMap<string, readonly string[]> {
  const found = new Map<string, string[]>()
  for (const file of sourceFiles(REPO_ROOT)) {
    const text = fs.readFileSync(file, "utf8")
    const matches = [
      ...text.matchAll(/\bsymbol:\s*"([^"]+)"/g),
      ...text.matchAll(/\b[A-Z0-9_]*SYMBOL\s*=\s*"([^"]+)"/g),
    ]
    for (const match of matches) {
      const libId = match[1]
      if (libId === undefined) continue
      const sites = found.get(libId) ?? []
      const relative = path.relative(REPO_ROOT, file)
      if (!sites.includes(relative)) sites.push(relative)
      found.set(libId, sites)
    }
  }
  return found
}

const SWEPT = sweptSymbols()

test("the sweep finds the symbol declarations it is supposed to, so it cannot pass over nothing", () => {
  // The floor is the count at the time of writing less a little slack, and the
  // three named ids are one per declaration shape the patterns cover: a part
  // spec in a circuit, a part spec in a test fixture, and a named constant.
  expect(SWEPT.size).toBeGreaterThanOrEqual(12)
  expect([...SWEPT.keys()]).toContain("Audio:PT2399")
  expect([...SWEPT.keys()]).toContain("Device:R_Potentiometer")
  expect([...SWEPT.keys()]).toContain("Switch:SW_SPDT")
})

/** `<Library>:<Name>` in the spelling every KiCad library and netlist in this repository uses. */
const LIB_ID = /^[A-Za-z0-9_+-]+:[A-Za-z0-9_.,+-]+$/

test("every symbol name swept out of the source resolves in an installed KiCad library", () => {
  const missing: string[] = []
  const malformed: string[] = []
  for (const [libId, sites] of SWEPT) {
    // A SWEPT VALUE THAT IS NOT A LIB ID IS REPORTED, NOT DROPPED. Dropping it
    // is how a declaration this check cannot verify becomes a declaration this
    // check pretends to have verified.
    if (!LIB_ID.test(libId)) {
      malformed.push(`${libId} (${sites.join(", ")})`)
      continue
    }
    if (!symbolExistsOnDisk(libId)) missing.push(`${libId} (${sites.join(", ")})`)
  }
  expect(malformed, "these swept values are not <Library>:<Name>, so nothing could look them up")
    .toEqual([])
  expect(
    missing,
    `these symbol names are in no installed library under ${SYMBOL_LIBRARY_ROOT}`,
  ).toEqual([])
})

test("every declared symbol table resolves too, including the rotary table and the vendored set", () => {
  const declared = [
    ...VENDORED_SYMBOLS,
    ...ROTARY_SYMBOLS,
    TOGGLE_SYMBOL,
    POT_SYMBOL,
    INDUCTOR_SYMBOL,
  ]
  // The rotary table is the whole point: it is what replaced Switch:SW_Rotary,
  // and a transcription checked only against itself is a transcription nobody
  // verified.
  expect(ROTARY_SYMBOLS.length).toBe(8)
  const missing = declared.filter((libId) => !symbolExistsOnDisk(libId))
  expect(missing).toEqual([])
})

test("every symbol the five Pultec boards actually emit resolves, which is the derived arm", () => {
  const emitted = new Set<string>()
  for (const section of ["low-boost", "low-cut", "hi-boost", "hi-cut", "mid"]) {
    for (const component of physicalBoard(section).components) {
      const symbol = component.part?.symbol
      if (symbol !== undefined) emitted.add(symbol)
    }
  }
  // The four live sections' selectors are six-position, so this is the name the
  // netlist's own PADS7 implies; it is asserted by value rather than only
  // checked for existence, because "it resolves" would also hold of the wrong
  // rotary.
  expect(emitted).toContain("Switch:SW_Rotary_1x6_MP")
  // NO EXEMPTION LIST. The unresolved mid selector carries no `symbol` field at
  // all (see `rotarySymbolFor`), so it never enters `emitted` and there is
  // nothing here to skip past; the day it gets a symbol, that symbol is checked
  // like every other.
  const missing = [...emitted].filter((libId) => !symbolExistsOnDisk(libId))
  expect(missing).toEqual([])
})

test("the eleven-position rotary is absent from every installed library, so the gap is a result", () => {
  // The eleven-position mid selector has no symbol in Switch.kicad_sym (which
  // stops at 1x9_MP and 1x12), and choosing between a 12-way part stopped at 11
  // and a genuine 11-detent part is a part decision. This asserts the gap rather
  // than whitelisting it: the moment either name starts resolving, the decision
  // is a lookup again and this test says so. That the mid carries NO symbol, and
  // that emitting its netlist therefore refuses, is pinned in
  // tests/circuits/pultec-boards.test.ts.
  expect(fs.existsSync(symbolLibraryFile("Switch:SW_SPDT"))).toBe(true)
  for (const name of ["SW_Rotary_1x11_MP", "SW_Rotary_1x10_MP", "SW_Rotary"]) {
    expect(installedSymbolNames("Switch:SW_SPDT").has(name), name).toBe(false)
    expect(symbolExistsOnDisk(`Switch:${name}`), name).toBe(false)
  }
})

test("an absent library and an absent symbol both refuse, and the message says it does not skip", () => {
  expect(() => installedSymbolNames("Nonexistent_Lib:Nonexistent_Symbol")).toThrow(
    /does not skip/,
  )
  expect(() => installedSymbolNames("not-a-lib-id")).toThrow(/not a KiCad lib id/)
  expect(symbolExistsOnDisk("Switch:SW_Rotary")).toBe(false)
  expect(symbolExistsOnDisk("Switch:SW_Rotary_1x6_MP")).toBe(true)
})
