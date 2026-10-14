Pass 4 - Transport-sheet sources of POWER MUTE, PLAY MUTE, REC MODE, REC SIGNAL

All coordinates are full-resolution pixels (x, y) on the TRANSPORT sheet
(scratchpad/transport/full-1.png) unless marked "amp sheet". Crops are in
scratchpad/pass4/crops-transport/. A helper, scratchpad/pass4/trace_line.py,
follows a straight drawn stroke and reports its end; every result it gave was
checked against a crop before being used here (it does jump between adjacent
parallel strokes in the scan-noise columns near x 6200-6300, so it was never
trusted alone).

Parts (control/PS parts table, crop parts1.png, (900-1950, 680-1450)):
U501-U504, U506-U514 SN7400N; U505 SN7474N; U515-U517 uPC393; U518 LM2902;
U519 H54410P; Q534 2SC945AK; Q524 2SC945AK; Q525 2SA733P; Q522/Q523 2SC1684S
(listed in the Q517-Q523 range); Q801 2SC1645; U801 7805H; D801-D805
1SR35-200H; D806 1S2473H; D811, D816 WZ-061.


0. The bus: J171 "To MOTHER PCB" and where each pin goes
--------------------------------------------------------
Drawing facts (crops mother-conn.png, ps-right-mid.png, ps-node8.png,
bus-down.png, tap3485.png):

J171 at (2650, 2860-3180). Pin order top to bottom: 9, 11, 6, 10, 1, 3, 4, 5,
2, 8, 7. Each pin's wire leaves left and turns down on its own vertical, then
turns left into the POWER SUPPLY PCB terminal strip (terminals at x ~2278):

| J171 pin | wire y at J171 | vertical x | PS PCB terminal (y) | printed at terminal | matches amp-sheet P171 name |
| --- | --- | --- | --- | --- | --- |
| 9 | 2877 | direct | 2 (2278, 2880) | "+15V" | +B(15V) |
| 11 (thick) | 2906 | 2332 | 1 (2277, 3170) | "0V" | 0V |
| 6 | 2935 | 2362 | 8 (2277, 3225) | (none) | PLAY MUTE |
| 10 | 2962 | 2387 | 6 (2278, 3425) | "-15V" | -B(-15V) |
| 1 | 2989 | 2413 | 39 (2278, 3509) | "+6V" | 6V |
| 3 | 3016 | 2467 | 42 (2278, 3537) | (none) | POWER MUTE |
| 4 | 3043 | 2492 | 37, upper (2278, 3563) | (none) | REC MODE |
| 5 | 3070 | 2519 | 38, upper (2278, 3591) | (none) | REC SIGNAL |
| 2 (thick) | 3098 | 2548 | 40 (2278, 3685) | "0V" | 0V |
| 8 | 3128 | 2578 | 14 (2278, 3735), dot at (2579, 3731) | "+24V" | 24V |
| 7 (thick) | 3159 | 2608 | 11 (2278, 3920) | "0V" | 0V |

The correspondence was made by the printed rail names at the PS terminals
and by the three thick 0V wires landing on J171-2/7/11, which is exactly
where the amp-sheet list puts 0V. It agrees pin for pin with the amp-sheet
P171 list (1 6V, 2 0V, 3 POWER MUTE, 4 REC MODE, 5 REC SIGNAL, 6 PLAY MUTE,
7 0V, 8 24V, 9 +B, 10 -B, 11 0V).

The PS strip carries terminals 37 and 38 TWICE (37 at y 3563 and 3617, 38 at
3591 and 3645), each pair joined by a short loop drawn inside the PCB outline
at x ~2225 and ~2200 (ps-right-mid.png). Interpretation: REC MODE and REC
SIGNAL only pass through the power-supply board; they do nothing there.

The other side of the pass-through goes to the CONTROL PCB connector P501
(crop p501-names.png, names printed at x ~3360-3470):
- P501-1 "REC MODE" (3290, 3886): J501-1 runs left to x ~2854, up to y 3614,
  left to PS terminal 37 lower (3617).
