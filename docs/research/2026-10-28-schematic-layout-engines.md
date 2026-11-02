# Off-the-shelf schematic layout and placement engines

Research pass, 2026-10-28. Commissioned to answer whether an off-the-shelf
engine could replace this repository's own schematic generator.
**This document gathers evidence. It makes no recommendation about that
replacement.**

## 0. Read this before anything else: most of this question is already answered

**This repository has already run six research passes and two measured spikes
on exactly this question, and their evidence is stronger than anything in this
document.** They are indexed at [`../schematic/README.md`](../schematic/README.md):

| file | what it holds |
| --- | --- |
| `../schematic/generation-prior-art.md` | first pass: the field survey, position-1/2/3/4 framing |
| `../schematic/generation-prior-art-second-pass.md` | schematizer and Weave **installed and run** |
| `../schematic/generation-prior-art-third-pass.md` | netlistsvg's ELK mechanism **read in code**; OGDF read; ELK probes |
| `../schematic/generation-prior-art-circuit-families.md` | schematizer and Weave run against **all four repo circuits** |
| `../schematic/elk-spike.md` | ELK **run on this repository's own circuits**, 15 inputs x 3 |
| `../schematic/elk-block-spike.md` | ELK run **per declared block**, 162 block runs |
| `../schematic/m1-remeasurement.md` | the spikes' figures **re-taken on the real pipeline** |
| `../schematic/text-handling-report.md` | ELK's **label** options, nine measured arms |

**Those documents ran code. This one did not.** Where they and this document
touch the same tool, **they are the record and this is a literature review.**
This document exists for the five things they declare they did not cover, and
it says so in each section.

### The global caveat on everything below

Every page in this document was fetched through a summarising tool, not read
raw by me. **I did not clone a repository, install a package, execute a
generator, or render a single schematic.** So `[REPO]` means "the repository
page says", never "I ran it". Every star count, licence, date and capability
claim here is a transcription with today's date on it and should be re-checked
before anything is built on it. The two things I did measure myself are marked
`[RAN]` and both are `wc`-grade facts about this repository, not about any
tool.

Marks follow `generation-prior-art.md`'s vocabulary, with one addition:

| Mark | Means |
| --- | --- |
| `[REPO]` | I read the project's own repository/docs page and am reporting what it says about itself |
| `[PAPER-ABS]` | I read an abstract or landing page. Method details are **not** established |
| `[VENDOR]` | A marketing or product page. A capability claim, nothing more |
| `[THIRD-PARTY]` | Someone else's blog, survey or issue thread. Useful for leads; its verdicts are its own |
| `[RAN]` | I ran a command in this repository and am reporting its output |
| `[PRIOR-ART]` | **This repository already established it, by running code.** Cited, not restated |

## 1. The premise of the question needs correcting first

The brief says "~15k lines of its own schematic generator (placement, routing,
label placement) on top of ELK". Measured, `[RAN]`, 2026-10-28:

```
find lib/schgen -name '*.ts' | wc -l            109 files
find lib/schgen -name '*.ts' -exec cat {} + | wc -l     21726 lines
```

Broken down by subsystem, largest first:

| subsystem | lines |
| --- | --- |
| `lib/schgen/render/` | 11 061 |
| `lib/schgen/elk/` | 2 873 |
| `lib/schgen/gates/` | 1 881 |
| `lib/schgen/readability/` | 1 633 |
| `lib/schgen/ir/` | 1 225 |
| `lib/schgen/rules/` | 697 |
| `lib/schgen/lock/` | 298 |
| top-level files | 2 058 |

**Re-run this rather than quoting it.** The figures are included because a
dated research document is where a measurement with provenance belongs, but
`CLAUDE.md` is right that a number in prose goes stale: the command above is
the answer to the question.

**What the breakdown says is that layout is the minority of the code.**
`elk/` — the part an off-the-shelf layout engine would displace — is 13% of
the total. `render/` is 51%, and it is not layout: it is KiCad s-expression
emission, symbol-library reading, pin geometry, field placement, text-box
measurement, obstacle matrices and the seven idiom templates. `gates/`,
`readability/`, `rules/` and `lock/` are criteria and refusals, which is
precisely the code `CLAUDE.md` says may not come from the producing agent.

**So "adopt an engine instead of writing our own" is not a 15k-line
substitution.** No tool surveyed here emits `.kicad_sch` through this
repository's symbol libraries, and none of them carries criteria. The honest
form of the question is **"could an off-the-shelf engine replace
`lib/schgen/elk/`, or supply geometry the way ELK now does?"** — and that is
what the rest of this document is about.

## 2. The one distinction that organises everything: PLACE or DRAW

The brief is right that this distinction matters enormously. It needs a third
column, because the interesting tools are in the middle.

| | Means | Tools |
| --- | --- | --- |
| **PLACES** | Give it connectivity; it decides where everything goes | ELK, netlistsvg, schematizer, Weave, circuit-synth, tscircuit, PMARS, WireBender |
| **SOLVES** | You supply **orientation and relative intent**; it solves coordinates | **Lcapy**, and ELK's `layerConstraint`/port-side options partially |
| **DRAWS** | You supply coordinates; it renders and possibly routes | **SchemDraw**, **circuitikz**, **kicad-sch-api**, **libavoid** |

**The SOLVES row is the row the brief's last question is asking about, and it
is nearly empty.** Exactly one mature tool sits in it, and this repository had
never looked at it.

