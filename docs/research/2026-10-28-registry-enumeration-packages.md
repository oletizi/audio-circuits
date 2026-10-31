# Registry enumeration: schematic-draughtsmanship tooling

**Date:** 2026-10-28
**Method:** ENUMERATIVE. Package registries swept via their own HTTP APIs, not by
web search. WebSearch was not used at all in this pass.
**Scope:** drawing a schematic; placing/orienting symbols; routing/labelling it;
checking whether a schematic is LEGIBLE; rendering it; representing placement
intent. NOT PCB layout, NOT copper autorouting, NOT simulation, NOT BOM.

## How to read the evidence marks

Two different things get marked, and conflating them is how a survey becomes a
rumour:

- **VERIFIED** — this writer fetched it from the registry API in this pass and
  read the field. Names, versions, dates, licences, dependency counts and
  existence are all VERIFIED in that sense. Re-runnable: the scripts are
  described under *Reproducing this*.
- **RELAYED** — the one-line capability description. The registry serves the
  *author's own summary*; that the registry serves that text is VERIFIED, but
  **that the package does what the text claims is NOT.** Nothing here was
  installed, run, or made to draw anything. Every "what it does" column below
  is RELAYED unless marked otherwise.

**No artifact in this inventory was executed. No drawing was produced or
looked at.** Per the project's own practice — *"look at the output, not only the
tests"* — this document establishes a candidate list and nothing about quality.

## Counts per source

| Source | Queries | Raw unique collected | Survived triage | In scope (A–D) |
| --- | --- | --- | --- | --- |
| PyPI (full name index + per-project JSON) | 11 name patterns over 925,633 names | 2,713 name hits → 1,205 fetched | 247 | 48 |
| npm (registry search API) | 37 | 4,054 | 475 | 56 |
| crates.io | 10 | 153 (after filter) | 153 | 21 |
| RubyGems | 10 | 22 | 22 | 4 |
| Hackage | 10 | 5 name-matching | 1 | **0** |
| pkg.go.dev | 8 | 99 (after filter) | 99 | 8 |
| Zenodo (software records) | 8 | 76 (after filter) | 76 | **2** |
| Software Heritage (origin search) | 9 | 92 origins | 92 | 4 |
| Hugging Face (models + datasets) | 16 + 2 author probes | 81 | 81 | 7 |

**The zeros and near-zeros are findings, and they are stated as findings below.**

### PyPI, per query (VERIFIED raw hit counts)

Enumeration was over the **complete** PyPI name index — `https://pypi.org/simple/`
with the v1 JSON accept header — **925,633 project names**, not a search ranking.
Name patterns and their raw hits:

| Pattern | Raw name hits |
| --- | --- |
| `kicad|kicad_|ki_cad` | 77 |
| `eeschema|kicad_sch|sch_api|schlib|sym_lib|symbollib` | 3 |
| `schem(a|at)` | 1,559 |
| `netlist|net_list` | 17 |
| `eda` (delimited) + `openeda|edatool` | 144 |
| `circuit` | 783 |
| `altium|orcad|eaglecad|geda|gschem|xschem|qucs|horizoneda|librepcb|easyeda|fritzing|logisim` | 105 |
| `spicelib|skidl|lcapy|schemdraw` | 11 |
| `circuitikz|tikz-circuit|wireviz|symbolgen|schdraw|schplot` | 8 |
| `place-rout|rout-place|floorplan|sugiyama|hierarchical_layout|orthogonal_layout|elk_layout` | 12 |
| `legib|crossing_min|edge_crossing|readab.*diagram` | 7 |

Unique after dedupe: **2,713**. Of those, **1,508 matched only `schem(a|at)`
without containing `schematic`** — the JSON-schema / DB-schema population — and
were dropped, leaving **1,205** fetched individually from
`https://pypi.org/pypi/<name>/json`. **1,158 returned metadata; 47 returned an
error** (deleted or yanked-to-nothing projects). **247** carried
electronics-schematic vocabulary in summary, keywords or Trove classifiers.

**The `eda` pattern is nearly worthless on PyPI and that is worth recording:**
of 144 hits the overwhelming majority are *exploratory data analysis*
(`aaa-eda-analyzer`, `agent-eda`, `doeasyeda`, four `aiaa-eda-team*` teaching
packages). An agent sweeping PyPI for "EDA" and triaging by name alone would
conclude the electronics-design population is large and find almost none of it.

### npm, per query

npm's `total` for free-text queries is **not a result count** — the search
backend fuzzy-matches and reports the whole matched tail (`schematic svg` →
469,477; `schematic editor` → 295,531). Those numbers are recorded for honesty
and are **not** usable as population sizes. The `keywords:` queries are exact
and *are* usable:

| Exact keyword query | Total |
| --- | --- |
| `keywords:kicad` | 72 |
| `keywords:schematic` | 123 |
| `keywords:eda` | 123 |
| `keywords:electronics` | 135 |
| `keywords:circuit` | 242 |
| `keywords:netlist` | 27 |
| `keywords:cad` | 600 |
| `keywords:spice` | 29 |
| `keywords:kicad-sch` | 1 |
| `keywords:eeschema` | 1 |
| `keywords:schematic-capture` | **0** |
| `keywords:circuit-diagram` | **0** |

**`keywords:schematic-capture` and `keywords:circuit-diagram` are both zero.**
Nobody tags for the thing this project is looking for. That is the single
clearest evidence that a name-driven or keyword-driven pass cannot find this
domain, and it is why the sweep above went through the full PyPI name index
rather than a search ranking.

Half the free-text queries were HTTP 429'd on the first attempt and re-run with
backoff; the counts above are from completed requests only.

---

## A) DRAWS / PLACES a schematic

