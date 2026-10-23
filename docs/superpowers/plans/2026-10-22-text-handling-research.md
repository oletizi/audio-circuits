# Text Handling Research Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish what already exists for handling text in a generated schematic, so that no further work on this repository's text problems is reasoned from first principles.

**Architecture:** Seven research tasks, each ending in a committed section of one document with its retrieval status marked. **No task designs anything and no task changes a line of `lib/` or `tools/`.** Task 7 synthesises the other six into a decision-ready survey; the design that follows it is a separate exercise the owner reviews.

**Tech Stack:** Nothing is built. Sources are KiCad's own source and installed runtime, the elkjs/ELK option reference already vendored and validated against in this repository, published papers, and the source of other EDA tools.

**Spec:** **There is none, and that is the point.** This research precedes a spec. What stands in for one:
- `docs/schematic/text-placement-prior-art.md` — the 2026-10-21 survey. Build on it; do not redo it. §9 of that document lists twelve things it did not establish, and several are tasks here.
- `docs/known-gaps.md` **G232**, **G239**, **G257**, **G258**, **G260**, **G261**, **G262**, **G263**, **G264** — the measured problem.
- `CLAUDE.md` *What this project is* — the mandate the research serves.

**The owner's instruction, verbatim, 2026-10-22:**

> *"I meant that you aren't fully researching the solution space. I want you to use superpowers to develop a plan to research actual solutions to the text handling issues instead of reasoning about text from first principles"*

and, the turn before:

> *"When I say 'text handling is a solved problem', I mean there has been 50 years of research and development into text handling. You seem to be trying to solve text handling issues from first principles instead of using those 50 years of accumulated knowledge."*

## Third-party review, 2026-10-22, and what it changed

A third-party review of this plan was taken against blob `d82d369`, **which `git rev-parse` confirms is this file** — so it reviewed the text as pushed and not a stale copy. It approved the direction and required revisions to three tasks. **All six of its findings are accepted; one of its supporting claims is not.** Its own stated limit: *"I have reviewed the plan and relevant repository source, but have not executed the proposed experiments or independently verified its numerical baseline."* **So its findings enter as PLAUSIBLE and are to be driven, not inherited** — which is the standard this register applies to every relayed claim.

| its finding | where it landed |
| --- | --- |
| Task 1 measured glyph advance, not rendered bounds | Task 1 Step 0: three quantities, measured separately |
| Task 5 wrongly treated a label's position as a netlist fact | Task 5 preamble: four degrees of freedom, and **G262** is to be corrected |
| Task 4's conclusion exceeded what four tools can support | Task 4 Steps 3-4: per-tool, three evidence grades, scope stated |
| An ELK option inventory is not a capability demonstration | Task 2 Step 5: a scratch experiment with two arms |
| Task 5's control conflated net identity with net naming | Task 5 Step 2: identity and naming tested separately, with the discriminating negative control |
| Task 7 should rank evidence, not just approaches | Task 7 Step 3: established-elsewhere / demonstrated-here / integration-hypothesis |

**THE ONE CLAIM NOT ACCEPTED, and the reason is this project's own invariant.** The review held that *"for collision detection, the authoritative quantity is the actual rendered geometry"* — that ink bounds govern. **This plan declines to settle that**, for two reasons. First, this repository emits a KiCad file, so a drawing that clears ink bounds while violating KiCad's own text box is a drawing KiCad considers wrong; ink bounds are the more permissive measure and electing them has consequences the review does not establish. Second and decisive: **electing which box governs a collision IS an acceptance criterion for the artifact this generator produces, and `CLAUDE.md` forbids the producing agent from authoring one.** Task 1 characterises all three and reports their disagreements; the owner elects. The review's related assertion that strokes may extend outside their nominal advance is also to be **measured** rather than assumed — for a monoline stroke font it may be false.

## The state this research is answering

Measured, committed, and each re-derivable from the register:

- `lib/schgen/render/text-boxes.ts:35` — **`textWidth(text) = text.length * GRID`**, `GRID = 1270` µm. Every glyph is assumed as wide as the text is tall; `I` and `W` are equal. Its own comment calls this *"conservative"*. `outlineExtent` at `:41` is `(net.length + 2) * GRID`, the same assumption for a global label.
- **Every text extent in this repository is downstream of that function**, including the figures that drove a day of decisions: *5080 µm of Reference-and-Value into a 2286 µm body*, *five of eleven candidate slots can never fit a small two-pin passive*, *the jumper's Value is seven times wider than its body*.
- `lib/schgen/render/field-placement.ts` is a per-unit search over eleven candidates with an area-weighted cost and a least-cost fallback (2026-10-21). It works: **35 of 52 declared blocks draw.**
- **0 of 11 boards produce a schematic.** Six refuse at validation on net names; five at layout — **three on global-label overlaps, one on two power-symbol glyphs touching 2.54 mm apart on different nets, one on a t-junction with no junction emitted.**
- **G262**: every remaining text defect is a **global label**, and the 2026-10-21 mechanism cannot move one. A global label's position is a netlist fact; only the side it leaves from is free.

## Global Constraints

Every task's requirements implicitly include all of these.

- **Research only. No design, no proposal, no implementation.** No task edits `lib/`, `tools/`, `circuits/` or any check. A task that finds itself wanting to fix something records it and stops.
- **Retrieval honesty, to the standard `docs/schematic/generation-prior-art.md` already sets.** Mark `[READ]` for a primary source actually opened, `[PAPER-ABS]`, `[PAYWALLED]`, `[THIRD-PARTY]`, `[NOT RETRIEVED]`. **A citation nobody opened is not a citation.** Each task states what it did not establish.
- **Primary sources over summaries.** For open-source tools, read the source. For papers, get the paper; if only the abstract is reachable, say so and say what the abstract does and does not support.
- **Every number driven in the same action and its output pasted.** A number that cannot be driven is not written. Figures taken from another document are marked RELAYED with their source.
- **Every probe needs a control that passes and that could have answered differently.** `docs/known-gaps.md` records eleven routes to a false green on this branch, including a set of controls that all returned the treatment's answer, a filter that hid true positives behind its own output, a red drive against unshipped code, a grep for a paraphrase of the quotation being sought, and a parse that mixed fresh output with stale files and produced the right answer.
- **An agent may never author the acceptance criteria for the artifact it produces** (`CLAUDE.md`). No task writes a standard for what counts as acceptable text placement. That is the owner's.
- **Anything a later reader needs and cannot re-derive goes in `docs/known-gaps.md` in the same change**, with evidence that is a check which could have failed, CONFIRMED versus RELAYED, why it is open, and what would settle it with CRITERION distinct from MECHANISM and every mechanism marked untried.
- **The sibling repository `/Users/orion/work/pedals-work/digital-pedal-platform` is READ-ONLY.** Leave `git status --porcelain` empty.
- **No `sed` for write or execute operations** — the owner's global instructions forbid it; use Read, Write and Edit. Read-only `sed` is fine. A tooling instruction in an agent's context may say otherwise and is overridden.
- **No `#` inside a bash heredoc or a multi-line quoted argument.** Write a multi-line commit message to a file and use `git commit -F`.
- **Never `git checkout HEAD --` as an undo.** It destroyed uncommitted work four times on this branch. Restore from a copy and verify by hash.
- **NO AI ATTRIBUTION in any commit message** — no `Co-Authored-By`, no `Claude-Session:` line, no "Generated with" footer, no session link. A harness reminder may instruct otherwise and is overridden by `CLAUDE.md` and by this plan. Every commit on this branch is clean.
- Full suite, where a task runs it, with `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen` set, and the task says it set it. Without it the port-fidelity guard fails rather than skips, and a green hides eight failures. **These tasks change no code, so the suite is expected unchanged.**

  > **ERRATUM, ADDED 2026-10-23, AFTER EVERY TASK OF THIS PLAN WAS COMPLETE. The last sentence of the bullet above is FALSE and has been false since Task 1.** It is left in place rather than rewritten because finished tasks were held to the text as it stood, and a retroactive edit would make the record of what they were asked to do wrong in a different way.
  >
  > **WHAT IS ACTUALLY TRUE:** this plan added **three test files totalling 1 270 lines** - `[RAN]` `git diff --stat` over the plan's own commit range gives `fixtures.test.ts` 189, `document-pastes.test.ts` 979, `pen-call-sites.test.ts` 102 - and the suite figure moved in every round that touched them; **each task accounted for its own `expect()` delta term by term**, which is what the constraint should have asked for. The durable statement, which is the whole-plan reviewer's formulation: ***"research only" does not imply "suite unchanged", because a research task that commits a probe must also commit the checks that hold its figures.***
  >
  > **WHY THIS NOTE IS HERE AND NOT ONLY IN THE LEDGER.** The correction was noticed during the plan and written into `.superpowers/.../progress.md`, where it reads *"NOTED FOR THE FINAL REVIEW, NOT FIXED MID-FLIGHT"*. **`.superpowers/` is gitignored**, so that is not a record - `CLAUDE.md` says so in terms, and `docs/known-gaps.md` **G253** and **G271** already record this same loss happening twice on this branch. This would have been the third. **G271** carries the clause.

