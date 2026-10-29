/**
 * **THE GUARD BEHIND A BOARD THAT DECLARES AN AGENT-DRAFTED PAGE AS ITS `"sch"`.**
 *
 * `make/board.mk`'s `netlist-agrees` demands a `tests/circuits/<board>.test.ts` from every board
 * declaring an `"sch"`/`"netlist"` pair, and says what it is for: *"Add tests there asserting the
 * circuit still agrees with the schematic export - that guard is what this declaration exists
 * for."* This module is what the four Pultec section boards' files share.
 *
 * **IT IS NOT `expectSameCircuit`, AND THAT IS NOT A SHORTCUT.** `./kicad-round-trip.ts` compares a
 * KiCad export against `toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS, ...)` - the VEROROUTE
 * lowering, in which an off-board part's footprint is the string `PADS<n>` and its pins are
 * numbered by `PAD_ORDER` index. A Pultec section board has four to seven off-board parts, so that
 * comparison would report a disagreement on every one of them about a vocabulary neither side is
 * wrong in. What compares a drawing against a model is `lib/schgen/gates/round-trip.ts`, whose five
 * separately-reported comparisons were written for exactly this, and that is what this module runs.
 *
 * **IT DOES NOT RUN `kicad-cli`, DELIBERATELY.** The netlist it reads is the board's declared,
 * committed `.net`, and `make netlist-agrees` re-exports that file from the sheet and reconciles it
 * BY CONTENT on every single run before this test is reached (`tools/perfboard/netlist-sync.ts`).
 * Exporting a second time here would check the same thing twice and make the slower half of this
 * guard the half that proves nothing new. The cost of that choice, stated rather than hidden: run
 * on its own, `bun test tests/circuits/pultec-hi-cut.test.ts` compares the model against whatever
 * `.net` is committed, so a stale fixture passes it. `make check` is where the freshness comes
 * from.
 *
 * **AND IT DOES NOT DRAW ANYTHING.** `generateReported` would lay the circuit out with ELK and
 * render it, which is several seconds a board and couples this guard to every file under
 * `lib/schgen/render/`. Only the IR and the designator annotation are needed to compare a model
 * with a netlist, and both exist before any geometry does - so this builds exactly those two.
 */
import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist, type ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { roundTrip, type RoundTripProblems } from "../../lib/schgen/gates/round-trip.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { annotate, EMPTY_LOCK } from "../../lib/schgen/lock/annotate.ts"
import type { Circuit, PartLabel } from "../../lib/schgen/ir/types.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { caseResolver } from "../../tools/schgen/authoring-census.ts"
import { boardRefs, declarationFor } from "../../tools/schgen/board-sheets.ts"
import { parityDesign } from "../../tools/schgen/gate-census.ts"
import { designResolver } from "../../tools/schgen/generate.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * The suffix every sheet under `drafted/` carries, and the reason it is not cosmetic.
 *
 * KiCad's title block prints the sheet's FILE NAME on its `File:` line, so this suffix is what puts
 * the *"generated - do not edit"* notice §3 of the draughtsmanship practice design requires onto
 * every page these sheets plot - at the cost of zero bytes. Writing it into a `title_block` field
 * instead would change the bytes and break each page's binding to the sha256 its verdict is
 * recorded against. `drafted/README.md` carries the whole of that reasoning.
 */
export const DRAFTED_SUFFIX = ".generated-do-not-edit"

/** `drafted/<circuit>/<board>/`, absolute. */
export function draftedDir(circuit: string, board: string): string {
  return path.join(moduleRepoRoot(), "drafted", circuit, board)
}

/** The drafted sheet itself, absolute. */
export function draftedSheet(circuit: string, board: string): string {
  return path.join(draftedDir(circuit, board), `${board}${DRAFTED_SUFFIX}.kicad_sch`)
}

export function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/**
 * The sheet digest `drafted/<circuit>/<board>/RECORD.md` records as the binding.
 *
 * **IT IS PARSED OUT OF THE RECORD RATHER THAN WRITTEN HERE**, because a hash copied into a test
 * file is a second place for one fact to be wrong, and the record beside the drawing is where §3
 * puts it. Throws naming the file when the row is absent or ambiguous: a record whose digest cannot
 * be read is not a record that passes.
 */
