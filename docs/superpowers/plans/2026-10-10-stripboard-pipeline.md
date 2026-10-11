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
- **Every `HC` check gets a fixture it must reject by name** (V4), and the fixture is part of the task that adds the check, not a later tidy-up.
- The grader imports nothing from `tools/stripboard/score.ts`, and Task 14 asserts that by reading the import graph.
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
| 14 | The grader | After 2, 3–5, 7 and 10: it needs `HC10`'s data, `HC8`'s module, `BOUNDS` for `HC6`, and the rules file for the stock default. **The crux.** |
| 15 | The ranking | After 7 (`BOUNDS`) and 14 (the grader decides which candidates are rankable). |
| 16–19 | P1 seed, P2 climb, the escapes, stopping | In that order: construction before search (*"search is for what construction cannot reach"*), single-part climb before the escapes so the escapes have a baseline to be measured against, stopping last because `Q3` is a restart trigger before it is a stop and cannot be written before restarts exist. |
| 20 | The verdict and the report | After stopping, because `Q1` and `Q2` require the admissibility verdict and the report is keyed by both the `bound` and the `outcome`. |
| 21 | Determinism | After the escapes, because every non-determinism this plan introduces arrives with them, and V6 compares restart boundaries. |
| 22 | V5 and V9 | After the search, because V5 compares the pipeline's placement against `--import`'s on the same board and there is nothing to compare before. |
| 23 | The B1-frozen run | After everything the run needs. It is the externally authored criterion and the first thing the pipeline is pointed at. |
| 24 | The adoption gate | Last of the pipeline, because it refuses on hashes and verdicts that Tasks 13 and 20 produce. |
| 25 | Admitting the verifiers to `make check` | **OB2.** Last, and separable: a reviewer may reject it while approving Task 24. |

---

## File structure

```
veroroute.pin                              advanced by Tasks 1, 7, 8, 9
stripboard/rules.json                      NEW: PAR3's one strict rules file
lib/kicad/pin-pattern-model.ts             NEW: HC10's classification arithmetic
lib/kicad/pin-pattern.ts                   NEW: HC10's per-footprint pad data
docs/stripboard/pin-pattern.md             NEW: why each classification is what it is
tools/stripboard/rules.ts                  NEW: the strict loader
tools/stripboard/targets.ts                NEW: P0 - N, P, C_floor, the net graph
tools/stripboard/score.ts                  NEW: F, the identity self-check, the floor invariant
tools/stripboard/copper.ts                 NEW: HC8's copper graph from the dump geometry
tools/stripboard/equivalence.ts            NEW: HC8's partition comparison and verdict
tools/stripboard/grade.ts                  NEW: A1 over HC1-HC10 - THE CRUX
tools/stripboard/constraints.ts            NEW: one function per hard constraint
tools/stripboard/rank.ts                   NEW: OBJ3's declared ranking and A_occ
tools/stripboard/run-dir.ts                NEW: run directories, canonical hash, manifest
tools/stripboard/seed.ts                   NEW: P1 seed by construction
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
tests/kicad/pin-pattern.test.ts            NEW
```

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

**Files:** create `lib/kicad/pin-pattern-model.ts`, `lib/kicad/pin-pattern.ts`, `docs/stripboard/pin-pattern.md`; test `tests/kicad/pin-pattern.test.ts`.

**Interfaces:**
- *Consumes:* `GRID_MM`, `PITCH_TOLERANCE_MM`, `nearestGridSteps` from `lib/kicad/grid.ts`; `DatasheetRef` from `lib/kicad/lead-span-model.ts`.
- *Provides, and Task 14's `HC10` check consumes exactly these:*
  - `PadPosition { readonly pad: string; readonly xMm: number; readonly yMm: number }`
  - `PadSource { readonly file: string; readonly version: string; readonly padCount: number }`
  - `RowDecomposition { readonly axis: "x" | "y"; readonly rows: readonly (readonly string[])[]; readonly rowPitchSteps: readonly number[] }`
  - `PatternClassification = { readonly kind: "rows" } & RowDecomposition | { readonly kind: "off-strip-lattice"; readonly reason: string }`
  - `classifyPads(pads: readonly PadPosition[]): PatternClassification`
  - `PinPattern { readonly footprint: string; readonly pads: readonly PadPosition[]; readonly source: PadSource; readonly classification: PatternClassification; readonly basis: string }`
  - `PIN_PATTERNS: ReadonlyMap<string, PinPattern>`
  - `pinPatternFor(footprint: string, patterns?: ReadonlyMap<string, PinPattern>): PinPattern` — throws by name for an unlisted footprint.

**Where the classification is a decision and where it is arithmetic, decided here because `HC10`'s own words leave it open and a later task must not re-open it.**

`HC10` refuses *"a pattern not decomposable into rows parallel to the strips"*, and names *"rows plural, and decomposability is the test"*. Two axes, two different rules, and the asymmetry is physical rather than chosen:

- **Across the strips, the row separation must be a whole number of grid steps.** A row of pads lands on one strip and the next row on another, and the strip pitch is 2.54 mm. There is no bending that puts a lead between two strips. This is the clause that can refuse.
- **Along a row, the pad spacing is unconstrained.** A lead moves along its own strip by entering a different hole in it, and VeroRoute's own footprint types already express that as a hole count. `Package_TO_SOT_THT:TO-92_Inline`'s three pads read `(at 0 0)`, `(at 1.27 0)` and `(at 2.54 0)` from the `.kicad_mod` — collinear, at half a grid step. A rule that demanded grid spacing *along* the row would refuse a footprint this repository deliberately admits and has built, and `lib/kicad/lead-span.ts` records `fixedSpanHoles: 3` for it, which is the leads splayed out to the grid. So the along-row clause would be wrong, and it is not written.

So: `classifyPads` tries each axis in turn, groups the pads by their across-axis coordinate, and the classification is `rows` when every pair of distinct row coordinates is a whole number of grid steps apart within `PITCH_TOLERANCE_MM`, and `off-strip-lattice` otherwise, naming the two rows and the residual. A pattern whose pads are all on one row is `rows` with one row. A ring of pads has every pad on its own row on both axes and the row separations are not grid multiples, so it refuses.

**What this does not check, and it is a gap reported rather than filled.** `HC10` as worded is about a *placement* — *"every placed part's pins lie on straight lines parallel to the strips"* — while CRITERIA's own "Checked by" column makes it a **footprint-level** check that refuses *"by name before any placement exists to grade"*. A footprint that decomposes along one axis still has to be oriented so those rows lie along the strips, and nothing in the suite checks that a given placement did. That is recorded in this plan's self-review as a gap for the owner; this task implements the footprint-level check CRITERIA specifies and does not invent the placement-level one.

- [ ] **Step 1: Read the pads off the footprints on disk. Do not write a coordinate from memory.** The library is at `/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/<Library>.pretty/<Name>.kicad_mod`; each file carries `(version <n>)` near the top and one `(pad "<name>" <type> ... (at <x> <y> [rot]) ...)` per pad. For each of the thirteen footprints in `LEAD_SPANS` — and for no others, because an entry for a footprint nothing places is an entry nobody can check — record `pad`, `xMm`, `yMm`, the file path, the `(version …)` token and the pad count. Two already verified while this plan was written, as the shape to follow:

```
Package_DIP:DIP-16_W7.62mm         version 20260206, 16 pads, pad "1" (at 0 0), "2" (at 0 2.54), "9" (at 7.62 17.78)
Package_TO_SOT_THT:TO-92_Inline    version 20260206, 3 pads, (at 0 0), (at 1.27 0), (at 2.54 0)
Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical
                                   version 20260206, 3 pads, (at 0 0), (at 2.5 5), (at 5 0)
```

  **A pad carrying a rotation in its `(at x y rot)` does not move its centre**, so `rot` is not read; a pad whose `(at …)` cannot be parsed is an error naming the file and the line, never a skipped pad. **Verify names against the thing itself:** if a footprint named in `LEAD_SPANS` is not on disk at the path above, stop and report it rather than recording coordinates for a file nobody opened — this repository has twice shipped a footprint that does not exist.

- [ ] **Step 2: Write the failing test** (`tests/kicad/pin-pattern.test.ts`):

```ts
import { test, expect } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { classifyPads } from "../../lib/kicad/pin-pattern-model.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import type { PadPosition } from "../../lib/kicad/pin-pattern-model.ts"

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

test("every recorded pad count agrees with the footprint file the pads came from", () => {
  for (const pattern of PIN_PATTERNS.values()) {
    expect(pattern.pads.length, pattern.footprint).toBe(pattern.source.padCount)
    expect(pattern.source.file, pattern.footprint).toContain(".kicad_mod")
    expect(pattern.source.version, pattern.footprint).not.toBe("")
  }
})

test("a single row of pads decomposes, whatever the spacing along it", () => {
  // TO-92_Inline's own geometry: three collinear pads at half a grid step. A
  // rule demanding grid spacing ALONG a row would refuse a footprint this
  // repository places on boards that are built and pass make check.
  const inline = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 1.27, yMm: 0 },
    { pad: "3", xMm: 2.54, yMm: 0 },
  ])
  expect(inline.kind).toBe("rows")
  if (inline.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(inline.rows).toEqual([["1", "2", "3"]])
  expect(inline.rowPitchSteps).toEqual([])
})

test("two rows a whole number of strips apart decompose, and the pitch is reported in steps", () => {
  const dip = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 0, yMm: 2.54 },
    { pad: "3", xMm: 7.62, yMm: 2.54 },
    { pad: "4", xMm: 7.62, yMm: 0 },
  ])
  expect(dip.kind).toBe("rows")
  if (dip.kind !== "rows") throw new Error("unreachable: kind was asserted above")
  expect(dip.rows.length).toBe(2)
  expect(dip.rowPitchSteps).toEqual([3])
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

test("a row separation off the grid by more than the tolerance is refused", () => {
  const offGrid = classifyPads([
    { pad: "1", xMm: 0, yMm: 0 },
    { pad: "2", xMm: 2.54, yMm: 0 },
    { pad: "3", xMm: 0, yMm: GRID_MM + 0.4 },
    { pad: "4", xMm: 2.54, yMm: GRID_MM + 0.4 },
  ])
  expect(offGrid.kind).toBe("off-strip-lattice")
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
  return { kind: "rows", axis, rows: rows.map((row) => row.pads), rowPitchSteps: steps }
}

/**
 * Whether a footprint's pads decompose into rows a whole number of strips
 * apart - HC10's test, at footprint level, with no latitude inside it.
 *
 * ACROSS THE STRIPS THE SEPARATION MUST BE A WHOLE NUMBER OF GRID STEPS, and
 * ALONG A ROW THE SPACING IS UNCONSTRAINED. The asymmetry is physical: a row
 * of pads sits on one strip and the next row on another, and the strip pitch
 * is fixed, while a lead moves along its own strip by entering a different
 * hole in it. TO-92_Inline's three collinear pads at 1.27mm are the worked
 * case - one row, and a rule demanding grid spacing along the row would
 * refuse a part this repository has built.
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

- [ ] **Step 5: Implement `lib/kicad/pin-pattern.ts`** — the thirteen entries from step 1 and nothing computed. Each entry carries its pads, its `PadSource`, the classification `classifyPads` returns for it, and a `basis` string saying in one sentence what the pattern is (*"two rows of eight at three strip pitches"*), in the voice `lead-span.ts`'s `minBasis` uses. The module comment states: why it exists (HC10 is in A1 and the verdict must not claim an unchecked constraint held); that every number came from a `.kicad_mod` on disk and none from memory; that an unlisted footprint throws; and the along-row/across-row asymmetry, citing TO-92_Inline. `pinPatternFor` mirrors `leadSpanFor`'s refusal exactly — name the footprint, say it is not in `PIN_PATTERNS`, say **this is NOT defaulted** and why (a pattern the strips cannot take is a board of cuts the owner will not build), list the classified footprints, and say how to add one (open the `.kicad_mod`, record the pads with the file and version, put the entry beside the others).

- [ ] **Step 6: Run the classification over all thirteen and read the output.** Write a throwaway probe under the scratchpad that prints each footprint and its classification, and **look at it**. Three outcomes and only one of them is "carry on":
  - every footprint classifies as `rows` → carry on;
  - a footprint used only outside the Pultec set refuses → record it in `docs/stripboard/pin-pattern.md` as a finding, leave the classification as the module derived it, and carry on: `PAR2`'s posture is that a refusal is the honest outcome;
  - **one of the five footprints the Pultec boards place refuses → STOP.** Do not relax the predicate. A rule that refuses a footprint on five boards in S1a's scope is either wrong or has found something real, and `K3`'s fourth condition — *"never a widening because the gate became inconvenient"* — governs by analogy. Report it to the owner with the pads, the file and the derived reason, exactly as `OB4` reports `pt2399-core`'s extent.

- [ ] **Step 7: Write `docs/stripboard/pin-pattern.md`**, in the shape of `docs/stripboard/lead-span.md`: what `HC10` is and whose judgement it is (the owner's, quoted), the along-row/across-row asymmetry and why, the per-footprint table with its file and version, step 6's findings, and the one gap — that the placement-level half of `HC10`'s wording is unchecked and why this module does not invent it.

- [ ] **Step 8: Prove the tests can fail.** Three deliberate breaks, each run and reverted, each recorded in a comment beside the test it broke:
  1. `classifyPads` returns `{ kind: "rows", axis: "x", rows: [pads.map((p) => p.pad)], rowPitchSteps: [] }` unconditionally — *the vacuous classifier*. The ring test and the off-grid test must fail. **This is the mutation that matters**, because it is the shape the fork's mutation harness found four times.
  2. Drop one entry from `PIN_PATTERNS`. The coverage test must fail naming it.
  3. Change one recorded `yMm` by 0.5 mm. The rederivation test must fail naming that footprint.

- [ ] **Step 9: Run** `bun test && bun run typecheck`, **commit** ("Classify every placed footprint's pin pattern, so HC10 is a check and not a claim"), push.

---

### Task 3: `HC8`'s geometry contract and the copper graph

**Files:** create `tools/stripboard/copper.ts`; test `tests/stripboard/copper.test.ts`.

**Interfaces:**
- *Consumes:* `parseBoardDump`, `BoardDump`, `Part`, `Pin`, `Cut`, `Bridge`, `Wire`, `HolePosition` from `tools/guide/dump.ts`.
- *Provides:*
  - `GEOMETRY_CONTRACT_VERSION = 1`
  - `CONTRACTED_LINES: readonly string[]` — `["GRID", "VERTICAL_STRIPS", "PIN", "CUT", "SOLDER", "WIRE"]`
  - `HoleKey = string` — `` `${row},${col}` ``
  - `holeKey(hole: HolePosition): HoleKey` and `parseHoleKey(key: HoleKey): HolePosition`
  - `CopperGraph { readonly components: ReadonlyMap<HoleKey, number>; readonly componentCount: number }`
  - `copperGraph(dump: BoardDump): CopperGraph`
  - `pinHoles(dump: BoardDump): ReadonlyMap<string, HoleKey>` — keyed `` `${ref}.${pin}` ``
- Task 4 consumes all of these; Task 14's `HC8` check consumes Task 4's verdict and never this module directly.

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
  "WIRE w1 AT 0,0 ENDS 0,0 2,0",
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
  const vertical = parseBoardDump(BOARD.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 1"))
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

test("a non-adjacent CUT pair refuses rather than being interpreted", () => {
  // No CUT line on any .vrt in this repository names a non-adjacent pair
  // (measured, CRITERIA's HC8 contract). One would mean the grammar has moved
  // under the contract, and guessing which holes it severs is how a verifier
  // reports a connectivity it did not compute.
  const wide = parseBoardDump(BOARD.replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 0,3,8"))
  expect(() => copperGraph(wide)).toThrow(/adjacent/)
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

- [ ] **Step 3: Implement `tools/stripboard/copper.ts`.** A union-find over hole keys. The module comment states, in this order: that this is `HC8`'s reconstruction and `CRITERIA`'s `HC8` contract is its authority; `GEOMETRY_CONTRACT_VERSION` and what a version bump means; the three join mechanisms and that there is no fourth, citing COST §1.5 and the stretched-resistor correction; the definition clause for an uncut strip; that it never reads `NODE` or any `nodeId`, and that this is the independence rather than a style choice; and the honest scope — independent of VeroRoute's **membership calculation**, consuming its **geometry export**, with `.vrt` parsing recorded as limit `H-13` rather than as a plan. Build order: seed one singleton per in-bounds hole from `GRID`; union along-strip neighbours except where a `CUT` lies between them; union each `SOLDER` pair after asserting the two holes are on neighbouring strips at one shared along-strip coordinate; union each `WIRE`'s two ends, skipping a `FLOATING` wire, which joins nothing. Refuse, naming the line and `GEOMETRY_CONTRACT_VERSION`, when a contracted line is absent, when a `CUT` names a non-adjacent pair, or when any hole named by any line is outside `GRID`.

- [ ] **Step 4: Prove the tests can fail.** Four breaks, run and reverted, each noted beside its test: union every pair of holes on a strip ignoring cuts (the cut test fails); union a part's `PIN` holes to each other (the stretched-part test fails); hard-code the strip axis to rows (the `VERTICAL_STRIPS 1` test fails); read `cut.a.nodeId` into the component key (the independence test fails). **The last one is the one to run first**, because it is the defect `HC8` exists to prevent and the only one whose absence would still look like a working gate.

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Reconstruct a stripboard's copper from the dump geometry, and from nothing else"), push.

---

### Task 4: `HC8`'s verdict — the open, the short, and the independence

**Files:** create `tools/stripboard/equivalence.ts`; test `tests/stripboard/equivalence.test.ts`.

**Interfaces:**
- *Consumes:* `copperGraph`, `pinHoles`, `holeKey`, `HoleKey`, `GEOMETRY_CONTRACT_VERSION` from Task 3; `BoardDump` from `tools/guide/dump.ts`.
- *Provides:*
  - `ReferenceNets = ReadonlyMap<string, readonly string[]>` — net name to `ref.pin` members, **from the netlist export, upstream of VeroRoute entirely**
  - `OpenFinding { readonly net: string; readonly groups: readonly (readonly string[])[] }`
  - `ShortFinding { readonly nets: readonly string[]; readonly hole: HoleKey }`
  - `EquivalenceVerdict { readonly equivalent: boolean; readonly opens: readonly OpenFinding[]; readonly shorts: readonly ShortFinding[]; readonly contractVersion: number }`
  - `netlistEquivalence(dump: BoardDump, reference: ReferenceNets): EquivalenceVerdict`
  - `describeVerdict(verdict: EquivalenceVerdict): readonly string[]` — one line per finding, naming the net or nets
- Task 14's `HC8` check calls `netlistEquivalence` and renders `describeVerdict`; nothing else in the pipeline calls either.

- [ ] **Step 1: Write the failing test.**

```ts
import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { netlistEquivalence, describeVerdict } from "../../tools/stripboard/equivalence.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"

