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
the one step pedals leaves to its operator, and applies the whole chain to the Pultec
three-band EQ as five section boards in two variants.

The owner's instruction is explicit: take the operator out of schematic and PCB
creation as far as possible. This document's central problem is how to do that without
reintroducing the failure that motivated pedals' design in the first place.

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
        physical/stripboard/   physical/pcb/  (tht | smd)
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

Ported from pedals' `tools/schgen/`, which is the larger and less portable of the two
bodies of work: 187 files and roughly 1 MB of TypeScript. The architecture ports; the
template library largely does not.

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

**What does not port:** the template set, and `gates/oscar/`. Pedals' templates serve an
H7 platform - op-amp stages, regulators, crystals, decoupling banks, 176-pin buses. The
Pultec is a passive EQ and shares almost none of that. Its idioms, and the templates this
design must add:

| Template | Pultec use | Status |
| --- | --- | --- |
| `selectorBank` | a rotary switch fanning out to a capacitor bank, each cap returning to a common node | **new** - the dominant Pultec idiom; five banks, four of six throws and one of eleven |
| `potNetwork` | a potentiometer as rheostat (wiper tied to one end) or as divider | **new** |
| `tappedReturn` | four or five discrete inductors from their taps to a common coil return | **new** |
| `modeSwitch` | the mid section's two-throw boost/cut switch, selecting which resistor the coil returns through - no capacitors on its throws | **new** |
| `passiveChain` | the series resistors on the signal ladder | ports |
| `fanoutKit` | terminal blocks and header landings | ports |
| `opampStage`, `regulator`, `bus`, crystal, decoupling bank | - | unused here, ported for later circuits |

`gates/oscar/` compares against a reference design this repository does not have, so it
does not port. Its **canonical graph comparison** does, and is more useful here than
there: it reduces a schematic to component values and pin-level adjacency, independent of
reference designators and net names. For the Pultec that gives a second, name-independent
check against the authoritative netlist export; for an agent-designed circuit it checks
the rendering against the `Network`.

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
- **The outline** is computed from part area with margin.

`pcb/<board>/intent-overrides.json` carries what cannot be derived, empty by default. It is
part of the hash set `adopt` checks, so an override cannot be slipped in after a run.

**The gate that keeps this honest** is the one pedals already specifies, and it matters
more here: `check-intent` must run more than zero rules, and must *fail* on a board that
plainly breaks the intent. An intent that passes everything proves nothing. The test suite
asserts this against deliberately bad fixture boards - a selector bank scattered across the
board, a terminal block pulled off its edge, two sections interleaved - each of which must
fail by name.

### The standing rule library

`pcb/rules/` holds circuit-independent placement rules as committed JSON, reviewed once:

- signal-path ordering: blocks follow the ladder, zones do not overlap;
- shunt-node proximity: a shunt network's parts sit within a distance of the node they
  shunt, so a bank cannot sprawl;
- selector-bank ordering: a bank's capacitors sit in switch-position order, so the board
  reads like the schematic and a miswire is visible;
- input/output separation: a minimum distance, which for a passive EQ is a crosstalk
  rather than an oscillation concern;
- edge discipline: terminal blocks on an edge, within a setback.

Each rule states the distance it enforces and why that number. **This document does not fix
those distances** - S5 does, with the reasoning for each recorded beside it, because a
number chosen here without the boards in front of us would be false precision. What this
document fixes is that the numbers live in a reviewed library rather than in a per-board
file an agent drafts. Extending or relaxing the library is a reviewed change with a test
beside it; applying it is not.

### Variants

The THT and SMD boards are **one circuit with two footprint maps**, not two circuits.
`circuits/pultec/physical/pcb/` exports `pcbBoard(section, variant)`, and the variant
selects footprints through a bounded, tested map keyed by kind and value range - the same
shape as the existing `FILM_BY_FARADS`, including its hard upper bound, because an
unbounded fallback once returned a 330 nF footprint for 10 µF.

Parts with no SMD option - the nine discrete inductors, the pots, the rotary switches,
the terminal blocks - resolve to the same footprint in both variants. That is a fact
recorded in the map, not a fallback.

The THT variant is the garage build. The SMD variant is derived from it and is the one
fabricated externally, so it alone carries the fab rules, net-class track widths, and
`route-fab-floor.txt`. Without that floor the router necks blocked tracks to 0.127 mm.

## Directory layout

