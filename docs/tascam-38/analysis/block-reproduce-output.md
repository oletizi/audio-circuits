Block: REPRODUCE AND OUTPUT PATH (channel-1 REC/PLAY AMPL card)

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/pass3/crops-reproduce/ (named per section
below). "Bus" means the card's thick upper common bus at y ~1362 unless stated.

Part numbers read from the parts table (crop parts-table.png, sheet ~1950-2950,
1100-1700), "REC/PLAY AMPL PCB" column:
- U101 JRC-4558D-D; U102 RC-4558T1; U103 BIAS AMPL
- Q101, Q103, Q105~Q107, Q110: 2SK68AM (so Q105, Q106, Q107 included)
- Q108, Q111, Q118, Q120: 2SC1684S
- Q109, Q112: 2SA733P
- Q119: 2SC1318S
- D101, D102, D104, D106~D109, D112, D114~D120: 1S2473HJ; D110, D111: 1N60

---------------------------------------------------------------------------
1. Inputs
---------------------------------------------------------------------------
- J101-4 (reproduce-head lead, VERIFIED in interface matrix): reaches the
  card only at K101's LOWER fixed contact (5285, 1171), via the line along
  y ~1172 from x ~4940. The crossing with the x ~5219 vertical at
  (5219, 1172) has no dot. [k101-contact.png]
- J101-3 (other head lead): on the upper common bus; TR101 pins 2 and 4 return
  to that bus at (5476, 1362) and (5513, 1362). [k101-tr101.png]
- K101 UPPER fixed contact (5285, 1146): a second source that the K101 pole can
  select. Traced: from (5285, 1146) left to (5219, 1146), down x ~5219
  (it crosses the bus at (5219, 1362) with no dot), to (5217, 1757), east along
  y ~1757 (it crosses x 5270, 5347 and 5782 with no dots) to (6486, 1757), down
  x ~6486 to (6486, 1915), and right to K103's upper-contact-set UPPER fixed
  contact (6536, 1915) / hook (6563, 1920). K103's moving contact in that set
  is J106-7 (sync-head lead) at (6591, 1929).
  [k101-upper-lead-column.png, y1757-west.png, y1757-east.png, k103-upper.png]
- INPUT source arriving at Q110 (stop point; another agent covers it): the line
  from Q110's lower channel terminal runs down x ~6412 (it crosses the bus at
  (6411, 1362) with no dot) to (6412, 1412), west along y ~1412 to (6150, 1412),
  down x ~6150 to (6150, 1702), west along y ~1702 to (5782, 1702), down x ~5782
  (crossing y ~1730, 1757, 1785, 1813 and 1941 with no dots) to the WIPER of
  R156 20k(B) at (5753, 2017). R156 sits in the divider
  C120 node (5733, 1941) - R202 5.6k - R156 20k(B) - R157 2.2k - lower bus
  (5733, 2095); C120 2.2/50V is fed from U102 1/2 pin 7 (annotated 0V).
  [q101-and-input-line.png, input-source.png, bus-crossings.png]
- SYNC source arriving at Q106: this is NOT a separate input path on the card.
  Q106's lower channel terminal goes to the wiper of R122 10k(B), which is
  fed from the U101 1/2 output (see section 3). The sync HEAD itself reaches
  this block only through K103 and K101 (above).

---------------------------------------------------------------------------
2. Outputs
---------------------------------------------------------------------------
- J102-2 and J102-5: both on the node with a dot at (7336, 1112); J102-2 drops
  down x ~7336, and the line continues right to (7418, 1112) and drops down
  x ~7418 to J102-5. The verticals at x ~7364 and ~7392 (K102 coil lines)
  cross y 1112 without dots. [j102-node.png]
