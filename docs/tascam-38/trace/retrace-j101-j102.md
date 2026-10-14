Independent re-trace: J101 pins 1-4 and J102 pins 1-7 (channel-1 card)
=====================================================================

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res
pixels (x, y). Crops are in scratchpad/blind/crops-j101-j102/. A helper script
crops-j101-j102/follow.py (follows a line and lists the places where it meets
other lines) was used to find candidate junctions. Every junction claimed below
was then checked by eye at 4-8x. The script often drifted at crossings, so
where it stopped early I looked at the spot and restarted it.

Conventions established
-----------------------
Scan skew: lines drift by a few px over long runs, for example the y2758 line
reads 2759 at x4930 and 2754 at x4380. I allowed for this when following lines.

Junctions: in this scan a junction is a flared or bulging blob, clearly wider
than either line. Examples: (4932,2758), (5274,1362), (7310,1366), (4141,3731),
(4243,3731). Small ring-like dots also mark junctions: (7258,1113),
(7336,1113), (7346,3386), (7373,3412), (4903,3066). A crossing without a blob
was treated as not connected.

J101 box (crop j101-box.png): it has 4 notches at x 4855, 4880, 4907 and 4934,
and 5 cells. The leftmost cell (4830-4855) is empty and has no number. Each
printed number sits in the cell to the RIGHT of its notch, so the mapping is
notch 4855 = 4, 4880 = 3, 4907 = 2, 4934 = 1. Card wires land on all four
notches.

P101 prongs (motherboard, row below): prongs at 4855, 4880, 4907 and 4932.
Each number is printed to the right of its prong, so 4855 = 4, 4880 = 3,
4907 = 2, 4932 = 1. This agrees with the J101 box above it.

J102 box (j102-box.png): it has 7 notches at x 7300, 7328, 7354, 7380, 7408,
7435 and 7462. The leftmost cell (7275-7300) is empty. Each number is in the
cell to the right of its notch, so 7300 = 1, 7328 = 2, 7354 = 3, 7380 = 4,
7408 = 5, 7435 = 6, 7462 = 7. Card wires land on notches 1-6. There is no
wire above notch 7.

P102 prongs: 7300 = 1, 7326 = 2, 7352 = 3, 7380 = 4, 7407 = 5, 7435 = 6,
7460 = 7, with each number to the right of its prong. Motherboard wires leave
prongs 2, 3, 4 and 5 only.

Other connectors met on the routes (all read from the drawing):
- P173: prong x 4330 = 4, 4355 = 3, 4381 = 2, 4405 = 1. Numbers are to the
  right of the prongs. Crop: p173-area.png.
- P171/J171: P171 prong x 4140 = 11, 4167 = 10, 4192 = 9, 4218 = 8, 4243 = 7,
  4266 = 6, 4295 = 5, 4320 = 4, 4347 = 3, 4372 = 2, 4396 = 1. Numbers are to
  the right of the prongs. The printed J171 names are 1 6V, 2 0V, 3 POWER MUTE,
  4 REC MODE, 5 REC SIGNAL, 6 PLAY MUTE, 7 0V, 8 24V, 9 +B(15V), 10 -B(-15V),
  11 0V. Crop: p171.png.
- P180 (OUT SELECT PCB): prong x 2436 = 5, 2460 = 4, 2487 = 3, 2511 = 2,
  2538 = 1. Numbers are to the right. Crops: osel-top.png, p101-2-osel.png.
- P182 (MASTER OSC PCB): prong x 1381 = 8, 1405 = 7, 1432 = 6, 1457 = 5,
  1485 = 4, 1510 = 3, 1535 = 2, 1562 = 1. Numbers are to the right. Crop:
  mosc-top.png.
- P131 (to J131, IN/OUT PCB): prong x 1725 = 4, 1750 = 3, 1775 = 2, 1800 = 1.
  Numbers are to the right. Crop: p131.png.
- P107: 6734 = 1 ... 6892 = 7. P104: 7058 = 1, 7084 = 2, 7108 = 3, 7136 = 4,
  7163 = 5, 7192 = 6, 7218 = 7. Numbers are to the right. Crop:
  p107-p104.png.
