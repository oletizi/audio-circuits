# Low-boost to adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry `pultec-low-boost` from the candidate the model already produces to a committed, verified, adopted board layout.

**Architecture:** Materialisation learns to set each part's span from the document it is materialising, which is where the pipeline breaks today. Net names then survive onto the materialised board, the layout-versus-circuit check learns that a pad is a part, and the existing adoption gate is fed a conforming run directory rather than relaxed.

**Tech Stack:** TypeScript on Bun; the pinned VeroRoute fork (C++, `.tools/veroroute-perfboard/`), which this plan changes.

**Spec:** `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md` — Milestone 1 and Milestone 2.

**Supersedes:** Tasks 4-6 of `docs/superpowers/plans/2026-10-16-pultec-five-boards.md`. Tasks 1-3 of that plan are complete (`dc22f38`, `da1e253`, `a21f740`). **Delete its Tasks 4-6 when this plan is approved** — supersede means delete, and two plans claiming the same adoption step is how one gets run twice.

**Evidence this plan is written from:** `.superpowers/sdd/2026-10-16-pultec-five-boards/task-3-report.md` — the first end-to-end run, with every refusal verbatim — and `docs/known-gaps.md` entries G5, G10, G12, G13, G14, G15, G16, G17.

## Global Constraints

- **An agent may never author the acceptance criteria for the artifact it is producing.** The objective, `stripboard/rules.json`, both hard area rules, the exemption registry and the benchmark gate are untouched by this plan.
- **A physical constraint must not be loosened to make something succeed.** Every span this plan reconciles is already inside the model's recorded range for its footprint; a span OUTSIDE that range must refuse, not widen the range.
- **The rendering layer consumes the physical model without modifying it.**
- **A disagreement between the model and the materialised board is reported, never adopted.**
- No fallbacks, no mock data outside test code. Every throw names what is missing, where to fix it, and why nothing is substituted.
- No `any`, no `as Type`, no `@ts-ignore`, no non-null assertions. Relative imports carry `.ts`.
- `lib/stripboard/` imports nothing from `tools/`, reads no file, spawns nothing.
- Files stay under the 300-500 line ceiling. `tools/stripboard/vero-export.ts` is 469 — extract rather than grow it.
- **A skipped check must never look like a passing one**, and a predicate that can never fire is this repository's recurring defect — found eleven times across two plans. Perturb every new guard, watch it go red by name, restore, and report the real output.
- **The fork is rebuilt and the rebuild is proven.** A fork change that is not in the binary under test is worse than no change: `REBUILD_PINNED_FORK` in `tools/guide/dump-model.ts:173` exists because a stale binary once looked like a passing run.
- Refusals teach. Supersede means delete. No Claude/AI attribution in commit messages. No git hooks. No `#` inside bash heredocs — use the Write tool and `git commit -F`. No `sed` for writes. Use `bun`, never ts-node.
- Baseline: `bun test` → **2285 pass / 0 fail across 206 files**, typecheck clean. The count may only go up.
- `make check` is red on nine boards for reasons predating this plan. **Task 6 is the first task permitted to change that, and only for `pultec-low-boost`.**

---

### Task 1: Pin today's refusal, and establish where the span is fixed

**Files:**
- Test: `tests/stripboard/materialize-span.test.ts` (create)
- Read only: `.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp`, `Headless_materialize_apply.cpp`, `Component.h`

**Interfaces:**
- Produces: a failing test that names today's refusal, and a written finding the next task implements against.

**Why this is its own task.** The controller ruled that `--materialize` should set each part's span from the document during placement, and that doing so should dissolve G13 — the packed-board problem that blocks `--stretch`. **That ruling must be established, not assumed.** If the apply phase can still collide, the next task is a different task.

- [ ] **Step 1: Write the failing test.** It materialises low-boost by the route Task 3 used and asserts the refusal, so the fix has a witness that fails today.

```ts
test("materialising low-boost refuses on the first span disagreement", async () => {
  const refusal = await materializeLowBoostExpectingRefusal()
  expect(refusal, "the premise: this is the defect G12 records").toContain(
    'no turn of "C18"\'s footprint puts its leads in the holes the document declares',
  )
  expect(refusal, "and the fork names why").toContain("this verb never stretches one")
})
```

