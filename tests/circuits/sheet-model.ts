/**
 * **THE THREE ARGUMENTS `compareSheetToModel` NEEDS FOR ONE DRAFTED PULTEC PAGE, built without
 * reaching into `lib/schgen/` or `tools/schgen/` at all.**
 *
 * `tests/circuits/drafted-sheet.ts`'s `modelUnderTest` built the same facts by running the
 * schematic generator's front half - `circuitSpecFrom`, `buildCircuit`, `annotate` - and that
 * whole path is deleted. What a model-versus-drawing comparison actually needs out of it is three
 * things, and none of them needs a generator: the board's `Network`, the KiCad reference each
 * component carries on the COMMITTED page, and the KiCad pin number each canonical pin sits on.
 * This module produces those three, from the board's own circuit module and from the pin tables
 * `circuits/pultec/physical/parts.ts` declares.
 *
 * **"COMMITTED", NOT "APPROVED", THROUGHOUT THIS FILE.** Nothing here reads a page's status: the
 * subject is whichever sheet a board declares as its `"sch"` under `drafted/pultec/`. A verdict is
 * bound to the exact bytes reviewed (`EVALUATING-DRAWINGS.md` §5) and `docs/schematic/verdicts.md`
 * is the only authority for one, so an approval count written into a comment here would be a
 * transcription with a date on it - and the register, not this file, is where that word belongs.
 *
 * **`tests/circuits/guard-equivalence.test.ts` IS WHAT SAID IT IS THE SAME COMPARISON**, element
 * for element on all six of `SheetAgreement`'s lists across all five of those pages, against the
 * generator-backed path. Nothing here was to be trusted on the strength of its reasoning; that
 * test was the measurement, it passed on all five pages with controls, and it was deleted with the
 * generator in Task 9 because it existed only while both implementations did. It is in git at
 * `84e810b^`, and a change to the derivations below is now checked by the five board guards in
 * `./drafted-sheet.ts` and by nothing else.
 *
 * ---
 *
 * **WHY THE DESIGNATORS ARE DERIVED BY A RULE AND NOT TRANSCRIBED, which is the one surprise in
 * this file.** `circuits/pultec/designators.ts`'s `pultecDesignator` is NOT the designator a
 * drafted page carries: it answers `SW_HI_CUT`, and the page - and its committed netlist export -
 * says `SW1`. The pages were annotated by `lib/schgen/lock/annotate.ts` from an EMPTY references
 * lock with nothing pinned, which assigns every part `<refPrefix><n>` in the circuit's part
 * order, counting per prefix from 1. Three facts make that reproducible here:
 *
 * | the generator's fact | where it comes from |
 * | --- | --- |
 * | part order | `schematicParts` is `network.components.map(...)`, so a part's order is its index in the network |
 * | the part's label | `SchematicAuthoring.designators`, which for these five boards is `pultecDesignator` applied to the component id |
 * | the part's `refPrefix` | `from-network.ts`'s `refPrefixOf`, the leading capitals of that label (`^[A-Z]+`) |
 *
 * So `C2a2` labels `C2A2`, prefixes `C`, and takes whichever `C<n>` its position in the network
 * earns it; `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` prefixes `SI` and becomes an `SI<n>`, which is
 * why the committed exports carry `SI`-prefixed references for parts whose symbol is an ordinary
 * `Device:R`.
 *
 * **HOW MANY OF THEM IS DELIBERATELY NOT WRITTEN HERE.** This said `SI1`..`SI6` and was wrong on
 * four boards of five - the maxima are `SI8`, `SI6`, `SI8`, `SI9`, `SI9`, so the figure was true
 * of `pultec-hi-cut` alone. A figure in prose is a transcription with a date on it, so the
 * command that answers it stands instead of the answer:
 *
 * ```
 * grep -o 'SI[0-9]*' tests/fixtures/pultec-<board>.net | sort -u -V | tail -1
 * ```
 * **The rule is NOT read off the sheet being compared**: a designator map derived from the
 * netlist under test would make `componentIdentity` vacuous, which is the one list whose whole
 * job is to notice a part on one side and not the other.
 */

import fs from "node:fs"
import path from "node:path"
import { DESIGNATORS as CARRIER_DESIGNATORS, h7Carrier, PIN_NUMBERS as CARRIER_PIN_NUMBERS } from "../../circuits/h7-platform/carrier-board.ts"
import { pinNumbersFromTable } from "../../lib/kicad/from-network.ts"
import type { OwnMappingBoard } from "./own-mapping-board.ts"
import { pultecDesignator } from "../../circuits/pultec/designators.ts"
import { pultecHiBoost } from "../../circuits/pultec/physical/hi-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/physical/hi-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/physical/low-boost.ts"
import { pultecLowCut } from "../../circuits/pultec/physical/low-cut.ts"
import { pultecMid } from "../../circuits/pultec/physical/mid.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import { pinNumbersFor, soleUnitPinNames } from "./sheet-pin-numbers.ts"

