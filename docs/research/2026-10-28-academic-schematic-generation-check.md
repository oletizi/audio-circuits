# Verification pass: six claimed systems in LLM/agent schematic generation

**Written 2026-10-28.** A third-party report of unknown provenance named four
academic systems and made specific claims about two commercial/open-source ones
already surveyed here. This document checks each against a primary source and
records what it actually demonstrates.

**Verdict up front: all four academic names are REAL. None is fabricated.** Every
claim in the third-party report about them is substantially accurate, with three
corrections noted below. Both previously-surveyed systems are CONFIRMED.

**What could not be done:** this session's `WebSearch` budget (200 calls) was
already exhausted before the first query, so **no keyword search of the open web
was performed**. Everything below was reached by querying the arXiv API and the
GitHub API directly, and by fetching named URLs. The consequence is recorded
under "What this document does not establish" — in particular, a *negative*
("no independent readability benchmark exists") is weaker evidence here than it
would be from a search pass.

---

## Summary table

| Claim | Verdict | What it is | Layout/readability measured? | KiCad? |
| --- | --- | --- | --- | --- |
| **EEschematic** | **REAL** | arXiv 2510.17002, Edinburgh, Oct 2025. Code: `eelab-dev/EEschematic`, MIT, 39 stars | Partly — a deterministic "no overlaps" correctness check, plus **subjective aesthetics scored /10 by the authors** | **No.** JSON-like format + own renderer |
| **Microsoft SchGen** | **REAL** | arXiv 2605.30345, MSRA + UCSD, May 2026. Code: `microsoft/SchGen`, MIT, 42 stars | **Yes — the only deterministic layout metric at scale found:** bbox-intersection "Spatial Violation" over a 500-sample test set | **Yes.** Emits editable `.kicad_sch`; requires KiCad 8.0.9 |
| **CircuitLM** | **REAL** | arXiv 2601.04505v3, ICLAD 2026 (accepted), IUT Dhaka. Code: `Khandakar227/circuitlm`, MIT, 7 stars | **No, and explicitly declined** — "strictly optimizing deterministic graph-drawing metrics… is unnecessary" | **No.** CircuitJSON → SVG only; netlist export is an open TODO |
| **SINA** | **REAL** | arXiv 2607.01609 (v2 of 2601.22114), Utah + CU Boulder, Jul 2026 | **N/A — wrong direction.** Image→netlist, so there is no generated layout to judge | **No.** SPICE/ngspice output |
| **Flux Agent** | **CONFIRMED** | `app.flux.ai/mcp` returns 401 today — real endpoint | **No measure, independent or otherwise, found** | **No.** EDIF only |
| **Copperhead** | **CONFIRMED on every point** | `copperheadhq/copperhead`, Apache-2.0, 666★, 139 forks, pushed 2026-10-28 | **Yes — 13 named legibility families, gating the create pipeline** | **Yes.** Edits `.kicad_sch` |

---

## 1. EEschematic — REAL

**Paper:** "EEschematic: Multimodal-LLM Based AI Agent for Schematic Generation
of Analog Circuit", Chang Liu and Danial Chitnis, School of Engineering, The
University of Edinburgh. **arXiv:2510.17002v1, submitted 19 October 2025**,
cs.LG. No conference or journal venue stated — preprint only, and no revision in
the year since.

**Code:** `https://github.com/eelab-dev/EEschematic` — MIT, 39 stars, 8 forks,
created 2025-03-06, **last push 2025-10-20** (dormant for ~12 months). Language:
Jupyter Notebook. The whole tree is 30 files: six prompt text files
(`place_prompt.txt`, `wire_correction.txt`, `optimise_prompt.txt`, …), three
input `.cir` netlists, four notebooks, and four PNGs used as few-shot
good/bad placement exemplars (`place_good.png`, `place_bad.png`,
`wiring_good.png`, `wiring_bad.png`).

**Every element of the third-party claim checks out.** From the abstract:
multimodal LLM; *"six analog substructure examples for few-shot placement"*; a
*"Visual Chain-of-Thought (VCoT) strategy to iteratively refine placement and
wiring, enhancing schematic clarity and symmetry"*; and the three demonstration
circuits are *"a CMOS inverter, a five-transistor operational transconductance
amplifier (5T-OTA), and a telescopic cascode amplifier"*.

