/**
 * THE FOOTPRINT-NAME SWEEP: every footprint string a program in this repository
 * reads, collected with the files it came from.
 *
 * Split out of `./footprint-names.test.ts` so the collection and the assertions
 * are separately readable, and so the recorded lists sit beside the collector
 * that produces the set they are compared against.
 *
 * **TWO COLLECTION PATTERNS, FOR TWO DIFFERENT FAILURE SHAPES.**
 *
 * 1. DECLARATION-SHAPED matches: a part spec's quoted footprint field, a
 *    constant whose name ends in `FOOTPRINT` assigned a quoted string, and the
 *    values of every committed `*.footprints.json` map. These are the names that
 *    can reach a netlist or a board, and this is the arm that mirrors
 *    `./symbol-names.test.ts`. (The two source forms are deliberately NOT
 *    written out literally in this comment: a sweep that matched its own prose
 *    would report a finding about the file doing the looking.)
 * 2. ANY `<Library>:<Name>` LITERAL WHOSE LIBRARY HALF IS AN INSTALLED FOOTPRINT
 *    LIBRARY, wherever it appears in a `.ts` file - a call argument, a fixture, a
 *    comparison. This is wider than the symbol side's sweep, and deliberately:
 *    BOTH footprint names this repository has shipped that nobody can look up
 *    were a real library plus a name that library does not hold, which is
 *    exactly what this arm catches and what a declaration-shaped sweep misses
 *    when the name is passed inline.
 *
 * **WHAT IT DOES NOT COVER, SAID PLAINLY.** Markdown under `docs/` is not swept:
 * it discusses footprint names, including deliberately fictional ones held up as
 * cautionary examples, and a text sweep cannot tell a cited name from a claimed
 * one. Neither is `circuits/pultec/generated/three-band-eq.net.xml`, which is an
 * export of the owner's own schematic and names footprints from his personal
 * `OL Library` - not an installed stock library, and not on any other machine.
 */
import fs from "node:fs"
import path from "node:path"
import { splitLibId } from "../../lib/kicad/symbol-library.ts"
import { installedFootprintLibraries, resolveFootprintOnDisk } from "./footprint-library.ts"
import { installedSymbolNames, symbolLibraryFile } from "./symbol-library-disk.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** Directories a source sweep must not walk into, named rather than pattern-matched. */
const NOT_SOURCE = new Set([".git", "node_modules", "build", ".tools", "guide"])

/** The library prefix that exempts a name from the disk check. */
export const SYNTHETIC_PREFIX = "SYNTHETIC:"

/**
 * `<Library>:<Name>` in the spelling every KiCad library and netlist here uses.
 *
 * THE LIBRARY HALF ADMITS A DOT, unlike the symbol side's otherwise identical
 * pattern: `Connector_PinHeader_2.54mm` is a footprint library and no installed
 * symbol library carries a dot, so copying that pattern across classified five
 * real pin-header names as bare strings - measured, and the reason this is
 * written out rather than shared.
 */
const LIB_ID = /^[A-Za-z0-9_.+-]+:[A-Za-z0-9_.,+-]+$/

export function isLibId(name: string): boolean {
  return LIB_ID.test(name)
}

/**
 * Strings that legitimately sit in a `footprint` field WITHOUT being a claim
 * about an installed KiCad library, each with what it actually is.
 *
 * The field is polymorphic, which is the only reason this list exists: a
 * VeroRoute import-string name and a footprint name transcribed from the retired
 * tscircuit modules both land in it, and neither is a lib id. Only a lib id is a
 * claim about a library, so only a lib id is looked up on disk.
 *
 * **IT PINS A GAP RATHER THAN ADMITTING ONE.** `./footprint-names.test.ts`
 * compares this against the swept set in BOTH directions, so a new bare name
 * fails until somebody writes down what it is, and a recorded one that
 * disappears fails too. Adding an entry is a statement about what that string
 * IS, not a way to make a failure go away.
 */
