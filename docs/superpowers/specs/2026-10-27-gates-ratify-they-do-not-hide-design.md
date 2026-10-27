# Gates ratify; they do not hide

**Status:** written 2026-10-27. Awaiting the owner's review.

**Authority:** `docs/known-gaps.md` **G303**, which carries the owner's directive and his reasoning
verbatim. This document designs the mechanism; it does not re-decide the policy.

## The directive

> *"Gates can still refuse to ratify an output, but they shouldn't **hide** the output. The output
> should still be available, but clearly classified as unratified"*

and, on how an unratified drawing announces itself:

> *"Both. A watermark over the drawing that declares the drawing defective is a critical safety
> signal to NOT USE the drawing at the bench. As such, an unusable schematic doesn't need to be
> easy to read—it just needs to be possible to read"*

## What is wrong now

A refusal is a `throw`, so the geometry that provoked it is destroyed. **Four of the eleven boards
refuse today and nobody has ever seen what any of them would have drawn.** Every census figure this
project has published counts boards that *produced* a sheet; the remainder are invisible rather
than bad, and the difference has never been visible to anyone.

**The cost is not aesthetic. A gate whose output nobody can see is a demand nobody can
interrogate.** `CLAUDE.md` records four demands this repository satisfied without asking what they
were for - the BOM gate, the over-long `Value`, the `UPPER_SNAKE` net-name rule, the switch
mounting-pin demand - every one caught by the owner and none by an agent or a review. A refusal
whose evidence is destroyed is the condition under which that keeps happening.

`[RAN]` `grep -rc "throw new Error"` over `lib/schgen`: **351 sites** - 168 in `render/`, 43 in
`gates/`, 36 in `elk/`, 10 in `ir/`. Not all are in scope; see **Scope** below.

## The precedent this copies

This repository has already solved this shape once, on a different subject.
`docs/schematic/false-greens.md` mechanism 16 records a classifier whose unclassifiable bucket was
silently exempt, and the remedy:

> *"inference was replaced by declaration plus a totality assertion. A block declares itself; every
> block is `VERIFIED`, `NOT-OUTPUT` or `FAILED`; and the suite asserts the three sum to the block
> count - which is exactly the property the hole violated."*

printing the unclassifiable by name on every run,

> *"precisely so that not checked can never be indistinguishable from checked and clean."*

**This design is that sentence applied to drawings: UNRATIFIED must never be indistinguishable from
NOT PRODUCED.** `SheetDrawing.fieldFallbacks` is the same pattern already working in one place - a
defect recorded *on* the artifact rather than thrown - and this generalises it.

## Scope: which refusals are in, and which stay refusals

**The boundary is whether a drawable geometry exists at the point of refusal.** It is a property of
the refusal, not a judgement about severity.

**IN - geometry refusals.** The drawing exists and the check is about it: clearance violations,
the junction-disagreement check, `blocks.ts` and `bus.ts`'s invalid-layout throws, paper overflow.
These become findings on an unratified drawing.

**OUT - input refusals.** No drawing exists and none could: an invalid circuit (`pultec-mid`'s
`SW_MID` pin 12), an unresolvable symbol library, a malformed authoring declaration, a missing
lock file. These stay refusals, and the board is classified **not-drawable** with the reason. **It
is not a failure of this design that they produce no picture** - there is no picture to produce,
and saying so is the honest answer.

**The two must not be conflated**, which is the thing this design most easily gets wrong: silently
treating an input refusal as "unratified with no drawing" would reintroduce the exact
indistinguishability it exists to remove.

## The mechanism

### Status is carried, total, and printed

Every board under `boards/` resolves to exactly one of three:

- **`ratified`** - a drawing was produced and every check passed.
- **`unratified`** - a drawing was produced and at least one check failed. The drawing is
  available; the findings are attached.
- **`not-drawable`** - no drawing could be produced, with the reason.

**The three are asserted to sum to the board count**, per the precedent above, and the unratified
and not-drawable are **printed by name on every run** rather than being available on request.

### A refusal becomes a finding

A geometry check returns its findings rather than throwing. The drawing carries them, in the shape
`fieldFallbacks` already uses. Nothing downstream may read a drawing's presence as a claim that it
passed - the status is the claim, and it is on the artifact.

### The drawing announces its own status, twice

Because a sheet leaves this system as a PDF and is read out of context, **the artifact must carry
its own status or it becomes a new way to be misled.**

1. **A watermark across the drawing**, declaring it defective. Per the directive, this is a safety
   signal and not a decoration: it exists so the sheet cannot be mistaken for a build document.
   **The bar is POSSIBLE to read, not easy** - heavy enough that nobody could take it for a
   ratified sheet, light enough that the geometry underneath can still be examined, which is the
   whole point of not hiding it.
2. **The title block**, recording the status and the finding count in a field, so the record
   survives at a glance and in a thumbnail.

The findings themselves are listed where there is room for them - the sheet's free area or an
accompanying page - rather than crammed into the title block.

### What consumes ratification

- **The build guide packet refuses to print an unratified sheet.** This already ships, at
  `f42c129`, and becomes an instance of this rule rather than an exception to it. **This design
  weakens no gate.**
- **The census and the geometry baseline draw everything**, labelling each row with its status.
  Today's `7 of 11 boards produce a schematic` becomes a three-way split in which no board is
  missing.
- **Tests assert on status**, so a board moving from ratified to unratified is a visible change
  rather than a disappearance.

## Acceptance

**Done is:** every board under `boards/` that can be drawn at all produces a PDF a person can open
and look at; each is classified by one of the three statuses; an unratified sheet is unmistakable
as such on the page; and the owner, looking at the four boards that refuse today, can say for each
whether the gate that refused it was right.

**That last clause is the point of the whole exercise** and the only one that cannot be met by
code alone. The reform is worth nothing if nobody then looks.

**Not done when:** the statuses exist in a data structure but the PDF does not carry one. Not when
the census prints a new column. Not when the tests pass.

## Explicitly out of scope

- **Fixing any gate.** Whether the junction-disagreement check, the clearance checks or the paper
  rule are each *correct* is a separate question per gate, and this design exists precisely so that
  question can be asked with the drawing in hand. Changing one here would be deciding the answer
  before the evidence is visible.
- **The 168 `render/` throws about malformed input.** Out by the scope boundary above.
- **The selector-bank arrangement**, which is what was interrupted to do this and resumes after.

## Open question for the owner

**None.** The directive and the marking decision are both his, recorded in **G303**. If the
watermark's weight turns out to need his eye - the "possible but not easy" bar is a judgement about
a rendered page - that is settled by showing him one, not by asking in prose.
