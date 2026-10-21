Gate 8's M1 half: the reference-graph comparison
================================================

Task 18 of the M1 schematic-authoring plan, 2026-10-21.

**WHAT GATE 8 IS.** From `$SCHGEN_SOURCE/gates/oscar/compare.ts`, read in the
`digital-pedal-platform` tree:

> *"Gate 8: a carried-over subcircuit equals OSCAR's once the declared
> CORE-BRIEF deltas are applied to OSCAR's graph. **An undeclared difference
> fails by construction.**"*

A generated schematic's netlist is compared against a hand-arranged one a human
made and trusts, by component value, library id and pin-level adjacency rather
than by designator or net name, with a list of permitted electrical changes that
has to be declared in advance. **You cannot accidentally change a circuit and
pass, because passing requires having stated beforehand what you meant to
change.** It is `CLAUDE.md`'s acceptance-criteria invariant applied to a
netlist.

**M1's HALF IS THE CASE WHERE THAT LIST IS EMPTY.** A circuit rendered from its
own model should differ from the human drawing by nothing at all, so the delta
list needs no generator to write it (spec §2, revision 4;
[`../known-gaps.md`](../known-gaps.md) **G104**).

**WHAT IT CATCHES THAT THE ROUND TRIP CANNOT.** The round trip proves a
generated schematic matches **the netlist it was generated from** - self
consistency. **A generator that mangles a circuit the same way at both ends
passes a round trip happily.** This proves it matches **a drawing a human made
and trusts.** Different failures; neither substitutes for the other, and the
round trip must never be reported as this check.

THE HEADLINE, AND IT IS NOT A GOOD ONE: THE GATE HAS NEVER RUN AGAINST A GENERATED DRAWING
-------------------------------------------------------------------------------------------

**The gate is built, driven, and wired into `runGates`, and the generated side
of the comparison does not exist for either reference.** `generate` refuses both
of this repository's hand-arranged drawings at **gate 1**, before any block
reaches a layout backend - 115 `validateCircuit` problems for `pt2399-core` and
101 for `transistor-preamp`, measured in **G238**. So no design here declares
`oscar`, and the comparison is exercised by
`tests/schgen/gates/reference-graph.kicad.test.ts` and by nothing else.

This is **the fourth instance in this plan of machinery built and not
exercised**, and it belongs to the pattern **G226** already records rather than
being discovered again. That entry's ask is met here and in **G240**: the
precondition that would wire it is named, and so is what its absence costs.

**WHAT WAS NOT DONE INSTEAD, and why it would have been worse.** Running the
empty-delta check against the ported `mini` fixture would have produced a green
gate 8 row. `mini` has no hand-arranged schematic a human trusts, so that row
would have checked self-consistency - the round trip, wearing gate 8's name.
Controller ruling R50 forbids it and the gate's own module comment says so.

What the two references are, and what the comparison measured on them
--------------------------------------------------------------------

Both drawings are hand-arranged, known good, and neither is partitioned, carries
a stand-in, or gets a junction header - so the empty delta is correct for them
rather than convenient.

| | `pt2399-core` | `transistor-preamp` lab-board |
| --- | --- | --- |
| drawing | `circuits/pt2399-core/pt2399-core.kicad_sch` | `circuits/transistor-preamp/lab-board.kicad_sch` |
| committed netlist | `tests/fixtures/pt2399-core.net` | `tests/fixtures/transistor-preamp-lab.net` |
| graph nodes (components) | **24** | **32** |
| graph adjacency (pin-to-pin pairs) | **117** | **150** |
| distinct `<value>\|<libId>` | **14** | **18** |
| permitted delta | **empty** | **empty** |
| undeclared differences, live export against the committed netlist | **none** | **none** |
| undeclared differences, GENERATED against the drawing | **not measurable: nothing generates** | **not measurable: nothing generates** |

Every figure in that table is asserted in
`tests/schgen/gates/reference-graph.kicad.test.ts`, which builds the graphs from
a real `kicad-cli sch export netlist --format kicadsexpr` on every run and
**fails rather than skips when `kicad-cli` is absent**.

**THE ONE RESULT THE LAST-BUT-ONE ROW IS, STATED PRECISELY.** It compares
`kicad-cli`'s export of the committed drawing, produced now, against the netlist
committed in `tests/fixtures/`, produced weeks earlier. That is a derived
artifact regenerated every run and compared by content, which `CLAUDE.md`
requires, and it means the figures above can be re-derived without `kicad-cli`.
**It is not gate 8**, because neither side came out of the generator.

One thing the gate's own signature had to be fixed for
-----------------------------------------------------