export const NOT_A_KICAD_FOOTPRINT: ReadonlyMap<string, string> = new Map([
  // VeroRoute import-string names, which is what an ImportedNetlist component's
  // footprint field holds - see lib/kicad/import-string.ts.
  ["CAP_CERAMIC1", "a VeroRoute import-string name, not a KiCad footprint - a ceramic cap"],
  ["DIP16", "a VeroRoute import-string name, not a KiCad footprint - a 16-pin DIP"],
  ["RESISTOR4", "a VeroRoute import-string name, not a KiCad footprint - a 4-step axial"],
  [
    "RESISTOR 4",
    "a VeroRoute import-string name with the space a netlist parser must reject, in the " +
      "legacy-netlist tests' malformed-input corpus",
  ],
  // Transcribed from the tscircuit modules this repository retired. They are
  // recorded as the source named them, which is what the transcription rule
  // requires; see circuits/opamp-buffer.ts's header for the mapping.
  ["0805", "a tscircuit footprint name, transcribed from the retired OpampBuffer.tsx"],
  ["soic8", "a tscircuit footprint name, transcribed from the retired OpampBuffer.tsx"],
  ["pinrow2", "a tscircuit footprint name for a 2-pin screw terminal, from the same module"],
  ["pinrow3", "a tscircuit footprint name for a 3-pin screw terminal, from the same module"],
  // Stripboard target fixtures, where the only property read is that the field
  // is PRESENT: onBoard() is part.footprint !== undefined and nothing parses it.
  [
    "R_Axial_DIN0207",
    "a bare family name in a targets fixture, where onBoard() reads only that the field is set",
  ],
  [
    "C_Disc_D3.0mm",
    "a bare family name in the same targets fixture, read only for the field's presence",
  ],
])

/**
 * Footprint names CONSTRUCTED to drive a refusal, where no installed footprint
 * has the property the refusal is about - each with why a real name cannot
 * serve.
 *
 * **EVERY ENTRY HERE WAS CHECKED FOR A REAL ALTERNATIVE FIRST, and five of the
 * nine names this sweep found were replaced with one.** `Capacitor_SMD:C_0805`
 * became `C_0805_2012Metric`; `CP_Radial_D3.0mm`/`D20.0mm` became the real
 * `D4.0mm` (157 mil) and `D17.0mm` (669 mil) either side of the 175-650 band;
 * `C_Rect_L13.0mm_W4.0mm_P10.00mm` gained the `_FKS3_FKP3_MKS4` suffix the
 * library actually uses; and the no-pin-count terminal block became the real
 * `TerminalBlock_Wuerth:Wuerth_691311400102_P7.62mm`. The three below are what
 * is left after that, and each is a property the installed libraries have no
 * part for.
 *
 * These reach no netlist and no board: all three are inline arguments in tests
 * that assert a throw. The list is compared against the sweep in both
 * directions, so one that stops being needed fails here.
 */
export const CONSTRUCTED_FOR_A_REFUSAL: ReadonlyMap<string, string> = new Map([
  [
    "Capacitor_THT:CP_Radial_D8.89mm_P3.50mm",
    "8.89mm is 350.00000000000006 mil, the exact midpoint of the 300/400 gap that " +
      "import-string.ts's equidistant-diameter band exists to catch. Capacitor_THT.pretty has " +
      "no CP_Radial at 8.89mm - grepped - so the band is unreachable from a real name.",
  ],
  [
    "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P9.40mm",
    "the off-grid-pitch refusal needs a pitch further than PITCH_TOLERANCE_MM from a whole " +
      "0.1in step. Every installed C_Disc pitch is 2.50, 5.00, 7.50, 7.75 or 10.00mm, and all " +
      "five are inside the tolerance, so no real C_Disc can drive it.",
  ],
  [
    "TerminalBlock_Phoenix:Phoenix_1x02_P7.62mm",
    "the three-grid-step refusal needs a block with BOTH a readable _1x<pins> field and a pitch " +
      "that is an exact multiple of 2.54mm above two steps. The only installed block at 7.62mm " +
      "is Wuerth_691311400102_P7.62mm, which has no _1x field and therefore refuses on the pin " +
      "count first; no installed block carries _1x at 7.62, 10.16, 12.70 or 15.24mm.",
  ],
])

