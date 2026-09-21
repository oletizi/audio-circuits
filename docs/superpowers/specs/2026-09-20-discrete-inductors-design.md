# Discrete inductors in place of tapped coils

Replace the two multi-tapped coils with nine discrete inductors, and move them
onto the section boards. Driven by per-unit cost across many instances, and by
the builder's constraint that hand-winding is out: it is labour-intensive and,
more importantly for repeatability, has no specified tolerance.

The EQ stays passive. No gyrators, no active parts, no power rails on the EQ
boards.

## Why the substitution is exact

A tapped coil's `Lboost` value is the inductance between the tap and the top of
the winding. A discrete inductor of that value, placed between the same
capacitor and the same common return, presents the same impedance in the same
place.

The selector energises exactly one position at a time, so in the tapped
realisation the unused winding sections carry no current and cannot couple into
the live one. The discrete realisation has no coupling to argue about at all.
The two are therefore electrically identical rather than merely similar, and the
modelling caveat recorded against the tapped winding in `three-band.ts` stops
applying.

`THREE_BAND_REFERENCE` does not change. Moving a part from a breakout board onto
the main board alters no net and no value. The existing unsplit-versus-composed
comparison should pass unchanged, which is what turns this claim into evidence.

## Inductor specification

Specified electrically, not by part number, so the boards outlive any particular
catalogue entry.

| Section | Values | Tolerance | DCR | Current |
| --- | --- | --- | --- | --- |
| High boost | 0.6, 0.3, 0.2, 0.1 H | ±20% | ≤1kΩ, ≤500Ω preferred | Line level |
| Mid | 2, 1, 0.45, 0.22, 0.1 H | ±20% | ≤1kΩ, ≤500Ω preferred | Line level |

Nine parts. Anything meeting the spec qualifies: a catalogue inductor, a
pot-core part, or a small transformer winding with the other side left open.

### Where those numbers come from

Both limits were measured against the validated model rather than assumed, and
both are looser than the usual instinct for inductor-based EQ.

**DCR barely matters.** Q in these sections is set by the deliberate damping —
Qmax and the mid's boost-return resistor — not by the coil. Coil losses are
small against the 4.7kΩ already in the loop. High boost at 5kHz, boost above
flat:

| Coil DCR | Qmax 4K7 | Qmax 470R |
| --- | --- | --- |
| 0Ω | +15.5 dB, Q≈1.1 | +20.6 dB, Q≈2.3 |
| 250Ω | +15.3 dB | +20.2 dB, Q≈2.1 |
| 500Ω | +15.1 dB | +19.8 dB, Q≈2.0 |
| 1kΩ | +14.8 dB | +19.0 dB, Q≈1.8 |
| 2kΩ | +14.1 dB | +17.8 dB, Q≈1.6 |

The centre frequency does not move at any value. This is what removes the need
for thick-wire, low-DCR, physically large coils — most of what makes audio
inductors expensive.

**Tolerance barely matters either**, because the curves are broad by design.
Worst-case deviation anywhere in 1k–20kHz, high boost at 5kHz:

| L tolerance | Worst-case error |
| --- | --- |
| ±10% | 0.80 dB |
| ±20% | 1.67 dB |
| ±30% | 2.62 dB |
| ±50% | 4.87 dB |

±20% is under 2 dB. Standard parts are ±10% or ±20%, so tolerance is not a
selection criterion.

### Incidental finding

`R3` is fitted at 4K7, the value the documentation gives for the *no-inductor*
poor-man's build. An inductive build calls for nominally 470R. The difference is
about **5 dB of maximum high boost and half the Q**. One resistor. Out of scope
here, recorded as unresolved item 2.

## Repository changes

**`reference/pultec/partition.ts`** — `boardNetwork()` currently excludes
inductors, on the grounds that the hand-wound coil is off-board behind screw
terminals. That ceases to be true.

The exclusion is removed outright rather than made conditional: high boost and
mid are the only sections carrying inductors, so a global change and a
per-section one are equivalent, and the unconditional version says the true
thing — inductors are board-resident in this design. Potentiometers and rotary
selectors remain excluded; they are still front-panel parts.

**`modules/pultec-hi-boost/`** — gains four inductors. Its tap nets stop being
exported terminals and become internal nodes joining each capacitor to its
inductor. The module interface loses a 6-way terminal.

**`modules/pultec-mid/`** — gains five inductors, same change. Loses a 12-way
terminal.

**Tests** — module comparisons and the composed mapping pick up the new
components. `tests/modules/unsplit-vs-composed.test.tsx` should pass unchanged;
if it does not, the substitution is not as clean as this document claims, and
that is the point of running it.

**`reference/pultec/unresolved.md`** — record the DCR and tolerance results, and
note that the winding-coupling caveat no longer applies once the parts are
discrete.

## Consequences beyond the schematic

**The inductor breakout board disappears.** Small discrete parts sit beside the
capacitors they pair with. That removes a board, two 6-way and one 12-way
terminal blocks, and the loom between them. Fewer parts, fewer connections,
fewer opportunities to wire it wrong.

**Frequency reduction stays a build-time decision.** Every position remains on
the board; an application that wants four mid frequencies simply leaves seven
unpopulated. This is the same reasoning that put all eleven mid frequencies in:
a position designed in can be omitted, a position designed out needs a new
board.

## Out of scope

- Gyrators or any active inductor simulation. The EQ stays passive.
- Variant machinery. Build-time flexibility is "do not populate", which needs no
  code.
- The documented `Cpoorboost` no-inductor high boost. It stays recorded in the
  reference for anyone who wants it; nothing here builds it.
- Changing `R3`. Noted above, tracked separately.

## Open item

The 2H mid inductor has not been verified as purchasable at an acceptable price.
The spec is loose enough that a transformer winding is a legitimate answer, so
this is a BOM question rather than a design risk. If 2H proves expensive, the
fallback is to cluster the mid frequencies onto fewer distinct inductance values
— and since positions can be left unpopulated anyway, that is a build decision
and not a redesign.

## Success criteria

1. Nine inductors present in the two module boards, at the specified values.
2. Each module still compares equal to its portion of the reference partition.
3. The composed board still equals the reference partition recomposed.
4. Unsplit-versus-composed AC agreement holds across the control matrix,
   unchanged from before this work.
5. The inductor specification and the measurements behind it are recorded where
   someone selecting parts will find them.
