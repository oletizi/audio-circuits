# `pultec-low-boost` drawn in Ian Thompson-Bell's layout idiom

**Date:** 2026-10-29
**Circuit:** `pultec-low-boost` — 19 parts, 14 nets, netlist exactly as KiCad
exports it from this project's model.
**Layout reference:** Ian Thompson-Bell's 2012 hand-drawn "3 BAND PULTEC STYLE
EQ" (`docs/pultec/P3bandDoc.pdf` page 5), used as a **layout** reference only,
rendered with ordinary KiCad symbols and conventions as the owner instructed.
**Tool:** `akcli-kicad` 0.22.0 from PyPI, installed into a scratchpad venv.
Nothing was installed into the repository.

**STATUS: v3 ACCEPTED BY THE OWNER WITH ONE NAMED DEFECT. v4 IS UNREVIEWED.**
His verdict on v3 is quoted verbatim in "The owner's verdict on v3" below. v4 is
the response to it and is in the state `EVALUATING-DRAWINGS.md` §1 calls
**unreviewed**, which it describes as *"a state, not an absence"*. Only the
owner can change it, and no check run here advances it. Everything in the
"What is on the page" sections is an observation a reader can check against the
rendered file. No quality claim is made or implied anywhere in this document.

## The deliverable

| | |
| --- | --- |
| **Current page (PDF)** | `docs/research/2026-10-29-low-boost-in-thompson-bell-idiom/low-boost-itb-v4.pdf` |
| **Current page (PNG)** | `docs/research/2026-10-29-low-boost-in-thompson-bell-idiom/low-boost-itb-v4.png` |
| **Current sheet** | `docs/research/2026-10-29-low-boost-in-thompson-bell-idiom/low-boost-itb-v4.kicad_sch` |
| **v3 — the page the owner accepted** | `…/low-boost-itb-v3.pdf`, `…-v3.png`, `…-v3.kicad_sch` |
| **v1 — the first attempt** | `…/low-boost-itb-v1.pdf`, `…-v1.png`, `…-v1.kicad_sch` |
| **Op-lists** | `…/ops-v1.json`, `…/ops-v2.json`, `…/ops-v3.json`, `…/ops-v4.json` |
| **Netlists / ERC reports** | `…/netlist-v{1,2,3,4}.xml`, `…/erc-v{1,2,3,4}.rpt` |
| **Scripts** | `…/scripts/{build.sh,build4.sh,compare.py,crossings.py,measure.py,place_fields.py,fields-v4.py}` |

v1 to v3 are A3 landscape; v4 is A4 landscape, for the reason given under
"The owner's verdict on v3". Every coordinate in the op-lists is a literal
written by hand; no code computes a placement. `place_fields.py` (v1-v3) and
`fields-v4.py` carry literal tables of field positions and transcribe them —
the table is the decision, not an algorithm.

**The document below is in two halves.** The first describes v1 to v3 and is
left as it was written, because the owner's verdict was given on v3 and the
reasoning he was responding to has to survive intact. The second half, from
"Owner's verdict, 2026-10-29 - v3" onward, is v4.

## The judgement the brief asked for: where the `SI*` stand-ins go

**They go exactly where the section each one replaces sits in Ian's drawing.**

The brief gives the stand-ins as `SI1`..`SI8` with no section names, so the
first step was to recover which section each one is. `circuits/pultec/physical/low-boost.ts`
names them, and the model's own ids settle it (dumped with a throwaway script,
not committed):

| Brief | Model id | Section it stands in for | Where it is in Ian's drawing |
| --- | --- | --- | --- |
| SI1 `0R`, SI2 `47K` | `SI_HI_BOOST_RV_HI_BOOST.{ccw-wiper,wiper-cw}` | **hi boost**, the 47K LIN pot split at one end of travel | **on the spine**, left of centre |
| SI3 `.047uF` | `SI_HI_CUT_C26` | **hi cut** | **below the spine**, centre |
| SI4 `430R` | `SI_HI_CUT_R1` | **hi cut** — this is Ian's literal `430` | **below the spine**, centre |
| SI5 `0R`, SI6 `4.7K` | `SI_HI_CUT_RV_HI_CUT.{ccw-wiper,wiper-cw}` | **hi cut**, its pot split | **below the spine**, centre |
| SI7 `0R` | `SI_LOW_CUT_RV_LO_CUT.ccw-wiper` | **lo cut**, its pot flat | **on the spine**, right of centre |
| SI8 `100K` | `SI_MID_R_MID_SHUNT` | **mid**, its shunt resistor | **far left, dropping from the IN node to 0V** |