- J105-1 branch (the matrix records that it receives J102-5 through a
  motherboard U-link): J105-1 line up x ~7552 to (7552, 1193), right to the top
  of R119 56k (7575, 1193); R119 to the top of R141 50k(B) (7575, ~1290); R141
  bottom to the bus (7575, 1367); the R141 wiper (7600, 1308) goes right through
  jumper W112 (pads 7632 and 7682, y 1308) to C109 0.1 (7682, ~1262), then R142 1k
  up to (7682, 1155). From there it enters the meter amplifier (Q111 / Q112,
  R144 100k etc., driving J105-7). Stop at R142: the meter amplifier is another
  block. [j105-branch.png]

---------------------------------------------------------------------------
3. Component path, in signal order
---------------------------------------------------------------------------
3a. Head input and transformer  [k101-tr101.png, k101-contact.png]
1. K101 contact. The pole (moving contact) is at (5338, 1159). The arm is drawn
   from the pole up-left to (5303, 1152), RESTING ON THE UPPER fixed contact
   (hook at (5311, 1150), lead at (5285, 1146)). The lower fixed contact
   (hook at (5311, 1167), lead at (5285, 1171), = J101-4) is drawn OPEN. A
   dashed actuator line runs from the K101 coil (5329, 1093) down to the arm at
   (5327, 1153).
2. The pole goes right along y ~1159 to a dot at (5395, 1159), then to TR101
   pin 1 (5447, 1159).
3. L101 1.2mH runs from (5395, 1159) down to a dot at (5395, 1260). That node
   goes left to (5350, 1260); C136 470p runs from (5350, 1260) to the bus
   (5350, 1362), and C101 470p from (5395, 1260) to the bus (5395, 1362). So L101
   goes in series with C101 || C136 from the TR101 pin-1 node to the bus.
4. TR101: the transformer is drawn inside a dashed box (5447-5540,
   1135-1260). Primary pins 1 (5447, 1159) and 2 (5476, 1262); pin 2 goes to the
   bus (5476, 1362). Secondary pins 3 (5540, 1159) and 4 (5513, 1262); pin 4
   goes to the bus (5513, 1362).
5. From TR101 pin 3 (5540, 1159) right to R101 10 (5573, 1180-1220), then to a dot
   at (5573, 1240). R102 220k runs from (5573, 1240) to the bus (5573, 1362). The
   node goes right to (5627, 1240), up x ~5627 to (5627, 1135), and on to U101
   1/2 pin 5. [u101a.png]

3b. U101 1/2 and its equalisation network  [u101a.png, q101-and-input-line.png]
6. U101 1/2 (JRC-4558D-D): pin 5 is the lower input at (5707, 1135) (from R101)
   and pin 6 the upper input at (5707, 1083). Pin 8 at (5743, 1080) runs up to the
   line annotated 13.1V (y ~905). Pin 7, the output, is at (5783, 1110),
   annotated 0V. Pin 4 is drawn on U101 2/2 (below). The drawing marks no +/-
   on the inputs (see the unknowns).
7. Pin 6 node: from pin 6 left to (5652, 1083), down to a dot at (5652, 1197).
   - Shunt leg: C102 100/10V (5652, ~1290) in series with R103 330
     (5652, ~1335), down to the bus (5652, 1362).
   - From (5652, 1197) right to a dot at (5703, 1197).
8. Between node A (x 5703) and node X (x ~5838-5863, y 1197-1238):
   - C104 270p from (5703, 1197) to a dot at (5838, 1197).
   - R106 33k from a dot at (5703, 1238) to a dot at (5863, 1238).
   - Switched branch: node X runs down R107 1.5k (5863, ~1335), crossing the
     bus with no dot visible, to (5863, 1396), right to (5883, 1396), and down to
     a dot at (5883, 1430). From (5883, 1430) there are two parallel paths back
     to node A, which itself runs down x ~5703 (crossing the bus) to
     dots at (5703, 1430) and (5703, 1573):
       * Q101 (2SK68AM, N-JFET; the gate arrow points into the channel from
         below) has its channel between (5850, 1430) and (5807, 1430), then R108
         5k(B) trimmer between (5780, 1430) and (5703, 1430), with the R108 wiper
         tied to its right end through (5740, 1388)-(5780, 1388).
       * Q103 (2SK68AM, N-JFET) between (5883, 1573) and (5807, 1573), then R110
         5k(B) trimmer (wiper tied to one end in the same way) to (5703, 1573).
