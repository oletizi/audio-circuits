---
title: How schematic drafting and review is actually PRACTISED
date: 2026-10-28
status: research findings, not approved criteria
author: research agent (not the schematic generator's author, and not the author of any practice this survey might inform)
---

What this document is, and what it is NOT
=========================================

**This is a survey of PRACTICE: the repeatable way of working.** Who drafts,
what conventions they follow, who reviews, against what instrument, in what
order, and what happens to the reviewer's verdict afterwards. It is not about
tools, not about layout algorithms, and not about standards.

**It EXTENDS [`../schematic/readability-research.md`](../schematic/readability-research.md)
and does not repeat it.** That pass asked *what do the published standards say*
and answered it at clause level for ANSI/ASME Y14.15-1966 and IEEE 315, and at
clause-and-figure-title level for IPC-2612, IEC 61082-1 and ASME Y14.2. **Every
standards question is delegated to it.** Where this document needs a standards
fact it is marked `[PRIOR-PASS]` and cited to that file's section, never
re-derived. Three of its findings are load-bearing here and are restated once,
in §0, so that a reader of this file alone is not misled.

**It also defers to three other passes in this repository**, each of which
already measured something this survey would otherwise guess at:

- [`2026-10-28-draughtsmanship-tool-bakeoff.md`](2026-10-28-draughtsmanship-tool-bakeoff.md)
  ran copperhead's legibility checker and `kicad-sch-lint` against this
  repository's own boards. **That pass, not this one, is the answer to "is there
  a working readability rubric"** - §2.7 cites it rather than re-running it.
- [`2026-10-28-academic-schematic-generation-check.md`](2026-10-28-academic-schematic-generation-check.md)
  verified EEschematic's paper, repo metadata, evaluation method and output
  format. **It did not read the prompt files or look at the exemplar images.**
  §3.4 of this document does both, and is the only part of this survey that
  claims to go past an existing pass rather than beside it.
- [`../schematic/README.md`](../schematic/README.md) grades how much each prior
  pass can be trusted. Read it before building on any citation here that carries
  a `[PRIOR-PASS]` mark.

**This document authors no criteria and recommends no practice.** §5 assembles
what the evidence would support and §6 names what it would not; both are input
for someone who is not the agent that would be drafting under the resulting
practice. `CLAUDE.md`: *"An agent may never author the acceptance criteria for
the artifact it is producing."*

Evidence marks, used on every claim
-----------------------------------

| mark | meaning |
| --- | --- |
| `[READ]` | I fetched the primary artifact and read it. Source files are at the URLs in §8; the fetched copies are in this session's scratchpad, which is not durable |
| `[SAW]` | I rendered an image and looked at it |
| `[CODE]` | I read the implementation, not the documentation of it |
| `[SUMMARISED]` | obtained through a summarising fetch tool. The tool, not I, chose what to quote; a quotation under this mark is the tool's transcription and **has not been checked against the page** |
| `[RELAYED]` | a third party's claim, attributed |
| `[PRIOR-PASS]` | established by an earlier research pass in this repository, cited to it, NOT re-verified here |

**Nothing in this document was executed.** No checker was run, no repository
cloned and built, no schematic rendered from a tool. Every `[READ]` is a file
fetched over HTTP and read; every `[SAW]` is a PNG downloaded and looked at.
The one quantitative result quoted (copperhead's scores, §2.7) is `[PRIOR-PASS]`
and belongs to the bakeoff.

**One retrieval constraint shaped this pass and must be stated.** The web-search
budget for this session was **exhausted before the first query of this survey
ran** - 200 of 200 calls, spent by earlier work. Everything below was found
through the **GitHub code-search API**, the **GitLab API**, and **direct URL
fetches to addresses I already knew**. The consequence is specific and it is not
a small one: *this survey is biased toward sources that live in public git
repositories.* Company schematic style guides that exist only as PDFs behind a
corporate domain, and the trade literature, are **systematically under-sampled**,
and §7 records what that probably cost.

---

0. The three prior findings this document rests on
==================================================

Restated once because a reader of this file alone would otherwise be misled.
All three are `[PRIOR-PASS]`.

**0.1 Arrangement is standardised elsewhere, and the North American chain is
broken at both ends.** IEEE 315 and IEC 60617 are *symbol* standards by their
own scope text. IEEE 315 clause A3.3 hands arrangement to ANSI Y14.15, which is
**withdrawn with no replacement**. The in-force layout sources are IEC 61082-1
and IPC-2612. (readability-research §1.1.)

**This is the reason practitioner guides matter at all.** It is not that the
guides are a nice supplement to the standards; it is that for a North American
reader there is **no in-force, obtainable, electronics-specific arrangement
standard**, and the guides are what fills the hole. Every document surveyed in
§1 is doing the job a withdrawn standard used to do.

**0.2 Nobody publishes a threshold.** No standard, and no paper in the
generated-schematic literature, states a maximum acceptable crossing count, bend
count or wire length. All of them say *minimise*. (readability-research §2.2,
§4.2, §7.3.) **§1.5 of this document confirms the practitioner guides have the
same hole**, which is a new data point rather than a repetition: it means the
absence is not an artefact of standards-committee caution.

**0.3 The published state of the art in generated schematics checks correctness
as a boolean, counts crossings and bends as objectives, and hands overall
aesthetics to a human.** (readability-research §4.2, on Hsu & Lin, Weave and
EEschematic.) **§2.7 and §3.4 revise the EEschematic half of that sentence**:
the human is in the loop only in the *paper's evaluation*; in the *running
system* the aesthetic verdict is taken by a second model call, and §3.4 has the
code.

---

1. Published drafting conventions that practitioners actually follow
====================================================================

1.1 What kinds of source exist, and which ones are real
-------------------------------------------------------

Searching the public git corpus for schematic convention documents returns four
distinct genres, and they are not of equal standing:

| genre | example found | standing |
| --- | --- | --- |
| **Machine-checked library conventions** | KiCad Library Convention (KLC), §1.2 | **Strongest.** Every rule has an executable implementation and a rule number; a rule that cannot be checked is not in the set |
| **Team schematic convention documents** | ISS-PCB, EVC, Hack Club, §1.3 | **Real practice, no authority.** Written by one named person for one team, enforced socially or at merge. Short, concrete, opinionated, and demonstrably copied between teams |
| **Private company practice documents** | Martin, *Clear Schematics* `[PRIOR-PASS]` | **Real, citable, and not a standard.** The prior pass already traced one widely-repeated "IPC says" claim back to this document rather than to IPC (readability-research §1.6) |
| **Agent-facing rule corpora** | `Swamy-BV/circuit-context`, `settchan2003-design/kicad-schematic-review-skill`, §4.4 | **Weakest, and growing.** These are style guides written *for a model to retrieve*, assembled from the same standards and guides, with no independent authority. They are evidence that this problem is being attacked, not evidence about practice |

**The genre that does NOT exist in the public corpus is the one a reader would
most expect: a maintained, vendor-neutral, electronics-industry schematic
drafting guide.** The closest things are a withdrawn standard (0.1), a paywalled
in-force one, and a private company's PDF.

1.2 KiCad Library Convention: rules that are code `[CODE]`
----------------------------------------------------------

The KLC website at `klc.kicad.org` returns **HTTP 403** to an automated fetch -
the same result the prior pass got (readability-research, Sources) - **so the
website was not read here either.** What was read instead is the
**implementation**, at
`gitlab.com/kicad/libraries/kicad-library-utils`, project id 21511814, branch
`master`, path `klc-check/rules_symbol/`. Each rule is one Python file named for
its rule number, and **the class docstring is the rule statement.**

The symbol rule set as the directory lists it: `G1.1`, `G1.7`, `G1.10`, `G1.11`,
`S3.1`, `S3.2`, `S3.3`, `S3.6`, `S4.1`-`S4.6`, `S5.1`, `S5.2`, `S6.1`, `S6.2`,
`S7.1`, `S7.2`, plus three `EC` checks. Verbatim docstrings `[CODE]`:

| rule | docstring |
| --- | --- |
| `S3.1` | *"Origin is centered on the middle of the symbol"* |
| `S3.2` | *"Text fields should use a common text size of 50mils"* |
| `S3.3` | *"Symbol outline and fill requirements"* |
| `S4.1` | *"General pin requirements"* - its first method is `checkPinOrigin(self, gridspacing: int = 100)`, i.e. **pins on a 100 mil grid**, stated in code rather than in prose |
| `S4.2` | *"Pins should be grouped by function"* |
| `S4.3` | *"Rules for pin stacking"* |
| `S4.5` | *"Pins not connected on the footprint may be omitted from the symbol"* |
| `S5.2` | *"Footprint filters should match all appropriate footprints"* |

**`S4.2` is the one to read in full, because it is the power-rail convention
stated as an executable rule** - and the prior pass's most important negative
finding was that it could find no standard stating that convention for
electronics (readability-research §2.5, §7.2). Verbatim from `S4_2.py` `[CODE]`:

```python
    def checkGroundPins(self) -> None:
        # Includes negative power pins
        GND = ["^[ad]*g(rou)*nd(a)*$", "^[ad]*v(ss)$"]
        ...
                            self.warning(
                                "Ground and negative power pins should be placed at"
                                " bottom of symbol"
                            )
```

```python
    def checkPositivePowerInPins(self) -> None:
        """
        Check that positive power pins are placed at the top of the symbol,
        or the left of the symbol if there are power_out pins.
        """
```

```python
                    self.error("Positive power pins should be placed at top of symbol")
                    self.errorExtra(
                        "Power conversion devices (e.g. regulators) with both power inputs and outputs "
                        "are an exception (for these, inputs on left, outputs on right)"
                    )
```

```python
                self.error("Power output pins should be placed at right of symbol")
```

Four things in that are worth separating, and the fourth is the one that bears
on this project:

1. **The convention is real and it is enforced** - power in at top, ground at
   bottom, power out at right, with a regulator exception that puts inputs left
   and outputs right.
2. **It is a rule about SYMBOL DESIGN, not about sheet arrangement.** This is
   exactly the distinction the prior pass drew about Martin's statement of the
   same rule (readability-research §2.5): *"where a part's power pins are placed
   on its symbol... is a different claim from where the rail net sits on the
   sheet."* KLC settles the symbol half and says nothing about the sheet half.
   **It is not evidence for a power-rail-at-top rule for a sheet.**
3. **The severities are deliberately unequal.** Ground at bottom is a
   `self.warning`; positive power at top is a `self.error`. The file's `check()`
   returns `False` with the comment `# No errors, only warnings`, so the whole
   rule is advisory at the library level even though it emits error-severity
   findings. **A convention set with one severity would have lost that.**
4. **The refusal messages carry their own exceptions.** *"Power conversion
   devices... are an exception"*, and *"If this symbol not a power converter, you
   can ignore this error."* These are refusals that name what is missing and why
   it is not defaulted - the shape `CLAUDE.md` requires - **written by someone
   who had been argued with before.**

**`S4.2` also carries the exception mechanism that is this survey's single
strongest finding for question 3**, and it is treated separately in §3.1.

1.3 Team schematic convention documents `[READ]`
-------------------------------------------------

Four were read in full. They are short - 2.5 to 5 KB - and they are the clearest
statement anywhere in this survey of what a working group actually asks of a
drawing.

**(a) `ISSUIUC/ISS-PCB` - `Schematic-Conventions.md`, by Peter Giannetos.** The
Illinois Space Society's rocketry hardware team. Its opening line is the whole
posture: *"A non-exhaustive guide of how to create neat KiCAD schematics.
**Schematics that do not adhere to these guidelines will not be permitted to
merged to main.**"* `[READ]`

That sentence is the finding. **This is a drafting convention enforced as a
merge gate on a git branch**, which is the arrangement this project is
designing, already in use by a student engineering team. Its rules, verbatim:

- *"You are a graphic designer that works with electrons."* (the entire Intro)
- *"Whenever making a formatting decision, it is vital to maintain consistency
  across the schematic with whatever formatting convention you choose.
  Essentially, pick something and stick with it."*
- *"Net names should be capitalized and contain no spaces. Use "_" instead of
  spaces."*
- *"Don't use global labels unless necessary. Hierarchical labels are the
  prefered label in most situations."*
- *"Power flags should always face upwards, and GND flags should face downwards.
  Whenever a voltage has a decimal it should be replaced with "V" (Ex: 3.3V =
  3V3)"*
- *"Four way intersections are ambiguous. At most intersections should be
  limited to three wires... But unconnected wire crossing should also be avoided
  if possible."*
- *"Text width should be no smaller than 1.27mm in order to be readable if
  printed. The schematic size can be of any size as long as projects with
  multiple boards maintain a consistent size."*
- *"Components should be sectioned off and grouped based on functionaility. The
  box title describes the general functionality while the subtitle describes the
  main component partnumber... Box Border: 0 Width (Default), Box Title: 2mm
  Bold, Box Subtitle: 2mm Italic"*
- *"Always fill out the Title Block and add Contributors, Date, Revision, and a
  Project Name."*
- *"Keep the grid size as large as possible. The typical size is 1.27mm for
  components and wires. Text, labels, and graphics may be placed on a 0.64mm
  grid for better alignment."*
- *"Avoid overlapping text, reference designators, and symbols."*
- *"Always use "R_US" resistors and not the rectangular "R" resistors."*
- *"Use regular sized components and not their alternative small symbols."*
- *"There shouldn't be a space between the numeric value and the prefix/unit."*
- *"Use the generic yellow solid fill connectors and not the other male/female
  types."*
- On custom symbols: *"Above all else follow the KiCAD Library Conventions"* -
  i.e. the team guide **delegates symbol rules to KLC** and keeps only sheet
  rules for itself. That split is the same one §1.2(2) found from the other
  side.
- Closing: *"See a typo? Think we left some vital information out? Make a branch
  and edit this file!"* - **the convention document is itself under review.**

**Eight of its sixteen rules are illustrated with a screenshot** named
`ISS-PCB-KiCAD-Conventions-<topic>.png` - power flags, four-wire connections,
component partitions, title block, grid size, overlapping text, resistors, small
symbols, connectors. **The pictures carry the rule where the prose cannot**, and
that is the §4 theme appearing in the wild rather than in a paper.

**(b) `ill-ev-concept/EVC-PCB` - `SchematicConventions.md`, by Ethan Rybka.**
`[READ]` An electric-vehicle student team. **It is a near-verbatim descendant of
(a)** - same section order, same four-bullet shape, several sentences
recognisably rewritten from it (*"when using labels use regular or hierarchical
labels. Only use global labels when neccesary"*). What it adds is numeric where
(a) was qualitative:

- Partition boxes: *"8 mil (0.25mm) line width / Dashed lines / Use at least
  1.5mm (55 mil) text size"* - where (a) specified 0-width borders and 2mm
  titles. **Two teams, one lineage, incompatible numbers for the same rule.**
- *"Keep the grid size the default size (1.27mm/50mil) if more accurate
  placement is needed, use half of the size (0.635mm/25mil)."*
- *"Make sure that components do not have overlapping designators, or component
  values, this helps with not only readability for you but also for whoever is
  reviewing your board."*
- Its stated purpose is review throughput: *"this will make schematic review
  much easier for leadership, and help project progress move forwards."*
- It ships **named canonical sub-circuits** - `Programming_Header.png`,
  `CAN_Header.png` - under *"EVC Specific Connections: We have some specific
  standard layouts for connectors such as the programming headers and CANbus
  connections."* **A drawn exemplar of a recurring block, kept as the team's
  canonical rendering.** §4 again.

**The propagation itself is a finding.** A team convention document is not
written from the standards; it is **forked from another team's**, and the
numbers drift in the fork. Neither document cites a standard anywhere.

**(c) `hackclub/macondo` - `content/docs/en/usb-hub/schematics.md`** `[READ]`,
derived from `Outdatedcandy92/USB-Hub-Guide`. A guided-project tutorial for
beginners whose boards are subsequently reviewed before fabrication. Its
drafting content is thin but its framing is the clearest statement of PURPOSE
found anywhere in this survey:

> *"the schematic is the blueprint for your PCB. It tells the board editor what
> connects to what, so if the schematic is messy or wrong, your PCB will be too.
> That's why it's important to keep it clear, tidy, and easy for someone else to
> understand at a glance."*

> *"Schematics are typically read from left to right, kind of like a flow of
> information. Inputs on the left, processing in the middle, outputs on the
> right. Laying things out this way makes your design much easier to understand
> at a glance."*

And one rule about **suppressing data to protect the drawing**, which no
standard in the prior pass states and which bears directly on this repository's
`G245` history:

> *"We don't need huge manufacturer part numbers cluttering up the page and
> making the schematic harder to read... untick the Manufacturer Part field.
> That hides the long part numbers from the schematic view without deleting any
> actual data. The goal here is readability."*

**(d) `redbirdrobotics/Core-Documentation` - `standards/electronics-standards.md`**
`[READ]`. Included for completeness and graded weak: it is a robotics club's
general electronics standard, mostly about wiring colours and BOMs. Its only
drafting rule is *"Keep diagrams clean: avoid wire crossings, use labels when
possible"* - **the same threshold-free "minimise" that 0.2 describes, in its
shortest possible form.**

1.4 What recurs, and what it is worth
--------------------------------------

Taking §1.2 and §1.3 together, and marking against the standards the prior pass
established:

| concrete rule | said by | standards position `[PRIOR-PASS]` |
| --- | --- | --- |
| Signal flow left to right, inputs left, outputs right | Hack Club; KLC (for converter symbols) | Y14.15 15-7.1 `should` for reading order, `shall` for input→output sequence (§2.1) |
| Power in at top, ground at bottom **on a symbol** | KLC `S4.2` (error / warning respectively) | **No standard found** for electronics; Y14.15 15-6.3.6 is about one-line power diagrams (§2.5) |
| Power flag up, GND flag down **on a sheet** | ISS-PCB, EVC | Follows from Y14.15 15-7.1's avoid-long-lines rather than from any ground clause (§2.6) |
| Avoid four-way junctions; limit to three wires | ISS-PCB | Y14.15 15-7.2.2: T preferred, four-way **permitted** as fallback. The absolute form is practice, not standard (§2.3) |
| Avoid unconnected crossings too | ISS-PCB | *Minimise*, no threshold (§2.2) |
| Group by function, in a titled box, or by spacing | ISS-PCB (0-width box, 2mm bold title), EVC (8 mil dashed, 1.5mm text) | Y14.15 15-3.8.1 treats a drawn boundary and sufficient space as **interchangeable** (§2.10) |
| Minimum text size for print legibility | ISS-PCB 1.27mm, EVC 1.5mm, KLC `S3.2` 50 mil (=1.27mm) for symbol fields | Y14.15 constrains the **printed** artifact after reduction, not the file (§6.1) |
| Place on the largest grid that works; finer grid for text only | ISS-PCB (1.27 / 0.64mm), EVC (1.27 / 0.635mm), KLC `S4.1` (100 mil pins) | IEEE 315 states the grid principle, **no pitch** (§2.4) |
| Fill the title block: contributors, date, revision, project | ISS-PCB; OSUSat adds approver + approval status (§2.3) | Y14.15 15-3.2, 15-3.9; field list is practice (§2.9) |
| No overlapping text, designators or symbols | ISS-PCB, EVC | Not found as a clause; it is the thing every checker in the bakeoff actually measures |
| Prefer hierarchical labels; global labels only when necessary | ISS-PCB, EVC | IPC-2612 4.4 and IEC 61082-1 5.8 rule on off-sheet references, **title only** (§2.11) |
| Net names uppercase, no spaces, underscores | ISS-PCB, EVC | **Nothing.** And this repository has already ruled on it: the owner, `G150`, *"i absolutely do not care about the letter case of net names. That's a silly quibble."* Two of four practitioner guides demand it anyway |
| Pick one convention and hold it across the sheet | ISS-PCB, EVC (both lead with it) | Y14.15's designator-placement clause converts a taste question into a **consistency** question the same way (§2.7) |

**The last row is the most transferable thing in §1.** Both team documents open
with consistency and nothing else, before any specific rule. Consistency is a
boolean over a drawing; it needs no threshold; and it is the one property of a
drawing that a reviewer can check without having to agree with the drafter's
taste.

1.5 What the practitioner guides do NOT say
--------------------------------------------

Four absences, each checked against all four documents in §1.3 `[READ]`:

- **No threshold, anywhere.** *"Avoid"*, *"keep clean"*, *"as large as
  possible"*, *"at most... limited to three wires"* - the single numeric
  constraint that appears is minimum text size. This **confirms 0.2 against a
  population the prior pass did not sample**: the missing thresholds are not a
  standards-committee artefact.
- **No rule for feedback paths.** The prior pass flagged (§7.4) that any
  left-to-right criterion unexempted will fail on every op-amp here. **Not one
  of the four guides mentions feedback**, and Hack Club's left-to-right
  statement is unqualified.
- **No sheet-splitting criterion.** ISS-PCB and EVC both say page size may be
  anything and that hierarchy exists; neither says when to split. This matches
  the prior pass's §2.12 finding that the trigger is nowhere stated.
- **Nothing about what to do when a rule cannot be met.** All four are written as
  though compliance is always available. KLC is the only source in §1 with a
  mechanism for a justified exception, and it is machinery rather than prose
  (§3.1).

---

2. How schematic review is actually run
========================================

2.1 The headline: the published review instrument is a CORRECTNESS checklist, and drawing quality is not on it
---------------------------------------------------------------------------------------------------------------

Six schematic review checklists were located and read `[READ]`: Zonenberg's
(§2.2), the OrangeCrab instantiation of it (§3.2), OSUSat's (§2.3), AMD/Xilinx
XTP546 as documented by its own tutorial (§2.4), Memfault's firmware-engineer
checklist (§2.6), and the baseline checklist from a published schematic-review
agent skill (§4.4).

**Across all six, items about the drawing itself are a small minority, and in
three of the six there are none at all.** The items are about decoupling,
derating, strap pins, terminations, polarity, errata, thermal. The nearest
things to drawing-quality items in the whole population:

| item | source |
| --- | --- |
| *"Hierarchical sheets used, each with title/version/revision date"* | OSUSat |
| *"All nets labeled"* | OSUSat |
| *"Inter-sheet references enabled"* | OSUSat |
| *"Critical notes present where needed"* | OSUSat |
| *"Power rails should use clear and consistent net names"* | agent-skill baseline |
| *"Global labels should be used only when cross-sheet connectivity is intended"* | agent-skill baseline |
| *"Placeholder values such as `R`, `C`, `L`, `D`, `Q`, `U`, and `J` should be replaced"* | agent-skill baseline |
| *"CAD ERC 100% clean"* | Zonenberg, OrangeCrab |

**That is the entire drawing-quality content of six review checklists.** Not one
of them mentions crossings, bends, alignment, grouping, flow direction, text
collision, grid conformance or sheet utilisation - **every one of the thirteen
things copperhead measures (§2.7).**

**The conclusion a practice designer needs from this is sharp and it cuts both
ways.** The schematic-review checklist genre, as published, is a **correctness
instrument**; the conventions document (§1.3) is the **readability instrument**;
and **they are separate artifacts with separate enforcement**. ISS-PCB enforces
its conventions at merge and has no checklist; Zonenberg enforces a checklist at
sign-off and has no conventions document. **Nobody found here runs both.**

2.2 Zonenberg's checklist, and the pattern that matters more than its content
------------------------------------------------------------------------------

`github.com/azonenberg/pcb-checklist` `[READ]`. Its README, in full:

> *"This is a design review checklist for signoff review on all PCB designs.
> Please use my checklist, I made these mistakes so you don't have to! **Nearly
> every line item here came from the school of hard knocks.** New checklist
> suggestions, or organizational tweaks, are welcome."*

Two files: `schematic-checklist.md` and `layout-checklist.md`. The schematic one
is ~70 items in nine sections: General, Passive components, Power supply (System
power input / Regulators / Decoupling / General / Errata), Signals (Digital /
Analog / Clocks / Strap+init pins / External interface protection / Debugging+
reworkability), Thermal.

**Three structural properties, not its content, are what transfer:**

**(a) Provenance per item.** *"Nearly every line item here came from the school
of hard knocks"* - the checklist is a **codified incident log**. Memfault's
post (§2.6) makes this explicit by printing the incident beside the item. The
items are not derived from a theory of good design; each one is a thing that
went wrong once.

**(b) The exception is itself an item.** The very first line is:

> *"CAD ERC 100% clean. If some errors are invalid due to toolchain quirks,
> **each exception must be inspected and signed off as invalid.**"*

**A checklist item whose content is the handling of a waiver.** This is the same
idea as KLC's exception machinery (§3.1), written as process instead of code.

**(c) The checklist is instantiated per board and committed.** GitHub code
search finds the same filename, `schematic-checklist.md`, inside the board
directories of his own projects - `azonenberg/starshipraider` at
`boards/BLONDEL/entry-afe-characterization/` and `boards/MAXWELL/maxwell-main/`,
and `azonenberg/freesample` at `doc/review/` - and inside a **third party's**
project, `orangecrab-fpga/orangecrab-hardware` at
`hardware/orangecrab_r0.1/review/`. §3.2 reads that instantiation, because the
filled-in copy is a feedback-capture artifact rather than a review instrument.

2.3 OSUSat: document control and a sign-off form `[READ]`
----------------------------------------------------------

`OSUSat/cubesat`, `documentation/checklists/schematic_review.md`. A CubeSat
team, which is why it is the most formalised of the student documents. Its
subtitle: *"One page. Pass/fail only. Full context: Schematic & Layout Design
Guidelines"* - **the checklist deliberately points at a separate guidelines
document for everything it does not fit**, which is the §2.1 split made explicit.

Its header:

```
## Document Control
- Version: 1
- Author: Ethan Eggert
- Approver:
- Last Revised date: 07/5/2026
- Approval Status: Unapproved
```

**The review instrument carries its own approval state, and at the moment of
reading it is `Unapproved` with no approver.** A checklist that has not itself
been signed off, in use.

Two items are about the review process rather than the design:

> *"ERC clean: zero errors, zero unresolved warnings"*
> *"**Peer review completed by someone other than the author**"*

And the footer is the verdict instrument:

> *"**Reviewed by:** _______________  **Date:** _______________  **Result:**
> ☐ Pass ☐ Pass with action items ☐ Fail"*

**Three outcomes, not two.** "Pass with action items" is the state that a binary
gate cannot express and that every real review needs: the drawing is accepted
and a list of changes is owed. **Nothing else in this survey has a three-valued
verdict**, and §6 records that the *contents* of "action items" - where they go,
who closes them - is not stated anywhere in the document.

2.4 Vendor practice: a checklist with a mechanically-checkable subset `[READ]`
-------------------------------------------------------------------------------

`Xilinx/Vivado-Design-Tutorials`, `Versal/PCB_Design/Schematic_Checker/README.md`,
Vivado 2024.2. AMD ships **XTP546, the "Versal Adaptive SoC Schematic Review
Checklist"**, as a spreadsheet. Its own description of the tool:

> *"The Versal™ Schematic Checker tool is **a subset of the Versal Adaptive SOC
> Schematic Review Checklist (XTP546)**. It is available as a separate tab,
> allowing users to specify the netlist and optionally include a Vivado XDC
> file."*

**That one sentence is the most directly applicable piece of industrial practice
in this survey.** The checklist is the primary artifact; the automated checker is
*a named subset of it*; the two live in the same file; and the engineer works
through the whole checklist knowing which rows the machine already answered.

The outputs are six text report files, and one of them is the finding this
project's `false-greens.md` would want:

> *"`*_Passed_Tests.txt`: Contains a record of all successfully completed
> checks."*

**The passing checks are reported by name, as a file, not merely absent from the
failure list.** A skipped check cannot be mistaken for a passing one.

Representative checks `[READ]`: pin count against the package file; inferred rail
voltages within datasheet limits; rail-value mismatch and power-rail shorts;
power/ground pin count match; all power pins on one net; decoupling capacitor
*reporting* for manual comparison; `IO_VR` 240Ω; `GTY_RREF` 100Ω; AC coupling on
every GTY pin; dedicated pin terminations with explicit values (*"MODE pins: Tied
directly or 4.7 kΩ to VCC_503 or < 1 kΩ to GND"*).

**Note the decoupling row.** It does not pass or fail; it *lists* the caps per
rail *"to be manually compared against PDM recommendations."* **A third
category - report, do not judge - alongside pass and fail**, used where the
machine can gather the evidence but not take the verdict. The run takes 30-60
seconds.

2.5 Tool-mediated review: AllSpice `[SUMMARISED]`
--------------------------------------------------

The clearest commercial instance of hardware review run as software review.
Everything in this subsection came through a summarising fetch of
`learn.allspice.io`; **the quotations are the summariser's transcription and I
did not check them against the pages.**

> *"Every design review generates a visual comparison, or diff, between the last
> approved revision and the current one under review. These visual diffs
> highlight changes in PCBs, schematics, and BOMs."* `[SUMMARISED]`

> *"Reviewers are the people who are responsible for looking at your file
> changes, milestones, and design review description"*; *"Reviewers can comment,
> approve, or request changes."* `[SUMMARISED]`

Four mechanisms, in the vocabulary of git forges applied to drawings:

- **Visual diff against the last APPROVED revision**, not against the parent
  commit. The baseline is a review verdict, not a commit graph position.
- **Design review templates**: *"create your own Design Review Template that will
  **pre-fill your Design Review every time you create a new design review**"* -
  the documented answer to *"Can I use a design review checklist?"*
  `[SUMMARISED]`. **The checklist is a template that instantiates per review**,
  which is §2.2(c) productised. The documentation **does not state how the
  filled-in results are recorded**, which the summariser noted explicitly.
- **Issue closure by keyword** in the review description - *"close/closes/closed,
  fix/fixes/fixed, resolve/resolves/resolved"* followed by an issue number.
- **Labels as a reusable taxonomy**: *"bug, dfm, feature, mechanical, layout"*,
  described as giving *"pattern recognition across projects"* `[SUMMARISED]`.
  **This is the only cross-review learning mechanism found in any commercial
  tool, and it is a flat tag set.**

The documentation index also carries *"Design Reviews and Merging"*, *"Best
practices for closing design reviews"*, and *"How to revert a design review"*.
**The whole vocabulary is the pull request's.** `[SUMMARISED]`

2.6 What a formalised review looks like, and what a war-story checklist looks like
-----------------------------------------------------------------------------------

**Fagan inspection** `[SUMMARISED]`, the oldest formal document-review process
and the ancestor of every checklist-driven review above. Six stages - Planning,
Overview, Preparation, Inspection Meeting, Rework, Follow-up - and **five roles,
of which two matter here**: a **Recorder**, whose only job is to document
defects, and a **Moderator**, who at Follow-up *"verifies all defects have been
properly addressed, ensuring no new defects are inserted while trying to fix the
initial defects."* Defects are classified **major or minor**. The process has
explicit **entry and exit criteria**.

**The separation of the recorder from the reviewer is the transferable part.**
In Fagan inspection the person finding the defect is not the person writing it
down, because writing it down is a distinct job that gets dropped when it is
somebody's second priority. §3.4 finds the same separation, independently
rediscovered, in EEschematic's code.

**I could not establish from this source whether Fagan inspection feeds its
defect data back into the checklists.** That is the claim I most wanted and it is
not in what I read. **Flagged unverified.**

**Memfault's checklist** `[READ]`, *"A Schematic Review Checklist for Firmware
Engineers"*, 2024-07-18, by mschulte. Its structure is five war stories followed
by a checklist in which **every item footnotes the story that produced it**. Its
two meta-items are the practice advice:

> *"Get invited to the schematic review. Really, this is a callout to be working
> with your electrical engineer."*
> *"**Build your checklist upfront.** Use this blog post as a starting point, but
> **make sure you customize the list for the given project.**"*

And on how reviews are actually run in industry:

> *"Most of the schematic reviews I've attended are led by electrical engineers
> and are focused on the electrical components of the system... As a firmware
> engineer, I've found it useful to think about what hardware features the code
> I'll end up writing will need."*

**The practice it describes is a meeting, owned by one discipline, which other
disciplines attend carrying their own checklists.** Not a rubric applied by one
reviewer.

2.7 Is there a published RUBRIC for schematic readability that a human reviewer uses?
--------------------------------------------------------------------------------------

**The prior pass answered NO and it was right about the literature.** Its §4.2
established that Hsu & Lin publish metrics with no thresholds, Weave declines
readability metrics entirely, and EEschematic scores aesthetics *"subjectively
by manually assessing visual quality"* at 5-9/10 with no rater but the authors.

**It is now YES for tooling, and the evidence is in this repository, measured by
a pass that ran it.** `[PRIOR-PASS]` -
[`2026-10-28-draughtsmanship-tool-bakeoff.md`](2026-10-28-draughtsmanship-tool-bakeoff.md)
installed and ran **copperhead** (`copperheadhq/copperhead`, Apache-2.0)
against this repository's own boards. It is a weighted scored rubric over a
`.kicad_sch`, with:

- **13 named legibility families** - `off-grid`, `symbol-overlap`,
  `text-collision`, `wire-through-symbol`, `out-of-frame`, `ungrouped-symbol`,
  `unlabeled-group`, `group-overlap`, `empty-title-block`, `label-orientation`,
  `low-utilization`, `crowding`, `cross-group-wire` - at two severities, error
  and advisory;
- **16 scored dimensions with published weights** - `pin-attachment` 10,
  `island-parts` 5, `wire-crossings` 10, `wire-bends` 5, `wire-length` 5,
  `label-to-wire-ratio` 5, `group-cohesion` 10, `flow-direction` 10,
  `utilization` 10, `axis-alignment` 10, `spacing-uniformity` 10,
  `straight-wire-ratio` 5, `label-alignment` 5, `whitespace-balance` 10,
  `pair-symmetry` 5;
- a **cap rule** that holds the composite below a *"known-good floor"* of 85
  whenever any error-severity finding exists;
- a **second, convention-free sub-score** (*"wiring style... never capped"*)
  intended to put a hand drawing and a generated one on one scale.

**So the thing the readability literature does not have, a shipped tool has** -
and it has what 0.2 said nobody publishes: **thresholds**, e.g.
`cross-group-wire` firing at *"a 97.79mm wire... exceeds the 50.8mm maximum"*.
`[PRIOR-PASS]`

**Two cautions that belong with the finding, both from the pass that ran it.**
Its thresholds and weights are **one vendor's choices with no stated derivation**
- having a number is not the same as having a sourced number, and `G71`'s
distinction between an unread threshold and an unset one applies in a third form
here: *a threshold somebody chose and published*. And the bakeoff found that
**two external checkers contradict this repository's own `STATUS.md`**, which
called a sheet with nine text-on-wire collisions *"No findings"*.

**For the question this survey was asked, the important part is who uses it.**
copperhead's rubric is consumed by a **gate**, not by a human reviewer. **No
rubric was found anywhere that a human reviewer fills in for a schematic.** The
nearest human-facing instrument in the whole survey remains OSUSat's three-box
Pass / Pass-with-action-items / Fail.

---

3. How feedback on a drawing is captured and reused
====================================================

**This is the question the survey was commissioned for, and it has the thinnest
evidence base of the four.** Four real mechanisms were found. They are listed
strongest-precedent first.

3.1 The KLC exception: a reviewer's verdict stored IN the artifact, keyed to the rule `[CODE]`
-----------------------------------------------------------------------------------------------

**The single best precedent found.** From
`kicad-library-utils`, `common/rulebase.py`, `KLCRuleBase.parse_exceptions`,
verbatim with its own comments:

```python
    def parse_exceptions(self, properties) -> None:
        for index, prop in enumerate(properties):
            if matches := self.klc_rule_re.match(prop.name):
                # example matches object ['KLC_', 'S4.2', 'VDD33_{LDO}']
                # hint: the group(0) contains the whole matched string
                # so to get the rule-name, we need to call group(2)
                if matches.group(2) == self.name:
                    # the map should contain key-value pairs that the actual check can use
                    # for a more granular exception system. For example
                    # {'Pin13': 'this is actually a output and is on the left side'}
                    # We get that from the name of the property with the regex above
                    # But the 3rd element might not exist, because people don't need to
                    # add this detailed info
                    if map_key := matches.group(3):
                        pass
                    else:
                        map_key = f"Index_{index}"
                    message = f"({map_key}): {prop.value}"
                    self.exceptions_map |= {map_key: prop.value}
                    self.exception_notes.append(message)
```

and the call site in `rules_symbol/rule.py`:

```python
        self.parse_exceptions(filter(lambda x: x.is_private(), symbol.properties))
```

**Read that as a practice and it is a complete answer to "a reviewer said this is
wrong, and it is not":**

1. **The waiver lives in the artifact.** It is a *private property on the KiCad
   symbol itself* - not in a config file, not in a review thread, not in a
   register. It travels with the thing it is about, and it is in the diff.
2. **It is keyed to the rule by number**: the property name is
   `KLC_<rule>` - `KLC_S4.2`.
3. **It can be keyed to the specific element**: `KLC_S4.2_VDD33_{LDO}` scopes the
   waiver to one pin. A rule opts into this with
   `self.finegrained_exceptions = True`; `S4.2` does.
4. **Its VALUE is the human's reason, in prose.** The code's own example:
   `{'Pin13': 'this is actually a output and is on the left side'}`.
5. **The checker prints the reason** rather than silently passing -
   `self.exception(f"Exception for {pinString(pin)}: {self.exceptions_map[pin.name]}")`
   - so **a waived check does not look like a passing one.**
6. **The rule, not the framework, decides what to do with the waiver.** In `S4.2`
   the excepted pin is removed from `self.pins_to_check` at construction time,
   so a waiver is expressed as a narrowing of the rule's population.

**What it does NOT do, and the gap is exactly where this project's interest
lies.** The waiver records that a *particular* violation was judged acceptable
*once*. **It does not generalise.** Nothing reads the accumulated reason strings,
nothing counts how often a rule is waived, nothing proposes that a rule waived
forty times should be changed. **The corpus of verdicts exists and is inert.**

3.2 The ticked checklist, committed beside the board `[READ]`
---------------------------------------------------------------

`orangecrab-fpga/orangecrab-hardware`,
`hardware/orangecrab_r0.1/review/schematic-checklist.md`. It is Zonenberg's
checklist (§2.2) **forked verbatim, placed in the board's own directory, and
filled in.** The markers are three-valued, not two:

```
- [NA] CAD ERC 100% clean. If some errors are invalid due to toolchain quirks, each exception must be inspected and signed off as invalid.
- [X] Verify pin numbers of all schematic symbols against datasheet (if not yet board proven).
...
* [ ] Pullup/pulldowns on all signals that need defined state at boot
```

`[X]` done, `[NA]` not applicable, `[ ]` **left open and committed open** - the
strap-pin item is unticked in the repository.

**And the deviations carry their reasons inline, as sub-bullets under the item:**

```
* [NA] Current-sense resistors on power rails after regulator output caps, not in switching loop
 * To reduce BOM this have been omitted, will cut traces during board bringup to validate power supplies.
```

```
* [X] Power estimates for all large / high power ICs
    * ECP5 (@ 20% utilisation) 1/4W
```

```
* [x] Test points on interesting signals which may need probing for bringup/debug
 * Added bottom test points to JTAG
 * DDR3 has termination on all Address lines, Upper byte traces are accesible on back layer.
 * Added USB Test pads
```

**The practice, stated plainly:** copy the rubric into the artifact's own
directory; mark every row; where a row is `NA` or where the answer needed
argument, **write the argument under the row**; commit the filled form as part of
the design. The result is that *the reasoning behind each verdict is in git,
attached to the board, in the same document as the question that prompted it.*

**Three limits.** (a) The reasons are prose under a bullet, with **no structure
and no machine readability** - nothing can count them or find them across boards.
(b) **Nothing links the filled checklist to the commit it reviewed**; it is a
file in a directory, and if the schematic changes the ticks do not become stale
visibly. (c) **No evidence was found of any item ever being added to the upstream
checklist because of what a filled copy said** - the flow is one-way, template to
instance.

3.3 What the EDA tools provide `[SUMMARISED]` / not established
----------------------------------------------------------------

- **AllSpice** (§2.5) is the one found that is built for this: visual diff of the
  schematic against the last approved revision, comment / approve / request
  changes, review templates, issue closure by keyword, and reusable labels.
  **How a comment attaches to a place on a schematic sheet is not stated in the
  documentation I obtained, and the summariser said so explicitly.** `[SUMMARISED]`
- **Altium 365 comments** - **NOT ESTABLISHED.** Two documentation URLs were
  tried and both returned HTTP 404, and with no web-search budget I could not
  find the current address. The commonly repeated claim is that Altium 365
  supports comments pinned to a coordinate or an object on a schematic sheet,
  with resolve/reopen. **I did not verify it and it should not be relied on.**
- **KiCad** ships **no** comment, markup, redline or review mechanism. This is
  not a fetched claim; it is the absence of any such thing in the KiCad surfaces
  this repository has already catalogued `[PRIOR-PASS]`
  ([`2026-10-28-agent-kicad-surfaces.md`](2026-10-28-agent-kicad-surfaces.md)).
  **A KiCad-based practice has to invent its own feedback carrier**, which is
  what makes §3.1's "put it in a property on the object" the relevant
  precedent rather than a curiosity.
- **The traditional drafting-office check print** - the practice of a dedicated
  *checker* marking a print in coloured pencil by convention, and the formal
  recording of drawing changes in a revision block - **was NOT established in
  this pass.** I could not reach a primary source for it with the retrieval
  available, and the relevant standards (ASME Y14.35 *Revision of Engineering
  Drawings and Associated Documents*, ASME Y14.100 *Engineering Drawing
  Practices*) were not obtained. §7 records this as the largest hole, because it
  is the one place where a mature, centuries-old answer to "how is feedback on a
  drawing captured" probably exists.

3.4 EEschematic, read from its source `[READ]` `[CODE]` `[SAW]`
-----------------------------------------------------------------

`github.com/eelab-dev/EEschematic`, MIT, paper arXiv:2510.17002 (Liu & Chitnis,
Edinburgh, 2025-10-19). **The repository metadata, the paper's claims and its
evaluation method are already verified by
[`2026-10-28-academic-schematic-generation-check.md`](2026-10-28-academic-schematic-generation-check.md)
`[PRIOR-PASS]` and are not repeated.** That pass named the transferable asset -
*"the prompt set and the four good/bad exemplar PNGs"* - and **did not read
them.** This subsection does.

Ten prompt files and four notebooks were fetched and read; the four exemplar PNGs
were downloaded and looked at.

**(a) The prompt set.** `netlist_to_schema/`:

| file | bytes | role |
| --- | --- | --- |
| `place_prompt.txt` | 4280 | netlist → initial placement JSON, 5 numbered steps |
| `optimise_prompt.txt` | 13600 | **the exemplar catalogue** - 6 named subcircuits - plus 5 steps of flip/rotate reasoning |
| `check_prompt.txt` | 886 | 4-step structural self-check of the placement |
| `node_prompt.txt` | 1730 | locate every terminal of every placed device |
| `connect_prompt.txt` / `connecting_prompt.txt` | 2611 / 545 | wire endpoint array construction |
| `modify_prompt.txt` | 3717 | the **beautification** rules, used as review guidance |
| `wire_correction.txt` | 5201 | **four worked counter-examples** of bad routing, each with its repair |
| `wire_correction_action.txt` | 1633 | turn a suggested path into the schema's relative-path form |

**(b) The six exemplars are a catalogue, not a gallery.** `optimise_prompt.txt`
holds six records keyed `"id"`: `current_mirror_001`, `differential_pair_001`,
`diode_connected_001`, `two transistors cascode stage_001`,
`two current source pair`, `Single current source_001`, `single cascode
stage_001`. **Each record carries three things together** - a prose
`"description"` that says both what the subcircuit IS and how it should be DRAWN,
the `"netlist"` that identifies it, and the canonical `"schematic"` JSON with
exact coordinates, rotations and flips. Verbatim:

> `"description"`: *"PMOS current mirror, consist of two PMOS with gate connected
> together. The gate is also connected to the left PMOS's d end. **The left PMOS
> transistor should flip horizontally.** For NMOS current mirror, the left
> transistor should be flipped horizontally."*

> `"description"`: *"NMOS differential pair with tail current source, consist of
> three NMOS with two source connected to another drain. **The two input
> transistors are placed symetrically.**"*

**The exemplar is keyed by a RECOGNISABLE TOPOLOGY and it is retrieved, not
always applied.** The notebook builds a query first: *"Please analysis the
netlist given to you and find the sub-structure which consist the circuit...
Sub_circuits available: current_mirror, differential_pair, diode_connected, two
transistors cascode stage, Single current source, single cascode stage,
inverter... Please output a json dictionary with a key `sub_circuits`"* `[CODE]`.
The identified subcircuits are then passed alongside the catalogue. **This is a
retrieval step over an exemplar library, with the circuit's own topology as the
key.**

**(c) The placement rules are stated as an ordered procedure, and they are the
same conventions §1 found.** From `place_prompt.txt` `[READ]`:

> *"Step2: Please place VDD at the top. Notice that for a netlist, only one VDD
> is needed for one circuit."*
> *"Step3: ...Please notice the symmetric property of a circuit. If some
> transistors consist one subcircuit, then place them near each other
> horizantially."*
> *"Step5: Place the GND at bottom of the whole design."*
> *"The seperated ends should have a minimun place of 20. Please keep some
> distance between all the components. The minimum interval is 20."*

And a worked derivation of vertical order from device physics, which is the
`device levelling` idea the prior pass found in Hsu & Lin arriving as a prompt:

> *"Notice that M1 drain is connected to M3 source, and for nmos drain is above
> source, so M3 should be placed above M1, thus the current source should be
> placed above the differential pair. Also notice that M5 source is connected to
> gnd, which means that it is closer to gnd, so I put it at button."*

**(d) The counter-examples are paired with their repairs, and labelled with the
defect.** `wire_correction.txt` carries four, each a concrete JSON wire path
followed by *"please directly make:"* and the corrected path. The defect names
are inline comments: *"this go left, down, and then right"*; *"this didn't go
through all extanded position"*; *"this go around the device"*; *"this go repeat
paths"* with `# go too much left` marking the offending segment. **A bad example
is never shown without the name of what is wrong with it and the specific
correction.**

**(e) The image exemplars are CONTRASTIVE MINIMAL PAIRS.** `[SAW]`
`place_bad.png` and `place_good.png` are the same canvas, the same five placement
situations, in the same left-to-right order, drawn twice. In `place_bad.png` the
five situations each contain a jog, a dog-leg, or an asymmetric offset; in
`place_good.png` the identical five are straight, aligned, and symmetric about a
centre. **Nothing else differs** - same symbols, same colours, same scale, same
composition. **The pair isolates one variable.**

`wiring_bad.png` `[SAW]` is different in kind: a **crop of a real rendered
schematic**, showing wires running parallel and close against transistor bodies.
**The bad wiring exemplar is a specimen of actual output; the bad placement
exemplar is a constructed contrast.**

**(f) The mechanism - and this is the part worth the whole subsection.** From
`test_action_test_ota1.ipynb` `[CODE]`:

**Step 1 - the rules are DERIVED from the exemplar pair at run time, by the
model, in its own words:**

```python
    wire_prompt = f"""
        Please see the figures given to you. The two devices should be connected together.
        The first image contains bad example for device, these are the problem when doing ** placement and alignment**.
        The second image shows the preferred examples.
        Please tell me what are the differents between bad and good through the **location relationship** between devices, and tell me how to make a good placement. You can say a **GOOD Place** should make the devices...
    """
    correction_output = make_chat_completion_request_images(wire_prompt, ["place_bad.png", "place_good.png"])
```

**Step 2 - the derived rules are then injected as the criteria for judging the
candidate:**

```python
    verify_prompt = f"""
    You should know the basic rules for alignment:{correction_output}
    These are the screen shot of circuit schematic. You should look at all the devices and wires in the image. Analysis them, and see if anything can do to optimize to the **last one**.
    Let's think step by step to verify this circuit...
    Step3: Please identify that whether the schematic should be modified and give the reasons. If modified, please include **'''Modify'''** with ''' ''' at the end of your answer.
    Notice: You should keep **suitable** gap between devices, 5-8 is preferred. Your task is not reduce wires length or make smallest area, just beautiful with well alignment and symmetric!
    If current placement perfectly follow the rule, then only output good without reasons.
    """
```

**Step 3 - the verdict is a token, and the loop reads it:**

```python
            if info == 'Modify':
                ...
            else:
                print('The schematic is good!')
```

**Step 4 - review and action are SEPARATE model calls.** The reviewing call is
instructed to *"give the reason why you modify the devices outside the
dictionary"*, in a prescribed prose format:

```
        VDD needs to move to (1,0) to improve symmetric....
        io_pVbias is in the middle, needs to rotate 90 to avoid overlap with wires...
        io_Vbias1 is too near the G of M2, I decide to move far away...
```

and a second call does the edit from those reasons alone:

```python
        action_prompt = f"""
        Please modify the schema:{schema} based on suggestion:{output_cleaned}.
        Please **do not move transistors** which type name is pFET or nFET.
        Please output an updated **json schema** with every kee in "".
        """
```

**Step 5 - the system's OWN REJECTED DRAFTS become its negative exemplars, in a
sliding window of three:**

```python
                input_json_path = output_path_modifing
                if len(image_path) >= 3:
                    image_path.pop(0)
                image_path.append(destination)
```

and the modify prompt tells the model how to read that window:

> *"The **last one** is the image version of the schema given to you. **The
> formers are bad examples.**"*

**Step 6 - the render is produced by an external tool and screenshotted.** The
loop copies the JSON into a separate npm project's test fixture, runs
`run_npm_test(project_dir)`, and picks up
`play-eecircuit/screenshots/circuit-loaded.png`. **The reviewer looks at a
picture, never at the data.**

**(g) What to take from it, and what not to.**

**Take:** the exemplar catalogue keyed by topology with a prose drawing rule
beside each record; the contrastive minimal pair; the counter-example always
labelled with its defect and paired with its repair; **the separation of the
reviewing call from the acting call**; the explicit verdict token with a
no-reasons "good" as the stop condition; the render-and-look loop; and the
sliding window that turns **the system's own rejected work into its negative
exemplars** - which is the only mechanism found anywhere in this survey that
*accumulates* verdicts rather than merely recording them.

**Do not take, and these are defects:**

- **The criteria are re-derived by the model on every iteration from the same two
  images, and are never written down.** `correction_output` is not cached, not
  committed, not reviewed. The rule set the drawing is judged against **differs
  between iterations of the same run**, and nobody can read it afterwards. This
  is `CLAUDE.md`'s governing invariant failing in its purest form: *the agent
  producing the artifact is authoring the criteria it is judged by*, from
  pictures someone else chose - and the someone-else's contribution is two PNGs
  with no text.
- **The window is three and the eviction is FIFO.** A good negative exemplar is
  discarded after three iterations because it is old, not because it stopped
  being instructive.
- **No human is in the loop at all.** The paper's 5-9/10 aesthetics score is the
  authors grading finished output after the fact; the running system's reviewer
  is a model call.
- **The prompts contain unexplained magic numbers** - *"minimum interval is 20"*,
  *"gap between devices, 5-8 is prefered"*, *"at least 10 grids from gate"*,
  *"difference smaller than 5"* - **with no derivation anywhere.** The project
  that borrows the mechanism must not borrow the constants.
- The whole thing is **four notebooks with hard-coded absolute paths**
  (`/home/chang/Documents/test/...`). There is no CLI and no API; §1's
  `[PRIOR-PASS]` judgement that *"the transferable asset is the prompt set"*
  stands, now confirmed by reading them.

3.5 What NOBODY does
---------------------

Stated as absences, each checked against every source in this section:

- **Nobody keeps a corpus of review verdicts.** KLC's waivers are per-symbol and
  inert (§3.1). OrangeCrab's reasons are prose under bullets (§3.2). AllSpice's
  labels are a flat tag set (§2.5). EEschematic's window is three images deep and
  the reasons are thrown away (§3.4).
- **Nobody induces a rule from accumulated verdicts.** Not one source examined
  has any path from "this was rejected N times for reason R" to a rule, a
  checker, or a checklist item. Memfault and Zonenberg both say their items came
  from experience, and in both cases the conversion was **a person writing a
  sentence**, years later, by hand.
- **No finding is traceable to the review that produced it.** No checklist item
  anywhere cites the review, board or incident it came from, except Memfault's -
  and that is a blog post's narrative device, not a field.
- **Nothing distinguishes "this rule was wrong" from "this instance was an
  exception".** KLC has one mechanism and it means the second. **The first case -
  the reviewer judging the RULE rather than the drawing - has no carrier
  anywhere in this survey.** For a project whose own governance has struck four
  demands for being unjustifiable (`CLAUDE.md`, the BOM gate, the `Value` label,
  `G150`, `G282`), that absence is the most consequential one on this list.

---

4. Apprenticeship and exemplar-based practice
==============================================

4.1 The standards themselves teach arrangement by annotated exemplar
---------------------------------------------------------------------

`[PRIOR-PASS]`, and it is visible in the prior document's own citations rather
than being a new retrieval. **The clauses that govern arrangement are delivered
as FIGURES whose titles are "Example of..."**, not as numeric rules:

- IEC 61082-1: **Figure 8** *"Example of a reference grid"*; **Figure 21**
  *"Example of functional grouping and signal flow directions"*; **Figure 36**
  *"Example for avoiding bends and cross-overs"*; **Figure 37** *"Spacing of
  lines"*; **Figure 64** *"Lining-up of symbols"*; **Figure 65** *"Grouping of
  symbols for functionally related components"*; **Annex B.2** *"Example of the
  layout of a title block"*. (readability-research §1.4, §2.2, §2.4, §2.10,
  §2.9.)
- Y14.15 **Figure 7-1** is a four-panel figure, (A) through (D), and the clause
  text ranks the panels: *"as shown in Figure 7-1(A), **the preferred method**,
  or Figure 7-1(B)... multiple junctions may be shown as in Figure 7-1(C)"*.
  **A labelled preference over drawn alternatives - a minimal pair in a
  standard, in 1966.** (readability-research §2.3.)
- Y14.15 **Figure 8-16**, preferred designator and value arrangements; **Figure
  8-14**, the table of omitted and highest-used designators.
  (readability-research §2.7, §7.6.)

**The in-force layout standard's answer to "how should this be arranged" is a
picture captioned "example".** That is the strongest available evidence that
exemplar-based transmission is not a workaround for the absence of rules - **it
is how this particular domain's rules have always been written**, and the
threshold-free "minimise" of 0.2 is the verbal residue left over when the content
is in the figure.

4.2 The contrastive minimal pair
---------------------------------

§3.4(e) `[SAW]`: EEschematic's `place_bad.png` / `place_good.png` are the same
five situations drawn twice with one variable changed. §4.1: Y14.15 Figure 7-1
(A)-(D) is the same junction drawn four ways with the preference stated in the
clause. **Sixty years apart, the same device.**

Operationally the pair has three properties worth naming, because a gallery of
good drawings has none of them:

1. **The variable is isolated.** Everything that is not under judgement is held
   identical, so the difference cannot be attributed to anything else.
2. **The bad case is shown.** A rule stated positively leaves the failure modes
   to be guessed; the pair exhibits the specific failure the rule exists to
   prevent.
3. **The pair can be judged without a vocabulary.** A reviewer who cannot say
   *why* the left one is worse can still reliably say *that* it is - which is
   precisely the premise of §4.3.

4.3 Adaptive Comparative Judgement: assessing drawings without written criteria
--------------------------------------------------------------------------------

`[SUMMARISED]` - obtained through a summarising fetch of the Wikipedia article;
the underlying papers were **not** read, so every author-and-date below is
`[RELAYED]` and should be checked before citation.

**This is the established practice, outside engineering, for exactly the problem
this project has: judging the quality of design and drawing work when the
criteria cannot be written down.**

> *"Adaptive comparative judgement (ACJ) is an educational assessment technique
> where judges evaluate **pairs** of student work by selecting which is superior,
> rather than assigning numerical scores. An iterative algorithm then generates a
> ranked distribution **without explicit criteria**."* `[SUMMARISED]`

Its mechanism:

- **Thurstone's law of comparative judgment (1927)** - *"There is no such thing
  as absolute judgement"* (attributed to Laming, 2004) - gives the model: the log
  odds that A beats B equals the difference in their quality values. **A complete
  interval scale is recovered from pairwise verdicts alone.** `[RELAYED]`
- **Adaptive pairing**: scores are re-estimated after each round and the next
  comparison pairs items of *similar current score*, maximising information per
  judgement. (Pollitt, 2012.) `[RELAYED]`
- **It was first applied to design work.** The **e-scape** project, Prof. Richard
  Kimbell, Goldsmiths - *"the first application of Comparative Judgement to the
  direct assessment of students"* (Kimbell & Pollitt, 2008) - judged **Design &
  Technology portfolios** of students designing prototypes over two three-hour
  sessions, across three trials rising from 20 to 249 students. `[RELAYED]`
- **Reported reliability**: 0.96 after each of 1,000 writing scripts had been
  judged 16 times; *"reliability of 0.93 can be reached after about 9 judgements
  of each script, when the system is no more expensive than single marking but
  still much more reliable"* (Pollitt, 2012). **Whether adaptivity itself
  improves reliability is contested** (Bramley & Vitello, 2016). `[RELAYED]`
- Implementations named: RM Compare (ex Digital Assess / TAG Developments), No
  More Marking, TAG Assessment. `[SUMMARISED]`

**Why this is the most relevant thing in the survey that is not about
electronics.** The project's stated goal is *human reviews, verdicts are
recorded, review is eventually delegated*. ACJ is a forty-year-old, empirically
validated answer to the first two thirds of that:

- It **takes the verdict in the form a human can actually give reliably** - *this
  one is better* - instead of the form a rubric demands.
- It **produces a scale** from those verdicts, so "better" accumulates into a
  measurement without anyone writing a threshold. This is the one mechanism found
  anywhere that answers 0.2 head-on.
- It **needs no criteria to exist**, and the e-scape result is evidence that it
  works on exactly the kind of artifact at issue here: student *design* work,
  judged by experts, where nobody could write the rubric.
- And its verdict corpus is **a training set by construction**: a set of
  (A, B, winner) tuples over real drawings is directly usable to calibrate, or to
  evaluate, a delegated judge.

**Two cautions.** It yields a **rank, not a reason** - it will tell you which
drawing is better and never why, so it cannot by itself produce a rule, a
refusal message, or a repair. And its reliability figures come from populations
of hundreds judged a dozen times each; **nothing here establishes that it works
at the scale of eleven boards.**

4.4 Agent-facing prior art, flagged weak
-----------------------------------------

Found incidentally; recorded so the next agent does not think it is new ground,
and **graded low because none of it has any independent authority.**

- `settchan2003-design/kicad-schematic-review-skill` `[READ]` - an agent skill
  whose `references/checklist_example.md` is a *"Baseline Schematic Review
  Checklist"* with the instruction *"Apply this baseline checklist to every
  schematic review. **Keep domain-specific rules in `references/checklists/*.md`**"*.
  Five sections: Component Fields, Connectivity, Power, IC Datasheet Checks,
  Manufacturing. **A baseline-plus-domain-overlay structure, which no human
  checklist in §2 has.**
- `Swamy-BV/circuit-context` `[READ]` - `docs/schematic-visual-practices.md`, 31
  KB, self-described as *"32 review topics: a workflow and 31 detailed rules for
  readable electronics schematics"*, stored as RAG records. **Its own disclaimer
  is unusually honest and worth quoting** because it is the posture this survey
  recommends: *"Only their public scope information has been reviewed here; these
  rules are not a clause-complete implementation or certification of conformance...
  Composition, alignment and typography choices below are practical editorial
  conventions."* It also states a rule this project should note: *"Do not trade
  correct connectivity for symmetry."*
- `Averyy/pcbparts-mcp` carries a sourced corpus at
  `data/design-rules/rules_sources/guides/schematic-practices/`. **Not read.**

---

5. What an evidence-based drafting practice would consist of
=============================================================

**Assembled from precedent only.** Every row names the source it comes from; no
row is this agent's invention. **This is not a recommendation and not criteria**
- it is the set of elements that a practice could be built from without inventing
anything, for someone other than a drafting agent to accept, reject or reorder.

| element | the precedent it comes from | standing |
| --- | --- | --- |
| **Two separate instruments, not one**: a conventions document for the drawing, a checklist for the circuit | §2.1 - universal across the population, and no source runs both | strong |
| **The conventions document opens with consistency**, before any specific rule | §1.3(a),(b) - both team guides do exactly this | strong |
| **Rules are illustrated, one picture per rule** | §1.3(a) - 8 of 16 ISS-PCB rules carry a screenshot; §4.1 - the standards do it too | strong |
| **Symbol rules delegated to KLC; only sheet rules kept locally** | §1.3(a) explicitly delegates; §1.2(2) is the same split from the other side | strong |
| **Every rule has an executable implementation, and a rule that cannot be checked is not in the set** | §1.2 - KLC's whole structure | strong |
| **Unequal severities, chosen per rule** | §1.2(3) - KLC emits error for power-at-top, warning for ground-at-bottom | strong |
| **A refusal states its own exceptions in its own message** | §1.2(4) - KLC's `errorExtra` strings | strong, and already `CLAUDE.md` |
| **A checklist whose items each came from a specific past failure** | §2.2 Zonenberg, §2.6 Memfault | strong |
| **A named automated SUBSET of the checklist, living in the same document** | §2.4 - AMD XTP546, verbatim: *"a subset of the... Schematic Review Checklist"* | strong |
| **A third verdict - report, do not judge** - for evidence the machine can gather but not adjudicate | §2.4 - XTP546's decoupling-capacitor listing | moderate, one source |
| **Passing checks reported by name as an artifact** | §2.4 - `*_Passed_Tests.txt` | moderate, one source; and it is `false-greens.md`'s remedy |
| **A three-valued human verdict: Pass / Pass with action items / Fail** | §2.3 - OSUSat's sign-off box | moderate, one source |
| **The review instrument carries its own version, author, approver and approval status** | §2.3 - OSUSat's Document Control block | moderate, one source |
| **The review is by someone other than the author**, stated as a checklist item | §2.3 OSUSat; §2.6 Fagan's role separation | strong |
| **The recorder is not the reviewer** | §2.6 Fagan; §3.4(f) EEschematic separates reviewing from acting | strong, two independent instances |
| **The checklist is instantiated per board, filled in, and committed in the board's directory** | §2.2(c), §3.2 - Zonenberg's own repos and a third party's | strong |
| **Markers are three-valued (`[X]`, `[NA]`, `[ ]`) and an open box may be committed open** | §3.2 - OrangeCrab | strong |
| **Every `NA` and every argued verdict carries its reason inline under the item** | §3.2 - OrangeCrab | strong |
| **A waiver lives in the artifact, keyed to the rule number and optionally to the element, with the human's reason as its value** | §3.1 - KLC `KLC_S4.2_VDD33_{LDO}` | **strongest single precedent in the survey** |
| **A waived check prints its reason and does not look like a pass** | §3.1 - `self.exception(...)` | strong; and it is `CLAUDE.md`'s skipped-check rule |
| **Review is against the last APPROVED revision, not the parent commit** | §2.5 AllSpice | moderate `[SUMMARISED]` |
| **Review findings carry reusable labels from a fixed taxonomy** | §2.5 AllSpice | moderate `[SUMMARISED]` |
| **Exemplars are a catalogue keyed by recognisable topology**, each record = description + identifying netlist + canonical drawing | §3.4(b) - EEschematic's six | moderate, one source, demo scale |
| **A canonical rendering of each recurring block, kept as a picture** | §1.3(b) - EVC's programming-header and CAN-header images | moderate |
| **Exemplars come in contrastive minimal pairs** | §3.4(e), §4.1 | strong, two independent instances 60 years apart |
| **A counter-example is never shown without the name of its defect and the specific repair** | §3.4(d) - `wire_correction.txt`'s four | moderate, one source |
| **The reviewer looks at a render, never at the data** | §3.4(f); and `CLAUDE.md`'s *"Render it, print it, read it"* | strong |
| **The verdict is an explicit token with a no-reasons pass as the stop condition** | §3.4(f) - `'''Modify'''` / `good` | moderate, one source |
| **Rejected drafts are retained as negative exemplars** | §3.4(f) - the sliding window | **weak as implemented** (FIFO of 3, see §3.4(g)) but it is the only accumulating mechanism found |
| **Verdicts are taken as pairwise comparisons and a scale is recovered from them** | §4.3 - ACJ / Thurstone, e-scape | strong **outside** this domain, **unprecedented inside it** |
| **A working readability rubric exists and can be run as an independent referee** | §2.7 - copperhead, `[PRIOR-PASS]`, already run against this repository's boards | strong, but its thresholds are one vendor's unexplained choices |

---

6. What has NO established precedent, and would have to be invented
====================================================================

Each of these was looked for specifically and not found in any source in §1-§4.
**An item here is not a gap in the survey; it is a gap in the world, as far as
this retrieval reached.** §7 says where the retrieval was weak enough that an
absence might be mine rather than the field's.

1. **A corpus of review verdicts, retained and queryable.** Every mechanism found
   records a verdict *somewhere it will never be read again*: a property on one
   symbol, a bullet under one checklist row, a comment on one pull request, three
   images in a FIFO. **No source retains verdicts as a set.** (§3.5.)

2. **Induction of a rule from accumulated verdicts.** The path from "rejected N
   times for reason R" to a rule exists only as *a person eventually writing a
   sentence* (§2.2, §2.6). **No tooling, no process and no paper anywhere in this
   survey automates or even structures that step.** This is the core of what the
   project proposes and it is **unprecedented**.

3. **A carrier for "the rule is wrong", as distinct from "this instance is an
   exception".** KLC has the second and nothing has the first (§3.5). For a
   repository whose governance records four demands struck for being
   unjustifiable, **this is the invention with the highest expected value and the
   least prior art.**

4. **A human-facing readability rubric for a schematic.** copperhead's is
   consumed by a gate (§2.7); the six review checklists contain almost no
   drawing-quality items (§2.1); OSUSat's three boxes are the entire
   human-facing instrument found. **Nothing exists that a person fills in about a
   drawing.**

5. **Criteria for a GENERATED drawing that differ from a drawn one.** `[PRIOR-PASS]`
   readability-research §4.1: *"No standard I found sets a different or lower
   readability bar for a generated schematic."* **This survey adds that no
   practice does either** - not one review checklist, convention document or tool
   distinguishes the two. copperhead's convention-free sub-score is explicitly an
   attempt to put them on **one** scale, not two.

6. **A threshold with a derivation.** 0.2 said nobody publishes one; §1.5 confirms
   it for practitioner guides; §2.7 found a tool that publishes several **with no
   stated derivation.** **A sourced threshold does not exist anywhere in this
   survey.** Choosing one remains an owner decision (`G71`), and borrowing
   copperhead's would be adopting a vendor's taste, which is a legitimate choice
   but must be recorded as one.

7. **A written rule for feedback paths under a left-to-right criterion.**
   `[PRIOR-PASS]` §7.4 found no standard; §1.5 finds no practitioner guide. **The
   gap is total**, and it bites every op-amp in this repository.

8. **A sheet-splitting criterion.** Same: no standard (`[PRIOR-PASS]` §2.12), no
   guide (§1.5). The repository's model offers *one sheet per declared block* as
   a non-judgemental answer, and that remains a decision with no external support.

9. **A link from a filled review form to the revision it reviewed.** OrangeCrab's
   filled checklist is a file in a directory with no reference to a commit, a
   hash, or a rendered artifact (§3.2). **Nothing found anywhere solves staleness
   of a review verdict when the drawing changes under it** - which is the exact
   failure `CLAUDE.md` describes as *"a figure in prose is a transcription with a
   date on it"*, in a different medium.

10. **Any evidence that an exemplar-based practice works at eleven-board scale.**
    ACJ's evidence is at hundreds of artifacts and a dozen judgements each
    (§4.3); EEschematic's is three circuits, ten trials, one lab (§3.4,
    `[PRIOR-PASS]`). **Neither establishes anything about a small corpus**, and a
    practice built on either is extrapolating.

---

7. What I could not establish
==============================

Ordered by how much it blocks.

**7.1 The traditional drafting-office check and redline practice.** The single
largest hole. There is a centuries-old answer to *"a reviewer marked up a
drawing - what happens to the markup"* - the dedicated **checker**, the coloured
check print, the revision block, the ECO - and **I reached no primary source for
any of it.** ASME **Y14.35** (*Revision of Engineering Drawings and Associated
Documents*) and **Y14.100** (*Engineering Drawing Practices*) were not obtained;
`everyspec.com` and `en.wikipedia.org/wiki/Design_review` both failed to yield
anything usable. **Anyone extending this survey should start here**, and should
expect it to change §6 items 1 and 9.

**7.2 Altium 365 / Altium Designer comment and markup mechanics.** Two
documentation URLs returned 404 and I could not locate the current address
without web search. This matters because Altium 365 is the most widely deployed
commercial schematic-comment system and is the obvious comparator for AllSpice.
**Nothing about it should be asserted on the strength of this document.**

**7.3 Everything about AllSpice is `[SUMMARISED]`.** The quotations in §2.5 and
§3.3 are a summarising tool's transcription of pages I did not read directly.
The most important unknown is **how a comment attaches to a location on a
schematic sheet**, which the summariser flagged as absent from the pages it saw.

**7.4 Regulated and safety-critical schematic review.** DO-254, IEC 61508,
ISO 26262, MIL-STD-1521B, IEEE 1028 and NASA's design-review practice were all
targeted and **none was obtained.** Fagan inspection (§2.6) is a `[SUMMARISED]`
stand-in for the whole genre. **If a formal rubric for drawing quality exists
anywhere, the regulated domains are where it would be**, and this survey did not
reach them.

**7.5 The Wikipedia ACJ article is the sole source for §4.3.** Thurstone (1927),
Kimbell & Pollitt (2008), Pollitt (2012) and Bramley & Vitello (2016) are all
`[RELAYED]` through it. The reliability figures in particular should be checked
against Pollitt before being quoted anywhere that matters.

**7.6 The corpus is biased toward public git.** Stated in the header and restated
here because it is the kind of limit that is invisible later: **the sample in §1
is four student/hobbyist team documents and one library convention**, because
those are what live in public repositories. A professional electronics company's
internal schematic standard almost certainly exists, is almost certainly more
rigorous than anything in §1, and **is not in this survey.** Martin's *Clear
Schematics* `[PRIOR-PASS]` is the only document of that genre anywhere in either
pass, and the prior pass found it by accident while tracing a misattributed
quotation.

**7.7 Nothing was run.** No checker, no repository build, no rendered schematic.
The one quantitative result in the document (§2.7) belongs to another pass. **A
reader who needs a number should go to the bakeoff, not here.**

**7.8 One thing I expected to find and did not.** A review practice that treats
the *drawing* as the artifact under review. Every review process found - Fagan,
Zonenberg, OSUSat, AllSpice, Memfault, XTP546 - reviews **the design, through the
drawing.** The drawing's own quality is handled, where it is handled at all, by a
*separate* conventions document enforced at merge by a *different* mechanism
(§1.3(a), §2.1). **The project's premise - that drawing quality is itself the
thing being reviewed and recorded - is, on this evidence, not how anyone
currently works.** That is not an argument against it; it is the reason §6 is as
long as it is.

---

8. Sources
==========

**Read directly, in full** `[READ]` / `[CODE]` / `[SAW]`:

- **KiCad Library Convention, as implemented** - `gitlab.com/kicad/libraries/kicad-library-utils`
  (project 21511814, `master`): `klc-check/rules_symbol/` (`S3_1`, `S3_2`,
  `S3_3`, `S4_1`, `S4_2`, `S4_3`, `S4_5`, `S5_2`, `S6_1`, `rule.py`) and
  `common/rulebase.py` (`parse_exceptions`). **`klc.kicad.org` returns HTTP 403
  to an automated fetch and was NOT read**, here or by the prior pass.
- **`azonenberg/pcb-checklist`** - `README.md`, `schematic-checklist.md`.
- **`orangecrab-fpga/orangecrab-hardware`** -
  `hardware/orangecrab_r0.1/review/schematic-checklist.md` (the filled
  instantiation).
- **`ISSUIUC/ISS-PCB`** - `Schematic-Conventions.md`, Peter Giannetos.
- **`ill-ev-concept/EVC-PCB`** - `SchematicConventions.md`, Ethan Rybka.
- **`OSUSat/cubesat`** - `documentation/checklists/schematic_review.md`, Ethan
  Eggert, v1, 07/5/2026, Approval Status: Unapproved.
- **`hackclub/macondo`** - `content/docs/en/usb-hub/schematics.md`, derived from
  `Outdatedcandy92/USB-Hub-Guide`.
- **`redbirdrobotics/Core-Documentation`** - `standards/electronics-standards.md`.
- **`Xilinx/Vivado-Design-Tutorials`** -
  `Versal/PCB_Design/Schematic_Checker/README.md`, Vivado 2024.2, documenting
  **AMD XTP546** *Versal Adaptive SoC Schematic Review Checklist*. The XTP546
  spreadsheet itself is behind a download form and was **not** obtained.
- **`memfault/interrupt`** - `_posts/2024-07-18-schematic-review-checklist.md`,
  *"A Schematic Review Checklist for Firmware Engineers"*, mschulte.
- **`eelab-dev/EEschematic`** (MIT) - `README.md` and all ten prompt files under
  `netlist_to_schema/`; `test_action_test_ota1.ipynb` read cell by cell; the four
  exemplar PNGs (`place_good`, `place_bad`, `wiring_good`, `wiring_bad`)
  downloaded and **looked at**.
- **`settchan2003-design/kicad-schematic-review-skill`** -
  `references/checklist_example.md`.
- **`Swamy-BV/circuit-context`** - `docs/schematic-visual-practices.md` (opening
  sections only).

**Obtained through a summarising fetch** `[SUMMARISED]` - quotations are the
tool's transcription and were not checked against the page:

- **AllSpice documentation** - `learn.allspice.io/llms.txt` (index),
  `/docs/design-reviews-101.md`, `/docs/design-review-best-practices.md`,
  `/docs/can-i-use-a-design-review-checklist.md`, `/docs`.
- **Fagan inspection** - `en.wikipedia.org/wiki/Fagan_inspection`.
- **Adaptive comparative judgement** -
  `en.wikipedia.org/wiki/Adaptive_comparative_judgement`. Underlying works are
  `[RELAYED]` through it: Thurstone (1927); Laming (2004); Kimbell & Pollitt
  (2008), the e-scape project, Goldsmiths; Pollitt (2012); Bramley & Vitello
  (2016).

**Attempted and failed** - recorded so the next pass does not repeat them:

- `klc.kicad.org/symbol/` - HTTP 403
- `ohwr.org/project/kicad-guidelines/wikis/home` - HTTP 404 (CERN's KiCad
  guidelines; the correct address was not found)
- `altium.com/documentation/altium-365/comments-and-mentions` - HTTP 404
- `altium.com/documentation/altium-designer/comments` - HTTP 404
- `everyspec.com/.../MIL-STD-1521B...` - HTTP 404
- `en.wikipedia.org/wiki/Design_review` - fetched, **contained nothing usable**
  about PDR/CDR, standards or action-item closure
- `en.wikipedia.org/wiki/Comparative_judgement` - HTTP 404 (the
  `Adaptive_comparative_judgement` title worked)

**Relied on, not re-verified** `[PRIOR-PASS]`:

- [`../schematic/readability-research.md`](../schematic/readability-research.md)
  - all standards claims, Martin's *Clear Schematics*, the Hsu & Lin / Weave /
  EEschematic metrics comparison, and every "no standard states X" finding.
- [`2026-10-28-draughtsmanship-tool-bakeoff.md`](2026-10-28-draughtsmanship-tool-bakeoff.md)
  - copperhead's families, weights, scores and thresholds, and the
  `STATUS.md` contradiction.
- [`2026-10-28-academic-schematic-generation-check.md`](2026-10-28-academic-schematic-generation-check.md)
  - EEschematic's paper, repo metadata, three demonstration circuits, 10-trial
  evaluation, correctness/aesthetics split and JSON output format.
- [`2026-10-28-agent-kicad-surfaces.md`](2026-10-28-agent-kicad-surfaces.md) -
  the absence of any KiCad comment or markup surface.
- [`../schematic/README.md`](../schematic/README.md) - how far each of the above
  can be trusted.
