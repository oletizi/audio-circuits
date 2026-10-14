Block: OUT SELECT PCB and OUT SELECT LED PCB (Pass 4)

Sheet: AMPLIFIER sheet (amp/full-1.png) for every coordinate below. Full-res
pixels (x, y).

Crops (scratchpad/pass4/crops-outselect/):
- overview.png    1600-3400 x 3650-4700, 1:1
- led.png         3200-4400 x 3650-4700 (LED PCB, J201, D251-D253)
- input.png       1700-2150 x 3850-4520, 3x (INPUT section, J181 run-outs)
- top-left.png    1750-2650 x 3800-4060, 2x (J181, J180 pin exits)
- top-right.png   2550-3300 x 3850-4250, 2x (Q204, R266, P201)
- mid-bus.png     2380-2680 x 3880-4560, 3x (REPRO poles, J180 routing)
- sync.png        2100-2420 x 4000-4520, 3x (SYNC section, C204-C206)
- xstr.png        2580-3120 x 4180-4560, 3x (Q201, Q202, Q203)
- q204.png        2900-3120 x 4060-4200, 5x (Q204 symbol)
- thick-cross.png 2500-2620 x 3930-4080, 8x (crossings of the thick 0V riser)
- bus-cross.png   2440-2640 x 4280-4380, 6x (crossings at the y 4307 bus)

Parts table (already read in block-control-muting.md): Q201, Q203 2SC1684S
(NPN); Q202, Q204 2SA720Q (PNP); D201-D207 1S2473HJ. Symbols agree: Q201 and
Q203 emitter arrows point away from the base; Q202 and Q204 emitter arrows
point toward the base (q204.png, xstr.png).

=====================================================================
1. Inputs / outputs (connectors)
=====================================================================

J180 / P180 (pins at y ~3875; x: 5 = 2433, 4 = 2459, 3 = 2484, 2 = 2509,
1 = 2537) (top-left.png, mid-bus.png):
- J180-5: down to the thick line y ~3952, which runs right to P201-1 and has a
  junction at (2562, 3952) where a thick riser x 2562 goes down to the thick
  switch-common bus y ~4307 (junction 2562, 4307) and on to the thick bottom
  bus y ~4487 (Q201/Q203 emitters, R257, R262, C208). This is the board's 0V.
  The interface matrix places P180-5 on P171-7 0V.
- J180-1: down x 2537 to a junction at (2535, 4057). From there: (a) right
  along y 4057 to x 3103, down to Q204 emitter (3052, 4100, annotated 24V) and
  on down to y 4218 to Q202 emitter (2732, 4218, annotated 24V); (b) down
  through a junction at (2535, 4163) on the line y 4163 (the upper-pole
  "pressed" contacts), and on to y 4431, left to x 2387, up to the REPRO
  lower-pole common (2414, 4393) and to the bottom of C206. The matrix places
  P180-1 on P171-8 24V. So J180-1 is the board's only supply.
- J180-2: down x 2509 to y 3905, right to x 2912, down to y 4100, the Q204
  collector (2912, 4100, annotated 24V).
- J180-3: down x 2484 to y 3928, right to x 2587, down to y 4218, left end of
  Q202 = collector (2678, 4218, annotated 24V).
- J180-4: down x 2459 to y 4057, right to x 2509, down to y 4358, then the line
  y 4358 runs left: dot at (2450, 4358) down to the REPRO lower-pole OFF
  contact (2450, 4380); dot at (2387, 4357) top of C206 0.01; continues left
  to the SYNC lower-pole common (2198, 4393 via x 2120) and the INPUT
  lower-pole common (1970, 4393 via x 1938). The line carries the printed
  "24V" at (2185, 4375).

J181 / P181 (pins at y ~3875; x: 3 = 2163, 2 = 2188, 1 = 2213):
- J181-1: y 3948, left to x 1847, down to y 4425, right to the INPUT
  lower-pole lower contact (2010, 4405).
- J181-2: y 3923, left to x 1822, down to y 4458, right along y 4458 to the
  dot at (2235, 4460) (SYNC lower-pole lower contact, 2235, 4407) and on to
  R268 1k bottom (2287, 4460).
- J181-3: y 3899, left to x 1795, down to y 4485, right along y 4487 to the
  dot (2312, 4487) (bottom of R269) and on to the REPRO lower-pole ON contact
  (2450, 4410) via x 2450.

