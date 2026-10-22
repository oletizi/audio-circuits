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
committed, at repository commit `757c4dd` with a clean tree, against
`kicad-cli` **10.0.5**, `pcbnew` build **10.0.5**, and `newstroke_font.cpp` at
KiCad tag `10.0.5`, SHA-256
`dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9`. **The probe
refuses a font blob with any other hash**, so a figure here cannot have come
from an unknown font. Re-drive it with:

```
curl -sSL -o /tmp/newstroke_font.cpp \
  https://gitlab.com/kicad/code/kicad/-/raw/10.0.5/common/newstroke_font.cpp
bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp
```

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
| **3. `kicad-cli` SVG and PDF** `[RAN]` | worked, **with one hole** | **Q2 in situ** and the three constants that place a field's ink against its anchor, from an SVG export of items `lib/schgen/render/emit-items.ts` itself emitted. **The SVG export does not draw a global label's outline**, so the label outline comes from the PDF export's own vector coordinates instead |

**Route 1 and route 2 agree exactly.** Over all 264 distinct strings the eleven
boards emit:

```
route 1 vs route 2, GetTextBox width: worst disagreement 0.0 um on ""
route 1 vs route 2, stroked-outline width: worst disagreement 0.0 um on "TestPoint"
```

**Route 1 placed by route 3's constants agrees with route 3 to 0.3 um**, which
is three ten-thousandths of a grid step and is the SVG export's own coordinate
resolution.

### 1.2 The glyph set the eleven boards actually emit `[RAN]`

```
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
distinct characters on boards that reach the drawing (50): "." "0" … "_" "e" "i" "m" "n" "o" "p" "r" "s" "t" "u" "x"
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

```
CLAIM DRIVEN AND NOT REPRODUCED: no glyph of this corpus has a stroke outside [0, advance].
over the whole printable-ASCII range the count is 1: "\\"
```

**Over the whole printable-ASCII range exactly one glyph overhangs its advance -
the backslash - and it is not in this repository's corpus.** The claim is
correct in principle and inert here, which is a result about the font and not a
criticism of the review.

### 1.4 Q3, `EDA_TEXT::GetTextBox`, transcribed and then driven

`[READ]`, composed in the source's own order:

```
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
not draw with. The difference is 6.35 um and reaches no conclusion here; it is
recorded so the next person who finds the two numbers does not take one for a
transcription error.

### 1.5 Q2, the rendered ink, and the three constants that place it

Route 3 emitted real `partSymbol` and `globalLabel` nodes - **built by
`lib/schgen/render/emit-items.ts`, not hand-written** - exported them with
`kicad-cli sch export svg`, and measured the stroke geometry. `[RAN]`:

```
R100 left rot0         paths= 56 ink x[337.3,4844.0] y[-766.7,655.7]
R100 right rot0        paths= 56 ink x[-4783.6,-276.9] y[-766.7,655.7]
R100 center rot0       paths= 56 ink x[-2223.1,2283.6] y[-766.7,655.7]
R100 left rot90        paths= 56 ink x[337.3,4844.0] y[-766.8,655.6]
R100 left rot180       paths= 56 ink x[337.3,4844.0] y[-766.8,655.6]
R100 left rot270       paths= 56 ink x[337.3,4844.0] y[-766.7,655.7]
drawn pen 152.4 um; anchor to pen origin 111.1 um; anchor to baseline 519.0 um
route 1 placed by route 3's constants vs route 3's own measurement: worst edge disagreement 0.3 um
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

```
CONTROL: ten 'I' measured 5595.6 um, predicted from one 'I' plus nine advances 5595.3 um, difference 0.3 um
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

```
margin    = KiROUND( m_LabelSizeRatio * GetTextSize().y )     // DEFAULT_LABEL_SIZE_RATIO 0.375
halfSize  = GetTextHeight() / 2 + margin
linewidth = GetPenWidth()                                     // SCH_TEXT: GetEffectiveTextPenWidth()
symb_len  = GetTextBox().GetWidth() + 2 * margin
x = symb_len + linewidth + 3 ;  y = halfSize + linewidth + 3
```

and for `L_BIDI`, the shape `emit-items.ts` writes, the outline runs
`x + 2 * halfSize` along the label's side and `y` either side of it. `[RAN]`
against the PDF's own coordinates:

