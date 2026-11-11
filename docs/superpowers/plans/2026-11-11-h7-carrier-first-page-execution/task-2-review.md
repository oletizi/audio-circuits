### Spec Compliance

- ✅ Spec compliant, including both controller additions.
  - Brief: the pcb-without-netlist branch is at `tools/draught/draw-partition.ts:625-628`. The block starts `NO INDEPENDENT NETLIST:` (:608) and says the check did NOT run (:609), that there is no schematic to export from (:610), and that the binding check is the kicad-cli export versus the model (:612-613). A perfboard board with no netlist still returns the verbatim old refusal text (:629-634). A pcb board that declares a netlist runs the comparison (:637-656). No model-derived netlist is written.
  - Wiring: `tools/cli/draw.ts` calls `checkPartition` and prints the notice in stdout right after SCOPE_DISCLOSURE, so it appears on the draft-failure path too.
  - The three required tests exist in `tests/draught/draw-board-kind.test.ts:298, 317, 335`. They are in a new file instead of `draw.test.ts`, with a stated reason (file-length limit). This is acceptable. The pcb test asserts exit 0, `drew === true`, the `/^NO INDEPENDENT NETLIST:/m` match and "did NOT run".
  - (a) `tools/perfboard/schematic-notice.ts:687-698`: the pcb wording does not claim a layout check ran. It says no layout check exists and names `tests/circuits/<board>.test.ts`. The perfboard wording is byte-identical. Tests are at `tests/cli/perfboard-schematic-notice-verb.test.ts` (pcb wording, perfboard unchanged, and a refusal on missing or unknown `--kind`).
  - (b) `tools/cli/perfboard.ts:518-524`: `runCheck` prints a SKIP line and `continue`s, so the board is neither an `ok` nor a FAIL and `failed` is not set. The test (`tests/cli/perfboard.test.ts`) asserts exit 0, no errors, that only the perfboard board reaches the layout check, that only one `ok ` line is printed, and the exact SKIP text.
  - Docs: C2 is recorded in `TOOLING.md` and in the skill.
- ⚠️ Cannot verify from the diff: that `make check` for a real pcb board actually goes through `netlist-agrees` with `--kind pcb`. I checked `make/board.mk` (read-only): `BOARD_KIND` is defined at :48 and `check: netlist-agrees pcb-test` is at :398. The `--kind` argument at :188 sits in the no-sch `else` branch, so it is plausible. The pcb notice's claim that the board's test is what `make check` runs matches :398.

### Strengths

- The partition step was extracted into a small, single-purpose module with a discriminated union outcome (`agrees` / `not-run` / `refused`) and no casts or `any`.
- `--kind` is required on `schematic-notice` and refuses with a teaching message instead of defaulting. This follows the no-silent-default rule.
- The SKIP line and the pcb notice both name what did and did not run.
- The tests exercise real behaviour: a real draft, and a deliberately corrupted intent that must still refuse for a pcb board with a netlist.
- The draw.ts change is net-shrinking.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- `tools/draught/draw-partition.ts:599` doc comment says "ran and agreed (`notice` absent)". The `agrees` variant has no `notice` field, so the parenthetical is stale and slightly confusing. Reword it.
- `tools/cli/perfboard.ts:518-524`: `loadDeclaration` runs and then `loadPerfboardDeclaration` loads the same file again for non-pcb boards. This is a harmless double read, but it is two loaders deciding about one file.
- Exit-status consequence (the implementer noted it): a repo-root `perfboard.ts check` over a tree of only pcb boards prints SKIP lines and exits 0. The brief requires this. A pass at exit-code level is therefore still not distinguishable from "nothing checked", so the SKIP text is the only signal. Consider whether the owner wants an end-of-run summary count, but this is not required here.
- `tests/draught/draw-board-kind.test.ts:344-349` reads and depends on pultec/hi-cut artifacts, and on an intent JSON under `docs/research/`. That is a fragile cross-dependency on committed research files. It is acceptable for a test, but a rename elsewhere will break it with an unrelated-looking error.

### Assessment

**Task quality:** Approved

**Reasoning:** The C2 branch is narrow and loud, and it neither fakes an independent netlist nor lets a skipped check read as a pass. Both controller-added items (the pcb notice wording and the SKIP line) are implemented with tests, and the perfboard behaviour is preserved. Only minor polish remains.
