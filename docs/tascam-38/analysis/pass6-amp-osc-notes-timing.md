Tascam 38 AMPLIFIER sheet - Pass 6: Master OSC PCB, F5, C10, M6 timing

Sheet: AMPLIFIER SCHEMATIC DIAGRAM render
scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res pixels
on that sheet. Crops are in scratchpad/pass6/crops-osc/.
Numerical script: scratchpad/pass6/k103_timing.py (its output is quoted in 4).

========================================================================
1. MASTER OSC PCB  (crops osc-overview.png 1100-1750 x 3750-4600,
   u301.png, j182.png, p182.png, parts-osc.png)
========================================================================

1.1 Drawing facts

Parts table, MASTER OSC PCB column (~2930-3200, 1150-1260; parts-osc.png),
read exactly:
  U301   OSC UNIT
  Q301   2SC1684S
  Q302   2SA564R

U301 is drawn as a plain rectangle (1405-1555, 4230-4340) with four
numbered pin circles and nothing inside except "U301":
  pin 6  top left     (1462, 4228)
  pin 4  top right    (1535, 4228)
  pin 1  bottom left  (1462, 4330)
  pin 3  bottom right (1535, 4330)
There are NO other components on the MASTER OSC PCB besides U301, Q301,
Q302, R301-R304. No resistor, capacitor, inductor, crystal or trimmer is
drawn on or around U301, and no frequency is printed anywhere on the board
outline.

J182 pins (j182.png), x positions at the J182 box (y ~3840):
  8 (1389), 7 (1414), 6 (1440), 5 (1465), 4 (1490), 3 (1515), 2 (1540),
  1 (1565). P182 mates them pin for pin directly above (p182.png).

Every J182 pin, as traced on the board:
- J182-8: down x 1381 to y 3875, left to x 1284, down x 1284 to y 4176,
  right along y 4176 to x 1535, down to U301 pin 4. Its x 1284 vertical
  crosses the y 3897 (J182-6) and y 3922 (J182-5) horizontals without a
  dot. => U301 pin 4 is the oscillator OUTPUT to J182-8.
- J182-7: thick vertical x 1404 down to the thick node dot (1404, 3950),
  where J182-4 (down x 1487, left along y 3950) also arrives. From that
  node left to x 1310 and down to Q301's emitter / R302 (see
  control-function.md section 4). It crosses y 3897 and y 3922 without a
  dot. The interface matrix puts P182-4 and P182-7 on the 0V net.
  Nothing from this 0V node reaches U301.
- J182-6: down x 1432 to y 3897, left to x 1226, down x 1226 to y 4387,
  right along y 4387 to x 1535, up to U301 pin 3. Annotated "15V" at
  (1555, 4380). Interface matrix (VERIFIED rows J105-5, J106-4, J107-3):
  P182-6 is on P171-9 +B(15V).
- J182-5: down x 1457 to y 3922, left to x 1257, down x 1257 to y 4204,
  right along y 4204 to x 1462, down to U301 pin 6. Annotated "-15V" at
  (1395, 4193). On the y 4204 line a junction dot at (1374, 4204) sends a
  branch down x 1374 to y 4360, right to x 1462 and up to U301 pin 1
  (u301.png). So U301 pins 6 AND 1 are both on J182-5. Interface matrix
  (VERIFIED rows J103-5, J105-6, J106-3, J107-4): P182-5 is on P171-10
  -B(-15V).
- J182-3: down x 1511 to y 3897, right to x 1630, down to y 4150, left to
  the junction (1561, 4150): Q302 emitter and R304 bottom. 24V net.
  Crosses J182-2 (x 1537) and J182-1 (x 1561) at y 3897 without dots.
- J182-2: REC SIGNAL -> R301 22k -> Q301 base (control-function.md 4).
- J182-1: Q302 collector, straight up x 1561 (control-function.md 4).

Printed annotations on the MASTER OSC PCB: "0.6V" (Q301 base), "0V"
(Q301 collector), "23.4V" (Q302 base), "24V" (Q302 collector), "-15V"
(U301 pin 6 / pin 1 line), "15V" (U301 pin 3 line). There is NO level or
frequency annotation on the J182-8 / U301 pin 4 line on this board.
The only level for the oscillator output is on the card: J108-4 / U103
pin 3 annotated "AC10V" (interface-matrix row J108-4, VERIFIED to P182-8).

