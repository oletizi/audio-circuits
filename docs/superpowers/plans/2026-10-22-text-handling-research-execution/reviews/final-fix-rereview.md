Final fix dispatch - re-review
===============================

Scope: confirm the six items (five from `final-fix.md` plus the one
self-disclosed sixth) were closed and that the quotation sweep is sound.
Re-driven, not relayed, except where marked RELAYED. Commit under review:
`526b590` (parent `96a534c`).

A. THE QUOTATION SWEEP
-----------------------

**Each of the five corrections, verified independently by exact string search
(never by paraphrase):**

1. **Row 14 / G260 splice.** `docs/known-gaps.md:1900-1902` reads *"the owner
   looks at a sheet carrying fallback placements and says whether it is
   acceptable, and under what count or what kind of overlap it stops being
   acceptable."* This is one contiguous sentence in G260's own criterion
   clause. The current row 14 (`docs/schematic/text-handling-research.md:5572-5577`)
   quotes exactly this string, exactly as §7.5(1) (`:5861-5864`) quotes it.
   **CONFIRMED** - contiguous in source, matches the parallel quotation, no
   splice remains.

2. **§7.7(2) / G276 instance-4 fabricated sentence.** Checked out
   `docs/schematic/text-handling-research.md` at `7951a9d` and at `d855a5d` and
   grepped both for `"invariant under every later edit"` - **zero matches at
   either commit.** Grepped both for `"Not one word of"` - present at both
   (`7951a9d:5586`, `d855a5d:5631`), reading *"Not one word of §1-§6 is
   edited"*. The current document and the current G276 both now quote this
   actual sentence. **CONFIRMED** - the sentence attributed to round 0 in the
   prior table row genuinely does not exist at either round-0 commit; round
   0's actual words are what the report says they are.

3. **Row 18 / G232 one-word alteration.** `docs/known-gaps.md:19436-19437`
   reads *"...capacitors whose values are real electrical parameters that MUST
   be drawn..."*. The current row 18 quotes *"are real electrical parameters
   that MUST be drawn"* - a contiguous substring starting at "are", matching
   the source exactly. **CONFIRMED.**

4. **Row 11 / unmarked elision.** The raw probe log
   (`docs/schematic/text-handling-research.md:4072`, pasted fenced block) reads
   `PROBLEM label hi_boost_out at (34.29, 64.77) overlaps wire 33 of
   pultec-hi-boost-own (j19_p1)`. The current row 11 quotes *"overlaps wire
   33"* with the label named outside the quotation marks, matching how §5.1
   (`:3577`) quotes the same log line. **CONFIRMED** - no elision inside the
   quote marks now.

5. **Head table paraphrase.** The head table's own §1 row (line 46) reads *"13
   of 15 recorded field fallbacks survive all three measured quantities"* with
   no quote marks. The paragraph below the table (lines 55-66) now reads
   *"§1's 13-of-15 finding has NOT been re-taken over the 48"* - a paraphrase,
   no quote marks, matching the §1 row's actual wording in substance.
   **CONFIRMED** - the imprecise quoted span is gone.

**All five: CONFIRMED independently. No disagreement with the report.**

**Did the sweep find a sixth?** No. I built my own independent extraction of
every double-quoted span (8+ characters) in the head table and in §7
(excluding inline-code/backtick spans, which are data literals and not prose
quotations of anyone), then hand-verified roughly 20 of the ~39 distinct spans
against their cited sources, including several the implementer's table does
not individually list:

- The plan's Task 6 Step 3 and Task 7 Step 3 level definitions
  (`docs/superpowers/plans/...md:291`, `:306`) - quoted verbatim and
  contiguously in §7.0.
