# Task 4 fix round 1 — scoped re-review

**Verdict: ALL ADDRESSED.** All ten items from `task-4-fix-1.md` are ADDRESSED. The
new test machinery (M-8) has real teeth, with one nuance recorded below that does
not weaken it. The `expect()` accounting (both the report's and the committed
document's decomposition) checks out term by term, against figures I drove
myself. Both re-driven tool fixtures (netlistsvg, schemdraw) independently
reproduce the published figures from the committed tree plus the pinned upstream
versions — I rebuilt both from scratch rather than trusting the report.

All checks below are **CONFIRMED** by me directly (re-driven, not relayed) unless
marked RELAYING.

---

## A. The new test machinery's teeth

**CONFIRMED, with one nuance.**

- §4 actually pastes exactly 8 fenced blocks (verified independently with a
  throwaway script against the live document: 2 `lepton-src`, 1 `nsvg-fixture`,
  3 `nsvg-run`, 1 `sd-fixture`, 1 `sd-run`). `SECTION_4_BLOCKS = 8` is not
  vacuous — it pins a real, non-empty population, and the "declares a fence word
  that is neither `run` nor `elk-run`" loop iterates over 8 genuine, distinctly
  named blocks (`lepton-src`, `nsvg-fixture`, `nsvg-run`, `sd-fixture`, `sd-run`),
  not an empty range.
- **Drove the pinned-count red myself.** Edited `SECTION_4_BLOCKS` from 8 to 7 in
  the tracked file, ran `bun test tests/schgen/text-metrics/document-pastes.test.ts`:
  exactly 3 of the 4 new-describe tests go red (`§4 pastes exactly the pinned
  number of blocks`, `every one of them declares itself as something other than
  probe output`, `the whole-document verdict reports all eight as NOT CHECKED...`),
  the relabel RED test stays green (it doesn't depend on the constant). This
  matches the report's claim exactly. Restored the file to `8` and confirmed
  `git status --porcelain` and a `git diff` against the tracked file are both
  empty afterward.
- **Drove the relabel RED myself, with a nuance worth recording.** Using the
  actual `verify()`/`parseBlocks()` functions from
  `tools/schgen/text-metrics/verify-pastes.ts` against the live document and
  `probe-run.log` (no file perturbation needed — ran in a scratchpad script), I
  reproduced the test's exact relabelling of the first §4 block (the first
  `lepton-src` block, Scheme source text) into `` ```run STEP 4b ``. It does fail
  (`failures.length === 1`, `notOutput.length` drops by 1, matching the test's
  assertions), **but not via the "0 of the log's headers" path the sibling §1
  attack (c) test demonstrates.** `probe-run.log` already has a real section
  titled `== STEP 4b: G260 - the fallback field placements...`, so the relabelled
  block's `STEP 4b` prefix matches that real section via `startsWith`, and the
  failure is actually "is not a contiguous slice of section ... First line that is
  nowhere in the log: ...". The test only asserts `failures.length === 1` and the
  `notOutput` count, not the failure's text, so this is not a gap in what the test
  checks — it still correctly proves that a §4 block relabelled into the `run`
  namespace cannot pass, which is the property being guarded. But the choice of
  label `STEP 4b` happens to coincide with a real section rather than being a
  genuinely unmatched name, so the test exercises the "not a contiguous slice"
  failure branch rather than the "unmatched section" branch its sibling tests
  exercise. **Not a defect** — the guard has teeth either way — but noted since
  the brief specifically asked whether the RED case fails for the reason it
  implicitly claims.

## B. The `expect()` accounting

**CONFIRMED**, both the report's hand-back decomposition and the document's own
§4.12 table, against a suite run I drove myself.

- Ran `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  myself: **3789 pass / 0 fail / 43513 `expect()` across 352 files** (155.07s).
  Matches the report exactly.
- **Report's table** (43495 → 43513, +18, this round's move): verified term by
  term by reading the four new test bodies in
  `tests/schgen/text-metrics/document-pastes.test.ts`. "§4 pastes exactly the
  pinned number of blocks" = 1 `expect()`. "every one of them declares itself..."
  = 1 + 8 (the loop runs once per tag, 8 tags) = 9. "the whole-document verdict
  reports all eight as NOT CHECKED..." = 2. The relabel RED = 4 (`toBeDefined`,
  `not.toBe`, `failures.length`, `notOutput.length`). Sum of the four new cases =
  1 + 9 + 2 + 4 = 16, matching the brief's and report's "+16" exactly. The other
  +2 is the pre-existing "blocks that are NOT checked are reported by name" test
  in the §1 describe block, whose `for (const n of v.notOutput) expect(...)` loop
  gains exactly one iteration per new §4 block (6 → 8 is +2) — confirmed
  structurally from the loop's shape, since §1/§2/§3 are untouched (see below) and
  §4 is the only source of new `notOutput` entries this round.