- P501-2 "REC SIGNAL" (3290, 3807): J501-2 left to x ~2935, up to y 3642,
  left to PS terminal 38 lower (3645).
- P501-3 "PLAY MUTE" (3290, 4128): J501-3 left to x ~2830, up to y 3280,
  left to PS terminal 7 (2277, 3280). It is NOT a pass-through: it reaches
  P171-6 only through a resistor network (section 2).
- P501-4 "24V" lands on PS terminal 14; P501-5 "CAP M" on PS terminal 13.
- POWER MUTE does not appear on P501 at all; it is generated on the POWER
  SUPPLY PCB.

Crossings at (2511-2608, 3280) on the PS-7 wire have no dots (node7-dot2.png).


1. POWER MUTE (P171-3) - Q801 on the POWER SUPPLY PCB
-----------------------------------------------------
Component path (crops q801.png, bridge801.png, d805.png, tap3485.png):
- Transformer winding on PS terminals 35 (1363, 3485) and 36 (1363, 3683),
  C848 0.047u/250V across them.
- Bridge D801~D804 (1560, 3577): AC corners top (to 35) and bottom (to 36);
  minus corner (left) to the 0V bus at y 3683; plus corner (right, by the
  drawn diode direction) to node A at y 3577.
- Node A: C801 1000u/16V to 0V (1816); R830 470 (1/2W) and R831 33 (1/2W) in
  series to 0V (1660); a wire at y 3510 to PS terminal 39 "+6V" and so to
  J171-1 (6V). So the 6V rail IS node A: an unregulated bridge-and-capacitor
  supply.
- R830/R831 junction -> wire at y 3485 -> PS terminal 41 "+2V" (and on east to
  x ~2777; not followed, not on P171).
- R801 8.2k from node A to node B (1923, 3577). D805 across R801 with its
  anode on node B and cathode on node A (d805.png: triangle points at node A).
- Node B: C802 1000u/6.3V to 0V.
- D806 (anode node B, cathode node C).
- Node C (2000, 3577): R802 22k to 0V; Q801 base.
- Q801 2SC1645, NPN (emitter arrow pointing out). Emitter to 0V (2116, 3684).
  Collector up to y 3537 -> PS terminal 42 -> vertical x 2467 -> J171-3.

Nothing else is drawn on the collector: no pull-up on this sheet. POWER
MUTE is an open-collector NPN sink.

Timing (computed from drawn values; the 6V rail's actual loaded voltage
is not printed):
- Turn-on: C802 charges through R801 from the 6V rail. Q801 starts to
  conduct when node B reaches about two junction drops (D806 + Vbe, ~1.2V);
  R802 draws almost nothing below that. t_on ~ R801*C802*ln(V6/(V6-1.2))
  = 8.2 s * ln(V6/(V6-1.2)). For V6 = 6V that is ~1.8 s, after which Q801
  base current still rises slowly towards (V6-1.3)/8.2k ~ 0.55 mA.
- Turn-off: when AC goes, node A decays through R830+R831 (503 ohm) and
  whatever else the 6V rail feeds. D805 then dumps C802 into node A, so node
  B follows node A down instead of holding up through R801. Q801 turns off
  when node A falls to ~1.2V. With only the 503-ohm bleeder that is a
  time constant of ~0.5 s on C801 (longer if C802's charge is added, at most
  ~1 s), shorter with any extra load on the 6V rail.
- Interpretation: slow-on (seconds), fast-off muting. The bridge and its
  1000u reservoir are small and bled hard, while the 24V and +/-15V supplies
  have 1000u-2200u reservoirs (C803, C816, C822-C826, C834/C835), so Q801
  should release K102 before the audio rails collapse.

State table (P171-3 as seen from the card; "sinks" = Q801 saturated, pulls to ~0V)

| Condition | Q801 | POWER MUTE | Reason |
| --- | --- | --- | --- |
| Power off | off | open (no current path) | no base drive |
| Power on, first ~2 s | off | open | C802 still charging through R801 8.2k |
| Power on, settled; STOP / PLAY / FF / REW / RECORD / PAUSE / punch | on | sinks to ~0V | depends on nothing but the 6V rail; no transport-logic input reaches node A, B or C |
| Mains switched off | off within the bleeder time constant | open | C801 bleeds via R830/R831; D805 discharges C802 |

