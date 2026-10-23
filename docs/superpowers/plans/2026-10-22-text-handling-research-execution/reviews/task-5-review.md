# Task 5 review — global-label freedoms, the G262 correction, and the Step 3 sweep

**Reviewer verdicts**

| | verdict |
| --- | --- |
| **SPEC COMPLIANCE** | **PASS** |
| **TASK QUALITY** | **PASS WITH FINDINGS** — no Critical finding; three Important, seven Minor |

Scope reviewed: BASE `3cda4c7` → HEAD `3c36884` (3 commits). Everything below is marked
**CONFIRMED** (I drove it myself and the check could have failed) or **RELAYING** (I did
not re-drive it). I re-drove every headline figure. **The tree is clean**
(`git status --porcelain` empty before and after; I perturbed nothing under version
control — every perturbation ran in the scratchpad against in-memory or copied inputs).

---

## Headline: how far the claims hold

**The implementer's three consequential claims all re-drive, independently.** I did not
relay the probe: I re-exported the fixtures with my own s-expression parser and a direct
`kicad-cli` call, recomputed the candidate-set statistics and the blocked population with
my own code and a different label-naming test, re-enumerated the freedom-1 side space with
my own enumeration, and attacked the Step 3 control in both directions. Every number
matched.

**The one place my numbers differ from the register's is a figure the task UNDER-states**
(G269's "2 blocks" is 3 under the natural reading of its own sentence — Minor 1), and the
one place the plan is still wrong is a board-granularity figure §5 never converts
(Important 3).

---

## A. THE TWO EDITS TO A PRE-EXISTING ASSERTION

Judged separately, as required. The plan's Global Constraints clause reads *"Research only.
No design, no proposal, no implementation. No task edits `lib/`, `tools/`, `circuits/` or
any check. A task that finds itself wanting to fix something records it and stops."*

### A.1 — the `\S` → `.*\S` loosening: **DOES NOT WEAKEN what the guard refuses, but it is now TAUTOLOGICAL**

The edit, in `tests/schgen/text-metrics/document-pastes.test.ts`:

```
- for (const n of v.notOutput) expect(n).toMatch(/^line \d+: \S/)
+ for (const n of v.notOutput) expect(n).toMatch(/^line \d+: .*\S/)
```

**What the pattern is applied to.** `verify-pastes.ts:190` pushes
`` `line ${b.at}: ${first}` `` where `first = b.lines.find((l) => l !== "") ?? "(empty block)"`.
Decisively, `parseBlocks` right-trims every body line (`.replace(/\s+$/, "")`), so **a line
made only of whitespace becomes `""` and is skipped by `find`.**

**I drove every first-line shape the two patterns could separate** (scratchpad
`regex-drive.ts`, synthetic documents through the real `verify`):

| block's first content line | old `\S` | new `.*\S` |
| --- | --- | --- |
| `hello` (column one) | PASS | PASS |
| `  hello` (indented two spaces) | **FAIL** | PASS |
| two spaces, then `hello` on the next line | PASS | PASS |
| a tab-only line, then `hello` | PASS | PASS |
| blank line, then `  hello` | **FAIL** | PASS |
| every line blank | PASS (`(empty block)`) | PASS |
| every line spaces only | PASS (`(empty block)`) | PASS |

**CONFIRMED conclusions:**

1. **The only input the old form caught and the new form does not is a block whose first
   content line is indented** — which is a legitimately named block, not a dodge. **Nothing
   that the guard REFUSES changed.** The refusal path is `failures`, which this edit does
   not touch, and the population accounting
   (`verified + notOutput.length + failures.length === blocks`) is untouched and still has
   teeth. **So: DOES NOT WEAKEN.**
2. **But the new pattern cannot fail for any possible `notOutput` entry.** `b.at` is always
   a positive integer, so `^line \d+: ` always matches; `first` is either a right-trimmed
   non-empty line (which therefore contains at least one non-whitespace character) or the
   literal `(empty block)`. **The assertion is a tautology** — one of the eleven recorded
   false-green shapes on this branch, applied to this plan's own instrument. Graded
   **Important 1** below.
3. **The comment justifying the edit states a false fact.** It says *"A block whose first
   line were blank or all spaces still fails."* I drove both: an all-spaces first line is
   right-trimmed away and the entry reads `line 7: hello`; an all-blank block reports
   `line 7: (empty block)`. **Both PASS under the old pattern and under the new one.** The
   old `\S` never protected against an unnamed block; that case is unreachable.

**On the Task 3 precedent (dedent by one space instead of touching the guard): that route
was genuinely unavailable here, and I checked.** Exactly two blocks in the whole document
land in `notOutput` with an indented first line, both §5 `label-run` blocks (document lines
3909 and 3938), and **both first lines are verbatim lines of §5's committed probe log**
(scratchpad `indented.ts`). Dedenting them in the document would make them non-contiguous
slices and turn §5's own checker red. The remaining less-invasive route — changing the
probe's own output indentation, which is this plan's sanctioned apparatus — did exist and
was not taken or discussed. That is a judgement call, disclosed in the report (concern 6),
and I do not fault it; the tautology and the false comment are what I fault.

### A.2 — bounding §4's document slice: **DOES NOT WEAKEN — it strengthens**

**The end-of-file slice was a genuine latent defect.** I drove it (scratchpad
`slice-drive.ts`):

- §4's slice to end of file at HEAD parses **21** fenced blocks (§4's 8 plus §5's 12
  `label-run` blocks plus its one `sh` block), against the pinned `SECTION_4_BLOCKS = 8`.
  **So the old form would have gone red with a message about §4 that was really about §5.**
