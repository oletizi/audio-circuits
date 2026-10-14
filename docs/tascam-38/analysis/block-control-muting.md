Block: MUTING AND CONTROL LOGIC ON THE CH1 REC/PLAY AMPL CARD

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/pass3/crops-control/:
overview.png, k101.png, k101-contacts.png, k101-upper-dest.png,
k101-upper-path.png, k102.png, j102.png, q101-q103.png, u101a-fb.png,
bus-crossings.png, q107.png, srcsel.png, r126-bias.png, q109.png,
q109-zoom.png, q108.png, parts-table.png, outsel-overview.png,
outsel-switches.png, outsel-lowerpoles.png, outsel-right.png, outsel-j180.png.

Contact-to-motherboard mapping comes from interface-matrix.csv (VERIFIED rows
only). Statements marked [OUT SELECT] come from the OUT SELECT PCB drawing
(x 1700-3200, y 3800-4550), not from the card.

Parts table (crop parts-table.png, around x 1980-2900, y 1150-1640), read
directly:
- Q101, Q103, Q105-Q107, Q110: 2SK68AM
- Q108, Q111, Q118, Q120: 2SC1684S
- Q109, Q112: 2SA733P
- Q119: 2SC1318S
- D101, D102, D104, D106-D109, D112, D114-D120: 1S2473HJ; D110, D111: 1N60
- U101: JRC-4558D-D; U102: RC-4558T1
- OUT SELECT PCB: Q201, Q203 2SC1684S; Q202, Q204 2SA720Q; D201-D207 1S2473HJ

Symbols, as drawn: all six 2SK68AM have the gate arrow pointing INTO the
channel, so they are N-channel JFETs (srcsel.png, q101-q103.png, q107.png).
Q108's emitter arrow points away from the base, so it is NPN (q108.png). Q109's
emitter arrow points toward the base bar, so it is PNP (q109-zoom.png). Its
printed voltages agree with that: emitter 24V, base 23.4V. The part numbers
agree too (2SC = NPN, 2SA = PNP, 2SK = N-channel FET).

None of the JFET gates (Q101, Q103, Q105, Q106, Q107, Q110) has a resistor of
its own. Each gate connects ONLY to the anode of its series diode. Nothing else
touches the gate line in any crop.

------------------------------------------------------------------------
1. Inputs (control)

| Card contact | Motherboard net (matrix) | Card node it reaches | Printed annotation |
| --- | --- | --- | --- |
| J101-2 | P180-2 (OUT SELECT) | K101 coil top / D101 cathode, line y ~1032 | 24V (5250, 1005) |
| J101-1 | P171-7 0V | K101 coil bottom / D101 anode, line y ~1093 | - |
| J102-4 | P180-3 (OUT SELECT) | K102 coil top / D120 cathode, line y ~960 to x ~7393 | 24V (7225, 945) |
| J102-3 | P171-3 POWER MUTE | K102 coil bottom / D120 anode, line y ~1036 to x ~7366 | none |
| J104-1 | P171-6 PLAY MUTE | D119 cathode (line y ~1488) | -6.8V (6060, 1480) |
| J104-2 | P180-4 (OUT SELECT) | Q109 emitter, R133 right end (dot 6953, 1618) | 24V (6935, 1530) |
| J104-3 | P174-1 (FUNCTION PCB) | D109 anode (line annotated 24V, ~7000, 1950) | 24V |
| J104-4 | P181-1 (OUT SELECT) | D118 anode (line y ~1497) | none read |
| J104-5 | P181-2 (OUT SELECT) | R135 18k bottom (line annotated 24V, ~6830, 1935) | 24V |
| J104-6 | P171-7 0V | Q108 emitter, R137, C119 (dot 6959, 1903) | - |
| J103-2 | P181-2 (same net as J104-5) | R129 100k top, D104 cathode (line y ~1585) | 24V (5590, 1572) |
| J103-4 | P181-3 | R127 100k top, D102 cathode (line y ~1505) | -15V (5570, 1495) |
| J103-6 | P181-3 (joined to J103-4 on the motherboard) | R126 82k left end via line y ~1490 / x ~6205 | - |
| J103-5 | P171-10 -B(-15V) | bottoms of R127, R129, R125, R131, R158; C141, C142, C143 | -15V |

