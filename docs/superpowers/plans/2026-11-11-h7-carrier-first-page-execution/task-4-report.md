Task 4 report: interface checker. Status: DONE.

Commit 5d5d0df (pushed): contract.ts, interface-check.ts, tests/circuits/h7-interface-check.test.ts, open-items row CONTRACT-MODEL-CHECK.

RED: with contract.ts and interface-check.ts moved aside, bun test failed: "Cannot find module '../../circuits/h7-platform/contract.ts'", 0 pass, 1 fail, 1 error.
GREEN: 11 pass, 0 fail, 25 expect() calls. bun run typecheck: clean. Verifier: 17 PASS; nocode line reads "phase-2 amendment: 2 .ts files under circuits/h7-platform/ held by typecheck and tests".

Notes:
- JSON field names match the brief (pin, category, signal, direction, failsafeRequired); no mapping needed.
- Imports are relative with .ts (no @/ alias exists in this repo's tsconfig).
- Socket pad = pin keyed by the pad number as a string on the socket's units/package pins.
- "nc" accepted as: the model's tagged NC connection, OR the socket listing no such pin. A pad on a net with no other member is not accepted as nc (validateNetwork refuses it). Stated in the interface-check.ts module comment. Absent pad on a signal pin is a mismatch.
- Extras beyond the brief: parseContract(raw) exported so the 39-pin refusal is testable; extra tests for repeated pin number, absent reserved pad, carrier reserved pin left nc.
- protectionUnchecked is computed from the contract's failsafeRequired pins (31-37 range subset; test derives expected from the JSON).
- Fixture builds Network literals directly (not via done(), which would refuse floating nets); the test helper is test code only.

Fix report (review minors 1-3)
- interface-check.ts: checkPadSet requires each socket to list exactly pads "1".."20"; a missing pad or a pad outside 1..20 is a mismatch (reported once, not again per pin). nc on module and pedal is now only the tagged NC form; an absent pad is no longer nc. Module comment updated. A one-line comment at the two-member check says members are counted and the terminal's role is not checked.
- Tests: the absent-as-nc test is replaced by a missing-pad test; added a pad "21" on J_MOD_A test; the JSON path in the protectionUnchecked test now uses import.meta.dir.
- open-items.md CONTRACT-MODEL-CHECK: carrier RESERVED_<pin> exception and the members-not-role caveat added.
- Commands: bun test tests/circuits/h7-interface-check.test.ts: 12 pass, 0 fail, 29 expect() calls. bun run typecheck: clean. Verifier: 17 lines starting with PASS.
