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
 *
 * **AND ONE ARM IS NOT ABOUT A NAME AT ALL**: every VENDORED symbol is compared
 * byte for byte against the installed library's own flattened text. It was
 * `tests/schgen/render/stock-symbols.test.ts`'s and is ported here, with its
 * own comment saying why the claim outlives the generator that used to make it.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  VENDORED_SYMBOLS,
  flattenedSymbol,
  librarySymbols,
  splitLibId,
  vendoredSymbolFile,
  vendoredSymbolText,
} from "../../lib/kicad/symbol-library.ts"
import { VENDORED_CHECKOUT_NAMES } from "../../lib/not-source.ts"
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

/**
 * Directories a source sweep must not walk into, named rather than
 * pattern-matched. `build` and `guide` are this sweep's own generated
 * output; `VENDORED_CHECKOUT_NAMES` (`lib/not-source.ts`) is the fetched,
 * not-authored-here half - `.tools` and `copperhead` - shared with every
 * other walker that has to agree on the same fact. This set used to be a
 * byte-identical copy of `./footprint-sweep.ts`'s own - Task 3 fix round 1
 * found that duplication was exactly how the two walkers could silently
 * drift apart on what "not ours" means.
 */
const NOT_SOURCE = new Set([".git", "node_modules", "build", "guide", ...VENDORED_CHECKOUT_NAMES])

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

/**
 * **THERE IS NO EXEMPTION LIST ANY MORE, AND THAT IS THE STRONGER STATE.**
 * `NOT_A_KICAD_SYMBOL` held eight lib ids naming a hand-written FIXTURE
 * library - `Fix:R`, `Fix:C`, `Fix:BIG8`, `Fix:OPAMP2`, `Fix:OPAMP2X`,
 * `Pwr:GND`, `Pwr:+3V3` and `H7:TPS7A4901` - each declared in a ported test
 * under `tests/schgen/`, and the whole of `tests/schgen/` is deleted with the
 * schematic generator. Its two teeth went with it: each entry had to still
 * fail to resolve in the recorded way, and every swept site had to be under
 * `tests/schgen/`. Both are now vacuous, so the list and its teeth test are
 * deleted rather than left empty - an exemption nothing can fire is a hole
 * waiting for the next name somebody puts in it. **Every swept lib id now has
 * to resolve on disk, with nothing to skip past.** The eight entries and the
 * reasons each one could not be a real KiCad name are in git; a future ported
 * fixture library needs the list, the teeth and its own test back together.
 */

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

/**
 * **EVERY VENDORED SYMBOL IS BYTE-IDENTICAL TO THE INSTALLED LIBRARY'S OWN
 * FLATTENED TEXT - PORTED HERE FROM THE DELETED
 * `tests/schgen/render/stock-symbols.test.ts`.**
 *
 * That file's first arm was the only thing that ran this comparison, and the
 * comparison itself lived in `lib/schgen/render/stock-symbols.ts`'s
 * `checkVendoredAgreement`, which the generator's removal deletes. The CLAIM
 * is not about the generator at all: `lib/kicad/symbols/<Nickname>/<Name>.sexpr`
 * and `lib/kicad/symbol-library.ts`'s `VENDORED_SYMBOLS` both survive, and what
 * makes a vendored copy worth having is that the installed KiCad still holds
 * the same bytes. Without this, the surviving checks are that each vendored
 * name RESOLVES (above) and that its copy loads and has pins
 * (`./symbol-library.test.ts`) - neither of which would notice a KiCad release
 * redrawing a symbol under the same name, which is the whole thing the vendored
 * set exists to pin.
 *
 * **BOTH SIDES ARE FLATTENED BY `flattenedSymbol`**, the same function
 * `tools/kicad/vendor-symbols.ts` used to write the copies, so equality is
 * exact rather than approximate - including an `(extends ...)` symbol's parent
 * body. The trailing newline is the one the vendoring tool writes.
 *
 * It does NOT skip when KiCad is absent: `symbolLibraryFile` resolves through
 * `./symbol-library-disk.ts`'s root and the read throws, for the reason that
 * file gives.
 */
/**
 * The installed library for `libId`, as a name-to-block map.
 *
 * Shared by the comparison and by its controls on purpose: a control that reimplemented the read
 * would prove something about itself. `fs.readFileSync` here is what makes the whole arm refuse
 * rather than skip on a machine with no KiCad.
 */
function installedLibraryOf(libId: string): ReadonlyMap<string, string> {
  return librarySymbols(fs.readFileSync(symbolLibraryFile(libId), "utf8"))
}