Three facts made this placement choose itself rather than being invented:

1. **The topology already agrees with Ian's geography.** SI1+SI2 sit in series
   between `in` and `hi_boost_out` — precisely the span Ian's HI BOOST 47K LIN
   pot occupies on his spine. SI7 sits in series between `hi_boost_out` and
   `out` — precisely the span his LO CUT 470K pot occupies. SI8 sits from `in`
   to 0V — precisely where his `100K` hangs. The hi-cut group bridges
   `hi_boost_out` down to `lo_boost_in`, which is where his HISWB/`430`/HI CUT
   column hangs.
2. **`SI4` is Ian's `430` resistor**, under a different name. A stand-in that is
   literally a part on the reference drawing belongs at that part's position.
3. **The alternative — parking the stand-ins in a block of their own — would
   have put the signal path's own series elements off the spine**, which breaks
   the one arrangement feature the owner named first.

Two further decisions follow from this one and are recorded so they can be
disagreed with:

- **The stand-ins are labelled by their section and their state**, as free text
  beside them: `HI BOOST (flat)`, `HI CUT (flat)`, `LO CUT (flat)`,
  `MID shunt (flat)`. "Flat" is the model's own word — `standInFlat()` in
  `circuits/pultec/physical/board.ts` is the setting the group was derived at.
  Two further lines of free text in the middle of the sheet say
  `SI1-SI8 stand in for the other four sections, each at its flat setting.` and
  `A low-boost build does not populate them.`
- **They are drawn at full size with ordinary symbols**, not shrunk, greyed or
  boxed. Nothing in KiCad's conventions distinguishes a do-not-populate part
  from a fitted one at symbol level, and inventing a convention for it was not
  asked for.

## The other layout decisions

- **One signal spine at a constant height** (y = 2200 mil, 55.9 mm from the top
  edge), running from x = 1000 to x = 15400 mil. `in` labels its left end, `out`
  its right end. Three parts sit on it: SI1, SI2, SI7.
- **0V as a single horizontal rail** at y = 9500 mil, running x = 1000 to
  13700. Fourteen things land on it. One `power:GND` symbol at the left end
  names the net; one `PWR_FLAG` on a 500-mil stub below the rail satisfies
  KiCad's power-driver check.
  **The rail stops at x = 13700 — the right-most ground connection — rather
  than running to the sheet edge as Ian's does.** v1 ran it to x = 15400 and the
  render showed it passing **through KiCad's A3 title block**, which occupies
  roughly x > 11780, y > 9880 mil. That is the one place where a KiCad sheet's
  furniture and Ian's idiom conflict, and the rail gave way.
- **A second horizontal, for `lo_boost_in`**, at y = 6000 mil from x = 4000 to
  14600. Ian carries this node as a vertical column; this page carries it as a
  horizontal because seven pins sit on it and they are spread across the width.
- **Everything hangs vertically off one of those two horizontals.**
- **The six-way selector and its cap bank occupy the centre-bottom**, as Ian's
  LOSWB bank does. The six caps are in a row at 900-mil pitch, each dropping
  straight to the 0V rail.
- **The fan from the rotary to the caps is ordered so that it cannot cross
  itself.** `Switch:SW_Rotary_1x6_MP` puts pins 1..6 in a 100-mil column on its
  right, top to bottom. Each selector wire runs right then down. A horizontal at
  height *h* crosses a drop that starts below *h*, so the rule is: **the further
  right the cap, the higher its switch pin.** Pin 6 therefore takes the leftmost
  cap and pin 1 the rightmost, which puts the caps in ascending value order
  left to right (`.033 .047 .068 .12 .22 .33 uF`).