```text
circuits/pultec/physical/stripboard/   the five existing stripboard modules (moved)
circuits/pultec/physical/pcb/          pcbBoard(section, variant) and the footprint maps
pcb/<section>-<variant>/               .kicad_pro .kicad_sch .kicad_pcb
                                       intent-overrides.json placement-policy.json
                                       route-fab-floor.txt  (smd only)
pcb/rules/                             the standing rule library
tools/pcb/                             board synthesis
tools/placement/                       ported place/route wrappers and intent derivation
tools/schgen/                          ported schematic generator
make/krt.mk                            place, route, adopt, check-intent targets
```

`physical/` becomes symmetric: one subdirectory per physical target, neither privileged.
Moving the five stripboard modules changes their import depth and the `circuitPath` in each
`boards/*/perfboard.json`; `CLAUDE.md` already warns that an unresolved module surfaces as
a confusing type error at an untouched line, so `bun run typecheck` is part of that task.

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

7. **Synthesis parity.** Every netlist part is on the board, every pad bound to the right
   net, every footprint name resolved from a library on disk.
8. **Intent gate.** `check-intent` runs more than zero rules, passes a compliant board, and
   fails each bad fixture by name.
9. **Route checks.** Connectivity, the engine's DRC, KiCad's DRC, board-sync, intent
   re-check, and no part moved.
10. **Repository safety.** `place` and `route` leave the committed board byte-identical.
11. **Manifest and adopt.** `adopt` refuses a missing manifest, a hash mismatch, a stale
    intent/rules/policy hash, a broken provenance chain, or any failing check.
12. **Pin and acquire.** The pin parses; acquisition refuses a commit mismatch and an
    unreachable remote, naming which.

**Agent gates**, run by a reviewer that did not author the artifact:

13. **Readability review.** A reviewer reads the schematic PDF alone, without the IR, and
    confirms they can follow each block's signal path and every selector's switching. They
    challenge any block rendered with labels rather than wires.
14. **Layout review.** A reviewer reads the board render and the metrics against the rule
    library, and states whether anything passes the rules while plainly being wrong - which
    is a finding against the rule library, not the board.

`make check` gains `check-intent` for every declared PCB. CI acquires the engine's Python
side and runs the schematic gates and `check-intent`; it fails distinctly when the engine
is unobtainable, so an infrastructure failure never reads as a passing board. Placement and
routing do not run in CI.

**A skipped check must never look like a passing one.** Every gate that cannot run says so
loudly and fails.

## Sub-projects

Each gets its own spec and plan. They are listed in dependency order.

| | Sub-project | Deliverable | Gates | Depends on |
| --- | --- | --- | --- | --- |
| **S0** | Jumperable terminations | the scaffold that lets one section be built and measured alone, and the narrowed transparency category it needs | existing model and physicalization suites | - |
| **S1** | KRT port | `krt.pin`, `make/krt.mk`, `tools/placement/`, proven against a board fixture vendored from pedals | 10, 11, 12 | - |
| **S2** | PCB physicalization and variants | `physical/pcb/`, five sections times two variants, every footprint resolved from a library on disk | footprint-name tests | S0 |
| **S3** | schgen port and Pultec templates | ten `.kicad_sch` and PDFs | 1-6, 13 | S2 |
| **S4** | Board synthesis | ten `.kicad_pcb` with every part present and no placement claim | 7 | S3 |
| **S5** | Intent derivation and the rule library | derived intent for all ten boards, and the library's distances fixed with the reasoning for each | 8, 14 | S1, S4 |
| **S6** | First board end to end, then the rest | one section placed, routed and adopted; then the remaining nine | 9, 10, 11 | S5 |
| **S7** | Fab outputs for the SMD variant | PCBWay-ready outputs; ordering stays the owner's | fab-rule checks | S6 |

S0 and S1 are independent and can proceed in either order. S0 is listed first because it
changes the part count on every board, and S2 is where part counts become footprints -
settling it after S2 means redoing S2.

### S0: jumperable terminations

Measured, not assumed. The five sections do not cascade; they hang off a four-node ladder
and each owns exactly one series element of it:

| Ladder segment | Element | Section | Value at flat |
| --- | --- | --- | --- |
| `in` to `hi_boost_out` | `RV_HI_BOOST` arm | hi-boost | 47k |
| `hi_boost_out` to `lo_boost_in` | `RV_HI_CUT` arm | hi-cut | 4k7 |
| `hi_boost_out` to `out` | `RV_LO_CUT` arm | low-cut | 0 ohms - a short |
| `lo_boost_in` to `out` | `R2` | low-boost | 56k |

