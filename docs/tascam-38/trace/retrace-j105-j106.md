Tascam 38 blind re-trace: J105 pins 1-7, J106 pins 1-8
=====================================================

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/blind/crops-j105-j106/. Two helper
scripts there: trace.py (follows a line pixel-wise and lists every crossing it
meets; it does NOT decide dots, and it runs straight through resistor zigzags
and stalls on thick lines, so every route below was confirmed visually) and
strip.py (folds a long line into stacked segments so every crossing on it can
be inspected at 2-4x). Every dot / no-dot call below was made by eye on a crop.

CONVENTIONS ESTABLISHED
-----------------------
Pin mapping rule (all boxes checked): each box has N notches and N+1 cells;
exactly one end cell is empty. Each number belongs to the notch adjacent to it
on the side AWAY from the empty cell. That is the only assignment in which
every number has a notch and every notch a number.

- J105 / P105 (top, ch-1 card; crop j105-box.png): numbers 1..7 left to right,
  empty cell at the RIGHT end (x 7875-7900). Number sits left of its notch.
  Notch/prong x: 1=7717, 2=7745, 3=7770, 4=7795, 5=7822, 6=7848, 7=7875.
  P105 prong row and its printed numbers line up the same way. Card-side wires
  land on 1, 5, 6, 7 only; motherboard wires leave prongs 1, 5, 6, 7 only.
- Bottom J105 / P105 (2ch-8ch row, p105-b.png): empty cell at right, same rule.
  Prongs 1=7708, 2=7735, 3=7762, 4=7787, 5=7813, 6=7839, 7=7865.
- J106 / P106 (top; j106-box.png): numbers 8..1 left to right, empty cell at
  the LEFT end (x 5240-5268); number sits right of its notch.
  Notch/prong x: 8=5268, 7=5295, 6=5320, 5=5345, 4=5370, 3=5395, 2=5420, 1=5447.
  P106 printed numbers sit right of the prongs, consistent. Wires on all 8.
- Bottom J106 / P106 (bot-p106.png): empty cell left, same rule. Prongs
  8=5258, 7=5286, 6=5309, 5=5335, 4=5360, 3=5386, 2=5412, 1=5438.
- Other connectors used as endpoints (each established the same way):
  J102/P102 top (j102-box.png): empty cell left; 1=7300 ... 5=7405 ... 7=7460.
  Bottom P102 (bot-p102.png): empty left; 5=7398.
  J107/P107 (j107.png): empty left; 1=6735, 2=6760, 3=6786, 4=6811 ... 7=6892.
  J103/P103 (j103.png): numbers 6..1 left to right, empty left; 6=5036, 5=5062.
  P171/J171 (p171.png): numbers 11..1 left to right, empty cell left of J171;
  11=4140, 10=4167, 9=4192, 8=4218, 7=4242 ... 1=4396. J171 pin lines then
  run to printed arrows (psbus.png): 11 -> "0V", 10 -> "-B(-15V)",
  9 -> "+B(15V)", 8 -> "24V", 7 -> "0V", 6 -> "PLAY MUTE", 5 -> "REC SIGNAL",
  4 -> "REC MODE", 3 -> "POWER MUTE", 2 -> "0V", 1 -> "6V".
  (J171-10 traced explicitly: x 4165 from 3870 down to 4160, turns right to
  "-B(-15V)".)
  P182/J182 MASTER OSC (j182.png): numbers 8..1, empty cell left;
  8=1381, 7=1406, 6=1433, 5=1458, 4=1485, 3=1511, 2=1537, 1=1562.
  P176/J176 VU meter (p176.png): empty cell left; 1=3547, 2=3573, 3=3599,
  4=3624, 5=3651, 6=3677, 7=3703, 8=3730. Pins 2/4/6/8 are thick and tied to a
  thick bus at y 3722; pins 5 and 7 carry printed arrows "To 3ch", "To 4ch".
  J141/P141 and J142/P142 (j141.png): 3 cells, 2 notches, MIDDLE cell empty;
  "2" is the left notch, "1" the right notch. P141: 2=1878, 1=1904.
  P142: 2=1618, 1=1645.
  P151 / P152~P158 (HEAD PCB, head.png / headpcb.png): two prongs each, NO pin
  numbers printed; cited as upper/lower prong with y.
- Dots: real junction dots in this scan are round, about 10-12 px across on
  thin lines and 20-25 px on thick lines (e.g. (5317,2962), (5343,2962),
  (4930,2762)). Crossings of two thick lines show a small anti-aliased fillet
  that is NOT a dot; I zoomed (6-8x) every thick-on-thick crossing I relied on.
