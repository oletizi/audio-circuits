---
status: unreviewed
circuit: pultec-low-boost
tools: copperhead (drafting) + akcli-kicad 0.22.0 (repair) + KiCad 10.0.5
---

# Hybrid pass 1 — copperhead draws, akcli repairs

**The drawings produced here are UNREVIEWED.** Nothing in this document is a
judgement of any page. Everything below is either a measurement, a statement of
what is on the page, or a statement of what was changed and why. Per
`EVALUATING-DRAWINGS.md` §1 and §2, the only qualified reviewer is the owner.

## What this pass was

First run of the combination: take a sheet **copperhead** generated, repair it
with **akcli-kicad**, and keep the circuit identical. The owner named four
defects from zoomed crops; the remedies are the agent's, per §8.

## 0. Provenance of the sheet under repair

The owner selected `probe-p1-meaningful`. No `.kicad_sch` sat beside that PDF,
so the source had to be identified rather than assumed.

`trial-lcapy-copperhead/copperhead/v-p1-meaningful/pultec-low-boost.kicad_sch`
was re-rendered with `kicad-cli sch export pdf` and compared byte-for-byte with
`RENDERS-pultec-low-boost/probe-p1-meaningful.pdf`:

```
len 94729 94729
EQUAL AFTER DATE REDACTION
```

The two PDFs differ only in `/CreationDate`. That sheet is the source of the
page the owner looked at. Its sha256 is

```
e3755218155f1b76752f820783bf7ac03e4e45d11f980db32516009bf7655cd6
```

It was copied into a working directory; the trial's files were not modified.

## 1. Does akcli damage a copperhead sheet? — measured, before any repair

This was an open question and it was settled first. The probe was a **semantic
no-op**: `set_component_transform RV1 rotation 0 mirror none`, which is RV1's
existing transform, forcing akcli to parse and rewrite the whole file while
changing nothing.

| measure | before | after |
| --- | --- | --- |
| sha256 | `e3755218…` | `d46d9b97…` — DIFFERS |
| token families present | 70 | 70 |
| `global_label` | 13 | **13 — SAME** |
| `label` | 8 | 8 — SAME |
| `symbol` | 49 | 49 — SAME |
| `wire` | 78 | 78 — SAME |
| `property` | 170 | 170 — SAME |
| `pin` | 83 | 83 — SAME |
| `rectangle` | 12 | 12 — SAME |
| `junction` | 6 | **8 — +2** |

Five token families moved and all five moved by exactly `+2`: `junction`, `at`,
`color`, `diameter`, `uuid` — which is exactly what two `(junction …)` elements
require. **The whole-file textual diff is three lines: two added junctions and
nothing else.**

```
> (junction (at 88.9 144.78)  (diameter 0) (color 0 0 0 0) (uuid "26cd50e1-…"))
> (junction (at 161.29 144.78) (diameter 0) (color 0 0 0 0) (uuid "0648d6cf-…"))
```

`kicad-cli sch export netlist --format kicadxml` before and after: **15 nets,
net names identical, per-net `REF.PIN` sets identical.**

**What the two added junctions are.** Both sit at the ends of the cap-bank
ground trunk at `y=144.78`, where a capacitor's drop, the horizontal trunk and
a power symbol's pin all terminate — three wire ends at one point. copperhead
had dotted the four interior tees and not the two ends. akcli dots them. The
addition is electrically inert (netlist identical) and adds two visible dots.

**Finding: akcli's rewrite of a copperhead sheet is surgical.** It does not drop
`global_label`, which is the failure a different library (`kicad-sch-api`)
showed in an earlier trial. It normalises junction dots at three-way wire ends.
It wrote a rotated backup to `.akcli/backups/` and offers `akcli undo`.

**Caveat that is not damage but is visible.** akcli writes *new* elements in a
compact single-line s-expression style, where copperhead pretty-prints across
lines. KiCad reads both; a KiCad save would reformat. It makes a `git diff` of
an akcli-edited sheet read unevenly.