2. Outputs (what the control elements act on)
- K101 contacts: switch the reproduce-head lead (J101-4) to or from the
  L101 / TR101 pin 1 node.
- K102 contact: switches the U101 2/2 output (after C106) to the line output
  J102-2 / J102-5.
- Q107: shunts the U101 1/2 output line after C105 (the line that feeds the
  tops of R122 and R120) to the card common bus.
- Q110 / Q106 / Q105: select which source reaches the common node (y ~1110,
  x 6413-6680, dot 6545, 1110) that runs up to W109 / U101 2/2. The audio
  routing is described here only as far as it identifies what is switched.
- Q101 / Q103: switch trimmer branches into the U101 1/2 feedback network.

3. Component paths, with coordinates

3a. K101 (k101.png, k101-contacts.png)
- Coil box about (5300-5355, 1045-1070). Top terminal: dot (5328, 1018) on
  line y ~1018, annotated 24V, which runs left to J101-2. Bottom terminal: dot
  (5328, 1093) on line y ~1093, which runs left to J101-1.
- D101 at (5402, 1055): triangle apex up, bar at the top. Cathode is on the top
  line (J101-2) and the anode on the bottom line (J101-1). D101 sits across the
  coil reverse-biased when J101-2 is the more positive end.
- Contacts: the moving contact pivots at (5338, 1159) and is wired right to the
  dot at (5395, 1160), which is L101 top / TR101 pin 1. In the drawn position
  the blade rests on the UPPER fixed contact, whose downturned tip is at (5310,
  1150). The upper fixed contact (circle at 5283, 1145) runs left to x 5219 and
  then down. It crosses the bus at (5219, 1362) with no dot and continues down
  to y ~1752. From there it appears to run right towards the K103 contact area
  (~6530, 1920), but this was not confirmed at high zoom (k101-upper-path.png).
  The lower fixed contact (circle 5283, 1172, hook at 5310, 1165) is open as
  drawn and runs left on y ~1172 to J101-4. It crosses x 5219 at (5219, 1172)
  with no dot.

3b. K102 (k102.png, j102.png)
- Coil box (7165-7220, 985-1010). Top terminal: dot (7192, 960) on line y ~960,
  annotated 24V, running right to x ~7393 and then down to J102-4 (J102-4
  enters at x ~7382, j102.png). Bottom terminal: dot (7192, 1037) on line y
  ~1037, running right to x ~7366 and then down to J102-3 (x ~7355 at the
  connector). The order of the two verticals is preserved, with a scan offset
  of about 11 px.
- D120 at (7123, 1000): triangle apex up, bar at the top. Cathode is on the top
  line (J102-4) and the anode on the bottom line (J102-3).
- Contact: an enclosed reed-style contact (glass-envelope outline, 7155-7225,
  1090-1135). The blade is fixed at the left (C106 / R118 side, dot 7123, 1112)
  and is drawn angled up to (7210, 1098), clear of the right contact (7215-7240,
  1112). It is drawn OPEN. The right contact goes to the dot at (7258, 1112),
  which is R164 100k and J102-2 / J102-5.

3c. Q107 PLAY MUTE shunt (q107.png)
- Q107 is an N-JFET, drawn mirrored with the gate on the right at (6070, 1200).
- Upper channel terminal (6028, 1180) goes up to the dot at (6028, 1110). That
  dot is on the line from C105 10/50V (right plate ~6000, 1110) to R122 top
  (dot 6152, 1110), and that line carries on to R120 top (~6310, 1110,
  srcsel.png).
- Lower channel terminal (6028, 1215) goes down to the bus dot at (6028, 1362).
- Gate goes right to (6098, 1200), then down to D119 at (6098, 1310). D119's
  triangle points down with the bar at the bottom: anode at the gate, cathode
  below. The cathode line crosses the bus at (6098, 1362) with no dot and
  continues to y ~1488, where it is annotated -6.8V and runs right towards
  J104-1.