- **J1's four signal pins carry local net labels rather than wires.** J1 is the
  board-to-board junction; its pins are `in`, `hi_boost_out`, `lo_boost_in`,
  `out` and GND, and those four nets are at four widely separated places on the
  sheet. Wiring them would have added four long cross-page runs to an
  arrangement whose whole point is that the signal path is one straight line.
  The same four labels appear on the spine and the sub-spine. **J1 pin 5 is
  wired, not labelled** — it runs right 1700 mil then down to the rail.
- **J2 (five pins, all ground) is rotated 90° so its pins point down**, and all
  five drop straight to the rail with no horizontal run at all.
- **SW1's `MP` lug is left on no net**, as the spec states. It is the one ERC
  error that remains, and it is correct.

## Verification

### 1. Netlist round-trip — `kicad-cli sch export netlist --format kicadxml`

Compared member-by-member against the spec by `scripts/compare.py`, which
matches on the **set of pins**, so a net that is drawn under a different name
still reports as a match and says so.

```
SPEC NET           N  RESULT
0                 14  MATCH (drawn as 'GND')
Net-(C1-Pad2)      2  MATCH      Net-(SI1-Pad2)     2  MATCH
Net-(C2-Pad2)      2  MATCH      Net-(SI3-Pad2)     2  MATCH
Net-(C3-Pad2)      2  MATCH      Net-(SI4-Pad1)     3  MATCH
Net-(C4-Pad2)      2  MATCH      hi_boost_out       4  MATCH
Net-(C5-Pad2)      2  MATCH      in                 3  MATCH
Net-(C6-Pad2)      2  MATCH      lo_boost_in        7  MATCH
                               out                3  MATCH

NETS IN THE DRAWING NOT IN THE SPEC: 1
    unconnected-(SW1-PadMP) -> ['SW1.MP']

spec nets: 14   drawn nets: 15   spec nets unmatched: 0
```

**All fourteen spec nets match pin-for-pin.** Identical for v1, v2 and v3 — the
two rewrites moved geometry and changed nothing electrical.

**What differs, exactly two things, both expected:**

- **The ground net is named `GND`, not `0`.** Its fourteen members are identical
  to the spec's. The name comes from the `power:GND` symbol, which is how KiCad
  names a rail. Naming it `0` would have required writing `0` as the power
  symbol's value, which asserts a name the KiCad library does not use.
- **`unconnected-(SW1-PadMP)` is a fifteenth net** with one member. The spec
  says `SW1.MP is a mechanical mounting lug, on no net`; KiCad represents a pin
  on no net exactly this way.

### 2. `kicad-cli sch erc`

| | violations | what they were |
| --- | --- | --- |
| **v1** | **2** | `pin_not_connected` on SW1.MP; `power_pin_not_driven` on the GND symbol |
| **v2** | **1** | `pin_not_connected` on SW1.MP |
| **v3** | **1** | `pin_not_connected` on SW1.MP |

The `power_pin_not_driven` error was removed by adding a `PWR_FLAG` to the
ground rail — KiCad's standard answer when a schematic has no power source
symbol on it. The remaining error is the mechanical lug and is correct.

### 3. `akcli check --layout --erc --nets`

| | findings | what they were |
| --- | --- | --- |
| **v1** | **2** | `ERC_DANGLING_NET` and `NET_SINGLE_PIN`, both on SW1.MP |
| **v2** | **2** | same two |
| **v3** | **2** | same two |

**The count did not move, and that is the finding worth recording.** The
previous trial (`docs/research/2026-10-28-trial-kicad-emitting-tools.md`) took
this lint from 22 to 13 to 1 — but it was placing labels on facing pins and
power symbols on part bodies, which is what this lint measures. This page was
laid out against those known failure modes from the first attempt, so the lint
had nothing to say about it even on v1.

**AND THE LINT WAS SILENT ABOUT BOTH DEFECTS THE FIRST PAGE ACTUALLY HAD.**
Measured on v1, with zero `LAYOUT_*` findings:

- **C1..C6's value text was drawn across the capacitor's own lower plate**, all
  six of them — `crop-v1-cap-value-over-plate.png`.
