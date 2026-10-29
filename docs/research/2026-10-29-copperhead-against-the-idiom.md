# Copperhead against the Thompson-Bell idiom

**Date:** 2026-10-28
**Circuit:** `pultec-low-boost` — 19 parts, 14 nets, the netlist KiCad exports
from this project's own model.
**Question:** how close can copperhead get to a specific layout idiom using
only its own author controls?

**Every page below is UNREVIEWED.** `EVALUATING-DRAWINGS.md` §1 — a drawing has
no quality until the owner says so. Nothing here ranks a page or calls one
suitable. Where this document says one configuration is "closest", that is a
count of named arrangement features present on the sheet, each of which another
reader can check against the file, and carries no claim about its quality in
either direction. All 37 pages are committed, none withheld.

**The reference arrangement**, confirmed by the owner from Ian Thompson-Bell's
2012 hand-drawn "3 BAND PULTEC STYLE EQ":

1. one horizontal signal spine, input far left, output far right, constant height
2. 0V as a single horizontal rail along the bottom
3. blocks hang vertically off the spine
4. functional names as free text beside what they name

---

## What was done

37 configurations were drafted, rendered, ERC'd, netlist-compared and looked at.
Exit codes were never tested — `draft schematic --json` was parsed, per the
prior trial's finding that every exit code here is 0.

The four controls the IR actually exposes were swept: **group membership**
(1, 2, 5, 6, 7 and 19 groups), **`hints.groupOrder`** (forward, reverse, and
four permutations), **`hints.paper`** (A5, A4, A3, A2, A1, USLetter), and net
**`kind`** (`ground`, `power`, `signal`, and omitted). Net-name length and
`parts[]` declaration order were swept as well, because the prior trial had
shown name length to be a layout input.

Scripts, inputs and the raw measurement JSON are in `inputs/` beside this file.
The geometry numbers quoted below come from parsing the emitted `.kicad_sch`,
not from copperhead's own report; where both measure the same thing (wire
crossings) they agree.

---

## 1. The closest configuration

`f4-rev-itb` — **a single group holding all 19 parts**, captioned
`3 BAND PULTEC STYLE EQ - LOW BOOST SECTION`, with `parts[]` declared in
reverse signal order and no `paper` hint.

- Page: `pages/f4-rev-itb.png` (also `f4-rev-itb.pdf`, `f4-rev-itb.kicad_sch`)
- Input: `inputs/f4-rev-itb.intent.json`
- A4, 31% ink, compaction `compacted`, 82 wire segments, 19 labels,
  **1 wire crossing**, 0 label overlaps, 0 merged nets.
- `d4-one-revflow` is the same page with the default caption; the only
  difference between the two files is the caption string.

Its intent, in full:

```json
{
  "version": 1,
  "parts": [
    {"ref": "C6",  "libId": "Device:C", "value": "0.033uF", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "C5",  "libId": "Device:C", "value": "0.047uF", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "C4",  "libId": "Device:C", "value": "0.068uF", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "C3",  "libId": "Device:C", "value": "0.12uF",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "C2",  "libId": "Device:C", "value": "0.22uF",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "C1",  "libId": "Device:C", "value": "0.33uF",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SW1", "libId": "Switch:SW_Rotary_1x6_MP", "value": "1x6 rotary", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "RV1", "libId": "Device:R_Potentiometer", "value": "47K", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "R1",  "libId": "Device:R", "value": "56K",   "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI6", "libId": "Device:R", "value": "4.7K",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI3", "libId": "Device:C", "value": "0.047uF", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI4", "libId": "Device:R", "value": "430R",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI5", "libId": "Device:R", "value": "0R",    "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI8", "libId": "Device:R", "value": "100K",  "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI7", "libId": "Device:R", "value": "0R",    "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI2", "libId": "Device:R", "value": "47K",   "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "SI1", "libId": "Device:R", "value": "0R",    "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "J1",  "libId": "Connector_Generic:Conn_01x05", "value": "1x05", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"},
    {"ref": "J2",  "libId": "Connector_Generic:Conn_01x05", "value": "1x05", "group": "3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"}
  ],
  "nets": [
    {"name": "GND", "pins": ["C1.1","C2.1","C3.1","C4.1","C5.1","C6.1","J1.5","J2.1","J2.2","J2.3","J2.4","J2.5","RV1.1","SI8.2"]},
    {"name": "c1_sel", "pins": ["C1.2","SW1.1"]},
    {"name": "c2_sel", "pins": ["C2.2","SW1.2"]},
    {"name": "c3_sel", "pins": ["C3.2","SW1.3"]},
    {"name": "c4_sel", "pins": ["C4.2","SW1.4"]},
    {"name": "c5_sel", "pins": ["C5.2","SW1.5"]},
    {"name": "c6_sel", "pins": ["C6.2","SW1.6"]},
    {"name": "hi_in", "pins": ["SI1.2","SI2.1"]},
    {"name": "lo_t1", "pins": ["SI3.2","SI4.2"]},
    {"name": "lo_t2", "pins": ["SI4.1","SI5.2","SI6.1"]},
    {"name": "hi_boost_out", "pins": ["J1.2","SI2.2","SI5.1","SI7.1"]},
    {"name": "in", "pins": ["J1.1","SI1.1","SI8.1"]},
    {"name": "lo_boost_in", "pins": ["J1.3","R1.1","RV1.2","RV1.3","SI3.1","SI6.2","SW1.7"]},
    {"name": "out", "pins": ["J1.4","R1.2","SI7.2"]}
  ],
  "noConnect": ["SW1.MP"],
  "hints": {
    "groupOrder": ["3 BAND PULTEC STYLE EQ - LOW BOOST SECTION"],
    "date": "2026-10-28"
  }
}
```

Three things about that input are worth stating because they were each
measured, not assumed:

- **No `kind` is declared anywhere, and declaring them changes nothing.**
  `e3-one-kinds` declares `GND` as `ground` and all thirteen other nets as
  `signal`; its `.kicad_sch` is **byte-identical** to the undeclared version
  (sha `60346a9b7c00` for both). The name `GND` already classifies as ground by
  `basis: "name"`, and every other net already classifies as signal.
- **No `paper` is pinned.** Pinning any larger sheet is accepted and inert
  (§5); `USLetter` is refused as non-standard and the paper derived instead.
- **`groupOrder` carries one entry**, because there is one group. With one
  group the hint has nothing to order — which is the whole finding of §3.

---

## 2. Feature by feature

| Idiom feature | Result | What is on the page |
| --- | --- | --- |
| **One horizontal spine, input far left, constant height** | **approximated** | `in` enters at the far left of the drawn content and runs as one constant-y wire **116.8 mm** long — 74% of the drawn width — with SI1 (0R) and SI2 (47K) drawn in line on it and `hi_boost_out` continuing along it to J1.1. The spine stops there. The rest of the circuit sits in a second band below, joined to it by labels, not by wire. |
| **Output far right** | **no** | `out` is drawn twice: once top-centre (SI7's right end, x≈130 mm) and once at the left edge of the lower band (R1's left end, x≈62 mm). Neither is the rightmost thing on the sheet. The engine chose to label this net rather than run it. |
| **0V as a single horizontal rail along the bottom** | **no** | The 14 ground pins are drawn as **8 separate GND power symbols at 8 distinct y values**, spread over 160 mm of page height. The cap bank does get a local horizontal ground trunk under its six capacitors, which is the one place the page resembles the reference's bottom rail — but it serves 6 of the 14 pins and sits mid-page, not at the bottom. |
| **Blocks hang vertically off the spine** | **partially** | Two do: SI5 (0R, into the hi-cut chain) and SI8 (100K, the mid shunt) are drawn as vertical droppers off the spine, SI8 ending on a GND symbol — exactly the reference's gesture. 74% of non-power symbols sit below the spine's y. But the two biggest blocks, the cap bank and the lo-boost pot, do **not** hang off it: they are in a second band and reach the spine through `lo_boost_in` labels. |
| **Functional names as free text** | **approximated, once per group** | The only free text the IR can place is the **group caption**, and it is drawn once, at the top-left of the group box — not beside the thing it names. With one group there is exactly one caption. `c10-itb-captions` put six captions on the page using six groups, in the reference's own vocabulary ("HI BOOST (flat)", "HI CUT (flat)", "LO BOOST", "LO CUT (flat)") — but buying six captions costs the spine entirely (§3). The other near-free-text channel is net names, which are drawn beside the wires they belong to and are the author's to choose. |

