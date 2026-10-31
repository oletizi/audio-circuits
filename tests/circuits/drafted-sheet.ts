/**
 * **THE GUARD BEHIND A BOARD THAT DECLARES AN AGENT-DRAFTED PAGE AS ITS `"sch"`.**
 *
 * `make/board.mk`'s `netlist-agrees` demands a `tests/circuits/<board>.test.ts` from every board
 * declaring an `"sch"`/`"netlist"` pair, and says what it is for: *"Add tests there asserting the
 * circuit still agrees with the schematic export - that guard is what this declaration exists
 * for."* This module is what the four Pultec section boards' files share.
 *
 * **IT IS NOT `expectSameCircuit`, AND THAT IS NOT A SHORTCUT.** `./committed-schematic.ts`'s
 * `expectSameCircuit` compares a
 * KiCad export against `toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS, ...)` - the VEROROUTE
 * lowering, in which an off-board part's footprint is the string `PADS<n>` and its pins are
 * numbered by `PAD_ORDER` index. A Pultec section board has four to seven off-board parts, so that
 * comparison would report a disagreement on every one of them about a vocabulary neither side is
 * wrong in. What compares a drawing against a model is `lib/kicad/sheet-agreement.ts`'s
 * `compareSheetToModel`, whose six separately-reported comparisons were written for exactly this,
 * and that is what this module runs.
 *
 * **IT RAN `lib/schgen/gates/round-trip.ts` UNTIL THE SWITCH, and the two were MEASURED to agree
 * before the switch was made** - element for element, in order, on all six lists, on all five
 * approved pages. That measurement was `./guard-equivalence.test.ts`, which existed only while
 * both implementations did and was deleted with the generator; it is in git at `f6a4d40^..`.
 * `roundTrip` needed the schematic generator's whole front half to build a model to compare
 * against; `compareSheetToModel` takes a `Network`, a designator map and a pin-number map, which
 * is what `./sheet-model.ts` hands it without the generator.
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
 * **AND IT DOES NOT DRAW ANYTHING.** The generator's `generateReported` would have laid the
 * circuit out with ELK and rendered it, which was several seconds a board and coupled this guard
 * to every file under `lib/schgen/render/`. A model, its designators and its pin numbers are all
 * that comparing a model with a netlist needs, and none of the three is geometry - so
 * `./sheet-model.ts` builds exactly those three and nothing else.
 */
import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist, KICAD_CLI, type ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { modelForSheet } from "./sheet-model.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
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

/**
 * Exports `board`'s drafted sheet with the real `kicad-cli`, right now, and imports the result.
 *
 * **THIS IS THE PROOF `./kicad-round-trip.ts`'s `kicadRoundTrip` GAVE THE STUB WRITER, MOVED ONTO
 * THE APPROVED PAGE.** `registerDraftedPageTests`'s other guards compare the model against the
 * committed `.net` fixture, and `./sheet-model.ts`'s own module doc says why deliberately: that
 * fixture is reconciled by `make netlist-agrees` outside `bun test`, so a stale fixture passes a
 * `bun test`-only run. This function is what lets a test invoke `kicad-cli` on the committed sheet
 * itself, inside `bun test`, so the claim "KiCad reads this sheet the way the circuit means it" has
 * a check that runs there too - the same claim `kicadRoundTrip` made about generated stub output,
 * for the one subject this repository actually ships.
 *
 * **FAILS RATHER THAN SKIPS WHEN `kicad-cli` IS ABSENT**, in the words `kicadRoundTrip` used
 * before it was deleted with the stub writer, and for the same reason: a missing binary here would
 * make this the only one of this repository's kicad-cli proofs that silently passed without ever
 * running it. `./committed-schematic.ts`'s `exportCommittedSheet` is the live sibling refusal.
 */