- **RV1's reference and value were drawn inside the potentiometer's body**,
  together with its three pin numbers — `crop-v1-pot-fields-over-body.png`.
- **The 0V rail and the GND symbol ran through the title block.**

This is `EVALUATING-DRAWINGS.md` §6 happening in miniature: *"an automated check
is peripheral by definition"*, and *"a page with no findings is not thereby
good."* Three real defects, zero findings, and the one thing the lint did report
was the one thing that was correct.

### 4. Wire crossings — `scripts/crossings.py`

Counts every horizontal/vertical wire pair whose intersection is interior to
both segments and has no junction dot on it.

```
v1   53 segments (21 horizontal, 32 vertical), 21 junctions   crossings: 0
v2   54 segments (21 horizontal, 33 vertical), 22 junctions   crossings: 0
v3   54 segments (21 horizontal, 33 vertical), 22 junctions   crossings: 0
```

**Zero wire crossings on all three pages.**

## What is on the page (v3) — observations

Positions are given relative to the two horizontals so a reader can find them.

- **The signal spine is one straight horizontal line across the full width** at
  a constant height. Left to right on it: `in` label, a junction where SI8's
  drop leaves, SI1 (`0R`), SI2 (`47K`), a junction where SI5's drop leaves, a
  run of about 8700 mil carrying the `hi_boost_out` label at its midpoint, SI7
  (`0R`), a junction where R1's drop leaves, `out` label.
- **Nothing is drawn above the spine** except four free-text labels and the
  references/values of the three parts on it.
- **SI8 (`100K`) is a single vertical** from the spine to the 0V rail at the far
  left, 7300 mil long, with the part body in its lower third.
- **The hi-cut group hangs below the spine as an inverted Y**: SI5 drops to a
  node, that node branches right 1000 mil to SI6 (`4.7K`), and continues down
  through SI4 (`430R`) and SI3 (`.047uF`). Both branches land on the
  `lo_boost_in` horizontal.
- **R1 (`56K`) is a single vertical at the far right** joining the spine's `out`
  end to the right end of the `lo_boost_in` horizontal, 3800 mil long.
- **The `lo_boost_in` horizontal has four things on it**: SI3 and SI6 arriving
  from above at its left end, the rotary's common arriving from below at
  x = 6400, RV1's drop leaving downward at x = 13700, and R1 at its right end.
  Its label sits at the midpoint of the longest empty run.
- **SW1 is drawn as a six-throw rotary** with the rotor arrow, six numbered
  contacts in a column on its right, pin 7 on its left and the `MP` lug below
  pin 7. Its reference and value sit below the body.
- **The six selector wires fan out to the right** in six nested right-angles,
  each dropping to its capacitor. The six capacitors sit in a row, each with
  reference above and value below, to the right of the plates, and each drops
  straight to the rail with a junction dot where it lands.
- **RV1 is drawn with its wiper arrow pointing left**, and the wiper is tied to
  the top terminal by a three-segment bracket 350 mil square. `LO BOOST` sits to
  its right. Its reference and value sit between the body and that text.
- **J1 is at the lower left with its five pins facing right.** Four short stubs
  carry the labels `in`, `hi_boost_out`, `lo_boost_in`, `out`, stacked at
  100-mil pitch. Pin 5's wire runs right past them and then down to the rail.
  `J1` and `1x05` sit above the connector.
- **J2 is below J1, rotated so its pins face down**, with five parallel 500-mil
  drops to the rail at 100-mil pitch. **Its five pin numbers are overprinted by
  those five drops** — the pin numbers belong to the symbol and cannot be moved
  without editing the library.
- **Text overlaps anywhere on the sheet: one**, the J2 pin numbers just
  described. Every reference and value was checked against the geometry around
  it and moved off by hand.
- **Empty area:** a region about 6500 mil wide and 3000 mil tall in the
  upper-middle of the sheet, between the hi-cut group and R1 and between the two
  horizontals, holds only the two lines of explanatory text. It is empty because
  the two sections that fill the corresponding area of Ian's page — mid and hi
  cut — are four small parts here.

## Compared with Ian's arrangement — observations, not rankings

**What this page does the same way:**

