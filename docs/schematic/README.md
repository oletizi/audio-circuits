Schematic generation and readability: the research record
=========================================================

Three research passes landed on 2026-10-19, ahead of the schematic-generation
work described in
[`../superpowers/specs/2026-10-08-agent-authored-boards-design.md`](../superpowers/specs/2026-10-08-agent-authored-boards-design.md).
They sat loose at the top of `docs/` with nothing in the repository pointing at
them, which is why this index exists: **committed is not durable if nobody can
find it.**

**This index's first job is not to summarise what the three documents say. It is
to record how much each one can be trusted, because they differ sharply and
nothing in their file names says so.** A later reader who treats them as equal
evidence will build on the weakest of them without knowing it.

**Its second job is to state the question each was asked.** A research document
answers the question it was given, not the question a later reader arrives with.
Where your question is not the one in the table, the document is a lead and not
an answer.

**None of the three is approved criteria.** Each is findings with sources, for
someone who is not the producing agent to turn into criteria - `CLAUDE.md`: *"An
agent may never author the acceptance criteria for the artifact it is
producing."*

How much each can be trusted
----------------------------

Strongest first. This ordering is the point of the table.

| Document | Evidentiary standing | What that means concretely |
| --- | --- | --- |
| [`schgen-development-history.md`](schgen-development-history.md) | **Strongest of the three - primary sources, read directly** | Its author read a repository's own git history, its spec at named revisions, its committed verification record, and the session transcripts, streamed and quoted. Every claim is marked **CONFIRMED** (source read and cited) or **INFERRED**, and agent narration is labelled as agent narration. |
| [`readability-research.md`](readability-research.md) | **Mixed, and the mix is clause-by-clause** | ANSI/ASME Y14.15-1966 and IEEE 315 were read directly and are quoted at clause level. The three **in-force** standards that hold the layout requirements - IPC-2612, IEC 61082-1, ASME Y14.2 - were obtained as **clause and figure titles only**. About a dozen candidate-criteria rows are therefore flagged *title only*, and **no requirement is paraphrased from a title.** |
| [`generation-prior-art.md`](generation-prior-art.md) | **Weakest of the three - nothing verified by running** | No repository cloned, no generator executed, no generated schematic rendered and looked at. Every page was read through a summarising fetch tool, so `[REPO]` means *"the README says"*. Its own statement: *"a map of where to look, not a measurement."* Star counts, commit counts and last-activity dates are **its least reliable facts.** |

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

Where the findings bind
-----------------------

A research document is not a rule file. Findings become binding in two places,
and both are outside these three files:

- **`docs/known-gaps.md`** - the register. Everything a later reader needs and
  cannot re-derive was written there in the change that found it, with each
  entry marked CONFIRMED or RELAYED. Entries **G68**-**G87** came out of these
  three passes.
- **`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`** - the
  program these were commissioned for. Its *"Correction, 2026-10-19"* note is
  the worked example of the gap between what a research pass establishes and
  what a spec had assumed.