3d. Q101 / Q103 (q101-q103.png, u101a-fb.png, bus-crossings.png)
- U101 1/2 pin 6 node: pin 6 goes to x 5652, then to dot (5652, 1197), then to
  dot (5703, 1197). On this node: C102 100/10V in series with R103 330 to the
  bus (dot 5652, 1362); C104 270p (between 5703 and 5838 on y 1197); R106 33k
  (5703 to 5862 on y 1240); and the vertical x 5703 running down.
- Node N1 is the dot at (5862, 1197-1240): R104 470k and C103 0.012 from the
  pin 7 output; the right ends of C104 and R106; and the top of R107 1.5k.
- The bottom of R107 crosses the bus at (5862, 1362) with NO dot, jogs to
  (5883, 1395), and runs down x 5883. That vertical takes in Q101's right
  channel terminal (dot 5883, 1430) and Q103's right terminal (via the corner
  at 5883, 1572).
- Q101's left terminal goes to R108 5k(B) (wiper strapped to its right end at
  5780, 1388-1430), then to the dot at (5703, 1430) on x 5703.
- Q103's left terminal goes to R110 5k(B) (wiper strapped to the right end at
  5785, 1575), then to (5703, 1572) on x 5703.
- x 5703 crosses the bus at (5703, 1362) with NO dot. It reaches the pin 6 node
  only at (5703, 1197).
- Q101 gate (5835, 1505) runs left on y 1505 to the anode of D102 (5612, 1505).
  D102's triangle points left: cathode on the left on the J103-4 line
  (annotated -15V; R127 100k to -15V at dot 5512, 1505).
- Q103 gate (5832, 1650) runs left on y 1650, up x 5652 to y 1580, then to the
  anode of D104 (5612, 1580). D104's triangle points left: cathode on the
  J103-2 line (annotated 24V; R129 100k to -15V at dot 5565, 1580).
- So each JFET plus its trimmer forms a branch from N1, through R107, back to
  the pin 6 node. That branch sits in parallel with R106 33k // C104 270p.

3e. Source-selection gate lines (C14) (srcsel.png, r126-bias.png, q109.png,
q108.png)

Each source JFET's gate goes to the ANODE of its diode, and each diode's
triangle points down (cathode below). Each cathode runs down, crosses the bus
y 1362 with no dot seen, and reaches a bias node:

| JFET | Gate diode | Bias node | Printed V | Elements on the node |
| --- | --- | --- | --- | --- |
| Q110 INPUT | D112 (6337, 1310) | dot (6337, 1545) | 20.6V | R158 100k and C141 0.47/50V to -15V; R159 10k to node X |
| Q106 SYNC | D107 (6470, 1310) | dot (6470, 1590) | -5.8V | R131 100k and C142 0.47/50V to -15V; R132 68k to node S |
| Q105 REPRO | D106 (6598, 1310) | dot (6598, 1490) | -15V | R125 100k and C143 0.47/50V to -15V; R126 82k to J103-6 (P181-3) |

The -15V rail for these is the line y ~1676 (dots 6337, 6385, 6470, 6517,
6598, 6648, 1676). It carries the bottoms of R158, R131, R125 and C141, C142,
C143, which the matrix places on J103-5 (-B).

- Node X (Q109 collector line, dot 6702, 1544, annotated 24V): R159 10k from
  the INPUT bias node; Q109 collector (left terminal, 6850, 1545); R204 68k
  (6700-6800, 1497) to the cathode of D118. D118's triangle points left (anode
  on the right) and its anode runs right on y 1497 to x ~7170, then down to
  J104-4 (P181-1).
- Q109 PNP 2SA733P (q109.png):
  - emitter (6895, 1545) to (6953, 1545), then to dot (6953, 1618): J104-2
    (P180-4); emitter annotated 24V
  - base (6873, 1585) to dot (6873, 1618), annotated 23.4V
  - R133 100k from the base dot (6873, 1618) to the emitter dot (6953, 1618)
  - R136 27k from the base dot down to the Q108 collector (dot 6873, 1750)
