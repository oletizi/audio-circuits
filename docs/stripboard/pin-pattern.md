# Whether a footprint's pins decompose into rows the strips can take

This is the reasoning behind `lib/kicad/pin-pattern.ts` and
`lib/kicad/pin-pattern-model.ts`. Every pad coordinate below was read off a
`.kicad_mod` in the installed KiCad footprint library on 2026-10-10, and one
test opens those files again and compares pad by pad. Nothing here is recalled.

The code is the authority for the values; this page is the authority for *why*
they are those values, and is the thing to read before adding an entry.

---

## 1. Whose rule this is

`HC10` in `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
is the owner's, in his words:

> I'm not going to mount a round switch into a stripboard. That never works.
> Round footprints do not work well with stripboard.

**It is a cost judgement, not a geometric impossibility.** A circle of pins
*can* be routed — with a cut at nearly every pin, and with the body then sitting
over holes it does not use. The justification is that the cut cost is
prohibitive and that he will not build such a board. Nothing in either module
claims the board could not be built, and the provenance stays **[owner]**.

**It is a rule about pin geometry, not body shape**, and that distinction
decides whether it is useful or catastrophic. A radial electrolytic has a
cylindrical body and two inline leads, and is placeable: three of the thirteen
recorded footprints are exactly that. Read `HC10` as banning round *bodies* and
every electrolytic on every board becomes unplaceable.

## 2. Two axes, two different rules, and the asymmetry is physical

`HC10` refuses "a pattern not decomposable into rows parallel to the strips",
and names "rows plural, and decomposability is the test". Decomposing is a
question about each axis separately, and the two axes do not get the same rule.

**Across the strips, the row separation must be a whole number of grid steps.**
A row of pads lands on one strip and the next row on another, and the strip
pitch is 2.54 mm. There is no bending that puts a lead *between* two strips.
This is the clause that refuses outright, and `classifyPads` returns
`off-strip-lattice` when it fails on **both** axes, naming the two rows, their
separation and the residual.

**Along a row, the pad spacing does not have to be a grid multiple** — a lead
moves along its own strip by entering a different hole in it, so this direction
has latitude the across direction does not. `classifyPads` therefore *reports*
the along-row pitches and whether they are on the grid, as a fact. It does not
rule on them: the verdict needs recorded data, and `classifyPads` is pure
arithmetic over the pads.

Both axes are tried, x first. A classifier that tried one axis and gave up would
refuse a DIP whose rows happen to lie along the other one, and a ring would then
be refused for the wrong reason.

## 3. Formed leads, and why collinearity is not evidence of mountability

`Package_TO_SOT_THT:TO-92_Inline` is the worked case. Its three pads read
`(at 0 0)`, `(at 1.27 0)` and `(at 2.54 0)` — collinear, at **half** a grid
step. One row, so it decomposes trivially; and **two of the three leads are
between holes as moulded.** What puts them in holes is *forming the leads*: a
physical operation performed once with pliers, before the part is fitted.

So **collinearity does not establish that leads enter holes**, and an off-grid
along-row pitch is admitted only on a **recorded** `formed-to-grid`
accommodation, carrying its own `basis` and `DatasheetRef`. The rule
`admitPattern` applies has three clauses:

1. **On-grid along the row** — the accommodation is `as-moulded` and the part
   drops in. Ten of the thirteen are here.
2. **Off-grid, on a family `lead-span.ts` records as `formable`** — the forming
   claim already exists, with its datasheet, as `minSpanHoles`/`maxSpanHoles`.
   The pin pattern **cites** it and does not restate it: a second copy of a
   datasheet figure is the thing `PAR2` exists to prevent. The two `CP_Radial_*`
   cans are here.
3. **Off-grid, on a family `lead-span.ts` records as `formable: false`** —
   nothing in the span module says those terminals may be moved at all, so the
   pitch is unmountable unless a one-time preparation is recorded.
   `TO-92_Inline` is here, and it is the only one of the thirteen that is both
   off-grid along its row and non-formable.

In clauses 2 and 3 alike, an `as-moulded` record on an off-grid pitch is
refused, by name, saying what is missing and why it is not defaulted. The
refusal's *remedy* differs by formability; the refusal does not. (The task brief
scoped that refusal to clause 3 only. It is applied to both here because a
`formable` family's recorded reach is a claim about how far leads *can* be bent,
which says nothing about whether this footprint's own moulded pitch *was* bent
onto the grid — so an `as-moulded` record on an off-grid pitch is a false
statement either way. `tests/kicad/pin-pattern.test.ts` covers both sides.)

The opposite direction is refused too: a `formed-to-grid` record on a pattern
already on the grid is a claim about an operation nobody performs. Left standing
it would be decoration, and decoration here would quietly license the off-grid
case beside it.

## 4. The thirteen footprints, as measured

Every file is under
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/<Library>.pretty/`
and every one carries `(version 20260206)`. "Rows" is the decomposition
`classifyPads` derives, on the axis it reports; "extents" are
`preparedExtentsHoles`, along-row first and across-axis row count second.

