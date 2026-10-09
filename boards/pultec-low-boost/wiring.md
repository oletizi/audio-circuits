# pultec-low-boost — wiring

Generated from `circuits/pultec/physical/low-boost.ts`. Do not edit by hand — `make check` regenerates
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
| C18 | 330nF | 0 ↔ j10_p1 (20Hz) |
| C19 | 220nF | 0 ↔ j10_p2 (30Hz) |
| C20 | 120nF | 0 ↔ j10_p3 (60Hz) |
| C21 | 68nF | 0 ↔ j10_p4 (100Hz) |
| C22 | 47nF | 0 ↔ j10_p5 (150Hz) |
| C23 | 33nF | 0 ↔ j10_p6 (200Hz) |
| R2 | 56k | out ↔ lo_boost_in |

## Panel parts

Off the board, wired back to it. Nothing here is soldered to the board itself.

### RV_LO_BOOST — 47k LOG potentiometer

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | ccw | — | 0 |
| 2 | wiper | — | lo_boost_in |
| 3 | cw | — | lo_boost_in |

**Pads 2 (wiper) and 3 (cw) are one net.** The board joins them, so those terminals end up tied together — that is deliberate, not an accident of routing. Wire each terminal to its own pad and leave the tying to the board.

### SW_LO_BOOST — 6-position switch

| Pad | Terminal | Selects | Net |
| --- | --- | --- | --- |
| 1 | common | — | lo_boost_in |
| 2 | t1 | 20Hz | j10_p1 |
| 3 | t2 | 30Hz | j10_p2 |
| 4 | t3 | 60Hz | j10_p3 |
| 5 | t4 | 100Hz | j10_p4 |
| 6 | t5 | 150Hz | j10_p5 |
| 7 | t6 | 200Hz | j10_p6 |

**Ganged (`lo_freq`).** This is one pole of a two-pole switch shared with another board — not a switch of its own. Both poles turn together on one shaft, and fitting two separate switches makes two controls out of what should be one.

## Board terminals

Where this board joins the rest of the EQ. Each pin is one wire to another board —
the **Also on** column names which. A net reaching no other board is a chassis or
shield landing, present so there is somewhere to put that wire rather than
improvising one later.

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | lo_boost_in | hi-cut |
| 2 | 2 | out | low-cut |
| 3 | 3 | 0 | mid |