| Name | Registry | URL | Licence | Version | Last release | Deps | What it does (RELAYED) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| akcli-kicad | PyPI | github.com/tipoLi5890/akcli | MIT | 0.22.0 | 2026-08-25 | 6 | Agent that draws and edits `.kicad_sch` from JSON op-lists, with net-diff safety rails and ERC/design/intent checks |
| circuitsmith | PyPI | github.com/tgd1975/CircuitSmith | MIT | 0.1.0 | 2026-05-13 | 6 | Generates KiCad-compatible schematics from declarative YAML; driven by a Claude Code skill |
| circuit-weaver | PyPI | pypi.org/project/circuit-weaver/ | MIT | 0.37.0 | 2026-10-20 | 37 | Programmatic circuit design, validation and KiCad artifact generation |
| circuit_synth | PyPI | github.com/circuit-synth/circuit-synth | MIT | 0.12.1 | 2026-01-09 | 43 | Pythonic circuit design emitting KiCad projects (same org as the known kicad-sch-api) |
| circuitdk | PyPI | github.com/td2sk/circuitdk | MIT | 0.1.5 | 2026-10-28 | 2 | Code-first circuit design plus KiCad reconciliation |
| **mege-circuits** | PyPI | github.com/m-emm/mege-circuits | MIT | 0.1.1 | 2026-06-30 | 5 | **Alignment-first DSL for circuit schematics AND stripboard layout previews** |
| svg-schematic | PyPI | pypi.org/project/svg-schematic/ | GPL-3.0+ | 1.3 | 2025-07-05 | 2 | SVG schematic generator |
| schemdraw | PyPI | schemdraw.readthedocs.io | MIT | 0.23 | 2026-05-29 | 4 | Electrical circuit schematic drawing (**known**) |
| yaml-to-schemdraw | PyPI | github.com/Julynx/yaml-to-schemdraw | unstated | 0.1.2 | 2026-02-19 | 2 | Generates schemdraw diagrams from YAML or dicts |
| schemdraw-markdown | PyPI | pypi.org/project/schemdraw-markdown/ | MIT | 0.0.3 | 2022-08-30 | 2 | Renders schemdraw circuits from markdown |
| PySchematic | PyPI | github.com/peon374/PySchematic | GPL-2.0 | 0.1 | (none) | 0 | OO system for drawing schematics in an IPython notebook |
| pyxschem | PyPI | github.com/Cognitohazard/pyxschem | GPL-3.0 | 0.1.0 | 2026-03-22 | 3 | Reads, edits and **generates** xschem schematic files |
| bltspice-mcp | PyPI | pypi.org/project/bltspice-mcp/ | unstated | 0.3.4 | 2026-09-17 | 6 | **Converts a netlist to an LTspice `.asc`** — i.e. assigns symbol placement |
| netlist_viewer | PyPI | github.com/MatthewFreestone/netlist_viewer | MIT | 0.1.3 | 2026-03-09 | 3 | Visualises SPICE netlists as interactive circuit diagrams |
| pepper-netlist | PyPI | pypi.org/project/pepper-netlist/ | MIT | 0.1.0 | 2025-07-18 | 0 | Prints circuit-style grids from SPICE-like files to a terminal |
| digitalcircuit | PyPI | pypi.org/project/digitalcircuit/ | MIT | 0.1.0 | 2025-05-23 | 3 | Converts Boolean expressions to circuit diagrams |
| revolution-eda | PyPI | github.com/eskiyerli/revolution-eda | MPL-2.0 | 1.0.0 | 2026-10-04 | 18 | Custom IC design environment; includes a schematic editor |
| circuitgenome | PyPI | github.com/analog-ml/CircuitGenome | MIT | 0.3.0 | 2026-08-24 | 5 | Analog circuit **topology synthesis** and recognition, op-amp focused |
| circuitsilk | PyPI | github.com/levantlabs/silk | MIT | 0.1.1 | 2026-04-05 | 9 | Analog circuit design automation with SPICE netlist generation |
| **@tscircuit/matchpack** | npm | github.com/tscircuit/matchpack | unstated | 0.0.100 | 2026-10-07 | 0 | **Finds the best schematic layout for a set of SchematicChips/Groups with connected SchematicPins** |
| **@tscircuit/schematic-trace-solver** | npm | github.com/tscircuit/schematic-trace-solver | unstated | 0.0.214 | 2026-09-29 | 0 | **Solves positions and routing for schematic traces and net labels** |
| **@tscircuit/schematic-match-adapt** | npm | github.com/tscircuit/schematic-match-adapt | unstated | 0.0.22 | 2025-06-15 | 0 | Automatic schematic layout using the **PMARS** pattern |
| @tscircuit/schematic-autolayout | npm | github.com/tscircuit/schematic-autolayout | unstated | 0.0.8 | 2026-08-19 | 2 | Schematic autolayout (visual examples at autolayout.tscircuit.com) |
| **@wire-lang/core** | npm | github.com/eduardozf/wire-lang | MIT | 0.4.0 | 2026-09-07 | 0 | **Parser, compiler, schematic model, LAYOUT ENGINE and SVG renderer** — TypeScript-native, zero deps |
| wire-lang | npm | github.com/eduardozf/wire-lang | MIT | 0.4.0 | 2026-09-07 | 2 | Aggregate package and `wire` CLI: text-first schematics to SVG |
| **@schemd/core** | npm | github.com/schemd/core | MIT | 1.3.1 | 2026-10-27 | 0 | **Zero-dependency text-to-SVG compiler for schematics and UML** — TypeScript-native |
| **d3-hwschematic** | npm | github.com/Nic30/d3-hwschematic | EPL-1.0 | 0.1.6 | 2021-02-22 | 2 | **D3 + ELK based schematic visualiser** — a real orthogonal-layout engine behind a schematic renderer |
| **@veriflow/schematic-core** | npm | github.com/AlexMercer12138/Vik-VeriFlow | MIT | 1.5.0 | 2026-09-11 | 1 | **Host-neutral schematic graph AND layout core** |
| @electron-lang/schematic-diagram | npm | github.com/electron-lang/electron | ISC | 0.0.6 | 2018-08-20 | 6 | Netlist viewer built on **sprotty + elkjs** |
| circuit-json-to-kicad | npm | github.com/tscircuit/circuit-json-to-kicad | unstated | 0.0.258 | 2026-10-28 | 0 | Converts Circuit JSON to `.kicad_sch`, `.kicad_pcb`, `.kicad_pro` |
| @emdzej/elmo-core | npm | github.com/emdzej/elmo | MIT | 0.3.1 | 2026-07-21 | 1 | Parses the elmo DSL and renders circuit schematics as SVG |
| @alphaelements/aelm-renderer | npm | gitlab (aelm) | MIT | 0.6.0 | 2026-05-21 | 0 | Renders the `.aelm` circuit-diagram DSL to SVG or Canvas (WASM) |
| aelm-mcp | npm | github.com/alphaelements/aelm-mcp | MIT | 0.7.2 | 2026-08-26 | 0 | MCP server to parse, render, analyse and **edit** text-based circuit diagrams |
| @runiq/renderer-schematic | npm | github.com/quipolabs/runiq | MIT | 1.3.0 | 2026-04-17 | 1 | Electrical schematic renderer with IEEE/IEC standard symbols |
| @skillpet/circuit | npm | (npm only) | SEE LICENSE IN LICENSE | 0.6.5 | 2026-04-02 | 1 | Renders electrical schematics from JSON as interactive SVG, with themes |
| react-circuit-schematics | npm | github.com/urisolve/react-circuit-schematics | MIT | 1.2.1 | 2021-08-21 | 0 | React library for drawing circuit schematics |
| **n8n-nodes-spec2schematic** | npm | github.com/salihibrahimuslucan/n8n-nodes-spec2schematic | MIT | 0.1.0 | 2026-07-15 | 0 | **Turns a text netlist/spec into a schematic (SVG) AND lint findings** — both A and B |
| eda-copilot-backend | npm | github.com/biosshot/eda-copilot-backend | MIT | 0.4.0 | 2026-10-14 | 6 | Component search, **schematic layout** and PCB placement |
| @huaqiu/dsh-tool-kicad-schematic-gen | npm | (npm only) | unstated | 0.6.11 | 2026-10-28 | 9 | KiCad schematic design: module search, symbol import, edit preview, script build |
| @huaqiu/dsh-tool-schematic-gen | npm | (npm only) | unstated | 0.6.2 | 2026-10-18 | 2 | Schematic generation plugin (DSH harness) |
| dsh-eda-mcp | npm | github.com/MCviseron/dsh-eda-mcp | Apache-2.0 | 1.1.3 | 2026-10-25 | 5 | **Draws schematics** through the JLCEDA Pro extension API |
| schrune | npm | (npm only) | MIT | 2.0.0 | 2026-07-22 | 0 | Schrune compiler and KiCad generator |
| jseda | npm | github.com/ahdinosaur/jseda | Apache-2.0 | 2.0.3 | 2018-11-18 | 4 | Generates KiCad files in JavaScript |
| icedrom | npm | github.com/drom/icedrom | MIT | 0.2.0 | 2020-03-17 | 0 | FPGA schematic rendering |
| akiha-circuit | npm | github.com/y-moriguchi/akiha-circuit | MIT | 0.0.0 | 2019-10-19 | 0 | Draws electric circuit diagrams as ASCII art |
| visiojs | npm | github.com/28raining/visiojs | MIT | 0.0.10 | 2026-05-29 | 1 | Visio alternative for creating diagrams and schematics |
| sldeditor | npm | github.com/NovaShang/sldeditor | MIT | 0.31.0 | 2026-10-26 | 6 | In-browser React editor for electrical single-line diagrams |
| @openpowershift/logic-diagram-language | npm | github.com/OpenPowerShift/logic-diagram-language | MIT | 0.2.8 | 2026-07-23 | 2 | Renders SEL-style relay logic diagrams from a compact text language to SVG/PNG/PDF |
| @sketchmark/diagram-circuit | npm | github.com/anmism/sketchmark | MIT | 0.0.2 | 2026-05-08 | 0 | Compiles `ckt.*` commands into diagram groups and nodes |
| **BREP_ecad_core** | crates.io | github.com/mmiscool/next.BREP.io_RUST_BREP_KERNEL | (crates page) | 0.3.1 | 2026-10-28 | — | **Schematic, wiring-diagram and board documents, symbol import and connectivity, with no UI** |
| BREP_ecad_egui | crates.io | same repo | (crates page) | 0.3.0 | 2026-10-19 | — | Embeddable egui **editors** for schematics, wiring diagrams, boards, symbols, pads |
| **hauksbee-forge-codegen** | crates.io | (crates only) | (crates page) | 0.1.0 | 2026-09-15 | — | **Emits KiCad schematic and board files from forge-model, byte-stable through the forge-sexpr CST** |
| wirebug | crates.io | github.com/LHelge/wirebug | (crates page) | 0.1.0 | 2026-07-04 | — | Text-defined electrical schematics and wiring harnesses from a small DSL |
| lini / mdbook-lini | crates.io | github.com/monfa-red/lini | (crates page) | 1.1.0 / 0.5.5 | 2026-10-09 | — | One small language for diagrams, charts, **schematics and engineering drawings** |
| cadlab | crates.io | github.com/KarpelesLab/cadlab | (crates page) | 0.0.2 | 2026-10-04 | — | Headless electronics CAD for programs and AI agents: parts, circuits, boards |
| **github.com/rveen/golib/.../altium/emit/kicad** | pkg.go.dev | pkg.go.dev/github.com/rveen/golib/formats/altium/emit/kicad | (repo) | — | pub. 2026-10-27 | — | **"Package kicad emits KiCad 7+ S-expression schematics (.kicad_sch) from a schema.Schematic"** (VERIFIED synopsis, fetched individually) |
| github.com/twitchyliquid64/kcgen | pkg.go.dev | pkg.go.dev/github.com/twitchyliquid64/kcgen | (repo) | — | pub. 2023-03-07 | — | KiCad file generation in Go |
| github.com/gowhale/go-circuit-diagram | pkg.go.dev | pkg.go.dev/github.com/gowhale/go-circuit-diagram | (repo) | — | pub. 2023-01-01 | — | Circuit-diagram generation in Go |
| **Flians/netlist2schematic** | Software Heritage | github.com/Flians/netlist2schematic | (repo) | — | — | — | **Netlist to schematic. Never reached any package registry.** |
| **damdoy/procedural-electronic-schematic-generation** | Software Heritage | github.com/damdoy/procedural-electronic-schematic-generation | (repo) | — | — | — | **Procedural electronic schematic generation. Never reached any package registry.** |
| **microsoft/SchGen** | Hugging Face | huggingface.co/microsoft/SchGen | **MIT** | — | mod. 2026-06-08 | 338 dl | **CONFIRMED to exist.** Model tagged `schgen, PCB, EDA, KiCAD, Hardware-Design, Schematic-Generation` |

