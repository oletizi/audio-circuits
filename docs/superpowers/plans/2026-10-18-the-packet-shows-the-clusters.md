The Packet Shows the Clusters — Implementation Plan
===================================================

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the printed build packet says which parts are scaffolding, which
cluster each belongs to, whether to fit it in the build being built, and stops
calling a 0 Ω wire link a resistor to stand on end.

**Architecture:** the guide gains one new input (the board's existing
`ScaffoldDoc`, loaded the way `powerUpChecks` already is) and produces three new
outputs from it (a fit-condition column, a stand-in-groups section, a fourth
hatched layout image). A new `make check` guard asserts the scaffold doc and the
layout agree about group membership. Nothing in the model, and no `.vrt`, changes.

**Tech Stack:** TypeScript on Bun, `tools/guide/*` for the packet,
`lib/board/scaffold/*` for the doc, the pinned VeroRoute fork for dumps,
Chrome headless for the PDF.

**Spec:** `docs/superpowers/specs/2026-10-18-the-packet-shows-the-clusters-design.md`

Global Constraints
------------------

- **The five committed `.vrt` files and five `wiring.md` files end byte-identical.**
  Verify with `shasum` before and after, and `git status --porcelain` must list
  nothing under `boards/` except regenerated guide artifacts.
- **Baseline: `bun test` 2453 pass / 0 fail across 232 files; `bun run typecheck`
  clean.** The count may only go up.
- **No `any`, no `as Type`, no `@ts-ignore`, no non-null `!`.**
- **No fallbacks and no mock data outside test code.** Throw, naming what is
  missing, where to fix it, and why it is not defaulted.
- **Imports are explicit relative paths with the file extension**
  (`"../../lib/model/types.ts"`). No `@/` alias in this repository.
- **Files stay 300-500 lines.** `tools/guide/checklist.ts` is ~360 and grows in
  this plan; if it passes 500, split by what each group establishes.
- **No Claude/AI attribution in commit messages.** No `Co-Authored-By`, no
  `Claude-Session`, no generated-with footer.
- **Never put `#` inside a bash heredoc or multi-line quoted argument** — use the
  Write tool and `git commit -F <file>`. **Never use `sed` to write or execute.**
- **Never bypass a git hook**, and never install one.
- **An agent may never author the acceptance criteria for the artifact it
  produces.** In this plan that bites once, hard: **the hatch styles are a
  candidate for the owner to rule on, not a choice to settle.** See Task 6.
- **A finding you are not fixing goes in `docs/known-gaps.md`**, committed in
  the same change. The register runs through G55.
- Branch: `feature/the-packet-shows-the-clusters`, cut from `main` once
  `feature/the-approved-boards-stay` has merged.

---

### Task 1: the guide can see the scaffold doc, and page one names the wiring sheet

**Files:**
- Modify: `tools/guide/circuit.ts` (`BoardCircuit`, `boardCircuitFrom`, `loadBoardCircuit`)
- Modify: `tools/guide/guide.ts` (page-one provenance block)
- Test: `tests/guide/scaffold-loading.test.ts` (create)

**Interfaces:**
- Consumes: `ScaffoldDoc` from `lib/board/scaffold/doc.ts`; the `SCAFFOLD`
  export on each board module (`circuits/pultec/physical/low-boost.ts:63`).
- Produces: `BoardCircuit.scaffold: ScaffoldDoc | undefined`, which Tasks 4, 5
  and 6 all read.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadBoardCircuit } from "../../tools/guide/circuit.ts"

const REPO_ROOT = moduleRepoRoot()

test("a Pultec section's circuit carries its scaffold doc", async () => {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", "pultec-low-boost", "perfboard.json"))
  const circuit = await loadBoardCircuit(declaration)
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")
  expect(scaffold.section).toBe("low-boost")
  // THE PREMISE, before any count that rests on it: four absent sections.
  expect(scaffold.groups.length, "low-boost holds a group for each of the other four sections").toBe(4)
  expect(scaffold.groups.flatMap((g) => g.partIds).length, "eight stand-in parts").toBe(8)
})

