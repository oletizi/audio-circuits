# Task 1 review — the label-syntax probe and the boundary census

**SPEC COMPLIANCE: PASS.**
**TASK QUALITY: PASS WITH FINDINGS** (two Important, four Minor; no Critical).

Reviewed at HEAD `3b8dec3`, BASE `2758137`, worktree
`/Users/orion/work/audio-circuits-work/pultec-modularize`, branch
`feature/schematics-tooling`.

Every claim below is marked **CONFIRMED** (driven or read here) or **RELAYING**
(the implementer's report, not re-driven). Nothing in this document rests on the
report alone unless it says RELAYING.

## Headline

The probe is **not** a probe that cannot fail. I perturbed it with three
candidates the writer or KiCad must treat differently, and it reported all three
differently on exactly the axes it claims to measure — including flipping its
outline-growth invariant to its negative branch and reporting `PARSED: NO` with
`kicad-cli` exit 3. The four-by-four table of passes is a real result.

The census of zero is a **real zero, not a broken counter**. I made the counter
count: splitting `pt2399-core` into two blocks moved it to 1, named the net, and
fired the `CONFIRMED` branch of the prediction instead of the `REFUTED` one.

The refutation of the spec's mechanism is **correct**, independently, from the
code and from a second direction the implementer did not use.

---

## A. THE FOUR-BY-FOUR RESULT TABLE — CONFIRMED, and it survives attack

### A.1 Re-drive from the committed tree — CONFIRMED

`[RAN]` `bun run tools/schgen/label-syntax/probe.ts` at `3b8dec3` on a clean
tree. `diff` against the committed `probe-run.log` returns **exactly one changed
line**: the recorded commit SHA (`95db940…` → `3b8dec3…`). All four sheets
reported `unchanged on disk`, and the probe left `git status --porcelain` empty.

`[RAN]` The four sheet SHA-256s **printed in the committed log** are the
on-disk sheets':

| sheet | log says | `shasum -a 256` says |
| --- | --- | --- |
| `control-upper-snake` | `5027a2ef…` | `5027a2ef…` ✓ |
| `lowercase-authored` | `df7b2016…` | `df7b2016…` ✓ |
| `synthetic-net-paren` | `d93cab33…` | `d93cab33…` ✓ |
| `synthetic-unconnected` | `c9be9b75…` | `c9be9b75…` ✓ |

So the log is a run of the committed code against the committed sheets, and the
figures 10088.2 / 15470.2 / 20006.2 / 35125.1 µm reproduce.

### A.2 THE ATTACK: three candidates that MUST be treated differently — CONFIRMED, all three were

`[RAN]` I perturbed `CANDIDATES` in `probe.ts` with three reviewer candidates
and re-ran the whole probe. What I drove and what happened:

| candidate I added | why it must differ | what the probe reported |
| --- | --- | --- |
| `BAD"QUOTE` | `quoteString` escapes `"` | **`quoteString escaped anything: YES`**, writer hex `224241445c2251554f544522` — the `5c22` escape is visible. Parsed YES, round-trip YES, outline 14261.0 µm |
| `BACK\SLASH` | `quoteString` escapes `\` | **`quoteString escaped anything: YES`**, writer hex `224241434b5c5c534c41534822` — `5c5c`. Parsed YES, round-trip YES, outline 15168.2 µm |
| `LINE<LF>BREAK` (a raw newline) | a control character `quoteString` does **not** escape | **`kicad-cli sch export netlist: exit 3`**, **`PARSED: NO. stderr: Failed to load schematic`**, round-trip NO, PDF NO, outline 0.0 µm |

And the derived invariant flipped with it:

> `THE OUTLINE DOES NOT GROW STRICTLY WITH THE NAME, so at least one name is not
> drawn at its full length and "renders" cannot be read as "the whole name is on
> the sheet".`

That is the negative branch of the sentence the committed log prints in the
affirmative. **So neither the `escaped?` column, nor `parsed`, nor
`round-tripped`, nor `rendered`, nor the outline-growth conclusion is true by
construction.** Every one of the five was driven to its other value in one run.

I restored `probe.ts` and deleted the three perturbation sheets;
`shasum -a 256` matches the baseline (`f9afed73…`).

### A.3 Does the probe exercise the production path? — PARTLY; disclosed, and it matters less than it looks

`[READ]` The chain the probe claims is real:
`emit-items.ts:227 globalLabel` → `str(l.net)` (`sexpr-write.ts:31`) →
`atomText` (`:71`) → `quoteString` (`lib/kicad/sexpr.ts:147`), whose body is
exactly `"${value.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"`. The probe calls
`quoteString` directly, so **for the name atom it emits the production bytes.**
CONFIRMED.

Two real gaps, both disclosed by the probe's header and by **G277**:

- the probe does **not** go through `str()`, so `str()`'s control-character
  refusal (`sexpr-write.ts:32`) is never exercised. The probe says so; my
  newline candidate shows what that guard is for. **Minor 1.**
- the probe hand-writes the `(global_label …)` form rather than calling
  `globalLabel()` and `print()`. Production's label also carries a
  `(property "Intersheetrefs" …)` child the probe's sheet omits. The measured
  question (what KiCad does with the characters in the *name*) is unaffected,
  but `tools/schgen/text-metrics/svg-probe.ts:123` shows the real emitter *can*
  be called from a probe, so this was a choice rather than a necessity.
  **Minor 2.**

### A.4 Is "round-tripped byte-identical" comparing the right two things? — CONFIRMED yes

`[READ]` `probe.ts:282` `rawHit = raw.includes(quoted)` compares atoms parsed
out of **KiCad's exported netlist** (`rawNetNameAtoms`, over the text after
`(nets`) against `quoteString(c.net)` computed from the **candidate constant**.
`probe.ts:285` `byteHit` compares `importNetlist(netlist).nets`' keys against
`c.net`. Two independent sources in both cases — not a value against itself. And
A.2 proves it: the newline candidate reported NO.