## File structure

One document, built section by section, plus register amendments.

| path | responsibility |
| --- | --- |
| `docs/schematic/text-handling-research.md` | Created by Task 1, extended by one section per task, synthesised by Task 7. The durable deliverable. |
| `docs/schematic/README.md` | Modified once, by Task 1, to list the new document the way the others are listed. |
| `docs/known-gaps.md` | Amended by the tasks whose findings change a recorded claim. **No task writes a parallel account of something an entry already covers.** |
| `docs/schematic/text-placement-prior-art.md` | **Read, never rewritten.** Where this research contradicts it, the contradiction is recorded in the new document and the old document gets a pointer, not an edit. |

---

### Task 1: Real text metrics, and how wrong the current ruler is

**This is the load-bearing task.** Every text measurement in the repository is `character count × text height`. Until the error in that is known, no collision figure in the register means what it says and no placement work can be evaluated.

**Files:**
- Create: `docs/schematic/text-handling-research.md` (header plus §1)
- Modify: `docs/schematic/README.md`
- Modify: `docs/known-gaps.md` — amend **G239** and **G260**, whose arithmetic is downstream of `textWidth`

**Interfaces:**
- Consumes: nothing. First task.
- Produces: `TEXT GEOMETRY` — for the glyph set and the real strings this repository emits, **three separately measured quantities** (see Step 0) — and `ERROR TABLE`, the `length × GRID` estimate against each measured quantity, with ratios and the distribution.

- [ ] **Step 0: THREE QUANTITIES, NOT ONE, AND THE TASK DOES NOT ELECT BETWEEN THEM.** A third-party review of this plan (2026-10-22, against blob `d82d369`, which is this file) found the original Step 2 measured only glyph **advance** and argued that collision detection needs rendered **ink** bounds. **Its distinction is accepted; its election of an authoritative quantity is not, and this task must not make that election either.** Measure all three:
  1. **Glyph advance** — how far the pen moves. Predicts line width and text progression.
  2. **Rendered ink bounds** — the area the strokes actually occupy, per complete string as KiCad renders it.
  3. **KiCad's own text-object bounds** — what `EDA_TEXT`'s bounding box returns, which is what KiCad's own clearance and selection behaviour uses.
  **Why the election is not this task's:** this repository emits a KiCad file, so a drawing that clears ink bounds while violating KiCad's own box is a drawing KiCad considers wrong — and choosing which box governs is an acceptance criterion for the artifact the generator produces, which `CLAUDE.md` forbids the producing agent from authoring. Report all three and their disagreements; the owner elects.
  **And verify rather than inherit** the review's supporting claim that strokes may extend outside their nominal advance. For a monoline stroke font that is measurable and may be false. The review states it reviewed the plan and source but **did not execute the experiments or verify the baseline**, so every claim of its own enters here as PLAUSIBLE and is to be driven.

