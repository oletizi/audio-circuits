Task 5 report: multi-page drawing (design change C3), on the two-block test board

Status: DONE. All five steps were done, each committed and pushed on feature/digital-pedal-platform.

Commits
- 58015e2  C3 step 1: one drawing page per block, the root op-list, and hierarchical labels
- decec8b  C3 step 2: make draw drafts one page per block
- f0f8bca  C3 step 3: draft, label and assemble the two-block test project
- a47d7e0  C3 step 4: the project round trip and its three negative controls
- 5ee0b9f  C3 step 5: record multi-page drawing in TOOLING.md and the skill
- fb646b7  C3: drive the per-block partition check through make draw (two end-to-end tests I added after reviewing my own coverage)

make draught-doctor ran first and reported no disagreement: every pinned tool matched.

What was built

- tools/draught/drawing-pages.ts (new): drawingPagesFromNetwork(network, DESIGNATORS, PIN_NUMBERS, captions) returns one DrawingPage { block, intent, ports } per Network.blocks record. Each intent comes from intentFromNetwork over only that block's components, using the board-wide DESIGNATORS. ports lists each port's name, its parent net, the block's pins on it, and `drafted` (false when the port reaches one pin). It refuses in these cases:
  - a network with no blocks;
  - a missing or extra caption;
  - a component outside every block;
  - two ports bound to one parent net;
  - a private net whose page text equals a port name;
  - a port that reaches no pin.
- tools/draught/intent-from-network.ts: adds the "signal" net kind (IntentNetKind). One-page intents never write it, so the carrier's intent bytes are unchanged.
- tools/draught/assemble-root.ts (new): has two parts.
  - `blankRootSheet(board)` writes the root's starting text with a uuid seeded by the board name, on USLetter. akcli new mints a random uuid4, measured in akcli/writers/blank.py, and a replay must reach the same bytes.
  - `rootSheetOps(network, board)` writes an akcli op-list: one add_sheet per block, one sheet pin per port (named by the port), and each pin wired by a 400 mil stub to a LOCAL label named by the parent net. Blocks follow Network.blocks order, three to a row.
  - CLI: `blank <board>` and `ops <module> <export> <board>`.
- tools/draught/hierarchical-labels.ts (new): `hierarchicalLabelOps(sheetText, page, file)` builds the op-list for one block sheet:
  - Port nets: every copperhead label of the port's text is deleted by uuid, and one hierarchical label is added at the first one's position, or on the port's first pin when copperhead drew none. Any further labels on that net become LOCAL labels of the same text.
  - Private nets: every global label is deleted and re-added as a local label at the same position and angle.
  - A sheet that already has hierarchical labels refuses.
  - `blockSheetLabelProblems` is the post-condition: exactly one hierarchical label per port, no global label, and no hierarchical label that names something other than a port.
  - CLI: `ops` and `check`.
- tools/draught/akcli-ops.ts (new): the op-list envelope (protocol_version 2, target_format kicad, target_file), mm-to-mil conversion, and a typed dynamic module import for the CLIs.
- tools/draught/draw-sheet.ts (new): the per-sheet sequence (draft, re-paper, render, measure), moved out of tools/cli/draw.ts with the same order and wording. A one-page board and each block page both use it.
- tools/draught/draw-pages.ts (new): `runDrawPages` drafts each page into `<outDir>/<block>/<block>.kicad_sch`, with its intent at `<outDir>/<block>.intent.json`. It runs the per-block partition check first.
- tools/draught/draw-draft.ts: `verifyPageAgainstModel(page, modelNets)` compares a page's intent with the model netlist restricted to the block's refs. Undrafted one-pin ports count as singleton nets.
- tools/draught/draw-partition.ts: `checkPagesPartition`. With no netlist declared it prints the C2 NO INDEPENDENT NETLIST block once per board.
- tools/draught/draw-intent.ts: `resolveDrawingPages`. It returns undefined when the module has no drawingPages export. It refuses alongside drawingIntent, a COMMITTED_INTENT entry, or an intent override.
- tools/cli/draw.ts: adds step 1.5. If the module exports drawingPages, the run goes to runDrawPages; otherwise the one-page path continues unchanged, now through draftRenderMeasure.
- tools/perfboard/declaration.ts: documentation only (see "Declaration mechanism" below).
- tests/circuits/drafted-project.ts (new; re-exported from drafted-sheet.ts, which is at 436 lines): `registerDraftedProjectTests`, plus recordedSheets, exportProjectRoot and placedReferences.
- tests/circuits/drafted-kicad-round-trip.test.ts: a new PROJECTS list (the fixture). It asserts that a fresh root export compares to the model exactly as the committed .net does, with a pin-move control.
- TOOLING.md: new "Multi-page drawing (design change C3)" section between C2 and C4, the original. .claude/skills/drawing-a-schematic/SKILL.md has a condensed copy that points to it.

