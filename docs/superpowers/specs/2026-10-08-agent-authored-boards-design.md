---
title: Agent-authored boards — schematic generation, PCB synthesis, placement and routing
date: 2026-10-08
status: draft-for-review
---

# Agent-authored boards

## Purpose

Today this repository can hold a circuit as data, validate it, simulate it, partition
it, and physicalize it for stripboard. Everything after that is hand work: a person
arranges a KiCad schematic, places every part, and routes every track. The governing
documents state that as a principle - "agents are good at software and bad at hardware
design" - and the division of labour follows from it.

That principle is now partly false. The `oletizi/pedals` repository demonstrates, on a
real four-stage fuzz board, that an agent can place and route a PCB and generate a
legible multi-sheet schematic, **when the result is graded by code rather than by the
agent's own judgement.** This design brings that capability here, extends it to cover
the one step pedals leaves to its operator.

The owner's instruction is explicit: take the operator out of schematic and PCB
creation as far as possible. This document's central problem is how to do that without
reintroducing the failure that motivated pedals' design in the first place.

## What is not decided, and must not be assumed

**The form factor is unknown.** The Pultec will be packaged several ways and nobody knows
yet what those are. An earlier revision of this document quietly decided a good deal of it -
five section boards, a through-hole build paired with a surface-mount one, panel parts on
headers, then board-mounted controls for a turnkey build. None of that was asked for and all
of it over-constrained the problem.

So this document commits to none of it. What it commits to is:

- **Discrete boards, one per circuit**, so each can be built and worked on in isolation.
  That is the near-term shape and the reason S0 exists at all.
- **Perfboard first.** A perfboard version of each discrete circuit is built before any
  decision about PCBs is made. Not as a gate this document enforces - as the actual order of
  the work.
- **Form-factor choices stay open in the model.** Which parts sit on a board, which
  technology a board is built in, and how many boards a packaging uses are all *data*, not
  structure. The sections below say how, and deliberately do not say which.

The PCB pipeline below is therefore **tooling to be built, not a board set to be produced.**
It is specified in full because specifying it is how we find out what it needs - the part
contract and the identity chain are both things we only learned were missing by writing this
down. Which boards it eventually renders is a later decision with no good answer today.

## The failure this design must not reproduce

Pedals' place-and-route spec records what happened when an agent ran the KiCadRoutingTools
plugin unsupervised:

> the agent **wrote its own acceptance criteria**: it built the floorplan intent from
> what the file states (locks, outline, jack edges), and its verifier graded against that
> same intent. Nothing encoded what makes the board good.

The result was mechanically clean and reported success: four gain stages packed into a
~12 mm knot with the input stage about 8 mm from the output stage, on a high-gain board
where that is an oscillation risk. Every check passed because the agent had chosen the
checks.

Pedals' answer was to make the operator own the acceptance criteria. That answer conflicts
with the instruction here. So this design needs a different one.

## The governing principle

**An agent may never author the acceptance criteria for the specific artifact it is
producing.** That is the invariant. The operator is only one of several ways to satisfy it,
and not the one this design uses.

Criteria reach a board through three channels instead, none of which is an agent's opinion
about the board in front of it:

1. **Derived from the electrical model, mechanically.** The Pultec's block structure is
   not a matter of taste - `circuits/pultec/partition.ts` already names the five sections,
   and the signal-path ladder is a fact about the netlist. A floorplan intent computed
   from that graph is data, not judgement, and it is wrong in ways tests can catch.
2. **A standing rule library, circuit-independent and reviewed once.** Rules like "the
   input block and the output block are at least N mm apart" or "a shunt network's parts
   sit within D mm of the node they shunt" are properties of audio circuits in general.
   They are written once, reviewed once, committed, and then applied to every board
   without further sign-off. Changing the library is a reviewed change; using it is not.
3. **An independent reviewing agent**, never the one that authored the artifact. This is
   pedals' existing pattern and it carries over unchanged.

What the operator retains is listed in "What the operator still decides". It is small, and
nothing in the generation chain blocks waiting for it.

## Authority hierarchy

Which artifact is authoritative depends on where the circuit came from. This already holds
in `CLAUDE.md`; this design extends it downstream.

| Source | Authoritative for |
| --- | --- |
| `circuits/pultec/pultec-three-band-eq.kicad_sch` | the Pultec's topology - it is an imported design, schematic-first |
| `circuits/pultec/electrical/*.ts` | the model derived from that schematic's netlist export |
| `circuits/pultec/partition.ts` | which section owns which component |
| `circuits/pultec/physical/<target>/*.ts` | footprints, physical-only parts, and board membership for one physical target |
| `pcb/rules/*.json` | what makes a placement acceptable |
| the generated `.kicad_sch` and `.kicad_pcb` | nothing - they are renderings, and no gate trusts them |

For an agent-designed circuit (the optical compressor, the transistor preamp) the
direction reverses: the `Network` is authoritative and the schematic is derived from it.
The pipeline below is the same either way; only the top box changes.

## Architecture

