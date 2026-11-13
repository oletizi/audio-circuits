Agent place-and-route for a through-hole PCB
============================================

**Status** APPROVED by the owner, 2026-11-12 (*"approved"*), after two rounds of
third-party review recorded in issue 34. **Next** the Phase 1 implementation
plan. **Scope** the first fabricated PCB from this
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
| The engine is pinned at the commit that produced a manufactured board, NOT at its newest release | this spec, the owner having delegated the call on 2026-11-12 (*"I don't care which version of the vendored tooling you use"*) | the probe asks one question - can the engine route THIS board - and a newer engine would put a second unmeasured variable under it, so a failure could not be attributed. A known-good engine makes the board the only unknown. The pin moves later in a deliberate commit of its own, which is the standing rule for every pin here, and a newer release is as able to regress as to improve |
| The outline is a rectangle sized to the parts, with four M3 mounting holes inset from the corners and `J1` on one long edge | this spec, the owner having delegated the call on 2026-11-12 | there is no enclosure for the outline to answer to, so nothing argues for a target size, and a size chosen before the placement is known would constrain the router for no reason. M3 at the corners is the generic module convention and costs nothing to drill. `J1` on a long edge keeps the five off-board nets reachable on a breadboard or in a jig, and gives the router one clean escape rather than five crossing it |
| The outline and hole geometry are final BEFORE routing, and placement is regraded against them | review issue 34, point 2, accepted | **a defect this spec introduced.** "The size is an output of placement" put routing ahead of the final geometry, so the corner holes and the edge anchoring `J1` could move after the grade that approved them: initial keepouts pass, final hardware overlaps a part, and the header silently loses its approved setback. The size still derives from the parts - it just settles before a track is laid. Hardware is modelled by envelope, not by drill |
| Schematic parity is a fail-closed check from Phase 1, with the three report classes under three separate policies | review issue 34, point 1, accepted | the probe's answer gates the entire spec, and this spec had left parity's fail-closed behaviour in Phase 2. A missing or unreadable report, or a missing parity field, must fail rather than read as zero violations, and `unconnected_items` must be counted rather than conflated with parity |
| The owner's approval is a checked input to `adopt`, and the fab packet is bound to the adopted board by input digest | review issue 34, point 3, accepted | this spec made "adopted without the owner seeing a render" its first anti-goal and then left the enforcement in prose. `stripboard/render-approvals.json` already holds five approvals in the needed shape, so this is reuse |
| The fab target COMPARES current inputs against the adoption record before creating anything, and refuses on mismatch | review issue 34 follow-up, accepted | **an ambiguity in this spec's own wording, which could have been implemented into the defect it was written to prevent.** "The packet records the digest of its inputs" describes a digest taken at export time, which faithfully describes a post-approval edit and yields a packet that is self-consistent and unapproved. Recording is not checking. The authority is the adoption record, the comparison precedes the archive, and the negative test asserts that no packet is produced at all |
| The ground pour is MEASURED in Phase 1; the owner sets the thresholds | review issue 34, point 4, accepted in substance, moved and split | the review placed this in Phase 2, after ranking. It belongs in Phase 1: connectivity and dead-copper checks can both hold on a barely-connected pour, so a probe blind to it can report success and hand Phase 2 a false pass. Split because an agent does not author the acceptance criteria for the artifact it produces - it states the numbers, the owner sets the bar |

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
3. **Settle the outline BEFORE routing, in two passes.** Per the decision
   above: a rectangle, four M3 holes inset from the corners, `J1` on one long
   edge. The size still derives from the parts rather than from a target - but
   it must be final before a single track is laid, and the first version of this
   spec got that wrong. See the decisions table row on review issue 34.
   - **Pass 1, discover the extent.** A generous rectangle, placement only, to
     find out how much board the parts and their hardware actually need.
   - **Then fix the final geometry.** Bring the edge in to that extent plus the
     standard's copper-to-edge clearance, and place the four holes against the
     final corners. Hardware is modelled by its **envelope, not its drill**: an
     M3 screw head, washer and standoff footprint, not a 3.2 mm hole. The
     header's approved setback is measured from the final edge.
   - **Then regrade placement on the final geometry**, and re-place if the
     regrade fails. Routing starts only after a placement that passed against
     the geometry that will exist.

   The holes and hardware envelopes are keepouts in the floorplan intent, and
   DRC verifies copper clearance to them independently of the grader.
4. **Draft the intent** - `floorplan-intent.json` (blocks, zones, keepouts, the
   header's edge and setback), `placement-rules.json` (input-to-output
   separation, each filter node compact around its own pins, the header's
   position), `placement-policy.json` (which overrides are allowed, for which
   operation, and why), `route-fab-floor.txt` (the router's minimums, set to the
   standard), and a `.kicad_dru` if the input and output prove to need an
   isolation rule. **An independent review checks these, then the owner approves
   them**, and nothing is adopted under unapproved intent.
