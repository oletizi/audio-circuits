Final fix dispatch - report
===========================

**STATUS: all five items closed. One defect outside the five was found by the
sweep item 1 ordered and is fixed with it.** One commit, pushed.

- **Commit** `526b590` on `feature/schematics-tooling`, pushed (`96a534c..526b590`).
  3 files changed, 527 insertions, 36 deletions: `docs/schematic/text-handling-research.md`,
  `docs/known-gaps.md`, `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
  **No AI attribution** - grepped the message for `Co-Authored-By`, `Claude-Session`,
  "Generated with" and session links; the only hit is the string `CLAUDE.md` in prose.
- **Suite** `SCHGEN_SOURCE=... bun test` -> **3812 pass / 0 fail / 43602 `expect()` across
  353 files**, 152.92 s. **Identical to HEAD. No move, so no term to account for** - the
  change is documentation only and touches no test, probe or fixture.
- **typecheck** `bun run typecheck` -> `tsc --noEmit`, **clean, no output**.
- **`make check`** not run and not touched. G251's four boards are pre-existing RED.
- **Nothing in the system under study moved**: `git status` named only the three
  documents before the commit; no `lib/`, `circuits/`, `boards/`, `Makefile`, manifest or
  dependency change.

---

IMPORTANT 1 - the quotation
---------------------------

**The corrected row-14 text**, in full, as the *what it depends on* entry now reads:

> **ENTIRELY on G260, which is the owner's.** Its criterion, quoted here as §7.5(1)
> quotes it and contiguous in the entry: *"the owner looks at a sheet carrying fallback
> placements and says whether it is acceptable, and under what count or what kind of
> overlap it stops being acceptable."* Nothing here answers that or may be read as
> implying an answer.

The spliced string is gone. **The reserved decision is not answered**: the row quotes
G260's criterion verbatim, exactly as §7.5(1) already did twenty lines away, and adds
nothing to it.

**The sweep: 46 quotations checked**, every double-quoted span of eight characters or
more in the head table (7) and in §7 (39), normalised for soft wraps, blockquote markers
and emphasis, then searched in `docs/known-gaps.md`, `CLAUDE.md`, this document, both
prior-art documents, the plan and the four source files §7 cites. **41 reproduced
contiguously. 5 did not.**

| # | where | the defect | now |
| --- | --- | --- | --- |
| 1 | §7.1 row 14 | **G260 splice**, two clauses 160 lines apart, no elision marked | the criterion, contiguous and in full |
| 2 | **§7.7 (2) and G276 instance 4** | **a sentence round 0 never wrote** - *"invariant under every later edit outside §1-§6"*, `[RAN]` **zero matches** at `7951a9d` and at `d855a5d` | round 0's actual words, *"Not one word of §1-§6 is edited"*, offered *"so a later reader can re-take the same check"* |
| 3 | §7.1 row 18 | G232's Task 21 amendment with **one word altered inside the quotation marks** - *"values **that** are real…"* for the entry's *"values are real…"* | the span starts at *"are"*, contiguous |
| 4 | §7.1 row 11 | an **unmarked elision** of a log line - the coordinate `at (34.29, 64.77)` dropped from the middle | quoted as §5.1 quotes it, *"overlaps wire 33"*, label named outside the marks |
| 5 | head table | §1's finding in quotation marks as *"13 of 15 survive all three quantities"*; §1's row says *"13 of 15 recorded field fallbacks survive all three measured quantities"* | a paraphrase, no quotation marks |

**#2 is the one worth flagging.** It is the same defect class as the item I was sent to
fix, in the same subsection, and it had been copied into the register. It is not a
splice - the sentence exists nowhere. The *finding* it supports is untouched: round 0 did
make a claim that fix round 1's authorised edit falsified; it just made it in different
words.

**Two quotations could not be machine-checked and were read by hand and left:** the head
table's third-party review quotation, whose source is not in the tree and whose one
alteration is bracketed `[has]`; and §7.0's quotation of an uncommitted earlier draft of
its own paragraph, which says that is what it is. Both are recorded as the sweep's limit
in §7.7(3).

IMPORTANT 2 - the superseded figure
-----------------------------------

§6.7's cost table now reads **"53 of 255 unit placements on this corpus (§6.5)"**.
Re-derived independently rather than relayed: summing the 48 per-block lines of the
committed `tools/schgen/field-order/probe-run.log` gives **48 blocks, 255 units,
production 53**, and summing the per-line `min`/`max` gives **51 / 54** - all four
agreeing with the log's own TOTALS line. **Nothing else in §6 was touched**, and the
confinement check below proves it to the byte.

IMPORTANT 3 - the erratum
-------------------------

Recorded in the two committed places the criterion names.

1. **The plan file**, a blockquote nested under the constraint bullet, dated 2026-10-23
   and marked as added after every task completed. **The false sentence is left
   standing**: finished tasks were held to the text as it stood. Renders correctly as a
   nested quote (checked with pandoc).
2. **G271**, a 2026-10-23 amendment. It carries the reviewer's formulation verbatim as
   the durable statement, names this as the **third** time the branch has lost something
   to the gitignored ledger (G253, G271's own body, this), and says what was done so the
   next reader is not left to guess.

**The 1 270 lines were driven, not relayed:** `git diff --stat` over the plan's own commit
range gives `fixtures.test.ts` 189 + `document-pastes.test.ts` 979 + `pen-call-sites.test.ts`
102 = **1 270 exactly**, three test files.

MINOR 1 - §7.1, rendered
------------------------

**WHAT I SAW.** pandoc GFM -> HTML, viewed in a 1100 px Chromium viewport.

**Before.** The seven-column table laid out **6300 px tall**, and its columns ran from
x=262 to **x=1195 in a 1100 px page** with `document.scrollWidth` stuck at 1100. **The
last three columns - *what it depends on*, *evidence* and `LEVEL` - are off the right
edge and are clipped, not scrollable.** The grade column the entire section is organised
around could not be read at all. Row 2 alone occupied about 330 vertical pixels and its
*approach* cell wrapped to four lines in a 192 px column. It is not a hard table to read;
it is a table that is *not shown*.

**My own re-derivation of the reviewer's figures**, which I report because one does not
reproduce: 18 rows at a **median of 761.5 characters / 765 bytes** and a **maximum of
1465 characters**, **ten cells over 300**, **longest cell 740**. The max, the ten and the
740 reproduce exactly. **The median does not**: the brief says 781, and I get 761.5
characters / 765 bytes at `96a534c`, at `d855a5d`, and 738.5 at `7951a9d`. I could not
find the slicing that yields 781 and did not spend further time on it; **it changes
nothing about the finding**, and the document publishes my figure rather than the one I
could not re-derive.

**After.** A **three-column index** (`#`, approach, `LEVEL`) plus **one labelled block per
row** carrying *what it would fix*, *what it would not fix*, *what it depends on* and
*evidence*. The index renders **822 px tall** with a right edge at **838 px** - inside the
page, nothing clipped, the whole eighteen-row map visible in about one screen. Each
per-row block is ordinary prose and bullets. Source rows dropped from a 761.5-character
median to **85.5**, max **145**, zero cells over 300.