P201 / J201 (OUT SELECT PCB to OUT SELECT LED PCB, pins at x ~3200 / 3285,
y 3955 (1), 3982 (2), 4005 (3), 4030 (4)):
- P201-1: the thick 0V line y 3952 (J180-5).
- P201-2: line y 3978 from the top of R265 4.7k (1897, 3978).
- P201-3: R266 2.2k (2805-2870, 4005); its left end is the junction (2805,
  4005) on the line y 4003, which runs from SYNC node A (x 2119).
- P201-4: line y 4030 from the top of R267 1.2k (2340, 4029).
- LED PCB (led.png): J201-1 goes right along y 3958 to x 3468, down to y 4268,
  joining the right-hand (cathode) ends of D251, D252, D253 (triangles point
  right). J201-2 -> x 3359 -> D251 "INPUT" anode (y 4058). J201-3 -> x 3337 ->
  D252 "SYNC" anode (y 4165). J201-4 -> x 3310 -> D253 "REPRO" anode
  (y 4268). Nothing else is on the LED PCB.

So: J201 is an OUTPUT of this board (LED drive), not an off-board input. The
signal reaching R266/Q203 "from J201-3" is the SYNC switch node itself, which
also feeds the SYNC LED. There is no off-board control input to the OUT
SELECT PCB at all: its only external connections are 24V (J180-1), 0V
(J180-5), the four outputs P180-2/3/4 and P181-1/2/3, and the LED connector.

=====================================================================
2. Switches
=====================================================================

Three two-pole switches, labelled INPUT, SYNC, REPRO (REPRO contacts marked
OFF / ON). Each switch's two poles are joined by a dashed line (mechanical
gang): INPUT x ~1990, SYNC x ~2215, REPRO x ~2430. No dashed line or other
mark joins the three switches to each other: no mechanical interlock is
drawn. Nothing in the symbol distinguishes momentary from latching; the
symbol is a plain changeover with an arrowed blade.

Drawn positions (drawing fact):
- INPUT upper pole: common (1972, 4095), blade drawn on the upper contact
  (2010, 4082) -> x 2065 -> 0V bus (dot 2063, 4305). Lower contact (2012, 4110)
  -> y 4163 line (24V).
- INPUT lower pole: common (1970, 4393) on the P180-4 line; blade drawn on the
  upper contact (2010, 4378), which has NO wire; lower contact (2010, 4405) ->
  P181-1.
- SYNC upper pole: common (2198, 4096); blade drawn on the LOWER contact
  (2235, 4108) -> down to the dot (2235, 4163) on the 24V line. Upper contact
  (2235, 4081) -> x 2286 -> 0V bus (dot 2286, 4305).
- SYNC lower pole: common (2198, 4393) on the P180-4 line; blade drawn on the
  LOWER contact (2235, 4407) -> P181-2. Upper contact (2233, 4380) has no wire.
- REPRO upper pole: common (2414, 4096); blade drawn on OFF (2450, 4083) ->
  x 2481 -> 0V bus (dot 2480, 4307). ON (2450, 4110) -> dot (2450, 4163) on the
  24V line.
- REPRO lower pole: common (2414, 4393) on 24V (J180-1); blade drawn on OFF
  (2450, 4380) -> P180-4 line. ON (2450, 4410) -> P181-3.

So the sheet draws SYNC pressed and INPUT, REPRO released. The printed
operating voltages agree with that state (SYNC node A "24V" at (2128, 4080);
Q201 base 0.6V / collector 0V; Q203 base 0.6V / collector 0V; Q202 and Q204
collector 24V, bases 23.4V).

Pattern common to all three upper poles: released -> section "node A" is tied
to 0V; pressed -> node A is tied to 24V.

=====================================================================
3. Upper-pole networks (one per switch), node A = upper-pole common
=====================================================================

INPUT (input.png): node A (1897-1972, 4095).
- R265 4.7k, x 1897, node A up to y 3978 -> P201-2 -> D251 INPUT LED -> 0V.
- R251 100k, x 1897, node A down to node B (1897, 4238).
- R252 82 (x 1947) from node A down to D201 cathode; D201 (triangle apex up at
  1947, 4200) anode at node B (1947, 4238).
- C201 100 25V, node B (1947, 4240) to the 0V bus (y 4305).
- D204, anode node B (1895, 4250), cathode down to the line y 4328.
SYNC (sync.png): node A (2118-2198, 4096), annotated 24V.
- Line y 4003 from x 2119 up from node A -> junction (2805, 4005) -> R266 2.2k
  -> P201-3 -> D252 SYNC LED -> 0V; and x 2805 down to the Q203 network.
