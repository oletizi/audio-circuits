### Task 3: Prove the comparator before trusting it

**Files:**
- Create: `tools/schgen-drawing-trial/compare.ts`
- Test: `tests/schgen-trial/comparator-controls.test.ts`

**Interfaces:**
- Consumes: `compareSheetToModel`, `modelForSheet`, `exportDraftedSheet`, `importNetlist`.
- Produces: `compareAttempt(board: string, netlistPath: string): { attempt: SheetAgreement; approvedBaseline: SheetAgreement }` and CLI `bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON`. The baseline is the approved page's own lists, so the known drawn-elsewhere disagreements (the MP lug, the switch `Value`) are reported beside each attempt rather than mistaken for SchGen's.

- [ ] **Step 1: Write the failing tests**, on `pultec-low-boost`'s fresh export, each mutation a helper in the test file:
  - `known equal`: `compareAttempt` on the approved export → `attempt` equals `approvedBaseline`.
  - `pin moved` → `netMembership` non-empty.
  - `two nets merged` → `netMembership` non-empty.
  - `net renamed` → `netMembership` equals the baseline's (names do not count).
  - `pin number swapped between two pins of one part` → `pinIdentity` or `netMembership` non-empty.
  - `pin left unconnected` (removed from its net) → non-empty.
  - **Power symbols, two cases with fixed semantics.** A power symbol's net name, its `Value`, is connectivity; its library, glyph and `#PWR` designator are not.
    - `power symbol restyled`: every ground power symbol's library is changed (`copperhead_power:GND` to `power:GND`) and its `#PWR` designators renumbered, with the value still `GND`. Assert `attempt` **equals** `approvedBaseline`.
    - `power symbol renamed on one pin`: one ground pin's net is renamed to `AGND`, splitting the ground net. Assert `netMembership` is **non-empty**.
    - If the comparator gets either case wrong, fix it in `compare.ts`'s normalisation (not in `lib/`), with these two tests as the proof, and say so in the commit.
  - `nothing adjusted`: `compareAttempt`'s `attempt` lists equal a direct `compareSheetToModel` call on the same export. The baseline is reported beside them and never subtracted from them.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/comparator-controls.test.ts` → FAIL.
- [ ] **Step 3: Implement** `compare.ts`.
- [ ] **Step 4: Run** the same → all pass.
- [ ] **Step 5: Commit.**

