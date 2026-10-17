A join site survives placement
==============================

**Status:** design, awaiting the owner's review.
**Closes:** G29. **Does not touch:** G22 (the search), the junction ground row,
or the three adopted boards.

The problem, in one paragraph
-----------------------------

`low-cut` and `hi-cut` produce no board at all. Both refuse at
`lib/stripboard/seed-place.ts:417` with `no-column-to-join`, on every one of the
five reviewed seeds. **It is not congestion.** Sixteen holes on hi-cut's failing
strip are empty and not one is usable: the join phase runs AFTER every part is
placed, and a hole is closed to a join when landing an end there would leave
another net interleaved - `A B A` along one strip, two runs no single cut can
rejoin. So the holes are free and the GEOMETRY is already fixed, two steps
earlier, by where the leads sit.

The measurement that shapes the fix
-----------------------------------

Driving the production predicate `interleavingOn` over the failing strip's real
contacts, and then over the same contacts with the failing net's own run shifted
**one column**, turns the usable-join-column set from `[]` to `[4]` on hi-cut
and `[]` to `[0]` on low-cut. **No part changes strip. No hole is added. The
highest column used is 17 of 26.** A board satisfying every stated constraint is
one column away, and the constructor cannot reach it because it places once,
left to right, first-fit, and never reconsiders.

**A second measurement rules out the cheap hypothesis.** The owner observed that
the junction's ground row - five pins all on net `0`, there for a ribbon cable's
return path - is not useful on perfboard. Removing it does NOT relieve these
refusals: low-cut still refuses on net `0`, now across strips 5 and 16 rather
than 5 and 6, which is WIDER; and hi-cut's refusal was never about ground at all
- it names a selector net, before and after. That removal is a separate decision
with separate value, recorded below under **Out of scope**.

What may not change
-------------------

**THE INVARIANT, and it is the whole reason for the chosen approach: any board
that constructs today must construct identically.** `pultec-low-boost`,
`pultec-hi-boost` and `pultec-mid` are committed under `boards/`, pass their own
`make check`, and carry renders the owner has approved - pinned by candidate
sha256, so a changed byte is an unapproved board. The owner, 2026-10-17:

> *"we don't need to revisit the three adopted boards. They're buildable as-is,
> as far as I can tell."*

A fix that re-derives every board would put three approved layouts back in front
of him to re-approve, for the benefit of two that do not build. That is the
wrong trade, and it is what rules out the otherwise-cleaner design.

The approach, and the one it rules out
--------------------------------------

**RULED OUT - reserve as you go.** Placement guarantees every multi-strip net
keeps a legal join site, by construction. Principled, and it changes the
arrangement of every board in the repository. No boards are exempt from it and
the invariant above cannot be stated, let alone tested.

**CHOSEN - retry only on refusal.** Placement is untouched on any board that
constructs today. When `joinNets` refuses, that refusal carries what it knows -
the net, and the two strips it could not bridge - and placement is re-run with
that single constraint added. Boards that never refuse never take the path and
emit byte-identical output.

The cost is honest: a second mechanism, two ways a board can be placed, and a
slower path for the boards that need it. What it buys is that the invariant is
TESTABLE, with the three adopted boards as the fixtures.

Shape
-----

1. **The refusal becomes a value before it becomes an error.** `joinNets`
   already knows the net and the strip pair. That triple is what placement needs
   and currently it is formatted into a message and thrown away.
2. **Placement accepts an optional set of join requirements** - net, low strip,
   high strip - and, when placing, keeps at least one column where both strips
   would admit a non-interleaving end for that net. With no requirements the
   behaviour is exactly today's.
3. **The retry is bounded and its bound is stated.** Each attempt adds the
   requirement its predecessor refused on. **A retry that refuses on a
   requirement it has already been given is not progressing and must refuse
   rather than loop** - and say so, naming both.
4. **The final refusal is better than today's, not merely later.** When retries
   are exhausted it names every requirement that was tried, so a reader learns
   what the placer could not satisfy simultaneously rather than only what it hit
   first.

Acceptance
----------

**Who judges, not what the number is.** The channels already exist:

1. **The invariant is a test, not a claim.** `low-boost`, `hi-boost` and `mid`
   construct to the exact bytes committed under `boards/` - their approved
   `candidateSha256` values are the fixtures. **This is the gate: if it fails,
   the change is wrong, whatever else improved.**
2. **The benchmark gate keeps passing** on the two `transistor-preamp`
   instances at figures counted off their own dumps at run time.
3. **`low-cut` and `hi-cut` construct, materialise, verify and grade** - or
   refuse with a message naming every requirement tried. **Producing a board is
   not required by this spec**; producing an informative refusal is. If the
   measured one-column counterfactual turns out not to generalise, that is a
   finding, not a failure to engineer around.
4. **Whether either board is any good is the owner's call on a render**, through
   the channel `stripboard/render-approvals.json` already provides. No agent
   concludes a board is worth building.
5. **Every new guard is perturbed, goes red by name, and is restored**, with the
   real output reported. The standard this program has set: a hang proven by
   `timeout` at status 124; a guard proven load-bearing by capping a file-size
   rlimit so the fork died mid-write; a fork mutation harness proving the
   mutated bytes reached the binary.

Out of scope, each with its reason
----------------------------------

- **The junction ground row.** Measured, and it does not fix these two. It is
  worth a separate decision on its own merits: without it `hi-boost` comes out
  at **0 cuts / 0 wires / 0 bridges**, kappa 0, extent 340 against 425, and
  `mid` at 1 cut / 1 wire / 0 bridges. **It cannot be applied globally**: the
  three committed layouts make net `0` whole THROUGH those five pins and the
  bridges tying them, so removing it opens ground on all three - the fork's own
  check reports `0 incomplete` on each. Any future removal is per-section or it
  is a break on disk.
- **The search (G22).** It improves an existing board; here no board exists, so
  it cannot apply. Its remaining benefit is tighter packing, which the owner has
  ruled he does not want: *"i prefer the loose layout. It's much easier to
  build."*
- **The producer aborting on the first refusing seed.** Four good seeds out of
  five currently yield zero boards. A real defect, not this one - all five seeds
  refuse on both sections here, so it is not what blocks them. Recorded
  separately.
- **G31 and G32**, the two holes in the approval channel found while using it.

Risks
-----

- **The one-column counterfactual was measured on two boards.** It establishes
  that a legal board exists near the refused one; it does NOT establish that one
  added requirement always suffices, or that satisfying one requirement cannot
  break another. The bounded retry and its no-progress refusal are the design's
  answer to that, and the refusal is a legitimate outcome.
- **Two placement paths can drift.** The invariant test is what keeps the
  no-requirements path honest; it must run on every one of the three adopted
  boards, not a sample.
- **An unexplained fork refusal exists nearby.** Under the no-ground-row arm,
  low-boost's seed 3 refused inside `--materialize` where it passes today. That
  arm is not this work, but the refusal is a reminder that removing a part
  changes what `--import` auto-places on the fresh base.
