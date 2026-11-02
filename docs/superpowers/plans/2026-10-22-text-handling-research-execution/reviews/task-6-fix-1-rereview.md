# Task 6 fix round 1 — re-review

Scope: the nine named items in `task-6-fix-1.md` (one Critical, three Important,
five Minor), the re-measured figures, and the two new controls (P6, P7). I did
not re-review the whole task. All checks below were re-driven by me on the
worktree at `5ca6f2d` unless marked RELAYED.

## A. The re-measured figures, and the two falsifications

**CONFIRMED, independently re-derived.**

- Ran `bun run tools/schgen/field-order/probe.ts` fresh and diffed its stdout
  against the committed `tools/schgen/field-order/probe-run.log`: **byte-for-byte
  identical.**
- Independently confirmed §5's committed population figure: `grep -n "blocks
  with grid-legal geometry" docs/schematic/text-handling-research.md` returns
  **48** at both the §5 citation (line 3799) and the §6.5 "THE CORPUS" block
  (line 4623) — the two sections agree by the control, not by assertion.
- Re-derived the headline split directly from the log: `202 / 53` first-fit/cost,
  `53 / 51 / 54` production/best/worst fallbacks, `255` unit placements, `48`
  blocks, `36` driven exhaustively — all match the report and the document
  verbatim.
- **Falsification 1** (*"no arm is worse by count"*): confirmed false at the
  wider corpus — the committed log shows `transistor-preamp/tp-stage: ...
  production 4 fallback(s), min 3 max 5`, so worst (5, contributing to the
  summed 54) exceeds production (4). The round-0 sentence survives **only** as
  a quoted, explicitly-labelled "round 0 wrote" artifact in both §6.5 (line
  4745) and G272 (line 24474) — grepping for it as a live, unqualified claim
  anywhere in the document or the register returns nothing. **Superseded in
  place, not hedged.**
- **Falsification 2** (the single text-over-text overlap): confirmed via the
  probe's own `WHAT THE PRODUCTION ORDER'S FALLBACKS ARE DRAWN OVER` block —
  **4** fallbacks cover text (`TP1#1`, `RV_LO_CUT#1`, two `C2#1`s), and cross-
  checking against the per-block STATUS MOVERS lines, only `TP1#1` is a status
  mover. One of four is reachable by reordering; three are not. The old
  "exactly one, and it's an artefact of the walk" framing does not appear
  anywhere as a live claim — grepped for and found absent; only the corrected,
  explicitly-labelled "Round 0 said there was exactly one..." framing remains
  (§6.5 line 4763, G272 line 24482). **Superseded in place.**

Both falsifications are real, correctly measured, and correctly superseded
rather than merely annotated.

## B. The limitation that inverts the headline

**CONFIRMED, independently re-derived from the raw log, not relayed.**

I wrote a small script over the committed `probe-run.log` summing fallback
counts grouped by EXHAUSTIVE/BOUNDED label:

```
EXHAUSTIVE blocks: 36  fallback sum: 0
BOUNDED blocks: 12  fallback sum: 53
```

This exactly matches the claim: all 36 exhaustively-driven blocks (≤7 units)
have zero fallbacks: their order-invariance is proven and uninformative. All 53
fallbacks live on the 12 blocks the probe could only sample (≥8 units) — the
order-wise best is therefore exact where nothing moves and an upper bound
everywhere it matters.

All three required statements of this limitation exist and were located
directly:
- §6.5, line 4750: *"ALL 53 FALLBACKS ARE ON THE 12 BLOCKS THE PROBE COULD NOT
  EXHAUST, AND THE 36..."*
- §6.10, line 4995: *"...driven over every order and **all 36 have zero
  fallbacks**..."*
- G272, line 24490: *"...and **all 36 have zero fallbacks**..."*

This is the strongest thing in the round and it holds exactly as reported.

## C. The new controls — do they discriminate?

