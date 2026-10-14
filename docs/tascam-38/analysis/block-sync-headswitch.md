Block: SYNC PICKUP AND RECORD/SYNC HEAD SWITCHING (channel-1 REC/PLAY AMPL card)

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/pass3/crops-sync/ (named in brackets).
Card-contact meanings come from docs/tascam-38/interface-matrix.csv; only
VERIFIED rows are relied on, and the one UNRESOLVED row touched (J108-1, C17)
is flagged where it matters.

Headline finding (trace, not interpretation): the sync head's pickup path does
NOT have its own preamp. The non-drawn throw of K103's upper set runs to relay
K101, and K101's drawn throw feeds input transformer TR101 and op-amp U101 1/2,
the same front end that K101's other throw connects to the reproduce head
(J101-4). The JFETs Q101 / Q103 sit inside U101's feedback network as switched
EQ branches. U101's output, after a trap and a coupling cap, splits to two
trimmers: R122 feeds Q106 (SYNC) and R120 feeds Q105 (REPRO).

----------------------------------------------------------------------------
1. Inputs
----------------------------------------------------------------------------
- J106-7: sync head lead (motherboard P151 lower contact, VERIFIED). Card side:
  K103 upper set MOVING contact, pivot circle (6591, 1929), plus a permanent
  branch through dot (6620, 1930) to C134 (see section 3C).
- J106-8: the second sync head lead, on the upper common bus at dot (5274, 1362)
  (VERIFIED). It is the head's return in every K103 state.
- J101-4: reproduce head lead, the K101 lower fixed contact (5285, 1172)
  (VERIFIED). Its second lead J101-3 is on the same upper common bus.
