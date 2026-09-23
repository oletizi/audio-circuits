# Perfboard Workflow Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `pedals` perfboard workflow here, so `bun run perfboard check` verifies the hand-authored stripboard layout of pt2399-core against the canonical circuit and reports precisely what went stale.

**Architecture:** The canonical `Network` plus three lookup tables (`DESIGNATORS`, `PIN_NUMBERS`, `PartSpec.footprint`) is lowered to an EESchema v1.1 netlist whose package field already holds a VeroRoute import string. A forked VeroRoute reconciles that netlist against the persisted `.vrt` and reports. Nothing places parts; the tool verifies and reports only.

**Tech Stack:** TypeScript, Bun (`bun test`), no runtime dependencies. An external GPLv3 Qt binary (`oletizi/veroroute-perfboard`) is acquired at a pinned commit and is required only by Tasks 8–9.

**Spec:** `docs/superpowers/specs/2026-09-21-pt2399-core-perfboard-port-design.md` (as of commit `7b3d008`)

## Global Constraints

- **Imports are explicit relative paths with the `.ts` extension.** `import { circuit } from "../lib/model/index.ts"` — never `"../lib/model"`, never a path alias.
- **No fallbacks, no mock data outside tests.** Every unhandled case throws an error naming what is missing. This is the repository's standing rule and the workflow's whole premise: a check that silently degrades is indistinguishable from a passing one.
- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`.
- **Files stay under 300–500 lines.** Split by responsibility if one grows past that.
- **Commit and push after each task.** Never add AI attribution to commit messages.
- **`bun test` must stay green.** Baseline before Task 1 is **287 pass, 0 fail**.
- **Semantic ids, never designators**, in circuit source. `DESIGNATORS` is the only place the two vocabularies meet.
- **The exporter's responsibility is to reproduce `tests/fixtures/pt2399-core-veroroute.net`.** Differences between that netlist and the persisted `.vrt` are reconciliation deltas and are outside every assertion in Tasks 1–7.
- **Do not "fix" C3.** The netlist side derives `CAP_ELECTRO_250` and is self-consistent; the `.vrt` holds `CAP_ELECTRO_300`. That delta is reported at Task 9 and resolved against the physical part, never by editing the circuit to silence it.

## File Structure

| File | Responsibility |
| --- | --- |
| `circuits/pt2399-core.ts` | **Modify.** Gains `PartSpec.footprint` on all 24 components. |
| `lib/kicad/import-string.ts` | **Create.** KiCad footprint name → VeroRoute import string. Five proven families; everything else refuses. |
| `lib/kicad/value-notation.ts` | **Create.** Numeric parameters → KiCad value spelling. |
| `lib/kicad/from-network.ts` | **Create.** `Network` + the three tables → `ImportedNetlist`. |
| `lib/kicad/legacy-netlist.ts` | **Modify.** Gains `writeLegacyNetlist`, the mirror of its existing reader. |
| `tools/perfboard/declaration.ts` | **Create.** `perfboard.json` load + tree discovery. |
| `tools/perfboard/load.ts` | **Create.** Dynamically import a declared circuit module and call its export. |
| `tools/perfboard/check.ts` | **Create.** Spawn `veroroute --check`; exit-code-only verdict; verbatim report. |
| `tools/cli/perfboard.ts` | **Create.** The verbs, with cwd-as-context resolution. |
| `tools/cli/entrypoint.ts` | **Create.** `isMain()` helper, so `runCli` stays testable. |
| `boards/pt2399-core/` | **Create.** `perfboard.json`, the carried `.vrt` and `.png`. |
| `veroroute.pin` | **Create.** The pinned fork commit. |

---

### Task 1: Footprints transcribed into the circuit

`PartSpec.footprint` is what yields the import string, which is layout-geometry identity. It is transcribed from `tests/fixtures/pt2399-core.net` — the checked-in modern netlist of the built unit — under the repository's rule that transcription is evidence, not memory.

**Files:**
- Modify: `circuits/pt2399-core.ts`
- Test: `tests/circuits/pt2399-core.test.ts`

**Interfaces:**
- Consumes: `importNetlist` from `lib/kicad/netlist.ts`; `DESIGNATORS` from `circuits/pt2399-core.ts`.
- Produces: every component in `pt2399Core()` has `part.footprint` set to its library-qualified KiCad footprint name.

- [ ] **Step 1: Write the failing test**

Append to `tests/circuits/pt2399-core.test.ts`:

```ts
test("every component's footprint matches the netlist of the built unit", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const byDesignator = new Map(modern.components.map((c) => [c.designator, c.footprint]))

  for (const component of pt2399Core().components) {
    const designator = DESIGNATORS[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    const expected = byDesignator.get(designator)
    if (expected === undefined) throw new Error(`${designator} is absent from the netlist`)
    expect(component.part?.footprint).toBe(expected)
  }
})
```

`importNetlist` is already imported at the top of this file; no new import is needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/circuits/pt2399-core.test.ts`
Expected: FAIL — `expected: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm", received: undefined`

- [ ] **Step 3: Add footprints to all 24 components**

In `circuits/pt2399-core.ts`, add a fourth argument to every `.capacitor(...)` and `.resistor(...)` call, and a `footprint` field to the existing part objects on `.ic(...)` and `.connector(...)`. The exact values, verified against both fixtures:

| Components | `footprint` |
| --- | --- |
| C1, C4, C5, C6, C8, C9, C11, C12, C13, C14 | `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` |
| C7, C10 | `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm` |
| C3 | `Capacitor_THT:CP_Radial_D6.3mm_P2.50mm` |
| C2 | `Capacitor_THT:CP_Radial_D8.0mm_P3.50mm` |
| R1–R8 | `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` |
| U1 | `Package_DIP:DIP-16_W7.62mm` |
| J1 | `Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical` |

Map designators to ids through `DESIGNATORS` in the same file. Worked examples of each shape:

```ts
    // Two-terminal passive: the part spec is the fourth argument.
    .capacitor("supply_bypass_local", ".1uF", { a: "+5V", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })

    .capacitor("reference_bypass", "47uF", { a: "Net-(U1-REF)", b: "GND" },
      { footprint: "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm" })

    .resistor("input_bias_resistor", "100K", { a: "INPUT", b: "GND" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
```

```ts
    // IC and connector: add the field to the part object already there.
    .ic("delay_ic", { /* pins unchanged */ }, {
      mpn: "PT2399",
      symbol: "Audio:PT2399",
      footprint: "Package_DIP:DIP-16_W7.62mm",
    })

    .connector("power_signal_header", { /* pins unchanged */ }, {
      symbol: "Connector_Generic:Conn_01x05",
      footprint: "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical",
    })
```

Also extend the module comment to record that footprints are transcribed from `tests/fixtures/pt2399-core.net`, per the repository's transcription rule.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test`
Expected: PASS — 288 pass, 0 fail.

- [ ] **Step 5: Commit and push**

```bash
git add circuits/pt2399-core.ts tests/circuits/pt2399-core.test.ts
git commit -m "Transcribe the built unit's footprints into the circuit"
git push
```

---

### Task 2: Import-string derivation

Five proven footprint families and two quantization rules. Everything else refuses, naming the footprint and listing the shapes that derive.

**Files:**
- Create: `lib/kicad/import-string.ts`
- Test: `tests/kicad/import-string.test.ts`

**Interfaces:**
- Produces:
  - `importStringFor(footprint: string, overrides?: ReadonlyMap<string, string>): string`
  - `FOOTPRINT_IMPORT_STRINGS: ReadonlyMap<string, string>` — empty; the override table.
  - `declaredPinCount(importStr: string): number | null` — pin count for `SIP`/`DIP`/`PADS`, else `null`.

- [ ] **Step 1: Write the failing tests**

Create `tests/kicad/import-string.test.ts`:

```ts
import { test, expect } from "bun:test"
import { importStringFor, declaredPinCount } from "../../lib/kicad/import-string.ts"

test("derives the five proven families", () => {
  expect(importStringFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"))
    .toBe("RESISTOR4")
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  expect(importStringFor("Capacitor_THT:CP_Radial_D5.0mm_P2.50mm")).toBe("CAP_ELECTRO_200")
  expect(importStringFor("Capacitor_THT:CP_Radial_D6.3mm_P2.50mm")).toBe("CAP_ELECTRO_250")
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
  expect(importStringFor("Package_DIP:DIP-16_W7.62mm")).toBe("DIP16")
  expect(importStringFor("Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"))
    .toBe("SIP5")
})

test("an 8.0mm body rounds DOWN to the nearest enumerated diameter", () => {
  // 314.96 mil. The enumerated set has no 350, so this is nearest-member
  // selection over an uneven ladder, not rounding to 50 mil.
  expect(importStringFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm")).toBe("CAP_ELECTRO_300")
})

test("rounded-metric names for imperial parts are inside the pitch tolerance", () => {
  // P2.50mm is a nominal 0.1in part, 0.04mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")).toBe("CAP_CERAMIC1")
  // P7.50mm is a nominal 0.3in part, 0.12mm from the grid.
  expect(importStringFor("Capacitor_THT:C_Disc_D9.0mm_W2.5mm_P7.50mm")).toBe("CAP_CERAMIC3")
})

test("an off-grid pitch refuses, naming the measurement", () => {
  expect(() => importStringFor("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P9.40mm"))
    .toThrow(/9\.4.*2\.54.*0\.15/s)
})

test("a diameter equidistant between two enumerated types refuses", () => {
  // 8.89mm is 350.00000000000006 mil - the midpoint of the 300/400 gap, which
  // float error resolves in favour of 400 by 1.2e-13. Ambiguity is therefore
  // detected as a band, and this asserts the band is actually reachable.
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D8.89mm_P3.50mm"))
    .toThrow(/equidistant.*CAP_ELECTRO_300.*CAP_ELECTRO_400/s)
})

test("a diameter outside the enumerated range refuses", () => {
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D3.0mm_P2.00mm")).toThrow(/175.*650/s)
  expect(() => importStringFor("Capacitor_THT:CP_Radial_D20.0mm_P7.50mm")).toThrow(/175.*650/s)
})

test("an unrecognized family refuses, listing the shapes that derive", () => {
  expect(() => importStringFor("Package_TO_SOT_THT:TO-92_Inline"))
    .toThrow(/TO-92_Inline[\s\S]*R_Axial[\s\S]*PinHeader_1x/)
})

test("an override wins over the derivation", () => {
  const overrides = new Map([["Package_DIP:DIP-16_W7.62mm", "DIP16"]])
  expect(importStringFor("Package_DIP:DIP-16_W7.62mm", overrides)).toBe("DIP16")
})

test("pin-count types report their count; span types do not", () => {
  expect(declaredPinCount("DIP16")).toBe(16)
  expect(declaredPinCount("SIP5")).toBe(5)
  expect(declaredPinCount("RESISTOR4")).toBeNull()
  expect(declaredPinCount("CAP_ELECTRO_200")).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/kicad/import-string.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kicad/import-string.ts'`