## B) CHECKS a schematic for legibility / quality

| Name | Registry | URL | Licence | Version | Last release | Deps | What it does (RELAYED) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **kicad-evaltor** | PyPI | github.com/attahiruj/kicad-evaltor | MIT | 0.6.1 | 2026-10-28 | 6 | **Tests and validates KiCad designs: schematic values, connectivity, ERC, DRC, board layout, fab outputs** |
| kicad-netspec | PyPI | github.com/heibench/netspec | Apache-2.0 | 0.9.0 | 2026-09-06 | 1 | Verifies connectivity against **declared engineering intent**, using KiCad as the oracle |
| kicad-bot | PyPI | github.com/embedded-pro/kicad-bot | Apache-2.0 | 0.1.4 | 2026-06-21 | 4 | CI quality gate: ERC/DRC verification, **visual diffs** |
| kicad2junit | PyPI | pypi.org/project/kicad2junit/ | MIT | 0.1.5 | 2023-08-26 | 3 | Converts KiCad ERC/DRC reports to JUnit, i.e. makes a check fail a build |
| **designguard / designguard-cli** | crates.io | github.com/ltwmori/designGuardDesktopApp | (crates page) | 0.1.1 | 2026-02-08 | — | **KiCad schematic and PCB validation library + CLI** |
| vcad-ecad-schematic | crates.io | github.com/ecto/vcad | (crates page) | 0.10.0 | 2026-09-10 | — | Netlist generation and **ERC** for vcad schematics |
| hauksbee-checks | crates.io | github.com/hauksbee-dev/hauksbee | (crates page) | 0.1.0-beta.6 | 2026-09-15 | — | Static board checks over a bound board: netlist lints, strap/contention rules |
| **pcb-maker** | npm | github.com/TachikomaGundam/PCB-Maker | MIT | 0.1.1 | 2026-10-12 | 0 | **An open exam-and-ruler for PCB design agents: role briefs, staged questions, a standalone KiCad SCORER** |
| boardreadyops | npm | github.com/oaslananka/boardreadyops | PolyForm-NC-1.0.0 | 1.68.3 | 2026-10-03 | 0 | Checks KiCad repos for production readiness before fabrication |
| n8n-nodes-spec2schematic | npm | (above) | MIT | 0.1.0 | 2026-07-15 | 0 | Also emits **lint findings** alongside the SVG — see bucket A |
| **tscircuit/schematic-layout-testing** | Software Heritage | github.com/tscircuit/schematic-layout-testing | (repo) | — | — | — | **A test harness for schematic layout.** Not on npm. |
| ansondvirtium/layout_schematic_comparer | Software Heritage | github.com/ansondvirtium/layout_schematic_comparer | (repo) | — | — | — | Compares a layout against a schematic |

