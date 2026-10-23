Task 1 re-review: fix round 1, scoped to `fcc104e..698e03c`
=============================================================

Re-reviewed at `698e03c`, worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`,
branch `feature/schematics-tooling`. Diff `fcc104e..698e03c`, 8 commits, 9 files
(`docs/known-gaps.md`, `docs/schematic/README.md`, `docs/schematic/text-handling-research.md`,
`tools/schgen/text-metrics/{geometry,metrics,probe,step4,svg-probe}.ts`,
`tools/schgen/text-metrics/verify-pastes.py` new). Both repositories were
`git status --porcelain` empty before this review and are empty after it. Nothing
was committed and nothing in either tree was modified.

The five findings
------------------

| Finding | Verdict | Evidence (a drive I ran, or a file:line I opened) |
| --- | --- | --- |
| **I-1** dead `svgTextLengths`, fourth reading never wired in | **ADDRESSED** | Ran the probe fresh (clean tree, HEAD): `run.log:135-161` prints `STEP 2 ROUTE 3c`, a constant residual `203.2 um`, worst departure `0.4 um` on `"IIIIIIIIII"`, and the discriminating control (`length*GRID` departs `5986.8 um`, 14819x wider). `probe.ts:33` now imports `measureRows`'s `declaredAdvances` and consumes it; grep confirms `svgTextLengths` is called from `svg-probe.ts`'s own `measureSheet`. I also re-derived this over **my own, different sample** of 9 strings and got median residual `203.1 um`, worst departure `0.1 um` from it — independently corroborating the constant. |
| **M-2** pen contribution to 2043.1 um unquantified | **ADDRESSED** | `run.log:449-450`: `773.1 um excess ... 2 x KiROUND(1.5 x pen) = 476.3 um (61.6%) ... KiROUND(0.17 x extents.y) = 296.9 um (38.4%)` and `COUNTERFACTUAL ... GetTextBox would return 2020.8 um ... pen disagreement accounts for 22.3 um, 2.9%`. Matches `docs/known-gaps.md:2011` and `docs/schematic/text-handling-research.md` §1.4 verbatim. |
| **M-3** `3333.75 um` never driven | **ADDRESSED** | Hand re-derived the source formula myself at nanometre resolution (`margin=476250`, `halfSize=1111250`, `linewidth=158750`, constant `= 2×476250+158750+3+2×1,111,250 = 3,333,753 nm → 3333.8 um`), matching `geometry.ts:124-136`'s nanometre rewrite and `run.log:170`'s printed `3333.8 um`. The PDF side (`3334.3 to 3334.5 um`) is from my own fresh run of the probe (`run.log:170`), which itself re-exports PDF and reads vector coordinates — not a cached figure. The improvement claim has both ends: the pre-fix value `3333.003` is in the diff's own comment (`geometry.ts` new comment, and the commit message of `a36e0b2`) and the pre-fix worst-disagreement of `1.5 um` is the diff's own prior published figure (`15287.6` old vs `15288.4` new predicted-along for `BYPASS_CAP`, against the unchanged PDF measurement `15289.1`: old gap 1.5, new gap `0.8`, both arithmetically checked against the PDF numbers in the diff). |
| **M-4** jumper ratio compared width to height | **ADDRESSED** | `run.log:286,459-462`: `"Jumper_2_Open" 16510.0/14695.7/14364.3/14918.0 um = 3.25/2.89/2.83/2.94x WIDTH, 7.22/6.43/6.28/6.53x HEIGHT` — exact match to the document's and `docs/known-gaps.md:1554-1570`'s table, reproduced from a fresh run. |
| **M-6** sentinel printed as a result; ordering asserted but not driven | **ADDRESSED** | `run.log:96-97`: `0 of 264 strings differ ... worst disagreement 0.000000 um, on "+5V" - which is simply the first row, since nothing differs` and `40 of 264 ... worst disagreement 0.001524 um ... floating-point residue, not a difference in geometry`. `run.log:455`: `ORDERING ink < advance < box: 0 violation(s) over 264 strings`. The sentinel's old misleading `""`/`"TestPoint"` wording is gone from `probe.ts`. |

All five: **ADDRESSED**, confirmed by driving the fixed probe myself rather than reading the diff's own pasted numbers.

The four named attacks
-----------------------

### 1. The paste-fidelity checker — attacked this way, **it does NOT hold**

Drove it green on the real document with my own fresh `run.log` (`17 fenced block(s), 14 of them probe output, 100 line(s) checked; every pasted line is in the log`, exit 0). Reproduced both of the implementer's claimed red drives against copies in my scratch directory, not the original:

- **one changed digit** (`203.2`→`203.3` in the I-1 block): exit 1, `NOT IN THE LOG`, correctly caught.
- **a single row's padding tightened**, matching the shape of the original defect (`tp-leg-emitter-bypass` row, a few spaces removed): exit 1, correctly caught.

Then I constructed two attacks of my own that **defeat it**, both driven to a passing exit 0 against an unambiguously wrong document:

- **Genuine-line swap.** In the SVG-rows block (§1.5), I replaced the `"R100 right rot0"` row's line with the **verbatim text of the `"R100 center rot0"` row** — a real line from elsewhere in the same log, pasted into the wrong place so the document now states the wrong ink extents for the right-justified case. `verify-pastes.py` against my own `run.log`: **exit 0**, `every pasted line is in the log`. The checker is a flat set-membership test over the whole log (`log = set(line.rstrip() for line in open(...))`), so it cannot tell that a line belongs to the *wrong* row — only that the text exists *somewhere* in the run.
- **Majority fabrication below the 50% gate.** In the ERROR TABLE summary block (§1.7, 6 lines), I kept 2 of 6 lines verbatim and fabricated the other 4 with invented numbers (`9999.9 um on "nothing real"`, etc.). `verify-pastes.py`: **exit 0**, and its own diagnostic line shows the block dropped out of the output count (`13 of them probe output` instead of `14`) — the block was silently excluded from checking at all, so the four fabricated lines were never even examined.

Both are driven (exit codes observed), not reasoned. The checker reliably catches *minor* edits to an otherwise-intact block (truncation, a dropped parenthetical, a light re-pad, a single wrong digit) — which is what it was built to catch and what the seven real defects looked like. It does **not** catch a line swapped in from elsewhere in the same log, and it does not catch a block that has been mostly rewritten, because rewriting more than half a block's lines removes it from verification entirely rather than failing it. This is a real gap in machinery whose whole point is evidentiary trust, not a cosmetic nit — see New breakage, below.

### 2. "The fourth reading agrees" — attacked this way, **it holds**

Re-derived the 203.2 um constant over **my own sample** (8 strings disjoint from the probe's own six-plus-stride-sample, including `"REVIEWER"`, `"ONE_TWO_THREE_FOUR"`, `"0.1uF"`): median residual `203.1 um`, worst departure from it `0.1 um` — consistent with the reported `203.2 um`/`0.4 um`.

Then corrupted one glyph (`'e'`, +0.3 em ≈ +381 um) in a copy of the loaded glyph table and recomputed the same residual check against the **same, unmodified** SVG `textLength` values. Only the one string in my sample containing a lowercase `e` (`"parked"`) moved — from `203.1 um` to `-177.9 um`, a shift of exactly `381.0 um`, matching the corruption exactly — while every string without an `e` stayed at `203.1/203.2`. The worst-departure-from-median figure jumped from `0.1 um` (clean) to `381.0 um` (corrupted). The check notices a single wrong glyph precisely as advertised: it turns a constant into a two-valued spread rather than shifting everything equally, which is exactly the blind spot the document itself names and says the check does not share (a uniform arithmetic error would be invisible to it; a per-glyph error is not).

### 3. M-3's new number — attacked this way, **it holds**

Re-derived `3333.8 um` from the cited source rounding myself (shown above, hand arithmetic from `LABEL_SIZE_RATIO = 0.375`, `TEXT_SIZE = 1270 um`, nanometre `KiROUND`), landing on `3,333,753 nm`, which rounds to `3333.8 um` at one decimal exactly as printed. Re-derived `3334.3`–`3334.5` from a PDF export I ran myself (the full probe run, which re-exports the 5-label PDF and reads its own vector coordinates fresh — `run.log:164-170`). The improvement claim's two ends are both checkable from material already in the diff: the pre-fix `3333.003`/`1.5 um` figures are the diff's own prior text (`a36e0b2`'s commit message and the before/after hunks in `docs/known-gaps.md` and the research doc), and the post-fix `3333.8`/`0.8 um` figures are from my fresh run — not merely restated.

### 4. "No survivor count moved" — attacked this way, **it holds**

Ran the probe end to end fresh. Headline table reproduced exactly:

```
TOTAL                                      15         13         20         24
  glyph advance sum              survived 13 of 15; vanished 2; NEW under this quantity 0
  rendered ink                   survived 14 of 15; vanished 1; NEW under this quantity 6
  EDA_TEXT::GetTextBox           survived 15 of 15; vanished 0; NEW under this quantity 9

