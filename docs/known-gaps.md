Known gaps
==========

**A gap that is not in this file does not exist as far as this project is
concerned.** An agent that finds a defect it is not fixing records it HERE, in
the same change that found it, and commits it. A note in a plan ledger does not
count: `.superpowers/` is gitignored, so a ledger entry is invisible to review,
absent from the repository's history, and destroyed by `git clean -fdx`. This
file exists because that happened - findings accumulated in scratch across two
plans and were reported to the owner in conversation and nowhere else.

**This is a register, not a plan.** An entry states what is wrong, where, how it
was established, and what would settle it. It does not promise a milestone. An
entry leaves when it is fixed or when the owner rules it is not a defect, and in
either case it is DELETED rather than marked closed - supersede means delete.

Each entry carries:

- **Found** - the plan or change that surfaced it;
- **Evidence** - what was actually read or run, so a reader can re-establish it
  rather than trust it;
- **Verified** - whether the person writing the entry confirmed it themselves,
  or is relaying another agent's report;
- **Why it is open** - the reason it was not fixed when found;
- **What would settle it** - a fix, a measurement, or an owner decision.

---

Open: an owner decision is what settles these
---------------------------------------------

### G1 - the guide has two representations of a panel control and reconciles neither

`tools/guide/off-board.ts` represents a panel pot as a header PART with PIN
lines: its module comment says *"every pin of every connector part... and of
every panel pot's HEADER"*, and `potFunction` derives edge labels like
`"DRIVE ccw"` / `"DRIVE wiper"` from the circuit model. A pad-based control has
no PART line and no PIN line, so it takes the pad path added for G-fixed-1 and
gets its `<ref>.<pin>` identity rather than a functional label.

Both representations now exist and nothing chooses between them.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** `tools/guide/off-board.ts` module comment and `potFunction` at
  `:28`; the pad path in `tools/guide/pads.ts`.
- **Verified** yes - the controller read both.
- **Why it is open** reconciling them moves edge labels, the checklist's
  junction rows and `valueLabel` together, and **whether a pad should carry a
  circuit-derived functional label is an acceptance criterion** - which the
  agent producing the artifact may not author.
- **What would settle it** the owner says which label a pad's wire should carry
  in the guide: its terminal identity (`RV_LO_BOOST.1`), a functional label
  (`LO BOOST ccw`), or both.
- **One thing already tilts the cost**, found by the Task 2 reviewer and worth
  knowing before the decision is made: a PART's label comes from the caller
  (`renderLayout` takes a `labels` map, and its module comment says so), but a
  PAD's label is derived inside the renderer from `pad.identity`. So all three
  packet images necessarily print the same pad text, and choosing the functional
  label would mean editing the renderer rather than the caller - the opposite
  side of the interface from where this module puts every other label. It does
  not foreclose the choice: the pad path keeps `ref` and `pin` as separate
  fields, so a functional label stays computable.

### G2 - pad labels crowd the row they sit in

Ten pad identities on the frozen low-boost render are legible but tight beside
the cut crosses in the same row.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the implementer rendered the frozen low-boost and read the PNG.
- **Verified** yes, 2026-10-16, Task 3 - confirmed by eye on a MATERIALISED
  low-boost rather than on the frozen one, by a second agent. Each pad
  identity is individually readable beside its own target ring and is tight in
  its row; two of them (`SW_LO_BOOST.7` on row I, `SW_LO_BOOST.3` on row M) are
  printed over a dark every-fourth-row alignment strip, which reads as a
  strikethrough. Usable, not comfortable.
- **Why it is open** how a drawing should look is the owner's call on a render,
  by this repository's own acceptance rule.
- **What would settle it** the owner looks at a low-boost render and says
  whether it needs shortening. **See also G17**, which is the same question
  asked of PART labels and reaches the renderer from the other side.

---

Open: a fix would settle these
------------------------------

### G12 - nothing brings a base board's footprint spans to the candidate's lead spans, so `--materialize` refuses

`--materialize` takes the component SET from a base `.vrt` and solves each
part's facing against THAT board's footprint. The footprint carries whatever
span it was last at; the candidate declares its own lead separation. Nothing in
the pipeline reconciles them, so the first materialisation of a Pultec board
refuses on its first capacitor:

> `--materialize: no turn of "C18"'s footprint puts its leads in the holes the`
> `document declares ( 1@7,3 2@10,3 ). The footprint on this board is 3x3`
> `unturned, and this verb never stretches one … Stretch the part on the board`
> `this verb starts from.`

**C18 is the first instance and not the only one.** On `rcm s0`, five of the
**FIFTEEN** two-lead parts need a LONGER span than the base is at, seven need a
SHORTER one, and three already agree. **Every separation the candidate asks for
is inside the model's own recorded range for that footprint**, so this is not a
candidate bending a lead further than the part allows - it is two records of one
part's span that nobody keeps in step.

**THE COUNT WAS WRONG UNTIL 2026-10-16 and the table is now inline**, because
the one load-bearing scoping claim for the fix was uncheckable from this
register. It read *"seventeen two-lead parts"*, which conflated the board's 17
PARTS with its two-lead parts; the Task 1 reviewer caught it by counting the
`.vrt`. The board holds **15 two-lead parts + 2 SIP headers = 17 parts, plus 10
pads = 27 placements**, which is the figure the evidence line below cites. The
controller carried the wrong number into the implementation plan as well, and
corrected it there in the same change.

| ref | candidate wants | committed base is at | `--import` base is at |
| --- | --- | --- | --- |
| C18 | 3 | 2 | 2 |
| C19 | 3 | 2 | 2 |
| C20 | 3 | 2 | 2 |
| C21 | 3 | 2 | 2 |
| C22 | 2 | 2 | 2 |
| C23 | 1 | 2 | 2 |
| R2 | 1 | 2 | 4 |
| SI_HI_BOOST_RV_HI_BOOST.ccw-wiper | 1 | 4 | 4 |
| SI_HI_BOOST_RV_HI_BOOST.wiper-cw | 2 | 4 | 4 |
| SI_HI_CUT_C26 | 3 | 2 | 2 |
| SI_HI_CUT_R1 | 1 | 4 | 4 |
| SI_HI_CUT_RV_HI_CUT.ccw-wiper | 3 | 4 | 4 |
| SI_HI_CUT_RV_HI_CUT.wiper-cw | 4 | 4 | 4 |
| SI_LOW_CUT_RV_LO_CUT.ccw-wiper | 2 | 4 | 4 |
| SI_MID_R_MID_SHUNT | 4 | 4 | 4 |

Separation in holes; `LEAD_SPANS` records both film-cap footprints at
`minSpanHoles 2 … maxSpanHoles 4` and the axial resistor at `2 … 16`, and a
separation of `n` holes is `n + 1` span holes.

**The two SIP headers are NOT in that table and the span step will still run
over them.** `junction_grounds` and `junction_signals` are `Conn_01x05`, COMP
type `SIP`, with nets assigned - exactly the type whose `Stretch` reallocates
pins (constraint 1). **They are safe for a reason that must be stated rather
than assumed:** `LEAD_SPANS` records the 1x05 header as RIGID at 5 holes
(`lib/kicad/lead-span.ts:317-322`), which is the length the SIP constructor
already builds it at (`Component.h:120-126`), so the required length equals the
current one and no stretch is attempted.

- **Found** `2026-10-16-pultec-five-boards`, Task 3, on the first real
  materialisation.
- **Evidence** the refusal above, from `materialize` at
  `tools/stripboard/vero-export.ts:442`; the full span accounting over all 27
  placements, against both the committed `.vrt` and an `--import` board.
- **Verified** yes - run, not relayed.
- **Why it is open** Task 3 was a discovery run forbidden from fixing what it
  found, and WHERE this step belongs - the exporter, a new preparation verb, or
  the fork - is a design question.
- **What would settle it** a step that sets each base part's span from the
  candidate before `--materialize` runs, with a perturbation proving it fires.
- **WHERE THE STEP BELONGS IS SETTLED, 2026-10-16.** It belongs inside
  `--materialize`'s own turn search, and **not** in a preparation pass: the
  turn search reads the component's current footprint through
  `PinOffsets(comp, offsets)` at
  `.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp:91`, inside the
  `for ( char direction : kDirections )` loop at `:87-118`, and the component is
  FLOATING at that moment - see the narrowing recorded under G13.
  `--materialize` already does the same gesture for wires: `PlaceDeclaredWire`
  (`Headless_materialize_place.cpp:388-437`) derives a span from the document,
  takes the component off, stretches it to that span with a named refusal when
  it stops short, and puts it down.
