Pass 6 - Transport sheet: PAUSE (M3), auto-stop / start-up guard (M7), PLAY OUT in RECORD (M2), punch pulses (U10)

All coordinates are full-resolution pixels (x, y) on the TRANSPORT sheet
(scratchpad/transport/full-1.png). Crops are in scratchpad/pass6/crops-pause/
(file named after each claim). Lines were followed with pass4/hrun.py and
pass4/vrun.py; every junction used below was confirmed as a filled dot in a
zoomed crop, and every "crossing" was zoomed and has no dot. Follows the
Pass 3 / Pass 4 protocols: drawing facts first, "Interpretation:" marked.

Supply: the logic pull-ups end in an unlabelled triangle. All the timing
below assumes they are one rail (read as the 5V logic rail, as in Pass 4).
Device types are from the symbols and the Pass 4 parts table.


0. U519 (H54410P) pin names, and how the keys reach them
--------------------------------------------------------
Drawing facts (u519.png, u519-left.png, keyboard.png, keynames.png):

U519 at (3700-3960, 1020-1580). Printed pin names:
- Left (inputs): 1 PLAY IN (y 1062), 6 PAUSE IN (1142), 3 FF IN (1219),
  5 REW IN (1298), 7 REC IN (1377), 2 STOP IN (1456), 4 MEMORY (1508),
  9 AR (1562).
- Right (outputs): 12 PLAY OUT (1062), 11 PAUSE OUT (1142), 15 FF OUT (1219),
  13 REW OUT (1298), 10 REC OUT (1377), 14 FAST (1456).
- 16 at the top (supply triangle), 8 at the bottom (thick 0V bus, y ~1645).

KEY BOARD PCB: S601 (key printed with a play triangle), S602 PAUSE, S603
(fast-forward arrows), S604 (rewind arrows), S605 RECORD, S606 STOP. Each is a
momentary contact drawn open, from its J503 pin to a common bar on J503-4.
J503-4 / P503-4 is a thick wire (y 1508) to the thick vertical x 3663 that
joins U519 pin 8's 0V bus. So a key press pulls its line to 0V.

Each key line: P503 pin -> 33-ohm resistor (R505 PLAY, R506 PAUSE, R507 FF,
R508 REW, R509 REC, R510 STOP) -> U519 input, with C502-C506 2.2u/50V (C507
10u/50V on STOP) from the input to the x 3663 0V vertical. No pull-up resistor
is drawn on any U519 input on this sheet. The REMOTE CONTROL PCB lines
(P504-7, -6, -9, -8, -5, -10 at y 1700, 1725, 1752, 1778, 1804, 1830) join
PLAY, PAUSE, FF, REW, REC, STOP by dots at x 3295, 3321, 3373, 3400, 3427,
3455 respectively.

FF and REW are different: R507's right end turns down at x 3533 and pin 3 is
fed from a separate vertical at x 3559; R508 / pin 5 likewise at x 3584 /
x 3610. These verticals go to P505-3/4 and P505-2/1, i.e. through two
sections of the EDIT switch S608 (edit.png, p505.png). Not followed further;
out of scope.

Interpretation: U519's inputs are active-low key closures, with pull-ups
inside the chip (none are drawn).


1. U10 - punch pulses: where Q505 and Q506 land
-----------------------------------------------
Drawing facts (q505.png, q505-right.png, strip-a.png, strip-b.png,
u519-left.png, u503latch.png, u502-45.png, recout-node.png, clear2.png,
d537corner.png):

Q505 (NPN; emitter (5695, 1303) to the thick wire to the 0V bus):
- Base node (5690, 1145): R521 100 + C509 1u/50V in series from U502-8;
  R522 22k and D517 to 0V.
- Collector (5695, 1095) -> D519 cathode. D519 anode -> x 5800 down to
  y 1700 -> west along y 1700 (no dots between, strips checked) -> dot
  (3295, 1700) -> up x 3295 -> dot on the PLAY key line (3295, 1062), i.e.
  the R505 / U519-1 PLAY IN net (also P504-7).
