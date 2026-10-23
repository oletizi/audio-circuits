# Task 2 fix round 3 - re-review

Scope: the three named items in the fix-round-3 brief, plus the specific new
attack surface round 3 opened (number-format reformatting of the committed
log). Diff reviewed: `593f29e..76d6a2b` (commits `9bbd78c`, `31419be`,
`76d6a2b`). Not a full re-review of Task 2.

## ITEM 1 - completeness of the height sweep: ADDRESSED

**Verified by construction, not by assertion.** Read
`tools/schgen/elk-labels/probe.ts` STEP 5 and STEP 6: both now iterate the
single `METRICS` array (lines ~310-330) - STEP 5 prints the arm table from it,
STEP 6 sweeps the identical array across `LINE_HEIGHTS` and feeds the same
`of()` closures. There is no second list that merely happens to agree; the
table and the sweep cannot drift apart because there is only one list to
drift from.

`[RAN]` `bun run tools/schgen/elk-labels/probe.ts` on the clean tree
reproduces exactly:

```
cells (arm x metric): 12 x 13 = 156; INVARIANT across the three heights: 149; VARYING: 7
  VARIES b/worst-um = 31740.0 / 31587.6 / 30966.9
  VARIES d/wire = 168 / 178 / 178
  VARIES d/on-grid = 109 / 95 / 66
  VARIES e/on-grid = 46 / 43 / 12
  VARIES g/wire = 0 / 4 / 9
  VARIES g/on-grid = 187 / 146 / 136
  VARIES i/lbl-lbl = 0 / 5 / 5
```

`b/worst-um` is reported varying with exactly 31740.0 / 31587.6 / 30966.9,
matching the fresh run and the committed log. `[RAN]` A full diff of the
fresh run against the committed `probe-run.log` (`tail -n +2` on both, to
skip the HEAD-sha line that necessarily differs on a doc-only follow-up
commit) showed **zero other differences** - the log genuinely reproduces.

Both sites that used to quote 30966.9 bare now carry all three heights and
the corrected grid-step count:

- `docs/schematic/text-handling-research.md:1130-1132`: "31740.0 µm at the
  current model's 1270 µm line, 31587.6 µm ... and 30966.9 µm at
  `GetTextBox`'s 2043.1 µm - 25.0, 24.9 and 24.4 grid steps respectively."
- `docs/known-gaps.md` G266 clause (2), lines 2265-2267: same three values,
  same correction, and a following paragraph (lines 2273-2279) explicitly
  names the old claim ("the worst by 30966.9 um - over 24 grid steps") as
  false at the current model's line, "exactly 25.0 grid steps."

No remaining site quotes 30966.9 (or 31740.0/31587.6) without its sibling
values - grepped across both files.

## ITEM 2 - the guard's reach (fenced blocks only): ADDRESSED

**Drove it rather than read the claim.** Edited a §2 PROSE figure (not inside
a fenced block) at `docs/schematic/text-handling-research.md:1178` from
`**46 at the current model's 1270 µm line` to `**99 at the current model's
1270 µm line`, then ran `bun test tests/schgen/text-metrics/document-pastes.test.ts`:
**23 pass / 0 fail** - nothing went red on the corrupted prose figure. File
restored to the original text via Edit; `git status --porcelain` confirmed
clean afterward.

The narrowed wording matches what the guard actually does: G266 clause (5)
now reads "WHAT THAT GUARD COVERS IS FENCED BLOCKS", names the re-reviewer's
46-to-99 drive explicitly, and ends with "a pasted block cannot drift from the
log; a prose figure beside it can." That is an accurate description of the
test file's two `describe` blocks, both of which operate on fenced
` ```run `/` ```elk-run ` blocks via `parseBlocks`/`verify` and never touch
surrounding prose.

The gap is recorded in `docs/known-gaps.md` (not only in the gitignored
report): G266 clause (5)'s "OPEN" paragraph states CRITERION ("a figure in
§2's prose that disagrees with §2's log fails the suite") and a MECHANISM
marked UNTRIED and probably wrong-shaped, with the reasoning for why
(distinguishing a quoted figure from a correct arithmetic derivation like
"25.0 grid steps" is the §1.11 "checker reads prose" problem). This is a
durable record, not a report-only note.

## ITEM 3 - arm l, the control arm c lacked: ADDRESSED

`[RAN]` Fresh probe run, arm l row: **144 resized, worst 20.0 µm, 46 of 48
blocks moved** - the re-reviewer's three figures reproduce to the digit.

Cross-check against the probe's own numbers (not re-derived by hand): arm d's
`own-body` column and arm g's `own-body` column both report **254** (real-
bodied unit nodes); arm l's `resized` is **144** (zero-size boundary nodes
given a body). **254 + 144 = 398**, which equals `sent`/`back`/`placed` on
every labelled arm (b, c, d, e, g, and the total node count). This is an
identity recoverable directly from the committed log's STEP 5 table, not a
fabricated arithmetic check.

Arm c's split: `resized` = 362 (arm c's row) = 144 (arm l's boundary-node
resizes) + 218 (the remainder, attributed to the label). `362 - 144 = 218`
checks out arithmetically against the log's own figures.

