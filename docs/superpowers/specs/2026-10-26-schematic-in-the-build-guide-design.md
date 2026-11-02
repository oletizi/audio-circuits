# A readable schematic page in the build guide, for the two boards being built next

**Status:** written 2026-10-26. Awaiting the owner's review.

**Method:** this design is executed under
`docs/superpowers/specs/2026-10-26-schematic-development-method-design.md`, which
specifies the loop (read, measure, draw, look, iterate, accept, freeze, run on
real input). **This document does not restate that method and does not replace
it.** It says what is being built, what is already known about it, and what the
result is judged against.

**Not a method document.** Three already exist - the constitution, the method
spec, the pre-registration - and ten of the twelve commits before this one
touched no code. A fourth process document would be the failure, not the
remedy.

## What this is for, in the owner's words

The subject changed when he said what the sheets are for, 2026-10-26:

> *"They are references documents for the bench when I build the circuits IRL.
> That's why they need to be human-readable. There's a whole build guide that
> gets generated - I want readable schematics to be part of that guide so I can
> refer to the schematic while building to stave off my own in-the-moment
> confusion. If the schematics are wonky, it's worse than having nothing at
> all."*

**The deliverable is therefore not a `.kicad_sch` file.** It is a page in
`boards/<name>/guide/guide.pdf` that he can read at the bench while building.
A sheet that generates into a scratch directory and never reaches the packet
has delivered nothing, whatever the census says.

**And the last sentence is a gate, not a sentiment.** It is the owner answering
the policy question **G260** has held open since it was written: that entry
records 31 field pairs drawn over something across the boards and that *"no
check refuses a sheet for it by design"*. He has now ruled on what should happen
when a sheet is wonky, and the answer is that it must not ship.

## The two boards

`pultec-low-cut` and `pultec-low-boost`, because those are the ones he builds
first. His words: *"lo cut and lo boost are the ones i will build first."*

The other three sections follow once the construct is accepted; they are not in
the acceptance criteria below, and generality over them is measured rather than
assumed (method spec, step 7).

## Findings this session established, each with its evidence

**THIS SECTION IS NOW THE RECORD, not a summary of one.** It said *"recorded in
full in `docs/known-gaps.md`; summarised here"* until the register was frozen and
cut from 273 entries to 31 on 2026-10-27 (`1ef454a`). **F1 and F3 were written as
`G299` and `G301` and went in that cut**; `G300` and `G302`, which carry the
owner's decisions, survive. The full text of the cut entries is at
`git show a4b66de:docs/known-gaps.md`.

**That is the new rule working rather than a loss**: a finding belongs next to
the thing it is about, and the thing F1 is about is this design. What follows is
therefore load-bearing - **do not read it as a convenience copy of something
authoritative elsewhere.**

### F1 - the generated schematics do not reach the bench at all

`boards/pultec-low-boost/perfboard.json` and the other four Pultec sections
declare no `"sch"`. `tools/guide/packet.ts` emits `schematic.pdf` **iff** the
board declares one, so every Pultec guide prints, on page one:

> *"no schematic, and no schematic page has gone missing from it: there is no
> schematic for pultec-low-boost to print."*

`transistor-preamp-feedback` declares `"sch"` and gets a schematic page.
**`schgen` generates a per-section schematic - exactly the missing artifact -
and nothing offers it to the packet.** The guide reads `"sch"` as a path to a
hand-authored KiCad file; schgen's output is not that.

**This is the largest gap in the chain and it is not a drawing problem.** It is
why the schematic effort currently delivers a file to a temporary directory and
nothing to the board being built.

### F2 - Thompson-Bell's hand drawing is in the repository, and its bank carries no labels

`docs/pultec/P3bandDoc.pdf` page 5, *"The Pultec 3 band schematic is shown
below"* - purple pen on graph paper, signed *"Ian Thompson-Bell 2012"*. Four
instances of the selector-bank construct (LOSWA, HISWA, HISWB, LOSWB), drawn
identically:

- the common node is a rail, with the taps straight off it;
- the parts are perpendicular to that rail, **in one aligned column**, no stagger;
- each part reaches its throw on **one short straight run** - the switch is about
  a component-length away, not across the block;
- **the throws lie on an arc** about the wiper's pivot, drawn as the physical
  rotary switch it is;
- **no designators and no values appear anywhere in the bank.** The values are in
  a table on page 4 of the same document.

**The last point is why his aligned column stays clean, and it is why his
arrangement cannot be copied here.** Under the owner's requirement that the
sheet be a bench reference, the values must be on the drawing. An aligned column
plus labels is what `pultec-low-boost` already is, and it is what collides.

### F3 - the staggered diagonal is the owner's own solution, not Thompson-Bell's

`circuits/pultec/pultec-three-band-eq.kicad_sch` places each bank on a
descending diagonal - part `i` steps down and left, so each run to the selector
is one straight segment and the step opens a clear field above-left of each part
for its label. **This writer first attributed that to Thompson-Bell and was
wrong.** The owner, 2026-10-26: *"what you found is my hand-placed kicad
schematic. It was designed for off-board controls, so it's probably not the best
model - although it's not terrible."*