- R253 100k (x 2118) node A to node B (2118, 4232); R254 82 (x 2172) node A
  to D202 cathode, D202 anode node B; C202 100 25V node B to 0V bus; D205 anode
  node B, cathode to y 4328 (dot 2118, 4328).
REPRO (sync.png, mid-bus.png): node A (2340-2414, 4096).
- R267 1.2k (x 2340) node A up to y 4029 -> P201-4 -> D253 REPRO LED -> 0V.
- R255 100k node A to node B (2340, 4232); R256 82 (x 2390) to D203 cathode,
  D203 anode node B; C203 100 25V node B to 0V bus; D206 anode node B,
  cathode to y 4328 (dot 2340, 4328).

Diode-OR: the line y 4328 joins the cathodes of D204, D205, D206 and runs
right to x 2611, down to Q201 base node (2611, 4388). At (2560, 4333) the
line crosses the thick 0V riser; bus-cross.png shows a crossing of normal
width, not a round junction dot like the one at (2562, 4307). Read as no
connection (a connection would hold Q201 off, contrary to its printed 0.6V
base).

=====================================================================
4. Transistor drivers
=====================================================================

Q201 (2SC1684S NPN) / Q202 (2SA720Q PNP) -> P180-3 (K102 coil) (xstr.png):
- Q201 base (2663, 4388), annotated 0.6V; R257 22k base node to 0V (2611,
  4487); emitter to 0V bus (2703, 4487); collector (2703, 4365) annotated 0V.
- R258 1.2k, Q201 collector up to Q202 base node (2703, 4284), annotated 23.4V.
- R259 100k, Q202 base node to Q202 emitter line (dot 2779, 4219).
- Q202 emitter (2732, 4218) on 24V; collector (2678, 4218) -> x 2587 -> J180-3.
Q203 (2SC1684S NPN) / Q204 (2SA720Q PNP) -> P180-2 (K101 coil):
- x 2805 (SYNC node A via line y 4003) down to the R261 junction (2806, 4285)
  and on to R260 100k left end (2805, 4389).
- R260 100k from x 2805 to node C (2882, 4389).
- R261 2.7k from (2806, 4285) to (2882, 4285), down to D207 cathode; D207
  (triangle apex up, 2882, 4340) anode at node C.
- C208 47/25V node C to 0V bus (2882, 4487).
- Node C joins Q203 base (2988, 4389), annotated 0.6V; R262 47k from (2935,
  4389) to 0V.
- Q203 emitter to 0V bus; collector (3027, 4363), annotated 0V, up through
  R263 2.7k to Q204 base node (3027, 4167), annotated 23.4V; R264 100k from
  there to the emitter line x 3103.
- Q204 emitter (3052, 4100) on 24V; collector (2912, 4100) -> J180-2.

Nothing from INPUT or REPRO reaches the Q203 network.

=====================================================================
5. State tables
=====================================================================

Drawing facts give the switching; levels below follow from the traced
topology. "open" = no source on this board (the line is then defined only by
its load on the card / C204-R268 / C205-R269). "24V" = tied by a switch
contact or a saturated PNP to the J180-1 24V line.

Steady state (after the RC delays in section 6):

| Condition     | P180-1 | P180-2 K101 | P180-3 K102 | P180-4 | P180-5 | P181-1 | P181-2 | P181-3 |
| ---           | ---    | ---         | ---         | ---    | ---    | ---    | ---    | ---    |
| INPUT pressed | 24V in | open (Q204 off) | 24V (Q202 on) | 24V | 0V | 24V | open | open |
| SYNC pressed (as drawn) | 24V in | 24V (Q204 on) | 24V (Q202 on) | 24V | 0V | open | 24V | open |
| REPRO pressed | 24V in | open (Q204 off) | 24V (Q202 on) | open (C206 0.01 to 24V only) | 0V | open | open | 24V |
| none pressed  | 24V in | open | open (Q201 off) | 24V | 0V | open | open | open |

Reasons:
- P180-1, P180-5: supply in (24V) and 0V; never switched on this board.
- P180-2: Q204 conducts only when Q203 conducts; Q203's only drive is SYNC
  node A through R260. INPUT / REPRO / none -> SYNC node A at 0V -> Q203 off
  (R262 47k) -> Q204 off (R264 100k base-emitter).