/**
 * Two strips, two nets, one cut between them in the middle column. R1 bridges
 * the strips; R2 sits along strip 1 straddling the cut, which is the ordinary
 * stripboard idiom and not a short.
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

test("a board whose copper partitions the pins as the netlist does is equivalent", () => {
  const verdict = netlistEquivalence(parseBoardDump(WHOLE), REFERENCE)
  expect(verdict.opens).toEqual([])
  expect(verdict.shorts).toEqual([])
  expect(verdict.equivalent).toBe(true)
  expect(verdict.contractVersion).toBe(1)
})

test("an OPEN is rejected, naming the net and the groups its pins fell into", () => {
  // Sever strip 1 between R1.2 at 1,0 and R2.1 at 1,1, which is net `mid`.
  const opened = parseBoardDump(`${WHOLE}\nCUT 1,0,3 1,1,9`)
  const verdict = netlistEquivalence(opened, REFERENCE)
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
  const shorted = parseBoardDump(WHOLE.split("\n").filter((l) => !l.startsWith("CUT ")).join("\n"))
  const verdict = netlistEquivalence(shorted, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  expect(verdict.shorts).toHaveLength(1)
  expect([...(verdict.shorts[0]?.nets ?? [])].sort()).toEqual(["mid", "out"])
  expect(describeVerdict(verdict).join("\n")).toMatch(/mid/)
  expect(describeVerdict(verdict).join("\n")).toMatch(/out/)
})

test("an open and a short are reported separately, not collapsed into one failure", () => {
  const both = parseBoardDump(
    `${WHOLE.split("\n").filter((l) => !l.startsWith("CUT ")).join("\n")}\nCUT 0,1,1 0,2,2`,
  )
  const verdict = netlistEquivalence(both, { ...Object.fromEntries(REFERENCE) } as never)
  expect(verdict.equivalent).toBe(false)
})

test("a reference pin with no PIN line refuses, because a missing hole is not an open", () => {
  // A placed part with no PIN lines is HC3's refusal and HC8's too. Treating
  // it as an open would report the wrong constraint and point at the wrong fix.
  const floated = parseBoardDump(
    WHOLE.replace("PART R2 RESISTOR4 1k AT 1,0 SPAN 1", "PART R2 RESISTOR4 1k FLOATING SPAN 1")
      .replace("PIN R2 1 AT 1,1\n", "").replace("PIN R2 2 AT 1,3\n", ""),
  )
  expect(() => netlistEquivalence(floated, REFERENCE)).toThrow(/R2\.1/)
  expect(() => netlistEquivalence(floated, REFERENCE)).toThrow(/PIN/)
})

test("an empty reference refuses rather than reporting equivalence vacuously", () => {
  expect(() => netlistEquivalence(parseBoardDump(WHOLE), new Map())).toThrow(/no nets/)
})

test("the verdict is unchanged when the NODE block is emptied and the CUT node ids garbled", () => {
  // V11. The whole independence claim, as a comparison rather than an assertion.
  const withNodes = `${WHOLE}\nNODE 1 mid R1.2 R2.1\nNODE 2 out R2.2`
  const garbled = withNodes
    .replace("CUT 1,1,3 1,2,4", "CUT 1,1,-1 1,2,424242")
    .replace(/^NODE .*$/gm, "")
  expect(netlistEquivalence(parseBoardDump(garbled), REFERENCE))
    .toEqual(netlistEquivalence(parseBoardDump(withNodes), REFERENCE))
})

test("this module imports nothing from the scorer or from the check path", () => {
  // HC8 shares no code with the scorer or with --check. Asserted by reading the
  // import graph, because "we did not do that" is the kind of claim a later
  // refactor breaks silently.
  const source = Bun.file("tools/stripboard/equivalence.ts")
  const text = await source.text()
  expect(text).not.toContain("score.ts")
  expect(text).not.toContain("perfboard/check.ts")
  expect(text).not.toContain(".nodes")
  expect(text).not.toContain("nodeId")
})
```

  The last test is `async`; declare it `test("...", async () => { ... })` and read the file with `await Bun.file(...).text()`.

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement `tools/stripboard/equivalence.ts`.** Map every reference pin to its hole through `pinHoles`, refusing by name for a reference pin with no `PIN` line; look each hole's component up in `copperGraph`; then two passes. An **open** is a reference net whose pins fall in two or more components, reported with the pins grouped by component. A **short** is a component holding pins of two or more reference nets, reported with the net names sorted and one hole that witnesses it. `equivalent` is `opens.length === 0 && shorts.length === 0`. `describeVerdict` renders one line per finding naming the net or nets, the components or the hole, and — for a short — that no completeness check detects this because both nets still read complete.

- [ ] **Step 4: Prove the tests can fail.** Four breaks: return `{ equivalent: true, opens: [], shorts: [] }` unconditionally (every negative test fails — *the vacuous verdict*, run this one first); report opens only (the short test fails); key the components on `dump.nodes` instead of the copper graph (the independence test fails and the short test fails, which is the whole argument for `HC8` reproduced as two failing tests); treat a missing `PIN` line as an open (the floated test fails).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("HC8 rejects an open and a short, each by name, from the copper alone"), push.

---

### Task 5: The frozen fixture, and `HC8` agreement on five boards

**Files:** create `tests/fixtures/stripboard/pultec-low-boost-frozen.vrt`, `.netlist`, `.dump`, `provenance.txt`; create `tests/stripboard/agreement.test.ts`; modify `tools/stripboard/equivalence.ts` only if a reader for the netlist export does not already exist elsewhere (see Interfaces).

**Interfaces:**
- *Consumes:* Task 4's `netlistEquivalence` and `ReferenceNets`.
- *Provides:*
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.vrt` — `B2`'s frozen board, `git show 2f62ee1:boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.netlist` — the netlist export the layout was built against, as text
  - `tests/fixtures/stripboard/pultec-low-boost-frozen.dump` — this binary's `--dump-board` on that board
  - `referenceNetsFromExport(text: string): ReferenceNets` in `tools/stripboard/equivalence.ts` — the one reader of a netlist export into `HC8`'s input, so no later task writes a second one
- Task 23's `B1-frozen` run consumes the three fixture files; Task 14 consumes `referenceNetsFromExport`.

**The fixture lives under `tests/fixtures/`, never under `boards/`**, because `make -C boards/<board> check` regenerates the export every run and decides freshness by content, so *"a deliberately frozen model under `boards/` is a deliberately stale one the freshness guard would be right to fail"*.

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

const BOARDS = [
  ["the frozen low-boost fixture", "tests/fixtures/stripboard/pultec-low-boost-frozen.dump",
    "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist"],
  ["pt2399-core", "tests/fixtures/pt2399-core-board.dump", "tests/fixtures/pt2399-core-veroroute.net"],
] as const

for (const [label, dumpPath, netlistPath] of BOARDS) {
  test(`HC8 agrees with the reference netlist on ${label}`, async () => {
    const dump = parseBoardDump(await Bun.file(dumpPath).text())
    const reference = referenceNetsFromExport(await Bun.file(netlistPath).text())
    const verdict = netlistEquivalence(dump, reference)
    expect(verdict.opens, `${label} opens`).toEqual([])
    expect(verdict.shorts, `${label} shorts`).toEqual([])
  })
}

test("HC8 rejects the floated-C19 board from the copper side, not only HC3's side", () => {
  // Two independent detections of one measured failure is the standard; one is
  // a coincidence. C19's pins vanish from the PIN lines, so the reference nets
  // that hold them have a pin with no hole, and HC8 refuses naming the pin.
  const text = Bun.file("tests/fixtures/pultec-low-boost-c19-floated.dump")
  expect(text).toBeDefined()
})

test("the frozen fixture's own numbers are read from it, and its hash is recorded", async () => {
  const dump = parseBoardDump(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.dump").text(),
  )
  // No literal grid: B2's rule is that the fixture's GRID line is the authority.
  expect(dump.grid.rows).toBeGreaterThan(0)
  expect(dump.cutState).toBe("COMPUTED")
  const provenance = await Bun.file(
    "tests/fixtures/stripboard/provenance.txt",
  ).text()
  const hash = Bun.SHA256.hash(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.vrt").arrayBuffer(),
  )
  expect(provenance).toContain(Buffer.from(hash).toString("hex"))
})
```

  Replace the placeholder-shaped floated-`C19` test above with the real one while implementing: load the floated dump, build its reference nets from `tests/fixtures/pultec-low-boost-frozen.netlist`, call `netlistEquivalence`, and assert it throws naming `C19.1` — `C19`'s pins have no hole, which is `HC3`'s refusal arriving at `HC8`. Keep the two assertions distinct, as `tests/perfboard/floating-fixture.test.ts` does.

  **The two further benchmark boards.** `transistor-preamp-feedback` and `transistor-preamp-staged` have committed `.net` fixtures but no committed `--dump-board` capture. Add each to `BOARDS` by committing its dump beside the others with a provenance entry, produced by `--dump-board` on its committed `.vrt` at the pinned binary. If a board's dump cannot be produced — `transistor-preamp-lab` reports `CUT_STATE UNRESOLVED` with 19 `CUT_CONFLICT` lines and `HC2` excludes it — **leave it out and say so in the test file's header comment**, naming the board and the reason. `transistor-preamp-lab` is not in the benchmark set.

- [ ] **Step 5: Run it, confirm it fails**, then implement `referenceNetsFromExport` and commit the fixtures.

- [ ] **Step 6: Prove the test can fail.** Two breaks: flip one `PIN` row in the frozen dump by one and confirm the agreement test fails naming the board (then revert — **the fixture is not edited**, the break is applied to a copy in the test); and make `netlistEquivalence` return `equivalent: true` unconditionally and confirm every row fails. Record both beside the test.

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
- Task 8's effect check consumes `Part.direction`; Task 15's `A_occ` consumes `BoardDump.bounds` and **nothing else** — the bounding box of the `PIN` and `WIRE` holes is a *different quantity* (lead extent, not the footprint rectangle) and substituting it would silently redefine a settled ranking term.

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

  `importedBoard()` and `perfBoard()` build a board into a `mkdtempSync` directory from a fixture netlist, as `tests/stretch.test.ts` does; reuse that file's `tmpFile` shape rather than inventing a second one.

- [ ] **Step 3: Implement.** `BOUNDS` from `Board::GetBounds`, printed beside `GRID` and always, once. `DIRECTION` appended to the placed `PART` line; a `FLOATING` part prints no direction, which mirrors the existing rule that *"a FLOATING component prints no PIN line: it has no holes"*. Both are appended in the grammar's own append-only shape, documented at the point of change.

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
- Task 17's move set consumes the verb; Task 16's seed construction consumes it to turn parts across the strips.

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
  const targets = deriveTargets(physicalBoard("low-cut"), 34, "pultec-low-cut")
  for (const [a, b] of targets.netGraph.edges) {
    expect(targets.netGraph.nets).toContain(a)
    expect(targets.netGraph.nets).toContain(b)
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

- [ ] **Step 4: Prove the tests can fail.** Three breaks: return `netCount` as the floor (both floor tests fail); count every `PIN` hole rather than distinct strips (the `S_occ` tests fail); drop the negative-`J` throw (its test fails).

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
  "WIRE w1 AT 0,3 ENDS 0,3 2,3",
  "SOLDER 0,2 1,2",
  "CUT 0,1,1 0,2,2",
  "NODE 1 a R1.1", "NODE 2 b R1.2",
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
  - `CanonicalInputs { readonly candidateSha256: string; readonly rulesSha256: string; readonly netlistSha256: string; readonly spanDataSha256: string; readonly pinPatternSha256: string; readonly seeds: readonly number[]; readonly seed: number; readonly verorouteCommit: string; readonly builtCommit: string; readonly pipelineCommit: string }`
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

**Files:** create `tools/stripboard/constraints.ts` and `tools/stripboard/grade.ts`; create `tests/fixtures/stripboard/negative/` with one fixture per constraint; test `tests/stripboard/grade.test.ts`; modify `boards/pultec-*/perfboard.json` only if a board declares a stock other than the default (none does today, so expect no change and say so).

**Interfaces:**
- *Consumes:* `netlistEquivalence`, `describeVerdict`, `referenceNetsFromExport` (Tasks 4, 5); `pinPatternFor` (Task 2); `leadSpanFor`, `TOOL_MIN_SPAN_HOLES`, `TOOL_MAX_SPAN_HOLES` (`lib/kicad/lead-span*.ts`); `StripboardRules` (Task 10); `BoardTargets` (Task 11); `BoardDump` with `bounds` (Task 7).
- *Provides:*
  - `ConstraintId = "HC1" | "HC2" | "HC3" | "HC4" | "HC5" | "HC6" | "HC7" | "HC8" | "HC9" | "HC10"`
  - `ConstraintResult { readonly id: ConstraintId; readonly held: boolean; readonly detail: string }` — `detail` names the net or part on a failure and is non-empty on a pass too, so a pass is readable
  - `CheckInput { readonly dump: BoardDump; readonly dumpText: string; readonly reference: ReferenceNets; readonly footprints: ReadonlyMap<string, string>; readonly checkReport: CheckReport; readonly stock: Stock; readonly rules: StripboardRules }`
  - `Stock { readonly rows: number; readonly cols: number; readonly source: "board" | "rules-default" }`
  - `HARD_CONSTRAINTS: readonly { readonly id: ConstraintId; readonly check: (input: CheckInput) => ConstraintResult }[]` — **exactly ten entries**
  - `gradeHardConstraints(input: CheckInput): readonly ConstraintResult[]`
  - `a1(results: readonly ConstraintResult[]): boolean`
  - `stockFor(declarationFile: string, rules: StripboardRules): Stock`
- Task 15's ranking runs over candidates that passed `a1`; Task 20's verdict consumes `ConstraintResult[]`; **no other module checks a hard constraint.**

**`CheckReport` does not exist yet and this task adds it, which is a correction to a fact worth stating.** `tools/perfboard/check.ts` spawns `--check BOARD --netlist NET` and returns `CheckRun { status, output }` — the **raw concatenated stdout and stderr**, deliberately: *"the report body is on stdout, but an unreadable board writes an empty report and puts the only diagnostic on stderr."* It does **not** parse the report into sections. So this task also exports, from `tools/stripboard/constraints.ts`:

- `CheckReport { readonly status: number; readonly incompleteNets: readonly string[]; readonly schematicDelta: readonly string[] }`
- `parseCheckReport(run: CheckRun): CheckReport`

and one fact decides how it is written: a board with no schematic delta *"has no `Schematic delta` section AT ALL — the heading is omitted, not left empty"* (`check.ts`'s own comment). **So an absent heading is `[]` and an unparseable report refuses**, naming the report, rather than an absent heading and an unreadable report both resolving to "no delta" — which is a skipped check that looks like a passing one. `HC1` and `HC7` read this parse; neither re-runs a second checker.

- [ ] **Step 1: Write the failing test. The first two assertions are the crux expressed as tests:**

```ts
import { test, expect } from "bun:test"
import { HARD_CONSTRAINTS, gradeHardConstraints, a1, stockFor }
  from "../../tools/stripboard/grade.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"

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