- Collector -> dot (5695, 1040) -> D518 cathode. D518 anode -> x 5827 down to
  y 1804 -> west along y 1804 -> dot (3427, 1804) -> up x 3427 -> dot on the
  REC key line (3427, 1377), i.e. the R509 / U519-7 REC IN net (also P504-5).

Q506 (NPN; emitter to the 0V bus):
- Base node: R523 100 + C510 1u/50V from U504-6; R524 22k and D520 to 0V.
- Collector (5695, 1430) -> right to x 5747 -> down to y 1725 -> west along
  y 1725 to x 3717 (crosses y 1700 at (5747, 1702) with no dot) -> up x 3717
  -> U519 pin 9 "AR" (3718, 1562). This y 1725 segment is separate from the
  P504-6 PAUSE remote segment on the same row, which ends at x 3321.

So: Q505 conducting pulls the PLAY and REC key lines to 0V together through
D519/D518 (a simulated PLAY + RECORD press). Q506 conducting pulls U519
pin 9 "AR" to 0V. The diodes isolate the two key lines from each other.

The gating logic (all SN7400 NAND; a gate drawn as an OR with bubbled inputs
is still a NAND):
- U502 (12,13 -> 11): 12 = PLAY OUT (from the x 4116 vertical, dot
  (4116, 1377)); 13 = NOT REC OUT (U502 1,2,3 inverter fed from the REC OUT
  vertical x 4010 via dot (4010, 1432)). U504 (9,10 -> 8) inverts. U505 DATA
  (pin 2) = PLAY OUT AND NOT REC OUT.
- U505 (SN7474) CLOCK (pin 3) from the footswitch path (Pass 4: P514-2 ->
  R516 -> U506 inverter). CLEAR (pin 1): R520 4.7k pull-up, pulled low through
  D538 "FF SW", D539 "REW SW" and D537. D537's line (y 1341) runs west to
  x 4277, down to a dot (4276, 1829) on the y 1829 line, which is the STOP key
  net (P504-10, dot (3455, 1829) to STOP IN). So STOP, FF SW and REW SW all
  clear U505. PRESET (pin 4): Q504 collector (R519 4.7k pull-up); Q504 base
  from R517 4.7k + C508 1u on the REC OUT net (x 4357), R518 22k and D501 to
  0V: a pulse on each rising edge of REC OUT.
- U505 Q (pin 5) on the x 4897 vertical (dot (4897, 1430)) feeds U502-4,
  U504 (12,13) and U504 (1,2).
- Punch-in pulse: U502 (4,5 -> 6): 5 = PLAY OUT (x 4116 -> up to y 789 ->
  east to x 4896 -> down to pin 5 at y 1132; pins 4 and 5 are on separate
  verticals, u502-45.png); 4 = Q. U502 (9,10 -> 8) inverts, so U502-8 =
  PLAY OUT AND Q -> R521 / C509 -> Q505.
- Punch-out pulse: U503 (1,2,3) and (4,5,6) are a cross-coupled pair:
  U503-3 -> U503-4; U503-6 -> R700 100 -> U503-2, with C511 0.01 from U503-2
  to 0V. U503-1 = U504-11 = NOT Q. U503-5 = REC OUT (x 4357 down to y 1674,
  east to x 5039, up to pin 5). U503 (9,10 -> 8) inverts U503-6. U503
  (12,13 -> 11): 13 = U503-8, 12 = U504-3 = NOT Q. U504 (4,5 -> 6) inverts:
  U504-6 = (NOT U503-6) AND (NOT Q) -> R523 / C510 -> Q506.

Logic, worked through (drawing-derived; key-line and U519 behaviour are
interpretation):