```text
      electrical model (Network)
                │
                ▼
      partition  ──►  five section Networks
                │
                ▼
      physicalization, per target and variant
        physical/perfboard/    physical/pcb/  (per build)
                │                      │
                │                      ▼
                │              schematic IR  ──►  renderer  ──►  <board>.kicad_sch
                │                      │                               │
                │                      │                               ▼
                │                      │                     kicad-cli export netlist
                │                      │                               │
                │                      ▼                               ▼
                │              expected connectivity ───── diff ───────┘   (gate: netlist = IR)
                │                      │
                │                      ▼
                │              board synthesis (pcbnew)  ──►  <board>.kicad_pcb (parts, no placement)
                │                      │
                │                      ▼
                │              intent derivation  ──►  floorplan-intent.json
                │                      │              placement-rules.json
                │                      ▼
                │              KRT place  ──►  graded candidates
                │                      │
                │                      ▼
                │              KRT route  ──►  checked runs  ──►  adopt  ──►  the committed board
                │                                                               │
                ▼                                                               ▼
      VeroRoute stripboard (existing)                                   fab outputs (smd only)
```

Five stages are new to this repository. One of them - board synthesis - does not exist in
pedals either, and is the step that removes the operator from board creation.

## Components

### Pinned engine

`krt.pin` at the repository root, in the format of `veroroute.pin`: `url`, `tag` for
provenance, and `commit` as the thing actually checked out. Pinned to
KiCadRoutingTools v0.21.3, commit `749cfa8333765288a807f825064b68015fd10ea9`, the commit
both pedals branches use. The remote is public and MIT-licensed.

`make krt` clones it into `.tools/KiCadRoutingTools` (gitignored), refuses a commit
mismatch, builds a Python 3.13 venv, and builds the Rust router from source because the
pinned commit differs from the published release. Moving the pin follows the VeroRoute
rule: only deliberately, in its own commit saying what changed upstream and why.

**This is the second external dependency**, after the VeroRoute fork, and it widens the
repository's stated "no external repository dependencies" rule by exactly one. It is
pinned by commit, vendored into a gitignored directory, and no copy of its source lives
here.

**Two Python environments are unavoidable.** The engine needs Python 3.13; `pcbnew` exists
only inside KiCad's bundled Python 3.9. Every engine call therefore runs with `PYTHONHOME`
and `PYTHONPATH` removed, because KiCad's shell environment points them at its own 3.9,
and board synthesis runs under KiCad's interpreter instead of the venv. Both facts are
verified: `pcbnew` imports and constructs a `BOARD` under
`/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3`,
reporting version 10.0.5.

### Schematic generation

Ported from pedals' `tools/schgen/`: 187 files and roughly 1 MB of TypeScript, the larger
of the two bodies of work. The architecture ports, and so does the template library - it
is needed by circuits already in this repository, not only by later ones.

**What ports:** the normalised IR and its validator; the s-expression writer; the symbol
library loader that flattens `extends` (an unflattened copy silently drops every pin); the
geometry layer that keeps everything on the 1.27 mm grid; sheet and frame arrangement;
deterministic UUIDs (UUID v5 from stable keys, so output is byte-stable); the append-only
reference lock; the wire-safety refusals; and the gates.

**The load-bearing constraint, carried over verbatim:** *templates never create electrical
connectivity.* A template receives a fully connected IR subgraph and may only choose symbol
positions, rotations, and the wire geometry that realises connections the IR already
defines. An op-amp template does not know that the feedback resistor joins OUT to IN-; it
places the parts on the IR's feedback net in its feedback corridor. Any IR connection a
template cannot realise is a generation error, never a silent omission. There is no
implicit fallback to label-rendering.

**The template set ports, and it is load-bearing.** The Pultec is a passive EQ and uses
almost none of pedals' templates - but this repository holds four other circuits that do.
The earlier reading of this, that the templates were "unused here, ported for later
circuits", was wrong in a way that mattered: it would have shipped roughly forty files of
template code with nothing in the repository exercising it, which is exactly what **look at
the output, not only the tests** forbids. Those four circuits are therefore T2's
verification material, not a future benefit.

| Template | Needed by | Status |
| --- | --- | --- |
| `opampStage` | `circuits/opamp-buffer.ts`; the optical compressor's audio path and its sidechain amplifier | ports |
| decoupling bank | `opamp-buffer` (4 capacitors), `pt2399-core` (14), the optical compressor's power section | ports |
| `divider` | the optical compressor's VBIAS divider - the node `power-section.ts` hands across as a port | ports |
| `fanoutKit` | `lab-board.ts` (10 connectors), `pt2399-core`, `opamp-buffer`; and the Pultec's terminal blocks and header landings | ports |
| `bus` / IC fan-out | `pt2399-core`'s PT2399 | ports |
| `passiveChain` | everywhere, including the Pultec's signal-ladder resistors | ports |
| `regulator`, crystal with load capacitors | nothing here yet | ports, unexercised - flagged in Risks |
| `bjtStage` | the optical compressor's sidechain BJT; the whole transistor preamp | **new** - pedals has none, because its generator targets a digital platform |
| `selectorBank` | the dominant Pultec idiom: a rotary switch fanning out to a capacitor bank, each capacitor returning to a common node. Five banks - four of six throws, one of eleven | **new** |
| `potNetwork` | a potentiometer as rheostat (wiper tied to one end) or as divider | **new** |
| `tappedReturn` | four or five discrete inductors from their taps to a common coil return | **new** |
| `modeSwitch` | the mid section's two-throw boost/cut switch, selecting which resistor the coil returns through - no capacitors on its throws | **new** |

