---
title: Porting the pt2399-core circuit and the perfboard workflow from the pedals repository
date: 2026-09-21
status: approved-design
---

# Porting the pt2399-core circuit and the perfboard workflow

## Problem

The `pedals` repository (`oletizi/pedals`, branch `feature/perfboard`) carries two things
that belong here instead:

- **A working pt2399-core circuit.** 24 parts around a PT2399 delay chip, with the pots,
  jacks and footswitch deliberately off-board behind a five-pin header.
- **A perfboard workflow.** A hand-authored stripboard layout that is checked against the
  circuit by a forked VeroRoute, so a layout cannot silently drift from the circuit it was
  built from. The operator has built this board; `pt2399-core.perfboard.vrt` is the layout
  they are actually using, and the commit that introduced it is titled "perfboard seems
  functional".

The workflow is the more valuable of the two and the harder to reproduce. Its design is
recorded in `docs/superpowers/specs/2026-09-16-perfboard-layout-design.md` in that
repository, and that document remains the authority on *why* the workflow is shaped the way
it is. This document is about what changes when it moves to a tscircuit repository, and what
does not.

## What does not change

These decisions are inherited wholesale from the perfboard design and are restated here only
because the port must not quietly drop them:

- **Layout is authored by hand; the tool verifies and reports.** Nothing places parts. A
  from-scratch solver run on every circuit change would destroy the hand layout, the build
  notes, and any partially populated physical board.
- **Net identity is membership, not name.** A net is the set of `(reference, pin)` nodes
  carrying it. Names are descriptive metadata for reports and are never identity keys.
- **The circuit is strictly upstream.** Nothing flows from the layout back into the circuit
  source. The layout is a derived artifact in the sense a `.kicad_pcb` is.
- **Strip cuts are derived, never authored.** `AutoFillVero()` generates breaks from node
  assignment, so a break cannot contradict the netlist.
- **The report is carried verbatim and parsed nowhere.** `ok` comes from the exit code
  alone. A circuit-clean board has no `Schematic delta` section at all — the heading is
  omitted, not left empty — so any rule reading ok-ness out of the body would call an
  unrouted board clean.
- **Off-board parts connect by flying leads from board-edge pads.** Pots, jacks, footswitch
  and LED are not placed on the grid.

## The finding that reshapes the port

The `pedals` workflow derives a part's VeroRoute geometry from its **KiCad footprint name**.
`tools/veroroute/deriveImportString.ts`, 463 lines, argues the rule for each footprint family
and refuses wherever the name does not settle the answer.

That input does not exist here. `circuit-json`'s `source_component` carries `ftype`, `name`,
`display_value`, `manufacturer_part_number` and `supplier_part_numbers` — and **no footprint
string**. The footprint prop is expanded into `pcb_plated_hole` / `pcb_smtpad` geometry and
the name is not retained.

What is retained is better. `pcb_plated_hole` carries `x`, `y`, `pcb_component_id` and
`pcb_port_id`, so this repository can derive a part's import string from **actual pad
geometry** rather than from a name. Two holes 0.4in apart *are* a `RESISTOR4`, whatever
anything is called.

This dissolves a failure class the perfboard design spends considerable effort guarding
against. Its `FOOTPRINT_IMPORT_STRINGS` override table exists for when "the name lies", and
its C3 story — an operator editing a KiCad footprint to a larger body type to buy pad span,
at the cost of the board misreporting the part's physical size — is a name lying on purpose.
Geometry cannot lie in that direction: a part whose pads are 0.4in apart occupies 0.4in.

### Where geometry is not enough

`CAP_ELECTRO_nnn`'s suffix is **body diameter in mils**, not pad span. No pad geometry
answers it, and neither does `circuit-json`. A radial electrolytic must therefore declare its
body diameter explicitly.

This is not a weakness of the geometry approach; it is the same asymmetry the perfboard
design already identified and named:

> Span is a layout property for radial parts, and a schematic property for axial ones.

An axial part's span is encoded in its pads and the netlist constrains it. A radial part's
body diameter is a fact about the physical part, its lead span is the layout's business, and
neither is visible in pad geometry. So: geometry derives axial span, row/column arrangement
derives pin-count types, and a radial electrolytic declares its diameter.

### Consequence: `deriveImportString.ts` is not ported

