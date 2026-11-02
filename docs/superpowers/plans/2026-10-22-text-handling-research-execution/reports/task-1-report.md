# Task 1 report: Real text metrics, and how wrong the current ruler is

**Status: DONE_WITH_CONCERNS.** Everything the brief asked for was measured and
committed. Two concerns are raised at the end, and neither is a defect in the
work: one is a production file I had to touch, disclosed; the other is a limit
of the measurement, recorded.

## Commits

| SHA | what |
| --- | --- |
| `757c4dd` | the committed probe, `tools/schgen/text-metrics/` (9 TS modules + 1 Python module, 1904 lines) |
| `56eb6ba` | `docs/schematic/text-handling-research.md` §1, `docs/schematic/README.md`, `tools/schgen/port-manifest.json` |
| `53c31bb` | `docs/known-gaps.md`: **G239** and **G260** amended, **G265** added |
| `fcc104e` | three precision fixes to wording, no figure changed |

Pushed to `feature/schematics-tooling`. No AI attribution in any of them
(checked by grep over the four messages). The sibling repository's
`git status --porcelain` is empty.

## Full suite

`SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`
was set, and I say so because without it the port-fidelity guard fails rather
than skips. **3758 pass / 0 fail across 350 files**, which is HEAD's figure
unchanged.

**It did not start there, and the reason is a finding.** The first run was
3756/2: `tests/schgen/port-fidelity.test.ts` went red because it requires every
`.ts` under `tools/schgen/` to be declared, and the probe's nine modules were
not; and `tests/guide/print-pdf.test.ts` timed out at 5076 ms against a 5000 ms
limit while the machine was busy. The first is fixed by declaring the nine
modules in `tools/schgen/port-manifest.json`'s `handWritten` list (disclosed in
**G265** clause 5). The second passed on its own and in the clean full run; it
is a load-sensitive timeout, not a change.

## Which route yielded which quantity

**All three routes worked**, which the brief treated as not knowable in advance.

| route | yielded | status |
| --- | --- | --- |
| **1. The font source** | **Q1 advance exactly; Q2's glyph geometry exactly; Q3 computable** | `[READ]` eight KiCad files at tag `10.0.5`: `common/newstroke_font.cpp`, `common/font/stroke_font.cpp`, `common/font/font.cpp`, `common/eda_text.cpp`, `common/gr_text.cpp`, `eeschema/sch_text.cpp`, `eeschema/sch_label.cpp`, `eeschema/default_values.h` |
| **2. The installed runtime** | **Q3 directly**, plus an independent reading of Q2 | KiCad ships `pcbnew` bindings and **no eeschema bindings**, so the `EDA_TEXT` is a `PCB_TEXT`. `GetTextBox` and `GetEffectiveTextShape` are both exposed |
| **3. `kicad-cli`** | **Q2 in situ**, the three constants that place a field's ink against its anchor, and the global-label outline | SVG for text, **PDF for the label outline, because the SVG export omits it** |

**They agree, which is the strongest thing in the task.** Over the 264 distinct
strings the eleven boards emit, route 1 and route 2 disagree by **0.0 um** on
both `GetTextBox` width and stroked-outline width. Route 1 placed by route 3's
measured constants disagrees with route 3's own measurement by **0.3 um**. The
source-derived label-outline formula disagrees with the PDF's own vector
coordinates by **1.5 um**.

## THE HEADLINE: how many recorded collisions survive real geometry

**`G260`'s fifteen fallback field placements**, re-run with the text boxes
swapped and everything else imported from the production module:

| | current model | Q1 advance | Q2 ink | Q3 `GetTextBox` |
| --- | --- | --- | --- | --- |
| total fallbacks | **15** | **13** | **20** | **24** |
| of the fifteen, still a fallback | - | 13 | 14 | **15** |
| new under this quantity | - | 0 | 6 | 9 |

**Thirteen of the fifteen survive all three quantities. None of the fifteen is
an artefact of the ruler under all three. Under KiCad's own box all fifteen
survive and nine more appear.**