**No package in any registry swept here claims to measure schematic
LEGIBILITY.** Not one. `keywords:schematic-capture` is zero on npm, and the PyPI
`legib|crossing_min|edge_crossing|readab.*diagram` pattern returned 7 names,
**none of them electronics-related.** Everything in bucket B checks electrical
correctness (ERC/connectivity/intent) or renders a diff for a human to judge.
**The gap this project cares about most is empty, and that is this sweep's
principal negative result.**

## C) REPRESENTS placement intent (authoring / intermediate layer)

| Name | Registry | URL | Licence | Version | Last release | Deps | What it does (RELAYED) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **npe-graph** | crates.io | github.com/flyball-labs/npe-graph | (crates page) | 0.1.1 | 2026-06-24 | — | **"A node-port-edge graph for representing engineering schematics"** — the purest statement of this bucket found anywhere in the sweep |
| **forge-sexpr** | crates.io | (crates only) | (crates page) | 0.1.0 | 2026-09-15 | — | **Lossless s-expression CST for KiCad formats: parse, edit, emit byte-identical** |
| forge-model | crates.io | (crates only) | (crates page) | 0.1.0 | 2026-09-15 | — | Typed model of KiCad schematic and board files over the forge-sexpr CST |
| kiutils-rs / kiutils_kicad / kiutils_sexpr | crates.io | github.com/Milind220/kiutils-rs | (crates page) | 0.2.0 / 0.3.0 / 0.1.1 | 2026-03-29 | — | Rust KiCad API for lossless S-expression round-trips (Rust sibling of the known Python `kiutils`) |
| xschem-parser / -cli | crates.io | github.com/Olavhaasie/xschem-parser | (crates page) | 0.1.0 | 2025-07-31 | — | Xschem schematic and symbol parser |
| kicad-parser | crates.io | github.com/not-Ryan/kicad-parser-rs | (crates page) | 0.0.10 | 2026-06-17 | — | Pure-Rust KiCad/SExpr parser, no regular expressions |
| kicad_parse_gen | crates.io | github.com/productize/kicad-parse-gen | (crates page) | 7.0.2 | 2018-01-29 | — | KiCad file format parser and generator |
| elektron_sexp | crates.io | (crates only) | (crates page) | 0.0.0 | 2022-10-09 | — | Rust parser and models for KiCad |
| via-kicad-sexp | crates.io | github.com/jz315/via-rs | (crates page) | 0.1.1 | 2026-07-07 | — | Small KiCad S-expression parser and renderer |
| opencascade-kicad-parser | crates.io | (crates only) | (crates page) | 0.3.0 | 2026-08-24 | — | KiCad file parser for use with opencascade-rs |
| fiducial-eda | crates.io | github.com/AleksaZCodes/fiducial | (crates page) | 0.9.10 | 2026-10-15 | — | `no_std` EDA pipeline types: the BoardInterface schema, with validation |
| **kicadts** | npm | github.com/tscircuit/kicadts | unstated | 0.0.62 | 2026-10-27 | 0 | TypeScript-first KiCad S-expression toolkit, every token a class (**known**) |
| **kicad-sch-ts** | npm | github.com/agrimsingh/kicad-sch-ts | MIT | 1.0.3 | 2026-01-06 | 4 | **TypeScript library specifically for KiCad schematic files** |
| kicad-sexpr-parser | npm | (npm only) | MIT | 1.5.3 | 2026-06-08 | 0 | KiCad sexpr parser, zero deps |
| @huaqiu/kicad-sexpr-parser | npm | (npm only) | MIT | 0.1.1 | 2026-08-25 | 0 | KiCad sexpr parser |
| kicad-toolkit | npm | github.com/SunboX/kicad-toolkit | GPL-3.0+ | 1.3.7 | 2026-09-28 | 2 | KiCad parsing into CircuitJSON with shared ECAD toolkit services |
| kicad-to-circuit-json | npm | github.com/tscircuit/kicad-to-circuit-json | unstated | 0.0.147 | 2026-10-28 | 0 | Converts KiCad schematic, symbol library, PCB and footprint files to Circuit JSON |
| kicad-converter | npm | (npm only) | unstated | 0.0.17 | 2025-07-08 | 0 | Converts between KiCad formats, JSON and Circuit JSON |
| kisch | npm | github.com/limikael/kisch | ISC | 1.0.5 | 2026-05-20 | 1 | **Schema-transformation tool for KiCad schematics** |
| @pcbjs/kicad | npm | github.com/pcbjs/pcbjs | MIT | 0.0.0 | 2026-10-27 | 0 | pcbjs KiCad reader: s-expressions, footprints, `.kicad_pcb` |
| libkicad | npm | github.com/electron-lang/libkicad | ISC | 0.0.1 | 2018-08-06 | 2 | Parsing, generation and equivalence checking for KiCad netlists |
| altiumts | npm | github.com/tscircuit/altiumts | MIT | 0.0.94 | 2026-10-10 | 3 | TypeScript-first parser/serializer for Altium document formats |
| altium-toolkit | npm | github.com/SunboX/altium-toolkit | GPL-3.0+ | 1.4.19 | 2026-09-28 | 2 | Altium document parsing and non-interactive rendering |
| spicets | npm | github.com/tscircuit/spicets | unstated | 0.0.5 | 2026-08-20 | 0 | TypeScript-first SPICE netlist toolkit, same pattern as `kicadts` |
| **@deltarobotics/uhd** | npm | github.com/Delta-Robotics-Inc/OpenUHD | Apache-2.0 | 0.3.0 | 2026-10-21 | 0 | **Universal Hardware Description: an open composable description language — Module / Interface / Harness primitives** |
| @ssevindikx/wirescript | npm | github.com/ssevindikx/wirescript | MIT | 1.0.0-rc.1 | 2026-08-24 | 0 | Code-first DSL for describing electronic circuits |
| @vessel-dsp/core | npm | github.com/vessel-dsp/core | MIT | 0.17.0 | 2026-10-22 | 2 | Headless circuit, device, format-conversion and **layout model APIs** |
| @circuit-forge/eda-core | npm | github.com/Abdulberk/circuit-forge | MIT | 1.25.1 | 2026-07-14 | 1 | Circuit manipulation, netlist generation, SPICE parsing |
| @veribusdesign/netlist (+ -core/-edif/-pads/-protel/-telesis) | npm | (npm only) | MIT | 0.1.0 | 2026-09-03 | 5 | Auto-detecting netlist parsers across EDIF, PADS, Protel, Telesis dialects |
| @electron-lang/netlist | npm | github.com/electron-lang/netlistjs | ISC | 0.1.0-next | 2018-07-23 | 7 | Extended yosys netlist format utility |
| **schematic-symbols** | npm | github.com/tscircuit/schematic-symbols | unstated | 0.0.251 | 2026-10-27 | 0 | **The tscircuit schematic symbol set as data** (symbols.tscircuit.com) |
| @powston-com/electrical-symbols | npm | github.com/powston/electrical-symbols | MIT | 0.1.0 | 2026-02-11 | 43 | React SVG electrical schematic symbols, **IEC 60617 / AS 60617** |
| @tscircuit/layout | npm | (npm only) | ISC | 0.0.29 | 2024-10-30 | 3 | Customise tscircuit **schematic** and pcb layouts |
| **@tscircuit/schematic-corpus** | npm | (npm only) | unstated | 0.0.114 | 2025-08-02 | 0 | **A corpus of schematic layouts** — a benchmark set, not a tool |
| kicadfiles | PyPI | github.com/Steffen-W/KiCadFiles | MIT | 1.0.5 | 2025-10-06 | 9 | Comprehensive parser/manipulator for KiCad file formats |
| kicad-tools | PyPI | github.com/rjwalters/kicad-tools | MIT | 0.24.0 | 2026-10-20 | 80 | Parsing and manipulating KiCad schematic **and** PCB files |
| kicad-monkey | PyPI | github.com/wavenumber-eng/kicad_monkey | MIT | 2026.9.7 | 2026-09-07 | 20 | KiCad parser, round-trip and **2D rendering** |
| kicad-sym | PyPI | github.com/diodeinc/pcb | MIT | 0.5.3 | 2026-08-14 | 0 | KiCad symbol S-expression helper (**diodeinc/pcb** — known project, PyPI surface not previously noted) |
| KiCadRW | PyPI | github.com/FabriceSalvaire/kicad-rw | GPLv3 | 0.1 | 2021-05-16 | 1 | Read/write KiCad Sexpr format |
| kicad-core | PyPI | pypi.org/project/kicad-core/ | GPL-3.0+ | 0.1.0 | 2026-07-10 | 3 | Lean KiCad S-expression read/emit primitives |
| **kicad-page-renumber** | PyPI | pypi.org/project/kicad-page-renumber/ | unstated | 1.0.0 | 2026-07-10 | 1 | **Reorders and renumbers KiCad schematic SHEETS by hierarchy** — sheet-level arrangement intent |
| kicad (gem) | RubyGems | rubygems.org/gems/kicad | (gem page) | 0.9.8 | — | — | Loads and rewrites KiCad s-expression files into a tree for scripting |
| kut | RubyGems | rubygems.org/gems/kut | (gem page) | 0.1.0 | — | — | KiCad utils and tools for generation and manipulation |
| fritzing | RubyGems | github.com/bfoz/fritzing | (gem page) | 0 | — | — | Read and write Fritzing sketches |
| eda (gem) | RubyGems | github.com/zml/eda | (gem page) | 0.0.1 | — | — | Classes and methods for standard EDA filetypes |
| kicad-data | Hackage | hackage.haskell.org/package/kicad-data | (Hackage page) | — | — | — | **The only in-scope Haskell package found.** KiCad data parsing |
| github.com/panyam/agni/readers/kicad | pkg.go.dev | pkg.go.dev/github.com/panyam/agni/readers/kicad | (repo) | — | pub. 2026-10-28 | — | **"Reads KiCad s-expression files (.kicad_pcb, .kicad_sch) into the neutral IR"** (VERIFIED synopsis) |
| github.com/apparentlymart/go-kicad | pkg.go.dev | pkg.go.dev/github.com/apparentlymart/go-kicad | (repo) | — | pub. 2024-01-02 | — | KiCad formats in Go |
| github.com/OpenTraceLab/OpenTraceJTAG/pkg/kicad/schematic | pkg.go.dev | (as URL) | (repo) | — | pub. 2026-01-26 | — | KiCad schematic package within OpenTraceJTAG |
| github.com/geekman/kicad-norm | pkg.go.dev | (as URL) | (repo) | — | pub. 2021-08-23 | — | KiCad file normaliser (diff-stability) |
| github.com/rustyoz/gokicadlib | pkg.go.dev | (as URL) | (repo) | — | pub. 2023-10-05 | — | KiCad library in Go |
| **electron-rare/kicad9plus-sch-corpus** | Hugging Face | huggingface.co/datasets/electron-rare/kicad9plus-sch-corpus | **CC-BY-SA-4.0** | — | mod. 2026-05-11 | 65 dl | **A corpus of KiCad 9+ SCHEMATICS as s-expression text.** Tagged `deprecated` by its author |
| Ailiance-fr / electron-rare kicad9plus-permissive, -copyleft | Hugging Face | huggingface.co/datasets/Ailiance-fr/kicad9plus-permissive | CC-BY-SA-4.0 | — | mod. 2026-05-11 | 42 / 61 dl | Licence-partitioned KiCad schematic corpora, tagged `kicad, eda, schematic, s-expr` |
| **microsoft/SchGen_dataset** | Hugging Face | huggingface.co/datasets/microsoft/SchGen_dataset | **MIT** | — | mod. 2026-10-23 | 516 dl | **CONFIRMED.** Tagged `PCB, EDA, KiCAD, Hardware-Design, Schematic-Generation, Circuit-Design` |
| Ohmatic/human-verified-schematics-v1 | Hugging Face | huggingface.co/datasets/Ohmatic/human-verified-schematics-v1 | CC-BY-4.0 | — | mod. 2026-08-15 | 499 dl | **Human-verified** schematics; tagged `pcb, kicad, eagle, schematics, hardware` |