9. Node X to the output: C103 0.012 runs from (5838, 1197) up to the output
   node (5838, 1110), and R104 470k from (5863, 1197) up to the output node
   (5863, 1110).
   So the feedback, from the output to pin 6, is:
   (R104 470k || C103 0.012) in series with
   (R106 33k || C104 270p || [R107 1.5k + (R108 + Q101) || (R110 + Q103)]).
   The leg from pin 6 to the bus is R103 330 + C102 100uF.
10. The output node (5863, 1110) goes through R112 1k to a dot at (5945, 1110).
    - Trap: L107 1.2mH from (5945, 1110) down to a dot at (5945, 1265); C137 470p
      from there to the bus (5945, 1362), and C138 470p from (5972, 1265) to the
      bus (5972, 1362).
11. C105 10/50V from (5945, 1110) to a dot at (6028, 1110).
12. Q107 (2SK68AM, N-JFET) acts as a shunt: one channel terminal at (6028, 1180)
    goes up to the (6028, 1110) node, and the other at (6028, 1215) goes down to
    the bus at (6028, 1362). Its gate (6075, 1201) runs right to (6098, 1201) and
    down to the D119 anode (6098, ~1305). D119's cathode (6098, ~1318) continues
    down to the line annotated -6.8V (J104-1, PLAY MUTE). [q107.png]
13. The signal node continues right along y ~1110 to a dot at (6153, 1110), the
    top of R122 10k(B). R122's bottom goes through R123 1k (6153, ~1265) to the
    bus (6153, 1362). The node continues to (6258, 1110), the top of R120 10k(B),
    and R120's bottom goes through R121 1k (6258, ~1230) to the bus (6255, 1362).
14. The R122 wiper (6175, 1157) runs right to (6200, 1157), down to (6200, 1265),
    and right along y ~1265 to (6543, 1265), then up to Q106's lower channel
    terminal (6543, 1200).
    The R120 wiper (6285, 1157) runs right to (6312, 1157), down to (6312, 1240),
    and right along y ~1240 to (6677, 1240), then up to Q105's lower channel
    terminal (6677, 1200). The y ~1240 line crosses x 6470, 6542 and 6600 with
    no dots. [select-fets.png, fet-source-crossings.png]

3c. Source selection  [select-fets.png]
15. Three N-JFETs (2SK68AM; each gate enters from the left with its arrow
    pointing into the channel). Their upper channel terminals all join the line
    along y ~1109:
    - Q110 "INPUT": upper (6412, 1175) to (6412, 1109); lower (6412, 1200) is
      fed by the INPUT line from the R156 wiper (section 1).
    - Q106 "SYNC": upper (6543, 1175) to the dot at (6543, 1109); lower from the
      R122 wiper.
    - Q105 "REPRO": upper (6677, 1175) to (6677, 1109); lower from the R120 wiper.
    The common node has a dot at (6543, 1109). Each gate goes to a series diode
    whose anode is at the gate and whose cathode is away from it: D112 at
    (6338, ~1310), D107 at (6470, ~1310) and D106 at (6600, ~1310). Section 4
    covers what drives them.
16. From the common node (6543, 1109) up to (6543, 1058), right through jumper
    W109 (pads 6596 / 6650, y 1058) and jumper W110 (pads 6705 / 6757), to
    (6787, 1058), then down through R113 1k to a dot at (6788, 1136). R114 10k
    runs from (6788, 1136) to the bus (6788, 1362).