- P121 (HEAD PCB J121): two prongs with no printed pin numbers. I call them
  "upper" (y 2957) and "lower" (y 2983). Crop: p121.png.
- The 2ch-8ch row (y ~3800-3870) repeats P101, P102, P104 and P107 with the
  same right-of-prong numbering. Crops: row-p101.png, row-p102.png,
  row-p107-p104.png.
- WARNING, a different convention: on J105/P105 (x 7690-7900) the printed
  numbers sit to the LEFT of their notches, and the empty cell is at the right
  end. So notch/prong 7718 = 1, ..., 7875 = 7. Crop: p105.png. The convention
  therefore differs between connectors. Each one must be established on its
  own, which is why I give the mapping for every connector used above.

Seams: a vertical stitching seam near x ~4398-4401 leaves 1-3 px gaps in every
horizontal line there. I bridged them because the line continues collinear on
both sides at the same width. I also bridged a 13 px gap on the P101-2 vertical
at y 3611-3624: the line is collinear above and below it and nothing else
starts or ends there.


J101-1
------
- card side: K101 coil, lower terminal (5328,1093), and D101 anode (lower end
  of the diode at 5402,1094). D101 is drawn with its bar at the top, so the
  cathode is at the top.
- card route: up from notch 4934 to the corner at (4938,1094), then right along
  y1094 to the coil terminal at (5328,1093), then on to the D101 anode corner at
  (5402,1094). The vertical crosses the thick bus at (4937,1362) with no dot
  (crop j101-1360.png). It crosses the J101-4 line at (4938,1171) with no dot
  (crop j101-top.png). Crops: card-ul.png, k101.png.
- motherboard side: the 0V net, made of:
  - P171-7, which is J171-7 "0V". P171-11, J171-11 "0V", is joined to it by
    the y3731 line with dots at (4243,3731) and (4141,3731).
  - P173-2.
  - P180-5, OUT SELECT PCB.
  - P182-4 and P182-7, MASTER OSC PCB.
  - P107-1 and P104-6 of this same channel-1 card.
  - 2ch-8ch P101-1, 2ch-8ch P107-1 and 2ch-8ch P104-6.
- motherboard route:
  - The P101-1 prong drop has a big dot at (4932,2758) onto a horizontal at
    y~2758 (crop p101-2758.png).
  - Going left along y2758: a dot at (4381,2755), where the thick P173-2 prong
    drops onto the line, and a dot at (4250,2756), where a thick vertical
    leaves downward. The line then reaches a corner at (4044,2755), goes down
    to (4044,2955) and turns left along y~2955. The crossings on 4044 at
    2777-2928 have no dots (p174-zoom.png). The P174 "3ch"/"4ch" arrows end at
    y~2730 and do not touch this wire.
  - Along y2955: a dot at (2440,2950), where a vertical goes down to P180-5 at
    (2435,3800) (osel-top.png). At the corner (1490,2950) the line goes down
    to P182-4 at (1485,3800), with a dot at (1485,3713) branching left along
    y3713 to P182-7 at (1405,3800) (mosc-top.png).
  - The thick vertical at x4250 runs down to P171-7 at (4243,3800), with a dot
    at (4243,3731) on the y3731 line (p171.png, p171-dots.png).
  - Going right along y2758 from P101-1: the crossings at P103, P106 and P108
    have no dots (y2760-p106.png). At the corner (5823,2760) the line goes
    down to (5828,2966) and right along y2966. A dot at (6734,2967) is P107-1,
    which drops thick through to 2ch-8ch P107-1. A dot or T at (7192,2969) is
    P104-6, which drops thick to 2ch-8ch P104-6 (p107-p104.png,
    row-p107-p104.png).
  - The P101-1 vertical itself continues thick down to 2ch-8ch P101-1 at
    (4925,3810). All crossings on it from 2853 to 3735 are without dots,
    including the y3734 line just above the 2ch-8ch row (row3734.png).
