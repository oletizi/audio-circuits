---

Prior art, third pass: the forty-year industry the first two passes missed
==========================================================================

Research pass, 2026-10-19. Third companion to `./generation-prior-art.md` and
`./generation-prior-art-second-pass.md`. Those two passes searched the
2024–2026 LLM frontier and a hobbyist open-source corner. **This pass searched
the mature EDA industry and the graph-drawing literature, because the owner did
not believe the result:**

> *"The reason I asked about state of the art is not to be self-aggrandizing;
> it's because I literally can't believe that an entire industry doesn't have
> prior art for machine-generated schematics."*

**He is right.** Machine-generated schematics have a continuous published
literature running from 1984, a commercial vendor whose only product is a
schematic generation engine, and a patent estate. Both earlier passes searched
the wrong decade and the wrong industry.

**This document gathers evidence. It makes no recommendation about this
project's plans.**

How to read the evidence marks
------------------------------

| Mark | Means |
| --- | --- |
| `[RAN]` | I executed it. The command and its output are given, and the check could have failed |
| `[CODE]` | I read the implementation — cloned, or fetched raw from the repository — and am reporting what the code does |
| `[READ]` | I downloaded the PDF myself, extracted its text with `pdftotext`, and read it. Quotations are verbatim from that text |
| `[RELAYED]` | A summarising tool's account of a page I did not read raw. Same standing as the whole of the first pass |

**`[READ]` and `[RELAYED]` are kept strictly apart here**, because the
distinction is the point of this pass. Anything fetched through the summarising
web tool is `[RELAYED]`, however authoritative the source looks.

Everything was run under a scratch directory outside the repository. Nothing was
installed globally. Versions: Node v22.19.0, Python 3.14.6, `netlistsvg` at
commit `d3518f1` with `elkjs` 0.7.1, `rsvg-convert`/ImageMagick for rendering.

1. The answer to the owner's question, with citations
------------------------------------------------------

Automatic schematic generation was an active, named subfield of EDA from the
mid-1980s. **This chain was recovered from the reference lists of two papers I
read in full**, not from a search engine's summary:

| Year | Work | Venue |
| --- | --- | --- |
| 1984 | Ahlstrom, Hadden, Stroick, "An expert system for the generation of schematics" (the HAL prototype) | ICCAD, pp. 720–725 |
| 1986 | Majewski, Krull, Fuhrman, Ainslie, "AUTODRAFT: automatic synthesis of circuit schematics" | ICCAD, pp. 435–438 |
| 1986 | Kumar, Arya, Swaminathan, Misra, "Automatic generation of digital system schematic diagrams" | IEEE Design & Test 2, 58–65 |
| 1987 | Valdés-Pérez, "Knowledge-Based Schematics Drafting: Aesthetic Configuration as a Design Task" | MIT AI Lab Working Paper 292 |
| 1987 | Chun, Chang, McNamee, "VISION: VHDL induced schematic imagine on net-lists" | DAC, pp. 436–442 |
| 1988 | Tamassia, Di Battista, Batini, "Giotto" layout | (cited as `[TDB88]` by OGDF) |
| 1989 | Stok & Koster, "From network to artwork" | DAC 26, pp. 686–689 |
| 1991 | Jehng, Chen, Parng, "ASG: Automatic schematic generator" | INTEGRATION, the VLSI journal 11, 11–27 |
| 1992 | Lee & McNamee, "Aesthetic routing for transistor schematics" | ICCAD, pp. 35–38 |
| 1993 | Frezza & Levitan, "SPAR: a schematic place and route system" | IEEE TCAD 12(7), 956–973 |
| 1993 | Naveen & Raghunathan, "An automatic netlist-to-schematic generator" | IEEE Design & Test 10(1), 36–41 |
| 2000 | Kim, Kim, Choi, Kong, "Right-Topologizer: an efficient schematic generator for multi-level optimization" | IEEE ASIC/SOC, pp. 387–391 |
| 2002 | Springsoft (now Synopsys), "Automatic schematic diagram generation using topology information" | US Patent 6,980,211 |

`[READ]` for the 1984/1986/1987/1989 entries, which are the reference list of
Jehng et al. 1991, a PDF I downloaded and read. `[READ]` for the 2000/1992/1993
entries, which are the reference list of the 2025 Research Square preprint
described in §6. The first pass found exactly one of these — Lee & McNamee —
and could not read it.

**Forty-two years, four venues, at least thirteen distinct systems.** The field
is not thin; it was not searched.

2. Lead 1: synthesis and RTL schematic viewers
------------------------------------------------

The brief called this "the biggest and most obvious miss". It is a miss, but
not in the way expected.

### 2.1 Vivado and Quartus do not document their layout algorithms. I looked.

`[RELAYED]` I searched AMD/Xilinx documentation for the elaborated and
synthesised schematic views (UG835 `show_schematic`, UG906 Design Analysis,
UG892 Design Flows) and Intel/Altera documentation for the RTL Viewer. **No
vendor document names a placement or routing algorithm for the schematic view.**
`show_schematic` offers a `-regenerate` option to "regenerate layout of schematic
view" and says nothing about how.

**I expected Vivado to document its layout algorithm and it does not.** State
that plainly rather than treating the absence as a research failure: these are
user guides, and the algorithm is not a documented interface.

### 2.2 But Quartus documents its readability DOCTRINE, and it has a number

`[READ]` I downloaded *Analyzing Designs with Quartus II Netlist Viewers*
(Quartus II Handbook v8.1 vol. 1, chapter 12, November 2008, 56 pages) and read
it. The summarising tool reported it contained none of this; reading the text
directly contradicts that.

**The RTL Viewer "optimizes the netlist to maximize readability in the following
ways"** — the eight-item list, verbatim:

- Logic with no fan-out and logic with no fan-in are removed from the display.
- Default connections such as VCC and GND are not shown.
- Pins, nets, wires, module ports, and certain logic are grouped into buses where appropriate.
- Constant bus connections are grouped.
- Values are displayed in hexadecimal format.
- NOT gates are converted to bubble inversion symbols in the schematic.
- Chains of equivalent combinational gates are merged into a single gate. For example, a 2-input AND gate feeding a 2-input AND gate is converted to a single 3-input AND gate.
- State machine logic is converted into a state diagram, state transition table, and state encoding table.

Plus a ninth, under *Grouping Combinational Logic into Logic Clouds*: an option
to "automatically group all combinational logic nodes in your design into logic
clouds."

**Every single one of these is an ELISION, not a layout improvement.** The
mature industrial answer to "make the schematic readable" is substantially
*draw less*: delete the dead logic, hide the rails, aggregate the buses, merge
the gate chains, collapse the combinational mass into a cloud. Not one of the
nine is about where things go on the page.

**And the one number the field does publish**, from *Partitioning the Schematic
into Pages*, verbatim:

> "The **Nodes per page** option specifies the number of nodes per partitioned
> page. The default value is **50 nodes**; the range is 1 to 1,000 nodes. The
> **Ports per page** option specifies the number of ports (or pins) per
> partitioned page. The default value is 1,000 ports (or pins); the range is 1
> to 2,000 ports (or pins). The viewers partition your design into a new page if
> either the node number or the port number exceeds the limit you have
> specified."

**This is the closest thing to a published, vendor-backed readability threshold
that this pass found.** It is not a crossing or bend count. It is a page-density
limit: fifty nodes is what a major EDA vendor's default says a schematic sheet
may hold before it must be split. It is directly comparable to a sheet- or
board-partitioning decision.

### 2.3 The commercial schematic-generation engine exists, and it is a whole company

`[RELAYED]` **Concept Engineering GmbH**, Freiburg, Germany, **founded 1990**,
exists to sell automatic schematic generation technology to other EDA vendors.
Its products:

- **Nlview** — "the most robust and flexible technology for automatic schematic
  generation and viewing", OEM'd as a widget into other vendors' debugging
  cockpits. Available for Qt, Java, wxWidgets, Tcl/Tk, Perl/Tk, MFC, JavaScript
  (in-browser) and GUI-less. Covers gate, RTL and block level.
- **T-engine** — an option for automatic **transistor-level** schematic generation.
- **S-engine** — automatic system-level schematic generation.
- **SpiceVision PRO** — takes SPICE netlists and models and "generates clean,
  easy-to-read transistor-level schematics... within seconds", explicitly
  marketed for "Digital Circuits, Mixed-Signal ASICs, **Analog Circuits**,
  Printed Circuit Boards and MEMS". Its documented features include **automatic
  simplification — "merging multiple parallel or serial components, such as
  capacitors or resistors, into single components of the same type"** — and
  automatic logic recognition.

The vendor's own framing of the quality problem, `[RELAYED]`: the layout "can be
modified and controlled by human intervention and always optimized by algorithms,
with a fine granularity of user preferences mixed with machine computed
aesthetics to get the best human readable diagrams."

**Note what SpiceVision's headline simplification would do to a Pultec.** Merging
parallel capacitors into one is precisely the transformation that destroys the
thing an EQ schematic exists to show. The mature tool's readability feature is
this project's correctness failure. That is the clearest single illustration of
where the digital prior art stops transferring.

### 2.4 The patent

`[RELAYED]` **US 6,980,211 B2, "Automatic schematic diagram generation using
topology information"**, filed 2002-06-04, granted 2005-12-27, assigned to
Springsoft, acquired by **Synopsys** in 2013. I could not fetch the patent text
raw (Google Patents refused); this is a summariser's reading and should be
re-checked before anything is built on it.

Reported content: placement by **topology templates** (Central, Fan-In placing
the selected component rightmost, Fan-Out placing it leftmost), with
"components that have a stronger connectivity relationship with the
user-selected component placed closer"; routing by **Steiner-tree algorithms**
under edge- and channel-capacity constraints; and a **connection-line classifier**
that groups lines of the same driver/load class and routes each class together.

Its stated criteria, reported verbatim by the summariser: a schematic should
"demonstrate the interconnectedness of components, reflect the existence of
logical clusters, minimize the number of intersections and jogs in the
connection lines, and efficiently utilize the available drawing area."

**No numerical threshold.** No maximum crossing count, no bend limit.

3. netlistsvg: cloned, run, measured — and the first pass was wrong about it
-----------------------------------------------------------------------------

This is the largest `[RAN]` result in this document, and it changes the picture.

### 3.1 Repository facts, re-checked

`[RAN]` via the GitHub API: `nturley/netlistsvg`, **834 stars**, 110 forks, MIT,
**not archived**, last push **2024-01-25**. Its only release is **v1.0.2,
2020-12-12**.

**The first pass's characterisation needs three corrections**, and they matter:

| First pass said | Measured |
| --- | --- |
| "Last release 1.0.2, December 2020; described as effectively unmaintained" | Release date correct. But the default branch has commits through January 2024, and the project has 834 stars |
| "Digital logic, not analog" | **False.** It ships a first-class analog skin, `lib/analog.svg`, with resistors, capacitors, inductors, diodes, LEDs, Schottkys, NPN/PNP transistors, op-amps, transformers, crystals, voltage and current sources, VCC/VEE/GND — and analog test fixtures `resistor_divider.json` and `common_emitter_full.json` |
| "elkjs layered (Sugiyama) with **left-to-right** flow and orthogonal routing" | True of the default digital skin. **False of the analog skin**, which sets `org.eclipse.elk.direction="DOWN"` |

`[RAN]` `grep -o 's:type="[^"]*"' lib/analog.svg | sort -u` returns 25 symbol
types including `capacitor_h`/`capacitor_v`, `inductor_h`/`inductor_v`,
`transistor_npn`, `opamp`, `transformer_1p_1s`, `xtal`, `vcc`, `vee`, `gnd`.

### 3.2 How it gets schematic-idiomatic output — the mechanism, in code

`[CODE]` Three things, and together they are the most directly transferable
piece of engineering in this document.

**(a) The skin declares which side each pin leaves from.** Every symbol in
`lib/analog.svg` carries per-pin `s:x`, `s:y` and `s:position`. For example, the
vertical capacitor:

```
<g s:type="capacitor_v" s:width="30" s:height="50" ...>
  <g s:x="15" s:y="0"  s:pid="A" s:position="top"/>
  <g s:x="15" s:y="50" s:pid="B" s:position="bottom"/>
</g>
```

`[RAN]` Across the skin: 14 pins declared `top`, 13 `bottom`, 15 `left`, 12
`right`.

**(b) ELK is told those positions are fixed.** `lib/Cell.ts`, in
`buildElkChild()`:

```ts
const layoutAttrs = { 'org.eclipse.elk.portConstraints': 'FIXED_POS' };
```

Not `FIXED_SIDE` — `FIXED_POS`. The pin coordinates from the symbol are handed
to the layout engine as hard constraints. A component may also carry fixed
`x`/`y` from attributes.

**(c) The layering direction is the SUPPLY axis, not the signal axis.**
`lib/analog.svg`:

```
<s:layoutEngine
    org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers="5"
    org.eclipse.elk.layered.compaction.postCompaction.strategy="4"
    org.eclipse.elk.spacing.nodeNode="35"
    org.eclipse.elk.direction="DOWN"/>
```

A layered algorithm run downward with VCC as a source and GND as a sink puts the
rail at the top and the ground at the bottom — the schematic convention — for
free, as a consequence of the layering, with no rule encoding it.

**(d) Two-terminal passives are "laterals".** `[CODE]` The analog skin sets
`genericsLaterals="true"`, and `lib/Cell.ts` treats a port as *lateral* when the
skin marks it so or when the cell is generic. `lib/elkGraph.ts` then routes
drivers→laterals→riders rather than treating the part as having a direction.
This is how a passive with no inherent signal direction is admitted to a
directed layered layout at all. It is exactly the modelling problem a passive EQ
poses.

### 3.3 It draws a textbook common-emitter amplifier