- **SIX CONSTRAINTS ON THE FIX**, established by reading the fork rather than
  by running it:
  1. `Component::CanStretch` (`Component.h:578-592`) returns
     `!GetHasAssignedPins()` for `SIP`, `DIP`, `STRIP_100`, `BLOCK_100`,
     `BLOCK_200` and the three switch types, and `Component::Stretch`
     (`:594-611`) calls `AllocatePins(...)` for exactly those - which resets
     `m_nodeIdPins` to `BAD_NODEID` (`:298-309`), and `PutDown` writes each
     hole's net from `comp.GetNodeId(pinIndex)`
     (`Board_components.cpp:516-523`). **Stretching a moulded pin field is
     therefore SILENT NET LOSS, not a refusal.**

     **The rule is NOT "refuse any moulded part".** Worded that way - as it was
     until 2026-10-16 - an implementation refuses low-boost on
     `junction_grounds`, which needs no change at all. The rule is: **derive
     the required length, compare it with the current one, and refuse only when
     they DIFFER for a type whose `Stretch` reallocates pins.** Every part in
     the span table above is in `Stretch`'s `default:` branch and reallocates
     nothing; the two parts that are not in that table are the SIP headers,
     whose required length already equals their current one.
  2. `FootPrint::CanStretch` (`FootPrint.h:55-93`) bounds the length by
     `CompTypes::GetMinLength`/`GetMaxLength`, and `FootPrint::Stretch`
     (`:104-106`) **asserts** `CanStretch`. A required length outside the type's
     range must refuse by name rather than assert-fail or spin.
  3. `AdoptCurrentSpanAsDeclared` (`Component.h:330-348`) is deliberately not
     called by `Stretch` - *"a bend is exactly the case where the declared span
     must stay put"* - so a materialise-time stretch must leave
     `m_declaredSpanCols` alone, which calling `Stretch` gets for free.
  4. `Stretch` acts on the UNTURNED `GetCols()` while the turn search reads
     `GetCompCols()` = `GetCols( GetDirection() )` (`Component.h:484-485`), so
     the required length is derived PER TURN.
  5. Three places in the fork assert that this verb never stretches and go
     stale in the same change: `Headless_materialize.h:98-101`,
     `Headless_materialize_place.cpp:129-133`, and
     `Headless_materialize_apply.cpp:306-310` - the last of which hands the
     caller *"Stretch the part on the board this verb starts from"* as a remedy
     that would then be wrong.
  6. **THE TURN LOOP CARRIES ITS MUTATION, and a stretch written naively inside
     it puts down a wrongly-lengthed footprint.** `SolvePlacement` keeps
     iterating all four facings AFTER the first fit, in order to detect two
     turns occupying different rectangles (`place.cpp:87-118`, `:138-145`), and
     records `bestRow`/`bestCol`/`bestDirection` from the FIRST fit only
     (`:117`). It mutates the component in the loop (`comp.SetDirection`,
     `:88`), and `PlaceTarget` restores only the DIRECTION afterwards (`:161`).
     So a stretch added inside that loop leaves the footprint at whatever length
     the LAST facing tried needed, not the length the CHOSEN facing needs, and
     `PutDown` (`:183`) places that. **It is not silent** - PHASE 7's grid read
     (`apply.cpp:284-312`) catches it as a named refusal - but it fails
     confusingly. The solve must return the required length alongside the turn,
     or the winning length must be re-applied before `PutDown`.

     Found by the Task 1 REVIEWER, not by the task: the five constraints above
     were all read off the stretch machinery, and this one lives in the loop
     that calls it.
- **A witness exists.** `tests/stripboard/materialize-span.test.ts` materialises
  low-boost on `rcm s0` against the committed board and asserts this refusal.
  **It PASSES while this gap is open and goes red when the gap closes, at which
  point it is DELETED rather than inverted** - its own comment says so.

### G13 - `--stretch` cannot change a part's span on a packed board

**Read the narrowing at the end of this entry before relying on it.** As first
written this entry claimed the span step needs an ordering; that claim is true of
`--stretch` and false of `--materialize`.

`--stretch` takes the part off, changes it, and refuses when it cannot put it
back. Both boards a materialisation could start from are packed, so the gesture
G12 needs cannot be run in place:

- on the owner's committed hand layout, **six of the seven placed parts refuse
  `--stretch` in both directions**;
