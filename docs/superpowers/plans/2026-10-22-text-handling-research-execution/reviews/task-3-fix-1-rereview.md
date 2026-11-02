# Task 3 fix round 1 - re-review

**Scope.** This is the narrow, scoped re-review of commit `a45a2c3` (BASE
`187b468`) asked for by the dispatch brief: confirm the twelve items from
`task-3-fix-1.md` were addressed, and verify the three things this round added
that nobody has checked (the three new source hashes, the nullptr-screen claim,
and the header-comment transcription). It does not re-review the whole of Task 3
- that was done in `task-3-review.md` against `187b468` and stands.

**Verdict up front: ALL ADDRESSED.** Twelve of twelve items hold under
independent re-derivation. All three new-this-round claims verify. One NEW
finding, not in the twelve items and not claimed by the implementer: a
numerical inconsistency introduced by this round's own edit (below).

---

## THE THREE THINGS THIS ROUND ADDED

### A. Three new source hashes - CONFIRMED to all 64 hex digits

`KICAD_CLI` is unset in this environment; `lib/kicad/netlist.ts:39` falls
through to `lib/kicad/install.ts:94`'s darwin candidate,
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`, which reports
`10.0.5` when run directly - CONFIRMED by running it myself. I fetched all
three new files from `https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/`
myself and hashed them with `shasum -a 256`:

| file | my SHA-256 | §3.0's table | match |
| --- | --- | --- | --- |
| `eeschema/tools/sch_drawing_tools.cpp` | `9525823772e382877cad861cb5d765cfdd7d99a86c32c70cc126355827600abc` | same | **64/64** |
| `eeschema/tools/symbol_editor_control.cpp` | `739da9cdb46b8af6ac4b2f5ba93f102d7bd4d8b518a19d98770d8d31a9e85214` | same | **64/64** |
| `eeschema/widgets/symbol_preview_widget.cpp` | `e662b7a2ac104bfa1be4559cdd498c4cff4ab85c8f45fb051db0ff98eafe62a1` | same | **64/64** |

All three verify to the full 64 hex digits, each measured with `${#h}` to
confirm the length rather than eyeballing it. **CONFIRMED.**

### B. The nullptr-screen claim - CONFIRMED, and mechanistically correct, not just true as an idle fact

Read `sch_drawing_tools.cpp` at the pinned tag directly:

```
484:    if( m_frame->eeconfig()->m_AutoplaceFields.enable )
487:        symbol->AutoplaceFields( nullptr, AUTOPLACE_AUTO );
...
498:    if( m_frame->eeconfig()->m_AutoplaceFields.enable )
499:        symbol->AutoplaceFields( screen, AUTOPLACE_AUTO );
```

Line numbers match exactly: `:487` is the nullptr-screen call, `:499` is the
screen-carrying call. Comment at `:486` reads "Not placed yet, so pass a
nullptr screen reference" - quoted correctly in the document.

Traced the signature it calls into, in `autoplace_fields.cpp`:

- `AUTOPLACER`'s constructor: `if( aScreen ) getPossibleCollisions( m_colliders );`
  - a null screen means `m_colliders` is **never populated**; it stays at its
    default-constructed empty state. `getPossibleCollisions` itself carries
    `wxCHECK_RET( m_screen, ... )` as a second-line defence, but the
    constructor's own `if (aScreen)` guard means that defence is never
    reached either way.
- `getDrawableArea()`: `if( !m_screen ) return BOX2I();` - a null screen also
  zeroes the page-margin rectangle, so `checkDrawableArea` is false inside
  `getCollidingSides`.
- `chooseSideForFields( bool aAvoidCollisions )`: `aAvoidCollisions` is
  `aAlgo == AUTOPLACE_MANUAL`, computed purely from the algorithm argument, not
  from the screen. At `:487` `aAlgo` is `AUTOPLACE_AUTO`, so `aAvoidCollisions`
  is false and `getCollidingSides()` is **never called at all** on this path.

So the document's "two independent reasons" claim is right in the strict
sense that matters: `aAvoidCollisions` false (from the AUTO algorithm) is
*by itself* sufficient to skip collision avoidance, **and**, independently of
that, a null screen would make `getCollidingSides()` return nothing collide-
worthy even if it *were* called (empty `m_colliders`, and
`checkDrawableArea` false) - I traced this second branch by hand for the
hypothetical case and it holds. Neither claim depends on the other being
true; both happen to be true at `:487` simultaneously. **Does a null screen
genuinely mean no colliders are gathered? Yes - traced to the `if (aScreen)`
guard in the constructor, which is the only place `m_colliders` is ever
filled. CONFIRMED**, not weaker than stated.

### C. The §3.3 header-comment transcription - CONFIRMED exact, dedent exact and declared

Fetched the pinned blob, extracted lines 38-44 literally (`sed -n '38,44p'`,
checked with `cat -vet` for hidden characters), and diffed byte-for-byte
against the document's fenced transcription at lines 1736-1742:

```
pinned line 38: " *      2. If in manual mode, sift out the sides that would"
doc line  1736: "*      2. If in manual mode, sift out the sides that would"
```

Stripping exactly one leading space from every pinned line and diffing
against the document's seven lines: **`diff` returns empty - IDENTICAL**, for
all seven lines (38 through 44). The declared dedent (the C comment's own
` *` left margin, removed so `document-pastes.test.ts`'s unchecked-block rule
is satisfied) is exactly one space, exactly as declared, and **nothing else
differs** - no paraphrase, no reflow, no dropped punctuation. The parenthetical
declaring the edit is present immediately after the fenced block (lines
1745-1750). **CONFIRMED.**

---

## THE TWELVE ITEMS

### IMPORTANT 1 - the #14127 pairing, withdrawn everywhere - ADDRESSED

Grepped every `14127` hit in both files (7 in the research doc, 3 in
known-gaps.md) and read each in context:

- **§3.3** (where the pairing used to live): now states #16538 alone as the
  candidate, then a new paragraph headed "AND IT IS NOT AN EXPLANATION FOR
  ISSUE #14127..." gives both reasons (grid-report mismatch, and the
  AUTOPLACE_AUTO/nullptr-screen argument from item B above) **at the point
  where the pairing used to be**, not elsewhere.