- Node S (dot 6795, 1750, line annotated 0.6V at 6800, 1590):
  - R132 68k right end, via y ~1590 and x 6795
  - top of R135 18k; R135 bottom is on the J104-5 line, annotated 24V
  - anode of D108; D108's triangle points right, cathode at the Q108 collector
    (dot 6873, 1750), annotated 0V
- Q108 NPN 2SC1684S (q108.png):
  - collector (6873, 1780) up to (6873, 1750)
  - emitter (6870, 1820) down to y 1903, then to dot (6959, 1903): J104-6
  - base (6900, 1800), annotated 0.6V, at dot (6960, 1800): R137 47k to the
    emitter dot; R138 68k to dot (7037, 1800)
  - dot (7037, 1800): C119 2.2/50V to the emitter dot (6959, 1903), and R139
    "68" (printed without a k) to the cathode of D109
  - D109 (7115, 1893): triangle apex up, cathode at the top towards R139,
    anode below on the J104-3 line (annotated 24V)
- Q110 / Q106 / Q105 channel terminals: all three upper terminals join the
  line y ~1110 (dot 6545, 1110, which goes up to W109). Lower terminals: Q110
  goes down x 6413 to y 1412 and then left (an input source, not followed).
  Q106 goes via y 1265 to the R122 10k(B) wiper (6205, 1190). Q105 goes via
  y 1240 to the R120 10k(B) wiper (~6311, 1190).

3f. OUT SELECT board drive of P180 / P181 [OUT SELECT]
(outsel-switches.png, outsel-lowerpoles.png, outsel-j180.png, outsel-right.png)
- J180 pins sit at about x 2432 (5), 2457 (4), 2482 (3), 2508 (2) and 2533 (1),
  at y ~3875. J180-5 goes to the thick bus y ~3950 (0V; the matrix places
  P180-5 on P171-7). J180-1 is on the 24V rail: the matrix row J107-2 lists
  P180-1 on P171-8 24V, and the PNP emitters it feeds are annotated 24V.
- Three two-pole switches, labelled INPUT, SYNC and REPRO (REPRO poles marked
  OFF / ON), with the poles linked by dashed lines. Lower poles, as drawn:
  - INPUT lower pole: common at (1970, 4395). The blade is drawn on the upper
    contact (2010, 4378), which has no wire. The lower contact (2010, 4407)
    goes to y 4428 and then the line to P181-1. So P181-1 is UNDRIVEN as drawn.
  - SYNC lower pole: common at (2195, 4393), on the line annotated 24V. The
    blade is drawn on the lower contact (2235, 4408), which goes to the dot at
    (2235, 4460), the line to P181-2 (also R268 1k). So P181-2 = 24V as drawn.
  - REPRO lower pole: common at (2395, 4395), on a loop to y 4430 and x 2533,
    which is the J180-1 24V line. The blade is drawn on the OFF contact (2450,
    4378), which goes to the dot at (2450, 4357). The ON contact (2450, 4410)
    goes to y 4485 and then to P181-3. So P181-3 is UNDRIVEN as drawn.
  - The dot at (2450, 4357) is on the line y ~4357. That line joins J180-4
    (via x 2508, y 4055, x 2457) and also runs left to the INPUT lower common
    (loop at 1940, 4357-4395) and the SYNC lower common (dot 2120, 4357).
  - So P180-4, and with it the INPUT and SYNC lower-pole commons, gets 24V only
    while REPRO is at OFF. REPRO ON moves the 24V from P180-4 to P181-3.
