ELK on real repository circuits - a measurement spike
=====================================================

Spike, 2026-10-19. Run against the next step §6 of
[`../superpowers/specs/2026-10-19-schematic-authoring-design.md`](../superpowers/specs/2026-10-19-schematic-authoring-design.md)
names, and against the conflation `docs/known-gaps.md` **G91** records.

**This document gathers evidence. It makes no recommendation about the
architecture.** It does not say whether to keep ELK, drop it, or move the seam.

What was withdrawn, and what this therefore tests
---------------------------------------------------

[`./generation-prior-art-third-pass.md`](./generation-prior-art-third-pass.md)
§3.4 measured ELK completing 10 probes of 10, byte-identical over 30 runs. §3.5
of the same document measured its one representative probe - a 25-part
Pultec-SHAPED passive EQ - at **15 crossings between different nets, 1.72 bends
per edge**, and called it ***"not a good audio schematic"***.

**What was never tested is REAL CIRCUITS FROM THIS REPOSITORY, THROUGH THIS
REPOSITORY'S OWN IR.** Every probe in that pass was reconstructed by hand in
netlistsvg's input format.

| spec §6 asks for | circuit used | why it is that structure |
| --- | --- | --- |
| a large passive star or parallel bank | `circuits/pt2399-core/pt2399-core.ts` | 14 capacitors, ground at degree 12 |
| an interacting ladder with branches | `circuits/transistor-preamp/lab-board.ts` | discrete BJT, 32 parts, four parallel bias legs |
| a mixed topology with selector, pot and a return path | `circuits/pultec/physical/low-boost.ts`, `.../hi-boost.ts` | 6-throw selector, pots, stand-in group, junction headers |
| (added) the simplest circuit in the repository | `circuits/opamp-buffer.ts` | 9 parts; the one a general router failed on in under four seconds |

Evidence marks: `[RAN]` executed, the check could have failed; `[CODE]` read the
implementation; `[RELAYED]` repeated from elsewhere. Versions: Node v22.19.0,
Python 3.14.6, `netlistsvg` at `d3518f1` with its pinned **elkjs 0.7.1**, plus
**elkjs 0.9.3** as a version control. Nothing installed globally.

0. The harness, reported separately from ELK's behaviour
----------------------------------------------------------

**Everything here is the spike's own code and a bug in it is not evidence about
ELK.** All throwaway, uncommitted, in the scratch directory only.

**FIVE THINGS THE CONVERTER HAD TO INVENT, because the IR does not carry them.**
This is the direct answer to "what did the conversion cost":

| invented | why the IR cannot supply it | how much it matters |
| --- | --- | --- |
| a **symbol** per kind | `part.symbol` is a KiCad library id on some components and absent on most - §5.4 is exactly this open question | low; a fixed per-kind map sufficed |
| a **drawn orientation** (`r_v` vs `r_h`) | orientation is a semantic input, not something the tool derives | **high - it decides whether ELK crashes.** See §4 |
| a **pin-side partition** for `generic` parts | nothing says which of an IC's 16 pins are inputs | **high** - the rule used for `ic` is "sort and split in half", which is a guess |
| **rail symbols** | the IR has no power symbol: `GND`/`VCC`/`0` are ordinary nets | measurable; see §2 |
| a **direction per pin** | a passive has none | low |

Three policies were emitted per circuit so sensitivity is measured rather than
assumed: `v-bare`, `v-rails`, `h-rails`.

`[RAN]` **The converter is checked and the check has teeth.** A partition check
re-reads each generated input off disk and compares against the source
`Network`, as sorted sets of `component.pin` ignoring net names:
**ALL PARTITIONS MATCH, 15 of 15.** It failed twice during development for two
different reasons, and a deliberate mutation reports `DIFFERENT` and names the
net.

`[RAN]` **The measurement is validated against §3.5's published numbers** -
canvas 1232 x 482.5, 15 inter-net crossings, 1.72 bends per edge - and the SVG it
regenerates is **byte-identical** to the one that pass produced in an earlier
session. Two of the spike's own measures were wrong before they reproduced those
numbers.

1. Routing success, timing, determinism
------------------------------------------

`[RAN]` 15 inputs x 3 runs.

