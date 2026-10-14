Pass 6 - Transport sheet: REC MODE (M8 / U7), the RECORD key path (U10), and the "+2V" terminal (U5)

All coordinates are full-resolution pixels (x, y) on the TRANSPORT sheet
(scratchpad/transport/full-1.png). Crops are in scratchpad/pass6/crops-recentry/.
I used scratchpad/pass4/trace_line.py to follow strokes. Every branch it
reported along a route that mattered was checked in a crop for a junction dot
(the crop names are given). Its "dotscore" helper (vrun.py) did not tell real
dots from crossings (a known dot scored 3, the same as plain crossings), so
dots were judged by eye only.

Part numbers (from the parts table, as in Pass 4): U501-U504, U506-U514
SN7400N; U505 SN7474N; U515-U517 uPC393; U519 H54410P.


1. REC MODE (P171-4): every use on the transport sheet
------------------------------------------------------

1.1 Drawing facts

Route, re-checked (crops p501-recmode.png, recmode-y2171.png, x3534-2227.png,
x3534-2718.png, x3534-3294.png, x3534-3618.png, x4172-1378.png,
x4172-2097.png):
- P501-1 "REC MODE" (3290, 3886) -> right to x 3534 -> up x 3534 to the corner
  (3534, 2175) -> right along y ~2173 to x 4168 -> up x 4172 to y 1047 -> R511.
- Along x 3534 the strokes crossing at y 3838, 3810 (the REC SIGNAL line),
  3729 (the R554 line), 3618, 3294, 2718 and 2227 are all plain crossings, with
  no dots.
- Along y 2173 the strokes crossing at x 3586, 3611, 3663 (the thick 0V bus),
  3720 and 3746 are all plain crossings. The verticals at 3586 and 3746 turn
  at y ~2148 / 2125 and run straight through y 2173.
- Along x 4172 the crossings at y 1378 (the REC OUT line from U519-10; its dot
  is at (4016, 1378), not at 4172) and at y 2097/2125 have no dots. The other
  crossings reported on x 4172 (1180-2041) are of the "line both sides" kind.
- This closes U6: REC MODE has no branch between P501-1 and R511.

Node F and what comes after it (crop u501-u511.png):
- R511 100 -> node F (4247, 1047). At node F: R514 4.7k up to a supply
  triangle; C501 0.01 down to the 0V bus (y ~1260); U511 pins 12 and 13.
- U511 (12,13 -> 11) is a NAND with both inputs tied, so it is an inverter.
  U511-11 runs a short way right to U501-2. No other stroke leaves the
  U511-11 to U501-2 wire.
- U501 (1,2 -> 3) is drawn as a NAND (an AND body with an output bubble).
  U501-1 is on the REC OUT net: the vertical at x 4160 drops to a dot on the
  y ~1180 wire, which is fed from x 4010 = U519-10 REC OUT (dot (4016,
  1378)). U501-12 is on the same wire.
- U501 (4,5 -> 6) is drawn as an OR body with a bubble on each input, so it
  is a NAND.
- U501-6 -> R512 10k -> Q501 base. Q501 is NPN (emitter arrow pointing out),
  emitter to the 0V bus at y ~1260, collector up x ~4728 to the wire at
  y ~850. That wire is the P503-2 / R502 4.7k line to D601, the RECORD LED on
  the KEY BOARD PCB. It is also P504-2 through R501 3.9k, i.e. the remote
  jack's RECORD lamp.

The source of U501-5, newly traced (crops u501-u511.png, y1940.png,
x5434.png, u501-5-end.png):
- U501-5 -> left along y ~1129 to x 4192 -> down x 4192 to y 1937. The
  crossings on x 4192 at 1179-1829 are plain.
- At (4194, 1937) it turns right along y ~1940 to x 5435. The crossings at
  x 4619, 4727, 5242 and 5302 are plain (y1940.png).
- It then runs down x 5434 to y 3076 with no dots (x5434.png; the crossing
  at y ~2887 is the thick bus, with no dot).