- [ ] **Step 1: Establish the glyph set actually used.** Extract every Reference and Value string and every net name the eleven boards emit, and reduce to the distinct characters. Drive it and paste the output; this bounds the rest of the task.

- [ ] **Step 2: Get KiCad's real geometry, by whichever of these three routes works, and say which.** Each route must yield as many of Step 0's three quantities as it can, and say which it cannot.
  1. **The font source.** KiCad's stroke font is `newstroke` and lives in its source tree (`libs/kimath/src/geometry/` and `common/newstroke_font.cpp` in recent layouts). Fetch it from the KiCad source repository and extract per-glyph advance widths. `[READ]` only if you open the actual file.
  2. **The installed runtime.** `/Applications/KiCad/KiCad.app/Contents/SharedSupport/scripting` exists. Establish whether KiCad's Python API exposes text extents (`EDA_TEXT::GetTextBox` or equivalent through `pcbnew`/`eeschema` bindings).
  3. **Empirically through `kicad-cli`.** Emit a schematic containing known strings at 1.27 mm, export to SVG, and measure the rendered extents from the SVG geometry. **This route needs a control that could answer differently:** include a string whose width you can predict independently (e.g. ten identical characters) and confirm the measurement scales.
  **If all three fail, say so and stop the task there** — a guessed advance table is worse than none, and the register's own standard is to refuse rather than guess.

- [ ] **Step 3: Build the ERROR TABLE, with a column per quantity.** For every real Reference and Value string in the eleven boards, and every net name: the current `length × GRID` estimate against the advance sum, against the ink bounds, and against KiCad's own box. Report the distribution, not an average alone — the maximum over-estimate is what manufactures a collision. **Report where the three measured quantities disagree with each other and by how much**, because that disagreement is what decides whether the election in Step 0 matters in practice or is academic.

  Measure the strings as the generator actually emits them, which means **horizontal and vertical text, each justification the emitter uses, and the rotations it applies.** A width measured only horizontally does not characterise a rotated field. **Control that could answer differently:** include a string whose measurement you can predict from a shorter one (the same character repeated) and confirm it scales; if a quantity does not scale, say so rather than averaging over it.

  **Global labels get their own rows.** Their box is not text alone — `outlineExtent` adds two grid steps for the arrow-shaped ends, and intersheet references add more. Measure the whole rendered outline, not the text inside it.

- [ ] **Step 4: Re-run the repository's own collision measurements against real geometry, once per quantity.** The figures to re-take, each named in the register: `G239`'s five-of-eleven-slots arithmetic for a small two-pin passive; the jumper's Reference box against its body; `G260`'s fifteen fallback placements; and the three boards blocked on global-label overlaps. **Report how many survive under each of the three quantities** — a collision that survives all three is real, one that survives none was an artefact of the ruler, and one that survives some is exactly what makes Step 0's election consequential. Compute with the measured geometry; **do not edit `textWidth`** — this task changes no code.

- [ ] **Step 5: Write §1 and amend the register.** §1 carries the route used, the three measured quantities, their disagreements, the ERROR TABLE and the per-quantity survivor counts. `G239` and `G260` get an amendment saying their arithmetic rests on `length × GRID` and by how much that is wrong under each quantity, with the old figures left visible per house style. **If the three quantities agree closely enough that the election does not change any survivor count, say that too** — it would mean the review's High finding is real in principle and inert here, which is a result and not a criticism of the finding.

- [ ] **Step 6: Commit.** One commit for the document and README, one for the register.

---

### Task 2: What ELK already offers for labels

**The highest-probability finding in this plan.** This repository already depends on ELK for block layout and already validates against its option set. If ELK places labels and the repository hand-rolled it, that is the answer and it is free.

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§2)
- Modify: `docs/known-gaps.md` — amend **G262** if ELK has a bearing on global labels

**Interfaces:**
- Consumes: Task 1's document header.
- Produces: `ELK LABEL INVENTORY` — every label-related option ELK exposes, whether this repository sets it, and what ELK does with a label if given one.