**`G239`'s five-of-eleven slots**: **0 of 5 inside slots fit under all four
rulers** for `Jumper:Jumper_2_Open`, `Device:C` and `Device:C_Polarized`, and
**5 of 5 under all four** for `Audio:PT2399`, which is the positive control and
could have moved. The finding is independent of the ruler and the headroom it
was short by is *larger* than it said, because real geometry makes a line
TALLER: 1270 um in the model, 1422.4 of ink, 2043.1 of KiCad's box.

**Drawn-text overlaps**: under the current ruler the probe finds **eight**
overlapping pairs and those eight are the published refusals of the three
blocked blocks. **Four survive under every quantity and four vanish** - all of
`tp-stage`'s `label BASE` cluster plus one - with **five new ones** under the
ink and under KiCad's box. **The blocking pair of each of the three blocks
survives under all three.**

## The ERROR TABLE, in one paragraph

Over 264 strings: against the **ink** the current model over-reserves by a
median of 18% and a maximum of 87%, and is too small for **0** of them; against
**KiCad's own box** it is too small for **70 of 264**, by up to 524.6 um; the
widest over-estimate is **4.2 grid steps** on a Pultec net name. In HEIGHT it is
too small under both measured quantities, always. The three measured quantities
are within **0.63 grid steps** of each other in width and **44% apart** in
height - and it is the height that moves the survivor counts, so **Step 0's
election is consequential rather than academic**.

## What I did not elect, and why

**I measured all three quantities and chose none.** Which box governs a
collision is an acceptance criterion for the artifact this generator produces,
and `CLAUDE.md` reserves those to the owner. **G265** clause 4 records it as his
decision, with the one fact he needs that nobody had: the population is 13, 15,
20 or 24 depending on the answer.

## Two review claims driven

- **ACCEPTED AND CONFIRMED CONSEQUENTIAL**: the distinction between advance, ink
  and KiCad's box. They differ, and the difference changes the counts.
- **DRIVEN AND NOT REPRODUCED**: *"strokes may extend outside their nominal
  advance"*. It is structurally possible - `buildGlyphBoundingBox` imposes the
  glyph's x range from the width fields rather than measuring it from the points
  - and it is **false for this glyph set**. Over the whole printable-ASCII range
  exactly one glyph overhangs its advance: the backslash, which this repository
  never emits. The claim is correct in principle and inert here.

## Two findings about the tooling rather than about this repository

1. **`kicad-cli sch export svg` 10.0.5 draws a global label's TEXT and not its
   outline.** `export pdf` of the same file draws both. Found by the probe's own
   refusal, not by inspection. An SVG export therefore under-reports a label by
   its whole outline - 3333.75 um along the side and 1270 um either side.
2. **KiCad sizes a text box with a pen it does not plot with**: `GetTextBox`
   uses `size/8 = 158.75 um`, eeschema plots at `152.4 um`. Both correct in
   their own place; recorded so nobody "reconciles" them.

## Controls, every one of which could have answered differently

- **The parallel field placer reproduces `lib/schgen/render/field-placement.ts`
  exactly under the current ruler** - block, unit, lib id, rounded weighted cost
  and every `covers` string, over ten laid-out blocks - and the probe refuses to
  print any measured figure until it does. It also reproduces **G260**'s
  per-block distribution (`ob-buffer` 2 / `oc-power` 1 / `pt-core` 8 /
  `tp-stage` 4) from a second code path.
- **Scaling**: ten `I` measured 5595.6 um, predicted from one `I` plus nine
  advances 5595.3 um.
- **Justification**: the same string is 4506.7 um wide left- and
  right-justified, so justification moves the box without resizing it.
- **Transposition**: an `up` label's box is 1966.7 x 9556.5 and a `right`
  label's is 9556.5 x 1966.7, which is what licenses treating vertical text as
  the horizontal metric transposed rather than assuming it.