3d. U101 2/2 and the output  [u101b-k102.png, u101-pin4.png]
17. U101 2/2: pin 3 is the lower input at (6893, 1136), fed along y ~1136 from
    the R113/R114 node. Pin 2 is the upper input at (6893, 1084), on a dot at
    (6839, 1084). R115 2.2k runs from (6839, 1084) to the bus (6839, 1362). R116
    22k runs from (6839, 1021) to (7022, 1021), and C107 100p from (6839, 997) to
    (7022, 997); both go down to the output node (7020, 1112). Pin 1, the output,
    is at (6968, 1112), annotated 0V. Pin 4 (6925, 1132) runs down to
    (6925, 1467) and joins the line annotated -13.5V (y ~1467), which runs east.
18. From the output node (7020, 1112): R117 1k, then C106 2.2/50V, to a dot at
    (7124, 1112).
    - R118 100k from (7124, 1112) to the bus (7124, 1362).
    - Trap: from a dot at (7124, 1167), L102 1.2mH runs to (7071, 1261); C108 470p
      goes from there to the bus (7071, 1362), and C139 470p from (7022, 1261) to
      the bus (7022, 1362).
19. K102 contact, drawn inside an oval envelope (7153-7228, 1088-1138). The
    moving contact enters on the left at (7155, 1113) and its arm runs from
    (7170, 1113) up to a free tip at (7210, 1097). The fixed contact stub enters
    from the right at (7212-7240, 1113). The arm is DRAWN OPEN, not touching the
    fixed contact. A dashed actuator line runs from the K102 coil (7192, 1037)
    down to the envelope top (7192, 1088). [k102-contact.png]
20. From the fixed-contact side (7240, 1113) to a dot at (7257, 1112); R164 100k
    runs from there to the bus (7257, 1362). Then on to the dot at (7336, 1112),
    which feeds J102-2 and J102-5 (section 2), and through the motherboard
    U-link to J105-1, R119, R141 and the meter amplifier.

---------------------------------------------------------------------------
4. Control elements
---------------------------------------------------------------------------
K101 (relay; contact in 3a):
- Coil: the top terminal (5329, 1018) is on the line along y ~1018 to J101-2
  (annotated 24V; P180-2 OUT SELECT). The bottom terminal (5329, 1093) is on
  the line along y ~1093 to J101-1 (0V on the motherboard). D101 sits across
  the coil, with its cathode at the top.
- Drawn position: the pole (to TR101 pin 1) rests on the UPPER fixed contact,
  which is the line to K103's upper fixed contact. J101-4, the reproduce head,
  is open.
- Other position: the pole moves to J101-4, connecting the reproduce head to
  TR101 pin 1.

K103 (outside this block; recorded only because it is in series with K101's
upper contact): in the upper contact set the moving contact is J106-7
(6591, 1929). Its arm is drawn resting on the LOWER fixed contact
(6536, 1942), which runs left to the dot at (6432, 1942) on the C131 / L105
record-drive node. The UPPER fixed contact (6536, 1915), on the line from K101,
is drawn open. [k103-upper.png]

K102 (relay; contact in 3d):
- Coil: the top terminal (7192, 960) goes to J102-4 (annotated 24V; P180-3 OUT
  SELECT). The bottom terminal (7192, 1037) runs right along y ~1037 to x
  ~7364 and down to J102-3 (P171-3 POWER MUTE). D120 sits across the coil.
- Drawn position: open, so the U101 2/2 output is disconnected from J102-2 /
  J102-5, and R164 100k holds the output side to the bus.

Q101 / Q103 (EQ switches inside the U101 1/2 feedback; section 3b item 8):
- Q101's gate (5833, 1460) runs down to (5833, 1508) and left to the D102 anode.
  The D102 cathode (5607, 1508) is on the J103-4 line (P181-3, REPRO), annotated
  -15V. R127 100k runs from that line to -15V (J103-5).
- Q103's gate (5833, 1600) runs down to (5833, 1648), left to (5653, 1648), and up
  to the D104 anode at (5653, 1563). The D104 cathode (5607, 1563) is on the
  J103-2 line (P181-2, SYNC), annotated 24V. R129 100k runs from that line to
  -15V.
- When the J103 line is low enough, its diode conducts and the gate is pulled
  negative, which pinches the FET off and removes that branch. When the J103
  line is high, the diode is reverse biased and the gate is left with no DC
  pull of its own, so the FET conducts. (Standard JFET-switch reasoning applied
  to the traced topology.)

