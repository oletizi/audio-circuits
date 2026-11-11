Task 6 report

RED: `bun test tests/circuits/sheet-model.test.ts tests/circuits/footprint-comparisons.test.ts`
- the carrier pin-number test failed with 'no drafted-page model is declared for the board "h7-carrier"'
- footprint-comparisons.test.ts failed: Export named 'assertFootprintComparisons' not found
- 1 pass 3 fail 1 error

GREEN (after implementing):
- same command: 6 pass, 0 fail, 48 expect() calls
- `bun run typecheck`: clean
- `bun test tests/circuits/`: 229 pass, 0 fail, 26 files (includes the five Pultec page tests and the round-trip test with the new fresh-export zero assertions on componentIdentity and netMembership; they passed unchanged)

Changes
- tests/circuits/sheet-model.ts: second entry form `OwnMappingBoard` (board, module, exportName, build, designators, pinNumbers). The carrier entry takes DESIGNATORS (Record adapted into a ReadonlyMap) and builds pin numbers from PIN_NUMBERS via `pinNumberFor` (the lower-level function from lib/kicad/from-network.ts, which refuses and names a pin with no entry and is not itself numeric). Deviation: `pinNumbers` on the entry is a function of the network, not a precomputed map, so a refusal surfaces in the test that asks and not at import (which would break the Pultec tests). Pultec entries and derivation unchanged.
- tests/circuits/drafted-sheet.ts: `DraftedPageUnderTest` (the brief's `DraftedPage`) gains required `footprintComparisons: "some" | "none"`. The footprint assertions moved into exported `assertFootprintComparisons(mode, problems, footprintlessParts, componentIds)`.
- Pultec five test files: `footprintComparisons: "some"` added (ruling P3).
- tests/circuits/drafted-kicad-round-trip.test.ts: BOARDS entries carry `circuit`; CIRCUIT constant deleted; fresh export asserted zero on componentIdentity and netMembership.
- tests/circuits/sheet-model.test.ts (the three brief-named tests) and tests/circuits/footprint-comparisons.test.ts (new): the "none" branch is unit-tested without a page, through `assertFootprintComparisons` (passes when footprints is empty and footprintlessParts equals every component; fails when a part acquires a footprint; "some" fails on empty footprints).

Concerns
- sheet-model.ts is now over 500 lines (it was 518 before; pre-existing, grew slightly).
- The brief's `pinNumbers` field is a function here (see deviation above).

Fix round (review items)
- BOARDS doc comment restored directly above BOARDS; declaredBoard refusal now lists declared boards neutrally (no drafted/pultec path).
- OwnMappingBoard, everyPin, pinNumbersFromTable moved to tests/circuits/own-mapping-board.ts; sheet-model.ts 532 lines (was 566); test imports everyPin.
- Literal spot-checks added: u_usbsw pin 7 -> 7 (h7-platform.kicad_sym, D-), j_usb pin SH -> SH (KiCad Connector.kicad_sym, SHIELD).
- bun test sheet-model, footprint-comparisons, drafted-kicad-round-trip: 16 pass 0 fail. bun run typecheck clean. bun test tests/circuits/: 229 pass 0 fail.
