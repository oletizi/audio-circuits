/**
 * `boards/pultec-low-boost/` declares the agent-drafted page in
 * `drafted/pultec/pultec-low-boost/` as its `"sch"`, so `make/board.mk`'s `netlist-agrees` demands
 * this file by name: *"Add tests there asserting the circuit still agrees with the schematic
 * export - that guard is what this declaration exists for."*
 *
 * `./drafted-sheet.ts` holds the body, and says why the comparison is
 * `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel` rather than `./kicad-round-trip.ts`'s
 * `expectSameCircuit`.
 *
 * **THIS PAGE CARRIES THE ONE DECLARED PIN SWAP OF THE FIVE.** `R2` is drawn with its output end
 * on the right, which the by-kind rule does not derive, so `./sheet-model.ts`'s
 * `DECLARED_PIN_NUMBERS` names it - with the owner's observation that earned it.
 *
 * **THIS PAGE CARRIES SEVEN VALUE DISAGREEMENTS AND THE OTHER THREE PULTEC PAGES CARRY ONE**, which
 * is the one thing worth stating here rather than in the shared module. Six capacitor values and
 * `SI3`'s were written with a LEADING ZERO during the page's field-restating pass - `0.33uF` where
 * the model writes `.33uF`. Same capacitance, different string, and the comparison is over strings
 * because a correct topology with a wrong capacitor is a correct netlist. Recorded rather than
 * normalised away on either side: which spelling the model should carry is not this guard's
 * decision to make.
 */
import { registerDraftedPageTests, SELECTOR_PIN_DISAGREEMENT } from "./drafted-sheet.ts"

registerDraftedPageTests({
  board: "pultec-low-boost",
  circuit: "pultec",
  netlist: "tests/fixtures/pultec-low-boost.net",
  pinDisagreements: [SELECTOR_PIN_DISAGREEMENT],
  valueDisagreements: [
    'C1: the schematic says "0.33uF" and the model says ".33uF"',
    'C2: the schematic says "0.22uF" and the model says ".22uF"',
    'C3: the schematic says "0.12uF" and the model says ".12uF"',
    'C4: the schematic says "0.068uF" and the model says ".068uF"',
    'C5: the schematic says "0.047uF" and the model says ".047uF"',
    'C6: the schematic says "0.033uF" and the model says ".033uF"',
    'SI3: the schematic says "0.047uF" and the model says ".047uF"',
    'SW1: the schematic says "6-way selector" and the model says "SW_Rotary_1x6_MP"',
  ],
  // The boost pot and the selector - this board's two off-board parts and nothing else.
  footprintlessParts: ["RV_LO_BOOST", "SW_LO_BOOST"],
})
