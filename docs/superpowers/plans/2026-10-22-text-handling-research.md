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
- Produces: a per-glyph advance table for the glyph set this repository actually emits, and `ERROR TABLE` — for every real Reference and Value string in the eleven boards, the `length × GRID` estimate against the measured advance sum, with the ratio.

- [ ] **Step 1: Establish the glyph set actually used.** Extract every Reference and Value string and every net name the eleven boards emit, and reduce to the distinct characters. Drive it and paste the output; this bounds the rest of the task.

- [ ] **Step 2: Get KiCad's real advances, by whichever of these three routes works, and say which.**
  1. **The font source.** KiCad's stroke font is `newstroke` and lives in its source tree (`libs/kimath/src/geometry/` and `common/newstroke_font.cpp` in recent layouts). Fetch it from the KiCad source repository and extract per-glyph advance widths. `[READ]` only if you open the actual file.
  2. **The installed runtime.** `/Applications/KiCad/KiCad.app/Contents/SharedSupport/scripting` exists. Establish whether KiCad's Python API exposes text extents (`EDA_TEXT::GetTextBox` or equivalent through `pcbnew`/`eeschema` bindings).
  3. **Empirically through `kicad-cli`.** Emit a schematic containing known strings at 1.27 mm, export to SVG, and measure the rendered extents from the SVG geometry. **This route needs a control that could answer differently:** include a string whose width you can predict independently (e.g. ten identical characters) and confirm the measurement scales.
  **If all three fail, say so and stop the task there** — a guessed advance table is worse than none, and the register's own standard is to refuse rather than guess.

- [ ] **Step 3: Build the ERROR TABLE.** For every real Reference and Value string in the eleven boards, and every net name: the current estimate, the measured width, the ratio. Report the distribution, not an average alone — the maximum over-estimate is what manufactures a collision.

- [ ] **Step 4: Re-run the repository's own collision measurements against real metrics.** The figures to re-take, each named in the register: `G239`'s five-of-eleven-slots arithmetic for a small two-pin passive; the jumper's Reference box against its body; `G260`'s fifteen fallback placements; and the three boards blocked on global-label overlaps. **Report how many survive real metrics and how many were artefacts of the ruler.** Do this by computing with the measured advances; **do not edit `textWidth`** — this task changes no code.

- [ ] **Step 5: Write §1 and amend the register.** §1 carries the route used, the advance table, the ERROR TABLE and the survivor count. `G239` and `G260` get an amendment saying their arithmetic rests on `length × GRID` and by how much that is wrong, with the old figures left visible per house style.

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

- [ ] **Step 5: Write §2.** The inventory, what is set, what ELK would do, and whether the graph carries labels. **State explicitly whether ELK could own any part of this problem**, and if it could not, why — a negative is as useful here as a positive and must be as well evidenced.

- [ ] **Step 6: Commit.**

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

- [ ] **Step 3: Answer the failure question directly.** For each tool: drop the label, overlap it, defer to a human, or refuse. **Report the count.** If no tool refuses, that is the finding and it is about this repository.

- [ ] **Step 4: Write §4, amend G260, and commit.**

---

### Task 5: Global labels are a different problem, and this is the one that blocks us

Three of eleven boards are blocked here and **G262** records that the 2026-10-21 mechanism cannot help: a global label's anchor is a netlist fact, so only the side it leaves from is free. Placing a part's own designator and placing a net's label are different problems and the literature names them differently.

**Files:**
- Modify: `docs/schematic/text-handling-research.md` (§5)
- Modify: `docs/known-gaps.md` — amend **G262**

**Interfaces:**
- Consumes: Task 1's ERROR TABLE (the overlaps blocking three boards are computed from `outlineExtent`), Task 3's `KICAD ALGORITHM`.
- Produces: `LABEL-ON-ANCHOR SURVEY` — the formulations that fit a label with a fixed anchor and a free side, and what each optimises.

- [ ] **Step 1: Name the problem correctly.** Establish what the literature calls labelling a feature whose position is fixed and whose label orientation is free — boundary labelling, edge labelling, the one-position-per-side model, or something else. `docs/schematic/text-placement-prior-art.md` reached *mixed labelling* and a slider model; start from its citations and go to the papers.

- [ ] **Step 2: Establish what KiCad does with global label orientation**, from Task 3's source and from the schematic format. A global label in a `.kicad_sch` has a rotation; what chooses it, and can it be changed without changing connectivity? **Drive this**: rotate a global label in a generated sheet, re-export the netlist with `kicad-cli`, and confirm the netlist is identical. **Control:** change the label's net name and confirm the netlist does move.

- [ ] **Step 3: Establish how many degrees of freedom we actually have**, per blocked board: for each overlapping global-label pair, which sides are available, and whether any assignment of sides clears the overlap. **This is a measurement, not a fix.** If no assignment clears it, the problem is not side selection and §5 must say so.

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

- [ ] **Step 3: Name what remains unknown.** A section listing everything the seven tasks did not establish, in the style of `docs/schematic/text-placement-prior-art.md` §9. **This is not a failure section; it is the honest boundary of the survey.**

- [ ] **Step 4: State plainly that this is not a design.** The document ends by naming what the owner would have to decide before any of it is built — including the one question already recorded as his: **how much overlap is acceptable in a drawing** (`G260`), which no agent may answer.

- [ ] **Step 5: Amend G232 and G259, and commit.**

---

## Self-review

**Coverage against the owner's instruction.** He named: real font metrics and shaping (Task 1); what ELK already offers (Task 2); other EDA tools including KiCad's autoplacer (Tasks 3 and 4); typesetting as optimisation (Task 6); and the map-labelling literature already surveyed, whose gaps are to be built on rather than redone (Tasks 5 and 6 start from its citations; Task 7 §3 inherits its §9 convention). The global-label problem he did not name is Task 5, and it is included because it is what actually blocks three boards.

**Placeholder scan.** No `TBD`, no "appropriate", no "similar to Task N", no "handle edge cases". Every step names a file, a source, or a command. Task 1 Step 2 offers three routes because the right one is not knowable in advance, and it states the refusal condition if all three fail rather than leaving the agent to improvise.

**Consistency.** The named artifacts are `ERROR TABLE` (Task 1), `ELK LABEL INVENTORY` (2), `KICAD ALGORITHM` (3), `TOOL BEHAVIOUR TABLE` (4), `LABEL-ON-ANCHOR SURVEY` (5), `OPTIMISATION FRAMING` (6), `SOLUTION SPACE` (7). Each is produced once and consumed by name. One document, seven sections, one section per task, with Task 1 creating it and Task 7 adding the head table.

**Scope check.** Seven research tasks on one subsystem — text in a generated schematic. Not decomposable into independent plans; the synthesis depends on all six.

**One thing this plan deliberately does not do.** It does not schedule a fix. The register already records that this repository has twice accepted a tool's demand and argued about how to satisfy it rather than asking whether the demand was right — the BOM gate and the long Value label, both caught by the owner. **A plan that ended in an implementation task would be the third.**