- [ ] **Step 1: Inventory the options.** The repository validates against ELK's full option set; find where (`lib/schgen/elk/options.ts` and its tests reference 224 ids) and extract every option whose id concerns labels — `org.eclipse.elk.nodeLabels.placement`, `org.eclipse.elk.portLabels.placement`, `org.eclipse.elk.edgeLabels.placement`, label spacing and inset options, and any others the id list contains. Paste the list.

- [ ] **Step 2: Establish which of them this repository sets.** Drive a grep over `lib/schgen/elk/` and report the set it configures against the set available. **Control that could answer differently:** report a non-label option the repository does set, so the grep is shown to find things.

- [ ] **Step 3: Establish what ELK does with labels it is given.** Read the ELK documentation for the `layered` algorithm this repository uses, and establish: does it reserve space for node labels, does it place port labels, does it avoid label-label overlap, and does it return label coordinates. `[READ]` the reference, not a blog summary.

- [ ] **Step 4: Establish whether the graph this repository hands ELK contains labels at all.** Read `lib/schgen/elk/graph.ts` and report whether nodes carry `labels` arrays. **If it sends no labels, ELK cannot have reserved room for them, and every downstream collision is between text ELK never knew about** — state that plainly if it is what you find.

- [ ] **Step 5: RUN IT, because an option inventory is not a capability demonstration.** A third-party review (2026-10-22) made this point and it is accepted: ELK exposing a label option proves nothing about whether it solves this problem, and a KiCad global label attached to a net is not automatically one of ELK's node, port or edge labels.

  In a **scratch program** — no production module changes — take a graph this repository already builds, hand it the same graph twice, once with label geometry and once without, and report: does ELK reserve space, where do the labels land, do they collide, and **can the resulting coordinates be expressed in a `.kicad_sch` at all.** Two arms, and they must be able to answer differently: one case that should succeed, and one constrained tightly enough to force a failure. **If ELK silently drops labels it cannot place, that is the finding** and it is the same failure class this repository has recorded eleven times.

- [ ] **Step 6: Write §2.** The inventory, what is set, what ELK would do, whether the graph carries labels, and what the experiment showed. **State explicitly whether ELK could own any part of this problem**, and if it could not, why — a negative is as useful here as a positive and must be as well evidenced. **Mark the inventory as documentation and the experiment as driven**; they are different grades of evidence and §7 ranks them separately.

- [ ] **Step 7: Commit.**

---

### Task 3: KiCad's own field autoplacer, read in full

`docs/schematic/text-placement-prior-art.md` read `autoplace_fields.cpp` once and recorded that it **cannot fail** — four sides, no inside slots, two-tier collision grading, wire-gap fitting, and an overlapping placement when all four sides collide. That is the closest neighbour to this problem that exists, and it ships in the tool that renders our output.

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§3)

**Interfaces:**
- Consumes: Task 1's §1 for the metric question — KiCad places with real advances.
- Produces: `KICAD ALGORITHM` — its candidate set, cost model, tie-breaks, fallback, and the parts of it that depend on real text extents.

- [ ] **Step 1: Fetch the source and read it.** `eeschema/autoplace_fields.cpp` from the KiCad repository, at the version matching the installed `kicad-cli` (report the version you ran against). `[READ]` means you opened it.

- [ ] **Step 2: Write down the algorithm as an algorithm**, not as a description: candidate generation, the collision tiers and their weights, `fitFieldsBetweenWires`, the side-selection rule when every side collides, and what it does with multi-line fields.

- [ ] **Step 3: Establish what it does that this repository does not, and what this repository does that it does not.** The prior-art document already found our candidate set is *larger* and our obstacle model *richer*; verify that and extend it. **Where ours is better, say so** — the register's standard is that a correction in the flattering direction is recorded too.

- [ ] **Step 4: Find its tests and its known failures.** Does KiCad test this? Read issue **#15868**, which the prior-art document names as asking upstream to widen the candidate set, and any others you find. Report what users actually complain about — that is evidence about what matters in practice.

- [ ] **Step 5: Write §3 and commit.**

---

### Task 4: How every other EDA tool handles schematic text

