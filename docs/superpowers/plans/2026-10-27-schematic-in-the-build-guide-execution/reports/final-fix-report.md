# Final whole-branch review: fix report

One dispatch, all findings from the whole-branch review, before the scoped re-review. Covers
Finding 1 (Important), Finding 2 (Important), Finding 3 (not blocking) and the four small
"ALSO FIX" items.

## Finding 1 - board-geometry.ts published a crossing figure measures.ts would refuse to publish

**Mechanism chosen: a variant of (b).** `tools/schgen/board-geometry.ts` no longer takes `crossings`
from `wireGeometry` (`lib/schgen/render/fan-geometry.ts`, raw/uncanonicalised). It now calls
`canonicalTopology` and `crossings` directly from `lib/schgen/elk/junctions.ts` - the exact two
functions `lib/schgen/readability/measures.ts`'s `sheetMeasuresOf` calls internally on the same
inputs (`{ placements: [], wires: d.wires, anchors: [] }, []`). A refused canonical topology is
turned into a thrown refusal here, naming the ambiguous overlaps, exactly mirroring
`sheetMeasuresOf`'s own refusal wording.

**Why a variant of (b) rather than calling `sheetMeasuresOf` itself:** Finding 3 (below) needed the
canonicalised crossing POINTS, not just the summary measure, to attribute crossings to blocks.
Calling `sheetMeasuresOf` for the board total and then separately calling `canonicalTopology` again
for the per-block breakdown would canonicalise the same drawing twice - the "two checks for one
question" `CLAUDE.md` forbids. Calling `canonicalTopology`/`crossings` directly, once per drawing,
and handing the resulting points to both the board-level sum and the per-block attribution, avoids
that duplication while computing the identical number `sheetMeasuresOf` would (same two function
calls, same inputs). `segments` and `corners` are unchanged: still from `wireGeometry` over the raw
wire list, since `measures.ts` has no corner measure and segment count is unaffected by
canonicalisation's concern (duplicate crossings, not duplicate segments).

**Did the published numbers move?** No. Before and after, on every one of the 7 boards that
generate:

```
pt2399-core:                 crossings 54 -> 54
pultec-hi-boost:              crossings 12 -> 12
pultec-hi-cut:                crossings 10 -> 10
pultec-low-boost:             crossings 4 -> 4
pultec-low-cut:                crossings 8 -> 8
transistor-preamp-feedback:   crossings 4 -> 4
transistor-preamp-lab:        crossings 11 -> 11
totals:                        103 -> 103
```

`pultec-low-cut` (8/8) and `pultec-low-boost` (4/4) match the finding's own measurement, and the
whole-board totals (802 segments / 103 crossings / 494 corners / 34 fallbacks) are unchanged too.
The `Baseline` table in `docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide.md` already
carries these exact numbers, so it needed no edit.

## Finding 2 - the withheld notice asserted a sheet was drawn when schgen refused or drew nothing

`GuideSchematic`'s `"withheld"` variant (now in `tools/guide/schematic-notice.ts`, split out of
`tools/guide/guide.ts` - see below) gains a required `drawn: boolean` field. `tools/guide/
schematic-source.ts`'s three withheld-construction sites set it:

- `outcome === "refused"` -> `drawn: false` (nothing drawn before the refusal)
- `outcome === "generated"` with zero drawings -> `drawn: false` (nothing to examine)
- a drawn sheet carrying a fallback field placement -> `drawn: true` (a real sheet was drawn and is
  withheld for what is on it)

`withheldSchematicNotice` in `schematic-notice.ts` now reads `drawn` and prints one of two claims:

- `drawn: true`: "schgen generated one from this board's own declaration and it was withheld as not
  fit to build from."
- `drawn: false`: "schgen was offered this board's own declaration and produced no sheet to judge,
  so there is nothing drawn to withhold - see the reason below for why nothing was drawn."

Verified on the actual live case the finding names: `boards/pultec-mid` refuses at `validateCircuit`
on `SW_MID` pin 12 (`outcome === "refused"`). `make guide` in `boards/pultec-mid`, page one
rasterised at 150dpi and read with the Read tool: the "Schematic withheld" notice now reads *"schgen
was offered this board's own declaration and produced no sheet to judge, so there is nothing drawn
to withhold"* - it no longer claims a sheet was generated. See "Read the image" below for the full
description.

