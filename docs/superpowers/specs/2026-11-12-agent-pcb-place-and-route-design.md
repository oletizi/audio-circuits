Agent place-and-route for a through-hole PCB
============================================

**Status** awaiting owner review. **Scope** the first fabricated PCB from this
repository: `pt2399-core`, through-hole, laid out by the pinned
KiCadRoutingTools engine rather than by hand, and sent to PCBWay as a gated fab
packet.

## Intent

The owner, 2026-11-12, in three answers that fix the whole scope:

> *"I want tht to be the first board we build with the new discipline. I don't
> want to lay out the tht board by hand if I don't have to. I want to do a tht
> board layout first because that's easier for me to prototype than smd
> boards."*

> *"pt2399-core is the circuit we will use as our first test drive of the
> discipline. It won't go in a pedal enclosure yet--the core board will be used
> for prototyping different configurations for possible future pedal designs."*

So: **a bare through-hole module, placed and routed by the engine, ordered as a
bare board.** The deliverable the owner cares about is a board he can stuff and
prototype with; the deliverable this repository cares about is the facility that
produced it, reusable by the next board.

**The method is not invented here.** It is the discipline already proven on
another of the owner's projects, where it produced a manufactured board now in
service. This spec is a **port**, and the port is read-only in one direction: the
mechanisms are re-derived here from first principles and this repository cites
nothing outside it. See **The port constraint**.

## What this is not

- **Not SMD.** No surface-mount footprint library, no footprint-substitution
  derivation layer, no turnkey assembly BOM, no DNP handling. Those exist in the
  proven flow and are deliberately out of scope: the owner wants to prototype by
  hand first.
- **Not a circuit change.** `circuits/pt2399-core/pt2399-core.ts` is untouched.
  No test points, no wider header, no pads for alternative delay-time networks,
  although each is plausibly wanted later. A layout that fails must not be
  confusable with a circuit that changed under it.
- **Not an enclosure.** No panel-part anchors, no hole positions, no mechanical
  fit check, no 3D or STEP models.
- **Not a replacement for the perfboard.** `boards/pt2399-core/` holds a layout
  that was built and works. It is read-only throughout this work.
- **Not a routing algorithm.** Nothing here computes a path. The engine is
  third-party, pinned, and acquired; this repository contributes the intent, the
  checks, the provenance and the gates.

## Anti-goals: what would make this a failure even if it ran

1. **A layout adopted without the owner seeing a render.** The verdict on a
   board is his, on the picture.
2. **A fab packet produced from a board that does not agree with its
   schematic.** The gate is the point of the gate.
3. **Any write to `boards/pt2399-core/`.** That is the built unit's layout.
4. **A reference from this repository to the project this is ported from.**
5. **Copper hand-edited to make a run pass.** A systematic routing failure is a
   cause to find, not a candidate to patch.
6. **A check that passes because its own severity filter hid the violation.**
   See the measured trap under **Phase 2**.

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Through-hole first, and the layout is agent-produced | owner, 2026-11-12 | his words above: easier for him to prototype, and he does not want to lay it out by hand |
| `pt2399-core` is the first board | owner, 2026-11-12 | his words above |
| Bare module, no enclosure | owner, 2026-11-12 | his words above: a prototyping platform for future pedal configurations |
| The circuit is used strictly as it stands | this spec, the owner having delegated the call | a layout failure must not be confusable with a circuit change; breakout is a later board, and cheaper once the discipline is proven |
| Probe before facility, with a decision gate between | this spec, delegated | this repository's own record: SchGen drew 0 pages in 15 attempts, `schematizer` 0 in 9, three invented readability metrics each pointed opposite to the owner's judgement. Adoption ahead of measurement has cost rounds here, repeatedly |
| Intent, rules and policy keep the engine's own file format | this spec | graded floorplan intent is the engine's feature, not something the proven flow added. Re-expressing it would mean translating back into it - a layer invented to avoid reuse |
| The stripboard governance vocabulary is NOT unified with this one yet | this spec | the domains differ in kind - holes, strips, cuts and wire links against zones, keepouts, net classes and clearances. Precondition for revisiting is named under **Open questions** |
| The KiCad project and board live in `circuits/pt2399-core/` | existing convention, commit `0f5d775` *"Every KiCad source lives in `circuits/<circuit>/`"* | `circuits/pultec/pultec-three-band-eq.kicad_pro` is already there; a new top-level family would overload `boards/`, whose meaning is "a directory with a `perfboard.json`" |
| The engine is pinned at the commit that produced a manufactured board | this spec | a pin is a commit, moved only deliberately. Starting from a newer release would put an unmeasured engine under the first board |
| The outline is a rectangle sized to the parts, with four M3 mounting holes inset from the corners and `J1` on one long edge | this spec, the owner having delegated the call on 2026-11-12 | there is no enclosure for the outline to answer to, so nothing argues for a target size, and a size chosen before the placement is known would constrain the router for no reason. M3 at the corners is the generic module convention and costs nothing to drill. `J1` on a long edge keeps the five off-board nets reachable on a breadboard or in a jig, and gives the router one clean escape rather than five crossing it |

