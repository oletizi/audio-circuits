# Audio Circuits

Modular audio circuit library built with [tscircuit](https://tscircuit.com). Design reusable circuit modules that can be composed into complete boards.

## Project Structure

```
audio-circuits/
├── lib/                    # Reusable component library
│   ├── chips/              # IC definitions (TL072, NE5532, etc.)
│   ├── connectors/         # Connectors (screw terminals, audio jacks)
│   └── passives/           # Specialized passive components
│
├── modules/                # Complete circuit modules
│   ├── opamp-buffer/       # Unity-gain buffer
│   ├── pultec-lf/          # Planned: coupled LF boost/attenuation R/C network
│   ├── pultec-hf/          # Planned: HF boost/bandwidth/attenuation network
│   ├── pultec-passive-eq/  # Planned: reference-equivalent composition
│   ├── input-stage/        # Input buffering/impedance matching
│   └── output-stage/       # Output stage variants
│
├── boards/                 # Complete board designs
│   ├── pultec-eq/          # Planned: complete EQ with separate makeup stage
│   └── dual-buffer/        # Dual channel buffer
│
├── examples/               # Example circuits and usage
│
└── index.circuit.tsx       # Main demo circuit
```

## Usage

### Install Dependencies

```bash
bun install
```

### Development Server

```bash
tsci dev
# Opens http://localhost:3020 with live preview
```

### Build & Export

```bash
# Generate schematic/PCB snapshots
tsci snapshot index.circuit.tsx -u

# Export to KiCAD
tsci export index.circuit.tsx -f kicad_zip -o output.zip

# Export Gerbers for manufacturing
tsci export index.circuit.tsx -f gerbers -o gerbers/

# Build specific module
tsci build modules/opamp-buffer/opamp-buffer.circuit.tsx
```

## Creating Modules

Each module is a self-contained circuit with defined interfaces:

```tsx
// modules/my-module/MyModule.tsx
export interface MyModuleProps {
  name: string
  // Module-specific parameters
  pcbX?: number
  pcbY?: number
}

export const MyModule = (props: MyModuleProps) => {
  const { name, pcbX = 0, pcbY = 0 } = props

  return (
    <group>
      {/* Components */}
      <resistor name={`${name}_R1`} resistance="10k" ... />
      <capacitor name={`${name}_C1`} capacitance="100nF" ... />

      {/* Internal traces */}
      <trace from={`.${name}_R1 > .pin1`} to={`.${name}_C1 > .pin1`} />
    </group>
  )
}
```

### Module Conventions

1. **Naming**: All component names prefixed with module `name` prop
2. **Interfaces**: Use screw terminals for external connections; derive Pultec shared-node interfaces from the reference topology
3. **Standalone circuit**: Include `<module>.circuit.tsx` for independent testing
4. **Exports**: Export from `index.ts` for clean imports

## Composing Boards

The main demo composes two independent op-amp buffers. Pultec sections require
shared circuit nodes rather than an assumed LF-to-HF cascade. Their connector
interface will follow a reviewed unsplit reference network.

## Pultec Design Groundwork

See [the reference and modularization plan](docs/pultec/README.md) and the
[proposed changes and implementation status](docs/pultec/implementation-plan.md). The governing
constraint is that LF + HF + wiring preserve the EQP-1A passive topology. The
reference transcription and circuit modules are pending; the initial connectivity
checks use synthetic fixtures and do not yet validate a Pultec implementation.

Run the connectivity checks with `bun test`. The tree above includes planned
folders; only the op-amp buffer is currently implemented as a circuit module.

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
| `opamp-buffer` | ✅ Done | Unity-gain buffer |
| `pultec-lf` | Design groundwork | Coupled LF R/C network |
| `pultec-hf` | Design groundwork | Coupled HF L/C/R network |
| `pultec-passive-eq` | Design groundwork | Node-for-node reference composition |
| `pultec-lf-standalone` | Deferred | LF + validated HF substitute |
| `pultec-hf-standalone` | Deferred | HF + validated LF substitute |
| `input-stage` | 🔲 TODO | Input buffering |
| `output-stage` | 🔲 TODO | Output stage |

## References

- [tscircuit docs](https://docs.tscircuit.com)
- [multi-channel-preamp](https://github.com/oletizi/multi-channel-preamp) - Original KiCAD designs