## 2. The four repairs

All four were applied as **one op-list of 26 ops** in a single
`akcli draw --apply` against a pristine copy. The op-list is committed beside
this document's artifacts as `repairs-all.json`.

### Repair 1 — RV1's ground (Lo boost)

The owner: *"this ground symbol is folded back on its wire. Ideally, the ground
terminal of the pot symbol would point down or horizontally so the ground wire
doesn't hairpin"*, and subsequently: *"the hairpin ground is also noisy and bad
style — stemming from poor part orientation or placement. Hairpins in general
are an indicator of something amiss with symbol organization, orientation,
and/or placement."*

**Measured cause.** RV1 was at `(189.23, 53.34)` rotation 0, which puts pin 1 —
its grounded terminal — at the **top** at `(189.23, 49.53)`. A wire ran *up*
from there to the `power:GND` pin at `(189.23, 46.99)`. A KiCad `GND` symbol's
pin is at its top and its triangle is drawn 2.54 mm **below** the pin, so the
triangle covered exactly the 2.54 mm of wire that fed it.

**Was the cause the orientation or the routing?** `EVALUATING-DRAWINGS.md` §6
requires looking upstream first and does **not** forbid a hairpin outright — it
demands a defence, with the prior against it. So the question was asked rather
than assumed. **With pin 1 at the top, no routing fixes it.** A KiCad `GND`
symbol's pin is at its top and its body hangs below; placed above a pin, the body
points back at the part whatever path the wire takes. The only routing-only
remedies are to invert the triangle (rotating the symbol 180° so its apex points
up, which is not what a ground symbol means) or to approach sideways and still
end with the triangle pointing back down at the part. **The cause is the
orientation**, and that is the defence for treating it there.

**The remedy.** RV1's transform was changed to `mirror x`, which swaps pins 1
and 3 and leaves the wiper on the right: pin 1 now at `(189.23, 57.15)`,
**facing down**. The ground then leaves the part downward and the triangle
continues downward. The wire was not straightened with the orientation left
alone.

The orientation table was obtained from the tool, not computed — `akcli pins
Device:R_Potentiometer --at 7450 2100 --rotation R --mirror M --json` for all
twelve combinations. It shows that **no orientation puts pin 1 downward with
both pin 2 and pin 3 on the right**: a downward pin 1 forces the symbol vertical,
which puts pin 3 at the top. Pins 2 and 3 are the same net (`lo_boost_in`), so a
strap is required. The strap chosen runs `(189.23, 49.53) → (195.58, 49.53) →
(195.58, 53.34)`, 10.16 mm with one corner, replacing copperhead's 20.32 mm
two-segment path out to the `x=207.01` column.

**The alternative that was considered and not taken**, recorded because it is
the owner's other named option. `rotation 90, mirror x` makes the pot horizontal
with pin 1 facing **left**, and lands pins 2 and 3 exactly on the two existing
wire starts — zero signal-wire changes. It was not taken because the ground
symbol's body would then extend to `x = 182.88`, **1.27 mm outside the Lo boost
group rectangle's left edge at `x = 184.15`**; avoiding that needs RV1 moved
right and both signal wires re-cut, which is four more deletions and three more
additions.

**Observation about the result, with its cause.** The ground wire now runs from
`y=57.15` to the GND symbol at `y=64.77`, alongside the left edge of RV1's
`RV1` and `47K` field text, and at `47K` it touches the left tip of the `4`.
This is not avoidable with the tools in hand: copperhead places those fields at
`+1.778 mm` in x from the symbol anchor, which is less than half the width of a
three-character centred label, so the text's left edge sits essentially on the
symbol's own column — and **akcli 0.22.0 has no operation for a symbol field's
position** (confirmed against `akcli ops list` and the `set_component_parameters`
template; the earlier trial recorded the same gap). Placing the GND symbol
closer, at `y=59.69`, put the triangle through the `47K` glyphs instead; that
was rendered, looked at, and rejected.