463 lines of careful KiCad-name reasoning, plus its 386-line test and the
`FOOTPRINT_IMPORT_STRINGS` override table it feeds, are deliberately left behind. They solve
a problem this repository does not have. Recorded here so the deletion reads as a decision
rather than an oversight, and so nobody ports them later believing something was missed.

## Decisions

### The module owns its reference designators

`modules/opamp-buffer/OpampBuffer.tsx` prefixes every part with its module name:
`${name}_C_IN`. That convention is right for reusable circuitry composed onto a board
several times over, and wrong here.

`pt2399-core.perfboard.vrt` is keyed on flat references — `C1` through `C14`, `R1` through
`R8`, `U1`, `J1` — because `Component::m_nameStr` holds the reference and reconciliation
matches parts by it. A module emitting `PT2399Core_C7` would reconcile as 24 parts removed
and 24 added floating, and the hand-refined layout would be worthless.

So: **a module that owns a perfboard owns its reference designators, and emits them flat.**
The prefix convention continues to govern modules that do not.

This is a real constraint, not a preference. It means two boards cannot both be built from
flat-ref modules onto one tscircuit board without a collision, which is fine — a board-owning
module is a whole board.

### Net names are free; references, import strings and values are not

Because net identity is membership, the ported module may name its nets whatever reads best
and reconciliation is unaffected. Renaming a net without changing its membership is a no-op
with routing preserved.

This matters concretely: the KiCad symbol carries typos (`LFP1-IN` for pin 16, `LFP2-OUT`
for pin 14) and inconsistent separators (`OP1-IN` beside `OP2_IN`). The port uses corrected,
consistent pin labels, and the corrected names cost nothing.

Three things are **not** free:

- **References** are part identity. They must match exactly.
- **Import strings** are layout-geometry identity. A change is a retype that destroys
  placement.
- **Values** are neither, but a value change is still a `Schematic delta` line, and
  `--check` exits 0 only when the plan is empty. A module emitting `100nF` where KiCad
  emitted `.1uF` would report a value delta on nearly every part and fail the gate.

### Value notation is reproduced by a formatter, at the export seam

The emitter reproduces KiCad's value spelling exactly. This is settled here rather than
deferred, because it is policy rather than discovery.

Two things it deliberately is **not**. It is not a property of the module: `PT2399Core.tsx`
declares idiomatic tscircuit values (`100nF`, `10k`) and carries no KiCad representation.
And it is not a hand-maintained per-reference table, because the notation turns out to be
derivable — a table would be a second place for one fact to be wrong, for no gain.

The policy, validated against all twelve distinct values in the fixture:

| Kind | Rule |
| --- | --- |
| Capacitance | below 10nF express in `pF`; 10nF and above express in `uF` |
| Resistance | express in `K` (uppercase) for 1kΩ–999kΩ |
| Both | strip a leading zero (`.1uF`, never `0.1uF`); strip a trailing `.0` |

This reproduces `560pF`, `5600pF`, `.01uF`, `.1uF`, `4.7uF`, `10uF`, `47uF`, `100uF`,
`10K`, `2.7K`, `15K`, `100K` — every value on the board, including the `5600pF` / `.01uF`
pair that sits either side of the 10nF boundary and looks arbitrary until the rule is stated.

Decades the fixture does not exercise — bare ohms, megohms, farads at or above 1000uF — are
**refused, not guessed**, per this repository's standing rule against fallbacks. Extending the
policy is then a deliberate one-line decision with a test, rather than a silent guess that
shows up as a value delta on a board nobody has checked.

This formatter is an artifact of the fork treating values as opaque strings. If the fork ever
compares values semantically, the formatter is deleted and the module's own notation flows
through. Recorded so its removal is recognizable as a completion rather than a regression.

### Board artifacts live in a board tree

```
modules/pt2399-core/     the electrical circuit, plus canonical through-hole
                         component geometry
boards/pt2399-core/      the hand-authored placement and routing that realizes it
                         on one physical piece of stripboard
```

The module is **not** substrate-independent, and calling it so would be wrong. It carries
through-hole footprints precisely so pad geometry can yield import strings, which is physical
realization information. What it does not carry is placement, routing, strip orientation or
board dimensions — those are the board's, and they are what a second build would vary.

So the split is: the module is reusable across through-hole boards; the board is one build.
Separating them means a second build — different strip orientation, a smaller board, a
different cut strategy — is a new directory rather than a conflict. `pedals` separates them too; its
`pt2399/pt2399-core/pt2399-core/` triple-nesting is an artifact of its family/board scheme
and carries no meaning here.

