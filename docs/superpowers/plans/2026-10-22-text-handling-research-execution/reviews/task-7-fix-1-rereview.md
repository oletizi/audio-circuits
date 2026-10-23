Task 7 fix round 1 — scoped re-review
======================================

**Scope.** Confirm the eleven named items from
`task-7-fix-1.md` were addressed, and verify the new confinement check (A) has
teeth. Not a whole-task or whole-branch review. Diff reviewed:
`d855a5d..96a534c` (1 commit, 3 files, 299 insertions / 33 deletions).

Every claim below says CONFIRMED (I drove or re-derived it myself, with a
script I wrote independently rather than reading the implementer's) or
RELAYED (I read the implementer's or reviewer's report without re-driving).

---

A. THE NEW CONFINEMENT CHECK, AND WHETHER IT CAN FAIL
-------------------------------------------------------

**Verdict: ADDRESSED, and the check has real teeth. CONFIRMED by an
independently written script**, not the implementer's.

I wrote my own Node script (`confinement.js`) that re-derives, from `git show`
and the working tree, with no reference to the implementer's tooling:

- Parent `5ca6f2d`, slice `[§1 heading .. EOF]`: **352648 bytes / 352125
  chars**, SHA-256 `b9fd12dd…64d13f9a`. **Matches exactly.**
- Round 1, slice `[§1 heading .. §7 heading)`: **354369 bytes / 353839
  chars**, SHA-256 `f7fcde37…0f48eeff`. **Matches exactly.**
- The two pointer blocks (§5.8's heading blockquote and §5.10 mechanism 2's
  blockquote) each occur exactly once in the round-1 slice.
- **Removing exactly both blocks reproduces the parent hash
  `b9fd12dd…64d13f9a` to the byte** (352648 bytes, 352125 chars) — CONFIRMED,
  on my first correct attempt after fixing a boundary bug in my own script (I
  initially mis-counted one blank line before the §5.10 blockquote and got a
  1-byte mismatch; fixing that reproduced the implementer's own reported
  first-attempt failure mode, which is independent corroboration that the
  check is sensitive to exactly this kind of off-by-one).
- **Removing only block 1** (leaving block 2 in): hash does **not** match
  parent. **Removing only block 2** (leaving block 1 in): hash does **not**
  match parent either. Both single-pointer controls fail, as claimed.
- **The attack the brief asked for**: I used Edit to inject an unauthorized
  one-word change inside §1 (outside both enumerated exception blocks), then
  reran the "remove exactly the two known pointer blocks" check. **It failed
  to reproduce the parent hash** — confirming the check would catch an edit
  outside the enumerated exceptions, not just verify that the two named
  blocks happen to be the only difference. Restored by Edit immediately after;
  `sha256sum` of the file after restoration matches the pre-perturbation
  baseline exactly (`0c35aa58…`), and `git status --porcelain` was empty
  throughout except during the drive.
- Pointers add **1721 bytes** (354369 − 352648), confirmed.
- Non-ASCII tally over the parent slice: **511** non-ASCII characters, **413**
  of them `§`, byte-minus-character gap **523** — all three CONFIRMED by my
  script, independent of the implementer's.

**This is the fourth F276 instance done right**: the check is no longer a
bare hash-equals-invariant claim but a three-part form (parent hash,
enumerated exceptions, removal-reproduces-parent) with per-exception controls,
and I verified all three parts and both controls hold, plus a case the brief
didn't explicitly ask for (an edit outside the enumerated set) which the check
also catches.

B. THE CORRECTED FIGURES, AND THEIR ROOT CAUSE
------------------------------------------------

**Verdict: ADDRESSED. Every figure in the report's table independently
re-derived**, with a second, separate script (`insertion.js`) that measures
the head-table insertion at each named commit via `git show`:

| quantity | round 0 said | bytes (my re-derivation) | characters (my re-derivation) |
| --- | --- | --- | --- |
| §1–§6 slice | 352125 | **352648** ✓ | 352125 ✓ |
| preamble above §1 | 1695 | **1696** ✓ | 1695 ✓ |
| insertion at `7951a9d` | — | **4645** ✓ | 4626 |
| insertion at `d855a5d` | 4643 | **4662** ✓ | **4643** ✓ |

All four of these match the report's table and the committed document's
figures exactly — including the report's refinement that its own insertion
figures (4662 at `d855a5d`, 4645 at `7951a9d`) differ by one byte from the
brief's (4661, 4644), with the **+17 delta identical either way**
(4662−4645 = 4661−4644 = 17). I did not resolve which of the two byte
counts uses the "more correct" boundary convention — both are internally
consistent re-derivations and the +17 shift, which is the fact that matters,
holds under either.

**§7.7 now states the boundary convention** ("the slice begins at the first
byte of §1's heading text and ends at the first byte of §7's... the preamble
is everything before the first byte of the inserted head table's own line")
and I used exactly that convention (anchoring on the `WHAT THE SEVEN SECTIONS
FOUND` line as the head table's own line) to get matching figures — the
convention is re-derivable as claimed.

**The 523 arithmetic**: 352648 − 352125 = 523, and the independently-counted
non-ASCII tally (511 chars, 413 of them `§`) accounts for it as a tally, not a
reverse-engineered number forced to fit. CONFIRMED.

C. THE §5 POINTERS
--------------------

**Verdict: ADDRESSED.** Read both sites in full (`docs/schematic/text-handling-research.md`
lines 4026–4039 and 4170–4186).

- **Original wording left standing**: CONFIRMED — the heading text
  ("the binding constraint on `transistor-preamp-lab`") and mechanism 2's
  original sentence ("that block is the only thing refusing
  `transistor-preamp-lab`") are both still present, word for word, above each
  blockquote.
- **Pointer immediately beneath**: CONFIRMED — both blockquotes sit directly
  under the site they correct, before any other prose.
- **No figure touched**: CONFIRMED — my removal check in (A) proves this
  byte-exactly: removing exactly the two blockquotes reproduces the parent's
  content byte for byte, which is only possible if nothing else in §5
  (including every number in it) moved.
- **Nothing rewritten**: CONFIRMED, same evidence.
- **Correction carried where it already lives**: CONFIRMED by reading — both
  blockquotes cite §7.2 point (2) and `docs/known-gaps.md` G274 clause 1 by
  name, and both exist in the document I read.
- **§5's own checker cases still pass**: CONFIRMED — ran
  `tests/schgen/text-metrics/document-pastes.test.ts` at HEAD:
  **44 pass / 0 fail / 179 expect()**, which includes
  `describe("section 5's pasted output, against section 5's own log")`
  (asserting `SECTION_5_BLOCKS = 13` fenced `label-run` blocks and a verified
  count). Since the pointers are blockquote text (`>` lines) and add no
  triple-backtick fence, they cannot and do not perturb this count.
- **Pointers did not change any §5 figure**: CONFIRMED by (A)'s byte-exact
  removal proof — a byte-exact match after removal is a stronger guarantee
  than spot-checking individual numbers.

D. THE HAZARD IT WALKED INTO AND CAUGHT ITSELF
-------------------------------------------------

**Verdict: ADDRESSED. CONFIRMED by driving the zero-fence assertion red
myself.**

- Baseline: ran the test file at HEAD — **44 pass / 0 fail**. §7's slice
  currently holds zero fenced blocks (the one literal `` ``` `` substring in
  §7's prose is inside a single-backtick-delimited inline code span
  quoting the fence word, not a line-leading fence opener — I located it at
  `§5 survives §6's append only because its cases count` `` ` ```label-run ` ``
  and confirmed `parseBlocks` does not treat it as a block, consistent with
  the whole file passing).
- **Drove the zero-fence assertion red**: used Edit to append a real fenced
  block (`` ```probe-attack ... ``` ``) at the end of the document (inside
  §7). Reran the test file: **3 failures**, including
  `§7's slice holds zero fenced blocks` going from `[]` to
  `["probe-attack STEP 1"]`, **and** `section 6's pasted output, against
  section 6's own log` going red at the same time with an extra
  `"probe-attack": 1` key — reproducing exactly the hazard §7.6 describes (a
  §7 block breaking §6's tally with a message about §6). Restored via Edit;
  `sha256sum` matches baseline exactly, `git status --porcelain` empty.
- **§6's tally is intact at baseline and §7's zero-fence assertion is present
  and can fail**: both CONFIRMED by the drive above.
- The report's own disclosure (a first draft of §7.7 pasted an `sh` fence and
  would have broken both guards) is consistent with what I just reproduced
  mechanically — the hazard is real and the current committed state avoids it.

THE REMAINING ITEMS
--------------------

- **I-2**: CONFIRMED verbatim. The plan (`docs/superpowers/plans/2026-10-22-text-handling-research.md:286`)
  defines level 3 as `**INTEGRATION HYPOTHESIS** — untested here.` The head
  table now quotes `*"untested here"*` and explicitly contrasts it with
  "untested anywhere." The "ten of eighteen" count re-derives cleanly: 6
  ESTABLISHED ELSEWHERE rows (3,4,11,12,15,18) + 4 INTEGRATION HYPOTHESIS rows
  (10,14,16,17) = 10. ADDRESSED.
- **I-3**: CONFIRMED. The paragraph immediately under the head table (8 lines
  below the figures, not 5400) states plainly that the two fallback
  populations (15/10 blocks vs 53/48 blocks) are different corpora and that
  the ratio "has not been re-taken over the 48" — a reader of the table
  cannot form the ratio without ignoring an explicit warning right beside it.
  ADDRESSED.
- **The sharpened sentence**: CONFIRMED against the table. Row 6's cell says
  "5 of the 12 label-blocked blocks... And no board"; row 9's cell says "7 of
  12 blocks... the widest of the four freedoms." 6 (block-level limits:
  1,2,5,7,8,13) + 2 (rows 6,9, limits only at board level) = 8 of 8 by board.
  ADDRESSED.
- **The case-3 comment**: CONFIRMED independently. I wrote a standalone
  in-memory check (no file perturbation needed) that corrupts the head-table
  anchor string, computes `indexOf` for all seven ordered headings, and
  evaluates the bare ordering assertion alone: indices come back
  `[-1, 7457, 51460, 109562, 166756, 231024, 293191, 361297]`, already sorted,
  so `[...at].sort(...).toEqual(at)` is **true** — the ordering assertion
  alone would pass with the head table missing. Only the presence check
  (`order.filter(h=>at[i]===-1).toEqual([])`) catches it. The comment's claim
  and the drive both hold. ADDRESSED.
- **M-1**: CONFIRMED — row 2's cell now says "266 label-over-wire crossings,"
  not "266 wires."
- **M-2**: CONFIRMED — §7.8 now names rows 14 and 16 as carrying figures and
  rows 10 and 17 as the two with none; I checked rows 10 and 17's actual cells
  and both are genuinely bare ("Unknown... It was not swept" / "Unknown...
  nothing is measured"), so the correction is itself accurate, not just
  asserted.
- **M-3**: CONFIRMED — row 18 now leads with "WHAT THE LEVEL GRADES IS
  xschem," marks the local instance `[RELAYED]` as a HERE-RESULT and "the
  owner's own dissolution, not an agent's."
- **M-6**: CONFIRMED — test name changed to "a fenced block appended at the
  end of §7," matching what the code does (`` `${doc}\n...` ``, i.e.
  append, not insert).
- **M-7**: CONFIRMED — head table now uses "the FIRST problem the census
  names has no text in it on three... and is a label over a label on two,"
  matching §7.2's precise form.
- **G276**: CONFIRMED structurally. Found 2026-10-23, states what/where/
  evidence, splits CONFIRMED (instances 3, 4 — both of which I independently
  re-derived in A and B above) from RELAYED (instances 1, 2, which are the
  reviewer's own earlier findings, correctly not re-driven here since they
  predate this round). The four instances are genuinely distinct: #1 a stale
  register count, #2 a grep control invalidated by its own commit's tree
  change, #3 a unit-mislabeling bug (chars called bytes), #4 a
  policy-conditioned invariant falsified by an *authorized* edit rather than
  any error — a structurally different failure mode from #3, not a
  restatement of it. CRITERION (two branches: pin-to-commit-with-unit, or
  hash-with-enumerated-exceptions-and-removal-check) is clearly separated from
  MECHANISM (two explicitly UNTRIED approaches). Dated 2026-10-23.
- **G274 clause 6**: CONFIRMED revised — now states 352648 bytes/352125 chars
  and 1696/1695, with no leftover mislabeled "352125 bytes" or "4643 bytes"
  claims; carries the authorized-edit explanation and the removal-check
  description.

ALSO VERIFIED
--------------

- **Suite**: ran `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  myself (foreground, 151.76s). **3812 pass / 0 fail / 43602 expect() across
  353 files** — CONFIRMED, unchanged from HEAD before this round, matching
  the report's claim that round 1 added no assertion. No existing assertion
  was loosened: `git diff --numstat d855a5d..96a534c` shows the test file at
  `17 insertions / 1 deletion`, and reading the diff (already reviewed above)
  shows the one deletion is the old test-name string being replaced by the
  renamed one (M-6), not a weakened assertion.
- **typecheck**: `bun run typecheck` → `tsc --noEmit`, exit 0, no output.
  CONFIRMED.
- **Diffstat**: `git diff --numstat d855a5d..96a534c` → `docs/known-gaps.md`
  125/7, `docs/schematic/text-handling-research.md` 157/25,
  `tests/schgen/text-metrics/document-pastes.test.ts` 17/1. Sums to
  299 insertions / 33 deletions, matching the commit message and the brief's
  prediction that the deletion count would move off zero. CONFIRMED. Nothing
  touches `lib/`, `circuits/`, `boards/`, `Makefile`, or any manifest/
  dependency file.
- **§1–§4 and §6 untouched**: CONFIRMED by (A)'s byte-exact removal proof —
  removing exactly the two §5 pointer blocks reproduces the entire
  `[§1..§7)` parent slice byte for byte, which bounds the claim over §1–§4
  and §6 as well as §5's own unmodified figures.
- **No AI attribution**: `git log 96a534c -1 --format='%B' | grep -iE
  "co-authored|claude|anthropic|generated with|session"` → no match
  (grep exit 1). CONFIRMED.
- **`make check`**: not run (per constraint — it writes derived artifacts).
  Characterisation ("RED and pre-existing, G251's four boards") confirmed
  structurally: the diffstat above shows nothing under `lib/`, `circuits/`,
  `boards/`, `tools/`, or `Makefile` changed in this round, so `make check`'s
  result cannot have moved either way as a consequence of this diff.
- **Working tree**: `git status --porcelain` is empty at the end of this
  review, and the three touched files' SHA-256 hashes match their
  pre-perturbation state exactly (`0c35aa58…` for the research doc,
  `5138f55b…` for known-gaps.md, `b93a259f…` for the test file), confirming
  every perturbation used to drive A and D was fully restored.

NEW FINDINGS
-------------

None that rise to Important or above. One small observational note, not a
defect: the report's own first attempt at the removal script hit a 1-byte
off-by-one from miscounting a blank line before the §5.10 blockquote — my
independent script hit the identical bug on my first attempt, for the
identical reason (one `\n` short before the blockquote). This is not a defect
in the shipped work (the shipped figures are correct and I confirmed them),
but it is worth naming as a hazard for the *next* person who re-derives this
check by hand: the blockquote at §5.10 is preceded by two newlines, not one,
and it is an easy place to lose a byte while building the removal script —
exactly the kind of transcription slip G276 exists to warn about, one level
down (in a verification script rather than in the document). I did not add
anything to the register for this since it did not affect any committed
figure and the brief's constraints forbid fixing or adding scope; recording
it here for visibility only.

VERDICT
--------

**ALL ADDRESSED.** All eleven named items confirmed addressed by direct
drive or independent re-derivation; the new confinement check (A) has real
teeth, confirmed by reproducing it with my own independently-written script,
confirming both single-exception controls fail, and confirming an
unauthorized edit outside the enumerated exceptions also makes the check
fail. No Critical or Important findings. Suite and typecheck unchanged and
clean. Working tree clean at the end of this review.