---

## 3. What is structurally unreachable, and why

These are read from `src/kicad/draft/engine.ts` and confirmed by the sweep.

**(a) A net that crosses a group boundary is never drawn as a wire.**
`engine.ts:1646` — a net "leaves" (becomes labels) when
`net.pins.length > MAX_WIRED_ENDPOINTS` **or** any other endpoint's part is in
a different group. So the spine and the group box are the same decision: to get
a wired spine you must put every part that touches it in one group, and a group
is drawn as one rectangle with one caption. **The reference's arrangement —
one continuous spine with several separately captioned blocks hanging off it —
asks for exactly the thing the IR cannot express: one net wired across several
groups.** Every multi-group configuration tried (26 of 37) measures a longest
run of 74.9 mm or less; every single-group configuration measures 88.9 mm or
more.

**(b) `MAX_WIRE_SPAN = 50.8 mm` caps how far a wired cluster reaches.**
`engine.ts:5087` clusters stubs only when they are within 50.8 mm in both x and
y, or bound to a common anchor. The reference's spine runs the full width of an
A3 sheet. A spine longer than that here is assembled out of anchor-bound hangs,
not out of span, which is why it ends where the anchor chain ends.

**(c) `MAX_WIRED_ENDPOINTS = 4`.** `lo_boost_in` has **seven** endpoints
(`J1.3 R1.1 RV1.2 RV1.3 SI3.1 SI6.2 SW1.7`), so it is narrowed to the largest
anchor-bound subset and the remainder become labels — in every one of the 37
configurations, without exception. In the reference, `lo_boost_in` is the
vertical trunk dropping from the spine into the lo-boost selector. **That trunk
is unreachable from this IR for this circuit**, for the same reason the 14-pin
0V net is.

**(d) There is no horizontal-rail primitive.** A `ground`-class net is drawn as
one power symbol per pin (`engine.ts:1654`, 1887), not as a shared bar. The
nearest reachable approximation is to declare the 0V net `kind: "signal"`,
which is a real and visible change — `d5-one-gnd-signal` and `f2-rev-gndsig`
drop to **0 ground symbols** and draw boxed `GND` labels instead, merging
co-located ground pins into short wire runs (J2's five ground pins become one
run and one label instead of five symbols). But it produces several short runs
ending in flags, not one rail along the bottom, and it rotates the capacitor
bank from six vertical caps on a trunk to six horizontal caps in rows.

**(e) There is no free-text object in the IR.** `SchematicIntent` is exactly
`{version, parts[], nets[], noConnect[], hints{groupOrder, paper, date}}`.
Annotations like the reference's "CW →", "BOOST / OFF / CUT", "0V" beside the
rail cannot be placed at all. Group captions and net names are the only text
the author chooses, and the caption's position is the engine's.

**(f) Orientation is not an author control.** The placement search mirrors and
rotates parts on its own (`f4-rev-itb` reports "J1 mirrored top to bottom"), and
there is no per-symbol nudge. The reference's convention of drawing every pot as
a horizontal box on the spine is therefore not expressible.

**So: hand placement does not become a repair pass for this idiom.** Four of the
six structural facts above sit under the IR, not on top of it. What the IR can
do is hand a hand-placement pass a starting sheet whose connectivity is proven
and whose series chain is already in a line.

---

## 4. Checks on the closest page

Measured on `f4-rev-itb.kicad_sch`.

**Netlist pin-set comparison against the spec.** The schematic was exported with
`kicad-cli sch export netlist --format kicadxml` and the resulting partition of
pins compared to the brief's netlist as sets, so net *names* do not enter the
comparison.