`perfboard.json` gains the same shape it has today, with `sch` renamed to name a tscircuit
entry point rather than a `.kicad_sch`:

```json
{
  "circuit": "../../modules/pt2399-core/pt2399-core.circuit.tsx",
  "vrt": "pt2399-core.perfboard.vrt"
}
```

Both paths resolve against the declaration's own directory, unchanged from `pedals`.

### The driver is one TypeScript CLI, not `make`

`pedals` drives the workflow from four `.mk` files over `pnpm`. This repository is bun plus
`package.json` scripts plus `bun test`, and the operator's standing rule puts enforcement in
CLI verbs rather than in a side channel.

The genuinely good idea in that make layer is **the directory you are standing in is the
context** — `cd` to a board and `check` checks that board; run it higher up and it walks
down. That idea is portable and is kept. The `.mk` files themselves are not.

```
bun run perfboard check        this board, or every board when run higher up
bun run perfboard cuts         the cut list and solder bridges
bun run perfboard update       apply the circuit to this layout, in place
bun run perfboard stripboard   convert to strip mode, in place
bun run perfboard edit         open in the forked VeroRoute
bun run perfboard board-info   what this directory declares
bun run perfboard boards       every declared board
bun run perfboard veroroute    acquire and build the pinned fork
```

`runCli(argv, opts)` returns an exit code with injected dependencies, following
`perfboard-sync.ts`'s structure, so every verb is testable under `bun test` with no binary
present and no board on disk. `package.json` gains one script, `"perfboard": "tsx
tools/cli/perfboard.ts"`, alongside the existing `dev` / `build` / `test` verbs.

### Import paths: relative in circuit sources, relative in tools

`CLAUDE.md` requires explicit relative file paths with extensions in circuit sources, because
tscircuit's web eval resolves neither directory imports nor path aliases. The `tools/` and
`lib/export/` layers never pass through that evaluator, so the `@/` alias would work there —
and `pedals` uses it throughout.

They nonetheless use relative paths here, for consistency within one repository. Every
existing file in `lib/` and `tests/` imports relatively with a `.ts` extension; a `tools/`
tree importing `@/perfboard/check` would be the only place in the repository doing so, and
the cost of the alias — a `tsconfig` `paths` entry that tscircuit's evaluator will ignore and
a reader has to know about — buys nothing at this size. Ported files are rewritten to
relative imports as they land.

The write/read split from `make/perfboard.mk` is preserved exactly: `check`, `cuts`,
`board-info` and `boards` write nothing; `update` and `stripboard` write the declared layout
**in place**, because git is the undo and a target that wrote a copy elsewhere and told you
to move it into position would hand you the one step that can go wrong.

#### The dirty-state guard is scoped to the layout, not the tree

The guard protects the file being destructively rewritten, and nothing else:

> refuse when the declared `.vrt` has modifications relative to `HEAD`, or is untracked.

A whole-repository cleanliness check would be wrong here. Editing `PT2399Core.tsx` and then
running `update` to reconcile the board against that edit is the *normal* workflow, and
forcing a commit of unrelated source first would obstruct the exact loop this tooling exists
to support.

Untracked is refused for the same reason modified is: `git checkout --` cannot restore a file
git has never seen, so the stated guarantee — git is the way back — would not hold.

### The fork stays external

`oletizi/veroroute-perfboard` is a GPLv3 Qt application with its own build. It is correctly
not vendored and not a submodule. `veroroute.pin` names an exact commit; `perfboard veroroute`
clones and builds it under `.tools/`; `VEROROUTE` overrides and, when set to anything other
than the built path, nothing is acquired or rebuilt — that checkout is the operator's.

The reasoning from `make/veroroute.mk` comes across intact: there is no guessed binary path.
The default names a file this repository is responsible for creating, and acquisition refuses
to exit 0 without it existing. A check that cannot find its binary stops the run naming what
to set, because a skipped perfboard check is indistinguishable from a passing one.

### The port proves itself against the original

`reference/pt2399-core/source/pt2399-core-veroroute.net` is checked in — the same pattern
`reference/pultec/source/*.net.xml` already establishes for material imported from elsewhere.

A test asserts the ported module's `circuit-json` resolves to connectivity identical to that
fixture. The port is then proven equivalent **for the properties VeroRoute reconciliation
depends on** — component identity, import string, value, and net membership as
`(reference, pin)` nodes. That is a narrower claim than "provably the same circuit", and the
narrower claim is the true one: the fixture says nothing about schematic placement, and
nothing about behavior the netlist does not encode.