function sourceFiles(dir: string, extension: string): readonly string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (NOT_SOURCE.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...sourceFiles(full, extension))
      continue
    }
    if (entry.isFile() && full.endsWith(extension)) found.push(full)
  }
  return found
}

/**
 * Whether this lib id is an installed SYMBOL. A handful of KiCad library names
 * exist on both sides - `Connector`, `Jumper` - so a symbol lib id can look like
 * a footprint one to a text sweep. Measured: `Connector:TestPoint` and
 * `Jumper:Jumper_2_Open` are the two in this repository.
 *
 * It returns false rather than refusing for an absent symbol library, because
 * the caller only asks this about a name that has ALREADY failed to resolve as a
 * footprint: a "no" here still fails that name, so nothing is skipped.
 */
function isAnInstalledSymbol(libId: string): boolean {
  if (!fs.existsSync(symbolLibraryFile(libId))) return false
  return installedSymbolNames(libId).has(splitLibId(libId).name)
}

/** Why a swept candidate is dropped before the disk check - each one measurable. */
function isNotAFootprintClaim(name: string): boolean {
  // An ellipsis is prose: lib/kicad/import-string.ts and tools/bom/needs.ts both
  // quote a truncated family name in a comment, which is a citation and not a
  // claim that any library holds it.
  if (name.includes("..")) return true
  // A bare name is not a lib id and so is not a claim about any library; it is
  // held to `NOT_A_KICAD_FOOTPRINT` instead, which is why it is KEPT here.
  if (!isLibId(name)) return false
  if (name.startsWith(SYNTHETIC_PREFIX)) return false
  if (resolveFootprintOnDisk(name) === "resolved") return false
  return isAnInstalledSymbol(name)
}

function record(found: Map<string, string[]>, name: string, file: string): void {
  const sites = found.get(name) ?? []
  const relative = path.relative(REPO_ROOT, file)
  if (!sites.includes(relative)) sites.push(relative)
  found.set(name, sites)
}

/** Every footprint name this repository's programs read, with the files naming it. */
export function sweptFootprints(): ReadonlyMap<string, readonly string[]> {
  const libraries = installedFootprintLibraries()
  const found = new Map<string, string[]>()
  for (const file of sourceFiles(REPO_ROOT, ".ts")) {
    const text = fs.readFileSync(file, "utf8")
    for (const match of [
      ...text.matchAll(/\bfootprint:\s*"([^"]+)"/g),
      ...text.matchAll(/\b[A-Z0-9_]*FOOTPRINT\s*=\s*"([^"]+)"/g),
    ]) {
      const name = match[1]
      if (name !== undefined) record(found, name, file)
    }
    for (const match of text.matchAll(/"([A-Za-z0-9_.+-]+):([A-Za-z0-9_.,+-]+)"/g)) {
      const library = match[1]
      const name = match[0].slice(1, -1)
      if (library === undefined) continue
      if (!libraries.has(library) && !name.startsWith(SYNTHETIC_PREFIX)) continue
      record(found, name, file)
    }
  }
  for (const file of sourceFiles(REPO_ROOT, ".footprints.json")) {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(`${file} is not a designator-to-footprint object, so it cannot be swept.`)
    }
    for (const value of Object.values(parsed)) {
      if (typeof value !== "string") {
        throw new Error(`${file} maps a designator to a non-string, which cannot be a footprint.`)
      }
      record(found, value, file)
    }
  }
  for (const name of [...found.keys()]) {
    if (isNotAFootprintClaim(name)) found.delete(name)
  }
  return found
}