### Repair 2 — J2's five ground symbols (Interface)

The owner: *"we dont need five discrete ground symbols here. one will suffice if
all the wires connect"*, and the promoted criterion: *"Multiple ground symbols
aid clarity when they reduce long wire runs on a crowded page. They are just
noise when stacked on top of each other."*

**Full survey of every power symbol on the sheet, before:** 9 `GND` plus 1
`PWR_FLAG`.

| ref | at | serves | disposition |
| --- | --- | --- | --- |
| `#PWR01` | (88.9, 144.78) | C1–C6 via the cap-bank trunk | kept — already one symbol for six pins |
| `#PWR02` | (67.31, 57.15) | J1.5 | **kept — see below** |
| `#PWR03`–`#PWR07` | (67.31, 68.58 … 78.74) | J2.1–J2.5, one each | **four removed, one kept** |
| `#PWR08` | (189.23, 46.99) | RV1.1 | removed by repair 1 |
| `#PWR09` | (124.46, 92.71) | SI8.2 | kept, moved by repair 3 |
| `#FLG01` | (161.29, 144.78) | ERC annotation | left in place at the owner's instruction |

**What was done.** `#PWR03`–`#PWR06` deleted; `#PWR07` kept at `(67.31, 78.74)`
as the single terminator; one vertical trunk added at `x=67.31` from `y=68.58`
to `y=78.74`. The five existing horizontal pin stubs were not touched. akcli
added junction dots at the three mid-trunk tees and at the bottom, without being
asked.

**What the surviving devices earn.**

- `#PWR07` terminates five stubs that now meet. One symbol, no stacking.
- `#PWR01` (cap bank) — the nearest other ground is 80 mm away across a group
  boundary; joining them would add an 80 mm run.
- `#PWR09` (SI8, Hi boost) — nearest other ground 32.5 mm away in a different
  group.
- `#PWR010` (RV1, Lo boost) — the only ground in that group; nearest other
  ~90 mm away.
- **`#PWR02` (J1.5) is the one judgement call and it is put up for overruling.**
  It is 21.59 mm above `#PWR07` on the same column. Folding it into the trunk
  would remove one symbol at the cost of a 21.59 mm run spanning the gap between
  two different connectors, making a six-tee trunk 32 mm long. It was kept
  because it shortens that run and keeps J1's ground local to J1 — but it is a
  single ground symbol 21.59 mm from another, and the owner may read the
  criterion the other way.

### Repair 3 — SI8's placement (Hi boost)

The owner: *"i don't see why SI8 isn't at the same level as SI2. SI8 seems oddly
far away with an unnecessarily long and crooked wire"*.

**Measured before.** SI8 was at `(124.46, 86.36)`, reached from the `in` node at
`(99.06, 49.53)` by `(99.06,49.53) → (99.06,80.01) → (124.46,80.01) →
(124.46,82.55)`: **58.42 mm of wire with two corners**, to a part that hangs off
`in` one hop, exactly as SI2 hangs off `hi_in` one hop.

**What was done.** SI8 moved to `(99.06, 58.42)`, directly below the `in` node;
its ground `#PWR09` moved to `(99.06, 64.77)`. The connection is now **one
straight 5.08 mm segment, no corners**, and SI8's body occupies `y 54.61–62.23`,
the same band as SI2's.

**The survey the owner asked for — is this pattern elsewhere?** Every wire path
on the sheet was listed and compared with the direct distance between its
endpoints. The SI8 branch was the only part reached by a detour. Two other long
runs were examined and left, with reasons:

- `hi_boost_out` from SI2.2 at `(111.76, 64.77)` to `(142.24, 64.77)` — 30.48 mm,
  **one straight segment, no corner**. It joins the hi-boost shunt to the
  hi-boost series element; the length is the parts' separation, not a detour.
- the cap bank's `c1_sel`–`c6_sel` fan-out — long horizontals by construction;
  they are how a 1-of-6 selector reaches a row of capacitors without crossings.