export function recordedSheetDigest(circuit: string, board: string): string {
  const file = path.join(draftedDir(circuit, board), "RECORD.md")
  const text = fs.readFileSync(file, "utf8")
  const rows = [...text.matchAll(/sha256 of the sheet - THE BINDING\*\* \| `([0-9a-f]{64})` \|/g)]
  const first = rows[0]
  if (rows.length !== 1 || first === undefined) {
    throw new Error(
      `${file}: expected exactly one row naming the sheet's sha256 as THE BINDING, found ` +
        `${rows.length}. That row is what binds this committed page to the verdict recorded in ` +
        "docs/schematic/verdicts.md; without it nothing here knows which bytes were approved.",
    )
  }
  return first[1] as string
}

/** The board's IR and its designator annotation - everything `roundTrip` compares a netlist against. */
export interface ModelUnderTest {
  readonly circuit: Circuit
  readonly refs: ReadonlyMap<PartLabel, string>
}

/**
 * Build one board's schematic IR and annotate it, with no layout and no file written.
 *
 * The authority for which circuit a board is remains the board's own `perfboard.json`, through
 * `boardRefs`/`declarationFor` - not a name match, for the reason `tools/schgen/board-sheets.ts`
 * states. A board with no `SchematicAuthoring` declaration throws naming itself rather than being
 * skipped.
 */
