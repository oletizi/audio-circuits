Schematic generation and readability: the research record
=========================================================

**Six research passes** landed on 2026-10-19, ahead of the schematic-generation
work described in
[`../superpowers/specs/2026-10-08-agent-authored-boards-design.md`](../superpowers/specs/2026-10-08-agent-authored-boards-design.md)
and its child spec
[`../superpowers/specs/2026-10-19-schematic-authoring-design.md`](../superpowers/specs/2026-10-19-schematic-authoring-design.md).
They sat loose at the top of `docs/` with nothing in the repository pointing at
them, which is why this index exists: **committed is not durable if nobody can
find it.**

> **Inventory corrected 2026-10-19, on an independent review of the child spec,
> and shown rather than edited away.** This file was written when there were
> three passes and extended to six without its counts being updated, so it said
> *"the three documents"* and *"None of the three"* while indexing six, and
> profiled three of six under **The documents**. A reader counting the tables
> would have concluded that three of the passes were not indexed material. The
> counts are fixed below and the three missing profiles are added.

> **THE EIGHTH PASS FINISHED 2026-10-23, AND THE NOTE THAT STOOD HERE SAID IT
> HAD NOT.** It read: *"AN EIGHTH PASS IS LANDING FROM 2026-10-22, SECTION BY
> SECTION, AND IT IS NOT FINISHED ... §1 is committed."* That was true when
> written and false from the moment §7 landed, which is this index's own worked
> example happening a third time: **a count, or a status, edited into a document
> while the thing it describes keeps moving.** All seven sections of
> `text-handling-research.md` are committed, the plan is
> [`../superpowers/plans/2026-10-22-text-handling-research.md`](../superpowers/plans/2026-10-22-text-handling-research.md),
> and **three documents came out of it that are not research passes** and are
> indexed at the end of this file rather than in the tables above:
> [`text-handling-report.md`](text-handling-report.md) - **start there, not
> here, if you want the findings** - [`false-greens.md`](false-greens.md), and
> the execution record at
> [`../superpowers/plans/2026-10-22-text-handling-research-execution/`](../superpowers/plans/2026-10-22-text-handling-research-execution/).

> **A SEVENTH PASS LANDED 2026-10-21, AND THE COUNTS BELOW ARE ABOUT THE SIX
> RATHER THAN ABOUT THIS DIRECTORY.** `text-placement-prior-art.md` researched
> **text placement**, which the six passes do not cover at all: they are about
> GRAPH layout - crossings, bends, angular resolution, annealing over part and
> wire positions - and a reader looking for where a part's Reference and Value
> go will find nothing in any of them. It is indexed in both tables below.
> **The opening's "six" is left as written rather than silently incremented**,
> because the correction above is the worked example of a count edited while the
> thing it counts was not: say what changed.

**This index's first job is not to summarise what the six documents say. It is
to record how much each one can be trusted, because they differ sharply and
nothing in their file names says so.** A later reader who treats them as equal
evidence will build on the weakest of them without knowing it.

**Its second job is to state the question each was asked.** A research document
answers the question it was given, not the question a later reader arrives with.
Where your question is not the one in the table, the document is a lead and not
an answer.

**None of the six is approved criteria.** Each is findings with sources, for
someone who is not the producing agent to turn into criteria - `CLAUDE.md`: *"An
agent may never author the acceptance criteria for the artifact it is
producing."*

How much each can be trusted
----------------------------

Strongest first. This ordering is the point of the table.

**There are two different kinds of strength here and a single ranking would blur
them**, so the table groups by METHOD. A pass that ran code and a pass that read
primary sources are both strong, in different ways and against different failure
modes: running catches a tool that does not do what its README says, reading
catches a claim nobody checked. **The one genuinely weak pass is the one that did
neither.**

**Measured by running it.** These executed the thing and looked at what came out.

