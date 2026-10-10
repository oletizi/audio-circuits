# pultec-mid — wiring

Generated from `circuits/pultec/physical/mid.ts`. Do not edit by hand — `make check` regenerates
it on every run and overwrites anything that has drifted, so a change here shows up as a
git diff you have to look at rather than as a file somebody has to remember to update.

There are four kinds of thing here, and they are wired differently:

- **On the board** — parts you place and solder in every build. The layout says where;
  this says which part and what it sits between.
- **Panel parts** — pots and switches that are NOT on the board. Each of their
  terminals gets a wire to one pad. Pad numbers count from 1 in layout order.
- **Board terminals** — the wires that leave this board for the OTHER boards, not
  for the panel. This is the inter-board harness.
- **Stand-in groups** — positions this board holds for the sections you are NOT
  building. Which of them you populate depends on the build, and that section says
  which, for every build this board can be part of.

## On the board

| Part | Fit | Between |
| --- | --- | --- |
| C_MID_200Hz_A | 330nF | mid_tap_2h (2H inductor) ↔ mid_sel_200hz (200Hz) |
| C_MID_300Hz_A | 150nF | mid_tap_2h (2H inductor) ↔ mid_sel_300hz (300Hz) |
| C_MID_500Hz_A | 47nF | mid_tap_2h (2H inductor) ↔ mid_sel_500hz (500Hz) |
| C_MID_700Hz_A | 22nF | mid_tap_2h (2H inductor) ↔ mid_sel_700hz (700Hz) |
| C_MID_700Hz_B | 3.3nF | mid_tap_2h (2H inductor) ↔ mid_sel_700hz (700Hz) |
| C_MID_1kHz_A | 22nF | mid_tap_1h (1H inductor) ↔ mid_sel_1khz (1kHz) |
| C_MID_1kHz_B | 3.3nF | mid_tap_1h (1H inductor) ↔ mid_sel_1khz (1kHz) |
| C_MID_1k5Hz_A | 12nF | mid_tap_1h (1H inductor) ↔ mid_sel_1k5hz (1k5Hz) |
| C_MID_2kHz_A | 12nF | mid_tap_0r45h (450mH inductor) ↔ mid_sel_2khz (2kHz) |
| C_MID_2kHz_B | 2.2nF | mid_tap_0r45h (450mH inductor) ↔ mid_sel_2khz (2kHz) |
| C_MID_3kHz_A | 4.7nF | mid_tap_0r45h (450mH inductor) ↔ mid_sel_3khz (3kHz) |
| C_MID_3kHz_B | 1.5nF | mid_tap_0r45h (450mH inductor) ↔ mid_sel_3khz (3kHz) |
| C_MID_4kHz_A | 4.7nF | mid_tap_0r22h (220mH inductor) ↔ mid_sel_4khz (4kHz) |
| C_MID_4kHz_B | 2.2nF | mid_tap_0r22h (220mH inductor) ↔ mid_sel_4khz (4kHz) |
| C_MID_5kHz_A | 4.7nF | mid_tap_0r22h (220mH inductor) ↔ mid_sel_5khz (5kHz) |
| C_MID_7kHz_A | 2.2nF | mid_tap_0r1h (100mH inductor) ↔ mid_sel_7khz (7kHz) |
| C_MID_7kHz_B | 1nF | mid_tap_0r1h (100mH inductor) ↔ mid_sel_7khz (7kHz) |
| R_MID_BOOST | 4.7k | in ↔ mid_boost_return (boost) |
| R_MID_CUT | 1k | mid_cut_return (cut) ↔ 0 |
| R_MID_SHUNT | 100k | in ↔ 0 |

## Panel parts

Off the board, wired back to it. Nothing here is soldered to the board itself.

### L_MID_2H — 2H inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | mid_tap_2h |
| 2 | b | — | mid_coil_return |

