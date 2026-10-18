The packet shows the clusters
=============================

**Status** awaiting owner review. **Settles** most of `docs/known-gaps.md` G45.

The owner, 2026-10-18, preparing to build low-boost and low-cut:

> *"It would be very useful to see what parts of the circuit are the various
> scaffolding clusters so I can decide whether to populate them or not when I'm
> building them to be paired or not with other modules—e.g. build low boost in
> isolation or low boost to be connected to a low cut board"*

What this is NOT
----------------

**It is not a request to work out which parts belong to which cluster. That is
already done and already correct.** `boards/pultec-low-boost/wiring.md` carries
a table per group with every part, its fitted value and the two nets it sits
between, and a **What to populate, by build** table covering all 31
combinations with a **Carried elsewhere** column. His own example is two rows
of it, and **the two boards' sheets were cross-checked against each other for
that pair and agree in both directions** - low-boost says hi-boost, hi-cut and
mid are carried on low-cut; low-cut says it carries them; the three crossing
junction pins match.

**The defect is placement, not content: none of it is in the document he will
have at the bench.** `make guide` is what `make help` advertises under *"Build
it on the bench"*, and its packet does not say which parts are scaffolding,
which cluster each belongs to, what to populate for a given build, or that
`wiring.md` exists. That is G45.

The design
----------

Four changes, three of them to the packet and one to the data the packet is
given.

**1. The guide loads the board's `ScaffoldDoc`, following `powerUpChecks`
exactly.**

Each Pultec board module already exports `SCAFFOLD = scaffoldDoc("<section>")`
(`circuits/pultec/physical/low-boost.ts:63` and its four siblings), and
`lib/board/wiring.ts:78` already consumes it as `scaffold?: ScaffoldDoc`.
`BoardCircuit` (`tools/guide/circuit.ts:27-30`) gains it the same way it
carries `powerUpChecks`:

```ts
export interface BoardCircuit extends PerfboardBoardCircuit {
  readonly powerUpChecks: PowerUpChecks | undefined
  /** The module's stand-in groups and per-build population; `undefined` when it declares none. */
  readonly scaffold: ScaffoldDoc | undefined
}
```

`undefined` is a legitimate state, not a gap: `pt2399-core` and the
transistor-preamp boards are not sections of a larger circuit and export no
`SCAFFOLD`. **It is not defaulted to an empty doc** - an empty `ScaffoldDoc`
would read as a board with no groups to populate, which is a different claim,
and `asScaffoldDoc` refuses one anyway. A board with no scaffold gets the
explicit notice in change 4, exactly as a board with no power-up checks already
gets one.

**2. A fourth layout image: the clusters view.**

The packet draws three images today (designators, values, mirrored copper). A
fourth shows the same board with **every stand-in part filled with its group's
hatch, every own-circuit part left plain**, and a legend naming each group, the
absent section it stands in for, and its part count.

**Hatching rather than tint or colour, and a legend rather than per-part text.**
Two reasons, both load-bearing:

- **It must survive a black-and-white print and a photocopy.** Distinct
  diagonal, vertical, horizontal and cross hatches stay distinct where four
  grey tints do not.
- **No new per-part string goes on any image.** G2 records that pad labels
  already crowd the row they sit in and G17 that a long part label runs off the
  board outline. Adding a third string per part would feed both. The clusters
  view adds no text inside the board at all.

On `pultec-low-boost` the four groups are hi-boost (2 parts), hi-cut (4),
low-cut (1) and mid (1), and they sit in the top band of the board while the
board's own parts sit below - so the view will read as a band. **That is a
property of this board, not a guarantee**, and the design deliberately does not
rely on a group being spatially contiguous: the hatch is per part.

