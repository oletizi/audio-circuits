# Task 1 report: board kind `pcb` (C1)

Status: DONE_WITH_CONCERNS. Commit 474dd8f "board kinds: a pcb kind with no VeroRoute layout (C1)", pushed.

## Implemented
- `tools/perfboard/declaration.ts`: `BoardKind`, `PerfboardDeclaration` = union of `PerfboardBoardDeclaration` (kind perfboard, has `vrtPath`) and `PcbBoardDeclaration` (no `vrtPath`). `kind` required, no default, refusals explain why. A pcb declaring `vrt` refuses. Added `requirePerfboard(decl, verb)` and `loadPerfboardDeclaration(file, verb)`, which refuse a pcb board naming the verb and kind.
- Narrowed every `vrtPath` consumer: verbs.ts, import.ts, scaffold-membership.ts, buildability-input.ts, guide/packet.ts, check.ts (`checkPerfboard`, `PerfboardResult`), stripboard/adopt.ts, place-inputs.ts, cli/perfboard.ts (`check` loop), cli/perfboard-support.ts (new `perfboardHere`, used by cuts/import/update/stripboard/edit/guide/scaffold-membership; `boardHere` stays a union for wiring and bom). `board-info` prints kind and `--field kind` added.
- All 11 `boards/*/perfboard.json` gained `"kind": "perfboard"`.
- `make/board.mk`: `BOARD_KIND` read via `board-info --field kind`; `check` routes: pcb -> `netlist-agrees pcb-test`, perfboard unchanged. `pcb-test` requires `tests/circuits/<board>.test.ts` and runs it. `NETLIST_TEST` moved out of the schematic conditional so it exists when no `sch` is declared.
- Docs: TOOLING.md section "Board kinds", `make/perfboard.mk` header comment (both record C1).
- Test fixtures updated for the union (literals gain `kind`, `loadPerfboardDeclaration` where `vrtPath` is used, inline perfboard.json fixtures gain kind).

## Make-routing test choice
`tests/perfboard/board-kind-make.test.ts` creates `boards/zz-kind-route-<pid>/` and `tests/circuits/zz-kind-route-<pid>.test.ts` and removes both in `afterAll` (a boards-style dir outside the repo cannot reach make/board.mk's REPO_ROOT, the CLI, or the test path). Verified nothing is left behind.

## TDD evidence
- RED (declaration): `bun test tests/perfboard/declaration.test.ts` -> 14 pass, 4 fail (kind-missing, kind-smd, pcb-with-vrt, pcb-no-vrt). The fifth ("perfboard still requires vrt") passed before implementation because `vrt` was already required; it is a regression guard.
- RED (make): with board.mk reverted, `bun test tests/perfboard/board-kind-make.test.ts` -> 0 pass 2 fail; output showed `make: *** [wiring] Error 1` and the veroroute line, i.e. the pcb board reached perfboard tools.
- GREEN: `bun test tests/perfboard/board-kind-make.test.ts` -> 2 pass 0 fail. `bun test tests/perfboard/` -> all pass. `bun run typecheck` clean. `make -C boards/transistor-preamp-staged check` -> ends `ok .../transistor-preamp-staged.perfboard.vrt`, perfboard path unchanged.
- Full `bun test tests`: remaining failures are pre-existing/environmental, none from this change: tests/draught (copperhead not installed under draughting/, plus I-1/I-3/I-5 and akcli tests), `temp-scratch` guard flags `schgen-trial/comparator-controls.test.ts` (unnamed mkdtemp). `provenance-chain` failed only while perfboard.json edits were uncommitted; after the commit `tests/stripboard/materialize-run.test.ts` is 12 pass.

## Files changed
tools/perfboard/declaration.ts, verbs.ts, import.ts, check.ts, scaffold-membership.ts, buildability-input.ts; tools/guide/packet.ts; tools/stripboard/adopt.ts, place-inputs.ts; tools/cli/perfboard.ts, perfboard-support.ts, perfboard-binary-verbs.ts, perfboard-scaffold-verb.ts; boards/*/perfboard.json (11); make/board.mk, make/perfboard.mk; TOOLING.md; tests (declaration.test.ts, board-kind-make.test.ts new, and fixture updates in tests/bom, cli, guide, perfboard, stripboard).

## Self-review / concerns
- The no-schematic NOTICE text (tools/perfboard/schematic-notice.ts) says "the check below still ran, against the layout this board was built from", which is inaccurate for a pcb board. Not changed (outside the brief); a later task may want a pcb-specific wording.
- `make check` on a pcb board with `sch` declared runs the tests/circuits file twice (once in `netlist-agrees`, once in `pcb-test`). Harmless; kept for explicitness.
- If a declaration is broken, `BOARD_KIND` is empty and `check` takes the perfboard path, which refuses on the same declaration, so it is never read as pcb.
- Repo-wide `make check` still fails at boards/pt2399-core (known, not mine); not re-run.
- Commit message carries no AI attribution (user's CLAUDE.md overrides the injected reminder).