Declaration mechanism and label-text choice

- Declaration: nothing new. A pcb board's `sch` names the ROOT .kicad_sch and its `netlist` is kicad-cli's export of that root. There is no field saying "root". Whether a board is multi-page is read only from the circuit module's drawingPages() export. This is documented in declaration.ts's module comment and in TOOLING.md C3.
- Label text for a private net: the UNPREFIXED model name. The model's a_FB and b_FB are both drawn "FB". It is tested in tests/draught/drawing-pages.test.ts ("a private net is named by its UNPREFIXED model name...") and stated in TOOLING.md. Negative control 3 and the positive control are written against it.
- Every net on a block page is kind "signal". copperhead infers ground and power from net names and draws power symbols for them; its report said "GND=ground~ (~=inferred from the net name)" on the probe. A KiCad power symbol joins every sheet by name and bypasses the root. See concern 1.
- A port reaching one pin is left out of the intent, because copperhead refuses a one-endpoint net ("net 3V3 has 1 endpoint(s); a net needs at least two", measured). Its hierarchical label goes on the pin.
- A local label and a hierarchical label with the same text join on one sheet. I measured this on a probe project: a local "3V3" label placed on block b's GND net merged /3V3 and /GND. That join is what the multi-label port-net rule relies on.

The fixture: tests/fixtures/two-block-board/
- two-block-board.ts: two copies of a divider block (r_top, r_bot, c_fb) included as a and b. They share the 3V3 and GND ports and each has a private FB. Block b's r_bot is 22k. Designators are R1 R2 C1 and R3 R4 C2.
- No perfboard.json is committed for it, because discoverDeclarations walks the whole repository for that file name. The tests and the replay write a declaration into a scratch directory instead.
- drafted/ holds:
  - the root two-block-board.kicad_sch (7fb295e5...9389);
  - a.kicad_sch (230f0598...a235);
  - b.kicad_sch (c410234c...f966);
  - RECORD.md, with a table row per sheet;
  - repair/{a,b}/intent.json and 01-hierarchical-labels.json, repair/root/01-assemble.json, repair/REPLAY.md and repair/replay.sh.
- two-block-board.net is the root's export, made by syncNetlistExport.
- Replay: replay.sh run into a new empty directory reached every sha256:
  - draft a 3faf354d...ae2b and draft b d6806d00...35f0;
  - root blank 38f21c9d...13f8;
  - the three end sheets.
  - The block sheets were unchanged by the root op-list.
  - The run also checks that both intents match the committed copies and that NO INDEPENDENT NETLIST was printed.
- ERC on the root: `kicad-cli sch erc -o <rpt> two-block-board.kicad_sch`, run with no .kicad_pro (KiCad defaults), found 0 errors and 0 warnings across sheets /, /a/ and /b/.
- Root export: /3V3 {R1.1,R3.1}, /GND {C1.2,C2.2,R2.2,R4.2}, /a/FB {C1.1,R1.2,R2.1}, /b/FB {C2.1,R3.2,R4.1}. akcli's own net diff on applying the root ops showed 3V3 (2), FB (3), FB (3), GND (4).

Render paths of the fixture pages (scratch; this is test data, so nothing is sent for review)
- Root: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/c3probe/assemble/render/two-block-board.svg (.png beside it)
- Block a: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/c3probe/assemble/render/two-block-board-a.svg (.png beside it)
- Block b: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/c3probe/assemble/render/two-block-board-b.svg (.png beside it)
- make draw's own per-page renders: build/draw/two-block-board/{a,b}/{a,b}.svg and .pdf, plus crops/.
- Observations only, not a judgement:
  - The root holds sheets a and b side by side, each with 3V3 and GND pins on its left edge, each pin wired to a label.
  - On each block page, the 3V3 hierarchical label sits on the top resistor's free pin, on the lower edge of copperhead's group rectangle. GND sits where copperhead had placed its local label.