Consistency with the card: the card's K102 coil sits between J102-4 (P180-3,
24V from OUT SELECT) and J102-3 (POWER MUTE) and needs POWER MUTE to sink.
Q801 sinks only after the power-on delay, and is open before then and
after power-off. That is consistent: the output relay closes only once the
machine has been powered for a while, and opens first at power-down.
POWER MUTE does not depend on transport mode.


2. PLAY MUTE (P171-6) - Q534 on CONTROL PCB, level-shifted on POWER SUPPLY PCB
-----------------------------------------------------------------------------
Component path (crops ps-node8.png, pm-end.png, pm-corner.png, pm-strip1.png,
pm-top2.png, pm-src.png, q534-ctx.png):

Power supply PCB side:
- PS terminal 7 (2277, 3280) <- control PCB P501-3.
- R827 82k from terminal 7 to node D (2192, 3280).
- Node D: R828 100k to -15V (y 3425); C850 1u/50V to -15V (x ~2165); and the
  wire up to y 3225 and right to PS terminal 8 (2277, 3225).
- Terminal 8 -> right to x 2362 -> up to J171-6 (PLAY MUTE).

Control PCB side, from P501-3:
- P501-3 (4128) -> right to x 3561 -> down to y 4267 -> right along y 4267
  to x 6234 (trace_line end (6234, 4264); corner checked in pm-corner.png: the
  y 4243 line next to it passes straight through) -> up the vertical x
  ~6235 (a scan seam at y ~2157 offsets it by ~2 px; pm-top2.png) -> to y
  1329, then left to node E (6185, 1329).
- Node E: R608 10k to 24V (6118); R609 100 up to the wire at y 985; C529 0.01
  down to 0V; Q534 collector.
- Q534 2SC945AK, NPN (emitter arrow out), emitter to the 0V bus at y ~1645.
- Q534 base node (5975, 1381): R607 22k to 0V; C528 10u/50V to 0V; R695 22k
  from the vertical x 5908.
- x 5908 goes up to the wire y 1148 (which also feeds Q539 base through R618
  10k at (6687, 1383): the brake/solenoid driver chain) and down to the wire
  y 1966 (dot (5908, 1966)).
- Wire y 1966 runs west to x 4116 (dots at 5908, 6103, 6259; q534-src.png)
  and up the x 4116 vertical to a dot on the wire from U519 pin 12, printed
  "PLAY OUT" (U519 at (3700-3960, 1020-1580), crop u519.png). The dot at
  (6259, 1966) feeds D534 -> Q537 -> Q538 (capstan-solenoid driver area); the
  dot at (6103, 1966) feeds D508 and the collector of Q522 (section 4).
- Wire y 985 from R609 runs east to P513-1 (7882, 987). J513-1 -> S607
  "CUE SW" -> J513-2 -> P513-2 -> thick bus x 7690 down to y 4524, west to
  P502-5, printed "0V" (crop solenoids.png). So S607 closed puts node E
  on 0V through R609 100 ohm.

Levels (computed from drawn values; 24V and -15V taken at their printed values):
- Q534 saturated (or S607 closed): terminal 7 ~0V (0.24V through R609 with
  S607), so node D = -15 x 82/(82+100) = -6.76V. The amp sheet annotates the
  card's J104-1 line "-6.8V". The match to two figures is evidence that the
  printed -6.8V is the PLAY state of this divider.
- Q534 off and S607 open: terminal 7 is pulled to 24V through R608 10k, so
  node D sits between 24V through 92k and -15V through 100k:
  -15 + 39 x 100/192 = +5.3V (card loading through its D119 neglected; D119
  is reverse-biased in this state).
- Timing: C850 with R827||R828 (45k) gives ~45 ms smoothing at the PLAY
  MUTE node, so mute and un-mute are ramps, not steps. Q534 base: R695 22k
  into C528 10u with R607 22k: about 0.1 s time constant on the PLAY OUT
  edge, so Q534 turns on a little after PLAY OUT rises and off a little after
  it falls.

