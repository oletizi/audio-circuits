# pultec-low-cut — wiring

Generated from `circuits/pultec/physical/low-cut.ts`. Do not edit by hand — `make check` regenerates
it on every run and overwrites anything that has drifted, so a change here shows up as a
git diff you have to look at rather than as a file somebody has to remember to update.

There are three kinds of thing here, and they are wired differently:

- **On the board** — parts you place and solder. The layout says where; this says
  which part and what it sits between.
- **Panel parts** — pots and switches that are NOT on the board. Each of their
  terminals gets a wire to one pad. Pad numbers count from 1 in layout order.
- **Board terminals** — the wires that leave this board for the OTHER boards, not
  for the panel. This is the inter-board harness.

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
| SI_HI_BOOST_RV_HI_BOOST.ccw-wiper | 0R | in ↔ si_hi_boost_j20_p3 |
| SI_HI_BOOST_RV_HI_BOOST.wiper-cw | 47k | si_hi_boost_j20_p3 ↔ hi_boost_out |
| SI_HI_CUT_C26 | 47nF | lo_boost_in ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_R1 | 430R | si_hi_cut_j4_p2 ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_RV_HI_CUT.ccw-wiper | 0R | hi_boost_out ↔ si_hi_cut_j4_p2 |
| SI_HI_CUT_RV_HI_CUT.wiper-cw | 4.7k | si_hi_cut_j4_p2 ↔ lo_boost_in |
| SI_LOW_BOOST_R2 | 56k | out ↔ lo_boost_in |
| SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper | 0R | 0 ↔ lo_boost_in |
| SI_MID_C_MID_1kHz_A | 22nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_C_MID_1kHz_B | 3.3nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_R_MID_BOOST | 4.7k | in ↔ si_mid_mid_boost_return |
| SI_MID_R_MID_SHUNT | 100k | in ↔ 0 |
| SI_MID_RV_MID.ccw-wiper | 0R | hi_boost_out ↔ si_mid_mid_sel_1khz |

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