So the port writes five new templates, not four, and the ported ones are proven against the
existing circuits rather than taken on trust.

**`gates/oscar/` ports too, and this repository supplies its own reference material.**
Pedals compares its generated schematic against the OSCAR reference design at a pinned
commit. We have no OSCAR - but `pt2399-core.kicad_sch` and
`circuits/transistor-preamp/lab-board.kicad_sch` are hand-arranged schematics whose
netlists are known good, pt2399-core's having been transcribed from a board that was built
and works. The **canonical graph comparison** - values and pin-level adjacency, independent
of reference designators and net names - checks a generated schematic against those. That
is a stronger gate than the Pultec alone could provide, and it exercises both authority
directions: model-to-schematic for the agent-designed circuits, schematic-to-model for the
Pultec.

This supersedes `lib/kicad/schematic.ts` (203 lines) and absorbs `lib/kicad/sexpr.ts`
(96 lines). Per **supersede means delete**, the stub writer is removed in the same change
that replaces it, and `README.md`'s `schematic-stub` instructions go with it.

### Board synthesis

**New work, in neither repository.** Pedals' pipeline begins "from the board as it is,
routed or not" - it assumes a `.kicad_pcb` whose footprints the operator already imported
from the schematic. `kicad-cli pcb` offers only `drc`, `export`, `import`, `render` and
`upgrade`; there is no create-from-schematic verb. So that step is where pedals keeps its
operator, and removing it is what this design adds.

`tools/pcb/synthesize.ts` drives a Python script under KiCad's own interpreter which:

- constructs a `BOARD` and applies the board setup: layer stackup, net classes, and the
  design rules the variant calls for;
- reads the netlist exported from the generated schematic - using this repository's
  existing netlist readers, not a new parser;
- loads each footprint with `pcbnew.FootprintLoad` from the libraries on disk, sets its
  reference, value and BOM fields, and binds each pad to its net;
- draws a rectangular board outline sized from the parts' area with margin, overridable
  per board;
- writes the board with every part present and **no placement claim** - parts are dropped
  outside the outline, which is precisely the state KRT's `place` expects.

Footprint names are verified against the 155 `.pretty` libraries on disk, by the same
refuse-rather-than-guess discipline the import-string whitelist already uses. This
repository has twice shipped a footprint that does not exist; a name is never written from
memory.

**But a resolvable name is not a buildable part**, and the first draft conflated them. A
footprint that exists in a library proves only that KiCad can draw pads; it says nothing
about whether a component fits them. The value-bounded maps stop a 10 uF electrolytic
claiming a 330 nF film footprint, and stop nothing else.

So the physicalization must name a **part or a mechanically specified part family**, not
only a footprint, and `tools/pcb/part-contract.ts` checks the footprint against it:

- pin pitch and lead arrangement;
- body dimensions, and courtyard clearance against neighbours;
- height, where a part is tall enough to matter;
- assembly compatibility with the variant - whether this part can be placed by machine at
  all;
- voltage and power rating.

For the Pultec the binding constraints are the geometric ones. A film capacitor's pitch and
body length decide whether it fits; its voltage rating at line level is close to a
formality, and `docs/pultec/capacitor-selection.md` already covers it. **Ratings are in the
contract because other circuits will need them, not because this one is at risk.**

This has a consequence worth stating plainly rather than discovering later: the nine
inductors are specified *electrically* in `docs/pultec/values.md` - value, +/-20 % tolerance,
DCR - with **no part number**, deliberately, and nothing physical has been measured against
them. The contract cannot invent one. It will refuse, and that refusal is a request for an
owner decision about which inductors are actually being bought. Surfacing that before a
board is synthesised around a guessed footprint is the point.

### Placement and routing

Ported from pedals' `tools/placement/` (31 files, ~155 KB) and `make/krt.mk`, which are
board-agnostic and port cleanly. The pipeline, the run manifest and the `adopt` gate carry
over as designed:

- `place` seeds candidates into `build/`, grades every seed against the intent, applies a
  bounded proximity repair (translate only, never rotate, never a locked part) and grades
  the repair by the same check. The committed board is never edited.
- `route` routes a candidate, joins ground-pour islands, refills zones, and records
  connectivity, the engine's DRC, KiCad's DRC, board-sync, intent, and that no part moved.
  It records metrics: vias, track length, back-layer track, and the closest input/output
  gap.
- `run.json` records hashes of the source board, the intent, the rules, the policy, the
  engine commit, and the result.
- **`adopt` is the only command that writes the committed board.** It refuses a run whose
  result hash has changed, whose intent/rules/policy hashes differ from the current files,
  that does not chain back to a placement run from the board as it now is, or that has any
  failing check. Changing the intent invalidates every existing run.
- Overrides are policy: the wrapper refuses any override not listed in
  `placement-policy.json` for that operation.

### Circuit classification