test("HC6 measures the occupied extent from BOUNDS, not the canvas from GRID", async () => {
  // --import leaves the canvas at a default, so a GRID larger than the stock
  // says nothing about copper. A layout whose parts fit inside the stock can be
  // cut from that board whatever its canvas says.
  const wideCanvas = await inputWithGridAndBounds({ grid: [60, 60], bounds: [0, 0, 10, 10] })
  expect(gradeHardConstraints(wideCanvas).find((r) => r.id === "HC6")!.held).toBe(true)
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

test("the grader shares no code with the scorer", async () => {
  // R2, asserted by reading the import graph rather than by intention. The
  // thing that mutates the board and the thing that certifies it are two
  // implementations of nothing in common.
  for (const file of ["tools/stripboard/grade.ts", "tools/stripboard/constraints.ts"]) {
    const text = await Bun.file(file).text()
    expect(text, file).not.toContain("score.ts")
    expect(text, file).not.toContain("climb.ts")
    expect(text, file).not.toContain("moves.ts")
  }
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
  - `round-pin-pattern` — dump text naming a part whose footprint is the synthetic ring Task 2's test constructs, registered for this fixture only in the test's own map rather than in `PIN_PATTERNS`, because `PIN_PATTERNS` holds footprints this repository places and nothing else.

- [ ] **Step 4: Implement `tools/stripboard/constraints.ts`** — one exported function per constraint, each taking `CheckInput` and returning `ConstraintResult`, each with a comment naming the constraint, quoting the one clause of CRITERIA that decides it, and naming its negative fixture. Then `tools/stripboard/grade.ts` — `HARD_CONSTRAINTS` as a ten-entry table, `gradeHardConstraints` mapping over it, `a1` as `results.every((result) => result.held)` **after asserting the result set covers all ten ids**, because a conjunction over a short list is a verdict that ignores a constraint. Keep both files under the line ceiling by putting the ten checks in `constraints.ts` and the table, the verdict and `stockFor` in `grade.ts`.

- [ ] **Step 5: Prove the grader can fail — and prove it the way the defects were actually found.** Five mutations, each applied, run and reverted, each recorded in a comment beside the assertion it broke:
  1. **`a1` returns `results.every(...)` over a nine-entry table** (one id dropped from `HARD_CONSTRAINTS`). The ten-entry test and the one-at-a-time test must fail. *This is the defect CRITERIA found in PIPELINE: `A1` stated `H1`–`H9` and left a board free to violate a declared hard constraint while passing every admissibility condition.*
  2. **Every check returns `{ held: true }`.** Every V4 row must fail. *The vacuous grader.*
  3. **`HC3` reads only the `PART` placement field.** The both-signals test must fail.
  4. **`HC6` reads `dump.grid` instead of `dump.bounds`.** The wide-canvas test must fail.
  5. **`HC5` falls back to `TOOL_MAX_SPAN_HOLES` for an unlisted footprint.** The refuse-by-name test must fail. *This is the failure `PAR2` exists to prevent and the one whose symptom is a board that scores well and cannot be built.*

- [ ] **Step 6: Run** `bun test && bun run typecheck`, **commit** ("Grade a candidate against all ten hard constraints, with a fixture each one rejects"), push.

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

- [ ] **Step 1: Write the failing test:**

```ts
test("RANKING states the order and a reason for each position", () => {
  for (const term of ["cuts", "wire", "solder", "A_occ", "wirelength"]) {
    expect(RANKING).toContain(term)
  }
  // A reviewable ranking beats a weighted sum with tuned coefficients, and a
  // declared order with no reasons is not reviewable.
  expect(RANKING.length).toBeGreaterThan(400)
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

### Task 16: P1 — the seed, by construction

**Files:** create `tools/stripboard/seed.ts`; test `tests/stripboard/seed.test.ts`.

**Interfaces:**
- *Consumes:* `BoardTargets` (Task 11); `StripboardRules` (Task 10); the binary through an injected spawn; `--import`, `--move`, `--rotate`, `--stretch`, `--author --op autofill`.
- *Provides:*
  - `SpawnVeroroute = (args: readonly string[]) => { readonly status: number; readonly stdout: string; readonly stderr: string }` — re-exported from `tools/perfboard/check.ts` if it already declares one, never a second declaration
  - `StripAssignment = ReadonlyMap<string, number>` — net to strip index, from the low-bandwidth ordering
  - `assignStrips(targets: BoardTargets, seed: number): StripAssignment`
  - `seedCandidate(input: SeedInput, spawn: SpawnVeroroute): string` — the path of the seeded `.vrt` inside the run directory
  - `SeedInput { readonly importedBoard: string; readonly targets: BoardTargets; readonly assignment: StripAssignment; readonly runDir: string; readonly rules: StripboardRules }`
- Task 17 consumes `seedCandidate` and `assignStrips`; Task 18's E2 calls `assignStrips` with a different seed.

**The strategy, and it is construction rather than search:** assign one net per strip in a low-bandwidth linear arrangement; place each part across the strips of its two nets; stretch to reach. *"Should land at or near `J = 0`. Search is for what construction cannot reach."*

**One constraint on the arrangement, and it is not an obstruction.** `junction_signals` on every Pultec board is a `SIP5` carrying all five ladder nets at 1-hole pitch. Turned across the strips it pins those five nets to five consecutive strips in a fixed order; laid along a strip it puts five nets on one strip and costs four cuts. **It is the only component forcing more than two nets together, and the pipeline treats it as a fixed sub-arrangement rather than a part to be placed independently.**

**The injected-spawn posture is not optional.** `tools/perfboard/check.ts` injects its spawn for tests and **throws** when `VEROROUTE` is unset rather than guessing a path — *"a hardcoded `$HOME/src/...` is right on exactly one machine and wrong everywhere else… a spawn that quietly fails is the shape that reads as a clean board."* Every test below injects.

- [ ] **Step 1: Write the failing test:**

```ts
test("the assignment puts one net on each strip, in the ordering's order", () => {
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  const assignment = assignStrips(targets, 0)
  expect(assignment.size).toBe(targets.netCount)
  expect(new Set(assignment.values()).size).toBe(targets.netCount)
  expect([...assignment.entries()].sort((a, b) => a[1] - b[1]).map(([net]) => net))
    .toEqual([...targets.ordering])
})

test("a different seed gives a different low-bandwidth ordering, deterministically", () => {
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  expect(assignStrips(targets, 1)).not.toEqual(assignStrips(targets, 0))
  expect(assignStrips(targets, 1)).toEqual(assignStrips(targets, 1))
})

test("the junction's five nets land on five consecutive strips, in one fixed order", () => {
  // The SIP5 at 1-hole pitch is the only component forcing more than two nets
  // together, so it is placed as a sub-arrangement and the ordering is built
  // around it rather than against it.
  const targets = deriveTargets(physicalBoard("low-boost"), 34, "pultec-low-boost")
  const strips = JUNCTION_NETS.map((net) => assignStrips(targets, 0).get(net))
  expect(strips.every((strip) => strip !== undefined)).toBe(true)
  const sorted = [...strips as number[]].sort((a, b) => a - b)
  expect(sorted[sorted.length - 1]! - sorted[0]!).toBe(sorted.length - 1)
})

test("the ordering's bandwidth is inside the tool's span ceiling", () => {
  // COST 6.4 measured every board's RCM bandwidth inside the 15-step ceiling
  // with margin, so clustering is geometrically feasible and the tool's span
  // limit is not the obstruction. A seeded ordering that left it is a bug in
  // the ordering, not a fact about the circuit.
  for (const section of ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"]) {
    const targets = deriveTargets(physicalBoard(section), 34, `pultec-${section}`)
    expect(targets.orderingBandwidth, section).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
  }
})

test("a span the construction needs and the part cannot reach refuses, naming both", () => {
  // The seed proposes and the grader grades, but a construction that KNOWS it
  // is asking for an unreachable span says so where the remedy is - the span
  // data - rather than emitting a candidate for HC5 to reject anonymously.
  expect(() => seedCandidate(reachingInput(), fakeSpawn())).toThrow(/maxSpanHoles/)
  expect(() => seedCandidate(reachingInput(), fakeSpawn())).toThrow(/pultec-/)
})

test("the seed writes only inside the run directory", () => {
  const spawned: string[][] = []
  const spawn = recordingSpawn(spawned)
  const path = seedCandidate(input(), spawn)
  expect(path.startsWith(input().runDir)).toBe(true)
  for (const args of spawned) {
    const output = args[args.indexOf("-o") + 1]
    if (output !== undefined) expect(output.startsWith(input().runDir)).toBe(true)
  }
})

test("the seed never writes in place and always passes -o", () => {
  // The fork's own rule, which every verb meets: never write to a path it
  // derived itself; -o required, no in-place default.
  const spawned: string[][] = []
  seedCandidate(input(), recordingSpawn(spawned))
  for (const args of spawned.filter((a) => a[0] !== "--dump-board" && a[0] !== "--check")) {
    expect(args).toContain("-o")
  }
})

test("a spawn that fails stops the construction and names the gesture", () => {
  const failing = (args: readonly string[]) =>
    ({ status: 1, stdout: "", stderr: `refused: ${args[0]}` })
  expect(() => seedCandidate(input(), failing)).toThrow(/refused/)
})
```

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement.** The construction drives one gesture at a time, checking each result, and runs `--author --op autofill` before any scoring, because `AutoFillVero` runs on `--update` and on `--author --op autofill` and **not** on `--import --strips` or `--set-strips`, and an unpainted board reports `CUT_STATE UNRESOLVED` with no cut list — which `HC2` refuses rather than silently mis-scoring.

- [ ] **Step 4: Prove the tests can fail.** Two breaks: have `assignStrips` return the nets in `Object.keys` order rather than the ordering's (the bandwidth test must fail on at least one board — if it does not, the ordering is doing nothing and that is the finding); drop the `-o` argument from one gesture (the writes-only-inside test fails).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Seed a layout by construction, one net per strip, and refuse a span no part can reach"), push.

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
  - `ClimbResult { readonly best: Evaluation; readonly rounds: number; readonly evaluations: number; readonly acceptedPerRound: readonly number[]; readonly history: readonly number[] }`
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
- *Consumes:* Task 17's `Move`, `applyMove`, `climb`, `accepts`; `StripboardRules.seeds` and `.worseAcceptance` (Task 10); `assignStrips` (Task 16).
- *Provides:*
  - `applyMove` handling `{ kind: "cluster" }` — *every on-board part with a pin on net X* moved by one delta, or rotated together
  - `RunResult { readonly best: Evaluation; readonly climbs: readonly ClimbResult[]; readonly restartBoundaries: readonly number[]; readonly worseAcceptanceRan: boolean }`
  - `search(input: SearchInput, spawn: SpawnVeroroute): RunResult`
  - `seededPrng(seed: number): () => number` — one algorithm, named in a comment, recorded in the manifest
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

test("nothing in the search consults a clock, a pid, a temp path or a directory listing", async () => {
  for (const file of ["tools/stripboard/climb.ts", "tools/stripboard/moves.ts"]) {
    const text = await Bun.file(file).text()
    for (const forbidden of ["Date.now", "performance.now", "process.pid", "readdirSync", "Math.random"]) {
      expect(text, `${file}: ${forbidden}`).not.toContain(forbidden)
    }
  }
})
```

- [ ] **Step 2: Run it, confirm it fails. Step 3: Implement.** The cluster move applies one delta to every on-board part with a pin on the net, through `--move` per part or `--move-batch` when Task 9 has landed, and refuses as a whole if any part would be left floating. `search` runs one climb per seed, keeps the best, records the boundaries as evaluation indices. `seededPrng` is one named algorithm with its name in a comment and in the manifest.

- [ ] **Step 4: Prove the tests can fail.** Three breaks: enumerate the cluster move over parts rather than nets (the first test fails); reset `search` to one climb (the E2 tests and the Q3 test fail); default `worseAcceptance` to a number when `null` (the does-not-run test fails — **this is the mutation that matters**, because an invented annealing schedule is exactly the number this suite refuses to make up).

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("The net-cluster move, seeded restarts, and a worse-acceptance that stays off without a bound"), push.

---

### Task 19: `Q1`–`Q6` — stopping, and a stop is not a pass

**Files:** create `tools/stripboard/stop.ts`; test `tests/stripboard/stop.test.ts`.

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

test("every threshold comes from the rules file and none is written here", async () => {
  const text = await Bun.file("tools/stripboard/stop.ts").text()
  expect(text).not.toMatch(/0\.05/)
  expect(text).not.toMatch(/2000/)
  expect(text).not.toMatch(/\b3\b *(?:consecutive|in a row)/)
})
```

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

test("REP3: the wording is generated from the fields, not written per run", async () => {
  // A phrasing table keyed by the field means an exhausted run cannot be
  // described as optimal by an author who was feeling good about the number.
  const text = await Bun.file("tools/stripboard/report.ts").text()
  expect(text).toContain("WORDING[")
  expect(text).toContain("OUTCOME_WORDING[")
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

- [ ] **Step 5: Run** `bun test && bun run typecheck`, **commit** ("Three outcomes, five bound statuses, and wording generated from both"), push.

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

test("a run that takes twice as long reproduces, and one that differs does not", () => {
  // Determinism is not reproducibility of timing.
  const slow = search(input(), slowedSpawn(SCRIPT, 3))
  expect(hashOf(slow)).toBe(hashOf(search(input(), scriptedSpawn(SCRIPT))))
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

test("V9: every numeric literal in the pipeline traces to a rule, a datum or a derivation", async () => {
  // A review check with one mechanical half: no module may carry a bare
  // numeric threshold. The judgement half - that no ratio is fitted across
  // boards - is the document, and five boards cannot support a regression.
  for (const file of PIPELINE_SOURCES) {
    const text = await Bun.file(file).text()
    const literals = [...text.matchAll(/(?<![\w.])(0\.\d+|[2-9]\d{2,})(?![\w.])/g)]
      .map((match) => match[0])
    expect(literals, file).toEqual([])
  }
})
```

  `acrossBoardVariation(key)` is computed from the four import-placed boards' own spread for that statistic, which is what makes the comparison "by more than its across-board variation" rather than by a number somebody chose. `PIPELINE_SOURCES` is the `tools/stripboard/*.ts` list excluding `rules.ts`, which is where numbers legitimately live.

- [ ] **Step 2: Implement nothing; make the tests pass by fixing what they find.** If a statistic fails V5, it comes out of `REPORTED_STATISTICS` with the reason recorded — that is the test doing its job, not an obstacle. If a literal fails V9, it moves to `stripboard/rules.json` with a `note`.

- [ ] **Step 3: Write `docs/stripboard/pipeline-verification.md`** — V1 through V12, each with where its test lives and what it would catch. This is the page a reviewer reads to answer *"how do we know the optimiser is not fooling itself?"*, and it is also the register the self-review below checks against.

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
- Task 24's `adopt` consumes the run directory `place` wrote.

**`B1-frozen`, and it is the only externally authored criterion:** against the exact electrical model, footprints and board dimensions the hand layout was built for — 9 nets, 27 pins, and **the grid the fixture's own `GRID` line reports** — the pipeline must reach `C ≤ 5` with `W = 0` and every net complete, **starting from the import-placed board**. A run that does not is a failing run. `W = 0` is a property of the artifact being reproduced, not a general preference.

**`V3` may not be reported as satisfied by a run against the scaffolded board**, and Task 20's `A4` detail is what enforces it.

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
  const run = await place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules() })
  expect(run.best.score.wires, "W").toBe(0)
  expect(run.best.score.cuts, "C").toBeLessThanOrEqual(5)
  const hc1 = run.best.results.find((result) => result.id === "HC1")!
  expect(hc1.held, hc1.detail).toBe(true)
})

