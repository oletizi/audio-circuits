# Buildable Pultec Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a low-boost stripboard layout that passes `make check` — every net complete, every buildability constraint held — then the remaining four Pultec sections.

**Architecture:** The pipeline already searches, scores, gates and adopts. What it cannot do is place off-board pads, because every move generator enumerates candidates from `dump.parts` and a `PAD` line is not a `PART` line. The pinned fork can move a pad (measured, below); our move set never asks it to. This plan closes that gap, then measures what remains.

**Tech Stack:** TypeScript on Bun, the pinned VeroRoute fork (`veroroute.pin` → `ed6c5a6`), KiCad 9 libraries on disk.

**Spec:** `docs/superpowers/specs/2026-10-10-stripboard-pipeline-design.md` (S1a) argues from `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` (CRITERIA — **approved by the owner 2026-10-13**), under the parent program `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` (S1).

---

## Why the previous plan finished without finishing the job

`docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` is **complete** — 25 of 25 tasks, 1859 tests green. It did not produce a buildable board because **it was never scoped to.** Its own "What this plan does NOT deliver" section says so: *"This plan builds the pipeline; the layouts are its output... The four remaining Pultec sections laid out, built and measured is `S1`."*

So the pipeline exists and the boards are unbuilt, and no plan covered the gap between them. **This is that plan.** It is deliberately short: one blocker, measured, then re-measure and see what is actually left rather than guessing now.

## The measurement this plan rests on

Run on 2026-10-13 against `boards/pultec-low-boost` at `7f031a6`:

```
$ veroroute --move t.vrt --ref SW_LO_BOOST_2 --to 13,1 -o t3.vrt
MOVED SW_LO_BOOST_2 FROM 3,11 TO 13,1 IN GRID 14 32
$ echo $?
0
```

**Three facts follow, and every task below depends on them:**

1. **The fork moves an off-board pad.** `--move --ref <pad name>` resolves the name a `PAD` line prints and performs the move. A previous task report concluded *"the pads are not in `dump.parts` at all, so no gesture in the move set can move one either"* — the second half of that does not follow from the first, and it is wrong. The capability is there.
2. **A pad moves ALONE.** The output carries exactly one `MOVED` line. `--move`'s help warns that selecting a grouped part moves its group siblings; these pads are not grouped, so a pad row can be spaced one pad at a time.
3. **The hand layout already does this.** `--dump-board` on the owner's low-boost prints `SW_LO_BOOST_2..7` on strip 3 at columns 11, 14, 17, 20, 23, 26 — every third hole. Those nets close. The pipeline's own runs leave pads contiguous because `--import` lays a `PADS<n>` down as n adjacent holes and nothing afterwards spaces them.

So the ceiling recorded as structural — *"give the pad row one spare column between adjacent pads... nothing in this pass can produce that"* — is a gap in **our TypeScript**, not in the fork and not in the geometry.

## Global Constraints

Copied from the governing documents; every task's requirements include these.

- **An agent may never author the acceptance criteria for the artifact it is producing.** Criteria reach an artifact through a rule file, a spec, or a reviewing agent that is never the producer.
- **Never widen a bound, span table, whitelist or rules value to make something pass.** If a fix would require it, stop and report.
- **No fallbacks or mock data outside test code.** Throw instead; every `throw` names what is missing, where to fix it, and why it is not defaulted.
- **Never bypass typing:** no `any`, no `as Type`, no `@ts-ignore`.
- **Files 300–500 lines.** Split at real seams.
- **Relative imports carry the `.ts` extension.**
- **Look at the output, not only the tests.** Render it, print it, read it.
- **A skipped check must never look like a passing one.**
- **Derived artifacts are compared by content, never by timestamp.**
- **Supersede means delete** — no stubs left behind.
- **Verify library names against the thing itself.** Footprint and symbol names are checkable on disk; this repository has shipped three that did not exist.
- **A regex asserted against a long refusal message matches the message's reasoning rather than its verdict.** Assert the discriminating identifier, not a word the passing wording also contains. This class recurred five times in the previous plan.
- **Mutation testing cannot catch a predicate that is too permissive.** "N mutations, N killed" is evidence a check exists, not that it is tight.