- [ ] **Step 2: Run it and confirm it PASSES today** — this one test asserts the broken state, so it is green now and goes red when Task 2 lands. Say so in the report; a reviewer seeing a green test in a TDD step will otherwise read it as a defect.

- [ ] **Step 3: Read the three fork files and write down four facts.** Write them to `.superpowers/sdd/2026-10-16-low-boost-to-adoption/task-1-finding.md` with the Write tool:
  1. where the turn search reads the footprint's span — it is `PinOffsets(comp, offsets)` inside the `for (char direction : kDirections)` loop at `Headless_materialize_place.cpp:87-118`, which derives offsets from the component's CURRENT footprint;
  2. whether the component is ON the board at that moment or is being positioned — this is the crux of the G13 claim;
  3. what the apply phase (`Headless_materialize_apply.cpp`) does afterwards, and whether a changed span can collide there;
  4. the existing precedent for setting a component to a required length: `Component.h:122-138` does `while (GetCols() < reqLength) Stretch(true); while (GetCols() > reqLength) Stretch(false);` for DIP, SIP, STRIP_100, BLOCK_100, BLOCK_200 and the non-DIP switches, on a component under construction.

- [ ] **Step 4: State the verdict in that finding file** — either "setting the span in the turn search dissolves G13, because <reason>", or "it does not, because <reason>", with the file and line that establishes it. **If it does not, say so plainly and stop**; the controller re-plans rather than the implementer improvising.

- [ ] **Step 5: Commit** the test and the finding.

---

### Task 2: `--materialize` sets each part's span from the document