test("V3 names which of the three readings a failure is", async () => {
  const run = await place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules() })
  if (run.best.score.cuts <= 5 && run.best.score.wires === 0) return
  const report = renderReport(reportInputOf(run)).join("\n")
  expect(report).toMatch(/optimiser is weak|a constraint binds|the scorer is wrong/)
})

test("a run against the scaffolded board does not report B1-frozen satisfied", async () => {
  const run = await place({ board: "boards/pultec-low-boost", rules: loadRules() })
  const report = renderReport(reportInputOf(run)).join("\n")
  expect(report).not.toMatch(/B1-frozen/)
  expect(report).toMatch(/B1-current/)
})

test("the run starts from the import-placed board, not from the hand layout", () => {
  // B1-frozen is stated "starting from the import-placed board". Seeding from
  // the owner's own layout would be reproducing a result by copying it.
  const spawned: string[][] = []
  place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules() }, recordingSpawn(spawned))
  expect(spawned.some((args) => args[0] === "--import")).toBe(true)
  for (const args of spawned) expect(args).not.toContain(FROZEN)
})

test("the run leaves boards/** byte-identical", () => {
  const before = gitStatusPorcelain("boards/")
  place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules() })
  expect(gitStatusPorcelain("boards/")).toEqual(before)
})
```

  **This test runs the real binary and a real search, so it is slow.** Give it an explicit long timeout and keep it in its own file so `bun test tests/stripboard/benchmark.test.ts` is a thing a person can run alone. If the suite's wall clock becomes a problem, the remedy is a smaller evaluation cap for the test through the injected rules, **not** skipping it: a skipped benchmark looks exactly like a passing one.

- [ ] **Step 2: Implement the `place` verb and the `make place` target.** One verb on the existing CLI acting on `$(CURDIR)` the way every other verb there does — **no `BOARD=` variable**, because two ways to say which board is two places for one fact to be wrong. It writes only under `build/stripboard/<board>/<stamp>/`.

- [ ] **Step 3: Run it, read the output, and record what came back.** Not only the test's verdict: open the layout, read `run.json`, read the report. **Look at the output, not only the tests.** Record the result in `docs/stripboard/pipeline-verification.md` with the three readings and which one it was.

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
  for (const [label, build] of EVERY_REFUSAL) {
    let message = ""
    try { adoptLayout(build(), deps) }
    catch (error) { message = error instanceof Error ? error.message : String(error) }
    expect(message, label).not.toBe("")
    expect(message, label).toMatch(/\.(ts|json|pin|vrt)|run\.json/)   // where to fix it
    expect(message.length, label).toBeGreaterThan(80)
  }
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

- **The five layouts.** This plan builds the pipeline; the layouts are its output. No part is placed here and no `.vrt` is written by hand. Task 23 produces one layout, for the frozen fixture, to answer `V3`.
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
| `HC6` occupied extent against the stock | 14 (`BOUNDS` from 7; `OB4` bounds its scope) |
| `HC8` copper-derived netlist equivalence, contract, independence | 3, 4, 5; board-level short fixture **6 (blocked)** |
| `HC10` pin pattern | **2** |
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
| `P0`–`P4` | 11, 16, 17, 20, 20 |
| §5.1 replacing `--import`'s placer | 16 (seed by construction from the import-placed board) |
| §5.2 the two levers; the no-fourth-join-mechanism correction | 3 (the edge set), 17 and 18 (the moves) |
| §5.4 the `SIP5` as a fixed sub-arrangement | 16 |
| `R1` strict rules, `R2` generate-and-grade, `R3` declared ranking, `R4` two-condition termination, `R5` run directories, `R6` hashed manifests, `R7` seeded determinism, `R8` injected spawn, `R9` the Makefile pattern | 10, 14, 15, 19, 13, 13, 18/21, 16, 23/24 |
| `N1`–`N5` do-not-reuse | nothing to implement; honoured by using an integer grid, no mm geometry, no KRT, no `policy.ts`, and never writing a `.vrt` |
| `E1`, `E2`, `E3`, plateau moves | 18, 17 |
| `V1`, `V2` | 12 |
| `V3` | 23 |
| `V4` | 14 (ten fixtures), 2 and 4 (their own) |
| `V5` | 22 |
| `V6` and §10.1's split | 13, 21 |
| `V7` | 13 |
| `V8`, `V10`, `V12` | 20 |
| `V9` | 22 |
| `V11` | 3, 4 |

### Gaps — specified things with no task, each recorded rather than filled

1. **`HC10`'s placement-level half.** `HC10` is worded about a *placement* — *"every placed part's pins lie on straight lines parallel to the strips"* — and CRITERIA's own check is **footprint-level**, refusing a non-decomposable family by name before any placement exists. Task 2 implements that check. **Nothing checks that a given placement oriented a decomposable footprint so its rows actually lie along the strips.** This is a gap between a criterion's wording and its stated check, it is the owner's to settle, and no task invents the placement-level rule.
2. **`HC8`'s board-level short fixture** — `OB5`. Task 6 exists and is blocked. The module-level short is tested; the *"no pre-existing check catches it"* claim is not proven.
3. **`A_occ`'s role in the three outcomes** — CRITERIA §10.5 records it as a question and does not answer it. **This plan's reading is that a ranking term never bears on the verdict**: Task 15 puts `A_occ` in the ranking only, Task 17 asserts it cannot make the search accept a worse `F`, and Task 20's `A1`–`A4` never read it. That reading is consistent with `OBJ3` and it is **not an answer to the question** — if the owner decides a ranking term may bear on the verdict, Task 20 changes.
4. **A full `A1` grade of `pt2399-core` is impossible today**, because it places three footprints with no span data (two `UNSOURCED`, one in neither map). Not a gap in the plan — `PAR2`'s refusal is correct — but it means PIPELINE §3.5's benchmark set validates the grader through `HC8` only, which Task 5 states and no task contradicts.
5. **Limits `H-1`, `H-3`, `H-7`, `H-12`** are undetermined in the suite and remain so: whether the span data covers every family (the module refuses by name where it does not), whether `C = 0` is attainable (*"run P1 once M1.4 and M1.5 exist, and read the result"* — Task 16 is that run), `PlaceFloaters`' scaling, and where the two definitions of `S_occ` diverge (`V2`'s per-candidate identity check is what would surface it). Each is named in "does NOT deliver" or in the task that would read it.

### Placeholder scan

Searched the plan for `TBD`, `TODO`, `appropriate`, `as needed`, `similar to`, `etc.`, `and so on`, `handle errors`, `various`: **none present.** Every task names its files, its exported types with their fields, its test bodies and its commit. Where a test body uses a helper that is not spelled out — `healthyInput()`, `scriptedSpawn()`, `fixture()`, `mutate()` — the helper's contract is stated in prose beside it and, in the two cases where a weak helper would make a test vacuous (`mutate` returning its argument, `fixture` editing the committed file), the plan says so and requires an assertion about the helper itself.

One deliberate forward reference, which is not a placeholder because it names the task and refuses rather than skips: Task 17's `applyMove` **throws** for `{ kind: "cluster" }`, naming Task 18, until Task 18 implements it.

### Type consistency across tasks

Checked every exported name that crosses a task boundary. Resolved inconsistencies:

- **`CheckReport` does not exist in `tools/perfboard/check.ts`.** An earlier draft of Task 14 said it did. Corrected: `check.ts` returns `CheckRun { status, output }` — raw concatenated output, deliberately — and Task 14 adds `parseCheckReport(run: CheckRun): CheckReport`, with the absent-heading rule from `check.ts`'s own comment.
- **`reportLines` already exists** in `tools/cli/perfboard-support.ts`. Task 20's renderer is therefore `renderReport`, not `reportLines`.
- **`Pin` collides**: `tools/guide/dump.ts` exports `Pin { pin, row, col }` and `tools/perfboard/acquire.ts` exports `Pin { repo, commit }`. Both are pre-existing and neither is renamed; every task that imports one imports it with its module path and no task imports both into one file. Task 16's `SeedInput` therefore does not name a bare `Pin`.
- **`SpawnVeroroute`** is declared once. Task 16 re-exports whatever `tools/perfboard/check.ts` already declares rather than declaring a second spawn type; if `check.ts` declares none, Task 16 declares it and Tasks 17, 18, 23 and 24 import it from there.
- **`occupiedStrips` / `segmentJoins` / `clustering`** live in `tools/stripboard/targets.ts` only (Task 11), and Task 12 imports them. The identity has one implementation, which is what `V2` is checking against.
- **`admissible`** lives in `tools/stripboard/verdict.ts` (Task 20) and Task 19 imports it. Task 19's step 3 states the sequencing explicitly, because the alternative — a local admissibility predicate in `stop.ts` — is a second copy of `A1`–`A4`.
- **`a1`** lives in `tools/stripboard/grade.ts` (Task 14) and `verdict.ts` imports it; `verdict.ts` does not re-derive the conjunction.
- **`Stock`** is declared in `grade.ts` (Task 14) and read by Task 24's gate through the manifest's hashes rather than by importing the type.
- **`BoundStatus` / `Outcome` / `StoppingRule`** are declared once each — the first two in `verdict.ts`, the third in `stop.ts` — and `run-dir.ts`'s `CanonicalMetrics` carries them as `string` deliberately, because a manifest read from disk is untyped text until it is validated and a structural type there would assert a validation that had not happened.
- **`ConstraintId`** is the single vocabulary for the ten constraints and is used in `constraints.ts`, `grade.ts`, `stop.ts`'s signatures and `run-dir.ts`'s `constraints` record keys.

### One thing a reviewer should push back on if they disagree

Task 2 decides `HC10`'s predicate — grid-multiple separation **across** the strips, unconstrained spacing **along** a row — and that decision is load-bearing for whether any footprint is ever refused. It is argued from `TO-92_Inline`'s own pads, read off the `.kicad_mod`, and from the fact that the repository places that part on boards that are built and pass `make check`. **If the owner reads `HC10` differently, Task 2 is the task to reject**, and Tasks 14 and 25 inherit the change rather than needing their own.