```
A                PDF outline along  4645.3 across 2540.8 um; sch_label.cpp predicts along  4643.8 across 2540.0; (net.length + 2) * GRID predicts along  3810.0 across 2540.0
ABC              PDF outline along  7185.3 across 2540.8 um; sch_label.cpp predicts along  7183.8 across 2540.0; (net.length + 2) * GRID predicts along  6350.0 across 2540.0
VCC              PDF outline along  7185.3 across 2540.8 um; sch_label.cpp predicts along  7183.8 across 2540.0; (net.length + 2) * GRID predicts along  6350.0 across 2540.0
BYPASS_CAP       PDF outline along 15289.1 across 2540.8 um; sch_label.cpp predicts along 15287.6 across 2540.0; (net.length + 2) * GRID predicts along 15240.0 across 2540.0
BUFFER_EMITTER   PDF outline along 19280.4 across 2540.8 um; sch_label.cpp predicts along 19279.1 across 2540.0; (net.length + 2) * GRID predicts along 20320.0 across 2540.0
route 1+2 outline formula vs the PDF's own coordinates: worst disagreement 1.5 um
```

**`outlineExtent` is not conservative; it is wrong in both directions.** It
UNDER-reserves by **835 um** for a one- and three-character net name and
OVER-reserves by **1040 um** for a fourteen-character one, crossing over at
about ten characters. The reason is visible in the formula: the real outline is
`text width + a constant 3333.75 um of arrow ends and margins`, and
`(n + 2) * GRID` models that constant as two character widths, which is only
right when a character happens to be a grid step wide. **Across its side the two
agree to 0.8 um** - `halfSize + linewidth` is 1270.0 um, exactly `GRID` - which
is a coincidence of `0.375 + 0.5` landing on `1 - 1/8`, not a design.

### 1.7 THE ERROR TABLE `[RAN]`

264 distinct strings, each measured under all three quantities. The whole table
is in the probe's output; here are its shape and its extremes.

```
estimate / glyph advance sum:   n=264 min 0.955 p25 1.037 median 1.091 p75 1.200 max 1.448; the estimate is SMALLER than this quantity for 11 of 264 strings
estimate / rendered ink:        n=264 min 1.005 p25 1.119 median 1.182 p75 1.238 max 1.865; the estimate is SMALLER than this quantity for  0 of 264 strings
estimate / EDA_TEXT::GetTextBox: n=264 min 0.881 p25 0.992 median 1.051 p75 1.159 max 1.303; the estimate is SMALLER than this quantity for 70 of 264 strings

estimate minus glyph advance sum:    widest OVER-estimate 5019.5 um (3.95 grid steps) on "si_hi_boost_j20_p3"; widest UNDER-estimate 302.4 um (0.24 grid steps) on "100mH"
estimate minus rendered ink:         widest OVER-estimate 5350.9 um (4.21 grid steps) on "si_hi_boost_j20_p3"; the estimate is never smaller - its narrowest margin is 29.0 um on "200mH"
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

```
widest disagreement between two measured quantities: 795.6 um (0.63 grid steps) on "[2]", rendered ink vs EDA_TEXT::GetTextBox
```

In width the three are within **0.63 grid steps** of each other over the whole
corpus, and the ordering is always the same: ink < advance < box. **In height
they are not close**: 1422.4 (ink) against 2043.1 (box) is a **44% difference**,
and that is what makes Step 0's election consequential rather than academic -
see §1.9, where the height is what changes the survivor counts.

### 1.9 The repository's own collision figures, re-taken once per quantity

**The control first, because without it none of this means anything.** The
probe runs a parallel copy of `placeFields` whose only difference is which
function returns a text box. Under the current ruler it must reproduce
`lib/schgen/render/field-placement.ts` exactly. `[RAN]`:

```
CONTROL PASSED: over 10 laid-out blocks the parallel search reproduces
lib/schgen/render/field-placement.ts exactly, block, unit, lib id, cost and covers.
```

That control can fail: it compares two independent code paths over the same
geometry, including the rounded weighted cost and every `covers` string, and an
error in the copy would move one of them. It also reproduces **G260**'s
published population exactly - fifteen fallbacks, distributed `ob-buffer` 2,
`oc-power` 1, `pt-core` 8, `tp-stage` 4 - which is corroboration from a second
code path of a number that had one.

#### G239's five-of-eleven slots `[RAN]`

```
Jumper:Jumper_2_Open     body 5080.0 x 2286.0 um
    length x GRID (current model)  grown pair 7620.0 x 2540.0   inside slots that fit: 0 of 5
    glyph advance sum              grown pair 7136.2 x 2540.0   inside slots that fit: 0 of 5
    rendered ink                   grown pair 6865.3 x 2692.4   inside slots that fit: 0 of 5
    EDA_TEXT::GetTextBox           grown pair 7358.4 x 3313.1   inside slots that fit: 0 of 5