export function exportDraftedSheet(circuit: string, board: string): ImportedNetlist {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This test ` +
        "does not skip: it is the only proof KiCad reads the drafted sheet the way the circuit means it.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-drafted-export-`))
  try {
    const net = path.join(dir, `${board}.net`)
    defaultRunExport(KICAD_CLI, draftedSheet(circuit, board), net, moduleRepoRoot())
    return importNetlist(fs.readFileSync(net, "utf8"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/**
 * The sheet digest the `RECORD.md` in `dir` records as the binding.
 *
 * **IT IS PARSED OUT OF THE RECORD RATHER THAN WRITTEN HERE**, because a hash copied into a test
 * file is a second place for one fact to be wrong, and the record beside the drawing is where §3
 * puts it. Throws naming the file when the row is absent or ambiguous: a record whose digest cannot
 * be read is not a record that passes.
 *
 * **IT TAKES A DIRECTORY RATHER THAN A `(circuit, board)` PAIR SO THAT ITS CONTROL CAN DRIVE THE
 * FAULT IT GUARDS.** The fault is this function answering with the digest of the SHEET instead of
 * the digest the record binds, which makes the equality in `registerDraftedPageTests` self-fulfilling.
 * Nothing can perturb a record under `drafted/` - those bytes are frozen and a standing gate is
 * that a diff over them is empty - so the control builds a stand-in directory holding a copy of
 * the real sheet beside a record whose BINDING row names a DIFFERENT digest, and asserts the answer
 * tracks the record. A directory argument is what lets it point this function at that stand-in.
 */
export function sheetDigestInRecord(dir: string): string {
  const file = path.join(dir, "RECORD.md")
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

/** The sheet digest `drafted/<circuit>/<board>/RECORD.md` records as the binding. */
export function recordedSheetDigest(circuit: string, board: string): string {
  return sheetDigestInRecord(draftedDir(circuit, board))
}

/**
 * A stand-in `drafted/` directory: `board`'s real sheet, beside its real record with the BINDING
 * digest replaced by `digest`.
 *
 * **IT EXISTS SO THE DIGEST CONTROL CAN PERTURB THE RECORD WITHOUT TOUCHING `drafted/`.** The
 * committed records are frozen - a verdict is bound to bytes - and this plan's standing gate is
 * that `git diff -- drafted/` is empty, so a control that edited one in place and restored it
 * would be one failed assertion away from defeating that gate.
 */
function standInRecord(circuit: string, board: string, digest: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-record-control-`))
  const sheet = draftedSheet(circuit, board)
  fs.copyFileSync(sheet, path.join(dir, path.basename(sheet)))
  const real = path.join(draftedDir(circuit, board), "RECORD.md")
  const text = fs.readFileSync(real, "utf8")
  const rewritten = text.replace(
    /(sha256 of the sheet - THE BINDING\*\* \| `)[0-9a-f]{64}(` \|)/,
    `$1${digest}$2`,
  )
  if (rewritten === text) {
    throw new Error(
      `${real}: the BINDING row's digest was not replaced, so the stand-in record is a copy of ` +
        "the real one and the control below would pass whatever this function answered. The row's " +
        "shape changed; re-derive the substitution from sheetDigestInRecord's own regex.",
    )
  }
  fs.writeFileSync(path.join(dir, "RECORD.md"), rewritten)
  return dir
}

/** The board's committed netlist export, imported. */
export function committedNetlist(netlist: string): ImportedNetlist {
  return importNetlist(fs.readFileSync(path.join(moduleRepoRoot(), netlist), "utf8"))
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
 * The two disagreements the four SIX-WAY-SELECTOR Pultec pages carry, in the exact words
 * `compareSheetToModel` reports them, because they are properties of how those sheets were drawn
 * rather than of any circuit.
 *
 * `SW1` is drawn with the `SW_Rotary_1x6_MP` stock symbol, which carries a mechanical mount lug the
 * model does not - *"a mounting pin `MP`, which is a mechanical pad and is on no net in the
 * model"* (`circuits/pultec/physical/parts.ts`'s `POLE_PIN`), the same fact `docs/known-gaps.md`
 * **G282** records - and its `Value` field holds that symbol's name where the model holds the
 * model's own value. Asserted EXACTLY rather than tolerated loosely: a second entry appearing in
 * either list is a new disagreement and must fail.
 *
 * **THIS SAID "EVERY DRAFTED PULTEC PAGE" UNTIL `pultec-mid` REFUTED IT, and the wording is
 * corrected rather than widened.** The mid page is drawn with `Switch:SW_Rotary_1x12`, which has no
 * `_MP` variant and therefore no mount lug, and its unused twelfth contact is declared
 * not-connected through `./sheet-model.ts`'s pin-number map rather than left to disagree. So
 * that page's `pinIdentity` is EMPTY, which is why the pin list below is per-board
 * (`DraftedPageUnderTest.pinDisagreements`) and not a constant the shared body asserts for
 * everyone. A shared body that hard-codes one board's symbol choice is a check that passes for the
 * wrong reason the first time a page is drawn with a different symbol.
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
   * Every `pinIdentity` disagreement this page carries, in `compareSheetToModel`'s own words.
   *
   * **PER-BOARD BECAUSE IT IS A FACT ABOUT WHICH SYMBOL THE PAGE WAS DRAWN WITH**, and the five
   * Pultec pages are not drawn with the same selector: four carry `SW_Rotary_1x6_MP`'s mechanical
   * mount lug and report `SELECTOR_PIN_DISAGREEMENT`, while `pultec-mid`'s `SW_Rotary_1x12` has no
   * such lug and reports NOTHING. An EMPTY list here is therefore a real claim - that this page's
   * pin numbering agrees with the model exactly - and not an absent one.
   */
  readonly pinDisagreements: readonly string[]
  /**
   * Every `values` disagreement this page carries, in `compareSheetToModel`'s own words, sorted as
   * it sorts.
   *
   * **ASSERTED EXACTLY AND NEVER AS A COUNT.** A page whose value text drifts from the model's in
   * one more place must fail here, and a list is the only form of this claim that says WHICH.
   */
  readonly valueDisagreements: readonly string[]
  /**
   * Every component of this board the MODEL declares no footprint for, by model id, in the order
   * `compareSheetToModel` returns them - which is `footprintsUndeclared`, its sixth list.
   *
   * **IT IS NOT A PASS AND IT IS NOT A FAILURE: it is the set of parts `footprints` says nothing
   * about**, because a part with no declared footprint has nothing to compare. An empty
   * `footprints` over a board where eight of thirty-nine parts declare none would otherwise read
   * as agreement while being silence, which is why `lib/kicad/sheet-agreement.ts` reports it
   * separately at all.
   *
   * **THIS LIST WAS UNASSERTED UNTIL THE GUARDS MOVED OFF `roundTrip`, AND THAT WAS THE GAP.**
   * The old comparison carried the same field and nothing here read it; the only thing that ever
   * asserted it exactly was `./guard-equivalence.test.ts`, which exists only while both
   * comparisons do and goes with the generator. A guard whose sole assertion a later change
   * removes is a lapsing guard, so the claim is written down here, beside the two lists that are
   * here for exactly this reason.
   *
   * **ASSERTED EXACTLY AND NEVER AS A COUNT**, like the two above. Every member on all five pages
   * is an off-board part - a tapped coil section, a panel pot or a selector - and the thing that
   * must fail is a component silently ACQUIRING or LOSING a footprint declaration, which moves it
   * between this list and `footprints`. A count of 7 would survive that swap; a list says which.
   */
  readonly footprintlessParts: readonly string[]
}

/**
 * The tests every board declaring a page under `drafted/` gets.
 *
 * **NOT STATED AS A COUNT.** It read "the five tests" until two of them became four - the digest
 * guard's inert control was replaced by two that drive the fault it claimed to catch - and a
 * figure in prose is a transcription with a date on it. The `test(...)` calls below are the list.
 *
 * Registered from the board's own `tests/circuits/<board>.test.ts` because `make/board.mk` looks
 * for a file at exactly that path and fails naming it when it is absent - one file per board is the
 * interface, and this is the body they share rather than four copies of it.
 */
export function registerDraftedPageTests(page: DraftedPageUnderTest): void {
  const { board, circuit, netlist } = page

  test(`${board}: the committed sheet still hashes to the digest its record binds it to`, () => {
    const computed = sha256OfFile(draftedSheet(circuit, board))
    expect(computed).toBe(recordedSheetDigest(circuit, board))
  })

  test(`${board}: the digest compared above comes out of the record and not out of the sheet - the control for the equality`, () => {
    // THE FAULT THIS DRIVES, which the line it replaced could not: a `sheetDigestInRecord` that
    // answered with the digest of the SHEET would make the equality above true of any bytes
    // whatsoever, forever. The old control asserted sha256(bytes ++ "x") != sha256(bytes), which
    // is a property of SHA-256, holds for every file in existence, and says nothing about where
    // the digest came from - the exact `expect(x).not.toBe(x + " ")` shape this plan caught once
    // already.
    const computed = sha256OfFile(draftedSheet(circuit, board))
    // A syntactically valid digest that is not this sheet's. Built here rather than written as a
    // literal nobody can check: sha256 of the four bytes "none", which no .kicad_sch can hash to.
    const other = createHash("sha256").update("none").digest("hex")
    expect(other, "the perturbation must actually change the recorded digest").not.toBe(computed)
    const stand = standInRecord(circuit, board, other)
    try {
      // The sheet in `stand` is byte-identical to the real one, so the ONLY thing that differs is
      // the record's BINDING row. The answer tracking it is what says the digest is read.
      expect(sheetDigestInRecord(stand)).toBe(other)
    } finally {
      fs.rmSync(stand, { recursive: true, force: true })
    }
  })

  test(`${board}: a record with no BINDING row refuses rather than answering - the control for the parse`, () => {
    // The other half: the row is found by a strict regex, and a record it cannot read must throw
    // naming the file rather than answer with something. Without this, a parse that silently
    // returned the first 64 hex characters it saw anywhere in the record would pass everything
    // above on four of the five pages, whose records also quote the netlist's digest.
    const stand = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-record-rowless-`))
    try {
      const real = path.join(draftedDir(circuit, board), "RECORD.md")
      const text = fs.readFileSync(real, "utf8")
      const rowless = text.split("\n").filter((line) => !line.includes("THE BINDING")).join("\n")
      expect(rowless, "the record has no BINDING row to remove").not.toBe(text)
      fs.writeFileSync(path.join(stand, "RECORD.md"), rowless)
      expect(() => sheetDigestInRecord(stand)).toThrow(/THE BINDING/)
    } finally {
      fs.rmSync(stand, { recursive: true, force: true })
    }
  })

  test(`${board}: the committed netlist was exported from the drafted sheet and no other file`, () => {
    const text = fs.readFileSync(path.join(moduleRepoRoot(), netlist), "utf8")
    const expected = `drafted/${circuit}/${board}/${board}${DRAFTED_SUFFIX}.kicad_sch`
    expect(text).toContain(`(source "${expected}")`)
  })

  test(`${board}: every component and every net agrees between the drafted page and the model`, () => {
    const model = modelForSheet(board)
    const problems = compareSheetToModel(model.network, model.designators, model.pinNumbers, committedNetlist(netlist))
    expect(problems.componentIdentity).toEqual([])
    expect(problems.netMembership).toEqual([])
  })

  test(`${board}: moving one pin between two nets is reported - the control for the zero above`, () => {
    const model = modelForSheet(board)
    const mutated = withOnePinMoved(committedNetlist(netlist))
    expect(compareSheetToModel(model.network, model.designators, model.pinNumbers, mutated).netMembership).not.toEqual([])
  })

  test(`${board}: the page's known disagreements with the model are exactly the drawn-elsewhere ones`, () => {
    const model = modelForSheet(board)
    const problems = compareSheetToModel(model.network, model.designators, model.pinNumbers, committedNetlist(netlist))
    // The selector's mechanical mount lug and its Value field: properties of the stock symbol the
    // page is drawn with, not of any circuit. See the two constants above - and note that the lug
    // is NOT universal, which is why this list comes from the board rather than from a constant.
    expect([...problems.pinIdentity].sort()).toEqual([...page.pinDisagreements].sort())
    expect([...problems.values].sort()).toEqual([...page.valueDisagreements].sort())
    // **THE ONLY FOOTPRINT DISAGREEMENT IS THAT THE PAGE DECLARES NONE.** copperhead and akcli
    // write no `Footprint` field at all, so every entry here must read `"<none>"`; one that names a
    // real footprint would be the page and the model disagreeing about which part is fitted, which
    // is a different and far worse claim.
    for (const problem of problems.footprints) expect(problem).toContain('footprint "<none>"')
    // Not an incidental zero: a page that declared every footprint would make the loop above vacuous,
    // and this says the loop had something to examine.
    expect(problems.footprints.length).toBeGreaterThan(0)
    // **AND THE PARTS THE LOOP ABOVE SAYS NOTHING ABOUT, NAMED.** `footprints` compares only the
    // parts whose model declares a footprint, so without this the two assertions above are silent
    // about every panel control, selector and tapped coil on the page. Compared UNSORTED because
    // `compareSheetToModel` sorts this list itself, and the board's own entry is written in that
    // order. A component moving between this list and `footprints` - acquiring or losing a
    // footprint declaration - must fail here, which is why it is a list and not a count.
    expect(problems.footprintsUndeclared).toEqual([...page.footprintlessParts])
  })
}
