# Prior art: programmatic and agent-generated schematics

Research pass, 2026-10-19. Commissioned before deciding whether to port one
particular schematic generator into this repository. **This document gathers
evidence. It makes no recommendation about that port.**

## How to read the evidence marks

Every item carries one. They are not decoration: the difference between a
vendor page and a repository is the difference between a claim and a thing.

| Mark | Means |
| --- | --- |
| `[REPO]` | I read the project's own repository page or README and am reporting what it says about itself, including its licence and commit/star counts |
| `[PAPER-FULL]` | I read the paper's full text (HTML) and am quoting its own method and numbers |
| `[PAPER-ABS]` | I read only an abstract, a landing page, or a partial PDF extraction. Method and metric details are **not** established |
| `[VENDOR]` | A marketing or product page, or press coverage of one. A capability claim, nothing more |
| `[THIRD-PARTY]` | Someone else's survey or review. Useful for leads; its verdicts are its own, not mine |
| `[PAYWALLED]` | Identified but not readable. Named so a later reader knows it exists |

**A limitation that applies to everything below.** Every web page and PDF was
fetched through a summarising tool, not read raw by me. I did not clone a single
repository, execute a single generator, or render a single generated schematic.
So `[REPO]` means "the README says", not "I ran it". Nothing here has been
verified the way this repository's practices mean by verified. **Every number,
licence and capability claim in this document is re-checkable and should be
re-checked before anything is built on it.**

## 1. The question that organises this: where does the human-readable form live?

The brief for this research originally asked, of each tool, "does it emit a
drawn schematic, or only a netlist?" — on a hypothesis that much of the field
skips the schematic. The owner rejected the framing mid-research:

> *"In what world would an entire industry willingly forego human-readable
> schematics in favor of a purely machine-centric netlist-to-pcb pipeline with
> no human oversight? I don't ask you to write in assembly. Why would I ask you
> to write in netlists?"*

**He is right, and the research bears him out.** The schematic is the source;
the netlist is the compiled artifact. No pipeline I found abandons a readable
source representation. What varies is *which* representation is the source, and
the honest question is where the human reviews the circuit before it is built.

Four positions are possible. Here is where each tool actually sits.

| Position | Tools found here |
| --- | --- |
| **1. The tool draws a readable schematic from a higher-level input** | SKiDL `generate_schematic` / schematizer, circuit-synth, Weave, SchGen, EEschematic, netlistsvg, d3-hwschematic, tscircuit, Flux (claimed), CELUS (claimed) |
| **2. A human draws it; the tool consumes it** | Quilter, FreeRouting, every traditional EDA flow — and this repository, for the Pultec |
| **3. The CODE is the human-readable source; the schematic is a derived VIEW** | atopile, JITX, Diode Computers, and the self-description of circuit-synth and SKiDL |
| **4. No readable representation at any stage** | **Essentially empty.** See below |

### Position 4 is empty, and the strongest evidence is the opposite literature

I did not find a pipeline that proposes going from requirements to fabrication
with nothing a human can read. The nearest candidates dissolve on inspection:

- **Quilter** does PCB layout only and emits no schematic — but it *consumes*
  one a human drew. It is position 2, not position 4. `[VENDOR]`
- **atopile** had no schematic output for a period (and still only via a KiCad 5
  downgrade, per one account) — but its code is explicitly the source of truth
  and it has since built a schematic *viewer*. Position 3. `[VENDOR]`
- **The large LLM-EDA literature that stops at netlists** — AnalogGenie,
  AnalogXpert, AutoCircuit-RL, TopoSizing, LOADBench, AMSnet-KG, NetlistBench,
  AaLLM, EXPLORE — is doing analog *topology synthesis and sizing* for
  integrated circuits. It never claimed to draw anything. In that world the
  human-readable artifact is a schematic drawn separately by the designer, and
  these papers operate one level below it. Reading their silence as abandonment
  would be a category error. `[PAPER-ABS]` for all of these; I identified them
  but did not read them, because they are not about drawing.

