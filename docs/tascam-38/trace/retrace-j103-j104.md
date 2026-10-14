Independent blind re-trace: J103 pins 1-6, J104 pins 1-7 (channel-1 drawing)

Source: scratchpad/amp/full-1.png (9000 x 5250). All coordinates are full-res pixels (x, y).
Crops: scratchpad/blind/crops-j103-j104/ (file names cited in brackets).

CONVENTIONS ESTABLISHED

Pin-number-to-notch mapping. Every connector box has one more cell than it has
notches. The extra, empty cell tells you which side of its notch each number sits on.

- J103 (box x 5010-5190, y 2650-2690) [j103-box.png]: leftmost cell (5010-5037) is empty.
  Notches at 5037, 5062, 5088, 5114, 5140, 5165. Each printed number sits immediately
  RIGHT of its notch: pin6=5037, pin5=5062, pin4=5088, pin3=5114, pin2=5140, pin1=5165.
  Card wires land on notches 5037, 5062, 5088 and 5140. Notches 5114 (pin 3) and
  5165 (pin 1) have no wire.
- P103 (prongs y ~2700-2712, numbers below): prongs at 5037, 5062, 5086, 5114, 5138, 5165,
  same rule (number right of / under-right of its prong). Wires leave 5035, 5061, 5086
  and 5138 (pins 6, 5, 4, 2). Prongs 3 and 1 have no wire. This matches the card side.
- The lower P103 row (2ch-8ch amplifier row, prongs y ~3805-3815) [p103-lower.png] has
  prongs at 5028(6), 5054(5), 5080(4), 5106(3), 5131(2), 5158(1), with each number to
  the right of its prong. Wires land on 6, 5, 4 and 2.
- J104 (box x 7035-7240) [p104-top.png, j104-low.png]: leftmost cell (7035-7058) is empty,
  so each number is right of its notch: pin1=7058, 2=7085, 3=7110, 4=7136, 5=7163, 6=7190,
  7=7215. Card wires land on 1-6. Pin 7 has no wire.
- P104 prongs at 7057(1), 7083(2), 7108(3), 7135(4), 7163(5), 7190(6), 7215(7), with the
  same rule. Wires leave 1-6, and pin 6 is a thick line. Pin 7 has no wire.
  On the lower (2ch-8ch) P104 row [p104-down.png] the box also has an empty left cell,
  and the numbers are right of their prongs.
- Other connectors I used as endpoints, all checked the same way:
  - J107/P107 [j107-box.png]: empty left cell, numbers right of notch. Prongs at
    6733(1), 6758(2), 6785(3), 6810(4), 6838(5), 6865(6), 6890(7).
  - J106/P106 [p106-top.png]: prongs at 5268(8), 5293(7), 5318(6), 5343(5), 5368(4),
    5393(3), 5420(2), 5445(1), with numbers right of prong.
  - J105/P105 [p105-top.png]: the empty cell is on the RIGHT (7875-7900), so each number
    is LEFT of its notch. Prongs at 7718(1), 7745(2), 7770(3), 7795(4), 7820(5),
    7847(6), 7872(7).
  - J101/P101 [p101.png]: empty left cell. Notches at 4855(4), 4880(3), 4907(2), 4933(1).
  - J173/P173 [p173.png]: empty left cell. 4330(4), 4357(3), 4380(2), 4405(1).
  - J174/P174 [p174.png]: empty left cell. 3973(1), 3998(2), 4022(3, arrow "3ch"),
    4048(4, arrow "4ch").
  - P171/J171 [p171-verts.png, j171-out.png]: empty left cell, numbers right of notch.
    Prongs and notches are vertically aligned: 4140(11), 4167(10), 4192(9), 4217(8),
    4242(7), 4270(6), 4295(5), 4320(4), 4347(3), 4373(2), 4397(1).
    Printed signal names, read by following each J171 lead to its arrow:
    11=0V (thick), 10=-B(-15V), 9=+B(15V), 8=24V, 7=0V (thick), 6=PLAY MUTE,
    5=REC SIGNAL, 4=REC MODE, 3=POWER MUTE, 2=0V, 1=6V.
  - P181/J181, OUT SELECT PCB [down-2170.png, lower-boards.png]: empty left cell.
    Prongs at 2163(3), 2187(2), 2213(1).
  - P180/J180, OUT SELECT PCB [p180-p181.png]: empty left cell.
    Prongs at 2435(5, thick), 2461(4), 2486(3), 2511(2), 2536(1).
  - P182/J182, MASTER OSC PCB [down-1463.png]: empty left cell, numbers right of prong.
    The prong I needed is P182-5, at x ~1457.

