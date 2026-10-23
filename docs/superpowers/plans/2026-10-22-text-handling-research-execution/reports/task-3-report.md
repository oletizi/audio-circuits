# Task 3 report - KiCad's own field autoplacer, read in full

**Status: DONE_WITH_CONCERNS** (the concerns are scope limits I could not close
without building KiCad, listed at the end; nothing is left half-done.)

**Commit:** `187b468` on `feature/schematics-tooling`, pushed.
**Suite:** `3785 pass / 0 fail / 43488 expect() across 352 files`, with
`SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`
set. **Typecheck:** `bun run typecheck` clean (`tsc --noEmit`, no output).

---

## What was produced

- `docs/schematic/text-handling-research.md` **§3**, appended at line 1458.
  **728 insertions, 0 deletions** - §1 and §2 are byte-untouched, which
  `git diff --numstat` confirms.
- `docs/known-gaps.md` **G267**, ten clauses, inserted between G266 and G104.

## Step 1 - the version, re-driven rather than taken on trust

`KICAD_CLI` is **unset** in this environment (`${KICAD_CLI+SET}` is empty), so
`lib/kicad/netlist.ts:39` falls through to `lib/kicad/install.ts:94`'s macOS
candidate, `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`, which
reports **`10.0.5`**. Every URL in §3 is pinned to tag `10.0.5` and every blob
carries its SHA-256 in §3.0's table.

`eeschema/autoplace_fields.cpp` `[READ]` in full: 799 lines, SHA-256
`bfdb8fd1c88bbc607f14daf6cc2db12d22522e0b6ca3f68df7f701915a76ea8d`. Eight other
files were opened at named functions (`sch_field.cpp/.h`, `eda_text.cpp/.h`,
`text_attributes.h/.cpp`, `sch_edit_tool.cpp`, and the qa test file in full).

**I pinned by hash rather than by a committed probe**, because this is a reading
task that drives nothing: §3 pastes no probe output, so it adds nothing to
§1.11's checker contract. I confirmed that by running
`tests/schgen/text-metrics/document-pastes.test.ts` alone - 23 pass - and the
suite's `expect()` count rose by exactly 6, which is the six source-transcription
blocks §3 adds to the checker's `notOutput` list, each reported by name.

## Step 2 - the algorithm, and three findings beyond the prior art

§3.1 writes `DoAutoplace` out as pseudocode and names the whole search space:
**four sides, one rigid stack of all visible fields, one deterministic box
position per side, and one optional vertical snap.** No backtracking, no scoring,
no second pass.

**The finding that is new.** `chooseSideForFields` seeds its running selection
from the **colliding** sides - `chooseSideFiltered` records each side it erases
when `it->pins <= sel.pins` - and then carries that seed into the loop that ranks
the **surviving** sides. So a colliding side holding the global minimum pin count
strictly cannot be displaced by any clear side, **and the algorithm places fields
on a side it has just graded as colliding while a clear side was available.** The
zero-pin loop that runs first hides this in the common case and cannot help when
every surviving side carries a pin. The soft wire tier works by the same
mechanism, so a wire-colliding side also beats a *clear* side with more pins.

Six traces are published step by step in §3.3 so a reader can repeat them with
the file open. I also transcribed the two selection functions into a throwaway
script and drove the traces through it; **that script is deliberately not
committed** and §3.0 says so - the published traces are the evidence, not the
script.

Also recorded from the reading: `fitFieldsBetweenWires` computes `offset`,
compares it across colliders and then **never reads it** (recorded undiagnosed);
it leaves `field_box`'s size stale, which I checked and found **harmless** (a
measurement that found nothing wrong, in the register because that is the rule);
the dynamic and fixed spacing modes **coincide** for single-line fields at this
repository's text size; and the user-invoked `O` passes `AUTOPLACE_MANUAL` while
the automatic paths pass `AUTOPLACE_AUTO` - but the re-placement on an edit passes
**the mode the symbol was last autoplaced with**, which the prior art does not
say and which decides which behaviour a user sees.

Multi-line fields: there is no multi-line handling in the file at all. The height
comes from `SCH_FIELD::GetBoundingBox()`, and `GetTextBox` *does* merge per-line
rectangles because `IsMultilineAllowed()` defaults to `true` and `SCH_FIELD`
never sets it - while `SCH_FIELD::Plot` forces it false before plotting. I
report that as an **observation, not a defect**: it was not driven, and §1.2's
glyph set shows no newline in any of the 1086 strings this repository emits, so
it does not reach us either way.

