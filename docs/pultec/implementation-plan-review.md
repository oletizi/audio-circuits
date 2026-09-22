# Review: Pultec modularization implementation plan

> ## SUPERSEDED — HISTORICAL RECORD ONLY.
>
> This reviews a plan that is itself superseded. Every `lib/passives/`, `lib/export/`
> and tscircuit reference below describes a repository that no longer exists. Current
> canon: `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` and
> `CLAUDE.md`.

Reviewed document: [implementation-plan.md](implementation-plan.md).
Branch: `feature/pultec-modularize`.

Round one reviewed the plan at commit `daeb888` on 2026-09-19. Round two reviews
the revision at commit `bff794b` and records corrections to round one. Round-one
findings are kept intact below, with corrections marked inline, because the plan
cites them.

## Round one

### Verification of the document's claims

Every recorded result reproduces from a clean state in this worktree. There was
no `node_modules` present; `bun install --frozen-lockfile` succeeded (tscircuit
0.0.1253, typescript 5.9.3), after which:

| Check | Result |
| --- | --- |
| `bun test` | 9 pass, 0 fail, 10 expect() calls, 1 file |
| `bun run typecheck` | exit 0 |
| `git diff --check` | exit 0 |

The change-inventory table is accurate. The README claim about removing the
composition example checks out: the deleted example imported `LowCutFilter`
from `"../../modules"`, which was both unimplemented and a directory import the
project conventions forbid.

The document's principal virtue is that it does not overclaim. "Agreement
between two models derived from the same mistaken transcription is insufficient
evidence of source fidelity" and the closing inventory of what remains
unverified are the correct instincts and are uncommon in a status document.

### 1. Three of six steps gate on AC simulation that is scoped nowhere

Steps 2, 4, and 5 each carry completion evidence requiring magnitude/phase
comparison, and the design notes additionally demand sweeps across every
frequency selection plus simultaneous LF boost and cut. No simulator is named
in the plan, in the design notes, or in `package.json`. Step 2 says only to
record the "simulation method/version," which presumes the method exists.

This is the plan's largest unscoped dependency. Select the engine and prove it
against a network with an analytic answer (a plain RC section) before it sits
on the critical path for a twenty-element transcription.

### 2. Step 1's completion gate may be unsatisfiable as written, and the whole sequence is serialized behind it

The design notes record that the only inspected drawing is explicitly "not yet
an approved factory EQP-1A reference," and that the Purple Audio manual
retrieval failed. Step 1 then requires "no unresolved connection or parameter
needed for the selected reference configuration." If a second independent
source never materializes, steps 2 through 6 never start.

State the fallback explicitly rather than discovering it: proceed on a labelled
*candidate* reference carrying a recorded unresolved-items list, and attach the
corroboration requirement to hardware and build claims rather than to all
downstream work.

### 3. The data model has no notion of control state, and the plan defers that fork to a hand-wave

`PassiveNetwork` is a single static graph. A potentiometer retains three
terminals but has no wiper position; a switch retains its contacts but has no
selected state. Yet the validation gates require sweeping selections and
settings, which means a network is in truth a *function* of a control-state
vector.

Step 2's instruction to "extend the representation with validated control
states" does not decide the shape. The fork — a state-parameterized network
versus switches as elements resolved at elaboration time — propagates into the
partition, the export adapter, and every AC comparison. Decide it during step
1/2 design. Retrofitting it once a partition exists is expensive.

Related: `parameters` is `Record<string, string>` and `assertSameTopology`
compares it by exact string equality, so differences that carry no electrical
meaning can register as topology mismatches. Move to structured parameters, or
a normalizing parser, before that data lands.

> **Correction (round two).** Round one also named top-level key order as a
> source of spurious mismatch. That was wrong: `sortedEntries` sorts top-level
> parameter keys before comparison, so key order is already normalized. The
> exposure is confined to the contents of the value strings, including any
> nested structure encoded inside them. The revised plan states this correctly.

### 4. The step-4 export adapter is the riskiest unproven capability and receives one paragraph