U519 is a custom part (H54410P), so its output polarity is not knowable from
this sheet. (**Since resolved:** the 38 manual's parts list names U519 as a
Mitsubishi M54410P, whose datasheet gives PLAY OUT and REC OUT active high,
PLAY OUT high in REC/PLAY, and PLAY OUT low / REC OUT high in REC/PAUSE -
see `pass6-datasheets.md`.) Evidence that "PLAY OUT high = play": the same net drives NPN
stages to the capstan solenoid (D534 -> Q537) and the brake solenoid (R618
-> Q539 -> Q541; Q541 collector to the brake solenoid / R723 node at
(7533, 1495)). Only a high level can turn on NPN stages driven through series
resistors, and the capstan solenoid has to be energised to move tape at play
speed. This is interpretation, flagged as such.

State table (P171-6)

| Condition | Q534 | S607 CUE | P171-6 | Card SYNC/REPRO (Q107) |
| --- | --- | --- | --- | --- |
| Power off | - | - | ~0V (all rails gone) | muted (and K102 open anyway) |
| Power on, STOP | off (PLAY OUT low, by interpretation) | open | ~+5.3V | muted |
| PLAY | on | - | ~-6.8V | passes |
| RECORD (play + record) | on, if PLAY OUT stays high in record (see unknown U2) | - | ~-6.8V | passes |
| FF / REW, cue lever not engaged | off | open | ~+5.3V | muted |
| FF / REW with CUE switch closed | off | closed | ~-6.6V | passes (cue monitoring) |
| PAUSE | depends on whether U519 holds PLAY OUT in pause (unknown U3) | - | -6.8V or +5.3V | - |
| Punch in / punch out while playing | on (PLAY OUT unchanged; punch acts on REC, section 5) | - | ~-6.8V | passes |
| Power-on ramp | off until PLAY | - | positive once 24V is up; the -15V-only interval cannot be told from the drawing | see unknown U4 |

Consistency with the card: the card passes SYNC/REPRO only with J104-1 held
negative (annotated -6.8V) and mutes at 0V or open. The transport gives
-6.76V exactly when Q534 conducts (PLAY) or CUE is closed, and +5.3V
otherwise. Consistent.


3. REC MODE (P171-4) - an INPUT to the transport, not an output
---------------------------------------------------------------
Component path (crops u501.png, u519.png; trace_line runs listed):
- P501-1 (3290, 3886) -> right to x 3535 -> up x 3534 to y 2175 -> right
  along y 2171 to x 4168 -> up x ~4172 to y 1047 -> right to R511 100.
  Crossings along this route (at x 3584-3746 on y 2171, many on x 4172)
  have no dots in the crops checked. They were not all checked one by one;
  see U6.
- R511 100 -> node F (4245, 1047): R514 4.7k pull-up to the logic supply
  triangle (unlabelled; read as 5V because it is a TTL input and the
  7805 output is the 5V rail); C501 0.01 to 0V; U511 pins 12+13 (a
  7400 NAND with its inputs tied, i.e. an inverter).
- U511-11 -> U501-2. U501-1 = U501-12 = U519 pin 10 "REC OUT" (vertical x
  4012, dot (4012, 1377)). U501-3 -> U501-4; U501-5 from a wire at y 1129
  (source not traced). U501 (4,5,6) is drawn as an OR with inverted inputs,
  i.e. a NAND. U501-6 -> R512 10k -> Q501 base. Q501 collector -> wire y
  ~850 -> KEY BOARD PCB, where the RECORD lamp sits at y ~840.
- U501 (12,13,11) = NAND(REC OUT, PAUSE OUT) -> U501 (9,10,8) inverter ->
  R513 10k -> Q502 -> wire y ~903 -> the PAUSE lamp on the KEY BOARD PCB.

So on this sheet REC MODE ends at one TTL input, with a 4.7k pull-up,
100-ohm series resistor and 0.01u filter. No transport-side device drives it.

State table (as seen at P171-4)

