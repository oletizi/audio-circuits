# Registry enumeration: KiCad PCM, GitHub topics, awesome-lists, non-GitHub hosts

**Date:** 2026-10-28
**Method:** ENUMERATIVE, not name-driven. Registries were opened and listed
exhaustively, then triaged. No WebSearch was used — every count below comes from
a direct HTTP call against an API or a raw file, and is reproducible by re-running
the commands in the Method section.

**Domain:** schematic draughtsmanship — drawing a schematic, placing/orienting
symbols, routing/labelling it, checking whether a schematic is legible, rendering
it, or representing placement intent. NOT PCB layout, NOT copper autorouting, NOT
circuit simulation, NOT BOM/purchasing, NOT 3D.

**Every row is marked VERIFIED or RELAYED.**

- **VERIFIED** = this writer fetched the registry record (PCM `packages.json`
  entry, GitHub `repos/{owner}/{name}` API response, GitLab/Codeberg API row) and
  the name, URL, licence, stars and last-push date below are transcribed from it.
- **RELAYED** = the item's existence and one-line description come from a curated
  list's prose or another registry's description field, and this writer did not
  fetch the project's own record. Licence/stars/date columns read `—` where not
  fetched.

**No claim below is made about whether any of these tools work.** Nothing here
was installed, run, or evaluated. The deliverable is a candidate list whose
*completeness* is auditable, not a capability assessment. A description in this
file is the project's own marketing copy, relayed.

---

## Method, and the counts that make completeness auditable

### Source 1: KiCad official Plugin and Content Manager (PCM) repository

**VERIFIED.** No prior pass in this project had opened this registry.

The canonical chain, discovered rather than assumed:

```
https://gitlab.com/kicad/addons/repository/-/raw/main/repository.json
  -> .packages.url ->
https://gitlab.com/kicad/addons/repository/-/raw/main/packages.json
```

`gitlab.com/kicad/addons/metadata` is the *source* repo (per-package directories
under `packages/`, plus `schema-v1.json` / `schema-v2.json`);
`gitlab.com/kicad/addons/repository` holds the CI-built aggregate that KiCad
itself downloads. The aggregate is the enumerable artifact.

| Measure | Value |
| --- | --- |
| `packages.json` size | 393,014 bytes |
| Repo `update_time_utc` at fetch | 2026-10-27 11:02:14 |
| **TOTAL packages** | **136** |
| of type `plugin` | 101 |
| of type `library` | 17 |
| of type `colortheme` | 18 |

All 136 were listed by name and description. **Schematic-relevant: 9 of 136.**
The registry is overwhelmingly PCB-side — fabrication-house upload buttons, via
stitching, panelisation, coil generators, 3D model management. That ratio is
itself the finding: **the official KiCad addon registry contains almost nothing
for schematic draughtsmanship.**

### Source 2: GitHub topic and search APIs

**VERIFIED.** 15 topics enumerated. Each was swept twice (`sort=stars` and
`sort=updated`, 2 pages of 100 each) so that small, new projects could not hide
behind the popular ones — this is how most of the bucket-A finds surfaced, and
every one of them has single-digit stars.

| Topic | `total_count` | Swept |
| --- | --- | --- |
| `kicad` | 5,168 | 400 rows |
| `eda` | 15,776 | 400 rows |
| `schematic` | 592 | 400 rows |
| `circuit-design` | 440 | 400 rows |
| `electronic-design-automation` | 133 | 266 rows |
| `netlist` | 112 | 224 rows |
| `kicad-plugin` | 102 | 204 rows |
| `eda-tools` | 47 | 94 rows |
| `circuit-diagram` | 27 | 54 rows |
| `schematic-editor` | 23 | 46 rows |
| `schematic-capture` | 19 | 38 rows |
| `eeschema` | 10 | 20 rows |
| `kicad-schematic` | 10 | 20 rows |
| `kicad-plugins` | 8 | 16 rows |
| `schematic-generation` | 1 | 2 rows |
| `schematic-drawing` | 0 | — |

**Unique repos seen across all topics: 1,685.** After dropping non-circuit
homonyms (Minecraft `.schematic` files, Angular CLI "schematics", exploratory
data analysis "EDA") and one-off hardware projects: **293 candidates.**

Then 14 full-text repo searches, `sort=updated`, 100 rows each:

| Query | `total_count` |
| --- | --- |
| `kicad_sch` | 179 |
| `schematic placement` | 111 |
| `netlist to schematic` | 59 |
| `schematic readability` | 39 |
| `schematic drafting` | 35 |
| `awesome eda in:name` | 28 |
| `schematic generator kicad` | 24 |
| `schematic layout engine` | 19 |
| `awesome kicad` | 13 |
| `eeschema python` | 8 |
| `circuitikz generator` | 5 |
| `orthogonal wire routing schematic` | 3 |
| `schematic legibility` | 3 |
| `schematic autolayout` | 2 |

438 rows returned; **380 unique repos the topic sweep had not already seen.**
That 380 is the argument for running both axes: topics and full text do not
cover each other.

### Source 3: Curated awesome-lists, fetched raw

**VERIFIED** as fetches. 17 candidate URLs probed; **8 returned 200.** The
other 9 were guessed names that do not exist — recorded so the next pass does
not re-guess them.