Reading tscircuit's emitted connectivity and resolving module prefixes and
connector conductors back to canonical reference identifiers may or may not be
practical against tscircuit's actual output. Nothing about that work depends on
the Pultec reference. It can be de-risked immediately against the existing
`opamp-buffer` module, in parallel with steps 1 through 3, instead of surfacing
as a blocker inside step 4.

### 5. `validate()` accepts floating nets

Verified by direct probe: a network in which `C1.b` connects to net `nowhere`
and nothing else passes `assertSameTopology` cleanly. `validate()` checks
duplicate and empty references, a two-pin minimum per element, non-empty
pin/net strings, and that each declared port resolves to some known net. It
never checks the converse — that each net reaches at least two terminals.

A node with exactly one connection is a common transcription slip, and nothing
in the current tooling reports it.

> **Correction (round two).** Round one proposed a blanket minimum-two-terminals
> rule inside `validate()`, and framed the behavior as a defect in labelled
> comparison. The revised plan's rebuttal is correct and is accepted. Two points
> stand against the round-one framing:
>
> 1. A blanket rule would reject legitimate external ports and deliberately open
>    switch contacts, and it would still pass a network that had split into two
>    disconnected islands whose nets each reach two terminals. It is both too
>    strict and too weak.
> 2. The probe compared a floating network against *itself*, so it demonstrated
>    only that `assertSameTopology` is reflexive. It was never evidence that
>    labelled comparison is unsound.
>
> The correct home for this is the separate connectivity lint the revised plan
> adds in step 0, kept distinct from strict reference comparison. The underlying
> observation — that nothing currently reports a singleton net — still holds.

### 6. `partitionTopology` accepts any owner string

Verified by direct probe: `{ R1: "lf", R2: "1f" }` was accepted rather than
rejected. The function rejects unknown and missing *references* but places no
constraint on *owners*. Since ownership will be hand-authored across dozens of
components, validate owner names against the allowed set.

> **Correction (round two).** Round one reported that this probe produced three
> modules and promoted every net to a boundary net. Both details were artifacts
> of a two-component fixture and were wrong as stated: that probe produced two
> modules, `lf` and `1f`, and its two nets were already shared.
>
> The revised plan asked for fixture context, which round two supplied. On a
> three-component network with an intended `lf`/`hf` split, a one-character typo
> does produce a phantom third module:
>
> ```
> intended lf/hf map  -> modules: [ "lf", "hf" ]       boundary: [ "mid" ]
> one-char owner typo -> modules: [ "lf", "1f", "hf" ] boundary: [ "mid" ]
> ```
>
> Note that the boundary-net list is unchanged between the two, so the phantom
> module is not visible in the derived shared-node output. The finding stands;
> the round-one description of its symptoms did not.

### 7. The sole test file is JavaScript and sits outside the typecheck

`tsconfig.include` is `**/*.ts` and `**/*.tsx`, so `tests/topology.test.js` is
never type-checked, and its fixtures are never verified to satisfy
`PassiveNetwork`. The interface's only consumer does not typecheck against it.
Against the repository's stated "never bypass typing" posture this is backwards.

### Smaller items (round one)

- `tsconfig.json` still carries `outDir`, `rootDir`, and `sourceMap`, all inert
  under `noEmit: true`.
- The verification record's note about a "temporary link" to the adjacent
  checkout is stale.
- Step 3 proposes `reference/pultec/partition.ts` while step 1 places the
  netlist in the same directory as data. A single format for both would avoid
  splitting the reference across TypeScript and data files.

## Round two: the revised plan

### Disposition of round-one findings

