### Finding Verdicts

- **Require pads "1".."20" on each socket; missing pad and pad outside 1..20 are mismatches; nc on module and pedal is the tagged NC only; tests for a missing pad and a pad "21" on J_MOD_A; absent-as-nc test replaced** — ADDRESSED.
  - `circuits/h7-platform/interface-check.ts:51-66`: `PAD_KEY = /^(?:[1-9]|1\d|20)$/`; `checkPadSet` reports each key outside 1..20 and each pad 1..20 not listed. It runs for J_MOD_A (contract pin = pad) and J_MOD_B (contract pin = pad + 20) at lines 125-126 of `checkInterface`.
  - `interface-check.ts:103-104`: `unconnected = found.kind === "nc"`. No "absent means nc" path remains. `checkPin` returns early on `found === undefined` at line 90, so a missing pad is reported once, by `checkPadSet`.
  - `tests/circuits/h7-interface-check.test.ts:189-194`: the old "absent counts as nc" test is now "a reserved pad the socket does not list is a mismatch, not nc". It expects exactly one mismatch naming "J_MOD_A pad 16" and "missing". Traced through the fixture (lines 14-39): pad 16 is skipped, `checkPadSet` emits one message, and the early return suppresses the per-pin message, so length 1 holds.
  - `test:196-206`: "a pad 21 on J_MOD_A is reported". It appends pad "21" to the socket's MAIN unit, spreading the existing pins so no pad is lost. It expects exactly one mismatch containing `J_MOD_A pad "21"`, which matches the `checkPadSet` message at `interface-check.ts:59`.
- **Carrier exception stated in the CONTRACT-MODEL-CHECK row, plus the members-counted-but-role-unchecked caveat** — ADDRESSED. `docs/h7-platform/open-items.md` line 147 (the diff's `+` line) says the carrier `RESERVED_<pin>` net holds the socket contact plus exactly one breakout terminal, and that the checker counts members and does not check the terminal's role. The row still reads open.
- **One-line comment at the two-member check in `interface-check.ts`** — ADDRESSED. `interface-check.ts:115` sits directly above `membersOnNet`: "Counts members only; it does not check that the second member is a breakout terminal (no part-role field)."
- **Contract JSON path resolved with `import.meta.dir`** — ADDRESSED. `tests/circuits/h7-interface-check.test.ts:3` imports `join`. Line 228 reads `join(import.meta.dir, "../../circuits/h7-platform/module-interface.json")`. From `tests/circuits/` that resolves to the repository root, so the path is correct.

### New Breakage in the Fix Diff

None. Checked:
- `describe(connection: Connection)` no longer accepts undefined. Both call sites run after the `found === undefined` early return, so the narrowing holds.
- The module comment at `interface-check.ts:10-12` matches the code.
- The pre-existing "contract pin 21 on J_MOD_A pad 1" test (test lines 56-61) still passes: it uses `.some(...)`, and its fixture now also yields a "J_MOD_B pad 1 is missing" message, which is correct behaviour and not a regression.

Not re-run: the report's `bun test` (12 pass, 0 fail) and `bun run typecheck` (clean) claims. I relied on them plus the code reading above. The code reading found nothing that would make them false.

### Out-of-Scope Observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage. No open findings.
