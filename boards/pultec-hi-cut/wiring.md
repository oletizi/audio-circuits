# pultec-hi-cut — wiring

Generated from `circuits/pultec/physical/hi-cut.ts`. Do not edit by hand — `make check` regenerates
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
| C24 | 47nF | lo_boost_in ↔ j12_p1 (3kHz) |
| C25 | 47nF | lo_boost_in ↔ j12_p2 (4kHz) |
| C26 | 47nF | lo_boost_in ↔ j12_p3 (5kHz) |
| C27 | 22nF | lo_boost_in ↔ j12_p4 (8kHz) |
| C28 | 22nF | lo_boost_in ↔ j12_p5 (10kHz) |
| C29 | 15nF | lo_boost_in ↔ j12_p6 (16kHz) |
| C30 | 33nF | lo_boost_in ↔ j12_p1 (3kHz) |
| C31 | 10nF | lo_boost_in ↔ j12_p2 (4kHz) |
| C32 | 10nF | lo_boost_in ↔ j12_p4 (8kHz) |
| C33 | 2.2nF | lo_boost_in ↔ j12_p5 (10kHz) |
| R1 | 430R | j4_p2 ↔ j3_p1 |

## Panel parts

Off the board, wired back to it. Nothing here is soldered to the board itself.

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

Where this board joins the rest of the EQ. Each pin is one wire to another board —
the **Also on** column names which. A net reaching no other board is a chassis or
shield landing, present so there is somewhere to put that wire rather than
improvising one later.

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, low-cut, mid |
| 2 | 2 | lo_boost_in | low-boost |
| 3 | 3 | 0 | low-boost, mid |
