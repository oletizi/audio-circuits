# How far a part's leads can be bent apart, and how close together

This is the derivation behind `lib/kicad/lead-span.ts`. Every number below was
read off a manufacturer datasheet, a published standard, or a file on disk, and
each one says where. Nothing here is recalled, estimated, or measured by hand.

The code is the authority for the values; this page is the authority for *why*
they are those values, and is the thing to read before changing one.

---

## 1. Why the table exists

The stripboard placement pipeline's stretch lever moves a part's lead onto the
strip its net already occupies. The tool will stretch any two-terminal part to
any span between 2 and 16 holes — `CompTypes::GetMinLength` returns 2 and
`GetMaxLength` returns 16 for `RESISTOR`, `CAP_FILM`, `CAP_FILM_WIDE`,
`CAP_CERAMIC`, `INDUCTOR`, `DIODE` and every `CAP_ELECTRO_*`. The part will not.

The maximum was already named as a gap (the pipeline spec's §8.2, hard constraint
H5). The **minimum** was not, and it is the sharper of the two: a DIN0207
resistor is a 6.5 mm body, and `--stretch shrink` can take it to a 2-hole span,
which is 5.08 mm, which is inside its own body. Three of the thirteen recorded
families turn out to have no stretch range at all.

## 2. Units: span is counted in holes

A span of `n` holes has `n - 1` grid steps between its end holes, so its pitch is
`(n - 1) × 2.54 mm`. This follows VeroRoute's own `length` — the `cols` of
`GetMakeInstructions` — and **not** the import-string suffix, which is the step
count: `RESISTOR4` is a 4-step, 5-hole, 10.16 mm span. `holesForSteps` in
`lib/kicad/grid.ts` is the one place the two are converted.

## 3. The bend rule, and which standard it is

**IEC 61760-1 does not apply, and this was checked rather than assumed.** It is
*Surface mounting technology — Part 1: Standard method for the specification of
surface mounting components (SMDs)*, 2nd edition 2006-04 (IEC webstore
publication 5869). It is about SMDs and says nothing about forming the leads of a
through-hole part. Its through-hole counterpart, IEC 61192-3:2002 *Workmanship
requirements for soldered electronic assemblies — Part 3: Through-hole mount
assemblies*, is paywalled; it was not read, and nothing is attributed to it.

**The rule used is IPC-A-610, Revision E**, read from the published IPC-A-610E
redline ("Changes from Revision D to Revision E", 610E-01 redline), pages 7-3,
7-4 and 7-18. Three clauses are load-bearing.

**§7.1.2.1 Component Mounting - Lead Forming - Bends, Figure 7-10**, on how far
from the body a bend may start:

> Leads of through-hole mounted component extend at least 1 lead diameter or
> thickness but not less than 0.8 mm [0.031 in] from the body, solder bead, or
> lead weld.

**§7.1.2.1, Table 7-1 Lead Bend Radius**, on how tight the bend may be:

| Lead Diameter (D) or Thickness (T) | Minimum Inside Bend Radius (R) |
| --- | --- |
| < 0.8 mm [0.031 in] | 1 D/T |
| 0.8 mm [0.031 in] to 1.2 mm [0.0472 in] | 1.5 D/T |
| > 1.2 mm [0.0472 in] | 2 D/T |

Table 7-1's note: "Rectangular leads use thickness (T)." No family here has a
rectangular lead.

**§7.5.3 Supported Holes - Wire/Lead Protrusion, Table 7-3**, on how far through
the board the lead must reach, which is what makes the board's thickness a reach
cost:

> (L) min., Class 1, 2 and 3: End is discernible in the solder.

Every lead here is 0.5 or 0.6 mm, so the diameter term in the first clause is
always smaller than its 0.8 mm floor: **the standoff is 0.8 mm for every family
in the table**, and the inside bend radius is `1 × D` for every one of them.

### 3.1 The board

Vero Technologies, *VEROBOARD — Single sided, copper printed circuit boards,
fully pierced with holes. Also known as stripboard*, Farnell datasheet 10822,
undated: "All boards are 1.6mm thick with copper thickness of 35um. Hole grid:
2.54 x 2.54 mm., hole diameter: 1.02 mm."

