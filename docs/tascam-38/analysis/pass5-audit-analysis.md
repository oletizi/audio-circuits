Pass 5 audit of docs/tascam-38/circuit-analysis.md
===================================================

Auditor: independent; did not write the document under audit.
Inputs: circuit-analysis.md, analysis/block-*.md, analysis/control-*.md,
interface-matrix.csv, and the two sheet renders. All coordinates are full-res
pixels (x, y). Crops are in scratchpad/pass5/crops-analysis/ (names given per
check). Nothing in the repository was edited.

Summary: the traced topology the mode table rests on held up on the drawing.
All 25 spot checks came out CONFIRMED, or CONFIRMED with a caveat; one came
out CANNOT TELL, and it was already an open item (M4). The problems are in
the reasoning built on top of the trace, and in a few unqualified statements:

- The relay-drawn-state argument leaves out K102, which counts against it.
- One row of the mode table is wrong.
- Several state combinations are missing from the mode table.
- Several statements are stated more strongly than their reports allow.

Findings are ranked, most serious first.

---------------------------------------------------------------------------
PART A - FINDINGS (ranked)
---------------------------------------------------------------------------

A-1 (serious) The relay-drawn-state argument leaves out the counter-evidence from K102

Text at fault (Relay drawn state):
  "*Interpretation:* the sheet draws K101 and K103 in their **energised**
  positions, matching its printed operating state (SYNC pressed, channel in
  record)."

Problem: the same printed state has P180-3 = 24V on the K102 coil top
(annotation "24V" at ~(7225, 945)). OUT SELECT shows Q201/Q202 on (Q202
collector 24V). In any settled state POWER MUTE sinks (control-transport.md
section 1). So in the printed state the K102 coil is energised, yet K102 is
drawn OPEN (crop k102.png: the blade ends at (7210, 1098), clear of the fixed
stub at (7215-7240, 1112)). If the sheet drew relays "in the printed operating
state", K102 would be drawn closed. So the sheet draws at least one relay in
its de-energised position while its annotations show the coil driven. That is
the opposite of the convention the document infers for K101 and K103.

A3 is a second sign that the annotations are not one coherent snapshot: Q118
base is printed -14.4V, which means bias off, while AC65V, FUNCTION 24V and
Q120 on are also printed. The "single printed operating state" premise
therefore needs a caveat.

The conclusion may still be right. The functional-coherence argument is
strong and is not made here: if K101 and K103 were drawn de-energised, then
FUNCTION high would put the head on the sync line while bias is on, and SYNC
pressed would feed the reproduce head into the Q106 SYNC path. That argument
is the real support. The "matches the printed state" argument is weakened by
K102.

The mode table's Monitor column (every "sync head" and "repro head" entry,
and the "K101 released selects the reproduce head" reading) depends on A1.
The table does not say so.

Suggested correction: add to Relay drawn state:
  "Against this, K102 is drawn open although the same annotations put 24V on
  its coil top and POWER MUTE sinks in every settled state, so the sheet does
  not use one convention for all three relays (or the annotations are not one
  snapshot; see also A3). The case for 'drawn energised' rests on functional
  coherence: the other reading would put bias on a head connected to the
  pickup line, and route the repro head into the SYNC path."
Then add a note under the Operating modes table: "Head identities in the
Monitor column assume A1 (drawn = energised for K101 and K103)."

A-2 (serious) The "none" row of the mode table is wrong for an armed channel in RECORD

Text at fault (Operating modes):
  "| any | any | none | released | per transport | none | - | open | silent |"

Problem: with no button pressed, P180-4 is 24V (OUT SELECT table: "none ...
P180-4 24V"). In RECORD, an armed channel has FUNCTION high, so Q108 turns on
and Q109 sources node X from P180-4, which turns Q110 (INPUT) on. That is
exactly the mechanism the document gives in the control table row for J104-3.
So "Source on" is Q110, not "none", in that case. The monitor is still silent
because K102 is open. The meter is silent for the same reason (it is fed
after K102).

Suggested correction: split the row:
  "| any except RECORD+armed | any | none | released | per transport | none |
  - | open | silent |" and
  "| RECORD | yes | none | released | energised, on | Q110 (Q109 override;
  P180-4 is live) | passes (M2) | open | silent |".