| | result |
| --- | --- |
| laid out at all | **14 of 15**. One refused: `opamp-buffer` horizontal, 3/3 - §4 |
| wall clock | **0.178 - 0.256 s**, mean 0.228 s over 42 runs |
| determinism, same input x 3 | **1 distinct output, 14 of 14** |
| non-axis-aligned segments | **0**, every drawing |

**So §3.4's result survives contact with real circuits: where ELK completes, it
completes fast and repeatably.**

### 1.1 But determinism is a property of the SERIALIZATION, not of the circuit

`[RAN]` **New, and in no earlier pass.** Cells were shuffled into three random
orders - same components, same nets, same partition - and re-run:

| circuit | distinct outputs over 3 orders | matches declaration order | inter-net crossings across four orders |
| --- | --- | --- | --- |
| `opamp-buffer` | **3** | no | 32, 38, 23, 27 |
| `pultec-low-boost` | **3** | no | 73, 48, **139**, 61 |
| `pt2399-core` | **3** | no | 195, 290, 203, 276 |
| `transistor-preamp-lab` | **3** | no | 139, 56, 136, 140 |

**Reordering the `.capacitor(...)` calls in a circuit file would change every
generated schematic**, and would move its measured quality by up to a factor of
three without changing the circuit.

This bears on two settled things. §2.1's **generation manifest** would hash "the
section network" - a hash over the network's *content* would not detect the
change that moved the drawing, so it must be over the exact serialized input
handed to the layout engine. And §3.3's baseline would be comparing numbers that
are not stable properties of a circuit.

2. The headline comparison with §3.5
---------------------------------------

`[RAN]` `xnet` is crossings between different nets, §3.5's headline. The first
row is §3.5's probe, re-measured by this spike's own code.

| circuit | policy | parts | max degree | canvas | aspect | **xnet** | **bends/edge** | wire length |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **(3rd pass) Pultec-SHAPED probe** | - | 25 | - | 1232x482 | 2.55 | **15** | **1.72** | 13 335 |
| `opamp-buffer` | v-rails | 9 | 7 | 779x402 | 1.94 | 32 | 3.17 | 10 104 |
| `opamp-buffer` | v-bare | 9 | 6 | 621x344 | 1.81 | **16** | 2.64 | 6 406 |
| `opamp-buffer` | h-rails | 9 | 7 | - | - | **ELK REFUSED, 3/3** | - | - |
| `transistor-preamp-lab` | v-rails | 32 | 13 | 2662x548 | 4.86 | 139 | 3.25 | 59 964 |
| `transistor-preamp-lab` | v-bare | 32 | 12 | 2089x502 | 4.16 | 80 | 2.86 | 35 116 |
| `transistor-preamp-lab` | h-rails | 32 | 13 | 2366x544 | 4.35 | **16** | 3.22 | 31 548 |
| `pt2399-core` | v-rails | 24 | 13 | 2287x780 | 2.93 | **195** | 3.23 | 65 052 |
| `pt2399-core` | v-bare | 24 | 12 | 2193x705 | 3.11 | 143 | 2.95 | 62 109 |
| `pt2399-core` | h-rails | 24 | 13 | 2583x498 | **5.19** | 93 | 3.27 | 32 007 |
| `pultec-low-boost` | v-rails | 19 | 15 | 1361x695 | 1.96 | 73 | 2.97 | 35 365 |
| `pultec-low-boost` | v-bare | 19 | 14 | 1108x808 | **1.37** | 52 | 2.97 | 33 420 |
| `pultec-low-boost` | h-rails | 19 | 15 | 1963x392 | 5.01 | 45 | 3.02 | 21 766 |
| `pultec-hi-boost` | v-rails | 27 | 9 | 1743x753 | 2.31 | 54 | **2.29** | 30 950 |
| `pultec-hi-boost` | v-bare | 27 | 8 | 1627x710 | 2.29 | 47 | **2.19** | 26 534 |
| `pultec-hi-boost` | h-rails | 27 | 9 | 2166x469 | 4.62 | 87 | 3.23 | 33 012 |

**Read against §3.5's probe, the representative case was the BEST case.**

- **bends per edge - the term the one user study in evidence blames - is worse on
  every single run.** Best 2.19, worst 3.27, against 1.72. **Not one of fourteen
  beats the probe.**
- **inter-net crossings** reach **195** on a 24-part circuit, an order of
  magnitude above 15.
