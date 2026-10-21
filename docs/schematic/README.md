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
| [`generation-prior-art-circuit-families.md`](generation-prior-art-circuit-families.md) | **Strongest methodology of any pass - it ran a CONTROL** | Ran two tools against the four non-Pultec circuit families. Its central claim - that net degree and not circuit family or part count defeats a router - is established with a control that separates the variables: 15 parts in a series chain routed 15/15 while 15 parts on one degree-15 net routed 1/5. It also reports its own harness's bugs separately from the tools' failures, and proves one of its guards by mutating it. |
| [`generation-prior-art-second-pass.md`](generation-prior-art-second-pass.md) | **Measured, no controls** | Cloned five repositories, ran four, rendered schematics and looked at them. Marks every finding `[RAN]`, `[CODE]` or `[RELAYED]`. Its scope was **the Pultec alone**, which is the circuit those tools are worst at - the error the circuit-families pass above corrects. Read the two together or the first will mislead you. |
| [`generation-prior-art-third-pass.md`](generation-prior-art-third-pass.md) | **Mixed - ran one tool, read one key source, surveyed the rest** | Ran `netlistsvg`/ELK against the probes that defeated other tools (10/10, byte-identical across 30 runs) and read the AEM formula directly from an open-access preprint. Its forty-year literature survey is citation work, not measurement, and should be read as such. **Do not read its ELK result as "ELK draws good audio schematics"**: its own §3.5 measures the 25-part Pultec-shaped probe as *"not a good audio schematic"* - 15 inter-net crossings, 1.72 bends per edge. Routing success and determinism are what it establishes. |

**Primary sources, read directly.** These read the thing itself rather than a summary of it.

| Document | Evidentiary standing | What that means concretely |
| --- | --- | --- |
| [`schgen-development-history.md`](schgen-development-history.md) | **Primary sources, read directly** | Its author read a repository's own git history, its spec at named revisions, its committed verification record, and the session transcripts, streamed and quoted. Every claim is marked **CONFIRMED** (source read and cited) or **INFERRED**, and agent narration is labelled as agent narration. |
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

**It indexes the six research passes and nothing else, and five later documents
in this directory are not in it.** Stated here rather than left for a reader to
notice, because this index's own opening says *"committed is not durable if
nobody can find it"*:

| document | what it is | how much it can be trusted |
| --- | --- | --- |
| [`elk-spike.md`](elk-spike.md) | ELK on whole circuits, flat | **Measured, no template and no block scale.** Every figure went through `netlistsvg` at `d3518f1` with its pinned `elkjs` 0.7.1, which this generator does not use - `../known-gaps.md` **G180** names the three figures that were properties of its skin |
| [`elk-block-spike.md`](elk-block-spike.md) | the same, one declared block at a time | **Measured, with a paired control and a byte-identical regeneration of the first spike's inputs as the check that its extracted converter changed no behaviour.** Same frontend contamination |
| [`template-parity.md`](template-parity.md) | do the ported templates draw this repository's blocks? | **GENERATED and content-compared on every test run.** A measurement with no target (spec §5.1) |
| [`template-parity-anchors.md`](template-parity-anchors.md) | what a template COULD draw under an anchor probed over a block's own members | **GENERATED.** Read it only beside `template-parity.md`: `../known-gaps.md` **G160** is explicit that a realised probe is not a recommendation to declare that anchor |
| [`m1-remeasurement.md`](m1-remeasurement.md) | the two spikes' figures re-taken on the real pipeline | **Measured on this generator, every figure produced by committed code and pinned by a committed test.** It is also the record of which spike figures CANNOT be compared, and why |

**The two spikes are the strongest evidence in this directory about ELK and the
weakest about THIS generator**, and `m1-remeasurement.md` is where the difference
is measured rather than argued: of the five figures the block spike's own table
publishes per block, **two are the same quantity as this generator's and three
are not.**
