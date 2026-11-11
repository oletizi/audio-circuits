### Task 2: Drawing a board that has never had a schematic (C2)

**Files:**
- Modify: `tools/cli/draw.ts` (the step that requires `declaration.netlistPath` and compares the partition, around lines 258-282)
- Modify: `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` (one paragraph each)
- Test: `tests/draught/draw.test.ts`

**Interfaces:**
- Consumes: `PerfboardDeclaration` with `kind` (Task 1).
- Produces: for a `pcb` board with no `netlist` declared, `make draw` skips the intent-versus-netlist partition step. It continues to draft and render, and prints a block that starts with `NO INDEPENDENT NETLIST:`. That block says the pre-draft partition check did not run, that there is no schematic to export one from, and that the binding check is the drafted page's `kicad-cli` export compared with the model (Task 7). A perfboard board with no `netlist` refuses exactly as today.

- [ ] **Step 1: Write the failing tests** in `tests/draught/draw.test.ts`, using its existing harness:
  - `"a pcb board with no netlist drafts and says the partition check did not run"`: the output matches `/^NO INDEPENDENT NETLIST:/m`, and the result is not a refusal.
  - `"a perfboard board with no netlist still refuses"`: the result is a refusal matching the existing `declares no netlist field` text.
  - `"a pcb board that declares a netlist still runs the partition check"`: a deliberately mismatched fixture still refuses.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/draught/draw.test.ts`. Expected: the first new test fails.
- [ ] **Step 3: Implement the branch in `tools/cli/draw.ts`.** Do not write a model-derived netlist to stand in for the missing one (spec, anti-goal "a check that compares the model with itself").
- [ ] **Step 4: Verify.** Run `bun test tests/draught/` and `bun run typecheck`: all pass.
- [ ] **Step 5: Record C2** in `TOOLING.md` and the skill. Commit and push.