## 3. The five things the prior art declares it did not cover

`generation-prior-art.md` section 8 states the omission plainly:

> *"**I did not research the human-places-it programmatic drawing tools** —
> Schemdraw, CircuiTikz, LaTeX-family drawing DSLs. They are position 2 by
> construction (the author specifies the arrangement) so they bear on drawing
> *mechanics* rather than on automatic layout, but **they were not examined**
> and may carry useful conventions."*

And the inventory of the six documents finds **no mention anywhere** of dagre,
d3-force-as-a-tool, or yFiles.

**This document's whole contribution is those gaps**, plus two tools the six
passes never named at all:

1. **Lcapy** — the only mature SOLVES-row tool found. Section 5.
2. **libavoid / Adaptagrams** — the only production-grade standalone
   orthogonal **hyperedge** router found. Section 8.
3. SchemDraw, circuitikz — section 5, and the a-priori classification holds.
4. dagre, d3-force, yFiles, OGDF-relative-to-yFiles — section 7, all ruled out.
5. tscircuit's PMARS/template layout, which postdates this repository's
   tscircuit decision — section 6.

## 4. ELK

### 4a. What the repository already measured, which is the record

**Do not restate these numbers from here.** `[PRIOR-ART]`, every one:

- ELK, driven on this repository's own four circuits, **completed 14 of 15
  inputs**, deterministically and in under a quarter second, with **zero**
  non-axis-aligned segments and **zero** connectivity defects — and was worse
  than the representative probe on bends-per-edge on **all fourteen** runs.
  `../schematic/elk-spike.md`
- ELK **raises** `java.lang.IllegalStateException: Invalid hitboxes for
  scanline constraint calculation` on a unity-gain op-amp self-loop, verbatim
  on elkjs 0.7.1 and 0.9.3 both. *"It is ELK, and it is not fixed upstream."*
  Registered as **G94**. `../schematic/elk-spike.md` section 4
- At declared-block scale the catastrophe goes away and the complaint does not:
  **6.1x fewer crossings and 4.6x less wire** than the whole circuit, while
  *"the component banks are still out of order, and the interface ports still
  land in the middle of the sheet."* `../schematic/elk-block-spike.md`
- Every spike figure was taken through **netlistsvg's pinned elkjs 0.7.1 and
  its skin**, which this generator does not use. The contamination is **G180**;
  `../schematic/m1-remeasurement.md` re-takes what it can.
- `edgeRouting` was swept directly on elkjs 0.12.0: `ORTHOGONAL` gave
  **0 non-axis-aligned segments**, and it is the layered default. The claim
  that ELK has no orthogonal routing for schematics is **false**, and the
  mechanism for the mistake is named: *"The routes live in
  `edge.sections[].bendPoints`, nowhere else. A caller that reads only
  `children[].x/y` and re-draws its own edges will observe `edgeRouting` to
  have 'no visible effect'."* `../schematic/generation-prior-art-second-pass.md`
  section 5

### 4b. What `layered` offers an electrical schematic, specifically

`[REPO]`, from ELK's own option reference:

| Need | Option | Verdict |
| --- | --- | --- |
| signal flow left-to-right | `org.eclipse.elk.direction` | **Yes.** Layering axis is the flow axis |
| power rails up, ground down | *none* | **No direct support.** See the trick below |
| pin on a named side of a symbol | `org.eclipse.elk.portConstraints` = `FIXED_SIDE`, with `org.eclipse.elk.port.side` | **Yes** |
| exact pin coordinates on a symbol | `portConstraints` = `FIXED_POS` | **Yes**, and this is what netlistsvg and this repository both use |
| orthogonal wires | `org.eclipse.elk.edgeRouting` = `ORTHOGONAL` | **Yes**, and it is the default |
| a net with 3+ pins drawn as one net with junction dots | hyperedge segments + `org.eclipse.elk.junctionPoints` | **Yes.** Edges sharing a port form one hyperedge and ELK returns junction points |
| pin a symbol to the first or last column | `org.eclipse.elk.layered.layering.layerConstraint` (`FIRST_SEPARATE` / `LAST_SEPARATE`), `layering.layerId` | **Yes**, and this repository already uses it for boundary ports |
| feedback loops / undirected circuits | `org.eclipse.elk.layered.cycleBreaking.strategy` | **Partial.** Cycles are broken, not honoured; full undirected support is not documented |
| label placement | `nodeLabels.placement`, `edgeLabels.placement`, `portLabels.placement` | Exists. **Measured separately and better** in `../schematic/text-handling-report.md` |
| **give ELK exact coordinates and have it route only** | *none* | **NO.** See 4d — this is the finding that matters most for the brief's last question |

**There are roughly 140 options on `layered`.** `[THIRD-PARTY]`, the ELK
tool-paper. That is the real shape of the problem: not that ELK lacks
mechanism, but that nothing tells you which combination draws a schematic.

### 4c. The one good recipe that exists, and it is already in this repository

**There is no published "recipe for schematics with ELK".** What exists is one
working configuration, and `../schematic/generation-prior-art-third-pass.md`
section 3.2 already read it out of netlistsvg's source and called it *"the most
directly transferable piece of engineering in this document"*. Its four parts
`[PRIOR-ART]`:

1. The skin declares per-pin `s:x`/`s:y` and `portConstraints: FIXED_POS` —
   **not** `FIXED_SIDE`.
