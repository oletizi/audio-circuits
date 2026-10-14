Independent blind re-trace: J107-1..7 and J108-1..4 (channel-1 card), both sides
Source: scratchpad/amp/full-1.png (9000x5250). Coordinates are full-res pixels (x, y).
Crops: scratchpad/blind/crops-j107-j108/ (helper hfollow.py there: a line follower
used only to list candidate meetings; every junction claimed below was confirmed
visually at 5-10x unless stated otherwise).

CONVENTIONS ESTABLISHED

J108 (crop j108-box.png, 4x): box x 5625-5800. Notches at x 5700, 5725, 5750, 5773.
Numbers 1-4 are printed immediately RIGHT of each notch; the leftmost cell
(5625-5700) is blank. Card wires land on the notches. Mapping: 5701=1, 5728=2,
5751=3, 5774=4. P108 prongs at the same x, numbers printed right of each prong;
same mapping.

J107 (j107-box.png, 5x): box x 6712-6918. Notches at 6738, 6763, 6788, 6813, 6841,
6866, 6893; numbers 1-7 printed RIGHT of each notch; leftmost cell (6712-6738) blank.
Card wires land at 6738(1), 6763(2), 6788(3), 6813(4), 6892(7). No card wire on
notches 5 (6841) or 6 (6866). P107 prongs at 6735, 6761, 6786, 6811, 6838, 6866,
6893, numbers right of each prong, label P107 at far right; wires leave prongs 1,
2, 3, 4, 7 only.

Other connectors used as endpoints (same check each time):
- P104: prongs 7058(1) 7083(2) 7108(3) 7135(4) 7163(5) 7192(6, thick) 7222(7);
  numbers right of prongs.
- P105/J105: OPPOSITE convention - J105 blank cell is at the RIGHT, numbers printed
  LEFT of each notch. P105 prongs 7717(1) 7743(2) 7771(3) 7795(4) 7821(5) 7847(6)
  7873(7).
- P106: prongs 5268(8) 5292(7) 5317(6) 5343(5) 5367(4) 5394(3) 5420(2) 5446(1);
  numbers right of prongs; J106 blank cell at left.
- P103: prongs 5036(6) 5061(5) 5087(4) 5114(3) 5137(2) 5165(1); numbers right.
- P101: prong 4932 = 1 (number right of prong).
- P173/J173 (FUNCTION PCB): prongs/notches 4330(4) 4357(3) 4381(2) 4405(1); numbers
  right of notch, blank cell at left.
- P174/J174 (FUNCTION PCB): prongs 3973(1) 3997(2); prongs 3 and 4 are drawn as
  arrows labelled "3ch" and "4ch".
- P171/J171 (power-supply bus): prongs/notches 4140(11) 4167(10) 4192(9) 4218(8)
  4243(7) 4268(6) 4295(5) 4320(4) 4347(3) 4372(2) 4396(1); numbers right of notch.
  Printed names (crop j171.png): 1=6V, 2=0V, 3=POWER MUTE, 4=REC MODE,
  5=REC SIGNAL, 6=PLAY MUTE, 7=0V, 8=24V, 9=+B(15V), 10=-B(-15V), 11=0V.
- P182/J182 (MASTER OSC PCB): prongs 1381(8) 1406(7) 1433(6) 1457(5) 1485(4)
  1512(3) 1537(2) 1562(1); numbers right of prongs.
- P180/J180 (OUT SELECT PCB): prongs 2435(5) 2460(4) 2486(3) 2512(2) 2538(1).
- P176: 3546(1) 3573(2) 3600(3) 3625(4) 3650(5,"To 3ch") 3678(6) 3700(7,"To 4ch")
  3730(8). P177: 2 at 3829, 4 at 3882. P178-2 at 3982, P179-2 at 4085.
- P161/J161: two-contact connector at x~1095, contacts at y 3162 (upper) and 3190
  (lower); no pin numbers are printed (crop left-end.png). J161 mates J403/P403,
  which goes to the ERASE HEAD (ch1) (crop p161-ctx.png).

Scan artefacts: the drawing is skewed - vertical lines drift ~-4 to -6 px in x over
1000 px down, and horizontal lines drift ~-20 px in y over 5000 px leftward. A
vertical stitching seam at x~4396-4398 breaks every horizontal line by 3-4 px; a
seam at x~4762 steps horizontals by ~5 px; seam at x~6470 (4 px gap). All bridged
because the line is collinear and the same width on both sides.

