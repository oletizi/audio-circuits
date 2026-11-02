# Capacitor and inductor research, 2026-10-10

Three open part questions, put to the Mouser Search API and the Digi-Key Product
Information API through `bun run parts`, and to manufacturer datasheets fetched
directly. Written so a later session need not repeat any of it.

**Nothing here is a decision.** Two of the three questions end in a refusal that
is better informed than the one it replaces, and the third ends in a
recommendation the operator may well decline — see the conflict recorded in
section 1.6.

**Every figure below traces to a response actually received or a datasheet
actually read.** Where a number is an inference it says so in place. No price or
stock figure is carried over from memory, and none is extrapolated.

---

## 0. What was queried

Distributor search APIs are rate limited per day, so the queries were chosen one
at a time rather than swept. Seventeen calls, all on 2026-10-10:

| # | Query | Supplier |
| --- | --- | --- |
| 1 | `parts lookup VTB9050` | both |
| 2 | `parts search MKT1813 --limit 15` | Mouser |
| 3 | `parts search axial film capacitor polyester --limit 12` | Mouser |
| 4 | `parts lookup MKT1813147635` | both |
| 5 | `parts search ceramic disc capacitor radial lead 2.5mm --limit 10` | Mouser |
| 6 | `parts search 10uF electrolytic 5x11 2.5mm lead space --limit 10` | Mouser |
| 7 | `parts search 1H inductor radial --limit 10` | Mouser |
| 8 | `parts search 100mH inductor --limit 10` | Digi-Key |
| 9 | `parts search aluminum electrolytic 10uF 25V radial 5x11mm --limit 8` | Digi-Key |
| 10 | `parts search ceramic disc capacitor 50V 10000pF --limit 10` | Mouser |
| 11 | `parts search Walsin ceramic disc 2.5LS --limit 15` | Mouser |
| 12 | `parts search ceramic disc 2.5LS 20LL Bulk --limit 20` | Mouser |
| 13 | `parts search 1H fixed inductor through hole --limit 8` | Digi-Key |
| 14 | `parts search choke audio inductor henry --limit 10` | Mouser |
| 15 | `parts search Gowanda inductor through hole radial --limit 15` | Digi-Key |

Queries 1 and 4 are `lookup`, which hits both suppliers, so the call count is
seventeen against fifteen rows.

Two are worth not repeating because of what they returned, not what they cost:

- Query 9 returned `Digi-Key: no exact match` — Digi-Key's keyword search does
  not match on a case-size string like `5x11mm`. Query 6's Mouser equivalent did
  match, because Mouser puts `LS=2.5mm` in its own description text. **Search
  Mouser by case size, Digi-Key by part number.**
- Query 15 returned fifteen Gowanda parts, every one of them at **0 stock**.
  See section 3.

Datasheets read, all fetched directly from the manufacturer unless noted:

| Document | Number | Revision | URL |
| --- | --- | --- | --- |
| Vishay Roederstein, *DC Film Capacitors, MKT Axial Type* | 26013 | 20-Oct-2022 | `vishay.com/docs/26013/mkt1813.pdf` |
| Vishay BCcomponents, *D Series* ceramic disc | 28549 | 08-Jan-2026 | `vishay.com/docs/28549/dseries.pdf` |
| Panasonic, *Aluminum Electrolytic Capacitors (Radial Lead Type) M-A series* | ABA0000C1218 | 01-Sep-25 | `industrial.panasonic.com/cdbs/www-data/pdf/RDF0000/ABA0000C1218.pdf` |
| Panasonic, *Lead taping radial lead type* | DMF0000COL51 | 25-Aug-21 | `industrial.panasonic.com/cdbs/www-data/pdf/RDF0000/DMF0000COL51.pdf` |
| Walsin Technology, *Ceramic Disc Capacitor* catalogue | none printed | **none printed** | mirror only, see 2.1 |

The Walsin catalogue is the one weak citation here and it is flagged in place.
Walsin's own site (`passivecomponent.com`) returned 404 on both the product page
and the guessed PDF path, so the copy read is a third-party mirror
(`uploadcdn.oneyac.com/.../disc_cap-2303480.pdf`, 34 pages, watermarked
"Downloaded From Oneyac.com" but otherwise Walsin's own catalogue, with its own
part-number system, photographs and tables). The sourcing notes' 2026-09-30
lesson already allows a mirror that carries the identical manufacturer document;
this one carries no revision or date at all, which is a separate and real gap.

