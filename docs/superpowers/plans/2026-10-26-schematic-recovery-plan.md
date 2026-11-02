# Schematic recovery plan, 2026-10-26

**Three items, in order, with what finishes each.** Written because the owner
asked whether there was a plan or whether this was being winged, and the honest
answer was that there was a list being read aloud rather than a plan being
worked.

## Decision taken, not deferred: THE STAR STAYS

`edgesForNet` keeps emitting a star from a unit hub rather than chaining a net's
terminals. **This is a decision, not residue**, and it is taken here rather than
put to the owner a third time.

**Why.** It is what stacks a parallel capacitor bank into one column, which is
the arrangement he identified by eye and asked for: *"stacking all the capacitors
in the same column would eliminate hairpins and make the signal flows left much
more obvious."* The measurement that condemned it - wire backtracking rising
from 1.14 to 1.86 - is **one of the three proxies the governance review caught
being misused** (`docs/schematic/2026-10-26-governance-review.md`), and on the
occasion it condemned the star the owner looked at the drawing and judged it
better.

**What it costs, recorded rather than waved past.**

- Backtracking is genuinely higher. That is a real property of a star: every
  sibling radiates from one hub. It is not a measurement error.
- `lib/schgen/render/connectivity.ts` is now a declared divergence from the
  read-only pedals source, so nothing byte-checks it again - and the T-junction
  change that caused the divergence was separately measured to buy **nothing**.
  That cost is paid and cannot be unpaid by reverting the star.
- `pt2399-core` is lost by the star alone **and** by the 180 rules alone, and
  drawn by both together, so no figure in the current census has a single cause.

**What would reverse it:** the owner looking at a stacked bank and a chained one
side by side and preferring the chain. That is the only evidence that counts
here, per Principle 5's corollary, and it has not been taken.

## A — Green the suite

24 red, all from the jumper fix at `d379740`. Fourth re-drive of the same shape.

**Done when:** `bun test` is 0 fail with pass + fail = Ran; `bun run typecheck`
clean; board census unchanged at 7 of 11; `make -C boards/pultec-* check` exit 0
on all five; every `boards/*/*.perfboard.vrt` byte-identical; every moved figure
re-derived rather than copied from output, and the register amended.

## B — The governance spec

`CONSTITUTION.md` is marked defective: 46 findings, 16 of them errors, and the
self-refutation that Principle 6 was written without reading `G160`.

**Done when:** a spec exists whose criteria come from the review's ranked remedy
list rather than from this agent's sense of what matters - the review found the
omissions were not random - and a second reader who did not write it has been
over it. The corrected constitution is downstream of that spec, not part of it.

## C — `selectorBank`, drawn rather than specified

The Pultec capacitor bank. Now established as real work rather than a shortcut:
`bun run schgen-anchors` at `d379740` regenerates byte-identical, 2 of 12 blocks
drawn under any anchor, **none of them Pultec** (`G160`).

**Method is Principle 8's, minus the claim in it that is false:** draw a
candidate arrangement, render it, look at it, change it, repeat - then the owner
looks once and it is frozen. **Not** another prose specification; the four
existing Pultec template specs were written that way and the register already
records them as *"asserted rather than earned"*.

**Done when:** one template draws the capacitor bank on all five Pultec section
boards, the owner has looked at the rendered result and accepted it, and the
arrangement is frozen so unrelated rule changes stop moving it.

## Why this order

A first because every figure B and C would be measured against is currently
unattributable, and because it is this agent's debt. C last because it is the
only item with a chance of ending the re-drive treadmill - a templated block's
arrangement does not move when an unrelated rule changes - and it deserves a
clean baseline to be judged against.