**The misattribution is recorded rather than quietly corrected**, because what it
cost is instructive: a rule was nearly derived from a drawing whose constraints
(off-board controls, a straight pin header) were never checked against the
drawing being generated.

**It remains the relevant precedent all the same, for a better reason than the
one it was first offered under:** it is the only arrangement in evidence that
keeps a *labelled* bank clean, which is the constraint that actually binds.

### F4 - the baseline, measured

`[RAN]` `bun tools/schgen/board-sheets.ts --pdf` at `8b91045`:

| board | result | fallback field placements |
| --- | --- | --- |
| `pultec-low-cut` | generated | 1 |
| `pultec-low-boost` | generated | 5 |
| `pultec-hi-cut` | generated | 2 |
| `pultec-hi-boost` | generated | 8 |
| `pultec-mid` | refused at `validateCircuit`, `SW_MID` pin 12 | - |
| `pt2399-core` | generated | 15 |
| `transistor-preamp-lab` | generated | 3 |
| `transistor-preamp-feedback` | generated | 0 |

**7 of 11 boards; 34 fallback field placements across 6.** A fallback placement
is text the placer could not keep clear, so it is drawn over something.

Looked at (method spec, step 4), both pages rendered and read: the circuit
occupies roughly the top-left third of an A3 sheet on every Pultec section, and
the remainder is empty but for the stand-in group boxes. That observation is not
new - the owner made it on 2026-10-25, recorded in **G293**: *"the complaints
about not having enough room is insane. There is **plenty** of room on the
page."*

## What binds, from the register and from the owner

These are inputs, not this document's inventions. An agent executing this design
does not get to re-decide them.

- **G292's ARRANGEMENT half is MOOT by the owner's ruling, 2026-10-27, and its
  ORIENTATION half is promoted to the general principle it was always reaching
  for.** His words:

  > *"when I asserted the capacitor bank should be to the right of the switch its
  > because the layout was so goofy i couldn't tell signal flow direction. So,
  > that directive is moot. That entire discussion led us into a boggy quicksand
  > - except for the part about rotating parts to better comport with signal
  > flow. The orientation of a component should be in the service of clarity and
  > signal flow. If a part causes less turbulence when rotated, it should be
  > rotated. If a part is facing opposite to the direction of signal flow, rotate
  > or reflect the part. My larger point in that discussion is that part
  > orientation is a critical factor in reducing turbulence and visual noise -
  > and the ancien regime **never** looked at or altered part orientation."*

  **So no side of the switch is prescribed**, and the open question this spec
  carried about left-versus-right is withdrawn rather than answered. **What binds
  instead is orientation**, and `docs/known-gaps.md` **G302** carries the ruling
  in full.

  **His last clause is confirmed by a code reading already in the register, not
  only by his impression of the drawings.** G292 records that
  `preferredOrientation` (`lib/schgen/rules/orientation.ts:81`) returns a
  rotation **only** for a part with a RAIL end, and that every other part falls
  through to `null`, which spec 1.5 resolves to rotation 0 - *"the orientation
  the symbol library itself draws the part in. Nothing chose that; it is the
  default of a rule that declines to answer."* **Part orientation is not a thing
  this generator decides badly; it is a thing it does not decide at all** for any
  part off a rail.
- **G293, owner criterion, 2026-10-25:** the members of a parallel group share
  one column. Recorded as **substantially met and not literally** - hi-cut's ten
  capacitors sit at two distinct x, hi-boost's at three.
- **G291:** boundary nodes are now sized with the real text geometry rather than
  zero, which is the built half of the text-collision programme. **The remaining
  collisions are not caused by dimensionless labels any more.**
- **G260, as ruled on today:** a sheet whose text is drawn over something must
  not reach the bench.
- **The stand-in groups are BUILD CONTENT, not clutter.** The owner, 2026-10-26:
  *"the stand-in networks are optional at build time - depending if I want to
  build a standalone module (in which case I need them) or some combination of
  connected modules (in which case I need some or none of them)."*

  **This reverses a proposal this writer had already made** - to shrink or
  suppress the boxes because they take as much page as the circuit while holding
  one or two resistors each. They take that page because they are **options the
  builder chooses between at the bench**, which is precisely what a bench
  reference is for. The page-occupancy observation in F4 stands as a fact about
  the layout and is **struck as an argument for removing them.**

  **What it makes into a real question is their presentation, not their
  presence:** a conditional network needs to read as conditional, and which
  build configuration calls for which group is information the page does not
  currently carry. That is in scope for piece 4's looking, and it is the owner's
  judgement to accept.
- **Principle 1 / G71:** no invented readability score. Only closed-form
  properties are measured here.
- **CLAUDE.md:** the agent producing an artifact never authors the criteria it is
  judged by. Every criterion below is either a closed-form property or an owner
  directive quoted above.

