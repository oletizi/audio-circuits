# The hygiene batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settle the register entries that need no decision from the owner, so what remains in `docs/known-gaps.md` is work that genuinely waits on him.

**Architecture:** Six tasks. One batches four comment-and-documentation corrections that share a shape; four are small behavioural changes each with its own guard and perturbation; one splits an over-long test file by what its groups establish.

**Tech Stack:** TypeScript on Bun; the pinned VeroRoute fork (C++) for one task.

**Spec:** none. Each task's requirements are an entry in `docs/known-gaps.md`, which carries its own evidence and its own "what would settle it". **The register IS the spec here**, and where this plan and an entry disagree, the entry wins — it was written from measurement.

## What is NOT in this batch, and why

Two entries were considered and deliberately excluded. **Do not do them.**

- **G20** — the fork's `Board_import.cpp` is over the line ceiling. A prior controller ruling governs: *we split what we grow and record what we inherit.* That file was already 515 lines before this program touched it, the addition since was 42 cohesive lines, and the entry's own settlement notes that **the fork's mutation catalogue names exact lines in this file**, so a split invalidates catalogue entries. Real cost, no current benefit. It stays recorded.
- **G11** — hole containment for an imported board. Its settlement asks for *"a decision on which layer owns"* the check, and its own recorded evidence says the gap is not reachable through the construction-to-materialisation path. A decision is not hygiene.

## Global Constraints

- **The five adopted `.vrt` files and five committed `wiring.md` files are byte-unchanged.** `pultec-low-boost`, `pultec-hi-boost`, `pultec-mid`, `pultec-low-cut`, `pultec-hi-cut` are committed, approved and passing their own `make check`. **Every task verifies this with `shasum` and reports it.** Write nothing under `boards/` except the git-ignored `guide/`.
- **All five boards keep passing `make -C boards/<board> check`.** A new guard that refuses a committed board is a regression, not a guard. **Do not run the root `make check`** — it is red on `pt2399-core` and the transistor-preamp boards for reasons predating this work.
- No fallbacks, no mock data outside test code. Every throw names what is missing, where to fix it, and why nothing is substituted.
- **Perturb every new guard, watch it go red BY NAME, restore, and report the real output.** Perturb what a well-meaning person would write, not something obviously broken — a trivially wrong value is caught by anything and proves little.
- No `any`, no `as Type`, no `@ts-ignore`, no non-null assertions. Relative imports carry `.ts`.
- `lib/stripboard/` imports nothing from `tools/`, reads no file, spawns nothing.
- Files stay under the 300-500 line ceiling; that ceiling does NOT apply to `docs/known-gaps.md`.
- Baseline: `bun test` → **2440 pass / 0 fail across 223 files**; typecheck clean. The count may only go up.
- Use `bun`, never ts-node. Never `sed` for writes. Never put a `#` inside a bash heredoc or multi-line quoted bash argument — use the Write tool and `git commit -F <file>`.
- No Claude/AI attribution in commit messages. No git hooks. Supersede means delete.
- **Each task DELETES the register entries it settles**, in the same commit, per that file's own rule. A bare `G<n>` means an entry in that file; `CRITERIA` clauses are written `CRITERIA G<n>` in full.

---

### Task 1: Four comments that say something untrue

**Files:**
- Modify: `lib/stripboard/seed-fit.ts:333`, `tests/stripboard/model/seed-off-board.test.ts`, `docs/stripboard/pipeline-verification.md`, `tools/guide/circuit.ts:62`, `tests/guide/circuit-double-control.test.ts:2`, `tests/guide/circuit-pads.test.ts:5`
- Modify: `docs/known-gaps.md` — delete G7, G8, G26, G46

**Batched deliberately:** four corrections of one shape — prose that is checkably wrong — with no behaviour between them. One diff a reviewer reads once.

**G7.** `lib/stripboard/seed-fit.ts:333` reads *"of 634 intermediate wire-span holes, FIVE are inside one"*. **634 is ALL wire-span holes with endpoints included; the intermediate count is 470** (634 − 2×82 wires), so the two figures the paragraph presents as disjoint overlap by 164. **The FIVE is unaffected** — endpoints contribute zero, which the paragraph's own 274/0 line independently establishes. Correct the denominator to 470, or say "wire-span holes" and drop "intermediate".