- **§3.11's table row** for #14127 now carries an inline clause: *"A grid
  report, and its repro is 'Adding a symbol', which passes `AUTOPLACE_AUTO` -
  so §3.3's defect cannot fire on it; §3.3 says why"* - stated on the row
  itself.
- **§3.12**'s non-establishment bullet: *"#14127 is NOT offered as evidence
  for it"*, with an explicit note that the bullet's first version named both
  issues.
- **G267 clause (1)**: a full paragraph headed "NOT EVIDENCED BY UPSTREAM
  #14127, AND THE FIRST VERSION OF THIS ENTRY SAID IT WAS," with the same two
  reasons.
- **G267 clause (10)**: *"#14127 is excluded for the reason clause (1)
  gives."*

**#16538 keeps its standing** in every one of these locations ("remains
sound," "the one candidate explanation... still as a candidate," "keeps its
standing as a candidate" in the commit message). #14127 is still legitimately
listed in §3.11's complaint clusters (rotation geometry, text-size-and-grid) -
that is correct, since it remains a real complaint about the algorithm; it is
only withdrawn as *evidence for the side-selection defect*. **ADDRESSED.**

### IMPORTANT 2 - the header-comment specification, cited with line numbers, `[READ]` - ADDRESSED

§3.3 now opens (before any of the finding) with: *"autoplace_fields.cpp opens
with a numbered description of its own process, and lines **38-44** `[READ]`
say what step 2 does"* followed by the fenced transcription (verified exact
above), then: *"The code does something else... which makes the behaviour a
departure from the file's stated algorithm rather than an opinion about the
file's taste."* Immediately after: *"What this does not change: **nothing
here was executed** (§3.0)."* Both halves of the criterion are present and
adjacent. G267 clause (1) carries the same addition, explicitly credited to
the reviewer rather than to the implementer. **ADDRESSED.**

### M-1 - `wxFAIL_MSG` fall-through, three call sites - ADDRESSED

Grepped `symbol_editor_control.cpp` and `symbol_preview_widget.cpp` for
`AutoplaceFields` myself:

```
symbol_editor_control.cpp:946:    symbol->AutoplaceFields( nullptr, AUTOPLACE_AUTO );
symbol_preview_widget.cpp:232:    m_previewItem->AutoplaceFields( nullptr, AUTOPLACE_AUTO );
symbol_preview_widget.cpp:287:    m_previewItem->AutoplaceFields( nullptr, AUTOPLACE_AUTO );
```

All three line numbers and both files match the document's citation exactly,
and all three pass `AUTOPLACE_AUTO` with a `nullptr` screen - consistent with
the claim that the fall-through is latent rather than live at these three
sites. The document's claim that `wxFAIL_MSG` has no `return` and a release
build falls through was independently re-derived by the prior reviewer from
the same source and is unchanged here. **ADDRESSED.**

### M-2 - "far" restored, 11 vs 2 re-derived, counterweight stated - ADDRESSED

The claim is quoted in full including "far more obstacle categories" (checked
against `text-placement-prior-art.md:771`, which does carry the word). I
re-derived the 11 myself rather than trusting the count:

- `OBSTACLE_CATEGORIES` in `lib/schgen/render/obstacle-matrix.ts:84-99` names
  exactly **14** entries (counted directly).
- `junction`, `frame-border` and `dnp-cross` are the three excluded.
  Independent corroboration, not just reading the claim: grepping
  `lib/schgen/render/obstacle-pairs-graphic-wire.ts` and
  `obstacle-pairs-reasons.ts` shows `junction` is documented repository-wide
  as `JUNCTION_DERIVED` - "cosmetic and derived, not placed" - and
  `pin-marks.ts:54` says outright *"clear of the DNP crosses (dnpCross;
  textScene checks it)"*, i.e. the DNP cross is a `text-scene.ts` concern, not
  a `field-placement.ts` obstacle. `frame-border` is likewise handled via
  `FRAME_DERIVED` reasoning at the sheet level. All three categories are
  genuinely absent from `placeFields`'s obstacle construction
  (`fixedBodies`, `others`, `fixedMarks`, `placed`, `interiorBoxes`,
  `segments` in `field-placement.ts:181-224`), which leaves 11 of 14 - matches
  the claim.
- KiCad's `getCollidingSides` distinguishes exactly 2 (a horizontal `SCH_LINE`
  on a horizontal side, versus everything else) - re-read directly in
  `autoplace_fields.cpp:425-470`, matches.

**The counterweight is genuinely stated in the document**, not merely
reported to me: *"KiCad's collector has no type filter at all... ours
distinguishes far more categories and treats them differently, KiCad's sees
every kind and treats all but one the same"* (§3.9). This is not paraphrase
from the implementer's report - I located and read the sentence in
`docs/schematic/text-handling-research.md` directly. **ADDRESSED.**

### M-8 - "57 hits" withdrawn, no total asserted - ADDRESSED