**Size and kind: three circuits, all transistor-level analog IC, the largest a
telescopic cascode.** This is a **demo, not an evaluation.** It is, however, a
more careful demo than three circuits suggests: Table II reports *"a maximum of
10 iterations… assigned to placement and 20 for wiring optimization, with 10
trials performed per circuit"* — so 30 runs, with average iteration counts
reported per circuit.

**How quality was measured — and this is the honest part of the paper.** Two
metrics:

- **Correctness** — *"structural validity of the schematic by verifying device
  connectivity and ensuring no overlaps occur in components and wiring"*. This is
  deterministic and includes an overlap check.
- **Aesthetics** — *"evaluated subjectively by manually assessing visual quality
  for symmetry, alignment, wire compactness, and overall clarity"*.

Results: 9/10 correctness on all three circuits; **aesthetics 5–9/10**. There is
no quantitative crossing count, no symmetry score, no external rater, and no LLM
judge. The authors state the limitation themselves: *"subjective evaluation of
final schematic aesthetics introduces human bias"*, alongside a restriction to
*"fundamental analog circuits"* rather than multi-stage topologies, and an
admission that some outputs *"still exhibit structural or connectivity errors"*
despite more iterations.

**CORRECTION to the third-party report:** it implies EEschematic targets a
standard editable schematic format. It does not. The paper says only *"a
human-editable format"*; the README says *"a human-editable JSON-like format"*;
and the paper's own wording is a *"JSON schema"* of position and wiring data
rendered by the project's own renderer. **No EDA tool is named anywhere — not
KiCad, not Xschem, not LTspice, not Cadence.** The output is editable in the
sense that a human can edit the JSON.

**Could an agent drive it today?** Only by lifting the prompts. There is no CLI,
no library API, no package — four notebooks and a prompt directory. **The
transferable asset is the prompt set and the four good/bad exemplar PNGs**, which
are an externally-authored statement of what good analog placement looks like.

---

## 2. Microsoft SchGen — REAL, and the most relevant of the four

**Paper:** "SchGen: PCB Schematic Generation with Semantic-Grounded Code
Representations", Qinpei Luo, Ruichun Ma, Xinyu Zhang, Lili Qiu. **UCSD +
Microsoft Research Asia** (Ruichun Ma at Microsoft is corresponding author).
**arXiv:2605.30345v1, submitted 28 May 2026**, cs.AI/cs.CL/cs.LG, 19 pages, 7
figures. No venue stated.

**Code:** `https://github.com/microsoft/SchGen` — **MIT, 42 stars, 8 forks,
created 2025-10-31, last push 2026-10-24, 14 open issues, Python.** Real
Microsoft org repo with `SECURITY.md`, `dependabot.yml` and a CodeQL workflow.
Dataset at `huggingface.co/datasets/microsoft/SchGen_dataset`; fine-tuned model
at `huggingface.co/microsoft/SchGen`.

**The claim is accurate on every point.** The representation is exactly as
described: *"a semantically grounded code representation that encodes schematic
editing primitives with relative placement and pin-name-based wiring,
transforming a geometry-driven generation problem into a semantics-driven
matching task amenable to LLMs."* The released code confirms the primitives —
`add_schematic_symbol(symbol_lib=…, symbol_name=…, pos_x=center_x_1 + (10),
pos_y=center_y_1 + (11), reference=…, rotation=…, mirror=…)` and `connect_pins`,
with a final `write_out_all_wires()`. The generated Python executes against
KiCad and produces an editable `.kicad_sch`.

**This is a real evaluation, not a demo.** Dataset: **2,105 KiCad schematics,
1,390 unique designs, expanded to 8,420 samples; a 500-sample test split**, plus
an out-of-distribution set of **988 samples from 20 GitHub KiCad projects**.
Circuit size and kind: **up to 39 symbols and 48 labels per design** —
microcontroller, analog, LED, power, storage, battery, USB and antenna modules,
largely derived from SparkFun open hardware. So: **small-to-medium PCB modules,
exactly as claimed**, and the paper admits the ceiling — *"SchGen currently
focuses on structured schematics from SparkFun designs and does not yet model
advanced PCB constraints. Scaling to large and complex PCBs remains
challenging."*