## Step 3 - verified, not relayed, and it cuts both ways

**Both prior-art claims hold, and are now quantified.** Candidate set: ours is
`5 + Σ sides` per unit = **9 to 13** (11 for a two-terminal passive), against
KiCad's **4**, and ours is a pair of positions for two named fields where KiCad's
is a side for one stack. Obstacle model: richer on five checkable axes (per-field
boxes; a `GRID / 2` clearance where KiCad needs only non-intersection; an exact
segment test for a wire where KiCad uses its bounding box; the symbol's own pin
text as obstacles; weighted overlap area over every candidate).

**Three things KiCad does that we do not**, the first of which is bait and is
recorded as such in G267: `fitFieldsBetweenWires` is a **local repair** that moves
the chosen box, and our placer has no perturbation of any kind; pin **count** as
a preference; and the page as an obstacle **at selection time** - though that last
is a difference in where the constraint lives, since our frame is derived from
content rather than fixed, and containment is decided downstream by
`text-scene.ts`.

**Three corrections to `text-placement-prior-art.md` §5**, with that document
left unedited as the plan requires: its soft wire tier fires on `!side.x`, which
is **top and bottom**, not "a vertical side" (and that matters, because
`fitFieldsBetweenWires` is restricted to the same two sides); its fallback account
stops short of the ordinary case; and it read `master` without pinning a version.
I fetched both blobs and diffed them: **15 lines, none of them the algorithm**, so
§5's substantive reading stands - a correction in the flattering direction for
that document, recorded as one.

## Step 4 - issues, all retrieved, nothing fabricated

GitLab issues API, unauthenticated: `search=autoplace&in=title` returns **35**
issues, 2018-08-27 to 2026-08-01, **4 open / 31 closed**. **Sixteen descriptions
were read** and every quotation in §3.11 comes from those sixteen; three table
rows carry metadata only and no quotation. **#15868 was retrieved in full** -
open, three upvotes, zero comments, and it names exactly this problem shape.

**Nothing was unretrievable, and I found the one trap in my own method:**
**#15534 is open, is about this algorithm, and is absent from the 35** because its
title says *"Auto-placement"*. §3.11 and G267 both state that 35 is a lower bound
on a substring and not a census.

Two other near-misses I am reporting because they were the shape of a false green:

- The `qa/tests/eeschema` tree listing **caps at 100 entries per page**; the real
  count is **122**. A single-page listing would have given a truncated negative.
- `gh search code 'AutoplaceFields path:qa'` returned **nothing**, which is the
  right answer by accident. The unrestricted search returns 57 hits, **one** under
  `qa/`, and that one is `BOOST_FIXTURE_TEST_SUITE( AutoplaceFields, ... )` - the
  suite's *name*, not a call. Both the narrow and the broad query are reported.