---

## 1. Would axial film capacitors lift the 12-hole clustering bound?

**Short answer: yes, decisively — and at a cost the capacitor study already
weighed and decided against on other grounds.** Section 1.6 records the
conflict. This is a recommendation; the operator decides what goes in a Pultec.

### 1.1 The values the boards actually instantiate

Read from the model rather than from the reference tables:

```bash
bun -e 'import {partitionReference,MODULE_OWNERS} from "./circuits/pultec/partition.ts";
const s=partitionReference();
for (const o of MODULE_OWNERS) for (const c of s.modules[o])
  if (c.kind==="capacitor") console.log(o, c.id, Reflect.get(c.parameters,"farads"))'
```

Forty-nine capacitors over five boards, nineteen distinct values from **470 pF
to 330 nF**. Per board: low-cut 7, low-boost 6, hi-cut 10, hi-boost 9, mid 17.
Low-cut's seven frequency-selection capacitors C1–C7 are 18 nF, 10 nF, 4.7 nF,
3.3 nF, 2.2 nF, 1.8 nF, 1 nF — the whole low end of the range, and low-cut is the
board whose net graph wants the 12-hole span. This agrees with the table in
`docs/pultec/capacitor-selection.md` section 1.

### 1.2 Is there an axial film family at these values, in stock?

**Yes: Vishay Roederstein MKT1813**, metallized polyester (PET), axial encased.
Document 26013, Revision 20-Oct-2022. Catalogue range 470 pF to 22 µF at 63, 100,
250, 400, 630 and 1000 V DC.

In stock, read from the API on 2026-10-10 (prices USD):

| MPN | Value | V | Stock | 1+ | 10+ |
| --- | --- | --- | --- | --- | --- |
| MKT1813147635 | 470 pF | 630 | **0** Mouser / **431** Digi-Key (Bulk) | $1.97 | $1.318 |
| MKT1813215635 | 1.5 nF | 630 | 1962 | $1.91 | $1.32 |
| MKT1813322404 | 22 nF | 400 | 773 | $1.83 | $1.26 |
| MKT1813322405G | 22 nF | 400 | 2381 | $1.84 | $1.23 |
| MKT1813347254 | 47 nF | 250 | 377 | $1.93 | $1.33 |
| MKT1813410634 | 100 nF | 630 | 701 | $2.50 | $1.77 |

Two qualifications that matter and are easy to miss:

**The small values are not available at 63 V.** The 63 V block of the dimensions
table starts at **0.15 µF**. 470 pF through 4.7 nF exist only at 630 V;
6.8–10 nF at 400 V and above; 15–68 nF at 250 V and above. For a passive
line-level EQ that is harmless electrically — it is already an order of magnitude
of headroom at 63 V, and two at 630 V — but it is why the bodies are the size
they are, and it is not a free choice.

**MKT1813 is E6 only.** The capacitance column of every voltage block runs
0.00047, 0.00068, 0.0010, 0.0015, 0.0022, 0.0033, 0.0047, 0.0068, 0.010, 0.015,
0.022, 0.033, 0.047, 0.068, 0.10, 0.15, 0.22, 0.33 — no 0.0018, no 0.012, no
0.018, no 0.12. So it misses **all four** of the E12 values the boards need
(1.8 nF, 12 nF, 18 nF, 120 nF), where B32529 catalogues three of them and stocks
18 nF. **On coverage the axial family is worse, not better.**

### 1.3 The spans it would give

The smallest body, which carries 470 pF through 4.7 nF at 630 V, is
**D 5.0 mm × L 11.0 mm**. From document 26013:

- dimensional drawing: lead length **40.0 ± 5.0 mm** each side → worst case
  **35.0 mm**;
- lead-diameter table: **d = 0.6 mm** for D ≤ 5.0 mm;
- table footnote: **Pitch = L + 3.5**, so 14.5 mm nominal at L = 11.0.