- Two CLAUDE.md quotations (*"An agent may never author..."*,
  *"...a document can be generated and useless. Render it, print it, read
  it"*) - both contiguous substrings of CLAUDE.md as supplied in my context.
- §6.3's own cell (`:4549`), *"What that split should be is an acceptance
  criterion and is the owner's."* - contiguous, matches §7.5(2)'s quotation of
  it exactly.
- G262's *"and by nothing else in front of it"* (`docs/known-gaps.md:2017-2018`)
  - contiguous.
- §1's own opening two sentences (`:85-90`), quoted in §7.4 - both contiguous.
- The CRITERION/MECHANISM quotation from CLAUDE.md in §7.0 - this one uses a
  marked ellipsis (`...`) to skip a middle sentence, which satisfies the
  brief's "contiguous, or its elision is marked" rule; not a defect.

None of these failed. I also independently re-found the two quotations the
report discloses as unverifiable and left alone: the *"is exactly an
INTEGRATION HYPOTHESIS in ours"* quotation of an *"uncommitted earlier
draft"* (confirmed absent from both `7951a9d` and `d855a5d`, consistent with
being a draft that was never committed - this is not a new defect, it is
exactly the limit the report names) and the third-party review quotation in
the head-table preamble, whose source is not in the tree.

**Testing the sweep's own boundary.** I deliberately ran a naive
`"(.{8,}?)"` regex (no code-span stripping) over §7 and hit a real failure
mode: a short JSON-literal quote (`"kp-src"`, 6 characters, inside backticks at
`:5953`) is too short to match on its own, which desyncs all subsequent
quote-pairing and produces nonsense multi-paragraph "matches." This is a
genuine hazard for *any* automated sweep built this way. However, it does not
indict this sweep: the content in question is an inline-code data literal
(`` `{ "field-order-run": 7, "kp-src": 7, sh: 1 }` ``), not a prose quotation
attributed to anyone, so excluding it is correct rather than a miss. I checked
for the two other classes named in the brief: **single-quote ('...') spans** -
none exist in the scope beyond ordinary possessive apostrophes (`§1's`,
`CLAUDE.md's`, etc.) - and **block quotations (`>`)** - the only one in scope
is the owner's 2026-10-22 instruction in the head-table preamble
(`:13-15`), which I verified reproduces exactly from the plan file
(`docs/superpowers/plans/...md:18`). **Neither class was missed because
neither class has an uncounted member in scope.**

**Verdict on A: sweep is sound. Five for five confirmed, no sixth found,
boundary-tested, and the two disclosed unverifiable quotations check out as
genuinely unverifiable from the tree (one of them I could additionally
corroborate from the gitignored `progress.md`, which still exists on disk:
`grep -n "NOTED FOR THE FINAL REVIEW, NOT FIXED MID-FLIGHT"
.superpowers/sdd/2026-10-22-text-handling-research/progress.md` returns line
1109, verbatim).**

B. ROW 14 DOES NOT ANSWER A RESERVED DECISION
-----------------------------------------------

- The quotation itself: **CONFIRMED** contiguous in G260 and matches §7.5(1)'s
  quotation of the same criterion, word for word (see A.1).
- **CONFIRMED** the row's own sentence - *"Nothing here answers that or may be
  read as implying an answer"* - is accurate: the row restates the criterion
  and attaches no number, no threshold, and no recommendation.
- **All three reserved decisions remain named, with their figures, and
  unanswered, in §7.5**, which this commit did not touch (confirmed by the
  confinement check in D: exactly one line of the whole §1-§6 slice differs,
  and it is §6.7's row, not anything in §7.5's source material; §7.5 itself is
  outside §1-§6 and I read it directly):
  - (1) G260 - how much overlap is acceptable - unanswered, figures (53/4/3,
    zero-of-eight refusal rate) attached as context only.
  - (2) G265 clause 4 - which text-geometry quantity governs - unanswered,
    the four-quantity table (15/13/20/24) stands unchanged.
  - (3) §6.3/§6.11 infinite/finite split - unanswered, §6.3's quoted cell
    stands unchanged.

**Verdict on B: CONFIRMED. The correction did not become an answer.**

C. THE RENDER
--------------

