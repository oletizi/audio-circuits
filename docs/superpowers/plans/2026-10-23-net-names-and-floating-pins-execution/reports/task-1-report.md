# Task 1 report — measure what KiCad accepts in a label, and whether synthetic names are ever drawn

**Status: DONE_WITH_CONCERNS.** Both named artifacts exist and are committed. The
one concern is not a defect in the work: **the boundary census is ZERO and that
refutes the spec's own stated mechanism**, so Task 3's brief and the spec's part 1
both now say something false, and Task 6 has a correction to carry.

- Commits: `95db940` (probe, four sheets, manifest entry), `1f2ae3e` (the
  committed run and `docs/known-gaps.md` **G277**). Pushed to
  `feature/schematics-tooling`.
- Suite: `SCHGEN_SOURCE=… bun test` → **3812 pass / 0 fail / 43602 `expect()`
  across 353 files**, unchanged from the plan's baseline. No term moved, and
  none could: the change adds no test file, and a probe runs no assertions.
- `bun run typecheck` → clean (`tsc --noEmit`, no output).
- `make check` not run and not touched; it is red on four boards for **G251**,
  pre-existing and not this task's.
- Production code changed: **none.** Nothing under `lib/`, `circuits/`,
  `boards/`, or `Makefile` was touched.

---

## Artifact 1 — `LABEL SYNTAX`