- (5434, 3076) is U511 pin 8, the output of U511 (9,10 -> 8). That gate is
  drawn as a NAND.
- U511-9 is on the REC OUT net (the x 5327 vertical, as recorded in Pass 4
  section 4).
- U511-10 = U515-7, at node (5303, 3138).

U515 (pins 5, 6, 7; uPC393, open collector) - crop u501-5-end.png:
- Output node (5303, 3138): R558 3.3k up to a supply triangle; R716 150k
  back to pin 6; R559 47k back to pin 5; U511-10.
- Pin 6 node (5182, 3127): R716 150k, and C522 4.7u/50V to the 0V bus
  (y ~3207). Nothing else.
- Pin 5 node (5118-5210, 3150): the junction of R556 47k (to the supply
  triangle) and R557 47k (to 0V), plus R559 47k from the output. Nothing else.
- So U515 has one RC (R716 / C522) feeding pin 6 and resistive positive
  feedback (R559) onto a mid-supply divider at pin 5. No other signal reaches
  either input. The drawing prints no +/- marks. The standard uPC393 pinout
  is pin 5 IN+, pin 6 IN-, pin 7 OUT, and with that pinout this is a
  comparator relaxation oscillator. If the pins were the other way round,
  both feedback paths would be positive and the circuit would latch, which
  makes no sense, so the uPC393 pinout fits.

1.2 Logic of the RECORD lamp (from the drawn gates)

Let R = REC OUT (U519-10), M = the logic level at node F (REC MODE through
R511), and B = U515-7.
- U511-11 = NOT M
- U501-3 = NAND(R, NOT M)
- U501-5 = U511-8 = NAND(R, B)
- U501-6 = NAND(U501-3, U501-5) = (R AND NOT M) OR (R AND B)
         = R AND (NOT M OR B)
- Q501 conducts, and the RECORD LED lights, when U501-6 is high.

| REC OUT | REC MODE line | U501-6 / RECORD lamp |
| --- | --- | --- |
| low | any | off |
| high | pulled to 0V by the amp side (a channel armed) | steadily on |
| high | open, so R514 pulls it to the logic rail (no channel armed) | follows U515-7: flashes |

Oscillator rate, worked out from the drawn values. These assume equal supply
rails at R556 and R558, and ignore the 3.3k pull-up against 150k:
thresholds Vs/3 and 2Vs/3, so each half-period is about
R716 * C522 * ln 2 = 150k * 4.7u * 0.693 = 0.49 s. That gives a period of
about 1 s (about 1 Hz) with a duty cycle near 50%. U515 runs freely all the
time, and its output reaches only U511-10.

1.3 Does REC MODE gate record entry? No, not on this drawing

- REC MODE reaches exactly one device input: U511-12/13. The only thing
  U511-11 drives is U501-2. U501 drives only the Q501 lamp driver. So on the
  transport sheet REC MODE reaches nothing except the RECORD lamp.
- It does not reach U519 REC IN (section 2.1), the RECORD key line, the
  remote or punch inputs, U505, U516 (the override comparator), or REC SIGNAL
  (Q523-Q525).
- U519 (H54410P) is a custom part with no REC MODE pin. Its printed pins are
  PLAY IN, PAUSE IN, FF IN, REW IN, REC IN, STOP IN, MEMORY, AR, PLAY OUT,
  PAUSE OUT, FF OUT, REW OUT, REC OUT and FAST. So the transport logic cannot
  know whether a channel is armed, except through the lamp gate.

1.4 RECORD pressed with no channel armed

Drawing facts:
- Nothing on the transport sheet stops REC IN from being asserted.
- With REC OUT high, REC SIGNAL (P171-5) is sourced at 24V through Q525 /
  R579 1k, exactly as in an armed record (Pass 4 section 4).
- The RECORD lamp flashes at about 1 Hz (1.2).

Interpretation: the transport goes into record mode as usual and drives REC
SIGNAL. On the amplifier side, FUNCTION channel n gets about 24V only when
that channel's switch is ON and REC SIGNAL is high (circuit-analysis.md). So
no channel switches to record and no track is erased or recorded. The
flashing RECORD lamp is the only sign to the operator that nothing is armed.
This rests on the U501/U511 gate symbols as drawn, and on reading REC OUT
high as "recording". The second point has the same footing as Pass 4 U1.

