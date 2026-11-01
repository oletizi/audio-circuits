Task 6 review: the drawing-a-schematic skill
==============================================

Scope: `.claude/skills/drawing-a-schematic/SKILL.md` (new) and `README.md`
(one row added to the governing-documents table), commit `53b7a7e` on
`feature/schematics-tooling`.

Verdicts
--------

**Spec compliance: PASS.** Every required element of the brief is present
and accurately stated: the loop and the repair-skips-draft rule; `make
draught-doctor` then `make draw` (from the board's own directory, or `make
-C boards/<board> draw`); the trap index; the false greens; the verification
table; the renders-before-summary ordering rule with the "list render paths
at the top of the hand-back" instruction for an agent that cannot send
files; and a pointer to `EVALUATING-DRAWINGS.md` for the criteria that the
skill states explicitly it does not restate. Step 2 (check against
`TOOLING.md`) was done and produced four contradictions, all four verified
below. Step 3 (README table) is correct. Step 4 (commit) is a single,
cleanly-scoped commit with no AI attribution.

**Code quality (as a document, not as software): PASS, no findings above
Minor.** The skill maintains a clean separation between "this is the
procedure" (restated/summarised from `TOOLING.md`, which is allowed) and
"this is the criteria" (never restated, always pointed at). Every factual
claim about the tooling that I checked against the code or the Makefile
matched exactly. I did not find a smuggled criterion.

Findings
--------

No Critical or Important findings.

- **Minor.** "Never withhold a drawing for a layout reason" is its own
  `##` section that substantially overlaps content already stated under
  "Running the mechanics" item 3. This is deliberate per the skill's own
  text ("this is the same rule, stated here because `make draw`'s own
  behavior is where it is easiest to verify") and is traceable to a real
  owner quote (`docs/known-gaps.md:4120` / `docs/research/2026-10-30-no-layout-withholding.md:8`,
  verified verbatim), so it is not a defect, just a structural redundancy
  worth noting.
- **Minor.** The skill does not mention the S-series style preferences at
  all, even in passing (e.g. "style preferences exist and are followed,
  never enforced — see `EVALUATING-DRAWINGS.md`"). The brief does not
  require this and the skill is correct to avoid restating anything from
  that document, but an agent who has only read this skill (not
  `EVALUATING-DRAWINGS.md`) would not know style preferences exist as a
  distinct, non-enforced category until opening the canonical document —
  which the skill does tell it to do. Not a compliance failure, just the
  closest thing to a gap I found.

Smuggled-criterion search
--------------------------

Grepped the skill for the forbidden vocabulary
(`better|best|worse|worst|good|bad|clean|readable|legible|clear|tidy|wins|ugly`,
case-insensitive) and for softer hedge-criterion phrasing (`aim for`,
`ideally`, `try to keep`, `preferable`, `should be/look/read`, `optimal`,
`cleaner`, `simpler`, `neater`, `more legible`, `easier to read/trace`,
`hard to trace`, `noise`, `crowd`, `excessive`, `messy`, `confusing`,
`simpl*`, `elegant`, `intuitive`, `pretty`, `sloppy`): zero hits on the
forbidden list (confirms the implementer's own grep); the only incidental
hit on the softer pass was "copperhead's **pretty**-printed block form" (a
technical term for a text-serialisation style, not a verdict about a
drawing) and "symbol count, pin count | **should be** unchanged by a
repair" (an invariant check on a measurement, not a legibility judgement —
it says a repair must not add or remove parts, nothing about what makes a
page worth reading). Neither is a smuggled criterion.

The one place I scrutinised hardest — "Driving a measurable cost
(crossings, corners, hairpins, wire length, label count) down is work to
automate, not hand back" — is lifted near-verbatim from `TOOLING.md:295`
("Driving a measurable cost down is work to automate, not hand back"),
which is itself licensed procedure, not an authored criterion; the skill is
restating `TOOLING.md` here, which its own stated hierarchy permits, not
restating `EVALUATING-DRAWINGS.md`.

Verification against the code (ran, not reasoned)
---------------------------------------------------

- **Copperhead cannot draft to US Letter.** `draughting/copperhead/src/kicad/draft/engine.ts:219`'s
  `PAPERS` table holds exactly `A5, A4, A3, A2, A1, A0` — confirmed by
  reading the array literal. `USLetter` does not appear in that file
  (grepped). The table that does know `USLetter` is `PAPER_SIZES` in
  `draughting/copperhead/src/kicad/legibility.ts:90-102`, a different
  consumer (the legibility checker), confirmed by reading it directly. The
  skill's claim matches exactly and never implies Letter can be requested
  from the draft engine.
- **`make draw` never calls `akcli`.** Grepped `tools/cli/draw.ts`,
  `tools/draught/draw-draft.ts`, `tools/draught/draw-render.ts` for
  `akcli`: every hit is a comment stating what the verb does *not* do.
  No invocation anywhere in the three files.
- **Only `pultec-hi-cut` has a `COMMITTED_INTENT` entry.** Read
  `tools/draught/draw-draft.ts:33-35`: the map has exactly one key,
  `"pultec-hi-cut"`. Listed `drafted/pultec/`: five board directories exist
  (`pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`,
  `pultec-mid`), each with a generated `.kicad_sch`. The other four have no
  entry and the refusal path (`tools/draught/draw-draft.ts:134-144`) names
  the board and lists the known set. Matches exactly.
- **`make/perfboard.mk`**: `draught-doctor` target has no `BOARD=`
  dependency and the file's own comments state it is machine-wide; `draw`
  reads `$(CURDIR)` with no selecting variable. Matches the skill's wording.
- **Four `TOOLING.md` contradictions for Task 7, all confirmed:**
  1. Pinning self-contradiction: `TOOLING.md` lines ~116-133 state
     `draughting/install.sh` and `draughting/tools.lock.json` exist and
     that `make draught-doctor` checks against the lock; the heading at
     line 135, `### NEITHER TOOL IS PINNED IN THIS REPOSITORY...`,
     contradicts this. Confirmed on disk: both files exist
     (`draughting/install.sh`, `draughting/tools.lock.json`).
  2. Stale `docs/research/lib/kicad_sheet.py` reference: `TOOLING.md:392`
     cites that path; `docs/research/lib` does not exist
     (confirmed — `ls` fails). The current location is
     `draughting/measure/kicad_sheet.py` (confirmed present), alongside
     `junction_audit.py`, `crossings.py`, `label_survey.py`. Three
     unconverged copies of `junction_audit.py` do still exist under
     `docs/research/<run>/scripts/` (confirmed by `find`).
  3. `make draw` is never mentioned in `TOOLING.md`: `grep -n "make draw\b"
     TOOLING.md` returns nothing (confirmed, exit 1). `draught-doctor` is
     named exactly once, inside the pinning/install discussion (line 118),
     not in "The loop".
  4. US-Letter re-paper step is never mentioned in `TOOLING.md`: `grep -in
     "usletter\|repaper\|re-paper" TOOLING.md` returns nothing (confirmed,
     exit 1).
  All four are real and correctly described; none touch `TOOLING.md` itself
  (`git diff dbb7e4c..HEAD -- TOOLING.md` is empty, confirmed below).
  Task 7 inherits an accurate worklist.
- **README table placement.** The skill's row sits directly beneath
  `TOOLING.md`'s row and above `docs/schematic/verdicts.md`'s, matching the
  "read in this order, each outranks the ones below it" structure — the
  invocation sits beside the procedure it invokes, after the criteria
  documents, before the verdict record. Correct placement; description
  correctly states what it is and isn't ("It is not the criteria and does
  not restate `EVALUATING-DRAWINGS.md`").
- **Frontmatter would fire correctly.** `name: drawing-a-schematic`,
  `description` names "draw the schematic", "draft a sheet", "repair this
  page", "re-render", "fix the hairpin/label/crossing on <board>", and
  generally "any task that will produce or change a .kicad_sch a person is
  meant to look at" — covers both "draw a schematic" and "revise this page"
  (the latter via "repairing/revising a page that already exists").
- **No duplication of `TOOLING.md`.** The skill summarises `TOOLING.md`'s
  loop at a level the brief asked for (step list, trap index, false
  greens, verification table) rather than reproducing its prose; where it
  quotes `TOOLING.md` verbatim (the draft-skip rule, the measurable-cost
  line) it attributes the source.
- **`CLAUDE.md` staleness check.** `git show HEAD:CLAUDE.md` diffed
  byte-for-byte against the working-tree copy: identical (confirmed by
  `diff`, no output).

Gates re-driven
----------------

- `bun run typecheck`: clean, no output — confirmed.
- `bun test tests/draught/`: 34 pass, 0 fail, 106 expect() calls, 5 files —
  confirmed, matches report.
- `git status --short`: clean (no output) — confirmed.
- `git diff dbb7e4c..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json TOOLING.md`:
  empty — confirmed (0 lines).
- Commit message for `53b7a7e`: no `Co-Authored-By`, no `Claude-Session`, no
  AI-attribution footer of any kind — confirmed by reading the full commit
  message.
- Control-byte scan, Python, raw bytes, with a planted-byte canary per
  file: both `.claude/skills/drawing-a-schematic/SKILL.md` and `README.md`
  show 0 NUL / 0 CR on the real file, and the canary copy (same file plus
  one appended NUL and one appended CR) was correctly detected as 1/1 in
  both cases — confirms the scanner has teeth, not just a quiet pass.

Full-suite flake reproduction attempt — ONE RUN COMPLETED, ONE NOT ATTEMPTED
------------------------------------------------------------------------------

I launched one full `bun test` run alone (detached via `nohup` so it would
survive a tool timeout). It completed with:

```
2763 pass
0 fail
38671 expect() calls
Ran 2763 tests across 264 files. [146.00s]
```

verbatim, no `(fail)` marker anywhere in the captured output. This is
**one clean run**, matching the implementer's run 2 (2763/0/264) and not
matching their run 1 (2762/1/264). I was required to hand back before a
second independent run could be launched, so **I did not reproduce the
implementer's reported single failure, and I did not get a second data
point of my own.** The flake therefore stands as: implementer saw it once
in two runs (with the failing test's identity lost to a `tail -40`
truncation, not independently diagnosable from their report); I saw zero
failures in one run. That is three data points total across two
observers, one of them a failure with no identified test. **This is weak
evidence of a real, rare flake, not a refutation of it** — a single clean
run cannot clear a flake that showed up 1 time in 2 (implementer) + 1
(mine) = 3 runs; it also cannot confirm one. If the caller needs this
settled, at least 2-3 more full runs should be watched to completion
(~146s each on this branch), and if a failure recurs, it must be captured
without truncation (no `tail -N` on the piped output) so the specific test
is identifiable rather than lost again.

Ran vs. reasoned split
------------------------

**Ran:** `bun run typecheck`; `bun test tests/draught/`; `git status
--short`; `git diff dbb7e4c..HEAD -- drafted/ docs/schematic/verdicts.md
schematic/readability-baselines.json TOOLING.md`; the Python canary'd
control-byte scan; `git show HEAD:CLAUDE.md` vs working tree `diff`; every
grep/read cited above against `engine.ts`, `legibility.ts`,
`draw-draft.ts`, `draw-render.ts`, `tools/cli/draw.ts`, `make/perfboard.mk`,
`TOOLING.md`, `drafted/pultec/*`; reading the commit message directly.

**Ran, one data point only:** one full `bun test` run (2763 pass / 0 fail /
264 files / 146.00s) — see above.

**Reasoned / not independently re-run:** the implementer's run 1
(2762/1/264, failing test's identity lost to truncation) is not
independently reproduced or refuted — a second run of my own was not
completed before handback was required; the attribution of the SPICE
convergence warnings as a plausible flake source is not chased further
here either, for the same reason.
