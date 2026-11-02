Task 5 review: `make draw`, context-directed
===============================================

Scope: `make/perfboard.mk`, `tests/draught/draw.test.ts`, `tools/cli/draw.ts`
(commit `7505225`, range `64c1719..7505225`). Everything below was driven
against the working tree at that commit unless marked REASONED.

VERDICT 1 - spec compliance: PASSES, with two Important gaps (one already
established and now a ruling for the fix round; one a reporting-completeness
gap, not a code defect).

VERDICT 2 - code quality: PASSES. Clean typing, small single-purpose
functions, no duplicated logic, good test isolation and hygiene. Two Minor
observations, neither blocking.

---

Where the paper size can be set
--------------------------------

**Copperhead takes it as an input, and the committed intent files do not yet
carry it.**

- The intent IR has `hints.paper?: string`
  (`draughting/copperhead/src/kicad/draft/ir.ts:44-45`), validated at
  `ir.ts:421-422` ("must be a string ... like `A3`").
- `"USLetter"` is a name copperhead already recognizes - it is a key in its
  own `PAPER_SIZES` table (`draughting/copperhead/src/kicad/legibility.ts:90-104`:
  `USLetter: { w: 279.4, h: 215.9 }`) and in the separate `PAPERS` candidate
  list the drafting engine walks (`engine.ts:3806-3811`:
  `candidates = hinted ? [hinted] : PAPERS.slice(...)`).
- Setting `hints.paper = "USLetter"` PINS the sheet and disables the
  auto-widen-to-a-bigger-sheet search (`engine.ts:1377`'s
  `!validated.intent.hints?.paper` guard); copperhead then reflows/row-wraps
  content onto that sheet with the same machinery already observed wrapping
  `pultec-hi-cut` onto 2 rows for A4, rather than searching sheet sizes. An
  unrecognized hint is reported in a loud note, not silently dropped
  (`engine.ts:3807-3808`: `paper hint "..." is not a standard size; deriving
  paper from content`).
- Checked `docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json`
  directly: its `hints` object is `{"groupOrder": [...], "date": "2026-10-29"}`
  - no `paper` key. So today nothing pins it, and copperhead's free search
  (starting from A5) lands on A4.

So the fallback the ruling flagged - "if copperhead cannot be told the paper
size, the verb sets it after drafting" - is not needed; copperhead CAN be
told. The fix belongs where `tools/cli/draw.ts`'s `draftWithCopperhead` hands
the intent to copperhead: today it does a bare `fs.copyFileSync(opts.intentPath,
...)` (draw.ts:525); the fix round should parse the intent, set/override
`hints.paper = "USLetter"`, and write THAT to `schematic.intent.json` instead
- rather than editing every committed intent file on disk (four of five
boards do not even have a `COMMITTED_INTENT` entry yet) or adding a
post-draft sexp rewrite.

**One open question for the fix round, not a finding against this task**:
pinning paper disables the sheet-size search entirely, so whether the
hi-cut content (23% ink utilization on A4, already row-wrapped to 2 rows)
fits comfortably on USLetter's slightly different aspect (279.4 x 215.9 mm
vs A4's 297 x 210 mm) needs to be checked once the hint is actually wired in
- it was not implemented here per your instruction, so it is untested.

---

Point 1 - the withholding rule
-------------------------------

Traced every return in `runDraw` (there are exactly nine):

1. `checkToolchain` reports a problem -> refuse. Before drafting.
2. No `perfboard.json` in the resolved board dir -> refuse. Before drafting.
3. `loadDeclaration` throws -> refuse. Before drafting.
4. `resolveIntentPath` finds no `COMMITTED_INTENT` entry -> refuse, naming
   the board. Before drafting.
5. `parseIntent` throws on a malformed intent file -> refuse. Before
   drafting.
6. `declaration.netlistPath` undefined -> refuse. Before drafting.
7. Netlist file unreadable -> refuse. Before drafting.
8. `verifyIntentAgainstModel` disagrees -> refuse, listing the disagreements.
   **This is the one §3 permits**: nothing has been drafted yet, and the
   ground is exactly "a drawing whose connectivity disagrees with the
   circuit model."