**Minor 3:** `Buffer.from(n,"utf8").equals(Buffer.from(c.net,"utf8"))` is not
stronger than `n === c.net` for any input this probe can produce, so
"byte-identical" is a cosmetic framing rather than a stronger comparison. It
catches nothing a string compare would miss. Harmless.

### A.5 Does the control discriminate? — CONFIRMED

`SIGNAL` is the one candidate `NET_NAME` (`/^[A-Z0-9][A-Z0-9_]*$/`,
`ir/types.ts:55`) already accepts, and the probe prints a `CONTROL FAILED`
branch that says in terms that nothing may be read as a fact about KiCad if it
fires. A.2 establishes that branch is reachable: the same three reporting slots
the control is judged on all reported failure for my newline candidate.

### A.6 One behaviour of `outlineHolding` worth knowing

`[READ]` `rendered: false` is only reachable when the PDF file is **absent**
(`probe.ts:291-293`). If KiCad produced a PDF but drew no label (or two
ambiguous ones), `outlineHolding` **throws** and the verdict table is never
printed. That is loud, not silent — it is the right side of the repository's
rule — but a reader should know the "PDF outline drawn NO" cell cannot be
reached by a drawn-but-mangled label. **Minor 4.**

---

## B. THE BOUNDARY CENSUS OF ZERO — CONFIRMED a REAL ZERO

### B.1 I made the counter count — CONFIRMED non-zero on a forced case

`[RAN]` I perturbed `circuits/pt2399-core/schematic/authoring.ts` to split
`pt-core` into two blocks (moving `output_coupling_cap`, which shares
`Net-(C10-Pad1)` with `output_mix_resistor` and `output_node_filter_cap`, into a
second block) and re-ran the unmodified probe:

```
pt2399-core   2 block(s), 21 net(s), 16 synthetic net name(s), 2 net(s) reaching a label,
              SYNTHETIC NAMES REACHING A LABEL: 1 (Net-(C10-Pad1))
BOUNDARY CENSUS: over 11 boards, 16 synthetic net name(s) exist in the models and 1 of them reach a global label.
THE BOUNDARY-CENSUS PREDICTION PUBLISHED ABOVE IS CONFIRMED: at least one synthetic name reaches a label.
THE CENSUS IS 1, so punctuated names DO reach a sheet and the kicad-cli rows above are a precondition rather than a standing answer.
```

The adjunct moved with it, 20 → 21, naming `Net-(C10-Pad1)` on `pt2399-core`.
**Both the census counter and the `CONFIRMED`/`REFUTED` branch are live.** This
is not "a loop over an empty range": the loop ran over 11 boards in both runs
and produced a different number when the input changed.

I restored `authoring.ts`; `git status --porcelain` is empty.

### B.2 I re-derived the zero by a different route — CONFIRMED, identical