```
spec nets: 14        drawn nets: 14
missing  : none      extra     : none
SW1.MP   : alone on unconnected-(SW1-PadMP), as declared in noConnect
```

**Exact match.** All 14 nets, including `lo_boost_in` carrying all seven pins
and `RV1.2`/`RV1.3` separately landed on it.

**ERC.** `kicad-cli sch erc --severity-all --exit-code-violations` →
`Found 0 violations`. (ERC passed every one of the 37 pages, including the ones
with 4 crossings — it is reported here, not relied on.)

**Wire crossings: 1.** Counted independently of copperhead by intersecting all
82 emitted wire segments and keeping only intersections interior to both
segments (shared endpoints — junctions and corners — are not crossings). The
single crossing is at **(143.51, 58.42) mm**. Copperhead's own note for this
draft reads "wire crossings 2 to 1", which agrees.

**Also measured:** 0 label overlaps, 0 merged nets, 29 symbol instances, 19
labels, no symbol outside the sheet frame.

---

## 5. Every configuration tried

`sheetFit` and ink are copperhead's own `report.sheetFit`; spine, ground rows
and crossings are measured from the emitted file.

| tag | sheet | ink | compaction | wires | labels | crossings | longest run mm | 0V rows | ERC | netlist |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c1-base4 | A5 | 48% | compacted | 78 | 21 | 0 | 74.9 | 8 | 0 violations | match |
| c2-one-group | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| c3-spine-group | A5 | 43% | compacted | 78 | 22 | 0 | 74.9 | 8 | 0 violations | match |
| c3b-spine-first | A5 | 43% | compacted | 78 | 22 | 0 | 74.9 | 8 | 0 violations | match |
| c4-station | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| c4b-station-rev | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| c5-station-kinds | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| c6-gnd-signal | A4 | 13% | failed | 79 | 29 | 0 | 92.7 | 0 | 0 violations | match |
| c7-gnd-power | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| c8-two-group | A4 | 31% | failed | 83 | 19 | 4 | 124.5 | 9 | 0 violations | match |
| c9-station-A3 | A3 | 7% | pinned | 74 | 24 | 0 | 74.9 | 8 | 0 violations | match |
| c10-itb-captions | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| c11-station-split | A4 | 24% | failed | 71 | 27 | 0 | 74.9 | 9 | 0 violations | match |
| c12-per-part | A4 | 10% | failed | 52 | 35 | 0 | 12.7 | 7 | 0 violations | match |
| c13-0v-name | A4 | 17% | failed | 74 | 24 | 0 | 74.9 | 9 | 0 violations | match |
| d1-one-A3 | A3 | 14% | pinned | 80 | 20 | 1 | 116.8 | 8 | 0 violations | match |
| d2-one-flow | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| d3-one-flow-A3 | A3 | 14% | pinned | 80 | 20 | 1 | 116.8 | 8 | 0 violations | match |
| **d4-one-revflow** | **A4** | **31%** | **compacted** | **82** | **19** | **1** | **116.8** | **8** | **0 violations** | **match** |
| d5-one-gnd-signal | A4 | 25% | compacted | 86 | 25 | 1 | 105.4 | 0 | 0 violations | match |
| d6-one-itb-caption | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| d7-one-flow-gnd0v | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| d8-spine-then-blocks | A4 | 27% | compacted | 77 | 22 | 0 | 74.9 | 8 | 0 violations | match |
| d9-flow-iface-split | A4 | 20% | compacted | 75 | 23 | 0 | 74.9 | 9 | 0 violations | match |
| d10-flow-iface-A3 | A3 | 9% | pinned | 72 | 24 | 0 | 74.9 | 7 | 0 violations | match |
| e1-one-short | A5 | 69% | compacted | 81 | 19 | 1 | 88.9 | 7 | 0 violations | match |
| e2-one-A2 | A2 | 7% | pinned | 80 | 20 | 1 | 116.8 | 8 | 0 violations | match |
| e3-one-kinds | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| e4-one-long | A4 | 38% | compacted | 80 | 20 | 1 | **161.3** | 9 | 0 violations | match |
| e5-one-nokind | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| e6-one-A1 | A1 | 3% | pinned | 80 | 20 | 1 | 116.8 | 8 | 0 violations | match |
| e7-short-A3 | A3 | 13% | pinned | 79 | 20 | 1 | 88.9 | 8 | 0 violations | match |
| e8-one-usletter | A4 | 32% | compacted | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| f1-rev-A3 | A3 | 14% | pinned | 82 | 19 | 1 | 116.8 | 8 | 0 violations | match |
| f2-rev-gndsig | A4 | 30% | compacted | 84 | 25 | 0 | 95.2 | 0 | 0 violations | match |
| f3-rev-short | A5 | 65% | compacted | 81 | 19 | 2 | 77.5 | 8 | 0 violations | match |
| **f4-rev-itb** | **A4** | **31%** | **compacted** | **82** | **19** | **1** | **116.8** | **8** | **0 violations** | **match** |