- **Positive control that could have moved**: `Audio:PT2399` keeps 5 of 5 inside
  slots under every ruler while the three small passives keep 0 of 5.
- **Three cross-route agreements** (0.0, 0.3, 1.5 um), each of which is a
  comparison between independent implementations of the same quantity.
- **A probe refusal that fired**: the SVG row assignment refuses a path it
  cannot put in exactly one row, and it caught both a nested-`<g>` parsing bug
  and the missing label outline.

## CONCERNS

1. **I changed one production file, and the brief said I would change none.**
   `tools/schgen/port-manifest.json` gains nine entries in its `handWritten`
   list. Without them `tests/schgen/port-fidelity.test.ts` is red, because it
   requires every `.ts` under `tools/schgen/` to be declared, and ruling R4
   requires the probe to be committed - the two constraints meet there. It is a
   provenance declaration and changes no behaviour. Disclosed in **G265** clause
   5 rather than left in a diff. **If you would rather the probe lived outside
   `tools/schgen/`, say so and I will move it**; R4 only says "commit it under
   `tools/schgen/`", which is what I did.

2. **Step 4's overlap recomputation is the overlap SUBSET of
   `render/text-scene.ts`, not that whole pass.** That pass grades *"lies
   under"* and *"crosses the border of"* as well as overlap, and a quantity that
   flipped one of those without flipping an overlap would not show in my
   survivor counts. I reproduce the three blocked blocks' published refusals
   exactly under the current ruler, so the subset covers what actually blocks
   them today - but it is a subset, and §1.10 and this report both say so.

## Smaller things recorded rather than smoothed

- Two undiagnosed residuals: the anchor-to-pen-origin offset measures 111.1 um
  where `font.cpp` predicts 100.3; the PDF's label outline is 1.5 um longer than
  `sch_label.cpp` predicts. Both under 1% of a grid step. **G265** clause 3.
- `outlineExtent` is **not** conservative: it under-reserves by 835 um for short
  net names and over-reserves by 1040 um for long ones, crossing over at about
  ten characters.
- Q3 is measured through `PCB_TEXT` because KiCad ships no eeschema bindings. A
  margin applied only by eeschema's `SCH_FIELD::GetBoundingBox` would not have
  been seen. Stated in §1.10.
- The glyph set is 64 characters over all eleven boards and 50 over the five
  that pass gate 1. Both are reported; neither is chosen.

---

# Fix round 1

**Status: DONE.** All five items closed, each in its own commit, plus three
commits for work the first item's method turned up. Full suite re-run.

| SHA | item |
| --- | --- |
| `cd1af41` | **I-1** — the fourth reading is wired in and performed |
| `d7c0b2b` | **M-2** — the pen disagreement's contribution to the box height, driven |
| `a36e0b2` | **M-3** — the label outline's fixed part is now a number a run printed |
| `1b2c547` | **M-4** — the jumper bullet carries all four rulers |
| `e2deb55` | **M-6** — the sentinel is no longer printed as a result, and the ordering is driven |
| `fff714c` | seven tidied pasted blocks restored, and a check that catches them |
| `370e3fc` | the document pinned to the run that produced its figures |
| `698e03c` | the register learns about all of the above |