The controls (tests/circuits/two-block-project.test.ts)
Each control copies the three committed sheets to a scratch directory, edits the copy, exports the root with kicad-cli, and runs compareSheetToModel on the whole model.
- Positive control 1 (harness): the unedited copy passes, with netMembership [] and 4 nets. Without this, a failing negative control could be the harness failing rather than the edit.
- Positive control 2: each block sheet has exactly one LOCAL "FB" label and no global label. The round trip passes, and the two FB nets stay {C1.1,R1.2,R2.1} and {C2.1,R3.2,R4.1}.
- Negative control 1 (missing boundary connection): the root wire leaving sheet a's 3V3 pin is deleted. Outcome: the round trip fails (netMembership is non-empty) and R1.1's net no longer contains R3.1.
- Negative control 2 (wrong boundary connection): sheet a's 3V3 and GND pin wires are swapped by exchanging the parent-net labels at their far ends. Outcome: the round trip fails and R1.1 lands on the net containing R4.2.
- Negative control 3 (private nets sharing a name): in both block sheets, the local "FB" label is replaced by a global_label with the SAME text "FB". Outcome: the round trip fails, and one merged net {C1.1,C2.1,R1.2,R2.1,R3.2,R4.1} appears.
- All 11 tests in this file (6 from registerDraftedProjectTests plus 5 controls) failed with the fixture project moved aside, and passed with it restored. I moved it aside with mv, not git stash, and git status was clean after restoring.

Test commands and exact counts
- bun test tests/draught/drawing-pages.test.ts: 17 pass, 0 fail. This is Step 1; it failed first on the missing modules.
- bun test tests/draught/draw-pages.test.ts: 6 pass, 0 fail. This is Step 2 plus the two later end-to-end partition tests. It failed first on the missing verifyPageAgainstModel export.
- bun test tests/circuits/two-block-project.test.ts tests/circuits/drafted-kicad-round-trip.test.ts: 25 pass, 0 fail.
- bun test tests/draught/ tests/circuits/ (final): 394 pass, 0 fail, 40 files.
- bun run typecheck: clean.
- PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh: 17 PASS.

Carrier sha checks
- tests/draught/draw-pages.test.ts drafts the h7-carrier through runDraw into a temp directory and asserts the draft's sha256 is f5c427e8c6558c2e744762890dc8dd2a24bd39ff52784d29af9e4ad89c27419f. It passes.
- bash drafted/h7-platform/h7-carrier/repair/replay.sh into a NEW empty directory (scratchpad/replay-carrier-final) passed its make-draw start check (f5c427e8...) and reached c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8. The replayed sheet is byte-identical to the committed page, and the sym-lib-table matches.

Self-review
- TDD: every step's tests were written first and seen to fail; Step 4's failure was shown with the fixture absent.
- Typing: no `any`, no `as`, no ts-ignore, and runtime guards for dynamically imported modules. Every changed file is under 500 lines; the largest are draw-draft.ts at 376 and drafted-sheet.ts at 436.
- One-page behaviour: draw.ts's one-page path now calls draftRenderMeasure, which keeps the same order and wording. The carrier draft sha256 is unchanged, as the test and the replay both show.
- Two existing akcli facts were confirmed by probe before use rather than assumed:
  - an op-list without protocol_version and target_format is refused (PROTOCOL_MISMATCH, OP_UNSUPPORTED);
  - add_net_label with scope hierarchical writes `(shape input)`.
- No forbidden words appear in RECORD.md, REPLAY.md or the TOOLING section; I checked with grep.

Concerns
1. Block pages draw no power symbols, so GND and the rails are labelled wires on every block page. This follows from marking every page net "signal", which stops a symbol joining sheets by name around the root. On the H7 module this will put many GND labels on each page. Whether a block page may draw a power symbol for a net bound to a root net of the same name is left open in TOOLING.md. It is a drawing-practice question for whoever owns that decision; I did not decide it.
2. Two hierarchical-labels paths are covered only by unit tests on synthetic sheets, not by the fixture: a port net copperhead labels more than once (first label becomes hierarchical, the rest local), and a global label on a private net (becomes local). copperhead's drafts of the fixture had one local label per drafted net and no global labels. The local-plus-hierarchical join that the first path relies on was measured on a probe project, not on the committed fixture.
3. No .kicad_pro is written beside a project. Sheet instances name the project "noname", and ERC ran with KiCad's default severities. The carrier has a committed .kicad_pro; C3 projects do not yet.
4. The DrawingPage shape is { block, intent, ports }. The brief wrote { block; intent: DrawIntent }, but DrawIntent already names draw-intent.ts's resolution type, so the page's intent is a CopperheadIntent and the port marking lives in `ports`.
5. The fixture has no boards/ directory, so its replay runs tools/cli/draw.ts (the program make draw runs) from a work-directory declaration rather than `make -C boards/... draw`. It still writes build/draw/two-block-board inside the repository.
6. The Step 5 commit message (5ee0b9f) abbreviates the carrier end sha as "c9355a88...f8d8"; the true tail is ...d8f8. This is cosmetic and only in the message; it was already pushed, so I did not amend it.
7. Neither pre-existing failure was run or observed here: make check at boards/pt2399-core, and tests/stripboard/temp-scratch.test.ts.