- K101 / K102 drivers on the OUT SELECT board:
  - Q204 (2SA720Q PNP): emitter on the J180-1 line (y 4050 to x 3105, annotated
    24V); base annotated 23.4V with R264 100k to the emitter; R263 2.7k to the
    Q203 collector, annotated 0V. Q204's collector (left, 2910, 4100) goes up
    x 2910 to y 3910, then left to J180-2. So Q204 sources P180-2, which is the
    K101 coil top.
  - Q203 (2SC1684S NPN): base annotated 0.6V, driven through R260 100k / D207 /
    C208 47/25V / R261 2.7k / R262 47k from the R266 2.2k line (y ~4000),
    which runs to J201-3. That line was not followed further.
  - Q202 (2SA720Q PNP): emitter on the same 24V line (via x 3105 to y 4220);
    base annotated 23.4V with R259 100k to the emitter and R258 1.2k to the
    Q201 collector (0V). Q202's collector (left, ~2588, 4220) goes up x 2588
    to y 3930, then left to J180-3. So Q202 sources P180-3, which is the K102
    coil top.
  - Q201 (2SC1684S NPN): base annotated 0.6V; R257 22k to ground; base driven
    from the line y ~4325 / 4330. That line is the cathode bus of D204, D205
    and D206 (triangles pointing down at 1897, 2120 and 2340, 4250), which
    makes it a diode-OR of the INPUT, SYNC and REPRO upper-pole nodes. The
    drive of those nodes (R265 4.7k, R267 1.2k, R251-R256, C201-C203, D201-D203
    and the upper poles) was NOT fully traced.

4. Control elements (input, drive, device, state in which it conducts)

All "conducts when" statements come from the traced polarity of the drive
circuit and the device, not from signal names.

K101 relay coil
- Input: J101-2 (P180-2) at the top of the coil, J101-1 (0V) at the bottom.
- Drive: the bottom is fixed at 0V on the motherboard. The top is sourced by
  Q204 PNP on the OUT SELECT board [OUT SELECT].
- Conducts (coil current) when J101-2 is driven positive. D101 is then
  reverse-biased. If J101-2 went negative of 0V, D101 would conduct, so
  reverse drive cannot energise the coil.
- The drawing annotates J101-2 at 24V, and on the OUT SELECT board Q203 is
  annotated on (base 0.6V, collector 0V) and Q204 on (base 23.4V). The printed
  operating state therefore has the coil driven, yet the contacts are drawn in
  one position only, without an energised marking. Which contact is closed
  when energised is not stated by the drawing.
- Contacts as drawn: the moving contact (L101 / TR101 pin 1) rests on the
  upper fixed contact (the x 5219 line, apparently towards K103). The lower
  fixed contact (J101-4, reproduce-head lead) is open.

K102 relay coil
- Input: J102-4 (P180-3) at the top of the coil, J102-3 (P171-3 POWER MUTE) at
  the bottom.
- Diode: D120's cathode is on J102-4 and its anode on J102-3.
- For coil current to flow, J102-4 must be POSITIVE with respect to J102-3, so
  that current enters the top and leaves through J102-3. D120 is then
  reverse-biased. In practice J102-4 is sourced high (24V, by Q202 PNP on OUT
  SELECT [OUT SELECT]), and J102-3 (POWER MUTE) must be held LOW, i.e. able to
  sink the coil current.
- If J102-3 is raised to or above J102-4, the coil voltage is zero or of
  reverse polarity. D120 then clamps the reverse case to about one diode drop,
  and the coil cannot be energised.
- Either input can therefore drop the relay out: P180-3 by stopping its
  sourcing, or POWER MUTE by not sinking (floating or going high). The source
  of POWER MUTE (P171-3) is not on the card or the OUT SELECT drawing.
- Contact: reed-style, drawn OPEN. It connects the U101 2/2 output (after
  C106) to the line output J102-2 / J102-5 only when it closes.

Q107 PLAY MUTE shunt: N-JFET 2SK68AM
- Input: J104-1 (P171-6) to the cathode of D119; D119's anode is the Q107 gate.
  There is no other element on the gate.
- When J104-1 is pulled sufficiently negative (annotated -6.8V), D119 conducts
  and holds the gate at about -6.2V, below the channel (whose DC level is
  that of the bus side of the shunt). Q107 is then OFF: there is no shunt and
  the signal passes. This is the printed annotated state.
- When J104-1 rises to about 0V or above, D119 is reverse-biased and the gate
  is left with no defined drive. An N-JFET gate with no drive settles near the
  channel potential, because its gate junction forward-biases if the gate goes
  above the channel. Vgs is then about 0 and Q107 is ON, shunting the
  post-C105 line to the bus.
- So the shunt (mute) conducts when PLAY MUTE is NOT held negative, and is open
  when PLAY MUTE is held at about -6.8V.