5. **Place, route, and check**, to the acceptance criteria below.
6. **Show the owner a render**, beside the question and nothing else. Commit
   everything the run produced.

### Phase 1 acceptance criteria

The probe's answer gates the whole spec, so its checks are stated here rather
than left to Phase 2's facility. A check that cannot fail would make the gate
decorative.

**Schematic parity is fail-closed, from this phase.** The check runs KiCad's DRC
with `--schematic-parity --format json --severity-all`, on the candidate paired
with its own schematic and project configuration. It **fails** on a missing
report, an unreadable report, or a report with no parity field - a missing field
is not zero violations. An integration test runs the production check against a
known-good pair and against a board with a deliberately wrong pad-to-net
assignment, so the check is proven able to fail before it is trusted.

**`--severity-error` is the trap, and it is why the above is spelled out.** That
setting silently filters out every schematic-parity violation, which is the one
thing a parity check exists to catch. The severity setting controls what gets
reported, so a check with the wrong one passes a board it never examined.

**The three result classes get three separate policies**, stated rather than
conflated:

| Report class | Policy |
| --- | --- |
| `schematic_parity` | zero tolerated. A board that disagrees with its schematic is not this board |
| DRC violations | zero tolerated at error severity, against the fabrication standard's values |
| `unconnected_items` | zero tolerated on a routed candidate, and **counted, not ignored, on an unrouted one** - it is the measure of how much the router left undone |

**The ground pour is measured in this phase, not deferred.** Zero unrouted nets
and zero dead copper can both hold on a pour that is barely connected, so a
probe blind to the pour can report "it routes" and hand Phase 2 a false pass.
Measured on the **saved post-refill board** - the one that would be adopted and
plotted, not the pre-fill state: ground-plane continuity around `U1`, the
narrowest bridge joining any two regions of the pour, the spoke count on every
through-hole ground pad, and whether the supply bypass return rides the pour or
a track. **The measurements are stated as numbers; the thresholds are the
owner's to set** - an agent does not author the acceptance criteria for the
artifact it is producing. Until he sets them the numbers are reported beside the
render and gate nothing.

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
| `adopt` | **the only write to the board.** Accepts a route run only if its result still hashes the same, every check passed, **the owner's recorded approval names this exact routed board**, the intent, rules, policy, schematic, project configuration and custom rules are all unchanged, and it traces to a place run whose source is the board as it now is |

Every run directory carries a manifest recording the source board's hash, the
intent, rules and policy hashes, the engine commit, the overrides used, and the
candidates or the result with its checks and metrics. Changing the intent
invalidates every existing run, and `adopt` refuses one made under different
files.

Ranking, for choosing among passing runs: input-to-output gap largest first
(this is an audio board), then vias and back-layer track fewest first (a whole
ground plane is worth keeping), then total track length. **The owner chooses, on
the render.**

**And his choice is a checked input, not a note.** The first version of this
spec made "a layout adopted without the owner seeing a render" its own first
anti-goal and then left the enforcement in prose: `adopt`'s predicate was
hashes and checks, so it would have accepted any passing candidate, including
one he never saw. The approval is therefore recorded against the exact routed
board and the exact render he looked at, and `adopt` requires that record.

**The mechanism already exists and is reused rather than invented.**
`stripboard/render-approvals.json` carries five approvals in precisely this
shape - a `candidateSha256`, a `renderedFrom` saying what was rendered, the
owner's own words, who granted it and when, and what it `admits` against what it
`doesNotExcuse`. One of them states the distinction this needs out loud: what he
looked at was the picture and not the bytes, with the hash recorded so the two
cannot drift apart. A PCB approval is the same record about a different
artifact.

Two things consequently need fresh approval, and a test asserts each: **a
different passing candidate** from the same run, and **a DRC-clean edit to the
approved board**. Neither is covered by "every check passed".

The facility also brings:

- **A fabrication standard**, `docs/standards/pcbway-fab-rules.md`:
  PCBWay's standard no-extra-cost two-layer FR-4 spec, with project values
  carrying margin over it - 0.3 mm signal and 0.5 mm power track against a
  0.15 mm floor, 0.25 mm clearance, a 0.4 mm via drill, a 0.2 mm annular ring,
  0.5 mm hole-to-hole and copper-to-edge, silkscreen stroke 0.15 mm and height
  0.8 mm. A rule tighter than this raises the price of every order, so it is a
  project standard and not a per-board choice.

  Each value lives in the file a tool reads - the Board Setup constraints and
  net-class widths in the `.kicad_pro` for KiCad's DRC, the same minimums in
  `route-fab-floor.txt` for the router - because a rule written only in prose
  drifts.

  **Two things the standard cannot enforce, named so they are not mistaken for
  checked:** trace impedance and via inductance, which do not matter at this
  board's frequencies and are not the reason the rules exist; and **silkscreen
  graphic line width, for which KiCad has no design rule at all.** The second
  one bears on this board specifically rather than in the abstract: every
  footprint it uses is a stock KiCad through-hole footprint, and stock
  footprints are where thin legend outlines come from. **NOT VERIFIED HERE** -
  `kicad-cli` is not installed in this worktree, so the outline widths of the
  seven footprints this board uses have not been read. Phase 1 reads them and
  records what it finds. The expected consequence is a faint outline rather than
  a rejected or dearer board, so this is a disclosure, not a gate.
