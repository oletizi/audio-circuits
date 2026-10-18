# Laying out the five Pultec boards

**Status:** design, awaiting the owner's review.
**Predecessor:** `docs/superpowers/specs/2026-10-15-pultec-layout-capability-design.md`,
which made a Pultec section expressible in the model and said plainly that it did
not make one buildable. This is that second piece.

## Why, and in the owner's words

> *"I want to go through the process of laying out all the pultec boards now. We
> will undoubtedly run into stuff to fix doing that… and other stuff to fix when
> i try to build them"*

That sentence sets the shape of this work more than any requirement could. **The
task list below is expected to change**, and a spec that pretended otherwise
would be fiction. What is fixed is the goal and the standards; what is provisional
is everything after the first board goes through the whole path.

## What exists, and what does not

All five sections exist as physical models — `circuits/pultec/physical/`
{`low-boost`, `hi-boost`, `low-cut`, `hi-cut`, `mid`}`.ts` — and all five have
board directories under `boards/`. **`pultec-low-boost` already produces a sound
candidate in the model**: 4 cuts, 4 wires, 5 bridges, every net whole, on 19 × 23
of 34 × 27 stock, from the repository's own `rcm` arrangement. 11 of 20 orderings
build it.

Nothing has been materialised. `make check` refuses all five sections with
`reference-pin-not-on-board` because their parts are genuinely unplaced, and that
is the measure of distance to the goal.

## Four gaps already known, and why they are listed rather than fixed here

Each was found by measurement during the previous piece and left deliberately,
because fixing it there would have changed what the benchmark saw:

1. **The move generator refuses any board carrying a landing pad.**
   `movesFrom` calls `geometryFor` unconditionally for every placement, so a
   Pultec board — which always has panel controls — cannot be searched at all. It
   refuses loudly by name, so it is not a silent failure.
2. **The join column chooser does not know about shared strips.** It can place a
   join end inside another net's run, producing a proposal the search then
   discards. Today the cost is wasted evaluations.
3. **The renderer and the importer disagree on a part-type name** —
   `tools/guide/part-shapes.ts` draws `CAP_FILM` / `CAP_FILM_WIDE` while
   `lib/kicad/import-string.ts` emits `CAP_FILM2` / `CAP_FILM_WIDE2` for the
   Pultec rect caps.
4. **A landing pad has no shape in the dump model** — no part type, and several
   pads share one ref.

**They are named here so the plan does not rediscover them**, not because this
list is complete. Gaps 3 and 4 block looking at a Pultec board; 1 and 2 block
improving one.

## Shape of the work

**Revised 2026-10-16 after a third-party review**, which approved the direction
and asked for a definite completion condition and a milestone that runs the
WHOLE workflow rather than stopping at a render. Its words: *"The branch's goal
isn't to produce attractive candidate renders. It's to produce verified
stripboard layouts that can be committed to the repository and built."* The four
milestones below are its recommended sequence, adopted.

### Milestone 1 — low-boost, end to end

A vertical slice through the entire workflow, not a design:

1. generate the candidate (one already exists — do not discard a valid result
   and restart the search because other parts of the pipeline are unfinished);
2. materialise it and verify it independently;
3. render it for the owner's review;
4. incorporate whatever he asks for;
5. **adopt the approved layout through the existing gate**;
6. **confirm `make -C boards/pultec-low-boost check` passes.**

Only the minimum adapters needed to get there are fixed first. **Note which of
the four known gaps this does NOT require:** gaps 1 and 2 are in the move
generator, and materialising an existing candidate does not search, so they are
not Milestone 1's business.

**This introduces no new quality criterion. It completes a workflow whose
acceptance machinery already exists.**

**A consequence to state rather than discover: adoption WRITES A LAYOUT INTO
`boards/`, committed.** The previous piece touched no board file at all. This is
intended — `CLAUDE.md` puts placement and routing with agents — but it is a
change in kind, and it is named here so it is a decision rather than a side
effect.

### Milestone 2 — feasibility of the remaining four

**After low-boost is adopted**, and before the next implementation sequence is
chosen, run `low-cut`, `hi-cut`, `hi-boost` and `mid` against the constructor and
**classify every failure** as one of:

- unsupported software behaviour,
- incompatible component geometry,
- impossible placement under existing constraints,
- search exhaustion.