| Condition | Transport-side level |
| --- | --- |
| Any | pulled up to the logic rail (read as 5V) through R514 4.7k + R511 100, unless the motherboard side pulls it down |

Logic effect (drawing): with REC OUT high, U501-3 goes low (and so Q501
conducts, lighting RECORD) only when REC MODE is pulled LOW. Interpretation:
the motherboard grounds REC MODE when at least one channel is armed, and the
RECORD lamp lights only when the transport is recording and a track is
armed. Whether REC MODE also inhibits U519 REC IN is not drawn as traced (see
U7). The driver of REC MODE is on the amplifier side, which belongs to
another tracer. No card-side need for REC MODE is recorded in
circuit-analysis.md, so there is nothing on the card to check it against.


4. REC SIGNAL (P171-5) - Q525 PNP high-side switch from 24V
-----------------------------------------------------------
Component path (crops recsig.png, q523.png, recsig-left.png, u511b.png):
- P501-2 (3290, 3807) -> right to x 3670 -> up to y 3757 -> right along y
  3757 to x 5934 -> up to R579 1k bottom.
- R579 1k top -> Q525 collector (5934, 3565).
- Q525 2SA733P, PNP (emitter arrow pointing in). Emitter to 24V (5934, 3422).
  Base (5894, 3544): R578 22k to the emitter (24V); R577 22k to Q524
  collector.
- Q524 2SC945AK, NPN. Emitter to 0V (5763, 3730). Base (5696, 3460): R722 22k
  to 0V; R576 47k from node G.
- Node G (5563, 3420) = Q523 collector; also up the vertical x ~5563 to y
  3156, west to x 5327, up to U511 pin 9 (5327, 3062) and on up to y 2043,
  west along y 2040 to x 4012, up to the dot on U519 pin 10 "REC OUT"
  (4012, 1377). So node G is the U519 REC OUT net.
- Q523 2SC1684S, NPN: emitter to 0V (via x 5616); base through R574 22k from
  U516 pin 1.
- Q522 (same type) beside it: base through R575 22k from U516 pin 1; collector
  -> x 5671 up to the wire y 3350 -> east to the dot (6103, 3350) -> up x 6103
  to the PLAY OUT wire (6103, 1966). So Q522 sinks PLAY OUT and Q523 sinks
  REC OUT, both commanded by U516 pin 1.

So REC SIGNAL = 24V through R579 1k when Q525 conducts. Q525 conducts when
Q524 conducts, which needs node G (REC OUT) high and Q523 off. With Q525
off, P501-2 is open on the transport side: no pull-down is drawn.

The inhibit (U516A, uPC393 comparator; open collector, R573 3.3k pull-up):
- U516-2 (inverting) = node H (5212, 3537): R569 150k to the supply triangle;
  C524 4.7u/50V to 0V; R568 330 to Q521 collector; R567 330 to Q520
  collector.
- U516-3 (non-inverting) = R570 27k (to supply) / R571 47k (to 0V) divider,
  with R572 100k feedback from pin 1 (hysteresis).
- U516-1 high (C524 below threshold) -> Q522/Q523 on -> PLAY OUT and REC OUT
  pulled low. U516-1 low (C524 charged past ~47/74 of the supply) -> no
  override.
- Recharge time from empty: ~R569*C524*ln(1/(1-0.64)) = 0.705 s x 1.02,
  about 0.7 s (hysteresis ignored, same supply assumed for R569 and R570).
- Q521 (discharges C524 via R568): base through D507 from node J (4977,
  3537) = R566 22k from U516 pin 7 (U516B output, R564 3.3k pull-up). Node J
  also goes up x 4977 to the wire y ~3295 -> east to Q526 collector (5999):
  Q526 on forces Q521 off.
- Q526 2SC1684S, NPN: base through R580 47k from node K (6103, 3462); node K:
  C526 10u/50V to 0V; D508 cathode (anode = PLAY OUT, via the dot (6103,
  3350)); D509 cathode (anode up x 6078 to y 2019, west to x 4088, up to U519
  pin 11 "PAUSE OUT" at y 1140).
