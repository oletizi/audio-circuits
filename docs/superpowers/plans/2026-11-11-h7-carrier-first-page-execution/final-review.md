Final whole-branch review: H7 bring-up carrier, first page
=========================================================

Range: 35a89ad..b0b4eee (14 commits). Plan: docs/superpowers/plans/2026-11-11-h7-carrier-first-page.md.
Spec: docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md (sequence step 1).

How I reviewed it: in passes, by myself, with no sub-agents. I read the commit list, the stat
summary and the ledger. I read the hand-written code, tests and docs in full: the declaration,
board.mk, perfboard.mk and the perfboard CLI changes; draw.ts, draw-partition.ts, draw-draft.ts and
draw-intent.ts; the four circuits/h7-platform modules and the project symbol test; rail-budget;
sheet-model, own-mapping-board, drafted-sheet and the round-trip test; TOOLING.md, SKILL.md, the
spec diff, decisions.md, open-items.md, the verifier and its README; and RECORD.md, REPLAY.md,
replay.sh, netcompare.ts and the head of 03-text-edits.py. For the generated bodies I queried
rather than read. I queried the fixture's U2 component and libpart blocks, and the installed
`Power_Protection.kicad_sym` entry for USBLC6-2SC6. I ran no tests: nothing I doubted needed a
run to settle it.

I did not evaluate, describe or grade the drawing. Nothing below is about how the page looks.

Strengths
---------

- **Two kinds, and no silent default between them.** `kind` is required. A pcb board that
  declares `vrt` refuses. Every verb that only makes sense on a layout narrows the declaration
  through `requirePerfboard`/`perfboardHere`, which refuses and names the verb
  (tools/perfboard/declaration.ts:76-87, tools/cli/perfboard-support.ts:97-111). The type became a
  discriminated union, so the compiler found every `vrtPath` consumer; nobody had to grep for them.
- **Skipped checks say so.** The two places that could have looked like a pass were found and
  given their own wording: the `NO INDEPENDENT NETLIST:` block (tools/draught/draw-partition.ts:31-41)
  and the kind-aware schematic notice (tools/perfboard/schematic-notice.ts). The notice requires
  `--kind` with no default wording. The repo-root walk prints `SKIP` instead of `ok`.
- **The rail budget refuses an unbudgeted load.** It reads every resistance from the network,
  and a test (`a dummy load is read from the network, not a constant`) shows it does.
- **The C4 showing is real.** tests/circuits/h7-project-symbol.test.ts drafts with the real
  copperhead through the repository's own draft path, exports with the real kicad-cli, and does
  not skip. Its pin table is transcribed independently of the symbol file.
- **The round trip now checks against the model, not only the fixture.** It asserts that the
  fresh export has zero `componentIdentity` and zero `netMembership` on every board, Pultec
  included. Before, it checked only equality with the fixture.
- **The record is complete.** RECORD.md lists every controller ruling, each linked to its
  decisions.md entry. replay.sh refuses a non-empty work directory, checks each op-list
  byte for byte, and requires `APPLIED`.

Issues
------

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. Project symbol libraries exist in the code but in none of the practice documents, and the
committed page uses a different convention from the one the tool writes.**
- Files: tools/draught/draw-draft.ts:303-312 (doc comment), tools/draught/draw-intent.ts:92-116,
  drafted/h7-platform/h7-carrier/sym-lib-table:3, drafted/README.md:37, TOOLING.md (no mention),
  .claude/skills/drawing-a-schematic/SKILL.md (no mention).
- What's wrong:
  - Task 5's fix round added a mechanism. A circuit module exports `PROJECT_SYMBOL_LIBRARY`, and
    `make draw` copies that library into the draft directory and names it in a
    `sym-lib-table` as `${KIPRJMOD}/<file>`, "so the drafted directory resolves its symbols by
    itself on any machine".
  - The page Task 7 committed does not follow that. It carries no copy of the library, and its
    hand-written `sym-lib-table` points at `${KIPRJMOD}/../../../circuits/h7-platform/h7-platform.kicad_sym`.
    No script in `repair/` writes that file, so replay.sh cannot reproduce it.
  - drafted/README.md:37 still says a drafted directory's `sym-lib-table` is "empty; the symbols
    are embedded". The ledger records this as deferred minor T7-4.
  - Neither TOOLING.md nor the skill says how a circuit declares a project library.