1.2 Topology and frequency

- Drawing fact: the oscillator is a sealed module ("OSC UNIT") drawn as a
  black box with supply, supply, supply and output pins. Its internal
  topology is not shown.
- The oscillation frequency CANNOT be computed from this sheet: no
  frequency-determining component or value is drawn, and no frequency is
  printed. Any figure would be invented.
- Indirect evidence only (computed elsewhere, not a measurement of U301):
  block-record-bias-erase.md computes the card's L105 3mH // C131 390p bias
  trap at about 147 kHz with nominal values. A bias trap is normally tuned
  near the bias frequency, so the bias is probably in that region; this is
  an interpretation from the card, not a property read from U301.
- Resolve from: the TEAC parts list / service manual text for the OSC UNIT,
  or measure J182-8 with a scope (frequency and amplitude; the card side
  says AC10V at U103 pin 3).

1.3 F6 - is the oscillator gated?

Drawing facts:
- U301's three non-output pins go only to J182-5 (-15V, two pins) and
  J182-6 (15V). Both are plain rails off P171-10 / P171-9 on the
  motherboard (interface matrix, VERIFIED).
- Q302's collector reaches only J182-1 (unchanged from control-function.md).
  Q301/Q302 share no net with any U301 pin: the switch uses 0V and 24V,
  and U301 uses only +15V, -15V and its output (it has no 0V or 24V pin).
- No component sits in series with U301's supply on this board.

Interpretation: nothing on the AMPLIFIER sheet gates the oscillator or its
supply. U301 runs whenever +B(15V) and -B(-15V) are present, i.e. whenever
the machine is powered, and its output reaches every card's J108-4 all the
time. Bias on the tape is therefore switched on each card (U103 / Q118 /
Q119 from FUNCTION, per circuit-analysis.md), and REC SIGNAL's only role on
this board is switching 24V onto bus C (J182-1). F6 resolves: the
oscillator is not gated by REC SIGNAL.
Residual unknown: what U301 pin 1 is internally (it is drawn tied to -15V
with pin 6). A continuity check P182-5 to U301 pins 1 and 6 would confirm.

========================================================================
2. F5 - P174-2 to the channel-2 card
   (crops f5-overview.png, f5-x6888.png, f5-x7105.png, f5-strip.png,
   f5-strip6888.png, p174-2-run-a.png, p174-2-run-b.png)
========================================================================

Drawing facts:
- From control-function.md: P174-2 runs down x 3995 to y 3241, then right.
  This pass followed the horizontal from x 3950 to x 6900 (run-a, run-b):
  it steps from y ~3241 to ~3252 near x 4760 and continues right with no
  junction dot until (6888, 3254).
- Dot at (6888, 3254): a vertical starts here and runs down x 6888 to the
  2ch row's P107-7 (6888, ~3810). The vertical crosses every horizontal
  between y 3270 and 3490 without a dot (f5-strip6888.png).
- The vertical directly above at x 6890 is a DIFFERENT conductor: it comes
  down from the ch1 card and ends at the P174-1 line's dot (6890, 3229).
  At 10x (f5-x6888.png) there is clear white paper between y ~3233 and
  ~3250, so the P174-1 and P174-2 lines are not joined there.
- The P174-2 line continues right from (6888, 3254) to (7105, 3255) and
  turns down; the P174-1 line (y 3229) turns UP at (7107, 3229). Neither
  corner touches the x 7081 vertical (no dots; f5-x7105.png).
- x 7105 runs straight down to the 2ch row's P104-3 (~7105, 3810). It
  crosses the horizontals at y ~3330-3490 with no dot (f5-strip.png; the
  dot at (7132, 3325) is on the neighbouring x 7132 vertical, P104-4's).
- The 2ch row (y ~3780-3850, crop 2ch8ch-box.png) is the top edge of the
  box labelled "2ch~8ch REC/PLAY AMPL PCB" (~6020-6400, 4080); its
  connectors are labelled P101/J101, P103/J103, P106/J106, P108/J108,
  P107/J107, P104/J104, P102/J102, P105/J105, the same names as the ch1
  card.

Result: P174-2 reaches the 2ch card's P107-7 / J107-7 (via the dot at
(6888, 3254)) and P104-3 / J104-3 (via x 7105), the same two contacts
P174-1 reaches on the ch1 card. F5 is confirmed for channel 2. P174-3/4
and P175-1..4 leave the sheet as "3ch".."8ch" arrows (unchanged).