Device:C                 body 4064.0 x 2032.0 um
    length x GRID (current model)  grown pair 7620.0 x 5080.0   inside slots that fit: 0 of 5
    glyph advance sum              grown pair 7136.2 x 5080.0   inside slots that fit: 0 of 5
    rendered ink                   grown pair 6865.3 x 5232.4   inside slots that fit: 0 of 5
    EDA_TEXT::GetTextBox           grown pair 7358.4 x 5853.1   inside slots that fit: 0 of 5
Device:C_Polarized       body 4572.0 x 3810.0 um
    length x GRID (current model)  grown pair 7620.0 x 5080.0   inside slots that fit: 0 of 5
    glyph advance sum              grown pair 6531.4 x 5080.0   inside slots that fit: 0 of 5
    rendered ink                   grown pair 6260.5 x 5232.4   inside slots that fit: 0 of 5
    EDA_TEXT::GetTextBox           grown pair 6753.7 x 5853.1   inside slots that fit: 0 of 5
Audio:PT2399             body 20320.0 x 30480.0 um
    length x GRID (current model)  grown pair 6350.0 x 2540.0   inside slots that fit: 5 of 5
    glyph advance sum              grown pair 6229.0 x 2540.0   inside slots that fit: 5 of 5
    rendered ink                   grown pair 5837.2 x 2692.4   inside slots that fit: 5 of 5
    EDA_TEXT::GetTextBox           grown pair 6451.3 x 3313.1   inside slots that fit: 5 of 5
```

**G239's finding survives all three quantities, and gets stronger under two of
them.** Its arithmetic rests on HEIGHT, which real geometry makes larger, not
smaller. The jumper's Value is emitted hidden (**G257**) so its grown block is
one line: **2540.0** um in the model, **2692.4** of ink, **3313.1** of KiCad's
box, against a 2286 um body. The capacitors keep both lines: **5080.0** in the
model, **5232.4** of ink, **5853.1** of KiCad's box, against a 2032 um body.
The PT2399 row is the positive control and it could have moved; it does not.

#### The jumper, and the figures in the plan's *state* section `[RAN]`

- *"the jumper's Value is seven times wider than its body"*: `Jumper_2_Open` is
  **16510.0** um under the current model and **14364.3** of ink, against a
  2286 um body - **7.2x becomes 6.3x**. The claim survives; its number moves by
  13%.
- *"5080 um of Reference-and-Value into a 2286 um body"*: for `Device:C` the
  grown pair is 5080.0 um in the model, **5232.4** of ink and **5853.1** of
  KiCad's box. **The figure is an UNDER-statement**, by up to 15%.

#### G260's fifteen fallback placements `[RAN]`

```
block                               length x   glyph adv  rendered   EDA_TEXT:
opamp-buffer/ob-buffer                      2          2          2          3
optical-compressor/oc-power                 1          1          1          2
pt2399-core/pt-core                         8          6         11         13
transistor-preamp/tp-leg-upper              0          0          0          0
transistor-preamp/tp-leg-feedback           0          0          0          0
transistor-preamp/tp-leg-lower-a            0          0          0          0
transistor-preamp/tp-leg-lower-b            0          0          0          0
transistor-preamp/tp-leg-collector          0          0          0          0
transistor-preamp/tp-leg-emitter-bypass     0          0          0          0
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

```
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
`text width + 3333.75 + GRID/2 + text width`. **So four of this repository's
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
  difference; and the PDF's label outline is **1.5 um** longer than
  `sch_label.cpp` predicts. Both are under 1% of a grid step and neither was
  diagnosed.
- **It does not establish what KiCad's eeschema `SCH_FIELD::GetBoundingBox`
  returns**, as distinct from the `EDA_TEXT::GetTextBox` it is built on. KiCad
  ships no eeschema Python bindings, so Q3 is measured through `PCB_TEXT`; the
  shared primitive is the same code and the figure was checked against two other
  routes, but a field-level margin applied only in eeschema would not have been
  seen.