## The design

Four pieces, in this order. Each is separately verifiable and the first two do
not depend on the drawing being good.

### Piece 1 - a baseline that is not an opinion

Measure, on all five Pultec sections, three closed-form properties of the
selector-bank block:

- **crossings** in the fan between the bank and the selector;
- **corner count** per run from a bank member to its throw (a straight run is 0);
- **fallback field placements**, which the census already reports.

Committed as a register measurement with the command that reproduces it, whichever
way it comes out. **This is not a readability score** - each is a property with a
closed form, and none of them is combined into a single number or optimised
against.

### Piece 2 - wire schgen's output into the guide packet

`tools/guide/packet.ts` gains a second way to obtain a schematic: a board whose
`perfboard.json` declares no `"sch"` but which has a `SchematicAuthoring`
declaration gets its sheet generated by `schgen` and printed into the packet.

**The declaration stays the authority for which circuit a board is** - F1's
failure mode was a section board pointed at a whole-EQ schematic, and nothing
here reintroduces it.

**Why this is second and not last:** method spec step 8 - *"a mechanism exercised
only by its own tests has not been demonstrated."* The real input is the build
guide, and every iteration after this one is judged on the page that would be
printed rather than on a scratch file.

### Piece 3 - the wonky gate

A generated sheet reaches the packet **only if** it passes the clearance checks
with zero fallback field placements. A sheet that does not degrades to the
existing no-schematic notice, which already names what is absent and why.

**This is the owner's sentence made mechanical**, and it is Principle 4's loud
fallback applied to the deliverable rather than to a block: the packet says, by
name, that a schematic was generated and withheld, and why.

**It is deliberately a gate on the deliverable and not a relaxation of anything.**
Nothing downstream may interpret a withheld sheet as a passing one.

### Piece 4 - the selector-bank arrangement

Developed by drawing, per the method spec's steps 3 to 6: a candidate is
rendered, looked at, changed, and every iteration is sent to the owner.

**This document does not specify the arrangement**, and saying what it should
look like here would be the failure the register already records against the four
existing Pultec template specifications - *"asserted rather than earned"*.

What it does record is the **starting candidate and why**: the staggered
arrangement of F3, because it is the only arrangement in evidence that keeps a
labelled bank clean, and labels are required by the owner's statement of purpose.
If it does not survive looking, it is replaced by whatever does.

**The arc of F2 is out of reach and is not attempted.** KiCad's rotary switch
symbol puts throws in a straight line; an arc needs a custom symbol, which is a
separate piece of work with its own justification. Recorded so its absence is not
read as an oversight.

## Acceptance

**Done is:** `boards/pultec-low-cut/guide/guide.pdf` and
`boards/pultec-low-boost/guide/guide.pdf` each carry a schematic page, the owner
has looked at both and accepted them, and no page reached him through a gate this
writer authored.

**Not done when:** a unit test passes. Not when the census figure moves. Not when
this writer judges the drawing readable - that judgement is the one Principle 1
forbids being automated and CLAUDE.md forbids being self-authored.

**Generality is measured, not claimed** (method spec, step 7). After acceptance:
which of the other three sections the arrangement draws unchanged, which it
refuses, and what had to change - recorded whichever way it comes out. If it
cannot be stated without naming a Pultec circuit, that is reported as the
stopping signal the method spec describes.

## Open questions for the owner

**None.** Both questions this document opened were put to him and answered within
a day, and each answer is recorded as a decision in "What binds" above rather
than left standing here:

- whether the stand-in group boxes belong on a bench reference - **they do; they
  are optional build content** (2026-10-26);
- which side of the switch the bank belongs on - **withdrawn, not answered.** The
  directive that raised it is moot by his ruling of 2026-10-27, and no side is
  prescribed.

**The second one is worth keeping visible rather than deleting, because of how it
resolved.** It was asked as a left-or-right question and came back as *"that
entire discussion led us into a boggy quicksand"* - the question had a false
premise, and asking it was still right, because the alternative was inferring an
answer from drawings he had not objected to. **G298** is the record of what
inferring costs.

**A new question will arise from piece 4 and is named here so it is expected
rather than sprung:** the stand-in groups are conditional on the build
configuration and the page does not say so. A rendered sheet that distinguishes
them is what puts that question properly, and it is not asked before there is
one.

## Out of scope, named so the omissions are not read as oversights

- **Correcting `CONSTITUTION.md`.** It is marked defective with 46 findings. It
  blocks nothing here and this design cites no principle as authority that the
  review struck.
- **`pultec-mid`.** It refuses at `validateCircuit` on `SW_MID` pin 12, before any
  geometry. A different defect, and not one of the two boards being built.
- **The rotary-switch arc symbol** (F2), per piece 4.
- **`pt2399-core`'s sheet**, which **G285** records as unreadable on nineteen
  counts and explicitly not a candidate for owner acceptance.
