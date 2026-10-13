---
title: Wiring route 3 — the completion pass — into `place`
date: 2026-10-13
status: draft-for-owner-review
---

# Running the completion pass in a real run

**What this is.** `tools/stripboard/complete.ts`'s `completionPass` is built,
tested and unreachable: `place` runs prepare → `--import` → search →
`evaluateStop` → `necessaryCuts` → report and never calls it. This document is
the design for wiring it in, written separately because wiring it changes what
the pipeline DOES, and because the one measurement anybody has for it cannot
currently be reproduced from a committed command.

**Why it is worth doing.** `complete-joins.ts` is the only wire planner in this
repository that plans against `copperGraph` COMPONENTS rather than strips and
hole distance, and it is reachable only from `complete.ts`. The strip-based
planner that does run recorded 7,417 enumerations that never bested anything.
So the planner built to answer that finding cannot fire, and the search sits at
7 cuts against the owner's hand-laid 5 with `HC1` failing on every board.

**The owner's decision that produced this document**, verbatim: *"Let's follow
your recommendation"* — the recommendation being that wiring is a behaviour
change at the end of a long branch and should get its own spec and review rather
than ride in on a cleanup commit. **Everything else in this document is agent
rationale and is not yet approved.**

## The honest starting position

Three things are true and none of them are hidden:

1. **The recorded result has no committed reproducer.** The figure in the plan —
   103 open nets to 85, eighteen closed for forty wires — came from a harness
   that is not in the repository. It cannot be re-run from any committed
   command, so it is a claim rather than evidence.
2. **CRITERIA describes one search, not two.** No clause describes a second
   pass. That is already recorded under the plan's Deviations. Wiring the pass
   into production makes that deviation load-bearing rather than incidental.
3. **The pass is licensed by a reading, not by a clause.** `HC1`'s *"Every net
   electrically whole, because a board that does not conduct has no cost worth
   reporting"* read with `A1`'s *"Nothing is tradeable."* The reading is sound
   and is the same one `climb-accepts.ts` already carries for the ordering's
   first key — but a reading is weaker than a clause, and this is the moment to
   either write the clause or decide not to.

## What wiring actually costs

`completionPass(start, input, spawn)` already takes what `place` has by the time
`search` returns: a `SeedStart`, and a `CompletionInput` of `runDir`, `netlist`,
`targets`, `reference`, `footprints`, `stock`, `rules`. The plumbing is small.
**The consequences are not**, and they are the reason this is a spec rather than
a patch.

### D1. The evaluation budget — needs an owner decision

Both passes read `rules.evaluationCap`. Sharing one cap means the search can
starve the completion pass; giving the pass its own cap is a new parameter, and
`PAR3` makes the rules file strict with no defaults, so a new key must be
explicit and reviewed. **This is a parameter decision and therefore the owner's,
not a value an agent may pick.** Recommended shape: a separate
`completionEvaluationCap`, because a shared cap makes the second pass's budget
depend on how hard the first one worked, which is not a property anyone intends.

### D2. The stopping rules — which pass do `Q1`–`Q6` describe?

`evaluateStop` reads a state derived from a `ClimbResult`. `completionPass`
returns a `CompletionResult`, a different shape. Someone has to say whether a
run's stopping rule describes the search, the completion pass, or the pair — and
`Q1`'s at-floor clause is the sharp case, since the floor is a property of the
whole board. Recommendation: the rule describes the RUN, evaluated once on the
final board, with the search's own rule recorded beside it as a diagnostic.
Nothing is deleted, so no reading is lost.

### D3. `run.json` and the canonical hash

Completion metrics must be recorded, and `G2.1`'s canonical hash covers inputs
and metrics together, so adding fields changes the hash. That is a feature, not
a problem: an old `run.json` should refuse by field name, the way the
span-closure rename already does. Requires a field-name refusal, not a silent
widening.

### D4. The report has no completion section

`report.ts` prints route 1's result only. A reader currently gets
nine-or-ten-of-fourteen with no line saying a second stage exists. Wiring the
pass without a report section would make the output actively misleading.
`UnclosedNet` already models what to print — the net, how many copper components
its reference pins fall into, how many of its `components - 1` joins a wire was
found for, and the refusal or rejection that stopped it. The project's rule
applies: look at the output, not only the tests.

### D5. Determinism

`V6` and `R7` require a run reproducible from a seed. The completion pass
enumerates joins, and the determinism scan that guards the search does not cover
it. Wiring it in extends that scan's scope, and any map or set iteration in the
join planner becomes load-bearing.

## Acceptance — what must be true before this is called done

- **A committed benchmark reproduces a completion-pass result.** This is the
  first requirement and the one that answers the honest-starting-position list.
  A number nobody can re-run is not a result. The benchmark names the board, the
  arm, the seed and the caps, and asserts the MEASURED outcome rather than a
  hoped one.
- **A board the pass cannot help is reported, not silently unchanged.** The
  measured structural ceiling already says 65 of 85 remaining open nets are
  unreachable because off-board pads fill every hole in their copper component;
  the remedy there is upstream, one spare column between pads. The pass must say
  so per net rather than appearing to have tried nothing.
- **`make check` and the adoption gate are unchanged in strictness.** No bound,
  table, whitelist or rules value is widened. If the pass's output fails a
  constraint, the constraint wins.
- **The 7,417-enumerations finding is re-measured** with the component-aware
  planner live, so the comparison that motivated route 3 is finally on the
  record.
- Cuts and open nets are reported before and after, on every board, against
  today's figures: 7 cuts on low-boost versus the hand-laid 5, and `HC1` failing
  everywhere.

## What this does not propose

- No new term in `F`. `OBJ1` stays the three line counts.
- No eleventh hard constraint.
- No change to `accepts` or `strictlyBetter` — the pass imports the acceptance
  rule unchanged, and the no-regression clause keeps applying.
- No relaxation of `HC1`. The pass exists to satisfy it, not to negotiate it.

## The decisions this document needs from the owner

1. **Wire it at all**, given that its one recorded result has no reproducer.
2. **D1**, the evaluation budget: one shared cap or a second explicit key.
3. **D2**, whether a stopping rule describes the search, the pass, or the run.
4. Whether CRITERIA gains a clause for a second pass, or whether the deviation
   stays a deviation with this document as its argument.