**How quality was measured — four metrics, one of them spatial:**

- **Valid Circuits** — *"Python code can be successfully executed with no errors"*
  **and** *"zero critical errors reported by KiCad's Electrical Rules Check"*.
- **Spatial Violation** — *"number of spatial overlaps among symbols, labels, and
  wires"*; the definition is *"each object is assigned a bounding box, and any
  intersection is counted as an overlap"*, with the average divided by the pass
  ratio to normalise.
- **Netlist Accuracy** — Jaccard, precision and recall against ground truth.
- **Expert verification** — symbol/connection error counts and a functional
  correctness ratio, from **two experts over 100 designs** from the test set,
  cross-validated to *"average correctness ratio differences below 3%"*.

Headline numbers (representation ablation, then model comparison):

| Method | Valid Circuits | Spatial Violation | Netlist Jaccard |
| --- | --- | --- | --- |
| Code-L1 (SchGen) | 82.00% | 7.73 | 49.08% |
| Code-L2 (no relative coords) | 78.16% | 7.77 | 45.97% |
| Code-L3 (no pin-name wiring) | 76.40% | 8.14 | 15.46% |
| Raw KiCad file | 32.45% | 7.80 | 9.11% |
| GPT-5.2 (L1 repr.) | 67.89% | 8.56 | 42.95% |
| Grok-4 (L1 repr.) | 61.21% | 8.82 | 44.03% |
| GPT-o4mini (L1 repr.) | 59.70% | 9.40 | 32.25% |

**Read the Spatial Violation column before celebrating it.** The spread across
*every* method is 7.73 to 9.40 — a 20% band — while Netlist Jaccard spreads 9%
to 49% and Valid Circuits 32% to 82%. **The representation that triples netlist
accuracy barely moves the overlap count.** Either overlaps are dominated by
something the representation does not control, or a single scalar overlap count
is too coarse to separate a legible sheet from an illegible one. Both readings
are bad news for anyone hoping one number gates legibility, and both are
directly relevant to this repository's gate design.

**Could an agent drive it today? Yes, with the heaviest setup cost of the four.**
It needs an OpenRouter key, a CUDA PyTorch stack, **KiCad 8.0.9 specifically**
(the README links the exact installers), and a `PROJECT_PATH` conda var. The
useful parts are separable: `modules/kicad_sch_interface.py` (1,583 lines) is a
standalone KiCad schematic editing layer with its own `main()` test, and
`schematic_generation/sch_examples/imu_L1.py` is a worked example of the
representation.

### Three findings from SchGen's source that matter to this repository

**(a) SchGen independently reached this repository's "ban kiutils" conclusion,
and names the same failure mode.** `modules/kicad_sch_interface.py:979`, a live
comment above the commented-out import:

> `# Give up using kiutils because it lacks support for kicad v8, v9 format differences about hiding various pins and name.`

`docs/research/2026-10-28-agent-kicad-surfaces.md` §5 measured a `kiutils`
round-trip losing **192 `hide` flags** and rendering 4.2× the text while
`kicad-cli` still exited 0. **Microsoft Research hit the same defect on the same
field and abandoned the same library.** That recommendation is no longer
single-sourced to this repository's own measurement. The repo still vendors a
`kiutils/` tree, which is dead weight the comment explains.

**(b) SchGen vendors a modified `kicad-skip`**, as `my_skip_lib/` (its own
`sexp/parser.py`, `sourcefile.py`, `property/`). The prior survey's
recommendation #3 — *"if an existing sheet must be edited, `kicad-skip` is the
tool"* — is what Microsoft did, except they forked it rather than depending on
it. **Budget for a fork, not a dependency.**