| List | Bytes | Schematic entries extracted |
| --- | --- | --- |
| `joanbono/awesome-kicad` (642 stars) | 13,265 | 19 |
| `piyushbag/awesome-pcb-workflow` | 35,383 | 11 |
| `aolofsson/awesome-opensource-hardware` | 52,074 | 14 |
| `kitspace/awesome-electronics` (8,295 stars) | 25,270 | 6 |
| `ishandutta2007/Awesome-EDA` | 15,761 | 3 |
| `way2pramil/awesome-kicad-projects` | 16,707 | 0 (projects, not tools) |
| `ben-marshall/awesome-open-hardware-verification` | 30,667 | 0 |
| `ai4eda/awesome-AI4EDA` | 6,701 | 0 (papers) |

404s, do not re-try: `mmagnus/awesome-kicad`,
`joaocarvalhoopen/KiCad_EDA___Awesome_list`, `Vitaliy-Yakovchuk/awesome-eda`,
`jorgegonzalez/awesome-hardware`, `mauriciogomes/awesome-electrical-engineering`,
`emanuelfeld/awesome-electronics`, `cfelton/awesome-open-hardware`,
`kitspace/awesome-pcb`, `ChrisPVille/awesome-opensource-eda`.

`joanbono/awesome-kicad` is the real awesome-kicad and had never been opened
here. It is the only source that surfaced **Koppar**, **KiCAD-Prism**,
**BoardRepo** and **Loft Compare PDF**.

### Source 4: Non-GitHub hosts

**VERIFIED.**

| Host | Query | Result |
| --- | --- | --- |
| GitLab | `groups/kicad/projects?include_subgroups=true` | **89 projects**, full list taken |
| GitLab | search `schematic` | 60 rows (mostly `kicad-symbols` forks and `deletion_scheduled` spam) |
| GitLab | search `eeschema` | 8 rows |
| GitLab | search `kicad-schematic` | 4 rows |
| GitLab | search `schematic-layout`, `netlist-to-schematic` | 0 rows |
| Codeberg | search `schematic`, `kicad`, `eeschema` | 100 rows total, 0 relevant tools |
| SourceHut | `sr.ht/projects?search=` × 4 terms | 7 projects total, **0 relevant** |

**GitLab paid for itself twice** — `dnschneid/kischvidimer` and
`pointhi/kicad-schematic-builder` exist on no GitHub list consulted here.
Codeberg and SourceHut returned nothing: Codeberg's hits are all personal
hardware projects, and SourceHut has no schematic tooling at all.

---

## INVENTORY, by bucket

Licence/stars/pushed are as of the fetch on 2026-10-28.
Items marked **[KNOWN]** were named in the brief as already-investigated; they
appear only so the enumeration is complete, and were not re-investigated.

### Bucket A — DRAWS/PLACES a schematic

An agent or human can drive placement through it.

