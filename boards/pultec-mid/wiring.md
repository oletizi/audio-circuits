# pultec-mid — wiring

Generated from `circuits/pultec/physical/mid.ts`. Do not edit by hand — `make check` regenerates
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

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, hi-cut, low-cut |
| 2 | 2 | in | hi-boost |
| 3 | 3 | 0 | low-boost |