A-3 (serious) State combinations missing from the mode table

The table assumes exactly one OUT SELECT button at a time, latching switches,
and no PAUSE or auto-stop. None of these is established (M3, M5, M7), and the
table does not state the assumption. Combinations that follow from the traced
topology and are not covered:

- REPRO + SYNC held together (no interlock is drawn, control-outselect.md
  section 2). Q203 is driven from SYNC node A, which does not depend on
  P180-4, so K101 is still energised (the sync line feeds the preamp). P180-4
  is open, so P181-2 is unpowered, Q106 and Q103 are off, and Q105 and Q101
  are on. Result: sync-head signal through the REPRO level trim and the REPRO
  EQ branch. In RECORD with the channel armed, the preamp input is open
  (K103 energised), so the monitor is silent apart from bias pickup.
- INPUT + SYNC held together: Q110 and Q106 are both on, so the two sources
  are summed at the select node (6543, 1109). K101 is energised.
- INPUT + REPRO held together: P180-4 is open, so P181-1 is unpowered and
  Q109 has no supply. INPUT is off even on an armed channel in RECORD. Q105
  and Q101 are on, and K101 is released, so the monitor is the reproduce
  head.
- PAUSE (M3), and the auto-stop override that forces PLAY OUT and REC OUT
  low (M7). With PLAY OUT low, PLAY MUTE mutes SYNC and REPRO and REC SIGNAL
  is open. That is a reachable state the table does not show.
- Momentary switches (M5): if the buttons are momentary, the whole OUT SELECT
  table holds only while a button is held.

Suggested correction: add a sentence above the table: "Assumes latching OUT
SELECT switches with one pressed at a time (M5), and no PAUSE (M3) or
auto-stop (M7)." Add rows for PAUSE and auto-stop marked "unknown". Add a
short "multiple buttons" note with the REPRO+SYNC and INPUT+SYNC outcomes
above.

A-4 (moderate, overclaim) REC MODE described as only gating the RECORD lamp

Text at fault (Control sources, REC MODE row):
  "The transport uses it only to gate the RECORD lamp"

control-transport.md U7 says the opposite: "whether it also gates U519 REC IN
(record interlock). U501-5's source ... was not traced." The report
establishes one use. It does not establish that this is the only use.

Suggested correction: "On the transport sheet it is traced only as far as the
RECORD-lamp gate (U501); whether it also gates record entry is not traced
(control-transport.md U7)." Add this as an open item.

A-5 (moderate, overclaim) The PLAY MUTE and REC SIGNAL levels in the control-sources table rest on unresolved items, and the table does not flag them

Text at fault:
  "-6.8V (passes) in PLAY, RECORD, punch and with CUE closed; +5.3V (mutes
  SYNC / REPRO) in STOP and FF / REW"
  "24V in RECORD and after punch-in; open in STOP, PLAY, FF / REW and after
  punch-out"

- "RECORD -> -6.8V" is M2, unresolved. The mode table marks "(M2)" but this
  table states it as fact.
- Every level here assumes "PLAY OUT / REC OUT high = active" (M1).
- REC SIGNAL is also forced open while the auto-stop override is asserted
  (M7).
- With CUE closed the report computes ~-6.6V, not -6.8V. That is minor.

Suggested correction: append "(M1)" to both rows, change "RECORD" to "RECORD
(M2)" in the PLAY MUTE row, and add "and whenever the U516A override is
asserted (M7)" to the REC SIGNAL open list.

A-6 (moderate, contradiction with a report) W109 / W110 / W112 described as "fitted"

Text at fault (Open items A8):
  "W119 drawn faint and broken (fitted or not); W109 / W110 / W112 fitted"

block-reproduce-output.md U6: "Whether they are fitted on a given card cannot
be read from the schematic." The drawing shows a link drawn between the pads.
It does not show what is fitted.

Suggested correction: "W109 / W110 / W112 drawn linked; whether fitted is a
physical-board question."