Q107 (output mute shunt after C105): see 3b item 12. The gate drive is J104-1
(P171-6 PLAY MUTE) through D119. With J104-1 low the gate is pulled negative
and Q107 is off; with J104-1 high, D119 is reverse biased and Q107 conducts,
shunting the signal node at (6028, 1110) to the bus. Same reasoning as above.

Gate drive of Q110 / Q106 / Q105  [gate-lines.png, q109-q108.png,
q109-zoom.png, q108-zoom.png]
- Q105 REPRO: the D106 cathode line runs down x ~6600 (crossing the bus with no
  dot) to a dot at (6598, 1490), annotated -15V. From that node:
  - R125 100k down to the -15V line along y ~1678;
  - C143 0.47/50V from (6650, 1490) to the -15V line;
  - R126 82k west along y ~1490 to (6205, 1490) and down. The interface matrix
    records this as J103-6 (P181-3, REPRO; joined to J103-4 on the motherboard).
  So the source is J103-6, the same OUT SELECT line that drives Q101 through
  J103-4.
- Q106 SYNC: the D107 cathode line runs down x ~6470 to a dot at (6468, 1595),
  annotated -5.8V. From that node:
  - R131 100k and C142 0.47/50V to the -15V line (y ~1678);
  - R132 68k east along y ~1597 to the node annotated 0.6V, which runs right to
    (6795, 1597) and down x ~6795 to a dot at (6795, 1748).
  At (6795, 1748):
  - R135 18k runs down to the line annotated 24V along y ~1928, which goes to
    J104-5 (P181-2, SYNC);
  - D108 runs right, anode at (6795, 1748) and cathode at (6870, 1748), to the
    Q108 collector node (6872, 1748), annotated 0V.
  Q108 is a 2SC1684S NPN: the emitter is the lower lead, with the arrow
  pointing out, at (6870, 1822), and it goes to the dot at (6959, 1904) and
  J104-6 (0V). The base (6900, 1800) is annotated 0.6V. R137 47k runs from the
  base to the emitter node. R138 68k runs from the base to (7039, 1800), where
  C119 2.2/50V goes to the emitter node. That node then runs through R139 68
  and D109 (anode toward the connector) to J104-3 (P174-1, FUNCTION).
  So Q106's gate network is pulled up by J104-5 through R135 and pulled down
  through D108 whenever Q108 conducts, and Q108 is driven from J104-3.
- Q110 INPUT: the D112 cathode line runs down x ~6338 (crossing the bus with
  no dot) to a dot at (6338, 1543), annotated 20.6V. From that node:
  - R158 100k and C141 0.47/50V to the -15V line;
  - R159 10k east along y ~1543 to a dot at (6702, 1545).
  At (6702, 1545):
  - R204 68k and D118 (D118 cathode toward R204) go to J104-4 (P181-1, INPUT);
  - the line continues right along y ~1545 to the Q109 collector.
  Q109 is a 2SA733P PNP. It is drawn with the base bar at the bottom; the
  emitter is the upper-right lead with its arrow pointing in.
  - Collector: the upper-left lead (6853, 1546), annotated 24V.
  - Emitter: the upper-right lead (6890, 1547), which runs to (6953, 1547),
    down to a dot at (6953, 1618), and then to J104-2 (P180-4, OUT SELECT),
    annotated 24V.
  - Base: (6873, 1585), annotated 23.4V, to a dot at (6873, 1618). R133 100k
    runs from the base to the emitter node (6953, 1618), and R136 27k runs down
    to the Q108 collector (6872, 1748).
  So Q110's gate network is pulled up by J104-4 (through D118, R204 and R159)
  or by Q109 (through R159), and pulled down to -15V by R158. Q109 conducts
  when Q108 pulls its base down through R136, and it is supplied from J104-2.