| Finding | Disposition in the revision |
| --- | --- |
| 1 — unscoped AC simulation | Addressed. New step 0 requires engine selection, recorded version and invocation, an analytic RC check with stated conventions and tolerances, and blocks AC comparison from becoming an acceptance gate until it passes. |
| 2 — unsatisfiable step-1 gate | Addressed. Step 1 now splits a provisional candidate deliverable from final corroborated acceptance, and the governing qualifications permit candidate work while barring fidelity claims. |
| 3 — no control-state model | Addressed, and sharpened. "Partition the physical model, not the resolved graph" is the right call and is stronger than the round-one framing. |
| 4 — unproven export adapter | Addressed. Moved into step 0 as a feasibility exercise with a required failing miswire case. |
| 5 — floating nets | Corrected rather than adopted. See the correction above; the revision's separate-lint design is better than what round one proposed. |
| 6 — unchecked owner names | Addressed. Checked at the Pultec boundary with the generic helper left reusable, which is the right placement. |
| 7 — untyped test file | Addressed, with a caution round one missed. See below. |
| tsconfig nits | Partly accepted. Keeping `rootDir` is defensible; it is inert under `noEmit` but harmless. |
| Verification record | Addressed, and the attribution of clean-install evidence to the reviewer rather than folding it into the original run is the correct handling. |

The revision's caution that "renaming alone is insufficient" for the test file
is correct, and round one understated the work. Verified by renaming a copy and
running `tsc`, which produced three distinct failure classes:

1. `error TS2307: Cannot find module 'bun:test'`. The `types` array is
   `["tscircuit"]`, which suppresses automatic `@types` inclusion. Adding
   `"bun-types"` to that array clears it — confirmed, zero `bun:test` errors
   afterward. `bun-types` is currently present only as a transitive dependency,
   so it should be declared directly rather than relied on by accident.
2. `error TS2345` on both fixtures: object literals infer `kind: string`, which
   is not assignable to the `PassiveElement` union. The fixtures need `as const`
   on `kind`, or a `satisfies PassiveNetwork` annotation.
3. `error TS7006` implicit `any` on every mutation callback parameter.

A fourth class appears only after the fixtures are typed: `elements` is a
`readonly` array and `pins`/`parameters` are `Readonly` records, so
`n.elements.pop()` and `n.elements[2].pins.wiper = "out"` will not compile
against `PassiveNetwork`. This is exactly the "explicit mutable fixture types"
the revision calls for, and it is the bulk of the conversion work.

### New findings on the revision

**A. Step 2 bundles a reference-independent software contract with
reference-dependent validation, which re-serializes the parallelism the plan
just established.** Step 2 now contains two separable bodies of work: the
control-state and structured-parameter contract, which depends on no
authoritative reference and could proceed against a candidate netlist; and the
unsplit circuit model plus AC validation, which depends on both the candidate
reference and step 0's engine. The plan states that the contract must settle
before the production partition and export adapter depend on it — so step 3 is
now transitively blocked behind AC validation work it does not need. Splitting
step 2 into a contract sub-step and a modeling sub-step would preserve the
parallelism the plan's own preamble argues for.

**B. Step 0's connectivity lint has a forward dependency on step 2.** The
hardening bullet asks the lint to test disconnected subnetworks and intentional
opens "using resolved control states where necessary," but the control-state
resolver is defined in step 2. Either the control-state-dependent lint cases
move to step 2, or the resolver contract moves into step 0. As written, step 0
cannot complete as specified.

**C. Step 0 types the tests against a `PassiveNetwork` that step 2 will
change.** The hardening work types fixtures against the current flat-string
`parameters`; step 2 then replaces those with structured parameters and
canonical units. The rework is small and the sequencing is not wrong, but the
parameter-shape decision is the same kind of type-shape decision as the
control-state contract. Settling both together would avoid typing the fixtures
twice.

**D. Candidate status is established at the top of the plan but not restated
where it is most likely to be misread.** The governing qualifications and the
sequence preamble both require candidate outputs to be marked. The completion
evidence for steps 3 through 6 does not repeat it, and those are the blocks a
future reader will quote when declaring a step done. One clause in the step 4
and step 5 completion evidence — that results inherit candidate status until
step 1's final gate passes — would close the gap cheaply.

### Assessment

The revision answers every round-one finding on the merits, rejects two of them
with correct reasoning, and is a materially better plan than the document round
one reviewed. Step 0 is the most valuable addition: it converts the two
capabilities with unknown feasibility into bounded exercises with negative tests,
ahead of any dependency on them. The remaining findings are sequencing details
within step 0 and step 2, not defects in the approach.