- One horizontal signal spine at constant height, input at the far left, output
  at the far right, with the series elements of the signal path sitting on it.
- 0V as one horizontal rail along the bottom, with everything's return dropping
  straight down to it.
- The selector and its capacitor bank in the centre-bottom, caps in a row,
  each cap's far end on the rail.
- The lo-boost pot drawn with its wiper strapped to one end by a small bracket,
  dropping to the rail.
- The `56K` as a single vertical at the far right from the output node down to
  the lo-boost node.
- Functional names as free text beside the thing they name, not boxed.
- Values shown beside every part.

**What differs:**

| | Ian | This page |
| --- | --- | --- |
| `lo_boost_in` | a **vertical column** crossing the spine, with one horizontal tie running left from the `56K` | a **horizontal** at mid-height, with everything hanging off it |
| Above the spine | two capacitor banks (HI SWA, LOW SWA) and the Q network | **nothing** |
| Reference designators | none — values only | both, per normal KiCad practice (as the brief permits) |
| 0V rail | runs to the sheet edge, terminal circle at its right end | stops at the right-most ground connection, to stay out of the title block |
| Input/output terminals | hand-drawn circles marked `IN` / `OUT` | KiCad local labels `in` / `out` at the wire ends |
| Board-to-board interface | not present — the whole EQ is on one page | J1 and J2 drawn as 1x05 connectors in the lower left |
| Switch mechanism | drawn by hand as contacts and a wiper arm | `Switch:SW_Rotary_1x6_MP`, the real KiCad symbol, `MP` lug and all |
| Density | the page is close to full | one region of about a fifth of the drawing area is empty |
| Cap bank order | I could not determine it from the scan | ascending capacitance left to right, forced by the no-crossing fan rule |

---

## Owner's verdict, 2026-10-29 — v3

Shown the rendered page with no commentary and asked whether it worked well
enough to consider:

> *"yes. The most important aspect is readability, which it has adequately. It's
> got a lot of empty space (i suspect you copied the layout of the reference and
> deleted sections without compacting the diagram. The expanded white space,
> while not always bad, in this case obscures the relationships of the circuit
> components somewhat—it's actually kind of hard to scan a ling thin wire across
> an entire page"

**His diagnosis is confirmed by this document's own record.** The observations
above already state that the empty region exists *"because the two sections
filling that area on Ian's page are four small parts here"* - the reference's
geometry was kept while its content shrank.

**Status: approved for consideration, with a defect named.** The defect is his;
the remedy is the draughtsman's to derive, per `EVALUATING-DRAWINGS.md` section
8. Whatever changes in response becomes the least-checked region of the drawing
and is flagged for him first on the next round.

---

# v4 - the response to the owner's verdict

His verdict is recorded verbatim in **"Owner's verdict, 2026-10-29 - v3"**
immediately above. v4 is what was done about it.

## How the defect was read, and what was therefore changed

He did not ask for whitespace to be removed — he wrote that it is *"not always
bad"*. The two things he named are **relationships obscured by spacing** and **a
long thin wire that has to be scanned across the page**. v4 attacks those two,
and the whitespace follows.

**1. The sheet is A4 landscape, not A3.** The drawing needs about 10,250 × 5,100
mil of content. On A3 that is 29% of the sheet; on A4 it is 54%. Nothing about
the circuit wanted A3 — the sheet size had been inherited from the reference's
proportions along with everything else. A4's title block is the same physical
size as A3's and so eats a larger corner (measured on a blank A4 sheet: x >
6,963 mil, y > 6,533 mil); the 0V rail and the ground symbol are placed above
and to the left of it, which is why the rail sits at y = 6,150.

**2. The vertical gaps are closed.** Spine to `lo_boost_in` was 3,800 mil and is
now 2,200. `lo_boost_in` to the 0V rail was 3,500 and is now 2,550. Total height
from spine to rail: 7,300 → 4,750.

**3. The hi-cut group is re-formed from a three-deep stack into a two-deep
group.** In v3, SI5, SI4 and SI3 were three resistors/capacitors stacked
vertically, which is what forced the 3,800-mil gap. In v4 **SI4 is drawn
horizontal** — which is also how Ian draws that same `430` resistor — so the
group is SI5 down to a node, SI6 straight on down, and SI4 across to SI3's
column. The four parts now read as one block rather than a column.

