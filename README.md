# Audio Circuits

Audio circuit definitions, built two different ways depending on when the work
was done.

New work is written against `lib/model/`, a declarative circuit model that is
not tscircuit: a circuit is either built directly with its `circuit()`
builder, or produced by reading a KiCad netlist export with `lib/kicad/` and
transcribing it. `circuits/pt2399-core.ts` is the first circuit built this
way — from the netlist of a unit that was actually built and works, not from a
datasheet. See `docs/decisions/2026-09-21-why-not-tscircuit.md` for why new
circuits are not authored as tscircuit components.

Older work — `lib/chips/`, `lib/connectors/`, `modules/opamp-buffer/`, and the
`index.circuit.tsx` demo — is still authored as composable
[tscircuit](https://tscircuit.com) React components, and `tsci` is still how
those are previewed and exported.

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
│   ├── sim/              # SPICE netlist generation and AC simulation
│   ├── chips/            # IC definitions (TL072) - tscircuit components
│   ├── connectors/       # Screw terminals, audio jacks - tscircuit components
│   └── layout.ts         # Grid-based schematic placement helpers
│
├── circuits/             # Circuit definitions built on lib/model; currently
│                         # pt2399-core.ts, transcribed from the netlist of a
│                         # board that was physically built and works
│
├── modules/
│   └── opamp-buffer/     # Unity-gain buffer (tscircuit module)
│
├── reference/pultec/     # The Pultec reference network and what it is built
│                         # from - unvalidated, see its own README
│
├── tests/                # Model, kicad, sim, circuit and reference tests
│
├── docs/                 # Design notes, specs and plans
│
└── index.circuit.tsx     # Demo: two op-amp buffers
```

## Usage

```bash
bun install
bun test           # the full suite
bun run typecheck
bun run dev        # tsci dev, live preview on http://localhost:3020
```

Export and build of the tscircuit-authored modules go through `tsci`:

```bash
tsci snapshot index.circuit.tsx -u
tsci export index.circuit.tsx -f kicad_zip -o output.zip
tsci export index.circuit.tsx -f gerbers -o gerbers/
```

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

## Creating tscircuit Modules

The tscircuit-authored modules (`modules/opamp-buffer/` today) follow this
pattern — a self-contained circuit with a named interface:

```tsx
export interface MyModuleProps {
  name: string
  schX?: number
  schY?: number
}

export const MyModule = (props: MyModuleProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  return (
    <group name={name}>
      <net name={`${name}_GND`} />
      <resistor name={`${name}_R1`} resistance="10k" footprint="0805" {...g.signal(0)} />
      <trace from={`.${name}_R1 > .pin2`} to={`net.${name}_GND`} />
    </group>
  )
}
```

### Conventions

1. **Naming** — every component and net name is prefixed with the `name` prop,
   so two instances of a module never collide.
2. **Imports** — explicit relative file paths with extensions. tscircuit's
   evaluator resolves neither directory imports nor path aliases.
3. **Layout** — explicit `schX`/`schY` through the helpers in `lib/layout.ts`.
   `schFlex` is not reliable for schematics.
4. **Named nets** — declare `<net>` elements rather than relying on generated
   pin-pair names.

See `CLAUDE.md` for the full conventions.

## Component Library

### Chips (`lib/chips/`)

| Component | Description | Footprint |
|-----------|-------------|-----------|
| `TL072` | Dual JFET op-amp | SOIC-8, DIP-8 |

### Connectors (`lib/connectors/`)

| Component | Description | Pins |
|-----------|-------------|------|
| `ScrewTerminal2` | 2-position terminal | P1, P2 |
| `ScrewTerminal3` | 3-position terminal | P1, P2, P3 |
| `ScrewTerminal6` | 6-position terminal | P1-P6 |
| `MonoJack` | Mono audio jack | TIP, SLEEVE |
| `StereoJack` | Stereo audio jack | TIP, RING, SLEEVE |

## Open questions

`reference/pultec/unresolved.md` is the list, kept deliberately rather than
tidied away. The two that matter most to anyone building this:

- **R3 is fitted at 4K7**, the value the documentation gives for the build with
  no inductors. An inductive build calls for nominally 470R, a difference of
  about 5 dB of maximum high boost and half the Q. One resistor.
- **Nothing here has been measured against hardware.** Every figure is
  model-derived.

## References

- [tscircuit docs](https://docs.tscircuit.com)
- [multi-channel-preamp](https://github.com/oletizi/multi-channel-preamp) — the original KiCAD designs
- `docs/pultec/` — the modularization plan and its review
- `docs/decisions/` — recorded architecture decisions, including why tscircuit
  was dropped for new work
- `docs/superpowers/specs/` — design documents for individual changes