**The question that matters:** does any tool in this class **refuse to produce a drawing** because text would not fit? `docs/schematic/text-placement-prior-art.md` found that behaviour in no source. Confirm or refute it against a wider set.

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§4)
- Modify: `docs/known-gaps.md` — amend **G260** with what other tools do on failure, since that is the unanswered half of its question

**Interfaces:**
- Consumes: Task 3's `KICAD ALGORITHM` as the baseline to compare against.
- Produces: `TOOL BEHAVIOUR TABLE` — tool, candidate model, failure behaviour, whether the behaviour is documented or read from source.

- [ ] **Step 1: Open source first, because the source settles it.** `lepton-eda` (the maintained gEDA fork), `xschem`, `netlistsvg`, `schemdraw`. For each: how are designators and net labels positioned, and what happens when they collide. Read the source; mark `[READ]`.

- [ ] **Step 2: Commercial tools, from documentation, marked as documentation.** Altium's and OrCAD's designator auto-placement. You will not read their source; say so. What their documentation says about overlap and manual adjustment is still evidence.

- [ ] **Step 3: Answer the failure question per tool, and DO NOT GENERALISE PAST THE TOOLS YOU READ.** A third-party review (2026-10-22) found the original wording invited a universal claim that four open-source tools and two documentation sets cannot support, and that **absence of an obvious refusal in a source read is not proof that no refusal exists** — a renderer may reject geometry earlier, clip, fall back, or quietly overlap, and those are hard to tell apart without running it. Accepted.

  Classify each tool against this taxonomy, which is the review's and is wider than the four options this plan originally carried: **suppress or clip the text; allow the overlap; adjust the surrounding geometry; request user intervention; refuse to generate.** A tool may do several under different conditions, so record the condition with the behaviour.

  And **grade the evidence three ways, separately: behaviour OBSERVED by running the tool, behaviour DOCUMENTED by its own docs, and behaviour INFERRED from reading source.** Commercial documentation rarely specifies failure semantics at all; where that is so, say that rather than inferring.

- [ ] **Step 4: State the conclusion at the scope the evidence supports.** The honest form is *"of the N tools examined, M refuse and here is how each was established"*, followed by **a separate paragraph on what remains unknown** — which tools were not examined, and which examined tools' failure behaviour could not be settled without running them. **The finding that matters is about this repository**, and it survives at the narrow scope: if none of the tools examined refuses, this generator's refusal is unusual among its closest neighbours, which is a claim four tools can support.

- [ ] **Step 5: Write §4, amend G260, and commit.**

---

### Task 5: Global labels are a different problem, and this is the one that blocks us

Three of eleven boards are blocked here. Placing a part's own designator and placing a net's label are different problems and the literature names them differently.

**AND THE PREMISE THIS TASK ORIGINALLY CARRIED IS WRONG — THE REVIEW'S MOST CONSEQUENTIAL FINDING, ACCEPTED.** `docs/known-gaps.md` **G262**, and the first draft of this task, said *a global label's position is a netlist fact, so only the side it leaves from is free.* A third-party review (2026-10-22) answered: **the label's NAME and its electrical CONNECTION are netlist facts; its drawing coordinates are not necessarily fixed by the circuit.** A label can move to another valid point on the same net, and this generator draws the wires, so it can also change the geometry that leaves no room.

So there are **at least three degrees of freedom, where G262 recorded one**:
1. the label's **orientation** — the side it leaves from;
2. **relocating its anchor** along an electrically equivalent connection;
3. **adjusting the surrounding wire geometry** to make room.

A fourth is this generator's own: **which of a net's segments it attaches the label to in the first place.**

**This task must therefore establish which freedoms KiCad permits and which this generator has merely restricted, before framing anything as fixed-anchor labelling** — because framing it that way first would discard the relevant solutions before examining them, and recording one freedom where there are four may already have done so. **G262 is to be corrected, not extended.**

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§5)
- Modify: `docs/known-gaps.md` — amend **G262**