- Why it matters:
  - The next board that needs a C4 symbol will be one of the module's many (W9825G6KH, TPS7A49,
    TLV803, ...). Its agent has no written convention, and two conventions to choose between.
  - One of them is documented in code and contradicted by the only committed example.
  - This is the "documentation now inconsistent with the code" case.
- Fix:
  - Pick one convention: the drafted directory points into `circuits/`, or it holds a copy.
  - Make draw-draft.ts's comment, drafted/README.md:37 and the committed page agree with it.
  - Add a short paragraph on `PROJECT_SYMBOL_LIBRARY` to TOOLING.md (beside C1/C2) and one line
    to the skill.
  - If the committed `sym-lib-table` stays hand-written, say so in REPLAY.md: it is part of the
    artifact, and the replay does not make it.

**I2. Task 7's declaration changes what Task 2's partition check compares against, so the next
model change will be refused with a refusal that teaches the wrong cause.**
- Files: boards/h7-carrier/perfboard.json (`netlist`), tools/draught/draw-partition.ts:49-81 (the
  refusal text at :76), TOOLING.md "Drawing a board that has never had a schematic (C2)",
  drafted/h7-platform/h7-carrier/RECORD.md:17.
- What's wrong:
  - Task 2 treats `declaration.netlistPath` as the independent authority the new intent is
    checked against.
  - Task 7 then declared `netlist` as kicad-cli's export of the drafted page, so the C2 branch
    will never run again for the carrier.
  - The carrier is model-authoritative, and its model is meant to change: the loopback is
    sequence step 5, and Task 5 calls this "cut one". On the next `make draw` after that change,
    `checkPartition` compares the new intent with the old page's export and refuses.
  - Its message says the intent "disagrees with the model's committed netlist" and cites
    EVALUATING-DRAWINGS.md §3. But here the model is right and the old page is stale. The
    refusal names the wrong thing, which breaks "refusals teach".
  - The way out, deleting `sch`/`netlist` from the declaration, also switches off the
    registered page tests.
  - The Pultec boards share the shape, but there the drafted page follows an authoritative
    schematic, so the check points the right way. This is the first model-authoritative board
    to bind a drafted page as its `netlist`.
  - RECORD.md:17 says "The board declares no netlist". That was true at draft time and is false
    at HEAD.
- Why it matters: it is a cross-task interface mismatch. One task produced a field with one
  meaning and another task consumed it with a different one. It will stop the next carrier plan
  at a refusal that names the wrong problem.
- Fix (small):
  - In the C2 section of TOOLING.md, say what a model-authoritative pcb board's `netlist` is once
    a page is bound (an export of the previous page), and how to redraw after a model change.
  - Make the refusal in draw-partition.ts say, for a pcb board, that the committed netlist is an
    export of the previous drafted page, so a disagreement may mean the model moved on.
  - Reword RECORD.md:17 to "at draft time the board declared no netlist".
  - Do not change the mechanism in this branch.

**I3. A pcb board's `make check` never verifies the circuit its declaration names, and a test
in this branch passes on a declaration whose circuit does not exist.**
- Files: make/board.mk:397-410, tests/perfboard/board-kind-make.test.ts:47.
- What's wrong:
  - Spec C1's criterion is that a pcb board's check runs "model validation, the contract check
    (G4), and the drawn-page round trip".
  - For a pcb board, the check is `netlist-agrees` plus `bun test tests/circuits/<board>.test.ts`.
    Neither loads `declaration.circuitPath`/`exportName`. Model validation exists only if the
    hand-written test happens to build the model.
  - The routing test's own fixture proves the gap. It declares
    `circuits/opamp-buffer/opamp-buffer.ts`, which does not exist, and asserts `make check`
    exits 0. This is deferred minor T1-2, which I regrade upward.
  - For the carrier the gap is closed only incidentally. `modelForSheet` cross-checks the
    manifest (tests/circuits/sheet-model.ts `declaredBoard`) because the board now declares a
    page.
  - The module and pedal boards will start with no page, as the carrier did.
- Why it matters: a check that could pass without having run. A pcb board pointed at a deleted
  or renamed module would pass `make check` before its first draw.
