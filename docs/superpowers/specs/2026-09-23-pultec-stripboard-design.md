---
title: Putting the Pultec sections on stripboard
date: 2026-09-23
revised: 2026-09-23
status: approved-design
---

# Putting the Pultec sections on stripboard

> **Revised after review.** The first version had no name for the stage that turns
> an electrical module into a physical board, and consequently asserted an
> equivalence that cannot hold. It also committed the inductors to axial footprints
> before a part exists. Both are fixed below; **Physicalization** is the new idea,
> and it resolves several unrelated-looking awkwardnesses at once.

## Problem

`reference/pultec/` models a passive three-band Pultec EQ and `partition.ts` already
splits it into five per-section modules. The perfboard workflow
(`boards/`, `tools/perfboard/`, the forked VeroRoute) can check a hand-authored
stripboard layout against a circuit, and one board — `pt2399-core` — uses it.

Nothing connects the two. The Pultec model was built to be simulated: no component
carries a `part.footprint`, so `toImportedNetlist` refuses at the first capacitor,
and the layout-facing vocabulary the boards need does not exist in
`lib/kicad/import-string.ts`.

**This does not produce layouts.** Layout is authored by hand in the GUI; the tool
verifies and reports. What this builds is everything needed before that work can
start, plus the means to create a board in the first place.

## What is being built

Five stripboards, one per module in `partition.ts`: `low-cut`, `low-boost`,
`hi-cut`, `hi-boost`, `mid`. That split matches the prototypes in
`multi-channel-preamp`, which are already one board per section.

## Decisions taken

| Decision | Value |
| --- | --- |
| Board granularity | Five section boards |
| Inductor residency | All nine start off-board; per-section placement is the target, not the starting state |
| Wire landing pitch | 5.08mm, so a screw terminal block stays fittable |
| On-board pots | Not laid out yet; pots are off-board landings |
| Rotary selectors | Permanently off-board — panel-mount parts with shafts do not mount on stripboard |
| Terminal blocks | One per board, carrying every crossing net |
| Chassis ground | A landing on every board, including the three with no electrical ground |

## The pipeline

```
Pultec reference  ->  section partition  ->  physicalization  ->  VeroRoute netlist  ->  layout
```

`partitionReference()` answers **what portion of the electrical circuit belongs to
this module**. Physicalization answers **how that module is exposed and realized on
a board**: which components sit on it, what footprint each has, what order an
off-board part's pads come in, what terminal blocks exist, and what non-signal
infrastructure the board carries.

The stage exists because a physical board is deliberately *not* identical to its
electrical partition. It may add **physical-only components** — components that
appear in no electrical model and are electrically transparent. A terminal block is
the example: it contributes one pin to each of n *different* nets and joins nothing
to anything. That property is what makes "project the physical-only components away"
a well-defined operation rather than a judgement call, and every equivalence
assertion in this design is stated after that projection.

## Architecture

### Off-board parts are `PADS<n>`

The fork already has the mechanism. From `TemplateManager::GetImportStrCut`:

```cpp
if ( importStrCut == "PADS" ) { bOffBoard = true; importStrCut = "SIP"; }
```

A `PADS<n>` is built as a `SIP<n>` and then `BreakComponentIntoPads` splits it into
*n independently placeable pads*. `Reconcile.cpp` synthesizes the board-side type
back as `PADS<n>`, so `--check` compares it against what the netlist declared.

So the pots, the selectors and the inductors **stay in the board network** and are
marked off-board. There are no connector components standing in for them, and the
net membership `--check` verifies is the real one — the pot's own three lugs, not a
header pretending to be them.

This replaces what `boardNetwork()` does today. It currently *deletes* pots and
switches and re-exposes their nets as ports; under this design it keeps them and
flips a marker instead.

An off-board part needs **no footprint**: `PADS<n>` takes only its pin count.

#### What a `PADS<n>` does and does not claim

> An off-board component remains the logical component in the electrical network. In
> the stripboard representation, its `PADS<n>` geometry represents only the
> board-side wire landings corresponding one-to-one with that component's terminals.
> It does not model the component's physical location, its mechanical form, or the
> intervening wiring.

