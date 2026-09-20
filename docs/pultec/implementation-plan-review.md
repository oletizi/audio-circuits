# Review: Pultec modularization implementation plan

Reviewed document: [implementation-plan.md](implementation-plan.md).
Branch: `feature/pultec-modularize`. Review performed 2026-09-19 against the
working tree, not against the document's own account of itself.

## Verification of the document's claims

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

## Substantive findings

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
compares it by exact string equality. Encoding a switch contact table or a
tapped-winding model as a flat string means whitespace or key-order differences
between two honest transcriptions register as topology mismatches. Move to
structured parameters, or a normalizing parser, before that data lands.

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

A node with exactly one connection is the most common transcription slip, and
it is silently accepted by the tool whose stated purpose is catching
transcription errors. Add a minimum-two-terminals check, with an explicit
opt-out for deliberately open test points, plus a test case. The existing
"extra termination" case does not cover this: its added `R2` duplicates `R1`'s
pins and leaves no net dangling.

### 6. `partitionTopology` accepts any owner string

Verified by direct probe: `{ R1: "lf", R2: "1f" }` was accepted, silently
producing three modules and promoting every net to a boundary net. The function
rejects unknown and missing *references* but places no constraint on *owners*.
Since ownership will be hand-authored across dozens of components, take the
allowed owner set as a parameter and reject anything outside it.

### 7. The sole test file is JavaScript and sits outside the typecheck

`tsconfig.include` is `**/*.ts` and `**/*.tsx`, so `tests/topology.test.js` is
never type-checked, and its fixtures are never verified to satisfy
`PassiveNetwork`. The interface's only consumer does not typecheck against it.
Against the repository's stated "never bypass typing" posture this is backwards.
Rename the file to `.ts`; bun runs TypeScript natively.

## Smaller items

- `tsconfig.json` still carries `outDir`, `rootDir`, and `sourceMap`, all inert
  under `noEmit: true`. Drop them or record why they remain.
- The verification record's note about a "temporary link" to the adjacent
  checkout is stale. The documented reproduction sequence works unmodified in
  this worktree, as confirmed above. Replace the note with that plainer
  statement.
- Step 3 proposes `reference/pultec/partition.ts` while step 1 places the
  netlist in the same directory as data. Keeping the ownership map in the same
  format as the netlist would avoid splitting the reference across TypeScript
  and data files.

## Disposition

Findings 5, 6, and 7, together with the two configuration and record cleanups,
are mechanical and can be applied against the current groundwork. Findings 1
through 4 are plan-level decisions and are left to the author.