**(c) THE SPATIAL VIOLATION METRIC IS NOT IN THE RELEASED CODE.** The repo's
`evaluation/eval.py` self-describes as *"Evaluate assistant code using SchGen
execution, netlist, and ERC metrics"* — three of the four. A GitHub code search
across the repo for `spatial` returns four files, **none of which computes the
metric**: in `config.py` it appears only as a prompt instruction (*"Make sure
they are at reasonable positions and ample spacing so that their bounding boxes
do not overlap with each other!"*), and `modules/sch_verifier.py` handles
overlap only as a VLM prompt clause (*"Components or symbols overlap with each
other. For example, placing a GND or power symbol inside the rectangle of
another symbol is an error"*). The one deterministic `overlap` function in
`modules/utils/misc.py` detects **collinear wire overlap for junction
insertion**, not bbox intersection. **So the paper's layout-quality metric is
not reproducible from the release.** Verified by code search on 2026-10-28; a
file-by-file read of all 100+ files was not done, so this is a strong negative,
not an exhaustive one.

---

## 3. CircuitLM — REAL, and the third-party description is materially incomplete

**Paper:** "CircuitLM: A Multi-Agent LLM-Aided Design Framework for Generating
Circuit Schematics from Natural Language Prompts", Khandakar Shakib Al Hasan,
Syed Rifat Raiyan, Hasin Mahtab Alvee, Wahid Sadik — **Islamic University of
Technology, Dhaka, Bangladesh**. **arXiv:2601.04505, submitted 8 January 2026,
last revised 26 May 2026 (v3)**, cs.AI/cs.CL/eess.SY. **Venue: accepted at the
2026 IEEE International Conference on LLM-Aided Design (ICLAD)**, 10 pages, 8
figures, 6 tables. This is the only one of the four with a venue.

**Code:** `https://github.com/Khandakar227/circuitlm` — **MIT, 7 stars, last push
2026-05-27, TypeScript** (plus a Python/FastAPI backend and a Next.js frontend).

**The claim — "generates a structured circuit representation and uses
force-directed layout to produce an SVG schematic" — is true but describes stage
(iv) and (v) of five and omits the part the paper is actually about.** The
pipeline is: *"(i) component identification, (ii) canonical pinout retrieval,
(iii) chain-of-thought reasoning, (iv) JSON schematic synthesis, and (v)
interactive force-directed visualization"*, with generation *"grounded in a
curated, embedding-powered component knowledge base"* (ChromaDB + fuzzy
matching). The representation is called **CircuitJSON**. The force-directed stage
*"groups connected components and prevents overlap"*, with Manhattan-style
routing to minimise bends, and renders interactive SVG a user can drag.

**Evaluation: 100 prompts × 5 frontier LLMs — real, but not of layout.** The
benchmark is **100 embedded-systems prompts** in three tiers (Easy, Medium,
Adversarial): LED control, motor speed regulation, multi-actuator circuits, I2C /
SPI / UART bus interfacing, IMU / DHT / PIR / LDR sensor integration. Exact
component counts are not disclosed. Metrics are **ERC Pass@1** from a
deterministic rule checker with four severities (Critical, Major, Minor,
Warning), and **LLM-as-a-judge Pass@1** for context-aware flaws, with human
expert agreement **κ = 0.82 (95% CI [0.74, 0.93])**. Best Pass@1 was 88%
(Gemini), 87% (Qwen), 86% (Deepseek).

**How readability was measured: it was not, and the paper argues it should not
be.** Quoting directly:

> *"Because the interactive interface allows seamless manual layout resolution,
> strictly optimizing deterministic graph-drawing metrics (e.g., minimizing edge
> crossings) is unnecessary."*

**This is the most important single sentence found in this pass.** It is an
explicit, published rejection of the premise behind this repository's legibility
program — on the grounds that a human will drag the symbols afterwards. It is
also exactly the posture `CLAUDE.md` forbids here: *"a first solution that
technically works but leaves a person doing fiddly remedial work is a failure,
not a delivery."* **Worth reading as the strongest available statement of the
opposing position**, and worth noting that it is reasoning from a GUI the authors
built, which is the as-built-artifact-as-criterion move in another costume.

**Agent drivability and KiCad: no, on both.** Netlist export does not exist —
*"converting CircuitJSON into other representations, such as a netlist, would
require robust scripting and additional engineering effort, which falls outside
the scope"* — and it sits unchecked in the repo's own TODO list (*"Netlist
generation — export CircuitJSON to a standard netlist format"*). Future work
proposes *"a transpilation layer from CircuitLM's connection arrays into
Python-based SKiDL definitions"* for KiCad. Other acknowledged limits: no
simulator in the loop, a single LLM evaluator, **and no analog circuit testing at
all** — which rules it out for this repository's subject matter.

---

## 4. SINA — REAL, two versions, and the wrong direction for this repository

**Papers — there are two, and the third-party report cites neither explicitly:**

- **arXiv:2601.22114v1, 29 January 2026** — "SINA: A Circuit Schematic
  Image-to-Netlist Generator Using Artificial Intelligence". Aldowaish,
  Karumanchi, Chiang, **Noorzad**, Fayazi. Reports **96.47%**.
- **arXiv:2607.01609v1, 2 July 2026** — "SINA: A **Fully Automated** Circuit
  Schematic Image to Netlist Generator Using Artificial Intelligence". Same first
  three authors, Noorzad replaced by **Habib, Murphy, Cao**, Fayazi last. Reports
  **96.67%**. **University of Utah** ECE + **CU Boulder** ECEE. cs.LG, no venue
  stated.

The second supersedes the first; cite 2607.01609.

**The claim "schematic IMAGE to netlist conversion" is correct and is the whole
of it.** SINA is the *inverse* of the other three — it reads pictures of
schematics and emits netlists. Pipeline: YOLOv8 component detection,
connected-component labeling for connectivity, OCR for reference designators, and
a VLM for designator assignment, plus **dedicated crossing-wire detection** to
distinguish a junction from a crossover.

**Evaluation — the largest of the four, and genuinely an evaluation.** IC
benchmark: **75 schematics, >1,000 components, 10 component types**. PCB
benchmark: **>50 schematics, >500 components, 3,300 pins**. Training database:
**>700 annotated schematics** from research manuscripts, scanned textbooks and
hand-drawn sketches. Complexity distribution is reported: **47.8% simple (<6
components), 42.1% medium (6–20), 10.1% complex (>20)** — so the long tail is
thin, and "complex" means more than twenty parts. Correctness is validated by
**graph isomorphism** against ground-truth netlists.

The 96.67% is a **product, not a measurement**: text extraction 97.55% ×
component detection F1 99.7% × circuit structure 99.4%. Also reported: 98%
IC-level / 94% PCB-level detection precision; crossing-wire detection **87%
accuracy at 100% precision**; functional validation 97.5% pass, 90% exact match.
The **2.72× claim is against Masala-CHAI at 35.5%** — and Masala-CHAI is real
(`jitendra-bhandari/Masala-CHAI`, 128 stars), so the baseline is not invented.
Only one baseline, over 40 IC schematics.

**Readability: not applicable, and worth stating plainly.** SINA generates no
layout, so there is nothing to judge. **It is not evidence about schematic
generation quality in either direction**, and a report that lists it beside the
other three is conflating two problems.

**"Open-source" — true, but only through an anonymised link.** The paper gives
`https://anonymous.4open.science/r/SINA-213F/`. The human-facing README URL does
not render (JS-only shell), but the **API does**: the repo exists and contains
`Database/`, `Netlist Generator/`, `LICENSE.txt`, `README.md`. From the README:
separate IC and PCB modules; `py netlist_generator.py` for IC, `python index.py
--input data/input --output data/output` for PCB; dependencies YOLOv8, OpenCV,
OCR, **Google Cloud Vision credentials required for the PCB module**, optional
OpenAI key. Trained weights are referenced as `current_trained_model` directories
**with no download link stated**. **No named public GitHub repository was found**
— the anonymised link implies a double-blind submission still in review, and the
license terms are not quoted in the README. **Treat "open-source" as "code
visible under anonymity, licence unread, weights unlocated."**

**KiCad: not mentioned anywhere.** Output is *"SPICE-compatible netlists"* for
ngspice.

---

## 5. Flux Agent — prior survey CONFIRMED

**Does it have a real agent/MCP surface? Yes, and re-verified today.**
`POST https://app.flux.ai/mcp` returns **HTTP 401 Unauthorized** (2026-10-28) —
a real, auth-gated endpoint, not a marketing page. `docs.flux.ai/reference/flux-agent`
confirms the agent *"plans the work, designs the complete device, checks it, and
prepares it for manufacturing"*, can *"select parts, create the schematic, and
design the PCB"*, and that *"you can use Claude Code or Codex together with Flux
through the Flux MCP server."*

**And the prior survey's central correction stands: it is prose delegation, not
construction.** `docs.flux.ai/account/flux-mcp-server` names three scopes —
*"Grant project read access to read project data, write access to make design
changes, and agent access to ask Flux to complete design work"* — and the
capability list is read-plus-ask: *"read project names, components, pins, nets,
and PCB information"*, *"start a thread with Flux and describe a design change"*,
*"read the updated project after Flux completes the work."* **The page names no
tool that places a symbol, draws a wire, or edits schematic geometry.** An
external agent cannot reach into the loop; it posts a request and waits.

**Independent measure of schematic readability: NONE FOUND, and the docs make no
claim to measure it either.** The `flux-agent` page contains no statement about
schematic layout quality or readability at all — so there is nothing to be
independent *of*. **This is the weakest finding in this document**: with the web
search budget exhausted, "none found" rests on the prior survey's search pass
(which reported all first-hand accounts ≤ June 2026 calling placement unusable)
plus today's reading of two docs pages. It is **not** a fresh search for a
third-party benchmark. Treat as unrefuted, not as established.

KiCad interop: unchanged — EDIF netlist export only, no geometry, and the prior
survey's finding of ~18 "X-to-Flux" migration guides against zero "Flux-to-X"
needs no revisiting.

---

## 6. Copperhead — prior survey CONFIRMED on every point, all four checked

Each claim was checked against the repo itself today (2026-10-28).

| Prior claim | Status | Evidence |
| --- | --- | --- |
| Apache-2.0 | **CONFIRMED** | GitHub API `license.spdx_id = "Apache-2.0"` |
| ~666 stars | **CONFIRMED exactly** | 666 stars, 139 forks, 275 open issues, created 2026-07-18, **pushed 2026-10-28** (same day), TypeScript, homepage `copperhead.sh` |
| Deterministic drafting engine | **CONFIRMED** | `src/kicad/legibility.ts` header: *"Deterministic read-only legibility checker (design C1-C9). Pure geometry over the sexp accessors: no serialization, no file writes, no subprocess, no network, no LLM."* |
| 13-family legibility checker | **CONFIRMED — exactly 13** | see list below |
| …that gates its pipeline | **CONFIRMED** | same header: *"`check` reports its findings; the create pipeline gates on them (design C6)"* |
| *"acceptance tests… have not been observed passing end to end"* | **CONFIRMED verbatim in context** | README line 240 |

**The 13 families, verbatim from `LEGIBILITY_FAMILIES`, with their default
severities** — this is the externally-authored legibility specification
`CLAUDE.md` wants, and it is nine `error` families and four `advisory`:

| Family | Default severity |
| --- | --- |
| `off-grid` | error |
| `symbol-overlap` | error |
| `text-collision` | error |
| `wire-through-symbol` | error |
| `out-of-frame` | error |
| `ungrouped-symbol` | error |
| `unlabeled-group` | error |
| `group-overlap` | error |
| `empty-title-block` | error |
| `label-orientation` | advisory |
| `low-utilization` | advisory |
| `crowding` | advisory |
| `cross-group-wire` | advisory |

**The thresholds are named and numeric**, which is the part a rule file here
could adopt directly: `gridPitch: 1.27`, `minPitch: 2.54`, `utilization: 0.5`,
`maxWireLength: 50.8` (all mm), `familyCap: 10` findings per family per sheet
before suppression, and `TOL = 0.01` because *"file-precision noise must never
flip a finding (design C7)"*. Each finding carries a remedy, not a restatement —
e.g. *"symbol bodies of {A} and {B} overlap; separate them by at least 2.54mm
edge to edge"*, and *"group boxes … intersect; tile groups without overlap (full
nesting is allowed)"*. **That is the refusal style `CLAUDE.md` requires**, from a
source with no stake in this repository's artifacts.

**The quote, in full, with its surrounding sentence** (README line 240) — the
prior survey's ellipsis is faithful:

> *"**Implemented, not yet proven.** The agent loop (`do`, `sync --resolve`,
> `create`) is complete and structurally gated, but its acceptance tests need a
> live model and have not been observed passing end to end. Expect rough edges."*

