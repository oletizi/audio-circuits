Pass 4 - FUNCTION PCB, FUNCTION LED PCB, and the source of each channel's FUNCTION line

All coordinates are full-resolution pixels (x, y) on the AMPLIFIER sheet
(scratchpad/amp/full-1.png). Nothing here needed the transport sheet. Crops
are in scratchpad/pass4/crops-function/. Two small line-following helpers
(pass4/hrun.py, pass4/vrun.py) were used to follow long conductors and list
every point where another conductor meets them. Every candidate junction
those helpers reported was then checked by eye in a crop.

Summary
- Each channel's switch is a 3-pole, 2-position (OFF / ON) switch on the
  FUNCTION PCB. The drawing prints only "1ch" ... "8ch" and OFF / ON; it
  gives the switch no other name.
- P174-n / P175-n is NOT fed from the switch alone. It is that channel's pole C,
  which at ON connects it to a bus that every channel shares (J173-3). That bus
  is driven by a PNP high-side switch on the MASTER OSC PCB (Q302), which
  REC SIGNAL (P171-5) turns on through Q301. So FUNCTION goes to about 24V
  only when the channel is ON **and** REC SIGNAL is high. In every other case
  it is open, never driven low.
- REC MODE (P171-4) is not an input to the FUNCTION line. It runs straight to
  J173-4, the bus shared by every channel's pole B. Each channel's switch at ON
  connects that bus to 0V. So the FUNCTION PCB *sinks* REC MODE to 0V when any
  channel is ON (a wired-OR), and leaves it open when all eight are OFF.
- P173-1 is the 24V rail (P171-8) and feeds the ON contacts of the LED poles.
  P173-2 is 0V. It feeds the OFF contacts of the LED poles, the ON contacts of
  the REC MODE poles, and the LED cathodes.
- Each LED shows that channel's switch position (lit at ON). It does not
  depend on REC SIGNAL or REC MODE.

------------------------------------------------------------------------
1. Switch structure (drawing facts)

Eight identical sections, labelled 1ch-8ch in boxes along y ~2045-2060
(1ch box at (2683, 2050), 2ch (2850, 2052), 3ch (3020, 2053), ... 8ch
(3855, 2060)). In each section a dashed actuator line runs down through three
moving contacts, so the three poles are ganged. Labels at the right of the
8ch section (crop ch7-8.png): "OFF" beside the upper fixed contact and "ON"
beside the lower fixed contact of each pole: pole A OFF (3945, 2155) /
ON (3945, 2185); pole B OFF (3945, 2255) / ON (3945, 2282); pole C
OFF (3945, 2365) / ON (3945, 2387).

Drawn position: on every pole, the moving-contact arrow points from the
common contact to the LOWER (ON) fixed contact, with the arrowhead at that
contact (e.g. ch1 pole A common (2683, 2160) -> arrowhead at (2718, 2175)).
The sheet draws the switches in the ON position. *Interpretation:* this
agrees with the card's printed state, which circuit-analysis.md reads as
FUNCTION high.

Channel 1, from the ch1-2.png crop (other channels repeat the pattern, each
about 168 px further right):

Pole A (LED drive), row y ~2160
- Common (2683, 2160) -> R281 4.7k (2620-2650, 2161) -> wire left to x 2555
  -> down to y 2481 -> left to P281-2 / J281-2 at (2319, 2480).
- OFF contact (2718, 2148) -> right to x 2744 -> down to the thick 0V bus,
  dot at (2743, 2225). It crosses the 24V line at (2743, 2199) without a dot.
- ON contact (2718, 2175) -> down to the 24V line at (2719, 2198).

Pole B (REC MODE), row y ~2265
- Common (2680, 2265) -> left to x 2655 -> down to bus B at (2657, 2301).
- ON contact (2715, 2278) -> right to x 2742 -> up to the 0V dot (2743, 2225).
- OFF contact (2715, 2250): no connection drawn.

Pole C (FUNCTION output), row y ~2370
- Common (2678, 2370) -> left to x 2655 -> down to y 2587 -> right along
  y 2587-2597 to J174-1 at (3973, 2596).
- ON contact (2713, 2380) -> right to x 2742 -> up to bus C at (2742, 2332).
  Nothing joins x 2742 between y 2278 and y 2331, so pole B's 0V and bus C
  are separate.
- OFF contact (2713, 2355): no connection drawn.

Shared conductors inside the FUNCTION PCB (followed end to end):
- 24V line, y 2198 -> 2211 (the drawing slopes slightly). The eight pole-A ON
  contacts join it at x 2719, 2886, 3055, 3223, 3390, 3556, 3724 and 3891.
  Printed "24V" at (4300, 2195). It turns down at x 4407 to J173-1 (4405, 2620).
