# Pultec modularization: proposed changes and implementation status

> ## SUPERSEDED — HISTORICAL RECORD ONLY. DO NOT IMPLEMENT, AND DO NOT UPDATE.
>
> The file paths and the "update the status and evidence here as each step lands"
> instruction below are no longer canon. `lib/passives/` became `lib/model/` in Plan A,
> `lib/export/` was deleted, and tscircuit was removed by `feature/active-devices`.
> Current status lives in `docs/superpowers/plans/`, and the model itself in
> `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` and `CLAUDE.md`.

Branch: `feature/pultec-modularize`.

This document records the proposed repository changes and their acceptance
criteria. It distinguishes groundwork already implemented from circuit design
that remains pending. Update the status and evidence here as each step lands.
The [design notes](README.md) contain source links, electrical constraints, and
the reference transcription checklist.

## Review disposition

This plan incorporates the [independent review](implementation-plan-review.md).
Simulation and export feasibility now precede their use as acceptance gates;
control-state modeling and typed-test improvements are explicit pending work.
The implementation inventory below still describes only completed groundwork.

Three qualifications govern the changes:

- Candidate work may proceed before corroboration, but neither software nor
  hardware may claim authoritative EQP-1A fidelity until that evidence exists.
- Connectivity lint is separate from labelled topology comparison. A blanket
  two-component-terminals rule would reject legitimate external ports and open
  contacts, and would still miss some disconnected subnetworks.
- Allowed module owners must be checked at the Pultec boundary; the generic
  partitioning utility need not hard-code LF/HF names.

## Scope and decisions

The primary deliverable is a faithful EQP-1A passive network physically divided
into LF and HF modules. Their composition must preserve every reference
connection and component, including control interactions and loading. LF-only
operation is a subsequent requirement; HF-only operation is a secondary planned
composition. Neither may require changing the combined reference circuit.

- Keep LF frequency selection, boost, and attenuation together with their R/C
  network. The earlier proposed independent `low-boost` LC filter is superseded.
- Keep HF boost selection, amount, bandwidth, and attenuation together with their
  associated network. Individual controls are not independent filter stages.
- Derive the inter-module interface from shared reference nodes. Do not prescribe
  a two-port cascade, an IN/OUT/GND connector, or a fixed conductor count.
- Use the backplane as wiring. Assign every passive component to exactly one
  module, including any element that serves both frequency regions.
- Keep makeup gain and external interfacing outside the passive modules. Their
  loading still belongs in the reference simulation environment.
- Treat standalone blank/substitute modules as separate designs. A neutral
  control setting does not establish that the omitted section is a short circuit.
- Defer inexpensive inductor substitution until the reference winding/tap model
  is established. Compare inductance, losses, DCR, Q, and response over the actual
  operating frequencies before proposing a substitute or discrete-inductor bank.

## Groundwork implemented in this branch

| File | Change and purpose |
| --- | --- |
| `README.md` | Replaces the independent-control Pultec roadmap with coupled LF/HF modules and links the design documentation. Removes the composition example that imported an unimplemented filter. |
| `docs/pultec/README.md` | Records candidate sources, unresolved reference authority, transcription requirements, module responsibilities, and validation gates. |
| `docs/pultec/implementation-plan.md` | Tracks the complete proposal, implementation sequence, and completion evidence. |
| `lib/passives/topology.ts` | Adds a labelled passive-network representation, strict topology comparison, component ownership partitioning, and derived shared-node lists. |
| `tests/topology.test.ts` | Exercises partition preservation and rejects rewiring, parameter changes, missing/extra components, duplicate references, swapped ports, and invalid ownership using a synthetic fixture. |
| `package.json` | Adds `bun run test` as the standard entry point for the connectivity tests. |
| `tsconfig.json` | Enables explicit TypeScript import extensions used by existing modules and sets `noEmit` for type checking; circuit output remains the responsibility of tscircuit. |

The topology utility preserves canonical reference names. It deliberately rejects
renaming and alternative equivalent circuits.