- on a board built fresh by `--import`, every SHRINK succeeds and **every GROW
  refuses** - `--import` packs the parts shoulder to shoulder in rows 0-2.

Standing the step in by hand required `--move`ing all seventeen two-lead parts
onto rows of their own, in two column bands, before any span could be set.
`--move` has its own two refusals that bear on this: a destination that is not
free, and a destination outside the board's `GRID` (the `--import` board is
`GRID 35 35`, which will not take seventeen parts strung down one column).

- **Found** `2026-10-16-pultec-five-boards`, Task 3, while probing past G12.
- **Evidence** the fork's `--stretch` and `--move` refusals, both quoted in
  full in that task's report; the probe that got through by spreading first.
- **Verified** yes - run, not relayed.
- **Why it is open** it is the constraint on G12's fix rather than a defect of
  its own, and naming it was the point.
- **What would settle it** G12's step, written so the ordering is part of it.
- **NARROWED, 2026-10-16, by reading the fork.** This entry is true of
  `--stretch` and **is not true of `--materialize`**, so it does not constrain
  G12's fix the way the sentence above expected. `MaterializeLayout`'s PHASE 2
  calls `board.FloatAllComps()` at
  `.tools/veroroute-perfboard/Src/Headless_materialize_apply.cpp:369` -
  `Board::FloatAllComps` (`Board_components.cpp:781-784`) is `TakeOff` on every
  component in the manager - and `WipeCopper` on the line after it. By the time
  the turn search runs in PHASE 4, **every part is already off the board and the
  copper carries no nets**, and `PlaceTarget`
  (`Headless_materialize_place.cpp:154-190`) performs the single `Board::PutDown`
  of the run at the hole the document declares. There is no "put it back", which
  is the gesture this entry is about. A span set inside the turn search therefore
  needs no spread-first ordering.
  - **What survives of it:** `PlaceTarget`'s `PutDown` (`place.cpp:183`) can
    still refuse a longer footprint that overlaps a hole an earlier target
    claimed. That is a NAMED refusal with nothing written and nothing left
    floating - not this entry's silent float - and the rectangle after a stretch
    is the one the document declares, which is the rectangle the model's own
    overlap checks were run over. Today's rectangle is whatever the base `.vrt`
    was left at, which the model has never checked anything against.
  - **The entry stays open** because `--stretch` and `--move` still behave
    exactly as recorded, and anything that reaches for them as the span step
    will still hit this. It is no longer a blocker on G12.

### G14 - a materialised board carries no net names, so the checklist cannot be built

`buildChecklist` names which nets each cut separates, and refuses when it
cannot:

> `the cut at C5 is on node 11, which the dump stores no net name for, so the`
> `checklist cannot say which nets that cut separates. Run `make update` so the`
> `layout's nets carry the circuit's names.`

The cause is upstream of the checklist: `--import` writes every `NODE` line as
`NAME -` (`tools/stripboard/seed-nets.ts` states this), a materialised board
inherits that, and it dumps `NET_NAMES 0`. The owner's hand-laid
`pultec-low-boost.perfboard.vrt` carries `NET_NAMES 14` with real names, which
is why the checklist has never hit this.

**It is not G10 and it fires first.** G10 is a junction table with no rows;
this stops the checklist being built at all, so **G10 cannot be verified on a
real board until this is settled**.

- **Found** `2026-10-16-pultec-five-boards`, Task 3, rendering the first
  materialised Pultec board.
- **Evidence** the refusal above; `NET_NAMES 0` and fourteen `NODE n NAME -`
  lines in the materialised dump, against `NET_NAMES 14` in the committed one.
- **Verified** yes - run.
- **Why it is open** Task 3 could not fix what it found, and whether the names
  should arrive through `--import`, through the layout document, or through an
  `--update` afterwards is a design question.
- **What would settle it** net names surviving onto a materialised board, with
  a test that reads them back off a dump.

### G16 - `boards/pultec-low-boost` declares no schematic, so `make guide` cannot run on it

`writeGuidePacket` refuses a declaration with no `sch`
(`tools/guide/packet.ts:117-123`): *"declares no \"sch\", so the packet has no
schematic to print."* `boards/pultec-low-boost/perfboard.json` declares
`circuit`, `export` and `vrt` and nothing else, so the packet step of the
workflow is unreachable on this board however good the layout is.