- The new bound (§4's heading → §5's heading) parses exactly **8**, and its block info
  strings are **identical** to the §4-to-EOF slice at the parent commit `3cda4c7`, where §4
  was last. The bound therefore restores exactly the prior semantics rather than narrowing
  them.
- The new form **refuses** (throws, with a message naming the cause) when §5's heading is
  missing or precedes §4's. The old form had no such guard. Strictly more refusal.
- **Could §5 have been checked without it?** Yes — §5's own `verify` call is independent of
  §4's slice. The bound is needed for §4's *pinned count* to keep meaning, not for §5's
  check to exist. The report's wording ("would otherwise have swallowed §5") is accurate
  about the consequence.

The whole-document call `verify(doc, log)` is unchanged and still covers all 54 blocks
(14 verified, 40 notOutput, 0 failures — CONFIRMED). **No input the guard previously
refused is now accepted.**

---

## B. THE HEADLINE NUMBERS, RE-DRIVEN

### B.1 The four freedoms — **CONFIRMED, all four EXIST**

I re-exported **all nine** fixtures (not only the two required) with a direct
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` call and **my own** tokenizer and
`(nets)` reader, sharing no code with `partition.ts` or `importNetlist` (scratchpad
`reexport.py`). `kicad-cli version` → **10.0.5**, CONFIRMED.

My output is byte-identical to the document's STEP 2 ARMS block:

| arm | IDENTITY (mine) | NAMING (mine) | freedom | verdict |
| --- | --- | --- | --- | --- |
| `a0-base` | `{R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}` | `RETURN SIGNAL` | — | base |
| `a1-rotate`, `b2-rotate` | unchanged | unchanged | 1 orientation | **EXISTS — CONFIRMED** |
| `a2-slide` | unchanged | unchanged | 2 anchor slide | **EXISTS — CONFIRMED** |
| `a4-reroute` | unchanged | unchanged | 3 wire reroute | **EXISTS — CONFIRMED** |
| `a3-move-segment` | unchanged | unchanged | 4 other segment | **EXISTS — CONFIRMED** |

**The fixtures carry the relation they claim, which I checked rather than assumed.**
`a2-slide` puts the label at `(44.45, 38.1)`, the **interior** of the wire
`(38.1,38.1)-(50.8,38.1)` — a genuine slide off a wire end. `a3-move-segment` puts it at
`(101.6, 43.18)`, the interior of R3's vertical stub — a genuine different segment of the
same net. `a4-reroute` replaces one straight wire with a three-segment dogleg under a
stationary anchor.

**I also drove the arms' non-tautology, which the brief did not ask for and which matters
most.** The worry: on fixture A the three `R*.1` pins are held together by wires and
junctions regardless of the label, so **identity alone cannot distinguish an attached label
from a detached one.** I built an off-wire arm (label moved to `(44.45, 30.48)`, which lies
on no wire) in the scratchpad and exported it:

```
z-offwire
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   Net-(R1-Pad1) RETURN
```

**Identity unchanged, naming changed to an auto-generated name.** So the naming half is what
carries the attachment evidence, the probe reads both, and a slide that failed to attach
would have gone red against its published `naming unchanged` prediction. **The arms are not
tautological. CONFIRMED.**

**The predictions preceded the run.** They are source literals in
`tools/schgen/label-freedom/fixtures.ts:241-318`, committed in the apparatus commit
`456d828`, which precedes the document commit `3c36884`. CONFIRMED.

**The one-difference property** is asserted, not described:
`tests/schgen/label-freedom/fixtures.test.ts` pins the rendered line-difference count per
arm (2 for each single-item edit, 4 for `a4-reroute`), and the suite is green. CONFIRMED by
reading plus the green suite.

### B.2 The negative control — **CONFIRMED on both halves; it discriminates**

**The fixture is constructed as the brief specifies.** I read `b0-base` directly: R1 at
`(50.8,50.8)` wired to `(38.1,38.1)`, R2 at `(101.6,50.8)` wired to `(114.3,38.1)`, **no
wire between the two runs**, and `BRIDGE` labels at the two far ends. The name is the only
thing joining them. CONFIRMED.

**Half one — identity breaks when the bridge breaks.** My independent export:
`b0-base` → `{R1.1,R2.1} {R1.2} {R2.2}`; `b1-rename-bridge` → `{R1.1} {R1.2} {R2.1} {R2.2}`.
**The group `{R1.1,R2.1}` disappears from the partition** and `{R1.1}` and `{R2.1}` arrive.
CONFIRMED.

**Half two — the same edit leaves identity alone on a wire-held net.** `a5-rename-wired`:
identity unchanged, naming `RETURN SIGNAL_RENAMED`. CONFIRMED.

**So the control is a pair that answers differently under the same edit kind**, which is the
property the first version of this task lacked. A control that could not separate identity
from naming would have passed either way; this one demonstrably cannot. The probe gates its
`DISCRIMINATION ESTABLISHED` line on `aIdent && !bIdent` and prints the negation otherwise
(`probe.ts`) — CONFIRMED by reading.

### B.3 Step 3 — **CONFIRMED, including the exhaustiveness and the control**

**The probe re-drives byte-for-byte.** `bun run tools/schgen/label-freedom/probe.ts` took
31 s and produced a 490-line log that differs from the committed
`tools/schgen/label-freedom/probe-run.log` in **exactly one line** — the recorded commit
SHA (`3c36884` now, `3275bde` at measurement). Everything else is identical, and the
fixtures were rewritten with identical bytes (`git status` stayed empty). **The
re-drivability criterion that sent Task 4 back is met here: `kicad-cli` is the only external
dependency. CONFIRMED.**

But "it re-drives" is not "it is right", so:

**Population — CONFIRMED independently.** My own recount (scratchpad `recount.ts`: the
repository's `laidOutBlocks` and `checkLayout`, but my own label-naming test
`problem.includes("label " + net + " at (")` instead of the probe's regex) gives
**13 cases offered, 48 laid out, 12 skipped, 12 blocks blocked on a label** — and the same
12 block names. 13 of the 48 refuse; the 13th (`opamp-buffer/ob-buffer`) refuses on
power-symbol values alone, which is consistent with G262's untouched power half.

**The control discriminates in both directions — CONFIRMED by attacking it.** I fed
`regradeControl` three corrupted inputs (scratchpad `control-probe.ts`):

| corruption | control's answer |
| --- | --- |
| baseline, all 48 blocks | 0 findings (as the log says) |
| a refused block handed a clean layout | reports *"the adapter refused this layout and a re-grade finds no problem at all"* |
| an accepted block handed a problem-bearing layout | reports *"the adapter accepted this layout and a re-grade finds 1 problem(s): …"* |
| a refused block whose refusal text is replaced | reports one finding per re-graded problem |

**This is not a control that returns the treatment's answer.** It is the specific thing the
figures rest on, and it has teeth.

**Freedom 1 exhaustiveness — CONFIRMED.** I re-enumerated the 4ⁿ side space myself for all
12 blocks. In every case `graded == 4ⁿ` (64, 1024, 16, 256×5, 16, 4096, 256), so no sweep
was a partial search, and **freedom 1 alone clears the whole block on exactly 5 of 12** — the
five Pultec `*-junction` blocks. My count matches the probe's. The pair joint sweeps are
likewise exhausted: spaces 800, 32256 (×5) and 12288, each with `tried == space`, all under
`PAIR_CAP = 60000`. **No `CAPPED` marker and no `checkLayout THREW` line appears anywhere in
the log** (grep count 0 for both).

**The striking three-of-five sub-claim — CONFIRMED, and I checked it against the right
object.** The probe's `bestTotalProblems` is the best-by-TOTAL candidate's residue, which is
not the same object as "the residue once every label problem is cleared", so I computed the
latter directly (scratchpad `stuck3.ts`/`stuck3b.ts`): for each of the five blocks nothing
clears, the minimum-total candidate among those reaching **zero** label problems.

| block | reaches zero label problems | residue | contains a label problem |
| --- | --- | --- | --- |
| `pultec-hi-boost/pultec-hi-boost-own` | yes, `hi_boost_out at (25.4, 64.77) side left` | 1: the dangling wire end | **NO** |
| `transistor-preamp-buffered/tp-stage` | yes, `BYPASS_CAP at (10.16, 22.86) side right` | 2: a dangling end + the GND/VCC glyph touch | **NO** |
| `transistor-preamp-staged/tp-stage` | yes, same move | 2: same pair | **NO** |
| `transistor-preamp/tp-stage` | **no** single-label relocation reaches zero | — | keeps a label problem |
| `transistor-preamp-loop/tp-stage` | **no** | — | keeps a label problem |

**Exactly 3 of the 5, and exactly the 3 §5 names; exactly 2 keep a label problem, and
exactly the 2 §5 names. CONFIRMED.** §5.8's narrative figure — sliding `hi_boost_out`
8.89 mm and turning it `left` clears all three overlaps and leaves one non-overlap problem —
reproduces exactly. One small imprecision: §5 says two of the three refuse *"on the
power-glyph class"*; their residues carry the power-glyph problem **and** a dangling end
introduced by the relocation. The claim as worded (*"refuse on a defect with no label in
it"*) is true either way.

### B.4 Candidate-set widths — **CONFIRMED**

My own grid enumeration over every label anchor of every laid-out block (scratchpad
`recount.ts`, with a guard that throws on a non-axis-aligned wire — it never fired):

```
label anchors: 95; widths n=95
min 20 p25 32 median 80 p75 120 max 1000
larger than 4: 95; equal 4: 0; smaller: 0
```

**Identical to §5.6 and to G259's discharge, including the minimum and the 95-of-95.** The
hedge is properly discharged. The figure is also correctly described as a lower bound
(grid resolution, existing wires only) and is **ruler-independent** — it is pure wire
geometry, not a text box — so it does not inherit the §1 election problem.

---

## Boards versus blocks: consistent, but the board figure is still unrecorded

**The two figures are reconcilable and neither is internally wrong, but the plan's unit is.**

- The plan (`docs/superpowers/plans/2026-10-22-text-handling-research.md:205`) says
  *"Three of eleven boards are blocked here."* The **three** came from G262's table, which
  counted **three blocks** over four circuits at a time when nine of eleven boards had no
  authoring declaration at all. So "three" was a block count wearing a board label.
- §5 and G262 clause (b) correct the number in block units: **12 of 48 laid-out blocks**,
  which I confirmed. G262 clause (b) further notes eight distinct block declarations behind
  the twelve rows (five Pultec `*-junction` rows measure identically, including the same
  best candidate and the same 32256 joint space — consistent with one shared block declared
  five times).
- **Neither the document nor the register states the board figure, and it is not three.** I
  computed it from the declaration map (`tools/schgen/board-declarations.ts`, where
  `transistor-preamp` is the `transistor-preamp-lab` board): the 12 blocked blocks span
  **9 of the 11 boards** — all but `pt2399-core` (skipped at `validateCircuit`) and
  `transistor-preamp-feedback` (its `tp-stage` refuses before `checkLayout`).

**Verdict: CONSISTENT, with the plan's figure wrong in both number and unit, and the
correction stated only in blocks.** Graded Important 3.

---

## Also verified

**Step 3 ran under the production ruler only — adequately flagged, with two gaps.**
CONFIRMED: `freedoms.ts`'s header names the ruler (`length × GRID`) and says the three §1
quantities are not re-driven and why; §5.11's first bullet states it in full, cites §1's
13-of-15 and 4-of-8 survivor counts, says a per-freedom verdict is **expected** to move, and
names the election as the owner's (**G265** clause 4); **G262** clause (e) repeats it. **No
conclusion depends on an unmade election, and nothing elects one.** The **qualitative**
finding — that the four freedoms exist — is ruler-independent, since every Step 2 arm is a
`kicad-cli` netlist export with no text box anywhere in it. CONFIRMED. Two gaps: §5.7's
scoreboard table carries no inline ruler caveat (the reader must reach §5.11), and **G269**
is silent on the ruler although its "2 of 12" figure is under it (Minor 6).

**G262 is CORRECTED, not extended — CONFIRMED.** The header now says the netlist-fact claim
*"HAS BEEN DRIVEN AGAINST KiCad AND IS FALSE"*; the wrong paragraph is replaced in place by a
block quoting it verbatim with the reason it is kept (*"it was cited for a day"*); the
four-candidate mechanism is marked measured-and-still-untried with its measured result
(5 of 12, 0 of the three in its own table); and a Task 5 amendment adds (a)-(e) including a
clause saying what is **not** measured. **I grepped every `netlist fact` / `netlist-fact` /
`moving one off` hit in `docs/known-gaps.md` (12 sites) and read each.** No *uncorrected
assertion* survives: every remaining instance is either a verbatim quotation inside a
correction block, a pointer to one, or the correct statement of what IS a netlist fact. Two
sites are stale rather than wrong (Minor 4, Minor 5).

**G259's hedge discharged — CONFIRMED** (the 95-anchor block, `[RAN]`, criterion/mechanism
kept apart, mechanism still marked untried).

**G269 and G270 — CONFIRMED as entries, and G269's claim CONFIRMED against the rule it
names.** Both carry what was found, where, the evidence, CONFIRMED-versus-RELAYED, why open,
and a CRITERION distinct from a MECHANISM marked untried. G269's production rule is real:
`lib/schgen/render/wire-safety.ts:132` is `danglingWireEnds` and line 141 emits the exact
message G269 quotes; my independent sweeps reproduced that message as the sole residue on
`pultec-hi-boost-own` **and** on `tp-leg-emitter-bypass`. G270's grep I re-drove with its own
control over `docs/schematic/text-placement-prior-art.md` (939 lines — CONFIRMED):
`global label` 0, `line feature` 0, `line labeling` 0, `line labelling` 0, control `slider`
**5**. **The grep could have matched and did not.**

**Step 1's literature — CONFIRMED, NO FABRICATION. This is the item I would have graded
Critical, and it is clean.** I fetched all three pinned files and hashed them:

| file | SHA-256 | pin matches |
| --- | --- | --- |
| `…/237/kap5.pdf` | `a71845d7…a29b4` | **YES** |
| `…/237/kap3.pdf` | `01a4ee40…8dcb6` | **YES** |
| `https://arxiv.org/pdf/1902.01454v2` | `d33b8472…b3877` | **YES** |