Thick lines: a crossing of two thick lines can look like a dot when downsampled.
Every thick-thick crossing claimed "no dot" was checked at 6-7x (e.g. y2763 over
P106, crop y2763-p106.png; P108-1 over y2763, crop p108-cross.png).

----------------------------------------------------------------------------

J107-1
- card side: Q120 emitter (the arrowed terminal at (6740,2005); collector is
  the upper terminal at (6742,1960), labelled 0V; base on the right via R201).
- card route: vertical x6738 from the J107 notch straight up to Q120 emitter.
  Crosses without dots: y2602 (-15V line), y2410 (24V line), y2342, y2316,
  y2097 (thick 0V bus, checked at 8x, crop j107-bus2097.png). Seam gap at
  (6740,2160-2167) bridged (collinear).
- motherboard side: thick ground net. Named endpoints: P104-6 (ch1, (7192,2970)
  dot); P101-1 (dot (4932,2759)); P173-2 / J173-2 FUNCTION PCB (dot (4380,2755));
  P171-7 "0V" (via thick vertical x4252 from dot (4252,2755) down to P171-7 at
  4243); 2ch P107-1 (vertical bussed straight down); thick line continues at
  (4044,2755) down to a thick bus at y2955 heading left (not followed further).
- motherboard route: thick P107-1 vertical x6733 down, big dot at (6733,2967) onto
  thick y2967; same vertical continues (no further dots seen) to 2ch P107-1 at
  (6729,3800). y2967 right -> dot (7192,2970) on P104-6. y2967 left -> corner
  (5822,2965) up -> corner (5822,2763) -> thick y2763 left: crosses P108-4/3/2
  and thick P108-1 (5700) without dots (8x), crosses all P106 verticals without
  dots (7x), dot at P101-1 (4932,2759), crosses 4878 (P101-3) no dot seen at 4x,
  seam gap (4398) bridged, dot (4380,2755) P173-2, dot (4252,2755), corner
  (4044,2755) down.
- shares a net with: motherboard - P108-1 (via P171-7: the P108-1 thick y3730
  line has a dot on P171-7 at (4242,3730)), P104-6, P101-1, P173-2, P171-7 0V,
  2ch P107-1. Card - none of my other contacts.
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: this is a ground bus with many more branches; the listed
  endpoints are confirmed but the bus at (4044,2755)->y2955 and further branches of
  x4252 were not exhaustively followed.

J107-2
- card side: K103 relay COIL, lower terminal (the 24V-labelled node), and D114
  cathode (D114 drawn triangle down, bar at bottom; anode goes to the coil top
  terminal / Q120 collector line).
- card route: notch x6763 up to corner (6764,2342), left to corner (6651,2342),
  up x6651 to dot (6653,1892) [coil lower terminal (6575,1892) to D114 cathode].
  Crossings without dots: y2316 at (6651,2316), y2097 bus at 6652 (8x), K103
  contact line y1931 at (6653,1931) (the dot on that line is at 6620, not 6653).
- motherboard side: P171-8 / J171-8 "24V" (power supply bus); P180-1 / J180-1
  (OUT SELECT PCB); P182-3 / J182-3 (MASTER OSC PCB); P173-1 / J173-1 (FUNCTION
  PCB); 2ch P107-2 (direct vertical).
- motherboard route: prong x6760 down, dot (6758,3176) onto y3176 heading left
  only; vertical continues straight down to 2ch P107-2 (6755,3800). y3176 left:
  dot (4224,3166) -> vertical x4224 down to P171-8 (4218,3800), J171-8 routed to
  "24V"; T at (4400,3165): P173-1 vertical ends there with a dot (6x, crop
  x4400.png), followed up to P173 prong 1 (4405) / J173-1; dot (2542,3155) ->
  vertical down to P180-1 (2538); corner (1516,3153) down -> P182-3 (1512).
  Other crossings plain (e.g. 5771, 5698, 5390..5315, 4903 checked 7x, 4145/4247
  thick checked 6x).
- shares a net with: card - K103 coil/D114 (no other of my contacts). Motherboard -
  none of my other contacts.
- confidence: card CLEAR; motherboard CLEAR (verticals to P180-1 and P182-3
  checked at 1-3x through the dense y3500-3700 bus; no dots seen)

J107-3
- card side: 15V node: U103 pin 7, C133 (33/50V) upper terminal (dot (6178,2316)),
  R195 12k upper terminal (dot (6378,2316)).
- card route: notch x6788 up to corner (6790,2316), left along y2316 ("15V") to
  corner (6015,2316) down to U103 pin 7. Crossings without dots: x6740 (J107-1),
  x6651 (J107-2 route) (5x crop j107-cross1.png), 24V line y2410 at x6790.
