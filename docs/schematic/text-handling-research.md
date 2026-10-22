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