## D) RENDERS or converts schematics

| Name | Registry | URL | Licence | Version | Last release | Deps | What it does (RELAYED) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| netlistsvg | npm | github.com/nturley/netlistsvg | MIT | 1.0.2 | 2020-12-12 | 12 | Renders a schematic from a netlist (**known**) |
| netlist2svg | npm | github.com/ajsb85/netlist2svg | MIT | 1.2.0 | 2026-06-16 | 10 | **Maintained fork of netlistsvg** — the known one last shipped 2020 |
| @johnnycubides/netlist2svg | npm | github.com/johnnycubides/netlist2svg | MIT | 1.2.1 | 2026-08-25 | 10 | Another maintained netlistsvg line |
| @silimate/netlistsvg | npm | github.com/nturley/netlistsvg | MIT | 1.1.4 | 2025-05-30 | 11 | Silimate's netlistsvg fork |
| @seekthought/kiweb | npm | (npm only) | MIT | 0.1.0 | 2026-09-28 | 0 | Read-only KiCad **schematic**/PCB/symbol rendering on HTML canvas, as React components |
| @huaqiu/ecad-renderer | npm | (npm only) | unstated | 0.2.4 | 2026-08-27 | 3 | Reusable KiCad POD renderer extracted from ECAD Viewer |
| @tscircuit/schematic-viewer | npm | github.com/tscircuit/schematic-viewer | unstated | 2.0.105 | 2026-10-13 | 12 | React component for viewing Circuit JSON as a schematic |
| kicadiff | npm | github.com/sksat/kicadiff | MIT | 0.2.0 | 2026-05-24 | 3 | Visual diff for KiCad PCB **and schematic** files |
| eagle-to-svg | npm | github.com/dvdfreitag/eagle-to-svg | MIT | 0.0.3 | 2016-08-24 | 1 | Renders Eagle CAD schematic and board files as SVG |
| kicad2svg | npm | github.com/joeferner/node-kicad2svg | MIT | 0.0.2 | 2015-06-16 | 2 | Converts KiCad files to SVG |
| @zdv/kiview | npm | github.com/zhangyx1998/KiView | MIT | 0.1.2 | 2026-10-21 | 5 | KiCad projects to a static site: board cards, 3D, layer browser, **schematic**, BOM |
| kicadpreview | npm | (npm only) | unstated | 1.0.12 | 2026-08-25 | 0 | KiCad ECAD viewer: SCH / PCB / 3D / BOM preview |
| @kreijstal/fritzing-wasm | npm | (npm only) | GPL-3.0+ AND CC-BY-SA-3.0 | 2026.7.28 | 2026-10-02 | 0 | **Fritzing's breadboard, schematic and PCB editor compiled for the browser** |
| @rich-netlist/runtime | npm | github.com/rich-netlist/rnl | MIT AND CC0-1.0 AND OFL-1.1 | 0.5.3 | 2026-10-27 | 0 | SPICE/Spectre netlists read into Documents a viewer draws |
| naja-schematic | PyPI | github.com/keplertech/naja-schematic | Apache-2.0 | 0.2.0 | 2026-10-13 | 7 | Interactive schematic viewer for najaeda netlists, in Jupyter or a browser |
| ltspice-to-svg | PyPI | github.com/Jianxun/ltspice_to_svg | MIT | 0.2.0 | 2025-08-06 | 1 | Converts LTspice schematics to SVG |
| ltspice2svg | PyPI | github.com/harshvinay752 | MIT | 2021.6 | 2021-01-27 | 0 | LTspice file to SVG |
| spice2wireviz | PyPI | git.supported.systems/warehack.ing/spice2wireviz | MIT | 2026.2.14 | 2026-02-13 | 7 | Converts LTspice netlists to WireViz wiring diagrams |
| svgscheme | PyPI | pypi.org/project/svgscheme/ | MIT | 0.0.2 | 2026-02-10 | 6 | SVG to SCHEME to HTML generator |
| kicad-snapshot | PyPI | github.com/tanakamasayuki/kicad-snapshot | MIT | 1.0.6 | 2026-02-26 | 3 | Snapshot and visual diff for KiCad projects |
| kicad-gitdiff | PyPI | github.com/maersdal/kicad_gitdiff_cli | Apache-2.0 | 0.0.5 | 2024-03-12 | 0 | Visual diff with git and KiCad |
| schemdraw-mcp-server (+ iflow mirror) | PyPI | github.com/fukayatti/schemdraw-mcp-server | MIT | 0.1.0 | 2025-08-07 | 11 | MCP server fronting schemdraw |
| **eda-view** | crates.io | github.com/meawoppl/pastebom.com | (crates page) | 0.1.0 | 2026-10-22 | — | **KiCad schematic, PCB and Gerber parsers plus a reified 2D scene with SVG/Canvas renderers** |
| **vector-text-newstroke** | crates.io | github.com/breqdev/vector-text | (crates page) | 0.1.1 | 2026-02-25 | — | **Renders text in the NewStroke vector font, i.e. the KiCad font** — the exact primitive for predicting schematic text extents |
| kicad_newstroke_font | crates.io | github.com/kicad-rs/kicad_newstroke_font | (crates page) | 0.1.0+6.0.0 | 2022-01-05 | — | KiCad v6 NewStroke font raw data |
| kirin-rs | crates.io | github.com/markhakansson/kirin | (crates page) | 0.1.0 | 2026-06-15 | — | Diff tool for KiCad projects |
| Valber/kicad_sch2image | Software Heritage | github.com/Valber/kicad_sch2image | (repo) | — | — | — | `.kicad_sch` to an image. Not on any registry. |

