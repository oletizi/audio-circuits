# Audio Circuits - Project Instructions

Follow the shared project rules in `AGENTS.md`, including committing and pushing
small, coherent changes early and often.

## Circuit Conventions

This repository used to be a tscircuit component package. It is not one any more:
tscircuit was removed, and the reasons are recorded in
`docs/decisions/2026-09-21-why-not-tscircuit.md`. Nothing below is tscircuit
advice adapted - the model is different in kind.

### A circuit is a function that returns a `Network`

There is no board, no renderer and no JSX. A circuit is a plain function, and its
result is data:

```ts
export function opampBuffer(): Network {
  return circuit()
    .capacitor("input_coupling_cap", "100nF", { a: "IN_EXT", b: "IN" })
    .resistor("input_bias_resistor", "100k", { a: "IN", b: "GND" })
    .port("input", "IN_EXT")
    .done()
}
```

`done()` validates before it returns, so a malformed circuit throws at the
declaration that caused it rather than far downstream. The builder has shorthands
for the two-terminal passives, plus `ic()` and `connector()`; anything else - an
op-amp, a transistor - goes in through `add()` with its units spelled out.

Nets are implied by pin references, never declared separately. Two pins naming the
same string are on the same net; that is the whole rule, and it means there is one
place to keep correct rather than two.

### Composition: `include()`, and no implicit global nets

Circuits compose with `include(prefix, network, portMap)`. Every net inside the
included circuit takes the prefix, except the ones its declared ports name, which
are bound to the parent's nets by `portMap`.

**There are no implicit or global nets.** Ground, supply rails and bias references
are not special: a net that crosses a composition boundary must be a declared port
and must be bound explicitly. Leaving one unbound is an error, not a default. What
this buys is that a rail which should be shared and is not becomes a loud
construction error instead of a quiet simulation result.

**A component is atomic with respect to `include()`.** Composition moves whole
components, never single units, so a package cannot be split across two blocks.
When one package's sections serve different functional blocks, the package
allocation therefore constrains the file layout, and not the other way round: the
whole component goes in one block and the other block reaches what it needs
through a declared port. `circuits/optical-compressor/` is the worked example -
its spec puts the VBIAS buffer and the sidechain amplifier on the same dual
op-amp, so the buffer is declared in `parts/sidechain.ts` although it belongs to
the power section by function, and `parts/power-section.ts` hands the unbuffered
divider node across as a port. See also **Multi-section packages** below.

### Ids are semantic; designators belong to KiCad

A component's `id` says what the part DOES - `input_bias_resistor`,
`vcc_decoupling_cap`, `buffer_amp`. It is never a reference designator. `R4` is a
fact about one particular schematic, and schematics are downstream of this model.
Where a circuit has to be checked against one, it exports a separate id-to-
designator map (see `DESIGNATORS` in `circuits/pt2399-core/pt2399-core.ts`), and that map is
the only place the two vocabularies meet.

### Pin names come from the kind, not from the part

Each component kind declares its pin vocabulary in `lib/model/kinds.ts`: a
resistor has `a`/`b`, an op-amp unit has `in+`/`in-`/`out` with `v+`/`v-` on the
package. A kind declares the vocabulary - which KiCad pin number or footprint pad
a pin maps to is a property of a concrete symbol or package, and lives there.
`ic`, `connector` and `switch` have open vocabularies, because their pins are
whatever the part has.

SPICE argument order follows the same rule, with ONE principled exception. For a
kind emitted as a SPICE PRIMITIVE - resistor, capacitor, inductor, photoresistor,
diode, bjt - SPICE itself fixes the order (`D` is anode then cathode, `Q` is
collector, base, emitter), so it is a property of the SPICE language rather than
of any model, and `SPICE_PIN_ORDER` in `lib/model/kinds.ts` keys it by kind. For
a subcircuit-backed kind it is a property of the concrete model, because two
macromodels of one kind may order their pins differently, so it lives on the
model entry (`DeviceModel.pinOrder`) and `spicePinOrder` refuses those kinds
rather than inventing an order. Spec 3.5 states the rule without this exception;
the deviation is recorded in
`docs/superpowers/plans/2026-09-22-canonical-model-plan-b.md`.

### Multi-section packages

A package's `units` are its functional sections: `A` and `B` for a dual op-amp,
`MAIN` for everything else. Pins shared across sections - supply, shield - sit on
the component rather than in a unit. The SPICE emitter lowers one unit to one
device line, each seeing its own pins merged with the package's.

Which section does which job is a decision with a composition consequence, not a
free choice made afterwards: a package is one component and `include()` moves
whole components, so two sections doing two blocks' work still live in one block.
See **Composition** above.

### One directory per circuit, and it holds the KiCad files

Every circuit owns a directory under `circuits/`, and its authored sources live
there together:

```
circuits/pt2399-core/     pt2399-core.kicad_sch   pt2399-core.ts
circuits/pultec/          pultec-three-band-eq.kicad_sch   pultec-mid-band.kicad_sch
                          pultec-three-band-eq.kicad_pro   <the board modules>
circuits/transistor-preamp/  lab-board.kicad_sch   lab-board.ts   ...
```

**No KiCad file sits at the top level of `circuits/`.** It gets a directory even
when the circuit is one schematic and one module.

A circuit with enough parts uses subdirectories, and they say what KIND of
thing each file is rather than what topic it is about:

```
circuits/pultec/model/      an electrical model derived from the schematic
circuits/pultec/boards/     physicalized board modules, one per board
circuits/pultec/generated/  artifacts a tool rebuilds - never hand-edited
```

**The test is not where a file came from, or what reads it. Ask whether it will
be EDITED here.** If yes, it is a source and belongs with the circuit. If a tool
rebuilds it, it is generated. If it is prose about the circuit - a values table,
a list of unresolved questions, a parts-selection writeup - it is documentation
and belongs in `docs/<circuit>/`.

There is deliberately **no `reference/` directory**. There was one, and it
accumulated all three kinds: over a thousand lines of editable TypeScript, the
generated netlist, and the analysis prose, under a name that described only the
last. "Reference" reads as material you consult rather than a project you work
on, and filing live sources under it quietly asserts that nobody will ever edit
them. If you find yourself wanting a directory for "the stuff around this
circuit", you are about to make the same mistake: sort it into source,
generated, or documentation instead.

A `.kicad_prl` is per-user view state, not design data. It is gitignored and
never committed, whatever directory it appears in.

Moving a `.ts` into a new directory changes its import depth. Fix the relative
paths and run `bun run typecheck` - an unresolved module shows up as a confusing
type error at an untouched line (`Property 'x' does not exist on type '{}'`),
not as "module not found".

### Imports

Explicit relative paths, with the file extension:

```ts
import { circuit } from "../lib/model/index.ts"   // good
import { circuit } from "../lib/model"            // bad
```

### Values are strings, parsed once

`"100nF"`, `"4K7"`, `"2.7k"` - `parseValue` handles SI prefixes and RKM notation,
and throws on anything it cannot parse. It never guesses a unit.

### A part is not a model

`part.mpn` says which part is fitted; a unit's `spiceModel` says which SPICE model
a simulation uses for it. They are separate claims and a circuit may legitimately
carry `mpn: "TL072"` alongside `spiceModel: "GENERIC_OPAMP"`. Every model in
`lib/sim/models/` states where it came from and what may be concluded from it.

### Transcription is evidence, not memory

A circuit ported from somewhere records where it came from in its module comment,
names the file that is the authority for it, and states plainly anything it did
NOT carry across. Every component, value and connection comes from reading that
source - never from remembering what that kind of circuit usually looks like.
