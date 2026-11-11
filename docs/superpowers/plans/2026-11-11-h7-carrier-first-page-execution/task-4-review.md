### Spec Compliance

- ✅ Spec compliant. Every brief item has a matching hunk: `loadContract`, `socketPadFor`, `checkInterface`, `InterfaceReport`, the 40-pin, missing-pin and repeated-pin refusals, the open-items row, and all eight named tests. The report's RED/GREEN, typecheck and verifier figures are its own and I did not re-run them.
- Review Focus 4 (the pin 21 / J_MOD_A pad 1 swap): `contract.ts:98-103` maps pin n to the right socket and pad. `interface-check.ts:177-184` compares each pad only against its own pin's signal. The test at `h7-interface-check.test.ts:301-307` asserts mismatches on both J_MOD_A pad 1 and J_MOD_B pad 1.
- Review Focus 5 (a reserved carrier pin reaching a second part): `interface-check.ts:196-204` requires exactly the net name `RESERVED_<pin>` and exactly 2 members. Test `:324-333` shows a third member fails with "exactly 2 members", and `:320` shows one breakout terminal passes.
- G4 exception: on module and pedal, any connection to a reserved pin fails (`interface-check.ts:192-195`). On the carrier, a reserved pin left nc also fails (test `:335`).
- "Refusals teach" and "a skipped check must never look like a passing one": a missing socket component throws (`:147-151`). A contract category with no signal reports a mismatch rather than being skipped (`:187-190`). A signal pin whose pad is absent is a mismatch. `protectionUnchecked` is returned rather than dropped.
- ⚠️ Cannot verify from the diff: that the real `module-interface.json` has no pin that is neither a signal pin nor a reserved pin. The all-pass test at `:286` implies none, because such a pin would produce a mismatch and the test would fail.

### Strengths

- Pin names in `ContractPin` match the JSON exactly, so the loader needs no mapping layer. The parser validates every field's type and refuses a bad status.
- Error messages say what was found and what was expected, with the contract pin, socket and pad all named.
- The tests build `Network` literals directly and use no `as` casts or `any`. The only `as const` is a const assertion, not a type cast. `protectionUnchecked` is checked against an independent re-parse of the JSON, plus a non-empty assertion.
- The module comment states the model conventions and the protection-role gap openly.
- Files are small (84 and 104 lines).
- The open-items row keeps CONTRACT-MODEL-CHECK open and says plainly that the protection half is unchecked.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- `interface-check.ts:191,316-318`: a reserved pad the socket does not list is accepted as nc, and a test enshrines it. This is stated and consistent with G4 ("no connection"). On module and pedal, though, a socket model missing a whole pad passes silently, so a truncated socket symbol could go unnoticed. Consider whether the socket's pad count (20 each) should be checked. The checker never flags a pad outside 1..20, for example a "21" on J_MOD_A, which would be an extra connection to a pad the contract does not have.
- `interface-check.ts:201-204`: "one breakout terminal" cannot be distinguished from any other single-pin second member, such as a resistor lead. The check is "exactly 2 members", which is what the brief mandates. It is worth a comment that the terminal's role is unchecked, as with protection.
- `docs/h7-platform/open-items.md` CONTRACT-MODEL-CHECK row: the settle-it column still says "reserved pins are unconnected" and does not mention the carrier's G4 exception (`RESERVED_<pin>` with a breakout terminal).
- `h7-interface-check.test.ts:342`: the JSON path is relative to the working directory, so it breaks if the tests are run from elsewhere. Using `import.meta.dir` would match `contract.ts`.
- `checkInterface` re-reads and re-parses the contract on every call. This is harmless at this size.

### Assessment

**Task quality:** Approved

**Reasoning:** The checker implements the brief's semantics, including both owned Review Focus items, with tests that exercise real failure paths. It makes the unchecked protection half visible and refuses on missing data instead of defaulting. The findings are minor hardening and documentation points.