- P180-3: Q202 conducts when Q201 conducts; Q201 base is the diode-OR of the
  three node-B capacitors. Any one switch pressed charges its C20x through
  R25x 100k from 24V; with none pressed all node A's are at 0V, all node B's
  discharged, Q201 off (R257), Q202 off (R259).
- P180-4: fed only through the REPRO lower pole OFF contact from 24V.
- P181-1 / -2: fed from P180-4 through the INPUT / SYNC lower poles. If REPRO
  were pressed together with INPUT or SYNC (no interlock is drawn), P181-1/-2
  would follow P180-4, i.e. be unpowered.
- P181-3: REPRO lower pole ON contact from 24V.
- LEDs: INPUT LED lit when INPUT pressed (24V via R265 4.7k), SYNC LED when
  SYNC pressed (R266 2.2k), REPRO LED when REPRO pressed (R267 1.2k); all off
  with none pressed. All LED cathodes on 0V via P201-1.

=====================================================================
6. Timing elements (interpretation from traced values)
=====================================================================

- K102 drive delay (all three switches): on pressing, node B rises from 0V
  through 100k into 100uF (time constant 10 s) and Q201 starts to conduct
  only once node B exceeds about two diode drops (D20x + Q201 Vbe, about
  1.2 V). Standard RC arithmetic puts that at roughly 0.5 s after the press,
  on the order of; not measured. On release, node B is discharged through
  D20x (D201/D202/D203) and the 82 ohm R25x into node A, which the switch has
  just tied to 0V (time constant about 8 ms), so the capacitor of the
  released section empties almost at once. Interpretation: changing the
  selection drops K102 (P180-3 goes open) for the charge time of the newly
  selected section's capacitor, then re-energises it - a switching mute on
  the line output. The 82 ohm / diode discharge path makes the mute repeat on
  every change, even a fast one.
- K101 drive delay (SYNC only): node C charges through R260 100k against
  R262 47k (Thevenin about 7.7 V, about 32k) into C208 47uF (time constant
  about 1.5 s); Q203 turns on once node C passes about 0.6 V, a small fraction
  of that constant. On SYNC release C208 discharges through D207 and R261
  2.7k into node A (now 0V). Interpretation: K101 pulls in shortly after SYNC
  and drops quickly when SYNC is released; K101 changes over while K102 is
  still held off by the section-3 delay, so the head-switching click falls
  inside the mute. These delay figures are back-of-envelope, not printed.
- C204 10uF 35V (BP) in series with R268 1k from P181-2 to 0V (sync.png, x
  2287 from 4305 to 4460). C205 10uF 35V (BP) in series with R269 1k from
  P181-3 to 0V (x 2312, 4305 to 4487); C205 and R269 are drawn in BROKEN
  (dashed) lines, unlike C204/R268. Interpretation: dashed suggests an
  optional or variant-only fitting; the drawing has no note saying so.
- C206 0.01 from the P180-4 line to the 24V REPRO common (x 2387, 4357 to
  4393): across the REPRO lower-pole OFF contact. Interpretation: contact
  snubber / softens the P180-4 edge.
- No latches or monostables on this board; the only memory is the switch
  itself.

=====================================================================
7. Unknowns
=====================================================================

U1. Momentary vs latching, and interlock. The symbols are plain changeover
    contacts with per-switch dashed gang lines; no interlock bar or note is
    drawn near (1700-2700, 4050-4450). The state table assumes exactly one
    switch pressed at a time (the drawn state shows one). Resolve: front-panel
    hardware inspection or a parts list / switch description elsewhere in the
    service manual.
U2. Crossing at (2560, 4333) (diode-OR line over the thick 0V riser) and
    (2587, 3952) (J180-3 over the thick 0V line): both read as no-dot
    crossings, by comparison with the true junction dots at (2562, 4307) and
    (2562, 3952). Resolve: continuity check on the board.
U3. C205 / R269 drawn dashed: whether fitted. Resolve: board inspection or a
    parts list.
U4. Delay durations are calculated from component values, not printed or
    measured. Resolve: scope P180-3 and P180-2 against a switch press.
U5. The drawing shows no polarity mark legible enough on C204/C205 (BP =
    bipolar printed) - no issue; C201-C203, C208 polarity marks were not
    read. Resolve: higher-zoom crop if polarity matters.