`[RAN]` `make -C test/analog` produced five SVGs; rendered to PNG with
`rsvg-convert -z 3` and looked at.

`common_emitter_full.svg` is **idiomatic**. VCC symbols at the top feeding R3 and
R1 downward; the bias divider R3/R4 vertical with the base node between them; the
coupling capacitor C2 horizontal from `vin` into the base; the NPN correctly
oriented with the collector up and `vout` taken off it; R2 and C1 from the
emitter down to separate grounds. Reference designators upright, values legible,
nothing overprinted.

`[RAN]` Measured: **0 wire crossings** (28 drawn segments, no duplicates). The
resistor divider and the MCU example: **0 crossings** as well.

**One hint the input carries that a netlist would not:** the JSON specifies
`r_v` versus `c_h` — vertical resistor, horizontal capacitor. The part's drawn
orientation is an input, not something the tool decides. That is a real
limitation and it is also, arguably, the right division: orientation is a
semantic choice about the circuit, which is how this repository already treats
criteria that must not come from the producing agent.

### 3.4 It succeeds on every probe that defeated `schematizer`

The second pass established that `devbisme/schematizer` failed 0/9 on a
Pultec-shaped network and 0/3 on ten capacitors in parallel, taking 26–121 s to
fail, and that routed mode was non-deterministic. I rebuilt those probes against
netlistsvg's input format.

`[RAN]` Each configuration run three times, whole-file md5 compared:

| probe | status | seconds | distinct outputs over 3 runs |
| --- | --- | --- | --- |
| 4 caps in parallel | ok | 0.15 | **1** |
| 6 caps in parallel | ok | 0.16 | **1** |
| 8 caps in parallel | ok | 0.16 | **1** |
| 10 caps in parallel | ok | 0.16 | **1** |
| 12 caps in parallel | ok | 0.17 | **1** |
| 14 caps in parallel | ok | 0.17 | **1** |
| 3-way selector fan-out | ok | 0.16 | **1** |
| 5-way selector fan-out | ok | 0.16 | **1** |
| 7-way selector fan-out | ok | 0.17 | **1** |
| Pultec-shaped passive EQ, 25 parts | ok | 0.19 | **1** |

**Ten for ten, thirty runs, byte-for-byte identical every time, never slower
than 0.19 s.** Determinism is not a configuration here; it is what the tool
does. That is the property the first pass recorded as a gap in the whole prior
art, and this tool has it.

### 3.5 Looked at, and measured

**Fourteen capacitors in parallel** — the probe schematizer never once drew —
renders as a proper bank: a top bus rail and a bottom bus rail, fourteen
capacitors hung vertically between them, junction dots at every tap, `Rsrc` in
from `vin` at the left, `Rload` and ground at the left end. `[RAN]` **0 crossings
between different nets.** The only flaw: the capacitors are in ELK's
crossing-minimising order, not numeric order — `C11, C2, C1, C5, C12, C7, C4,
C14, C10, C6, C13, C9, C3, C8`. The same flaw the second pass recorded for Weave.

**The 25-part Pultec probe** renders correctly and legibly — clean orthogonal
wires, upright labels, no text through symbol bodies, the three capacitor banks
visually grouped — and is **not a good audio schematic**. `[RAN]` measured on the
output:

| | |
| --- | --- |
| canvas | 1232 x 482.5 |
| drawn line segments | 117 (97 unique; 20 exact duplicates) |
| crossings between different nets | **15** |
| crossings within one net | 2 |
| ELK edges / total bend points | 43 / 74 |
| **bends per edge** | **1.72** |
| non-axis-aligned sub-segments | **0** |

The seven throws of the HF selector, placed at the far upper left, travel the
entire 1232-unit width to reach their capacitors at the far right. Signal flow is
not left to right — `vin` and `vout` sit in the middle of the sheet.

`[RAN]` **A reproducible defect worth recording: the canvas is sized without
regard to reference-label text extents.** `CHF1`'s label begins at x≈1215 and
needs about 24 units for four characters of 10px bold monospace, ending at
x≈1239 in a 1232-wide canvas. It is visibly clipped in the render. The check
that found it is a comparison of each label's computed right edge against the
declared width; it reported **1** overflow for the Pultec probe and **0** for
the 14-cap probe and for the bundled common-emitter example, so it could have
found nothing.

`[RAN]` The ELK layout dump (`bin/exportLayout.js`) independently reconfirms the
second pass's elkjs result, now through a real tool on a real circuit: **74 bend
points across 43 edges, zero non-axis-aligned sub-segments.** ELK routes
orthogonally and returns the routes in `edge.sections[].bendPoints`.

**The honest summary of netlistsvg: correctness unverified, scale fine,
determinism excellent, local drawing quality good, global arrangement poor.** It
has no round-trip verifier of its own, so nothing here establishes that the
drawings are electrically right — only that they are drawn.

4. Lead 2: the orthogonal graph-drawing literature
----------------------------------------------------

`[READ]` I downloaded and read the OGDF chapter of the *Handbook of Graph
Drawing and Visualization* (Chimani, Gutwenger, Jünger, Klau, Klein, Mutzel;
chapter 17), hosted on Tamassia's own site.

**Topology-shape-metrics, in the handbook's words:**

> "By default, PlanarizationLayout uses OrthoLayout as layout algorithm. This is
> a variation of Tamassia's bend minimizing algorithm [Tam87], generalized to
> work with graphs of arbitrary node degrees... The computation of the layout
> follows the so-called topology-shape-metrics approach... According to the given
> planar embedding Γ the algorithm constructs a network in which a
> **minimum-cost flow determines a bend-minimal representation** of the
> orthogonal shape of G. In a last phase, a compaction module assigns lengths to
> this representation and thus fixes the coordinates of the drawing."

**The sentence that matters most for a schematic:**

> "Tamassia's algorithm requires a planar graph G of maximal node degree four
> and a planar embedding Γ of G. Notice that **pure orthogonal drawings in which
> the nodes are mapped to points in the grid are only admissible for this class
> of planar graphs.**"

A schematic symbol is not a point and routinely has more than four pins. **That
single restriction is why Giotto and Kandinsky exist**, and it is the precise
technical reason the classical result does not drop into a schematic tool
unmodified.

**How OGDF escapes it**, verbatim:

> "In order to extend Tamassia's algorithm to graphs of arbitrary node degree,
> OrthoLayout uses ideas from quasi-orthogonal drawings [KM98] and **Giotto
> layout [TDB88]**, combined with a local orthogonal edge routing algorithm. The
> common idea is to **replace high-degree nodes by artificial faces which will be
> drawn as larger boxes** in an intermediate drawing. The node is then placed
> within this boxes and its incident edges are routed orthogonally to the
> corresponding connection points on the surrounding box."

**Kandinsky**, verbatim:

> "KandinskyLayout... extends the basic approach to graphs of arbitrary degree by
> allowing 0° angles between two successive edges adjacent to a node. **Nodes in
> a graph are modeled as square boxes of unified size placed on a coarse grid,
> whereas edges are routed on a finer grid.** Feasibility is achieved by
> maintaining the so-called **bend-or-end property**..."