**The decisive counter-evidence is the existence of the inverse problem as an
active research area.** There is a whole parallel literature on converting
schematic *images* to netlists — AMSNet, Image2Net, SINA ("A Fully Automated
Circuit Schematic Image to Netlist Generator"), and the PCB reverse-engineering
line that produced the AEM metric below. A field only builds image-to-netlist
parsers because the schematic is so firmly *the* human artifact that machine
pipelines must reach up to it. `[PAPER-ABS]`

### What position-3 tools argue, and whether a schematic survives anyway

This matters because position 3 is a coherent claim — code as a *higher*-level
language than the schematic — not a dodge.

- **atopile.** "By replacing the point and click schematic interface with code,
  atopile introduces software development workflows like reuse, validation and
  automation" — the argument is reuse, version control and parametric intent
  capture, things a drawing cannot carry. **And it built the drawing back
  anyway:** a viewer called Prism "draws the schematic, power tree, system view
  and pinout straight from the code", and `Inspect → Schematic → Open in KiCad`
  is reported to write a real `.kicad_sch`. `[VENDOR]`, and weakly so — a direct
  fetch of `atopile.io/enterprise` returned only the page title, so these quotes
  come from search-result extracts of vendor pages and third-party tutorials,
  not from a page I read end to end.
- **JITX.** "Your input is like high level code that reads like engineering
  requirements, and the output is like a detailed schematic level design that's
  actually rigorously checked for correctness… A code snippet represents your
  intent, making it more informative than traditional schematics alone." The
  build emits `schematic.design` alongside `physical-layout.design`. `[VENDOR]`
  for the argument; `[REPO]`-equivalent (docs page) for the artifact's
  existence. **I could not establish from the docs page I read whether
  `schematic.design` renders as a sheet a human reads, or is an internal
  structure.** That gap matters and I am not papering over it.
- **Diode Computers.** Reported to use LLMs to read datasheets and emit atopile
  modules — so it inherits atopile's position. `[THIRD-PARTY]`, a listicle.
  Weak.

**The pattern across position 3 is that the schematic comes back as a generated
view for review.** Nobody argues the drawing is unnecessary; they argue it
should not be the *editable* source. That is a different claim, and it is the
same claim this repository makes for circuits an agent designs — the model is
authoritative, the schematic is derived.

## 2. Agent and LLM approaches to schematic generation

Ordered by how directly they bear on generating a readable drawing.

### SchGen — LLM emits Python that emits KiCad, with a code-checkable layout metric

arXiv 2605.30345, 28 May 2026. Luo (UCSD), Ma (Microsoft Research Asia), Zhang,
Qiu. `[PAPER-FULL]` via HTML; `[REPO]` for the repository.

- **Emits a drawn schematic: yes, `.kicad_sch`.** The LLM emits Python code
  which executes to produce the file.
- **How it dodges the geometry problem:** a "semantic-grounded code
  representation" — *relative* coordinates offset from anchor components rather
  than absolute positions, and wiring by pin name (`VCC`, `TXD`) rather than by
  coordinate, with a `write_out_all_wires()` helper doing basic routing. The
  stated purpose is to reduce the spatial-reasoning burden on the model.
- **Evaluation — the most relevant finding in this document.** Four families:
  *Valid Circuits* (passes Python execution and ERC); **Spatial Violation
  (normalised overlaps among symbols, labels and wires)**; *Netlist Accuracy*
  (Jaccard, precision, recall over symbol-pin nodes); *Expert Verification*
  (symbol error, connection error, functional correctness).
- **Spatial Violation is a code-computable layout quality measure published by a
  major lab**, and it is close to the kind of thing a generator could be graded
  by. It is also crude: overlap only. It says nothing about crossings, bends,
  signal flow or idiom.
- Dataset: 2,105 KiCad schematics, 1,390 unique designs, sourced partly from
  SparkFun open hardware (CC BY-SA 4.0); augmented to 8,420 training samples;
  500-sample test set; generalisation tested on 988 unseen GitHub designs.
- Code: MIT, `github.com/microsoft/SchGen`. **39 stars, 3 commits on main.**
  Dataset hosted separately on Hugging Face (`microsoft/SchGen_dataset`).
  **The README does not document the evaluation code** — whether the Spatial
  Violation implementation is actually in the repository is unestablished and is
  the single most valuable thing to check next.
- Stated limits: structured SparkFun-style designs; no advanced PCB
  constraints; scaling limited by dataset scarcity and model capability; "human
  review remains necessary".

### Weave — not an LLM at all, and it verifies

arXiv 2607.03835, 4 July 2026. Senol Gulgonul, Ostim Technical University.
`[PAPER-FULL]` via HTML.

- **Emits a drawn schematic: yes, LTspice `.asc`.** Input is a SPICE netlist.
- **Deterministic. No model, no GPU, no training.** Pipeline: parse netlist →
  classify nets (ground / supply / signal) → layered (Sugiyama) layout via
  **elkjs** with orthogonal routing → analog placement patterns (feedback,
  divider legs, shunts) → grid snap and route → emit → **round-trip verify**.
- **The verification idea is directly transplantable:** re-parse the emitted
  schematic back into a netlist by "unioning wire endpoints, flags, and symbol
  pins that share coordinates into nets", and compare net for net against the
  input. The result is **binary — MATCH or partial** — not a similarity score.
  A "safe-mode ladder" progressively disables placement patterns and keeps the
  first result that verifies.
- Results: 100% compilation and 100% verified MATCH on Circuits-LTSpice (117
  circuits, the same set Schemato used); 88.4% verified MATCH on 3,460 Analog
  Devices LTspice demo circuits (mean 14.4 elements, max 138), 8.2% partial,
  3.3% errors.
- **It explicitly declines to measure readability**, and says so: the system
  prioritises verified connectivity and "does not yet report the crossing, bend,
  or visual-similarity metrics" that learning-based approaches emphasise. It
  rejects graph-edit distance and MSSIM as measuring aesthetics rather than
  correctness.
- Known failure classes, named: dense multi-pin power modules with many
  repeated nets; deep cascades stretched into long chains by layered layout
  ("correct but not compact"); symbols absent from its 5,093-symbol table.
- Code: `github.com/senolgulgonul/weave`, paper CC BY 4.0. Not inspected.

**Weave and SchGen between them split the problem the way this project has been
splitting it:** Weave grades *correctness* by a check that can fail, and admits
it does not grade readability. SchGen grades a thin slice of readability
(overlap) by code. Neither grades readability in the sense of "an engineer can
follow the signal".

### Schemato — the baseline Weave beat, and where the metrics vocabulary comes from

arXiv 2411.13899, Nov 2024, Sony AI (Servadei et al.). `[PAPER-ABS]` plus
Weave's independent restatement of its numbers.

- Fine-tuned LLM, netlist → LTspice `.asc`. Emits a drawing.
- **Metrics: compilation success rate (CSR), graph edit distance (GED), mean
  structural similarity index (MSSIM), BLEU.** Reported 76% CSR against ~63% for
  general LLMs, with GED and MSSIM scaled by CSR.
- Reported limit, in its own words as relayed: "for circuits with more than 5
  components, Schemato struggles to generate schematics with accurate
  connectivity."
- **Note what these metrics are:** GED and MSSIM compare the output to a
  *reference drawing*. They measure resemblance to a known-good answer, not
  readability of a novel one. For a project generating schematics for which no
  reference drawing exists, they are unusable as stated.

### EEschematic — multimodal LLM, analog, small

arXiv 2510.17002, Oct 2025. `[PAPER-ABS]` plus a partial PDF extraction.

- SPICE netlist → schematic diagram. Emits a drawing.
- Method: **six analog substructure examples for few-shot placement**, plus a
  **Visual Chain-of-Thought** loop that iteratively refines placement and
  wiring — the model looks at the rendered result and revises. Initial wiring
  comes from an algorithm reconstructing connectivity from the netlist; the
  model refines it.
- Tested on a CMOS inverter, a 5-transistor OTA, and a telescopic cascode
  amplifier. **Three to roughly a dozen devices.**
- **Evaluation: I could not establish that it uses any quantitative readability
  metric.** Two fetch attempts (abstract and PDF) found visual comparison
  against reference designs and no named metric. The paper may contain one in a
  section the extraction missed. Treat as unestablished, not as absent.
- No code link found.

### CircuitLM — found, barely established

arXiv 2601.04505. Al Hasan, Raiyan, Alvee, Sadik. `[PAPER-ABS]`, and a poor one
— the PDF extraction yielded almost nothing.

- Multi-agent LLM, natural language → circuit schematic, with "agent-enforced
  rules and criteria for automated verification".
- One relayed detail worth chasing: "routing heuristics prioritize shorter
  paths, fewer bends, and minimal crossings to reduce visual clutter and improve
  schematic clarity."
- **Output format, metrics, test set and code release: all unestablished.**
  I am listing it because it exists and is on-topic, not because I learned
  anything reliable about it.

### Reinforcement learning on schematic aesthetics — the oldest thread, and the one with real metrics

- **Hsu & Lin, MLCAD 2022** (ACM `10.1145/3551901.3556486`), "Automatic Analog
  Schematic Diagram Generation based on Building Block Classification and
  Reinforcement Learning". Treats schematic placement as an RL problem
  **rewarding aesthetic quality directly: crossings, bends, wire length**, with
  building-block classification and device levelling. Reports fewer bends and
  crossings and a higher "building block compliance rate" than existing methods
  and modern tools. `[PAPER-ABS]`; a third-party review states it does not
  exceed roughly 40 components.
- **Yang et al., AEM-PCB Reverser**, IEEE TCAD (IEEE `10349696`), "Circuit
  Schematic Generation in PCB Reverse Engineering Using Reinforcement Learning
  Based on Aesthetic Evaluation Metric". Introduces an **Aesthetic Evaluation
  Metric (AEM)** for PCB schematics and trains an RL agent to maximise it.
  AEM is described as considering "component placement specifications, neatness,
  routing complexity, and line length", and as designed to align with
  designers' subjective judgement. `[PAYWALLED]` — **I could not read the
  formula.** This is the closest thing I found to a published schematic
  readability metric and I cannot tell you what it computes.
- **Lee & McNamee 1992**, "Aesthetic routing for transistor schematics", cited
  by the FITEE survey. The concern is thirty-four years old. `[PAYWALLED]`
- **"An efficient and high-quality circuit schematic generation method based on
  action mask and graph neural network"**, Springer `s44163-025-00726-7`, 2025.
  Identified, not read. `[PAPER-ABS]`

### Survey

**Yang, Qiao, Chen et al., "A review of automatic schematic generation
techniques and their application to printed circuit boards"**, *Frontiers of
Information Technology & Electronic Engineering* 26(9), 2025, DOI
`10.1631/FITEE.2400612`. `[PAYWALLED]` — the landing page gave a taxonomy
(layout and routing algorithms; PCB reverse engineering) and a citation span of
1966–2024 including Steiner trees, simulated annealing, deep RL, GNNs and
transformers. **The evaluation-metrics section is behind the paywall.** If any
single document would shortcut the metric question, it is probably this one.

### Agent plumbing, not agent design

A genuinely busy area, and the owner's instinct that there is a frontier here is
correct — but it is a frontier of *access*, not of layout quality. All of these
hand an agent primitives and let it place things one call at a time:

| Project | Scope | Evidence |
| --- | --- | --- |
| `paul356/KiCad-AI-Assistant` | KiCad 10 plugin, in-editor LLM chat, reported 217 tools across schematic, layout, routing, review | `[THIRD-PARTY]` + forum |
| `ProductOfAmerica/mcp-server-kicad` | MCP, 109 tools, schematic capture + layout + ERC/DRC + exports | `[THIRD-PARTY]` |
| `mixelpixx/kicad-mcp-server` | MCP, reported 244 tools, 65 of them schematic authoring/batch/hierarchy | `[THIRD-PARTY]` |
| `blwfish/kicad-mcp` | MCP, 71 tools | `[THIRD-PARTY]` |
| `Seeed-Studio/kicad-mcp-server` | MCP, analysis + pin-level tracing + editing | `[THIRD-PARTY]` |
| `circuit-synth/mcp-kicad-sch-api` | MCP, 8 tools (`add_component`, `add_wire`, hierarchy). MIT, 21 stars, 21 commits | `[REPO]` |
| `tad12e/Agnet_kicad` | KiCad 8 plugin, conversational PCB layout + DRC resolution | `[THIRD-PARTY]` |

**None of them that I examined contains a placement algorithm, a collision
check, or any layout quality validation.** `circuit-synth/mcp-kicad-sch-api`
takes coordinates and does as it is told; I verified that one directly.

A skeptical practitioner assessment (`pcbeditor.com/kicad-ai`, `[THIRD-PARTY]`)
puts the limit crisply: "an assistant can add symbols and wires to a KiCad
schematic one tool call at a time", it is slow, and — the line worth keeping —
"A language model is strong at judgement… It has no way to measure whether a
trace clears a pad by 0.15 mm." Its advice is to treat AI placement as a first
draft and run the checks yourself.

### Two independent prior-art reviews, which is itself a finding

Other people have run this exact search in the last two months.

- **`kristofferkoch/oparroy` PR #8, "T21: Prior-art review — automatic schematic
  generation", 28 September 2026.** `[THIRD-PARTY]`, and the single most aligned
  document I found. Surveys yosys `show` (graphviz dump, not a schematic),
  netlistsvg, d3-hwschematic, SKiDL `generate_schematic`, KiCad itself ("no
  netlist→schematic path at all"), and commercial tooling ("netlist→schematic
  exists only as reverse-engineering tooling (ScanCAD)", sold as a viewer
  expecting human cleanup). Its conclusions: the layout *engines* exist
  (Sugiyama layered, Tamassia orthogonal bend minimisation, ELK's port and
  hyperedge support), but **"schematic semantics (GND down, passive chains,
  symmetry) remains unsolved across all tools"**; and its recommendation is
  "Never build a placement/routing engine" — borrow one (grandalf for pure
  Python Sugiyama, ELK as fallback) and build only the view extraction.