- **Found** `2026-10-16-pultec-five-boards`, Task 3.
- **Evidence** the declaration file and the throw in `packet.ts`.
- **Verified** yes by READING both, NOT by running `writeGuidePacket` - that
  function writes into `boards/<board>/guide/`, which Task 3 was forbidden to
  do. The renders Task 3 produced came from calling `renderLayout` directly.
- **Why it is open** out of a discovery run's scope, and all five Pultec
  sections are likely in the same state.
- **What would settle it** a schematic for the section and an `sch`/`netlist`
  pair in the declaration - or a ruling that these boards do not get packets.

### G17 - a part label longer than the board runs off the drawing

On the first materialised low-boost render, three stand-in part labels leave
the board outline: `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` off the left edge,
`SI_MID_R_MID_SHUNT` and `SI_LOW_CUT_RV_LO_CUT.ccw-wiper` off the right. Others
cross each other, and two pad labels are printed on top of a dark
every-fourth-row alignment strip, which reads as a strikethrough.

**This is adjacent to G2 and is a different text.** G2 is about PAD identities
crowding their row; these are PART labels, which reach the renderer through
`renderLayout`'s `labels` map from the caller. A stand-in's id is long because
it names the section it stands in for, so the length is a property of the
model rather than of the drawing.

- **Found** `2026-10-16-pultec-five-boards`, Task 3.
- **Evidence** the implementer rendered the materialised low-boost at
  `rsvg-convert -z 3` and read the PNG.
- **Verified** yes.
- **Why it is open** how a drawing should look is the owner's call on a render,
  by this repository's own acceptance rule - the same reason G2 is open.
- **What would settle it** the owner looks at the render and says whether a
  label that leaves the board is acceptable, needs shortening, or needs the
  renderer to place it differently.

### G15 - the frozen low-boost fixture and the physical model hold different parts

`tests/fixtures/stripboard/pultec-low-boost-frozen.*` carries
`board_terminals`, a 3-way Phoenix terminal block, and `candidateFromDump`
refuses it:

> `vero-import-no-geometry: "board_terminals" (BLOCK_200MIL3) is fitted with`
> `"TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal",`
> `whose pad geometry the model cannot derive …`
> `stripboard-geometry-unrecorded-pattern: … is not in the pin-pattern map`
> `handed to geometryOf …`

The missing pin pattern is the visible half. The half that matters more is that
`sectionBoard("low-boost")` carries `junction_grounds` and `junction_signals` -
two 5-pin headers - and no `board_terminals` at all. **The fixture and the
model are two different boards**, and recording a pattern for the terminal
block would make the fixture importable without making the two agree.

- **Found** `2026-10-16-pultec-five-boards`, Task 3. The REFUSAL was relayed to
  that task from an earlier agent; the divergence behind it was not.
- **Evidence** the refusal above, run against the unedited fixture; the
  component lists of the fixture and of `sectionBoard("low-boost")`.
- **Verified** yes - run, not relayed.
- **Why it is open** a frozen fixture is a benchmark and **nobody updates one
  to today's model** (`stripboard/rules.json` says so outright, under
  `stockCols`), so this is a decision about what the benchmark now measures
  rather than a file to edit.
- **What would settle it** the owner, or the plan, says whether the frozen
  low-boost still benchmarks the circuit the model now describes. Until then
  nothing should read a `board_terminals` refusal as a missing pin pattern.

### G3 - a ceramic disc capacitor has no shape, and pt2399-core carries one

`bodyFor` in `tools/guide/part-shapes.ts` has no `CAP_CERAMIC` branch, so
rendering a board carrying one refuses with `no drawing for VeroRoute part type
"CAP_CERAMIC"`. The refusal is loud and names its own fix site, which is why
this is a gap and not a trap.

- **Found** `2026-10-16-pultec-five-boards`, while closing a review finding on
  Task 1 - neither the implementer nor the reviewer went looking for it.
- **Evidence** `bodyFor` enumerates `RESISTOR\d*`, `CAP_ELECTRO_(\d+)`,
  `SIP(\d+)`, `BLOCK_(?:100|200)MIL(\d+)`, `TO92`, `TRIM_FLAT` and the film
  types, and nothing else; `CAP_CERAMIC` appears bare in
  `tests/fixtures/pt2399-core-board.dump` and
  `tests/fixtures/stripboard/pt2399-core.dump`.