| Footprint | Pads | Rows (axis x) | Row pitch, steps | Along-row pitch | Accommodation | Extents, holes | Span recorded in `lead-span.ts` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` | 2 | 1 × 2 | — | 10.16 mm | as-moulded | 5, 1 | 5–16 | eligible |
| `Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm` | 2 | 1 × 2 | — | 5.00 mm | as-moulded | 3, 1 | 2–4 | eligible |
| `Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm` | 2 | 1 × 2 | — | 5.00 mm | as-moulded | 3, 1 | 2–4 | eligible |
| `Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm` | 2 | 1 × 2 | — | 5.00 mm | as-moulded | 3, 1 | 3–3 | eligible |
| `Capacitor_THT:CP_Radial_D5.0mm_P2.00mm` | 2 | 1 × 2 | — | **2.00 mm** | **formed-to-grid, 1 step** | 2, 1 | 2–11 | eligible |
| `Capacitor_THT:CP_Radial_D6.3mm_P2.50mm` | 2 | 1 × 2 | — | 2.50 mm | as-moulded | 2, 1 | 2–11 | eligible |
| `Capacitor_THT:CP_Radial_D8.0mm_P3.50mm` | 2 | 1 × 2 | — | **3.50 mm** | **formed-to-grid, 1 step** | 2, 1 | 2–11 | eligible |
| `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical` | 1 | 1 × 1 | — | — | as-moulded | 1, 1 | 1–1 | eligible |
| `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` | 2 | 2 × 1 | 1 | — | as-moulded | 1, 2 | 2–2 | eligible |
| `Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical` | 5 | 5 × 1 | 1, 1, 1, 1 | — | as-moulded | 1, 5 | 5–5 | eligible |
| `Package_DIP:DIP-16_W7.62mm` | 16 | 8 × 2 | 1 × 7 | 7.62 mm | as-moulded | 4, 8 | 8–8 | eligible |
| `Package_TO_SOT_THT:TO-92_Inline` | 3 | 1 × 3 | — | **1.27 mm** | **formed-to-grid, 1 step** | 3, 1 | 3–3 | eligible |
| `Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical` | 3 | 2 (2 + 1) | 2 | 5.00 mm | as-moulded | 3, 2 | 3–3 | eligible |

The three off-grid entries are the three with a recorded accommodation, and the
three with a recorded accommodation are the three off-grid entries. Each carries
a `DatasheetRef`:

- the two `CP_Radial_*` cans cite the Nichicon PS catalogue (`CAT.8100Z`) — the
  document `lead-span.ts` already records as the authority for these two
  footprints — and cite the **reach that module derived** rather than restating
  its lead-length figure;
- `TO-92_Inline` cites a file on disk:
  `Package_TO_SOT_THT.pretty/TO-92_Inline_Wide.kicad_mod`, which is KiCad's own
  footprint for the **same** package (both tagged `to-92 sc-43 sc-43a sot54
  PA33 transistor`) with its three pads at `0`, `2.54` and `5.08` — i.e. the
  formed pattern, shipped as a footprint. The NXP document that file's `descr`
  points at (`sot054_po.pdf`) was **not** read, and nothing is attributed to it.
  The bend itself is governed by `BEND_RULE` in `lead-span-model.ts`, and
  `lead-span.ts`'s own prose already describes this preparation: *"the part is
  splayed to the grid once, as a fixed preparation, and is not a lever
  afterwards."*

**All thirteen are `eligible`, so nothing here is a finding to carry.** In
particular the five footprints the Pultec boards place — the three `C_Rect`
film-capacitor families and the DIN0207 resistor
(`circuits/pultec/physical/parts.ts`), plus `PinHeader_1x05_P2.54mm_Vertical`
for the inter-board headers — are all on-grid along their rows and all
`as-moulded`. None of them needed an accommodation, which is what was expected:
an accommodation added to clear a refusal would be a widening of the gate
wearing a data file's clothes.

## 5. The cross-check, and the two weaknesses it has

`admitPattern` cross-checks every recorded accommodation against
`leadSpanFor`, so that the accommodation is not a free-text claim: **the
prepared pattern's hole extent on one of its two axes must lie inside
`[minSpanHoles, maxSpanHoles]`.** No span figure is written in either pin-pattern
module — both numbers are read from the modules at run time.

**It is a disjunction over two axes, and that is a stated weakness.** It catches
a recorded extent that matches **neither** axis; it does **not** catch one that
matches the wrong one. Neither module says which axis a `fixedSpanHoles` is
measured along, and inventing that correspondence was not available here. The
measurements show the disjunction is doing real work in both directions rather
than always picking the same axis: `R_Axial`'s span is matched by its along-row
extent (5 of 5–16), `DIP-16`'s by its across-axis row count (8 of 8–8), and
`PinHeader_1x02`'s likewise (2, where its along-row extent is 1). A family added
later that satisfies neither has a transcription error in one module or the
other, and the refusal names both rather than picking a winner.

**The second weakness is in `classifyPads`:** the along-row pitches are compared
*within* a row, so two rows whose holes are mutually offset by a fraction of a
step would still classify as `rows`. No recorded footprint is in that shape —
the one pattern with an offset pad, the RM-065 trimmer, is offset by a whole step
(2.50 mm, which is KiCad's rounded metric for 0.1 in) — and the gap is recorded
here rather than papered over.

## 6. A divergence to report to the owner

**`HC10` as worded is about a placement; the check built here is about a
footprint, and they are not the same claim.**

- `HC10`'s criterion sentence says *"every placed part's pins lie on straight
  lines parallel to the strips"*. That is a property of a produced layout.
- CRITERIA's own "Checked by" column specifies a **footprint-level** check,
  which refuses *"by name before any placement exists to grade"*, and names
  `lib/kicad/lead-span.ts` as the place by shape.

These two modules are the **footprint half**: they answer "do this footprint's
pads decompose into rows at all?". A footprint that decomposes along one axis
still has to be **mounted** compatibly, and a layout that was not is a layout
this check passes. That placement half needs each placed part's pin positions
and its direction, and it is the other clause of `HC10`'s own criterion sentence
rather than a new criterion.

**THE SENTENCE ABOVE SAID "so those rows lie ALONG the strips" UNTIL 2026-10-13,
AND THAT WAS STALE IN TWO SEPARATE WAYS.** The owner reversed it on 2026-10-11 —
*"dips should span strips with a cut down the middle, like a breadboard"* — so a
row CROSSES the strips, and he amended it again on 2026-10-13 so that a row
sharing a piece of copper is a fault only when nothing separates pins that must
not be joined. The placement half is built (`tools/stripboard/constraints-pattern.ts`
and `row-copper.ts`) and the dump does carry `DIRECTION`. **The authorities are
`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`'s `HC10`
row and `docs/stripboard/pipeline-verification.md` §3, §3.4a and §3.4b**; this
section states only the footprint/placement division, which is unchanged.

**The owner's call:** if the "Checked by" column is read as the whole of `HC10`,
the placement half is deleted and the gap it covers is restored — a layout could
then place a decomposable footprint across the strips and `HC10` would report
that it held. If the criterion sentence governs, both halves are needed and
`HC10` is checked in two places.

## 7. Adding an entry

An unlisted footprint throws. To add one:

1. Open the `.kicad_mod` in the installed library. **Verify the name against the
   thing itself** — this repository has twice shipped a footprint that does not
   exist.
2. Record every pad with its `(at x y)` centre, the file path, the file's
   `(version <n>)` token and its total pad count. A pad deliberately not
   classified goes in `excludedPads` with a reason; the test requires
   transcribed plus excluded to account for every `(pad …)` form in the file.
   A rotation in `(at x y rot)` does not move a pad's centre and is not read.
3. Record the classification `classifyPads` derives from those pads. Do not
   compute it in the data file: the whole point of the split is that a
   transcription error is caught by arithmetic that cannot have been written to
   match it.
4. Decide the accommodation and record it. If the along-row pitch is off the
   grid, that means a `formed-to-grid` entry with a `basis` saying what is
   formed from what to what, and a `DatasheetRef`. If it is on the grid, it is
   `as-moulded` and a `formed-to-grid` record will be refused as spurious.
5. Record the family's lead span in `lib/kicad/lead-span.ts` as well, if it is
   not there: a footprint with a pattern and no span is refused, because the
   cross-check has nothing to check against.
