# pultec-low-cut — wiring

Generated from `circuits/pultec/physical/low-cut.ts`. Do not edit by hand — `make check` regenerates
it on every run and overwrites anything that has drifted, so a change here shows up as a
git diff you have to look at rather than as a file somebody has to remember to update.

Pad numbers are positions in the layout, counting from 1. Everything in this file is
**off the board** and reaches it by wire — the parts on the board are placed by the
layout and need no instructions here.

## Panel parts

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

## Board terminals

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, hi-cut, mid |
| 2 | 2 | out | low-boost |
| 3 | 3 | 0 | low-boost, mid |