## File Structure

| file | responsibility |
| --- | --- |
| `tools/stripboard/pad-provenance.ts` | **exists** — parses `PAD` lines into `PadLine`. Task 1 reads it; does not change it. |
| `tools/stripboard/movable.ts` | **new** — the one place that answers "what can a gesture move on this board", unioning `dump.parts` with `PadLine`s. Every generator reads it instead of `dump.parts`. |
| `tools/stripboard/moves.ts`, `moves-cluster.ts`, `moves-join.ts`, `moves-spread.ts` | **modify** — each currently iterates `dump.parts` directly (lines 256, 114, 95, 198). Each reads `movable.ts` after Task 1. |
| `tools/stripboard/moves-space.ts` | **new** — the spacing gesture: open a free hole between two pads of one off-board row. |
| `circuits/pultec/physical/parts.ts` | **modify** — 530 lines, over the ceiling. Task 6 splits it. |
| `docs/stripboard/pipeline-verification.md` | **modify** — Task 6 moves the pad finding into the committed record. |

---

### Task 1: The move set can see an off-board pad

**Files:**
- Create: `tools/stripboard/movable.ts`
- Create: `tests/stripboard/movable.test.ts`
- Modify: `tools/stripboard/moves.ts:256`, `tools/stripboard/moves-cluster.ts:114`, `tools/stripboard/moves-join.ts:95`, `tools/stripboard/moves-spread.ts:198`

**Interfaces:**
- Consumes: `padLinesOf(dumpText)` from `./pad-provenance.ts` returning `readonly PadLine[]`; `BoardDump.parts: readonly Part[]` from `../guide/dump-model.ts`. **Read both files before writing — use their real field names, not the names guessed here.**
- Produces: `movableRefs(dump: BoardDump, dumpText: string): readonly Movable[]` where `Movable` carries at least `ref: string`, `row: number`, `col: number`, and `kind: "part" | "pad"`. Tasks 2 and 3 consume it.

- [ ] **Step 1: Write the failing test.** The discriminating assertion is that a pad's ref appears, because that is the whole gap.

```ts
import { expect, test } from "bun:test"
import { movableRefs } from "../../tools/stripboard/movable.ts"
import { parseDump } from "../../tools/guide/dump-model.ts"
import fs from "node:fs"

const DUMP = fs.readFileSync("tests/fixtures/stripboard/pultec-low-boost-frozen.dump", "utf8")

test("an off-board pad is movable, and is reported as a pad rather than a part", () => {
  const movable = movableRefs(parseDump(DUMP), DUMP)
  const pad = movable.find((m) => m.ref === "SW_LO_BOOST_2")
  expect(pad, "the pad row's second pad is movable").toBeDefined()
  expect(pad?.kind).toBe("pad")
  // THE HAND LAYOUT'S OWN POSITION, so a parser that invented a position fails.
  expect(pad?.row).toBe(3)
  expect(pad?.col).toBe(11)
})

test("every part is still movable, so pads were added and nothing was traded away", () => {
  const dump = parseDump(DUMP)
  const movable = movableRefs(dump, DUMP)
  for (const part of dump.parts) {
    expect(movable.some((m) => m.ref === part.ref), part.ref).toBe(true)
  }
  expect(movable.length).toBeGreaterThan(dump.parts.length)
})
```

- [ ] **Step 2: Run it and confirm it fails.** `bun test tests/stripboard/movable.test.ts` — expect `Cannot find module '.../movable.ts'`. A failure for any other reason means the fixture or an import name is wrong; fix that before implementing.

- [ ] **Step 3: Implement `movableRefs`.** Union the two sources. Refuse rather than guess: a `PAD` line whose ref collides with a `PART` ref is an error naming both, because two things answering to one `--ref` means a gesture would move whichever the fork finds first. A FLOATING pad has no hole to move from (`--move` refuses it by name), so exclude it and say so in a comment rather than silently dropping it.

