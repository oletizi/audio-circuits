Tascam 38 independent re-trace protocol (blind)

PURPOSE
You are an independent second tracer. Another agent has already traced these
contacts; your job is to trace them FROM SCRATCH so the two results can be
compared. You must not see the first results.

DO NOT READ (any of these invalidates your trace):
- anything under /Users/orion/work/audio-circuits-work/tascam-38-electronics/docs/tascam-38/
  EXCEPT the sources/ subdirectory's PDFs (you will not need them; use the
  render below)
- any file named pass1-*, pass2-*, interface-matrix*, *junctions*
- anything under the scratchpad directory other than the render, the crop
  tool, this protocol file, and your own output folder.

GOAL
For each assigned card contact J10x-n, trace BOTH sides on the channel-1
drawing:
(a) CARD SIDE: from the top of the J10x connector box upward into the
    channel-1 REC/PLAY AMPL PCB drawing, to the first named component
    terminal(s), printed labels or other connector contacts, through every
    junction.
(b) MOTHERBOARD SIDE: from the matching P10x prong (row just below the J10x
    box) down and across the MOTHER PCB to every named endpoint: another
    board's connector pin (head connectors, line in/out, function PCB,
    out select, master osc, meter, the P171/J171 power-supply bus with its
    printed signal names, the 2ch-8ch amplifier row), recording every
    junction.

SOURCE
  /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/amp/full-1.png
9000 x 5250 px, a 300 dpi render of the Tascam 38 AMPLIFIER SCHEMATIC
DIAGRAM. Cite locations as full-res pixel (x, y).

CROP TOOL
  python3 -I /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/crop.py SRC X0 Y0 X1 Y1 OUT WIDTH GRID
X0..Y1 full-res pixels; WIDTH/(X1-X0) is the zoom; GRID draws labelled
lines every GRID px (red x, blue y). Read the output png to view it. One
crop per Bash call; no shell loops or variables holding several arguments.

LAYOUT (approximate, full-res)
- Channel-1 card drawing: x 4750-8400, y 850-2650.
- Card connectors J101-J108 in one row, boxes at y ~2650-2690; motherboard
  P10x prongs just below at y ~2700-2730 with numbers printed under them.
- Connector x ranges: J101 ~4850-4940, J103 ~5030-5170, J106 ~5260-5450,
  J108 ~5695-5780, J107 ~6730-6895, J104 ~7055-7225, J102 ~7295-7465,
  J105 ~7710-7880.
- MOTHER PCB: x ~1100-8400, y ~2700-3800. HEAD PCB left, x ~550-1100.
  IN/OUT PCB top left. FUNCTION PCB x ~2000-4500, y ~1900-2650. Lower boards
  (MASTER OSC, OUT SELECT, VU meter, the P171/J171 bus labelled "To POWER
  SUPPLY PCB SECTION") y ~3800-4600, x ~1150-4600. 2ch-8ch amplifier
  connector row y ~3800-3870.

CONVENTIONS - establish these yourself at 4x before using them
- Work out from the drawing how each J10x box's printed numbers map to its
  contact notches (look at where wires land, and at any empty cell). State
  the mapping you used for each connector and how you established it. Do
  the same for each P10x prong row.
- A filled dot at a meeting of wires is a junction; a crossing without a dot
  is not connected. Check every crossing on your route at 3-4x.
- The scan has stitching seams that leave small gaps in many lines; say
  when you bridge one and why.
- Italic voltage texts beside nodes are printed DC values, not rail names.
  Rail names are the printed P171/J171 signal names.

EVIDENCE RULES
- Record only what you see. If you cannot follow a wire, or cannot tell a
  dot from a crossing, mark that side UNRESOLVED with the exact coordinates.
- "No wire observed" is an observation, not proof of no-connect.
- Relays: coil terminal vs contact terminal. Transistors: name the terminal.
  Read designators and values exactly; say if unreadable.

OUTPUT
Use the Write tool to write your file (path given in your task). One section
per contact:

  J101-4
  - card side: <first named endpoint(s)>
  - card route: <junctions with coordinates>
  - motherboard side: <named endpoint(s)>
  - motherboard route: <junctions with coordinates>
  - shares a net with: <other contacts, card side and motherboard side separately>
  - confidence: card CLEAR|PARTIAL|UNRESOLVED; motherboard CLEAR|PARTIAL|UNRESOLVED
  - blocking issue: <if not CLEAR>

Do not edit the git repository; do not commit. Your final message is a short
summary; the file is the deliverable.

ENVIRONMENT CONSTRAINTS
- Never write memory files (~/.claude/projects/*/memory/).
- Never put '#' characters inside Bash heredocs or multi-line quoted
  arguments; use the Write tool for files.
- Never use sed to write files.