**4. SI7 is moved to mid-span, which is a deliberate departure from Ian's
order.** In v3 the `hi_boost_out` segment ran 8,450 mil unbroken — **that is the
long thin wire**. It was long because the only three series parts on the spine
sat at the far left and far right. SI7 is a stand-in with no neighbours, so its
position along the spine is free; putting it in the middle breaks the run in
two. On Ian's page the LO CUT pot sits next to OUT, and this does not.

**5. The capacitor pitch is 700 mil, not 900**, and the switch sits 700 mil from
the first capacitor rather than 900. The bank is 3,500 mil wide instead of
4,500.

**6. Everything the owner accepted is unchanged in kind**: one constant-height
spine with the series elements on it, one 0V rail along the bottom, blocks
hanging vertically off the two horizontals, the non-self-crossing selector fan
in the same order, functional names as free text, zero wire crossings.

## Measured, v1 / v3 / v4 — `scripts/measure.py`

```
                        v1 (A3)      v3 (A3)      v4 (A4)
sheet                16535x11693  16535x11693   11693x8268
content bounding box  14400x8000   14400x7800   10250x5100
  as % of sheet area         60%          58%          54%
total wire length         106750       98700        72500
longest untapped run        8450        8450         5800
  as % of sheet width         51%         51%          50%
symbols                       20          21           21
nearest-neighbour gap
  median / max          1100/3900   1100/3900     950/4650
```

**The longest unbroken signal-path run is 4,350 mil in v4 against 8,450 in v3** —
the spine is now broken by SI7 at its midpoint. Total wire length fell 27% and
the sheet area halved.

**The 5,800-mil figure above is NOT the spine. It is the `lo_boost_in` bus**,
between the rotary's common at x = 4,200 and RV1 at x = 10,000, and it is the
longest featureless run left on the page. **It did not get shorter as a fraction
of the sheet, and here is why it resisted:** the six-capacitor bank occupies that
whole span below it, and the fan of six selector wires occupies the corridor
between the switch and the capacitors. RV1 cannot be hung from the middle of the
bus without its drop crossing the fan, and R1 cannot be moved left without the
spine ending short and opening a void above the bank instead. **This is the
thing to look at next, and it is named here rather than left for the reader to
find.**

## Verification, re-measured on v4 (not assumed)