The README also carries *"**The surface is experimental and unstable.** It
declares a `0.` protocol major"* for the MCP server, consistent with the prior
survey's EXPERIMENTAL label. **One correction of emphasis:** the earlier survey's
caveat list said *"I confirmed the file sizes exist; I did not read the engine or
run it."* The engine has now been **read** — the family list, severities,
thresholds, gate statement and finding messages above are from its source. It has
still **not been run**.

---

## The third-party report's central claim: is evaluation the field's main gap?

**PARTLY TRUE, and the correct statement is narrower and more useful.**

**Where the claim is wrong: "evaluation" generally is not the gap.** Three of the
four have real evaluations. SchGen tests on 500 held-out samples plus 988
out-of-distribution, with two experts over 100 designs. CircuitLM tests 100
prompts across five models with κ = 0.82 human agreement. SINA tests 75 IC and
50+ PCB schematics with graph-isomorphism validation against a real baseline.
Anyone saying this field does not evaluate has not read them.

**Where the claim is right, sharpened: READABILITY is the gap, and the evidence
is a 1-of-4 count plus one explicit refusal.**

- **SchGen** has the only deterministic layout metric at scale — one scalar, bbox
  intersections — and **it is absent from the released code**, so it is not
  reproducible. Its spread across all methods is 7.73–9.40, narrow enough to
  question what it separates.
