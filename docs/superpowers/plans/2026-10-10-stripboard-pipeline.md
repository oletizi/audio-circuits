# Stripboard Placement-and-Routing Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A repeatable pipeline that takes a circuit and a hole grid and produces a stripboard layout, graded by code against criteria the producing agent did not write, reported with a verdict that says which of three outcomes it reached, and admitted to the repository through one gate that verifies its provenance.

**Architecture:** The forked VeroRoute binary is the only legitimate writer of a `.vrt`, so the pipeline actuates through its verbs (`--import`, `--move`, `--rotate`, `--stretch`, `--author --op autofill`) and measures through `--dump-board`. Everything else is TypeScript in this repository: a scorer over the dump, a copper-reconstruction grader that shares no code with the scorer, a seeded search, a run directory with a hashed manifest, and an adoption verb on the existing CLI.

**Tech Stack:** TypeScript on Bun; the fork is C++/Qt5 with a vitest suite and a mutation harness; `tools/guide/dump.ts` is the existing typed parser for the dump grammar.

**Specs, in authority order:**

- `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` — **CRITERIA**, the authority for every criterion. Where it and any other document disagree, it wins.
- `docs/superpowers/specs/2026-10-10-stripboard-pipeline-design.md` — **PIPELINE**, the argument and the milestones.
- `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md` — **COST**, the identity `C = N + J − S_occ`.
- `docs/superpowers/specs/2026-10-10-stripboard-move-verb-findings.md` — **MOVE**, the fork's capabilities, with its two overturned mechanism claims.
- `docs/superpowers/specs/2026-10-10-stripboard-remeasurement.md` — **RE-MEASURE**, authoritative where it contradicts COST or MOVE.
- `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` — the parent. This plan implements its **S1a**.

**Scope boundary, stated here because a reader otherwise has to infer it.** This plan delivers
**S1a** and nothing downstream of it: a pipeline, graded and gated. **The five Pultec board
layouts are the parent's `S1`** — *"Perfboard versions of each discrete circuit … the four
remaining Pultec sections laid out, built and measured against the model's predictions"* — and
`S1` was made to depend on `S1a` on 2026-10-10, with the parent recording that *"what remains the
owner's in S1 is the build and the measurement."* So the objective is tracked, in one place, by
one document.

**No task below delivers an S1 layout and no milestone here restates S1's deliverable.** A
deliverable stated in two documents is a deliverable that diverges, and the parent's roadmap row
is the one with the dependency edge and the gate. If a reviewer wants the five layouts scheduled,
the change belongs in the parent's `S1` row, not here.

---

## Global Constraints

These are the suite's binding requirements, carried verbatim where they are quotable, because a plan that paraphrases a criterion becomes a second copy of it that will diverge.

**The parent's governing invariant, which binds every task in this plan:**

> **An agent may never author the acceptance criteria for the specific artifact it is producing.**

Criteria reach an artifact through one of three channels — derived mechanically from the model, taken from a standing reviewed rule library, or supplied by an independent reviewing agent — and never through the producing agent's opinion.

**OBJ2 — no legibility, tidiness or neatness term in `F`, and none may be added.** The test a proposed term must pass: *"it is arithmetic on fields the fork prints, with no latitude inside it; anything else belongs in the rule library or with the reviewer."*

**OBJ3 — a ranking term is not a term in `F`** and cannot make the search accept a worse `F`.

**HC8's independence rule.** The reconstruction *"never reads the `NODE` lines or any `nodeId` field"*. It *"shares no code with the scorer or with `--check`"*. A gate that re-read `GetBoardMembership` under a new name *"would report an independence it does not have, which is worse than no gate because it looks like one."*

**PAR2 — no span figure in prose.** *"No span figure appears in this document or in PIPELINE, because a number copied into prose is a number that goes stale with nothing failing; where a document and the module could disagree, the module wins."* The same rule binds this plan: no task below states a span number, a pad coordinate as a bound, or a lead length. `lib/kicad/lead-span.ts` is the authority for spans. **Both bounds are required parameters with no default and the pipeline refuses without them**, including for a family the module has no datasheet figure for, which refuses **by name**.

**PAR3 — one strict rules file, and one parameter with no default at all.** `stripboard/rules.json`, schema-versioned, **unknown keys rejected** by a strict loader, **each entry carrying a `note` recording why the number is what it is**. E3's worse-acceptance bound has **no default**: *"unconfigured means the mechanism does not run, stated in the report, never quietly approximated."*

**K3 — the clustering bound moves only by ratchet.** Four conditions, all required: a run that demonstrably could not reach it, with its evidence; **the binding constraint named from the constraint side** (`"the search did not get there" is not an admissible cause`); a deliberate edit with a test beside it and the previous value and its reason **kept**; and *"never a silent widening, and never a widening because the gate became inconvenient."*

**K5 — `F ≥ F_floor` on every candidate.** A candidate below the declared floor *"is not an unexpectedly good result — it is proof that one of the two numbers is not the quantity it claims to be"*. The run **refuses**.

**B2 — the frozen fixture is pinned, hashed, and never regenerated.** It lives under `tests/fixtures/`, never under `boards/`. If the extraction cannot produce an export agreeing with the fixture board's own `NODE` and `PIN` counts, *"the fixture is wrong and says which number disagreed"*.

**G3 — a full run leaves `boards/**` byte-identical**, asserted by a test (V7). Candidates live under `build/stripboard/<board>/<stamp>/`, gitignored, never under `boards/`.

**G4 — the four conditions a check must meet to be admitted to `make check`**, all required: the criterion it tests is in CRITERIA with its provenance tag; the criterion has been **reviewed by the owner**; the check is independently tested **including negatively**, with a fixture it must reject by name; and the check **reads data and derives no criterion of its own** — no threshold inside it that is not a parameter in `stripboard/rules.json` or a value in a committed data module, and a missing parameter refuses rather than defaults.

**V9 — no fitted coefficient anywhere.** *"the pipeline reports no ratio fitted across boards, and any constant it carries traces to a derivation, a measurement, or an owner's parameter."* Four boards cannot support a fitted threshold and five could not either.

**R2 — the generate-and-grade split.** The move generator proposes; the grader grades with the full check. The two share no code.

**TEST HONESTY — a test's name and its comment may claim only what its body establishes.** This
is a global constraint because the suite's whole value is that a green run means something, and
*"a skipped check must never look like a passing one"* has an exact analogue here: **a weak check
under a strong name is worse than a weak check under an honest one**, because the honest one is a
known limit while the strong one is a false guarantee nobody re-reads. Two shapes are named
because this plan shipped both and a reading pass did not catch them:

- **A substring scan named as a structural proof.** `expect(text).not.toContain("score.ts")` does
  not establish that a module shares no code with the scorer: one transitive import through any
  third module satisfies it. Where this plan wants a structural claim it computes the **transitive
  import closure** (`tests/stripboard/import-closure.ts`, added in Task 4 and reused by Tasks 14 and 18); where a text scan is
  genuinely all that is wanted, the test's name says *scan* and the comment records what a scan
  does not cover.
- **A self-consistency check named as an agreement with an external authority.** Comparing two
  fields of one hand-written literal against each other proves transcription is internally
  consistent, not that it matches the file it came from. Where a claim names a file, the test
  **opens that file**.

Every task below that adds a check states how it was proved able to fail, **and** that its name
and comment survive being read beside its body. Where a check is weaker than the property it is
about, the weaker guarantee is written down as a limit rather than left as a confident name.

**Repository constraints, from `CLAUDE.md` and `AGENTS.md`:**

- **No fallbacks, no mock data outside tests.** Every unhandled case throws, naming the thing, the observed state and the fix. **Refusals teach.**
- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`.
- **Files 300–500 lines maximum**, split by responsibility.
- **Imports are explicit relative paths with the `.ts` extension.**
- **Component ids are semantic**, never reference designators.
- **Derived artifacts are regenerated every run and compared by content**, never by timestamp.
- **A skipped check must never look like a passing one.**
- **Supersede means delete.**
- **Never place parts or route a board by hand.** This plan builds the pipeline; it writes no `.vrt` itself and places nothing. Where a layout is produced it is produced by the pipeline under a run directory, and the only thing that writes under `boards/` is Task 24's gate.
- `bun test` and `bun run typecheck` pass before every commit. **Commit after each task**, and push.
- **No AI attribution of any kind** in commit messages or PR text.
- Never put `#` inside a Bash heredoc or a multi-line quoted argument: write commit messages and PR bodies to a file with the Write tool and pass `git commit -F` / `gh pr create --body-file`. Never use `sed` to write a file.
- Do not use `git stash` — the stack is shared across worktrees; use a WIP commit.
- Work in this repository on branch `feature/pultec-modular-scaffolding`. Fork work happens ONLY in `.tools/veroroute-perfboard`, which is this repository's own gitignored clone, or in a worktree of it; **never touch `/Users/orion/src/veroroute-perfboard` or `/Users/orion/src/veroroute-perfboard-dump-pins`**, which are the owner's checkouts on other branches.

---

## THE CRUX: the verdict is the product, and a check that cannot fail is worse than no check

The one thing that, if got wrong, invalidates everything else in this plan is **the grader** — `A1` over `HC1`–`HC10`, wired so that every one of the ten is actually evaluated, by code that shares nothing with the search, with a fixture per constraint proving the check can fail.

The argument, in the order it has to be made:

**1. `F` is not the product. The verdict is.** `F` is the number the search descends; the pipeline's output to a person is `run.json`'s `outcome` and the layout it points at. A search that is weak produces an honest report — `bound = search-exhausted`, outcome *valid, below target* — and the owner loses only time. A verdict that is wrong produces a board the owner builds.

**2. The measured failure is exactly this failure.** `tests/fixtures/pultec-low-boost-c19-floated.*` is a committed board with a capacitor in mid-air on which `C` is 5, `NODE` is 9, `GRID` is 14 32 — *"every term in `F` still reads as a healthy board"* (PIPELINE §4.2). `--check` exits 0 on it. The only evidence in the dump is two readings of one predicate. A grader that does not look there scores it as the best candidate of the run and hands it over.

**3. The gap is live, today, in the highest-priority place.** CRITERIA puts `HC10` in `A1` and names `lib/kicad/lead-span.ts` as the place its verifier would read — and records that *"It carries no pin-pattern field yet; §10.3 is that gap."* Verified against the module (Task 2's facts): there is no such field. So a hard constraint in the canonical verdict has no check at all. A constraint whose check silently passes is worse than no constraint, because the verdict claims it held.

**4. This feature has already shipped tests that could not fail, and reading did not catch them.** The fork's own `tests/mutation/README.md` records *"five vacuous tests in this project (four of them the same absence-assertion shape), a Check-is-inert proof that passed against a Check which reconciled the live board, a GUI menu action that could be rewired to do nothing while 157 tests passed"* — *"Every one of those was found by making a change and observing that nothing failed."* So "the check is written" is not evidence that the check works, and every task below that adds a check says how it was proved able to fail.

**5. Everything else in this plan is recoverable and this is not.** A wrong `τ` is a parameter in a reviewed file. A missing batch verb costs breadth, which PIPELINE §4.6 quantifies as a ratio between two measured numbers and nothing else. A weak search is reported as weak. `κ_bench` set too hard is the *expected* early outcome and REP5's middle outcome exists to say so. But an `A1` that passes an unbuildable board is a confident wrong answer, and the owner's question — *"can I build this?"* — is the one it answers wrongly.

**What follows from naming this the crux, concretely:**

- The grader (Task 14) is one module with one entry point, and **no task may add a hard-constraint check anywhere else.** Ten constraints, ten named results, one verdict.
- **No `HC` check may be skipped, defaulted or inferred.** Where its data is missing it refuses by name (`PAR2`'s posture, extended to `HC10` by Task 2).
- **Every `HC` check gets a fixture it must reject by name** (V4), and the fixture is part of the task that adds the check, not a later tidy-up. **`HC10` gets two**, one per half, because it is checked in two places (below).
- The grader imports nothing from `tools/stripboard/score.ts`, and Task 14 asserts that over the **transitive import closure** of `grade.ts` and `constraints.ts` — not by scanning their text, which a transitive import satisfies.
- **`HC10` is one constraint checked in two halves, and both must hold for it to hold.** CRITERIA's criterion sentence is about a *placement* — *"every placed part's pins lie on straight lines parallel to the strips"* — while its "Checked by" column specifies a *footprint-level* classification. Task 2 implements the footprint half; **Task 14 implements the placement half**, over each placed component's resolved `PIN` positions and its `DIRECTION` against the strip axis. A footprint that could be placed compatibly and a layout that actually placed it compatibly are two claims, and the earlier draft of this plan proved only the first while the verdict asserted the criterion. There are still **exactly ten** `ConstraintId`s: no criterion is added, because both halves are clauses of `HC10`'s own wording.
- Task 2 comes before the grader because the grader cannot be complete without it, and it comes before the search because a search graded by an incomplete verdict produces boards nobody can trust and cannot be re-graded without re-running.

---

## Facts established against the code

Each was checked in this repository or in `.tools/veroroute-perfboard` while this plan was written. A task that contradicts one of these is a task written against a stale fact.

**The suite, before this plan: 1247 pass, 0 fail, 0 skip, 111 files (`bun test`); `bun run typecheck` clean.**

**What is already done, verified rather than assumed:**

- **M1.2** — `Src/Headless_placement.cpp` / `.h` exist in the fork and the guard is in `Src/Headless_stretch.cpp`. `veroroute.pin` names `2d67ec6f30268ea00a31002451740e8d4f2c5e22`, and `git branch -a --contains 2d67ec6` shows it on `feature/stretch-floating-refusal` **and on `origin/feature/stretch-floating-refusal`**, so the pin names a pushed commit and a fresh clone can build it.
- **M1.3 + M1.4** — `.tools/veroroute-perfboard` is on local branch `feature/headless-move` at `0bf46e5` ("eight mutations for --move's guards, measured not predicted"), one commit past `396d6d2` ("--move takes an absolute destination, and refuses rather than landing elsewhere"). `Src/Headless_move.cpp` / `.h` exist, `--move` is `kShipped` in `kHeadlessFlags[]`, `Headless_help.cpp` documents it at line 259 with `--to` and `--delta`, and `tests/move.test.ts` exists beside `tests/mutation/`. **`git branch -a --contains 0bf46e5` returns `feature/headless-move` only: it is not pushed**, and `veroroute.pin` still names `2d67ec6`. So a fresh clone builds a binary with no `--move`.
- **`.tools/veroroute-perfboard/.built-commit` reads `2d67ec6`** while the binary in that tree contains the `--move` strings. That is D25's hazard live in the working tree: the stamp claims a build the binary is not. Task 1 is what makes the two agree again.
- **Per-family lead spans** — `lib/kicad/lead-span.ts` (451 lines) exports `LEAD_SPANS` (13 entries), `UNSOURCED` (2 entries) and `leadSpanFor(footprint, spans?, unsourced?)`, which throws by name for both an unlisted and an unsourced footprint. `lib/kicad/lead-span-model.ts` holds the arithmetic, `DatasheetRef`, `FormableGeometry`, `RigidGeometry`, `FamilyGeometry`, `LeadSpan` with `minSpanHoles` / `maxSpanHoles` / `formable` / `minBasis` / `maxBasis`, `TOOL_MIN_SPAN_HOLES = 2`, `TOOL_MAX_SPAN_HOLES = 16`. `tests/kicad/lead-span.test.ts` recomputes every recorded integer from the recorded dimensions — the split exists to catch a transcription error.
- **`LeadSpan` carries no pin-pattern field.** Confirmed by reading the interface. CRITERIA §10.3 is that gap and Task 2 is this plan's answer to it.

**The footprint files, read off disk on 2026-10-10, because Task 2's data comes from them and one of its tests must open them.**

- The library root is `/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints`, and a footprint is `<Library>.pretty/<Name>.kicad_mod`. It is the same root `tests/circuits/kicad-round-trip.ts` derives `KICAD_CLI` from, and that file is the precedent for how a missing KiCad must behave: *"a missing kicad-cli FAILS them rather than skipping"*, with the refusal naming the path, the override and why the test does not skip.
- **All thirteen footprints in `LEAD_SPANS` resolve**, every one at `(version 20260206)`, and **every pad in all thirteen carries a name** — there is no unnamed or NPTH pad in the set, so "transcribed pads" and "`(pad …)` forms in the file" are the same count today. That is a measured fact and not a rule, so Task 2 records an exclusion list rather than assuming it stays empty.
- A pad form spans several lines: `(pad "<name>" <type> <shape>` opens it and `(at <x> <y> [rot])` is the first `(at …)` inside it. Pad counts measured: two for each of the six two-lead passives in `LEAD_SPANS` and both `UNSOURCED` entries, one for `PinHeader_1x01`, five for `PinHeader_1x05`, sixteen for `DIP-16_W7.62mm`, three each for `TO-92_Inline` and the Runtron trimmer.
- **Three of the thirteen have an along-row pad pitch that is NOT a whole number of grid steps** within `PITCH_TOLERANCE_MM`, computed through `nearestGridSteps`: `TO-92_Inline` at 1.27 mm, `CP_Radial_D5.0mm_P2.00mm` at 2.00 mm, and `CP_Radial_D8.0mm_P3.50mm` at 3.50 mm. **`TO-92_Inline` is the one of the three that `lead-span.ts` records as `formable: false`** (`geometry.kind === "rigid"`); the two radials are formable families whose reach `lead-span.ts` already records with a datasheet. This is why Task 2's along-row clause is not simply "unconstrained" — see **Formed leads** there.
- Every other entry's along-row pitch is on the grid, several only inside `PITCH_TOLERANCE_MM` (the 5 mm and 2.5 mm pitches), which is the phenomenon that tolerance exists for.

**What `BOUNDS` actually measures, read from `Src/Board.h:710` and checked against four committed boards.** It is **not** one quantity and it is **not** the fabrication extent. `Board::GetBounds` returns the union of **three** sources and reports failure only when all three are empty:

1. every grid element, on every layer, whose `GetNodeId() != BAD_NODEID` **or** whose `GetLyrHasPin()` is true — painted copper, including a wire's run and a solder-bridged hole, plus every pin hole whether painted or blank;
2. `m_compMgr.GetBounding()` — the union of every component's `GetFootprintRect()`, which is `Rect(GetRow(), GetLastRow(), GetCol(), GetLastCol())`, plus the trax pattern's rect. **It filters on neither `GetIsPlaced()` nor type**, so an unplaced component still contributes a rect;
3. `m_textMgr.GetBounding()` — the union of every **text label**'s rect, which is an annotation and not a physical feature at all.

So `BOUNDS` can **over**-state the material a board needs (a label in a corner, a floating part's stale rect) and nothing in the fork guarantees it covers every feature a cut depends on. Measured on the four committed boards, with the extents computed from the dumps' own lines: on `transistor-preamp-feedback` **two wire endpoints** lie outside the `PIN`-hole bounding box, and on `transistor-preamp-staged` **four wire endpoints and two solder-bridge holes** do. So the physical features genuinely reach past the pin extent on real boards, which is why Task 14 computes a **fabrication extent** rather than reading one number and calling it the answer.
- The `midMode: off` scaffold change, the governance reversal (commit `5089cda`) and the acceptance-criteria extraction are all landed; `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` is committed at 738 lines.

**What the five boards in S1a's scope actually place.** Computed by iterating `physicalBoard(section).components` for all five sections and collecting `part.footprint`:

```
Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm
Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm
Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm
Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical
Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal
```

Five footprints, **all five in `LEAD_SPANS`**. So `HC5` and `HC9` have their data for the Pultec set today, and `HC10` is the only missing datum.

**What the benchmark set places that has no span.** `pt2399-core` carries `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` and `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm`, both in `UNSOURCED`, and `Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, which is in neither map. **So a full `A1` grade of `pt2399-core` is impossible today and `PAR2` is why.** That is correct behaviour, and it fixes what the benchmark set is for: PIPELINE §3.5 uses it to **validate the grader** through `HC8`'s agreement with the reference netlist, which needs no span data, and to **ground** `κ_bench`. Task 5 grades those boards with `HC8` only and says so; nothing in this plan asks for `A1` on them.

**Existing machinery the tasks build on:**

- `tools/guide/dump.ts` — `parseBoardDump(dump: string): BoardDump`, with `BoardDump { grid, verticalStrips, parts, pins, wires, nodes, cutState, cuts, bridges }`, `Part { ref, type, value, placement, span }`, `PartPlacement = {row, col} | "floating"`, `Pin { pin, row, col }`, `HolePosition`, `NodedHole extends HolePosition { nodeId }`, `Cut { a, b }`, `Bridge { a, b }`, `Wire { name, ends }`, plus `holeName`, `rowName` and `REBUILD_PINNED_FORK`.
- `tools/perfboard/acquire.ts` — `readPin(file): Pin`, `resolveBinary(env, repoRoot)`, `acquire(pin, opts)`, `builtCommit(repoRoot): string | undefined` (`undefined` means unknown and must be treated as "not the pinned commit"), `builtCommitFile(repoRoot)`.
- `tools/perfboard/declaration.ts` — `loadDeclaration(file): PerfboardDeclaration` with `{ file, dir, circuitPath, exportName, vrtPath, schPath?, netlistPath? }`. `boards/<board>/perfboard.json` currently declares `circuit`, `export`, `vrt` and nothing else; `PAR4`'s stock field is new in Task 14.
- `tools/cli/perfboard.ts` — a `VERBS` table of fourteen verbs, `-C <dir>` for context, no `BOARD=` variable, dispatchers in `tools/cli/perfboard-binary-verbs.ts`.
- `make/board.mk` — per-board targets `check`, `cuts`, `import`, `update`, `stripboard`, `edit`, `guide`, `bom`, `wiring`, `board-info`; `make/veroroute.mk` owns `VEROROUTE` and `QMAKE` resolution and the `veroroute` target.
- `lib/kicad/grid.ts` — `GRID_MM = 2.54`, `PITCH_TOLERANCE_MM = 0.15` (*"sized for one specific phenomenon: KiCad names imperial parts in rounded metric"*), `nearestGridSteps`, `gridStepsAtMost`, `gridStepsAtLeast`, `holesForSteps`.
- `lib/kicad/import-string.ts` — the footprint-to-VeroRoute-type derivation, `MIN_SPAN` / `MAX_SPAN`, and the whitelist posture Task 2 copies.
- `tests/perfboard/floating-fixture.test.ts` — already asserts the floated-`C19` fixture's two `HC3` signals and that every term of `F` reads healthy on it, including a *control* built by string-replacing the dump text to put `C19` back. Task 4 reuses that technique and that file is the precedent for it.
- The fork's `tests/mutation/` harness: `pnpm mutate [name]`, `pnpm mutate --list`, `pnpm mutate --self-check`, and the rule that *"a BREAKS-IF comment is a mutation you actually ran"*. Every fork task below adds its mutations to that catalogue.
- The fork's `tests/usage.test.ts` enforces `kHeadlessFlags[]` / `Headless_help.cpp` agreement in both directions, so a verb registered in one place only fails rather than hanging a build.

**The two MOVE mechanism claims that are overturned, because two tasks below would otherwise be written against them:**

1. **`MakeToroid`'s wrap never fires.** `Pan()` runs first and either grows the board or clamps. Measured on a 35×35 fixture during M1.3/M1.4: `--move --to 40,5` exits 0 with `PART R1 … AT 40,5` and `GRID 41 35` — the board *grew*; `--move --to -5,5` exits 0, the part lands at `0,5`, **and R2, R3 and R4, never named on the command line, move from row 0 to row 5.** A caller holding hole coordinates from before the gesture now holds coordinates into a different numbering. Tasks 8 and 9 verify the landing and report the pan; neither reasons about `MakeToroid`.
2. **`assert` is not live.** `Src/Common.h:23-25` defines `NDEBUG` itself, so a zero delta **wrote a board** byte-identical to its input rather than aborting. *"That is worse than the abort this section feared, not better"* — a no-op candidate a search loop cannot distinguish from a real move. M1.3's guard is adopted for that reason and not for crash-avoidance.

---

## Owner-blocked items, marked rather than planned around

Five. Each names what is blocked, what unblocks it, and what proceeds meanwhile. **No task below invents a value or a mechanism for any of them.**

| | Blocked on | What is blocked | What proceeds |
| --- | --- | --- | --- |
| **OB1** | **The owner authorising an outward-facing push** to `oletizi/veroroute-perfboard`. | Task 1's push of `feature/headless-move`, and the pushes in Tasks 7, 8 and 9. | Nothing, and that is the point: until the branch is pushed and `veroroute.pin` advanced, a fresh clone builds a binary with no `--move` and every later task is unreproducible on another machine. Task 1 is first for this reason. |
| **OB2** | **The owner reviewing CRITERIA.** Its status is `draft-for-owner-review`. | Task 25, which admits the `HC5`/`HC8`/`HC9`/`HC10` verifiers to `make check` — `G4`'s second condition is *"the criterion has been reviewed by the owner"*. | Every check still runs on the adoption path (Task 24), which is `G2.5`. `make check`'s verdict is unchanged until Task 25. |
| **OB3** | **`τ` and Q4's `1/2000` being PIPELINE's proposed defaults, not the owner's settled values** (CRITERIA §10.2). | Nothing is blocked from being *built*; what is blocked is treating a `Q2`/`A3` pass as the owner's tolerance having been met. | Task 10 puts both in `stripboard/rules.json` with a `note` recording that they are **proposed** and not owner-settled, and Task 20's report prints that provenance beside the number whenever `A3` or `Q2` decides an outcome. A proposed default used knowingly is not the same failure as one used silently. |
| **OB4** | **`pt2399-core`'s 17 × 36 pin extent exceeding the declared 34 × 27 stock** (CRITERIA §10.1). A built board that works violates a hard constraint, which *"is exactly the signal that a constraint is wrong"*. | Enforcing `HC6` on any board outside the Pultec set. | Task 14 reads the stock from `boards/<board>/perfboard.json` when the board declares one and from the `34 × 27` default otherwise, and `pt2399-core` is **never graded under `A1`** in this plan (it is a `HC8` agreement fixture only, Task 5). CRITERIA: *"Resolve it before HC6 is enforced on any board outside the Pultec set."* |
| **OB5** | **How `HC8`'s board-level short fixture is produced.** No verb in the pinned fork edits a cut: `--help` lists `--dump-netlist`, `--dump-board`, `--import`, `--update`, `--check`, `--adopt`, `--set-strips`, `--stretch` and `--move`, and the test-only `--author` takes `group|select|move-label|add-wire|merge|autofill`. **None of the fifteen edits a cut**, so the floated-`C19` capture route does not transfer. | Task 6, the `.vrt` fixture whose `--check` exits 0 while two reference nets share copper. | Task 4 proves the short *direction* of `HC8` from hand-written dump text, which is the module's real input seam and is the same technique `tests/perfboard/floating-fixture.test.ts` already uses. What Task 6 adds and Task 4 cannot is the end-to-end claim that **no pre-existing check catches it**, which needs a board `--check` can be run against. The plan does not choose between CRITERIA's three candidate routes. |

---

## The order, re-derived

PIPELINE §4's M1 order is M1.2 → M1.7 → M1.3 → M1.4 → M1.1 → M1.5 → M1.6, and M1.2, M1.3 and M1.4 are done, so the surviving fork items are M1.7 (which is no longer a fork change at all), M1.1, M1.5 and M1.6. The order below is re-derived from what is impossible before each item.

| # | Task | Why here, where it is not obvious |
| --- | --- | --- |
| 1 | Publish `--move`, advance the pin | **First, because nothing after it is reproducible.** The verb exists only in one working tree; `veroroute.pin` names a commit without it. Until the pin names a pushed commit that has `--move`, every actuating task below passes on one machine and fails on a clone — and the `.built-commit` stamp currently disagrees with the binary beside it, which is the exact condition D25 exists to make visible. |
| 2 | `HC10`'s pin-pattern data | **Before the grader, because the grader is incomplete without it, and before the search, because a search graded by an incomplete verdict produces boards that must be re-run rather than re-graded.** It is the crux's live instance. It needs no fork change and no pipeline code. |
| 3–5 | `HC8`: contract, graph, equivalence, independence, agreement | **Before any generator exists**, which PIPELINE §4's ordering table calls *"R2's generate-and-grade split at its strongest"*: the grader cannot be written around a generator that is not there. It no longer waits on a fork change (PIPELINE §4.7). Task 5 needs the frozen fixture, so the fixture is extracted inside it. |
| 6 | `HC8`'s board-level short fixture | **OB5.** Placed after Task 5 so that everything it could block has already landed. |
| 7 | M1.1: `BOUNDS`, `DIRECTION`, help | **Before M1.5**, because `DIRECTION` is M1.5's effect check and *"reading the orientation directly is what makes the check independent of the lead pattern, and a single-pad or symmetric part has no lead pattern to read"*. Also before Task 15, whose `A_occ` is specified as a direct reading of `BOUNDS` and for which the `PIN`-hole bounding box *"is a different quantity"*. |
| 8 | M1.5: `--rotate` | **Before the search**, because orientation is the axis behind 68–75% of every board's cuts and `--import` never tries any direction but `'W'`. A climb without it cannot reach the dominant lever. |
| 9 | M1.6: the batch move | **Last of the fork work, because nothing is impossible without it.** It buys breadth: removing the 10.78 ms launch floor from the 11.71 ms invocation raises the rate by about 12×, a ratio between two measured numbers. Grouped with the other fork tasks so the pin advances in one cadence rather than being revisited after Milestone 2; it may be deferred past Task 24 without blocking anything, and that is stated so a reviewer can reject it alone. |
| 10 | The rules file | **First of Milestone 2**, because every later module refuses without its parameters and `PAR3`'s strict loader is the thing that makes a missing parameter loud. |
| 11 | P0 targets and the floor | Before the scorer, because `K5`'s `F ≥ F_floor` needs `F_floor` to exist before anything is scored. |
| 12 | The scorer | After 10 and 11. Carries V1, V2 and K5. |
| 13 | The run directory and manifest | After the scorer, so every later task writes into a run directory rather than growing one later. Carries G3 and V7. |
| 14 | The grader | After 2, 3–5, 7 and 10: it needs `HC10`'s footprint data, `HC8`'s module, `BOUNDS` and `DIRECTION` from 7, and the rules file for the stock default. **The crux.** **`HC10`'s placement half needs `DIRECTION`, which is Task 7 (M1.1) — and Task 14 was already after Task 7 for `BOUNDS`, so adding it reorders nothing.** Ends with **Checkpoint 1**. |
| 15 | The ranking | After 7 (`BOUNDS`) and 14 (the grader decides which candidates are rankable). |
| 16–19 | P1's three starting arms, P2 climb, the escapes, stopping | In that order: the arms before the climb because the climb needs something to start from, single-part climb before the escapes so the escapes have a baseline to be measured against, stopping last because `Q3` is a restart trigger before it is a stop and cannot be written before restarts exist. **Task 16's arm comparison is RUN at Task 18's final step, not at Task 16**: it needs a runner, and the question it answers — whether the start matters once restarts are cheap — cannot be asked before `E2` exists. |
| 20 | The verdict and the report | After stopping, because `Q1` and `Q2` require the admissibility verdict and the report is keyed by both the `bound` and the `outcome`. Ends with **Checkpoint 2**. |
| 21 | Determinism | After the escapes, because every non-determinism this plan introduces arrives with them, and V6 compares restart boundaries. |
| 22 | V5 and V9 | After the search, because V5 compares the pipeline's placement against `--import`'s on the same board and there is nothing to compare before. |
| 23 | The B1-frozen run | After everything the run needs. It is the externally authored criterion and the first thing the pipeline is pointed at. |
| 24 | The adoption gate | Last of the pipeline, because it refuses on hashes and verdicts that Tasks 13 and 20 produce. |
| 25 | Admitting the verifiers to `make check` | **OB2.** Last, and separable: a reviewer may reject it while approving Task 24. |

**Two integration checkpoints, and they are not tasks.** Twenty-five tasks, each of which lands
its own tests, and **two points where the pieces are pointed at real artifacts and the output is
read**. They are the last step of Task 14 and the last step of Task 20 rather than numbered tasks
of their own, because a checkpoint delivers no module and renumbering twenty-five tasks to insert
two would strand every cross-reference in this document.

| | Where | What it runs, and what it is for |
| --- | --- | --- |
| **Checkpoint 1** | Task 14, final step | The grader — all ten constraints — against four **real, previously validated, hand-laid** layouts: `pultec-low-boost` (through the frozen pair), `pt2399-core`, `transistor-preamp-feedback`, `transistor-preamp-staged`. All four are committed and pass `make check` today. It is the first point at which all ten hard constraints meet, and unit fixtures are hand-written dump text: **four boards a person actually built is the first evidence the grader is pointed at reality.** The verdicts are read, not merely asserted. |
| **Checkpoint 2** | Task 20, final step | `seed → climb → escapes → stop → verdict → report`, end to end on one Pultec board, before any optimisation benchmarking. The report is read in full. It is the first point where the `bound` and the `outcome` are produced by the machinery rather than by a test's fixture, and the thing it catches is a chain that is correct in every part and wrong when joined. |

**Checkpoint 1 expects the grader to REFUSE `pt2399-core`, and that is the checkpoint passing.**
Its extent is 17 × 36 against the declared 34 × 27 stock (`OB4`, measured again here: its `PIN`
holes run `0,0`–`16,35`), and it places three footprints with no span data — two in `UNSOURCED`,
one in neither map (`PAR2`, which refuses **by name**). Both are known owner-blocked conflicts. So
the checkpoint **records the verdict and the refusal's wording** and does not treat either as a
failure; what would be a failure is `pt2399-core` grading as **admissible**, because that would
mean `HC6` or `PAR2`'s refusal is not wired in. The checkpoint asserts the refusal names the
footprint and the extent, which is the discriminating observation.

---

## File structure

```
veroroute.pin                              advanced by Tasks 1, 7, 8, 9
stripboard/rules.json                      NEW: PAR3's one strict rules file
lib/kicad/pin-pattern-model.ts             NEW: HC10's classification arithmetic
lib/kicad/pin-pattern.ts                   NEW: HC10's per-footprint pad data
docs/stripboard/pin-pattern.md             NEW: why each classification is what it is
docs/stripboard/pipeline-verification.md   NEW: created by Task 3, extended by 7, 14, 18, 22, 23
tools/stripboard/rules.ts                  NEW: the strict loader
tools/stripboard/targets.ts                NEW: P0 - N, P, C_floor, the net graph
tools/stripboard/score.ts                  NEW: F, the identity self-check, the floor invariant
tools/stripboard/copper.ts                 NEW: HC8's copper graph from the dump geometry
tools/stripboard/equivalence.ts            NEW: HC8's partition comparison and verdict
tools/stripboard/extent.ts                 NEW: HC6's fabrication extent, and the trim check
tools/stripboard/grade.ts                  NEW: A1 over HC1-HC10 - THE CRUX
tools/stripboard/constraints.ts            NEW: one function per hard constraint
tools/stripboard/rank.ts                   NEW: OBJ3's declared ranking and A_occ
tools/stripboard/run-dir.ts                NEW: run directories, canonical hash, manifest
tools/stripboard/seed.ts                   NEW: P1's three starting arms behind one selector
tools/stripboard/seed-compare.ts           NEW: the arm comparison, its mark and its retirement rule
tools/stripboard/moves.ts                  NEW: the move set, including E1's net-cluster move
tools/stripboard/climb.ts                  NEW: P2, acceptance, restarts
tools/stripboard/stop.ts                   NEW: Q1-Q6
tools/stripboard/verdict.ts                NEW: A1-A4 and REP5's outcome
tools/stripboard/report.ts                 NEW: REP1-REP4, wording generated from the fields
tools/stripboard/adopt.ts                  NEW: G1/G2's gate
tools/cli/perfboard-stripboard-verbs.ts    NEW: the `place` and `adopt` dispatchers
tools/cli/perfboard.ts                     gains two verbs
tools/guide/dump.ts                        gains BOUNDS and Part.direction (Task 7)
make/board.mk                              gains `place` and `adopt` targets
.gitignore                                 gains build/stripboard/
tests/fixtures/stripboard/                 NEW: the frozen fixture and the negative fixtures
tests/stripboard/*.test.ts                 NEW: one file per module above
tests/stripboard/import-closure.ts         NEW: the transitive import closure, shared by three tests
tests/kicad/footprint-library.ts           NEW: the library root, resolved or refused - never skipped
tests/kicad/pin-pattern.test.ts            NEW
```

**The two shared test helpers are helpers and not tests**, named without `.test.ts` the way
`tests/circuits/kicad-round-trip.ts` is, because three tasks make the same structural claim and
three copies of a closure walker is three places for one claim to be wrong. Both **refuse** rather
than degrade: an import the walker cannot resolve is an error naming the importer and the
specifier, and a missing footprint library is an error naming the path and the override, because a
closure computed over a partial graph and a scan over a library that is not there are both checks
that pass by looking at nothing.

In the fork (`.tools/veroroute-perfboard`):

```
Src/Headless_dump.cpp          BOUNDS and DIRECTION appended (Task 7)
Src/Headless_help.cpp          the false SPAN claim corrected (Task 7); --rotate, --move-batch
Src/Headless_rotate.cpp/.h     NEW (Task 8)
Src/Headless_move_batch.cpp/.h NEW (Task 9)
Src/veroroute.pro              the new files
tests/rotate.test.ts           NEW (Task 8)
tests/move-batch.test.ts       NEW (Task 9)
tests/mutation/catalogue.*     one entry per guard each task adds
```

---

### Task 1: Publish `--move` and advance the pin

**OWNER-BLOCKED (OB1): step 2 pushes a branch to `oletizi/veroroute-perfboard`, which is an outward-facing push to the owner's own GitHub repository. The owner authorises it. Do not push without that authorisation; if it is withheld, stop after step 1 and report BLOCKED rather than working around it by pinning a local commit — `acquire.ts` fetches from the pin's `repo`, so a local-only commit makes `veroroute` fail on every machine including this one after a reclone.**

**Files:** `.tools/veroroute-perfboard` (branch `feature/headless-move`); modify `veroroute.pin`; test `tests/perfboard/acquire.test.ts` is unchanged and must still pass.

**Interfaces:**
- *Consumes:* nothing from earlier tasks.
- *Provides:* a `veroroute.pin` whose `commit` is reachable from `origin` and whose binary has `--move BOARD --ref NAME (--to R,C | --delta R,C) -o OUTPUT`, and a `.built-commit` stamp that agrees with it. Tasks 7, 8, 9, 16, 17 and 23 all depend on `--move` existing in the binary a clone builds.

- [ ] **Step 1: Establish what is and is not published, and record it.** In `.tools/veroroute-perfboard`:

```
git -C .tools/veroroute-perfboard branch -a --contains 0bf46e5
git -C .tools/veroroute-perfboard branch -a --contains 2d67ec6
git -C .tools/veroroute-perfboard log --oneline 2d67ec6..0bf46e5
cat .tools/veroroute-perfboard/.built-commit
```

  Expected, from the facts above: `0bf46e5` on `feature/headless-move` only; `2d67ec6` also on `origin/feature/stretch-floating-refusal`; two commits in the range; the stamp reading `2d67ec6`. **If the stamp already reads `0bf46e5`, the binary and the stamp agree and only the push and the pin remain — say so rather than rebuilding for nothing.**

- [ ] **Step 2: Run the fork's suite at `0bf46e5` before pushing anything**, because a branch pushed red is a branch somebody pins. From `.tools/veroroute-perfboard/tests`: `pnpm install --frozen-lockfile` then `pnpm test`. Then `pnpm mutate --list` and confirm the eight `--move` mutations `0bf46e5`'s message names are in the catalogue; run `pnpm mutate <name>` for the two that cover the landing check and the all-components-placed check, and confirm each reports the suite failing. **A guard whose mutation does not fail is a guard this task must not publish.**

- [ ] **Step 3: Push the branch and open a PR.** `git -C .tools/veroroute-perfboard push -u origin feature/headless-move`. Then open a PR against `main` with `gh pr create --base main --head feature/headless-move --title "--move takes an absolute destination, with guards for the zero delta and the silent float" --body-file <path>`, the body written with the Write tool (never a heredoc) and stating: what the verb does; that `MakeToroid`'s wrap never fires because `Pan()` runs first, with the two measured `--to 40,5` and `--to -5,5` results; that `assert` is not live because `Src/Common.h` defines `NDEBUG` itself, so a zero delta wrote a board rather than aborting; and the mutation names that prove each guard. **Do not merge: merging is the owner's call.**

- [ ] **Step 4: Advance the pin, in its own commit.** Edit `veroroute.pin`'s `commit` field to `0bf46e5`'s full 40-character sha. Then `bun run perfboard veroroute --force` and confirm from its output that the clone checked out that commit and the build completed. Then:

```
cat .tools/veroroute-perfboard/.built-commit
.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute --help | grep -A 2 -- '--move'
```

  The stamp must read the new sha, and `--help` must document `--move` with both `--to` and `--delta`. **If `acquire.ts` cannot check out a commit that is on a pushed branch but not on `main`, report BLOCKED rather than working around it** — it fetches `origin` and retries once, so this should work, and if it does not, the fix belongs in `acquire.ts` with a test.

- [ ] **Step 5: Verify the verb against a scratch copy, never a board under `boards/`.**

```
cp boards/pultec-low-boost/pultec-low-boost.perfboard.vrt "$SCRATCH/low.vrt"
V=.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute
$V --dump-board "$SCRATCH/low.vrt" | grep '^PART C19'
$V --move "$SCRATCH/low.vrt" --ref C19 --to 3,13 -o "$SCRATCH/m0.vrt" ; echo "exit=$?"
$V --move "$SCRATCH/low.vrt" --ref C19 --delta 0,0 -o "$SCRATCH/m1.vrt" ; echo "exit=$?"
ls "$SCRATCH/m1.vrt" 2>&1
```

  `--to 3,13` is `C19`'s current hole, so it is the zero-delta case expressed as a destination: it must exit non-zero, name the zero delta, and write no output. The explicit `--delta 0,0` must do the same. **Record both exit codes and both messages in the commit message** — they are the evidence that M1.3's guard is in the published binary and not only in a working tree.

- [ ] **Step 6: Run** `bun test && bun run typecheck`, then `make -C boards/transistor-preamp-staged check` and `make -C boards/pt2399-core check` to confirm the new binary has not moved a passing board's verdict. Confirm `make check`'s red set across `boards/` is unchanged from the four unrouted Pultec boards plus `transistor-preamp-lab`.

- [ ] **Step 7: Commit.** Two commits, because they are two facts: one in the fork (already made, `0bf46e5`), and one here — "Pin the VeroRoute fork at the commit whose --move takes a destination", whose body carries step 5's exit codes and messages and step 1's published-ref evidence. Push this repository's branch.

---

### Task 2: `HC10`'s pin-pattern data, and the refusal for an unclassified footprint

**THE CRUX'S LIVE INSTANCE. `HC10` is in `A1` and nothing classifies a footprint's pin pattern, so today the verdict would claim a constraint held that was never checked.**

**Files:** create `lib/kicad/pin-pattern-model.ts`, `lib/kicad/pin-pattern.ts`, `docs/stripboard/pin-pattern.md`, `tests/kicad/footprint-library.ts`; test `tests/kicad/pin-pattern.test.ts`.

**Interfaces:**
- *Consumes:* `GRID_MM`, `PITCH_TOLERANCE_MM`, `nearestGridSteps` from `lib/kicad/grid.ts`; `DatasheetRef` from `lib/kicad/lead-span-model.ts`; `leadSpanFor` and `LEAD_SPANS` from `lib/kicad/lead-span.ts` (in the test and in `admitPattern` only, never in the data file).
- *Provides, and Task 14's `HC10` footprint half consumes exactly these:*
  - `PadPosition { readonly pad: string; readonly xMm: number; readonly yMm: number }`
  - `PadSource { readonly file: string; readonly version: string; readonly padCount: number; readonly excludedPads: readonly { readonly pad: string; readonly reason: string }[] }`
  - `RowDecomposition { readonly axis: "x" | "y"; readonly rows: readonly (readonly string[])[]; readonly rowPitchSteps: readonly number[]; readonly alongRowPitchesMm: readonly number[]; readonly alongRowOnGrid: boolean }`
  - `PatternClassification = { readonly kind: "rows" } & RowDecomposition | { readonly kind: "off-strip-lattice"; readonly reason: string }`
  - `classifyPads(pads: readonly PadPosition[]): PatternClassification`
  - `GridAccommodation = { readonly kind: "as-moulded" } | { readonly kind: "formed-to-grid"; readonly preparedPitchSteps: number; readonly basis: string; readonly source: DatasheetRef }`
  - `PatternEligibility = { readonly kind: "eligible"; readonly accommodation: GridAccommodation; readonly detail: string } | { readonly kind: "refused"; readonly reason: string }`
  - `admitPattern(pattern: PinPattern): PatternEligibility`
  - `preparedExtentsHoles(pattern: PinPattern): readonly number[]` — the pattern's hole extent on each of its two axes after any recorded preparation: the along-row extent and the across-axis row count, in that order, so the cross-check against `leadSpanFor` is over stated quantities rather than a re-derivation at the call site
  - `PinPattern { readonly footprint: string; readonly pads: readonly PadPosition[]; readonly source: PadSource; readonly classification: PatternClassification; readonly accommodation: GridAccommodation; readonly basis: string }`
  - `PIN_PATTERNS: ReadonlyMap<string, PinPattern>`
  - `pinPatternFor(footprint: string, patterns?: ReadonlyMap<string, PinPattern>): PinPattern` — throws by name for an unlisted footprint.
- **Which module each export lives in**, because `admitPattern` consumes `PinPattern` and a type declared in the data file would make the data file the arithmetic's dependency: **`lib/kicad/pin-pattern-model.ts`** holds every type above — `PadPosition`, `PadSource`, `RowDecomposition`, `PatternClassification`, `GridAccommodation`, `PatternEligibility`, `PinPattern` — and the three functions `classifyPads`, `admitPattern` and `preparedExtentsHoles`. **`lib/kicad/pin-pattern.ts`** holds `PIN_PATTERNS` and `pinPatternFor` and **declares no type**, exactly as `lead-span.ts` holds the data and `lead-span-model.ts` holds the arithmetic. That split is the one the lead-span pair already uses and the reason it exists there is the reason it is copied here: a transcription error is caught by arithmetic that cannot have been written to match it.
- `tests/kicad/footprint-library.ts` provides `FOOTPRINT_LIBRARY_ROOT: string`, `footprintFile(name: string): string`, `FootprintPads { readonly pads: readonly PadPosition[]; readonly version: string; readonly padCount: number; readonly file: string }` and `readFootprintPads(name: string): FootprintPads` — **test-side only**, because reading a `.kicad_mod` at run time would make the pipeline depend on a KiCad install while `PIN_PATTERNS` exists precisely so it does not.

**Where the classification is a decision and where it is arithmetic, decided here because `HC10`'s own words leave it open and a later task must not re-open it.**

`HC10` refuses *"a pattern not decomposable into rows parallel to the strips"*, and names *"rows plural, and decomposability is the test"*. Two axes, two different rules, and the asymmetry is physical rather than chosen:

- **Across the strips, the row separation must be a whole number of grid steps.** A row of pads lands on one strip and the next row on another, and the strip pitch is 2.54 mm. There is no bending that puts a lead between two strips. This is the clause that refuses outright.
- **Along a row, the pad spacing does not have to be a grid multiple — but an off-grid pitch is an accommodation, which must be RECORDED and not inferred.** A lead moves along its own strip by entering a different hole in it, so the along-row direction has latitude the across direction does not. **What that latitude is not is unlimited**, and the worked case is the one that makes the point: `Package_TO_SOT_THT:TO-92_Inline`'s three pads read `(at 0 0)`, `(at 1.27 0)` and `(at 2.54 0)` from the `.kicad_mod` — collinear, at **half** a grid step. **Collinearity does not establish that those leads enter holes.** Two of the three are between holes as moulded, and what puts them in holes is *forming the leads* — a physical accommodation performed once with pliers, which `lib/kicad/lead-span.ts` already describes in prose: *"the part is splayed to the grid once, as a fixed preparation, and is not a lever afterwards."*

**Formed leads, and the discipline they get.** A footprint that needs formed leads is **explicitly
supported and recorded as such**, with the same provenance the lead spans carry, and is never
admitted because its pads happened to be collinear. The rule, in three clauses:

1. **On-grid along the row** — every along-row pitch is a whole number of grid steps within `PITCH_TOLERANCE_MM`: the accommodation is `as-moulded` and nothing more is needed. The part drops in.
2. **Off-grid along the row, on a family `lead-span.ts` records as `formable`** — the forming claim already exists, with its datasheet, as `minSpanHoles`/`maxSpanHoles`. The pin pattern **cites** it and does not restate it: a second copy of a datasheet figure is the thing `PAR2` exists to prevent. The accommodation is `formed-to-grid` and `admitPattern` cross-checks it against `leadSpanFor` (below).
3. **Off-grid along the row, on a family `lead-span.ts` records as `formable: false`** — nothing in the span module says those terminals may be moved at all, so an off-grid pitch is **unmountable unless a one-time preparation is recorded.** The entry must carry a `formed-to-grid` accommodation with its own `basis` and `DatasheetRef`, and **`admitPattern` refuses by name without one.** `TO-92_Inline` is this case, measured: it is the only one of the thirteen that is both off-grid along its row and non-formable.

**`admitPattern`'s cross-check against `leadSpanFor`, which is what keeps the accommodation from
being a free-text claim.** No span figure is written here (`PAR2`): the test reads both numbers
from the modules. The invariant is that **the prepared pattern's hole extent on one of its two
axes lies inside `[minSpanHoles, maxSpanHoles]` as `leadSpanFor` reports them** — the along-row
extent after any recorded preparation, or the across-axis row count. It is a **disjunction over
two axes**, which is a stated weakness: it catches a recorded extent that matches **neither** axis
and does not catch one that matches the wrong one, because the two modules do not say which axis a
`fixedSpanHoles` is measured along and inventing that correspondence is not available here. It
holds for all thirteen entries today, verified while this plan was written, and a family added
later that breaks it has a transcription error in one module or the other and the refusal names
both.

So: `classifyPads` tries each axis in turn, groups the pads by their across-axis coordinate, and the classification is `rows` when every pair of distinct row coordinates is a whole number of grid steps apart within `PITCH_TOLERANCE_MM`, and `off-strip-lattice` otherwise, naming the two rows and the residual. It **also reports the along-row pitches and whether they are on the grid** — a fact, not a verdict, because the verdict needs the recorded accommodation and `classifyPads` is pure arithmetic over the pads. A pattern whose pads are all on one row is `rows` with one row. A ring of pads has every pad on its own row on both axes and the row separations are not grid multiples, so it refuses.

**What this task checks and what Task 14 checks, because `HC10` has two halves.** `HC10` as worded is about a *placement* — *"every placed part's pins lie on straight lines parallel to the strips"* — while CRITERIA's own "Checked by" column specifies a **footprint-level** check that refuses *"by name before any placement exists to grade"*. **This task is the footprint half.** A footprint that decomposes along one axis still has to be *oriented* so those rows lie along the strips, and a layout that failed to is a layout this task's check passes. **That placement half is Task 14's**, over each placed part's `PIN` positions and its `DIRECTION`; it is the other clause of `HC10`'s own criterion sentence and not a new criterion, and the earlier draft of this plan left it as a gap while the verdict asserted `HC10` held. CRITERIA's "Checked by" column still names only the footprint half, so **that divergence is reported for the owner** in `docs/stripboard/pin-pattern.md` and in this plan's self-review: if he reads the column as the whole of `HC10`, Task 14's placement half is deleted and the gap restored.

- [ ] **Step 1: Read the pads off the footprints on disk. Do not write a coordinate from memory.** The library is at `/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/<Library>.pretty/<Name>.kicad_mod`; each file carries `(version <n>)` near the top and one `(pad "<name>" <type> ... (at <x> <y> [rot]) ...)` per pad. For each of the thirteen footprints in `LEAD_SPANS` — and for no others, because an entry for a footprint nothing places is an entry nobody can check — record `pad`, `xMm`, `yMm`, the file path, the `(version …)` token and the pad count. Two already verified while this plan was written, as the shape to follow:

```
Package_DIP:DIP-16_W7.62mm         version 20260206, 16 pads, pad "1" (at 0 0), "2" (at 0 2.54), "9" (at 7.62 17.78)
Package_TO_SOT_THT:TO-92_Inline    version 20260206, 3 pads, (at 0 0), (at 1.27 0), (at 2.54 0)
Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical
                                   version 20260206, 3 pads, (at 0 0), (at 2.5 5), (at 5 0)
```

  **A pad carrying a rotation in its `(at x y rot)` does not move its centre**, so `rot` is not read; a pad whose `(at …)` cannot be parsed is an error naming the file and the line, never a skipped pad. **Verify names against the thing itself:** if a footprint named in `LEAD_SPANS` is not on disk at the path above, stop and report it rather than recording coordinates for a file nobody opened — this repository has twice shipped a footprint that does not exist. All thirteen resolved on 2026-10-10 and every pad in all thirteen is named, so `excludedPads` is `[]` for every entry today; it exists as a field because that is a measurement and not a rule, and the alternative to the field is a count that silently disagrees the first time a footprint carries a mounting hole.

- [ ] **Step 1b: Write `tests/kicad/footprint-library.ts`, which is what makes the file-reading tests honest.** It resolves the library root, reads a footprint's pads, and **refuses rather than skips** when it cannot. Match `tests/circuits/kicad-round-trip.ts` exactly in posture — it is the repository's precedent and its own comment is the argument: *"a missing kicad-cli FAILS them rather than skipping"*.

```ts
/**
 * The KiCad footprint library, read off disk. Task 2's pad data is transcribed
 * from these files, so one test opens them and compares; a transcription
 * checked only against itself is a transcription nobody verified.
 *
 * This helper REFUSES rather than skips when the library is not resolvable,
 * for the reason tests/circuits/kicad-round-trip.ts gives for kicad-cli: a
 * skipped check must never look like a passing one, and a green suite on a
 * machine with no KiCad would be exactly that. It is test-side only: nothing
 * in lib/ or tools/ reads a .kicad_mod at run time, which is why
 * lib/kicad/pin-pattern.ts holds the pads as committed data.
 */
import fs from "node:fs"
import path from "node:path"
import type { PadPosition } from "../../lib/kicad/pin-pattern-model.ts"

/** Overridable the way KICAD_CLI is, and defaulted to the same install root. */
export const FOOTPRINT_LIBRARY_ROOT =
  process.env["KICAD_FOOTPRINTS"] ??
  "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints"

/** `<Library>:<Name>` as a netlist spells it, to `<root>/<Library>.pretty/<Name>.kicad_mod`. */
export function footprintFile(name: string): string {
  const parts = name.split(":")
  const library = parts[0]
  const footprint = parts[1]
  if (parts.length !== 2 || library === undefined || footprint === undefined) {
    throw new Error(
      `"${name}" is not a <Library>:<Name> footprint reference, which is the form every ` +
        "netlist in this repository uses and the only form this helper can turn into a path.",
    )
  }
  return path.join(FOOTPRINT_LIBRARY_ROOT, `${library}.pretty`, `${footprint}.kicad_mod`)
}

export interface FootprintPads {
  readonly pads: readonly PadPosition[]
  readonly version: string
  /** Every `(pad ...)` form in the file, including any this repository excludes. */
  readonly padCount: number
  readonly file: string
}

/**
 * Reads a footprint's pad centres. Throws, naming the path and the override,
 * when the file is not there - this does NOT skip.
 */
export function readFootprintPads(name: string): FootprintPads {
  const file = footprintFile(name)
  if (!fs.existsSync(file)) {
    throw new Error(
      `footprint "${name}" is not at ${file}. Install KiCad or set KICAD_FOOTPRINTS. This ` +
        "test does not skip: it is the only check that the pads in lib/kicad/pin-pattern.ts " +
        "match the files they were transcribed from, and this repository has twice shipped a " +
        "footprint that does not exist.",
    )
  }
  const lines = fs.readFileSync(file, "utf8").split("\n")
  const version = /\(version (\d+)\)/.exec(lines.join("\n"))?.[1]
  if (version === undefined) {
    throw new Error(`${file} carries no (version <n>) token, so its pads cannot be dated.`)
  }
  const pads: PadPosition[] = []
  let padCount = 0
  for (let index = 0; index < lines.length; index += 1) {
    const opener = /^\s*\(pad\s+(?:"([^"]*)"|(\S+))\s+\S+/.exec(lines[index] ?? "")
    if (opener === null) continue
    padCount += 1
    const pad = opener[1] ?? opener[2] ?? ""
    // `(at x y [rot])` is the first `at` form inside the pad; a rotation does
    // not move the centre, so the third field is read and discarded.
    let at: RegExpExecArray | null = null
    for (let look = index + 1; look < Math.min(index + 10, lines.length); look += 1) {
      at = /^\s*\(at (-?[\d.]+) (-?[\d.]+)(?: (-?[\d.]+))?\)/.exec(lines[look] ?? "")
      if (at !== null) break
    }
    if (at === null) {
      throw new Error(
        `${file}: the pad form opening at line ${index + 1} has no parseable (at x y) within ` +
          "ten lines. This is an error and not a skipped pad: a dropped pad is how a partial " +
          "transcription passes a count check.",
      )
    }
    pads.push({ pad, xMm: Number(at[1]), yMm: Number(at[2]) })
  }
  if (pads.length === 0) throw new Error(`${file} declares no pads, which cannot be right.`)
  return { pads, version, padCount, file }
}
```

- [ ] **Step 2: Write the failing test** (`tests/kicad/pin-pattern.test.ts`):

```ts
import { test, expect } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { classifyPads, admitPattern, preparedExtentsHoles }
  from "../../lib/kicad/pin-pattern-model.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS, leadSpanFor } from "../../lib/kicad/lead-span.ts"
import type { PadPosition, PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import { readFootprintPads } from "./footprint-library.ts"

const ring = (count: number, radiusMm: number): readonly PadPosition[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count
    return {
      pad: String(index + 1),
      xMm: Number((radiusMm * Math.cos(angle)).toFixed(4)),
      yMm: Number((radiusMm * Math.sin(angle)).toFixed(4)),
    }
  })

test("every footprint with a recorded lead span also has a recorded pin pattern", () => {
  // HC10 is in A1. A footprint the pipeline may place and HC10 cannot classify
  // is a hard constraint that silently passes, which is the one failure this
  // module exists to prevent.
  const missing = [...LEAD_SPANS.keys()].filter((name) => !PIN_PATTERNS.has(name)).sort()
  expect(missing).toEqual([])
})

test("every recorded classification is rederived from the recorded pads, not asserted", () => {
  // The lead-span split's discipline: a value that cannot be rederived from the
  // dimensions beside it is a transcription error, and that is the error this
  // catches.
  for (const pattern of PIN_PATTERNS.values()) {
    expect(classifyPads(pattern.pads), pattern.footprint).toEqual(pattern.classification)
  }
})

test("every recorded pad OPENS its .kicad_mod and agrees with the file, pad by pad", () => {
  // THE TEST THIS REPLACES compared pattern.pads.length against
  // pattern.source.padCount - two fields of the SAME hand-written literal. It
  // was named "agrees with the footprint file the pads came from" and never
  // opened a file, so transcribing eight pads from a ten-pad footprint and
  // writing padCount: 8 passed it. That is the defect class this plan calls its
  // crux, in this plan's own test file; the rule it broke is the repository's:
  // verify names against the thing itself, the libraries are on disk.
  //
  // readFootprintPads THROWS when the library is not resolvable. It must not
  // skip - see tests/kicad/footprint-library.ts and the precedent in
  // tests/circuits/kicad-round-trip.ts.
  for (const pattern of PIN_PATTERNS.values()) {
    const file = readFootprintPads(pattern.footprint)
    expect(pattern.source.file, pattern.footprint).toBe(file.file)
    expect(pattern.source.version, pattern.footprint).toBe(file.version)
    // Every (pad ...) form in the file is accounted for: transcribed, or
    // excluded with a reason. A silent shortfall is the failure above.
    expect(pattern.source.padCount, pattern.footprint).toBe(file.padCount)
    expect(
      pattern.pads.length + pattern.source.excludedPads.length,
      `${pattern.footprint}: transcribed + excluded must account for every pad in the file`,
    ).toBe(file.padCount)
    for (const excluded of pattern.source.excludedPads) {
      expect(excluded.reason.length, `${pattern.footprint} pad ${excluded.pad}`).toBeGreaterThan(20)
    }
    // And each recorded position is the file's own (at x y), by pad name.
    const onDisk = new Map(file.pads.map((pad) => [pad.pad, pad]))
    for (const pad of pattern.pads) {
      const actual = onDisk.get(pad.pad)
      expect(actual, `${pattern.footprint} pad "${pad.pad}" is not in ${file.file}`).toBeDefined()
      expect(actual!.xMm, `${pattern.footprint} pad ${pad.pad} x`).toBeCloseTo(pad.xMm, 4)
      expect(actual!.yMm, `${pattern.footprint} pad ${pad.pad} y`).toBeCloseTo(pad.yMm, 4)
    }
  }
})

test("the library helper refuses a missing footprint rather than skipping", () => {
  // The guard on the guard. If this ever stops throwing, every assertion above
  // becomes a loop over nothing on a machine with no KiCad.
  expect(() => readFootprintPads("Nonexistent_Lib:Nonexistent_Footprint")).toThrow(/does not skip/)
  expect(() => readFootprintPads("not-a-reference")).toThrow(/Library>:<Name/)
})

test("a single row of pads decomposes across the strips, and reports its along-row pitch", () => {
  // TO-92_Inline's own geometry: three collinear pads at HALF a grid step.
  // Decomposition is about the ACROSS direction, so one row decomposes; whether
  // the leads reach holes is the along-row question and classifyPads reports it
  // as a fact rather than deciding it. admitPattern decides, below.
  const inline = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 1.27, yMm: 0 },
    { pad: "3", xMm: 2.54, yMm: 0 },
  ])
  expect(inline.kind).toBe("rows")
  if (inline.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(inline.rows).toEqual([["1", "2", "3"]])
  expect(inline.rowPitchSteps).toEqual([])
  expect(inline.alongRowOnGrid).toBe(false)
  expect(inline.alongRowPitchesMm).toEqual([1.27, 1.27])
})

test("an off-grid along-row pitch on a NON-FORMABLE family refuses without a recorded accommodation", () => {
  // The review's sharp point, as the test that would have caught it:
  // collinearity does not establish that the leads enter holes. TO-92_Inline's
  // outer pads are on 1.27mm against a 2.54mm grid, and lead-span.ts records
  // the family as formable: false - nothing there says the terminals may be
  // moved. Admitting it on collinearity alone would be inferring a physical
  // accommodation from a geometric coincidence.
  const pattern = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  const withoutRecord = { ...pattern, accommodation: { kind: "as-moulded" } as const }
  const refused = admitPattern(withoutRecord)
  expect(refused.kind).toBe("refused")
  if (refused.kind !== "refused") throw new Error("unreachable")
  expect(refused.reason).toMatch(/formed/)
  expect(refused.reason).toMatch(/TO-92_Inline/)
  expect(refused.reason).toMatch(/not defaulted/)
})

test("the recorded formed-to-grid accommodation admits it, and says the leads are formed", () => {
  const admitted = admitPattern(pinPatternFor("Package_TO_SOT_THT:TO-92_Inline"))
  expect(admitted.kind).toBe("eligible")
  if (admitted.kind !== "eligible") throw new Error("unreachable")
  expect(admitted.accommodation.kind).toBe("formed-to-grid")
  expect(admitted.detail).toMatch(/formed/)
})

test("every formed-to-grid accommodation carries a basis and a datasheet source", () => {
  // The same provenance discipline the lead spans carry: a physical
  // accommodation recorded as a bare boolean is a claim nobody can check.
  for (const pattern of PIN_PATTERNS.values()) {
    if (pattern.accommodation.kind !== "formed-to-grid") continue
    expect(pattern.accommodation.basis.length, pattern.footprint).toBeGreaterThan(60)
    expect(pattern.accommodation.source.url, pattern.footprint).not.toBe("")
    expect(pattern.accommodation.preparedPitchSteps, pattern.footprint).toBeGreaterThanOrEqual(1)
  }
})

test("an accommodation recorded for a pattern that is already on the grid is refused as spurious", () => {
  // The other direction, and it matters: a formed-leads record on a part that
  // needs no forming is a claim about a physical operation nobody performs, and
  // it would quietly license the off-grid case next to it.
  const onGrid = pinPatternFor("Package_DIP:DIP-16_W7.62mm")
  // The DatasheetRef is borrowed from an entry that legitimately has one, so no
  // cast is needed: CLAUDE.md forbids `as Type`, and a test that reaches for one
  // is usually a test building a value the types say cannot exist.
  const formed = pinPatternFor("Package_TO_SOT_THT:TO-92_Inline")
  if (formed.accommodation.kind !== "formed-to-grid") {
    throw new Error("TO-92_Inline must carry a formed-to-grid accommodation; see step 5")
  }
  const spurious: PinPattern = {
    ...onGrid,
    accommodation: {
      kind: "formed-to-grid",
      preparedPitchSteps: 1,
      basis: "a preparation this part does not need, recorded to prove the guard fires",
      source: formed.accommodation.source,
    },
  }
  expect(admitPattern(spurious).kind).toBe("refused")
})

test("every entry's prepared extent lies inside the span lead-span.ts records for it", () => {
  // The cross-module check, with no span figure written here (PAR2): both
  // numbers are read from the modules. It is a DISJUNCTION over the two axes,
  // because neither module says which axis a recorded span is measured along -
  // so it catches an extent matching NEITHER axis and does not catch one
  // matching the wrong one. That is the guarantee, stated rather than implied.
  for (const pattern of PIN_PATTERNS.values()) {
    const span = leadSpanFor(pattern.footprint)
    const admitted = admitPattern(pattern)
    expect(admitted.kind, pattern.footprint).toBe("eligible")
    const extents = preparedExtentsHoles(pattern)
    const fits = extents.some(
      (holes) => holes >= span.minSpanHoles && holes <= span.maxSpanHoles,
    )
    expect(
      fits,
      `${pattern.footprint}: neither axis's prepared extent ${JSON.stringify(extents)} is inside ` +
        `[${span.minSpanHoles}, ${span.maxSpanHoles}] - one of the two modules is wrong`,
    ).toBe(true)
  }
})

test("two rows a whole number of strips apart decompose, and the pitch is reported in steps", () => {
  // A DIP's four corner pads. BOTH axes decompose here - rows of constant y are
  // one strip pitch apart, rows of constant x are three - and classifyPads
  // tries x FIRST, so the reported axis is "x" and the pitch is ONE step.
  //
  // THE PREVIOUS VERSION of this test expected [3], which is the OTHER axis's
  // answer, and it would have failed against the implementation printed in this
  // same task. Caught by this revision's type-and-value consistency pass, and
  // checked against the real footprint: DIP-16_W7.62mm's sixteen pads give
  // eight rows of constant y at one step each (measured, 2026-10-10), so "x
  // first" is also the physically useful answer and not an arbitrary tie-break.
  const dip = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 0, yMm: 2.54 },
    { pad: "3", xMm: 7.62, yMm: 2.54 },
    { pad: "4", xMm: 7.62, yMm: 0 },
  ])
  expect(dip.kind).toBe("rows")
  if (dip.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(dip.axis).toBe("x")
  expect(dip.rows.length).toBe(2)
  expect(dip.rowPitchSteps).toEqual([1])
  expect(dip.alongRowOnGrid).toBe(true)   // 7.62mm is three steps
})

test("the real DIP-16's sixteen pads decompose into eight rows one strip apart", () => {
  // The same claim against the file rather than against four hand-picked
  // corners, which is what makes the tie-break above a measurement.
  const classified = classifyPads(readFootprintPads("Package_DIP:DIP-16_W7.62mm").pads)
  expect(classified.kind).toBe("rows")
  if (classified.kind !== "rows") throw new Error("unreachable")
  expect(classified.rows.length).toBe(8)
  expect(new Set(classified.rowPitchSteps)).toEqual(new Set([1]))
})

test("a ring of pads is refused, naming why - the negative case HC10 exists for", () => {
  const classified = classifyPads(ring(11, 8))
  expect(classified.kind).toBe("off-strip-lattice")
  if (classified.kind !== "off-strip-lattice") throw new Error("unreachable")
  expect(classified.reason).toMatch(/strip/)
  expect(classified.reason).toMatch(/[0-9]/)
})

test("a ring is refused on BOTH axes, so the refusal is not an artefact of trying one", () => {
  // A ring has every pad on its own row whichever axis is grouped by, so a
  // classifier that tried one axis and gave up would refuse it for the wrong
  // reason and would also refuse a DIP rotated 90 degrees.
  const rotated = ring(11, 8).map((pad) => ({ pad: pad.pad, xMm: pad.yMm, yMm: pad.xMm }))
  expect(classifyPads(rotated).kind).toBe("off-strip-lattice")
})

test("a row separation off the grid by more than the tolerance is refused ON BOTH AXES", () => {
  // THE PREVIOUS VERSION put the off-grid separation on ONE axis only - pads at
  // (0,0), (2.54,0), (0,2.94), (2.54,2.94) - and expected off-strip-lattice.
  // But grouping by x gives two rows 2.54mm apart, which is exactly one step,
  // so classifyPads would have returned `rows` on axis y and the test would
  // have failed against the implementation printed in this same task. Caught by
  // this revision's consistency pass.
  //
  // A 2x2 pad field decomposes whenever EITHER axis is on the grid, so a test
  // for the refusal must put the offending separation on both.
  const offGrid = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: GRID_MM + 0.4, yMm: 0 },
    { pad: "3", xMm: 0, yMm: GRID_MM + 0.4 },
    { pad: "4", xMm: GRID_MM + 0.4, yMm: GRID_MM + 0.4 },
  ])
  expect(offGrid.kind).toBe("off-strip-lattice")
  if (offGrid.kind !== "off-strip-lattice") throw new Error("unreachable")
  // The reason names both attempts, so a classifier that tried one axis and
  // gave up is distinguishable from one that tried both.
  expect(offGrid.reason).toMatch(/Along x/)
  expect(offGrid.reason).toMatch(/Along y/)
})

test("an off-grid separation on ONE axis decomposes on the other, which is not a refusal", () => {
  // The control for the test above, and the thing that makes "both axes" a real
  // claim rather than a phrasing: the same offending separation with one axis
  // on the grid must CLASSIFY, on that axis.
  const oneAxis = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 2.54, yMm: 0 },
    { pad: "3", xMm: 0, yMm: GRID_MM + 0.4 },
    { pad: "4", xMm: 2.54, yMm: GRID_MM + 0.4 },
  ])
  expect(oneAxis.kind).toBe("rows")
  if (oneAxis.kind !== "rows") throw new Error("unreachable")
  expect(oneAxis.axis).toBe("y")   // rows of constant x, one step apart
  expect(oneAxis.rowPitchSteps).toEqual([1])
  expect(oneAxis.alongRowOnGrid).toBe(false)   // the 2.94mm pitch runs ALONG the row
})

test("a row separation inside PITCH_TOLERANCE_MM is accepted as that many steps", () => {
  // KiCad names imperial parts in rounded metric, which is exactly what
  // PITCH_TOLERANCE_MM is sized for; 5mm is a 0.2in row separation.
  const rounded = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 2.5, yMm: 0 },
    { pad: "3", xMm: 0, yMm: 5 },
    { pad: "4", xMm: 2.5, yMm: 5 },
  ])
  expect(rounded.kind).toBe("rows")
  if (rounded.kind !== "rows") throw new Error("unreachable")
  expect(rounded.rowPitchSteps).toEqual([2])
})

test("an unlisted footprint refuses by name, listing the ones that are classified", () => {
  expect(() => pinPatternFor("Rotary_SW:SW_Rotary11_D30mm")).toThrow(
    /SW_Rotary11_D30mm/,
  )
  expect(() => pinPatternFor("Rotary_SW:SW_Rotary11_D30mm")).toThrow(/PIN_PATTERNS/)
  expect(() => pinPatternFor("Rotary_SW:SW_Rotary11_D30mm")).toThrow(/not defaulted/)
})

test("no pattern is empty, because zero pads would classify as rows vacuously", () => {
  for (const pattern of PIN_PATTERNS.values()) {
    expect(pattern.pads.length, pattern.footprint).toBeGreaterThan(0)
  }
  expect(() => classifyPads([])).toThrow(/at least one pad/)
})
```

- [ ] **Step 3: Run it, confirm it fails** for the right reason — the modules do not exist. `bun test tests/kicad/pin-pattern.test.ts`.

- [ ] **Step 4: Implement `lib/kicad/pin-pattern-model.ts`.** The arithmetic and nothing else, so that the data file beside it holds no logic:

```ts
import { GRID_MM, PITCH_TOLERANCE_MM, nearestGridSteps } from "./grid.ts"

/** One pad's centre, in the footprint's own millimetres, as the .kicad_mod states it. */
export interface PadPosition {
  readonly pad: string
  readonly xMm: number
  readonly yMm: number
}

/** The file the pads were read out of, precisely enough to open it again. */
export interface PadSource {
  readonly file: string
  /** The `(version <n>)` token in that file. */
  readonly version: string
  /** How many `(pad ...)` forms it holds, so a partial transcription is loud. */
  readonly padCount: number
}

export interface RowDecomposition {
  /** The axis the rows RUN ALONG: "x" means rows of constant y. */
  readonly axis: "x" | "y"
  /** Pad names per row, rows in increasing across-axis order, pads in file order. */
  readonly rows: readonly (readonly string[])[]
  /** Across-axis separations between consecutive rows, in whole grid steps. */
  readonly rowPitchSteps: readonly number[]
}

export type PatternClassification =
  | ({ readonly kind: "rows" } & RowDecomposition)
  | { readonly kind: "off-strip-lattice"; readonly reason: string }

function groupBy(pads: readonly PadPosition[], across: (pad: PadPosition) => number) {
  const buckets = new Map<string, { readonly at: number; readonly pads: string[] }>()
  for (const pad of pads) {
    // Keyed on the rounded coordinate so 2.5400000000000005 and 2.54 are one
    // row. Four decimals is finer than any footprint dimension and coarser
    // than IEEE754 noise.
    const key = across(pad).toFixed(4)
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, { at: across(pad), pads: [pad.pad] })
    else bucket.pads.push(pad.pad)
  }
  return [...buckets.values()].sort((a, b) => a.at - b.at)
}

function tryAxis(
  pads: readonly PadPosition[],
  axis: "x" | "y",
): PatternClassification {
  const across = axis === "x" ? (pad: PadPosition) => pad.yMm : (pad: PadPosition) => pad.xMm
  const rows = groupBy(pads, across)
  const steps: number[] = []
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]
    const current = rows[index]
    if (previous === undefined || current === undefined) {
      throw new Error("unreachable: rows was indexed inside its own length")
    }
    const separation = current.at - previous.at
    const resolved = nearestGridSteps(separation)
    if (resolved.errorMm > PITCH_TOLERANCE_MM || resolved.steps < 1) {
      return {
        kind: "off-strip-lattice",
        reason:
          `rows along ${axis} at ${previous.at}mm and ${current.at}mm are ${separation.toFixed(3)}mm ` +
          `apart, which is ${resolved.errorMm.toFixed(3)}mm from ${resolved.steps} whole strip ` +
          `pitches of ${GRID_MM}mm - more than the ${PITCH_TOLERANCE_MM}mm tolerance. Two pads on ` +
          "different rows land on different strips, and no bending puts a lead between strips.",
      }
    }
    steps.push(resolved.steps)
  }
  // The ALONG-row pitches are reported as facts, never as a verdict: whether an
  // off-grid pitch is mountable depends on a recorded accommodation, and that is
  // admitPattern's question. See "Formed leads" above.
  const along = axis === "x" ? (pad: PadPosition) => pad.xMm : (pad: PadPosition) => pad.yMm
  const byName = new Map(pads.map((pad) => [pad.pad, pad]))
  const pitches: number[] = []
  let onGrid = true
  for (const row of rows) {
    const coords = row.pads
      .map((name) => {
        const pad = byName.get(name)
        if (pad === undefined) throw new Error("unreachable: a row names a pad not in the input")
        return along(pad)
      })
      .sort((a, b) => a - b)
    for (let index = 1; index < coords.length; index += 1) {
      const current = coords[index]
      const previous = coords[index - 1]
      if (current === undefined || previous === undefined) {
        throw new Error("unreachable: coords was indexed inside its own length")
      }
      const pitch = current - previous
      pitches.push(Number(pitch.toFixed(4)))
      const resolved = nearestGridSteps(pitch)
      if (resolved.errorMm > PITCH_TOLERANCE_MM || resolved.steps < 1) onGrid = false
    }
  }
  return {
    kind: "rows",
    axis,
    rows: rows.map((row) => row.pads),
    rowPitchSteps: steps,
    alongRowPitchesMm: pitches,
    alongRowOnGrid: onGrid,
  }
}

/**
 * Whether a footprint's pads decompose into rows a whole number of strips
 * apart - HC10's test, at footprint level, with no latitude inside it.
 *
 * ACROSS THE STRIPS THE SEPARATION MUST BE A WHOLE NUMBER OF GRID STEPS. The
 * asymmetry is physical: a row of pads sits on one strip and the next row on
 * another, and the strip pitch is fixed, while a lead moves along its own
 * strip by entering a different hole in it.
 *
 * ALONG A ROW the pitches are REPORTED, not judged. TO-92_Inline's three
 * collinear pads at 1.27mm are the worked case, and collinearity does NOT
 * establish that those leads enter holes: two of the three are between holes
 * as moulded, and what puts them in holes is forming the leads. Whether that
 * accommodation exists for a family is RECORDED DATA, so the verdict is
 * admitPattern's and not this function's.
 *
 * BOTH AXES ARE TRIED, and the refusal is only returned when both fail. A
 * classifier that tried one axis would refuse a DIP whose rows happen to lie
 * along the other one.
 */
export function classifyPads(pads: readonly PadPosition[]): PatternClassification {
  if (pads.length === 0) {
    throw new Error(
      "a pin pattern needs at least one pad: an empty pad list would classify as rows " +
        "vacuously, which is a hard constraint passing because nothing was checked.",
    )
  }
  const alongX = tryAxis(pads, "x")
  if (alongX.kind === "rows") return alongX
  const alongY = tryAxis(pads, "y")
  if (alongY.kind === "rows") return alongY
  return {
    kind: "off-strip-lattice",
    reason:
      `neither axis decomposes into rows a whole number of strip pitches apart. Along x: ` +
      `${alongX.reason} Along y: ${alongY.reason}`,
  }
}
```

- [ ] **Step 4b: Implement `admitPattern` and `preparedExtentsHoles` in `lib/kicad/pin-pattern-model.ts`.** `admitPattern` is the only place a footprint is declared mountable, and it refuses in four cases, each naming the footprint, the measured pitch, what is missing, where to fix it and **why it is not defaulted**:
  1. the classification is `off-strip-lattice` — the across-strip clause, refused outright;
  2. the along-row pitch is off the grid, the family is `formable: false` in `LEAD_SPANS`, and the accommodation is `as-moulded` — **no recorded preparation, so no admission**;
  3. the accommodation is `formed-to-grid` while `alongRowOnGrid` is already true — a spurious record, refused so the field cannot become decoration;
  4. the footprint is not in `LEAD_SPANS` at all — refused by name, `PAR2`'s posture, because the cross-check has nothing to check against and admitting it would be admitting an unbounded reach.
  For case 2 on a `formable` family the admission **cites** `leadSpanFor`'s recorded reach rather than restating it, and the `detail` says which clause admitted the pattern so a pass is readable. `preparedExtentsHoles` returns the two axes' extents in holes — along-row, using `preparedPitchSteps` when one is recorded and the measured on-grid pitch otherwise, then the across-axis row count — and throws for an `off-strip-lattice` classification rather than returning a number for a pattern with no rows.

- [ ] **Step 5: Implement `lib/kicad/pin-pattern.ts`** — the thirteen entries from step 1 and nothing computed. Each entry carries its pads, its `PadSource` (file, `(version …)` token, total pad count, and `excludedPads: []`), the classification `classifyPads` returns for it, its `GridAccommodation`, and a `basis` string saying in one sentence what the pattern is (*"two rows of eight at three strip pitches"*), in the voice `lead-span.ts`'s `minBasis` uses. **Three entries carry a `formed-to-grid` accommodation** — `TO-92_Inline` and the two radials whose along-row pitch is off the grid (measured in this plan's facts) — each with a `basis` saying what is formed and a `DatasheetRef`; for the two formable radials the basis cites `lead-span.ts`'s recorded reach rather than restating a figure. The module comment states: why it exists (HC10 is in A1 and the verdict must not claim an unchecked constraint held); that every number came from a `.kicad_mod` on disk and none from memory, and that one test opens those files; that an unlisted footprint throws; the across-strip rule; and that **an off-grid along-row pitch is a formed-leads accommodation recorded here, not an inference from collinearity**, citing TO-92_Inline. `pinPatternFor` mirrors `leadSpanFor`'s refusal exactly — name the footprint, say it is not in `PIN_PATTERNS`, say **this is NOT defaulted** and why (a pattern the strips cannot take is a board of cuts the owner will not build), list the classified footprints, and say how to add one (open the `.kicad_mod`, record the pads with the file and version, decide and record the accommodation, put the entry beside the others).

- [ ] **Step 6: Run the classification AND the admission over all thirteen and read the output.** Write a throwaway probe under the scratchpad that prints each footprint, its classification, its along-row pitches, whether they are on the grid, its accommodation and `admitPattern`'s verdict, and **look at it**. Three outcomes and only one of them is "carry on":
  - every footprint is `eligible` → carry on;
  - a footprint used only outside the Pultec set is `refused` → record it in `docs/stripboard/pin-pattern.md` as a finding, leave the classification as the module derived it, and carry on: `PAR2`'s posture is that a refusal is the honest outcome;
  - **one of the five footprints the Pultec boards place is refused → STOP.** Do not relax the predicate and do not add an accommodation to make it pass. A rule that refuses a footprint on five boards in S1a's scope is either wrong or has found something real, and `K3`'s fourth condition — *"never a widening because the gate became inconvenient"* — governs by analogy. An accommodation added to clear a refusal is exactly that widening wearing a data file's clothes. Report it to the owner with the pads, the file and the derived reason, exactly as `OB4` reports `pt2399-core`'s extent.
  **Expected from this plan's measurements:** all five Pultec footprints are on-grid along their rows and `as-moulded`, so none of them should need an accommodation at all. **If one does, that is the finding, and it goes to the owner rather than into the data.**

- [ ] **Step 7: Write `docs/stripboard/pin-pattern.md`**, in the shape of `docs/stripboard/lead-span.md`: what `HC10` is and whose judgement it is (the owner's, quoted), the across-strip rule and why it refuses, **the formed-leads discipline and why collinearity is not evidence of mountability**, the per-footprint table with its file, version, along-row pitch and accommodation, step 6's findings, the cross-check's stated weakness (a disjunction over two axes), and **the divergence to report to the owner**: `HC10`'s criterion sentence is about a placement while CRITERIA's "Checked by" column specifies only the footprint-level check, so this module is half of `HC10` and Task 14 is the other half.

- [ ] **Step 8: Prove the tests can fail.** Six deliberate breaks, each run and reverted, each recorded in a comment beside the test it broke:
  1. `classifyPads` returns `{ kind: "rows", axis: "x", rows: [pads.map((p) => p.pad)], rowPitchSteps: [], alongRowPitchesMm: [], alongRowOnGrid: true }` unconditionally — *the vacuous classifier*. The ring test and the off-grid test must fail. **This is the mutation that matters**, because it is the shape the fork's mutation harness found four times.
  2. Drop one entry from `PIN_PATTERNS`. The coverage test must fail naming it.
  3. Change one recorded `yMm` by 0.5 mm. The rederivation test must fail naming that footprint, **and the file-opening test must fail too** — two independent detections, which is the point of reading the file.
  4. **Drop one pad from one entry's `pads` and decrement nothing.** The file-opening test must fail naming the footprint. *Run this one first: it is the exact defect the replaced pad-count test could not see, and if it passes, the new test is no better than the old one.*
  5. **Set one entry's `source.padCount` to `pads.length` instead of the file's count.** The file-opening test must fail. This is break 4's twin from the other side: it is what made the old test self-consistent and worthless.
  6. `admitPattern` returns `{ kind: "eligible", ... }` whenever the classification is `rows` — *admission by collinearity*, the defect the review found. The non-formable refusal test and the spurious-accommodation test must both fail.

- [ ] **Step 9: Run** `bun test && bun run typecheck`, **commit** ("Classify every placed footprint's pin pattern, and record the ones whose leads are formed"), push. The body names the three footprints carrying a `formed-to-grid` accommodation and says what each one is formed from and to, so the accommodation is reviewable in a diff rather than only in the data file.

---

### Task 3: `HC8`'s geometry contract and the copper graph

**Files:** create `tools/stripboard/copper.ts`, `docs/stripboard/pipeline-verification.md`; test `tests/stripboard/copper.test.ts`.

**`docs/stripboard/pipeline-verification.md` is created here, by the first task that has a finding
to put in it, and is extended by Tasks 7, 14, 22 and 23** rather than created at the end. A
document written last is a document whose early findings were held in somebody's head until then.
Task 3 opens it with `HC8`'s trust boundary and the nine refusals; Task 22 is where it becomes the
full `V1`–`V12` register.

**Interfaces:**
- *Consumes:* `parseBoardDump`, `BoardDump`, `Part`, `Pin`, `Cut`, `Bridge`, `Wire`, `HolePosition` from `tools/guide/dump.ts`.
- *Provides:*
  - `GEOMETRY_CONTRACT_VERSION = 1`
  - `CONTRACTED_LINES: readonly string[]` — `["GRID", "VERTICAL_STRIPS", "PIN", "CUT", "SOLDER", "WIRE"]`
  - `HoleKey = string` — `` `${row},${col}` ``
  - `holeKey(hole: HolePosition): HoleKey` and `parseHoleKey(key: HoleKey): HolePosition`
  - `CopperGraph { readonly components: ReadonlyMap<HoleKey, number>; readonly componentCount: number }`
  - `boardGeometry(dumpText: string)` — **the entry point, and the only one that enforces the
    contract.** Added 2026-10-11 after implementation showed two of the enumerated refusals are
    *inexpressible* through `copperGraph(dump: BoardDump)`: a parsed `BoardDump` carries a grid
    and a boolean axis **by construction**, so `missing-line` and `unsupported-strip-axis` could
    never fire from it. They belong at the text seam. This is not a second parser — it uses
    `dump-lines.ts`, the one declared tokenizer. Shipping two refusals that cannot fire would have
    been the precise defect this plan exists to prevent, and the alternative was deleting them
    from the contract.
  - `copperGraph(dump: BoardDump): CopperGraph` — **reachable without the geometry refusals.** A
    caller holding a `parseBoardDump` result can build a graph while skipping every contract
    check, so `HC8`'s wording is delivered only through `boardGeometry`. Task 4 and Task 14 call
    that; `copperGraph` alone is for a caller that has already validated.
  - `pinHoles(dump: BoardDump): ReadonlyMap<string, HoleKey>` — keyed `` `${ref}.${pin}` ``
  - `GeometryRefusal = "missing-line" | "out-of-bounds" | "cut-not-strip-adjacent" | "cut-across-strips" | "duplicate-pin" | "conflicting-pin" | "unsupported-strip-axis" | "cuts-not-computed" | "solder-not-strip-neighbours"` — the enumerated malformed-input refusals, so the set is a type and cannot grow silently
- Task 4 consumes all of these; Task 14's `HC8` check consumes Task 4's verdict and never this module directly; Task 14's fabrication-extent check (`extent.ts`) consumes `copperGraph` to verify that trimming preserves connectivity.

**This module REFUSES malformed geometry; it never builds a plausible graph from it.** `HC8` is
the one gate that certifies electrical correctness, so the input it cannot trust is the input it
must not interpret. **"Refuse rather than guess"** applies here with no latitude: a reconstruction
that resolves an ambiguity by choosing is a reconstruction reporting a connectivity it did not
compute, and it reports it with the same confidence as a correct one. Nine refusals, each a member
of `GeometryRefusal`, each with a negative fixture it rejects by name:

| refusal | what is malformed | why guessing is not available |
| --- | --- | --- |
| `missing-line` | `GRID` or `VERTICAL_STRIPS` absent | the extent and the strip axis are definitions, not defaults; CRITERIA: *"a dump with no `VERTICAL_STRIPS` line does not default to rows"* |
| `unsupported-strip-axis` | `VERTICAL_STRIPS` is neither `0` nor `1` | a third value means the grammar moved; "the same strip" has no meaning until it is read |
| `cuts-not-computed` | `CUT_STATE` is not `COMPUTED` | **the one that is easy to miss.** Under `UNRESOLVED` the cut list is *not emitted*, so zero `CUT` lines is indistinguishable from no cuts — and a graph built from that joins holes the board severs. `transistor-preamp-lab` is this case live, with 19 `CUT_CONFLICT` lines |
| `out-of-bounds` | any hole named by any line lies outside `GRID` | a coordinate off the board is either a grammar change or a corrupt dump; clamping it invents a hole |
| `cut-not-strip-adjacent` | a `CUT` names two holes on one strip more than one step apart | *"naming the two strip-adjacent holes to sever the strip between"* is the contract; which of the intervening gaps to sever is not stated and not derivable |
| `cut-across-strips` | a `CUT` names two holes on **different** strips | a cut severs a strip along its run; a pair across strips describes nothing the fork emits |
| `duplicate-pin` | two `PIN` lines with the same `ref.pin` at the same hole | a repeated record means the dump was concatenated or the parse is wrong; silently de-duplicating hides both |
| `conflicting-pin` | two `PIN` lines with the same `ref.pin` at **different** holes | one lead cannot be in two holes; picking either is picking a board |
| `solder-not-strip-neighbours` | a `SOLDER` pair is not two holes on neighbouring strips at one shared along-strip coordinate | the contract's own words; a bridge between non-neighbours is a join mechanism the edge set does not have |

**`cuts-not-computed` is a change to this module's contract and is stated so a reviewer can
disagree with it.** The earlier draft left `CUT_STATE` to Task 12's scorer. But the scorer and the
grader are deliberately separate paths (`R2`), so a refusal that lives only in the scorer does not
protect the grader — and `HC8` is the grader's electrical gate. The refusal therefore lives in
**both**, with one wording, and `HC2` reads the same field a third time from the constraint side.
Three readings of one predicate is the shape this plan already uses for `HC3`.

**`HC8`'s trust boundary, stated exactly where the independence is claimed, because the honest
scope is narrower than "independent".** This module is **independent connectivity reconstruction
from VeroRoute-reported physical geometry.** It is independent of VeroRoute's **membership
calculation** — `GetBoardMembership`, the subsystem the optimiser perturbs and the one with the
demonstrated hole, which is the independence that matters because that is where the measured
failure was. It is **not** independent of VeroRoute's **geometry export**: it consumes it. So:

> **If the dump omits a cut or misreports a pin, this module produces a consistent and wrong
> answer.** Nothing here validates the reported geometry against the binary `.vrt`, and a defect
> in the export is a defect the optimiser and the verifier share.

That limit is acceptable — stronger independence means parsing a binary `QDataStream` (`N5`), and
it is recorded as limit **`H-13`** rather than as a plan. It is **explicit, not implied**: the
module comment states it, `docs/stripboard/pipeline-verification.md` states it beside `V11`, and
Task 20's report prints it beside an `HC8` pass, so a reader of a verdict sees what the pass does
and does not cover. The nine refusals above are what narrows the gap that *is* reachable: they
reject a dump that is malformed on its own terms, which is the part of a bad export this module
can see.

**The edge set is exactly COST §1.5's three join mechanisms and no fourth**, and it is not re-derived here: an uncut within-strip neighbour, a derived solder bridge between adjacent strips at a shared column, and a wire. The reason a fourth is refused is measured: *"A component lead can never supply a join"* — a two-terminal part's leads sit on two different nets by construction, and *"a pipeline that treats a stretched resistor as a bridge will produce boards that do not conduct and score them as if they did."*

**The one clause that is a definition rather than data**, carried verbatim from `HC8`'s contract because nothing in the dump states it: *"two holes are electrically connected by an uncut strip when they lie on the same strip — equal `row` if `VERTICAL_STRIPS 0`, equal `col` if `VERTICAL_STRIPS 1` — and no `CUT` line separates them."* A `CUT` names two strip-adjacent holes and severs the copper **between** them, so two holes on one strip are connected exactly when no `CUT` pair lies strictly between their along-strip coordinates.

- [ ] **Step 1: Write the failing test.** Hand-written dump text throughout: the module's input is dump text, so hand-written text is its real seam, not a stand-in for one.

```ts
import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { copperGraph, holeKey, pinHoles, CONTRACTED_LINES, GEOMETRY_CONTRACT_VERSION }
  from "../../tools/stripboard/copper.ts"

/**
 * A four-column, three-row horizontal-strip board. R1 spans strip 0, R2 strip
 * 2, and a wire joins the two. One cut severs strip 0 between columns 1 and 2.
 */
const BOARD = [
  "GRID 3 4",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PART R2 RESISTOR4 1k AT 2,0 SPAN 1",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,3",
  "PIN R2 1 AT 2,0",
  "PIN R2 2 AT 2,3",
  "WIRE w1 AT 0,0 ENDS 0,0,7,20 2,0,9,20",
  "CUT 0,1,7 0,2,8",
].join("\n")

test("the contract's version and its line list are declared, not implied", () => {
  expect(GEOMETRY_CONTRACT_VERSION).toBe(1)
  expect([...CONTRACTED_LINES].sort())
    .toEqual(["CUT", "GRID", "PIN", "SOLDER", "VERTICAL_STRIPS", "WIRE"])
})

test("holes on one uncut stretch of strip are one component", () => {
  const graph = copperGraph(parseBoardDump(BOARD))
  expect(graph.components.get(holeKey({ row: 0, col: 0 })))
    .toBe(graph.components.get(holeKey({ row: 0, col: 1 })))
})

test("a CUT severs the strip BETWEEN its two holes, so the two sides differ", () => {
  const graph = copperGraph(parseBoardDump(BOARD))
  expect(graph.components.get(holeKey({ row: 0, col: 1 })))
    .not.toBe(graph.components.get(holeKey({ row: 0, col: 2 })))
})

test("a WIRE joins its two ends across non-adjacent strips", () => {
  const graph = copperGraph(parseBoardDump(BOARD))
  expect(graph.components.get(holeKey({ row: 0, col: 0 })))
    .toBe(graph.components.get(holeKey({ row: 2, col: 0 })))
})

test("a SOLDER line joins two neighbouring strips at one column", () => {
  const bridged = parseBoardDump(`${BOARD}\nSOLDER 1,3 2,3`)
  const graph = copperGraph(bridged)
  expect(graph.components.get(holeKey({ row: 1, col: 3 })))
    .toBe(graph.components.get(holeKey({ row: 2, col: 3 })))
})

test("VERTICAL_STRIPS 1 changes which holes share a strip, and is read rather than assumed", () => {
  // The CUT moves WITH the axis, and it has to: BOARD's `CUT 0,1 0,2` names two
  // holes in one row, which is one strip under VERTICAL_STRIPS 0 and TWO
  // different strips under VERTICAL_STRIPS 1 - where it is malformed and the
  // `cut-across-strips` refusal rejects it. So the vertical board gets a
  // vertical cut: same column, adjacent rows.
  //
  // CAUGHT BY THIS REVISION'S CONSISTENCY PASS: the previous version flipped
  // only the axis line and left the horizontal cut, so adding the
  // cut-across-strips validation would have made this test throw instead of
  // building a graph - a new refusal breaking an old test, which is the shape
  // worth looking for whenever a validation is added under existing fixtures.
  const vertical = parseBoardDump(
    BOARD
      .replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 1")
      .replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 1,1,8"),
  )
  const graph = copperGraph(vertical)
  // Down a column is now one strip; across a row is not.
  expect(graph.components.get(holeKey({ row: 0, col: 0 })))
    .toBe(graph.components.get(holeKey({ row: 1, col: 0 })))
  expect(graph.components.get(holeKey({ row: 0, col: 2 })))
    .not.toBe(graph.components.get(holeKey({ row: 0, col: 3 })))
})

test("a stretched two-terminal part is NOT an edge - the correction that must not be lost", () => {
  // R1's two leads are on strips 0 and 0 here; put one on strip 1 and the part
  // must still not join them. COST 1.5: a component lead can never supply a
  // join, and a pipeline that believes it can produces boards that do not
  // conduct and scores them as if they did.
  const across = parseBoardDump(BOARD.replace("PIN R1 2 AT 0,3", "PIN R1 2 AT 1,3"))
  const graph = copperGraph(across)
  expect(graph.components.get(holeKey({ row: 0, col: 0 })))
    .not.toBe(graph.components.get(holeKey({ row: 1, col: 3 })))
})

test("pin holes are read from PIN lines, keyed ref.pin, and a floating part has none", () => {
  const floated = parseBoardDump(
    BOARD.replace("PART R2 RESISTOR4 1k AT 2,0 SPAN 1", "PART R2 RESISTOR4 1k FLOATING SPAN 1")
      .replace("PIN R2 1 AT 2,0\n", "").replace("PIN R2 2 AT 2,3\n", ""),
  )
  const holes = pinHoles(floated)
  expect(holes.get("R1.1")).toBe(holeKey({ row: 0, col: 0 }))
  expect(holes.has("R2.1")).toBe(false)
})

test("a missing contracted line refuses by name and by contract version, never a partial graph", () => {
  for (const line of ["GRID 3 4", "VERTICAL_STRIPS 0"]) {
    const without = BOARD.split("\n").filter((text) => text !== line).join("\n")
    // parseBoardDump may already refuse some of these; copperGraph must refuse
    // whichever reach it, and the message must name the line and the version so
    // a grammar change under the contract is distinguishable from a bad board.
    expect(() => copperGraph(parseBoardDump(without)), line).toThrow()
  }
})

test("every enumerated malformed input refuses, naming its refusal - one case each", () => {
  // The verifier must not construct a plausible graph from malformed input.
  // Each row is a mutation of BOARD and the refusal it must produce; the
  // assertion is that THAT refusal fired, because a module that threw the same
  // error for all nine would pass a test asserting only "it threw".
  const cases = [
    ["unsupported-strip-axis", BOARD.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 2")],
    ["cuts-not-computed", BOARD.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")],
    ["out-of-bounds", BOARD.replace("PIN R1 2 AT 0,3", "PIN R1 2 AT 0,9")],
    ["out-of-bounds", `${BOARD}\nSOLDER 1,3 9,3`],
    // Same strip (row 0), two steps apart: which of the two gaps to sever is
    // not stated by the contract and is not derivable from the line.
    ["cut-not-strip-adjacent", BOARD.replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 0,3,8")],
    // Two different strips: a cut severs a strip ALONG its run.
    ["cut-across-strips", BOARD.replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 1,1,8")],
    ["duplicate-pin", `${BOARD}\nPIN R1 1 AT 0,0`],
    ["conflicting-pin", `${BOARD}\nPIN R1 1 AT 0,2`],
    ["solder-not-strip-neighbours", `${BOARD}\nSOLDER 0,3 2,3`],
  ] as const
  for (const [refusal, text] of cases) {
    let message = ""
    try { copperGraph(parseBoardDump(text)) }
    catch (error) { message = error instanceof Error ? error.message : String(error) }
    expect(message, refusal).toContain(refusal)
    expect(message, refusal).toMatch(/GEOMETRY_CONTRACT_VERSION|contract version 1/)
  }
})

test("CUT_STATE UNRESOLVED refuses, because an absent cut list is not an empty one", () => {
  // The refusal that is easy to leave to the scorer. Under UNRESOLVED the cut
  // list is NOT EMITTED, so zero CUT lines and no cuts are the same text - and
  // a graph built from it joins holes the board severs, which is the most
  // convincing wrong answer this module can produce. R2 keeps the grader and
  // the scorer on separate paths, so a refusal only in the scorer leaves the
  // grader unprotected.
  const unresolved = BOARD
    .replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
    .split("\n").filter((line) => !line.startsWith("CUT ")).join("\n")
  expect(() => copperGraph(parseBoardDump(unresolved))).toThrow(/cuts-not-computed/)
  expect(() => copperGraph(parseBoardDump(unresolved))).toThrow(/UNRESOLVED/)
})

test("a legitimately empty cut, solder or wire list is NOT a missing line", () => {
  // The other side of the refusal above, and the reason CUT_STATE carries it:
  // CRITERIA says the lists "may legitimately be zero lines, e.g. a strip board
  // with only one net on it". COMPUTED is what makes zero lines evidence.
  const noFeatures = BOARD.split("\n")
    .filter((line) => !line.startsWith("CUT ")).join("\n")
  expect(() => copperGraph(parseBoardDump(noFeatures))).not.toThrow()
})

test("the graph is built without reading NODE lines or any nodeId - the independence", () => {
  // The CUT line's node ids are Element::GetNodeId(), VeroRoute's own net
  // assignment arriving by a second route. Replacing them with garbage, and
  // emptying the NODE block, must not change one component.
  const withNodes = `${BOARD}\nNODE 1 net_a R1.1 R2.1\nNODE 2 net_b R1.2 R2.2`
  const garbled = withNodes
    .replace("CUT 0,1,7 0,2,8", "CUT 0,1,999999 0,2,-4")
    .replace(/^NODE .*$/gm, "")
  expect(copperGraph(parseBoardDump(garbled)).components)
    .toEqual(copperGraph(parseBoardDump(withNodes)).components)
})
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement `tools/stripboard/copper.ts`.** A union-find over hole keys, **with every input validated before any union is performed** — a graph half-built from input later found malformed is a graph somebody debugs instead of rejects. The module comment states, in this order: that this is `HC8`'s reconstruction and `CRITERIA`'s `HC8` contract is its authority; `GEOMETRY_CONTRACT_VERSION` and what a version bump means; the three join mechanisms and that there is no fourth, citing COST §1.5 and the stretched-resistor correction; the definition clause for an uncut strip; that it never reads `NODE` or any `nodeId`, and that this is the independence rather than a style choice; **the nine `GeometryRefusal` members and why each one cannot be guessed past**; and **the trust boundary verbatim** — independent of VeroRoute's **membership calculation**, consuming its **geometry export**, so *a dump that omits a cut or misreports a pin yields a consistent and wrong answer*, with `.vrt` parsing recorded as limit `H-13` rather than as a plan. Order: **validate** — `GRID` and `VERTICAL_STRIPS` present, the axis one of two values, `CUT_STATE COMPUTED`, every hole on every line in bounds, every `CUT` pair strip-adjacent and on one strip, every `SOLDER` pair on neighbouring strips at one shared coordinate, every `ref.pin` named at most once — **then** build: seed one singleton per in-bounds hole from `GRID`; union along-strip neighbours except where a `CUT` lies between them; union each `SOLDER` pair; union each `WIRE`'s two ends, skipping a `FLOATING` wire, which joins nothing. Every refusal names its `GeometryRefusal` member, the offending line, `GEOMETRY_CONTRACT_VERSION`, and **why it is not defaulted**. A `switch` over `GeometryRefusal` for the messages, so the type checker proves the set is covered and a tenth member cannot be added without a message.

- [ ] **Step 4: Prove the tests can fail.** Four breaks on the graph, run and reverted, each noted beside its test: union every pair of holes on a strip ignoring cuts (the cut test fails); union a part's `PIN` holes to each other (the stretched-part test fails); hard-code the strip axis to rows (the `VERTICAL_STRIPS 1` test fails); read `cut.a.nodeId` into the component key (the independence test fails). **The last one is the one to run first**, because it is the defect `HC8` exists to prevent and the only one whose absence would still look like a working gate.

- [ ] **Step 4b: Prove each refusal can fail, one at a time.** Comment out each of the nine validations in turn and confirm **its** row of the enumerated test fails — nine mutations, each recorded beside the row it broke. Then two that matter more than the other seven:
  1. **Replace all nine messages with one generic "malformed dump".** Every row must fail on the `toContain(refusal)` assertion. *A refusal set that cannot say which refusal fired is a refusal set a caller cannot act on, and it is also one where eight of the nine validations could be missing undetected.*
  2. **Make `cuts-not-computed` a warning that proceeds.** The `UNRESOLVED` test must fail. Run this one against `transistor-preamp-lab`'s real dump as well as the hand-written text, and record what the graph claimed — that is the plausible-and-wrong answer the refusal exists to prevent, and seeing it once is worth more than reading about it.
  Then add the eleventh break the type system should catch: **add a tenth `GeometryRefusal` member and no message for it**, and confirm `bun run typecheck` fails on the `switch`.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Reconstruct a stripboard's copper from the dump geometry, and refuse geometry that is malformed"), push. The body lists the nine refusals and states the trust boundary in one sentence, because the commit is where a reviewer meets the claim.

---

### Task 4: `HC8`'s verdict — the open, the short, and the independence

**Files:** create `tools/stripboard/equivalence.ts`, `tests/stripboard/import-closure.ts`; test `tests/stripboard/equivalence.test.ts`.

**Interfaces:**
- *Consumes:* `boardGeometry`, `copperGraph`, `pinHoles`, `holeKey`, `HoleKey`, `GEOMETRY_CONTRACT_VERSION` from Task 3. **Not `parseBoardDump` and not `BoardDump`:** this module reaches the parser transitively through `copper.ts` and never names it, which is what the closure test below asserts.
- *Provides:*
  - `ReferenceNets = ReadonlyMap<string, readonly string[]>` — net name to `ref.pin` members, **from the netlist export, upstream of VeroRoute entirely**
  - `OpenFinding { readonly net: string; readonly groups: readonly (readonly string[])[] }`
  - `ShortFinding { readonly nets: readonly string[]; readonly hole: HoleKey }`
  - `EquivalenceVerdict { readonly equivalent: boolean; readonly opens: readonly OpenFinding[]; readonly shorts: readonly ShortFinding[]; readonly contractVersion: number }`
  - `netlistEquivalence(dumpText: string, reference: ReferenceNets): EquivalenceVerdict` — **dump TEXT, not a `BoardDump`**, calling `boardGeometry` internally so the whole geometry contract is enforced before any verdict exists
  - `describeVerdict(verdict: EquivalenceVerdict): readonly string[]` — one line per finding, naming the net or nets
- Task 14's `HC8` check calls `netlistEquivalence` with the dump text it already holds and renders `describeVerdict`; nothing else in the pipeline calls either.

**Why the signature is text, and why this is recorded as a repeat rather than as a fix.** The
earlier draft specified `netlistEquivalence(dump: BoardDump, reference)`. Measured by Task 4's
implementer and re-run by its reviewer: that signature **cannot deliver two of `HC8`'s own
refusals.** A parsed `BoardDump` carries a grid and a boolean axis **by construction**, so
`missing-line` and `unsupported-strip-axis` can never fire from it; a caller that parsed the text
itself still throws — `parseBoardDump` refuses a missing `GRID` — but with the **parser's** wording,
which names neither the refusal member nor the contract version, so `HC8`'s required wording is not
delivered at all.

**This is the SECOND instance of one root cause: a plan that hands a parsed object to a function
whose contract is about the text.** Task 3 hit it first, and the plan was corrected at `d711d5c` by
adding `boardGeometry` as the contract-enforcing entry point. Task 4 hit the identical shape one
task later, because the correction landed on Task 3's `Provides` and not on its consumers'
signatures. The two instances are one defect with two sites, so the rule is stated once and
applied everywhere: **a function whose contract quotes line names takes the lines.** Task 5 and
Task 14 are the other consumers and are corrected below for the same reason.

- [ ] **Step 1: Write the failing test.**

```ts
import { test, expect } from "bun:test"
import { netlistEquivalence, describeVerdict } from "../../tools/stripboard/equivalence.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import { GEOMETRY_CONTRACT_VERSION } from "../../tools/stripboard/copper.ts"
import { importClosure } from "./import-closure.ts"

/**
 * Two strips, three nets, one cut on strip 1 between columns 1 and 2. R1
 * bridges the strips; R2 sits along strip 1 straddling the cut, which is the
 * ordinary stripboard idiom and not a short.
 *
 * Strip 0 (row 0) is uncut and holds R1.1 alone, so net `in` is one component;
 * strip 1 splits into {1,0 1,1} - R1.2 and R2.1, net `mid` - and {1,2 1,3} -
 * R2.2, net `out`. Every board in this file is DUMP TEXT, which is the
 * module's real input seam.
 */
const WHOLE = [
  "GRID 2 4",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PART R2 RESISTOR4 1k AT 1,0 SPAN 1",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 1,0",
  "PIN R2 1 AT 1,1",
  "PIN R2 2 AT 1,3",
  "CUT 1,1,3 1,2,4",
].join("\n")

const REFERENCE: ReferenceNets = new Map([
  ["in", ["R1.1"]],
  ["mid", ["R1.2", "R2.1"]],
  ["out", ["R2.2"]],
])

/** The same board with every `CUT` line removed: strip 1 then joins `mid` to `out`. */
const UNCUT = WHOLE.split("\n")
  .filter((line) => !line.startsWith("CUT "))
  .join("\n")

/**
 * The message a call refused with, or "" when it did not refuse.
 *
 * WHY A HELPER RATHER THAN `toThrow(/.../)`. Every refusal here carries
 * explanatory prose that names the same words a loose pattern would match, so
 * the assertions below anchor on the refusal's own OPENING CLAUSE with
 * `toStartWith` and read the explanation with a separate `toContain`. See the
 * note on the floated-pin test, which is where the loose form was measured
 * failing to discriminate.
 */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("a board whose copper partitions the pins as the netlist does is equivalent", () => {
  const verdict = netlistEquivalence(WHOLE, REFERENCE)
  expect(verdict.opens).toEqual([])
  expect(verdict.shorts).toEqual([])
  expect(verdict.equivalent).toBe(true)
  expect(verdict.contractVersion).toBe(1)
})

test("an OPEN is rejected, naming the net and the groups its pins fell into", () => {
  // Sever strip 1 between R1.2 at 1,0 and R2.1 at 1,1, which is net `mid`.
  const verdict = netlistEquivalence(`${WHOLE}\nCUT 1,0,3 1,1,9`, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  expect(verdict.opens.map((finding) => finding.net)).toEqual(["mid"])
  const groups = verdict.opens[0]?.groups.map((group) => [...group].sort())
  expect(groups).toEqual([["R1.2"], ["R2.1"]])
  expect(describeVerdict(verdict).join("\n")).toMatch(/mid/)
})

test("a SHORT is rejected, naming BOTH nets - the direction no pre-existing check looks for", () => {
  // Remove the separating cut and `mid` and `out` share strip 1. This is the
  // defect class CRITERIA's HC8 exists for: VeroRoute's membership still
  // partitions the pins by what each component records, so both nets read
  // complete and --check exits 0.
  const verdict = netlistEquivalence(UNCUT, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  expect(verdict.shorts).toHaveLength(1)
  expect([...(verdict.shorts[0]?.nets ?? [])].sort()).toEqual(["mid", "out"])
  expect(describeVerdict(verdict).join("\n")).toMatch(/mid/)
  expect(describeVerdict(verdict).join("\n")).toMatch(/out/)
})

test("an open and a short are reported separately, not collapsed into one failure", () => {
  // `as never` removed: an earlier version passed
  // `{ ...Object.fromEntries(REFERENCE) } as never`, which is a typing bypass
  // (CLAUDE.md forbids `any`, `as Type` and `@ts-ignore`) AND a pointless
  // round trip - REFERENCE is already a ReferenceNets.
  //
  // THE EARLIER FIXTURE FOR THIS TEST PRODUCED NO OPEN, and this is the
  // defect this plan exists to prevent appearing in the plan's own text: a
  // test whose NAME claims a direction its FIXTURE cannot produce. It removed
  // every cut and added `CUT 0,1,1 0,2,2`, severing strip 0 - and strip 0
  // holds only R1.1, a one-pin net, so no net spans two components. Measured:
  // `opens: 0, shorts: 1`. The test would have failed for the fixture's sake
  // rather than the code's, and a reader would have taken the name for the
  // guarantee.
  //
  // CORRECTED BY MOVING THE CUT, not by removing it. Severing strip 1 between
  // columns 0 and 1 leaves R1.2 at 1,0 alone in its component and R2.1 at 1,1
  // joined to R2.2 at 1,3: net `mid` spans two components, which is the OPEN,
  // while `mid` and `out` share the second, which is the SHORT. One board,
  // both directions, so the test does not have to be split.
  const both = WHOLE.replace("CUT 1,1,3 1,2,4", "CUT 1,0,3 1,1,9")
  const verdict = netlistEquivalence(both, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  // "Reported separately" is the name's claim, so both lists are asserted
  // non-empty rather than only the conjunction they imply - and then each is
  // asserted to name the right net, so neither list can be non-empty for the
  // wrong reason.
  expect(verdict.opens.length).toBeGreaterThan(0)
  expect(verdict.shorts.length).toBeGreaterThan(0)
  expect(verdict.opens.map((finding) => finding.net)).toEqual(["mid"])
  expect([...(verdict.shorts[0]?.nets ?? [])].sort()).toEqual(["mid", "out"])
  const lines = describeVerdict(verdict)
  expect(lines).toHaveLength(2)
  expect(lines[0]).toStartWith("OPEN:")
  expect(lines[1]).toStartWith("SHORT:")
})

test("a reference pin with no PIN line refuses, because a missing hole is not an open", () => {
  // A placed part with no PIN lines is HC3's refusal and HC8's too. Treating
  // it as an open would report the wrong constraint and point at the wrong fix.
  //
  // ANCHORED, NOT MATCHED, AND THE PATTERN HAS NOW APPEARED THREE TIMES.
  // `toThrow(/R2\.1/)` plus `toThrow(/PIN/)` CANNOT DISTINGUISH this refusal
  // from its neighbour, verified by running it: the refusal's own prose names
  // `R2.1` and `PIN` while explaining itself, and so does the neighbouring
  // `hole-outside-copper-graph` refusal, so a mutant that returns an
  // off-board sentinel instead of refusing passes both patterns while
  // pointing a reader at copper.ts instead of at the floating part.
  //
  // THREE APPEARANCES, recorded so the next author does not reach for
  // `toContain` again: the plan's draft shipped the loose pair; the
  // controller's proposed fix carried the identical defect and measured
  // 16 pass / 0 fail against the mutant; only an assertion anchored on the
  // refusal's own OPENING CLAUSE - past the explanatory prose - discriminated.
  // The rule for every refusal assertion in this plan: `toStartWith` on the
  // member and its first clause, then `toContain` for the explanation. Never
  // `toContain` or a bare regex alone, which the message's own explanation of
  // itself satisfies.
  const floated = WHOLE.replace(
    "PART R2 RESISTOR4 1k AT 1,0 SPAN 1",
    "PART R2 RESISTOR4 1k FLOATING SPAN 1",
  )
    .replace("PIN R2 1 AT 1,1\n", "")
    .replace("PIN R2 2 AT 1,3\n", "")
  const message = refusalFrom(() => netlistEquivalence(floated, REFERENCE))
  expect(message).toStartWith(
    "reference-pin-not-on-board: R2.1 is a reference pin and the dump prints no PIN line for it.",
  )
  expect(message).toContain("is NOT an open")
})

test("an empty reference refuses rather than reporting equivalence vacuously", () => {
  const message = refusalFrom(() => netlistEquivalence(WHOLE, new Map()))
  expect(message).toStartWith("empty-reference: the reference netlist has no nets")
})

test("a missing contracted line refuses in HC8's own words, which only the text entry point can say", () => {
  // The signature correction above, as a test rather than as an argument.
  // `missing-line` is inexpressible through a `BoardDump`, and a caller that
  // parsed the text itself would throw in the PARSER's wording, which names
  // neither the refusal member nor the contract version.
  const noAxis = WHOLE.split("\n")
    .filter((line) => !line.startsWith("VERTICAL_STRIPS"))
    .join("\n")
  const message = refusalFrom(() => netlistEquivalence(noAxis, REFERENCE))
  expect(message).toStartWith("missing-line: the dump has no VERTICAL_STRIPS line.")
  expect(message).toContain(`HC8 geometry contract version ${GEOMETRY_CONTRACT_VERSION}`)
})

test("the verdict is unchanged when the NODE block is emptied and the CUT node ids garbled", () => {
  // V11. The whole independence claim, as a comparison rather than an assertion.
  //
  // TWO GRAMMAR FAULTS CORRECTED, both checked against `parseBoardDump` and
  // both the SECOND occurrence of a fault `d711d5c` already fixed elsewhere:
  //
  // - A NODE line is `NODE <id> NAME <name-or-dash> <ref>.<pin> ...`
  //   (Headless_dump.cpp:67 and :307), so the earlier `NODE 1 mid R1.2 R2.1`
  //   is unreadable and throws "unreadable NODE line" in the parser before
  //   any verdict exists. The NAME keyword is not optional.
  // - A CUT hole's node id is UNSIGNED - `parseNodedHole` matches
  //   `^(\d+),(\d+),(\d+)$` - so the earlier `-1` throws "unreadable noded
  //   hole position". The garbled ids are therefore large rather than
  //   negative, which garbles them just as thoroughly and is the point of
  //   the test.
  //
  // THE `toEqual` BELOW IS DECORATIVE AT THIS LAYER, and the `.equivalent`
  // assertions after it are what carry the test. Verified under a node-keyed
  // mutant - each pin's component taken from the node id its CUT line
  // reports, a spare number for a hole no CUT line names: `toEqual` PASSED,
  // because both calls returned the SAME wrong verdict, and `.equivalent`
  // FAILED. So the equality can hold while the verdict is wrong. DO NOT
  // DELETE THE `.equivalent` LINES as redundant with the equality: an
  // equality-only body here would be a name claiming more than it proves,
  // which is the defect this plan is built around.
  const withNodes = `${WHOLE}\nNODE 1 NAME mid R1.2 R2.1\nNODE 2 NAME out R2.2`
  const garbled = withNodes
    .replace("CUT 1,1,3 1,2,4", "CUT 1,1,999999 1,2,424242")
    .replace(/^NODE .*$/gm, "")
  expect(netlistEquivalence(garbled, REFERENCE)).toEqual(netlistEquivalence(withNodes, REFERENCE))
  // And it is the EQUIVALENT verdict both times, so the comparison is not two
  // identical wrong answers agreeing with each other.
  expect(netlistEquivalence(garbled, REFERENCE).equivalent).toBe(true)
  expect(netlistEquivalence(withNodes, REFERENCE).equivalent).toBe(true)
})

test("nothing in this module's TRANSITIVE import closure is the scorer or the check path", async () => {
  // HC8 shares no code with the scorer or with --check, asserted over the
  // closure rather than over this file's text.
  //
  // THE TEST THIS REPLACES was `expect(text).not.toContain("score.ts")` on one
  // file, with a comment claiming it read the import graph. It did not: one
  // transitive import through any third module satisfies it, so the claim was
  // stronger than the check and the gap was invisible. Same defect, same shape,
  // as Task 14's - see tests/stripboard/import-closure.ts.
  const closure = await importClosure("tools/stripboard/equivalence.ts")
  for (const forbidden of ["tools/stripboard/score.ts", "tools/perfboard/check.ts"]) {
    expect([...closure].sort(), forbidden).not.toContain(forbidden)
  }
})

test("the closure walker finds a TRANSITIVE import, which is the whole reason it exists", async () => {
  // The guard on the guard, and it is not optional: a walker that returned only
  // direct imports would make every test above as weak as the substring scan it
  // replaced, while looking stronger. equivalence.ts imports copper.ts, which
  // imports tools/guide/dump.ts, which equivalence.ts does not name.
  const closure = await importClosure("tools/stripboard/equivalence.ts")
  expect([...closure]).toContain("tools/stripboard/copper.ts")
  expect([...closure]).toContain("tools/guide/dump.ts")
  const direct = await Bun.file("tools/stripboard/equivalence.ts").text()
  expect(direct, "dump.ts must be reached transitively, not named here").not.toContain("guide/dump.ts")
  // And the closure includes its own entry point, so a test asserting absence
  // also catches the entry point BEING the forbidden module.
  expect([...closure]).toContain("tools/stripboard/equivalence.ts")
})

test("the closure walker refuses an unresolvable import rather than dropping the edge", async () => {
  await expect(importClosure("tools/stripboard/does-not-exist.ts")).rejects.toThrow(/not a file/)
})

test("this module never names a nodeId, which is a TEXT claim and is labelled as one", async () => {
  // A SCAN, named as a scan. The closure cannot see this: reading `.nodeId` off
  // a value whose type already crossed the boundary is a use, not an import.
  // What a scan proves is that the identifiers do not appear in this file; what
  // it does not prove is that no equivalent is reached by another spelling or
  // through a helper. The BEHAVIOURAL version of this claim - the verdict is
  // unchanged when the NODE block is emptied and the CUT ids garbled - is the
  // test above it, and that one is the guarantee.
  const text = await Bun.file("tools/stripboard/equivalence.ts").text()
  expect(text).not.toContain(".nodes")
  expect(text).not.toContain("nodeId")
})
```

  Both closure tests are `async`; declare them `test("...", async () => { ... })`.

- [ ] **Step 1b: Write `tests/stripboard/import-closure.ts`.** One walker, used by this task, Task 14 and Task 18, because three copies of a structural claim is three places for it to rot. It is **not** a `.test.ts` file, following `tests/circuits/kicad-round-trip.ts`.

```ts
/**
 * The transitive import closure of a module, as repository-relative paths.
 *
 * WHY THIS EXISTS. Three tests in this pipeline make a structural claim about
 * what a module may reach: HC8's independence (Task 4), R2's generate-and-grade
 * split (Task 14) and the search's freedom from non-determinism (Task 18). All
 * three were first written as `expect(text).not.toContain("score.ts")` over one
 * file, which a single transitive import through any third module satisfies -
 * a weak check under a strong name, which is a false guarantee rather than a
 * known limit.
 *
 * IT REFUSES RATHER THAN DEGRADES. An import specifier it cannot resolve to a
 * file is an error naming the importer and the specifier, because a closure
 * computed over a partial graph is smaller than the real one and a forbidden
 * module may be exactly what fell out of it. A check that passes by looking at
 * nothing is the failure mode this whole plan is built against.
 *
 * TYPE-ONLY IMPORTS COUNT. `import type { Score } from "./score.ts"` ships no
 * runtime code, but R2 is about two implementations sharing nothing, and a type
 * definition crossing the boundary is a shared definition. Counting it is the
 * stricter and simpler rule, and nothing in this plan needs the exemption.
 *
 * It relies on this repository's own import convention - explicit relative
 * paths with the .ts extension (CLAUDE.md) - and refuses a bare specifier
 * rather than guessing at a resolver. `EXTERNAL` is the enumerated set of
 * bare specifiers that are not repository files, skipped BY NAME: an empty
 * whitelist that refuses loudly beats a general rule that quietly accepts a
 * guess, so a new dependency arriving in a closure is a deliberate edit here.
 *
 * THE EARLIER CLAIM THAT THE ONLY BARE SPECIFIERS ARE NODE BUILTINS AND
 * `bun:test` IS WRONG, measured: `lib/sim/operating-point.ts` imports
 * `eecircuit-engine`, this repository's npm dependency, and any closure
 * reaching `lib/sim/` hits it. `tools/perfboard/check.ts`'s own closure does,
 * which is how it was found - the walker refused the bare specifier and a
 * mutation test failed on "neither relative nor a known external" instead of
 * on the forbidden module. Loud either way, but it named the wrong fault, so
 * the package is enumerated below.
 */
import fs from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** Specifiers that are not repository files and are skipped by name, not by pattern. */
const EXTERNAL = new Set(["bun", "bun:test", "bun:sqlite", "eecircuit-engine"])

function specifiersIn(text: string): readonly string[] {
  // `from "..."` covers static imports and re-exports; `import("...")` covers
  // the dynamic form. Both are matched because either one reaches a module.
  const found = [
    ...text.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?from\s*["']([^"']+)["']/g),
    ...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ]
  return found.map((match) => match[1] ?? "")
}

/**
 * Every module `entry` can reach, as repository-relative paths, INCLUDING
 * `entry` itself - so a test asserting a forbidden module is absent also fails
 * when the entry point IS the forbidden module.
 */
export async function importClosure(entry: string): Promise<ReadonlySet<string>> {
  const seen = new Set<string>()
  const queue = [path.resolve(REPO_ROOT, entry)]
  while (queue.length > 0) {
    const absolute = queue.pop()
    if (absolute === undefined) throw new Error("unreachable: popped an empty queue")
    const relative = path.relative(REPO_ROOT, absolute)
    if (seen.has(relative)) continue
    if (!fs.existsSync(absolute)) {
      throw new Error(
        `the import closure of "${entry}" reaches "${relative}", which is not a file. This is ` +
          "an error and not a skipped edge: a closure computed over a partial graph is smaller " +
          "than the real one, and the module that fell out of it may be the forbidden one.",
      )
    }
    seen.add(relative)
    for (const specifier of specifiersIn(fs.readFileSync(absolute, "utf8"))) {
      if (EXTERNAL.has(specifier) || specifier.startsWith("node:")) continue
      if (!specifier.startsWith(".")) {
        throw new Error(
          `"${relative}" imports "${specifier}", which is neither relative nor a known external. ` +
            "This repository's convention is explicit relative paths with the .ts extension " +
            "(CLAUDE.md), and this walker refuses to guess at a resolver rather than silently " +
            "dropping an edge from a closure a test draws a conclusion from.",
        )
      }
      queue.push(path.resolve(path.dirname(absolute), specifier))
    }
  }
  return seen
}
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement `tools/stripboard/equivalence.ts`.** `netlistEquivalence` takes the dump **text** and its first act is `boardGeometry(dumpText)`, so every one of the nine geometry refusals is available before a verdict exists; `copperGraph` and `pinHoles` then run on what `boardGeometry` returns. Map every reference pin to its hole through `pinHoles`, refusing by name for a reference pin with no `PIN` line; look each hole's component up in `copperGraph`; then two passes. An **open** is a reference net whose pins fall in two or more components, reported with the pins grouped by component. A **short** is a component holding pins of two or more reference nets, reported with the net names sorted and one hole that witnesses it. `equivalent` is `opens.length === 0 && shorts.length === 0`. `describeVerdict` renders one line per finding naming the net or nets, the components or the hole, and — for a short — that no completeness check detects this because both nets still read complete.

- [ ] **Step 4: Prove the tests can fail.** Seven breaks: return `{ equivalent: true, opens: [], shorts: [] }` unconditionally (every negative test fails — *the vacuous verdict*, run this one first); report opens only (the short test fails); key the components on the dump's own node records instead of the copper graph (the short test and the behavioural independence test fail, which is the whole argument for `HC8` reproduced as failing tests — **and record which assertion caught it**, because this mutant passes V11's `toEqual` and fails only on `.equivalent`); treat a missing `PIN` line as an open — `holeOfPin` returning the real hole — (the floated test fails with no refusal at all); **make `holeOfPin` return an off-board sentinel instead of refusing** (the floated test fails on a *different* refusal, which is the mutant the unanchored `toThrow(/PIN/)` passed and the reason that assertion is anchored); **swap `boardGeometry` for `parseBoardDump`** (the missing-line test fails, showing the parser's wording in place of `HC8`'s); **add `import { scoreDump } from "./score.ts"` to `equivalence.ts` and confirm the closure test fails, then add it to `copper.ts` instead — a module `equivalence.ts` imports but does not name — and confirm the closure test fails *again*.** That second half is the one to run, because it is exactly the case the replaced substring scan passed.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("HC8 rejects an open and a short, each by name, from the copper alone"), push.

---

### Task 5: The frozen fixture, and `HC8` agreement on five boards

**Files:** create `tests/fixtures/stripboard/pultec-low-boost-frozen.vrt`, `.netlist`, `.dump`, `provenance.txt`; create `tests/stripboard/agreement.test.ts`; modify `tools/stripboard/equivalence.ts` only if a reader for the netlist export does not already exist elsewhere (see Interfaces).

**Interfaces:**
- *Consumes:* Task 4's `netlistEquivalence` and `ReferenceNets`. **`netlistEquivalence` takes dump TEXT** — see Task 4's signature note — so every call here passes the text it read and **nothing here pre-parses for it**. `parseBoardDump` is still imported, for the tests that read `grid`, `cutState`, `nodes` and `pins` off a `BoardDump`; its result is never handed to `netlistEquivalence`.
- *Provides:*
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.vrt` — `B2`'s frozen board, `git show 2f62ee1:boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.netlist` — the netlist export the layout was built against, as text
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.dump` — this binary's `--dump-board` on that board
  - `referenceNetsFromExport(text: string): ReferenceNets` in `tools/stripboard/equivalence.ts` — the one reader of a netlist export into `HC8`'s input, so no later task writes a second one, **and the owner of the one-pin-one-net rule below**
- Task 23's `B1-frozen` run consumes the three fixture files; Task 14 consumes `referenceNetsFromExport`.

**The fixture lives under `tests/fixtures/`, never under `boards/`**, because `make -C boards/<board> check` regenerates the export every run and decides freshness by content, so *"a deliberately frozen model under `boards/` is a deliberately stale one the freshness guard would be right to fail"*.

**A requirement this task inherits from Task 4's review, and it is `referenceNetsFromExport`'s to
discharge.** `equivalence.ts` as shipped **does not refuse one `ref.pin` appearing in two reference
nets.** Measured: it reports `shorts: [{ nets: ["alias", "mid"], hole: "1,0" }]` — *blaming the
copper for a netlist defect*, on a board whose copper is correct. One pin on two nets is not a
board that shorts; it is an export that cannot be true, and a verdict that reports it as a short
points a reader at a layout to fix instead of at the netlist. **So `referenceNetsFromExport`
refuses it**, naming the pin and both nets, with the refusal saying why it is not a short and not
defaulted — the reader of the export is where the export's own consistency is established, and
`netlistEquivalence` keeps no second check for it, because two owners of one rule is one more than
this plan allows. A test asserts the refusal, anchored on its opening clause the way Task 4's are,
over the hand-written export below. The grammar is EESchema v1.1, and
`lib/kicad/legacy-netlist.ts` is the repository's reader for it — it records a repeated pin under
both net names without complaint, which is how the defect reaches `HC8` in the first place, so the
refusal is a check `referenceNetsFromExport` adds over whichever reader it uses rather than one it
inherits.

- [ ] **Step 1: Extract the board and record what it dumps.** Into the scratchpad first, never over a path under `boards/`:

```
git show 2f62ee1:boards/pultec-low-boost/pultec-low-boost.perfboard.vrt > "$SCRATCH/frozen.vrt"
.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute --dump-board "$SCRATCH/frozen.vrt" > "$SCRATCH/frozen.dump"
grep -c '^NODE ' "$SCRATCH/frozen.dump"
grep -c '^PIN ' "$SCRATCH/frozen.dump"
grep -c '^CUT ' "$SCRATCH/frozen.dump"
grep -c '^WIRE' "$SCRATCH/frozen.dump"
grep '^GRID\|^VERTICAL_STRIPS\|^CUT_STATE' "$SCRATCH/frozen.dump"
```

  PIPELINE §3.2.2 reports, measured against this commit: 9 `NODE`, 27 `PIN`, 5 `CUT `, one `SOLDER`, no `WIRE`, `GRID 14 32`. **No grid figure is restated in any test; the fixture's own `GRID` line is the authority** — assert the dump's `grid` against itself where a test needs it, never against a literal.

- [ ] **Step 2: Produce the netlist export as of `2f62ee1`, and check it against the board.** Export from the model at that commit — `git show 2f62ee1:circuits/...` into a scratch worktree, or `git worktree add` a detached checkout of `2f62ee1` and run this repository's netlist export there. **If the extraction cannot produce an export whose net count and pin count agree with step 1's 9 and 27, `B2` says the fixture is wrong and which number disagreed: report that, and do not adjust the export until the benchmark passes.** A fixture tuned to make its own test pass is not a benchmark.

- [ ] **Step 3: Write the provenance file**, using `tests/fixtures/pultec-low-boost-c19-floated.provenance.txt` as the template and matching its sections exactly: what the files are; why they are committed rather than regenerated; the exact commands; the input board with its commit and `sha256`; each fixture's own `sha256`; the binary's commit **and** its `builtCommit()`; and a closing section on what may **not** be concluded from it — in particular that it is 9 nets and 27 pins and is **not** today's scaffolded low-boost, which is 14 nets and 40 pins, and that `B1-frozen`'s `C ≤ 5` and `W = 0` apply here and nowhere else.

- [ ] **Step 4: Write the failing test** (`tests/stripboard/agreement.test.ts`):

```ts
import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { netlistEquivalence, referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"

/**
 * The message a call refused with, or "" when it did not refuse - the same
 * shape as Task 4's, because every refusal assertion in this pipeline anchors
 * on the refusal's own opening clause rather than matching its prose. Two
 * copies is the limit: if a THIRD test file needs it, it moves beside
 * `importClosure` in tests/stripboard/ and all three import it.
 */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const BOARDS = [
  ["the frozen low-boost fixture", "tests/fixtures/stripboard/pultec-low-boost-frozen.dump",
    "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist"],
  ["pt2399-core", "tests/fixtures/pt2399-core-board.dump", "tests/fixtures/pt2399-core-veroroute.net"],
] as const

for (const [label, dumpPath, netlistPath] of BOARDS) {
  test(`HC8 agrees with the reference netlist on ${label}`, async () => {
    // The TEXT is what HC8 consumes, so nothing here parses it first: the
    // geometry contract is enforced inside netlistEquivalence.
    const dumpText = await Bun.file(dumpPath).text()
    const reference = referenceNetsFromExport(await Bun.file(netlistPath).text())
    const verdict = netlistEquivalence(dumpText, reference)
    expect(verdict.opens, `${label} opens`).toEqual([])
    expect(verdict.shorts, `${label} shorts`).toEqual([])
  })
}

test("HC8 rejects the floated-C19 board from the copper side, not only HC3's side", async () => {
  // Two independent detections of one measured failure is the standard; one is
  // a coincidence. C19's pins vanish from the PIN lines, so a reference net
  // holding them has a pin with no hole, and HC8 refuses naming the pin.
  //
  // THIS TEST WAS A PLACEHOLDER. It read `const text =
  // Bun.file("...c19-floated.dump"); expect(text).toBeDefined()` under the name
  // above - and Bun.file is defined for a path that does not exist, so it
  // asserted nothing at all while claiming HC8 rejected the board. This plan's
  // own placeholder scan missed it because it scanned for TBD and TODO and the
  // test had neither. A strong name over an empty body is the defect; the scan
  // now reads bodies.
  // ANCHORED, NOT MATCHED, for Task 4's measured reason: the refusal's own
  // prose names `C19` and `PIN` while explaining itself, and so does the
  // neighbouring `hole-outside-copper-graph` refusal, so `toThrow(/C19\./)`
  // plus `toThrow(/PIN/)` cannot tell the intended refusal from its
  // neighbour - a mutant that returns an off-board sentinel instead of
  // refusing satisfies both. The assertion anchors on the member and the
  // reference it names, then reads the explanation separately. Which of
  // C19's pins is named is whichever the export lists first and is NOT
  // written here; record the full message beside the test once it is run.
  const dumpText = await Bun.file("tests/fixtures/pultec-low-boost-c19-floated.dump").text()
  const reference = referenceNetsFromExport(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.netlist").text(),
  )
  const message = refusalFrom(() => netlistEquivalence(dumpText, reference))
  expect(message).toStartWith("reference-pin-not-on-board: C19.")
  expect(message).toContain("the dump prints no PIN line for it")
  expect(message).toContain("is NOT an open")
})

/**
 * One `ref.pin` on two nets, in EESchema v1.1 - the grammar
 * `lib/kicad/legacy-netlist.ts` reads and the committed `.net` fixtures use.
 * R1.1 is listed under both `mid` and `alias`, which is an export that cannot
 * be true of any board.
 */
const PIN_IN_TWO_NETS = [
  "( { EESchema Netlist Version 1.1 created 2026-10-11T00:00:00 }",
  " ( /R1 RESISTOR4  R1 1k",
  "  (    1 mid )",
  "  (    1 alias )",
  "  (    2 out )",
  " )",
  ")",
  "*",
].join("\n")

test("referenceNetsFromExport refuses one ref.pin on two nets, rather than letting HC8 call it a short", () => {
  // THE MINOR TASK 4'S REVIEW LEFT HERE, measured on the shipped
  // equivalence.ts: with R1.1 on two nets, the verdict reported
  // `shorts: [{ nets: ["alias", "mid"], hole: "1,0" }]` - BLAMING THE COPPER
  // FOR A NETLIST DEFECT, on a board whose copper is correct. The remedy a
  // reader would act on is a layout change, and there is nothing wrong with
  // the layout.
  //
  // The reader of the export owns the export's own consistency, so the
  // refusal is here and `netlistEquivalence` keeps no second check for it.
  // Anchored on the opening clause, like every other refusal assertion in
  // this pipeline, and it names BOTH nets so a reader can find them.
  const message = refusalFrom(() => referenceNetsFromExport(PIN_IN_TWO_NETS))
  expect(message).toStartWith("pin-on-two-nets: R1.1")
  expect(message).toContain("alias")
  expect(message).toContain("mid")
  expect(message).toContain("not a short")
})

test("the frozen fixture's grid and cut state come from the fixture, and its sha256 is recorded", async () => {
  const dump = parseBoardDump(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.dump").text(),
  )
  // No literal grid: B2's rule is that the fixture's GRID line is the
  // authority. What is asserted is that the parse found one and that the board
  // is COMPUTED - NOT that any particular number is right, which is the
  // fixture's own job and which this test deliberately does not duplicate.
  expect(dump.grid.rows).toBeGreaterThan(0)
  expect(dump.grid.cols).toBeGreaterThan(0)
  expect(dump.cutState).toBe("COMPUTED")
  const provenance = await Bun.file(
    "tests/fixtures/stripboard/provenance.txt",
  ).text()
  const hash = Bun.SHA256.hash(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.vrt").arrayBuffer(),
  )
  expect(provenance).toContain(Buffer.from(hash).toString("hex"))
})

test("the recorded net and pin counts agree with the fixture's own dump - B2's benchmark", async () => {
  // B2: if the extraction cannot produce an export agreeing with the fixture
  // board's own NODE and PIN counts, "the fixture is wrong and says which
  // number disagreed". Both sides are READ - the dump's own lines and the
  // netlist export's own nets - so no count is written here and a fixture
  // tuned to pass its own test cannot.
  const dump = parseBoardDump(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.dump").text(),
  )
  const reference = referenceNetsFromExport(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.netlist").text(),
  )
  const dumpNets = Object.keys(dump.nodes).length
  const dumpPins = Object.values(dump.pins).reduce((total, list) => total + list.length, 0)
  const referencePins = [...reference.values()].reduce((total, list) => total + list.length, 0)
  expect(reference.size, "net count: the netlist export disagrees with the board's NODE lines")
    .toBe(dumpNets)
  expect(referencePins, "pin count: the netlist export disagrees with the board's PIN lines")
    .toBe(dumpPins)
})
```

  **The two further benchmark boards.** `transistor-preamp-feedback` and `transistor-preamp-staged` have committed `.net` fixtures but no committed `--dump-board` capture. Add each to `BOARDS` by committing its dump beside the others with a provenance entry, produced by `--dump-board` on its committed `.vrt` at the pinned binary. If a board's dump cannot be produced — `transistor-preamp-lab` reports `CUT_STATE UNRESOLVED` with 19 `CUT_CONFLICT` lines and `HC2` excludes it — **leave it out and say so in the test file's header comment**, naming the board and the reason. `transistor-preamp-lab` is not in the benchmark set.

- [ ] **Step 5: Run it, confirm it fails**, then implement `referenceNetsFromExport` — **including the one-pin-one-net refusal above**, which is a requirement of this task and not an optional hardening — and commit the fixtures.

- [ ] **Step 6: Prove the test can fail.** Four breaks: flip one `PIN` row in the frozen dump by one and confirm the agreement test fails naming the board (then revert — **the fixture is not edited**, the break is applied to a copy in the test); make `netlistEquivalence` return `equivalent: true` unconditionally and confirm every row fails; **put `C19`'s two `PIN` lines back into a copy of the floated dump and confirm the floated test fails** — without that, the floated test passes for any dump that happens to throw, which is how it came to be a placeholder in the first place; and **drop the one-pin-one-net refusal and confirm its test fails**, recording what `netlistEquivalence` then reported, because the wrong answer it gives is a short that names two nets and a hole on a board whose copper is correct. Record all four beside their tests.

- [ ] **Step 7: Run** `bun test && bun run typecheck`, **commit** ("Freeze low-boost's hand layout as a fixture, and check HC8 against four authored boards"), push.

---

### Task 6: `HC8`'s board-level short fixture — OWNER-BLOCKED (OB5)

**This task is blocked and is recorded rather than planned around. Do not implement it by inventing a mechanism.**

**What is blocked.** A committed `.vrt` on which **two reference nets share one strip with the separating `CUT` removed**, so that `GetBoardMembership` still partitions the pins by what each component records, both nets still read *complete*, and `--check` exits 0 — while `HC8` rejects it naming both nets. What it would prove is the claim Task 4 cannot make: that `HC8` detects *a class of defect no pre-existing check detects at all*.

**Why it is blocked.** Cuts are **derived** — `DeriveCuts`, reported under `CUT_STATE COMPUTED` — and **no verb in the pinned fork edits one.** The shipped set is `--dump-netlist`, `--dump-board`, `--import`, `--update`, `--check`, `--adopt`, `--set-strips`, `--stretch` and `--move`, and the test-only `--author` takes `group|select|move-label|add-wire|merge|autofill`. None of the fifteen edits a cut. So `tests/fixtures/pultec-low-boost-c19-floated.*`'s route does not transfer: that fixture was captured from a verb that produced the defect by itself.

**What CRITERIA records as the candidate routes, none of them chosen:** a layout whose derivation yields no separating cut; a fork change; or a hand-built board under the provenance discipline. **An invented mechanism here would be a fixture nobody can reproduce**, which is the one property a negative fixture must have.

**What has already landed in its place, and what it does not cover.** Task 4 proves both directions of `HC8` from hand-written dump text. That is the module's real input seam — `netlistEquivalence` reads dump text and a netlist export and nothing else — and `tests/perfboard/floating-fixture.test.ts` already establishes the technique in this repository. What it does not establish is the end-to-end claim, because there is no board for `--check` to exit 0 on. **So `HC8` ships with its short direction tested and the "no pre-existing check catches this" claim unproven**, and that is stated in Task 4's test header rather than left for a reader to infer.

- [ ] **Step 1: Ask the owner which route to take**, in prose, presenting the three CRITERIA records with what each costs: a derivation-yields-no-cut layout needs a circuit whose nets genuinely share a strip with no boundary, which may not exist on these boards; a fork change means a cut-editing verb, which is a new actuator outside Milestone 1's boundary and PIPELINE §11 currently lists further fork changes as out of scope; a hand-built board means the owner in the GUI, which is his bench time and is what this sub-project exists to spend less of.
- [ ] **Step 2: On an answer, implement it** with the full provenance discipline — the input board and its commit and `sha256`, the fixture's own `sha256`, the exact commands, the binary's commit **and** its `builtCommit()`, and a section on what may not be concluded — and add the end-to-end assertion: `--check` exits 0 on it, and `netlistEquivalence` rejects it naming both nets. Then delete this task's blocked note from Task 4's test header, because supersede means delete.
- [ ] **Step 3: Commit** ("A board whose copper joins two nets while every existing check passes it"), push.

---

### Task 7: M1.1 — `BOUNDS`, `DIRECTION`, and the false `--help` SPAN claim

**OWNER-BLOCKED (OB1) at step 5: the push to `oletizi/veroroute-perfboard` is the owner's to authorise.**

**Files:** in the fork, create nothing; modify `Src/Headless_dump.cpp` (or `Src/Headless_dump_pins.cpp`, following its own precedent of documenting a line in the file that prints it), `Src/Headless_help.cpp`, `tests/dump-pins.test.ts` or a new `tests/bounds.test.ts`, `tests/mutation/`'s catalogue. In this repository: modify `tools/guide/dump.ts`, `tests/guide/dump.test.ts`, `veroroute.pin`.

**Interfaces:**
- *Consumes:* Task 1's published pin and binary.
- *Provides:*
  - a dump line `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>`, from `Board::GetBounds` (`Board.h:710`), emitted once per board
  - a `DIRECTION <W|E|N|S>` field on every placed `PART` line, from `Component::GetDirection()`
  - in `tools/guide/dump.ts`: `Bounds { readonly minRow: number; readonly minCol: number; readonly maxRow: number; readonly maxCol: number }`, `BoardDump.bounds: Bounds`, and `Part.direction: "W" | "E" | "N" | "S" | undefined` (`undefined` exactly when the part is floating, which prints no direction)
- Task 8's effect check consumes `Part.direction`; **Task 14's `HC10` placement half consumes `Part.direction` too**; Task 15's `A_occ` consumes `BoardDump.bounds` and **nothing else** — the bounding box of the `PIN` and `WIRE` holes is a *different quantity* (lead extent, not the footprint rectangle) and substituting it would silently redefine a settled ranking term. **Task 14's `HC6` consumes `bounds` AND the enumerated feature holes**, for the reason below.

**What `BOUNDS` is, read from the source rather than from its name — and it is not one quantity.**
`Board::GetBounds` (`Src/Board.h:710`) returns the union of **three** sources, and reports failure
only when all three are empty:

1. every grid element, on every layer, whose `GetNodeId() != BAD_NODEID` **or** whose
   `GetLyrHasPin()` is true — painted copper, including a wire's run and a solder-bridged hole,
   plus every pin hole whether painted or blank;
2. `m_compMgr.GetBounding()` — every component's `GetFootprintRect()`, which is
   `Rect(GetRow(), GetLastRow(), GetCol(), GetLastCol())`, plus the trax pattern's rect. **It
   filters on neither `GetIsPlaced()` nor type**, so an *unplaced* component still contributes a
   rect;
3. `m_textMgr.GetBounding()` — every **text label**'s rect, which is an annotation and not a
   physical feature.

**Three consequences, and each one is a thing a later task would otherwise assume wrongly.**

- `BOUNDS` **is** the only dump-readable source of a part's *body* extent across the strips. A
  `PART` line carries `AT <row>,<col> SPAN <n>` and `SPAN` is a column count in the current
  direction, so a multi-row footprint's row extent is **not** otherwise in the dump. That is why
  `A_occ` reads `BOUNDS` and why Task 14 cannot compute a body rect itself.
- `BOUNDS` can **over**-state: a label in a corner or a floating part's stale rect inflates it. So
  it is **not** the fabrication extent, and Task 14 does not treat it as one.
- The dump reports only the union, so a consumer **cannot** attribute the extent to one of the
  three sources. Task 14's `HC6` detail therefore reports both `BOUNDS` and the enumerated-feature
  extent and names the discrepancy rather than explaining it, because the explanation is not in
  the data.

**This task does not change `GetBounds` and does not decompose it.** Emitting three lines instead
of one is a bigger fork change than M1.1 asks for, and the conservative use Task 14 makes of the
union is sound without it (there, with its argument). The decomposition is recorded as a finding
for the owner in `docs/stripboard/pipeline-verification.md`, with the three sources named, so the
option exists and nobody has to re-read `Board.h` to find it.

**Also in scope and not superseded: the `--help` text is wrong about an observable.** It claims `SPAN` is *"direction-aware, so it reads the same regardless of how the part is rotated on the board"*, and `GetCols(direction)` is precisely not that. **A help text that is wrong about an observable is worse than a missing one**, and it matters more now that `PIN` makes the true lead span readable: a consumer who reads `--help` instead of `tools/guide/dump.ts` gets the false claim.

- [ ] **Step 1: Branch from the published commit.** `git -C .tools/veroroute-perfboard checkout -b feature/dump-bounds-direction <Task 1's pinned sha>`.

- [ ] **Step 2: Write the failing fork test** (vitest, `@/helpers/run`, in the style of `tests/dump-pins.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { run } from "@/helpers/run";

function dump(vrt: string): string { return run(["--dump-board", vrt]).stdout; }
function boundsLine(stdout: string): string {
  const found = stdout.split("\n").filter((line) => line.startsWith("BOUNDS "));
  expect(found).toHaveLength(1);   // always emitted, exactly once
  return found[0]!;
}

describe("BOUNDS", () => {
  it("is emitted once and encloses every PIN hole", () => {
    const stdout = dump(importedBoard());     // a strip board built by --import in a tmp dir
    const match = /^BOUNDS (\d+),(\d+) (\d+),(\d+)$/.exec(boundsLine(stdout));
    expect(match).not.toBeNull();
    const [minRow, minCol, maxRow, maxCol] = match!.slice(1).map(Number);
    const pins = [...stdout.matchAll(/^PIN \S+ \S+ AT (\d+),(\d+)$/gm)]
      .map((m) => ({ row: Number(m[1]), col: Number(m[2]) }));
    expect(pins.length).toBeGreaterThan(0);
    for (const pin of pins) {
      expect(pin.row).toBeGreaterThanOrEqual(minRow!);
      expect(pin.row).toBeLessThanOrEqual(maxRow!);
      expect(pin.col).toBeGreaterThanOrEqual(minCol!);
      expect(pin.col).toBeLessThanOrEqual(maxCol!);
    }
  });

  it("is not merely the whole grid, on a board that does not fill its canvas", () => {
    // The point of the line: --import leaves the canvas at a default, so GRID
    // says nothing about the copper. A BOUNDS that always equalled GRID would
    // pass the enclosure test above and measure nothing.
    const stdout = dump(importedBoard());
    const grid = /^GRID (\d+) (\d+)$/m.exec(stdout)!;
    const bounds = /^BOUNDS (\d+),(\d+) (\d+),(\d+)$/m.exec(stdout)!;
    const area = (Number(bounds[3]) - Number(bounds[1]) + 1) * (Number(bounds[4]) - Number(bounds[2]) + 1);
    expect(area).toBeLessThan(Number(grid[1]) * Number(grid[2]));
  });

  it("is emitted on a perfboard as well as a stripboard", () => {
    expect(boundsLine(dump(perfBoard()))).toMatch(/^BOUNDS /);
  });

  it("encloses every WIRE end and SOLDER hole too, not only the PIN holes", () => {
    // Measured on two committed boards while this plan was written: on
    // transistor-preamp-feedback two wire endpoints, and on
    // transistor-preamp-staged four wire endpoints and two solder-bridge holes,
    // lie OUTSIDE the PIN-hole bounding box. Those holes carry a nodeId, so
    // GetBounds's first pass should cover them - this is the test that says so
    // rather than the reader's inference from Board.h, and it is what Task 14's
    // fabrication extent relies on when it unions the two.
    const stdout = dump(boardWithWiresAndBridges());
    const match = /^BOUNDS (\d+),(\d+) (\d+),(\d+)$/.exec(boundsLine(stdout))!;
    const [minRow, minCol, maxRow, maxCol] = match.slice(1).map(Number);
    const holes = [
      ...stdout.matchAll(/^SOLDER (\d+),(\d+) (\d+),(\d+)$/gm),
      ...stdout.matchAll(/^WIRE \S+ AT \d+,\d+ ENDS (\d+),(\d+)\S* (\d+),(\d+)/gm),
    ].flatMap((m) => [
      { row: Number(m[1]), col: Number(m[2]) },
      { row: Number(m[3]), col: Number(m[4]) },
    ]);
    expect(holes.length, "the fixture must actually carry wires and bridges")
      .toBeGreaterThan(0);
    for (const hole of holes) {
      expect(hole.row).toBeGreaterThanOrEqual(minRow!);
      expect(hole.row).toBeLessThanOrEqual(maxRow!);
      expect(hole.col).toBeGreaterThanOrEqual(minCol!);
      expect(hole.col).toBeLessThanOrEqual(maxCol!);
    }
  });

  it("grows when a text label is added, which is why BOUNDS is not the fabrication extent", () => {
    // m_textMgr.GetBounding() is one of GetBounds's three sources (Board.h:710).
    // A label is an annotation, not material, so a BOUNDS that moves when one
    // is added cannot be read as "the board this layout needs". Asserting it
    // here is what keeps Task 14's HC6 honest about which figure it is using,
    // and it is also the evidence for the decomposition finding.
    const withLabel = dump(boardWithTextLabelInACorner());
    const without = dump(boardWithWiresAndBridges());
    expect(boundsLine(withLabel)).not.toBe(boundsLine(without));
  });
});

describe("DIRECTION", () => {
  it("is on every placed PART line and is one of the four", () => {
    for (const line of dump(importedBoard()).split("\n").filter((l) => l.startsWith("PART "))) {
      if (line.includes(" FLOATING ")) { expect(line).not.toMatch(/ DIRECTION /); continue; }
      expect(line).toMatch(/ DIRECTION [WENS]\b/);
    }
  });

  it("reads 'W' on every part --import placed, which is the baseline it never leaves", () => {
    // MOVE section 3: --import always places at direction 'W' and never tries
    // another. This is the field that makes that measurable rather than read
    // out of the source.
    const directions = [...dump(importedBoard()).matchAll(/^PART .* DIRECTION ([WENS])/gm)]
      .map((m) => m[1]);
    expect(new Set(directions)).toEqual(new Set(["W"]));
  });
});
```

  `importedBoard()` and `perfBoard()` build a board into a `mkdtempSync` directory from a fixture netlist, as `tests/stretch.test.ts` does; reuse that file's `tmpFile` shape rather than inventing a second one. `boardWithWiresAndBridges()` is a copy of a committed board that carries both — `transistor-preamp-staged` is the measured case and carries wire ends and a bridge hole outside its pin box. `boardWithTextLabelInACorner()` adds a label through `--author --op move-label` or by starting from a board that already has one; **if no shipped verb can place a label, the label test is not written and the text-label inflation is recorded as unverified in `docs/stripboard/pipeline-verification.md`** — a test that cannot be written is a limit to state, not a test to fake. Task 14's `HC6` is conservative either way, and its argument there does not depend on this test existing.

- [ ] **Step 3: Implement.** `BOUNDS` from `Board::GetBounds`, printed beside `GRID` and always, once. `DIRECTION` appended to the placed `PART` line; a `FLOATING` part prints no direction, which mirrors the existing rule that *"a FLOATING component prints no PIN line: it has no holes"*. Both are appended in the grammar's own append-only shape, documented at the point of change — and **the `BOUNDS` comment in `Headless_dump.cpp` states the three sources `GetBounds` unions, including the text manager and the unfiltered component rects**, in the voice the file's existing `CUT` and `CUT_UNCONNECTED_PIN` comments use. That file is where a downstream consumer reads the contract, and a line documented as "the board's bounds" is a line somebody reads as the fabrication extent.

- [ ] **Step 4: Correct the `--help` text.** Replace the direction-aware claim with what `GetCols(direction)` does: a part's `SPAN` is its footprint's own column count in its current direction, it is **not** a lead span, and a lead's actual hole comes only from a `PIN` line. Keep the sentence short enough that it stays true. **`tests/usage.test.ts` enforces flag/help agreement in both directions; this change touches the help text only and must leave that test green.**

- [ ] **Step 5: Run the fork suite, add two mutations, push, PR.** Mutations: make `BOUNDS` print `GRID`'s extent instead of `GetBounds`'s (the not-merely-the-grid test must fail), and make `DIRECTION` print a constant `'W'` for every part including rotated ones (Task 8's effect check must fail — **run this mutation again at the end of Task 8**, because until a rotate verb exists nothing can rotate a part and this mutation cannot be refuted). Push `feature/dump-bounds-direction` and open a PR. **The owner authorises the push and decides the merge.**

- [ ] **Step 6: Adopt it here.** Advance `veroroute.pin`, `bun run perfboard veroroute --force`, confirm `.built-commit` agrees. Extend `tools/guide/dump.ts`: parse `BOUNDS` into `BoardDump.bounds`, parse `DIRECTION` into `Part.direction`, and **refuse a dump with no `BOUNDS` line naming the line and pointing at `REBUILD_PINNED_FORK`**, exactly as it already refuses a missing `GRID`. Extend `tests/guide/dump.test.ts` with the parse, the refusal, and the floating-part-has-no-direction case.

- [ ] **Step 7: The committed fixtures now lack the new lines.** `tests/fixtures/pt2399-core-board.dump`, `tests/fixtures/pultec-low-boost-c19-floated.dump` and Task 5's frozen dump were captured before `BOUNDS` existed. **Do not regenerate the floated-`C19` dump or the frozen dump** — both are frozen captures with provenance, and regenerating either destroys the thing it is evidence of. Instead: make `BoundsRequired` a property of the *consumer* rather than of the parser — `BoardDump.bounds` is `Bounds | undefined`, `parseBoardDump` refuses nothing, and **Task 15's `A_occ` refuses a dump with no `bounds`, naming the line and the fixture**. Record in `tools/guide/dump.ts`'s comment why: a frozen fixture is older than the grammar by construction, and the refusal belongs where the field is needed, not where the text is read. Then recapture `tests/fixtures/pt2399-core-board.dump`, which is not frozen evidence but a readable form of a live board, and note the recapture in the commit.

- [ ] **Step 8: Run** `bun test && bun run typecheck`, confirm `make check`'s red set is unchanged, **commit** two commits ("Pin the fork at the commit whose dump reports BOUNDS and each part's direction", and the parser change), push.

---

### Task 8: M1.5 — `--rotate`

**OWNER-BLOCKED (OB1) at step 5.**

**Files:** in the fork, create `Src/Headless_rotate.cpp` / `.h`, modify `Src/Headless.cpp` (`kHeadlessFlags[]`), `Src/Headless_help.cpp`, `Src/veroroute.pro`, create `tests/rotate.test.ts`, extend `tests/mutation/`'s catalogue. In this repository: `veroroute.pin`.

**Interfaces:**
- *Consumes:* Task 7's `DIRECTION` field; M1.2's placement refusal and M1.3's guards, both already in the fork.
- *Provides:* `--rotate BOARD --ref NAME --direction cw|ccw -o OUTPUT`, a `kShipped` verb documented in `Headless_help.cpp`, which refuses without writing `OUTPUT` when the selection did not take, when any previously-placed component is not placed afterwards, when the board panned, or when `GetDirection()` did not change.
- Task 17's move set consumes the verb; Task 16's constructed arm consumes it to turn parts across the strips, and its random arm draws a quarter-turn count through it.

**Why this is not a nice-to-have.** Part orientation is the structural lever behind 68–75% of every unfinished board's cuts: the four import-placed boards have every part lying *along* the strips and sit at `J ≈ P − N` (48, 28, 24, 18 against `J` of 46, 27, 24, 16 — exact on hi-cut), while low-boost has every part *across* and sits at `J = 1`. `--import` never tries any direction but `'W'`, so the baseline does not explore this axis at all.

- [ ] **Step 1: Branch** from Task 7's pinned sha.

- [ ] **Step 2: Write the failing fork test:**

```ts
describe("--rotate", () => {
  it("lands the part at a changed DIRECTION and says which", () => {
    const out = tmpFile("r.vrt");
    const before = partLine(dumpBoard(board), "R1");
    const result = run(["--rotate", board, "--ref", "R1", "--direction", "cw", "-o", out]);
    expect(result.status).toBe(0);
    const after = partLine(dumpBoard(out), "R1");
    expect(after).not.toBe(before);
    expect(result.stdout).toMatch(/R1/);
  });

  it("transposes a two-lead part's PIN holes between rows and columns", () => {
    // The assertion that can be written without DIRECTION, kept alongside it
    // because PIN is read off the grid while DIRECTION is the component's own
    // record, and two readings of two things are two witnesses.
    const out = tmpFile("r.vrt");
    run(["--rotate", board, "--ref", "R1", "--direction", "cw", "-o", out]);
    const before = pinHoles(dumpBoard(board), "R1");
    const after = pinHoles(dumpBoard(out), "R1");
    expect(before[0]!.row === before[1]!.row).toBe(after[0]!.col === after[1]!.col);
  });

  it("returns the board to its starting dump after four rotations", () => {
    let current = board;
    for (let turn = 0; turn < 4; turn += 1) {
      const out = tmpFile(`r${turn}.vrt`);
      expect(run(["--rotate", current, "--ref", "R1", "--direction", "cw", "-o", out]).status).toBe(0);
      current = out;
    }
    expect(dumpBoard(current)).toBe(dumpBoard(board));
  });

  it("refuses an unknown --ref, naming it, and writes nothing", () => {
    const out = tmpFile("r.vrt");
    const result = run(["--rotate", board, "--ref", "NOPE", "--direction", "cw", "-o", out]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/NOPE/);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses when a rotation would leave any previously-placed part floating", () => {
    // ResetUserGroup selects siblings too, and the trax gate leaves EVERY moved
    // component floating if the track pattern will not go back down, so the
    // check iterates the whole user group rather than only --ref.
    const out = tmpFile("r.vrt");
    const result = run(["--rotate", crowded, "--ref", "C1", "--direction", "cw", "-o", out]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/FLOATING|not placed/);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses a direction that is neither cw nor ccw", () => {
    const out = tmpFile("r.vrt");
    const result = run(["--rotate", board, "--ref", "R1", "--direction", "sideways", "-o", out]);
    expect(result.status).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });
});
```

  `crowded` is a fixture netlist whose parts leave no room for a rotated footprint; build it alongside the test, in `tests/fixtures/`, the way `cap-electro-600-stretch.net` was built.

- [ ] **Step 3: Implement.** Reuse `Headless_author.cpp`'s `ClickSelectComps` — *"THIS IS NOT A PARALLEL IMPLEMENTATION"*, and that function already mirrors the GUI's selection sequence and has been corrected twice. Drive `Board::RotateUserComps(bool bCW)`; verify the selection took through `GetIsUserComp(compId)`, because `ResetUserGroup` returns `void` and silently ignores `TRAX_COMPID`; record `GetIsPlaced()` for every component of the user group before acting and refuse without writing `OUTPUT` if one that was placed is not placed afterwards; compare `GetDirection()` before and after and refuse if it did not change; report every component the group held, by name, never by count. Register in **both** `kHeadlessFlags[]` (as `kShipped`) and `Headless_help.cpp`, or it hangs a build instead of failing one.

- [ ] **Step 4: Prove each guard can fail — three mutations, added to the catalogue and run.** Remove the all-components-placed loop (the crowded-board test must fail); remove the `GetDirection()` comparison and make `RotateUserComps` a no-op (the DIRECTION test must fail — and if it does not, `DIRECTION` is not being read, which is Task 7's mutation refuted here); remove the `GetIsUserComp` check and pass `TRAX_COMPID` (the unknown-`--ref` test must fail). **Also re-run Task 7's constant-`'W'` `DIRECTION` mutation now that a rotation exists**: it must now fail a test, which is the refutation Task 7 could not perform.

- [ ] **Step 5: Run the fork suite, push, PR.** The PR body states the lever's measured size and that `--import` never tries a direction but `'W'`.

- [ ] **Step 6: Adopt it here.** Advance `veroroute.pin`, rebuild, confirm `.built-commit`, run `bun test && bun run typecheck`, confirm `make check`'s red set is unchanged, **commit** ("Pin the fork at the commit with a headless rotate"), push.

---

### Task 9: M1.6 — the batch move

**OWNER-BLOCKED (OB1) at step 5. This task is deferrable: nothing in Tasks 10–25 is impossible without it, and a reviewer may reject it while approving its neighbours.**

**Files:** in the fork, create `Src/Headless_move_batch.cpp` / `.h`, modify `Src/Headless.cpp`, `Src/Headless_help.cpp`, `Src/veroroute.pro`, create `tests/move-batch.test.ts`, extend the mutation catalogue. In this repository: `veroroute.pin`.

**Interfaces:**
- *Consumes:* Task 1's `--move` and Task 8's `--rotate`.
- *Provides:* `--move-batch BOARD --ops FILE -o OUTPUT`, where `FILE` is one gesture per line in the one-move verbs' own grammar, and the verb either refuses the whole batch without writing `OUTPUT` or reports exactly which prefix landed.
- Task 17's climb may use it; it must work identically without it, which Task 17 asserts.

**What it buys, as a ratio between two measured numbers rather than a projection.** At 11.71 ms per invocation (n = 200), `--version` with no board costs 10.78 ms, so board I/O is about 1 ms and **launch is 91% of every invocation**. One gesture plus a dump plus a check is order 10² invocations per second, which at P2's four invocations per evaluation is order 10¹ **candidate evaluations** per second. Removing the launch floor raises the invocation rate to order 10³ — about **12× more invocations for the same machine time**. Two honest qualifications: it bounds the **launch** saving only, and it widens how much of the search space a run can cover, not whether its answers are right.

- [ ] **Step 1: Branch** from Task 8's pinned sha.

- [ ] **Step 2: Write the failing fork test. The three assertions are the whole deliverable:**

```ts
describe("--move-batch", () => {
  it("produces a board byte-identical to the same moves run one at a time", () => {
    const ops = writeOps(["move R1 --to 4,4", "rotate R2 --direction cw", "move R3 --delta 1,0"]);
    const batched = tmpFile("b.vrt");
    expect(run(["--move-batch", board, "--ops", ops, "-o", batched]).status).toBe(0);
    let sequential = board;
    for (const [args] of SAME_THREE_GESTURES) {
      const next = tmpFile("s.vrt");
      expect(run([...args, sequential, "-o", next]).status).toBe(0);
      sequential = next;
    }
    expect(readFileSync(batched)).toEqual(readFileSync(sequential));
  });

  it("writes no output and names k when move k of N fails", () => {
    const ops = writeOps(["move R1 --to 4,4", "move R2 --to 0,0", "move R3 --delta 1,0"]);
    const out = tmpFile("b.vrt");
    const result = run(["--move-batch", crowded, "--ops", ops, "-o", out]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/\b2\b/);
    expect(existsSync(out)).toBe(false);
  });

  it("verifies every move, not only the final state", () => {
    // MOVE section 2.3 lists five ways a single move does nothing quietly. A
    // batch that checked only the end state cannot say which move broke it,
    // and this is the test that distinguishes the two implementations.
    const ops = writeOps(["move R1 --to 4,4", "move R1 --delta 0,0", "move R1 --to 5,5"]);
    const out = tmpFile("b.vrt");
    const result = run(["--move-batch", board, "--ops", ops, "-o", out]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/zero/);
    expect(existsSync(out)).toBe(false);
  });

  it("the in-process dump text equals --dump-board on the same board state", () => {
    const out = tmpFile("b.vrt");
    const ops = writeOps(["move R1 --to 4,4"]);
    const result = run(["--move-batch", board, "--ops", ops, "-o", out, "--dump"]);
    expect(result.stdout.trimEnd()).toBe(dumpBoard(out).trimEnd());
  });
});
```

- [ ] **Step 3: Implement** around `Headless_transactional.cpp:44-51`'s **`CaptureBoardDump`**, which swaps `std::cout`'s stream buffer for an `ostringstream` around `PrintBoardDump` so a verb can obtain the exact `--dump-board` text of an in-memory board with no file round trip. That is the in-process scoring primitive, and it already exists. Two constraints the fork's own documents impose and this verb inherits: **per-move verification, not one check at the end**; and **transactional honesty** — `ApplyReconciliation` leaves the in-memory board byte-identical when it rejects and `--update` never saves on a failed apply, so either the whole batch is refused and `OUTPUT` never written, or the verb reports exactly which prefix landed. *"Silently saving a partial batch is the one outcome every existing verb is built to avoid."*

- [ ] **Step 4: Prove the guards can fail — two mutations.** Verify only the final state (the verify-every-move test must fail); write `OUTPUT` on a mid-batch failure (the no-output test must fail).

- [ ] **Step 5: Run the fork suite, push, PR.** Record the **rejected alternative on its evidence**: a long-lived process fed moves on stdin would remove the 10.78 ms floor entirely and is a larger change — a REPL is a new interaction model, not a verb, and the fork has no precedent for one; the measured numbers say the batch verb captures nearly all of the available saving without it.

- [ ] **Step 6: Adopt it here.** Advance `veroroute.pin`, rebuild, confirm `.built-commit`, run `bun test && bun run typecheck`, **commit**, push.

---

### Task 10: `stripboard/rules.json` and its strict loader

**Files:** create `stripboard/rules.json`, `tools/stripboard/rules.ts`; test `tests/stripboard/rules.test.ts`.

**Interfaces:**
- *Consumes:* nothing from earlier tasks.
- *Provides:*
  - `StripboardRules { readonly schema: 1; readonly rhoWire: number; readonly rhoSolder: number; readonly kappaBench: number; readonly tau: number; readonly yieldFloor: number; readonly evaluationCap: number; readonly signatureRun: number; readonly seeds: readonly number[]; readonly worseAcceptance: number | null; readonly stockRows: number; readonly stockCols: number; readonly notes: Readonly<Record<string, string>> }`
  - `loadRules(file?: string): StripboardRules` — defaults to `stripboard/rules.json` resolved from the repository root
  - `RULES_PATH: string`
- Tasks 12, 14, 15, 17, 18, 19, 20, 21, 23 and 24 all read `StripboardRules`; **no other module holds a numeric parameter.**

**Every number in the file is one the owner settled or one PIPELINE proposed, and the `note` says which.** `ρ_w = 0.25` and `ρ_s = 1` are the owner's, with his instruction quoted. `κ_bench = 0.05` is the owner's, as the hard end of a ratchet. **`τ` and the yield floor are PIPELINE's proposed defaults and are not owner-settled (OB3)**, and their notes say exactly that. `worseAcceptance` is `null` and **has no default**: nothing in COST, MOVE or PIPELINE supplies a schedule and none is invented, so unconfigured means E3 does not run, stated in the report.

- [ ] **Step 1: Write the failing test:**

```ts
import { test, expect } from "bun:test"
import { loadRules, RULES_PATH } from "../../tools/stripboard/rules.ts"

test("the committed rules load, and every entry carries a note", () => {
  const rules = loadRules()
  expect(rules.schema).toBe(1)
  for (const key of ["rhoWire", "rhoSolder", "kappaBench", "tau", "yieldFloor",
                     "evaluationCap", "signatureRun", "seeds", "worseAcceptance",
                     "stockRows", "stockCols"]) {
    expect(rules.notes[key], key).toBeDefined()
    expect(rules.notes[key]!.length, key).toBeGreaterThan(40)
  }
})

test("the two proposed defaults say in their notes that they are proposed, not the owner's", () => {
  // CRITERIA section 10.2: tau and Q4's threshold are attributed to the owner
  // as parameters while carrying numbers he has not been asked about. A number
  // used knowingly is a different failure from one used silently.
  const rules = loadRules()
  expect(rules.notes["tau"]).toMatch(/proposed/i)
  expect(rules.notes["yieldFloor"]).toMatch(/proposed/i)
  expect(rules.notes["rhoWire"]).toMatch(/owner/i)
  expect(rules.notes["kappaBench"]).toMatch(/owner/i)
})

test("kappaBench's note keeps every previous value and the artifact that moved it", () => {
  // K3's third condition: the previous value and its reason are KEPT rather
  // than overwritten - the union is the record. At schema 1 there is one
  // value, and the note carries the three measured values it was NOT fitted to.
  expect(loadRules().notes["kappaBench"]).toMatch(/0\.181|0\.196|0\.269/)
})

test("an unknown key is an error, not ignored", () => {
  expect(() => loadRules(fixture({ extra: 1 }))).toThrow(/extra/)
})

test("a missing key is an error naming it, and nothing is defaulted", () => {
  expect(() => loadRules(fixture({ omit: "tau" }))).toThrow(/tau/)
  expect(() => loadRules(fixture({ omit: "tau" }))).toThrow(/not defaulted/)
})

test("a wrong schema version refuses rather than being read as schema 1", () => {
  expect(() => loadRules(fixture({ schema: 2 }))).toThrow(/schema/)
})

test("an entry with no note refuses, because a number with no reason cannot be argued with", () => {
  expect(() => loadRules(fixture({ dropNote: "tau" }))).toThrow(/note/)
  expect(() => loadRules(fixture({ dropNote: "tau" }))).toThrow(/tau/)
})

test("worseAcceptance is null in the committed file and null is a value, not an absence", () => {
  expect(loadRules().worseAcceptance).toBeNull()
  // A number is accepted when configured; a string or a negative is not.
  expect(loadRules(fixture({ worseAcceptance: 2 })).worseAcceptance).toBe(2)
  expect(() => loadRules(fixture({ worseAcceptance: -1 }))).toThrow(/worseAcceptance/)
  expect(() => loadRules(fixture({ worseAcceptance: "off" }))).toThrow(/worseAcceptance/)
})

test("the seed list is a non-empty array of distinct non-negative integers", () => {
  expect(loadRules().seeds.length).toBeGreaterThan(0)
  expect(() => loadRules(fixture({ seeds: [] }))).toThrow(/seeds/)
  expect(() => loadRules(fixture({ seeds: [1, 1] }))).toThrow(/distinct/)
})

test("RULES_PATH points at the committed file, so the canonical hash hashes one thing", () => {
  expect(RULES_PATH.endsWith("stripboard/rules.json")).toBe(true)
})
```

  `fixture(...)` writes a modified copy of the committed file into a temporary directory and returns its path; it never edits `stripboard/rules.json`.

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Write `stripboard/rules.json`.** Schema 1, the eleven parameters, and a `notes` object with one entry per parameter. The notes carry, at minimum: `ρ_w`'s owner instruction verbatim (*"favor wires over cuts. cuts are harder and more error prone."*) and that the previous proposal of 3 was **a sign error in the argument rather than a difference of weight**, because a wire's failures are visible on the board and reversible with an iron while a missed cut is found by a circuit that does not work after the board is built; `κ_bench`'s reasoning that a bound where no artifact has reached yields nothing when it fails while one just past the best demonstrated result makes a failure informative, **with the three passing hand-laid boards' values recorded so nobody can re-derive a loose bound without seeing them**, and that it moves only by ratchet; `τ` and `yieldFloor` as **PIPELINE's proposals, not the owner's values**; and `worseAcceptance: null` meaning the mechanism does not run.

- [ ] **Step 4: Implement `tools/stripboard/rules.ts`.** A strict loader in the shape `R1` describes: reject unknown keys, require each field's type, require a `note` per field. No defaults anywhere — every refusal names the key, what was expected, and **why it is not defaulted**.

- [ ] **Step 5: Prove the tests can fail.** Two breaks: make the loader spread the parsed object instead of reading field by field (the unknown-key test fails); make a missing `note` a warning (the note test fails).

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("One strict rules file for every stripboard parameter, and no default for the one nobody supplied"), push.

---

### Task 11: P0 — the per-board targets and the derived floor

**Files:** create `tools/stripboard/targets.ts`; test `tests/stripboard/targets.test.ts`.

**Interfaces:**
- *Consumes:* `Network` and the resolution layer from `lib/model`; `loadDeclaration` from `tools/perfboard/declaration.ts`; `BoardDump` from `tools/guide/dump.ts`.
- *Provides:*
  - `NetGraph { readonly nets: readonly string[]; readonly edges: readonly (readonly [string, string])[]; readonly maxDegree: number; readonly bandwidthLowerBound: number }`
  - `BoardTargets { readonly board: string; readonly netCount: number; readonly pinCount: number; readonly strips: number; readonly cutFloor: number; readonly netGraph: NetGraph; readonly ordering: readonly string[]; readonly orderingBandwidth: number }`
  - `deriveTargets(network: Network, strips: number, board: string): BoardTargets`
  - `occupiedStrips(dump: BoardDump): number` — `S_occ`, the distinct strips among the `PIN` holes on the axis `VERTICAL_STRIPS` names
  - `segmentJoins(cuts: number, netCount: number, occupied: number): number` — `J = C − N + S_occ`
  - `clustering(joins: number, pinCount: number, netCount: number): number` — `κ = J / (P − N)`
- Tasks 12, 14, 16, 19 and 20 consume `BoardTargets`; Tasks 12 and 20 consume the three arithmetic functions. **`occupiedStrips`, `segmentJoins` and `clustering` live here and nowhere else**, so the identity has one implementation.

`C_floor = max(0, N − R)` — COST §2.1's unconstrained floor. **No constrained floor is derived anywhere in this plan**: what the floor becomes when either span bound binds is undetermined (limit `H-2`), so the pipeline reports the shortfall rather than inventing a second floor.

- [ ] **Step 1: Write the failing test:**

```ts
import { test, expect } from "bun:test"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { deriveTargets, occupiedStrips, segmentJoins, clustering }
  from "../../tools/stripboard/targets.ts"

test("the floor is max(0, N - R) and is zero when the board has more strips than nets", () => {
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  expect(targets.cutFloor).toBe(Math.max(0, targets.netCount - 34))
  expect(targets.cutFloor).toBe(0)
})

test("the floor at the strips a board actually occupies is the interesting one", () => {
  const targets = deriveTargets(physicalBoard("mid"), 4, "pultec-mid")
  expect(targets.cutFloor).toBe(targets.netCount - 4)
})

test("the bandwidth lower bound is ceil(maxDegree / 2), and an ordering bounds it above", () => {
  const targets = deriveTargets(physicalBoard("hi-cut"), 34, "pultec-hi-cut")
  expect(targets.netGraph.bandwidthLowerBound)
    .toBe(Math.ceil(targets.netGraph.maxDegree / 2))
  expect(targets.orderingBandwidth)
    .toBeGreaterThanOrEqual(targets.netGraph.bandwidthLowerBound)
})

test("off-board components force no edge, because they break out as free single-hole pads", () => {
  // COST section 6.4's own rule for the net graph. A rotary selector off-board
  // must not make its nets adjacent in the arrangement.
  //
  // THE TEST THIS REPLACES looped over the edges asserting each endpoint was a
  // known net - which every edge satisfies by construction, so it was a
  // tautology under a name that claimed the off-board rule was checked. The
  // discriminating assertion is the one below: a net PAIR joined ONLY by an
  // off-board component must be ABSENT from the edges, and the same pair joined
  // by an on-board component must be present. One without the other proves
  // nothing - an implementation that emitted no edges at all would pass the
  // first half.
  const network = physicalBoard("low-cut")
  const targets = deriveTargets(network, 34, "pultec-low-cut")
  const edge = (a: string, b: string) =>
    targets.netGraph.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const offBoard = offBoardComponentsOf(network)
  expect(offBoard.length, "low-cut must actually carry an off-board component").toBeGreaterThan(0)
  for (const component of offBoard) {
    for (const [a, b] of netPairsOf(component)) {
      if (onBoardComponentJoins(network, a, b)) continue   // an on-board part forces it anyway
      expect(edge(a, b), `${component.id} is off board and must force no edge ${a}-${b}`).toBe(false)
    }
  }
  const onBoard = onBoardComponentsOf(network)
  expect(onBoard.length).toBeGreaterThan(0)
  for (const component of onBoard) {
    for (const [a, b] of netPairsOf(component)) {
      expect(edge(a, b), `${component.id} is on board and must force edge ${a}-${b}`).toBe(true)
    }
  }
})

test("S_occ counts distinct strips holding a lead, on the axis VERTICAL_STRIPS names", () => {
  const horizontal = parseBoardDump([
    "GRID 4 4", "VERO_TRACKS 1", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED",
    "PART R1 RESISTOR4 1k AT 0,0 SPAN 1", "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  ].join("\n"))
  expect(occupiedStrips(horizontal)).toBe(2)
  const vertical = parseBoardDump([
    "GRID 4 4", "VERO_TRACKS 1", "VERTICAL_STRIPS 1", "CUT_STATE COMPUTED",
    "PART R1 RESISTOR4 1k AT 0,0 SPAN 1", "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  ].join("\n"))
  expect(occupiedStrips(vertical)).toBe(1)
})

test("the identity reproduces low-boost's measured terms exactly", async () => {
  // COST verified C = N + J - S_occ to the unit on five boards, and RE-MEASURE
  // read it straight off the dump: N = 9, P = 27, S_occ = 5, C = 5, so J = 1
  // and kappa = 1/18. These are read from the frozen fixture's own dump, not
  // restated as literals, except the 1 and the 1/18 the arithmetic produces.
  const dump = parseBoardDump(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.dump").text(),
  )
  const nets = Object.keys(dump.nodes).length
  const pins = Object.values(dump.pins).reduce((total, list) => total + list.length, 0)
  const joins = segmentJoins(dump.cuts.length, nets, occupiedStrips(dump))
  expect(joins).toBe(1)
  expect(clustering(joins, pins, nets)).toBeCloseTo(1 / 18, 10)
})

test("kappa refuses when P equals N, rather than dividing by zero", () => {
  expect(() => clustering(0, 9, 9)).toThrow(/P - N/)
})

test("a negative J refuses, because J = sum(k - 1) cannot be below zero", () => {
  // transistor-preamp-lab yields C = 0, N = 18, S_occ = 17, hence J = -1 -
  // which correctly revealed a board whose CUT_STATE is UNRESOLVED and which
  // the identity cannot describe. An impossible value treated as a result
  // would have hidden it.
  expect(() => segmentJoins(0, 18, 17)).toThrow(/CUT_STATE|UNRESOLVED/)
})
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement.** The net graph's vertices are nets and its edges are forced by **on-board** components only; off-board components break out as free single-hole pads and force nothing. The ordering is a reverse Cuthill-McKee ordering, which is an **upper** bound on bandwidth, and `⌈maxDegree/2⌉` is the lower bound; both are recorded, and neither is reported as *the* bandwidth. `segmentJoins` throws on a negative result naming `CUT_STATE` as the likely cause, which is `V2`'s free extra reading and `H2`'s condition arriving cheaply.

  `offBoardComponentsOf`, `onBoardComponentsOf`, `netPairsOf` and `onBoardComponentJoins` are helpers in the test file over `Network` — the on/off-board distinction is already a property of the physical board model and is read from there, never re-derived from a name. `netPairsOf` returns every unordered pair of distinct nets a component's pins touch, which is the same relation `deriveTargets` uses to force an edge, so the test and the implementation agree about what "forces an edge" means while deriving it independently.

- [ ] **Step 4: Prove the tests can fail.** Four breaks: return `netCount` as the floor (both floor tests fail); count every `PIN` hole rather than distinct strips (the `S_occ` tests fail); drop the negative-`J` throw (its test fails); **include off-board components in the edge set** (the off-board test's first half fails) **and then emit no edges at all** (its second half fails) — two breaks on one test, because either half alone passes for a wrong implementation and that is why the replaced version proved nothing.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Derive each board's targets and its cut floor from the identity"), push.

---

### Task 12: The scorer, the identity self-check, and the floor invariant

**Files:** create `tools/stripboard/score.ts`; test `tests/stripboard/score.test.ts`.

**Interfaces:**
- *Consumes:* `StripboardRules` from Task 10; `BoardTargets`, `occupiedStrips`, `segmentJoins`, `clustering` from Task 11; `BoardDump` from `tools/guide/dump.ts`.
- *Provides:*
  - `Score { readonly cuts: number; readonly wires: number; readonly solder: number; readonly objective: number; readonly netCount: number; readonly pinCount: number; readonly occupied: number; readonly joins: number; readonly clustering: number }`
  - `scoreDump(dump: BoardDump, targets: BoardTargets, rules: StripboardRules): Score`
  - `countLines(dumpText: string): { readonly cuts: number; readonly wires: number; readonly solder: number }` — V1's **second code path**, counting on the raw text
- Tasks 15, 17, 19, 20 and 21 consume `Score`. **The grader imports none of this**, which Task 14 asserts.

`F = C + ρ_w·W + ρ_s·B`, every term a line count in a report the producing agent did not write. **Three checks ride on every single evaluation because each is free and exact:** V1's independent count, V2's identity with its `J ≥ 0` reading, and K5's `F ≥ F_floor`.

- [ ] **Step 1: Write the failing test:**

```ts
import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { scoreDump, countLines } from "../../tools/stripboard/score.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"

const TEXT = [
  "GRID 3 4", "VERO_TRACKS 1", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  "WIRE w1 AT 0,3 ENDS 0,3,3,30 2,3,5,30",
  "SOLDER 0,2 1,2",
  "CUT 0,1,1 0,2,2",
  "NODE 1 NAME a R1.1", "NODE 2 NAME b R1.2",
].join("\n")

const targets = { board: "fixture", netCount: 2, pinCount: 2, strips: 3, cutFloor: 0,
  netGraph: { nets: ["a", "b"], edges: [], maxDegree: 0, bandwidthLowerBound: 0 },
  ordering: ["a", "b"], orderingBandwidth: 0 } as const

test("F is C + rho_w W + rho_s B, computed from the rules file's values", () => {
  const rules = loadRules()
  const score = scoreDump(parseBoardDump(TEXT), targets, rules)
  expect(score.cuts).toBe(1)
  expect(score.wires).toBe(1)
  expect(score.solder).toBe(1)
  expect(score.objective).toBeCloseTo(1 + rules.rhoWire * 1 + rules.rhoSolder * 1, 10)
})

test("V1: the counts are reproduced by a second code path over the same text", () => {
  const score = scoreDump(parseBoardDump(TEXT), targets, loadRules())
  const counted = countLines(TEXT)
  expect([score.cuts, score.wires, score.solder])
    .toEqual([counted.cuts, counted.wires, counted.solder])
})

test("V1's second path counts the raw lines, so it would catch a parser that dropped one", () => {
  // The scorer must not be the only thing that can read its own input. The
  // grep-equivalent is spelled out rather than reusing the parsed dump.
  expect(countLines(TEXT).cuts).toBe(TEXT.split("\n").filter((l) => l.startsWith("CUT ")).length)
  expect(countLines(TEXT).wires).toBe(TEXT.split("\n").filter((l) => l.startsWith("WIRE")).length)
  expect(countLines(TEXT).solder).toBe(TEXT.split("\n").filter((l) => l.startsWith("SOLDER")).length)
})

test("V2: a dump whose terms do not satisfy C = N + J - S_occ refuses the run", () => {
  // J is DEFINED as C - N + S_occ, so the identity cannot fail by arithmetic;
  // what can fail is a dump whose CUT_STATE is not COMPUTED, where C is not
  // the count a derivation produced. That is the residual this refuses.
  const unresolved = TEXT.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
  expect(() => scoreDump(parseBoardDump(unresolved), targets, loadRules()))
    .toThrow(/CUT_STATE/)
})

test("V2: a negative J refuses, for a different reason, and says which", () => {
  const impossible = { ...targets, netCount: 9 }
  expect(() => scoreDump(parseBoardDump(TEXT), impossible, loadRules()))
    .toThrow(/J/)
})

test("K5: a candidate scoring below its declared floor refuses, naming both numbers", () => {
  // F_floor is a LOWER bound, so a candidate beneath it proves one of the two
  // numbers is not the quantity it claims. The alternative is a pipeline that
  // reports beating a bound it derived itself, which is the most convincing
  // wrong answer available to it.
  const overstated = { ...targets, cutFloor: 99 }
  let message = ""
  try { scoreDump(parseBoardDump(TEXT), overstated, loadRules()) }
  catch (error) { message = error instanceof Error ? error.message : String(error) }
  expect(message).toMatch(/99/)
  expect(message).toMatch(/fixture/)
  expect(message).toMatch(/floor/)
})

test("K5's refusal fires rather than a negative gap reaching the report", () => {
  const overstated = { ...targets, cutFloor: 99 }
  expect(() => scoreDump(parseBoardDump(TEXT), overstated, loadRules())).toThrow()
})

test("the scorer carries no threshold of its own: every weight comes from the rules", () => {
  const doubled = { ...loadRules(), rhoWire: 2, rhoSolder: 4 }
  const score = scoreDump(parseBoardDump(TEXT), targets, doubled)
  expect(score.objective).toBeCloseTo(1 + 2 + 4, 10)
})
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement.** `scoreDump` refuses before it scores when `dump.cutState !== "COMPUTED"`, naming the state and `H2`; computes `S_occ`, `J` and `κ` through Task 11's functions; and refuses when `objective < cutFloor`, naming the candidate's board, its `F` and the declared floor. `countLines` is written as line-prefix counting over the raw text and **imports nothing from `tools/guide/dump.ts`** — that is what makes it a second path.

- [ ] **Step 4: Prove the tests can fail.** Three breaks: have `countLines` delegate to `parseBoardDump` (V1's second-path test still passes, which is the point — so *also* break the parser's `CUT` handling and confirm V1 now fails where it would not have before; revert both); drop the `cutState` refusal (V2's test fails); drop the floor comparison (K5's two tests fail).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Score a candidate, and refuse one that beats the floor it was graded against"), push.

---

### Task 13: The run directory, the canonical hash and the manifest

**Files:** create `tools/stripboard/run-dir.ts`; modify `.gitignore`; test `tests/stripboard/run-dir.test.ts`.

**Interfaces:**
- *Consumes:* `StripboardRules` and `RULES_PATH` from Task 10; `readPin`, `builtCommit` from `tools/perfboard/acquire.ts`.
- *Provides:*
  - `CanonicalInputs { readonly candidateSha256: string; readonly rulesSha256: string; readonly netlistSha256: string; readonly spanDataSha256: string; readonly pinPatternSha256: string; readonly seeds: readonly number[]; readonly seed: number; readonly seedArm: SeedArm; readonly verorouteCommit: string; readonly builtCommit: string; readonly pipelineCommit: string }` — **`seedArm` is in the canonical inputs because two arms that hashed alike would make the two runs of Task 16's comparison indistinguishable in the record**, which is the one thing this hash exists to prevent; the type is Task 16's and is imported, never redeclared
  - `CanonicalMetrics { readonly cuts: number; readonly wires: number; readonly solder: number; readonly objective: number; readonly netCount: number; readonly joins: number; readonly occupied: number; readonly clustering: number; readonly occupiedArea: number; readonly constraints: Readonly<Record<string, boolean>>; readonly ranking: readonly number[]; readonly stoppingRule: string; readonly bound: string; readonly outcome: string; readonly restartBoundaries: readonly number[] }`
  - `ExecutionProvenance { readonly stamp: string; readonly startedAt: string; readonly durationMs: number; readonly host: string; readonly msPerInvocation: number; readonly evaluations: number }`
  - `RunManifest { readonly canonical: { readonly inputs: CanonicalInputs; readonly metrics: CanonicalMetrics; readonly hash: string }; readonly provenance: ExecutionProvenance }`
  - `canonicalHash(inputs: CanonicalInputs, metrics: CanonicalMetrics): string`
  - `runDirectory(board: string, stamp: string): string` — `build/stripboard/<board>/<stamp>/`
  - `writeManifest(dir: string, manifest: RunManifest): void`
  - `readManifest(dir: string): RunManifest`
- Tasks 17, 20, 21, 23 and 24 consume these. **Task 24's gate compares the `canonical` block only**: a manifest that mixed the two would make the gate fail on the clock.

- [ ] **Step 1: Write the failing test:**

```ts
import { test, expect } from "bun:test"
import { canonicalHash, runDirectory, writeManifest, readManifest }
  from "../../tools/stripboard/run-dir.ts"

test("the same inputs and metrics hash the same, and a changed input changes the hash", () => {
  expect(canonicalHash(INPUTS, METRICS)).toBe(canonicalHash(INPUTS, METRICS))
  expect(canonicalHash({ ...INPUTS, seed: INPUTS.seed + 1 }, METRICS))
    .not.toBe(canonicalHash(INPUTS, METRICS))
  expect(canonicalHash(INPUTS, { ...METRICS, cuts: METRICS.cuts + 1 }))
    .not.toBe(canonicalHash(INPUTS, METRICS))
})

test("every canonical input is in the hash, one field at a time", () => {
  // An unenumerated subset is one somebody can quietly shrink when a
  // comparison fails, so each field is varied and the hash must move.
  for (const key of Object.keys(INPUTS) as (keyof typeof INPUTS)[]) {
    const changed = { ...INPUTS, [key]: mutate(INPUTS[key]) }
    expect(canonicalHash(changed, METRICS), key).not.toBe(canonicalHash(INPUTS, METRICS))
  }
})

test("every canonical metric is in the hash, one field at a time", () => {
  for (const key of Object.keys(METRICS) as (keyof typeof METRICS)[]) {
    const changed = { ...METRICS, [key]: mutate(METRICS[key]) }
    expect(canonicalHash(INPUTS, changed), key).not.toBe(canonicalHash(INPUTS, METRICS))
  }
})

test("no provenance field reaches the hash", () => {
  // Determinism is not reproducibility of timing. A run that produces the same
  // canonical hash in twice the machine time has reproduced.
  const first = writeAndRead({ stamp: "a", durationMs: 1, host: "x", msPerInvocation: 11.7 })
  const second = writeAndRead({ stamp: "b", durationMs: 9999, host: "y", msPerInvocation: 3 })
  expect(first.canonical.hash).toBe(second.canonical.hash)
})

test("an unknown built commit is recorded as unknown and never as agreement", () => {
  // acquire.ts's own rule: builtCommit() returns undefined for an unknown
  // build, which callers must treat as "not the pinned commit".
  expect(() => canonicalHash({ ...INPUTS, builtCommit: "" }, METRICS)).toThrow(/built/)
})

test("the run directory is under build/ and is gitignored", async () => {
  expect(runDirectory("pultec-low-boost", "s")).toContain("build/stripboard/pultec-low-boost/s")
  const ignore = await Bun.file(".gitignore").text()
  expect(ignore).toContain("build/stripboard/")
})

test("a manifest round-trips, and a hash that disagrees with its own block refuses", () => {
  const dir = writeInto(MANIFEST)
  expect(readManifest(dir)).toEqual(MANIFEST)
  const tampered = { ...MANIFEST, canonical: { ...MANIFEST.canonical, hash: "0".repeat(64) } }
  const bad = writeInto(tampered)
  expect(() => readManifest(bad)).toThrow(/hash/)
})
```

  `mutate(value)` returns a different value of the same type — number plus one, string with a suffix, array with an extra element, boolean negated — and throws for a type it does not handle rather than returning the input, because a `mutate` that returned its argument would make the loop vacuous. Assert that: `expect(() => mutate(null)).toThrow()`.

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement.** `canonicalHash` serialises the two objects with their keys sorted and hashes the result; it refuses an empty `builtCommit`. `writeManifest` writes `run.json` with exactly two top-level blocks. `readManifest` recomputes the hash and refuses when it disagrees with the recorded one.

- [ ] **Step 4: Add V7's repository-safety test** in the same file, as a standing test rather than a one-off: capture `git status --porcelain boards/` before and after a scored evaluation into a run directory, and assert both are identical and empty of modifications. **It must be able to fail**: make the test write a byte into a board file, confirm it fails, revert.

- [ ] **Step 5: Prove the hash tests can fail.** Two breaks: drop one field from the serialisation (its loop iteration fails); include `provenance.stamp` in the hash (the no-provenance test fails).

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("Run directories, a canonical hash over enumerated inputs, and provenance kept out of it"), push.

---

### Task 14: The grader — `A1` over `HC1`–`HC10`

**THE CRUX. Read this plan's CRUX section again before starting.**

**Files:** create `tools/stripboard/constraints.ts`, `tools/stripboard/grade.ts` and `tools/stripboard/extent.ts`; create `tests/fixtures/stripboard/negative/` with one fixture per constraint and **two per `HC10`**; test `tests/stripboard/grade.test.ts` and `tests/stripboard/extent.test.ts`; modify `boards/pultec-*/perfboard.json` only if a board declares a stock other than the default (none does today, so expect no change and say so).

**Interfaces:**
- *Consumes:* `netlistEquivalence` — **which takes dump TEXT**, `describeVerdict`, `referenceNetsFromExport` (Tasks 4, 5); `copperGraph`, `holeKey`, `HoleKey`, `pinHoles` (Task 3, into `extent.ts`); `pinPatternFor`, `admitPattern`, `preparedExtentsHoles` (Task 2); `leadSpanFor`, `TOOL_MIN_SPAN_HOLES`, `TOOL_MAX_SPAN_HOLES` (`lib/kicad/lead-span*.ts`); `StripboardRules` (Task 10); `BoardTargets` (Task 11); `BoardDump` with `bounds` and `Part.direction` (Task 7).
- *Provides:*
  - `ConstraintId = "HC1" | "HC2" | "HC3" | "HC4" | "HC5" | "HC6" | "HC7" | "HC8" | "HC9" | "HC10"` — **ten, unchanged**
  - `ConstraintResult { readonly id: ConstraintId; readonly held: boolean; readonly detail: string }` — `detail` names the net or part on a failure and is non-empty on a pass too, so a pass is readable
  - `CheckInput { readonly dump: BoardDump; readonly dumpText: string; readonly reference: ReferenceNets; readonly footprints: ReadonlyMap<string, string>; readonly checkReport: CheckReport; readonly stock: Stock; readonly rules: StripboardRules }` — `dumpText` is the text as read and `dump` is `parseBoardDump` of **that same text**, so the two can never describe different boards
  - `Stock { readonly rows: number; readonly cols: number; readonly source: "board" | "rules-default" }`
  - `HARD_CONSTRAINTS: readonly { readonly id: ConstraintId; readonly check: (input: CheckInput) => ConstraintResult }[]` — **exactly ten entries**
  - `gradeHardConstraints(input: CheckInput): readonly ConstraintResult[]`
  - `a1(results: readonly ConstraintResult[]): boolean`
  - `stockFor(declarationFile: string, rules: StripboardRules): Stock`
- *Provides from `tools/stripboard/extent.ts`:*
  - `FeatureKind = "pin" | "cut" | "solder" | "wire"`
  - `RequiredFeature { readonly kind: FeatureKind; readonly hole: HoleKey; readonly names: string }` — what the feature is and what it belongs to, so a refusal can say which one reached past the extent
  - `requiredFeatures(dump: BoardDump): readonly RequiredFeature[]`
  - `FabricationExtent { readonly minRow: number; readonly minCol: number; readonly maxRow: number; readonly maxCol: number; readonly rows: number; readonly cols: number; readonly fromBounds: boolean; readonly featuresOutsideBounds: readonly RequiredFeature[] }`
  - `fabricationExtent(dump: BoardDump): FabricationExtent`
  - `withinExtent(hole: HoleKey, extent: FabricationExtent): boolean`
  - `TrimVerdict { readonly preserved: boolean; readonly detail: string }`
  - `trimPreservesConnectivity(dump: BoardDump, extent: FabricationExtent): TrimVerdict`
**`HC8`'s check calls `netlistEquivalence(input.dumpText, input.reference)`. DO NOT PRE-PARSE.**
Handing it `input.dump` is a type error now that the signature is text, and the reason it is text
is the reason this sentence is here: `missing-line` and `unsupported-strip-axis` are inexpressible
through a `BoardDump`, which carries a grid and a boolean axis by construction, so a pre-parsed
call discards two of `HC8`'s nine refusals and replaces their wording with the parser's. This is
the **second** site of one root cause — **a plan that hands a parsed object to a function whose
contract is about the text** — recorded in full at Task 4's signature note; Task 3 was the first
and was corrected at `d711d5c`. `CheckInput` therefore carries **both** fields: `dumpText` for
`HC8`, `dump` for the checks that read parsed structure. Every helper that builds a `CheckInput`
— `healthyInput()`, `negativeInput()`, `inputWithoutBounds()` and the rest — reads the dump text
once and sets both from it.

- Task 15's ranking runs over candidates that passed `a1`; Task 20's verdict consumes `ConstraintResult[]`; **no other module checks a hard constraint.** `extent.ts` is a **measurement** module like `copper.ts`, not a second place a constraint is decided: `HC6` in `constraints.ts` is the only caller that turns its numbers into a verdict.

**`HC6`'s quantity is the FABRICATION EXTENT, and `BOUNDS` alone is not it.** `HC6` asks whether
the layout *"fits the stock the owner bought"* — whether this can be **cut from that board** — and
CRITERIA is explicit that the quantity is *"the occupied extent, not the canvas"*, with `BOUNDS`
*"the exact figure"* that *"tightens the check"*. The trouble is what `BOUNDS` turns out to be:
Task 7 reads `Board::GetBounds` and finds a union of three sources, one of which is **text
labels** and one of which does not filter on `GetIsPlaced()`. So `BOUNDS` is a **good** reading of
component bodies plus painted copper and the **only** dump-readable one, and it is **not** a
statement about which features a cuttable board must retain.

**So the extent is computed, not read, and then it is verified.** A cuttable board must include
every physical feature that preserves connectivity — a wire endpoint, a solder bridge, the copper
run a cut depends on — not just the component bounding box, and those features measurably reach
past the pin extent: on `transistor-preamp-feedback` two wire endpoints do, and on
`transistor-preamp-staged` four wire endpoints and two solder-bridge holes do. Three steps:

1. **Enumerate.** `requiredFeatures` returns every `PIN` hole, both holes of every `CUT`, both
   holes of every `SOLDER`, and both ends of every placed `WIRE`, each labelled with what it is
   and what it belongs to. Nothing is inferred from `SPAN`, per the dump's own rule.
2. **Union with `BOUNDS`.** `fabricationExtent` is the bounding region over the enumerated
   features **and** `bounds`. Taking the union is **conservative in the one direction that
   matters**: the result is never smaller than either input, so `HC6` can be stricter than the
   truth and never looser. A stricter `HC6` can refuse a board that would in fact fit — a label in
   a corner is the known cause — and **that refusal is reported with its cause rather than
   relaxed**, which is `K3`'s posture applied by analogy. `featuresOutsideBounds` records any
   feature `BOUNDS` did not already cover, which is the discriminating observation and the only
   one the dump supports; `fromBounds` records whether `bounds` was present at all.
3. **Verify.** `trimPreservesConnectivity` rebuilds the copper graph from a dump restricted to the
   extent and asserts the **partition of the pin holes is identical** to the untrimmed one. That is
   the claim "trimming to this extent preserves connectivity", made as a computation rather than
   as an argument. It uses Task 3's `copperGraph`, which shares no code with the scorer, so the
   check inherits `HC8`'s independence.

**`HC6` refuses a dump with no `BOUNDS` rather than falling back to the feature extent**, because
the feature extent is a **lower** bound on physical extent — a body overhangs its leads — and
substituting it would silently loosen the constraint. That is Task 7's ruling, unchanged.

**`A_occ` is NOT the fabrication extent and the two are not interchangeable.** `A_occ` (Task 15)
is `OBJ3`'s settled ranking term, specified as a direct reading of `BOUNDS`; the fabrication extent
is `HC6`'s constraint quantity and is a union including features `BOUNDS` may not cover. Changing
`A_occ` to the union would change a settled ranking term, which is a decision and not an
implementation detail (`D19`), so it is not done here — and Task 15 says so beside `occupiedArea`.

**What is reported to the owner rather than decided here.** CRITERIA calls `BOUNDS` *"the exact
figure"*; read against `Board.h:710` it is the union of three sources, one of them annotations. The
plan does not edit CRITERIA and does not reinterpret `HC6`'s stock: it computes a conservative
extent, reports the discrepancy, and records the wording divergence and the option of decomposing
`BOUNDS` in the fork as findings in `docs/stripboard/pipeline-verification.md`.

**`HC10` holds only when BOTH its halves hold, and it is still one of ten.** `HC10`'s criterion
sentence is *"every placed part's pins lie on straight lines parallel to the strips"*; CRITERIA's
"Checked by" column specifies a footprint-level classification. Task 2 proves a footprint **could**
be placed compatibly. **Nothing proved the produced layout did**, and the verdict asserted `HC10`
anyway — which is this plan's own crux turned on itself. So:

- **The footprint half** — `admitPattern(pinPatternFor(footprint))` for every placed part's
  footprint, refusing by name for an unlisted one. Task 2's check, called from here.
- **The placement half** — for every **placed** part, its resolved `PIN` holes must decompose into
  rows **along the strip axis the dump reports**: every pin's along-strip coordinate may vary
  freely, and the pins must fall on a set of strips whose occupied strips are exactly the rows the
  footprint's classification predicts, **consistent with the part's `DIRECTION`**. A decomposable
  footprint turned the wrong way puts one row's pads across several strips, which is precisely the
  board of cuts `HC10` exists to refuse, and it is readable from `PIN` and `DIRECTION` alone.
- `detail` names **which half** failed and which part, so a failure points at the remedy: the
  footprint half points at the data, the placement half points at the layout.
- **Both halves get their own negative fixture** (V4), because a single fixture would let one half
  be vacuous while the other carried the test.
- `DIRECTION` is read **as well as** the pin positions rather than instead of them, for M1.1's own
  reason: *"reading the orientation directly is what makes the check independent of the lead
  pattern, and a single-pad or symmetric part has no lead pattern to read."* Two readings of two
  things are two witnesses, which is the shape `HC3` already uses.

**`CheckReport` does not exist yet and this task adds it, which is a correction to a fact worth stating.** `tools/perfboard/check.ts` spawns `--check BOARD --netlist NET` and returns `CheckRun { status, output }` — the **raw concatenated stdout and stderr**, deliberately: *"the report body is on stdout, but an unreadable board writes an empty report and puts the only diagnostic on stderr."* It does **not** parse the report into sections. So this task also exports, from `tools/stripboard/constraints.ts`:

- `CheckReport { readonly status: number; readonly incompleteNets: readonly string[]; readonly schematicDelta: readonly string[] }`
- `parseCheckReport(run: CheckRun): CheckReport`

and one fact decides how it is written: a board with no schematic delta *"has no `Schematic delta` section AT ALL — the heading is omitted, not left empty"* (`check.ts`'s own comment). **So an absent heading is `[]` and an unparseable report refuses**, naming the report, rather than an absent heading and an unreadable report both resolving to "no delta" — which is a skipped check that looks like a passing one. `HC1` and `HC7` read this parse; neither re-runs a second checker.

- [ ] **Step 1: Write the failing test. The first two assertions are the crux expressed as tests:**

```ts
import { test, expect } from "bun:test"
import { HARD_CONSTRAINTS, gradeHardConstraints, a1, stockFor }
  from "../../tools/stripboard/grade.ts"
import { fabricationExtent, requiredFeatures, trimPreservesConnectivity, withinExtent }
  from "../../tools/stripboard/extent.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { importClosure } from "./import-closure.ts"

const IDS = ["HC1", "HC2", "HC3", "HC4", "HC5", "HC6", "HC7", "HC8", "HC9", "HC10"] as const

test("there are exactly ten hard constraints and A1 is the verdict that all ten hold", () => {
  expect(HARD_CONSTRAINTS.map((entry) => entry.id)).toEqual([...IDS])
})

test("every constraint reports a result on every grade, so none can be skipped", () => {
  const results = gradeHardConstraints(healthyInput())
  expect(results.map((result) => result.id).sort()).toEqual([...IDS].sort())
  for (const result of results) expect(result.detail, result.id).not.toBe("")
})

test("A1 is false when any single constraint fails, one at a time", () => {
  // Ten subtests in a loop, because a conjunction written as nine ANDs and a
  // typo is a verdict that ignores one constraint and this is what catches it.
  for (const id of IDS) {
    const results = gradeHardConstraints(healthyInput()).map((result) =>
      result.id === id ? { ...result, held: false } : result)
    expect(a1(results), id).toBe(false)
  }
  expect(a1(gradeHardConstraints(healthyInput()))).toBe(true)
})

test("V4: each constraint has a fixture it rejects by name", async () => {
  // The parent's gate-9 discipline: a grader that cannot fail proves nothing.
  // Each row is a fixture and the constraint it must fail, and the assertion is
  // that THAT constraint failed and that its detail names the offending thing.
  const cases = [
    ["HC1", "incomplete-net", /incomplete/],
    ["HC2", "cuts-unresolved", /UNRESOLVED/],
    ["HC3", "floated-part", /C19/],
    ["HC4", "span-above-tool-range", /16|range/],
    ["HC5", "span-above-reach", /maxSpanHoles|reach/],
    ["HC6", "over-stock", /34|27|stock/],
    ["HC7", "schematic-delta", /delta/],
    ["HC8", "two-nets-shorted", /short|mid|out/],
    ["HC9", "span-below-minimum", /minSpanHoles|minimum/],
    ["HC10", "round-pin-pattern", /strip/],
    ["HC10", "rows-across-the-strips", /strip/],
  ] as const
  for (const [id, fixture, pattern] of cases) {
    const results = gradeHardConstraints(await negativeInput(fixture))
    const failed = results.filter((result) => !result.held).map((result) => result.id)
    expect(failed, fixture).toContain(id)
    const detail = results.find((result) => result.id === id)!.detail
    expect(detail, fixture).toMatch(pattern)
  }
})

test("HC3 asserts BOTH signals, so a fork change keeping one fails loudly", async () => {
  const results = gradeHardConstraints(await negativeInput("floated-part"))
  const detail = results.find((result) => result.id === "HC3")!.detail
  expect(detail).toMatch(/FLOATING/)
  expect(detail).toMatch(/PIN/)
})

test("HC5, HC9 and HC10 refuse by name for a footprint with no data, never default", async () => {
  // PAR2: both span bounds are required with no default and the pipeline
  // refuses without them, including for a family the module has no datasheet
  // figure for. The same posture now covers HC10's pin pattern.
  const input = await inputWithFootprint("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")
  expect(() => gradeHardConstraints(input)).toThrow(/C_Disc_D5\.0mm/)
  const unknown = await inputWithFootprint("Rotary_SW:SW_Rotary11_D30mm")
  expect(() => gradeHardConstraints(unknown)).toThrow(/SW_Rotary11_D30mm/)
})

test("HC6 measures the occupied extent, not the canvas from GRID", async () => {
  // --import leaves the canvas at a default, so a GRID larger than the stock
  // says nothing about copper. A layout whose parts fit inside the stock can be
  // cut from that board whatever its canvas says.
  const wideCanvas = await inputWithGridAndBounds({ grid: [60, 60], bounds: [0, 0, 10, 10] })
  expect(gradeHardConstraints(wideCanvas).find((r) => r.id === "HC6")!.held).toBe(true)
})

test("HC6 refuses a layout whose WIRE end is inside the stock only if BOUNDS is trusted alone", async () => {
  // THE GAP THIS CLOSES. BOUNDS is a union of three sources (Board.h:710) and
  // is not a statement about which features a cuttable board must retain. A
  // wire endpoint, a solder bridge or the copper run a cut depends on can sit
  // outside the component bounding box - measured on two committed boards - and
  // a board trimmed to a box that excludes one does not conduct.
  //
  // The fixture puts a WIRE end one column past BOUNDS and past the stock. A
  // grader reading BOUNDS alone passes it; the fabrication extent refuses it
  // and NAMES THE WIRE, which is the discriminating observation.
  const input = await inputWithFeatureOutsideBounds({ kind: "wire" })
  const hc6 = gradeHardConstraints(input).find((result) => result.id === "HC6")!
  expect(hc6.held).toBe(false)
  expect(hc6.detail).toMatch(/wire/i)
  expect(hc6.detail).toMatch(/stock/)
})

test("HC6's detail reports both figures when they disagree, because the dump cannot attribute it", async () => {
  // BOUNDS over-states when a text label or an unplaced part contributes a rect,
  // and the dump reports only the union - so the cause is NOT in the data and
  // the detail says which two numbers disagreed rather than explaining why.
  const input = await inputWithFeatureOutsideBounds({ kind: "solder" })
  const hc6 = gradeHardConstraints(input).find((result) => result.id === "HC6")!
  expect(hc6.detail).toMatch(/BOUNDS/)
  expect(hc6.detail).toMatch(/feature/i)
})

test("the fabrication extent is the union, so it is never smaller than either input", async () => {
  // The conservatism is the whole argument: HC6 may be STRICTER than the truth
  // and must never be looser. A union cannot be smaller than a part.
  for (const dump of await everyExtentFixture()) {
    const extent = fabricationExtent(dump)
    const bounds = dump.bounds!
    expect(extent.minRow).toBeLessThanOrEqual(bounds.minRow)
    expect(extent.maxRow).toBeGreaterThanOrEqual(bounds.maxRow)
    expect(extent.minCol).toBeLessThanOrEqual(bounds.minCol)
    expect(extent.maxCol).toBeGreaterThanOrEqual(bounds.maxCol)
    for (const feature of requiredFeatures(dump)) {
      expect(withinExtent(feature.hole, extent), `${feature.kind} ${feature.names}`).toBe(true)
    }
  }
})

test("trimming to the fabrication extent preserves the reconstructed connectivity", async () => {
  // The claim "a cuttable board includes every feature that preserves
  // connectivity", made as a computation: rebuild the copper graph from a dump
  // restricted to the extent and compare the PARTITION OF THE PIN HOLES with
  // the untrimmed one. An extent that dropped the copper run a cut depends on
  // changes that partition, which is exactly the failure a bounding box hides.
  for (const dump of await everyExtentFixture()) {
    const result = trimPreservesConnectivity(dump, fabricationExtent(dump))
    expect(result.preserved, result.detail).toBe(true)
  }
})

test("trimming to a DELIBERATELY TOO SMALL extent is detected, so the check can fail", async () => {
  // Without this the test above passes for a trim that drops nothing because
  // the extent is the whole board, and it would never have been exercised.
  const dump = (await everyExtentFixture())[0]!
  const whole = fabricationExtent(dump)
  const shrunk = { ...whole, maxCol: whole.maxCol - 1, cols: whole.cols - 1 }
  const result = trimPreservesConnectivity(dump, shrunk)
  expect(result.preserved).toBe(false)
  expect(result.detail).toMatch(/[0-9]+,[0-9]+/)
})

test("HC10 holds only when BOTH halves hold, and the detail says which failed", async () => {
  // HC10's criterion sentence is about a PLACEMENT; CRITERIA's Checked-by
  // column specifies a footprint-level classification. Task 2 proves a
  // footprint COULD be placed compatibly. This is the half that proves the
  // produced layout DID - and without it the verdict asserted a constraint
  // whose placement clause nothing checked.
  const footprintFailure = await negativeInput("round-pin-pattern")
  const footprint = gradeHardConstraints(footprintFailure).find((r) => r.id === "HC10")!
  expect(footprint.held).toBe(false)
  expect(footprint.detail).toMatch(/footprint/)

  const placementFailure = await negativeInput("rows-across-the-strips")
  const placement = gradeHardConstraints(placementFailure).find((r) => r.id === "HC10")!
  expect(placement.held).toBe(false)
  expect(placement.detail).toMatch(/placement/)
  expect(placement.detail).toMatch(/U1|DIRECTION/)
})

test("HC10's placement half reads DIRECTION as well as the pin holes - two witnesses", async () => {
  // M1.1's own reason for the field: reading the orientation directly is what
  // makes the check independent of the lead pattern, and a single-pad or
  // symmetric part has no lead pattern to read. Same shape as HC3's two signals:
  // a change keeping one and dropping the other fails loudly.
  const placement = gradeHardConstraints(await negativeInput("rows-across-the-strips"))
    .find((result) => result.id === "HC10")!
  expect(placement.detail).toMatch(/DIRECTION/)
  expect(placement.detail).toMatch(/[0-9]+,[0-9]+/)   // the pin holes it read
})

test("HC10's placement half passes a decomposable footprint turned the RIGHT way", async () => {
  // The positive control. Without it the placement half could refuse every
  // multi-row part and every negative fixture would still pass.
  const correct = await inputWithMultiRowPartAlongTheStrips()
  const hc10 = gradeHardConstraints(correct).find((result) => result.id === "HC10")!
  expect(hc10.held, hc10.detail).toBe(true)
  expect(hc10.detail).toMatch(/footprint/)
  expect(hc10.detail).toMatch(/placement/)
})

test("HC10's placement half reads the strip axis rather than assuming rows", async () => {
  // The same layout under VERTICAL_STRIPS 0 and 1 cannot both be compatible,
  // and a check hard-coded to rows would pass one of them for the wrong reason.
  const horizontal = await inputWithMultiRowPartAlongTheStrips()
  const vertical = await withStripAxisFlipped(horizontal)
  const held = (input: Awaited<ReturnType<typeof inputWithMultiRowPartAlongTheStrips>>) =>
    gradeHardConstraints(input).find((result) => result.id === "HC10")!.held
  expect(held(horizontal)).not.toBe(held(vertical))
})

test("HC6 refuses a dump with no BOUNDS line rather than falling back to the pin extent", async () => {
  // Task 7's ruling: the frozen fixtures predate the line, and the refusal
  // belongs where the field is needed. Pin extent is a LOWER bound on physical
  // extent because a body overhangs its leads, so substituting it would
  // silently loosen the constraint.
  const noBounds = await inputWithoutBounds()
  expect(() => gradeHardConstraints(noBounds)).toThrow(/BOUNDS/)
})

test("the stock comes from the board when it declares one and from the rules otherwise", () => {
  const rules = loadRules()
  const fromRules = stockFor("boards/pultec-low-boost/perfboard.json", rules)
  expect(fromRules.source).toBe("rules-default")
  expect([fromRules.rows, fromRules.cols]).toEqual([rules.stockRows, rules.stockCols])
  const declared = stockFor(fixtureDeclaration({ stock: { rows: 40, cols: 30 } }), rules)
  expect(declared.source).toBe("board")
  expect([declared.rows, declared.cols]).toEqual([40, 30])
})

test("nothing in the grader's TRANSITIVE import closure is the scorer or the search", async () => {
  // R2: the thing that mutates the board and the thing that certifies it are
  // two implementations of nothing in common.
  //
  // THE TEST THIS REPLACES was `expect(text).not.toContain("score.ts")` on two
  // files for three filenames, under a comment claiming it was "asserted by
  // reading the import graph rather than by intention". It was not: a
  // transitive import through ANY third module passes it, so the comment was a
  // stronger claim than the body and the gap was invisible. The closure is
  // computed, and an unresolvable import is an error rather than a dropped
  // edge - see tests/stripboard/import-closure.ts.
  const forbidden = [
    "tools/stripboard/score.ts",
    "tools/stripboard/climb.ts",
    "tools/stripboard/moves.ts",
    "tools/stripboard/rank.ts",   // reaches score.ts, so reaching it reaches the scorer
  ]
  for (const file of ["tools/stripboard/grade.ts", "tools/stripboard/constraints.ts"]) {
    const closure = await importClosure(file)
    for (const module of forbidden) {
      expect([...closure].sort(), `${file} -> ${module}`).not.toContain(module)
    }
  }
})

test("the grader and the scorer DO share the dump parser and the targets, which is intended", async () => {
  // The honest other half. R2 is about two implementations of the objective and
  // the verdict, not about forbidding a shared reader of the input text: both
  // sides must agree on what the dump SAYS or they are grading different
  // boards. Asserting the sharing makes it a decision in the record rather than
  // an accident the closure test tolerates.
  const graderClosure = await importClosure("tools/stripboard/grade.ts")
  expect([...graderClosure]).toContain("tools/guide/dump.ts")
  const scorerClosure = await importClosure("tools/stripboard/score.ts")
  expect([...scorerClosure]).toContain("tools/guide/dump.ts")
})
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Build the ten negative fixtures**, in `tests/fixtures/stripboard/negative/<name>.dump` plus a `provenance.txt` per directory. Eight are hand-written dump text, which is the grader's real input seam; two reuse committed boards:
  - `floated-part` — the committed `tests/fixtures/pultec-low-boost-c19-floated.dump`, **not a new capture**. It is the measured failure and it already has provenance.
  - `cuts-unresolved` — `transistor-preamp-lab`'s dump, which reports `CUT_STATE UNRESOLVED` with 19 `CUT_CONFLICT` lines. Capture it with provenance; it is also the board whose `J = −1` Task 11 refuses, from the other direction.
  - `incomplete-net`, `schematic-delta` — a hand-written `CheckReport` with one `incomplete` net and one with a non-empty schematic-delta section. These two read `--check`'s output, so the fixture is that output, and the test does not spawn a binary.
  - `two-nets-shorted` — Task 4's hand-written short, reused rather than rebuilt. **The board-level fixture is OB5 and this is not it**; say so in the fixture's `provenance.txt`.
  - `span-above-tool-range`, `span-above-reach`, `span-below-minimum` — dump text whose `PIN` lines put one part's two leads at a span above 16, above the family's `maxSpanHoles`, and below its `minSpanHoles`. **No span figure is written into the fixture or the test**: the fixture names a footprint, the test reads the bound through `leadSpanFor` and constructs the offending span from it, so a datasheet revision moves the fixture with the module rather than stranding it.
  - `over-stock` — dump text whose `BOUNDS` exceeds the stock in one axis, with the stock read from the rules file the same way.
  - `over-stock-wire-outside-bounds` — **`HC6`'s second fixture, and the one the previous draft had no equivalent of.** Dump text whose `BOUNDS` is inside the stock while a `WIRE` end lies a column past both. A grader reading `BOUNDS` alone passes it; the fabrication extent refuses it naming the wire. **Without this fixture the whole of finding 4 is untested**, because `over-stock` alone passes for a grader that reads `BOUNDS` and nothing else.
  - `round-pin-pattern` — **`HC10`'s footprint-half fixture.** Dump text naming a part whose footprint is the synthetic ring Task 2's test constructs, registered for this fixture only in the test's own map rather than in `PIN_PATTERNS`, because `PIN_PATTERNS` holds footprints this repository places and nothing else.
  - `rows-across-the-strips` — **`HC10`'s placement-half fixture.** Dump text placing a decomposable multi-row footprint — a `DIP-16`, whose rows are a known quantity from Task 2's data — turned so its two rows run **across** the strips rather than along them: its `PIN` holes put one row's pins on several strips, and its `DIRECTION` is the perpendicular one. Both readings disagree with the footprint's classification, and `HC10` must fail naming the part, the half and the direction. **No pad coordinate and no row count is written into the fixture or the test**: the fixture names the footprint, and the test reads the expected rows through `pinPatternFor`, the way the span fixtures read their bounds through `leadSpanFor`.

- [ ] **Step 4: Implement `tools/stripboard/extent.ts` first**, because `HC6` consumes it. `requiredFeatures` enumerates the four kinds and nothing else, labelling each with what names it; `fabricationExtent` unions them with `bounds` and **refuses when `bounds` is absent**, naming the line and pointing at `REBUILD_PINNED_FORK`, because the feature extent is a lower bound and substituting it loosens the constraint; `trimPreservesConnectivity` restricts the dump to the extent, rebuilds through `copperGraph`, and compares the **partition of the pin holes** — not the component ids, which are allocation order and would differ for an identical partition. The module comment states what `BOUNDS` actually is, with `Board.h:710`'s three sources named, why the union is conservative in the only direction that matters, and that `A_occ` is a different quantity that deliberately does not change.

- [ ] **Step 4b: Implement `tools/stripboard/constraints.ts`** — one exported function per constraint, each taking `CheckInput` and returning `ConstraintResult`, each with a comment naming the constraint, quoting the one clause of CRITERIA that decides it, and naming its negative fixture. **`HC8` passes `input.dumpText`, never `input.dump`**, for the reason stated above, and its comment says so, because the next author's reflex will be to reach for the parsed value that is sitting right there. **`HC10` is one exported function composing two private halves** — `hc10FootprintEligibility` and `hc10PlacementOrientation` — conjoined, with `detail` naming the half that failed; **it is one entry in the table and `ConstraintId` is unchanged at ten**, because both halves are clauses of one criterion. Then `tools/stripboard/grade.ts` — `HARD_CONSTRAINTS` as a ten-entry table, `gradeHardConstraints` mapping over it, `a1` as `results.every((result) => result.held)` **after asserting the result set covers all ten ids**, because a conjunction over a short list is a verdict that ignores a constraint. Keep every file under the line ceiling by putting the ten checks in `constraints.ts`, the extent arithmetic in `extent.ts`, and the table, the verdict and `stockFor` in `grade.ts`; **if `constraints.ts` passes 500 lines, split it by constraint group and say which groups**, rather than letting one file grow.

- [ ] **Step 5: Prove the grader can fail — and prove it the way the defects were actually found.** Nine mutations, each applied, run and reverted, each recorded in a comment beside the assertion it broke:
  1. **`a1` returns `results.every(...)` over a nine-entry table** (one id dropped from `HARD_CONSTRAINTS`). The ten-entry test and the one-at-a-time test must fail. *This is the defect CRITERIA found in PIPELINE: `A1` stated `H1`–`H9` and left a board free to violate a declared hard constraint while passing every admissibility condition.*
  2. **Every check returns `{ held: true }`.** Every V4 row must fail. *The vacuous grader.*
  3. **`HC3` reads only the `PART` placement field.** The both-signals test must fail.
  4. **`HC6` reads `dump.grid` instead of the fabrication extent.** The wide-canvas test must fail.
  5. **`HC6` reads `dump.bounds` instead of the fabrication extent.** The `over-stock-wire-outside-bounds` row and the wire-outside test must fail. ***Run this one first.* It is the exact gap finding 4 names: a board whose bounding box fits the stock and whose wire does not, graded as fitting. The previous draft's `HC6` would have passed it and no test would have noticed.**
  6. **`fabricationExtent` returns `bounds` unchanged.** The union test and the wire-outside test must fail.
  7. **`trimPreservesConnectivity` returns `{ preserved: true }` unconditionally.** The too-small-extent test must fail. *The vacuous verification, which is the shape the fork's harness found four times.*
  8. **`HC10` returns only its footprint half.** The `rows-across-the-strips` row and the both-halves test must fail. ***This is the other half of the crux turned on itself***: it is precisely the state the previous draft shipped, and the mutation existing means the state cannot return silently.
  9. **`HC5` falls back to `TOOL_MAX_SPAN_HOLES` for an unlisted footprint.** The refuse-by-name test must fail. *This is the failure `PAR2` exists to prevent and the one whose symptom is a board that scores well and cannot be built.*

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("Grade a candidate against all ten hard constraints, with a fixture each one rejects"), push. Two commits if `extent.ts` lands cleanly on its own, because the fabrication extent and the ten-constraint table are two facts.

- [ ] **Step 7: CHECKPOINT 1 — point the grader at four boards a person built, and read the verdicts.** This is the first place all ten hard constraints meet, and every fixture above is hand-written dump text. Four committed, hand-laid layouts that pass `make check` today are the first evidence the grader is pointed at reality rather than at its own fixtures. Run `gradeHardConstraints` on each and **read the output**, not only the assertion:

  | board | reference nets from | expected |
  | --- | --- | --- |
  | `pultec-low-boost` | the frozen pair from Task 5, so the checkpoint needs no live export | **all ten hold** |
  | `transistor-preamp-feedback` | `tests/fixtures/transistor-preamp-feedback.net` | **all ten hold** |
  | `transistor-preamp-staged` | `tests/fixtures/transistor-preamp-staged.net` | **all ten hold** |
  | `pt2399-core` | `tests/fixtures/pt2399-core-veroroute.net` | **REFUSES, and the refusal is the checkpoint passing** |

  **`pt2399-core` is expected to refuse, on two known owner-blocked conflicts, and the checkpoint records the verdict rather than treating it as a failure.** Its `PIN` holes run `0,0`–`16,35`, a 17 × 36 extent against the declared 34 × 27 stock (`OB4`), and it places three footprints with no span data — two in `UNSOURCED` and one in neither map (`PAR2`, which refuses **by name**). Assert what discriminates: that the refusal **names the footprint** and that the extent failure **names both figures**. **What would be a failure is `pt2399-core` grading admissible**, because that means `HC6` or `PAR2`'s refusal is not wired in; and **a refusal with a different cause is also a finding** — report it, do not adjust the grader to produce the expected one.

  **If one of the other three refuses, stop and report it.** Three hand-laid boards that pass `make check` are the closest thing this plan has to ground truth, and a constraint that refuses one of them is either wrong or has found something real — which is `OB4`'s own reasoning (*"a built board that violates a hard constraint is exactly the signal that a constraint is wrong"*). Do not relax the constraint. Record the board, the constraint, the detail and the derived figures, and take it to the owner.

  Record the four verdicts, with their `detail` strings, in `docs/stripboard/pipeline-verification.md`. Commit the checkpoint's test as a standing test — a checkpoint run once is a checkpoint that stops holding.

---

### Task 15: The ranking, and `A_occ`

**Files:** create `tools/stripboard/rank.ts`; test `tests/stripboard/rank.test.ts`.

**Interfaces:**
- *Consumes:* `Score` (Task 12); `BoardDump.bounds` (Task 7).
- *Provides:*
  - `RANKING: string` — the declared order and the reason for each position, as a string constant beside the ranker
  - `occupiedArea(dump: BoardDump): number` — `(maxRow − minRow + 1) × (maxCol − minCol + 1)` from `BOUNDS`
  - `pinBoundingBoxWirelength(dump: BoardDump, reference: ReferenceNets): number` — labelled a proxy, in its own name and its own comment
  - `rankingTuple(score: Score, dump: BoardDump, reference: ReferenceNets): readonly number[]`
  - `compareRanking(a: readonly number[], b: readonly number[]): number`
- Task 17's plateau acceptance and Task 20's choice among admissible candidates consume `compareRanking`; Task 13's `CanonicalMetrics.ranking` carries the tuple.

**The order, and it is `OBJ3`'s, which is the authority for it:** cuts, then wire bridges, then solder bridges, then `A_occ`, then pin-bounding-box wirelength. `A_occ` sits **below all three construction-cost terms** because a smaller board that costs more to build is not an improvement, and lexicographic order is what guarantees area can never buy a cut; and **above wirelength** because `A_occ` measures the thing while wirelength is a labelled proxy for track length, which nothing here derives (limit `H-11`).

**A ranking term is not a term in `F`** and cannot make the search accept a worse `F`. Task 17 asserts that directly.

**`A_occ` reads `BOUNDS` and is NOT `HC6`'s fabrication extent**, and the two deliberately stay
apart. `A_occ` is `OBJ3`'s settled ranking term, specified as a direct reading of `BOUNDS`;
`HC6`'s quantity is the union of `BOUNDS` with every required feature hole (Task 14), which is a
larger figure and a different question — *which board can this be cut from* rather than *which of
two equal-cost layouts is tighter*. Substituting either for the other would change a decision
while looking like an implementation detail (`D19`), so `occupiedArea`'s comment names the other
quantity, names `tools/stripboard/extent.ts` as where it lives, and says why it is not used here.

- [ ] **Step 1: Write the failing test:**

```ts
test("RANKING names all five terms in the tuple's order, and carries prose for each", () => {
  // A reviewable ranking beats a weighted sum with tuned coefficients, and a
  // declared order with no reasons is not reviewable.
  //
  // WHAT THIS TEST PROVES is that each of the five terms is named, that they
  // appear in the order rankingTuple produces, and that each name is followed by
  // some prose before the next one. WHAT IT DOES NOT PROVE is that the prose is
  // a REASON - no test can, and the previous version asserted
  // RANKING.length > 400 under a name that claimed it did, which a single long
  // sentence satisfies. The reason being a reason is the owner's judgement at
  // review time, and that is stated rather than simulated.
  const terms = ["cuts", "wire", "solder", "A_occ", "wirelength"]
  const positions = terms.map((term) => RANKING.indexOf(term))
  for (const [index, at] of positions.entries()) {
    expect(at, `${terms[index]} is not named in RANKING`).toBeGreaterThanOrEqual(0)
  }
  expect(positions, "RANKING must name the terms in the tuple's own order")
    .toEqual([...positions].sort((a, b) => a - b))
  for (const [index, at] of positions.entries()) {
    const next = positions[index + 1] ?? RANKING.length
    const prose = RANKING.slice(at + (terms[index]?.length ?? 0), next).trim()
    expect(prose.length, `${terms[index]} is named with no prose after it`).toBeGreaterThan(40)
  }
  expect(RANKING).toMatch(/proxy/)
})

test("the tuple is in the declared order, and area never outranks a construction cost", () => {
  const cheapBigBoard = rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 30, 30), REFERENCE)
  const dearSmallBoard = rankingTuple(score({ cuts: 2 }), dumpWithBounds(0, 0, 2, 2), REFERENCE)
  expect(compareRanking(cheapBigBoard, dearSmallBoard)).toBeLessThan(0)
})

test("A_occ separates two candidates that F cannot", () => {
  const same = score({ cuts: 1, wires: 0, solder: 0 })
  const tight = rankingTuple(same, dumpWithBounds(0, 0, 2, 2), REFERENCE)
  const sprawling = rankingTuple(same, dumpWithBounds(0, 0, 20, 20), REFERENCE)
  expect(compareRanking(tight, sprawling)).toBeLessThan(0)
})

test("A_occ is computed from BOUNDS and by a second path over the same four integers", () => {
  // V1's discipline applied to the one geometric term.
  const dump = dumpWithBounds(3, 5, 9, 11)
  const bounds = dump.bounds!
  expect(occupiedArea(dump))
    .toBe((bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1))
})

test("A_occ refuses a dump with no BOUNDS, rather than substituting the pin extent", () => {
  // D19: the bounding box of the PIN and WIRE holes measures lead extent
  // rather than the footprint rectangle, so substituting it would silently
  // redefine a settled ranking term, which is a change to a decision and not
  // an implementation detail.
  expect(() => occupiedArea(dumpWithoutBounds())).toThrow(/BOUNDS/)
})

test("the wirelength term is named and documented as a proxy, not as a measurement", async () => {
  const text = await Bun.file("tools/stripboard/rank.ts").text()
  expect(text).toMatch(/proxy for track length/)
  expect(text).toMatch(/H-11/)
})

test("a plateau walk under this order cannot cycle", () => {
  // A strict decrease in a lexicographic order over a finite set of integer
  // tuples terminates, so a plateau walk either leaves the plateau or stops.
  // Asserted as the property the climb relies on: the comparison is a strict
  // weak order.
  const tuples = [rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 2, 2), REFERENCE),
                  rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 3, 3), REFERENCE),
                  rankingTuple(score({ cuts: 0 }), dumpWithBounds(0, 0, 9, 9), REFERENCE)]
  for (const a of tuples) for (const b of tuples) {
    if (compareRanking(a, b) < 0) expect(compareRanking(b, a)).toBeGreaterThan(0)
    if (compareRanking(a, b) === 0) expect(compareRanking(b, a)).toBe(0)
  }
})
```

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement**, with `RANKING` carrying the five positions and the reason for each, in the shape the sibling repository's `RANKING` constant uses. **Step 4: Prove it can fail** — reorder the tuple to put `A_occ` above cuts (the never-outranks test fails); return `dump.grid.rows * dump.grid.cols` from `occupiedArea` (the second-path test fails).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("A declared lexicographic ranking, with occupied area below every construction cost"), push.

---

### Task 16: P1 — three starting arms, with random as the control

**Files:** create `tools/stripboard/seed.ts` and `tools/stripboard/seed-compare.ts`; test `tests/stripboard/seed.test.ts`, `tests/stripboard/seed-compare.test.ts`.

**This task was a construction and is now an experiment, and the three questions that changed it are the owner's.**

1. **Why does the start configuration matter?** Less than the previous revision implied. Every
   restart is a fresh start (`E2`, Task 18), so the start decides how the **first** climb's share
   of the budget is spent and nothing else; with cheap, numerous restarts its effect washes out.
   The previous revision also read as though `--import`'s output were a working layout to improve
   from. **It is not.** `--check` against the netlist exported from today's `physicalBoard(section)`
   reports **19, 13, 7 and 6 incomplete nets** on mid, hi-boost, hi-cut and low-cut (PIPELINE §1,
   COST §2.4), and `--import`'s placement is `Board::AddComponent`'s `-1,-1` first-fit sweep that
   never consults `parsed.m_nets` at all. So the search begins in repair mode whatever the start is.
2. **How would we know which is better?** By running them against the same seed set and the same
   budget on the same board, not by argument. That is what this task builds.
3. **Is anything better than random?** Unknown, and that is the point. A random start carries no
   theory that can be wrong. A constructed start embeds a belief about what a good layout looks
   like, and if the belief is off it is a **worse-than-random start wearing a principled costume**,
   which is harder to detect than an obviously bad one — nobody re-examines a start that sounds
   right.

**The distinction the previous revision slid between, and which this task keeps apart.** *"One net
per strip is what the identity says costs zero cuts"* is **arithmetic**: `C = N + J − S_occ` with
`S_occ = N` and `J = 0` gives `C = 0`, and COST proves it. *"Therefore it is a good place to start
searching from"* is a **conjecture**: it says a point at the cost function's floor-by-construction
is a point the climb descends well from, and nothing in COST, MOVE or PIPELINE establishes that.
The first stays where it is proved. The second is an arm of this experiment and is written to be
shown wrong.

**The owner's standing instruction, which is why this is shaped as a measured hypothesis** (recorded
at `Q4` in CRITERIA): *"we won't figure it out completely by thinking really hard. We need a
credible hypothesis for what might work that isn't obviously dumb that we continuously refine as we
get more experience."* `Q4`'s and `Q6`'s numbers carry that discipline; so does the start.

**All three arms start invalid, so validity at the start is not a discriminator.** None of the
three is required to produce a valid layout and **no arm is rejected or penalised for failing to**:
the import arm's start is the unfinished board whose incomplete-net counts are quoted above;
the constructed arm moves parts and stretches them but routes no net; the random arm moves and
rotates parts and routes no net either. The repair burden is common to all three, it is the search's
work and not the start's, and the comparison records each start's admissibility per arm rather than
asserting a value for it.

**Interfaces:**
- *Consumes:* `BoardTargets` (Task 11); `StripboardRules` (Task 10); `TOOL_MAX_SPAN_HOLES` and `leadSpanFor` from `lib/kicad/lead-span.ts`; `BoardDump`/`parseBoardDump` from `tools/guide/dump.ts`; the binary through an injected spawn; `--import`, `--move`, `--rotate`, `--stretch`, `--author --op autofill`.
- *Provides:* `tools/stripboard/seed.ts` —
  - `SpawnVeroroute = (args: readonly string[]) => { readonly status: number; readonly stdout: string; readonly stderr: string }` — re-exported from `tools/perfboard/check.ts` if it already declares one, never a second declaration
  - `SeedArm = "constructed" | "import" | "random"`, `SEED_ARMS: readonly SeedArm[]` — the three in one place, so a loop over the arms cannot miss one
  - `parseSeedArm(text: string): SeedArm` — refuses anything else by name, listing the three; **there is no default arm**
  - `seededPrng(seed: number): () => number` — one named algorithm, its name in a comment and in the manifest. **Declared here rather than in Task 18**, because the random arm needs it first and two PRNGs would make two runs that claim one seed
  - `StripAssignment = ReadonlyMap<string, number>` — net to strip index, from the low-bandwidth ordering; the **constructed** arm's own datum
  - `assignStrips(targets: BoardTargets, seed: number): StripAssignment`
  - `junctionNets(targets: BoardTargets): readonly string[]` — the nets the `SIP5` carries, **derived from the `junction_signals` component's own pins** and never written out, so the sub-arrangement cannot drift from the model; it **refuses** when the board has no such component rather than returning an empty list, because an empty list would make the constructed arm's junction clause a no-op nobody noticed
  - `drawFrom<T>(items: readonly T[], draw: () => number): T` — `items[Math.floor(draw() · items.length)]`, refusing an empty list by name; the random arm's one point of choice, exported so the index map is testable without a board
  - `admissiblePositions(dump: BoardDump, ref: string): readonly (readonly [number, number])[]` — every in-bounds position where that part fits beside the parts already placed, enumerated in row-major order
  - `SeedInput { readonly importedBoard: string; readonly targets: BoardTargets; readonly runDir: string; readonly rules: StripboardRules; readonly arm: SeedArm; readonly seed: number }`
  - `seedCandidate(input: SeedInput, spawn: SpawnVeroroute): string` — the path of the started `.vrt` inside the run directory, for the arm named in the input
- *Provides:* `tools/stripboard/seed-compare.ts` —
  - `QualityMark { readonly cuts: number; readonly wires: number; readonly netsComplete: true; readonly source: string }` — **no default**; `source` names the document the figure comes from
  - `FROZEN_MARK: QualityMark` — the frozen fixture's mark and the only one this plan carries: `B1-frozen`'s own clause, with `source` naming it. Every other board's mark is the caller's parameter
  - `markObjective(mark: QualityMark, rules: StripboardRules): number` — `mark.cuts + rules.rhoWire · mark.wires`, derived, no new number
  - `ArmRun { readonly startAdmissible: boolean; readonly objective: number; readonly cuts: number; readonly wires: number; readonly netsComplete: boolean; readonly admissibleA1: boolean; readonly history: readonly number[]; readonly evaluations: number }`
  - `ArmRunner = (start: string, seed: number, spawn: SpawnVeroroute) => ArmRun` — injected, because `climb` and `search` do not exist at this task and a comparison harness that imported them could not be written here
  - `meetsMark(run: ArmRun, mark: QualityMark): boolean`
  - `evaluationsToCross(run: ArmRun, objective: number): number | undefined`
  - `SeedRun { readonly seed: number; readonly run: ArmRun; readonly metMark: boolean; readonly evaluationsToCross: number | undefined }`
  - `ArmResult { readonly arm: SeedArm; readonly perSeed: readonly SeedRun[]; readonly reached: number }`
  - `ArmComparison { readonly mark: QualityMark; readonly decisionVariable: "success-rate"; readonly arms: readonly ArmResult[]; readonly separated: boolean; readonly retireable: readonly SeedArm[] }`
  - `ComparisonInput { readonly importedBoard: string; readonly targets: BoardTargets; readonly runDir: string; readonly rules: StripboardRules; readonly mark: QualityMark | null }` — `mark` is `QualityMark | null` rather than optional **because `null` is a value and an absent property is an omission**: the harness refuses a `null` mark by name, and a caller writing `null` has said what it is doing, exactly as `worseAcceptance: null` does in `PAR3`'s rules file
  - `compareSeedArms(input: ComparisonInput, runner: ArmRunner, spawn: SpawnVeroroute): ArmComparison` — the seeds are `input.rules.seeds`, so the comparison's seed set is the reviewed one and no second list exists
  - `RETIREMENT: string` — the decision variable and the retirement rule, as a string constant beside the harness, in the shape Task 15's `RANKING` uses
- Task 17 consumes `seedCandidate` and `SpawnVeroroute`. Task 18 consumes `seedCandidate`, `SeedArm` and `seededPrng`, and its final step supplies the `ArmRunner` and runs the comparison.

**What changed in this contract, exactly, so Tasks 17–23 are not broken by it:**

- `SpawnVeroroute`, `StripAssignment`, `assignStrips`, `SeedInput` and `seedCandidate` **all still exist with their names and their roles**. `assignStrips` is now identified as the constructed arm's datum rather than as *the* assignment.
- `SeedInput` **gains `arm` and `seed` and loses `assignment`**. Both new fields are required with no default, so a caller that does not name an arm does not compile, and the text selector refuses rather than choosing. `assignment` went because the arm decides whether a strip assignment is computed at all, and passing one in for an arm that ignores it is a parameter that lies.
- **`seededPrng` moves from Task 18 to Task 16.** Task 18 imports it instead of declaring it; its `E3` draw test and the manifest record are unchanged. This is the `BARE_LITERAL` resolution's shape — declared where it is first needed, imported by the later task — and the reason is the same: two declarations of one algorithm is one claim in two places.
- **Task 18's `E2` restarts through `seedCandidate` with the run's arm, not through `assignStrips`.** As written it called `assignStrips` with a different seed, which would have re-constructed on every restart whatever arm the run selected — so every arm's restarts would have been the constructed arm's and the comparison would have measured only the first climb of each run. This is a correctness fix the comparison forced out.
- **Task 13's `CanonicalInputs` gains `seedArm: SeedArm`.** Two arms that hashed alike would make the two runs of a comparison indistinguishable in the record, which is the one thing the canonical hash exists to prevent. The field's home is Task 13's type; this task only names it.
- **`ClimbResult.history` is one entry per evaluation** (Task 17), so an index into it is an evaluation count. That was not stated and the comparison's third statistic reads a crossing index off it, so it is stated there now, and `evaluationsToCross` **refuses** a run whose `history.length` disagrees with its `evaluations` rather than reporting a misaligned index.

**The three arms.**

**constructed** — one net per strip in a low-bandwidth linear arrangement, each part turned across
the strips of its two nets, stretched to reach. *"Should land at or near `J = 0`."* This is the
previous revision's whole content, preserved as one arm: the arrangement, the `SIP5`
sub-arrangement below, the span refusal, and the bandwidth check across all five sections.

**One constraint on the arrangement, and it is not an obstruction.** `junction_signals` on every
Pultec board is a `SIP5` carrying all five ladder nets at 1-hole pitch. Turned across the strips it
pins those five nets to five consecutive strips in a fixed order; laid along a strip it puts five
nets on one strip and costs four cuts. **It is the only component forcing more than two nets
together, and the constructed arm treats it as a fixed sub-arrangement rather than a part to be
placed independently** (PIPELINE §5.4).

**import** — `--import`'s own placement, the ribbon: the board as the first-fit sweep left it,
copied into the run directory and painted. It costs nothing to include because it is what exists,
and it is the only arm with no code behind its placement at all. **It has exactly one start**: the
seed changes nothing about it, so its restarts repeat the same start and what varies across its
seeds is only whatever the climb itself draws. That asymmetry is recorded rather than corrected —
randomising the import arm's start would make it a second random arm wearing the ribbon's name.

**random** — every part moved to a position drawn uniformly from `admissiblePositions` and rotated
by a quarter-turn count drawn uniformly from `{0, 1, 2, 3}`, in **the dump's part order** (Task 17's
rule for a deterministic enumeration, same reason: never iteration over a hash map), from
`seededPrng(seed)`. Four quarter-turns being a full turn is arithmetic rather than a parameter, and
**a quarter turn the fork refuses stops the arm and names the part** — the fork is the authority on
a direction it will not accept and nothing here guesses the set. **This is the control and the null
hypothesis.** Two properties it must have and one thing it must not be:

- **In bounds, and the grid must not grow.** `--move --to 40,5` on a 35×35 fixture exits 0 and
  reports `GRID 41 35` — the board grew — and `--move --to -5,5` lands the part at `0,5` **and
  moves three parts never named on the command line** (the facts section; `Pan()` runs before any
  wrap). A draw outside the grid therefore renumbers every hole the next draw is about to use, so
  the arm draws only from in-bounds positions and asserts the grid is unchanged.
- **It changes no span.** The arm moves and rotates whole parts and never stretches, so every
  part's span is exactly what `--import` gave it. One fewer difference between the arms, and
  `HC5`/`HC9` see the same spans on all three.
- **It is not a retry loop.** `admissiblePositions` is enumerated and the draw is an index into it,
  so a part with nowhere to go **refuses by name** — the part, the grid and the parts already
  placed — rather than spinning or falling back to where it was.

**The decision variable, and the two statistics reported beside it.**

Per arm, per seed, the comparison reports the run's final `F`, whether the run met the mark, and
the evaluation at which its `F` first crossed the mark's objective.

**The decision variable is the success rate: how many of the seed set's seeds met the mark, over
the size of the seed set.** Why that one and not the others: the run's product is an admissible
layout at or under a target, and the owner's first question is the reason — each restart being a
fresh start, the start only buys the first climb, so the only aggregate that answers *"did starting
here make the run more likely to deliver"* is how often the run delivered. The other two are
evidence behind it rather than rivals to it. **Final `F` per seed** is the raw number the rate is
computed from and the tiebreak when no arm reaches the mark at all. **`evaluationsToCross` is a
cost figure and cannot be the decision variable**: it is undefined for a seed that never crossed,
so an arm that crossed once, early, would outrank an arm that crossed on every seed.

**The mark is `B1-frozen`'s own clause and has no default.** On the frozen fixture it is `C ≤ 5`,
`W = 0`, every net complete — the owner's achieved result, externally authored, already in
CRITERIA. For any other board the mark is a **required parameter and the harness refuses without
it**, because a quality bar this agent chose would be an acceptance criterion authored by the
producing agent, which is the governing invariant's failure. `admissibleA1` is reported beside the
mark and is not one of its clauses, because the mark is the external criterion's wording verbatim;
an arm whose mark-meeting runs are inadmissible is a finding to report, not a rate to adjust.

**The rate decides which arm the project keeps; it decides nothing about a layout.** It changes no
`outcome`, no `bound`, no exit code and no verdict, exactly as Task 23's seed-set rate does not.

**What result retires an arm**, declared before the run, in `RETIREMENT` beside the harness, so the rule cannot be adjusted after
the numbers are in:

- **constructed is retired if its rate does not exceed random's**, on the same seed set, the same
  budget and the same board. **A tie retires it**: a construction that ties a uniform draw is
  carrying a belief that buys nothing and costs a module, an ordering, a sub-arrangement rule and
  their tests. Retiring it means **deleting** `assignStrips`, the `SIP5` sub-arrangement, the
  constructed branch of `seedCandidate` and their tests in the same change — supersede means
  delete — and recording in `docs/stripboard/pipeline-verification.md` that the construction was a
  story. *"One net per strip costs zero cuts"* stays where it is proved, in COST, and stops being
  a claim about where to start.
- **import is retired on the same test**: its rate not exceeding random's. It is free to carry, so
  its only cost is a row in the table, and retiring it as an **arm** does not touch `B1-frozen`'s
  *"starting from the import-placed board"* clause — all three arms begin from `--import`'s output
  and differ only in what they do to it before the first climb.
- **random cannot be retired by this experiment.** It is the control and it is kept whatever the
  result, because every later comparison needs a null to be measured against.
- **If no arm meets the mark on any seed, nothing is retired** and the comparison says so: a run
  in which every arm scored zero measured the budget, not the arms.

**The plan picks no winner, and the structure is what makes that true rather than a promise.**
There is no default arm: `SeedInput.arm` is required, `parseSeedArm("")` refuses, and `ArmComparison`
has no field naming a chosen arm. `retireable` is a report computed by the declared rule and
**nothing in the pipeline reads it** — the deletion is a reviewed edit by the owner or by a later
reviewed change, carrying the run that justified it. An agent choosing the arm that flatters its
own construction is this plan's governing invariant failing in the one place nobody would look.

**Two ways the constructed arm could be wrong, and the run record distinguishes them.** **Too
clever**: one net per strip is a point at the cost floor that the single-part climb cannot move off
— every neighbour raises `F`, so the climb stalls immediately and spends its budget confirming the
start. Visible as a constructed arm whose `acceptedPerRound` is near zero in its first round while
random's is not. **Too fragile**: the arrangement is good for the board it was computed for and the
stretch reaches fail, so most of its runs refuse before a climb begins. Visible as span refusals
concentrated in one arm. Both are read off what `search` already records.

**The injected-spawn posture is not optional.** `tools/perfboard/check.ts` injects its spawn for
tests and **throws** when `VEROROUTE` is unset rather than guessing a path — *"a hardcoded
`$HOME/src/...` is right on exactly one machine and wrong everywhere else… a spawn that quietly
fails is the shape that reads as a clean board."* Every test below injects.

**It is one task, and its last step is Task 18's.** The arms, the selector, the harness, the mark, the decision variable and the retirement rule are
one task's work and are all here. **The measured run is a step of Task 18**, because the comparison
needs a runner and `climb` is Task 17's while restarts are Task 18's — and the owner's first
question is precisely that restarts are what decides whether the start matters, so a comparison run
before `E2` exists would answer a question nobody asked. That is why `ArmRunner` is a parameter and
not an import. **The deliverable of this task is therefore the comparison and its recorded result,
with the result produced at Task 18's final step** and recorded in
`docs/stripboard/pipeline-verification.md`. It is not a chosen seed strategy, and no step below
selects one.

- [ ] **Step 1: Write the failing tests for the arms** (`tests/stripboard/seed.test.ts`):

```ts
test("SEED_ARMS names three arms and the text selector refuses anything else, empty included", () => {
  // There is no default arm, and the half of that claim a body can establish
  // is the selector's: it refuses rather than choosing. The other half is the
  // type - SeedInput.arm is required - and the type checker is what proves it.
  expect([...SEED_ARMS].sort()).toEqual(["constructed", "import", "random"])
  expect(() => parseSeedArm("")).toThrow(/constructed, import, random/)
  expect(() => parseSeedArm("best")).toThrow(/best/)
})

test("every arm returns a candidate inside the run directory and writes nowhere else", () => {
  expect(SEED_ARMS.length, "a loop over an empty arm list proves nothing").toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    const path = seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    expect(path.startsWith(input().runDir), arm).toBe(true)
    expect(spawned.length, `${arm} spawned nothing`).toBeGreaterThan(0)
    for (const args of spawned) {
      const output = args[args.indexOf("-o") + 1]
      if (output !== undefined) expect(output.startsWith(input().runDir), arm).toBe(true)
    }
  }
})

test("every arm passes -o on every placing gesture and never writes in place", () => {
  // The fork's own rule, which every verb meets: never write to a path it
  // derived itself; -o required, no in-place default.
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    for (const args of spawned.filter((a) => a[0] !== "--dump-board" && a[0] !== "--check")) {
      expect(args, `${arm}: ${args.join(" ")}`).toContain("-o")
    }
  }
})

test("every arm autofills last, because an unpainted board reports CUT_STATE UNRESOLVED", () => {
  // AutoFillVero runs on --update and on --author --op autofill and NOT on
  // --import --strips or --set-strips, and HC2 refuses an unresolved cut state
  // rather than mis-scoring it. So the paint comes after the last gesture that
  // moves anything, on all three arms including the one that moves nothing.
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    const lines = spawned.map((args) => args.join(" "))
    const autofill = lines.findIndex((line) => line.includes("--op autofill"))
    expect(autofill, `${arm} never autofilled`).toBeGreaterThanOrEqual(0)
    expect(autofill, `${arm} autofilled before its last gesture`).toBe(lines.length - 1)
  }
})

test("a spawn that fails stops every arm and names the gesture", () => {
  const failing = (args: readonly string[]) =>
    ({ status: 1, stdout: "", stderr: `refused: ${args[0]}` })
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    expect(() => seedCandidate({ ...input(), arm }, failing), arm).toThrow(/refused/)
  }
})

test("the import arm is one start for every seed; the other two arms are not", () => {
  const gestures = (arm: SeedArm, seed: number) => {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm, seed }, recordingSpawn(spawned, DUMPS))
    return spawned.map((args) => args.join(" "))
  }
  expect(gestures("import", 0)).toEqual(gestures("import", 1))
  expect(gestures("constructed", 0)).not.toEqual(gestures("constructed", 1))
  expect(gestures("random", 0)).not.toEqual(gestures("random", 1))
  for (const arm of SEED_ARMS) expect(gestures(arm, 3), arm).toEqual(gestures(arm, 3))
})

test("seededPrng is one algorithm, reproducible from its seed and different across seeds", () => {
  const sequence = (seed: number) => Array.from({ length: 5 }, seededPrng(seed))
  expect(sequence(7)).toEqual(sequence(7))
  expect(sequence(7)).not.toEqual(sequence(8))
  for (const value of sequence(7)) {
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  }
})

test("the constructed arm puts one net on each strip, in the ordering's order", () => {
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  const assignment = assignStrips(targets, 0)
  expect(assignment.size).toBe(targets.netCount)
  expect(new Set(assignment.values()).size).toBe(targets.netCount)
  expect([...assignment.entries()].sort((a, b) => a[1] - b[1]).map(([net]) => net))
    .toEqual([...targets.ordering])
})

test("a different seed gives the constructed arm a different ordering, deterministically", () => {
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  expect(assignStrips(targets, 1)).not.toEqual(assignStrips(targets, 0))
  expect(assignStrips(targets, 1)).toEqual(assignStrips(targets, 1))
})

test("the junction's five nets land on five consecutive strips, in one fixed order", () => {
  // The SIP5 at 1-hole pitch is the only component forcing more than two nets
  // together, so the constructed arm places it as a sub-arrangement and builds
  // the ordering around it rather than against it.
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  const assignment = assignStrips(targets, 0)
  const nets = junctionNets(targets)
  expect(nets.length, "a junction with no nets would make the clause below vacuous").toBe(5)
  const strips = nets.map((net) => assignment.get(net))
  expect(strips.every((strip) => strip !== undefined)).toBe(true)
  const sorted = [...strips as number[]].sort((a, b) => a - b)
  expect(sorted[sorted.length - 1]! - sorted[0]!).toBe(sorted.length - 1)
})

test("the constructed ordering's bandwidth is inside the tool's span ceiling, on all five", () => {
  // COST 6.4 measured every board's RCM bandwidth inside the ceiling with
  // margin, so clustering is geometrically feasible and the tool's span limit
  // is not the obstruction. A seeded ordering that left it is a bug in the
  // ordering, not a fact about the circuit.
  for (const section of ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"]) {
    const targets = deriveTargets(physicalBoard(section), 34, `pultec-${section}`)
    expect(targets.orderingBandwidth, section).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
  }
})

test("a span the construction needs and the part cannot reach refuses, naming both", () => {
  // The start proposes and the grader grades, but a construction that KNOWS it
  // is asking for an unreachable span says so where the remedy is - the span
  // data - rather than emitting a candidate for HC5 to reject anonymously.
  expect(() => seedCandidate(reachingInput("constructed"), fakeSpawn())).toThrow(/maxSpanHoles/)
  expect(() => seedCandidate(reachingInput("constructed"), fakeSpawn())).toThrow(/pultec-/)
})

test("the random arm draws inside the grid, and the grid does not grow", () => {
  // Pan() runs before any wrap: --move --to 40,5 on a 35x35 fixture reports
  // GRID 41 35, and --move --to -5,5 moves three parts nobody named. Either
  // renumbers every hole the next draw is about to use.
  const spawned: string[][] = []
  const start = seedCandidate({ ...input(), arm: "random" }, recordingSpawn(spawned, DUMPS))
  const before = parseBoardDump(DUMPS.imported)
  const after = parseBoardDump(dumpOf(start))
  expect(after.grid).toEqual(before.grid)
  for (const args of spawned.filter((a) => a[0] === "--move")) {
    const [row, col] = args[args.indexOf("--to") + 1]!.split(",").map(Number)
    expect(row!, args.join(" ")).toBeGreaterThanOrEqual(0)
    expect(col!, args.join(" ")).toBeGreaterThanOrEqual(0)
    expect(row!, args.join(" ")).toBeLessThan(before.grid.rows)
    expect(col!, args.join(" ")).toBeLessThan(before.grid.cols)
  }
})

test("the random arm stretches nothing, so every span is the one --import gave it", () => {
  const spawned: string[][] = []
  seedCandidate({ ...input(), arm: "random" }, recordingSpawn(spawned, DUMPS))
  expect(spawned.some((args) => args[0] === "--move")).toBe(true)
  expect(spawned.filter((args) => args[0] === "--stretch")).toEqual([])
})

test("the draw indexes the enumerated admissible set, and reaches its ends and its middle", () => {
  // WHAT THIS PROVES is the index map: a draw of 0 takes the first admissible
  // position, one just under 1 takes the last, and a half takes the middle, so
  // no admissible position is unreachable and none outside the set is reached.
  // WHAT IT DOES NOT PROVE is that the STREAM is uniform - that is seededPrng,
  // one named algorithm, tested above for reproducibility and range only.
  const positions = admissiblePositions(parseBoardDump(DUMPS.imported), "R1")
  expect(positions.length, "a one-position set would make every draw equal").toBeGreaterThan(2)
  expect(drawFrom(positions, () => 0)).toEqual(positions[0])
  expect(drawFrom(positions, () => 0.999999)).toEqual(positions[positions.length - 1])
  expect(drawFrom(positions, () => 0.5)).toEqual(positions[Math.floor(positions.length / 2)])
})

test("a part with no admissible position refuses by name, and writes nothing", () => {
  expect(() => seedCandidate({ ...crowdedInput(), arm: "random" }, recordingSpawn([], DUMPS)))
    .toThrow(/R1/)
  expect(() => seedCandidate({ ...crowdedInput(), arm: "random" }, recordingSpawn([], DUMPS)))
    .toThrow(/admissible/)
})
```

  `recordingSpawn(spawned, DUMPS)` records every argument list and answers `--dump-board` from
  `DUMPS`, a record of hand-written dump text keyed by the gesture that produced it; a
  `--dump-board` it has no text for **throws** rather than returning an empty board, because a
  scripted spawn that answers everything makes every test above a test of nothing.
  `crowdedInput()` is an input whose dump leaves `R1` no position that fits.

- [ ] **Step 2: Write the failing tests for the comparison** (`tests/stripboard/seed-compare.test.ts`):

```ts
test("every arm is run against the same seeds, by the one runner the harness is given", () => {
  // The same budget is structural rather than asserted: one runner serves
  // every arm, so there is no second place for a budget to differ. What a body
  // can establish is the seed set and the arm set, and both are asserted.
  const calls: { arm: SeedArm; seed: number; start: string }[] = []
  const comparison = compareSeedArms(comparisonInput(), recordingRunner(calls, SCRIPT), fakeSpawn())
  expect(comparison.arms.map((arm) => arm.arm).sort()).toEqual([...SEED_ARMS].sort())
  for (const arm of SEED_ARMS) {
    expect(calls.filter((call) => call.arm === arm).map((call) => call.seed), arm)
      .toEqual([...comparisonInput().rules.seeds])
  }
  expect(new Set(calls.map((call) => call.start)).size, "each arm starts its own candidate")
    .toBeGreaterThan(1)
})

test("no arm is dropped for starting invalid, and each start's admissibility is recorded", () => {
  // All three starts are expected to be inadmissible: --check reports 19, 13,
  // 7 and 6 incomplete nets on the four import-placed layouts, and neither the
  // construction nor the draw routes a net. An arm filtered out for an invalid
  // start would be every arm, so the repair burden is the search's and common.
  const comparison =
    compareSeedArms(comparisonInput(), scriptedRunner(EVERY_START_INVALID), fakeSpawn())
  expect(comparison.arms.length).toBe(3)
  for (const arm of comparison.arms) {
    expect(arm.perSeed.length, arm.arm).toBe(comparisonInput().rules.seeds.length)
    expect(arm.perSeed.every((seed) => seed.run.startAdmissible === false), arm.arm).toBe(true)
  }
})

test("the decision variable is the success rate, counted over the seed set", () => {
  const comparison =
    compareSeedArms(comparisonInput(), scriptedRunner(ONE_CONSTRUCTED_SEED_MEETS), fakeSpawn())
  expect(comparison.decisionVariable).toBe("success-rate")
  const constructed = comparison.arms.find((arm) => arm.arm === "constructed")!
  expect(constructed.reached).toBe(1)
  expect(constructed.perSeed.filter((seed) => seed.metMark).length).toBe(1)
  expect(constructed.perSeed.length).toBe(comparisonInput().rules.seeds.length)
})

test("the mark has no default: without one the harness refuses and says it is not defaulted", () => {
  // An agent may never author the acceptance criteria for the artifact it is
  // producing, and a quality bar chosen here would be exactly that. The frozen
  // fixture's mark is B1-frozen's own clause; any other board's is a parameter.
  const noMark = { ...comparisonInput(), mark: null }
  expect(() => compareSeedArms(noMark, scriptedRunner(SCRIPT), fakeSpawn())).toThrow(/mark/)
  expect(() => compareSeedArms(noMark, scriptedRunner(SCRIPT), fakeSpawn()))
    .toThrow(/not defaulted/)
  expect(FROZEN_MARK.source).toMatch(/B1-frozen/)
})

test("a run meets the mark only on all of its clauses, never on F alone", () => {
  // F <= 5 is reachable with wires: C = 4 with four bridges scores 5 at
  // rhoWire = 0.25, and B1-frozen requires W = 0 with every net complete. So
  // the mark reads its clauses and markObjective is only the crossing figure.
  expect(meetsMark(armRun({ cuts: 4, wires: 4, netsComplete: true }), FROZEN_MARK)).toBe(false)
  expect(meetsMark(armRun({ cuts: 5, wires: 0, netsComplete: true }), FROZEN_MARK)).toBe(true)
  expect(meetsMark(armRun({ cuts: 4, wires: 0, netsComplete: false }), FROZEN_MARK)).toBe(false)
  expect(markObjective(FROZEN_MARK, loadRules())).toBe(FROZEN_MARK.cuts)
})

test("evaluationsToCross is an F crossing, undefined when it never crossed, refusing a misaligned history", () => {
  // NAMED AS A CROSSING rather than as "evaluations to reach the mark": an F
  // at or below the mark's objective is necessary for the mark and not
  // sufficient, because the wire and completeness clauses are read off the
  // candidate and not off F. It is the cost figure; the rate is the decision.
  expect(evaluationsToCross(armRun({ history: [9, 8, 5, 4], evaluations: 4 }), 5)).toBe(2)
  expect(evaluationsToCross(armRun({ history: [9, 8, 7], evaluations: 3 }), 5)).toBeUndefined()
  expect(() => evaluationsToCross(armRun({ history: [9, 8], evaluations: 7 }), 5))
    .toThrow(/history/)
})

test("RETIREMENT names all three arms with prose for each, names the control and the decision variable", () => {
  // Task 15's RANKING pattern, and its limit carried with it: that each arm is
  // named and followed by prose is assertable; that the prose is a REASON is
  // the owner's judgement at review, and no test establishes it.
  expect(RETIREMENT).toMatch(/success rate/)
  expect(RETIREMENT).toMatch(/control/)
  for (const arm of SEED_ARMS) {
    const at = RETIREMENT.indexOf(arm)
    expect(at, `${arm} is not named in RETIREMENT`).toBeGreaterThanOrEqual(0)
    const later = SEED_ARMS
      .map((other) => RETIREMENT.indexOf(other, at + arm.length))
      .filter((index) => index > at)
    const prose = RETIREMENT.slice(at + arm.length, Math.min(...later, RETIREMENT.length))
    expect(prose.trim().length, `${arm} is named with no prose after it`).toBeGreaterThan(40)
  }
})

test("constructed not beating random marks it retireable, and a tie counts as not beating", () => {
  const lost = compareSeedArms(comparisonInput(), scriptedRunner(RANDOM_WINS), fakeSpawn())
  expect(lost.retireable).toContain("constructed")
  const tied = compareSeedArms(comparisonInput(), scriptedRunner(CONSTRUCTED_TIES_RANDOM), fakeSpawn())
  expect(tied.retireable, "a construction that ties a uniform draw buys nothing")
    .toContain("constructed")
})

test("the import arm gets the same test, and the control is never retireable", () => {
  const lost = compareSeedArms(comparisonInput(), scriptedRunner(RANDOM_WINS), fakeSpawn())
  expect(lost.retireable).toContain("import")
  expect(lost.retireable).not.toContain("random")
})

test("constructed beating random marks nothing retireable, and still selects no arm", () => {
  const won = compareSeedArms(comparisonInput(), scriptedRunner(CONSTRUCTED_WINS), fakeSpawn())
  expect(won.retireable).toEqual([])
  expect(Object.keys(won).sort())
    .toEqual(["arms", "decisionVariable", "mark", "retireable", "separated"])
  // A winning arm does not install itself: there is still no default.
  expect(() => parseSeedArm("")).toThrow(/constructed, import, random/)
})

test("no arm meeting the mark retires nothing, because that run measured the budget", () => {
  const flat = compareSeedArms(comparisonInput(), scriptedRunner(NOBODY_REACHES), fakeSpawn())
  expect(flat.arms.every((arm) => arm.reached === 0)).toBe(true)
  expect(flat.retireable).toEqual([])
  expect(flat.separated).toBe(false)
})

test("a runner that throws fails the comparison rather than scoring that arm zero", () => {
  // A scored zero is indistinguishable from an arm that ran and lost, which is
  // the one confusion this comparison cannot afford.
  const thrower: ArmRunner = () => { throw new Error("spawn exhausted") }
  expect(() => compareSeedArms(comparisonInput(), thrower, fakeSpawn())).toThrow(/exhausted/)
})
```

  `scriptedRunner(SCRIPT)` returns a runner whose `ArmRun` per arm and seed comes from a literal
  table, so every rate above is a property of the harness rather than of a search. Each table is
  named for what it encodes (`RANDOM_WINS`, `CONSTRUCTED_TIES_RANDOM`, `NOBODY_REACHES`,
  `EVERY_START_INVALID`) and **must cover every arm and every seed** — a table missing a row
  throws, because a runner that answered a missing row with a default would decide the rates.
  `armRun(partial)` fills a complete `ArmRun` from a partial one and **throws for a field it
  cannot derive**, so a test cannot silently assert over an invented history.

- [ ] **Step 3: Run both files, confirm they fail.**

- [ ] **Step 4: Implement.** `seedCandidate` dispatches on `input.arm` into three private functions
  and shares the gesture driver — one gesture at a time, every result checked, `-o` always, the
  autofill last — so the three arms differ in what they place and in nothing else. The constructed
  arm computes `assignStrips`, places the `SIP5` sub-arrangement first and turns each remaining part
  across the strips of its two nets, stretching to reach and refusing when the reach is not there.
  The import arm copies the imported board into the run directory and paints it. The random arm
  enumerates `admissiblePositions` per part in the dump's part order, draws an index and a
  quarter-turn count from `seededPrng(input.seed)`, drives `--move` and `--rotate`, and refuses by
  name for a part with nowhere to go. `compareSeedArms` calls `seedCandidate` once per arm per seed
  in `rules.seeds`, hands each start to the one runner it was given, computes `metMark`,
  `evaluationsToCross`, `reached`, `separated` and `retireable` by the declared rule, and returns
  them. `RETIREMENT` carries the decision variable, the rule and the reason for each arm's
  treatment.

- [ ] **Step 5: Prove the tests can fail**, and each break names the test it must break:

  1. Have `seedCandidate` ignore `input.arm` and always construct — the one-start test fails on the
     import arm and the stretches-nothing test fails on the random arm.
  2. Default `mark` to the frozen figure when it is absent — the no-default test fails.
  3. Have `meetsMark` compare `objective` with `mark.cuts` only — the all-clauses test fails on
     `cuts: 4, wires: 4`.
  4. Make the retirement rule `>=` rather than `>` for constructed against random — the tie test
     fails. **Run this one first**: it is the mutation under which a construction that bought
     nothing would have survived its own experiment.
  5. Draw the random arm's index from `Math.random()` — the reproducible-from-seed test fails, and
     so does Task 18's closure scan for `Math.random`, which is the second reading of the same
     property.
  6. Drop `-o` from the import arm's autofill — the writes-nowhere-else test fails for that arm
     only, which is why that test loops over `SEED_ARMS` instead of testing one.
  7. Let the random arm draw one position past the last row — the grid-does-not-grow test fails.
  8. Have `assignStrips` return the nets in `Object.keys` order rather than the ordering's — the
     bandwidth test must fail on at least one board; **if it does not, the ordering is doing nothing
     and that is the finding**, recorded in `docs/stripboard/pipeline-verification.md` rather than
     worked around.

  **Every test's name was read beside its body before this task was written.** Three carry a
  guarantee weaker than the property they are about and say so in their own comments: the
  no-default-arm test proves the selector's half and not the type's; the draw test proves the index
  map and not the stream's uniformity; `evaluationsToCross` is named a crossing because an `F` at
  the mark's objective is necessary for the mark and not sufficient. The previous revision found
  eleven tests whose names claimed more than their bodies proved, one of them a literal placeholder
  that could not fail — so each loop above asserts its own collection is non-empty, each scripted
  table refuses a missing row, and no test here scans text for a structural claim.

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("Three starting arms behind one selector, with random as the control and no default"), push.

---

### Task 17: P2 — the single-part climb

**Files:** create `tools/stripboard/moves.ts` and `tools/stripboard/climb.ts`; test `tests/stripboard/moves.test.ts`, `tests/stripboard/climb.test.ts`.

**Interfaces:**
- *Consumes:* `seedCandidate` (16), `scoreDump` (12), `gradeHardConstraints`/`a1` (14), `compareRanking`/`rankingTuple` (15), `runDirectory` (13), `StripboardRules` (10), the injected `SpawnVeroroute` (16).
- *Provides:*
  - `Move = { readonly kind: "move"; readonly ref: string; readonly to: readonly [number, number] } | { readonly kind: "rotate"; readonly ref: string; readonly direction: "cw" | "ccw" } | { readonly kind: "stretch"; readonly ref: string; readonly direction: "grow" | "shrink" } | { readonly kind: "add-wire"; readonly at: readonly [number, number]; readonly ends: readonly [readonly [number, number], readonly [number, number]] } | { readonly kind: "delete-wire"; readonly name: string } | { readonly kind: "cluster"; readonly net: string; readonly delta: readonly [number, number] }`
  - `enumerateMoves(dump: BoardDump, reference: ReferenceNets): readonly Move[]` — deterministic order, from the netlist's net order and the dump's part order, **never from iteration over a hash map**
  - `applyMove(board: string, move: Move, out: string, spawn: SpawnVeroroute): void`
  - `Evaluation { readonly candidate: string; readonly score: Score; readonly results: readonly ConstraintResult[]; readonly ranking: readonly number[]; readonly admissibleA1: boolean }`
  - `evaluate(board: string, input: EvaluateInput, spawn: SpawnVeroroute): Evaluation`
  - `ClimbResult { readonly best: Evaluation; readonly rounds: number; readonly evaluations: number; readonly acceptedPerRound: readonly number[]; readonly history: readonly number[] }` — **`history` has one entry per evaluation, so an index into it is an evaluation count.** Task 16's `evaluationsToCross` reads a crossing index off it and **refuses** a run whose `history.length` disagrees with its `evaluations`, rather than reporting an index that means nothing; a history per accepted move would have made that figure silently wrong
  - `climb(start: string, input: ClimbInput, spawn: SpawnVeroroute): ClimbResult`
- Task 18 extends the move set and wraps `climb` with restarts; Task 19 consumes `ClimbResult`'s counters; Task 20 consumes `Evaluation`.

**Acceptance, exactly:** `ΔF < 0`; or `ΔF = 0` with a strictly better ranking tuple; or, when a bound is configured, E3's bounded worse-acceptance (Task 18). **Reject on any hard-constraint failure.** The evaluation is four invocations — apply, autofill, check, dump — which is why a candidate evaluation is order 10¹ per second at 11.71 ms per invocation and why Task 9 buys breadth.

- [ ] **Step 1: Write the failing tests. The first one is the property the whole ranking design rests on:**

```ts
test("a ranking term cannot make the climb accept a worse F", () => {
  // OBJ3. The candidate below has a strictly better ranking tuple and a worse
  // F; it must be rejected. If this test ever passes while F rose, the search
  // is optimising something nobody authorised.
  const worseF = { ...baseEvaluation, score: { ...baseScore, objective: baseScore.objective + 1 },
                   ranking: [0, 0, 0, 0, 0] }
  expect(accepts(baseEvaluation, worseF, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a strictly better F is accepted", () => {
  const better = { ...baseEvaluation,
                   score: { ...baseScore, objective: baseScore.objective - 1 } }
  expect(accepts(baseEvaluation, better, rulesWithoutWorseAcceptance())).toBe(true)
})

test("an equal F with a strictly better ranking is accepted, and an equal tuple is not", () => {
  const plateauBetter = { ...baseEvaluation, ranking: betterTuple }
  const plateauSame = { ...baseEvaluation }
  expect(accepts(baseEvaluation, plateauBetter, rulesWithoutWorseAcceptance())).toBe(true)
  expect(accepts(baseEvaluation, plateauSame, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a candidate failing any hard constraint is rejected whatever its F", () => {
  const cheapAndBroken = { ...baseEvaluation, admissibleA1: false,
    score: { ...baseScore, objective: 0 },
    results: baseEvaluation.results.map((r) => r.id === "HC1" ? { ...r, held: false } : r) }
  expect(accepts(baseEvaluation, cheapAndBroken, rulesWithoutWorseAcceptance())).toBe(false)
})

test("the move enumeration is deterministic and does not iterate a hash map", () => {
  const first = enumerateMoves(DUMP, REFERENCE).map(describeMove)
  const second = enumerateMoves(DUMP, REFERENCE).map(describeMove)
  expect(first).toEqual(second)
  // The nets arrive in the netlist's order, so reordering the reference map
  // reorders the cluster moves - which is what makes the order explicit
  // rather than incidental.
  const reversed = new Map([...REFERENCE.entries()].reverse())
  const clusters = (nets: ReferenceNets) =>
    enumerateMoves(DUMP, nets).filter((m) => m.kind === "cluster").map((m) => m.net)
  expect(clusters(reversed)).toEqual([...clusters(REFERENCE)].reverse())
})

test("every move kind the spec names is enumerated, and no sixth kind appears", () => {
  const kinds = new Set(enumerateMoves(DUMP, REFERENCE).map((move) => move.kind))
  expect([...kinds].sort())
    .toEqual(["add-wire", "cluster", "delete-wire", "move", "rotate", "stretch"])
})

test("a round is a full sweep of the move set, and the accepted count is per round", () => {
  const result = climb(seeded, input(), scriptedSpawn(IMPROVES_THEN_STALLS))
  expect(result.acceptedPerRound[result.acceptedPerRound.length - 1]).toBe(0)
  expect(result.evaluations).toBeGreaterThanOrEqual(enumerateMoves(DUMP, REFERENCE).length)
})

test("the climb evaluates on a scratch copy and leaves the start board untouched", () => {
  const before = readFileSync(seeded)
  climb(seeded, input(), scriptedSpawn(IMPROVES_THEN_STALLS))
  expect(readFileSync(seeded)).toEqual(before)
})

test("the batch verb is optional: the same climb runs identically without it", () => {
  // Task 9 buys breadth, not correctness. A climb that cannot run without it
  // would have made an enabler into a prerequisite.
  const withBatch = climb(seeded, { ...input(), batch: true }, scriptedSpawn(SCRIPT))
  const without = climb(seeded, { ...input(), batch: false }, scriptedSpawn(SCRIPT))
  expect(without.best.score).toEqual(withBatch.best.score)
})

test("each evaluation runs autofill before scoring, because an unpainted board has no cut list", () => {
  const spawned: string[][] = []
  climb(seeded, input(), recordingSpawn(spawned, SCRIPT))
  const order = spawned.map((args) => args.join(" "))
  const autofill = order.findIndex((line) => line.includes("--op autofill"))
  const dump = order.findIndex((line) => line.includes("--dump-board"))
  expect(autofill).toBeGreaterThanOrEqual(0)
  expect(autofill).toBeLessThan(dump)
})
```

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement.** `accepts` is exported so the acceptance rule is testable without a spawn; `climb` sweeps `enumerateMoves`, evaluates each on a scratch copy inside the run directory, keeps the best, counts accepted moves per round, and records the `F` history. The `cluster` kind is enumerated here and implemented in Task 18 — until then `applyMove` throws for it, naming Task 18, which is a refusal rather than a silent skip.

- [ ] **Step 4: Prove the tests can fail.** Three breaks: accept on `ΔF <= 0` (the plateau-same test fails); accept on a better ranking regardless of `F` (the first test fails — **run this one first**, it is the one that would quietly turn `A_occ` into an objective); skip the hard-constraint check when `F` improves (the cheap-and-broken test fails).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Climb on F, accept a plateau only on a strictly better ranking, reject on any hard constraint"), push.

---

### Task 18: E1, E2, E3 — the escapes

**Files:** modify `tools/stripboard/moves.ts` (the cluster move's implementation) and `tools/stripboard/climb.ts` (restarts and worse-acceptance); test `tests/stripboard/escapes.test.ts`.

**Interfaces:**
- *Consumes:* Task 17's `Move`, `applyMove`, `climb`, `accepts`, `evaluate`; `StripboardRules.seeds` and `.worseAcceptance` (Task 10); `seedCandidate`, `SeedArm`, `seededPrng`, `compareSeedArms`, `ArmRunner` and `FROZEN_MARK` (Task 16).
- *Provides:*
  - `applyMove` handling `{ kind: "cluster" }` — *every on-board part with a pin on net X* moved by one delta, or rotated together
  - `RunResult { readonly best: Evaluation; readonly climbs: readonly ClimbResult[]; readonly restartBoundaries: readonly number[]; readonly worseAcceptanceRan: boolean }`
  - `search(input: SearchInput, spawn: SpawnVeroroute): RunResult` — **`SearchInput` carries the run's `SeedArm`, and `E2` produces each restart's start by calling `seedCandidate` with that arm and the restart's seed.** An earlier draft had `E2` call `assignStrips` directly, which would have re-constructed on every restart whatever arm the run selected — so every arm's restarts would have been the constructed arm's and Task 16's comparison would have measured only the first climb of each run
  - `seededPrng` is **imported from Task 16**, not declared here: the random arm needs it first, and two declarations of one algorithm are one claim in two places. Its name is still recorded in the manifest
- Task 19 consumes `RunResult`'s per-climb counters; Task 20 reports `worseAcceptanceRan`; Task 21 compares `restartBoundaries`.

**Why an escape is required rather than optional, from the identity rather than from search folklore.** `C = (N − S_occ) + J`, and `J` counts a net's extra segments, so **a net's `J` contribution falls only when its last stray pin joins the rest**: moving one of a net's three scattered parts one hole typically changes `J` by zero and may raise it, while moving all three together to one strip removes a whole cut. *"A strictly improving single-part climb is not merely at risk of being trapped on this problem; the dominant lever is structurally invisible to it."*

- [ ] **Step 1: Write the failing test:**

```ts
test("E1 moves every on-board part with a pin on the net, enumerated over nets not parts", () => {
  const spawned: string[][] = []
  applyMove(board, { kind: "cluster", net: "mid", delta: [1, 0] }, out, recordingSpawn(spawned))
  const moved = spawned.filter((args) => args[0] === "--move")
    .map((args) => args[args.indexOf("--ref") + 1])
  expect([...moved].sort()).toEqual(PARTS_WITH_A_PIN_ON_MID)
})

test("E1 is the move that makes the dominant lever reachable in one step", () => {
  // The property, not the mechanism: a net whose three parts sit on three
  // strips has a cluster move that lowers J by two, and no single-part move
  // that lowers it at all.
  const single = enumerateMoves(SCATTERED, REFERENCE).filter((m) => m.kind === "move")
  expect(single.every((move) => joinsAfter(move) >= joinsBefore())).toBe(true)
  const cluster = { kind: "cluster", net: "mid", delta: deltaOntoOneStrip } as const
  expect(joinsAfter(cluster)).toBeLessThan(joinsBefore())
})

test("E1 refuses a cluster whose parts cannot all land, and writes nothing", () => {
  expect(() => applyMove(crowded, { kind: "cluster", net: "mid", delta: [1, 0] }, out, spawn))
    .toThrow()
  expect(existsSync(out)).toBe(false)
})

test("E2 keeps the best candidate across every climb and records the boundaries", () => {
  const result = search(input(), scriptedSpawn(SECOND_SEED_WINS))
  expect(result.climbs.length).toBe(loadRules().seeds.length)
  expect(result.restartBoundaries.length).toBe(loadRules().seeds.length - 1)
  expect(result.best.score.objective)
    .toBe(Math.min(...result.climbs.map((climb) => climb.best.score.objective)))
})

test("E2's restart schedule is a function of the seed list alone", () => {
  // Never of elapsed time or remaining wall clock, which V6 depends on.
  const first = search(input(), scriptedSpawn(SCRIPT))
  const second = search(input(), scriptedSpawn(SCRIPT))
  expect(second.restartBoundaries).toEqual(first.restartBoundaries)
})

test("every restart starts from the run's OWN arm, one start per seed", () => {
  // Otherwise every arm's restarts are the constructed arm's and Task 16's
  // comparison measures only the first climb of each run. Read off the spawn
  // record rather than through an injected seeder, so `search` keeps its two
  // parameters: a start sequence is the gestures up to and including the
  // `--op autofill` that ends it, and the constructed arm is the only one of
  // the three that stretches.
  const random: string[][] = []
  search({ ...input(), arm: "random" }, recordingSpawn(random, SCRIPT))
  expect(startSequences(random).length).toBe(loadRules().seeds.length)
  expect(startSequences(random).flat().filter((args) => args[0] === "--stretch")).toEqual([])
  const constructed: string[][] = []
  search({ ...input(), arm: "constructed" }, recordingSpawn(constructed, SCRIPT))
  expect(startSequences(constructed).length).toBe(loadRules().seeds.length)
  expect(startSequences(constructed).flat().some((args) => args[0] === "--stretch")).toBe(true)
})

test("E3 does not run when no bound is configured, and the run says so", () => {
  // PAR3: the bound has no default. Unconfigured means the mechanism does not
  // run, STATED IN THE REPORT, never quietly approximated.
  const result = search({ ...input(), rules: { ...loadRules(), worseAcceptance: null } }, spawn)
  expect(result.worseAcceptanceRan).toBe(false)
})

test("E3 accepts a worse candidate only within the configured bound", () => {
  const rules = { ...loadRules(), worseAcceptance: 2 }
  expect(accepts(base, worseBy(1), rules, seededPrng(0))).toBe(true)
  expect(accepts(base, worseBy(3), rules, seededPrng(0))).toBe(false)
})

test("E3's draws come from the recorded seeded PRNG, never the platform default", () => {
  const sequence = (seed: number) => Array.from({ length: 5 }, seededPrng(seed))
  expect(sequence(7)).toEqual(sequence(7))
  expect(sequence(7)).not.toEqual(sequence(8))
})

test("Q3 does not stop the run on its first firing, or E2 would be unreachable", () => {
  // A round with no accepted move ends THAT climb; the rule fires only when
  // the seed list is spent. Without this the run halts at the first local
  // optimum, which is the condition E2 exists to leave.
  const result = search(input(), scriptedSpawn(STALLS_IMMEDIATELY_EVERY_SEED))
  expect(result.climbs.length).toBe(loadRules().seeds.length)
})

test("no file in the search's TRANSITIVE closure names a clock, a pid, a listing or Math.random", async () => {
  // THE TEST THIS REPLACES scanned two files under the name "nothing in the
  // search consults a clock" - and the search reaches a dozen modules, any of
  // which could consult one. The closure is walked and every file in it is
  // scanned, which is as strong as this claim can be made statically.
  //
  // WHAT IT STILL DOES NOT PROVE, written down rather than left implied: a
  // scan cannot see an aliased access (`const now = Date["now"]`), a clock
  // reached through a node builtin the walker skips by name, or a nondeterminism
  // that is not one of these five identifiers. The GUARANTEE for determinism is
  // Task 21's comparison of two runs; this test is the cheap early warning that
  // names the file, and Task 21's step 2 exists because this one is not enough.
  const forbidden = ["Date.now", "performance.now", "process.pid", "readdirSync", "Math.random"]
  const closure = new Set<string>()
  for (const entry of ["tools/stripboard/climb.ts", "tools/stripboard/moves.ts"]) {
    for (const file of await importClosure(entry)) closure.add(file)
  }
  expect(closure.size, "the closure must be more than the two entry points")
    .toBeGreaterThan(2)
  for (const file of [...closure].sort()) {
    const text = await Bun.file(file).text()
    for (const identifier of forbidden) {
      expect(text, `${file}: ${identifier}`).not.toContain(identifier)
    }
  }
})
```

  The closure includes `tools/guide/dump.ts` and `tools/perfboard/acquire.ts`, which are pre-existing. **If either names one of the five, that is a finding and not a licence to shrink the forbidden list**: establish whether the call can reach a scored evaluation, record the answer in `docs/stripboard/pipeline-verification.md`, and if it can, the fix is in that module with a test. An exemption, if one is genuinely needed, is a named entry with a reason beside it in the test — never a quietly narrowed closure, which would make every assertion above smaller than it looks.

  `startSequences(spawned)` splits the recorded gestures into the per-restart start sequences, each ending at the `--author --op autofill` that closes it, and **throws when the record contains no autofill at all** — a splitter that returned an empty list would make both halves of the test above pass over nothing.

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement.** The cluster move applies one delta to every on-board part with a pin on the net, through `--move` per part or `--move-batch` when Task 9 has landed, and refuses as a whole if any part would be left floating. `search` runs one climb per seed, **producing each climb's start by calling Task 16's `seedCandidate` with the run's arm and that seed**, keeps the best, and records the boundaries as evaluation indices. `seededPrng` is imported from Task 16 and its name goes in the manifest.

- [ ] **Step 4: Prove the tests can fail.** Three breaks: enumerate the cluster move over parts rather than nets (the first test fails); reset `search` to one climb (the E2 tests and the Q3 test fail); default `worseAcceptance` to a number when `null` (the does-not-run test fails — **this is the mutation that matters**, because an invented annealing schedule is exactly the number this suite refuses to make up).

- [ ] **Step 5: RUN TASK 16's ARM COMPARISON, on the frozen fixture, and record the result.** This is the earliest point at which it is honest: `search` is the first thing that can serve as an `ArmRunner`, and the comparison's question — whether the start matters once restarts are cheap — is a question about `E2`. **Run it before Tasks 19–23 build on top of a start nobody measured.**

  The adapter is the whole of the wiring, and it lives here rather than in `seed-compare.ts` so that Task 16 imports nothing from a later task:

```ts
const runner: ArmRunner = (start, seed, spawn) => {
  const begun = evaluate(start, evaluateInput(), spawn)
  const result = search({ ...frozenInput(), start, arm, rules: { ...rules, seeds: [seed] } }, spawn)
  const climb = result.climbs[0]!
  const hc1 = result.best.results.find((constraint) => constraint.id === "HC1")!
  return { startAdmissible: begun.admissibleA1, objective: result.best.score.objective,
           cuts: result.best.score.cuts, wires: result.best.score.wires,
           netsComplete: hc1.held, admissibleA1: result.best.admissibleA1,
           history: climb.history, evaluations: climb.evaluations }
}
const comparison = compareSeedArms(
  { importedBoard: importFrozen(), targets: FROZEN_TARGETS, runDir, rules, mark: FROZEN_MARK },
  runner, spawn)
```

  **What is recorded in `docs/stripboard/pipeline-verification.md`**, whether it flatters the
  construction or not: the per-arm, per-seed table — final `F`, `metMark`, `evaluationsToCross`,
  `startAdmissible` and `admissibleA1` — the three rates, the arms the declared rule marks
  retireable, and the start admissibility actually observed beside the incomplete-net counts
  Task 16 quotes. **Nothing is deleted or selected in this step**: `retireable` is evidence, the
  arm stays a required selection with no default, and the edit that retires an arm is the owner's
  or a later reviewed change carrying this run as its justification. If the comparison marks an arm
  retireable, say so in the commit message for this task and leave the code standing.

  **Its cost, stated rather than worked around:** three full sweeps of the seed set, one per arm,
  each run getting the same budget — which at this task is the climb's own stall, because `Q4` and
  `Q5` do not exist yet. Equal for every arm is what the comparison needs; shortening an arm's
  runs would make the rates a comparison between unlike runs. `ArmRunner` is a parameter precisely
  so the comparison can be re-run under the stopping rules once Task 19 lands, and a re-run is a
  new row in `pipeline-verification.md` rather than an overwrite.

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("The net-cluster move, seeded restarts, a worse-acceptance that stays off without a bound, and the measured arm comparison"), push.

---

### Task 19: `Q1`–`Q6` — stopping, and a stop is not a pass

**Files:** create `tools/stripboard/stop.ts`, `tests/stripboard/bare-literal.ts`; test `tests/stripboard/stop.test.ts`.

**Interfaces:**
- *Consumes:* `Score` (12), `BoardTargets` (11), `StripboardRules` (10), `RunResult`/`ClimbResult` counters (17, 18), and Task 20's `a1`–`a4` predicate — **which is why Task 20's `verdict.ts` exports `admissible(results, …)` and this module imports it, rather than this module re-deriving admissibility.**
- *Provides:*
  - `StoppingRule = "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6"`
  - `StopState { readonly climbHistory: readonly number[]; readonly climbEvaluations: readonly number[]; readonly runEvaluations: number; readonly seedsRemaining: number; readonly signatures: readonly string[]; readonly acceptedThisRound: number }`
  - `FailureSignature { readonly failedChecks: readonly string[]; readonly floating: readonly string[]; readonly cutConflicts: readonly string[] }`
  - `signatureOf(results: readonly ConstraintResult[], dump: BoardDump): string`
  - `evaluateStop(state: StopState, best: Evaluation, targets: BoardTargets, rules: StripboardRules): StoppingRule | null` — the **first** rule that fires, in `Q1`…`Q6` order
- Task 20 consumes the fired rule to pick the `bound` value.

**`Q1` and `Q2` are successful terminations and may not fire on an inadmissible candidate**, and the arithmetic is why rather than the principle: `κ = J/(P − N)` divides by the splitting available and the tolerance divides by `F₀ − F_floor`, so they scale independently. **The worked case, carried because a theoretical statement is one somebody later decides is theoretical:** with `P − N = 10`, a single unit of `J` is `κ = 0.1`, **twice** a 0.05 bound; if on the same board `F₀ − F_floor = 40`, that same unit of `J` is a gap near `0.03`, **inside** `τ = 0.05`. `Q2` stops, `A2` fails, and the budget is left unspent on a board the pipeline was still allowed to improve.

- [ ] **Step 1: Write the failing test:**

```ts
test("Q1 fires at the floor, admissibly, and B = 0 follows rather than being assumed", () => {
  const atFloor = evaluation({ cuts: targets.cutFloor, wires: 0, solder: 0, joins: 0,
                               occupied: Math.min(targets.netCount, targets.strips) })
  expect(evaluateStop(freshState(), atFloor, targets, rules)).toBe("Q1")
})

test("Q1 does not fire when the arithmetic holds and admissibility does not", () => {
  const atFloorButInvalid = { ...atFloorEvaluation, admissibleA1: false }
  expect(evaluateStop(freshState(), atFloorButInvalid, targets, rules)).not.toBe("Q1")
})

test("Q2's worked case: the tolerance holds, A2 fails, and Q2 does NOT fire", () => {
  // P - N = 10 and one unit of J is kappa = 0.1, twice the 0.05 bound, while
  // F0 - F_floor = 40 makes the same unit a gap near 0.03, inside tau = 0.05.
  const board = { ...targets, netCount: 10, pinCount: 20, cutFloor: 0 }
  const state = { ...freshState(), climbHistory: [40, 1] }
  const candidate = evaluation({ cuts: 1, wires: 0, solder: 0, joins: 1, occupied: 10 })
  expect(clustering(1, 20, 10)).toBeCloseTo(0.1, 10)
  expect(evaluateStop(state, candidate, board, rules)).not.toBe("Q2")
})

test("Q2 fires when the tolerance holds AND the candidate is admissible", () => {
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, rules)).toBe("Q2")
})

test("Q3 fires only when the round accepted nothing AND the seed list is spent", () => {
  const stalled = { ...freshState(), acceptedThisRound: 0, seedsRemaining: 2 }
  expect(evaluateStop(stalled, candidate(), targets, rules)).not.toBe("Q3")
  expect(evaluateStop({ ...stalled, seedsRemaining: 0 }, candidate(), targets, rules)).toBe("Q3")
})

test("Q4 is per climb, and the run-level total is reported rather than resetting it", () => {
  // A restart legitimately resumes progress, so resetting the yield counter is
  // correct; hiding that the run as a whole has stalled is not.
  const collapsed = { ...freshState(), climbHistory: [10, 10, 10],
                      climbEvaluations: [4000, 4000, 4000], seedsRemaining: 0 }
  expect(evaluateStop(collapsed, candidate(), targets, rules)).toBe("Q4")
  const oneRoundOnly = { ...collapsed, climbHistory: [10, 10], climbEvaluations: [4000, 4000] }
  // Two CONSECUTIVE rounds are required, so one is not enough.
  expect(evaluateStop({ ...oneRoundOnly, climbHistory: [10, 9.9] }, candidate(), targets, rules))
    .not.toBe("Q4")
})

test("Q5's cap is run-level, so a restart cannot grant itself more", () => {
  const spent = { ...freshState(), runEvaluations: rules.evaluationCap, seedsRemaining: 3 }
  expect(evaluateStop(spent, candidate(), targets, rules)).toBe("Q5")
})

test("Q6 compares signatures within and across restarts", () => {
  // Three sharing a signature across two seeds is stronger evidence than
  // three within one, so the comparison spans restarts.
  const repeated = { ...freshState(), signatures: ["s", "s", "s"] }
  expect(evaluateStop(repeated, candidate(), targets, rules)).toBe("Q6")
  const mixed = { ...freshState(), signatures: ["s", "t", "s"] }
  expect(evaluateStop(mixed, candidate(), targets, rules)).not.toBe("Q6")
})

test("Q6 reports the cause and does not retry", () => {
  const repeated = { ...freshState(), signatures: ["s", "s", "s"] }
  expect(evaluateStop(repeated, candidate(), targets, rules)).toBe("Q6")
  expect(signatureOf(FAILED_RESULTS, FLOATED_DUMP))
    .toBe(signatureOf(FAILED_RESULTS, FLOATED_DUMP))
  expect(signatureOf(FAILED_RESULTS, FLOATED_DUMP)).toMatch(/C19/)
})

test("the first rule in Q1..Q6 order wins when several hold", () => {
  const both = { ...withinToleranceState(), runEvaluations: rules.evaluationCap }
  expect(evaluateStop(both, admissibleCandidate(), targets, rules)).toBe("Q2")
})

test("no rule fires on a healthy mid-run state, so the search continues", () => {
  expect(evaluateStop(freshState(), candidate(), targets, rules)).toBeNull()
})

test("a literal scan finds no bare threshold in stop.ts - a scan, not a proof", async () => {
  // THE NAME THIS REPLACES was "every threshold comes from the rules file and
  // none is written here", over a scan for three specific literals. A scan
  // cannot establish "every": a threshold written 5e-2, or assembled from two
  // small integers, or imported from a module that is not the rules file, all
  // pass it.
  //
  // So this is the cheap per-module version of V9's scan, named as a scan, and
  // it uses V9's OWN REGEX rather than a private list of three numbers - one
  // pattern in one place, so a module cannot be clean here and dirty under V9.
  // The stronger half is behavioural and is the test below it: every threshold
  // this module applies must MOVE when the rules file's value moves.
  const text = await Bun.file("tools/stripboard/stop.ts").text()
  expect([...text.matchAll(BARE_LITERAL)].map((match) => match[0])).toEqual([])
})

test("every rule this module applies moves when its rules-file value moves", async () => {
  // The behavioural claim, which is what the scan's name used to assert. A
  // threshold hard-coded here would not follow the parameter, whatever it was
  // spelled as - so this catches what no scan can.
  const strict = { ...rules, tau: rules.tau / 10, evaluationCap: 1, yieldFloor: rules.yieldFloor / 10 }
  expect(evaluateStop(withinToleranceState(), admissibleCandidate(), targets, strict))
    .not.toBe("Q2")
  expect(evaluateStop({ ...freshState(), runEvaluations: 1, seedsRemaining: 3 },
                      candidate(), targets, strict)).toBe("Q5")
})
```

  **`BARE_LITERAL` is declared HERE**, in `tests/stripboard/bare-literal.ts`, and **Task 22 imports it** — the dependency runs this way round because Task 19 comes first and the pattern must exist before its first use. One pattern in one file is the point: a module clean under this scan and dirty under `V9`'s would mean the two had drifted, which is the failure a second copy guarantees eventually. The file exports `BARE_LITERAL: RegExp` with its `g` flag, and **a fresh `RegExp` per call or an explicit `lastIndex` reset**, because a shared global regex carries state between `matchAll` loops and that is a test that passes on its second run for the wrong reason.

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement**, with `Q1` and `Q2` calling Task 20's `admissible` and returning `null` when the arithmetic holds but admissibility does not, so the search continues to `Q3`–`Q6`, *"which report the weaker `bound` the run has actually earned"*.

  **Sequencing note:** Tasks 19 and 20 are mutually referential — `Q1`/`Q2` need `admissible`, and `bound` needs the fired rule. Write `verdict.ts`'s `admissible` first, inside Task 20's file but committed in Task 19, and say so in Task 19's commit message. The alternative — a local admissibility predicate here — is a second copy of `A1`–`A4`, which is the thing the crux forbids.

- [ ] **Step 4: Prove the tests can fail.** Three breaks: drop the admissibility requirement from `Q1`/`Q2` (two tests fail); make `Q4` run-level (the per-climb test fails); compare signatures within one climb only (the across-restarts test fails).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Six stopping rules, two of which require admissibility, and no threshold written in the code"), push.

---

### Task 20: `A1`–`A4`, `REP1`–`REP5` — the verdict and the report

**Files:** create `tools/stripboard/verdict.ts` and `tools/stripboard/report.ts`; test `tests/stripboard/verdict.test.ts`, `tests/stripboard/report.test.ts`.

**Interfaces:**
- *Consumes:* `ConstraintResult`/`a1` (14), `Score` (12), `BoardTargets` (11), `StripboardRules` (10), `StoppingRule` (19), `RunResult` (18).
- *Provides:*
  - `AdmissibilityResult { readonly a1: boolean; readonly a2: boolean; readonly a3: boolean; readonly a4: boolean; readonly detail: Readonly<Record<"a1" | "a2" | "a3" | "a4", string>> }`
  - `admissible(input: AdmissibilityInput): AdmissibilityResult`
  - `Outcome = "invalid" | "valid-below-target" | "admissible"`
  - `outcomeOf(result: AdmissibilityResult): Outcome`
  - `BoundStatus = "at-floor" | "within-tolerance" | "search-exhausted" | "budget-exhausted" | "systematic-cause"`
  - `boundFor(rule: StoppingRule): BoundStatus`
  - `exitCodeFor(outcome: Outcome): 0 | 1`
  - `BindingConstraint = { readonly kind: "span"; readonly board: string; readonly nets: readonly [string, string]; readonly bound: "maxSpanHoles" | "minSpanHoles" } | { readonly kind: "packing"; readonly board: string; readonly detail: string } | { readonly kind: "search-stopped"; readonly rule: StoppingRule }`
  - `WORDING: Readonly<Record<BoundStatus, string>>` and `OUTCOME_WORDING: Readonly<Record<Outcome, string>>`
  - `renderReport(input: ReportInput): readonly string[]`
- Task 23 and Task 24 consume `Outcome`, `BoundStatus` and `exitCodeFor`.

**`A4` names which board was run**, because *"a run states which board it ran and therefore which clause it met"*: the frozen fixture meets `B1-frozen`, the scaffolded board meets `B1-current`. **A run against the scaffolded board may not report `B1-frozen` satisfied** (V3).

**Three outcomes, not two, and both non-admissible outcomes exit non-zero**, so the exit code does not distinguish them and the report must. *"The owner's question is 'can I build this?', and 'is it as good as we wanted?' is a different question."*

- [ ] **Step 1: Write the failing test:**

```ts
test("admissible requires all four, and each failing alone is reported individually", () => {
  const all = admissible(healthy())
  expect([all.a1, all.a2, all.a3, all.a4]).toEqual([true, true, true, true])
  expect(outcomeOf(all)).toBe("admissible")
  for (const key of ["a1", "a2", "a3", "a4"] as const) {
    const one = admissible(failing(key))
    expect(one[key], key).toBe(false)
    expect(one.detail[key], key).not.toBe("")
    expect(outcomeOf(one), key).not.toBe("admissible")
  }
})

test("A1 failing is invalid; A2, A3 or A4 failing alone is valid-below-target", () => {
  expect(outcomeOf(admissible(failing("a1")))).toBe("invalid")
  for (const key of ["a2", "a3", "a4"] as const) {
    expect(outcomeOf(admissible(failing(key))), key).toBe("valid-below-target")
  }
})

test("both non-admissible outcomes exit non-zero, and admissible exits zero", () => {
  expect(exitCodeFor("invalid")).toBe(1)
  expect(exitCodeFor("valid-below-target")).toBe(1)
  expect(exitCodeFor("admissible")).toBe(0)
})

test("A2's detail names kappa, kappa_bench and what bound the clustering", () => {
  const result = admissible(failing("a2"))
  expect(result.detail.a2).toMatch(/0\.0?5|kappa_bench|clustering bound/)
  expect(result.detail.a2).toMatch(/maxSpanHoles|minSpanHoles|packing|search/)
})

test("A2's detail may report the search having stopped, said plainly as that", () => {
  // REP2: where neither a span bound nor a packing infeasibility applies, the
  // stopping rule is said plainly AS THE SEARCH HAVING STOPPED rather than as
  // a constraint - and K3 then refuses to move the bound on that evidence.
  const stopped = admissible({ ...failing("a2"), binding: { kind: "search-stopped", rule: "Q5" } })
  expect(stopped.detail.a2).toMatch(/search/)
  expect(stopped.detail.a2).not.toMatch(/binding constraint/)
})

test("A2 cannot refuse a layout at the floor, whatever kappa_bench is", () => {
  // C = C_floor requires kappa = 0, which is inside ANY positive kappa_bench.
  // This is what bounds the damage an aggressive value can do, and is all it
  // bounds.
  for (const kappaBench of [0.05, 0.01, 0.001]) {
    const atFloor = admissible({ ...healthy(), rules: { ...rules, kappaBench } })
    expect(atFloor.a2, String(kappaBench)).toBe(true)
  }
})

test("A4 says which board ran, and a scaffolded run may not claim B1-frozen", () => {
  const scaffolded = admissible({ ...healthy(), board: "pultec-low-boost", frozen: false })
  expect(scaffolded.detail.a4).toMatch(/B1-current/)
  expect(scaffolded.detail.a4).not.toMatch(/B1-frozen/)
  const frozen = admissible({ ...healthy(), board: "pultec-low-boost", frozen: true })
  expect(frozen.detail.a4).toMatch(/B1-frozen/)
})

test("the bound maps one-to-one from the rule that fired", () => {
  expect(boundFor("Q1")).toBe("at-floor")
  expect(boundFor("Q2")).toBe("within-tolerance")
  expect(boundFor("Q3")).toBe("search-exhausted")
  expect(boundFor("Q4")).toBe("budget-exhausted")
  expect(boundFor("Q5")).toBe("budget-exhausted")
  expect(boundFor("Q6")).toBe("systematic-cause")
})

test("V10: only at-floor may be worded as a lower bound met, and nothing else claims optimality", () => {
  for (const status of ["search-exhausted", "budget-exhausted", "systematic-cause",
                        "within-tolerance"] as const) {
    const wording = WORDING[status]
    expect(wording, status).not.toMatch(/optimal|minimal|lowest possible|cannot be improved/i)
  }
  expect(WORDING["at-floor"]).toMatch(/floor/)
  expect(WORDING["at-floor"]).toMatch(/unconstrained/)
})

test("V10: an under-budgeted run reports budget-exhausted and claims nothing", () => {
  const lines = renderReport(underBudgetedRun()).join("\n")
  expect(lines).toMatch(/budget-exhausted/)
  expect(lines).not.toMatch(/optimal|minimal/i)
  expect(lines).toMatch(/where the search stopped/)
})

test("V12: a run failing only A2 reports valid, below target and not a malfunction", () => {
  const lines = renderReport(a2OnlyFailure()).join("\n")
  expect(lines).toMatch(/valid, below target/)
  expect(lines).not.toMatch(/malfunction|broken|bug/i)
  expect(lines).not.toMatch(/kappa_bench should|relax the bound|loosen/i)
})

test("V12: a run failing A1 reports invalid and does not produce the A2 wording", () => {
  const lines = renderReport(a1Failure()).join("\n")
  expect(lines).toMatch(/invalid/)
  expect(lines).not.toMatch(/valid, below target/)
})

test("the two wordings are not interchangeable", () => {
  expect(OUTCOME_WORDING["invalid"]).not.toBe(OUTCOME_WORDING["valid-below-target"])
})

test("REP3: every rendered quality sentence comes from a table entry, verbatim", async () => {
  // THE TEST THIS REPLACES asserted that report.ts CONTAINS the strings
  // "WORDING[" and "OUTCOME_WORDING[", under the name "the wording is generated
  // from the fields, not written per run". A file can index both tables and
  // still build a sentence of its own on the next line, so the body did not
  // establish the name. The behavioural version: render every combination and
  // assert each report's quality sentences are table entries and nothing else.
  //
  // A phrasing table keyed by the field means an exhausted run cannot be
  // described as optimal by an author who was feeling good about the number.
  const entries = new Set([...Object.values(WORDING), ...Object.values(OUTCOME_WORDING)])
  for (const status of BOUND_STATUSES) {
    for (const outcome of OUTCOMES) {
      const lines = renderReport(runWith({ bound: status, outcome }))
      const quality = lines.filter((line) => QUALITY_LINE.test(line))
      expect(quality.length, `${status}/${outcome} rendered no quality line`).toBeGreaterThan(0)
      for (const line of quality) {
        const bare = line.replace(QUALITY_LINE_PREFIX, "").trim()
        expect(
          entries.has(bare),
          `${status}/${outcome}: "${bare}" is not a WORDING or OUTCOME_WORDING entry`,
        ).toBe(true)
      }
    }
  }
})

test("a proposed default that decided the outcome is reported as proposed (OB3)", () => {
  // tau and the yield floor are PIPELINE's proposals, not the owner's values.
  // A run whose verdict turned on one says so beside the number.
  const lines = renderReport(withinToleranceRun()).join("\n")
  expect(lines).toMatch(/proposed/i)
})

test("E3 not running is stated in the report", () => {
  expect(renderReport(runWithoutWorseAcceptance()).join("\n"))
    .toMatch(/worse-acceptance|E3/)
})

test("the report names which of A1-A4 failed, one by one, never a single not admissible", () => {
  const lines = renderReport(a2OnlyFailure()).join("\n")
  expect(lines).toMatch(/A1/)
  expect(lines).toMatch(/A2/)
  expect(lines).toMatch(/A3/)
  expect(lines).toMatch(/A4/)
  expect(lines).not.toMatch(/^not admissible$/m)
})
```

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement.** `WORDING` and `OUTCOME_WORDING` are tables; `renderReport` selects from them and interpolates numbers, and **writes no sentence of its own about quality**. The `A1` detail names which constraint and which net or part; `A3` gives the achieved `F`, the derived floor and the gap; `A4` says which board; `A2` names `κ`, `κ_bench` and the binding constraint or the stopped search.

- [ ] **Step 4: Prove the tests can fail.** Four breaks: make `outcomeOf` two-valued (the three-outcomes tests fail); add the word "optimal" to `WORDING["budget-exhausted"]` (V10 fails); have `renderReport` build its own sentence from the gap (REP3's generated-wording test fails); drop the per-condition breakdown (the last test fails).

  `BOUND_STATUSES` and `OUTCOMES` are the two unions enumerated as arrays, asserted exhaustive against the types with a `satisfies`-style check so a sixth status cannot escape the loop. `QUALITY_LINE` matches the report's quality lines by their own prefix — the report lines its quality claims distinctly for exactly this reason — and `QUALITY_LINE_PREFIX` strips it. **If `renderReport` has no distinguishable quality line, give it one as part of this task**: a report whose claims cannot be located is a report nothing can check.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Three outcomes, five bound statuses, and wording generated from both"), push.

- [ ] **Step 6: CHECKPOINT 2 — run the chain end to end on one board, before any optimisation benchmarking, and read the whole report.** Task 20 is the first point at which `seed → climb → escapes → stop → verdict → report` exists as a chain. Every test above and in Tasks 16–19 drives one link with a scripted spawn; **nothing has yet produced a `bound` and an `outcome` from the machinery rather than from a fixture.** The thing this catches is a chain that is correct in every link and wrong when joined — a `StoppingRule` that never fires in a real run, a `bound` that reports a rule the search did not reach, an `outcome` that disagrees with the verdict its own grader produced.

  Run `place` against **one** Pultec board — `pultec-low-boost`, the one with a hand-laid reference — with the committed `stripboard/rules.json` and a **reduced `evaluationCap` passed through the injected rules** so the checkpoint is minutes rather than hours. It is deliberately not the benchmark: Task 23 is the benchmark, and this is the integration test that must pass before benchmarking a chain that may not be wired together.

  **Read, and record in `docs/stripboard/pipeline-verification.md`:** the report in full; the `bound` and which `Q` rule produced it; the `outcome` and which of `A1`–`A4` decided it; whether `worseAcceptanceRan` is false and whether the report says so; whether a proposed default (`OB3`) decided anything and whether it is marked proposed; `boards/**` unchanged by `git status --porcelain`; and the `run.json` manifest's two blocks with the canonical hash. **The expected outcome is `valid, below target` with `bound = budget-exhausted`**, because the cap is deliberately small — and an `admissible` verdict at a reduced cap is a result to look at twice, not to celebrate.

  **Three things make this checkpoint fail rather than merely report:** a chain that throws; an `outcome` of `admissible` while any `ConstraintResult.held` is false; or a `bound` naming a rule `evaluateStop` did not return. Each of those is a wiring defect the per-link tests cannot see, which is the whole reason the checkpoint is here. Commit it as a standing test with an explicit long timeout, in its own file, **never skipped** — a skipped integration check looks exactly like a passing one.

---

### Task 21: Determinism — the canonical identity, the provenance, and the restart boundaries

**Files:** test `tests/stripboard/determinism.test.ts`; modify `tools/stripboard/climb.ts` or `run-dir.ts` only if a determinism defect is found, in which case the fix lands here with its test.

**Interfaces:**
- *Consumes:* `search` (18), `canonicalHash`/`RunManifest` (13), `renderReport` (20).
- *Provides:* no new exports. V6, as a standing test.

**V6 is two contracts and they must not be run together.** **Canonical artifact identity must reproduce, byte for byte**: the candidate `.vrt`, and the enumerated canonical metrics — `C`, `W`, `B`, `F`, `N`, `J`, `S_occ`, `κ`, `A_occ`, every `HC1`–`HC10` pass/fail, the ranking tuple, the stopping rule, the `bound`, the `outcome`, **and the restart boundaries**. **Execution provenance is recorded and never compared**: timestamps, the stamp, temporary paths, durations, the host, measured milliseconds, and evaluation counts attributable to scheduling.

*"A run that lands on the same board by a different path has not demonstrated the determinism the escape mechanisms need."*

- [ ] **Step 1: Write the test:**

```ts
test("the same seed list and the same inputs reproduce the candidate and the metrics", () => {
  const first = search(input(), scriptedSpawn(SCRIPT))
  const second = search(input(), scriptedSpawn(SCRIPT))
  expect(readFileSync(second.best.candidate)).toEqual(readFileSync(first.best.candidate))
  expect(canonicalMetricsOf(second)).toEqual(canonicalMetricsOf(first))
})

test("the restart boundaries reproduce, not merely the final board", () => {
  const first = search(input(), scriptedSpawn(SCRIPT))
  const second = search(input(), scriptedSpawn(SCRIPT))
  expect(second.restartBoundaries).toEqual(first.restartBoundaries)
})

test("a different seed list changes the canonical hash", () => {
  const changed = search({ ...input(), rules: { ...rules, seeds: [9, 8, 7] } },
                         scriptedSpawn(SCRIPT))
  expect(hashOf(changed)).not.toBe(hashOf(search(input(), scriptedSpawn(SCRIPT))))
})

test("a run that takes three times as long reproduces, and one that DIFFERS does not", () => {
  // Determinism is not reproducibility of timing - so a slower run must hash
  // the same. The second clause was in the previous version's NAME and not in
  // its body, which left "and one that differs does not" asserted by the title
  // alone: a hash that ignored the metrics entirely would have passed it.
  const baseline = hashOf(search(input(), scriptedSpawn(SCRIPT)))
  const slow = search(input(), slowedSpawn(SCRIPT, 3))
  expect(hashOf(slow), "a slower run must reproduce").toBe(baseline)
  // And a run whose RESULT differs must not hash the same, which is the half
  // that makes the half above mean something.
  const different = search(input(), scriptedSpawn(ONE_MOVE_FEWER))
  expect(canonicalMetricsOf(different), "the scripts must actually produce different results")
    .not.toEqual(canonicalMetricsOf(search(input(), scriptedSpawn(SCRIPT))))
  expect(hashOf(different), "a differing run must not reproduce").not.toBe(baseline)
})

test("the manifest's provenance block holds the timings and the canonical block does not", () => {
  const manifest = manifestOf(search(input(), scriptedSpawn(SCRIPT)))
  expect(manifest.provenance.durationMs).toBeGreaterThanOrEqual(0)
  expect(JSON.stringify(manifest.canonical)).not.toContain("durationMs")
  expect(JSON.stringify(manifest.canonical)).not.toContain(manifest.provenance.stamp)
})
```

- [ ] **Step 2: Run it. If it fails, the defect is real and the fix is this task's work** — find the non-determinism (a hash-map iteration, an unsorted key, a clock) and fix it with a test naming what it was. Task 18's forbidden-identifier test should have caught the common cases; this is the one that catches an ordering that was incidental rather than declared.

- [ ] **Step 3: Prove the test can fail.** Two breaks: seed `seededPrng` from `Date.now()` (the reproduce test fails); drop `restartBoundaries` from the compared metrics (the boundaries test still passes, so **also** make the second run restart one evaluation later and confirm the boundaries test now fails where the metrics test does not — that is the whole reason the boundaries are in the contract).

- [ ] **Step 4: Run** `bun test && bun run typecheck`, **commit** ("Reproduce a run's candidate, its metrics and its restart boundaries, and compare no timing"), push.

---

### Task 22: V5 and V9 — the placer-discrimination test, and the fitted-coefficient review

**Files:** test `tests/stripboard/discrimination.test.ts`; create `docs/stripboard/pipeline-verification.md`.

**Interfaces:**
- *Consumes:* `search` (18), `scoreDump` (12), `deriveTargets` (11).
- *Provides:* no new exports. V5 as a standing test, V9 as a reviewed document with a test that keeps it honest about one thing only (that no constant in the pipeline is unaccounted for).

**The governing test of PIPELINE §10, which this task turns into code:** *"a metric that cannot distinguish a good placer from a bad one is not a metric."* The instructive precedent is COST §5's normalisation finding — across the four import-placed boards `C/P` is 0.92, 0.91, 0.91, 0.85, a coefficient of variation of about 3%, *"which looks like a law until low-boost arrives at 0.19 and the five-board variation jumps to roughly 38%"*. The apparent constant is **the fingerprint of the placer**: lay every part along a strip and every pin becomes its own segment, so `C ≈ P − S_occ`.

- [ ] **Step 1: Write the test:**

```ts
test("V5: every reported statistic separates the pipeline's placement from --import's", () => {
  // A statistic stable across the four import-placed boards and changing on
  // the hand-laid one is fingerprinting the placer; one that does NOT change
  // when the placer is replaced is measuring nothing.
  for (const board of PULTEC_BOARDS) {
    const imported = scoreDump(dumpOf(importPlaced(board)), targetsOf(board), rules)
    const produced = scoreDump(dumpOf(pipelinePlaced(board)), targetsOf(board), rules)
    for (const key of ["objective", "joins", "clustering"] as const) {
      const change = Math.abs(produced[key] - imported[key])
      expect(change, `${board}.${key}`).toBeGreaterThan(acrossBoardVariation(key))
    }
  }
})

test("V5 can fail: a statistic that ignores the placement is caught", () => {
  // netCount is a property of the circuit and changes not at all when the
  // placer is replaced, so it must NOT be reportable as a pipeline statistic.
  for (const board of PULTEC_BOARDS) {
    expect(scoreDump(dumpOf(pipelinePlaced(board)), targetsOf(board), rules).netCount)
      .toBe(scoreDump(dumpOf(importPlaced(board)), targetsOf(board), rules).netCount)
  }
  expect(REPORTED_STATISTICS).not.toContain("netCount")
})

test("V9's mechanical half: a literal scan finds no bare fraction or large integer", async () => {
  // THE NAME THIS REPLACES was "every numeric literal in the pipeline traces to
  // a rule, a datum or a derivation" - which is V9's claim, and this scan is
  // not it. The scan catches a bare fraction and a bare integer of three digits
  // or more. It does NOT catch a small integer used as a threshold, a value
  // written 5e-2, or two literals combined into one. The judgement half - that
  // no ratio is fitted across boards - is the DOCUMENT, and five boards cannot
  // support a regression.
  //
  // So: a scan, named as a scan, with its blind spots written down. V9's
  // guarantee is the document plus the owner's review, and this test is the
  // mechanical floor under it.
  for (const file of PIPELINE_SOURCES) {
    const text = await Bun.file(file).text()
    expect([...text.matchAll(BARE_LITERAL)].map((match) => match[0]), file).toEqual([])
  }
})

test("V9's scan can fail, so it is not a loop over nothing", async () => {
  // PIPELINE_SOURCES is derived rather than listed, so an empty or wrong glob
  // would make the test above vacuous while green. Both halves are asserted.
  expect(PIPELINE_SOURCES.length).toBeGreaterThan(10)
  expect(PIPELINE_SOURCES).not.toContain("tools/stripboard/rules.ts")
  expect([..."const tau = 0.05".matchAll(BARE_LITERAL)].map((m) => m[0])).toEqual(["0.05"])
  expect([..."const cap = 2000".matchAll(BARE_LITERAL)].map((m) => m[0])).toEqual(["2000"])
})
```

  `acrossBoardVariation(key)` is computed from the four import-placed boards' own spread for that statistic, which is what makes the comparison "by more than its across-board variation" rather than by a number somebody chose. `PIPELINE_SOURCES` is **derived** by listing `tools/stripboard/*.ts` and excluding `rules.ts`, which is where numbers legitimately live — derived rather than written out, so a module added in a later task is covered without anybody remembering to add it, and asserted non-empty because a glob that matched nothing is the most comfortable way for this test to pass. `BARE_LITERAL` is imported from `tests/stripboard/bare-literal.ts` (Task 19), so the per-module scan in `stop.ts` and this one are the same pattern.

- [ ] **Step 2: Implement nothing; make the tests pass by fixing what they find.** If a statistic fails V5, it comes out of `REPORTED_STATISTICS` with the reason recorded — that is the test doing its job, not an obstacle. If a literal fails V9, it moves to `stripboard/rules.json` with a `note`.

- [ ] **Step 3: Complete `docs/stripboard/pipeline-verification.md`**, created in Task 3 and extended since — V1 through V12, each with where its test lives and what it would catch, plus the findings Tasks 3, 7, 14 and 18 put there: `HC8`'s trust boundary, `BOUNDS`'s three sources and the option of decomposing it in the fork, Checkpoint 1's four verdicts, **Task 18's arm-comparison table and the arms its declared rule marked retireable**, and the stated weaknesses of the checks that are text scans rather than structural proofs. This is the page a reviewer reads to answer *"how do we know the optimiser is not fooling itself?"*, and it is also the register the self-review below checks against. **Every check whose guarantee is weaker than its subject appears here with the weaker guarantee written out** — that list is the honest counterpart of the `V` table and the thing a reader should look at first.

- [ ] **Step 4: Prove V5 can fail.** Point `pipelinePlaced` at `importPlaced` and confirm every row fails. Record it beside the test.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("A statistic that cannot tell two placers apart is not a statistic"), push.

---

### Task 23: V3 — the `B1-frozen` run

**Files:** test `tests/stripboard/benchmark.test.ts`; create `tools/cli/perfboard-stripboard-verbs.ts`'s `place` dispatcher; modify `tools/cli/perfboard.ts` and `make/board.mk`.

**Interfaces:**
- *Consumes:* everything from Tasks 10–21; the frozen fixture from Task 5.
- *Provides:*
  - `dispatchPlace(context: VerbContext, deps: PlaceDeps): Promise<number>` — the `place` verb, acting on `$(CURDIR)`
  - `make place` per board, and `make place` on the frozen fixture through an explicit `--frozen` flag naming the fixture rather than a board directory
  - **a required `--seed-arm` flag**, parsed by Task 16's `parseSeedArm`: there is no default arm, so `place` refuses and lists the three rather than choosing one
- Task 24's `adopt` consumes the run directory `place` wrote.

**`B1-frozen`, and it is the only externally authored criterion:** against the exact electrical model, footprints and board dimensions the hand layout was built for — 9 nets, 27 pins, and **the grid the fixture's own `GRID` line reports** — the pipeline must reach `C ≤ 5` with `W = 0` and every net complete, **starting from the import-placed board**. A run that does not is a failing run. `W = 0` is a property of the artifact being reproduced, not a general preference.

**`V3` may not be reported as satisfied by a run against the scaffolded board**, and Task 20's `A4` detail is what enforces it.

**`ARM` in the tests below is whichever arm the run is being made with, passed explicitly**, and
`place` **refuses** without one (Task 16: the arm has no default, because the comparison that would
justify a default is evidence for the owner and not a choice this plan makes). `B1-frozen`'s
*"starting from the import-placed board"* clause is satisfied by every arm — all three begin from
`--import`'s output and differ only in what they do to it — so the criterion constrains the import
and not the arm, which is why the test below asserts `--import` was spawned rather than asserting
an arm.

**The acceptance criterion is ONE run, unchanged — and the report also carries a success rate
across the seed set, as a diagnostic that is explicitly NOT a threshold.** `B1-frozen` says the
pipeline *"must reach `C ≤ 5` with `W = 0`"*; that is the criterion and it is met or not by a run.
What one run does not distinguish is **reaching the target on one seed from reaching it reliably**,
and those are materially different facts about the pipeline the owner is being handed.

So Task 23 reports, beside the verdict, **how many of the seed set's seeds reached it** — a
fraction with both numbers and the per-seed `C`, `W` and `bound`. Three constraints on it, and all
three matter:

- **It is not an acceptance threshold and no number is attached to it.** A threshold the
  implementing agent invents is the governing invariant's failure — *"an agent may never author
  the acceptance criteria for the specific artifact it is producing"* — and a success rate with a
  bar on it is exactly such a criterion. The run **passes or fails on the single-run criterion**,
  and the rate changes no verdict, no `outcome`, no `bound` and no exit code.
- **The seed set is `stripboard/rules.json`'s `seeds`**, which already exists, is already in the
  strict rules file with a `note`, and is already in the canonical hash. **No new parameter and no
  new number** (`V9`): the set is fixed and reviewed because `PAR3`'s file is where it lives, and
  a run against a different seed set hashes differently.
- **It is reported whether it is flattering or not**, as a `REP`-style field rendered from the
  numbers, so a one-in-eight result reads as one in eight. If the owner later wants a rate to
  *bind*, that is a criterion for him to set in CRITERIA, and the number will already have been
  measured for several runs by then — which is the useful thing a diagnostic does and a threshold
  cannot.

**One honest qualification.** Running every seed is the full seed set's cost rather than one
climb's, and `Q5`'s cap is run-level, so the rate is measured over runs that each get the full
budget. That is the measurement's cost and it is stated rather than worked around by shortening
the later seeds, which would make the rate a comparison between unlike runs.

**What a failure means, and the run must say which of three it is.** (1) **The optimiser is weak** — `C > 5` on the frozen fixture while `HC1`–`HC10` hold and `κ` is well above the clustering bound. Note what this reading is **not**: the bound is deliberately set just under the best hand result, so missing it is the expected first outcome and on its own says nothing about the optimiser; this reading needs `C > 5`, a failure against the owner's achieved cut count. (2) **A constraint binds** — `maxSpanHoles` forbids the spans low-boost actually uses, or `minSpanHoles` forbids a compression it relies on, and the remedy is in the span data rather than in the search. **This reading is falsifiable on the frozen fixture**: the owner's own spans are in it, so a binding bound can be shown to be the cause by checking the hand layout's own spans against the module. (3) **The scorer is wrong** — `C ≤ 5` reported while `--check`, `HC8` or `make check` disagrees. *"That is §10's failure, and it is the worst of the three because it looks like success."*

- [ ] **Step 1: Write the test:**

```ts
test("the hand layout's own spans are inside the recorded bounds, so reading 2 is falsifiable", async () => {
  // Run this FIRST and read it. If a span the owner's own layout uses is
  // outside maxSpanHoles or below minSpanHoles, reading 2 is the cause of any
  // failure below and the remedy is in the span data, not in the search.
  const dump = parseBoardDump(await Bun.file(FROZEN_DUMP).text())
  for (const [ref, pins] of Object.entries(dump.pins)) {
    if (pins.length !== 2) continue
    const bounds = leadSpanFor(footprintOf(ref))
    const span = holeSpanBetween(pins[0]!, pins[1]!, dump.verticalStrips)
    expect(span, ref).toBeGreaterThanOrEqual(bounds.minSpanHoles)
    expect(span, ref).toBeLessThanOrEqual(bounds.maxSpanHoles)
  }
})

test("V3: the pipeline reaches C <= 5 with W = 0 and every net complete on the frozen fixture", async () => {
  const run = await place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM })
  expect(run.best.score.wires, "W").toBe(0)
  expect(run.best.score.cuts, "C").toBeLessThanOrEqual(5)
  const hc1 = run.best.results.find((result) => result.id === "HC1")!
  expect(hc1.held, hc1.detail).toBe(true)
})

test("V3 names which of the three readings a failure is", async () => {
  const run = await place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM })
  if (run.best.score.cuts <= 5 && run.best.score.wires === 0) return
  const report = renderReport(reportInputOf(run)).join("\n")
  expect(report).toMatch(/optimiser is weak|a constraint binds|the scorer is wrong/)
})

test("a run against the scaffolded board does not report B1-frozen satisfied", async () => {
  const run = await place({ board: "boards/pultec-low-boost", rules: loadRules(), arm: ARM })
  const report = renderReport(reportInputOf(run)).join("\n")
  expect(report).not.toMatch(/B1-frozen/)
  expect(report).toMatch(/B1-current/)
})

test("the run starts from the import-placed board, not from the hand layout", () => {
  // B1-frozen is stated "starting from the import-placed board". Seeding from
  // the owner's own layout would be reproducing a result by copying it.
  const spawned: string[][] = []
  place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM }, recordingSpawn(spawned))
  expect(spawned.some((args) => args[0] === "--import")).toBe(true)
  for (const args of spawned) expect(args).not.toContain(FROZEN)
})

test("the run leaves boards/** byte-identical", () => {
  const before = gitStatusPorcelain("boards/")
  place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM })
  expect(gitStatusPorcelain("boards/")).toEqual(before)
})

test("the per-seed results are reported as a rate, and the rate changes no verdict", async () => {
  // The diagnostic, and the guard that keeps it a diagnostic. Reaching the
  // target on one seed and failing most others is materially different from
  // reaching it reliably, and the report must make that visible - WITHOUT
  // becoming a criterion the implementing agent invented, which is the
  // governing invariant's failure.
  const rules = loadRules()
  const run = await placeAcrossSeeds({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules, arm: ARM })
  expect(run.perSeed.length, "every seed in the reviewed set is run").toBe(rules.seeds.length)
  for (const seed of run.perSeed) {
    expect(rules.seeds).toContain(seed.seed)
    expect(seed.bound, `seed ${seed.seed}`).not.toBe("")
  }
  const lines = renderReport(reportInputOf(run)).join("\n")
  // Both numbers, so a fraction cannot be read as a bare percentage.
  expect(lines).toMatch(new RegExp(`\\b${run.reached}\\b[^\\n]*\\b${rules.seeds.length}\\b`))
  // And it is labelled as what it is.
  expect(lines).toMatch(/diagnostic/i)
  expect(lines).not.toMatch(/success rate (?:below|above|threshold|target)/i)
})

test("the rate is not an acceptance condition: the verdict is the single run's", async () => {
  // The discriminating test. A run that MET B1-frozen on its first seed and
  // failed on every other must still report the same outcome and the same exit
  // code, or the rate has silently become a criterion.
  const rules = loadRules()
  const one = await placeAcrossSeeds(
    { frozen: FROZEN, netlist: FROZEN_NETLIST, rules, arm: ARM }, scriptedSpawn(FIRST_SEED_ONLY_REACHES),
  )
  expect(one.reached, "the script must make exactly one seed reach the target").toBe(1)
  expect(one.perSeed.length).toBeGreaterThan(1)
  // The reported outcome is the FIRST seed's - the run B1-frozen is judged on -
  // and not a function of how many others reached it.
  expect(one.reportedOutcome).toBe(one.singleRunVerdict)
  expect(exitCodeFor(one.reportedOutcome)).toBe(exitCodeFor(one.singleRunVerdict))
})
```

  **This test runs the real binary and a real search, so it is slow.** Give it an explicit long timeout and keep it in its own file so `bun test tests/stripboard/benchmark.test.ts` is a thing a person can run alone. If the suite's wall clock becomes a problem, the remedy is a smaller evaluation cap for the test through the injected rules, **not** skipping it: a skipped benchmark looks exactly like a passing one.

- [ ] **Step 2: Implement the `place` verb and the `make place` target.** One verb on the existing CLI acting on `$(CURDIR)` the way every other verb there does — **no `BOARD=` variable**, because two ways to say which board is two places for one fact to be wrong. It writes only under `build/stripboard/<board>/<stamp>/`.

  `placeAcrossSeeds` runs `place` once per seed in `rules.seeds` and returns `SeedSweep { readonly perSeed: readonly { readonly seed: number; readonly cuts: number; readonly wires: number; readonly bound: BoundStatus; readonly outcome: Outcome }[]; readonly reached: number; readonly singleRunVerdict: Outcome; readonly reportedOutcome: Outcome }`, where `singleRunVerdict` is the **first** seed's — the run `B1-frozen` is judged on — and `reportedOutcome` is what the report prints. **They are two fields of the same type on purpose**, so the test above can assert they are equal and a future change that derived the reported outcome from the rate would fail rather than pass quietly. `reached` counts the seeds meeting `B1-frozen`'s clause and **nothing reads it but the report**. `BoundStatus` and `Outcome` are Task 20's, imported, never redeclared.

- [ ] **Step 3: Run it, read the output, and record what came back.** Not only the test's verdict: open the layout, read `run.json`, read the report. **Look at the output, not only the tests.** Record in `docs/stripboard/pipeline-verification.md`: the three readings and which one it was; **and the per-seed table with the rate**, with the rate labelled a diagnostic and the single-run criterion's verdict stated separately beside it. If the two disagree — the criterion met and the rate low — **say so plainly**: it is the most useful thing this task can tell the owner about what he is being handed, and it is the fact a single-run report hides.

- [ ] **Step 4: If `V3` fails, do not lower the bar.** `B1-frozen` is non-negotiable; *"it means the pipeline is worse than the owner's hands at the one job it exists to take over, and the honest response is to say so and stop"*. Report which reading, with its evidence, and stop.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Point the pipeline at the layout the owner laid by hand, and report which way it fell short"), push.

---

### Task 24: The adoption gate

**Files:** create `tools/stripboard/adopt.ts`; modify `tools/cli/perfboard-stripboard-verbs.ts`, `tools/cli/perfboard.ts`, `make/board.mk`; test `tests/stripboard/adopt.test.ts`.

**Interfaces:**
- *Consumes:* `RunManifest`/`readManifest`/`canonicalHash` (13), `Outcome`/`exitCodeFor` (20), `readPin`/`builtCommit` (`acquire.ts`), `RULES_PATH` (10).
- *Provides:*
  - `AdoptRefusal = "candidate-hash" | "rules-hash" | "span-hash" | "pin-pattern-hash" | "frozen-fixture-hash" | "provenance-chain" | "veroroute-commit" | "built-commit" | "failing-check" | "uncommitted-layout"`
  - `adoptLayout(input: AdoptInput, deps: AdoptDeps): void` — throws naming the refusal, or copies the candidate `.vrt` into `boards/<board>/` and nothing else
  - `dispatchAdopt(context: VerbContext, deps: AdoptDeps): Promise<number>`
- Nothing consumes this; it is the end of the chain.

**`G1`: one command admits a layout, and it is the only thing that writes under `boards/`.** **`G2`: six refusals, each naming what is missing, where to fix it, and why it is not defaulted.**

- [ ] **Step 1: Write the failing test — one case per refusal, because a gate with five of six refusals is a gate:**

```ts
test("the happy path copies the candidate into the board directory and nothing else", () => {
  const touched = adoptAndList(healthyAdoption())
  expect(touched).toEqual(["boards/pultec-low-boost/pultec-low-boost.perfboard.vrt"])
})

test("G2.1: a candidate whose sha256 differs from run.json's is refused", () => {
  expect(() => adoptLayout(withTamperedCandidate(), deps)).toThrow(/sha256/)
})

test("G2.1: a candidate whose canonical artifact hash differs is refused", () => {
  expect(() => adoptLayout(withTamperedMetrics(), deps)).toThrow(/canonical/)
})

test("G2.2: a rules file that changed since the run is refused, so no parameter is slipped in after", () => {
  expect(() => adoptLayout(withChangedRules(), deps)).toThrow(/rules/)
})

test("G2.2: changed span data or pin-pattern data is refused, each named", () => {
  expect(() => adoptLayout(withChangedSpanData(), deps)).toThrow(/lead-span/)
  expect(() => adoptLayout(withChangedPinPatterns(), deps)).toThrow(/pin-pattern/)
})

test("G2.2: on a B1-frozen run, a changed frozen fixture is refused", () => {
  // B2: the fixture is hashed like any other input, so a silently edited
  // benchmark surfaces as a changed hash rather than as a quietly easier test.
  expect(() => adoptLayout(withChangedFrozenFixture(), deps)).toThrow(/fixture/)
})

test("G2.3: a provenance chain that does not start from the board as it now is is refused", () => {
  expect(() => adoptLayout(withStaleSourceBoard(), deps)).toThrow(/provenance/)
})

test("G2.4: a veroroute commit differing from veroroute.pin is refused", () => {
  expect(() => adoptLayout(withOtherPin(), deps)).toThrow(/veroroute\.pin/)
})

test("G2.4: a built commit differing from EITHER is refused, separately", () => {
  // The pin is what was intended and builtCommit() is what ran. They have
  // disagreed once already and every figure in COST and MOVE went through the
  // disagreement.
  expect(() => adoptLayout(withOtherBuiltCommit(), deps)).toThrow(/built/)
})

test("G2.4: an UNKNOWN built commit is refused rather than taken as agreement", () => {
  expect(() => adoptLayout(withUnknownBuiltCommit(), deps)).toThrow(/unknown/)
})

test("G2.5: a non-admissible verdict is refused, including valid-below-target", () => {
  // The adoption gate admits only `admissible`, so valid-below-target is a
  // layout the pipeline reports and does not adopt.
  expect(() => adoptLayout(withOutcome("invalid"), deps)).toThrow(/invalid/)
  expect(() => adoptLayout(withOutcome("valid-below-target"), deps))
    .toThrow(/valid, below target/)
})

test("G2.6: an uncommitted layout is refused unless --allow-dirty", () => {
  // Exactly how update and stripboard already behave, so git stays the undo.
  expect(() => adoptLayout(withDirtyBoard(), deps)).toThrow(/--allow-dirty/)
  expect(() => adoptLayout({ ...withDirtyBoard(), allowDirty: true }, deps)).not.toThrow()
})

test("every refusal names what is missing, where to fix it, and why it is not defaulted", () => {
  // THE PREVIOUS VERSION asserted non-empty, a file extension, and length > 80
  // under a name promising three things - so "why it is not defaulted" was in
  // the title only, and a message that named a file twice satisfied it. Each of
  // the three clauses is now its own assertion, and the refusal's own id has to
  // appear so the message cannot be generic across ten cases.
  const ids = new Set<string>()
  for (const [label, build, id] of EVERY_REFUSAL) {
    let message = ""
    try { adoptLayout(build(), deps) }
    catch (error) { message = error instanceof Error ? error.message : String(error) }
    expect(message, `${label}: nothing was thrown`).not.toBe("")
    expect(message, `${label}: which refusal fired`).toContain(id)          // what is missing
    expect(message, `${label}: where to fix it`).toMatch(/\.(ts|json|pin|vrt)|run\.json/)
    expect(message, `${label}: why it is not defaulted`).toMatch(/not defaulted|rather than/)
    expect(message.length, label).toBeGreaterThan(80)
    ids.add(id)
  }
  // Ten distinct refusal ids across ten cases: one generic message for all ten
  // would satisfy every assertion above except this one.
  expect(ids.size, "each case must produce its OWN refusal").toBe(EVERY_REFUSAL.length)
})

test("a refused adoption leaves boards/** byte-identical", () => {
  const before = gitStatusPorcelain("boards/")
  for (const [, build] of EVERY_REFUSAL) {
    try { adoptLayout(build(), deps) } catch { /* the refusal is the subject */ }
  }
  expect(gitStatusPorcelain("boards/")).toEqual(before)
})

test("after adoption, make check is the verdict and a failure is a reverted adoption", () => {
  // G4: an adopted board on which make check does not exit 0 is a failed
  // adoption and is reverted. The gate runs it and reverts rather than leaving
  // the board behind for somebody to find.
  const result = adoptWithFailingMakeCheck()
  expect(result.reverted).toBe(true)
  expect(gitStatusPorcelain("boards/")).toEqual([])
})
```

  `EVERY_REFUSAL` is a list of `[label, build, id]` triples whose `id` is an `AdoptRefusal`, and the test file asserts the set of ids it carries equals the `AdoptRefusal` union — so a refusal added to the type without a case here fails rather than going untested.

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement**, with `AdoptRefusal` exhaustive over the ten cases above and a `switch` the type checker proves complete. The verb runs `make -C boards/<board> check` after copying and **reverts the copy** when it does not exit 0.

- [ ] **Step 4: Prove the gate can fail.** Comment out each refusal in turn and confirm its test fails — ten mutations, each recorded beside its test. **Then comment out the `switch`'s default and add an eleventh refusal id**, and confirm the type checker catches it: a gate whose refusal set can grow silently is a gate with an unchecked case.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("One gate admits a layout, and it refuses ten things by name"), push.

---

### Task 25: Admitting the buildability verifiers to `make check` — OWNER-BLOCKED (OB2)

**This task is blocked on the owner reviewing CRITERIA, whose status is `draft-for-owner-review`. `G4`'s second admission condition is "the criterion has been reviewed by the owner". Do not implement it before that review.**

**Files:** modify `tools/perfboard/check.ts` and `make/board.mk`; test `tests/perfboard/check.test.ts`.

**Interfaces:**
- *Consumes:* `netlistEquivalence` (4), `gradeHardConstraints` restricted to `HC5`, `HC8`, `HC9`, `HC10` (14).
- *Provides:* `make check` additionally failing a board whose copper joins two nets, whose span is outside its part's reach at either end, or which carries a footprint whose pin pattern the strips cannot take.

**What this is for, and the distinction an earlier wording collapsed.** The invariant is about **who authorises a criterion**; it says nothing about who writes the code that tests one. Read as forbidding both, `make check` — *"the repository's main verification command, the one that runs on boards a human laid"* — would stay **permanently weaker than the adoption gate**, on exactly the constraints that catch a board that does not conduct.

**All four of `G4`'s conditions must hold for each check admitted**, and the third is the one this task does work for: *"the check is independently tested, including **negatively**: a fixture it must reject, by name. A check that cannot fail is not admitted."* Tasks 2, 4 and 14 built those fixtures; this task wires the checks in and asserts the fixtures still fail through the new path.

- [ ] **Step 1: Confirm the review happened and record it.** The criterion set is CRITERIA; the review is the owner's. Record in the commit message which criteria were reviewed and when. **If the review has not happened, stop: the checks keep running on the adoption path, which is `G2.5`, and `make check`'s verdict is unchanged.**

- [ ] **Step 2: Write the failing test.** For each of `HC5`, `HC8`, `HC9`, `HC10`: `checkPerfboard` on the healthy board passes; `checkPerfboard` on that constraint's negative fixture fails **naming the constraint and the offending net or part**; and the message arrives through `PerfboardResult.report` rather than only through a thrown error, because `make check`'s output is what a person reads.

- [ ] **Step 3: Implement**, reading every threshold from `stripboard/rules.json` or from a committed data module and **refusing rather than defaulting** when one is missing — `G4`'s fourth condition, which is what keeps an admitted verifier from deriving a criterion of its own.

- [ ] **Step 4: Run `make check` over every board and read the whole output.** The red set will grow if a committed board violates one of the four, and **that is a finding rather than a regression**: `pt2399-core` carries three footprints with no span data (`PAR2` refuses by name) and a 17 × 36 pin extent against 34 × 27 stock (`OB4`). **`HC6` is deliberately not admitted here** for that reason. If `HC5`, `HC9` or `HC10` turns a passing board red, report it to the owner with the board, the part and the derived bound, rather than relaxing anything.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("make check gains the buildability verifiers the adoption gate already had"), push.

---

## What this plan does NOT deliver

- **The five layouts — and they are the parent's `S1`, not a gap here.** This plan builds the pipeline; the layouts are its output. No part is placed here and no `.vrt` is written by hand. Task 23 produces one layout, for the frozen fixture, to answer `V3`. The four remaining Pultec sections *"laid out, built and measured against the model's predictions"* is **`S1`** in `2026-10-08-agent-authored-boards-design.md`, which was made to depend on `S1a` on 2026-10-10 and which records that *"what remains the owner's in S1 is the build and the measurement."* **No milestone is added here for it**: a deliverable stated in two documents is a deliverable that diverges, and `S1` is the row with the dependency edge and the gate. See the scope boundary at the top of this plan.
- **`HC8`'s board-level short fixture** — `OB5`, Task 6, blocked on how such a board is produced.
- **`make check`'s new verifiers** — `OB2`, Task 25, blocked on the criteria review.
- **A settled `τ` or `Q4` threshold** — `OB3`. Both are in the rules file as proposals and the report says so.
- **`HC6` enforced outside the Pultec set** — `OB4`. `pt2399-core`'s extent exceeds the declared stock and it is a board that works.
- **A constrained cut floor.** Limit `H-2`: what the floor becomes when either span bound binds is undetermined, so the pipeline reports the shortfall and never a second floor.
- **A track-length term.** Limit `H-11`: the geometry is readable but no track-length measure is derived here, so `R3`'s wirelength term stays labelled a proxy.
- **A worse-acceptance schedule.** `PAR3`: no default, so E3 does not run unless configured, and the report says so.
- **`PlaceFloaters`' scaling.** Limit `H-7`, undetermined, and it bears on search breadth rather than on correctness. Measure it on a board substantially larger than mid if breadth becomes the binding problem.
- **A manual per-part buildability audit.** Declined with its reason: the span bounds are data and belong in a gate, a manual step's failure mode is that it is silently not performed, and *"is this span shorter than the body"* is a comparison of two integers.
- **`G5`'s independent reviewing agent.** It stays available as the parent's third channel and as the one way legibility may enter; it is a process, not a module, and nothing here automates it. The layout is still rendered and read before anyone calls it good.
- **Anything in the parent's `T1`–`T6`.** PCB place and route, schematic generation, board synthesis and the rule library are other sub-projects.

---

## Self-review

### Spec coverage: every specified thing, and the task that implements it

| specified | task |
| --- | --- |
| `OBJ1` — `F = C + ρ_w·W + ρ_s·B` | 12 |
| `OBJ2` — no legibility term, and none may be added | Global Constraints; 15 and 22 are the tests that keep it true |
| `OBJ3` — the lexicographic ranking and `A_occ` | 15 |
| `HC1` net completeness, `HC7` schematic delta | 14 (`parseCheckReport`) |
| `HC2` `CUT_STATE COMPUTED`, and `J < 0` as a cheap second reading | 12, 11 |
| `HC3` nothing floating, both signals | 14; fixture already committed |
| `HC4` the tool's span range | 14 |
| `HC5` `maxSpanHoles`, `HC9` `minSpanHoles`, refusing without data | 14 |
| `HC6` occupied extent against the stock | 14 (the **fabrication extent** in `extent.ts`, from `BOUNDS` in 7 unioned with the required features; `OB4` bounds its scope) |
| `HC8` copper-derived netlist equivalence, contract, independence, **malformed-geometry refusal** | 3, 4, 5; board-level short fixture **6 (blocked)** |
| `HC10` pin pattern — **footprint half** | **2** |
| `HC10` *"every placed part's pins lie on straight lines parallel to the strips"* — **placement half** | **14** (needs `DIRECTION` from 7, which 14 already depended on) |
| `A1` all ten hold | 14 |
| `B1-frozen`, `B2` | 5, 23 |
| `B1-current` | 20 (`A4`'s second clause, which is `A3`'s bound on that board) |
| `K1` `κ` and the drive target | 11 |
| `K2` `κ_bench`, `K3` the ratchet | 10 (the value and its note), 20 (`A2`) |
| `K4` `τ` | 10, 19, 20 |
| `K5` `F ≥ F_floor` | 12 |
| `Q1`–`Q6`, and that `Q1`/`Q2` require admissibility | 19 |
| `A1`–`A4`, `REP1`–`REP5` | 20 |
| `PAR1` the two weights | 10 |
| `PAR2` the span bounds | already landed in `lib/kicad/lead-span.ts`; consumed by 14 |
| `PAR3` the strict rules file, E3's absent default | 10 |
| `PAR4` circuit-independent criteria, the stock as a board field | 10, 14 |
| `G1`, `G2.1`–`G2.6` | 24 |
| `G3` run directories, `boards/**` untouched | 13 |
| `G4` `make check` and the four admission conditions | **25 (blocked)** |
| `G5` what remains a human's | not a module; named in "does NOT deliver" |
| M1.1 `BOUNDS`, `DIRECTION`, the false `--help` SPAN claim | 7 |
| M1.5 rotate | 8 |
| M1.6 batch via `CaptureBoardDump` | 9 |
| M1.7 / `HC8` | 3, 4, 5 |
| publishing M1.3/M1.4 | 1 |
| `P0`–`P4` | 11, 16 (`P1` as three arms with a random control, run at 18), 17, 20, 20 |
| §5.1 replacing `--import`'s placer | 16 (three starting arms, of which the construction is one and `--import`'s own placement is another, **measured against a random control** rather than replaced by assertion; the run is Task 18's final step) |
| §5.2 the two levers; the no-fourth-join-mechanism correction | 3 (the edge set), 17 and 18 (the moves) |
| §5.4 the `SIP5` as a fixed sub-arrangement | 16 (the constructed arm; it goes with that arm if the arm is retired) |
| `R1` strict rules, `R2` generate-and-grade, `R3` declared ranking, `R4` two-condition termination, `R5` run directories, `R6` hashed manifests, `R7` seeded determinism, `R8` injected spawn, `R9` the Makefile pattern | 10, 14, 15, 19, 13, 13, 16/18/21 (`seededPrng` is declared in 16, used by 18, compared by 21), 16, 23/24 |
| `N1`–`N5` do-not-reuse | nothing to implement; honoured by using an integer grid, no mm geometry, no KRT, no `policy.ts`, and never writing a `.vrt` |
| `E1`, `E2`, `E3`, plateau moves | 18, 17 |
| `V1`, `V2` | 12 |
| `V3` | 23 |
| `V4` | 14 (**twelve** fixtures: one per constraint, **two for `HC10`** — footprint and placement — and **two for `HC6`** — over-stock, and a feature outside `BOUNDS`), 2 and 4 (their own) |
| `V5` | 22 |
| `V6` and §10.1's split | 13, 21 |
| `V7` | 13 |
| `V8`, `V10`, `V12` | 20 |
| `V9` | 22 |
| `V11` | 3, 4 |
| `R2`'s split and `HC8`'s independence asserted **structurally**, over the transitive import closure rather than by a text scan | 4 (the helper and `HC8`'s use), 14 (the grader's), 18 (the search's determinism scan) |
| `HC8`'s refusal of malformed geometry — nine enumerated refusals, each with a fixture | **3** |
| `HC8`'s trust boundary stated where the independence is claimed | 3 (the module comment and `pipeline-verification.md`), 20 (printed beside an `HC8` pass) |
| Integration checkpoints — the grader against four hand-laid boards; the chain end to end | **Checkpoint 1** (Task 14, final step), **Checkpoint 2** (Task 20, final step) |
| The seed-set success rate, **diagnostic and bound to no threshold** | 23 |
| The starting-point comparison — **three arms with random as the control**, the declared decision variable and the retirement rule | 16 (the arms, the harness, the rule), 18 (the run and the recorded result) |
| The `S1` boundary — the five layouts are the parent's row, not a milestone here | the scope boundary at the top, and "does NOT deliver" |

### Gaps — specified things with no task, each recorded rather than filled

1. **`HC10`'s placement-level half is now BUILT (Task 14), and what remains is a wording divergence for the owner.** `HC10` is worded about a *placement* — *"every placed part's pins lie on straight lines parallel to the strips"* — while CRITERIA's "Checked by" column specifies a **footprint-level** check refusing a non-decomposable family by name before any placement exists. The previous revision implemented only the footprint half (Task 2) and recorded the rest as a gap, **while `A1` asserted `HC10` held** — which is this plan's own crux applied to itself: *"a constraint whose check silently passes is worse than no constraint, because the verdict claims it held."* So Task 14 now implements the placement half over each placed part's `PIN` holes and its `DIRECTION`, both halves must hold for `HC10` to hold, and each has its own negative fixture. **The residual gap is a documentation one and it is reported rather than resolved:** CRITERIA's "Checked by" column still names only the footprint check, so the owner may read the placement half as outside `HC10`. If he does, it is deleted — one function and one fixture — and the original gap is restored. **No `ConstraintId` was added**; there are still exactly ten, because both halves are clauses of one criterion sentence.
2. **`HC6`'s quantity diverges from CRITERIA's wording, and the plan computes rather than reinterprets.** CRITERIA calls `BOUNDS` *"the exact figure"* that *"tightens the check"*. Read against `Src/Board.h:710`, `BOUNDS` is the union of painted copper and pins, every component's footprint rect **without a `GetIsPlaced()` filter**, and every **text label**'s rect — so it can over-state the material a board needs and it is not a statement about which features a cuttable board must retain. Task 14 therefore computes a **fabrication extent** over `BOUNDS` unioned with every required feature hole, which is conservative in the only direction that matters, and verifies that trimming to it preserves the reconstructed connectivity. **What is not resolved here:** whether `HC6`'s stock figure should be compared against a figure that a text label can inflate, and whether the fork should decompose `BOUNDS` into its three sources. Both are the owner's, both are recorded in `docs/stripboard/pipeline-verification.md`, and **neither CRITERIA nor the fork's dump grammar is changed by this plan on the strength of them.**
3. **`HC8`'s board-level short fixture** — `OB5`. Task 6 exists and is blocked. The module-level short is tested; the *"no pre-existing check catches it"* claim is not proven.
4. **`A_occ`'s role in the three outcomes** — CRITERIA §10.5 records it as a question and does not answer it. **This plan's reading is that a ranking term never bears on the verdict**: Task 15 puts `A_occ` in the ranking only, Task 17 asserts it cannot make the search accept a worse `F`, and Task 20's `A1`–`A4` never read it. That reading is consistent with `OBJ3` and it is **not an answer to the question** — if the owner decides a ranking term may bear on the verdict, Task 20 changes.
5. **A full `A1` grade of `pt2399-core` is impossible today**, because it places three footprints with no span data (two `UNSOURCED`, one in neither map) and its 17 × 36 extent exceeds the declared stock. Not a gap in the plan — `PAR2`'s refusal and `HC6` are both correct — but it means PIPELINE §3.5's benchmark set validates the grader through `HC8` only, which Task 5 states and no task contradicts, and **Checkpoint 1 expects the refusal and records it rather than treating it as a failure** (`OB4`).
6. **Nothing in CRITERIA is a RELIABILITY criterion, and Task 23's seed-set success rate is not one either.** `B1-frozen` is a single-run criterion, and the suite has nothing that says how often a run should reach its target. The rate Task 23 reports is **explicitly a diagnostic**, bound to no threshold, changing no verdict and no exit code, because a threshold the implementing agent invents is the governing invariant's failure. **The gap is that the suite has no reliability criterion at all** — a question for the owner, and one he can now answer with measurements instead of a guess, which is the point of reporting the rate before anyone asks for a bar.
7. **`HC10`'s placement predicate is decided by this plan, the way Task 2 decides its footprint predicate**, and it is load-bearing in the same way. The predicate is: a placed part's `PIN` holes must occupy exactly the strips its footprint's row decomposition predicts, consistent with the part's `DIRECTION`. **What the suite does not state** is how a `DIRECTION` of `E` relates to one of `W` for a symmetric footprint, or whether a single-row part is compatible in every direction — both are decided in Task 14 as "yes, because a single row lies along any strip it is on", and a reviewer who disagrees should reject Task 14's placement half rather than Task 2.
8. **"Trimming to the extent preserves connectivity" is this plan's reading of `HC6`'s intent, not a criterion in the suite.** `HC6` says the layout *"fits the stock"* and names the occupied extent as the quantity; it does not say the trimmed board must still conduct. That is implied by *"can be cut from that board"* and the implication is where the verification comes from, but **it is an implication and it is labelled as one**: if the owner reads `HC6` as a pure size comparison, `trimPreservesConnectivity` becomes a reported measurement rather than part of the `HC6` verdict, and the change is one conjunct in `constraints.ts`.
9. **The suite says nothing about where a search should start, and this plan does not fill that in — it measures it.** `P1` names a construction and CRITERIA names no criterion about a starting point at all, so Task 16 runs the construction as one arm of three against a random control and records the result. Two things are worth a reviewer's eye. **The quality mark is borrowed, not authored**: it is `B1-frozen`'s own clause on the frozen fixture, and for any other board it is a required parameter the harness refuses without, because a bar this agent chose would be an acceptance criterion authored by the producing agent. **The retirement rule is an engineering decision about the pipeline's internals and not a criterion about a layout**: it is declared before the run, it changes no `outcome`, `bound`, verdict or exit code, and what it produces is a `retireable` list nothing in the pipeline reads. **No arm is selected by this plan**; the arm is a required selection with no default, and if the owner reads the retirement rule as his to set rather than the plan's to declare, `RETIREMENT` and `retireable` are the two things to reject and the per-arm table survives them.
10. **Limits `H-1`, `H-3`, `H-7`, `H-12`** are undetermined in the suite and remain so: whether the span data covers every family (the module refuses by name where it does not), whether `C = 0` is attainable (*"run P1 once M1.4 and M1.5 exist, and read the result"* — Task 16's constructed arm is the construction that would reach it and **Task 18's final step is the run that reads it**, now against two other arms rather than alone), `PlaceFloaters`' scaling, and where the two definitions of `S_occ` diverge (`V2`'s per-candidate identity check is what would surface it). Each is named in "does NOT deliver" or in the task that would read it.

### Placeholder scan

**The previous revision's scan said "none present" and was wrong**, and how it was wrong matters
more than the finding. It searched for `TBD`, `TODO`, `appropriate`, `as needed`, `similar to`,
`etc.`, `and so on`, `handle errors`, `various` — a **vocabulary** scan — and Task 5 contained
this:

```ts
test("HC8 rejects the floated-C19 board from the copper side, not only HC3's side", () => {
  const text = Bun.file("tests/fixtures/pultec-low-boost-c19-floated.dump")
  expect(text).toBeDefined()
})
```

No placeholder word in it, an assertion that cannot fail — `Bun.file` is defined for a path that
does not exist — and a name claiming the rejection. The plan even said "replace the
placeholder-shaped test while implementing", which is a note that survives exactly as long as
somebody reads it. **A vocabulary scan cannot find a placeholder written in correct-looking
code**, so this revision scans bodies as well as words.

**This pass, re-scanned both ways:**

- **Vocabulary**, as before: none present.
- **Bodies.** Every test body in this plan read against its own name, looking for four shapes: an
  assertion that holds for any input (`toBeDefined` on a non-nullable, a loop whose predicate is
  true by construction); a name or comment claiming more than the body establishes; a claim about
  an external file that never opens one; and a clause present in a name and absent from the body.
  **Nine were found and all nine are fixed**, each with a comment beside it recording what the
  replaced version did and why it passed. They are listed in the audit table below, which is part
  of this scan rather than an appendix to it.
- **Helpers.** Where a test body uses a helper that is not spelled out — `healthyInput()`,
  `scriptedSpawn()`, `fixture()`, `mutate()`, `placeAcrossSeeds()` — the helper's contract is
  stated in prose beside it, and in the cases where a weak helper would make a test vacuous
  (`mutate` returning its argument, `fixture` editing the committed file, `importClosure`
  returning only direct imports, `readFootprintPads` skipping a missing library, `PIPELINE_SOURCES`
  matching nothing) the plan requires **an assertion about the helper itself**. Three of those five
  guards-on-the-guard are new in this revision, and the closure one is new because the closure is
  new.

One deliberate forward reference, which is not a placeholder because it names the task and refuses rather than skips: Task 17's `applyMove` **throws** for `{ kind: "cluster" }`, naming Task 18, until Task 18 implements it.

**Task 16's rewrite was scanned the same way, both ways, and three of its tests carry a guarantee
weaker than the property they are about.** All three say so in their own comments rather than in
their names: the no-default-arm test establishes that the selector refuses and not that the type
requires (the type checker is what proves that half); the draw test establishes the index map over
the admissible set and not that the stream is uniform; and `evaluationsToCross` is **named a
crossing**, because an `F` at the mark's objective is necessary for the mark and not sufficient —
`C = 4` with four wire bridges scores 5 at `ρ_w = 0.25` and fails `B1-frozen`'s `W = 0`. Three
further shapes the scan went looking for and did not find: a loop over a collection that could be
empty (every loop over `SEED_ARMS` asserts its length first, and the draw test asserts the
admissible set has more than two members), a scripted table that could answer a row it has none
for (each throws), and a text scan standing in for a structural claim (there is none in this task).
**Task 16's second step is a comparison and not a construction, so there is no step whose only
output is the plan's own opinion.**

### The mislabelled-test audit, in full

Every test whose name or comment claimed more than its body established. Two were the review's
findings; **seven more came out of auditing the rest on the same criterion.**

| task | test, as it was named | what the body actually did | fixed how |
| --- | --- | --- | --- |
| **2** | *"every recorded pad count agrees with the footprint file the pads came from"* | compared `pattern.pads.length` with `pattern.source.padCount` — **two fields of the same hand-written literal**, never opening a file | **opens the `.kicad_mod`**, compares the pad count, every pad's recorded `(at x y)` and the `(version …)` token; `excludedPads` accounts for any pad not transcribed; the helper **refuses rather than skips** when the library is unresolvable |
| **14** | *"the grader shares no code with the scorer"*, commented *"asserted by reading the import graph"* | `expect(text).not.toContain("score.ts")` on two files for three names — **any transitive import satisfies it** | **transitive import closure**, with `rank.ts` added to the forbidden set because it reaches the scorer, plus a test asserting the intended sharing of `dump.ts` |
| **4** | *"this module imports nothing from the scorer or from the check path"*, same comment | same substring scan on one file — **the same defect, found by the audit rather than by the review** | same closure, same helper; the `nodeId` half is split out and **named as a scan**, with the behavioural independence test identified as the actual guarantee |
| **5** | *"HC8 rejects the floated-C19 board from the copper side"* | `expect(Bun.file(path)).toBeDefined()` — **a placeholder that cannot fail** | the real test: read the floated dump text, build the reference nets, assert `netlistEquivalence(dumpText, reference)` throws, **anchored with `toStartWith` on the refusal's own opening clause** — `toThrow(/C19\./)` plus `toThrow(/PIN/)` is the very defect row 4 of this table records, since the neighbouring `hole-outside-copper-graph` refusal also matches `/PIN/`; a third break added so the test itself can fail |
| **5** | *"the frozen fixture's own numbers are read from it"* | asserted `grid.rows > 0` — **"numbers" was one inequality** | renamed to what it checks, and `B2`'s actual benchmark added as its own test: the export's net and pin counts against the dump's own `NODE` and `PIN` lines, both sides read |
| **11** | *"off-board components force no edge"* | asserted each edge's endpoints were known nets — **true by construction** | the discriminating pair: an off-board-only net pair must be absent **and** an on-board pair must be present; two mutations, because either half alone passes a wrong implementation |
| **15** | *"RANKING states the order and a reason for each position"* | `RANKING.length > 400` — **one long sentence satisfies it** | asserts all five terms are named **in the tuple's order** with prose between each; records that no test can prove prose is a *reason* and that this is the owner's judgement at review |
| **18** | *"nothing in the search consults a clock, a pid, a temp path or a directory listing"* | scanned **two** files, while the search reaches a dozen | scans every file in the transitive closure, **and writes down what a scan still cannot see** (aliased access, other spellings), naming Task 21's run comparison as the guarantee |
| **19** | *"every threshold comes from the rules file and none is written here"* | scanned for three specific literals — **"every" is not scannable** | renamed to *"a literal scan … - a scan, not a proof"*, uses `V9`'s shared `BARE_LITERAL`, and a **behavioural** test added: every rule's threshold must move when the rules file's value moves |
| **20** | *"REP3: the wording is generated from the fields, not written per run"* | asserted `report.ts` contains `"WORDING["` | renders **every** `bound` × `outcome` combination and asserts each quality line is a table entry verbatim |
| **21** | *"a run that takes twice as long reproduces, **and one that differs does not**"* | tested only the first clause — **the second was in the title** | both clauses asserted, plus a guard that the two scripts really do produce different metrics |
| **22** | *"V9: every numeric literal in the pipeline traces to a rule, a datum or a derivation"* | a bare-literal regex, which misses a small integer, `5e-2`, and a composed value | renamed to *"V9's mechanical half: a literal scan …"* with its blind spots written out; `PIPELINE_SOURCES` **derived and asserted non-empty**, and the regex asserted to match a known literal so the scan is not vacuous |
| **24** | *"every refusal names what is missing, where to fix it, **and why it is not defaulted**"* | non-empty, a file extension, length > 80 — **the third clause was unasserted** | one assertion per clause, the refusal's own id must appear, and the ten ids must be **distinct**, so one generic message fails |

**One shape was deliberately left weak and is labelled, not fixed:** Task 4's `nodeId` text scan.
The closure cannot see it — reading `.nodeId` off a value whose type already crossed the boundary
is a use, not an import — and the behavioural test beside it (the verdict is unchanged when the
`NODE` block is emptied and the `CUT` ids garbled) is the real guarantee. So the scan keeps its
place as a cheap early warning **under a name that says scan**, which is the whole distinction
this audit is about.

### Type consistency across tasks

Checked every exported name that crosses a task boundary. Resolved inconsistencies:

- **`CheckReport` does not exist in `tools/perfboard/check.ts`.** An earlier draft of Task 14 said it did. Corrected: `check.ts` returns `CheckRun { status, output }` — raw concatenated output, deliberately — and Task 14 adds `parseCheckReport(run: CheckRun): CheckReport`, with the absent-heading rule from `check.ts`'s own comment.
- **`reportLines` already exists** in `tools/cli/perfboard-support.ts`. Task 20's renderer is therefore `renderReport`, not `reportLines`.
- **`SeedInput` keeps its name and changes two fields**: `arm: SeedArm` and `seed: number` are required, `assignment` is gone, and `seedCandidate` dispatches on the arm. Tasks 17, 18 and 23 import `seedCandidate` as before.
- **`seededPrng` has one owner, and it is Task 16**, because the random arm is its first user; Task 18 imports it. The same resolution as `BARE_LITERAL`'s, for the same reason: one algorithm declared twice is one claim in two places, and two runs claiming one seed is the exact failure.
- **`SeedArm` is declared in `seed.ts`** and imported by `run-dir.ts`'s `CanonicalInputs` (Task 13) and by `SearchInput` (Task 18). It is an enumerated union rather than a bare string for the reason `GeometryRefusal` and `FeatureKind` are: a set that can grow silently is a set with an unchecked case, and `parseSeedArm` is where text becomes one.
- **`Pin` collides**: `tools/guide/dump.ts` exports `Pin { pin, row, col }` and `tools/perfboard/acquire.ts` exports `Pin { repo, commit }`. Both are pre-existing and neither is renamed; every task that imports one imports it with its module path and no task imports both into one file. Task 16's `SeedInput` therefore does not name a bare `Pin`.
- **`SpawnVeroroute`** is declared once. Task 16 re-exports whatever `tools/perfboard/check.ts` already declares rather than declaring a second spawn type; if `check.ts` declares none, Task 16 declares it and Tasks 17, 18, 23 and 24 import it from there.
- **`occupiedStrips` / `segmentJoins` / `clustering`** live in `tools/stripboard/targets.ts` only (Task 11), and Task 12 imports them. The identity has one implementation, which is what `V2` is checking against.
- **`admissible`** lives in `tools/stripboard/verdict.ts` (Task 20) and Task 19 imports it. Task 19's step 3 states the sequencing explicitly, because the alternative — a local admissibility predicate in `stop.ts` — is a second copy of `A1`–`A4`.
- **`a1`** lives in `tools/stripboard/grade.ts` (Task 14) and `verdict.ts` imports it; `verdict.ts` does not re-derive the conjunction.
- **`Stock`** is declared in `grade.ts` (Task 14) and read by Task 24's gate through the manifest's hashes rather than by importing the type.
- **`BoundStatus` / `Outcome` / `StoppingRule`** are declared once each — the first two in `verdict.ts`, the third in `stop.ts` — and `run-dir.ts`'s `CanonicalMetrics` carries them as `string` deliberately, because a manifest read from disk is untyped text until it is validated and a structural type there would assert a validation that had not happened.
- **`ConstraintId`** is the single vocabulary for the ten constraints and is used in `constraints.ts`, `grade.ts`, `stop.ts`'s signatures and `run-dir.ts`'s `constraints` record keys. **It is still exactly ten members after `HC10`'s split**, because `HC10`'s two halves are two private functions behind one table entry and one id — a tenth-and-a-half constraint would have broken `A1`'s cardinality test, the manifest's `constraints` record and `V4`'s row set at once.

**Resolved in this revision, over the types it adds:**

- **`PinPattern` and the other six pin-pattern types live in `pin-pattern-model.ts`, not in `pin-pattern.ts`.** The first draft of this revision listed them all under Task 2 without saying which module, and `admitPattern(pattern: PinPattern)` is in the model file — so a `PinPattern` declared in the data file would have made the arithmetic depend on the data, inverting the split whose entire purpose is that the arithmetic cannot have been written to match the transcription. `pin-pattern.ts` declares **no type**, exactly as `lead-span.ts` declares none.
- **`BARE_LITERAL` had two owners**, which is the same class of bug as the three the previous pass caught. One passage said it was "Task 22's regex" that Task 19 imports; the next said to write it in Task 19 and have Task 22 import it. **Resolved: Task 19 declares it in `tests/stripboard/bare-literal.ts` and Task 22 imports it**, because Task 19 comes first and the pattern must exist before its first use — and the file also owns the `lastIndex` discipline a shared global regex needs.
- **`readFootprintPads`'s return type was declared twice**, once inline in Task 2's Interfaces and once as `FootprintPads` in the implementation. Resolved: named `FootprintPads` in both.
- **`HoleKey` crosses into `extent.ts`** and was missing from Task 14's *Consumes* list while `RequiredFeature` used it. Added, with `pinHoles`, which `trimPreservesConnectivity` needs to compare partitions by pin rather than by component id.
- **`withinExtent` was used in a Task 14 test and declared nowhere.** Resolved: it is an export of `extent.ts`, not a test-local helper, because the predicate "is this hole inside the extent" is the one `HC6` applies and two implementations of it is exactly how the extent and the constraint come to disagree.
- **`TrimVerdict`** is named rather than left as an inline object literal in `trimPreservesConnectivity`'s signature, so `HC6`'s detail can be typed against it.
- **`SeedSweep`** (Task 23) carries `singleRunVerdict` and `reportedOutcome` as two fields of type `Outcome`. They are deliberately the same type so the test can assert equality; a sweep type that reported only one of them could not express the property that the rate changes no verdict.
- **`GeometryRefusal`** (Task 3) is a nine-member union with a `switch` over it for the messages, and `FeatureKind` (Task 14) is a four-member one. Both are enumerated types rather than bare strings for the same reason `AdoptRefusal` is: a set that can grow silently is a set with an unchecked case.
**Six defects in the plan's own test fixtures, found by running the printed implementation against
the printed tests on paper.** This is the pass the previous revision ran over *names* and not over
*values*, and every one of these would have failed on the first `bun test` of its task:

1. **Task 2's DIP test expected `rowPitchSteps` of `[3]`** while the `classifyPads` printed twenty
   lines above it tries axis `x` first and returns `[1]` for that pad set. Fixed to `[1]`, with the
   axis asserted explicitly and the tie-break justified against the real `DIP-16_W7.62mm`, whose
   sixteen pads give eight rows one step apart (measured). A second test now classifies the file's
   own pads, so the tie-break is checked against a footprint and not only against four corners.
2. **Task 2's off-grid test put the offending separation on one axis only** — pads at `(0,0)`,
   `(2.54,0)`, `(0,2.94)`, `(2.54,2.94)` — and expected `off-strip-lattice`. But grouping by `x`
   gives two rows exactly one step apart, so `classifyPads` returns `rows` on axis `y`. **A 2×2 pad
   field decomposes whenever either axis is on the grid**, so the refusal test now puts the
   separation off-grid on both, and a control test asserts the one-axis case *does* classify.
3. **Task 3's `VERTICAL_STRIPS 1` test would have been broken by the new `cut-across-strips`
   refusal.** It flipped the axis line and left `CUT 0,1 0,2`, which is one strip horizontally and
   **two different strips** vertically — malformed under the new validation, so the test would
   throw instead of building a graph. The cut now moves with the axis. **This is the shape to look
   for whenever a validation is added under existing fixtures**, and it is why finding 3's nine
   refusals were each checked against every board already in the task.
4. **Task 4 passed `{ ...Object.fromEntries(REFERENCE) } as never`**, which is a typing bypass
   `CLAUDE.md` forbids and also a pointless round trip — `REFERENCE` is already a `ReferenceNets`.
   Removed. The test's name claims opens and shorts are *"reported separately"*, so both lists are
   now asserted non-empty rather than only the conjunction they imply.
5. **This revision's own first draft of the spurious-accommodation test used `as never`** to build
   a `DatasheetRef` out of a `PadSource`. Fixed by borrowing the ref from an entry that
   legitimately has one — a test reaching for a cast is usually a test building a value the types
   say cannot exist, which is a finding about the types or about the test and never a cast.
6. **The ring fixture was verified rather than assumed.** `ring(11, 8)` must refuse on *both* axes
   or the both-axes test proves nothing; computed, it has ten off-grid gaps grouped by `y` and four
   grouped by `x`, so it genuinely refuses either way.

- **No new name collides with an existing export.** Checked against `lib/kicad/`, `tools/guide/`, `tools/perfboard/` and `tools/cli/`: `FabricationExtent`, `RequiredFeature`, `FeatureKind`, `TrimVerdict`, `GeometryRefusal`, `GridAccommodation`, `PatternEligibility`, `FootprintPads`, `SeedSweep`, `importClosure`, `readFootprintPads`, `withinExtent` and `preparedExtentsHoles` are all new, as are Task 16's `SeedArm`, `SEED_ARMS`, `parseSeedArm`, `admissiblePositions`, `QualityMark`, `markObjective`, `ArmRun`, `ArmRunner`, `meetsMark`, `evaluationsToCross`, `SeedRun`, `ArmResult`, `ArmComparison`, `compareSeedArms` and `RETIREMENT`. **`ArmResult` is deliberately not `SeedResult`** and `SeedRun` is not `ArmRun`: an arm has many seeds and a seed has one run, and a name that blurred the two is how a rate would come to be computed over the wrong denominator. **`Bounds`** (Task 7) remains the only name in the extent neighbourhood that already existed, and `FabricationExtent` is deliberately *not* called `Bounds2` or `OccupiedExtent`: the two are different quantities and a near-identical name is how they would come to be used interchangeably.

### Four things a reviewer should push back on if they disagree

**1. `HC10`'s predicate, across both halves.** Task 2 decides the footprint rule — grid-multiple
separation **across** the strips, and an off-grid pitch **along** a row admitted only on a
**recorded** formed-leads accommodation — and Task 14 decides the placement rule. Both are
load-bearing for whether any footprint or any layout is ever refused. The footprint rule is argued
from `TO-92_Inline`'s own pads read off the `.kicad_mod`, from the measurement that it is the only
one of the thirteen that is both off-grid along its row and recorded `formable: false`, and from
`lead-span.ts` already describing its preparation in prose. **The change from the previous
revision is that collinearity is no longer sufficient**: the earlier draft said the along-row
spacing was "unconstrained", which would have admitted any collinear pattern however fine its
pitch. **If the owner reads `HC10`'s along-row clause as genuinely unconstrained, Task 2's
accommodation machinery is the thing to reject**, and `admitPattern` collapses to the across-strip
clause alone.

**2. `HC10`'s placement half existing at all.** It implements `HC10`'s criterion sentence; CRITERIA's
"Checked by" column specifies only the footprint check. The plan's reading is that both are clauses
of one criterion and that implementing only the first while `A1` asserts `HC10` is the defect this
plan calls its crux. **If the owner reads the "Checked by" column as the whole of `HC10`, Task 14's
placement half is the thing to reject** — one function, one fixture, one conjunct — and gap 1
returns to its previous wording. **No other task changes either way**, which is the property that
makes it separably rejectable.

**3. `HC6` being graded against a figure a text label can inflate.** The fabrication extent unions
`BOUNDS` with every required feature hole, and `BOUNDS` includes text-label rects
(`Board.h:710`). The union is conservative — `HC6` can be stricter than the truth and never looser
— and the plan prefers a reported false refusal to a silent false pass. **If the owner would
rather `HC6` not refuse on an annotation, the honest fix is in the fork**: decompose `BOUNDS` into
its three sources, which is a larger change than M1.1 and is recorded as a finding rather than
taken. Rejecting the union sends the work there, not into a looser `HC6`.

**4. The construction being an arm rather than the start.** `P1` says *"seed by construction"*, and
the previous revision read that as settled. This one makes it one of three arms against a random
control, on the owner's three questions: the start only buys the first climb once restarts are
cheap, nothing here establishes which start is better, and a construction whose belief is wrong is
a worse-than-random start wearing a principled costume. **If the owner reads `P1` as the decision
already taken, the thing to reject is the experiment, not the construction** — the constructed arm
is the previous revision's content intact, so rejecting the comparison leaves `assignStrips`, the
`SIP5` sub-arrangement and the span refusal exactly where they were, and what goes is
`seed-compare.ts`, the two other arms and Task 18's step 5. **If instead he reads the retirement
rule as his to set, reject `RETIREMENT` and `retireable` and keep the per-arm table**: the
measurement and the rule for acting on it are separable, and the plan declares the rule before the
run precisely so that it can be argued with while it still costs nothing.
