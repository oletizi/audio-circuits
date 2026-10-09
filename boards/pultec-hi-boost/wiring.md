# pultec-hi-boost — wiring

Generated from `circuits/pultec/physical/hi-boost.ts`. Do not edit by hand — `make check` regenerates
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
| SI_HI_CUT_C26 | 47nF | lo_boost_in ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_R1 | 430R | si_hi_cut_j4_p2 ↔ si_hi_cut_j12_p3 |
| SI_HI_CUT_RV_HI_CUT.ccw-wiper | 0R | hi_boost_out ↔ si_hi_cut_j4_p2 |
| SI_HI_CUT_RV_HI_CUT.wiper-cw | 4.7k | si_hi_cut_j4_p2 ↔ lo_boost_in |
| SI_LOW_CUT_RV_LO_CUT.ccw-wiper | 0R | hi_boost_out ↔ out |
| SI_LOW_BOOST_R2 | 56k | out ↔ lo_boost_in |
| SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper | 0R | 0 ↔ lo_boost_in |
| SI_MID_C_MID_1kHz_A | 22nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_C_MID_1kHz_B | 3.3nF | si_mid_mid_tap_1h (1H inductor) ↔ si_mid_mid_sel_1khz |
| SI_MID_R_MID_BOOST | 4.7k | in ↔ si_mid_mid_boost_return |
| SI_MID_R_MID_SHUNT | 100k | in ↔ 0 |
| SI_MID_RV_MID.ccw-wiper | 0R | hi_boost_out ↔ si_mid_mid_sel_1khz |

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
| 1 | 1 | in | mid |
| 2 | 2 | hi_boost_out | hi-cut, low-cut, mid |
| 3 | 3 | lo_boost_in | hi-cut, low-boost |
| 4 | 4 | out | low-boost, low-cut |
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