**Full suite**: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`
was set, and I say so. **3758 pass / 0 fail across 350 files** — unchanged.
Sibling repository clean. No AI attribution in any of the nine commits
(grepped).

**No survivor count moved in this round.** 15 / 13 / 20 / 24 fallbacks, 15 of 15
surviving under KiCad's box, 4 of 8 text overlaps surviving, and the parallel
placer still reproduces `field-placement.ts` exactly. Two of these commits
changed probe arithmetic (M-2's pen seam, M-3's nanometre rounding) and I
checked the counts after each.

## I-1: the fourth reading AGREES

Wired in rather than deleted, per R9. Over **23 strings** — six shaped probes
plus a stride-sampled spread of the real corpus, from one character to
seventeen:

```
textLength MINUS the font source's advance sum is a CONSTANT 203.2 um; worst departure from it 0.4 um on "IIIIIIIIII"
CONTROL (could have answered differently): the same residual against length * GRID is -462.0 um with a departure of 5986.8 um on "IIIIIIIIII" - 14819x wider, so this check discriminates
```

**It is not the advance sum itself — it is the advance sum plus a constant
203.2 um**, which is exactly what makes it a check rather than a restatement.
The comment's claim that it is "free with the export" held: the elements are
already in every SVG the probe writes.

**What it would have taken for it to disagree.** The residual is
`textLength − our advance sum`, so any error in the advance table makes the
residual non-constant. One wrong glyph width `w` shifts the residual of every
string containing that glyph by `w` and nothing else — a spread, not an offset,
and the sample spans 1 to 17 characters so a single wrong glyph could not hide.
A systematically wrong model scatters it: the model this whole section is about
gives the same comparison a departure of **5986.8 um, about 14819 times
wider**. What would NOT have made it disagree is a constant error in my
arithmetic applied to every string equally — the check is blind to that, which
is why it is a fourth reading and not the only one.

**Q1 is no longer the quantity with no check of its own**, which was the real
cost of the dead function.

## M-2: 2.9%

```
  of that 773.1 um excess over the model: 2 x KiROUND(1.5 x pen) = 476.3 um (61.6%) and KiROUND(0.17 x extents.y) = 296.9 um (38.4%)
  COUNTERFACTUAL: recomputed at the PLOTTED pen 152.4 um instead of the box pen 158.8 um, GetTextBox would return 2020.8 um - so the pen disagreement accounts for 22.3 um, 2.9% of the excess