### Repair 4 — the duplicated `hi_boost_out` label (Hi boost)

The owner: *"The high boost out label is used twice right next to each other…
They should be connected with a wire and collapsed to a single label."*

**Full survey of every net carried by more than one label, before.** Straight-line
gaps measured between label anchors.

| net | labels | closest pair | same group? | disposition |
| --- | --- | --- | --- | --- |
| `hi_boost_out` | 3 | **27.00 mm** — (142.24,64.77) & (160.02,44.45) | **yes, both in Hi boost** | **collapsed to a wire** |
| `in` | 2 | 29.32 mm | no — Interface ↔ Hi boost | kept |
| `out` | 3 | 59.81 mm | no — three groups | kept |
| `lo_boost_in` | 3 | 73.67 mm | no — three groups | kept |
| `lo_t2` | 2 | 93.95 mm | no — Hi boost ↔ Lo boost | kept |

The `hi_boost_out` pair is both the closest pair on the sheet and **the only
pair whose two instances sit inside one group rectangle.** Every other
multi-label net crosses a group boundary; a wire replacing any of them would
have to leave one dashed rectangle and enter another, over 29–150 mm. That is
what those labels earn: distance, and a block boundary.

**What was done.** SI7 was given `rotation 180`, putting its `hi_boost_out` pin
(pin 1) at the **bottom** at `(160.02, 54.61)` and its `out` pin (pin 2) at the
top. The existing stub below SI7 was extended by one new wire
`(142.24, 57.15) → (160.02, 57.15)`, joining SI7 to SI5's drop at an existing
vertex. The `hi_boost_out` label at `(160.02, 44.45)` was deleted and an `out`
label put in its place; the `out` label at `(160.02, 57.15)` was deleted.

**Why SI7 was rotated rather than the labels simply swapped.** Swapping the
labels without rotating would have put SI7**.2** on `hi_boost_out` and SI7**.1**
on `out` — a netlist change, electrically meaningless for a resistor but a real
difference in the exported pin sets. The rotation keeps `SI7.1` on
`hi_boost_out`, which the final netlist comparison confirms.

**Why the surviving label was not moved.** Its box was measured from the
rendered SVG — `hi_boost_out` at `(142.24, 64.77)` occupies `x 142.24–155.652`,
`y 63.458–66.082`, 13.41 mm wide. Routing SI7's leg along `y=64.77` would have
run 13.41 mm of wire through that box; routing along `y=57.15` instead clears it
by 4.37 mm in x and 5.3 mm in y, so the label stays exactly where copperhead put
it, including its blue colour.

**One `hi_boost_out` label now remains in the Hi boost group** (plus one in
Interface, 73.98 mm away across a group boundary, which earns its place).

**This is structural in copperhead, not a slip.** copperhead emits a label
wherever a net spans more than one group or carries more than four endpoints,
regardless of proximity. `hi_boost_out` has four pins and `lo_boost_in` seven.
The same survey found copperhead *does* emit a shared ground rail when the pins
are collinear along the rail (the cap bank: six capacitors, one trunk, one
symbol) and one symbol per pin when they are not (J2: five pins at five
different y, five symbols). **A drafting pass behind copperhead has to put the
wires back and collapse the grounds**, which is what repairs 2 and 4 are.

## 3. Verification — re-measured, not assumed

Baseline is the copperhead sheet as the owner saw it; final is the four-repair
sheet.

**Netlist — `kicad-cli sch export netlist --format kicadxml`, compared as sets
of `REF.PIN` per net:**

```
=== BEFORE: 15 nets ===        === AFTER: 15 nets ===
NET PARTITION (pin sets, ignoring net names): IDENTICAL
NET NAMES: IDENTICAL
```

Including `hi_boost_out (4) J1.2 SI2.2 SI5.1 SI7.1`, `GND (14) C1.1 C2.1 C3.1
C4.1 C5.1 C6.1 J1.5 J2.1 J2.2 J2.3 J2.4 J2.5 RV1.1 SI8.2`, and
`unconnected-(SW1-PadMP) (1) SW1.MP`.