## E) ADJACENT but out of scope

Reasons are given in four words each, as asked.

**PCB layout / copper (not schematic):** `@tscircuit/capacity-autorouter`,
`@tscircuit/krt-wasm`, `@tscircuit/copper-pour-solver`,
`@tscircuit/circuit-json-routing-analysis`, `zap-pcb-mcp`, `eda-copilot-router`,
`topola`, `pnsrouter`, `eisler-core`, `kicad-draw`, `kicad-via-patterns`,
`kicad-parts-placer`, `kicad-returnpath`, `kicad-signal-path`,
`kicad-pycbnew`, `circuitpainter`, `KicadModTree`, `via-footprint`,
`@huaqiu/dsh-tool-pcb-autoplacement`, `layoutpreview`, `silkgen`,
`kicad-captouch`, `mach3-pcb-autoleveller` — *copper, not schematic sheet*.

**Gerber / fabrication:** `@tracespace/*` (all), `@sctg/*`, `@hpcreery/*`,
`gerber_parser`, `gerberx2`, `lib_gerber_edit`, `openjlc`, `nextjlc`,
`TransJLC`, `pcb-stackup-core`, `stackup-eda`, `kicad-fab-export`, `ki2jlc`,
`yy1`, `pos2charmhigh`, `kicad-to-openpnp`, `neoden-kicad` — *post-layout
manufacturing data only*.

**Simulation:** `PyLTSpice`, `spicelib`, `kuPyLTSpice`, `ltspice`,
`ltspice-mcp`, `circuit-mcp`, `mcltspice`, `spicelib-mcp`, `SymCircuit`,
`kicadODE`, `netlist2ss`, `brownout`, `spicey`, `@spice-ts/core`,
`@o.z/ngspice-wasm`, `ngspice-rs`, `sindr`, `thevenin-*`, `cayenne`,
`reda-sp*`, `general-*`, `@tscircuit/ngspice-spice-engine`,
`autocda-verify-mcp`, `@zesun33/mcp-spice`, `analog-filter-designer`,
`ltspice-agent`, `pytorch2ltspice`, `circuit-json-to-spice` — *solves, does not
draw*.

**BOM / parts / purchasing:** `easyeda2kicad`, `atopile-easyeda2kicad`,
`easyeda2ato`, `easyeda2kicad-rs`, `JLC2KiCadLib`, `easylcsc4kicad`,
`part2kicad`, `parts2kicad`, `kicadcomponent`, `kicad-jlc-manager`,
`kicad-vault`, `kicad-bom`, `kicad_bom`, `kicad_bom_wizard`,
`kicad-netlist-reader`, `inventree-kicad-plugin`, `@jlcpcb/*`, `tidybom`,
`electro-grammar`, `kipm`, `@hpm-registry/cli`, `qeda`, `edalm`,
`kicad-partspec`, `kicad-libsync`, `kicad-auto-lib`, `kicad-symbol-merge`,
`kicad-symbol-tool`, `kicad-symlib-utility`, `KicadSearch`,
`@sheetsdata/mcp`, `datasheet-cli`, `npnp`, `easyeda-monkey` — *sourcing, not
draughtsmanship*.