- **Verified** yes.
- **Why it is open** out of the Pultec program's scope - no Pultec dump carries
  a ceramic.
- **What would settle it** a `CAP_CERAMIC\d*` branch with a test, and a render
  of pt2399-core read by eye.

### G10 - the printed checklist has no row for a pad, so its junction table is empty

`buildChecklist` builds every part row from `dump.parts`, and a pad has no
`PART` line. On a pad-based control the packet therefore shows ten rings with
ten checkboxes in the LAYOUT IMAGE while the **"Wire-to-board junctions" table
is empty** - two artifacts in one packet disagreeing about whether ten
terminals exist.

This is adjacent to G1 but not the same gap: G1 asks WHICH LABEL a pad carries,
this is a MISSING ROW. Answering G1 either way leaves the table empty.

- **Found** `2026-10-16-pultec-five-boards`, raised by the Task 2 reviewer for
  the controller rather than as a defect in Task 2.
- **Evidence** `tools/guide/checklist.ts:200-209` iterates `dump.parts` and
  nothing else; `grep -n 'pad\|Pad' tools/guide/checklist.ts` finds only one
  unrelated comment line.
- **Verified** yes - the controller read the function rather than relaying the
  reviewer's claim.
- **Why it is open** Task 2's scope was a pad's shape and identity, and the
  checklist was explicitly placed out of its bounds so the fix would not ride
  along unreviewed.
- **What would settle it** junction rows built from the pads as well as the
  parts, with a test that counts rows against the board's pad count. **Note it
  is not independent of G1**: a junction row has to say what the wire carries,
  which is the label G1 decides.
- **BLOCKED behind G14, found 2026-10-16 in Task 3.** This was still unverified
  on a real board at the end of Task 3, and not for want of trying:
  `buildChecklist` refuses a materialised board outright, for a different
  reason, before any junction row is built. G14 has to be settled before this
  one can even be observed.

### G4 - nothing refuses a board carrying both a header PART and pads for one control

With two valid representations of a panel control in play (see G1), a board that
carries both for the same control is a contradiction no guard detects.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the Task 2 implementer reports no such guard exists.
- **Verified** NO - relayed, not independently confirmed.
- **Why it is open** Task 2's scope was a pad's shape and identity.
- **What would settle it** a refusal naming the control and both
  representations, with a perturbation proving it fires. Note it is downstream
  of G1: if the owner rules one representation out, this guard enforces that
  ruling.

### G5 - `assertLayoutMatchesCircuit` has never run against a Pultec board

A pads-only control has no PART line, and this check has only ever been
exercised on the transistor-preamp boards.

**OBSERVED, 2026-10-16, Task 3.** It did not resolve itself. On the first
materialised low-boost it refuses:

> `the layout and the circuit do not hold the same parts, so a build packet`
> `would be wrong:`
> `  in the circuit but not on the board: RV_LO_BOOST, SW_LO_BOOST`
> `Bring the .vrt in step with the circuit's netlist (`make update`), place any`
> `new parts in VeroRoute (`make edit`), save, then run this again.`

Both refs ARE on the board, as ten `PAD` lines; `onBoard` is built from
`dump.parts` alone (`tools/guide/circuit.ts:61`). **The remedy the message
gives is wrong for this cause** - nothing is missing, so `make update` and
`make edit` will not help - and a refusal that names the wrong fix is worse
than one that names none.

- **Found** `2026-10-16-pultec-five-boards`, Task 2; observed in Task 3.
- **Evidence** the refusal above, run against a materialised
  `pultec-low-boost`; `tools/guide/circuit.ts:60-72`.
- **Verified** yes - run in Task 3, no longer relayed.
- **Why it is open** Task 3 was forbidden from fixing what it found.
- **What would settle it** `onBoard` built from the `PAD` lines as well as the
  `PART` lines, the remedy text corrected for this cause, and a perturbation
  proving the check still fires on a genuinely absent part.

### G11 - a pad's hole is checked against the grid only when something draws it

