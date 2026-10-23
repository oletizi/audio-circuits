Task 7 report: the synthesis
============================

**Status: COMPLETE.** Three commits, pushed. Suite green at 3812/0/43602 across 353 files.
Typecheck clean. Sections 1-6 of the research document byte-identical to the task's parent
commit. Nothing fixed, nothing in `lib/`, `circuits/`, `boards/` or the `Makefile` touched.

Commits
-------

| SHA | what |
| --- | --- |
| `7951a9d` | the head table and section 7 of `docs/schematic/text-handling-research.md`, plus three new cases in `tests/schgen/text-metrics/document-pastes.test.ts` |
| `57e1202` | the register: G274 and G275 new, G232, G259, G260 and G268 amended |
| `d855a5d` | self-review: five table figures corrected, two quotations corrected, G260's amendment |

Diff scope over the whole range: `docs/known-gaps.md` (+400), `docs/schematic/text-handling-research.md`
(+545), `tests/schgen/text-metrics/document-pastes.test.ts` (+89). Nothing else. Working tree
clean; the sibling repository's `git status --porcelain` is empty.

Verification
------------

- **Suite**: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  -> **3812 pass / 0 fail / 43602 expect() across 353 files**, from HEAD's 3809 / 0 / 43594 / 353.
  **Accounted term by term**: +3 tests and +8 `expect()` calls, all three cases added to the one
  existing file `tests/schgen/text-metrics/document-pastes.test.ts`; file count unchanged because no
  test file was added. Case 1 contributes 2 expects, case 2 contributes 4, case 3 contributes 2.
- **Typecheck**: `bun run typecheck` -> `tsc --noEmit`, clean, no output.
- **`make check`** was not run and not touched. G251's four boards are pre-existing and not mine.
- **Confinement of sections 1-6**, by heading anchor rather than by the first-N-lines hash: against
  parent `5ca6f2d`, the slice `[section 1 heading .. EOF]` of the parent and
  `[section 1 heading .. section 7 heading]` of the working tree both hash to
  `b9fd12dd7cb770807766d44d521441259fe146000b1774ce5fa049ea64d13f9a` over **352125 bytes**; the
  1695 bytes above section 1's heading are byte-identical in both; the inserted head table is
  **4643 bytes** sitting between them. The check is a script over `git show 5ca6f2d:<doc>` and the
  working tree, and it would have failed on any edit inside sections 1-6 - it did in fact report
  `false` when pointed at HEAD-after-commit, which is the right answer there because HEAD then
  contains section 7.

The table
---------

**18 rows. 6 ESTABLISHED ELSEWHERE, 8 DEMONSTRATED HERE, 4 INTEGRATION HYPOTHESIS**, tallied from
the committed document by an awk pass over the section 7.1 slice rather than by counting by hand.

The plan expected most rows to be INTEGRATION HYPOTHESIS and they are not, and section 7.0 says why
where a reader meets the column: Tasks 1, 2 and 5 drove seven of the eighteen against this
repository's own inputs and Task 6 drove an eighth, all after the plan was written. **Six of the
eight DEMONSTRATED HERE rows demonstrate a LIMIT**: row 1 fixes nothing, row 5 is the measurement
that the metric is not the blocker, rows 7 and 8 clear zero of twelve blocks, row 13's gain is 2
placements in 255 with a worst arm that loses one, row 6 clears five blocks and no board.

Decisions I took, and the reasoning
-----------------------------------

**1. The section 5 / section 6 slice hazard: section 7 pastes NO fenced block.** Both slices run to
end-of-file. Section 5 survives on fence-word specificity; **section 6's accounting is stricter** -
the test tallies the fence word of *every* block in its slice against a pinned map
`{ "field-order-run": 7, "kp-src": 7, sh: 1 }`, so any fenced block in section 7 breaks it with a
message about section 6. The alternatives were to bound two closed sections' slices or to widen
section 6's pinned tally; both edit a closed section's evidence contract for a block section 7 does
not need, since section 7 synthesises sections that hold their own figures to their own logs and
drove exactly one thing itself. Section 7.6 states it; three new cases make it checkable, and all
three were driven red in memory before commit.