test("a board that declares no SCAFFOLD loads undefined rather than an empty doc", async () => {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", "pt2399-core", "perfboard.json"))
  const circuit = await loadBoardCircuit(declaration)
  expect(circuit.scaffold).toBeUndefined()
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `bun test tests/guide/scaffold-loading.test.ts`
Expected: FAIL — `Property 'scaffold' does not exist on type 'BoardCircuit'`.

- [ ] **Step 3: Add the field, following `powerUpChecks` exactly**

`powerUpChecks` is the precedent for an optional export the guide reads off the
circuit module. Read how it is declared, threaded through `boardCircuitFrom`,
and read in `loadBoardCircuit`, and do the same for `scaffold`. Validate the
loaded value with `asScaffoldDoc` (`lib/board/scaffold/doc.ts`) so a malformed
export refuses at load rather than at render.

**`undefined` is not defaulted to an empty `ScaffoldDoc`.** An empty doc
asserts "this board has no groups to populate"; `undefined` says "this board
declares none". They are different claims and `asScaffoldDoc` refuses the empty
one anyway. Write that reason in a comment.

- [ ] **Step 4: Page one names `wiring.md`**

The provenance block on page one names `perfboard.json` and the circuit module.
Add the board's `wiring.md`, described as a document this packet does not
replace. For a board with no `wiring.md`, say nothing rather than naming a file
that is not there — and determine which boards have one by looking, not by
assuming it tracks `SCAFFOLD`.

- [ ] **Step 5: Run the suite and typecheck**

Run: `bun test && bun run typecheck`
Expected: PASS, count up by 2.

- [ ] **Step 6: Commit**

---

### Task 2: `make check` asserts the scaffold doc and the layout agree

**Files:**
- Create: `tools/perfboard/scaffold-membership.ts`
- Modify: wherever `make check`'s constraint list is assembled (find it; do not
  guess the path)
- Test: `tests/perfboard/scaffold-membership.test.ts` (create)

**Interfaces:**
- Consumes: `ScaffoldDoc.groups`, and the `PART` refs of a `--dump-board`.
- Produces: a check that refuses, named, when the two disagree.

**Why this task exists, because it is the one the reviewer called a test and it
is not.** `assertLayoutMatchesCircuit` compares the LAYOUT against the CIRCUIT.
**Nothing compares the SCAFFOLD DOC against either.** So today a group could
claim a part that is not placed, or a placed `SI_` part could be claimed by two
groups or by none, and the first thing to notice would be a hatched diagram at
a bench. An immutable layout means a misidentified part gets blamed on the
layout rather than on the diagram.

- [ ] **Step 1: Write the failing test**

Three cases, on hand-built docs plus the real low-boost dump:
1. the real board and its real `SCAFFOLD` agree — passes;
2. a doc claiming a part id absent from the dump — refuses, naming the part and
   the group;
3. a doc claiming one part id in two groups — refuses, naming both groups.

Assert the real-board case FIRST and separately: a check that vacuously passes
on an empty group list must not be able to satisfy cases 2 and 3 by refusing
everything.

- [ ] **Step 2: Run it and verify it fails**

Expected: FAIL — the module does not exist.

- [ ] **Step 3: Implement the check**

Every `partIds` entry of every group resolves to a `PART` ref in the dump; no
part id appears in two groups. A board with no `ScaffoldDoc` is **not** a
failure and **not** a silent pass: it reports that it had no scaffold to check,
in the `make check` output, because *"a skipped check must never look like a
passing one"* (`CLAUDE.md`).

- [ ] **Step 4: Wire it into `make check` and run it on all five sections**

Run: `make check` on each of the five Pultec boards.
Expected: all five pass, and each run's output states the scaffold check ran.

**If it refuses on a committed board, the guard is wrong — not the board, and
not the model. Stop and report rather than editing a board or a doc.**

- [ ] **Step 5: Commit**

---

### Task 3: a 0 Ω part is a wire link, in the checklist and in the images

**Files:**
- Modify: `tools/guide/off-board.ts` (`valueLabel`)
- Modify: `tools/guide/checklist.ts` (`mountingCell`, and which section the row lands in)
- Modify: `tools/guide/render-parts.ts` (the shape drawn for a 0 Ω part)
- Modify: `docs/known-gaps.md` (G55)
- Test: `tests/guide/zero-ohm-is-a-wire-link.test.ts` (create)

**This is G55 level 1 and the owner ruled it in:** *"folding in 0ohm fix: do
it"*. **Level 2 — the layout no longer PLACING a 0 Ω part — stays out**, because
it changes placement and therefore the five adopted `.vrt` files, which his
*"Leave the approved boards alone for bow"* ruling forbids (G47).

**The rule already exists in the tree and is not to be re-invented.**
`lib/board/scaffold/wiring.ts:35-36` carries it as a named constant — *"How
`describePart` renders a zero-ohm part: a wire link, not a resistor to buy"* —
and `lib/board/scaffold/shorts.ts:74` is the `ohms === 0` test. The printed
guide is the one consumer that does not apply it. **Reuse, do not duplicate:**
two places deciding what 0 Ω means is the defect this fixes, one layer up.

**The owner's own statement of the cost governs the fix**, and it is not a
purchase problem: *"I'm not likely to go looking for a 0 ohm resistor. But, I am
likely to question the validity of a perfboard layout that specifies 0 ohm
resistors."* So the test of success is that the packet stops SPECIFYING a 0 Ω
resistor, in the table and in the picture both — not that it explains one
better.

- [ ] **Step 1: Write the failing test**

On the real `pultec-low-boost`:
1. the premise: exactly three of its parts are 0 Ω
   (`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`, `SI_HI_CUT_RV_HI_CUT.ccw-wiper`,
   `SI_LOW_CUT_RV_LO_CUT.ccw-wiper`), asserted from the dump and not hardcoded
   as a list of three names only;
2. no checklist row for any of them carries `0R` as its Value, nor any
   `MOUNTING_LABEL` value;
3. each appears as a wire link, in words a builder can act on;
4. the designators and values images draw no resistor body for those three
   parts;
5. a non-zero resistor (`R2`, 56K) is untouched in all of the above.

- [ ] **Step 2: Run it and verify it fails**

Expected: FAIL — rows read `0R` and `STAND ON END`.

- [ ] **Step 3: Implement**

`valueLabel` and `mountingCell` consult the existing zero-ohm rule. A 0 Ω part
has no body, so its mounting is not `NO_FOOTPRINT` or `NO_SPAN` — both of those
name GAPS in footprint data — but its own sentence, the way `PAD_NO_MOUNTING`
does for a landing pad (`tools/guide/checklist.ts:172-180`). Read that comment;
it is the pattern.

**Which checklist section a wire link belongs in is a question about the printed
artifact.** The spec does not settle it and **you may not.** Implement it in the
**Wire links** section the checklist already has, which is the smallest claim
available, and **record in your report that this placement is unratified** so
the controller puts it to the owner with the render.

- [ ] **Step 4: Run the suite, regenerate both low boards' guides, read the PDFs**

Expected: PASS; and the three rows read as wire links on the printed page.
Quote them verbatim in your report.

- [ ] **Step 5: Rewrite G55 in `docs/known-gaps.md`**

Level 1 is done; level 2 is not. **Do not delete the entry** — rewrite it so
what remains is only the layout-level half, keeping the owner's verbatim
correction about credibility and the recorded fact that a 0 Ω resistor is
legitimate and must not be banned from the model. **Check what a deletion would
take with it** before removing any paragraph.

- [ ] **Step 6: Commit**

---

### Task 4: every part row says whether to fit it

**Files:**
- Modify: `tools/guide/checklist.ts`
- Test: `tests/guide/fit-condition.test.ts` (create)

**Interfaces:**
- Consumes: `BoardCircuit.scaffold` (Task 1).
- Produces: a new column on the four part sections, read by nothing else.

**The column is a CONDITION, not a cluster name**, and the spec says why: a
cluster name is a label the builder looks up elsewhere, and **every row carries
a printed checkbox**, so eight of low-boost's boxes must stay unticked in most
builds. Values:

| value | when |
| --- | --- |
| `always` | the part is in the board's own circuit |
| `only with the <section> group` | the part is in that absent section's stand-in group |

Column header: `Fit`. The four part sections get it; **Wire links, Solder
bridges and Cuts do not** — they are not parts and have no group. A board with
no `ScaffoldDoc` gets the column with every row reading `always`, which is true
and keeps one table shape across boards.

- [ ] **Step 1: Write the failing test** — on the real low-boost: 8 rows carry a
  `only with the ...` condition, every other part row reads `always`, the eight
  are exactly the `ScaffoldDoc`'s part ids (derived from the doc, not listed),
  and each names its own group. Assert the premise (8 stand-ins, 4 groups)
  first.
- [ ] **Step 2: Run it and verify it fails**
- [ ] **Step 3: Implement**, deriving group membership once into a
  `Map<partId, section>` rather than scanning the groups per row.
- [ ] **Step 4: Run the suite; regenerate and read both guides**
- [ ] **Step 5: Commit**

---

### Task 5: the stand-in groups section

**Files:**
- Modify: `tools/guide/checklist.ts` (or a new `tools/guide/stand-in-section.ts`
  if checklist.ts approaches 500 lines — check and decide)
- Modify: `tools/guide/guide.ts` (render the section)
- Test: `tests/guide/stand-in-section.test.ts` (create)

Three parts, in this order on the page:

1. **A blank line to record WHICH BUILD this is**, filled in by hand. The
   packet carries every applicable build, so no group decision below means
   anything until the build is named.
2. **One block per group, as a three-state CONFIGURATION record, never a tick.**
   The states: **populated here**, **not needed — that section is present**, or
   **carried on \<board\>**. A bare checkbox is forbidden here and the reason
   goes in a comment: the part rows already carry per-part checkboxes, and a
   ticked box on an omitted group cannot be read as either "all fitted" or
   "deliberately skipped". Each block names the absent section, its part count
   and its part ids. The two rules travel with it in the wiring sheet's own
   words: *"Populate a group whole, or leave it empty"*, *"One group, one
   board"*.
3. **Every build containing this board** — `scaffold.builds`, with the columns
   the wiring sheet uses (boards on the bench, populate here, carried
   elsewhere, junction pins).

**The row count is DERIVED and never written as a literal.** It is
`scaffold.builds.length`, which is 16 on a five-section Pultec — **not 31**,
which is the count of non-empty combinations of five sections globally. A test
asserting `16` would be a second statement of the same fact, free to drift from
the model; assert `rows.length === scaffold.builds.length`, and assert
separately that every row's board list contains this board.

A board with no `ScaffoldDoc` gets **one sentence** saying it holds no stand-in
groups and is populated the same way in every build — the `NO_FOOTPRINT` /
`NO_SPAN` precedent, where a gap says which gap it is rather than leaving a
blank.

- [ ] **Step 1: Write the failing test** — 16 rows on low-boost equal to
  `scaffold.builds.length`; every row contains `low-boost`; four group blocks,
  each with the three states available and no checkbox; the build line present;
  `pt2399-core` gets the one sentence.
- [ ] **Step 2: Run it and verify it fails**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run the suite; regenerate and read both guides as PDFs**
- [ ] **Step 5: Commit**

---

### Task 6: the clusters image — A CANDIDATE, NOT A DECISION

**Files:**
- Modify: `tools/guide/render.ts` / `tools/guide/render-parts.ts` (hatch fills)
- Modify: `tools/guide/packet.ts` (the fourth image)
- Modify: `tools/guide/guide.ts` (the fourth page and its legend)
- Test: `tests/guide/clusters-view.test.ts` (create)

**READ THIS BEFORE WRITING ANY CSS OR SVG.** The owner, 2026-10-18:
*"hatching—I don’t know until i see it"*. **You are producing a candidate for
him to look at. You do not get to decide what the packet ships with**, and the
plan will not tell you either, because the spec deliberately does not: that is
the `CLAUDE.md` invariant about an agent not authoring the acceptance criteria
for the artifact it produces, applied to the one purely visual decision here.
Build a defensible candidate, render it, and **say in your report that the hatch
styles are unratified.**

Two constraints DO bind the candidate, and they are reasons rather than tastes:

- **It must survive a black-and-white print and a photocopy.** Four grey tints
  do not stay distinct; distinct hatch geometries do. So: hatch, not tint, not
  colour.
- **No new text goes inside the board outline.** G2 records that pad labels
  already crowd their row and G17 that a long part label runs off the outline. A
  third per-part string feeds both. The groups are told apart by fill and named
  only in the legend.

**The legend states what an UNHATCHED part means** — that it belongs to this
board's own circuit and is fitted in every build. Otherwise the absence of a
hatch has no stated meaning, which matters exactly when a hatch is faint on a
bad photocopy.

- [ ] **Step 1: Write the failing test — assert the MAPPING, not the presence**

A view that defines four hatches and applies one to the wrong part would pass a
presence check. So, on the real low-boost, checked on component identities
before rendering and then on the emitted SVG:
- every part id in `ScaffoldDoc.groups` appears exactly once in the view;
- each carries the hatch of its own declared group;
- no own-circuit part carries any scaffold hatch;
- every hatched part has a checklist row whose `Fit` is a group condition, and
  every such row's part is hatched;
- no text node sits inside the board outline.

- [ ] **Step 2: Run it and verify it fails**
- [ ] **Step 3: Implement the fourth image and the legend**
- [ ] **Step 4: Regenerate both low boards, print to PDF, and READ THE PDF AT
  PRINTED SCALE**

Not the SVG at full resolution — the PDF page at the size it prints, because
that is where a hatch is faint or two hatches stop being distinguishable.
Report what you could and could not tell apart. **This is the observation the
owner's ruling will rest on, so a cheerful report here is worse than none.**

- [ ] **Step 5: Commit, and report the hatch styles as UNRATIFIED**

---

### Task 7: settle G45, and hand the render to the owner

**Files:**
- Modify: `docs/known-gaps.md`
- No source changes.

- [ ] **Step 1: Re-read G45 against what now exists.** It names two acceptable
  fixes — print the conditionality into the packet, or have page one name
  `wiring.md`. This plan does both. **Delete it only if both halves are true of
  the generated artifact you just read**, and if any part of it survives
  (panel-part specs: the pot being 47k LOG, the switch having six positions),
  **rewrite it to that residual rather than deleting it.** A deletion can be
  correct about its entry and still leave the thing it tracked alive.
- [ ] **Step 2: Record what is unratified**, as a register entry rather than as
  a note to the controller: the hatch styles, the checklist section a wire link
  lands in, and the `Fit` column (the one ruling of five the owner did not
  speak to). Each is an owner decision, so it belongs in the owner-decision
  section with what was shipped and why it is provisional.
- [ ] **Step 3: Commit**

---

Self-review
-----------

**Spec coverage.** Change 1 → Task 1. Change 2 → Task 6. Change 3 → Task 4.
Change 4 → Task 5. G55 level 1 → Task 3. The promoted membership check → Task 2.
G45 → Task 7.

**Placeholders.** Tasks 4, 5 and 7 carry no code block. That is deliberate and
called out here rather than left as an omission: 4 and 5 are table-shape changes
whose exact strings are in the spec, and 7 is register editing. Task 2's test
step describes three cases without code because the fixture shape depends on
where `make check`'s constraint list is assembled, which the implementer must
find rather than be told wrongly.

**Type consistency.** `BoardCircuit.scaffold` is the only new interface, named
identically in Tasks 1, 4, 5 and 6. `ScaffoldDoc`, `StandInGroupDoc.partIds`,
`StandInGroupDoc.section` and `ScaffoldDoc.builds` are used as
`lib/board/scaffold/doc.ts:31-90` declares them.

**The ordering risk.** Tasks 3, 4, 5 and 6 all edit `tools/guide/checklist.ts`
or its renderer, and Tasks 3 and 7 both edit `docs/known-gaps.md`. **Implementers
run strictly sequentially, no exceptions** — the ruling R1/R4 in
`.superpowers/sdd/2026-10-18-the-hygiene-batch/progress.md` records what
concurrent implementers in one worktree already cost this repository once: an
agent ran `git checkout --` over its own work trying to isolate its diff.
