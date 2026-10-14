Block: LINE INPUT, RECORD AMPLIFIER, BIAS AND ERASE (plus METER DRIVE)
Channel-1 REC/PLAY AMPL PCB, Tascam 38 AMPLIFIER SCHEMATIC DIAGRAM

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/pass3/crops-record/:
  overview.png (4700 850 8450 2700), rec-u102a.png (5250 1750 6000 2150),
  rec-u102b.png (5950 1750 6700 2150), k103-links.png (5450 1850 6750 2330),
  bias-u103.png (5550 2150 6250 2680), w132-zoom.png (5690 2350 5990 2450),
  l108-zoom.png (5600 2480 5800 2620), bias-switch.png (6150 2250 6900 2680),
  d115-d116.png (6480 2380 6720 2430), q118-q119.png (6200 2420 6450 2560),
  q120-k103.png (6480 1820 6950 2300), mid-band.png (5600 1250 6600 1800),
  r156-wiper-up.png (5740 1680 5830 1830), q110-input.png (6150 1050 6700 1450),
  q110-buscross.png (6310 1340 6440 1385), tp1-buscross.png (6300 2070 6460 2190),
  w119-w123.png (6180 1985 6330 2100), meter-q112.png (7500 980 8420 1520),
  parts-table.png (1950 1100 2950 1700), sheet.png (whole sheet).

"Common bus" below means the card's thick bus at y ~2097 (lower) or y ~1362
(upper), which the interface matrix ties to J106-2/5/6/8 and, through J106-5/6,
to motherboard 0V.

Parts table (parts-table.png, REC/PLAY AMPL PCB column, read directly):
  U102 RC-4558T1; U103 "BIAS AMPL" (no part number printed);
  Q118, Q120 2SC1684S (with Q108, Q111); Q119 2SC1318S; Q112 2SA733P (with
  Q109); Q110 2SK68AM (with Q101, Q103, Q105-Q107); D115-D117 1S2473HJ
  (D114~D120 group); D110, D111 1N60. MASTER OSC PCB: U301 "OSC UNIT".
  The sheet contains no internal drawing of U103 (checked sheet.png).