Grepped both files for every occurrence of "57" and "38 files." The only
"57" hits are in the sentence withdrawing it (*"the first version of this
paragraph said '57 hits'... 57 was the number of printed MATCH LINES... not a
count of files"*); "38 files" appears only as something *"a reviewer
re-running it got,"* attributed to the reviewer rather than asserted as this
round's own figure, and the paragraph explicitly concludes *"So no total is
asserted here."* No other total appears anywhere near this claim in either
file. **ADDRESSED.**

---

## ALSO VERIFIED

**§1 and §2 untouched - CONFIRMED by hunk headers, not the claim.**
`git diff --unified=0 187b468 a45a2c3 -- docs/schematic/text-handling-research.md`
gives its first hunk as `@@ -1477,2 +1477,10 @@` - the earliest line that
differs between the two commits is old-file line **1477**. Independently,
`### 3.0` is preceded by the `§3` heading at line **1461** in the current
file (counted directly with `sed -n`). 1477 > 1461, so every changed line is
inside §3; no hunk touches anything before the §3 heading. This is the exact
figure the report claims, re-derived from the diff rather than taken on
trust.

**The `expect()` accounting - CONFIRMED exactly.** Counted fenced blocks in
§3 directly: `grep -n '^```' ... | awk -F: '$1>=1461'` finds **14 fence
markers = 7 fenced blocks** (one `text`, six `cpp`), up from six before this
round - the new one is the lines-1736-1742 transcription. Ran the actual
suite with `SCHGEN_SOURCE` set:

```
3785 pass
0 fail
43489 expect() calls
Ran 3785 tests across 352 files. [151.20s]
```

Tests (3785) and files (352) are unchanged; `expect()` moved by exactly +1,
from 43488 to 43489, matching "one `notOutput` entry per unchecked fenced
block" exactly (18 to 19 document-wide, +1 for the new block). Checked the
new block's fence tag (` ```cpp `) against `OUTPUT_FENCE = "run"` in
`tools/schgen/text-metrics/verify-pastes.ts:62` - it is not `run`, so it is
correctly routed to `notOutput` rather than treated as probe output. No
pasted measured figure is standing in for a committed log here.

**G267 clauses (2), (8), (10) carry explicit `Verified` lines - CONFIRMED**,
read each in place: clause (2) ends *"**Verified** CONFIRMED by this writer
for the `[READ]` halves... the code-search half is `[THIRD-PARTY]` and its
total is withdrawn as RELAYED-AND-NOT-REPRODUCED"*; clause (8) ends
*"**Verified** the call chain and the 'exactly two numbers' claim are
CONFIRMED... The 2043.1 um and 1422.4 um figures are RELAYED"*; clause (10)
ends *"**Verified** CONFIRMED by this writer for every retrieval... The
clause-(1)-to-#16538 link is CONFIRMED only as a candidate."* **Clause (11)**
(new) carries the same shape: what was found (the `SYM_ORIENT_0` comment
mismatch), where (`autoplace_fields.cpp:352-376`), evidence (`[READ]` plus a
hand re-derivation), Verified (derivation CONFIRMED by this writer, the
observation itself RELAYED from the reviewer), and a CRITERION/no-MECHANISM
closing line kept distinct.

**Clause (11) re-derived case by case, independently - CONFIRMED.** Read
`getPreferredSides`'s power-symbol switch directly (lines 357-376 at the
pinned tag). `sides_init = [RIGHT, TOP, LEFT, BOTTOM]`:

- `SYM_ORIENT_0`: `swap(0,1)` then `swap(1,3)` -> **TOP, BOTTOM, LEFT,
  RIGHT**. Comment reads `// TOP, BOTTOM, RIGHT, LEFT` - **wrong**, positions
  3 and 4 transposed. Matches the claim exactly.
- `SYM_ORIENT_90`: `swap(0,2)` then `swap(1,2)` -> LEFT, RIGHT, TOP, BOTTOM.
  Comment matches - correct.
- `SYM_ORIENT_180`: `swap(0,3)` -> BOTTOM, TOP, LEFT, RIGHT. Comment matches -
  correct.
- `SYM_ORIENT_270`: `swap(1,2)` -> RIGHT, LEFT, TOP, BOTTOM. Comment matches -
  correct.

Only the 0 degree case's comment is wrong, exactly as clause (11) and §3.3
state. **CONFIRMED.**

**`SCHGEN_SOURCE=... bun test` - 3785 pass / 0 fail / 43489 expect() across
352 files [151.20s].** Matches the report's figure exactly.

**`bun run typecheck` - clean.** `tsc --noEmit`, no output, exit 0.

**No AI attribution.** `git log -1 --format='%B' a45a2c3 | grep -iE
"co-authored-by|claude|generated with|session"` returns **0 hits**. Author
and committer are both `oletizi <oletizi@mac.com>`.

**`git status --porcelain`** - empty before, during and after this review.
Nothing under version control was modified by this review; all fetched
upstream blobs and scratch scripts live only under the scratchpad directory.

---

## FALSE-GREEN HUNT

Checked the eleven recorded shapes against this round's additions
specifically (the full-task hunt was done in `task-3-review.md` against
`187b468` and is not repeated):

- *Tautological assertion* - the +1 `expect()` is a real loop over real
  document content; I counted the fence markers myself rather than trusting
  the arithmetic.
- *Grep for a paraphrase* - avoided throughout: I read the pinned source
  regions directly (`sed -n`) for the hash targets, the call sites, and the
  transcription, rather than grepping for wording that might not match
  byte-for-byte. The transcription check in particular was a line-by-line
  `diff` against the fetched blob, not a substring search.