**Files:**
- Modify: `.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp`
- Test: `tests/stripboard/materialize-span.test.ts` (extend Task 1's file)

**Interfaces:**
- Consumes: Task 1's finding file, which says whether and where the span may be set.
- Produces: a materialised low-boost whose figures equal the model's.

**The defect (G12).** `--materialize` takes the component SET from a base `.vrt` and solves each part's facing against THAT board's footprints, which carry whatever span they were last at. The candidate declares its own lead separation. Nothing reconciles them. On `rcm s0`, **five of FIFTEEN two-lead parts want a LONGER span than the base holds, seven want a SHORTER one, and three already agree** — and every separation asked for is inside the model's recorded range (`LEAD_SPANS`: both film-cap footprints `minSpanHoles 2 … maxSpanHoles 4`, the axial resistor `2 … 16`; a separation of `n` holes is `n + 1` span holes). **This is not a candidate bending a lead too far.**

**CORRECTED 2026-10-16:** this plan said "seventeen two-lead parts", which conflated the board's 17 PARTS with its two-lead parts. It is 15 two-lead parts + 2 SIP headers = 17 parts, plus 10 pads = 27 placements. The inline table now lives in G12 of `docs/known-gaps.md`; **read it there rather than trusting a count in prose.**

**G13 is NOT a constraint on this task, and the plan was wrong to say it was.** Task 1 established that `MaterializeLayout`'s phase 2 calls `board.FloatAllComps()` (`Headless_materialize_apply.cpp:369`) before the turn search, so every part is already off the board and `PlaceTarget`'s single `PutDown` (`place.cpp:183`) is the document's own placement. **There is no "put it back", which is the entirety of G13.** G13 remains true of `--stretch` and `--move`, and its register heading was corrected to say so.

**`--materialize` already does this gesture for WIRES**, so this task is a PORT, not an invention: `PlaceDeclaredWire` (`place.cpp:388-437`) derives a span from the document, takes the component off, stretches it with a named refusal when it stops short, bounds-checks against `GRID`, and puts it down.

**LANDED at `ec9a5ed`, fork `d99415b`. Low-boost materialises: 4 cuts / 4 wires / 5 bridges, extent 19 x 23, matching the model exactly.** The text below is kept as the record of what this task was asked to do. **Two of its pointers are now dangling and deliberately not repaired:** G12 was DELETED from `docs/known-gaps.md` when the gap closed, per that file's own rule, so read its six constraints from this task's diff rather than from the register; and the witness test it names was deleted by this task, as it was meant to be. G13 remains, rewritten to stand alone as a limitation of `--stretch` and `--move`.

**READ ALL SIX CONSTRAINTS before writing anything.** Two of them will cost you a day if you meet them by surprise:

- **Constraint 1 is not "refuse any moulded part".** The two SIP headers on this board (`junction_grounds`, `junction_signals`) are exactly the type whose `Stretch` reallocates pins and loses nets silently — and they need no change, because their required length already equals their current one. Derive, compare, and refuse only on a DIFFERENCE.
- **Constraint 6 is the trap.** The turn loop keeps iterating after the first fit and records the best from the first, so a stretch written naively inside it leaves the footprint at the LAST facing's length.

**What must NOT happen.** A span outside the model's recorded range for that footprint must still refuse. Reconciling two records of one part's span is not permission to bend a lead further than the part allows.

- [ ] **Step 1: Write the failing test**, added to Task 1's file.

```ts
test("every two-lead part materialises at the separation the document declares", async () => {
  const board = await materializeLowBoost()
  const spans = twoLeadSpansOf(board)
  expect(spans.size, "the premise: low-boost places seventeen two-lead parts").toBe(17)
  for (const [ref, declared] of declaredSeparations()) {
    expect(spans.get(ref), `${ref} is at the separation the document declares`).toBe(declared)
  }
})
```

- [ ] **Step 2: Run it and read the failure** — expect the `C18` refusal from Task 1, because nothing materialises at all yet.

- [ ] **Step 3: Set the span in the turn search**, before `PinOffsets` reads the footprint. Follow `Component.h:122-138`'s own idiom rather than inventing one: grow or shrink to the required length with `Stretch`. The required length comes from the document's declared pin holes for that component, not from a table.

- [ ] **Step 4: Rebuild the fork and PROVE the rebuild.** Report the binary's mtime and the commit it was built from. A test run against a stale binary is the failure `REBUILD_PINNED_FORK` exists to name.

- [ ] **Step 5: Run both tests.** Task 1's refusal test must now go RED — that is the point of it — so delete it and say in the commit message that it was deleted because the refusal it pinned no longer happens. Supersede means delete.

- [ ] **Step 6: Perturb.** Make the span-setting a no-op, watch the span test go red naming the first part, restore, report the output verbatim.

- [ ] **Step 7: Prove the range is still enforced.** Feed a document declaring a separation OUTSIDE the footprint's recorded range and assert it refuses by name. **If no such refusal exists today, that is a finding for the controller, not a guard to invent inside this task.**

- [ ] **Step 8: Commit.**

---

### Task 3: A rule for which board a materialisation starts from

**Files:**
- Modify: `tools/stripboard/vero-export.ts` (the `materialize` entry, currently line 442), or an extracted module if that file would pass 500 lines
- Test: a new file beside Task 2's

**Interfaces:**
- Produces: a stated, tested rule for the base board.

**The problem, found by Task 3 of the previous plan and recorded as item 3 of its adoption list.** `--materialize` takes its component set from a `.vrt`. Two candidates exist and **both are wrong by default**: `boards/pultec-low-boost/pultec-low-boost.perfboard.vrt` is the committed layout and adoption would overwrite it; the `--import` board is derived and uncommitted. **Nothing says which one a materialisation starts from, and the answer decides what adoption actually writes.**

**This task states the rule and tests it. It does not quietly pick one at a call site.** A rule that lives in one caller's argument is not a rule.

**THE RULE, decided by the controller 2026-10-16 after the owner declined the question** (*"re materialize — I don't care"*), so it is a ruling and not his preference:

> **A materialisation starts from a base built fresh by `--import` from the circuit. The committed `.vrt` is adoption's OUTPUT and never its input.**

Three reasons, recorded so a later reader can overturn it on the evidence rather than on taste:

1. It makes the materialised board a pure function of the circuit and the candidate — reproducible, and comparable by content, which is what this repository already demands of a derived artifact.
2. **Starting from the committed file would make every materialisation inherit whatever incidental footprint state that file was last left in — which is the root of the span defect G12 records.** Fixing the span while keeping that file as the input leaves the same class of drift alive behind the fix.
3. A step that writes the file it also reads is a loop in which yesterday's accident becomes today's input.

**What this costs, stated rather than discovered:** anything in the committed `.vrt` that is not derivable from the circuit is lost at the first adoption. **The only known instance is net names** — the committed layout carries `NET_NAMES 14` with real names while `--import` writes every node as a bare dash — and Task 4 makes those come from the circuit, so this one is covered rather than dropped. **If an implementer finds a SECOND thing in that file that the circuit cannot produce, that is a finding for the controller and this ruling is reopened**, not a thing to carry across quietly.

- [ ] **Step 1: Write the failing test** — that materialising names its base explicitly and refuses rather than defaulting.

```ts
test("materialising names the board it starts from, and refuses to guess", () => {
  expect(() => materializeWithoutABase()).toThrow(/names no base board/)
})
```

- [ ] **Step 2: Run it and read the failure.**
- [ ] **Step 3: Implement the rule**, with a refusal naming both candidates and why neither is defaulted.
- [ ] **Step 4: Run it. Perturb the refusal, watch it go red by name, restore, report.**
- [ ] **Step 5: Commit.**

---

### Task 4: Net names survive onto a materialised board

**Files:**
- Modify: `tools/stripboard/seed-nets.ts` and whichever writer emits `NODE n NAME -`
- Test: a new file

**Interfaces:**
- Produces: a materialised board carrying real `NET_NAMES`, which unblocks the checklist.

**The defect (G14).** A materialised low-boost carries `NET_NAMES 0` and every `NODE n NAME -`, inherited from `--import`, which writes every node name as a bare dash. `buildChecklist` therefore refuses outright:

```
the cut at C5 is on node 11, which the dump stores no net name for, so the checklist
cannot say which nets that cut separates. Run `make update` so the layout's nets carry
the circuit's names.
```

The committed hand layout carries `NET_NAMES 14` with real names, which is why the checklist works there and on nothing this pipeline produces.

- [ ] **Step 1: Write the failing test.**

```ts
test("a materialised board carries the circuit's net names", async () => {
  const dump = await materialiseAndDumpLowBoost()
  const named = netNamesOf(dump)
  expect(named.size, "the premise: low-boost has fourteen nets").toBe(14)
  expect([...named].every((name) => name !== "-"), "no node is left a bare dash").toBe(true)
})
```

- [ ] **Step 2: Run it and read the failure** — expect `NET_NAMES 0`.
- [ ] **Step 3: Implement.** The names come from the circuit's own nets, never invented.
- [ ] **Step 4: Run it, then run `buildChecklist` on the result** and confirm the R6 refusal is gone. **Look at the checklist, do not only assert it built.**
- [ ] **Step 5: Perturb** — drop one name, watch the checklist refusal return naming that node, restore, report.
- [ ] **Step 6: Commit.**

---

### Task 5: `assertLayoutMatchesCircuit` learns that a pad is a part

**Files:**
- Modify: `tools/guide/circuit.ts:61,72`
- Test: a new file

**The defect (G5, now OBSERVED rather than predicted).** On the materialised board:

```
the layout and the circuit do not hold the same parts, so a build packet would be wrong:
  in the circuit but not on the board: RV_LO_BOOST, SW_LO_BOOST
Bring the .vrt in step with the circuit's netlist (`make update`), place any new parts in
VeroRoute (`make edit`), save, then run this again.
```

**Both named refs ARE on the board**, as ten `PAD` lines. `onBoard` is built from `dump.parts` (`circuit.ts:61`) and a pads-only control has no `PART` line. **The remedy the message gives is wrong for this cause** — `make update` and `make edit` will not help, because nothing is missing. Correct the message in the same change.

- [ ] **Step 1: Write the failing test** — a board whose only representation of a control is pads passes the check.
- [ ] **Step 2: Run it and read the failure** — expect the message above.
- [ ] **Step 3: Implement**, counting pads as present and correcting the remedy text.
- [ ] **Step 4: Perturb** — make a genuinely absent part stop being reported, watch the test go red, restore, report. **The check must still catch a real absence; widening it to silence a false positive is the failure mode here.**
- [ ] **Step 5: Commit.**

---

### Task 6: A run directory the adoption gate accepts, and low-boost adopted

**Files:**
- Create: the run-directory producer
- Read: `tools/stripboard/run-dir.ts`, `tools/stripboard/adopt-checks.ts` — the contract
- **Write: `boards/pultec-low-boost/` — this is the FIRST task in three plans permitted to write a committed board file**

**Interfaces:**
- Consumes: Tasks 2-5. A board that materialises, names its base, carries net names, and passes the circuit check.

**Produce a conforming run directory rather than changing the gate.** The spec: this milestone *"completes a workflow whose acceptance machinery already exists."* A gate relaxed to accept a new producer is not that gate.

**STOP AND ASK before Step 5** if the owner's approval of the render is not on record. Adoption writes a committed board file, and the spec names the owner's call on a render as the acceptance channel.

- [ ] **Step 1: Read `adopt-checks.ts` in full** and write down every field it validates and what it compares each against. That list is the contract. The known fields: the recorded stamp must name the run directory, `netlistSha256` must match the netlist's hash, `builtCommit` must match the stamp beside the binary, and the candidate must be inside the run directory.
- [ ] **Step 2: Write the failing test** — a run directory the new path produced, handed to the same checks `adopt` runs, asserted to pass each BY NAME.
- [ ] **Step 3: Run it and read the failures.** They enumerate the contract.
- [ ] **Step 4: Implement the producer.** Every hash is computed, never copied.
- [ ] **Step 5: Perturb each recorded field in turn** and confirm the corresponding check refuses by name. **A manifest that satisfies a gate because the gate cannot see it is the defect this repository punishes hardest.**
- [ ] **Step 6: Adopt low-boost**, then run `make -C boards/pultec-low-boost check` and report its output verbatim, pass or fail.
- [ ] **Step 7: Commit.**

---

### Task 7: Classify the other four sections

**Files:**
- Test: none — the deliverable is a classification
- Create: a report; **nothing under `boards/` is written by this task**

**Milestone 2.** Run `low-cut`, `hi-cut`, `hi-boost` and `mid` against the pipeline Task 6 proved, and **classify every failure** as exactly one of: unsupported software behaviour, incompatible component geometry, impossible placement under existing constraints, or search exhaustion.

**The classification is the deliverable, because it names in advance the wrong move.** `mid`'s `B32529` capacitors may want a six-hole span against a four-hole recorded reach — that is a PHYSICAL constraint, qualitatively unlike a software gap. **A physical constraint must not be loosened to make the search succeed.** If a section cannot be built from the parts it specifies, that is a finding for the owner about the circuit.

- [ ] **Step 1: Run each of the four**, capturing every refusal verbatim.
- [ ] **Step 2: Classify each failure** into exactly one of the four categories, with the evidence that puts it there.
- [ ] **Step 3: Record anything new in `docs/known-gaps.md`** in the same change, per `CLAUDE.md`.
- [ ] **Step 4: Report.** Do not propose fixes — classification is the deliverable.
- [ ] **Step 5: Commit.**

---

## Out of scope, with their homes

- **G1, G2, G17** — the owner's label decisions and part labels running off the board. G1 is decided and specified in `docs/superpowers/specs/2026-10-16-panel-control-in-the-guide-design.md`; G2 and G17 await his call on a render. **G2 and G17 are the same question from two sides of the renderer and should be settled together.**
- **G10** — junction rows for pads. In the panel-control spec, blocked behind Task 4 here.
- **G16** — `boards/pultec-low-boost` declares no `sch`, so `make guide` cannot run on it. Needed for Milestone 4, not for adoption.
- **G15** — the frozen fixture and the physical model hold different parts (`board_terminals` versus `junction_grounds`/`junction_signals`). Not small, and not on this path.
- **G3, G6, G7, G8, G9, G11** — unrelated buckets.

## Self-review

**Spec coverage.** Milestone 1's six steps: generate (done, `rcm s0`), materialise (Tasks 2-3), verify independently (Task 6's gate), render for the owner (done in Task 3 of the previous plan, and again after labels change), incorporate what he asks (Tasks in the panel-control plan), adopt through the existing gate (Task 6), `make -C boards/pultec-low-boost check` (Task 6 Step 6). Milestone 2 is Task 7. **Milestones 3 and 4 are deliberately unplanned** — they are planned once Task 7 says what the other four sections need.

**Placeholder scan.** Task 3's implementation step names a rule to state without stating it, because **which base is correct is a decision the owner may want** — it is flagged in the task rather than hidden. Every other step carries its content.

**Type consistency.** `materializeLowBoost`, `twoLeadSpansOf`, `declaredSeparations`, `netNamesOf` are used consistently across Tasks 1, 2 and 4 and are introduced in Task 1's test file.

**One known weakness.** Task 1 asserts a currently-passing test, which the rubric would normally call a defect. It is deliberate — the test pins a refusal so that Task 2 makes it fail — and Task 1 Step 2 requires the implementer to say so. A reviewer should treat it as plan-mandated and judge the intent.