SURVIVORS: drawn-text overlaps
  glyph advance sum              survived 4; vanished 4; NEW under this quantity 0
  rendered ink                   survived 4; vanished 4; NEW under this quantity 5
  EDA_TEXT::GetTextBox           survived 4; vanished 4; NEW under this quantity 5
```

Identical to the figures published before this fix round and after it. `boxPenWidth` (M-2's commit) and the nanometre rewrite of `labelOutlineExtent` (M-3's commit) both touch probe arithmetic, and neither moved a single cell of this table in my fresh run.

New breakage in the fix diff only
----------------------------------

1. **PLAUSIBLE→CONFIRMED (Important). `verify-pastes.py`'s half-threshold rule lets wrong or fabricated content through two ways**, both driven to a passing exit code against a document I made unambiguously wrong: (a) a genuine line from elsewhere in the log substituted for the correct line at a different position (content-correctness is never checked, only set membership against the *whole* log); (b) a block with more than half its lines fabricated drops below the 50% gate and is **silently excluded from checking at all** — the tool's own output line (`N of them probe output`) is the only trace that this happened, and nothing reading just the exit code would notice. This is new machinery introduced in this fix round (`fff714c`) whose entire purpose is evidentiary trust in the document, and the round's own commit message and report describe it as "driven RED twice against perturbed copies" without noting either gap. The two confirmed red drives (one digit, one single-row re-pad) are real and the checker does catch what it was built from — the seven actual defects were all minority, single-line edits to otherwise-intact blocks — but the half-threshold design admits majority-rewrite and line-swap attacks the task's own framing (M-6 is "an instance of a shape") would call exactly the shape worth generalizing against.
   **Severity judgment:** this does not reopen M-6 (which is about a sentinel and an ordering, both independently reproduced above and unaffected by this) or any of the other four findings — none of their fixes depend on `verify-pastes.py`'s content-correctness, only on re-running the probe, which I did directly. It is a gap in a NEW verification tool this round introduces, not a regression in a previously-passing check, and no number in the document is disputed by it. I rank it Important rather than Critical because nothing it would have missed is currently false in the document — I verified every pasted figure myself against a fresh run and found no actual tidying defect remaining — but the tool's advertised guarantee ("the document is held to the run") is narrower than its prose claims.
2. **CONFIRMED, Minor. `boxPenWidth`'s doc comment plus `kicadTextBoxExtentAtPen`'s doc comment both say "nothing else calls it with anything but `boxPenWidth`"** (`metrics.ts:143`) — true today (grep confirms the only two call sites are `kicadTextBoxExtent` and `probe.ts`'s one counterfactual line), but it is an invariant stated in prose with no test enforcing it, so a future caller passing an arbitrary pen would silently violate the comment rather than be refused. Not a defect in this diff; recorded because the task asked me to confirm nothing else consumed the wrong `boxPenWidth` value, and the honest answer is "confirmed by grep, not by a guard."

Nothing else in the diff looks like new breakage. The `metrics.ts` `Extent.inflate`/`Extent.fudge` optional fields are consumed only where expected (`probe.ts`'s height-decomposition lines); `step4.ts`'s added `value` field on `SlotRow` is populated and consumed consistently in `probe.ts`'s G239 print loop; `svg-probe.ts`'s `decodeXml` throws on an unknown entity rather than guessing, consistent with house style.

PARK (out of scope — did not extend the loop)
-----------------------------------------------

- The unused-exports Minor (M-5) from the original review is not in this round's five findings and was not re-attacked; `inkExtent` and the `labelExtent` re-export are still present (grep). Out of scope for this re-review.
- `verify-pastes.py` is Python, invoked manually, not wired into `make check` — stated as such in its own docstring and in the document; this is a disclosed limitation, not a finding, and the brief for this round did not ask for it to be wired in.
- The anchor-to-pen-origin (`111.1` vs `100.3` um) and PDF-outline (`0.8` um, down from `1.5`) residuals remain undiagnosed, as the document says. Not new to this round.
- `verify-pastes.py`'s threshold design (the specific finding above) could be tightened (e.g., per-block instead of whole-log membership, or scoping the log search to lines near the block's position) — that is a mechanism suggestion, not something this re-review is authorized to implement or require; recording it as a MECHANISM, UNTRIED for whoever picks this up.

What I drove versus what I read
--------------------------------

**Drove:**
1. `bun run typecheck` — exit 0.
2. `bun test` with `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen` set — **3758 pass / 0 fail, 43379 expect() calls, 350 files, 150.40s**.
3. `bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp` at `698e03c` with a clean tree, pinned font blob (SHA-256 verified `dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9`) — exit 0, 619 lines, every headline figure for all five findings reproduced exactly (quoted above).
4. `python3 tools/schgen/text-metrics/verify-pastes.py` against my own fresh `run.log` and the real document — exit 0, green.
5. Two reproductions of the implementer's claimed red drives (one changed digit; one single-row re-pad matching the original defect's shape) — both exit 1, correctly caught.
6. Two original attacks of my own against `verify-pastes.py` (genuine-line swap; majority-fabrication-below-threshold) — both exit 0 against documents I know to be wrong. This is the new-breakage finding above.
7. An independent TypeScript script (own sample of 8 strings, disjoint from the probe's own set) re-deriving the 203.2 um residual via the repository's own `loadGlyphs`/`advanceWidth`/`measureRows` (reused rather than reimplemented from scratch, given the prior full review's independent Python reimplementation already validated route 1 to 0.0 nm against the compiled `pcbnew` binary over 264 strings) — median `203.1 um`, worst departure `0.1 um`.
8. The same script with one glyph (`'e'`) corrupted by +0.3 em against the same, unmodified SVG data — worst departure jumped to `381.0 um`, isolated to the one string containing that glyph, confirming the check discriminates.
9. Hand arithmetic (not code) re-deriving `labelOutlineExtent`'s fixed-part constant at nanometre resolution from the stated source constants (`LABEL_SIZE_RATIO=0.375`, `TEXT_SIZE=1270 um`) — `3,333,753 nm → 3333.8 um`, matching the diff.
10. `git status --porcelain` on both repositories, before and after this review — empty both times.
11. Commit metadata: `git show -s --format='author:%an <%ae> committer:%cn <%ce>'` and `git show -s --format='%(trailers)'` plus a grep for `co-authored|claude|anthropic|generated with|session_|noreply@anthropic|sonnet|opus` over all 9 commit messages from `fcc104e` through `698e03c` — all `oletizi <oletizi@mac.com>`, zero trailers, zero hits.
12. `git diff --name-only fcc104e..698e03c` — confirmed the only files touched are the three docs and the six files under `tools/schgen/text-metrics/`; nothing in `lib/`, `circuits/`, or `port-manifest.json` this round.

**Read (not independently re-driven):**
- The brief, the full implementer report (both the original task and this fix round's section), and the full prior review, in full.
- The complete `fcc104e..698e03c` diff, in full (all 9 files).
- `docs/known-gaps.md`'s G239/G260/G265 amendments and `docs/schematic/text-handling-research.md`, in full, for consistency against the driven figures above.

Suite numbers observed
-----------------------

| | observed here | reported |
| --- | --- | --- |
| `bun run typecheck` | exit 0 | (not separately reported this round) |
| `bun test`, `SCHGEN_SOURCE` set | **3758 pass / 0 fail**, 43379 expects, 350 files, 150.40 s | 3758 / 0 / 350, unchanged |
| probe end to end | exit 0, 619 lines, every headline figure reproduced (I-1 through M-6) | one run, figures as published |
| `verify-pastes.py` vs my own run.log, real document | exit 0, 17 blocks / 14 output / 100 lines checked, all present | green |
| both repositories | `git status --porcelain` empty before and after | empty |