**ERC — `kicad-cli sch erc`:** `Found 0 violations` before, `Found 0 violations`
after.

> **A false red, recorded because it nearly became a false finding.** The first
> ERC run on the baseline reported **10 violations**, all
> `lib_symbol_issues: … does not include the symbol library 'copperhead_power'`.
> That was an artifact of running ERC on a file named `BEFORE.kicad_sch`, which
> has no matching `.kicad_pro` beside it, so KiCad never read the project's
> `sym-lib-table`. Re-run with the sheet named `pultec-low-boost.kicad_sch` in a
> directory holding its project files, the baseline reports **0**. **A
> kicad-cli check is only meaningful against a resolvable project**, and a
> before/after ERC comparison where the two files have different basenames is
> not a comparison.

**Wire crossings** — counted as horizontal/vertical segment pairs intersecting
at a point interior to at least one of them:

| | baseline | final |
| --- | --- | --- |
| wires | 78 | 78 |
| true crossings (X) | **0** | **0** |
| T-meetings | 0 | 3 — `(67.31, 71.12)`, `(67.31, 73.66)`, `(67.31, 76.2)` |

The three T-meetings are the J2 ground trunk's mid-tees; each carries a junction
dot, visible in the render.

**akcli `check --layout --erc`:** one finding before, the same one finding
after — a pre-existing `LAYOUT_LABEL_OVER_WIRE` on the `lo_t1` label at
`(217.17, 59.69)`, untouched by this pass. No new findings.

> **And the lint is not to be believed**, per `CLAUDE.md` and the earlier trial.
> It reported zero layout findings on the `47K` text that the ground wire grazes
> in repair 1, which was found by looking at the rendered page.

**Per-net wire-stroke consistency** (see §4): mixed clusters `0` in the
baseline, `0` in the final sheet.

**Element census, baseline → final:**

| | baseline | final |
| --- | --- | --- |
| `wire` | 78 | 78 |
| `global_label` | 13 | 12 |
| `label` (local) | 8 | 8 |
| `symbol` | 49 | 45 |
| `junction` | 6 | 14 |
| `rectangle` | 12 | 12 |
| `text` | 4 | 4 |
| `GND` power symbols | 9 | 5 |

## 4. Two things akcli could not do, and what was done instead

Both were fixed by a direct edit of the sheet, **outside akcli**, and both are
recorded here because the page the owner reviews should not carry tool artifacts
unrelated to the four defects.

1. **`add_net_label` has no `shape` parameter.** It emitted
   `(shape input)` where every other label on the sheet is `(shape passive)`,
   which renders as a pointed tag instead of a plain box. The single line was
   rewritten to `(shape passive)` with the sheet's `fields_autoplaced`,
   `thickness` and `Intersheetrefs` form, keeping akcli's uuid.
2. **`add_wire` has no stroke parameter.** copperhead colours each wire by net —
   `GND` grey `(70 70 70)`, `hi_boost_out` blue `(30 90 200)`, `lo_boost_in`
   purple `(130 50 170)`, `in` and `out` uncoloured — on 47 of its 78 wires.
   akcli's seven new wires carried `(stroke (width 0) (type default))` and
   rendered default green, so the SI5–SI7 link, the J2 trunk and RV1's ground
   all read as a different net from the ones they join. Each of the seven was
   given its net's colour and copperhead's `0.254` width.

**The colour one matters more than it looks.** On this page colour is how a
reader follows a net, and a repair that silently recolours a segment makes the
drawing say something the circuit does not.

**And it caught a second defect that looking alone had missed.** Because the
colour is per wire rather than per net, **rotating SI7 moved two of copperhead's
own wires onto different nets while they kept their old colours**: the stub
above SI7 stayed `hi_boost_out` blue while now carrying `out`, and the stub below
stayed uncoloured while now carrying `hi_boost_out`. A checker was written for
it rather than relying on the eye: group every wire into clusters by shared or
interior endpoints, then report any cluster whose members disagree on stroke.