| Document | Evidentiary standing | What that means concretely |
| --- | --- | --- |
| [`text-handling-research.md`](text-handling-research.md) §1 | **Measured by three independent routes that agree exactly, with controls, from a COMMITTED probe that pins its input** | Every figure comes from one run of `tools/schgen/text-metrics/probe.ts` at a named commit with a clean tree, against a `newstroke_font.cpp` blob the probe refuses unless its SHA-256 matches. KiCad's font source, the installed `pcbnew` bindings and eeschema's own SVG and PDF exports measure the same quantities and agree **exactly** on KiCad's own box width over all 264 strings, and to **0.3 um** and **0.8 um** on the ink and the label outline. Its re-run of the field placer is held to production's own output by a control that could fail. **It elects nothing**: three text-geometry quantities are measured and the choice between them is left to the owner |
| [`generation-prior-art-circuit-families.md`](generation-prior-art-circuit-families.md) | **Strongest methodology of any pass - it ran a CONTROL** | Ran two tools against the four non-Pultec circuit families. Its central claim - that net degree and not circuit family or part count defeats a router - is established with a control that separates the variables: 15 parts in a series chain routed 15/15 while 15 parts on one degree-15 net routed 1/5. It also reports its own harness's bugs separately from the tools' failures, and proves one of its guards by mutating it. |
| [`generation-prior-art-second-pass.md`](generation-prior-art-second-pass.md) | **Measured, no controls** | Cloned five repositories, ran four, rendered schematics and looked at them. Marks every finding `[RAN]`, `[CODE]` or `[RELAYED]`. Its scope was **the Pultec alone**, which is the circuit those tools are worst at - the error the circuit-families pass above corrects. Read the two together or the first will mislead you. |
| [`generation-prior-art-third-pass.md`](generation-prior-art-third-pass.md) | **Mixed - ran one tool, read one key source, surveyed the rest** | Ran `netlistsvg`/ELK against the probes that defeated other tools (10/10, byte-identical across 30 runs) and read the AEM formula directly from an open-access preprint. Its forty-year literature survey is citation work, not measurement, and should be read as such. **Do not read its ELK result as "ELK draws good audio schematics"**: its own §3.5 measures the 25-part Pultec-shaped probe as *"not a good audio schematic"* - 15 inter-net crossings, 1.72 bends per edge. Routing success and determinism are what it establishes. |

**Primary sources, read directly.** These read the thing itself rather than a summary of it.

| Document | Evidentiary standing | What that means concretely |
| --- | --- | --- |
| [`schgen-development-history.md`](schgen-development-history.md) | **Primary sources, read directly** | Its author read a repository's own git history, its spec at named revisions, its committed verification record, and the session transcripts, streamed and quoted. Every claim is marked **CONFIRMED** (source read and cited) or **INFERRED**, and agent narration is labelled as agent narration. |
| [`text-placement-prior-art.md`](text-placement-prior-art.md) | **Mixed, and the mix is per-source** - two papers and one implementation read in full, the rest abstracts | Two papers were extracted to text locally and are quoted from their own bodies (`[PAPER-FULL]`); KiCad's `autoplace_fields.cpp` was downloaded and read line by line (`[CODE]`); eight claims about this tree are `[MEASURED-HERE]` commands. Everything else is `[PAPER-ABS]` or `[THIRD-PARTY]` and marked. **It ran no labelling algorithm and did not build KiCad**, so its behavioural claims about KiCad are read off source, not observed. |
| [`readability-research.md`](readability-research.md) | **Mixed, and the mix is clause-by-clause** | ANSI/ASME Y14.15-1966 and IEEE 315 were read directly and are quoted at clause level. The three **in-force** standards that hold the layout requirements - IPC-2612, IEC 61082-1, ASME Y14.2 - were obtained as **clause and figure titles only**. About a dozen candidate-criteria rows are therefore flagged *title only*, and **no requirement is paraphrased from a title.** |

**Surveyed only.** This one verified nothing.

| Document | Evidentiary standing | What that means concretely |
| --- | --- | --- |
| [`generation-prior-art.md`](generation-prior-art.md) | **Weakest of all six - nothing verified by running or by reading a primary source** | No repository cloned, no generator executed, no generated schematic rendered and looked at. Every page was read through a summarising fetch tool, so `[REPO]` means *"the README says"*. Its own statement: *"a map of where to look, not a measurement."* Star counts, commit counts and last-activity dates are **its least reliable facts** - though the second pass re-checked several against the GitHub API and found them exactly right, so what deserved distrust was everything it INFERRED about behaviour, not the counts. |

**Three of its characterisations have since been measured false**, which is the
clearest argument for the grouping above: it called `netlistsvg` effectively
unmaintained (the default branch has commits through January 2024), digital-only
(it ships a first-class analog skin with 25 symbol types), and left-to-right
(the analog skin sets ELK direction `DOWN`). **Do not build on this document
without checking the pass that measured the same thing.**