- **Document's own §4.12 table** (43489 → 43513, +24, base-relative): this is a
  *different* reference point (from the branch base, where §4 did not exist at
  all, vs. the report's reference point of the prior round's HEAD) and is
  internally consistent with the report's +18: (+8 base-relative for all eight
  blocks) − (+6 already accounted in round 0, when there were 6 blocks) = +2 this
  round, plus the same +16 for the new cases = +18, matching. Both decompositions
  are correct; they are not in tension, they just measure from different
  baselines, and I verified the arithmetic of both against the suite figure I
  measured myself (43513).
- The correction narrative ("the first version of this table said +8 and asserted
  the four new cases contributed nothing... wrong by sixteen") is present in the
  **committed, tracked document** at `docs/schematic/text-handling-research.md`
  (grepped directly, not merely relayed from the report).

## C. The fixture commits, re-driven independently

**CONFIRMED**, by rebuilding both runs from scratch in the scratchpad using only
the committed tree's pasted fixtures plus the pinned upstream clones — not by
reading the report's claims.

- **netlistsvg.** Cloned `netlistsvg` at `d3518f1b5c996a876b72a1a984bb39d3572c47dc`
  (confirmed the clone HEAD matches). Extracted the `nsvg-fixture` block verbatim
  from the live document with `sed -n` (read-only) and ran it against the clone's
  own `test/analog/resistor_divider.json`. The upstream file's SHA-256 is
  `98d766f37a43546de5f0579d894cae88f8682bdb7887494ba399adf3c762098a` — exactly the
  hash the document states — and the script's `baseline.json` output is
  byte-identical to the upstream file (`diff` reports nothing), confirming the
  byte-comparison assertion's claim is real and would fail if the baseline arm
  were not that exact file. `npm install --legacy-peer-deps` left `built/`
  untouched (`git status --porcelain built` empty). Ran the committed `built/`
  via `node bin/netlistsvg.js` over all four generated arms with the `analog`
  skin: **SVG byte counts (3055, 3358) and all five/six node `translate()`
  transforms for every arm match the pasted log exactly**, including the 96-unit
  move (`translate(77,152)` → `translate(173,152)`, 173−77=96) in the two-column
  arms. Full independent reproduction.
- **schemdraw.** Installed `schemdraw==0.23` via pip into a scratchpad venv.
  Extracted the `sd-fixture` block verbatim with `sed -n` and ran it. **Figure
  bbox (`0.000..1.200`/`-1.450..0.739` control, `-1.494..2.694` collide), SVG byte
  counts (1115, 1178), both text-box coordinates, and the overlap counts (0 and
  1) all match the pasted `sd-run` log** (down to a one-digit rounding
  difference in the last decimal of one coordinate, e.g. `0.841` vs. `0.842`,
  which is formatting, not a figure discrepancy). This directly answers Important
  2's criterion: the fixture, as pasted, is sufficient on its own to re-derive the
  published numbers — I did not need any information beyond what's in the
  committed tree and the pinned upstream version.
- Both fixtures are exact contiguous slices as extracted (`sed -n` between the
  opening/closing fences produced runnable code with no edits needed).

## The remaining items

- **I-1 / G268 — ADDRESSED.** Read the live `docs/known-gaps.md` entry at line
  23875. Heading names the behaviour ("PLACE WHAT IT CAN AND LOG WHAT IT COULD
  NOT"). Carries the three doors each with its specific failure (403 + 5,693-byte
  challenge page; 200 + 539-byte login redirect; DNS non-resolution). States the
  behaviour is from a search summary and explicitly not evidence. States it was
  not counted in N or M, with the reasoning. Criterion is a quotable primary
  source or a run, with three mechanisms explicitly marked untried/guesses. States
  what would move (N 6→7, 8 counting KiCad) and what would not (M stays 0).
  **CONFIRMED** G260 cross-references G268 by name (lines 1670-1671) rather than
  being its only home, and §4.7 points at G268 (lines 3132, 3140). **CONFIRMED**
  the lead is still excluded from every count: §4.9's conclusion still reads "Of
  the SIX tools examined, ZERO refuse..." and the report's round-1 status line
  states "N = 6, M = 0 is unchanged."
- **M-1 — ADDRESSED, CONFIRMED independently.** Installed schemdraw 0.23 myself
  (pip) and checked the live `segments.py`: `class SegmentText` begins at line
  250, and its `get_bbox` method is at line 351. Matches the document's corrected
  citation exactly.
- **M-2 — ADDRESSED, CONFIRMED independently.** Cloned xschem at the pinned
  commit `36e0eab33b0c7e02e6f99c54b0a39d42231039fb` and re-ran the grep over
  `src/*.c`/`*.h`: excluding the `warning_overlapped_symbols` family, the only
  other hits are `src/actions.c:36-37`, a comment about hash-function collision
  resistance — exactly as the document now states. Also confirmed, from the
  installed schemdraw package, that `elements/twoterm.py:842` carries the "Arrow
  coords overlap a bit..." comment the document now attributes there.
- **M-3 — ADDRESSED, CONFIRMED independently.** In the pinned lepton-eda clone's
  `scheme/conf/schematic/deprecated.scm` (hash verified to match §4.0's table:
  `5e83760e...`), lines 85-86 show `(add-hook! add-pin-hook (lambda (pin)
  (autoplace-pin-attributes pin )) #t)` live/uncommented, while the matching
  `rotate-pin-hook` and `mirror-pin-hook` registrations (lines 87-90) are
  commented out — confirming "the only one of the three `*-pin-hook`
  registrations left uncommented" exactly, and that this is a second, independent
  autoplaced text class alongside `netname`.
- **M-4 — ADDRESSED, CONFIRMED independently.** In the same xschem clone,
  `src/psprint.c:1185` carries `/* if(xscale*FONTWIDTH* xctx->mooz<1) continue; */`
  — byte-for-byte identical to `src/svgdraw.c:881` — and the file's SHA-256
  (`fe878c711ad0163c836ef74b978446ad6241decfa10eac55570b5e9132a481f7`) matches the
  document's §4.0 table exactly.
- **M-5 — ADDRESSED, CONFIRMED.** §4.8's table renders as exactly 5 rows (counted
  directly from the live document). The canvas-growing paragraph is prose below
  the table, not a sixth cell/row. Grepped for any other recurrence of a sixth row
  anywhere in §4 — found none; the "grow the canvas" and "white rect occlusion"
  behaviours are both recorded as explicit non-rows in prose, never added to the
  table.