Two compaction implementations are named: `LongestPathCompaction` (longest paths
in constraint graphs) and `FlowCompaction` (minimum-cost flow in dual graphs,
"results in shorter edge lengths").

### What OGDF actually ships today

`[CODE]` I fetched the full recursive tree of `ogdf/ogdf` master (2,136 paths,
not truncated) and the headers raw.

- `OrthoLayout`, `OrthoRep`, `OrthoShaper`, `EdgeRouter`, `FlowCompaction`,
  `LongestPathCompaction`, `CompactionConstraintGraph`, `RoutingChannel` — all
  present under `include/ogdf/orthogonal/`.
- `PlanarizationLayout` present under `include/ogdf/planarity/`.
- **`KandinskyLayout` is not in the repository.** Zero of 2,136 paths contain
  the string "andinsky". The handbook chapter describes it; current master does
  not ship it. (The chapter itself notes the original bend-minimisation flow
  network "has a flaw", and that the implementation used an ILP requiring
  COIN-OR — a plausible reason for its removal.)
- `[CODE]` **OGDF is GPL v2 or v3**, from `LICENSE.txt` and every file header.
  Not MIT, not LGPL. That is a hard constraint on reuse that the earlier passes'
  "borrow an engine" framing did not mention.
- `[RAN]` GitHub API: 404 stars, 127 forks, last push 2026-04-21.

### The literature's own warning, restated

The second pass established, from Dwyer et al. 2009, that the harm in an
orthogonal layout was attributed to **bends inside the clique**, not crossings,
and that crossing count did not correlate with task performance. `[RELAYED]`
This pass found a newer and directly relevant replication: **Di Bartolomeo,
Schicho, Traversini, Fink, Didimo, Montecchiani, "Do Graph Drawing Aesthetics
Matter for AI? A Replication of Foundational Studies in Graph Readability",
Computer Graphics Forum, DOI `10.1111/cgf.70436`, published 2026-06-17.** It
replicates two of the foundational Purchase-era studies and reports that AI and
human preferences for network visualisation are not necessarily the same.
**Paywalled at Wiley; no arXiv preprint found; I did not read it.** It is a
live lead.

**And the field contradicts itself, which is itself the finding.** Purchase's
1997 result is that crossings dominate and bends matter less; Dwyer's 2009
result is that bends were implicated and crossings did not correlate; Jehng's
1991 result (§5) is that neither matters as much as regularity and symmetry.
Three serious sources, three different answers. Nobody should take a
crossing-minimisation objective from this literature as settled.

5. Lead 4: what the 1980s–90s literature actually said
--------------------------------------------------------

`[READ]` I downloaded and read **Jehng, Chen & Parng, "ASG: Automatic schematic
generator", INTEGRATION, the VLSI journal 11 (1991) 11–27** (received 16 March
1990), hosted openly by National Taiwan University. It is the "bubble" entry in
the FITEE 2025 taxonomy, and it is the most useful historical document found.

**Its seven design considerations, verbatim and complete:**

> (1) For the purpose of reducing the complexity of the circuit, arbitrarily
> shaped functional modules with terminals all around can be used
> hierarchically.
>
> (2) In human habit, **the signal flows of circuits are always scheduled to go
> from left to right.** To match this habit, the placement should also be
> considered to follow the signal flows from left to right.
>
> (3) **The feedback loops in circuits are always grouped together**, especially
> for the latch loops in sequential circuits. These groups will be processed
> individually. It will expose the circuit functions to enhance the readability
> of circuits.
>
> (4) **The fanout and feedback interconnections must be extracted** to schedule
> them regularly, straightly, and evidently to express the characteristics in
> circuitry.
>
> (5) **The pin assignment can exchange pins to reduce the number of
> interconnection crossovers.** In general, the feedback pins will be assigned to
> the boundary of the feedback side.
>
> (6) **The regularity, symmetry, and tidiness are more important than the
> minimization of crossovers, bends, and path length.**
>
> (7) To speed up the processing and for the convenience of algorithm traversal,
> it is better to represent the circuit in dynamic data structure.

**Item (6) is the single most valuable sentence this pass recovered.** It is an
explicit, published priority ordering, stated in 1991 by people who had built
the thing, and it says the metrics everyone reaches for first are the *less*
important ones. It agrees with Dwyer 2009 and disagrees with a naive reading of
Purchase. It is also the kind of statement that belongs in a rule file rather
than in a producing agent's judgement.

**Its critique of the prior art of its own day**, verbatim, is still live:

> (1) Lack of global consideration of full circuit interconnection and
> distribution.
> (2) **The emphases on routibility are similar to layout routing but lose the
> feeling of schematic esthetics.**
> (3) Lack of considering the drawing habit of human designers.
> (4) The massive matrix operations may slow down the system speed when large
> amounts of data are processed.

Item (2) is the same objection the second pass made to schematizer, thirty-five
years early.

**Its quality measure was the eye, and it said so.** `[READ]` The evaluation is
three worked examples with prose verdicts: *"the final drawing can be
immediately identified as JK master slave flip-flop"*, *"the final drawing is
**fully identical to that in databook**"*. **The 1991 state of the art graded a
generated schematic by whether it matched the manufacturer's databook drawing,
by eye.** No metric. That is an honest and important negative result: the
numeric-quality gap the first two passes found is not new, it is original to the
field.

**Its scale, `[READ]` from Table 1** (SUN 3/110):

| circuit | modules | connections | run time (s) |
| --- | --- | --- | --- |
| JK master-slave flip-flop | 11 | 21 | 4.27 |
| Binary counter | 28 | 69 | 14.37 |
| SN74181 | 32 | 126 | 19.86 |

Eleven to thirty-two parts. **The small-scale finding the first pass recorded
across the 2025–2026 LLM literature is not an LLM limitation. It has been the
reported scale of this field since 1991.**

`[RELAYED]` **Frezza & Levitan, SPAR, IEEE TCAD 12(7) (1993) 956–973**, not read:
reported to generate schematics from circuit descriptions with heuristics based
on "two principles of schematics readability: **functional identification and
traceability**", in five phases (netlist partitioning, page placement, global
routing, local routing, I/O module addition), with the global router guided by a
cost function of congestion and wirelength estimates, and to describe "a
technique for evaluating the quality of schematic drawings". **That last clause
is the highest-value unread item in this document after AEM.**

`[RELAYED]` **Stok & Koster, "From network to artwork", DAC 1989**: reported by
Jehng's own text as "a module networking algorithm" emphasising "reducing the
crossover of signal paths and increasing the symmetry".