The guide refuses a pad whose hole is outside the dump's `GRID`
(`guide-pad-off-board`, added in Task 2's fix round). Nothing else does. The
IMPORT path reads `dump.grid` only to build the candidate's grid
(`tools/stripboard/vero-import.ts:408`) and never tests a pad hole against it;
the export path writes the `GRID` line and bound-checks nothing.

**The nuance matters, and the first report of this was wider than the truth.**
The CONSTRUCTION path does keep pads on the board - `onBoard`
(`lib/stripboard/seed-place.ts:135`) is a workspace containment check applied
while a seed is built, and `seed-homes.ts:32` documents the board edge as a
constraint the placer respects. So a pad the search places cannot be off the
board. The gap is that the import path does not VERIFY what the construction
path guarantees, which matters for a dump that came from somewhere else: a
hand-edited file, an older build, or a board a person moved parts around in.

Consequence: such a pad surfaces when someone draws a guide, rather than when
the board is imported or exported.

- **Found** `2026-10-16-pultec-five-boards`, Task 2 fix round, raised by the
  implementer as being wider than its remit.
- **Evidence** `grep -n 'rows\|cols\|bounds\|GRID'` over
  `tools/stripboard/vero-import.ts` and `vero-export.ts` finds only the two
  construction/emission lines above; `onBoard` at
  `lib/stripboard/seed-place.ts:135` is the construction-side check.
- **Verified** yes - the controller read both paths, and NARROWED the claim from
  what was reported.
- **Why it is open** Task 2's remit was the guide. Where this check belongs is a
  design question: the importer, the exporter, the model's own rule set, or more
  than one.
- **What would settle it** a decision on which layer owns hole containment for
  an imported board, then the guard with a perturbation.
- **THE EVIDENCE THIS ASKED FOR, 2026-10-16, Task 3.** A real low-boost was
  materialised and re-imported. **All ten pads came back inside the grid**, so
  the gap is NOT reachable through the construction-to-materialisation path -
  which is what the narrowed claim above predicted, since `onBoard` keeps a
  placed pad on the board. It says nothing about a dump that came from
  somewhere else, which is the case the entry is actually about, and it does
  not close the entry.

### G6 - `tests/stripboard/model/seed-room.test.ts` is 760 lines

Against this repository's 300-500 line ceiling.

- **Found** `2026-10-14-stripboard-model-and-search`.
- **Evidence** `wc -l`.
- **Verified** yes.
- **Why it is open** splitting a test file of this size is its own change with
  its own review, and it was never the task in front of anyone.
- **What would settle it** a split by what each group of tests establishes, not
  by line count.

---

Open: comment and documentation defects, behaviour-free
-------------------------------------------------------

Both of these were parked under a skill rule that allows one fix wave per plan.
Neither changes behaviour; both mislead a reader.

### G7 - `lib/stripboard/seed-fit.ts` mislabels its own denominator

The comment reads *"of 634 intermediate wire-span holes, FIVE are inside one"*.
634 is ALL wire-span holes with endpoints included; the intermediate count is
470 (634 - 2x82 wires). The two figures the paragraph presents as disjoint
overlap by 164.

**The FIVE is unaffected** - endpoints contribute zero, which the paragraph's own
274/0 line independently establishes - so the conclusion stands.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** correct the denominator to 470, or say "wire-span
  holes" and drop "intermediate".

### G8 - the pad test states its limit only partially

`tests/stripboard/model/seed-off-board.test.ts` says `routedUnderRigid` rejects
all three columns. True, and it does not claim the stronger thing - but it never
says `rigidOverlap` closes them identically and that nothing outside
`chooseColumn` can separate the two. That limit is written down in commit
`b9fe02f` and a fix report, but not in the file a reader meets the test in.

By this repository's own standard - two earlier fixes exist precisely to move a
measured limit to where a reader meets it - one line belongs in the test.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** one line in the test's comment.

---

Open: blocked on something else
-------------------------------

### G9 - nine `pt2399-core` BOM lines are unchosen, and the lead span is blocked

One line was chosen deliberately (the 0.1uF disc capacitor, commit `05e62e0`).
Nine remain. Separately, a recorded lead span cannot be completed because **the
catalog schema has no lead-diameter or lead-length field** - so the span cannot
be stated without inventing a geometry, which `lib/kicad/lead-span.ts` refuses
by design.

- **Found** `2026-10-16-pultec-five-boards` and its predecessor.
- **Verified** yes for the schema gap.
- **Why it is open** the schema gap is a real blocker, not a deferral: the
  honest options are to extend the schema with evidence per field, or to leave
  the span unrecorded and let the refusal stand.
- **What would settle it** an owner decision on extending the catalog schema,
  then `part-researcher` on the nine lines.