- Stitching seams bridged (all collinear 1-5 px gaps, the line continues on the
  same axis on both sides): card side y ~2162-2172 on every J105/J106 line;
  motherboard x ~2303-2309, x ~4393-4401, x ~6470-6477 on horizontals; a
  y-step of ~3 px at x ~4760 on the 2855 line. Scan debris at (5390-5440,
  3045-3070) over P106-3/P106-2 verticals: both lines continue collinearly
  above and below, bridged.
- The long thick horizontals at y ~2761 (just under the top prong row) and
  y ~3736 (just above the bottom prong row) cross every J106 line without
  dots (p106-bus8x.png, bot-3736.png).


J105-1
- card side: R119 (56k), upper terminal.
- card route: from notch (7717,2650) straight up (seam bridged at y~2170) to
  corner (7724,1602); left to corner (7547,1601); up x 7549 crossing the
  J105-5 horizontal at y 1572 (no dot), y 1470 (no dot) and the thick card bus
  at y 1366 (no dot, x7524-1366.png) to corner (7549,1193); right to (7577,1193);
  down into R119. No junction dots on the route.
- motherboard side: P102-5 (ch-1 card's own J102-5). Bottom row: bottom P105-1
  goes to bottom P102-5 (separate, parallel net for the 2ch-8ch card).
- motherboard route: prong (7717,2725) down to corner (7713,2841); left along
  y 2841 with no crossings to corner (7405,2837); up into P102-5 prong.
  Bottom: prong (7708,3810) up to corner (7708,3692); left to (7399,3691);
  down to bottom P102-5 (7398,3830).
- shares a net with: card: none of the assigned contacts. motherboard: P102-5
  (top); bottom P105-1 with bottom P102-5.
- confidence: card CLEAR; motherboard CLEAR

J105-2
- card side: no wire observed above notch (7745,2650).
- motherboard side: no wire observed below prong (7745,2725) (top) or above
  bottom prong (7735,3810).
- shares a net with: none observed.
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire)

J105-3
- card side: no wire observed above notch (7770,2650).
- motherboard side: no wire observed at top prong (7771,2725) or bottom prong
  (7762,3810).
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire)

J105-4
- card side: no wire observed above notch (7795,2650).
- motherboard side: no wire observed at top prong (7795,2725) or bottom prong
  (7787,3810).
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire)

J105-5
- card side: junction dot (7524,996) joining R152 (470, lower terminal; R152
  runs up to (7524,910) and on left to C115 47/16V) and R154 (470, left
  terminal; R154 runs right to the "13.8V" node of Q111/R143/R145).
- card route: notch (7822,2650) up (seam y~2170) to corner (7828,1572);
  left along y 1572, crossing J105-1's riser at x 7549 (no dot), to corner
  (7521,1570); up x 7524 crossing y 1469 and the thick bus y 1366 (no dot) to
  dot (7524,996). Note the y 1572 run ends at 7828 and does NOT reach the
  "-15V" line that starts at dot (7855,1572) - there is a clear gap
  (card-j105-mid.png).
- motherboard side: the +B(15V) rail. Named endpoints: P107-3, P106-4,
  P171-9 ("+B(15V)"), P182-6 (MASTER OSC; J182-6 runs to U301 pin 3 printed
  "15V"), and on the 2ch-8ch row bottom P105-5, bottom P107-3, bottom P106-4.
- motherboard route: P105-5 vertical x 7820 -> 7812 runs top prong to bottom
  prong continuously; crosses y 3027 (no dot), dot (7818,3205), crosses
  3439/3468 (no dots). From dot (7818,3205) horizontal left (y 3205 -> 3178)
  with dots at (6783,3199) [P107-3 vertical, continuous top to bottom P107-3,
  only dot on it is this one], (5365,3194) [P106-4 vertical, continuous top to
  bottom P106-4, only dot], (4197,3191) [riser down to P171-9 at (4192,3811)],
  and its left end corner (1436,3179) turns down to P182-6 (1432,3803).
  All other crossings on y 3205 checked on s-3205.png: no dots.
- shares a net with: card: none of the assigned contacts. motherboard: J106-4
  (via P106-4), P107-3, P171-9, P182-6.
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: on the P171-9 riser (x 4195) at (4195,3472) there is an
  asymmetric blob sitting only on the upper side of the crossing horizontal
  (x4197-12x.png). I judge it NOT a junction dot (dots here are symmetric and
  round), but cannot be certain. If it were a dot, the y 3473 line (runs from
  P131-2 at (1775,2677) right to (7320,3493) and down to the bottom row near
  P102) would join this net. Coordinates: (4195,3472).

