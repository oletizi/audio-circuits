### Task 4: The interface checker (G4, CONTRACT-MODEL-CHECK)

**Files:**
- Create: `circuits/h7-platform/contract.ts`, which loads and types `module-interface.json`
- Create: `circuits/h7-platform/interface-check.ts`
- Test: `tests/circuits/h7-interface-check.test.ts`

**Interfaces:**
- Produces, in `contract.ts`:
  - `loadContract(): InterfaceContract`, where `InterfaceContract` holds `status: "draft" | "frozen"` and `pins: readonly ContractPin[]`;
  - `ContractPin` is `{ pin: number; category: string; signal: string | null; direction: string; failsafeRequired: boolean }`;
  - `socketPadFor(pin: number): { part: "J_MOD_A" | "J_MOD_B"; pad: number }`. Contract pin n maps to J_MOD_A pad n for n ≤ 20, and to J_MOD_B pad n − 20 for n ≥ 21 (`architecture.md` §4.2).

  The loader refuses a file without exactly 40 pins, or with a pin number missing or repeated.
- Produces, in `interface-check.ts`:
  - `checkInterface(network: Network, board: "carrier" | "module" | "pedal", sockets: { J_MOD_A: string; J_MOD_B: string }): InterfaceReport`, where `sockets` gives the component ids;
  - `InterfaceReport` is `{ mismatches: readonly string[]; protectionUnchecked: readonly number[] }`.
- Semantics:
  - **Signal pins.** For every pin whose `signal` is not null, the net on the socket pad must be named exactly `signal`.
  - **Reserved pins (`category === "reservedCompatibility"`) on `module` and `pedal`.** The pad is `nc`.
  - **Reserved pins on `carrier`.** The pad's net is named `RESERVED_<pin>` and holds exactly two members, the socket pad and one breakout terminal (spec, G4 exception).
  - **Failsafe pins.** Every pin with `failsafeRequired === true` is listed in `protectionUnchecked`, because the model has no part-role field yet. The test asserts that list exactly, so the gap is visible and never silent.

- [ ] **Step 1: Write the failing tests**, each against a small hand-built `Network` fixture inside the test file:
  - `"a board whose socket nets equal the contract passes"`: `mismatches` is `[]`.
  - `"a signal net misnamed on one pad is reported"`, with pin 8 named `RELAY` instead of `RELAY_EN`: `mismatches` names pin 8, `J_MOD_A` pad 8, the expected and the found name.
  - `"contract pin 21 on J_MOD_A pad 1 is reported"` (Review Focus 4).
  - `"a reserved pin connected on the pedal is reported"`.
  - `"a carrier reserved pin with one breakout terminal passes"`.
  - `"a carrier reserved pin reaching a second part is reported"` (Review Focus 5).
  - `"protectionUnchecked lists exactly the contract's failsafe pins"`: the expected array is computed from the JSON in the test's own code, not hard-coded from memory, and the test also asserts it is non-empty.
  - `"the loader refuses a 39-pin contract"`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/circuits/h7-interface-check.test.ts`. Expected: they fail on the missing modules.
- [ ] **Step 3: Implement `contract.ts` and `interface-check.ts`** with the signatures above.
- [ ] **Step 4: Verify.** Run `bun test tests/circuits/h7-interface-check.test.ts` and `bun run typecheck`: all pass.
- [ ] **Step 5: Update `docs/h7-platform/open-items.md` row CONTRACT-MODEL-CHECK.** It stays open until all three boards pass, so cite this test as the check and record that the failsafe-protection half is not yet checked. Run the port verifier (17 PASS, with the Task 3 disclosure). Commit and push.