**G8.** `tests/stripboard/model/seed-off-board.test.ts` says `routedUnderRigid` rejects all three columns. True, and it does not claim the stronger thing — but it never says `rigidOverlap` closes them identically and that nothing outside `chooseColumn` can separate the two. One line in the test's comment.

**G26.** `docs/stripboard/pipeline-verification.md` still presents `kappa_bench = 0.05` as a live parameter in the present tense. **It was withdrawn** — the owner's clustering bound is unset, the way `tau` is. Its measurements are fine; the parameter table is what is wrong.

**G46.** Three comments point in the present tense at register entries that were deleted: `tools/guide/circuit.ts:62` and `tests/guide/circuit-double-control.test.ts:2` cite `G4`; `tests/guide/circuit-pads.test.ts:5` says *"this file is G5's witness"*. **Say what the check IS rather than naming an entry** — an entry is deleted when settled, so a comment keyed to one is stale by design.

- [ ] **Step 1: Read all six sites** and confirm each claim is still wrong as described. **If one is already correct, say so and do not edit it** — the register can be wrong too.
- [ ] **Step 2: Make the six corrections.**
- [ ] **Step 3: Run `bun test` and `bun run typecheck`.** Expected: 2440 pass / 0 fail, clean. **Comment-only changes that move a test count mean something else changed** — stop and report.
- [ ] **Step 4: Delete G7, G8, G26 and G46** from `docs/known-gaps.md`.
- [ ] **Step 5: `shasum` the five `.vrt` and five `wiring.md` files** and confirm unchanged.
- [ ] **Step 6: Commit.**

---

### Task 2: A ceramic disc capacitor has a shape

**Files:**
- Modify: `tools/guide/part-shapes.ts` (`bodyFor`)
- Test: a new file in `tests/guide/`
- Modify: `docs/known-gaps.md` — delete G3

**The defect.** `bodyFor` enumerates `RESISTOR\d*`, `CAP_ELECTRO_(\d+)`, `SIP(\d+)`, `BLOCK_(?:100|200)MIL(\d+)`, `TO92`, `TRIM_FLAT` and the film types, and **has no `CAP_CERAMIC` branch** — so rendering a board carrying one refuses with `no drawing for VeroRoute part type "CAP_CERAMIC"`. `CAP_CERAMIC` appears bare in `tests/fixtures/pt2399-core-board.dump` and `tests/fixtures/stripboard/pt2399-core.dump`.

**Follow the existing precedent**: the film-capacitor branch matches `/^CAP_FILM(_WIDE)?\d*$/` because the importer emits a span-suffixed spelling while `--dump-board` prints the bare one. `lib/kicad/import-string.ts:247` emits `CAP_CERAMIC${gridSteps(...)}`, so **both spellings must draw.**

**A box around the pins is not a claim about the body.** The film branch says so in a comment and the same applies here: no body dimension for a disc capacitor is recorded anywhere, and drawing one from memory is the guess `lib/kicad/lead-span.ts` refuses.

- [ ] **Step 1: Write the failing test.**

```ts
test("a ceramic disc capacitor draws, in both spellings the pipeline uses", () => {
  for (const type of ["CAP_CERAMIC", "CAP_CERAMIC1", "CAP_CERAMIC3"]) {
    expect(() => bodyFor(ceramicPart(type), twoPins()), type).not.toThrow()
  }
})
```

- [ ] **Step 2: Run it and read the failure** — expect `no drawing for VeroRoute part type "CAP_CERAMIC"`.
- [ ] **Step 3: Add the branch**, matching the film branch's shape and carrying the same point about the box.
- [ ] **Step 4: Run it.**
- [ ] **Step 5: Render `pt2399-core` and LOOK AT IT.** `make -C boards/pt2399-core guide` may refuse for the unrelated reasons that board fails `make check`; if so, render the dump directly. Convert with `rsvg-convert -z 3`, **read the PNG with the Read tool**, and say what the ceramic caps look like. `CLAUDE.md`: *"Look at the output, not only the tests."*
- [ ] **Step 6: Perturb** — narrow the match to drop the span digits, watch the test go red naming the spelling, restore, report the output.
- [ ] **Step 7: Delete G3, `shasum` the ten files, commit.**