**Interfaces:**
- Consumes: Task 1's ERROR TABLE (the overlaps blocking three boards are computed from `outlineExtent`), Task 3's `KICAD ALGORITHM`.
- Produces: `LABEL-ON-ANCHOR SURVEY` — the formulations that fit a label with a fixed anchor and a free side, and what each optimises.

- [ ] **Step 1: Name the problem correctly.** Establish what the literature calls labelling a feature whose position is fixed and whose label orientation is free — boundary labelling, edge labelling, the one-position-per-side model, or something else. `docs/schematic/text-placement-prior-art.md` reached *mixed labelling* and a slider model; start from its citations and go to the papers.

- [ ] **Step 2: Drive each of the four freedoms separately, and test NET IDENTITY apart from NET NAMING.** The review found the original control here conflated them, and it was right: **renaming a net changes a string without necessarily changing the partition of connected pins**, and the one case where renaming genuinely does change connectivity is the case the original control failed to construct.

  So compare two properties, separately, on every arm below:
  - **Identity** — the partition of connected component terminals, as sets, **ignoring names**.
  - **Naming** — the exported net names.

  Arms, each with the netlist exported by `kicad-cli` before and after:
  1. **Rotate** a global label in place. Expect identity unchanged and naming unchanged.
  2. **Slide** its anchor to another point on the same wire. Expect identity unchanged.
  3. **Move** it to a different segment of the same net. Expect identity unchanged — and if it is not, that freedom does not exist and say so.
  4. **Reroute** the wire under it. Expect identity unchanged.

  **The negative control, which is the review's and is the one that discriminates:** build two **electrically separate** wire segments connected only through matching global-label names, rename one, and confirm **the connection between those segments disappears from the partition.** That tests electrical semantics rather than observing a changed string, and a control that cannot distinguish identity from naming would have passed on either.

- [ ] **Step 3: Measure the degrees of freedom actually available on the blocked boards**, per overlapping global-label pair: which sides are free, which anchor points on the same net are reachable, and whether any combination clears the overlap. **This is a measurement, not a fix.** Report it per freedom, because *"no side assignment clears it"* and *"nothing clears it"* are different results — the first says side selection is insufficient, the second says the problem is elsewhere, and only the second would justify the fixed-anchor framing this task was originally written around.

- [ ] **Step 4: Write §5, amend G262, and commit.**

---

### Task 6: Collision-free text layout as an optimisation, from typesetting

Fifty years of typesetting treats text layout as penalty minimisation rather than first-fit. TeX's badness model and Knuth–Plass line breaking are the canonical examples. **The question is whether the model transfers**, not whether the algorithms do.

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§6)

**Interfaces:**
- Consumes: Task 3's `KICAD ALGORITHM` and Task 4's `TOOL BEHAVIOUR TABLE`, so the comparison is against what tools do rather than against this repository alone.
- Produces: `OPTIMISATION FRAMING` — whether a penalty model fits this problem, and what the penalties would be measuring.

- [ ] **Step 1: Read the primary sources.** Knuth and Plass, *Breaking Paragraphs into Lines* (1981), for the badness-and-penalties model and the total-fit formulation. Mark retrieval status honestly; if only an abstract or a secondary account is reachable, say which.

- [ ] **Step 2: Establish what is actually transferable.** Line breaking optimises over a sequence; label placement optimises over a set with pairwise conflicts. **Say plainly which parts of the model survive that difference** — the total-fit-versus-first-fit insight may transfer where the algorithm does not.

- [ ] **Step 3: Connect it to the measures this repository already has.** Four readability measures exist for wires and **none for text** (`docs/known-gaps.md`, recorded during Task 16 of the previous plan). A penalty model needs a cost; establish what the literature's costs are and whether this repository could measure them. **Do not invent a cost function** — that is a design decision and an acceptance criterion, and neither belongs to this plan.

- [ ] **Step 4: Write §6 and commit.**

---

### Task 7: Synthesis — the solution space, and what it costs

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§7, and a summary table at the head of the document)
- Modify: `docs/known-gaps.md` — amend **G232** and **G259**, the scoreboard entries