- [ ] **Step 4: Run the test and confirm it passes.**

- [ ] **Step 5: Point the four generators at it.** Replace each `for (const part of dump.parts)` with the movable set. **Expect the candidate count to rise and some counts in existing tests to change — that is the point of the task.** Where an existing test asserts a candidate count, update it to the measured new number and note in a comment that the increase is the pads now being included.

- [ ] **Step 6: Run the full suite and typecheck.** `bun run check`. Baseline is 1859 pass / 0 fail / 0 skip across 169 files. Any test that now fails is either a count to update (above) or a real regression — say which, per test, in the report.

- [ ] **Step 7: Mutate to prove the union is load-bearing.** Replace `movableRefs`'s pad branch with `return [...dump.parts].map(...)` and confirm the first test fails. Revert. Record the pass/fail counts.

- [ ] **Step 8: Commit.**

```bash
git add tools/stripboard/movable.ts tests/stripboard/movable.test.ts tools/stripboard/moves.ts tools/stripboard/moves-cluster.ts tools/stripboard/moves-join.ts tools/stripboard/moves-spread.ts
git commit -F <message file>
```

---

### Task 2: A gesture that spaces a pad row

**Files:**
- Create: `tools/stripboard/moves-space.ts`
- Create: `tests/stripboard/moves-space.test.ts`
- Modify: wherever the move kinds are enumerated (find it: `grep -rn "addsWire\|MOVE_KINDS\|kind:" tools/stripboard/moves.ts | head`)

**Interfaces:**
- Consumes: `movableRefs` from Task 1.
- Produces: a move kind that emits `--move --ref <pad> --to <row>,<col>` gestures. Task 3 runs it.

**What it is for, stated so the implementer does not invent an objective.** `--import` lays a `PADS<n>` down as n adjacent holes. Adjacent pads of one off-board component usually sit on **different nets** — `SW_LO_BOOST.2..7` are six different selector throws — so each abutment is a cut, and a net whose every hole is filled by a pad has nowhere for a wire to anchor. The hand layout spaces them every third hole. This gesture is how the search reaches that arrangement.

- [ ] **Step 1: Write the failing test.** Assert the gesture is PROPOSED for a contiguous pad row and NOT proposed for an already-spaced one — both directions, because a generator that proposes unconditionally is as useless as one that never proposes.

```ts
test("a contiguous pad row yields a spacing gesture naming one pad and a free hole", () => {
  const candidates = spacingGestures(/* the contiguous fixture */)
  expect(candidates.length, "a contiguous row has somewhere to go").toBeGreaterThan(0)
  const first = candidates[0]
  expect(first?.ref, "it names a pad, not a part").toMatch(/^SW_/)
})

test("an already-spaced pad row yields nothing, so the gesture is not proposed forever", () => {
  // THE OWNER'S OWN LOW-BOOST ROW: strip 3, columns 11/14/17/20/23/26.
  expect(spacingGestures(/* the hand-laid fixture */)).toEqual([])
})
```

- [ ] **Step 2: Run it and confirm it fails** with the module missing.

- [ ] **Step 3: Build the contiguous fixture by MEASUREMENT, not by hand.** Run `--import` on low-boost's netlist into a scratch run directory and dump it; that dump is what the pipeline actually starts from, so it is the honest fixture. Commit it under `tests/fixtures/stripboard/` with a provenance note naming the command and the commit, following the convention in `tests/fixtures/stripboard/provenance.txt` — basename on its own line, `sha256 <64 hex>` on the next.

- [ ] **Step 4: Implement the gesture.** Destination holes come from the board's own free holes, never from an assumed spacing: a hard-coded "every third hole" would be this agent authoring a criterion. Propose a pad's move to a free hole that reduces the number of same-strip abutments between different nets, and let `accepts` decide. Refuse to propose a destination that is occupied — `--move` refuses it anyway, and a candidate that cannot apply wastes an evaluation.

- [ ] **Step 5: Run both tests and confirm they pass.**

