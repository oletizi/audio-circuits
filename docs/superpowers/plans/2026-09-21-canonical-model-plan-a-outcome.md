# Plan A — outcome

Completed 2026-09-22 on `feature/canonical-circuit-model`. 25 commits.
Plan: `2026-09-21-canonical-model-plan-a.md`. Spec:
`../specs/2026-09-21-canonical-circuit-model-design.md` (revision 3).

This records what Plan B and Plan C need to know. It is not a retelling of the plan.

## What landed

`lib/model/` — `Network`/`Component`/`Unit`, canonical per-kind pin vocabularies,
structural validation, the `circuit()` builder, `include()` composition.
`lib/kicad/` — readers for the KiCad s-expression and EESchema legacy netlist formats.
`circuits/pt2399-core.ts` — the first circuit in the canonical model.
Deleted: six tscircuit Pultec modules, `lib/passives/` (consolidated into `lib/model/`),
and `lib/export/circuit-json.ts` — a 290-line translation seam that existed only because
the repository held two representations of the same thing.

| | tests | files | runtime |
|---|---|---|---|
| before | 197 | 27 | 196.4 s |
| after | 155 | 19 | 1.34 s |

The removed runtime was tscircuit rendering a schematic nobody was going to read.

## The verification that matters

`pt2399-core` is transcribed from the netlist of a board that was physically built and
works. Two independent exports of that schematic exist — an EESchema legacy netlist fed to
VeroRoute (which produced the built perfboard) and a later KiCad s-expression export. They
agree, and the circuit agrees with both: 24 components, 21 nets.

The whole-branch review established by **mutation probe** that
`tests/circuits/pt2399-core.test.ts` cannot pass with a wrong circuit. Value changes to a
resistor and a capacitor, a pin rewire, an `a`/`b` flip, a pin turned into a no-connect, an
IC pin swap and a deleted component were all detected. Only a package-level pin mutation
survives, and validation provably forces `pins: {}` on every kind present in this circuit.

## Obligations carried into Plan B

1. **Unify the two network types first.** `lib/model/topology.ts` still defines
   `PassiveNetwork` alongside the new `Network`, and both files export a function called
   `validateNetwork` (`validate.ts:57`, `topology.ts:71`) validating different types.
   `reference/pultec/`, `control-state.ts` and all of `lib/sim/` are typed against the old
   one. This is the one place Plan A knowingly leaves two representations.
2. **Generalise `resolveNetwork`.** It requires exactly two pins keyed `a`/`b`, and the
   SPICE emitter reads `pins.a`/`pins.b` directly. Active devices cannot simulate until
   both handle named, arbitrary-arity pins.
3. **The pt2399 test harness reads only unit-level pins.** `tests/circuits/pt2399-core.test.ts`
   walks `units[].pins` and never `Component.pins`. Inert for this circuit — nothing here
   has package pins — but **the first op-amp circuit verified this way would have `v+`/`v-`
   unchecked while reporting success.** Fix before the first active circuit, not after.
4. **`include()` has no end-to-end evidence.** Spec rung 3 wanted composition proven by a
   real circuit; `pt2399-core` never calls `include()`. It has unit tests and no more.
5. **A value's unit is never cross-checked against its component kind** — recorded as an
   open question in `reference/pultec/unresolved.md`. `parseValue` accepts `10k` for a
   capacitor.

## Notes for Plan C

- `reference/pultec/source/*.net.xml` and the pedals repository's `pt2399-core.kicad_sch`
  are real hand-drawn artefacts, suitable as fidelity-gate fixtures.
- The two pt2399 netlists are proven equal, so the `.kicad_sch` describes hardware known to
  work — which is what licenses using it as a fixture.
- The "floating symbol pin → single-member `unconnected-(...)` net → declared port" pattern
  (PT2399 pin 5) has no convention or helper. Auto-generating circuits from `.kicad_sch`
  will hit it repeatedly.
- `CLAUDE.md` still documents tscircuit conventions. Deliberately deferred: Plan C removes
  the dependency.

## Two lessons worth keeping

**Synthetic fixtures cannot surprise you.** The legacy netlist parser had 19 tests, two fix
rounds, two reviews and a scoped re-review — all green. The first real file broke it
immediately: EESchema appends a bare `*` as an end-of-file marker and no fixture we wrote
carried one. Fixtures encode what the author already believed.

**Naming one instance of a bug class invites fixing that instance.** A silent `continue`
that swallowed a stray token was fixed as instructed; the identical hole one token type
over — a stray `)` — survived, and was caught later by a reviewer who built malformed input
and ran the real parser rather than reading it. Both would have let a corrupted netlist
parse partially and report success.

## Known-untested, deliberately

Twelve throwing error paths in `lib/kicad/` have no tests. Judged acceptable: they fail
loudly, and both parsers are validated end-to-end against two independent real exports of a
physically built board that agree with each other and with the circuit. `footprint ?? ""`
and `sexpr`'s empty-form-name case were traced and both degrade into a loud throw.
