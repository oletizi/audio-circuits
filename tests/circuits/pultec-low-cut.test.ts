/**
 * `boards/pultec-low-cut/` declares the agent-drafted page in
 * `drafted/pultec/pultec-low-cut/` as its `"sch"`, so `make/board.mk`'s `netlist-agrees` demands
 * this file by name: *"Add tests there asserting the circuit still agrees with the schematic
 * export - that guard is what this declaration exists for."*
 *
 * `./drafted-sheet.ts` holds the body, and says why the comparison is
 * `lib/schgen/gates/round-trip.ts` rather than `./kicad-round-trip.ts`'s `expectSameCircuit`.
 */
import { registerDraftedPageTests, SELECTOR_VALUE_DISAGREEMENT } from "./drafted-sheet.ts"

registerDraftedPageTests({
  board: "pultec-low-cut",
  circuit: "pultec",
  netlist: "tests/fixtures/pultec-low-cut.net",
  valueDisagreements: [SELECTOR_VALUE_DISAGREEMENT],
})