`[RAN]` A reviewer script (`independent-census.ts`, scratchpad only, not in the
repo) that deliberately takes the **other** path: it calls
`labelledNets` from `lib/schgen/ir/classify.ts` **directly** and subtracts
`c.rails` itself, where the probe unions `subgraphOf(...).external` from
`lib/schgen/render/blocks.ts`. Result:

```
INDEPENDENT CENSUS (classify.ts route): synthetic names reaching a label = 0
INDEPENDENT ADJUNCT (classify.ts route): labelled nets failing NET_NAME = 20
BOARDS WITH A DECLARATION: 11
```

Per-board labelled sets are identical to the committed log's, name for name. So
the figures are not an artefact of either route.

### B.3 The census-not-sample argument — CONFIRMED, and **stronger** than G277 argues

`[READ]` The chain holds:

- `lib/schgen/render/emit.ts:171` `d.labels.map((l) => globalLabel(id, l))` is
  the only place a `SheetDrawing`'s labels become sheet items;
- `SheetDrawing.labels` (`sheet-types.ts:74`) is populated **only** at
  `sheets.ts:197` from `a.labels`, which `arrange` fills at **`sheets.ts:77`**
  from `anchorsToSymbols`. I checked the other seven `anchorsToSymbols` callers
  (`frames.ts:84`, `drawn-extent.ts:40`, `field-placement.ts:282`,
  `layout-check.ts:179/185`, `bus.ts:107`, `opamp-stage.ts:75`) — none feeds a
  `SheetDrawing`; `frames.ts:84`'s labels go to `drawnBoxes` for extent only;
- `power-text.ts:39-43` `labelRefsOf` **throws** for a net not in
  `labelRefs`, which `blocks.ts:103-107` builds from `external` **alone**.

**And one step further, which G277 does not claim and which makes the figure
exact rather than an upper bound.** `labelRefsOf`'s throw only bounds the set
from above (an anchor outside `external` is impossible). The other direction is
`lib/schgen/render/layout-check.ts:134-138`: for every net of a connected
component that is a rail **or external**, a layout with no anchor for it reports
`piece of net N … has no label or power symbol`; and `anchorProblems` (`:159`)
refuses an anchor on an internal net. So for any layout the generator accepts,
`external` is **exactly** the non-rail nets drawn as global labels. The census
and the 20 are therefore exact, not ceilings.

**Important 1 — a precision defect in the load-bearing sentence.** Both the
report and **G277** clause 2 say `emit.ts:171` is *"the only `globalLabel` call
site in the repository"*. `[RAN]` `grep -rn globalLabel --include="*.ts"`
returns three call sites: `emit.ts:171`, `tools/schgen/text-metrics/svg-probe.ts:123`
and `tests/schgen/render/emit-refusals.test.ts:91`. The *conclusion* is
untouched — svg-probe builds hand-authored rows and the test passes `"SIG"`, so
no board net can reach either — but the sentence as written is false, and it is
the first link of the census-not-sample argument. It should say "the only call
site under `lib/`", or "the only one that reaches an emitted sheet". The same
sentence appears in `probe.ts:46`.

---

## C. THE REFUTATION OF THE SPEC'S MECHANISM — CONFIRMED, independently, two ways

`[READ]` `lib/schgen/ir/build.ts:152` is literally
`unitBlock, offSheet: new Set<NetName>(),` inside `buildCircuit`'s single return
— unconditional, with no other writer anywhere: `grep -rn offSheet` over
`lib/`, `tools/`, `tests/` finds reads at `classify.ts:47`, a type at
`types.ts:305`, and two test constructions. `[READ]`
`lib/schgen/ir/classify.ts:35-49` `labelledNets` is
`if (c.rails.has(net) || blocks.size > 1 || unwired || c.offSheet.has(net))`,
with `isUnwired` (`:69-72`) returning `kind !== "wired" && kind !== "auto"`,
which over this `Rendering` means `bus` — the file's own comment says so. So the
three live clauses are **rail / spans more than one block / touches a `bus`
block**, exactly as reported, and nothing about a declared port enters.

`[READ]` `circuits/pt2399-core/schematic/authoring.ts:86-102` declares **one**
block `pt-core` with `rendering: { kind: "auto" }`.

`[RAN]` **And the empirical half, which the implementer did not state and which
is the cleanest proof available:** in the unperturbed run, `pt2399-core` declares
six negotiable ports — `+5V`, `GND`, `INPUT`, `OUTPUT`, `VCO`,
`unconnected-(U1-CLK_O-Pad5)` — and the census reports
`reaches a label: (none)`. Four declared non-rail ports, zero labels. A declared
port does not make a net a label, measured as well as read.