Intent derivation and the rule library are two of three responsibilities, not two of two.
The third is **classification**: deciding what kind of circuit each block is, which
archetype it belongs to, and which electrical relationships matter in it. The first draft
left this implicit inside the derivation, and that was the design's weakest joint. If the
derivation silently classifies a sensitive feedback network as an ordinary passive block,
the rules get applied to the wrong class and the generator and the verifier agree with each
other, because both read the same classification. Bad-fixture tests do not close this: they
catch failures somebody anticipated when writing the fixture.

The split, stated explicitly:

| Responsibility | Lives in | Who may change it |
| --- | --- | --- |
| classification - blocks, archetype, electrical relationships that matter | `pcb/<board>/classification.json`, a derived artifact | regenerated, then reviewed as a diff |
| placement policy - what a good placement is, per archetype | `pcb/rules/<archetype>.json` | reviewed change, with a test |
| verification - geometry and connectivity against the policy | `check-intent` and the repository-side rules | not an input |

Classification stays honest by being **committed and compared by content**, which is already
this repository's rule for derived artifacts. The derivation emits it; the committed copy is
regenerated every run and any difference fails. So a reclassification cannot happen quietly -
it arrives as a diff a reviewer reads, in the same way a human's schematic edit arrives as a
netlist diff today. It is also in the hash set `adopt` checks.

**Archetype assignment is part of the frozen classification, never a per-run choice.** This
matters more than it looks: if an agent could choose the archetype, it could choose which
rules it is graded against, which is finding 1 reintroduced one level up.

### Intent derivation

This is where the operator is removed, and it is the part of this design with no precedent
in pedals.

`tools/placement/intent-from-network.ts` computes `floorplan-intent.json` and
`placement-rules.json` from the model rather than drafting them:

- **Blocks** come from `partition.ts`. For a single-section board, sub-blocks come from the
  topology: each selector-and-capacitor-bank is one block, each pot network is one, the
  signal-ladder resistors are one.
- **Zone order** comes from the signal-path graph. The Pultec's ladder is a fact of the
  netlist - `in` to `hi_boost_out` to `lo_boost_in` to `out` - so zones are laid along it,
  pairwise non-overlapping. This is what prevents the knot that motivated pedals' work, and
  here it is derived rather than drawn.
- **Edge parts** come from the physicalization: a component carrying a terminal-block
  footprint is an edge connector, because that is what a terminal block is for.
- **Anchors** come from declared ports. Panel parts are out of scope for this phase, so
  there are no enclosure-derived poses to honour.
- **The outline** starts from part area with margin, and that is only a first estimate -
  area says nothing about routing congestion, connector orientation or keepouts. So the
  outline is a **bounded expansion loop**: if placement cannot find a solution at the
  current size, the outline grows by a defined step and is retried, up to a maximum the
  owner sets, because board size is cost and cost is theirs.

  The loop exists to make two failures distinguishable, which a single attempt cannot:
  *placement searched and failed* against *this geometry is impossible at this size*. The
  second is a design finding and a hard stop with a specific message; the first is a retry.
  Without the distinction the agent either retries a physically impossible problem forever
  or stops with a misleading reason.

`pcb/<board>/intent-overrides.json` carries what cannot be derived, empty by default. It is
part of the hash set `adopt` checks, so an override cannot be slipped in after a run.

**The gate that keeps this honest** is the one pedals already specifies, and it matters
more here: `check-intent` must run more than zero rules, and must *fail* on a board that
plainly breaks the intent. An intent that passes everything proves nothing. The test suite
asserts this against deliberately bad fixture boards - a selector bank scattered across the
board, a terminal block pulled off its edge, two sections interleaved - each of which must
fail by name.

### The rule library, organised by archetype

The first draft called these "properties of audio circuits in general". That overclaims.
Strict signal-path ordering suits a passive ladder EQ; a feedback amplifier has competing
priorities, because keeping a feedback loop tight can conflict with laying blocks out in a
line, and differential and multi-channel circuits have their own. A single universal rule
set would either be too weak to catch anything or wrong for most boards.

So `pcb/rules/` is **keyed by archetype**, each file a reviewed set of rules for one kind of
circuit. The Pultec establishes the first - `passive-ladder-eq` - and the circuits already
here establish the others as they are reached: the transistor preamp and the optical
compressor's sidechain a discrete gain stage, the compressor's audio path a feedback
amplifier, `pt2399-core` a mixed-signal IC module. An archetype with no rules yet is a
refusal, not a default.

`passive-ladder-eq` holds:

- signal-path ordering: blocks follow the ladder, zones do not overlap;
- shunt-node proximity: a shunt network's parts sit within a distance of the node they
  shunt, so a bank cannot sprawl;
- selector-bank ordering: a bank's capacitors sit in switch-position order, so the board
  reads like the schematic and a miswire is visible;
- input/output separation: a minimum distance, which for a passive EQ is a crosstalk
  rather than an oscillation concern;
- edge discipline: terminal blocks on an edge, within a setback.

Each rule states the distance it enforces and why that number. **This document does not fix
those distances** - T5 does, with the reasoning for each recorded beside it, because a
number chosen here without the boards in front of us would be false precision. What this
document fixes is that the numbers live in a reviewed, archetype-keyed library rather than
in a per-board file an agent drafts. Extending or relaxing the library is a reviewed change
with a test beside it; applying it is not.

### Variants

A build of a circuit is **one circuit plus two pieces of data**, never a second circuit.
Nothing about a packaging is encoded in structure, because the packagings are unknown.