- **A gated fab target.** Gerbers, Excellon drill, position file, IPC-D-356
  netlist and BOM, zipped and named with the board's declared revision -
  produced **only** from a board that passes parity, ERC and DRC, and whose
  declared revision agrees with the release tags. A stale or broken board cannot
  be sent to fab, because the target refuses to build one.

  **And it is bound to the adopted board, not merely to a clean one.** "Clean,
  with a matching revision" is satisfied by a board that was edited after
  approval and still passes.

  **The binding is a COMPARISON made BEFORE the archive is created, never a
  digest recorded as it is written.** This spec said "the packet records the
  digest of its inputs", and recording is not checking: a digest taken at export
  time faithfully describes whatever is on disk, including a DRC-clean edit made
  after the owner approved something else, and the resulting packet is
  self-consistent and unapproved. The order is therefore fixed and is the whole
  of the mechanism:

  1. **Read the authoritative record** - the adoption record for this board,
     and the release commit it was adopted at. It is the authority; the working
     tree is not.
  2. **Digest the current inputs** - the board, the schematic, the project
     configuration, the custom rules.
  3. **Compare, and refuse on any mismatch**, naming which input differs, with
     nothing written. No archive directory, no partial zip, no plot output.
  4. **Only then** run the exports and build the archive.

  The negative test runs the fab target against an adopted board carrying a
  later DRC-clean edit and asserts that **no packet is produced** - not that a
  warning is printed, and not that the packet carries a different digest.
- **Two measured traps, each pinned by a test.** First, `kicad-cli pcb drc
  --severity-error` silently filters out every schematic-parity violation - the
  one thing a parity check exists to catch. The check must run `--severity-all`
  and read the report's `schematic_parity` key. Second, and found on the pinned
  10.0.5 while answering open question 2: a parity run whose schematic cannot
  be fetched **exits 0 and writes `schematic_parity: []`**, so refusing only an
  absent key still reads clean on a check that never ran. The check must have
  positive evidence that parity ran. Both are asserted by tests, because a
  check that cannot fail is worse than no check - and the second one is a
  *skipped* check wearing a passing check's clothes, which this repository
  names as the failure mode the whole workflow exists to prevent.
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

1. **The ground pour's thresholds.** Phase 1 measures continuity around `U1`,
   the narrowest bridge between pour regions, the spoke count on every
   through-hole ground pad, and whether the supply bypass return rides the pour.
   **What counts as acceptable is the owner's to set**, and until he does the
   numbers are reported beside the render and gate nothing. Of the criteria
   review issue 34 proposed, continuity and the thermal connections are the two
   worth gating on; return-path length is the weakest limb, since impedance and
   via inductance do not matter here - though the PT2399's own VCO and sample
   clock mean this is not a purely audio-frequency board either, so it is
   reported rather than dismissed.
2. ~~**The flags and report keys on the pinned KiCad.**~~ **Closed 2026-11-13
   by running the pinned 10.0.5**, which is what this question asked for. The
   flags and keys are as the spec assumed, and the measurement is kept as tests
   in Phase 1 Task 5 rather than as a table here. **What it also found is not a
   flag question and changes the check's requirements**: run against a board
   whose schematic cannot be fetched, `kicad-cli` reports the parity fetch
   failure on stderr, **exits 0**, and writes `"schematic_parity": []`. An empty
   array, not a missing key - so a gate that refuses only an absent key reads
   *zero parity violations* on a parity test that never ran. **The parity check
   must therefore rest on positive evidence that parity ran**, and requiring a
   successful exit does not supply it. A second find in the same report makes
   this spec's central trap self-detecting: `included_severities` records what
   the run requested, so a `--severity-error` invocation is visible in the
   report as `["error"]` and can be refused from the report itself rather than
   guarded by passing the right flag and trusting it.
3. **Whether this governance vocabulary and the stripboard one should become
   one.** Named rather than left implicit, because two parallel vocabularies for
   two layout media is exactly the silting this repository objects to. The
   precondition for revisiting: **a second PCB exists, and the two vocabularies
   have been observed to overlap in fact.** Not before, and not on the strength
   of a guess - the domains differ in kind, and the intent format is upstream's.
4. **Breakout for prototyping.** The owner's purpose for this board is trying
   configurations. `VCO` on `J1` pin 3 already serves that without a change, but
   test points on the filter and regeneration nodes, or a wider header, would
   serve it better. Deliberately deferred to a second board, where it is a
   circuit change with its own gates.