9. `draftWithCopperhead` or `renderSheet` itself fails (tool crash, no
   output file) -> `exitCode: 1, drew: false`. This is a TOOLING failure,
   not a quality-based suppression - nothing viewable was produced to
   withhold. One nuance worth naming: if copperhead succeeds but
   `kicad-cli`/`magick` fails, a `.kicad_sch` DOES exist under
   `build/draw/<board>/` at that point (openable in KiCad directly), but
   `draw.ts`'s refusal message never says so - a minor clarity gap (see
   Minor findings), not a withholding violation, since the file is not
   deleted or hidden.

Once render succeeds, the measurement suite (step 10 effectively) NEVER
gates: `runMeasurementSuite`'s `ok: false` only appends a stderr line
(`draw.ts:741`); the function's final return (`draw.ts:743-748`) is
unconditionally `exitCode: 0, drew: true` from that point on, regardless of
what the three scripts report. Confirmed by driving the real run: it
printed `TRUE CROSSINGS (X): 8`, `WIRE-TO-WIRE TEES: 2 without a dot: 2`,
etc. - adverse-sounding findings - and still exited 0 with the page written.

**No exit path suppresses an already-rendered page for a non-electrical
reason.** Confirmed by reading, not merely asserted.

---

Point 2 - judgement language
------------------------------

`grep -noE '\b(better|best|worse|good|bad|clean|readable|legible|clear|tidy|
ugly|wins)\b'` over the diff: zero hits in code, comments, or the test file.

Over the report: three hits, all "clean" - `bun run typecheck: clean`
(line 12), `git status --short is clean` (line 80), `all three clean`
(line 130, the canary scan). All three describe tool/VCS/scan state, not a
drawing's legibility - none is a verdict on a schematic.

"compaction failed" (quoted in the report) does not appear anywhere in the
diff - `grep -n "compaction" review-64c1719..7505225.diff` returns nothing.
It is copperhead's own stdout, passed through verbatim by
`draftWithCopperhead`'s wrapping of `draft.stdout`, not this task's
characterisation. Acceptable per the brief.

---

Point 3 - G308, no selecting variable
---------------------------------------

`make/perfboard.mk`'s new `draw:` target is `@bun "$(REPO_ROOT)/tools/cli/
draw.ts"` with no variable reference at all. `draw.ts` reads only
`process.cwd()` in the real CLI path (`resolveBoardDir`, used only when
`options.board`/`options.boardDir` are both unset - and the real entry point
never sets either).

Driven for real, from multiple directories and contexts:

- `make -C boards/pultec-hi-cut draw` -> drafts, renders, measures, exit 0.
- `make -C boards/pultec-mid draw` -> refuses, naming `pultec-mid`
  specifically (different board, different, correct outcome).
- `make -C boards/pultec-mid draw BOARD=pultec-hi-cut` (command-line
  variable) -> still refuses naming `pultec-mid`. No effect.
- `BOARD=pultec-hi-cut make -C boards/pultec-mid draw` (environment
  variable) -> still refuses naming `pultec-mid`. No effect.
- `cd boards && make draw` -> generic "No rule to make target" (there is no
  Makefile at all in the aggregate `boards/` directory - this is make's own
  built-in-rules message, not evidence of anything in `perfboard.mk`, but it
  does confirm there is no silent fallback behaviour).

**Confirmed: `$(CURDIR)` (via `-C`) is the only lever, and no BOARD=-shaped
variable - command-line or environment - has any effect.**

---

Point 4 - the committed-page comparison
------------------------------------------

Re-drove `draughting/measure/netcmp.py` myself against the committed page
and a freshly re-drafted `build/draw/pultec-hi-cut/pultec-hi-cut.kicad_sch`
(independently re-hashed: 67478 bytes, sha256 `2bb49cfce8b8...`, matching
the report exactly):

```
positive control: moved SI5.2 from lo_boost_in to unconnected-(SW1-PadMP)
  in a copy of BEFORE -> partition differs: True
NET PARTITION (pin sets, ignoring net names): IDENTICAL
NET NAMES: DIFFER
  only BEFORE: ['/cut_wiper']
  only AFTER : ['cut_wiper']
```

Matches the report's claim exactly: the positive control fired, the
partition is identical, and the only difference is the label-scope slash on
one net name.