The correspondence is with *terminals*, not with any spatial grouping. VeroRoute
places PADS pads independently, so nothing keeps a pot's three landings adjacent on
the board. That is the freedom this design wants — a landing goes where the wire
should arrive — and it is equally the freedom to scatter one pot's lugs across the
board. Grouping is a layout discipline, not a modelled constraint.

### Moving a part on- or off-board

One membership change in a single `OFF_BOARD` set, plus a footprint if the part is
moving on-board, then `make update` reconciles the layout. The same rule covers
pots, switches and inductors.

`OFF_BOARD` is load-bearing and must not have a default. A part absent from it
silently becomes an on-board part demanding a footprint, so a test asserts every
non-passive component in the reference is named by it explicitly.

### Nets that cross between boards are `BLOCK_200MIL<n>`

Five nets cross module boundaries, and they are not parts, so they need a real
terminal block. `BLOCK_200MIL<n>` is the fork's "Terminal Block (200 mil)" — 5.08mm
pitch, 1 to 255 pins. A block can be screwed down over the pads, or a wire soldered
straight into one of them.

| Net | Boards that touch it |
| --- | --- |
| `hi_boost_out` | hi-boost, hi-cut, low-cut, mid |
| `lo_boost_in` | hi-cut, low-boost |
| `out` | low-boost, low-cut |
| `in` | hi-boost, mid |
| `0` (ground) | low-boost, mid electrically; every board physically |

The three global ports — `in`, `out`, `0` — are already among these five.

**One block per board, deliberately.** Grouping crossing nets into separate
interface connectors (`J_IN`, `J_OUT`, `J_GND`) is an ergonomic choice rather than
something that falls out of the net count, so it gets made rather than defaulted:
the largest block here is three pins, and splitting three pins into three one-pin
blocks costs more board area and more parts for less clarity. A board with eight
crossing nets would deserve the question again; none has more than three.

### Chassis ground on every board

Only `low-boost` and `mid` touch net `0` electrically — the cut sections return
through their pots. But every board has panel-mounted controls wired to it, and a
board with no ground landing gets an improvised wire soldered to it later. So every
board carries a ground pin on its terminal block.

On the three boards where ground is not in the signal topology, this is a
**physical-only landing**: a pin on net `0` with no other member on that board. That
trips the `singleton-net` finding in `lib/model/connectivity.ts`, which reports any
net touched by exactly one terminal. It is not suppressed — it is *declared*,
through the same exemption path that already covers unused switch contacts, so a
genuine accidental singleton still reports. A physical-only net with no electrical
members is precisely a physicalization concept, which is why it has nowhere
sensible to live before this stage exists.

This makes all five boards `BLOCK_200MIL3`.

### Pin order for off-board parts is declared per component

`PIN_NUMBERS` is keyed by kind, and that cannot serve these switches: `t_3kHz` is
throw 1 on `SW_HI_BOOST` and throw 8 on `SW_MID`, so one kind-keyed map would have
to give the same name two numbers. The fork's `--pin-names` table has the same
problem from the other direction — it is keyed by *footprint*, and `SW_LO_CUT` and
`SW_HI_BOOST` are both `PADS7` with different throw names.

So each off-board component declares its own pad order explicitly: `common` first,
then throws in detent order; `ccw`, `wiper`, `cw` for a pot. That is a real fact
about the physical part — which lug is which — and belongs with the board circuit.
A test asserts each declared order is a permutation of that component's actual pins.

Passives keep the existing kind-keyed `PIN_NUMBERS` (`a`/`b` to 1/2).

## What each board carries

With every inductor off-board, the on-board population is passives only.

| Board | On-board | Off-board (`PADS<n>`) | Landing pads | Block |
| --- | --- | --- | --- | --- |
| low-cut | 7 C | RV 3, SW 7 | 10 | `BLOCK_200MIL3` |
| low-boost | 6 C, R2 | RV 3, SW 7 | 10 | `BLOCK_200MIL3` |
| hi-cut | 10 C, R1 | RV 3, SW 7 | 10 | `BLOCK_200MIL3` |
| hi-boost | 9 C, R3 | RV 3, RV 3, SW 7, 4 L × 2 | 21 | `BLOCK_200MIL3` |
| mid | 17 C, 3 R | RV 3, SW 12, SW 3, 5 L × 2 | 28 | `BLOCK_200MIL3` |