So **1.6 mm of board** has to be crossed before a lead end is discernible in the
solder, and the 1.02 mm hole comfortably passes every 0.5–0.6 mm lead.

## 4. The two geometries

With `d` the lead diameter, the standard gives a standoff `s = max(d, 0.8)` and
an inside bend radius `R = d` (all leads here are under 0.8 mm). The lead's
*centreline* turns on `c = R + d/2`, which is what both the lead a bend eats and
the sideways distance it covers are measured on — using the inside radius instead
would under-count the lead consumed and overstate every maximum. A 90° bend
therefore eats `a = (π/2) × c` of lead and carries the lead `c` sideways.

| | `d` = 0.5 mm | `d` = 0.6 mm |
| --- | --- | --- |
| standoff `s` | 0.800 | 0.800 |
| inside radius `R` | 0.500 | 0.600 |
| centreline radius `c` | 0.750 | 0.900 |
| quarter bend `a` | 1.178 | 1.414 |

### 4.1 Axial, lying down (the resistor)

The leads leave opposite ends of the body, the body lies between the holes, and
each lead makes **one** 90° bend. The lead axis sits half a body diameter above
the board, so the descent is `D/2 + 1.6`.

```
max pitch = L_body + 2 × (l_lead − a − descent + c)
min pitch = max(the manufacturer's stated minimum, L_body + 2 × s)
```

The minimum is where an axial part differs in kind from a radial one: **the body
has to fit between the holes**, with a legal standoff at each end.

### 4.2 Radial, standing up (the film caps, the electrolytics)

Both leads leave the same face and the body stands above the board, so nothing
has to fit between the holes. Splaying is **two** 90° bends per lead — down out
of the body, out sideways, back down into the hole — which is a different and
tighter geometry than an axial part's single bend. Before any sideways run at all
a dog-leg eats

```
overhead = s + 2a + 1.6
```

and if the worst-case lead is shorter than that, **the part cannot be formed at
any span**. Otherwise

```
max pitch = P_nominal + 2 × (2c + (l_lead − overhead))
min pitch = 2.54 mm     (one grid step: where two holes stop being two holes)
```

**On lead-to-seal stress, the standard's constraint is the only one stated.**
IPC-A-610E §7.1.2.1 makes a bend closer to the seal than the 0.8 mm standoff a
Class-3 defect (Figure 7-11) and a "Fractured lead weld, solder bead, or
component body lead seal" a defect for all classes (Figure 7-12). That is the
numeric limit, and it is the one applied. The manufacturers add a caution and no
number: Nichicon, *TECHNICAL NOTES* CAT.8101H, §2-1-2 Mounting (12) Hand
soldering, item ② — "If the leads must be formed due to a mismatch of the lead
spacing to hole spacing on the board, bend the lead before soldering without
applying too much stress to the capacitor." TDK's B32529 datasheet states no
bending restriction at all, only "Special lead lengths available on request." No
tighter rule is invented here to fill the gap.

### 4.3 Rigid pin fields (headers, the DIP, the TO-92, the trimmer)

The terminals are moulded into the package at a fixed pitch. There is no lead to
form, so the minimum and the maximum are both the footprint's own span, read off
the `.kicad_mod` on disk. VeroRoute agrees from the other side: `TO92` and
`TRIM_FLAT` have no case in `GetMinLength` or `GetMaxLength` and fall through to
`default: assert(0); // Non-stretchable component`, while `SIP` and `DIP` key off
the *pin count*, so stretching one changes how many pins the part has rather than
how far apart they sit.

## 5. The families, and the arithmetic for each

### 5.1 `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` → 5 .. 16

The family is a DIN case size, not a part. The numbers are **Vishay MBB/SMA
0207**'s: Vishay Beyschlag, *MBA/SMA 0204, MBB/SMA 0207, MBE/SMA 0414 —
Professional. Professional Thin Film Leaded Resistors*, Document Number 28766,
Revision 05-Oct-09, page 25, table "DIMENSIONS - Leaded resistor types, mass and
relevant physical dimensions", row MBB/SMA 0207:

`Dmax. 2.5`, `Lmax. 6.5`, `dnom. 0.6`, `lmin. 28.0`, `Mmin. 10.0`, with note (1)
"For 7.5 ≤ M < 10.0 mm, use version MBB/SMA 0207 ... L0 without lacquer on the
leads".

`lmin. 28.0` is the **untaped (bulk)** lead. The taped variants are supplied
pre-formed to a 2.5 mm or 5.0 mm lead spacing and are not covered.

- `descent = 2.5/2 + 1.6 = 2.850`
- `max pitch = 6.5 + 2 × (28.0 − 1.414 − 2.850 + 0.900) = 55.773 mm` = 21.96
  steps, so **22 steps, 23 holes** of lead reach. VeroRoute's ceiling is 16, so
  **16** is recorded: on this family the lead is not the binding constraint, the
  tool is.
- `Mmin. 10.0` is the drawing's lead-to-lead distance, i.e. the mounting hole
  spacing, and note (1) confirms it by saying what to order for a tighter one.
  10.0 mm is 3.94 steps, which rounds **up** to 4 steps = 10.16 mm = **5 holes**.
- Independently, `L_body + 2s = 6.5 + 1.6 = 8.1 mm` = 3.19 steps, also 4 steps.
  The two agree. The manufacturer's larger figure is the one recorded, because it
  was stated rather than computed.

**This is the shrink gap.** The tool's floor is 2 holes, 5.08 mm — less than the
6.5 mm body. The part's floor is 5 holes. Three holes of the tool's range are
unbuildable on this family, and it is the most numerous part on every board.

### 5.2 `Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm` → 2 .. 4
### 5.3 `Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm` → 2 .. 4

TDK Electronics (EPCOS), *Film Capacitors. Capacitors for RFI Filtering,
Smoothing, General-Purpose. Series/Type: B3252\*C/D/E/N/Q/R/T*, document
`B32520_529`, dated June 2026. Page 2, "Dimensional drawing": lead spacing
`5.0 ±0.4`, lead diameter `d1 0.5 ±0.05`, type `B32529`. Page 6, "Composition of
ordering code": `000 = Untaped (standard lead length 6 ±1 mm)`.

`docs/pultec/capacitor-selection.md` selects the **untaped** ordering codes
(`...K000`), so the lead length is `6 − 1 = 5.0 mm` at the bottom of its
tolerance. Taped parts (ammo pack `289`, reel `189`) are cut by the tape and are
not covered.

- `overhead = 0.800 + 2 × 1.178 + 1.6 = 4.756 mm`
- `5.0 − 4.756 = 0.244 mm` of spare lead: the part **can** be formed, by a hair.
- `max pitch = 5.0 + 2 × (2 × 0.750 + 0.244) = 8.488 mm` = 3.34 steps, so
  **3 steps, 4 holes**.
- min: one grid step, **2 holes**. The leads come to 2.54 mm pitch by running
  under a 2.5 mm-wide body, which the geometry allows.

**The margin is 0.24 mm, and that is the point of recording the tolerance rather
than the nominal.** At the nominal 6 mm lead the same arithmetic reaches 5 holes.
The worst case is what is recorded. The body width differs between these two
footprints and does not enter the arithmetic at all — a radial part's span is a
fact about its lead.

So the stretch lever on the Pultec's film capacitors is **one step**, from the
footprint's own 3-hole span to 4. The pipeline spec's §5.3 asks for about 11.5 mm
of splay on this family for the worst of the five boards. That is 5.75 mm per
lead against the 1.74 mm the datasheet lead allows. **The ordering as specified is
not reachable with untaped B32529s**, and that is a design finding for the owner,
not a tuning problem for the search.

### 5.4 `Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm` → 3 .. 3 (not formable)

WIMA, *WIMA FKP 2. Polypropylene (PP) Film/Foil Capacitors for Pulse
Applications in PCM 5 mm*, catalogue page 31, dated 03.26. Dimensional drawing:
`d = 0.5 Ø`, `Pin length: 6-2 = SD`, `PCM ... at the pin exit points (±0.5)`. The
63 VDC ratings table, row 470 pF: `W 4.5`, `H 6`, `L 7.2`, `PCM 5` — which is the
`FKP2C004701D00` the repository fits for the single 470 pF below B32529's floor.