**Membership is compared at `(reference, pin)` precision**, not at component-level
connectivity. This is the atomic identity the whole reconciliation model rests on, and
comparing anything coarser would pass a board where two pins of U1 had been swapped within
the same net set.

#### This cannot go through `toLabelledNetwork`

`toLabelledNetwork` is the existing export path, and it is unusable here. `kindForFtype`
throws on any `ftype` outside `{simple_resistor, simple_capacitor, simple_inductor}`, and
`U1` is `simple_chip` — so it does not merely lose precision on a 16-pin part, it refuses to
run. Its `PassiveNetwork` output is also keyed `a`/`b` per two-terminal element, which has no
representation for pin 13 of a DIP.

What *is* reusable is the layer underneath: `indexElements`, `buildUnionFind` and the group
naming that `netGroups` already sits on. Those are currently module-private. They are
factored into a shared internal module exporting a `(reference, pin) -> net` resolution, which
both `toLabelledNetwork` and the new OrcadPCB2 emitter consume. This is a real refactor of
existing code, not a new file alongside it, and `tests/export/circuit-json.test.ts` must stay
green across it.

Without this, `perfboard check` would confirm only that the layout matches whatever the
module now says. A transcription error would be carried by both sides and the gate would stay
green — the one verdict this workflow exists to prevent.

## Architecture

```
modules/pt2399-core/
  PT2399Core.tsx              flat refs, through-hole footprints, createGrid layout
  pt2399-core.circuit.tsx     board entry point
  index.ts

lib/chips/
  PT2399.tsx                  alongside TL072.tsx, same shape

lib/export/
  resolve.ts                  NEW - (reference, pin) -> net, factored OUT of
                              circuit-json.ts; consumed by both paths
  circuit-json.ts             EXISTING - toLabelledNetwork, rewired onto resolve.ts
  import-string.ts            NEW - ftype + pad geometry -> VeroRoute import string
  value-notation.ts           NEW - farads/ohms -> KiCad value spelling
  orcad.ts                    NEW - circuit-json -> OrcadPCB2 netlist

tools/perfboard/
  declaration.ts              ported: perfboard.json load + discovery
  check.ts                    ported: spawn, exit-code-only verdict, verbatim report
  render.ts                   NEW - render a circuit entry point to circuit-json

tools/cli/
  perfboard.ts                the verbs

boards/pt2399-core/
  perfboard.json
  pt2399-core.perfboard.vrt   carried across unchanged
  pt2399-core.perfboard.png

reference/pt2399-core/
  source/pt2399-core-veroroute.net    the KiCad netlist, as proof fixture
  README.md                           provenance

veroroute.pin                 the pinned fork commit
```

### Data flow

```
PT2399Core.tsx
    |  RootCircuit.render() / getCircuitJson()
    v
circuit-json  --------+
    |                 |
    | union-find      | pcb_plated_hole geometry
    v                 v
net membership    import strings
    \                /
     +--- orcad.ts --+
              |
              v
      OrcadPCB2 netlist (package field already holds the import string)
              |
              v
     veroroute --check <board.vrt> --netlist <file>
              |
      exit 0 / exit 1 + verbatim report
```

The netlist is regenerated on every run and written to a temp directory, so the comparison is
against the circuit as it is now rather than a checked-in netlist that may itself be stale.
This is unchanged from `pedals`.

### `lib/export/import-string.ts`

This is an identity boundary — a wrong import string is a retype that destroys placement — so
its contract is specified here rather than left to the implementation.

#### Geometry determines package geometry; component type determines package family

Derivation is **not** a pure function of pad geometry, and the argument above should not be
read as claiming it is. Two holes 0.4in apart are four grid steps of *something*; whether
that something is `RESISTOR4`, `DIODE4` or `CAP_CERAMIC4` is not a fact about the holes.

```
deriveImportString(ftype, padGeometry, physicalMetadata) -> importString
```

- `ftype` — from `source_component`, selects the VeroRoute family.
- `padGeometry` — the component's `pcb_plated_hole` positions, normalized (below).
- `physicalMetadata` — facts no geometry carries. Today this is exactly one field: a radial
  electrolytic's body diameter.