- motherboard side: P171-9 / J171-9 "+B(15V)"; P182-6 / J182-6 (MASTER OSC);
  P106-4 (ch1, dot (5365,3197)); P105-5 (ch1, dot (7818,3205)) and through it
  2ch P105-5; 2ch P107-3 (direct vertical).
- motherboard route: prong x6786 down, dot (6784,3201) on y3201 which runs both
  ways; vertical continues to 2ch P107-3 (6780,3800). Right: crosses P104
  verticals plainly, dot (7818,3205) on P105-5 vertical, which continues down to
  2ch P105-5 (7815,3810). Left: dot (5365,3197) on P106-4; dot (4197,3191) ->
  vertical down to P171-9 (4192); continues left to corner (1436,3180) down ->
  P182-6 (1433). Plain at 7x: 5134 (P103-2).
- shares a net with: none of my other contacts (card or motherboard).
- confidence: card CLEAR; motherboard PARTIAL
- blocking issue: on the P171-9 vertical (x4194) there is a blob at (4194,3471)
  where line y3471 crosses (crop x4195-blob.png, 7x). It is irregular and could be
  a junction dot or a scan blemish; UNRESOLVED. If a dot, the y3471 line (runs
  from (1771,3458) up-turn to (7320,3492) down-turn) is also on this net.

J107-4
- card side: -15V node (italic "-15V"): R192 22k lower terminal, C132 10/50V lower
  terminal (dots (6570,2602) region), i.e. the y2602 line.
- card route: notch x6813 up to corner (6813,2602), left along y2602; crosses
  x6788, 6763, 6738 without dots (5x).
- motherboard side: P171-10 / J171-10 "-B(-15V)"; P182-5 / J182-5 (MASTER OSC);
  P106-3 (ch1, dot (5392,3016)); P103-5 (ch1, dot (5060,3015)); P105-6 (ch1, dot
  (7846,3025)) and through it 2ch P105-6; 2ch P107-4 (direct vertical).
- motherboard route: prong x6811, dot (6811,3022) on y3022 running both ways;
  vertical continues to 2ch P107-4 (6805,3800). Right: crosses P104 verticals
  plainly, dot (7846,3025) on P105-6. Left: dots at 5392 and 5060, dot
  (4175,3010) -> vertical x4174 down to P171-10 (4167); continues left to corner
  (1463,2999) down -> P182-5 (1458). Crossings at 4145 thick checked 6x: no dot.
- shares a net with: none of my other contacts.
- confidence: card CLEAR; motherboard CLEAR

J107-5
- card side: no wire observed at notch 6841.
- motherboard side: no wire observed from P107 prong 5 (6838).
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire)

J107-6
- card side: no wire observed at notch 6866.
- motherboard side: no wire observed from P107 prong 6 (6866).
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire)

J107-7
- card side: 24V node (italic "24V"): D115 anode (D115 drawn pointing left, bar on
  left at ~6680, so cathode toward R191/D116) and D117 anode (D117 triangle up,
  bar on top) -> D117 cathode -> R200 39k -> corner (6893,1985) -> R201 1.5k right
  end / C135 33/25V (dot (6858,1985)).
- card route: notch x6892 up to T dot (6893,2410) [24V line runs left to D115];
  vertical continues up through D117 (~2220) and R200 (~2140).
- motherboard side: P174-1 / J174-1 (FUNCTION PCB); P104-3 (ch1).
- motherboard route: prong x6893 down to dot (6890,3229) on y3229 running both
  ways. The vertical STOPS at that dot: there is a clean 17 px gap (3233-3250)
  and a separate dot (6888,3255) where 2ch P107-7 rises to a different line
  y3255 (10x, crop p107-7dots.png). Right: y3229 to corner (7107,3226) up the
  P104-3 vertical. Left: crossings plain (4903 checked 7x) to corner (3970,3214)
  up x3970 (crossings plain, 6x crop x3970.png) to P174 prong 1 (3973).
- shares a net with: none of my other contacts. Not bussed to 2ch P107-7.
- confidence: card CLEAR; motherboard CLEAR

J108-1
- card side: relay K103 contact set - the MOVING (common) contact terminal (circle
  at (5670,2265)); U103 pin 6; L106 1.3mH one end (via dot (5907,2425)).
  The relay is identified as K103 by its dashed actuator line: from the blade
  (5655,2268) up to y2200, right along y2200 to x6575, up to the K103 coil
  (crop card-row.png, card-j107.png, k103.png).