- **`pd.takazudomodular.com/docs/learning/ai-circuit-design-research/`**,
  "AI-Assisted Circuit Design: Workflows for the Idea → KiCad Schematic
  Handoff". `[THIRD-PARTY]`, and apparently itself agent-authored, so weigh it
  accordingly. Sorts the space into five families and concludes "LLMs cannot
  reliably encode geometry", that direct KiCad control is a dead end because the
  API lacks schematic support, that circuit-synth is the most promising
  code-defined route but "requires manual layout cleanup", and that the
  realistic win is "AI produces a verifiable, geometry-free draft and reviews
  your work, not AI replaces KiCad".

Both reviews independently reach the same structural conclusion: **the engines
are available, and the unsolved part is encoding what makes a schematic read
like a schematic.**

## 3. Programmatic code-to-schematic tools

### SKiDL and schematizer — the deepest open-source attempt

`[REPO]` plus the author's own write-up. MIT.

- **SKiDL** is a Python netlist DSL. `generate_schematic()` emits **editable
  `.kicad_sch`**, and `generate_svg()` static hyperlinked SVG; both need KiCad 6
  or later.
- **Placement**: expand part bounding boxes to leave routing room → group
  connected vs floating parts → **force-directed placement within groups**
  (attractive forces from connecting nets, repulsive from bounding-box overlap,
  with a weight that shifts from attractive to repulsive as it evolves) →
  arrange blocks into an overall layout.
