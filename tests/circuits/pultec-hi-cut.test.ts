/**
 * `boards/pultec-hi-cut/` declares the agent-drafted page in
 * `drafted/pultec/pultec-hi-cut/` as its `"sch"`, so `make/board.mk`'s `netlist-agrees` demands
 * this file by name: *"Add tests there asserting the circuit still agrees with the schematic
 * export - that guard is what this declaration exists for."*
 *
 * `./drafted-sheet.ts` holds the body, and says why the comparison is
 * `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel` rather than `./kicad-round-trip.ts`'s
 * `expectSameCircuit`.
 */
import {
  registerDraftedPageTests,
  SELECTOR_PIN_DISAGREEMENT,
  SELECTOR_VALUE_DISAGREEMENT,
} from "./drafted-sheet.ts"

registerDraftedPageTests({
  board: "pultec-hi-cut",
  circuit: "pultec",
  netlist: "tests/fixtures/pultec-hi-cut.net",
  pinDisagreements: [SELECTOR_PIN_DISAGREEMENT],
  valueDisagreements: [SELECTOR_VALUE_DISAGREEMENT],
})