- Thick 0V line, y 2225 -> 2240. Taps at x 2744, 2913, 3083, 3250, 3414, 3583,
  3750 and 3918, each feeding that channel's pole-A OFF contact (above) and
  pole-B ON contact (below). Printed "0V" at (4300, 2215). It turns down at
  x 4383 to J173-2. Its left end turns down at x 2578, and at (2575, 2556) it
  joins the line to P281-1 (2320, 2557).
- Bus B, y 2301 -> 2314. The eight pole-B commons join it at x 2657, 2820,
  2991, 3160, 3325, 3493, 3662 and 3829. It turns down at x 4332 to J173-4.
- Bus C, y 2332 -> 2342. The eight pole-C ON contacts join it at x 2742, 2912,
  3082, 3249, 3413, 3582, 3749 and 3917. It turns down at x 4359 to J173-3.
- Print defect: the 8ch pole-A OFF contact's wire to the 0V tap
  (3893-3918, 2155) is printed broken or dashed (crop ch8-off.png). Taken as a
  degraded print of the same solid wire the other seven channels show.

------------------------------------------------------------------------
2. Per-channel output pin map (pole C common -> connector)

Each pole C common goes down from its section and right to its own pin.
The FUNCTION-side numbers are printed above the circles; the housing numbers
are printed inside the connector shells (crop j174-j175.png):

| Channel | Pole C wire (down, then right) | FUNCTION-side label | Connector pin |
| --- | --- | --- | --- |
| 1 | x 2656 -> y 2588 -> (3973, 2596) | 1 | J174-1 / P174-1 |
| 2 | x 2822 -> y 2562 -> (3996, 2570) | 2 | J174-2 / P174-2 |
| 3 | x 2992 -> y 2538 -> (4023, 2545) | 3 | J174-3 / P174-3 |
| 4 | x 3160 -> y 2514 -> (4048, 2520) | 4 | J174-4 / P174-4 |
| 5 | x 3328 -> y 2489 -> (4150, 2494) | 5 | J175-1 / P175-1 |
| 6 | x 3497 -> y 2462 -> (4175, 2467) | 6 | J175-2 / P175-2 |
| 7 | x 3664 -> y 2438 -> (4201, 2442) | 7 | J175-3 / P175-3 |
| 8 | x 3832 -> y 2413 -> (4227, 2416) | 8 | J175-4 / P175-4 |

On the motherboard side, the labels under P174-3 and P174-4 read "3ch" and
"4ch", and those under P175-1..4 read "5ch 6ch 7ch 8ch" (around y 2710-2740),
each with an arrow leaving the sheet. P174-1 runs down x 3970 to y 3214,
right along y 3214-3228 to x 7106, then up towards the ch1 card. That fits
the established fact that P174-1 reaches J104-3 / J107-7. P174-2 runs down
x 3995 to y 3241 and right along y 3241-3256 to x 7105, then turns down. Where
it goes after that was not followed.

------------------------------------------------------------------------
3. J173 / P173 (drawing facts)

J173-1 to J173-4 (crop j173.png): pin 1 (4405, 2620), 2 (4382), 3 (4357),
4 (4330). The FUNCTION-side frame line also reaches (4475, 2620), to the right
of pin 1. Its role is not established; see Unknowns.

| Pin | FUNCTION PCB side | Motherboard side | Net |
| --- | --- | --- | --- |
| P173-1 | 24V line (pole-A ON contacts) | down x 4402 to a dot at (4402, 3165) on the horizontal at y ~3153-3176. That line also has a dot at (4224, 3165), where the vertical from P171-8 (pin at (4218, 3813)) meets it. It also runs left to P182-3 (corner at (1515, 3153)) and right to x 6760 | 24V (P171-8). Agrees with interface-matrix row J107-2: "P171-8 24V; P173-1; P180-1; P182-3" |
| P173-2 | thick 0V line | down to the thick 0V bus, dot at (4382, 2755) | 0V (matrix: P171-7 0V net includes P173-2) |
| P173-3 | bus C (pole-C ON contacts) | down to y 2777, then left along y 2777 -> 2766 to x 1570, then down x 1568 -> 1562 to P182-1 (1562, 3803). Every meeting point on the way is a crossing without a dot: (4329, 2778), (1568, 2948), (1567, 3152) and (1562, 3692). The last is the REC SIGNAL horizontal; see Unknowns | Master OSC PCB J182-1 |
| P173-4 | bus B (pole-B commons) | a straight vertical, x 4328 -> 4320, from (4328, 2700) to P171-4 at (4320, 3812). It has no dot anywhere (crossings checked at (4329, 2754), (4329, 2778), (4328, 2953) and along strips 2980-3850) | REC MODE (P171-4) |

