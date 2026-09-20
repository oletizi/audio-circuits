# Pultec modularization: proposed changes and implementation status

Branch: `feature/pultec-modularize`.

This document records the proposed repository changes and their acceptance
criteria. It distinguishes groundwork already implemented from circuit design
that remains pending. Update the status and evidence here as each step lands.
The [design notes](README.md) contain source links, electrical constraints, and
the reference transcription checklist.

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
- Give every part and terminal a stable identifier. Preserve winding coupling,
  tap selection, ganged switches, and control direction/taper in the model.

Completion evidence: a reviewed source-to-netlist mapping with no unresolved
connection or parameter needed for the selected reference configuration.

### 2. Model and validate the unsplit circuit — pending

Proposed locations: `reference/pultec/` for independent expected data and
`tests/pultec/` for reference validation fixtures and simulation checks.

- Extend the representation with validated control states and winding information
  as the source requires; do not encode unsupported assumptions as defaults.
- Create an unsplit circuit model and record the source/load model, control
  settings, simulation method/version, sweep range, and numerical tolerances.
- Validate representative responses against trustworthy reference evidence where
  available, particularly simultaneous LF boost/cut and HF bandwidth behavior.

Completion evidence: reviewed connectivity plus a reproducible reference response
set. Agreement between two models derived from the same mistaken transcription
is insufficient evidence of source fidelity.

### 3. Define the physical partition — pending

Proposed location: `reference/pultec/partition.ts` plus a connector table in
`docs/pultec/` (filenames may change to suit the validated model).

- Assign each reference component once to LF or HF. Resolve shared elements
  explicitly before finalizing the partition.
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

Add an adapter that reads the actual emitted circuit connectivity, resolves
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
a temporary link, which was removed afterward. To reproduce in this worktree:

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
git diff --check
```

These results establish only the groundwork's behavior. Pultec source fidelity,
actual module export equivalence, AC response, standalone substitutes, component
selection, and hardware measurements remain unverified.