A-7 (moderate, overclaim and incomplete) Bias enable stated as fact; A3 explained by speculation

Text at fault:
  Bias and erase: "J107-7 high enables bias." (no interpretation marker)
  A3: "Probably measured in different modes; confirm by measurement"

- The polarity chain (D115, Q118 and Q119 as NPN, Q119 returning U103 pin 2
  to -B) is traced. Calling that "enables bias" depends on what pin 2 does
  inside U103, and that is unknown (A4). block-record-bias-erase.md marks the
  enable role as interpretation. The summary should too.
- The drawing check (crop q118-q119.png) shows the "-14.4V" text at
  ~(6440-6480, 2445), directly on the Q118 base / R194 / N2 wire. The
  placement is not ambiguous, so A3 is a real conflict. "Probably measured in
  different modes" is one hypothesis among at least two. The other: -14.4V
  is -15V + one Vbe, which is the value Q119's base would show with Q119
  conducting. A drafting slip that attached Q119's base level to the Q118
  wire would explain the annotation equally well. Neither reading should be
  called probable.

Suggested correction: "*Interpretation:* J107-7 high returns U103 pin 2 to -B
through Q119, read as enabling the bias amplifier (U103 internals unknown,
A4)." In A3, replace "Probably measured in different modes" with "Either the
annotations come from different modes or a value is misplaced (-14.4V is
what Q119's base would read when on); not decidable from the sheet."

A-8 (moderate, overclaim) The status line says the passes are complete "to the limit of the two sheets"

Text at fault:
  "Pass 3 (functional blocks) and Pass 4 (operating modes) complete to the
  limit of the two sheets."

Several items on these two sheets were traceable but are recorded as not
traced: M3 (PAUSE logic), M7 (U516 / U512-U514 chain, "only partly traced"),
control-transport U7 (U501-5 source) and U10 (punch-pulse destinations),
control-function F5 (P174-2 down from (7105, 3256)) and F6 (U301 supply
gating). These are limits of the trace, not of the sheets.

Suggested correction: "Pass 3 and Pass 4 complete except for the items listed
under Open items, several of which (M3, M7) could still be traced further on
these sheets."

A-9 (moderate, stale or wrong wording) The FUNCTION interpretation paragraph

Text at fault:
  "so one FUNCTION line per channel switches the head to record drive, turns
  on bias and erase, and forces the monitor to INPUT. ... Pass 4 must confirm
  it against the FUNCTION and transport circuitry."

- "forces the monitor to INPUT" is not unconditional. The document's own mode
  table (RECORD / yes / REPRO row) and its OUT SELECT paragraph say REPRO
  removes P180-4 and with it the Q109 override.
- "Pass 4 must confirm" is stale. Pass 4 is reported complete, and the
  Control sources section now confirms that FUNCTION = switch ON and REC
  SIGNAL.

Suggested correction: "...and, unless REPRO is selected, forces the monitor to
INPUT. Pass 4 confirms that FUNCTION is high only when the channel switch is ON
and REC SIGNAL is high (Control sources)."

A-10 (moderate) Timing: the K103 drive delay is omitted, and the transitions imply an ordering that has not been established

Text at fault (Transitions):
  "K103 pulls in; U103 bias comes on after the C132 delay (about 0.15 s)"
  M6: "All delays (POWER MUTE ~1.8 s, K102 ~0.5 s, bias ~0.15 s, PLAY MUTE
  ~0.1 s)"

- Q120's base network has C135 33u charged through R200 39k.
  block-sync-headswitch.md section 6 gives "on the order of ... about 1.3 s"
  for it. The summary leaves this element out entirely, and so the
  pull-in/release order of K103 against bias is not established.
- The report's 1.3 s figure is itself doubtful. It is R200 x C135. But Q120
  needs C135 to reach only about 0.7V of a 23V drive. A rough estimate is
  tens of ms to pull in, and roughly 0.1 s held on after FUNCTION drops,
  while C135 discharges through R201 into the base. This should be
  recomputed or marked unknown.