- **EEschematic** checks overlaps deterministically but scores aesthetics
  **subjectively, by the authors, on three circuits** — and names the bias itself.
- **CircuitLM** declines layout metrics on principle: *"strictly optimizing
  deterministic graph-drawing metrics (e.g., minimizing edge crossings) is
  unnecessary."*
- **SINA** has no layout to measure.

**So across four systems: one coarse, non-reproducible deterministic metric; one
subjective score on three circuits; one published refusal; one non-applicable.**
Nothing in the academic set matches the granularity of `copperhead`'s 13 families
with named numeric thresholds — **and `copperhead` is not a paper, has no
evaluation, and admits its acceptance tests have never been observed passing.**
The field has evaluation of *correctness* and almost nothing on *legibility*; the
one real legibility specification found has no evaluation behind it. **The gap is
the pairing, and neither half exists in the same artifact.**

Secondary observation, relevant to this repository's direction: the two
schematic-generating systems with real evaluations both **generate code or
structured data and let a deterministic back end place things**, rather than
emitting geometry from a model. SchGen's own ablation is the measurement —
removing pin-name connectivity drops netlist Jaccard from 49.08% to 15.46%, and
emitting raw KiCad files directly drops valid circuits to 32.45% from 82.00%.
**Generating geometry directly is the worst-performing option its authors
tested**, by a factor of two and a half.