```
BASELINE: clusters with mixed stroke: 0
FINAL (before the fix):  1   <- the hi_boost_out cluster, 6 wires, one uncoloured
FINAL (after  the fix):  0
```

The baseline's 0 is what establishes that copperhead's colouring is per net and
therefore that a mixed cluster is a defect. **Both swapped stubs were fixed; the
`out` stub above SI7 and the rest of the `out` net are uncoloured, the whole
`hi_boost_out` path is blue.**

After every edit the netlist, ERC, crossing counts and the layout lint were
**re-measured**, not assumed: all unchanged.

## 4a. What every surviving device earns

`EVALUATING-DRAWINGS.md` §6: *"each device is clarity or noise depending on
whether it is doing work, and the draughtsman must be able to say what work."*
This is the statement of that, for everything still on the page. Anything here
that cannot be defended should be deleted rather than argued for.

**Ground symbols — 5, down from 9.**

| symbol | what it earns |
| --- | --- |
| `#PWR01` cap bank | one symbol for six capacitors; the nearest other ground is ~80 mm away across a group boundary |
| `#PWR07` J2 | one symbol for five pins that now meet on a 10.16 mm trunk |
| `#PWR09` SI8 | the only ground in Hi boost; nearest other 32.5 mm away in another group |
| `#PWR010` RV1 | the only ground in Lo boost; nearest other ~90 mm away |
| `#PWR02` J1.5 | **the weakest of the five.** It saves a 21.59 mm run that would span the gap between two different connectors and make the J2 trunk a 32 mm six-tee rail. Stated so it can be overruled. |

**Labels — 12, down from 13.** Every surviving *multi-instance* net label crosses
a group boundary, which is what it earns: `in` 29.32 mm, `out` 59.81–149.87 mm
across three groups, `hi_boost_out` 73.98 mm, `lo_boost_in` 73.67–150.75 mm
across three groups, `lo_t2` 93.95 mm. **No pair of labels on one net now sits
inside a single group rectangle.** Eight single-instance local labels remain and
are listed as an open question in §6 below — they are naming rather than
connectivity, and no defence for them was asked for or attempted.

**Long runs.** The two left are `hi_boost_out` SI2→SI5, 30.48 mm in **one
straight segment with no corner**, which earns its place by separating the
hi-boost shunt from the hi-boost series element; and the cap-bank `c*_sel`
fan-out, which is how a 1-of-6 selector reaches a row of six capacitors with
zero crossings. **The 58.42 mm two-corner run to SI8 is gone** and nothing on
the sheet now reaches a part by a path longer than the part's own separation.

**Hairpins: none remain**, and that was checked rather than assumed — every
power symbol was re-surveyed against the wire entering its pin. All five now
take their wire from above (or, for `#PWR02`, horizontally) with the body
continuing away from the part.

**Why this list exists rather than a count.** The owner, 2026-10-29: *"That kind
of littering is a sign of carelessness."* No single stray device makes this page
unreadable; what the accumulation indicates is a drawing that was emitted and
not attended to. A defence that can be stated is the difference.

## 5. Regions changed — the back-check

Per `EVALUATING-DRAWINGS.md` §8, these are the parts only one party has
considered and they go in front of the owner first.

1. **Lo boost, RV1 and its ground** — `x 185–208`, `y 44–68`. RV1 mirrored; the
   ground symbol deleted and re-placed below at `(189.23, 64.77)`; three wires
   deleted, three added. **Look at: the ground wire against the `RV1`/`47K`
   text, and the strap loop above the pot that encloses the `2` pin number.**
2. **Interface, J2's grounds** — `x 60–73`, `y 68–84`. Four ground symbols
   deleted; one trunk added; four junction dots appeared. **Look at: whether the
   single terminator at the bottom reads for all five pins, and whether J1's own
   ground symbol 21.59 mm above it should also have been folded in.**