- [ ] **Step 6: Run the full suite and typecheck.** Report both numbers.

- [ ] **Step 7: Mutate.** Remove the already-spaced guard and confirm the second test fails. Revert, record counts.

- [ ] **Step 8: Commit.**

---

### Task 3: Measure what the two new gestures actually buy

**Files:**
- Modify: `docs/stripboard/pipeline-verification.md` (a new section)
- No production code changes. **If this task wants to change production code, stop and report — that is a finding for a later task, not this one's licence.**

**This task's deliverable is a number, and it may be a disappointing one.** Report what was measured, never what was hoped. The previous plan's benchmark tests had to be rewritten once because a brief asserted the hoped result.

- [ ] **Step 1: Record the before state, from a real run.** `make -C boards/pultec-low-boost place SEED_ARM=import` and read the report. Capture: cuts, open-net count, `F`, and which nets are open with the cause each one reports.

- [ ] **Step 2: Run the same board with the same seed and arm**, after Tasks 1 and 2. Capture the same five figures.

- [ ] **Step 3: Write the comparison into `pipeline-verification.md`** as a new numbered section: the command, the commit, both figure sets, and the delta. Name the seed and the arm — a figure without them is not reproducible.

- [ ] **Step 4: State plainly whether `HC1` now holds on this board.** If it does not, list every still-open net with its reported cause, and say which of the three shapes it is: (a) a wire was plannable and rejected on cost, (b) no wire was plannable, (c) the net's parts are unplaced. **Those three have different remedies and conflating them is how the previous plan lost a route.**

- [ ] **Step 5: Commit** the measurement.

---

### Task 4: Owner decision gate — route 3

**This task is OWNER-BLOCKED and no agent may clear it.** `docs/superpowers/specs/2026-10-13-route-3-completion-pass-design.md` is `draft-for-owner-review` and names three decisions: the evaluation budget (one shared cap or a second explicit key under `PAR3`), whether a stopping rule describes the search or the whole run, and whether CRITERIA gains a clause for a second pass.

**What proceeds meanwhile:** Tasks 1–3 and 6, all of which are independent of it. **What is blocked:** wiring `completionPass` into `place`.

- [ ] **Step 1: Read Task 3's measurement before asking.** If `HC1` holds on low-boost without route 3, the wiring may not be needed at all, and that changes the question put to the owner. Report which it is.

- [ ] **Step 2: Put the three decisions to the owner, with Task 3's figures beside them**, and stop. Do not pick a default.

---

### Task 5: Carry the result to the remaining four sections

**Files:**
- Modify: `boards/pultec-low-cut/`, `boards/pultec-mid/`, `boards/pultec-hi-boost/`, `boards/pultec-hi-cut/` layouts, via the pipeline and the adoption gate only.

**Depends on Task 3 showing `HC1` holding on low-boost.** If it does not, this task does not start — report that instead of running four boards through a pipeline that cannot finish one.

- [ ] **Step 1: Run each of the four** through `make -C boards/<board> place SEED_ARM=import`, one at a time. Six concurrent fork processes have been observed to crash autofill; do not parallelise.

- [ ] **Step 2: Adopt each result through the gate**, never by copying a `.vrt` by hand. `adopt` is the only thing permitted to write under `boards/`, and it refuses ten things by name. **A refusal is a finding: report it, do not weaken the gate.**

- [ ] **Step 3: Run `make check` and read the whole output per board.** Report the tally and every constraint verdict that changed.

- [ ] **Step 4: Commit** each adopted layout separately, with its run's figures in the message.

---

### Task 6: The record, and three pieces of hygiene

**Files:**
- Modify: `docs/stripboard/pipeline-verification.md`
- Modify: `circuits/pultec/physical/parts.ts` (530 lines — over the ceiling)
- Modify: the `status:` line of three spec files

Batched because each is a small independent edit of the same kind.