Two things that follow, and both have bitten already:

- **A clause title establishes that a standard rules on a topic, never what it
  requires.** This is `docs/known-gaps.md` **G69**'s rule and it binds every
  *title only* row in the readability research. The procurement gap itself is
  **G70**.
- **An unread threshold is not an unset one.** A number behind a paywall must be
  read (**G70**); a number no source anywhere states is a decision (**G71**).
  Conflating them is how a chosen number passes as a cited one.

The documents
-------------

### [`text-handling-research.md`](text-handling-research.md)

From 2026-10-22, **one section per task of
[`../superpowers/plans/2026-10-22-text-handling-research.md`](../superpowers/plans/2026-10-22-text-handling-research.md).
FINISHED 2026-10-23; all seven sections are committed.** This paragraph said
*"NOT FINISHED. §1 is committed; §2-§7 are not yet written"* until the pass
ended, and the trust table above still grades **§1 only** - deliberately, because
the sections do not share a standing and a single grade for 5,800 lines would be
the blurring this index exists to prevent:

| section | what it did | standing |
| --- | --- | --- |
| §1 | real text metrics, three routes | **measured, three agreeing routes, controls, committed probe** |
| §2 | what ELK offers for labels | **measured** - nine arms driven against this repository's own graphs |
| §3 | KiCad's field autoplacer | **primary source read in full** at a pinned tag, nine blobs hash-pinned; nothing executed |
| §4 | six other EDA tools | **mixed per tool** - two RUN, two source-read, two vendor documentation |
| §5 | the four label freedoms | **measured** - driven against `kicad-cli` on nine committed fixtures, with a negative control that discriminates |
| §6 | typesetting as optimisation | **primary source read in full**, quotations transcribed from rendered page images because the scan's OCR mangles them; one measurement of this generator's own placer |
| §7 | the synthesis | **relays §1-§6 by design** and says so; one measurement of its own, the board census |

**Do not read §7's table as eighteen available options.** Its own grading column
puts six rows at *established elsewhere*, eight at *demonstrated here* - **of
which six demonstrate a LIMIT rather than a capability** - and four at
*integration hypothesis*. By the document's own strongest criterion, a drawn
board, **not one of the eighteen has been shown to draw one.**

**The question it was asked**, and it is the owner's in his own words, after the
seventh pass had surveyed the labelling literature and the generator still drew
0 of 11 boards: *"I meant that you aren't fully researching the solution space.
I want you to use superpowers to develop a plan to research actual solutions to
the text handling issues instead of reasoning about text from first principles."*
**It designs nothing and recommends nothing**, by the plan's own constraint; the
design that follows it is a separate exercise the owner reviews.

**What §1 establishes.** `lib/schgen/render/text-boxes.ts`'s
`textWidth(text) = text.length * GRID` is the ruler every collision figure in
`../known-gaps.md` is downstream of, and its own comment calls it
*"conservative"*. Measured against KiCad's real geometry over the 264 distinct
strings the eleven boards emit: against the rendered ink it over-reserves by a
median of 18% and a maximum of 87%; **against KiCad's own `EDA_TEXT::GetTextBox`
it is too SMALL for 70 of the 264**; and in HEIGHT it is too small under both
measured quantities always - 1270 um against 1422.4 of ink and 2043.1 of KiCad's
box. **Of the fifteen fallback field placements `../known-gaps.md` **G260**
records, thirteen survive under every quantity, and under KiCad's own box all
fifteen survive and nine more appear.**

**Two findings about the tooling rather than about this repository**, both
driven: `kicad-cli sch export svg` 10.0.5 draws a global label's text and not
its outline, where `export pdf` draws both; and the third-party review's claim
that strokes may extend outside their nominal advance is **false for this glyph
set** - exactly one printable-ASCII glyph overhangs, and it is the backslash.

**The decision it refuses to take, and names as the owner's:** which of the
three text-geometry quantities governs a collision. §1.9 measures that the
choice changes the recorded population from 13 to 24, so it is consequential
rather than academic.

**Registered from it:** amendments to `../known-gaps.md` **G239** and **G260**,
and a new entry for the `kicad-cli` SVG hole.