```

Reproduces the reviewer's figures exactly. In `§1.4` and in **G265** clause 2,
with the sentence the owner needs: at the plotted pen the box is still 2020.8
um, **59% taller than the model's line**, so Q3's height cannot be discounted
as bookkeeping around the wrong pen.

## M-3: and it found a rounding defect

`3333.75` was a hand derivation; the probe's own formula could not have printed
it, because `labelOutlineExtent` rounded at micrometres where KiCad rounds at
nanometres and so put the constant at `3333.003`. **Neither number had been
driven.** Fixed at the nanometre, and the constant is now printed: **3333.8 um**
by `sch_label.cpp`'s arithmetic, **3334.3 to 3334.5** as the PDF measures it.
The formula's worst disagreement with the PDF improves from **1.5 um to 0.8 um**,
which was the whole cost of the micrometre rounding. Every figure that cited 1.5
is updated, including the README's.

## M-4: and the original claim compared a width to a height

All four rulers now, driven. Driving it surfaced something the original
phrasing hid: *"seven times wider than its body"* is **7.22x the body's HEIGHT**
(2286 um) and only **3.25x its WIDTH** (5080 um). Both ratios are given under
every quantity; the claim survives under all four and its number is 10–13% high.

## M-6: saying it precisely changed the claim

The `""` was the comparison loop's seed. Replacing it with counts changed what
is true: **the box width is EXACTLY equal on all 264 strings**, and the stroked
outline is not — 40 of 264 land **1.5 nanometres** apart, because this probe
scales twenty-firsts of an em in floating point where the runtime works in
integers. Arithmetic residue, not geometry, and now reported at six decimal
places instead of rounded to `0.0 um`. §1.1 says both, separately.

I also drove the ordering §1.8 asserted and no pasted line established:
`ORDERING ink < advance < box: 0 violation(s) over 264 strings`.

## The thing M-6 turned out to be one of

M-6 was an instance of a shape, so I looked for the rest **mechanically rather
than by eye**. **Seven fenced blocks had been edited after pasting**: a line
truncated at a sentence boundary, a control that lost its parenthetical, two
tables re-padded so their columns lined up, a claim rewrapped across two lines,
and the G239 slot block left stale after M-4 gave the probe a new column. **None
changed a figure. All are edits to evidence.**

Every one is replaced with the run's own line, and
`tools/schgen/text-metrics/verify-pastes.py` now holds the document to a run's
log: a fenced block counts as probe output when at least half its lines are in
the log, and then every line of it must be. **Green against the document; driven
RED twice against perturbed copies** — one changed digit, and one block re-padded
exactly the way I had re-padded it — with the original never written. The
document's own re-drive instructions now include it.

**This is the honest version of the first round's claim that every number was
driven.** Every number was. Seven blocks of output around them were not pasted
as they came.

## Document pinning

The document named commit `757c4dd` — the tree of the first run — after four fix
commits had moved every figure's provenance. It now names **`fff714c`**, the
commit immediately before the one that writes the sentence, where the final run
was taken with a clean tree and the paste check reports every pasted line
present.

## Register

**G265** clause 3 becomes three unexplained quantities: the 203.2 um
`textLength` constant joins the two residuals. It is `4/3` of the plotted pen,
which is the same `4/3` the export applies to `font-size`, and **no source was
read that says why** — recorded because an agent who reads `textLength` as an
advance will be 203.2 um over on every string. Clause 2 gains the 2.9% figure
and the warning not to discount Q3's height. The evidence clause gains the
fourth reading and the paste check.

## Deferred, as instructed

The three unused exports (`metrics.ts`'s `inkExtent`, `geometry.ts`'s
`labelExtent` re-export) are left for the final review. **One of them stopped
being unused this round**: `boxPenWidth` is now the single place the box pen is
stated, and it gained nanometre rounding in the process — it had been returning
159 um where KiCad uses 158.75.

---

# Fix round 2

**Status: DONE.** Both holes closed, the checker wired into `bun test`, the
unenforced invariant given a check. Five commits.

| SHA | item |
| --- | --- |
| `5c8dbc5` | **Item 1** — both holes closed; the Python predecessor deleted |
| `95d17fc` | **Item 2 / R12** — the checker runs on every `bun test` |
| `c71e5c9` | **Item 3** — the box-pen call-site invariant is checked |
| `cee2f9f` | the document and its fixture re-pinned to a run taken after this round |
| `3e52044` | the register records that the remedy had the defect it was built to prevent |

**Full suite**: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`
was set, and I say so. **3769 pass / 0 fail across 352 files.** **The baseline
moved, deliberately and by R12**: +11 tests across +2 files, which are the two
research checks this round added. Nothing pre-existing changed. Sibling clean.
No AI attribution in any of the five commits (grepped).

## Item 1 — both holes, and what contiguity cost

**Both holes came from the checker inferring what a block was. It no longer
infers.** A fenced block declares itself:

- ` ```run ` — **must equal a contiguous slice of the log**, in order, blank
  lines included;
- any other fence — **must share no line with the log**, and is listed by its
  first line as not checked.

**There is no gate and nothing to fall below.** Every block lands in exactly one
of three accounted states — VERIFIED, NOT-OUTPUT (named), FAILED — and the suite
asserts `verified + notOutput + failures === blocks`, which is the property hole
(b) violated.

**The three red drives and the control, all run against copies; the real
document's SHA-256 was `e0dea2d…` before and after:**

```
=== CONTROL: the real document ===
17 fenced block(s): 14 VERIFIED against the log, 3 declared NOT probe output, 0 FAILED
exit 0

=== ATTACK (a): a genuine line from elsewhere in the log, moved into the wrong block ===
17 fenced block(s): 13 VERIFIED against the log, 3 declared NOT probe output, 1 FAILED
FAILED - the document edited what it pasted:
  the ```run block at line 94 is not a contiguous slice of the log. Every one of its lines is in the log somewhere, so it has been REORDERED, had lines REMOVED, or drawn lines from two different places - all of which are edits to evidence.
exit 1

=== ATTACK (b): fabricate 4 of 6 lines, leave 2 genuine anchors ===
17 fenced block(s): 13 VERIFIED against the log, 3 declared NOT probe output, 1 FAILED
FAILED - the document edited what it pasted:
  the ```run block at line 398 is not a contiguous slice of the log. First line that is nowhere in the log: "estimate / glyph advance sum: n=264 min 0.100 p25 1.037 median 9.999 p75 1.200 max 2.448; the estimate is SMALLER than this quantity for 1 of 264 strings"
