# pultec-hi-cut — wiring

Generated from `circuits/pultec/boards/hi-cut.ts`. Do not edit by hand — `make check` regenerates
it on every run and overwrites anything that has drifted, so a change here shows up as a
git diff you have to look at rather than as a file somebody has to remember to update.

Pad numbers are positions in the layout, counting from 1. Everything in this file is
**off the board** and reaches it by wire — the parts on the board are placed by the
layout and need no instructions here.

## Panel parts

### RV_HI_CUT — 4.7k LINEAR potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | hi_boost_out |
| 2 | wiper | — | j4_p2 |
| 3 | cw | — | lo_boost_in |

### SW_HI_CUT — 6-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | j3_p1 |
| 2 | t1 | 3kHz | j12_p1 |
| 3 | t2 | 4kHz | j12_p2 |
| 4 | t3 | 5kHz | j12_p3 |
| 5 | t4 | 8kHz | j12_p4 |
| 6 | t5 | 10kHz | j12_p5 |
| 7 | t6 | 16kHz | j12_p6 |

**Ganged (`hi_freq`).** This is one pole of a two-pole switch shared with another board — not a switch of its own. Both poles turn together on one shaft, and fitting two separate switches makes two controls out of what should be one.

## Board terminals

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, low-cut, mid |
| 2 | 2 | lo_boost_in | low-boost |
| 3 | 3 | 0 | low-boost, mid |