1. INPUTS

  I1  J106-1 (VERIFIED: P141-1, ch1 line INPUT). Card side: R160 27k, whose
      lower lead runs down x ~5448 to J106-1, crossing the lower bus with no
      dot (rec-u102a.png).
  I2  J106-2/5/6 low side of the line input = card common bus (matrix).
  I3  J108-4 (VERIFIED: P182-8, MASTER OSC). Route up x ~5775 to (5775, 2517),
      right along y ~2517 to (6124, 2518), up to U103 pin 3, annotated
      "AC10V" (bias-u103.png; label at ~(6080, 2365)).
  I4  J107-7 (VERIFIED: P174-1, FUNCTION PCB), the line annotated "24V" at
      ~(6860, 2400). Drives the bias-enable chain (D115, section 4) and the
      K103 driver Q120 (D117 / R200, another agent's block).
  I5  Supplies: J106-4 +B via R175 470 (U102 pin 8, "13.7V");
      J106-3 -B via R174 470 (U102 pin 4, "-14.2V");
      J107-3 +B on the line annotated "15V" (U103 pin 7, R195, C133 +);
      J107-4 -B on the line annotated "-15V" at y ~2600 (U103 pin 1, Q119
      emitter, R192/R194/R197, C132, C133 -).
  I6  Meter amplifier input: J105-1 (VERIFIED: motherboard U-link from J102-5,
      i.e. the K102-switched line output node J102-2). Card side R119 56k top
      via the riser at x ~7551.
  I7  Meter amplifier supplies: "13.8V" line at y ~998 (R154 470 from
      J105-5 +B per matrix); "-14.2V" node at ~(7855, 1440) (R155 470 from
      -B per matrix).


2. OUTPUTS

  O1  Record drive node N_REC at (6433, 1942): junction of L105 / C131 right
      end, R182 220k top, and the wire right to the K103 UPPER contact set's
      lower fixed contact at ~(6536, 1942). This node feeds K103 (stop here;
      K103 switching belongs to another agent).
  O2  Record bias injection: from the AC65V node through C134 100p (trimmer)
      to the y ~2265 wire, which goes right to (6620, 2265), up x ~6620 to the
      filled dot (6620, 1930) on the K103 upper moving contact / J106-7 (head
      lead) wire. Bias therefore joins the head lead on the HEAD side of K103,
      not through it.
  O3  Erase drive: J108-2 (VERIFIED: P161 upper contact, ERASE HEAD) via L108
      from the AC65V node.
  O4  Erase return: J108-3 (VERIFIED: P161 lower contact) -> K103 lower set,
      lower fixed contact (5617, 2277) -> moving contact (5670, 2265) ->
      J108-1 / U103 pin 6.
  O5  INPUT source branch toward the source-selection point: the R156 wiper
      wire, ending on a channel terminal of the INPUT JFET Q110 at
      ~(6413, 1200). Q110's other channel terminal goes to the common
      selection node, filled dot (6543, 1110), shared with SYNC Q106 and
      REPRO Q105 (q110-input.png). Stop.
  O6  Rectified meter level on J105-7 (VERIFIED: P176-1, ch1 VU meter):
      D111 cathode / C114 + at ~(8259, 1223).
  O7  Record-signal node TP1 (6340, 1942) also leaves, via the riser
      x ~6339 down to y ~2172, left to x ~5551, down to (5551, 2249), to the
      K103 lower set's UPPER fixed contact (5617, 2249). No dot where this
      riser crosses the lower bus at (6339, 2097) (tp1-buscross.png).


3. COMPONENT PATH, IN SIGNAL ORDER

3a. Line input buffer, U102 1/2 (rec-u102a.png)
  1. J106-1 -> R160 27k (body ~(5448, 2030)), top end on the pin-5 wire at
     y ~1966.
  2. R161 22k (5498, 2030): from the pin-5 wire (dot (5498, 1966)) to the
     lower bus (dot (5498, 2097)).
  3. U102 1/2 pin 5 (non-inverting, (5550, 1966), annotated "0V").
  4. U102 1/2 pin 6 (inverting, (5550, 1915), annotated "0V") is wired
     directly to output pin 7: loop left/up to y ~1862, right to x ~5679,
     down to the output dot (5679, 1942). No feedback resistor.
  5. Pin 7 output (annotated "0V"), dot (5679, 1942).
  6. Supply: pin 8 to the "13.7V" line at y ~1812 (dot (5592, 1812)); that
     line runs from R175 470 top (5371) to C124 47/16V (x ~5908), C124 lower
     end on the lower bus. Pin 4 (drawn on U102 2/2, x ~6050) to the
     "-14.2V" line at y ~2140, which joins R174 470 and C123 47/16V
     (x ~5908, between the lower bus and the -14.2V line).
  7. C120 2.2/50V (5706, 1942) series coupling to node A (5733, 1942).

3b. Monitor/INPUT-source tap (rec-u102a.png, r156-wiper-up.png, mid-band.png,
    q110-input.png)
  8. Node A -> R202 5.6k (5733, 1975) -> R156 20k(B) trimmer (5733, 2017)
     -> R157 2.2k (5733, 2075) -> lower bus (dot (5733, 2097)).
  9. R156 wiper (arrow at ~(5754, 2017)) -> right to x ~5781 -> up x ~5781
     (no dots at y 1812, 1787, 1757, 1729) -> corner (5781, 1703) -> right
     along y ~1703 to x ~6150 -> up to y ~1413 -> right to x ~6411 -> up,
     crossing the upper bus at (6413, 1362) with NO dot (q110-buscross.png),
     to Q110 lower channel terminal ~(6413, 1200). Stop (O5).

3c. Record level trim (rec-u102a.png)
  10. Node A -> R165 12k (5825, 1942) -> node B (5858, 1942).
  11. Node B -> R176 10k(B) trimmer (5858, 1996) -> R177 4.7k (5858, 2060) ->
      lower bus.
  12. R176 wiper (~(5871, 1996)) -> right to x ~5929 -> up to y ~1966 ->
      right to U102 2/2 pin 3.

3d. Record equaliser amplifier, U102 2/2 (rec-u102b.png, k103-links.png)
  13. U102 2/2 pin 3 (non-inverting, annotated "0V").
  14. Inverting pin 2 (annotated "0V") is on a vertical wire x ~5960 with dots
      at (5960, 1862), (5960, 1912), (5960, 2004).
  15. Feedback, output to pin 2: output pin 1 (annotated "0V") -> dot
      (6142, 1942) -> up to (6142, 1862) -> R179 39k -> dot (6052, 1862) ->
      [R180 15k at y ~1862 in parallel with C125 0.47/50V at y ~1838] ->
      (5960, 1862) -> pin 2.
  16. Pin 2 to ground: R178 4.7k from x ~5960 down to the lower bus (dot
      (5960, 2097)).
  17. Pin 2 to ground, series branch: (5960, 2004) -> L103 2.4mH (variable,
      arrow drawn, ~(6100, 2004)) -> R183 1k (6160, 2004) -> C127 0.0039
      (6196, 2004) -> W119 pads (6236, 2004)-(6282, 2004) -> right to x ~6311
      -> W123 pads (6311, 2030)-(6311, 2070) -> lower bus (dot (6311, 2097)).
  18. Output dot (6142, 1942) -> C126 10/16V, printed "(LR)" above it
      (6177, 1942) -> node C (6219, 1942).

3e. Record head drive network (rec-u102b.png)
  19. Node C -> R181 1.5k (6279, 1942) -> TP1 node (6340, 1942).
      C140 0.0027 in parallel with R181: from node C up to y ~1890, across
      to the TP1 riser at (6340, 1890).
  20. TP1 node -> L105 3mH (variable, arrow drawn, ~(6379, 1942)) -> N_REC
      (6433, 1942). C131 390p in parallel with L105: (6340, 1890) to
      (6433, 1890), down to N_REC.
  21. N_REC -> R182 220k to lower bus (dot (6431, 2097)).
  22. N_REC -> right along y ~1942 to K103 upper set lower fixed contact
      ~(6536, 1942). STOP (K103 is another agent's). For context only: in
      q120-k103.png the upper moving arm (pivot (6592, 1929)) is drawn
      resting on this lower fixed contact.
  23. TP1 node also -> K103 lower set upper fixed contact (O7).

3f. Bias amplifier U103 (bias-u103.png, w132-zoom.png)
  U103 is drawn as a box with seven open-circle terminals:
    pin 1 (6066, 2425): right to x ~6096, down to the -15V line y ~2600
          (dots (6177, 2601) C133 -, (6229, 2601) Q119 emitter). -B.
    pin 2 (6066, 2398): right along y ~2398 to TP3 (6230, ~2372) / R198
          8.2 top (dot (6230, 2400)); safety-critical mark beside R198.
    pin 3 (6066, 2370): "AC10V", from J108-4 (I3).
    pin 4 (5961, 2370): left to W132 upper pad (5907, 2368), then to C134
          100p trimmer (~(5850, 2370)), whose other end turns up x ~5805 to
          the y ~2265 wire to the J106-7 / K103 moving-contact dot
          (6620, 1930).
    pin 5 (5961, 2398): left to W132 lower pad (5907, 2398), then along
          y ~2398 to the dot (5805, 2398) annotated "AC65V".
    pin 6 (5961, 2425): left along y ~2425 to dot (5906, 2425) (L106 right
          end) and on to dot (5702, 2424) on the J108-1 riser. Crossings at
          (5806, 2425), (5750, 2425), (5727, 2425): no dots.
    pin 7 (6015, 2340): up to the "15V" line at y ~2315 (J107-3 +B).
  W132: the two pads (5907, 2368) and (5907, 2398) are joined by a drawn
    link (w132-zoom.png), so pins 4 and 5 are one node as drawn.
  L106 1.3mH (variable, arrow drawn): from the AC65V dot (5805, 2398) down
    to y ~2477, through L106, right to x ~5906, up to the pin-6 dot
    (5906, 2425). L106 is across pins 5 and 6.
  L108 (no value printed, no adjustment arrow; l108-zoom.png): on the
    x ~5727 vertical, body y ~2522-2572. Top: from (5727, 2398) on the AC65V
    wire (the AC65V wire runs left from the dot (5805, 2398) to x ~5727,
    crossing x ~5750 with no dot). Bottom: J108-2.
  C133 33/50V (6177, ~2500): between the 15V line (dot (6177, 2315)) and the
    -15V line (dot (6177, 2601)).

3g. Erase head loop
  AC65V node -> L108 -> J108-2 -> erase head (off card) -> J108-3 ->
  (5751 riser, corner (5752, 2315), left to (5551, 2315), up to (5551, 2277))
  -> K103 lower set lower fixed contact (5617, 2277) -> moving contact,
  drawn resting on it, pivot (5670, 2265) -> (5702, 2265) -> down x ~5702 ->
  dot (5702, 2424) -> U103 pin 6 (and J108-1).
  So, in the drawn K103 position, the erase head plus L108 is in parallel
  with L106 across U103 pins 5-6.

3h. Bias-enable switch Q118 / Q119 (bias-switch.png, d115-d116.png,
    q118-q119.png)
  1. J107-7 line ("24V") at (6895, 2408) -> D115 1S2473HJ, anode on the
     J107-7 side (6700), cathode (bar) at (6681) -> R191 47k -> node N1
     (dot (6572, 2408)).
  2. N1 -> down to dot (6572, 2458) -> R192 22k to the -15V line
     (dot (6572, 2600)).
  3. N1 (6572, 2458) -> R193 68k -> node N2 (dot (6493, 2458)).
  4. D116 1S2473HJ: anode at N2 (via (6493, 2408)), cathode (bar, 6540) at
     N1.
  5. N2: C132 10/50V to -15V (x ~6493); R194 18k from dot (6447, 2458) to
     -15V; Q118 base (~(6415, 2458)). The base wire is annotated "-14.4V".
  6. Q118 2SC1684S, NPN (emitter arrow points away from the base,
     q118-q119.png). Collector up via R195 12k to the 15V line (dot
     (6377, 2315)). Emitter (6377, ~2490) -> R196 560 -> dot (6297, 2510).
  7. Dot (6297, 2510): Q119 base; R197 100k to -15V (dot (6297, 2601)).
  8. Q119 2SC1318S, NPN (arrow points away from the base). Emitter to -15V
     (dot (6229, 2601)). Collector up to TP2 node (dot (6230, 2462)) ->
     R198 8.2 -> TP3 node (dot (6230, 2400)) -> U103 pin 2.

3i. Meter drive, Q111 / Q112 (meter-q112.png; x = 7500 + px/1.957)
  1. J105-1 -> riser x ~7551 -> R119 56k (7576, ~1240) -> R141 50k(B)
     trimmer (7576, ~1305) -> lower end to the upper bus (dot (7576, 1367)).
  2. R141 wiper (~(7600, 1305)) -> W112 pads (7633, 1305)-(7681, 1305) ->
     C109 0.1 (7681, ~1260) -> R142 1k (7681, ~1200) -> the base wire
     annotated "-11.2V" at y ~1154 -> Q111 base (~(7814, 1155)).
  3. Q111 2SC1684S NPN base bias: R144 100k from the base node (x ~7814)
     down to dot (7786, 1232), which is the R143 82k (from the 13.8V line)
     / R151 10k (to the -14.2V line) divider.
  4. Q111 collector -> node "13.2V" (7907, 1075) -> R145 3.3k to 13.8V; this
     node is Q112's base. C110 150p from Q111 base (7814, 1075 corner) to
     this node (Q111 base-collector).
  5. Q111 emitter -> node "-11.8V" (7907, 1222) -> R147 1k -> -14.2V; and
     -> (7855, 1222) -> C111 100/16V -> R146 220 -> upper bus (dot
     (7855, 1367)).
  6. Q112 2SA733P (PNP per parts table): emitter to 13.8V line
     (7998, 998); base = node 13.2V; collector down to node "0.7V"
     (7998, 1223).
  7. R148 5.6k from the Q112 collector node (7998, 1223) to the Q111
     emitter node (7907, 1222).
  8. Collector node -> C112 2.2/50V (8030, 1223) -> R149 3.3k (8075, 1223)
     -> node D (dot (8102, 1223)).
  9. Node D: R150 10k to bus (8102); C113 0.001 to bus (8155); D110 1N60 to
     bus (8204), drawn cathode up (at node D), anode at the bus.
  10. Node D -> D111 1N60, anode at node D, cathode at (8259, 1223) ->
      C114 47/10V (+ plate up, to the bus at (8257, 1367)) and the wire right
      to x ~8330 and down to J105-7.
  11. Decoupling on the meter amp rails: C117 47/16V (x ~7735) 13.8V line to
      bus; C118 47/16V (x ~7855) bus to -14.2V.


4. CONTROL ELEMENTS

4a. Bias enable (Q118 / Q119) - traced drive, polarity from the devices:
  - Control input: J107-7 (FUNCTION PCB). D115 passes current only from
    J107-7 into N1, so only a J107-7 voltage above N1 raises N1; with
    J107-7 low or open, R192 pulls N1 toward -15 V.
  - Calculation from printed values (base current ignored), J107-7 = 24 V:
    N1 ~ -15 + 38.35 x 17.5k / 64.5k ~ -4.6 V; N2 ~ -15 + 10.4 x 18/86
    ~ -12.8 V. Q118 (NPN follower) then drives Q119 base through R196 560,
    giving roughly 1 mA or more of Q119 base current: Q119 conducts hard and
    ties U103 pin 2 to -15 V through R198 8.2.
  - J107-7 = 0 V: N1 ~ -11.1 V, N2 ~ -14.2 V. Q118 emitter ~ -14.8 V, below
    the ~ -14.35 V that Q119 needs; R197 100k holds Q119 base down. Q119 is
    off (marginal margin) and U103 pin 2 is open.
  - So: J107-7 HIGH = Q119 ON = U103 pin 2 returned to -B. Active-high,
    derived from D115 orientation and NPN Q118/Q119, not from the name.
  - Timing: C132 10uF at N2 with about 14.8k Thevenin resistance gives
    tau ~ 0.15 s for both ramp-up and ramp-down while D115 conducts. D116
    conducts only when N2 > N1 + ~0.6 V, i.e. when N1 is pulled well down
    (J107-7 open or below ~ -8 V); then C132 also discharges through
    D116 / R192 22k.
  - TP2 / TP3 sit across R198 8.2: the voltage across them is the U103 pin 2
    current x 8.2 ohm.

4b. K103 (switching covered by another agent). What this block relies on:
  - Coil driven by Q120 from the same J107-7 line (D117 anode on J107-7,
    cathode to R200 39k; R201 1.5k / C135 33/25V / R199 22k to Q120 base);
    printed "0.6V" at the Q120 base and "0V" at its collector
    (q120-k103.png). Q120 conducts when J107-7 is high.
  - A dashed actuator line links the upper set (x ~6575) and the lower set
    (down to y ~2200, left to ~5655) (k103-links.png).
  - Lower set, drawn position: J108-1 / U103 pin 6 connected to J108-3
    (erase return closed). Other throw: J108-1 / U103 pin 6 connected to the
    TP1 record-signal node (erase return open).
  - Upper set, drawn position: J106-7 head lead on the lower fixed contact,
    the record drive N_REC.

4c. Jumpers W132 (pins 4-5 of U103, drawn fitted), W119 and W123 (in the
    L103 / R183 / C127 equaliser branch), W112 (meter input). All are drawn
    as pads with a link; see unknowns for W119.

4d. Trimmers in the block: R156 20k(B) (INPUT/source-tap level), R176 10k(B)
    (record-amp input level), L103 2.4mH (EQ branch), L105 3mH (trap),
    C134 100p (bias injection), L106 1.3mH (bias amp output, across pins
    5-6), R141 50k(B) (meter level).


5. OPERATING ANNOTATIONS PRINTED ON THE DRAWING
  "13.7V" U102 pin 8 line (~(5640, 1803)); "-14.2V" U102 pin 4 line
  (~(5790, 2135)); "0V" at U102 pins 5, 6, 7 and 1, 2, 3; "AC10V" at U103 pin
  3 (~(6080, 2365)); "AC65V" at the U103 pin 5 / L106 / L108 node
  (~(5760, 2390)); "15V" on the U103 pin 7 line (~(6040, 2305)); "-14.4V" on
  the Q118 base wire (~(6450, 2445)); "-15V" on the y ~2600 line
  (~(6620, 2590)); "24V" on the J107-7 line (~(6860, 2400)); "0.6V" Q120 base,
  "0V" Q120 collector; meter amp: "13.8V" (top line), "13.2V" (Q111 collector
  / Q112 base), "-11.2V" (Q111 base wire), "-11.8V" (Q111 emitter), "0.7V"
  (Q112 collector), "-14.2V" (meter amp negative rail).
  Consistency check on the meter amp: R147 carries (−11.8 + 14.2)/1k = 2.4 mA,
  R145 carries (13.8 − 13.2)/3.3k = 0.18 mA, so R148 carries ~2.2 mA and the
  Q112 collector sits at ~ −11.8 + 2.2 mA x 5.6k ~ +0.5 V, consistent with
  the printed 0.7V. R143/R151 divider: −14.2 + 28 x 10/92 = −11.16 V,
  consistent with "-11.2V".


6. INTERPRETATION (not drawing fact)

  - Line input: interpretation: R160 27k / R161 22k is an input attenuator
    (ratio 22/49 = 0.45, about -7 dB, 49k input load) into a unity-gain
    follower U102 1/2 (pin 6 tied to pin 7).
  - INPUT source: interpretation: the buffered input, after C120 and the
    R202/R156/R157 divider (wiper range about 0.08 to 0.80 of the buffer
    output), is the signal offered to the source selector as "INPUT" via
    Q110. R156 sets the INPUT-monitor level independently of record level.
  - Record level: interpretation: R165 / R176 / R177 (wiper range about 0.18
    to 0.55) sets the level into the record amplifier; R176 is the record
    level calibration.
  - Record EQ: interpretation: U102 2/2 is a non-inverting stage. Mid-band
    gain 1 + 39k/4.7k ~ 9.3; below about 1/(2 pi x 15k x 0.47u) ~ 23 Hz, C125
    no longer bypasses R180 and the gain rises toward 1 + 54k/4.7k ~ 12.5 (a
    small sub-bass lift). The series L103 / R183 / C127 branch from pin 2 to
    ground resonates at 1/(2 pi sqrt(2.4m x 3.9n)) ~ 52 kHz with nominal
    values (L103 adjustable), lowering the pin-2 impedance and raising gain
    there, limited by R183 1k: treble pre-emphasis. W119 / W123 look like
    break points to remove or alter this branch (for example per tape
    speed or variant), but nothing printed says so.
  - Head drive: interpretation: R181 1.5k (with C140 0.0027 bypass, corner
    ~39 kHz) sets a roughly current-mode drive into the head; L105 3mH ||
    C131 390p is a parallel trap resonating at ~147 kHz with nominal values
    (L105 adjustable), placed between the record amplifier and the head so
    that bias injected at the head side (via C134) is blocked from the
    amplifier output. R182 220k gives a DC/bleed path at N_REC. The trap
    resonance suggests the bias frequency is in that region, but the bias
    frequency is not printed on this sheet.
  - Bias injection: interpretation: record bias = AC65V node -> C134 100p
    trimmer -> head lead J106-7. C134 is the bias-level adjustment. Its
    reactance at an assumed 147 kHz would be about 10.8k, so bias current
    would be roughly AC65V / (10.8k + head impedance); this is conditional on
    the assumed frequency and is not a printed value.
  - Because C134 joins the head lead on the head side of K103, bias reaches
    the head whenever U103 is active, whatever K103 is doing; whether any
    bias is present in the other mode depends only on Q119 / U103.
  - U103: interpretation: a bias power amplifier module driven by the
    master oscillator (10 V AC on pin 3), powered from +B (pin 7) and -B
    (pin 1), with its output between pin 5 (AC65V) and pin 6 (J108-1, the
    return, which the motherboard probably ties to 0V - C17 unresolved). Pin
    2 behaves as an enable / current return: Q119 closes it to -B, so U103
    runs only when J107-7 is high. R198 8.2 with TP2/TP3 lets U103 current
    be measured. L106 1.3mH across the output is the output tuning / load
    adjustment.
  - Erase current: interpretation: erase current = AC65V / (Z(L108) + Z(erase
    head)), carried only while K103's lower set is in the drawn position
    (J108-3 to J108-1). It is set by the AC65V amplitude (U103 drive, L106
    tuning) and by L108; there is no separate erase-current trimmer.
  - Mode consistency: interpretation: J107-7 high gives Q120 on (K103
    energised, the printed Q120 voltages) AND Q119 on (bias amp running).
    Bias running together with erase connected and the head on the record
    drive is self-consistent only if the K103 drawn position is the
    energised position, i.e. this sheet draws K103 in the record state. The
    alternative throw (J107-7 low, U103 off) opens the erase return and
    connects the TP1 record node to J108-1 (probably 0V), muting the record
    drive. This reading is an inference from topology; the protocol default
    is that relays are drawn de-energised, and the drawing does not mark
    the state.
  - Soft switching: interpretation: C132 with R193/R194 makes bias and erase
    ramp up and down over roughly 0.15 s rather than switch abruptly, which
    avoids a recorded click and a magnetised-head transient.
  - Meter: interpretation: Q111 / Q112 is a two-stage direct-coupled
    feedback amplifier (NPN common-emitter into PNP), DC gain set by R148 /
    R147 (~6.6), AC gain by R148 / (R147 || R146) ~ 1 + 5.6k/180 ~ 32
    (~30 dB) with C111 bypassing. C110 150p is HF compensation. The signal it
    amplifies is the card's line output at J102-2 / J102-5 (the U101 2/2
    output after K102), returned on the motherboard U-link to J105-1, scaled
    by R119 56k / R141 50k(B) (meter calibration). That is the selected
    monitor source (INPUT via Q110, or SYNC / REPRO), not the record-drive
    signal. Because the take-off is after K102, the meter sees no signal
    while K102 is open (K102 is drawn open; POWER MUTE controls its coil).
    The output, AC-coupled by C112 through R149, is rectified by the 1N60
    pair: D110 clamps the negative excursion at node D to near ground and
    D111 peak-charges C114, a diode-pump arrangement giving a positive DC
    level on J105-7 that is roughly proportional to the peak-to-peak
    swing. R150 10k and C113 0.001 load / filter node D.


7. UNKNOWNS AND OPEN QUESTIONS

  U1  U103 internals and part number: the parts table says only "BIAS
      AMPL"; the sheet shows no internal drawing. Which pin is input,
      output, return and enable is inferred from labels and connections, not
      printed. Resolve with the TEAC parts list or service manual, or by
      inspecting the module.
  U2  Annotation conflict at (6450, 2445): "-14.4V" on Q118 base corresponds
      (by calculation) to J107-7 at about 0V (bias off), while the J107-7
      line at (6860, 2400) is annotated "24V" and the Q120 annotations show
      Q120 on. Either the annotations come from different modes or a value
      was misread. Resolve by measuring Q118 base in record and play, or a
      service-manual note stating the measurement mode.
  U3  W119 link (6236-6282, 2004): the line between the pads is fainter and
      broken compared with W123's (w119-w123.png). Whether W119 is fitted
      is uncertain. Resolve by a higher-quality scan or the physical board.
  U4  L108 value is not printed (l108-zoom.png). Resolve from the parts list
      or by measuring the part.
  U5  J108-1 ground return (matrix C17, UNRESOLVED). The erase return path
      and the "TP1 node muted to ground" reading both depend on J108-1
      being 0V. Physical continuity P108-1 to P171-7 resolves it.
  U6  Bias frequency is not on this sheet (MASTER OSC PCB, U301 OSC UNIT).
      The 147 kHz and 10.8k figures above use nominal L105/C131 values and
      are conditional. Resolve from the master-oscillator documentation or
      a measurement at J108-4.
  U7  K103 drawn state vs energised state (see the interpretation above):
      decided by the K103 agent and/or a physical check of which contacts
      close with the coil energised.
  U8  The function of U103 pin 4 when W132 is removed (a separate bias tap?)
      is unknown; W132 is drawn fitted.
  U9  "(LR)" printed above C126 (~(6160, 1900)): meaning not stated (possibly
      a low-leakage capacitor type). Resolve from the parts list.
  U10 Q110 channel terminals: the symbol does not distinguish drain from
      source; the two ends are named here by position only.
  U11 Small scan gap in the TP1 riser near (6339, 2163) (tp1-buscross.png).
      The riser is continuous above and below and the path matches the pass-1
      trace; treated as continuous.
  U12 The FUNCTION PCB driver of J107-7 (push-pull, open collector, or
      relay contact) is not traced here; it decides whether D116 ever
      conducts and how fast bias turns off.