| Step | Q | REC OUT | U503-6 | Effect |
| --- | --- | --- | --- | --- |
| STOP pressed | cleared to 0 (D537) | - | - | no pulse |
| PLAY, footswitch | DATA = 1, Q 0 -> 1 | low | 1 | U502-8 rises -> Q505 pulse -> PLAY + REC key lines pulled low |
| record entered | 1 (Q504 presets it on the REC OUT edge) | high | 0 | no further pulse (U504-6 = 0 while Q = 1) |
| RECORD, footswitch | DATA = 0, Q 1 -> 0 | high | 0 | U504-6 rises -> Q506 pulse -> U519-9 AR pulled low |
| REC OUT drops | 0 | low | 1 | U503-8 -> 0, U504-6 -> 0; latch rests |
| Q cleared while not recording (FF SW, REW SW, STOP) | 1 -> 0 | low | 1 | U503-8 = 0, so no Q506 pulse |

Because Q504 presets Q on every rising edge of REC OUT, a footswitch press
also punches out of a record started from the panel keys, not only one
started by the footswitch. Pulse length: C509 / C510 1u into the 22k base
resistor and the base: a pulse, not a level, of the order of milliseconds
(not computed more closely).

Interpretation: punch-in is a simulated PLAY + RECORD key press; punch-out
is a pulse on U519 "AR", which (from its use here) drops record without a
STOP press. PLAY OUT is not touched by either pulse, so PLAY MUTE stays at
-6.8V through a punch. What U519 does with "AR" is inside the custom chip.


2. M3 - PAUSE
-------------
Drawing facts (u519.png, keyboard.png, lamps.png, q501-502.png,
p-4726.png, y1966.png, q522-526.png, q526z.png):

- PAUSE key S602 -> P503-6 -> R506 33 -> U519-6 PAUSE IN (C503 2.2u to 0V).
  Remote P504-6 joins at (3321, 1142). Nothing else connects to this net.
- U519-11 PAUSE OUT (3955, 1142) -> east to x 4089 -> down the x 4089
  vertical. Its only branches (vrun from (4089, 1150), each zoomed):
  (a) at y 1206 east to U501-13 (4389, 1206); (b) at y 2017 east along
  y 2017-2020 to x 6078 (crossings at 4726 etc. have no dots), down x 6078
  to D509's anode. Everything else on x 4089 is a plain crossing.
