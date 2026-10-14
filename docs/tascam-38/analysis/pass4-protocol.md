Tascam 38 control-source tracing protocol (Pass 4)

Read first, and follow its DRAWING CONVENTIONS, ANALYSIS RULES and
ENVIRONMENT CONSTRAINTS:
  /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/pass3/protocol.md

What is already established (you may rely on it):
  /Users/orion/work/audio-circuits-work/tascam-38-electronics/docs/tascam-38/circuit-analysis.md
It describes the amplifier CARD and the polarity each card control input
needs. Your job is the OTHER end of those control lines: the board or sheet
that drives them, and under which front-panel / transport conditions each
line takes each level.

SHEETS (both 9000 x 5250 px, 300 dpi renders; cite full-res pixel (x, y) and
say WHICH sheet):
- Amplifier sheet: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/amp/full-1.png
- Transport sheet: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/transport/full-1.png
Crop with:
  python3 -I /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/crop.py SRC X0 Y0 X1 Y1 OUT WIDTH GRID
One crop per Bash call.

The two sheets connect through the P171/J171 bus (amplifier sheet, around
x 4300-4500, y 3800-4300, printed: 6V, 0V, POWER MUTE, REC MODE, REC SIGNAL,
PLAY MUTE, 0V, 24V, +B(15V), -B(-15V), 0V, "To POWER SUPPLY PCB SECTION")
and, on the transport sheet, a connector labelled "To MOTHER PCB" near
(2650, 2850-3050) with signal names printed near x ~3300-3400, y ~3900-4300.
Confirm the correspondence by the printed names; do not assume pin order.

OUTPUT
For each control line you own, give:
  - the source circuit (components, devices, polarity), with coordinates
  - a STATE TABLE: each relevant front-panel / transport condition -> the
    line's level (high/low/open, with printed voltage if any), with the
    traced reason
  - timing elements (RC delays, monostables, latches) and their values
  - unknowns, each with location and what would resolve it
Separate drawing facts from interpretation, as in the Pass 3 protocol. Use
the Write tool to write the file named in your task. Do not edit the git
repository; do not commit.