The pin-length glyph extracts as a hyphen and could be `6 ±2` or `6 −2`. **Both
readings give 4.0 mm as the worst case**, so the ambiguity does not change the
answer; it is recorded in the entry rather than resolved by guessing.

- `overhead = 4.756 mm`, and the lead is `4.0 mm`: **0.76 mm short**.
- So the part cannot be formed at all, and both bounds are the footprint's own
  span: `5.00 mm` rounds to 2 steps, **3 holes**.

The tool will nonetheless shrink this part to 2 holes and grow it to 16. All
fifteen of those spans are fictions.

### 5.5 The three Nichicon electrolytics → 2 .. 11

`Capacitor_THT:CP_Radial_D5.0mm_P2.00mm`,
`Capacitor_THT:CP_Radial_D6.3mm_P2.50mm`,
`Capacitor_THT:CP_Radial_D8.0mm_P3.50mm`.

Nichicon, *ALUMINUM ELECTROLYTIC CAPACITORS. PS series — Miniature Sized, Low
Impedance, For Switching Power Supplies*, catalogue CAT.8100Z. The "Radial Lead
Type" dimensional drawing gives the lead length as `15MIN`, and its case-size
table gives:

| `φD` | 5 | 6.3 | 8 |
| --- | --- | --- | --- |
| `P` | 2.0 | 2.5 | 3.5 |
| `φd` | 0.5 | 0.5 | 0.6 |

which is exactly the three KiCad footprints. `15MIN` is a series-level minimum
for the straight-lead (bulk) part; Nichicon's trimmed, formed and taped variants
are a separate document (CAT.8100D / `e-mi_tape`) and are not covered. The same
drawing carries a second dimension, `4MIN`, **whose meaning could not be
established from the document**; it is not used, and being smaller than 15 it
cannot loosen anything.

- `φ5` and `φ6.3` (`d` = 0.5): `overhead = 4.756`, run per lead
  `= 1.500 + (15.0 − 4.756) = 11.744`, so `max pitch = 2.0 + 23.488 = 25.488`
  (10.03 steps) and `2.5 + 23.488 = 25.988` (10.23 steps). Both **10 steps, 11
  holes**.
- `φ8` (`d` = 0.6): `overhead = 5.227`, run `= 1.800 + 9.773 = 11.573`, so
  `max pitch = 3.5 + 23.145 = 26.645` (10.49 steps). Also **10 steps, 11 holes**.
- min: one grid step, **2 holes**.

Here the lead genuinely binds below the tool's ceiling: 11 holes, not 16.

**The tool's own floor is tighter than the physical one on the larger cans** and
also binds: `CP_Radial_D8.0mm` derives to `CAP_ELECTRO_300`, whose
`GetMinLength` is 3 holes, and `CAP_ELECTRO_400` and `_500`/`_600` are 5 and 6.
The effective floor is the larger of the two; the pipeline's H4 and H5 are
separate constraints and this table deliberately records only H5.

### 5.6 The rigid families

| Footprint | Span | Where the span comes from |
| --- | --- | --- |
| `PinHeader_1x01_P2.54mm_Vertical` | 1 .. 1 | One pin. It has no span and bridges nothing. |
| `PinHeader_1x02_P2.54mm_Vertical` | 2 .. 2 | Two pads on 2.54 in the `.kicad_mod`; `GetMinLength(SIP)` is the pin count. |
| `PinHeader_1x05_P2.54mm_Vertical` | 5 .. 5 | Five pads on 2.54 (0, 2.54, 5.08, 7.62, 10.16). |
| `Package_DIP:DIP-16_W7.62mm` | 8 .. 8 | Pads 1 and 16 at x 0 and 7.62, eight per row on 2.54; `GetMinLength(DIP)` is pins/2, the along-row extent. |
| `Package_TO_SOT_THT:TO-92_Inline` | 3 .. 3 | The footprint's pads are at x 0, **1.27**, 2.54 — half-grid — while VeroRoute's `TO92` is `rows = 1; cols = 3; "123"`, three pins on the 2.54 grid. The legs are splayed to the grid **once**, as a fixed preparation, and are not a lever afterwards. |
| `Potentiometer_Runtron_RM-065_Vertical` | 3 .. 3 | Pads 1 and 3 at x 0 and 5.0 with the wiper at (2.5, 5); VeroRoute's `TRIM_FLAT` is the fixed 3 × 3 pattern `"+2++++1+3"`. |

