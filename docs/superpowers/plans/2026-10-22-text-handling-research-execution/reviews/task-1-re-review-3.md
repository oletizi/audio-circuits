Task 1 re-review: fix round 3, scoped to `3e52044..14ed8f0`
=============================================================

Re-reviewed at `14ed8f0`, worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`,
branch `feature/schematics-tooling`. Diff `3e52044..14ed8f0`, 3 commits, 4 files
(`docs/known-gaps.md`, `docs/schematic/text-handling-research.md`,
`tests/schgen/text-metrics/document-pastes.test.ts`,
`tools/schgen/text-metrics/verify-pastes.ts`). Both repositories were
`git status --porcelain` empty before this review and are empty after it (confirmed
again at the end). Nothing was committed. `verify-pastes.ts` was edited four times
during this review, as temporary, in-memory-equivalent perturbations to prove the
suite's red drives are tied to the clause they claim to test; each edit was restored
from a saved pristine copy and the restoration verified by SHA-256
(`4e5d8e79ab69fae20cd8f4a80a53edf7dd044a4e621e10e309625833775cb733`) before moving on,
and `git status --porcelain` on that file was empty after the last restore.

The two items
-------------

| Item | Verdict | Evidence (a drive I ran) |
| --- | --- | --- |
| **Item 1** — the n=1 hole closed by a four-clause rule (section anchor, ≥2 non-blank lines, exactly one offset, no overlap) | **ADDRESSED** | Ran the real `verify()` against the real document and committed log: `17 fenced block(s): 14 VERIFIED, 3 declared NOT probe output, 0 FAILED`, matching the report. `bun test tests/schgen/text-metrics/document-pastes.test.ts`: 16/16 pass, including the n=1 shrink-and-swap case. Reproduced the mechanism directly: setting `MIN_OUTPUT_LINES = 1` (the pre-fix state) flips exactly that test red (`"shrunk: 1"` expected, `"shrunk: 0"` received) — confirming the guard, not something else, is what catches it. |
| **Item 2** — R15, a two-run log refused by name | **ADDRESSED** | `bun test` green on the two-run and no-run cases. Setting `if (false && runs !== 1)` (disabling R15's named check) flips both tests red, and the two-run case's failure message becomes exactly the "fourteen confusing failures" shape the report predicts: `"the \`\`\`run block at line 94 names section ... matches 2 of the log's 22 headers"` — i.e. without the named refusal, a two-run log is still refused, just illegibly, which is what the report claims and what R15 was written to fix. |

The five named attacks
-----------------------

### 1. Clause (iii), "exactly one offset" — attacked this way, **it holds**

Drove both constructions against the real `verify()`, document and log unmodified except as stated:

- **A section that appears once but repeats internally**, so a short block matches twice at different offsets within its own (large, trailing) section: built by appending a duplicate of the `SURVIVORS: drawn-text overlaps` block's own 4 lines later in the log, still inside `STEP 4b`. Correctly rejected: `"matches section ... at 2 different offsets, so which output it quotes is ambiguous"`. Holds.
- **A block matching once in its declared section and also matching verbatim in a different section**: injected the `STEP 3b` block's exact lines into `STEP 1`'s body as well. The checker still verifies clean (`14 VERIFIED, 0 FAILED` — unchanged from control), because `matchesWithin` is scoped to `[section.from, section.to)` only. **Uniqueness is scoped to the declared section, not to the log as a whole.** This is deliberate, not a hole: the cross-section duplicate is invisible to the check but does not by itself let wrong content verify — it would only matter in combination with the already-disclosed same-section residual (attack 4), not on its own.

### 2. Clause (ii), "≥2 non-blank lines" — attacked this way, **it holds**

- A 2-non-blank-line block whose lines are separated by a blank **not** present in the log at that point: fails loud (`"is not a contiguous slice of section"`), because the blank is a literal element `matchesWithin` must match exactly.
- Leading-whitespace-only edit (two leading spaces replaced by a tab on an otherwise-identical indented line): fails loud (`"First line that is nowhere in the log"`), because only *trailing* whitespace is normalized on both sides (`parseBlocks` and `verify` both do `.replace(/\s+$/, "")`); leading whitespace is compared byte-for-byte. Stricter than it needs to be, but strict in the safe direction.
- Control: trailing-whitespace-only edit still verifies clean, as intended (both sides strip trailing whitespace symmetrically) — confirms this is deliberate normalization, not a crack.

No construction at this boundary produces a false pass.

### 3. Clause (i), the section anchor — attacked this way, **it holds against false passes, with one disclosed fragility**

- **A `== `-prefixed line inside an existing section's own body** (simulating a hypothetical future probe-output line that happens to start with `== `): `parseSections` has no way to tell this from a real header, so it silently re-partitions the section. Driven against the real log: this actually broke two currently-VERIFIED blocks (verified dropped from 14 to 12, 2 new FAILED). **This is a fragility, not a hole** — it fails *loud and false*, not quiet and wrong, which is the safe direction this project explicitly prefers ("a skipped check must never look like a passing one"). It does not let any bad content pass; it would only ever cause a legitimate future paste to need re-anchoring. Worth naming because `parseSections` is new this round and nothing in it or its tests exercises this case.
- **A section name that is a prefix of another** (dropping the colon from `STEP 2 ROUTE 3` so it is a literal prefix of `STEP 2 ROUTE 3`, `3b`, and `3c`): correctly rejected as ambiguous (`"matches 3 of the log's 11 headers"`). The colon convention plus the `hits.length !== 1` check make this safe by construction.
- **A block declaring a section that exists in the document's prose but not the log** (`STEP 5:`): correctly rejected, `"matches 0 of the log's 11 headers"`.

Holds, modulo the disclosed fragility above (new breakage #2 below).

### 4. Clause (iv), overlap, and joint exhaustiveness — attacked this way, **the four clauses are jointly exhaustive against the three historical defeats, but the stated residual is not as narrow as claimed**

Could a block satisfy all four clauses and still be wrong in a way the earlier three defeats (wrong-block membership swap, n=1 collapse, relabel dodge) would have caught? **No** — every construction that reproduces those three shapes is caught by the section anchor, the minimum, or the relabel-closure respectively (confirmed again this round; see attacks 1–3).

But the brief also asked to verify the residual is as narrow as claimed — **"the section anchor narrows the target from the whole run to one step; it does not eliminate it"** (§1.11, and the code comment). I measured `STEP 4b`'s actual span: **it runs from log line 480 to line 620 (141 lines) because it is the last header in the log and therefore open to EOF**, and it contains not one measurement but several — the `SKIPPED`+`CONTROL` block, the full G260 fallback table, two `SURVIVORS` summaries, and a long unquoted `covers wire` correspondence listing for every block/pair and every quantity.

I substituted the `SURVIVORS: drawn-text overlaps` block's 4 lines (a real, currently-VERIFIED block) with 4 different, genuine, unclaimed lines taken from deep inside that same section's unquoted `covers wire` tail. **`verify()` returns `14 VERIFIED, 0 FAILED` — identical to the control.** The document would now assert, under the heading "The blocks blocked on drawn-text overlaps," four lines that are actually part of a wire-coverage listing for `opamp-buffer`/`optical-compressor`/`pt2399-core` and have nothing to do with overlap survivor counts — and the checker is silent.

**So: attacked this way, it does not hold as characterized.** The residual is real (correctly disclosed as existing) but for the trailing, open-ended section specifically, "one step" understates its size by roughly an order of magnitude — it is "the rest of the log," not "one measurement." For every other, header-bounded section (a few lines to a few dozen), the narrowing claim is accurate; it just isn't true of the single largest section, which happens to anchor three of the document's blocks including the two highest-stakes tables (G260's fallback count, the overlap survivors).

### 5. "Eight red drives promoted to suite cases" — attacked this way, **it holds**

Verified by name rather than arithmetic, as asked:

- 9 new `test(` blocks (`document-pastes.test.ts` went 7 → 16, confirmed by `bun test` output: "Ran 16 tests"). Named: (1) shrunk-to-one-line / shrunk-and-swapped (2 attacks, 1 test), (2) whole-genuine-slice-of-another-section substituted (1 attack, 1 test), (3) one-line padded with a non-neighbouring genuine line (1 attack, 1 test), (4) blank-line padding (1 attack, 1 test), (5) section renamed / section duplicated (2 attacks, 1 test), (6) two blocks claiming the same slice — block-span overlap (1 test, not one of the "eight," it's the new-attack-surface #5 the implementer found), (7) log holding two runs (1 attack, 1 test — one of the eight), (8) log holding no run (1 test, a symmetry check of (7), not itself one of the eight), (9) "the log's sections are the anchors the document names" (1 test, a general consistency check, not an attack). That is 6 tests realizing the claimed 8 named attacks plus 3 additional tests — 9 total, matching "+9 … no new files" exactly by name.
- **Perturbed the checker itself, four times, to confirm the tests are true positives rather than vacuous passes**, each time restoring from the saved original and verifying the SHA-256 before moving on:
  - `MIN_OUTPUT_LINES: 2 → 1` flips "RED: a run block shrunk to a single line…" red (`"shrunk: 1"` expected / `"shrunk: 0"` received).
  - Disabling the overlap-`clash` check flips "RED: two blocks claiming the same slice of the log" red (`1` expected / `0` received).
  - Disabling R15's `runs !== 1` check flips both the two-run and the no-run tests red, and shows the two-run case falling back to an ambiguous-section failure rather than disappearing — confirming the report's "fourteen confusing failures" claim about what R15 replaces.
  - Widening `matchesWithin`'s section scope to the whole log (defeating the section anchor) flips "RED: a whole genuine slice of another section, substituted for a block" red — though in this particular victim/donor pair it is caught by the *overlap* check once scoping is removed (both now match at the same absolute offset), not by a "not a contiguous slice" message. The test still goes red either way, which is what the drive was checking; the specific failure message it was written to see no longer fires, which is itself informative about clause redundancy at that one pair, not a defect.

Holds: every attack I could construct against the eight claimed red drives failed to slip through, and disabling the specific guard behind each drove the specific expected test red.

New breakage in the fix diff only
----------------------------------

1. **CONFIRMED (Minor, documentation accuracy).** The "the section anchor narrows the target from the whole run to one step" characterization in §1.11 and in `verify-pastes.ts`'s module comment overstates the narrowing for `STEP 4b`, the log's last (open-ended) section. It is 141 lines and bundles several distinct measurements. The underlying gap — a different genuine, contiguous, unique slice of the *same* section can be substituted and still verify — is correctly disclosed as existing; only the "one step" sizing of it is inaccurate for this section, and this is the section that anchors the G260 fallback table and the overlap-survivors table, i.e. the two tables with the most riding on them. Driven: substituting the overlap-survivors 4-line block with 4 unrelated, genuine `covers wire` lines from the same section's unquoted tail verifies clean (`14 VERIFIED, 0 FAILED`).
2. **PLAUSIBLE (Minor, safe-direction fragility).** `parseSections` (new this round) treats any line starting with `== ` as a section header, with no awareness of whether that line is a real header or incidental probe output. Driven: inserting a `== `-prefixed line inside `STEP 4b`'s existing body breaks two currently-VERIFIED blocks (14 → 12 verified, 2 new FAILED), because it silently re-partitions the section around the inserted line. This fails loud and false rather than quiet and wrong — the safe direction this project explicitly prefers — so it does not let anything bad pass; it is a latent maintenance trap for whoever next grows the probe's output format to include a line that happens to start with `== `.
3. **Noted, not ranked (negligible).** The implementer's own round-3 report describes §1.11 as naming "the four things it does not establish"; the document as written lists three bulleted items under that heading, with the one-run requirement stated separately afterward as a constraint rather than a fourth bullet. A miscount in the report's self-description, not a defect in the document, the checker, or either item's closure.

Nothing else in the diff looks like new breakage. `docs/known-gaps.md`'s **G265** amendment records (i) flat-membership-with-gate, (ii) n=1-contiguity-collapse, and (iii) the relabel dodge as three genuinely distinct general shapes (confirmed by reading: each is a different mechanism of defeat, not three instances of one). The §1.4-before-§1.7 thematic-ordering claim is correct: the log's `STEP 3` section has the distribution line at log line 441 and the height line at log line 448 (distribution first, height second, in run order), while the document quotes the height line in §1.4 (doc line ~271) before the distribution line in §1.7 (doc line ~398) — document order is the reverse of run order, confirming the document is organised thematically and that a document-order rule was rightly rejected. No figure moved in this diff (the diff touches only prose/tags around existing `run` blocks, adds `STEP 4b`'s five `SKIPPED` lines which are themselves pasted log output, and adds test/checker code). Research-only constraint holds: the diff touches only `docs/`, `tests/schgen/text-metrics/document-pastes.test.ts`, and `tools/schgen/text-metrics/verify-pastes.ts` — nothing in `lib/`, `circuits/`, `boards/`, or any existing gate.

PARK (out of scope — did not extend the loop)
-----------------------------------------------

- The cross-section uniqueness scoping (attack 1's second construction) is inert on its own; flagging it only in case a future change widens what counts as a "match" without also widening the overlap/claim bookkeeping, at which point section-local scoping and whole-log scoping could start to matter together.
- All PARK items from `task-1-re-review-2.md` that this round didn't touch remain as recorded there: the unused-exports Minor (M-5, `inkExtent`, the `labelExtent` re-export), the undiagnosed 111.1-vs-100.3 um and 0.8 um residuals (now updated figures, still undiagnosed, recorded in G265 clause 3 and in this document).
- This is a research plan with no production tests to write; the absence of a production test suite is not raised as a finding, per the brief.

What I drove versus what I read
--------------------------------

**Drove:**
1. `bun run typecheck` — exit 0 (`tsc --noEmit`, no errors).
2. `bun test` with `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen` set — **3778 pass / 0 fail, 43448 expect() calls, 352 files, 152.88s.**
3. `bun test tests/schgen/text-metrics/document-pastes.test.ts` directly — 16/16 pass.
4. The real `verify()`/`parseBlocks()`/`parseSections()` imported directly from `tools/schgen/text-metrics/verify-pastes.ts` and run against the real document and committed log, and against ~10 in-memory constructions covering all five named attacks (control reproduced exactly: `17/14/3/0`).
5. Four targeted perturbations of the real checker file (`MIN_OUTPUT_LINES`, the overlap-`clash` check, the R15 run-count check, and the section-scoping of `matchesWithin`), each followed by `bun test tests/schgen/text-metrics/document-pastes.test.ts` to confirm the tied test(s) flip red, then restored from a saved pristine copy with SHA-256 verification (`4e5d8e79ab69fae20cd8f4a80a53edf7dd044a4e621e10e309625833775cb733`) before the next perturbation.
6. `git diff --name-only c71e5c9..HEAD -- tools/schgen/text-metrics/ lib/ circuits/ boards/` — exactly one path, `verify-pastes.ts`.
7. `git diff --stat c71e5c9..HEAD` over the other 9 `.ts` modules in `tools/schgen/text-metrics/` by name — empty.
8. `grep -n "line HEIGHT: current model" / "estimate / glyph advance sum"` against the committed log, to directly verify the §1.4-before-§1.7 thematic-ordering claim (log lines 448 and 441 respectively).
9. `git log --format='%H author:... committer:...%n%B' 3e52044..14ed8f0 | grep -iE "co-authored|claude|anthropic|generated with|session_|noreply@anthropic|sonnet|opus"` — zero hits.
10. `git status --porcelain` on both repositories, before and after — empty both times.
11. Read `docs/known-gaps.md`'s full G265 entry and `docs/schematic/text-handling-research.md` §1.11 in full, line-counted the "What it does NOT establish" bullets (3, not 4 as the report's prose says).

**Read (not independently re-driven):**
- The brief, the implementer's full report (all four rounds, for context), and both prior re-reviews, in full.
- The complete `3e52044..14ed8f0` diff, in full (both pages).
- `tools/schgen/text-metrics/verify-pastes.ts` and `tests/schgen/text-metrics/document-pastes.test.ts` in full, at HEAD, before any perturbation.

Suite and typecheck numbers observed
--------------------------------------

| | observed here | reported |
| --- | --- | --- |
| `bun run typecheck` | exit 0 | (not separately reported this round) |
| `bun test`, `SCHGEN_SOURCE` set | **3778 pass / 0 fail**, 43448 expects, 352 files, 152.88s | 3778 / 0 / 352, +9 over round 2's 3769 |
| `document-pastes.test.ts` alone | 16/16 pass | 7 → 16 |
| `verify()` vs real document + committed log | `17 fenced block(s): 14 VERIFIED, 3 declared NOT probe output, 0 FAILED` | same |
| `git diff --name-only c71e5c9..HEAD` (probe dir + lib/circuits/boards) | exactly one path (`verify-pastes.ts`) | same |
| `git diff --stat c71e5c9..HEAD` over the other 9 probe modules | empty | empty |
| both repositories | `git status --porcelain` empty before and after | empty |
| AI-attribution grep over 3 commit messages/authors/committers | 0 hits | 0 hits (reported) |