- card route: notch x5701 up to corner (5702,2265), left to contact (5670,2265).
  Dot (5702,2425) on the way: y2425 right to dot (5907,2425) [down to L106 right
  end (5907,2477)] then U103 pin 6. Crossings without dots: y2315 at 5702,
  y2425 over x5728 and x5751, y2397 not crossed.
- motherboard side: thick ground net: P171-11 "0V" (dot (4141,3730)), P171-7 "0V"
  (dot (4242,3730)); P176-2, -4, -6, -8; P177-2, -4; P178-2; P179-2 (dots on
  thick y3730 at 3573, 3624, 3678, 3729, 3829, 3882, 3982, 4085); 2ch P108-1.
- motherboard route: thick prong x5700 straight down to 2ch P108-1 (5692,3810);
  crosses thick y2763 without a dot (8x) and every bus line without a dot; big
  dot (5692,3737) with thick y3737 going left (y drifts to 3730). Seam gap at
  ~4392 bridged.
- shares a net with: card - J108-3 when the relay blade is in the drawn position
  (see J108-3). Motherboard - J107-1 (both reach P171-7 0V).
- confidence: card CLEAR; motherboard CLEAR (named ground endpoints listed;
  bus may have further branches to the right/left of those not followed)

J108-2
- card side: L108 (inductor, no value printed beside it) lower end; L108 upper end
  goes to the AC65V node: U103 pin 5, W132 (jumper that also ties to U103 pin 4
  line), L106 other end (via x5805 down to (5805,2477)).
- card route: notch x5728 up through L108 (~2520-2580) to corner (5707..5728,2397),
  right along y2397 to dot (5805,2398) "AC65V" then to W132 lower terminal and
  U103 pin 5. Crossings without dots: y2425 at 5728, y2397 over x5751.
- motherboard side: P161 upper contact (y3162) -> J161 -> J403/P403 -> ERASE HEAD
  (ch1), upper terminal.
- motherboard route: prong x5725 down to corner (5725,2912), left along y2912
  (drifts to 2893) with plain crossings (P108-1 at 5699 thick, P106, P103, P173,
  P174) to corner (1311,2893), down to corner (1305,3164), left to P161 upper
  contact (1095,3162).
- shares a net with: none of my other contacts.
- confidence: card CLEAR; motherboard CLEAR (P161 contact numbers not printed)

J108-3
- card side: relay K103 contact set - fixed contact that the blade is drawn resting
  on (lower contact circle (5618,2278)). The other fixed contact (5617,2250)
  goes left/up along y2160-2170 (not my contact). In the drawn position J108-3 is
  connected to J108-1 through the blade.
- card route: notch x5751 up to corner (5752,2315), left along y2315 (crosses
  x5702 without a dot) to corner (5551,2315), up to (5551,2278), right to the
  contact.
- motherboard side: P161 lower contact (y3190) -> J161 -> J403/P403 -> ERASE HEAD
  (ch1), lower terminal.
- motherboard route: prong x5750 down to corner (5750,2938), left along y2938 with
  plain crossings to corner (1335,2919), down to corner (1335,3192), left to P161
  lower contact (1095,3190).
- shares a net with: card - J108-1 via K103 contact (drawn state only).
  Motherboard - none.
- confidence: card CLEAR; motherboard CLEAR

J108-4
- card side: U103 pin 3 ("AC10V").
- card route: notch x5774 up to corner (5774,2517), right along y2517 to corner
  (6125,2517), up to U103 pin 3 (6125,2370). Crosses U103 pin-1 line x6100
  without a dot.
- motherboard side: P182-8 / J182-8 (MASTER OSC PCB); 2ch P108-4 (direct).
- motherboard route: prong x5774 down; dot (5772,3146) where y3146 leaves left;
  the vertical CONTINUES down to 2ch P108-4 (5767,3810) (crops strip-5150.png,
  p108-low.png). y3146 left with plain crossings to corner (1385,3128), down x1387
  to P182-8 (1381) (crossings near y3610-3660 plain at 2x).
- shares a net with: none of my other contacts.
- confidence: card CLEAR; motherboard CLEAR

----------------------------------------------------------------------------
Notes
- P107 pins 1-4 and P108 pins 1 and 4 are bussed straight down to the same pins
  of the 2ch row; P107-7, P108-2 and P108-3 are not.
- Card-side and MB-side names agree for J107-2 (24V), J107-3 (15V) and J107-4
  (-15V). J108-1 card side is NOT a ground node on the card (it is U103 pin 6 /
  K103 common), yet the motherboard puts P108-1 on the thick 0V bus. Recorded as
  observed.