/** Everything `compareSheetToModel` takes besides the netlist export itself. */
export interface SheetModel {
  readonly network: Network
  /** Component id -> the KiCad reference the committed page carries for it. */
  readonly designators: ReadonlyMap<string, string>
  /** Component id -> (canonical pin name -> KiCad pin number). */
  readonly pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>
}

/** One Pultec board, whose model, designators and pin numbers this file derives by the Pultec rules. */
interface DraftedBoard {
  readonly board: string
  /** The circuit module, repository-relative, checked against the board's own manifest. */
  readonly module: string
  /** The exported builder's name, checked against the board's own manifest. */
  readonly exportName: string
  readonly build: () => Network
}

/**
 * The boards, their builders, and the two claims about each that `declaredBoard` checks.
 *
 * **A STATIC TABLE, VERIFIED AGAINST `boards/<board>/perfboard.json` ON EVERY CALL.** The board's
 * own manifest is the authority for which circuit it is - the deleted
 * `tools/schgen/board-sheets.ts` stated why, and a directory name says nothing about which
 * TypeScript builds it - but a test file
 * cannot import a path it reads at run time without a dynamic import, and a dynamic import would
 * make a wrong path a timing failure rather than a named one. So the binding is written down and
 * CHECKED: the manifest's `circuit` and `export` must be the module and builder named here, or
 * the call refuses. A board re-pointed at another circuit fails loudly instead of being compared
 * against a model that is no longer its own.
 */
const BOARDS: readonly (DraftedBoard | OwnMappingBoard)[] = [
  {
    board: "h7-carrier",
    module: "circuits/h7-platform/carrier-board.ts",
    exportName: "h7Carrier",
    build: h7Carrier,
    designators: new Map(Object.entries(CARRIER_DESIGNATORS)),
    pinNumbers: (network) => pinNumbersFromTable(network, CARRIER_PIN_NUMBERS),
  },
  { board: "pultec-hi-boost", module: "circuits/pultec/physical/hi-boost.ts", exportName: "pultecHiBoost", build: pultecHiBoost },
  { board: "pultec-hi-cut", module: "circuits/pultec/physical/hi-cut.ts", exportName: "pultecHiCut", build: pultecHiCut },
  { board: "pultec-low-boost", module: "circuits/pultec/physical/low-boost.ts", exportName: "pultecLowBoost", build: pultecLowBoost },
  { board: "pultec-low-cut", module: "circuits/pultec/physical/low-cut.ts", exportName: "pultecLowCut", build: pultecLowCut },
  { board: "pultec-mid", module: "circuits/pultec/physical/mid.ts", exportName: "pultecMid", build: pultecMid },
]

function manifestString(record: Record<string, unknown>, key: string, file: string): string {
  const value = record[key]
  if (typeof value !== "string") {
    throw new Error(`${file} must carry a string "${key}" field; it has ${JSON.stringify(record[key])}`)
  }
  return value
}

/** The board's entry, after checking the board's own manifest still names this circuit. */
function declaredBoard(board: string): DraftedBoard | OwnMappingBoard {
  const entry = BOARDS.find((b) => b.board === board)
  if (entry === undefined) {
    throw new Error(
      `no drafted-page model is declared for the board "${board}". The boards ` +
        `declared are [${BOARDS.map((b) => b.board).join(", ")}], and ` +
        "each is written down in BOARDS in tests/circuits/sheet-model.ts with its circuit " +
        "module and builder. It is not derived from the name: a board directory says nothing " +
        "about which TypeScript builds it, and guessing would compare a page against whichever " +
        "circuit happened to match.",
    )
  }
  const boardDir = path.join(moduleRepoRoot(), "boards", board)
  const file = path.join(boardDir, "perfboard.json")
  const json: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (typeof json !== "object" || json === null) throw new Error(`${file} is not a JSON object`)
  const record = json as Record<string, unknown>
  const declaredModule = path.relative(moduleRepoRoot(), path.resolve(boardDir, manifestString(record, "circuit", file)))
  const declaredExport = manifestString(record, "export", file)
  if (declaredModule !== entry.module || declaredExport !== entry.exportName) {
    throw new Error(
      `${file} says board "${board}" is built by ${declaredExport}() in ${declaredModule}, and ` +
        `BOARDS in tests/circuits/sheet-model.ts imports ${entry.exportName}() from ` +
        `${entry.module}. The manifest is the authority for which circuit a board is, so this ` +
        "table is stale: point it at the module the manifest names. It is not followed " +
        "automatically, because comparing the committed page against a circuit it was not drawn " +
        "from would report the whole board as a disagreement and tell nobody why.",
    )
  }
  return entry
}