Through `lib/kicad/lead-span-model.ts`, same bend standard (IPC-A-610E §7.1.2.1
and Table 7-1) and same arithmetic as every recorded entry, on 1.6 mm stripboard:

```
standoff           = max(0.6, 0.8)                     = 0.8 mm
bend radius        = 0.6         (d < 0.8 -> 1 D)      = 0.6 mm
centreline radius  = 0.6 + 0.6/2                       = 0.9 mm
quarter bend       = (pi/2) x 0.9                      = 1.4137 mm
descent (axial)    = 5.0/2 + 1.6                       = 4.1 mm

formable?          35.0 >= 1.4137 + 4.1 = 5.5137       -> yes

min reach pitch    = 11.0 + 2 x 0.8                    = 12.6 mm
                     ceil(12.6 / 2.54) = 5 steps       -> 6 holes

straight run       = 35.0 - 1.4137 - 4.1               = 29.4863 mm
max reach pitch    = 11.0 + 2 x (29.4863 + 0.9)        = 71.77 mm
                     floor(71.77 / 2.54) = 28 steps    -> 29 holes
                     clamped at VeroRoute's ceiling    -> 16 holes
```

**minSpanHoles 6, maxSpanHoles 16.** Reproduced by running `deriveSpanHoles` on
those dimensions directly, which returns
`{ minSpanHoles: 6, maxSpanHoles: 16, formable: true }`.

Sixteen is the tool's ceiling, not the lead's: the lead reaches 71.77 mm, which
is twenty-eight steps. So on the stretch axis the axial part behaves exactly like
the DIN0207 resistor, whose entry already records 16 for the same reason.

### 1.4 So does it lift the 12-hole bound?

**Yes.** The requirement is a 12-hole span on low-cut (an RCM bandwidth of 11
needs a span of 12). The radial box films cap out at 4 holes (B32529) and 3
(FKP2, which cannot be formed at all). An axial MKT1813 reaches the tool's 16,
with 55 mm of reach to spare. The constraint stops being the capacitor and
becomes VeroRoute's own ceiling — the same place the resistors already sit.

**But it replaces one bound with another, at the other end.** The axial part's
**minimum is 6 holes**, against the radial film's 2. Its 11 mm body has to lie
between the holes with a legal standoff at each end, and that is 12.6 mm, which
is five grid steps. So every capacitor on the board would occupy at least six
holes along its row. On mid — seventeen capacitors on a board with 37 columns —
that is a real constraint, and it is the opposite of the one being solved. The
honest summary is that the axial part trades a reach ceiling for a footprint
floor, and whether that is a good trade depends on a placement run nobody has
done.

### 1.5 The cost

**Price.** Like for like at 47 nF: MKT1813347254 is **$1.33** at the 10+ break
(Mouser, 2026-10-10); `docs/pultec/capacitor-selection.md` records
B32529C0473K000 at **£0.289** at 5+ and **£0.102** at 250+ (Farnell UK,
September 2026). Those are different distributors, different countries and
different days, and **no exchange rate is applied here**, so treat the ratio as
approximate: at any plausible rate the axial part is roughly **three to five
times** the radial one, and the gap widens at quantity because B32529's 250+
break drops further than MKT1813's does. Across the 49-capacitor set the radial
choice costs roughly £8–£10; the axial one, at a $1.30 mean, lands somewhere
around $65, which is a different order of purchase.

**Footprint and tooling.** This is the cost that is easy to overlook, and it is
not small:

- KiCad's `Capacitor_THT.pretty` holds twenty-eight `C_Axial_*` footprints. Their
  bodies are `L3.8/D2.6`, `L5.1/D3.1`, `L12.0/D6.5…10.5`, `L17.0`, `L19.0` and
  `L22.0`. **There is none at L11.0 × D5.0**, which is the MKT1813 body in
  question.
- Worse, of their pitches — 7.50, 10.00, 12.50, 15.00, 20.00, 25.00, 27.50 mm —
  only **P7.50mm** lands on the 2.54 mm grid within this repository's
  `PITCH_TOLERANCE_MM` of 0.15: 7.50 is 0.12 mm off three steps, while 10.00 is
  0.16 off four, 12.50 is 0.20 off five, 15.00 is 0.24 off six, and it gets worse
  from there. **Every `C_Axial` footprint big enough for a film capacitor is
  off-grid by this repository's own rule.**