- [ ] **Step 3: Implement the derivation**

Create `lib/kicad/import-string.ts`:

```ts
/**
 * Map KiCad footprint names onto VeroRoute "Import Strings".
 *
 * VeroRoute treats an imported netlist's package field as its component Type,
 * trying it first as a user-defined alias and then as an import string
 * directly. A netlist whose package field already holds a valid import string
 * therefore imports with no manual Part Aliases entry at all.
 *
 * THE GRAMMAR IS DELIBERATELY NARROW. Only the five families this repository
 * has evidence for are recognized; everything else refuses. The evidence is
 * `tests/fixtures/pt2399-core.net` paired with
 * `tests/fixtures/pt2399-core-veroroute.net` - the netlist a board that was
 * built and works was laid out from - which pins all seven of its distinct
 * footprints to the import strings that board actually used.
 */

/** Millimetres per 100-mil grid step. */
const GRID_MM = 2.54

const MM_PER_INCH = 25.4

/**
 * How far a lead pitch may sit from the grid and still be accepted.
 *
 * Sized for one specific phenomenon: KiCad names imperial parts in rounded
 * metric. `P2.50mm` IS a 0.1in part and is 0.04mm off; `P7.50mm` IS a 0.3in
 * part and is 0.12mm off; `P10.16mm` is exact. A tighter tolerance refuses
 * real, correct footprints. A much looser one starts accepting genuinely
 * off-pitch parts as though they fitted their holes.
 */
const PITCH_TOLERANCE_MM = 0.15

/** VeroRoute's lead-span suffix range, from CompTypes.h. */
const MIN_SPAN = 1
const MAX_SPAN = 15

/**
 * The electrolytic body diameters VeroRoute actually has types for, from the
 * fork's `Src/CompTypes.h`.
 *
 * THIS IS NOT A 50-MIL LADDER, and implementing it as one is the trap. There
 * is no 350, 450 or 550: the gaps are 50 mil below 300 and 100 mil above. A
 * part measuring 8.89mm (350 mil) rounded to the nearest 50 yields
 * "CAP_ELECTRO_350", which has no matching type and fails the import outright.
 */
const ELECTRO_DIAMETERS: readonly number[] = [200, 250, 300, 400, 500, 600]

/**
 * The domain over which "nearest enumerated diameter" is meaningful: half the
 * first gap below the smallest type, half the last gap above the largest.
 * Outside it, nearest-member selection is no longer a size claim anyone made.
 */
const MIN_ELECTRO_MILS = 175
const MAX_ELECTRO_MILS = 650

/**
 * How close two candidate diameters must be before the choice is called
 * ambiguous. Wide enough that float error cannot decide a midpoint case,
 * narrow enough that no real part lands in it: the nearest midpoints are 25 and
 * 50 mil from their neighbours.
 */
const TIE_BAND_MILS = 0.5

/**
 * Footprints whose import string is NOT what their name derives to.
 *
 * WHY THIS IS EMPTY, and why it is still here. Every footprint this repository
 * places today derives correctly from its name. A line belongs here when the
 * NAME LIES - a footprint copied into a personal library under a name whose
 * D/P fields no longer describe its pads - or when a part must be mapped
 * unconventionally, such as a non-polarized electrolytic, whose `_NP` types
 * exist in VeroRoute but which no KiCad footprint name distinguishes.
 *
 * Say in a comment beside the line WHY the derived answer is wrong for that
 * footprint. An override with no stated reason is indistinguishable from a
 * mistake.
 */
export const FOOTPRINT_IMPORT_STRINGS: ReadonlyMap<string, string> = new Map<string, string>()

/** The shapes this derives, quoted in every refusal so the operator can fix the source. */
const DERIVABLE_SHAPES = [
  "  R_Axial_*_P<mm>mm_*                    -> RESISTOR<n>      (n = pitch in 100-mil units)",
  "  C_Disc_*_P<mm>mm                       -> CAP_CERAMIC<n>   (n = pitch in 100-mil units)",
  "  CP_Radial_D<mm>mm_*                    -> CAP_ELECTRO<mil> (nearest of 200/250/300/400/500/600)",
  "  DIP-<pins>_*                           -> DIP<pins>",
  "  PinHeader_1x<pins>_*                   -> SIP<pins>",
].join("\n")

/** Strips the library prefix: "Capacitor_THT:C_Disc_..." -> "C_Disc_...". */
function bareName(footprint: string): string {
  const colon = footprint.indexOf(":")
  return colon === -1 ? footprint : footprint.slice(colon + 1)
}

function refuse(footprint: string, because: string): never {
  throw new Error(
    `no VeroRoute import string for footprint "${footprint}": ${because}\n` +
      `Shapes this derives:\n${DERIVABLE_SHAPES}\n` +
      "Either change the footprint so it follows one of those shapes, or add a line to " +
      "FOOTPRINT_IMPORT_STRINGS in lib/kicad/import-string.ts saying why this one is an exception.",
  )
}

/** Lead pitch in millimetres to a whole number of 100-mil grid steps. */
function gridSteps(mm: number, footprint: string): number {
  const steps = Math.round(mm / GRID_MM)
  const error = Math.abs(mm - GRID_MM * steps)
  if (error > PITCH_TOLERANCE_MM) {
    refuse(
      footprint,
      `its lead pitch ${mm}mm is ${error.toFixed(3)}mm from the nearest 2.54mm grid multiple ` +
        `(${(GRID_MM * steps).toFixed(2)}mm), which exceeds the ${PITCH_TOLERANCE_MM}mm tolerance.`,
    )
  }
  if (steps < MIN_SPAN || steps > MAX_SPAN) {
    refuse(footprint, `its lead span of ${steps} grid steps is outside VeroRoute's range ${MIN_SPAN}-${MAX_SPAN}.`)
  }
  return steps
}

/** Body diameter in millimetres to the nearest enumerated VeroRoute diameter. */
function electroDiameterMils(mm: number, footprint: string): number {
  const mils = (mm / MM_PER_INCH) * 1000
  if (mils < MIN_ELECTRO_MILS || mils > MAX_ELECTRO_MILS) {
    refuse(
      footprint,
      `its body diameter ${mm}mm (${mils.toFixed(1)} mil) is outside the range ` +
        `${MIN_ELECTRO_MILS}-${MAX_ELECTRO_MILS} mil over which VeroRoute's enumerated ` +
        `diameters (${ELECTRO_DIAMETERS.join(", ")}) are a meaningful choice.`,
    )
  }

  const ranked = ELECTRO_DIAMETERS
    .map((diameter) => ({ diameter, distance: Math.abs(mils - diameter) }))
    .sort((a, b) => a.distance - b.distance)
  const best = ranked[0]
  const runnerUp = ranked[1]
  if (best === undefined || runnerUp === undefined) {
    throw new Error("the enumerated diameter table needs at least two entries")
  }

  // AMBIGUITY IS A BAND, NOT AN EQUALITY. Testing `distance === distance` for a
  // tie is dead code: 8.89mm is 350.00000000000006 mil, so 400 wins by 1.2e-13
  // and the midpoint case silently resolves rather than refusing. A part within
  // half a mil of the midpoint genuinely does not determine its type.
  if (Math.abs(best.distance - runnerUp.distance) < TIE_BAND_MILS) {
    refuse(
      footprint,
      `its body diameter ${mm}mm (${mils.toFixed(1)} mil) is equidistant, to within ` +
        `${TIE_BAND_MILS} mil, between CAP_ELECTRO_${Math.min(best.diameter, runnerUp.diameter)} ` +
        `and CAP_ELECTRO_${Math.max(best.diameter, runnerUp.diameter)}. Picking one would be a ` +
        "physical-size claim nobody made.",
    )
  }
  return best.diameter
}

/** Reads a decimal field such as the "2.50" in "P2.50mm". */
function field(bare: string, pattern: RegExp): number | null {
  const match = pattern.exec(bare)
  if (match === null) return null
  const raw = match[1]
  if (raw === undefined) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function derive(footprint: string): string {
  const bare = bareName(footprint)

  if (bare.startsWith("R_Axial_")) {
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) refuse(footprint, "it is an R_Axial part with no readable _P<mm>mm pitch field.")
    return `RESISTOR${gridSteps(pitch, footprint)}`
  }

  if (bare.startsWith("C_Disc_")) {
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) refuse(footprint, "it is a C_Disc part with no readable _P<mm>mm pitch field.")
    return `CAP_CERAMIC${gridSteps(pitch, footprint)}`
  }

  if (bare.startsWith("CP_Radial_")) {
    const diameter = field(bare, /_D([0-9.]+)mm/)
    if (diameter === null) refuse(footprint, "it is a CP_Radial part with no readable _D<mm>mm diameter field.")
    return `CAP_ELECTRO_${electroDiameterMils(diameter, footprint)}`
  }

  if (bare.startsWith("DIP-")) {
    const pins = field(bare, /^DIP-([0-9]+)/)
    if (pins === null) refuse(footprint, "it is a DIP part with no readable pin count.")
    if (pins < 2 || pins > 254 || pins % 2 !== 0) {
      refuse(footprint, `a DIP pin count of ${pins} is not an even number in VeroRoute's range 2-254.`)
    }
    return `DIP${pins}`
  }

  if (bare.startsWith("PinHeader_1x")) {
    const pins = field(bare, /^PinHeader_1x([0-9]+)/)
    if (pins === null) refuse(footprint, "it is a PinHeader part with no readable pin count.")
    if (pins < 1 || pins > 255) {
      refuse(footprint, `a SIP pin count of ${pins} is outside VeroRoute's range 1-255.`)
    }
    return `SIP${pins}`
  }

  refuse(footprint, "its name matches none of the footprint families this repository derives.")
}