J105-6
- card side: dot (7855,1572): R155 (470) lower terminal (vertical continues up
  into R155) and the horizontal printed "-15V" running right to R153 (470)
  lower terminal. ("-15V" is the italic printed DC value at the node.)
- card route: notch (7848,2650) up (seam y~2170) to dot (7855,1572). No other
  junction below it.
- motherboard side: the -B(-15V) rail. Named endpoints: P107-4, P106-3,
  P103-5, P171-10 ("-B(-15V)"), P182-5 (MASTER OSC; J182-5 runs to U301 pins
  6 and 1, printed "-15V"), and on the 2ch-8ch row bottom P105-6, bottom
  P107-4, bottom P106-3, bottom P103-5.
- motherboard route: P105-6 vertical x 7845 -> 7838 top to bottom prong,
  dot (7845,3027), crossings 3440/3467 no dots. From (7845,3027) horizontal left
  (y 3027 -> 3001) with dots at (6810,3021) [P107-4 vertical, top to bottom,
  only dot], (5392,3016) [P106-3 vertical, top to bottom, only dot],
  (5060,3014) [P103-5 vertical, top to bottom, only dot], (4174,3009) [riser
  down to P171-10 at (4167,3812), no other dots], and left-end corner
  (1463,3001) down to P182-5 (1457,3803), no dots. All thick crossings on the
  run (1490, 1618, 1877, 2439, 4147, 4249, 4932, 5316, 5342, 5420, 5700, 6731,
  7191) are plain (s-3027.png).
- shares a net with: card: none of the assigned contacts. motherboard: J106-3
  (via P106-3), P107-4, P103-5, P171-10, P182-5.
- confidence: card CLEAR; motherboard CLEAR

J105-7
- card side: node (8257,1222): D111 cathode and C114 (47/10V) upper (straight
  plate) terminal.
- card route: notch (7875,2650) up (seam) to corner (7883,1600); right along
  y 1600 to corner (8328,1598); up x 8328 to corner (8324,1223); left to dot
  (8257,1222).
- motherboard side: P176-1, i.e. J176-1 to the 1ch VU meter. The bottom-row
  P105-7 is a SEPARATE net to P176-3 / J176-3 / 2ch VU meter.
- motherboard route: top P105-7 x 7872 down to corner (7867,3440) - it does
  NOT continue to the bottom prong; left along y 3440 -> 3422 (crossings at
  7841, 7815 and all others on s-3440.png: no dots) to corner (3549,3422);
  down x 3548 (no dots, v-3549.png) to P176-1 (3546,3809).
  Bottom: bottom P105-7 prong up to corner (7867,3467); left along y 3467 ->
  3451 (no dots; the trace tool stalls at the thick P107-1 riser at x 6728,
  checked visually at x6726.png: plain crossing) to corner (3599,3451); down
  x 3600 crossing the P176 ground bus y 3722 with no dot to P176-3 (3598,3809).
- shares a net with: card: none. motherboard: P176-1 only (top); bottom
  P105-7 with P176-3.
- confidence: card CLEAR; motherboard CLEAR

J106-1
- card side: R160 (27k) lower terminal (R160 upper goes to (5447,1966), right
  to dot (5496,1966) with R161 22k and U102 pin 5).
- card route: notch (5447,2650) up (seam y~2165), crosses J106-3's y 2149 run
  (no dot) and the y 2095 bus (no dot, j106-2095.png) into R160.
- motherboard side: P141-1 (IN/OUT PCB; J141-1 runs to the centre of the 1ch
  INPUT jack). Bottom P106-1 goes to P142-1 (2ch INPUT jack centre).
- motherboard route: prong (5446,2725) down to corner (5446,3092); left along
  y 3092 -> 3073 (no dots, s-3100.png) to corner (1901,3073); up x 1904 (no
  dots, v-p141.png) to P141-1. Bottom: prong (5438,3810) up to corner
  (5436,3505); left y 3505 -> 3486 (no dots, s-3510.png) to corner
  (1640,3486); up x 1645 to P142-1.
- shares a net with: card: none. motherboard: none of the other contacts.
- confidence: card CLEAR; motherboard CLEAR

J106-2
- card side: joined to J106-5 and J106-6 on the card-side bus at y 2608
  (corner (5422,2608), dot (5345,2608)); hence the card node described under
  J106-5.
- card route: notch (5420,2650) up to corner (5422,2608); left along y 2608,
  crossing J106-3 (5395) and J106-4 (5370) with no dots (j106-bus.png), to dot
  (5345,2608).