The mid is the large one: 20 on-board parts and 28 landing pads.

## Changes to existing code

### `lib/kicad/value-notation.ts` — formatters for three more cases

Found while writing the plan, by running `valueFor` against every component in
`partitionReference()`: it refuses **22 of them**. Every inductor, every
potentiometer and every switch throws on `UNFORMATTED_ELECTRICAL_KINDS`, and `R1`
throws because 430Ω is below the 1k floor the resistance formatter is proven over.
Off-board parts go through `valueFor` like any other, so this blocks every board,
not just the ones with inductors.

The three kinds are not one problem. An inductor and a potentiometer each carry a
real electrical quantity and need a formatter. A **switch does not**: `positions` and
`contacts` are topology, and KiCad's value field for a switch legitimately holds the
part identity, so a switch belongs on the existing mpn/symbol fallback rather than in
the refuse-set. With all three removed that set is empty, and an empty list kept for
future kinds is a vestigial pattern — it becomes a rule that maintains itself: if no
branch handled the component and its parameters carry a numeric quantity, refuse.

### `lib/kicad/import-string.ts` — two new families

It derives five of the fork's sixteen part types. These are needed now:

| KiCad footprint shape | Derives to | Needed for |
| --- | --- | --- |
| an explicitly supported film-capacitor geometry | `CAP_FILM<n>` or `CAP_FILM_WIDE<n>` | the Pultec's capacitors |
| `TerminalBlock_*_1x<n>_P<mm>mm*` | `BLOCK_200MIL<n>` or `BLOCK_100MIL<n>` by pitch | inter-board nets |

`PADS<n>` is not derived from a footprint name — it comes from the off-board
marking, so it belongs in the exporter. `declaredPinCount` already anticipates the
string.

**Film capacitors get a narrow whitelist, not a general rule.** Each existing family
derives *one free measurement* into *one VeroRoute parameter*: `C_Disc` pitch to
span, `CP_Radial` diameter to the nearest enumerated diameter. A film rule needs two
— pitch to span, and body width to a choice between `CAP_FILM` (one row) and
`CAP_FILM_WIDE` (three rows, `"+++1+2+++"`). The second is not a measurement, it is
a classification of body geometry, and deriving it from a width field would turn
dimensional similarity into assumed mechanical equivalence. So: derive the pitch,
recognize only body geometries listed explicitly, and refuse everything else with a
message naming what is supported. The list grows when a capacitor family is chosen
and measured.

`INDUCTOR<n>` is **not** part of this work. It is the family to add when inductors
move on-board, and adding it now would mean choosing `L_Axial_*` as the shape before
knowing whether the part is an axial choke, a pot core or a transformer winding.

### `lib/kicad/from-network.ts` — an off-board set

`toImportedNetlist` gains a set of off-board component ids. For a component in that
set it emits `PADS<n>` from the pin count and never calls `footprintFor`; for
everything else it behaves exactly as now.

### `reference/pultec/partition.ts` — `isBoardResident` becomes data

Today it is a kind rule: `kind !== "potentiometer" && kind !== "switch"`. It becomes
a lookup against the `OFF_BOARD` set, so inductors are expressible on either side
and a pot can move on-board later without touching the rule.

`boardNetwork()` is **deleted**. This document's first version said it "keeps its
ports — other tests read them"; that was wrong, and execution found it. The function
has no callers anywhere in the repository and no test exercises it, so nothing read
those ports at all. Its concept — the board-resident subset, plus a ports map naming
what leaves — is superseded twice over: physicalization keeps *every* module
component and marks residency instead of filtering, and the terminal block replaces
the ports map with a real part. Leaving it would be the vestigial pattern this
project deletes rather than stubs.

### `circuits/pultec/` — five physicalized board circuits

One per board. Each takes its module from `partitionReference()`, attaches
`part.footprint` to the on-board components from a table, appends the board's
terminal block and chassis-ground landing, and returns the `Network`. Plus
`DESIGNATORS`, the per-component pad orders, and the declared opens for
physical-only nets.