Footprint names were verified against the installed KiCad libraries as files, not
written from memory — this repository has twice shipped a footprint that does not
exist. All fifteen names in the table and in `UNSOURCED` were confirmed present
under `/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints`.

## 6. What refuses, and why that is the right answer

Two footprints the boards place have **no recorded span**. They are listed in
`UNSOURCED` in `lib/kicad/lead-span.ts` so that they refuse with the reason
rather than being given a plausible figure.

**`Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm`** — no lead length is sourced.
The repository names no mpn for its ceramic discs. On the closest documented part
— Vishay BCcomponents D Series, Document Number 28549, Revision 08-Jan-2026 —
lead length is an **ordering option** (code digit 13, "Packaging / Lead Length",
"Please refer to relevant datasheet"), and the older BCcomponents D Series design
note gives only the catalogue range "a lead length from 4 to 30 mm". A 4 mm lead
cannot be formed at all; a 30 mm one reaches the tool's ceiling. The option chosen
decides the answer completely, so there is nothing to record until a part is
named. The datasheet does fix the lead diameter (0.6 ± 0.05 mm) and the 2.5 mm
spacing, which is why the *diameter* is not what is missing.

**`Capacitor_THT:CP_Radial_D5.0mm_P2.50mm`** — no datasheet is sourced for a `φ5`
can at 2.5 mm lead spacing. Nichicon's PS, VZ and UM case tables all put `φ5` at
**2.0 mm**. Panasonic's *Aluminum Electrolytic Capacitors (Radial Lead Type) —
Lead taping radial lead type* dimensions (`DMF0000COL51`) does confirm the
geometry exists — Figure C is headed "Lead space : 2.5 mm / φD × L : φ5 × 11,
φ6.3 × 5, 7, 11.2, 15, φ8 × 5, 7" — but it is a taping document and states no
bulk lead length. The likelier resolution is not a new datasheet: it is that the
part fitted is really a `φ5/P2.00mm` can, which this repository already uses
elsewhere, and the footprint is wrong.

## 7. What has no span because it is not on the board

`circuits/pultec/off-board.ts` keeps the pots, the rotary selectors and **all
nine inductors** off the board. Those components carry a symbol rather than a
footprint, so they never reach this lookup and need no span.

The inductors matter for a different reason: **no inductor part has been chosen
at all.** `docs/pultec/values.md` specifies them electrically and admits a
catalogue part, a pot core or a transformer winding, which do not share a
footprint. `L_MID_1H` and the hi-boost taps `L_HI_BOOST_100MH` through `600MH`
therefore have no body, no lead and no pitch, and **no span is asserted for
them**. If one comes on-board it arrives here with a named part and a datasheet
or it refuses — a figure invented now would be a geometry claim nothing supports.

## 8. Limits, stated plainly

- **A datasheet minimum lead length is not a guarantee about any individual part
  in a drawer.** It is what the manufacturer undertakes to ship. A part already
  trimmed, already formed, or recovered from another board has whatever it has.
- **Bulk and taped parts differ, and every entry says which it is.** The
  B32529's 6 ± 1 mm is the untaped code `000`; the MBB0207's 28 mm `lmin.` is the
  untaped part, and the taped variants arrive pre-formed to 2.5 mm or 5.0 mm;
  Nichicon's 15 mm minimum is the straight-lead part, not CAT.8100D's trimmed and
  formed ones. Substituting a taped part for a bulk one invalidates the maximum.
- **A span within the lead's reach can still be a mechanically poor joint.** A
  long formed lead is a lever. Stripboard flexes, and flexing works the
  lead-to-seal junction these numbers assume is intact — which is the junction
  Nichicon's caution and IPC-A-610E's Figure 7-12 are both about. Reaching the
  maximum is permitted by the geometry, not recommended by it.