## The board

Every figure below was read from one of the two authorities rather than
transcribed: the model's own `pt2399Core()` and `DESIGNATORS` exports for the
component and pin figures, and the committed netlist's `(nets ...)` block for
the net figures, with

```
sed -n '/^\t(nets/,$p' tests/fixtures/pt2399-core.net | grep -oE '\(name "[^"]*"\)'
```

**They are stated here under protest, and the plan removes the protest.** A
count in prose is a transcription with a date on it, and this repository has
already paid for that - `CLAUDE.md` records a board figure reading 0, 1, 2, 5, 6
and 7 inside five days, with three files disagreeing at once. So the plan pins
each figure below as an assertion in `tests/circuits/pt2399-core.test.ts`, where
it fails when the model changes, rather than leaving it to go quietly stale
here.

- **24 components**: 14 capacitors, 8 resistors, 1 IC, 1 connector. 24
  designators. 65 declared pins.
- **0 components missing a footprint.** The canonical model carries a
  `footprint` on every one, transcribed from the built unit's netlist. There is
  no footprint-binding work for this board.
- **21 nets in the export, 20 of them routable.** The twenty-first is
  `unconnected-(U1-CLK_O-Pad5)`, KiCad's placeholder for `U1` pin 5, which the
  model declares NC. The router must not be asked to route it.
- **5 ports, all on `J1`** (`PinHeader_1x05_P2.54mm_Vertical`): `+5V`, `GND`,
  `VCO`, `OUTPUT`, `INPUT`. Delay time is already an off-board control on pin 3,
  which is what makes this board a prototyping platform without any change to
  it.
- **Single 5 V rail.** Resistor wattage is bounded by the rail rather than
  simulated, on the owner's judgement of 2026-10-30; no PT2399 DC model exists.

Footprints, which are the routing problem: `Package_DIP:DIP-16_W7.62mm`; 8 x
`Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal`; 10 x
`Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm`; `CP_Radial_D5.0mm_P2.00mm`; 2 x
`CP_Radial_D5.0mm_P2.50mm`; `CP_Radial_D6.3mm_P2.50mm`; the header.

**Why this is not simply an easier version of the proven board.** That board is
surface-mount. This one is through-hole, and in the engine a pad with
`drill > 0` blocks **every** copper layer. So 65 pads obstruct both sides of a
two-layer board, the axial resistors sit on a 10.16 mm pitch that eats channels,
and there is a ground pour. Through-hole is first-class in the engine's parser
and router, so this is a question of whether it routes *this* board, not whether
it supports the technology. That question is Phase 1 and nothing is ported until
it is answered.

## The engine

KiCadRoutingTools, MIT, a Rust-accelerated A\* router with a placement
optimizer and graded floorplan intent, for KiCad 9 and 10. Pinned by a
`krt.pin` file in the same format and with the same rules as the existing
`veroroute.pin`: a URL, a provenance tag, and a commit that moves only in a
commit of its own saying what changed upstream and why this repository wants it.

Its limits, from its own documentation, with what each costs us:

| Limit | Consequence here |
| --- | --- |
| No push-and-shove | it routes around obstacles rather than moving them, so placement quality decides routability. This is why placement is graded before routing, not after |
| No design rules by region or area | the real input-to-output isolation rule cannot live in the router. It goes in a `.kicad_dru` for KiCad's DRC to enforce, and the router gets only a per-net clearance hint |
| No blind or buried vias | irrelevant: two layers |
| No coarse grid assignment before detailed routing | topology is not planned globally, which raises the value of routing several placement candidates and ranking the results |

Acquisition follows the pattern this repository already has for the VeroRoute
fork, including the lesson learned there: **the build must record which commit
it was made from**, so a pin bump rebuilds instead of being reported and
ignored. The engine's router builds from source and needs `cargo`. Every engine
call runs with `PYTHONHOME` and `PYTHONPATH` removed, because KiCad's shell
environment points them at its own Python.

## Phase 1: the probe

**One question: can the engine place and route this board, two layers,
through-hole, with a ground pour, inside the PCBWay floor, with KiCad's DRC and
schematic-parity clean?**

Steps:

1. **Acquire** the engine at the pin, with the build stamp.
2. **Create the KiCad project.** `circuits/pt2399-core/` gains a
   `pt2399-core.kicad_pro` and a `pt2399-core.kicad_pcb`, carrying the Board
   Setup constraints and net-class widths of the fabrication standard below. The
   existing `pt2399-core.kicad_sch` is the schematic; it is not modified.
3. **Draw the board outline**, per the decision above: a rectangle, four M3
   holes inset from the corners, `J1` on one long edge. **The size is an
   OUTPUT of placement, not an input to it.** The rectangle starts generously,
   placement runs, and the outline is then brought in to the placed extent plus
   the standard's copper-to-edge clearance. Fixing a size first would constrain
   the router to serve a number nothing asked for. The mounting holes are
   keepouts in the floorplan intent, so placement never has to be undone to
   make room for them.
4. **Draft the intent** - `floorplan-intent.json` (blocks, zones, keepouts, the
   header's edge and setback), `placement-rules.json` (input-to-output
   separation, each filter node compact around its own pins, the header's
   position), `placement-policy.json` (which overrides are allowed, for which
   operation, and why), `route-fab-floor.txt` (the router's minimums, set to the
   standard), and a `.kicad_dru` if the input and output prove to need an
   isolation rule. **An independent review checks these, then the owner approves
   them**, and nothing is adopted under unapproved intent.
5. **Place, route, and check.** Seed candidates, grade each against the intent,
   route the ones that pass, and run connectivity, the engine's DRC, KiCad's
   DRC, schematic parity and a no-dead-copper check on each result.
6. **Show the owner a render**, beside the question and nothing else. Commit
   everything the run produced.

**The decision gate.** If it routes clean, Phase 2 ports the facility in the
shape this phase proved. If it fails systematically, this spec has cost one
phase and the finding is recorded; it does not proceed on the strength of hope.
A routing failure here is a cause to name, and the likely causes are already
known: the router necking tracks below the fab floor without a standing floor
instruction, a terminal routing escalation that breaks clearance rather than
leaving a net open, and starved thermal spokes where a ground pad is crowded by
other copper.

Phase 1's product is an answer and a board, and its scripts are throwaway. It is
not the facility.

## Phase 2: the facility

Five verbs, with run provenance, and exactly one of them writes the board.

| Verb | Does |
| --- | --- |
| `check-intent` | grade a board against its intent and rules; at least one rule must actually run |
| `place` | seed candidates from the canonical board into a stamped run directory, strip old routing in the run's own copy, grade every seed, repair seeds that fail only proximity, and write each passing candidate with a render and a report. **Never writes the board** |
| `route` | route one selected candidate, join the pour's islands, refill zones, remove dead copper, and record connectivity, both DRCs, parity, intent and that no part moved. Exits non-zero if any check fails; the run directory stays as evidence |
| `route-all` | route a place run's candidates one at a time, stopping at N passes or at N identical failures in a row - a batch hides a systematic failure |
| `adopt` | **the only write to the board.** Accepts a route run only if its result still hashes the same, every check passed, the intent, rules and policy are unchanged, and it traces to a place run whose source is the board as it now is |

Every run directory carries a manifest recording the source board's hash, the
intent, rules and policy hashes, the engine commit, the overrides used, and the
candidates or the result with its checks and metrics. Changing the intent
invalidates every existing run, and `adopt` refuses one made under different
files.

