### Spec Compliance

- ✅ Spec compliant. Every brief item has a hunk:
  - `BoardKind` and the discriminated union are in `tools/perfboard/declaration.ts`. The perfboard variant keeps `vrtPath`, and the pcb variant has none. `kind` is required with no default (`readKind`, which refuses naming the field and the two valid values). A pcb declaring `vrt` refuses with a stated reason.
  - All 11 `boards/*/perfboard.json` gain `"kind": "perfboard"`.
  - The `vrtPath` consumers are narrowed through `requirePerfboard`, `loadPerfboardDeclaration` and `perfboardHere`, and each refusal names the verb and the kind. The report says typecheck is clean.
  - `make/board.mk` reads `BOARD_KIND` through `board-info --field kind`, not by grepping JSON. A pcb `check` runs `netlist-agrees` and then `pcb-test`. `pcb-test` requires `tests/circuits/<board>.test.ts` whether or not `sch` is declared. A pcb board never reaches veroroute, wiring, scaffold-membership or `perfboard.ts check`. The make side of that routing is covered by `tests/perfboard/board-kind-make.test.ts`.
  - TOOLING.md and the `make/perfboard.mk` header both record C1.
  - The five brief-mandated declaration tests are present (declaration.test.ts hunk, around diff lines 1195-1235), plus a `requirePerfboard` test and two make-routing tests.
- ⚠️ Cannot verify from the diff: that `make -C boards/transistor-preamp-staged check` is unchanged, and that `bun run typecheck` and `bun test tests/perfboard/` pass. I relied on the report for both. The perfboard branch of `check` in the diff is textually identical to before, apart from being wrapped in `else`.
- ⚠️ Review Focus 1 and 2 (missing `kind` refuses, pcb with `vrt` refuses) are covered by tests I read, namely declaration.test.ts `kind` and `pcb.*vrt`. I did not run them.

### Strengths

- Strict refusal. No default for `kind`, and messages say why (declaration.ts `readKind` and the pcb-with-`vrt` branch).
- The union is built without `as` or `any`. `requirePerfboard` and `loadPerfboardDeclaration` give one choke point instead of per-site checks. `perfboardHere` wraps the CLI error path consistently with `boardHere`.
- `make/board.mk` states the broken-declaration case explicitly. If `BOARD_KIND` is empty, `check` takes the perfboard path, which refuses on the same declaration. A broken declaration is never read as pcb.
- The `NETLIST_TEST` move out of the schematic conditional is needed for a pcb board with no `sch`, and it is documented.
- The make-routing test cleans up in `afterAll` and keys its names on the pid. The pre-change RED run was shown.
- The no-schematic notice and the pcb-only test duplication are disclosed honestly in the report.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
1. `tools/cli/perfboard.ts` `runCheck`, diff around line 2158. It now calls `loadPerfboardDeclaration(file, "check")` for every discovered `perfboard.json`. `bun tools/cli/perfboard.ts check` run over a tree that contains a pcb board therefore reports FAIL for that board and sets a non-zero exit. The make path is unaffected, because `aggregate.mk` recurses per board via `make -C`. The failure is loud, which is consistent with the brief. But the first pcb board (the H7 carrier) will make the documented `bun run perfboard check` red at the repo root. Consider having `runCheck` skip pcb boards with an explicit printed line, or record this as a known consequence in TOOLING.md. I did not run it.
2. `make/board.mk`, the `check` and `pcb-test` pair. For a pcb with `sch` declared, `tests/circuits/<board>.test.ts` runs twice (once inside `netlist-agrees`, once in `pcb-test`). The report discloses this. It is harmless but doubles the cost for the case that matters most (the carrier).
3. `tests/perfboard/board-kind-make.test.ts:~38`. The fixture names `../../circuits/opamp-buffer/opamp-buffer.ts`, which does not exist in this checkout (I checked `circuits/opamp-buffer`). Nothing opens it, because the loader and `pcb-test` do not load the circuit, so the test passes. But it is a dangling reference in a fixture. Point it at a real circuit, or note that it is never opened.
4. The test writes into the real `boards/` and `tests/circuits/` trees. A hard kill leaves a stray `zz-kind-route-*` pcb board that `make check` at the aggregate level would pick up. The report explains why the in-repo location is needed. Consider a startup sweep of stale `zz-kind-route-*` directories.
5. `tools/perfboard/schematic-notice.ts` wording ("the check below still ran, against the layout...") is inaccurate for pcb boards. The report discloses this as out of scope. I suggest the next task that touches this notice fixes it. It is a skipped-check honesty issue under the project rules.
6. The pcb-routing test's `not.toContain("wiring")` and `not.toContain("veroroute")` assertions are substring checks on make output. They could false-fail if a notice or path ever contains those words, which makes them brittle. They are adequate today.

### Assessment

**Task quality:** Approved

**Reasoning:** The kind is required and refuses loudly, the union forces every `vrtPath` consumer to narrow, and the make routing keeps the perfboard path textually unchanged while giving pcb boards a mandatory board test. Only minor polish items remain, chiefly the CLI `check` walk failing on a pcb board and the dangling circuit path in the test fixture.