The paragraph that stood here described the topology utility's initial state and
is now superseded by the modules listed under "Verification record and
reproduction" below. Specifically: parameters are no longer flat strings —
`lib/passives/parameters.ts` defines structured parameters in canonical SI units,
with `lib/passives/units.ts` parsing source value strings into base units and
throwing rather than guessing. Pot behaviour is modelled: `expandPot` in
`lib/passives/control-state.ts` expands a pot into two resistors using its
declared taper and wiper fraction. Switch contact tables are validated: the same
resolver rejects an unknown position, a position with no contacts entry, a
contact naming a pin the switch does not declare, and ganged switches that
disagree.

What remains genuinely unmodelled is coupled windings (a tapped or coupled
inductor has no representation; a third terminal reaching the resolver is
rejected, not modelled) and physical connector wiring, which stays a
partitioning/boundary-net concern rather than an electrical one.

Anyone starting the step 1 reference transcription should build fixtures in the
shape these modules define — structured SI parameters, pot terminals kept as
`ccw`/`wiper`/`cw`, switches keeping every contact, and two-terminal passives
keyed `a`/`b` — not in the superseded string-map shape.

No Pultec circuit exports, PCB layouts, fixed connector assignments, BOM, or
manufacturing files have been implemented. The existing buffer demo is unchanged.

## Proposed implementation sequence

Reference research and the feasibility exercises below can proceed independently.
Candidate transcription, exploratory simulation, and provisional partitions need
not wait for corroboration. Mark all such outputs with the candidate source and
unresolved assumptions. Resolve the control-state contract before implementing
the production partition or export adapter. Final acceptance gates still apply.

### 0. Establish validation tooling — complete (tooling only; no Pultec circuit work)

Proposed locations: `tests/` for synthetic fixtures and checks, and `lib/passives/`
for reusable validation helpers. These are bounded prerequisites, not evidence
that a Pultec circuit has been validated.

**Simulation feasibility:** select an AC engine, record its version and repeatable
installation/invocation, and compare a simple RC network against its analytic
complex response. Specify source/load conditions, frequency range, magnitude/
phase conventions, and numerical tolerances before assessing the result. Include
low-frequency, corner, and high-frequency cases. No engine is selected yet; this
step is complete only when the engine choice and passing fixture are recorded.
It must finish before AC comparison becomes a Pultec acceptance gate.

**Export feasibility:** inspect actual tscircuit output from the existing buffer
to establish component, terminal, and net identity. Then use a small passive
fixture with two module instances and an explicit connector to demonstrate
flattening to canonical reference names. Deliberately miswire the exported
composition and require comparison to fail. Record which values and identifiers
survive export and which control/winding metadata need a supplemental mapping.
Use this result to scope the production adapter before step 4.

**Groundwork hardening:**

- Convert `tests/topology.test.js` to TypeScript, type fixtures against
  `PassiveNetwork`, and give intentional-mutation helpers explicit mutable
  fixture types. Ensure Bun test types resolve and the tests are included in
  `bun run typecheck`; renaming alone is insufficient.
- Add an explicit allowed-owner check for the Pultec ownership map before
  partitioning. Keep the generic helper reusable; an optional allowed-owner
  argument is acceptable. Test a typo attached to a valid component reference.
- Add a separate connectivity lint that accounts for external ports, intentional
  opens, and unused switch contacts. Test accidental singleton nets, allowed
  opens, and disconnected subnetworks, using resolved control states where
  necessary. Keep strict reference comparison separate from these diagnostics.
- Remove `outDir` and `sourceMap` from the checking-only TypeScript configuration.
  Keep `rootDir` unless its project-boundary role is deliberately changed; its
  removal is not required for this work.

Completion evidence: a reproducible analytic simulation check, a passing export
round-trip with a failing miswire case, typed tests, and targeted validation tests.
These exercises can land separately; neither depends on an authoritative Pultec
transcription.

- [x] Reproducible analytic simulation check.
- [x] Passing export round-trip with a failing miswire case.
- [x] Typed tests.
- [x] Targeted validation tests.

All four items are now recorded, with detail and exact commands, in
"Verification record and reproduction" below. Marking them complete is a
statement about the tooling: it does not mean any Pultec circuit, module, or
measurement has been validated. That remains gated behind step 1 and later.

### 1. Establish the reference — complete, and corroborated

Delivered in `reference/pultec/`. The circuit is Ian Thompson-Bell's Pultec 3
Band EQ, an EQP-1 and an MEQ-5 combined; the "EQP-1A" phrasing throughout this
document is shorthand for it.