**The classification is the deliverable, because it names in advance the wrong
move.** `mid`'s `B32529` capacitors may want a six-hole span against a four-hole
recorded reach — that is a PHYSICAL constraint, qualitatively unlike the four
software gaps, and the risk is an implementer treating it as another deficiency
to engineer around. **A physical constraint must not be loosened to make the
search succeed.** If a section cannot be built from the parts it specifies, that
is a finding for the owner about the circuit.

### Milestone 3 — the remaining four boards

Produce and adopt each through the workflow Milestone 1 proved. **Record general
pipeline fixes separately from board-specific results**, so a fix that helps all
five is visible as such.

### Milestone 4 — integration

All five committed layouts pass verification, each has an owner-approved render,
and each has its wiring documentation.

**Building is the owner's, and produces its own findings.** He has said he expects
them. They are not in this spec's scope and must not be pre-empted by inventing
assembly criteria here.

## Acceptance

**Who authors it matters more than what it says.** An agent may never author the
acceptance criteria for the artifact it produces, so this names channels that
already exist:

1. **The existing rules judge each board.** `violationsOf` empty, both hard area
   rules held, `HC1`–`HC10` as the grader applies them. None may be relaxed to
   make a board pass.
2. **The benchmark gate keeps passing** on the two `transistor-preamp` instances
   at figures counted off their own dumps at run time. It is the regression net
   for this work as it was for the last.
3. **A board materialises and round-trips** — physical-state equivalence for
   placements, electrical equivalence for cuts, per the materialisation contract
   already settled. A disagreement is reported, never adopted.
4. **Whether a board is any good is the owner's call on a render**, as it has been
   for every board in this project. Not a figure, and not the producing agent's.
   The abandoned `lab` board is why: valid connectivity and a low construction
   cost did not make it worth building.

**No cut count, wire count, board area or extent is a target.** The owner's
standing preference is as few cuts as possible, which the committed objective
already prices; his own boards carry five.

### Completion — the five-board deliverable

The criteria above judge ONE board. **This is what finishing means**, added after
the third-party review observed that an evolving task list and an undefined
completion condition are different things:

> **All five Pultec section boards have materialised layouts, have passed their
> existing independent verification and adoption gates, and have been rendered
> for owner review and approved.**

The task list may evolve freely. **The project may not declare completion having
produced only low-boost.**

### Two requirements the review added, with their reasons

**Landing pads carry a stable identity derived from component AND terminal** —
`RV_LO_BOOST.1` — preserving the original component reference. Three pads of one
potentiometer belong to one logical component and correspond to three different
electrical terminals, and the pipeline must hold that relationship through
generation, search, materialisation, export and the wiring guide. **Do NOT solve
the rendering problem by inventing unique component references for what are
terminals of one component** — the fork invents `RV_LO_BOOST_1`-style names and
the importer already rejects them in favour of the owner ref from the dump's
`FROM <ref>.<pin>` line. A round trip with several pads sharing a ref is
required.

**The renderer is fixed to recognise what the importer emits — never the
reverse.** The `CAP_FILM` / `CAP_FILM2` mismatch is an adapter problem, and
changing the importer to emit what the renderer already draws would let a
presentation bug become an electrical-model change. **The rendering layer
consumes the physical model without modifying it.** A test renders a board
carrying each supported capacitor type and verifies that rendering changes no
exported component identity, pin mapping or connectivity.

## What is NOT changing

- **The objective.** No area term, no wire-length term, no re-weighting — even
  though the previous piece measured single jumpers up to 23 holes on a stride
  ordering. That is a finding for the owner, not a term for an agent.
- **`stripboard/rules.json`**, including the evaluation cap he set.
- **Both hard area rules**, and the exemption registry's scope.
- **The `lib/stripboard/` → `tools/` boundary.** The core reads no file and
  spawns nothing.

## Risks and open questions

- **A Pultec section is larger than anything the search has run on.** The
  evaluation cap was sized from an 11-net circuit and `rules.json` says so. If a
  Pultec run reaches it, that is evidence about the cap, not a reason to raise it
  mid-run.
- **Only low-boost has been probed.** `mid` is the one most likely to differ —
  its `B32529` capacitors are recorded as wanting a six-hole span against a
  four-hole reach. If it differs in kind, that is a finding for the plan.
- **The five seeds the `rcm` arrangement offers explore very little** — four of
  the five differ only by a transposition inside the junction block and reach
  identical figures. More starting points may be wanted, and that is a
  measurement to take rather than a change to make now.
- **`make check` will not go green for these boards until they are laid out AND
  graded**, and nothing here promises when. Two of its nine failures are
  unrelated to the Pultec sections.