- **Routing**: coarse routing cells between parts → global routing by Manhattan
  distance priority → assign routes to cell periphery terminals → detailed
  switchbox routing within cells → concatenate into wires. Shorter nets first;
  tiny switchboxes coalesced to avoid routing failure.
- **Cost: roughly 18 months**, August 2021 to July 2023.
- **The author's own verdict**, which is the most valuable sentence in this
  section: the schematics are "better than what we had (which was nothing), but
  the quality of the schematics still needs improvement" — imperfect wiring
  aesthetics, occasional bad placements needing manual `symtx` hints. The
  prior-art review above adds the companion line: **"you can't route your way
  out of a bad placement."**
- **The long discussion** (`devbisme/skidl` #125, 2021 → 2025) records the
  retreat: an earlier contributor abandoned wire routing for **hierarchical and
  global labels** — stubs instead of wires — because routed output was "ok but
  not quite pretty enough to use", and found `elkjs` produced worse results than
  hand-written heuristics. By 2025 the community proposal was labels only plus
  force-directed placement, **deliberately trading appearance for reliability at
  any complexity.** Note where that lands: it is the same move tscircuit makes,
  except chosen openly rather than substituted silently on failure.
- **`devbisme/schematizer`**, split out in SKiDL 3.0.0 on **2026-10-16, three
  days before this research**. `[REPO]`, MIT, **3 stars, 13 commits**. A
  standalone, tool-neutral JSON-netlist → `.kicad_sch`/SVG drawer for KiCad
  6–10, engine vendored, single runtime dependency (`simp_sexp`), explicitly
  "reused by any other front end that emits the same format". Carries layout
  hints in the netlist document (`symtx` for mirror/rotate, `stub`/`netio` for
  net stubbing) and a deterministic grid "labels-only mode".
- **One property disqualifies it for this repository as-is, and it is stated in
  its own README:** "Placement starts parts at random positions and the router
  breaks ties randomly, so the same netlist produces a different — equally valid
  — drawing on every run." A nondeterministic emitter cannot be regenerated and
  compared by content, which is this repository's stated rule for derived
  artifacts. The labels-only mode is deterministic; the routed mode is not.

### circuit-synth — the agent-oriented one

`[REPO]`, MIT, **287 stars, 34 forks, 1,207 commits**.

- Python → complete KiCad project: `.kicad_pro`, `.kicad_sch`, `.kicad_pcb`,
  plus BOM CSV, PDF schematic and Gerbers. **It emits a drawn schematic with
  placed symbols**, and places automatically.
- Bi-directional: import an existing `.kicad_sch` into Python, modify, re-emit.
- Markets itself as agent-facing — "Python-defined circuits with Claude Code as
  your intelligent design partner".
- **No automated readability, aesthetics or layout-quality check is documented.**
  Functional correctness only, with whatever KiCad's own ERC provides after the
  fact.

### kicad-sch-api — the primitive layer, and an accidental rule corpus

`[REPO]`, MIT, **55 stars, 275 commits, 70+ tests**.

- Reads and writes `.kicad_sch` with **byte-exact format preservation** matching
  KiCad's native output — the mundane capability that everything else needs.
- Object API over components, wires and labels. Placement is the caller's job,
  **but it does ship routing**: "Manhattan-style orthogonal routing with basic
  obstacle avoidance", `add_wire_between_pins()`, and `auto_route_pins()` with
  routing modes. The obstacle-avoidance algorithm is not documented.
- Known limits in its own words: global label connections "not yet fully
  implemented"; schematics over ~1,000 components slow in connectivity analysis.
- **Worth a look for a different reason.** Issue #135 collects placement rules
  derived from "extensive iterative testing with AI agents" across six versions
  of one LED-indicator circuit: 1.27 mm grid alignment; **lower Y is TOP, higher
  Y is BOTTOM**; `rotation=270` for a vertical LED so the cathode points right;
  "calculate center first, work backwards"; text Y must be less than the
  enclosing rectangle's bottom Y; power symbols carry voltage values not
  references; derive every wire coordinate from `list_component_pins()` rather
  than arithmetic; 40–60 mm branch spacing; and a pre-render verification
  checklist. **This is a hand-built rule file for agent schematic placement,
  discovered empirically.** It is also exactly the kind of knowledge that, in
  this repository's terms, must reach an artifact through a rule file rather
  than the producing agent's judgement — and someone has written one.

### The digital-logic drawers

- **`netlistsvg` (nturley)** — `[REPO]`/`[THIRD-PARTY]`. yosys JSON → SVG
  schematic. Layout by **elkjs layered (Sugiyama) with left-to-right flow and
  orthogonal routing**, drawn through replaceable SVG "skin" files. Produces, per
  the prior-art review, "recognizably schematic-looking output". **Last release
  1.0.2, December 2020; described as effectively unmaintained.** A 2021 report
  says it "didn't do the greatest job with a whole 80+ piece circuit board".
  Digital logic, not analog.
- **`Nic30/d3-hwschematic`** — ELK plus d3 rendering, with hierarchy as
  expand/collapse nested boxes. Interactive viewer. `[THIRD-PARTY]`
- **`doee-hc/schematic`** — `[REPO]`. "Language-neutral JSON in, orthogonal
  circuit diagrams out", hierarchical modules/ports/nets → SVG or draw.io, ELK
  for layout. **0 stars, 8 commits.** Noted for completeness only.
- **yosys `show`** — a graphviz dot dump for debugging. Not a schematic.

### Commercial, all claims

- **Flux.ai** — `[VENDOR]`. Agentic Copilot in a web schematic editor; coverage
  (EEJournal, 6 Nov 2025) says that given a spec it "designs the circuit,
  generates the schematic, selects the components, and lays out the PCB", asking
  the user questions as it goes. The same article notes it provides **"no
  technical specifics on schematic symbol placement, wire routing mechanics, or
  validation methodologies"**. Treat as unverified.
- **CELUS** — `[THIRD-PARTY]`, listicles only. Requirements → reference
  schematic + BOM + design checks. Closed, browser-based.
- **JITX** — position 3; see §1.
- **Quilter** — `[VENDOR]`. PCB layout only, no schematic. Position 2.
- **ScanCAD and similar** — per the prior-art review, commercial
  netlist→schematic exists only as **reverse-engineering** tooling, sold as a
  viewer or debugger that expects human cleanup. `[THIRD-PARTY]`

### tscircuit — already settled here

Evaluated and rejected in this repository on 2026-09-21; see
`docs/decisions/2026-09-21-why-not-tscircuit.md`. It does emit a drawn
schematic. It was rejected because a routing failure is silently re-rendered as
a net label, producing a drawing that looks deliberate. **Nothing in this
research revisits that, and nothing found here contradicts it.** What this
research adds is context: the SKiDL community reached the same labels-instead-of-
wires destination deliberately and said so, which is the difference the decision
document was drawing.

## 4. Evaluation and metrics

**This is where the field is genuinely thin for the thing this project needs,
and the thinness has a precise shape.** Four kinds of measurement exist. Only
one of them is readability, and the one that is readability is either paywalled,
generic, or unimplemented.

### Correctness of a generated schematic — solved, and transplantable

**Weave's round-trip verification** is the strongest pattern found: emit the
schematic, re-parse the *emitted file* back into a netlist by geometric
coincidence of wire endpoints, flags and symbol pins, and compare net for net
against the input. Binary outcome. No similarity score. `[PAPER-FULL]`

This is a check that can fail, it grades the artifact rather than the
generator's intention, and it would catch exactly the failure mode that
disqualified tscircuit — a drawing that looks connected but is not. It is
independent of readability.

**SchGen's Netlist Accuracy** (Jaccard/precision/recall over symbol-pin nodes)
is the graded version of the same idea; Weave argues the binary version is the
right one.

### Resemblance to a reference drawing — exists, and unusable here

**Schemato's GED and MSSIM**, scaled by compilation success rate. These require
a known-good drawing of the same circuit to compare against. For generating a
schematic that has no reference, they do not apply. Weave rejects them on a
different ground — that they measure aesthetics rather than correctness.

### Layout quality of a schematic — the thin part

In descending order of usefulness to this project:

1. **SchGen's Spatial Violation** — "normalized overlaps among symbols/labels/
   wires". Code-computable, published, from Microsoft Research, and shipped
   alongside an MIT repository. **It measures only overlap.** Whether its
   implementation is in the repository is unverified.
2. **AEM (Yang et al., IEEE TCAD)** — an Aesthetic Evaluation Metric for PCB
   schematics explicitly built to make a subjective judgement objective,
   described as weighing "component placement specifications, neatness, routing
   complexity, and line length", and validated by RL agents that reportedly
   produce schematics "comparable to those designed by human engineers".
   **`[PAYWALLED]`. I could not read the formula, so I cannot tell you whether
   it is adoptable, and I will not pretend otherwise.** This is the highest-value
   unresolved lead in this document.
3. **Hsu & Lin's RL reward** — crossings, bends, wire length, plus a "building
   block compliance rate". The reward components are named but the formulation
   is `[PAPER-ABS]`. The building-block compliance idea is interesting precisely
   because it is the semantic criterion everyone else says is missing: does the
   drawing preserve recognisable analog idioms.
4. **CircuitLM's routing heuristics** — shorter paths, fewer bends, minimal
   crossings. Heuristics, not a metric, and barely established.
5. **Everyone else: nothing.** circuit-synth, kicad-sch-api, schematizer, SKiDL,
   netlistsvg, every KiCad MCP server, and every commercial tool I looked at
   publish **no layout quality measure at all.** Weave says outright that it
   does not report crossing or bend metrics.

### Graph-drawing literature — mature, with real metrics and a real warning

The brief's hunch was right: this field has the metrics, has implementations,
and has human-subject validation. It also has a finding that complicates
borrowing them.

- **Purchase, "Metrics for Graph Drawing Aesthetics"**, *Journal of Visual
  Languages & Computing* 13(5):501–516, Oct 2002. Formal metrics for **seven**
  aesthetic criteria — crossings, bends, edge length, drawing area among them —
  deliberately size-independent so drawings of different graphs are comparable,
  and explicitly intended as **cost functions for genetic algorithms or
  simulated annealing**. `[PAPER-ABS]`; **I did not retrieve the formulas** and
  they are the point.
- **`rpgove/greadability`** — `[THIRD-PARTY]`, a JavaScript implementation of
  four global readability metrics, **each normalised to [0,1] with higher
  better**: edge crossings (fraction of crossing edge pairs out of an approximate
  maximum), angular resolution (minimum — mean deviation of adjacent incident
  edge angles from the ideal 360°/degree), angular resolution (deviation), and
  edge crossing angle (mean deviation from an ideal 70° crossing). Reported to
  be the only available implementation of the minimum-angle, edge-crossing and
  crossing-angle metrics. **This is a runnable readability scorer.**
- **Purchase's human-subject work** — "Validating Graph Drawing Aesthetics"
  (GD 1996) and "Which aesthetic has the greatest effect on human
  understanding?" (GD 1997). The repeated finding across this literature is that
  **edge crossings dominate** readability.
- **Dunne & Shneiderman, "Improving Graph Drawing Readability by Incorporating
  Readability Metrics"**, UMD 2009 — a tool that feeds metrics back to the
  layout. Pattern worth noting: metrics as a feedback loop, not just a grade.
- **Mooney, Purchase, Wybrow & Kobourov, "The Multi-Dimensional Landscape of
  Graph Drawing Metrics"** (GD 2024). PDF extraction failed. Per search
  summaries: layout quality is **inherently multi-objective, and no single
  metric captures aesthetic quality across graphs and tasks** — stress
  emphasises structural faithfulness while crossings emphasise readability, and
  they conflict. `[PAPER-ABS]`, weakly.
- **"Universal Quality Metrics for Graph Drawings"**, GD 2025, LIPIcs vol. 357
  paper 30. Identified, not read.
- **Huang & Huang**, "Evaluating overall quality of graph visualizations based on
  aesthetics aggregation", *Information Sciences*, 2015 — the aggregation
  problem, which is what you hit the moment you have more than one metric.
- **The warning.** An empirical study relayed in search results found
  participants were **slower and less accurate** finding cliques in an
  **orthogonal** layout than a force-directed one **despite the orthogonal
  layout having fewer crossings**. `[PAPER-ABS]`, and I could not identify the
  study, so treat it as a flag rather than a fact. But the direction of the flag
  matters: **minimising crossings is not the same as being readable**, and a
  schematic is orthogonal by convention.

### Engines, if the layout is to be borrowed rather than built

Named by multiple independent sources as the available substrate: **ELK /
elkjs** (layered Sugiyama with port constraints, orthogonal edge routing, and —
important for nets — hyperedge support), **Tamassia** orthogonal bend
minimisation, **Sugiyama** layered framework, and **grandalf** as a pure-Python
Sugiyama. Weave and netlistsvg both use elkjs; the SKiDL discussion reports
elkjs underperforming hand-written heuristics for its case. `[THIRD-PARTY]`

**One contradiction I could not resolve.** A search result asserts that "ElkJS
has no orthogonal algorithm for schematics" and that in some integration setting
`elk.edgeRouting = ORTHOGONAL` has no visible effect because the caller keeps
only child positions and discards returned edge routes. That reads like a
description of one *integration's* bug rather than a property of ELK, and Weave
reports using elkjs orthogonal routing successfully. **Unresolved. If ELK is
being considered, settle this directly.**

### Diagram evaluation outside circuits

**DiagramEval** (arXiv 2510.25761, Liang & You, Nov 2025, code at
`ulab-uiuc/diagram-eval`) evaluates LLM-generated diagrams by treating them as
graphs — text elements as nodes, connections as directed edges — alongside
CLIP visual similarity and OCR text extraction. `[PAPER-ABS]`. **It appears to
grade semantic content rather than layout aesthetics**, so it is adjacent rather
than applicable, but it is the one released implementation of "grade a generated
diagram" I found.

## 5. KiCad-specific automation

`[THIRD-PARTY]` and official mailing-list/docs extracts.

**The central fact: KiCad's official API cannot do schematics.**

- The **IPC API** (public beta in KiCad 9; protobuf over NNG; official Python
  bindings published as `kicad-python` on PyPI) **does not support the schematic
  editor or the library editors.** It also requires a *running* KiCad with a
  document open — every accessor is an RPC to the live editor, with no offline
  file-reading path — and it provides no plotting or export, for which KiCad
  directs you to `kicad-cli`. Python 3.9–3.12.
- The older **SWIG `pcbnew` API** is board-only.
- **Therefore every tool that writes a schematic programmatically writes the
  `.kicad_sch` s-expressions directly.** That is what `kicad-sch-api`,
  `schematizer`, `circuit-synth`, `kiutils`, `kicad-skip` and
  `rjwalters/kicad-tools` all do. There is no sanctioned alternative, and the
  byte-exact round-trip that `kicad-sch-api` advertises is valuable precisely
  because of this.
- **`kicad-cli`** is the supported path for ERC and for export/render. This
  repository already invokes it on every board on every `make check`, which
  puts it ahead of most of what is surveyed here on the "look at the output"
  axis.
- **KiCad has no netlist-to-schematic path at all** — per the prior-art review,
  importing a netlist into pcbnew "merely stacks footprints at origin with
  nothing usable", and nothing goes the other way into eeschema.

## 6. What this project would be reinventing, and what is genuinely unsolved

### Reinventing (an implementation exists, open, and readable)

- **Emitting valid, byte-exact `.kicad_sch`** — `kicad-sch-api` (MIT),
  `kiutils`, `schematizer`.
- **Force-directed schematic placement plus switchbox/global orthogonal wire
  routing for KiCad** — SKiDL / `schematizer` (MIT), ~18 months of one
  developer's work, standalone since 2026-10-16, consumable from any front end
  that emits its JSON netlist format. Its author says the quality needs
  improvement and it is nondeterministic in routed mode.
- **Layered (Sugiyama) placement with orthogonal routing for a netlist** — ELK /
  elkjs, used by Weave, netlistsvg, d3-hwschematic.
- **Round-trip netlist verification of an emitted schematic** — Weave, with a
  stated method and published pass rates.
- **Overlap checking as a layout quality gate** — SchGen's Spatial Violation.
- **Generic graph readability scoring** — `greadability` (4 normalised metrics),
  Purchase's 7 metrics.
- **A rule file of concrete KiCad schematic placement conventions for an agent**
  — `kicad-sch-api` issue #135.
- **Agent access to KiCad schematic primitives** — at least six MCP servers and
  two in-editor plugins.

### Genuinely unsolved, by every source I found

- **Schematic *semantics* as gradable criteria.** Ground down, power up, signal
  flow left to right, passive chains aligned, differential pairs mirrored,
  feedback paths recognisable, idioms preserved. The prior-art review states it
  plainly — unsolved across all tools. Hsu & Lin's "building block compliance
  rate" and Weave's named "placement patterns (feedback, divider legs, shunts)"
  are the only two attempts I found to encode any of it, and neither publishes a
  usable definition.
- **A readability metric for schematics that is published, validated against
  engineering judgement, *and* open.** AEM may be the first two and is not the
  third; Spatial Violation is the first and third and measures only overlap;
  `greadability` is open and validated but knows nothing about circuits.
- **Scale.** Every result I found is small: EEschematic at 3–5 transistors,
  Schemato degrading above 5 components, RL placement not past ~40 components,
  SchGen on structured SparkFun-class boards, netlistsvg reportedly poor at 80+
  parts, `kicad-sch-api` slowing at ~1,000.
- **Determinism.** `schematizer` randomises placement by design. No source I
  found treats reproducible output as a requirement. For a repository that
  regenerates derived artifacts and compares by content, this is a gap in the
  prior art rather than in the repository.
- **Grading a schematic for which no reference drawing exists.** The published
  metrics split into correctness (needs the input netlist — fine) and
  resemblance (needs a known-good drawing — not available for a novel circuit).
  Nothing I found grades a novel schematic's readability by code.

### On the owner's hypothesis

> *"I CANT be the only person asking agents to do schematic layout right now.
> There MUST be a bustling frontier of emerging practices around
> agent-generated schematics"*

**There is a frontier, and it is busier than the brief assumed — but it is
bustling in a different place than this project needs.** Six-plus MCP servers,
two in-editor LLM plugins, two independent prior-art reviews written in the last
two months, four papers on LLM schematic generation in the last twelve, one
Microsoft Research model-and-dataset release, and a standalone KiCad schematic
drawer that shipped three days before this document. What almost none of it has
is a way to tell whether the drawing it produced is any good. The activity is in
*access* and in *generation*; the thin part is *grading*.

## 7. Entries owed to `docs/known-gaps.md`

This research was instructed not to modify any existing file, so these are
recorded here instead. **They are owed as `known-gaps.md` entries and this
section is not a substitute for them** — `CLAUDE.md` binds every agent on every
task, and a measurement that stays in one document somebody has to find is the
failure mode that rule exists to prevent. Each is a measurement or an
unresolved question a later reader cannot re-derive without repeating this pass.

1. **`devbisme/schematizer` randomises placement**, by its own README: the same
   netlist produces a different drawing every run. *Criterion to settle:* a
   generator whose output can be regenerated and compared by content. *Relayed
   from a README, not confirmed by running it.*
2. **AEM's formula is unread** (IEEE TCAD, paywalled). It is the closest thing
   to a schematic readability metric found. *Criterion:* obtain the paper and
   establish whether its components are computable from a `.kicad_sch`.
3. **Whether SchGen's Spatial Violation implementation is in
   `github.com/microsoft/SchGen`** is unestablished; the README does not
   document evaluation code. *Criterion:* clone and look.
4. **The FITEE 2025 survey's evaluation-metrics section is paywalled** and is
   the likeliest single shortcut to the metric question.
5. **An unresolved contradiction about elkjs orthogonal routing** — one source
   says ELK has no orthogonal algorithm for schematics, Weave reports using it
   successfully. *Criterion:* run elkjs with `edgeRouting: ORTHOGONAL` and
   inspect the returned edge sections.
6. **An uncited empirical finding that orthogonal layouts read *worse* than
   force-directed despite fewer crossings.** If true it bears directly on any
   crossing-minimisation objective for a schematic. *Criterion:* identify the
   study. Recorded undiagnosed.
7. **`kicad-sch-api` issue #135 is an externally-authored placement rule file**
   for agent schematic placement, with concrete numbers (1.27 mm grid, inverted
   Y, 40–60 mm branch spacing). Worth evaluating as a criteria source that is
   not this repository's own producing agent.
8. **EEschematic's evaluation method could not be established** from its
   abstract or a partial PDF extraction. Recorded as unestablished, not absent.
9. **Whether JITX's `schematic.design` renders as a human-readable sheet** could
   not be established from the docs page read. It bears on whether position 3
   actually retains oversight.

## 8. What I could not establish

Beyond the items above:

- **Nothing in this document was verified by running it.** No repository cloned,
  no generator executed, no generated schematic rendered and looked at. Every
  page was read through a summarising tool. By this repository's own standard —
  look at the output, not only the claim — **this document is a map of where to
  look, not a measurement.**
- **Star counts, commit counts and "last activity" are as reported by a
  summariser reading a GitHub page**, and are the least reliable facts here.
- **Purchase's seven metric formulas** — the substance of the most-cited
  reference in §4 — were not retrieved.
- **CircuitLM** is barely established: output format, metrics, test set and code
  release all unknown.
- **Commercial behaviour is entirely unverified.** Flux, CELUS, JITX and Quilter
  are vendor claims and third-party listicles. I ran none of them and saw no
  output from any of them. Where coverage noted an absence of technical detail,
  I have said so.
- **I did not research the human-places-it programmatic drawing tools** —
  Schemdraw, CircuiTikz, LaTeX-family drawing DSLs. They are position 2 by
  construction (the author specifies the arrangement) so they bear on drawing
  *mechanics* rather than on automatic layout, but they were not examined and
  may carry useful conventions.
- **I did not search non-English literature**, nor patent databases
  systematically, though one relevant US patent surfaced incidentally
  (US 12,475,291, the Hsu & Lin building-block RL method).
- **Whether any of the KiCad MCP servers contains layout quality validation**
  was checked directly for only one of the seven.