- shares a net with: card side, J101-2 only through the K101 coil and D101
  (components, not a wire). On the card wire itself, no other J contact.
  Motherboard side, the J171 0V rail (P171-7 and P171-11), P173-2, P180-5,
  P182-4, P182-7, ch-1 P107-1, ch-1 P104-6, and 2ch-8ch P101-1, P107-1 and
  P104-6.
- confidence: card CLEAR; motherboard CLEAR for the endpoints listed.
- note, not blocking: at (4249,2958) the x4250 0V vertical crosses a separate
  thick line. That line starts at a corner at (4147,2955) and runs right. The
  crossing shows mild corner rounding but no clear bulge, so I read it as a
  crossing (x4250-2957.png). If it were a junction, that line would also be 0V.
  I did not follow that line any further.


J101-2
------
- card side: K101 coil, upper terminal (5328,1018), and D101 cathode (upper,
  bar end, at 5402,1019). The italic "24V" printed beside this line at
  (5250,1003) is a printed DC value.
- card route: up from notch 4907 to the corner at (4912,1019), then right along
  y1019 to the K101 coil top and on to the D101 corner. It crosses the thick
  bus at (4909,1362) and the J101-4 line at (4912,1171), with no dot at either
  (j101-1360.png, j101-top.png).
- motherboard side: P180-2 (OUT SELECT PCB) and 2ch-8ch P101-2.
- motherboard route:
  - The P101-2 prong drop at x4906 crosses y2758, 2852 and 2961 without dots
    (p101-2758.png, p101-12-cross.png).
  - A T-junction dot at (4903,3066) branches left along y~3066 (line reads
    3056-3061 further left because of skew). The crossings at 4403, 4328,
    4250, 4174, 4147, 3996 and 3971 have no dots. The line reaches a corner at
    (2515,3056) and goes down at x~2511 to the P180-2 prong at (2511,3800)
    (p101-2-osel.png). The script lost the line at 3670 through drift, but it
    is visibly continuous in that crop.
  - The main x4906 vertical continues down to 2ch-8ch P101-2 at (4899,3810).
    One collinear 13 px gap at y3611-3624 is bridged.
- shares a net with: card side, J101-1 only through the K101 coil and D101.
  Motherboard side, OUT SELECT P180-2 and 2ch-8ch P101-2. None of the J171
  printed rails appears on this net. The "24V" on the card is only a printed
  voltage, and I found no wire to P171-8 "24V".
- confidence: card CLEAR; motherboard CLEAR.


J101-3
------
- card side: the card's thick common bus at y~1362. It is a thick line that
  runs from x 4882 to 8263 with no gaps. Its first named endpoints to the
  right of the J101 drop are C136 (lower end, dot at 5350,1362), C101 (dot at
  5392,1361), TR101 pin 2 (5475,1362), TR101 pin 4 (5513,1362), R102 (5572,
  1361), and R103/C102 (5652,1361), with many further component dots along
  it. A thick vertical leaves downward at a dot at (5274,1362), and another
  thick vertical at x5348 also continues down. Both descend into the J106
  box (gnd-down.png), but I did not establish which J106 contacts they are.
  The same bus carries the J102-1 dot (7310,1366) and the J102-6 dot
  (7443,1366). No printed rail name was observed on the bus, so I do not
  label it "0V".
- card route: up from notch 4880 to the corner at (4882,1362), then right. The
  crossings with the J101-2 and J101-1 verticals at (4909,1362) and
  (4937,1362) have no dots, and the crossing at (5219,1362) has no dot
  (gnd-bus.png).
- motherboard side: P121 lower contact (HEAD PCB), then J121, J401 and P401,
  ending at the REPRO HEAD (1ch) lower terminal.
- motherboard route:
  - The P101-3 prong drop at x4879 crosses y2758 without a dot
    (p101-2758.png) and turns left at the corner (4879,2832). The thick line
    runs left along y~2826-2817. The crossings at 4403, 4328, 4250, 4044,
    3997, 3973, 1903, 1878, 1800, 1774, 1644, 1618 and 1569 have no dots
    (x4250.png, x1600-1900.png, p174-zoom.png).
  - At the corner (1232,2824) the line goes down to (1232,2984), then left to
    the P121 lower prong at (1105,2984) (head-area.png, p121.png).
  - On the HEAD PCB, J121 goes to J401 (the open terminal at about 990,2985)
    and on to P401 and the REPRO HEAD lower lead (repro-head.png). I read the
    HEAD PCB part at 2-3x only.