The complaint taxonomy over the 35 is in §3.11. The load-bearing result:
**rotation geometry is the largest cluster and the only one upstream has tests
for**; the obstacle-model cluster has been worked (`getDrawableArea` exists
because of #19081, labelled `starter`); and the candidate-set cluster has not.

## The invariant

§3 elects nothing. §3.8 states that KiCad places with §1's Q3 **and that this is a
fact about KiCad rather than an argument for this repository**, with the election
named as G265 clause 4 and reserved to the owner. §3.13 collects four directions
and marks every one an untried MECHANISM, including one that is explicitly **not**
a mechanism but a warning against a particular argument. No acceptance criterion
is written anywhere in §3.

## Concerns

1. **Nothing was executed.** KiCad was not built, no schematic was loaded into
   eeschema, and the autoplacer never ran. Every behavioural statement in §3 is a
   reading of source. G267 clause (1) carries the CRITERION that would settle the
   side-selection finding behaviourally, and marks its mechanism (build the `qa`
   suite) as a guess.
2. **The clause-(1) finding is not diagnosed against any issue.** Its mapping to
   #14127 and #16538 is a candidate explanation; no attachment was opened and no
   comment thread was read. Both the section and the register say so.
3. **Seven of the nine files were read only at named functions**, not in full, so a
   behaviour that depends on something elsewhere in `eda_text.cpp` or
   `sch_field.cpp` would have been missed. §3.12 lists this and five other
   non-establishments.
4. **The multi-line observation is undiagnosed** in three specific ways named in
   §3.12 and G267 clause (9); I chose to record it rather than drop it, since it
   does not reach this repository.
5. **The setter-call-site enumeration behind the multi-line claim is
   `[THIRD-PARTY]`** - a GitHub code search over the `kicad-source-mirror` at
   `master`, not a read of every file at `10.0.5`. Marked as such in both places.
6. **§3 is long** (728 lines) and the register entry is ten clauses. I judged the
   house standard set by §1 and §2 to require this density; if a reviewer wants it
   shorter, the parts I would cut first are §3.6 and the clause-by-clause issue
   table, neither of which anything else depends on.

---

# Fix round 1

**Status: DONE.** Twelve items, twelve addressed, none disputed.
**Commit:** `a45a2c3`, pushed. **Suite:** `3785 pass / 0 fail / 43489 expect()
across 352 files` with `SCHGEN_SOURCE` set. **Typecheck:** clean (`tsc --noEmit`,
no output).

**The `expect()` movement, accounted for as in round 0.** HEAD was 43488 with six
fenced blocks in §3; §3 now has **seven** - the header-comment transcription
Important 2 required - and `document-pastes.test.ts` asserts once per unchecked
block in its "reported by name, never silently dropped" case. **+1**, with tests
and files unchanged at 3785 and 352.

**§1 and §2 untouched.** The earliest changed line in the research document is
**1477**, and §3 begins at **1461**. Round 0's property is kept in the form that
matters: no hunk touches a line before §3's heading.

## IMPORTANT 2 — the sentence as it now reads

§3.3 now opens on the specification, before any of the finding. The fenced
transcription of lines 38-44 is preceded by:

> **THE SPECIFICATION FIRST, BECAUSE THE FINDING IN THIS SUBSECTION IS A
> DEPARTURE FROM IT RATHER THAN A JUDGEMENT ABOUT IT.** `autoplace_fields.cpp`
> opens with a numbered description of its own process, and lines **38-44**
> `[READ]` say what step 2 does:

and followed by:

> **A side that is "sifted out" is gone, and steps 3 and 4 range over the
> "remaining" sides.** By that specification a colliding side can never be chosen
> while a non-colliding one exists, and the all-four-collide case is not described
> at all. **The code does something else** (clause (ii) below), which makes the
> behaviour **a departure from the file's stated algorithm rather than an opinion
> about the file's taste** - and it is the strongest available evidence that the
> seeding is unintended rather than a deliberate trade, since the deliberate trade
> would have been written down here. **It is twelve lines from the top of the file,
> and the first version of §3 did not cite it.**
>
> What this does not change: **nothing here was executed** (§3.0).

**G267 clause (1)** carries the same thing in the register, credited to the
reviewer rather than to me, and adds one observation of my own: the prior-art
document **quotes that specification three paragraphs above its own contrary
clause (c)** and never compares the two. Both the documented algorithm and the
actual one were already in §5; nothing there put them side by side.

## IMPORTANT 1 — the #14127 pairing, withdrawn

§3.3 now offers **#16538 alone** as a candidate, and states the refutation of
#14127 **where the pairing used to be** rather than four subsections away:
#14127's repro is *"Adding a symbol to the schematic"*, and placing a symbol
passes `AUTOPLACE_AUTO` at `sch_drawing_tools.cpp:487` and `:499` `[READ]` at the
pinned tag - **the first of them with a `nullptr` screen**, under the source's own
comment *"Not placed yet, so pass a nullptr screen reference"*. So two independent
things stop it: `aAvoidCollisions` is false, and at `:487` there are no colliders
at all. I added that second reason, which the brief did not name, because it is
stronger than the mode argument alone.

#14127 remains in §3.11's complaint table and in the clusters - it is a real
complaint about this algorithm - with a clause on its row saying the defect cannot
fire on it and pointing at §3.3. §3.12's bullet and G267 clauses (1) and (10) are
corrected the same way.

## The ten Minors

| | what was wrong | what it now says |
| --- | --- | --- |
| M-1 | *"`LIB_SYMBOL` refuses `AUTOPLACE_MANUAL` outright"* | The `wxFAIL_MSG` has **no `return`**, so a release build falls through and runs the manual algorithm. §3.1 says so and says it now agrees with §3.3(i)'s *"no refusal path anywhere"* - **with no exception rather than one**. I added that the fall-through is **latent**: the three `LIB_SYMBOL` call sites found all pass `AUTOPLACE_AUTO` with a `nullptr` screen (`symbol_editor_control.cpp:946`, `symbol_preview_widget.cpp:232` and `:287`, `[READ]` at the tag), with the enumeration marked `[THIRD-PARTY]`. |
| M-2 | *"far"* dropped from the claim under test | Quoted in full, with **the drop named as what it was** - a trim in the confirming direction. The claim **holds as written**: 14 categories in `OBSTACLE_CATEGORIES`, **11** of them in front of a candidate in `placeFields` (all but `junction`, `frame-border`, `dnp-cross`), against the **2** KiCad's algorithm distinguishes. I added the counterweight that belongs to the same claim: **KiCad's collector has no type filter at all**, so it sees item kinds we have no category for - ours distinguishes far more and treats them differently, KiCad's sees every kind and treats all but one the same. |
| M-3 | `occupancy.ts:72` quoted as *"reach"* | *"reaches"*, as the file has it. |
| M-4 | 9-13 presented as newly quantified | The prior art's **§7 already had the 11 and the 13** with the same decomposition, and §3.9 now says so. **The 9 and the formula are claimed as the extension** and nothing more. |
| M-5 | *"the side-selection rule … byte-identical"* | The seven functions that **are** byte-identical are named, and **`pinsOnSide` is excluded** - it is one of the two changed lines and it feeds the selection, so the rule's code is unchanged while one of its inputs is. §3.9's correction 3 and G267 clause (3) match. |
| M-6 | the one executed command carried no mark | `[RAN]`, with why it is pasted in prose rather than fenced (§1.11 holds a fenced `run` block to a committed log and this has none), and an explicit *"everything else is `[READ]`, `[ISSUE-READ]` or `[THIRD-PARTY]`"*. |
| M-7 | `[READ]` locally redefined for issues | A new mark, **`[ISSUE-READ]`, declared in §3.0** with why: an issue is a report, its comment thread was never opened, and a mark that means two things establishes neither. §3.11 uses it. |
| M-8 | *"57 hits"* did not reproduce | **The total is withdrawn.** 57 was the count of printed match LINES from `gh search code … \| wc -l`, not of files; the reviewer got 38 files. §3.10 now says a search total that moves is evidence about the search, and **asserts no total**. The load-bearing half - exactly one path under `qa/`, and it is the suite's *name* - never depended on it and reproduced exactly. Both near-misses are recorded, including the `path:qa` query that returned nothing and would have been right by accident. |
| M-9 | G267 (2), (8), (10) had no `Verified` line | All three now carry one, and each distinguishes what I confirmed from what is relayed: (2) splits the `[READ]` halves from the withdrawn code-search total, (8) marks the 2043.1 µm and 1422.4 µm figures RELAYED from §1, (10) marks the retrievals CONFIRMED and the #16538 link a candidate only. |
| M-10 | a second source observation not recorded | Recorded in §3.3 beside `getPreferredSides` and as **G267 clause (11)**. **I re-derived it rather than relaying it**: `SYM_ORIENT_0`'s swaps produce TOP, BOTTOM, LEFT, RIGHT and its comment reads `// TOP, BOTTOM, RIGHT, LEFT`; the other three orientations' comments are correct, which I checked case by case. Recorded undiagnosed, credited to the reviewer, and noted as reachable by clause (1) because a power symbol's hidden pins are still counted. |

## One deviation to declare

**The header-comment transcription is dedented by one space, deliberately and in
writing.** `document-pastes.test.ts`'s *"blocks that are NOT checked are reported
by name"* case requires each unchecked block's first non-blank line to begin with
a non-whitespace character, and a C comment line starts with ` *`. **The test went
red on the first attempt**, which is the guard working. The block now opens on
`*`, and a parenthetical immediately under it says the single leading space was
removed and why - because an undeclared dedent of a transcription is exactly the
kind of tidy §1.11 exists to stop.

## What round 1 did not change

- **Nothing was executed.** No KiCad build; the three new files were read at their
  call sites only. The §3.3 traces are unchanged and still hand traces.
- **No reproduction of #16538**, so it is still a candidate explanation.
- **The issue count is still a lower bound.** G267 clause (10) now carries the
  CRITERION that would settle it - a sweep matching *"auto-placement"* and
  *"auto place"* over title and description - marked as not done.
- **§3 still elects nothing** and authors no acceptance criterion.

## Nothing disputed

All twelve items were verified against the sources before being accepted, and
every one reproduced. The two settled in my favour - the central finding and the
uncommitted script - are recorded in G267 clause (1) as independently confirmed,
with the reviewer's reason for the script's absence written down beside it so the
next reader does not re-open it.

---

# Fix round 2

**Status: DONE.** One item, fixed. **No second instance found.**
**Commit:** `4fe4b41`, pushed. **Suite:** `3785 pass / 0 fail / 43489 expect()
across 352 files` with `SCHGEN_SOURCE` set - **exactly where round 1 left it**, as
a prose edit should leave it. **Typecheck:** clean.

## The item

§3.12's non-establishment bullet said *"the whole of the **eight** supporting
files"*. §3.0's table lists **twelve** files of which the first two were read end
to end, so the figure is **ten** - which §3.0's own sentence already said
correctly. **My fix round introduced the contradiction**: the bullet said "seven"
in round 0, and adding three files to §3.0's table should have taken it to ten
rather than to eight.

**The fix does not change the numeral; it removes it.** The bullet now lists the
ten by name - `sch_field.cpp`, `sch_field.h`, `eda_text.cpp`, `eda_text.h`,
`text_attributes.h`, `text_attributes.cpp`, `sch_edit_tool.cpp`,
`sch_drawing_tools.cpp`, **`symbol_editor_control.cpp`** and
**`symbol_preview_widget.cpp`** - and says why it lists rather than counts: the
count is the thing that went wrong, and a list cannot drift out of step with the
table the way a numeral did. **The two files the stale count hid are the last two
added**, which is exactly the coordinator's failure scenario, and they are now the
two the bullet names in bold.

**Checked rather than asserted:** §3.0's table has **12** rows matching `^| \``,
and rows 3-12 are basename-for-basename the ten the bullet names. The bullet also
states the arithmetic (*"twelve and only the first two were read end to end"*) so
a reader can re-derive it from the table instead of trusting the prose.

## The second-instance sweep: none

I swept §3 and G267 for every other place the same arithmetic could appear.

| candidate | verdict |
| --- | --- |
| §3.0 *"The other **ten** were opened at the functions and call sites this section names"* | **Correct.** This was already right; it is the sentence §3.12 contradicted. |
| §3.1 *"The **three** `LIB_SYMBOL` call sites found"* | **Correct and not the same count.** Three *call sites* across two files - `symbol_editor_control.cpp:946`, `symbol_preview_widget.cpp:232`, `:287` - so it does not track the table's row count and did not move when the table grew. |
| §3.0 *"The last **three** were added in fix round 1"* | **Correct**, and it is the delta rather than a total. |
| §3.10 and §3.11's *"**38** files"* | **Unrelated.** That is the withdrawn code-search total, about the GitHub mirror, not about §3.0's table. |
| G267 | **No file count anywhere in the entry.** Its only "files" figures are the same two code-search ones. |

So the one instance was the only instance. **Nothing else in §3 counts the
supporting files**, and the one sentence that did now names them instead.

## Confirmed by the re-review, recorded here because it is evidence I did not have

Three things nobody had checked came back confirmed, and the third is the one
worth carrying: **the header-comment transcription byte-diffs empty against the
pinned blob across all seven lines** after stripping exactly the one declared
space, with nothing else differing. That transcription is the strongest evidence
in §3 - it is what makes the finding a departure from a written specification
rather than a judgement - and it is now established as exact rather than as
remembered. Also confirmed: my three new SHA-256s verify to all 64 digits at tag
`10.0.5`, and the `nullptr`-screen half of the #14127 refutation holds
**mechanistically and independently** of the mode half - the re-review traced
`AUTOPLACER`'s constructor guard and `getDrawableArea()`'s early return and
established that even a hypothetical MANUAL call with a null screen would find
nothing collides.