- **M-6 — ADDRESSED, CONFIRMED.** `[RELAYED]` appears at exactly the three places
  §4 carries §3's KiCad figure (the opening paragraph, the §4.8 "adjust the
  surrounding geometry" row, and §4.9's "zero of seven" line), plus the grade-table
  definition row that defines the mark and names the OrCAD-reviewer-relay as its
  fourth, separate use. No stray or missing marks found.
- **M-7 — ADDRESSED, CONFIRMED.** `docs/schematic/text-placement-prior-art.md`
  carries a pointer block (`POINTER, ADDED 2026-10-22...`) at the head of its
  *Other EDA tools* subsection, and the diff against the branch base shows 20
  insertions / **0 deletions** for that file — the original paragraph is
  untouched beneath the pointer.

## §1, §2, §3 untouched

**CONFIRMED independently, not from the report's claim.** Ran
`git diff -U0 4fe4b41 -- docs/schematic/text-handling-research.md docs/known-gaps.md docs/schematic/text-placement-prior-art.md tests/schgen/text-metrics/document-pastes.test.ts | grep -c '^-[^-]'`
→ **0**. `git diff --stat 4fe4b41 HEAD` on those four files →
1232 insertions(+), **0 deletions** total. The research document's diff against
the branch base is a single hunk starting at line 2367 (`for it to be worth
anything.`, the tail of §3), i.e. everything added lands after §3 ends and before
or inside §4 — confirmed from the actual diff output, not the report's narrative.

## Suite, typecheck, dependencies, attribution

- **Suite** (driven myself): `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
  → **3789 pass / 0 fail / 43513 `expect()` across 352 files** (155.07s).
- **Typecheck** (driven myself): `bun run typecheck` → clean, `tsc --noEmit`, no
  output.
- **No dependency added**: `git diff 4fe4b41 HEAD -- package.json bun.lock
  bun.lockb` is empty; no vendored `netlistsvg`/`schemdraw` directories found
  under `lib/` or `tools/`.
- **No AI attribution**: `git log -1 a27d3ed` shows a clean commit message with no
  `Co-Authored-By`, no `Claude-Session:`, no "Generated with" footer, no session
  link.
- **Working trees**: `git status --porcelain` empty in this repository and in the
  read-only sibling `/Users/orion/work/pedals-work/digital-pedal-platform`.

## On the ruled-allowed test-file edit

Per the controller's ruling (relayed in my brief), the edit to
`tests/schgen/text-metrics/document-pastes.test.ts` is allowed and is not
re-raised as a finding here. My only addition is the item-A nuance above (the RED
case's failure path), which does not call that ruling into question — the guard
fails when it should, for a real (if not the most illustrative) reason.