### [`schgen-development-history.md`](schgen-development-history.md)

2026-10-19, 782 lines, committed `8a4d8f7`.

**The question it was asked:** how did `tools/schgen` in the pedals repository
actually arrive at drawings somebody accepted? What was it arrived at *from*,
what was abandoned, **who decided the drawings were good enough**, and what was
each of its ~160 clearance refusals reacting to?

**Sources, which is why it is the strongest:** 105 commits touching
`tools/schgen`, the design spec at three named revisions (including `git show`
of the abandoned rev 1), two plans of rulings, the committed 1295-line
`VERIFICATION.md` that holds the readability review verbatim, and 278 transcript
files totalling 743 MB - including the readability reviewer's own dispatch
prompt, recovered and quoted.

**What a planner most needs from it:** there was never a readability score and
none was attempted (§4); "acceptable" meant one blocking defect fixed and
nineteen cosmetic ones adjudicated, by an agent reading PNG renders, with no
human in the loop (§5, §9); the clearance refusals accreted pairwise, each
exposing the previous ones' blind spot (§6); and §8's seven dead ends are the
cheapest part of the whole record.

**Its own limits are in §9**, stated rather than filled in - including that it
could not establish whether the third-party reviewer was a human or a model, and
that it has **no evidence at all** about how those templates behave on a
discrete audio circuit.

**Registered from it:** `docs/known-gaps.md` **G81**-**G87**, and an extension
to **G71**.

### [`readability-research.md`](readability-research.md)

2026-10-19, 1240 lines, committed `51f8362`.

**The question it was asked:** what do the published standards actually say
about readable schematics? It was commissioned so that the criteria a schematic
generator is judged by come from outside the generator and outside any agent's
taste, after the owner declined to supply them himself: *"readable schematics
are a long-standing standard practice in electrical engineering with
well-documented practices, standards, and requirements. Asking me to qualify and
quantify those well-understood norms seems like you asking me to do your job."*

**Its headline finding is that he was more right than the question assumed about
where the norms live:** symbols are standardised (IEEE 315, IEC 60617) and
arrangement is standardised *elsewhere*, and the North American chain for
arrangement is broken at both ends - the symbol standard is inactive and the
layout standard it points at by name is **withdrawn with no replacement**
(**G68**).

**What was read directly, and what was not.** Y14.15 and IEEE 315 are quoted at
clause level. IPC-2612, IEC 61082-1 and ASME Y14.2 are **titles only**, which is
a procurement problem rather than a research one (**G70**, §7.1). It invents no
thresholds: three numbers in its criteria table are quoted with their clause, one
is labelled *derived arithmetically*, and every threshold no source states is
named as an unset decision (§7.3).

**Registered from it:** **G68**, **G69**, **G70**, **G71**, **G72**, **G73**,
**G74**, **G75**.

### [`generation-prior-art.md`](generation-prior-art.md)

2026-10-19, 749 lines, committed `ba6dba1`.

**The question it was asked:** what already exists in agent and programmatic
schematic generation? Commissioned before deciding whether to port one
particular generator, and it **makes no recommendation about that port.**

**Its organising question changed mid-research, on the owner's correction.** It
began by asking of each tool whether it emits a drawn schematic or only a
netlist, on a hypothesis that much of the field skips the schematic. He rejected
the framing: *"In what world would an entire industry willingly forego
human-readable schematics in favor of a purely machine-centric
netlist-to-pcb pipeline with no human oversight? I don't ask you to write in
assembly. Why would I ask you to write in netlists?"* The research bears him
out - the position "no readable representation at any stage" is **empty**.

**How to read it:** every item carries an evidence mark - `[REPO]`,
`[PAPER-FULL]`, `[PAPER-ABS]`, `[VENDOR]`, `[THIRD-PARTY]`, `[PAYWALLED]` - and
the mark is the claim's standing. Nothing in it was run. **Re-check any number
before building on it.**

**Registered from it:** **G76**, **G77**, **G78**, **G79**, **G80**.

### [`generation-prior-art-second-pass.md`](generation-prior-art-second-pass.md)

2026-10-19, 383 lines, committed `a588f47`.

**The question it was asked:** the first pass closed by calling itself *"a map of
where to look, not a measurement"* - so what happens when you actually run the
tools it mapped? Like the first pass, **it makes no recommendation about the
port.**

