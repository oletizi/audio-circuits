Tascam 38 functional circuit analysis protocol (Pass 3)

GOAL
Describe one functional block of the channel-1 REC/PLAY AMPL card, from the
drawing: what goes in, what comes out, every component in the signal path in
order, what controls it, and under what control condition each branch is
active. Every claim cites drawing coordinates. Unknown behaviour stays marked
unknown.

SOURCE AND TOOLS
- Render: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/amp/full-1.png
  (9000 x 5250, 300 dpi render of the Tascam 38 AMPLIFIER SCHEMATIC DIAGRAM).
  Cite full-res pixel (x, y).
- Crop: python3 -I /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-tascam-38-electronics/43e4011f-e512-4340-bd8a-e8387fb71c87/scratchpad/crop.py SRC X0 Y0 X1 Y1 OUT WIDTH GRID
  WIDTH/(X1-X0) is the zoom; GRID draws labelled lines every GRID px. Read the
  png to view it. One crop per Bash call; no shell loops.
- Channel-1 card drawing: x ~4750-8400, y ~850-2650. Card connectors J101-J108
  at y ~2650.

ESTABLISHED INPUTS (you may rely on these)
- /Users/orion/work/audio-circuits-work/tascam-38-electronics/docs/tascam-38/interface-matrix.csv
  Rows marked VERIFIED were traced on both card and motherboard sides by two
  independent tracers. Read it to know what each card contact connects to.
  Rows marked UNRESOLVED are open; do not treat them as known.
- /Users/orion/work/audio-circuits-work/tascam-38-electronics/docs/tascam-38/trace/
  Per-contact trace reports with coordinates; useful starting points.
- Supply rails by their printed P171 names: 0V (P171-7/11), 24V (P171-8),
  +B(15V) (P171-9, card contacts J105-5 J106-4 J107-3), -B(-15V) (P171-10,
  card contacts J103-5 J105-6 J106-3 J107-4).
- The card's thick common bus (y ~1362 and y ~2095) is reached by J101-3,
  J102-1, J102-6, J106-2/5/6/8; motherboard 0V reaches it through J106-5/6.

DRAWING CONVENTIONS
- A filled dot is a junction; a crossing without a dot is not connected.
- Italic voltage texts at nodes are printed DC operating values, not rail
  names. Quote them as "annotated x V".
- Relay contacts: say which terminal is the moving (common) contact and which
  fixed contact the moving contact is DRAWN resting on. A schematic normally
  draws relays de-energised; say "drawn position" rather than asserting the
  energised state unless the drawing marks it.
- Transistors: identify type from the symbol (NPN/PNP BJT, N/P JFET or
  MOSFET) and name each terminal. Part numbers for transistors and ICs are
  listed in a parts table near (2000-2900, 1150-1650) on the sheet; quote
  them if you can read them.
- Read every designator and value exactly. If unreadable, say so.

ANALYSIS RULES
- Trace, then interpret. For each block, first give the component-level path
  (ordered, with coordinates), then a short interpretation. Mark every
  interpretation as such ("interpretation:") and keep it separate from what
  the drawing shows.
- Do not import knowledge of how tape machines usually work as evidence. You
  may use standard circuit knowledge to interpret a traced topology (e.g.
  "a JFET with its gate pulled to -15V through a diode is held off"), but
  state the reasoning.
- Do not infer active-high/low from a signal NAME. Infer it only from the
  traced driving circuit and device polarity, and say which.
- If a path leaves your block, name where it goes and stop.

OUTPUT
Use the Write tool to write the file named in your task. Structure:

  Block: <name>
  1. Inputs (card contact, or internal node, with coordinates)
  2. Outputs
  3. Component path, in signal order, with coordinates
  4. Control elements: each relay / switching transistor, its control
     input, the traced drive circuit, and what it connects or shunts in
     each state
  5. Operating annotations printed on the drawing (voltages, AC levels)
  6. Interpretation (clearly separated)
  7. Unknowns and open questions, each with the exact location and what
     evidence would resolve it

Your final message is a short summary; the file is the deliverable. Do not
edit the git repository; do not commit.

ENVIRONMENT CONSTRAINTS
- Never write memory files (~/.claude/projects/*/memory/).
- Never put '#' characters inside Bash heredocs or multi-line quoted
  arguments; use the Write tool for files.
- Never use sed to write files.