Every page renders at `pages/<tag>.png`.

### What each lever actually did

- **Group count is the dominant lever, and it trades the spine against the
  captions.** 1 group → 88.9–161.3 mm longest run, 1 caption. 2+ groups →
  74.9 mm or less, one caption each. There is no setting that buys both.
- **`hints.groupOrder` is inert when there is one group**, and with several
  groups it reorders the boxes left to right without lengthening any run: every
  one of the six permutations tried measures 74.9 mm.
- **`hints.paper` never changes the arrangement.** A3, A2 and A1 all emit the
  same placement as the derived sheet; only the frame and the ink fraction move
  (31% → 14% → 7% → 3%). `USLetter` is refused as non-standard with a note.
  This matches the prior trial's warning that pinning a *smaller* sheet is
  destructive; pinning a larger one is simply inert.
- **Net `kind` changed nothing except on the 0V net.** Declaring all thirteen
  signal nets `signal` produced a byte-identical file. Declaring 0V `power`
  likewise. Declaring 0V `signal` is the one `kind` that moves the page: 8
  ground symbols → 0, and the capacitor bank rotates.
- **Net-name length is a layout input, and it works both ways.** Short names
  (`0V`, `hbo`, `lbi`, `k1`…`k6`) compact the sheet from A4/31% to A5/69% and
  *shorten* the longest run to 77.5–88.9 mm. Long names
  (`eq_section_input`, `cap_selector_contact_1`) *lengthen* it to 161.3 mm by
  widening the cells the wire has to span. This confirms and extends the prior
  trial's Probe 1.
- **`parts[]` declaration order is almost always a no-op.** Declaring the parts
  in signal-flow order produced a file byte-identical to the original order
  (sha `60346a9b7c00`). A full reversal did change the file — 31% ink instead of
  32%, and a larger fraction of the content below the spine. It is a real but
  undocumented and unstable lever; nothing in the IR promises it.

---

## What this leaves open

- The engine was read at the four constants that bound the result
  (`MAX_WIRED_ENDPOINTS`, `MAX_WIRE_SPAN`, the cross-group rule at line 1646,
  the ground-symbol-per-pin rule). Whether any of them is configurable from
  outside the source was not established — nothing in `.copperhead/config.json`
  was found that touches them, but the config schema was not enumerated.
- `copperhead score schematic` was not run on these pages. The prior trial's
  Appendix C established that its composite is a binary cap and not usable as a
  criterion here, and nothing in this question needed it.
- Whether a *reviewer* finds the single-group spine worth having at all is not
  settled by anything above, and cannot be: it is the question the pages are
  submitted for.


---

## Owner's verdict, 2026-10-29

Shown copperhead's closest page and the akcli hand-placed v4 of the same board,
each with no commentary, and asked whether they worked well enough to consider:

> *"both are serviceable and have different strengths and weaknesses. But, if I
> had to pick one, I'd pick the copperhead output. I feel like they are both
> worth having in the toolkit."*

**Note the tension this leaves open, recorded rather than resolved:** he named
Ian Thompson-Bell's drawing as the layout reference, and then preferred a page
that does not follow it - copperhead structurally cannot. Whether the idiom is
the target, or whether it was a way of describing what he wanted and the target
is something else, is his to settle.