**What it did:** cloned five repositories and ran four of them, built inputs with
SKiDL, rendered schematics and looked at them; re-checked the first pass's star
and commit counts against the GitHub API and found them exactly right. Versions
are recorded. Every finding is marked `[RAN]`, `[CODE]` or `[RELAYED]`.

**Its own scoping error, which the circuit-families pass below corrects and the
owner caught:** it ran those tools **against the Pultec alone** - the passive EQ,
the circuit they are worst at - and let a reader infer that nothing can draw our
circuits. **Read the two together or this one will mislead you.**

**Registered from it:** nothing under its own name. Its measurements reach the
register through **G90**, and the first pass's three measured-false
characterisations above are its work.

### [`generation-prior-art-circuit-families.md`](generation-prior-art-circuit-families.md)

2026-10-19, 293 lines, committed `afd18b4`.

**The question it was asked:** the second pass ran against the Pultec only - so
how do those tools behave on **the other four circuit families in this
repository**, and is "passive 20th-century EQ" actually the explanation for the
failures? **It makes no recommendation about the port.**

**Why it is the strongest methodology of any pass: it ran a control.** Its
central claim - that **net degree**, not circuit family and not part count, is
what defeats a general schematic router - is established by separating the
variables: 15 parts in a series chain routed 15/15, while 15 parts on one
degree-15 net routed 1/5. It also reports **its own harness's bugs separately
from the tools' failures** (§0), and proves one of its guards by mutating it.

**Two findings about this repository rather than about any tool**, both in §0(b):
`lib/sim/device-lines.ts` has no emission rule for `kind: "ic"` and throws on
`circuits/pt2399-core`, and that circuit's 5-pin header declares no
`PartSpec.electricallyInert`.

**Registered from it:** **G88**, **G89**, and **G90** - the last jointly with the
third pass, which supplies its ELK half.

### [`generation-prior-art-third-pass.md`](generation-prior-art-third-pass.md)

2026-10-19, 1004 lines, committed `3f4483b`.

**The question it was asked**, and it is the owner's in his own words, after he
declined to believe the first two passes' result: *"The reason I asked about state
of the art is not to be self-aggrandizing; it's because I literally can't believe
that an entire industry doesn't have prior art for machine-generated
schematics."* **He was right** - the field has a continuous published literature
from 1984, a commercial vendor whose only product is a schematic generation
engine, and a patent estate. **It makes no recommendation about this project's
plans.**

**Its three strengths are of three different kinds, and the document keeps them
apart.** It `[RAN]` `netlistsvg`/ELK against the probes that defeated
`schematizer` - ten probes, three runs each, byte-identical every time. It
`[READ]` the AEM formula and its benchmark tables out of an open-access preprint
it downloaded and extracted itself, and cloned the BSD-2-Clause netlist dataset
they were validated on. Its forty-year literature survey is **citation work, not
measurement**, and `[READ]` and `[RELAYED]` are kept strictly apart because that
distinction is the pass's whole point.

**The measurement a planner is most likely to misread.** The 14-capacitor probe
drew at zero inter-net crossings; the **25-part Pultec-shaped probe** rendered
*"correctly and legibly ... and is **not a good audio schematic**"* - 15 inter-net
crossings, 1.72 bends per edge, selector throws crossing the full canvas width,
signal flow neither left-to-right nor top-down. **Quoting the first without the
second overclaims, and the child spec did exactly that until its revision 1
withdrew the sentence.**

**Registered from it:** the AEM extension to **G78**, and the ELK half of
**G90**.

### [`text-placement-prior-art.md`](text-placement-prior-art.md)

2026-10-21, committed with this entry. **The seventh pass, and the only one
about TEXT.**

**The question it was asked**, and it is the owner's in his own words, after
three rounds of work on `lib/schgen/render/field-placement.ts` had measured one
implementation's failure rate and escalated it to him as a scope decision:
*"Have you stopped to actually think about text placement issues as a general
problem space and research prior art on the subject. My guess is that your
approach has been extremely naive and you've given up and made it a me problem
instead of a you problem."* **He was right.** The problem has a name
(point-feature label placement), a 1995 empirical comparison, a complexity
result, a standard three-term objective, a 54-reference survey of the
leader-line escape, and an open-source reference implementation inside KiCad -
and none of it had been consulted. **It makes no recommendation and designs
nothing.**

