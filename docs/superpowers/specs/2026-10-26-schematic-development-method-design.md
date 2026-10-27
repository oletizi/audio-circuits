
# How the next scope of work is developed

**Status:** written 2026-10-26. Item **C** of
`docs/superpowers/plans/2026-10-26-schematic-recovery-plan.md`. Awaiting the
owner's review.

## What this spec is, and what it refuses to be

**This specifies the METHOD, not the outcome.** The owner, 2026-10-26:

> *"What I want is a spec and a plan that describes HOW we will use our
> constitutional discipline to develop the next scope of work. I don't want a
> spec that prescribes what we don't know yet — namely what the schematic will
> look like when we're done."*

So this document does **not** say what the Pultec section's drawing looks like,
how a section decomposes into blocks, which templates it needs, or whether
`selectorBank` ends up existing. **Every one of those is an output of the loop
below, not an input to it.** A spec that answered them would be the failure the
register already records against the four existing Pultec template
specifications — *"asserted rather than earned"* — and would be prose standing
where a drawing belongs.

**It is checkable.** Each step says what it must produce. A step that produced
nothing is a step that did not happen, and this document is worthless if its
steps cannot be verified by someone who did not run them.

## The loop

### Step 1 — Read before building, and name what was read

The register entries naming the area are read first and the commit names them.

**Produces:** a commit message listing the entries read.
**Earned by:** two days spent reconstructing `selectorBank` while `G160` held
the measurement that governed it. Running this step once already changed the
plan — `G84` records that the method that worked resolved *"no template fits"*
by **decomposing the block across existing templates, not writing a new one**,
and `G141` records that an `auto` block can only ever reach four of the eight.

### Step 2 — Measure before designing

Where a cheaper answer than building exists, take it, and record the result
whichever way it comes out.

**Produces:** a measurement committed to the register, with the command that
reproduces it.
**Halts the step:** nothing. A null result closes a path, which is the point —
`bun run schgen-anchors` refuted *"the templates might already fit"* in minutes
and saved the work that would have followed it.

### Step 3 — Draw a candidate; do not specify it

The first artifact is a rendered sheet. Not a document describing one.

**Produces:** a generated `.kicad_sch` and its PDF.
**Broken if:** a prose description of the arrangement exists before a drawing of
it does.

### Step 4 — Look at it, then say what you see

The agent forms its view by looking at the rendered page, and the page goes with
every claim about it.

**Produces:** the PDF sent, and an assessment that could only have come from
looking.
**Broken if:** an arrangement is characterised from counts. The owner, after
three instances: *"You can't reason about or judge a schematic without LOOKING
at it."*

### Step 5 — Change one thing and re-render

Iterate. Each iteration names what changed and why, and the next drawing is
produced before the next claim is made.

**Produces:** a before/after pair.
**Broken if:** two changes land between two lookings, because then nothing
attributes the difference.

### Step 6 — The owner judges, once, on the drawing

Acceptance is the owner looking at the rendered construct and saying yes.

**Not acceptance:** a passing test, a census figure, an agent's opinion that it
reads well.
**Earned by:** three invented proxies in two days, each pointing the opposite
way to his judgement on a specific occasion.

### Step 7 — Freeze it, and say what it requires

The accepted arrangement becomes a template specified against the **construct** —
what it structurally requires — with no circuit named in its text. If no second
instance exists to test that generality, **record that** rather than letting its
absence pass.

**Produces:** a template whose specification names no Pultec circuit, and either
a second instance or a recorded admission there is none.
**Broken if:** its text names hi-boost, or a count of its own instances. Both
are live defects in the existing specs.

### Step 8 — Not working until it has run on the real input

A mechanism exercised only by its own tests has not been demonstrated.
`G226` permits that state **only when the precondition for wiring it is named
and the price is recorded**; otherwise it is the `G201` failure.

**Produces:** a generated Pultec sheet drawn through the template, or a named
precondition and a recorded price.
**Broken if:** progress is reported on the strength of a passing test.

## What binds throughout

- **A cause is a claim.** Naming why something refuses requires stating what
  would be true if the explanation were right, and checking it. Three wrong
  causes in a row this week, each reported as established.
- **A demand is a claim**, including one made by this repository's own tools.
  The generator asked for larger paper; the content was using 55% of the page.
- **No invented score.** Closed-form properties may be measured — content inside
  the page, a junction at every branch, a netlist that round-trips. Whether a
  drawing *reads* has no closed form and no proxy for it may be built.
- **A fallback is loud.** If a template declines a block, that is reported by
  name rather than falling silently to ELK.
- **Commit only paths changed.** Another session shares this worktree; `git add
  -A` has already swept one agent's register work into an unrelated commit.
- **Compare `Ran` across runs.** `pass + fail == Ran` does **not** catch a
  throwing `beforeAll`, which has masked tests three times here. The identity
  holds while the tests vanish.

## What halts the whole loop

**The owner's own test, and it is the one that decides whether this continues:**
does each observation of his still fix boards he was not looking at? Three for
three so far — the switch turn fixed four, the connector turn unblocked two
unrelated boards.

**If he has to make the same class of observation twice, the loop is not
converging** and that is reported rather than iterated through quietly. At that
point the agent is a slow interpreter for a person drawing eleven schematics,
and drawing them directly is cheaper and better.

## What this spec deliberately leaves open

- whether a Pultec section decomposes, and into what;
- whether `selectorBank` is written at all, or whether existing templates cover
  the pieces once decomposed;
- what any accepted arrangement looks like;
- how many frames a section board's sheet carries.

**All four are outputs.** The first is answered by Step 2 and the rest by Steps
3 to 6. Writing any of them here would make this the document it exists to
avoid.