`[RELAYED]` **Valdés-Pérez, MIT AI Lab Working Paper 292, January 1987**,
"Knowledge-Based Schematics Drafting: Aesthetic Configuration as a Design Task".
Argues "the task of schematics drafting is one of **aesthetic design**", that
algorithmic programs "do not fully exploit available knowledge of circuit
function, relying mainly on the circuit topology", and that "**the
extra-topological circuit characteristics are what an engineer uses to understand
a schematic**". It presents a **circuit layout constraint language**, a search
regimen and a backtracking scheme. `[RAN]` **I tried three times to download the
PDF from `dspace.mit.edu/bitstream/handle/1721.1/41175/AI_WP_292.pdf` and got
HTTP 429 with `Retry-After: 900` every time.** It is open access and freely
available; it is simply rate-limited. **Anyone picking this up should retry it —
a 1987 constraint language for schematic aesthetics is the closest thing in this
document to a rule file for this problem, and I did not read it.**

6. The quality-measure question: three answers, one of them a formula
-----------------------------------------------------------------------

This is what the brief said was most valuable, and this pass moved it.

### 6.1 AEM — the formula, READ

`[READ]` **Yang, Qiao, Chen, Shi, Chen, Yan (PLA Information Engineering
University, Zhengzhou), "An Efficient and High-Quality Circuit Schematic
Generation Method based on Action Mask and Graph Neural Network."** Published in
*Discover Artificial Intelligence* (Springer, open access, DOI
`10.1007/s44163-025-00726-7`); **the author-accepted PDF is freely downloadable
from Research Square (`rs-7168754`, posted 13 August 2025)**. I downloaded that
PDF, extracted its text and read it. Springer's own site refused both the
browser page and the content PDF.

This is the follow-up to the AEM-PCB Reverser paper that both earlier passes
listed as paywalled and unreadable. **It restates the AEM objective function in
full.** Verbatim from the extracted text:

> max AEM = ( Σ_{i=1..m} RL_i × D_WB_i × D_NC_i ) / m    (1)
>
> RL_i = R_b_i / α + ( (α − 1)(R_b_i − P_i) ) / α        (2)
>
> "where AEM denotes aesthetic evaluation metrics, **m** denotes the number of
> routing, **D_WB** and **D_NC** denote the discount factors determined by the
> **number of routing bends** and the **number of network crossings**, **R_b** is
> affected by the **alignment of the components** and denotes the baseline
> fraction, **P** denotes the **penalty fraction to constrain a single routing to
> be in a given range of lengths**, and **α** is the single routing robustness
> factor, which is generally taken to be a value of **2** in the experiments."

**What this establishes, and what it does not.** The *shape* of the metric is
now known and is reusable as a shape: a **per-net** score, **averaged over the
net count** so that circuits of different size are comparable, built as a
**multiplicative discount** on bends and on crossings applied to an
**alignment-derived baseline**, with an **additive penalty** that pushes each
wire's length into a stated band. The robustness factor α=2 makes RL the mean of
the raw baseline and the penalised baseline.

**What is NOT established: the definitions of D_WB, D_NC, R_b and P.** They are
given by role, not by formula. Those live in the original AEM-PCB Reverser paper
(IEEE TCAD 43(5), 1608–1612, DOI `10.1109/TCAD.2023.3340869`), which remains
paywalled and which **I did not read**. **A reimplementation from this paper
alone would be inventing four of the five terms.** Say so if anyone proposes it.

### 6.2 AEM's numbers, and the circuits they were measured on

`[READ]` Table 4, maximum AEM per circuit, baseline network versus the
action-mask/GNN network:

| | Timer1 | Amplifier1 | Power1 | Amplifier2 | Power2 | Syndromic scale1 |
| --- | --- | --- | --- | --- | --- | --- |
| Base | 75.37 | 77.88 | 72.34 | 77.94 | 74.23 | 75.92 |
| AM | 80.16 | 88.41 | 76.75 | 80.05 | 79.47 | 85.64 |
| gain | 6% | 14% | 6% | 3% | 7% | 13% |

| | Power3 | Power4 | Video1 | Amplifier3 | Radio1 | Triangle Wave |
| --- | --- | --- | --- | --- | --- | --- |
| Base | 74.33 | 62.25 | 45.82 | 46.57 | 44.14 | 68.11 |
| AM | 80.27 | 68.83 | 55.49 | 58.10 | 51.26 | 75.10 |
| gain | 8% | 11% | 21% | 25% | 16% | 10% |

Mean reward gain 11.67%.

**So a published quality measure for a machine-generated schematic produces
values roughly in the 44–88 range on real boards, and a state-of-the-art method
moves them by about 10%.** That is not "an acceptable crossing count", but it is
the first published *numeric* answer to "how good is a generated schematic" that
any of the three passes has obtained.

### 6.3 And the benchmark is discrete analog audio — Table 1, verbatim

`[READ]`

| ID | Circuit Name | Short Name | # Cps | # Nets |
| --- | --- | --- | --- | --- |
| 1 | Clock Circuit | Timer1 | 9 | 9 |
| 2 | Adder Circuit 1 | Amplifier1 | 10 | 7 |
| 3 | DC3.3V Power Output Circuit | Power1 | 10 | 6 |
| 4 | Adder Circuit 2 | Amplifier2 | 11 | 8 |
| 5 | 5V Switching Power Supply Circuit | Power2 | 11 | 7 |
| 6 | Inverted Proportional Summing Circuit | Syndromic Scale1 | 11 | 7 |
| 7 | Triangle Wave Oscillator Circuit | Triangle Wave | 12 | 8 |
| 8 | Li-ion Battery Charger Circuit | Power3 | 15 | 10 |
| 9 | NiCd Battery Charger Circuit | Power4 | 17 | 12 |
| 10 | **AN7112 Audio Amplifier Circuit** | Video1 | 22 | 18 |
| 11 | 300M RF Remote Control Circuit | Radio1 | 22 | 12 |
| 12 | **TDA2030 Power Amplifier Circuit** | Amplifier3 | 27 | 11 |

`[RAN]` **The dataset is public and I cloned it**: `MrBade/PCBNetlistS`,
**BSD-2-Clause**, 1 star, last push 2025-03-14, 56 files — twelve plain-text
netlists plus PNG package pictures per component type. The format is documented
in its README: a component block giving name, package category, value, then net
blocks listing `component-pin` members.

`[RAN]` I read `netlists/amplifier3.txt` (the TDA2030A amplifier): 27 parts
including a TO-220-5V TDA2030A, six 1N400x diodes, a SIP3K transformer, 2200 µF
bulk capacitors, axial resistors — and **high-degree nets**: `GND` has 11 pins,
`+VCC` has 10, `-VCC` has 10.

**This is decisive for the transfer question.** It is an ordinary discrete
analog audio power amplifier with a transformer and a bridge, and its ground net
has eleven pins — the same high-degree-net shape that the second pass measured
defeating `schematizer` at ten capacitors in parallel. The most mature published
schematic-quality metric in the field was developed and validated on exactly
this kind of circuit, at exactly this scale.

### 6.4 An open, readable, weighted schematic quality score in code