/**
 * **PER BOARD, PER COMPONENT, A PIN MAP THE COMMITTED PAGE DECLARES AND NO RULE DERIVES.** It
 * REPLACES the rule's answer for that one component on that one board, and nothing else.
 *
 * **ONE ENTRY, AND IT IS A FACT ABOUT A DRAWING THE OWNER LOOKED AT.** `R2` on `pultec-low-boost`
 * is drawn with its output end on the right, and the positional rule (`./sheet-pin-numbers.ts`) puts it on the left. The owner,
 * 2026-10-27, on the generated sheet: *"what is odd is R1, which has an unnecessary hairpin to
 * the out label. And the out label is oddly far away. you could easily rotate R1 to get rid of
 * the hairpin."* `R2` carries net `out` on canonical pin `a`, which maps positionally to pin 1,
 * and the generator's `signalAxis` put the lower-numbered pin on the LEFT by what its own comment
 * calls *"an arbitrary stable choice rather than dressed up as semantics"* - so the OUTPUT end
 * sat away from the `out` label and the wire doubled back over itself, measured as 2 grid cells
 * back before 49 forward. Swapping which pin number carries `a` and `b` puts `out` on the far
 * side and the wire runs straight. **A resistor's two pins are interchangeable, so it is
 * electrically a no-op**, which is why the netlist comparison below passes either way about the
 * circuit and reports the one thing that did change: which pin of the symbol the wire lands on.
 *
 * **IT IS CARRIED HERE BECAUSE THE PAGE IS FROZEN AND ITS DECLARATION'S HOME IS NOT.** The map
 * was declared in `circuits/pultec/schematic/low-boost.ts`, which exists to feed the schematic
 * generator and is deleted with it; the drawn page, its sha256 and its committed export are not
 * going anywhere. Without this entry the guard would report two net disagreements on the committed
 * page - the swap the generator was told to make at the owner's instruction, quoted above.
 * `docs/schematic/verdicts.md` is the authority for what he then thought of the page; this entry
 * does not depend on that and must not restate it.
 *
 * **AN ENTRY IS COMPLETE OR IT REFUSES**, which is the rule the declaration it replaces also
 * followed: *"A partial map is not completed by a rule here, because a map that covers some pins
 * is a statement that the author looked at all of them."* A stale entry - a board or a component
 * the network does not have - refuses too, rather than sitting here naming nothing.
 */
const DECLARED_PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
  "pultec-low-boost": { R2: { a: "2", b: "1" } },
}

/**
 * `DECLARED_PIN_NUMBERS`' entry for one board, by `Object.hasOwn` rather than a bare index.
 *
 * `lib/kicad/sheet-agreement.ts`'s own stated reason: a key colliding with an `Object.prototype`
 * member must not return a function and be read as a declaration.
 */
function declaredOn(board: string): Readonly<Record<string, Readonly<Record<string, string>>>> | undefined {
  return Object.hasOwn(DECLARED_PIN_NUMBERS, board) ? DECLARED_PIN_NUMBERS[board] : undefined
}

/** One component's pin numbers on one board: a declared map where there is one, else the rule. */
function pinNumbersOn(board: string, component: Component): ReadonlyMap<string, string> {
  const forBoard = declaredOn(board)
  const declared = forBoard === undefined || !Object.hasOwn(forBoard, component.id) ? undefined : forBoard[component.id]
  if (declared === undefined) return pinNumbersFor(component)
  const names = soleUnitPinNames(component)
  const mapped = Object.keys(declared)
  if (names.length !== mapped.length || !names.every((n) => mapped.includes(n))) {
    throw new Error(
      `DECLARED_PIN_NUMBERS["${board}"]["${component.id}"] maps [${mapped.join(", ")}] and the ` +
        `component's pins are [${names.join(", ")}]. A declared map is not completed by the rule ` +
        "here: a map that covers some pins is a statement that whoever wrote it looked at all of " +
        "them. Fix the entry in tests/circuits/sheet-model.ts, or delete it if the drawing no " +
        "longer needs it.",
    )
  }
  return new Map(Object.entries(declared))
}