- Q520 (discharges C524 via R567): base through R565 22k from the wire y
  3319 -> east to x 6182 -> up to y 2433 -> the joined cathodes of D522/D523,
  whose anodes are U514 pin 3 and U514 pin 6 (crop u512.png). U514 is
  fed by the cross-coupled U512/U513 latches with C518/C519 0.01 (not traced
  further).
- U516B (pins 5/6/7) is fed by C523 1u (R560 150k) with a Q517 -> Q518/Q519
  stage before it. Q517's base RC (R549 100k, C521 22u/10V, R550 100k) is fed
  from the y 3617 wire, which is P507-2 = SHUTT OFF PCB PH501 pin 2 (the
  photo-interrupter's transistor side; R546 1k load). D506 and Q513-Q516 (with
  R540/R544 fed from the EDIT PCB S608 third section, P505-5/6) also join that
  wire. This chain was traced only to the components named; its logic is
  open (U8).

Interpretation: Q522/Q523 are an override that cancels PLAY and REC whenever
U516A is high. The cascade in front of it takes the tape shut-off sensor
PH501, the U512-U514 latches (possibly reel-motion sensing) and PLAY/PAUSE
via Q526. That is an auto-stop / start-up guard. While it is asserted, REC
SIGNAL cannot be at 24V, because node G is pulled low.

State table (P171-5)

| Condition | REC OUT net | Q525 | P171-5 |
| --- | --- | --- | --- |
| Power off | - | off | open |
| STOP | low (by interpretation: no record) | off | open |
| PLAY | low | off | open |
| FF / REW | low | off | open |
| RECORD (play + record), override inactive | high | on | 24V through R579 1k |
| RECORD, override asserted (U516-1 high) | pulled low by Q523 | off | open |
| Punch in during PLAY | goes high (section 5) | on | 24V through 1k |
| Punch out during RECORD | goes low | off | open |
| PAUSE (with record armed) | unknown (U3) | - | - |

Card-side need: circuit-analysis.md records none for REC SIGNAL; its card
contact is outside the established card tables. The level is a sourced 24V
through 1k, or open, so whatever it drives on the motherboard needs its own
pull-down or must be a current-driven load. See U9.


5. PUNCH IN/OUT (crop punch.png, u501.png)
------------------------------------------
- PUNCH IN/OUT PCB: J901 remote jack; R901 10 into Q901 base; R902 47k
  pull-up from P514-1 (supply); C901 2.2u/50V. Q901 -> R903 4.7k / R904 10k /
  R905 47k -> Q902; Q902 collector = P514-2.
- P514-2 -> R516 4.7k pull-up -> U506 (1,2 tied, inverter) -> U506-3 at
  (3481, 2582) -> up x 3481 to y 2227 -> east to x 4728 -> up to y 1430 ->
  U505 (SN7474) pin 3 CLOCK.
- U505 DATA (pin 2) = U504-8 = U502-11 inverted = AND(PLAY OUT at U502-12,
  NOT REC OUT at U502-13 via the U502 (1,2,3) inverter).
- U505 CLEAR (pin 1): R520 4.7k to 5V, pulled low through D538 "FF SW", D539
  "REW SW" and D537 (third line, source not traced). U505 PRESET (pin 4): Q504
  collector (R519 4.7k pull-up); Q504 base from R517/C508 (differentiator)
  on the REC OUT line.
- U505 Q (pin 5) -> U502 (4,5) and U504/U503 gating -> R521 100 / C509 1u ->
  Q505 (pulse), and U503/U504 -> R523 / C510 1u -> Q506 (pulse). The Q505 /
  Q506 collectors (via D518 / D519) were not traced to their U519 inputs.

Interpretation: a footswitch press clocks U505. If the machine is playing
and not recording, DATA = 1 and the flip-flop sets: a pulse via Q505
(presumably into U519 REC IN) raises REC OUT, so REC SIGNAL goes to 24V. If
it is recording, DATA = 0 and the pulse via Q506 drops record. PLAY OUT is not
involved, so PLAY MUTE stays at -6.8V through the punch. FF/REW clear the
flip-flop. The pulse destinations are U10.