**2. The DEMONSTRATED HERE enumeration.** Step 3's level 2 carries a definition and then a sentence
naming Tasks 1, 2 and 5. **Task 6 drove `placeFields` over all 48 declared blocks and 255 unit
placements, which meets the definition word for word**, and the plan's Task 6 brief asked for no
measurement campaign - so the enumeration was a prediction made before the run it describes. By
this repository's own criterion-versus-mechanism rule I followed the definition, graded row 13
DEMONSTRATED HERE, marked it with a dagger, and recorded the deviation in section 7.0 and in
**G275**. **It is one cell**: reading the enumeration as binding changes row 13 to INTEGRATION
HYPOTHESIS and the counts to 6 / 7 / 5, and nothing else moves. I did not re-grade, merge, rename or
add a level.

**3. One document, not two.** Followed the plan: head table above section 1 plus section 7. The
withdrawn ruling and its withdrawal are quoted in section 7.7, because they live only in a
gitignored controller instruction and that paragraph is the only committed record of either.

What I drove myself
-------------------

One thing: `bun tools/schgen/board-sheets.ts`, read in full. **0 of 11 boards produce a schematic,
11 refused, 0 undeclared.** From it:

- **Six boards refuse at `validateCircuit` before any text is placed** - `pt2399-core` and all five
  Pultec - with per-board problem counts **18, 20, 14, 14, 14, 28** tallied from the run itself.
  `pt2399-core`'s 18 agrees with what G259 published; the other five counts had not been stated
  anywhere.
- **The census prints the FIRST refusing block, not the only one.** That falsifies section 5.8's
  heading and section 5.10's mechanism 2, both of which compress G262's precise *"and by nothing
  else in front of it"* into *"the only thing refusing `transistor-preamp-lab`"* - a board that
  section 5.5a of the same section records as label-blocked via **two** blocks. So the measured move
  section 5.10 offers (two grid steps of wire, zero problems on that block) does not produce a
  sheet. Section 5 is not edited; **G274** clause 1 carries it.
- **Of the five boards that reach layout, the census names a text problem on two.** One is refused on
  a junction with no text in it; two on a GND/VCC power-symbol glyph touch, with their label
  problems behind it.

The self-review caught five wrong cells
---------------------------------------

Reported because the first draft would have shipped them, and the worst one is the kind of error
this plan exists to avoid.

1. **Row 14 claimed a non-refusing label pass "would produce a sheet" for the five boards refused at
   layout. False and unknowable** from anything measured: three of the five are refused on a first
   problem with no label in it, and the two that are not have `tp-stage` behind them, whose list is
   8 of 8 naming a label on `-lab` but **15 of 21** on `-loop`. The cell now says the board figure is
   UNMEASURED and not guessed at, and every downstream "not one of the eighteen draws a board" became
   "has been shown to draw" - in the head table, section 7.2 and G274.
2. **Row 12 said three of the penalty model's four parts are already here. Two are.** Section 6.3
   marks the two grades as implicit only and a penalty on a choice as *"in principle; nothing here
   has one"*.
3. **Row 11** cited G232's Task 23 amendment for the slider-model yield being unknown without noting
   that Task 5 read Wolff Ch. 3 for Definitions 3.1 and 3.2 only and states its approximation results
   were not read, which is where that comparison lives.
4. **Row 16 re-imported the brief's "four readability measures"**, which section 6.6 verified as five
   numeric fields under a header that says four.
5. **Row 18's non-generalisation** is now cited to G232's Task 21 amendment, whose words it was.

Plus: section 7.4's first bullet said nothing was RUN, which was false of five probes; its
four-unopened-tools bullet asserted a priority and now states `pcbnew`'s reachability instead; two
quotations were corrected (the plan's self-review is split at its own em dash rather than
normalised to this document's hyphen, and section 1's opening is quoted as two sentences rather than
merged).

Register
--------