Topology is an exact `kicad-cli` export of the schematic that was manufactured,
retained with digests rather than transcribed. Values come from Thompson-Bell's
own documentation. The two agree on every capacitor position across all four
banks, including two details that only match if both sources are right, so the
reference meets the corroborated gate rather than remaining candidate-only. It
is corroborated as a faithful record of that design and says nothing about
fidelity to a factory Pultec.

Scope: low cut, low boost and hi cut in full. The hi boost resonant branch and
the mid section are excluded with reasons recorded. Six unresolved items are
listed rather than filled in; two of them — as-built hardware, and a Qmax
resistor that contradicts the fitted build variant — affect behaviour.

Proposed location: `reference/pultec/`.

Start from the Gyraf original-style drawing. It carries the complete passive
network, which is what steps 2 through 4 need, and waiting for factory
documentation is not a precondition for any of that work. Transcribe it, label
it a candidate, and record what it cannot settle. Corroboration gates
fidelity *claims* and hardware spend, not modelling, partitioning, or module
implementation. If a value is later corrected, re-run the sweep with the
corrected value; none of the structural work is wasted.

Two things that source cannot settle, and that an official schematic would not
settle either:

- **The impedance environment.** Transformer figures in a reverse-engineering
  are not reliable impedance specifications, and a passive EQ's response is a
  function of its source and load. This is a declared modelling assumption, not
  a fact to be looked up. Record it in the fixture: `SourceModel` and
  `LoadModel` in `lib/sim/netlist.ts` are required inputs with no defaults
  precisely so the assumption stays visible and arguable.
- **Values the source itself flags as corrected.** The Gyraf index notes
  corrections to potentiometer values. Those belong in the unresolved-items
  list with their alternatives, not silently resolved to one reading.

Do not mix values from the modified G-Pultec drawing into the original-style
transcription. Different component values, switch positions, loading, and
amplifier interface. Cite the drawing each value came from.

The work:

- Identify the exact source version and record URL, revision/date, retrieval
  details, and a digest for any retained source artifact. Record permissions if
  source images are redistributed; the current documentation only links sources.
- Add an unsplit reference netlist, a source-to-component inventory, complete
  pot and switch definitions, and input/output boundary conditions.
- Choose a common structured format for the reference and ownership data. A typed
  TypeScript representation is acceptable; no JSON-only format is required. Keep
  the reference independent of the modules and ownership map checked against it.
- Maintain an unresolved-items list with source locations and explicit alternative
  interpretations. Do not turn uncertain junctions or values into silent defaults.
- Give every part and terminal a stable identifier. Preserve winding coupling,
  tap selection, ganged switches, and control direction/taper in the model.

Provisional deliverable: a named candidate netlist and its unresolved-items list,
usable for exploratory downstream work. If corroborating evidence remains
unavailable, retain candidate status and report comparisons against that candidate.

Final reference acceptance: a corroborated, reviewed source-to-netlist mapping
with no unresolved connection or parameter needed for the selected configuration.
This gate controls reference-fidelity claims in software as well as hardware; it
does not prohibit exploratory implementation.

### 2. Model and validate the unsplit circuit — modelled and validated in scope

The reference assembles into a typed network mechanically from the netlist
export, resolves at declared control states, and sweeps through the step 0 AC
harness.

Validated against independent evidence, not self-consistency: at the flat
setting the model gives 21.54dB insertion loss where Thompson-Bell quotes a
nominal 20.83dB. The difference is his figure being the bare 47K/4K7 divider
while the full network also shunts through R2 and the specified 470K load;
including both derives 21.5398dB by hand, which the simulation matches to
better than 0.01dB. Hi cut, lo boost and the absent hi boost branch are each
pinned by their own behavioural test.

Control states use pot extremes only, because no source states a LOG curve
constant and at an extreme the taper cannot affect the result.

Still outstanding: response validation against published Pultec curves, which
needs the hi boost branch, and any comparison against the built unit, which
needs measurement.

Proposed locations: `reference/pultec/` for independent expected data and
`tests/pultec/` for reference validation fixtures and simulation checks.

The representation contract this step originally carried is **delivered**, in the
step 0 branch. Do not rebuild it:

- The physical source model keeps every pot terminal, switch contact and ganging
  relationship, with a separate typed `ControlState` and an explicit
  `resolveNetwork` producing the simulation network (`lib/passives/control-state.ts`).
  Partitioning operates on the physical model, not the resolved graph, so
  unselected contacts remain part of the hardware description.
- Invalid selections are rejected rather than defaulted — unknown control
  reference, out-of-range or non-finite pot position, unknown switch position,
  missing contacts entry, contact naming an undeclared pin, ganged disagreement.
- Parameters are structured and in canonical SI units, with provenance separated
  from electrical identity so an annotation-only edit is not rewiring
  (`lib/passives/parameters.ts`, `lib/passives/units.ts`, `lib/passives/topology.ts`).

Two parts of that contract are genuinely unbuilt, because no reference has
required them yet: coupled windings, and any tap model beyond
`InductorParameters.taps`. Extend only if the candidate reference needs them,
and do not encode an unsupported assumption as a default.

What remains in this step:

- Exercise the contract against the candidate reference's actual controls:
  extremes, intermediate pot positions, ganged selection, and winding/tap
  behaviour as the source requires.
- Create an unsplit circuit model using the engine validated in step 0. Record
  the source/load model, control settings, simulation method/version, sweep range,
  and numerical tolerances. Note that `resolveNetwork` currently requires the
  reference network to key its ground port `ground`, while `toSpiceNetlist`
  parameterizes `environment.groundPort`; reconcile the two when the reference
  declares its own port names.
- Compare the unsplit and composed simulation networks at identical control
  states.
- Validate representative responses against trustworthy reference evidence where
  available, particularly simultaneous LF boost/cut and HF bandwidth behavior.

Completion evidence: reviewed connectivity plus a reproducible reference response
set. Agreement between two models derived from the same mistaken transcription
is insufficient evidence of source fidelity.

### 3. Define the physical partition — complete in scope

`circuits/pultec/partition.ts`. One module per section, following the boards
that were actually built rather than inventing a split. Every element is owned
exactly once, owner names are checked against a declared set, and recomposition
is asserted equal to the reference with element order reversed so it cannot
depend on ordering.

Ground is an external port here, not a boundary net: with hi boost and mid out
of scope every element on it belongs to low boost. It still needs routing on
every board, which is exactly the case this plan flags, and is now asserted.

Proposed location: ownership data under `reference/pultec/`, in the format chosen
for the reference model, plus a connector table in `docs/pultec/`. A typed
`partition.ts` is one option, not a settled format.

- Assign each reference component once to LF or HF. Validate owner names against
  that allowed set. Resolve shared elements explicitly before finalizing the
  partition; any additional owner requires an explicit design decision.
- Derive shared nets and document each connector pin's canonical node, connected
  terminals, and return routing. Include external ports even if used on one board.
- Retain shared nodes without adding loading or duplicating passive elements.

Completion evidence: recomposed labelled connectivity equals the independent
reference and the connector table accounts for every boundary connection.

### 4. Implement tscircuit modules — complete in scope

`modules/pultec-low-cut`, `pultec-low-boost`, `pultec-hi-cut`, and
`pultec-passive-eq` composing the three. Front-panel selectors and level pots
appear as named nets, not components: which connector carries them is a
physical decision that belongs after the electrical partition is validated.

Each module renders, exports, flattens through the adapter and compares equal
to its portion of the reference partition. The composition adds exactly one
conductor and equals the partition recomposed, with no component duplicated.
Unsplit and composed responses agree within 1e-6 dB and 1e-6 degrees across a
nine-state control matrix, and a second test asserts two settings genuinely
differ so that agreement is not vacuous.

Module naming follows the sections rather than the plan's original LF/HF pair,
because the circuit has four sections and not two.

Proposed locations:

- `modules/pultec-lf/`
- `modules/pultec-hf/`
- `modules/pultec-passive-eq/`

Follow the repository's explicit imports, named nets, component naming, and
schematic layout conventions. Add exports and circuit fixtures once functional.
A module fixture must supply its documented environment; an isolated LF or HF
board must not imply that standalone electrical behavior has been validated.

Build on the export feasibility result from step 0. Add an adapter that reads
the actual emitted circuit connectivity, resolves
module prefixes and connector conductors to canonical reference identifiers,
and checks the flattened composition against the independent reference.