### L_MID_1H — 1H inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | mid_tap_1h |
| 2 | b | — | mid_coil_return |

### L_MID_0R45H — 450mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | mid_tap_0r45h |
| 2 | b | — | mid_coil_return |

### L_MID_0R22H — 220mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | mid_tap_0r22h |
| 2 | b | — | mid_coil_return |

### L_MID_0R1H — 100mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | mid_tap_0r1h |
| 2 | b | — | mid_coil_return |

### RV_MID — 47k LOG potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | hi_boost_out |
| 2 | wiper | — | mid_sel_common |
| 3 | cw | — | mid_sel_common |

**Pads 2 (wiper) and 3 (cw) are one net.** The board joins them, so those terminals end up tied together — that is deliberate, not an accident of routing. Wire each terminal to its own pad and leave the tying to the board.

### SW_MID — 11-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | mid_sel_common |
| 2 | t_200Hz | 200Hz | mid_sel_200hz |
| 3 | t_300Hz | 300Hz | mid_sel_300hz |
| 4 | t_500Hz | 500Hz | mid_sel_500hz |
| 5 | t_700Hz | 700Hz | mid_sel_700hz |
| 6 | t_1kHz | 1kHz | mid_sel_1khz |
| 7 | t_1k5Hz | 1k5Hz | mid_sel_1k5hz |
| 8 | t_2kHz | 2kHz | mid_sel_2khz |
| 9 | t_3kHz | 3kHz | mid_sel_3khz |
| 10 | t_4kHz | 4kHz | mid_sel_4khz |
| 11 | t_5kHz | 5kHz | mid_sel_5khz |
| 12 | t_7kHz | 7kHz | mid_sel_7khz |

### SW_MID_MODE — 3-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | mid_coil_return |
| 2 | boost | boost | mid_boost_return |
| 3 | cut | cut | mid_cut_return |

## Board terminals

Where this board joins the rest of the EQ. Each pin is one wire to another board —
the **Also on** column names which. A net reaching no other board is a chassis or
shield landing, present so there is somewhere to put that wire rather than
improvising one later.

**The junction rows are ONE 2x05 pin field — fit a single stacking header, not 2 plain ones.** `junction_signals` and `junction_grounds` are the 2 rows of one 10-pin field at 2.54mm pitch, and the part that goes in it is a 2x05 LONG-TAIL (stacking) header: its tails reach through this board into the socket of the board above, which is what lets the boards stack and makes this junction a bus they all share rather than a row of pins going nowhere.

2 plain vertical 1x05 headers fit the same holes and leave nothing to stack onto, so they are the one thing not to order. A ribbon socket spanning every row, or individual leads, is the bench substitute when the boards are not stacked.

It is 2 parts in the model and one part in the hand: the layout tool's part families (see `lib/kicad/import-string.ts`) have no multi-row shape at 2.54mm row pitch, so the field is declared a row at a time. The holes, and what you fit in them, are the same either way.

### junction_signals — 1x05 pin header, 2.54mm pitch

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | in | hi-boost |
| 2 | 2 | hi_boost_out | hi-boost, hi-cut, low-cut |
| 3 | 3 | lo_boost_in | hi-cut, low-boost |
| 4 | 4 | out | low-boost, low-cut |
| 5 | 5 | 0 | low-boost |

### junction_grounds — 1x05 pin header, 2.54mm pitch

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | 0 | low-boost |
| 2 | 2 | 0 | low-boost |
| 3 | 3 | 0 | low-boost |
| 4 | 4 | 0 | low-boost |
| 5 | 5 | 0 | low-boost |

**Pads 1 (1) and 2 (2) and 3 (3) and 4 (4) and 5 (5) are one net.** The board joins them, so those terminals end up tied together — that is deliberate, not an accident of routing. Wire each terminal to its own pad and leave the tying to the board.

## Stand-in groups