Arming or disarming a channel while REC OUT is high switches the lamp between
steady and flashing straight away. The input has only C501 0.01u with
R511 100 for filtering, a sub-microsecond time constant.


2. The RECORD key path into U519 REC IN
---------------------------------------

2.1 Drawing facts (crops keyboard.png, p503-u519.png, recin-node.png)

- KEY BOARD PCB: S605 "RECORD" is a normally-open push switch between the
  common bar (x ~2470, to KEY BOARD pin 4) and KEY BOARD pin 5 (2810, 1378).
  Each key (S601 PLAY, S602 PAUSE, S603 FF, S604 REW, S605 RECORD, S606 STOP)
  is its own switch to that same common. There is no series contact,
  diode or interlock between keys on the KEY BOARD PCB, and RECORD is not
  wired through PLAY.
- The common, KEY BOARD pin 4 -> J503/P503-4, is a thick line. It joins the
  thick 0V bus (vertical x ~3663) with a dot at (3663, 1515).
- P503-5 (3100, 1378) -> right along y 1378 -> a dot at (3427, 1378). The
  vertical x 3427 runs down from there, see 2.2.
- The line continues -> R509 33 (3490, 1378) -> node (3700, 1378): C506
  2.2/50V down to the thick 0V bus -> U519 pin 7, printed "REC IN"
  (3770, 1378).
- Between R509 and U519-7 the y 1378 wire crosses the verticals at x 3534,
  3557, 3583, 3609 and the thick bus at 3663, all without dots
  (recin-node.png).
- So the REC IN node holds only R509, C506 and U519-7. No pull-up is drawn on
  any key line; the key inputs must be pulled up inside U519. This is
  interpretation: the keys can only pull a line down.
- The other keys are drawn the same way: P503-7 -> R505 33 / C502 2.2u ->
  pin 1 PLAY IN; P503-6 -> R506 / C503 -> pin 6 PAUSE IN; P503-10 -> R510 /
  C507 10/50V -> pin 2 STOP IN.
- FF and REW are the exception. After R507 / R508 they leave on separate
  verticals (x 3531 / 3583) and come back to FF IN / REW IN on other
  verticals (x 3557 / 3609), through the EDIT PCB (2.3).

2.2 Inputs that join the RECORD key line, ahead of R509

- REMOTE CONTROL PCB (crop remote-edit.png, keylines-a.png): the vertical at
  x 3427 runs down to a dot at (3427, 1802) on the P504-5 line. J504/P504
  pins 7, 6, 9, 8, 5 and 10 match the KEY BOARD pins one for one, joined by
  dots at x 3296, 3320, 3374, 3401, 3427 and 3454. P504-4 is the 0V common.
  The remote PCB only passes lines through to the jack J902. Reading across
  the drawn rows, P504-5 (RECORD) is J902-6, P504-7 (PLAY) is J902-1, and the
  common is J902-8. A remote RECORD contact is therefore wired in parallel
  with S605.
- PUNCH IN: Q505 (crop q505-q506.png, d518-down.png, keylines-b.png).
  - Q505 is NPN, emitter to the 0V bus (y ~1305). Its base is fed from U502-8
    through R521 100 + C509 1u/50V (a differentiator), with D517 / R522 22k
    to the 0V bus.
  - Its collector (5694, ~1095) drives two diodes, D518 and D519. Each
    cathode faces the collector.
  - D518 anode -> x 5828 down to y 1804 -> west along y ~1806 to P504-5 at
    x 3081, i.e. onto the RECORD key line. The trace runs the whole way; its
    only junction dot is at (3427, 1802). The other crossings on y 1806 show
    no dots in keylines-a/b.png.
  - D519 anode -> x 5803 down to y 1702 -> west along y ~1700 to P504-7 at
    x 3082, i.e. onto the PLAY key line (dot at (3296, 1700)).
  - So a Q505 pulse pulls the PLAY and RECORD key lines low at the same
    moment, through diodes. Electrically that is the same as pressing PLAY
    and RECORD together.