**What it read directly.** Christensen, Marks & Shieber's *TOG* 14(3) paper and
Bekos, Niedermann & Nöllenburg's external-labelling survey were extracted to
text locally and are quoted from their own bodies; KiCad's 794-line
`eeschema/autoplace_fields.cpp` was downloaded and read. Its §7 and §8 claims
about this tree are `[MEASURED-HERE]` commands.

**The four findings a planner most needs from it:** the standard objective
**maximises labels placed** and the three documented things a greedy algorithm
does when a label will not fit are *drop it, draw it overlapping, or ask a
person* - **refusing the drawing is a fourth thing no source does** (§2);
**KiCad's own autoplacer cannot fail** and falls back to placing the text
overlapping on the least-pinned side (§5); `field-placement.ts` is a **greedy
sequential first-fit with no backtracking and no fallback**, so one unit's text
can make a later unit unplaceable (§7); and **this repository already ships a
scored, weighted, least-cost text placer with leader lines** in
`tools/guide/placement.ts` and `tools/guide/render-edges.ts`, committed three
weeks before the schematic placer (§8).

**Its own limits are in §9**, and two matter: it ran **no** labelling algorithm
and did not build KiCad, so every behavioural claim about KiCad is read off
source; and the sliding-label literature's central quantity - how many more
labels a slider model places than a fixed-position one - **was not retrieved.**

**Registered from it:** amendments to `docs/known-gaps.md` **G232** and
**G239**. It writes no new entry, by instruction, so that the account stays in
the entries the scope decision is being taken on.

Where the findings bind
-----------------------

A research document is not a rule file. Findings become binding in two places,
and both are outside all six files:

- **`docs/known-gaps.md`** - the register. Everything a later reader needs and
  cannot re-derive was written there in the change that found it, with each
  entry marked CONFIRMED or RELAYED. Entries **G68**-**G90** came out of these
  six passes.
- **[`../superpowers/specs/2026-10-08-agent-authored-boards-design.md`](../superpowers/specs/2026-10-08-agent-authored-boards-design.md)** - the
  program these were commissioned for. Its *"Correction, 2026-10-19"* note is
  the worked example of the gap between what a research pass establishes and
  what a spec had assumed.
- **[`../superpowers/specs/2026-10-19-schematic-authoring-design.md`](../superpowers/specs/2026-10-19-schematic-authoring-design.md)** - the
  child spec for T2, which is where these findings were first turned into
  criteria. **Its *"Revision 1"* section is the second worked example**: an
  independent review found that it had quoted the third pass's most regular probe
  and generalised from it, and the overclaiming sentence is shown withdrawn
  rather than edited away.

What this index does NOT cover
------------------------------

**It indexes the six research passes and nothing else, and SEVEN later documents
in this directory are not in it.** It said *"five"* until 2026-10-23, when the
eighth pass added two; the number is corrected rather than the sentence rewritten,
for the reason the inventory note at the top of this file gives. Stated here
rather than left for a reader to notice, because this index's own opening says
*"committed is not durable if nobody can find it"*:

**The first two rows are the eighth pass's, and the first of them is where a
reader should start** - ahead of this index, ahead of the research document, and
ahead of the register:

| document | what it is | how much it can be trusted |
| --- | --- | --- |
| [`text-handling-report.md`](text-handling-report.md) | **the human-facing report on the eighth pass** - what was asked, what was found in order of consequence, what it means for the mandate's five output classes, what is reserved to the owner, and what was not established | **Relays almost everything and says so in its own header**; its own work is a re-drive of the board census that CONFIRMS `../known-gaps.md` **G274** clause (2) rather than discovering it, plus one inference marked where it appears. It exists because the research document is written for an adversarial reader rather than a human one. **Its §2 leads with G274(2)'s finding rather than §1's: text placement is the sole cited cause of refusal on TWO of the eleven boards, and six refuse before any text is placed** |
| [`false-greens.md`](false-greens.md) | **twenty-nine** distinct mechanisms by which a check on this branch looked green and established nothing, in six families, each with its instance, how it was caught, and the general form | **24 of 29 verified by its author against the source, 5 `[RELAYED]` with their source named**, which a catalogue of false greens had better be. **This row said *"the sixteen"* until 2026-10-23** - the controller's estimate, written into the index before the sources were walked, and corrected here by the controller because the document's own author declined to revise the entry that grades its work. Its closing section splits the twenty-nine **18 suite-catchable / 1 partly / 10 reader-only** and transfers four families to PCB place-and-route |

