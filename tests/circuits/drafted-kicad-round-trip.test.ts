/**
 * **THE ONLY PROOF THAT KICAD READS A COMMITTED `drafted/` PAGE THE WAY THE CIRCUIT MEANS IT,
 * RUNNING INSIDE `bun test`.**
 *
 * **"COMMITTED", NOT "APPROVED".** Nothing in this file behaves differently because a page has a
 * verdict - its subject is the sheet each board declares as its `"sch"`, whatever its status - and
 * a verdict is bound to the exact bytes reviewed (`EVALUATING-DRAWINGS.md` §5), with
 * `docs/schematic/verdicts.md` the only authority for one. A heading here claiming an approval
 * expresses a status this file cannot know and would go stale the next time a page is re-papered.
 *
 * `tests/circuits/kicad-round-trip.ts`'s `kicadRoundTrip` was this proof for `lib/kicad/schematic.ts`'s
 * stub writer: write the stub, export it with the real `kicad-cli`, and compare the export against
 * the circuit. The stub writer is deleted - its own module comment recorded what it emitted as a
 * known failure mode - and with the schematic generator gone too, it would have become
 * the repository's only model-to-schematic writer, carrying that proof for output nobody ships. This
 * file moves the proof onto the sheets this repository actually ships: the pages committed
 * under `drafted/` that a board declares as its `"sch"`.
 *
 * **WHY THIS IS NOT THE SAME CHECK `registerDraftedPageTests` ALREADY RUNS, in `./drafted-sheet.ts`.**
 * Those per-board guards compare the model against the COMMITTED `.net` FIXTURE, and
 * `./drafted-sheet.ts`'s module doc says why deliberately: `make netlist-agrees` re-exports and
 * reconciles that fixture by content on every `make check` run, outside `bun test`, so running
 * `kicad-cli` again inside those guards would check the same thing twice. The cost of that choice,
 * stated there too: run alone, `bun test` compares the model against whatever `.net` happens to be
 * checked in, so a stale fixture passes. **This file is where `bun test`, on its own, runs `kicad-cli`
 * on the committed sheet and proves the fixture is not stale** - it exports fresh, right now, and
 * asserts `compareSheetToModel` reports exactly the same six lists against that fresh export as it
 * does against the committed fixture.
 *
 * **IT DOES NOT ASSERT THE PER-BOARD DISAGREEMENT LISTS AGAIN.** Those are already asserted exactly,
 * per board, by `registerDraftedPageTests`'s "known disagreements with the model are exactly the
 * drawn-elsewhere ones" test (`tests/circuits/pultec-hi-boost.test.ts` and
 * its four siblings). Restating them here would duplicate what they already pin down and give a
 * second place for one fact to be wrong. What this file adds is the one thing they do not have: a
 * right-now `kicad-cli` run on the committed sheet, and the assertion that doing so changes nothing
 * about what `compareSheetToModel` reports.
 */
import { expect, test } from "bun:test"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { modelForSheet } from "./sheet-model.ts"
import { committedNetlist, exportDraftedSheet, withOnePinMoved } from "./drafted-sheet.ts"

/**
 * The boards with a page committed under `drafted/`, and the committed netlist fixture each
 * board's own `tests/circuits/<board>.test.ts` declares. Written down again rather than imported
 * from those files: each is a `registerDraftedPageTests` CALL, not an exported table,
 * and the pair (board, netlist path) is the one fact of theirs this file needs.
 */
const BOARDS: ReadonlyArray<{ readonly board: string; readonly circuit: string; readonly netlist: string }> = [
  { board: "pultec-hi-boost", circuit: "pultec", netlist: "tests/fixtures/pultec-hi-boost.net" },
  { board: "pultec-hi-cut", circuit: "pultec", netlist: "tests/fixtures/pultec-hi-cut.net" },
  { board: "pultec-low-boost", circuit: "pultec", netlist: "tests/fixtures/pultec-low-boost.net" },
  { board: "pultec-low-cut", circuit: "pultec", netlist: "tests/fixtures/pultec-low-cut.net" },
  { board: "pultec-mid", circuit: "pultec", netlist: "tests/fixtures/pultec-mid.net" },
  { board: "h7-carrier", circuit: "h7-platform", netlist: "tests/fixtures/h7-carrier.net" },
]

for (const { board, circuit, netlist } of BOARDS) {
  test(`${board}: kicad-cli's export of the drafted sheet, right now, agrees with the model exactly as the committed fixture does`, () => {
    const model = modelForSheet(board)
    const fresh = exportDraftedSheet(circuit, board)
    const fromFresh = compareSheetToModel(model.network, model.designators, model.pinNumbers, fresh)
    const fromFixture = compareSheetToModel(
      model.network,
      model.designators,
      model.pinNumbers,
      committedNetlist(netlist),
    )
    // The whole claim: exporting this sheet with kicad-cli right now reports the same six lists -
    // componentIdentity, netMembership, pinIdentity, values, footprints, footprintsUndeclared - as
    // comparing against the committed fixture does. The fixture's own exact lists are already
    // asserted by registerDraftedPageTests; this is what proves the fixture is not stale.
    expect(fromFresh).toEqual(fromFixture)
    // Equality with the fixture alone would pass a page and fixture that are wrong together, so the
    // fresh export is also asserted clean on the two lists that say the page IS the circuit.
    expect(fromFresh.componentIdentity).toEqual([])
    expect(fromFresh.netMembership).toEqual([])
  })

  test(`${board}: moving one pin in the fresh export is reported - the control for the equality above`, () => {
    const model = modelForSheet(board)
    const fresh = exportDraftedSheet(circuit, board)
    const mutated = withOnePinMoved(fresh)
    const problems = compareSheetToModel(model.network, model.designators, model.pinNumbers, mutated)
    // An equality assertion between two comparisons is the same shape whether they agreed or
    // whether neither one looked. Moving one pin in the freshly exported netlist must make
    // netMembership non-empty; if it does not, the equality above means nothing.
    expect(problems.netMembership).not.toEqual([])
  })
}
