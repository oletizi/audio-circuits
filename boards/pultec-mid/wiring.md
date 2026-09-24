# pultec-mid — wiring

Generated from `circuits/pultec/mid.ts`. Do not edit by hand — `make check` regenerates
it on every run and overwrites anything that has drifted, so a change here shows up as a
git diff you have to look at rather than as a file somebody has to remember to update.

Pad numbers are positions in the layout, counting from 1. Everything in this file is
**off the board** and reaches it by wire — the parts on the board are placed by the
layout and need no instructions here.

## Panel parts

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

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, hi-cut, low-cut |
| 2 | 2 | in | hi-boost |
| 3 | 3 | 0 | low-boost |
