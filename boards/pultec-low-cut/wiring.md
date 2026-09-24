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

## Board terminals

Where this board joins the rest of the EQ. Each pin is one wire to another board —
the **Also on** column names which. A net reaching no other board is a chassis or
shield landing, present so there is somewhere to put that wire rather than
improvising one later.

### board_terminals — terminal block

| Pad | Terminal | Net | Also on |
| --- | --- | --- | --- |
| 1 | 1 | hi_boost_out | hi-boost, hi-cut, mid |
| 2 | 2 | out | low-boost |
| 3 | 3 | 0 | low-boost, mid |