**Content preservation - CONFIRMED independently, not by re-running the
implementer's count.** I parsed the OLD (`96a534c`) 7-column, 18-row table
into 18 x 6 = 108 normalized cell strings (stripping `**`/`*`/backticks) and
searched for each as a substring of the NEW §7.1's normalized text. **107 of
108 matched automatically; the one that did not is row 14's "depends on" cell
- which is exactly the G260 splice that Important 1 was sent to fix.** That is
the expected, disclosed deviation, not a content loss. Combined with the
quotation checks in A (rows 11 and 18's corrected cells also verified
present), all 108 cells are accounted for. **The LEVEL grade for all 18 rows
is unchanged** (the parser captured it as the 6th cell and it matched for all
18).

**Structural shape - CONFIRMED.** The new index table has 19 `<tr>` elements
(1 header + 18 data rows) and 3 columns; the 18 per-row prose blocks each
carry the four labelled fields (WHAT IT WOULD FIX / WOULD NOT FIX / DEPENDS ON
/ EVIDENCE) plus the approach name and LEVEL grade. Re-deriving the 6/8/4 split
from the index table: **ESTABLISHED ELSEWHERE** rows 3, 4, 11, 12, 15, 18 (6);
**DEMONSTRATED HERE** rows 1, 2, 5, 6, 7, 8, 9, 13 (8); **INTEGRATION
HYPOTHESIS** rows 10, 14, 16, 17 (4). Matches the "THE COUNTS" paragraph
exactly and matches the OLD table's LEVEL column cell-for-cell.

**Pixel re-derivation - PARTIAL, and I disclose the discrepancy rather than
paper over it.** I rendered both the OLD and NEW §7.1 with pandoc (GFM->HTML5)
in actual Chromium (via Playwright) at a 1100px viewport, in three CSS
configurations (pandoc's own standalone default template; a bare fragment with
no stylesheet; and a full-width override of the same default template). None
of my three configurations reproduced the report's specific claim of a table
clipped at x=1195 with `scrollWidth` stuck at 1100 (non-scrollable) - in every
configuration I tried, the browser's own table auto-layout either shrank the
columns to fit the 1100px viewport (no overflow) or, under pandoc's default
36em-constrained body, shrank the whole table to 576-676px wide. However, **one
figure reproduced exactly**: under pandoc's own default standalone template,
the OLD table's height is **6300px**, matching the report bit for bit - strong
circumstantial evidence the report used this same render path, with some
further CSS difference (disabled word-wrap, or a different stylesheet) I did
not reconstruct accounting for the width figure. Under every configuration I
tried, the OLD table's full page was 3780-6300px tall with cramped,
heavily-wrapped columns - unreadable in substance even where not literally
clipped. The NEW index table, by contrast, is 429-600px tall holding all 18
rows with no column cramping (confirmed directly). **The underlying finding -
the old table is unreadable at a normal viewport and the new form is not - is
qualitatively confirmed under every CSS configuration I tried, even though I
could not reproduce the exact "x=1195, non-scrollable" framing.** This is the
same character as the median dispute below: a specific pixel claim I could not
re-derive, next to a structural finding that holds regardless.

**Verdict on C: CONFIRMED on content preservation (108/108 accounted for, 1
expected deviation), CONFIRMED on the 6/8/4 and 18-row re-derivation, PARTIAL
on the exact pixel figures (one, 6300px, reproduced exactly; the clipping
specifics did not reproduce under three configurations I tried, though the
underlying unreadability of the old form and the legibility of the new form
both hold).**

D. THE CONFINEMENT DERIVATION
-------------------------------

Fully re-derived with my own script (`hashlib.sha256` over the byte slice from
the first byte of §1's heading text to the first byte of §7's heading text,
trailing newlines collapsed to one), independent of the document's own
reported figures:

| slice | SHA-256 | size |
| --- | --- | --- |
| `96a534c` (parent) | `f7fcde37f305331163a4d29cacb75d6f3a459586a6889702e6c2ddbf0f48eeff` | 354 369 B / 353 839 ch, 518 non-ASCII, 420 `§` |
| `526b590` (HEAD) | `9effe64a98a3edb906269cd0b1025f95dacb75d547cff761aff1760c00a754f6` | 354 370 B / 353 840 ch |
| `d855a5d` (round-0 parent reference in §7.7) | `b9fd12dd7cb770807766d44d521441259fe146000b1774ce5fa049ea64d13f9a` | 352 648 B / 352 125 ch, 511 non-ASCII, 413 `§` |