- `lib/kicad/import-string.ts` derives nothing from a `C_Axial_` name. Its
  derivable shapes are `R_Axial_*`, `C_Disc_*`, `CP_Radial_*`, `DIP-*`,
  `PinHeader_*`, terminal blocks, `TO-92_Inline` and the RM-065 trimmer. An axial
  capacitor would refuse at export until a whitelist entry or a derivation rule
  were added.

So adopting the axial film means a new footprint **drawn by a person** (footprint
authoring is not an agent's job here), at an on-grid pitch, plus an import-string
entry, plus a lead-span entry. None of that is hard; all of it is work the radial
choice does not need.

**No lead-span entry has been recorded for MKT1813.** There is no footprint to
key it to, the operator has not chosen the part, and the arithmetic above is
reproducible from this document the moment either changes. Recording a span for a
footprint nothing places would also fail the existing test "every recorded and
unsourced footprint is one some board actually places".

### 1.6 Conflict with `docs/pultec/capacitor-selection.md`

**There is one, and it is not silent.** That document chose TDK/EPCOS B32529 and
states its reasons; two of them cut directly against the axial family:

- *"Body size matters, because the mid board carries 17 capacitors."* Its
  deciding Finding 2 is that B32529 holds a **2.5 mm** body width from 1 nF to
  220 nF, so almost every capacitor occupies one strip row. The MKT1813
  equivalent is a **5.0 mm diameter** cylinder on a 14.5 mm pitch — twice the
  width and three times the length between holes.
- *"Per-unit cost and availability are what matter. The builder is making
  several."* Its finding against Vishay MKT370 was that MKT370 costs "roughly
  2.7–3.4× the price of B32529 at the same value". MKT1813 lands in the same band
  or above it.

Its Finding 1 — "film/foil is out, metallized is in" — does **not** conflict:
MKT1813 is metallized PET, the same dielectric class as B32529.

**This document does not overturn that decision and must not be read as doing
so.** What it adds that was not known when that study was written is the
clustering argument: the study weighed body size, price, coverage and tolerance,
and the stripboard placement pipeline did not yet exist, so nothing in it weighed
*reach*. The operator now has a fourth axis, pulling the other way from the three
the study weighed. Four possibilities, none chosen here:

1. Keep B32529 and accept that low-cut cannot cluster to 12 holes, paying the
   cuts. `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md`
   section 3.1 puts clustering at 70% of low-cut's 23 cuts.
2. Keep B32529 and reach the distant strip with a **wire link** instead of the
   capacitor's own lead. `WIRE` has min 2 and max `INT_MAX` per that spec's §3.2
   table, so it is the one unbounded span the tool has. This costs a link per
   long net and no money.
3. Move to MKT1813 on **low-cut only** — the board that needs the span and has
   the fewest capacitors (7).
4. Move to MKT1813 throughout, paying the price and the 6-hole floor.

Option 2 is not a part question and was not researched here; it is noted because
it is the cheapest thing on the list and the spec already shows the tool allows
it.

---

## 2. The two footprint families that refuse

Both still refuse. Both refusals have been rewritten in `lib/kicad/lead-span.ts`
to say what was read and what is still missing, and
`tests/kicad/lead-span.test.ts` now pins the specific facts so they cannot be
quietly collapsed back into "no lead length is sourced".

### 2.1 `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` — still refusing

Two families were read, and they fail for **different** reasons.

**Vishay BCcomponents D Series** (Document Number 28549, Revision 08-Jan-2026)
publishes no lead length. Read from the "ORDERING CODE INFORMATION" table on
page 2: digit 13 is headed "Packaging / Lead Length" and its entire value set is
`3 = bulk`, `T = tape and reel`, `U = ammo` — packaging, not millimetres. The one
length the document does print is in the taping section: "Length of cut leads
**L 11.0 max.**", which is a *maximum* for a lead the tape has already cut and
therefore bounds nothing from below. The page-1 lead-configuration drawing labels
a dimension `L` on each of the J, L, K and T styles but puts no number on it.
Page 1 also notes "Lead-spacing 2.5 mm is available for L lead configuration
only", so a 2.5 mm part is necessarily an `L`-style part.

The three D Series parts Mouser returned are all 5.0 mm lead spacing (digit 15 =
`5`), not 2.5: `D222K25Y5PF63L5R`, `D102K20Y5PF6TL5R`, `D101K20X7RF6UJ5R`.

**Walsin's disc catalogue** does state a lead length, and this is the one new
fact of the section. Its "CERAMIC CAPACITOR PART NUMBER EXPLANATION" gives a
ten-field code, and Mouser's listings decode cleanly against it. Taking
`YP500471K040B20C2P` (Mouser 791-YP500471K4020C2P, "CAP Y5P 470 pF 10 % 50V
2.5LS 20LL Bulk", 5524 in stock, $0.13 at 1+):

| Field | Value | Meaning, from Walsin's own table |
| --- | --- | --- |
| 1 | `YP` | Y5P (±10%) |
| 2 | `500` | 50 VDC |
| 3 | `471` | 470 pF |
| 4 | `K` | ±10% |
| 5 | `040` | diameter code; **D max 4.5 mm** at 50/100 V Y5P |
| 6 | `B` | lead style |
| 7 | `20` | bulk **length 20.0 mm** |
| 8 | `C` | length tolerance **"Min."** |
| 9 | `2` | pitch **2.5 ± 0.8 mm** |
| 10 | `P` | coating (the table prints only `A` and `H`; `P` is not explained) |

Lead wire diameter is **φd 0.55 ± 0.05 mm**, printed under every one of the
catalogue's eight dimension tables.

So the lead length is a stated **minimum of 20.0 mm** — exactly the kind of
figure the Vishay part lacks, and strong enough to derive from. Through the same
model, at the nominal wire:

```
standoff           = max(0.55, 0.8)                     = 0.8 mm
bend radius        = 0.55       (d < 0.8 -> 1 D)        = 0.55 mm
centreline radius  = 0.55 + 0.55/2                      = 0.825 mm
quarter bend       = (pi/2) x 0.825                     = 1.2959 mm
descent (radial)   = 0 + 1.6                            = 1.6 mm
dogleg overhead    = 0.8 + 2 x 1.2959 + 1.6             = 4.9918 mm

formable?          20.0 >= 4.9918                       -> yes

min reach pitch    = one grid step (radial)             = 2.54 mm -> 2 holes
straight run       = 20.0 - 4.9918                      = 15.0082 mm
max reach pitch    = 2.5 + 2 x (2 x 0.825 + 15.0082)    = 35.816 mm
                     floor(35.816 / 2.54) = 14 steps    -> 15 holes
```

**2 to 15 holes**, and the figure is stable across the whole ±0.05 mm wire
tolerance: 0.50 mm gives 35.988 mm and 0.60 mm gives 35.645 mm, both of which
floor to the same fourteen steps. A test now recomputes all three.

**Why the entry was not recorded anyway.** Walsin's catalogue covers **100 pF to
22000 pF** and no further; there is no 0.1 µF ceramic disc in it at any diameter,
and at 50 V the `040` diameter code — the only one inside this footprint's 5.0 mm
— stops around 1000 pF (the 1500 pF part Mouser lists, `YP500152K050B20C2P`, is
diameter code `050`, D max **5.5 mm**, already over the footprint). `pt2399-core`
puts **nine** components on this footprint: 560 pF ×2, 5600 pF ×2, 0.01 µF ×1 and
0.1 µF ×4. Walsin's 2.5 mm-pitch discs inside a 5 mm diameter cover **two of the
nine**.

Recording a 15-hole maximum derived from a 470 pF disc, and letting the placer
apply it to a 0.1 µF part whose leads are nothing like 20 mm, is precisely the
failure `lib/kicad/lead-span.ts` exists to prevent: the arithmetic would look
right and the board would not build. So the refusal stays, and it now carries
both halves of the finding.

**What settles it.** Name the part actually fitted to the 0.01 µF and 0.1 µF
positions. The strong suspicion — worth stating because it changes which file is
wrong — is that they are **multilayer (monolithic) ceramics, not discs**, in
which case the footprint is the thing to change rather than the whitelist. A
0.1 µF 50 V part at 2.5 mm lead pitch in a body under 5 mm is a routine MLCC and
an unusual disc. That is a judgement about `circuits/pt2399-core/pt2399-core.ts`,
which is derived from an authored schematic, so it belongs to the designer.

One further mismatch, recorded rather than hidden: the Walsin `040` part's
thickness is **T max 3.5 mm** against the footprint's `W2.5mm`. The footprint was
drawn from a Reichelt "KERKO" datasheet (its own `descr` says so) and its drawn
body is 5 × 2.5 mm. A radial part's body does not enter the span arithmetic — it
stands above the board — so this does not change the numbers above, but a 1.0 mm
overhang is worth knowing before anybody classifies the part by strip rows.

### 2.2 `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm` — still refusing, but the part exists

**The question "does a part exist?" is now answered: yes.** This is the
substantive change in this section, because the standing suspicion was that the
footprint was one size off and should have been `CP_Radial_D5.0mm_P2.00mm`.

Panasonic's M-A (ECA) series datasheet, **ABA0000C1218, dated 01-Sep-25**, has a
"Case size" block and a "Lead space" column group with three columns per row:
**Straight / Taping ✽B / Taping ✽i**. Every φ5.0 × 11.0 mm row reads
**2.0 / 5.0 / 2.5**, and the footnote under the table states it in words:

> When requesting taped product, please put the letter "B" or "i" between the
> "( )". Lead wire pitch ✽B=5 mm, 7.5 mm, **i=2.5 mm**

So both readings were right: the **straight-lead** φ5 can is 2.0 mm, as
Nichicon's PS, VZ and UM tables also have it — and the **2.5 mm** part is the
taped-and-formed "i" variant, whose leads the tape crimps to that pitch and which
keeps it when cut out. The sourcing notes already allow exactly this substitution
(2026-09-30: "where a taped-and-formed variant … shares the same lead pitch as
the straight-lead row … that variant is an equally good fit and is often the one
actually in stock").

It exists at precisely the two values `pt2399-core` puts on this footprint —
4.7 µF and 10 µF:

| V | C | øD × L | φd | Straight / ✽B / ✽i | Part No. |
| --- | --- | --- | --- | --- | --- |
| 50 | 4.7 µF | 5.0 × 11.0 | 0.5 | 2.0 / 5.0 / 2.5 | `ECA1HM4R7( )` |
| 50 | 10 µF | 5.0 × 11.0 | 0.5 | 2.0 / 5.0 / 2.5 | `ECA1HM100( )` |
| 100 | 4.7 µF | 5.0 × 11.0 | 0.5 | 2.0 / 5.0 / 2.5 | `ECA2AM4R7( )` |
| 100 | 10 µF | 5.0 × 11.0 | 0.5 | 2.0 / 5.0 / 2.5 | `ECA2AM100( )` |

Panasonic's taping document **DMF0000COL51, dated 25-Aug-21**, confirms the
forming independently: its Figure C is headed "Lead space : 2.5 mm / øD×L :
ø5×11, ø6.3×5, 7, 11.2, 15, ø8×5, 7", with **F nominal 2.50, +0.5**. The
repository's earlier reading of this document was correct as far as it went; what
it missed is the M-A series table that names the orderable part.

**So the footprint is not a phantom, pt2399-core is not a filing error, and the
part fitted today can legitimately be a φ5 can at 2.5 mm.**

**What is still missing is only the lead length of the formed variant.** The M-A
dimensional drawing carries "14min." and "3min." on the lead, but that drawing is
of the **straight-lead** part; the "i" variant's leads are cut by the tape. The
taping document gives tape geometry — 18.50 `+0.75/-0.50`, 9.0 ± 0.5, protrusion
"0 to 1.5", tape width 18.0 ± 0.5 — from which a free lead length below the body
can be *inferred* at roughly 27–29 mm, but that is a chain of three assumptions
about which datum each dimension runs from, not a reading. This repository does
not record inferred dimensions, so no span is recorded.

**What settles it.** Either ask Panasonic for the cut lead length of the "i"
variant, or decide that the can actually fitted is a straight-lead φ5 part, in
which case the remedy is to change the footprint to `CP_Radial_D5.0mm_P2.00mm` —
which `lib/kicad/lead-span.ts` already records, at 2 to 11 holes, on the
Nichicon PS 15 mm lead.

---

## 3. The inductors

**No current-production, in-stock part was found at any of the values, and the
Carnhill part the documentation cites is at neither distributor.** The values
wanted are mid 2, 1, 0.45, 0.22, 0.1 H and hi-boost 0.6, 0.3, 0.2, 0.1 H
(`docs/pultec/values.md`, "Discrete inductor specification": ±20% tolerance,
DCR ≤ 1 kΩ with ≤ 500 Ω preferred, line level).

### 3.1 The VTB9050, chased first

`bun run parts lookup VTB9050` returned, verbatim:

```
Mouser: no exact match for "VTB9050".
Digi-Key: no exact match for "VTB9050".
```

A web search identifies it as a **Carnhill** multi-tapped inductor with taps at
0.1 / 0.16 / 0.22 / 0.45 / 1 / 2 H — which is exactly the mid section's value set
plus one, and is why `docs/pultec/values.md` lists those values. Carnhill's own
site did not resolve (`carnhill.co.uk/inductors/` returned HTTP 404), so its
production status could not be confirmed from the manufacturer. **It is not a
distributor part**; it is bought from Carnhill or a reseller.

### 3.2 A catalogue 1 H part does exist — and nothing is on the shelf

`parts search 1H fixed inductor through hole --supplier digikey` returned eight
**Gowanda Electronics** through-hole parts, all at 1 H, all radial:

| MPN | L | I | DCR | Stock |
| --- | --- | --- | --- | --- |
| `927T1007` / `927T1007LF` | 1 H | 81 mA | 70 Ω | **0** |
| `930T1007` / `930T1007LF` | 1 H | 81 mA | 110 Ω | **0** |
| `203T1007` / `203T1007LF` | 1 H | 48 mA | 135 Ω | **0** |
| `047T1007` / `047T1007LF` | 1 H | 18 mA | 290 Ω | **0** |

**Every one of those DCRs is inside the spec**, and three of the four are inside
its stated preference of ≤ 500 Ω. A secondary source describes `927T1007` as a
toroid, 2% tolerance, self-resonant at 170 kHz — well clear of the audio band —
in a 1.4 in OD × 0.7 in body, and offers it as NOS. That description was **not**
read from Gowanda and is recorded here as hearsay, not evidence.

The stock figure is the finding. `parts search Gowanda inductor through hole
radial --supplier digikey --limit 15` returned fifteen parts across the DB1
series and **every one reads `stock: 0`**. Gowanda is a build-to-order
manufacturer as far as Digi-Key is concerned. So "a current-production catalogue
part exists at 1 H" is true, and "you can buy one this week" is not.

Mouser's side of the question (`parts search 1H inductor radial`, `parts search
choke audio inductor henry`) returned nothing in the 100 mH – 1 H band at all:
its leaded-inductor catalogue is power and RF parts topping out at 10 mH (Bel
Signal Transformer DRC-0608-103J-UL, 10000 µH), plus Hammond's valve-amp filter
chokes (194G, "3 H @ 250 mA", 107 in stock), which are the right inductance but
are large, iron-cored, high-current parts meant for a power supply rather than a
signal path. One Mouser description read "12000 H" (DRC-V-150K) and one read
"2x440H" (TDK B82552J2444J021); both are unit errors in Mouser's own description
text and are noted so nobody chases them.

Nothing at 100–600 mH was found at either distributor.

### 3.3 The specialist route

E. A. Sowter Ltd (Ipswich, UK) builds purpose-wound EQ inductors to order and
publishes the tap sets. From `sowter.co.uk/eqinductors.php`:

| Part | Equipment | Inductance | DCR |
| --- | --- | --- | --- |
| 9312 | Neve T1530 | 2 / 1.1 / 0.45 H | 85 / 59 / 35 Ω |
| 9325 | **Pultec EQP-1A** | 150 / 82 / 68 / 47 / 33 / 27 mH | 18 / 12 / 11 / 9 / 8 / 7 Ω |
| 9858 | **Pultec MEQ-5A** / Gyraf ME5 | 420 / 277 / 145 / 108 / 61 / 34 mH | 42 / 32 / 22 / 19 / 14 / 10 Ω |
| 9930 | Gyraf/Pultec SRPP | 269 / 169 / 69 / 22 mH | 33 / 25 / 15 / 8 Ω |
| 9955 | Gyraf/Pultec MEQ5 low boost | 528 / 420 / 200 / 120 mH | 76 / 66 / 43 / 33 Ω |

No price is on the page. **None of these tap sets matches this project's
values** — they are the MEQ-5A's own set (420/277/145/108/61/34 mH), not the
VTB9050's (0.1/0.16/0.22/0.45/1/2 H). Sowter's 9312 comes closest to the mid's
top three at 2 / 1.1 / 0.45 H and has nothing at 0.22 or 0.1.

### 3.4 The honest answer, and the alternatives

**"The 1 H inductor has no orderable part number" is no longer quite right.**
`927T1007` is a part number, at 1 H, with a DCR inside the spec, carried by
Digi-Key. What is true is that **no distributor holds stock of it or of anything
at 100–600 mH**, so every route to these nine inductors is a factory order, a
specialist winder, or NOS.

Four ways forward. **None is chosen here** — the frequency set is a design
decision and the mid's 2 H has never been verified as achievable in a reasonable
core (`docs/pultec/unresolved.md` item 7).

1. **Factory-order the Gowanda T-series parts**, if the family covers 100–600 mH
   as well as 1 H. It was not possible to confirm the family's full value range:
   Gowanda's own series datasheet was not read, and Digi-Key's listing only
   surfaced the 1 H members. That is the cheapest thing left to check and it was
   left undone deliberately rather than guessed at.
2. **Buy one tapped inductor** — a Carnhill VTB9050/VTB9042, or a Sowter wound to
   this project's taps. This is what the original design did. It reinstates the
   winding-coupling question `docs/pultec/unresolved.md` section 7 records as
   retired by the discrete-inductor redesign, so it is a design reversal, not
   just a purchase.
3. **Gyrate.** A simulated inductor removes the part problem entirely and
   replaces it with an active stage in a circuit whose whole premise is that it
   is passive. That is a change of kind.
4. **Re-derive the frequency set around a tap set that can actually be bought** —
   Sowter's 9858, say, whose six taps are a real Pultec MEQ-5A's. The boards'
   capacitor values would all move, and so would
   `docs/pultec/capacitor-selection.md`.

Options 2 and 4 each have a documented consequence elsewhere in this repository
and neither should be taken without reading it first.

---

## 4. What changed in the repository

- `lib/kicad/lead-span.ts` — both `UNSOURCED` messages rewritten to carry what
  was read, which document said it, and what is still missing. The header
  comment's inductor paragraph now points here. **No new span recorded**: both
  families still refuse, and for the reasons above that is the correct outcome.
- `tests/kicad/lead-span.test.ts` — three tests added. Two pin the specific
  documents and part numbers in each refusal so the detail cannot be collapsed
  back to a generic message; the third recomputes the 2-to-15-hole figure the
  disc refusal quotes, at all three ends of Walsin's wire tolerance, so a quoted
  number in a message is checked the same way a recorded one is.
- This document.

---

## 5. What this document does not establish

- **No physical part has been measured.** Every dimension is a datasheet claim,
  and every price and stock figure is one API response on one day.
- **The Walsin catalogue carries no revision or date**, and the copy read was a
  third-party mirror because Walsin's own site 404s. Everything attributed to it
  should be re-read against a dated copy before it is relied on for a purchase.
- **The MKT1813 span was derived, not recorded**, and no placement run has been
  done with it. The claim "it lifts the 12-hole bound" is arithmetic on a
  datasheet, not an observed layout.
- **Gowanda's value range below 1 H was not established.** Only the 1 H members
  surfaced in the Digi-Key search; the series datasheet was not read.
- **Carnhill's production status is unknown.** Its own site did not resolve.
- **`927T1007`'s tolerance, SRF and body size come from a reseller listing**, not
  from Gowanda, and are flagged as hearsay in section 3.2.