/**
 * The import string for a KiCad footprint: an override if one is recorded,
 * otherwise whatever its name derives to, otherwise a refusal that teaches.
 */
export function importStringFor(
  footprint: string,
  overrides: ReadonlyMap<string, string> = FOOTPRINT_IMPORT_STRINGS,
): string {
  const override = overrides.get(footprint)
  if (override !== undefined) return override
  return derive(footprint)
}

/**
 * Pin count a pin-count-suffixed import string declares, or null when the type
 * carries a lead span or a fixed geometry instead.
 *
 * A lead span cannot be validated this way: RESISTOR4 spans four grid steps
 * but still has two pins, so its suffix says nothing about pin numbering.
 */
export function declaredPinCount(importStr: string): number | null {
  for (const type of ["SIP", "DIP", "PADS"]) {
    // Anchored, so CAP_ELECTRO_200 is never read as a PADS-style count.
    const match = new RegExp(`^${type}([0-9]+)$`).exec(importStr)
    if (match !== null) {
      const raw = match[1]
      if (raw !== undefined) return Number(raw)
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/kicad/import-string.test.ts`
Expected: PASS — 9 pass.

- [ ] **Step 5: Add the 24-part assertion against the real board**

Append to `tests/kicad/import-string.test.ts`:

```ts
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"

test("every part of the built board derives the import string that board used", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const legacy = importLegacyNetlist(
    await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text(),
  )
  const used = new Map(legacy.components.map((c) => [c.designator, c.footprint]))

  expect(modern.components.length).toBe(24)
  for (const component of modern.components) {
    const footprint = component.footprint
    if (footprint === undefined) throw new Error(`${component.designator} has no footprint`)
    expect(importStringFor(footprint)).toBe(used.get(component.designator))
  }
})
```

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: PASS — 298 pass, 0 fail.

- [ ] **Step 7: Commit and push**

```bash
git add lib/kicad/import-string.ts tests/kicad/import-string.test.ts
git commit -m "Derive VeroRoute import strings from the five proven footprint families"
git push
```

---

### Task 3: Value notation

The canonical model parses values on the way in — `builder.ts` stores `{ farads: parseValue(value) }` — so the source spelling is gone by the time a `Network` exists. VeroRoute compares values as text, so the spelling has to be reconstructed.

**Files:**
- Create: `lib/kicad/value-notation.ts`
- Test: `tests/kicad/value-notation.test.ts`

**Interfaces:**
- Consumes: `Component` from `lib/model/types.ts`.
- Produces: `valueFor(component: Component): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/kicad/value-notation.test.ts`:

```ts
import { test, expect } from "bun:test"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import type { Component } from "../../lib/model/types.ts"

function capacitor(farads: number): Component {
  return { id: "c", kind: "capacitor", parameters: { farads }, pins: {}, units: [] }
}
function resistor(ohms: number): Component {
  return { id: "r", kind: "resistor", parameters: { ohms }, pins: {}, units: [] }
}

test("capacitances below 10nF are expressed in pF", () => {
  expect(valueFor(capacitor(5.6e-10))).toBe("560pF")
  expect(valueFor(capacitor(5.6e-9))).toBe("5600pF")
})

test("capacitances at or above 10nF are expressed in uF, leading zero stripped", () => {
  expect(valueFor(capacitor(1e-8))).toBe(".01uF")
  expect(valueFor(capacitor(1e-7))).toBe(".1uF")
  expect(valueFor(capacitor(4.7e-6))).toBe("4.7uF")
  expect(valueFor(capacitor(1e-5))).toBe("10uF")
  expect(valueFor(capacitor(4.7e-5))).toBe("47uF")
  expect(valueFor(capacitor(1e-4))).toBe("100uF")
})

test("resistances are expressed in uppercase K", () => {
  expect(valueFor(resistor(2700))).toBe("2.7K")
  expect(valueFor(resistor(10000))).toBe("10K")
  expect(valueFor(resistor(15000))).toBe("15K")
  expect(valueFor(resistor(100000))).toBe("100K")
})

test("decades the board does not exercise are refused, not guessed", () => {
  expect(() => valueFor(resistor(470))).toThrow(/1k.*999k/s)
  expect(() => valueFor(resistor(2e6))).toThrow(/1k.*999k/s)
  expect(() => valueFor(capacitor(2e-3))).toThrow(/1pF.*1000uF/s)
})

test("an IC's value is its manufacturer part number", () => {
  expect(valueFor({
    id: "delay_ic", kind: "ic", parameters: {}, pins: {}, units: [],
    part: { mpn: "PT2399", symbol: "Audio:PT2399" },
  })).toBe("PT2399")
})

test("a connector with no MPN falls back to its symbol's part name", () => {
  expect(valueFor({
    id: "header", kind: "connector", parameters: {}, pins: {}, units: [],
    part: { symbol: "Connector_Generic:Conn_01x05" },
  })).toBe("Conn_01x05")
})

test("a part with neither an MPN nor a symbol refuses", () => {
  expect(() => valueFor({
    id: "mystery", kind: "ic", parameters: {}, pins: {}, units: [],
  })).toThrow(/mystery/)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/kicad/value-notation.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kicad/value-notation.ts'`

- [ ] **Step 3: Implement the formatter**

Create `lib/kicad/value-notation.ts`:

```ts
/**
 * Reconstruct a KiCad value string from a canonical component.
 *
 * WHY THIS EXISTS. `lib/model/builder.ts` parses values on the way in -
 * `parameters: { farads: parseValue(value) }` - so ".1uF" is 1e-7 by the time
 * a Network exists, and neither Parameters nor PartSpec nor Provenance keeps
 * the spelling. VeroRoute compares values as TEXT, so a netlist saying "100nF"
 * where the board holds ".1uF" produces a Schematic delta line per part and
 * `--check` never reaches exit 0.
 *
 * Formatting from the numeric parameter was chosen over retaining the source
 * spelling in the model, because spelling is a display concern and the model
 * deliberately excludes those - Provenance is annotated "deliberately excluded
 * from electrical identity comparison", and value spelling is the same kind of
 * fact.
 *
 * DECADES THE BOARD DOES NOT EXERCISE ARE REFUSED. Extending this is a
 * deliberate one-line decision with a test, never a silent guess that surfaces
 * as a value delta on a board nobody has checked.
 *
 * This whole module is an artifact of the fork treating values as opaque
 * strings. If the fork ever compares values semantically it is deleted, and
 * its removal is a completion rather than a regression.
 */
import type { Component } from "../model/types.ts"

/** Capacitances below this are spelled in pF; at or above it, in uF. */
const PF_UF_BOUNDARY_FARADS = 1e-8

const MIN_FARADS = 1e-12
const MAX_FARADS = 1e-3
const MIN_OHMS = 1000
const MAX_OHMS = 999000

/**
 * A number as KiCad spells it: no exponent, no trailing zeros, no leading zero.
 *
 * `toPrecision(10)` then `Number` collapses the float noise that unit scaling
 * introduces - 4.7e-6 * 1e6 is 4.699999999999999 - without hard-coding a
 * decimal count that would round 5600 or .01 wrongly.
 */
function decimal(value: number): string {
  const text = String(Number(value.toPrecision(10)))
  if (text.includes("e")) {
    throw new Error(`value ${value} does not have a plain decimal spelling`)
  }
  return text.startsWith("0.") ? text.slice(1) : text
}

function capacitanceText(farads: number, id: string): string {
  if (!Number.isFinite(farads) || farads < MIN_FARADS || farads >= MAX_FARADS) {
    throw new Error(
      `capacitance ${farads}F on "${id}" is outside the range this formatter has been ` +
        "proven over (1pF to 1000uF). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  return farads < PF_UF_BOUNDARY_FARADS
    ? `${decimal(farads * 1e12)}pF`
    : `${decimal(farads * 1e6)}uF`
}

function resistanceText(ohms: number, id: string): string {
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms > MAX_OHMS) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1k to 999k). Extend lib/kicad/value-notation.ts with a test rather than " +
        "letting it guess a spelling.",
    )
  }
  return `${decimal(ohms / 1000)}K`
}

/** "Connector_Generic:Conn_01x05" -> "Conn_01x05". */
function symbolPartName(symbol: string): string {
  const colon = symbol.indexOf(":")
  return colon === -1 ? symbol : symbol.slice(colon + 1)
}

/**
 * A part's value as the netlist spells it.
 *
 * For a passive this is derived from its parameter. For a part with no
 * electrical parameter - an IC, a connector - KiCad's value field holds the
 * part name, so it comes from `part.mpn` where there is a genuine one and from
 * the symbol's part name otherwise. A part with neither refuses: an empty
 * value field would reconcile as a value change against every board.
 */
export function valueFor(component: Component): string {
  if (component.kind === "capacitor") {
    const farads: unknown = Reflect.get(component.parameters, "farads")
    if (typeof farads !== "number") {
      throw new Error(`capacitor "${component.id}" has no numeric farads parameter`)
    }
    return capacitanceText(farads, component.id)
  }
  if (component.kind === "resistor") {
    const ohms: unknown = Reflect.get(component.parameters, "ohms")
    if (typeof ohms !== "number") {
      throw new Error(`resistor "${component.id}" has no numeric ohms parameter`)
    }
    return resistanceText(ohms, component.id)
  }

  const mpn = component.part?.mpn
  if (mpn !== undefined) return mpn
  const symbol = component.part?.symbol
  if (symbol !== undefined) return symbolPartName(symbol)
  throw new Error(
    `component "${component.id}" (kind ${component.kind}) has neither an mpn nor a symbol, ` +
      "so there is nothing to put in the netlist's value field.",
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/kicad/value-notation.test.ts`
Expected: PASS — 7 pass.

- [ ] **Step 5: Run the full suite**

Run: `bun test`
Expected: PASS — 305 pass, 0 fail.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/value-notation.ts tests/kicad/value-notation.test.ts
git commit -m "Reconstruct KiCad value spelling from the canonical parameters"
git push
```

---

### Task 4: Lower a Network to an ImportedNetlist

The bridge between the canonical model and the KiCad vocabulary. Keeping this separate from the text writer is what lets both of Task 5's proofs compare structured values rather than strings.

**Files:**
- Create: `lib/kicad/from-network.ts`
- Test: `tests/kicad/from-network.test.ts`

**Interfaces:**
- Consumes: `importStringFor` (Task 2), `valueFor` (Task 3), `ImportedNetlist`/`ImportedComponent` from `lib/kicad/netlist.ts`, `Network`/`Component` from `lib/model/types.ts`.
- Produces: `toImportedNetlist(network: Network, designators: Readonly<Record<string, string>>, pinNumbers: Readonly<Record<string, Readonly<Record<string, string>>>>): ImportedNetlist`

- [ ] **Step 1: Write the failing test**

Create `tests/kicad/from-network.test.ts`:

```ts
import { test, expect } from "bun:test"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { circuit } from "../../lib/model/index.ts"

const DESIGNATORS = { r1: "R1", c1: "C1" }
const PIN_NUMBERS = { resistor: { a: "1", b: "2" }, capacitor: { a: "1", b: "2" } }

function twoPart() {
  return circuit()
    .resistor("r1", "10K", { a: "IN", b: "MID" },
      { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" })
    .capacitor("c1", ".1uF", { a: "MID", b: "GND" },
      { footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" })
    .port("input", "IN").port("ground", "GND")
    .done()
}

test("lowers components to designator, value and import string", () => {
  const result = toImportedNetlist(twoPart(), DESIGNATORS, PIN_NUMBERS)
  expect(result.components).toEqual([
    { designator: "R1", value: "10K", footprint: "RESISTOR4" },
    { designator: "C1", value: ".1uF", footprint: "CAP_CERAMIC1" },
  ])
})

test("collects nets as sorted designator.pin members", () => {
  const result = toImportedNetlist(twoPart(), DESIGNATORS, PIN_NUMBERS)
  expect(result.nets).toEqual({ IN: ["R1.1"], MID: ["C1.1", "R1.2"], GND: ["C1.2"] })
})

test("an unmapped component refuses rather than emitting a nameless part", () => {
  expect(() => toImportedNetlist(twoPart(), { r1: "R1" }, PIN_NUMBERS)).toThrow(/c1/)
})

test("a component with no footprint refuses", () => {
  const network = circuit()
    .resistor("r1", "10K", { a: "IN", b: "GND" })
    .port("input", "IN").port("ground", "GND")
    .done()
  expect(() => toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS)).toThrow(/r1.*footprint/s)
})

test("a pin count beyond the import string's declared count refuses", () => {
  const network = circuit()
    .connector("header", { "1": "A", "2": "B", "3": "C" },
      { symbol: "Connector_Generic:Conn_01x02",
        footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical" })
    .port("a", "A").port("b", "B").port("c", "C")
    .done()
  expect(() => toImportedNetlist(network, { header: "J1" }, PIN_NUMBERS))
    .toThrow(/J1.*SIP2.*declares only 2/s)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/kicad/from-network.test.ts`
Expected: FAIL — `Cannot find module '../../lib/kicad/from-network.ts'`

- [ ] **Step 3: Implement the lowering**

Create `lib/kicad/from-network.ts`:

```ts
/**
 * Lower a canonical Network into the KiCad vocabulary.
 *
 * The result is an `ImportedNetlist` - the same shape the readers produce -
 * which is what lets the writer's tests compare structured values through the
 * reader rather than comparing text. The package field holds a VeroRoute
 * import string rather than a KiCad footprint name, so the netlist imports
 * with no Part Aliases entry.
 */
import type { Component, Network } from "../model/types.ts"
import type { ImportedComponent, ImportedNetlist } from "./netlist.ts"
import { declaredPinCount, importStringFor } from "./import-string.ts"
import { valueFor } from "./value-notation.ts"

export type PinNumbers = Readonly<Record<string, Readonly<Record<string, string>>>>

function designatorFor(
  component: Component,
  designators: Readonly<Record<string, string>>,
): string {
  const designator = designators[component.id]
  if (designator === undefined) {
    throw new Error(
      `no designator mapped for component "${component.id}". Every component must appear in ` +
        "the circuit's DESIGNATORS map; a part with no designator cannot be matched to a board.",
    )
  }
  return designator
}

function footprintFor(component: Component): string {
  const footprint = component.part?.footprint
  if (footprint === undefined) {
    throw new Error(
      `component "${component.id}" has no part.footprint. The footprint is what yields the ` +
        "VeroRoute import string, which is layout-geometry identity, so it cannot be defaulted.",
    )
  }
  return footprint
}

/**
 * Pin count is a consistency assertion, not a second identity key.
 *
 * A lead span cannot be checked this way - RESISTOR4 spans four grid steps and
 * still has two pins - so only the pin-count-suffixed types are checked, and a
 * disagreement means the part and the footprint disagree about pin count.
 */
function assertPinCount(designator: string, importStr: string, pins: readonly string[]): void {
  const declared = declaredPinCount(importStr)
  if (declared === null) return
  for (const pin of pins) {
    const number = Number(pin)
    if (Number.isFinite(number) && number > declared) {
      throw new Error(
        `part ${designator}: the netlist references pin ${pin}, but its footprint maps to ` +
          `import string "${importStr}", which declares only ${declared} pins. The part and ` +
          "the footprint disagree about pin count.",
      )
    }
  }
}

export function toImportedNetlist(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
): ImportedNetlist {
  const components: ImportedComponent[] = []
  const nets: Record<string, string[]> = {}

  for (const component of network.components) {
    const designator = designatorFor(component, designators)
    const importStr = importStringFor(footprintFor(component))
    components.push({ designator, value: valueFor(component), footprint: importStr })

    const emitted: string[] = []
    const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
    for (const group of groups) {
      for (const [pin, connection] of Object.entries(group)) {
        if (connection.kind === "nc") continue
        const number = pinNumbers[component.kind]?.[pin] ?? pin
        emitted.push(number)
        ;(nets[connection.net] ??= []).push(`${designator}.${number}`)
      }
    }
    assertPinCount(designator, importStr, emitted)
  }

  for (const key of Object.keys(nets)) nets[key] = (nets[key] ?? []).sort()
  return { components, nets }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/kicad/from-network.test.ts`
Expected: PASS — 5 pass.

- [ ] **Step 5: Run the full suite**

Run: `bun test`
Expected: PASS — 310 pass, 0 fail.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/from-network.ts tests/kicad/from-network.test.ts
git commit -m "Lower a canonical Network into the KiCad netlist vocabulary"
git push
```

---

### Task 5: The EESchema v1.1 writer, and the two proofs

The writer lives beside its reader: one format, one module. The reader's hazard comment about parenthesised net names is as load-bearing for writing as for reading.

**Files:**
- Modify: `lib/kicad/legacy-netlist.ts`
- Test: `tests/kicad/legacy-netlist.test.ts`

**Interfaces:**
- Consumes: `ImportedNetlist` from `lib/kicad/netlist.ts`; `toImportedNetlist` (Task 4).
- Produces: `writeLegacyNetlist(netlist: ImportedNetlist, options: { createdAt: string }): string`

- [ ] **Step 1: Write the failing tests**

Append to `tests/kicad/legacy-netlist.test.ts`:

```ts
import { writeLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"

/** Component order is a set, so compare it sorted. Nets are already sorted by the reader. */
function normalize(netlist: ImportedNetlist) {
  return {
    components: [...netlist.components].sort((a, b) => a.designator.localeCompare(b.designator)),
    nets: netlist.nets,
  }
}

const FIXTURE = "tests/fixtures/pt2399-core-veroroute.net"
const CREATED_AT = "2026-09-15T21:32:09"

test("the writer is self-consistent through the reader", async () => {
  const a = importLegacyNetlist(await Bun.file(FIXTURE).text())
  const b = importLegacyNetlist(writeLegacyNetlist(a, { createdAt: CREATED_AT }))
  expect(normalize(b)).toEqual(normalize(a))
})

test("the full chain reproduces the netlist the built board was laid out from", async () => {
  const fixture = importLegacyNetlist(await Bun.file(FIXTURE).text())
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)
  const ours = importLegacyNetlist(writeLegacyNetlist(lowered, { createdAt: CREATED_AT }))
  expect(normalize(ours)).toEqual(normalize(fixture))
})

test("renaming a net without changing its membership is not an electrical change", async () => {
  // WHY THIS EXISTS. The two assertions above compare `nets` maps keyed by NAME,
  // which is stricter than the identity model requires: a net renamed without a
  // membership change is the same net, and reconciliation would treat it as a
  // no-op. The strictness is kept because it currently holds and a stricter
  // passing assertion is a better statement - but it invites the reading that
  // names ARE identity, which is the failure the membership model exists to
  // prevent. This workflow was built to survive KiCad's generated net names
  // migrating between electrical nets.
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)

  const renamed = {
    components: lowered.components,
    nets: Object.fromEntries(
      Object.entries(lowered.nets).map(([name, members]) =>
        [name.startsWith("Net-(") ? `renamed_${name.length}_${members.join("_")}` : name, members]),
    ),
  }

  // Membership comparison: the set of nets as sorted member lists, names discarded.
  const membership = (netlist: ImportedNetlist) =>
    Object.values(netlist.nets).map((members) => [...members].sort().join(",")).sort()

  const viaRenamed = importLegacyNetlist(writeLegacyNetlist(renamed, { createdAt: CREATED_AT }))
  const fixture = importLegacyNetlist(await Bun.file(FIXTURE).text())
  expect(membership(viaRenamed)).toEqual(membership(fixture))
})

test("net names containing parentheses survive a write/read round trip", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "C12", value: "5600pF", footprint: "CAP_CERAMIC1" }],
    nets: { "Net-(C12-Pad1)": ["C12.1"], GND: ["C12.2"] },
  }
  const reread = importLegacyNetlist(writeLegacyNetlist(netlist, { createdAt: CREATED_AT }))
  expect(reread.nets["Net-(C12-Pad1)"]).toEqual(["C12.1"])
})

test("a component with no pins refuses rather than writing a part VeroRoute cannot place", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R9", value: "10K", footprint: "RESISTOR4" }],
    nets: {},
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(/R9/)
})
```

`importLegacyNetlist` and the `test`/`expect` imports are already at the top of this file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/kicad/legacy-netlist.test.ts`
Expected: FAIL — `writeLegacyNetlist is not a function` (or an import error).

- [ ] **Step 3: Implement the writer**

Append to `lib/kicad/legacy-netlist.ts`:

```ts
/**
 * Write an EESchema v1.1 netlist - the mirror of `importLegacyNetlist`.
 *
 * THE PACKAGE FIELD HOLDS A VEROROUTE IMPORT STRING, not a KiCad footprint
 * name. VeroRoute treats that field as its component Type, so a netlist
 * written this way imports a fully typed board with no Part Aliases entry.
 *
 * The uuid field is not carried by the canonical model and is not carried by
 * the reader either, so it is written as "/" plus the designator: unique,
 * stable across runs, and meaningful to a human reading the file. Nothing
 * downstream reads it - the reader discards it - which is precisely why a
 * generated one is safe.
 *
 * Layout matches the files KiCad itself produces (two spaces after "created",
 * two between the package and the designator, pin numbers right-aligned in
 * five columns) so a diff against a real export stays readable. None of that
 * spacing is load-bearing: the reader tokenises on whitespace.
 */
export interface WriteOptions {
  /** ISO 8601 timestamp for the header comment. Explicit so output is reproducible. */
  readonly createdAt: string
}

export function writeLegacyNetlist(netlist: ImportedNetlist, options: WriteOptions): string {
  if (netlist.components.length === 0) {
    throw new Error("refusing to write a netlist with no components")
  }

  // Invert the net map once: the file is organized by component, the model by net.
  const pinsByDesignator = new Map<string, { pin: string; net: string }[]>()
  for (const [netName, members] of Object.entries(netlist.nets)) {
    for (const member of members) {
      const dot = member.lastIndexOf(".")
      if (dot === -1) {
        throw new Error(`net "${netName}" has a member "${member}" that is not designator.pin`)
      }
      const designator = member.slice(0, dot)
      const pin = member.slice(dot + 1)
      const existing = pinsByDesignator.get(designator)
      if (existing) existing.push({ pin, net: netName })
      else pinsByDesignator.set(designator, [{ pin, net: netName }])
    }
  }

  const lines: string[] = [`( { EESchema Netlist Version 1.1 created  ${options.createdAt} }`]

  for (const component of netlist.components) {
    const pins = pinsByDesignator.get(component.designator)
    if (pins === undefined || pins.length === 0) {
      throw new Error(
        `component ${component.designator} appears on no net. VeroRoute cannot place a part ` +
          "with no pins, and a netlist that declares one reads as a board with a missing part.",
      )
    }
    const footprint = component.footprint
    if (footprint === undefined || footprint.length === 0) {
      throw new Error(
        `component ${component.designator} has no package field. VeroRoute reads that field ` +
          "as its component Type and cannot import a part without one.",
      )
    }
    lines.push(` ( /${component.designator} ${footprint}  ${component.designator} ${component.value}`)
    // Numeric pin order where the pins are numbers, lexical otherwise, so a
    // 16-pin DIP reads 1..16 rather than 1, 10, 11.
    const ordered = [...pins].sort((a, b) => {
      const left = Number(a.pin)
      const right = Number(b.pin)
      if (Number.isFinite(left) && Number.isFinite(right)) return left - right
      return a.pin.localeCompare(b.pin)
    })
    for (const { pin, net } of ordered) {
      lines.push(`  (${pin.padStart(5)} ${net} )`)
    }
    lines.push(" )")
  }

  lines.push(")", "*", "")
  return lines.join("\n")
}
```

Add `ImportedNetlist` to the existing type-only import at the top of the file, which currently reads:

```ts
import type { ImportedComponent, ImportedNetlist } from "./netlist.ts"
```

(It already imports both, so no change is needed — verify before editing.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/kicad/legacy-netlist.test.ts`
Expected: PASS. The second test is the load-bearing one: the whole chain — circuit, designator map, pin numbering, footprint transcription, import-string derivation, value formatting and writer — reproduces the netlist a working board was built from.

- [ ] **Step 5: Run the full suite**

Run: `bun test`
Expected: PASS — 315 pass, 0 fail.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/legacy-netlist.ts tests/kicad/legacy-netlist.test.ts
git commit -m "Write EESchema v1.1 netlists, proven against the board that works"
git push
```

---

### Task 6: Board declarations

A `perfboard.json` beside each layout, naming the circuit module, its export, and the `.vrt`.

**Files:**
- Create: `tools/perfboard/declaration.ts`
- Test: `tests/perfboard/declaration.test.ts`

**Interfaces:**
- Produces:
  - `interface PerfboardDeclaration { file: string; dir: string; circuitPath: string; exportName: string; vrtPath: string }`
  - `loadDeclaration(file: string): PerfboardDeclaration`
  - `boardName(declaration: PerfboardDeclaration): string`
  - `discoverDeclarations(root: string): string[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/perfboard/declaration.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  boardName, discoverDeclarations, loadDeclaration,
} from "../../tools/perfboard/declaration.ts"

function withDeclaration(contents: string, run: (file: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-decl-"))
  try {
    const file = path.join(dir, "perfboard.json")
    fs.writeFileSync(file, contents)
    run(file)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const VALID = JSON.stringify({
  circuit: "../../circuits/pt2399-core.ts", export: "pt2399Core", vrt: "board.vrt",
})

test("resolves both paths against the declaration's own directory", () => {
  withDeclaration(VALID, (file) => {
    const declaration = loadDeclaration(file)
    expect(declaration.exportName).toBe("pt2399Core")
    expect(declaration.vrtPath).toBe(path.join(path.dirname(file), "board.vrt"))
    expect(path.isAbsolute(declaration.circuitPath)).toBe(true)
  })
})

test("the board name is its directory's basename, never a field", () => {
  withDeclaration(VALID, (file) => {
    expect(boardName(loadDeclaration(file))).toBe(path.basename(path.dirname(file)))
  })
})

test("absent, wrong-typed and empty fields are three different messages", () => {
  withDeclaration(JSON.stringify({ export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/missing required string field "circuit"/)
  })
  withDeclaration(JSON.stringify({ circuit: 5, export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/must be a string, got number/)
  })
  withDeclaration(JSON.stringify({ circuit: "  ", export: "x", vrt: "b.vrt" }), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/must not be empty/)
  })
})

test("an unreadable or malformed declaration names the file", () => {
  withDeclaration("{not json", (file) => {
    expect(() => loadDeclaration(file)).toThrow(/is not valid JSON/)
  })
  withDeclaration(JSON.stringify([1, 2]), (file) => {
    expect(() => loadDeclaration(file)).toThrow(/expected a JSON object at the top level/)
  })
})

test("discovery matches the exact basename, not a suffix", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-tree-"))
  try {
    fs.mkdirSync(path.join(root, "a"), { recursive: true })
    fs.mkdirSync(path.join(root, "node_modules", "b"), { recursive: true })
    fs.writeFileSync(path.join(root, "a", "perfboard.json"), VALID)
    fs.writeFileSync(path.join(root, "a", "other.perfboard.json"), VALID)
    fs.writeFileSync(path.join(root, "node_modules", "b", "perfboard.json"), VALID)
    expect(discoverDeclarations(root)).toEqual([path.join(root, "a", "perfboard.json")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/perfboard/declaration.test.ts`
Expected: FAIL — `Cannot find module '../../tools/perfboard/declaration.ts'`

- [ ] **Step 3: Implement the declaration**

Create `tools/perfboard/declaration.ts`:

```ts
/**
 * A `perfboard.json` sitting beside a stripboard layout, naming the circuit
 * that layout is supposed to match and the `.vrt` that holds it.
 *
 * Both paths resolve against the declaration's own directory, so a declaration
 * is readable from anywhere in the tree and says the same thing however it was
 * reached.
 *
 * `export` is REQUIRED and is not defaulted. A module may export several
 * circuits, and guessing which one a board was built from is exactly the class
 * of silent wrong answer this workflow exists to prevent.
 */
import fs from "node:fs"
import path from "node:path"

export interface PerfboardDeclaration {
  /** Absolute path to the perfboard.json itself. */
  readonly file: string
  /** The directory holding it, which relative fields resolve against. */
  readonly dir: string
  /** Absolute path to the circuit module, resolved from `dir`. */
  readonly circuitPath: string
  /** The named export in that module which returns the Network. */
  readonly exportName: string
  /** Absolute path to the VeroRoute layout, resolved from `dir`. */
  readonly vrtPath: string
}

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".tools", "dist"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Read one required string field.
 *
 * Absent, wrong-typed and empty are three different mistakes with three
 * different fixes, so they get three different messages. Every message names
 * the field and the file: a declaration is the only place these paths are
 * written down, and a message that does not name the field leaves the operator
 * diffing three-line JSON files by eye.
 */
function readString(parsed: unknown, key: string, file: string): string {
  if (!isRecord(parsed)) throw new Error(`${file}: expected a JSON object at the top level`)
  const value = parsed[key]
  if (value === undefined) throw new Error(`${file}: missing required string field "${key}"`)
  if (typeof value !== "string") {
    throw new Error(
      `${file}: field "${key}" must be a string, got ${value === null ? "null" : typeof value}`,
    )
  }
  if (value.trim() === "") throw new Error(`${file}: field "${key}" must not be empty`)
  return value
}

/**
 * Load one perfboard.json.
 *
 * Nothing is defaulted or guessed. The named circuit and layout are NOT
 * required to exist here: this function answers "what does this declaration
 * say", and the check that consumes it is what has to open those files and
 * fail naming them.
 */
export function loadDeclaration(file: string): PerfboardDeclaration {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${abs}: could not read perfboard.json: ${detail}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${abs}: perfboard.json is not valid JSON: ${detail}`)
  }

  const dir = path.dirname(abs)
  return {
    file: abs,
    dir,
    circuitPath: path.resolve(dir, readString(parsed, "circuit", abs)),
    exportName: readString(parsed, "export", abs),
    vrtPath: path.resolve(dir, readString(parsed, "vrt", abs)),
  }
}

/**
 * The name an operator types for a declared board: its directory's basename.
 *
 * Derived, never stored, so a renamed directory renames the board and a board
 * cannot end up answering to a name nothing on disk agrees with.
 */
export function boardName(declaration: PerfboardDeclaration): string {
  return path.basename(declaration.dir)
}

/**
 * Every perfboard.json under `root`, as absolute sorted paths.
 *
 * The match is on the EXACT basename: `pt2399-core.perfboard.json` is not a
 * declaration, and picking one up would check a board nobody declared.
 */
export function discoverDeclarations(root: string): string[] {
  const found: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name) || entry.name.endsWith("-backups")) continue
        walk(path.join(dir, entry.name))
      } else if (entry.name === "perfboard.json") {
        found.push(path.join(dir, entry.name))
      }
    }
  }
  walk(path.resolve(root))
  return found.sort()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/perfboard/declaration.test.ts`
Expected: PASS — 6 pass.

- [ ] **Step 5: Commit and push**

```bash
git add tools/perfboard/declaration.ts tests/perfboard/declaration.test.ts
git commit -m "Read and discover perfboard declarations"
git push
```

---

### Task 7: Loading a declared circuit, and the check

The check regenerates the netlist on every run, so the comparison is against the circuit as it is now rather than a checked-in netlist that may itself be stale.

**Files:**
- Create: `tools/perfboard/load.ts`
- Create: `tools/perfboard/check.ts`
- Test: `tests/perfboard/check.test.ts`

**Interfaces:**
- Consumes: `PerfboardDeclaration` (Task 6), `toImportedNetlist` (Task 4), `writeLegacyNetlist` (Task 5).
- Produces:
  - `loadCircuit(declaration: PerfboardDeclaration): Promise<Network>`
  - `verorouteBinary(env?: Env): string`
  - `checkPerfboard(declaration, deps?): Promise<PerfboardResult>` where `PerfboardResult = { declaration, ok: boolean, report: string }`

- [ ] **Step 1: Write the failing tests**

Create `tests/perfboard/check.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { checkPerfboard, verorouteBinary } from "../../tools/perfboard/check.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function declaration(vrtPath: string): PerfboardDeclaration {
  return {
    file: "/tmp/perfboard.json", dir: "/tmp",
    circuitPath: "/tmp/circuit.ts", exportName: "circuit", vrtPath,
  }
}

function withVrt(run: (vrtPath: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-"))
  const vrtPath = path.join(dir, "board.vrt")
  fs.writeFileSync(vrtPath, "59")
  return run(vrtPath).finally(() => fs.rmSync(dir, { recursive: true, force: true }))
}

const netlist = () => Promise.resolve("( { EESchema Netlist Version 1.1 created  x }\n)\n*\n")

test("VEROROUTE has no default and says what to set", () => {
  expect(() => verorouteBinary({})).toThrow(/VEROROUTE is not set/)
  expect(() => verorouteBinary({ VEROROUTE: "  " })).toThrow(/set but empty/)
  expect(verorouteBinary({ VEROROUTE: "/bin/veroroute" })).toBe("/bin/veroroute")
})

test("exit 0 is ok and exit 1 is not, both carrying the report verbatim", async () => {
  await withVrt(async (vrtPath) => {
    const clean = await checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 0, output: "Layout state\n  all nets complete\n" }),
    })
    expect(clean.ok).toBe(true)
    expect(clean.report).toBe("Layout state\n  all nets complete\n")

    const stale = await checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 1, output: "Schematic delta\n  C17 added\n" }),
    })
    expect(stale.ok).toBe(false)
    expect(stale.report).toBe("Schematic delta\n  C17 added\n")
  })
})

test("an unexpected exit status throws rather than being mapped to a verdict", async () => {
  await withVrt(async (vrtPath) => {
    await expect(checkPerfboard(declaration(vrtPath), {
      exportNetlist: netlist,
      runCheck: () => ({ status: 139, output: "" }),
    })).rejects.toThrow(/unexpected exit code 139/)
  })
})

test("a missing layout names the declaration's .vrt", async () => {
  await expect(checkPerfboard(declaration("/nonexistent/board.vrt"), {
    exportNetlist: netlist,
    runCheck: () => ({ status: 0, output: "" }),
  })).rejects.toThrow(/layout not found/)
})

test("a circuit that fails to export stops the run before the binary is reached", async () => {
  await withVrt(async (vrtPath) => {
    let ran = false
    await expect(checkPerfboard(declaration(vrtPath), {
      exportNetlist: () => Promise.reject(new Error("unmapped footprint")),
      runCheck: () => { ran = true; return { status: 0, output: "" } },
    })).rejects.toThrow(/unmapped footprint/)
    expect(ran).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/perfboard/check.test.ts`
Expected: FAIL — `Cannot find module '../../tools/perfboard/check.ts'`

- [ ] **Step 3: Implement the loader**

Create `tools/perfboard/load.ts`:

```ts
/**
 * Load the circuit a declaration names and call its export.
 *
 * Every failure mode names the declaration rather than surfacing as whatever
 * the module system said. A module that throws on import, a missing export, or
 * an export that is not a function returning a Network must all stop the run:
 * the alternative is an empty netlist, which reads as a board with no parts and
 * would reconcile as "delete everything".
 */
import type { Network } from "../../lib/model/types.ts"
import type { PerfboardDeclaration } from "./declaration.ts"

function isNetwork(value: unknown): value is Network {
  if (typeof value !== "object" || value === null) return false
  const candidate: Record<string, unknown> = value as Record<string, unknown>
  return Array.isArray(candidate["components"]) && typeof candidate["ports"] === "object"
}

export async function loadCircuit(declaration: PerfboardDeclaration): Promise<Network> {
  let module: Record<string, unknown>
  try {
    module = (await import(declaration.circuitPath)) as Record<string, unknown>
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${declaration.file}: could not import the circuit at ${declaration.circuitPath}: ${detail}`,
    )
  }

  const exported = module[declaration.exportName]
  if (exported === undefined) {
    const available = Object.keys(module).sort().join(", ")
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} has no export named ` +
        `"${declaration.exportName}". It exports: ${available || "(nothing)"}.`,
    )
  }
  if (typeof exported !== "function") {
    throw new Error(
      `${declaration.file}: export "${declaration.exportName}" is a ${typeof exported}, ` +
        "not a function returning a Network.",
    )
  }

  const network: unknown = exported()
  if (!isNetwork(network)) {
    throw new Error(
      `${declaration.file}: export "${declaration.exportName}" did not return a Network.`,
    )
  }
  return network
}
```

- [ ] **Step 4: Implement the check**

Create `tools/perfboard/check.ts`:

```ts
/**
 * Check one declared layout against the circuit it was built from.
 *
 * THE REPORT IS CARRIED VERBATIM AND PARSED NOWHERE. `ok` comes from the exit
 * code alone. That matters more than it looks: a board whose circuit matches
 * has no `Schematic delta` section AT ALL - the heading is omitted, not left
 * empty - so any rule reading ok-ness out of the body would call a
 * not-fully-routed board clean, and would equally call a report that was never
 * produced clean.
 *
 * Exit 1 is deliberately ambiguous in the binary (unreadable board,
 * unparseable netlist, structural problem, circuit mismatch, or matching but
 * unrouted) and all five are not-ok. Anything other than 0 or 1 throws rather
 * than being mapped, because the one verdict a broken run must never produce is
 * a clean board.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { writeLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { loadCircuit } from "./load.ts"

/**
 * Where to find the forked VeroRoute, and why there is no default here.
 *
 * A hardcoded $HOME/src/... is right on exactly one machine and wrong
 * everywhere else, and this module's whole job is to fail when something is
 * wrong. A binary the check cannot find has to stop the run naming what to set,
 * because a spawn that quietly fails is the shape that reads as a clean board.
 * The CLI supplies a default it is itself responsible for building; this module
 * does not.
 */
const BINARY_HINT =
  "Point it at the veroroute binary built from the perfboard fork, or run " +
  "`bun run perfboard veroroute` to build the pinned one."

export type Env = Readonly<Record<string, string | undefined>>

export function verorouteBinary(env: Env = process.env): string {
  const value = env["VEROROUTE"]
  if (value === undefined) {
    throw new Error(`VEROROUTE is not set, and this check has no default binary path. ${BINARY_HINT}`)
  }
  if (value.trim() === "") throw new Error(`VEROROUTE is set but empty. ${BINARY_HINT}`)
  return value
}

/** The exit status and the report text, as `checkPerfboard` consumes them. */
export interface CheckRun {
  readonly status: number
  readonly output: string
}

/**
 * Run `--check BOARD --netlist NETLIST`.
 *
 * `--netlist` is not optional and has no code path that omits it. Without it,
 * `--check` reads the board, compares nothing, and EXITS 0 with a warning on
 * stderr - a gate wired to that form is permanently green while looking
 * exactly like a passing one.
 *
 * stdout and stderr are concatenated because the two carry different halves of
 * the answer: the report body is on stdout, but an unreadable board writes an
 * empty report and puts the only diagnostic on stderr.
 */
export function runVerorouteCheck(vrtPath: string, netPath: string, env: Env = process.env): CheckRun {
  const binary = verorouteBinary(env)
  const result = spawnSync(binary, ["--check", vrtPath, "--netlist", netPath], { encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run veroroute at ${binary}: ${result.error.message}. ${BINARY_HINT}`)
  }
  if (result.status === null) {
    throw new Error(
      `veroroute at ${binary} did not exit with a status (killed by a signal). ` +
        "Nothing was checked; this is not a board verdict.",
    )
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : ""
  const stderr = typeof result.stderr === "string" ? result.stderr : ""
  return { status: result.status, output: `${stdout}${stderr}` }
}

export interface CheckDeps {
  /** Injected so no test needs a circuit module on disk. */
  readonly exportNetlist?: (declaration: PerfboardDeclaration) => Promise<string>
  /** Injected so no test needs the veroroute binary. */
  readonly runCheck?: (vrtPath: string, netPath: string) => CheckRun
}

export interface PerfboardResult {
  readonly declaration: PerfboardDeclaration
  readonly ok: boolean
  /** veroroute's own report, verbatim. */
  readonly report: string
}

/** Load the declared circuit and lower it to an EESchema v1.1 netlist. */
async function exportNetlistFor(declaration: PerfboardDeclaration): Promise<string> {
  const network = await loadCircuit(declaration)
  const module = (await import(declaration.circuitPath)) as Record<string, unknown>
  const designators = module["DESIGNATORS"]
  const pinNumbers = module["PIN_NUMBERS"]
  if (typeof designators !== "object" || designators === null) {
    throw new Error(`${declaration.circuitPath} does not export a DESIGNATORS map`)
  }
  if (typeof pinNumbers !== "object" || pinNumbers === null) {
    throw new Error(`${declaration.circuitPath} does not export a PIN_NUMBERS map`)
  }
  const lowered = toImportedNetlist(
    network,
    designators as Readonly<Record<string, string>>,
    pinNumbers as Readonly<Record<string, Readonly<Record<string, string>>>>,
  )
  return writeLegacyNetlist(lowered, { createdAt: new Date().toISOString().slice(0, 19) })
}

export async function checkPerfboard(
  declaration: PerfboardDeclaration,
  deps: CheckDeps = {},
): Promise<PerfboardResult> {
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runCheck = deps.runCheck ?? ((vrt, net) => runVerorouteCheck(vrt, net))

  // Export BEFORE opening anything: a circuit that cannot be lowered - an
  // unmapped footprint, an unformattable value - must stop the run rather than
  // let the binary compare the board against a half-built netlist.
  const text = await exportNetlist(declaration)

  if (!fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath}: layout not found. The perfboard declaration names a .vrt that is not there.`,
    )
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-check-"))
  let run: CheckRun
  try {
    const netPath = path.join(dir, `${path.basename(declaration.vrtPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, text)
    run = runCheck(declaration.vrtPath, netPath)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  if (run.status === 0) return { declaration, ok: true, report: run.output }
  if (run.status === 1) return { declaration, ok: false, report: run.output }
  throw new Error(
    `veroroute exited with unexpected exit code ${run.status} checking ` +
      `${declaration.vrtPath}: ${run.output}`,
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test tests/perfboard/check.test.ts`
Expected: PASS — 5 pass.

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: PASS — 326 pass, 0 fail.

- [ ] **Step 7: Commit and push**

```bash
git add tools/perfboard/load.ts tools/perfboard/check.ts tests/perfboard/check.test.ts
git commit -m "Check a declared layout against the circuit it was built from"
git push
```

---

### Task 8: The CLI

The directory you are standing in is the context. There is deliberately no `BOARD=<name>` flag: two ways to say which board is two places for one fact to be wrong.

**Files:**
- Create: `tools/cli/entrypoint.ts`
- Create: `tools/cli/perfboard.ts`
- Modify: `package.json`
- Test: `tests/cli/perfboard.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6 and 7.
- Produces: `runCli(argv: string[], opts?: RunCliOptions): Promise<number>`

- [ ] **Step 1: Write the failing tests**

Create `tests/cli/perfboard.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function tree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-cli-"))
  fs.mkdirSync(path.join(root, "boards", "demo"), { recursive: true })
  fs.writeFileSync(
    path.join(root, "boards", "demo", "perfboard.json"),
    JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "demo.vrt" }),
  )
  return root
}

const okCheck = (declaration: PerfboardDeclaration) =>
  Promise.resolve({ declaration, ok: true, report: "" })

test("--help exits 0 and lists every verb", async () => {
  const lines: string[] = []
  const code = await runCli(["--help"], { log: (line) => lines.push(line) })
  expect(code).toBe(0)
  const usage = lines.join("\n")
  for (const verb of ["check", "cuts", "update", "stripboard", "edit", "board-info", "boards", "veroroute"]) {
    expect(usage).toContain(verb)
  }
})

test("an unknown verb exits 1 rather than defaulting to check", async () => {
  const errors: string[] = []
  expect(await runCli(["frobnicate"], { error: (line) => errors.push(line) })).toBe(1)
  expect(errors.join("\n")).toContain("frobnicate")
})

test("check walks down from the directory it was run in", async () => {
  const root = tree()
  try {
    const checked: string[] = []
    const code = await runCli(["check"], {
      cwd: root,
      log: () => {},
      check: (declaration) => { checked.push(declaration.vrtPath); return okCheck(declaration) },
    })
    expect(code).toBe(0)
    expect(checked).toEqual([path.join(root, "boards", "demo", "demo.vrt")])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a stale board fails the run but does not stop the batch", async () => {
  const root = tree()
  try {
    fs.mkdirSync(path.join(root, "boards", "second"), { recursive: true })
    fs.writeFileSync(
      path.join(root, "boards", "second", "perfboard.json"),
      JSON.stringify({ circuit: "c.ts", export: "demo", vrt: "second.vrt" }),
    )
    let count = 0
    const code = await runCli(["check"], {
      cwd: root, log: () => {}, error: () => {},
      check: (declaration) => {
        count += 1
        return Promise.resolve({ declaration, ok: false, report: "Schematic delta\n  C17 added\n" })
      },
    })
    expect(code).toBe(1)
    expect(count).toBe(2)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a check that throws reaches the exit code, never a silent skip", async () => {
  const root = tree()
  try {
    const code = await runCli(["check"], {
      cwd: root, log: () => {}, error: () => {},
      check: () => Promise.reject(new Error("VEROROUTE is not set")),
    })
    expect(code).toBe(1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("no declarations anywhere is a failure, not a quiet success", async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-empty-"))
  try {
    expect(await runCli(["check"], { cwd: empty, log: () => {}, error: () => {} })).toBe(1)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }
})

test("board-info prints what the directory declares", async () => {
  const root = tree()
  try {
    const lines: string[] = []
    const code = await runCli(["board-info"], {
      cwd: path.join(root, "boards", "demo"), log: (line) => lines.push(line),
    })
    expect(code).toBe(0)
    expect(lines.join("\n")).toContain("demo")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/cli/perfboard.test.ts`
Expected: FAIL — `Cannot find module '../../tools/cli/perfboard.ts'`

- [ ] **Step 3: Implement the entrypoint helper**

Create `tools/cli/entrypoint.ts`:

```ts
/**
 * True when this module is the process's entry point.
 *
 * Kept separate so `runCli` never calls `process.exit` and stays testable: a
 * CLI that exits inside its own body cannot be asserted on.
 */
import path from "node:path"

export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  return path.resolve(entry) === path.resolve(new URL(moduleUrl).pathname)
}
```

- [ ] **Step 4: Implement the CLI**

Create `tools/cli/perfboard.ts`:

```ts
/**
 * The perfboard verbs.
 *
 * THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. A directory holding a
 * perfboard.json is a BOARD and the verbs act on it; any other directory is an
 * aggregate and `check` walks down from there. There is deliberately no
 * BOARD=<name> flag: two ways to say which board is two places for one fact to
 * be wrong. To act on a board from elsewhere, cd to it.
 *
 * WHAT WRITES: `check`, `cuts`, `board-info` and `boards` write nothing.
 * `update` and `stripboard` write the declared layout IN PLACE, because git is
 * the undo and a verb that wrote a copy somewhere else and told you to move it
 * into position would hand you the one step that can go wrong.
 */
import path from "node:path"
import { isMain } from "./entrypoint.ts"
import { checkPerfboard, type PerfboardResult } from "../perfboard/check.ts"
import {
  boardName, discoverDeclarations, loadDeclaration, type PerfboardDeclaration,
} from "../perfboard/declaration.ts"

const VERBS = [
  ["check", "check this layout against the circuit it was built from"],
  ["cuts", "print the cut list and solder bridges"],
  ["update", "apply the circuit to this layout, in place"],
  ["stripboard", "convert this layout to strip mode, in place"],
  ["edit", "open this layout in the forked VeroRoute"],
  ["board-info", "what this directory declares"],
  ["boards", "every declared board under this directory"],
  ["veroroute", "acquire and build the pinned VeroRoute fork"],
] as const

const USAGE = [
  "perfboard - keep a hand-built stripboard layout in step with its circuit.",
  "",
  "Usage: bun run perfboard <verb>",
  "",
  "The directory you are standing in is the context: run a verb inside a board's",
  "directory to act on that board, or higher up to walk down to every board.",
  "",
  "Verbs:",
  ...VERBS.map(([name, description]) => `  ${name.padEnd(12)} ${description}`),
  "",
  "Environment:",
  "  VEROROUTE    the binary built from the perfboard fork. A check that cannot",
  "               find it stops the run naming the variable, rather than passing",
  "               a board nothing was run against.",
  "",
  "Exit codes:",
  "  0  every declared layout checked clean (or --help was given)",
  "  1  an unknown verb, or a layout that was not shown to be in sync. A board",
  "     that could not be checked at all is a failure here and never a skip.",
].join("\n")

export interface RunCliOptions {
  readonly cwd?: string
  readonly log?: (line: string) => void
  readonly error?: (line: string) => void
  /** Injected so the CLI is testable without a veroroute binary. */
  readonly check?: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The report as veroroute wrote it, indented. Nothing is parsed, dropped,
 * reordered or summarized: the body is the only place the distinction between
 * exit-1 causes lives.
 */
function reportLines(report: string): string[] {
  const body = report.endsWith("\n") ? report.slice(0, -1) : report
  if (body.trim() === "") return ["  (no report text was produced for this board)"]
  return body.split("\n").map((line) => `  ${line}`)
}

/** The declaration in `dir` if there is one, otherwise every one beneath it. */
function targets(cwd: string): string[] {
  const here = path.join(cwd, "perfboard.json")
  const all = discoverDeclarations(cwd)
  return all.includes(here) ? [here] : all
}

async function runCheck(
  cwd: string,
  check: (declaration: PerfboardDeclaration) => Promise<PerfboardResult>,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const files = targets(cwd)
  if (files.length === 0) {
    // NOT exit 0. A discovery that finds nothing and succeeds is a gate that is
    // permanently green while looking exactly like a passing one.
    error(`no perfboard.json found in or under ${cwd}; nothing was checked.`)
    return 1
  }

  let failed = false
  for (const file of files) {
    let declaration: PerfboardDeclaration | null = null
    let result: PerfboardResult
    try {
      declaration = loadDeclaration(file)
      result = await check(declaration)
    } catch (caught) {
      failed = true
      // A failing check names the layout; a failing load has no layout path to
      // name, because reading one out of the declaration is what just failed.
      error(`FAIL ${declaration === null ? file : declaration.vrtPath}`)
      for (const line of reportLines(errorMessage(caught))) error(line)
      continue
    }
    if (result.ok) {
      log(`ok ${result.declaration.vrtPath}`)
      continue
    }
    failed = true
    error(`FAIL ${result.declaration.vrtPath}`)
    for (const line of reportLines(result.report)) error(line)
  }
  return failed ? 1 : 0
}

export async function runCli(argv: string[], opts: RunCliOptions = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd()
  const log = opts.log ?? ((line: string) => console.log(line))
  const error = opts.error ?? ((line: string) => console.error(line))
  const check = opts.check ?? ((declaration: PerfboardDeclaration) => checkPerfboard(declaration))

  const verb = argv[0]
  if (verb === undefined || verb === "--help" || verb === "-h" || verb === "help") {
    log(USAGE)
    return 0
  }

  if (verb === "check") return runCheck(cwd, check, log, error)

  if (verb === "boards") {
    const files = targets(cwd)
    if (files.length === 0) {
      error(`no perfboard.json found in or under ${cwd}`)
      return 1
    }
    for (const file of files) log(boardName(loadDeclaration(file)))
    return 0
  }

  if (verb === "board-info") {
    const here = path.join(cwd, "perfboard.json")
    if (!targets(cwd).includes(here)) {
      error(`${cwd} declares no board. Run this from a directory holding a perfboard.json.`)
      return 1
    }
    const declaration = loadDeclaration(here)
    log(`board:   ${boardName(declaration)}`)
    log(`circuit: ${declaration.circuitPath} (${declaration.exportName})`)
    log(`layout:  ${declaration.vrtPath}`)
    return 0
  }

  if (VERBS.some(([name]) => name === verb)) {
    error(
      `the "${verb}" verb needs the VeroRoute fork and is not wired up yet. ` +
        "It arrives with the fork acquisition.",
    )
    return 1
  }

  error(`unknown verb "${verb}". Run with --help to see the verbs.`)
  return 1
}

if (isMain(import.meta.url)) {
  process.exit(await runCli(process.argv.slice(2)))
}
```

- [ ] **Step 5: Add the package.json script**

In `package.json`, add to `scripts`:

```json
    "perfboard": "bun run tools/cli/perfboard.ts",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test tests/cli/perfboard.test.ts`
Expected: PASS — 7 pass.

- [ ] **Step 7: Run the full suite and the CLI itself**

```bash
bun test
bun run perfboard --help
```

Expected: 333 pass, 0 fail; the usage text lists all eight verbs.

- [ ] **Step 8: Commit and push**

```bash
git add tools/cli/entrypoint.ts tools/cli/perfboard.ts tests/cli/perfboard.test.ts package.json
git commit -m "Add the perfboard CLI, with the directory as board context"
git push
```

---

### Task 9: The board, the fork, and the fixed-point acceptance

This is the acceptance task and the only one requiring the binary. It is where inherited discrepancies surface.

**Files:**
- Create: `boards/pt2399-core/perfboard.json`
- Create: `boards/pt2399-core/pt2399-core.perfboard.vrt` (copied)
- Create: `boards/pt2399-core/pt2399-core.perfboard.png` (copied)
- Create: `veroroute.pin`
- Modify: `.gitignore`
- Modify: `docs/superpowers/specs/2026-09-21-pt2399-core-perfboard-port-design.md`

**Interfaces:**
- Consumes: the CLI from Task 8.
- Produces: a declared, checkable board.

- [ ] **Step 1: Carry the layout across**

```bash
mkdir -p boards/pt2399-core
cp /Users/orion/work/pedals-work/perfboard/pt2399/pt2399-core/pt2399-core/pt2399-core.perfboard.vrt boards/pt2399-core/
cp /Users/orion/work/pedals-work/perfboard/pt2399/pt2399-core/pt2399-core/pt2399-core.perfboard.png boards/pt2399-core/
```

Verify the layout is the expected VeroRoute format version:

```bash
head -c 2 boards/pt2399-core/pt2399-core.perfboard.vrt
```

Expected: `59` — `VRT_VERSION_CURRENT` for VeroRoute 2.40. A pre-60 board needs the fork's one-time `adopt` step before reconciliation can resolve `J1`'s generated pads; note the result for Step 6.

- [ ] **Step 2: Write the declaration, and commit the layout before anything can mutate it**

Create `boards/pt2399-core/perfboard.json`:

```json
{
  "circuit": "../../circuits/pt2399-core.ts",
  "export": "pt2399Core",
  "vrt": "pt2399-core.perfboard.vrt"
}
```

Then commit immediately, **before any mutating verb is run**:

```bash
git add boards/pt2399-core/
git commit -m "Carry the pt2399-core perfboard layout across from pedals"
```

This is not deferrable to the end of the task. The layout arrives untracked, every mutating verb refuses an untracked layout, and `git checkout --` cannot restore a file git has never seen — so without this commit the first `update` in step 7 is rejected rather than run.

- [ ] **Step 3: Pin the fork and ignore its build tree**

Create `veroroute.pin`:

```
repo    git@github.com:oletizi/veroroute-perfboard.git
commit  b09727dd8b9e1b0e9a0c8a0b0d0e0f0102030405
```

Replace the commit with the real one:

```bash
git -C /Users/orion/work/pedals-work/perfboard/.tools/veroroute-perfboard rev-parse HEAD
```

Append to `.gitignore`:

```
# The build system's own dependencies: the clone of the VeroRoute perfboard
# fork and its build tree. Never the operator's development checkout, which
# lives outside this repository entirely.
.tools/
```

- [ ] **Step 4: Verify the netlist the board will be checked against**

Before involving the binary, confirm the CLI produces the netlist the tests proved:

```bash
bun run perfboard board-info
```

Run from `boards/pt2399-core/`. Expected: the board name, the circuit path with `pt2399Core`, and the layout path — all three resolving to files that exist.

- [ ] **Step 5: Build the fork**

Build the pinned fork per its own README, and export the binary path:

```bash
export VEROROUTE="$HOME/src/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute"
```

Requires Homebrew `qt@5`; `qmake` then `make`. Warnings are expected and are not failures.

- [ ] **Step 6: Run the check and record what it reports**

```bash
cd boards/pt2399-core && bun run perfboard check
```

Expected: **exit 1 on the first run**, reporting inherited deltas. Record the report verbatim. The anticipated ones:

- `C3 retyped CAP_ELECTRO_300 -> CAP_ELECTRO_250` — the `.vrt` holds 300; the circuit, the derivation and the fixture all agree on 250. **Do not change the circuit to silence this.** Resolve it against the physical part: measure the fitted capacitor, and if it is 6.3mm the layout is what needs updating.
- Unrouted board-side nets, if the layout is still in isolated-hole mode.

- [ ] **Step 7: Reach the fixed point**

A single green check is not sufficient acceptance for a reconciliation system: it can hide a derivation wrong in a way the first pass tolerates, or an emitter stable only by accident.

**The commits below are load-bearing, not bookkeeping.** Every mutating verb refuses a layout that is modified relative to `HEAD` or untracked, so a run without them is rejected rather than executed. Step 2 of this task already committed the carried layout for exactly this reason; this is the second checkpoint.

```bash
bun run perfboard update      # only if step 6's deltas call for it
bun run perfboard check       # must exit 0

# The guard refuses the next update until this lands. Look at what the
# reconcile did before stacking another mutation on top of it.
git add boards/pt2399-core/pt2399-core.perfboard.vrt
git commit -m "Reconcile the pt2399-core layout against the circuit"

bun run perfboard update      # must report an EMPTY PLAN
bun run perfboard check       # must exit 0
```

The assertion at the second `update` is on **the plan being empty**, not on `.vrt` bytes: `--update` re-serializes on every write, so byte-identity across an empty-plan update is plausible but unverified. If it does hold, record that — it is worth knowing and the spec says so explicitly.

- [ ] **Step 8: Record the outcome in the spec**

Replace the "Risks and open questions" entries for C3 and strip mode with what actually happened, as measurements rather than expectations. Note whether the board needed the fork's `adopt` step.

- [ ] **Step 9: Commit and push**

```bash
git add boards/ veroroute.pin .gitignore docs/superpowers/specs/
git commit -m "Declare the pt2399-core perfboard, and record what the first check reported"
git push
```

---

## Self-Review

**Spec coverage.** Every section of the design maps to a task: footprint transcription → 1; narrow grammar and both quantization rules → 2; value notation → 3; the lowering → 4; the writer and both proofs → 5; declaration → 6; load + check → 7; CLI, cwd context and the write/read split → 8; board tree, fork pinning and fixed-point acceptance → 9.

**Two spec items deliberately deferred, and why.** The design lists `update`, `stripboard`, `edit` and `cuts` as verbs. Task 8 ships them as explicit refusals naming what is missing rather than as stubs that appear to work, because every one requires the binary and a verb that silently does nothing is the failure shape this workflow exists to prevent. Task 9 exercises them by hand.

The **layout-scoped dirty-state guard** likewise belongs to `update`/`stripboard`, and is not needed by any read-only verb shipped here. When those verbs are wired up, two contracts from the design apply and must be implemented once rather than per verb:

- The guard is a **shared prerequisite of mutation** — every verb that writes the declared `.vrt` passes it before VeroRoute is invoked, so a mutating verb added later cannot quietly omit it.
- The replace is **atomic**. The fork forces this shape rather than leaving it to preference: `--update` requires `-o` and has no in-place mode, and its serialization is a plain `QDataStream` over a `QFile` rather than a `QSaveFile`. So a mutating verb points `-o` at a temporary file *in the same directory as the declared layout* and `rename`s over the layout only after the binary exits successfully. Same-directory `rename(2)` is atomic, so the layout is either the old one or the new one, never half-written.

**Type consistency.** `ImportedNetlist` / `ImportedComponent` are the existing types from `lib/kicad/netlist.ts` and flow unchanged through Tasks 4, 5 and 7. `PerfboardDeclaration` uses `circuitPath` / `exportName` / `vrtPath` consistently in Tasks 6–9. `toImportedNetlist`, `writeLegacyNetlist`, `importStringFor`, `declaredPinCount`, `valueFor`, `loadCircuit`, `checkPerfboard` and `runCli` keep one signature each throughout.

**Test-count arithmetic.** 287 baseline → 288 (T1) → 298 (T2) → 305 (T3) → 310 (T4) → 315 (T5) → 321 (T6) → 326 (T7) → 333 (T8). Treat these as expectations to check, not as assertions; if a count differs, find out why before proceeding.