- What it mutes: the U101 1/2 output after R112 / C105, which feeds the tops
  of R122 (the SYNC source trim) and R120 (the REPRO source trim). The INPUT
  source to Q110 is NOT on this line.
- Whether -6.8V is enough to pinch off a 2SK68AM is a device-data question
  (see section 7).

Q101 and Q103: U101 1/2 feedback branch switches, N-JFETs 2SK68AM
- Q101: input J103-4 (P181-3) to D102 (cathode on the line, anode to the gate).
  The line has R127 100k to -15V on the card.
  - P181-3 undriven: the line sits at -15V (annotated -15V), D102 conducts, the
    gate is at about -14.4V, and Q101 is OFF.
  - P181-3 driven to 24V (REPRO lower pole ON [OUT SELECT]): D102 is
    reverse-biased, the gate floats to the channel, and Q101 is ON. This
    places R107 1.5k + Q101 + R108 5k(B) from N1 to the U101 1/2 pin 6 node,
    in parallel with R106 33k // C104.
- Q103: input J103-2 (P181-2) to D104 (cathode on the line, anode to the gate).
  The line has R129 100k to -15V.
  - P181-2 at 24V (annotated; SYNC lower pole as drawn [OUT SELECT]): D104 is
    reverse-biased and Q103 is ON. This places R107 + Q103 + R110 5k(B) across
    the same pair of nodes.
  - P181-2 undriven: the line is pulled to -15V by R129 and Q103 is OFF.

Q105 REPRO source switch: N-JFET 2SK68AM
- Gate to D106 anode; cathode at the REPRO bias node. That node is fed by
  R126 82k from J103-6 (P181-3) and pulled down by R125 100k to -15V.
  - P181-3 undriven: the J103-4 / J103-6 net is at -15V via R127, the node is
    at -15V (annotated), D106 conducts, the gate is at about -14.4V, and Q105
    is OFF.
  - P181-3 at 24V: the node goes to about -15 + 39 x 100/182 = +6.4V
    (calculated). D106 is reverse-biased and Q105 is ON.
- Conducts only when P181-3 is driven to 24V. The card has no override of
  this gate: neither Q108 nor Q109 reaches it.

Q106 SYNC source switch: N-JFET 2SK68AM
- Gate to D107 anode; cathode at the SYNC bias node. That node is fed by R132
  68k from node S and pulled down by R131 100k to -15V.
- Node S is fed by R135 18k from J104-5 (P181-2) and clamped by D108 into the
  Q108 collector.
  - Q108 OFF, P181-2 at 24V: S is about 24 - 39 x 18/186 = +20.2V and the bias
    node about +5.9V (calculated). D107 is reverse-biased and Q106 is ON.
  - Q108 ON (collector 0V): D108 clamps S to about +0.6V (annotated 0.6V). The
    bias node is about 0.6 - 15.6 x 68/168 = -5.7V (calculated; annotated
    -5.8V). D107 conducts, the gate is at about -5.2V, and Q106 is OFF,
    subject to 2SK68AM pinch-off (section 7).
  - P181-2 undriven: the line is pulled to -15V by R129, which drags S and the
    bias node towards -15V. Q106 is OFF.
- Conducts only when P181-2 = 24V AND Q108 is off.

Q110 INPUT source switch: N-JFET 2SK68AM
- Gate to D112 anode; cathode at the INPUT bias node. That node is fed by
  R159 10k from node X and pulled down by R158 100k to -15V.
- Node X is driven by two sources in parallel: the Q109 collector (PNP high
  side), and J104-4 (P181-1) through D118 + R204 68k. With neither driving,
  X is pulled to -15V through R159 + R158.
  - Q109 ON (emitter 24V from P180-4, collector annotated 24V): the bias node
    is about 24 - 39 x 10/110 = 20.5V (calculated; annotated 20.6V). D112 is
    reverse-biased and Q110 is ON.
  - Q109 OFF, P181-1 at 24V: X is about 23.4 - 38.4 x 68/178 = 8.7V and the
    bias node about +6.5V (calculated). Q110 is ON.
  - Neither: the bias node is about -15V. D112 conducts and Q110 is OFF.