- shares a net with: card side, J102-1 and J102-6 on the same thick card bus,
  and probably some J106 contacts (unresolved numbers). Motherboard side, only
  the P121 lower contact (repro head). I saw no motherboard link to the 0V
  net of P101-1.
- confidence: card CLEAR; motherboard CLEAR as far as P121. The HEAD PCB
  continuation is PARTIAL.
- blocking issue: none for the assigned contacts. The J106 pin numbers of the
  two thick verticals are not established.


J101-4
------
- card side: K101 contact, the lower fixed contact (terminal dot at
  5284,1171). The relay common contact at (5338,1158) feeds L101, TR101 pin 1
  and so on. As drawn, the armature rests toward the upper fixed contact
  (5284,1146), which is the x5220 wire.
- card route: up from notch 4855 to the corner at (4859,1171), then right
  along y1171 to the lower fixed contact. The crossings at (4912,1171),
  (4938,1171) and (5219,1171) have no dots (j101-top.png, k101.png).
- motherboard side: P121 upper contact (HEAD PCB), then J121, J401 and P401,
  ending at the REPRO HEAD (1ch) upper terminal.
- motherboard route:
  - The P101-4 prong drop at x4853 crosses y2758 without a dot and turns left
    at the corner (4853,2806). It runs left along y~2806-2791, bridging the
    seam at 4398-4401. The crossings at 4404, 4330, 4250, 4044, 3997, 3973,
    1903, 1878, 1800, 1774, 1644, 1618 and 1569 have no dots (p173-4.png,
    x4250.png, x1600-1900.png).
  - At the corner (1210,2799) the line goes down to (1210,2957), then left to
    the P121 upper prong at (1105,2957) (head-area.png, p121.png).
- shares a net with: card side, none. Motherboard side, only the P121 upper
  contact (repro head).
- confidence: card CLEAR; motherboard CLEAR to P121. The HEAD PCB continuation
  is PARTIAL (read at 2-3x).


J102-1
------
- card side: the card's thick common bus at y~1366. This is the same
  continuous bus as J101-3: the line was followed with no gap from 4882 to
  8263.
- card route: a thick drop from notch 7300 up x7310 to a big dot at
  (7310,1366). It crosses the y1469 line at (7310,1469) with no dot
  (j102-1366.png).
- motherboard side: no wire observed below the P102-1 prong (7300). I checked
  down to y3150 (p102-below.png). The 2ch-8ch P102-1 also has no wire above it
  (row-p102.png).
- motherboard route: none observed.
- shares a net with: card side, J101-3 and J102-6, with probable J106 contacts
  via the bus. Motherboard side, none observed.
- confidence: card CLEAR; motherboard CLEAR (no wire observed, which is an
  observation and does not prove a no-connect).


J102-2
------
- card side: K102 reed-contact right terminal (7213,1113) and R164 upper end
  (dot at 7258,1113). The same node also takes J102-5.
- card route: up from notch 7328 along x~7336. It crosses the y1469 and y1366
  lines without dots (j102-1366.png) and meets the y1113 line at a junction
  dot at (7336,1113) (j102-1113.png). Left along y1113 are the R164 dot at
  7258 and the K102 contact at 7213. Right along y1113 the line crosses
  x7365 (J102-3) and x7392 (J102-4) without dots and turns down at the corner
  (7419,1113) into J102-5 (k102.png).
- motherboard side: P131-1, then J131-1 (IN/OUT PCB), ending at the centre
  (signal) terminal of the 1ch OUTPUT jack at (1800,2015).