- Also missing from M6: the Q108 hold-on. C119 2.2u discharges through R138
  68k into the base. A rough estimate is about 0.5 s if R139 is 68 ohm (A7).
  This is the time the INPUT override outlasts record. Also missing: the
  K101 pull-in (C208, about 0.1 s) and C850 (about 45 ms on PLAY MUTE).
- "Bias comes on after the C132 delay" describes a ramp as a step. Q119
  begins to conduct part-way up the N2 ramp.

Suggested correction: add "K103 drive: C135 33u / R200 39k / R201 / R199
slows Q120; pull-in and release times not computed" to the punch transitions
and to M6. Add the Q108 hold (C119 / R138 / R137) and C208 to M6. Say "bias
ramps on over roughly 0.15 s".

A-11 (minor) The bias-injection bullet omits its dependence on W132

Text: "AC65V node through the C134 100p trimmer onto the head-side lead"
C134 connects to U103 pin 4. It reaches the AC65V node (pin 5) only through
W132 (crop c134-u103.png: C134's right end is at the W132 upper pad / pin 4).
block-sync-headswitch.md U6 and block-record-bias-erase.md U8 record this.
Suggested correction: "...through C134 to pin 4, which W132 (drawn linked)
joins to the AC65V node...".

A-12 (minor) The POWER MUTE delay is quoted without its assumption

Text: "sinks current about 1.8 s after power-on"; "Power-up, first ~1.8 s".
control-transport.md computes 1.8 s for V6 = 6V exactly. Its U5 doubts the
true rail voltage (the "+2V" tap reads ~0.4V on a 6V rail). A higher rail
gives a shorter delay.
Suggested correction: "about 1.8 s if the unregulated rail is 6V (M6,
control-transport U5)". "Releases quickly" should be "within about 0.5-1 s
(computed)", per the same report.

A-13 (minor) Wrong board for the PLAY MUTE divider

Text: "Q534 NPN on the CONTROL PCB from U519 'PLAY OUT', divider R827 / R828
to -15V"
R827 and R828 are on the POWER SUPPLY PCB (control-transport.md section 2:
"level-shifted on POWER SUPPLY PCB"; crop region (2190-2280, 3220-3430),
transport sheet).
Suggested correction: "...Q534 NPN on the CONTROL PCB; level-shifted by
R827 / R828 to -15V on the POWER SUPPLY PCB".

A-14 (minor) The trap is described as if it were in series