- In summary, no card contact reaches the three gates directly. The gate drive
  for each runs:
  - Q105 (REPRO): J103-6 through R126 82k.
  - Q106 (SYNC): J104-5 through R135 18k and R132 68k, overridden by the
    Q108 / D108 pull-down. Q108 is driven from J104-3 (FUNCTION).
  - Q110 (INPUT): J104-4 through D118, R204 68k and R159 10k, and also from
    J104-2 through Q109 and R159. Q109 is itself switched by Q108.

---------------------------------------------------------------------------
5. Operating annotations printed on the drawing
---------------------------------------------------------------------------
- 24V at the K101 coil top (J101-2 line, ~5150, 1000) and at the K102 coil top
  (J102-4 line).
- 13.1V on the U101 pin 8 supply line (~5770, 890).
- -13.5V on the U101 pin 4 line (~7000, 1458).
- 0V at U101 1/2 pins 5 and 6 (~5680, 1100 and 1125), at pin 7 (~5810, 1100), at
  U101 2/2 pins 2 and 3 (~6870, 1100 and 1125), and at pin 1 (~6990, 1100).
- -6.8V on the J104-1 / D119 cathode line (~6050, 1405).
- -15V on the J103-4 line (D102 cathode), 24V on the J103-2 line (D104 cathode).
- Gate-network nodes: 20.6V (Q110 / D112, at 6338, 1543), -5.8V (Q106 / D107, at
  6468, 1595), -15V (Q105 / D106, at 6598, 1490).
- Q109: collector 24V, emitter 24V, base 23.4V. Q108: collector 0V, base 0.6V.
  The D108 anode / R132 node is 0.6V. The J104-5 / R135 line is 24V.
- No AC level is printed anywhere along this path, from J101-4 to J102 (none
  seen; the AC65V and AC10V annotations belong to the bias / erase block).
- Interpretation: the annotations describe one consistent DC condition. R159
  10k and R158 100k between 24V and -15V give 24 - 39*10/110 = 20.45V, close to
  the printed 20.6V. R132 68k and R131 100k between 0.6V and -15V give
  0.6 - 15.6*68/168 = -5.7V, close to the printed -5.8V. In that condition:
  - D112 is reverse biased, so Q110 (INPUT) is on;
  - D107 and D106 conduct, so the Q106 (SYNC) gate sits near -5.2V and the
    Q105 (REPRO) gate near -14.4V;
  - Q101's gate is pulled toward -15V (off), and Q103's diode is reverse biased
    (on).
  Whether -5.2V fully pinches off a 2SK68AM is not settled by the drawing (see
  the unknowns).

---------------------------------------------------------------------------
6. Interpretation (not drawing fact)
---------------------------------------------------------------------------
- Head selection is done by two relays in series. The TR101 input is the
  reproduce head (J101-4) only when K101 is moved from its drawn position. In
  K101's drawn position the TR101 input goes to K103's upper fixed contact,
  which is connected to the sync head (J106-7) only when K103 is moved from
  its own drawn position. With both relays in their drawn positions the TR101
  input is open apart from L101 / C101 / C136. Which relay state goes with
  which transport mode is not shown on this card.
- U101 1/2 is a non-inverting head preamplifier, with feedback to pin 6 and
  TR101 feeding pin 5. Its DC gain is 1 (C102 blocks the shunt leg). The traced
  network is an equaliser:
  - At LF, R104 470k against R103 330 gives a gain of about 1400 (63 dB), with
    a pole at R104*C103 = 5.6 ms (~28 Hz).
  - C103 then shunts R104, and the response levels out where C103 meets the
    lower branch. That branch is R106 33k alone (about 400 us) when Q101 and
    Q103 are off. It is R106 || (R107 + R108 or R110), about 1.4-5.4k, when one
    of the FETs is on, giving about 17-65 us.
  - R108 and R110 are separate trimmers for the two FET-selected time
    constants.
  - C102 100uF with R103 sets an LF corner near 5 Hz.
  This is standard op-amp reasoning applied to the traced parts. The trimmer
  settings and JFET on-resistance are unknown, so the numbers are indicative.