- PUNCH OUT: Q506 (same crops, ar-pin9.png).
  - Q506 collector -> x 5747 down to y 1723 -> west to (3718, 1725) -> up
    x 3718. It crosses the 0V bus (y 1645) and the PLAY line (y 1700) with
    no dots, and ends at U519 pin 9 "AR" (3740, 1563).
  - So the punch-out pulse goes to AR, not to STOP IN and not to the key
    lines.
  - Pass 4 U10 is now resolved: Q505 feeds PLAY IN + REC IN (through the key
    lines and R505 / R509), and Q506 feeds AR.
- EDIT PCB (crop edit.png): S608 has three ganged sections. Section 3-4 is in
  series with FF (P505-3/-4) and section 2-1 in series with REW (P505-2/-1).
  Both are drawn closed, which is the drawn position. Section 5-6 is drawn
  open and goes to the auto-stop cascade (Pass 4 U8). S608 has no section on
  the RECORD or PLAY lines.

2.3 Gating with PLAY, and interpretation

- No gating is drawn. RECORD, PLAY, the remote jack and the punch Q505 all
  pull their own key lines low on their own, and the only things between a
  key and U519 are 33-ohm resistors and 2.2u capacitors. Whether U519 needs
  PLAY IN together with REC IN to enter record, or accepts REC IN alone, is
  decided inside the H54410P and is not drawn.
- Interpretation, as evidence and not proof: the punch-in circuit pulses PLAY
  and RECORD together through D518 / D519, when one REC IN pulse would have
  done if REC alone were enough. That suggests U519 enters record on PLAY IN +
  REC IN together, and perhaps holds record while REC IN is held as PLAY IN
  arrives. Bench test: press RECORD alone in STOP and watch U519-10. Unknown
  R1.
- RC on each key input: R509 33 with C506 2.2u is about 73 us. That is a
  debounce or noise filter, not a timing element. STOP has a larger C507 10u
  (about 0.33 ms).


3. The "+2V" terminal (PS terminal 41) - U5
-------------------------------------------

3.1 Drawing facts (crops ps-2v.png, r830-r831.png, t41-east.png,
2v-down.png, p502-1.png, 2v-turn2.png, corner6340.png, x6340-low.png,
x6340-3269.png, y1786.png, east1786.png, f-pin.png, counter.png,
f2-dot.png, bus7660.png)

Source:
- The bridge D801~D804 + output feeds node A (y 3577), which is the +6V rail
  (PS terminal 39) with C801 1000u/16V.
- R830 470 (1/2W) runs from node A (dot (1708, 3577)) down to a dot at
  (1708, 3627). R831 33 (1/2W) runs from there to the 0V bus (dot (1708,
  3683)).
- From the dot (1708, 3627) a wire goes left to x 1658 and up x 1658 to
  y 3483. It crosses the node-A wire at (1658, 3577) with no dot. It then
  runs right along y 3483 to PS terminal 41, printed "+2V" (2277, 3483).
- So +2V is the R830 / R831 junction, as Pass 4 said. Nothing else on the
  POWER SUPPLY PCB touches it.

Route to its load:
- Terminal 41 -> right along y 3486 to x 2777. The crossings at x 2412-2691
  are plain.
- Down x 2777 to y ~4250. The crossings at y 3615 (the REC MODE pass-through
  wire), 3643, 3733, 3788, 4056, 4098, 4190 and 4242 show no dots
  (x2777-3615.png checked; the rest were read at 1.75x).
- Right to x 2915, down to J502/P502-1, which is printed "1 2V" on the
  CONTROL PCB side (3390, 4347). The other P502 pins are printed 7 12V,
  6 24V, 3 14V, 4 24V, 2 0V, 5 0V.
- On the CONTROL PCB: P502-1 -> right along y ~4347 to x 6340. The only
  crossings are at x 3507 and 3534, both plain.