- [ ] **Step 1: Move the pad-geometry finding into the committed record.** It currently lives only in `.superpowers/sdd/2026-10-10-stripboard-pipeline/completion-pass-report.md`, which is gitignored — so the finding that bounded the whole project was not in the repository. Write it into `pipeline-verification.md` **with the 2026-10-13 correction**: the fork can move a pad, the limit was in our move set, and Task 1 closed it.

- [ ] **Step 2: Split `parts.ts` back under 500 lines** at a real seam — the rotary/symbol material and the junction-row material are two subjects. Run `bun run check` after; an unresolved module shows up as a confusing type error at an untouched line, not as "module not found".

- [ ] **Step 3: Correct three stale spec status lines**, but only after asking the owner which he has reviewed. `2026-10-08-agent-authored-boards-design.md`, `2026-10-09-pultec-section-scaffold-design.md` and `2026-10-10-stripboard-pipeline-design.md` all read `draft-for-review`, and nothing distinguishes "nobody looked at this" from "approved, header never updated". **Do not set a status the owner has not given.** If he has not reviewed one, leave it and say so.

- [ ] **Step 4: Commit.**

---

### Task 7: The two span-data gaps, each reported rather than guessed

**Files:**
- Modify: `lib/kicad/lead-span-sources.ts` — only if a real datasheet figure is in hand.

**Neither half of this task may invent a dimension.** `PAR2` refuses an unlisted footprint by name, and that refusal is correct behaviour.

- [ ] **Step 1: `pt2399-core`'s two footprints.** `C_Disc_D5.0mm_W2.5mm_P2.50mm` (ten capacitors) and `CP_Radial_D5.0mm_P2.50mm` have no sourced lead length: Vishay's D Series states none, and Walsin's range stops below this board's values. **Report this to the owner as a parts question** — either a part whose datasheet states a lead length, or a decision that `pt2399-core` stays ungraded on `HC5`/`HC9`. Do not estimate.

- [ ] **Step 2: The Yageo lead length.** The span table records Vishay MBB/SMA 0207 while `parts/resistor-*-0207.json` (nine files) buy Yageo MFR-25FBF52, and the Yageo lead length is recorded nowhere. Lead length is the only dimension setting the maximum, so the 16-hole ceiling currently rests on the wrong datasheet. If the Yageo datasheet states a lead length, record it with its source and re-derive; if it does not, record that the ceiling is unsourced.

- [ ] **Step 3: `transistor-preamp-staged`'s two footprints are NOT this plan's.** That board is implemented on another branch; its span data lands there. Say so and move on.

- [ ] **Step 4: Commit** whatever was actually sourced, with each figure's provenance.

---

## Self-review

**Spec coverage.** CRITERIA's `HC1` is the goal and Tasks 1–3 and 5 pursue it; `HC5`/`HC9` data gaps are Task 7; `G2`'s adoption gate is consumed unchanged by Task 5; `G4`'s `make check` admission landed in the previous plan's Task 25. The parent's `S1` — *"laid out, built and measured against the model's predictions"* — is Task 5 for the layout half, and the **build and the measurement remain the owner's**, as `S1` itself records.

**Gap I am naming rather than hiding.** This plan does not deliver a board the owner has built and measured. It delivers layouts that pass `make check`. Whether one of them is a board he wants to solder is `G5` — the judgement that stays a human's — and no task here automates it.

**Placeholder scan.** No "TBD" or "handle edge cases". Task 1's test code names a real fixture and real refs taken from a measured dump. Task 2's fixture is built by measurement in its own step rather than assumed. Tasks 4 and 7 contain no implementation steps **by design** — they are decision gates, and their steps are "ask and stop", which is a concrete action.

**Type consistency.** `movableRefs(dump, dumpText)` and `Movable { ref, row, col, kind }` are used identically in Tasks 1, 2 and 3. Task 1 Step 1 instructs the implementer to read `pad-provenance.ts` and `dump-model.ts` for their real field names before writing, because this plan's author did not verify every field name and says so rather than inventing one.

**Ordering.** Task 3 gates Task 5, and Task 3's result changes the question Task 4 asks. Tasks 6 and 7 are independent and can run at any point.