`[RAN]` The spec sentence being refuted reproduces **verbatim**, whitespace-
normalised, in the spec:
`becomes a label *only because of the fake port*, since ports are boundary nets`.
I did not grep a paraphrase.

So the controller's two document corrections in `3b8dec3` rest on a sound
refutation. **The two documents are now right, not newly wrong.**

(A note on my own method, since this file catalogues search artefacts: my first
whitespace-normalised search for G150's owner quotation returned NOT FOUND. That
was **my** artefact — the quotation sits in a nested blockquote, so the source
carries `> > ` prefixes my normaliser did not strip. `grep -n "absolutely do not
care"` finds it at `docs/known-gaps.md:13143-13144`, and `probe.ts:15` quotes it
**verbatim**. Recorded because a reviewer's false negative is the same defect as
an implementer's.)

---

## D. THE ADJUNCT: 20 AND ZERO — CONFIRMED, re-derived

`[RAN]` 20, by the independent `classify.ts` route (B.2), split exactly as
reported: `hi_boost_out`, `in`, `lo_boost_in`, `out` on each of the five
`pultec-*` boards (4 × 5 = 20); zero on `pt2399-core` and on all five
`transistor-preamp-*` boards, whose labelled nets are `BASE`, `BUFFER_BASE`,
`BUFFER_EMITTER`, `BYPASS_CAP`, `BYPASS_JUMPED`, `CHARACTER_CAP`, `COLLECTOR`,
`DRIVE_TOP`, `EMITTER`, `LOOP_CAP` — all of which `NET_NAME`
(`/^[A-Z0-9][A-Z0-9_]*$/`) accepts.

`[RAN]` `ls boards/` is 11 directories and no board reported
`NO DECLARATION`, so the corpus is complete: the zero is "zero over all eleven",
not "zero over the ones that happened to resolve".

`[RAN]` The 16 synthetic names are all on `pt2399-core` and the printed list has
16 entries. CONFIRMED.

The report's conclusion — the rule's halves split cleanly, case binds on 20 real
labels and punctuation on none — holds.

**Important 2 — the report's conclusion #2 overreaches, and my attack is the
counter-example.** The report tells Task 3 that the spec's replacement predicate,
*"a non-empty string, plus whatever part 1 establishes KiCad requires"*,
**"reduces to a non-empty string on the evidence here."** `[RAN]` It does not:
`LINE<LF>BREAK` is a non-empty string, and `kicad-cli` exited **3** with
`Failed to load schematic`. KiCad requires at least *no raw control character*.
Today production is protected from that by `str()` (`sexpr-write.ts:32`), which
throws at **emit** time rather than at `validateCircuit` — so a Task 3 that
deletes `NET_NAME` down to "non-empty" moves that refusal from validation to
emission without anyone deciding to. The report does hedge ("a conclusion from
four names and not a proof over all strings"), and **G277** makes no such claim
at all, so this is a report-level overreach rather than a register defect. It
should be recorded, because Task 3 is the reader.

---

## Also verified

| check | result |
| --- | --- |
| Predictions printed **before** the results, by the program | **CONFIRMED.** `probe.ts:329-343` prints the predictions block; the first `kicad-cli` call is `kicadVersion()` at `:326` for the version line and then `runKicadCli` inside `measureCandidate`, reached at `:368`. The ordering is a property of `main()`'s statement order, not of the writer. The spec's own census prediction is printed there and is **refuted below it in the same log** — the best possible evidence the ordering is real, since nobody back-fills a prediction they are about to lose |
| Prediction provenance | **CONFIRMED** stated in-log (`:330-334`), including that a prototype was run while writing and that no prediction was revised after it. That last is **RELAYING** — unverifiable from the artifact, and correctly flagged as such by being stated rather than implied |
| Re-drivability from the committed tree | **CONFIRMED** — see A.1. Byte-identical apart from the SHA line |
| Manifest deviation (one entry, not two) | **CONFIRMED by driving it.** `[RAN]` Added `tools/schgen/label-syntax/probe-run.log` to `handWritten`; `bun test tests/schgen/port-fidelity.test.ts` → **1 fail / 11 pass**, on `accountedButMissing` at `port-fidelity.test.ts:482`, with the diff naming `"tools/schgen/label-syntax/probe-run.log"`. `listTsFiles` (`:321-335`) enumerates `.ts` only. Restored; manifest SHA back to `462b350f…`. The deviation's reason is real and the controller's plan fix is right |
| No production code changed | **CONFIRMED.** `git diff --name-only 2758137..3b8dec3` has nothing under `lib/`, `circuits/`, `boards/`, or `Makefile` |
| Suite | **CONFIRMED.** `SCHGEN_SOURCE=… bun test` → **3812 pass / 0 fail / 43602 `expect()` calls across 353 files**, exit 0, 150.05 s. Every term unchanged from the plan's Global Constraints baseline |
| `bun run typecheck` | **CONFIRMED** clean — `tsc --noEmit`, no output, exit 0 |
| `make check` red on four boards | **CONFIRMED structurally**, not run (it writes artifacts). **G251**'s table names the four: `pt2399-core` (a missing `bomConditions` export) and `transistor-preamp-lab`/`loop`/`staged` (unfinished layouts), with the five `pultec-*` plus `buffered` and `feedback` at exit 0 as the control. Pre-existing; this task touched nothing it exercises |
| AI attribution | **CONFIRMED absent** from all three commit messages (`95db940`, `1f2ae3e`, `3b8dec3`) — no `Claude`, `Anthropic`, `Co-Authored-By`, `Generated with`, 🤖 or session link |
| `probe.ts` size | **CONFIRMED 480 lines**, inside `CLAUDE.md`'s 300–500 ceiling. Near the top of it; the report already flags this against **G255** |
| Probe refuses rather than skips | **CONFIRMED** by reading `probe.ts:318-325`: `existsSync(KICAD_CLI)` throws naming `lib/kicad/install.ts`. Not driven (I did not move the binary), so the refusal path itself is **RELAYING** |
| PDF, never SVG | **CONFIRMED.** No SVG export anywhere in `probe.ts`; `exportPdf` and `runKicadCli(["sch","export","netlist",…])` only. **G265**'s 3333.75 µm figure reproduces in `docs/known-gaps.md` |

### G277's form

**CONFIRMED** it carries all five required parts: what was found (six numbered
clauses), where (`probe.ts`, the four sheets, `probe-run.log`, the cited source
lines), the evidence (`[RAN, CONFIRMED]`, naming the control and the
outline-growth test as the two checks that could have failed), an explicit
**Verified** paragraph distinguishing CONFIRMED from relayed and asserting
nothing is another agent's report, and a **What would settle it** that gives a
separate **CRITERION** per clause.

**CONFIRMED the restraint in clause 4 held.** Its MECHANISM — a test that fails
on a non-zero census — is marked **UNTRIED** and deliberately not built, on the
ground that whether a non-zero census should refuse or merely report is an
acceptance criterion and `CLAUDE.md` forbids the producing agent from authoring
one. `[RAN]` Nothing in the diff adds or edits a test, a gate, a rule file or a
`CRITERIA` clause: the diff is one probe, four sheets, one log, one manifest
string, one register entry, and the controller's own two document corrections.
The probe's log prints judgements about what zero licenses, but it enforces
nothing and no suite reads it. **No criterion was authored by the producing
agent.**

**Minor 5 — clause 2's "only call site in the repository".** See Important 1.
`G277` clause 2 and `probe.ts:46` both need the qualifier. The criterion in
clause 2 ("the census is re-taken, not trusted … settled by the probe's census
section printing zero at the commit being reviewed") is met by this review: it
printed zero at `3b8dec3`.

**Minor 6 — clause 5's framing.** It says the 20 "cannot be re-derived from any
published number", which is right, and the criterion is "re-derived by the same
probe run". A criterion that names only the artifact under test is the weaker
form; B.2's independent `classify.ts` route is the stronger one and is now on
record here.

---

## Findings, graded

**Critical: none.**

**Important 1 — `emit.ts:171` is not "the only `globalLabel` call site in the
repository".** *(report "Why this is a census and not a sample"; **G277** clause
2; `probe.ts:46`)*
*Failure scenario:* a later agent checks the census-not-sample argument, greps
`globalLabel`, finds three call sites, and concludes the census is unsound —
discarding a correct zero. Or the reverse: someone adds a fourth call site in
`lib/` believing the sentence is a checked invariant when nothing checks it.
*Fix:* say "the only call site under `lib/`" / "the only one that reaches an
emitted sheet", in `G277` clause 2 and `probe.ts:46`.

**Important 2 — the report tells Task 3 the predicate "reduces to a non-empty
string", and a non-empty string exists that KiCad refuses.** *(report, "What
Task 3 should take from this", point 2)*
*Failure scenario:* Task 3 replaces `NET_NAME` with a non-empty-string check on
the strength of that sentence; the only thing then standing between a
control-character net name and a written sheet is `str()`, which throws at emit
rather than at `validateCircuit`, so the refusal arrives late and from a module
that is not about net names. *Fix:* record my newline measurement — `exit 3`,
`Failed to load schematic` — and have Task 3 state the predicate as "non-empty
and free of control characters", or state explicitly that `str()` is where that
clause lives.

**Minor 1 — `str()`'s control-character refusal is never exercised.** Disclosed
in `probe.ts:30-31` and `G277` clause 1. *Failure scenario:* a reader takes
"the production writer's bytes" to mean the whole production emit path was
driven, and assumes a guard was tested that was not.

**Minor 2 — the probe hand-writes the `(global_label …)` form** rather than
calling `globalLabel()` + `print()`, and so omits the `Intersheetrefs` property
production always emits. *Failure scenario:* a future KiCad behaviour that
depends on the label's full node shape is measured on a shape the emitter never
produces.

**Minor 3 — "byte-identical" via `Buffer.equals` is not stronger than `===`**
for anything this probe can produce. *Failure scenario:* the phrase is quoted
later as evidence of an encoding-level check that was never performed.

**Minor 4 — `rendered: false` is reachable only when the PDF file is absent**;
a drawn-but-mangled label throws out of `outlineHolding` and the verdict table
never prints. Loud, not silent. *Failure scenario:* a later reader expects a
`PDF outline drawn NO` row for a mangled label and gets a stack trace with no
table, and misreads the crash as a probe bug rather than as the finding.

**Minor 5 — `G277` clause 2 carries Important 1's sentence.** *Failure
scenario:* as Important 1, reached through the register rather than the report.

**Minor 6 — `G277` clause 5's criterion names only the probe itself.** *Failure
scenario:* the 20 is re-taken only by the artifact that produced it, so a defect
in `subgraphOf`'s `external` would reproduce the same number forever. B.2's
independent route is the remedy and is recorded here.

---

## Verdicts

**SPEC COMPLIANCE: PASS.** Both named artifacts exist, are committed, and are
re-drivable from the committed tree. All seven brief steps are discharged:
`kicad-cli` resolved through `lib/kicad/netlist.ts`'s `KICAD_CLI` with a refusal
rather than a skip (Step 1); predictions printed by the program before any
`kicad-cli` call (Step 2); one sheet per candidate, netlist and **PDF** export,
never SVG (Step 3); four reported answers per candidate plus the writer's exact
bytes and hex (Step 4); the boundary census over all eleven boards, with the log
saying in terms what a zero closes and what it does not (Step 5); the manifest
declaration and the suite unchanged at 3812/0/43602/353 (Step 6); committed, with
**G277** recording the findings and no AI attribution (Step 7). The one deviation
from the brief's file table — one manifest entry, not two — I drove to red and
back, and the brief was wrong.

**TASK QUALITY: PASS WITH FINDINGS.** The two Important findings are both
precision defects in sentences a later reader will rely on, not defects in the
measurement. No finding changes a number. The work is unusually resistant to the
false-green shapes catalogued in `docs/schematic/false-greens.md`: it has a
control that can fail (12), a census rather than a sample with the argument
stated (26), a population taken from `boards/` and not from the probe's own
output (14), predictions printed by the program ahead of the results (28, 29),
and a comparison between two independently obtained values rather than one value
with itself (1). I drove five of its reported axes to their opposite values in a
single perturbed run, which is the check this review most wanted and did not
expect to get.

## Reviewer hygiene

`[RAN]` Three files were perturbed and all three restored and verified by
SHA-256 against a baseline taken before any edit:
`tools/schgen/label-syntax/probe.ts` (`f9afed73…`),
`tools/schgen/port-manifest.json` (`462b350f…`), and
`circuits/pt2399-core/schematic/authoring.ts` (verified by an empty
`git status`). Three perturbation sheets under
`tools/schgen/label-syntax/sheets/` were deleted. The four committed sheets and
`probe-run.log` are byte-identical to HEAD. `git status --porcelain` is **empty**.
No commit, no fix, no `git checkout HEAD --`. Scratch work lives in the session
scratchpad only.