Junction rule as observed. A junction is a filled round dot, about 8-12 px across,
that reads as a ring at high zoom. A thin line crossing a thick bus leaves a grey
square blob that is NOT round. I treated those blobs as plain crossings, and checked
each one I relied on at 6-10x.

Scan seams I bridged. Each is a gap of a few pixels in otherwise collinear lines:
- a vertical seam at x ~6475-6480, which cuts every horizontal line there;
- a vertical seam at x ~4395-4400;
- a horizontal seam at y ~2165 across the J104 card wires;
- a vertical seam at x ~4762, which shifts the horizontals down by about 4-6 px to
  its right. Each line is bridged to its offset continuation, and ordinal position
  is preserved.

A stitching kink on the P103-4 vertical at (5086, 2932) is a 1-2 px lateral offset,
not a dot [p103-kink.png]. A scan blemish at (5390-5440, 3045-3070) damages the P106-3
and P106-2 verticals locally. Both are bridged as collinear [blemish.png].

Drift. Long motherboard horizontals slope by about +5 px per 1400 px to the right
(for example, the J103-5 line runs at y 3010 at x 4174 and at y 3027 at x 7845). Where
lines are packed about 25 px apart, I tracked them by ordinal position. I checked that
no line starts or ends inside the band in each crop I used (band-*.png).

---

J103-1
- card side: no wire observed above notch x 5165.
- card route: none.
- motherboard side: no wire observed below prong x 5165, on either the ch1 P103 row or the lower 2ch-8ch P103 row.
- motherboard route: none.
- shares a net with: none observed.
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire).
- blocking issue: none.

J103-2
- card side: R129 (100k) top terminal and D104 cathode. D104 is drawn with its bar on the left, with the triangle pointing left at the J103-2 wire. D104's anode goes on to the gate (arrowed bottom terminal) of FET Q103. The italic "24V" is printed at the node.
- card route: vertical at x 5140 up from the J103 box to (5140, 1562), then right along y 1562. It crosses thick verticals 5218, 5268 and 5345 without dots [thickcross.png], and the R127 vertical at 5514 without a dot [r127-cross.png]. Dot at (5565, 1562) = R129 top. Continues to the D104 cathode at about x 5600. The D104 anode at about 5640 runs right to 5651, down to y 1650, right to 5832, then up to Q103's gate [q101-q103.png].
- motherboard side: P104-5 (so J104-5 on the card); P181-2 = J181-2 on the OUT SELECT PCB; and the lower (2ch-8ch) P103-2. The P104-5 vertical also continues down to the lower P104-5.
- motherboard route: P103-2 vertical at x 5137 down. Dot at (5137, 3040) onto a horizontal at about y 3040 [p103-dots.png].
  - Rightward along y 3042-3047: crosses P106 verticals 5315-5445 (all plain; 5420 sits in the blemish, and no round dot is visible there), P107 verticals 6733-6890 (plain) and P104 verticals 7057-7135 (plain). Ends at a dot on the P104-5 vertical at (7163, 3047) [p104-top.png].
  - Leftward: the line runs at y 3035 near x 4400 and y 3024 near x 2500. It crosses P101 verticals 4905 and 4932, 4325, thick 4248, 4174 and thick 4145 (all plain) [strip-l1-z.png, strip-l2-z.png], then 3970/3995 and thick 2440 (plain). Corner at (2193, 3024), then down at x ~2190 to the P181-2 prong [strip-l5-z.png, down-2170.png].
  - The P103-2 vertical continues down to the lower P103-2 with no further dots between 3040 and 3800 [p103-mid.png, p103-lower.png].
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J104-5 (via P104-5), J181-2 (OUT SELECT), the lower P103-2 and the lower P104-5.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none.

J103-3
- card side: no wire observed above notch x 5114.
- card route: none.
- motherboard side: no wire observed below prong x 5114, on either the ch1 or the lower P103 row.
- motherboard route: none.
- shares a net with: none observed.
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire).
- blocking issue: none.