**The remaining five predate the eighth pass** and are the spikes and parity
measurements:

| document | what it is | how much it can be trusted |
| --- | --- | --- |
| [`elk-spike.md`](elk-spike.md) | ELK on whole circuits, flat | **Measured, no template and no block scale.** Every figure went through `netlistsvg` at `d3518f1` with its pinned `elkjs` 0.7.1, which this generator does not use - `../known-gaps.md` **G180** names the three figures that were properties of its skin |
| [`elk-block-spike.md`](elk-block-spike.md) | the same, one declared block at a time | **Measured, with a paired control and a byte-identical regeneration of the first spike's inputs as the check that its extracted converter changed no behaviour.** Same frontend contamination |
| [`template-parity.md`](template-parity.md) | do the ported templates draw this repository's blocks? | **GENERATED and content-compared on every test run.** A measurement with no target (spec §5.1) |
| [`template-parity-anchors.md`](template-parity-anchors.md) | what a template COULD draw under an anchor probed over a block's own members | **GENERATED.** Read it only beside `template-parity.md`: `../known-gaps.md` **G160** is explicit that a realised probe is not a recommendation to declare that anchor |
| [`m1-remeasurement.md`](m1-remeasurement.md) | the two spikes' figures re-taken on the real pipeline | **Measured on this generator, every figure produced by committed code and pinned by a committed test.** It is also the record of which spike figures CANNOT be compared, and why |
| [`reference-graph-checks.md`](reference-graph-checks.md) | gate 8's M1 half: a generated schematic's netlist against a hand-arranged one, by value and pin-level adjacency | **Measured, and the headline is a GAP rather than a result.** Every figure comes from a real `kicad-cli` export and is asserted on every run - and the gate **has never run against a generated drawing**, because `generate` refuses both references at gate 1 (`../known-gaps.md` **G238**, **G240**). Read the first section before reading the table |

**The two spikes are the strongest evidence in this directory about ELK and the
weakest about THIS generator**, and `m1-remeasurement.md` is where the difference
is measured rather than argued: of the five figures the block spike's own table
publishes per block, **two are the same quantity as this generator's and three
are not.**

Four research documents landed in `docs/research/` on 2026-10-28, and nothing pointed at them
================================================================================================

**Same failure this index exists to prevent, one directory over.** They are
indexed here rather than in a new index because a reader looking for "what does
the field already do" looks here first, and because two of the four are partly
superseded by the eight passes above and need to say so where they are found.

> **THE HEADING SAYS FOUR AND THERE ARE SIX, and the heading is left as written
> rather than silently incremented, for the reason this file gives three times
> above.** `2026-10-28-academic-schematic-generation-check.md` was committed on
> 2026-10-28 and never added to the table below; it is added now.
> `2026-10-28-drafting-practice-survey.md` landed the same day and is the sixth.
> **What changed is the directory, not the sentence.**