`[CODE]` **`aidangoettsch/asg`**, MIT, 31 stars, 5 forks, last push 2020-10-25.
Written in one summer under the mentorship of **Tim Edwards** (qflow,
open_pdks). Presented at **WOSET 2020** — `[READ]`, I downloaded and read the
workshop paper (`woset-workshop.github.io/PDFs/2020/a13.pdf`). It takes a SPICE
netlist plus a symbol library and emits **Xschem or KiCad EEschema** schematics.

**Its score is a weighted sum of seven independently-countable terms**, and the
weights are a plain dict in `asg/generation/__init__.py`:

```python
constraint_weights = {
    LTRConstraint: 10,
    VerticalSortConstraint: 0,
    InputYDegridConstraint: 10,
    UntangleConstraint: 10,
    LinesAvoidOthers: 20,
    LinesAvoidBoundingBoxes: 20,
    ComponentsAvoidOthers: 100,
}
```

`[CODE]` Each term's `get_score()`, extracted from `constraints.py`:

| term | what it computes |
| --- | --- |
| `LTRConstraint` | **+1 per component** sitting in its optimal column, i.e. a reward for left-to-right signal flow |
| `VerticalSortConstraint` | **−Σ \|y − mean y of its inputs\|** — vertical alignment with driving pins |
| `InputYDegridConstraint` | **−Σ \|y − optimal y\|** over circuit inputs |
| `UntangleConstraint` | **−(number of wire–wire intersections)** |
| `LinesAvoidBoundingBoxes` | **−(number of wires crossing a component body)** |
| `ComponentsAvoidOthers` | **−(number of overlapping component pairs)** |
| `LinesAvoidOthers` | **−(number of collinear overlapping segment pairs)** — wires drawn on top of each other |

Optimisation is hill-climbing: apply each constraint's `maximize()` in rotation,
re-score, keep the best, stop after 10 non-improving steps.

**The reusable idea is the structure, not the numbers.** Criteria are named,
separate, each independently countable, each able to fail on its own, with the
weights in one small declaration that is not the code that does the placing.
That is the same separation this repository's `CLAUDE.md` demands between an
artifact and its criteria, and somebody has an MIT-licensed implementation of it
for KiCad.

**Two defects in it, checkable:**

1. **The score mixes units.** Four terms are integer violation counts; two are
   pixel-distance sums. `[CODE]` `[RAN]` The repository commits a debug trace in
   `out/` whose filenames carry the running score, and they read
   `0_VerticalSortConstraint_-174561.7`, `1_InputYDegridConstraint_-267654.6`,
   `4_LinesAvoidBoundingBoxes_-1827404.6`. **A score in the hundreds of thousands
   cannot be dominated by counts weighted at 20 and 100.** The aggregate is
   governed by pixel distance; the defect counts are noise in it. The author
   appears to have noticed half of this — `VerticalSortConstraint` is weighted
   **0**.
2. `[RAN]` **I could not run it.** `pip install ./asg` into a venv succeeds, but
   `import asg` fails: `ImportError: cannot import name 'segments_intersections'
   from 'bentley_ottmann.planar'`. The dependency's API has drifted since 2020.
   Installing `bentley-ottmann` did not fix it. **Nothing about its output
   quality is established here — only what the code computes.**

### 6.5 The scoreboard, after three passes

| measure | published? | formula available? | open implementation? | numbers? |
| --- | --- | --- | --- | --- |
| **AEM** (Yang et al.) | yes, IEEE TCAD | **shape yes** (§6.1); four sub-terms no | no | **yes, 44–88 on 12 real boards** |
| **ASG weighted score** (Goettsch) | WOSET 2020 | **yes, in code** | **yes, MIT** | weights only; mixes units |
| **Quartus nodes-per-page** | yes, Altera handbook | n/a | n/a | **50 nodes default, 1–1000 range** |
| Jehng 1991 priority ordering | yes, INTEGRATION | no — a stated ordering, not a metric | no | none |
| SchGen Spatial Violation | yes, paper | no | **no** — second pass established it is not in the repo | no |
| SPAR "technique for evaluating quality" | yes, TCAD 1993 | **unread** | no | unread |
| Weave round-trip | yes, arXiv | yes, 116 lines JS | yes | binary, correctness not readability |
| `greadability` | yes | yes | yes, BSD | second pass established it breaks on schematic input |

7. Does the mature prior art transfer to discrete analog?
-----------------------------------------------------------

**Partly, and the seam is clean.** Three layers, with different answers.

**The geometry layer transfers, demonstrably.** `[RAN]` A layered orthogonal
engine (ELK) driven through a schematic-aware front end (netlistsvg's analog
skin) drew a textbook common-emitter amplifier at 0 crossings and a fourteen-way
capacitor bank at 0 inter-net crossings, deterministically, in under a fifth of
a second — on exactly the inputs that defeated the best open-source KiCad
schematic router. Bend minimisation, port-side constraints and layering
direction are circuit-agnostic machinery and they work.

**The evaluation layer transfers, and was built on analog.** `[READ]` The AEM
line of work — the most mature published schematic quality metric — was
developed against twelve real discrete boards including two audio power
amplifiers, at 9 to 27 components, with eleven-pin ground nets. Lee & McNamee
1992 is transistor schematics. SpiceVision PRO is sold for analog. This is not
a digital-only tradition.

**The readability DOCTRINE does not transfer, and this is the finding that
explains the earlier passes' difficulty.** `[READ]` Every one of the nine
readability mechanisms Quartus documents is an elision: delete dangling logic,
hide VCC and GND, merge gate chains, bus-group the pins, collapse combinational
mass into a cloud. `[RELAYED]` SpiceVision's headline simplification is merging
parallel and series passives into one component. **Applied to a Pultec these
would hide the ground return, merge the capacitor bank, and delete the
distinction the circuit exists to make.** The mature industry's answer to "the
schematic is unreadable" is largely "draw less of it", and an analog EQ has
nothing it can afford to stop drawing.

**So the honest shape of the answer is not "it is all digital and does not
transfer."** It is: **the algorithms and the metrics transfer; the elision
doctrine does not, and the elision doctrine is most of what the big vendors
actually ship as "readability".**

8. What this project would be reinventing, updated
----------------------------------------------------

Additions to the first pass's list, each with a licence and a verification mark:

- **Schematic-aware ELK configuration for analog parts** — `netlistsvg`
  `lib/analog.svg` + `lib/Cell.ts` + `lib/elkGraph.ts`, **MIT**. Per-pin side
  and coordinate constraints in the symbol, `portConstraints: FIXED_POS`,
  layering direction along the supply axis, "lateral" ports for direction-free
  passives. `[CODE]` `[RAN]`
- **A deterministic, sub-second netlist→drawn-schematic path that survives
  high-degree nets** — the same, `[RAN]` 30/30 byte-identical runs.
- **Topology-shape-metrics orthogonal layout with min-cost-flow bend
  minimisation, generalised past degree 4** — OGDF `PlanarizationLayout` +
  `OrthoLayout`, **GPL v2/v3**. `[READ]` `[CODE]`
- **A weighted, named, separately-countable schematic violation score emitting
  KiCad** — `aidangoettsch/asg`, **MIT**, `[CODE]`, **not run**.
