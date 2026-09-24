# Audio Circuits

Audio circuit definitions as a declarative model, verified in SPICE inside the
test suite.

Circuits are written against `lib/model/`: a circuit is either built directly
with its `circuit()` builder, or produced by reading a KiCad netlist export
with `lib/kicad/` and transcribing it. `circuits/pt2399-core.ts` came from the
netlist of a unit that was actually built and works, not from a datasheet;
`circuits/opamp-buffer.ts` is the first circuit here with an active device.

This repository was previously a tscircuit component package. tscircuit has
been removed entirely — see `docs/decisions/2026-09-21-why-not-tscircuit.md`
for why.

The largest single body of content is a passive Pultec EQ reference network
under `reference/pultec/`: Ian Thompson-Bell's "Pultec 3 Band EQ", which
combines an EQP-1 and an MEQ-5. It is assembled directly from a `kicad-cli`
netlist export onto `lib/model/topology.ts`'s network type, independently of
the `circuit()` builder `circuits/pt2399-core.ts` uses. It is **unvalidated** — no unit has been built from it, and the model is known to be
incomplete — see `reference/pultec/README.md` and
`reference/pultec/unresolved.md` before treating anything computed from it as
more than a model prediction.

## Project Structure

```
audio-circuits/
├── lib/
│   ├── model/            # Canonical circuit model: types, per-kind pin
│   │                     # vocabularies, validation, the circuit() builder,
│   │                     # include() composition
│   ├── kicad/            # Readers for two KiCad netlist export formats
│   └── sim/              # SPICE netlist generation, AC and operating-point
│       └── models/       # Device models, each with its own provenance
│
├── circuits/             # Circuit definitions built on lib/model:
│   │                     # pt2399-core.ts, transcribed from the netlist of a
│   │                     # board that was physically built and works, and
│   │                     # opamp-buffer.ts, a unity-gain TL072 buffer
│   └── optical-compressor/ # An LA-2A-inspired optical compressor: three
│                         # blocks joined by include(), transcribed from the
│                         # design spec in docs/superpowers/specs/
│
├── reference/pultec/     # The Pultec reference network and what it is built
│                         # from - unvalidated, see its own README
│
├── tests/                # Model, kicad, sim, circuit and reference tests
│
└── docs/                 # Design notes, specs and plans
```

## Prerequisites

- **[KiCad](https://www.kicad.org/)**, for `kicad-cli`. Required: the perfboard
  workflow re-exports each board's netlist from its KiCad schematic on every
  run (see `make/board.mk`'s `netlist-agrees`), not just once, so `kicad-cli`
  has to be present to run `make check` against a declared board. It is also
  required for `bun test`: exactly one test, "KiCad reads the generated stub
  as the same circuit" in `tests/circuits/transistor-preamp-lab.test.ts`,
  deliberately invokes `kicad-cli` and **fails** (never skips) when it cannot
  find it, because it is the only proof that KiCad reads a generated
  schematic stub the way the circuit means it. Every other test injects
  `kicad-cli` out. The default assumes a standard macOS install
  (`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`); override
  `KICAD_CLI` if yours lives elsewhere.
- **Homebrew's `qt@5`** (`brew install qt@5`), needed to build the VeroRoute
  fork the perfboard tooling drives. It is keg-only, which is why the tooling
  locates it via `brew --prefix qt@5` rather than expecting `qmake` on `PATH` -
  there is nothing to configure once it's installed.
- **[Bun](https://bun.sh/)**, for the runtime and the test suite.

Nothing else needs setting up: the perfboard tooling builds and locates the
VeroRoute fork itself, and none of this requires an environment variable. If
you want to point at your own builds instead, `VEROROUTE`, `QMAKE` and
`KICAD_CLI` are overrides, not required setup.

## Usage

```bash
bun install
bun test           # the full suite, including the SPICE simulations and one
                   # test that invokes kicad-cli directly (see Prerequisites)
bun run typecheck
```

Circuits are checked against real, physically-built layouts through the
perfboard workflow. `make check`, run from a board's directory (e.g.
`boards/pt2399-core`) or from the repository root to check every declared
board, is that workflow's front door - see `make help` for the rest of it.

## How the Pultec reference is validated

`reference/pultec/three-band.ts` is not compared against any board or module —
none currently exist for it. What "validated" means here is narrower:

- **Topology** comes from an exact `kicad-cli` netlist export of a board that
  was actually manufactured. **Values** come from Thompson-Bell's documentation.
  The two agree on every capacitor position, which is what makes the reference
  evidence rather than a transcription. See `reference/pultec/README.md` for
  the corroboration in full.
- `tests/reference/three-band.test.ts` checks the network is structurally
  valid and spot-checks component values against the documentation.
- `tests/reference/partition.test.ts` checks that a hypothetical split of the
  reference into per-section modules (`reference/pultec/partition.ts`) would
  own every element exactly once and recompose to the same network — a
  consistency check on the model, not a comparison against anything built.
- `tests/reference/ac.test.ts` runs the network through SPICE across a matrix
  of control settings and checks the frequency response against hand-derived
  analytic values and the documented curve shapes.

None of this touches real hardware or a real PCB. See `reference/pultec/README.md`
("UNVALIDATED") and `reference/pultec/unresolved.md` item 1.

### Discrete inductors

The reference models the two multi-tapped coils as nine discrete inductors —
the hi boost section's four taps and the mid section's five — rather than as
tapped windings. The tap nets become internal nodes in the model. This removed
a modelling caveat about winding coupling between taps; see
`reference/pultec/unresolved.md` item 7 for what was retired and why.

The inductors are specified electrically rather than by part number — values,
±20% tolerance, DCR — in `reference/pultec/values.md`, together with the
measurements behind those limits. Nothing physical has been measured against
them; see `reference/pultec/unresolved.md`.

All eleven mid frequencies are modelled. A build that wants fewer would leave
positions unpopulated, because a position designed out of the model needs the
model changed to recover it — but no build exists yet to make that call.

## Writing a circuit

A circuit is a function that returns a `Network`:

```ts
export function myStage(): Network {
  return circuit()
    .resistor("input_bias_resistor", "10k", { a: "IN", b: "GND" })
    .port("input", "IN")
    .port("ground", "GND")
    .done()
}
```

Circuits compose with `include()`, which binds every declared port explicitly —
there are no implicit global nets, not even ground. Component ids are semantic
(`input_bias_resistor`, never `R1`); reference designators belong to KiCad.
`CLAUDE.md` has the conventions in full.

## Open questions

`reference/pultec/unresolved.md` is the list, kept deliberately rather than
tidied away. The two that matter most to anyone building this:

- **R3 is fitted at 4K7**, the value the documentation gives for the build with
  no inductors. An inductive build calls for nominally 470R, a difference of
  about 5 dB of maximum high boost and half the Q. One resistor.
- **Nothing here has been measured against hardware.** Every figure is
  model-derived.

## References

- [multi-channel-preamp](https://github.com/oletizi/multi-channel-preamp) — the original KiCAD designs
- `docs/pultec/` — the modularization plan and its review. **Superseded as software
  instruction** — its `lib/passives/`, `lib/export/` and tscircuit references describe a
  layout this repository no longer has; each file carries a banner saying so. Its
  electrical content still stands.
- `docs/decisions/` — recorded architecture decisions, including why tscircuit
  was dropped
- `docs/superpowers/specs/` — design documents for individual changes