- Record drive node (the record amplifier's output network) at dot
  (6432, 1942), reached from U102 2/2 pin 1. That amplifier belongs to
  another agent; only its last stage, up to the K103 contact, is listed here.
- Bias / U103 node: C134 right terminal = W132 upper pad (5908, 2370) = U103
  pin 4 (5961, 2370), and through W132 the "AC65V" node (U103 pin 5).
- Control inputs:
  - J107-7 (FUNCTION PCB P174-1, annotated 24V): K103 drive.
  - J101-2 (OUT SELECT P180-2, annotated 24V) and J101-1 (0V): K101 coil.
  - J103-4 (OUT SELECT P181-3, annotated -15V): Q101 gate drive.
  - J103-2 (OUT SELECT P181-2, annotated 24V): Q103 gate drive.

----------------------------------------------------------------------------
2. Outputs
----------------------------------------------------------------------------
- SYNC: R122 wiper, into Q106's lower channel terminal (6542, 1200). Q106's
  upper channel terminal goes to the source-selection node: dot (6542, 1118)
  on the y~1118 line shared with Q110 (INPUT) and Q105 (REPRO), and up x 6542
  to the W109 line at y~1060. I stop at that node.
- REPRO (a by-product of the shared front end): R120 wiper, into Q105's lower
  terminal (6676, ~1240). Stated only so the shared path is complete.
- Head drive: J106-7 receives the record signal through the K103 upper set in
  the drawn position, and receives C134 (bias) in every position.

----------------------------------------------------------------------------
3. Component path, in signal order, with coordinates
----------------------------------------------------------------------------
3A. Head switching, K103 upper contact set   [k103-upper.png, k103-upper-blade.png]
- Moving contact: pivot circle (6591, 1929), which is J106-7.
- Upper fixed contact: circle (6537, 1915), hook down at x ~6563 ending at
  y ~1923. The wire runs left to (6484, 1915), up x 6484 to (6484, 1758), and
  left along y ~1757 (the SYNC PICKUP LINE, see 3B).
- Lower fixed contact: circle (6537, 1942), hook up at x ~6563 to y ~1934. The
  wire runs left along y ~1942 to dot (6432, 1942), the record drive node.
- DRAWN POSITION: the blade runs from the pivot (6591, 1929) down and left to
  about (6555, 1935). It overlaps the lower contact's upturned hook at
  (6563, 1934), with a clear gap to the upper hook, which ends at y 1923.
  So it is drawn resting on the LOWER fixed contact: head J106-7 is connected
  to the record drive node.
- Relay identity: the dashed actuator runs from the K103 coil (6576, ~1900)
  down x ~6576 past this blade and continues to the lower set (see 3D).

Record drive node (6432, 1942), the record side of K103 (no further) [rec-out.png]:
- U102 2/2 pin 1 (6140, 1942) -> C126 10/16V "(LR)" -> dot (6219, 1942)
  -> R181 1.5k, with C140 0.0027 in parallel (6219..6340, y 1890)
  -> dot (6340, 1942) = TP1 node (TP1 circle at (6340, ~1858); the x 6340
  vertical runs from TP1 down through dots (6340, 1890) and (6340, 1942))
  -> L105 3mH (variable), with C131 390p in parallel (6340..6432, y 1890)
  -> dot (6432, 1942): R182 220k to the lower common bus (dot (6432, 2098))
  -> K103 upper-set lower fixed contact (6537, 1942).
- The x 6340 vertical also continues DOWN from TP1. It crosses the lower bus
  at (6339, 2098) with no dot [x6340-bus.png] and turns at (6339, 2174) onto
  y ~2173, which goes to the K103 LOWER set (3D).

3B. Sync pickup path, K103 upper fixed contact -> K101 -> TR101 -> U101 1/2
- Line y ~1757 from (6484, 1758) left to corner (5217, 1757). It crosses the
  verticals at x 5782 with no dot [x5782.png] and at x 5345 / 5272 (thick
  risers) with no dots [left-upper.png]. No other component sits on it
  [y1757.png].
- Up x ~5219 from (5217, 1757) to corner (5220, 1146). Crossings with NO dot:
  y 1730, 1676, 1561, 1508 [x5220-run.png], the upper common bus at
  (5219, 1362) [x5220-bus.png], and the K101 lower-fixed-contact line y 1172 at
  (5220, 1172) [x5220-y1172.png].
- Right along y ~1146 to the K101 UPPER fixed contact, circle (5285, 1146),
  hook down at x ~5311 to y ~1153.
- K101 moving contact: pivot circle (5338, 1158). The blade runs up and left
  to about (5303, 1151), touching the upper hook. DRAWN POSITION: K101 rests on
  the UPPER fixed contact, i.e. the sync-pickup line (K103 throw) is connected
  to the preamp. The K101 lower fixed contact (5285, 1172) is J101-4, the
  reproduce head, and is open as drawn [k101-contact.png].
- K101 pole -> right along y 1159 -> dot (5394, 1159):
  - shunt to ground: L101 1.2mH from (5394, 1159) down to dot (5393, 1260);
    from there C101 470p (x 5393) and C136 470p (x ~5350, via (5350, 1260))
    go to the upper bus (dots (5393, 1362), (5350, 1362)). This is a series
    L-C (L101 + C101 parallel C136) from the pole to ground. [u101.png]
  -> TR101 pin 1 (5446, 1159). TR101 primary is pin 1 to pin 2; pin 2
     (5476, 1260) goes to the bus.
  TR101 secondary: pin 4 (5512, 1260) to the bus; pin 3 (5540, 1159)
  -> right to (5575, 1159) -> R101 10 ohm (x 5575, y ~1185-1220)
  -> dot (5575, 1240): R102 220k to the bus (5575, 1362)
  -> right to (5627, 1240), up to (5627, 1135) -> U101 1/2 pin 5 (+), "0V".
- U101 1/2 (JRC-4558D-D per parts table), pin 8 annotated 13.1V, pins 5 / 6 /
  7 annotated "0V". Pin 6 (-) goes left along y ~1088 to x 5652, then down to
  dot (5652, 1197) = node B (the inverting input).
- Node B: C102 100/10V (x 5652, ~1262), then R103 330, to the bus
  (5652, 1362). Node B -> right to dot (5703, 1197), the left end of the EQ
  feedback.
- U101 pin 7 (output) -> dot (5862, 1110).
- Feedback, from output to node B [u101.png]:
  - R104 470k (x 5862, 1110..1197) in parallel with C103 0.012 (x 5840,
    1110..1197). Their lower ends meet at node A = dots (5840, 1197) /
    (5862, 1197), and node A continues to dot (5862, 1240).
  - Node A to node B: C104 270p ((5840, 1197) to (5703, 1197)) in parallel
    with R106 33k ((5862, 1240) to (5703, 1240)).
  - Node A -> R107 1.5k (x 5862, ~1285-1340) -> down x 5862, crossing the
    upper bus with NO dot (5862, 1362) [bus-5703-5865.png], to (5862, 1395),
    right to (5883, 1395), down x 5883 = the right rail of the FET switches
    (dots (5883, 1430), corner (5883, 1572)).
  - Node B side: x 5703 runs from dot (5703, 1197) down, crossing the bus with
    NO dot (5703, 1362), to dot (5703, 1430) and corner (5703, 1572) = the left
    rail of the FET switches.
  - Between the rails, two parallel switched branches [q101-q103.png]:
    - Branch 1: (5703, 1430) -> R108 5k(B) trimmer, wiper tied to its right
      end through the loop (5742, 1410)-(5780, 1388)-(5780, 1430)
      -> dot (5780, 1430) -> Q101 left channel terminal (5823, 1430);
      Q101 right channel terminal (5847, 1430) -> dot (5883, 1430).
    - Branch 2: (5703, 1572) -> R110 5k(B) trimmer, wiper tied to its right
      end the same way -> (5783, 1572) -> Q103 left channel terminal; Q103
      right channel terminal -> (5883, 1572).
  So each FET, when conducting, puts (R107 + its trimmer) in parallel with
  R106 / C104 between node A and node B.
- Output network, U101 pin 7 onward [post-preamp.png]:
  dot (5862, 1110) -> R112 1k -> dot (5943, 1110)
  - shunt: L107 1.2mH (x 5943) to dot (5943, 1265), then C137 470p parallel
    C138 470p to the bus (dots (5943, 1362), (5975, 1362)).
  -> C105 10/50V -> dot (6025, 1110)
  - shunt: Q107 (2SK68AM) upper channel terminal at x 6025; lower channel
    terminal down x 6025 to bus dot (6025, 1362). Q107 gate (6100, 1200)
    -> D119 anode; D119 cathode (6100, ~1318) -> down x 6100, crossing the bus,
    to corner (6100, 1438) on the line annotated "-6.8V" (label at
    ~(6080, 1430)). Not followed further.
  -> dot (6150, 1110): R122 10k(B) top. R122 bottom -> R123 1k -> bus dot
     (6150, 1362).
  -> on along y 1110 to corner (6255, 1110): R120 10k(B) top. R120 bottom
     -> R121 1k -> bus dot (6255, 1362).
- SYNC branch: R122 wiper (arrow at ~(6175, 1157)) -> right to (6202, 1157)
  -> down x 6202 to corner (6202, 1266) -> right along y ~1266. Crossings with
  NO dot: x 6257, 6340, 6412 [r122-feed.png] and x 6470 [q106-feed.png]. Then
  corner (6542, 1267) -> up x 6542 (crossing the y 1240 R120 line with no dot)
  -> Q106 lower channel terminal (6542, ~1200).
- Q106 (SYNC label printed, 2SK68AM): upper channel terminal (6542, ~1165)
  -> up to dot (6542, 1118) = the source-selection node (Q110 upper terminal
  via y 1118 to x 6412; Q105 upper terminal via y 1118 to x 6676; up x 6542 to
  the W109 line y ~1060). STOP.
- REPRO branch, for completeness: R120 wiper -> (6312, 1157) -> down x 6312
  -> y ~1240 right (crossing x 6340, 6412, 6470 and 6542 with no dots) ->
  Q105 lower terminal (6676, ~1240).

3C. Record / bias drive into the head lead (record amplifier not traced)
- Signal record path: the record drive node (6432, 1942) -> K103 upper-set
  lower fixed contact (6537, 1942). In the DRAWN position the K103 blade
  connects it to J106-7.
- Bias path, NOT switched by K103: J106-7 / pivot side -> dot (6620, 1930)
  -> down x 6620 (crosses the lower bus at (6620, 2098) with no dot) -> corner
  (6620, 2265) -> left along y ~2265 -> corner (5807, 2265) -> down x 5806 to
  (5806, 2369) -> C134 100p TRIMMER (variable capacitor symbol, ~5840-5860,
  2369) -> W132 upper pad (5908, 2370) -> U103 pin 4 (5961, 2370). W132 is
  drawn as a solid bar from that pad to the lower pad (5908, 2398), which is
  on the "AC65V" node: U103 pin 5, dot (5805, 2398), the L106 1.3mH left end,
  and L108 to J108-2 [c134-u103.png]. U103 is listed as "BIAS AMPL" in the
  parts table. The x 5806 run ends at the 2369 corner and does not touch the
  AC65V dot (5805, 2398) directly (pass 1, 6x).

3D. K103 lower contact set (erase-head side)   [k103-lower.png, y2173.png]
- Moving contact: pivot circle (5670, 2264), which is J108-1 (also U103 pin 6
  and the L106 right end, via dot (5702, 2424)).
- Lower fixed contact: circle (5617, 2277), hook up at x ~5645 to about
  y 2272. Its wire runs left to (5551, 2277) and down to y 2315, to J108-3
  (erase head lower lead).
- Upper fixed contact: circle (5617, 2249), hook down at x ~5645 to about
  y 2255. Its wire runs left to (5551, 2249), up x 5551 to (5551, 2173), and
  right along y ~2173 with no dots or components (5551..6339) to corner
  (6339, 2174). From there it goes up x 6339 to the TP1 node (6340, 1942)
  (3A). The x 5551 segment for this contact (2173-2249) is separate from the
  J108-3 segment (2277-2315).
- DRAWN POSITION: the blade runs from the pivot (5670, 2264) down and left to
  about (5637, 2273), resting on the LOWER fixed contact (J108-3). So as drawn
  J108-3 is connected to J108-1, and the TP1 throw is open.
- Actuator: the dashed line from the blade (5655, 2268) goes up to y 2200,
  right along y 2200 to x ~6575, and up to the K103 coil. Both sets are K103.

----------------------------------------------------------------------------
4. Control elements
----------------------------------------------------------------------------
4.1 K103 and its driver Q120   [k103-upper.png, q120.png, d117.png]
- Coil: box (6550-6600, 1838-1862).
  - Top lead x 6576 up to y 1811, then right to dot (6654, 1811), which is the
    D114 anode, and on along y ~1811 to (6742, 1811), the Q120 collector.
  - Bottom lead down to y 1888, then right to dot (6654, 1888), which is the
    D114 cathode, and down x 6652 to J107-2 (24V rail, VERIFIED). The "24V"
    label is printed at (6600-6650, ~1880).
  - D114 (1S2473HJ) is drawn triangle-down: anode at the collector side,
    cathode at 24V. It sits across the coil.
- Q120: 2SC1684S per the parts table (group "Q108, Q111, Q118, Q120"). The
  symbol has the emitter arrow pointing OUT of the base, i.e. NPN.
  - Collector (6741, ~1962) goes up x 6741 to the coil / D114 line, annotated
    "0V".
  - Emitter (6741, ~2010) goes down x 6741, crossing the lower bus at
    (6740, 2098) with NO dot, to J107-1 (0V on the motherboard, VERIFIED).
  - Base (6800, 1985), annotated "0.6V". Dot (6808, 1985): R199 22k down to
    bus dot (6806, 2098). R201 1.5k from (6808, 1985) to dot (6858, 1985).
  - C135 33/25V from (6858, 1985) down to the lower bus at (6858, ~2098), where
    the bus ends at a corner. Straight plate on top, curved plate below.
  - From (6858, 1985) right to (6895, 1985), down x 6895, through R200 39k
    (~2130-2150) to the D117 cathode (bar at y ~2217). D117 (1S2473HJ) is
    drawn triangle-up: its anode at (6893, ~2230) runs down to dot
    (6893, 2409) on the line annotated "24V", which is J107-7 (FUNCTION PCB
    P174-1, VERIFIED).
- Traced logic, from device polarity (not from any signal name):
  - J107-7 HIGH, at its annotated 24V: D117 is forward biased, so current flows
    through R200 and R201 into the NPN base, with R199 to 0V. Base current is
    about (24 - 0.6 - 0.6) / (39k + 1.5k), roughly 0.56 mA, minus about 27 uA
    in R199. That saturates Q120: the collector is near 0V, the coil has about
    24 V across it, and K103 is ENERGISED. This matches the printed
    annotations (collector "0V", base "0.6V").
  - J107-7 LOW, near 0V, or open: there is no base drive and R199 holds the
    base at 0V, so Q120 is off and K103 is DE-ENERGISED. D117 blocks reverse
    current from the base network into J107-7 if J107-7 goes below the C135
    voltage.
  - So K103 is energised when J107-7 is driven high (active-high). The
    inference rests on the NPN polarity and the series diode orientation.
- What K103 connects:
  - Drawn position, upper set: head J106-7 to the record drive node (6432, 1942).
  - Drawn position, lower set: J108-1 to J108-3.
  - Other position, upper set: head J106-7 to the sync-pickup line (y 1757,
    to K101).
  - Other position, lower set: J108-1 to the TP1 node.
  - Which position is energised: the drawing does not mark it. See
    Unknowns U1.

4.2 K101 (head selection at the preamp input)   [k101-contact.png]
- Coil: J101-2 (annotated 24V, OUT SELECT P180-2) to coil top and D101 cathode;
  J101-1 (0V) to coil bottom and D101 anode (VERIFIED rows). The card has no
  driver transistor; the coil is switched from P180-2.
- Drawn position: pole on the upper fixed contact, i.e. the sync-pickup line
  from K103. Other position: pole on the lower fixed contact, J101-4
  (reproduce head).
- The annotation "24V" on J101-2, with J101-1 at 0V, shows the coil
  energised in the annotated condition. That does not establish that the
  drawn position is the de-energised one (U1).

4.3 Q101 and Q103: switched EQ branches in U101's feedback   [q101-q103.png]
- Both are 2SK68AM (parts table). In the symbol the gate arrow points INTO the
  channel, so both are N-channel JFETs. Drain and source are not distinguished
  by the symbol and are called "channel terminals" here.
- Q101 gate (5833, ~1480) -> down to (5833, 1508) -> left along y 1508 -> D102
  anode (~5625, 1508). The D102 cathode (~5612) goes to dot (5514, 1508):
  R127 100k to -15V (bottom on the y ~1676 line, annotated -15V), and on left
  to J103-4. Annotated "-15V" at that node.
- Q103 gate (5833, ~1620) -> down to (5833, 1645) -> left to (5652, 1645) ->
  up to (5652, 1562) -> D104 anode (~5625, 1562). The D104 cathode goes to dot
  (5565, 1562): R129 100k to -15V, and on left to J103-2. Annotated "24V" at
  that node.
- Traced logic, from N-JFET and diode polarity:
  - J103-x LOW, i.e. open (R127 / R129 pull it to -15V) or driven to -15V:
    the diode conducts and the gate is pulled to about -14.4 V, so the JFET
    is pinched off and its branch is OUT.
  - J103-x HIGH (24V): the diode is reverse biased. The gate is then
    connected only through the reversed diode and its own gate-channel
    junction, so it settles near the channel potential and the JFET conducts.
    Its branch (R107 + trimmer) is IN.
  - In the annotated condition (J103-4 at -15V, J103-2 at 24V): Q101 is off
    and Q103 is on, so the R110 branch is active.
- Motherboard destinations (VERIFIED rows): J103-2 goes to P181-2; J103-4 goes
  to P181-3, which is also J103-6 / R126. The worksheet names (P181-2 "SYNC",
  P181-3 "REPRO") are not used here as evidence of function.

4.4 Q106 (SYNC selector, the endpoint) and Q107 (output shunt)
- Q106: 2SK68AM, N-channel. Its gate (6470, ~1188) goes left and down x 6470
  to D107, drawn triangle-down with the anode at the gate side, and the D107
  cathode continues down x 6470. It crosses y 1362, 1438 and 1490 with no dots
  [d107-down.png]. Not followed further; that drive belongs to the
  source-selection agent.
- Q107: 2SK68AM, N-channel, a shunt from the post-C105 node (6025, 1110) to
  the bus. Its gate goes through D119 (anode at the gate) to the line
  annotated "-6.8V". In the annotated condition D119 is forward biased and the
  gate is near -6.2 V, so Q107 is presumably off; that depends on the
  2SK68AM pinch-off voltage, which is not on the drawing. The drive for the
  "-6.8V" line is not traced here.

----------------------------------------------------------------------------
5. Operating annotations printed on the drawing
----------------------------------------------------------------------------
- K103 coil lower node / J107-2: "24V" (~6600-6650, 1880).
- Q120 collector: "0V" (~6750, 1955). Q120 base: "0.6V" (~6800-6830, 1975).
- J107-7 line: "24V" (~6830, 2400).
- J101-2 / K101 coil top: "24V" (~5100, 1000) [upper-left.png].
- J103-4 node: "-15V" (5514, 1490). J103-2 node: "24V" (5565, 1545).
- U101 1/2: pin 8 "13.1V"; pins 5, 6 and 7 "0V".
- Q107 gate line: "-6.8V" (~6080, 1430).
- U103: pin 7 "15V", pin 3 "AC10V", pin 5 node "AC65V" (5805, 2398).
- No AC level is printed anywhere on the sync pickup path itself.

----------------------------------------------------------------------------
6. Interpretation (not drawing evidence)
----------------------------------------------------------------------------
- interpretation: the sync head is one head with two jobs. In one K103 state
  the record amplifier drives it, through R181 and the L105 / C131 network,
  and bias reaches it through C134. In the other state it is disconnected
  from the record drive and taken to the K101 relay, so that K101 can feed the
  sync head into the shared reproduce preamp (TR101 / U101 1/2) in place of
  the reproduce head. The pickup path has no dedicated preamp. The SYNC /
  REPRO split happens only at the output, through separate level trimmers
  (R122 for Q106 SYNC, R120 for Q105 REPRO), and in the EQ, through Q101 /
  Q103.
- interpretation: C134 is on the head side of K103, so the bias coupling to
  the head is never switched by K103. In the pickup state the head therefore
  still has 100p (trimmed) to the U103 / AC65V node. Whether that matters
  depends on U103 being quiescent when the head is used for pickup; that is
  not shown in this block.
- interpretation: the K103 lower set's alternate throw ties J108-1 to the TP1
  node. J108-1 is the K103 lower-set common, U103 pin 6 and the L106 end; the
  motherboard puts it on 0V, which is still pending C17. If J108-1 is 0V, then
  in the non-drawn K103 state the record output node TP1 is shorted to
  ground, just after R181, so the record drive is muted. At the same moment
  the erase-head lead J108-3 is disconnected from J108-1, opening the
  erase-head loop. In the drawn state the erase loop is closed and TP1 is
  free. Together with the upper set, the drawn state is a coherent "head
  record-driven, erase loop closed" state, and the other state is a coherent
  "head to pickup, record output grounded, erase open" state.
- interpretation: on the K103 drive, the annotations (Q120 collector 0V,
  J107-7 24V) show K103 energised in the annotated condition. If the contacts
  are drawn de-energised (the usual convention, not marked here), then
  energised = head to sync pickup and J108-1 to TP1, and de-energised (J107-7
  low) = head to record drive and erase loop closed. That is a hypothesis,
  stated as such. C135 33 uF, charged through R200 39k and discharged through
  R201 / R199 into the base, will slow Q120's turn-on and turn-off, roughly
  on the order of the R200 x C135 product of about 1.3 s. This is computed
  from the values, not measured. **Superseded:** the base clamp stops C135
  charging toward 24V, so the real figures are about 40-70 ms pull-in and
  0.1-0.2 s release - see `pass6-amp-osc-notes-timing.md`. Bench continuity
  (2026-10-13) also confirms the drawn-energised reading of K101 and K103's
  upper set (`../circuit-analysis.md`, Relay drawn state).
- interpretation: the series L-C shunts L101 (1.2 mH) with C101 parallel C136
  (940 pF) at the preamp input, and L107 (1.2 mH) with C137 parallel C138
  (940 pF) at the preamp output, both resonate near
  1 / (2 pi sqrt(1.2 mH x 940 pF)), about 150 kHz. The parallel L105 (3 mH)
  with C131 (390 pF) in the record output resonates near 147 kHz. Notches /
  traps all near 150 kHz are consistent with rejecting one high-frequency
  signal, plausibly the U103 output. This is not proven from the drawing.
- interpretation: the U101 EQ, computed from the values, ignoring the FET
  on-resistance:
  - Shunt leg R103 330 + C102 100 uF has its corner near 4.8 Hz.
  - Below the C103 / R104 corner of about 28 Hz (tau = 470k x 0.012 uF, about
    5.6 ms), the feedback is about R104 + R106, roughly 503k, for a gain of
    about 1500.
  - Above it, C103 shorts R104 and the lower element sets the gain and the
    second time constant:
    - both FETs off: R106 33k, giving tau = 0.012 uF x 33k, about 396 us, and
      a gain of about 100.
    - one FET on: 33k in parallel with (1.5k + trimmer, 0-5k), i.e. about
      1.43k to 5.4k, giving tau of about 17-65 us and a gain of about 5-17.
  - So each FET selects a separately trimmed high-frequency turnover (R108
    for Q101, R110 for Q103). C104 270p across R106 adds a roll-off near
    18 kHz when both are off.
  - Which branch corresponds to sync pickup and which to reproduce depends on
    how P181-2 / P181-3 are driven, which is outside this card.

----------------------------------------------------------------------------
7. Unknowns and open questions
----------------------------------------------------------------------------
U1. Which K103 / K101 state is drawn. Both relays' contacts at
    (6591, 1929) / (5670, 2264) / (5338, 1158) are drawn without any "energised"
    or "de-energised" marking. The printed DC annotations (Q120 collector "0V";
    J101-2 "24V") describe both coils as energised in the annotated condition.
    Taken literally with "drawn = annotated", K103 would be energised with the
    head on record drive and K101 would be on the sync line. Taken with the
    convention "drawn = de-energised", the annotated condition puts the head
    on the sync line while K101 selects the reproduce head, which leaves the
    sync pickup line unterminated. Neither reading is self-evidently
    consistent, because the annotations may describe a single
    mode-independent snapshot. Evidence that would resolve it: the service
    manual's relay-state note or mode table; a bench check of K103 contact
    continuity (J106-7 to TP1 side versus J106-7 to K101) with J107-7 at 0V
    and at 24V; or the FUNCTION PCB / OUT SELECT logic showing which modes
    raise J107-7 and P180-2.
U2. Whether the J108-1 alternate throw grounds TP1 depends on C17 (J108-1 to
    P171-7 continuity on the motherboard; crossings at (4141, 3730) and
    (4242, 3730)). Resolve with a continuity check from P108-1 to P171-7.
U3. The Q106 gate drive below D107 (x 6470, below y 1510) and the Q107 gate's
    "-6.8V" line (6100, 1438 rightward) are not followed. They belong to
    source-selection / mute analysis.
U4. The 2SK68AM pinch-off voltage is not on the drawing, so "-6.2 V gate =
    off" for Q107 and "-14.4 V gate = off" for Q101 / Q103 rest on typical
    small-signal JFET behaviour. A datasheet would confirm them.
U5. A vertical light streak around x ~6476-6490 breaks several horizontals by
    3-5 px: y 1240 at (6486, 1240), y 1438, and y 1490. It reads as a scan or
    paper artefact, because it occurs identically on unrelated lines, but on
    y 1240 (the R120 -> Q105 REPRO feed) it is a visible gap [q106-feed.png].
    The SYNC feed y 1266 is continuous there. A second scan of the sheet
    would confirm it.
U6. W132 is drawn as a solid bar joining U103 pin 4 and pin 5 at
    (5908, 2370-2398). It is a jumper. Whether it is fitted on a given unit
    (and so whether C134 couples to pin 4 alone or to the AC65V node) is a
    build-option question, not answerable from the drawing.
U7. JFET drain / source orientation for Q101, Q103, Q106 and Q107 cannot be
    read from the symbol. This only matters for modelling asymmetry.