Text: "K101's moving contact feeds L101 1.2mH / C101 // C136 470p, then TR101"
L101 with C101 // C136 is a series-LC shunt from the K101 pole to the bus,
not an element in series with the signal path (block-reproduce-output.md 3a
item 3; crop k101.png shows L101 hanging down from the dot (5395, 1159)).
Suggested correction: "K101's moving contact feeds TR101 pin 1, with an
L101 1.2mH + (C101 // C136 470p) trap from that node to the bus...".

A-15 (minor) "C134 sets bias" is stated as fact

This is interpretation in both reports. The drawing shows only a 100p
trimmer in series with the bias path.
Suggested correction: "*Interpretation:* C134 is the bias-level adjustment."

A-16 (minor, in a report, not in the summary) Wrong coordinates for the PLAY MUTE line

block-control-muting.md gives the D119 cathode line at "y ~1488" with the
-6.8V label at (6060, 1480). On the drawing (crop q107.png) the D119 cathode
vertical x 6100 turns right at y ~1438, and the "-6.8V" text sits at
~(6060, 1425). block-sync-headswitch.md has it right ((6100, 1438)). The
summary does not cite the coordinate, so this is a correction to the report
only.

A-17 (note) "Every change of selection opens K102 briefly"

This depends on M5 (latching switches, mutually exclusive by some unseen
mechanism). With no interlock, pressing a second button without releasing
the first does not drop K102 at all: Q201 stays fed through the OR from the
still-pressed section. Add "(assuming one button at a time, M5)".

---------------------------------------------------------------------------
PART B - DRAWING SPOT CHECKS
---------------------------------------------------------------------------

Sheet = amp unless stated. Crop names are under scratchpad/pass5/crops-analysis/.

1. Claim: K102 coil top = J102-4 (P180-3), bottom = J102-3 (POWER MUTE); D120
   cathode on the top line.
   Looked: k102.png (7050-7450, 920-1160); j102-pins.png (7250-7500,
   1100-1800); j102-conn.png (7150-7550, 2500-3000).
   CONFIRMED. D120 is drawn apex up with its bar at the top line (y ~960,
   "24V"). The top line runs right to x ~7393 and the bottom line to x ~7366.
   Both verticals cross y 1112 with no dot. They enter J102 at pins 4 and 3
   respectively: the order is preserved and the scan offset is about 11 px.
   So coil current needs J102-4 > J102-3, which means POWER MUTE must sink.

2. Claim: K102 is drawn open.
   Looked: k102.png. CONFIRMED. The blade is anchored at the C106 side and
   its tip is at ~(7210, 1098), clear of the right-hand stub. This is the
   basis of finding A-1.

3. Claim: the meter is fed after K102 (J102-5 to J105-1 U-link).
   Looked: k102.png; j102-conn.png; ulink.png (7380-7800, 2620-2900).
   CONFIRMED. J102-2 and J102-5 hang from dots right of the K102 contact
   ((7258, 1112), (7336, 1112)). P102-5 drops to y ~2840 and runs right to
   pin 1 of the next connector (x ~7715), whose card-side wire rises. The
   connector's identity as J105 is taken from the VERIFIED matrix row.

4. Claim: K101 coil top is J101-2 (24V); D101 has its cathode at the top.
   Looked: k101.png (5180-5480, 960-1200). CONFIRMED. "24V" is on the top
   line, and D101 is apex up with its bar at the top.

5. Claim: K101 is drawn on the sync-line contact; the J101-4 contact is open.
   Looked: k101.png. CONFIRMED. The blade runs from pivot (5338, 1159) to
   the upper hook (~5310, 1150). The upper contact runs left to x 5219 and
   down, crossing the lower contact line at (5219, 1172) with no dot. The
   lower contact (5285, 1172) is open.

6. Claim: K101 is driven only in SYNC; Q204 sources P180-2.
   Looked: outsel-drivers.png (2400-3150, 3850-4520). CONFIRMED.
   - The Q204 collector (2910, 4100) runs up x 2910 to y ~3907, then left to
     J180-2.
   - The Q204 emitter is on the x 3103 / y 4057 line to J180-1 (dot (2535,
     4057)).
   - The emitter arrow points toward the base, so Q204 is PNP.
   - Q203 is NPN, with R263 to the Q204 base.

7. Claim: Q203's only drive is SYNC node A.
   Looked: outsel-drivers.png and outsel-switches.png (1800-2560, 3850-4520).
   CONFIRMED. R260 hangs from x 2805, which rises to the junction (2805, 4005)
   on the y 4003 line. That line runs left and drops at x 2118 to SYNC node A
   (2118-2198, 4096; "24V"). The INPUT and REPRO node A's do not reach it.

8. Claim: K102 drive is Q202 from any button through the D204-D206 OR.
   Looked: outsel-drivers.png. CONFIRMED.
   - The Q202 collector (2678, 4218) runs to x 2587, up to y 3928, then left
     to J180-3.
   - The Q201 base takes the y ~4333 OR line. Its crossing of the thick 0V
     riser at (2560, 4333) shows no dot (consistent with U2 there).

9. Claim: the REPRO lower pole feeds P180-4 at OFF and P181-3 at ON; P180-4
   supplies the INPUT and SYNC lower commons.
   Looked: outsel-switches.png. CONFIRMED.
   - The REPRO lower common loops down to y ~4431 and right to the J180-1
     vertical.
   - The OFF contact goes up to the y ~4357 line. That line runs left over
     C206 to the SYNC lower common ("24V") and the INPUT lower common, and
     right and up to J180-4.
   - The ON contact goes down to y ~4485 and then to J181-3.

10. Claim: INPUT and SYNC lower poles feed P181-1 and P181-2; SYNC is drawn
    pressed and INPUT and REPRO released.
    Looked: outsel-switches.png. CONFIRMED.
    - The SYNC lower blade is on its lower contact, which goes to (2235, 4460)
      and on to J181-2. The INPUT lower blade is on an unwired contact.
    - The upper poles: INPUT and REPRO node A's are on contacts to 0V; SYNC
      node A is on the 24V line.
    - C205 and R269 are drawn dashed, as reported.

11. Claim: Q107 is an N-JFET shunt, and D119's anode is at the gate.
    Looked: q107.png (5980-6180, 1080-1520). CONFIRMED.
    - The gate arrow points into the channel. The upper terminal goes to
      (6028, 1110) and the lower to the bus dot (6028, 1362).
    - D119 is triangle-down with its bar below: anode at the gate.
    - The cathode line crosses the bus at (6100, 1362) with no dot and turns
      at y ~1438 under "-6.8V". (The y coordinate differs from
      block-control-muting; see A-16.)
    - So PLAY MUTE negative means D119 conducts and Q107 is off (passes);
      PLAY MUTE high or open leaves the gate floating and Q107 on.

12. Claim: Q105 gate drive is R126 from J103-6, R125 to -15V, and D106
    triangle-down.
    Looked: srcgates.png (6280-6720, 1080-1720). CONFIRMED. The node (6598,
    1490) is labelled "-15V" and carries R126 82k (going left), R125 100k and
    C143 to the y ~1676 rail. D106's anode is at the gate. The left end of
    R126 and its route to J103-6 were not followed; that rests on the matrix.

13. Claim: Q106 gate drive is R132 from node S, R135 from J104-5, and D108
    from node S to the Q108 collector.
    Looked: srcgates.png; q108-q109.png (6680-7200, 1440-1980). CONFIRMED.
    - D107 is triangle-down. The node (6470, 1595) is "-5.8V", with R131,
      C142, and R132 68k going right.
    - The "0.6V" line drops at x 6795 to node S (6795, 1750).
    - D108 points right: anode at S, cathode at the Q108 collector ("0V").
    - R135 18k runs from S down to the "24V" line at y ~1928.

14. Claim: Q110 gate drive is from Q109 or from P181-1 (through D118 and
    R204).
    Looked: srcgates.png; q108-q109.png. CONFIRMED.
    - D112 is triangle-down. The node (6338, 1543) is "20.6V", with R158 and
      C141 to -15V and R159 10k right to the dot (6702, 1545).
    - D118 points left (bar at ~6820), so its anode is on the right-hand line
      to x ~7170 and down; its cathode is at R204.
    - The Q109 collector is on the (6702, 1545) line.

15. Claim: Q109 is PNP with its emitter from J104-2 (P180-4).
    Looked: q108-q109.png. CONFIRMED.
    - The emitter arrow points inward. The emitter goes right to (6953, 1545),
      down to the dot (6953, 1618), then right along y 1618 to x ~7093 and
      down. That end point (J104-2) rests on the matrix.
    - The base dot (6873, 1618) carries R133 to the emitter and R136 27k down
      to the Q108 collector.
    - Printed values: emitter 24V, base 23.4V, collector 24V.

16. Claim: Q108 is driven from J104-3 through D109 / R139 / C119 / R138.
    Looked: q108-q109.png; d109-anode.png (6980-7220, 1880-2060). CONFIRMED.
    - Q108 is NPN (arrow out), with R137 47k from base to emitter and R138
      68k to the C119 node (7039, 1800).
    - R139 is printed "68" with no multiplier (A7 stands).
    - D109 is apex up: cathode toward R139, anode below.
    - The D109 anode vertical (x ~7115) crosses the J104-5 "24V" line
      (y ~1930) with NO dot. The "24V" leader points at the D109 vertical. So
      Q108 is fed from the FUNCTION line, not from SYNC.

17. Claim: K103 is driven by Q120 from J107-7; D114 and D117 polarities; K103
    is energised when J107-7 is high.
    Looked: q120.png (6520-6940, 1780-2440). CONFIRMED.
    - The coil top goes to the dot (6654, 1811) and the Q120 collector ("0V").
      The coil bottom goes to "24V" at (6654, 1888) and down to J107-2.
    - D114 has its anode at the collector side.
    - Q120 is NPN and its base is "0.6V". R199 22k, R201 1.5k, C135 33/25V
      and R200 39k are as reported.
    - D117 is apex up, with its anode down to the "24V" J107-7 line (dot
      (6895, 2408)).

18. Claim: bias enable is Q118 / Q119 from J107-7 through D115 / R191, with
    the C132 delay; also where the A3 annotation sits.
    Looked: q118-q119.png (6150-6720, 2290-2630). CONFIRMED.
    - D115's anode is on the J107-7 side. D116 has its anode at N2 and its
      cathode at N1.
    - Q118 and Q119 are both NPN. The Q119 emitter is on -15V, and R198 8.2
      runs to TP3 / U103 pin 2.
    - "-14.4V" sits on the Q118 base / R194 wire at ~(6440-6480, 2445), so
      the A3 conflict is real (see A-7).

19. Claim: bias is injected through C134 onto the head-side lead of K103.
    Looked: k103-upper.png (6400-6740, 1730-1980); q120.png; c134-u103.png
    (5520-6120, 2150-2640). CONFIRMED.
    - The pivot (6591, 1929) is wired to the dot (6620, 1930). From there, x
      6620 runs down (crossing the lower bus with no dot visible) to
      y ~2265, then left to x ~5806 and down to C134 at y ~2369.
    - C134's other end is at the W132 upper pad / U103 pin 4. W132 is drawn
      linked to the pin-5 "AC65V" node.
    - No K103 contact sits between the head lead and C134.
    - The dot also branches right and up to y ~1788, then left to x ~5298;
      this is read as the run to J106-7 (not followed).

20. Claim: K103 upper set is drawn on N_REC, with the other throw to the sync
    line.
    Looked: k103-upper.png. CONFIRMED. The blade rests on the lower hook
    (~6563, 1935), whose wire runs left to the dot (6432, 1942). The upper
    contact runs left to x 6484 and up to the y ~1757 line.

21. Claim: K103 lower set is drawn on J108-3, with the other throw to TP1.
    Looked: c134-u103.png. CONFIRMED.
    - The blade runs from the pivot (5670, 2265) to the lower contact
      (5617, 2277). That contact's wire runs left to x 5551, down to y 2315,
      and right to the x 5752 riser (J108-3).
    - The upper contact (5617, 2249) runs left, up x 5551 to y ~2173, and
      right towards TP1.
    - The pivot is wired right to x 5702 and down to the dot (5702, 2424) on
      the U103 pin-6 line.

22. Claim: FUNCTION output = pole C to bus C (J173-3); OFF contacts unwired.
    Looked: func-ch1.png (2560-2960, 2120-2620). CONFIRMED for channel 1:
    - Pole C's common goes left to x 2655 and down to y ~2587 (towards
      J174-1). Its ON contact goes right to x 2742 and up to bus C at
      y ~2332, where the next channel joins with a dot at (2912, 2332).
    - The pole C and pole B OFF contacts have no wire. Pole B's ON contact
      goes to the 0V tap.
    - Pole A: ON goes to the 24V line, and OFF goes to the 0V dot (2743,
      2225).
    - The switches are drawn ON.

