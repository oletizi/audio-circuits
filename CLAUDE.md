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

### Ids are semantic; designators belong to KiCad

A component's `id` says what the part DOES - `input_bias_resistor`,
`vcc_decoupling_cap`, `buffer_amp`. It is never a reference designator. `R4` is a
fact about one particular schematic, and schematics are downstream of this model.
Where a circuit has to be checked against one, it exports a separate id-to-
designator map (see `DESIGNATORS` in `circuits/pt2399-core.ts`), and that map is
the only place the two vocabularies meet.

### Pin names come from the kind, not from the part

Each component kind declares its pin vocabulary in `lib/model/kinds.ts`: a
resistor has `a`/`b`, an op-amp unit has `in+`/`in-`/`out` with `v+`/`v-` on the
package. A kind declares the vocabulary and NOTHING else - which KiCad pin number
or SPICE argument position a pin maps to is a property of a concrete symbol,
package or model, and lives there. `ic`, `connector` and `switch` have open
vocabularies, because their pins are whatever the part has.

### Multi-section packages

A package's `units` are its functional sections: `A` and `B` for a dual op-amp,
`MAIN` for everything else. Pins shared across sections - supply, shield - sit on
the component rather than in a unit. The SPICE emitter lowers one unit to one
device line, each seeing its own pins merged with the package's.

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
