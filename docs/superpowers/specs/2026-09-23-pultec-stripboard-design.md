---
title: Putting the Pultec sections on stripboard
date: 2026-09-23
status: approved-design
---

# Putting the Pultec sections on stripboard

## Problem

`reference/pultec/` models a passive three-band Pultec EQ and `partition.ts` already
splits it into five per-section modules. The perfboard workflow
(`boards/`, `tools/perfboard/`, the forked VeroRoute) can check a hand-authored
stripboard layout against a circuit, and one board — `pt2399-core` — uses it.

Nothing connects the two. The Pultec model was built to be simulated: no component
carries a `part.footprint`, so `toImportedNetlist` refuses at the first capacitor,
and the layout-facing vocabulary the boards need does not exist in
`lib/kicad/import-string.ts`. This document covers what has to be built so the five
sections can be laid out and checked.

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
| Inductor placement | Per section: the mid's 2H and 1H off-board, the other seven on-board |
| Wire landing pitch | 5.08mm, so a screw terminal block stays fittable |
| On-board pots | Not laid out yet; pots are off-board landings for now |
| Rotary selectors | Permanently off-board — panel-mount parts with shafts do not mount on stripboard |

The inductor and pot decisions are both *build-time* choices the operator wants to
keep open. The architecture below makes them one-line edits rather than
re-transcriptions.

## Architecture

### Off-board parts are `PADS<n>`, and their pads are the wire landings

The fork already has the mechanism. From `TemplateManager::GetImportStrCut`:

```cpp
if ( importStrCut == "PADS" ) { bOffBoard = true; importStrCut = "SIP"; }
```

A `PADS<n>` is built as a `SIP<n>` and then `BreakComponentIntoPads` splits it into
*n independently placeable pads*. `Reconcile.cpp` synthesizes the board-side type
back as `PADS<n>` so `--check` compares it against what the netlist declared.

So the pots, the selectors and the two off-board inductors **stay in the board
network** and are marked off-board. They emit as `PADS<n>`, and their pads *are* the
landings the panel wiring arrives at. There are no separate connector components
standing in for them, and the net membership `--check` verifies is the real one —
the pot's own three lugs, not a header pretending to be them.

This replaces what `boardNetwork()` does today. It currently *deletes* pots and
switches and re-exposes their nets as ports; under this design it keeps them and
flips a marker instead.

An off-board part needs **no footprint**: `PADS<n>` takes only its pin count. That is
why deferring the on-board pot footprint costs nothing today.

### Moving a part on- or off-board

One membership change in a single `OFF_BOARD` set, plus a footprint if the part is
moving on-board, then `make update` reconciles the layout. The same rule covers
pots, switches and inductors — one mechanism, not three.

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
| `0` (ground) | low-boost, mid |

The three global ports — `in`, `out`, `0` — are already among these five.

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

| Board | On-board | Off-board (`PADS<n>`) | Terminal block |
| --- | --- | --- | --- |
| low-cut | 7 C | RV_LO_CUT 3, SW_LO_CUT 7 | `BLOCK_200MIL2` |
| low-boost | 6 C, R2 | RV_LO_BOOST 3, SW_LO_BOOST 7 | `BLOCK_200MIL3` |
| hi-cut | 10 C, R1 | RV_HI_CUT 3, SW_HI_CUT 7 | `BLOCK_200MIL2` |
| hi-boost | 9 C, R3, 4 L | RV_HI_BOOST 3, RV_HI_Q 3, SW_HI_BOOST 7 | `BLOCK_200MIL2` |
| mid | 17 C, 3 R, 3 L | RV_MID 3, SW_MID 12, SW_MID_MODE 3, L_MID_2H 2, L_MID_1H 2 | `BLOCK_200MIL3` |

The mid is the large one: 23 on-board parts and 22 landing pads.

## Changes to existing code

### `lib/kicad/import-string.ts` — four new families

It derives five of the fork's sixteen part types. These are missing and needed:

| KiCad footprint shape | Derives to | Needed for |
| --- | --- | --- |
| `L_Axial_*_P<mm>mm*` | `INDUCTOR<n>`, n = pitch in grid steps | the seven on-board inductors |
| `C_Rect_L*_W<mm>mm_P<mm>mm` | `CAP_FILM<n>` or `CAP_FILM_WIDE<n>` | the Pultec's film capacitors |
| `TerminalBlock_*_1x<n>_P<mm>mm*` | `BLOCK_200MIL<n>` or `BLOCK_100MIL<n>` by pitch | inter-board nets |
| — | `PADS<n>` | emitted for off-board parts, not derived from a name |

`CAP_FILM` is a one-row part; `CAP_FILM_WIDE` straddles three strips
(`rows = 3, cols = 3`, `"+++1+2+++"`). The `_W<mm>mm` field decides which: a body
wider than one 2.54mm strip pitch is `CAP_FILM_WIDE`, and a body wider than three
strips is refused rather than guessed at. Existing families use `C_Disc` for
ceramics and `CP_Radial` for electrolytics; the Pultec's 1n–330n values are film, so
none of the existing three fit.

`PADS<n>` is not a footprint derivation — it comes from the off-board marking, so it
belongs in the exporter, not here. `declaredPinCount` already anticipates the string.

Pitch tolerance is unchanged at 0.15mm, which means a `P5.00mm` KiCad terminal block
derives to 2 grid steps (5.08mm) as intended — the 0.08mm error is inside the band.

### `lib/kicad/from-network.ts` — an off-board set

`toImportedNetlist` gains a set of off-board component ids. For a component in that
set it emits `PADS<n>` from the pin count and never calls `footprintFor`; for
everything else it behaves exactly as now.

### `reference/pultec/partition.ts` — `isBoardResident` becomes data

Today it is a kind rule: `kind !== "potentiometer" && kind !== "switch"`. It becomes
a lookup against the `OFF_BOARD` set, so the two off-board inductors are expressible
and a pot can move on-board later without touching the rule.

`boardNetwork()` keeps its ports — other tests read them — but the boards no longer
derive their landings from ports.

### `circuits/pultec/` — five new modules

One per board, each a thin decorator over `partitionReference()`: it takes that
module's components, attaches `part.footprint` to the on-board ones from a table,
appends the board's `BLOCK_200MIL<n>`, and returns the `Network`. Plus
`DESIGNATORS` and the per-component pad orders.

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
- Each board's network exports to a netlist without throwing, and the exported net
  membership matches `partitionReference()` for that module.
- Every inter-board net appears on exactly one terminal block pin on each board that
  touches it.
- Moving a component between on- and off-board changes its import string and nothing
  else — the property the build-time flexibility rests on.

These are model-level tests. `make check` additionally compares a layout against the
circuit, but only once a layout exists.

## What this does not decide

- **No layouts.** Five `.vrt` files get created and are empty of placement. Placing
  and routing them is bench work in the GUI.
- **No inductor part.** `values.md` specifies the nine inductors electrically —
  values, ±20%, DCR — and says a catalogue part, a pot core or a transformer winding
  all qualify. The seven on-board ones need a real part before their footprint is
  anything but a placeholder, and which side of the on/off-board line each falls on
  may change once a part is in hand. The design makes that change cheap; it does not
  make it.
- **No capacitor parts.** Same: the film footprints need real body dimensions.
- **R3 stays at 4K7.** `unresolved.md` item 2 disputes it — the documentation gives
  4K7 for the build with no inductors and nominally 470R for the inductive build,
  worth about 5 dB of maximum boost and half the Q. This is an inductive build. One
  resistor, and it reaches copper unresolved unless it is settled first.
- **No schematic.** These boards declare no `sch`/`netlist` pair, so each gets the
  `schematic-notice` warning on every run rather than a freshness guard. That is the
  honest outcome: the Pultec's KiCad source is the as-built single board in another
  repository, not these five modules.
- **Ground reaches only two boards.** Only `low-boost` and `mid` touch net `0`; the
  cut sections return through their pots. That is what the model says. Whether a
  build wants a chassis or shield ground on the other three is a question the model
  cannot answer.

## Non-goals

- Automatic placement or routing.
- On-board pot or switch footprints. The architecture admits them; this does not
  build them.
- Changing the electrical model. Every value, every connection and every open
  question comes across as it stands.