The five sections of this EQ share one signal ladder, so a section board on its own has
no signal path at all: at the flat setting its own level pot grounds its input, and the
only route from input to output runs through its neighbours. This board therefore holds
positions for the other sections' parts — one stand-in group each — and which of them you
solder depends on which other boards are on the bench. The layout holds every position in
every build; what configures a build is what you leave out.

**Populate a group whole, or leave it empty.** Every part of a group is listed below under
that group's name, so a group with a part missing reads as unfinished rather than as a
choice. It is not a cheaper version of itself — it is a different circuit, and nothing on
the board will tell you.

**One group, one board.** Every board's junction carries all five ladder nets, so any board
on the bench could host any absent section's group. Exactly one must. Two boards each
populating the same absent section's group put the two copies in parallel across the same
nets and halve a value — at the bench that is a plausible wrong measurement, not an obvious
fault. **What to populate, by build** below names the one board that carries each absent
group, so a group you leave empty here is one you can see is covered somewhere else.

**The stand-ins are the absent sections at one setting: low frequency 100Hz, high frequency 5kHz, mid frequency 1kHz, mid in boost.**
Their values are derived at that setting and at no other, so leave the frequency
selectors you DO have there.
Nothing on this board's panel is ganged, so no knob here turns two sections at once.
A selector on ANOTHER board can be, and the section it shares a shaft with may be one
a stand-in group is covering — on this board or on whichever board the table below says
carries it.
Moving it then moves the section you built and not the stand-in covering the one you
did not: the two disagree by up to 3.71 dB, which reads as a circuit fault rather than
as a knob in the wrong place.

**A part listed as `0R` is a wire link.** A level pot sitting at its end stop
reduces to a zero-ohm part rather than to nothing at all — an ideal short stays a part
here, so that no two nodes are quietly merged into one — so where a group says
`0R`, fit a wire or a solder bridge.

### The groups this board holds

None of these parts belong to this board's own circuit. **On the board** above is that, and
it is populated in every build.

#### hi-boost — stands in for the absent hi-boost section

Both parts of this group go in together, or neither does.

| Part | Fit | Between |
| --- | --- | --- |
| SI_HI_BOOST_RV_HI_BOOST.ccw-wiper | 0R | in ↔ si_hi_boost_j20_p3 |
| SI_HI_BOOST_RV_HI_BOOST.wiper-cw | 47k | si_hi_boost_j20_p3 ↔ hi_boost_out |

#### hi-cut — stands in for the absent hi-cut section

All 4 parts of this group go in together, or none of them do.

| Part | Fit | Between |
| --- | --- | --- |
| SI_HI_CUT_C26 | 47nF | lo_boost_in ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_R1 | 430R | si_hi_cut_j4_p2 ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_RV_HI_CUT.ccw-wiper | 0R | hi_boost_out ↔ si_hi_cut_j4_p2 |
| SI_HI_CUT_RV_HI_CUT.wiper-cw | 4.7k | si_hi_cut_j4_p2 ↔ lo_boost_in |

#### low-cut — stands in for the absent low-cut section

This group is a single part. Either it is fitted or it is not.

| Part | Fit | Between |
| --- | --- | --- |
| SI_LOW_CUT_RV_LO_CUT.ccw-wiper | 0R | hi_boost_out ↔ out |

#### low-boost — stands in for the absent low-boost section

Both parts of this group go in together, or neither does.

| Part | Fit | Between |
| --- | --- | --- |
| SI_LOW_BOOST_R2 | 56k | out ↔ lo_boost_in |
| SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper | 0R | 0 ↔ lo_boost_in |

### What to populate, by build

Find the row for the boards you are building — the first column names every board in the
build, this one included. **Populate here** is what you solder onto THIS board; every other
group above is left empty. **Carried elsewhere** says which board carries those instead, so
a group missing from this board is one you can account for rather than wonder about.
**Junction pins** are the pins of this board's junction that carry a net to another board in
that build — the pads are the same five on every board, listed under **Board terminals**
above, and this says which of them are doing something.

