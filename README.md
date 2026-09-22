# Audio Circuits

Modular audio circuit library built with [tscircuit](https://tscircuit.com).
Circuit modules are written as composable React components and validated
against a reference network rather than against a snapshot.

Most of the work here is a passive Pultec EQ: Ian Thompson-Bell's "Pultec 3
Band EQ", which combines an EQP-1 and an MEQ-5. Each section is its own module,
and the composition of those modules is checked — node for node, and by SPICE
frequency response — against an unsplit reference of the same circuit.

## Project Structure

```
audio-circuits/
├── lib/
│   ├── chips/              # IC definitions (TL072)
│   ├── connectors/         # Screw terminals, audio jacks
│   ├── passives/           # Topology, connectivity, control state, units
│   ├── sim/                # SPICE netlist generation and AC comparison
│   ├── export/             # tscircuit circuit JSON to labelled connectivity
│   └── layout.ts           # Grid-based schematic placement helpers
│
├── modules/
│   ├── opamp-buffer/       # Unity-gain buffer
│   ├── pultec-low-cut/     # Low cut capacitor bank
│   ├── pultec-low-boost/   # Low boost capacitor bank
│   ├── pultec-hi-cut/      # Hi cut capacitor bank
│   ├── pultec-hi-boost/    # Hi boost bank, four discrete inductors, Qmax
│   ├── pultec-mid/         # Mid bank, five discrete inductors, return resistors
│   └── pultec-passive-eq/  # The five sections composed onto one board
│
├── reference/pultec/       # The reference network and what it is built from
│
├── tests/                  # Module comparisons, simulation, reference checks
│
├── docs/                   # Design notes, specs and plans
│
└── index.circuit.tsx       # Demo: two op-amp buffers
```

## Usage

```bash
bun install
bun test           # the full suite
bun run typecheck
bun run dev        # tsci dev, live preview on http://localhost:3020
```

Export and build go through `tsci`:

```bash
tsci snapshot index.circuit.tsx -u
tsci export index.circuit.tsx -f kicad_zip -o output.zip
tsci export index.circuit.tsx -f gerbers -o gerbers/
```

## How the Pultec work is validated

The point of this repository is that a module is not trusted because it looks
right. There is a single reference network, `reference/pultec/three-band.ts`,
and every module is compared against its portion of it.

- **Topology** comes from an exact `kicad-cli` netlist export of a board that
  was actually manufactured. **Values** come from Thompson-Bell's documentation.
  The two agree on every capacitor position, which is what makes the reference
  evidence rather than a transcription.
- `reference/pultec/partition.ts` splits that reference into the portion each
  section board carries. Each module test renders the module, flattens what
  tscircuit emits, and asserts it equals that portion — components, values, pins
  and terminals.
- `tests/modules/passive-eq.test.tsx` asserts the composed board equals the
  partition recomposed, and that every join the composition claims is a
  conductor that actually exists.
- `tests/modules/unsplit-vs-composed.test.tsx` runs both networks through SPICE
  across a matrix of control settings and compares the frequency responses.

Front-panel parts — the pots and the rotary selectors — are not on any board.
They are supplied from the reference so the comparison is about the boards and
the wiring between them.

### Discrete inductors

The two multi-tapped coils have been replaced by nine discrete inductors that
sit on the section boards beside the capacitors they pair with. The tap nets
became internal nodes, which is what removes a 6-way and a 12-way terminal
block along with the breakout board between them.

The inductors are specified electrically rather than by part number — values,
±20% tolerance, DCR — in `reference/pultec/values.md`, together with the
measurements behind those limits. Nothing physical has been measured against
them yet; see `reference/pultec/unresolved.md`.

All eleven mid frequencies are on the board. A build that wants fewer leaves
positions unpopulated, because a position designed out needs a new board.

## Creating Modules

Each module is a self-contained circuit with a named interface:

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
   `schFlex` is not reliable for schematics. Components must not share grid
   coordinates; `tests/modules/schematic-overlap.ts` enforces that.
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

## Module Status

| Module | Status | Description |
|--------|--------|-------------|
| `opamp-buffer` | Done | Unity-gain buffer |
| `pultec-low-cut` | Compared against the reference | Low cut capacitor bank |
| `pultec-low-boost` | Compared against the reference | Low boost capacitor bank |
| `pultec-hi-cut` | Compared against the reference | Hi cut capacitor bank |
| `pultec-hi-boost` | Compared against the reference | Hi boost bank, four inductors, Qmax |
| `pultec-mid` | Compared against the reference | Mid bank, five inductors |
| `pultec-passive-eq` | Composed and simulated | The five sections on one board |

The EQ is passive throughout: no gyrators, no active parts, no power rails on
the EQ boards. A makeup gain stage is a separate question and is not built here.

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
- `docs/superpowers/specs/` — design documents for individual changes