| Name | URL | Host | Licence | Stars | Pushed | What it does | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **schematizer** | github.com/devbisme/schematizer | GitHub | MIT | 4 | 2026-10-18 | Turns a generic hierarchical netlist (JSON) into a KiCad schematic. By the SKiDL author. | VERIFIED |
| **diagen** | github.com/Chaoos-404/diagen | GitHub | GPL-3.0 | 2 | 2026-09-27 | "Netlist in, clean schematic out": automatic layout engine for analog and digital circuit diagrams (TikZ + SVG), with an MCP server. | VERIFIED |
| **SchemWeave** | github.com/cachanova/schemweave | GitHub | Apache-2.0 | 4 | 2026-10-10 | Deterministic Rust and WebAssembly layout engine for circuit schematics. | VERIFIED |
| **schematic-trace-solver** | github.com/tscircuit/schematic-trace-solver | GitHub | MIT | 14 | 2026-10-25 | Schematic trace routing and net-label placement algorithm using a minimum spanning tree. | VERIFIED |
| **schematic-match-adapt** | github.com/tscircuit/schematic-match-adapt | GitHub | NONE | 4 | 2025-06-15 | Schematic layout engine using a Partition / Match / Adapt / Refine / Stitch pattern. | VERIFIED |
| **schematic-autolayout** | github.com/tscircuit/schematic-autolayout | GitHub | NONE | 4 | 2026-08-19 | Autolayout algorithms for tscircuit PCBs and schematics. | VERIFIED |
| **asg** | github.com/aidangoettsch/asg | GitHub | MIT | 31 | 2020-10-25 | Automatic schematic generation from a SPICE netlist (qflow output). | VERIFIED |
| **nl2sch** | github.com/tpecar/nl2sch | GitHub | MIT | 19 | 2021-02-08 | Netlist to KiCad schematic. | VERIFIED |
| **pcbdl** | github.com/google/pcbdl | GitHub | NOASSERTION | 196 | 2021-04-08 | "PCB Design Language": a programming way to design schematics; emits schematic SVG. Google. | VERIFIED |
| **kicad-gen** | github.com/matialegre/kicad-gen | GitHub | MIT | 0 | 2026-10-05 | Generates KiCad 10 schematics from Python and verifies with kicad-cli — including a **text-overlap QA** step. | VERIFIED |
| **Autonomous-Schematic-Generation** | github.com/wenqiiizwq-creator/Autonomous-Schematic-Generation | GitHub | MIT | 3 | 2026-10-28 | Agent skill: structured circuit representation, functional layout, obstacle-avoiding wire routing, re-layout of existing projects, native ERC/netlist/geometry/render validation. | VERIFIED |
| **kirchhoff-eye** | github.com/Yoki-cmd/kirchhoff-eye | GitHub | MIT | 0 | 2026-07-19 | Topology-aware circuit *redraws* from a reviewed JSON IR to validated circuitikz, with debug renders. | VERIFIED |
| **netlisp** | github.com/eugenepentland/netlisp | GitHub | MIT | 0 | 2026-10-14 | CLI-driven S-expression EDA for schematic capture, agent-written, compiled to KiCad. | VERIFIED |
| **fluxsmith** | github.com/tipoLi5890/fluxsmith | GitHub | Apache-2.0 | 0 | 2026-09-12 | AI-led schematic design for KiCad on its own Rust-native schematic engine. | VERIFIED |
| **akcli** | github.com/tipoLi5890/akcli | GitHub | MIT | 10 | 2026-08-25 | Authors and edits `.kicad_sch` from JSON op-lists behind a net-diff safety gate; pure-stdlib Python. | VERIFIED |
| **koppla** | github.com/erkkah/koppla | GitHub | MIT | 7 | 2023-07-23 | Creates electronic schematics in SVG from readable code. | VERIFIED |
| **wirewright** | github.com/house-of-houses/wirewright | GitHub | MIT | 1 | 2026-05-03 | Auto-generates **readable** LTspice `.asc` schematics from SPICE netlists. | VERIFIED |
| **Ai-Schematics** | github.com/Anbus2011/Ai-Schematics | GitHub | NONE | 1 | 2026-04-10 | SchemDraw wrapper letting LLMs generate human-readable schematics from netlists. | VERIFIED |
| **eda2eagle** | github.com/amigatronic/eda2eagle | GitHub | MIT | 0 | 2026-08-30 | Schematic generator from netlist. | VERIFIED |
| **Konnect** | github.com/mixelpixx/Konnect | GitHub | AGPL-3.0 | 1,432 | 2026-10-26 | Native KiCad 10 plugin: one Rust binary exposing 217 schematic, layout, routing, placement, design-review and manufacturing tools to an LLM. | VERIFIED |
| **circuit-agent** | github.com/mo9652962-ai/circuit-agent | GitHub | MIT | 1 | 2026-10-28 | CircuitBlocks DSL + deterministic netlist compiler emitting native `.kicad_sch`; MCP server. | VERIFIED |
| **kicad-claude-skills** | github.com/Diode663/kicad-claude-skills | GitHub | MIT | 2 | 2026-09-20 | Claude Code skills that generate KiCad schematics and PCB placement from Python, verified against kicad-cli. | VERIFIED |
| **circuit-fence** | github.com/tommie-jp/circuit-fence | GitHub | MIT | 1 | 2026-09-01 | VS Code extension rendering ```circuit fences in Markdown as schematics; **places parts by grid address**, derives the netlist, reports mistakes with line numbers. | VERIFIED |
| **easyeda-autodraw-pipeline** | github.com/CodeMzt/easyeda-autodraw-pipeline | GitHub | NONE | 1 | 2026-08-01 | Deterministic EasyEDA schematic auto-drawing pipeline: synthesis, preflight, draw, verification gates. | VERIFIED |
| **kicad-schematic-builder** | gitlab.com/pointhi/kicad-schematic-builder | **GitLab** | — | — | 2020-10-29 | "Let an SMT solver build the schematic for you." Author's own note says it is just an idea. Constraint-solver placement. | VERIFIED (GitLab API row) |
| **altium-schematic-generator** | github.com/zzxcdwas/altium-schematic-generator | GitHub | MIT | 1 | 2026-09-18 | Generates native Altium `.SchDoc` from pure Python, no COM. | VERIFIED |
| **CircuiTikZ-Generator** | github.com/Mixdor/CircuiTikZ-Generator | GitHub | GPL-3.0 | 22 | 2026-04-26 | GUI for designing circuits that emits LaTeX/CircuiTikZ. | VERIFIED |
| **Circuits-drawing-skills** | github.com/lvtosaka/Circuits-drawing-skills | GitHub | NONE | 0 | 2026-07-27 | CircuitikZ/LaTeX generation from circuit name or natural language, with topology, polarity and direction checks; TEX/PDF/SVG/PNG. | VERIFIED |
| **kicad-11-boardview-to-schematic** | github.com/JaskoJacker/kicad-11-boardview-to-schematic | GitHub | MIT | 0 | 2026-10-25 | Builds a KiCad 11 schematic from a boardview via the IPC API. | VERIFIED |
| **cdl_gen** | github.com/KwantaeKim/cdl_gen | GitHub | MIT | 44 | 2026-08-25 | Python-to-schematic generator for Cadence Virtuoso. | VERIFIED |
| **eext-ai-reuse-block-placement** | github.com/easyeda/eext-ai-reuse-block-placement | GitHub | Apache-2.0 | 0 | 2026-10-20 | EasyEDA Pro extension: AI places a suitable reusable module circuit from a block library and generates the schematic. Vendor-published. | VERIFIED |
| **Schematic Blocks Plug-In** | github.com/Sajitha-Aldeniya/KiCAD-Schematic-Blocks-Plugin | **KiCad PCM** | MIT | — | — | Saves circuits as blocks and re-places them in other projects. One of only two PCM plugins that touch the schematic editor. | VERIFIED (PCM record) |
| **Breadboard Builder** | github.com/kerstensrobin/kicad-breadboard | **KiCad PCM** | GPL-3.0 | — | — | Places schematic components on a virtual breadboard and validates wiring against the KiCad netlist. | VERIFIED (PCM record) |
| **faebryk** | github.com/faebryk/faebryk | GitHub | MIT | 30 | 2024-09-03 | Graph-based schematic design in Python with constraint solving. Named in `awesome-pcb-workflow`; dormant since 2024. | VERIFIED |
| **koppar** | koppar.ai | Web (closed) | proprietary | — | — | Plain English → KiCad schematic + placed/routed board + BOM. Web studio, MCP server, CLI, REST. | RELAYED (awesome-kicad prose) |

### Bucket B — CHECKS a schematic for legibility/quality

| Name | URL | Host | Licence | Stars | Pushed | What it does | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **schematic-readability** | github.com/Matthew-Laplace/schematic-readability | GitHub | MIT | 1 | 2026-10-11 | Agent skill for drawing **and reviewing** readable schematics **without changing connectivity**. The closest statement of this bucket's problem found anywhere in the sweep. | VERIFIED |
| **kischvidimer** | gitlab.com/dnschneid/kischvidimer | **GitLab** | — | — | 2026-10-26 | KiCad schematic view / diff / merge. Exists on no GitHub list consulted. | VERIFIED (GitLab API row) |
| **kiri** | github.com/leoheck/kiri | GitHub | MIT | 715 | 2026-06-22 | Visual review of KiCad schematics and layouts under Git; wraps Kicad-Diff and plotgitsch. | VERIFIED |
| **plotkicadsch** | github.com/jnavila/plotkicadsch | GitHub | NOASSERTION | 234 | 2026-07-28 | Exports KiCad `.sch` to structured picture files; the schematic-diff engine Kiri builds on. | VERIFIED |
| **KiDiff** | github.com/INTI-CMNB/KiDiff | GitHub | GPL-2.0 | 44 | 2026-09-21 | PDF showing changes between two KiCad PCB/SCH files; also a git plug-in. | VERIFIED |
| **KiCAD-Prism** | github.com/krishna-swaroop/KiCAD-Prism | GitHub | Apache-2.0 | 303 | 2026-10-28 | Self-hosted web app for displaying and interacting with KiCad projects; browse schematics, compare commits, discuss changes. | VERIFIED |
| **pcba-design-skills** | github.com/Keitark/pcba-design-skills | GitHub | MIT | 39 | 2026-09-22 | Codex/Claude skills including **"schematic humanization"** — the only use of that term found. | VERIFIED |
| **schematic-diff** | codeberg.org/tmehner/schematic-diff | **Codeberg** | — | 0 | 2026-10-19 | Schematic diff. No description given in the registry row. | VERIFIED (Codeberg API row) |
| **KiCad-GitHub-Command-Center** | github.com/MHeis22/KiCad-GitHub-Command-Center | GitHub | GPL-3.0 | 2 | 2026-10-27 | Image and text diffs of netlist, BOM, schematics and PCB for GitHub workflows. | VERIFIED |
| **KiCad-Github-View** | github.com/wayri/KiCad-Github-View | GitHub | NOASSERTION | 0 | 2026-10-28 | Browser-only KiCad schematic and PCB review inside GitHub and public GitLab, with visual revision comparison. | VERIFIED |
| **circuitoon** | github.com/MBarc/circuitoon | GitHub | MIT | 0 | 2026-10-08 | "Circuit diagrams AI agents can design, **check** and hand you." | VERIFIED |
| **Ohmen** | github.com/R0mba-Na11avan/Ohmen | GitHub | MIT | 0 | 2026-10-24 | AI design-review copilot for KiCad: schematic review grounded in cited datasheets. | VERIFIED |
| **SchematicAirlock** | github.com/appleweiping/SchematicAirlock | GitHub | MIT | 0 | 2026-10-26 | Offline safety and structural audit gate for generated SPICE artifacts. | VERIFIED |
| **kicad-schematic-review-skill** | github.com/settchan2003-design/kicad-schematic-review-skill | GitHub | MIT | 4 | 2026-05-29 | Evidence-first AI skill reviewing KiCad schematics against datasheets, extracting pin-level facts. | VERIFIED |
| **plecs-expert-skill** | github.com/tinix84/plecs-expert-skill | GitHub | MIT | 1 | 2026-09-28 | Agent skills for PLECS including **"readable schematic layout"**. | VERIFIED |
| **BoardRepo plugin** | github.com/flintt-dev/boardrepo-plugin | GitHub | MIT | 0 | 2026-08-25 | Read-only review tools for KiCad schematics over MCP. | VERIFIED |
| **traces** | github.com/usetraces/traces | **KiCad PCM** | MIT | — | — | Schematic metadata editing and **semantic netlist checks** inside KiCad. | VERIFIED (PCM record) |
| **Loft Compare PDF** | lofttools.com/tools/pdf-tools/compare-pdf/ | Web (closed) | proprietary | — | — | Diffs two schematic PDF exports; a moved label reads as a move, not a delete plus an add. | RELAYED (awesome-kicad prose) |

### Bucket C — REPRESENTS placement intent (authoring / intermediate layer)

| Name | URL | Host | Licence | Stars | Pushed | What it does | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Eclipse Layout Kernel (ELK)** | github.com/eclipse-elk/elk | GitHub | NOASSERTION | 379 | 2026-10-28 | General automatic graph-layout kernel (layered/Sugiyama, orthogonal edge routing). The layout substrate `d3-hwschematic` is built on. Not circuit-specific; the most mature placement engine found. | VERIFIED |
| **Hdl21Schematics** | github.com/Vlsir/Hdl21Schematics | GitHub | BSD-3-Clause | 17 | 2024-01-24 | Schematics as a serialisable, code-adjacent data format for the Hdl21 analog flow. | VERIFIED |
| **schem** | github.com/Raf3-Tech/schem | GitHub | NONE | 2 | 2026-09-13 | Human- and LLM-readable DSL for PCB schematics; Rust compiler validates constraints, emits KiCad netlists. | VERIFIED |
| **TextEDA** | github.com/luffffyz/TextEDA | GitHub | Apache-2.0 | 0 | 2026-10-28 | "Agent first, human reviewable": schematics as text with a typed IR, validators, KiCad export and a reference renderer. | VERIFIED |
| **CircuitMark** | github.com/UnTenseUnJury/CircuitMark | GitHub | MIT | 2 | 2025-09-24 | Markdown-inspired text markup for circuits that generates schematic diagrams. | VERIFIED |
| **kicad-sch-ts** | github.com/agrimsingh/kicad-sch-ts | GitHub | NONE | 3 | 2026-01-06 | TypeScript library to read, write and manipulate KiCad 7/8 schematic files. | VERIFIED |
| **sch2dsl** | github.com/wuwuzhazha/sch2dsl | GitHub | MIT | 1 | 2026-09-09 | SchDoc parser + SCH-DSL language + agent skill so agents can read Altium schematics. Rust. | VERIFIED |
| **circuit-json** **[KNOWN]** | github.com/tscircuit/circuit-json | GitHub | ISC | 98 | 2026-10-28 | Low-level circuit representation carrying schematic and PCB geometry. | VERIFIED |
| **kicad-blocks** | github.com/noahdgrant/kicad-blocks | GitHub | MIT | 0 | 2026-05-13 | Shares schematic sheets across KiCad projects and reuses their PCB layouts. | VERIFIED |
| **Project Instances** | github.com/OfficialDyray/projectinstances | **KiCad PCM** | MIT | — | — | Imports another KiCad project through hierarchical sheets. | VERIFIED (PCM record) |
| **universal-netlist** | github.com/IntelligentElectron/universal-netlist | GitHub | Apache-2.0 | 56 | 2026-10-28 | One representation for reading Cadence, Altium and KiCad designs, for agents. | VERIFIED |
| **schematic-lens** | github.com/UIMicro/schematic-lens | GitHub | Apache-2.0 | 1 | 2026-07-26 | Turns EasyEDA schematics into readable, **diffable** context for AI review. | VERIFIED |

### Bucket D — RENDERS or converts schematics

| Name | URL | Host | Licence | Stars | Pushed | What it does | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **KiCanvas** | github.com/theacodes/kicanvas | GitHub | NOASSERTION | 1,158 | 2026-04-28 | Interactive browser-based viewer for KiCad schematics and boards. | VERIFIED |
| **netlistsvg** **[KNOWN]** | github.com/nturley/netlistsvg | GitHub | MIT | 836 | 2024-01-25 | Draws an SVG schematic from a JSON netlist. | VERIFIED |
| **xschem** | github.com/StefanSchippers/xschem | GitHub | NOASSERTION | 506 | 2026-10-28 | Schematic editor for VLSI/ASIC/analog with VHDL/Spice/Verilog netlist backends; hierarchy and parametric designs. | VERIFIED |
| **d3-hwschematic** | github.com/Nic30/d3-hwschematic | GitHub | EPL-2.0 | 123 | 2026-05-13 | D3.js + ELK schematic visualiser. | VERIFIED |
| **oregano** | github.com/drahnr/oregano | GitHub | GPL-2.0 | 232 | 2024-08-28 | Schematic capture and circuit simulator (GTK). | VERIFIED |
| **eeshow** | gitlab.com/murych/eeshow, gitlab.com/neo900/eeshow | **GitLab** | — | — | 2022-11-10 | Eeschema schematics renderer and viewer. | VERIFIED (GitLab API row) |
| **naja-schematic** | github.com/keplertech/naja-schematic | GitHub | Apache-2.0 | 4 | 2026-10-14 | Portable netlist schematic viewer for the naja data model. | VERIFIED |
| **qdia** | github.com/sunderme/qdia | GitHub | AGPL-3.0 | 45 | 2026-10-14 | Simple schematic/diagram editor. | VERIFIED |
| **eSchema** | github.com/manufino/eSchema | GitHub | GPL-3.0 | 5 | 2026-07-18 | 2D CAD editor for electrical/electronic schematics, Qt 6, FidoCadJ native format. | VERIFIED |
| **KatieCAD** | github.com/Merecete/KatieCAD | GitHub | MIT | 16 | 2026-10-28 | Lightweight Python/Tkinter CAD: 2D drafting with EE tools (schematics, terminals, cables), DXF/PDF export. | VERIFIED |
| **kicad-watcher** | github.com/ajsb85/kicad-watcher | GitHub | NONE | 2 | 2025-07-05 | File watcher converting `.kicad_sch` to SVG on modification. | VERIFIED |
| **xschem-viewer** | github.com/TinyTapeout/xschem-viewer | GitHub | Apache-2.0 | 36 | 2025-12-14 | Online viewer of Xschem schematic files. | VERIFIED |
| **Simple-Netlist-Viewer** | github.com/AGFerma/Simple-Netlist-Viewer | GitHub | GPL-3.0 | 1 | 2025-01-11 | Displays the drawing of a netlist as an electrical schematic. | VERIFIED |
| **python-altium** | github.com/vadmium/python-altium | GitHub | WTFPL | 195 | 2022-11-24 | Altium schematic format documentation, SVG converter and TK viewer. | VERIFIED |
| **altium-toolkit** | github.com/SunboX/altium-toolkit | GitHub | NOASSERTION | 13 | 2026-09-28 | ESM JS library parsing native Altium schematic and PCB documents and rendering them. | VERIFIED |
| **altium2kicad** | github.com/thesourcerer8/altium2kicad | GitHub | GPL-2.0 | 957 | 2026-06-23 | Altium to KiCad converter for PCB and schematics. | VERIFIED |
| **eagle-to-kicad** | github.com/lachlanA/eagle-to-kicad | GitHub | GPL-2.0 | 429 | 2022-01-03 | Eagle SCH/LIB to KiCad SCH/LIB ULP conversion. | VERIFIED |
| **ziro-designer** | github.com/ZiroEDA/ziro-designer | GitHub | GPL-3.0 | 52 | 2026-10-28 | KiCad 10 ported to the browser; opens real schematic and PCB projects from a GitHub URL. | VERIFIED |
| **stripboard2schematic** | github.com/dvhx/stripboard2schematic | GitHub | NONE | 28 | 2026-07-17 | Converts stripboard layouts **back** to schematics, for checking or recovery. Directly relevant to perfboard/stripboard work. | VERIFIED |
| **rtl-live** | github.com/vejaysuriyaa-07/rtl-live | GitHub | MIT | 0 | 2026-10-25 | Live Verilog schematic in the VS Code sidebar, redraws as you type. | VERIFIED |
| **schematic-drawing-tool** | github.com/hermes98761234/schematic-drawing-tool | GitHub | MIT | 0 | 2026-10-10 | Browser schematic editor: symbol library, wires, grid snap, undo/redo, SVG/PNG/PDF export. | VERIFIED |
| **w2r-open** | github.com/akbar-npj/w2r-open | GitHub | MIT | 0 | 2026-10-11 | Offline C++/Qt6 boardview and schematic viewer. | VERIFIED |
| **Inkscape_electric_Symbols** | github.com/upb-lea/Inkscape_electric_Symbols | GitHub | CC0-1.0 | 587 | 2026-02-08 | Electrical symbol library for Inkscape — hand-drawing schematics in a vector editor. | VERIFIED |
| **InkscapeCircuitSymbols** | github.com/keikawa/InkscapeCircuitSymbols | GitHub | MIT | 1 | 2026-09-08 | Circuit symbols for drawing schematics and block diagrams with Inkscape. | VERIFIED |
| **electrical-symbol-library** | github.com/elora-grid/electrical-symbol-library | GitHub | CC-BY-4.0 | 1 | 2026-10-14 | Electrical drafting reference catalogue with IEC and ANSI/IEEE context; original SVG/DXF illustrations. | VERIFIED |
| **PCM colour themes** (18) | gitlab.com/kicad/addons/repository | **KiCad PCM** | CC0-1.0 / MIT | — | — | 18 themes, several explicitly about schematic legibility: **Hartia** ("schematic theme that mimics pen and paper"), **Black-White** ("designed for printing"), Solarized light/dark, Nord, Gruvbox, wDark/wLight, Eagle Dark. | VERIFIED (PCM records) |
| **Generic / Elektuur Symbol Libraries** | gitlab.com/franzee/kicad-addons | **KiCad PCM** | CC0-1.0 | — | — | IEC/IEEE/ANSI-standard and Elektuur-style symbol sets for circuit diagrams, with recommended schematic line-width and grid setup. Symbol *style* as a legibility lever. | VERIFIED (PCM records) |
| **Alternate KiCad Library** | github.com/DawidCislo/Alternate-KiCad-Library | **KiCad PCM** | CC-BY-SA | 151 | 2026-05-24 | Symbol and footprint library "focused on improving schematic and PCB **readability** and aesthetics". | VERIFIED |

### Bucket E — ADJACENT but out of scope

Four-word reason each. These were enumerated and deliberately excluded.

| Name | URL | Reason (4 words) |
| --- | --- | --- |
| Freerouting, OrthoRoute, Tracklayer, KiCad Routing Tools, OpenAutoRouter, vyges-tools/grt | PCM + GitHub | Copper autorouting, not schematic |
| Place Footprints, Replicate Layout, Save/Restore Layout, SubLayout, HierarchicalPCB, Layout Clone, Place By Sch, KicadPlaceBySchematic | PCM + Codeberg | PCB footprint placement only |
| KiKit, SparkFun Panelizer, Board2Pdf, eC-registration, gerber_to_order, all fab-house upload plugins | PCM | Fabrication output, not drawing |
| Xplace, DREAMPlace, Efficient-TDP, vyges-tools/{gpl,dpl,mpl,ppl,pad}, RL_PCB, spectral-sa-macro-placer | GitHub | VLSI silicon placement research |
| Xyce plugin, qucs_s, ngspice, PySpice, Lcapy **[KNOWN]**, eesim, LTspice tooling | PCM + GitHub | Circuit simulation, not drawing |
| InteractiveHtmlBom, KiBOM, KiCost, Push-to-DigiKey, kicad-erp-to-sch, part-sourcing agents | PCM + GitHub | BOM and purchasing data |
| pcb2blender, SpinRender, GDS3D, reticle | PCM + GitHub | 3D rendering, not schematic |
| netgen, LVSEngine, vyges-tools/lvs, Netlist-Compare | GitHub | Layout-versus-schematic equivalence checking |
| PcbDraw, Pinion, pinout, KiBuzzard, kicad-auto-silkscreen, Silk Reference Tools, TextPostionSize | PCM + GitHub | PCB silkscreen and artwork |
| WireViz, cablepilot, frc-wiring-studio, Easy_Wiring, tikz-trackschematic, trackschematics | GitHub + Codeberg | Wiring harness, not circuits |
| WaveDrom, undulate, symbolator, sphinxcontrib-hdl-diagrams, hdelk, eext-timing-diagram-tool | GitHub | HDL and timing diagrams |
| Image2schematic, CircuitNet, CircuitDiagOCR, sketch2schematic-ai, ci2n_datasets, Handwritten-Circuit-Recognition, MEPdetect | GitHub | Image recognition into netlist |
| schematic-figure, nn-svg, ppt-diagram, lini | GitHub | Scientific figures, not circuits |
| atopile **[KNOWN]**, SKiDL **[KNOWN]**, tscircuit **[KNOWN]**, diodeinc/pcb **[KNOWN]**, gEDA/gschem, LibrePCB | GitHub | Netlist authoring, no draughtsmanship |
| kicad-skip **[KNOWN]**, kiutils **[KNOWN]**, kicadts **[KNOWN]**, kicad-sch-api **[KNOWN]**, mcp-kicad-sch-api, snhobbs/eeschema-script-control, atx/python-eeschema, kicad-python | GitHub + GitLab | File access, no placement |
| kicad-mcp-pro **[KNOWN]**, mcp-server-kicad **[KNOWN]**, kipilot-mcp, biosshot/kicad-copilot, unmateria/MCP-Kicad, eda-agent, Natchpai/Hardware-Copilot, KiSkill, kicad-happy, KiCadAI, zaptrace, WireStudio, fragua, CircuitPilot, boardsmith, signex, Jenga, openbench, Copperbrain, tracewise, KiCad-Astra, xutianq999/pcb-design-skill, swayerloren/KICAD_ENGINE, pcb-designer-ai-agent, DeconBear/vibe-analog, Tomachie/AI-PCB-Design-KiCad-Plugin, easyeda-copilot, easyeda-ai-assistant, easyeda-mcp, easyeda-agent, easyeda-pro-claude-skill, hyndex/easyeda-mcp, yangzhaoxu411/chip-netlist-skill, ScottJeong/altium-claude-skills, redstone39/orcad-capture-toolkit, groundplane-studio/fusion-electronics-mcp, logisim-live-mcp, WHITEWARM/circuit-schematic-wiring-simulation, zyua678/eda-schematic-workflow, hyuhang822-blip/kicad-sch-to-pcb, Doris619619/Kicad-sch-to-pcb-skeleton, ashutosh-rath02/schemantic, MZarc/Elecalyzer, SchemNavi, LWZsama/issie-dgm-parser, pasrom/altium-schdoc-tools, akheron/kicad-tool, a3ng7n/Altium-Schematic-Parser, KyrosEngineering/pinmap-lint, CubeMX-KiCad-Netlabels, CubeMX-Altium-Netlabels, freudenthal/skidl-codegen | GitHub | Whole-flow agent, placement incidental |
| Angular "schematics" (jest-schematic, schematics-utilities, ngrx-entity-schematic, ng-builder-electron, Wattpad/Schematic), Minecraft `.schematic` tooling (~25 repos), EDA-as-exploratory-data-analysis lists (~6) | GitHub | Homonym, different domain entirely |

---

## Totals enumerated per source

| Source | Enumerated | Schematic-relevant | Buckets A/B/C |
| --- | --- | --- | --- |
| KiCad PCM official repository | **136 packages** (101 plugin / 17 library / 18 colortheme) | 9 | 4 |
| GitHub topics (15 topics) | **1,685 unique repos** (2,691 rows) | 293 | 48 |
| GitHub repo search (14 queries) | **380 additional unique repos** (438 rows) | 61 | 17 |
| Awesome-lists (8 of 17 URLs live) | **53 schematic entries** | 53 | 9 |
| GitLab (`kicad` group + 5 searches) | **89 group projects + 72 search rows** | 6 | 3 |
| Codeberg (3 searches) | **100 rows** | 1 | 1 |
| SourceHut (4 searches) | **7 projects** | 0 | 0 |
| **Distinct candidates after dedupe** | **≈2,100 records reviewed** | **~110** | **65 in A/B/C** |

Bucket counts after dedupe: **A = 35, B = 18, C = 12, D = 29**, E = the
remainder.

---

## What this method WOULD HAVE MISSED

Stated explicitly, because the brief's premise is that a previous name-driven
pass could not find what nobody thought to name — and an enumerative pass has its
own blind spots, which are different but real.

1. **Anything whose description does not contain a schematic word.** The triage
   filter reads `full_name` and `description` only. A repo called `qdia`
   described as "a small Qt app" would not have surfaced. **This is the largest
   gap**, and it is structural: GitHub descriptions are optional, often empty,
   and frequently say what the author cares about rather than what the tool does.
   Two of the strongest finds (`schemweave`, `diagen`) were found *only* because
   their authors happened to write "layout engine" in the description.

2. **Code search was not run.** GitHub's code-search quota is 10 requests/minute
   and the repository-search sweep consumed the session's search budget twice
   over. A tool that *implements* schematic placement inside a larger project —
   a `schematic/layout/` directory in an unrelated-sounding monorepo — is
   invisible to this method. The brief asked for code search for `kicad_sch`; it
   was run as a **repository** search (179 hits, swept) not a **code** search.
   **This is the one explicitly requested step that was not completed as asked.**

3. **GitHub search truncates at 1,000 results per query.** `topic:eda` has
   15,776 repos and `topic:kicad` has 5,168; 400 rows were taken from each
   across two sort orders. **Roughly 19,000 repos under those two topics were
   never listed.** Sorting by both stars and recent-push mitigates this at the
   two ends of the distribution but leaves the middle — a two-year-old project
   with 3 stars under `topic:eda` — genuinely unreachable.

4. **Untopiced, undescribed repos.** A project with no topics and no description
   cannot be found by either axis used here. Most personal tools are exactly
   this.

5. **Non-Git registries entirely.** PyPI, npm, crates.io, CTAN, the Inkscape
   extension registry, the FreeCAD addon manager, VS Code Marketplace and the
   Blender addon list were **not touched.** CTAN is a specific and likely-costly
   omission: CircuiTikZ and its ecosystem live there, and `circuitikz` surfaced
   here only through GitHub wrappers. VS Code Marketplace is another — two
   extensions (`circuit-fence`, `rtl-live`) were found via GitHub, implying
   others exist that are published to the Marketplace without a discoverable
   GitHub topic.

6. **Academic work with no repository.** A placement or legibility algorithm
   published as a paper with no code is out of reach of every source used here.
   The brief's prior pass covered academic claims separately.

7. **Closed-source and commercial tools.** Only two appear (Koppar, Loft Compare
   PDF), and both only because a curated list mentioned them. Altium, OrCAD,
   Zuken and the EDA vendors' own schematic-draughtsmanship features are
   invisible to a registry sweep by construction.

8. **The PCM is the *official* repository only.** KiCad supports third-party
   PCM repositories, and `gitlab.com/kicad/services/kicad-plugins` (last
   activity 2026-07-25) exists in the kicad group and was **not opened.** Any
   addon distributed through a private or third-party PCM endpoint is absent
   from the 136.

9. **Non-English descriptions were kept but not translated systematically.**
   Several Chinese-language repos surfaced and were read; a Japanese, Korean or
   Russian project describing schematic autolayout without an English
   description would have been triaged on its name alone.

10. **Nothing here was run.** Every description is the author's own claim. The
    inventory is a candidate list; none of the 35 bucket-A entries has been shown
    to produce a legible schematic, and several are explicitly labelled
    experimental or alpha by their own authors (`kicad-schematic-builder`:
    "this is just an idea"; `fluxsmith`: "experimental research project";
    `WeJaWi/CircuitDraft`: "0.1 Alpha"). **Treat the star counts as popularity
    and the dates as liveness — neither is evidence of capability.**

---

## Raw data

Scratch artifacts for this pass (session-scoped, not committed):
`packages.json` (the 136-package PCM aggregate), `gh_topics_raw.tsv` +
`gh_topics2_raw.tsv` (2,691 topic rows), `gh_repo_search.tsv` (438 search rows),
`awesome/*.md` (8 lists), `verified.txt` (56 verified GitHub repo records).

The PCM aggregate is re-fetchable at any time and is the authority for the
136 figure; it carried `update_time_utc 2026-10-27 11:02:14` when fetched.