| entry | what |
| --- | --- |
| **G274**, new | six clauses: the first-versus-only correction; all eleven boards sorted by whether there is text in the blocker; the two boards nearest a drawing needing a non-text fix first, as bait beside the trap; `tp-stage` binding four boards and the solution space not reaching it; the two fallback populations being different corpora with the survival ratio un-retaken over the 48; and the two procedural decisions (no pasted blocks, heading-anchor confinement) |
| **G275**, new | the DEMONSTRATED HERE deviation, with the exact one-cell reversal |
| **G232**, amended | the fifteen fallbacks are real geometry not a ruler artefact (13 survive all three; 24 under KiCad's box); the published population is a quarter of the 48-block one; section 3 found nothing left to borrow except `fitFieldsBetweenWires`, unmeasured here; the walk-order ceiling is 2 in 255 with a worst arm that loses one; field placement is named by none of the eleven board blockers |
| **G259**, amended | the schematic row re-driven, still 0 of 11, now cut by whether there is text in the blocker; six boards refuse before any text; eighteen approaches, no board; and its surviving four-sides mechanism now has a measured yield - 5 of 12 blocks, 0 of 11 boards - so it works and is not the binding constraint, a third answer from either this entry has carried |
| **G260**, amended | its criterion asks the owner to look at a sheet carrying fallback placements and **there is no such sheet**: 0 of 11 boards, all four parity circuits refused, and the only thing that generates is the `mini` fixture with zero fallbacks. Criterion unchanged, not widened, no substitute proposed |
| **G268**, amended | TeX's p.1150 *"This results in an overset line and an error message that encourages the user to take corrective action"* gives the place-what-you-can-and-log-what-you-could-not **behaviour** a 1981 primary source. It does **not** close the entry - TeX is not Allegro and the criterion asks for that tool. Criterion intact verbatim, no mechanism added, and the amendment is marked **RELAYED** because I did not open the PDF |

Concerns
--------

1. **G275 is the one thing a reviewer may overturn, and I have made it cheap to overturn.** I judged
   that grading a measured 48-block sweep as "untested here" would be a false statement about
   evidence, and that the repository's criterion-over-mechanism rule governs. If you disagree, one
   cell and one paragraph change.
2. **Section 7.2's "candidates, not a count" for `-buffered` and `-staged` is the most actionable
   sentence in section 7, and it is bait.** Both have every label problem cleared by some freedom
   with only the G263 glyph touch left. **Nothing re-graded either block after a hypothetical glyph
   fix**, and G232's own history is why that matters: a non-text fix moves geometry and moved
   geometry re-enters the other obligations. I recorded it rather than estimating it.
3. **Row 14 is where someone will go next, and its yield is unmeasured on purpose.** A non-refusing
   label pass is the only thing in the table that could move the board count, and it is a decision
   (G260) rather than a technique. I resisted the arithmetic that says `transistor-preamp-lab` would
   draw, because "8 of 8 problems name a label" is not the same claim as "a non-refusing label pass
   absorbs all 8", and nobody has run it.
4. **Section 7's grades are grades of what sections 1-6 record about their own retrieval.** I opened
   none of the primary sources. A section that mis-stated its own retrieval would be mis-graded here
   and nothing in section 7 could catch it; section 7.8's last bullet says so.
5. **The two fallback populations (15 over 10 blocks, 53 over 48) are a trap for the next reader**
   and I could only record it, not close it. Re-taking section 1's ratio over the 48 needs the
   external font blob and KiCad's Python bindings.
6. **I did not amend G262, G265, G263 or G270**, although section 7 cites all four. G262's and
   G265's own amendments already carry what section 7 relays, G263 is the glyph class rather than a
   text finding, and G270 is Task 5's. If you want pointers in any of them, say so - adding four
   thin amendments felt like noise against this file's own standard.

Round 1
=======

**Status: COMPLETE.** One commit, `96a534c`, pushed. Suite **unchanged** at 3812 / 0 / 43602 across
353 files - round 1 added no assertion, so there is no move to account for. Typecheck clean. Diff
`d855a5d..96a534c`: three files, **299 insertions, 33 deletions** - the deletion count moved off
zero as the brief predicted, and every deletion is a replaced sentence in section 7, the register's
G274 clause 6, or a test comment.

All eleven items addressed. Nothing disputed on substance; one refinement and one new finding below.

The §5 notice
-------------

Both sites carry a pointer blockquote, in the form the brief specified: **original wording standing,
pointer immediately beneath, correction carried where it already lives.**

- **§5.8's heading** - a blockquote directly under it, before the paragraph that quotes G262. It says
  the heading's *"the binding constraint"* is the FIRST constraint, names §5.5a's own block four
  subsections above, and states that **nothing measured in the subsection changes**.
- **§5.10's mechanism 2** - an indented blockquote immediately beneath the item, headed **STOP**,
  because that is the line an implementer acts on. It withdraws only the clause about what the move
  would unblock and says in terms that **the two grid steps and the zero problems are untouched**.

No figure in §5 was touched and no finding rewritten. §5's checker cases all pass, which is the
evidence that the pointers did not disturb its slice.

Important 1 — and the root cause the brief did not name
-------------------------------------------------------

**Both wrong figures were UTF-16 CHARACTER counts labelled as bytes.** That is one defect with one
cause, not two arithmetic slips:

| quantity | round 0 published | bytes (UTF-8) | characters |
| --- | --- | --- | --- |
| §1-§6 slice | "352 125 bytes" | **352 648** | 352 125 |
| preamble above §1 | "1695 bytes" | **1696** | 1695 |
| head-table insertion at `d855a5d` | "4643 bytes" | **4662** | 4643 |

The measured slice holds **511 non-ASCII characters** - 413 of them `§`, 44 `µ`, 16 `×`, 12 `°` and
a tail of Greek and superscripts - for a byte-minus-character gap of **exactly 523**, which accounts
for the whole discrepancy. **The reviewer's 352 648 is confirmed to the byte.**

**The refinement, offered rather than disputed.** I measure the insertion at **4662** bytes at
`d855a5d` and **4645** at `7951a9d`, where the brief says 4661 and 4644; and the brief's "only the
1695 is right" is right as a *character* count, where the byte count is 1696. The difference is a
one-byte boundary convention that neither of us had stated - **and the +17 delta the brief
identifies is confirmed identically**, so the finding stands in full. §7.7 now states the convention
explicitly so the figure is re-derivable: the slice runs from the first byte of §1's heading text to
the first byte of §7's with trailing newlines collapsed to one, and the preamble is everything
before the first byte of the head table's own line.

The pattern, and a fourth demonstration from this round
-------------------------------------------------------

Named in §7.7 and in **G276**, with the brief's three instances - a stale register count, §6.4's grep
control, these lengths.

**And it fired a fourth time, in the round that named it, with nobody making a mistake.** Round 0
called the §1-§6 hash *"invariant under every later edit to this document outside §1-§6"*. **This
round was authorised to edit inside §5**, so the slice moved to `f7fcde37…` and that sentence became
false by policy rather than by error. **A hash is invariant only over material nobody is later
PERMITTED to touch**, and "nobody is permitted" is a policy its author can narrow.

So §7.7 now uses a three-part form that survives the next authorised edit:

| slice | SHA-256 | size |
| --- | --- | --- |
| parent `5ca6f2d`, `[§1 .. EOF]` | `b9fd12dd…64d13f9a` | 352 648 bytes / 352 125 chars |
| round 1, `[§1 .. §7]` | `f7fcde37…0f48eeff` | 354 369 bytes / 353 839 chars |
| **round 1 minus the two authorised pointers** | **`b9fd12dd…64d13f9a`** | **352 648 bytes / 352 125 chars** |

**With a control per exception**: removing only one of the two pointers does **not** reproduce the
parent hash, in either direction - which is what establishes that the removal is not over-reaching
and the residue is nil. The pointers add **1721 bytes** and nothing else in §1-§6 moved. I got this
check wrong on the first attempt - a naive "drop to the next blank line" over-removed ten lines of
§5.10's item 3 and produced a non-matching hash, which is the check failing as it should.

Important 2 and 3
-----------------

**I-2**: the head table now carries the plan's wording verbatim - level 3 is *"untested here"* - and
says explicitly that it is **not** untested anywhere, naming that two of the four are exhibited
elsewhere. **This is also M-4 and M-5**, which turned out to be the same insight: level 1 is
untested here too, so **ten of the eighteen rows are untested here**, and §7.0's autoplacer sentence
no longer reads as a grade contradicting rows 3 and 4.

**I-3**: a paragraph immediately under the head table says the 15 and the 53 are different
populations - 10 blocks of four parity circuits against 48 blocks of eleven boards - and that §1's
13-of-15 survival ratio **has not been re-taken over the 48**, so a ratio between them is a number
nobody measured. A reader of the table alone now meets it eight lines from the figures instead of
five thousand.

The sharpened sentence
----------------------

Taken, in §7.0 and again in §7.1's counts: **by the weaker criterion of a block, six of the eight
DEMONSTRATED HERE rows are limits; by this document's own strongest criterion, a board, all eight
are.** The two that are not limits at block granularity are rows 6 and 9, which clear 5 and 7 of the
12 label-blocked blocks - and §7.2 measures that neither draws a board: row 6's five blocks all sit
on Pultec boards refused at `validateCircuit`, and row 9's seven do not include the second blocker
of either board whose first blocker they clear.

Case 3
------

The comment now carries what the reviewer found and I had understated: **with the head-table anchor
removed, `indexOf` returns `-1`, `-1` sorts first, the sorted copy equals the original, and the
ordering assertion alone would have passed.** Driven here to confirm. The comment says the
presence-before-order guard is the **only** teeth in that case, that it is the fix for this branch's
recorded `indexOf` defect rather than another instance of it, and that deleting the presence line
silently removes them.

Minors
------

| # | what changed |
| --- | --- |
| M-1 | "routed 266 wires" -> "routed wires through the space it had reserved, giving **266 label-over-wire crossings** by this repository's own predicate" |
| M-2 | §7.8 now says rows **14 and 16 do carry figures** (zero-of-eight and the five-board structure; the five readability numbers and the `FieldFallback` population) and that **rows 10 and 17** are the two with none |
| M-3 | row 18's level grades **xschem**, stated first; the local instance is marked a **here-result** `[RELAYED]` from G257 and **the owner's own dissolution**, explicitly not what the level grades |
| M-4 | §7.1's counts paragraph carries the ten-of-eighteen-untested-here count, with why level 1 belongs in it |
| M-5 | §7.0 no longer says the autoplacer *"is exactly an INTEGRATION HYPOTHESIS in ours"*; it says levels 1 and 3 are both untested here and differ only in whether the capability was shown to work somewhere |
| M-6 | the case is named *"a fenced block **appended at the end of §7**"*, with a comment saying what position it exercises and why a mid-§7 block would be caught the same way |
| M-7 | the head table uses §7.2's precise form: on three of the five the **FIRST** problem has no text in it, on two it is a label over a label |

One thing my own guard caught
-----------------------------

A first draft of §7.7 pasted an `sh` fence to give the re-drive command for the insertion length.
**That would have turned §6's pinned fence tally red and broken §7's own zero-fence assertion** -
the exact hazard §7.6 exists to state, walked into by the subsection documenting it. Removed before
any test ran; the boundary convention is stated in prose instead, and §7.7 now says why no command
is pasted.

Register
--------

- **G274** clause 1 rewritten: §5 now carries pointers at both sites, by the narrowed instruction,
  with the reason the instruction was narrowed and the fact that it is the single authorised
  exception.
- **G274** clause 6 corrected: both units, the round-1 hash, the removal check and its controls, and
  a pointer to G276.
- **G276** new: the pattern, four demonstrations in a table, the unit half of the diagnosis, what
  actually established the claim, and a criterion in two branches - pinned-to-a-commit-with-units,
  or hash-with-enumerated-exceptions-and-a-removal-check. Two mechanisms, both marked untried, and
  it says instance 4 shows "publish a hash, not a length" is insufficient on its own.

Concerns
--------

1. **G276 says nothing else on this branch has been audited against its criterion**, and I did not
   audit. There may be more self-measured figures in earlier sections or entries; finding them needs
   a pass nobody has scoped.
2. **The §5 pointers are the first edits to a closed section in this plan.** I kept them to pointers
   and verified by hash with per-exception controls, but the precedent now exists, and the next agent
   may read it more widely than you meant it.
3. **Round 1's own figures are pinned to `96a534c`** and the next edit to §5 or the head table moves
   them, which is G276's point applied to G276's own fix. The removal check is the part that
   survives.