Tests added to `tests/guide/generated-schematic.test.ts`, one per notice branch:
`drawn: true` (existing test, now passes `drawn: true` explicitly and is unchanged in intent) and a
new `drawn: false` test asserting the page does NOT contain the "schgen generated one ... and it was
withheld" sentence and DOES contain "produced no sheet to judge". A second new test pins the
`drawn: true` wording the same way in the opposite direction.

## Finding 3 - per-block breakdown

`tools/schgen/board-geometry.ts` now carries a `blocks: readonly BlockGeometry[]` array per
generated board, alongside the unchanged per-board totals (the per-board row stays authoritative;
the breakdown is additional, not a replacement - a per-block table alone would let one bad block
hide behind clean ones).

**Attribution is possible from `SheetDrawing` alone**, via `Frame.blockId`/`Frame.box`:
`lib/schgen/render/frames.ts`'s `blockContent` builds a block's frame box as the union of its
bodies, wire ends and drawn text, and `layoutSheet` translates a block's own `BlockLayout.wires` by
the exact same offset used to place its frame - so every wire belonging to a block is geometrically
contained in that block's own (non-overlapping) frame box by construction. A wire is attributed to
the one frame containing BOTH its endpoints; a canonical crossing point is attributed to the one
frame containing it. Measured on the full corpus: `unattributed.wires` and
`unattributed.crossingPoints` are 0 on every board - confirmed by `renderBoardGeometry`'s own
"UNATTRIBUTED" line never firing in the tool's output below. Per-block `segments`/`corners` come
from running `wireGeometry` on each block's own wire bucket; per-block `crossings` come from
attributing the SAME canonical crossing points the board-level total was taken from (Finding 1), so
the per-block crossing figures sum to exactly the board's.

No invented attribution: a wire or point that cannot be assigned to exactly one block is counted in
`unattributed`, never guessed at or silently dropped (none occurred on this corpus).

## Also fixed (small items)

1. **`board-geometry.ts`'s "already names the board" claim was false.** Chose: catch the measurement
   of one board's drawings and rethrow with the board name prepended (`board ${r.board}: ...`),
   rather than just correcting the comment - this is a message fix, not a resilience one: a bad wire
   on board six still ends the run, but the thrown message now says which board to go look at. Module
   comment rewritten to describe this truthfully instead of the old (false) claim.
2. **`fan-geometry.ts`'s `netWires.get(w.net)!` non-null assertion removed.** Restructured to read
   the list once (`const list = netWires.get(w.net)`) and branch on `undefined` instead of asserting
   non-null after a separate `.has()` check.