The family table is explicit and total; an `ftype` absent from it is refused rather than
defaulted, so a transistor or connector whose pads happen to look like a resistor cannot be
silently typed as one:

| `ftype` | Family |
| --- | --- |
| `simple_resistor` | `RESISTOR<n>` |
| `simple_capacitor` (film/ceramic) | `CAP_CERAMIC<n>` |
| `simple_capacitor` (electrolytic) | `CAP_ELECTRO_<declared diameter>` |
| `simple_inductor` | `INDUCTOR<n>` |
| `simple_diode` | `DIODE<n>` |
| `simple_chip` | `DIP<n>` or `SIP<n>` by row count |
| anything else | refused, naming the `ftype` |

#### Grid quantization

Pad coordinates are floating-point millimetres. `0.4in` is `10.16mm` and arrives as
`10.159999999999998`, so no derivation may compare distances for equality.

**Quantization is applied to intra-component pad differences, never to absolute
coordinates.** A component placed at an arbitrary `pcbX` has pads on no global grid
whatsoever while being a perfectly ordinary 0.4in resistor; quantizing absolute positions
would refuse it. What must land on the grid is the geometry *within* one component.

```
gridSteps(d) = round(d / 2.54mm),  accepted when |d - 2.54mm * gridSteps(d)| <= 0.0508mm
```

The tolerance is **2 mil**. It exceeds float noise by roughly eleven orders of magnitude, and
refuses a 0.39in pad span — 10 mil off — as firmly as the 0.37in case, so a footprint that is
merely close to a grid multiple cannot pass.

Classification is expressed rotation-invariantly, because a part may be placed at any angle:

- **Collinearity** by vector cross-product against the tolerance, not by comparing `y` values.
- **Pitch** by Euclidean distance, which rotation does not change.
- **Rows** by projecting pads onto the principal axis of the component's own pad cloud, not
  onto the board axes.

#### Row structure for `DIP<n>`

"Two rows" is not sufficient to establish a DIP. All of the following are asserted, and any
failure is a refusal naming the measurement that failed:

- both rows equally populated, and `n` even;
- uniform 100-mil pitch within each row;
- rows parallel, and pin *i* of one row transversely aligned with its counterpart;
- row spacing an exact grid multiple (300 mil for `DIP16`);
- every pad accounted for by one of the two rows.

#### Refusals teach

As the `pedals` refusals do: name the component, state the measurement observed and the
nearest grid value, and list the shapes that derive. A part whose holes are 0.37in apart
refuses naming `0.37in (nearest grid multiple 0.4in, off by 30 mil, tolerance 2 mil)` — never
a silent round to `RESISTOR4`.

Pin count remains a consistency assertion rather than a second identity key: a part whose pin
count disagrees with its import string is an error, because the symbol and footprint disagree.

## Testing

Per repository convention, `bun test`.

| Surface | Test |
| --- | --- |
| The module | net membership, references and values identical to the KiCad fixture |
| `import-string.ts` | each derivation shape; each refusal names its measurement |
| `orcad.ts` | emitted netlist reproduces the fixture |
| `declaration.ts` | absent / wrong-typed / empty fields are three messages |
| `check.ts` | exit 0, exit 1, and unexpected status throws; report carried verbatim |
| `perfboard.ts` | every verb, with injected deps; unknown flags; cwd resolution |

No test requires the VeroRoute binary. Assertions are on the report and on exit codes, never
on `.vrt` bytes — a `.vrt` is a versioned serialization artifact, so a byte-for-byte golden
fails when serialization changes without semantics changing, and passes a semantically wrong
board whose bytes happen to match. Byte comparison is used only to assert a board was *not*
modified.

## Implementation phases

1. **The pin-level resolution layer.** Factor `indexElements` / `buildUnionFind` / group
   naming out of `circuit-json.ts` into a shared internal module exposing
   `(reference, pin) -> net`. Existing pultec tests stay green. This lands first because both
   the proof and the emitter need it, and refactoring working code under a finished feature is
   worse than before one.
2. **The module.** `lib/chips/PT2399.tsx`, `modules/pt2399-core/`, flat refs, through-hole
   footprints, corrected pin labels.
3. **The proof.** Fixture checked in under `reference/`; test asserting identical references,
   values and `(reference, pin)` net membership. Phases 2 and 3 land together — the module is
   not trustworthy until it is proven.
4. **Import strings.** `lib/export/import-string.ts`: grid quantization, the family table,
   row-structure assertions, and a test per derivation shape and per refusal.