- motherboard route:
  - The P102-2 drop at x~7325 crosses y3024 and y3202 without dots
    (p102-mid.png). It reaches the corner (7321,3359) and runs left along
    y~3359, which reads y3335 by x2500 because of skew.
  - The crossings have no dots at 7187, 7159-7053, 6886-6729, 5770, 5695,
    5389, 5362, 5337, 5312, 5133-5030, 4927, 4901, 4324, 4271, 4245, 4222,
    4195, 4171, 4142, 2540, 2513, 2463, 2436, 2216, 2190 and 2166 (strip-a.png,
    strip-b.png, strip-c.png, strip-d.png, p180-cross.png,
    p102-2-left.png). The seam at ~4398 and a 1 px gap at 2308 are bridged.
  - At the corner (1798,3333) the line goes UP x1800, crossing y3180-2764
    without dots, to the P131-1 prong at (1800,2680) (p131.png). Above that it
    passes J131-1 and the IN/OUT PCB terminal "1" (open circle at 1800,2190),
    and goes on up to the 1ch OUTPUT jack centre (inout-1ch.png).
- shares a net with: card side, J102-5 (a direct wire, through dot 7336,1113).
  Motherboard side, the 1ch OUTPUT jack only. No 2ch-8ch connection was
  observed: the 2ch-8ch P102-2 vertical at x7318 comes from a different line.
- confidence: card CLEAR; motherboard CLEAR.


J102-3
------
- card side: K102 coil, lower terminal (dot at 7192,1037), and D120 anode
  (lower end at 7123,~1037). D120 is drawn with its bar at the top, so the
  cathode is at the top. The label "D120" was read at 4x (d-label.png).
- card route: up from notch 7354 along x~7362. It crosses y1469, y1366 and
  y1113 without dots (j102-1366.png, j102-1113.png) and turns at the corner
  (7366,1037) left along y1037 to the coil dot and on to the D120 corner
  (k102.png).
- motherboard side: P171-3, which is J171-3 "POWER MUTE", and 2ch-8ch P102-3.
- motherboard route:
  - The P102-3 drop at x~7350, drifting to 7346, crosses y3024 and y3202
    without dots. At the junction dot (7346,3386) a branch runs left along
    y~3386, which reads 3372 near x4350 because of skew.
  - The branch crossings have no dots at 7187, 7159-7053, 6888-6729, 5770,
    5695, 5389-5309, 5133-5029, 4927 and 4901 (strip-a/b/c.png,
    p102-3386.png). It reaches the corner (4350,3372) and runs down x4348,
    crossing 3396-3734 without dots (strip-d.png, x4347.png), to the P171-3
    prong at (4348,3800). On the J171 side that is pin 3, "POWER MUTE"
    (p171.png).
  - The main drop continues down x~7345 to 2ch-8ch P102-3 (row-p102.png).
- shares a net with: card side, J102-4 only through the K102 coil and D120.
  Motherboard side, the J171-3 POWER MUTE rail and 2ch-8ch P102-3.
- confidence: card CLEAR; motherboard CLEAR.


J102-4
------
- card side: K102 coil, upper terminal (dot at 7192,960), and D120 cathode
  (upper bar end at 7123,~989 via the y960 line). The italic "24V" printed at
  (7225,948) is a printed DC value.
- card route: up from notch 7380 along x~7390. It crosses y1469, y1366 and
  y1113 without dots and turns at the corner (7393,960) left along y960 to the
  coil dot and the D120 corner (k102.png).
- motherboard side: P180-3 (OUT SELECT PCB) and 2ch-8ch P102-4.
- motherboard route:
  - The P102-4 drop at x~7375, drifting to 7373, crosses y3024 and y3202
    without dots. At the junction dot (7373,3412) a branch runs left along
    y~3412, which reads 3387 near x2500 because of skew.
  - The branch crossings have no dots at 7346 (the P102-3 drop, crossing
    only), 7187, 7159-7053, 6888-6727, 5770, 5695, 5389-5309, 5133-5029,
    4927, 4900, 4350 (the POWER MUTE drop), 4323, 4271, 4245, 4222, 4195,
    4170, 4142, 2540 and 2512 (strip-a/b/c/d.png, p180-cross.png).
  - At the corner (2488,3387) the line goes down x2487 to the P180-3 prong at
    (2487,3800) (p180-cross.png, osel-top.png). It was followed with the
    script to y3929, and the board-side terminal "3" sits at about
    (2487,3875).
  - The main drop continues down x~7372 to 2ch-8ch P102-4 (row-p102.png).
