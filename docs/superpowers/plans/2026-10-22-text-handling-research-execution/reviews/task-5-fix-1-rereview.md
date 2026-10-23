# Task 5 fix round 1 — re-review

**Scope: the eleven named items in `task-5-fix-1.md`, plus the coverage question. Not a full
re-review of Task 5.**

**Verdict: ALL ADDRESSED.**

---

## THE QUESTION THAT OUTRANKS THE ITEM LIST — did anything real stop being checked?

**NO**, established by driving rather than by reading the report.

Arithmetic, independently re-run (not taken from the report):

- `tests/schgen/label-freedom/fixtures.test.ts` alone: **6 pass, 38 `expect()`** (CONFIRMED, `bun
  test` run by this reviewer). Round 0 was 5/62. By hand-counting the old file's `expect()` sites
  against `ARMS` (9 arms before `a6`), 62 is exact: 18 (byte-identity, 2/arm × 9) + 1 (directory) +
  21 (diff-lines, 3/arm × 7 non-base arms) + 3 (the tautological RED case) + 19 (predictions, 2/arm
  × 9 + 1). The new file's 38 is exact the same way: 2 (one aggregate `toEqual([])` + one length
  check, replacing the 18 per-arm expects — not a removed check, a consolidation into one array
  comparison that fails exactly when any arm does) + 3 (new RED, digit) + 1 (new RED, missing) + 1
  (new RED, stray) + 9 (diff-lines, now `throw`-guarded instead of 2 `toBeDefined()` per arm, so
  1/arm × 9 non-base + 1 completeness) + 22 (predictions, 2/arm × 10 + 2 completeness). The only
  **lost** assertions are the three inside the old RED case, and they were true by construction
  (see Important 1 below) — not real checks.