5. **The emitter.** `lib/export/orcad.ts` including the value formatter, asserted against the
   fixture.
6. **The declaration and check.** `tools/perfboard/{declaration,check,render}.ts`, ported.
7. **The CLI.** `tools/cli/perfboard.ts`, every verb, including the layout-scoped dirty-state
   guard.
8. **The fork.** `veroroute.pin`, the `veroroute` verb, `.gitignore` for `.tools/`.
9. **The board and the fixed-point acceptance.** `boards/pt2399-core/` with the carried
   `.vrt`, run to the fixed point specified above.

Phases 1–7 need no VeroRoute binary and are fully testable without one. Phase 9 is the
acceptance step and is where inherited discrepancies surface.

### Phase 9 acceptance: reaching a fixed point

A single green `check` is not sufficient acceptance for a reconciliation system. It can hide
a derivation that is wrong in a way the first pass happens to tolerate, or an emitter whose
output is only stable by accident. The acceptance contract is a round trip that settles:

1. `check` — record the report. Inherited deltas (C3's body diameter, any value or
   import-string residue) surface here.
2. Resolve each reported delta deliberately, against the physical board.
3. `update`, if the resolution requires it.
4. `check` — must exit 0.
5. `update` again — **must report an empty plan.**
6. `check` again — must exit 0.

Step 5 is the fixed point and the reason this is worth writing down. A reconciler that keeps
finding work to do on an unchanged input is wrong in a way steps 1–4 cannot reveal.

The assertion at step 5 is on **the plan being empty**, not on `.vrt` bytes. `--update`
re-serializes on every write, so byte-identity across an empty-plan update is plausible but
unverified, and promising it here would be asserting something about the fork this repository
has not established. Whether it holds is worth recording at phase 9; it is not a requirement.

## Risks and open questions

1. **C3's body diameter is a known inherited discrepancy.** The perfboard design records that
   the operator edited a KiCad footprint to buy pad span, and that
   `C3 retyped CAP_ELECTRO_300 -> CAP_ELECTRO_250` appears in every report of this board. The
   port carries C3 as `CAP_ELECTRO_250`, matching the netlist as it stands. **Do not
   pre-emptively "fix" this.** Whatever the first `perfboard check` reports at phase 9 is the
   ground truth, and it is resolved then, against the physical board.

2. **`pin_number` is optional in `circuit-json`.** `source_port.pin_number` is
   `number | undefined`. The emitter must refuse a component whose ports carry no pin numbers
   rather than inventing an ordering — pin numbers are how the `.vrt` addresses a part.

3. **Strip mode.** The perfboard design records this board's `m_bVeroTracks` as false
   (isolated-hole perfboard) as of 2026-09-16, and its twelve unrouted board-side nets as
   genuine. The layout has been worked on since. Phase 9 establishes the current state; the
   `stripboard` verb exists if conversion is wanted.

4. **Off-board pad provenance.** `J1`'s five pins become `J1_1`..`J1_5` on the board via
   `BreakComponentIntoPads()`. Reconciliation resolves these through persisted provenance
   fields (VeroRoute format version 60). This is fork behavior and needs nothing here, but a
   pre-60 board needs the fork's one-time `adopt` step. Confirm at phase 9.

5. **Geometry derivation has no prior art.** Its contract is now specified above rather than
   left to discovery, which is what makes it implementable — but specified is not the same as
   exercised. Phase 4 lands it with tests for every derivation shape and every refusal before
   anything depends on it, and phase 9 is where it meets a real board.

6. **Factoring the union-find layer out of `circuit-json.ts` touches working code.** The
   emitter needs `(reference, pin) -> net` resolution that only exists today inside private
   functions serving `toLabelledNetwork`. The existing pultec tests are the guard; they must
   stay green across the refactor, and the refactor lands before the emitter that needs it.

## Out of scope

- Everything in `pedals/tools/kicad/*`, `tools/derivation/*`, `board-sync` and `derive` —
  the KiCad PCB flow, which does not belong here.
- `deriveImportString.ts` and `FOOTPRINT_IMPORT_STRINGS`, for the reason argued above.
- The `make/*.mk` layer.
- Any change to the VeroRoute fork. It is consumed at a pinned commit.
- Retiring the `pedals` copies. That is a separate decision in a separate repository.
- Automatic placement or routing as the primary workflow.
- Any write path from layout back to the circuit source.