---

### Task 3: A pad whose terminal is neither the pole nor a position refuses

**Files:**
- Modify: `tools/guide/pad-label.ts:95-100`
- Test: a new file in `tests/guide/`
- Modify: `docs/known-gaps.md` — delete G41

**The defect.** A pad is treated as the pole when its terminal name is exactly `common`. A multi-pole rotary whose second pole pin is named anything else falls through to `positionsByPin` and is **labelled with whatever position closes onto it** — a frequency printed against a pole, which reads as an ordinary wiring instruction and is wrong in the quiet way. `symbolFor` (`circuits/pultec/physical/parts.ts:281-294`) already contemplates *"one common per pole"*.

**The entry decides the fix**, so do not invent a naming rule: *"a refusal, which is the better answer while no such part exists: a pad whose terminal is neither the pole nor a position should refuse rather than be labelled."* Inventing a spelling for a pole on a part nobody has chosen would be guessing at a part nobody has chosen.

- [ ] **Step 1: Write the failing test** — a rotary with a second pole pin not named `common` refuses, naming the component, the terminal, and that neither the pole nor any position matches.
- [ ] **Step 2: Run it and read the failure** — today it returns a frequency.
- [ ] **Step 3: Implement the refusal.**
- [ ] **Step 4: Run the suite. All five boards' existing labels must be unchanged** — the ten low-boost labels are `LO BOOST ccw/wiper/cw`, `common`, `20Hz`, `30Hz`, `60Hz`, `100Hz`, `150Hz`, `200Hz`. Assert that, or the refusal has eaten a working board.
- [ ] **Step 5: Perturb BOTH directions** — make the refusal unreachable, and separately make it fire on a single-pole rotary. Both red by name. Restore, report both outputs.
- [ ] **Step 6: Delete G41, `shasum` the ten files, run the five boards' own checks, commit.**

---

### Task 4: Two poles of one gang declare the same positions

**Files:**
- Modify: `circuits/pultec/electrical/controls.ts` or a checker beside it
- Test: a new file
- Modify: `docs/known-gaps.md` — rewrite G39, do not delete it

**The defect.** `SelectorTerminals.gang` says poles sharing a gang *"must always be at the same position. The resolver enforces it."* Two checks stand behind that sentence and **neither compares the position LISTS the poles declare**: `checkGangs` (`lib/model/control-state.ts:244-256`) compares the SELECTED position of each pole, and `validateControlState` (`:207-241`) refuses an unknown selected position against one switch's own list. So `SW_LO_BOOST.positions` and `SW_LO_CUT.positions` are two independently transcribed six-entry lists that happen to be identical, and an edit to one is unnoticed.

**G39 IS NOT FULLY SETTLED BY THIS TASK, so the entry is rewritten rather than deleted.** Its settlement also asks *"a decision on whether `SW_HI_BOOST` joins `SELECTORS` so a gang's membership is enumerable"* — `SW_HI_BOOST` carries `gang: HI_FREQUENCY_GANG` with no `SELECTORS` entry, so a check over "every pole of a gang" **cannot see it**. That is an owner-facing decision and not yours. Implement the check for the poles that ARE enumerable, and rewrite G39 to record exactly what the check covers and what it still cannot.

- [ ] **Step 1: Write the failing test** — two `SELECTORS` entries sharing a gang with different `positions` are refused, naming the gang, both refs, and both lists.
- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it — the committed model must still pass**, since `SW_LO_BOOST` and `SW_LO_CUT` genuinely agree.
- [ ] **Step 5: Perturb** — make the comparison always pass, watch the divergent-poles test go red by name, restore, report.
- [ ] **Step 6: Rewrite G39** to state what is now checked and that a gang member outside `SELECTORS` is invisible to it. `shasum`, commit.

---

### Task 5: The fork's two stretch bounds agree