- motherboard side: P141-2 (J141-2 runs to the sleeve/ground of the 1ch
  INPUT jack, which is also tied to the 1ch OUTPUT jack sleeve). Bottom P106-2
  goes to P142-2 (2ch jack ground).
- motherboard route: thick prong (5420,2725) down to corner (5420,3119); left
  along thick y 3119 -> 3100 (thick crossings at 4249, 4147, 2439 etc zoomed:
  plain; s-3100.png) to corner (1877,3100); up thick x 1878 (crossings at 2815,
  2843 zoomed plain, x-gnd-2815.png) to P141-2. Bottom: thick prong (5412,3810)
  up to corner (5412,3532); left thick y 3532 -> 3509 (no dots, incl. 4141 /
  4242 zoomed x4141-3528.png) to corner (1612,3509); up x 1617 to P142-2.
- shares a net with: card: J106-5, J106-6, J106-8. motherboard: none of the
  other contacts.
- confidence: card CLEAR; motherboard CLEAR

J106-3
- card side: R174 (470) left terminal (R174 at ~(5620,2149); its right side
  runs on to C123 47/16V and the "-14.2V" node).
- card route: notch (5395,2650) up, crossing the y 2608 bus with no dot, to
  corner (5400,2149); right along y 2149, crossing J106-1's riser (5447) with
  no dot, into R174.
- motherboard side: the -B(-15V) rail (same net as J105-6): P105-6, P107-4,
  P103-5, P171-10 ("-B(-15V)"), P182-5, plus bottom P106-3 and the other
  bottom-row members listed under J105-6.
- motherboard route: P106-3 vertical x 5392 top prong to bottom prong (debris
  at y 3048-3061 bridged), single dot (5392,3016) onto the y 3027/3016
  horizontal described under J105-6. All other crossings plain (v-p106-3.png).
- shares a net with: card: none. motherboard: J105-6.
- confidence: card CLEAR; motherboard CLEAR

J106-4
- card side: R175 (470, triangle mark) lower terminal; R175 upper runs to
  corner (5375,1812) and right to dot (5590,1812) = U102 pin 8, printed
  "13.7V".
- card route: notch (5370,2650) up, crossing y 2608 bus (no dot) and the
  y 2095 bus (no dot) into R175 at ~(5371,1880).
- motherboard side: the +B(15V) rail (same net as J105-5): P105-5, P107-3,
  P171-9 ("+B(15V)"), P182-6, plus bottom P106-4 and the other bottom-row
  members listed under J105-5.
- motherboard route: P106-4 vertical x 5365 top to bottom prong, single dot
  (5365,3194) onto the y 3205/3194 horizontal described under J105-5
  (v-p106-4.png).
- shares a net with: card: none. motherboard: J105-5.
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: inherits the (4195,3472) ambiguity described under J105-5.

J106-5
- card side: one card node with J106-6, J106-2 (y 2608 bus) and J106-8. On the
  route: dot (5345,2095) onto the y 2095 bus that runs right to dot
  (5497,2095) = R161 (22k) lower terminal; dot (5350,1362) onto the thick
  y 1362 bus, which carries C136 (470p) lower plate at x 5350, C101 (470p)
  lower plate at dot (5393,1362), and further right R102 (220k), R103 (330)
  and other parts (card-j106-up.png). J106-8 lands on the same bus at dot
  (5274,1362).
- card route: thick line from notch (5345,2650): dot (5345,2608), up to dot
  (5345,2095), up crossing y 1786, 1756, 1730, 1676, 1561, 1508 (no dots,
  v-j106-5.png) to dot (5350,1362).
- motherboard side: P171-11 ("0V"). Also bottom P106-5 and bottom P106-6.
- motherboard route: P106-5 thick vertical x 5343 top to bottom prong, dot
  (5343,2962); P106-6 thick vertical x 5317 top to bottom prong, dot
  (5317,2962); the thick y 2962 stub joins the two and runs left (no dots; gap
  at ~4400 is a seam; s-2962.png) to corner (4148,2958), crossing the thick
  x 4250 with no dot (x4250.png); down thick x 4147 to P171-11 (4139,3811).
  Crossing at (4147,3112) zoomed: plain.
- shares a net with: card: J106-2, J106-6, J106-8. motherboard: J106-6.
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: on the x 4147 riser to P171-11, the crossing with the thick
  y 3730 line at (4141,3730) shows a diamond fillet that looks like a small
  dot (x3730-row.png); same at (4242,3730) on the P171-7 ("0V") riser. If
  real, the y 3730 thick line (runs left to the P176 meter-ground bus at
  ~(3570,3726) and right to ~x 5700) joins this net. Since the other end is
  meter ground this does not change the rail name, but I cannot call it.