**On whether `make draw` stopping short of akcli is the intended scope or a
gap**: it is the intended scope, and the brief says so itself. Task 5's own
Step 3 order ("check the toolchain; resolve the intent; ... draft with
copperhead; render; run the measurement suite; write the crops") never
mentions akcli. Cross-checked against `TOOLING.md`'s own numbered loop
(read directly, not quoted from the plan): step 2 is "Draft", step 3 is
"Render, and LOOK AT THE RENDER", and step 4, titled "Repair with akcli", is
explicitly the next, separate step - described throughout as judgement work
("Group assignment is the main lever you have, so try more than one";
`akcli`'s repair classes are enumerated as hand-driven ops). `make draw`
implements steps 1-3 of that loop plus the measurement suite; nothing in
the brief or in `TOOLING.md` describes steps 1-3 as including repair.

A reader going only by the verb's NAME ("draw") could reasonably expect a
finished, reviewer-approved-looking page, and would be surprised to learn it
stops short of repair - that expectations gap is real, but it is a
documentation/naming question for the owner, not a scope defect in this
task: the brief explicitly ordered the verb to stop here, and the report
discloses the gap plainly rather than burying it ("Concerns / things I did
not do" names it in the implementer's own words). I would flag this to the
owner as a one-line check ("does `make draw` need to say it is a MECHANICAL
draft, not a finished page, in its own output?") rather than as a defect.

---

Point 5 - `COMMITTED_INTENT` covers only `pultec-hi-cut`
-----------------------------------------------------------

Refusing by name for the other four boards is the right default here: the
brief explicitly says this plan does not derive an intent from a `Network`,
and guessing which research-run intent file is "the" one for each of the
other four boards would repeat exactly the pattern `G245`/`G282` already
caught this project doing once - inventing a requirement (here, a guessed
mapping) instead of asking for the one fact actually missing. Driven:

```
no committed copperhead intent is declared for board "pultec-mid".
COMMITTED_INTENT in tools/cli/draw.ts names one intent file per board that
has one, and this plan does not derive an intent from a Network (the board
has none yet, among [pultec-hi-cut]). Add "pultec-mid" to COMMITTED_INTENT,
pointing at a committed intent file, before drafting it here.
```

Names the board, names the exact map and file to edit, and says what to put
in it. That is an actionable next step, not a bare "not found."

---

Point 6 - no hardcoded tool paths
------------------------------------

`kicad-cli`, `magick`, and copperhead's checkout directory are resolved
through `defaultKicadCli()` (`lib/kicad/install.ts:129`), `defaultMagick()`
(`tools/draught/magick-install.ts:54`), and `defaultCopperheadDir()`
(`tools/draught/copperhead-install.ts:59`, itself `path.join(moduleRepoRoot(),
"draughting", "copperhead")` - no absolute path literal). Copperhead is
invoked as `spawnSync("npx", ["tsx", cliPath, ...])` (`draw.ts:539`), never
`bun`. `git` and `python3` are invoked by bare PATH name, justified in the
module comment by citing `TOOLING.md`'s own toolchain table (neither tool is
in `draughting/tools.lock.json`) - a defensible, stated reason, not an
unexamined shortcut.

---

Gates re-driven (RAN, not relayed)
-------------------------------------

- `git show HEAD:CLAUDE.md` vs working copy: **identical**, no drift.
- `bun run typecheck`: clean.
- `bun test tests/draught/`: **30 pass, 0 fail, 89 expect() calls** - matches
  the report. (The 24-before claim was not independently re-derived by
  checking out the prior commit - see REASONED below - but the diff shows
  exactly 6 `test(` calls added in the one new file, which is consistent
  with 24 -> 30.)
- sha256 of all five `drafted/pultec/*/*.kicad_sch` captured before AND
  after the real run below: **byte-identical**, matching the report's
  digest for `pultec-hi-cut` exactly
  (`e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332`).
- `make -C boards/pultec-hi-cut draw`, run for real (twice): **exit 0**,
  output matches the report's quoted transcript (crossings 8 true/2
  T-meetings, orphan junctions 0, wire-to-wire tees 2/2, sheet fit A4 23%,
  compaction failed, groups wrapped to 2 rows).
- `git status --short`: clean after the run.
- `git diff 64c1719..HEAD -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json TOOLING.md`: **empty**.
- Context-direction, driven from multiple directories and with both a
  command-line and an environment `BOARD=` variable attempted: no effect
  either way (point 3 above).
- `draughting/measure/netcmp.py`, re-driven with its own positive control,
  against the committed page and an independently re-hashed fresh build
  output: **matches the report exactly** (point 4 above).
- Full `bun test`, run alone: **2759 pass, 0 fail, 38654 expect() calls,
  264 files** - matches the report's own baseline-delta arithmetic exactly.
- Control-byte scan with a canary, over the three touched files. **First
  attempt was itself broken and worth recording**: a bash `$'\x00\|\r'`
  pattern collapsed under ANSI-C quoting into a literal NUL + backslash +
  pipe + "r", which GNU grep's BRE then parsed as alternation on the bare
  letter "r" - reporting false "hits" on all three files (every file
  contains the letter r). Rewritten in Python reading raw bytes; canary
  fired correctly; all three files independently confirmed clean. (This is
  exactly the class of mistake `CLAUDE.md`'s control-character section
  warns about, caught by checking the detector against a canary before
  trusting a negative result - worth noting since the project's own
  standing instruction that "a scan carries a canary" is what caught it.)
- Commit message (`git log -1 7505225`): no AI attribution of any kind.
- `make -C boards/pultec-hi-cut check` (the one board this task touched):
  **7 pass, 0 fail, exit 0**.
- `make check` (aggregate, repo root): **fails**, but only on
  `transistor-preamp-staged` (HC5: C8 lead span 14 holes vs max 11) and
  `transistor-preamp-loop` (HC8: 15 open nets). Neither board is touched by
  this diff; `git log` on both boards' directories shows their most recent
  changes predate this task's commit range by many commits. **Not a
  regression introduced by Task 5.**

REASONED, not independently re-executed:
- The "24 before this task" test count for `tests/draught/` - inferred from
  the diff's six new `test(` calls plus the observed 30, not from checking
  out `64c1719` and re-running.
- The three fault-injection-and-revert claims (disabling the toolchain
  guard, removing the crop-write block, the paired corrupted/real intent
  test) - these are described as already-completed-and-reverted actions in
  the report; I did not re-break and re-fix the code myself to re-derive
  them, but `git diff` on the committed file being empty is consistent with
  a clean revert, and the test suite exercises the same two paths
  (toolchain refusal, crop-file assertion) that those injections targeted.

---

Ranked findings
------------------

**Critical**: none.

**Important**:
1. Paper size - `make draw` drafts to A4; every approved page is USLetter.
   Already established and ruled (not re-derived here): the verb drafts to
   US Letter. Mechanism located above - `hints.paper = "USLetter"` on the
   intent handed to copperhead in `draftWithCopperhead`, not a post-draft
   rewrite and not an edit to every committed intent file.
2. Step 5 of the brief ("run `make check` and `bun test`; commit") is not
   evidenced in `task-5-report.md` - the report's test summary covers
   `typecheck`, `bun test tests/draught/`, and full `bun test`, but never
   mentions `make check` in either form. Driven here: the board-scoped
   `make -C boards/pultec-hi-cut check` passes cleanly; the aggregate
   `make check` fails on two unrelated, pre-existing boards. No regression
   was found, but the report does not say whether this step was run at all,
   which breaks the "drive, do not read" / disclose-what-you-ran discipline
   this plan otherwise holds to everywhere else in the same report.

**Minor**:
3. `tools/cli/draw.ts` is 557 lines, over the project's 500-line soft
   ceiling - though roughly 150 lines are module/function doc comments and
   55 are blank, leaving ~350 lines of actual logic, and the functions
   themselves are small and single-purpose. Borderline, not a structural
   problem.
4. When `renderSheet` fails after a successful draft, a `.kicad_sch` exists
   under `build/draw/<board>/` (openable directly in KiCad) but the
   refusal message doesn't say so. Not a withholding violation - the file
   is not hidden or deleted - but a person reading only the error has no
   way to know a partial artifact exists.

---

What was driven vs reasoned (summary)
----------------------------------------

Driven: toolchain refusal path, two different board refusals (named
correctly), a real end-to-end `pultec-hi-cut` draw (twice), the five
`drafted/` digests before and after, `git status`/`git diff` over the
protected paths, `netcmp.py` with its own positive control re-run
independently, the full `bun test` suite alone, a canary-verified
control-byte scan (whose first attempt was itself broken and had to be
rebuilt), `git show HEAD:CLAUDE.md` for drift, context-direction from
multiple directories including attempted `BOARD=` overrides on the command
line and in the environment, board-scoped and aggregate `make check`, and a
direct read of copperhead's own source to locate the paper-size input.

Reasoned (not re-executed): the pre-task test count of 24, and the
fault-injection-and-revert narrative in the report (consistent with, but
not independently reproduced by, this review).