The reference stays the single source of topology. Re-typing 64 components by hand
and testing them against the reference would produce a test that can only catch
typos in the retyping — real work, no new evidence, and a second place for the
netlist to be wrong. `CLAUDE.md`'s "transcription is evidence" rule governs circuits
ported from outside this repository; these are not.

### A `create` verb — currently there is no way to make a new board

The CLI has `check`, `cuts`, `update`, `stripboard`, `edit`, `board-info`,
`netlist-sync`, `schematic-notice` and `veroroute`. All of them act on a `.vrt` that
already exists. The fork has `--import NETLIST -o BOARD`, which builds one, and
nothing in this repository calls it.

Five new boards need that verb. It takes a declaration, exports the netlist from the
declared circuit, runs `--import`, and writes the `.vrt` — refusing rather than
overwriting if one is already there, since the layout is the hand-authored artifact
and `update` is the way to change an existing one.

## Testing

- Every on-board component has a `part.footprint`; every off-board one is in
  `OFF_BOARD`. No defaults on either side.
- Each new footprint family derives the expected import string, and refuses names
  outside its shape with a message naming the shapes it does derive — matching how
  the existing five behave.
- Each declared pad order is a permutation of that component's pins.
- Each board's network exports to a netlist without throwing, and **after projecting
  physical-only components away**, its net membership matches `partitionReference()`
  for that module. The projection is what makes this assertable at all.
- Every inter-board net appears on exactly one terminal block pin on each board that
  touches it.
- Moving a component between on- and off-board changes its import string and nothing
  else — the property the build-time flexibility rests on.
- Every singleton net on a board is a declared physical-only landing, and every
  declared physical-only landing is a singleton. Neither direction alone is enough:
  the first lets a real accidental singleton be declared away, the second lets a
  declaration go stale.

### Whole-system reconstruction

`tests/reference/partition.test.ts:38` already recomposes the partition and asserts
`assertSameTopology(THREE_BAND_REFERENCE, recomposed)`. The same invariant extends
one stage further, through the same helper: physicalize all five boards, join
terminal-block pins that carry the same crossing net, project the physical-only
components away, and assert the reconstruction is the reference.

That is the strongest statement this design can make — **partitioning,
physicalization and interconnection do not change the Pultec circuit** — and it
catches errors no per-board comparison can, such as a crossing net landing on the
right pin count on every board while joining the wrong two boards.

## What this does not decide

- **No layouts.** Five `.vrt` files get created with no placement. Placing and
  routing them is bench work in the GUI.
- **No inductor part.** `values.md` specifies the nine electrically — values, ±20%,
  DCR — and says a catalogue part, a pot core or a transformer winding all qualify.
  They start off-board because that is the only claim justified without a part;
  moving them on-board is the residency change this design exists to make cheap.
- **No capacitor parts.** The film whitelist is empty until a family is measured, so
  no board exports until that is done. That is deliberate: an empty whitelist
  refuses loudly, where a general rule would quietly accept a guess.
- **R3 stays at 4K7.** `unresolved.md` item 2 disputes it — the documentation gives
  4K7 for the build with no inductors and nominally 470R for the inductive build,
  worth about 5 dB of maximum boost and half the Q. This is an inductive build.

  This deliberately gets **no board-status mechanism**. 4K7 and 470R are both
  quarter-watt axial parts: the same two pads, the same span. The disputed value
  cannot invalidate a layout, so "layoutable" and "electrically resolved" are never
  distinct states for it, and a status ladder would be machinery for a distinction
  that does not exist here. Where it needs to surface is the bench — the BOM and the
  `cuts` report — not a gate on work it cannot affect.
- **No schematic.** These boards declare no `sch`/`netlist` pair, so each gets the
  `schematic-notice` warning on every run rather than a freshness guard. That is the
  honest outcome: the Pultec's KiCad source is the as-built single board in another
  repository, not these five modules.

## Non-goals

- Automatic placement or routing.
- On-board pot or switch footprints, and `INDUCTOR<n>`. The architecture admits all
  three; this does not build them.
- Changing the electrical model. Every value, every connection and every open
  question comes across as it stands.