**P6 (CONTROL, CORPUS) — discriminates. Driven red myself.** I edited
`measure()` in `tools/schgen/field-order/probe.ts` to slice `laid` down to its
first 10 entries (simulating round 0's narrower population), ran the probe, and
got `P6 grid-legal block count against section 5's committed 48: measured 10`
/ `P6 REFUTED`. Restored the file via Edit and confirmed `git status
--porcelain` clean before and after.

**P7 (CONTROL, NO SILENT TRUNCATION) — discriminates. Driven red myself.** I
flipped the `exhaustive: false` literal in the truncated (`BOUNDED`) branch of
`orderSetFor` to `exhaustive: true`, which mislabels every BOUNDED block as
EXHAUSTIVE — the exact silent-truncation shape the control exists to catch. Got
`P7 ... 12 violation(s)` / `P7 REFUTED` (one violation per BOUNDED block).
Restored and confirmed clean.

**mulberry32 vs the LCG — confirmed.** Extracted the generator and computed
the first draw for seeds 1..30: **30 distinct values** (range ≈0.012–0.92),
unlike the old LCG's reported ≈0.236–0.248 clustering. The fix is real.

**Enumeration/dedup scheme — confirmed against the log.** `n! ≤ 5040` blocks
are labelled EXHAUSTIVE with counts matching their factorial exactly (e.g.
`transistor-preamp-buffered/tp-follower: 6 unit(s), EXHAUSTIVE 720 of 720
order(s)` — 6! = 720). Larger blocks show `BOUNDED 200 of <n!>` consistently.
No block showed an empty or truncated-without-saying-so order set.

**UNCLASSIFIED bucket — discriminates. Driven red myself.** Temporarily
removed the `/^label /` pattern from `TEXT_COVERS` in the probe; re-ran; the
three `label ...`-covering fallbacks that previously matched it (`TP1#1`,
both `C2#1`s) printed as `UNCLASSIFIED` with `cover strings this probe's
whitelist does not recognise: 3`. Restored and confirmed clean. The
UNCLASSIFIED: 0 reported in the committed log is a check that could have
failed and did not.

All controls and the generator/enumeration claims hold.

## D. The replaced tautology — driven red three ways

**CONFIRMED.** Baseline run of the targeted test (`section 6's source
transcriptions are declared, counted, and in no log's namespace`) was green (1
pass). I then drove it red three ways, restoring the document byte-for-byte
after each (confirmed via `git status --porcelain` clean after every restore):

1. **Relabel into a checked namespace** — changed the `p.1119 SUMMARY` block's
   fence word from `kp-src` to `field-order-run`. Failed on the tally
   comparison: `"field-order-run": 8` vs expected `7`, `"kp-src": 6` vs expected
   `7`.
2. **Delete a block** — removed the entire `p.1129 THE COST FUNCTION` block.
   Failed on the tally: `"kp-src": 6` vs expected `7`.
3. **Remove a cited page from the pages-read list** — changed `"...1150 and
   1162 were opened..."` to `"...1150 and 1163 were opened..."` (dropping 1162
   while the `p.1162 WHEN NOTHING FITS` block still cites it). Failed on
   `expect(pagesRead).toContain(...)`: `Expected to contain: "1162", Received:
   "1119, 1121, 1127, 1129, 1149, 1150\nand 1163"`.

All three drives produced real, specific failures (not crashes unrelated to the
assertion under test). The tautology replacement has teeth.

## The remaining items

- **Important 2 (stale grep control).** **CONFIRMED**, re-driven at HEAD
  myself: `git grep -i "first.fit" -- lib/` → 0 hits; `-- tools/schgen/` → 2
  hits (the probe and its log, via P2's prediction text); `-- lib/ tools/
  tests/` → 13 total (2 + 11 stripboard hits). All three figures match exactly.
- **Important 3 (mis-citation).** **CONFIRMED against the rendered page image,
  not the OCR text layer.** Rendered PDF pages 32 (journal p.1150) and 44
  (journal p.1162) at 300dpi from the pinned PDF (hash verified to match
  `ecc2354c...` exactly — the implementer's own scratchpad copy of the PDF was
  available and its SHA-256 matched the pin). p.1150's image shows, verbatim:
  *"the active list is forcibly prevented from becoming empty by simply
  declaring a breakpoint to be feasible if it would otherwise leave the active
  list empty. This results in an overset line and an error message that
  encourages the user to take corrective action."* p.1162's image shows,
  verbatim: *"The net result is to produce an 'overfull box' that sticks out
  into the right margin... some kind of error indication is necessary."* Both
  match the document's quotations exactly, on the pages now claimed. The new
  assertion (`expect(pagesRead).toContain(...)`) was driven red in D above (way
  3), confirming it can fail.
- **M-1 (absolute-value bars + method claim).** **CONFIRMED against the page
  image.** Rendered p.1127 and verified: *"a formula that is nearly zero when
  |r_j| is small but grows rapidly when |r_j| takes values exceeding 1"* and
  *"values of r_j > 1 are only finitely bad, so they will be permitted if
  there is no better alternative"* — both match the document's restored
  quotations (bars present, "so they" not "so it") exactly.
- **M-2 (in-repo prose quotation).** **CONFIRMED.** Source
  (`text-placement-prior-art.md` line 804): *"A scored, weighted,
  preference-ordered text placer with a least-cost fallback"*. Document now
  quotes: *"[a] scored, weighted, preference-ordered text placer with a
  least-cost fallback"* — exact, with the capitalization change bracketed.
- **M-3 (tautology).** Covered under D above. CONFIRMED.
- **M-4 (P1 restated).** **CONFIRMED.** Both the probe source and the document
  now state P1 as "(CONTROL, DETERMINISM - NOT FIDELITY)" and explain it tests
  that `placeFields` is pure and the probe is stateless, not that it reaches
  the shipped path.
- **M-5 ("total-fit" removed).** **CONFIRMED.** `grep -in "total.fit"` over
  `tools/schgen/field-order/probe.ts` and `probe-run.log` returns nothing.

## Also verified

- **§1–§5 untouched.** **CONFIRMED.** `diff` of the first 4209 lines of
  `docs/schematic/text-handling-research.md` between `40e1cb2` and `5ca6f2d`:
  identical.
- **§5's slice behaviour undisturbed.** **CONFIRMED.** Ran the targeted §5
  test group (`bun test ... -t "section 5"`): 7 pass, 0 fail. `SECTION_5_BLOCKS
  = 13` and the slice still counts `label-run` fences specifically (confirmed
  by reading the test file), unaffected by §6's `field-order-run` fences.
- **`expect()` accounting.** **CONFIRMED, reconciled term by term.** Diffing
  the test file: 2 stale literals removed / 3 live literals added in the
  predictions-ordering case (net +1), one 7-iteration tautological loop
  (7 runtime `expect()` calls) replaced by one 7-iteration pages-read loop
  (also 7 runtime calls — net 0), plus one new single `expect(tally).toEqual()`
  call (+1). Total: +2, matching the reported 43592 → 43594. No `test(` or
  `describe(` block added or removed. No existing assertion was loosened — the
  removed tautological loop asserted a non-namespace-membership (always true);
  its replacement asserts exact page containment (can fail, and was driven red
  above).
- **Nothing fixed.** `git diff 40e1cb2 5ca6f2d --stat` touches only
  `docs/known-gaps.md`, `docs/schematic/text-handling-research.md`,
  `tests/schgen/text-metrics/document-pastes.test.ts`,
  `tools/schgen/field-order/probe-run.log`, `tools/schgen/field-order/probe.ts`
  — no `lib/`, `circuits/`, `boards/`, or `Makefile` changes.
- **Infinite/finite badness split still named as owner's, not declared.**
  **CONFIRMED** — §6.11 item 2 unchanged from round 0: *"UNTRIED, and the split
  itself is an acceptance criterion... so it is the owner's and not a mechanism
  an agent may choose."*
- **Register entry dates.** G272's Found line: *"2026-10-22, Task 6, at a
  ten-block corpus. **Re-measured 2026-10-23**, Task 6 fix round 1..."* —
  correct. G273's Found line reads 2026-10-23, but that is its original
  (round-0) entry, whose commit (`40e1cb2`) actually landed at 2026-10-23
  00:06 local time — not a round-1 artifact and not an error. The G260
  amendment's round-1 correction is inline-marked *"(Round 1 correction: ...)"*
  rather than a separately dated new entry, which is appropriate since it
  amends existing text in place.
- **Suite.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen
  bun test` → **3809 pass / 0 fail / 43594 `expect()` across 353 files**
  (152.17s). Matches the report exactly.
- **typecheck.** `bun run typecheck` → clean (`tsc --noEmit`, no output).
- **`make check`.** Red, exit 2, exactly 4 `FAIL` lines
  (`pt2399-core`, `transistor-preamp-lab`, `-loop`, `-staged`) — matches
  G251's four boards. Pre-existing, not this round's.
- **No AI attribution** in commit `5ca6f2d` (checked the full message).
- **No dependency added** — `git diff 40e1cb2 5ca6f2d` touches no
  `package.json`/lockfile.
- **`tools/schgen/field-order/probe.ts` declared in `port-manifest.json`**
  under `"handWritten"` (confirmed by direct grep). No new file was added this
  round that would need a new manifest entry.
- **Tree clean.** `git status --porcelain` empty at the end of this review,
  after every perturbation used to drive the controls above was restored and
  independently re-verified clean.

## New findings

None. Every driven control behaved as claimed, every re-derived figure
matched, both falsifications are genuinely superseded, and the limitation in
B holds exactly as described.

## Verdict

**ALL ADDRESSED.**
