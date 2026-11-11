### Spec Compliance

- ✅ Spec compliant. Every brief item is in the diff.
  - Second entry form `OwnMappingBoard` (sheet-model.ts), with the carrier entry taking `DESIGNATORS` and a `PIN_NUMBERS`-built map.
  - `footprintComparisons` is required on `DraftedPageUnderTest`. The five Pultec test files declare `"some"`, as ruling P3 allows.
  - The `"none"` branch asserts `footprints` is `[]` and `footprintlessParts` equals every component id.
  - `CIRCUIT` is deleted and each `BOARDS` entry carries `circuit`.
  - The fresh export is asserted `[]` on `componentIdentity` and `netMembership` in addition to fixture equality. The moved-pin control is kept.
  - The three named tests exist, and the undeclared-board refusal is unchanged.
  - The Record-to-Map adaptation (the DESIGNATORS ruling) and P2 are met. A pin the table cannot number throws and is named by `pinNumberFor` (lib/kicad/from-network.ts:69-79).
- Deviation, accepted: `pinNumbers` is `(network) => Map`, not a precomputed map. A refusal surfaces in the test that asks, not at import time, so a carrier refusal cannot break the Pultec tests. The `SheetModel` consumers still receive a plain map.
- ⚠️ The carrier is not yet in the round-trip `BOARDS`, and no carrier `registerDraftedPageTests` call exists. That is Task 7 and cannot be verified here. The "zero on fresh export" requirement is in place for every board that is added.

### Strengths

- The `"none"` branch is extracted into `assertFootprintComparisons` and unit-tested without needing a page (footprint-comparisons.test.ts). Both failure directions are covered: a part gaining a footprint, and `"some"` with an empty list.
- The helper mutates nothing and uses no casts. The union is discriminated with `"designators" in entry` (sheet-model.ts, new `modelForSheet` body).
- The Pultec assertions moved verbatim into the helper, including the unsorted `footprintsUndeclared` comparison.
- No optional field and no default for `footprintComparisons`.

### Concern 1: the carrier entry's `pinNumbers` is a function of the network

Fine, and I agree with the implementer's reasoning. It keeps refusals lazy and keeps the `SheetModel` contract a plain map. The calling code in `modelForSheet` is clear. No change needed.

### Concern 2: `pinNumberFor` accepts a pin whose name is itself a number

The risk I checked is this: could a carrier pin with a numeric name get a number the symbol does not have, with nothing noticing?

What I checked:
- `pinNumberFor` (lib/kicad/from-network.ts:69-79) returns `PIN_NUMBERS[kind][pin]` if present. Otherwise it returns the pin name itself if it is all digits. Otherwise it throws.
- `PIN_NUMBERS` in circuits/h7-platform/carrier-board.ts:43-50 has entries only for `resistor`, `capacitor` and `connector` (connector: only the USB-C `A1..B12, SH` names).
- Pin names in the carrier model: the `ic` parts `u_usbsw`, `u_esd` and `f_vin` use pins "1".."10", "1".."6" and "1","2". The sockets, breakouts, test points and headers use "1".."20", "1" and "1","2". None of those kinds or pin sets has a table entry. They all pass through the numeric fallback as identity. Nothing in the table or in this diff asserts that the symbol or footprint pad numbered N is the model's pin N.

Answer: yes. The risk is real in principle but not a defect of this task.
- Within this task's tests, nothing would notice. The carrier pin-number test (sheet-model.test.ts:340-347) recomputes its expectation with the same `pinNumberFor`, so it is tautological. It proves wiring, not correctness.
- It would be noticed downstream by `compareSheetToModel`'s `pinIdentity` list against the real export. For the five Pultec boards that list is asserted exactly via `pinDisagreements`.
- This is also the same behaviour the lowering already uses (from-network.ts:192). It is consistent, not a new hole. Here the model's pin names were written as the pad numbers on purpose (carrier-board.ts:107-124, :146-160).

Severity: Minor for Task 6. For Task 7 it is a requirement. The carrier's page test must assert `pinIdentity` equals its declared `pinDisagreements` exactly, and the plan should say whether the expected value is `[]`. A lax or absent `pinIdentity` assertion is the one way a wrong numeric identity would pass silently. A stricter option, left to the controller: give `ic` and the numeric-named connectors explicit `PIN_NUMBERS` entries, or have the carrier's `pinNumbers` refuse the numeric fallback. That would make P2 ("a missing entry refuses") literally true for the carrier. As built, P2 holds only for non-numeric names.

### Concern 3: sheet-model.ts is over 500 lines

The file is 566 lines. This change added about 48 (518 to 566). The file already violated the 300-500 guidance, and this change made it worse. Minor, since the added code is self-contained and splittable. See the issue below.

### Issues

#### Critical
None.

#### Important
None.

#### Minor
- tests/circuits/sheet-model.ts, around the new `OwnMappingBoard` block: the long "A STATIC TABLE, VERIFIED AGAINST boards/<board>/perfboard.json" doc comment is now detached from `const BOARDS`. The new `OwnMappingBoard` doc comment, interface and helpers were inserted between them. Move the new block above the old comment, or put it in a new file.
- tests/circuits/sheet-model.ts: `declaredBoard`'s refusal message still says "The boards with a page committed under drafted/pultec/ are [...]". With the carrier in the list, the text is now wrong about the directory. Reword it.
- tests/circuits/sheet-model.ts: `everyPin` and `pinNumbersFromTable` are generic and belong beside `pinNumberFor`, or in a small `tests/circuits/own-mapping.ts` with the `OwnMappingBoard` type. That would also fix the size concern. The `pinsOf` helper in sheet-model.test.ts:329-333 duplicates `everyPin`. Export one.
- sheet-model.test.ts:340-347 is tautological, as noted under Concern 2. Add one literal spot-check, for example `u_usbsw` pin "7" and `j_usb` pin "SH", so a wrong table is caught by a value rather than by a re-derivation.
- The `"none"` mode cannot be exercised end to end until the carrier page test exists. Task 7 must show it red when one component gains a footprint, or rely on the unit test already added.

### Assessment

**Task quality:** Approved

**Reasoning:** The helper changes satisfy the brief and the rulings, the Pultec assertions are preserved, and the new `"none"` branch is covered by direct unit tests. The numeric-pin fallback is a Task 7 obligation, not a Task 6 defect. Task 7 must assert an exact `pinIdentity` list for the carrier. The file-size and comment-placement points are cosmetic.