23. Claim: FUNCTION is high only when REC SIGNAL turns on Q301, which then
    turns on Q302.
    Looked: q301-q302.png (1270-1670, 3780-4180). CONFIRMED.
    - J182-2 feeds R301 22k into the Q301 base ("0.6V"), with R302 100k to
      the J182-7/4 0V node (dot (1405, 3950)).
    - Q301 is NPN (arrow out) with its emitter on the x 1310 return. Its
      collector ("0V") goes through R303 47k to the Q302 base ("23.4V"), with
      R304 100k to the Q302 emitter.
    - Q302 is PNP (arrow in). Its emitter goes to (1561, 4150), x 1630, and
      y 3898 to J182-3. Its collector ("24V") goes up x 1561 to J182-1.
    - The crossing at (1561, 3898) shows no dot.

24. Claim (M4): the REC SIGNAL horizontal crosses the P173-3 vertical at
    (1562, 3692) without joining it.
    Looked: m4-cross.png (1490-1640, 3630-3760, 6x). CANNOT TELL beyond what
    M4 already says. The crossing ink is a little heavier than a thin
    crossing, but there is no round dot like this sheet's junction dots, and
    the crossings at y ~3666 just above look the same. A crossing is the
    better reading. M4 should stay open.

25. Claim (transport sheet): POWER MUTE is the open-collector Q801, base
    RC-fed from the 6V rail.
    Looked: transport sheet, q801.png (1500-2300, 3440-3720). CONFIRMED.
    - Node A (bridge plus, C801 1000u/16V) carries R830 470 / R831 33 and the
      line to terminal 39 "+6V". R801 8.2k feeds C802 1000u/6.3V.
    - D805 points to node A (anode at B). D806 runs from B to C, and R802 22k
      from C to 0V.
    - Q801 is NPN, with its emitter on 0V and its collector to terminal 42.
      Nothing else is on the collector.