2. **`direction=DOWN` makes the layering axis the SUPPLY axis, not the signal
   axis** — with VCC a source and GND a sink, *"the rail at the top and the
   ground at the bottom — the schematic convention — for free, as a consequence
   of the layering, with no rule encoding it."*
3. Two-terminal passives are "laterals" hung off the layered backbone
   (`genericsLaterals`), which is *"exactly the modelling problem a passive EQ
   poses."*
4. Drivers route to laterals to riders.

**Item 2 is the answer to "power rails up, ground down" and it is a trick, not
a feature** — and it costs the signal axis, because a graph has one layering
direction. This repository chose the other side of that trade: `lib/schgen/elk/options.ts`
sets `elk.direction = "RIGHT"` for signal flow, under plan decision **D4**,
and the file states its own cost — *"both spikes' numbers were taken under
`DOWN`"*.

One further data point, newer than the prior art and `[THIRD-PARTY]`:
[`Ferrite-Engineering/netcrux` issue 11](https://github.com/Ferrite-Engineering/netcrux/issues/11),
closed October 2026, reports an FPGA schematic viewer hitting exactly the
beginner's trap — emitting `port.side` hints **without** setting
`portConstraints`, so ELK treated the ports as `FREE` and ignored them, landing
both pins of a cell on the same face. Fix was `portConstraints: FIXED_SIDE`
per node, at *"approximately 10%"* more solve time. **Side hints without a
constraint value are silently discarded.**

### 4d. ELK has no "route only" mode, and this kills the obvious division of labour

`[REPO]`, and I consider this the single most actionable finding in this
document. ELK's option reference has **no absolute-position input**.
`org.eclipse.elk.position` is listed `<not defined>`; `portConstraints: FIXED_POS`
fixes pins **relative to their own node**, not nodes on the canvas. There is no
documented way to hand ELK a complete placement and ask it only for wires.

**So the architecture "the agent decides where every part goes and ELK routes
the wires" is not available in ELK.** If that division of labour is wanted,
ELK is the wrong library for the second half — see section 8.

### 4e. Who uses ELK for schematics in production

`[THIRD-PARTY]` / `[REPO]`, four found:

| user | domain |
| --- | --- |
| **Xilinx `RapidWright` NetlistBrowser** | FPGA logical netlist viewer, *"similar to what is found in Vivado"* |
| **netlistsvg** | yosys JSON to SVG; ships an analog skin |
| **`Nic30/d3-hwschematic`** | HDL schematic viewer, 123 stars |
| **`Ferrite-Engineering/netcrux`** | FPGA netlist schematic viewer |

**Every one of them is a digital or FPGA netlist VIEWER.** Not one is an analog
design tool, and not one produces a fabrication-bound artifact — they draw a
picture of a compiled netlist for inspection. **Weave is the sole exception**
(section 6), and it is a solo project.

**The honest answer to "who uses ELK for schematics in production" is: digital
netlist browsers, and nobody else.** That is weak support for analog audio
work, and the repository's own spikes are a better guide than this adoption
list.

## 5. The DRAWS row: SchemDraw, circuitikz, and the one SOLVES tool

### 5a. SchemDraw — DRAWS, beautifully, and places nothing

`[REPO]`, [github.com/cdelker/schemdraw](https://github.com/cdelker/schemdraw),
281 stars, MIT, 521 commits, version 0.23.

*"Circuit elements are added, one at a time, similar to how you might draw them
by hand, using Python methods."* The model is a turtle: the drawing keeps a
current position and direction, and *"the default placement of the next element
will start at the end of the previous element, going in the same direction."*
Named anchors let you attach relatively — `elm.Resistor().at(opamp.out)`, and
`Q.base` for a transistor.

**Verdict: pure DRAWS. There is no automatic layout and no routing at all**, and
no netlist input or KiCad output. The relative-anchor model is genuinely good
ergonomics for an agent — it removes arithmetic without removing judgement —
but **every arrangement decision is the caller's**, which is the entirety of
the hard problem. The prior art's a-priori classification was right.

### 5b. circuitikz — DRAWS; the LaTeX layer never places

`[THIRD-PARTY]`/`[REPO]`. circuitikz is a TikZ symbol library: you write
coordinates, it renders. It has no layout engine and no netlist input. The
output is the best-looking in this entire document and that is its only
argument.

**The question "do circuitikz generators place?" has one interesting answer,
and it is Lcapy.**

### 5c. Lcapy — the only SOLVES-row tool found, and the prior art never named it

`[REPO]`, [github.com/mph-/lcapy](https://github.com/mph-/lcapy) and
[lcapy.readthedocs.io/en/latest/schematics.html](https://lcapy.readthedocs.io/en/latest/schematics.html).
**305 stars, LGPL-2.1, Python, 5 736 commits, actively developed.** Primarily a
symbolic linear-circuit-analysis package built on SymPy; schematic drawing via
circuitikz is a first-class feature of it.

**What makes it the one tool in the SOLVES row.** The netlist carries drawing
hints after a semicolon:

```
V1 1 0; down
R1 1 2; left=2, i=I_1, v=V_{R_1}
```

The caller supplies **orientation per component** (up/down/left/right or an
angle) and **explicit wires** to *"link nodes of the same potential but with
different coordinates"*. Lcapy then computes the rest: *"The x and y positions
of nodes are computed independently using a graph algorithm"*, stretching —
*"increases (but never decreases)"* — minimum node distances to satisfy the
constraints.

The mechanism is stated and it is the whole of why this works:

> *"The drawing direction provides a constraint. For example, the nodes of
> components with a vertical orientation have the same x coordinate, whereas
> nodes of horizontal components have the same y coordinate."*

Component coverage is real: ground symbols, **power rails (`vcc`, `vdd`, `vee`,
`vss`)**, op-amps with mirroring, BJT/JFET/MOSFET, ICs, logic gates,
transformers. Output: `tex`, `schtex`, `pgf`, `png`, `svg`, `pdf`.

**Documented failure mode, and it is the right kind:** problems arise when
*"components have the wrong orientation since this makes the graph
inconsistent"*. **It refuses rather than guessing** — the caller's orientation
choices are over-constrained and the solver says so, which is the behaviour
`CLAUDE.md` asks for.

**Why it is nevertheless not a drop-in here:** no KiCad output, LGPL-2.1,
Python in a Bun/TypeScript repository, and it is a *drawing* path with no
connectivity round-trip verifier. **What it is, is a working existence proof of
the division of labour the brief's last question asks about** — agent decides
orientation and topology-of-the-drawing, library solves geometry — shipped,
documented and maintained. **This repository has never evaluated it and the six
prior passes never named it.** `[RAN]`: `grep -ril lcapy` over the repository
returns nothing.

## 6. PLACES-row tools, against what the repository already measured

### netlistsvg

`[REPO]`, [github.com/nturley/netlistsvg](https://github.com/nturley/netlistsvg),
**836 stars**, MIT, 245 commits, sole release v1.0.2 of December 2020.
*"We are getting close to the 1.0 release"* is still in the README.

**Analog output quality:** `[PRIOR-ART]` is better than anything I can add —
third pass section 3.3 found `common_emitter_full.svg` *"idiomatic"* with **0
wire crossings**, and section 3.5 found the 25-part Pultec-shaped probe
*"renders correctly and legibly … and is **not a good audio schematic**"*, with
*"Signal flow is not left to right."*

**Can it be driven from a KiCad netlist?** `[REPO]`: **not directly, and there
is no importer.** Input is yosys JSON, though *"The JSON doesn't need to be
produced by Yosys"* and JSON5 is accepted. Two costs the repository already
paid once: type names must match the skin's aliases (`r_v`, not `resistor_v`),
and — the load-bearing one — *"**The part's drawn orientation is an input, not
something the tool decides**"*, plus every port needs a direction the model
does not have. `generation-prior-art-third-pass.md` names **five** things the
converter had to invent.

**Maturity:** one release in six years, last push January 2024 per the prior
art's GitHub-API check. Used by Google's `pcbdl` for board-level drawings
`[THIRD-PARTY]`.

One `[THIRD-PARTY]` quality datapoint worth recording because it names the
failure in the brief's own terms — a 2026 blog on building schematics
programmatically: ELK *"scattered the three amplifier stages across the diagram
instead of arranging them in the conventional left-to-right column layout that
any textbook would use."* **That is a blog, not a measurement**, and it agrees
with the repository's own spike verdict.

### SKiDL `generate_schematic` / schematizer

`[REPO]` for the current shape; `[PRIOR-ART]` for the verdict, and the prior art
is decisive.

Schematic generation moved out of SKiDL into
[`devbisme/schematizer`](https://github.com/devbisme/schematizer) (MIT, Python,
**4 stars**) in SKiDL 3.0.0, October 2026. It is deliberately front-end
neutral: *"Turn a generic, hierarchical netlist (JSON) into a KiCad
schematic"*, `--tool kicad6` through `kicad10`, `--format kicad` for editable
`.kicad_sch` or `--format svg`. It accepts layout *hints* in the netlist —
`symtx` for mirror/rotate, `stub`/`netio` for net stubbing.

**Two disqualifying properties, both already established here by running it:**

1. **Nondeterminism, from its own README** `[REPO]`: *"Placement starts parts at
   random positions and the router breaks ties randomly, so the same netlist
   produces a different — equally valid — drawing on every run."* `[PRIOR-ART]`
   second pass section 2.2 measured it and found it worse than advertised —
   *"normalising UUIDs and sorting elements would not make the output stable —
   it would only hide the cases where it was not."* This repository's rule is
   that derived artifacts are regenerated and compared by content; a
   nondeterministic emitter cannot be.
2. **It does not route this repository's circuits.** `[PRIOR-ART]`,
   `generation-prior-art-circuit-families.md`: `--mode normal` scored **0 of 3
   on all four** repo circuits, including `opamp-buffer` at nine parts. The
   controlled variable was isolated: *"Max net degree <= 4: 12/12 routed. Max
   net degree >= 5: 17/44"*, and *"**A shared ground net of degree 6 is
   enough**, and every circuit in `circuits/` has one."*

**The author's own verdict**, `[THIRD-PARTY]` from discussion 125, after
*"about 21 months of effort"*: the output *"will still need a lot of manual
cleanup"*, and the line worth keeping — *"you can't route your way out of a bad
placement."* The community's destination was labels instead of wires,
*"deliberately trading appearance for reliability"*. `--mode labels` is the one
reproducible mode and it draws **no inter-part wires at all**.

### Weave

`[PAPER-ABS]` + `[REPO]`; `[PRIOR-ART]` for the verdict.

[arXiv:2607.03835](https://arxiv.org/abs/2607.03835), Senol Gulgonul, July 2026,
*"Weave: Verified Netlist-to-Schematic Conversion via Layered Graph Layout"*.
SPICE netlist to LTspice `.asc`, deterministic, layered/Sugiyama via elkjs,
single dependency-free file, 5 093 embedded LTspice symbols. Round-trip
certificate: re-parse the output, compare net partitions, *"reported as correct
only when the two partitions are identical, giving a binary correctness
certificate rather than a similarity score."* **100% verified on the
117-circuit Circuits-LTSpice set; 88.4% on 3 460 Analog Devices demo
circuits.** [github.com/senolgulgonul/weave](https://github.com/senolgulgonul/weave),
**14 stars**, 5 forks, solo author, MIT in `cli/package.json` (the prior art
found **no `LICENSE` file**).

**The certificate is about connectivity, and the paper says so.** `[PRIOR-ART]`
first pass: *"It explicitly declines to measure readability"* — it *"does not
yet report the crossing, bend, or visual-similarity metrics"*. The repository
page is candid in the same direction `[REPO]`: results are *"never wrong, only
plainer"* under fallback modes, and *"Long value texts can occasionally overlap
a nearby wire or symbol in crowded regions; this is cosmetic, does not affect
connectivity."* **Label-over-wire is exactly the defect class this repository
has a whole report about.**

**The two findings that settle it, both `[PRIOR-ART]` and both from running it
here:**

- *"**A rotary selector cannot be represented in Weave's input at all.**"*
  SPICE has no multi-position selector. *"**Weave drew an excellent picture of
  a circuit that is not the Pultec**"*, and the substitution is invisible to
  the certificate. `preamp-lab` loses **15 of 32 authored parts**.
- Its MATCH on this repository's active circuits is bought by climbing a
  safe-mode ladder: *"Mode 3 disables `noHang` … and `noFar` … **Those are
  precisely the patterns that make decoupling caps and feedback networks look
  like a schematic. weave buys its MATCH on our circuits by turning off its
  schematic sense.**"*

**Weave is nevertheless the best single piece of prior art in the field**, for
one reason the brief should not miss: it is the only tool found that pairs a
layout engine with a **binary, falsifiable correctness certificate**. That idea
transfers even though the tool does not.

### circuit-synth

`[REPO]`/`[THIRD-PARTY]`. Python to a complete KiCad project; emits placed
symbols and places automatically; 0.12.1 released January 2026; MIT. `[PRIOR-ART]`:
*"No automated readability, aesthetics or layout-quality check is documented"*
and *"no layout quality measure at all"*. A `[THIRD-PARTY]` practitioner
verdict found this pass: *"auto-placement is the weak link in circuit-synth
(topologically correct, not pretty)"*. **Never cloned or run by this repository
in any pass**, this one included.

Notable: the project ships a **schematic quality scoring tool** that *"plots the
schematic to SVG and measures metrics like passive to pin distances, text
overlaps, and wire crossings"* `[THIRD-PARTY]`. If true, that is a second
independent instance of the measure-the-drawing idea, and it is worth a look
for its metric list alone — but it is unverified.

### tscircuit, and the PMARS template layout that postdates the decision

tscircuit was declined here on 2026-09-21
(`../decisions/2026-09-21-why-not-tscircuit.md`) because a routing failure is
silently re-rendered as a net label. **Nothing found in this pass contradicts
that**, and the SKiDL community reaching the same labels-instead-of-wires
destination deliberately strengthens it.

What is new: tscircuit's automatic schematic layout `[REPO]` is *"turned on by
default, using a pattern matching and packing algorithm"*, chooses among row
layout / column layout / *"Central LR bug with ascending columns"*, and is
*"in beta"*. The more ambitious line was **PMARS** —
[`tscircuit/schematic-match-adapt`](https://github.com/tscircuit/schematic-match-adapt),
npm `@tscircuit/pmars-layout`: *"Partition the input schematic, Match
partitions with close, pregenerated templates, Adapt the template until the
netlist matches the partition, Refine the layout to fix overlapping or clutter
caused by adaptation, Stitch the laid-out partitions together."*

**That is this repository's declared architecture — templates plus a general
engine, per block, composed onto a sheet — arrived at independently.** And
`[REPO]`: **4 stars, archived read-only since 4 August 2025.** Read it as
convergent-design evidence that the decomposition is the right one, and as a
caution that somebody else abandoned the template-matching half.

### The academic line, and why most of it is a category error here

`[PAPER-ABS]` throughout. The honest summary is that **almost none of it ships
usable software for drawing board-level analog schematics.**

- **SchGen** ([arXiv:2605.30345](https://arxiv.org/abs/2605.30345), Luo, Ma,
  Zhang, Qiu, May 2026) — an LLM generating PCB schematics through a
  *"semantically grounded code representation that encodes schematic editing
  primitives with **relative placement and pin-name-based wiring**,
  transforming a geometry-driven generation problem into a semantics-driven
  matching task amenable to LLMs."* **The representation idea is the valuable
  part** and it agrees with SchemDraw's anchors and Lcapy's hints: *do not ask
  a model for coordinates*. But `[PRIOR-ART]` second pass section 4 already
  read the published code and found the paper's "Spatial Violation" metric is
  **not implemented anywhere in the evaluation path**.
- **EEschematic** ([arXiv:2510.17002](https://arxiv.org/abs/2510.17002), Liu
  and Chitnis, October 2025) — *"Multimodal-LLM Based AI Agent for Schematic
  Generation of Analog Circuit"*: SPICE netlist to a human-editable schematic
  using *"six analog substructure examples for few-shot placement and a Visual
  Chain-of-Thought (VCoT) strategy to iteratively refine placement and
  wiring"* — the model looks at the render and revises. **This is the closest
  published thing to "agent supplies the placement".** Evaluated on three
  circuits (CMOS inverter, 5T-OTA, telescopic cascode) — *"Three to roughly a
  dozen devices"* — and I could not establish a code release or a quantitative
  readability metric. `[PRIOR-ART]` registered that same gap and it remains
  open.
- **CircuitLM** ([alphaxiv 2601.04505](https://www.alphaxiv.org/abs/2601.04505v2))
  — multi-agent LLM to CircuitJSON with `(x, y)` placement, rendered by *"a
  force-directed algorithm to position components and a Manhattan-style routing
  strategy"*. Force-directed placement for schematics is what SKiDL spent 21
  months on. **Treat with suspicion.**
- **ALIGN, MAGICAL, AnalogGenie and the analog-layout-synthesis literature** —
  these produce **GDSII silicon layout** from netlists, not schematic drawings.
  `[PRIOR-ART]` already warns that reading this literature as schematic work is
  a category error. It is.

## 7. Graphviz, dagre, d3-force, yFiles, OGDF: is any of them used for schematics?

**No, with one qualified exception.**

| Tool | Finding | Mark |
| --- | --- | --- |
| **Graphviz / dot** | **Not used for schematics, and known unsuitable.** `splines=ortho` is the only orthogonal mode and practitioners report edges not reaching node centres, and broken SVG/PDF/PNG rendering. A `workcraft` issue enumerates what dot lacks for circuits — *"positioning components with inputs on the left and outputs on the right, ranking gates into layers, neatly positioning wire forks through junction points, and keeping feedback loops short"*. **Graphviz has no port constraints and no hyperedge junctions.** In EDA its role is yosys `show`, which `[PRIOR-ART]` correctly calls *"a graphviz dot dump for debugging. **Not a schematic.**"* | `[THIRD-PARTY]` |
| **dagre** | **Ruled out decisively. Unmaintained — development stopped in 2018, repository archived.** *"Multi-segment edge routes are curved instead of orthogonal, which can result in unaesthetic squiggly lines."* **No ports, no orthogonal routing, no hyperedges, no nested containers.** It is a strict subset of ELK's layered with none of the schematic-relevant mechanism. Community forks exist (`hikerpig/dagre-layout`, `@unovis/dagre-layout`) and change none of this. | `[THIRD-PARTY]` |
| **d3-force** | **Not a candidate.** Force-directed placement produces non-orthogonal, nondeterministic, unsnappable geometry. Its one appearance in the literature that matters is as a *warning*: `[PRIOR-ART]` records the Dwyer 2009 study where *"participants were slower and less accurate finding cliques in an **orthogonal** layout than a force-directed one despite the orthogonal layout having fewer crossings"* — which cuts against crossings-as-the-metric, not for force layout as a schematic engine. SKiDL's 21 months of force-directed placement is the empirical answer. | `[THIRD-PARTY]` |
| **yFiles** | **No named EDA user found.** Its orthogonal layout is genuinely sophisticated and the marketing says it is *"perfect for UML, circuit diagrams, and technical visualizations"* — but that sentence is the entirety of the circuit claim I could find, and a vendor sentence listing circuit diagrams third behind UML is not an EDA deployment. **Commercial, per-seat licensed, closed source.** For a repository that regenerates artifacts in CI, a closed commercial layout engine is a poor fit regardless of quality. | `[VENDOR]` |
| **OGDF** | `[PRIOR-ART]` read this one properly and the blocker is mathematical, not practical: *"Tamassia's algorithm requires a planar graph G of maximal node degree four … **pure orthogonal drawings in which the nodes are mapped to points in the grid are only admissible for this class of planar graphs.**"* **Every circuit in `circuits/` exceeds degree four on at least one net.** `KandinskyLayout`, which lifts the degree bound, **is not in the repository** (0 of 2 136 paths). And **OGDF is GPL v2/v3** — a hard licence blocker. | `[PRIOR-ART]` |

## 8. The brief's real question: a tool where the agent places and the library draws

This is where the useful answer is, and the prior art's finding on it is
negative but incomplete. `[PRIOR-ART]`, `generation-prior-art.md`:

> *"**None of them that I examined contains a placement algorithm, a collision
> check, or any layout quality validation.** `circuit-synth/mcp-kicad-sch-api`
> **takes coordinates and does as it is told**."*

and the practitioner limit it quotes, which is the honest statement of the
division of labour:

> *"**A language model is strong at judgement… It has no way to measure whether
> a trace clears a pad by 0.15 mm.**"*

The inventory also confirms: **no document in the six evaluates an architecture
where an agent supplies placement and a library does only routing and
drawing.** So the three candidates below are the contribution of this pass.

### 8a. libavoid / Adaptagrams — the strongest find in this document

`[REPO]`, [github.com/mjwybrow/adaptagrams](https://github.com/mjwybrow/adaptagrams)
and [adaptagrams.org/documentation/libavoid.html](https://www.adaptagrams.org/documentation/libavoid.html).
**This repository has never named it.** `[RAN]`: `grep -ril "libavoid\|adaptagrams"`
over the repository returns nothing.

**What it is:** *"a cross-platform C++ library providing fast, object-avoiding
orthogonal and polyline connector routing for use in interactive diagram
editors."* It is **routing only. It does no placement.** You give it shapes at
coordinates you chose and connection endpoints; it returns orthogonal routes.

**Why it is the right second half for an agent-places architecture:**

- **Orthogonal hyperedge routing with junction points** — the actual problem a
  net poses. `HyperedgeRerouter` registers a hyperedge for rerouting
  *"improving the placement of their junctions and connector paths"*;
  `JunctionRef` is *"a fixed or free-floating point that connectors can be
  attached to"*; `improveHyperedgeRoutesMovingJunctions` lets libavoid move
  junctions and report `JunctionRef::recommendedPosition()`. **A net with six
  pins is a first-class object, not six edges.** The published method is
  Wybrow, Marriott and Stuckey, *Orthogonal Hyperedge Routing*, Diagrams 2012.
- **Fixed shape positions are the input, not an output.** It is the exact
  inverse of ELK's constraint (section 4d).
- **Nudging** separates parallel segments and ports so wires do not overlap.
- Shapes are obstacles: routes go around symbol bodies rather than through
  them.

**Maturity, and it is real `[THIRD-PARTY]`:** used in production by **JointJS**
(as `@joint/router-avoid`), **draw.io** and **Sprotty**; historically the
engine behind Inkscape's connector tool and the Dunnart editor; the docs state
it *"has been extended to support orthogonal object-avoiding hyperedge routing
in commercial diagramming tools for circuit diagrams"*.

**It runs in this repository's language.** `[REPO]`
[`Aksem/libavoid-js`](https://github.com/Aksem/libavoid-js) is an Emscripten/WASM
port, 46 stars, **LGPL-2.1**, and — the part that matters for a Bun repo —
*"The library works in both webbrowser and node.js environments."* Also a Rust
option, `ortho-router` (*"no dependencies, no unsafe"*), for obstacle-avoiding
orthogonal routing without hyperedges.

**Flags, and they are substantive.** `[REPO]`: the GitHub page for `libavoid-js`
does **not** document its API surface — *"Library API Documentation is in
`api_docs_build` directory"* — so I could **not** verify from a page I read
that the JS port exposes `HyperedgeRerouter`, junction positions, or
pin-precise connection-end anchoring, which are the three features that make it
worth having. **That is the single most important unverified claim in this
document and it should be settled by running it before anything is planned on
it.** Licence is LGPL-2.1, not MIT. And a router is not a schematic: it knows
nothing about grid snapping to 1.27 mm, symbol pin geometry, or labels.

### 8b. kicad-sch-api — the drawing half, for KiCad, already agent-facing

`[REPO]`, [github.com/circuit-synth/kicad-sch-api](https://github.com/circuit-synth/kicad-sch-api),
**57 stars**, 19 forks, MIT, Python, 275 commits, pypi `kicad-sch-api`.
`[PRIOR-ART]` already profiled this at 55 stars and the picture is unchanged:

*"The library operates at the coordinate level — **you supply the positions**.
It doesn't auto-place components."* Writes byte-exact `.kicad_sch`
(*"output matches KiCad's native formatting byte-for-byte"*, 70+ tests against
reference files). It **does** ship routing: *"Manhattan-style orthogonal
routing with basic obstacle avoidance"*, `add_wire_between_pins()`,
`auto_route_pins()` — though `[PRIOR-ART]` notes *"The obstacle-avoidance
algorithm is not documented."* Ships an **MCP server with 15 tools**. Stated
limits: KiCad 7/8 (**not 9 or 10**), global-label connectivity incomplete, slow
above ~1 000 components.

**And it is the one place anybody has written down the rules an agent needs.**
`[REPO]`, its issue 135 (closed November 2025) packages a 571-line
`generic_placement_advice.md` derived from iterative testing with AI agents:
1.27 mm grid alignment; **lower Y is TOP, higher Y is BOTTOM**; `rotation=270`
for a vertical LED so the cathode points right; *"calculate center first, work
backwards"*; derive every wire coordinate from `list_component_pins()` rather
than arithmetic; 40–60 mm branch spacing; junction and label rules; a
pre-render checklist.

**This is the brief's division of labour, shipped.** `[PRIOR-ART]` already
registered it as an owed gap. **The thing to note is what it is NOT:** a
hand-built empirical rule file is a rule file, and under `CLAUDE.md` an agent
may not author the criteria for the artifact it produces. Adopting someone
else's rule file is a legitimate channel for criteria **precisely because
somebody else wrote it** — that is worth more than the library.

### 8c. WireBender — plausible shape, far too new

`[REPO]`, [github.com/dev-lab/WireBender](https://github.com/dev-lab/WireBender).
C++/WASM: *"Initial Component Placement"*, *"Automatic orthogonal hyperedge
wire routing with junction dot generation"*, *"Statistical auto-detection of
power and ground buses"*, incremental re-routing. On paper that is the right
feature list — hyperedge routing plus rail classification is what a schematic
needs.

**Flag loudly: 0 stars, 1 watcher, 22 commits, AGPLv3-or-commercial, no npm
package, no analog claim, and the documentation shows only the auto-placement
path, so I could not establish that you can supply your own positions and ask
for routing only.** It is a brand-new solo library under a copyleft licence
that would infect this repository. **Recorded so a later reader knows it
exists. Nothing should be built on it.**

## 9. What this document does not establish

In the spirit of the prior art's own sections of this name:

- **Nothing here was run.** Every claim is a page read through a summariser.
  The two `[RAN]` figures are `wc` and `grep` over this repository.
- **Whether `libavoid-js` exposes hyperedge routing, junction positions and
  pin-precise anchoring is UNVERIFIED**, and it is the hinge of section 8a.
  Settling it costs one afternoon: install the package, route a six-pin net
  between fixed shapes, look at the junctions.
- **Whether Lcapy's constraint solver scales to a 25-part passive EQ with a
  rotary bank is unknown.** Its documented failure mode is an inconsistent
  graph, and a capacitor bank off one rotary wiper is exactly the shape that
  would over-constrain it. Unmeasured.
- **I did not evaluate output quality for analog by looking at drawings.**
  Every quality judgement in this document is either quoted from the prior art
  (which did render things) or from somebody's blog. `CLAUDE.md`: *"Look at the
  output, not only the tests… Render it, print it, read it."* This pass did
  not.
- **No tool here replaces `lib/schgen/render/`, `gates/`, `readability/`,
  `rules/` or `lock/`** — 15 570 of the 21 726 lines. The adoption question is
  about geometry, and section 1 is the honest statement of its scope.
- **Commercial tools remain entirely unverified**, as the prior art already
  said: Flux, CELUS, JITX, Quilter, Concept Engineering's Nlview, yFiles.
- **No threshold exists for any readability measure.** `[PRIOR-ART]`, **G71**:
  *"no published source anywhere states an acceptable number of wire crossings,
  bends or wire length"*. **Every "quality" comparison in this document is
  therefore ordinal at best**, including the ones I quoted approvingly.

## 10. Sources

ELK and its ecosystem:
[ELK Layered reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) ·
[Port Constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html) ·
[Junction Points](https://eclipse.dev/elk/reference/options/org-eclipse-elk-junctionPoints.html) ·
[The Eclipse Layout Kernel (paper)](https://arxiv.org/pdf/2311.00533) ·
[elkjs](https://github.com/kieler/elkjs) ·
[netcrux issue 11 — FIXED_SIDE](https://github.com/Ferrite-Engineering/netcrux/issues/11) ·
[RapidWright NetlistBrowser PR](https://github.com/Xilinx/RapidWright/pull/1322) ·
[d3-hwschematic](https://github.com/Nic30/d3-hwschematic)

PLACES-row tools:
[netlistsvg](https://github.com/nturley/netlistsvg) ·
[pcbdl on netlistsvg](https://google.github.io/pcbdl/doc/_build/html/netlistsvg.html) ·
[SKiDL](https://github.com/devbisme/skidl) ·
[schematizer](https://github.com/devbisme/schematizer) ·
[SKiDL discussion 125](https://github.com/devbisme/skidl/discussions/125) ·
[Weave (paper)](https://arxiv.org/abs/2607.03835) ·
[Weave (repo)](https://github.com/senolgulgonul/weave) ·
[circuit-synth](https://circuit-synth.readthedocs.io/en/latest/) ·
[tscircuit automatic schematic layout](https://docs.tscircuit.com/guides/tscircuit-essentials/automatic-schematic-layout) ·
[schematic-match-adapt / PMARS](https://github.com/tscircuit/schematic-match-adapt)

DRAWS and SOLVES row:
[SchemDraw](https://github.com/cdelker/schemdraw) ·
[SchemDraw placement docs](https://schemdraw.readthedocs.io/en/latest/usage/placement.html) ·
[Lcapy](https://github.com/mph-/lcapy) ·
[Lcapy schematics](https://lcapy.readthedocs.io/en/latest/schematics.html) ·
[kicad-sch-api](https://github.com/circuit-synth/kicad-sch-api) ·
[kicad-sch-api issue 135](https://github.com/circuit-synth/kicad-sch-api/issues/135) ·
[kicad-skip](https://github.com/psychogenic/kicad-skip) ·
[kiutils](https://pypi.org/project/kiutils)

Routing libraries:
[Adaptagrams](https://github.com/mjwybrow/adaptagrams) ·
[libavoid overview](https://www.adaptagrams.org/documentation/libavoid.html) ·
[Orthogonal Hyperedge Routing (paper)](https://users.monash.edu/~mwybrow/papers/wybrow-diagrams-2012.pdf) ·
[libavoid-js](https://github.com/Aksem/libavoid-js) ·
[JointJS libavoid demo](https://www.jointjs.com/demos/libavoid-standalone-link-routing) ·
[WireBender](https://github.com/dev-lab/WireBender) ·
[ortho-router (Rust)](https://docs.rs/ortho-router/latest/ortho_router/)

Ruled out:
[dagre replacement discussion](https://github.com/dagrejs/dagre/issues/188) ·
[Graphviz for circuit layout (workcraft)](https://github.com/workcraft/workcraft/issues/736) ·
[Graphviz orthogonal edges issue](https://gitlab.com/graphviz/graphviz/-/work_items/352) ·
[yFiles orthogonal layout](https://www.yfiles.com/the-yfiles-sdk/features/automatic-layouts/orthogonal-layout) ·
[OGDF layout](https://ogdf.github.io/doc/ogdf/ex-layout.html)

Academic:
[SchGen](https://arxiv.org/abs/2605.30345) ·
[EEschematic](https://arxiv.org/abs/2510.17002) ·
[CircuitLM](https://www.alphaxiv.org/abs/2601.04505v2) ·
[ALIGN](https://align-analoglayout.github.io/ALIGN-public/)
