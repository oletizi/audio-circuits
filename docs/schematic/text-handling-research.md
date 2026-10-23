Text handling in a generated schematic: the research record
===========================================================

**This document is the deliverable of
[`../superpowers/plans/2026-10-22-text-handling-research.md`](../superpowers/plans/2026-10-22-text-handling-research.md),
one section per task.** It is research. **It designs nothing, recommends
nothing and authors no acceptance criteria** - `CLAUDE.md`: *"An agent may never
author the acceptance criteria for the artifact it is producing."* Where a
decision is the owner's, the document says so and stops.

**The question the plan was commissioned to answer** is the owner's, 2026-10-22:

> *"I meant that you aren't fully researching the solution space. I want you to
> use superpowers to develop a plan to research actual solutions to the text
> handling issues instead of reasoning about text from first principles"*

**Retrieval marks**, to the standard
[`generation-prior-art.md`](generation-prior-art.md) sets and
[`text-placement-prior-art.md`](text-placement-prior-art.md) tightened:
`[READ]` a primary source actually opened, `[RAN]` driven here with its output
pasted, `[PAPER-ABS]`, `[PAYWALLED]`, `[THIRD-PARTY]`, `[NOT RETRIEVED]`. **A
citation nobody opened is not a citation**, and each section states what it did
not establish.

**A third-party review of the plan** (2026-10-22, against blob `d82d369`) is
folded into it. Its own stated limit is that it *"reviewed the plan and relevant
repository source, but [has] not executed the proposed experiments or
independently verified its numerical baseline"*, so **its claims enter here as
PLAUSIBLE and are driven**. §1 drives two of them: one holds, one does not.

---

WHAT THE SEVEN SECTIONS FOUND
-----------------------------

**Read this first.** It is here because a synthesis that lives inside the
material it synthesises cannot be read before that material, and the plan's
answer to that is a table at the head of the document rather than a second
document (§7.7 records the deviation this replaced). **Every figure in this table
is `[RELAYED]` from the section named beside it**, where its evidence, its
control and its retrieval mark live. Nothing here is new and nothing here is a
recommendation.

| § | what it was asked | the finding that bears on a fix | ruler-dependent? |
| --- | --- | --- | --- |
| **§1** | how wrong is `text.length * GRID` | **Wrong in both directions, and fixing it dissolves nothing.** Over 264 strings it over-reserves WIDTH against the rendered ink by a median of 18% and a maximum of 87%, and is SMALLER than KiCad's own box for 70 of them. In HEIGHT it is too small always - 1270 µm modelled against 1422.4 µm of ink and 2043.1 µm of `EDA_TEXT::GetTextBox`. **13 of 15 recorded field fallbacks survive all three measured quantities; under KiCad's box all 15 survive and 9 more appear.** | it IS the ruler |
| **§2** | what ELK already offers for labels | **ELK will place a label and return a coordinate, and the emitted `global_label` has nowhere to put one.** 0 of 22 label-related options are set here; the only label-to-label spacing is scoped to one element's own labels; and told about labels before placing nodes, ELK kept all 398 off every body and then **routed wires through the space it had reserved, giving 266 label-over-wire crossings by this repository's own predicate.** | no |
| **§3** | KiCad's own field autoplacer | **Four candidate sides, no inside slots, one local repair, and NO refusal path** - when every side collides it places the fields overlapping. Plus a **confirmed defect**: it can pick a side it has just graded as colliding while a clear side remains, departing from the specification in its own file header. Upstream's test file for it never calls it. | no |
| **§4** | what comparable tools do on failure | **Of six tools examined, ZERO refuse to draw because text will not fit** - zero of seven with KiCad, zero of eight with TeX (§6.8). One adjusts surrounding geometry, and only across layout columns. One independently re-invents this repository's character-count ruler. | no |
| **§5** | whether a global label can move at all | **All four degrees of freedom EXIST**, driven against `kicad-cli`: orientation, sliding the anchor, rerouting the wire beneath it, and another segment of the same net. **The median anchor has 80 legal places to sit and the narrowest has 20; 95 of 95 are wider than four.** Orientation alone draws 5 of the 12 label-blocked blocks, some freedom draws 7, and **of the 5 nothing draws, 3 have every label problem cleared and refuse on a defect with no text in it.** | **yes** - every clearing count |
| **§6** | whether typesetting's penalty model transfers | **The algebra transfers and the algorithm does not, on the authors' own stated condition** - they name contiguity as the only thing that rescues the search, and label placement has none. They also call both their published formulae *"quite arbitrary"*, so adopting the literature's cost function is not a move that exists. The placer here is **first-fit on 202 of 255 placements** and consults its cost on 53. | **yes** - the fallback counts |
| **§7** | the solution space | **Eighteen approaches, graded at three levels of evidence, mapped board by board.** Six are **ESTABLISHED ELSEWHERE**, eight **DEMONSTRATED HERE**, four **INTEGRATION HYPOTHESIS** - which the plan defines as *"untested here"* and **not** as untested anywhere: two of those four are exhibited elsewhere and §7.1 says where. **Ten of the eighteen are untested here**, counting the six level-1 rows. **Not one of the eighteen has been shown to draw a board**, and §7.2 says what stands in front of each. | per row |

**THE STATE, RE-DRIVEN FOR §7 RATHER THAN RELAYED.** `[RAN, CONFIRMED]`
`bun tools/schgen/board-sheets.ts` at this commit: **0 of 11 boards produce a
schematic; 11 refused; 0 have no authoring declaration.** **Six refuse at
`validateCircuit` before any text is placed** (`pt2399-core` and all five
Pultec, on net names) and five at ELK layout - and of those five, **the FIRST
problem the census names has no text in it on three** (one missing junction, two
power-symbol glyph touches) **and is a label over a label on two.** §7.2 is the
board-by-board table.

**THE TWO FALLBACK FIGURES IN THE TABLE ABOVE ARE FROM DIFFERENT POPULATIONS AND
A RATIO BETWEEN THEM MEANS NOTHING.** §1's row says **15** and §6's row says
**53**. The 15 are over the **10** laid-out blocks of the four parity circuits
(**G260**'s published population); the 53 are over the **48** laid-out blocks of
all eleven boards. **§1's 13-of-15 finding has NOT been re-taken over the 48**,
so how many of the 53 the ruler accounts for is **unknown**
- dividing one figure by the other produces a number nobody has measured. §7.4
and **G274** clause 5 carry this; it is stated here because a reader who reads only
this table would otherwise meet the two numbers eight lines apart and the warning
five thousand lines away.

**THE THREE DECISIONS NO AGENT MAY MAKE**, carried at §7.5 with the figures each
one needs: **how much overlap is acceptable in a drawing** (**G260**); **which of
the three measured text-geometry quantities governs a collision** (**G265**
clause 4); and **whether the infinite/finite split in what may be overlapped
should be declared** (§6.3, §6.11). `CLAUDE.md`: *"An agent may never author the
acceptance criteria for the artifact it is producing."*

---

§1 Real text metrics, and how wrong the current ruler is
--------------------------------------------------------

**Every text extent in this repository is `text.length * GRID`**
(`lib/schgen/render/text-boxes.ts:35`, `GRID = 1270` um): one grid step per
character, every glyph as wide as the text is tall, `I` the same width as `W`.
`outlineExtent` at `:41` is `(net.length + 2) * GRID`, the same assumption for a
global label. Every collision figure the register publishes is downstream of
that function, and nobody had measured the error in it.

**Everything below comes from one run of `tools/schgen/text-metrics/probe.ts`**,
committed, at repository commit **`c71e5c9`** with a clean tree - **the commit
immediately before the one that writes this sentence**, which is as close as a
document can get to pinning the tree it was measured on - against
`kicad-cli` **10.0.5**, `pcbnew` build **10.0.5**, and `newstroke_font.cpp` at
KiCad tag `10.0.5`, SHA-256
`dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9`. **The probe
refuses a font blob with any other hash**, so a figure here cannot have come
from an unknown font. Re-drive it with:

```sh
curl -sSL -o /tmp/newstroke_font.cpp \
  https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/common/newstroke_font.cpp
bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp > run.log
bun run tools/schgen/text-metrics/verify-pastes.ts run.log
```

**The second command checks this document against that run**, and
`tests/schgen/text-metrics/document-pastes.test.ts` runs it on every `bun test`.
**Every fenced block tagged ` ```run <section> ` must be a contiguous, unique
slice of that named section of the log**; every block tagged otherwise must
share no line with it, and is listed by name as not checked. **§1.11 states what
that does and does not establish, and why it is on its third version.**

### 1.0 The three quantities, and why this section elects between none of them

The plan's Step 0 names three separately measurable things and **forbids this
task from choosing which governs a collision**, because that choice is an
acceptance criterion for the artifact this generator produces. All three are
measured; the owner elects.

| | what it is | where it comes from |
| --- | --- | --- |
| **Q1 advance** | how far the pen moves | `STROKE_FONT::GetTextAsGlyphs`: `cursor.x += KiROUND( glyphExtents.x )` per glyph |
| **Q2 ink** | where the strokes actually are | the glyphs' own stroke points, plus the pen eeschema plots with |
| **Q3 KiCad's box** | what `EDA_TEXT::GetTextBox` returns, which is what KiCad's clearance, selection and hit-testing use | `eda_text.cpp` + `font.cpp` + `gr_text.cpp` |

### 1.1 Which routes worked, and what each yielded

The plan offered three routes and said to report which. **All three worked**,
and each one validates the others.

| route | status | yielded |
| --- | --- | --- |
| **1. The font source** `[READ]` | worked | **Q1 exactly, and Q2's glyph geometry exactly.** `common/newstroke_font.cpp`, `common/font/stroke_font.cpp`, `common/font/font.cpp`, `common/eda_text.cpp`, `common/gr_text.cpp`, `eeschema/sch_text.cpp`, `eeschema/sch_label.cpp`, `eeschema/default_values.h`, all fetched at tag `10.0.5` and read. **Q3 is computable from it too**, and is |
| **2. The installed runtime** `[RAN]` | worked | **Q3 directly**, and an independent reading of Q2. `/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9` ships `pcbnew`, which exposes `EDA_TEXT::GetTextBox` and `EDA_TEXT::GetEffectiveTextShape`. KiCad ships **no eeschema bindings**, so the `EDA_TEXT` carrying the text is a `PCB_TEXT`; `GetTextBox` takes its pen from `GetEffectiveTextPenWidth()` with no render settings, so for one line of non-bold 1.27 mm text the number is the number eeschema computes - and that is not assumed, it is checked against routes 1 and 3 |
| **3. `kicad-cli` SVG and PDF** `[RAN]` | worked, **with one hole** | **Q2 in situ**, the three constants that place a field's ink against its anchor, and - from the invisible `<text>` element the SVG carries beside every stroked string - **KiCad's own declared advance, which is the only direct check Q1 has** (§1.3). All from an export of items `lib/schgen/render/emit-items.ts` itself emitted. **The SVG export does not draw a global label's outline**, so the label outline comes from the PDF export's own vector coordinates instead |

**Route 1 and route 2 agree exactly on KiCad's own box.** Over all 264 distinct
strings the eleven boards emit:

```run STEP 2 ROUTE 2:
route 1 vs route 2, GetTextBox width: 0 of 264 strings differ by more than a nanometre; worst disagreement 0.000000 um, on "+5V" - which is simply the first row, since nothing differs
route 1 vs route 2, stroked-outline width: 40 of 264 strings differ by more than a nanometre; worst disagreement 0.001524 um, on "TestPoint" - floating-point residue, not a difference in geometry
```

**The two lines are not the same claim and the wording matters.** The box width
is computed in integer nanometres on both sides and is **exactly** equal on all
264. The stroked-outline width is not: this probe scales twenty-firsts of an em
in floating point where the runtime works in integers, so 40 of the 264 land
**1.5 nanometres** apart. That is arithmetic residue, not geometry - and it is
reported at six decimal places rather than rounded to `0.0 um`, because
*"nothing differs"* and *"everything differs by less than a rounding step"* read
identically at one decimal place and are different statements.

**Route 1 placed by route 3's constants agrees with route 3 to 0.3 um**, which
is three ten-thousandths of a grid step. The SVG export writes four decimal
places of a millimetre, so that is three of its own coordinate units; it comes
from per-glyph nanometre rounding and was not chased further.

### 1.2 The glyph set the eleven boards actually emit `[RAN]`

```run STEP 1:
boards: 11; strings: 1086; of those, 498 are on boards that pass validateCircuit
  pt2399-core                    95 strings  refused at gate 1 (18 problems)
  pultec-hi-boost               106 strings  refused at gate 1 (20 problems)
  pultec-hi-cut                  82 strings  refused at gate 1 (14 problems)
  pultec-low-boost               76 strings  refused at gate 1 (14 problems)
  pultec-low-cut                 79 strings  refused at gate 1 (14 problems)
  pultec-mid                    150 strings  refused at gate 1 (28 problems)
  transistor-preamp-buffered     82 strings  reaches the drawing
  transistor-preamp-feedback     64 strings  reaches the drawing
  transistor-preamp-lab         121 strings  reaches the drawing
  transistor-preamp-loop         99 strings  reaches the drawing
  transistor-preamp-staged      132 strings  reaches the drawing
distinct characters over all eleven boards (64): "(" ")" "+" "-" "." "0" "1" "2" "3" "4" "5" "6" "7" "8" "9" "A" "B" "C" "D" "E" "F" "G" "H" "I" "J" "K" "L" "M" "N" "O" "P" "Q" "R" "S" "T" "U" "V" "W" "X" "Y" "[" "]" "_" "a" "b" "c" "d" "e" "h" "i" "j" "k" "l" "m" "n" "o" "p" "r" "s" "t" "u" "x" "y" "z"
distinct characters on boards that reach the drawing (50): "." "0" "1" "2" "3" "4" "5" "6" "7" "8" "9" "A" "B" "C" "D" "E" "F" "G" "H" "I" "J" "K" "L" "M" "N" "O" "P" "Q" "R" "S" "T" "U" "V" "W" "X" "Y" "[" "]" "_" "e" "i" "m" "n" "o" "p" "r" "s" "t" "u" "x"
characters that enter ONLY through a board gate 1 refuses: "(" ")" "+" "-" "a" "b" "c" "d" "h" "j" "k" "l" "y" "z"
```

**64 distinct characters, all printable ASCII, all in the stroke font's table.**
Nothing in the corpus falls back to `?`. Fourteen of the 64 reach the drawing
code only through a board `validateCircuit` refuses, so a measurement scoped to
what is actually drawn today is over 50 characters, not 64; **both are reported
rather than one of them chosen**, because gate 1's refusals are expected to be
fixed and the wider set is what the ruler will then have to serve.

A **string** here is a reserved Reference (`R000` - what the placer reserves
room for), an annotated Reference (`R4` - what a reader sees), a Value, a net
name, or an intersheet-reference text. Both Reference forms are carried: an
error table over one of them answers half the question.

### 1.3 Q1, the glyph advance, and a review claim that does not reproduce

`[READ]` `common/font/stroke_font.cpp` at tag `10.0.5`. The arithmetic, in full:
`STROKE_FONT_SCALE = 1/21`, `FONT_OFFSET = -8`; a glyph record's first two
characters encode `glyphStartX` and `glyphEndX` as `c - 'R'`, and
`glyphWidth = glyphEndX - glyphStartX` is the advance. A stroke point is
`x = (c0 - 'R')/21 - glyphStartX`, `y = (c1 - 'R' - 8)/21`.

A selection of the resulting table, in micrometres at 1.27 mm text:

| char | advance | | char | advance | | char | advance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `I` | 604.8 | | `R` | 1270.0 | | `W` | 1451.4 |
| `.` | 604.8 | | `A` | 1088.6 | | `M` | 1451.4 |
| `i` | 604.8 | | digits `0`-`9` | 1209.5 | | `m` | 1693.3 |
| `l` | 665.2 | | `_` | 967.6 | | `H`,`N`,`O`,`Q`,`U` | 1330.5 |

**`I` is 604.8 um and `W` is 1451.4 um: a factor of 2.4.** The current model
gives both 1270.0.

**THE REVIEW'S SUPPORTING CLAIM IS DRIVEN AND DOES NOT REPRODUCE.** The
third-party review held that *strokes may extend outside their nominal advance*,
which matters because it would make an advance-based box unsafe for collision
work. `buildGlyphBoundingBox` imposes the x range `[0, glyphWidth]` from the
width fields rather than measuring it from the points, so the claim is
structurally possible - and for this glyph set it is false:

```run STEP 2 ROUTE 1:
CLAIM DRIVEN AND NOT REPRODUCED: no glyph of this corpus has a stroke outside [0, advance]. The third-party review's supporting claim that strokes may extend outside their nominal advance is FALSE for this glyph set.
over the whole printable-ASCII range the count is 1: "\\"
```

**Over the whole printable-ASCII range exactly one glyph overhangs its advance -
the backslash - and it is not in this repository's corpus.** The claim is
correct in principle and inert here, which is a result about the font and not a
criticism of the review.

**Q1 HAS A CHECK OF ITS OWN, AND IT IS THE ONLY DIRECT ONE.** Routes 2 and 3
pin the box and the ink; the advance sum is otherwise confirmed only through
`GetTextBox`'s own width formula, which is the same arithmetic again. KiCad's
SVG export writes an invisible `<text>` element beside every stroked string
carrying a `textLength`, and that is a statement of advance independent of
everything else in the file. `[RAN]` over 23 strings - six shaped probes and a
stride-sampled spread of the real corpus:

```run STEP 2 ROUTE 3c:
23 strings carry a declared textLength at 1270.0 um text
textLength MINUS the font source's advance sum is a CONSTANT 203.2 um; worst departure from it 0.4 um on "IIIIIIIIII"
CONTROL (could have answered differently): the same residual against length * GRID is -462.0 um with a departure of 5986.8 um on "IIIIIIIIII" - 14819x wider, so this check discriminates
  "+5V"                  textLength    4073.7  advance    3870.5  residual   203.2
  "1.2K"                 textLength    4497.0  advance    4293.8  residual   203.2
  "100nF"                textLength    6069.3  advance    5866.2  residual   203.1
  "2200pF"               textLength    7278.8  advance    7075.7  residual   203.1
  "4700pF"               textLength    7278.8  advance    7075.7  residual   203.1
  "BYPASS_JUMPED"        textLength   15745.5  advance   15542.4  residual   203.1
  "C7"                   textLength    2682.7  advance    2479.5  residual   203.2
  "I"                    textLength     808.0  advance     604.8  residual   203.2
  "IIIIIIIIII"           textLength    6251.2  advance    6047.6  residual   203.6
  "IN_SOURCE"            textLength   10665.6  advance   10462.4  residual   203.2
  "L4"                   textLength    2440.8  advance    2237.6  residual   203.2
  "Net-(U1-LPF2-OUT)"    textLength   20523.4  advance   20320.0  residual   203.4
  "R000"                 textLength    5101.7  advance    4898.6  residual   203.1
  "R100"                 textLength    5101.7  advance    4898.6  residual   203.1
  "RV4"                  textLength    3771.3  advance    3568.1  residual   203.2
  "SW2"                  textLength    4073.6  advance    3870.5  residual   203.1
  "UPPER_FLOOR"          textLength   13508.0  advance   13304.8  residual   203.2
  "VCC"                  textLength    3831.8  advance    3628.6  residual   203.2
  "[1]"                  textLength    3106.1  advance    2902.9  residual   203.2
  "j12_p4"               textLength    6553.1  advance    6350.0  residual   203.1
  "j5_p6"                textLength    5343.6  advance    5140.5  residual   203.1
  "mid_sel_3khz"         textLength   12782.1  advance   12579.0  residual   203.1
  "parked"               textLength    6553.1  advance    6350.0  residual   203.1
```

**THE FOURTH READING AGREES.** It is not the advance sum itself - it is the
advance sum plus a constant 203.2 um, which is why it is a check on the table
rather than a restatement of it: a string's declared length varies with the
glyphs in it exactly as the table says, from one character to seventeen, with a
worst departure of **0.4 um**.

**What it would have taken for it to disagree.** The residual is
`textLength - our advance sum`, so any error in the advance table shows up as a
residual that is not constant. A single wrong glyph width of `w` moves the
residual of every string containing that glyph by `w`, and a systematically
wrong model - the obvious one being the model this whole section is about -
scatters it: `length * GRID` gives the same comparison a departure of
**5986.8 um**, about **14819 times** wider. **The constant 203.2 um itself is
NOT explained here**: it is `4/3` of the 152.4 um plotted pen, which is the same
`4/3` the export applies to `font-size`, and no source was read that says why.
It is a constant and the check only needs it to be one.

### 1.4 Q3, `EDA_TEXT::GetTextBox`, transcribed and then driven

`[READ]`, composed in the source's own order:

```cpp
FONT::StringBoundaryLimits -> drawMarkup -> GetTextAsGlyphs sets the box end to
  ( cursor.x - KiROUND( size.x * INTER_CHAR ), cursor.y - size.y ),  INTER_CHAR = 0.2
StringBoundaryLimits then inflates a STROKE font's box by KiROUND( thickness * 1.5 ) on every side
GetTextBox adds a fudgeFactor of KiROUND( extents.y * 0.17 ) to the height for a stroke font
thickness = GetEffectiveTextPenWidth() with NO default
          = GetPenSizeForNormal( GetTextWidth() ) = KiROUND( size / 8.0 )   (common/gr_text.cpp)
```

`[RAN]`, over all 264 strings, that transcription reproduces the installed
runtime **exactly** (0.0 um worst disagreement, §1.1). For 1.27 mm text:

- `thickness` is **158.75 um**;
- the height of a single line is **2043.1 um** and does not depend on the
  string, against the current model's **1270.0**;
- `GetTextBox`'s justification arms put the box at `[x, x+w]` for left,
  `[x-w, x]` for right, `[x-w/2, x+w/2]` for centre and `[y-h/2, y+h/2]` for the
  vertical centring this emitter leaves at KiCad's default - **the same
  anchor-relative shape `textBox` already uses**, so Q3 differs from the current
  model in its width and height alone and not in where the box sits.

**A disagreement inside KiCad itself, recorded because it is a trap.** The pen
`GetTextBox` sizes its box with is `size/8 = 158.75 um`; **the pen eeschema
PLOTS with is 152.4 um** (6 mil), which route 3 measured off the SVG's own
`stroke-width`. So KiCad's own bounding box is computed with a pen KiCad does
not draw with. It is recorded so the next person who finds the two numbers does
not take one for a transcription error.

**AND IT ACCOUNTS FOR ALMOST NONE OF WHY THE BOX IS TALL, which matters because
the owner elects between these quantities.** `[RAN]` the counterfactual:

```run STEP 3:
line HEIGHT: current model 1270.0 um; rendered ink 1422.4 um for "R100"; EDA_TEXT::GetTextBox 2043.1 um (height does not depend on the string for a single line without descenders)
  of that 773.1 um excess over the model: 2 x KiROUND(1.5 x pen) = 476.3 um (61.6%) and KiROUND(0.17 x extents.y) = 296.9 um (38.4%)
  COUNTERFACTUAL: recomputed at the PLOTTED pen 152.4 um instead of the box pen 158.8 um, GetTextBox would return 2020.8 um - so the pen disagreement accounts for 22.3 um, 2.9% of the excess
```

**The 773.1 um by which KiCad's box exceeds this repository's line is 61.6%
the `1.5 x pen` inflation, 38.4% the 17% fudge factor, and 2.9% the pen
disagreement.** A reader deciding whether to discount Q3's height as a
bookkeeping artefact of a pen KiCad does not plot with would be discounting
**22.3 um of 773.1**: at the plotted pen the box is still 2020.8 um, 59% taller
than the model's line.

### 1.5 Q2, the rendered ink, and the three constants that place it

Route 3 emitted real `partSymbol` and `globalLabel` nodes - **built by
`lib/schgen/render/emit-items.ts`, not hand-written** - exported them with
`kicad-cli sch export svg`, and measured the stroke geometry. `[RAN]`:

```run STEP 2 ROUTE 3:
R100 left rot0         paths= 56 ink x[337.3,4844.0] y[-766.7,655.7]
R100 right rot0        paths= 56 ink x[-4783.6,-276.9] y[-766.7,655.7]
R100 center rot0       paths= 56 ink x[-2223.1,2283.6] y[-766.7,655.7]
R100 left rot90        paths= 56 ink x[337.3,4844.0] y[-766.8,655.6]
R100 left rot180       paths= 56 ink x[337.3,4844.0] y[-766.8,655.6]
R100 left rot270       paths= 56 ink x[337.3,4844.0] y[-766.7,655.7]
I left rot0            paths=  1 ink x[337.3,489.7] y[-766.7,655.7]
IIIIIIIIII left rot0   paths= 10 ink x[337.3,5932.9] y[-766.7,655.7]
100nF left rot0        paths= 55 ink x[276.9,5872.0] y[-766.7,655.7]
VCC right              paths= 43 ink x[1573.7,11130.2] y[-796.8,1169.9]
VCC up                 paths= 43 ink x[-796.8,1169.9] y[-11130.3,-1573.8]
sample 0 +5V           paths= 19 ink x[337.3,3936.9] y[-766.7,655.7]
sample 1 1.2K          paths= 23 ink x[276.9,4239.2] y[-766.7,655.7]
sample 2 2200pF        paths= 75 ink x[216.4,7081.5] y[-766.7,1079.1]
sample 3 4700pF        paths= 60 ink x[276.9,7081.5] y[-827.1,1079.1]
sample 4 BYPASS_JUMPED paths=117 ink x[337.3,15487.7] y[-766.7,776.7]
sample 5 C7            paths= 17 ink x[276.9,2485.4] y[-766.7,655.7]
sample 6 IN_SOURCE     paths= 79 ink x[337.3,10407.9] y[-766.7,776.7]
sample 7 L4            paths=  5 ink x[337.3,2243.5] y[-827.1,655.7]
sample 8 Net-(U1-LPF2-OUT) paths=111 ink x[337.3,20205.1] y[-948.1,1139.5]
sample 9 R000          paths= 71 ink x[337.3,4844.0] y[-766.7,655.7]
sample 10 RV4          paths= 16 ink x[337.3,3574.0] y[-827.1,655.7]
sample 11 SW2          paths= 33 ink x[276.9,3815.9] y[-766.7,655.7]
sample 12 UPPER_FLOOR  paths= 93 ink x[337.3,13250.2] y[-766.7,776.7]
sample 13 j12_p4       paths= 40 ink x[95.4,6355.8] y[-827.1,1079.1]
sample 14 j5_p6        paths= 58 ink x[95.4,5085.9] y[-766.7,1079.1]
sample 15 mid_sel_3khz paths= 89 ink x[337.3,12584.8] y[-766.7,776.7]
drawn pen 152.4 um; anchor to pen origin 111.1 um; anchor to baseline 519.0 um
route 1 placed by route 3's constants vs route 3's own measurement: worst edge disagreement 0.3 um (IIIIIIIIII left rot0)
```

**A SYMBOL FIELD IS NEVER DRAWN VERTICALLY, AT ANY SYMBOL ROTATION.** All four
rotations give the same ink box to 0.1 um. That is `fieldOrientation`'s whole
purpose and it means the plan's *"a width measured only horizontally does not
characterise a rotated field"* does not bite for Reference and Value. Vertical
text does exist in this emitter - a power symbol's Value alongside an up/down
glyph, and an up/down global label's intersheet references - and for those the
metric transposes exactly (§1.6's control).

**The ink box is NOT centred on its anchor.** It runs 766.7 um above and 655.7
below, against the current model's symmetric 635/635. So the model is 131.7 um
short above and 20.7 um generous below for a capitals-and-digits string.

**Three controls, each of which could have answered differently:**

```run STEP 2 ROUTE 3:
CONTROL (could have answered differently): ten 'I' measured 5595.6 um, predicted from one 'I' plus nine advances 5595.3 um, difference 0.3 um
CONTROL: the same string right-justified is 4506.7 um wide against 4506.7 um left-justified
CONTROL: an 'up' label's box is the 'right' label's box transposed - up 1966.7 x 9556.5, right 9556.5 x 1966.7
```

The first is the plan's required scaling control: the measurement scales with
glyph count and the advance table predicts it. The second establishes that
justification moves the box without resizing it. The third establishes the
transposition this document then relies on for vertical text, rather than
assuming it.

### 1.6 Global labels, and a hole in `kicad-cli`

**FINDING, and it is about the tool rather than about this repository:
`kicad-cli sch export svg` 10.0.5 draws a global label's TEXT and not its
outline. `kicad-cli sch export pdf` of the same file draws both.** `[RAN]` This
was found by the probe's own refusal - an SVG row that should have been 2.7 mm
across measured 1.27 - and confirmed by rendering the same schematic to PDF and
looking at it. **An SVG export therefore cannot answer "how much room does a
global label take" at all.** The outline is read instead off the PDF content
stream's own vector operands, which is exact rather than rastered.

`[READ]` `eeschema/sch_label.cpp`'s `SCH_GLOBALLABEL::CreateGraphicShape`:

```cpp
margin    = KiROUND( m_LabelSizeRatio * GetTextSize().y )     // DEFAULT_LABEL_SIZE_RATIO 0.375
halfSize  = GetTextHeight() / 2 + margin
linewidth = GetPenWidth()                                     // SCH_TEXT: GetEffectiveTextPenWidth()
symb_len  = GetTextBox().GetWidth() + 2 * margin
x = symb_len + linewidth + 3 ;  y = halfSize + linewidth + 3
```

and for `L_BIDI`, the shape `emit-items.ts` writes, the outline runs
`x + 2 * halfSize` along the label's side and `y` either side of it. `[RAN]`
against the PDF's own coordinates:

```run STEP 2 ROUTE 3b:
A                PDF outline along 4645.3 across 2540.8 um; sch_label.cpp predicts along 4644.6 across 2540.0; (net.length + 2) * GRID predicts along 3810.0 across 2540.0
ABC              PDF outline along 7185.3 across 2540.8 um; sch_label.cpp predicts along 7184.6 across 2540.0; (net.length + 2) * GRID predicts along 6350.0 across 2540.0
VCC              PDF outline along 7185.3 across 2540.8 um; sch_label.cpp predicts along 7184.6 across 2540.0; (net.length + 2) * GRID predicts along 6350.0 across 2540.0
BYPASS_CAP       PDF outline along 15289.1 across 2540.8 um; sch_label.cpp predicts along 15288.4 across 2540.0; (net.length + 2) * GRID predicts along 15240.0 across 2540.0
BUFFER_EMITTER   PDF outline along 19280.4 across 2540.8 um; sch_label.cpp predicts along 19279.8 across 2540.0; (net.length + 2) * GRID predicts along 20320.0 across 2540.0
route 1+2 outline formula vs the PDF's own coordinates: worst disagreement 0.8 um
the outline's fixed part - what it adds to GetTextBox's width, independent of the net name - is 3333.8 um by sch_label.cpp's arithmetic and 3334.3 to 3334.5 um as the PDF measures it over 5 nets
```

**`outlineExtent` is not conservative; it is wrong in both directions.** It
UNDER-reserves by **835 um** for a one- and three-character net name and
OVER-reserves by **1040 um** for a fourteen-character one, crossing over at
about ten characters. The reason is visible in the formula: the real outline is
**`GetTextBox`'s width plus a constant 3333.8 um** of arrow ends, margins and
line width (the PDF measures that constant at 3334.3 to 3334.5), and `(n + 2) * GRID` models that constant as two character widths -
which is only right when a character happens to be a grid step wide. **Across its side the two
agree to 0.8 um** - `halfSize + linewidth` is 1270.0 um, exactly `GRID` - which
is a coincidence of `0.375 + 0.5` landing on `1 - 1/8`, not a design.

### 1.7 THE ERROR TABLE `[RAN]`

264 distinct strings, each measured under all three quantities. The whole table
is in the probe's output; here are its shape and its extremes.

```run STEP 3:
estimate / glyph advance sum: n=264 min 0.955 p25 1.037 median 1.091 p75 1.200 max 1.448; the estimate is SMALLER than this quantity for 11 of 264 strings
estimate / rendered ink: n=264 min 1.005 p25 1.119 median 1.182 p75 1.238 max 1.865; the estimate is SMALLER than this quantity for 0 of 264 strings
estimate / EDA_TEXT::GetTextBox: n=264 min 0.881 p25 0.992 median 1.051 p75 1.159 max 1.303; the estimate is SMALLER than this quantity for 70 of 264 strings
estimate minus glyph advance sum: widest OVER-estimate 5019.5 um (3.95 grid steps) on "si_hi_boost_j20_p3"; widest UNDER-estimate 302.4 um (0.24 grid steps) on "100mH"
estimate minus rendered ink: widest OVER-estimate 5350.9 um (4.21 grid steps) on "si_hi_boost_j20_p3"; the estimate is never smaller - its narrowest margin is 29.0 um on "200mH"
estimate minus EDA_TEXT::GetTextBox: widest OVER-estimate 4797.3 um (3.78 grid steps) on "si_hi_boost_j20_p3"; widest UNDER-estimate 524.6 um (0.41 grid steps) on "100mH"
```

Representative rows, in micrometres:

| string | `length * GRID` | Q1 advance | Q2 ink | Q3 `GetTextBox` |
| --- | --- | --- | --- | --- |
| `"0"` | 1270.0 | 1209.5 | 878.1 | **1431.8** |
| `"GND"` | 3810.0 | **3870.5** | 3539.1 | **4092.7** |
| `"100mH"` | 6350.0 | **6652.4** | 6260.5 | **6874.6** |
| `"R000"` | 5080.0 | 4898.6 | 4506.7 | **5120.8** |
| `"100nF"` | 6350.0 | 5866.2 | 5595.3 | 6088.4 |
| `"BASE"` | 5080.0 | 4717.1 | 4325.3 | 4939.4 |
| `"BYPASS_CAP"` | 12700.0 | 11732.4 | 11340.5 | 11954.6 |
| `"Jumper_2_Open"` | 16510.0 | 14695.7 | 14364.3 | 14918.0 |
| `"TestPoint"` | 11430.0 | 8708.6 | 8619.1 | 8930.8 |
| `"si_hi_boost_j20_p3"` | 22860.0 | 17840.5 | 17509.1 | 18062.7 |

Bold entries are where **the current model is SMALLER than the measured
quantity**, which is the direction nobody expected: the function's own comment
calls it *"conservative"*.

**Three things the distribution says that a single ratio would not.**

1. **Against the ink, `length * GRID` is conservative everywhere** - 0 of 264
   strings under-reserve - but by a median of **18%** and a maximum of **87%**.
   The widest over-reservation is **4.2 grid steps**, which is more than three
   characters of room claimed and not used.
2. **Against KiCad's own box it is NOT conservative: it is too small for 70 of
   264 strings**, by up to 524.6 um. Every one of those is a short string of
   wide glyphs - `GND`, `+5V`, `1M`, `100mH` - where the box's fixed 222.25 um
   of padding exceeds what a character-count model leaves over.
3. **In HEIGHT the model is too small under both measured quantities, always.**
   One line is 1270.0 um in the model, **1422.4 um of ink** for a
   capitals-and-digits string, **1845.7 um of ink** for one with a descender
   (`"1000pF"`), and **2043.1 um** of KiCad's own box. That is the finding with
   the most consequences below, because the field placer stacks two lines and
   grows each by half a line.

### 1.8 Where the three measured quantities disagree with each other

```run STEP 3b:
widest disagreement between two measured quantities: 795.6 um (0.63 grid steps) on "[2]", rendered ink vs EDA_TEXT::GetTextBox
ORDERING ink < advance < box: 0 violation(s) over 264 strings
```

In width the three are within **0.63 grid steps** of each other over the whole
corpus, and **the ordering is always the same - ink < advance < box, with zero
violations over all 264 strings**, which is driven rather than asserted. **In height
they are not close**: 1422.4 (ink) against 2043.1 (box) is a **44% difference**,
and that is what makes Step 0's election consequential rather than academic -
see §1.9, where the height is what changes the survivor counts.

### 1.9 The repository's own collision figures, re-taken once per quantity

**The control first, because without it none of this means anything.** The
probe runs a parallel copy of `placeFields` whose only difference is which
function returns a text box. Under the current ruler it must reproduce
`lib/schgen/render/field-placement.ts` exactly. `[RAN]`:

```run STEP 4b:
  SKIPPED opamp-buffer: validateCircuit reports 3 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  SKIPPED optical-compressor: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  SKIPPED optical-compressor/oc-audio: refused before checkLayout, so there is no grid-legal geometry to measure
  SKIPPED optical-compressor/oc-sidechain: refused before checkLayout, so there is no grid-legal geometry to measure
  SKIPPED pt2399-core: validateCircuit reports 18 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
CONTROL PASSED: over 10 laid-out blocks the parallel search reproduces lib/schgen/render/field-placement.ts exactly, block, unit, lib id, cost and covers.
```

**The five `SKIPPED` lines above it are part of the evidence, not noise.** Two
name circuits whose blocks are measured although `validateCircuit` refuses them,
which is what makes this the same population **G260** counted; two name blocks
that have no grid-legal geometry for anything to be measured on. They are
pasted because the control's *"over 10 laid-out blocks"* means nothing without
them - and because a one-line paste is a paste a checker cannot anchor (§1.11).

That control can fail: it compares two independent code paths over the same
geometry, including the rounded weighted cost and every `covers` string, and an
error in the copy would move one of them. It also reproduces **G260**'s
published population exactly - fifteen fallbacks, distributed `ob-buffer` 2,
`oc-power` 1, `pt-core` 8, `tp-stage` 4 - which is corroboration from a second
code path of a number that had one.

#### G239's five-of-eleven slots `[RAN]`

```run STEP 4a:
Jumper:Jumper_2_Open     body 5080.0 x 2286.0 um
    length x GRID (current model)  grown pair 7620.0 x 2540.0   inside slots that fit: 0 of 5   Value "Jumper_2_Open" 16510.0 um = 3.25x the body WIDTH 5080.0 um, 7.22x its HEIGHT
    glyph advance sum              grown pair 7136.2 x 2540.0   inside slots that fit: 0 of 5   Value "Jumper_2_Open" 14695.7 um = 2.89x the body WIDTH 5080.0 um, 6.43x its HEIGHT
    rendered ink                   grown pair 6865.3 x 2692.4   inside slots that fit: 0 of 5   Value "Jumper_2_Open" 14364.3 um = 2.83x the body WIDTH 5080.0 um, 6.28x its HEIGHT
    EDA_TEXT::GetTextBox           grown pair 7358.4 x 3313.1   inside slots that fit: 0 of 5   Value "Jumper_2_Open" 14918.0 um = 2.94x the body WIDTH 5080.0 um, 6.53x its HEIGHT
Device:C                 body 4064.0 x 2032.0 um
    length x GRID (current model)  grown pair 7620.0 x 5080.0   inside slots that fit: 0 of 5   Value "100nF" 6350.0 um = 1.56x the body WIDTH 4064.0 um, 3.13x its HEIGHT
    glyph advance sum              grown pair 7136.2 x 5080.0   inside slots that fit: 0 of 5   Value "100nF" 5866.2 um = 1.44x the body WIDTH 4064.0 um, 2.89x its HEIGHT
    rendered ink                   grown pair 6865.3 x 5232.4   inside slots that fit: 0 of 5   Value "100nF" 5595.3 um = 1.38x the body WIDTH 4064.0 um, 2.75x its HEIGHT
    EDA_TEXT::GetTextBox           grown pair 7358.4 x 5853.1   inside slots that fit: 0 of 5   Value "100nF" 6088.4 um = 1.50x the body WIDTH 4064.0 um, 3.00x its HEIGHT
Device:C_Polarized       body 4572.0 x 3810.0 um
    length x GRID (current model)  grown pair 7620.0 x 5080.0   inside slots that fit: 0 of 5   Value "4.7uF" 6350.0 um = 1.39x the body WIDTH 4572.0 um, 1.67x its HEIGHT
    glyph advance sum              grown pair 6531.4 x 5080.0   inside slots that fit: 0 of 5   Value "4.7uF" 5261.4 um = 1.15x the body WIDTH 4572.0 um, 1.38x its HEIGHT
    rendered ink                   grown pair 6260.5 x 5232.4   inside slots that fit: 0 of 5   Value "4.7uF" 4990.5 um = 1.09x the body WIDTH 4572.0 um, 1.31x its HEIGHT
    EDA_TEXT::GetTextBox           grown pair 6753.7 x 5853.1   inside slots that fit: 0 of 5   Value "4.7uF" 5483.7 um = 1.20x the body WIDTH 4572.0 um, 1.44x its HEIGHT
Audio:PT2399             body 20320.0 x 30480.0 um
    length x GRID (current model)  grown pair 6350.0 x 2540.0   inside slots that fit: 5 of 5   Value "PT2399" 7620.0 um = 0.38x the body WIDTH 20320.0 um, 0.25x its HEIGHT
    glyph advance sum              grown pair 6229.0 x 2540.0   inside slots that fit: 5 of 5   Value "PT2399" 7075.7 um = 0.35x the body WIDTH 20320.0 um, 0.23x its HEIGHT
    rendered ink                   grown pair 5837.2 x 2692.4   inside slots that fit: 5 of 5   Value "PT2399" 6683.8 um = 0.33x the body WIDTH 20320.0 um, 0.22x its HEIGHT
    EDA_TEXT::GetTextBox           grown pair 6451.3 x 3313.1   inside slots that fit: 5 of 5   Value "PT2399" 7298.0 um = 0.36x the body WIDTH 20320.0 um, 0.24x its HEIGHT
```

**G239's finding survives all three quantities, and gets stronger under two of
them.** Its arithmetic rests on HEIGHT, which real geometry makes larger, not
smaller. The jumper's Value is emitted hidden (**G257**) so its grown block is
one line: **2540.0** um in the model, **2692.4** of ink, **3313.1** of KiCad's
box, against a 2286 um body. The capacitors keep both lines: **5080.0** in the
model, **5232.4** of ink, **5853.1** of KiCad's box, against a 2032 um body.
The PT2399 row is the positive control and it could have moved; it does not.

#### The jumper, and the figures in the plan's *state* section `[RAN]`

- *"the jumper's Value is seven times wider than its body"*. `[RAN]`, and the
  first thing to say is that **the "seven times" compares a width to a HEIGHT**:
  `Jumper:Jumper_2_Open`'s body is 5080 x 2286 um, and 16510.0 / 2286 is 7.22
  while 16510.0 / 5080 is 3.25. Against each quantity, with both ratios:

  | | Value width | x the body's height | x the body's width |
  | --- | --- | --- | --- |
  | `length * GRID` | 16510.0 | **7.22** | 3.25 |
  | Q1 advance | 14695.7 | **6.43** | 2.89 |
  | Q2 ink | 14364.3 | **6.28** | 2.83 |
  | Q3 `GetTextBox` | 14918.0 | **6.53** | 2.94 |

  **The claim survives under every quantity; its number is 10-13% high**, and
  the comparison it makes is to the body's shorter dimension.
- *"5080 um of Reference-and-Value into a 2286 um body"*: for `Device:C` the
  grown pair is 5080.0 um in the model, **5232.4** of ink and **5853.1** of
  KiCad's box. **The figure is an UNDER-statement**, by up to 15%.

#### G260's fifteen fallback placements `[RAN]`

```run STEP 4b:
block                               length x   glyph adv  rendered   EDA_TEXT:
opamp-buffer/ob-buffer                      2          2          2          3
optical-compressor/oc-power                 1          1          1          2
pt2399-core/pt-core                         8          6         11         13
transistor-preamp/tp-leg-upper              0          0          0          0
transistor-preamp/tp-leg-feedback           0          0          0          0
transistor-preamp/tp-leg-lower-a            0          0          0          0
transistor-preamp/tp-leg-lower-b            0          0          0          0
transistor-preamp/tp-leg-collector          0          0          0          0
transistor-preamp/tp-leg-emitter-bypass          0          0          0          0
transistor-preamp/tp-stage                  4          4          6          6
TOTAL                                      15         13         20         24

SURVIVORS: of the fallbacks the current ruler produces, how many are still fallbacks under each measured quantity
  glyph advance sum              survived 13 of 15; vanished 2; NEW under this quantity 0
  rendered ink                   survived 14 of 15; vanished 1; NEW under this quantity 6
  EDA_TEXT::GetTextBox           survived 15 of 15; vanished 0; NEW under this quantity 9
```

**THE HEADLINE. Thirteen of the fifteen survive under every quantity; none of
the fifteen is an artefact of the ruler under all three.** Under KiCad's own box
every one of them survives and nine more appear, so the population grows from 15
to **24**. Under the ink it grows to **20**. Only the advance - which changes
width and leaves height alone - shrinks it, to **13**.

**So the election in Step 0 is consequential.** A reader who elects the advance
is told there are two fewer problems than are recorded; a reader who elects
KiCad's box is told there are nine more. **The difference is almost entirely
height**, which is the one axis where the three quantities are far apart (§1.8).

#### The blocks blocked on drawn-text overlaps `[RAN]`

Three blocks refuse at `checkLayout` on drawn text. The probe recomputes each
block's label and power-value boxes under each quantity and tests them against
the production geometry of bodies, pin text, interior graphics, pin marks and
wires:

```run STEP 4b:
SURVIVORS: drawn-text overlaps
  glyph advance sum              survived 4; vanished 4; NEW under this quantity 0
  rendered ink                   survived 4; vanished 4; NEW under this quantity 5
  EDA_TEXT::GetTextBox           survived 4; vanished 4; NEW under this quantity 5
```

Under the current ruler the probe finds **eight** overlapping pairs, and those
eight are the published refusals of the three blocks - `ob-buffer`'s
`value of power GND overlaps value of power VEE`, `tp-leg-emitter-bypass`'s
`label BYPASS_JUMPED overlaps label BYPASS_CAP`, and the six distinct pairs
`tp-stage` names. **That correspondence was read off the probe's own output,
which prints each block's refusal beside the table; it is not asserted by a
check.**

Per quantity, **the blocking pair of each of the three blocks survives**:

| block | its published blocker | advance | ink | KiCad's box |
| --- | --- | --- | --- | --- |
| `ob-buffer` | `value of power GND` over `value of power VEE` | survives, 1 of 1 | survives, 1 of 1 | survives, 1 of 1 |
| `tp-leg-emitter-bypass` | `label BYPASS_JUMPED` over `label BYPASS_CAP` | survives, 1 of 1 | survives, **2 new** | survives, **2 new** |
| `tp-stage` | six pairs, of which `label BYPASS_CAP` over `pin Q1.2 text` and over `wire 12 (COLLECTOR)` | 2 survive, 4 vanish | 2 survive, 4 vanish, **3 new** | 2 survive, 4 vanish, **3 new** |

**The four that vanish on `tp-stage` are all of `label BASE`'s**, plus
`label BYPASS_CAP overlaps body of Q1#1`. They vanish because `labelExtent`
over-reserves for a label that carries intersheet references: the model reserves
`(n+2)*GRID + GRID/2 + length*GRID` where the drawing uses
`text width + 3333.8 + GRID/2 + text width`. **So four of this repository's
eight recorded drawn-text overlaps are artefacts of the ruler, and four are
real.** New ones appear in their place under the two larger quantities.

### 1.10 What §1 did NOT establish

- **It does not elect a quantity.** That is the owner's, and §1.9 is the
  evidence he would need.
- **It does not re-take `render/text-scene.ts`'s full clearance pass.** That
  pass grades more relations than overlap - *"lies under"*, *"crosses the border
  of"* - and what §1.9 recomputes is the overlap subset the three blocked blocks
  refuse on. A quantity that changed a *"lies under"* verdict without changing an
  overlap would not show here.
- **It does not measure a multi-line field, a bold or italic field, or a text
  size other than 1.27 mm**, because this emitter writes none of those.
- **It does not explain two small residuals**, both recorded rather than
  smoothed: the anchor-to-pen-origin offset measures **111.1 um** where
  `font.cpp`'s `offset.x += m_StrokeWidth / 1.52` predicts 100.3, a 10.8 um
  difference; and the PDF's label outline is **0.8 um** longer than
  `sch_label.cpp` predicts. Both are under 1% of a grid step and neither was
  diagnosed.
- **It does not establish what KiCad's eeschema `SCH_FIELD::GetBoundingBox`
  returns**, as distinct from the `EDA_TEXT::GetTextBox` it is built on. KiCad
  ships no eeschema Python bindings, so Q3 is measured through `PCB_TEXT`; the
  shared primitive is the same code and the figure was checked against two other
  routes, but a field-level margin applied only in eeschema would not have been
  seen.

### 1.11 How this section's evidence is checked, and what the check cannot see

**Everything §1 pastes as probe output is held to a run's log by
`tools/schgen/text-metrics/verify-pastes.ts`**, which
`tests/schgen/text-metrics/document-pastes.test.ts` runs on every `bun test`. It
exists because the first round of this section **tidied seven pasted blocks
without meaning to** - a truncated line, a control that lost its parenthetical,
two tables re-padded so their columns lined up, a claim rewrapped, and a block
left stale after the probe grew a column. None changed a figure; all were edits
to evidence, and reading for them by eye did not find them.

**It is on its third version, and the two it replaced are more instructive than
the one that works.**

| version | what it required | how it was defeated |
| --- | --- | --- |
| 1 | each line appears somewhere in the log; blocks with under half their lines matching are skipped | a genuine line moved into the wrong block PASSED; and fabricating four of six lines dropped a block below the gate so it was **silently excluded** and the run reported success |
| 2 | each `run` block is a contiguous slice of the log | **contiguity is vacuous at length 1** - the document's one single-line block could be swapped for any unrelated genuine log line and the checker exited 0 |
| 3 | a contiguous, unique slice of a **named section**, with at least two non-blank lines, not overlapping another block | - |

**Version 2's failure is the one worth carrying forward: a rule strictly
stronger for n ≥ 2 was strictly EQUAL at n = 1.** Generalising a rule does not
generalise its boundary, and nobody checks the boundary of a rule they have just
strengthened.

**What it establishes.** A `run` block was produced by the probe, in the step it
says it came from, with its lines in the order and the spacing the run printed
them.

**What it does NOT establish, stated rather than left to be discovered:**

- **That the log is a CURRENT run.** Nothing here can re-drive the probe:
  that needs `kicad-cli`, KiCad's Python bindings and a 2.9 MB font blob fetched
  outside the repository. Instead the log and the document are COUPLED - the
  document names the commit its figures were measured at, the log records the
  commit it was taken at, and a test requires them to agree.
- **That the right output sits under the right prose.** A block could be
  replaced by a different genuine, contiguous, unique slice of the **same**
  declared section and this would pass. Closing that needs the checker to read
  prose. The section anchor narrows the target from the whole run to one step; it
  does not eliminate it.
- **Anything about the three blocks it does not check.** They are a shell
  command and two transcriptions of KiCad's source, and the checker prints all
  three by name on every run, because *"not checked"* must never be
  indistinguishable from *"checked and clean"*.

**The log must hold exactly one run**, and a log holding two is refused by name.
Two runs give every section header a twin, so *"which section is this block
from"* stops having an answer, and this document pins one commit, which a
two-run log cannot carry. Handling multiples would need the document to declare
which run as well as which section; that was costed and declined.

**The costs this has imposed on the document, paid rather than discounted.**
Two blocks were EXCERPTS - eight of the twenty-three declared advances, six of
the twenty-seven measured rows - and an excerpt cannot be told from a tidy by
any rule that does not read minds, so both now paste in full. One block was a
single line, and now carries the five `SKIPPED` lines above it. **That is why
§1.3, §1.5 and §1.9 are longer than a reader needs.**

---

§2 What ELK already offers for labels, and what it cannot own
-------------------------------------------------------------

**THE HYPOTHESIS THIS SECTION WAS COMMISSIONED TO TEST, from the plan:** this
repository already depends on ELK for block layout and already validates against
its full option set, so *"if ELK places labels and the repository hand-rolled
it, that is the answer and it is free."*

**It is not free, and the reason is specific rather than general.** ELK places
labels - three classes of them, driven below. **What it will not place is the one
class that blocks this repository**, and the obstacle is not a missing ELK
feature: it is that a KiCad `global_label` has exactly one coordinate and ELK's
answer has nowhere to go. The negative is measured, not argued, and §2.8 states
it in one paragraph.

**Everything marked `[RAN]` below comes from one run of
`tools/schgen/elk-labels/probe.ts`**, committed, at repository commit
**`31419be`** with a clean tree, against `elkjs` **0.9.3**, with **the bundle the
run LOADS hashed by SHA-256 and any other refused** - §2.1 says what that does
and does not establish, because the first version of that pin hashed the wrong
file. That run is committed beside the probe as
`tools/schgen/elk-labels/probe-run.log`, and
`tests/schgen/text-metrics/document-pastes.test.ts` **holds every block this
section pastes to it on every `bun test`** (§2.10).

**IT HAS BEEN DRIVEN THREE TIMES AND BOTH EARLIER ARTIFACTS ARE IN THE HISTORY,
not in anybody's scratch directory.** The run committed at `cb35fe0` carried nine
arms and the one at `b6876c7` eleven; this one carries twelve, and **every figure
for arms a-i is identical across all three**. `git show
cb35fe0:tools/schgen/elk-labels/probe-run.log` and the same for `b6876c7` are the
earlier logs and the comparison is a `diff`. Unlike §1's probe this one needs no
external download and no installed application:

```sh
bun run tools/schgen/elk-labels/probe.ts
```

re-drives every figure in this section from a clean checkout.

### 2.0 Two grades of evidence, kept apart, because Task 7 ranks them differently

The plan's Step 6 requires it and a third-party review of the plan is why:
*"an ELK option inventory is not a capability demonstration."*

| grade | what it covers here |
| --- | --- |
| **documentation** `[READ]` | ELK's own option reference at `eclipse.dev/elk` - the ids, their types, their targets and their **stated defaults** (§2.3) |
| **driven** `[RAN]` | what `elkjs` reports about itself, and what twelve arms get back when they hand ELK the graphs this repository already builds (§2.1, §2.2, §2.4-§2.7) |

**A default is driven here and not merely read**, because `docs/known-gaps.md`
**G187** measured that `elkjs` ignores an option id it does not recognise with no
raise and no warning: from the option alone, *"setting it changes nothing"* and
*"the default already does it"* are indistinguishable. §2.3's pairs each differ
in exactly one option and are compared on the laid-out geometry.

### 2.1 THE ELK LABEL INVENTORY `[RAN]`

```elk-run WHAT THIS ELK LABEL RUN MEASURED
repository commit: 31419bea8f413d7c04ff7bebd456d2b5cc79a097 (clean tree)
elkjs 0.9.3; the bundle this run LOADS, hashed: SHA-256 114c4f17aea4b297a2d3dd6c86bdfccb45e12040da964ea8f9766345fce4f538
elkjs resolved from: file:///Users/orion/work/audio-circuits-work/pultec-modularize/node_modules/elkjs/package.json
knownLayoutOptions(): 224 ids; knownLayoutAlgorithms(): 12; layered knownOptions: 140
layered supportedFeatures: SELF_LOOPS, INSIDE_SELF_LOOPS, MULTI_EDGES, EDGE_LABELS, PORTS, COMPOUND, CLUSTERS
```

```elk-run STEP 1
option ids containing "label": 15 of 224
  org.eclipse.elk.labelManager                                   OBJECT   targets=PARENTS|LABELS layered DOES NOT list it
  org.eclipse.elk.spacing.edgeLabel                              DOUBLE   targets=PARENTS      layered supports it
  org.eclipse.elk.spacing.labelLabel                             DOUBLE   targets=PARENTS      layered supports it
  org.eclipse.elk.spacing.labelNode                              DOUBLE   targets=PARENTS      layered supports it
  org.eclipse.elk.spacing.labelPortHorizontal                    DOUBLE   targets=PARENTS      layered supports it
  org.eclipse.elk.spacing.labelPortVertical                      DOUBLE   targets=PARENTS      layered supports it
  org.eclipse.elk.nodeLabels.padding                             OBJECT   targets=PARENTS      layered supports it
  org.eclipse.elk.nodeLabels.placement                           ENUMSET  targets=NODES|LABELS layered supports it
  org.eclipse.elk.edgeLabels.placement                           ENUM     targets=LABELS       layered supports it
  org.eclipse.elk.edgeLabels.inline                              BOOLEAN  targets=LABELS       layered supports it
  org.eclipse.elk.portLabels.placement                           ENUMSET  targets=NODES        layered supports it
  org.eclipse.elk.portLabels.nextToPortIfPossible                BOOLEAN  targets=NODES        layered supports it
  org.eclipse.elk.portLabels.treatAsGroup                        BOOLEAN  targets=NODES        layered supports it
  org.eclipse.elk.layered.edgeLabels.sideSelection               ENUM     targets=PARENTS      layered supports it
  org.eclipse.elk.layered.edgeLabels.centerLabelPlacementStrategy ENUM     targets=PARENTS|LABELS layered supports it
options whose id does NOT say label but whose name or description does: 7
  org.eclipse.elk.omitNodeMicroLayout                            BOOLEAN  targets=PARENTS      Omit Node Micro Layout
  org.eclipse.elk.position                                       OBJECT   targets=NODES|PORTS|LABELS Position
  org.eclipse.elk.commentBox                                     BOOLEAN  targets=NODES        Comment Box
  org.eclipse.elk.margins                                        OBJECT   targets=NODES        Margins
  org.eclipse.elk.scaleFactor                                    DOUBLE   targets=NODES        Scale Factor
  org.eclipse.elk.font.name                                      STRING   targets=LABELS       Font Name
  org.eclipse.elk.font.size                                      INT      targets=LABELS       Font Size
  org.eclipse.elk.spacing.labelLabel: Determines the amount of space to be left between two labels of the same graph element.
  org.eclipse.elk.nodeLabels.placement: Hints for where node labels are to be placed; if empty, the node label's position is not modified.
  org.eclipse.elk.nodeSize.constraints: What should be taken into account when calculating a node's size. Empty size constraints specify that a node's size is already fixed and should not be changed.
tests/schgen/elk/options.elk.test.ts says "all 224 ids" begin org.eclipse.elk; this run counts 224, all 224 of them so prefixed. They AGREE.
```

**Fifteen options carry `label` in the id** - five spacings, two for node labels,
three for port labels, four for edge labels, and one label-shortening hook -
**and seven more reach labels without saying so**, including `font.name` and
`font.size`, which apply to a LABEL. **This experiment set neither**: it gives
every label an explicit width and height, from §1's measured ruler, which is the
geometry ELK's label placement then works with. **What ELK does with the two font
options - whether it would size a label that carries no width - was not
established** (§2.9). `layered` lists fourteen of the fifteen label-named ids.
The one it does not is
`labelManager`, ELK's hook for a tool that can *shorten* a label on request -
which is the one mechanism in the inventory that is about the text itself rather
than about where the text goes.

**ONE LINE OF THAT BLOCK IS A FIGURE THIS REPOSITORY ALREADY PUBLISHES, RE-DRIVEN
RATHER THAN INHERITED.** `tests/schgen/elk/options.elk.test.ts` states in its own
comment that `knownLayoutOptions()` returns 224 ids; the probe reads that number
out of the file and compares it to what the run counts. **They agree.** It is
reported because `docs/known-gaps.md` **G237** is a page of prose claims about
drives that did not reproduce, and a figure in a comment is exactly that shape
until something re-takes it.

**AND THAT COMPARISON CAUGHT A FALSE FINDING OF THIS TASK'S OWN, which is
recorded because the next agent will meet the same trap.** While this section was
being developed, a scratch copy of the probe kept in a session scratchpad
reported **235** option ids, **11** algorithms and **153** `layered` options -
and a near-published paragraph had the test's comment wrong by eleven. The cause
is in the fourth line of the block above: `import.meta.resolve` is relative to
the file that calls it, so a script **outside** the repository does not resolve
`elkjs` through `package.json`'s pin at all. Bun auto-installed **0.12.0** into
`~/.bun/install/cache` and served that. **Controller ruling R4 - commit the probe
and pin its input - is what turned a plausible finding into a diagnosed
artefact**, because a committed probe resolves `elkjs` inside the repository and
prints the install it used.

**AND THE HASH THIS SECTION CREDITED WITH CATCHING IT COULD NOT HAVE, which a
reviewer drove, and a false guarantee is worse than none.** The pin originally
hashed `moduleRepoRoot()/node_modules/elkjs/lib/elk-worker.min.js` - a path
derived from the probe module's OWN location - while the worker was constructed
from `import.meta.resolve`, which resolves against the importer. Driven from a
scratch location: **the old pin PASSES on the committed 0.9.3 bundle while the
caller loads 0.12.0**, so it was green in precisely the scenario it was credited
for. **It now hashes the file behind the same URL it hands `workerFactory`**, and
refuses a URL that is not a local file, so the file checked is the file loaded;
the same drive makes the new pin refuse. **What was doing the real work all along
is WHERE the probe is committed** - inside the repository whose `node_modules`
holds 0.9.3 - and the hash is now a second lock rather than a stand-in for the
first. `docs/known-gaps.md` **G266** clause 3 said the hash caught the drift and
is corrected there too.

### 2.2 What this repository sets of that inventory: none of it `[RAN]`

```elk-run STEP 2
scanned 9 file(s) under lib/schgen/elk: adapt.ts graph.ts junctions.ts options.ts read-graph.ts self-loop.ts serialize.ts sheet-graph.ts snap.ts
label-related options this repository sets: 0 of 22
  CONTROL elk.spacing.nodeNode: found by the same scan = true
  CONTROL elk.spacing.nodeSelfLoop: found by the same scan = true
  CONTROL elk.portConstraints: found by the same scan = true
the whole emitted option set (15): elk.algorithm elk.direction elk.edgeRouting elk.layered.layering.layerConstraint elk.layered.spacing.edgeEdgeBetweenLayers elk.layered.spacing.edgeNodeBetweenLayers elk.layered.spacing.nodeNodeBetweenLayers elk.padding elk.port.side elk.portConstraints elk.spacing.edgeEdge elk.spacing.edgeNode elk.spacing.nodeNode elk.spacing.nodeSelfLoop elk.spacing.portPort
```

**Zero of twenty-two.** The scan is over the whole of `lib/schgen/elk/` **and**
over the option record the backend actually emits, so an option set in code
without appearing as a literal would still be caught by the second arm.

**The control is three options the backend DOES set, found by the same scan.**
Without it, *"0 of 22"* would be a statement about the scan and not about labels -
which is `docs/known-gaps.md` **G241**'s failure, recorded five times.

**There is no deletion to recommend and no omission to report here.** The
fifteen options this backend emits are the fifteen
`tests/schgen/elk/options.elk.test.ts` pins by name, and `lib/schgen/elk/options.ts`
records that a bisection over fourteen unset candidates found *"every label and
comment spacing leave it unchanged"* for the defect it was chasing. **Those two
facts are consistent and are a different claim from this one**: that bisection
asked whether a label spacing moved the sub-grid-segment count on a graph with no
labels in it, and the answer being "no" is what you would expect of an option
that has nothing to apply to.

### 2.3 What `layered` does with a label - the documented defaults, then driven

**`[READ]` `eclipse.dev/elk`'s own option reference**, retrieved 2026-10-22,
pages `reference/algorithms/org-eclipse-elk-layered`,
`reference/options/org-eclipse-elk-nodeLabels-placement`,
`reference/options/org-eclipse-elk-nodeSize-constraints` and
`documentation/tooldevelopers/graphdatastructure/coordinatesystem`:

| option | `layered`'s stated default | what the default means |
| --- | --- | --- |
| `nodeLabels.placement` | `NodeLabelPlacement.fixed()` - the **empty** set | *"if empty, the node label's position is not modified"* |
| `nodeLabels.padding` | `new ElkPadding(5)` | 5 units on every side |
| `portLabels.placement` | `PortLabelPlacement.outside()` | **non-empty**: port labels ARE placed |
| `edgeLabels.placement` | `EdgeLabelPlacement.CENTER` | **non-empty**: edge labels ARE placed |
| `nodeSize.constraints` | `EnumSet.noneOf` - **empty** | *"a node's size is already fixed and should not be changed"* |
| `spacing.labelLabel` | **0** | *"between two labels of the same graph element"* |
| `spacing.labelNode` | 5 | between a label and its own node's border |
| `spacing.edgeLabel` | 2 | |
| `spacing.labelPortHorizontal` / `Vertical` | 1 / 1 | |

Three of those rows are the whole of §2.8's answer, so they are stated plainly:

1. **A node label is NOT placed by default.** The default placement hint is the
   empty set, and the option's own description says an empty hint leaves the
   position unmodified.
2. **A node's size is fixed by default**, so by default ELK reserves no room for
   a node label either.
3. **`spacing.labelLabel` is scoped to labels of the SAME element.** There is no
   option in the inventory for *"do not let two different elements' labels
   overlap"* - which is the relation that refuses three of this repository's
   blocks (**G262**).

**AND EVERY SPACING DEFAULT IS A BARE NUMBER IN THE GEOMETRY'S OWN UNIT**, which
in this backend is the **micrometre**. So ELK's 5-unit label padding is **0.4% of
the 1.27 mm electrical grid** and its label-label spacing is **zero**. That is
exactly the defect class `docs/known-gaps.md` **G188** measured for the seven
spacings this backend now sets at whole grid steps: *"an option left unset is an
option at roughly 10 µm"*. **Any use of ELK labels here inherits that problem on
day one**, for five more options.

Driven, each option against its own absence on one real block:

```elk-run STEP 3
on pt2399-core/pt-core; label options layered lists: 14 of 15
the ones it does not list: org.eclipse.elk.labelManager
  nodeLabels.placement [H_CENTER,V_TOP,OUTSIDE]  with: 195580.0x151786.9  without: 195580.0x133354.0  geometry DIFFERS; label coordinates DIFFER
  portLabels.placement [OUTSIDE]                 with: 167644.0x172473.1  without: 167644.0x172473.1  geometry IDENTICAL; label coordinates IDENTICAL
  nodeSize.constraints [NODE_LABELS] vs [] (fixed) with: 177950.0x87548.8  without: 195580.0x133354.0  geometry DIFFERS; label coordinates DIFFER
```

**Each row confirms a documented default by measurement.** Setting the node-label
placement changes both the geometry and the coordinates, so the default was doing
nothing; setting the port-label placement to the documented default changes
**nothing at all**, so the default was already placing them; and loosening the
size constraint changes the geometry, so the default was indeed holding node
sizes fixed.

### 2.4 The graph this repository hands ELK carries no labels at all `[RAN]`

```elk-run STEP 4
48 ELK blocks over 11 boards: 398 nodes, 620 ports, 494 edges
elements carrying a non-empty labels array: 0
CONTROL, so that zero is a finding and not a broken walk: nodes carrying a non-empty layoutOptions record: 398 of 398
CONTROL, the serializer: an unlabelled graph serializes to 12345 bytes
CONTROL PASSED: serializeElkInput REFUSES a graph carrying an ELK label - node C1:1 carries ELK labels, and lib/schgen/elk/serialize.ts declares no key order for them
```

**Not one of 398 nodes, 620 ports or 494 edges carries a label, across every ELK
block of all eleven boards.** The control is that the same walk finds a
`layoutOptions` record on 398 of 398 nodes, so the zero is about labels and not
about the walker.

**So ELK has never been told that this repository draws any text**, and the
consequence is exactly the one the plan's Step 4 asked about: **every text
collision this repository refuses on is between items ELK never knew existed.**
`lib/schgen/elk/graph.ts` sizes a node as the symbol's own `boxes` entry and a
boundary net as a node of **zero size**, with its own comment saying that what *"a
rail's power symbol or a label's outline occupies is decided when it is drawn
(seam B, D9), not here"*. The text is placed afterwards, by
`lib/schgen/render/field-placement.ts` and `render/text-scene.ts`, into whatever
room the label-free layout happened to leave.

**AND THE SERIALIZER REFUSES ONE, which is stronger than the graph merely not
having any.** `lib/schgen/elk/serialize.ts`'s `refuseUndeclared` throws on any
element carrying a non-empty `labels` array, because the serialized bytes are the
generation manifest's key and a field left out of them would let two different
inputs hash the same (**G95**). That refusal is driven above, with its own
control: the same graph without the label serializes to 12345 bytes.

**WHAT THAT REFUSAL COVERS, narrowed to what the guard actually refuses.** It
fires **when a graph is serialized**, and `elkInputOf` serializes every graph it
builds, so **a labelled graph cannot be constructed through this repository's own
path without the throw** - and that path is production's, not a test's. **It is
not a guarantee that no label can ever reach ELK**: the graph is a plain
`ElkNode`, and a caller that mutated it after `elkInputOf` returned would hand
`elk.layout` a label the serializer never saw. That is exactly what the arms below
do, deliberately. An earlier draft said *"no label can reach ELK by accident"*,
which is wider than the guard. What the guard does buy is that any future use of
ELK labels **in the built graph** is a deliberate edit to that file, which is
where its message says to make it.

### 2.5 The experiment: twelve arms over the same 48 graphs `[RAN]`

A third-party review of the plan required this and the plan accepted it: an
option inventory proves nothing about whether ELK solves this problem. So each
arm decorates a `structuredClone` of the graph `elkInputOf` built - **no
production module is changed and the production graph is never touched** - and
hands it to the same `elkjs`.

Label **widths** come from `lib/schgen/render/text-boxes.ts`'s own `textWidth`,
the ruler §1 measured; the **height** is §1.4's `GetTextBox` figure of 2043.1 µm,
**RELAYED** from §1 and not re-measured here. The text is what this repository
would actually draw: a unit's Value, a boundary node's or an edge's net name, a
port's pin number.

**ARMS b-i ARE NOT MINIMAL PAIRS WITH THE BASELINE, AND ARMS j, k AND l ARE WHY
THAT MATTERS.** Each labelled arm differs from arm **a** in **two** things: the
label, and the `layoutOption` that tells ELK what to do with one. So a graph that
grew could have grown from either, and the probe did not separate them until a
reviewer of this section's first version made the point. **Each of the three
option families now has its own control, setting the options and sending no label
at all** - and the three answer differently, which is what controls are for:

- **Arm j, the control for arms d-g**, matches the baseline on **0 of 48 blocks
  moved**. So in that family - which is where §2.6's two decisive arms live - the
  growth is attributable to the label.
- **Arm k, arm b's control, DOES NOT match**: 254 nodes resized, worst
  **33020.0 µm**, 48 of 48 blocks moved, and `pt-core`'s `C1:1` collapsing to
  **0 × 0** with no label present. **So arm b's figures are the option AND the
  label together.** The plain reading - this writer's reading, not a measurement -
  is that `nodeSize.constraints = [NODE_LABELS]` means *"size the node to fit its
  labels"*, so a node with no labels wants no size.
- **Arm l, arm c's control, fails too but by a bounded amount, and the bound is
  the finding.** `[RAN]` **144 nodes resized, worst 20.0 µm, 46 of 48 blocks
  moved** - and `pt-core`'s `C1:1` comes back **unchanged at 4064 × 7620** while
  the boundary node `port:+5V` goes from 0 × 0 to **20 × 20**. So
  `MINIMUM_SIZE` with the symbol's own box as the minimum **preserves every node
  that has a box** and gives only the **zero-size** boundary nodes a 20 µm body.
  **144 is exactly the number of boundary nodes**, which also cross-checks §2.6's
  254 unit nodes: 254 + 144 = 398.
- **So arm c's 362 resizes split into two effects of very different size**: 144
  boundary nodes at 20 µm, which is the option's own, and 218 unit nodes widened
  by their labels, which is the label's. **The probe does not attribute them
  individually and §2 does not claim it does**; what the control establishes is
  that the option's contribution is bounded at 20 µm and confined to nodes with no
  geometry to lose.

**ARM l IS THE RE-REVIEWER'S CONTROL, AND IT IS AN ARM HERE FOR THE REASON ROUND 1
GAVE FOR THE OTHER TWO.** Fix round 1 added arm **k** and called it *"the control
for arms b-c"*; **k carries arm b's option set and arm c adds `MINIMUM_SIZE`**, so
arm c still had none. The re-reviewer drove the missing one and reported 144
resized, worst 20.0 µm, 46 of 48 moved. **Those are the figures this run
reproduces, to the digit** - so they are CONFIRMED here rather than relayed, and
*"a control that lives only in a review is a control nobody can re-drive"* applies
to the control that found the gap as much as to the one it replaced.

```elk-run STEP 5
line height 2043.1 um (RELAYED from section 1.4); label widths from lib/schgen/render/text-boxes.ts textWidth
arm                                           sent       back     placed   unplaced  no-coords    resized   worst-um      moved    lbl-lbl other-body   own-body       wire    on-grid
  a baseline, no labels                          0          0          0          0          0          0        0.0          0          0          0          0          0          0
  b node labels, size free                     398        398        398          0          0        398    30966.9         48          0          0        398          0          0
  c node labels, size free + minimum           398        398        398          0          0        362    17790.0         48          0          0        398          0          0
  d node labels, size FIXED, inside            398        398        398          0          0          0        0.0         48          0          0        254        178         66
  e node labels, size FIXED, outside           398        398        398          0          0          0        0.0         48          0          0          0        266         12
  f node labels, NO placement, seeded          398        398          0        398          0          0        0.0         48          0          0          0          0          0
  g node labels, NO placement, unseeded        398        398        398          0          0          0        0.0         48          0          0        254          9        136
  h port labels (pin text)                     620        620        620          0          0          0        0.0         48          0          0          0          0          0
  i edge labels (net names)                    494        494        494          0          0          0        0.0         48          5          0          0         24          4
  j e's options, NO label                        0          0          0          0          0          0        0.0          0          0          0          0          0          0
  k b's options, NO label                        0          0          0          0          0        254    33020.0         48          0          0          0          0          0
  l c's options, NO label                        0          0          0          0          0        144       20.0         46          0          0          0          0          0
"moved" counts blocks whose laid-out size differs from arm a's, of 48; "worst-um" is a MAXIMUM and every other column a SUM
  a baseline, no labels: the control: the graph exactly as lib/schgen/elk/graph.ts builds it today
  b node labels, size free: SizeConstraint NODE_LABELS alone - ELK may resize a node to fit its label
  c node labels, size free + minimum: NODE_LABELS with the symbol's own box as nodeSize.minimum - the nearest thing to a schematic
  d node labels, size FIXED, inside: this repository's real constraint - a node IS the symbol's box - with the label inside it
  e node labels, size FIXED, outside: the same, with the label above the body, which is where this emitter puts a Reference
  f node labels, NO placement, seeded: layered's own default (NodeLabelPlacement.fixed(), i.e. EMPTY), with a sentinel seeded
  g node labels, NO placement, unseeded: the same arm without the sentinel, so the space ELK reserves for a label it never places shows
  h port labels (pin text): a pin number as an ELK port label, at layered's default PortLabelPlacement.outside()
  i edge labels (net names): a NET NAME as an ELK edge label - the one label class layered declares as a supported feature
  j e's options, NO label: the control for arms d-g: fixed size plus an outside placement hint, and no label at all
  k b's options, NO label: the control for arm b: SizeConstraint NODE_LABELS and an inside hint, and no label at all
  l c's options, NO label: the control arm c lacked: NODE_LABELS plus MINIMUM_SIZE at the symbol's own box, and no label
  lib/schgen/elk/read-graph.ts       mentions "width" 0 time(s) and "height" 0 time(s)
  lib/schgen/elk/adapt.ts            mentions "width" 0 time(s) and "height" 0 time(s)
  lib/schgen/elk/graph.ts            mentions "width" 3 time(s) and "height" 3 time(s)
arms that raised: 0 - every arm laid out, so every row above is a layout and not a crash
```

One block, in detail, so those aggregates are readable. Arms **h** and **i** put
their labels on ports and on edges, so the node and boundary columns are empty
for them by construction:

```elk-run STEP 7
pt2399-core/pt-core: 26 nodes, 46 edges
  a baseline, no labels                  graph 162306.0 x 133354.0; node C1:1 4064.0x7620.0 label (none); boundary port:+5V 0.0x0.0 label (none)
  b node labels, size free               graph 177950.0 x 87548.8; node C1:1 5090.0x2053.1 label ".1uF" 5080.0x2043.1 at (5.0, 5.0); boundary port:+5V 3820.0x2053.1 label at (5.0, 5.0)
  c node labels, size free + minimum     graph 195720.0 x 133354.0; node C1:1 5090.0x7620.0 label ".1uF" 5080.0x2043.1 at (5.0, 2788.4); boundary port:+5V 3820.0x2053.1 label at (5.0, 5.0)
  d node labels, size FIXED, inside      graph 195580.0 x 133354.0; node C1:1 4064.0x7620.0 label ".1uF" 5080.0x2043.1 at (-508.0, 2788.4); boundary port:+5V 0.0x0.0 label at (-1905.0, -1021.5)
  e node labels, size FIXED, outside     graph 195580.0 x 151786.9; node C1:1 4064.0x7620.0 label ".1uF" 5080.0x2043.1 at (-508.0, -2048.1); boundary port:+5V 0.0x0.0 label at (-1905.0, -2048.1)
  f node labels, NO placement, seeded    graph 116828961.0 x 77908587.0; node C1:1 4064.0x7620.0 label ".1uF" 5080.0x2043.1 at (-7777777.0, -7777777.0); boundary port:+5V 0.0x0.0 label at (-7777777.0, -7777777.0)
  g node labels, NO placement, unseeded  graph 195580.0 x 133354.0; node C1:1 4064.0x7620.0 label ".1uF" 5080.0x2043.1 at (0.0, 0.0); boundary port:+5V 0.0x0.0 label at (0.0, 0.0)
  h port labels (pin text)               graph 167644.0 x 172473.1; node C1:1 4064.0x7620.0 label (none); boundary port:+5V 0.0x0.0 label (none)
  i edge labels (net names)              graph 445010.0 x 141411.2; node C1:1 4064.0x7620.0 label (none); boundary port:+5V 0.0x0.0 label (none)
  j e's options, NO label                graph 162306.0 x 133354.0; node C1:1 4064.0x7620.0 label (none); boundary port:+5V 0.0x0.0 label (none)
  k b's options, NO label                graph 107188.0 x 71124.0; node C1:1 0.0x0.0 label (none); boundary port:+5V 0.0x0.0 label (none)
  l c's options, NO label                graph 162326.0 x 133354.0; node C1:1 4064.0x7620.0 label (none); boundary port:+5V 20.0x20.0 label (none)
```

**The arithmetic in those coordinates is checkable from the numbers themselves,
and all four checks pass.** Arm **c** returns `C1:1` at 5090 µm wide, which is
the 5080 µm label plus twice ELK's documented 5-unit `nodeLabels.padding`; arm
**d** places the label at `x = -508 = (4064 - 5080) / 2`, which is `H_CENTER`,
and at `y = 2788.4 = (7620 - 2043.1) / 2`, which is `V_CENTER`; arm **e** places
it at `y = -2048.1 = -(2043.1 + 5)`, the padding again; and the boundary node's
label in arms **d** and **e** sits at `x = -1905 = -3810 / 2`, centred on a
**zero-size** node, where 3810 µm is `textWidth("+5V")`. **So ELK's placement
arithmetic is doing precisely what its documentation says**, in micrometres,
including the 5 µm padding that is 0.4% of a grid step.

### 2.6 The two arms that answer differently, which is what the experiment was for

**ARM e IS THE CASE THAT SHOULD SUCCEED, AND IT DOES.** The symbol's box is
declared fixed - which is not a choice, it is what a KiCad symbol is - the label
goes above the body, and every one of the 398 labels comes back placed, none
overlapping any body, and **the graph grows in both dimensions** (162306 × 133354
to 195580 × 151786.9 on `pt-core`), so **ELK reserved room for an outside label
without resizing the node.** That is a real capability and it is the strongest
positive finding in this section.

**ARM f IS THE CASE CONSTRAINED TIGHTLY ENOUGH TO FAIL, AND IT FAILS SILENTLY.**
Its only difference from **e** is that it sets no placement option - which is
`layered`'s own default. All 398 labels come back, **all 398 still carrying the
impossible sentinel coordinate they were sent with**: ELK did not place them and
said nothing. **Arm g is the same arm without the sentinel, and it is the
finding.** There, every label comes back at `(0, 0)` - the node's own top-left
corner - 254 of them overlapping their own node's body, **136 of 398 of them
landing on a whole grid step by pure accident**, and the graph still grew to
195580 × 133354, because **ELK reserved space for a label it never placed.** A
caller who sent no coordinate gets a position back, in the same shape a placed
label has, and nothing distinguishes the two. Without the sentinel arm this
section would have reported arm g's `(0, 0)` as a placement.

**IT IS THE SHAPE THIS REGISTER ALREADY RECORDS ELEVEN TIMES ON THIS BRANCH** -
a skipped step that is indistinguishable from a completed one - and the figure is
quoted as what it is: *"eleven routes to a false green"* is the plan's own count
of entries in `docs/known-gaps.md`, not a count this section re-drove, and this
is not a twelfth route because nothing in the tree reads an ELK label today.
**What is new is where the shape lives**: in a third-party library, on by
default, with the quiet behaviour as the documented default and the loud one
needing an option.

**AND THE TWO ARMS COULD NOT BOTH HAVE COME OUT THIS WAY BY CONSTRUCTION**, which
is what makes them a demonstration: if ELK placed labels unconditionally, **f**
would have come back placed; if ELK ignored labels entirely, **e** would not have
moved the layout and the baseline **a** would have matched everything.

**THE TWO FREE-SIZE ARMS SHOW WHAT THE PRICE OF RESERVED SPACE IS, and it is the
symbol.** Arm **b** lets ELK size nodes to fit their labels and **all 398 nodes
come back a different size**, the worst by **31740.0 µm at the current model's
1270 µm line, 31587.6 µm at the rendered ink's 1422.4 µm and 30966.9 µm at
`GetTextBox`'s 2043.1 µm** - 25.0, 24.9 and 24.4 grid steps respectively.
`C1:1`'s body goes from 4064 × 7620 to 5090 × **2053.1**, which is no longer the
capacitor's symbol. Arm **c** pins the symbol's own box as `nodeSize.minimum` and
still resizes **362 of 398**, worst **17790.0 µm at all three heights** - and it
gives the **zero-size boundary nodes a body**, 3820 × 2053.1, which is the thing
the graph module says is decided at draw time and not here.

**ARM b's WORST RESIZE IS THE ONE FIGURE IN §2 THAT MOVES WITH THE LINE HEIGHT
AND WAS PUBLISHED WITHOUT IT**, which §2.7 records; it is quoted with all three
values here and everywhere else it appears. Arm **c**'s does not move, and that is
stated rather than left to be inferred from its absence.

**AND BOTH ARE CONTROLLED NOW, DIFFERENTLY (§2.5).** Arm **k**, arm b's control,
resizes 254 nodes by up to 33020.0 µm with **no label at all**, collapsing `C1:1`
to 0 × 0 - so arm b's figures are the option and the label together. Arm **l**,
arm c's, resizes 144 by up to **20.0 µm** and leaves every node that has a box
untouched - so arm c's 17790.0 µm worst is the **label's**, and the option's own
contribution there is 20 µm on the boundary nodes. **A design that wanted ELK to
reserve inside-label room would meet both effects.** What survives untouched is
the conclusion arm **j** controls: in the fixed-size family the node box comes
back unchanged - **0 nodes resized in arms d through g.**

**AND THAT OPENS A HAZARD IN CODE THAT IS LIVE TODAY**, hunted because ruling R13
says to hunt what your own construction opens. `lib/schgen/elk/read-graph.ts`
recovers a symbol's placement as `node.x - placeBox(ORIGIN, u.rot, unitBoxOf(u)).minX`:
the position ELK returned, less the corner of the box `elkInputOf` **sent**.
Driven above: **`read-graph.ts` and `adapt.ts` contain the word "width" zero
times and "height" zero times**, while `graph.ts` - which sends them - uses each
three times. **Nothing compares the size ELK returns to the size it was given**,
so the day anyone sets a node-size constraint to make room for a label, every
grown node silently places its symbol at the grown box's corner while its pins
were computed from the ungrown one. It is not a defect today, because today
nothing sets the option; it is a tripwire with no wire, and it is recorded in
**G266**.

### 2.7 Whether the coordinates can be expressed in a `.kicad_sch` at all

Three answers, and they are different for the three text classes.

**A SYMBOL FIELD: yes, geometrically, and no, in this emitter's vocabulary.** A
KiCad `(property "Reference" ...)` carries its own `(at x y angle)`, so any
coordinate is expressible. But `lib/schgen/render/field-placement.ts` chooses
among **eleven discrete candidate slots** with an area-weighted cost, and an
arbitrary ELK offset is not one of them - so adopting ELK's answer would mean
replacing that search, not configuring it. And ELK's answers are off-grid: of the
398 placed labels in arm **e**, the number whose corner lands on a whole grid step
is **46 at the current model's 1270 µm line, 43 at the rendered ink's 1422.4 µm,
and 12 at `GetTextBox`'s 2043.1 µm** - so between **352 and 386 of 398** would
have to be snapped or accepted off-grid. **All three are given because this cell
is one of the six that move with the line height**, and an earlier draft quoted
the 12 alone as if it did not.

**A GLOBAL LABEL: not as an offset, which is what ELK returns.** `[READ]`
`lib/schgen/render/emit-items.ts:227-241`: a `global_label` is emitted as
`(global_label <net> (shape bidirectional) (at l.at angle) (effects justify) ...
(property "Intersheetrefs" ...))`. **Its text has no coordinate of its own.** The
label's one position is `l.at`, the anchor, and the separately positioned
`Intersheetrefs` property is the only other coordinate in the form. ELK's answer
for a boundary node's label is an **offset from that anchor** - measured above as
`(-1905, -2048.1)` for `+5V` - and **there is nowhere in the emitted form to put
it.** That is the measurement, and it is the whole of what §2 establishes about
this class.

**WHAT DOES NOT FOLLOW, AND §2 SAID IT DID UNTIL THIS CORRECTION.** This
paragraph previously went on to say that honouring the offset *"would mean moving
the anchor, which moves the wire end, which changes the circuit"*, citing
**G262**'s *"a global label's position is a netlist fact"*. **That premise is the
one the plan records as WRONG** -
[`../superpowers/plans/2026-10-22-text-handling-research.md` line 207](../superpowers/plans/2026-10-22-text-handling-research.md),
inside Task 5, marked ACCEPTED and called the third-party review's most
consequential finding:

> *"the label's NAME and its electrical CONNECTION are netlist facts; its drawing
> coordinates are not necessarily fixed by the circuit. A label can move to
> another valid point on the same net, and this generator draws the wires, so it
> can also change the geometry that leaves no room."*

So the plan names **at least three** degrees of freedom where G262 recorded one -
orientation, **relocating the anchor** along an electrically equivalent
connection, and **adjusting the wire geometry** - plus a fourth that is this
generator's own, which of a net's segments it attaches the label to. **§2 does not
take any of that away: it is Task 5's subject.** What §2 measured is narrower and
survives whole - **an offset from the anchor has no representation in this
emitter's output vocabulary** - and the right reading is that ELK's *answer* is in
the wrong currency, not that the anchor is immovable. Where to move it to is
Task 5's question. **Any citation of G262's netlist-fact framing, here or
anywhere, is a citation of the claim plan line 207 corrects.**

**A NET NAME AS AN EDGE LABEL: the one route that is not closed, with a measured
structural obstacle.** `layered` declares `EDGE_LABELS` as a supported graph
feature, places all 494 edge labels and reserves space for them - the `pt-core`
graph grows from 162306 to **445010 µm wide**, 2.7 times the baseline. But
**`edgesForNet` chains a net of degree n into n-1 two-terminal edges**
(`lib/schgen/elk/graph.ts`), so the 48 blocks have **494 edges** and a net of
three terminals is two edges. **An edge label is therefore per SEGMENT, not per
net**, and a three-terminal net would be labelled twice. And ELK does not keep
them apart: **5 pairs of different edges' labels overlap each other**, and 24 of
the 494 cross a routed wire. That is consistent with §2.3's documented default -
`spacing.labelLabel` is *"between two labels of the same graph element"*, and
there is no option for two elements' labels.

**AND ELK'S PLACED LABELS CROSS WIRES, WHICH IS THE RELATION THIS REPOSITORY
REFUSES ON.** In arm **e**, **266 label-over-wire crossings** across 398 labels,
by `lib/schgen/render/geometry.ts`'s own `segmentHitsBox` - production's
predicate, not a second definition. Arm **d** gives 178 and the edge-label arm
24. So ELK reserves room for a label when placing NODES and still routes edges
through the space the label occupies. **That was not diagnosed** and is recorded
as measured.

**None of this depends on which text box governs**, which matters because §1 is
forbidden from electing one:

```elk-run STEP 6
Section 1 is forbidden from electing one quantity, so no conclusion here may depend on which is elected.
the swept quantities ARE the columns above, by construction - sent back placed unplaced no-coords resized worst-um moved lbl-lbl other-body own-body wire on-grid
  current model 1270.0   a: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  b: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 398 worst-um 31740.0 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  c: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 362 worst-um 17790.0 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  d: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 168 on-grid 109  |  e: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 266 on-grid 46  |  f: sent 398 back 398 placed 0 unplaced 398 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  g: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 0 on-grid 187  |  h: sent 620 back 620 placed 620 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  i: sent 494 back 494 placed 494 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 24 on-grid 4  |  j: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  k: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 254 worst-um 33020.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  l: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 144 worst-um 20.0 moved 46 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0
  rendered ink 1422.4    a: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  b: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 398 worst-um 31587.6 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  c: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 362 worst-um 17790.0 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  d: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 178 on-grid 95  |  e: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 266 on-grid 43  |  f: sent 398 back 398 placed 0 unplaced 398 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  g: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 4 on-grid 146  |  h: sent 620 back 620 placed 620 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  i: sent 494 back 494 placed 494 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 5 other-body 0 own-body 0 wire 24 on-grid 4  |  j: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  k: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 254 worst-um 33020.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  l: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 144 worst-um 20.0 moved 46 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0
  GetTextBox 2043.1      a: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  b: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 398 worst-um 30966.9 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  c: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 362 worst-um 17790.0 moved 48 lbl-lbl 0 other-body 0 own-body 398 wire 0 on-grid 0  |  d: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 178 on-grid 66  |  e: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 266 on-grid 12  |  f: sent 398 back 398 placed 0 unplaced 398 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  g: sent 398 back 398 placed 398 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 254 wire 9 on-grid 136  |  h: sent 620 back 620 placed 620 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  i: sent 494 back 494 placed 494 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 48 lbl-lbl 5 other-body 0 own-body 0 wire 24 on-grid 4  |  j: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 0 worst-um 0.0 moved 0 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  k: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 254 worst-um 33020.0 moved 48 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0  |  l: sent 0 back 0 placed 0 unplaced 0 no-coords 0 resized 144 worst-um 20.0 moved 46 lbl-lbl 0 other-body 0 own-body 0 wire 0 on-grid 0
cells (arm x metric): 12 x 13 = 156; INVARIANT across the three heights: 149; VARYING: 7
  VARIES b/worst-um = 31740.0 / 31587.6 / 30966.9
  VARIES d/wire = 168 / 178 / 178
  VARIES d/on-grid = 109 / 95 / 66
  VARIES e/on-grid = 46 / 43 / 12
  VARIES g/wire = 0 / 4 / 9
  VARIES g/on-grid = 187 / 146 / 136
  VARIES i/lbl-lbl = 0 / 5 / 5
```

**THE COMPLETENESS OF THAT LIST IS COMPUTED BY THE PROBE, AND IT TOOK TWO
CORRECTIONS TO GET THE SCOPE OF THE WORD "COMPLETE" RIGHT.** Round 0 said *"all
four are named"* while listing five, omitting **arm e's on-grid count** - the very
arm the symbol-field paragraph above quotes. Round 1 computed the enumeration but
**over five of the nine columns the arm table published**, so *"nothing else
moves"* was still a claim over a subset - and one of the four unswept columns does
move: **arm b's worst resize, 31740.0 / 31587.6 / 30966.9 µm**, which round 1
published as a bare 30966.9. **That is the same defect twice in two dimensions, so
the fix is structural**: the probe's column list and its swept cells are now **one
list**, used to print the table and to sweep it, so they cannot drift apart again.

**The enumeration, driven: 12 arms × 13 quantities = 156 cells, 149 invariant
across the three heights, 7 varying**, each printed above with its three values.
The seven are arm **b**'s worst resize, arm **d**'s wire crossings and on-grid
count, arm **e**'s on-grid count, arm **g**'s wire crossings and on-grid count,
and arm **i**'s label-label overlaps. **Nothing else in those 156 cells moves** -
and that sentence is now exactly as wide as the table above it, which is the whole
point of the restructure.

**So every structural answer holds at all three heights** - 398 unplaced in arm
**f**, 254 own-body overlaps in **d** and **g**, 266 wire crossings in **e**, 0
nodes resized in **d** through **g**, 362 and 144 resized in **c** and its control
**l** - and what moves is grid legality, two wire counts, one worst-resize
magnitude, and the edge-label overlap pairs.

**ONE CONCLUSION IN THIS SECTION WOULD HAVE DEPENDED ON THE ELECTION**, and it is
arm **i**'s: *"ELK does not keep two different edges' labels apart"* rests on 5
overlapping pairs, which is what both **measured** heights give and **0** at the
height the current ruler implies. It is reported as such rather than taken at
whichever height suits it.

### 2.8 Could ELK own any part of this problem? The direct answer

**No part that would unblock a board, and the reason is not a missing feature.**

**What ELK could own, and does today for other tools:**

- **Reserving room for text while it places nodes.** Arm **e**: with the symbol's
  box held fixed, outside node labels grew the drawing in both dimensions and no
  label ran into any body. This is the capability the repository does not use.
- **Placing pin text and net-name text.** Arms **h** and **i**: 620 port labels
  and 494 edge labels, all placed, all returning coordinates, at `layered`'s own
  non-empty defaults.
- **Coarse side selection for an edge label** -
  `layered.edgeLabels.sideSelection`, `centerLabelPlacementStrategy`,
  `edgeLabels.inline` - which is the family of mechanisms
  `docs/schematic/text-placement-prior-art.md` §1 describes.

**What ELK cannot own:**

- **The global-label collisions.** RELAYED, from the plan's own state section and
  **G262**: three of the five boards that reach layout are refused on
  global-label overlaps, and `transistor-preamp-lab` - the board that gets
  furthest - is refused by one of them and nothing else in front of it. §2 did
  not re-measure those counts, and **G262's *"a global label's position is a
  netlist fact"* is the claim the plan corrects at line 207** - cited here only
  for the board counts. What §2 adds is why ELK's answer cannot be used as it
  comes: it will place a label on a boundary node, and the emitted
  `global_label`'s only coordinate is its anchor (§2.7), so **an offset has no
  representation in this emitter's output vocabulary.** That is a property of the
  emitted form, not a statement that the anchor cannot move - which is Task 5's
  question, not this section's.
- **Label-label separation across elements.** The inventory contains no such
  option, `spacing.labelLabel` is scoped to one element's labels, and the
  edge-label arm produced 5 overlapping pairs.
- **Keeping text off wires**, which is what `render/text-scene.ts` grades: 266
  crossings in the arm that otherwise succeeded.
- **Reserving room for a label INSIDE the body**, which is where the five
  `INSIDE_SLOTS` of `lib/schgen/render/text-boxes.ts` put a field. For an inside label ELK reserves
  by **growing the node** (arms **b** and **c**), and growing a node is not
  available here because a node IS the symbol's body - and the read-back would
  mis-place the symbol if it ever happened (§2.6). The reservation in arm **e**
  is for an OUTSIDE label and does not extend to this case.
- **Anything, by default.** The default node-label placement is empty and the
  default node size is fixed, so a graph handed labels and no options gets space
  reserved and nothing placed (arm **g**).

**So the hypothesis is answered in the negative, and precisely:** ELK's label
machinery is a *graph-drawing* facility - where a label is free to go anywhere
near its element and the element may be resized to suit - and the three things
this repository is refused on are **a label whose only coordinate in the emitted
form is its anchor**, a separation constraint between two elements' labels, and
text-over-wire. **The first is a property of the `.kicad_sch` global-label form,
and the other two are not in ELK's option vocabulary at all.**

**"Its only coordinate is its anchor" is NOT "its position is fixed by the
netlist"**, and §2.7 says why at length: the second is G262's framing, the plan
corrects it at line 207, and this section asserts only the first.

**One narrower claim does survive and is worth Task 7's attention**: this
repository places all of its text **after** a layout computed as if no text
existed, and ELK demonstrably can be told about text before it places nodes (arm
**e**). Whether that is worth having is a design question this section does not
answer and must not.

### 2.9 What §2 did NOT establish

- **It did not drive `labelManager`**, ELK's label-shortening hook - the one
  label option `layered` does not list. Whether abbreviating a net name is
  acceptable is an owner decision in any case.
- **It did not drive `font.name` or `font.size`.** Every label here carries an
  explicit width and height taken from §1's measured ruler, so whether ELK would
  size a label from a font declaration instead - and with what metrics - is
  unknown. It matters only to a design that wanted ELK to measure the text, which
  would be putting the ruler §1 measured behind a second one.
- **It did not build an edge-label route end to end.** §2.7 measures the obstacle
  (494 edges for 48 blocks, a net of degree n being n-1 edges) and stops; no
  emitter change was made or designed, which the plan forbids.
- **It did not establish that KiCad connects a global label placed part-way along
  a wire.** That is the question the edge-label route turns on and it was not
  driven - no `.kicad_sch` was written or loaded in this section.
- **It did not read ELK's Java source.** The behaviour is driven off the compiled
  `elkjs` bundle and its own reported metadata; the stated defaults are `[READ]`
  from `eclipse.dev/elk`. A default that the documentation states and the bundle
  implements differently would have been caught only where §2.3 drove it.
- **It did not diagnose the 266 label-over-wire crossings.** Whether ELK's
  label-aware node margins can be made to bind the edge router is unknown.
- **It did not separate the option's effect from the label's in arms b and c**
  (§2.5). Arm **k** shows that option family resizing nodes with no label present,
  so those two rows are a joint effect. Separating them needs a third arm - the
  same option with a zero-size label - and no conclusion here rests on it.
- **It says nothing about whether a global label's ANCHOR may move**, which is
  §2.7's correction and Task 5's subject. What it measured is that ELK's answer is
  an offset and the emitted form has no place for one.
- **It elects nothing**, and no figure here is an acceptance criterion.

### 2.10 How this section's evidence is checked, by a second call with §2's own log

**EVERY BLOCK §2 PASTES IS HELD TO §2's OWN COMMITTED RUN ON EVERY `bun test`**,
by a second invocation of the same checker §1 uses -
`tools/schgen/text-metrics/verify-pastes.ts`, driven from
`tests/schgen/text-metrics/document-pastes.test.ts`. **That is controller ruling
R17, and it corrects a reading of R15 rather than R15 itself.** R15 made the
checker single-log, and that stands: a log holding two runs gives every section
header a twin. **It does not say one log per repository**, which is how it was
read, and the consequence was this section's first version - eight blocks of
measured output held to nothing, in a document four later tasks read.

**WHAT THE SECOND CALL NEEDED, and it is one parameter.** §2's blocks are tagged
` ```elk-run <section> ` rather than ` ```run <section> ` because §1's
whole-document call must keep refusing them as output: §1's log has no section
called `STEP 6`, and a block claiming otherwise should fail. So the test maps the
**fence word only, at a line start**, before handing §2's own text to the checker
with §2's own log - and asserts that the mapping changed exactly eight fences,
exactly four characters each, and no block body at all. The checker itself gained
an optional **run-marker** parameter, because the line that marks the start of a
run belongs to the probe that wrote the log, and §2's probe deliberately writes a
different one. Every existing call is unchanged.

**WHAT THE SECOND CALL ESTABLISHES, and what it still cannot.** It establishes
that each block is a **contiguous, unique slice of the named section** of §2's log,
with its lines in the order and spacing the run printed them, and that **the
commit §2 pins is the commit that log was taken at on a clean tree** - so a log
refreshed without re-pinning the document, or the reverse, goes red. **It cannot
tell whether the right output sits under the right prose**, which is §1.11's own
standing caveat and is not improved here. Two RED cases keep it honest: a single
digit changed in a §2 block fails, and a genuine slice of a different section of
the same log, substituted whole, fails.

**§2 PASTES THE WHOLE RUN, and the accounting is in lines rather than bytes
because an earlier draft published a byte figure that was eight bytes low.** The
log is **123 lines**: **106** are quoted by the eight blocks, **8** are the `== `
section headers, which now live in the fence info strings rather than in the
block bodies, and **9** are blank - the eight separators between sections and the
file's trailing newline. **Nothing is excerpted**, so there is nothing an excerpt
could be hiding; §1.11 records paying the same cost in length for the same reason.

**§2's run is also fully re-drivable**, which §1's is not: §1's figures need
`kicad-cli`, KiCad's Python bindings and a 2.9 MB font blob fetched from outside
the repository, where §2's need `bun run` and nothing else, against a bundle the
probe refuses to proceed without.

**AND §2 OPENED A NEW WAY FOR §1's CHECKER TO FAIL - PREDICTED, THEN FIRED ON THE
FIRST ATTEMPT** (ruling R13: hunt the attack surface your own construction
creates). If any line of a ` ```elk-run ` block equals a line of §1's committed
log, the checker fails §1's document naming a block of §2, because a non-`run`
block sharing a line with the log is exactly the relabel dodge it was built to
close. **The first version of §2 did that**: the ELK probe's own first log section
was called `== WHAT THIS RUN MEASURED`, which is also §1's log's first section
header - and the one line `verify-pastes.ts` uses to count how many runs a log
holds. One shared line, one failure, naming §2's block at §1's rule.

**It was fixed at the probe and not at the paste.** The ELK probe's header is now
`== WHAT THIS ELK LABEL RUN MEASURED`; the block is pasted whole. **Trimming that
line out of the block would have been a tidy** - §1 paid for seven of those - and
it would have left the collision in place for the next section to meet.
`tools/schgen/elk-labels/probe.ts` carries the reason at the renamed line.

**What a later editor must know**: the two logs now share **no** line - a case
asserts it directly, as well as the two run markers being absent from each other's
log - and a §2 block shortened to something generic enough to collide will turn
§1's document red with a message about §1's rule. The fix is to re-pin the
colliding probe's section name, never to edit the paste.

**AND THE RENAME IS WHAT MADE THE SECOND CALL POSSIBLE AT ALL**, which was not
foreseen when it was made. R15 counts a log's runs by one header line; two logs
sharing that line could not be told apart by the checker in either direction. The
collision that cost one red run bought the property the second invocation needs.

---

§3 KiCad's own field autoplacer, read as an algorithm
-----------------------------------------------------

**This is the closest neighbour this problem has, and it ships inside the tool
that renders this repository's output.** `make check` runs `kicad-cli` on every
board on every run, so whatever `eeschema/autoplace_fields.cpp` does is what the
program on this machine would do to a generated sheet if a person pressed `O`
over a symbol.

**WHAT THIS SECTION IS FOR, AND WHAT IT IS NOT.**
[`text-placement-prior-art.md`](text-placement-prior-art.md) §5 already read this
file once and recorded six facts about it. **A restatement of those six facts is
not this section's deliverable**; the plan asks for the algorithm *as an
algorithm* - candidate generation, the collision tiers, `fitFieldsBetweenWires`,
the side-selection rule when every side collides, and multi-line fields - at the
version installed here rather than at a moving branch. §3.9 then checks the two
comparative claims that document's **§7** makes about this repository against the
source instead of relaying them - **both hold, including the qualifier the first
version of §3.9 dropped from one of them** - and corrects the three places §5's
reading is wrong.

**The finding that is not in §5, and the sharpest thing in this section:** the
algorithm can place fields on a side it has just graded as colliding while a clear
side is available (§3.3(ii)), **and that is a departure from the specification
written in the file's own header comment** rather than a disagreement about taste
(§3.3's opening). `docs/known-gaps.md` **G267** carries it.

**It designs nothing.** §3.13 collects the directions this reading suggests, and
every one of them is marked as an untried MECHANISM. None of them is a plan, and
none is an acceptance criterion: `CLAUDE.md` reserves those, and nothing in this
section elects between §1's three measured quantities either (**G265** clause 4).

### 3.0 What was opened, at which version, and what was never run

**The installed tool, driven - and it is the ONE thing this section ran, so it is
marked.** `[RAN]` `kicad-cli` is not on `PATH` here; the repository resolves it at
`lib/kicad/netlist.ts:39` from `KICAD_CLI`, falling back to
`lib/kicad/install.ts:94`'s macOS candidate. `KICAD_CLI` is unset in this
environment (`${KICAD_CLI+SET}` expands to nothing), so the resolved path is
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`, and `kicad-cli version`
prints **`10.0.5`** - one line, pasted in prose rather than fenced, because §1.11's
checker holds fenced `run` blocks to a committed log and this command has none.
That is the version every URL below is pinned to, and it agrees with the version §1
measured against. **Everything else in §3 is `[READ]`, `[ISSUE-READ]` or
`[THIRD-PARTY]`; nothing else was executed.**

**The files, fetched by raw URL at tag `10.0.5` and hashed.** `[READ]` below means
the file named was opened in full at this tag; the SHA-256 is of the blob that was
actually read, so a later reader can establish whether they are looking at the
same bytes.

**AND §3 DECLARES ONE MARK OF ITS OWN, because it would otherwise redefine a
shared one.** `[ISSUE-READ]` in §3.11 means **an issue's own JSON was retrieved
from the GitLab API and its description read** - which is a weaker thing than
`[READ]` as the document's header defines it, since an issue is a report rather
than a primary source and its comment thread was never opened. The first version of
§3.11 wrote `[READ]` and redefined it locally; a mark that means two things is a
mark that establishes neither, so the second meaning gets its own name.

| path, under `https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/` | lines | SHA-256 |
| --- | --- | --- |
| `eeschema/autoplace_fields.cpp` | 799 | `bfdb8fd1c88bbc607f14daf6cc2db12d22522e0b6ca3f68df7f701915a76ea8d` |
| `qa/tests/eeschema/test_autoplace_fields.cpp` | 338 | `42667c1fa712fb80c7cda3cf8823d9d3d9cbe57d77e8b9737a43ac920ff0bff0` |
| `eeschema/sch_field.cpp` | - | `6283b9858ec7095f20b64e97a2621e8a77c1c2986d96f90ec680f778d59ae364` |
| `eeschema/sch_field.h` | - | `d0be861c0efe6b18d42e18cc2996f45d474ca6be929ce6b33d1b4088723dcc3d` |
| `common/eda_text.cpp` | - | `314e261530c1fec73bdd36343a498f723d21fa1a6cec228a09c12ae61f82cf00` |
| `include/eda_text.h` | - | `076649386595aa24818b8bb489e6b973cc82f8ecb664cc119714bb71f519a891` |
| `include/font/text_attributes.h` | - | `8ab8fbd9f08f95abc820df2f583ee8dc168f7dfb31e547531f56cddb8bbd04e0` |
| `common/font/text_attributes.cpp` | - | `a7b9823b7ec017e94d43eb8c5c0d3efdcd60289f20f7d2df0f85d0500e3753fa` |
| `eeschema/tools/sch_edit_tool.cpp` | - | `7d0e2c07924a1d0cc46eecdd46457f0e230af629ab1d83de7e5e3ec18dee0e43` |
| `eeschema/tools/sch_drawing_tools.cpp` | - | `9525823772e382877cad861cb5d765cfdd7d99a86c32c70cc126355827600abc` |
| `eeschema/tools/symbol_editor_control.cpp` | - | `739da9cdb46b8af6ac4b2f5ba93f102d7bd4d8b518a19d98770d8d31a9e85214` |
| `eeschema/widgets/symbol_preview_widget.cpp` | - | `e662b7a2ac104bfa1be4559cdd498c4cff4ab85c8f45fb051db0ff98eafe62a1` |

The first two were read end to end. The other **ten** were opened at the
functions and call sites this section names and **not** read in full; where a
claim rests on one of them, the function or the line is named so the claim can be
checked. **The last three were added in fix round 1**, to establish which
`AUTOPLACE_ALGO` each caller passes - which is what retires the #14127 pairing
(§3.3) and the `LIB_SYMBOL` refusal claim (§3.1).

**THE PRIOR-ART DOCUMENT READ A DIFFERENT VERSION, AND THE DIFFERENCE IS
IMMATERIAL - WHICH IS WORTH RECORDING BECAUSE IT COULD HAVE GONE THE OTHER WAY.**
§5 read `master` on 2026-10-21 and reported **794 lines**; this reading is 799 at
tag `10.0.5`. `diff -u` between the two blobs is **15 changed lines in total**,
and all of them are outside the algorithm: a licence-boilerplate reflow, one
Doxygen comment, `IsInNetlist()` renamed to `DoNetList()` in the power-symbol
test, and `m_symbol->GetPins()` replaced twice by
`m_symbol->GetGraphicalPins( ALL_UNITS, ALL_BODY_STYLES )`.

**The claim that goes with that, stated to match the disclosure rather than to
sound stronger than it.** `chooseSideForFields`, `chooseSideFiltered`,
`getCollidingSides`, `getPreferredSides`, `computeFBoxSize`, `fieldBoxPlacement`
and `fitFieldsBetweenWires` are **byte-identical** between the two blobs.
**`pinsOnSide` is not** - it is one of the two changed lines - and `pinsOnSide`
feeds the side-selection rule, so the rule's *code* is unchanged while one of its
*inputs* is. `master` counts pins across *all units and body styles* where
`10.0.5` counts the symbol's own, which would change the pin counts §3.3 turns on
for a multi-unit symbol. **Nothing in this section depends on it** - every trace in
§3.3 states its pin counts as givens rather than deriving them - but "the
side-selection rule is byte-identical" would have been an overstatement and the
first version of this paragraph made it.

**WHAT WAS NEVER RUN, stated so it cannot be mistaken for behaviour.** No part of
KiCad was built, no schematic was loaded into eeschema, and the autoplacer was
never executed. **Every statement about what the algorithm does is read off the
source**; the traces in §3.3 are hand traces of that source, checked against a
transcription of its two selection functions into a throwaway script that is not
committed, and they are presented step by step so a reader can repeat them with
the file open rather than taking them on trust. **This section pastes no probe
output and therefore adds nothing to §1.11's checker contract.**

### 3.1 The algorithm, as an algorithm

The entry points are `SCH_SYMBOL::AutoplaceFields` and
`LIB_SYMBOL::AutoplaceFields`, both of which construct one `AUTOPLACER` and call
`DoAutoplace( aAlgo )`. `aAlgo` is `AUTOPLACE_AUTO` or `AUTOPLACE_MANUAL`.

**`LIB_SYMBOL` DOES NOT REFUSE `AUTOPLACE_MANUAL`, and the first version of this
sentence said it did.** The code is `if( aAlgo == AUTOPLACE_MANUAL ) wxFAIL_MSG(
wxS( "Manual autoplacement not supported for LIB_SYMBOLs" ) );` **with no
`return`** (`autoplace_fields.cpp:787-788`) `[READ]`, so the assertion fires in a
debug build and a release build **falls straight through and runs the manual
algorithm anyway**. The corrected statement agrees with §3.3(i): **there is no
refusal path anywhere in this file**, and that now has no exception rather than
one.

**The fall-through is latent rather than live, as far as was checked.** The three
`LIB_SYMBOL` call sites found pass `AUTOPLACE_AUTO` with a `nullptr` screen -
`symbol_editor_control.cpp:946`, `symbol_preview_widget.cpp:232` and `:287`, all
`[READ]` at this tag - so nothing observed reaches the `wxFAIL_MSG` branch, and a
`nullptr` screen leaves `m_colliders` empty in any case. **The enumeration is
`[THIRD-PARTY]`**: the call sites were found by a code search over the
`KiCad/kicad-source-mirror` mirror at `master` and then opened at `10.0.5`, so a
fourth caller elsewhere would not have been found.

```text
CONSTRUCT( symbol, screen ):
  m_fields      <- symbol.GetFields( visibleOnly = true )
  m_allow_rejustify <- cfg.m_AutoplaceFields.allow_rejustify   (false if no cfg)
  m_align_to_grid   <- cfg.m_AutoplaceFields.align_to_grid     (true  if no cfg)
  m_field_angle <- symbol.GetTransform().y1 ? VERTICAL : HORIZONTAL
  m_symbol_bbox <- symbol.GetBodyBoundingBox()          -- body only, no pins
  m_fbox_size   <- computeFBoxSize( dynamic = true )
  m_is_power_symbol <- not symbol.IsInNetlist()         -- SCH_SYMBOL only
  if screen: m_colliders <- getPossibleCollisions()

DoAutoplace( algo ):
  (side, pins) <- chooseSideForFields( avoidCollisions = (algo == MANUAL) )
  fbox         <- BOX2I( fieldBoxPlacement( side, pins ), m_fbox_size )
  forceWireSpacing <- (algo == MANUAL) and fitFieldsBetweenWires( &fbox, side )
  y            <- fbox.GetTop()
  for field in m_fields:
    if not field.IsVisible() or not field.CanAutoplace(): continue
    field.SetTextAngle( m_field_angle )
    if m_allow_rejustify:
      justifyField( field, pins > 0 ? (side is TOP or BOTTOM ? RIGHT : TOP)
                                    : side )
    pos.x <- fieldHPlacement( field, fbox )        -- box edge or centre
    pos.y <- fieldVPlacement( field, fbox, &y, dynamic = not forceWireSpacing )
    if m_align_to_grid:
      if side.x != 0: pos.x <- round( pos.x, 50 mil, up = side.x >= 0 )
      if side.y != 0: pos.y <- round( pos.y, 50 mil, up = side.y >= 0 )
    field.SetPosition( pos )
```

**The whole search space is four sides and one optional vertical snap.** There is
no inner loop, no backtracking, no scoring of positions and no second pass. Once
`chooseSideForFields` has returned a side, `fieldBoxPlacement` computes exactly
one box position from the symbol's own geometry, and the only thing that may then
move it is `fitFieldsBetweenWires`, which only ever changes its `y` and only on
the top or bottom side.

**The constants, with the source's own words for three of them.**

| constant | value | the source's comment |
| --- | --- | --- |
| `HPADDING` | 25 mil = 635 µm | *"arbitrarily chosen for aesthetics"* |
| `VPADDING` | 15 mil = 381 µm | *"arbitrarily chosen for aesthetics"* |
| `FIELD_PADDING` | 15 mil = 381 µm | *"arbitrarily chosen for aesthetics"* |
| `WIRE_V_SPACING` | 100 mil = 2540 µm | - |
| grid snap | 50 mil = 1270 µm | - |

**The four sides are unit vectors, not an enum**: `SIDE_TOP(0,-1)`,
`SIDE_BOTTOM(0,1)`, `SIDE_LEFT(-1,0)`, `SIDE_RIGHT(1,0)`. That representation is
load-bearing in three places - `!side.x` selects the two horizontal sides,
`side.x * offs_x` signs the offset, and `side.x >= 0` picks the grid rounding
direction - and it is the reason one of the prior-art document's sentences is
wrong (§3.9).

**Which mode fires where.** `SCH_EDIT_TOOL::AutoplaceFields`, the `O` the user
presses, passes `AUTOPLACE_MANUAL` (`sch_edit_tool.cpp:2488`) `[READ]`. The paths
that fire without being asked - placing a symbol, the symbol preview widget,
remote import, the IPC API - pass `AUTOPLACE_AUTO`. **The re-placement that fires
on an edit or a rotation passes the mode the symbol was LAST autoplaced with**
(`symbol->AutoplaceFields( screen, fieldsAutoplaced )`, three sites in
`sch_edit_tool.cpp`), so a symbol a person has already autoplaced by hand keeps
collision avoidance when it is later moved, and one that was only ever
auto-placed does not. The prior-art document's §5(f) says collisions are not
considered in `AUTOPLACE_AUTO`, which is true; **it does not say that the mode is
sticky per symbol**, and that is what decides which behaviour a user actually
sees.

### 3.2 The candidate set: four sides, and ONE box for all the fields

`computeFBoxSize` is the whole of the sizing:

```cpp
for( SCH_FIELD* field : m_fields )            // visible, CanAutoplace only
{
    field->SetTextAngle( m_field_angle );     // saved and restored around this
    BOX2I bbox = field->GetBoundingBox();
    max_field_width = std::max( max_field_width, bbox.GetWidth() );
    if( !aDynamic )            total_height += WIRE_V_SPACING;
    else if( m_align_to_grid ) total_height += round_n( bbox.GetHeight(), 50 mil, true );
    else                       total_height += bbox.GetHeight() + FIELD_PADDING;
}
return VECTOR2I( max_field_width, total_height );
```

**Every visible, autoplaceable field goes in one rigid stack**: the box is as wide
as the widest field and as tall as the sum of the per-field heights, and the
fields are then laid down it in `m_fields` order by `fieldVPlacement`. **A
candidate is therefore a side of the symbol, not a position for a field**, and no
field can be placed anywhere except in that stack.

**There is no inside-the-body candidate at all.** `fieldBoxPlacement` offsets the
box by `( symbol_width + fbox_width ) / 2` plus a padding, which puts it clear of
the body by construction; nothing in the file can place a field over the symbol it
belongs to.

**The three height modes, and a coincidence that matters.** With
`m_align_to_grid` on - the default in the constructor - the dynamic height per
field is `round_n( field_height, 50 mil, true )`. §1 measures a one-line field's
`EDA_TEXT::GetTextBox` height at **2043.1 µm** `[RELAYED from §1.4]`, which rounds
up to **2540 µm** - exactly `WIRE_V_SPACING`. **So for single-line fields at the
default text size with grid alignment on, the "dynamic" and "fixed wire spacing"
modes produce the same box**, and the recompute inside
`fitFieldsBetweenWires` changes nothing. The two modes diverge only when a field's
box height leaves the interval (1270 µm, 2540 µm] - a larger text size, or the
multi-line case §3.7 describes.

**What it collects as obstacles**, from `getPossibleCollisions`, called once in
the constructor and only when a `SCH_SCREEN` was supplied:

- the union of each of the four candidate field boxes with the symbol's
  body-and-pins box, queried against the screen's spatial index
  (`m_screen->Items().Overlapping( box )`);
- **every** `SCH_ITEM` that query returns, with no type filter - so wires, buses,
  junctions, labels, text, images and other symbols all enter;
- other symbols enter **twice**: expanded into each of their visible `SCH_FIELD`s,
  and again as the symbol itself;
- the symbol being placed is skipped by a `continue` that skips the push of the
  item as well, and its own fields are children rather than screen items, so
  **nothing belonging to the symbol itself is ever an obstacle.**

`filterCollisions` then intersects that list against one rectangle, taking
`GetBodyAndPinsBoundingBox()` for a symbol and `GetBoundingBox()` for everything
else. **Every obstacle is a bounding box**, including a wire: a diagonal
`SCH_LINE`'s box is the whole rectangle it spans.

**And the page is an obstacle.** `getDrawableArea` builds the page rectangle
inset by the drawing sheet's four margins, and `getCollidingSides` registers
`COLLIDE_OBJECTS` for any side whose field box is not **contained** in it. That is
the one obstacle in this algorithm that is not an item on the sheet, and §3.11
shows it is there because a user asked for it.

### 3.3 Side selection, the rule that overrides the collision tiers, and the file's own specification of what it was supposed to do

**THE SPECIFICATION FIRST, BECAUSE THE FINDING IN THIS SUBSECTION IS A DEPARTURE
FROM IT RATHER THAN A JUDGEMENT ABOUT IT.** `autoplace_fields.cpp` opens with a
numbered description of its own process, and lines **38-44** `[READ]` say what
step 2 does:

```cpp
*      2. If in manual mode, sift out the sides that would
*          cause fields to overlap other items             ::getCollidingSides
*      3. If any remaining sides have zero pins there,
*          choose the highest zero-pin side according to
*          preference order.
*      4. If all sides have pins, choose the side with the
*          fewest pins.
```

(**One declared edit to that transcription**: each line's single leading space -
the C comment's own left margin - is removed, so the block opens on a non-blank
character. `tests/schgen/text-metrics/document-pastes.test.ts` requires every
unchecked block to be reportable by name and a block whose first line begins with
whitespace fails that, which is how this dedent came to be made deliberately and
written down rather than silently.)

**A side that is "sifted out" is gone, and steps 3 and 4 range over the
"remaining" sides.** By that specification a colliding side can never be chosen
while a non-colliding one exists, and the all-four-collide case is not described
at all. **The code does something else** (clause (ii) below), which makes the
behaviour **a departure from the file's stated algorithm rather than an opinion
about the file's taste** - and it is the strongest available evidence that the
seeding is unintended rather than a deliberate trade, since the deliberate trade
would have been written down here. **It is twelve lines from the top of the file,
and the first version of §3 did not cite it.**

What this does not change: **nothing here was executed** (§3.0). The departure is
established by reading the comment and the code, not by observing a placement.

`getPreferredSides` returns the four sides in a fixed order with their pin counts,
then reorders:

- base order **RIGHT, TOP, LEFT, BOTTOM**, each carrying `pinsOnSide( side )`;
- the code's own assessment: *"The preferred-sides heuristics are a bit magical.
  These were determined mostly by trial and error."*;
- a horizontally mirrored symbol (mirror X at 0° or 180°) swaps LEFT and RIGHT;
- **`if( w/h > 3.0 )`** - *"[i]f the symbol is very long"* - swaps the horizontal
  and vertical pair, so a wide flat symbol prefers TOP and BOTTOM;
- a power symbol takes its own per-orientation order instead, *"[f]or power
  symbols, we generally want the label at the top first"*: TOP first at 0°, LEFT
  first at 90°, BOTTOM first at 180°, RIGHT first at 270°.

**AND ONE OF THOSE FOUR ORDERS IS NOT WHAT ITS OWN COMMENT CLAIMS.** Each power
case annotates the order its swaps produce, and the `SYM_ORIENT_0` annotation is
wrong in its last two entries `[READ]`. From `sides_init` = RIGHT, TOP, LEFT,
BOTTOM, the case does `swap( sides[0], sides[1] )` - TOP, RIGHT, LEFT, BOTTOM -
then `swap( sides[1], sides[3] )` - **TOP, BOTTOM, LEFT, RIGHT** - and the comment
beneath it reads `// TOP, BOTTOM, RIGHT, LEFT`. The other three are correct:
`SYM_ORIENT_90` produces LEFT, RIGHT, TOP, BOTTOM; `180` produces BOTTOM, TOP,
LEFT, RIGHT; `270` produces RIGHT, LEFT, TOP, BOTTOM, each as annotated.
**Recorded undiagnosed**: whether the comment is stale or the swaps are wrong is
not established here, and it affects only an unrotated power symbol's third and
fourth choices - which clause (i) below can reach, since a power symbol's pins are
counted even when hidden (`pinsOnSide`'s `!IsVisible() && !m_is_power_symbol`
guard). **G267** carries it.

`getCollidingSides` grades each side into one of three states:

```cpp
enum COLLISION { COLLIDE_NONE, COLLIDE_OBJECTS, COLLIDE_H_WIRES };
```

A side is `COLLIDE_H_WIRES` when **every** collider on it is a horizontal
`SCH_LINE` *and* the side is TOP or BOTTOM (`line && !side.x`); anything else, and
the page-margin failure, is `COLLIDE_OBJECTS`, which is sticky once set. **The
soft tier therefore exists only for the two horizontal sides** - on LEFT and
RIGHT, `!side.x` is false and a wire is graded as hard as a symbol.

`chooseSideForFields` is where it is decided, and **it is not the lexicographic
"hard collisions, then soft collisions, then pin count" the structure suggests:**

```cpp
std::vector<SIDE_AND_NPINS> sides = getPreferredSides();
std::reverse( sides.begin(), sides.end() );              // worst-preferred first
SIDE_AND_NPINS side = { VECTOR2I( 1, 0 ), UINT_MAX };    // RIGHT, "infinite" pins

if( aAvoidCollisions )                                   // MANUAL only
{
    std::vector<SIDE_AND_COLL> colliding_sides = getCollidingSides();
    side = chooseSideFiltered( sides, colliding_sides, COLLIDE_OBJECTS, side );
    side = chooseSideFiltered( sides, colliding_sides, COLLIDE_H_WIRES, side );
}

for( SIDE_AND_NPINS& each_side : sides | boost::adaptors::reversed )
    if( !each_side.pins ) return each_side;               // (1) zero-pin loop

for( SIDE_AND_NPINS& each_side : sides )                  // (2) fewest-pins loop
    if( each_side.pins <= side.pins ) { side.pins = each_side.pins;
                                        side.side = each_side.side; }
return side;
```

`chooseSideFiltered` **erases** every side matching the collision class it is
given, and before erasing each one records it into its running selection when
`it->pins <= sel.pins`. Three consequences, and the third is the one the earlier
reading missed.

**(i) When all four sides collide, a colliding side is returned and the fields
overlap.** The candidate list is emptied, loops (1) and (2) iterate over nothing,
and the seeded `side` is returned. Among the colliding sides the one with the
fewest pins wins, and `<=` makes the last in iteration order win a tie - which,
because `sides` was reversed, is the **most preferred** of the tied sides. **There
is no refusal path anywhere in this file.**

**(ii) `sel` is seeded from the colliding sides and carried into loop (2), so a
COLLIDING side competes with the surviving clear sides on pin count alone.** Loop
(2) can only replace `sel` with a side whose pins are `<= sel.pins`. So once any
colliding side holds the global minimum pin count *strictly*, no clear side can
displace it, and **the algorithm places the fields on a side it has just
established collides, while a clear side was available.** Loop (1) is what
normally saves this: it returns a clear zero-pin side before loop (2) runs. It
cannot save the case where every surviving side has at least one pin.

**(iii) The soft tier works by the same mechanism, which is why it is a
preference rather than a tie-break.** A wire-only side is erased by the second
filter and recorded in `sel`; if it has fewer pins than every clear side, it is
returned in preference to them. That is the intended behaviour - *"a side that
only conflicts with horizontal wires is preferred over a side that conflicts with
anything else"* - but the comparison it actually makes is against **clear** sides
too, not only against hard-colliding ones.

**Six traced cases.** Non-power, unmirrored, `w/h <= 3`, so the preference order
is RIGHT, TOP, LEFT, BOTTOM. "Pins" is `pinsOnSide` per side.

| pins R / T / L / B | collisions | mode | chosen | by | |
| --- | --- | --- | --- | --- | --- |
| 1 / 0 / 1 / 0 | TOP: objects | MANUAL | BOTTOM | loop (1) | clear |
| 1 / 0 / 1 / 0 | all four: objects | MANUAL | TOP | seed | **colliding, no clear side existed** |
| 1 / 0 / 1 / 0 | TOP: objects, BOTTOM: h-wires | MANUAL | BOTTOM | loop (2) | **wire-colliding, over clear LEFT/RIGHT** |
| 4 / 1 / 4 / 2 | TOP: objects | MANUAL | TOP | loop (2) | **colliding, clear BOTTOM available** |
| 4 / 1 / 4 / 1 | TOP: objects | MANUAL | BOTTOM | loop (2) | clear - the tie saves it |
| 4 / 1 / 4 / 2 | TOP: objects | AUTO | TOP | loop (2) | collisions never consulted |

Rows 3 and 4 are the finding. Row 5 shows how narrow the escape is: the same
geometry with `BOTTOM` at 1 pin instead of 2 picks the clear side, because `<=`
lets a tie through.

**Row 4 is a candidate explanation for issue #16538** (§3.11), which reports
*"'Autoplace Fields' ... overlaps the symbol texts"* and expects the fields *"to
be moved to the bottom right"* - fields placed over something with a clear side
visibly available, invoked by the `O` that passes `AUTOPLACE_MANUAL`. **It is a
candidate only**: the issue's attachment was not opened and no reproduction was
run, so `docs/known-gaps.md` **G267** records the source reading and not a
diagnosis.

**AND IT IS NOT AN EXPLANATION FOR ISSUE #14127, WHICH THE FIRST VERSION OF THIS
PARAGRAPH OFFERED ALONGSIDE IT. ROW 6 OF THE TABLE ABOVE REFUTES THAT PAIRING, SO
THE DOCUMENT CONTAINED ITS OWN REFUTATION.** #14127's reproduction is *"Adding a
symbol to the schematic"* and its complaints are *"doesn't add the 50mil space
anymore"* and *"aren't aligned to the 50mil grid"* `[ISSUE-READ]` - a grid report,
not an overlap-with-a-clear-side report. Decisively, **placing a symbol passes
`AUTOPLACE_AUTO`**: `sch_drawing_tools.cpp:487` and `:499` `[READ]` at this tag,
the first of them with a `nullptr` screen under the comment *"Not placed yet, so
pass a nullptr screen reference"*. So on #14127's own path `aAvoidCollisions` is
false, `getCollidingSides` never runs, and at `:487` there are no colliders at all
- **two independent reasons the defect cannot fire there.** It is stated here
rather than four subsections away because a hedge in one place and a refutation in
another is how a correct report gets discredited in one line by someone who reads
only the pairing.

### 3.4 `fieldBoxPlacement`: one position per side, and a different rule when the side has pins

```cpp
fbox_center = m_symbol_bbox.Centre();
offs_x = ( m_symbol_bbox.GetWidth()  + m_fbox_size.x ) / 2;   // + HPADDING if side.x
offs_y = ( m_symbol_bbox.GetHeight() + m_fbox_size.y ) / 2;   // + VPADDING if side.y
fbox_center += side * offs;                                   // componentwise
x = fbox_center.x - m_fbox_size.x / 2;
y = fbox_center.y - m_fbox_size.y / 2;
```

That is the pin-free case: the stack is centred on the symbol's body box along the
chosen side's axis, one padding clear of it. **When the chosen side has pins, one
coordinate is replaced outright** with a position relative to the bounding box of
that side's pins:

- TOP or BOTTOM: `x = pinsBox.GetRight() + HPADDING * 2` - the stack moves to the
  **right** of the pins and stops being centred;
- LEFT or RIGHT: `y = pinsBox.GetTop() - ( m_fbox_size.y + VPADDING * 2 )` - the
  stack moves **above** the pins.

**There is exactly one variant per axis, and no mirror of it.** Nothing places the
stack to the left of the leftmost pin, or below the bottommost. This is the
ancestor of this repository's `besidePinFields`, which offers two per side
(§3.9).

The pinned case also drives justification: `DoAutoplace` calls
`justifyField( field, SIDE_RIGHT )` for a pinned TOP/BOTTOM side, which sets
horizontal justification LEFT via `ToHAlignment( -aFieldSide.x )`, and
`justifyField( field, SIDE_TOP )` for a pinned LEFT/RIGHT side, which sets it
CENTER because `SIDE_TOP.x` is zero. All of that is conditional on
`m_allow_rejustify`, a user setting that is **false** when no `EESCHEMA_SETTINGS`
is available.

### 3.5 `fitFieldsBetweenWires`: the only local repair in the algorithm, and a variable it computes and never uses

```cpp
if( aSide != SIDE_TOP && aSide != SIDE_BOTTOM )      return false;
colliders = filterCollisions( *aBox );
if( colliders.empty() )                              return false;

int offset = 0;
for( SCH_ITEM* item : colliders )
{
    line = dynamic_cast<SCH_LINE*>( item );
    if( !line )                                      return false;
    if( line->GetStartPoint().y != line->GetEndPoint().y ) return false;
    this_offset = (3 * WIRE_V_SPACING / 2) - ( start.y % WIRE_V_SPACING );
    if( offset == 0 )            offset = this_offset;
    else if( offset != this_offset )                 return false;
}
// "At this point we are recomputing the field box size. Do not
//  return false after this point."
m_fbox_size = computeFBoxSize( /* aDynamic */ false );
pos = aBox->GetPosition();
pos.y = round_n( pos.y, WIRE_V_SPACING, aSide == SIDE_BOTTOM );
aBox->SetOrigin( pos );
return true;
```

**It is the one step in the whole file that moves text to make it fit rather than
choosing between prepared positions**, and it is extremely narrow: top or bottom
side only, every collider must be a horizontal `SCH_LINE`, and they must all sit
at the same offset modulo the 100-mil wire pitch. Anything else and it declines,
leaving the overlapping placement in place.

**`offset` is computed, compared, and then never read.** After the loop the
function does not use it: the box's `y` is rounded to `WIRE_V_SPACING` with no
reference to it. So the three `this_offset` lines are a **consistency test** on
the colliders - "are all these wires on the same phase of the wire pitch" - and
nothing more. `[READ]` and confirmed by reading the remaining lines of the
function; whether that is the intent or a bug is **not** established here, and
`docs/known-gaps.md` **G267** records it undiagnosed.

**A second thing it leaves stale, which turns out to be harmless.** It recomputes
`m_fbox_size` but calls `aBox->SetOrigin( pos )`, which moves the box and keeps
its old size, so `field_box` back in `DoAutoplace` carries the dynamic height
while the fields are laid out with fixed wire spacing. Only `field_box.GetTop()`
and its horizontal edges are read afterwards, and the non-dynamic recompute
cannot change `max_field_width`, so nothing downstream sees the stale height.
**Recorded because the next reader of this function should not have to re-derive
that it is safe.**

### 3.6 Per-field placement, and the grid

`fieldHPlacement` returns one of the box's left edge, centre or right edge
according to the field's horizontal justification, flipped when
`IsHorizJustifyFlipped()`. The justification does the rest of the work: the
returned coordinate is the text's anchor, not its left edge.

`fieldVPlacement` is an accumulator down the stack:

| mode | `field_height` | `padding` |
| --- | --- | --- |
| `!aDynamic` (wire fitting fired) | `WIRE_V_SPACING / 2` | `WIRE_V_SPACING / 2` |
| `m_align_to_grid` | `GetBoundingBox().GetHeight()` | `round_n( h, 50 mil, true ) - h` |
| otherwise | `GetBoundingBox().GetHeight()` | `FIELD_PADDING` |

and each field lands at `accumulator + padding/2 + field_height/2`.

**Grid rounding is applied per axis, only on the axis the side points along, and
its direction is the side's sign**: `round_n( pos.x, 50 mil, field_side.x >= 0 )`
rounds a RIGHT-side field's `x` up and a LEFT-side field's `x` down - away from
the symbol in both cases. **The rounding happens AFTER the collision check**,
which was made against the unrounded box, so the snap can move a field up to
50 mil into something the check cleared. Nothing re-checks it.

### 3.7 Multi-line fields: no special handling, and a measurement that disagrees with the drawing

**`autoplace_fields.cpp` contains nothing specific to multi-line text.** Every
height it uses comes from `SCH_FIELD::GetBoundingBox()`, and the stack is built by
summing those heights. So the question reduces to what that function returns, and
the answer is in `sch_field.cpp` and `eda_text.cpp` `[READ]`:

- `SCH_FIELD::GetBoundingBox()` is `GetTextBox( nullptr )` rotated by the field
  angle and then by the symbol transform (`sch_field.cpp:468`);
- `EDA_TEXT::GetTextBox( aSettings, aLine = -1 )` splits the string on `\n` **when
  `IsMultilineAllowed()`**, and at `aLine < 0` with more than one line it merges
  the per-line rectangles, stepping by `font->GetInterline(...)`
  (`eda_text.cpp:742` onward);
- `IsMultilineAllowed()` is `m_attributes.m_Multiline`, whose
  `TEXT_ATTRIBUTES` default is **`true`** (`common/font/text_attributes.cpp:37`).
  `SCH_TEXT`, `SCH_TEXTBOX`, `PCB_TEXT` and `PCB_TEXTBOX` set it true explicitly
  and `SCH_LABEL_BASE` sets it false; **`SCH_FIELD` never calls
  `SetMultilineAllowed` at all**, so it keeps the default `true`
  (`[THIRD-PARTY]`: the enumeration of setter call sites is a GitHub code search
  over the `KiCad/kicad-source-mirror` mirror at `master`, not a read of every
  file at `10.0.5`).

**So the autoplacer would reserve a tall multi-line stack for a field containing a
newline - while `SCH_FIELD::Plot` forces `attrs.m_Multiline = false` immediately
before plotting (`sch_field.cpp:1380`), drawing that same text as one long
line.** Measurement and drawing would disagree, in the direction of reserving
height that is not used and under-reserving width. **This is reported as an
observation and not as a defect**: it was not driven, nothing here establishes
that a `.kicad_sch` field can carry a newline in the first place, and the
on-screen painter was not read. **It does not reach this repository either way** -
§1.2's glyph set over all 1086 strings the eleven boards emit is 64 printable
ASCII characters with no newline among them `[RELAYED from §1.2]`, so every field
this repository writes is single-line.

### 3.8 What the algorithm depends on real text extents for

**Exactly two quantities, and both come from the same function.**

| used for | call | consequence of getting it wrong |
| --- | --- | --- |
| the stack's width | `bbox.GetWidth()` in `computeFBoxSize` | the box's horizontal extent, hence which sides collide and where the box sits |
| each field's height, and the stack's | `bbox.GetHeight()` in `computeFBoxSize` and `fieldVPlacement` | the box's vertical extent and the spacing down the stack |

Both are `SCH_FIELD::GetBoundingBox()`, which is `EDA_TEXT::GetTextBox( nullptr )`
transformed. **KiCad's autoplacer therefore places with KiCad's own text box -
§1's third quantity, Q3 - and with nothing else.** It never consults glyph
advances directly and never consults rendered ink.

Two things follow, both relayed from §1 rather than re-measured here:

- **The box it places with is the one §1 measured at 2043.1 µm tall for a 1270 µm
  text line**, against 1422.4 µm of actual ink and 1270 µm in this repository's
  model `[RELAYED from §1.5 and §1.7]`. The 44% height disagreement §1.8 reports
  between ink and box is a disagreement about the quantity this algorithm uses.
- **`GetTextBox` sizes with `GetEffectiveTextPenWidth()`**, which §1 measured as
  158.75 µm where the plotter draws at 152.4 µm `[RELAYED from §1.4]`. The call
  at `sch_field.cpp:470` passes `nullptr` for the render settings, so the
  autoplacer inherits that, and the `fudgeFactor` of `0.17 * extents.y` added for
  stroke fonts at `eda_text.cpp:784` is in the height it uses too.

**Nothing here elects a quantity.** That `autoplace_fields.cpp` uses Q3 is a fact
about KiCad, not an argument that this repository should; the election is
**G265** clause 4 and it is the owner's.

### 3.9 Step 3: the prior-art document's two comparative claims, checked against the source

The claim under test, **quoted in full, because the first version of this
subsection dropped a word from it**: this repository's *"candidate set is
**larger** than KiCad's four and larger than the standard four- and
eight-position models"*, and *"[i]t also models **far** more obstacle categories
than KiCad does"* (`text-placement-prior-art.md` §7). **The dropped word was
"far", which made the claim easier to confirm than the claim as written** - the
one direction of trimming that matters, whatever the intent. **Both claims hold,
including the "far"; both are quantified below; and three things cut the other
way.**

**Claim 1, the candidate set: TRUE - and the prior-art document already had two
of these three numbers, which the first version of this subsection did not
credit.** Its §7 - the same section the claim under test comes from - states
*"2 free sides + 5 inside + 2 pinned sides x 2 = **11**"* for a vertical two-pin
passive and *"**13** (0 + 5 + 8)"* for a symbol with pins on all four sides.
**What is actually new here is the 9 and the formula**:
`allCandidates` (`lib/schgen/render/field-placement.ts:153`) builds one outside
slot per **pin-free** side, five inside slots (`centre` and the four quarters),
and **two** beside-pin slots per **pinned** side (`besidePinFields`), so each side
contributes 1 if free and 2 if pinned and the count is `5 + Σ sides` - **a range
of 9 to 13 with 9 the floor**, reached when all four sides are pin-free, which
neither number in §6 covers. Against KiCad's four.

The inside-containment filter then drops candidates rather than adding them:
**G239** measures all five inside slots removed for any body shorter than
`4 × GRID`, which is every small passive, leaving six.

And a candidate here is **a pair of positions for two named fields**, where
KiCad's is a side for one rigid stack of all of them.

**Claim 2, the obstacle model: TRUE INCLUDING THE "FAR", on a count and on five
axes that are each checkable.**

**The count first, since "far more categories" is a claim about categories.**
`OBSTACLE_CATEGORIES` (`lib/schgen/render/obstacle-matrix.ts`) names **14**, of
which `placeFields` puts **11** in front of a candidate - every one but
`junction`, `frame-border` and `dnp-cross`. **KiCad's algorithm distinguishes
two**: a horizontal `SCH_LINE` on a horizontal side, and everything else. So 11
against 2, and "far" is carried.

**The honest counterweight, which belongs to the same claim.** KiCad's
*collector* has **no type filter at all** - `getPossibleCollisions` takes every
`SCH_ITEM` the screen's index returns - so it sees item kinds this repository's
placer has no category for, including an image, a sheet, a text box or a bus.
This repository enumerates a closed list instead. **The two are not comparable as
"how much can it see"**: ours distinguishes far more categories *and treats them
differently*, KiCad's sees every kind *and treats all but one the same*. The
prior-art claim is about categories and it holds as written; a reader should not
extend it into "KiCad sees less".

| | KiCad `10.0.5` | this repository |
| --- | --- | --- |
| what is tested | one shared field box | **each field's own box**, Reference always, Value only when drawn (**G257**) |
| clearance | none - non-intersection of the box is enough | **grown by `MARGIN = GRID / 2` = 635 µm** before testing, so two rows of text may not abut |
| a wire | its **bounding box** (`SCH_LINE::GetBoundingBox()`) | an exact **segment** test, `segmentHitsBox`; the box form is used only to weigh cost |
| the symbol's own drawing | never an obstacle - the box is outside the body by construction | pin numbers, pin names, interior graphics, DNP crosses and no-connect markers at hidden pins are all obstacles, because inside slots exist |
| grading | two discrete tiers, on TOP/BOTTOM only, MANUAL only | **weighted overlap AREA** over every candidate: `MARK_WEIGHT = 2` for anything a reader could misread as text, 1 for graphics |

**THREE THINGS KICAD DOES THAT THIS REPOSITORY DOES NOT, and the flattering
direction is not the only one.**

1. **A local repair step.** `fitFieldsBetweenWires` *moves* the chosen box to fit
   between wire rows. This repository's placer has no perturbation of any kind: the
   candidate list is a fixed discrete set, `chooseLeastCovered` picks one, and
   nothing shifts afterwards. **KiCad's search is smaller and strictly less
   adaptive except here, where it does something this repository cannot.**
2. **Pin COUNT as a preference, not just pin presence.** KiCad orders the sides by
   how many pins each carries and keeps a pinned side in play with a position
   derived from the pin bounding box. This repository treats a side as free or not
   free, and a pinned side contributes only the two last-resort beside-pin slots at
   the end of the list.
3. **The page as an obstacle at SELECTION time.** `getDrawableArea` makes a side
   whose field box leaves the printable area collide. **This repository's placer has
   no page or frame obstacle at all** - `obstacles()` in `field-placement.ts` is
   bodies, marks and placed text. The containment is decided downstream instead, by
   `textProblems` in `render/text-scene.ts` (`field-text` × `frame-border`:
   *"`if (boxesOverlap(t.box, f.box) && !strictlyWithin(t.box, f.box))`"*), and
   **the architecture is why**: a KiCad page is fixed and a frame here is DERIVED -
   `blockContent` in `render/frames.ts` unions `drawnBoxes`, which includes
   `scene.texts`, so a field that lands far out enlarges its frame rather than being
   rejected, and `packFrames` is what refuses when the paper runs out. **So this is
   a difference in where the constraint lives, not a missing check** - but it does
   mean nothing steers slot choice away from a frame edge.

**THREE CORRECTIONS TO `text-placement-prior-art.md`.** Per this register's
standard they are recorded here with the old document left unedited.

1. **§5(d) says the soft tier fires on "a vertical side".** It fires on
   `!side.x`, which selects `SIDE_TOP(0,-1)` and `SIDE_BOTTOM(0,1)` - the sides
   **above and below** the symbol. The wording inverts which two sides have a soft
   tier, and that matters because `fitFieldsBetweenWires` is restricted to the same
   two: the whole wire-handling half of this algorithm applies only to top and
   bottom.
2. **§5(c) describes the all-sides-collide fallback and stops there.** The seeded
   selection is carried into the fewest-pins loop as well, so a colliding side can
   beat a **clear** side whenever it has strictly fewer pins (§3.3, rows 3 and 4).
   The fallback is not only a last resort; it is a competitor in the ordinary case.
   **And §5 quotes the specification this behaviour departs from, in its own
   opening block, without noticing the disagreement**: its *"What it does, from its
   own header comment"* reproduces *"sift out the sides"* and *"[i]f any remaining
   sides have zero pins"* three paragraphs above its own (c). The documented
   algorithm and the actual one are both in that section; nothing there compares
   them. §3.3 does.
3. **§5 was read at `master`, 794 lines; the installed version is `10.0.5`, 799
   lines.** The difference is 15 lines and **none of it is a selection or sizing
   function**, so §5's substantive reading stands - though `pinsOnSide` is one of
   the two changed lines and it feeds the side selection, which §3.0 states
   rather than rounding off to "the algorithm is byte-identical". **And the
   document does not say which version it read beyond "at `master`", which
   moves.** Every URL in this section carries the tag, and every blob carries its
   hash.

**And one place the prior art is right in a way worth keeping.**
`lib/schgen/render/occupancy.ts:72` says this repository's two weights and KiCad's
two tiers *"reaches the same two tiers independently"*. Checked: the direction
agrees - a wire collision is the cheap one in both - but the mechanisms are not
comparable. KiCad's tiers are **filters applied to a four-element candidate list,
on two of four sides, in one of two modes**; this repository's weights are
**multipliers on an overlap area computed for every candidate**. The comment's
claim of independent convergence is fair; a reader should not take it as
equivalence.

### 3.10 Its tests: there is a test file, and it does not test the placement

**`qa/tests/eeschema/test_autoplace_fields.cpp` exists, 338 lines, five
`BOOST_AUTO_TEST_CASE`s, read in full** `[READ]`. It is the only file whose name
mentions autoplace in the whole of `qa/tests/eeschema` at this tag - **122
entries, paginated to exhaustion** from the GitLab tree API, which matters because
the first page caps at 100 and a single-page listing would have been a truncated
negative.

**Not one of the five calls `AutoplaceFields`.** Every case loads the same
`issue16538` fixture, reaches into a symbol's Reference field, sets its text angle
by hand, and asserts on `SCH_FIELD::GetBoundingBox()` or
`GetDrawRotation()`. Four of the five are explicitly about the width/height swap
on 90°-rotated symbols; the fifth asserts a height ratio under 2.0 between a
rotated and an unrotated field. Their own comments say what they are: *"Simulate
what the autoplacer should do for rotated symbols"*.

**So the autoplacer's algorithm is untested upstream.** Nothing exercises candidate
selection, the preference reordering, the collision tiers, `getDrawableArea`,
`fitFieldsBetweenWires`, the overlapping fallback, or the grid snap. The tests
cover the **input** to `computeFBoxSize` - the field bounding box, under rotation -
and stop there.

`[THIRD-PARTY]`, corroborating the negative, **and there are two near-misses here
worth reporting as such.**

A GitHub code search for `AutoplaceFields` over the `KiCad/kicad-source-mirror`
mirror returns **exactly one result under `qa/`**, and that one is
`BOOST_FIXTURE_TEST_SUITE( AutoplaceFields, TEST_AUTOPLACE_FIELDS_FIXTURE )`, the
**name** of the suite, not a call to the function. **That half reproduced
exactly** when a reviewer re-ran it.

- **Near-miss one: an earlier, narrower query (`path:qa`) returned nothing at
  all**, which would have been the right answer by accident and would have hidden
  the suite-name line.
- **Near-miss two: the total did NOT reproduce, and the figure is withdrawn.** The
  first version of this paragraph said *"57 hits"*. **57 was the number of printed
  MATCH LINES** from `gh search code ... --limit 100 | wc -l`, not a count of
  files; a reviewer re-running it got **38 files**. **A search total that moves is
  evidence about the search, not about the tree** - GitHub's code-search index is
  neither complete nor stable, and `gh search code` prints per-match lines whose
  count depends on the limit. So no total is asserted here. **The load-bearing
  claim never depended on it**: it is the one path under `qa/`, which both runs
  agree on.

That search is against the mirror's `master`, not against `10.0.5`, and a code
search is not a build; what is `[READ]` at the pinned tag is that the one
autoplace-named test file calls nothing.

### 3.11 Its known failures: 35 issues, and what users actually complain about

**Retrieval, so the grade is legible.** The GitLab issues API was called
unauthenticated for `projects/kicad%2Fcode%2Fkicad/issues?search=autoplace&in=title`,
returning **35 issues**, oldest 2018-08-27, newest 2026-08-01, **4 open and 31
closed**. **`[ISSUE-READ]` - §3.0's own mark, not the document's `[READ]`** - means
the issue's own JSON was retrieved from that API and its description read, and that
was done for **sixteen**: #7706, #8630, #9345, #9766,
#11679, #14127, #15534, #15868, #16538, #16588, #19081, #19779, #20897, #22927,
#23032, #25124. Every quotation below comes from one of those sixteen. Three rows
of the table (#9769, #11392, #21703) are **title, state and labels only** and carry
no quotation; so are the rest of the 35. **No comment thread was read**, no
attachment was opened, and nothing was reproduced. Three of the 35 are
`pcbnew`/`fp-editor` and not about this algorithm at all.

**Nothing in this section is unretrieved.** Issue **#15868**, which the brief names
and the prior-art document recorded as a fetched summary, was retrieved in full.

| issue | state | what it reports |
| --- | --- | --- |
| **#15868** (2023-10-12, 3 upvotes, 0 comments) | **open**, wishlist | the candidate set is too small for density: *"it cannot autoplace fields to the sides (left & right) or above & below when the symbol is instantiated many times, like in resistor arrays"*; *"Labels are overlapping the other symbols"*; *"Fields get placed on top of wires"* |
| **#25124** (2026-08-01) | **open**, wishlist, `librarian-requested` | asks autoplace to set the text SIZE too, and notes the grid mismatch: *"Since a few versions KiCad has designators on 10mil grid by default, but this autoplace-grid is on 50mil"* |
| **#21703** | **open** | autoplace should re-run after Change Symbol |
| #11392 | **open**, wishlist | asks for a reference-designator autoplacer in **pcbnew**, which has none |
| #9345 (25 comments) | closed, fix-released | fields placed centre-top collide with the KLC-mandated VCC pin: *"I would expect for autoplace to check if the fields would collide with the pins and move further out"* |
| #19081 | closed, fix-committed, `starter` | *"It seems to not consider the drawing sheet objects, though, meaning that sometimes it places fields in a colliding location when a non-colliding one is available"* |
| #8630 | closed, `status::new` | *"Autoplace fields does not see image object as an obstacle"* |
| #9769 | closed, duplicate | *"Autoplace fields regression - does not include outside objects at all?"* |
| #16538 | closed 2026-01-28, `status::new` | *"The function 'Autoplace Fields' in eeschema overlaps the symbol texts"*; *"I would have expected the designator and value from C1 to be moved to the bottom right"* |
| #14127 | closed, fix-committed | *"Symbol fields placed above the symbol doesn't add the 50mil space anymore"*; *"Symbol fields placed on the side of a symbol aren't aligned to the 50mil grid"*; *"most common on IC symbols or other symbols with a rectangular outline"*. **A grid report, and its repro is *"Adding a symbol"*, which passes `AUTOPLACE_AUTO` - so §3.3's defect cannot fire on it; §3.3 says why** |
| #22927 | closed, fix-committed | 10.0 nightly regression against 9.0: *"Ref/Value are rotated 90° (vertical) and aligned differently ... producing a tall footprint and wasting schematic space"* |
| #23032 | closed, fix-committed, `regression` | *"When a symbol is rotated 90° or 270°, the 'autoplace fields' option places fields in places that sometimes overlap the symbol and sometimes are unnecessarily far and spread out. 0° and 180° look good."* |
| #19779 | closed, **as-designed** | *"Autoplace fields in eeschema behaves differently whether connector symbol is oriented left or right"*; the maintainers' answer was that this is intended |
| #11679 | closed, resolved | a multi-unit custom symbol's reference *"clearely nowhere near the symbol"* |
| #16588 | closed, `status::new` | *"the fixed fields seem to be counted towards the offset of the auto placed fields"* - i.e. a field with `CanAutoplace()` false still consumes stack height |
| #7706 | closed, wishlist | *"Autoplacer always uses 'Center' alignment for 'Horizontally laying' components"* |
| **#15534** | **open** | value fields mis-placed unless the sheet is re-annotated first: *"If I annotate the entire schematic before pressing Autoplace Fields, all values are placed correctly! ... Saving, closing and opening the schematic makes Autoplace Fields misplace the values again."* |

**THE TITLE SEARCH MISSES ISSUES AND #15534 IS THE PROOF.** It is open, it is
about this algorithm, and it is **not** among the 35, because its title says
*"Auto-placement"* rather than *"autoplace"*. So **35 is a lower bound on a
substring, not a census**, and the five open issues named above are five that were
found rather than all there are. The hyphenated and spaced variants were not
swept.

**What the complaints actually cluster into**, over the 35:

1. **Rotation geometry** - #22927, #23032, #14127, #19779, #11679, and the whole of
   the test file. **This is the largest cluster and the only one upstream has
   written tests for.** It is a question about the width and height of a text box
   under a transform, which is §1's territory, not about placement search.
2. **The obstacle model being incomplete** - #19081 (drawing sheet: fixed, and the
   `getDrawableArea` code in the file read above is that fix), #8630 (images),
   #9769, #9345 (pins).
3. **The candidate set being too small in dense layouts** - #15868, #16538, #9345.
   **#15868 is the one that names the shape of the problem this repository has**,
   it is three years old, it has three upvotes and no comments, and it is open.
4. **Text size and grid** - #25124, #14127. The complaint is that the autoplacer's
   50-mil snap and the library's text size do not agree, which is a metric
   complaint rather than a placement one.
5. **When it fires, and interaction with other commands** - #21703, #15534, #9766,
   #7942, #11529, #8886, #6197.

**The evidence this is about difficulty rather than neglect:** cluster 2 has been
worked - the page-margin obstacle exists because of #19081 - and cluster 3 has
not. **Widening the candidate set is the thing upstream has been asked for and has
not done**, which is a fact about the cost of the change and not a licence for
this repository to leave its own.

### 3.12 What §3 did NOT establish

- **It did not run the autoplacer.** KiCad was not built, no schematic was loaded
  into eeschema, and no placement was observed. Every behavioural statement is a
  reading of source, and the §3.3 traces are hand traces of two functions.
- **It did not reproduce any issue.** No attachment was downloaded and no comment
  thread was read, so the mapping from §3.3's row 4 to **#16538** is a candidate
  explanation and nothing more. **#14127 is NOT offered as evidence for it**, and
  §3.3 states the two reasons it cannot be - this bullet's first version named both
  issues, which is the pairing §3's own row 6 refutes.
- **It did not read the whole of the TEN supporting files** - §3.0's table lists
  twelve and only the first two were read end to end - only the functions and call
  sites named. A behaviour that depends on something elsewhere in any of the ten
  would have been missed: `sch_field.cpp`, `sch_field.h`, `eda_text.cpp`,
  `eda_text.h`, `text_attributes.h`, `text_attributes.cpp`, `sch_edit_tool.cpp`,
  `sch_drawing_tools.cpp`, **`symbol_editor_control.cpp` and
  `symbol_preview_widget.cpp`**. The ten are listed rather than counted because
  the count is what went wrong here: **this bullet said "seven" in round 0 and
  "eight" after fix round 1 added three files to §3.0's table**, so for one round
  the document contradicted its own table and under-reported the partial-read risk
  by two - and the two it hid were the last two, whose partial reading is the least
  obvious precisely because they arrived last. Fixed in round 2; the names cannot
  drift out of step with the table the way a numeral did.
- **It did not establish whether a `.kicad_sch` field can hold a newline**, so
  §3.7's measurement-versus-drawing disagreement is an observation about two code
  paths, not a demonstrated defect.
- **It did not read the on-screen painter.** §3.7's claim about plotting is from
  `SCH_FIELD::Plot`; `sch_painter.cpp` was not opened.
- **It did not check `getPossibleCollisions` against the screen's spatial index.**
  Whether `Items().Overlapping()` returns an `SCH_BITMAP` - which decides whether
  #8630 is still live at `10.0.5` - was not established.
- **It did not measure anything.** No figure in this section was driven here; the
  §1 figures it uses are marked `[RELAYED]` with their subsection.
- **It elects nothing, recommends nothing, and authors no acceptance criterion.**

### 3.13 Mechanisms this reading suggests, every one untried

**These are not a plan and not criteria.** They are listed because a later task
will otherwise re-derive them, and each is marked with what would have to be true
for it to be worth anything.

- **MECHANISM, untried: the rigid stack is the simplification worth borrowing, not
  the four candidates.** KiCad gets a cheap algorithm by making all fields one
  box; this repository already does the same thing - `slotFields` stacks Reference
  and Value at a fixed `GRID` either side of the slot anchor - so there is nothing
  to borrow and the resemblance is already there. Recorded so nobody proposes it
  as new.
- **MECHANISM, untried: `fitFieldsBetweenWires` is the one idea here that this
  repository does not have.** A local shift of a chosen candidate, along one axis,
  to a free gap between parallel obstacles. Whether it would help depends on
  whether this repository's fallbacks are blocked by *wires* in particular, which
  **G260**'s fifteen fallbacks could be re-read for and this section did not do.
- **MECHANISM, untried: KiCad's pin-count ordering is a cheaper signal than this
  repository's pin-free/pinned split.** Unevaluated, and it would interact with the
  inside slots KiCad does not have.
- **NOT A MECHANISM, A WARNING:** §3.3's rows 3 and 4 show a four-candidate
  algorithm already failing to use a clear candidate it had found. **Any design that
  reasons "KiCad manages with four, so the candidate set is not the problem" is
  reasoning from an algorithm that does not reliably take the clear side it has.**
  §5 of the prior-art document says *"[t]he gap is not the candidate set"*; this
  reading neither supports nor refutes that for this repository, and says so.

---

§4 What comparable tools do when text will not fit
--------------------------------------------------

**The question is narrow and it is about this repository.** This generator
**refuses to emit a sheet when text would collide** - six of the eleven boards are
refused at `validateCircuit` and five at ELK layout, so it produces a drawing for
none of them (`CLAUDE.md`; **G259**). §3 established `[RELAYED]` that the closest
neighbour of all, KiCad's own `autoplace_fields.cpp`, **has no refusal path**: four candidate
sides, a two-tier collision grading, one local repair, and when every side
collides it places the fields overlapping anyway. **This section asks whether that
generalises to the other tools in the class, and it answers at the scope the
evidence supports and no wider.**

**THE SCOPE DISCIPLINE IS THE TASK, NOT A CAVEAT ON IT.** A third-party review of
the plan (2026-10-22) found the task's original wording invited a universal claim
that four open-source tools and two documentation sets cannot support, and that
**absence of an obvious refusal in a source read is not proof that no refusal
exists** - a renderer may reject geometry earlier, clip, fall back, or quietly
overlap, and those are hard to tell apart without running it. Accepted and
binding. So §4.9 states the conclusion as *"of the N tools examined, M refuse, and
here is how each was established"*, and §4.10 is a separate paragraph on what
remains unknown.

**THE TAXONOMY IN §4.8 IS NOT THIS SECTION'S.** Its five behaviours - suppress or
clip the text; allow the overlap; adjust the surrounding geometry; request user
intervention; refuse to generate - come from that review and are recorded ACCEPTED
in the plan. `CLAUDE.md` forbids the producing agent from authoring the acceptance
criteria for its own artifact, and widening or narrowing that list to fit what was
found would be exactly that. Where a tool's behaviour does not fit a row, §4.8
says it does not fit and says what the tool does instead.

**It elects nothing and recommends nothing.** **G260** carries an unanswered
question about how much overlap is acceptable; that question is the owner's and
nothing here answers it or is phrased to imply an answer.

### 4.0 What was opened, at which commit, what was run, and the three evidence grades

**Three grades, kept apart, because the plan's Step 3 requires it and because they
are not interchangeable.**

| grade | mark | what it means here |
| --- | --- | --- |
| OBSERVED | `[RAN]` | the tool was installed in a scratchpad outside this repository, executed over a fixture, and its output measured. Two of the six were run. |
| INFERRED | `[READ]` | the named source file was opened at the stated commit and the behaviour is read off it. Nothing was executed; a path not taken in the source is not a path proven not to exist elsewhere in the program. |
| DOCUMENTED | `[DOCS]` | the vendor's own page or manual was retrieved on the stated date and quoted from the bytes of the page, not from a search extract. Where the documentation is silent, this section says it is silent rather than inferring. |
| borrowed | `[RELAYED]` | a figure from another section, or from a reviewer, restated here and **not re-driven by this writer**. §4 uses it for exactly two things: §3's reading of KiCad, in three places all named in §4.9 - §3's own disclosure travels with it, the autoplacer was never executed there either - and one reviewer reproduction in §4.7. **A reviewer finding that this writer DID re-drive is credited and not marked `[RELAYED]`**, which is the case for §4.3's `psprint.c` guard. |

**`[DOCS]` is declared here because §4 needs a mark the document's header does not
define**, exactly as §3 declared `[ISSUE-READ]` for the same reason. It is weaker
than `[READ]`: a vendor page is a description of a program by its publisher, not a
primary source for what the program does. **Every `[DOCS]` quotation below was
taken from the saved bytes of the page**, by extracting the page's plain text and
printing the lines containing the term - never from a search-result snippet.
`docs/known-gaps.md` records that this branch once produced a false finding by
grepping for a paraphrase of the quotation it was looking for, and the two Altium
sentences in §4.6 were verified against the downloaded HTML for that reason.

**THE FOUR OPEN-SOURCE TOOLS, PINNED TO THE COMMIT THAT WAS READ.** Each was
cloned into the scratchpad (`git clone --depth 1`) and the per-file SHA-256 is of
the blob actually opened.

| tool | commit read | declared version |
| --- | --- | --- |
| lepton-eda | `fd160f00b83480aee9f5c7d420468115d2065808` | - (the repository's tags are inherited gEDA release tags) |
| xschem | `36e0eab33b0c7e02e6f99c54b0a39d42231039fb` | `3.4.8RC`, from the header of `xschem_library/devices/res.sym` |
| netlistsvg | `d3518f1b5c996a876b72a1a984bb39d3572c47dc` | `1.0.2` - **and this commit is AHEAD of the published 1.0.2, which declares the same string** |
| schemdraw | `e3cb52981f1ef297ddb083c9329ad89a6c8d1db4` | `0.23` |

**Every file a claim in §4 rests on, hashed.** `[READ]` here means this file was
opened at the commit above, at the functions and call sites §4 names; **none of
the four trees was read end to end.**

| file | SHA-256 of the blob opened |
| --- | --- |
| lepton-eda `lepton-eda/scheme/lepton/autoplace.scm` (1224 lines) | `7979b8839aeb941447ad070790ee2c3351a8d43f815f3d40ec1455d7739fbaff` |
| lepton-eda `lepton-eda/scheme/conf/schematic/deprecated.scm` (213 lines) | `5e83760e12d31cd85d9c0eb22583a956bc2379406c3db7bb5387f7b41cacbb8e` |
| xschem `src/draw.c` (7129 lines) | `7e2e1176fc9c9e703fc497cebacba97a057122b3e2af4b2eb6833f7ce1fffd67` |
| xschem `src/svgdraw.c` (1241 lines) | `53dccaec654b52d987f8f899c4bd88bd5f4bbb0ee70929caebf559f4791f8a47` |
| xschem `src/psprint.c` (1702 lines) - **opened by a REVIEWER, confirmed here** (§4.3) | `fe878c711ad0163c836ef74b978446ad6241decfa10eac55570b5e9132a481f7` |
| xschem `src/netlist.c` | `f70be7a3be3abb8a4d38f4b7b2f8d8e846ca06f599c78ee7243d17ca501a2594` |
| xschem `src/spice_netlist.c` | `07794a0d3cf7a57aeb02602259916959da5252523cca5b788049658f8f24d839` |
| xschem `xschem_library/devices/res.sym` | `59fa408b3bc0354839a226ec911db7840b40450903d5627b2b93a46ae99193ba` |
| xschem `xschem_library/devices/opin.sym` | `042b26648214b7e2e31335819c2f0961941a9ba3f08385cff093719337bca2c4` |
| netlistsvg `lib/Cell.ts` | `270f1742b4b27565bd8bbf067822a91c0f6c73cb3ab6b57dacebbbfa60590676` |
| netlistsvg `lib/drawModule.ts` | `c0a3481fad85020c7306f0060d31cdcecef0ef574d8beb5af56f1a53c43ad51b` |
| netlistsvg `lib/analog.svg` (the skin the run uses) | `c40e2682841ead6decd6fa41442e0168888010403bdd7404da0213d82c1ddab8` |
| schemdraw `schemdraw/elements/elements.py` | `90df8c7d82fad84ea80ec88b4189c72f53b4e25c7e22b557157da96ad7fdf33e` |
| schemdraw `schemdraw/segments.py` | `27c82f2b1a73746023caabd27192c42b516b3236f990cea2397075364c295eda` |
| schemdraw `schemdraw/backends/svg.py` | `54195b00281d1488b6e631db8eead571ddcf8140cbf61c81f3a3ca3a483df81f` |
| schemdraw `schemdraw/elements/twoterm.py` (the two hits the collision grep found) | `a140d7e7d4a87ba185126f025bf0910f60437bb739f230cdb5be00dc9f83c29c` |

**The lepton-eda blob was re-fetched by raw URL from GitHub at that commit and
hashed to the same value**, so the figure is not an artefact of the clone.

**WHAT WAS RUN, AND WHERE THE RUN AND THE READ ARE THE SAME BYTES.** Nothing was
installed into this repository: no `package.json` entry, no lockfile change, no
vendored copy. Both runs are in the session scratchpad.

- **netlistsvg** `[RAN]` - dependencies installed with `npm install --legacy-peer-deps`
  inside the scratchpad clone, and **the clone's own committed `built/` was
  executed** (`node bin/netlistsvg.js`), so the run is the compiled form of the
  `lib/` that was read. `git status --porcelain built` reports 0 modified files and
  the edge-label code appears in `built/drawModule.js`. **It was NOT recompiled**:
  the pinned TypeScript cannot parse the newer `@types` the install pulled in, so
  `built/` is trusted as the repository's committed artefact rather than
  reproduced. **The npm 1.0.2 tarball was tried first and discarded**, because it
  predates this commit despite declaring the same version - it has neither the
  bus-width edge labels nor `setAlternateCellType`, so a reading of `master` and a
  run of the tarball would not have been the same program.
- **schemdraw** `[RAN]` - `pip install schemdraw==0.23` into a scratchpad venv
  (Python 3.14.6), `ziamath` NOT installed. `diff -rq` against the clone finds
  three files differing, all post-release and none of them one a claim here rests
  on; **the two files the claims do rest on are byte-identical between the clone
  and the installed wheel**, by the SHA-256 in the table above.
- **lepton-eda and xschem were NOT run.** Both are C programs with GUI toolchains
  (GTK, X11/Tcl-Tk), and Guile is not installed here either, so every statement
  about them is `[READ]`. §4.10 says what that leaves open.

### 4.1 THE TOOL BEHAVIOUR TABLE

**The deliverable the plan asks for.** "Candidate model" is how many positions the
tool will consider for one designator or net label. "On failure" is what it does
when the position it has is not clear.

| tool | candidate model for a designator / net label | collision model | on failure | grade |
| --- | --- | --- | --- | --- |
| **lepton-eda** | **one** position per match in a 45-row table keyed by attribute name, the set of sides carrying pins, and object type; 3 of the 45 rows also carry a movement direction | **pins and the corridor in front of pins only** - no other text, no wires, no symbol bodies, no page border | **allow the overlap**: one translate along the permitted axis, snapped to a 50-unit grid, applied with **no re-check**, then the text is written | `[READ]` |
| **xschem** | **none** - the position is a constant authored in the `.sym` file (`T {@name} 15 -18.75 ...`) | **none for text** | **allow the overlap** (nothing is tested); separately **suppresses** text below a device-pixel threshold at the current zoom, which is not a collision response | `[READ]` |
| **netlistsvg** | **none** for a cell label - the position is the skin template's `x`/`y`; ELK's returned label coordinate is never read for a cell label | ELK is handed a label box of `6 x text.length` by `11`, and that box buys **node spacing** | **allow the overlap**, and **adjust the surrounding geometry** across layout columns; the drawn text can leave the canvas the generator itself declares | `[RAN]` + `[READ]` |
| **schemdraw** | **one** - `label(loc=...)`, defaulting to `'top'`, plus an offset and optional per-element hints | **none** | **allow the overlap**; the figure's bounding box grows to contain the text and the text does not move | `[RAN]` + `[READ]` |
| **Altium Designer** | schematic: `Autoposition` is a **boolean** meaning the text follows the component through rotation. PCB: **nine** named styles, all of them "automatic positions" in the same following-the-component sense | **not documented** | **allow the overlap** - documented as a supported state managed by z-order commands, not as a failure | `[DOCS]` |
| **OrCAD Capture** | **not documented at all** in the manual retrieved | **not documented** | **not documented** | `[DOCS]` |

### 4.2 lepton-eda: the only one of the four with a collision model, and it cannot refuse

**Where designator and net-label positions come from.** `autoplace.scm` holds one
table, `default-position-of-text-attributes`, of **45 rows**: 4 for `pinlabel`, 4
for `pinnumber`, 11 each for `refdes`, `value` and `device`, and 4 for `netname`
on a net or a bus. A row matches on the attribute's name, a string of the pin
directions the object must have (`"<"`, `"<>"`, `"<>^v"` and so on), and an object
type; it supplies an x/y offset, a reference corner of the object's bounds, a text
alignment, an angle, **a movement direction**, a spacing and a colour. So the
candidate set for one designator is **one position**, selected by the symbol's pin
geometry rather than searched.

**The collision model, which is narrower than it first looks.**
`adjust-pos-to-avoid-collision` loops the four pin directions in two passes. Pass
1 tests `check-overlapping-of-pin-connections` - the attribute against the pin
bounds **and the empty corridor in front of the pins where a net will later be
drawn**, which is a genuinely good idea and is a category this repository's
obstacle set does not have. Pass 2 tests `check-collision-of-bounds` against the
pins *including their own `pinname`/`pinnumber` text. **That is the whole obstacle
set**: no other component's text, no wires already drawn, no symbol graphics, no
sheet border.

**On collision it translates once, along the axis the row permits, and never
re-checks.** For a vertical pin side the shift is horizontal, for a horizontal pin
side vertical; the magnitude clears the pin bounds plus the row's spacing and is
then snapped to the 50-unit grid. The loop proceeds to the next side. **There is no
verification that the destination is clear of anything**, and the function's only
exit returns the adjusted bounds.

**And then the text is written, unconditionally.** `set-default-position` takes
whatever `adjust-pos-to-avoid-collision` returned, derives an x/y offset from it,
and calls `set-attribute-text-properties!`. **There is no value by which the
function can report that it failed**, and nothing downstream inspects one.

**The decisive check, which could have answered differently.** `autoplace.scm`
contains **nine** `error` calls. All nine are malformed-input refusals - an
unknown point name in `get-point-of-bound`, an unknown coordinate in
`get-bound-of-pin`, an unknown pin direction in two places, an unknown reference
string in three places, an odd-length attribute list, and an invalid text
alignment. **Not one of them is reached because text has nowhere to go.** A
repository-wide grep for `cannot place`, `could not place`, `unplaceable`, `no
room`, `does not fit` and `refus` over every `.c`, `.h` and `.scm` in the tree
returns four hits, all of them unrelated (two test comments about configuration
loops, two GTK comments about drawing state).

**THREE THINGS THE DEFAULT CONFIGURATION DOES THAT CHANGE WHAT THIS MEANS.**
`scheme/conf/schematic/deprecated.scm` is where the hooks live, and in it:

- **the `refdes`/`value` autoplacer is commented out.** All four hooks that would
  call `autoplace-object-attributes` - on adding, rotating or mirroring a
  component, and on adding an attribute - are commented, as is the
  `complex-place-list-changed-hook` variant. So in a default lepton-eda **a
  component designator is placed by the person, and the table above is reached
  only by a user who edits their configuration.** The file's name says the rest.
- **the `netname` autoplacer is live**, through
  `(add-hook! add-objects-hook place-netname-attribute-handler)`, and its four
  table rows carry an **empty** movement direction.
- **the PIN-ATTRIBUTE autoplacer is live too**, through
  `(add-hook! add-pin-hook (lambda (pin) (autoplace-pin-attributes pin )) #t)` -
  the only one of the three `*-pin-hook` registrations left uncommented. Its eight
  table rows, four `pinlabel` and four `pinnumber`, also carry an **empty**
  movement direction and a spacing of `0`.

**AND THE COLLISION ADJUSTMENT IS A NO-OP FOR BOTH OF THE TWO CLASSES IT
AUTOPLACES BY DEFAULT**, for the same reason in both cases: `get-object-pins`
returns the empty list for anything that is not a component, so `pins-bounds` is
null for a net **and for a pin**, and the whole two-pass loop finds nothing to
avoid. **This correction - two classes rather than one - was a reviewer's, and it
strengthens the point rather than weakening it:** the first version of this
sentence named only `netname`, which understated how much of lepton-eda's live
autoplacement runs with its one good idea switched off.

**TWO INCIDENTAL SOURCE FINDINGS, recorded because a later reader cannot
re-derive them and neither bears on the refusal question.** Both are `[READ]`;
lepton-eda was not run, so neither is an observed defect.

- **A stray `2` sits at column 1 of line 782**, inside the leftward-offset
  expression. Scheme's `-` is variadic, so the expression evaluates as
  `pins-min-x - 2 - attrib-max-x - spacing` rather than
  `pins-min-x - attrib-max-x - spacing`:

**Each line below is prefixed with its line number in `autoplace.scm`, and that
prefix is the only alteration** - see §4.12 for why the lines are numbered rather
than dedented.

```lepton-src
777:                                 (if (string-index move-direction #\<)
778:                                     (set! x_offset
779:                                           (- (- (get-point-of-bound
780:                                                  "min-x"
781:                                                  pins-bounds)
782:2                                                (get-point-of-bound
783:                                                  "max-x"
784:                                                  new-attrib-bounds-adjusted)
785:                                                 )
786:                                              spacing )) ;; add spacing
```

  **Why it is not simply cosmetic:** `snap-coord-to-grid` floors a negative
  coordinate onto the 50-unit grid, so an offset that would have landed exactly on
  a multiple of 50 lands one whole step further out. Transcribing that function
  into a throwaway script (not committed, and not lepton-eda) gives
  `snap(-100) = -100` against `snap(-102) = -150`. **When it was introduced was
  not established** - the clone is shallow, so there is no history to blame.
- **An empty movement direction still moves the text.** The table's own comment
  says `mov_dir` *"is an empty string if no movement is allowed"*. But when a
  collision is found and the computed offset is zero - which is what an empty
  `mov_dir` produces, since neither `<` nor `>` is present - the code falls into a
  branch that sets the offset to one grid step regardless:

Line-numbered as above and nothing else altered; `move-direction` is `""` for 42
of the table's 45 rows.

```lepton-src
798:                                 ; If the offset is zero, there is probably
799:                                 ; an overlap with pin connections, so add
800:                                 ; one grid spacing to the offset.
801:                                 (if (eq? x_offset 0)
802:                                     (if (string-index move-direction #\<)
803:                                         (set! x_offset (- 0
804:                                                           autoplace-attributes-grid))
805:                                         (set! x_offset
806:                                               autoplace-attributes-grid))
807:                                     )
```

  With `mov_dir` empty the `string-index` test is false, so the else branch fires
  and the attribute moves **right** (or **up**, in the vertical arm) by 50. For a
  net this never runs, because a net has no pins; for a component it does, and 10
  of the 11 `refdes` rows have an empty `mov_dir`. **This is a reading, not an
  observation**, and it is recorded because an agent who takes the table's comment
  at face value will model lepton-eda wrongly.

### 4.3 xschem: no candidate model, and its only suppression is a zoom threshold

**Where the text position comes from: the symbol file, as a constant.**
`xschem_library/devices/res.sym` carries `T {@name} 15 -18.75 0 0 0.2 0.2 {}` and
`T {@value} 15 -6.25 ...`; a net label symbol carries `T {@lab} 20 -8.75 ...`.
`translate()` substitutes the instance's name or value into the string at draw
time and `draw_symbol` rotates the authored offset with the instance. **There is no
placement computation to collide, and therefore no candidate set and no obstacle
set.**

**The check that could have found otherwise.** A case-insensitive grep for
`autoplace`, `auto_place`, `overlap`, `collid` and `collision` over every `.c`,
`.h` and `.tcl` under `src/` returns `warning_overlapped_symbols`, its call sites
and its Tcl menu entry, **and exactly two other lines: `src/actions.c:36-37`, a
comment about hash-function collision resistance.** **Nothing in xschem tests one
piece of text against another.** The first version of this sentence also credited
the grep with a comment about arrow coordinates; **that comment is schemdraw's
`elements/twoterm.py:842` and belongs to §4.5's grep, not this one** - the
correction is a reviewer's, and the mis-attribution had drifted into this document
from a correct note elsewhere.

**It does suppress text, and the condition is not a collision.** Both
implementations of `draw_string` return early when the text is too small to be
worth drawing at the current zoom - the cairo build at `src/draw.c:407` with
`if(size*xctx->mooz<3.0) return; /* too small */` and a companion `>1600` guard,
the non-cairo build at `src/draw.c:489` with
`if(xscale*FONTWIDTH*xctx->mooz<1)` - and both return early when `textclip` finds
the text's bounding box wholly outside the viewport. **Those are a screen
optimisation and a viewport cull.** They belong in the taxonomy's first row and
they are keyed on magnification, not on what else is at that coordinate.
**BOTH EXPORTERS CARRY THE SAME GUARD AND IN BOTH IT IS COMMENTED OUT** - the SVG
writer at `src/svgdraw.c:881` and the PostScript writer at `src/psprint.c:1185`,
each `/* if(xscale*FONTWIDTH* xctx->mooz<1) continue; */` - so **an exported file
is not subject to the suppression a screen redraw is, in SVG and in PS/PDF
alike.**

**THE PS HALF OF THAT SENTENCE IS A REVIEWER'S EVIDENCE AND NOT THIS SECTION'S.**
The first version read only `svgdraw.c` and listed the PDF and PS path as an open
unknown in §4.10: *whether the suppression threshold has any effect on an exported
PDF*. A reviewer opened `src/psprint.c` (SHA-256
`fe878c711ad0163c836ef74b978446ad6241decfa10eac55570b5e9132a481f7`, 1702 lines) and
found the identical commented-out line, which **settles that unknown** and is
recorded here as theirs. This writer confirmed the line at that offset in the same
blob; the finding is the reviewer's, the confirmation is this writer's.

**The one refusal-shaped behaviour xschem has, stated precisely because it is
easy to mistake for an answer to this section's question.**
`warning_overlapped_symbols` hashes every instance's bounding box and reports
`Error: overlapped instance found: ...` for any second instance with **exactly**
the same box, colouring it and OR-ing into the netlister's `err`.
`src/spice_netlist.c` calls it **after the netlist file has been written and
closed**; the top-level path then forces the ERC window open and sets
`exit_code = err ? 10 : 0`. **So xschem produces the output and flags the
geometry**, which is a shape worth knowing. It is about coincident symbol
instances, not about text, and the comparison is offered as a contrast rather than
as a text-handling behaviour.

### 4.4 netlistsvg: the layout engine buys room between columns, and the generator draws past its own canvas

**Where a cell label's position comes from.** `Cell.addLabels`
(`lib/Cell.ts:348-378`) walks the skin template for `<text>` nodes carrying an
`s:attribute`, and pushes an ELK label carrying the template's own `x`/`y`, the
substituted string, `height: 11` and **`width: (6 * newString.length)`**. That is a
character-count ruler with a fixed 6 units per glyph - **the same shape of estimate
as this repository's `text.length * GRID`** (§1), in a second independent
implementation.

**And the coordinate ELK returns for a cell label is never read.**
`Cell.render` (`:266-273`) takes each label only to write its **text** into the
template's own text node through `setTextAttribute`; the rendered position is the
template's. **A cell label therefore cannot be moved by the layout engine**, which
is the same shape as §2.4's finding here, arrived at from the other direction: this
repository hands ELK no labels at all, netlistsvg hands ELK labels and then
discards the positions.

**Edge labels are the exception, and what they do is not a row in the taxonomy.**
The bus-width label on an edge **does** use ELK's coordinate, and
`lib/drawModule.ts:74-92` draws a `fill: white` rectangle of
`(text.length + 2) * 6 - 2` by `9` **behind** it. The overlap is allowed and then
hidden by occluding whatever is underneath. It is closest to "allow the overlap",
but the taxonomy has no row for masking the obstacle instead of moving the text,
and that is said rather than filed.

**THE RUN: four arms over one fixture, and the control answers differently.**
`[RAN]` `test/analog/resistor_divider.json` with the `analog` skin. Arms 1 and 2
differ only in the length of the cell keys and the presence of a `value`
attribute; arms 3 and 4 add a capacitor in parallel with the lower resistor so the
two symbols land in **different layout columns**, and differ from each other only
in label length. Every box below uses netlistsvg's own 6-per-character ruler, and
every coordinate is absolute - accumulated through the nested `translate()` groups,
because the first version of the measurement compared template-local coordinates
and found two "overlaps" that were in different groups.

**THE FIXTURE, PASTED, BECAUSE THE RUN IS WORTHLESS WITHOUT IT.** All four arms
are built from **one committed upstream file** - `test/analog/resistor_divider.json`
in the pinned clone, SHA-256 `98d766f37a43546de5f0579d894cae88f8682bdb7887494ba399adf3c762098a` -
by the script below, which is the script that was run. **A re-drive that cannot
reproduce the fixture cannot tell a wrong claim from a different fixture**, and
the first version of §4 pasted the output and not the input.

```nsvg-fixture
// Builds all four netlistsvg arms from ONE committed upstream file,
// test/analog/resistor_divider.json in the pinned clone. Run as:
//   node fixtures.js <that file> <output directory>
// Arms: baseline is the upstream file copied unchanged; long renames the two
// resistors and gives each a value; parallel adds a capacitor across the lower
// resistor so the two symbols land in different layout columns; parallel-short
// is parallel with short keys and no value, which is the control for it.
const fs = require('fs')
const [base, out] = process.argv.slice(2)
const read = () => JSON.parse(fs.readFileSync(base, 'utf8'))
const write = (name, doc) => fs.writeFileSync(`${out}/${name}.json`, JSON.stringify(doc, null, 2))
const R_UP = 'R_FEEDBACK_UPPER_DIVIDER'
const R_LO = 'R_FEEDBACK_LOWER_DIVIDER'
const C_PAR = 'C_FILTER_ACROSS_LOWER'

function renamed(doc, map, attrs) {
  const m = doc.modules.resistor_divider
  const cells = {}
  for (const [k, v] of Object.entries(m.cells)) {
    if (map[k] !== undefined && attrs !== null) v.attributes = { value: attrs }
    else if (map[k] !== undefined) delete v.attributes
    cells[map[k] ?? k] = v
  }
  m.cells = cells
  return doc
}

fs.copyFileSync(base, `${out}/baseline.json`)
write('long', renamed(read(), { r1: R_UP, r2: R_LO }, '4k7_METAL_FILM_1PCT'))

const parallel = renamed(read(), { r1: R_UP, r2: R_LO }, '4k7_METAL_FILM_1PCT')
parallel.modules.resistor_divider.cells[C_PAR] = {
  type: 'c_v',
  port_directions: { A: 'input', B: 'output' },
  connections: { A: [3], B: [4] },
  attributes: { value: '100nF_X7R' },
}
write('parallel', parallel)

const short = JSON.parse(JSON.stringify(parallel))
write('parallel-short', renamed(short, { [R_UP]: 'r1', [R_LO]: 'r2', [C_PAR]: 'c1' }, null))
```

**Consolidating the three ad-hoc mutation scripts of the first version into this
one changed no figure.** The log below is byte-identical to the earlier run except
for the two lines the script added, which is what `diff` between the two logs
reports.

```nsvg-run
clone commit: d3518f1b5c996a876b72a1a984bb39d3572c47dc
clone declares version: 1.0.2
committed built/ modified by this session: 0 file(s)
edge-label code present in the committed built/drawModule.js: 8 hit(s)
upstream fixture SHA-256: 98d766f37a43546de5f0579d894cae88f8682bdb7887494ba399adf3c762098a
baseline arm is that file unchanged: yes
== ARM baseline (analog skin)
exit code: 0
stderr bytes: 0
svg bytes: 3055
canvas: 74 x 249
text elements with a position and a string: 3
  text "r1" abs box x 32..44 y 51..62
  text "vout" abs box x 47..71 y 97..108
  text "r2" abs box x 32..44 y 141..152
text-on-text overlapping pairs: 0
drawn shapes measured (line/path/rect): 13
text boxes overlapping a drawn shape: 0
text boxes leaving the declared canvas: 0
clip-path attributes in the document: 0
textLength attributes in the document: 0
== ARM long (analog skin)
exit code: 0
stderr bytes: 0
svg bytes: 3358
canvas: 173 x 249
text elements with a position and a string: 5
  text "R_FEEDBACK_UPPER_DIVIDER" abs box x 32..176 y 51..62
  text "4k7_METAL_FILM_1PCT" abs box x 32..146 y 66..77
  text "vout" abs box x 47..71 y 97..108
  text "R_FEEDBACK_LOWER_DIVIDER" abs box x 32..176 y 141..152
  text "4k7_METAL_FILM_1PCT" abs box x 32..146 y 156..167
text-on-text overlapping pairs: 0
drawn shapes measured (line/path/rect): 13
text boxes overlapping a drawn shape: 0
text boxes leaving the declared canvas: 2
  OUTSIDE "R_FEEDBACK_UPPER_DIVIDER" abs box x 32..176 y 51..62 vs canvas 173 x 249
  OUTSIDE "R_FEEDBACK_LOWER_DIVIDER" abs box x 32..176 y 141..152 vs canvas 173 x 249
clip-path attributes in the document: 0
textLength attributes in the document: 0
```

**What that pair establishes.** Both arms **exit 0, write the SVG and print
nothing on stderr**: there is no refusal. There is no clipping either - zero
`clip-path` attributes, zero `textLength` attributes, and the full strings are in
the file. **Nothing moved** - all five node transforms are identical between the
arms, which is driven rather than asserted:

```nsvg-run
== NODE TRANSFORMS, baseline vs long (one column)
arm baseline:
  transform="translate(17,47)" id="cell_r1"
  transform="translate(17,137)" id="cell_r2"
  transform="translate(12,12)" id="cell_vcc"
  transform="translate(12,207)" id="cell_gnd"
  transform="translate(32,112)" id="cell_vout"
arm long:
  transform="translate(17,47)" id="cell_R_FEEDBACK_UPPER_DIVIDER"
  transform="translate(17,137)" id="cell_R_FEEDBACK_LOWER_DIVIDER"
  transform="translate(12,12)" id="cell_vcc"
  transform="translate(12,207)" id="cell_gnd"
  transform="translate(32,112)" id="cell_vout"
```

The only thing that changed is the declared canvas, from 74 to 173 wide -
**and it is still 3 units short of the text it contains**, which is the shape of
the problem rather than a rounding complaint: netlistsvg draws the label at the
skin template's offset while the only thing it tells ELK is an estimated box, so
the position ELK accounted for and the position the generator draws need not
agree. **The 3-unit shortfall appears in three of the four arms and its exact
arithmetic was not determined.**

**The second pair is the one that fills the taxonomy's third row.** Same topology
in both, labels long in one and short in the other:

```nsvg-run
== NODE TRANSFORMS, parallel-long vs parallel-short (two columns)
arm parallel:
  transform="translate(22,47)" id="cell_R_FEEDBACK_UPPER_DIVIDER"
  transform="translate(173,152)" id="cell_R_FEEDBACK_LOWER_DIVIDER"
  transform="translate(17,12)" id="cell_vcc"
  transform="translate(17,237)" id="cell_gnd"
  transform="translate(12,152)" id="cell_C_FILTER_ACROSS_LOWER"
  transform="translate(37,112)" id="cell_vout"
arm parallel-short:
  transform="translate(22,47)" id="cell_r1"
  transform="translate(77,152)" id="cell_r2"
  transform="translate(17,12)" id="cell_vcc"
  transform="translate(17,237)" id="cell_gnd"
  transform="translate(12,152)" id="cell_c1"
  transform="translate(37,112)" id="cell_vout"
```

**One node moved 96 units and the other five did not.** The lower resistor goes
from `translate(77,152)` with short labels to `translate(173,152)` with long ones,
which is **the layout engine making room for the label width it was given**. That
is the taxonomy's *adjust the surrounding geometry* row, OBSERVED, **under one
condition: the two parties have to be in different layout columns.** Inside a
single cell, where the label's position is the template's constant, no amount of
label width buys anything. **Neither arm refuses, and neither reports anything.**

### 4.5 schemdraw: one location, no obstacle set, and the canvas grows around the overlap

**Where the label position comes from.** `Element._place_label`
(`schemdraw/elements/elements.py:648-751`) resolves exactly **one** location:
`label.loc`, defaulting to the element's `lblloc` and then to `'top'`, mapped
through a small alias table, flipped for a flipped or reversed element, offset by
`lblofst` (default `.1`), with alignment derived from the drawing angle and
optional per-element `_labelhints` filling in anything the caller left unset. The
anchor is then one of the element's own named anchors or the midpoint of a side of
its bounding box, and a `SegmentText` is appended. **The only `raise` in the
function is `ValueError(f'Undefined location {label.loc}')`, for an unrecognised
location NAME.**

**There is no collision model.** A case-insensitive grep for `overlap`, `collid`
and `collision` over every `.py` in the tree returns two comments in
`elements/twoterm.py`, one about an arrow offset and one about fill ordering.

**It does measure text properly, and uses the measurement only to size the
canvas.** `SegmentText.get_bbox` (`schemdraw/segments.py:351`, in the class that
begins at `:250`) calls
`backends/svg.py:text_size`, whose docstring says the size *"will be exact
bounding box if ziamath installed and using path text mode. Otherwise size will be
estimated based on character widths."* Either way it is a per-glyph quantity, not
`len x height`. **So two of the four open-source tools measure text per glyph and
two use a character count** - netlistsvg's 6-per-character and this repository's
`text.length * GRID` are the two that do not.

**THE RUN: two arms, identical but for the gap and the label strings.** `[RAN]`
Two resistors one above the other, each labelled at the default `'top'`. The
control places them 1.2 units apart with `R1`/`R2`; the treatment places them 0.5
apart with two-line labels. Boxes are schemdraw's own `SegmentText.get_bbox`,
pushed through each element's transform into drawing coordinates.

**THE FIXTURE, PASTED FOR THE SAME REASON AS §4.4's.** A reviewer re-drove this
probe and reproduced the two text-box **widths** (`0.484` and `4.062`) and not the
coordinates, **because the geometry was described in prose and not recorded** -
which is precisely the state in which a re-drive cannot distinguish a wrong claim
from a different fixture. This is the function the run used, and the arm table
beside it:

```sd-fixture
def fixture(gap, lbl1, lbl2):
    """THE FIXTURE, and the only thing that differs between the two arms."""
    d = schemdraw.Drawing(show=False)
    d.config(unit=1.2)
    d += elm.Resistor().right().label(lbl1)
    d.here = (0, -gap)
    d += elm.Resistor().right().label(lbl2)
    return d


ARMS = (('control', 1.2, 'R1', 'R2'),
        ('collide', 0.5, 'R_FEEDBACK_UPPER\n4k7 1%', 'R_FEEDBACK_LOWER\n4k7 1%'))
```

**Lifting the geometry out of the arm function into that one place changed no
figure**: the re-driven log is byte-identical to the earlier one, which `diff`
between the two reports as no difference at all.

```sd-run
schemdraw 0.23
== ARM control
raised: None
figure bbox: xmin 0.000 xmax 1.200 ymin -1.450 ymax 0.739
svg produced: True, bytes: 1115
text segments: 2
  text 'R1' box x 0.358..0.842 y 0.35..0.739
  text 'R2' box x 0.358..0.842 y -0.85..-0.461
text-on-text overlapping pairs: 0
  line 'R1' present in the svg verbatim: True
  line 'R2' present in the svg verbatim: True
clipPath elements in the svg: 0
textLength attributes in the svg: 0
== ARM collide
raised: None
figure bbox: xmin -1.494 xmax 2.694 ymin -0.750 ymax 1.128
svg produced: True, bytes: 1178
text segments: 2
  text 'R_FEEDBACK_UPPER\n4k7 1%' box x -1.431..2.631 y 0.35..1.128
  text 'R_FEEDBACK_LOWER\n4k7 1%' box x -1.494..2.694 y -0.15..0.628
  OVERLAP 'R_FEEDBACK_UPPER\n4k7 1%' x -1.431..2.631 y 0.35..1.128 vs 'R_FEEDBACK_LOWER\n4k7 1%' x -1.494..2.694 y -0.15..0.628
text-on-text overlapping pairs: 1
  line 'R_FEEDBACK_UPPER' present in the svg verbatim: True
  line '4k7 1%' present in the svg verbatim: True
  line 'R_FEEDBACK_LOWER' present in the svg verbatim: True
  line '4k7 1%' present in the svg verbatim: True
clipPath elements in the svg: 0
textLength attributes in the svg: 0
```

**The control answers differently from the treatment**, which is what makes the
treatment worth reporting: 0 overlapping pairs against 1, by schemdraw's own
bounding boxes, with everything else held fixed. In the colliding arm **nothing is
raised**, a 1178-byte SVG is produced, all four text lines are present verbatim,
and there are zero `clipPath` and zero `textLength` attributes - so no refusal, no
clip and no truncation. **The figure's bounding box grows from 1.2 units wide to
`-1.494 .. 2.694`** to contain the text. The canvas accommodates; the text does
not move; the overlap stands.

### 4.6 Altium Designer, as documentation, with the quotations verified against the page

`[DOCS]` **retrieved 2026-10-22**, pages saved and quoted from their own bytes. No
Altium source was read and no Altium product was run.

**ALL THREE URLs, GIVEN IN FULL, because the first version gave one and a reviewer
had to search for the other two.** Each was fetched with `curl -sSL` and a browser
user agent; the byte count is of the saved HTML at retrieval.

| page | URL | bytes saved |
| --- | --- | --- |
| *Working with Placed Components* | `https://www.altium.com/documentation/altium-designer/schematic/placed-components` | 216,946 |
| *PCB Placement & Editing Techniques* | `https://www.altium.com/documentation/altium-designer/pcb-cmd-autopositioncomponenttextsautopositioncomponenttexts-ad?version=22` | 211,126 |
| *Schematic Placement & Editing Techniques* | `https://www.altium.com/documentation/altium-designer/schematic-placement-editing-techniques` | 185,815 |

**How each quotation was taken, since this is the surface the brief called the
worst available failure.** The saved HTML had `script` and `style` elements
stripped, remaining tags replaced by newlines, entities unescaped, and the lines
containing the search term printed. **Every quotation below is a line of that
output**, not a reconstruction of one. A page's byte count is a weak pin - these
are living pages - so the URLs and the retrieval date are what a later reader
re-checks against.

**The schematic side: `Autoposition` is a boolean about rotation, not about
collisions.** From *Working with Placed Components*
(`https://www.altium.com/documentation/altium-designer/schematic/placed-components`):

> *"Autoposition – check to enable auto-positioning, meaning that the parameter is
> positioned automatically every time the associated component is rotated. Disable
> this option to keep the parameter position to the associated component when it is
> rotated."*

and

> *"The default behavior of the Designator is to auto-position it as a component is
> rotated during placement."*

**The words `overlap`, `collid` and `clutter` do not appear anywhere on that
page** - a grep that could have matched and did not.

**The nine positional styles, which this repository has cited before and which are
a PCB command rather than a schematic one.** From *PCB Placement & Editing
Techniques*:

> *"The following nine positional styles are available for the text, all of which
> are classed as 'automatic positions', meaning the text remains in the chosen
> position as the component is moved and rotated:"*

followed by `Left-Above`, `Left-Center`, `Left-Below`, `Center-Above`, `Center`,
`Center-Below`, `Right-Above`, `Right-Center`, `Right-Below`, and a `Manual` style
reached by dragging the text.

**TWO CORRECTIONS TO [`text-placement-prior-art.md`](text-placement-prior-art.md)
§7, recorded here because that document is read and never rewritten.** Its claim
was marked `[THIRD-PARTY]` from a search extract, and it substantially holds.
**A POINTER TO THESE TWO CORRECTIONS NOW SITS IN THAT DOCUMENT, at the head of its
*Other EDA tools* subsection**, and it was not there in the first version of §4:
**a correction that lives only in the correcting document leaves the wrong claim
standing in the place a reader meets it first**, which is a reviewer's finding and
is accepted. The plan's file table allows that document a pointer and forbids an
edit, so the original paragraph is untouched beneath it.

1. Its quotation is *"[n]ine positional styles ... all classed as 'automatic
   positions'"*. **The page says "all of which are classed as"**. The elision is
   marked in the original, so this is a shortening rather than a misquotation, but
   the exact sentence is now on record.
2. Its sentence attaches the nine styles to **schematic** designator text. **They
   are the PCB editor's `Position Component Text` command.** On the schematic side
   `Autoposition` is a checkbox, not a nine-way choice. Its conclusion -
   *"[n]ine positions, fixed, with no overlap avoidance documented"* - survives
   both corrections, and the "automatic" in the quotation is now pinned to what
   the page says it means: the text follows the component, which is not a claim
   about clearance.

**And the documentation is explicit that overlap is a NORMAL STATE.** From
*Schematic Placement & Editing Techniques*:

> *"The schematic editor automatically stacks objects, text and graphics in layers.
> Each object is on a different layer depending on the creation order and,
> therefore, it is possible to place objects so that they overlap. The objects
> created or added recently are always on the top layer."*

and, of the alignment commands:

> *"Objects will be moved regardless of their position with respect to the
> reference. It is possible to end up with partial or total overlap of objects."*

The page then documents commands for moving an object to the front or back of an
overlapping stack and a pop-up for choosing among overlapping objects under the
cursor. **Overlap is something Altium gives the user tools to manage, not
something it prevents or refuses over.** Nothing retrieved documents suppression,
clipping or refusal of designator text, and **the failure semantics are not
specified at all** - which is stated here rather than inferred.

### 4.7 OrCAD, as documentation, and the half of it that could not be retrieved

`[DOCS]` **retrieved 2026-10-22.** The *OrCAD Capture User Guide*, Product Version
16.6, October 2012, Cadence Design Systems - the vendor's own manual, retrieved as
a PDF from a third-party mirror and converted with `pdftotext -layout` to
**31,433 lines**. **The mirror URL, which the first version omitted**:

| document | URL | bytes | SHA-256 |
| --- | --- | --- | --- |
| *OrCAD Capture User Guide* 16.6 | `https://www.i-t.com/wp-content/uploads/2019/05/cap_ug.pdf` | 5,487,028 | `d1a6dd3b722c130834471f3e3090f86de5636e213ec10fa189c2a80e25e83bc9` |
| *Quickstart OrCAD Capture* 17.4 (FlowCAD, third party, cross check only) | `https://www.flowcad.de/AN/Capture_Quickstart_EN.pdf` | 2,240,613 | - |

**A PDF is a strong pin where a web page is a weak one**, and a reviewer used it.
`[RELAYED]` A review of this section reports that an independent retrieval of that
URL reproduced **the exact byte count and the exact SHA-256 above, 31,433 lines,
and all eleven grep counts in the table below**. **This writer did not re-drive
their retrieval**, so the mark is on their figure rather than on mine; what is
`[DOCS]` here is the original retrieval and the counts, and the hash is what makes
the two comparable at all.

**Searches over that text that could have matched, and did not:**

| term | hits | what the hits are |
| --- | --- | --- |
| `auto.?position` | 0 | - |
| `designator.*position` / `position.*designator` | 0 | - |
| `collision`, `collide`, `clutter`, `legib`, `too long` | 0 each | - |
| `truncat` | 5 | a wildcard-search note, two notes that fields may wrap or appear truncated **in a third-party program**, and two printing-offset statements that *"No truncation takes place"* |
| `overlap` | 3 | all three about selecting from among overlapping objects |
| `reference designator` | 52 | annotation, numbering and locking - never placement of the text |

**So the manual documents no designator auto-placement and no failure semantics
for designator text at all.** That is a statement about this document, not about
the product: a feature absent from a 2012 manual may exist in a later release.
A third-party *OrCAD Capture Quickstart* (FlowCAD, 17.4) was retrieved as a cross
check and contains zero hits for `autoposition`, `auto position` and `overlap`.

**WHAT COULD NOT BE RETRIEVED, AND IT IS THE INTERESTING HALF.** OrCAD's and
Allegro's **PCB** side is reported to have a silkscreen auto-placement routine
that logs the reference designators it could not place legally - which, if true,
would be the closest thing in this section to a tool that detects an unplaceable
label and tells a person. **No quotable source for it was obtained**:
`community.cadence.com` returns HTTP 403 to a plain fetch, `support.cadence.com`
requires a login, and the EMA training page that search results pointed at does
not resolve in DNS. **A search-engine summary described the behaviour and an
`autosilk.log`; a summary is not a page anyone opened, so it is recorded here as
an unverified lead and is NOT evidence and is NOT counted in §4.9.** Settling it
needs the Allegro/OrCAD PCB Editor manual, which was not obtained.

**AND IT NOW HAS A REGISTER HEADING OF ITS OWN: `docs/known-gaps.md` G268.** This
section's first version left it here and inside **G260**'s amendment, on the
precedent that §1-§3 amended existing entries and created none - **and that
precedent does not survive this case, which is a reviewer's ruling and is
accepted.** Those sections each had an entry to amend; this finding has no home,
so a later agent scanning register headings would find nothing and re-hit the same
403, the same login wall and the same dead DNS. **The refusal to count it in N or M
stands unchanged**: recording a lead and counting a tool are different
obligations, and G268 says so in its own words.

### 4.8 The taxonomy, filled in, with the condition recorded beside each behaviour

**The five rows are the review's and are not altered.** A tool appears in several
rows where it behaves differently under different conditions, and the condition is
stated with the behaviour.

| behaviour | which tools, under which condition | grade |
| --- | --- | --- |
| **suppress or clip the text** | **xschem**, on screen only, when the text is below ~3 device pixels at the current zoom or its box is wholly outside the viewport - **keyed on magnification, never on what else is at that coordinate**, and both exporters' copies of the guard are commented out. **netlistsvg**, in the weak sense that the drawn text extends past the canvas the generator declares, so an SVG consumer clips at the viewport - **a clip by the canvas, not a decision by the tool.** | `[READ]`; `[RAN]` |
| **allow the overlap** | **all four open-source tools**, and **Altium** by its own documentation. For lepton-eda after its one unverified translate; for xschem and schemdraw because nothing is tested at all; for netlistsvg within a cell, where the label's position is a template constant. | `[READ]`; `[RAN]` for netlistsvg and schemdraw; `[DOCS]` for Altium |
| **adjust the surrounding geometry** | **netlistsvg**, observed: one node moved 96 units when its label grew, with five others unmoved - **but only across layout columns**, because ELK cannot move a label whose position the renderer takes from a template. **This is the row this repository is emptiest on** (`[RELAYED]` from §3: KiCad has one local repair, `fitFieldsBetweenWires`; this repository has no perturbation of any kind). **Nothing else examined does it.** | `[RAN]`; `[RELAYED]` for the KiCad clause |
| **request user intervention** | **Nothing examined asks a person because it could not place text.** The three nearest things are all something else: lepton-eda's component autoplacer is **hook-only and commented out by default**, so the person does the work because the tool never offers to; Altium's nine styles and `Manual` style are a user choice offered up front; and xschem's forced ERC window is about coincident symbol instances and fires after the netlist is written. | `[READ]`; `[DOCS]` |
| **refuse to generate** | **None of the six.** Established per tool in §4.9. | - |

**ONE BEHAVIOUR DOES NOT FIT ANY OF THE FIVE ROWS, AND IT IS KEPT OUT OF THE
TABLE ABOVE RATHER THAN GIVEN A ROW IN IT.** `[RAN]` **Growing the canvas around
the text**: schemdraw's figure bounding box goes from 1.2 units wide to
`-1.494 .. 2.694`, and netlistsvg's declared canvas from 74 to 173. **It is
accommodation, not avoidance** - the overlap is unchanged and the drawing is still
produced - so it is neither *adjust the surrounding geometry* nor any other row.
The first version of this section put it in the table as a sixth row with that
disclaimer inside the cell, **which is exactly how a reader concludes the taxonomy
was widened**, and the taxonomy is not this section's to widen (§4's opening). It
is recorded at all because two of the four tools do it and a reader who filed it
under *adjust the surrounding geometry* would be recording a repair that did not
happen.

**A second behaviour does not fit either, and it is recorded in §4.4 where it was
found**: netlistsvg draws a `fill: white` rect behind a bus-width edge label, so
the overlap is allowed and then **hidden by occluding what is underneath.** The
taxonomy has no row for masking the obstacle instead of moving the text.

### 4.9 The conclusion, at the scope the evidence supports

**Of the SIX tools examined, ZERO refuse to produce the drawing because text would
not fit.** How each was established, one line each, with the grade:

1. **lepton-eda** `[READ]` - the placement function's only exit returns a position,
   `set-default-position` always writes the text, and all nine `error` calls in
   the file are malformed-input refusals. Not run.
2. **xschem** `[READ]` - there is no text-collision test to fail; the two early
   returns in `draw_string` are a zoom threshold and a viewport cull. Not run.
3. **netlistsvg** `[RAN]` - four arms, every one exit 0 with the SVG written and
   stderr empty, including the arm whose text leaves the declared canvas.
4. **schemdraw** `[RAN]` - the colliding arm raises nothing and produces the SVG
   with both labels whole and overlapping by its own bounding boxes.
5. **Altium Designer** `[DOCS]` - overlap is documented as a normal state with
   z-order commands to manage it; no refusal is documented and no failure
   semantics are specified.
6. **OrCAD Capture** `[DOCS]` - the retrieved manual documents no designator
   auto-placement and no failure semantics, so there is no documented refusal to
   find.

**Adding §3's KiCad makes it zero of seven** `[RELAYED]`, and KiCad is the one
that matters most, because it is the program `make check` runs on this
repository's output on every run. **The mark is there because that seventh figure
is not §4's** - it is §3's reading of `autoplace_fields.cpp` at tag `10.0.5`,
restated here and not re-driven, and §3 itself records that the autoplacer was
never executed. **The N of six in the sentence above excludes it**, and every
other `[RELAYED]` use in §4 is this same figure: the opening paragraph's summary of
§3, §4.8's *adjust the surrounding geometry* row where it cites
`fitFieldsBetweenWires`, and this line.

**THE FINDING THAT MATTERS SURVIVES AT THIS SCOPE, and it is about this
repository.** None of the tools examined - including the two that were run and the
one that renders this repository's own files - refuses to produce a drawing because
text will not fit. **So this generator's refusal is unusual among its closest
neighbours.** That is a claim six tools can support, and it is all this section
claims. It is **not** a claim that no tool anywhere refuses, and it is **not** a
claim that refusing is wrong: whether a refusal is right here depends on what an
acceptable sheet is, which is the owner's question and is **G260**'s.

### 4.10 What remains unknown, which is a separate paragraph because the plan requires it to be

**Two tools were never executed, and for those two "no refusal in the source" is
weaker than it reads.** lepton-eda and xschem were read, not run. The review's
caution applies to them in full: a program may reject geometry earlier than the
function one is reading, clip in a layer one did not open, fall back somewhere
else, or quietly overlap, and **a source read cannot tell those apart.** For
lepton-eda the specific hole is that only `autoplace.scm` and the hook
configuration were read; `libleptongui` and `liblepton` were greped but not read,
so a refusal elsewhere in the rendering or export path would have been missed. For
xschem the specific hole is that `draw.c`, `svgdraw.c` and `psprint.c` were read
only at the text functions, and the Tcl layer was greped rather than read.
**`psprint.c` was absent from this list in the first version**, which is how its
guard went unnoticed; see the last paragraph of this subsection.

**Four tools were not examined at all.** Eagle/Fusion, KiCad's own `pcbnew`
silkscreen side, LibrePCB and Horizon EDA were not opened; the plan named four
open-source tools and these are not among them. **gschem was not read separately**
from lepton-eda, on the brief's instruction that lepton-eda is the maintained
fork.

**The commercial half is thinner than the open-source half and is thin in a
specific way.** Two vendors were examined and only through documentation. For
Altium, no source and no running product; what is established is what the pages
say, and the pages do not specify failure semantics. For OrCAD, the manual
retrieved is **version 16.6 from 2012** - a later Capture may document something
this one does not - and **the Allegro/OrCAD PCB silkscreen auto-placer, which is
the single most relevant commercial behaviour this section identified, could not
be retrieved from any quotable source** (§4.7). **That is the one gap whose
closing could change a row of §4.8**, because the behaviour described in the
unverified summary - place what you can, log what you could not - is a sixth shape
that none of the six tools examined exhibits.

**Two things no run here settled.** The exact arithmetic of netlistsvg's 3-unit
canvas shortfall. Whether lepton-eda's stray `2` has ever changed a placement in
practice, and when it entered.

**A THIRD WAS LISTED HERE AND IS NOW SETTLED, BY A REVIEWER RATHER THAN BY THIS
SECTION.** The first version asked *whether the suppression threshold xschem
applies on screen has any effect on an exported PDF, since only the SVG exporter's
guard was located.* It does not: `src/psprint.c:1185` carries the identical
commented-out guard, so the PS and PDF path behaves as the SVG path does. **That
file was missing from the unread-paths list above as well as from this one**, and
both omissions came from the same cause - §4.3 read `svgdraw.c` and inferred
nothing about the other exporter rather than naming it as unread. `psprint.c` is
now in §4.0's table, credited.

### 4.11 What §4 did NOT establish

- **It did not build or run lepton-eda or xschem**, so every statement about them
  is a reading of source at one commit, and the §4.2 claim about `snap-coord-to-grid`
  rests on a transcription into a throwaway script rather than on Guile.
- **It did not read any of the four tools end to end.** The files named in §4.0's
  table are the files the claims rest on; each tool's tree is far larger and was
  searched rather than read.
- **It did not recompile netlistsvg**, so the run exercises the repository's
  committed `built/` rather than a build of the `lib/` that was read.
- **It read no commercial source and ran no commercial tool.** Altium and OrCAD
  enter only as `[DOCS]`, and §4.7 names what could not be retrieved.
- **It did not measure legibility.** Every overlap figure here is a box
  intersection computed with the tool's own ruler; whether a human could read the
  result was not assessed for any tool, and §1's three measured quantities are not
  applied to any of them.
- **It did not compare the quality of placements.** Which tool produces a better
  drawing is not a question this section asked, and none of its figures bears on
  it.
- **It elects nothing, recommends nothing, and authors no acceptance criterion.**
  **G260**'s open question - how much overlap is acceptable - is the owner's, and
  nothing in §4 answers it or is phrased to imply an answer.

### 4.12 How this section's blocks are accounted for under §1.11's contract

**§4 pastes EIGHT fenced blocks and none of them is probe output**, so each is
declared not-output and is listed by name by
`tests/schgen/text-metrics/document-pastes.test.ts`, one `expect()` each, exactly
as §3's seven are. **They cannot be checked against a committed log**: the logs are
scratchpad runs of third-party tools installed outside this repository, the two
`lepton-src` blocks are a third-party source tree, and the plan forbids this task
from adding a tool or a log to the tree. **A reader who wants to re-drive them has
§4.0's commits, versions, install methods and hashes, §4.4's fixture script and
§4.5's fixture function**, which is the whole of the coupling available and is
more than the first version offered.

**THE COUNT IS NOW A GUARDED ASSERTION AND NOT THIS SENTENCE.** `SECTION_4_BLOCKS`
in `document-pastes.test.ts` pins it at **8** the way `SECTION_2_BLOCKS` pins §2 at
8, and three cases turn on it: §4's block count equals the constant, every §4 block
declares a fence word that is neither §1's `run` nor §2's `elk-run`, and the
whole-document verdict reports exactly that many NOT CHECKED blocks at line numbers
after §4's heading. A fourth drives RED - a §4 block relabelled into §1's namespace
fails **on section resolution** rather than silently leaving the population, which
is the one failure the pinned count alone would not see. **All four were driven red
once**, by setting the constant to 7 (three reds) and by the relabel case itself.

**AND THE FOURTH CASE WENT RED FOR THE WRONG REASON FOR ONE ROUND, WHICH IS WORTH
MORE THAN A SILENT FIX.** It relabelled the block to ` ```run STEP 4b `, and
**`STEP 4b` is a real section of §1's log** - so the block resolved to a section and
then failed one step later, on contiguity, instead of through the
section-resolution path that the case and the fence-word case both describe. It was
red either way, so nothing complained. A reviewer drove it against `verify`
directly and read the message, which is the only way the difference is visible:

| prefix | sections matched | the refusal that actually fired |
| --- | --- | --- |
| `STEP 4b`, round 1 | 1 of 11 | *"is not a contiguous slice of section \"STEP 4b: G260 - the fallback field placements, and the blocked blocks' text overlaps\""* |
| `SECTION 4 HAS NO SECTION IN THIS LOG`, now | **0 of 11** | *"names section \"SECTION 4 HAS NO SECTION IN THIS LOG\", which matches 0 of the log's 11 headers. It must match exactly one"* |

**`CLAUDE.md`: *"a skipped check must never look like a passing one."* A check that
fires through a different path than the one it names is the near neighbour of
that** - it passes, so nobody looks, and a later reader believes a path is
exercised that is not.

**THE GENERAL LESSON, which is the part a later reader cannot re-derive from the
fix.** `verify` has **five** refusal paths - no section named; a prefix matching
zero or several headers; fewer than two non-blank lines; not a contiguous slice; two
blocks claiming the same slice - **and every one of them produces exactly one
failure.** So `expect(v.failures.length).toBe(1)` asserts only that *something*
broke and cannot tell them apart. This case now asserts on the **message**, and a
precondition in it throws rather than running if that prefix ever stops matching
zero sections - because if it ever collided, the case would quietly go back to
testing contiguity. **§1's and §2's own RED cases were checked against this and
every one of them already asserts on message content**, so §4's was the only one
with the hole.

**Why the guard exists at all, which is the honest version.** The first version of
this subsection stated the count and the `expect()` figure in prose, and **the
figure was already wrong once** - round 0 said five blocks and the sixth was added
in the same round. Prose that names a number is checked by a reader or by nobody.

**THE ARITHMETIC, DECOMPOSED, AND THE FIRST ATTEMPT AT THIS PARAGRAPH GOT IT
WRONG IN THE FLATTERING DIRECTION.** From **43489** `expect()` calls at the branch
base the suite reaches **43513**, and it is two additions and not one:

| term | calls | why |
| --- | --- | --- |
| §4's eight declared blocks | **+8** | one per block, from the by-name `notOutput` loop in the whole-document case |
| the four new §4 cases | **+16** | 1 for the pinned count; 1 + 8 for the fence-word case, whose loop runs once per block; 2 for the NOT-CHECKED-by-line case; 4 for the relabel RED |
| **total** | **+24** | 43489 + 24 = **43513**, and the suite prints 43513 |

**The first version of this table said +8 and asserted that the four new cases
contributed nothing of their own**, which was wrong by sixteen and wrong in the
direction that makes the accounting look tidier than it is. It was caught by
running the suite against the predicted figure - which is the only reason to write
a predicted figure down. The pass count moves from 3785 to **3789**, four new
tests, and the file count stays at **352**.

**WHAT THE GUARD CANNOT SEE, stated rather than left to be discovered.** It sees a
block appearing, vanishing, or being relabelled into the checked namespace. **It
cannot see a §4 block whose CONTENTS were edited after the fact**, because there is
no committed log to compare them with, and nothing in this repository could see
that. §1's blocks have that property and §4's do not; the difference is a property
of where the evidence came from and it does not go away by being described.

**What stood in for it while §4 was written, and it is not a check either.** All
eight blocks were verified to be contiguous, non-overlapping slices of their four
sources - the two run logs, `fixtures.js`, `probe.py` and `autoplace.scm` - by a
scratchpad script that is **not committed**. It earned its keep twice: it caught
the stale header the second transform block carried after its log was re-driven,
and it caught the first version of this round's fixture blocks before they were
declared. **It has no way to run again**, which is the limitation the paragraph
above describes.

**Two blocks are transcriptions of Scheme source and both are declared altered.**
Each line of the two `lepton-src` blocks is prefixed with its line number in
`autoplace.scm`, and that prefix is the only alteration. **The reason is the
contract, not tidiness**: an unchecked block's first non-blank line must not begin
with whitespace, and indented Scheme does. §3 hit the same red on a C comment and
dedented by one space; this section numbers the lines instead, because the stray
`2` in §4.2 is a claim about column 1 and a dedent would have destroyed the
evidence for it.

**None of the four sources shares a line with either committed probe log**,
checked by comparing the 209 distinct non-blank lines of the two logs and the two
fixture files against the 712 of
`tests/schgen/text-metrics/probe-run.log` and `tools/schgen/elk-labels/probe-run.log`
together: zero in common. That matters because a non-`run` block sharing a line
with a checked log is the relabel dodge the checker refuses by name.

§5 A global label's coordinates, and the four freedoms it actually has
----------------------------------------------------------------------

**THE PREMISE THIS SECTION WAS COMMISSIONED TO CORRECT, from the plan and from
the register.** `docs/known-gaps.md` **G262** recorded that *"a global label's
position is a netlist fact"* - KiCad connects it where it is drawn, so moving one
off an overlap changes the circuit - and concluded that *"the free parameter is
its SIDE."* A third-party review of this plan answered that **the label's NAME and
its electrical CONNECTION are netlist facts while its drawing coordinates are
not necessarily fixed by the circuit**, and named four degrees of freedom where
the register had one. **The review is right on all four, and this section is the
measurement rather than the argument.**

**It is also the task three register entries point at**, and the question it
hands back is not the question it was given. The brief expected to find *"no side
assignment clears it"* on the blocked boards, which would have made side
selection insufficient but kept the problem a labelling problem. What the sweep
found instead is that **side selection alone clears five of the twelve blocks
this repository cannot draw**, and that of the five nothing clears, three have
every label problem cleared and refuse on a defect with no label in it.

**EVERY CLEARING COUNT IN THIS SECTION IS A FIGURE AT ONE TEXT BOX, AND IS
MARKED AS SUCH WHERE IT IS STATED RATHER THAN IN A CLOSING CAVEAT.** The four
freedoms existing does not depend on the ruler - §5.3 measures that against
KiCad's own netlister, not against a box. *How many blocks a freedom clears*
does: it is computed with `lib/schgen/render/text-boxes.ts`'s `length x GRID`,
and §1 found 13 of 15 field fallbacks and 4 of 8 drawn-text overlaps surviving
all three of its measured quantities, so **these counts are expected to move
under another one and were not re-taken.** The election between the three is the
owner's (**G265** clause 4) and nothing here makes it. The probe prints the same
qualifier on its own summary (§5.7), so a reader who quotes a number quotes the
sentence that bounds it.

**Everything marked `[RAN]` below comes from one run of
`tools/schgen/label-freedom/probe.ts`**, committed, at repository commit
**`75a9bb8`** with a clean tree, against `kicad-cli` **10.0.5**. That run is
committed beside the probe as `tools/schgen/label-freedom/probe-run.log`, and
`tests/schgen/text-metrics/document-pastes.test.ts` holds every block this
section pastes to it on every `bun test` (§5.12). Unlike §1's probe it needs no
download, no Python and no font blob - only the `kicad-cli` that `make check`
already requires on every run:

```sh
bun run tools/schgen/label-freedom/probe.ts
```

re-drives every figure in this section from a clean checkout, in about thirty
seconds.

### 5.0 Three grades of evidence, kept apart

| grade | what it covers here |
| --- | --- |
| **literature** `[READ]` | three primary sources, fetched and hashed (§5.1): what the field calls a label whose attachment point may move, and what it calls the model this repository implements |
| **driven against KiCad** `[RAN]` | nine fixture schematics exported by `kicad-cli` 10.0.5, with **net identity and net naming read out separately** (§5.2-§5.4) |
| **driven against this generator** `[RAN]` | every declared block's laid-out geometry perturbed and re-graded by `lib/schgen/render/layout-check.ts`'s own `checkLayout` (§5.5-§5.9) |

**The second and third grades answer different questions and must not be
merged.** *"KiCad does not mind"* is a fact about the file format and the
netlister. *"This repository refuses it anyway"* is a fact about `checkLayout`.
§5.9 is where the two come apart, and that gap is this section's most useful
finding.

### 5.1 Step 1: what the literature calls this, and the one word that diagnoses G262

**The problem is NOT boundary labelling, NOT external labelling, and NOT the
one-position-per-side model.** It is **internal labelling of a LINE feature with
a sliding site**, and all three parts of that phrase are the literature's own.

**The sources, fetched 2026-10-22 and pinned by the hash of the file actually
read:**

| source | what it is | pin |
| --- | --- | --- |
| Alexander Wolff, *Automated Label Placement in Theory and Practice*, dissertation, Freie Universität Berlin, disputation 1999, **Chapter 5, "Line Labeling"** (= Wolff, Knipping, van Kreveld, Strijk & Agarwal, *A Simple and Efficient Algorithm for High-Quality Line Labeling*) | 16 pages, `[READ]` in full | `https://webdoc.sub.gwdg.de/ebook/diss/2003/fu-berlin/2002/237/kap5.pdf`, SHA-256 `a71845d734851c696bd400f529d0fbed80e196d3d2cf0eda1349475e7dda29b4` |
| the same dissertation, **Chapter 3, "Point Labeling: Label-Number Maximization"** | `[READ]` for Definitions 3.1 and 3.2 only; the approximation results were not read | `.../237/kap3.pdf`, SHA-256 `01a4ee4047536ac5efdfa197b0b3c3ea10806f0e6f197a3d97a639b65e18dcb6` |
| Bekos, Niedermann & Nöllenburg, *External Labeling Techniques: A Taxonomy and Survey*, CGF 38(3), 2019, arXiv `1902.01454v2` | `[READ]` for §2.1's terminology and §4.1's properties P5-P7; §4's algorithmic results were not re-read here | `https://arxiv.org/pdf/1902.01454v2`, SHA-256 `d33b8472f4ccfb1baac025daa05de1098a7c6a24a31bf70fa67349a3898b3877` |

**Imhof's rules are cited by Chapter 5 and were NOT retrieved** (`[NOT
RETRIEVED]`): `[Imh62]` and `[Imh75]` reach this document only through Wolff's
transcription of them, exactly as they reach
`docs/schematic/text-placement-prior-art.md`.

#### The vocabulary, and the mapping

`[READ]` Bekos et al. §2.1 defines three ways a leader's endpoint inside a
feature may be placed:

> *"If the site σ can be any point of f, then σ is a **free site**. If σ is
> restricted to be any point of a pre-defined curve in f, then σ is a **sliding
> site**. Finally, if σ is restricted to be any point of a finite set of points
> in f, then σ is a **fixed site**."*

and three for the attachment point on the label:

> *"If the port π(ℓ) can be any point on the boundary of ℓ, then π(ℓ) is a
> **sliding port**. If π(ℓ) is restricted to be any point of a finite set of
> points on the boundary of ℓ, then π(ℓ) is a **fixed port**. The most common
> fixed-port model restricts the ports to the corners or midpoints of the edges
> of ℓ."*

With that vocabulary the four freedoms have names, and three of the four are
standard options in a surveyed field:

| this plan's freedom | the literature's name | this repository today |
| --- | --- | --- |
| 1. the label's **orientation** | the **port** - `anchorsToSymbols` offers the four edge midpoints of the label box, which is *"the most common fixed-port model"* | a **fixed port**, chosen by `anchorSide`, never searched |
| 2. **relocating the anchor** along an equivalent connection | a **sliding site** on the net's polyline | a **fixed site**, at whatever point ELK put the net's boundary node |
| 4. **which segment** of the net to attach to | Imhof, relayed by Wolff Ch. 5: *"label a polyline at regular intervals, especially between junctions with other polylines"*, implemented as *"view each river segment as a separate feature"* | one segment, decided by the chain order in `lib/schgen/elk/graph.ts` |
| 3. **adjusting the surrounding wire geometry** | **no counterpart in either source.** In external labelling the illustration is an input and obstacles *"are areas in the image region that cannot be crossed"*; in line labelling the polyline is an input the strip may not intersect | nothing - Task 3 found KiCad has a local wire-gap repair and §3 records that this repository has no perturbation of any kind |

**AND THE ONE SENTENCE THAT DIAGNOSES G262's ERROR IS IN THE SURVEY, two lines
after the definition of a sliding site:**

> *"Note that the site of a point feature is always fixed, in fact the site and
> the feature coincide."*

**G262 treated a global label's feature as a POINT - the anchor - when the
feature is a NET, which is a polyline.** For a point feature the register's
conclusion is exactly right and the literature agrees with it: the site cannot
move, so only the port is free. For a line feature it is wrong, and it is wrong
in the one way that matters, because the site may slide along the whole curve.
**That is the whole of the review's correction, in the field's own terms.**

#### The formulation that fits: line labelling, with hard constraints this repository already enforces

`[READ]` Wolff Ch. 5 labels *"one of the three classes of map objects, namely
polygonal chains, such as rivers or streets"*, and states Imhof's rules as hard
and soft constraints. The hard ones:

> *"(H1) A label must be placed at least at some distance ε from the polyline.
> (H2) The curvature of the curve along which the label is placed is bounded
> from above by the curvature of a circle with radius r. (H3) The label must
> neither intersect itself nor the polyline."*

**H3 is `pultec-hi-boost-own`'s refusal, word for word.** That block refuses
because `label hi_boost_out` *"overlaps wire 33"*, *"wire 51"* and *"wire 57"* -
a label intersecting the polylines of its own drawing. The repository's rule is
the literature's hard constraint, independently arrived at. What differs is the
response: the field's answer is to move the label within the candidate region,
and §4 of this document established that **none of seven comparable tools
refuses to draw** when it cannot.

The candidate region itself is the other half of the formulation:

> *"We propose an algorithm that produces a candidate strip along the input
> polyline. This strip has the same height as the given label, consists of
> rectangular and annular segments, and fulfills the hard constraints."*

**A strip, not a position.** And for freedom 4, Imhof relayed directly:

> *"In his list of guidelines for good line labeling, Imhof also recommends to
> label a polyline at regular intervals, especially between junctions with other
> polylines of the same width and color. River names e.g. tend to change below
> the mouths of large tributaries."*

with the construction that follows it: *"generate a set of the, say ten best
label candidates for each river segment that is limited by tributaries of equal
type. Then we can view each river segment as a separate feature."* **A net's
junctions are its tributaries**, and "which segment of the net carries the label"
is a question the cartographic literature answers by making each inter-junction
segment a feature of its own.

#### The model this repository implements, named

`[READ]` Wolff Ch. 3, Definition 3.2:

> *"In the four-slider model, a point p must be labeled such that any edge of
> the label contains p. In the two-slider model, either the label's top or
> bottom edge has to contain p. In the one-slider or top-slider model, the
> bottom edge of a label must contain p."*

`labelBox` in `lib/schgen/render/text-boxes.ts` puts the anchor at the **centre
of one of the four edges** of the label's outline, and `anchorSide` picks which.
So this repository is a **four-position model** over a **fixed site**; the
four-slider model is the continuous generalisation of its freedom 1 alone, and
the sliding site is a different axis entirely.

#### Whether sliding is exotic: it is not

`[READ]` Bekos et al. §4.1, property P5:

> *"The label positions are either fixed on the contour (P5.1) or they can slide
> along it (P5.2). The former case is more restrictive but also simplifies the
> algorithmic problem in many cases as one degree of freedom is removed."*

and, on why one would pay for it: *"in some situations sliding labels are needed
to compute feasible labelings at all, e.g., when labels of non-uniform size can
be stacked or when leaders are blocked from reaching certain label positions due
to obstacles."* Its Table 1 counts the surveyed works: **P5.1 fixed positions
13, P5.2 sliding positions 13; P6.1 fixed ports 23, P6.2 sliding ports 13.**
Sliding is half the field, not a corner of it.

#### What the earlier prior-art pass did not reach, which is an omission and not a contradiction

`docs/schematic/text-placement-prior-art.md` **never uses the words "global
label", "line feature", "line labeling" or "line labelling"** - a
case-insensitive grep for all four over its 939 lines returns nothing, against a
control term run through the same grep that matches five times (`slider`), so the
grep could have matched and did not. Its §4 reached *"mixed labelling - the formulation that
matches this problem exactly"*, and for the problem that document was about -
a unit's Reference and Value, which are point-feature labels - that is right.
**For a global label it is the wrong family**, because the feature is a line.

**No pointer was added to that document.** The plan says a pointer goes in where
this research CONTRADICTS it, and this does not: it extends it to a text class
that document never considered. Recorded here, and in the register, so that a
reader who goes to the prior-art pass for global labels learns that it does not
cover them.

### 5.2 Step 2: nine fixtures, each its base plus one edit, with the predictions published first

**The repository's own schematics were not touched.** Everything under
`circuits/` is an authored source and the plan's Global Constraints forbid
editing it, so each freedom is driven on a fixture `tools/schgen/label-freedom/
fixtures.ts` builds: two or three `Fixture:R2` symbols, wires, junctions and
global labels, with the symbol embedded in the sheet so no library is resolved.
The nine sheets are committed under `tools/schgen/label-freedom/fixtures/` as
derived artifacts and `tests/schgen/label-freedom/fixtures.test.ts` compares them
to `fixtures.ts` **by content** on every `bun test`.

**Every arm's claim rests on it differing from its base in ONE place, so that is
asserted and not stated.** `[RAN]`, the rendered difference per arm:

```label-run STEP 2 FIXTURES
a1-rotate vs a0-base: 2 differing line(s) - freedom 1: the label's orientation, rotated in place from angle 180 to angle 0
    - (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
    + (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 0) (effects (font (size 1.27 1.27)) (justify left)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
a2-slide vs a0-base: 2 differing line(s) - freedom 2: the anchor slid along the SAME wire segment, from its end (38.1) to its interior (44.45)
    - (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
    + (global_label "SIGNAL" (shape bidirectional) (at 44.45 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
a3-move-segment vs a0-base: 2 differing line(s) - freedom 4: the anchor moved to a DIFFERENT segment of the same net - the interior of R3's vertical stub
    - (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
    + (global_label "SIGNAL" (shape bidirectional) (at 101.6 43.18 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
a4-reroute vs a0-base: 4 differing line(s) - freedom 3: the wire under the label rerouted from one straight segment into a three-segment dogleg; the anchor does not move
    - (wire (pts (xy 38.1 38.1) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "90cfb397-81ed-416d-8deb-b671b0b0da07"))
    + (wire (pts (xy 38.1 38.1) (xy 38.1 30.48)) (stroke (width 0) (type default)) (uuid "90cfb397-81ed-416d-8deb-b671b0b0da07"))
    + (wire (pts (xy 38.1 30.48) (xy 50.8 30.48)) (stroke (width 0) (type default)) (uuid "424b25c4-3fe8-4406-814d-74820ed61334"))
    + (wire (pts (xy 50.8 30.48) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "434b2757-40e8-4599-824d-76150fd614c7"))
a5-rename-wired vs a0-base: 2 differing line(s) - the discriminator's first half: the label RENAMED on a net the wires already hold together
    - (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
    + (global_label "SIGNAL_RENAMED" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
a6-off-wire vs a0-base: 2 differing line(s) - NOT a freedom: the label moved OFF the net entirely, to a point on no wire - the arm a third-party reviewer drove to show the other five are not tautological
    - (global_label "SIGNAL" (shape bidirectional) (at 38.1 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
    + (global_label "SIGNAL" (shape bidirectional) (at 38.1 25.4 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "ae8bad41-f7be-422f-86ed-97137ed3ae31"))
b1-rename-bridge vs b0-base: 2 differing line(s) - THE NEGATIVE CONTROL: one of the two matching labels renamed, on two wire runs that touch nothing else
    - (global_label "BRIDGE" (shape bidirectional) (at 114.3 38.1 0) (effects (font (size 1.27 1.27)) (justify left)) (uuid "0c8deada-2c6f-4768-8a6d-923c06312d4a"))
    + (global_label "BRIDGE_B" (shape bidirectional) (at 114.3 38.1 0) (effects (font (size 1.27 1.27)) (justify left)) (uuid "0c8deada-2c6f-4768-8a6d-923c06312d4a"))
b2-rotate vs b0-base: 2 differing line(s) - freedom 1 on the bridged net: one of the two matching labels rotated in place, its name untouched
    - (global_label "BRIDGE" (shape bidirectional) (at 114.3 38.1 0) (effects (font (size 1.27 1.27)) (justify left)) (uuid "0c8deada-2c6f-4768-8a6d-923c06312d4a"))
    + (global_label "BRIDGE" (shape bidirectional) (at 114.3 38.1 90) (effects (font (size 1.27 1.27)) (justify left)) (uuid "0c8deada-2c6f-4768-8a6d-923c06312d4a"))
```

**And the predictions are printed by the probe BEFORE it exports a single
netlist**, because a figure asserted after the run is unfalsifiable and this
plan has already caught one arithmetic error by publishing a prediction first:

```label-run STEP 2 FIXTURES
PREDICTION a0-base: identity unchanged, naming unchanged
PREDICTION a1-rotate: identity unchanged, naming unchanged
PREDICTION a2-slide: identity unchanged, naming unchanged
PREDICTION a3-move-segment: identity unchanged, naming unchanged
PREDICTION a4-reroute: identity unchanged, naming unchanged
PREDICTION a5-rename-wired: identity unchanged, naming changed
PREDICTION a6-off-wire: identity unchanged, naming changed
PREDICTION b0-base: identity unchanged, naming unchanged
PREDICTION b1-rename-bridge: identity changed, naming changed
PREDICTION b2-rotate: identity unchanged, naming unchanged
```

### 5.3 The four freedoms, measured: identity and naming, separately

**The two properties are read out of one `kicad-cli --format kicadsexpr` export
by `lib/kicad/netlist.ts`'s own `importNetlist`** - no new parser - and compared
apart:

- **IDENTITY** is the partition of connected component terminals, each group
  sorted, the list of groups sorted, **with no net name anywhere in it**.
- **NAMING** is the exported net names, sorted.

`[RAN]`, all nine fixtures:

```label-run STEP 2 ARMS
a0-base
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL
a1-rotate
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL
a2-slide
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL
a3-move-segment
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL
a4-reroute
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL
a5-rename-wired
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   RETURN SIGNAL_RENAMED
a6-off-wire
    IDENTITY {R1.1,R2.1,R3.1} {R1.2,R2.2,R3.2}
    NAMING   Net-(R1-Pad1) RETURN
b0-base
    IDENTITY {R1.1,R2.1} {R1.2} {R2.2}
    NAMING   BRIDGE RET_A RET_B
b1-rename-bridge
    IDENTITY {R1.1} {R1.2} {R2.1} {R2.2}
    NAMING   BRIDGE BRIDGE_B RET_A RET_B
b2-rotate
    IDENTITY {R1.1,R2.1} {R1.2} {R2.2}
    NAMING   BRIDGE RET_A RET_B
```

and the verdicts against the predictions:

```label-run STEP 2 VERDICTS
a1-rotate: identity unchanged (predicted unchanged), naming unchanged (predicted unchanged) - AS PREDICTED
a2-slide: identity unchanged (predicted unchanged), naming unchanged (predicted unchanged) - AS PREDICTED
a3-move-segment: identity unchanged (predicted unchanged), naming unchanged (predicted unchanged) - AS PREDICTED
a4-reroute: identity unchanged (predicted unchanged), naming unchanged (predicted unchanged) - AS PREDICTED
a5-rename-wired: identity unchanged (predicted unchanged), naming changed (predicted changed) - AS PREDICTED
a6-off-wire: identity unchanged (predicted unchanged), naming changed (predicted changed) - AS PREDICTED
b1-rename-bridge: identity changed (predicted changed), naming changed (predicted changed) - AS PREDICTED
    groups GONE from the partition: {R1.1,R2.1}
    groups ARRIVED in the partition: {R1.1} {R2.1}
b2-rotate: identity unchanged (predicted unchanged), naming unchanged (predicted unchanged) - AS PREDICTED
arms whose measured result did not match the prediction published above: 0
```

**AND A SIXTH ARM THAT IS NOT A FREEDOM, which is what makes the four above a
measurement rather than a property of this probe.** `a6-off-wire` moves the
label to a point on **no wire at all**. It is a third-party reviewer's arm,
driven independently by the reviewer and then added here: **without it,
*"identity unchanged"* four times over could be read as the behaviour of an
export that ignores labels.** `[RAN]` it answers differently - identity
unchanged (the three pins are still held together by wires), **naming becomes
`Net-(R1-Pad1)`** - so the export demonstrably carries the attachment, and the
four unchanged results are about the circuit.

**THE VERDICT ON EACH FREEDOM, in KiCad 10.0.5:**

| freedom | arm | identity | naming | verdict |
| --- | --- | --- | --- | --- |
| **1. orientation** | `a1-rotate`, `b2-rotate` | unchanged | unchanged | **EXISTS.** Turning a label in place changes nothing the netlister reports - on a wire-held net and on a label-bridged one alike |
| **2. anchor slid along the same connection** | `a2-slide` | unchanged | unchanged | **EXISTS.** The anchor moved from its wire's END into its INTERIOR and the net is intact: KiCad attaches a global label anywhere on a wire |
| **3. the wire under it rerouted** | `a4-reroute` | unchanged | unchanged | **EXISTS.** One straight segment became a three-segment dogleg under a stationary anchor and the partition did not move |
| **4. a different segment of the same net** | `a3-move-segment` | unchanged | unchanged | **EXISTS.** The anchor moved to the interior of another of the net's stubs, 63.5 mm across the sheet and 5.08 mm down; the net is the same net |
| *(not a freedom)* | `a6-off-wire` | unchanged | **CHANGED to `Net-(R1-Pad1)`** | **The arm that could answer differently, and does.** The reviewer's; see above |

**So G262's *"moving one off an overlap changes the circuit"* is false for all
four**, and `lib/schgen/render/connectivity.ts`'s own header - *"A label anchor
also connects anywhere on a wire's interior"*, marked *"modelled on KiCad 10
(observed on 10.0.5)"* - is now a measurement in the tree rather than a comment.

### 5.4 The negative control, and the discrimination the first version could not make

**A control that cannot tell net identity from net naming would have passed
whichever the arms changed**, which is exactly why the first version of this task
was sent back. So the control is a PAIR of arms that answer differently under the
same edit:

- `a5-rename-wired` renames the label on a net the **wires** hold together.
- `b1-rename-bridge` renames one of two matching labels on **two wire runs that
  touch nothing else** - `BRIDGE` at `(38.1, 38.1)` on R1's stub and `BRIDGE` at
  `(114.3, 38.1)` on R2's, with no wire between them, so the name is the only
  thing making R1.1 and R2.1 one net.

`[RAN]`:

```label-run STEP 2 DISCRIMINATION
a5-rename-wired   : a rename on a WIRE-held net - identity UNCHANGED, naming CHANGED
b1-rename-bridge  : a rename on a LABEL-bridged net - identity CHANGED, naming CHANGED
DISCRIMINATION ESTABLISHED: the same edit - renaming one global label - leaves the partition alone on one fixture and breaks it on the other, so this probe distinguishes net identity from net naming and the negative control could have answered either way.
the bridged group in b0-base: {R1.1,R2.1}
it is GONE from b1-rename-bridge's partition
```

**The control PASSES in the form the brief specifies**: the connection between
the two segments *disappears from the partition* - `{R1.1,R2.1}` is gone and
`{R1.1}` and `{R2.1}` arrive. And the pair establishes the property that makes it
evidence: **the same edit changes identity on one fixture and not on the other**,
so the measurement is of electrical semantics and not of a changed string.

**The review's own sentence is confirmed rather than assumed.** *"Renaming a net
changes a string without necessarily changing the partition of connected pins"* -
`a5-rename-wired` is that case, driven.

### 5.5 Step 3: the population, and a control on re-grading it

**Step 3 does not re-implement an overlap test. It perturbs the laid-out geometry
and hands it to `checkLayout`, the function that refuses the block.** Two things
follow. Every relation the production pass grades is graded - not only box
overlap, which is the subset §1.9 re-took and §1.10 says so. And **an
electrically illegal perturbation cannot silently clear an overlap**, because
`checkWireSafety`, `danglingWireEnds`, `componentProblems` and `anchorProblems`
all run: an anchor moved onto a foreign wire, onto a pin end, onto another anchor
or to a wire crossing is reported as a problem, and a candidate counts as
clearing a block only when the whole list is empty.

**The population is every declared case, not the three the brief named.** Thirteen
cases are offered - the four parity circuits and the nine board declarations -
and between them they cover **all eleven boards under `boards/`**
(`transistor-preamp-lab` and `pt2399-core` arrive through the parity set, and
`opamp-buffer` and `optical-compressor` are not boards). `[RAN]`:

```label-run STEP 3 POPULATION
declared cases offered: 13; blocks with grid-legal geometry: 48; skipped: 12
  NOT MEASURED HERE: opamp-buffer: validateCircuit reports 3 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: optical-compressor: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: optical-compressor/oc-audio: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT MEASURED HERE: optical-compressor/oc-sidechain: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT MEASURED HERE: pt2399-core: validateCircuit reports 18 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: pultec-hi-boost: validateCircuit reports 20 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: pultec-hi-cut: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: pultec-low-boost: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: pultec-low-boost/pultec-low-boost-own: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT MEASURED HERE: pultec-low-cut: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: pultec-mid: validateCircuit reports 28 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT MEASURED HERE: transistor-preamp-feedback/tp-stage: refused before checkLayout, so there is no grid-legal geometry to measure
CONTROL PASSED: over 48 laid-out blocks, re-grading the unperturbed layout with checkLayout reproduces the ELK adapter's own verdict exactly - every problem it reports appears in that block's refusal text, and every block the adapter accepted grades clean.
blocks whose refusal names a global label: 12 of 48
  BLOCKED ON A LABEL transistor-preamp/tp-leg-emitter-bypass
  BLOCKED ON A LABEL transistor-preamp/tp-stage
  BLOCKED ON A LABEL pultec-hi-boost/pultec-hi-boost-own
  BLOCKED ON A LABEL pultec-hi-boost/pultec-hi-boost-junction
  BLOCKED ON A LABEL pultec-hi-cut/pultec-hi-cut-junction
  BLOCKED ON A LABEL pultec-low-boost/pultec-low-boost-junction
  BLOCKED ON A LABEL pultec-low-cut/pultec-low-cut-junction
  BLOCKED ON A LABEL pultec-mid/pultec-mid-junction
  BLOCKED ON A LABEL transistor-preamp-buffered/tp-stage
  BLOCKED ON A LABEL transistor-preamp-loop/tp-follower
  BLOCKED ON A LABEL transistor-preamp-loop/tp-stage
  BLOCKED ON A LABEL transistor-preamp-staged/tp-stage
```

**The control can fail in both directions and is the reason any figure below
means anything**: a block the adapter refused whose re-grade is clean, and a
block the adapter accepted whose re-grade is not, are both reported. It passes
over all 48.

**Twelve blocks, not three.** `G262` measured three blocks over four circuits and
its own 2026-10-21 amendment already warned that *"every"* was false over eleven
boards. The figure with every board declared is **twelve of forty-eight laid-out
blocks refusing on a problem that names a global label**, and five of the twelve
are the same `*-junction` block declared by five Pultec boards.

### 5.5a The same population at BOARD granularity, which no document had stated - and the plan's figure is wrong in both number and unit

**The plan and the register say *"three of eleven boards"* are blocked here. That
figure is `G262`'s BLOCK count wearing the word "boards".** Three blocks is what
`G262` measured, over four circuits, before nine of the eleven boards had an
authoring declaration at all. **Neither the plan, nor the register, nor the first
round of this section ever stated the board figure**, and the direction of the
error matters: *three of eleven* reads as a corner case.

**A third-party reviewer computed it in fix round 1 and got nine of eleven. This
re-derives it rather than relaying it**, and agrees: `[RAN]`

```label-run STEP 3 BOARDS
pt2399-core                  declared by pt2399Core()                1 laid-out block(s); no label-blocked block
pultec-hi-boost              declared by pultecHiBoost()             3 laid-out block(s); LABEL-BLOCKED via pultec-hi-boost-own, pultec-hi-boost-junction
pultec-hi-cut                declared by pultecHiCut()               2 laid-out block(s); LABEL-BLOCKED via pultec-hi-cut-junction
pultec-low-boost             declared by pultecLowBoost()            2 laid-out block(s); LABEL-BLOCKED via pultec-low-boost-junction; ALSO refused before checkLayout: pultec-low-boost/pultec-low-boost-own
pultec-low-cut               declared by pultecLowCut()              3 laid-out block(s); LABEL-BLOCKED via pultec-low-cut-junction
pultec-mid                   declared by pultecMid()                 3 laid-out block(s); LABEL-BLOCKED via pultec-mid-junction
transistor-preamp-buffered   declared by transistorPreampBuffered()  6 laid-out block(s); LABEL-BLOCKED via tp-stage
transistor-preamp-feedback   declared by transistorPreampFeedback()  4 laid-out block(s); no label-blocked block; ALSO refused before checkLayout: transistor-preamp-feedback/tp-stage
transistor-preamp-lab        declared by transistorPreampLab()       7 laid-out block(s); LABEL-BLOCKED via tp-leg-emitter-bypass, tp-stage
transistor-preamp-loop       declared by transistorPreampLoop()      7 laid-out block(s); LABEL-BLOCKED via tp-follower, tp-stage
transistor-preamp-staged     declared by transistorPreampStaged()    8 laid-out block(s); LABEL-BLOCKED via tp-stage
boards under boards/: 11; boards with at least one label-blocked block: 9; boards with none: 2
```

**The mapping is not a name match.** `boardRefs` reads each board's own
`perfboard.json` and `declarationFor` matches on the **builder**, which is the
whole of **G247**: `circuits/transistor-preamp/` holds five board builders and
one declaration, so matching on the circuit directory would report four boards
as declared that nothing declares.

**NINE OF ELEVEN BOARDS have at least one block that refuses on a problem naming
a global label.** The two that do not are `pt2399-core` and
`transistor-preamp-feedback` - and **neither is thereby fine**, which is why the
rows say what else stopped them: `transistor-preamp-feedback`'s `tp-stage` is
refused **before** `checkLayout`, so it never reaches a text pass at all, and
`pultec-low-boost` is counted here through its junction block while its own
block is refused earlier too. `pt2399-core` is the one board whose single
laid-out block carries no label problem.

### 5.6 How wide the candidate set actually is

**G259 carries a pointer saying its four-candidate-over-sides mechanism rests on
the corrected premise, and that with the anchor movable the candidate set *"may
be wider than four and may not be a choice over sides at all."* It is wider.**
Counted over every label anchor of every block that lays out - not only the
blocked ones - as (grid points on the label's own net) × (4 sides):

```label-run STEP 3 CANDIDATE SET
label anchors over 48 laid-out blocks: 95
(anchor points on the label's own net) x (4 sides): min 20 p25 32 median 80 p75 120 max 1000
anchors whose candidate set is LARGER than the four-sides-at-a-fixed-anchor set: 95 of 95; equal to it: 0; smaller: 0
```

**This figure is NOT ruler-dependent**, unlike §5.7's: it counts grid points on
wires, and no text box enters it. **The median global label in this repository
has 80 places it could legally sit, and the narrowest has 20.** Not one of the 95 has as few as four. The set is
counted at grid resolution along the net's own wires, so it is a lower bound on
the sliding site rather than an estimate of it.

### 5.7 Step 3 per freedom, per block: the scoreboard

Four sweeps per blocked block, each re-graded by `checkLayout`:

- **FREEDOM 1** - every assignment of the four sides to every label anchor of the
  block, exhaustively (4ⁿ, largest 4⁶ = 4096).
- **FREEDOM 2** - the anchor slid to every grid point of the segment(s) it is
  already on, side held as laid out.
- **FREEDOM 4** - every grid point of the net's OTHER segments, side held.
- **FREEDOM 3** - the stub the anchor sits at the end of lengthened 1 to 8 grid
  steps, carrying the anchor with it, over all four sides. **Bounded
  deliberately**: "adjust the surrounding geometry" is unbounded in general and
  an unbounded search would be a placement algorithm, which is not this task's
  output.
- plus **FREEDOMS 1+2+4 together** for one label at a time, and a **joint sweep
  over both labels of each label-over-label pair** (widest joint space 32256,
  under the probe's cap of 60000, so no pair verdict is a partial search).

`[RAN]`:

```label-run STEP 3 SUMMARY
block                                       lbl  prob/lbl  F1 block/lbl best  F2best  F4best  F3 block/best  F1+2+4 block/lbl best  PAIR n/block/lbl best
transistor-preamp/tp-leg-emitter-bypass       3     1/1    NO /NO     1       1       2  YES/   0       NO /YES    1          1/NO/YES 1
transistor-preamp/tp-stage                    5     8/8    NO /NO     4       6       5  NO /   5       NO /NO     5          0/NO/NO n/a
pultec-hi-boost/pultec-hi-boost-own           2     3/3    NO /NO     1       3       3  NO /   1       NO /YES    1          0/NO/NO n/a
pultec-hi-boost/pultec-hi-boost-junction      4     3/3    YES/YES    0       2       3  YES/   0       YES/YES    0          1/YES/YES 0
pultec-hi-cut/pultec-hi-cut-junction          4     3/3    YES/YES    0       2       3  YES/   0       YES/YES    0          1/YES/YES 0
pultec-low-boost/pultec-low-boost-junction    4     3/3    YES/YES    0       2       3  YES/   0       YES/YES    0          1/YES/YES 0
pultec-low-cut/pultec-low-cut-junction        4     3/3    YES/YES    0       2       3  YES/   0       YES/YES    0          1/YES/YES 0
pultec-mid/pultec-mid-junction                4     3/3    YES/YES    0       2       3  YES/   0       YES/YES    0          1/YES/YES 0
transistor-preamp-buffered/tp-stage           4     3/2    NO /NO     3       3       2  NO /   3       NO /YES    2          0/NO/NO n/a
transistor-preamp-loop/tp-follower            2     1/1    NO /NO     1       1       2  YES/   0       NO /YES    1          1/NO/YES 1
transistor-preamp-loop/tp-stage               6    21/15   NO /NO    12      10       9  NO /  10       NO /NO     9          0/NO/NO n/a
transistor-preamp-staged/tp-stage             4     3/2    NO /NO     3       3       2  NO /   3       NO /YES    2          0/NO/NO n/a
RULER: every clearing count below is computed with lib/schgen/render/text-boxes.ts's length x GRID estimate, the ruler that produces these refusals. Section 1 measured three text-box quantities and the election between them is the owner's (G265 clause 4); these counts are expected to move under another and were not re-taken.
TOTALS over 12 label-blocked block(s), under that ruler: F1 alone clears 5; F3 alone clears 7; F1+2+4 on one label clears 5; a joint pair move clears 5; some freedom clears 7; NOTHING tried here clears 5
OF THE 5 THAT NOTHING CLEARS: 3 have every LABEL problem cleared by some freedom and refuse on a problem with no label in it (pultec-hi-boost/pultec-hi-boost-own, transistor-preamp-buffered/tp-stage, transistor-preamp-staged/tp-stage); 2 keep at least one label problem under every freedom tried (transistor-preamp/tp-stage, transistor-preamp-loop/tp-stage)
WHAT IS LEFT ONCE RELOCATION HAS CLEARED THE LABEL PROBLEMS, at the fewest-total candidate that clears them: of 5 block(s) where that candidate still refuses, 3 refuse ONLY on "ends at ... touching nothing" - this repository's danglingWireEnds rule, applied to the wire end the anchor left (transistor-preamp/tp-leg-emitter-bypass, pultec-hi-boost/pultec-hi-boost-own, transistor-preamp-loop/tp-follower)
THE SAME COUNT UNDER THE TWO METRICS THAT GOT IT WRONG: best-by-TOTAL gives 2 (transistor-preamp/tp-leg-emitter-bypass, pultec-hi-boost/pultec-hi-boost-own) because on a block whose lowest total is the unperturbed layout the residue is the original overlap; best-by-LABEL-COUNT gives 8 because candidates tie at zero label problems and the first encountered wins, so a relocation that strands a wire end beats an in-place side change that leaves nothing.
EMPTY CANDIDATE SETS, per label anchor, over 46 anchor(s) of the 12 blocked block(s): freedom 2 0, freedom 4 6, freedom 3 0. A per-label sweep over an empty set decides nothing; the block-level verdicts above are not vacuous because every blocked block has at least one anchor with candidates, which the per-block detail prints.
CANDIDATE ANCHOR POINTS on the labels' own nets, summed: own segment 516, other segments 574, over 46 label anchor(s)
```

**THE PER-FREEDOM RESULT THE BRIEF ASKED FOR, and it is not the result the brief
expected.**

**Every number in this table is under the production ruler**, `length x GRID`;
§5.11 and the probe's own `RULER:` line above say what that bounds.

| freedom | blocks it clears entirely, of 12, UNDER THAT RULER | reading |
| --- | --- | --- |
| **1, orientation alone** | **5** | *"No side assignment clears it"* is **FALSE** for five blocks. Side selection alone draws all five Pultec `*-junction` blocks, at `hi_boost_out:down` |
| **2, the anchor slid on its own segment, side held** | **0** | best total never reaches zero; its best figures are 1, 2, 3, 6 and 10. **Every one of the 46 anchors had candidates** |
| **4, another segment of the same net, side held** | **0** | likewise; and on several blocks it makes things worse, because it strands the wire end the anchor left (§5.9). **6 of the 46 anchors had an EMPTY candidate set** - their net has only the one segment - so this row is a sweep over 40 anchors and 6 decisions that were not taken. The block-level verdict is not vacuous: every blocked block has at least one anchor with candidates, which the per-block detail prints |
| **1+2+4 for one label** | **5** | the same five, reached a second way - and it clears every LABEL problem on **five more**: `tp-leg-emitter-bypass`, `pultec-hi-boost-own`, `tp-follower` and both `tp-stage`es of `buffered` and `staged` |
| **3, the stub lengthened 1-8 steps** | **7** | the widest of the four, and the only one that clears `tp-leg-emitter-bypass` and `tp-follower` |
| **any of them** | **7** | five blocks are left |

**Of the five that nothing tried here clears, THREE are not a labelling problem
at all.** `pultec-hi-boost-own`, `transistor-preamp-buffered/tp-stage` and
`transistor-preamp-staged/tp-stage` have every problem that names a global label
cleared by some freedom and still refuse - two of them on *"the glyph of power
symbol GND 0 ... touches the glyph of power symbol VCC 1, which is on another
net"*, which is **G263**'s class and has no text in it, and one on the dangling
end of §5.9. **Only two blocks keep a label problem under every freedom tried**:
`transistor-preamp/tp-stage` and `transistor-preamp-loop/tp-stage`, which are the
two blocks with the most text in the repository (8 and 21 problems).

**So the fixed-anchor framing this task was written around is not supported by
anything measured here.** The brief said only *"nothing clears it"* would justify
it; what was found is that something clears seven of twelve, and three of the
five remainders are blocked elsewhere.

### 5.8 Two blocks in detail, because the scoreboard hides why

#### `tp-leg-emitter-bypass`, the binding constraint on `transistor-preamp-lab`

> **THIS HEADING'S "THE BINDING CONSTRAINT" IS CORRECTED BY §7.2 AND BY
> `docs/known-gaps.md` G274 (2026-10-23, Task 7). IT IS THE FIRST CONSTRAINT, NOT
> THE ONLY ONE.** `tools/schgen/board-sheets.ts` prints **one** blocker per refused
> board because `generate` stops at the first, and **§5.5a's own block four
> subsections above records `transistor-preamp-lab` as `LABEL-BLOCKED via
> tp-leg-emitter-bypass, tp-stage`** - two blocks. So clearing this one does **not**
> produce a sheet for that board; `transistor-preamp/tp-stage` is behind it, and
> §5.7 measures that block as keeping a label problem under **every** freedom swept.
> **Nothing measured in this subsection changes** - the heading's framing does.
> **G262**'s own wording, *"and by nothing else IN FRONT OF IT"*, was precise and is
> what this heading and §5.10's mechanism 2 compressed.

**G262** records this block as the one that refuses `transistor-preamp-lab` *"and
by nothing else in front of it"*. `[RAN]`:

```label-run STEP 3 FREEDOMS
transistor-preamp/tp-leg-emitter-bypass: 1 problem(s), 1 naming a global label; 3 label anchor(s); 12 wire(s)
  PROBLEM label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)
  base sides as laid out: EMITTER:right BYPASS_JUMPED:right BYPASS_CAP:right
  FREEDOM 1 (orientation; side space 4^3 = 64): 64 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 1 at [EMITTER:right BYPASS_JUMPED:right BYPASS_CAP:right]; best label-problem count 1 at [EMITTER:right BYPASS_JUMPED:right BYPASS_CAP:right]; what the best candidate STILL has: label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)
```

**All 64 side assignments leave the overlap in place**, and the best is the one
the layout already has - which is **G262**'s own mechanism, measured, and it does
not work here. What does:

```label-run STEP 3 FREEDOMS
  label BYPASS_CAP at (12.7, 5.08) side right: named in 1 problem(s); own-segment grid points 9, other-segment grid points 1
    FREEDOM 2 (slide on its own segment, side fixed): 9 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 1 at [BYPASS_CAP at (12.7, 5.08) side right]; best label-problem count 1 at [BYPASS_CAP at (12.7, 5.08) side right]; what the best candidate STILL has: label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)
    FREEDOM 4 (another segment of the same net, side fixed): 1 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 2 at [BYPASS_CAP at (2.54, 6.35) side right]; best label-problem count 1 at [BYPASS_CAP at (2.54, 6.35) side right]; what the best candidate STILL has: wire 1 of tp-leg-emitter-bypass (net BYPASS_CAP) ends at (12.7, 5.08) touching nothing; end it on a pin, a label, a power symbol or another wire end ; label BYPASS_CAP at (2.54, 6.35) overlaps pin RV6.1 text
    FREEDOMS 1+2+4 for this label alone: 40 candidate(s); clears the whole block: NO; clears every label problem: YES; best total 1 at [BYPASS_CAP at (2.54, 5.08) side left]; best label-problem count 0 at [BYPASS_CAP at (2.54, 5.08) side left]; what the best candidate STILL has: wire 1 of tp-leg-emitter-bypass (net BYPASS_CAP) ends at (12.7, 5.08) touching nothing; end it on a pin, a label, a power symbol or another wire end
    FREEDOM 3 (its stub lengthened 1-8 steps, every side): 32 candidate(s); clears the whole block: YES; clears every label problem: YES; best total 0 at [BYPASS_CAP stub +2 steps to (15.24, 5.08) side down]; best label-problem count 0 at [BYPASS_CAP stub +2 steps to (15.24, 5.08) side down]
```

**Lengthening `BYPASS_CAP`'s stub by two grid steps and turning its label to
`down` produces a layout `checkLayout` grades with ZERO problems.** 2.54 mm of
wire. **It has not been done** - §5.10 records it as a mechanism and the plan is
research-only - and nothing here says the resulting drawing is acceptable, which
is the owner's judgement and not this document's.

#### `pultec-hi-boost-own`, where the label sits on three wires

```label-run STEP 3 FREEDOMS
pultec-hi-boost/pultec-hi-boost-own: 3 problem(s), 3 naming a global label; 2 label anchor(s); 79 wire(s)
  PROBLEM label hi_boost_out at (34.29, 64.77) overlaps wire 33 of pultec-hi-boost-own (j19_p1)
  PROBLEM label hi_boost_out at (34.29, 64.77) overlaps wire 51 of pultec-hi-boost-own (j8_p1)
  PROBLEM label hi_boost_out at (34.29, 64.77) overlaps wire 57 of pultec-hi-boost-own (j8_p2)
  base sides as laid out: in:left hi_boost_out:right
  FREEDOM 1 (orientation; side space 4^2 = 16): 16 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 1 at [in:left hi_boost_out:down]; best label-problem count 1 at [in:left hi_boost_out:down]; what the best candidate STILL has: label hi_boost_out at (34.29, 64.77) overlaps wire 39 of pultec-hi-boost-own (j20_p1)
```

**This is the H3 case**: a label intersecting the polylines of its own drawing.
Turning it `down` takes it off three wires and onto a fourth, so no side clears
it - and relocating the anchor does:

```label-run STEP 3 FREEDOMS
  label hi_boost_out at (34.29, 64.77) side right: named in 3 problem(s); own-segment grid points 8, other-segment grid points 1
    FREEDOM 2 (slide on its own segment, side fixed): 8 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 3 at [hi_boost_out at (25.4, 64.77) side right]; best label-problem count 2 at [hi_boost_out at (25.4, 64.77) side right]; what the best candidate STILL has: wire 1 of pultec-hi-boost-own (net hi_boost_out) ends at (34.29, 64.77) touching nothing; end it on a pin, a label, a power symbol or another wire end ; label hi_boost_out at (25.4, 64.77) overlaps wire 1 of pultec-hi-boost-own (hi_boost_out) ; label hi_boost_out at (25.4, 64.77) overlaps wire 46 of pultec-hi-boost-own (j20_p3)
    FREEDOM 4 (another segment of the same net, side fixed): 1 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 3 at [hi_boost_out at (25.4, 63.5) side right]; best label-problem count 2 at [hi_boost_out at (25.4, 63.5) side right]; what the best candidate STILL has: wire 1 of pultec-hi-boost-own (net hi_boost_out) ends at (34.29, 64.77) touching nothing; end it on a pin, a label, a power symbol or another wire end ; label hi_boost_out at (25.4, 63.5) overlaps wire 46 of pultec-hi-boost-own (j20_p3) ; label hi_boost_out at (25.4, 63.5) overlaps pin RV_HI_BOOST.3 text
    FREEDOMS 1+2+4 for this label alone: 36 candidate(s); clears the whole block: NO; clears every label problem: YES; best total 1 at [hi_boost_out at (25.4, 64.77) side left]; best label-problem count 0 at [hi_boost_out at (25.4, 64.77) side left]; what the best candidate STILL has: wire 1 of pultec-hi-boost-own (net hi_boost_out) ends at (34.29, 64.77) touching nothing; end it on a pin, a label, a power symbol or another wire end
    FREEDOM 3 (its stub lengthened 1-8 steps, every side): 32 candidate(s); clears the whole block: NO; clears every label problem: NO; best total 1 at [hi_boost_out stub +1 steps to (35.56, 64.77) side down]; best label-problem count 1 at [hi_boost_out stub +1 steps to (35.56, 64.77) side down]; what the best candidate STILL has: label hi_boost_out at (35.56, 64.77) overlaps wire 39 of pultec-hi-boost-own (j20_p1)
```

**Sliding the anchor 8.89 mm along its own wire and turning the label `left`
clears every one of the three overlaps, and leaves exactly one problem, which is
not an overlap at all**: the wire the anchor used to terminate now ends at
`(34.29, 64.77)` touching nothing. §5.9 is about that problem.

### 5.9 What KiCad permits and this generator refuses - the gap, and it is the useful finding

**Freedom 2 and freedom 4 exist in KiCad and are PARTLY unavailable here, for a
reason that is this repository's own.** `[RAN]` §5.3: sliding the anchor into a
wire's interior leaves the netlist untouched. `[RAN]` §5.8: doing the same thing
inside a laid-out block leaves the wire end the anchor vacated with nothing on
it, and `lib/schgen/render/wire-safety.ts`'s `danglingWireEnds` refuses it -
*"wire 1 of pultec-hi-boost-own (net hi_boost_out) ends at (34.29, 64.77)
touching nothing; end it on a pin, a label, a power symbol or another wire
end."*

**Three of the twelve blocked blocks reduce to exactly that one problem**:
`tp-leg-emitter-bypass`, `pultec-hi-boost-own` and `tp-follower`.

**ROUND 1 SAID TWO, AND THE METRIC IS WHY - BOTH THE WRONG ONES ARE STILL
PRINTED.** The count was taken over each label's lowest-TOTAL candidate, and on
`tp-follower` that candidate is the **unperturbed** layout, so the residue
reported was the original overlap rather than anything relocation leaves; a
reviewer found the third block. Switching to the lowest-LABEL-COUNT candidate
over-counts in the other direction and gives **eight**, because candidates tie at
zero label problems, the first encountered wins, and `anchorAndSide` iterates
points before sides - so a relocation that strands a wire end beats an in-place
side change that leaves nothing, sweeping in the five Pultec junction blocks a
side change alone draws cleanly. **The figure above is the tie-free metric**: the
fewest-total candidate among those that clear every label problem. All three
numbers are in the summary, so the two that were wrong stay driven rather than
described.

**KiCad does not share the rule.** A wire end with no label on it is an
unconnected end - an ERC matter, not a different circuit - and §5.3's arms show
the exported partition does not move when an anchor slides. So the obstacle to
freedom 2 here is **a generator rule and not the file format**, which is the
distinction the brief asked for in the words *"which freedoms KiCad permits and
which this generator has merely restricted[...]"* - the elision is marked
because that sentence continues in the brief.

**The rule is not wrong and this section does not say it is.** A wire that goes
nowhere is a drawing defect, and the compatible form of the move is obvious -
retract the wire to wherever the anchor went, which is freedom 2 and freedom 3
applied together. **That combination was not swept**, and it is the single most
likely thing to widen the "some freedom clears it" figure above 7 of 12 - a
figure which, like every clearing count here, is under the production ruler.

**And the four freedoms are restricted upstream of `checkLayout` too, in code
read rather than driven** `[READ]` at this commit:

- `lib/schgen/elk/read-graph.ts:244-272`, `anchorSide`: a label's side is either
  dictated by `negotiablePort`'s single declared side or **read off the direction
  of the last segment of the route that reaches it**. It is never searched. So
  freedom 1's candidate set is built and then discarded, one candidate used.
- `lib/schgen/elk/graph.ts:218-227`, `boundaryNodeOf`: the label's anchor is a
  **zero-size ELK node**, and its position is wherever ELK puts that node. The
  generator does not choose a point on the net; it chooses where to put a node
  and reads the point off the result.
- `lib/schgen/elk/graph.ts:240-252`, `edgesForNet`: *"a net of degree n becomes
  n - 1 edges"*, and the boundary terminal *"goes FIRST when its layer constraint
  is `FIRST_SEPARATE` and LAST otherwise."* **Freedom 4's whole candidate set is
  two positions in a chain**, decided by a layer constraint, out of the n + 1
  insertion points the chain has - and §5.6 measures the geometric consequence:
  a median of 80 legal places where one was used.

### 5.10 Mechanisms this measurement suggests. Every one UNTRIED, none a plan, none a criterion

**`CLAUDE.md`: an agent may never author the acceptance criteria for the artifact
it produces.** Whether any drawing below is a drawing worth having is the owner's
judgement. These are recorded because the plan requires a result that makes
someone want to act to be written down beside the measurement, and because the
plan is research-only and this task made none of them.

1. **UNTRIED.** Search freedom 1 instead of deriving it. 4ⁿ over a block's label
   anchors, graded by `checkLayout`, clears five of the twelve blocked blocks
   outright **under the production ruler** - every Pultec `*-junction`, at
   `hi_boost_out:down`. Cost: 256 `checkLayout` calls on that block. **What it
   would not fix**: the other seven.
2. **UNTRIED.** Lengthen `BYPASS_CAP`'s stub in `tp-leg-emitter-bypass` by two
   grid steps and put its label on `down`: zero problems **under the production
   ruler**, and that block is the only thing refusing `transistor-preamp-lab`. **This is a measurement of one
   block's geometry, not a rule**; nothing here says the same move helps
   elsewhere, and §5.7 shows freedom 3 clearing 7 of 12 and not 12 of 12.

   > **STOP: "the only thing refusing `transistor-preamp-lab`" IS FALSE, AND THIS
   > IS THE LINE AN IMPLEMENTER ACTS ON.** Corrected 2026-10-23 by Task 7; the
   > correction is carried in full at §7.2 point (2) and in `docs/known-gaps.md`
   > **G274** clause 1. **§5.5a's own committed block records that board as
   > `LABEL-BLOCKED via tp-leg-emitter-bypass, tp-stage`** - the board census names
   > one block because `generate` stops at the first, not because there is one.
   > **So this move, which is real and measured, does not buy a sheet**:
   > `transistor-preamp/tp-stage` is behind it and §5.7 measures it as keeping a
   > label problem under every freedom swept. **The two grid steps and the zero
   > problems are untouched** - every figure in this item stands, and what is
   > withdrawn is the clause about what it would unblock.
3. **UNTRIED, and the one most likely to matter.** Sweep freedom 2 **together
   with** the wire retraction it implies, so that moving an anchor off a wire end
   shortens that wire instead of stranding it. §5.9 is the reason: **three**
   blocks reduce to the dangling-end problem alone, and the sweep performed here
   cannot reach the fix because it moves anchors and not wires.
4. **UNTRIED.** The literature's own formulation, for the case where no discrete
   candidate works: a **candidate strip along the net's polyline** (Wolff Ch. 5),
   with each inter-junction segment treated as a feature of its own (Imhof, via
   the same chapter). This is a different shape of answer from a candidate list
   and §5.6's figures are what it would be searching.

**None of these is a criterion.** **G240**'s criterion - the blocks draw and the
sheets are acceptable to the owner - is unchanged, and this section authors no
new one.

### 5.11 What §5 did NOT establish

- **It does not re-take Step 3 under §1's three measured quantities**, and that
  bound is now stated **at every count it applies to** - this section's preamble,
  the probe's own `RULER:` line, §5.7's table, every mechanism in §5.10 and
  **G269** - rather than only here. Every clearing figure in §5.7-§5.10 is under
  the production ruler, `length × GRID`, which is the ruler that produces these
  refusals. The three measured quantities need a 2.9 MB font blob fetched outside
  the repository and KiCad's Python bindings, so a figure taken under them would
  not be re-drivable from a clean checkout - and **the election between the three
  is the owner's, G265 clause 4.** §1.9 found 13 of 15 field fallbacks and 4 of 8
  drawn-text overlaps surviving all three, so a per-freedom verdict is
  **expected** to move under a different ruler and **is not measured here**. A
  candidate that clears by one grid step under this ruler may not clear under
  KiCad's own box. **What does NOT depend on the ruler**: the four freedoms
  themselves (§5.3, measured against the netlister), the 12-of-48 and 9-of-11
  populations (counted from refusal texts the production grader produced), and
  §5.6's candidate-set widths (grid points on wires, no text box in them).
- **It does not exhaust the joint space over more than two labels.** Freedom 1 is
  exhausted over all of a block's labels; freedoms 2, 3 and 4 are swept one label
  at a time, with a joint sweep only over the two labels of a label-over-label
  pair. A clearance needing three labels to move at once would not be seen.
- **It does not sweep a power symbol's orientation or its value's side.**
  **G262**'s other half - `ob-buffer`'s two power values - is untouched, and three
  of the twelve blocked blocks have a power-symbol problem in their list.
- **It does not establish that any candidate it found is LEGIBLE.** `checkLayout`
  grades clearance. A label drawn on the far side of its anchor reads differently,
  which **G262** already records as a legibility judgement rather than a
  geometric one, and that judgement is not made here.
- **It does not test freedom 2 or 4 across SHEETS.** Every arm and every sweep is
  within one sheet. A global label's cross-sheet behaviour - the thing that makes
  it global - is exercised by `lib/schgen/render/cross-sheet.ts` and was not
  perturbed.
- **It does not read Imhof.** `[NOT RETRIEVED]`; the rules reach this document
  through Wolff Ch. 5 only.
- **It does not establish what KiCad's own eeschema does when a label will not
  fit.** §3 read the FIELD autoplacer, `autoplace_fields.cpp`. KiCad has no label
  autoplacer that was found, and whether one exists was not established.

### 5.12 How this section's evidence is checked

**§5's blocks are held to §5's own log by a third call to the same checker**, the
way §2's are held to §2's - `tests/schgen/text-metrics/document-pastes.test.ts`,
on every `bun test`. They are fenced ` ```label-run ` so they stay out of §1's
and §2's output namespaces, and the test maps the fence word, and only the fence
word, before handing §5's slice to `verify` with §5's log.

**The three logs must share no line, and that is asserted rather than hoped.** A
block not declared as a given log's output which shares a line with it is the
relabel dodge `verify-pastes.ts` exists to refuse, so a line common to two logs
would turn the document red at the other log's call. **This cost one rename:**
`laidOutBlocks` is Task 1's, so its `SKIPPED ...` lines were word for word §1's
log's, and §5's probe prints `NOT MEASURED HERE: ...` instead. §2's probe hit the
same wall on its first section header.

**What it does and does not establish** is §1.11's list, unchanged, plus one
thing specific to §5: unlike §1's probe, **§5's can be re-driven** - `kicad-cli`
is the only external dependency and `make check` already requires it - so the
staleness coupling here is weaker than it looks. The document names the commit
the log was taken at and a test requires them to agree; a reader who doubts a
figure can re-run the probe.

**The fixtures are checked separately**, by
`tests/schgen/label-freedom/fixtures.test.ts`: the ten committed `.kicad_sch`
files must be byte-identical to what `fixtures.ts` builds, the directory must
hold exactly those ten, and **each arm must differ from its base in the pinned
number of lines** - which is what makes "this arm varies one freedom" a checked
claim rather than a described one.

**AND ITS "RED" CASE WAS NOT A RED DRIVE UNTIL FIX ROUND 1, which is worth
recording because it is the failure this whole contract exists to refuse.** The
case named *"one digit changed in a committed fixture"* **never called the byte
comparison and never touched a file**: it perturbed a string in memory and
asserted that the perturbed string differed from the original, which is true by
construction. **Weakening the real comparison would have left it green.** The
comparison is now a function of its reader and its lister with four named refusal
paths, and three RED cases hand it a corrupted copy and assert on the refusal
TEXT rather than on a count - because a count establishes only that one of four
paths fired. Driving the first of them caught a wrong line number in this
writer's own expected literal, which is what asserting on the message is for.

---

§6 Typesetting's penalty model, and the one condition its author puts on it
---------------------------------------------------------------------------

**THE QUESTION IS WHETHER THE MODEL TRANSFERS, AND THE ANSWER IS PARTLY - WITH
THE BOUNDARY DRAWN BY THE PAPER ITSELF RATHER THAN BY THIS DOCUMENT.** Knuth and
Plass state the condition under which their algorithm works, in the sentence
that introduces it: the line-breaking problem *"sounds suspiciously like the
infamous bin-packing problem, which is well known to be NP complete"*, and what
rescues it is that *"each line is to consist of contiguous information from the
paragraph"*. **Label placement has no contiguity.** The algorithm therefore does
not transfer, and the authors say why before anyone else has to. What does
transfer is everything the paper says that is not about the search: the
two-grade badness (an outcome may be infinitely bad, or finitely bad and drawn
anyway), the measured gap between first-fit, best-fit and optimum-fit, and the
non-refusal on failure.

**THE PLAN'S OWN PHRASE DID NOT SURVIVE A READING, AND BOTH CORRECTIONS OF IT
ARE INCOMPLETE.** The plan describes this repository as using *"a per-part
first-fit placement search"*. `git grep -i "first.fit"` over `lib/schgen/`
returns nothing (§6.4's control). The correction handed to this task - *"eleven
discrete candidate slots with an area-weighted cost, best-of-N by cost, not
first-fit"* - is also not what the file does. **It is BOTH, on two different
paths, and which path runs is decided by a boolean.** §6.4 reads it line by
line, and §6.5 measures which path actually decides each of **255** unit
placements in this repository: **first-fit decides 202 of them and the cost
decides 53.**

**ROUND 0 OF THIS SECTION MEASURED TEN BLOCKS AND CALLED THEM "EVERY", AND THE
CORRECTION IS LARGE ENOUGH TO BE STATED AT THE TOP RATHER THAN IN A FOOTNOTE.**
The first version of §6.5's probe walked `PARITY_CASES` - four circuits, ten
blocks, 75 unit placements - and published the result as *"every declared ELK
block with a grid-legal layout"*. **That corpus excludes every Pultec board**,
which is the inversion `CLAUDE.md` names in as many words: *"An agent that finds
itself arguing that some output does not matter for the current boards is
reasoning from the wrong end."* §6.5 now walks `ALL_DECLARED_CASES` through the
same population function §5 uses - **48 blocks, 255 unit placements**, with a
control requiring the two sections' block counts to agree. **Every figure round 0
published has been superseded rather than annotated**, and §6.5 says which of its
conclusions survived the widening and which did not. One did not, and it was the
headline.

**AND §6 INVENTS NO COST FUNCTION**, for a reason this section can now state
from a primary source rather than from process. `docs/known-gaps.md` **G71**
records that no published source states an acceptable number of crossings, bends
or wire length, so a threshold in a readability rubric would be *"this project's
invention wearing a citation"*. §6.7 finds the same thing one level deeper:
**the canonical penalty-minimisation paper declares its own cost function
arbitrary.** There is no published cost to adopt. Choosing one is an acceptance
criterion, and `CLAUDE.md` forbids the producing agent from authoring one.

**Everything marked `[RAN]` below comes from one run of
`tools/schgen/field-order/probe.ts`**, committed beside the probe as
`tools/schgen/field-order/probe-run.log`, and
`tests/schgen/text-metrics/document-pastes.test.ts` holds every block this
section pastes to it on every `bun test` (§6.12) by a fourth call to the same
checker. Unlike §1's probe it needs nothing external at all:

```sh
bun run tools/schgen/field-order/probe.ts
```

re-drives every figure in §6.5 from a clean checkout.

### 6.0 Three grades of evidence, kept apart

| grade | what it covers here |
| --- | --- |
| **primary source** `[READ]` | Knuth and Plass 1981, retrieved in full, hashed, and the quoted regions verified against rendered page images rather than against the scan's OCR layer (§6.1) |
| **this repository's source** `[READ]` | `lib/schgen/render/field-placement.ts`, `occupancy.ts`, `text-boxes.ts` and `lib/schgen/readability/measures.ts`, read at commit `3657509` (§6.4, §6.6) |
| **driven here** `[RAN]` | every placement order of 36 blocks and 200 deduplicated orders of 12 more - **48 blocks, every declared ELK block with a grid-legal layout** - with five controls (§6.5) |

**A fourth grade is deliberately absent: nothing here is `[THIRD-PARTY]`.** No
secondary account of Knuth-Plass is relied on, and where this section disagrees
with `docs/schematic/text-placement-prior-art.md` (§6.9) the disagreement is
against that document's own quoted source reading, not against a summary of it.

### 6.1 Step 1: the paper, retrieved in full and pinned

Donald E. Knuth and Michael F. Plass, **Breaking Paragraphs into Lines**,
*Software - Practice and Experience*, Vol. 11, 1119-1184 (1981). Received
25 December 1980, revised 6 February 1981.

| | |
| --- | --- |
| retrieval | `[READ]` - **full text, 66 pages**, 2026-10-22 |
| from | `https://gwern.net/doc/design/typography/tex/1981-knuth.pdf`, HTTP 200, `application/pdf`, 4 828 786 bytes |
| SHA-256 of the file read | `ecc2354ce16693d9152803d56e930fb1b553783eec837a55ab32803ef41d9895` |
| what it is | a **scan** - 66 CCITT-fax page images with an OCR text layer over them |
| SHA-256 of the extracted text | `5e15d58c923d0f6f72ff99dd876603a69f4e4dea24af661896d001eb0b32b7a9` (`pdftotext -layout`) |
| page mapping | journal page *n* is PDF page *n* - 1118; 1119-1184 is 66 pages, which is the page count |

**THE SEVEN BLOCKS BELOW WERE TRANSCRIBED FROM THE RENDERED PAGE IMAGES, NOT
FROM THE OCR LAYER, AND THAT IS NOT A FORMALITY.** The OCR of this scan mangles
exactly the material a reader would most want to quote: page 1121's
`NP complete.3` comes out of `pdftotext` as `NP ~ o m p l e t e . ~`, and
`dynamic programming4,5` as `dynamic p r ~ g r a m m i n g ~ . this~`. A
quotation copied from the text layer would have been silently wrong in its
punctuation and its footnote marks. **Pages 1119, 1121, 1127, 1129, 1149, 1150
and 1162 were opened as images and read**, and every page a quotation anywhere
in §6 comes from is in that list.

**ROUND 0 OF THIS SECTION SAID "EVERY QUOTATION", AND THAT WAS TRUE OF THE SEVEN
BLOCKS AND NOT OF THE SHORT FRAGMENTS QUOTED IN PROSE.** The claim is narrowed
here because it was caught being wrong: §6.3's *"nearly zero when |r_j| is small
but grows rapidly"* was taken from the extracted text, which **drops the
absolute-value bars** because the scan renders them as separate marks, and it
reached round 0 without them. It has been re-checked against the page image and
restored. **Every in-prose fragment in §6 has now been re-read on the image**;
that one was the only casualty, and one more - *"forcibly prevented from
becoming empty"* in §6.8 - was on the right text and the wrong page (1150, not
1162). **The general lesson is the one §1.11 already teaches**: a transcription
route that is right for the material you were careful about is not thereby right
for the material you were not.

**They are transcriptions of a third-party source and are NOT this repository's
probe output**, so §1.11's contract makes each one a block declared NOT CHECKED
by name. §6.12 accounts for them.

```kp-src p.1119 SUMMARY
This paper discusses a new approach to the problem of dividing the text of a
paragraph into lines of approximately equal length. Instead of simply making
decisions one line at a time, the method considers the paragraph as a whole, so
that the final appearance of a given line might be influenced by the text on
succeeding lines.
```

```kp-src p.1121 INTRODUCTION
But how is the computer to solve such a problem efficiently? When a given
paragraph has n optional breakpoints, there are 2^n ways to break it into lines,
and even the fastest conceivable computers could not run through all such
possibilities in a reasonable amount of time. In fact, the job of breaking a
paragraph as nicely as possible into equal-size lines sounds suspiciously like
the infamous bin-packing problem, which is well known to be NP complete.
Fortunately, however, each line is to consist of contiguous information from the
paragraph, so the line-breaking problem is amenable to the techniques of
discrete dynamic programming; this means there is a reasonably efficient way to
attack it.
```

*(The superscript footnote marks 3, 4 and 5 are dropped from the transcription
above; they sit after "NP complete", "programming" and nowhere else, and the
sentence is otherwise verbatim.)*

```kp-src p.1127 BADNESS
Thus, for example, the individual lines of Figure 1 have badness ratings that
are approximately equal to 0, 7, 68, 18, 5, 0, 69, 72, 90, 49, 0, respectively.
Note that a line is considered to be 'infinitely bad' if r_j < -1; this means
that glue will never be shrunk to less than w_i - z_i. However, values of
r_j > 1 are only finitely bad, so they will be permitted if there is no better
alternative.
```

```kp-src p.1127 FIRST-FIT AND BEST-FIT
Once again each line has been broken without looking ahead to the end of the
paragraph and without going back to reconsider previous choices, but this time
each break was chosen so as to minimize the 'badness plus penalty' of that line.
...
The method that produces Figure 1 might be called the 'first-fit' algorithm, and
the corresponding method for Figure 2 might be called the 'best-fit' algorithm.
```

```kp-src p.1129 THE COST FUNCTION
The above formula for delta_j is quite arbitrary, like our formula for beta_j,
but it works well in practice because it has the following desirable properties:
(a) Minimizing the sum of squares of badnesses not only tends to minimize the
maximum badness per line, it also provides secondary optimization; for example,
when one particularly bad line is inevitable, the other line breaks will also be
optimized.
```

```kp-src p.1149 THE SEARCH
The object of the algorithm is to compute the shortest path from the top of
Figure 13 to the bottom, using the demerit numbers as the 'distances'
corresponding to individual parts of the path. In this sense, the job of optimal
line breaking is essentially a special case of the problem of finding shortest
paths in an acyclic network; the line-breaking algorithm is slightly more
complex only because it must construct the network at the same time as it is
finding the shortest path.
Notice that the best-fit algorithm can be described very easily in terms of a
network like Figure 13: it is the algorithm that simply chooses the shortest
continuation at every step.
```

```kp-src p.1162 WHEN NOTHING FITS
When both passes fail, TEX continues by reactivating the node that was most
recently deactivated and treats it as if it were a feasible break leading to b.
...
The net result is to produce an 'overfull box' that sticks out into the right
margin, whenever no feasible sequence of line breaks is possible. As discussed
above, some kind of error indication is necessary, since the user is assumed to
have set rho to a value such that further stretching is intolerable and requires
manual intervention.
```

**ONE TERM IN THE BRIEF IS NOT THE PAPER'S.** The brief and the plan both say
*"total-fit"*. **The paper never uses that phrase.** A case-insensitive search of
the extracted text for `total[ -]fit` returns **0 hits**; `optimum[ -]fit`
returns **27** and `adjustment ratio` returns **26**, so the search can match and
did. Knuth and Plass name three methods and call them **first-fit**, **best-fit**
and **optimum-fit**. "Total fit" is later TeX-community usage. The distinction
matters here only because §6.4 shows this repository implements two of those
three under their own names, and quoting the right names is what makes that
mapping checkable rather than evocative.

### 6.2 The model, in its own terms

Four parts, separable, and the separability is what lets §6.3 answer "partly".

1. **The item algebra.** A paragraph is a sequence of **boxes** (fixed width),
   **glue** (natural width with stretchability and shrinkability) and
   **penalties** (a legal break with a cost). Everything the system can express
   it expresses in these three.
2. **Badness.** Per line, from the **adjustment ratio** `r` - how far the glue
   had to stretch or shrink relative to how far it is allowed to. The badness is
   `100|r|^3`, and it is **infinite when `r < -1`**. Two grades, and the paper
   is explicit about why: a line that cannot be shrunk is refused outright,
   while a line that is too loose is *"only finitely bad, so they will be
   permitted if there is no better alternative"* (§6.1, p.1127).
3. **Demerits.** Per line, `(1 + badness + penalty)^2` plus a flagged-pair term,
   summed over the paragraph. This is the objective.
4. **The search.** Shortest path over an acyclic network of feasible
   breakpoints, built as it is searched. **First-fit** takes the leftmost legal
   branch; **best-fit** *"simply chooses the shortest continuation at every
   step"*; **optimum-fit** minimises the total.

**The demerit tables are the part of the paper that is a measurement rather than
a design**, and they are what §6.5 is modelled on. For one paragraph at one
column width: first fit **26304**, best fit **10491**, optimum fit **7063**. For
the same text at a different width: **13218**, **10143**, **4030**. `[READ]`
p.1129, both tables verified against the page image.

**Those magnitudes do not transfer and are not offered as a target.** They are
in units of a cost function its own author calls arbitrary (§6.7). What
transfers is the SHAPE of the result: deciding each item in order is
measurably worse than optimising the assignment, and the authors establish it by
running the three methods on the same input rather than by arguing it - *"a
single example is not sufficient to decide which method is preferable"*, so they
ran 300 (`[READ]` p.1127).

### 6.3 Step 2: what transfers, and what does not

**The difference is not a detail of the algorithm; it is the hypothesis the
algorithm is built on.** Line breaking optimises over a **sequence**: a break is
a point in a total order, a line is an interval between two of them, and the
cost of an interval depends only on its two endpoints. Label placement optimises
over a **set with pairwise conflicts**: any label may conflict with any other,
there is no order, and the conflict relation is symmetric and arbitrary. That is
the point-feature labelling problem, and
`docs/schematic/text-placement-prior-art.md` already establishes its complexity
from Christensen, Marks & Shieber 1995 read in full - the feasibility question
is NP-complete and *"any complete search algorithm"* for the general case is
NP-hard.

**Knuth and Plass name this same boundary from the other side**, which is the
finding of this step: they identify bin packing as what the problem would be,
and contiguity as the only thing that saves it (§6.1, p.1121). Remove
contiguity and their own sentence says you are back in the NP-complete family.
**So the two literatures agree on where the line is, and the agreement is in the
primary sources rather than in this document's reading of them.**

| part of the model | transfers? | why |
| --- | --- | --- |
| **The shortest-path / dynamic-programming search** | **No** | It requires that an item's cost depend only on an interval of a total order. Field pairs and labels on a sheet have no total order and the conflict relation is not interval-shaped. The paper's own condition (*"each line is to consist of contiguous information"*) is exactly what is absent. |
| **Badness as a continuous quantity instead of a yes/no test** | **Yes, directly** | The paper's own motivation is a quantity *"nearly zero when \|r_j\| is small but grows rapidly"* in place of *"the yes/no tests"*. Overlap area is already such a quantity here, and `occupancy.ts` already computes it. |
| **TWO GRADES of badness - infinite and finite** | **Yes, and it is the part this repository most lacks as a declared thing** | `r < -1` is infinite and refused; `r > 1` is finite and drawn. This repository's placer has the same two grades **implicitly and globally**: every obstacle is infinite until no candidate is clear, at which moment every obstacle becomes finite at once (§6.4). Nothing declares which obstacles may never be overlapped and which may be, at a cost. **What that split should be is an acceptance criterion and is the owner's.** |
| **Penalties attached to a CHOICE rather than to a geometric outcome** | **In principle; nothing here has one** | `penalty` prices hyphenating, breaking at a display, two flagged lines in a row. The analogue would be pricing a slot: an inside slot against an outside one, a left slot against the conventional right. `allCandidates`'s array order is the only preference statement in the repository and `text-placement-prior-art.md` §7 records that it is *"unjustified anywhere"*. |
| **A feasibility THRESHOLD separate from the cost** | **Yes in shape** | TeX's tolerance `rho` decides what is feasible; demerits only rank what is. This repository already separates them, and `field-placement.ts` says so in its own header: *"THE COST RANKS; IT NEVER DECIDES FEASIBILITY."* **This is convergent, not borrowed** - the file cites the labelling literature, not Knuth. |
| **Total-assignment optimisation beating item-at-a-time** | **Yes as an INSIGHT, no as a method** | The insight is that the greedy walk is measurably worse; §6.5 measures that it is, here, by 2 of 15. The method that captures the gain in the paper is dynamic programming, which the row above rules out. The labelling literature's answer to the same insight is annealing, gradient descent or integer programming - and `text-placement-prior-art.md` already carries the empirical comparison. |
| **Non-refusal on failure** | **Yes, and it is already implemented** | §6.8. |
| **The demerit magnitudes** | **No** | Units of an arbitrary function (§6.7). |

**So "does the model transfer" has a three-part answer.** The ALGEBRA (a
continuous cost, two grades of badness, a penalty on a choice, a feasibility
threshold distinct from the ranking) transfers whole. The INSIGHT (greedy is
worse than global, and by how much is a measurable question) transfers, and §6.5
takes the measurement. The ALGORITHM does not transfer, on the authors' own
stated condition. **An answer that stops at "penalty minimisation applies" has
skipped the second and third rows of that table, which are the ones that decide
what anyone could do next.**

### 6.4 What the placer actually does, read rather than inherited

`[READ]` `lib/schgen/render/field-placement.ts` (294 lines),
`lib/schgen/render/occupancy.ts` and `lib/schgen/render/text-boxes.ts`, at commit
`3657509`.

**The control on the plan's phrase, STATED AT HEAD AND NOT AT THE COMMIT THAT
MADE IT TRUE.** `git grep -i "first.fit"`:

| scope | hits | what they are |
| --- | --- | --- |
| `lib/` | **0** | - |
| `tools/schgen/` | **2** | §6.5's own probe and its log, in prediction P2's text |
| `lib` + `tools` + `tests` | **13** | the 2 above, plus **11** in `tools/stripboard/` and `tests/stripboard/` about the pinned VeroRoute fork's `AddComponent` sweep |

**The grep can match and does** - it just never matches the schematic placer,
which has never used the phrase about itself.

**ROUND 0 WROTE THAT `tools/schgen/` RETURNS NOTHING AND THAT THE NON-DOC TREE
RETURNS ELEVEN, AND BOTH WERE TRUE WHEN WRITTEN AND FALSE BY THE TIME THEY WERE
COMMITTED - BECAUSE THIS SECTION'S OWN PROBE WROTE THE PHRASE INTO THE TREE IT
WAS GREPPING.** That is worth a sentence beyond the correction, because it is a
general hazard rather than a slip: **a control whose population includes the
artifact the task is producing is invalidated by producing it.** A reader
re-driving the round-0 figure would have got 2 where 0 was claimed and had no way
to tell a stale figure from a wrong one. Where that cannot be avoided - and here
it cannot, because the probe must be allowed to name the thing it measures - the
figure is taken at HEAD with the self-reference named, which is what the table
above does.

**Here is the search, in order:**

1. **The candidate set** (`allCandidates`): the outside slots on each side **no
   pin leaves**, in the fixed order `right, up, left, down`; then **five inside
   slots** (body centre and the four quarter-centres); then, for each side that
   **does** have pins, **two** slots just beyond its outermost pins. For a
   vertical two-pin passive that is `2 + 5 + 4 = 11`; for a symbol with pins on
   all four sides it is `0 + 5 + 8 = 13`. An inside candidate is then **dropped
   outright** unless both grown text boxes lie strictly within the body.
2. **The feasibility pass** - `cands.find((c) => covered(c).length === 0)`.
   `covered` is a **boolean** predicate over `boxesOverlap` and `segmentHitsBox`,
   and `Array.prototype.find` returns the **first** candidate that satisfies it.
   **This is first-fit in the candidate order, and the cost is not consulted on
   this path at all.** The file says so itself: *"The first clear candidate is
   taken, exactly as before."*
3. **The fallback pass** - `clear ?? chooseLeastCovered(cands, area).candidate`,
   reached only when **no** candidate is clear. `area` is the **weighted overlap
   area** of both grown text boxes against two occupancy sets: weight **1** for
   symbol bodies, graphics and lines, weight **2** (`MARK_WEIGHT`) for anything a
   reader could misread under another string - other text, pin numbers and names,
   labels, power values, and fields already placed. **This is best-of-N by cost.**
4. **The sequential step.** After each unit, `placed.push(...)` adds that unit's
   two text boxes to the obstacle set for **every later unit**. There is no
   backtracking and no reconsideration. The walk order is `scene.placements`.
5. **The record.** A unit placed at step 3 carries a `FieldFallback` naming the
   block, the unit, its lib id, the rounded weighted cost and **every obstacle
   the placed boxes cover**.

**So the one-line answer, in Knuth and Plass's own vocabulary:** it is
**first-fit over candidates on the feasible path, best-fit over candidates on the
infeasible path, and greedy sequential over units at both** - with no
reconsideration at either level, and nothing anywhere that is optimum-fit.
**Recorded as `docs/known-gaps.md` G272**, with §6.5's measurement, because two
committed documents describe it otherwise.

| | the plan's phrase | the correction handed to this task | what the file does |
| --- | --- | --- | --- |
| which search | *"first-fit"* | *"best-of-N by cost, not first-fit"* | **both**, on two paths, selected by a boolean |
| when the cost runs | n/a | implied: always | **only when no candidate is clear** - 53 of 255 unit placements (§6.5) |
| granularity | *"per-part"* | n/a | **per UNIT**; a dual op-amp's two units place independently (`text-placement-prior-art.md` §7(3)) |
| what is placed | implied: a label | n/a | **a rigid two-line block** - Reference and Value at a fixed offset, never placed separately (`text-placement-prior-art.md` §7(7)) |

**Both prior characterisations are partly right and neither is usable as it
stands**, which is why this step exists. The plan's word names the dominant path
and was written against a source that predates the cost (§6.9); the correction
names the path that was added and overstates its reach.

### 6.5 The greedy gap, measured over every declared block `[RAN]`

**Knuth and Plass measured their gap rather than arguing it**, over 300 runs at
300 column widths, and that is the method this step copies - not the algorithm.
`tools/schgen/field-order/probe.ts` permutes `layout.placements` and changes
**nothing else**: geometry, wires and anchors are the pipeline's own. That is the
same soundness argument `tools/schgen/masked-problems.ts`'s `unitSlots` makes for
its one arm, and the probe cross-checks against it.

**ROUND 0 OF THIS SUBSECTION MEASURED THE WRONG POPULATION AND SAMPLED IT
BADLY, AND BOTH DEFECTS ARE SUPERSEDED RATHER THAN ANNOTATED.**

| | round 0 | here |
| --- | --- | --- |
| corpus | `PARITY_CASES` - 4 circuits, **10** blocks, 75 unit placements, **no Pultec board** | `ALL_DECLARED_CASES` through the population function §5 uses - **48** blocks, **255** unit placements |
| orders per block | 30 seeded shuffles plus `reverse`, called "33 arms" | **every** order where `n! <= 5040`; otherwise **200 deduplicated** orders with `n!` printed as the bound |
| what the sample actually was | the LCG's first draw for seeds 1..30 is always about 0.24, so **all thirty made the same first swap**; a two-unit block's thirty shuffles were thirty copies of `reverse` | distinct by construction - the orders are deduplicated by key and the count printed is the count of **distinct** orders |

**The corpus defect is the serious one.** A result published as *"every declared
ELK block"* over a population that contains no Pultec board is the inversion
`CLAUDE.md` names: the boards in `boards/` are the proving ground, and a figure
that silently excludes them is reasoning from the wrong end. **P6 below is the
control that would now catch it** - it requires this run's grid-legal block count
to equal the figure §5 pastes for the same function, and it is in the probe so
that the next widening of the corpus breaks something rather than nothing.

**The predictions are printed by the probe BEFORE it measures anything**, in the
run's own output, so the ordering is a property of the program.
`docs/known-gaps.md` **G271** records why that is required: a prediction that
lives only in a per-task report lives under `.superpowers/`, which is gitignored.
**P1 to P5 were authored at round 0** and are in the history at commit `3657509`,
before this corpus existed; **P6 and P7 are this round's** and were authored
before the widened run. **P1 is restated rather than repeated:** round 0 claimed
it tested that the probe reaches the shipped path, and it cannot - `identity` is
the production order copied into a new array, so what it tests is that
`placeFields` is a pure function of its input and that the probe carries no state
between orders.

```field-order-run PREDICTIONS
  P1 (CONTROL, DETERMINISM - NOT FIDELITY) the identity order reproduces the production order exactly, slot and fallback status, for every unit of every block. It tests that placeFields is a pure function of its input and that this probe carries no state between orders; it CANNOT test that the probe reaches the shipped path, because both arms are the same order. REFUTED BY: any difference, which would mean one of those two things is false.
  P2 at least one block's fallback COUNT differs between the production order and some other order. REFUTED BY: every order of every block agreeing with production, which would mean the sequential dependence costs nothing on this corpus and the first-fit-versus-optimum-fit distinction is academic here.
  P3 for at least one block the MINIMUM fallback count over the driven orders is strictly below production's. REFUTED BY: production already being the order-wise minimum everywhere, which is a stronger result than P2's negation and would say the walk order is already as good as any driven.
  P4 (CONTROL) every unit that masked-problems.ts marks `fallsBackUnconditionally` falls back under EVERY driven order. REFUTED BY: any such unit placing clear under some order, which would mean `unitSlots`'s first-position argument is wrong and G239's Task 22 amendment rests on it.
  P5 (CONTROL) the placed body box of every unit is identical under every driven order. REFUTED BY: any difference, which would mean permuting the placement list moved geometry and not just the walk, so every figure here would be about a drawing nobody produced.
  P6 (CONTROL, CORPUS) this run's grid-legal block count equals the figure section 5 of the research document pastes for the same population function, 48. REFUTED BY: a different count, which would mean two sections of one document measure different corpora while both say 'every declared block' - which is exactly what round 0 of this probe did.
  P7 (CONTROL, NO SILENT TRUNCATION) every block reported EXHAUSTIVE was driven over exactly n! orders, and every block reported BOUNDED was driven over strictly fewer than n! DISTINCT orders. REFUTED BY: any block whose driven count and its bound disagree with its own label, which is the shape round 0 shipped - thirty arms that were not thirty orders.
```

**The corpus, with every block it could not permute named.** `pultec-low-boost`'s
own block and `transistor-preamp-feedback`'s stage refuse before a grid-legal
geometry exists, so there is nothing to permute; the `validateCircuit` lines are
the same gate-1 note §5 and `masked-problems.ts` carry, and the blocks behind
them are measured anyway.

```field-order-run THE CORPUS
declared cases offered to the probe: 13; blocks with grid-legal geometry: 48
  NOT PERMUTED HERE: opamp-buffer: validateCircuit reports 3 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: optical-compressor: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: optical-compressor/oc-audio: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT PERMUTED HERE: optical-compressor/oc-sidechain: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT PERMUTED HERE: pt2399-core: validateCircuit reports 18 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: pultec-hi-boost: validateCircuit reports 20 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: pultec-hi-cut: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: pultec-low-boost: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: pultec-low-boost/pultec-low-boost-own: refused before checkLayout, so there is no grid-legal geometry to measure
  NOT PERMUTED HERE: pultec-low-cut: validateCircuit reports 14 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: pultec-mid: validateCircuit reports 28 problem(s) - its blocks are measured anyway, as masked-problems.ts measures them
  NOT PERMUTED HERE: transistor-preamp-feedback/tp-stage: refused before checkLayout, so there is no grid-legal geometry to measure
```
```field-order-run PER BLOCK
opamp-buffer/ob-buffer: 11 unit(s), BOUNDED 200 of 39916800 order(s), production 2 fallback(s), min 2 max 2 | slot changed for 0, fallback status changed for 0, unconditional 2
optical-compressor/oc-power: 8 unit(s), BOUNDED 200 of 40320 order(s), production 1 fallback(s), min 1 max 1 | slot changed for 0, fallback status changed for 0, unconditional 1
pt2399-core/pt-core: 24 unit(s), BOUNDED 200 of 6.204484017332394e+23 order(s), production 8 fallback(s), min 7 max 8 | slot changed for 3, fallback status changed for 1, unconditional 7
    STATUS MOVERS: C10#1
    SLOT MOVERS: C10#1, C11#1, C9#1
transistor-preamp/tp-leg-upper: 3 unit(s), EXHAUSTIVE 6 of 6 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-leg-feedback: 3 unit(s), EXHAUSTIVE 6 of 6 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-leg-lower-a: 3 unit(s), EXHAUSTIVE 6 of 6 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-leg-lower-b: 3 unit(s), EXHAUSTIVE 6 of 6 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-leg-collector: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-leg-emitter-bypass: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp/tp-stage: 16 unit(s), BOUNDED 200 of 20922789888000 order(s), production 4 fallback(s), min 3 max 5 | slot changed for 5, fallback status changed for 2, unconditional 3
    STATUS MOVERS: C2#1, TP1#1
    SLOT MOVERS: C2#1, C3#1, C4#1, J3#1, TP1#1
pultec-hi-boost/pultec-hi-boost-own: 17 unit(s), BOUNDED 200 of 355687428096000 order(s), production 5 fallback(s), min 5 max 5 | slot changed for 4, fallback status changed for 0, unconditional 5
    SLOT MOVERS: C35#1, C5A2#1, L_HI_BOOST_200MH#1, L_HI_BOOST_300MH#1
pultec-hi-boost/pultec-hi-boost-standin-hi-cut: 4 unit(s), EXHAUSTIVE 24 of 24 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-hi-boost/pultec-hi-boost-junction: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-hi-cut/pultec-hi-cut-own: 13 unit(s), BOUNDED 200 of 6227020800 order(s), production 5 fallback(s), min 5 max 5 | slot changed for 0, fallback status changed for 0, unconditional 5
pultec-hi-cut/pultec-hi-cut-junction: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-low-boost/pultec-low-boost-standin-hi-cut: 4 unit(s), EXHAUSTIVE 24 of 24 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-low-boost/pultec-low-boost-junction: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-low-cut/pultec-low-cut-own: 9 unit(s), BOUNDED 200 of 362880 order(s), production 8 fallback(s), min 8 max 8 | slot changed for 7, fallback status changed for 0, unconditional 8
    SLOT MOVERS: C2#1, C3#1, C4#1, C5#1, C6#1, C7#1, RV_LO_CUT#1
pultec-low-cut/pultec-low-cut-standin-hi-cut: 4 unit(s), EXHAUSTIVE 24 of 24 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-low-cut/pultec-low-cut-junction: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-mid/pultec-mid-own: 28 unit(s), BOUNDED 200 of 3.0488834461171384e+29 order(s), production 8 fallback(s), min 8 max 8 | slot changed for 0, fallback status changed for 0, unconditional 8
pultec-mid/pultec-mid-standin-hi-cut: 4 unit(s), EXHAUSTIVE 24 of 24 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
pultec-mid/pultec-mid-junction: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-leg-feedback: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-leg-base-ground: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-leg-collector: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-leg-emitter-bypass: 1 unit(s), EXHAUSTIVE 1 of 1 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-follower: 6 unit(s), EXHAUSTIVE 720 of 720 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-buffered/tp-stage: 8 unit(s), BOUNDED 200 of 40320 order(s), production 4 fallback(s), min 4 max 4 | slot changed for 0, fallback status changed for 0, unconditional 4
transistor-preamp-feedback/tp-leg-feedback: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-feedback/tp-leg-base-ground: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-feedback/tp-leg-collector: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-feedback/tp-leg-emitter-bypass: 1 unit(s), EXHAUSTIVE 1 of 1 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-leg-feedback: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-leg-base-ground: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-leg-collector: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-leg-emitter-bypass: 1 unit(s), EXHAUSTIVE 1 of 1 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-follower: 6 unit(s), EXHAUSTIVE 720 of 720 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-leg-loop: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-loop/tp-stage: 10 unit(s), BOUNDED 200 of 3628800 order(s), production 2 fallback(s), min 2 max 2 | slot changed for 0, fallback status changed for 0, unconditional 2
transistor-preamp-staged/tp-leg-feedback: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-leg-base-ground: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-leg-collector: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-leg-emitter-bypass: 1 unit(s), EXHAUSTIVE 1 of 1 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-leg-character: 2 unit(s), EXHAUSTIVE 2 of 2 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-follower: 6 unit(s), EXHAUSTIVE 720 of 720 order(s), production 0 fallback(s), min 0 max 0 | slot changed for 0, fallback status changed for 0, unconditional 0
transistor-preamp-staged/tp-second-stage: 11 unit(s), BOUNDED 200 of 39916800 order(s), production 2 fallback(s), min 2 max 2 | slot changed for 2, fallback status changed for 0, unconditional 2
    SLOT MOVERS: R11#1, R8#1
transistor-preamp-staged/tp-stage: 8 unit(s), BOUNDED 200 of 40320 order(s), production 4 fallback(s), min 4 max 4 | slot changed for 0, fallback status changed for 0, unconditional 4
```

**What the fallbacks are drawn over, which round 0 relayed from `masked-problems.ts`
over ten blocks and is now measured over all forty-eight.** The classification is
a whitelist of the obstacle-name prefixes `field-placement.ts` emits, and
**anything matching none of them is printed as UNCLASSIFIED rather than counted
as not-text** - so an empty UNCLASSIFIED list is a check that could have failed.

```field-order-run WHAT THE PRODUCTION
fallbacks covering at least one piece of TEXT: 4
  TEXT: transistor-preamp/tp-stage TP1#1 covers label EMITTER
  TEXT: pultec-low-cut/pultec-low-cut-own RV_LO_CUT#1 covers pin RV_LO_CUT.2 text
  TEXT: transistor-preamp-buffered/tp-stage C2#1 covers label BYPASS_CAP
  TEXT: transistor-preamp-staged/tp-stage C2#1 covers label BYPASS_CAP
cover strings this probe's whitelist does not recognise: 0
```
```field-order-run CONTROLS
  P1 identity reproduces production (determinism, not fidelity): 0 violation(s)
  P4 unconditional units fall back under every order: 0 violation(s)
  P5 geometry is invariant across orders: 0 violation(s)
  P6 grid-legal block count against section 5's committed 48: measured 48
  P7 every EXHAUSTIVE label matches n! and every BOUNDED label is below it: 0 violation(s)
```
```field-order-run VERDICT
  P1 HELD
  P2 HELD - at least one block's fallback count differs between orders
  P3 HELD - at least one block has an order below production's count
  P4 HELD
  P5 HELD
  P6 HELD
  P7 HELD
```
```field-order-run SUMMARY
  48 block(s) measured, 12 not permuted; 36 block(s) driven EXHAUSTIVELY, 12 BOUNDED
  unit placements over the measured blocks: 255
  fallbacks summed over measured blocks: production 53, order-wise best 51, order-wise worst 54
  units whose slot moves under some order: 21
  units whose fallback status moves under some order: 3
  NOTE: the order-wise best is a MEASUREMENT of spread and NOT a target. Nothing here says fewer fallbacks is the objective,
  what a fallback costs, or how many are acceptable - that is the owner's (docs/known-gaps.md G260).
```

**What it establishes.**

- **The sequential dependence is live, not theoretical.** Three units change
  fallback status under some order - `pt2399-core`'s `C10#1`, and
  `transistor-preamp`'s `tp-stage` `C2#1` and `TP1#1` - and **twenty-one change
  which slot they take**. P2 and P3 were the two arms of this that could have
  gone the other way.
- **THE WALK CAN MAKE A BLOCK WORSE, AND ROUND 0 SAID IT COULD NOT.** Summed over
  the measured blocks: production **53**, order-wise best **51**, order-wise
  **worst 54**. `transistor-preamp/tp-stage` runs 3 to 5 around a production
  value of 4. Round 0 wrote *"no arm is worse by count"* on ten blocks and a
  sample whose arms were not distinct; **at the full corpus that is false**, and
  it matters because it is the sentence that made "re-walk and keep the best"
  look free. It is not free: an order chosen without an objective can cost a
  fallback as easily as save one.
- **ALL 53 FALLBACKS ARE ON THE 12 BLOCKS THE PROBE COULD NOT EXHAUST, AND THE 36
  IT COULD EXHAUST HAVE NONE.** This is the limitation to carry away, and it is
  the opposite of what "36 of 48 driven exhaustively" sounds like. The 36 are
  exactly the blocks of 7 units or fewer; every one of them places every field
  clear under **every** order, so their order-invariance is **proven and
  uninformative**. Every figure that moves lives in the 12 larger blocks, where
  200 orders out of between 40 320 and 3.05e29 is a sample. **So the
  order-wise best is EXACT where there is nothing to measure and an UPPER BOUND
  on the minimum everywhere it matters**, and the probe's own summary says so.
- **FOUR fallbacks cover other text, not one.** `transistor-preamp/tp-stage`'s
  `TP1#1` over `label EMITTER`; `pultec-low-cut`'s `RV_LO_CUT#1` over
  `pin RV_LO_CUT.2 text`; and `C2#1` over `label BYPASS_CAP` on **both**
  `transistor-preamp-buffered`'s and `transistor-preamp-staged`'s `tp-stage`.
  **Round 0 said there was exactly one and that it was an artefact of the walk.**
  The count was an artefact of the corpus. Of the four, **one** - `TP1#1` - is a
  status mover and clears under some order; the other three are on blocks with no
  status movers at all and are marked unconditional by `unitSlots`, so **three of
  the four are not reachable by reordering**. Two of those three are on Pultec and
  buffered/staged preamp boards that round 0's corpus did not contain.
- **The first-fit path decides four placements in five.** 255 unit placements over
  the 48 measured blocks, of which **53** reach the cost and **202** are settled
  by the first clear candidate. That is the arithmetic behind §6.4's table row.
- **No block's unconditional set was ever contradicted.** P4 drives
  `unitSlots`'s *"first position is the most permissive the search can be"*
  argument against every order this probe ran rather than against one, over 48
  blocks. **G239**'s Task 22 amendment rests on that argument.

**Five controls, each able to fail, and three of them cross-check figures other
documents rest on.** P1 would expose a `placeFields` that is not a pure function
of its input, or a probe carrying state between orders. P4 is G239's argument,
re-driven. P5 would expose a permutation that moved geometry. **P6 would expose
exactly the defect round 0 shipped** - it compares this run's block count against
§5's committed 48 for the same population function. **P7 refuses silent
truncation**: a block labelled EXHAUSTIVE must have been driven over exactly `n!`
orders and a block labelled BOUNDED over strictly fewer **distinct** orders, so
the label and the count cannot drift apart the way round 0's thirty arms drifted
from thirty orders.

**WHAT IT DOES NOT ESTABLISH, stated here rather than left to §6.10.** The 12
blocks where every moving figure lives are **sampled**, so `51` is an upper bound
on the achievable minimum and not an optimum. And nothing here says 51 is better
than 53: that needs somebody to have said what a fallback costs, which **G260**
records nobody has - and the order-wise worst of 54 is the reason that is not a
formality.

### 6.6 Step 3: the measures this repository has, verified against the tree

The brief states that four readability measures exist for wires and none for
text. **Verified, and it is stronger than stated.**

`[READ]` `lib/schgen/readability/measures.ts` and
`lib/schgen/readability/baseline-model.ts` at `3657509`:

- `SchematicMeasures` has **five** numeric fields - `bends`, `bendsPerEdge`,
  `crossings`, `wireLength`, `occupiedArea`. `MEASURE_KEYS` lists the same five.
  The module header calls them *"SPEC §3.3's FOUR MEASURES"* and separately says
  `renderMeasures` *"emits exactly five numbers"*, so "four measures, five
  numbers" is the tree's own accounting and not a discrepancy.
- **All five are computed by one function over wires.** `measuresOfWires(wires,
  extent, inter)`: bends and the edge denominator from the wire graph, crossings
  from `crossings(t)`, `wireLength` from the wires, `occupiedArea` from `extent`.
- **Text enters exactly one of the five, and only as a point with no extent.** In
  `measuresOf` (per block) the extent is wire ends plus pin positions, and text
  does not appear at all. In `sheetMeasuresOf` the extent additionally includes
  `d.labels.map((l) => l.at)` and `d.texts.map((x) => x.at)` - **anchor
  coordinates**. A label's or a text's own box is never built, so a string's
  length, its height and everything it overlaps are invisible to every one of the
  five.

**A check that could have failed, with a control that answers differently.**
Eight identifiers that any text-aware measure would have to reach - `textBox`,
`labelBox`, `FieldFallback`, `placeFields`, `blockFields`, `textWidth`,
`fieldsWidth`, `drawnText` - greped over `lib/schgen/readability/` and over
`lib/schgen/render/`:

| identifier | files under `readability/` | files under `render/` |
| --- | --- | --- |
| `textBox` | 0 | 6 |
| `labelBox` | 0 | 10 |
| `FieldFallback` | 0 | 6 |
| `placeFields` | 0 | 7 |
| `blockFields` | 0 | 3 |
| `textWidth` | 0 | 6 |
| `fieldsWidth` | 0 | 4 |
| `drawnText` | 0 | 1 |

**Every pattern matches somewhere and none matches in the readability tree.**

**The one numeric quantity about text that DOES exist is not a measure and says
so.** `FieldFallback.cost` is the weighted overlap area a fallback accepted, and
its own documentation states it is *"[c]omparable only within one run of one
placer"*. It is a ranking key for `chooseLeastCovered`, published in
`RENDER-REPORT.md` so a degradation is visible, and explicitly not a figure that
can be compared across drawings. **So the brief's "none for text" is correct for
measures and the nuance is worth carrying: there is a per-unit text cost, it is
reported, and it is declared non-comparable.**

### 6.7 What the literature's costs ARE, and whether this repository could measure them

**This section names no cost function and chooses none.** G71 is why that is not
mere process, and §6.1's p.1129 transcription is why it is not even available.

| cost | source and retrieval | what it needs | could this repository measure it today? |
| --- | --- | --- | --- |
| **Badness** `100\|r\|^3`, infinite below `r = -1` | `[READ]` Knuth-Plass p.1127 | an **elasticity model**: per item, a natural size plus how far it may stretch and shrink, so that `r` is defined | **No.** A candidate slot here is a discrete position, not an elastic one. §5 established that a global label has four degrees of freedom, which is the precondition for ever declaring an elasticity; nothing declares one. |
| **Demerits** `(1 + badness + penalty)^2 + alpha` | `[READ]` Knuth-Plass p.1129 | a penalty per **choice**, and a pair term for two consecutive flagged choices | **No.** Nothing in the repository prices a choice. `allCandidates`'s array order is the only preference statement and is unjustified. |
| **Weighted overlap area** | `[READ]` this tree, `occupancy.ts`; shape attributed there to Christensen, Marks & Shieber 1995 after Yoeli 1972 | an obstacle set and a weighting | **Yes - it already does**, per candidate and per fallback. Declared non-comparable across runs (§6.6). |
| **Count / fraction of labels placed without overplot** | `[PAPER-FULL]` via `text-placement-prior-art.md` §6, Christensen et al.'s own metric | geometry alone | **Yes, today, with no new machinery.** `FieldFallback` gives the count directly: **53 of 255 unit placements** on this corpus (§6.5). Nothing aggregates or publishes it as a measure. |
| **Yoeli's three-term objective** - overlap amount + position-preference penalty + unlabelled count | `[PAPER-FULL]` for the shape as restated by Christensen et al.; **Yoeli 1972 `[NOT RETRIEVED]`** and not retrieved by this task either | the three terms, plus **weights** | **The first and third terms, yes. The middle term and all three weights, no** - the weights are not in the restatement and the original was not read. |
| **Human task performance** - response time and error rate on label-to-feature association | `[PAPER-FULL]` for the survey's statement, `[PAPER-ABS]` for the studies | people | **No**, and no source found gives a geometric proxy for it. |

**AND HERE IS THE FINDING THAT CHANGES WHAT G71 MEANS.** G71 records that no
published source states an acceptable threshold, so inventing one would be *"this
project's invention wearing a citation"*. §6.1's p.1129 transcription says
something one level stronger about the most-cited penalty model there is:

> *"The above formula for delta_j is quite arbitrary, like our formula for
> beta_j, but it works well in practice..."*

**Both of the paper's formulae - the badness and the demerits - are declared
arbitrary by their authors, and justified by practice rather than by derivation.**
And the paper states the cost of tuning them: *"So many parameters are present,
it is impossible for anyone actually to experiment with a large fraction of the
possibilities"* (`[READ]` p.1162, verified against the page image).

So **"adopt the literature's cost function" is not a move that exists.** The
literature supplies a SHAPE (a continuous cost, squared so one bad item does not
hide behind many mediocre ones, with an infinite grade for the inadmissible) and
an honest statement that the coefficients were chosen. Importing the shape is
importing a shape; importing the numbers would be importing somebody else's
tuning for somebody else's problem while appearing to cite it. **That is G71's
failure mode with the citation's own consent, which is worse rather than better.**

**The criterion/mechanism split G71 draws therefore survives contact with the
best primary source available**, and this section adds nothing to it except
evidence - which is recorded as an extension to **G71** itself rather than as a
parallel entry. Choosing what to minimise remains an acceptance criterion for an
artifact this repository's agents produce; `CLAUDE.md` forbids the producing
agent from authoring one; nobody has been asked.

### 6.8 TeX is the eighth tool, and it does not refuse either

§4's `TOOL BEHAVIOUR TABLE` found that **of seven tools examined, none refuses to
draw because text will not fit**. Knuth and Plass describe TeX's behaviour when
no feasible sequence of breaks exists, and it is the same answer:

- the active list is *"forcibly prevented from becoming empty by simply declaring
  a breakpoint to be feasible if it would otherwise leave the active list
  empty"* - `[READ]` **p.1150**;
- *"This results in an overset line and an error message that encourages the user
  to take corrective action"* - `[READ]` **p.1150**, the next sentence;
- and at the level of the implementation, the same thing: the result is an
  **overfull box** that *"sticks out into the right margin"*, because *"some kind
  of error indication is necessary"* - `[READ]` **p.1162**.

Each verified against its own rendered page image. **ROUND 0 PUT THE FIRST OF
THESE ON p.1162**, where the other two are; it is on p.1150, in the paragraph
that introduces the behaviour the p.1162 code implements. A mis-citation rather
than a fabrication, and corrected here because **in a subsection whose
quotations are its entire evidence, a page number that does not resolve costs
more than it looks**: a reader who turns to 1162 and cannot find the words has no
way to tell a wrong page from a wrong quotation. §6.1's pages-read list now
carries 1150.

**This is TeX's behaviour as the 1981 paper describes it**; `tex.web` was not
retrieved and this task did not read it (§6.10).

**Zero of eight.** And the shape is not merely similar to what this repository
now does - it is the same two-part answer: **place it anyway, and make the
degradation loud.** `field-placement.ts` takes the least-covered candidate and
returns a `FieldFallback`; `report.ts` prints them in `RENDER-REPORT.md` under
*"Field placements the placer could not keep clear"* with the sentence *"a sheet
with a row here is not a clean sheet"*.

**The difference is in the loudness, and it is G260's open residual.** TeX's
overfull box is an error on the user's terminal on the run that produced it. This
repository's fallback is a table in a generated report that **nothing automated
reads** - no gate refuses on a count and none exists. A generation that goes from
0 fallbacks to 50 is green. That is recorded, open, and awaiting the owner's
number; §6 adds only that the tool this behaviour was borrowed from pairs it with
a diagnostic the user cannot miss.

### 6.9 A correction to `text-placement-prior-art.md` §7, recorded here because that document is read and never rewritten

**Recorded in the register as `docs/known-gaps.md` G273**, because a reader who
opens only that document will never reach this paragraph.

`docs/schematic/text-placement-prior-art.md` §7 reads `field-placement.ts` at
commit `8e601b4` and tabulates it against the standard formulation. **Four of its
rows are stale at HEAD, and the reason is chronology rather than error.** That
document was committed at `d02ad3d`; the placer's behaviour changed at `46fe129`
(*"The field placer stops refusing and starts choosing"*), which is **not an
ancestor of `d02ad3d`** - verified with `git merge-base --is-ancestor`. The
document was right about the tree it read.

| §7 row | what it says | what HEAD does |
| --- | --- | --- |
| search | *"greedy sequential first-fit, no backtracking, no fallback"* | greedy sequential, no backtracking, **and a least-covered fallback** |
| objective | *"none - a boolean per candidate"* | boolean on the feasible path, **weighted overlap area on the infeasible one** |
| on failure | *"refuse to produce the drawing"* | **place at the least-covered candidate and record a `FieldFallback`** |
| reported quantity | *"first blocked unit's first candidate's first blocker"* | **one `FieldFallback` per unit**, with its cost and everything it covers |

**Its §8 predicted this**, and that is worth recording as a thing that came
true: it found `tools/guide/placement.ts` already shipping *"[a] scored,
weighted, preference-ordered text placer with a least-cost fallback"* and named
it as what the schematic placer lacked. Task 24 imported that module rather than
writing a second weighting (**G261**). *(Round 0 of this subsection quoted that
sentence with "weighted," and "text" dropped and no elision marked. Corrected,
and said rather than silently fixed: **the exact-quotation standard does not
relax for this repository's own prose**, and a quotation of in-repo text is
easier to check than any other kind, so getting one wrong is worse.)*

**Its §7(1) sequential-dependence finding is NOT stale and is now measured.** It
argued that *"a unit can be unplaceable because of where an EARLIER unit's text
went, and nothing ever reconsiders the earlier choice"*, and marked it as the
structural fact that most changes how this should be approached. §6.5 is the
measurement of it: **three units change fallback status and twenty-one change
slot under permutation, over 255 unit placements on 48 blocks.**

**One row of §7 becomes MORE right rather than less.** Its last paragraph says
*"A first-fit search over eleven candidates with no cost function and no fallback
is the one combination the literature does not contain"*. The combination no
longer exists in this tree; what replaced it is a combination the literature does
contain, which is the change that paragraph was arguing for.

### 6.10 What §6 did NOT establish

- **It did not read `tex.web` or TeX82.** §6.8's account of TeX's failure
  behaviour is the 1981 paper's description of a system the same authors wrote,
  which is a primary source about the algorithm and a second-hand source about
  the shipped program. The paper itself notes that *"the algorithm in TEX is even
  more complex than the one we have described"*.
- **It did not retrieve Yoeli 1972, Imhof, or Zoraster.** Their objectives reach
  this document through `text-placement-prior-art.md`'s reading of Christensen,
  Marks & Shieber, exactly as that document marks them. `[NOT RETRIEVED]` here
  too.
- **It did not read Knuth-Plass's appendix or its history section in detail.**
  The appendix's simplified algorithm and the paper's history of line-breaking
  methods were skimmed in the extracted text and are not relied on anywhere
  above.
- **It did not establish that fewer fallbacks is better.** §6.5 measures a
  spread. Whether 51 is preferable to 53, and by how much, needs the owner's
  statement of what a fallback costs - **G260**, open. The order-wise **worst**
  of 54 is why that is not a formality.
- **IT DID NOT SWEEP THE PERMUTATION SPACE WHERE THE SPACE MATTERS.** 36 of the
  48 blocks were driven over every order and **all 36 have zero fallbacks**, so
  their exhaustiveness proves order-invariance on blocks that had nothing to
  move. All 53 fallbacks live on the 12 blocks of 8 units or more, and those were
  driven over 200 deduplicated orders out of between 40 320 and 3.05e29.
  **`51` is an upper bound on the achievable minimum, not an optimum**, and the
  probe's own summary carries that sentence so a reader who quotes the number
  quotes the bound with it.
- **It did not measure global labels or power values.** `placeFields` places unit
  Reference/Value pairs only. §5 is the section about label coordinates, and
  nothing in §6 re-measures or contradicts it.
- **It did not re-take any count under another text box.** §6.5's fallback counts
  are at the production ruler, `length x GRID` (`text-boxes.ts`), and §1 found 13
  of 15 field fallbacks surviving all three of its measured quantities - **at the
  ten-block corpus; §1's ratio has not been re-taken over the 48.** **The
  election among the three is the owner's (G265 clause 4) and nothing here makes
  it.**
- **IT DID NOT RE-DRIVE ROUND 0's FIGURES; IT REPLACED THEM.** Every quantity
  §6.5 published at the ten-block corpus is superseded, not annotated, and the
  table at the head of §6.5 names both populations so nobody has to guess which
  corpus a figure in an earlier draft belonged to. One round-0 conclusion was
  **falsified** by the widening - *"no arm is worse by count"* - and one was
  **narrowed from a finding to a quarter of one**: the single text-over-text
  overlap turned out to be four, of which one and not all is reachable by
  reordering.
- **It did not establish that `occupiedArea` ought to include text.** It records
  that it does not, and that a text's anchor point reaches it while its box never
  does.

### 6.11 Mechanisms this reading suggests. Every one UNTRIED, none a plan, none a criterion

**Each needs a decision that is not an agent's**, and that is stated per
mechanism rather than once at the end.

1. **Publish the conflict count as a measure.** Christensen et al.'s standard
   metric - the fraction of items placed without overplot - is computable here
   today from `FieldFallback` with no new geometry. **UNTRIED.** It would be the
   first number about text in a repository that has five about wires. It is a
   MEASURE and not a gate: **no threshold may accompany it** without the owner
   (G71, G260).
2. **Declare the two grades of badness instead of inferring them.** Knuth-Plass
   has an explicit infinite grade (`r < -1`) and an explicit finite one. This
   placer's grades are implicit and global - everything is infinite until nothing
   is clear, then everything is finite. A declared split would say which
   obstacles may never be overlapped and which may be at a cost. **UNTRIED, and
   the split itself is an acceptance criterion**, so it is the owner's and not a
   mechanism an agent may choose.
3. **Re-walk under a bounded set of orders and keep the best.** §6.5 measures
   that the spread is **53 production, 51 best, 54 worst** over 48 blocks.
   **UNTRIED as a change to anything, and WEAKER than round 0 of this list made
   it sound.** Round 0 said no order is worse by count; at the full corpus an
   order can be, so "keep the best" is not a free improvement but a choice that
   needs an objective to be best by - which is item 1's problem - and the gain it
   could capture is 2 placements in 255. The probe's own output says the
   order-wise best is a measurement and not a target, and an upper bound rather
   than an optimum on every block where anything moves.
4. **Price the candidate order.** The preference order is an array literal and
   nothing justifies it. The literature's analogue (Imhof/Yoeli position
   preference) is cited in `text-placement-prior-art.md` but its weights were
   never published and Yoeli was never retrieved. **UNTRIED**, and a weighting
   invented here would be G71's failure exactly.
5. **Make a fallback as loud as an overfull box.** TeX errors on the run that
   produced it; this repository writes a report line nothing reads. **UNTRIED**,
   and it is **G260**'s open residual verbatim, waiting on the owner's number -
   not a new proposal.

**None of these is proposed. They are what a later reader would otherwise
re-derive**, and the register requires that to be written down rather than
re-discovered. Items 1, 2 and 3 are carried in **G272**; item 5 is **G260**'s
residual verbatim and is not restated there.

**Where §6's findings live in the register:** **G272** (what the placer is, and
the walk-order measurement), **G273** (`text-placement-prior-art.md` §7's four
stale rows), an extension to **G71** (the literature's cost function is declared
arbitrary by its own authors), and an amendment to **G260** (TeX is the eighth
tool that does not refuse, and the difference is the loudness, which is that
entry's own open residual).

### 6.12 How this section's evidence is checked

**§6's seven pasted probe blocks are held to §6's own log by a FOURTH call to the
same checker**, the way §2's and §5's are - `tests/schgen/text-metrics/document-pastes.test.ts`,
on every `bun test`. The blocks are fenced ` ```field-order-run ` so they stay out
of §1's, §2's and §5's output namespaces, and the test maps that fence word, and
only that fence word, before handing §6's slice to `verify` with
`tools/schgen/field-order/probe-run.log` and that log's own run marker.

**ONE OF THIS SECTION'S OWN NEW ASSERTIONS COULD NOT FAIL, IN THE FILE THAT
EXISTS TO REFUSE EXACTLY THAT, AND IT RAN SEVEN TIMES.** Round 0 asserted, for
each `kp-src` block, that its fence word was not one of the four checked
namespaces - over a list that had already been **filtered to `kp-src`**, so the
test was `"kp-src" is not in [...]` seven times over. It has been replaced by a
comparison that can fail: the fence words of **every** block in §6's slice are
tallied and the tally is compared against a pinned map, so a block appearing,
vanishing, or being relabelled into a checked namespace all show up as a tally
mismatch naming the word. **The round-0 form is the exact failure §1.11's version
2 records** - a rule that is strictly stronger in general and vacuous on the
population it is actually applied to.

**The seven `kp-src` blocks are NOT checked against anything and are declared by
name.** They are transcriptions of a 1981 scan, so there is no log they could be
a slice of; `verify` reports each as NOT CHECKED with its line number, and the
independent re-derivation in the test must agree entry for entry. **What a reader
should know about them is §6.1's paragraph on the OCR**: they were transcribed
from rendered page images because this scan's text layer corrupts exactly the
punctuation and footnote marks a quotation turns on. A reader who wants to check
one needs the PDF at the hash §6.1 pins and the page number each block carries.

**APPENDING §6 PUT BLOCKS INSIDE §5's SLICE, and that was checked rather than
assumed.** §5's slice runs from its heading to the end of the file - the exact
trap §4 hit when §5 was appended, and which §4's slice now refuses by requiring
§5's heading as an upper bound. §5's case survives because it counts
` ```label-run ` fences specifically rather than all fences, so §6's blocks are
invisible to it; they appear in §5's `verify` call as NOT CHECKED, which is what
`verified + notOutput + failures = blocks` already accounts for. **§6 adds no
upper bound to §5's slice**, because doing so would be an edit to a closed
section's guard; the property §6 relies on is §5's fence-word specificity, and
the test now states that dependence where a reader of §5 will see it.

**What this does NOT establish** is §1.11's list unchanged, plus one thing
specific to §6: **§6's log is not coupled to a commit.** §1's is, because its
probe cannot be re-driven without `kicad-cli`, KiCad's Python bindings and an
external font blob. §6's probe needs **nothing external** - one `bun run` from a
clean checkout re-drives every figure in §6.5 - so a reader who doubts a number
re-takes it rather than trusting a pin. That is a deliberate difference and not
an omission.

---

§7 The solution space, and what it costs
----------------------------------------

**THIS SECTION IS NOT A DESIGN AND DOES NOT END IN A RECOMMENDATION.** The plan's
own self-review says why, and it is the reason the plan has seven research tasks
and no eighth: *"The register already records that this repository has twice
accepted a tool's demand and argued about how to satisfy it rather than asking
whether the demand was right"* - *"the BOM gate and the long Value label, both
caught by the owner"* - and **"A plan that ended in an implementation task would
be the third."** (The quotation is split at the plan's own em dash, which this
document does not use anywhere else; nothing is elided.) §7.5 names what the owner
would have to decide before any row of the table below could be built, and stops
there.

**WHAT IT IS.** One row per approach the six preceding sections found, with what
it would fix among the eleven boards' real blockers, what it would not, what it
depends on, where the evidence is, and **how good that evidence is**. The last of
those is the column that matters and §7.0 says why it is not this writer's to
change.

**ALMOST EVERY FIGURE HERE IS `[RELAYED]` FROM AN EARLIER SECTION AND SAYS SO.**
§7 re-measured nothing that an earlier section measured; it drove one thing of
its own, the board census in §7.2, and that is marked `[RAN, CONFIRMED]`. **A
figure with no mark in this section is relayed from the subsection cited beside
it**, where its control and its retrieval mark live.

### 7.0 How this section grades its own evidence, and why the levels are not this writer's

**THE THREE LEVELS COME FROM A THIRD-PARTY REVIEW OF THE PLAN (2026-10-22) AND
ARE RECORDED ACCEPTED THERE.** `CLAUDE.md` forbids the producing agent from
authoring the acceptance criteria for its own artifact, so re-grading them,
merging two, or adding a fourth to fit what was found would be exactly that.
They are reproduced from the plan verbatim:

1. **ESTABLISHED ELSEWHERE** - *"the capability demonstrably works in its
   original system. Evidence: source read, or paper read."*
2. **DEMONSTRATED HERE** - *"it was run against this repository's own inputs and
   the result observed."*
3. **INTEGRATION HYPOTHESIS** - *"untested here."*

**THE REVIEW'S POINT, WHICH IS WHAT THE COLUMN IS FOR:** that KiCad's autoplacer
exists, that ELK exposes label options, and that published algorithms solve
certain formulations are **three facts that prove nothing about whether any of
them solves this repository's problem.** The level grades where a capability has
been shown to work - **it does not grade whether the approach helps here.** That
is the *fixes* and *does not fix* columns' job, and the two must be read
together.

**BY THE WEAKER CRITERION OF A BLOCK, SIX OF THE EIGHT DEMONSTRATED HERE ROWS
DEMONSTRATE A LIMIT. BY THIS DOCUMENT'S OWN STRONGEST CRITERION - A BOARD - ALL
EIGHT DO.** Row 1 fixes nothing. Row 2 kept 398 labels off every body and put 266
crossings on wires. Row 5 is the measurement that the metric is not the blocker.
Rows 7 and 8 clear zero of twelve blocks. Row 13's whole measured gain is 2
placements in 255 and its worst arm is a loss. **The two that are not limits at
block granularity are rows 6 and 9**, which clear 5 and 7 of the 12 label-blocked
blocks - **and §7.2 measures that neither draws a board**: row 6's five blocks all
sit on Pultec boards refused at `validateCircuit` before any text is placed, and
row 9's seven do not include the second blocker of either board whose first
blocker they clear. **So the honest count is eight of eight**, and this paragraph
says six first because the weaker criterion is the one §5 measured against.

**THE LEVELS EXTEND THE REGISTER'S OWN GRADES RATHER THAN REPLACING THEM.**
`docs/known-gaps.md` distinguishes CONFIRMED from RELAYED, which is about whether
the writer saw the thing. These three are about where the thing was seen to work.
**A claim can be CONFIRMED in its own context and still be untested in ours**, and
KiCad's autoplacer is exactly that: read line by line at tag `10.0.5`, **never
executed, and never offered one of this repository's blocks.**

**AND THAT IS NOT A GRADE OF ROWS 3 AND 4, WHICH ARE ESTABLISHED ELSEWHERE - IT IS
WHAT ESTABLISHED ELSEWHERE MEANS.** The first version of this paragraph said the
autoplacer *"is exactly an INTEGRATION HYPOTHESIS in ours"*, which reads as a
grade and contradicts the two entries that carry it. **Level 1 and level 3 are both
untested here**, and they differ only in whether the capability has been shown to
work somewhere: level 1 has a source read or a paper read behind it, level 3 does
not. **So ten of the eighteen rows are untested here** - the six level-1 rows and
the four level-3 rows - and §7.1's count paragraph says so where the counts are.

**ONE DEVIATION, MARKED IN THE TABLE AND REVERSIBLE IN ONE CELL.** The plan's
Step 3 adds a sentence to level 2: *"Only Task 1's geometry, Task 2's ELK
experiment and Task 5's freedom measurements can reach this level."* **Task 6
then drove `placeFields` over all 48 declared blocks and 255 unit placements**
(§6.5), which meets level 2's definition word for word. This repository's rule
for that situation is its own: *"The CRITERION is what was measured. The
MECHANISM is the writer's guess at how to meet it... take the criterion, test
against it, and record the deviation when the mechanism turns out to be wrong."*
The definition is the criterion; the three-task list is a prediction made before
Task 6 ran, and the plan's Task 6 brief asked for no measurement campaign - its
Step 3 asked only to *"connect it to the measures this repository already has"*.
**So row 13 is graded DEMONSTRATED HERE and marked †.** A reviewer who reads the
enumeration as binding changes that one grade to INTEGRATION HYPOTHESIS and
nothing else in the table moves. **G275** carries the deviation.

### 7.1 THE SOLUTION SPACE

**The deliverable the plan asks for.** *Fixes* and *does not fix* are about the
eleven boards and the blocks they are made of, never about an abstract
capability. **An approach that fixes nothing is written as fixing nothing**, and
four rows below are that.

**THE FORM OF THIS SUBSECTION WAS CHANGED ON 2026-10-23, AND THE REASON IS THIS
REPOSITORY'S OWN CARDINAL PRACTICE.** Rounds 0 and 1 carried all of this as a
**seven-column table**: 18 rows at a median of **761.5 characters / 765 bytes**
and a maximum of **1465 characters**, with **ten cells over 300** and a longest
cell of **740**. **IT WAS NEVER RENDERED, AND RENDERING IT IS WHAT SETTLES IT.**
**EVERY PIXEL FIGURE BELOW WAS TAKEN UNDER ONE NAMED CONFIGURATION AND IS A
PROPERTY OF THAT CONFIGURATION AND OF THIS DOCUMENT TOGETHER**, which is said
because a reviewer reproduced one of them and not the others: `[RAN]` **pandoc
3.10.1, `-f gfm -t html -s`, its default HTML5 template and that template's
default CSS, in headless Chromium at a 1100 x 900 CSS-pixel viewport.** Under it
the seven-column table laid out **6300 px tall** - and that height **reproduced
independently** - while its columns ran to **x = 1195 inside a 1100 px page**
whose `document.scrollWidth` stayed at **1100**, so the last three - *what it
depends on*, *evidence* and **LEVEL** - were off the right edge and **clipped
rather than scrollable**. **THAT CLIPPING GEOMETRY IS RENDERER-DEPENDENT AND
SHOULD NOT BE READ AS A FIGURE ABOUT THE DOCUMENT:** a reviewer trying three
other CSS configurations got table layouts that auto-fit or shrank instead, so a
reader who measures something else has a different stylesheet, not a wrong
number. **What does not depend on the renderer is the finding**, which held under
every configuration either of us tried and needs no pixel to stand: **a
seven-column table whose median row is 761.5 characters cannot be shown to a
reader**, and the column the whole section is organised around is the one that
pays. That is `CLAUDE.md`'s *"a document can be generated and useless. Render it,
print it, read it"* going unapplied to the one subsection of this document a
reader is most likely to open first. The same eighteen rows are now a
**three-column index** plus **one labelled block per row**: under the same named
configuration the index renders **822 px tall** with a right edge at **838 px**,
nothing clipped. **No row, no grade, no figure and no citation
is changed by the re-presentation** - five quotations across §7 and the head
table were corrected in the same change, **three of them here**, and all five are
listed in §7.7(3); everything else is the previous table's text,
cell for cell, and the move was checked that way (108 cell comparisons, all
present).

| # | approach | LEVEL |
| --- | --- | --- |
| 1 | **Ask ELK to place the global label and read the coordinate back** | **DEMONSTRATED HERE** (negative) |
| 2 | **Tell ELK about text BEFORE it places nodes** | **DEMONSTRATED HERE** (capability only) |
| 3 | **Port KiCad's field autoplacer wholesale** | **ESTABLISHED ELSEWHERE** |
| 4 | **Port `fitFieldsBetweenWires`, its one local repair** | **ESTABLISHED ELSEWHERE** |
| 5 | **Fix the text metric and keep the current search** | **DEMONSTRATED HERE** |
| 6 | **Side selection for global labels: search freedom 1** | **DEMONSTRATED HERE** |
| 7 | **Freedom 2: slide the anchor along the segment it already sits on** | **DEMONSTRATED HERE** |
| 8 | **Freedom 4: another segment of the same net** | **DEMONSTRATED HERE** |
| 9 | **Freedom 3: lengthen the label's stub 1-8 grid steps, over all four sides** | **DEMONSTRATED HERE** |
| 10 | **Freedom 2 TOGETHER WITH the wire retraction it implies** | **INTEGRATION HYPOTHESIS** |
| 11 | **A candidate STRIP along the net's polyline** | **ESTABLISHED ELSEWHERE** |
| 12 | **A penalty model over the sheet** | **ESTABLISHED ELSEWHERE** |
| 13 | **Re-walk the field placement order and keep the best** † | **DEMONSTRATED HERE** † |
| 14 | **Place what you can and log what you could not - for LABELS, as the field placer already does for fields** | **INTEGRATION HYPOTHESIS** |
| 15 | **Make the fallback as LOUD as an overfull box** | **ESTABLISHED ELSEWHERE** |
| 16 | **Publish the conflict count as a MEASURE** | **INTEGRATION HYPOTHESIS** |
| 17 | **Shorten the text** | **INTEGRATION HYPOTHESIS** |
| 18 | **Suppress the text** | **ESTABLISHED ELSEWHERE** |

**THE EIGHTEEN, ONE AT A TIME.** Each block below is one row of that index, with
the four things the row has to say kept apart and labelled. **Nothing here is new**
relative to the index above it; it is the same eighteen rows in a form a renderer
can show.

**1.** **Ask ELK to place the global label and read the coordinate back** —
**DEMONSTRATED HERE** (negative)

- **WHAT IT WOULD FIX** **Nothing.** ELK places it and returns an offset from
  the anchor; `lib/schgen/render/emit-items.ts:227-241` emits a `global_label`
  with exactly one coordinate, so **an offset has no representation in this
  emitter's output vocabulary**
- **WHAT IT WOULD NOT FIX** everything: no board, no block, no overlap
- **WHAT IT DEPENDS ON** nothing - it is not an available move in the emitted
  form
- **EVIDENCE** §2.7, §2.8

**2.** **Tell ELK about text BEFORE it places nodes** (outside node labels,
fixed size - arm **e**) — **DEMONSTRATED HERE** (capability only)

- **WHAT IT WOULD FIX** Over this repository's own 48 graphs, 398 labels
  placed, **0 ran into any body**, and the drawing grew in both dimensions to
  make room. This repository places all of its text AFTER a layout computed as
  if no text existed
- **WHAT IT WOULD NOT FIX** **266 label-over-wire crossings** appeared in the
  same arm, by this repository's own predicate, **undiagnosed**;
  label-to-label separation across elements is not in ELK's option vocabulary
  at all; **no `.kicad_sch` was written and no board was drawn**
- **WHAT IT DEPENDS ON** an emitter change nobody has designed, for a label
  whose only emitted coordinate is its anchor (row 1); and a diagnosis of the
  266
- **EVIDENCE** §2.5 arm **e**, §2.8, §2.9

**3.** **Port KiCad's field autoplacer wholesale** — **ESTABLISHED ELSEWHERE**

- **WHAT IT WOULD FIX** Nothing identified. Its rigid field stack is already
  here (`slotFields`); its four sides are **fewer** than this repository's
  eleven candidates; and its non-refusal is already here since **G232**'s Task
  24 change
- **WHAT IT WOULD NOT FIX** the label problems - it is a FIELD autoplacer and
  §5.11 could find no label autoplacer in KiCad at all; and it carries a
  **confirmed defect**, picking a side it has graded as colliding while a
  clear side remains
- **WHAT IT DEPENDS ON** nothing worth depending on: **any design reasoning
  "KiCad manages with four sides, so the candidate set is not the problem" is
  reasoning from an algorithm that does not reliably take the clear side it
  has found**
- **EVIDENCE** §3.1-§3.3, §3.13

**4.** **Port `fitFieldsBetweenWires`, its one local repair** — **ESTABLISHED
ELSEWHERE**

- **WHAT IT WOULD FIX** **The one idea §3 found that this repository does not
  have**: a local shift of a chosen candidate, along one axis, into a free gap
  between parallel obstacles. This repository has **no perturbation of any
  kind**
- **WHAT IT WOULD NOT FIX** unmeasured - whether it would help depends on
  whether this repository's fallbacks are blocked by **wires** in particular,
  and nobody has asked
- **WHAT IT DEPENDS ON** re-reading **G260**'s fifteen fallbacks by obstacle
  class, which §3.13 names and did not do
- **EVIDENCE** §3.5, §3.13, §4.8

**5.** **Fix the text metric and keep the current search** — **DEMONSTRATED
HERE**

- **WHAT IT WOULD FIX** The over-reservation: a median 18% and a maximum 87%
  of excess width against the rendered ink, worst case 4.2 grid steps - more
  than three characters of room claimed and not used. And the HEIGHT
  under-reservation, which is where the model is wrong under every measured
  quantity
- **WHAT IT WOULD NOT FIX** **THE BLOCKERS. 13 of 15 field fallbacks survive
  all three measured quantities; under KiCad's own box all 15 survive and 9
  MORE appear (24), under the ink 20.** Of 8 drawn-text overlaps, 4 are
  artefacts of the ruler and 4 are real - and **the blocking pair of each of
  the three blocked blocks survives under every quantity**
- **WHAT IT DEPENDS ON** the owner's election among the three quantities
  (**G265** clause 4), which **changes the recorded population from 13 to 24**
- **EVIDENCE** §1.7, §1.9

**6.** **Side selection for global labels: search freedom 1** (4ⁿ over a
block's anchors, graded by `checkLayout`) — **DEMONSTRATED HERE**

- **WHAT IT WOULD FIX** **5 of the 12 label-blocked blocks outright, under the
  production ruler** - all five Pultec `*-junction` blocks, at
  `hi_boost_out:down`. Cost: 4⁴ = **256** `checkLayout` calls on each of those
  five, which carry four label anchors apiece; the widest F1 space in the
  repository is 4⁶ = **4096**. The side is currently never searched:
  `read-graph.ts:244-272` reads it off the direction of the last route segment
- **WHAT IT WOULD NOT FIX** the other 7. **And no board**: all five blocks it
  clears are on Pultec boards refused at `validateCircuit` before any text is
  placed (§7.2)
- **WHAT IT DEPENDS ON** the production ruler - **every clearing count in §5
  is at `length × GRID` and is expected to move under another**
- **EVIDENCE** §5.7, §5.9, §5.10 item 1

**7.** **Freedom 2: slide the anchor along the segment it already sits on** —
**DEMONSTRATED HERE**

- **WHAT IT WOULD FIX** **0 of 12 blocks.** Its best totals never reach zero -
  1, 2, 3, 6 and 10. All 46 anchors had candidates (516 grid points summed),
  so no verdict here is vacuous
- **WHAT IT WOULD NOT FIX** everything it was hoped to. And on three blocks it
  **creates** a problem: the wire end the anchor left is refused by this
  repository's own `danglingWireEnds` - **a generator rule, not the file
  format; KiCad does not share it** (**G269**)
- **WHAT IT DEPENDS ON** the ruler; and the dangling-end rule, which §5.9 says
  is **not wrong** and is the reason the compatible form of this move is row
  10
- **EVIDENCE** §5.3, §5.7, §5.9

**8.** **Freedom 4: another segment of the same net** — **DEMONSTRATED HERE**

- **WHAT IT WOULD FIX** **0 of 12 blocks**, and on several it makes things
  worse by stranding the wire end the anchor left. **6 of the 46 anchors have
  an EMPTY candidate set** - their net has only one segment
- **WHAT IT WOULD NOT FIX** everything. The generator's own exposure here is
  two positions in a chain decided by a layer constraint (`graph.ts:240-252`),
  out of n+1 insertion points
- **WHAT IT DEPENDS ON** the ruler; and Imhof's per-segment framing, which
  reaches this document through Wolff Ch. 5 only
- **EVIDENCE** §5.7, §5.9

**9.** **Freedom 3: lengthen the label's stub 1-8 grid steps, over all four
sides** — **DEMONSTRATED HERE**

- **WHAT IT WOULD FIX** **7 of 12 blocks - the widest of the four freedoms**,
  and the only one that clears `tp-leg-emitter-bypass` and `tp-follower`. On
  `tp-leg-emitter-bypass`, `BYPASS_CAP` stub `+2` steps to `(15.24, 5.08)`
  side `down` gives a layout `checkLayout` grades at **ZERO problems**, for
  2.54 mm of wire
- **WHAT IT WOULD NOT FIX** 5 blocks. **The bound on the sweep is
  deliberate**: *adjust the surrounding geometry* is unbounded in general, and
  an unbounded search would be a placement algorithm, which no research task
  may produce
- **WHAT IT DEPENDS ON** the ruler. **And the measurement is of one block's
  geometry, not a rule** - nothing says the same move helps elsewhere, and
  §5.7 shows 7 of 12 and not 12 of 12
- **EVIDENCE** §5.7, §5.8, §5.10 item 2

**10.** **Freedom 2 TOGETHER WITH the wire retraction it implies** - move the
anchor off a wire end and shorten the wire after it — **INTEGRATION
HYPOTHESIS**

- **WHAT IT WOULD FIX** Unknown, and **§5.9 names it the single most likely
  thing to widen "some freedom clears it" above 7 of 12**, because three
  blocks reduce to the dangling-end problem alone
- **WHAT IT WOULD NOT FIX** nothing is known either way. **It was not swept**,
  and the sweep that was performed could not reach it: it moves anchors and
  not wires
- **WHAT IT DEPENDS ON** a sweep nobody has run; and the ruler, once it is
- **EVIDENCE** §5.9, §5.10 item 3

**11.** **A candidate STRIP along the net's polyline** (continuous line
labelling: Wolff Ch. 5, with each inter-junction segment a feature of its own
after Imhof) — **ESTABLISHED ELSEWHERE**

- **WHAT IT WOULD FIX** **It is the formulation that actually fits** -
  internal labelling of a line feature with a sliding site - and this
  repository's own H3 refusal (`label hi_boost_out` *"overlaps wire 33"*) is
  the literature's hard constraint, independently arrived at. §5.6's 95
  anchors at min 20 / median 80 / max 1000 are what it would be searching
- **WHAT IT WOULD NOT FIX** nothing is measured, and **how many more labels a
  continuous model places than a fixed-position one is still UNKNOWN here.**
  §5.1 read Wolff Ch. 3 **for Definitions 3.1 and 3.2 only and states that its
  approximation results were not read**, which is where that comparison would
  be; **G232**'s Task 23 amendment records the same question open from the
  other side. Imhof reaches this document only through Wolff's transcription,
  `[NOT RETRIEVED]`
- **WHAT IT DEPENDS ON** a reading nobody has made of the results §5.1 left,
  and an implementation nobody has written
- **EVIDENCE** §5.1, §5.6, §5.10 item 4; **G270**

**12.** **A penalty model over the sheet** - badness as a continuous quantity,
two declared grades of it, a feasibility threshold separate from the ranking,
a penalty attached to a choice — **ESTABLISHED ELSEWHERE**

- **WHAT IT WOULD FIX** **TWO of those four are already here, and §6.3 calls
  one of them convergent rather than borrowed**: overlap area is continuous in
  `occupancy.ts`, and `field-placement.ts`'s own header says *"THE COST RANKS;
  IT NEVER DECIDES FEASIBILITY."*
- **WHAT IT WOULD NOT FIX** **nothing, by itself - and the two that are
  missing are missing differently.** The **two grades** exist here *implicitly
  and globally* - every obstacle is infinite until no candidate is clear, at
  which moment every obstacle becomes finite at once - and §6.3 calls
  declaring them *"the part this repository most lacks as a declared thing"*;
  **the declaration IS an acceptance criterion and is the owner's** (§7.5). A
  **penalty on a choice** this repository has *"in principle; nothing here has
  one"* - `allCandidates`'s array order is its only preference statement and
  the prior-art document records it as *"unjustified anywhere"*. And the
  SEARCH does not transfer: the authors name contiguity as its only rescue and
  label placement has none
- **WHAT IT DEPENDS ON** the owner's split; and **not** on the literature's
  numbers - **Knuth and Plass call both their published formulae *"quite
  arbitrary"***, so adopting their cost function is not a move that exists
- **EVIDENCE** §6.1-§6.3, §6.7, §6.11 item 2

**13.** **Re-walk the field placement order and keep the best** † —
**DEMONSTRATED HERE** †

- **WHAT IT WOULD FIX** Measured, over all 48 declared blocks and 255 unit
  placements: **production 53 fallbacks, order-wise best 51.** 3 units change
  fallback status under some order and 21 change slot, so the sequential
  dependence is live and not theoretical
- **WHAT IT WOULD NOT FIX** **IT IS NOT FREE, AND AN EARLIER DRAFT SAID IT
  WAS.** The order-wise **worst is 54** - an order chosen without an objective
  can cost a fallback as easily as save one. **All 53 fallbacks live on the 12
  blocks too large to exhaust**, sampled at 200 orders out of between 40 320
  and 3.05e29, so **51 is an upper bound on the achievable minimum and not an
  optimum**; the 36 blocks driven exhaustively have **zero** fallbacks, so
  their order-invariance is proven and uninformative. **4 fallbacks cover
  other text and 3 of the 4 are not reachable by reordering at all**
- **WHAT IT DEPENDS ON** an objective to be best BY, which is row 16's problem
  and ultimately **G260**'s
- **EVIDENCE** §6.5, §6.10, §6.11 item 3

**14.** **Place what you can and log what you could not - for LABELS, as the
field placer already does for fields** — **INTEGRATION HYPOTHESIS**

- **WHAT IT WOULD FIX** **It is the only approach in this table that could
  move the board count at all**, because it replaces a refusal with a drawing
  rather than moving text. **Zero of eight comparable systems refuse** - six
  tools in §4, KiCad in §3, TeX in §6.8 - so refusing is this generator's
  peculiarity among its closest neighbours
- **WHAT IT WOULD NOT FIX** **it fixes no overlap**: the text is still drawn
  over something, and what changes is that a sheet exists. **AND HOW MANY
  BOARDS IT WOULD DRAW IS NOT KNOWN AND IS NOT GUESSED HERE.** The six
  `validateCircuit` boards never reach a text pass. Of the five that do,
  **three are refused on a first problem with no label in it** - one junction,
  two power-symbol glyph touches - which a label placer does not absorb; and
  the two refused on a label each have a second block behind them, `tp-stage`,
  whose problem list is 8 of 8 naming a label on `-lab` and **15 of 21 on
  `-loop`** (§5.7). **Nothing was re-graded under a non-refusing label pass**,
  so the board figure under this row is unmeasured
- **WHAT IT DEPENDS ON** **ENTIRELY on G260, which is the owner's.** Its
  criterion, quoted here as §7.5(1) quotes it and contiguous in the entry:
  *"the owner looks at a sheet carrying fallback placements and says whether
  it is acceptable, and under what count or what kind of overlap it stops
  being acceptable."* Nothing here answers that or may be read as implying an
  answer
- **EVIDENCE** §4.9, §6.8, **G260**, **G268**; the field precedent is
  **G232**'s Task 24 change, `[RELAYED]`

**15.** **Make the fallback as LOUD as an overfull box** — **ESTABLISHED
ELSEWHERE**

- **WHAT IT WOULD FIX** Nothing about a drawing. TeX errors on the user's
  terminal on the run that produced the overset line; this repository writes a
  `FieldFallback` row into `RENDER-REPORT.md` that **nothing automated
  reads**, so a generation going from 0 fallbacks to 50 is green
- **WHAT IT WOULD NOT FIX** no overlap, no block, no board. It is a reporting
  change
- **WHAT IT DEPENDS ON** **G260**'s open residual verbatim, waiting on the
  owner's number. It is not a new proposal and must not be written up as one
- **EVIDENCE** §6.8; **G260**'s residual

**16.** **Publish the conflict count as a MEASURE** - the fraction of items
placed without overplot — **INTEGRATION HYPOTHESIS**

- **WHAT IT WOULD FIX** Computable today from `FieldFallback` with no new
  geometry. **It would be the first number about TEXT in a repository whose
  five readability numbers are all computed over WIRES** - and §6.6 found text
  entering exactly one of the five, as a point with no extent
- **WHAT IT WOULD NOT FIX** nothing. It measures; it does not place
- **WHAT IT DEPENDS ON** **it is a MEASURE and not a gate, and no threshold
  may accompany it** without the owner (**G71**, **G260**). A weighting or a
  budget invented here would be **G71**'s failure exactly
- **EVIDENCE** §6.6, §6.11 item 1; **G272**

**17.** **Shorten the text** - ELK's `labelManager`, or any abbreviation of a
net name — **INTEGRATION HYPOTHESIS**

- **WHAT IT WOULD FIX** Unknown. It is the one label option `layered` does not
  list, and §2 **did not drive it**
- **WHAT IT WOULD NOT FIX** nothing is measured
- **WHAT IT DEPENDS ON** **an owner decision in any case** - whether an
  abbreviated net name on a schematic is acceptable is not an agent's call
- **EVIDENCE** §2.1, §2.9

**18.** **Suppress the text** — **ESTABLISHED ELSEWHERE**

- **WHAT IT WOULD FIX** **WHAT THE LEVEL GRADES IS xschem**, `[READ]` at a
  pinned commit: it suppresses text below ~3 device pixels at the current
  zoom, on screen. **The one instance here is a HERE-RESULT and is NOT what
  the level grades**, and it is `[RELAYED]` from **G257**: a Value field that
  merely repeats its symbol's part name is emitted `(hide yes)`, which removed
  `tp-leg-emitter-bypass`'s field-placement refusal. **That instance was the
  owner's own dissolution, not an agent's**, which is why it is not a
  mechanism this row proposes
- **WHAT IT WOULD NOT FIX** **it does not generalise, and G232's Task 21
  amendment says why in its own words**: the three `Device:C`-class blockers
  carry values that *"are real electrical parameters that MUST be drawn"*, so
  **"Task 21's change cannot help any of them"** - and §1.9 measures those
  capacitors at **0 of 5 inside slots under all four quantities**. xschem's
  own guard is keyed on zoom, **never on what else is at that coordinate**,
  and both its exporters' copies are commented out
- **WHAT IT DEPENDS ON** which text carries information a builder needs - the
  owner dissolved one case and there is no rule
- **EVIDENCE** §4.3, §4.8; **G257**, `[RELAYED]`

**THE COUNTS, so a reader can see the shape without counting:** 18 rows -
**6 ESTABLISHED ELSEWHERE** (3, 4, 11, 12, 15, 18), **8 DEMONSTRATED HERE**
(1, 2, 5, 6, 7, 8, 9, 13), **4 INTEGRATION HYPOTHESIS** (10, 14, 16, 17).

**AND THE COUNT THAT MATTERS MOST IS NOT ONE OF THOSE THREE: TEN OF THE EIGHTEEN
ARE UNTESTED HERE.** Level 3 is *"untested here"* and **level 1 is untested here
too** - it differs only in having a source read or a paper read behind it, which
is why §7.0 says the level grades where a capability was shown to work and not
whether it helps. So the ten untested-here rows are the six level-1 rows **plus**
the four level-3 rows, and a reader who counts only the four has undercounted the
untried part of this table by more than half. **The eight DEMONSTRATED HERE rows
are the only ones that have met one of this repository's own blocks.**

**THE PLAN EXPECTED MOST ROWS TO BE INTEGRATION HYPOTHESIS AND THEY ARE NOT, AND
THE REASON IS NOT THAT THE APPROACHES ARE BETTER ESTABLISHED THAN IT THOUGHT.**
Tasks 1, 2 and 5 drove seven of these eighteen against this repository's own
inputs, and Task 6 drove an eighth; the plan was written before any of those
runs existed. **What the eight DEMONSTRATED HERE rows mostly demonstrate is that
an approach does not work here**: one fixes nothing, one is the measurement that
the ruler is not the blocker, two clear zero blocks, and one buys 2 placements in
255 while its worst arm loses one. **By the board criterion all eight are limits**
and §7.0 names the two that are limits only at that granularity. **A reader who
takes DEMONSTRATED HERE as a recommendation has read the column backwards** -
§7.0 says what it grades.

### 7.2 The same eighteen approaches against the eleven boards

**THE CENSUS, RE-DRIVEN HERE RATHER THAN RELAYED, BECAUSE EVERY FIGURE IN THIS
SUBSECTION DEPENDS ON IT.** `[RAN, CONFIRMED]` `bun tools/schgen/board-sheets.ts`
at this commit: **`0 of 11 boards produce a schematic`, `11 refused; 0 have no
authoring declaration`**. This writer ran it and read the whole output. **It is
not pasted** (§7.6 says why) and it is re-drivable in one command by anyone who
doubts it. **The per-board validation counts below were tallied from that run's
own output**, not relayed from **G259**, and `pt2399-core`'s 18 agrees with what
that entry published. **An elision inside a quoted blocker line is marked `…` and
elides a coordinate this document gives elsewhere**; a cell with no quotation
marks is this writer's summary of several lines of the run and not a quotation.

| board | what the census names as its blocker | class | which rows of §7.1 could bear on it |
| --- | --- | --- | --- |
| `pt2399-core` | `validateCircuit`, **18** problems: nets that are not UPPER_SNAKE, plus one net with a single pin | **no text in it** | **NONE.** It refuses before any text is placed |
| `pultec-hi-boost` | `validateCircuit`, **20**: nets that are not UPPER_SNAKE, plus one pin neither on a net nor declared not-connected | **no text in it** | **NONE until that is fixed.** Behind it: `pultec-hi-boost-junction`, which row 6 clears, and `pultec-hi-boost-own`, whose three H3 overlaps rows 7-9 clear and which then refuses on row 7's dangling end |
| `pultec-hi-cut` | `validateCircuit`, **14**, same two classes | **no text in it** | **NONE until that is fixed.** Behind it: `pultec-hi-cut-junction`, which **row 6 clears outright** |
| `pultec-low-boost` | `validateCircuit`, **14**, same two classes | **no text in it** | **NONE until that is fixed.** Behind it: the junction block, which row 6 clears; and `pultec-low-boost-own`, refused **before** `checkLayout`, so no text approach is even graded on it |
| `pultec-low-cut` | `validateCircuit`, **14**, same two classes | **no text in it** | **NONE until that is fixed.** Behind it: the junction block, which **row 6 clears outright** |
| `pultec-mid` | `validateCircuit`, **28**, same two classes | **no text in it** | **NONE until that is fixed.** Behind it: the junction block, which **row 6 clears outright** |
| `transistor-preamp-buffered` | `tp-stage`: *"the glyph of power symbol GND 0 … touches the glyph of power symbol VCC 1, which is on another net"*, then `value of power symbol VCC 1 … overlaps label BYPASS_CAP`, then `label BYPASS_CAP … overlaps pin C2.2` | **the FIRST problem has no text in it** - **G263**'s class | rows 6-9 clear **every label problem** on this block; the glyph touch is not a labelling problem and **no row of §7.1 addresses it** |
| `transistor-preamp-feedback` | `tp-stage`: *"net GND branches at (38.1, 44.45) (t-junction) and no junction is emitted there"* | **no text in it at all** | **NONE.** §5.5a records this board as having no label-blocked block |
| `transistor-preamp-lab` | `tp-leg-emitter-bypass`: `label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)` | **text** | **row 9 clears this block to ZERO problems.** But §5.5a records this board as label-blocked via `tp-leg-emitter-bypass` **and** `tp-stage`, and §5.7 records `transistor-preamp/tp-stage` as keeping a label problem under **every** freedom tried |
| `transistor-preamp-loop` | `tp-follower`: `label BUFFER_BASE … overlaps label BUFFER_EMITTER` | **text** | **row 9 clears `tp-follower`** (and rows 6-8 together clear its label problems, leaving row 7's dangling end). Behind it: `tp-stage` again, which nothing clears |
| `transistor-preamp-staged` | `tp-stage`: the same GND/VCC glyph touch as `buffered`, then the same two label problems | **the FIRST problem has no text in it** | as `buffered`: rows 6-9 clear every label problem on the block; nothing in §7.1 touches the glyph touch |

**FOUR THINGS THIS TABLE SAYS, AND THREE OF THEM ARE UNCOMFORTABLE.**

**(1) NOT ONE OF THE EIGHTEEN APPROACHES HAS BEEN SHOWN TO DRAW A BOARD**, and no
combination of the ones that MOVE text has. **Six boards refuse before any text is
placed**, and on the five that reach layout the remaining obstacle is in every
case either a non-text defect or `tp-stage`, which §5.7 measured as keeping a
label problem under every freedom swept.

**The one row that could move the board count is row 14, and it does not move text
at all** - it replaces the refusal with a drawing. **Its yield is unmeasured** and
deliberately not guessed at: three of the five boards that reach layout are
refused on a first problem with no label in it, and the two that are not have
`tp-stage` behind them. **Its precondition is `G260`, which is the owner's.** So
the honest statement is that the text work surveyed here moves no board, and the
one thing that might is a decision rather than a technique.

**(2) THE CENSUS NAMES THE FIRST REFUSING BLOCK, NOT THE ONLY ONE - AND A CLAIM
IN THE REGISTER AND IN §5 OF THIS DOCUMENT READS IT AS THE ONLY ONE.** **G262**
records `tp-leg-emitter-bypass` as the block that refuses `transistor-preamp-lab`
*"and by nothing else in front of it"*, which is true and precise; **§5.8's
heading and §5.10's mechanism 2 both compress it to "the binding constraint" and
"the only thing refusing `transistor-preamp-lab`", which §5.5a of the same
section measures false** - that board is label-blocked via `tp-leg-emitter-bypass`
**and** `tp-stage`. `[RAN, CONFIRMED]`: the census prints exactly one block per
refused board, because `generate` stops at the first. **So clearing
`tp-leg-emitter-bypass` by row 9's two grid steps of wire would not produce a
sheet for that board**, and a reader who acts on §5.10 item 2 expecting one would
be surprised by `tp-stage`. **G274** carries this; §5 is not edited, because an
agent does not rewrite a closed section's measured text to match a later
reading.

**(3) `tp-stage` IS THE BINDING CONSTRAINT ON FOUR BOARDS AND IT IS THE BLOCK
WITH THE MOST TEXT IN THE REPOSITORY.** `transistor-preamp-buffered`, `-loop`,
`-staged` and `-lab` all carry it, and §5.7 measures the two largest instances at
8 and 21 problems - the only two blocks where **no** freedom tried clears a label
problem. **G259**'s Task 25 amendment already recorded that one block refuses four
boards; what §5 and §7 add is that it is the one block the whole solution space
measured here does not reach.

**(4) THE NEAREST THING TO A BOARD IS TWO BOARDS, AND IT NEEDS A NON-TEXT FIX
FIRST.** On `transistor-preamp-buffered` and `-staged` the only label-blocked
block is `tp-stage`, §5.7 records **every label problem on those two instances as
cleared by some freedom**, and the residue is the GND/VCC glyph touch - **G263**'s
class, with no text in it. **That makes them candidates and not a count**, for
exactly the reason **G232** records about its own leverage figure: a non-text fix
moves geometry, moved geometry re-enters the other obligations, and **nothing here
re-graded either block after a hypothetical glyph fix.** This is bait, and it is
recorded beside the trap.

### 7.3 The approaches that fix nothing, and the one the research made LEAST promising

**The plan's Step 2 requires this to be stated rather than softened**, and the
register already holds one mechanism the research demoted.

- **Row 1 fixes nothing, and it was the plan's own leading hypothesis.** §2 was
  commissioned to test whether ELK - already a dependency, already trusted with
  block layout - could own the label problem. **It cannot, and the reason is not
  a missing feature**: ELK answers with an offset from the anchor and the
  `global_label` this generator emits has one coordinate. That is a property of
  the emitted form, and §2.7 is careful that it is **not** the claim **G262** got
  wrong - *"its only coordinate is its anchor"* is not *"its position is fixed by
  the netlist"*, which §5 then measured false on all four axes.
- **Row 3 is the one the research made LEAST promising, and it was the obvious
  candidate going in.** Porting KiCad's autoplacer looked like the safe move: it
  is the program `make check` invokes on this repository's output on every run.
  §3 read it in full and found **four candidates where this repository has
  eleven**, a rigid field stack this repository already implements, non-refusal
  this repository already adopted, and **a confirmed defect in its side
  selection** that departs from the specification in its own file header - in a
  function upstream's own test file for that algorithm never calls. **There is
  nothing left to borrow except row 4**, and row 4's value here is unmeasured.
- **Row 5 fixes the thing everybody assumed was the problem and does not move
  the blockers.** This is the finding most likely to be re-derived by somebody
  who has not read §1.9. §1's own opening - *"Every text extent in this
  repository is `text.length * GRID`"*, and, two sentences later, *"nobody had
  measured the error in it"* - invites the
  conclusion that the ruler is the bug. **It is wrong in both directions, and
  13 of 15 recorded fallbacks survive all three measured quantities; under
  KiCad's own box the population GROWS from 15 to 24.**
- **Rows 7 and 8 clear zero blocks**, and row 7 additionally creates a problem
  the generator refuses and KiCad does not.
- **Rows 15 and 16 fix no drawing at all** and are in the table because they are
  about what a generator does with the list rather than about where text goes.
  Both are waiting on the owner.

### 7.4 What the seven tasks did NOT establish

**This is the honest boundary of the survey and not a failure section**, in the
style `docs/schematic/text-placement-prior-art.md` §9 sets. Each section carries
its own list - §1.10, §2.9, §3.12, §4.10 and §4.11, §5.11, §6.10 - and **those
lists are not repeated here.** What follows is what no section owned, or what only
becomes visible once all six are read together.

- **NOTHING WAS BUILT OR FIXED, AND NO DRAWING WAS PRODUCED.** Probes were run -
  §1's, §2's, §5's and §6's each against a committed log, §4's against third-party
  tools installed outside the tree, §7's re-drivable in one command - but
  seven tasks changed no file under `lib/`, `circuits/`, `boards/` or the
  `Makefile`. **0 of 11 boards produced a schematic before this plan and 0 do
  after it**, and the plan's own constraint is why.
- **NO APPROACH IN §7.1 WAS IMPLEMENTED, so every *what it would fix* entry above is either a
  sweep's verdict or an estimate, never an outcome.** The sweeps in §5 grade
  candidate geometries with `checkLayout`; they do not emit a `.kicad_sch`, run
  `kicad-cli` on it, or show the result to anybody.
- **NO FIGURE ABOUT LEGIBILITY EXISTS ANYWHERE IN THIS DOCUMENT.** `checkLayout`
  grades clearance. Whether a label on the far side of its anchor reads, whether a
  lengthened stub reads, whether a drawing a box-intersection test calls clear is
  readable by a person - **none of that was assessed, for this repository or for
  any of the eight systems examined.** §4.11 says the same of the tools, and §6.6
  records that **all five of this repository's readability numbers are computed
  over wires**, with text reaching exactly one of them as a point with no extent.
  The one thing that could bear on legibility is the owner's eye, and **G260** is
  where that question lives - with the precondition §7.5 names, that **there is no
  sheet to show him.**
- **THE TWO FALLBACK POPULATIONS IN THIS DOCUMENT ARE DIFFERENT POPULATIONS AND
  MUST NOT BE COMPARED.** §1's **15** are over the **10** laid-out blocks of the
  four parity circuits, which is **G260**'s published population; §6.5's **53**
  are over the **48** laid-out blocks of all eleven boards. §6.10 states that
  §1's 13-of-15 survival ratio **has not been re-taken over the 48**, so **it is
  unknown how many of the 53 are artefacts of the ruler.** A reader who divides
  one by the other is comparing two corpora.
- **NO CLEARING COUNT IN §5 OR §6 HAS BEEN RE-TAKEN UNDER §1's MEASURED
  QUANTITIES**, and both sections say so at every count. §1 needs `kicad-cli`,
  KiCad's Python bindings and a 2.9 MB font blob fetched from outside the
  repository, so a figure taken under the measured quantities would not be
  re-drivable from a clean checkout. **A candidate that clears by one grid step
  under the production ruler may not clear under KiCad's box**, and §1.9 found the
  recorded field-fallback population moving from 13 to 24 across the three.
- **THE ONE COMBINATION MOST LIKELY TO MATTER WAS NEVER SWEPT** - row 10, freedom
  2 together with the wire retraction it implies. §5.9 names it and §5 could not
  reach it, because its probe moves anchors and not wires.
- **NO JOINT MOVE OVER MORE THAN TWO LABELS WAS SWEPT.** Freedom 1 is exhausted
  over all of a block's labels; freedoms 2, 3 and 4 are one label at a time, with
  a joint sweep only over the two labels of a label-over-label pair. **A clearance
  needing three labels to move at once would not have been seen**, and `tp-stage`
  - the block that blocks four boards - has 5 and 6 label anchors in its two
  largest instances.
- **NO POWER SYMBOL WAS PERTURBED.** Its orientation and the side of its value
  are untouched by every sweep here, and **three of the twelve label-blocked
  blocks carry a power-symbol problem** - including the GND/VCC glyph touch that
  is the first refusal of two boards.
- **NOTHING WAS TESTED ACROSS SHEETS.** Every arm and every sweep is within one
  sheet, and a global label's cross-sheet behaviour is the thing that makes it
  global.
- **THE COMMERCIAL HALF OF §4 IS TWO VENDORS, BOTH AS DOCUMENTATION ONLY**, and
  the single most relevant commercial behaviour identified anywhere in this
  document could not be retrieved from a quotable source. **G268** carries the
  three closed doors. §7.5's last paragraph carries what §6 settled about the
  *behaviour* without settling anything about that tool.
- **FOUR TOOLS WERE NEVER OPENED** - Eagle/Fusion, KiCad's own `pcbnew`
  silkscreen side, LibrePCB and Horizon EDA - and §4.10 records all four. **Of the
  four, `pcbnew` is the only one installed here**: §1.4 measured Q3 through
  `pcbnew`'s Python bindings at build `10.0.5`, so it is the only one of the four
  a run in this repository could have reached without an install. **That is a
  statement about reachability and not a priority**, which is not an agent's to
  set.
- **KiCad's AUTOPLACER WAS NEVER EXECUTED**, and whether KiCad has a label
  autoplacer at all was not established (§5.11). Every statement in §3 is a
  reading of source at one tag.
- **NO COST FUNCTION WAS PROPOSED, AND NONE COULD HAVE BEEN.** §6.7 establishes
  that the literature's own authors call their formulae *"quite arbitrary"*, so
  there is no published weighting to adopt; and inventing one here would be
  **G71**'s failure and an acceptance criterion besides.

### 7.5 This is not a design. What the owner would have to decide first

**Three decisions, and no agent may make any of them.** `CLAUDE.md`: *"An agent
may never author the acceptance criteria for the artifact it is producing."* Each
is stated with the figures it needs and **with no recommendation attached**,
because a recommendation from the producing agent is the failure the rule exists
to prevent.

**(1) HOW MUCH OVERLAP IS ACCEPTABLE IN A DRAWING - `G260`, open, and his.** Its
criterion, already written and not by this writer: *"the owner looks at a sheet
carrying fallback placements and says whether it is acceptable, and under what
count or what kind of overlap it stops being acceptable."* What the research adds
to what he would be looking at:

- **53** field placements are drawn over something, over the 48 blocks of all
  eleven boards; **4** of them cover other text, and **3 of those 4 cannot be
  moved by reordering** (§6.5).
- **Zero of eight** comparable systems refuse to draw because text will not fit -
  six tools in §4, KiCad in §3, TeX in §6.8. **This generator's refusal is its
  peculiarity among its closest neighbours**, which is a fact about the class and
  **not an argument that refusing is wrong**: whether it is right here is this
  decision.
- **Row 14 is the only approach in §7.1 that could move the board count**, and it
  moves it by drawing overlapping text rather than by moving any. **How many boards
  it would draw is unmeasured** (§7.1's own entry says so), and it depends on this
  decision entirely.
- **THERE IS NO SHEET TO LOOK AT, AND NOTHING HAD SAID SO.** `[RAN, CONFIRMED]`
  **0 of 11 boards generate**; `[RELAYED]` all four parity circuits refuse at
  `validateCircuit` or at layout (§1.9's own `SKIPPED` lines; **G238**;
  **G232**'s Task 20 amendment); and the only thing in the repository that
  produces a sheet is the `mini` design **fixture**, which **G259** records
  generating with **zero** fallback placements. **The 53 fallbacks are counted on
  BLOCKS, and a block that lays out is not a drawing anybody can look at.** So
  this decision is answerable only against an artifact that does not exist yet -
  **the gap between the criterion and its own evidence**, stated rather than
  worked around. **G260**'s 2026-10-23 amendment records it; the criterion is not
  widened and no substitute is proposed.

**(2) WHICH OF THE THREE MEASURED TEXT-GEOMETRY QUANTITIES GOVERNS A COLLISION -
`G265` clause 4, open, and his.** The plan's Task 1 Step 0 forbade the measuring
agent from electing, and §1 characterised all three and elected none. What he
would be electing between:

| | WIDTH, against the current model | HEIGHT of one line | the recorded field-fallback population it implies |
| --- | --- | --- | --- |
| the current model, `length × GRID` | - | 1270.0 µm | **15** |
| **Q1** glyph advance sum | over-reserved by a median of 9%, under by up to 302.4 µm | 1270.0 µm (unchanged) | **13** |
| **Q2** rendered ink | over-reserved by a median of 18%, max 87%; never under | **1422.4 µm**, 1845.7 with a descender | **20** |
| **Q3** `EDA_TEXT::GetTextBox` | under-reserved for **70 of 264** strings, by up to 524.6 µm | **2043.1 µm** | **24** |

In width the three measured quantities are within **0.63 grid steps** of each
other over all 264 strings, with the ordering ink < advance < box holding with
zero violations. **In height they are 44% apart, and the height is what moves the
counts.** A third-party review held that ink bounds govern; **the plan declined to
settle it** and recorded why, including that this repository emits a KiCad file,
so a drawing that clears ink while violating KiCad's own text box is a drawing
KiCad considers wrong. **Every clearing count in §5 and §6 is at the production
ruler and is expected to move under another.**

**(3) WHETHER THE INFINITE/FINITE SPLIT IN WHAT MAY BE OVERLAPPED SHOULD BE
DECLARED - §6.3 and §6.11 item 2, and §6 is explicit that it is his.** §6.3's
table calls this *"the part this repository most lacks as a declared thing"* and
says in the same cell: *"What that split should be is an acceptance criterion and
is the owner's."* The fact behind it: Knuth-Plass has an explicit infinite grade
(`r < -1`, refused) and an explicit finite one (`r > 1`, drawn with a cost).
**This repository has the same two grades implicitly and globally** - every
obstacle is infinite until no candidate is clear, at which moment every obstacle
becomes finite at once (§6.4). **Nothing declares which obstacles may never be
overlapped and which may be, at a price.** §6.11 lists the declaration as a
mechanism and marks it as not an agent's to choose; **this section carries it to
§7.5 because it is the third decision and it is framed as his in the section that
found it.**

**AND ONE LEAD THAT IS NOW HALF-SETTLED, WHICH IS NOT A DECISION BUT BELONGS
BESIDE THEM.** **G268** records an unretrievable commercial lead: a silkscreen
auto-placer reported to **place what it can and log what it could not** - a sixth
behaviour shape none of the six tools in §4.8 exhibits, and the only one whose
confirmation would change a row of that taxonomy. **§6.8 gives that BEHAVIOUR a
1981 primary source.** Knuth and Plass, p.1150, read on the rendered page and
confirmed by two reviewers: when no feasible sequence of breaks exists TeX's
active list is *"forcibly prevented from becoming empty"*, and *"This results in
an overset line and an error message that encourages the user to take corrective
action."* **Place what you can; log what you could not.** It does **not** close
**G268**, whose criterion asks for a quotable primary source for **that tool** -
Allegro or OrCAD PCB Editor - and TeX is not that tool. What it changes is that
the shape is no longer known only from a search summary. **G268**'s criterion is
intact and its amendment says exactly this.

### 7.6 How §7's evidence is accounted for: it pastes NO fenced block, and that is a decision

**§7 PASTES NO FENCED BLOCK OF ANY KIND**, so
`tools/schgen/text-metrics/verify-pastes.ts` has nothing of §7's to check and
nothing of §7's to declare NOT CHECKED. **That is a decision and not an
oversight, and the hazard it avoids is specific.**

**THE HAZARD.** §5's checker slice runs from §5's heading **to the end of the
file**, and §6's does too. §5 survives §6's append only because its cases count
` ```label-run ` fences specifically; **§6's own accounting is stricter than
that** - `tests/schgen/text-metrics/document-pastes.test.ts` tallies the fence
word of **every** block in §6's slice and compares the tally against a pinned map
`{ "field-order-run": 7, "kp-src": 7, sh: 1 }`. **Any fenced block §7 added would
land inside that slice and break that tally**, with a failure message about §6
that was really about §7 - the exact trap §4's slice hit when §5 was appended, and
which §4's slice now refuses by requiring §5's heading as an upper bound. §6.12
documented the dependence beside `SECTION_5_HEADING` **expressly so that the next
append would be a decision rather than an accident.**

**THE THREE OPTIONS AND WHY THIS ONE.** The choices were to bound §5's and §6's
slices the way §4's is bounded; to give §7's blocks a fence word colliding with
nothing and extend §6's pinned tally; or to paste no measured block. **§7 measures
almost nothing - it synthesises six sections that each hold their own figures to
their own logs** - so the only thing it could have pasted is the one run it drove
itself, §7.2's board census. **Bounding or widening a closed section's guard to
accommodate a block §7 does not need would be editing two sections' evidence
contracts for no evidentiary gain**, and `CLAUDE.md`'s rule that an agent does not
alter a closed section's guard points the same way. So §7 pastes nothing, cites
the one command that re-drives its one figure, and **three new cases in
`document-pastes.test.ts` make the decision checkable**: the first asserts that
§7's slice holds zero fenced blocks; the second **drives the hazard** by inserting
a fenced block into a copy of §7 in memory and asserting that §6's pinned tally
then disagrees, naming the fence word, with the unperturbed tally as its control;
the third asserts that all eight anchors - the head table and the seven sections -
are present **before** any index is compared, and then that they are in order,
because an ordering case written on bare `indexOf` passes when an earlier heading
has vanished. **All three were driven red in memory before being committed, and
no existing assertion was loosened.**

**WHAT THAT DOES AND DOES NOT ESTABLISH.** It establishes that §7 adds nothing to
any log's namespace and that the next agent who wants to paste output in §7 is
stopped by a named assertion rather than by a confusing §6 failure. **It
establishes nothing about §7's figures**, which are relayed from sections that
each carry their own coupling, and about the one figure §7 drove, which is
re-drivable in one command and is pinned to nothing. §1.11's standing caveat
applies unchanged and is not improved here.

### 7.7 Three deviations, recorded where a later reader would look for them

**(1) THE SYNTHESIS IS IN THIS DOCUMENT AND NOT IN ITS OWN, AND THAT REVERSES A
RULING.** During Task 3 the controller ruled that the synthesis would get its own
document, *"because a synthesis that lives inside the material it synthesises
cannot be read first."* That ruling was made without the Task 7 brief in front of
him, and the brief answers the concern directly with **a summary table at the head
of the document**. He withdrew the mechanism and kept the criterion: *"the
synthesis must be readable before the material"* stands, and the head table is
how it is met. **This repository's own rule is why the deviation is recorded
rather than silently taken**: a criterion binds and a mechanism is a guess from
someone who had not tried it, and the deviation belongs beside the thing it
changed. **The ruling and its withdrawal reach this document through the Task 7
controller instruction, which lives under `.superpowers/` and is gitignored** -
so this paragraph is the only committed record of either, which is why it quotes
both rather than citing them.

**(2) THE CONFINEMENT OF §1-§6 IS VERIFIED BY HEADING ANCHOR AND NOT BY THE
FIRST-N-LINES HASH EVERY ROUND SINCE TASK 3 HAS USED.** The head table is an
**insertion above §1**, so it moves every line of the document by a fixed offset
and **breaks a first-N-lines hash by construction.** That is expected, not a
violation. What was checked instead: the slice from §1's heading to §7's heading
in the child is byte-identical, up to its trailing newline, to the slice from §1's
heading to end-of-file in the parent, by SHA-256 - and the material above §1's
heading is the parent's material above §1's heading with exactly one contiguous
block inserted.

**ROUND 0 SAID "NOT ONE WORD OF §1-§6 IS EDITED" AND THAT IS NO LONGER TRUE, FOR
AN AUTHORISED REASON.** Fix round 1's controller narrowed the closed-section rule
to admit **two pointer blockquotes in §5** - at §5.8's heading and at §5.10's
mechanism 2 - because a falsified claim left where readers meet it, with the
correction filed only in the register, is the recording rule running backwards.
**No figure and no finding of §5 is touched**; the original wording stands beneath
each pointer. So the claim is now narrower and is checked rather than asserted:

| slice | SHA-256 | size |
| --- | --- | --- |
| parent `5ca6f2d`, `[§1 heading .. EOF]` | `b9fd12dd7cb770807766d44d521441259fe146000b1774ce5fa049ea64d13f9a` | 352 648 bytes / 352 125 chars |
| this round, `[§1 heading .. §7 heading]` | `f7fcde37f305331163a4d29cacb75d6f3a459586a6889702e6c2ddbf0f48eeff` | 354 369 bytes / 353 839 chars |
| **the same, with the two authorised pointer blocks removed** | **`b9fd12dd…64d13f9a` - the parent's, exactly** | **352 648 bytes / 352 125 chars** |

**That third row is the check, and it could have failed**: any other edit anywhere
in §1-§6 would leave a residue the removal does not account for, and the two
controls confirm the removal is not over-reaching - **taking out only one of the
two pointers does NOT reproduce the parent hash**, in either direction. The
pointers add **1721 bytes** between them and nothing else moved.

**AND THE 2026-10-23 FIX DISPATCH MOVED IT AGAIN, WITH EXACTLY ONE AUTHORISED
EXCEPTION INSIDE §1-§6 - WHICH IS THE FORM WORKING AS INTENDED RATHER THAN
BREAKING.** That dispatch corrected **one figure in §6.7**: the superseded
round-0 *"15 of 75 unit placements"* became the live **"53 of 255"**, the
population §6.5 actually measures. **It is the only byte of §1-§6 that moved**,
and this is the check, re-derived here by the method this subsection describes
rather than relayed:

| slice | SHA-256 | size |
| --- | --- | --- |
| parent `96a534c`, `[§1 heading .. §7 heading]` | `f7fcde37f305331163a4d29cacb75d6f3a459586a6889702e6c2ddbf0f48eeff` | 354 369 bytes / 353 839 chars |
| this round, the same slice | `9effe64a98a3edb906269cd0b1025f95dacb75d547cff761aff1760c00a754f6` | 354 370 bytes / 353 840 chars |
| **the same, with the one authorised figure put back** | **`f7fcde37…f0f48eeff` - the parent's, exactly** | **354 369 bytes / 353 839 chars** |

**The controls, each of which could have answered differently.** The un-reverted
child does **not** match the parent hash, so the check is not vacuous. **Exactly
one line of the whole slice differs**, counted independently of the hash, so no
second edit is hiding behind the first; the byte delta is **+1**, which is
`15 of 75` (8 characters) becoming `53 of 255` (9). And the **parent row above
reproduces fix round 1's published `f7fcde37…` exactly** from this subsection's
stated convention and nothing else - **that is the real test of the convention**,
because a boundary rule that did not reproduce the previous round's hash would be
a different rule wearing the same words. The preamble is byte-identical again
(`110ffcf2…`, 1696 bytes / 1695 characters).

**THE BINDING EVIDENCE IS A HASH, AND THE LENGTHS ARE CONTEXT.** The boundary
convention, stated because round 0 did not state it and a length cannot be
re-derived without one: the slice begins at the first byte of `§1`'s heading text
and ends at the first byte of `§7`'s, with trailing newlines collapsed to one; the
preamble is everything before the first byte of the inserted head table's own
line, **1696 bytes / 1695 characters**, byte-identical in parent and child. The
slice holds **511 non-ASCII characters** - 413 of them `§` - for a byte-minus-
character gap of **523**, which is why the unit has to be said.

**AND THOSE TWO NUMBERS BELONG TO THE `b9fd12dd…` SLICE, NOT TO EVERY SLICE -
WHICH IS WORTH A SENTENCE BECAUSE THE NEXT READER WILL RE-TAKE THEM AND GET
DIFFERENT ONES.** `[RAN]` 2026-10-23: **511 non-ASCII / 413 `§` / gap 523** are
exactly right for `5ca6f2d`'s `[§1 .. EOF]`, and the slice measured from fix
round 1 onward holds **518 non-ASCII / 420 `§` / gap 530** - the seven extra `§`
are in the two authorised §5 pointer blocks. **Both are correct and they are
figures about different slices**, which is the same disease as a length without
its unit: a figure stated without the material it is over cannot be re-derived.

**THE INSERTED HEAD TABLE'S LENGTH IS DELIBERATELY NOT PUBLISHED AS A FIGURE AT
HEAD, AND THE REASON IS THE THIRD INSTANCE OF A PATTERN THIS BRANCH SHOULD STOP
REPEATING.** Round 0 of this section published **4643** for it; that was a
character count labelled as bytes, the byte count was 4662, **and the same commit
that published the number also edited the head table and moved it** - from 4645
bytes at `7951a9d` to 4662 at `d855a5d`, a +17 shift this round moves again
because Important 2 and 3 edit the table a third time. **A length measured on the
thing the commit is editing cannot be correct inside that commit.** So: at
`d855a5d` the insertion was **4662 bytes / 4643 characters**, and a reader at any
later commit should re-take it from the boundary convention stated above rather
than trust that figure. **No command for it is pasted here, because §7 pastes no
fenced block at all** (§7.6) - and an `sh` fence added to this subsection would
turn §6's pinned fence tally red, which is the dependence §7.6 exists to state.
The convention is three lines of arithmetic: the byte length of the slice from the
first byte of the head table's own line to the first byte of §1's heading text.

**THE PATTERN, NAMED, BECAUSE THREE INSTANCES EARN A NAME.** A figure a task
publishes **about its own artifact** is invalidated by the task's own later edits,
and this branch has now done it three times: a stale count in a register clause,
§6.4's grep control, and these two lengths. **The fix is not more care at the end
of the round** - round 0 of this section re-ran its own check and still shipped
two wrong numbers, because it re-ran it before the edits that moved them. The fix
is to publish the **invariant** (a hash of material the change does not touch) and
to pin any self-measured length to **a named commit** with its unit stated, which
is what the two paragraphs above now do. **Units are half of it**: three of round
0's five published numbers were character counts labelled bytes, in a document
with 511 non-ASCII characters in the measured slice alone.

**AND THIS ROUND DEMONSTRATED THE SAME SHAPE A FOURTH TIME, FROM AN AUTHORISED
CHANGE RATHER THAN AN ERROR, WHICH IS THE SHARPEST VERSION OF IT.** Round 0
published `b9fd12dd…` under the claim *"Not one word of §1-§6 is edited"*, with
the figures offered *"so a later reader can re-take the same check"* - and fix
round 1 was then authorised to edit **inside** §1-§6, so the hash moved to
`f7fcde37…` and round 0's sentence became false without anybody making a mistake.
**A hash is only invariant over material nobody is later permitted to touch**, and
the durable form is the one the table above now uses: **the parent's hash, plus
the enumerated exceptions, plus a check that removing exactly those exceptions
reproduces it.** That form survives the next authorised edit; a bare hash and a
bare length do not. **G276** carries the pattern and all four demonstrations, and
its 2026-10-23 amendment carries the **one-byte off-by-one** two independent
implementations of this check hit from the same cause - §5.10's pointer
blockquote is preceded by **two** newlines, not one.

**(3) THE 2026-10-23 FIX DISPATCH NARROWED THE CLOSED-SECTION RULE A SECOND TIME,
AND CORRECTED FIVE QUOTATIONS - TWO OF WHICH PUT WORDS IN SOMEBODY'S MOUTH.** It
is recorded here for the same reason (2) is: the rule it narrows was stated in
this subsection, and the next reader checking whether §1-§6 is confined needs the
exceptions enumerated rather than discovered.

**THE AUTHORISED EDIT INSIDE §1-§6 WAS ONE FIGURE**, §6.7's, and the table in (2)
above is the check. **THE FIVE QUOTATION CORRECTIONS**, all in §7 or the head
table, each verified against its source after the change:

| where | what it said | what the source says |
| --- | --- | --- |
| **§7.1 row 14** | **G260** quoted as *"how much overlap is acceptable, and under what count or what kind of overlap it stops being acceptable"* | **that string is in no entry.** It spliced the head of one **G260** clause to the tail of its criterion, **160 lines apart, with no elision marked**. The row now quotes the criterion as §7.5(1) does, contiguous and in full |
| **§7.7 (2)** | round 0's hash described as *"invariant under every later edit outside §1-§6"* | **round 0 wrote no such sentence** - `[RAN]` zero matches at `7951a9d` and at `d855a5d`. What it wrote is *"Not one word of §1-§6 is edited"*, which is what the paragraph now quotes. **G276**'s instance-4 row carried the same invented string and is corrected with it |
| **§7.1 row 18** | **G232**'s Task 21 amendment quoted as *"values that are real electrical parameters that MUST be drawn"* | the entry reads *"capacitors whose values **are** real electrical parameters that MUST be drawn"* - one word altered inside the quotation marks. The quoted span now starts at *"are"* |
| **§7.1 row 11** | the H3 refusal quoted as *"label `hi_boost_out` overlaps wire 33"* | the log line is *"label hi_boost_out **at (34.29, 64.77)** overlaps wire 33 of …"* - an unmarked elision. Now quoted as §5.1 quotes it, *"overlaps wire 33"*, with the label named outside the quotation marks |
| **head table** | §1's finding quoted as *"13 of 15 survive all three quantities"* | §1's row says *"13 of 15 recorded field fallbacks survive all three measured quantities"*. It is now a paraphrase without quotation marks |

**THE SWEEP THAT FOUND THEM, AND ITS LIMIT.** `[RAN]` every double-quoted span of
eight characters or more in the head table and in §7 - **46 spans** - was
normalised for soft wraps and emphasis and searched for in `docs/known-gaps.md`,
`CLAUDE.md`, this document, both prior-art documents, the plan, and the four
source files §7 cites. **Five did not reproduce and are the table above; the
other forty-one did**, including every quotation of the register, of `CLAUDE.md`
and of the owner. **The limit is that a quotation whose source is not in the tree
cannot be checked this way**: the head table's third-party review quotation and
§7.0's quotation of an uncommitted earlier draft of its own paragraph were both
read by hand and left as they are, the first because its one alteration is
bracketed and the second because it quotes a working tree that was never
committed and says so.

### 7.8 What §7 did NOT establish

- **It elects nothing, recommends nothing, authors no acceptance criterion and
  schedules no work.** §7.5 names three decisions and answers none.
- **It re-measured nothing that an earlier SECTION measured.** Every figure above
  is relayed from the subsection cited beside it, with one exception marked
  `[RAN, CONFIRMED]`: §7.2's board census, which this writer drove and read in
  full. **That census is not new either** - **G259**'s Task 25 amendment took it
  with the same tool and §7 agrees with it - **but the per-board `validateCircuit`
  counts in §7.2's table were tallied from the run here for the first time**, and
  `pt2399-core`'s 18 is the one of the six that an earlier entry had published.
- **It drove no approach in §7.1.** Every *what it would fix* entry is a relayed sweep verdict
  or an explicit unknown. **The four INTEGRATION HYPOTHESIS rows are not equally
  empty**, and an earlier draft said they had *"no figure of any kind"* behind
  them, which is false of two: **row 14 carries zero-of-eight on refusal** and the
  five-board and `tp-stage` structure behind its unknown, and **row 16 carries the
  five-readability-numbers count and the `FieldFallback` population it would be
  computed from.** Rows 10 and 17 are the two with no figure at all - row 10 was
  never swept and row 17 was never driven.
- **It did not re-grade §5's or §6's counts under §1's quantities**, did not sweep
  row 10, did not perturb a power symbol, and produced no drawing. §7.4 is the
  list and this bullet is not a second one.
- **It did not re-derive the two §6 claims a widened corpus falsified**, and does
  not restate them: *"no arm is worse by count"* is false at the full corpus
  (worst 54 against production 53) and *"the corpus's only text-over-text overlap
  is an artefact of the walk"* is a quarter right (four cover text, one moves
  under reordering, three do not). **Row 13 is written against the superseding
  figures and says in its own entry that re-walking is not free.**
- **IT OPENED NONE OF THE PRIMARY SOURCES §1-§6 READ.** Not `autoplace_fields.cpp`,
  not `newstroke_font.cpp`, not Knuth and Plass, not Wolff, not lepton-eda or
  xschem, not the Altium or OrCAD pages. **§7's grades of those sections' evidence
  are grades of what each section RECORDS about its own retrieval**, which is
  exactly why §7.0's levels are about where a capability was shown to work and not
  about whether this writer saw it. A section that mis-stated its own retrieval
  would be mis-graded here and nothing in §7 could have caught it.

---
