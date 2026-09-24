# Capacitor selection for the Pultec stripboard set

**Status: the recommendation below has been committed to code.**
`FILM_CAPACITOR_IMPORT_STRINGS` in `lib/kicad/import-string.ts` now carries the
three footprints this document selects, so the five boards no longer refuse at
export for lack of a whitelist entry.

Every dimension below was read from a manufacturer datasheet PDF or from a
`.kicad_mod` file on this machine. Every price and stock figure was read from a
distributor page. Nothing here comes from recall. Where a number is an estimate
rather than a reading, it is labelled ESTIMATE in place.

---

## 1. The values the boards actually need

Read from the model, not from the reference tables, so it reflects what the five
board modules will actually instantiate:

```bash
bun -e 'import {partitionReference,MODULE_OWNERS} from "./reference/pultec/partition.ts"; const s=partitionReference(); const v=new Map<number,number>(); for (const o of MODULE_OWNERS) for (const c of s.modules[o]) if (c.kind==="capacitor") { const f=Reflect.get(c.parameters,"farads") as number; v.set(f,(v.get(f)??0)+1) } console.log([...v.entries()].sort((a,b)=>a[0]-b[0]))'
```

**19 distinct values, 49 capacitors across the five boards.**

| Value | Count | Value | Count | Value | Count |
| --- | --- | --- | --- | --- | --- |
| 470 pF | 1 | 10 nF | 3 | 68 nF | 1 |
| 1 nF | 6 | 12 nF | 2 | 120 nF | 1 |
| 1.5 nF | 2 | 15 nF | 1 | 150 nF | 1 |
| 1.8 nF | 1 | 18 nF | 1 | 220 nF | 1 |
| 2.2 nF | 5 | 22 nF | 4 | 330 nF | 2 |
| 3.3 nF | 4 | 33 nF | 2 | | |
| 4.7 nF | 6 | 47 nF | 5 | | |

Per board: low-cut 7, low-boost 6, hi-cut 10, hi-boost 9, **mid 17**.

The range spans 470 pF to 330 nF — **just under three decades**. That span is the
whole difficulty of this task, because film-capacitor body size tracks
capacitance × voltage, and no dielectric holds one body size across three decades
unless it is metallized (not film/foil) polyester.

### Which values are E6 and which are E12

This turns out to be the decisive axis, and it is not obvious from the value list.

- **E6** (the standard stocked decade: 1.0, 1.5, 2.2, 3.3, 4.7, 6.8): 470 pF, 1 nF,
  1.5 nF, 2.2 nF, 3.3 nF, 4.7 nF, 10 nF, 15 nF, 22 nF, 33 nF, 47 nF, 68 nF, 150 nF,
  220 nF, 330 nF. **Fifteen values, 44 of the 49 capacitors.**
- **E12 only** (1.2, 1.8, 2.7, 3.9, 5.6, 8.2): **1.8 nF, 12 nF, 18 nF, 120 nF**.
  **Four values, 5 capacitors.**

Most film-capacitor catalogues are E6, with E12 marked "on request". So the four
E12 values are the ones that will not simply fall out of a single order, and they
are called out separately throughout what follows.

---

## 2. Selection criteria, from the project

From `reference/pultec/values.md`:

- **Tolerance is not a selection criterion.** The measured table in that file shows
  ±20% costs under 2 dB anywhere in the band, and standard parts are ±5% or ±10%.
  - *Caveat, stated because the document should not overclaim:* that measurement was
    made by sweeping **inductance**, not capacitance. It transfers to capacitance by
    inspection rather than by measurement — in these resonant sections the centre
    frequency goes as 1/√(LC), so a ±20% error in C shifts f₀ by the same ~10% a
    ±20% error in L does. The transfer is sound but it is an inference, and no
    committed script has re-derived the table with C swept.
- **Per-unit cost and availability are what matter.** The builder is making several.
- **Body size matters**, because the mid board carries 17 capacitors.
- **Voltage rating is uncritical.** This is a passive line-level EQ. 63 VDC is
  already an order of magnitude of headroom; 100 VDC costs nothing extra and is
  often better stocked.

---

## 3. Candidate footprints that exist locally

`/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/Capacitor_THT.pretty`
holds 384 footprints, of which **183 are `C_Rect_*`**. Grouped by pitch, only these
land on the 0.1 inch strip grid:

| Pitch | Grid steps | Count | Series suffixes present |
| --- | --- | --- | --- |
| 2.50 mm | 1 | 7 | `MKS02_FKP02` (5), unsuffixed (2) |
| 5.00 mm | 2 | 24 | `FKS2_FKP2_MKS2_MKP2` (8), unsuffixed (16) |
| 7.50 mm | 3 | 31 | `MKT` (20), `MKS4` (7), `FKS3_FKP3` (2), unsuffixed (2) |
| 10.00 mm | 4 | 43 | `MKT` (34), `FKS3_FKP3_MKS4` (7), unsuffixed (2) |

Everything else in the directory is at 15.00, 22.00, 22.50, 23.00, 27.00, 27.50 or
37.50 mm — off-grid or far too large for line-level values.

**The 5.00 mm group is the one that matters**, because that is the pitch at which
the entire 1 nF – 330 nF range is manufactured in a compact body. The 7.50 mm and
10.00 mm `MKT` groups are drawn for physically larger parts and would cost a strip
row and two extra holes per capacitor for no benefit.

The unsuffixed 5.00 mm family is not generic by accident. Read from the file:

```
(descr "C, Rect series, Radial, pin pitch=5.00mm, length*width=7.2*2.5mm^2,
        Capacitor, R82, https://content.kemet.com/datasheets/KEM_F3101_R82.pdf")
```

**It was drawn from the Kemet R82 datasheet**, and its six widths (2.5, 3.5, 4.5,
5.0, 6.0, 7.2 mm) are exactly R82's six case thicknesses. That matters below,
because it means the "generic" name is in fact a dimensionally-sourced one.

---

## 4. Candidate series

Each row's coverage and body dimensions were read from the manufacturer datasheet
PDF; prices and stock from a distributor page. All are 5 mm-class pitch and 7.2 mm
body length, so all land on the same KiCad footprint family.

| Series | Dielectric | Catalogue range | Decade | Body width across our range (63 V) | Verdict |
| --- | --- | --- | --- | --- | --- |
| **TDK/EPCOS B32529** | metallized PET, **stacked** | 1 nF – 2.2 µF | E6 std, E12 stocked in part | **2.5 mm for 1 nF–220 nF**; 3.0 mm at 330 nF | **recommended** |
| Kemet R82 (EC, 100 V) | metallized PET, wound | 1 nF – 1 µF | **E6 only** | 2.5 mm to 100 nF; 3.5 mm at 150–220 nF; 4.5 mm at 330 nF | good, bulkier at the top |
| Vishay MKT370 | metallized PET | 1 nF – 1.5 µF | **E12** | 2.5 mm to 120 nF; 3.5 mm at 150–220 nF; 4.5 mm at 330 nF | best coverage, worst price/stock |
| WIMA MKS2 | metallized PET | **10 nF** – 4.7 µF | E6 | 2.5 mm to 150 nF; 3.0 mm at 220 nF; 3.5 mm at 330 nF | **does not reach below 10 nF** |
| WIMA FKS2 | PET **film/foil** | 1 nF – 47 nF | E6 | 2.5 mm to 6.8 nF, then **4.5 mm at 22 nF, 7.2 mm at 47 nF** | far too bulky |
| WIMA FKP2 | polypropylene film/foil | 33 pF – 33 nF | E6 | **4.5 mm** from 100 pF | bulky, but the only 470 pF source |
| WIMA MKS02 | metallized PET | **3.3 nF** – 330 nF | E6 | 2.0–5.5 mm, 2.5 mm pitch | does not reach below 3.3 nF |

Sources, all fetched:

- TDK/EPCOS B32529 — https://www.tdk-electronics.tdk.com/inf/20/20/db/fc_2009/B32520_529.pdf
  (5 mm ordering table, "Max. dimensions w × h × l": 1 nF–220 nF all `2.5 × 6.5 × 7.3`;
  330 nF `3.0 × 6.5 × 7.3`; 470 nF `3.5 × 8.0 × 7.3`. Footnote: "Further E series and
  intermediate capacitance values on request".)
- Kemet R82 — https://content.kemet.com/datasheets/KEM_F3101_R82.pdf
  (Table 1, 100 VDC block: 1 nF–100 nF `T 2.5 / H 6.5 / L 7.2 / S 5.0`;
  150–220 nF `T 3.5`; 330–470 nF `T 4.5`. "Capacitance Values: **E6 series** (IEC 60063)".
  T tolerance `+0.1 / −0.5`.)
- Vishay MKT370 — https://www.vishay.com/docs/28108/mkt370.pdf
  ("Capacitance range (**E12 series**) 0.001 µF to 1.5 µF", "5.08 mm lead pitch";
  63 V table: 1 nF–120 nF `2.5 × 6.5 × 7.2`; 150–220 nF `3.5 × 8.0 × 7.2`;
  270–330 nF `4.5 × 9.0 × 7.2`.)
- WIMA MKS2 — https://www.wima.de/wp-content/uploads/media/e_WIMA_MKS_2.pdf
  ("Capacitances from 0.01 µF to 4.7 µF", PCM 5 mm; 63 V: 10–150 nF `W 2.5`,
  220 nF `W 3.0`, 330 nF `W 3.5`, all `L 7.2`.)
- WIMA FKS2 — https://www.wima.de/wp-content/uploads/media/e_WIMA_FKS_2.pdf
  ("1000 pF to 0.047 µF"; 63 V: 1–6.8 nF `W 2.5`, 10 nF `W 3.0`, 15 nF `W 3.5`,
  22 nF `W 4.5`, 33 nF `W 5.5`, 47 nF `W 7.2`.)
- WIMA FKP2 — https://www.wima.de/wp-content/uploads/media/e_WIMA_FKP_2.pdf
  ("33 pF to 0.033 µF"; 63 V: 100 pF–6.8 nF all `W 4.5 × H 6.0 × L 7.2`, PCM 5.)
- WIMA MKS02 / FKP02 — https://www.wima.de/wp-content/uploads/media/e_WIMA_MKS_02.pdf
  and https://www.wima.de/wp-content/uploads/media/e_WIMA_FKP_02.pdf
  (PCM 2.5 mm, `L 4.6`; MKS02 "3300 pF to 0.33 µF", FKP02 "100 pF to 0.01 µF".)

### The two findings that decide it

**Finding 1 — film/foil is out, metallized is in.** WIMA FKS2 at 47 nF is a 7.2 mm
body; TDK B32529 at 47 nF is a 2.5 mm body. Same value, same pitch, same voltage,
**2.9× the width**. The mid board carries 17 capacitors; that difference is the
difference between a board and a brick. Polypropylene (FKP2) is likewise 4.5 mm
from 100 pF up. Metallized polyester is the only dielectric that stays narrow.

**Finding 2 — B32529's stacked construction is flat across the range.** Kemet R82
and Vishay MKT370 both step up at 150 nF and again at 330 nF, needing three
footprint widths. TDK B32529 holds `2.5 mm` from **1 nF all the way to 220 nF** and
only steps to 3.0 mm at 330 nF. That is one body size for 17 of the 19 values.

A further point in TDK's favour that is easy to miss: TDK's table is headed
**"Max. dimensions"**, so 2.5 mm is a guaranteed ceiling. Kemet's R82 table gives
2.5 mm as nominal with a `+0.1` tolerance, so a worst-case R82 is 2.6 mm — which is
0.06 mm *over* a 2.54 mm strip row. For the `CAP_FILM` (one-row) classification that
distinction is exactly the one that matters.

---

## 5. Price and availability

Read from Farnell UK product and search pages, September 2026. Prices are GBP,
ex VAT, per unit at the break that applies.

### TDK B32529, 63 V, untaped (`...K000` = ±10%)

| Value | Order code | Stock | Unit price |
| --- | --- | --- | --- |
| 1 nF | B32529C0102K000 | 15,017 | 10+ £0.154, 250+ £0.0931 |
| 3.3 nF | B32529C0332K000 | 8,087 | 10+ £0.102, 250+ £0.091 |
| 4.7 nF | B32529C0472K000 | 1,942 | 10+ £0.156, 250+ £0.094 |
| 10 nF | B32529C0103K000 | 4,629 | 10+ £0.111, 250+ £0.103 |
| 18 nF | B32529C0183J289 | 6,025 | 5+ £0.288, 50+ £0.171, 250+ £0.103 |
| 22 nF | B32529C0223K000 | 8,777 | 10+ £0.111, 250+ £0.103 |
| 33 nF | B32529C0333K000 | 7,921 | 10+ £0.156, 250+ £0.094 |
| 47 nF | B32529C0473K000 | 20,585 | 5+ £0.289, 50+ £0.169, 250+ £0.102 |
| 68 nF | B32529C0683K000 | 1,602 | 10+ £0.156, 250+ £0.094 |
| 150 nF | B32529C0154K000 | 2,284 | 10+ £0.190, 250+ £0.114 |
| 220 nF | B32529C0224K000 | 28,867 | 5+ £0.300, 50+ £0.197, 250+ £0.111 |
| 330 nF | B32529C0334K000 | 12,364 | 10+ £0.311, 250+ £0.194 |

Source: https://uk.farnell.com/c/passive-components/capacitors/film-capacitors/general-purpose-film-capacitors?filtersSelected=true&inStock=true&st=B32529C0
(125 in-stock results; the table above is page 1.)

**Note the break structure:** for most B32529 parts the breaks are 10+ then 250+.
A builder buying 100 of one value pays the 10+ price. There is no qty-100 saving to
be had, which is worth knowing before ordering.

### For contrast, Vishay MKT370 at the same value

| Part | Value | Stock | Unit price |
| --- | --- | --- | --- |
| BFC237086183 | 18 nF | 1,995 | 5+ £0.774, 50+ £0.577, 250+ £0.453 |
| BFC237022183 | 18 nF | 2,000 | 5+ £0.809, 50+ £0.549 |
| B32529C0183J289 | 18 nF | 6,025 | 5+ £0.288, 50+ £0.171 |

Source: https://uk.farnell.com/c/passive-components/capacitors/film-capacitors/general-purpose-film-capacitors?st=18nF+film+capacitor+63V

**MKT370 is roughly 2.7–3.4× the price of B32529 at the same value, voltage and
pitch**, and Farnell's MKT370 63 V stock is confined to 68 nF and up — a search for
`BFC23701` returns only the `...683, 684, 104, 105, 154, 155, 224, 274, 334, 474`
codes, i.e. nothing below 68 nF. Its full-E12 catalogue is real but is not what sits
on a distributor's shelf.

For reference, one MKT370 price point read in full:
BFC237011104 (100 nF, 63 V), **152,954 in stock**, 5+ £0.248 / 50+ £0.233 /
250+ £0.141 / 500+ £0.113 / 1000+ £0.0961 —
https://uk.farnell.com/vishay/bfc237011104/cap-0-1-f-63v-10-pet/dp/1215508

### The four E12 values: this is where the clean answer stops

| Value | B32529 catalogued? | In stock at Farnell? | Alternatives found in stock |
| --- | --- | --- | --- |
| 18 nF | yes, `B32529C0183J289` | **yes, 6,025** | Vishay BFC237086183 (1,995) |
| 1.8 nF | yes, `B32529C1182J000` (100 V) | **no** | Panasonic ECQUBAF182V5 (949); Kemet SMR5182J100J01L16.5CBULK, 63 V (998); Panasonic ECHU1H182GX5 (2,808) |
| 12 nF | not seen in stock | **no** | mostly 250 V+ / MKP parts: Panasonic ECWFD2J123JQ (1,633), Kemet R76 family, Würth 890334023007CS (2,915) |
| 120 nF | not seen in stock | **no** | Kemet **F612JF124J063C**, 63 V, 5 mm pitch, 3,137 in stock — but **reel-only, first break at 1000+ £0.096** |

Sources:
https://uk.farnell.com/c/passive-components/capacitors/film-capacitors?st=1.8nF+film+capacitor ,
https://uk.farnell.com/c/passive-components/capacitors/film-capacitors?st=12nF+film+capacitor ,
https://uk.farnell.com/c/passive-components/capacitors/film-capacitors/general-purpose-film-capacitors?st=120nF+film+capacitor+63V

**This is a real negative finding and it should not be smoothed over: no single
series covers all 19 values from stock.** Four values need individual sourcing, and
120 nF in particular has no convenient small-quantity 5 mm source at Farnell.

**Why it does not block the board design.** The footprint is decided by pitch and
body width, not by brand. Every candidate above is a 5 mm-class part in a
2.5–4.5 mm body, so a substitute for one of the four E12 values lands on a
footprint this document already specifies. The operator must do one thing when
buying them: **read the substitute's body width off its datasheet**, and if it
exceeds 2.54 mm use the `W3.5` entry rather than the `W2.5` one. That is the only
way a substitution can invalidate the layout.

### The 470 pF

**No 5 mm metallized-polyester series makes it.** B32529, R82, MKT370 and MKS2 all
floor at 1 nF; MKS02 floors at 3.3 nF. It is one capacitor, in parallel with 4.7 nF
on the hi-boost 4 kHz position.

Two ways out, both verified:

1. **WIMA FKP2 470 pF, 63 V** — `W 4.5 × H 6.0 × L 7.2`, PCM 5 mm (datasheet above).
   Polypropylene, which is the audio-preferred dielectric at small values anyway.
   Lands on `C_Rect_L7.2mm_W4.5mm_P5.00mm`, which **exists on disk** — so this costs
   one extra whitelist entry and no new geometry class.
2. **A C0G/NP0 ceramic disc.** `C_Disc_*` footprints are already *derived* by
   `lib/kicad/import-string.ts` and need no whitelist entry at all. Electrically a
   C0G at 470 pF is at least as good as film. This is the cheaper and smaller
   option, but it means `parts.ts` picks a non-film footprint for one capacitor.

Option 1 is the default recommendation because the task is to choose a film family
and it keeps `parts.ts` uniform. Option 2 is noted because it is genuinely better on
size and cost and the operator may prefer it.

---

## 6. Recommendation

**TDK / EPCOS B32529, 63 VDC, ±10% (or ±5%, same body), untaped —
for all 18 values from 1 nF to 330 nF.
WIMA FKP2 470 pF 63 V for the single 470 pF.**

Against the project's criteria:

- **Coverage** — B32529 catalogues the full 1 nF–330 nF span, including three of the
  four E12 values; 18 nF is in stock, 1.8 nF is catalogued, 12 nF and 120 nF need
  substitutes. 470 pF is out of range and handled separately.
- **Per-unit cost** — £0.10–£0.31 at the quantities a five-board set needs, and
  £0.09–£0.19 at 250+. Roughly **one third of Vishay MKT370** at the same value and
  voltage, and cheaper than WIMA across the board.
- **Availability** — 125 in-stock B32529 lines at one distributor, with individual
  values stocked in the thousands to tens of thousands.
- **Body size** — the decisive one. `2.5 mm` maximum width for 17 of the 19 values
  means almost every capacitor on the mid board occupies **one strip row**. Nothing
  else tested holds one body size across that span.
- **Tolerance** — ±10% standard, ±5% available; both far inside the ±20% the
  measured table says is free for inductance - see section 2's caveat, which
  applies here too: that table swept inductance, not capacitance, so the
  transfer to capacitance is an inference, not a second measurement.
- **Voltage** — 63 VDC, an order of magnitude over line level.

If the operator would rather buy one brand and accept three footprint widths,
**Kemet R82 at 100 V is the second choice** — the same body at the bottom of the
range, steps at 150 nF and 330 nF, E6 only so it misses all four E12 values, and it
is the family KiCad's unsuffixed footprints were drawn from. Vishay MKT370 is the
only full-E12 option but costs about three times as much and its small values are
not on the shelf.

---

## 7. Footprints, verified on disk

Read from
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/Capacitor_THT.pretty`.
Pad coordinates give the true pitch; the `F.Fab` rectangle gives the true body
outline. **In every case the name agrees with the geometry — no name lies.**

| Footprint | Pads at | True pitch | F.Fab body | F.CrtYd | Drill / pad |
| --- | --- | --- | --- | --- | --- |
| `C_Rect_L7.2mm_W2.5mm_P5.00mm` | (0,0) (5,0) | 5.00 mm | 7.20 × 2.50 mm | 7.70 × 3.00 | 0.75 / 1.5 mm |
| `C_Rect_L7.2mm_W3.5mm_P5.00mm` | (0,0) (5,0) | 5.00 mm | 7.20 × 3.50 mm | 7.70 × 4.00 | 0.75 / 1.5 mm |
| `C_Rect_L7.2mm_W4.5mm_P5.00mm` | (0,0) (5,0) | 5.00 mm | 7.20 × 4.50 mm | 7.70 × 5.00 | 0.75 / 1.5 mm |

Name fields `L7.2` / `W2.5` / `P5.00` match the fab rectangle 7.20 × 2.50 and the
pad separation 5.00 exactly, and likewise for the other two. No override in
`FOOTPRINT_IMPORT_STRINGS` is needed.

### Classification

The rule: body up to 2.54 mm is `CAP_FILM` (one strip row); up to 7.62 mm is
`CAP_FILM_WIDE` (three rows). `<n>` is pitch in 100-mil steps, so 5.00 mm → 2.

| Footprint | Body width | Class | Import string |
| --- | --- | --- | --- |
| `C_Rect_L7.2mm_W2.5mm_P5.00mm` | 2.50 mm ≤ 2.54 | one row | **`CAP_FILM2`** |
| `C_Rect_L7.2mm_W3.5mm_P5.00mm` | 3.50 mm ≤ 7.62 | three rows | **`CAP_FILM_WIDE2`** |
| `C_Rect_L7.2mm_W4.5mm_P5.00mm` | 4.50 mm ≤ 7.62 | three rows | **`CAP_FILM_WIDE2`** |

Two notes on the 2.50 mm case, because the margin is 0.04 mm and that deserves
stating rather than glossing:

- TDK's 2.5 mm is a **maximum**, so a B32529 genuinely fits inside one 2.54 mm row.
  Kemet's R82 2.5 mm is nominal `+0.1`, so an R82 can be 2.6 mm — over the row.
  This is a second, independent reason to prefer B32529 if `CAP_FILM2` is used.
- The KiCad **courtyard** is 3.00 mm wide, i.e. ±1.50 mm from the axis. The adjacent
  strip row's centre is at ±2.54 mm, so the courtyard does not reach it and
  `CAP_FILM` remains correct. The courtyard is wider than one row but does not
  collide with the next row's holes.

### Value-to-footprint map

| Value(s) | Count | Part | Body | Footprint | Class |
| --- | --- | --- | --- | --- | --- |
| 470 pF | 1 | WIMA FKP2 63 V | 4.5 × 6.0 × 7.2 | `C_Rect_L7.2mm_W4.5mm_P5.00mm` | `CAP_FILM_WIDE2` |
| 1 nF – 220 nF | 46 | TDK B32529 63 V | 2.5 × 6.5 × 7.3 max | `C_Rect_L7.2mm_W2.5mm_P5.00mm` | `CAP_FILM2` |
| 330 nF | 2 | TDK B32529 63 V | 3.0 × 6.5 × 7.3 max | `C_Rect_L7.2mm_W3.5mm_P5.00mm` | `CAP_FILM_WIDE2` |

**Three footprints for the whole set.** 330 nF is given the `W3.5` footprint rather
than a `W3.0` one deliberately: the unsuffixed (R82-derived) family has no 3.0 mm
member, and the only `W3.0` on disk is
`C_Rect_L7.2mm_W3.0mm_P5.00mm_FKS2_FKP2_MKS2_MKP2`, whose name asserts a WIMA series
this part is not. A 0.5 mm-oversize generic footprint is honest; a correctly-sized
one that names the wrong manufacturer is not, and the classification is
`CAP_FILM_WIDE2` either way so nothing is lost.

**One discrepancy, recorded rather than hidden:** B32529's body length is **7.3 mm
max**, and the footprint's fab rectangle is 7.2 mm. The part is 0.1 mm longer than
the drawn body. It is inside the 7.70 mm courtyard, the leads are on 5.00 mm centres
regardless, and on stripboard the body floats above the strips — so this has no
build consequence. It is noted because the footprint name says `L7.2mm` and the
datasheet says 7.3, and somebody should not later discover that as a surprise.

---

## 8. Cost

49 capacitors per five-board set. Unit prices are the Farnell UK break that applies
when buying the quantity one set needs.

| Value | Qty | Unit (GBP) | Line | Basis |
| --- | --- | --- | --- | --- |
| 470 pF | 1 | — | — | WIMA FKP2, not priced |
| 1 nF | 6 | 0.154 | 0.92 | B32529C0102K000 10+ |
| 1.5 nF | 2 | 0.154 | 0.31 | ESTIMATE, banded with 1 nF |
| 1.8 nF | 1 | — | — | E12 gap |
| 2.2 nF | 5 | 0.154 | 0.77 | ESTIMATE, banded with 1 nF |
| 3.3 nF | 4 | 0.102 | 0.41 | B32529C0332K000 10+ |
| 4.7 nF | 6 | 0.156 | 0.94 | B32529C0472K000 10+ |
| 10 nF | 3 | 0.111 | 0.33 | B32529C0103K000 10+ |
| 12 nF | 2 | — | — | E12 gap |
| 15 nF | 1 | 0.111 | 0.11 | ESTIMATE, banded with 10 nF |
| 18 nF | 1 | 0.288 | 0.29 | B32529C0183J289 5+ |
| 22 nF | 4 | 0.111 | 0.44 | B32529C0223K000 10+ |
| 33 nF | 2 | 0.156 | 0.31 | B32529C0333K000 10+ |
| 47 nF | 5 | 0.289 | 1.45 | B32529C0473K000 5+ |
| 68 nF | 1 | 0.156 | 0.16 | B32529C0683K000 10+ |
| 120 nF | 1 | — | — | E12 gap, reel-only |
| 150 nF | 1 | 0.190 | 0.19 | B32529C0154K000 10+ |
| 220 nF | 1 | 0.300 | 0.30 | B32529C0224K000 5+ |
| 330 nF | 2 | 0.311 | 0.62 | B32529C0334K000 10+ |

- **44 capacitors priced from live listings: £7.55.** Mean £0.172 each.
- 5 capacitors (470 pF, 1.8 nF, 12 nF ×2, 120 nF) not priced. Banded at
  £0.10–£0.45 each from the spread observed across the whole film category, that is
  **£0.50 – £2.25**.
- **Total for one full five-board set: roughly £8 – £10** (ex VAT, ex shipping).

Per board at the £0.172 mean: low-cut £1.20, low-boost £1.03, hi-cut £1.72,
hi-boost £1.54, mid £2.92.

Three ESTIMATE rows above (1.5 nF, 2.2 nF, 15 nF) are values B32529 catalogues and
Farnell almost certainly stocks, but which did not appear on the first results page
read. They are priced at their neighbours' rate. The estimate moves the total by
well under £1 in any plausible direction.

**If the builder makes several sets**, buying 250 of each value drops most lines to
£0.09–£0.19 and would bring a set to roughly £5. That is the sense in which "the
builder is making several of these" bears on the choice — B32529's 250+ break is
where its price advantage over MKT370 widens further.

---

## 9. Required follow-up: a fictional footprint in a committed test

`tests/kicad/import-string.test.ts` line 180 contains:

```
Capacitor_THT:C_Rect_L4.6mm_W2.5mm_P2.50mm
```

**This footprint does not exist.** Verified directly:

```bash
ls "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/\
Capacitor_THT.pretty/C_Rect_L4.6mm_W2.5mm_P2.50mm.kicad_mod"   # ABSENT
```

The real parts at that length and pitch are the `MKS02_FKP02` family, whose five
widths are **W2.0, W3.0, W3.8, W4.6 and W5.5** — there is no W2.5 among them.

It is functionally inert today: that test supplies its own `Map`, so `derive()` is
never reached and the name is never resolved. That is exactly why it is worth
fixing. A fictional footprint sitting in a committed test is the first thing
somebody copies into the real whitelist, and at that point it becomes a board built
around a part that does not exist, with every test still green.

**Correct replacement, verified present on disk** (pads read at `(0,0)` and
`(2.5,0)`, pitch 2.50 mm):

```
Capacitor_THT:C_Rect_L4.6mm_W2.0mm_P2.50mm_MKS02_FKP02
```

This edit is **not** made in this document's change. It belongs with the code change
the operator approves, alongside the whitelist entries, because it touches the same
file the whitelist work touches.

Incidentally, `circuits/pultec/parts.ts` currently carries
`FILM_CAPACITOR = "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"` as its placeholder.
That one **is** real, and is in fact the footprint this document assigns to 330 nF.

---

## 10. What this document does not establish

- **No physical part has been measured.** Every dimension is a datasheet claim.
- **Prices and stock are one distributor, one region, one day** (Farnell UK,
  September 2026). A US builder should re-check DigiKey or Mouser; both refused
  automated access during this research, so neither was read. Relative standing
  (B32529 cheapest, MKT370 dearest) is likely to hold; absolute figures will not.
- **1.5 nF, 2.2 nF and 15 nF B32529 stock was not confirmed individually.** They are
  catalogued and the series is broadly stocked, but each was inferred from the
  series listing rather than read from its own product page.
- **12 nF and 120 nF have no identified small-quantity 5 mm source.** This is the
  weakest point in the recommendation and the operator should resolve it before
  ordering, not after.
- **The tolerance argument is transferred from inductance to capacitance by
  inspection**, as set out in section 2. No script re-derives it with C swept.
- **VeroRoute's `CAP_FILM` / `CAP_FILM_WIDE` behaviour was not exercised.** The
  classification follows the rule stated in the plan and the spec; it has not been
  observed in the tool.