- Conducts when P181-1 is driven high OR Q109 is on.

Q109 (PNP 2SA733P) / Q108 (NPN 2SC1684S) stage
- Q108 input: J104-3 (P174-1, FUNCTION PCB), through D109 (anode at J104-3),
  R139 "68", the C119 2.2/50V node, and R138 68k, to the base. R137 47k runs
  from base to emitter. The emitter is at J104-6 (0V).
- Q108 is ON when J104-3 is high: annotated 24V on the line, base 0.6V,
  collector 0V. Q108 is OFF when J104-3 is low or open, because D109 blocks
  any reverse drive and R137 then discharges the base.
- When J104-3 falls, C119 is left charged. D109 stops it discharging back
  through J104-3, so it can only discharge through R138 into the base and R137.
  Interpretation: this holds Q108 on for a while after J104-3 drops. Turn-on
  is fast, through R139 "68".
- Q108 drives two things:
  1. Through R136 27k, it pulls the Q109 base down.
  2. Through D108, it clamps node S (the SYNC bias feed) to about 0.6V.
- Q109: emitter at J104-2 (P180-4), R133 100k from base to emitter, base
  pulled down via R136 by Q108. Q109 is ON only when Q108 is ON AND P180-4 is
  at 24V; the annotation shows emitter 24V, base 23.4V and collector 24V, i.e.
  on. When on, Q109 drives node X high, which forces Q110 (INPUT) on.
- What Q108 / Q109 drive, in summary: Q108 high forces INPUT on (via Q109),
  provided P180-4 is powered, and forces SYNC off (via D108). It does not
  touch REPRO (Q105), Q101 or Q103.

Q201-Q204 [OUT SELECT]
- Q203 NPN drives Q204 PNP, which sources P180-2 (the K101 coil).
- Q201 NPN drives Q202 PNP, which sources P180-3 (the K102 coil top).
- Q201's base is fed from the diode-OR (D204, D205, D206) of the three
  switch-section nodes. Q203's base is fed from J201-3 through R266 and the
  R260 / D207 / C208 network.
- Both PNPs are annotated on in the printed state.

5. Operating annotations printed on the drawing

Card:
- 24V on the K101 coil top (5250, 1005) and the K102 coil top (7225, 945)
- -6.8V on the D119 cathode line (6060, 1480)
- -15V on the J103-4 line (5570, 1495) and 24V on the J103-2 line (5590, 1572)
- 20.6V INPUT bias node (6310, 1530); -5.8V SYNC bias node (6450, 1580);
  -15V REPRO bias node (6620, 1495)
- 0.6V node S line (6800, 1590)
- Q109: emitter 24V, collector 24V, base 23.4V (6865, 1610)
- Q108: collector 0V (6865, 1785), base 0.6V (6920, 1795)
- 24V on the J104-3 and J104-5 lines (~7000-7050, 1950; 6830, 1935)
- -13.5V on the line at (6975, 1460), which lies outside this block

OUT SELECT [OUT SELECT]:
- 24V on the SYNC lower-pole common (2150, 4385)
- Q202: emitter and collector 24V, base 23.4V; Q201: base 0.6V, collector 0V
- Q204: emitter and collector 24V, base 23.4V; Q203: base 0.6V, collector 0V

These annotations describe ONE consistent state:
- SYNC lower pole drawn closed: P181-2 = 24V
- INPUT and REPRO lower poles drawn open: P181-1 undriven, P181-3 = -15V via
  R127
- REPRO at OFF, so P180-4 = 24V
- FUNCTION P174-1 = 24V, so Q108 and Q109 are on
- PLAY MUTE at -6.8V
- K101 and K102 coils sourced at 24V

In that state, from the trace: Q110 is ON (20.6V node), Q106 is OFF (-5.8V,
despite P181-2 = 24V, because Q108 overrides it), Q105 is OFF, Q101 is OFF,
Q103 is ON and Q107 is OFF.