- **Netlist:** all 14 spec nets match pin-for-pin, exactly as v1/v3. The same
  two expected differences: the ground net is drawn as `GND` (14 members
  identical to the spec's `0`), and `unconnected-(SW1-PadMP)` is a 15th
  one-member net for the mechanical lug.
- **`kicad-cli sch erc`: 1 violation** — `pin_not_connected` on SW1.MP, which is
  correct.
- **`akcli check --layout --erc --nets`: 2 findings**, both the same SW1.MP.
- **Wire crossings: 0.** 54 segments, 22 junctions.

## What is on the v4 page — observations

- The spine runs at a constant height from `in` at x = 600 to `out` at
  x = 10,850. On it, left to right: the SI8 tap, SI1, SI2, the hi-cut tap, a
  4,350-mil run carrying the `hi_boost_out` label, SI7, a 3,850-mil run, the R1
  tap.
- The hi-cut group hangs below the spine at x = 2,700–3,500 as a rectangle:
  SI5 and SI6 on one vertical, SI4 horizontal across the top of the rectangle,
  SI3 down its right side. Both verticals land on the `lo_boost_in` bus.
- SI8 is one vertical the full height of the drawing at the far left.
- The `lo_boost_in` bus runs from x = 2,700 to x = 10,600 with five things on
  it; its label sits at x = 6,800, in the middle of its longest empty stretch.
- The rotary, its six-wire fan and the six capacitors occupy the lower middle;
  each capacitor drops straight to the rail. RV1 is at the right end of the bus
  with its wiper strapped to its top terminal by a 350-mil bracket; R1 is beyond
  it at the far right.
- J1, J2 and the ground symbol are in the lower left. J1's four signal pins carry
  labels on 600-mil stubs; pin 5 runs right 1,700 mil then down to the rail. J2's
  five pins drop straight down.
- **Text overlaps on the whole sheet: one** — J2's five pin numbers are
  overprinted by their own drops, as in v3. The pin numbers belong to the symbol.
- The capacitor references and values sit immediately right of each capacitor,
  nearer their own part than the next one (90 mil to their own plate, 270 to the
  next drop).

## The regions v4 changed, flagged for the reviewer first

Per `EVALUATING-DRAWINGS.md` §8 — *"the corrected region is the least-checked
part of the drawing"* — **every region below was changed in response to the
verdict and has been considered by one party only**:

1. **The sheet itself** (A3 → A4) — affects every clearance on the page.
2. **The hi-cut group**, x 2,700–3,900 — re-formed, SI4 turned horizontal.
3. **SI7's position on the spine**, x 6,850 — moved from Ian's order.
4. **The capacitor bank's pitch and the switch's distance from it**, x 4,200–9,300.
5. **The lower-left block** (SI8, J1, J2, the ground symbol, PWR_FLAG) — all
   re-placed, and J1's ground now runs 1,700 mil right before dropping.
6. **Every reference and value on the page** — all 38 field positions rewritten.

## A third thing learned about `akcli-kicad` / KiCad

**KiCad MIRRORS a field's justification when its symbol is placed at rotation 180
(or mirrored).** A field written `(justify left)` on such a symbol renders
RIGHT-justified, so its stored `(at x y)` is the text's **right** edge, not its
left. Measured on the first v4 render: every capacitor's value was drawn straight
through its own drop wire, because the anchors had been chosen as if the text ran
rightwards. The same applies to J1, which is placed with `mirror: y`.

**This is a false-green of the kind `docs/schematic/false-greens.md` catalogues:**
the lint reported the same two SW1.MP findings before and after the fix, and the
netlist was identical, while six of the nineteen parts had their values struck
through. It was found by looking at the page.

## Two things learned about `akcli-kicad` that are not in the previous trial

Both were measured here, and both are recorded because the next agent to drive
this tool will hit them.

1. **There is no op for a symbol field's position.** `place_component` takes
   `x_mil`, `y_mil`, `rotation`, `mirror`, `value`, `footprint` and
   `offset_mil`, and `set_component_parameters` takes `value`, `footprint` and a
   `parameters` map — none of which touches where the Reference or Value text
   lands. Checked against `akcli schema ops`, which has no field-placement key
   at all. The library default puts both fields hard against the symbol, which
   is what drew C6's value across its own plate. `scripts/place_fields.py` is
   the post-pass, and it holds a literal table rather than a rule.

2. **A field's stored text angle is RELATIVE to its symbol's rotation, not
   absolute.** Measured: on a symbol placed at `rotation: 90`, a field written
   with angle `0` renders **vertical**. akcli writes `90` for such symbols, so
   v1's SI1/SI2/SI7/J2 references and values all read bottom-to-top. Writing
   `270` renders them horizontal. This is in v3 and v4 for the four symbols
   placed at 90°, and the field tables say so where they live.

3. **akcli snaps wire vertices to a 50-mil grid, and will not snap a symbol to
   match.** v4's first draw was REFUSED with six `DANGLING_ENDPOINT` errors,
   all on the four symbols whose centres I had put on an odd 25-mil coordinate:
   a `Device:R` at y = 1975 has pins at 1825 and 2125, the wire meeting it was
   written to 1825 and arrived at 1800, and the two no longer touched. The
   refusal named every endpoint with its coordinate and said which end was still
   connected, which is what made it a two-minute fix. **Put every symbol centre
   on a 50-mil multiple.**

---

## What was not done

- **Nothing under `circuits/` or `lib/` was touched.** `circuits/pultec/schematic/low-boost.ts`
  was dirty at the start and is dirty and unmodified at the end.
- **No footprints are assigned.** `CLAUDE.md` is explicit that a fully specified
  BOM binds on the consumer of an artifact, and a schematic is not one of the
  consumers it binds for.
- **v4 has not been evaluated.** v3 was, and his words are quoted above. See the
  status note at the top.