**Content preservation was checked, not asserted:** every one of the old table's
**18 rows × 6 cells = 108** strings was normalised and searched for in the new §7.1.
**108 of 108 present**, with the three corrected quotations checked in their new form.

**Six stale pointers were updated** by one word each, because the restructure falsified
them: five say *cell* of a §7.1 row (§7.0 twice, §7.4, §7.5, §7.8 twice) and now say
*entry* or *grade*. No figure or claim moved.

MINOR 2 - the off-by-one
------------------------

A 2026-10-23 clause on **G276**. The cause, named: **§5.10's pointer blockquote is
preceded by two newlines, not one** - it is nested in list item 2 at three spaces of
indent, there is a blank line between the item's last text line and the `>`, and there is
**no** blank line after it, item 3 following immediately. A removal written as
`replace("\n" + block, "")` leaves a stray newline and misses the parent hash by one
byte, with a symptom (hash mismatch, length delta 1) that reads like a real residue in
§1-§6 and is not one. The clause says it is **not a sixth instance of G276's pattern but
a defect in the remedy G276 recommends**, and generalises it: take the span from the
document by locating both boundaries in it, never from arithmetic over line lengths.

The same clause corrects G276's instance-4 quotation (sweep finding #2 above).

The confinement check, re-derived
---------------------------------

**Convention**, stated as §7.7 states it: the slice begins at the **first byte of §1's
heading text** and ends at the **first byte of §7's**, with trailing newlines collapsed
to one. **Lengths in bytes first, UTF-16 characters second.** The measured slice holds
**518 non-ASCII characters** (420 `§`, 44 `µ`, 16 `×`, 12 `°`, 7 `ℓ`) for a byte-minus-
character gap of **530**.

| slice | SHA-256 | size |
| --- | --- | --- |
| parent `96a534c`, `[§1 .. §7)` | `f7fcde37f305331163a4d29cacb75d6f3a459586a6889702e6c2ddbf0f48eeff` | 354 369 bytes / 353 839 chars |
| this round, same slice | `9effe64a98a3edb906269cd0b1025f95dacb75d547cff761aff1760c00a754f6` | 354 370 bytes / 353 840 chars |
| **with the one enumerated exception put back** | **`f7fcde37…` - the parent's, exactly** | 354 369 bytes / 353 839 chars |

**ENUMERATED EXCEPTIONS: exactly one.** §6.7's fallback figure, `15 of 75` becoming
`53 of 255` - Important 2. Nothing else in §1-§6 moved.

**Controls, each of which could have answered differently:**

- the **un-reverted child does not** match the parent hash, so the check is not vacuous;
- **exactly one line of the slice differs**, counted independently of the hash, so no
  second edit hides behind the first; byte delta **+1**, which is an 8-character string
  becoming a 9-character one;
- **the parent row reproduces fix round 1's published `f7fcde37…`** from the stated
  convention and nothing else - the real test of the convention, since a boundary rule
  that failed to reproduce the previous round's hash would be a different rule in the
  same words;