**Technology** - which footprint family a part gets - is a bounded, tested map keyed by kind
and value range, the same shape as the existing `FILM_BY_FARADS` including its hard upper
bound, because an unbounded fallback once returned a 330 nF footprint for 10 uF. A part with
no option in some technology resolves to the same footprint in both; that is a fact recorded
in the map, not a fallback.

**Residency** - whether a part sits on the board or is wired to it - is already data, and
`circuits/pultec/off-board.ts` already says why, in terms this document should not improve
on:

> THE SINGLE DEFINITION OF RESIDENCY, and it is data rather than a rule about kinds because
> residency is a build decision the operator wants to keep open. Moving a part on-board is
> removing a line here and giving it a footprint; moving one off-board is adding a line.

That file anticipated this requirement before it was made, including that pots are
panel-mount "today" with on-board mounting "admitted by the architecture but no pot footprint
exists yet". The only change needed is that the residency set becomes **per build** rather
than one module-level constant. Residency is per *part*, so a build with some controls wired
and others on the board needs no new concept.

One correction that falls out: `off-board.ts` calls rotary selectors permanently off-board,
reasoning that a shaft and a bushing "does not mount on stripboard under any variant". That
is a claim about *stripboard*, and it is right about stripboard. PCB-mount rotaries exist, so
for a board build the claim narrows rather than holds. If no such part is named, the part
contract refuses and asks - the same mechanism as the inductors, which is the behaviour we
want for every form-factor question we have not answered yet.

**What a build does not get to decide in code:** how many boards a packaging uses, or where a
panel part physically sits. The first is a partition question and the second needs a panel
that does not exist. Both stay open.

### Fabrication and assembly contracts

"PCBWay-ready outputs" was hand-waving, and a DRC-clean board is not a manufacturable one.
Two contracts, both checked:

**The fabrication contract.** Gerbers for every copper, mask and silk layer; a drill file
whose holes all fall inside the outline; a closed board outline with stated dimensions;
solder-mask clearances and minimum annular ring against the fab's rules; and
BOM-to-footprint consistency, so no footprint carries a value or MPN the BOM disagrees with.
`docs/standards/pcbway-fab-rules.md` ports from pedals and is the reference the checks read.

**The assembly contract**, which exists because of a property any surface-mount build of
this circuit will have: **it will be mixed-technology.** The nine inductors, the pots and the
rotary switches have no surface-mount form, so they resolve to through-hole footprints
whatever else does. No externally assembled board of this circuit is therefore wholly
machine-assembled, and the contract must partition every part into *assembled by the
manufacturer* and *installed by hand*, generating placement data for the first set only. A
board that silently sends a through-hole rotary switch to a pick-and-place quote is a costing
error, not a DRC error, and nothing upstream of this contract would catch it. This holds
regardless of which form factors are eventually chosen, which is why it is stated here rather
than waiting for them.

**One hard constraint, carried from pedals and not negotiable by our tooling:** PCBWay sees
only what its KiCad plugin exports from the board file, plus what is typed on the order page.
Our own fab outputs are **invisible to it**. So any BOM data the manufacturer must act on -
MPN, manufacturer, substitution policy - belongs on the footprints in the `.kicad_pcb`, and
the contract checks it there rather than in a file we generate and nobody reads.

## Directory layout

```text
circuits/pultec/physical/perfboard/  the five existing perfboard modules (moved)
circuits/pultec/physical/pcb/        pcbBoard(circuit, build) - build is data, see Variants
circuits/pultec/builds/              named builds: a technology map and a residency set each
pcb/<build-name>/                    .kicad_pro .kicad_sch .kicad_pcb
                                     classification.json intent-overrides.json
                                     placement-policy.json route-fab-floor.txt
pcb/rules/<archetype>.json           the rule library, keyed by archetype
tools/pcb/                           board synthesis and the part contract
tools/placement/                     ported place/route wrappers, classification, intent
tools/schgen/                        ported schematic generator
make/krt.mk                          place, route, adopt, check-intent targets
```

A board directory is named for its **build**, not for a technology or a section count, so
adding a packaging later adds a directory and changes no structure. `circuits/pultec/builds/`
holds nothing today beyond what the perfboard work needs; it is where a packaging decision
will land when there is one.

`physical/` becomes symmetric: one subdirectory per physical target, neither privileged.
Moving the five perfboard modules changes their import depth and the `circuitPath` in each
`boards/*/perfboard.json`; `CLAUDE.md` already warns that an unresolved module surfaces as
a confusing type error at an untouched line, so `bun run typecheck` is part of that task.
**This move is not worth doing on its own** - it churns committed, working perfboard files
for symmetry alone, so it waits until something actually needs `physical/pcb/` beside it.

`pcb/` is deliberately not `boards/`. `boards/` means perfboard directories the perfboard
CLI drives, and the two workflows should not be mistaken for each other.

## Verification

Every gate is code with an exit code unless marked otherwise. A render or a PDF is evidence
for a human, never a verdict.

**Schematic:**

1. **Up to date.** Regenerates byte-identically; the KiCad version and loaded symbol
   library versions match a committed lock. We are on KiCad 10.0.5.