Ranking, for choosing among passing runs: input-to-output gap largest first
(this is an audio board), then vias and back-layer track fewest first (a whole
ground plane is worth keeping), then total track length. **The owner chooses, on
the render.**

The facility also brings:

- **A fabrication standard**, `docs/standards/pcbway-fab-rules.md`:
  PCBWay's standard no-extra-cost two-layer FR-4 spec, with project values
  carrying margin over it - 0.3 mm signal and 0.5 mm power track against a
  0.15 mm floor, 0.25 mm clearance, a 0.4 mm via drill, a 0.2 mm annular ring,
  0.5 mm hole-to-hole and copper-to-edge, silkscreen stroke 0.15 mm and height
  0.8 mm. A rule tighter than this raises the price of every order, so it is a
  project standard and not a per-board choice.
- **A gated fab target.** Gerbers, Excellon drill, position file, IPC-D-356
  netlist and BOM, zipped and named with the board's declared revision -
  produced **only** from a board that passes parity, ERC and DRC, and whose
  declared revision agrees with the release tags. A stale or broken board cannot
  be sent to fab, because the target refuses to build one.
- **The measured trap, pinned by a test.** `kicad-cli pcb drc
  --severity-error` silently filters out every schematic-parity violation - the
  one thing a parity check exists to catch. The check must run `--severity-all`
  and read only the report's `schematic_parity` key. A test asserts this,
  because a check that cannot fail is worse than no check.
- **The `ic` parts-list rule.** `tools/bom/needs.ts` has no rule for kind `ic`,
  so `make check` and `bom` both refuse this board today by name. A rule, a
  test, and a PT2399 catalogue entry with sourcing evidence. This is independent
  of everything above and can land first.

## What stays untouched

`circuits/pt2399-core/pt2399-core.ts`, the canonical model and the authority for
everything downstream. `circuits/pt2399-core/pt2399-core.kicad_sch`, already in
agreement with it. `boards/pt2399-core/`, the built perfboard - read-only verbs
only. The stripboard pipeline and its governance files. The schematic drawing
toolchain.

## The port constraint

The proven flow lives in a private repository that this one must not depend on
or reference. The standing rule is absolute and predates this spec: **zero
references**, because this is a port and not a dependency.

Practically: mechanisms are re-derived here and documented from this
repository's own first principles; no path, URL, branch, commit or repository
name from the source project appears in this repository's code, tests, docs,
commit messages or pull requests; and where this spec says "the proven flow" it
is describing prior art the author read, which a reader of this repository
cannot and need not open. The third-party engine is cited directly from its own
public upstream, which is the one citation that is legitimately shared.

## Testing

- Every ported module carries unit tests, as the facility it is modelled on
  does; the file-size ceiling applies.
- The parity-severity trap gets a test that fails if the filter regresses.
- The `ic` parts-list rule gets a test, which is the condition the refusal
  message already states.
- Phase 1's run directory is committed as evidence - prompts, intent, metrics,
  reports, renders and logs - so the probe's result can be re-read rather than
  remembered.
- `make check` holds the board once it passes its intent, so a later change
  cannot silently break the layout's agreement with the circuit.

## Open questions

**Nothing here blocks Phase 1.** The outline question that did was answered on
2026-11-12 and is in the decisions table; it is deleted from this list rather
than marked closed.

1. **Whether the engine pin should move to its newest release.** The spec pins
   the commit that has produced a manufactured board. Moving it is a separate,
   deliberate commit, and it can change what a passing board is.
2. **Whether this governance vocabulary and the stripboard one should become
   one.** Named rather than left implicit, because two parallel vocabularies for
   two layout media is exactly the silting this repository objects to. The
   precondition for revisiting: **a second PCB exists, and the two vocabularies
   have been observed to overlap in fact.** Not before, and not on the strength
   of a guess - the domains differ in kind, and the intent format is upstream's.
3. **Breakout for prototyping.** The owner's purpose for this board is trying
   configurations. `VCO` on `J1` pin 3 already serves that without a change, but
   test points on the filter and regeneration nodes, or a wider header, would
   serve it better. Deliberately deferred to a second board, where it is a
   circuit change with its own gates.