J103-4
- card side: R127 (100k) top terminal and D102 cathode. D102 has its bar on the left, with the triangle pointing left at the wire. D102's anode goes to the gate (arrowed bottom terminal) of FET Q101. The italic "-15V" is printed at the node (a DC value).
- card route: vertical at x 5088 up to (5088, 1508), then right along y 1508. It crosses 5218, 5268 and 5345 without dots [j103-turns.png, thickcross.png]. Dot at (5514, 1508) = R127 top. The line continues to the D102 cathode at about 5605. The D102 anode runs right to (5835, 1508), then up to Q101's gate [q101-q103.png].
- motherboard side: P181-3 = J181-3 on the OUT SELECT PCB; the lower (2ch-8ch) P103-4; and J103-6 (tied on the motherboard, see the route).
- motherboard route: P103-4 vertical at x 5086 down. It passes the thick y 2760, 2855 and 2960 lines without dots, and the seam kink at (5086, 2932). Dot at (5086, 2990) on a short horizontal at y 2990. That horizontal ends at this dot, and its other dot is at (5034, 2990) on the P103-6 vertical. It crosses the P103-5 vertical at 5060 without a dot [p103-dots.png].
  - From the P103-6 dot the y 2990 line runs left: about y 2984 at x 4400, about 2975 at 2700, about 2971 at 2500. No dots at P101 4905/4932, 4325, 4248, 4174 (the 4174 dot is on the line below), 4145, 3970/3995 or 2440 [strip-l1-z.png to strip-l5-z.png]. Corner at (2168, 2971), then down at x ~2165 to the P181-3 prong. No dots on that vertical [down-2170.png].
  - The P103-4 vertical also continues down to the lower P103-4 with no dots [p103-mid.png, p103-lower.png].
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J103-6, J181-3 (OUT SELECT), the lower P103-4 and the lower P103-6.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none. The J103-4 / J103-6 tie rests on two clear ring dots on one horizontal at y 2990, and I checked it at 5x.

J103-5
- card side: R127 bottom terminal and R129 bottom terminal. The same line continues to the bottom terminals of C141 (0.47/50V), R158 (100k), C142 (0.47/50V), R131 (100k) and R125 (100k), and to one terminal of C143 (0.47/50V). The italic "-15V" is printed above the line near x 5450.
- card route: vertical at x 5062 up to (5062, 1677), then right along y 1677. It crosses 5088, 5140, 5218, 5268 and 5345 without dots. Dots at (5514, 1677) for R127 and (5566, 1677) for R129. It crosses 6150 and 6203 without dots. Dots at (6287, 1677) C141, (6336, 1677) R158, (6416, 1677) C142 and (6468, 1677) R131. Seam gap at about 6478, bridged. Dot at (6597, 1677) R125. The line ends at a corner at (6650, 1677) going up into C143 [j103-right1.png, strip-5800.png, pin5-line.png].
- motherboard side: P171-10, whose printed J171 signal name is -B(-15V). Also P182-5 = J182-5 on the MASTER OSC PCB; P106-3 (J106-3); P107-4 (J107-4); P105-6 (J105-6); and the lower (2ch-8ch) P103-5.
- motherboard route: P103-5 vertical at x 5060. Dot at (5060, 3015) on a horizontal at about y 3015 [p103-dots.png].
  - Rightward: dot at (5392, 3016) on the P106-3 vertical. That vertical runs up to the P106-3 prong and down through the blemish, crossing the thick y 3118 line without a round dot, toward the lower P106 row [strip-r1-zoom.png, x5392-vert.png, p106-3115.png]. The line crosses 5445, 5700 and 5773 without dots [cross-5420.png]. Seam at about 6475. Dot at (6810, 3022) on the P107-4 vertical [p107-area.png]. It crosses the P104 verticals and P102 7325/7350/7375 without dots [p104-top.png, p102-cross.png], crosses P105-5 (7820) without a dot, and ends at a dot on the P105-6 vertical at (7845, 3027) [p105-top.png].
  - Leftward: dot at (4174, 3010) on a vertical that runs down, crossing every horizontal without dots, to the P171-10 prong at x ~4168. That prong maps to J171-10 = -B(-15V) [strip-l2-z.png, p171-verts.png, j171-out.png]. The line continues left (about y 3000 at 2700, about 2998 at 1900), with no dots at 4145, 3970/3995, 2440, 2168, 1880, 1800, 1775, 1660, 1617, 1570 or 1490 [strip-l6-z.png]. Corner at (1463, 2999), then down to the P182-5 prong at x ~1457. It crosses the thick 3615/3640 lines and the 3700 stub without dots [down-1463.png].
  - The P103-5 vertical continues down to the lower P103-5 with no dots.
  - The downward continuations of P106-3, P107-4 and P105-6 below y ~3100 were NOT followed to their lower-row prongs.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: no other assigned contact. Other connectors: J106-3, J107-4, J105-6, J171-10 (-B(-15V)), J182-5 (MASTER OSC) and the lower P103-5.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none for the endpoints listed. Where the lower-row continuations of P106-3, P107-4 and P105-6 land is not traced.

