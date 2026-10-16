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

**The first task is a real run, not a design.** Take the low-boost candidate that
already exists, materialise it through the fork's `--materialize`, render it, and
put it in front of the owner. Whatever that run breaks becomes the next tasks.
The four gaps above are the expected first fixes; the honest expectation is that
there will be more.

**Then the remaining four sections**, with the plan revised by what the first one
taught. They are the same circuit family and the same scaffold — the five models
are 61 to 66 lines each and share `parts.ts` — so a fix for one is likely a fix
for all, but that is a prediction and not a plan.

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

**No cut count, wire count, board area or extent is a target.** The owner's
standing preference is as few cuts as possible, which the committed objective
already prices; his own boards carry five.

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