- (a) U501 (12,13 -> 11): 12 = REC OUT (y 1180 west to the x 4010 REC OUT
  vertical), 13 = PAUSE OUT. U501 (9,10 -> 8) inverts -> R513 10k -> Q502
  base. Q502 (NPN, emitter to 0V) collector -> x 4806 -> P503-1 (R504 1.2k)
  -> J503-1 -> D602, the LED printed beside "PAUSE" on the KEY BOARD PCB.
  (Q501's collector goes to P503-2 / R502 4.7k / D601, beside "RECORD".)
- (b) D509 (anode = PAUSE OUT, cathode down) and D508 (anode = PLAY OUT via
  the dot (6103, 3350)) share cathodes at node K (6103, 3462-3543). Node K:
  C526 10u/50V to 0V; R580 47k to Q526 base. Q526 (2SC1684S; the emitter
  arrow points away from the base, NPN) emitter to 0V, collector up x 5999
  to y 3295, west along y 3295 to node J (4977, 3296) (section 3).

So PAUSE OUT has exactly two loads: the PAUSE-lamp gate and Q526. No path
from PAUSE OUT reaches PLAY OUT, REC OUT, Q534, the capstan solenoid driver
(Q537/Q538), the brake driver (Q539/Q540/Q541), Q522/Q523 or Q525.

Interpretation (from topology, not from U519):
- The PAUSE lamp lights only when PAUSE OUT and REC OUT are both high. So
  "REC OUT high with PAUSE OUT high" is a state the circuit was designed to
  show: the lamp marks record-pause. That argues that U519 HOLDS REC OUT
  high in pause from record.
- Q526 is driven from PLAY OUT OR PAUSE OUT through two diodes. D509 is
  needed only if PAUSE OUT can be high while PLAY OUT is low. That argues
  that U519 DROPS PLAY OUT in pause. (Whether PAUSE from plain PLAY also
  drops PLAY OUT is the same argument; the lamp only shows record-pause.)
- If both hold, then in record-pause: PLAY OUT low -> Q534 off -> PLAY MUTE
  about +5.3V (SYNC/REPRO muted, after the ~0.1 s + ~45 ms ramps of Pass 4);
  capstan solenoid de-energised (its only driver is PLAY OUT, section 4);
  REC OUT high -> Q525 on -> REC SIGNAL 24V through 1k, unless the override
  of section 3 is asserted, and in pause it is not (Q526 on blocks the Q521
  path; the reels are still, so W is low and T is 0).
- The only thing PAUSE does through discrete parts is keep Q526 on, which
  blocks one of the two override triggers (section 3) while paused and for
  roughly 0.5-1.5 s after (C526 10u discharging through R580 47k into the
  base; a rough figure).
- Whether U519 actually does this is inside the H54410P. M3 stays partly open:
  the drawing argues for "PLAY OUT drops, REC OUT holds" but does not show it.


3. M7 - auto-stop and start-up guard
------------------------------------
3.1 Component chain (drawing facts)

(a) Tape sensor PH501 and node N1 (ph501.png, as-left.png, q513-514.png,
n1-dots.png, q515-516.png, p501.png, p505.png, edit.png)
- SHUTT OFF PCB PH501: the phototransistor collector and the LED anode go to
  J507/P507-1 -> supply triangle (3455, 3540). The emitter goes to P507-2.
  The LED cathode goes to P507-3 -> R554 1.5k -> 0V.
- P507-2 -> y 3617 -> dot (3846, 3617): R546 1k to 0V; D506 (anode at 3846,
  cathode at 3922) -> node N1 (dot (3922, 3617), up x 3922 to the dot
  (3922, 3541)).
- N1 is also driven by Q514 (PNP, emitter arrow pointing in): emitter on the
  y 3421 line (supply triangle at (3922, 3370), and west to x 3613, up to
  P505-5); collector = N1. Q514 base: R543 22k to its emitter, R542 22k to
  Q513 collector. Q513 (NPN, emitter 0V): base R540 47k from the x 3588
  vertical, R541 47k to 0V. x 3588 goes up to P505-6.
- EDIT PCB S608: three ganged sections drawn open; the third joins P505-5 to
  P505-6. So S608 closed puts the supply on R540 (Q513 on -> Q514 on -> N1
  forced high) and on R544 (below).
- N1 loads: R547 100k -> Q516 base (C520 0.01 to 0V); R549 100k -> Q517 base
  node (4310, 3617) with C521 22u/10V and R550 100k to 0V. (The C549 vertical
  x 3960 and the R544 vertical x 3994 cross N1 with no dots.)
- Q516 (NPN, emitter 0V) collector -> R548 22k -> x 4175 up to y 3294 ->
  west to x 3509 -> down to y 3860 -> P501-5 "CAP M". (Beyond the scope here:
  Q516 sinks CAP M whenever N1 is high.)
- Q515 (NPN, emitter 0V): base R544 100k from x 3588 (the S608 line), R545
  22k to 0V, C549 10u/50V to 0V. Collector -> y 3345 -> east -> down to the
  Q518 base node, dot (4450, 3457).
- Q517 (NPN, emitter 0V): collector (4378, 3560) has R551 10k to the supply,
  R553 22k to Q519 base, and R552 22k to Q518 base.
- Q518 (NPN, emitter 0V; its base is also sunk by Q515): collector up x 4513
  to y 3237, east to x 5486, up to y 2683, west along y 2680 to the dot
  (5300, 2680) on the x 5300 vertical, which runs up to the dot (5301, 1829)
  on the STOP key net. So Q518 on = the STOP key held down. (y 2680 also goes
  through R715 33 to Q512's collector; not followed.)
- Q519 (NPN, emitter 0V): collector -> y 3525 east to x 4590 -> up to y 3348
  -> east along y 3348 (dot (4924, 3348), down to U516B output pin 7) -> on to
  x 5646 -> up the x 5646 vertical to U512-1 and U513-1. Call this net W.
  R564 3.3k pulls W up; Q519 and the U516B open-collector output both sink
  it.

(b) Reel-pulse missing-pulse detector, U516B (q518-519.png, q527.png,
q531.png, senser.png)
- SENSER PCB PH502 / PH503: phototransistor collectors on J506/P506-2 and
  P506-3. P506-2 -> U517A pin 2 (R584 560 pull-up); P506-3 -> U517B pin 6
  (R591 560 pull-up). U517B output pin 7 -> R595 47k -> Q531.
- Q531 collector -> R581 470 -> C525 0.0056 -> node (7087, 2683): D510 to 0V,
  R582 47k to Q527 base, R583 47k base to 0V. Q527 (NPN, emitter 0V)
  collector -> x 7347 down to y 2780 -> west along y 2780 to x 6472 -> down to
  y 3266 -> west along y 3266 to R703 330 (x 4669) -> U516 pin 6.
- U516 pin 6 (inverting): R560 150k to the supply; C523 1u/50V to 0V; R703
  330 to Q527. Pin 5: R561 27k / R562 47k divider, R563 100k from pin 7.
  Pin 7 = W.

(c) Direction latches U512 / U513 / U514 (u512-514.png, u512-left.png,
x5487.png, x4064.png, u512-bus.png, d522.png)
- U512 pin 13 <- x 5486 (top segment, from y 2126) <- y 2126 <- dot
  (4063, 2125) <- x 4063 <- U519-15 FF OUT. (The same net feeds R529 47k ->
  Q508.)
- U513 pin 12 <- x 5513 <- y 2099 <- dot (4037, 2097) <- x 4037 <- U519-13
  REW OUT. (The same net feeds R532 47k -> Q509.)
- U512-12 = U513-3 (via y 2574); U513-13 = U512-3 (via y 2289).
- Latch 1: U512-3 = NAND(U512-1 = W, U512-2); U512-2 = U512-6 through R538
  100, with C518 0.01 to 0V; U512-4 = U512-3; U512-6 = NAND(U512-3, U512-5);
  U512-5 = U512-11 (call it A).
- Latch 2 is the same with U513, R539, C519, and U513-5 = U513-11 (call it
  B).
- C518 and C519 go to the x 5671 vertical -> the y 2889 wire -> west to the
  x 3663 0V vertical. The x 5486 lower segment and x 5647 cross y 2889 with
  no dots (u512-bus.png).
- U512 (9,10 -> 8) = NAND(U512-6, A). U513 (9,10 -> 8) = NAND(U513-6, B).
- U514 (1,2 -> 3) = NAND(A, U513-8). U514 (5,4 -> 6) = NAND(U512-8, B).
- D522 (anode U514-3, dot (6131, 2560)) and D523 (anode U514-6, dot
  (6157, 2692)): cathodes joined at (6131-6157, 2433). Call this node T. T
  goes east to x 6182, down to y 3321, west to x 5016, down through R565 22k
  to Q520 base. T also goes up x 6131 to y 1680, east to x 6660, through R620
  10k to Q540 base (the brake-solenoid driver, section 4). The anode lines
  x 6131 and x 6157 also continue south below the diodes, turning east at
  (6131, 3998) and (6157, 4134) towards the reel-motor driver area; not
  followed.

(d) The override timer U516A and its two discharge paths (u516.png,
q522-526.png)
- U516 pin 2 = node H (5212, 3528): R569 150k to the supply; C524 4.7u/50V to
  0V; R567 330 to Q520 collector; R568 330 to Q521 collector.
- Pin 3: R570 27k / R571 47k divider, R572 100k from pin 1. Pin 1: R573 3.3k
  pull-up -> x 5460 -> R574 22k -> Q523, R575 22k -> Q522. x 5460 also runs up
  to y 2917 and west to x 4712 -> U507-5 and U509-5 (not followed).
- Q520 (NPN): base R565 from T; emitter to 0V.
- Q521 (NPN): base through D507 (anode on node J) from node J (4977, 3537) =
  R566 22k from W (dot (4924, 3537)). Q526 collector also sits on node J.
- Q522 collector -> x 5671 -> y 3350 -> dot (6103, 3350) -> PLAY OUT net.
  Q523 collector -> node G -> REC OUT net (Pass 4).

3.2 Thresholds and times (computed from drawn values; supply taken as one
rail; Vbe ~0.6V)

- U516A / U516B hysteresis (same resistor values): with the output released
  (pulled up through 3.3k) the non-inverting input sits at 0.687 x supply;
  with the output low, at 0.542 x supply.
- U516B: C523 charges through R560 150k (tau 0.15 s). From empty it crosses
  0.687 after about 0.17 s. Each Q527 pulse dumps C523 through R703 330 (tau
  0.33 ms). Q527 conducts only on the positive edge out of C525 (D510 clamps
  the negative one), so one dump per PH503 cycle. W is released (high) while
  PH503 pulses arrive less than ~0.17 s apart, and is pulled low ~0.17 s after
  the last pulse.
- U516A: C524 charges through R569 150k (tau 0.705 s) and crosses 0.687 after
  about 0.82 s from empty. Either discharge path empties it through 330 ohm
  (tau ~1.6 ms). Once released, the override re-asserts only if C524 is
  pulled below 0.542 x supply, which either path does at once.
- Q517 (tape-sensor filter): base RC C521 22u with R549 / R550 100k (tau ~1.1
  s). Turn-on after N1 rises: ~0.3 s. Turn-off after N1 falls: ~0.3 s (C521
  sits at Vbe while Q517 conducts).
- Q526 hold after PLAY OUT and PAUSE OUT both fall: C526 10u into R580 47k
  (tau 0.47 s); Q526 keeps node J low for very roughly 0.5-1.5 s.
- Q515 (EDIT): R545 / R544 divider gives ~0.9V at the base; C549 10u with
  100k || 22k (tau ~0.18 s) delays it by about 0.2 s.
- Q516 (CAP M): C520 0.01 with 100k, ~1 ms.

3.3 Logic (drawing-derived)

Define: pulses = PH503 edges arriving often enough for U516B (section 3.2);
tape-OK = N1 high (PH501 conducting, or S608 EDIT closed).
- W high only when pulses AND tape-OK (Q519 off AND U516B released).
- Q521 path (Q521 on, C524 dumped) when W high AND Q526 off (PLAY OUT and
  PAUSE OUT both low, and past the C526 hold).
- Q520 path when T high. With W low, the latch outputs are both forced to 1,
  and then T = FF OUT OR REW OUT exactly. With W high, U512 / U513 are set-
  reset latches: FF sets latch 1 (U512-3 = 0), REW sets latch 2 (U513-3 = 0),
  and each latch holds until W goes low. Then T = 1 during FF, during REW,
  and in STOP while the reels coast after either (T = NOT U512-3 OR NOT
  U513-3).
- Override (U516-1 high) = either path active, plus ~0.82 s after both stop.
- Separately: tape-OK low for ~0.3 s turns Q517 off, so Q518 holds the STOP key
  line low (unless Q515 is on), and Q519 holds W low.

3.4 State table

"Override" = U516-1 high: Q522 sinks PLAY OUT, Q523 sinks REC OUT. Its
effect on the card lines: PLAY OUT low -> Q534 off -> PLAY MUTE ~+5.3V
(SYNC/REPRO muted; S607 CUE can still force ~-6.6V); REC OUT low -> Q524 /
Q525 off -> REC SIGNAL open. It also removes PLAY OUT from the capstan
solenoid (Q537/Q538) and the Q539 brake path.

| Condition | W | T | Q526 | Override | STOP key forced (Q518) | PLAY MUTE | REC SIGNAL |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Power-up | C523 empty -> U516B released; W high if tape-OK | latches undefined until W drops | off | asserted: C524 starts empty and Q521 dumps it until U516B times out (0.17 s), then ~0.82 s to release; about 1 s in all | yes until Q517 turns on (~0.3 s), if tape-OK | ~+5.3V | open |
| STOP, reels still, tape-OK | low | 0 | off | released (after the power-up interval) | no | ~+5.3V (PLAY OUT low, Pass 4) | open |
| PLAY, running | high | 0 (latches held at 1 from rest) | on | released | no | ~-6.8V | open |
| RECORD, running | high | 0 | on | released | no | ~-6.8V (if PLAY OUT high, section 4) | 24V through 1k |
| FF or REW | high once reels turn, low before | 1 | off | asserted throughout | no | ~+5.3V (CUE closed: ~-6.6V) | open |
| STOP after FF / REW, reels coasting | high | 1 (latch holds direction) | off | asserted while pulses continue, then ~0.17 s + ~0.82 s | no | ~+5.3V | open |
| PLAY or RECORD pressed while reels coast | high | 1 | PLAY OUT is held low, so D508 cannot charge C526 | asserted; T path does not depend on Q526. PLAY OUT / REC OUT can come up only ~1 s after the reels stop | no | ~+5.3V | open |
| PAUSE (reels still) | low | 0 | on (D509) | released | no | per section 2 | per section 2 |
| Tape sensor dark ~0.3 s (end of tape / no tape), EDIT open | low (Q519) | FF OUT OR REW OUT | - | asserted only if FF/REW OUT high | yes, held continuously; also clears U505 through D537 | per U519's response to STOP | per U519 |
| EDIT (S608 closed) | as above but Q519 always off | as above | as above | as above | never (N1 forced high; Q515 holds Q518 off) | - | - |

Interpretation:
- U516A is a guard that will not let PLAY OUT or REC OUT be high while the
  reels are moving under FF, REW or their coast-down, nor for about 1 s after
  the reels stop or after power-up. Q526 exempts the motion that PLAY (and
  PAUSE) themselves produce.
- PH501 is an auto-stop: if the sensor stops conducting (the drawing does not
  say whether tape blocks or passes the light; normal running needs it
  conducting), Q518 presses STOP after ~0.3 s and keeps it pressed. S608 EDIT
  defeats it and also holds CAP M sunk.
- The latched direction (U514 outputs) also reaches the brake driver (Q540)
  and the reel-motor area, which suggests it sets braking during coast-down.
  That is not traced.
- Whether U519 keeps an internal PLAY / RECORD state while Q522 / Q523 sink its
  outputs, and whether its outputs are made to be sunk, is inside the custom
  chip.


4. M2 - every load on PLAY OUT and REC OUT
------------------------------------------
Drawing facts (u519.png, y1966.png, sol-left.png, sol-right.png,
u502area.png, recout-node.png, u511.png):

PLAY OUT net (U519-12 -> dot (4116, 1063) -> the x 4116 vertical; up to
y 789 / x 4896; down to y 1964 and east along y 1966 with dots at 5907,
6102, 6258 only):
1. U502-12 (punch DATA gate) and U502-5 (punch-in pulse gate) - section 1.
2. x 5908 -> R695 22k -> Q534 (PLAY MUTE) - Pass 4.
3. x 5908 -> y 1148 -> x 6660 -> R618 10k -> Q539. Q539 and Q540 are drawn in
   parallel (collectors on R619 270, emitters on Q541 base with R621 10k to
   0V). Q541 collector -> (6950, 1495) -> y 1597 -> x 7533 -> the lower
   terminal of the BRAKE SOLENOID (7870, 1413). Q540 is driven by T (section
   3) through R620.
4. x 6258 -> D534 -> node (6378, 1383): C544 4.7u in series with R704 10k to
   0V; R705 (printed "3.3k", partly legible) to 0V; R615 10k -> Q537. Q537
   emitter -> Q538 base (R617 10 to 0V). Q538 collector -> x 6607 -> y 1066 ->
   x 7480 -> y 1250 -> the lower terminal of the CAPSTAN SOLENOID (7870, 1252),
   with D515 across the coil. Both solenoids' upper terminals are fed from the
   Q535 / Q536 network (y 1173 / x 7376 / y 1333); not analysed.
5. x 6102 -> dot (6103, 3350) -> D508 -> node K -> Q526 (section 3), and the
   y 3350 line west to Q522's collector (the override sink).

REC OUT net (U519-10 -> dot (4010, 1377) -> x 4010):
1. U501-1 and U501-12 (RECORD / PAUSE lamp gates).
2. y 1432 -> U502 (1,2) inverter (punch DATA) and x 4357 -> R517 / C508 -> Q504
   (U505 PRESET) and -> U503-5 (punch-out gate).
3. y 2040 -> x 5326 -> U511-9 (below) and node G: Q523 collector, R576 47k ->
   Q524 -> R577 -> Q525 -> REC SIGNAL (Pass 4).

Nothing else. In particular: no REC OUT path reaches the capstan solenoid
driver, the brake driver or Q534. The only discrete parts that see both
PLAY OUT and REC OUT are the punch gates (U502) and the override sinks
(Q522 / Q523), and neither combines them into a solenoid or mute drive.

Interpretation (rests on this argument, not on U519): the capstan solenoid
is driven from PLAY OUT and nothing else. A RECORD state with PLAY OUT low
would leave the capstan solenoid off; and on this drawing the brake path from
PLAY OUT would also be off (T is 0 when stationary). Recording onto moving
tape therefore needs PLAY OUT high, so PLAY OUT stays high in RECORD and PLAY
MUTE stays at ~-6.8V while recording. Supporting the same reading: the
punch-in circuit enters record by pressing PLAY and RECORD together, and
punches out with a separate "AR" pulse that leaves PLAY alone. M2 should be
recorded as "resolved by interpretation; measure to confirm".

Side finding (M8 / U7): U501-5's source is U511-8 (x 4192 -> y 1940 -> x 5434
-> U511-8). U511 (9,10 -> 8) = NAND(REC OUT, U515-7). U515 has R716 150k from
its output to pin 6 with C522 4.7u from pin 6 to 0V, and R559 47k positive
feedback onto the R556 / R557 47k divider: drawn as a relaxation oscillator.
So Q501 (RECORD lamp) is on when REC OUT is high AND (REC MODE is low, i.e.
a channel is armed, OR the U515 oscillator is high). Interpretation: the
RECORD lamp is steady when a track is armed and flashes when recording with
none armed. REC MODE reaches only this lamp gate on this sheet; no path from
REC MODE to U519's REC IN was found along the routes followed here.


5. Unknowns
-----------
P1. U519 internal behaviour: whether PAUSE drops PLAY OUT and holds REC OUT
    (section 2 argues yes from D509 and the PAUSE-lamp gate); what "AR"
    (pin 9) does; whether U519 keeps its state while Q522 / Q523 sink its
    outputs. Resolve with a H54410P data sheet, or by measuring U519-10/11/12
    in PAUSE from PLAY, PAUSE from RECORD, and while the override is asserted.
P2. Which way PH501 conducts relative to the tape (blocked or passed light)
    is not drawn. Resolve by measuring P507-2 with tape threaded and without.
P3. Supply rail of the logic triangles (R551, R560, R561, R564, R569, R570,
    R573, PH501 P507-1, P505-5) is not printed; every time in 3.2 assumes one
    5V rail. Measure.
P4. Rough times: Q526 hold (~0.5-1.5 s) and the punch-pulse widths were
    estimated, not computed exactly; the 0.17 s / 0.82 s / 0.3 s figures
    depend on P3. Scope U516 pins 1, 2, 6 and 7 through an FF -> STOP -> PLAY
    sequence.
P5. The latched direction T and the U514-3 / U514-6 lines continue to the
    brake driver Q540 (traced) and to the reel-motor area via (6131, 3998)
    and (6157, 4134) (not followed). U516-1 also drives U507-5 / U509-5, which
    sit in front of Q511 (whose collector reaches the REW key net y 1778) and
    Q512 (R715 33 to the STOP key net); not followed. Resolve with a trace of
    (4300-5500, 2380-3200) and of the reel-motor drivers (6100-7700,
    3850-4300).
P6. R705's designator and value are only partly legible on the scan (read
    "R705 3.3k", uncertain). The C544 / R704 network on the capstan-solenoid
    base feed was not analysed.
P7. S608's FF / REW sections sit in series with the FF and REW key paths
    (P505-1..4); not followed (outside this scope).