- **A per-net normalised aesthetic metric combining bends, crossings, alignment
  and wire-length banding** — AEM, formula shape `[READ]`, sub-terms unread, no
  implementation.
- **A benchmark set of real discrete analog boards with netlists** —
  `MrBade/PCBNetlistS`, **BSD-2-Clause**, 12 circuits, 9–27 components. `[RAN]`
- **A page-density partition threshold** — Quartus, 50 nodes per page by
  default. `[READ]`
- **A stated aesthetic priority ordering from people who built one** — Jehng,
  Chen & Parng 1991, item (6). `[READ]`

9. Entries owed to `docs/known-gaps.md`
-----------------------------------------

This research was instructed not to modify any repository file, so these are
recorded here. **They are owed as `known-gaps.md` entries and this section is
not a substitute for them.** Each says what was measured or is unresolved,
whether I confirmed it or am relaying it, and what would settle it.

1. **`netlistsvg` draws a Pultec-shaped 25-part passive network, 14 capacitors
   in parallel, and a 7-way selector fan-out — every probe that defeated
   `schematizer` — in under 0.19 s, and 30 runs across 10 configurations
   produced byte-for-byte identical output every time.** *Confirmed by running
   it.* It has no round-trip verifier, so **connectivity correctness of its
   output is unestablished**. *Criterion to settle:* export a netlist from the
   generated artifact and compare net partitions against the input, as the second
   pass did for schematizer. *Mechanism, untested:* netlistsvg emits SVG, not
   `.kicad_sch`, so this needs a geometric re-parse of the SVG rather than
   `kicad-cli`.
2. **The first pass's three claims about `netlistsvg` are wrong or incomplete:**
   it is not digital-only (a full analog skin with 25 symbol types ships in
   `lib/analog.svg`); its analog skin lays out `direction=DOWN`, not left to
   right; and it has 834 stars with commits to 2024-01-25, though its only
   release is v1.0.2 of 2020-12-12. *Confirmed by reading the repository and the
   GitHub API.* *Settled — this entry is the record, and the first-pass document
   should carry a correction note.*
3. **`netlistsvg` sizes its SVG canvas without regard to reference-label text
   extents.** On the 25-part Pultec probe, `CHF1`'s label ends at x≈1239 in a
   1232-wide canvas and is visibly clipped. *Confirmed by measurement; the same
   check reported 0 overflows on two other outputs, so it could have failed.*
   *Criterion:* every label's right edge within the declared width. *Mechanism,
   untested:* widen the canvas by the maximum label extent rather than by symbol
   bounding boxes.
4. **`netlistsvg` emits exact duplicate line segments for multi-fan-out nets** —
   74 of 152 drawn segments on the 14-capacitor probe, 20 of 117 on the Pultec
   probe. Visually harmless; it matters to anything that parses or diffs the
   output, and it makes a naive crossing count wrong. *Confirmed by measurement.*
5. **A crossing count on a generated schematic must exclude same-net
   intersections or it is meaningless.** On the 14-capacitor probe the naive
   count is 12 and the inter-net count is 0; the image shows no crossings.
   *Confirmed — the first measurement I wrote was wrong and the second corrects
   it.* *Criterion:* count proper intersections only between segments of
   different nets.
6. **The AEM objective function's SHAPE is now known and its four sub-terms are
   not.** AEM = (1/m)·Σ RL_i·D_WB_i·D_NC_i with RL_i = R_b_i/α + (α−1)(R_b_i −
   P_i)/α, α=2. D_WB and D_NC are discount factors on bend count and crossing
   count; R_b is an alignment baseline; P penalises a wire outside a length band.
   *Read directly from the Research Square PDF of `10.1007/s44163-025-00726-7`.*
   **D_WB, D_NC, R_b and P are defined only by role.** *Criterion:* obtain IEEE
   TCAD 43(5):1608–1612 (DOI `10.1109/TCAD.2023.3340869`) and establish whether
   the four terms are computable from a `.kicad_sch`. **A reimplementation from
   the open paper alone would be inventing four of five terms.**
7. **Published AEM scores on real boards run 44–88, and a state-of-the-art
   method moves them about 10%.** Twelve circuits; the two audio amplifiers score
   45.82→55.49 and 46.57→58.10. *Read from Table 4.* This is the first numeric
   answer any pass has to "how good is a generated schematic", and it is not a
   crossing or bend threshold.
8. **The AEM benchmark set is discrete analog, public and BSD-2-Clause** —
   `MrBade/PCBNetlistS`, 12 netlists, 9–27 components, including a TDA2030A power
   amplifier whose GND net has 11 pins. *Confirmed by cloning and reading
   `amplifier3.txt`.* It is a ready-made external test corpus of exactly this
   project's circuit class, authored by someone else — which is the property the
   criteria invariant cares about.
9. **An MIT-licensed, readable, weighted schematic violation score exists and
   emits KiCad** — `aidangoettsch/asg`, seven named terms with weights
   `{LTR:10, VerticalSort:0, InputYDegrid:10, Untangle:10, LinesAvoidOthers:20,
   LinesAvoidBoundingBoxes:20, ComponentsAvoidOthers:100}`. *Confirmed by reading
   the code.* **Its aggregate mixes integer violation counts with pixel-distance
   sums and is dominated by the latter** — the committed debug trace in `out/`
   shows scores in the hundreds of thousands and the author has zero-weighted one
   of the two distance terms. *Criterion for anyone adopting the structure:* each
   term reports in its own unit and is gated separately, rather than being summed
   into one number.
10. **`aidangoettsch/asg` could not be run here.** `import asg` fails with
    `ImportError: cannot import name 'segments_intersections' from
    'bentley_ottmann.planar'`; installing `bentley-ottmann` did not fix it. *I ran
    this and it failed.* **No claim is made about its output quality.**
    *Criterion:* pin the 2020-era `bentley_ottmann` and re-run.
11. **OGDF ships `OrthoLayout` but NOT `KandinskyLayout`**, although the OGDF
    handbook chapter documents the latter. Zero of 2,136 paths in master match
    "andinsky". *Confirmed against the full recursive tree.* **OGDF is GPL v2/v3**,
    not a permissive licence — a hard reuse constraint the earlier "borrow an
    engine" framing did not record. *Confirmed from `LICENSE.txt` and file
    headers.*
12. **The classical Tamassia result does not apply to schematic symbols, and the
    handbook says why:** "pure orthogonal drawings in which the nodes are mapped
    to points in the grid are only admissible for [planar, max-degree-4] graphs."
    Giotto (OrthoLayout) and Kandinsky exist to lift that restriction — the first
    by replacing high-degree nodes with boxes and routing to connection points on
    the box, the second by modelling nodes as boxes on a coarse grid with edges on
    a finer one. *Read from the OGDF handbook chapter.* This is the technical
    reason a schematic cannot use textbook TSM unmodified.