J103-6
- card side: R126 (82k) left terminal. R126's right terminal is at a dot at (6598, 1490), where the italic "-15V" is printed (a DC value); R125 top and C143 hang from that node.
- card route: vertical at x 5037 up to (5037, 1730), then right along y 1730. It crosses 5062, 5088, 5140, 5218, 5268 and 5345 without dots [j103-turns.png, thickcross.png], and 5782 without a dot [x5782-cross.png]. It reaches (6202, 1730), goes up at x 6202 (crossing y 1677 without a dot), and turns right at (6202, 1490). Along y 1490 it crosses 6337 and 6469 without dots, with a seam gap at 6475-6480 bridged, and runs to the R126 left terminal at about 6520 [strip-5800.png, r126-line.png].
- motherboard side: J103-4 (motherboard tie), P181-3 = J181-3 on the OUT SELECT PCB, and the lower (2ch-8ch) P103-6.
- motherboard route: P103-6 vertical at x 5034 down. It crosses thick 2760, 2855 and 2960 without dots. Dot at (5034, 2990). From there the route is as for J103-4: right to the P103-4 dot at (5086, 2990), and left to the P181-3 corner at (2168, 2971). The P103-6 vertical continues down to the lower P103-6 with no dots.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J103-4, J181-3 (OUT SELECT), the lower P103-6 and the lower P103-4.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none.

J104-1
- card side: D119 cathode. D119's triangle points down at its bar, which is the cathode, at about (6098, 1317). Its anode goes up to (6098, 1200), then left to the gate (arrowed right-hand terminal) of FET Q107. The italic "-6.8V" is printed beside the node.
- card route: vertical at x 7062 up to (7062, 1985), then right along y 1985. It crosses J104 pins 2-5 without dots [j104-turns.png]. At (7198, 1985) it goes up at x 7199, crossing the y 1467 "-13.5V" line without a dot [j104-pin1-top.png], and turns left at (7199, 1441). Along y 1440 it crosses 6925 without a dot [j104-pin1-top.png]; crosses 6600, 6470 and 6337 without dots, with a seam at 6478 bridged [pin1-cross.png]; and crosses 6152 without a dot. Corner at (6098, 1440), then up, crossing the thick y 1362 bus without a dot, to the D119 cathode [pin1-left.png, d119.png, d119-fet.png].
- motherboard side: P171-6 = J171-6, printed signal name PLAY MUTE; and the lower (2ch-8ch) P104-1.
- motherboard route: P104-1 vertical at x 7056 down. It crosses the thick 2970 line without a dot, and crosses 3022, 3047 and 3201 without dots. Dot at (7054, 3282), then left along that line (about y 3268 at 4450). It crosses P107 6733-6888 without dots [p107-cross.png] and the P106, P103 and P101 verticals without dots [p104-left2.png, band-4450.png]. Corner at (4272, 3270), then down at x ~4271 to the P171-6 prong [band-3800.png, thick-down.png, j171-out.png]. The P104-1 vertical also continues down to the lower P104-1 [p104-down.png].
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: no other assigned contact. Other endpoints: J171-6 (PLAY MUTE) and the lower P104-1.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none. Note that the leftward band tracking from x 7000 to 4272 relies on ordinal line position across densely packed parallels. I re-checked it at each crop boundary.

J104-2
- card side: Q109's arrowed upper-right terminal (the emitter; the arrow points away from the base bar) and R133 (100k) right terminal. They meet at the dot at (6953, 1618). The italic "24V" is printed at the upper right of Q109.
- card route: vertical at x 7090 up from the box. It crosses y 2038, 1985 and 1930 without dots, and crosses the R138/R139 line at y 1803 without a dot [pin2-r139.png]. At (7090, 1618) it turns left to the dot at (6953, 1618), which is R133's right terminal. From that dot a lead goes up to (6953, 1545) and left to Q109's upper-right arrowed terminal [j104-mid.png, q108-q109.png, q109-zoom.png].
- motherboard side: P180-4 = J180-4 on the OUT SELECT PCB; and the lower (2ch-8ch) P104-2.
- motherboard route: P104-2 vertical at x 7083 down. Dot at (7080, 3306), then left (about y 3292 at 4450, 3288 at 3810, 3284 at 2820). No dots at the P107, P106, P103 or P101 verticals, 4145-4375, or 2540/2513 [band-*.png, band-1800-z.png]. Corner at (2463, 3284), then down to the P180-4 prong. It crosses the thick 3515/3620/3643 lines without dots [p180-p181.png, p180-thick.png]. The P104-2 vertical continues down to the lower P104-2.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J180-4 (OUT SELECT) and the lower P104-2.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none. Q109's polarity is read from a small arrow; the terminal identity (the arrowed lead) is clear.