exit 1

=== ATTACK (c): relabel that block so it is not declared output ===
FAILED - the document edited what it pasted:
  the block at line 398 is fenced ```(no info string) rather than ```run, yet 3 of its lines appear in the run's log - e.g. "estimate / rendered ink: ...". A block that carries a run's output is declared as output or it is not pasted: this is the only way a block can be relabelled out of being checked, so it fails rather than being skipped.
exit 1
```

**Attack (c) is mine, not the reviewer's, and it is the hole the fix for (b)
would otherwise have opened.** Removing the gate makes "is this block output?"
the whole question, so declaring a block as *not* output becomes the new way out.
Requiring a non-output block to share **no** line with the log closes it.

### Did contiguity break any legitimate block? YES — two, and they are a finding about the document

```
block  5 at line  190  lines=11  inLog=11  contiguousAt=-1
block  8 at line  275  lines= 8  inLog= 8  contiguousAt=-1
```

Every line genuine, neither contiguous. **Both were EXCERPTS**: §1.3 pasted
**eight of the twenty-three** declared advances, §1.5 **six of the twenty-seven**
measured rows. **An excerpt cannot be told from a tidy by any rule that does not
read minds** — the attack the reviewer ran against hole (a) is literally "a block
whose lines are all genuine and not contiguous", which is the same shape.

**I paid the cost rather than loosening the checker**: both now paste their
listing in full, which is why §1.3 and §1.5 are longer than a reader needs. **No
other block in the document was an excerpt**, so contiguity broke nothing else.
The document says this about itself, and so does **G265**.

Fixing it also found a smaller thing: the full §1.5 slice I first pasted
overlapped §1.6's block by one line, so the same CONTROL line appeared twice.
Trimmed.

## Item 2 — R12

`tests/schgen/text-metrics/document-pastes.test.ts`, **7 cases**: the real
document against a committed log; the three attacks, built **in memory** so the
document is never written; and three invariants — every block accounted for, the
not-checked list non-empty and named, and the log recognisable as a probe run
rather than a hand-written fixture.

**It says what it does not guard.** It cannot establish the log is a *current*
run: re-driving the probe needs `kicad-cli`, the KiCad Python bindings and a
2.9 MB font blob fetched outside the repository. **What it does instead is couple
the two** — the document names the commit its figures were measured at, the log
records the commit it was taken at, and a case requires them to agree. A log
refreshed without re-pinning the document fails here, and so does the reverse.

**Driven RED once against a perturbed fixture, never against the document.** One
survivor count changed in the committed log — `20 24` → `20 25`, the way a stale
log would differ — takes **4 of the 7 cases red**, including the contiguity case.
Restored from a copy and verified by hash (`ceeb1e6f…` before and after), green
again.

## Item 3

`tests/schgen/text-metrics/pen-call-sites.test.ts` scans `lib/`, `tools/` and
`tests/` for calls of `kicadTextBoxExtentAtPen` and reports the pen each passes.
It asserts the **one** loose site by file, line and argument
(`probe.ts:377 m.drawnPen`) and the two fixed-pen sites. Two red cases prove it
moves and that a green is not vacuous: a synthetic second loose call site takes
the count to two, and renaming the function takes the scan to zero. Neither
writes anything. The comment in `metrics.ts` now names what enforces it instead
of asserting it.

## Re-pinning

Three commits this round touched the probe's tree, so the run the document named
predated its own source. Re-driven at `c71e5c9` on a clean tree: **every figure
is byte-identical** to the pinned run — `diff` over the two logs reports exactly
one differing line, the scratch directory the run wrote into, which is pasted
nowhere. Fixture and pin moved together, as the coupling case requires.

## On the process note

Taken. The smaller model found what the full review passed because it was told
to attack one thing; the same was true of my own round-2 work — the seven tidied
blocks were found by looking for *that shape mechanically*, not by auditing. I
have no objection to targeted briefs and I would rather have them.

**One thing I would flag about this round specifically**: the fix for hole (b)
opened attack (c), and I found that only because closing (b) made me ask what
the new escape route was. A remedy's own new attack surface is worth naming in
the brief as a thing to hunt, because it is not in the reviewer's list by
construction — the reviewer attacked the version that existed.

---

# Fix round 3

**Status: DONE.** The n=1 hole closed, R15 folded in, three commits plus the
register.

| SHA | item |
| --- | --- |
| `3a21da0` | **Item 1** — contiguity was vacuous at length 1 |
| `fe7ea7e` | **Item 2 / R15** — a two-run log is refused by name |
| `14ed8f0` | the register: three defeated checkers, and that the figures were never in question |

**Full suite**: `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`
was set, and I say so. **3778 pass / 0 fail across 352 files.** **+9 over round
2's 3769, no new files**: `git diff --name-only cee2f9f..HEAD -- 'tests/**/*.test.ts'`
lists exactly one file, `document-pastes.test.ts`, which went 7 → 16 cases; the
file count is unchanged at 352. Sibling clean. No AI attribution in any commit.

**No re-pin was needed, and here is the evidence rather than the assertion.**
`git diff --name-only c71e5c9..HEAD -- tools/schgen/text-metrics/ lib/ circuits/ boards/`
lists exactly one path — `verify-pastes.ts`, the checker — and
`git diff --stat c71e5c9..HEAD` over all ten probe modules is **empty**. The
figures' provenance is untouched, so the document's pin and the committed log
stay where they were.

## Item 1 — which mechanism, and what I costed

**Mechanism 1 (require n ≥ 2) closes the degenerate case and nothing else.** The
reviewer's n=1 attack is the *instance*; its general form is **substituting a
whole genuine contiguous slice**, which passes at every length. n≥2 does not
touch that. Cheap, but it answers the symptom.

**Mechanism 3 (declare short blocks unverifiable) is the trap you named**, and I
rejected it: it reintroduces hole (b)'s shape — a block that stops being checked.

**I took mechanism 2, and by the log's own `== ` SECTION HEADERS rather than by
line number.** Line numbers are brittle (any probe change shifts them) and the
number is itself a thing a tidier edits. Section headers are stable, **fail
loudly when renamed** rather than matching nothing, and give R15 its handle for
free. **I kept mechanism 1 as well**, because within one section the degenerate
collapse still bites. So a `run` block now:

1. **names its log section** — ` ```run STEP 4b: ` — and its slice must lie
   inside it;