Parts table (parts.png, 1950-2950, 1120-1680): CONFIRMED. Every type in the
Devices table matches. Also: Q202 and Q204 are 2SA720Q, and D201-D207 are
1S2473HJ.

---------------------------------------------------------------------------
PART C - LOGIC CHECK OF THE OPERATING MODES TABLE
---------------------------------------------------------------------------

Each row was derived again from the traced behaviours (the control table,
the OUT SELECT table, and Control sources):

- Power-up: follows. POWER MUTE is open, so K102 is open. REC SIGNAL is
  presumably open, so FUNCTION is open. PLAY MUTE during the ramp is unknown
  (control-transport U4), and the row's "-" is appropriate.
- STOP / FF / REW, INPUT / SYNC / REPRO: follows. INPUT is not on the Q107
  line, so INPUT passes while SYNC and REPRO mute. K101 is energised only in
  SYNC. The head identities depend on A1 (finding A-1).
- CUE row: follows (S607 puts node E on 0V; ~-6.6V).
- PLAY rows: follow.
- "none" row: wrong in RECORD with the channel armed (finding A-2).
- RECORD, not armed: follows (FUNCTION is open for that channel).
- RECORD, armed, INPUT: follows. Q110 is on by both paths.
- RECORD, armed, SYNC: follows. Q108 and D108 force Q106 off (subject to
  the pinch-off question, A6). Q109 sources Q110. K101 is energised, but its
  sync throw goes to an open K103 contact, so the preamp input is open; that
  is harmless because Q106 is off.
