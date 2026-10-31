/**
 * **THE ONLY PROOF THAT KICAD READS AN APPROVED `drafted/` PAGE THE WAY THE CIRCUIT MEANS IT,
 * RUNNING INSIDE `bun test`.**
 *
 * `tests/circuits/kicad-round-trip.ts`'s `kicadRoundTrip` was this proof for `lib/kicad/schematic.ts`'s
 * stub writer: write the stub, export it with the real `kicad-cli`, and compare the export against
 * the circuit. The stub writer is being deleted - its own module comment records what it emits as a
 * known failure mode - and once the schematic generator goes with it, the stub writer would become
 * the repository's only model-to-schematic writer, carrying that proof for output nobody ships. This
 * file moves the proof onto the five sheets this repository actually ships: the approved pages under
 * `drafted/pultec/`.
 *
 * **WHY THIS IS NOT THE SAME CHECK `registerDraftedPageTests` ALREADY RUNS, in `./drafted-sheet.ts`.**
 * Those five guards per board compare the model against the COMMITTED `.net` FIXTURE, and
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
 * per board, by `registerDraftedPageTests`'s fifth test (`tests/circuits/pultec-hi-boost.test.ts` and
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
 * The five boards with an approved page under `drafted/pultec/`, and the committed netlist fixture
 * each board's own `tests/circuits/<board>.test.ts` declares. Written down again rather than
 * imported from those five files: each is a `registerDraftedPageTests` CALL, not an exported table,
 * and the pair (board, netlist path) is the one fact of theirs this file needs.
 */
const BOARDS: ReadonlyArray<{ readonly board: string; readonly netlist: string }> = [
  { board: "pultec-hi-boost", netlist: "tests/fixtures/pultec-hi-boost.net" },
  { board: "pultec-hi-cut", netlist: "tests/fixtures/pultec-hi-cut.net" },
  { board: "pultec-low-boost", netlist: "tests/fixtures/pultec-low-boost.net" },
  { board: "pultec-low-cut", netlist: "tests/fixtures/pultec-low-cut.net" },
  { board: "pultec-mid", netlist: "tests/fixtures/pultec-mid.net" },
]

const CIRCUIT = "pultec"

for (const { board, netlist } of BOARDS) {
  test(`${board}: kicad-cli's export of the drafted sheet, right now, agrees with the model exactly as the committed fixture does`, () => {
    const model = modelForSheet(board)
    const fresh = exportDraftedSheet(CIRCUIT, board)
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
  })

  test(`${board}: moving one pin in the fresh export is reported - the control for the equality above`, () => {
    const model = modelForSheet(board)
    const fresh = exportDraftedSheet(CIRCUIT, board)
    const mutated = withOnePinMoved(fresh)
    const problems = compareSheetToModel(model.network, model.designators, model.pinNumbers, mutated)
    // An equality assertion between two comparisons is the same shape whether they agreed or
    // whether neither one looked. Moving one pin in the freshly exported netlist must make
    // netMembership non-empty; if it does not, the equality above means nothing.
    expect(problems.netMembership).not.toEqual([])
  })
}