========================================================================
3. C10 - what the sheet says differs between channels  (crop notes.png,
   3330-4500 x 1120-1700)
========================================================================

NOTES, read exactly:
  1. ALL RESISTORS ARE 1/4 WATT, 5 %, UNLESS MARKED OTHERWISE. RESISTOR
     VALUES ARE IN OHMS (k = 1,000 OHMS, M = 1,000,000 OHMS).
  2. ALL CAPACITOR VALUES ARE IN MICROFARADS (p = PICOFARADS).
  3. SCHEMATIC DIAGRAM SHOWN FOR ONE CHANNEL EXCEPT FOR SOME OF THE
     COMPONENTS.
  4. [triangle-exclamation sign] PARTS MARKED WITH THIS SIGN ARE SAFETY
     CRITICAL COMPONENTS. THEY MUST ALWAYS BE REPLACED WITH IDENTICAL
     COMPONENTS - REFER TO THE TEAC PARTS LIST AND ENSURE EXACT
     REPLACEMENT.

Search for a per-channel table or per-channel markings:
- The parts table (REC/PLAY AMPL PCB, OUT SELECT PCB, OUT SELECT LED PCB,
  FUNCTION LED PCB, MASTER OSC PCB columns, ~1980-3200 x 1130-1660) lists
  semiconductor types only. It has no per-channel column and no value that
  varies by channel.
- The "2ch~8ch REC/PLAY AMPL PCB" box (4750-8450, 3780-4560) is empty
  except for its connector row and its title (2ch8ch-box.png). No
  component values or exceptions are printed in it.
- No per-channel value list (e.g. "ch1: x / ch2-8: y") was found anywhere
  on the sheet in this pass's sheet overview (sheet.png) or crops.

Result: the sheet does NOT say which components differ between channels
or how. Note 3 is the only statement, and it names no component.
Interpretation (offered, not established): note 3 can be read two ways -
(a) the drawn card is channel 1 and some components on the real cards
differ by channel, or (b) the diagram shows one channel's circuitry
except for some components (the shared boards: FUNCTION, OUT SELECT,
MASTER OSC, IN/OUT, HEAD, MOTHER) that are drawn for all channels. The
sheet itself draws the IN/OUT, HEAD and FUNCTION boards for all eight
channels, which fits reading (b). The wording does not decide it. C10
remains open; resolve from the TEAC parts list (per-channel part numbers)
or by comparing two physical cards.
Note 4's safety-critical triangle appears on the ch1 card drawing (e.g.
near (7550, 960) and (6230, 1170) at overview scale); that marks safety
parts, not channel differences. These marks were not individually read
in this pass.

========================================================================
4. M6 - K103 drive timing (Q120) and Q108 hold-on
   (crops q120.png 6700-6960 x 1780-2280, q108.png 6850-7160 x 1700-1980)
========================================================================

4.1 Re-read of the K103 drive (drawing facts, q120.png)

- D117 (6887, ~2217): triangle apex up, bar on top. Anode below (from
  J107-7), cathode up, to R200.
- R200 39k (6887, 2125-2150), up x 6887 to (6887, 1985), left to the dot
  (6858, 1985) = node X.
- C135 printed "33 / 25V" from node X down to the lower bus (6858, ~2098).
  The curved plate is the lower one (polarity mark: curved plate =
  negative by the usual convention), so + is at node X.
- R201 1.5k from node X left to the dot (6808, 1985) = base node B.
- R199 22k from B down to the bus dot (6806, 2098).
- Q120 base at (6775, 1985), annotated "0.6V"; emitter lower lead (arrow
  outward, NPN) down x 6740 to the bus and on to J107-1; collector annotated
  "0V" at (6750, 1955), up to the K103 coil / D114.
Values and topology agree with block-sync-headswitch.md 4.1. Nothing else
connects to node X or node B.

4.2 Hand arithmetic (computed, not measured)

Assumptions: J107-7 steps from open to its annotated 24V; D117 drop 0.6 V,
so the source is 23.4 V; Q120 base-emitter about 0.6-0.7 V when
conducting.

