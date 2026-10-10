# pultec-hi-boost — wiring

Generated from `circuits/pultec/physical/hi-boost.ts`. Do not edit by hand — `make check` regenerates
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
| C14 | 4.7nF | j15_p4 (600mH inductor) ↔ j8_p6 (3kHz) |
| C15 | 4.7nF | j15_p3 (300mH inductor) ↔ j8_p5 (4kHz) |
| C16 | 3.3nF | j15_p3 (300mH inductor) ↔ j8_p4 (5kHz) |
| C17 | 1nF | j15_p2 (200mH inductor) ↔ j8_p3 (8kHz) |
| C2a2 | 470pF | j15_p3 (300mH inductor) ↔ j8_p5 (4kHz) |
| C34 | 1nF | j15_p1 (100mH inductor) ↔ j8_p2 (10kHz) |
| C35 | 1nF | j15_p1 (100mH inductor) ↔ j8_p1 (16kHz) |
| C4a2 | 1nF | j15_p2 (200mH inductor) ↔ j8_p3 (8kHz) |
| C5a2 | 1.5nF | j15_p1 (100mH inductor) ↔ j8_p2 (10kHz) |
| R3 | 4.7k | j19_p1 ↔ j20_p1 |

## Panel parts

Off the board, wired back to it. Nothing here is soldered to the board itself.

### RV_HI_BOOST — 47k LINEAR potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | in |
| 2 | wiper | — | j20_p3 |
| 3 | cw | — | hi_boost_out |

### RV_HI_Q — 10k LINEAR potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | j20_p1 |
| 2 | wiper | — | j20_p1 |
| 3 | cw | — | j20_p3 |

**Pads 1 (ccw) and 2 (wiper) are one net.** The board joins them, so those terminals end up tied together — that is deliberate, not an accident of routing. Wire each terminal to its own pad and leave the tying to the board.

### L_HI_BOOST_100MH — 100mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | j15_p1 |
| 2 | b | — | j19_p1 |

### L_HI_BOOST_200MH — 200mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | j15_p2 |
| 2 | b | — | j19_p1 |

### L_HI_BOOST_300MH — 300mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | j15_p3 |
| 2 | b | — | j19_p1 |

### L_HI_BOOST_600MH — 600mH inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | j15_p4 |
| 2 | b | — | j19_p1 |

### SW_HI_BOOST — 6-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | in |
| 2 | t_3kHz | 3kHz | j8_p6 |
| 3 | t_4kHz | 4kHz | j8_p5 |
| 4 | t_5kHz | 5kHz | j8_p4 |
| 5 | t_8kHz | 8kHz | j8_p3 |
| 6 | t_10kHz | 10kHz | j8_p2 |
| 7 | t_16kHz | 16kHz | j8_p1 |

**Ganged (`hi_freq`).** This is one pole of a two-pole switch shared with another board — not a switch of its own. Both poles turn together on one shaft, and fitting two separate switches makes two controls out of what should be one.

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
| 1 | 1 | in | mid |
| 2 | 2 | hi_boost_out | hi-cut, low-cut, mid |
| 3 | 3 | lo_boost_in | hi-cut, low-boost |
| 4 | 4 | out | low-boost, low-cut |
| 5 | 5 | 0 | low-boost, mid |

### junction_grounds — 1x05 pin header, 2.54mm pitch

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | 0 | low-boost, mid |
| 2 | 2 | 0 | low-boost, mid |
| 3 | 3 | 0 | low-boost, mid |
| 4 | 4 | 0 | low-boost, mid |
| 5 | 5 | 0 | low-boost, mid |

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

**The stand-ins are the absent sections at one setting: low frequency 100Hz, high frequency 5kHz, mid frequency 1kHz, mid in off.**
Their values are derived at that setting and at no other, so leave the frequency
selectors you DO have there.
One of this board's selectors is one shaft shared by two sections — **Panel parts**
above flags it — and one of those two may be a section a stand-in is covering.
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

#### mid — stands in for the absent mid section

This group is a single part. Either it is fitted or it is not.

| Part | Fit | Between |
| --- | --- | --- |
| SI_MID_R_MID_SHUNT | 100k | in ↔ 0 |

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
| hi-boost alone | hi-cut, low-cut, low-boost, mid | — | nothing crosses |
| hi-boost + hi-cut | low-cut, low-boost, mid | — | 2 (hi_boost_out) → hi-cut; 3 (lo_boost_in) → hi-cut |
| hi-boost + low-boost | hi-cut, low-cut, mid | — | 3 (lo_boost_in) → low-boost; 4 (out) → low-boost; 5 (0) → low-boost |
| hi-boost + low-cut | hi-cut, low-boost, mid | — | 2 (hi_boost_out) → low-cut; 4 (out) → low-cut |
| hi-boost + mid | hi-cut, low-cut, low-boost | — | 1 (in) → mid; 2 (hi_boost_out) → mid; 5 (0) → mid |
| hi-boost + hi-cut + low-boost | low-cut, mid | — | 2 (hi_boost_out) → hi-cut; 4 (out) → low-boost; 5 (0) → low-boost |
| hi-boost + hi-cut + low-cut | low-boost, mid | — | 2 (hi_boost_out) → hi-cut, low-cut; 3 (lo_boost_in) → hi-cut; 4 (out) → low-cut |
| hi-boost + hi-cut + mid | low-cut, low-boost | — | 1 (in) → mid; 2 (hi_boost_out) → hi-cut, mid; 3 (lo_boost_in) → hi-cut; 5 (0) → mid |
| hi-boost + low-boost + low-cut | hi-cut, mid | — | 2 (hi_boost_out) → low-cut; 3 (lo_boost_in) → low-boost; 5 (0) → low-boost |
| hi-boost + low-boost + mid | hi-cut, low-cut | — | 1 (in) → mid; 2 (hi_boost_out) → mid; 3 (lo_boost_in) → low-boost; 4 (out) → low-boost |
| hi-boost + low-cut + mid | hi-cut, low-boost | — | 1 (in) → mid; 2 (hi_boost_out) → low-cut, mid; 4 (out) → low-cut; 5 (0) → mid |
| hi-boost + hi-cut + low-boost + low-cut | mid | — | 2 (hi_boost_out) → hi-cut, low-cut; 5 (0) → low-boost |
| hi-boost + hi-cut + low-boost + mid | low-cut | — | 1 (in) → mid; 2 (hi_boost_out) → hi-cut, mid; 4 (out) → low-boost |
| hi-boost + hi-cut + low-cut + mid | low-boost | — | 1 (in) → mid; 2 (hi_boost_out) → hi-cut, low-cut, mid; 3 (lo_boost_in) → hi-cut; 4 (out) → low-cut; 5 (0) → mid |
| hi-boost + low-boost + low-cut + mid | hi-cut | — | 1 (in) → mid; 2 (hi_boost_out) → low-cut, mid; 3 (lo_boost_in) → low-boost |
| hi-boost + hi-cut + low-boost + low-cut + mid | nothing | — | 1 (in) → mid; 2 (hi_boost_out) → hi-cut, low-cut, mid |

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
| 5 | 0 | ground | no |
