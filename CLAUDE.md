# Audio Circuits - Project Instructions

## tscircuit Conventions

### Import Paths

tscircuit's web eval does not resolve directory imports or TypeScript path aliases.
Always use explicit file paths in imports:

```tsx
// Good
import { TL072 } from "../../lib/chips/index"
import { createGrid } from "../../lib/layout.ts"

// Bad - won't work in tscircuit dev server
import { TL072 } from "../../lib/chips"
import { createGrid } from "@/lib/layout"
```

### Schematic Layout

tscircuit's `schFlex` layout properties (`schFlexRow`, `schFlexColumn`, etc.) are not
fully functional for schematic views. Use explicit `schX`/`schY` coordinates instead,
with the grid-based layout helpers in `lib/layout.ts`.

**Conventions:**
- Signal flow: left to right (schX increases)
- Voltage drop: top to bottom (schY increases, VCC above, GND/VEE below)

**Module-level layout** - use `createGrid()` to position components within a module:

```tsx
const g = createGrid(schX, schY)

<component {...g.signal(-2)} />      // Signal path, 2 grid units left of center
<component {...g.above(0, 1.5)} />   // 1.5 grid units above center (VCC area)
<component {...g.below(1, 2)} />     // 2 grid units below, 1 right (GND area)
```

**Board-level layout** - use `columnLayout()` or `rowLayout()` to arrange modules:

```tsx
const layout = columnLayout(2)   // Stack 2 modules vertically

<ModuleA {...layout[0]} />
<ModuleB {...layout[1]} />
```

### Named Nets

Use `<net>` elements for clean schematic labels instead of relying on tscircuit's
auto-generated concatenated pin names:

```tsx
<net name={`${name}_GND`} />
<trace from={`.${name}_R1 > .pin2`} to={`net.${name}_GND`} />
```