J106-6
- card side: same card node as J106-5 (via y 2608 bus).
- card route: notch (5320,2650) up to corner (5318,2608); right along y 2608 to
  dot (5345,2608).
- motherboard side: P171-11 ("0V") with J106-5 (see J106-5); bottom P106-6.
- motherboard route: as J106-5 (dot (5317,2962)); P106-6 vertical's other
  crossings plain (v-p106-6.png).
- shares a net with: card: J106-5, J106-2, J106-8. motherboard: J106-5.
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: same (4141,3730) question as J106-5.

J106-7
- card side: K103 relay CONTACT set, common/blade terminal (open circle at
  ~(6592,1928); the dashed link goes to the K103 coil at ~(6575,1850)). Through
  dot (6620,1930) also C134 (100p trimmer) left terminal.
- card route: notch (5295,2650) up to corner (5301,1786); right along y 1786
  crossing x 5348, 5782, 6485 with no dots (s-1786.png) to corner (6715,1791);
  down to (6713,1930) crossing y 1811 (no dot); left along y 1930 crossing the
  D114 riser at x 6654 (no dot) to dot (6620,1930), then to the K103 contact
  circle. Branch from dot (6620,1930): down x 6620 crossing y 2098 (no dot) to
  corner (6616,2266); left along y 2266 to corner (5806,2267); down to
  (5810,2369); right into C134.
- motherboard side: P151 lower prong (y ~3086) on the HEAD PCB; P151 -> J151
  -> J402/P402 -> SYNC HEAD (1ch). Bottom P106-7 goes to P152~P158 upper prong
  (y ~3374) -> SYNC HEAD of the 2ch-8ch.
- motherboard route: prong (5292,2725) down to corner (5292,2884); left along
  y 2884 -> 2872 (no dots, s-2855.png) to corner (1285,2868); down x 1285 to
  P151 lower prong (3086). Bottom: prong (5286,3810) up to corner (5286,3610);
  left y 3610 -> 3585 (no dots, s-3633.png) to corner (1278,3585); up x 1277 to
  P152~P158 upper prong (y ~3374).
- shares a net with: card: none. motherboard: none of the other contacts
  (pairs with J106-8 at the sync head).
- confidence: card CLEAR; motherboard CLEAR

J106-8
- card side: thick card bus y 1362 at dot (5274,1362); same node as J106-5
  (dot (5350,1362) on the same bus), hence also J106-2, J106-6.
- card route: thick line from notch (5268,2650) up (seam ~2165) crossing
  y 1756, 1730, 1676, 1561, 1508 with no dots (v-j106-8.png) to dot
  (5274,1362).
- motherboard side: P151 upper prong (y ~3060) -> SYNC HEAD (1ch). Bottom
  P106-8 goes to P152~P158 lower prong (y ~3397).
- motherboard route: thick prong (5267,2725) down to corner (5267,2855); left
  along thick y 2855 -> 2844 (seam steps at x ~4760, ~4398, ~2305; thick
  crossings at 4930 (x4930.png), 4249, 4147, 1877, 1618 plain) to corner
  (1257,2840); down thick x 1257 to P151 upper prong (3060). Bottom: thick
  prong (5258,3810) up to corner (5258,3637); left thick y 3637 -> 3614 (no
  dots; 4141/4242 and 2440-2541 zoomed plain) to corner (1252,3614); up x 1251
  to P152~P158 lower prong (3397).
- shares a net with: card: J106-5, J106-6, J106-2. motherboard: none of the
  other contacts.
- confidence: card CLEAR; motherboard CLEAR


SUMMARY OF SHARED NETS
- +B(15V) on the motherboard: J105-5, J106-4 (plus P107-3, P171-9, P182-6).
- -B(-15V) on the motherboard: J105-6, J106-3 (plus P107-4, P103-5, P171-10,
  P182-5).
- 0V (P171-11) on the motherboard: J106-5, J106-6.
- Card ground node: J106-2, J106-5, J106-6, J106-8 (y 2608 bus + thick y 1362
  bus + y 2095 bus).
- The 2ch-8ch bottom row is wired in parallel for J105-5/6, J106-3/4/5/6 (same
  vertical runs top to bottom); for J105-1, J105-7, J106-1, J106-2, J106-7,
  J106-8 the bottom-row prong goes to its own, separate endpoint.