- shares a net with: card side, J102-3 only through the K102 coil and D120.
  Motherboard side, OUT SELECT P180-3 and 2ch-8ch P102-4. I found no wire to
  P171-8 "24V".
- confidence: card CLEAR; motherboard CLEAR.


J102-5
------
- card side: the same node as J102-2, made up of the K102 reed-contact right
  terminal (7213,1113), R164 upper end (7258,1113) and the J102-2 drop
  (dot at 7336,1113).
- card route: up from notch 7408 along x~7416. It crosses y1469 and y1366
  without dots and reaches the corner (7419,1113), then runs left along
  y1113. It crosses x7392 and x7365 without dots and arrives at the dot at
  7336 (j102-1113.png).
- motherboard side: P105-1 of this same channel-1 card. P105 numbers are
  printed to the LEFT of the prongs, and prong 7716 is "1" (p105.png).
- motherboard route: the P102-5 drop at x7406 goes down to the corner
  (7406,2840) and right along y~2840 with no crossings to the corner
  (7716,2836). It then goes up to the P105-1 prong (7716,2720). The P102-5
  drop does not continue below 2840 (p102-below.png).
- shares a net with: card side, J102-2 (direct wire). Motherboard side,
  ch-1 J105-1/P105-1. The card-side route of J105-1 was started but not
  traced: it runs up x7718 to a corner near (7725,1605) and on toward
  x~7547 (j105-1-top.png). That is outside my assignment.
- confidence: card CLEAR; motherboard CLEAR.


J102-6
------
- card side: the card's thick common bus at y~1366 (junction dot at
  7443,1366). It is the same continuous bus as J101-3 and J102-1.
- card route: up from notch 7435 along x~7443. It crosses y1469 without a dot
  and reaches the dot at (7443,1366) (j102-1366.png).
- motherboard side: no wire observed below the P102-6 prong (7435), checked to
  y3150 (p102-below.png). The 2ch-8ch P102-6 also has no wire above it.
- motherboard route: none observed.
- shares a net with: card side, J101-3 and J102-1, plus the probable J106
  contacts via the bus. Motherboard side, none observed.
- confidence: card CLEAR; motherboard CLEAR (no wire observed).


J102-7
------
- card side: no wire observed above notch 7462 (j102-box.png,
  j102-card-col.png).
- card route: none.
- motherboard side: no wire observed below the P102-7 prong (7460) to y3150.
  The 2ch-8ch P102-7 also has no wire above it.
- motherboard route: none.
- shares a net with: none observed on either side.
- confidence: card CLEAR (no wire observed); motherboard CLEAR (no wire
  observed). Both are observations, not proof of a no-connect.


Summary of motherboard endpoints
--------------------------------
- J101-1: 0V. This covers P171-7 and P171-11 (J171 "0V"), P173-2, P180-5,
  P182-4, P182-7, ch-1 P107-1, ch-1 P104-6, and 2ch-8ch P101-1, P107-1 and
  P104-6.
- J101-2: P180-2 (OUT SELECT) and 2ch-8ch P101-2.
- J101-3: P121 lower contact (repro head 1ch).
- J101-4: P121 upper contact (repro head 1ch).
- J102-1: none observed.
- J102-2: P131-1, J131-1 and the 1ch OUTPUT jack (centre).
- J102-3: P171-3 (J171 "POWER MUTE") and 2ch-8ch P102-3.
- J102-4: P180-3 (OUT SELECT) and 2ch-8ch P102-4.
- J102-5: ch-1 P105-1.
- J102-6: none observed.
- J102-7: none observed.

Card-side groupings:
- The thick card bus joins J101-3, J102-1 and J102-6.
- A direct wire joins J102-2 and J102-5.
- K101 coil and D101 sit between J101-1 and J101-2.
- K102 coil and D120 sit between J102-3 and J102-4.
