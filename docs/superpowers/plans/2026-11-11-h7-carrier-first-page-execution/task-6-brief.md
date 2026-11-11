### Task 6: The drafted-page test helpers learn a board that is not Pultec

The helpers Task 7 binds the page with were written for the five Pultec boards and assume them:
- `modelForSheet` (`tests/circuits/sheet-model.ts`) has a closed board table and derives designators and pin numbers by Pultec rules. Today `modelForSheet("h7-carrier")` refuses with "no drafted-page model is declared".
- `drafted-kicad-round-trip.test.ts` hard-codes `CIRCUIT = "pultec"`.
- `registerDraftedPageTests` (`tests/circuits/drafted-sheet.ts`) asserts `problems.footprints.length > 0`. That is right for the Pultec pages, whose models declare footprints, and wrong for a model that declares none.

**Files:**
- Modify: `tests/circuits/sheet-model.ts`
- Modify: `tests/circuits/drafted-sheet.ts` (`DraftedPage`, `registerDraftedPageTests`)
- Modify: `tests/circuits/drafted-kicad-round-trip.test.ts`
- Test: `tests/circuits/sheet-model.test.ts` (create it if absent)

**Interfaces:**
- Produces: `modelForSheet` keeps its refusal for an undeclared board and its manifest cross-check. Its board table gains a second entry form, for a board whose module supplies its own mapping: `{ board, module, exportName, build, designators, pinNumbers }`. For the carrier these are `DESIGNATORS` and a per-component pin-number map built from `PIN_NUMBERS` (Task 5). The Pultec entries and the Pultec derivation are unchanged.
- Produces: `DraftedPage` gains `footprintComparisons: "some" | "none"`. With `"some"`, the existing assertion `problems.footprints.length > 0` runs unchanged. With `"none"`, the helper asserts `problems.footprints` is `[]`, and that `footprintlessParts` lists every component in the model, so a part that later acquires a footprint fails the test. The five Pultec boards declare `"some"`. No footprint is invented for the carrier.
- Produces: the round-trip test's `BOARDS` entries each carry `circuit`. The five Pultec entries carry `"pultec"`. The `CIRCUIT` constant is deleted.
- Produces: in the round-trip test, every board additionally asserts that the **fresh** export has `componentIdentity` and `netMembership` both `[]`, in addition to the existing equality with the fixture. Equality with the fixture alone would pass a page and fixture that are wrong together.

- [ ] **Step 1: Write the failing tests** in `tests/circuits/sheet-model.test.ts`:
  - `"the carrier's sheet model uses the carrier's own designators"`: `modelForSheet("h7-carrier").designators` equals `DESIGNATORS`.
  - `"the carrier's sheet model uses the carrier's own pin numbers"`: for each component, its entry in `modelForSheet("h7-carrier").pinNumbers` equals what `PIN_NUMBERS` gives for that component.
  - `"an undeclared board still refuses"`: `modelForSheet("no-such-board")` throws `/no drafted-page model is declared/`.
- [ ] **Step 2: Run them and confirm they fail.** Expected: the two carrier tests fail with the refusal quoted above.
- [ ] **Step 3: Implement** the three changes under Interfaces.
- [ ] **Step 4: Verify the Pultec boards are untouched.** Run `bun test tests/circuits/` and `bun run typecheck`. Every Pultec page test and round-trip test passes exactly as before, now with the added fresh-export zero assertions.
- [ ] **Step 5: Commit and push.**