**Cost, stated because it interacts with a ruling he has already made.** A
fourth image is a fourth page, so the packet goes from seven pages to eight. He
declined fixing the two near-empty pages (G48, *"I don't care about the sparse
pdfs. leave that alone"*) - which is a declination about page COUNT, not a
blanket acceptance of more pages, so the cost is named here rather than assumed
to be covered by it.

**3. The checklist says, per row, which cluster a part is in.**

`buildChecklist`'s part sections gain a column. Its values are `own circuit`
for a part in the board's own circuit, and the group's section name for a
stand-in - `hi-boost`, `hi-cut`, `low-cut`, `mid`.

**A column, not a re-ordering.** The checklist's order is the operator's order
of operations - ICs and transistors, resistors, capacitors, wire links,
junctions, bridges, cuts - and that order is the file's stated purpose
(`tools/guide/checklist.ts:1-13`). Grouping the rows by cluster instead would
fight it, and he ticks parts off in build order.

**4. A "Stand-in groups" section in the checklist, and page one names
`wiring.md`.**

After the part sections, the packet carries:

- **one block per group**, naming the absent section, its part count, and its
  part ids, so a group can be ticked whole. The rule travels with it, in the
  wiring sheet's own words: *"Populate a group whole, or leave it empty"* and
  *"One group, one board"*;
- **the whole by-build table**, not only one row. He may change what is on the
  bench while building, and a packet carrying one build's row would be wrong
  rather than incomplete the moment he does;
- for a board with no `ScaffoldDoc`, **one sentence saying this board holds no
  stand-in groups and is populated the same way in every build** - the
  `NO_FOOTPRINT` / `NO_SPAN` precedent (`tools/guide/checklist.ts:152-170`),
  where a gap says which gap it is rather than leaving a blank;
- page one's provenance block, which today names `perfboard.json` and the
  circuit module, **also names the board's `wiring.md`** as a document the
  packet does not replace.

Testing
-------

- `pultec-low-boost`'s checklist marks exactly 8 parts as stand-ins across 4
  groups and the rest as `own circuit`, asserted against `SCAFFOLD` rather than
  against a hardcoded list, on the real board.
- The premise is asserted before the counts that depend on it, per
  `tests/guide/junction-pad-rows.test.ts:50-53`: a board whose scaffold silently
  arrived `undefined` must not pass by having zero of everything.
- The clusters image contains one hatch definition per group and no text inside
  the board outline.
- The by-build section carries all 31 rows for a five-section board.
- A board with no `SCAFFOLD` (`pt2399-core`) produces a packet with the explicit
  no-groups sentence, and its checklist gains the column with every row reading
  `own circuit`.
- Both low boards' packets are regenerated and **read as PDFs**, not only
  asserted - `CLAUDE.md`: *"Look at the output, not only the tests."*
- The five committed `.vrt` files and five `wiring.md` files stay
  byte-unchanged.

Out of scope, with reasons
--------------------------

- **No per-section schematic.** That is G16 and the owner's separate decision;
  the legible generator is specced at
  `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`
  (`tools/schgen/`) and is designed, not built. This spec does not touch it.
- **The 0 Ω rows are not fixed here.** G55: the guide lists them as resistors to
  stand on end where the wiring sheet calls them wire links, and the owner has
  established the cost is credibility rather than a wrong purchase. It needs the
  layout-level answer that his *"Leave the approved boards alone"* ruling
  currently blocks, so it is not smuggled into this change.
- **No board is re-laid out.** `.vrt` files byte-unchanged.
- **G2 and G17 are not addressed.** Label crowding and labels leaving the
  outline are judged on a render; this change adds no in-board text, so it
  neither fixes nor worsens them.

Decisions
---------

| What | Who | Why |
| --- | --- | --- |
| Surface the clusters in the packet rather than generate new data | owner, 2026-10-18 | *"It would be very useful to see what parts of the circuit are the various scaffolding clusters"* - the data exists and is correct |
| Do this before the schematic work | owner, 2026-10-18 | *"your recommendation"*, accepting: spec the packet now because it changes what he holds at the bench, plan `schgen` next rather than hand him a grid he would have to redraw |
| A dedicated clusters image, not markings on the existing ones | **owner - NEEDS HIS RULING** | keeps all new information off the designators and values images, so G2 and G17 are not fed; costs a page |
| Hatch patterns, not colour or tint | **owner - NEEDS HIS RULING** | survives a black-and-white print and a photocopy |
| A cluster column in the checklist, order unchanged | **owner - NEEDS HIS RULING** | the checklist's order is the operator's order of operations and he ticks parts off in it |
| The packet carries all 31 build rows, not one | this spec | a single-build row becomes wrong, not merely incomplete, the moment the bench changes |
| `scaffold` is optional and never defaulted to empty | `CLAUDE.md` | an empty doc asserts "no groups to populate", which is a different claim from "this board declares none" |
| The packet names `wiring.md` rather than absorbing it | this spec, for review | G45 names both options - print the conditionality, or have page one name the sheet you must hold. This does both, since the conditionality is small and the sheet carries much more |