**Every one of these matches the document's own published figures exactly,
including the two different non-ASCII/`§`/gap figures (511/413/523 for the
`d855a5d`-vintage slice, 518/420/530 for the `96a534c`-vintage slice) that
§7.7(2) flags as belonging to different slices.**

**Controls, all re-driven:**
- Parent `96a534c` and child `526b590` have **the same line count (5114)** and
  **exactly one differing line** (line index 4848, the §6.7 table row: `15 of
  75` -> `53 of 255`, +1 byte). **CONFIRMED.**
- Replacing the child's line 4848 with the parent's line 4848 reproduces
  `f7fcde37...` **exactly**. **CONFIRMED** - this is the real test of the
  convention, since it reproduces fix round 1's own previously-published hash
  from the stated method alone, not by assertion.
- The un-reverted child does **not** match the parent hash. **CONFIRMED.**
- Reverting the *wrong* line (a no-op at an unrelated index) leaves the real
  difference in place and still does not match. Reverting the *right* line to
  the *wrong* text (`53 of 999` instead of `15 of 75`) also does not match.
  **Both CONFIRMED** - the check is not vacuously satisfiable.
- Preamble (everything before the head table) is byte-identical in parent and
  child: **1696 bytes / 1695 characters, SHA-256 `110ffcf2...`**, matching
  exactly at both commits. **CONFIRMED.**

**Verdict on D: fully CONFIRMED, independently, byte for byte.**

THE REMAINING ITEMS
---------------------