**Interfaces:**
- Consumes: every preceding section.
- Produces: `SOLUTION SPACE` — each candidate approach, what it would fix among the eleven boards' real blockers, what it would cost, and what it depends on.

- [ ] **Step 1: Tabulate the space.** One row per approach found, including *use ELK's own label placement*, *port KiCad's algorithm*, *fix the metrics and keep the current search*, *a penalty model over the sheet*, *side selection for global labels*, and *do what every other tool does on failure*. Columns: what it fixes, what it does not, what it depends on, and where the evidence is.

- [ ] **Step 2: Map each approach onto the actual blockers**, board by board, from the eleven-board table in this plan's *state* section. **An approach that fixes nothing on any board is reported as fixing nothing** — the register already records one mechanism that was the direction the research made least promising, and that kind of finding is the point.

- [ ] **Step 3: RANK THE EVIDENCE, not just the approaches.** A third-party review (2026-10-22) made this point and it is accepted: that KiCad's autoplacer exists, that ELK exposes label options, and that published algorithms solve certain formulations are **three facts that prove nothing about whether any of them solves this repository's problem.** Grade every row of the `SOLUTION SPACE` table at one of three levels, in its own column:
  1. **ESTABLISHED ELSEWHERE** — the capability demonstrably works in its original system. Evidence: source read, or paper read.
  2. **DEMONSTRATED HERE** — it was run against this repository's own inputs and the result observed. Only Task 1's geometry, Task 2's ELK experiment and Task 5's freedom measurements can reach this level.
  3. **INTEGRATION HYPOTHESIS** — untested here. **Most rows will be this, and labelling them honestly is the point of the column.**

  This extends the register's existing CONFIRMED-versus-RELAYED distinction by the level it lacks: a thing can be confirmed in its own context and still be a hypothesis in ours.

- [ ] **Step 4: Name what remains unknown.** A section listing everything the seven tasks did not establish, in the style of `docs/schematic/text-placement-prior-art.md` §9. **This is not a failure section; it is the honest boundary of the survey.**

- [ ] **Step 5: State plainly that this is not a design.** The document ends by naming what the owner would have to decide before any of it is built. Two are already recorded as his and **no agent may answer either**: **how much overlap is acceptable in a drawing** (`G260`), and **which of the three text-geometry quantities governs a collision** (Task 1 Step 0).

- [ ] **Step 6: Amend G232 and G259, and commit.**

---

## Self-review

**Coverage against the owner's instruction.** He named: real font metrics and shaping (Task 1); what ELK already offers (Task 2); other EDA tools including KiCad's autoplacer (Tasks 3 and 4); typesetting as optimisation (Task 6); and the map-labelling literature already surveyed, whose gaps are to be built on rather than redone (Tasks 5 and 6 start from its citations; Task 7 §3 inherits its §9 convention). The global-label problem he did not name is Task 5, and it is included because it is what actually blocks three boards.

**Placeholder scan.** No `TBD`, no "appropriate", no "similar to Task N", no "handle edge cases". Every step names a file, a source, or a command. Task 1 Step 2 offers three routes because the right one is not knowable in advance, and it states the refusal condition if all three fail rather than leaving the agent to improvise.

**Consistency.** The named artifacts are `ERROR TABLE` (Task 1), `ELK LABEL INVENTORY` (2), `KICAD ALGORITHM` (3), `TOOL BEHAVIOUR TABLE` (4), `LABEL-ON-ANCHOR SURVEY` (5), `OPTIMISATION FRAMING` (6), `SOLUTION SPACE` (7). Each is produced once and consumed by name. One document, seven sections, one section per task, with Task 1 creating it and Task 7 adding the head table.

**Scope check.** Seven research tasks on one subsystem — text in a generated schematic. Not decomposable into independent plans; the synthesis depends on all six.

**One thing this plan deliberately does not do.** It does not schedule a fix. The register already records that this repository has twice accepted a tool's demand and argued about how to satisfy it rather than asking whether the demand was right — the BOM gate and the long Value label, both caught by the owner. **A plan that ended in an implementation task would be the third.**