3. **`tests/guide/generated-schematic.test.ts` tightened.** Test 3 ("none") now asserts
   `"No schematic in this packet"` (the heading, unique to that notice) instead of `"no schematic"`
   (which also appears inside the withheld notice's own sentence), and asserts
   `.not.toContain("Schematic withheld")`. Test 2 ("generated") now asserts
   `"generated by <code>schgen</code>"` and `"not hand-drawn"` - the line that is the only thing on
   the page distinguishing a generated sheet from a hand-drawn one, previously unchecked.
4. **`tests/schgen/fan-geometry.test.ts`'s diagonal test tightened.** The alternation
   `'(A|[^']+)'` asserted nothing about the net name (`[^']+` matches anything `A` would). Changed to
   assert the literal `'A'`.

## File extraction (300-500 line ceiling)

Finding 2's `drawn` field and its doc pushed `tools/guide/guide.ts` from 485 to 516 lines. Extracted
`GuideSchematic`, `header`, `generatedNote`, `noSchematicNotice` and `withheldSchematicNotice` into
a new `tools/guide/schematic-notice.ts` (194 lines) - the same split pattern Task 4 already used for
`tools/guide/schematic-source.ts` out of `tools/guide/packet.ts`. `guide.ts` re-exports
`GuideSchematic` so no importer elsewhere needed to change. Final line counts:

```
lib/schgen/render/fan-geometry.ts        176
tools/schgen/board-geometry.ts           347
tools/guide/guide.ts                     344
tools/guide/schematic-notice.ts          194
tools/guide/schematic-source.ts          202
tests/guide/generated-schematic.test.ts   90
tests/schgen/fan-geometry.test.ts         89
```

## Verification

`bun test tests/schgen/fan-geometry.test.ts tests/guide/generated-schematic.test.ts tests/guide/packet.test.ts tests/guide/clusters-packet.test.ts`:

```
bun test v1.3.8 (b64edcb4)

 33 pass
 0 fail
 100 expect() calls
Ran 33 tests across 4 files. [1439.00ms]
```

`bun run tools/schgen/board-geometry.ts` - full output (per-block breakdown included, no
UNATTRIBUTED lines anywhere, totals unchanged from pre-fix: 802 segments / 103 crossings / 494
corners / 34 fallbacks over 7 of 11 boards):

```
pt2399-core: generated (segments 153, crossings 54, corners 107, fallbacks 15)
    block pt-core: segments 153, crossings 54, corners 107
pultec-hi-boost: generated (segments 130, crossings 12, corners 79, fallbacks 8)
    block pultec-hi-boost-junction: segments 27, crossings 4, corners 17
    block pultec-hi-boost-own: segments 75, crossings 8, corners 47
    block pultec-hi-boost-standin-hi-cut: segments 20, crossings 0, corners 14
    block pultec-hi-boost-standin-low-boost: segments 4, crossings 0, corners 1
    block pultec-hi-boost-standin-low-cut: segments 2, crossings 0, corners 0
    block pultec-hi-boost-standin-mid: segments 2, crossings 0, corners 0
pultec-hi-cut: generated (segments 94, crossings 10, corners 50, fallbacks 2)
    block pultec-hi-cut-junction: segments 27, crossings 4, corners 17
    block pultec-hi-cut-own: segments 56, crossings 6, corners 32
    block pultec-hi-cut-standin-hi-boost: segments 3, crossings 0, corners 0
    block pultec-hi-cut-standin-low-boost: segments 4, crossings 0, corners 1
    block pultec-hi-cut-standin-low-cut: segments 2, crossings 0, corners 0
    block pultec-hi-cut-standin-mid: segments 2, crossings 0, corners 0
pultec-low-boost: generated (segments 111, crossings 4, corners 70, fallbacks 5)
    block pultec-low-boost-junction: segments 27, crossings 4, corners 17
    block pultec-low-boost-own: segments 57, crossings 0, corners 39
    block pultec-low-boost-standin-hi-boost: segments 3, crossings 0, corners 0
    block pultec-low-boost-standin-hi-cut: segments 20, crossings 0, corners 14
    block pultec-low-boost-standin-low-cut: segments 2, crossings 0, corners 0
    block pultec-low-boost-standin-mid: segments 2, crossings 0, corners 0
pultec-low-cut: generated (segments 103, crossings 8, corners 61, fallbacks 1)
    block pultec-low-cut-junction: segments 27, crossings 4, corners 17
    block pultec-low-cut-own: segments 47, crossings 4, corners 29
    block pultec-low-cut-standin-hi-boost: segments 3, crossings 0, corners 0
    block pultec-low-cut-standin-hi-cut: segments 20, crossings 0, corners 14
    block pultec-low-cut-standin-low-boost: segments 4, crossings 0, corners 1
    block pultec-low-cut-standin-mid: segments 2, crossings 0, corners 0
pultec-mid: refused
    circuit is invalid:
      - part SW_MID: pin 12 (12) is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts
transistor-preamp-buffered: refused
    block tp-stage: the ELK backend cannot realise its subgraph: block tp-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 1 at (34.29, 48.26) overlaps pin Q1.2 text [clearance: overlaps between value of power symbol VCC 1 at (34.29, 48.26) and pin Q1.2 text in block tp-stage]
transistor-preamp-feedback: generated (segments 79, crossings 4, corners 48, fallbacks 0)
    block tp-leg-base-ground: segments 10, crossings 0, corners 6
    block tp-leg-collector: segments 10, crossings 0, corners 6
    block tp-leg-emitter-bypass: segments 7, crossings 0, corners 4
    block tp-leg-feedback: segments 10, crossings 0, corners 6
    block tp-stage: segments 42, crossings 4, corners 26
transistor-preamp-lab: generated (segments 132, crossings 11, corners 79, fallbacks 3)
    block tp-leg-collector: segments 10, crossings 0, corners 6
    block tp-leg-emitter-bypass: segments 11, crossings 0, corners 6
    block tp-leg-feedback: segments 11, crossings 0, corners 6
    block tp-leg-lower-a: segments 11, crossings 0, corners 6
    block tp-leg-lower-b: segments 11, crossings 0, corners 6
    block tp-leg-upper: segments 11, crossings 0, corners 6
    block tp-stage: segments 67, crossings 11, corners 43
transistor-preamp-loop: refused
    block tp-stage: the ELK backend cannot realise its subgraph: block tp-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 1 at (34.29, 55.88) overlaps pin Q1.2 text [clearance: overlaps between value of power symbol VCC 1 at (34.29, 55.88) and pin Q1.2 text in block tp-stage]
transistor-preamp-staged: refused
    block tp-second-stage: the ELK backend cannot realise its subgraph: block tp-second-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 0 at (29.21, 8.89) overlaps label BUFFER_BASE at (29.21, 1.27); value of power symbol VCC 0 at (29.21, 8.89) overlaps wire 6 of tp-second-stage (DRIVE_WIPER) [clearance: overlaps between value of power symbol VCC 0 at (29.21, 8.89) and label BUFFER_BASE at (29.21, 1.27) in block tp-second-stage]

totals over 7 of 11 board(s) that generated: 802 segments, 103 crossings, 494 corners, 34 fallback field placement(s)
4 of 11 board(s) did not produce a sheet (refused or no authoring declaration)
```

`bun run typecheck`:

```
$ tsc --noEmit
```

(clean, no output)

`SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`:

```
3889 pass
0 fail
44103 expect() calls
Ran 3889 tests across 363 files. [163.06s]
[exited with code 0]
```

`3887 -> 3889`: +2, fully accounted for by the two new tests added to
`tests/guide/generated-schematic.test.ts` (one per `drawn` branch of the withheld notice, Finding 2).
No other test count changed; no failures.

`wc -l` on every file touched:

```
     176 lib/schgen/render/fan-geometry.ts
     347 tools/schgen/board-geometry.ts
     344 tools/guide/guide.ts
     194 tools/guide/schematic-notice.ts
     202 tools/guide/schematic-source.ts
      90 tests/guide/generated-schematic.test.ts
      89 tests/schgen/fan-geometry.test.ts
```

All within the 300-500 line ceiling (`guide.ts` dropped from 485/516 to 344 by the extraction).

## Rebuild `boards/pultec-mid`'s guide and read page one

`cd boards/pultec-mid && make guide` - succeeds, writes the packet, and prints on stdout:
*"pultec-mid's generated schematic was withheld, so this packet has no schematic page. guide.html
says so on page one: circuit is invalid: - part SW_MID: pin 12 (12) is neither on a net nor declared
not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts"*.

`pdftoppm -png -r 150 -f 1 -l 1 boards/pultec-mid/guide/guide.pdf /tmp/pultec-mid-guide`, then read
with the Read tool. Page one shows:

- Header: `pultec-mid - build guide`, `Generated 2026-10-27`, `Layout
  boards/pultec-mid/pultec-mid.perfboard.vrt`, `Schematic withheld - see "Schematic withheld"
  below`, `Wiring guide boards/pultec-mid/wiring.md - this packet does not replace it, read it
  alongside this one`.
- A bordered "Schematic withheld" notice reading, in bold: *"This packet prints no schematic for
  pultec-mid: schgen was offered this board's own declaration and produced no sheet to judge, so
  there is nothing drawn to withhold - see the reason below for why nothing was drawn."* - this is
  the corrected claim; before this fix it would have read *"schgen generated one from this board's
  own declaration and it was withheld as not fit to build from"*, which is false for a refusal.
- Below that: `Declared in boards/pultec-mid/perfboard.json. What these pages were checked against
  instead is the circuit model in circuits/pultec/physical/mid.ts: ...`, `Withheld because: circuit
  is invalid: - part SW_MID: pin 12 (12) is neither on a net nor declared not connected, nor a
  mechanical mount point in lib/schgen/ir/mechanical-pins.ts`, and `Reproduce this measurement with
  bun run tools/schgen/board-geometry.ts.`

No schematic page, no "generated by schgen / not hand-drawn" line (correctly absent, since
`schematic.kind` is `"withheld"` not `"generated"`), and the rest of the page (nothing visible below
the notice on page one - images start on later pages) is unaffected.

## Concerns / notes for the re-review

- The mechanism for Finding 1 deviates from literal "(b)" by calling `canonicalTopology`/`crossings`
  directly rather than `sheetMeasuresOf` itself, to avoid canonicalising twice per drawing. Worth the
  reviewer confirming this still reads as "taking crossings from measures.ts's own canonicalisation"
  and not as a parallel reimplementation - it calls the identical two exported functions, not new
  logic.
- `board-geometry.ts`'s per-board throw still aborts the whole census on the first bad board (now
  named); it does not continue measuring the remaining boards. That was an explicit choice (message
  fix, not resilience fix) per the finding's own phrasing of the two options.
- `unattributed` is 0 everywhere on this corpus, by the geometric proof in Finding 3 above, but the
  code path is real and will fire (rather than guess) if a future block's frame ever fails to contain
  its own wires.