| Boards on the bench | Populate here | Carried elsewhere | Junction pins to wire |
| --- | --- | --- | --- |
| mid alone | hi-boost, hi-cut, low-cut, low-boost | — | nothing crosses |
| hi-boost + mid | nothing | hi-cut → hi-boost; low-cut → hi-boost; low-boost → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost; 5 (0) → hi-boost |
| hi-cut + mid | nothing | hi-boost → hi-cut; low-cut → hi-cut; low-boost → hi-cut | 1 (in) → hi-cut; 2 (hi_boost_out) → hi-cut; 5 (0) → hi-cut |
| low-boost + mid | nothing | hi-boost → low-boost; hi-cut → low-boost; low-cut → low-boost | 1 (in) → low-boost; 2 (hi_boost_out) → low-boost; 5 (0) → low-boost |
| low-cut + mid | nothing | hi-boost → low-cut; hi-cut → low-cut; low-boost → low-cut | 1 (in) → low-cut; 2 (hi_boost_out) → low-cut; 5 (0) → low-cut |
| hi-boost + hi-cut + mid | nothing | low-cut → hi-boost; low-boost → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, hi-cut; 5 (0) → hi-boost |
| hi-boost + low-boost + mid | nothing | hi-cut → hi-boost; low-cut → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost; 5 (0) → low-boost |
| hi-boost + low-cut + mid | nothing | hi-cut → hi-boost; low-boost → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, low-cut; 5 (0) → hi-boost |
| hi-cut + low-boost + mid | nothing | hi-boost → hi-cut; low-cut → hi-cut | 1 (in) → hi-cut; 2 (hi_boost_out) → hi-cut; 5 (0) → low-boost |
| hi-cut + low-cut + mid | nothing | hi-boost → hi-cut; low-boost → hi-cut | 1 (in) → hi-cut; 2 (hi_boost_out) → hi-cut, low-cut; 5 (0) → hi-cut |
| low-boost + low-cut + mid | nothing | hi-boost → low-cut; hi-cut → low-cut | 1 (in) → low-cut; 2 (hi_boost_out) → low-cut; 5 (0) → low-boost |
| hi-boost + hi-cut + low-boost + mid | nothing | low-cut → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, hi-cut; 5 (0) → low-boost |
| hi-boost + hi-cut + low-cut + mid | nothing | low-boost → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, hi-cut, low-cut; 5 (0) → hi-boost |
| hi-boost + low-boost + low-cut + mid | nothing | hi-cut → hi-boost | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, low-cut; 5 (0) → low-boost |
| hi-cut + low-boost + low-cut + mid | nothing | hi-boost → hi-cut | 1 (in) → hi-cut; 2 (hi_boost_out) → hi-cut, low-cut; 5 (0) → low-boost |
| hi-boost + hi-cut + low-boost + low-cut + mid | nothing | — | 1 (in) → hi-boost; 2 (hi_boost_out) → hi-boost, hi-cut, low-cut; 5 (0) → low-boost |

### The EQ's own connections

The source, the load and ground land on the junction as well, not on a separate
connector, and they are the same pads in every build, including a one-board one. Ground
has more than one pin — **Board terminals** above lists every junction pin, and every one
of them on net `0` is the same ground.

**On own parts** says whether this board's OWN circuit — what it carries in every build —
sits on that net. Yes means a lead to that pad reaches the circuit whatever else you have
built. No means it reaches it only through the junction bus, which a stack gives you, or
through a stand-in group this board is populating in that particular build: if you are
joining boards with individual leads rather than stacking them, land that connection on a
board whose own parts are on the net instead.

| Pad | Net | What lands here | On own parts |
| --- | --- | --- | --- |
| 1 | in | input | yes |
| 4 | out | output | no |
| 5 | 0 | ground | yes |