- L101 + C101 || C136 at the head, L107 + C137 || C138 after U101 1/2, and
  L102 + C108 || C139 after U101 2/2 are series LC branches to the bus, each
  1.2mH with 940p, resonating near 150 kHz. The interpretation is notch traps,
  presumably for bias leakage; the bias frequency is not read here.
- Q107 is a shunt mute on the U101 1/2 output, controlled from PLAY MUTE
  (J104-1).
- R120 10k(B) and R122 10k(B) are two independently set level trims taken
  from the same U101 1/2 output: R120 feeds the REPRO FET and R122 the SYNC FET.
  So the one head preamplifier serves both reproduce and sync playback, with
  separate output levels. The INPUT FET takes the line-input stage (U102 1/2,
  via the R156 trim) instead.
- U101 2/2 is a non-inverting buffer / amplifier with a gain of
  1 + 22k/2.2k = 11 (~21 dB). C107 100p rolls it off near 72 kHz. R113 1k /
  R114 10k load the selection node at the input.
- K102 connects the line output. In the drawn position the output is
  disconnected. Its coil current needs both J102-4 (OUT SELECT) and J102-3
  (POWER MUTE) to be in the right states.
- Gate-drive polarity, from the traced circuit:
  - Q105 (REPRO) conducts when J103-6 is high enough to reverse-bias D106
    (active-high on J103-6).
  - Q110 (INPUT) conducts when J104-4 is high (through D118) or when Q109 is
    on.
  - Q106 (SYNC) conducts only when J104-5 is high AND Q108 is off.
  - Q108 is on when J104-3 is high (through D109). Q108 on forces SYNC off,
    and also turns Q109 on (provided J104-2 is high), which forces INPUT on.
  On this card, then, FUNCTION (J104-3) overrides the OUT SELECT choice between
  SYNC and INPUT. This rests on the traced device polarities (D109 / D108 /
  D118 / D112 orientation, NPN Q108, PNP Q109) and not on any signal name.

---------------------------------------------------------------------------
7. Unknowns and open questions
---------------------------------------------------------------------------
U1. U101 input polarity. No +/- marks are drawn on U101 1/2 (5707, 1083 /
    1135) or U101 2/2 (6893, 1084 / 1136). The topology implies pin 6 and pin 2
    are inverting, and that matches the usual 4558 pinout, but the drawing does
    not show it. Resolve with the JRC-4558D datasheet pinout.
U2. Relay states in each mode. The drawn positions are recorded above, but the
    drawing gives no "de-energised" note. Resolve with the OUT SELECT and
    FUNCTION board schematics (which drive J101-2, J102-4, J102-3 and J107-7 /
    K103), or by measuring the coils.
U3. JFET pinch-off. Whether the -5.8V node (gate about -5.2V) fully turns off
    Q106 depends on the 2SK68AM Vp/IDSS grade "M". The same question applies to
    Q107 at -6.8V on J104-1. Resolve with the 2SK68A datasheet for that grade.
U4. (Resolved in this pass.) The R107 1.5k line crossing the bus at
    (5863, 1362) and the node-A (x 5703) line crossing at (5703, 1362) are
    plain crossings with no dot or fillet at 8x
    [crops-reproduce/eq-bus-crossings.png].
U5. The drawing does not show which J103 / J104 line levels the OUT SELECT
    board produces in each OUT SELECT position. So "REPRO selected" and similar
    mappings are not established here; only the card-side polarity is.
U6. Jumpers W109, W110 and W112 are drawn as pad pairs with a line between
    them. Whether they are fitted on a given card cannot be read from the
    schematic. Check the physical board.
U7. The line from the R126 82k left end, down x ~6205 from (6205, 1490), was not
    re-traced to J103-6 in this pass; this rests on the VERIFIED matrix row
    J103-6. The same applies to the J104-x end points of the R135, D118, D109
    and Q109-emitter lines, which rely on the matrix rows J104-2/3/4/5/6.