**Digital / VLSI netlists (no sheet):** `netlistx`, `netlistx-rs`,
`netlist-graph`, `netlist-carpentry`, `netlistdb`, `netlistquery`,
`safety-net`, `libreda-db`, `libreda-sta`, `nl-compiler`, `sverilogparse`,
`verilog-netlist-parser`, `yosys-netlist-json`, `yosys2digitaljs`,
`eda-netlist-parser`, `eda-liberty-parser`, `eda-sdf-parser`,
`eda-verilog-parser`, `eda-ibis-parser`, `fpga_netlist`, `kfnetlist`,
`celox-frontend-sdk`, `struo-celox`, `texo-struo`, `veryl2chip-eda`,
`klayout-connect`, `substrate-eda`, `oxieda`, `makai`, `netlist-db`,
`blifutils` — *chip netlists, no sheet*.

**Agent / MCP wrappers around KiCad (no drawing claim):** `kicad-mcp`,
`kicad-mcp-kipy`, `kicad-mcp-server`, `mcp-kicad`, `mckicad`, `kicad-eda-mcp`,
`codex-kicad-mcp`, `kicad-buddy`, `kicad_buddy`, `kicad-ai-agent`,
`kicad-assistant`, `kicad-copilot-mcp`, `@spark-apps/kicad-mcp`,
`@theavi/kicad-mcp`, `@bacnh85/pi-kicad`, `@fingerskier/pi-kicad`,
`@fingerskier/pi-skidl`, `@-kicadai/kicad-code`, `@haiboxie11/kicad`,
`@heypcb/mcp`, `pcbcode`, `pcb-studio`, `circuit-mcp`, `@buildwithtrace/*`,
`buildwithtrace`, `forge-altium-mcp`, `@vlabsoft/easyeda-pro-mcp`,
`easyeda-copilot-mcp`, `easyeda-mcp-pro`, `jlceda-schematic-helper`,
`@yuanzihao/schemcp`, `@iflow-mcp/*`, `@hybridlabor-api/bdb-hardware-pcb`,
`@oguzkaganozt/opencode-studio`, `oh-my-embedded`,
`analog-chip-design-agents`, `@fateforge/xpedition-cli`, `4k7pcb`, `typmax`,
`copperhead` (**known**), `kicad-mcp-pro` (**known**), `mcp-server-kicad`
(**known**) — *wraps a tool, draws nothing*.

**Adjacent diagram domains (method may transfer, domain does not):**
`transit-map` (metro maps by **mixed-integer programming** — the only
MIP-based schematic layout found anywhere), `@offtrailstudio/transit-mapper`,
`TikZ-trackschematic` (Zenodo, railway), `@willcgage/module-schematic`
(model railway), `leaflet-schematic`, `tosijs-floorplan`,
`@cartomancy/react`, `NN-SVG` (Zenodo), `vtabbott/Neural-Circuit-Diagrams`
(HF), `well-schematics`, `wellschematicspy` (boreholes), `cDraw` (chemistry),
`@loop-lang/viz`, `almond-harness-studio`, `wireviz-yaml-generator`,
`spice2wireviz`, `vue-wiring-diagram`, `wiring-diagram-mcp`,
`@opendeviceio/adapters`, `@openpowershift/logic-diagram-language` (also
listed in A) — *different domain's diagrams*.

**Name collisions that dominate every registry:** Angular/Nest/Nx
"schematics" (code generators — hundreds on npm, `@mondosha1/*` alone is 11),
`schematichq` (feature flags — PyPI, npm, RubyGems, Go), `schematics` /
`schematic_core` / `schematic_types` (data validation — PyPI, crates),
Minecraft/Mindustry/Litematica `.schem` files (`@enginehub/schematicjs`,
`msch`, `mindus`, `plandustry`, `schematic-wgpu*`, `mapartcraft-parser`),
SPICE the **remote-desktop protocol** (`spice-html5`, `ryll`,
`shakenfist-spice-*`), SPICE the **NASA ephemeris toolkit** (`rsspice`,
`webspice`, `timecraftjs`, `@usgs-astrogeology/spiceql`), `git-spice`
(stacked branches), `spice.ai` (data runtime), "Bungee Spice" (a Google
font, 7 packages), and *exploratory data analysis* on PyPI — *homonym, wrong
domain*.

---

## Negative results, stated as findings

1. **Hackage: zero.** Ten queries. `kicad-data` is the only in-scope package in
   the entire Haskell ecosystem, and it is a parser. `eeschema` returns 0.
   **There is no Haskell schematic draughtsmanship.** (VERIFIED)

2. **RubyGems: effectively zero.** Four in-scope gems, all parsers, all
   bucket C, the newest with a version number of `0`. `eeschema` → 0,
   `schematic layout` → 0, `circuit drawing` → 0, `electronics cad` → 0.
   (VERIFIED)

3. **Zenodo: effectively zero for this domain.** Eight queries against the
   software record type. After filtering, 76 candidates and **two** in-scope,
   neither a layout engine: `TikZ-trackschematic` (railway track schematics)
   and `snp2le` (S-parameter to lumped-element netlist). `IMMS-Ilmenau/netlist-carpentry`
   is a DOI mirror of a package already found on PyPI.
   **Academic schematic-layout code is not being deposited in Zenodo.** (VERIFIED)

4. **Nobody measures legibility.** See the note under bucket B. No package in
   any of the nine sources claims to score, lint or gate a schematic on
   readability. The closest artifacts are **`pcb-maker`** (a scorer, but for
   PCB agents) and **`tscircuit/schematic-layout-testing`** (a test harness,
   Software-Heritage-only). (VERIFIED as an absence across the queries run.)

5. **Software Heritage found two things no registry has.**
   `Flians/netlist2schematic` and
   `damdoy/procedural-electronic-schematic-generation` are both exactly on
   topic and both absent from PyPI, npm, crates.io, RubyGems, Hackage and
   pkg.go.dev. **A registry-only sweep misses them entirely** — which is the
   argument for having swept SWH at all. (VERIFIED)

6. **`microsoft/SchGen` is real.** Both the model (MIT, 338 downloads, tagged
   `Schematic-Generation`, `KiCAD`) and `microsoft/SchGen_dataset` (MIT, 516
   downloads) were fetched from the Hugging Face API in this pass. The prior
   report of it is **CONFIRMED**, not relayed. (VERIFIED)

7. **Hugging Face holds schematic CORPORA, which no package registry does.**
   `electron-rare/kicad9plus-sch-corpus` (CC-BY-SA-4.0, KiCad 9+ schematics as
   s-expression text, author-tagged `deprecated`), the licence-partitioned
   `kicad9plus-permissive` / `-copyleft` pair, and
   `Ohmatic/human-verified-schematics-v1` (CC-BY-4.0, 499 downloads,
   human-verified). Together with `@tscircuit/schematic-corpus` on npm, these
   are the only **evaluation sets** this sweep found. (VERIFIED)