I extracted the text with `pdftotext` and checked **thirteen** quotations against the files
whose hashes §5 pins, under whitespace/hyphenation/glyph normalisation only — never a
paraphrase (scratchpad `quotes.py`, then raw-text inspection for the five my normaliser
flagged, all five of which were my own artifacts: a space before a comma, `ε` dropped by the
extractor, `ℓ` rendered as a backtick, and two line wraps).

**The diagnostic sentence is verbatim and in the stated position:** Bekos et al. line 383-384
reads *"Note that the site of a point feature is always fixed, in fact the site and the
feature coincide."* — immediately after the sliding-site definition, exactly as §5.1 says.
The sliding-site and fixed-port definitions, P5, the sliding-labels justification, the
obstacles clause, Wolff Ch. 5's line class, H1-H3, the candidate-strip sentence, the Imhof
interval passage, and Ch. 3's Definition 3.2 are all verbatim. **Table 1's counts are
verbatim too** — `P5.1 … 13`, `P5.2 … 13`, `P6.1 … 23`, `P6.2 … 13`, read off the layout
extraction. One quotation is truncated mid-sentence with a substituted full stop (Minor 7).

**Nothing was fixed — CONFIRMED.** `git diff 3cda4c7..3c36884` touches **no** path under
`lib/`, `circuits/`, `boards/`, `Makefile` or `make/`. The only pre-existing check touched is
`tests/schgen/text-metrics/document-pastes.test.ts` (item A). Every mechanism is marked
UNTRIED, in §5.10 and in the register, and §5.10 closes *"None of these is a criterion.
G240's criterion … is unchanged, and this section authors no new one."* The
zero-problem `tp-leg-emitter-bypass` result — the most actionable thing found — is recorded
as mechanism 2 and as G262 clause (d), explicitly not done.