- Up x 6340 to y 1786. The crossings at 4244, 4219, 4136, 4001, 3895-3813,
  3269 and 1813 are all plain (x6340-low.png, x6340-3269.png,
  corner6340.png).
- Right along y ~1786 to the COUNTER PCB connector pin printed "F"
  (7880, 1785). On the way it crosses the thick vertical at x ~7685 and the
  vertical at x 7714. The x 7714 vertical turns at (7714, 1812) onto a
  different wire. I read (7714, 1785) as a plain crossing, but it is the
  least certain point on this route: the stroke is slightly thick there.

The other filament pin:
- The COUNTER PCB connector has a second pin printed "F" (7880, 2750), at
  the bottom of the list. The list is F, ZD, S-CLOCK, C-CLOCK, UP/DN, RESET,
  V DIS, POWER RESET, VDD, VSS, ST/SP, SW/COU, MD, F.
- That second F wire has a junction dot (7658, 2750) on the thick vertical
  x 7658. That vertical runs down to y ~4490, then west along y ~4485 to
  P502-2, printed "0V".

So the +2V tap feeds one "F" pin of the COUNTER PCB, and the other "F" pin is
on 0V. The load sits in parallel with R831 33 ohm.

3.2 Interpretation

- A pair of pins named F at either end of a counter connector, fed from a
  low-voltage tap with a matching return, has the form of a display filament
  supply. That would be a fluorescent-display filament on the COUNTER PCB.
  This is inferred from the pin names and the topology only; the COUNTER PCB
  internals are not drawn.
- The drawn values do not give "+2V". With the filament Rf across R831, the
  tap voltage is V6 * (33||Rf) / (470 + 33||Rf). That is at most
  V6 * 33/503 = 0.066 * V6, i.e. about 0.4V at 6V. Reaching 2V would need
  V6 >= 2 + 470 * (2/33) = 30.5V, which C801's 16V rating rules out.
- So one of these must be true: a value is misprinted (for example R830 being
  47, not 470, or R831 being larger), the "+2V" is a label and not an
  operating voltage, or my reading of R830 is wrong. The print reads
  "470(1/2W)" and "33(1/2W)" clearly, at (1730, 3600) and (1640, 3650).
- U5 is narrowed but not closed. What it feeds is now known: COUNTER PCB F,
  returning to 0V. Its value is not.


4. Unknowns
-----------

R1. Whether U519 accepts REC IN on its own or needs PLAY IN as well. The punch
    circuit pulsing both lines through D518 / D519 is evidence for "both";
    the drawing does not settle it. Resolve with H54410P documentation, or
    on the bench: press RECORD alone in STOP and watch U519-10.
R2. U515 pin polarity (no +/- printed). The oscillator reading uses the
    standard uPC393 pinout; the other polarity makes the circuit latch, which
    is implausible. Resolve on the bench: look for about 1 Hz on U515-7
    (around (5303, 3138)), or watch the RECORD lamp in record with no channel
    armed.
R3. The supply triangles at R514, R556 and R558 are unlabelled. They are read
    as the 5V logic rail, as in Pass 4. The 1 Hz figure does not depend on
    the rail, provided R556 and R558 share it.
R4. The +2V value: the drawn R830 / R831 cannot give 2V from a 6V rail
    (3.2). Resolve by measuring PS terminal 41 with the counter connected,
    and reading R830 / R831 on the board.
R5. The crossing at (7714, 1785) on the +2V route to COUNTER F. Read as a
    plain crossing; a higher-resolution scan or a continuity check would
    confirm it.
R6. U1-U3 from Pass 4 (U519 output polarity; PLAY OUT in record and pause)
    still stand. Every "REC OUT high = recording" statement above inherits
    them.

Resolved in this pass:
- M8 / U7: REC MODE drives only the RECORD lamp gate. It does not gate record
  entry.
- U6: the REC MODE route has no branches.
- U10: the punch pulse destinations (Q505 to PLAY IN + REC IN through the key
  lines; Q506 to U519 AR).
- U5: the +2V terminal's destination (COUNTER PCB F) is found; its value is
  still open (R4).