2. **ERC** clean at error severity, every exclusion carrying a recorded reason.
3. **Netlist equals the IR.** Both sides reduce to `net -> sorted [(ref, pin)]` and must be
   *exactly* equal. This catches wrong connectivity and a renamed interface net with
   equivalent topology. Unresolved references, an annotation-errors line on stderr, and any
   symbol pin neither on a net nor declared no-connect also fail.
4. **Canonical graph equivalence** against the authoritative source - the netlist export
   for the Pultec, the `Network` for an agent-designed circuit - comparing values and
   pin-level adjacency independent of names.
5. **Pin identity.** Pin numbers and names agree across the symbol, the IR's expected
   identity (compared exactly, after declared aliases only - no case folding, no fuzzy
   matching) and the footprint's pads. Pad-count parity alone would not catch a swapped
   IN/OUT.
6. **Wire safety.** The renderer refuses to emit a segment passing over a pin end not on
   its own net, or overlapping collinear segments of different nets. Gate 3 is the backstop.

**Board:**

7. **Synthesis identity.** Not component presence and net names - the full chain, link by
   link: **electrical terminal -> schematic pin -> footprint pad -> PCB net.** A board can
   hold every expected part, on correctly named nets, and still have a pad mapped to the
   wrong terminal. The gate also checks that each synthesized footprint carries the
   schematic component's identity, so regeneration cannot silently bind a footprint to a
   different logical component.

   This is not hypothetical here. Pad order is declared per component rather than per kind
   precisely because `t_3kHz` is throw 1 on `SW_HI_BOOST` and throw 8 on `SW_MID`; a
   duplicate in a declared order once collapsed two terminals onto pad `0` and was caught by
   review, not by a test. Potentiometers, rotary switches, transistors and connectors are
   where this breaks. **Fixtures with deliberately swapped and duplicated pins are part of
   the gate**, not an afterthought - a parity check that cannot fail a swapped IN/OUT proves
   nothing, the same way an intent that cannot fail proves nothing.
8. **Part contract.** Every part names a part or part family, and its footprint satisfies the
   geometric and rating checks above. A part with no identified family is a refusal.
9. **Intent gate.** `check-intent` runs more than zero rules, passes a compliant board, and
   fails each bad fixture by name.
10. **Route checks.** Connectivity, the engine's DRC, KiCad's DRC, board-sync, intent
   re-check, and no part moved.
11. **Repository safety.** `place` and `route` leave the committed board byte-identical.
12. **Manifest and adopt.** `adopt` refuses a missing manifest, a hash mismatch, a stale
    intent/rules/policy hash, a broken provenance chain, or any failing check.
13. **Pin and acquire.** The pin parses; acquisition refuses a commit mismatch and an
    unreachable remote, naming which.

**Agent gates**, run by a reviewer that did not author the artifact:

14. **Readability review, against a written rubric.** A reviewer reads the schematic PDF
    alone, without the IR. "Confirms they can follow it" is too soft to hold, so the rubric
    enumerates what following it means: trace each block's signal path end to end; state
    which position of each selector selects which component; name the relationship between
    parts in a block without inferring it from values; and distinguish a deliberate
    off-sheet connection from missing wiring. **The rubric is itself tested against
    deliberately degraded schematics** - a label-rendered block with no reason, a selector
    whose throws are unordered, wires crossing without junctions - each of which it must
    reject. A reviewer that cannot fail anything proves nothing, exactly as with gate 9, and
    an unrubricked reviewer would approve the label-heavy drawing that motivated the
    generator in the first place.
15. **Layout review.** A reviewer reads the board render and the metrics against the rule
    library, and states whether anything passes the rules while plainly being wrong - which
    is a finding against the rule library, not the board.

`make check` gains `check-intent` for every declared PCB. CI acquires the engine's Python
side and runs the schematic gates and `check-intent`; it fails distinctly when the engine
is unobtainable, so an infrastructure failure never reads as a passing board. Placement and
routing do not run in CI.

**A skipped check must never look like a passing one.** Every gate that cannot run says so
loudly and fails.

## Sub-projects

Two groups, and the difference between them matters more than the order within either.

**Committed work — the discrete boards, on perfboard.**

| | Sub-project | Deliverable | Gates | Depends on |
| --- | --- | --- | --- | --- |
| **S0** | The section scaffold | one scaffold board that lets any combination of discrete sections be built and measured, with stand-in values derived from the model. Designed in `2026-10-09-pultec-section-scaffold-design.md` | composition across all 31 subsets; strict graph equivalence in the integrated case | - |
| **S1** | Perfboard versions of each discrete circuit | the four remaining Pultec sections laid out, built and measured against the model's predictions; `docs/pultec/unresolved.md` items closed or restated with evidence | `make check` per board; measured-versus-predicted recorded | S0 |

This is the work with a known shape. S0 comes first because without the scaffold a single
Pultec section has no signal path at all, so there is nothing to measure — it is what makes
building in isolation possible. Agents contribute the scaffold, the wiring guide and
`make check`; the layout and the build are the owner's.

**Tooling, built against no particular form factor.**

