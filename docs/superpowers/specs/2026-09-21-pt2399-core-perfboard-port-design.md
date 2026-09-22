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

The emitter therefore reproduces the original value notation. See Open questions.

### Board artifacts live in a board tree

```
modules/pt2399-core/     the circuit: reusable, substrate-independent
boards/pt2399-core/      one physical build of it
```

A module is circuitry; a board is one physical realization. Separating them means a second
build — different substrate, different strip orientation, a smaller board — is a new
directory rather than a conflict. `pedals` separates them too; its
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
**in place** and refuse while it has uncommitted changes, because git is the undo and that is
precisely when `git checkout --` would not return the operator to where they are.

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
fixture: same references, same values, same net membership. The port is then *provably* the
same circuit rather than a careful retype, and the same fixture exercises the OrcadPCB2
emitter against a known-good file.

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
  circuit-json.ts             EXISTING - union-find net resolution, reused unchanged
  import-string.ts            NEW - pad geometry -> VeroRoute import string
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

Derivation, given a component's plated holes:

| Shape | Import string |
| --- | --- |
| 2 holes, collinear | `RESISTOR<n>` / `CAP_CERAMIC<n>`, n = pitch in 100-mil units, by `ftype` |
| n holes, one row | `SIP<n>` |
| n holes, two rows | `DIP<n>` |
| radial electrolytic | `CAP_ELECTRO_<declared diameter>` |

Refusals teach, as the `pedals` refusals do: name the component, state what the geometry
showed, and list the shapes that derive. A part whose holes are 0.37in apart is a refusal
naming the measurement, not a silent round to `RESISTOR4`.

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

1. **The module.** `lib/chips/PT2399.tsx`, `modules/pt2399-core/`, flat refs, through-hole
   footprints, corrected pin labels.
2. **The proof.** Fixture checked in under `reference/`; test asserting identical
   connectivity, references and values. Phases 1 and 2 land together — the module is not
   trustworthy until it is proven.
3. **Import strings.** `lib/export/import-string.ts` with its derivations and refusals.
4. **The emitter.** `lib/export/orcad.ts`, asserted against the fixture.
5. **The declaration and check.** `tools/perfboard/{declaration,check,render}.ts`, ported.
6. **The CLI.** `tools/cli/perfboard.ts`, every verb.
7. **The fork.** `veroroute.pin`, the `veroroute` verb, `.gitignore` for `.tools/`.
8. **The board.** `boards/pt2399-core/` with the carried `.vrt`, and the first real
   `perfboard check` against the operator's layout.

Phases 1–6 need no VeroRoute binary and are fully testable without one. Phase 8 is the
acceptance step and is where inherited discrepancies surface.

## Risks and open questions

1. **Value notation.** The emitter must reproduce `.1uF`, `5600pF`, `2.7K` rather than
   tscircuit's `100nF`, `5.6nF`, `2.7k`, or every part reports a value delta and the gate
   fails. The alternative — normalize values and re-save the `.vrt` once — is cleaner
   long-term and is available if reproducing the notation proves awkward. Decide at phase 4
   with the emitter in hand.

2. **C3's body diameter is a known inherited discrepancy.** The perfboard design records that
   the operator edited a KiCad footprint to buy pad span, and that
   `C3 retyped CAP_ELECTRO_300 -> CAP_ELECTRO_250` appears in every report of this board. The
   port carries C3 as `CAP_ELECTRO_250`, matching the netlist as it stands. **Do not
   pre-emptively "fix" this.** Whatever the first `perfboard check` reports at phase 8 is the
   ground truth, and it is resolved then, against the physical board.

3. **`pin_number` is optional in `circuit-json`.** `source_port.pin_number` is
   `number | undefined`. The emitter must refuse a component whose ports carry no pin numbers
   rather than inventing an ordering — pin numbers are how the `.vrt` addresses a part.

4. **Strip mode.** The perfboard design records this board's `m_bVeroTracks` as false
   (isolated-hole perfboard) as of 2026-09-16, and its twelve unrouted board-side nets as
   genuine. The layout has been worked on since. Phase 8 establishes the current state; the
   `stripboard` verb exists if conversion is wanted.

5. **Off-board pad provenance.** `J1`'s five pins become `J1_1`..`J1_5` on the board via
   `BreakComponentIntoPads()`. Reconciliation resolves these through persisted provenance
   fields (VeroRoute format version 60). This is fork behavior and needs nothing here, but a
   pre-60 board needs the fork's one-time `adopt` step. Confirm at phase 8.

6. **Geometry derivation is unexercised.** Deriving import strings from pad coordinates is
   new code with no prior art in either repository. Phase 3 lands with tests before anything
   depends on it, and phase 8 is where it meets a real board.

## Out of scope

- Everything in `pedals/tools/kicad/*`, `tools/derivation/*`, `board-sync` and `derive` —
  the KiCad PCB flow, which does not belong here.
- `deriveImportString.ts` and `FOOTPRINT_IMPORT_STRINGS`, for the reason argued above.
- The `make/*.mk` layer.
- Any change to the VeroRoute fork. It is consumed at a pinned commit.
- Retiring the `pedals` copies. That is a separate decision in a separate repository.
- Automatic placement or routing as the primary workflow.
- Any write path from layout back to the circuit source.
