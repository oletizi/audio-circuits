/**
 * `boards/pultec-hi-boost/` declares the agent-drafted page in
 * `drafted/pultec/pultec-hi-boost/` as its `"sch"`, so `make/board.mk`'s `netlist-agrees` demands
 * this file by name: *"Add tests there asserting the circuit still agrees with the schematic
 * export - that guard is what this declaration exists for."*
 *
 * `./drafted-sheet.ts` holds the body, and says why the comparison is
 * `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel` rather than `./kicad-round-trip.ts`'s
 * `expectSameCircuit`.
 *
 * **SEVEN OF THIS BOARD'S PARTS DECLARE NO FOOTPRINT IN THE MODEL EITHER** - the four tapped coil
 * sections, both pots and the selector - so `compareSheetToModel` reports them as
 * `footprintsUndeclared` rather than as agreement. The shared body deliberately asserts nothing
 * about that list: a part the model declares no footprint for has nothing to compare, and
 * reporting it as a pass is the exact reading that comparison keeps separate for that reason.
 */
import {
  registerDraftedPageTests,
  SELECTOR_PIN_DISAGREEMENT,
  SELECTOR_VALUE_DISAGREEMENT,
} from "./drafted-sheet.ts"

registerDraftedPageTests({
  board: "pultec-hi-boost",
  circuit: "pultec",
  netlist: "tests/fixtures/pultec-hi-boost.net",
  pinDisagreements: [SELECTOR_PIN_DISAGREEMENT],
  valueDisagreements: [SELECTOR_VALUE_DISAGREEMENT],
})