- Fix: in the pcb `check`, load the declared module and call the named export before
  `pcb-test`, for example through a `board-info --validate` or a small `model` verb. Point the
  routing test's fixture at a real circuit, and add a negative case where the circuit does not
  exist.

**I4. RECORD.md understates a measured fault in the page's embedded U2 symbol.** This is
deferred minor T7-1, regraded.
- Files: drafted/h7-platform/h7-carrier/RECORD.md:73 and :180; the fixture's libpart for
  USBLC6-2SC6 (tests/fixtures/h7-carrier.net, around line 2350).
- What's wrong:
  - RECORD.md says only that the embedded `USBLC6-2SC6` "differs" from the installed copy.
  - I confirmed the Task 7 reviewer's measurement against the installed library. The installed
    symbol is `(extends "USBLC6-2P6")` with Footprint `Package_TO_SOT_SMD:SOT-23-6`, filter
    `SOT?23*` and a SOT-23-6 description. The page's embedded copy, and so the netlist,
    carries the parent's Value `USBLC6-2P6`, Footprint `SOT-666`, filter `SOT?666*` and a
    SOT-666 description.
  - The pins are identical, so this is not electrical, and `compareSheetToModel` cannot see it.
- Why it matters:
  - RECORD.md is what the owner reads with the page.
  - The THT and SMD output classes will take footprints from this page's symbols. A SOT-666
    filter on a SOT-23-6 part is a wrong-package trap that no current check catches.
  - "Transcription is evidence": the record should state what was measured, not a summary of it.
- Fix: state the measured fields in RECORD.md, and name the cause as copperhead's flattening of
  an `extends` symbol (third-party). A comment beside `USB_ESD` in parts.ts would leave it where
  the next reader looks.

### Minor (Nice to Have)

**M1. verify.sh crossed the 500-line limit in this range**, from 497 lines to 517.
- File: docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh.
- The ledger does not record it. The owner's file-size rule is binding, so it needs either a
  split (for example moving `check_nocode` and its helpers to a sourced file) or a recorded
  controller ruling.

**M2. tests/circuits/sheet-model.ts is 532 lines.** It was 518 at base, already over the
limit. Deferred, and acceptable as pre-existing, but the branch made it 14 lines worse. A
ruling should say so.

**M3. "Every pin of a component" is written four times.**
- `allPins` (interface-check.ts), `connectionsOf` (rail-budget.ts), `everyPin`
  (own-mapping-board.ts) and `allPinNames` (h7-carrier.test.ts). netcompare.ts has a fifth,
  inline.
- One helper in `lib/model` would do.

**M4. Two unrelated types are both called `BoardKind`.**
- `"perfboard" | "pcb"` in tools/perfboard/declaration.ts and `"carrier" | "module" | "pedal"`
  in circuits/h7-platform/interface-check.ts.
- They will meet in the next plan's tooling. Rename the second, for example `InterfaceSide`.

**M5. The project library's nickname is hard-coded in three places.**
- `"h7-platform"` appears in parts.ts (comment and lib ids), h7-carrier.test.ts
  (`PROJECT_NICKNAME`) and symbol-names.test.ts (`PROJECT_LIBRARIES`).
- draw-draft.ts derives the nickname from the file name.
- A rename would fail loudly, so this is duplication, not a hidden fault.

**M6. Inconsistent citations for the VREF_A limit.**
- rail-budget.ts cites `architecture.md:227`, which is correct (I checked the line). The plan
  cited `power.md:227`. decisions.md CR-CARRIER-RAIL-LOADS cites §4.7 pin 21.
- These agree in substance. Only the plan's line is wrong, and the plan is not code.

**M7. An `as` cast in a test.**
- tests/draught/draw-board-kind.test.ts:67: `) as { nets: ... }`.
- The owner's rule is "no `as Type`". It is test code, but the rule does not except tests.
  Parse with a type guard instead.

**M8. replay.sh is run as `sh` but uses `set -o pipefail`.**
- drafted/h7-platform/h7-carrier/repair/replay.sh.
- That works where `sh` is bash (macOS) and fails under dash. Use `#!/usr/bin/env bash` and
  `bash replay.sh`.

Triage of the deferred minors in the ledger
-------------------------------------------

**Fix before this branch is considered done:**