`tools/schgen/label-syntax/probe.ts`, run committed at
`tools/schgen/label-syntax/probe-run.log` (the run was taken at `95db940` on a
clean tree, against `kicad-cli` **10.0.5** resolved through
`lib/kicad/netlist.ts`'s `KICAD_CLI` to
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`).

| candidate | from | parsed | round trip byte-identical | PDF outline drawn | outline along x |
| --- | --- | --- | --- | --- | --- |
| `SIGNAL` (control) | `tools/schgen/label-freedom/fixtures.ts` | YES (exit 0) | YES | YES | 10088.2 um |
| `hi_boost_out` | `circuits/pultec/electrical/mid.ts:28` | YES (exit 0) | YES | YES | 15470.2 um |
| `Net-(C10-Pad1)` | `circuits/pt2399-core/pt2399-core.ts:128` | YES (exit 0) | YES | YES | 20006.2 um |
| `unconnected-(U1-CLK_O-Pad5)` | `circuits/pt2399-core/pt2399-core.ts:147` | YES (exit 0) | YES | YES | 35125.1 um |

**The exact bytes the writer emitted for each name**, so a quoting difference is
visible rather than inferred:

| candidate | writer bytes | hex | escaped? |
| --- | --- | --- | --- |
| `SIGNAL` | `"SIGNAL"` | `225349474e414c22` | no |
| `hi_boost_out` | `"hi_boost_out"` | `2268695f626f6f73745f6f757422` | no |
| `Net-(C10-Pad1)` | `"Net-(C10-Pad1)"` | `224e65742d284331302d506164312922` | no |
| `unconnected-(U1-CLK_O-Pad5)` | `"unconnected-(U1-CLK_O-Pad5)"` | `22756e636f6e6e65637465642d2855312d434c4b5f4f2d506164352922` | no |

**The bytes are the production writer's, not the probe's imitation.** The name
goes into the sheet through `lib/kicad/sexpr.ts`'s `quoteString`, which is what
`lib/schgen/render/sexpr-write.ts`'s `str()` calls and therefore what
`lib/schgen/render/emit-items.ts`'s `globalLabel` would emit for a net name.
`quoteString` escapes only `\` and `"`; no candidate holds either, so all four are
written verbatim between quotes. `str()` adds one check `quoteString` does not —
it refuses a control character — and **no candidate exercised it.**

**KiCad wrote the same bytes back.** Two independent reads agree per candidate:
the raw `(name …)` atom in the exported `kicadsexpr` netlist, matched against the
writer's bytes as a string; and `importNetlist`'s parsed name, compared with
`Buffer.equals` against the input. Both YES on all four. **KiCad neither
re-quoted nor renamed anything**, so two of the spec's three outcomes for part 1
are off the table: there is no escaping for a writer to learn and no rename for a
round-trip gate to absorb.

**What "renders" means here, and why it is a measurement rather than a file
check.** The PDF carries stroked glyph paths and no readable string, so the only
thing that can separate a drawn name from a truncated or mangled one is the label
outline's extent. The probe finds the one closed seven-point path whose box holds
the label anchor and reports its along-x extent; those grow strictly with
character count (6 → 10088, 12 → 15470, 14 → 20006, 27 → 35125 um). A name KiCad
had silently shortened would have shown as an outline that stopped growing.

**Methodological points, each a deliberate choice:**

- **PDF and the netlist, never SVG.** **G265** clause 1 records that `sch export
  svg` at 10.0.5 omits a global label's outline, under-reporting it by the whole
  3333.75 um. No measurement here goes through SVG.
- **`kicad-cli` is resolved, never assumed on `PATH`**, and the probe **throws**
  naming `lib/kicad/install.ts` if the binary is absent. A skipped measurement
  does not look like a passing one.
- **The predictions are printed by the program, before any `kicad-cli` call**
  (**G271**), with their provenance: the four candidate predictions are the
  brief's, the census prediction is the spec's, and the log states plainly that a
  prototype of the netlist and census paths was run while writing the probe and
  that **no prediction was revised after it.** The refuted one is left standing as
  written.
- **The control could have failed.** `SIGNAL` is the one candidate `NET_NAME`
  already accepts; had it not parsed, round-tripped and drawn, every other row
  would have been a fact about this probe's sheet rather than about a net name.
- **The sheets are committed and deterministic.** UUIDs are derived from the
  sheet and item name, so the probe writes identical bytes on every run. A re-run
  after the commit reported all four sheets `unchanged on disk` and produced a log
  identical to the committed one apart from the recorded commit SHA. Nothing of
  this task's evidence lives in a scratch directory.

---

## Artifact 2 — `BOUNDARY CENSUS`

**ZERO.** Over all eleven boards under `boards/`, **16 synthetic net names exist
in the models and 0 of them reach a global label.** All sixteen are on
`pt2399-core`.

| board | blocks | nets | synthetic names | nets reaching a label | synthetic reaching a label |
| --- | --- | --- | --- | --- | --- |
| `pt2399-core` | 1 | 21 | 16 | 0 | **0** |
| `pultec-hi-boost` | 6 | 20 | 0 | 4 | 0 |
| `pultec-hi-cut` | 6 | 14 | 0 | 4 | 0 |
| `pultec-low-boost` | 6 | 14 | 0 | 4 | 0 |
| `pultec-low-cut` | 6 | 14 | 0 | 4 | 0 |
| `pultec-mid` | 6 | 28 | 0 | 4 | 0 |
| `transistor-preamp-buffered` | 6 | 13 | 0 | 4 | 0 |
| `transistor-preamp-feedback` | 5 | 11 | 0 | 3 | 0 |
| `transistor-preamp-lab` | 7 | 18 | 0 | 5 | 0 |
| `transistor-preamp-loop` | 7 | 16 | 0 | 6 | 0 |
| `transistor-preamp-staged` | 8 | 22 | 0 | 6 | 0 |

**Why this is a census and not a sample.** `lib/schgen/render/emit.ts:171` is the
repository's only `globalLabel` call site; its `labels` come from
`render/sheets.ts:77`'s `anchorsToSymbols`; and `power-text.ts`'s `labelRefsOf`
**throws** for an anchor net that is not in the block's `labelRefs`, which
`render/blocks.ts`'s `subgraphOf` builds from `external` alone. So a block's
`external` set is the complete set of names that can become a label, and the probe
counts over it for every block of every board. Rails are counted separately: a
rail reaches a **power symbol**, never a label
(`cross-sheet.ts`'s `MECHANISM_OF_CLASS`).

**The prediction was NON-ZERO, it was the spec's, and its mechanism is wrong.**
The spec's part 1 says of `pt2399-core` that *"the synthetic name becomes a label
only because of the fake port, since ports are boundary nets"*. **A declared port
does not make a net a label.** `buildCircuit` sets `offSheet: new Set<NetName>()`
unconditionally (`lib/schgen/ir/build.ts:152`; the field's own comment at
`lib/schgen/ir/types.ts:300-305` says only a sheet subset ever has any), so
`ir/classify.ts`'s `labelledNets` labels a net only when it is a rail, touches more
than one block, or touches a `bus` block. **`pt2399-core` is ONE block** (`pt-core`,
rendering `auto`), so none of its sixteen synthetic names is labelled with or
without the fake `clk_o_unused` port. The spec's **conclusion** for that circuit
survives and is stronger than it claimed; its **reason** does not.

**What zero means, and what it does not licence.** The punctuation half of the
`netNames` refusal blocks **no board in this repository today**, so Task 3 does not
need to wait on KiCad: the `LABEL SYNTAX` rows are a standing answer rather than a
precondition. It does **not** mean the names are harmless — they are still in the
model, still reach the netlist comparison, and **would reach a label the first time
a block boundary fell between two pins of one of them**, which is a layout decision
nobody has made rather than an invariant. A gate relaxed on the strength of a zero
census would be relaxed on the strength of today's block partitions.

**Adjunct, not asked for and the place the rule actually costs something: 20
labelled nets fail `NET_NAME`, all five on the Pultec boards, zero elsewhere.** Each
Pultec board draws exactly `hi_boost_out`, `in`, `lo_boost_in` and `out`;
`pt2399-core` and the five transistor-preamp boards draw none that `NET_NAME`
refuses. The rule's two halves split cleanly over the corpus — **case** binds on 20
real labels, **punctuation** on none.

---

## What Task 3 should take from this

1. **Nothing is blocked on KiCad.** Both synthetic shapes are accepted verbatim,
   round-trip byte-identical and draw. The spec's third outcome (rename the nets)
   is excluded and its second (teach the writer to escape) is excluded too.
2. **The replacement predicate does not need a KiCad-derived character class.**
   This run establishes that KiCad requires nothing of these four names, so the
   spec's *"a non-empty string, plus whatever part 1 establishes KiCad requires"*
   reduces to **a non-empty string** on the evidence here. That is a conclusion
   from four names and not a proof over all strings; Task 3 should state it that
   way.
3. **The spec's part 1 and the review's finding 3 both need the correction in
   G277 clause 3** carried into whatever Task 6 amends. The sentence about ports
   being boundary nets is false at the IR level.
4. **`transistor-preamp-lab`'s declaration entry is `transistorPreampLab()`**, not
   `transistorPreamp()`; `declarationFor` matches on the builder (G247). Worth
   knowing before a later task greps for the board by directory.

## Deviations from the brief, and why

- **One manifest entry, not two.** The brief and the plan's File Structure table
  both say the **two** new `.ts` paths go in `handWritten`. Only `probe.ts` is a
  `.ts` path. `tests/schgen/port-fidelity.test.ts`'s completeness check compares
  the manifest's union against `listTsFiles`, which enumerates `.ts` only, so
  declaring `probe-run.log` fails its `accountedButMissing` assertion naming the
  log. Recorded as **G277** clause 6. The four committed sheets need no entry for
  the same reason.
- **Four sheets committed under `tools/schgen/label-syntax/sheets/`**, beyond the
  brief's file list. The brief required the run be re-drivable from the committed
  tree, and `tools/schgen/label-freedom/fixtures/` is the precedent: the sheets are
  inspectable, built deterministically from committed code, and compared by content
  (SHA-256, `unchanged on disk`) rather than by timestamp.
- **`exportPdf` from `tools/schgen/kicad-run.ts` rather than `pdf-probe.ts`'s
  `pdfPathsOf`.** The latter spawns `kicad-cli` directly; `exportPdf` goes through
  the hermetic configuration every other `kicad-cli` call in this repository uses
  and refuses when KiCad did not take its settings from it. The committed PDF
  parser `pdfPaths` is reused unchanged.
- **A local `outlineHolding` instead of `pdf-probe.ts`'s `labelOutlineNear`.** The
  latter requires every point of the path to lie within one radius of the anchor,
  and a 27-character name's outline (35.1 mm) is wider than the two labels on the
  sheet are apart. `outlineHolding` matches on the box containing the anchor and
  refuses on none or more than one, which is the same discipline.

## Concerns

1. **The refuted prediction is the headline and it is somebody else's text to
   fix.** G277 records it; the spec and the Task 3 brief still carry the wrong
   mechanism. I did not edit the spec — Task 1 is a measurement task and the spec
   is approved — but a Task 3 implementer reading the spec rather than the register
   will reason from a false premise.
2. **The census is a property of today's block partitions.** It is the kind of
   zero that invites somebody to conclude more than it supports. G277 clause 4
   states the limit explicitly, and its MECHANISM (a test that fails on a non-zero
   census) is marked **untried** and left undone on purpose: whether a non-zero
   census should refuse or merely report is an acceptance criterion, and
   `CLAUDE.md` forbids the producing agent from authoring one.
3. **`probe.ts` is 480 lines.** Under `CLAUDE.md`'s 300-500 ceiling, but near the
   top of it, and **G255** records this branch's history of files drifting past
   that line. Most of it is the header and the per-candidate provenance; it is one
   file because the manifest's shadowing rule makes every extra `.ts` under
   `tools/schgen/` a declaration.
4. **`make check` was not run.** It is red on four boards for **G251** and the plan
   puts it out of scope; this task changed nothing it exercises.

---

# Round 1 — fix round, PASS WITH FINDINGS

Coordinator verdict: **PASS / PASS WITH FINDINGS, no Critical, no finding changes
a number.** Five items. Commits `863ef9c` (probe and register) and `7f3b84c` (the
regenerated log, taken at `863ef9c` on a clean tree). **Suite 3812 pass / 0 fail / 43602 `expect()` across 353
files** — unchanged, as expected for a comment-and-register change. `bun run
typecheck` clean. **Every figure in round 0 stands**: 4/4 candidates parse,
round-trip and draw; the census is 0; the adjunct is 20.

## IMPORTANT 1 — the false call-site claim, corrected in both places

**`emit.ts:171` is NOT the only `globalLabel` call site in the repository.**
`[RAN]` `grep` finds **three**:

| site | net it passes | can it carry a board net? |
| --- | --- | --- |
| `lib/schgen/render/emit.ts:171` | `d.labels` from a `SheetDrawing` | **yes — this is the one** |
| `tools/schgen/text-metrics/svg-probe.ts:123` | `row.net`, that probe's own corpus | no, and it consumes no `SheetDrawing` |
| `tests/schgen/render/emit-refusals.test.ts:91` | the literal `"SIG"` | no, same |

**Narrowed to:** *"`lib/schgen/render/emit.ts:171` is the only `globalLabel` call
site under `lib/`, and the only one anywhere that takes its nets from a board's
`SheetDrawing.labels`."* Both narrowings are establishable and the sentence makes
both: the first is the grep-checkable one, the second is what the census argument
actually needs.

**The conclusion is untouched and the claim was corrected anyway**, which is the
point worth keeping: this is the **first link** of the argument that makes the
census complete, so a later agent who greps, finds three and takes the old
sentence at its word would **discard a correct zero**. Fixed at `probe.ts`'s
header and in **G277** clause 2, each carrying the three sites and why the other
two cannot matter.

## IMPORTANT 2 — the newline, which refutes a sentence in my own round-0 report

No action was asked and the plan is already corrected; the measurement is now in
the register so Task 3 takes it from there rather than from a task report. The
reviewer perturbed `CANDIDATES` with three of its own and re-ran the committed
probe:

| perturbation | result |
| --- | --- |
| `BAD"QUOTE` | `escaped YES` with the escaped hex shown; parses, round-trips |
| `BACK\SLASH` | `escaped YES`, same |
| a RAW NEWLINE | **`kicad-cli` exit 3**, *"Failed to load schematic"* — parsed NO, round-trip NO, PDF NO, outline 0.0, growth invariant on its negative branch |

**My round-0 report said the predicate *"reduces to a non-empty string on the
evidence here"*. That is wrong.** A raw newline is non-empty and KiCad refuses the
sheet; the only thing in the tree stopping one today is `str()`'s
control-character guard at `lib/schgen/render/sexpr-write.ts:32-33`, which fires
at **emit**, downstream of the validator the owner's ruling is about. Recorded as
**G277** clause 7, with the consequence spelled out: the minimum predicate is
**non-empty AND free of control characters**, or `str()` named as the clause that
carries it.

It also forced a second correction I had not flagged: **clause 1's "the writer
escapes nothing" is a fact about those four names, not about the writer.**
`quoteString` does escape `\` and `"`; the four candidates hold neither, and the
perturbation shows the log reporting `escaped YES` correctly when there is
something to escape.

**Five axes each driven to their opposite in one run** — parsed, round-trip, PDF,
outline, and the derived growth invariant. That is a stronger statement about the
probe than anything in round 0: the columns are not constants.

## IMPORTANT 3 — the zero was made to count, and re-derived by a second route

Both the reviewer's, both recorded as **G277** clause 8, both **RELAYED**:

- **the counter counts.** Splitting `pt-core` into two blocks moved the census
  **0 → 1**, named `Net-(C10-Pad1)`, fired the **CONFIRMED** branch of the
  prediction line instead of REFUTED, and moved the adjunct **20 → 21**.
- **a different route agrees.** `labelledNets` from `lib/schgen/ir/classify.ts`,
  read directly rather than through `subgraphOf`'s `external`, gives **0 and 20**
  with the per-board sets identical name for name.
- **and an empirical proof of clause 3 I had argued only from source**:
  `pt2399-core` declares **six** negotiable ports and the census still prints
  `reaches a label: (none)`.

**G277's criteria for clauses 2 and 5 now name the `classify.ts` route as the
settlement**, because it does not go through the artifact the entry is about; the
probe run is the convenient one. The clauses say plainly that the reviewer's
perturbations are **not in the committed tree**, so a later agent wanting them
must re-make them.

## Four minors, all addressed

1. **Clause 5's criterion named only the probe** → now names the `classify.ts`
   re-derivation as the settlement, with the probe as the convenience.
2. **`Buffer.equals` implied more than it establishes** → the comment now says it
   is a UTF-8 octet comparison and **no stronger than `===` for these four ASCII
   names**, written that way only so a non-ASCII candidate would still compare as
   octets, and establishing nothing about normalisation. The log line now reads
   *"parsed name identical to the candidate constant, octet for octet"*, and the
   comment states that both routes compare against the candidate constant rather
   than against each other, so neither can agree with itself.
3. **`rendered: false` does not cover mangling** → documented on the field: it is
   false only when no PDF file appeared, and a mangled label (no outline at the
   anchor, or two) **throws out of `outlineHolding`** so the verdict table is never
   printed. That is the loud arm and is deliberate; what separates a drawn name
   from a truncated one is `along`, through the growth test.
4. **What is production's and what is not** → the disclosure now separates them in
   one place: the **name atom's bytes are production's** (`quoteString`, the same
   function `str()` calls), while the **surrounding `(global_label …)` form is
   not** — it skips `str()` (so that control-character guard is not in this path)
   and omits the `(property "Intersheetrefs" …)` node production always emits.

## One thing the round-1 edits broke and I fixed

**`probe.ts` reached 524 lines** on these additions — **over `CLAUDE.md`'s 500
ceiling**, and exactly the drift **G255** records for this branch. Compressed back
to **498** by rewrapping and tightening prose. **No disclosure was dropped to get
there**; the cuts are all re-flowed paragraphs and two collapsed `log()` calls.
This is worth stating because the obvious way to make a line count is to delete
the thing a reviewer asked for.

## Residual concerns after round 1

1. **Clauses 7 and 8 are RELAYED and their evidence is not in the tree.** The
   reviewer's three perturbed candidates and its two-block split are not committed
   anywhere. The entry says so. Adding them to `CANDIDATES` would have been the
   stronger move and I did not, because the newline arm ends the run on a
   `kicad-cli` exit 3 and whether this probe should carry a candidate that halts
   it is a design question for the probe's consumer, not mine to settle while
   fixing a review.
2. **The spec still carries the wrong mechanism** (round-0 concern 1, unchanged).
   The register now corrects it twice over — argued from source in clause 3, driven
   in clause 8 — but a Task 3 implementer reading the spec rather than
   `docs/known-gaps.md` still meets the false premise first.
3. **`probe.ts` is 498 of 500 permitted lines.** Any further prose added to it has
   to come with a split, and a split means a second `handWritten` manifest entry.

---

# Round 2 — negative control and the split

Commits `d0b9f5d` (split, six control arms, sheets, manifest), `957613a` (G277
clauses 9 and 10, and the NUL fix), `66c7f31` (regenerated log at `957613a`,
clean tree). All pushed. **Suite 3812 pass / 0 fail / 43602 `expect()` across 353
files** — unchanged. `bun run typecheck` clean. **Every round-0 figure stands:**
candidates 4 parsed / 4 round-tripped / 4 drew an outline; boundary census **0**;
adjunct **20**.

**Line counts after the split: `probe.ts` 435, `fixtures.ts` 238** (at `66c7f31`;
both grew a little after the split commit, from threading `repoRoot` into the PDF
refusal and from clause 10's `NUL` comment). No prose was compressed to reach
them, and both are comfortably inside `CLAUDE.md`'s ceiling.

## What the newline arm actually does — my round-1 reason was wrong

**It does not halt the run.** I asserted it did, and declined to commit a failing
arm on that basis. Driven: `measureArm` returns a full failure row on a non-zero
netlist exit, the PDF attempt is caught and its exit reported, and the run reaches
its summary. The coordinator's reviewer was right and both of its reports were
consistent all along; mine was the inconsistent one.

The general rule is worth more than the correction: **a measurement with a
positive control and no negative control is an incomplete instrument, not a design
choice — and a stated reason for leaving one out is itself a thing to drive.**
Recorded in **G277** clause 9 and in `probe.ts`'s header, attributed to the
review, with the error marked as mine.

## The six committed control arms, and the finding they produced

| arm | net | escaped | parsed | round trip | outline | what KiCad did |
| --- | --- | --- | --- | --- | --- | --- |
| `ctl-double-quote` | `BAD"QUOTE` | YES | YES | YES | 14261.0 um | escaped both sides, name intact |
| `ctl-backslash` | `BACK\SLASH` | YES | YES | YES | 15168.2 um | escaped both sides, name intact |
| `ctl-tab` | `RAW<TAB>TAB` | NO | YES | YES | 11660.5 um | **tab taken and written back verbatim** |
| `ctl-newline` | `RAW<LF>NEWLINE` | NO | **NO** | NO | 0.0 um | exit 3, no netlist, no PDF |
| `ctl-carriage-return` | `RAW<CR>CR` | NO | YES | **NO** | 10995.3 um | **exit 0, name comes back `RAWCR`** |
| `ctl-nul` | `RAW<NUL>NUL` | NO | YES | **NO** | 7366.7 um | **exit 0, name comes back `RAW`** |

All six pins held. **The two silent arms are the finding and the newline is the
least dangerous of the three.** CR and NUL both export at **exit 0**, both draw a
label outline, and both hand back a net name that is not the one the sheet
carried — a silent drop and a silent truncation. A check that asked only whether
`kicad-cli` succeeded would pass both, which is the silence-that-resembles-success
`CLAUDE.md` names as the failure mode the workflow exists to prevent, occurring in
the one place a net name becomes a label.

**`ctl-tab` is the discriminator and it is why the other three are
attributable.** A tab is codepoint 9, inside the class `str()` refuses, and KiCad
takes it verbatim — so *"a control character breaks a net name"* is **false**. The
newline breaks the s-expression's line structure; CR and NUL break KiCad's string
reader. `str()`'s blanket refusal of the whole C0 range is **wider than KiCad
requires**, which is the safe direction and **not a recommendation to narrow it.**

**It sharpens what Task 3 needs.** The predicate must refuse control characters
**not because KiCad rejects them — it mostly does not — but because KiCad silently
accepts two of them and corrupts the name.** That is a better sentence for a
refusal message than clause 7's.

The arms are `CONTROLS`, not `CANDIDATES`, so an expected failure is never read as
a regression; each carries a **PINNED** expectation rather than a prediction,
because they were established by a scratch drive and **dressing a pinned result up
as foresight is what G271 exists to prevent**; and a summary line asserts that one
run produced a pass, a loud failure and a silent rename together.

## The split, on the seam the review named

| file | responsibility | lines |
| --- | --- | --- |
| `tools/schgen/label-syntax/fixtures.ts` | the arms (`CANDIDATES`, `CONTROLS`), the embedded symbol, derived UUIDs, `render` | 238 |
| `tools/schgen/label-syntax/probe.ts` | the `kicad-cli` drives, the PDF/netlist readers, the census, all reporting | 435 |

**The test of the seam**, stated in `fixtures.ts`'s header: that file answers
*"what is measured and what does it look like on a sheet"* with no `kicad-cli`
call in it, and `probe.ts` answers *"how is it driven and what is reported"* with
no s-expression in it. Both declared `handWritten` in
`tools/schgen/port-manifest.json`; the log is not a `.ts` path, as round 1
established. `tests/schgen/port-fidelity.test.ts` green on both entries (12 pass).

## Two defects found and fixed in passing

1. **`exportPdf`'s refusal names the sheet by absolute path**, so the committed log
   carried *this* checkout's path and could not be compared against another's —
   which is the whole re-drivability property the probe claims. The repo root is
   now stripped to `<repo>/`.
2. **A raw NUL byte landed in `docs/known-gaps.md` in round 1 and I did not
   notice.** Clause 7 spelled the C0 range as a bracketed escape pair; the escape
   did not survive as text and arrived as two literal bytes. **That makes `grep`
   treat the whole register as binary and suppress every match in it** — and this
   repository's practice is to find things in that file by grepping it. A piped
   `git show -- docs/known-gaps.md | grep` produced no output at all. Fixed in
   prose there, and in `fixtures.ts` by building the NUL from
   `String.fromCharCode(0)` with a comment saying why. **Neither committed text
   file now holds a control byte outside tab, CR and LF — checked by counting
   bytes, not by reading**, because the failure is invisible in a rendered diff and
   silences the tool you would check it with. The probe's log is byte-identical
   before and after, so no measurement moved. **G277** clause 10.

## Verified after the split

- All **ten** sheets report `unchanged on disk` on a re-run after commit, so the
  control-character sheets — including the raw NUL and the lone CR — round-trip
  through git byte-exactly. No `.gitattributes`, `core.autocrlf` unset.
- The log records `957613a (clean tree)`.
- The four candidate sheets show as *modified* in `d0b9f5d` rather than untouched:
  `render`'s item ids changed (`cand-*` → `arm-*`), which changes their derived
  UUIDs. That is the content comparison working, not drift.

## Residual concerns after round 2

1. **Clause 8 is still RELAYED and its evidence is still outside the tree** — the
   block split that moved the census to 1, the `classify.ts` re-derivation and the
   six negotiable ports. The syntax half of this entry now has both controls
   committed; the census half's strongest check does not. **G277**'s Verified
   bullet states that asymmetry rather than hiding it. Committing a census
   counter-arm would mean a fixture circuit with two blocks over a synthetic net,
   which is a bigger piece of apparatus than this round's remit.
2. **Nothing scans for a stray control byte in a committed text file**, so clause
   10's defect will recur. The criterion says so and marks the repo-wide byte scan
   **untried**.
3. **The pins are not asserted by a test.** Clause 9's MECHANISM is marked untried
   for the same reason as clause 2's: whether a moved pin should refuse or merely
   report is an acceptance criterion, and `CLAUDE.md` reserves those away from the
   agent that produced the artifact.