2. carries **≥ 2 non-blank lines**;
3. matches that section at **exactly one** offset — your named escape, the
   repeated line;
4. **does not overlap another block's slice** — which is how the same line came
   to appear twice in this document once already, caught then by eye.

Every block already matched at exactly one offset, so (3) was free. I **measured
and rejected** a fifth rule — requiring a section's blocks to appear in document
order — because §1.4 quotes `STEP 3`'s height line after §1.7 quotes `STEP 3`'s
distribution, so the document is organised thematically, not in run order. That
could have gone either way and did not.

## The red drives — eight, all against copies

Document SHA-256 `66f0478…` and log `77459d6…` identical before and after all
nine runs.

```
=== CONTROL ===  17 blocks: 14 VERIFIED, 3 declared NOT probe output, 0 FAILED   (exit 0)

--- the block shrunk back to one line ---
  the ```run block at line 464 carries 1 non-blank line(s); at fewer than 2, "a contiguous slice of the log" says no more than "this line is in the log somewhere", which is the hole contiguity was written to close. Paste the neighbouring line as well.

--- shrunk AND swapped for a genuine line from another section (the reviewer's attack) ---
  (same refusal — the swap never gets as far as being matched)

--- a whole genuine slice of ANOTHER section substituted for a block ---
  the ```run block at line 94 is not a contiguous slice of section "STEP 2 ROUTE 2: THE INSTALLED RUNTIME - EDA_TEXT::GetTextBox over every corpus string". Every one of its lines is in the log somewhere, so it has been REORDERED, had lines REMOVED, or drawn lines from another section

--- a one-line block padded to two with a NON-neighbouring genuine line ---
  the ```run block at line 464 is not a contiguous slice of section "STEP 4b: …"

--- a block padded with blank lines rather than output ---
  the ```run block at line 445 is not a contiguous slice of section "STEP 3b: …"

--- a section renamed in the log ---
  the ```run block at line 464 names section "STEP 4b:", which matches 0 of the log's 11 headers

--- a section duplicated in the log ---
  the ```run block at line 445 names section "STEP 3b:", which matches 2 of the log's 12 headers

--- a log holding two runs ---
  the log holds 2 run(s) - it must hold exactly one, recognised by the line "== WHAT THIS RUN MEASURED" …
```

All eight are suite cases now; `document-pastes.test.ts` is 16 cases.

## New attack surfaces I found that neither of you named

1. **Padding with blank lines.** `MIN_OUTPUT_LINES` counts *non-blank* lines.
   Had it counted all lines, two blank lines would satisfy the minimum and match
   any adjacent pair of blanks in the log — the n=1 hole again, wearing
   whitespace. Driven RED.
2. **A renamed section header.** The anchor is a prefix of a log header; if the
   probe renames a step, every block anchored to it must **fail loudly** rather
   than match nothing quietly. This is the "`== STEP 4z`" drive, and it is the
   reason I did not make a missing anchor a warning.
3. **A duplicated section header without a duplicated run.** Your R15 escape was
   "a second run"; the narrower version is one header appearing twice inside one
   run — which R15's run-count check does **not** see. Caught by the
   match-exactly-one-header rule, driven separately.
4. **A log with NO run marker.** I drove the 0-run case as well as the 2-run
   case, so the marker is load-bearing in both directions rather than only
   catching duplicates.
5. **Overlapping blocks.** Not an attack so much as a defect this document has
   already committed once: growing §1.5's block to a full slice made it overlap
   §1.6's by one line, so the same CONTROL line appeared twice. Caught by eye in
   round 2; now by the checker.

**The one I could not close, stated rather than discovered later:** a block
replaced by a *different* genuine, contiguous, unique slice of the **same**
declared section passes. Closing it needs the checker to read the prose the
block sits under. The section anchor narrows the target from the whole run to
one step; it does not eliminate it. **§1.11 and G265 both say so.**

## Item 2 — R15, and why it is explicit

**The section rule already refuses a two-run log**, once per block, as
*"matches 2 of the log's headers"*. What the named refusal adds is **a reader
who can tell why** instead of fourteen failures and no cause — the drive above
shows the named refusal first and the consequence beneath it, which is the right
order.

**I costed handling multiples and declined**: the document would have to declare
which run as well as which section, and it pins one commit, which a two-run log
cannot carry. The log is constrained instead and the refusal says what to do.

## Document

New **§1.11**, which carries the checker's contract, the three-version table,
what it establishes, and the four things it does not. The one-line block now
carries the five `SKIPPED` lines above it — which the document should have shown
anyway, because *"over 10 laid-out blocks"* means nothing without them. §1.3,
§1.5 and §1.9 are longer than a reader needs, and the document says why.

## On your closing note

Taken, and I have put it in the register in the form I think survives: **the
measurement has been re-driven at every round and is byte-identical every time.
What kept failing is the machinery that proves the evidence was pasted as it
came.** A reader meeting three rounds on one file would otherwise reasonably
assume the numbers were wrong.
