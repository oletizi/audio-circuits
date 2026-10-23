Task 1 re-review: fix round 2, scoped to `698e03c..3e52044`
=============================================================

Re-reviewed at `3e52044`, worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`,
branch `feature/schematics-tooling`. Diff `698e03c..3e52044`, 5 commits, 9 files
(`docs/known-gaps.md`, `docs/schematic/text-handling-research.md`,
`tools/schgen/port-manifest.json`, `tools/schgen/text-metrics/metrics.ts`,
`tools/schgen/text-metrics/verify-pastes.py` deleted,
`tools/schgen/text-metrics/verify-pastes.ts` new,
`tests/schgen/text-metrics/document-pastes.test.ts` new,
`tests/schgen/text-metrics/pen-call-sites.test.ts` new,
`tests/schgen/text-metrics/probe-run.log` new). Both repositories were
`git status --porcelain` empty before this review and are empty after it. Nothing
was committed and nothing in either tree was modified.

The three items
----------------

| Item | Verdict | Evidence (a drive I ran, or a file:line I opened) |
| --- | --- | --- |
| **Item 1** — both paste-checker holes closed, inference removed | **ADDRESSED, with one surviving gap the round didn't find** | Ran the real `verify()` from `tools/schgen/text-metrics/verify-pastes.ts` against the real document and the committed `tests/schgen/text-metrics/probe-run.log`: `17 fenced block(s): 14 VERIFIED, 3 declared NOT probe output, 0 FAILED`, matching the report exactly. Reproduced both of last round's reviewer attacks and the implementer's own attack (c) against in-memory copies — all three FAILED as claimed (confirmed by running `bun test tests/schgen/text-metrics/document-pastes.test.ts`, 7/7 pass, including the three RED cases). But I found a fourth attack the round missed: see "attacked this way, it does NOT hold" under attack 1 below. |
| **Item 2** — checker wired into `bun test`, log coupled to the document's commit pin | **ADDRESSED** | `tests/schgen/text-metrics/document-pastes.test.ts` runs on every `bun test` (confirmed: it's one of the 11 new tests in the 3769-test full run). The coupling case is real and the gap it leaves (joint staleness) is real and disclosed — see attack 2 below. |
| **Item 3** — box-pen call-site invariant checked | **ADDRESSED** | `tests/schgen/text-metrics/pen-call-sites.test.ts:784-806` — ran it directly, 4/4 pass. Asserts the one loose site `tools/schgen/text-metrics/probe.ts:377 m.drawnPen` by name, and the two fixed-pen files. Two RED cases (`loose.length` moves to 2 under a synthetic second call; scan returns `[]` when the function name doesn't match) confirm the green is non-vacuous. `metrics.ts:1479-1482`'s comment now points at the test instead of asserting the invariant in prose alone. |

The five named attacks
-----------------------

### 1. The new checker, including attack (c)'s closure — attacked this way, it does **NOT** fully hold

Reproduced the control and all three of the round's own red drives exactly (`17 fenced block(s): 14 VERIFIED, 3 declared NOT probe output, 0 FAILED` on the real document; the genuine-line-swap, the four-of-six fabrication, and the relabel-dodge attacks all FAILED against in-memory copies, matching the report verbatim).

Then I drove the specific sub-attacks the brief named:

- **Zero-line `` ```run `` block**: inserted an empty fenced block. `contiguousAt` returns `-1` for a zero-length slice by explicit check, so this **FAILS loud** (`1 FAILED`) rather than silently passing. Safe direction — holds.
- **Wrong-run contiguous slice**: the committed log contains exactly one `== WHAT THIS RUN MEASURED` header (checked by regex count = 1), so there is no second run to draw a wrongly-labelled contiguous slice from today. This sub-attack is **currently inert, not defeated** — nothing in the checker or its tests would catch a log that *did* hold two runs with an overlapping block drawn from the wrong one. Recorded as a dormant gap, not a live defect (see New breakage below, ranked PLAUSIBLE).
- **Coincidental non-output overlap**: checked all three non-`` ```run `` blocks (the `` ```sh `` re-drive instructions, and the two `` ```cpp `` source transcriptions) against the committed log's line set — **0 lines shared** with any of them today. Holds, but it is exactly as fragile as the implementer's own note about the one-line overlap they had to trim: a future short common line (a bare number, a common phrase) in a transcription block would collide and fail loud rather than pass quietly, which is the safe failure mode. Holds.
- **Totality** (`verified + notOutput + failures === blocks` always, no block falling outside all three states): confirmed both by code reading (the `info === OUTPUT_FENCE` branch always either increments `verified` or pushes a failure; every other branch always either pushes a failure or pushes to `notOutput` — exhaustive by construction, no block can escape) and empirically (every drive I ran, including my own attacks below, satisfied the totality check). Holds.
- **A tidied block can still pass**: **YES — confirmed, and this is the real finding.** The document has exactly one `` ```run `` block whose body is a single line (`docs/schematic/text-handling-research.md:475`, the §1.9 `"CONTROL PASSED: over 10 laid-out blocks..."` sentence). `contiguousAt` for a one-line block only asks whether that one line matches *some* single line of the log — contiguity is vacuous at length 1, so this collapses back to exactly the flat-membership check that hole (a) was built to close, scoped to this one block. I replaced that line with a different, genuine, single line pulled from elsewhere in the same committed log (`"drawn pen 152.4 um; anchor to pen origin 111.1 um; anchor to baseline 519.0 um"`, and separately with the §1.1 stroked-outline-residue line) — both substitutions ran through the real `verify()` and returned **`14 VERIFIED, 3 declared NOT probe output, 0 FAILED`, exit 0**, identical to the control, despite the document now asserting that an unrelated line *is* the control-pass result. This is the same shape of hole as (a), reopened at the one point in the document where a block is short enough for "contiguous" to stop discriminating. No test in `document-pastes.test.ts` exercises a one-line block, so this round's own test suite would not have caught it either.

