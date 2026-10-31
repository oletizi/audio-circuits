
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

The register entries naming the area are read first **and so are the documents
those entries are about**, and the commit names both.

**AMENDED 2026-10-26, HOURS AFTER BEING WRITTEN, BY THE FAILURE IT DID NOT
PREVENT.** This step originally stopped at the register. An entry criticising the
`selectorBank` specification was read; **the specification was not**, and its
subject was inferred from the word "bank" in its name. It had always been *"a
rotary switch fanning out to a capacitor bank"* - the switch was in it - and a
plan, a pre-registration and a probe were built on the inference.
`docs/known-gaps.md` **G298** carries it.

**A register entry is a secondary source.** It exists to say something IS wrong
with a document, which is not the same as saying what the document says. Reading
one and stopping is how a real name acquires an invented meaning - and a real
name passes every `grep` an invented one would fail.

**Produces:** a commit message listing the entries read **and the primary
documents read behind them**.
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

### Step 5 — Change one thing, re-render, and SEND IT

Iterate. Each iteration names what changed and why, and the next drawing is
produced before the next claim is made.

**EVERY ITERATION GOES TO THE OWNER, not only the one offered for acceptance.**
His instruction, 2026-10-26:

> *"I'd like to see each iteration, not just the final iteration - that will let
> me help steer the development."*

**Produces:** a before/after pair, **both sent**, with one line on what changed.
**Broken if:** two changes land between two lookings, because then nothing
attributes the difference. **Also broken if** an iteration is produced, judged
internally as not worth showing, and skipped - that judgement is the thing the
agent has repeatedly got wrong, and withholding a bad iteration hides the
direction of travel, which is what he is steering by.

**STEERING IS NOT ACCEPTANCE.** He sees every iteration and may redirect at any
point; acceptance remains the single act of Step 6.

**AND THE AGENT PUSHES BACK ON THIS INSTRUCTION IN TWO PLACES, because he asked
it to rather than follow advice blindly.**

**First, a sentence that was here and is struck.** It read: *"it spends far less
of his attention than iterating three steps in a direction he would have rejected
at the first."* **There is no evidence for that.** It was written to make his
instruction sit comfortably beside Principle 2, which it does not entirely, and
smoothing a tension with an invented comparison is the behaviour this whole
document exists to constrain.

**Second, the real tension, stated rather than smoothed.** Principle 2 exists to
make the owner's judgement enter **once per construct** - that is the entire
economic argument for the effort, and it is what he was testing when he asked
whether this is quixotic. *"Show me every iteration"* is per-iteration attention,
which is the cost model Principle 2 replaces. Both cannot be the standing rule.

**So this is scoped, and the scoping is the agent's proposal, not his
instruction:** every iteration is sent **while a construct is being developed**,
and that stops when the construct is accepted. A frozen template then applies to
new circuits **without review**. If per-iteration review becomes permanent, the
amortisation argument for the whole programme is gone and we are hand-drawing
through an interpreter.

**There is a second risk and it is the agent's, not his.** The failure that ran
through this entire session was not looking - substituting counts for the page.
*"Send everything"* makes it possible to stop forming a judgement at all and let
him do the judging, which deepens exactly the dependency this is meant to reduce.
**So Step 4 is not relaxed by Step 5:** the agent states what it sees in each
iteration and what it intends to change next, before his reply. An iteration sent
without an assessment is Step 4 skipped, however many pages are attached.

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

## What is reusable at the end, and the condition under which nothing is

**He asked directly: will a reusable template be a product of this work?** The
honest answer is that **a reusable artifact is the point, but it may not be a
template**, and which it turns out to be is Step 2's to answer rather than this
document's.

Three outcomes, all of which leave something reusable except the last:

1. **A template.** The bank needs an arrangement no existing template draws, it
   is drawn and accepted, and Step 7 states what it structurally requires. Reused
   by every circuit of that shape, Pultec or not.
2. **A decomposition.** `G84` records that the method which worked resolved *"no
   template fits"* by splitting the block until existing templates fit, and calls
   decomposition *"the primary tool"*. If a section splits into pieces the four
   reachable templates already draw, **the reusable product is the decomposition
   pattern plus the declarations that express it** - and no new template is
   written. This is the cheaper outcome and the one the precedent favours.
3. **Neither.** The pieces do not fit existing templates and no arrangement can
   be stated construct-wise without naming a Pultec circuit in it.

**Outcome 3 is a stopping signal and is reported as one.** If what comes out
cannot be stated without naming hi-boost, then five drawings were fixed and
nothing was built - which is the question he raised about whether this effort is
quixotic, answered in the negative direction. **Step 7 is the test**: a
specification that names a circuit is not a reusable artifact, and the register
already records the four existing Pultec template specs failing exactly that
test.

## What this spec deliberately leaves open

- whether a Pultec section decomposes, and into what;
- whether `selectorBank` is written at all, or whether existing templates cover
  the pieces once decomposed;
- what any accepted arrangement looks like;
- how many frames a section board's sheet carries.

**All four are outputs.** The first is answered by Step 2 and the rest by Steps
3 to 6. Writing any of them here would make this the document it exists to
avoid.