- `tests/schgen/text-metrics/` directory: **38 pass, 134 `expect()`** (CONFIRMED, re-run by this
  reviewer). Matches the report's round-1 figure exactly. The -39 vs round 0's 173 is the
  NOT-CHECKED case: it went from a loop (`for (const n of v.notOutput) expect(n).toMatch(...)`,
  one `expect()` per entry — 40 of them per the report, which this reviewer did not re-derive
  independently but which is consistent with the file's own history) to **one** `expect(v.notOutput).toEqual(notCheckedByOwnScan(doc))`. 40 unfailable per-entry regex assertions
  replaced by one assertion that can fail — net loss of 39 `expect()` calls and a **net gain** in
  what is actually checked.
- Whole-suite: **3802 pass / 0 fail / 43551 `expect()` across 353 files** (CONFIRMED, re-run by
  this reviewer under `SCHGEN_SOURCE=.../digital-pedal-platform/tools/schgen bun test`, matching
  the report exactly, including the port-fidelity-gate-sensitive total).

Both removal sites were driven red by this reviewer, not just read:

1. **The fixture byte-comparison** (Important 1). This reviewer corrupted the real, on-disk,
   committed file `tools/schgen/label-freedom/fixtures/a2-slide.kicad_sch` (not the in-test
   injected reader — an actual `Edit` to the tracked file), changing `(at 44.45 38.1 180)` to
   `(at 45.72 38.1 180)` at line 56. Running `bun test tests/schgen/label-freedom/fixtures.test.ts`
   then failed the real top-level test (`every arm's committed sheet is byte-identical...`) with:

   ```
   a2-slide.kicad_sch DIFFERS from what fixtures.ts builds, first at line 56: on disk
   "(at 45.72 38.1 180)", built "(at 44.45 38.1 180)"
   ```

   — the same function, same refusal path, same line number (56) the report names, with disk/built
   reversed because this reviewer's corruption ran the opposite direction from the report's
   worked example. The file was restored from a pre-corruption copy and its SHA-256
   (`34a377158d...878d4a`, matching the committed probe log's own pin) verified identical
   afterward; `git status --porcelain` on the path is empty.

2. **The NOT-CHECKED re-derivation** (Important 2). This reviewer edited the real,
   tracked `tools/schgen/text-metrics/verify-pastes.ts`, changing `notOutput.push(\`line
   ${b.at}: ...\`)` to `${b.at + 1}`. Running `bun test tests/schgen/text-metrics/document-pastes.test.ts`
   then failed `the blocks that are NOT checked are reported by name, never silently dropped`
   with a full list mismatch (every line number off by one). The file was restored byte-for-byte
   from a pre-edit copy; re-running the full directory afterward gives the clean 38/134 above, and
   `git status --porcelain` is empty.

   **Independence confirmed by reading, not just by running:** `notCheckedByOwnScan` in the test
   file reimplements the fence walk from scratch (its own `/^```(.*)$/` scan, its own body
   accumulation, its own right-trim) and does not call `parseBlocks`, `verify`, or any other helper
   from `verify-pastes.ts`. Shared provenance is the document text only, so the red-drive above is
   a genuine disagreement between two independently-written scanners, not a tautology.

**Conclusion on the coverage question**: both removal sites were driven to a demonstrable failure
by corrupting the real artifact the check protects, confirming they are strictly load-bearing, and
the arithmetic of every `expect()` lost is accounted for by either (a) a tautological assertion
removed (the three inside the old RED case — true by construction, not a real check) or (b) a
consolidation of N per-item assertions into one equivalent-or-stronger aggregate assertion. Nothing
real stopped being checked.

---

## THE ELEVEN ITEMS

**IMPORTANT 1 — ADDRESSED.** Confirmed by independent red-drive above. The real committed fixture
file was corrupted on disk and the real top-level test refused it, naming the arm, the line (56),
and both sides, matching the report's text.

**IMPORTANT 2 — ADDRESSED.** Route taken: keep the loosened pattern, remove it from the assertion
entirely, replace with `notCheckedByOwnScan`. Confirmed: (a) no `toMatch` call remains anywhere in
`document-pastes.test.ts` (`grep` returns zero hits); (b) the false comment naming two shapes it
supposedly still caught is gone from the diff; (c) the new case was red-driven above and is
genuinely independent of `parseBlocks`. The declined third route (reindenting the probe) is
explained in the test's own comment with the reviewer's own reasoning attributed.

**IMPORTANT 3 — ADDRESSED.** Re-derived independently: this reviewer ran the full probe
(`bun run tools/schgen/label-freedom/probe.ts`, requires live `kicad-cli`) from a clean tree at
HEAD and diffed the output against the committed `probe-run.log` — **the only difference across
both files is the commit-hash line** (committed log pinned at `75a9bb8`, this reviewer's run at
`af19ae5`, which is correct since the probe code itself was untouched between those two commits).
Every figure is therefore byte-identical, including:
`boards under boards/: 11; boards with at least one label-blocked block: 9; boards with none: 2`,
with `pt2399-core` and `transistor-preamp-feedback` the two, and the row text confirming
`transistor-preamp-feedback`'s `tp-stage` is refused before `checkLayout` (so it is "not thereby
fine," per the brief's own caution). The method (`boardRefs`/`declarationFor`, matched on the
builder) and the credit to the reviewer are both stated in §5.5a.

**M-1 — ADDRESSED.** All three figures (best-by-total 2, best-by-label-count 8, tie-free 3)
appear in the fresh probe re-run byte-identical to the committed log, and both wrong metrics are
named with their causing blocks. Tie-free metric and its rationale read correctly in `freedoms.ts`.

**M-2 — ADDRESSED.** Confirmed in the fresh probe re-run: `EMPTY CANDIDATE SETS, ... freedom 2 0,
freedom 4 6, freedom 3 0`, with the non-vacuity statement attached in the same line and in §5.7's
freedom-4 row.

**M-3 — ADDRESSED.** `docs/known-gaps.md` G262's Evidence bullet now reads "...WAS `[CODE]` WHEN
THIS BULLET WAS WRITTEN AND IS NOW MEASURED, AND MEASURED FALSE" (confirmed by direct read at the
cited location), rather than contradicting its own correction.

**M-4 — ADDRESSED.** G259 now reads "...is DISCHARGED as of 2026-10-22" and "it is not open on
this count any more... Task 5 has run," naming the two fixtures that drove it (confirmed by direct
read).

**M-5 — ADDRESSED and independently re-driven.** Ran the four-term-plus-control grep myself against
`docs/schematic/text-placement-prior-art.md` (939 lines, confirmed): `global label` 0, `line
feature` 0, `line labeling` 0, `line labelling` 0, `slider` (control) 5. §5.1 and G270 both now
state four terms plus the control, matching exactly.

**M-6 — ADDRESSED.** G269 now carries "EVERY COUNT IN THIS ENTRY IS A FIGURE AT ONE TEXT BOX," its
own ruler paragraph, and an updated "why it is open" / "what would settle it" naming the ruler
comparison requirement (confirmed by direct read).

**M-7 — ADDRESSED.** The one truncated quotation ("...which this generator has merely
restricted[...]"") now carries the elision marker with an explanatory clause (confirmed at
`docs/schematic/text-handling-research.md:4067`).

**M-8 — ADDRESSED.** The `endLine` bound in `document-pastes.test.ts` now throws
(`if (fifth < 0) throw new Error(...)`) instead of silently falling back, matching its sibling's
explicit refusal (confirmed by direct read of the diff and the live file).

---

## THE RULER CRITERION

**ADDRESSED.** Checked both halves:

- §5 (the document): the ruler qualifier appears at the point of statement in the §5 preamble, the
  probe's own `RULER:` summary line (confirmed present verbatim in the freshly re-run probe
  output), §5.7's table header and its freedom-2/4 rows, all four §5.10 mechanisms, and §5.11's
  explicit "what does NOT depend on the ruler" clause (the four freedoms, the two populations, the
  candidate-set widths).
- The register: G262's scoreboard table and clause (d) now read "...clears five of the twelve
  blocks, AT THIS RULER" and "...ZERO problems at this ruler" respectively; G269 carries its own
  ruler paragraph (M-6, above) rather than being silent on it.

The qualitative finding — the four freedoms exist — is stated as NOT ruler-dependent in both places
(measured against the netlister, §5.3/G262 table (a)), consistent with the brief's own framing.

---

## ALSO VERIFIED

- **§1–§4 untouched — CONFIRMED independently.** `git show 3c36884:docs/schematic/text-handling-research.md | head -3389 | shasum -a 256`
  and `head -3389` of the current file both hash to `2e9f670d...9101c0`. `git diff --numstat
  3c36884..af19ae5 -- docs/schematic/text-handling-research.md` reports 151/34, matching the
  claim, and every `@@` hunk header in that file's diff starts at line ≥3409 — inside §5.
- **Nothing fixed — CONFIRMED.** `git diff --name-only 3c36884..af19ae5 -- lib/ circuits/ boards/
  Makefile` returns nothing. The ten changed files are all docs, tests, and `tools/schgen/label-freedom/`.
- **Sixth arm in the manifest — CONFIRMED, with the right scope.** All five `tools/schgen/label-freedom/*.ts`
  files and `tests/schgen/label-freedom/fixtures.test.ts` are listed in `port-manifest.json`'s
  `handWritten` array. `tests/schgen/port-fidelity.test.ts`'s own gate
  (`every .ts file under lib/schgen/, tests/schgen/ and tools/schgen/ is ported, diverged, or
  declared hand-written`) is scoped to `.ts` files only, so the new `.kicad_sch` fixture is
  correctly out of that gate's scope; its commit and content-comparison are handled by
  `fixtures.test.ts` itself (confirmed above). The suite passing confirms the gate is satisfied.
- **`SCHGEN_SOURCE=... bun test` — CONFIRMED: 3802 pass / 0 fail / 43551 `expect()` across 353
  files**, exactly matching the report.
- **`bun run typecheck` — CONFIRMED clean, no output.**
- **`make check` red, not this round's doing — CONFIRMED structurally.** `G251` exists and names
  the exact failures (`pt2399-core`'s missing `bomConditions` export, a `LEAD_SPANS` gap), and this
  round's diff touches no file under `lib/`, `circuits/`, `boards/`, or `Makefile` (confirmed
  above), so the pre-existing red cannot be this round's. `make check` itself was not re-run, per
  the brief's own instruction not to let it block.
- **No AI attribution — CONFIRMED.** Read both full commit messages (`af19ae5`, `75a9bb8`); neither
  carries any attribution trailer or session link.
- **No dependency added — CONFIRMED.** `git diff --name-only 3c36884..af19ae5 -- package.json
  bun.lock` is empty.
- **The Write-tool-refused-report-path note.** The appended round-1 section in `task-5-report.md`
  reads as coherent prose, consistent in voice and claims with the rest of the file; no internal
  contradiction found. Treated as a tooling note per the brief, not chased further.

### One open methodological point, not a defect in the shipped artifact

The report claims "the figure was predicted term by term before the run... written to the
scratchpad first, then matched exactly" and the commit message repeats "the figure was predicted
term by term before the run." **This reviewer could not verify that claim from the committed
tree**: `.superpowers/` is gitignored (confirmed — `git ls-files` returns nothing for
`task-5-report.md`, and it has no commit history), so the prediction, if written to a scratchpad
first, left no durable trace this review can audit. This is exactly the shape the project's own
list of recorded false-green patterns names ("a claim whose only evidence was in a gitignored
directory," "a prediction asserted after the run rather than before"). It does **not** change the
verdict on any of the eleven items or the coverage question — this reviewer independently
re-derived every figure the prediction claim concerns (the suite counts, the full probe re-run) and
all of them are correct regardless of when they were predicted. It is flagged because the prior
review found and fixed the identical class of claim once already on this branch, and the practice
of asserting timing-of-prediction without a durable artifact is the thing that class of finding
exists to prevent.

---

## Verdict

**ALL ADDRESSED.** All eleven items (three Important, eight Minor) are confirmed fixed by direct
re-drive, not merely by reading the report. The coverage question's answer is **NO — nothing real
stopped being checked**: the 63 removed `expect()` calls are fully accounted for by removing three
assertions that were true by construction and consolidating per-item loops into equivalent-or-stronger
aggregate assertions, and the two specific replacement checks (the fixture byte-comparison and the
NOT-CHECKED re-derivation) were both driven to a real, correctly-worded failure by this reviewer
using real on-disk corruption of tracked files, then restored. The tree is clean
(`git status --porcelain` empty) and HEAD is unchanged (`af19ae5`).