| document | what it is | how much it can be trusted |
| --- | --- | --- |
| [`../research/2026-10-28-draughtsmanship-tool-bakeoff.md`](../research/2026-10-28-draughtsmanship-tool-bakeoff.md) | **READ THIS ONE FIRST of the four.** Which external tool to REUSE today for draughtsmanship - how a schematic is drawn and judged, connectivity assumed given. copperhead, `kicad-sch-api`, `kicad-mcp-pro`, `kicad-sch-lint`, and four more | **Everything in it was installed and RUN** against `build/schgen-boards/pultec-low-boost/` and `build/schgen-boards/transistor-preamp-lab/` on KiCad 10.0.5, with a hand-drawn control. Three results bind: copperhead's 13-family checker **is** reusable as a standalone gate on an arbitrary `.kicad_sch` (`score schematic --file`, or `checkLegibility(path)`); `kicad-sch-api` **destroys every `global_label`** on a no-op save and KiCad's own netlist export shows the named nets gone; and `rashuky/kicad-sch-lint` took `transistor-preamp-lab` from 2 errors to **0** with the netlist provably unchanged. It also records that **two external checkers contradict our own `STATUS.md`**, which calls a sheet with nine text-on-wire collisions "No findings" |
| [`../research/2026-10-28-drafting-practice-survey.md`](../research/2026-10-28-drafting-practice-survey.md) | **PRACTICE, not tools and not standards** - who drafts, what conventions practitioners actually follow, how schematic review is run as a process, **how a reviewer's verdict is captured and reused**, and whether anyone teaches drawing quality by worked exemplars. Extends [`readability-research.md`](readability-research.md) and defers every standards question to it | **Mixed and marked clause by clause.** KLC's rule implementations, six review checklists, four team convention documents and **all ten of EEschematic's prompt files** were fetched and read; the four exemplar PNGs were looked at. AllSpice, Fagan inspection and Adaptive Comparative Judgement are `[SUMMARISED]` through a fetch tool and are flagged as such. **Nothing was run.** Its web-search budget was **exhausted before its first query**, so the corpus is biased toward public git and professional company standards are under-sampled - its §7.6 says so. Two findings bind: **KLC stores a waiver as a private property on the symbol, keyed `KLC_<rule>_<element>` with the human's reason as its value**, which is the strongest precedent found for recording a verdict; and **no source anywhere retains verdicts as a corpus or induces a rule from them**, so the project's central mechanism is unprecedented (§6) |
| [`../research/2026-10-28-academic-schematic-generation-check.md`](../research/2026-10-28-academic-schematic-generation-check.md) | whether four claimed academic schematic generators are real - EEschematic, Microsoft SchGen, CircuitLM and one more - and what each actually measures | **Verification work, nothing run.** Its own §limits say so: no code was installed and EEschematic's output format is established **negatively** (no EDA tool is named anywhere in the paper or repo). Read it before the drafting-practice survey's §3.4, which reads the prompt files it identified but did not open |
| [`../research/2026-10-28-agent-kicad-surfaces.md`](../research/2026-10-28-agent-kicad-surfaces.md) | what an agent can drive as a **tool** to read, place, move, wire and inspect a `.kicad_sch`, rather than writing its own layout | **Measured, and the strongest of the three.** Every PASS/FAIL was produced by running the thing against `circuits/pt2399-core/pt2399-core.kicad_sch` on KiCad 10.0.5. Its `kiutils` result is a false green worth reading on its own: every check passes, `kicad-cli` exits 0, and **192 `hide` flags and 259 `do_not_autoplace` flags vanish** |
| [`../research/2026-10-28-schematic-layout-engines.md`](../research/2026-10-28-schematic-layout-engines.md) | whether an off-the-shelf engine could replace this generator | **Its own §0 says the question is largely already answered here and defers to the passes above**, which is the right posture. It gathers evidence and declines to recommend |
| [`../research/2026-10-28-ai-native-eda-platforms.md`](../research/2026-10-28-ai-native-eda-platforms.md) | the **commercial and agent-surface** picture: Diode, Flux, Koppar, CELUS, Circuit Mind, Quilter, atopile, JITX, ProtoFlow, Coppr, copperhead, AllSpice, and the EDA MCP ecosystem - agent surfaces, pricing, licensing, corporate health, export surfaces | **Mixed, and it grades itself.** It is the only source for the commercial tier, and it carries three things nothing else here does: **`diodeinc/pcb`** (MIT, native `.kicad_sch` with placement AND reconciliation - the closest prior art that exists), **the two MCP retreats** (two teams built EDA MCP servers, measured them against a plain agent plus `kicad-cli`, and withdrew), and the **KiCad-API answer** read off the protos and `kipy` 0.8.0 (`Schematic` is marked `versionadded (KiCad 11)`). It also corrects `../decisions/2026-09-21-why-not-tscircuit.md`. But **it ran nothing against this repository's circuits**, and its own "READ THIS FIRST" hands the `schematizer`, Weave, ELK and netlistsvg questions back to the passes above, which ran them |

**The correction that document carries is the reason to read it despite the
above.** `_schDirectLineRoutingEnabled` **does** reach tscircuit's core: zod
strips it from `_parsedProps`, and the call site reads raw `.props`, which
`PrimitiveComponent` assigns unparsed. The decision's conclusion survives; its
stated reasoning does not, and the decision file still says the old thing.