| | Sub-project | Deliverable | Gates | Depends on |
| --- | --- | --- | --- | --- |
| **T1** | KRT port | `krt.pin`, `make/krt.mk`, `tools/placement/`, proven against a board fixture vendored from pedals | 11, 12, 13 | - |
| **T2** | schgen port and templates | schematics and PDFs for `opamp-buffer`, `pt2399-core`, the optical compressor and the transistor preamp — the circuits that exercise the ported templates. Four internal milestones, each independently testable: infrastructure parity; ported-template parity; the new templates; cross-circuit validation | 1-6, 14 | - |
| **T3** | Build data: technology and residency maps, and the part contract | a per-build footprint map and a per-build residency set, with every part naming a part or part family whose footprint satisfies the geometric checks | footprint-name tests, gate 8 | S0 |
| **T4** | Board synthesis | a `.kicad_pcb` with every part present and no placement claim, for whatever build it is given | 7, 8 | T2, T3 |
| **T5** | Classification, intent derivation and the rule library | the three-way split, the `passive-ladder-eq` archetype, and the library's distances fixed with the reasoning for each | 9, 15 | T1, T4 |
| **T6** | Fabrication and assembly contracts | the contracts defined above, checked | fabrication-output and assembly checks | T4 |

**T2 does not wait for the Pultec, and that is the point.** Its ported templates are
exercised by the four circuits already here, which need `opampStage`, the decoupling bank,
`divider` and `fanoutKit` regardless of what happens to the Pultec. Those circuits also give
the canonical-graph gate real reference material in `pt2399-core.kicad_sch` and
`lab-board.kicad_sch`. So the schematic generator can be ported, proven and useful while
every Pultec form-factor question stays open.

**The decision point this document does not cross.** Applying the tooling to a chosen set of
Pultec boards — which boards, which technology, which parts on them — comes after the
perfboard versions exist and the owner decides what to package and how. There is no sub-project
for it here, because writing one would mean inventing the answer. What the tooling owes that
decision is that it can serve any answer: a build is data, and nothing above hardcodes a
packaging.

**The order is the owner's.** The dependency column says only what a sub-project technically
needs. S0 and S1 are the near-term work; T1 and T2 are independent of everything and can run
alongside.

### S0: the section scaffold

**Designed in full in `2026-10-09-pultec-section-scaffold-design.md`.** Summarised here
because the parent's earlier account of it was wrong in a way worth recording.

The five sections do not cascade; they hang off a four-node ladder and each owns exactly one
series element of it. A section alone is therefore not a stage needing its ports terminated -
it is a shunt network holding a fragment of the signal path. Build low-boost alone and it has
no output at all at flat.

The earlier design was **one flat-state resistor per absent section**, measured on low-boost
and extrapolated. Measuring it across combinations showed it fails: low-cut alone was wrong
by 18.68 dB, hi-cut by 17.98, mid by 12.14. Two modelling errors were behind it. A section's
flat state is not only its ladder element - `RV_LO_BOOST` at position 0 shorts
`lo_boost_in` to ground, and omitting that one shunt was most of the error. And it is not
purely resistive - hi-cut's pot arm parallels `R1` plus a capacitor, and mid's flat path runs
through capacitors, an inductor tap and `R_MID_BOOST`.

What replaced it: **a section's flat state reduces to an exact small R/L/C network, and the
stand-in is that reduction.** Flat is degenerate - a pot at position 0 becomes two fixed
resistors with one a short, and a selector leaves exactly one capacitor branch live - so
there is nothing to approximate. The rule composes without a table: **fit the stand-in for a
section if and only if that section is absent**, which keeps the ladder whole for any of the
31 combinations. Verified at 0.00 dB action error across all five singletons and five
multi-section combinations, with the all-five case as a control.

Two consequences for this document:

**The physicalization problem mostly dissolves.** The stand-ins live on one separate scaffold
board rather than distributed across the section boards. So the section boards need no new
category in `projectPhysical`, `assertElectricallyTransparent` keeps its guarantee unweakened,
and the conducting parts sit on a board whose declared purpose is to conduct. The earlier
plan - a second transparency category narrow enough not to become a hole - is no longer
needed, which is a better outcome than defining it carefully.

**The scaffold is derived, not transcribed.** The values are computed by resolving each
section at flat; the committed copy is a derived artifact compared by content. A hand-written
table of stand-in values would be a parallel copy of what the model already states and would
drift the first time a capacitor changed - and that drift would look like a measurement
rather than a bug.

The integrated case still needs its own test, and it is the one that matters most: every link
omitted and all five sections present must recover a graph **strictly equivalent** to the
reference network. Not "the scaffold measures as inert" - graph equivalence.

The limits are measured and stated in the child spec: stand-in values are specific to the
frequency setting they emulate (up to 3.71 dB error if the circuit is set elsewhere), the low
selectors are ganged, standing in for mid needs a 1 H inductor that has no part number, and
the metric is action rather than absolute level.

## What the operator still decides

The list is short by design, and nothing in the generation chain waits on it:

- **The rule library**, once and on change, per archetype. This is where "what makes a board
  good" lives, and it is the one thing an agent must not author for itself.
- **Reclassifications**, as diffs. Classification is regenerated and compared by content, so
  a block changing archetype arrives as a reviewable change rather than a silent one.
- **The maximum board size** the outline loop may expand to, per board, because size is cost.
  The loop stops there and reports an impossible geometry rather than growing the board to
  make a placement fit.
