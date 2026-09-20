# Pultec modularization: proposed changes and implementation status

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
| `tests/topology.test.js` | Exercises partition preservation and rejects rewiring, parameter changes, missing/extra components, duplicate references, swapped ports, and invalid ownership using a synthetic fixture. |
| `package.json` | Adds `bun run test` as the standard entry point for the connectivity tests. |
| `tsconfig.json` | Enables explicit TypeScript import extensions used by existing modules and sets `noEmit` for type checking; circuit output remains the responsibility of tscircuit. |

The topology utility preserves canonical reference names. It deliberately rejects
renaming and alternative equivalent circuits. Its string parameter maps are an
initial representation, not a complete simulator model or a validated switch/
inductor schema. It does not infer pot behavior, validate switch contact tables,
model coupled windings, or resolve physical connector wiring.

No Pultec circuit exports, PCB layouts, fixed connector assignments, BOM, or
manufacturing files have been implemented. The existing buffer demo is unchanged.

## Proposed implementation sequence

Reference research and the feasibility exercises below can proceed independently.
Candidate transcription, exploratory simulation, and provisional partitions need
not wait for corroboration. Mark all such outputs with the candidate source and
unresolved assumptions. Resolve the control-state contract before implementing
the production partition or export adapter. Final acceptance gates still apply.

### 0. Establish validation tooling — pending

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

### 1. Establish the reference — pending

Proposed location: `reference/pultec/`.

- Identify the exact source version and record URL, revision/date, retrieval
  details, and a digest for any retained source artifact. Record permissions if
  source images are redistributed; the current documentation only links sources.
- Reconcile the candidate reverse-engineered drawing with original filter
  documentation or an independently documented tracing. Keep uncertain values
  and junctions explicitly unresolved rather than filling them from memory.
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

### 2. Model and validate the unsplit circuit — pending

Proposed locations: `reference/pultec/` for independent expected data and
`tests/pultec/` for reference validation fixtures and simulation checks.

- Keep a physical source model containing every pot terminal, switch contact,
  ganging relationship, and winding/tap relationship. Define a separate typed
  control-state vector and an explicit resolver from source model plus state to
  a simulation network. Partition the physical model, not the resolved graph;
  unselected contacts remain part of the hardware description.
- Compare the unsplit and composed simulation networks at identical control
  states. Reject invalid selections rather than supplying implicit defaults.
- Replace flat string encodings of electrical structure with validated structured
  parameters and canonical units. Separate source annotations from electrical
  identity so provenance-only edits do not count as rewiring. Current top-level
  parameter keys already sort consistently; the remaining risk is nested
  structured data encoded inside strings.
- Settle and test this contract before the production partition and export adapter
  depend on it. Include control extremes, intermediate pot positions, ganged
  selection, and winding/tap behavior required by the candidate reference.
- Create an unsplit circuit model using the engine validated in step 0. Record
  the source/load model, control settings, simulation method/version, sweep range,
  and numerical tolerances.
- Validate representative responses against trustworthy reference evidence where
  available, particularly simultaneous LF boost/cut and HF bandwidth behavior.

Completion evidence: reviewed connectivity plus a reproducible reference response
set. Agreement between two models derived from the same mistaken transcription
is insufficient evidence of source fidelity.

### 3. Define the physical partition — pending

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

### 4. Implement LF/HF tscircuit modules — pending

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

Initial groundwork checks completed on 2026-09-19:

- `bun test`: 9 tests passed, using a synthetic bridge fixture.
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