- **Tolerance stacking is not modelled.** Each family takes the worst case of the
  one dimension that binds it (the lead length) at the nominal of the others. A
  part at the bottom of its lead-length tolerance *and* the top of its
  body-length tolerance is not separately accounted for.
- **The numbers are for 1.6 mm board.** A thicker board costs reach millimetre
  for millimetre, and on the film capacitors, whose whole lead is 4–5 mm, that is
  the difference between formable and not.
- **This table is H5 only.** The tool's own range (H4: 2 to 16 holes, and
  `CAP_ELECTRO_*`'s per-diameter floors) is a separate constraint. The span a
  part may actually be placed at is the intersection, and nothing here computes
  that intersection for the pipeline.

## 9. Changing an entry

Adding or widening one is a deliberate edit with a test beside it, never a silent
widening. To add a family:

1. Name the specific part being fitted. A family has no datasheet; a part does.
2. Read its body length, body diameter, lead diameter and lead length off the
   manufacturer's own document, and note which packaging the lead length is for.
3. Record the document's title, its document or catalogue number, its revision or
   date, and the table or figure the value came from, in the entry's
   `DatasheetRef`.
4. Add it to `LEAD_SPANS`. `tests/kicad/lead-span.test.ts` will recompute both
   bounds from the recorded dimensions and fail if the stored integers disagree,
   check that one hole further in each direction is out of reach, and check that
   the footprint is one some board actually places.

If a number cannot be sourced, the family goes in `UNSOURCED` with what is
missing. An empty whitelist that refuses loudly beats a general rule that quietly
accepts a guess.

## 10. Summary

| Footprint | min | max | Bound by | Part the numbers are |
| --- | --- | --- | --- | --- |
| `R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` | 5 | 16 | body / `Mmin.`; tool ceiling | Vishay MBB/SMA 0207, doc 28766 rev 05-Oct-09 |
| `C_Rect_L7.2mm_W2.5mm_P5.00mm` | 2 | 4 | grid; 5 mm untaped lead | TDK B32529, B32520_529, June 2026 |
| `C_Rect_L7.2mm_W3.5mm_P5.00mm` | 2 | 4 | grid; 5 mm untaped lead | TDK B32529, B32520_529, June 2026 |
| `C_Rect_L7.2mm_W4.5mm_P5.00mm` | 3 | 3 | not formable: 4 mm lead | WIMA FKP2, e_WIMA_FKP_2, 03.26 |
| `CP_Radial_D5.0mm_P2.00mm` | 2 | 11 | grid; 15 mm lead | Nichicon PS, CAT.8100Z |
| `CP_Radial_D6.3mm_P2.50mm` | 2 | 11 | grid; 15 mm lead | Nichicon PS, CAT.8100Z |
| `CP_Radial_D8.0mm_P3.50mm` | 2 | 11 | grid; 15 mm lead | Nichicon PS, CAT.8100Z |
| `PinHeader_1x01_P2.54mm_Vertical` | 1 | 1 | moulded pin | KiCad footprint on disk |
| `PinHeader_1x02_P2.54mm_Vertical` | 2 | 2 | moulded pins | KiCad footprint on disk |
| `PinHeader_1x05_P2.54mm_Vertical` | 5 | 5 | moulded pins | KiCad footprint on disk |
| `DIP-16_W7.62mm` | 8 | 8 | moulded leadframe | KiCad footprint on disk |
| `TO-92_Inline` | 3 | 3 | splayed once to the grid | KiCad footprint on disk + `CompTypes.h` |
| `Potentiometer_Runtron_RM-065_Vertical` | 3 | 3 | moulded legs | KiCad footprint on disk + `CompTypes.h` |
| `C_Disc_D5.0mm_W2.5mm_P2.50mm` | — | — | **refuses** | lead length unsourced (§6) |
| `CP_Radial_D5.0mm_P2.50mm` | — | — | **refuses** | no `φ5`/2.5 mm datasheet (§6) |