---

## What this document does not establish

1. **No open-web keyword search was performed.** The session's `WebSearch` budget
   (200/200) was spent before this task began. Everything here came from the arXiv
   API, the GitHub API, and directly-named URLs. **A system that exists under a
   name I did not think to query would have been missed**, and a DuckDuckGo HTML
   fallback returned a CAPTCHA. The four names checked out, so no false negative
   is known — but the method cannot find a fifth.
2. **No code was run and nothing was installed.** SchGen, EEschematic, CircuitLM
   and SINA were read, not executed. Every accuracy figure is the authors' own
   claim.
3. **The negative on Flux readability is the weakest claim here** (§5). It rests
   on two docs pages reading silent plus the prior survey's search pass, not on a
   fresh search for a third-party benchmark.
4. **"The Spatial Violation metric is not in SchGen's release"** (§2c) rests on a
   GitHub code search for `spatial`, `violation` and `overlap` across the repo
   plus reads of `eval.py`, `sch_evaluation.py`, `sch_verifier.py`, `misc.py` and
   `config.py`. It is not a file-by-file read of all 100+ files.
5. **SINA's licence and model weights are unverified.** The anonymised repo lists
   `LICENSE.txt` but the README does not state terms, and no weight download was
   located.
6. **EEschematic's output format is established negatively** — no EDA tool is
   named in the paper, README or file tree. I did not open the notebooks to
   confirm what the JSON renders through.
7. **Copperhead's engine was read but not run**, and its `score.ts` (21 KB) and
   `draft/ir.ts` were not read at all.
8. **CircuitLM's κ = 0.82 and SchGen's "below 3%" expert agreement** are relayed
   from the papers, not recomputed.
