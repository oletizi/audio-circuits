Task 2 report: drawing a board that has never had a schematic (C2)

Status: DONE.

Toolchain install: ran `bash draughting/install.sh`. It installed copperhead 0.12.0 (clone + npm ci at the pinned commit) into `draughting/copperhead`, and a venv at `draughting/venv-akcli` holding akcli-kicad 0.22.0, numpy 2.5.4 and pillow 13.0.0. `make draught-doctor` then reports every pinned tool matching. Both directories are untracked/ignored (git status stayed clean of them).

What changed
- `tools/draught/draw-partition.ts` (new): `checkPartition` holds the pre-draft partition step moved out of `tools/cli/draw.ts`. A pcb board with no netlist returns "not-run" with the `NO INDEPENDENT NETLIST:` block; a perfboard board with no netlist refuses with the existing text; a declared netlist still runs the comparison. No model-derived netlist is written.
- `tools/cli/draw.ts`: calls `checkPartition`; the not-run notice is placed in stdout right after the scope disclosure.
- `tools/perfboard/schematic-notice.ts`: `schematicNoticeLines(path, kind)`. The pcb wording says no layout check exists for this kind and that `tests/circuits/<board>.test.ts` is what `make check` runs. Perfboard wording unchanged.
- `tools/cli/perfboard.ts`: `schematic-notice` now requires `--kind perfboard|pcb` (no default; refuses otherwise). `runCheck` prints `SKIP <board>: kind "pcb" has no VeroRoute layout; its check is make -C boards/<board> check` to the log for each pcb board; not an ok, not a FAIL, exit status unchanged.
- `make/board.mk`: passes `--kind "$(BOARD_KIND)"` to `schematic-notice`.
- `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md`: C2 recorded.

Deviations and notes
- The three draw tests are in a NEW file `tests/draught/draw-board-kind.test.ts`, not in `draw.test.ts`, because `draw.test.ts` is already 487 lines (limit about 500). They use scratch boards under `os.tmpdir()` with absolute circuit/netlist paths.
- Existing notice tests updated to pass `--kind perfboard`; `tests/perfboard/schematic-notice.test.ts` updated for the new second argument.
- Consequence to know: a repo-root `perfboard.ts check` over a tree holding only pcb boards prints SKIP lines and exits 0 (the brief says the SKIP must not change exit status). The "nothing found" refusal still fires only when no perfboard.json exists at all.
- `make check` on pt2399-core pre-existing failure was not exercised by me.

TDD evidence
RED, draw (new code reverted to the old `draw.ts`): `bun test tests/draught/draw-board-kind.test.ts`
```
error: expect(received).not.toContain(expected)
Expected to not contain: "declares no \"netlist\" field"
Received: ".../draw-kind-board-CLcYEC/perfboard.json declares no \"netlist\" field, so there is no committed model export to verify scratch-pcb's intent against. ..."
(fail) a pcb board with no netlist drafts and says the partition check did not run
 2 pass
 1 fail
```
RED, notice and SKIP: `bun test tests/cli/perfboard-schematic-notice-verb.test.ts tests/cli/perfboard.test.ts` before the implementation: 22 pass, 3 fail (pcb notice lacked "no layout check exists"; missing `--kind` returned 0; the pcb SKIP test got exit 1 from the loader refusal).
GREEN: `bun test tests/draught/draw-board-kind.test.ts tests/cli/perfboard-schematic-notice-verb.test.ts tests/cli/perfboard.test.ts` -> 25 pass, 0 fail.
GREEN, wider: `bun test tests/draught/ tests/cli/ tests/perfboard/` -> 363 pass, 0 fail (37 files). `bun run typecheck` clean.
