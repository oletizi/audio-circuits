/**
 * `boards/pultec-mid/` declares the agent-drafted page in
 * `drafted/pultec/pultec-mid/` as its `"sch"`, so `make/board.mk`'s `netlist-agrees` demands
 * this file by name: *"Add tests there asserting the circuit still agrees with the schematic
 * export - that guard is what this declaration exists for."*
 *
 * `./drafted-sheet.ts` holds the body, and says why the comparison is
 * `lib/kicad/sheet-agreement.ts`'s `compareSheetToModel` rather than `./kicad-round-trip.ts`'s
 * `expectSameCircuit`.
 *
 * **THIS PAGE'S `pinIdentity` IS EMPTY WHERE THE OTHER FOUR CARRY ONE ENTRY, and that is the one
 * thing worth stating here rather than in the shared module.** The four six-way boards are drawn
 * with `Switch:SW_Rotary_1x6_MP`, whose mechanical mount lug is on no net in the model. This page
 * is drawn with `Switch:SW_Rotary_1x12`, which has **no `_MP` variant and so no lug**, and its
 * unused twelfth contact is declared not-connected through `./sheet-model.ts`'s pin-number map - a
 * number in that map that no model pin claims IS a declared no-connect - so it appears in the
 * export as the one-member net `unconnected-(SW1-Pad12)` and the comparison has nothing to report
 * about it. An empty list is asserted here as a positive claim, not omitted.
 *
 * **AND THIS BOARD HAS TWO SWITCHES, SO IT CARRIES TWO VALUE DISAGREEMENTS RATHER THAN ONE.** Both
 * `SW1` and the boost/off/cut mode switch `SW2` hold their stock symbol's name in the `Value` field
 * where the model holds the model's own value - the same class of disagreement the other four
 * carry for `SW1` alone, so neither reuses `SELECTOR_VALUE_DISAGREEMENT`, whose text names the
 * six-way symbol.
 */
import { registerDraftedPageTests } from "./drafted-sheet.ts"

registerDraftedPageTests({
  board: "pultec-mid",
  circuit: "pultec",
  netlist: "tests/fixtures/pultec-mid.net",
  pinDisagreements: [],
  valueDisagreements: [
    'SW1: the schematic says "11-way selector" and the model says "SW_Rotary_1x12"',
    'SW2: the schematic says "boost/off/cut" and the model says "SW_SPDT"',
  ],
  // The five tapped coil sections, the level pot, and BOTH switches - the eleven-position selector
  // and the boost/off/cut toggle. Every off-board part of this board and nothing else; it is eight
  // where the two cut boards are two because mid's own section carries the inductor bank.
  footprintlessParts: [
    "L_MID_0R1H",
    "L_MID_0R22H",
    "L_MID_0R45H",
    "L_MID_1H",
    "L_MID_2H",
    "RV_MID",
    "SW_MID",
    "SW_MID_MODE",
  ],
})