**Files:**
- Modify: `.tools/veroroute-perfboard/Src/Grid.h:241-242`
- Test: in the fork's own suite
- Modify: `veroroute.pin`, and `docs/known-gaps.md` — delete G18

**The defect.** `FootPrint::CanStretch` (`Src/FootPrint.h:90-91`) permits a shrink whenever `GetCols() > GetMinLength(m_type)`. `Grid::StretchComplex` (`Src/Grid.h:241`) refuses one only when `GetCols() == GetMinLength(eType)` — **exact equality** — and otherwise allocates `GetCols() - GetStretchIncrement`. For a type whose increment is 2 (`SWITCH_ST`, `SWITCH_DT`, `BLOCK_200`), a component at `min + 1` passes the permission test, misses the equality guard, and is allocated at **`min - 1`**. The same shape applies at the top end.

**Pre-existing in the fork's own machinery**, reachable by no current board — a moulded part carrying nets cannot be stretched at all, which is what keeps the Pultec boards clear of it.

**Rebuild the fork and PROVE the rebuild**: report the binary's mtime, the commit it was built from, and confirm a new string is present with `strings`. A test run against a stale binary is worse than no test. Bump `veroroute.pin`. **Run BOTH suites and report both counts.**

- [ ] **Step 1: Write the failing test in the fork's suite** — a 2-increment type at `min + 1`, shrunk, asserted not to go below `min`.
- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Give `StretchComplex` the same `>`/`<` test `CanStretch` uses.**
- [ ] **Step 4: Rebuild, prove the rebuild, run both suites.**
- [ ] **Step 5: Perturb** — restore the equality test, watch the new test go red by name, restore, report.
- [ ] **Step 6: Delete G18, bump the pin, `shasum` the ten files, run the five boards' own checks, commit both repositories.**

---

### Task 6: Split `seed-room.test.ts` by what its groups establish

**Files:**
- Modify: `tests/stripboard/model/seed-room.test.ts` (760 lines)
- Create: the files the split produces
- Modify: `docs/known-gaps.md` — delete G6

**The entry's own instruction: _"a split by what each group of tests establishes, not by line count."_** A split that cuts at line 380 to make two files of 380 is the wrong answer and will be rejected.

**No test's behaviour changes.** This is a move. The suite count must be identical before and after — not higher, not lower. **If a test needs editing to survive the move, that is a finding: report it rather than editing it**, because a test that only passed in company with its neighbours was not testing what its name said.

- [ ] **Step 1: Read the file and write down what each group of tests establishes**, in the report, before moving anything. That list is the split.
- [ ] **Step 2: Run `bun test tests/stripboard/model/seed-room.test.ts`** and record the exact count.
- [ ] **Step 3: Move the groups** into files named for what they establish, carrying each group's comments with it.
- [ ] **Step 4: Run the same tests** — the count must be identical and every name unchanged.
- [ ] **Step 5: Run the full suite** — 2440 pass / 0 fail.
- [ ] **Step 6: Confirm every new file is under the ceiling**, and that none is a dumping ground named for its leftovers.
- [ ] **Step 7: Delete G6, `shasum` the ten files, commit.**

---

## Self-review

**Coverage.** Nine of the eleven entries are settled: G7, G8, G26, G46 (Task 1), G3 (2), G41 (3), G18 (5), G6 (6). G39 (Task 4) is narrowed rather than settled, deliberately, and says so. G11 and G20 are excluded with reasons stated at the top rather than silently dropped.

**Placeholder scan.** Tasks 1, 4 and 6 carry no code block for their implementation step, because their deliverable is prose, a comparison whose shape depends on where the checker lands, and a move respectively. Each says what must be true instead. Task 6 deliberately has no "write the failing test" step — nothing is being added.

**Type consistency.** `bodyFor(part, pins)` in Task 2 matches `tools/guide/part-shapes.ts`'s existing signature. Task 3 touches `padLabelOf(component, pin)` — two arguments; an older plan names a third that no longer exists.

**One risk.** Task 3's refusal and Task 4's check both run over the committed model. If either fires on a committed board, the guard is wrong, not the board — the five boards are approved, adopted and passing. Both tasks assert that explicitly rather than trusting the suite to notice.