export function modelUnderTest(board: string): ModelUnderTest {
  const repoRoot = moduleRepoRoot()
  const ref = boardRefs(repoRoot).find((b) => b.name === board)
  if (ref === undefined) throw new Error(`no board directory ${board} under boards/`)
  const declared = declarationFor(ref)
  if (declared === null) {
    throw new Error(
      `no SchematicAuthoring declaration for ${ref.export}() (${ref.circuit}), so there is no ` +
        "schematic-side model to compare the drafted sheet against. docs/known-gaps.md G247.",
    )
  }
  // A scratch outDir nothing writes into: `parityDesign` only needs somewhere to point `outDir`,
  // and neither `buildCircuit` nor `annotate` touches the filesystem. Removed before returning so
  // a test run leaves no directory behind.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "drafted-sheet-"))
  try {
    const design = parityDesign(declared, caseResolver([declared]), repoRoot, scratch)
    const symbols = designResolver(design, stockSymbolDir())
    const circuit = buildCircuit(design.spec.circuit, { symbols })
    // EMPTY_LOCK, not a read of a committed refs lock: no board under `boards/` has one, because
    // `tools/schgen/board-sheets.ts` writes every generation into the git-ignored `build/` tree
    // with `initLock: true`. `annotate` assigns deterministically from an empty lock, which is
    // what the designators on the drafted sheets were drawn from.
    const { refs } = annotate(circuit, EMPTY_LOCK, new Map())
    return { circuit, refs }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

/** The board's committed netlist export, imported. */
export function committedNetlist(netlist: string): ImportedNetlist {
  return importNetlist(fs.readFileSync(path.join(moduleRepoRoot(), netlist), "utf8"))
}

/** `roundTrip` over one board: its IR and refs against its committed netlist export. */
export function roundTripOf(board: string, netlist: string): RoundTripProblems {
  const { circuit, refs } = modelUnderTest(board)
  return roundTrip(circuit, refs, committedNetlist(netlist))
}

/**
 * `exported` with one pin moved from its largest net to its second largest.
 *
 * **THE POSITIVE CONTROL EVERY `netMembership: []` ASSERTION NEEDS.** An empty problem list is the
 * same shape whether the comparison agreed or never looked, and this repository's own history is a
 * catalogue of the second read as the first. Moving one pin between two nets must make
 * `netMembership` non-empty; if it does not, the zero beside it means nothing.
 *
 * The two biggest nets are chosen rather than named, so this works on every board without four
 * copies of a net name that is a fact about one sheet.
 */
export function withOnePinMoved(exported: ImportedNetlist): ImportedNetlist {
  const bySize = Object.entries(exported.nets)
    .filter(([, members]) => members.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))
  const [first, second] = bySize
  if (first === undefined || second === undefined) {
    throw new Error(
      "the export has fewer than two multi-pin nets, so no pin can be moved between two of them " +
        "and this positive control cannot run. A control that cannot run is not a control.",
    )
  }
  const moved = first[1][0]
  if (moved === undefined) throw new Error(`net "${first[0]}" has no members to move`)
  return {
    ...exported,
    nets: { ...exported.nets, [first[0]]: first[1].slice(1), [second[0]]: [...second[1], moved] },
  }
}

/**
 * The two disagreements EVERY drafted Pultec page carries, in the exact words `roundTrip` reports
 * them, because they are properties of how these four sheets were drawn rather than of any circuit.
 *
 * `SW1` is drawn with the `SW_Rotary_1x6_MP` stock symbol, which carries a mechanical mount lug the
 * model does not - *"a mounting pin `MP`, which is a mechanical pad and is on no net in the
 * model"* (`circuits/pultec/schematic/section-board.ts:162`), the same fact `docs/known-gaps.md`
 * **G282** records - and its `Value` field holds that symbol's name where the model holds the
 * model's own value. Asserted EXACTLY rather than tolerated loosely: a second entry appearing in
 * either list is a new disagreement and must fail.
 */
export const SELECTOR_PIN_DISAGREEMENT =
  "SW1 pin numbers: model [1, 2, 3, 4, 5, 6, 7] vs schematic [1, 2, 3, 4, 5, 6, 7, MP]"

export const SELECTOR_VALUE_DISAGREEMENT =
  'SW1: the schematic says "6-way selector" and the model says "SW_Rotary_1x6_MP"'

/** One board's drafted page, as its own `tests/circuits/<board>.test.ts` declares it. */
export interface DraftedPageUnderTest {
  /** The board directory's name, which is also the sheet's stem. */
  readonly board: string
  /** The circuit directory under `drafted/`. */
  readonly circuit: string
  /** The committed netlist export, repository-relative, exactly as `perfboard.json` declares it. */
  readonly netlist: string
  /**
   * Every `values` disagreement this page carries, in `roundTrip`'s own words, sorted as it sorts.
   *
   * **ASSERTED EXACTLY AND NEVER AS A COUNT.** A page whose value text drifts from the model's in
   * one more place must fail here, and a list is the only form of this claim that says WHICH.
   */
  readonly valueDisagreements: readonly string[]
}

/**
 * The five tests every board declaring a page under `drafted/` gets.
 *
 * Registered from the board's own `tests/circuits/<board>.test.ts` because `make/board.mk` looks
 * for a file at exactly that path and fails naming it when it is absent - one file per board is the
 * interface, and this is the body they share rather than four copies of it.
 */
export function registerDraftedPageTests(page: DraftedPageUnderTest): void {
  const { board, circuit, netlist } = page

  test(`${board}: the committed sheet still hashes to the digest its record binds it to`, () => {
    const sheet = draftedSheet(circuit, board)
    const computed = sha256OfFile(sheet)
    expect(computed).toBe(recordedSheetDigest(circuit, board))
    // The positive control: the digest is of THIS file and moves with its bytes. Without it, a
    // `recordedSheetDigest` that returned the computed value would pass the line above forever.
    expect(createHash("sha256").update(fs.readFileSync(sheet)).update("x").digest("hex")).not.toBe(computed)
  })

  test(`${board}: the committed netlist was exported from the drafted sheet and no other file`, () => {
    const text = fs.readFileSync(path.join(moduleRepoRoot(), netlist), "utf8")
    const expected = `drafted/${circuit}/${board}/${board}${DRAFTED_SUFFIX}.kicad_sch`
    expect(text).toContain(`(source "${expected}")`)
  })

  test(`${board}: every component and every net agrees between the drafted page and the model`, () => {
    const model = modelUnderTest(board)
    const problems = roundTrip(model.circuit, model.refs, committedNetlist(netlist))
    expect(problems.componentIdentity).toEqual([])
    expect(problems.netMembership).toEqual([])
  })

  test(`${board}: moving one pin between two nets is reported - the control for the zero above`, () => {
    const model = modelUnderTest(board)
    const mutated = withOnePinMoved(committedNetlist(netlist))
    expect(roundTrip(model.circuit, model.refs, mutated).netMembership).not.toEqual([])
  })

  test(`${board}: the page's known disagreements with the model are exactly the drawn-elsewhere ones`, () => {
    const model = modelUnderTest(board)
    const problems = roundTrip(model.circuit, model.refs, committedNetlist(netlist))
    // The selector's mechanical mount lug and its Value field: properties of the stock symbol the
    // page is drawn with, not of any circuit. See the two constants above.
    expect(problems.pinIdentity).toEqual([SELECTOR_PIN_DISAGREEMENT])
    expect([...problems.values].sort()).toEqual([...page.valueDisagreements].sort())
    // **THE ONLY FOOTPRINT DISAGREEMENT IS THAT THE PAGE DECLARES NONE.** copperhead and akcli
    // write no `Footprint` field at all, so every entry here must read `"<none>"`; one that names a
    // real footprint would be the page and the model disagreeing about which part is fitted, which
    // is a different and far worse claim.
    for (const problem of problems.footprints) expect(problem).toContain('footprint "<none>"')
    // Not an incidental zero: a page that declared every footprint would make the loop above vacuous,
    // and this says the loop had something to examine.
    expect(problems.footprints.length).toBeGreaterThan(0)
  })
}