**A GATE ROW NAMES THE DRAWING IT CHECKED AGAINST (spec §2.1), AND AN
`ImportedNetlist` CARRIES NO RECORD OF WHERE IT CAME FROM.** So the reference's
file travels with it. It first travelled as a loose fifth `referenceFile: string`
parameter beside the manifest citation, and **a swap of those two was
undetectable** - both checks were blankness checks, which a swap passes. The
consequence of a swap is a provenance error inside a provenance gate: the row
would name the wrong file as the drawing it checked against **while reporting a
pass.**

Controller ruling **R53** closed it with a type rather than with care: the file
now travels inside `ReferenceNetlist`, so the swap is unrepresentable.
`[RAN]` the project's own `tsc --noEmit`, against a probe file written into the
tree so the project tsconfig applies and counting only errors that name the
probe - baseline **0** errors; correct order **ACCEPTED, 0 errors**; reference
and manifest swapped **REJECTED**, `error TS2345: Argument of type 'string' is
not assignable to parameter of type 'ReferenceNetlist'`; a bare file string
where the reference goes **REJECTED**, same error. The first version of that
probe invoked `tsc` on the single file, which ignores the tsconfig and reported
unrelated errors for all three cases - it could not discriminate, and is
recorded here because a probe whose control also fails proves nothing.

What the comparison does
------------------------

`graphFromNetlist` (`lib/schgen/gates/reference-graph.ts`) reduces a netlist to
nodes carrying a canonical value and a library id, and to the unordered pin
pairs of every net. **The net name is dropped** - each net becomes the pairs on
it - and **the designator survives only as a join key** naming the two ends of a
pair. `lib/schgen/gates/graph-match.ts` then compares, in order:

1. the multiset of `<value>|<libId>` - which names an added, removed or
   re-valued component;
2. the number of pin-to-pin connections;
3. the multiset of connections, each named by what its two pins belong to rather
   than by designator - which names a rewiring;
4. a backtracking bijection over nodes grouped by
   `<value>|<libId>|<connected pins>`, which is what catches a difference the
   first three cannot see. Two rings of three resistors against one ring of six
   agree on all of 1 to 3 and are not the same circuit.

The search's budget is bounded and **exhausting it is reported as a problem -
never as a pass.** A check that could not finish must not resemble one that
agreed.

Where a permitted delta comes from
----------------------------------

`lib/schgen/gates/declared-delta.ts`, and the review sentence that shaped it:

> *"waiting until generated schematics exist to enumerate their differences
> creates precisely the provenance risk gate 8 is supposed to prevent: a
> generator defect could be retrospectively classified as an intended change."*

- `DeclaredDelta.from` names the TRANSFORMATION that produces the delta and has
  no default. `parseDeclaredDeltas` refuses a blank one.
- The declaration must be **committed**: the parser refuses a file git has no
  `HEAD` copy of, and refuses a declaration whose text is not the committed
  text.
- **There is no code path from a graph to a delta.** The module does not import
  `reference-graph.ts` and never names `ReferenceGraph` or `graphFromNetlist` in
  its code; `checkReferenceGraph` receives an already-constructed
  `PermittedDelta` and builds none.
- **A difference found by looking at output is a DEFECT REPORT until some
  declared transformation accounts for it** - never a new list entry.

What this check does NOT cover
------------------------------

- **It says nothing about readability.** It is netlist-level: a schematic that
  passes it can be correct and unreadable. §3.3's measures and §3.5's finding
  contract are where legibility lives, and neither is an acceptance result
  either (see [`m1-remeasurement.md`](m1-remeasurement.md)).
- **It has no Pultec section to run on**, because M1 produces none. The Pultec's
  transformation manifest is M2's, derived from `circuits/pultec/partition.ts`'s
  declared transformations - *the removal of the other sections, the stand-ins,
  the junction connections* - and **never from a generated drawing.**
- **Applying a declared delta is M2's.** A `declared` permitted delta reaches
  `checkReferenceGraph` and comes back as an undeclared difference naming that,
  rather than being compared anyway: a comparison that ignored the declared
  entries would be a pass that means nothing.
- **It models no pin symmetry, which makes it stricter and not laxer.** Upstream
  treats an allow-listed non-polarised two-pin symbol's pads as interchangeable;
  here pins match by number, so a capacitor wired the other way round from the
  reference is a difference. **G242** records that and what porting the
  allow-list would need.
- **It compares the libsource PART name, not a full `Library:Part` id.**
  `importNetlist` exposes `libsource`'s `part` and not its `lib`, so two symbols
  with one part name in different libraries would compare equal. **G242** records
  it.

How to re-run everything here
-----------------------------

```
bun test tests/schgen/gates/reference-graph.kicad.test.ts   THE FIGURES ABOVE
bun test tests/schgen/gates/reference-graph.test.ts         THE COMPARISON
bun test tests/schgen/gates/declared-delta.test.ts          THE PROVENANCE RULE
bun tools/schgen/gate-census.ts                             WHY NOTHING GENERATES
```