6. Rails on the POWER SUPPLY PCB (brief)
----------------------------------------
- 6V (P171-1): unregulated. Bridge D801~D804 from terminals 35/36, C801
  1000u/16V, bled by R830 470 + R831 33 (section 1). The "+2V" terminal 41 is
  the R830/R831 tap. Note: 33/503 of a ~6V rail is ~0.4V, not 2V. Either the
  rail is higher than its 6V name or the +2V figure assumes a load; the drawing
  does not settle it (U5).
- 24V (P171-8, PS terminal 14): bridge D807~D810 (terminals 9/10), R803 1.5
  ohm 2W, C803 1000u/50V; series pass Q803 (2SD313E) driven by Q802
  (2SC1318S), error amplifier Q804 with reference zener D811 (WZ-061) and
  R806 3.9k / R807 18k (a trimmer arrow is drawn on R807) / R808 6.8k.
- +15V (P171-9, PS terminal 2): series pass Q807 (2SD313E) / driver Q805,
  error amplifier Q806 with D816 (WZ-061) and divider R814 6.8k / R815 5.6k;
  input from D812/D813 off terminal 3, reservoir C834 470u + C806 470u, with
  R809/R810/R811 and C807/C808 filtering the driver feed.
- -15V (P171-10, PS terminal 6): series pass Q810 (2SB507E) / driver Q808
  (2SA733P); error amplifier Q809 (2SA733P), its base on R821 470k / R822
  10k / D817 between the rails. The negative regulator is referenced to the
  positive side (a tracking pair), by interpretation from that divider. Input
  D814/D815 off terminal 4; C835/C811 470u.
- +5V (PS terminal 22): U801 7805H from bridge D818 (terminals 16/18), C816
  1000u.
- 0V on P171-2/7/11 = PS terminals 40, 11 and 1.


7. Unknowns
-----------
U1. U519 (H54410P) output polarity. "PLAY OUT high = playing" rests on
    NPN-driven solenoid stages (sections 2, 4), not on the device. Resolved by
    a H54410P data sheet, or by measuring U519-12 in STOP and PLAY.
U2. Whether PLAY OUT stays high in RECORD. The capstan-solenoid path traced
    (D534 -> Q537) is fed only from PLAY OUT, which argues that it must; no
    REC OUT path to the capstan solenoid was found. Resolved by U519
    documentation or by measuring U519-12 while recording.
U3. PAUSE: whether U519 drops PLAY OUT and/or REC OUT in pause. PAUSE OUT
    feeds D509 -> Q526 and the PAUSE lamp gate; nothing traced makes PAUSE act
    on Q534 directly. Same resolution as U1.
U4. Power-on: the ordering of -15V against 24V decides whether P171-6 swings
    briefly negative (un-muting the card's SYNC/REPRO) before Q534's collector
    pull-up is live. K102 is held open for ~2 s by POWER MUTE regardless, so
    the line output is protected. Resolved by a scope on P171-6 at switch-on.
U5. The +2V terminal 41 against a ~6V rail (section 6); also the true loaded
    6V voltage, which sets the power-on delay (section 1). Resolved by
    measuring PS terminals 39 and 41.
U6. REC MODE route crossings at x 3584-3746 on y 2171 and along x 4172 were
    read as plain crossings from crops, not all individually zoomed.
U7. REC MODE beyond the RECORD-lamp gate: whether it also gates U519 REC IN
    (record interlock). U501-5's source (wire y 1129 from x ~4190) was not
    traced.
U8. The auto-stop cascade feeding U516A: Q513-Q519, U516B, the U512-U514
    latches through D522/D523, the EDIT switch S608 third section on
    P505-5/6, and PH501. Traced to component level at the joins named in
    section 4, but the sequence (which condition holds U516-1 high for how
    long) was not established. Resolved by a full trace of (3450-6300,
    2300-3800).
U9. REC SIGNAL's amp-side load. The transport sources 24V through 1k or
    leaves it open; the amp-sheet tracer must confirm a pull-down there.
U10. Punch pulse destinations: Q505 / Q506 collectors via D518 / D519 (around
    x 5786-5806, y 1000-1700) into U519 inputs.