### 2. The commit-coupling substitute — attacked this way, the gap is real and is disclosed

Replicated the test's exact coupling regex against the committed document and log (control: `true`). Then built, in memory only, a log and a document where **both** the log's `repository commit:` line and the document's `at repository commit **\`...\`**` pin were advanced in lockstep to the same new (fabricated) commit, with every measured figure in the log left byte-for-byte as-is — i.e. a staleness scenario where the probe was never re-driven but both pins were bumped together. The coupling check still returned `true`. **Confirmed: this does not catch joint staleness**, exactly as named in the brief. And confirmed the test says so in its own text: `tests/schgen/text-metrics/document-pastes.test.ts`'s module docstring states outright *"It does NOT establish that the log is a current run of the probe... What it does instead is COUPLE the two"*, and `docs/known-gaps.md`'s **G265** amendment repeats it (*"What nothing here establishes is that the log is a CURRENT run"*). Nobody reading either artifact would be misled about what is and isn't guarded.

### 3. "Both now paste in full" — confirmed genuinely full, no figure moved

§1.3's `` ```run `` block (`text-handling-research.md:200-227`) lists 23 distinct quoted strings (`+5V, 1.2K, 100nF, 2200pF, 4700pF, BYPASS_JUMPED, C7, I, IIIIIIIIII, IN_SOURCE, L4, Net-(U1-LPF2-OUT), R000, R100, RV4, SW2, UPPER_FLOOR, VCC, [1], j12_p4, j5_p6, mid_sel_3khz, parked`) — counted by hand, matches the declared "23 strings" exactly. §1.5's block (`:300-329`) lists 27 measured rows (6 `R100` rotations/justifications + `I`/`IIIIIIIIII`/`100nF`/`VCC right`/`VCC up` = 5 + `sample 0`-`15` = 16; 6+5+16=27) — matches the declared "27 measured rows" exactly. Diffed the before/after hunks for both blocks in `review-698e03c..3e52044.diff`: every pre-existing row in both blocks appears as unchanged context (no `-` lines inside either block, only `+` insertions), so no figure moved — the excerpt was purely extended, not edited.

### 4. Re-drove the probe at HEAD myself and compared to the pinned log

Font blob already cached at `/tmp/newstroke_font.cpp`, SHA-256 verified `dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9` (matches the pin; the probe would refuse otherwise). Ran `bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp` at HEAD (`3e52044`, clean tree, confirmed by `git rev-parse HEAD` before running) into a scratch file and diffed against the committed `tests/schgen/text-metrics/probe-run.log`. **Exactly two lines differ**: the `repository commit:` line (`c71e5c9...` in the pinned log vs `3e52044...` for my run — expected, since the document pins to the commit immediately before the one that wrote it, and I drove five commits later at HEAD) and the `scratch output under ...` path line (session-specific, pasted nowhere in the document). I confirmed the commit difference is not masking a real staleness problem: `git diff --stat c71e5c9..3e52044` touches only `docs/known-gaps.md`, `docs/schematic/text-handling-research.md` and the log file itself — **zero `.ts`/`.py` files changed** between the pin and HEAD, so there was no code for a re-drive to disagree about. Every measured figure is byte-identical. Holds.

### 5. The suite move, 3758→3769 across 350→352 — verified by name, not arithmetic