8. **The TypeScript-native shortlist is short and specific.** The host project
   is TypeScript/bun. The zero-dependency, TypeScript-first, in-scope packages
   are: **`@wire-lang/core`** (MIT, parser + schematic model + layout engine +
   SVG renderer, 0 deps), **`@schemd/core`** (MIT, text-to-SVG schematic
   compiler, 0 deps), **`@tscircuit/matchpack`** / **`schematic-trace-solver`**
   / **`schematic-match-adapt`** (0 deps each, layout and trace solvers),
   **`kicad-sch-ts`** (MIT, schematic-specific), **`kicad-sexpr-parser`**
   (MIT, 0 deps), **`spicets`**, and **`kicadts`** (already known).
   **`d3-hwschematic`** is the one ELK-backed renderer, but EPL-1.0 and last
   released 2021-02-22. (VERIFIED: licences, dep counts and dates all from the
   npm registry in this pass.)

---

## What this method WOULD HAVE MISSED

Stated plainly, because a completeness claim is worth nothing without it.

1. **Anything whose name AND summary AND keywords avoid every electronics
   word.** The PyPI pass was exhaustive over *names* (all 925,633) but triage
   read only `summary`, `keywords` and classifiers — **never the README or the
   long description.** A package called `arrange` whose summary says "places
   boxes and routes edges on a grid", with the schematic use only in its
   README, is invisible to this sweep. This is the single largest hole and it is
   the same hole the previous name-driven passes had, moved one field to the
   right.

2. **General graph-layout libraries, which are where the actual algorithms
   live.** `elkjs`, `graphlib`, `dagre`, `graphviz`, `OGDF`, `adaptagrams`/`libavoid`,
   `yFiles` do orthogonal routing, port constraints and crossing minimisation —
   **the core of schematic placement** — and none of them mention schematics, so
   none survived an electronics-vocabulary filter. The sweep found them only
   *indirectly*, as the dependency of something else: `d3-hwschematic` and
   `@electron-lang/schematic-diagram` both name **elkjs**. **A dedicated sweep of
   graph-layout packages, triaged for orthogonal/port-constrained routing rather
   than for the word "schematic", is the obvious next pass and was not done here.**

3. **Monorepo subdirectories that are not separately published.** `diodeinc/pcb`
   surfaced three different ways in this sweep (PyPI `kicad-sym`, crates
   `gerberx2` and `pcb-ir`, npm `@diodeinc/pcb-zen-wasm`) — so a project's
   schematic code may sit in a repo whose published packages are all named after
   something else. Conversely, KiCad's own `kicad-cli` schematic plotting, the
   thing this project already depends on, **appears in no registry at all.**

4. **GitHub and GitLab, unsearched.** Only Software Heritage's origin index was
   swept, and it matches on **origin URL text**, not repository content — which
   is why it returned 14 repos literally named "kicad-schematics" and only two
   genuinely novel tools. A repository called `sheetwright` that lays out
   schematics brilliantly and has never been packaged or named for it is missed
   by every source here. SWH's content-search API (`/api/1/content/search/`) was
   not used.

5. **Everything non-English and everything non-Latin-script in its naming.** The
   filters are English regexes. Chinese-language packages survived only when
   their *names* were Latin (`@huaqiu/*`, `@windypro-rourou/dsh-eda`,
   `@jlceda/*`) and their summaries happened to contain `KiCad` or `EDA`. The
   Korean `kicad-ai-agent` and the Japanese `@ry-krystal/kicad-converter`
   survived the same way. **A package described only in Chinese, Japanese or
   Korean without a Latin keyword is invisible here.** Given how much of the
   EasyEDA/JLCEDA ecosystem is Chinese-language, this is a material gap.

6. **Closed, commercial and hosted tools.** Registries list what is published.
   Altium, Cadence, Mentor/Siemens, Zuken and every SaaS schematic editor appear
   here only as thin client wrappers (`@fateforge/xpedition-cli`,
   `altium-auth`, `@jonmash/n8n-nodes-altium365`). Whatever placement engine
   sits inside Altium is not in any registry and this method cannot see it.

7. **Academic code on university pages, OSF, Figshare, IEEE DataPort and
   personal homepages.** Only Zenodo was swept among research hosts, and it came
   back essentially empty — which **should not be read as "the literature has no
   code."** It should be read as "the literature does not deposit code in
   Zenodo." Those other hosts were not touched.

8. **Deleted, yanked and pre-publication packages.** 47 of the 1,205 PyPI
   projects fetched returned an error — they exist in the name index and have no
   metadata. Those 47 were triaged as nothing. At least two npm entries found
   here (`dsh-eda`, `dsh-netlist`, `typmax`, `4k7pcb`) are explicit
   **name reservations** with no code, which is a reminder that presence in a
   registry is not presence of a tool.

9. **The thing no sweep can do: judging any of it.** Nothing here was installed
   or run. Not one schematic was generated and looked at. Every capability in
   the "what it does" column is the author's own claim, and this project's own
   governance says a figure in prose is a transcription with a date on it. **This
   inventory is a candidate list, and the next step for any row is to make it
   draw something and read the result.**

---

## Reproducing this

Scripts were written to the session scratchpad, not committed (they are
single-use sweep code, and the registries are the durable artifact):

| Step | What it does |
| --- | --- |
| `pypi_names.py` | Downloads `pypi.org/simple/` as v1 JSON and regex-sweeps all 925,633 names |
| `pypi_narrow.py` | Drops the `schema`-without-`schematic` population |
| `pypi_fetch.py` | Fetches `pypi.org/pypi/<name>/json` for all 1,205, resumable, 16 threads |
| `pypi_triage.py` / `pypi_triage2.py` | Two-tier relevance filter over summary, keywords and classifiers |
| `npm_sweep.py` / `npm_retry.py` | 37 queries against `registry.npmjs.org/-/v1/search`, with 429 backoff |
| `npm_triage.py` / `npm_detail.py` | Filter, then per-package licence and dep counts from the registry |
| `others.py` / `others_triage.py` | crates.io, RubyGems, Hackage APIs |
| `research_hosts.py` | pkg.go.dev (HTML), Zenodo API, Software Heritage, Hugging Face API |
| `verify.py` / `final_checks.py` | Individual pkg.go.dev synopsis fetches; SWH retry; HF record detail |

**One parsing defect is recorded rather than hidden:** the first pkg.go.dev pass
paired package paths with synopses positionally, and the pairing was **wrong** —
it attributed "parse eagle schematic files" to `github.com/mars/schematic` and an
IP-address-list synopsis to a netlist package. Every Go row in this inventory was
therefore **re-fetched individually** and its synopsis read from its own page.
`pkt.systems/schemator`, which the bad pairing had made look like a KiCad
converter, turned out on individual fetch to be a **JSON Schema helper** and is
excluded. `git.sr.ht/~dango/go-netlists` is **IP address lists**, not circuits.