3. **Hi boost, SI8** — moved from `(124.46, 86.36)` to `(99.06, 58.42)`, with its
   ground. **Look at: SI8's new neighbours, and the ~40 × 20 mm of the Hi boost
   rectangle that its old wire run used to occupy and which is now empty. The
   group rectangle was NOT resized; nobody asked for that.**
4. **Hi boost, SI5 / SI7** — `x 140–175`, `y 43–66`. SI7 rotated 180; two labels
   deleted, one added; one wire added. **Look at: whether `out` at the top of
   SI7 and `hi_boost_out` at the bottom of SI5 read the way round they should.**

## 6. Open questions this pass did not act on

- **Six single-instance local labels in the cap bank** (`c1_sel`–`c6_sel`) and two
  more (`hi_in`, `lo_t1`) name wires that are fully drawn. Under the promoted
  criterion a device must earn its place; a single label on a fully-drawn
  two-pin net is naming, not connectivity. The owner did not raise them and they
  were left. If they are noise by his reading, that is eight more deletions.
- **`#PWR02`, J1's own ground**, 21.59 mm from the new J2 trunk — see repair 2.
- **The `lo_t1` label over the wire at `(217.17, 59.69)`** — pre-existing, the one
  standing akcli finding, not in scope for any of the four defects.
- **The Hi boost group rectangle** is now much larger than its contents after
  SI8 moved.

## 7. Artifacts

**Committed, in `docs/research/2026-10-29-hybrid-pass-1/`** — the sheet, the
rendered pages, the op-list, every measuring script and the two ERC reports, so
that every number above can be re-run rather than taken on trust:

| file | what |
| --- | --- |
| `hybrid-pass-1.kicad_sch` | the four-repair sheet, sha256 `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7` |
| `hybrid-pass-1.pdf` / `.png` / `.svg` | the full page |
| `baseline-copperhead-probe-p1-meaningful.pdf` / `.png` | the page as the owner saw it |
| `zoom-1-lo-boost-RV1.png` | repair 1 region |
| `zoom-2-interface-J2.png` | repair 2 region |
| `zoom-3-hi-boost-SI8.png` | repair 3 region |
| `zoom-4-hi-boost-SI5-SI7.png` | repair 4 region |
| `repairs-all.json` | the 26-op akcli op-list |
| `scripts/` | the measuring scripts: token census, netlist pin-set comparison, crossing count, per-net stroke-colour clusters, label survey, power-symbol survey, region dump, PDF comparison, wire-uuid lookup |
| `reports/` | the step-1 no-op op-list, and the baseline and final ERC reports |

Every script takes a `.kicad_sch` path and prints a measurement; none of them
computes a placement.

akcli 0.22.0 was installed into a venv under
`…/scratchpad/hybrid-pass-1/venv-akcli/`; nothing was installed into the
repository.

---

## Owner's verdict, 2026-10-29

Shown the four changed regions zoomed, then the whole sheet, with no
commentary, and asked whether the page worked well enough to consider:

> *"the repairs to the drawing make it MUUUUCH better."*

**What this establishes, and only this.** The hybrid he hypothesised - copperhead
drafts, akcli repairs - produces a page he prefers to copperhead's own, **on one
board**. Three of the four repairs were instances of copperhead's structural
behaviour rather than accidents, so the same repairs are expected on every board
it drafts. Whether the pass generalises is untested; `pultec-low-cut` is the
next case.

**Still awaiting his ruling, carried forward rather than closed:**

- `#PWR02`, J1's own ground, kept 21.59 mm above the new J2 trunk with a
  defence stated as the weakest of the five, flagged so it can be overruled
- the `RV1`/`47K` field text grazed by the ground wire, which survives because
  akcli has no field-position operation
- eight single-instance local labels naming fully-drawn wires - naming, not
  connectivity, and not raised by him
- the Hi boost group rectangle, now larger than its contents after SI8 moved