(a) Before Q120 conducts. Node X sees 23.4 V through R200 39k and a load of
R201 + R199 = 23.5k to 0V.
  Vth = 23.4 x 23.5 / (39 + 23.5) = 8.80 V
  Rth = 39k || 23.5k = 14.66k
  tau1 = 14.66k x 33 uF = 0.484 s
  Vb = Vx x 22 / 23.5 = 0.936 Vx, so Vb = 0.6 V at Vx = 0.641 V and
  Vb = 0.7 V at Vx = 0.748 V.
  t(Vb = 0.6) = 0.484 x ln(8.80 / (8.80 - 0.641)) = 0.484 x 0.0756 = 37 ms
  t(Vb = 0.7) = 0.484 x ln(8.80 / (8.80 - 0.748)) = 0.484 x 0.0888 = 43 ms

(b) Once the base clamps at about 0.7 V, node X has a much lower load:
  final Vx: (23.4 - Vx)/39k = (Vx - 0.7)/1.5k  ->  Vx = 1.54 V
  final Ib = (1.54 - 0.7)/1.5k - 0.7/22k = 0.56 - 0.03 = 0.53 mA
  tau2 = (39k || 1.5k) x 33 uF = 1.444k x 33 uF = 48 ms
  So the base current rises from ~0 to 0.53 mA with tau about 48 ms after
  the threshold. The earlier estimate "on the order of R200 x C135, about
  1.3 s" (block-sync-headswitch.md) is too long: the base clamp means node X
  never charges towards 23.4 V; it stops at about 1.5 V.

(c) Saturation needs hFE x Ib >= coil current. Coil resistance and Q120's
hFE are not on the drawing. For example (assumed) a 1k coil draws
23.9 mA; with hFE 100 that needs Ib 0.24 mA:
  Vx needed = 0.7 + 1.5k x (0.24 + 0.03) mA = 1.10 V
  t = 43 ms + 48 ms x ln((1.54 - 0.75)/(1.54 - 1.10)) = 43 + 28 = ~71 ms

(d) Release after J107-7 goes open (or low): D117 blocks, so R200 carries
no current and C135 discharges only into R201 -> base (and R199).
  While Q120 conducts: Vx - 0.7 = 0.84 x exp(-t / (1.5k x 33u)),
  tau3 = 49.5 ms. For the 1k / hFE 100 example Q120 leaves saturation at
  Vx = 1.10: t = 49.5 x ln(0.84 / 0.40) = 37 ms.
  As the base current falls, Ic falls exponentially with Vbe; once Q120
  is essentially off the remaining charge leaks through R201 + R199 with
  tau = 23.5k x 33u = 0.78 s, but by then the coil current is already
  negligible.

4.3 Numerical check (k103_timing.py; diode-law base, Ib = 0.5 mA at
0.68 V; coil inductance and relay mechanics ignored; pull-in counted at
75 % of steady coil current, release at 25 % and 10 % - these fractions
are generic assumptions, not from the drawing)

  steady on: Vx = 1.523 V, Vb = 0.682 V, Ib = 0.530 mA
  Vb reaches 0.60 V at 38.7 ms, 0.65 V at 56.9 ms after the step

  | hFE | coil R (assumed) | Ic coil | Ic = 75 % | saturated | after drop: leaves sat | Ic < 25 % | Ic < 10 % |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 100 | 1k | 23.9 mA | 60 ms | 70 ms | 38 ms | 102 ms | 141 ms |
  | 100 | 2k | 11.9 mA | 48 ms | 52 ms | 71 ms | 131 ms | 168 ms |
  | 200 | 1k | 23.9 mA | 48 ms | 52 ms | 71 ms | 131 ms | 168 ms |
  | 200 | 2k | 11.9 mA | 42 ms | 44 ms | 102 ms | 159 ms | 195 ms |
  | 400 | 1k | 23.9 mA | 42 ms | 44 ms | 102 ms | 159 ms | 195 ms |
  | 400 | 2k | 11.9 mA | 39 ms | 40 ms | 131 ms | 186 ms | 221 ms |

  Vb falls below 0.5 V about 293 ms after the drop.

Result (computed from part values, M6 remains a scope item):
- K103 pull-in: the coil current builds about 40-70 ms after J107-7 steps
  to 24V (about 37-43 ms of that is the base reaching 0.6-0.7 V), plus
  the relay's own mechanical pull-in and coil L/R time, which the drawing
  does not give.
- K103 hold-on after J107-7 drops: Q120 stays saturated about 40-130 ms
  and the coil current falls below a quarter of its on value about
  100-190 ms after the drop, depending on hFE and coil resistance; plus
  the relay's own release time.