/**
 * Every BOARD `DECLARED_PIN_NUMBERS` names must be one of `BOARDS`, and every COMPONENT it names
 * must be a component of that board.
 *
 * **THE BOARD HALF WAS VALIDATED BY NOTHING, AND THAT IS WHY IT IS HERE.** Only the component half
 * was checked, and the board key was read by a bare bracket index - so a typo'd or renamed key
 * made its whole entry silently inert: `pinNumbersOn` fell through to the positional rule and the
 * only symptom was `pultec-low-boost`'s `netMembership` guard failing with a message about two
 * nets rather than about a declaration that stopped applying. The one hand-declared exception in
 * this guard - the `R2` a/b swap the owner's verdict on that page asked for - hung off that key.
 *
 * It refuses NAMING THE KEY AND THE BOARDS THAT EXIST, and nothing is defaulted: an entry that
 * applies to no board is precisely the one a reader would have trusted to cover the part whose pin
 * map is now coming from the rule instead. Renaming a board directory is the live way to reach
 * this - the keys here are strings and nothing moves them.
 */
function checkDeclaredPinNumbers(board: string, network: Network): void {
  const names = new Set(BOARDS.map((b) => b.board))
  const unknownBoards = Object.keys(DECLARED_PIN_NUMBERS).filter((key) => !names.has(key))
  if (unknownBoards.length > 0) {
    throw new Error(
      `DECLARED_PIN_NUMBERS in tests/circuits/sheet-model.ts is keyed by board, and ` +
        `[${unknownBoards.join(", ")}] name no board in BOARDS, whose boards are ` +
        `[${[...names].join(", ")}]. Fix the key or delete the entry. It is not ignored: an entry ` +
        "under a key nothing looks up never applies, and the part it was written for silently " +
        "takes the positional rule's answer instead - which is the one error class that makes a " +
        "drawing disagree with its model in a way no message names.",
    )
  }
  const declared = declaredOn(board)
  if (declared === undefined) return
  const present = new Set(network.components.map((c) => c.id))
  const unknown = Object.keys(declared).filter((id) => !present.has(id))
  if (unknown.length > 0) {
    throw new Error(
      `DECLARED_PIN_NUMBERS["${board}"] names component(s) [${unknown.join(", ")}], which are ` +
        "not in that board's network. The entry is stale, or it names a component of another " +
        "board. It is not ignored: an entry that names nothing is the one a reader would have " +
        "trusted to cover the part whose pin map is now coming from the rule instead.",
    )
  }
}

/** The leading capitals of a part's label - the generator's own `refPrefixOf`. */
const REF_PREFIX = /^([A-Z]+)/

/**
 * The KiCad reference every component of `network` carries on its committed page.
 *
 * `<refPrefix><n>` in network order, counting per prefix from 1, which is what the generator's
 * `lib/schgen/lock/annotate.ts` assigned from an empty references lock with nothing pinned - see
 * the module header for the three facts that made it reproducible, and for what measured that it
 * does reproduce it.
 */
export function sheetDesignators(network: Network): ReadonlyMap<string, string> {
  const used = new Map<string, number>()
  const out = new Map<string, string>()
  for (const component of network.components) {
    const label = pultecDesignator(component.id)
    const match = REF_PREFIX.exec(label)
    const prefix = match === null ? undefined : match[1]
    if (prefix === undefined) {
      throw new Error(
        `the label "${label}" (component "${component.id}") does not start with capital ` +
          "letters, so there is no reference prefix to count it under. pultecDesignator in " +
          "circuits/pultec/designators.ts already refuses a label that is not " +
          "^[A-Z][A-Z0-9_]*$, so reaching this means that check was weakened.",
      )
    }
    const n = (used.get(prefix) ?? 0) + 1
    used.set(prefix, n)
    out.set(component.id, `${prefix}${n}`)
  }
  return out
}

/**
 * The repository-relative path of the circuit module that builds `board`'s model, after the same
 * manifest check `modelForSheet` makes. The SchGen drawing trial records it in each attempt's
 * manifest as the model the request was generated from.
 */
export function modelModuleFor(board: string): string {
  return declaredBoard(board).module
}

/** One drafted Pultec page's model, designators and pin numbers. */
export function modelForSheet(board: string): SheetModel {
  const entry = declaredBoard(board)
  const network = entry.build()
  if ("designators" in entry) {
    return { network, designators: entry.designators, pinNumbers: entry.pinNumbers(network) }
  }
  checkDeclaredPinNumbers(board, network)
  const pinNumbers = new Map<string, ReadonlyMap<string, string>>()
  for (const component of network.components) pinNumbers.set(component.id, pinNumbersOn(board, component))
  return { network, designators: sheetDesignators(network), pinNumbers }
}
