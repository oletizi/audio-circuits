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
│   ├── low-cut/            # High-pass filter (Pultec-style)
│   ├── low-boost/          # Low frequency LC boost
│   ├── high-boost/         # High frequency LC boost with Q control
│   ├── high-cut/           # Low-pass filter
│   ├── input-stage/        # Input buffering/impedance matching
│   └── output-stage/       # Output stage variants
│
├── boards/                 # Complete board designs
│   ├── pultec-eq/          # Full Pultec-style EQ
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
2. **Interfaces**: Use screw terminals for external connections
3. **Standalone circuit**: Include `<module>.circuit.tsx` for independent testing
4. **Exports**: Export from `index.ts` for clean imports

## Composing Boards

Modules can be composed into complete boards:

```tsx
// boards/my-board/my-board.circuit.tsx
import { OpampBuffer } from "../../modules"
import { LowCutFilter } from "../../modules"

export default () => (
  <board width="100mm" height="80mm">
    <OpampBuffer name="INPUT" pcbX={-30} pcbY={0} />
    <LowCutFilter name="LC" pcbX={0} pcbY={0} />
    <OpampBuffer name="OUTPUT" pcbX={30} pcbY={0} />

    {/* Inter-module connections */}
    <trace from=".INPUT_J_OUT > .P1" to=".LC_J_IN > .P1" />
    <trace from=".LC_J_OUT > .P1" to=".OUTPUT_J_IN > .P1" />
  </board>
)
```

## Component Library

### Chips (`lib/chips/`)

| Component | Description | Footprint |
|-----------|-------------|-----------|
| `TL072` | Dual JFET op-amp | SOIC-8, DIP-8 |
| `TL072H` | Dual JFET op-amp, single supply 4.5–40 V, rail-to-rail output | SOIC-8, DIP-8 |

### Connectors (`lib/connectors/`)

| Component | Description | Pins |
|-----------|-------------|------|
| `ScrewTerminal2` | 2-position terminal | P1, P2 |
| `ScrewTerminal3` | 3-position terminal | P1, P2, P3 |
| `ScrewTerminal6` | 6-position terminal | P1-P6 |
| `MonoJack` | Mono audio jack | TIP, SLEEVE |
| `StereoJack` | Stereo audio jack | TIP, RING, SLEEVE |

### Optical (`lib/opto/`)

| Component | Description | Pins |
|-----------|-------------|------|
| `Vactrol` | Generic LED/LDR optocoupler (footprint required) | LED_A, LED_K, LDR_1, LDR_2 |

## Module Status

| Module | Status | Description |
|--------|--------|-------------|
| `opamp-buffer` | ✅ Done | Unity-gain buffer |
| `low-cut` | 🔲 TODO | High-pass filter |
| `low-boost` | 🔲 TODO | LC low frequency boost |
| `high-boost` | 🔲 TODO | LC high frequency boost |
| `high-cut` | 🔲 TODO | Low-pass filter |
| `input-stage` | 🔲 TODO | Input buffering |
| `output-stage` | 🔲 TODO | Output stage |
| `optical-compressor` | ✅ Renders | +9V LA-2A-inspired optical compressor — **not bench validated** |

## References

- [tscircuit docs](https://docs.tscircuit.com)
- [multi-channel-preamp](https://github.com/oletizi/multi-channel-preamp) - Original KiCAD designs