/**
 * Why `libId`'s vendored copy and `library`'s own flattened text disagree, or `undefined` when
 * they do not.
 *
 * **THE ONE COMPARISON, CALLED BY THE REAL ARM AND BY BOTH CONTROLS.** `library` is a parameter so
 * a control can hand it a PERTURBED installed side and watch this same function report the drift -
 * which is the only form of control that can fail here (see the first one below).
 */
function vendoredDrift(libId: string, library: ReadonlyMap<string, string>): string | undefined {
  const { name } = splitLibId(libId)
  if (!library.has(name)) {
    return `${libId}: ${symbolLibraryFile(libId)} no longer holds a symbol "${name}"`
  }
  const installedText = `${flattenedSymbol(library, name)}\n`
  if (installedText === vendoredSymbolText(libId)) return undefined
  return `${libId}: ${vendoredSymbolFile(libId)} differs from ${symbolLibraryFile(libId)}`
}

test("every vendored symbol is byte-identical to the installed library's own flattened text", () => {
  expect(VENDORED_SYMBOLS.length, "an empty vendored set would make the loop below vacuous")
    .toBeGreaterThan(0)
  const drifted = VENDORED_SYMBOLS.map((libId) => vendoredDrift(libId, installedLibraryOf(libId)))
    .filter((d): d is string => d !== undefined)
  expect(
    drifted,
    "NOTHING IS PREFERRED. Re-run tools/kicad/vendor-symbols.ts against this KiCad and update " +
      "lib/kicad/symbols/PROVENANCE.md if the drift is intended, or point KICAD_SYMBOLS at the " +
      "version PROVENANCE.md names.",
  ).toEqual([])
})

/**
 * **THE PERTURBATION IS ON THE INSTALLED SIDE, AND THE FIRST VERSION OF THIS CONTROL COULD NOT
 * FAIL.** It asserted `installedText` equalled the vendored text and then that it did not equal
 * `` `${vendoredSymbolText(libId)} ` `` - a string against itself plus a space, which is a
 * tautology. Under the very sabotage its own comment claimed to catch - a flattener that returned
 * the vendored text - both lines still passed, so it proved only that `===` distinguishes two
 * different strings.
 *
 * What it does now is change ONE CHARACTER of the installed library's own block for this symbol,
 * in memory, and require `vendoredDrift` - the same function the arm above calls - to report the
 * disagreement. A flattener that ignored its `library` argument, or a comparison that always
 * answered equal, fails here.
 */
test("CONTROL: one character changed on the INSTALLED side is reported as drift, by the same comparison", () => {
  const libId = VENDORED_SYMBOLS[0]
  if (libId === undefined) throw new Error("VENDORED_SYMBOLS is empty; the arm above is vacuous")
  const { name } = splitLibId(libId)
  const library = installedLibraryOf(libId)
  // The unperturbed state first: without it, a perturbation that happened to produce the vendored
  // text would read as a working control.
  expect(vendoredDrift(libId, library), `${libId} already disagrees; perturbing it proves nothing`)
    .toBeUndefined()

  const block = library.get(name)
  if (block === undefined) throw new Error(`${libId}: the installed library has no "${name}"`)
  // A digit inside the block, not its name or its structure: the claim under test is BYTE
  // equality, so the smallest real edit is the right perturbation. Nothing is written to disk.
  const perturbed = block.replace(/(\(pin[\s\S]{0,200}?\(at )(-?[0-9]+)/, (_m, head: string, n: string) => `${head}${Number(n) + 1}`)
  expect(perturbed, "the perturbation changed nothing, so this control cannot run").not.toBe(block)
  expect(perturbed.length, "the perturbation must be a character change, not a deletion")
    .toBeGreaterThanOrEqual(block.length)

  const drift = vendoredDrift(libId, new Map(library).set(name, perturbed))
  expect(drift, "a one-character change on the installed side was NOT reported").toBeDefined()
  expect(drift).toContain(vendoredSymbolFile(libId))
})

/**
 * **THE SECOND HALF: the comparison is keyed on the NAME it is asked about.** A flattener that
 * returned whichever block it liked - the first in the library, say - would pass the arm above on
 * any machine where that block happened to be vendored. Handing it a DIFFERENT symbol of the same
 * installed library must not answer this symbol's vendored text.
 */
test("CONTROL: flattening a different symbol of the same library does not match this symbol's vendored copy", () => {
  const libId = VENDORED_SYMBOLS[0]
  if (libId === undefined) throw new Error("VENDORED_SYMBOLS is empty; the arm above is vacuous")
  const { name } = splitLibId(libId)
  const library = installedLibraryOf(libId)
  const other = [...library.keys()].find((k) => k !== name)
  if (other === undefined) throw new Error(`${symbolLibraryFile(libId)} holds only "${name}", so there is no other symbol to substitute`)
  expect(`${flattenedSymbol(library, other)}\n`).not.toBe(vendoredSymbolText(libId))
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