- *Evidence only in a gitignored directory* - `.superpowers/` is gitignored
  (confirmed via `git check-ignore -v`), but every claim checked above is
  anchored in the two committed files (`docs/schematic/text-handling-
  research.md`, `docs/known-gaps.md`), not solely in the report.
- *Probe resolving a different dependency version than the tree* - the suite
  was run with the exact `SCHGEN_SOURCE` path named in the brief, and the
  `kicad-cli` version was independently re-derived from the installed binary
  at its resolved path, not assumed.
- *Control returning the treatment's answer* - no new tests were added this
  round; nothing of this shape applies.

None of the eleven recorded false-green shapes reproduces in this round's
work.

---

## ONE NEW FINDING, not among the twelve, not claimed as fixed

**§3.12's file count is now wrong, and the error was introduced by this
round's own edit.** §3.0 (line ~1535) correctly says: *"The first two were
read end to end. The other **ten** were opened at the functions and call
sites..."* - and the table above it lists 12 files (2 read in full, 10 not).
That figure is right: 9 files in round 0, 3 more added this round, 12 total,
10 not fully read.

But §3.12's non-establishment bullet (line ~2319) still reads: *"It did not
read the whole of the **eight** supporting files, only the functions
named."* The diff shows this line was touched in this very commit - round 0
said "seven" (correct for 9 total files, 2 read in full), and round 1's edit
changed it to "eight" rather than "ten." The same document now asserts two
different counts (ten, eight) for the same fact in two different
subsections, and "eight" is the wrong one.

**Failure scenario:** a later reader relying on §3.12's number to judge how
much of the supporting material is unread risk undercounts by two files -
specifically, `symbol_editor_control.cpp` and `symbol_preview_widget.cpp`
(the two of the three new files not already counted by the "+1" that would
take seven to eight) silently drop out of the "not read in full" tally, even
though §3.0's own table two sections earlier lists them as read only at a
named call site, same as the other eight.

This is cosmetic - nothing in §3's findings depends on the count - but it is
exactly the kind of self-contradiction the register's "verify names against
the thing itself" and "a skipped check must never look like a passing one"
practices exist to catch, and it was not among the twelve items, so nobody
checked it until now.

---

## Summary

| item | verdict |
| --- | --- |
| A. Three new hashes | CONFIRMED - all 64/64 hex digits |
| B. nullptr-screen claim | CONFIRMED - traced to the constructor's `if(aScreen)` guard; two genuinely independent reasons |
| C. Header-comment transcription | CONFIRMED - byte-exact after the declared one-space dedent, nothing else differs |
| IMPORTANT 1 (#14127 withdrawal) | ADDRESSED |
| IMPORTANT 2 (specification cited) | ADDRESSED |
| M-1 (wxFAIL_MSG fall-through, 3 call sites) | ADDRESSED |
| M-2 ("far" restored, 11/2 counterweight) | ADDRESSED |
| M-3 ("reaches" quote) | ADDRESSED (spot-check) |
| M-4 (prior-art credit) | ADDRESSED (spot-check, re-verified against `text-placement-prior-art.md:679,771`) |
| M-5 ("byte-identical" correction) | ADDRESSED (spot-check) |
| M-6 (`[RAN]` marker) | ADDRESSED (spot-check) |
| M-7 (`[ISSUE-READ]` marker) | ADDRESSED (spot-check) |
| M-8 (57 hits withdrawn) | ADDRESSED |
| M-9 (G267 Verified lines) | ADDRESSED |
| M-10 (SYM_ORIENT_0 / clause 11) | ADDRESSED, re-derived case by case |
| §1/§2 untouched | CONFIRMED via hunk headers (earliest change 1477, §3 starts 1461) |
| `expect()` accounting | CONFIRMED exactly (7 fences, +1, 43489) |
| Suite | 3785 pass / 0 fail / 43489 expect() / 352 files, 151.20s |
| Typecheck | clean |
| Attribution | 0 hits, clean |
| Tree | clean throughout |
| NEW finding | §3.12 says "eight" supporting files, should say "ten" (matches §3.0); introduced by this round's own edit |

**ALL ADDRESSED.**