- **Which parts are actually bought** where the model specifies a part only electrically -
  the nine inductors today. The part contract refuses rather than guessing, and that refusal
  lands here.
- **The form factors.** How the circuit gets packaged, how many boards each packaging uses,
  which parts sit on them and which are wired. Unknown today, and the tooling is built to
  serve any answer rather than to assume one.
- **Which build gets fabricated, and ordering it.** Outward-facing and irreversible.
- **The order of the work.** The owner steers which sub-project comes next; the dependency
  column says only what is technically required.
- **Non-technical calls:** how many sections to build, and whether a measured scaffold limit
  is acceptable for what they want to hear.
- **Veto.** The PDF and the board render are published as evidence on every run. The
  operator can reject anything at any point; the pipeline does not block waiting to find
  out whether they will.

Everything else - drafting the schematic, synthesising the board, deriving the intent,
placing, routing, choosing among passing candidates by the recorded metrics, and adopting -
is the agents' work.

## Governing-document changes

`CLAUDE.md`'s "Who does what, and why" is the premise this design falsifies, and it is
rewritten rather than deleted. What was true and stays true: an ungated agent cannot be
trusted with a layout, and a correct netlist is not a readable drawing. What becomes false:
that an agent cannot produce either.

The replacement rule: **an agent may author a schematic rendering and a PCB placement and
route when the result is graded by code against criteria the agent did not write for that
artifact, and reaches the repository through a single gate that verifies its provenance.**
"Never place parts or route a board" narrows to stripboard, where no such pipeline exists.
"Never call a generated schematic finished" narrows to a schematic that has not passed the
readability review.

`README.md`'s structure tree, prerequisites (Python 3.13, Rust/cargo) and the
`schematic-stub` instructions change with it. The two repositories' opposite postures on
who decides electrical questions are left as they are: they are different projects, and
this document does not reach into pedals.

## Risks

- **Template coverage is a hard gate.** A wired block no template realises fails
  generation, by design. The Pultec needs five new templates before any schematic exists,
  and `selectorBank` has to handle **doubled capacitors on a throw** - measured from the
  model: one of six throws on `SW_LO_CUT`, three on `SW_HI_BOOST`, four on `SW_HI_CUT`, and
  six of eleven on `SW_MID`. A template that assumes one capacitor per throw fails on four
  of the five sections. If it cannot be made to handle them, the fallback is an explicit
  label-rendered block with a stated reason - which gate 14 will challenge.
- **Two ported templates stay unexercised.** `regulator` and the crystal-with-load-capacitors
  template have no circuit here to prove them against. They are ported rather than dropped,
  because they will be wanted and rewriting them later is waste - but they carry no evidence
  until a circuit uses them, and T2's spec should say so where they are introduced rather
  than letting a passing suite imply coverage they do not have.
- **Derived intent can be derived wrongly.** The mitigation is gate 9: an intent that
  cannot fail is rejected, and the bad-fixture tests are written before the derivation.
  This is the riskiest part of the design and the one to build first within T5.
- **The port is large.** Roughly 218 files and 1.2 MB of TypeScript across the two bodies
  of work, written against pedals' conventions and package manager. The earlier framing
  left faithful-port-versus-rewrite open for schgen's `render/` layer; the template
  findings close it toward a **faithful port**, because a rewrite would discard a template
  set four circuits here need and would have to reproduce the wire-safety and determinism
  properties from scratch. T2's spec should still state the decision explicitly rather than
  inherit it.
- **Two Python environments** in one pipeline, with KiCad's shell environment actively
  hostile to the venv. Pedals already handles this; the handling must be ported, not
  reinvented.
- **The model is unvalidated, and that is what S1 is for.** No unit has been built from the
  Pultec model and it is known to be incomplete - `docs/pultec/unresolved.md` still carries
  R3 fitted at 4K7 where an inductive build calls for nominally 470R, about 5 dB of maximum
  high boost and half the Q. The three pot connections are documentation-derived and not
  netlist-confirmed, and the model never reaches flat. A fabricated board would inherit all
  of it. S1 is the mitigation, and building perfboard versions first is what schedules it.
  The residual risk is narrower than it was: the scaffold reproduces the model exactly at the
  setting it emulates, so a measurement carries the scaffold's *setting* restriction rather
  than a band-limited error - up to 3.71 dB if the circuit is set away from it.

## Out of scope

- **Choosing form factors**, and everything that depends on one: panel geometry, enclosure
  fit, where a board-mounted control physically sits, how many boards a packaging uses. The
  model keeps these open as data; this document picks none of them. A build that needs a
  panel pose cannot be placed until there is a panel, and that is a fact to report rather
  than a number to invent.
- Stitching vias, and any routing pass after the first route.
- Changes to KiCadRoutingTools. A needed engine change is reported upstream, not patched
  here.
- **Automating perfboard layout.** KRT does nothing for it - strips and cuts are a
  different problem from copper on a plane - and no pipeline here places a perfboard part.
  The four remaining sections are laid out by the owner in VeroRoute, as low-boost was.
  Agents contribute the wiring guide, the S0 scaffold and `make check`. S1 is that work and
  it is in scope; automating it is not.
- The perfboard tooling itself, which is unaffected except for the directory move in T3.