**The invariant — CONFIRMED.** §5 elects nothing and authors no criterion. §5.10's preamble
cites `CLAUDE.md` by name and reserves legibility to the owner; §5.11 lists seven things §5
did not establish; every register amendment closes with *"this entry's criterion is
unchanged and no new one is authored."*

**§1-§4 untouched — CONFIRMED independently.** `git diff --numstat` is `703 0` for the
document, and `head -3389` of the file at HEAD hashes
`2e9f670d…01c0`, identical to the whole file at `3cda4c7` (3389 lines). Insertion-only.

**The `expect()` accounting — CONFIRMED term by term, every term driven:**

| term | claimed | what I measured |
| --- | --- | --- |
| files | 352 → 353 | +1, `tests/schgen/label-freedom/fixtures.test.ts` |
| tests | +12 = 5 + 7 | `fixtures.test.ts` alone **5 pass**; `document-pastes.test.ts` `test(` count 34 at HEAD vs **27** at `3cda4c7` → **+7** |
| `expect()` from `fixtures.test.ts` | 62 | ran it alone: **62 expect() calls** |
| `expect()` in the §5 describe | 26 | sliced the new describe: **26** textual `expect(` (and the file's textual total moved 84 → 110, **+26**) |
| `expect()` from the not-checked loop | 13 | `verify(doc, log).notOutput.length` = **40** with §5, **27** with §5's slice removed → **+13** |
| total | +101 → 43614 | 62 + 26 + 13 = **101**; 43513 + 101 = **43614** |

**Suite and typecheck — CONFIRMED by running them.**
`SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test` →
**3801 pass / 0 fail / 43614 expect() across 353 files** in 150 s, which is the implementer's
figure exactly. `bun run typecheck` → clean, no output.

**`make check` — I ran it; it is RED, and not because of Task 5.** It fails on
`circuits/pt2399-core/pt2399-core.ts: no "bomConditions" export` and on a missing
`LEAD_SPANS` entry for `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm`. Both are in files these
three commits do not touch, and **G251** already records that the root `make check` does not
pass, quoting the same `bomConditions` message. **So the implementer's non-run is not a
gap**, and `make check` cannot serve as a gate on this branch.

**Apparatus declared — CONFIRMED.** All five `.ts` under `tools/schgen/label-freedom/` plus
`tests/schgen/label-freedom/fixtures.test.ts` are listed in `tools/schgen/port-manifest.json`,
and the port-fidelity guard ran (not skipped) with `SCHGEN_SOURCE` set and passed.

**Fixtures under `tools/` rather than `tests/` — does not matter.** They are declared derived
artifacts, written by the probe beside it, content-compared (not timestamp-compared) by a
test under `tests/`, with the directory contents pinned exactly. The precedent is already in
the tree — `tools/schgen/text-metrics/probe-run.log` and `tools/schgen/elk-labels/probe-run.log`
sit beside their probes. The task context directed this placement. No finding.

**No dependency added — CONFIRMED.** `git diff` over `package.json`, the lockfile and
`yarn.lock`/`package-lock.json` is empty, and nothing third-party is vendored:
`fixtures.ts`'s `Fixture:R2` symbol is transcribed from `Device:R` as embedded in
`circuits/transistor-preamp/loop-board.kicad_sch`, with the provenance and what was not
carried across stated in the module header.

**No AI attribution — CONFIRMED.** A case-insensitive grep over all three commit messages for
`co-authored`, `claude`, `generated with` and `session` returns nothing.

**UUIDs are derived, not random** (FNV-1a over fixture+item id), so the derived-artifact
comparison can be by content rather than by timestamp — the `CLAUDE.md` rule, honoured
deliberately with the reason in the comment. Noted approvingly.

---

## Findings

### Important

**I-1. The loosened assertion is now tautological, and the comment defending it is false.**
`/^line \d+: .*\S/` cannot fail for any possible `notOutput` entry, because `parseBlocks`
right-trims every line, so `first` is either a line guaranteed to contain non-whitespace or
the literal `(empty block)`. The comment's claim that *"A block whose first line were blank
or all spaces still fails"* is wrong — I drove both shapes and both pass under the old
pattern too. **Failure scenario:** a future change that genuinely does leave a block
unnamed in the report would not be caught by the case whose name says it catches exactly
that, and a reader who checks the comment is told a guard exists that does not.
*Settlement:* either restore a falsifiable form (e.g. assert `first` is one of the
document's actual block openers, or that no entry's name is `(empty block)`) or delete the
loop and let the accounting assertion carry the case — and correct the comment either way.
A less invasive route also existed and is not discussed: change the probe's own indentation,
which is this plan's sanctioned apparatus.

**I-2. `fixtures.test.ts`'s "RED: one digit changed in a committed fixture" is not a red
drive.** Its two load-bearing assertions — `expect(perturbed).not.toBe(text)` and
`expect(perturbed).not.toBe(rendered.get("a0-base"))` — are tautological once the preceding
`toContain` has passed. The test never calls the byte comparison whose failure path its
comment claims to drive (*"this drives the failure path rather than trusting that it
exists"*), and never reads the file from disk. **Failure scenario:** if the derived-artifact
comparison in the first test were weakened — compared after normalising whitespace, say —
this "RED" case would remain green and would still read as proof that a hand-edited fixture
fails. *Settlement:* drive the actual comparison, e.g. assert the perturbed text is not
equal to the committed bytes read from `FIXTURE_DIR`, or factor the comparison into a
predicate and assert it returns false. (The §5 RED cases in `document-pastes.test.ts` are
the right pattern: they call `verify` on the perturbed input and assert the failure's text.)

**I-3. The board-granularity population is still unrecorded and the plan's figure is wrong
in both number and unit.** §5 and G262 correct "three" to "12 of 48 blocks"; neither states
how many **boards** are blocked on a label. I computed it: **9 of 11**. **Failure scenario:**
the next agent reads the plan's *"three of eleven boards"*, or reads the corrected block
figure and cannot convert it, and under- or over-states how much of the mandate's schematic
class the label problem accounts for — which is the exact class of error that cost this plan
a day per `CLAUDE.md`. The figure is one a later reader needs and cannot re-derive without
re-running the probe and the declaration map, so `CLAUDE.md`'s recording rule binds.
*Settlement:* one sentence in **G262**'s Task 5 amendment giving the board count and naming
the two boards that are blocked elsewhere.

### Minor

**M-1. G269 under-counts its own phenomenon: 2 where the natural reading gives 3.** The
summary's `onlyDangling` test runs over `f124.residuals`, i.e. the **best-by-total**
candidate's problems, and for `transistor-preamp-loop/tp-follower` that candidate is the
**unperturbed** layout (best total 1 at the anchor's existing position), so its residue is
the original label overlap rather than a relocation's residue. Minimising total problems
among candidates that reach zero label problems gives **3** blocks whose residue is the
dangling end alone — `tp-leg-emitter-bypass`, `pultec-hi-boost-own` **and** `tp-follower`
(driven; `tp-follower` → `BUFFER_BASE at (2.54, 10.16) side left`, residue
*"wire 6 of tp-follower (net BUFFER_BASE) ends at (29.21, 17.78) touching nothing"*).
Conservative, so nothing is inflated. **Failure scenario:** a later agent sizing the
dangling-end obstacle from G269 plans for two blocks and meets three. *Settlement:* count
the residue of the best candidate **among those that clear every label problem**, or say in
the entry which object the 2 is a count of.

**M-2. "Freedom 4 alone: 0" is reported without noting that 6 of the 46 per-label freedom-4
sweeps had zero candidates.** The per-label log carries `0 candidate(s)` on those six; §5's
prose and its summary table do not, and the two blocks §5 paints in detail are not among the
affected label anchors. Freedoms 2 and 3 were never empty (grep: 0), and every one of the 12
blocks had at least one non-empty freedom-4 sweep, so the block-level verdict is **not**
vacuous — this is a disclosure gap, not a false green. **Failure scenario:** a reader takes
"freedom 4 buys nothing" as evidence against the freedom when for six anchors it was never
exercised.

**M-3. G262's Evidence bullet still describes the netlist-fact claim's standing as
unmeasured.** It reads *"The claim that a label's position is a netlist fact is `[CODE]` …
and is NOT a measurement of KiCad's behaviour"*, with no pointer to the Task 5 measurement
that now settles it. The entry's header and body are corrected, so no uncorrected
*assertion* survives, and the bullet's own hedge anticipates the correction. **Failure
scenario:** a reader who checks the Evidence bullet to see what grade of evidence the claim
has concludes the question is open.

**M-4. G259 now contradicts itself.** Its newly inserted discharge block is followed, 14
lines later, by two statements the same task falsified and did not update: *"Why it is open
because Task 5 has not run"* and, in its Verified bullet, *"nobody has driven a KiCad file
with a relocated anchor."* A linear reader meets the discharge first. **Failure scenario:** a
reader who greps for "has not run" or skims the bullets concludes Task 5 is outstanding.

**M-5. §5's and G270's statements of the same grep differ.** §5.1 says three terms and
mentions no control; G270 says four terms with a control term that matches. I re-drove all
four plus the control and both statements are true, but the prose should agree with the
entry that carries the evidence.

**M-6. G269 does not say its figure is under the production ruler only**, although §5.11 and
G262 clause (e) do for theirs. G269's qualitative half (KiCad accepts it, this repository
refuses via `danglingWireEnds`) is genuinely ruler-independent; the "2 of 12" is not.

**M-7. One quotation is truncated mid-sentence with substituted punctuation.** §5.1 quotes
Wolff Ch. 5 as *"Then we can view each river segment as a separate feature."* The source
reads *"…as a separate feature, and again use a general map-labeling algorithm to label as
many segments as possible."* The comma became a full stop and nothing marks the elision.
Nothing material turns on the omitted clause, and every other quotation I checked is exactly
verbatim. *Settlement:* an ellipsis.

**M-8 (observation, no action).** The `endLine` bound added inside the whole-document
notOutput test uses a bare `doc.indexOf(SECTION_5_HEADING)` with no refusal, unlike its
sibling `sectionFour`, which throws. If §5's heading vanished, `indexOf` returns -1 and the
filter admits every later block, so the pinned 8 goes red rather than silently passing — it
fails safe, so the asymmetry costs nothing today.

---

## What I confirmed versus relayed

**CONFIRMED by my own drive:** `kicad-cli` 10.0.5; all nine fixture exports (own parser,
direct CLI); each freedom's verdict; the negative control's both halves; the arms'
non-tautology via an off-wire arm; the fixture geometries by reading them; the probe's
byte-for-byte re-drive; 13/48/12 and the 12 blocked block names (own code, own naming test);
the re-grade control's discrimination in three directions; freedom 1's exhaustiveness and
its 5-of-12; the three-of-five and two-of-five sub-claims against the right object; 95
anchors and min 20 / p25 32 / median 80 / p75 120 / max 1000 and 95-of-95; the dangling-end
message against `wire-safety.ts:132-141`; all three source hashes and thirteen quotations
including Table 1's four counts; G270's grep with its control; the insertion-only hash; the
full `expect()` decomposition; the suite (3801/0/43614/353); typecheck; `make check`'s
redness and its pre-existing cause; the absence of dependency, `lib/`, `circuits/` and
attribution changes; the port-manifest entries; both halves of item A by construction and by
drive.

**RELAYING (not re-driven):** that the five Pultec `*-junction` rows are literally one block
declared five times (I observed their measurements are identical, which is strong but
indirect); G251's record that `make check` was already red before this branch (I confirmed
it is red now and that the named files are untouched here, not that it was red at every
earlier commit); §1's 13-of-15 and 4-of-8 survivor counts, which §5.11 cites and which
belong to an earlier task.