Everything else is a shunt network hanging off those nodes. So a section alone is not a
stage needing its ports terminated - it is a shunt network holding a fragment of the signal
path. Remove its neighbours and the path is gone: low-boost alone measures no output at all
at flat, because its pot grounds `lo_boost_in` and the only route to `out` normally runs
through low-cut's short.

The scaffold is therefore **stand-ins for the flat-state ladder elements the absent sections
own**, not terminations. For low-boost that collapses to two resistors, because low-cut's
flat state merges `hi_boost_out` into `out`:

```text
R_SCAF_SOURCE  47k   standalone IN terminal <-> out      (stands in for hi-boost)
R_SCAF_HI_CUT  4k7   out <-> lo_boost_in                 (stands in for hi-cut + low-cut)
```

Measured against the same section's action inside the full EQ (full boost minus flat,
everything else flat):

| | 20 Hz | 50 Hz | 100 Hz | 300 Hz | 1 kHz | 10 kHz |
| --- | --- | --- | --- | --- | --- | --- |
| in situ | 15.29 | 14.48 | 13.01 | 7.93 | 5.16 | 2.61 |
| scaffolded | 15.28 | 14.43 | 12.84 | 6.55 | 1.42 | 0.02 |

Under 0.2 dB through the shelf, then under-reading above about 300 Hz, where in situ the
tail comes from the neighbours' *reactive* networks and no resistor reproduces it. That is a
documented limit of the scaffold, stated wherever the scaffold is offered. Omitting the
47k collapses the action to 1.8 dB; a zero-impedance source gives exactly zero.

Each scaffold resistor sits in series with a two-pad removable link: link fitted means
standalone, link omitted means the real neighbour drives it.

**The architectural cost, and it is the reason this is a sub-project rather than a task:**
these are conducting components living in the physicalization layer, which today guarantees
it adds none. `assertElectricallyTransparent` will reject them, correctly. `projectPhysical`
needs a second category - present in the board network, excluded from the reconstruction
check - and that category must be narrow enough that it cannot become a hole in the
transparency guarantee. The spec for S0 has to define it before any code is written.

## What the operator still decides

The list is short by design, and nothing in the generation chain waits on it:

- **The rule library**, once and on change. This is where "what makes a board good" lives,
  and it is the one thing an agent must not author for itself.
- **Which variant gets fabricated, and ordering it.** Outward-facing and irreversible.
- **Non-technical calls:** board size against cost, how many sections to build, whether a
  measured scaffold limit is acceptable for what they want to hear.
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
  generation, by design. The Pultec needs four new templates before any schematic exists,
  and `selectorBank` has to handle **doubled capacitors on a throw** - measured from the
  model: one of six throws on `SW_LO_CUT`, three on `SW_HI_BOOST`, four on `SW_HI_CUT`, and
  six of eleven on `SW_MID`. A template that assumes one capacitor per throw fails on four
  of the five sections. If it cannot be made to handle them, the fallback is an explicit
  label-rendered block with a stated reason - which gate 13 will challenge.
- **Derived intent can be derived wrongly.** The mitigation is gate 8: an intent that
  cannot fail is rejected, and the bad-fixture tests are written before the derivation.
  This is the riskiest part of the design and the one to build first within S5.
- **The port is large.** Roughly 218 files and 1.2 MB of TypeScript across the two bodies
  of work, written against pedals' conventions and package manager. A faithful port and a
  rewrite against our `Network` model may cost comparably; S3's spec should decide that
  explicitly for schgen's `render/` layer rather than defaulting to one.
- **Two Python environments** in one pipeline, with KiCad's shell environment actively
  hostile to the venv. Pedals already handles this; the handling must be ported, not
  reinvented.
- **Nothing here has been built.** The Pultec model is unvalidated - no unit has been built
  from it and it is known to be incomplete. A generated, routed, fabricated board inherits
  every open question in `docs/pultec/unresolved.md`, including R3's value. Fabricating the
  SMD variant before a stripboard section has been measured would be ordering ten boards
  against an unmeasured model.

## Out of scope

- Panel-part mounting and enclosure geometry, by the owner's decision. Pots and rotary
  switches stay off-board on header landings, and no intent anchors an enclosure-derived
  pose.
- Stitching vias, and any routing pass after the first route.
- Changes to KiCadRoutingTools. A needed engine change is reported upstream, not patched
  here.
- The stripboard workflow, which is unaffected except for the directory move in S2.
- The four unrouted stripboard sections. They are existing work, not part of this design,
  and KRT does nothing for them - stripboard is strips and cuts, a different problem.