- The C135 network therefore delays K103 by tens of milliseconds and holds
  it by roughly a tenth to a fifth of a second. It is not a
  second-scale delay.

4.4 Q108 hold-on after FUNCTION drops (drawing facts, q108.png)

Re-read: J104-3 (line annotated 24V) -> D109 anode (bottom, apex up at
(7113, ~1905)); D109 cathode -> R139 printed "68" (7113, 1825-1850, no
"k") -> up to (7113, 1800) -> left to dot N (7037, 1800). C119 2.2/50V
from N down to the emitter line (y ~1903). R138 68k from N left to the
base dot (6960, 1800). R137 47k from that dot down to dot (6959, 1903),
the emitter line. Q108 NPN, base annotated "0.6V". Matches
block-control-muting.md.

Collector load (from block-control-muting.md): R136 27k from Q109's base,
so Ic is at most about 24/27k = 0.9 mA. Assumed hFE 100 -> Ib needed
about 9 uA; call it 10 uA.

On state, source 23.4 V (24V minus D109):
- R139 = 68 ohm: C119 charges to about 23.4 V almost at once
  (68 x 2.2 uF = 0.15 ms).
- R139 = 68k: N settles where (23.4 - Vn)/68k = (Vn - 0.6)/68k + 0
  -> Vn = 12.0 V (the 47k/base takes the rest). Charging Thevenin:
  23.4 x 115/183 = 14.7 V through 68k || 115k = 42.7k, tau = 94 ms;
  base reaches 0.6 V when Vn = 1.47 V: t = 94 ms x ln(14.7/13.23) =
  10 ms turn-on delay.

Discharge after J104-3 drops (D109 blocks): N discharges through R138
into the base, R137 taking 0.6 V / 47k = 12.8 uA.
  tau = R138 x C119 = 68k x 2.2 uF = 0.150 s (base clamped at 0.6 V)
  Q108 stays saturated while (Vn - 0.6)/68k - 12.8 uA >= 10 uA
  -> Vn >= 0.6 + 68k x 22.8 uA = 2.15 V
  Q108 turns fully off when its base current reaches zero:
  Vn = 0.6 x (68 + 47)/47 = 1.47 V

  | R139 | C119 start | saturated until | fully off at |
  | --- | --- | --- | --- |
  | 68 ohm | 23.4 V | 0.150 x ln(22.8/1.55) = 0.40 s | 0.150 x ln(22.8/0.87) = 0.49 s |
  | 68k | 12.0 V | 0.150 x ln(11.4/1.55) = 0.30 s | 0.150 x ln(11.4/0.87) = 0.39 s |

Result: Q108 holds on about 0.4-0.5 s after FUNCTION drops if R139 is
68 ohm, or about 0.3-0.4 s if it is 68k (with a ~10 ms turn-on delay in
the 68k case). This agrees with the existing ~0.5 s figure for the 68 ohm
reading. A7 (which reading is right) remains open.

Comparison (interpretation): after a punch-out, K103 releases within
about 0.1-0.2 s, while Q108 keeps the INPUT override / SYNC clamp on for
0.3-0.5 s. So the head is switched back before the monitor override ends.

========================================================================
5. Unknowns
========================================================================

| ID | Question | Location | What would resolve it |
| --- | --- | --- | --- |
| O1 | Bias oscillator frequency and output amplitude at J182-8 | U301 "OSC UNIT", pin 4 (1535, 4228) | TEAC parts list / service text for the OSC UNIT; scope J182-8 |
| O2 | What U301 pin 1 is internally (drawn tied to -15V with pin 6) | dot (1374, 4204) | continuity P182-5 to U301 pins 1 and 6 |
| O3 | Q302 part number reads "2SA564R"; earlier docs list Q302 only as PNP | parts-osc.png (~3090, 1240) | none needed unless the print is disputed |
| C10 | Which components differ between channels | NOTES 3 (~3360, 1435) | TEAC parts list; compare two physical cards |
| M6a | K103 coil resistance, Q120 hFE, relay pull-in / drop-out current and mechanical times | K103 coil (6576, ~1900) | relay datasheet or measurement; then rerun k103_timing.py |
| M6b | K103 pull-in / release times as measured | J107-7 and Q120 collector | scope at punch in / out |
| A7 | R139 68 ohm or 68k | (7113, 1840) | physical part or parts list |