13. **The major FPGA vendors do not document their schematic layout
    algorithms.** I searched AMD/Xilinx (UG835, UG906, UG892) and Intel/Altera
    RTL Viewer documentation and found none. *A search that could have found one
    and did not.* **This lead is empty and should be recorded as empty** so the
    next agent does not spend the same effort.
14. **Quartus's documented readability doctrine is nine elision mechanisms and
    one page-density number: 50 nodes per page by default, range 1–1,000; ports
    per page 1,000, range 1–2,000.** *Read from the handbook chapter directly;
    the summarising tool reported the document contained none of this, which is
    why the PDF was extracted and read.* **Every one of the nine would be wrong
    on an analog EQ** — hiding GND, merging parallel passives, bus-grouping. The
    industry's readability answer is "draw less", and this circuit class cannot.
15. **The literature disagrees with itself about crossings versus bends, and the
    disagreement is three-way.** Purchase 1997: crossings dominate, bends matter
    less. Dwyer et al. 2009 (identified by the second pass): bends were
    implicated, crossing count did not correlate with task performance. Jehng et
    al. 1991, verbatim: *"The regularity, symmetry, and tidiness are more
    important than the minimization of crossovers, bends, and path length."*
    *The 1991 quote is read directly; the other two are as the earlier passes
    recorded them.* **No crossing-minimisation objective should be adopted as
    settled on this evidence.**
16. **Automatic schematic generation is a named EDA subfield with a continuous
    literature from ICCAD 1984**, recovered from the reference lists of two
    papers read in full (§1, thirteen entries). *Confirmed by reading those
    reference lists.* The first two passes found one of the thirteen.
17. **Grading a generated schematic by eye against the manufacturer's databook
    drawing was the 1991 state of the art, stated in those words** — Jehng et al.
    evaluate with *"the final drawing is fully identical to that in databook"*.
    *Read directly.* The numeric-quality gap the earlier passes found is original
    to the field, not a modern regression.
18. **Scale has been 11–32 components since 1991** — Jehng's Table 1 reports JK
    flip-flop (11 modules/21 connections), binary counter (28/69), SN74181
    (32/126). *Read directly.* The small-scale limit the first pass attributed to
    LLMs predates them by thirty-five years.
19. **An entire company has sold automatic schematic generation since 1990** —
    Concept Engineering GmbH; Nlview (gate/RTL/block), T-engine (transistor),
    S-engine (system), SpiceVision PRO (SPICE→transistor schematic, marketed for
    analog and PCB). *Relayed from vendor and press pages; not read raw, not run.*
    **SpiceVision's headline simplification merges parallel and series passives
    into one** — the transformation that would destroy a Pultec capacitor bank.
    *Criterion:* if anyone proposes a commercial path, establish whether that
    simplification can be disabled.
20. **Springsoft/Synopsys hold a patent on automatic schematic generation from
    topology** — US 6,980,211, filed 2002-06-04, granted 2005-12-27: topology
    templates (Central / Fan-In / Fan-Out), connectivity-based proximity, Steiner-
    tree routing, driver/load class grouping of connection lines. Its criteria
    list is qualitative; **no numerical threshold**. *Relayed via a summarising
    tool; Google Patents refused a raw fetch; not read.*
21. **`Frezza & Levitan, "SPAR: a schematic place and route system", IEEE TCAD
    12(7):956–973 (1993)` is reported to "describe a technique for evaluating the
    quality of schematic drawings", built on two stated principles of readability
    — functional identification and traceability.** *Relayed, not read.*
    **This is the highest-value unread item in this document after AEM's
    sub-terms.** *Criterion:* obtain the paper and establish whether its quality
    technique is computable from a netlist plus a drawing.
22. **`Valdés-Pérez, MIT AI Lab Working Paper 292 (1987)` presents a circuit
    layout constraint language for schematic aesthetics and is open access, but
    `dspace.mit.edu` returned HTTP 429 with `Retry-After: 900` on three
    attempts.** *I tried and failed; the failure is the measurement.* It argues
    schematic drafting is aesthetic design and that "the extra-topological circuit
    characteristics are what an engineer uses to understand a schematic".
    *Criterion:* retry the download. It is the closest thing in the recovered
    literature to a rule file for this problem and **I did not read it.**
23. **`Di Bartolomeo et al., "Do Graph Drawing Aesthetics Matter for AI? A
    Replication of Foundational Studies in Graph Readability", Computer Graphics
    Forum, DOI 10.1111/cgf.70436, 2026-06-17`** replicates the foundational
    Purchase-era readability studies and reports that AI and human preferences
    differ. *Relayed; paywalled at Wiley; no preprint found; not read.*

10. What this pass did NOT establish
--------------------------------------

- **Nothing about `netlistsvg`'s electrical correctness.** It has no round-trip
  verifier and I did not write one. Every drawing judgement here is about
  arrangement, not connectivity.
- **`aidangoettsch/asg` was never run** — a dependency API drift blocked it. Only
  what its code computes is established.
- **AEM's four sub-terms are unread**, and so AEM is not implementable from what
  is in this document.
- **SPAR, the MIT 1987 working paper, the Di Bartolomeo replication, the FITEE
  2025 survey's metrics section, and the original AEM-PCB Reverser paper were all
  identified and none was read.**
- **The Vivado and Quartus schematic engines were never run**, only their
  documentation read. No AMD/Intel tool was installed.
- **No commercial tool was exercised.** Concept Engineering's Nlview, T-engine,
  S-engine and SpiceVision PRO are vendor and press claims, `[RELAYED]`. I saw no
  output from any of them.
- **The Synopsys patent was not read raw** — Google Patents refused; the account
  in §2.4 is a summariser's.
- **The Pultec probe used here is a layout probe, not a circuit claim.** Nothing
  about frequency response should be read off it. It is a selector fanning to
  capacitor banks with pots as resistors and one inductor, built to reproduce the
  second pass's shape, not to be correct.
- **The `netlistsvg` analog input format requires the part's drawn orientation as
  an input** (`r_v` versus `c_h`). How much of the drawing quality in §3.3 is owed
  to that hint rather than to the layout engine was not isolated.
- **I did not search non-English literature or patent databases systematically.**
  Two patents surfaced incidentally (US 6,980,211; US 5,416,721, the latter a
  scanned image with no text layer).

---

End of document.

### Artifacts left in the scratchpad

All under `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/c2d282b5-563b-4925-a635-40baac8284e1/scratchpad/priorart3/`, if the controller wants to re-check anything: the `netlistsvg`, `asg` and `PCBNetlistS` clones; `gen.py` and `run_probes.sh` (the probe generator and runner); `measure.py` / `measure2.py` (the crossing counters, the second superseding the first); `probe_*.json` / `probe_*.r[123].svg` (inputs and 30 outputs); `out_pultec.png`, `out_par14.png`, `out_fan7.png` (renders); `pultec_elk.json` (the ELK layout dump); and the extracted texts `aem_gnn.txt`, `quartus.txt`, `ogdf.txt`, `ntu_asg.txt`, `woset2020.txt` with their PDFs. **Nothing was written into the repository and nothing was committed.**