J104-3
- card side: D109 anode. D109's triangle points up at its bar, so the cathode is at the top (about y 1891). The cathode goes to R139 (68) and on to the R138 / C119 node. An italic "24V" with a leader arrow points at this wire just below D109, at (7114, 1922).
- card route: vertical at x 7110-7114 up from the box. It crosses y 2038, 1985 and 1930 without dots [j104-turns.png, j104-d109.png] and reaches the D109 anode at about (7114, 1910).
- motherboard side: P107-7 = J107-7, and P174-1 = J174-1 (the connector row under the FUNCTION PCB).
- motherboard route: the P104-3 vertical at x 7108 runs down to a corner at (7107, 3229). It does NOT continue to the lower P104-3: there is a gap between 3231 and 3250 [p104-dots.png]. From the corner it runs left along about y 3229. Dot at (6888, 3229) where the P107-7 vertical comes down from the P107-7 prong and ends in a T [p107-cross.png]. The line continues left (about y 3222 at 5090, 3217 at 4450, 3212 at 3970) and crosses the other verticals without dots. Corner at (3970, 3212), then up to the P174-1 prong. It crosses the thick 2955/2850/2822 lines without dots [band-3800.png, p174.png, p174-thick.png, p174-2822.png].
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J107-7 and J174-1.
  - Related but separate: the lower P104-3 sits on a different line at about y 3254. That line ties to a vertical going down from (6886, 3254) and to P174-2. It is NOT this net.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none.

J104-4
- card side: D118 anode. D118's bar is on the left and the triangle points left, so the wire enters the flat (anode) side. D118's cathode goes to R204 (68k), then to the dot at (6702, 1545) on Q109's left-hand (collector) lead line.
- card route: vertical at x 7137-7143 up from the box. It crosses y 2038, 1985 and 1930 without dots. At (7143, 1906) it jogs right to x 7168 (the J104-5 vertical stays at 7170 below 1931, so they are separate), then goes up to (7168, 1495) and left along y 1495, with no crossings, to the D118 anode at about 6838 [j104-d109.png, j104-mid.png, q108-q109.png].
- motherboard side: P181-1 = J181-1 on the OUT SELECT PCB; and the lower (2ch-8ch) P104-4.
- motherboard route: P104-4 vertical at x 7135 down. Dot at (7131, 3332), then left (about y 3318 at 4450, 3313 at 3810, 3311 at 2820), crossing the verticals without dots. Corner at (2217, 3307), then down to the P181-1 prong. It crosses the thick lines without dots [band-1800.png, band-1800-z.png, p180-p181.png]. The P104-4 vertical continues down to the lower P104-4.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J181-1 (OUT SELECT) and the lower P104-4.
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none.

J104-5
- card side: R135 (18k) bottom terminal. R135's top goes to the D108 anode node at (6795, 1748). The italic "24V" is printed on the line.
- card route: vertical at x 7162-7170 up to (7170, 1931), then left along y 1930. It crosses 7143, 7114 and 7090 without dots [j104-d109.png], and crosses the J104-6 vertical at 6958 without a dot [pin6-pin5-cross.png]. Corner at (6793, 1930), then up into R135.
- motherboard side: P103-2, so it shares a net with J103-2. Via that net it reaches P181-2 = J181-2 (OUT SELECT) and the lower P103-2. The P104-5 vertical also continues down to the lower P104-5.
- motherboard route: P104-5 vertical at x 7163 down. Dot at (7163, 3047) on the J103-2 horizontal. The vertical continues down to the lower P104-5 with no further dots [p104-top.png, p104-down.png]. For the rest of the route, see J103-2.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: J103-2 (and through it J181-2, the lower P103-2 and the lower P104-5).
- confidence: card CLEAR; motherboard CLEAR.
- blocking issue: none.