- **§6.7's figure.** Independently summed the per-block lines of the committed
  `tools/schgen/field-order/probe-run.log` with my own parser (not reading the
  log's own `== SUMMARY` line first): **48 blocks, 255 units, production 53,
  min-sum 51, max-sum 54.** This matches both the log's own `== SUMMARY` section
  and the document's new §6.7 figure exactly. **CONFIRMED.** Nothing else in
  §6 changed - proven by the confinement check in D (exactly one line differs
  in the whole §1-§6 slice, and it is this one).
- **The plan erratum.** Present at `docs/superpowers/plans/2026-10-22-text-handling-research.md:67-70`,
  dated 2026-10-23, nested as a nested blockquote directly beneath the false
  constraint bullet, explicitly marked as added after completion and leaving
  the original sentence standing. Re-derived the "1 270 lines" figure
  independently: `git diff --stat 2808a7e..96a534c -- tests/schgen/label-freedom/fixtures.test.ts tests/schgen/text-metrics/document-pastes.test.ts tests/schgen/text-metrics/pen-call-sites.test.ts`
  gives 189 + 979 + 102 = **1270 insertions**, exactly. **CONFIRMED.** The
  durable statement (*""research only" does not imply "suite unchanged"..."*)
  is present verbatim and correctly marked as the reviewer's formulation
  (RELAYED), not the implementer's own.
- **G271 clause.** Present (`docs/known-gaps.md:24602`+), positioned correctly
  inside G271's entry (before G272 begins at `:24647`), dated 2026-10-23,
  carries the same durable statement and the file-list/line-count/gitignore
  evidence. `git check-ignore -v .superpowers/sdd/2026-10-22-text-handling-research/progress.md`
  returns `.gitignore:33`, matching the clause's claim exactly. **CONFIRMED.**
- **G276 clause.** Present (`docs/known-gaps.md:25184`+), positioned correctly
  inside G276's entry (no `### G277` or section break intervenes), dated
  2026-10-23. Names the **cause**, not just the symptom: I independently
  inspected the raw lines around §5.10's mechanism-2 blockquote
  (`:4157-4202`) and confirmed the structural claim directly - a blank line
  precedes the blockquote (line 19 of that range is blank, line 20 opens
  `>`), and no blank line follows it (line 30 is the blockquote's last line,
  line 31 is list item 3, immediately adjacent, no gap). **CONFIRMED** this
  matches the clause's description of the asymmetry exactly.

ALSO VERIFIED
--------------

- **Suite.** Ran `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  myself, detached and monitored to completion: **3812 pass / 0 fail / 43602
  `expect()` calls across 353 files**, matching HEAD and the report exactly.
  No test, probe, or fixture file appears in the 3-file diff, so no assertion
  was added, removed, or loosened - documentation-only, confirmed by the file
  list alone.
- **Typecheck.** `bun run typecheck` -> `tsc --noEmit`, exit 0, no output.
  **CONFIRMED clean.**
- **System under study.** `git diff --stat 96a534c..526b590` touches exactly
  three files (`docs/known-gaps.md`, `docs/schematic/text-handling-research.md`,
  `docs/superpowers/plans/2026-10-22-text-handling-research.md`); nothing under
  `lib/`, `circuits/`, `boards/`, `Makefile`, or any manifest. **CONFIRMED.**
- **§1-§5 untouched.** Proven, not merely asserted, by the confinement check
  in D: the entire §1-§6 slice has exactly one differing line, and it is in
  §6.7. §1-§5 are therefore byte-identical to the parent, which necessarily
  means the two earlier-round §5 pointers are exactly as they were.
  **CONFIRMED**, more strongly than the brief asked.
- **No AI attribution.** `git log -1 --format=%B 526b590 | grep -ni
  "co-authored\|claude-session\|generated with\|claude.ai\|anthropic"` -
  **zero matches.** **CONFIRMED clean.**
- **`make check`.** Not re-run (correctly, per the brief). Confirmed
  structurally: `docs/known-gaps.md` G251 (`:23278`) records the four-board RED
  state as pre-existing, and the file-list check above proves this commit
  touched nothing that could change it.
- **The median dispute.** I built my own parser over the 18-row OLD table and
  computed candidate metrics independently, without first targeting the
  implementer's numbers. The metric that reproduces every disputed figure
  exactly is **the literal length of each full table-row source line** (all 7
  columns, including the `#` index and all markdown syntax, exactly as it
  appears in the file): median **761.5 characters / 765 bytes** and max
  **1465 characters** at both `d855a5d` and `96a534c`; median **738.5
  characters** at `7951a9d`. The same metric also reproduces, from a 6th-cell
  (not full-row) view, **max cell 740** and **10 cells over 300** at
  `96a534c`/`d855a5d`. **Every one of these exactly matches the report's
  figures and none of them matches the final review's "781".** I could not
  find any natural counting convention that produces 781. **Adjudication:
  761.5 characters / 765 bytes is the correct median; the final review's 781
  does not reproduce and the implementer's document is right to carry 761.5/765
  instead.**

TREE STATE
-----------

`git status --porcelain` returns empty both before and after this review; no
file under version control was modified, Edit was never used on a tracked
file, and all perturbations for the confinement/median checks were performed
on in-memory copies or scratchpad files, never on disk inside the repository.

NEW FINDINGS
-------------

One soundness note, not a defect: a naive "every double-quoted span of 8+
characters" automated extraction over §7 desyncs when it crosses a short
(<8 character) quoted JSON-literal string inside backtick-delimited inline
code (`` `{ "field-order-run": 7, "kp-src": 7, sh: 1 }` `` at
`docs/schematic/text-handling-research.md:5953`), producing nonsensical
multi-paragraph "matches" for anyone who tries to re-run the sweep without
first stripping code spans. This is not a flaw in the shipped sweep - the
content is a data literal, correctly out of scope for "a quotation of the
register or the owner" - but it is worth recording so the next person who
re-runs this kind of check strips inline code first. **Failure scenario it
would produce if un-corrected:** a re-implementer trusts the naive regex,
gets a storm of false "quotations" spanning unrelated paragraphs, and either
wastes time chasing phantoms or - worse - concludes the sweep methodology is
unreliable and abandons it. No action needed on this round's artifact; flagging
for whoever next re-derives the sweep.

No other new finding.

VERDICT
--------

**ALL CLOSED.**