| Ledger item | Why |
| --- | --- |
| T1-2: the routing-test fixture names a nonexistent circuit | Regraded to I3. It is the visible end of a check that does not run. |
| T7-1: USBLC6 "differs" | Regraded to I4. A wrong-package fact is missing from the owner's record. |
| T7-4: drafted/README.md says `sym-lib-table` is empty | Part of I1. The directory's own README is now false. |
| T7-3: REPLAY.md does not say step 1 writes `build/draw/` inside the repository | One sentence. The replay overwrites `build/draw/h7-carrier/`, which may be a draft somebody is working on. Cheap, and it prevents a loss. |
| T3-1, second half: the README cites "verify.sh line 97" | That line is now about 116. A dead pointer in a record, which CLAUDE.md singles out. A one-word fix. The "1 .ts files" plural can ride along. |

**Can stay. Each is cost only, disclosed, or cosmetic:**

| Ledger item | Why it can stay |
| --- | --- |
| T1-1: the pcb board test runs twice when `sch` is declared | Time only. Nothing is masked. |
| T1-3: a hard kill leaves `boards/zz-kind-route-<pid>` | Rare. Such a board would fail loudly (no test file), not pass. |
| T1-4: substring `not.toContain` assertions | Brittle, but they fail toward red. |
| T2-1: draw-partition.ts's doc comment mentions a notice on `agrees` | A comment only. Fix opportunistically. |
| T2-2: `runCheck` loads each declaration twice | Cost only. |
| T2-3: a walk over only pcb boards exits 0 with SKIP lines | The SKIP lines are loud and the exit status is honest about what ran. |
| T2-4: draw-board-kind.test.ts depends on Pultec and a docs/research intent | A coupling, not a false green. |
| T4: `checkInterface` re-parses the contract | Cost only. |
| T5-1: `valueFor`'s guard misses structurally represented quantities | Disclosed in its comment, and no current part trips it. |
| T5-2: ΔI_CC counts the S pin | A conservative 20 µA, disclosed in decisions.md. |
| T6: sheet-model.ts is 532 lines | See M2. Record a ruling. |
| T7-2: the 15 hidden Values come from a hand-typed list | The list matches the rule stated in the docstring and in RECORD.md. Optionally derive it. |
| T7-5: J7's Footprint property is visible with an empty value | It concerns the page's fields. I make no judgement on the page. |

Recommendations
---------------

- Before the module plan, write down the project-symbol convention (I1). The module needs more
  C4 symbols than anything else in this repository.
- Before sequence step 5, decide what a model-authoritative board's `netlist` means once a page
  is bound (I2). The loopback is the first model change that will hit it.

Declined to judge
-----------------

- **The drawing's arrangement, fields and appearance.** I am not a qualified reviewer of a
  drawing (EVALUATING-DRAWINGS.md).
- **The electrical choices in the controller rulings** (the USB-C receptacle, the shield
  network, C_VBUS, S tied to GND, the 0.75 A fuse). They are recorded as controller rulings for
  the owner to override. I checked only that each is cited and recorded.
- **Whether the dummy loads should observe the 1.5× declared-load margin in power.md:395.** That
  margin is the pedal's rule for its declared loads. architecture.md:356 asks for dummy loads at
  the contract limits, which the 25 mA aggregate rule implements. This is a domain question for
  the owner, not a code defect.
- **Copperhead's flattening of `extends` symbols.** It is a third-party defect, outside the
  branch. Only its record (I4) is in scope.
- **The pre-existing failures.** `make check` at boards/pt2399-core, and
  temp-scratch.test.ts flagging comparator-controls.test.ts. Neither file was touched in this
  range.
- **The numeric-pin identity mapping in Task 6's carrier pin-number check.** The ledger records
  the ruling. Task 5's symbol-pin test is the independent check, and it covers pin sets for
  every part and pin names for `ic` parts.

Assessment
----------

**Ready to merge: With fixes.**

**Reasoning:** No critical defect. The connectivity binding is real: a fresh kicad-cli export
against the model, with negative controls. The refusals are loud. Four Important items should
land before the branch is called done:
- I1 and I4 are documentation and record fixes.
- I3 is a small check plus one test.
- I2 needs only words now, but it will block the next carrier plan if it is left unsaid.