- the **preamble** before the head table is byte-identical in parent and child,
  `110ffcf2…`, 1696 bytes / 1695 characters.

**I hit the off-by-one's trap zero times**, because the derivation never counted a
newline: it slices on `indexOf` of the two heading strings and reverts the exception by
replacing one exact line with its exact predecessor.

**The head-table insertion length is NOT published in the document as a figure**, per
§7.7's own rule, because this change edits the head table. For the record here: **5785
bytes / 5761 chars at `96a534c`**, **5762 / 5738** after this change, delta **-23 bytes** -
the head table's own quotation correction (sweep finding #5).

**§7.7 also now says which slice its 511/523 belong to.** `[RAN]`: 511 non-ASCII, 413 `§`,
gap 523 are exactly right for `5ca6f2d`'s `[§1 .. EOF]` (`b9fd12dd…`), and 518/420/530 for
the slice measured from fix round 1 onward. **Both correct, different slices** - the seven
extra `§` are in the two authorised §5 pointer blocks. Stating it closes a trap of the
same family as a length without its unit.

Reserved decisions
------------------

**None answered, including by implication.** Row 14 quotes G260's criterion and says
nothing about an answer; G265 clause 4 and the §6.3/§6.11 infinite/finite split were not
edited at all. §7.5's three statements are unchanged.

Scope
-----

**Edited:** §6.7 (one figure), §7.1 (re-presentation + three quotations), §7.7 (heading,
(2) extended with this round's table and a slice-attribution paragraph, (3) added, the
round-0 quotation corrected), six one-word pointers in §7, the head table (one
quotation), the plan's constraint bullet (erratum), G271 and G276.

**Not touched:** §1-§5 (the two §5 pointers stand as they are), everything else in §6, any
test, any probe, any committed log, and the system under study.

What I dispute
--------------

- **Nothing in the five items.** All five were real and all five are closed.
- **One figure in the brief does not reproduce**: §7.1's "median row 781 characters". I get
  761.5 characters / 765 bytes at the two commits where the table had its final shape, and
  738.5 at the commit before. The max (1465), the ten cells over 300 and the 740-character
  cell all reproduce exactly. The document now carries my figure with its unit, and this
  paragraph is the record of the disagreement.
- **I extended the sweep's remit slightly and say so**: the brief asked me to check
  quotations of the register and of the owner. I checked every quotation, which is what
  found the fabricated round-0 sentence in §7.7 and in G276 - a quotation of neither the
  register nor the owner, but of a commit. I judged that leaving a fabricated quotation in
  place while fixing another one would be the wrong call, and that correcting it is
  presentationally and evidentially neutral: the finding the sentence supported is
  unchanged.

---

Addendum, 2026-10-23: the one item from the coordinator's verification
----------------------------------------------------------------------

**STATUS: closed.** Commit `c0498b2`, pushed (`526b590..c0498b2`), one file, one
hunk, 23 insertions / 10 deletions. No other word of the document touched.

**THE FINDING I ACCEPT.** My pixel figures were published as properties of the
document when they are properties of the document *and a renderer together*. The
re-review reproduced the 6300 px height exactly and could not reproduce the
clipping geometry under three other CSS configurations, whose layouts auto-fit or
shrank. **That is the third figure on this branch published without the frame it
was true in** - after the stale byte counts and the unreproducible median - and
it is the same disease G276 already names.

**WHAT CHANGED.** §7.1's paragraph now names the configuration before it gives a
pixel, marks the clipping geometry as renderer-dependent in terms, keeps the
6300 px and says it reproduced independently, and rests the finding on what no
stylesheet can move. The index figures carry the same frame.

**CONFINEMENT: did not move, and that is the form working.** The edit is inside
§7, so the §1-§6 slice is untouched and §7.7(2)'s published check stands exactly
as committed. Re-derived by the same convention - slice from the first byte of
§1's heading text to the first byte of §7's, trailing newlines collapsed to one,
bytes then UTF-16 characters:

| slice | SHA-256 | size |
| --- | --- | --- |
| parent `96a534c` | `f7fcde37f305331163a4d29cacb75d6f3a459586a6889702e6c2ddbf0f48eeff` | 354 369 bytes / 353 839 chars |
| this tree | `9effe64a98a3edb906269cd0b1025f95dacb75d547cff761aff1760c00a754f6` | 354 370 bytes / 353 840 chars |
| with the one enumerated exception put back | `f7fcde37…` - the parent's, exactly | 354 369 bytes / 353 839 chars |

**ENUMERATED EXCEPTIONS: still exactly one** - §6.7's fallback figure. **No new
exception**, because nothing this commit touches lies inside the measured slice.
Controls unchanged and all passing: un-reverted child does not match, exactly one
line of the slice differs, byte delta +1, and the parent row reproduces fix round
1's published hash from the stated convention alone.

**Suite** 3812 pass / 0 fail / 43602 `expect()` across 353 files, 148.58 s -
**unmoved**, as a prose change should be. **typecheck** clean.