6. Interpretation (separate from the trace)
- Interpretation: the three diode-and-JFET source switches are positive-true
  inputs on the card. A JFET conducts when its bias node is raised above the
  channel, so that its series diode is reverse-biased and the gate floats to
  Vgs about 0. Pulling the node to -15V turns it off. Undriven OUT SELECT
  lines default to OFF through the card's 100k pull-downs to -15V (R127,
  R129), or through the R159 / R158 and R125 paths.
- Interpretation: Q101 and Q103 change the U101 1/2 gain / EQ network,
  selecting a different trimmed resistance (R108 or R110 plus R107) in
  parallel with R106. The P181-3 line (which also turns on Q105) selects
  Q101, and the P181-2 line (which also enables Q106) selects Q103. So the
  U101 1/2 playback stage gets a per-mode trimmed network for the two
  head-derived sources. Which head feeds U101 1/2 in each mode is the
  K101 / audio-path block's question.
- Interpretation: the FUNCTION line P174-1, through Q108 / Q109, overrides a
  SYNC selection to INPUT. The 0V-clamp-via-D108 and the high-side-via-Q109
  structure is unambiguous in the drawing. C119 delays release of the
  override. The override needs P180-4, which exists only while REPRO is OFF
  [OUT SELECT]. So REPRO ON both selects REPRO and disables the INPUT / SYNC
  lines and the override.
- Interpretation: the OUT SELECT lower poles form an interlock. REPRO ON takes
  24V off the INPUT and SYNC lower commons (the P180-4 net), so P181-1 and
  P181-2 cannot be driven while REPRO is ON [OUT SELECT].
- Interpretation: PLAY MUTE is negative-held-for-pass. Q107 mutes the
  head-playback path (SYNC and REPRO sources) whenever P171-6 is not held
  negative. That includes P171-6 being open, in which case the gate has no
  drive at all.
- Interpretation: K102 needs two conditions, a high-side source on P180-3 and
  a low sink on POWER MUTE. The line output is connected only when both hold.
  The relay is drawn open.

7. Unknowns and open questions
1. Which K101 contact closes when the coil is energised. The drawing shows one
   position (moving contact on the upper contact, J101-4 open) while the
   printed annotation has the coil driven at 24V. Resolve with the service
   manual's convention note, or by bench-checking K101 continuity with the
   coil powered.
2. The K101 upper fixed contact's destination (x 5219, down to y ~1752, then
   apparently to the K103 contacts near 6530, 1920). It needs a
   high-zoom trace along y ~1752 (crop x 5150-6600, y 1700-1950); this belongs
   with the audio-path block.
3. The POWER MUTE (P171-3) and PLAY MUTE (P171-6) drivers are not on this card
   or the OUT SELECT board. Is POWER MUTE an active sink, and in which state?
   Why is PLAY MUTE annotated -6.8V rather than -15V? Resolve on the
   power-supply / control sheet that drives J171 / P171.
4. 2SK68AM pinch-off voltage. Q106 is held at about -5.2V gate (SYNC
   overridden) and Q107 at about -6.2V (PLAY MUTE). Whether those fully turn
   the JFETs off needs the 2SK68AM datasheet Vgs(off) range.
5. R139 is printed "68" with no multiplier at (7120, 1835), next to R138
   "68k". It may be 68 ohm or a missing k. Resolve from the parts list or the
   board.
6. The OUT SELECT upper-pole network (R265 4.7k, R267 1.2k, R251-R256,
   C201-C203, D201-D203, R268 / R269, C204-C206) that feeds the D204-D206 OR
   into Q201 was not traced. Nor was the Q203 base source (J201-3 via R266
   2.2k). These decide when K101 and K102 are sourced, and need a dedicated
   OUT SELECT trace.
7. The P181-1 line on the card (J104-4) carries no voltage annotation, so the
   INPUT-pressed state is not printed. The values in section 4 for that case
   are calculated, not annotated.
8. The JFET gate lines' crossings of the bus y 1362 (6098, 6337, 6470, 6598)
   and the R107 / x 5703 crossings (5862, 5703) show no junction dots. For
   5703 / 5862 this was confirmed at 6x zoom. For the gate lines it was
   checked at about 3x and 4x only; the calculated bias voltages matching the
   annotations support no connection.