`git diff --stat 698e03c..3e52044` (the full diff this review is scoped to) touches exactly two test files, both newly created: `tests/schgen/text-metrics/document-pastes.test.ts` (new, 7 `test(` cases) and `tests/schgen/text-metrics/pen-call-sites.test.ts` (new, 4 `test(` cases) — 7+4=11. **No other test file appears anywhere in the diff** — not modified, not deleted — which rules out the "+13 new, 2 pre-existing silently gone" shape the brief warned about: a silent deletion would have to appear as a file in this diff, and none does. Ran the two new files directly (`bun test tests/schgen/text-metrics/pen-call-sites.test.ts tests/schgen/text-metrics/document-pastes.test.ts`): **11 pass, 0 fail**, confirming the count by content, not just by diff-stat. Ran the full suite (`SCHGEN_SOURCE` set): **3769 pass / 0 fail / 352 files**, matching the reported numbers exactly.

New breakage in the fix diff only
----------------------------------

1. **CONFIRMED (Important). A `` ```run `` block whose body is exactly one line defeats `verify-pastes.ts` the same way hole (a) defeated its predecessor.** `contiguousAt` treats a one-line slice's "contiguity" as trivially satisfied by membership alone, so the one live instance in the document (`docs/schematic/text-handling-research.md:475`, the §1.9 control-pass sentence) can be replaced with *any* other genuine single line from the committed log and still verify clean (`14 VERIFIED, 0 FAILED`, exit 0) — driven twice, with two different substitute lines, both against the real committed log. This is new in the sense that it is not caught by anything this round added: none of `document-pastes.test.ts`'s seven cases exercises a one-line block, so the round's own test suite would not have caught a regression here, and neither the implementer's report nor the **G265** amendment mentions it. It does not reopen any of the three items as stated (the two-hole fix and the attack-(c) closure both hold for every multi-line block, which is everything the round's own tests exercise) — it is a gap in the same mechanism, at the one point where the document's prose happens to collapse a claim to a single sentence. Severity judgment: Important rather than Critical, because (a) today there is exactly one exploitable block, (b) a human skimming the document would likely notice a single swapped sentence stating something unrelated to its surrounding prose (unlike a multi-line data table, where a swapped block of numbers reads as plausible), and (c) nothing currently in the document is disputed by it — I verified the real one-line block's content against the log myself and it is correct. But the tool's advertised guarantee ("a fenced block is checked against a contiguous slice of the log") is silently weaker than advertised for any future one-line block, and this document is clearly going to keep growing single-sentence `` ```run `` assertions (the control-pass line is exactly that kind of claim).
2. **PLAUSIBLE (Minor). No test or runtime check guards against the committed log holding more than one probe run.** Today the log has exactly one `== WHAT THIS RUN MEASURED` header, so a "wrong-run" contiguous slice is not currently constructible — this is a dormant design gap rather than a live defect. If a future log were ever the concatenation of two runs (e.g. from a diff-friendly append workflow), a block correctly tagged `` ```run `` and genuinely contiguous, but drawn from the wrong run's section, would verify clean. Not actionable now; recording it as a MECHANISM, UNTRIED for whoever next touches `verify-pastes.ts` or the re-drive instructions.

Nothing else in the diff looks like new breakage. `metrics.ts`'s change is comment-only (no logic touched — confirmed by the diff hunk, which only replaces/adds doc-comment lines around `kicadTextBoxExtentAtPen`). `port-manifest.json`'s three new `handWritten` entries are exactly the three new/changed files that needed declaring (confirmed against `git diff --stat`: `verify-pastes.ts`, `document-pastes.test.ts`, `pen-call-sites.test.ts`). The Python predecessor (`verify-pastes.py`) is a clean deletion, not left beside its TypeScript replacement (confirmed: `deleted file mode` in the diff, and `ls tools/schgen/text-metrics/` shows no `.py` file). `docs/known-gaps.md`'s **G265** amendment meets the register standard: evidence is a check that could have failed (specific driven figures, not restated prose), "Verified: CONFIRMED" is explicit, and clause (1)'s "What would settle it" distinguishes CRITERION from MECHANISM, UNTRIED. Research-only constraint holds: the diff touches only `docs/`, `tools/schgen/text-metrics/`, `tools/schgen/port-manifest.json` (a disclosed provenance declaration, not behavior), and the two new test files — nothing in `lib/`, `circuits/`, or any existing check.

PARK (out of scope — did not extend the loop)
-----------------------------------------------

- The unused-exports Minor (M-5) from the original review (`inkExtent`, the `labelExtent` re-export) — not one of this round's three items, not re-attacked. Still present (not re-checked this round).
- Round 1's re-review flagged `boxPenWidth`'s invariant as "confirmed by grep, not by a guard" — **this is now superseded by Item 3**, which adds exactly that guard. Noting the resolution rather than parking it as still-open.
- The anchor-to-pen-origin (`111.1` vs `100.3` um) and PDF-outline (`0.8` um) residuals remain undiagnosed, as the document and **G265** clause 3 both say. Not new to this round, not re-attacked.
- The dormant "log holds more than one run" gap (New breakage #2 above) is recorded there rather than here because it is genuinely new-round scope (the checker that could have this gap didn't exist as TypeScript before this round), but it is PLAUSIBLE/dormant rather than CONFIRMED/live, so it is not elevated to a blocking finding.
- This is a research plan with no production tests to write; the absence of a production test suite is not raised as a finding, per the brief.

What I drove versus what I read
--------------------------------

**Drove:**
1. `bun run typecheck` — exit 0.
2. `bun test` with `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen` set — **3769 pass / 0 fail, 43409 expect() calls, 352 files, 150.79s**.
3. `bun test tests/schgen/text-metrics/pen-call-sites.test.ts tests/schgen/text-metrics/document-pastes.test.ts` directly — **11 pass / 0 fail**, confirming the +11 by content.
4. The real `verify()`/`parseBlocks()`/`report()` from `tools/schgen/text-metrics/verify-pastes.ts`, imported and called directly against the real document and the committed log — control green, `17/14/3/0`.
5. Four attacks of my own against the real `verify()`, all in memory, document never written: a one-line-block content swap (two variants, both exit 0 — the new-breakage finding); a coincidental-overlap scan of the three non-`` ```run `` blocks against the log (0 shared); an empty-`` ```run ``-block drive (exit 1, correctly caught); a run-count check on the committed log (exactly one run header).
6. A commit-coupling drive: fabricated a lockstep-advanced commit pin in both a copy of the document and a copy of the log, leaving every figure untouched, and ran the test's own coupling regex against it — passed, confirming joint staleness is undetected as the brief predicted.
7. `bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp` at HEAD (`3e52044`, clean tree confirmed before running) into a scratch file, diffed against the committed `tests/schgen/text-metrics/probe-run.log` — exactly 2 differing lines (commit hash, scratch path), both expected; confirmed via `git diff --stat c71e5c9..3e52044` that zero `.ts`/`.py` files changed between the document's pin and HEAD, so the commit-line difference reflects no code drift.
8. Hand count of §1.3's 23 strings and §1.5's 27 rows against their declared counts, and a diff-hunk read confirming both blocks were pure insertions (no edited pre-existing rows).
9. `git log --format='author:%an <%ae> committer:%cn <%ce>' 698e03c..3e52044` and a grep for `co-authored|claude|anthropic|generated with|session_|noreply@anthropic|sonnet|opus` over all 5 commit messages — all `oletizi <oletizi@mac.com>`, zero hits.
10. `git status --porcelain` on both repositories, before and after this review — empty both times.
11. `git diff --stat 698e03c..3e52044` and a full read of `review-698e03c..3e52044.diff` (all 9 files, 1735 lines) — confirmed the only files touched are the ones named above; nothing in `lib/`, `circuits/`, or any existing check.

**Read (not independently re-driven):**
- The brief, the implementer's full report (including fix round 1's section, for context), and the prior re-review (`task-1-re-review.md`), in full.
- The complete `698e03c..3e52044` diff, in full.
- `docs/known-gaps.md`'s full **G265** entry and `docs/schematic/text-handling-research.md`, in full, for consistency against the driven figures above.

Suite and typecheck numbers observed
--------------------------------------

| | observed here | reported |
| --- | --- | --- |
| `bun run typecheck` | exit 0 | (not separately reported this round) |
| `bun test`, `SCHGEN_SOURCE` set | **3769 pass / 0 fail**, 43409 expects, 352 files, 150.79s | 3769 / 0 / 352, +11 across +2 files |
| the two new test files alone | 11 pass / 0 fail | 7 + 4 = 11 |
| `verify()` vs real document + committed log | `17 fenced block(s): 14 VERIFIED, 3 declared NOT probe output, 0 FAILED` | same |
| probe re-driven at HEAD vs committed log | 2 lines differ (commit hash, scratch path), both expected, zero figures differ | implementer reported 1 line differing when re-driving exactly at the pinned commit; consistent once the extra commit-hash line (from driving 5 commits later) is accounted for |
| both repositories | `git status --porcelain` empty before and after | empty |