------------------------------------------------------------------------
4. REC SIGNAL (P171-5) and the switch that drives bus C

Route: P171-5 (4295, 3800) goes up to y 3704, then left along y 3704 -> 3692
(it crosses P171-6 at x 4269 and every other vertical without a dot; crops
p171-5.png, recsig-3600.png, recsig-crossings.png) to x 1538, then down to
P182-2 (1537, 3802). On this sheet REC SIGNAL connects to nothing except P182-2.

MASTER OSC PCB, around (1150-1650, 3800-4520) (crops osc-switch.png,
q301.png, q302.png):
- J182-2 (REC SIGNAL) -> R301 22k (1460-1480, 3985) -> Q301 base node,
  annotated 0.6V at (1395, 3965).
- R302 100k (1340-1370, 3985) runs from the base node to a dot at
  (1310, 3985). That vertical (x 1310) connects to Q301's emitter
  (1375, 4065) and up to the thick node (1405, 3955), which J182-7 and J182-4
  feed. The interface matrix puts P182-4 and P182-7 on the 0V net.
- Q301: NPN (the arrow on the left lead points outward, away from the base).
  Base at the top, emitter on the left to 0V, collector on the right. "0V" is
  printed beside the collector lead at (1425, 4080).
- The Q301 collector goes through R303 47k (1450-1470, 4067) to Q302's base,
  annotated 23.4V at (1480, 4053).
- R304 100k (1495, 4100-4130) runs from Q302's base down to the junction
  (1561, 4150).
- Q302: PNP (the arrow on the lower lead points inward, toward the base).
  Its emitter is the lower lead (1560, 4089) -> junction (1561, 4150) ->
  right to x 1630 -> up to y 3898 -> left to J182-3 (1512, 3847), which is
  the 24V net (P182-3, per section 3).
  Its collector is the upper lead (1560, 4041), annotated 24V at
  (1575, 4030). It runs straight up x 1561 to J182-1. Its crossing with the
  y 3898 line at (1561, 3898) has no dot (crop j182-cross.png).
- No capacitor sits on Q301 or Q302's base or collector: this switch has no
  timing element.

*Interpretation (standard circuit reasoning):* Q301 conducts when REC SIGNAL
drives current into its base through R301 22k (about +0.6V at the base).
R302 holds it off when REC SIGNAL is low or open. When Q301 conducts it pulls
Q302's base down through R303 and Q302 saturates, which puts about 24V on
J182-1 and so on bus C. When Q301 is off, R304 holds Q302 off and bus C is
not driven by anything on this sheet. The printed voltages (0.6V, 0V, 23.4V,
24V) show this switch in its ON state, with REC SIGNAL asserted. That agrees
with the card annotations showing FUNCTION high.

------------------------------------------------------------------------
5. FUNCTION LED PCB (crop led.png, d281.png)

- Eight LEDs, D281 (ch1) to D288 (ch8), at x ~2150. Each LED's triangle points
  left to a bar on the left and has outward arrows, so the anode is on the
  right and the cathode on the left.
- All cathodes join the vertical at x 2082, which runs down to y 2557 and
  right to the J281-1 circle (2208, 2557). P281-1 is 0V (section 1).
- Anodes: D281 -> J281-2 (2480); D282 -> J281-3 (2400); D283 -> J281-4
  (2324); D284 -> J281-5 (2245); D285 -> J282-1 (2165); D286 -> J282-2
  (2095); D287 -> J282-3 (2020); D288 -> J282-4 (1945).
- On the FUNCTION PCB side, R281-R284 reach P281-2..5 through the wires at
  x 2549 / 2524 / 2498 / 2469. R285-R288 reach P282-1..4 through the
  horizontals at y 2020 / 1995 / 1970 / 1945, whose right ends turn down at
  x 3277 / 3443 / 3610 / 3780 towards R285-R288.