- **aspect** reaches **5.19:1**; the parent calls a 1:1.97 ribbon unusable, and
  five of fourteen runs are worse than 4:1.
- **wire length** shows the trade §3.3 refuses to hide with a composite:
  `pt2399-core` h-rails halves wire length and halves crossings *while* pushing
  aspect to 5.19 and bends/edge to its worst.

**Degree is not the explanatory variable here.** `pultec-low-boost` has the
highest max degree (15) and middling crossings; `pt2399-core` at 13 has the
worst.

**Rail symbols make it worse, consistently** - `v-rails` has more crossings than
`v-bare` on all five circuits. A `gnd` glyph is added and the ground net is still
routed as a long bus, so the symbol costs edges and saves none.

3. Looked at - the drawings, read
------------------------------------

### `opamp-buffer`, `v-rails` - the best flow of the five

`input` top-centre, `output` bottom-far-right, op-amp pointing right. **The three
screw terminals draw as three identical unlabelled boxes reading `generic`** -
`input_terminal`, `output_terminal` and `power_terminal` are indistinguishable.
`[CODE]` attribution: netlistsvg's skin, not ELK. The ground net is a long bottom
bus **plus** a separate `gnd` glyph **plus** a `ground` port arrow - **three
visual claims about one net on one sheet**, precisely the ambiguity §1.6 wants
one mechanism for. Six of nine component labels have a wire crossing them.

### `pultec-low-boost`, `v-rails` - the hard case

**§3.5's selector complaint reproduces exactly.** The 6-throw `SW_LO_BOOST` sits
at x = 0.38 and its throws fan right to capacitors at both extremes. The bank is
**split into two groups** with the ground symbol and two generic boxes between
them. **It does not read as a bank**, and the order is non-numeric. **A net is
routed as a closed rectangle at the top left**, enclosing the `in` port and two
stand-ins - a reader takes a box around parts as a boundary, not a wire.

### `pultec-hi-boost`, `v-rails` - the best of the five

The four inductors sit in a row along a top bus, **each beside its own resonating
capacitors**, with the selector beneath fanning upward. **This one idiom reads.**
And then `in` is at x 0.80 and `out` at 0.84 - the two interface ports adjacent in
the right-hand fifth of a 1743-wide sheet. **There is no flow direction.**

### `pt2399-core`, `v-rails` - the worst

**`input` is at x = 0.95 and `output` at x = 0.95.** Both at the far right edge.
Signal flow runs right, then left, then right again. **The PT2399 draws as one
unlabelled `generic` box with `in0...in7` left and `out0...out7` right** - partly
the harness, and that *is* the finding: **seam A has no basis on which to place
an IC's pins.** `output_coupling_cap`'s label runs past the canvas edge in
`h-rails` - the same canvas-sizing defect §3.5 recorded, on a real circuit.

### `transistor-preamp-lab`, `v-rails`

A **4.86:1 ribbon**. `gain_transistor` - the one active device the board exists
to bias - sits in the **top-right corner**. `input` and `output` adjacent in the
left quarter. **Sixteen unlabelled `generic` boxes**: six trim pots, five jumpers
and the test points, mutually indistinguishable.

4. What breaks: ELK refuses the simplest circuit in the repository
---------------------------------------------------------------------

`[RAN]` **The sharpest result in the spike.**

```
Error: java.lang.IllegalStateException: Invalid hitboxes for scanline
       constraint calculation.
```

`opamp-buffer` with horizontal passives fails 3 of 3. The failing input differs
from the working one **by five characters**.

**Narrowed by exhaustive sweep.** All 32 orientation assignments were run:
**9 of 32 fail**, and the smallest failing set is **one component** -
`output_coupling_cap` drawn horizontally. **A one-character change.**

**Narrowed further.** The crash needs two things together: the op-amp's **output
and inverting input on one net** - the unity-gain self-loop - **and** a
**horizontally-drawn lateral hanging off that same net**. `[RAN]` Removing
either lays out cleanly. **Both are necessary. A unity-gain buffer is among the
most common analog idioms there is.**

**It is ELK, and it is not fixed upstream.** `[RAN]` The pre-layout graph was run
directly through each build:

| elkjs | crashing graph | a working graph |
| --- | --- | --- |
| **0.7.1** (netlistsvg's pin) | `IllegalStateException` | ok, 779.04 x 402, 36 edges, 114 bends |
| **0.9.3** (current line) | **same exception, verbatim** | ok, **identical** geometry |

**Scope.** `[RAN]` A single-flip sweep over the other four circuits - 69 flips -
produced **zero** failures. The crash is specific, reachable from an ordinary
idiom, and triggered by an input the IR does not carry an opinion about.

**Why this matters to §1.3.** The three-valued selector sends `not-applicable` to
ELK and refuses elsewhere. **A block that reaches ELK and makes ELK throw is a
fourth outcome the spec does not name**, and the thing that decided it - a drawn
orientation - is by §1.5 a decision the generator makes, not something ELK is
asked about.

5. What does NOT break - and it is worth recording
-----------------------------------------------------

`[RAN]` These checks could have returned a defect and did not.

**Electrical correctness of the drawing: clean.** Per net, every pin lies on one
of that net's drawn segments, and the net's segments form one connected piece:
**PINS_NOT_REACHED = 0, NETS_DRAWN_IN_PIECES = 0** on all 14 outputs and on the
third pass's three probes. **Mutation-tested**: shifting one net's segments
reports a pin off-wire; deleting a load-bearing segment reports the net in two
pieces. Three wrong versions preceded the working one.

**No wire passes through a rectangular symbol body, anywhere** - scoped to
bodies whose extent is readable without parsing path data. The one exception is
a transistor's own three leads inside its glyph's circle, which the control
reproduces.

**A naive check built on each cell's DECLARED extent reports up to 36 crossings
on the same drawings.** It is wrong: netlistsvg resizes a generic cell to fit its
ports and leaves the group attribute stale. **That is a worked instance of the
G85 hazard §1.4 is built on** - one obstacle category, two plausible definitions,
one of which manufactures 36 false defects.

**What ELK does put wires through is text**: 3-16 label crossings per drawing,
every drawing.

6. The three criteria §3.4 says this repository can make objective
---------------------------------------------------------------------

`[RAN]` Two of the three were measured, and **both answer no.**

**Functional-grouping disjointness** - the Pultec stand-in group is a declared
set:

| circuit | members | group bounding box | of canvas | non-members inside it |
| --- | --- | --- | --- | --- |
| `pultec-low-boost` | 8 | 1016x621 | **67 %** | **11** |
| `pultec-hi-boost` | 8 | 1412x566 | **61 %** | **11** |

**Congruence of repeated sub-circuits** - `transistor-preamp-lab` declares four
structurally identical bias legs. Their drawn `jumper -> trim` offsets:

| leg | jumper -> trim | trim -> floor |
| --- | --- | --- |
| `upper_bias` | (-141, +153) | (-44, -75) |
| `feedback_bias` | (**+564**, +173) | (-54, -75) |
| `lower_bias_a` | (**-912**, +153) | (-44, -75) |
| `lower_bias_b` | (-147, +143) | (-173, -75) |

The inner link is near-congruent; the outer spans -912 to +564, and one leg runs
the opposite direction from the other three.

7. Minor reproducible defects
--------------------------------

`[RAN]`

- **Duplicate wire segments: 30-187 per drawing.** Any measure that does not
  collapse them double-counts crossings.
- **Zero-length segments: 1-8 per drawing.** The spike's first classifier counted
  these as diagonals; the corrected count of true diagonals is **0 everywhere**.
- **Canvas sized without regard to label extents** reproduces on 5 of 15 outputs.
- **The `generic` symbol's own two texts overlap** in every drawing that has one.
  Every label-on-label overlap measured is this pair; **no two component-identity
  labels overlap each other** on any drawing.

8. What this spike did not test
----------------------------------

- **Everything in §1.4.** The output is SVG. Grid snapping, junction emission,
  symbol transforms, re-validated clearance, and the refusal-on-invalidated-route
  rule are untouched. **A geometrically valid ELK drawing is not a valid KiCad
  schematic, and this spike measured only the first half of that sentence.**
- **The round trip (§2).** Nothing was exported through `kicad-cli`.
- **Seam B.** Every circuit was laid out as one flat graph.
- **The seven ported `schgen` templates.** Not run; not ported.
- **Whether a template would fix any of this.** A template was never in the loop.
  **These numbers are ELK with no template at all, which is exactly what seam A
  asks of it, and they are not a prediction about seam A plus a template
  library.**
