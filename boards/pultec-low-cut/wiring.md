# pultec-low-cut — wiring

Generated from `circuits/pultec/physical/low-cut.ts`. Do not edit by hand — `make check` regenerates
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
| C1 | 18nF | hi_boost_out ↔ j5_p1 (20Hz) |
| C2 | 10nF | hi_boost_out ↔ j5_p2 (30Hz) |
| C3 | 4.7nF | hi_boost_out ↔ j5_p3 (60Hz) |
| C4 | 3.3nF | hi_boost_out ↔ j5_p4 (100Hz) |
| C5 | 2.2nF | hi_boost_out ↔ j5_p5 (150Hz) |
| C6 | 1.8nF | hi_boost_out ↔ j5_p6 (200Hz) |
| C7 | 1nF | hi_boost_out ↔ j5_p3 (60Hz) |

## Panel parts

Off the board, wired back to it. Nothing here is soldered to the board itself.

### RV_LO_CUT — 470k LOG potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | hi_boost_out |
| 2 | wiper | — | out |
| 3 | cw | — | out |

**Pads 2 (wiper) and 3 (cw) are one net.** The board joins them, so those terminals end up tied together — that is deliberate, not an accident of routing. Wire each terminal to its own pad and leave the tying to the board.

### SW_LO_CUT — 6-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | out |
| 2 | t1 | 20Hz | j5_p1 |
| 3 | t2 | 30Hz | j5_p2 |
| 4 | t3 | 60Hz | j5_p3 |
| 5 | t4 | 100Hz | j5_p4 |
| 6 | t5 | 150Hz | j5_p5 |
| 7 | t6 | 200Hz | j5_p6 |

**Ganged (`lo_freq`).** This is one pole of a two-pole switch shared with another board — not a switch of its own. Both poles turn together on one shaft, and fitting two separate switches makes two controls out of what should be one.

### SI_MID_L_MID_1H — 1H inductor

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | a | — | si_mid_mid_tap_1h |
| 2 | b | — | si_mid_mid_boost_return |

**Part of the mid stand-in group.** Wire it only in the builds where **Stand-in groups** below tells you to populate mid on this board; in every other build this part is not fitted and these pads carry nothing.

## Board terminals

Where this board joins the rest of the EQ. Each pin is one wire to another board —
the **Also on** column names which. A net reaching no other board is a chassis or
shield landing, present so there is somewhere to put that wire rather than
improvising one later.

### junction_signals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | in | hi-boost, mid |
| 2 | 2 | hi_boost_out | hi-boost, hi-cut, mid |
| 3 | 3 | lo_boost_in | hi-cut, low-boost |
| 4 | 4 | out | low-boost |
| 5 | 5 | 0 | low-boost, mid |

### junction_grounds — terminal block

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

**The stand-ins are the absent sections at one setting: low frequency 100Hz, high frequency 5kHz, mid frequency 1kHz, mid in boost.**
Their values are derived at that setting and at no other, so leave the frequency
selectors you DO have there. Some selectors are one shaft shared by two
sections (**Panel parts** above flags a ganged one): turning that shaft moves only the
section you built, while the stand-in covering the other stays where it was derived. The
two then disagree by up to 3.71 dB, which reads as a circuit fault rather than as a knob in
the wrong place.

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

#### low-boost — stands in for the absent low-boost section

Both parts of this group go in together, or neither does.

| Part | Fit | Between |
| --- | --- | --- |
| SI_LOW_BOOST_R2 | 56k | out ↔ lo_boost_in |
| SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper | 0R | 0 ↔ lo_boost_in |

#### mid — stands in for the absent mid section

All 6 parts of this group go in together, or none of them do.

| Part | Fit | Between |
| --- | --- | --- |
| SI_MID_C_MID_1kHz_A | 22nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_C_MID_1kHz_B | 3.3nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_L_MID_1H | 1H inductor — panel part, wired back like the others under **Panel parts** | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_boost_return |
| SI_MID_R_MID_BOOST | 4.7k | in ↔ si_mid_mid_boost_return |
| SI_MID_R_MID_SHUNT | 100k | in ↔ 0 |
| SI_MID_RV_MID.ccw-wiper | 0R | hi_boost_out ↔ si_mid_mid_sel_1khz |

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
| low-cut alone | hi-boost, hi-cut, low-boost, mid | — | nothing crosses |
| hi-boost + low-cut | nothing | hi-cut → hi-boost; low-boost → hi-boost; mid → hi-boost | 2 (hi_boost_out) → hi-boost; 4 (out) → hi-boost |
| hi-cut + low-cut | nothing | hi-boost → hi-cut; low-boost → hi-cut; mid → hi-cut | 2 (hi_boost_out) → hi-cut; 4 (out) → hi-cut |
| low-boost + low-cut | hi-boost, hi-cut, mid | — | 3 (lo_boost_in) → low-boost; 4 (out) → low-boost; 5 (0) → low-boost |
| low-cut + mid | hi-boost, hi-cut, low-boost | — | 1 (in) → mid; 2 (hi_boost_out) → mid; 5 (0) → mid |
| hi-boost + hi-cut + low-cut | nothing | low-boost → hi-boost; mid → hi-boost | 2 (hi_boost_out) → hi-boost, hi-cut; 4 (out) → hi-boost |
| hi-boost + low-boost + low-cut | nothing | hi-cut → hi-boost; mid → hi-boost | 2 (hi_boost_out) → hi-boost; 4 (out) → low-boost |
| hi-boost + low-cut + mid | nothing | hi-cut → hi-boost; low-boost → hi-boost | 2 (hi_boost_out) → hi-boost, mid; 4 (out) → hi-boost |
| hi-cut + low-boost + low-cut | nothing | hi-boost → hi-cut; mid → hi-cut | 2 (hi_boost_out) → hi-cut; 4 (out) → low-boost |
| hi-cut + low-cut + mid | nothing | hi-boost → hi-cut; low-boost → hi-cut | 2 (hi_boost_out) → hi-cut, mid; 4 (out) → hi-cut |
| low-boost + low-cut + mid | hi-boost, hi-cut | — | 1 (in) → mid; 2 (hi_boost_out) → mid; 3 (lo_boost_in) → low-boost; 4 (out) → low-boost |
| hi-boost + hi-cut + low-boost + low-cut | nothing | mid → hi-boost | 2 (hi_boost_out) → hi-boost, hi-cut; 4 (out) → low-boost |
| hi-boost + hi-cut + low-cut + mid | nothing | low-boost → hi-boost | 2 (hi_boost_out) → hi-boost, hi-cut, mid; 4 (out) → hi-boost |
| hi-boost + low-boost + low-cut + mid | nothing | hi-cut → hi-boost | 2 (hi_boost_out) → hi-boost, mid; 4 (out) → low-boost |
| hi-cut + low-boost + low-cut + mid | nothing | hi-boost → hi-cut | 2 (hi_boost_out) → hi-cut, mid; 4 (out) → low-boost |
| hi-boost + hi-cut + low-boost + low-cut + mid | nothing | — | 2 (hi_boost_out) → hi-boost, hi-cut, mid; 4 (out) → low-boost |

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
| 1 | in | input | no |
| 4 | out | output | yes |
| 5 | 0 | ground | no |