- The circles on the vertical at x 2208 are drawn the way this sheet draws
  connector pins (like J174's circles on a line). They are not a common net.

*Interpretation:* when the switch is ON, pole A feeds 24V through 4.7k to the
LED anode, and the cathode is at 0V, so the LED is lit. That is roughly
(24 - Vf) / 4.7k, about 4-5 mA for a typical LED forward voltage (the drawing
prints no forward voltage). When the switch is OFF, pole A ties the anode
through 4.7k to 0V and the LED is dark. The LED shows only the switch
position.

------------------------------------------------------------------------
6. STATE TABLES

6a. Channel n FUNCTION line (P174-1..4 for ch1-4, P175-1..4 for ch5-8)

| Channel switch | REC SIGNAL (P171-5) | REC MODE (P171-4) | P174/P175 pin n | Traced reason |
| --- | --- | --- | --- | --- |
| OFF | any | any | open (not driven) | pole C OFF contact has no connection |
| ON | low or open | any | open (not driven) | pole C connects pin n to bus C, but Q301 is off (R302), so Q302 is off (R304) and the J182-1 collector is not driven |
| ON | high (sourcing through R301 22k) | any | about 24V (Q302 collector, annotated 24V) | Q301 on, then Q302 saturated, 24V -> J182-1 -> P173-3 -> bus C -> pole C -> pin n |

The FUNCTION PCB never actively drives the FUNCTION line low. "Open"
means the card's own input network sets the level. circuit-analysis.md says
K103, bias and the INPUT override all need the line driven high. The card-side
pull-down was not re-traced here.

REC MODE has no part in producing the FUNCTION level. Its column is "any",
and the relationship runs the other way (6b).

6b. REC MODE (P171-4) as driven by the FUNCTION PCB

| Switch positions, all eight channels | REC MODE on the FUNCTION PCB side |
| --- | --- |
| all OFF | open (no pole-B path; the OFF contacts are not connected) |
| any one or more ON | 0V (that channel's pole B joins bus B / J173-4 to 0V) |

Whether REC MODE is pulled up, and to what, is set on the transport /
power-supply side. That is the transport tracer's job.

6c. LED n

| Switch n | LED n |
| --- | --- |
| OFF | off (anode tied through 4.7k to 0V) |
| ON | on (24V through 4.7k) |

*Interpretation of the whole:* each channel's switch is that channel's
record-ready (arm) selector. Arming any channel grounds REC MODE, which tells
the transport / power-supply side that at least one channel is armed. When
that side raises REC SIGNAL (the condition is not traced here), the Master OSC
PCB switches 24V onto bus C. Every armed channel then receives FUNCTION high
at once (K103 to record, bias on, monitor forced to INPUT). Unarmed channels
stay open. Calling the switch "record ready" is an interpretation from this
topology; the drawing does not print that name.

------------------------------------------------------------------------
7. Timing elements

None on the FUNCTION PCB, the FUNCTION LED PCB or the Q301/Q302 switch. There
are no capacitors in any of these paths. The only timing on the FUNCTION line
is on the card (D109 / C119 hold-on, C132 10u bias delay, per
circuit-analysis.md). Any timing in REC SIGNAL or REC MODE would be on the
transport sheet.

------------------------------------------------------------------------
8. Unknowns and open questions

| ID | Question | Location | What would resolve it |
| --- | --- | --- | --- |
| F1 | The REC SIGNAL horizontal crosses the P173-3 vertical, and the crossing ink is slightly heavier than a plain crossing. It is much smaller than this sheet's junction dots, so it is read as a crossing. A junction would short REC SIGNAL to Q302's collector and make Q301/Q302 pointless. | (1562, 3692) | a higher-resolution scan or the alternate scan; continuity check from P182-1 to P182-2 |
| F2 | What drives REC SIGNAL high, and what pull-up (if any) REC MODE has | P171-4 / P171-5, transport sheet | transport-sheet trace of the "To MOTHER PCB" connector |
| F3 | What the card presents on an open FUNCTION line (pull-down value), so that "open" can be stated as a voltage | card J104-3 / J107-7 networks | Pass 3 card trace of the D109 / D115 / D117 input resistors |
| F4 | The line from J173-1's junction right to x 4475 and up | (4405-4475, 2620) up to y ~1915 | crop the FUNCTION PCB's right and top edges. It looks like the board's outline, not a conductor, but this was not confirmed |
| F5 | Where P174-2 (and P174-3/4, P175-1..4) reach the ch2-ch8 cards | P174-2 turns down at (7105, 3256); the rest leave the sheet as "3ch".."8ch" arrows | follow (7105, 3256) down; the other channels are off-sheet by design |
| F6 | Whether the oscillator (U301) itself is gated by REC SIGNAL, or runs continuously and only the FUNCTION supply is switched | MASTER OSC PCB, U301 (1530-1580, 4230-4340) and J182-5/6/8 | trace U301's supply pins. Q302's collector reaches only J182-1 (vrun along x 1561 found no other junction) |
| F7 | The 8ch pole-A OFF wire is printed broken | (3893-3918, 2155) | the alternate scan |
