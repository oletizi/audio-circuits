---
title: Readable schematics — what the published standards actually say
date: 2026-10-19
status: research findings, not approved criteria
author: research agent (not the schematic generator's author)
---

# Readable schematics: published standards, settled convention, and what a program can check

## What this document is, and what it is not

This is **research input for an acceptance-criteria document**, gathered so that the criteria
a schematic generator is judged by come from outside the generator and outside any agent's
taste. It exists because of the governing invariant in `CLAUDE.md`:

> **An agent may never author the acceptance criteria for the artifact it is producing.**

and because of the owner's correction when he was asked to define readability himself:

> *"readable schematics are a long-standing standard practice in electrical engineering with
> well-documented practices, standards, and requirements. Asking me to qualify and quantify
> those well-understood norms seems like you asking me to do your job."*

He is right that the norms exist. He is **more right than the question assumed about where
they live**, and the central finding of this document is that correction (§1.1).

**This document invents no thresholds.** Where a standard states a number, the number is
quoted with its clause. Where no standard states one, the row says the threshold is unset and
names it as an open decision. Three numbers appear in the criteria table and all three are
quoted from ANSI Y14.15 or IEEE 315; one number (§5, R10) is *derived arithmetically* from a
standard's number and is labelled as derived, because a derivation is checkable and a guess is
not.

**Nothing here is approved.** It is findings with sources, for someone else to turn into
criteria.

---

## 1. The formal standards

### 1.1 The headline finding: symbols are standardised; arrangement is standardised *elsewhere*, and in North America that elsewhere has been withdrawn

The question "what standard governs readable schematics?" has a clean answer and an awkward
one.

**Clean:** the standards most often named — IEEE 315, IEC 60617, ANSI Y32.2 — govern **symbols
only**. They say what a resistor looks like. They say nothing about where it goes. This is not
an inference; both standards say so in their own scope text, quoted below.

**Awkward:** arrangement *is* covered by published standards, but by different ones, and the
North American line of them is dead:

| what | the standard | status |
| --- | --- | --- |
| Symbols (US/ANSI) | **IEEE 315-1975 / 315A-1986** (= ANSI Y32.2-1975) | **Inactive-Reserved, inactivated 2019-11-07** ([IEEE SA](https://standards.ieee.org/standard/315-1975.html)) |
| Symbols (international) | **IEC 60617** (database, ~1900 symbols) | **Active**; the database is "the official source of IEC 60617" ([IEC](https://std.iec.ch/iec60617)) |
| **Diagram layout (US/ANSI)** | **ANSI/ASME Y14.15-1966 (R1973, R1988)**, *Electrical and Electronics Diagrams* | **Withdrawn, no replacement** ([ASME/Accuris](https://store.accuristech.com/standards/asme-y14-15-1966-r1988?product_id=22085)) |
| **Diagram layout (international)** | **IEC 61082-1:2014 Ed. 3**, *Preparation of documents used in electrotechnology — Part 1: Rules* | **Active**, horizontal standard per IEC Guide 108 |
| Schematic documentation (industry) | **IPC-2612-2010**, *Sectional Requirements for Electronic Diagramming Documentation (Schematic and Logic Descriptions)* | **Active** |
| Reference designator letters | **ASME Y14.44-2008 (R2024)**, replacing withdrawn **IEEE 200-1975** | **Active** |
| Sheet sizes and formats | **ASME Y14.1** | Active |
| Line conventions and lettering | **ASME Y14.2-2014 (R2020)** | Active |
| Logic diagrams | **IEEE 991-1986 (R1994)** | **Inactive, inactivated 2019-11-07** ([IEEE SA](https://standards.ieee.org/ieee/991/1365)) |

**The decisive piece of evidence** that IEEE 315 deliberately does not cover layout is IEEE 315
clause **A3.3**, which hands the job to another document by name:

> **A3.3 Application Data Reference**
> For application of these symbols on electrical diagrams, see American National Standard
> Drafting Practices; Electrical and Electronics Diagrams, **Y14.15-1966 (R1973)**.
> — IEEE Std 315-1975 (Reaffirmed 1993), clause A3.3

So the symbol standard explicitly points at a layout standard — and that layout standard has
since been withdrawn with nothing put in its place. **The North American standards chain for
schematic arrangement is broken at both ends: the symbol standard is inactive and the layout
standard it refers to is withdrawn.**

That matters here in a specific way. The withdrawal is administrative, not a repudiation: no
successor contradicts Y14.15, and the conventions it states are the ones still taught and
practised. **Y14.15 is therefore the best available written source for US schematic arrangement
rules, and it must be cited as a withdrawn standard every time it is cited** — it is evidence of
settled convention with a clause number, not an in-force requirement. A criteria document that
cites it without that qualifier would be overclaiming.

For in-force layout requirements the live sources are **IEC 61082-1** and **IPC-2612**.

### 1.2 IEEE 315-1975 / 315A-1986 (= ANSI Y32.2-1975) — symbols, and a grid

**What it covers**, in its own words:

> **A1.1 Purpose.** This standard provides a list of graphic symbols and class designation
> letters for use on electrical and electronics diagrams.

**What it does NOT cover:** arrangement, placement, flow, sheet organisation. It defers all of
that to Y14.15 (A3.3, quoted above). It also explicitly disclaims meaning for two things an
automated checker might otherwise try to enforce:

> **A4.2 Orientation.** Except where noted, the orientation of a symbol on a drawing, including
> a mirror-image presentation, does not alter the meaning of the symbol. **Letters and numbers
> that constitute a part of a symbol shall not be presented in mirror-image form.**

> **A4.3 Line Width.** The width of a line does not affect the meaning of the symbol. In
> specific cases, a wider (heavier) line may be used for emphasis.

Two things in IEEE 315 *are* directly usable as criteria, and both carry numbers:

> All of the symbols are designed so that their connection points fall on a **modular grid**.
> This should help those who use a grid basis for the preparation of diagrams. By proper
> enlargement of the symbols the usual coordinate-grid sizes can be matched.
> — IEEE Std 315-1975, Introduction

> **A4.4 Enlargement or Reduction.** A symbol may be drawn to any proportional size that suits a
> particular drawing... **It is recommended that only two sizes be used on any one diagram.**

> **A4.5 Relative Symbol Size.** The symbols shown in this edition of the standard are in their
> correct relative size. This relationship **shall be maintained as nearly as possible** on any
> particular drawing, regardless of the size of the symbol used.

Note the difference in checkability between A4.4 and A4.5, which recurs throughout this
document: A4.4 states a count (two) and is a boolean; A4.5 says "as nearly as possible" and is
not a test at all.

IEEE 315 **Section 22** is the source of the reference-designation *class letters* (R, C, L, Q,
U, …). IEEE 315 A1.2 points to IEEE 200-1975 for their assignment; IEEE 200 is withdrawn and
replaced by **ASME Y14.44-2008 (R2024)**, which "covers the formation and application of
reference designations for electrical and electronics parts and equipment, in diagrams,
drawings, and parts lists."

### 1.3 IEC 60617 — symbols only, and it says so by enumeration

The IEC's own description of the database scope lists symbol domains and nothing else:

> The following areas are covered in the database: Conductors and connecting devices; Basic
> passive components; Semiconductors and electron tubes; Production and conversion of electrical
> energy; Switchgear, controlgear and protective devices; Measuring instruments, lamps and
> signalling devices; Telecommunications transmission, switching and peripheral equipment;
> Architectural and topographical installation plans and diagrams; Binary logic elements;
> Analogue and hybrid elements.
> — [IEC 60617 database front matter](https://www.normservis.cz/download/view/iec/info_iec60617_DB.pdf)

There is **no layout, arrangement, flow or sheet-organisation entry in that list.** IEC 60617 is
a symbol library with metadata, not a drafting-practice standard.

One historical note worth recording: the superseded **IEC 60617-1:1985** (*General information,
general index*) contained "a grid for use with computer-assisted design systems"
([IEC](https://webstore.iec.ch/en/publication/16975)) — i.e. the modular-grid idea that IEEE 315
states in its introduction was also IEC's, and it sat in a *general-information* part, not in the
symbol parts. That part is withdrawn and folded into the database.

### 1.4 IEC 61082-1:2014 — this is the layout standard, with a caveat that bites

**Scope, verbatim:**

> This part of IEC 61082 establishes general rules and guidelines for the presentation of
> information in documents, and **specific rules for diagrams, drawings and tables used in
> electrotechnology**.
> — IEC 61082-1:2014, clause 1

**The caveat, also verbatim and in the same clause:**

> This horizontal standard is primarily intended for use by technical committees in the
> preparation of standards in accordance with the principles laid down in IEC Guide 108. One of
> the responsibilities of a technical committee is, wherever applicable, to make use of
> horizontal standards in the preparation of its publications. **The contents of this horizontal
> standard will not apply unless specifically referred to or included in the relevant
> publications.**

This is important and easy to misreport. IEC 61082-1 is the most complete published treatment of
schematic *arrangement* that is currently in force, **and by its own text it does not apply to
anything on its own.** It applies when another standard, a contract, or a project's own rules
invoke it. For this repository that is good news rather than bad: adopting IEC 61082-1 by
reference in a criteria document is exactly the mechanism the standard expects, and it means the
criteria document can say "we invoke IEC 61082-1 clauses X, Y, Z" and that invocation is what
gives them force here.

**What it covers, by clause title.** The following are the clause and figure titles from the
IEC 61082-1:2014 contents page. Each is a layout concern that the symbol standards do not touch:

| clause | title |
| --- | --- |
| 5.1 | Legibility |
| 5.2 | Text orientation |
| 5.4 | Paper page sizes |
| 5.6 | Page identification |
| 5.7.2 / 5.7.3 | Identification area / Content area |
| 5.8 | Cross-references |
| 5.10 | Line widths |
| 5.12.1–5.12.3 | Choice of symbols / Symbol size / Orientation of symbols |
| 5.20.2 | Reference designations |
| 5.21 / 5.22 | Terminal designations / Signal designations |
| **7.1.1** | **Flow of energy, signal, etc.** |
| **7.1.3** | **Connecting lines** |
| 7.1.5 | Boundary frames |
| 7.1.6 | Presentation of reference designations |
| **7.4.2** | **Layout** (within 7.4 Circuit diagrams) |
| 7.4.5 | Representation of supply circuits |
| **11** | **Structured documentation** (11.2 occurrences of an object type; 11.3 Referencing) |
| 12 | CAx conformance requirements |
| Annex B | Document management information and title blocks |

and the figure titles, which name the concerns even more plainly:

- Figure 4 — Viewing directions of a document
- Figure 8 — Example of a reference grid
- Figure 21 — **Example of functional grouping and signal flow directions**
- Figures 29–31 — Symbols representing joining of connecting lines; symbol representing the
  interconnection of crossing connecting lines; examples of the joining of connecting lines
- Figure 36 — **Example for avoiding bends and cross-overs**
- Figure 37 — **Spacing of lines**
- Figure 45 — Location of reference designations at a symbol
- Figure 61 — Signal flow in a function diagram
- Figure 64 — **Lining-up of symbols**
- Figure 65 — **Grouping of symbols for functionally related components**

**Honest limitation.** I obtained IEC 61082-1:2014's cover, foreword, introduction, full
contents, scope and normative references from the IEC's free preview. **I did not obtain the
normative text of clauses 5, 7 or 11.** Everything above is clause and figure *titles* plus the
verbatim scope. The titles establish beyond doubt *that* the standard rules on signal flow,
connecting lines, line spacing, bends and cross-overs, symbol line-up, functional grouping, text
orientation, grids and hierarchy — they do **not** tell us *what* it requires. **A criteria
document must not paraphrase a requirement from a figure title.** Buying or borrowing the
standard is a prerequisite for any criterion sourced to it; §7 records this as the largest open
item.

### 1.5 ANSI/ASME Y14.15-1966 — withdrawn, and the richest written source for arrangement

This is the document IEEE 315 A3.3 points to. The full text is publicly posted
([mirror](https://inspectapedia.com/electric/Electrical-Drawing-Standard-ANSI%20Y14.15-1966.pdf)),
so unlike IEC 61082-1 I was able to read its actual requirements. Everything in §2 below that
carries a `15-x.y` clause number is quoted from it.

It is the only source I found that states schematic arrangement rules **as numbered clauses with
a mix of `shall` and `should`**, which is exactly the shape a criteria document needs. It is also
**withdrawn**, which must be stated at every citation.

It covers: definitions of diagram kinds (15-2), drawing size and format (15-3.4), line
conventions and lettering (15-3.5), symbol conformance and orientation (15-3.6), layout and
grouping of parts (15-3.8), single-line diagrams including a voltage-arrangement rule (15-6),
general schematic layout, connecting lines, spacing, junctions, crossovers and interrupted paths
(15-7), electronics/communication schematic layout, zoning, circuit returns, terminals,
reference designations, value notation and additional circuit information (15-8), and
terminal/wire designation placement (15-9).

It does **not** cover: hierarchy or sheet-splitting criteria beyond "provide suitable cross
references" (15-3.4), and — notably — it states **no power-rail-at-top rule for electronics
schematics** (see §2.5, where this is the single most-misattributed convention I found).

### 1.6 IPC-2612-2010 — in force, industry, and the one I most need and have least of

**Scope, verbatim:**

> This standard establishes the requirements for the documentation of electronic diagrams used as
> the foundation for defining the electrical interconnectivity of electronic parts. The
> description pertains to either schematic diagrams, logic diagrams or Boolean truth tables and
> includes methodology for defining circuit flow, electrical or functional restrictions, or
> maintenance test procedures used to design or maintain the electronic product. The requirements
> pertain to hard copy, electronic copy or electronic data descriptions.

> **1.1 Purpose.** The purpose of this document is to establish a consistent set of naming
> conventions, schematic and logic attributes, and documentation standards. The standard should
> ensure that all schematics and logic descriptions contain the information required for
> inspection, hardware realization, software development, and design reuse.

**Its contents page is the single most on-point clause list I found for this project**:

| clause | title |
| --- | --- |
| 3.3 | Diagramming Rules |
| 3.4 | Format |
| 3.5 | Line Styles and Lettering |
| 4.3 | Legibility |
| 4.4 | Off Page or Off Screen References |
| 5.1 | Common Voltage (5.1.1 Fixed, 5.1.2 Adjustable) |
| **6** | **Layout** |
| **6.1** | **Connecting Lines** |
| **6.2** | **Junctions** |
| 6.3 | Component Pin Number Visibility |
| 6.4 | Wire Leads |
| **6.5** | **Power and Ground** (6.5.1 Shielding) |
| **6.6** | **Signal Paths** |
| 7 | Net Naming Conventions (7.1 Name Assignment, 7.2 Signal Descriptors, 7.3 Reserved Characters) |
| 8.1 | Reference Designations (8.1.1 Unused Pins) |
| 8.3 | Ground and Power Table |
| 9.4 | Schematic Concepts for Hierarchical Descriptions |
| — | Table 3-2 Font Size Examples; Figure 6-1 Junction Descriptions; Figure 6-2 Symbols for Power and Busses; Figure 6-4 Off Image/Page References |

**Honest limitation, and it is severe.** I have IPC-2612's cover, full contents, scope, purpose,
classification and applicable-documents clauses verbatim from IPC's free front-matter PDF. **I do
not have the text of clause 6 (Layout), clause 7 (Net Naming) or Table 3-2 (Font Size
Examples).** Those three are precisely where the in-force, electronics-specific numbers for
junctions, power/ground presentation, signal paths, reserved characters and font sizes live.

**A search result attributed to IPC-2612 the sentence "The signal flow should be from left to
right and then circuit sections in order going down the page."** I traced that sentence and **it
is not from IPC-2612.** It is from John Martin, *Clear Schematics*, Martin Company, Rev 04,
8 February 2017 — a private company practice document. I found it by grepping that document's
text (line 90). This is recorded because it is exactly the failure mode `CLAUDE.md` warns about:
a convention presented with a standard's authority that the standard may or may not contain.
**IPC-2612 §6.6 is titled "Signal Paths" and may well say something very like it — but until
someone reads §6.6, nobody may write that IPC says it.**

### 1.7 IEEE 991-1986 — logic diagrams, not relevant and inactive anyway

IEEE 991-1986 (R1994), *Standard for Logic Circuit Diagrams*, "provides guidelines for
preparation of diagrams depicting logic functions". It was **inactivated 2019-11-07**
([IEEE SA](https://standards.ieee.org/ieee/991/1365)). IEEE 315's own scope excludes logic
diagrams. For an analog audio repository it is not relevant; it is listed only to close the
question.

### 1.8 Standards that cover ingredients rather than schematics

- **ASME Y14.1** — drawing sheet sizes and formats. Invoked by Y14.15 15-3.4: "Drawing sizes
  and formats used with diagrams shall conform with USA Standards Y14.1. In general, the
  smallest size standard format compatible with the nature of the diagram should be selected."
- **ASME Y14.2-2014 (R2020)** — line conventions and lettering; "establishes the line and
  lettering practices for use in the preparation of drawings, including the recognition of the
  requirements for computer aided design (CAD) and manually prepared drawings". Invoked by
  Y14.15 15-3.5. **I did not obtain its minimum lettering heights**, which is where the real
  legibility number lives (§7).
- **ASME Y14.44-2008 (R2024)** — reference designations; replaces IEEE 200.
- **IEC 81346-1**, **IEC 61175**, **IEC 61666** — reference designations, signal designations and
  terminal identification respectively; all normatively referenced by IEC 61082-1.

---

## 2. The conventions, with how firmly each is established and who says so

Each heading below states the convention, then its source, then **how firmly established it is**
on this scale:

- **STANDARD (in force)** — stated as a requirement or recommendation in an active standard.
- **STANDARD (withdrawn/inactive)** — stated as a clause in Y14.15, IEEE 315 or IEEE 991. Still
  the best written authority; must be cited with its status.
- **STANDARD (title only)** — an active standard has a clause on exactly this, and I could not
  read the clause. **Not usable as a criterion yet.**
- **TOOL CONVENTION** — a documented requirement of KiCad specifically.
- **GENERAL PRACTICE** — widely taught and followed, attributable to a named non-standard source.
- **UNSOURCED** — commonly asserted; I found no standard and no authoritative attribution.

### 2.1 Signal flow direction

**Firmness: STANDARD (withdrawn) for the rule; STANDARD (title only) for the in-force version.**

> **15-7.1 Layout.** The Schematic Diagram **shall** use a layout which follows the circuit,
> signal, or transmission path either from input to output, source to load, or in the order of
> functional sequence. **Long interconnecting lines between parts of the circuit should be
> avoided.** Draw similar basic circuits in a similar form (this does not prevent the use of
> simplified drafting practice to depict repeated circuits).
> — ANSI Y14.15-1966 (withdrawn), 15-7.1

> **15-8.1 Layout.** In general, Schematic Diagrams should be arranged so that they can be read
> functionally **from left to right**. Complex diagrams should generally be arranged to read from
> **upper left to lower right**, and may be laid out in **two or more layers. Each layer should
> be read from left to right.** The overall result **shall** be a circuit layout which follows
> the signal or transmission path from input to output, or in the order of functional sequence.
> **Where practical, terminations for external connections should be located at the outer edges
> of the circuit layout.**
> — ANSI Y14.15-1966 (withdrawn), 15-8.1

Three separate things are bundled there, and a criteria document should keep them apart:

1. left-to-right reading (`should`);
2. upper-left-to-lower-right in layers for complex diagrams (`should`);
3. the layout follows input→output or functional sequence (`shall`) — this is the strong one, and
   it is *weaker than "left to right"* in a useful way: it permits any arrangement in which the
   functional order is legible.

IEC 61082-1 clause **7.1.1 "Flow of energy, signal, etc."** and **Figure 21 "Example of
functional grouping and signal flow directions"** are the in-force treatment — **title only**.

**Feedback.** Y14.15 does not state a rule for feedback paths. It grants one related exception,
and only to the orthogonality rule: "Except for such circuits as 'multi-vibrators' and
'bridges,' connecting lines and the symbols joined by them should be drawn horizontally and
vertically" (15-7.2). **I found no standard that says how a feedback path should be drawn.** Since
a feedback path must by definition run against the signal flow, any left-to-right criterion that
does not exempt feedback edges will fail on every op-amp in this repository. **How feedback edges
are identified and exempted is an open decision** (§7).

### 2.2 Orthogonal connecting lines, bends, crossings and spacing

**Firmness: STANDARD (withdrawn) with a stated number; STANDARD (title only) in force.**

> **15-7.2 Connecting Lines.** Connecting lines **should be drawn with as few bends and
> crossovers as possible.** Except for such circuits as "multi-vibrators" and "bridges,"
> connecting lines and the symbols joined by them should be drawn **horizontally and
> vertically**.
> — ANSI Y14.15-1966 (withdrawn), 15-7.2

> **15-7.2.1 Spacing.** Spacing between parallel lines after reduction to ultimate use size (see
> 15-3.6) **shall be a minimum of 0.06 inch.** The longer parallel lines shall be arranged in
> groups, preferably three to a group, with approximately double spacing between groups... In
> determining the grouping, functional relation of the lines should also be considered.
> — ANSI Y14.15-1966 (withdrawn), 15-7.2.1

**0.06 inch is a real, standard-stated number** — one of only three I found. It is a `shall`, and
it is specified *after reduction to ultimate use size*, so it is a constraint on the printed
artifact, not on the file.

> **15-6.3.5 Horizontal and Vertical Lines.** Lines between symbols should be horizontal or
> vertical with a **minimum of line crossings**, and with spacing to avoid crowding.
> — ANSI Y14.15-1966 (withdrawn), 15-6.3.5

In force: IEC 61082-1 clause **7.1.3 "Connecting lines"**, **Figure 36 "Example for avoiding
bends and cross-overs"**, **Figure 37 "Spacing of lines"** — **title only**.

Note what is *not* here: **no standard I found states a maximum acceptable crossing count, bend
count or wire length.** All three sources say *minimise* and none says *how few is few enough*.
That is the single most consequential gap for this project and §4 shows the research literature
has the same gap.

### 2.3 Junction dots and the four-way crossing rule

**Firmness: STANDARD (withdrawn), clearly stated; GENERAL PRACTICE for the stronger "never
four-way" form; STANDARD (title only) in force.**

This convention is better supported by a standard than I expected:

> **15-7.2.2 Junctions and Crossovers.** All junctions of connecting lines **should be shown as
> single junctions**, as shown in Figure 7-1(A), **the preferred method**, or Figure 7-1(B)...
> **When layout considerations prevent the exclusive use of the single junction methods** of
> Figure 7-1(A) or 7-1(B), **multiple junctions may be shown** as in Figure 7-1(C). Figure 7-1(D)
> illustrates the use of both the "no-dot" single junction and "dot" multiple junction methods in
> an array of lines where spacing precludes the exclusive use of the "no-dot" single junction
> method of Figure 7-1(A).
> — ANSI Y14.15-1966 (withdrawn), 15-7.2.2

Reading Figure 7-1 with the text: (A) and (B) are **single (T) junctions**, no-dot and dot
variants, both preferred; (C) is the **multiple (four-way) junction**, permitted only when layout
prevents the use of T junctions; crossovers are drawn with **no junction** marking in all
variants.

So the standard's position is **T junctions preferred, four-way junctions permitted as a
fallback, crossings unmarked.** The stronger rule often taught — *never* a four-way junction,
always offset into two Ts — is **GENERAL PRACTICE** beyond what Y14.15 requires, and the reason
given for it is sound and worth recording because it is about the artifact surviving
reproduction: a dot at a four-way junction becomes a plain crossing if the dot is lost to
printing or scaling, whereas a T is unambiguous from its shape alone with or without a dot
(e.g. [Schemalyzer, *Schematic Design Best Practices*](https://www.schemalyzer.com/en/blog/schematic-review/best-practices/schematic-design-best-practices)).
That argument is strong, but it is an argument, not a citation; the four-way-is-forbidden form
should be adopted as a project decision, not presented as a standard.

**Crossover "hops"/bumps** — drawing a semicircular hop where wires cross without connecting — is
**GENERAL PRACTICE** only (Martin, *Clear Schematics*: "Lines that cross without connecting should
include the crossover bump to be more explicit"). Y14.15 Figure 7-1 shows plain crossings with no
hop. KiCad does not draw hops. This convention is not available to this project and should not
appear in its criteria.

In force: IEC 61082-1 **Figures 29–31** cover joining of connecting lines and the interconnection
of crossing connecting lines; IPC-2612 **6.2 Junctions** and **Figure 6-1 Junction Descriptions**
are the industry treatment — both **title only**.

### 2.4 Grid alignment and pin alignment

**Firmness: STANDARD (withdrawn/inactive) for the principle; TOOL CONVENTION for the number.**

The principle that symbol connection points lie on a modular grid is in IEEE 315's introduction
(quoted in §1.2) and was in withdrawn IEC 60617-1:1985 as "a grid for use with computer-assisted
design systems". **Neither states a pitch** — IEEE 315 says only that "by proper enlargement of
the symbols the usual coordinate-grid sizes can be matched". IEC 61082-1 **Figure 8 "Example of a
reference grid"** exists but is title-only, and in context (clause 5.7.3, Content area) it is
probably the *page zoning* grid rather than the placement grid.

The number comes from the tool, and KiCad's documentation states it as a hard functional
requirement rather than a preference:

> The default grid size is 50 mil (0.050") or 1.27 millimeters. This is the recommended grid for
> placing symbols and wires in a schematic and for placing pins when designing a symbol in the
> Symbol Editor. It is recommended to always use a 50 mil grid when placing symbols and drawing
> wires because the KiCad standard symbol library and all libraries that follow its style also use
> a 50 mil grid. **Using a grid size other than 50 mil will result in schematics without proper
> connectivity!**
> — [KiCad Schematic Editor documentation](https://docs.kicad.org/master/en/eeschema/eeschema.html)

This makes grid conformance the **best criterion in this whole document**: it is a boolean over
integer coordinates, it is sourced outside the generator, and violating it breaks connectivity
rather than merely looking bad.

**Pin line-up** — placing symbols so that pins on a shared net are collinear and the wire between
them is a single straight segment — is IEC 61082-1 **Figure 64 "Lining-up of symbols"**,
**title only**. It is measurable (§5, R40) but no source gives a target.

### 2.5 Power rails toward the top, ground toward the bottom

**Firmness: for electronics schematics — GENERAL PRACTICE at best. This is the convention whose
authority I most expected to find and least did.**

This is the most important negative finding in §2, so it is set out in full.

**What I did NOT find.** There is no power-at-top / ground-at-bottom rule in IEEE 315, and
**none in Y14.15's electronics-schematic clause 15-8** — not in 15-8.1 Layout, and not in 15-8.3
Circuit Return and Connection Symbols, which deals only with *which* return symbol to use:

> **15-8.3 Circuit Return and Connection Symbols.** ... The [chassis/earth] symbol should be used
> when there is a specific potential difference with respect to a potential reference level, and
> the [common] symbol should be used when the common connections are at an unspecified potential
> level.
> — ANSI Y14.15-1966 (withdrawn), 15-8.3

**What I did find, and why it is not the same thing.** Y14.15 has a clause that looks exactly
like the convention:

> **15-6.3.6 Voltage Arrangement.** The arrangement of the diagram should preferably show the
> **higher voltages at top or left** of the drawing and **successively lower voltages towards the
> bottom or right** of the drawing.
> — ANSI Y14.15-1966 (withdrawn), 15-6.3.6

**But 15-6 is "Single-Line Diagrams (Power Switchgear and Industrial Control)."** This is a rule
about one-line diagrams of power distribution systems, where "higher voltage" means a
transmission bus. Carrying it into an audio schematic as "+15 V at the top" is an analogy, not a
citation. It is a *good* analogy and it reaches the same arrangement — but a criteria document
that cites 15-6.3.6 for an op-amp schematic has quietly changed what the standard said, which is
the failure this repository has been burned by.

**The in-force clause that probably does state it, which I could not read:** IPC-2612 **6.5
Power and Ground**, with **Figure 6-2 "Symbols for Power and Busses"**, and IEC 61082-1 **7.4.5
"Representation of supply circuits"** with **Figures 76 and 77** (a.c. and d.c. supply circuits).
**Title only.** Reading IPC-2612 §6.5 is the highest-value single action available to settle this
convention's standing.

**What actually asserts the convention for electronics**, in the sources I could read, is a
private practice document:

> ...ideally, symbols should be designed so that they flow with **inputs on the left, outputs on
> the right, power supplies on top pointing up, the grounds on the bottom pointing down**, and
> grouping of signals together in such a way so as to simplify and clarify the schematics.
> — John Martin, *Clear Schematics*, Martin Company, Rev 04, 2017-02-08

That is a named, citable, dated source and it is **not a standard**. Note also that it states the
rule about **symbol design** (where a part's power pins are placed on its symbol), which is a
different claim from where the rail *net* sits on the sheet — and in KiCad the former is a
property of the library symbol, not of anything the generator controls.

### 2.6 How ground and power are shown: symbols versus named nets versus global labels

**Firmness: STANDARD (withdrawn) for using return symbols; TOOL CONVENTION for what the
mechanism is; STANDARD (title only) in force.**

Y14.15 15-8.3 (quoted above) and IEEE 315 §3.1.6 establish that circuit returns are shown with
**dedicated return/ground symbols**, with the choice of symbol carrying meaning (specific
potential vs unspecified). The implicit arrangement consequence — that a rail is reached by a
local symbol rather than by a wire drawn across the sheet to a shared node — follows from
15-7.1's "long interconnecting lines... should be avoided" rather than from any clause about
grounds.

KiCad's mechanism:

> Power symbols are special symbols in KiCad, used to designate global nets for power
> connections. [...] Global labels connect items located anywhere in the schematic. All global
> labels with the same name are connected, even when located on different sheets.
> — [KiCad Schematic Editor documentation](https://docs.kicad.org/master/en/eeschema/eeschema.html)

**A repository-specific tension worth flagging to whoever writes the criteria.** `CLAUDE.md`
states: *"There are no implicit or global nets. Ground, supply rails and bias references are not
special."* KiCad power symbols and global labels are exactly an implicit-global-net mechanism.
These are not in conflict — the model forbids *undeclared* globals, and a rail that is a declared
port in the model can be emitted as a KiCad power symbol — but the mapping from "declared port"
to "global power symbol" is a decision the criteria document should make explicitly rather than
leave to the emitter. I am flagging it, not resolving it; it is an architecture question, not a
readability one.

IPC-2612 **8.3 "Ground and Power Table"** suggests the in-force standard also expects a tabular
summary of power and ground nets on the drawing. **Title only.**

### 2.7 Reference designator placement, orientation and numbering order

**Firmness: STANDARD (withdrawn) with explicit rules, one of which is unusually checkable;
STANDARD (in force) for the letters themselves.**

The *letters* are ASME Y14.44-2008 (R2024), with IEEE 315 §22 as the historical list. The
*placement and numbering* rules are Y14.15:

> **15-8.6.2 Numbers.** The number portion of the reference designation shall follow the letter
> or letters without hyphen or space and shall be of the same size and on the same line; for
> example, C1, S14, and MG5. **The assignment of numbers should preferably start with the lowest
> number in the upper left-hand corner of the Schematic Diagram and proceed consecutively from
> left to right and top to bottom throughout the drawing.** When items are eliminated as a result
> of a drawing revision, **remaining items should not be renumbered.**
> — ANSI Y14.15-1966 (withdrawn), 15-8.6.2

This is a genuinely strong find: **"numbering ascends in reading order from the upper left" is a
published convention that is almost fully mechanical** — it is a sort over coordinates compared
against a sort over designator suffixes. It needs exactly one parameter (how far apart in `y` two
symbols must be before they count as different rows) and that parameter is unset (§5, R20).

Note also the **non-renumbering rule**, which matters for a *generator*: if a component is
removed from the model, a regenerated schematic that renumbers everything violates 15-8.6.2. Y14.15
offers the mechanism — a table of omitted and highest-used designators (Figure 8-14). For a
repository whose generated artifacts are "regenerated every run and compared by content", a
designator assignment that is a pure function of the model is simpler and probably preferable; the
deviation from 15-8.6.2 should then be recorded rather than ignored. **This is a design decision,
not a criterion.**

On placement:

> **15-8.7.6 Numerical Value and Reference Designation Placement.** Numerical values and reference
> designations **shall be located as near as feasible to the symbol.** Preferable arrangements are
> shown in Figure 8-16.
> — ANSI Y14.15-1966 (withdrawn), 15-8.7.6

> **15-9.1.3.1 Designation Location.** Whenever possible, all wire designations should be located
> either **above or to the right of its line** and terminal designations either **below or to the
> left of its symbol**... However, **any other consistent system** of wire and terminal
> designation location may be used.
> — ANSI Y14.15-1966 (withdrawn), 15-9.1.3.1

"As near as feasible" is not a test. But 15-9.1.3.1's escape clause — *any other consistent
system* — converts a taste question into a **consistency** question, and consistency is a boolean.
That is the right shape for a generated artifact: do not try to check that the label is in the
*best* place, check that every instance of a class puts it in the *same* place.

In force: IEC 61082-1 **5.20.2**, **7.1.6** and **Figure 45 "Location of reference designations at
a symbol"**; the 2014 edition's foreword records that this edition added "description of
exceptional cases for the application of rules for positioning of reference designations in
diagrams" — so the in-force standard does rule on designator positioning. **Title only.**

The *content* convention — designator on top, value in the middle, tolerance/rating at the bottom,
text left-justified and evenly spaced — is **GENERAL PRACTICE** (Martin, *Clear Schematics*,
Figure 10), consistent with Y14.15 Figure 8-16 which I can see is referenced but whose content I
can only partially read from the extracted text.

### 2.8 Text orientation

**Firmness: STANDARD (in force, title only) for the rule; STANDARD (inactive) for the
mirror-image prohibition.**

IEC 61082-1 clause **5.2 "Text orientation"** and **Figure 4 "Viewing directions of a document"**
are exactly this rule, in force. **Title only** — I do not have the clause, and the common
statement of the convention ("text readable from the bottom or from the right, never upside
down") is therefore **UNSOURCED** as far as my evidence goes, even though I am fairly confident
that is what Figure 4 shows.

What I can cite is the prohibition on mirroring, from IEEE 315 A4.2: "Letters and numbers that
constitute a part of a symbol **shall not** be presented in mirror-image form." That is a `shall`
and it is checkable.

ASME Y14.2 is the active standard for lettering practice generally and would be the place to look
for the reading-direction rule in the ANSI line.

### 2.9 Sheet size, zoning and title blocks

**Firmness: STANDARD (withdrawn) stated clearly; STANDARD (in force, title only).**

> **15-3.4 Drawing Size and Format.** Drawing sizes and formats used with diagrams **shall
> conform with USA Standards Y14.1.** In general, the **smallest size standard format compatible
> with the nature of the diagram should be selected.** When interrelated diagrams are sectionalized
> and prepared on different drawings, or as multiple sheet drawings, **suitable cross references
> should be provided. Separate sheets of multiple sheet drawings should be the same size.**
> — ANSI Y14.15-1966 (withdrawn), 15-3.4

> **15-8.2 Drawing Zones.** Zones (coordinates) **should be shown on a complex Schematic
> Diagram** to aid in the location of specific items... If a Schematic Diagram is prepared mainly
> for maintenance purposes and is likely to be reproduced in a technical manual or its equivalent,
> it is preferred that **the coordinate system begin in the upper left.** This preference is based
> on beginning the reference designation suffix number assignment from the same area on the
> Schematic Diagram (see 15-8.6).
> — ANSI Y14.15-1966 (withdrawn), 15-8.2

Note the standard links zoning origin to designator numbering origin — the same upper-left
convention drives both, which is a nice internal consistency a criteria document can lean on.
Note also that **"complex" is undefined**: the *trigger* for requiring zones is a judgement even
though the presence of zones is a boolean.

Title blocks: IEC 61082-1 **5.6 Page identification**, **5.7.2 Identification area** and **Annex B
"Document management information and title blocks"** (B.2 "Example of the layout of a title
block") — in force, **title only**. IPC-2612 **4.1 Diagram Title**, **4.2 Format Usage**.
Y14.15 **15-3.2 Diagram Titles** and **15-3.9 Drawing Number Reference Location** ("should be
shown close to the lower right edge of the diagram"). The *list of fields* a title block must
carry is **GENERAL PRACTICE** in my readable sources (Martin: name of schematic/product, company,
drafter, date of last revision, revision number, reviewer).

### 2.10 Functional grouping as visually distinct regions

**Firmness: STANDARD (withdrawn) for the mechanism; STANDARD (in force, title only) for the
principle.**

> **15-3.8 Layout of Diagrams.** The layout of diagrams **shall** be such that the main features
> are prominently shown. The parts of the diagram should be spaced to provide an **even balance
> between blank spaces and lines. Sufficient blank area should be provided in the vicinity of
> symbols to avoid crowding of notes or reference information. Large spaces, however, should be
> avoided**, except that space provision may be made for anticipated future circuits if deemed
> necessary.
> — ANSI Y14.15-1966 (withdrawn), 15-3.8

> **15-3.8.1 Grouping of Parts.** When a circuit contains parts which need be shown grouped, the
> grouping may be indicated by means of a **boundary (phantom) line enclosure.** The phantom line
> enclosure **may be omitted if sufficient space is provided between parts.**
> — ANSI Y14.15-1966 (withdrawn), 15-3.8.1

15-3.8.1's "may be omitted if sufficient space is provided" is the key sentence: the standard
treats **spatial separation and a drawn boundary as interchangeable** ways to show a group. That
gives a criteria document a choice of two checkable forms rather than one taste judgement.

In force: IEC 61082-1 **7.1.5 Boundary frames**, **Figure 21 "functional grouping and signal flow
directions"**, **Figure 65 "Grouping of symbols for functionally related components"**. **Title
only.**

**This is where this repository is unusually well placed.** Functional grouping is normally a
judgement because nothing in a netlist says what the functional blocks are. Here the model says
so explicitly: `include(prefix, network, portMap)` names every block and prefixes every net
inside it. "Each declared block's symbols occupy a region disjoint from every other block's
region" is therefore a **boolean over data the model already carries**, with no agent judgement
about what the blocks are — which is exactly what the governing invariant wants.

### 2.11 Breaking a connection into a named net or off-sheet connector

**Firmness: STANDARD (withdrawn) for the identification requirement; nothing anywhere for the
trigger.**

> **15-7.3 Interrupted Paths.** Connecting lines, whether single or in groups, **may be
> interrupted at convenient points and identified, with the destination indicated.** Letters,
> numbers, abbreviations, or other identifiers for interrupted lines **shall be located as close
> as possible to the point of interruption.**
> — ANSI Y14.15-1966 (withdrawn), 15-7.3

In force: IPC-2612 **4.4 "Off Page or Off Screen References"** with **Figure 6-4 "Off Image/Page
References"**; IEC 61082-1 **5.8 Cross-references** and **Figure 9**. **Title only.**

**The trigger is unsourced.** Y14.15 says a line "may" be interrupted "at convenient points" and
separately that "long interconnecting lines... should be avoided" (15-7.1) — but **no source
defines "long".** When a wire should become a label is measurable (wire run length) and its
threshold is unset. This is an open decision (§7).

### 2.12 Hierarchical sheets: when to split, and where the boundary goes

**Firmness: the requirements on a split are STANDARD; the decision to split is sourced nowhere.**

Once a diagram *is* split, standards do rule on it: Y14.15 15-3.4 requires cross references and
equal sheet sizes; IEC 61082-1 **clause 11 "Structured documentation"** with **11.2 Presentation
of occurrences of an object type in diagrams** and **11.3 Referencing**; IPC-2612 **9.4 Schematic
Concepts for Hierarchical Descriptions**. The IEC and IPC clauses are **title only**.

**The decision of when to split, and where the boundary falls, I could not source to any
standard.** The only readable guidance I found is practice:

> It is **preferable to use more sheets rather than to crowd** components or circuit or signal
> flows. Proper use of white space on the page can improve the clarity and readability of
> schematics... Clear schematics require thinking through how to best separate and
> compartmentalize circuit functions.
> — Martin, *Clear Schematics* (**GENERAL PRACTICE**)

and the same document's observation that with left-to-right, top-down flow "one or two signal
flows may be all that you can get on an 11x17 drawing" — a density claim tied to a specific sheet
size and font size, offered as experience, not as a standard.

As with functional grouping (§2.10), this repository's model offers a non-judgemental answer if
someone chooses to adopt it: **one sheet per declared block**. That is a policy decision for the
criteria author, not something a standard provides.

### 2.13 Line widths and emphasis of the main signal path

**Firmness: STANDARD (withdrawn) including a `shall`; STANDARD (in force, title only).**

> **15-3.5 Line Conventions and Lettering.** The selection of line thickness as well as letter
> size should take into account size reduction or enlargement, when it is felt that legibility
> will be affected. **A line of medium thickness is recommended for general use on diagrams. A
> thin line may be used for brackets, leader lines, etc. When emphasis of special features such
> as main or transmission paths is essential, a line thickness sufficient to provide the desired
> contrast may be used.** Line thickness and lettering used with diagrams shall, in general,
> conform with USA Standard Y14.2 and local requirements to facilitate microfilming.
> — ANSI Y14.15-1966 (withdrawn), 15-3.5

and, in the list of information that **shall** be included on maintenance schematics:

> **Signal flow direction in main signal paths shall be emphasized.**
> — ANSI Y14.15-1966 (withdrawn), 15-8.10

That is a `shall`, and it is unimplementable without a declaration of which path is the main one —
which the circuit model does not currently carry. It is recorded here as a criterion that becomes
checkable **if and only if** the model is extended to declare the main signal path. Until then it
is a human-judgement item, and an agent deciding for itself which path is "main" and then checking
its own emphasis against that decision would be the governing invariant's exact failure mode.

In force: IEC 61082-1 **5.10 Line widths**; IPC-2612 **3.5 Line Styles and Lettering**. ASME
Y14.2 is the active lettering standard. All **title only** or unobtained.

### 2.14 Legibility at the intended reproduction size

**Firmness: STANDARD (withdrawn) with two stated numbers; the actual minimum text height lives in
a standard I did not obtain.**

> For most diagrams intended for manufacturing purposes, or for ultimate use in a reduced form
> (**2.5 to 1 max.**), it is recommended that symbols be drawn approximately **1.5 times the size
> of those shown in the USA Standard Y32.2.**
> — ANSI Y14.15-1966 (withdrawn), 15-3.6

Those are the second and third standard-stated numbers I found. Both are about *reduction*, which
is the right frame: the 0.06 in spacing `shall` (§2.2) is also specified at ultimate use size. The
standards consistently treat legibility as a property of the **printed** artifact at its intended
size, not of the file — which fits `CLAUDE.md`'s "Look at the output, not only the tests. ...
Render it, print it, read it."

IEC 61082-1 **5.1 Legibility** and **5.11 Text fonts**; IPC-2612 **4.3 Legibility** and **Table
3-2 "Font Size Examples"**. **Title only** — and IPC-2612 Table 3-2 is very likely the single
most directly usable table in any of these documents for a generator that must pick font sizes.

KiCad's library conventions set field text at 50 mil (1.27 mm), matching the grid; I could not
retrieve `klc.kicad.org` (HTTP 403) and am relying on the Schematic Editor documentation for this.

---

## 3. Audio and analog specifics

**This section is thin, and inflating it would be the easiest dishonesty available in this
document, so: it is thin.**

**What exists:**

- **Symbols for the parts audio circuits use** are standardised and that is all. IEEE 315 and
  IEC 60617 both carry potentiometers, tapped and variable inductors, transformers with taps and
  multiple windings, and multi-position/multi-bank switches. IEC 60617's scope list includes
  "Basic passive components" and "Analogue and hybrid elements". These are symbol definitions,
  with nothing about arrangement.
- **Switch position convention**, which matters for a Pultec's rotary selectors and bypass
  switching: "Switch symbols **shall** be shown in the position of no applied operating force.
  For switches which may be in any one of two or more positions with no operating force applied
  or switches actuated by some mechanical or electrical means, a drawing note **shall** identify
  the functional phase shown in the diagram. Relay contacts **shall** be shown in the
  de-energized or nonoperated condition." (Y14.15 15-3.6.1, withdrawn). Three `shall`s, directly
  applicable, and the multi-position case explicitly requires an accompanying note.
- **Detached contact presentation** for switch banks — showing a multi-pole switch's sections
  separated from each other and from the operating mechanism, associated by designator rather
  than by drawn linkage — is Y14.15 **15-8.5.5**, and its stated purpose is exactly a readability
  metric: "Switching circuit functions may be more clearly shown, and **bends and crossovers
  substantially reduced** by showing the contacts of switching devices separated from each other
  and from the operating device (coil)." This is the most audio-relevant arrangement rule I
  found, because a rotary selector bank drawn as one symbol is a crossing generator.
- **Equivalent-circuit diagrams** have their own clause, IEC 61082-1 **7.3.2** — relevant to a
  repository that models transformers and inductors. **Title only.**
- **Values notation** for passives: Y14.15 15-8.7 gives a table of accepted forms (e.g. `52k`,
  `220k`, `.22M`, `3.3M`). This repository already parses values and additionally accepts RKM
  notation (`4K7`), which Y14.15's table does not show; that is a deliberate superset, not a
  violation, since RKM is standardised separately (IEC 60062).
- **Analog-specific aesthetics in the research literature** are about *integrated* analog —
  symmetry of differential pairs, current-mirror topology, device levelling by current path
  (§4). They are real, published and measurable, and they are about MOS/BJT cells, not about
  passive EQ networks, pots or audio transformers. Transferring them to a Pultec would be
  invention.

**What does not exist, as far as I can establish:**

- **No AES standard on schematic drafting.** AES standards I found in this space govern
  interconnection, grounding and EMC (AES48), digital interfaces (AES3, AES11) and measurement
  (AES17) — none of them documentation drafting.
- **No published convention specific to audio signal chains, passive filter networks,
  potentiometer arrangement, or tapped-inductor presentation** beyond the general rules in §2.

**Conclusion for the criteria author: there is no audio-specific readability standard. Audio
schematics are governed by the general rules, plus the switch-state and detached-contact clauses
above, which happen to matter a lot for a Pultec.**

---

## 4. What any of this says about GENERATED schematics, and how the field measures readability

### 4.1 The standards

**IEC 61082-1 clause 12 is titled "CAx conformance requirements"** and clause 4.2–4.3 cover
"Structure of documentation" and "Presentation of information" with **Figure 2 "Documents
generated from information stored in a database"** and **Figure 3 "Documents prepared and stored
in a database"**. So the in-force layout standard explicitly contemplates documents generated from
a database — which is precisely this repository's architecture. **Title only**, and clause 12 is
the one I would most want to read after IPC-2612 §6.

IPC-2612's scope says "Schematic information may be generated as hard copy or computer data
(**manually or automated**)" and its requirements "pertain to hard copy, electronic copy or
**electronic data descriptions**" — i.e. the standard applies to generated schematics on the same
terms as drawn ones. ASME Y14.2's scope likewise includes "the recognition of the requirements for
computer aided design (CAD) and manually prepared drawings."

**No standard I found sets a different or lower readability bar for a generated schematic.**

### 4.2 How the research literature measures schematic readability

This is the part of the research most directly useful to this project, and its headline result is
sobering in a specific, useful way.

**The metrics the field uses** (from Hsu & Lin, *Automatic Analog Schematic Diagram Generation
based on Building Block Classification and Reinforcement Learning*, MLCAD 2022, and the
corresponding patent US 12,475,291):

| metric | definition as used |
| --- | --- |
| **Net crossings (NC)** | count of signal-line intersections |
| **Wire bends (WB)** | count of directional changes in routing paths |
| **Total wire length (WL)** | aggregate routing distance |
| **Building block area (BBA)** | "the summation of the bounded area of each building block" |
| **Building block compliance rate** | percentage of blocks placed according to their classified alignment type (vertical, horizontal, 2-D) — introduced in that work "as a new aesthetic metric of analog schematic diagrams according to the fulfillment of topological features" |

The same work defines a **device levelling** rule that is a formalised signal-flow convention:
"Start with the power supply signal, Vdd, and follow the current direction of each device until
the ground signal", with differential pairs assigned the same level despite being separate
devices. That is a *computed* flow order rather than a declared one — notable because it shows
flow direction can be derived from topology rather than requiring the model to declare it.

**The crucial finding: nobody publishes a threshold.** The patent "contains no minimum/maximum
numeric specifications for acceptable metric values — only comparative performance data in
experimental tables." The MLCAD work reports that it "can effectively **reduce** the number of
wire bends and net crossings" relative to commercial tools. Every claim is **relative**.

Two further data points confirm this is the field's state and not a gap in my search:

- **Weave** (*Verified Netlist-to-Schematic Conversion via Layered Graph Layout*, arXiv
  2607.03835) verifies connectivity as a **binary certificate** — "A result is accepted only when
  the two connectivity partitions are identical" — and explicitly declines readability metrics:
  "Weave optimizes for verified connectivity first, and **does not yet report the crossing, bend,
  or visual-similarity metrics**." It cites no drafting standards.
- **EEschematic** (arXiv 2510.17002) splits evaluation into **Correctness** — "structural validity
  of the schematic by verifying device connectivity and ensuring **no overlaps** occur in
  components and wiring", scored pass/fail — and **Aesthetics** — "evaluated **subjectively** by
  manually assessing visual quality for symmetry, alignment, wire compactness, and overall
  clarity", scored 5/10 to 9/10 by a human. The authors name this as a limitation: "subjective
  evaluation of the final schematic aesthetics introduces a degree of human bias", and suggest
  "future work could incorporate quantitative visual metrics or expert-validated benchmarks." It
  cites no drafting standards either.

**What this means for this project, stated plainly.** The published state of the art in generated
schematics does exactly what §5's three buckets describe: it checks correctness and geometric
validity as booleans, it *counts* crossings and bends as objectives to drive down, and it hands
overall aesthetics to a human reviewer. **It does not have the thresholds this project would like
to borrow, and it does not pretend to.** A criteria document that invented one would not be
"following the literature" — it would be going beyond everything published.

The useful corollary: **relative measurement is legitimate and is what the field actually does.**
"This revision has fewer crossings than the last for the same netlist" is a real, falsifiable,
threshold-free criterion, and it matches `CLAUDE.md`'s "Minimising a measurable cost is not a
taste judgement... driving them down iteratively is exactly the work to automate."

---

## 5. Candidate criteria, with checkability

**Buckets:**

- **A — mechanically checkable.** A boolean over data in the `.kicad_sch` file and the circuit
  model, with no unset parameter. State the check; it either passes or fails.
- **B — measurable, threshold unset.** The quantity can be computed exactly. **The acceptable
  value is a judgement nobody has made.** The measurement is the deliverable; the threshold is an
  open decision, and is **not** filled in here.
- **C — human judgement only.** Not mechanically checkable. Worth recording for a human reviewer
  to grade; **must not be dressed up as a test.**

Source abbreviations: **Y14.15** = ANSI/ASME Y14.15-1966 (**withdrawn**); **315** = IEEE Std
315-1975 (**inactive**); **61082** = IEC 61082-1:2014 (in force; *title only* where marked);
**2612** = IPC-2612-2010 (in force; *title only* where marked); **Y14.44** = ASME Y14.44-2008
(R2024); **Y14.1/Y14.2** = ASME sheet-size / lettering standards; **KiCad** = KiCad documentation;
**Martin** = John Martin, *Clear Schematics* (general practice); **lit.** = research literature
per §4.2.

### Grid and geometry

| id | candidate criterion | source | bucket | the check |
| --- | --- | --- | --- | --- |
| R1 | Every symbol pin endpoint lies on the 1.27 mm (50 mil) grid | KiCad (number); 315 Intro, IEC 60617-1:1985 (principle) | **A** | For every pin, `x mod 1.27mm == 0 && y mod 1.27mm == 0` in sheet coordinates |
| R2 | Every wire segment endpoint lies on the same grid | KiCad | **A** | Same modulo test over all wire vertices |
| R3 | Every wire segment is horizontal or vertical | Y14.15 15-7.2, 15-6.3.5 | **A** | For each segment, `dx == 0 \|\| dy == 0`. Y14.15 exempts multivibrators and bridges, so the check takes a list of declared exceptions and fails on any undeclared diagonal |
| R4 | No two symbol bounding boxes overlap | Y14.15 15-3.8; 61082 5.1 (*title only*); lit. (EEschematic "no overlaps") | **A** | Pairwise rectangle intersection over all symbol body boxes |
| R5 | No wire passes through a symbol body | Y14.15 15-3.8; lit. | **A** | Segment-vs-rectangle intersection, excluding the segment's own pin attachment |
| R6 | No text item overlaps a symbol body, a wire, or another text item | Y14.15 15-3.8; 61082 5.1 (*title only*) | **A** | Pairwise intersection of text bounding boxes against all other geometry |
| R7 | No text is mirrored; text rotation is 0° or 90° | 315 A4.2 (mirroring, `shall`); 61082 5.2 + Fig. 4 (*title only*) | **A** | Every text item's `justify`/rotation fields are in the allowed set and carry no mirror flag |
| R8 | Adjacent parallel wire runs are at least 0.06 in apart **at ultimate use size** | **Y14.15 15-7.2.1 — standard-stated `shall`** | **A** | For each pair of parallel overlapping segments, perpendicular separation × (1 / declared reduction) ≥ 0.06 in. Requires the intended reduction to be declared; the 0.06 in is the standard's, not ours |
| R9 | Derived from R8: on a 50 mil grid printed 1:1, parallel runs are at least 100 mil apart | **derived** from Y14.15 15-7.2.1 | **A** | 0.06 in > 0.05 in, so adjacent grid lines are non-compliant and the minimum compliant pitch is 2 grid units. **This is arithmetic on the standard's number, not a chosen value**, and it is flagged as derived because it constrains routing density tightly |
| R10 | At most two distinct symbol scales appear on one sheet | **315 A4.4 — standard-stated count** | **A** | `count(distinct symbol scale factors) <= 2` |
| R11 | Symbols are drawn ≈1.5× library size when reduction up to 2.5:1 is intended | **Y14.15 15-3.6 — standard-stated numbers** | **A** | Conditional on a declared reduction ≤ 2.5:1; compares emitted scale against library scale |
| R12 | Every `lib_id` resolves to a symbol present in an on-disk library | Y14.15 15-3.6 (`shall` conform to Y32.2); 61082 5.12.1 (*title only*); repo rule "verify names against the thing itself" | **A** | Resolve each `lib_id` against the configured libraries; fail, do not warn, on a miss |

### Connectivity, junctions and crossings

| id | candidate criterion | source | bucket | the check |
| --- | --- | --- | --- | --- |
| R13 | The netlist exported from the generated schematic is identical to the model's netlist | repo architecture; lit. (Weave's binary connectivity certificate) | **A** | Export via `kicad-cli`, compare net partitions for equality. **This is the correctness floor, not readability** — but it is the one criterion the literature agrees must be binary |
| R14 | No four-way junction | Y14.15 15-7.2.2 (T preferred, four-way only when layout prevents); the absolute form is **GENERAL PRACTICE** | **A** | Count wire ends incident at each junction point; fail on degree ≥ 4. Y14.15 permits four-way as a fallback, so the absolute form is a **project decision to be stricter than the standard**, and must be recorded as such |
| R15 | A junction object exists wherever a wire endpoint meets another wire's interior | KiCad connectivity; Y14.15 15-7.2.2 | **A** | For each wire endpoint, test containment in every other segment's interior; require a junction object there |
| R16 | No junction object sits at a pure crossover | Y14.15 Fig. 7-1 (crossovers carry no junction) | **A** | For each crossing of two segment interiors, assert no junction object at that point |
| R17 | No dangling wire end | Y14.15 15-7.3 (an interrupted line is identified); 2612 4.4 (*title only*) | **A** | Every wire endpoint terminates at a pin, a junction, a label, or a sheet pin |
| R18 | Every interrupted line carries an identifier at the point of interruption, naming its destination | Y14.15 15-7.3 (`shall`, "as close as possible"); 2612 4.4 (*title only*) | **A** | Every label/sheet-pin is coincident with the wire endpoint it names. "As close as possible" becomes "coincident", which is stricter and checkable |

### Designators, values and labels

| id | candidate criterion | source | bucket | the check |
| --- | --- | --- | --- | --- |
| R19 | Every component carries exactly one reference designator and no designator is duplicated | Y14.44; Y14.15 15-8.6 | **A** | Count and uniqueness over the designator field |
| R20 | The designator's class letter matches the part's class | **Y14.44** (in force); 315 §22 (letter list) | **A** | Map model `kind` → permitted letters from Y14.44; fail on mismatch. An empty/strict map that refuses unknown kinds is preferable to a permissive one, per `CLAUDE.md` |
| R21 | Designator numbers ascend in reading order from the upper left | **Y14.15 15-8.6.2** | **B** | Sort components by (row band, then `x`); compare against numeric suffix order per class letter. Fully mechanical **except** the row-band height, which no source states. **Threshold unset: how far apart in `y` two symbols must be to count as different rows** |
| R22 | Designator and value text sit at a consistent offset across all instances of a class | Y14.15 15-9.1.3.1 ("any other **consistent** system... may be used"); 15-8.7.6 | **A** | Group by symbol class; assert a single relative offset vector per group. This converts 15-8.7.6's unmeasurable "as near as feasible" into the consistency test 15-9.1.3.1 explicitly allows |
| R23 | Designator and value text are "as near as feasible" to their symbol | Y14.15 15-8.7.6 (`shall`) | **B** | Distance from text box to symbol box. **Threshold unset** — "as feasible" is not a number |
| R24 | Every passive carries a value in an accepted notation | Y14.15 15-8.7 (value table); 2612 §5 (*title only*) | **A** | The repo's `parseValue` already throws on anything unparseable; the criterion is that every passive has a value field that parses |
| R25 | Component pin numbers are visible | **2612 6.3** (*title only* — the clause is named "Component Pin Number Visibility", so the requirement's existence is certain and its exact form is not) | **A** | Per-symbol boolean on the pin-number visibility property |
| R26 | Net and label names conform to the naming rules, using no reserved characters | **2612 §7, 7.3 Reserved Characters** (*title only*) | **A** | Regex over label names — **but the reserved-character set is in IPC-2612 §7.3, which I did not obtain.** The check's shape is certain; its content must be read out of the standard, never guessed |
| R27 | Switch symbols are shown in the no-applied-force position; relay contacts de-energised; multi-position switches carry an identifying note | **Y14.15 15-3.6.1** — three `shall`s | **A** | For switch/relay kinds, assert the emitted symbol unit matches the rest state and that a note exists for multi-position parts. Requires the model to carry switch rest state; if it does not, **refuse rather than assume** |

### Sheet, format and title block

| id | candidate criterion | source | bucket | the check |
| --- | --- | --- | --- | --- |
| R28 | The sheet size is a standard format | **Y14.1**, invoked by Y14.15 15-3.4 (`shall`) | **A** | Page size is a member of the Y14.1 set |
| R29 | All sheets of a multi-sheet schematic are the same size | Y14.15 15-3.4 | **A** | `count(distinct page sizes) == 1` |
| R30 | The smallest standard format compatible with the diagram is used | Y14.15 15-3.4 ("should") | **C** | "Compatible with the nature of the diagram" is a judgement. Could be approximated by an occupancy fraction, but the standard gives no occupancy target, so this is not a test |
| R31 | The title block is populated: title, revision, date, sheet *n* of *m*, author | 61082 5.6, 5.7.2, Annex B (*title only*); 2612 4.1; Y14.15 15-3.2; field list is **Martin** (general practice) | **A** | Non-empty assertion per field. **The field list is general practice, not a standard** — 61082 Annex B B.2 gives an example title block layout and should be read before this list is fixed |
| R32 | Zone (coordinate) references are present, originating at the upper left | Y14.15 15-8.2 | **A** | Boolean on zone markers and their origin corner |
| R33 | Is this sheet "complex" enough to require zones? | Y14.15 15-8.2 ("should be shown on a **complex** Schematic Diagram") | **C** | **"Complex" is undefined in the standard.** The trigger is a judgement even though R32 is a boolean |
| R34 | Line widths are drawn from a declared set by role (thin for leaders/brackets, medium general, thick for emphasis) | Y14.15 15-3.5 + Fig. 3-1; 61082 5.10 (*title only*); 2612 3.5 (*title only*) | **A** | Every graphic line's width is a member of the declared role→width map |
| R35 | Text height remains legible after the intended reduction | Y14.15 15-3.5 (invokes **Y14.2**); 61082 5.1, 5.11 (*title only*); **2612 Table 3-2 "Font Size Examples"** (*title only*) | **B** | Computable exactly as emitted height × (1 / declared reduction). **The minimum is stated in standards I did not obtain** — Y14.2 and IPC-2612 Table 3-2. This is a *different kind* of unset threshold from the rest of bucket B: the number exists and is citable, it is simply behind a paywall. **It must be read, not chosen** |

### Flow, grouping and arrangement

| id | candidate criterion | source | bucket | the check |
| --- | --- | --- | --- | --- |
| R36 | Signal flow reads left to right | Y14.15 15-8.1; 61082 7.1.1 + Fig. 21 (*title only*) | **B** | On the signal DAG derived from the model's declared input/output ports, count edges where `x_dest <= x_src`. **Threshold unset: how many backward edges are acceptable.** Requires a direction notion — two-terminal passives have none, so the measure runs over the derived DAG, and **feedback edges must be identified and exempted or the count is meaningless** (see §7) |
| R37 | The layout follows input→output or functional sequence | **Y14.15 15-8.1, 15-7.1 — both `shall`** | **C** | This is the *strong* clause and the least checkable: it permits any arrangement in which functional order is legible. A reviewer grades it |
| R38 | A complex sheet reads upper-left to lower-right, in layers each of which reads left to right | Y14.15 15-8.1 | **B** | Partition symbols into horizontal bands; measure monotonicity of flow within and between bands. **Threshold unset**, and the band partition itself is an unset parameter |
| R39 | Terminations for external connections sit at the outer edges of the layout | Y14.15 15-8.1 ("where practical") | **B** | Distance from each port/connector symbol to the nearest sheet edge, vs. the same for interior symbols. **Threshold unset** |
| R40 | Symbols on a shared net are lined up so the wire between them is a single straight segment | 61082 Fig. 64 "Lining-up of symbols" (*title only*) | **B** | Fraction of two-pin connections realised as one segment with zero bends. **Threshold unset** |
| R41 | Each declared functional block occupies a region disjoint from every other block's region | Y14.15 15-3.8.1 ("may be omitted if sufficient space is provided"); 61082 7.1.5, Figs. 21, 65 (*title only*) | **A** | Compute each `include()` prefix's symbol bounding box; assert pairwise disjointness. **Mechanical here specifically because the model names the blocks** — the agent does not choose them |
| R42 | Where a block is drawn with a boundary frame, the frame encloses exactly that block's symbols and nothing else | Y14.15 15-3.8.1; 61082 7.1.5 (*title only*) | **A** | Containment test of frame vs. block membership |
| R43 | Whether a given block warrants a drawn boundary frame rather than spatial separation alone | Y14.15 15-3.8.1 (explicitly offers the choice) | **C** | The standard offers both and prefers neither |
| R44 | Power rails are placed toward the top and grounds toward the bottom | **weak**: Y14.15 15-6.3.6 is a *power single-line-diagram* clause, not an electronics one (§2.5); 2612 6.5 + Fig. 6-2 (*title only*) may state it; **Martin** (general practice) states it for symbol design | **B** | For each rail/return symbol, `y` relative to the symbols it attaches to, and the count of power symbols oriented downward / ground symbols upward. **Threshold unset, and the convention's standing is itself unsettled — see §7** |
| R45 | Rails and returns are reached by circuit-return/power-port symbols, not by wires drawn across the sheet | Y14.15 15-8.3 + 15-7.1; 61082 7.4.5, Figs. 76–77 (*title only*) | **A** | For every net the model declares as a rail or return, assert each connection is via a power/ground symbol and no wire of that net exceeds a single pin-to-symbol stub |
| R46 | Repeated sub-networks are placed congruently, up to translation or reflection | **Y14.15 15-7.1** ("Draw similar basic circuits in a similar form") | **A** | The model's `include()` makes repeated blocks structurally identical, so compare their symbols' relative coordinate sets for congruence. **Mechanical, and a strong fit for the Pultec's repeated band sections** |
| R47 | Wire crossing count | Y14.15 15-7.2, 15-6.3.5 ("as few... as possible", "minimum of"); 61082 Fig. 36 (*title only*); **lit.** (NC) | **B** | Count pairwise interior intersections of wire segments. **No source states an acceptable count. The literature uses it only relatively (§4.2)** |
| R48 | Wire bend count | Y14.15 15-7.2; 61082 Fig. 36 (*title only*); **lit.** (WB) | **B** | Count direction changes per net. **Threshold unset; relative use only** |
| R49 | Total wire length, and longest single run | Y14.15 15-7.1 ("Long interconnecting lines... should be avoided"); **lit.** (WL) | **B** | Sum and max of segment lengths per net. **Threshold unset — no source defines "long", which is also what blocks R50** |
| R50 | A connection becomes a named net or off-sheet reference rather than a long wire | Y14.15 15-7.1 + 15-7.3; 2612 4.4 (*title only*) | **B** | Measure the run-length distribution and the count of runs above a cutoff. **The cutoff is unset and is the decision this criterion is waiting on** |
| R51 | Balance between ink and blank space; no crowding and no large empty areas | **Y14.15 15-3.8** (`shall` for "main features prominently shown"; "should" for even balance) | **B** | Ink-coverage fraction per zone and its variance across zones; largest empty rectangle. **Threshold unset**, and this is the bucket-B row closest to taste |
| R52 | Sufficient blank area near symbols to avoid crowding notes and reference information | Y14.15 15-3.8 | **B** | Minimum clearance from each text item to the nearest foreign geometry. **Threshold unset** |
| R53 | Symmetry residual for matched pairs and dual-section devices | **lit.** only (US 12,475,291 differential-pair levelling; EEschematic "symmetry") — **no standard** | **B** | Mirror-reflect one member of a declared matched pair about the pair's axis and measure coordinate residual. **Threshold unset; no standard source at all** |
| R54 | The main signal path is emphasised, and its direction is shown | **Y14.15 15-8.10 — a `shall`** (for maintenance diagrams) | **C** | Unimplementable without a model declaration of which path is "main". **An agent choosing the main path itself and then checking its own emphasis against that choice is the governing invariant's exact failure mode.** Becomes bucket **A** if and only if the model is extended to declare it |
| R55 | Cross-references exist for every sectionalisation, and every hierarchical sheet pin matches a label inside the sheet | Y14.15 15-3.4; 61082 5.8, 11.3 (*title only*); 2612 9.4 (*title only*) | **A** | Bidirectional name match between sheet pins and inner labels; assert every off-sheet reference resolves |
| R56 | Where to split a sheet, and where the boundary falls | nothing: no standard found (§2.12); **Martin** prefers more sheets to crowding | **C** | **No source provides a split criterion.** Becomes bucket **A** only if the project *decides* a policy such as "one sheet per declared block" — which would be a decision, not a standard |
| R57 | Does the drawing explain the circuit? | Y14.15 15-3.8 ("main features are prominently shown"); the purpose clause of every standard cited | **C** | A reviewer reads it. `CLAUDE.md`: "Render it, print it, read it." **Irreducibly human, and recording it as such is the honest move** |

### Bucket totals

| bucket | count |
| --- | --- |
| **A — mechanically checkable** | **35** |
| **B — measurable, threshold unset** | **15** |
| **C — human judgement only** | **7** |
| **total** | **57** |

These counts were produced by extracting the bucket column from the tables above
programmatically, not by hand — a hand tally of the same tables gave 29/18/10 and was wrong. The
per-row mapping is: **A** — R1–R20, R22, R24–R29, R31, R32, R34, R41, R42, R45, R46, R55;
**B** — R21, R23, R35, R36, R38–R40, R44, R47–R53; **C** — R30, R33, R37, R43, R54, R56, R57.

Within bucket **A**, four criteria rest on a number that a standard states (R8 and R9 on
Y14.15 15-7.2.1's 0.06 in, R10 on IEEE 315 A4.4's "two sizes", R11 on Y14.15 15-3.6's 1.5× and
2.5:1). The remaining 31 are booleans that need no number at all — which is why they are the ones
worth implementing first.

Within bucket **B**, **R35 is different in kind from the other 14**: its threshold is not unset,
it is unread. It is stated in ASME Y14.2 and in IPC-2612 Table 3-2, and it must be obtained from
those documents rather than chosen.

Within bucket **C**, **R54 and R56 are conditionally escapable** — R54 becomes checkable if the
model declares the main signal path; R56 becomes checkable if the project adopts a sheet-splitting
policy. Both escapes require a decision from outside the generator.

---

## 6. Two structural observations for whoever writes the criteria

These are not criteria and not conventions; they are consequences of §1–§5 that bear on how the
criteria document should be built.

**6.1 The standards consistently constrain the printed artifact, not the file.** Y14.15's 0.06 in
spacing is specified "after reduction to ultimate use size"; its symbol-size recommendation is
conditioned on a reduction up to 2.5:1; its line-thickness and letter-size clause says to take
reduction into account. **Every legibility criterion therefore needs the intended reproduction
size to be declared somewhere before it can be evaluated at all** — and nothing in this repository
currently declares one. That single missing declaration blocks R8, R9, R11 and R35. It also lines
up exactly with `CLAUDE.md`'s "Look at the output, not only the tests... Render it, print it, read
it", which suggests the right fix is a declared output format and a rendered check, not a
file-space approximation.

**6.2 This repository's model makes three normally-subjective criteria objective, and the reason
is worth stating because it is the invariant working as designed.** Functional grouping (R41),
congruent repeated circuits (R46) and rail presentation (R45) are judgement calls in a general
schematic tool, because a netlist does not say what the functional blocks are, which subcircuits
are repeated, or which nets are rails. Here the model says all three: `include(prefix, network,
portMap)` names each block and prefixes its nets, repeated blocks are literally the same function
applied twice, and rails must be declared ports because there are no implicit global nets. **The
agent is not choosing the blocks — the model it was given states them.** That is the difference
between a criterion and the failure mode `CLAUDE.md` describes, and it is why these three belong
in bucket A rather than C.

---

## 7. What I could NOT establish, and what remains genuinely open

Ordered by how much they block.

### 7.1 Three in-force standards' normative text, which I did not obtain

This is the largest gap and it is a procurement problem, not a research one.

| document | what I have | what I need, and why |
| --- | --- | --- |
| **IPC-2612-2010 §6 (Layout), §7 (Net Naming), Table 3-2 (Font Sizes)** | cover, full contents, scope, purpose, classification, applicable documents — all verbatim | §6.1 Connecting Lines, §6.2 Junctions, §6.5 Power and Ground, §6.6 Signal Paths and §7.3 Reserved Characters are the **in-force, electronics-specific** rules for the conventions this project most needs. Blocks R26 outright and settles R44 |
| **IEC 61082-1:2014 clauses 5, 7, 11, 12** | cover, foreword, introduction, full contents, scope, normative references — all verbatim | Clause 7.1.1 (flow), 7.1.3 (connecting lines), 7.4.2 (Layout), 7.4.5 (supply circuits), 5.2 (text orientation), 11 (structured documentation), 12 (**CAx conformance requirements**). This is the in-force layout standard and **I have only its clause titles** |
| **ASME Y14.2-2014 (R2020)** | scope statement only | The minimum lettering height. **R35's threshold is in here**, which is the one unset threshold in this document that is unset only because I could not read it |

**Until these are read, every row marked *title only* above is a statement that a standard rules
on the topic — not a statement of what it requires.** The honest position is that this document
establishes the *shape* of roughly a dozen criteria whose *content* is still behind a paywall. A
criteria document must not paraphrase a requirement from a clause title, and this document has
deliberately not done so.

### 7.2 The power-at-top / ground-at-bottom convention's actual standing

I could not establish that any standard states it for **electronics schematics**. The clause that
says it (Y14.15 15-6.3.6) is about **power single-line diagrams**; the clause that probably says
it for electronics (IPC-2612 6.5) I could not read; the source that definitely says it (Martin,
*Clear Schematics*) is a private practice document, and says it about **symbol design** rather
than sheet arrangement.

**What would settle it.** *Criterion:* a clause from an in-force or withdrawn standard, in a
section whose scope is electronics or general schematic diagrams, stating a vertical arrangement
rule for supply rails and returns. *Mechanism (a guess, per `CLAUDE.md`'s criterion/mechanism
distinction):* read IPC-2612 §6.5 and IEC 61082-1 §7.4.5 with Figures 76–77. If neither states it,
the honest conclusion is that **power-at-top is general practice and should enter the criteria as
an owner decision or a project convention, explicitly labelled as such** — not as a standard.

### 7.3 Every "minimise" threshold — and the finding that nobody has set them

No source — standard or research — states an acceptable number of wire crossings, bends, total
wire length, longest run, white-space balance, or symmetry residual. Y14.15 says "as few... as
possible" and "a minimum of"; IEC 61082-1 has a figure titled "Example for avoiding bends and
cross-overs"; the research literature reports **relative** improvement only and the two most
recent systems either decline readability metrics entirely (Weave) or score aesthetics
subjectively out of ten (EEschematic).

**This is a finding, not a gap in my search.** It means:

1. **Inventing any of these thresholds would put this project ahead of every published source**
   while appearing to cite one. That is the precise failure this document exists to prevent.
2. **The threshold-free form is available and is what the field actually does**: measure the
   quantity, record it, and require it to not get worse for a given netlist. `CLAUDE.md` already
   endorses this — "Minimising a measurable cost is not a taste judgement."
3. If absolute thresholds are wanted anyway, they are an **owner decision**, informed by measuring
   this repository's existing hand-drawn Pultec schematics. **That measurement is the obvious next
   action and I did not perform it** — and note the trap `CLAUDE.md` names: measuring the existing
   schematics and then treating them as the ceiling would make the as-built artifact the criterion.
   The measurement informs the decision; it is not the decision.

### 7.4 Feedback paths, which break the left-to-right criterion

No standard I found states how a feedback path should be drawn. A feedback path necessarily runs
against the signal flow, so **R36 as naively stated fails on every op-amp in this repository.**

*Criterion:* a backward-edge count that exempts feedback. *What is unresolved:* how a feedback
edge is identified. Candidates — an edge that closes a cycle in the model's directed graph; an
edge declared as feedback in the model; an edge between a declared output port and a declared
input port of the same block. **The first is computable from the model with no agent judgement and
is therefore the one most consistent with the governing invariant**, but I have not tested whether
it classifies this repository's circuits correctly, and saying which it should be would be
authoring a criterion.

### 7.5 The intended reproduction size, which is undeclared

Per §6.1, four criteria (R8, R9, R11, R35) cannot be evaluated until the intended print size and
reduction are declared. **Nothing in this repository declares one.** This is a small decision that
unblocks the only standard-stated numbers available.

### 7.6 Smaller open items

- **Row-band height for R21** (designator numbering order). Y14.15 15-8.6.2 says "left to right
  and top to bottom" without saying what makes two symbols the same row. Unset.
- **The "complex" trigger for zoning (R33)** and for the layered reading order (R38). Y14.15 uses
  "complex" three times and never defines it.
- **The title-block field list (R31).** Mine is general practice (Martin). IEC 61082-1 Annex B.2
  gives an example layout and should be read before the list is fixed.
- **KiCad Library Conventions.** `klc.kicad.org` returned **HTTP 403** to my fetch, so KLC rule
  numbers and exact values for pin length, field placement and text sizes are **not in this
  document**. The Schematic Editor documentation gave me the 50 mil grid and the 50 mil field text
  size; the rest of KLC is unverified here and should be read directly.
- **Y14.15 Figure 8-16** (preferred designator/value arrangements) and **Figure 7-1** (junction and
  crossover forms) are figures. I read them through extracted text and the surrounding prose; I did
  **not** visually inspect them. The junction reading in §2.3 is inference from text plus figure
  labels and should be confirmed by looking at the figures.
- **IPC-2611** (*Generic Requirements for Electronic Product Documentation*), which IPC-2612's
  classification clause makes normative — "Classification of Schematic and logic diagrams shall
  meet the requirements of IPC-2611" — is **unexamined**. It governs grades and completeness modes
  and may carry further presentation requirements.

### 7.7 One thing I expected to find and did not

**There is no audio-specific or analog-discrete schematic drafting standard.** I looked for AES
standards and found only interconnection, grounding, interface and measurement standards. The
analog-specific material in the research literature is about integrated analog cells (differential
pairs, current mirrors, device levelling by current path) and transferring it to a passive EQ would
be invention. §3 states this plainly rather than padding it; **if the criteria document has an
"audio specifics" section, the honest content of that section is Y14.15 15-3.6.1 (switch rest
state) and 15-8.5.5 (detached contacts for switch banks), and nothing else.**

---

## Sources

Read directly, in full or in substantial part:

- ANSI/ASME **Y14.15-1966 (R1973)**, *USA Standard Drafting Practices: Electrical and Electronics
  Diagrams* — **withdrawn, no replacement**. Full text: [mirror](https://inspectapedia.com/electric/Electrical-Drawing-Standard-ANSI%20Y14.15-1966.pdf);
  status: [ASME/Accuris](https://store.accuristech.com/standards/asme-y14-15-1966-r1988?product_id=22085)
- **IEEE Std 315-1975 (Reaffirmed 1993) / ANSI Y32.2-1975**, *Graphic Symbols for Electrical and
  Electronics Diagrams (Including Reference Designation Letters)* — **Inactive-Reserved
  2019-11-07**. Full text: [IIT Bombay mirror](https://www.ee.iitb.ac.in/~spilab/Tips/ansii_graphic_symbols_for_electrical_and_electronics_daigrams_1993.pdf);
  status: [IEEE SA](https://standards.ieee.org/standard/315-1975.html)
- **IEC 61082-1:2014** Ed. 3.0, *Preparation of documents used in electrotechnology — Part 1:
  Rules* — cover, foreword, introduction, contents, scope, normative references, from the free
  preview: [IEC preview PDF](https://assets.vde-verlag.de/iec-normen/preview-pdf/info_iec61082-1%7Bed3.0%7Db.pdf)
- **IPC-2612-2010**, *Sectional Requirements for Electronic Diagramming Documentation (Schematic
  and Logic Descriptions)* — cover, contents, scope, purpose, classification, applicable
  documents, from IPC's free front matter: [IPC TOC PDF](https://www.electronics.org/TOC/IPC-2612.pdf)
- **IEC 60617** database front matter and scope: [IEC](https://std.iec.ch/iec60617),
  [mirror](https://www.normservis.cz/download/view/iec/info_iec60617_DB.pdf)
- John **Martin**, *Clear Schematics*, Rev 04, Martin Company, Rosenberg, Texas, 2017-02-08 —
  **general practice, not a standard**: [PDF](https://www.martincomp.com/wp-content/uploads/Clear_Schematics_Rev_04-1.pdf)

Consulted for status, scope or metrics but not read in full:

- **ASME Y14.44-2008 (R2024)**, *Reference Designations for Electrical and Electronics Parts and
  Equipment* (replaces withdrawn IEEE 200-1975): [ASME](https://www.asme.org/codes-standards/find-codes-standards/y14-44-reference-designations-electrical-electronics-parts-equipment)
- **ASME Y14.2-2014 (R2020)**, *Line Conventions and Lettering*: [ANSI preview](https://webstore.ansi.org/preview-pages/ASME/preview_Y14-2_2014_R2020.pdf)
- **ASME Y14.1**, drawing sheet size and format: [overview](https://en.wikipedia.org/wiki/ANSI/ASME_Y14.1)
- **IEEE 991-1986 (R1994)**, *Logic Circuit Diagrams* — inactivated 2019-11-07: [IEEE SA](https://standards.ieee.org/ieee/991/1365)
- **IEC 60617-1:1985** (superseded), *General information, general index* — contained a grid for
  computer-assisted design: [IEC](https://webstore.iec.ch/en/publication/16975)
- **KiCad** Schematic Editor documentation (grid, power symbols, global labels, field text size):
  [docs.kicad.org](https://docs.kicad.org/master/en/eeschema/eeschema.html). KiCad Library
  Conventions at [klc.kicad.org](https://klc.kicad.org/) returned **HTTP 403** and is unread.
- Hsu & Lin, *Automatic Analog Schematic Diagram Generation based on Building Block Classification
  and Reinforcement Learning*, MLCAD 2022: [ACM](https://dl.acm.org/doi/abs/10.1145/3551901.3556486);
  corresponding patent **US 12,475,291**: [Google Patents](https://patents.google.com/patent/US12475291B2/en)
- *Weave: Verified Netlist-to-Schematic Conversion via Layered Graph Layout*, arXiv 2607.03835:
  [arXiv](https://arxiv.org/html/2607.03835v1)
- *EEschematic: Multimodal-LLM Based AI Agent for Schematic Generation of Analog Circuit*, arXiv
  2510.17002: [arXiv](https://arxiv.org/html/2510.17002)
- Schemalyzer, *Schematic Design Best Practices* — general practice, cited only for the four-way
  junction argument: [schemalyzer.com](https://www.schemalyzer.com/en/blog/schematic-review/best-practices/schematic-design-best-practices)
</content>