J104-6
- card side: three terminals meet at the dot at (6958, 1903): R137 (47k) bottom terminal, C119 (2.2/50V) curved-plate terminal, and Q108's arrowed lower-left terminal (the emitter).
- card route: vertical at x 7197 up to (7198, 2038), separate from the J104-1 vertical above 1987 [j104-turns.png]. It runs left along y 2038, crossing J104 pins 5-1 without dots, to (6958, 2038), then up. It crosses y 1930 without a dot and reaches the dot at (6958, 1903) [j104-mid.png, pin6-pin5-cross.png].
- motherboard side: a thick bus (0V). Endpoints on it:
  - P171-7 = J171-7, printed "0V";
  - P107-1 = J107-1;
  - P101-1 = J101-1;
  - P173-2 = J173-2 (the connector row under the FUNCTION PCB);
  - the lower (2ch-8ch) P104-6.
- motherboard route:
  - The thick P104-6 vertical at x 7190 has a large dot at (7190, 2970) on a thick horizontal [p104-top.png]. Along that horizontal: P104-1..5 are crossed without dots. Dot at (6733, 2968) on the thick P107-1 vertical. P107 2-7 are crossed without dots [p104-left1.png, p107-area.png]. The horizontal continues left to a corner at (5822, 2965), goes up to (5822, 2762), and runs left along thick y 2762. P108 1-4, P106 and P103 are crossed without round dots [thick-5822.png, thick2762-a.png].
  - Dot at (4932, 2760) on the thick P101-1 vertical [p101.png]. Dot at (4380, 2755) on the thick P173-2 vertical [p173.png]. Dot at (4250, 2755): a thick vertical runs down from it to the P171-7 prong (0V). The thick line ends at a corner at (4045, 2754), runs down to (4045, 2955), and continues left along thick y 2955 past x 3940, crossing P174-1 and P174-2 without dots [thick2762-b.png, thick-down.png, p174-thick.png]. That leftward branch beyond x 3940 was NOT followed.
  - The thick P104-6 vertical continues down to the lower P104-6, crossing the thin lines at 3201 and 3360-3487 without dots [p104-dots.png, p104-6-cross.png].
  - Not resolved: a possible blob where the thick P171-7 vertical meets the thick y ~2955 line from about x 4150 (P171-11's line). It is unverified, but both of those are 0V.
- shares a net with:
  - card side: no other J103/J104 contact.
  - motherboard side: no other assigned contact. Other endpoints: J171-7 (0V), J107-1, J101-1, J173-2 and the lower P104-6.
- confidence: card CLEAR; motherboard PARTIAL.
- blocking issue: the identity of the net is clear (it reaches J171-7 "0V"). Its full extent is not exhaustively traced: the thick branch continuing left of (3940, 2955) is unfollowed, as is the possible tie to the P171-11 line at about (4250, 2955).

J104-7
- card side: no wire observed above notch x 7215 [j104-low.png].
- card route: none.
- motherboard side: no wire observed below prong x 7215, on either the ch1 or the lower P104 row [p104-top.png, p104-down.png].
- motherboard route: none.
- shares a net with: none observed.
- confidence: card CLEAR (no wire); motherboard CLEAR (no wire).
- blocking issue: none.

---

SUMMARY OF MOTHERBOARD TIES AMONG THE ASSIGNED CONTACTS
- J103-4 and J103-6 are tied (dots at (5034, 2990) and (5086, 2990)), and the net goes to J181-3 on the OUT SELECT PCB.
- J103-2 and J104-5 are tied (dot at (7163, 3047)), and the net goes to J181-2 on the OUT SELECT PCB.
- J103-5 goes to the P171-10 bus contact, whose J171 signal name is -B(-15V). It also goes to J182-5 (MASTER OSC), J106-3, J107-4 and J105-6.
- J104-1 goes to the P171-6 bus contact, whose J171 signal name is PLAY MUTE.
- J104-2 goes to J180-4 (OUT SELECT).
- J104-3 goes to J107-7 and J174-1.
- J104-4 goes to J181-1 (OUT SELECT).
- J104-6 goes to the thick 0V bus (J171-7 "0V", J107-1, J101-1, J173-2).
- J103-1, J103-3 and J104-7 have no wire on either side.
- J103-2, -4, -5 and -6, and J104-1, -2, -4, -5 and -6, continue straight down to the same pin number on the 2ch-8ch row. J104-3 does NOT: the lower P104-3 is on a separate line that goes to P174-2.