Completion evidence: type checks, exported-connectivity checks, schematic review,
and unsplit-versus-composed magnitude/phase comparisons pass for the control
matrix defined in the design notes. A PCB snapshot alone is insufficient.

### 5. Implement standalone compositions — deferred until combined validation

Proposed locations:

- `modules/pultec-lf-standalone/` (priority)
- `modules/pultec-hf-standalone/` (secondary)

Define the missing section's neutral state, including frequency selection and
bandwidth where relevant. Derive its terminal behavior, then determine whether
an exact passive substitute is practical. Document any approximation, valid
settings, source/load assumptions, and error bounds. A substitute may need to
retain reactive elements or selection-dependent behavior.

Completion evidence: comparisons against the complete network in the specified
neutral states, with any accepted deviations explicitly reported. Do not route
these substitutes into the normal LF+HF composition.

### 6. Prepare physical implementation — deferred

Choose connector hardware, footprints, board placement, and component sourcing
only after the electrical partition is validated. Evaluate connector parasitics,
inductor losses/coupling, and tolerances. Document the measurement setup and
compare assembled hardware with the model before calling it build-validated.
Manufacturing exports and any inexpensive-inductor variants are later outputs.

## Verification record and reproduction

The initial groundwork checks recorded here ran `bun test` against a single
synthetic bridge fixture and reported 9 tests passing. That figure describes the
first commit of this branch and is retained only as history; the suite has grown
with every module since. The current figures are:

- `bun test`: 64 tests passed across 9 files.
- `bun run typecheck`: passed after the import-extension configuration correction.
- `git diff --check`: passed.

The initial type check used the adjacent checkout's installed dependencies through
a temporary link, which was removed afterward. The independent reviewer later
reported a successful clean `bun install --frozen-lockfile` and reproduced all
three checks with tscircuit 0.0.1253 and TypeScript 5.9.3. That is attributed review
evidence, not a replacement account of the original run.

Targeted review-response probes also confirmed that candidate-only rewiring is
rejected even though comparing two identical graphs with an open connection
passes. The latter is a reason for separate lint, not a failure of labelled
comparison. Valid references assigned to `lf` and `1f` reproduce the owner-typo
risk; an unknown `R2` is rejected in the existing fixture. The review's example
of a two-entry map producing three modules needs additional fixture context.

