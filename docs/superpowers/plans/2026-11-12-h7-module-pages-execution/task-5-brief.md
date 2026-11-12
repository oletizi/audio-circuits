### Task 5: Multi-page drawing (C3), proven on a two-block test board

C3 is built and checked on a small synthetic board before the module uses it. A failure in the plumbing then surfaces on two small pages, not on ten large ones. The test board is never shown to the owner, so nothing about it is a drawing for review.

**Files:**
- Modify: `tools/cli/draw.ts`, `tools/draught/draw-draft.ts`, `tools/draught/draw-intent.ts`, `tools/draught/intent-from-network.ts`
- Modify: `tools/perfboard/declaration.ts`: a `pcb` declaration's `sch` may name a hierarchical root sheet. How the declaration says so is the builder's choice, stated in `TOOLING.md`. Whether a board is multi-page is read from its circuit module (it exports `drawingPages()`), never guessed from the file.
- Create: `tools/draught/assemble-root.ts`, which writes an akcli op-list for the root sheet from `Network.blocks`
- Create: `tools/draught/hierarchical-labels.ts`, which writes an akcli op-list that, on one block sheet, deletes copperhead's labels on the block's port nets, adds a `hierarchical` label per port, and turns any global label on a private net into a local one
- Create: `tests/fixtures/two-block-board/` (a circuit module with two blocks sharing `3V3` and `GND` ports, each with a private `FB` net)
- Modify: `tests/circuits/drafted-sheet.ts` with `registerDraftedProjectTests`; `tests/circuits/drafted-kicad-round-trip.test.ts`
- Modify: `TOOLING.md`, `.claude/skills/drawing-a-schematic/SKILL.md`: a C3 section in each. TOOLING is the original; the skill copies it.
- Test: `tests/draught/draw-pages.test.ts`, `tests/circuits/two-block-project.test.ts`

**Interfaces:**
- A circuit module with blocks exports `drawingPages(): readonly { block: string; intent: DrawIntent }[]`, one entry per `Network.blocks` record. Each intent comes from `intentFromNetwork` over that block's components only, with the board-wide `DESIGNATORS`, and its port nets marked so that the draft names them.
- For such a board, `make draw` drafts each page into `build/draw/<board>/<block>/<block>.kicad_sch` and re-papers, renders and measures each one. The pre-draft partition check runs per block, against that block's components and nets taken from the model. With no independent netlist, it prints the C2 `NO INDEPENDENT NETLIST:` block, once per board.
- The committed form is `drafted/<circuit>/<board>/`:
  - `<board>.kicad_sch` (the root);
  - `<block>.kicad_sch` per block;
  - one `RECORD.md`, with a row per sheet sha256 and a root sha256;
  - `repair/`, with one subdirectory per block plus `root/`, and one `replay.sh` that reaches every sha256.
- `registerDraftedProjectTests({ board, circuit, netlist, ... })` exports the root with `kicad-cli` and runs `compareSheetToModel` on the whole board model. It asserts that every model component appears exactly once across the sheets, under its `DESIGNATORS` reference, and checks every sheet's sha256 against `RECORD.md`.
- **The three negative controls** (spec C3), each a test that edits a copy of the assembled two-block project and requires the round trip to fail:
  1. **Missing boundary connection:** delete one sheet pin's wire at the root.
  2. **Wrong boundary connection:** swap two sheet pins' wires at the root.
  3. **Private nets sharing a name:** in both block sheets, replace the private `FB` net's label with a global label of the **same text**, `FB`. The round trip must fail on the merged net. The model's private nets are `a_FB` and `b_FB`, so turning each label global with its own text would leave two different names that never join, and the control would prove nothing (issue 31, finding 5).
  - **Positive control:** each block sheet carries a local label with the same text `FB` on its private net, and the round trip passes, because a local label joins only within its own sheet. The intent's label text for a private net is specified by `drawingPages()`: either the prefixed model name or the unprefixed one. Whichever it uses is stated in `TOOLING.md` and tested, and the controls are written against it.

- [ ] **Step 1: The composition-driven pieces, test first.**
  - `drawingPages` for the two-block fixture: two pages, every component on exactly one, ports marked.
  - `assemble-root` produces one `add_sheet` per block, with one sheet pin per port, wired to the parent net.
  - `hierarchical-labels` produces, for each port net, deletes of copperhead's labels and one `hierarchical` label.
  - Run them and confirm they fail; implement; confirm they pass.
- [ ] **Step 2: `make draw` per page.**
  - Write the failing test in `tests/draught/draw-pages.test.ts`: two sheets under `build/draw/two-block-board/`, each re-papered to `USLetter`, each with a render, and one `NO INDEPENDENT NETLIST:` block.
  - Implement, and confirm a one-page board's behaviour is byte-for-byte unchanged: the h7-carrier draft sha256 is still `f5c427e8c6558c2e744762890dc8dd2a24bd39ff52784d29af9e4ad89c27419f` (its `REPLAY.md`).
- [ ] **Step 3: Draft, repair and assemble the two-block project** by the loop, with the repair committed under `tests/fixtures/two-block-board/drafted/`. This is a fixture, so it is never sent. Run `kicad-cli sch erc` on the root (0 errors), and export the root.
- [ ] **Step 4: The project round trip and its three negative controls.** Write the tests, see them fail before the fixture exists, then pass, with each control failing the round trip.
- [ ] **Step 5: Verify.**
  - Run `bun test tests/draught/ tests/circuits/` and typecheck.
  - Run the carrier's replay into a new empty directory: it still reaches `c9355a88…`.
  - Record C3 in `TOOLING.md` and the skill, saying what is new and what a block page still shares with a one-page board.
  - Commit and push.