`docs/schematic/text-handling-research.md:1010-1013` (§2.6, in the
arm-by-arm paragraph) states plainly: "The probe does not attribute them
individually and §2 does not claim it does." `docs/known-gaps.md` G266
clause (9) says the same in its own words ("the probe does not attribute
them individually. What the control establishes...").

## THE SPECIFIC NEW ATTACK SURFACE: number reformatting after `31419be`

Commit `31419be` changed the committed log's number formatting (micrometre
columns to one decimal, counts to integers, after the shared-METRICS-list
commit had collapsed `17790.0`->`17790` and `20.0`->`20`). Every §2 block
had to be re-spliced against the reformatted log.

**The fenced-block check could have failed, and didn't, for the right
reason.** `[RAN]` `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen
bun test` -> **3785 pass / 0 fail / 43482 expect() calls across 352 files**,
matching the implementer's figure exactly. The §2-specific test
("every block section 2 pastes is a contiguous slice of section 2's committed
log") is one of those 3785 and is not vacuous: the independently-run RED
cases in the same file (digit-edited block, donor-section substitution) do
fail when driven, which is the proof this check has teeth rather than
passing by construction.

**Prose spot-check, done independently rather than relayed.** Extracted every
decimal-bearing number (>=3 characters) from §2's prose (lines 696-1457,
59 distinct values after dedup) and grepped each against the committed
`tools/schgen/elk-labels/probe-run.log`. Every value not found in the log
resolves to one of the implementer's named categories:

- `0.12` - the off-pin elkjs version, explicitly marked as off-pin in prose.
- `0.4` - the 0.4% padding derivation (`5 um / 1270 um` and friends).
- `1.11`, `1.27` - section-number / grid-size references, not probe figures.
- `2.0` through `2.10` - §2.x subsection numbers.
- `24.4`, `24.9`, `25.0` - the grid-step derivations named by the report
  (`worst-um / GRID`), correctly absent from a log that reports micrometres
  only.

Every other decimal figure checked - including every µm figure with a
decimal place I sampled (`141411.2`, `172473.1`, `2043.1`, `1021.5`,
`2788.4`, `87548.8`, `30966.9`, `31587.6`, `31740.0`, `33020.0`, and more) -
is present verbatim in the committed log. I also independently verified the
"123 lines" line-accounting figure in §2.10/G266 clause (5):
`split("\n")` on the committed log gives 123 entries (122 newline-terminated
lines plus the trailing empty string from the final `\n`), of which 9 are
blank (8 separator blanks + the trailing empty string), 8 are `== ` headers,
and 106 are quoted content - `106 + 8 + 9 = 123`, matching the document's
own figure exactly. **No mismatch found.**

**The RED case for the victim line still has teeth, and isn't perturbing
something immutable.** Read `tests/schgen/text-metrics/document-pastes.test.ts`
lines ~297-311: `victim` is read live from `elkLog.split("\n")` by finding
the line starting `"cells (arm x metric)"`, then perturbed by incrementing
its trailing digit. `[RAN]` This line is
`cells (arm x metric): 12 x 13 = 156; INVARIANT across the three heights: 149; VARYING: 7`,
and `/(\d+)$/` matches only the trailing `7` (VARYING's count), not any of
the earlier numbers in the line - so the perturbation is well-defined and
produces a line that differs from the log by exactly one character. The line
itself is not a fixed/frozen constant: it already changed in this very round
(55/49/6 -> 156/149/7), so a future probe change will continue to make this a
live, re-derived victim rather than a frozen literal the test could silently
stop exercising. The test (part of the 3785-pass run above) confirms `verify()`
reports exactly one failure, `"not a contiguous slice"` - the right failure
reason, on the right (fenced) surface.

## Residuals recorded durably

Both of the implementer's stated residuals are in `docs/known-gaps.md`
(G266), not only in the gitignored report:

- Arm b's resize magnitude is still not separated from its option's: G266
  clause (9), final paragraph ("What is still not separated is arm b's...
  nothing in §2's conclusions depends on arm b's magnitude").
- §2's prose is unguarded with only a by-hand cross-check behind it: G266
  clause (5)'s "OPEN" paragraph, with CRITERION and MECHANISM stated.

## Suite, typecheck, attribution, manifest

- `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen
  bun test` -> **3785 pass / 0 fail / 43482 expect() calls across 352
  files.** CONFIRMED, driven myself.
- Without `SCHGEN_SOURCE`: `[RAN]` `bun test tests/schgen/port-fidelity.test.ts`
  -> **4 pass / 8 fail**, each failure `"SCHGEN_SOURCE is not set..."` - the
  guard FAILS rather than skips, as intended. CONFIRMED.
- `bun run typecheck` -> clean (`tsc --noEmit`, exit 0). CONFIRMED.
- `git log` on the three commits (`9bbd78c`, `31419be`, `76d6a2b`): no
  `Co-Authored-By`, no `Claude-Session`, no "Generated with" footer, no
  session link. CONFIRMED by reading each commit message in full.
- The only `.ts` files changed under `tools/schgen/` in this round
  (`tools/schgen/elk-labels/arms.ts`, `tools/schgen/elk-labels/probe.ts`) are
  both already declared in `tools/schgen/port-manifest.json` (lines 877-879).
  CONFIRMED.
- `git status --porcelain` is clean at the end of this review (the one
  deliberate perturbation, the 46->99 prose edit for ITEM 2, was restored via
  Edit and the tree re-checked clean immediately after).

## Findings

No new defect found beyond what the implementer already disclosed and
recorded. The two residuals (arm b's unseparated magnitude; §2's unguarded
prose) are real gaps, correctly scoped as "open" rather than silently
dropped, and both are durably recorded.

## Verdict: ALL ADDRESSED