- RECORD, armed, REPRO: follows. P180-4 is open, so Q109 cannot source. Q108
  still clamps SYNC, which is already off. Depends on M2.
- Transitions:
  - Punch in and punch out follow qualitatively. The K103 timing is omitted
    (A-10).
  - "K103 released ... record drive grounded" follows, conditional on C17
    (stated).
  - "Recording does not need a selection button" follows. The record path
    (U102 to N_REC to K103) has no OUT SELECT dependency.
- Missing combinations: see A-3. They are: several buttons held at once (no
  interlock is drawn), PAUSE, the auto-stop override, and momentary
  switches.

---------------------------------------------------------------------------
PART D - OVERCLAIMING CHECKLIST
---------------------------------------------------------------------------

Interpretation presented as fact, or wording that implies measurement:
- "J107-7 high enables bias" (A-7)
- "C134 sets bias" (A-15)
- "The transport uses it only to gate the RECORD lamp" (A-4)
- PLAY MUTE "-6.8V ... in RECORD" (A-5, M2)
- "complete to the limit of the two sheets" (A-8)
- "W109 / W110 / W112 fitted" (A-6)
- A3: "Probably measured in different modes" (A-7)
- "releases quickly at power-off"; "about 1.8 s" without the 6V assumption
  (A-12)

Nothing in the document claims a measurement or says it is safe to build.
The Status line ("nothing here is a basis for powering a replacement card.
No state, delay or level below has been measured") is appropriately
cautious, and the delays are labelled "computed from part values".