To reproduce the groundwork checks in this worktree:

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
git diff --check
```

These results establish only the groundwork's behavior. Pultec source fidelity,
actual module export equivalence, AC response, standalone substitutes, component
selection, and hardware measurements remain unverified.

The AC simulation harness (`lib/sim/ac.ts`, tested by `tests/sim/ac.test.ts`) was
validated against `eecircuit-engine` 1.5.8 (ngspice compiled to WASM, already a
transitive dependency) using an RC lowpass fixture with a closed-form response
(`R1 in out 1000`, `C1 out 0 159.1549431n`, corner frequency 1 kHz), matching the
analytic magnitude and phase to within 1e-9 and 1e-6 respectively at 10 Hz, 1 kHz,
and 100 kHz. This validates only the simulation harness itself — that it can drive
the WASM engine, extract complex AC data, and surface the engine error observed
for a malformed resistor line. The engine-error test asserts that engine message
in full, so it pins the `genuineErrors` path specifically and cannot be satisfied
by the separate non-complex-data-type rejection. It does not validate any Pultec
circuit, module, or netlist; those remain unverified
until they are exercised through this same harness in later tasks.

The export round-trip (`lib/export/circuit-json.ts`, tested by
`tests/export/circuit-json.test.ts`) was validated against a synthetic two-module
passive fixture (`tests/export/fixtures/two-module.tsx`): a resistor, capacitor,
and inductor split across `LF_`/`HF_` module prefixes, connected through named
tscircuit nets and flattened to canonical reference names. `toLabelledNetwork`
reproduces the fixture's independently authored expected `PassiveNetwork` exactly,
confirming that component identity, pin identity, named-net identity, and
inductance (which tscircuit emits as an unparsed string) all survive the export
adapter for this fixture shape.

Pin identity survives through an explicit `ExportMapping.pinNames` entry rather
than by passing tscircuit's emitted port names through. tscircuit names a
two-terminal passive's ports `pin1`/`pin2`, while `resolveNetwork` requires
two-terminal elements keyed `a`/`b`; `pinNames` is what joins those two seams,
and an emitted port with no entry throws. A further test chains
`toLabelledNetwork` → `resolveNetwork` → `toSpiceNetlist` on the same rendered
fixture, so the route from a rendered tscircuit board to a SPICE deck is exercised
end to end rather than assumed.

A deliberate miswire of that same fixture (`renderTwoModule(true)`, which moves
`LF_C1.pin1` from the `MID` net to `GND`) produces a well-formed but different
network and was confirmed to fail `assertSameTopology`, proving the comparison
is not a check that always passes. Before this task, that failure's message was
the generic "Passive topology differs from reference", which did not identify
which component had moved. `assertSameTopology` now compares per element by
reference and reports the first element missing from the candidate, the first
element present in both but differing, or an element in the candidate that the
reference does not have; a remaining signature mismatch after every element
matches is reported as a ports difference. The missing and differing branches
walk the reference's references in deterministic sorted order, so which of
several differences is reported is stable. The extra-reference branch walks the
candidate in insertion order and carries no such ordering guarantee. For the miswire fixture the thrown message now names `C1` directly
instead of requiring the caller to diff two serialized signatures by hand.

These two results — the round-trip and the miswire rejection — validate the
export and comparison tooling only. No Pultec circuit has been transcribed,
simulated, or partitioned using this adapter or this fixture. Source fidelity,
module export equivalence, AC response, standalone substitutes, component
selection, and hardware measurements all remain unverified, exactly as stated
above for the groundwork checks and the AC simulation harness.

Step 0's four completion-evidence items are now all satisfied by tooling, not
by any Pultec-specific result:

- [x] A reproducible analytic simulation check — the AC harness's RC-lowpass
  fixture above, matched to closed-form magnitude and phase.
- [x] A passing export round-trip with a failing miswire case — this section.
- [x] Typed tests — `tests/topology.test.ts` and `tests/export/circuit-json.test.ts`
  are TypeScript, typed against `PassiveNetwork`/`MutablePassiveNetwork`, and run
  under `bun run typecheck`.
- [x] Targeted validation tests — across every delivered module, not only the two
  files named under "Typed tests" above:
  - `tests/topology.test.ts` — mutation rejection (rewiring, parameter changes,
    missing/extra components, duplicate references, swapped ports, invalid
    ownership) for `lib/passives/topology.ts`.
  - `tests/units.test.ts` — SI suffix parsing and rejection of unparseable
    values for `lib/passives/units.ts`.
  - `tests/control-state.test.ts` — pot expansion, switch merging, port
    rewriting, and rejection of missing/invalid control settings, missing
    contacts, missing pot terminals, non-`a`/`b` pin keys, unconnected ports and
    a missing ground port, for `lib/passives/control-state.ts`,
    `lib/passives/net-preference.ts` and `lib/passives/union-find.ts`.
  - `tests/owners.test.ts` — the allowed-owner check, a named deliverable, for
    `partitionTopology` in `lib/passives/topology.ts`.
  - `tests/connectivity.test.ts` — the connectivity lint, also a named
    deliverable: singleton nets, declared opens, external ports, and
    disconnected islands, for `lib/passives/connectivity.ts`.
  - `tests/sim/netlist.test.ts` — SPICE emission, the source/load environment,
    and rejection of emitted-node and component-name collisions, for
    `lib/sim/netlist.ts`.
  - `tests/sim/ac.test.ts` — the AC harness's analytic agreement and its engine
    error, data-type and empty-request paths, for `lib/sim/ac.ts`.
  - `tests/sim/compare.test.ts` — magnitude and phase tolerance comparison for
    `lib/sim/compare.ts`.
  - `tests/export/circuit-json.test.ts` — the export adapter's rejection tests
    (unmapped component, net and pin; unnamed net group; conflicting nets;
    dangling pin), the miswire negative case, and the end-to-end export →
    resolve → netlist chain, for `lib/export/circuit-json.ts`.

Step 0 is now complete as scoped. It remains a tooling milestone: it establishes
that the simulation and export mechanisms work and that the comparison gate has
teeth, not that any Pultec-specific circuit, module, or measurement has been
validated. Step 1 (the reference transcription) is unaffected and remains
pending.
