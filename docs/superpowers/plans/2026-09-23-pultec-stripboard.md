# Pultec Stripboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the five Pultec sections exportable as VeroRoute netlists so their stripboard layouts can be hand-authored and machine-checked.

**Architecture:** A new *physicalization* stage sits between `partitionReference()` and the VeroRoute netlist. It attaches footprints, marks components off-board (exported as the fork's `PADS<n>`, whose pads are the board-side wire landings), and adds electrically transparent physical-only components — terminal blocks and chassis-ground landings. Every equivalence assertion is stated after projecting those physical-only components away.

**Tech Stack:** TypeScript on Bun, the canonical circuit model in `lib/model/`, the forked VeroRoute binary driven through `tools/perfboard/`.

**Spec:** `docs/superpowers/specs/2026-09-23-pultec-stripboard-design.md`

## Global Constraints

- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`. Run `bun run typecheck` before every commit.
- **No fallbacks or mock data outside test code.** Throw an error naming what is missing instead.
- **Imports are explicit relative paths with the file extension**: `"../lib/model/index.ts"`, never `"../lib/model"`.
- **Ids are semantic; designators belong to KiCad.** The Pultec reference's ids (`C1`, `R3`, `L_MID_2H`) are netlist-derived and stay as they are; `DESIGNATORS` is the only place ids and designators meet.
- **Files 300–500 lines maximum.** Split by responsibility if one grows past that.
- **No Claude/AI attribution in commit messages**, ever. No `Co-Authored-By`, no session links, no generated-with footer.
- **Never put `#` inside a bash heredoc or a multi-line quoted argument.** Write a file with the Write tool and use `git commit -F <file>` when a message needs more than `-m` lines.
- **Never use `sed` for write or execute operations** (`-i`, `w`, `e`). Use the Edit and Write tools.
- **Do not call anything "production-ready."**
- Value ranges and footprint families are proven with tests, never guessed. Extending one is a deliberate one-line decision with a test beside it.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/kicad/value-notation.ts` | MODIFY — formatters for inductance and potentiometer resistance; resistance below 1k; switches move to the identity fallback |
| `lib/kicad/import-string.ts` | MODIFY — terminal-block family, film-capacitor whitelist |
| `lib/kicad/from-network.ts` | MODIFY — off-board components export as `PADS<n>`; explicit pad order |
| `lib/board/physicalize.ts` | NEW — the physicalization types, the physical-only marker, and the projection helper |
| `reference/pultec/off-board.ts` | NEW — the single `OFF_BOARD` set |
| `reference/pultec/partition.ts` | MODIFY — `isBoardResident` reads `OFF_BOARD` instead of hardcoding kinds |
| `circuits/pultec/parts.ts` | NEW — shared footprint table, designators, pad orders |
| `circuits/pultec/<module>.ts` × 5 | NEW — one physicalized board circuit each |
| `tools/perfboard/check.ts` | MODIFY — read `OFF_BOARD` and `PAD_ORDER` from the circuit module |
| `tools/perfboard/create.ts` | NEW — the `create` verb's implementation |
| `tools/cli/perfboard.ts` | MODIFY — register `create` |
| `boards/pultec-<module>/` × 5 | NEW — `perfboard.json`, `Makefile`, the created `.vrt` |

---

## Task 1: Value formatters for inductors, pots and sub-kilohm resistors

`valueFor` refuses 22 of the Pultec's components. Verified by running it against
`partitionReference()`: every inductor, every potentiometer and every switch throws
on `UNFORMATTED_ELECTRICAL_KINDS`, and `R1` (430Ω) throws because the resistance
formatter is only proven from 1k up. Nothing exports until this is fixed.

The three kinds are not one problem. An **inductor** and a **potentiometer** each
carry a real electrical quantity and need a formatter. A **switch** does not: its
parameters are `positions` and `contacts`, which are topology, not a value. KiCad's
value field for a switch legitimately holds the part identity, so a switch belongs
on the existing mpn/symbol fallback rather than in the refuse-set.

The hardcoded refuse-set is then empty, and an empty list kept "for future kinds" is
a vestigial pattern. Replace it with a rule that maintains itself: if no branch
handled the component and its parameters carry a numeric quantity, refuse.

**Files:**
- Modify: `lib/kicad/value-notation.ts`
- Test: `tests/kicad/value-notation.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `valueFor(component: Component): string` — unchanged signature, wider domain. Task 6 relies on it accepting every Pultec component.

- [ ] **Step 1: Write the failing tests**

Add to `tests/kicad/value-notation.test.ts`:

```ts
import { test, expect } from "bun:test"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"

function twoPin(id: string, kind: Component["kind"], parameters: Component["parameters"]): Component {
  return {
    id,
    kind,
    parameters,
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("x"), b: net("y") } }],
  }
}

test("inductance below one henry is spelled in millihenries", () => {
  expect(valueFor(twoPin("L1", "inductor", { henries: 0.1 }))).toBe("100mH")
  expect(valueFor(twoPin("L2", "inductor", { henries: 0.22 }))).toBe("220mH")
  expect(valueFor(twoPin("L3", "inductor", { henries: 0.45 }))).toBe("450mH")
  expect(valueFor(twoPin("L4", "inductor", { henries: 0.6 }))).toBe("600mH")
})

test("inductance at or above one henry is spelled in henries", () => {
  expect(valueFor(twoPin("L5", "inductor", { henries: 1 }))).toBe("1H")
  expect(valueFor(twoPin("L6", "inductor", { henries: 2 }))).toBe("2H")
})

test("inductance outside the proven range refuses rather than guessing", () => {
  expect(() => valueFor(twoPin("L7", "inductor", { henries: 1e-7 }))).toThrow(/proven/)
  expect(() => valueFor(twoPin("L8", "inductor", { henries: 1000 }))).toThrow(/proven/)
})

test("resistance below one kilohm keeps its ohms spelling", () => {
  expect(valueFor(twoPin("R1", "resistor", { ohms: 430 }))).toBe("430R")
  expect(valueFor(twoPin("R2", "resistor", { ohms: 1 }))).toBe("1R")
})

test("resistance at or above one kilohm is unchanged by this task", () => {
  expect(valueFor(twoPin("R3", "resistor", { ohms: 4700 }))).toBe("4.7K")
  expect(valueFor(twoPin("R4", "resistor", { ohms: 1000 }))).toBe("1K")
  expect(valueFor(twoPin("R5", "resistor", { ohms: 100000 }))).toBe("100K")
})

test("a potentiometer is valued by its resistance, not its taper", () => {
  const pot: Component = {
    id: "RV1",
    kind: "potentiometer",
    parameters: { ohms: 47000, taper: { type: "log", curveConstant: 4.8 } },
    pins: {},
    units: [{ name: "MAIN", pins: { ccw: net("a"), wiper: net("b"), cw: net("c") } }],
  }
  expect(valueFor(pot)).toBe("47K")
})

test("a switch is valued by its part identity, because it has no quantity", () => {
  const sw: Component = {
    id: "SW1",
    kind: "switch",
    parameters: { positions: ["a", "b"], contacts: { a: [["common", "t1"]], b: [["common", "t2"]] } },
    part: { symbol: "Switch:SW_Rotary6" },
    pins: {},
    units: [{ name: "MAIN", pins: { common: net("c"), t1: net("x"), t2: net("y") } }],
  }
  expect(valueFor(sw)).toBe("SW_Rotary6")
})

test("a switch with no part identity refuses rather than emitting an empty value", () => {
  const sw: Component = {
    id: "SW2",
    kind: "switch",
    parameters: { positions: ["a"], contacts: { a: [] } },
    pins: {},
    units: [{ name: "MAIN", pins: { common: net("c") } }],
  }
  expect(() => valueFor(sw)).toThrow(/neither an mpn nor a symbol/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/kicad/value-notation.test.ts`

Expected: FAIL. The inductor, potentiometer and switch cases throw
"has an electrical parameter this formatter does not handle"; the 430R and 1R cases
throw "outside the range this formatter has been proven over (1k to 999k)".

- [ ] **Step 3: Widen the resistance range and add the two formatters**

In `lib/kicad/value-notation.ts`, replace the `MIN_OHMS` constant and
`resistanceText`:

```ts
const MIN_OHMS = 1
const MAX_OHMS = 999000

function resistanceText(ohms: number, id: string): string {
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms > MAX_OHMS) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1R to 999k). Extend lib/kicad/value-notation.ts with a test rather than " +
        "letting it guess a spelling.",
    )
  }
  // Sub-kilohm parts are spelled in ohms, as the reference documentation spells
  // them ("R1 430R" in reference/pultec/values.md). Dividing them by 1000 would
  // produce ".43K", which no schematic writes and which reconciles as a value
  // delta against a board built from the documentation.
  return ohms < 1000 ? `${decimal(ohms)}R` : `${decimal(ohms / 1000)}K`
}
```

Add the inductance formatter beside it:

```ts
const MIN_HENRIES = 1e-6
const MAX_HENRIES = 100

/**
 * Inductance as a netlist spells it.
 *
 * The boundary is one henry rather than the capacitance formatter's decade
 * split, because every Pultec value is between 100mH and 2H and a single
 * boundary there keeps both spellings free of a leading decimal point: 0.45H
 * would render as ".45H" through `decimal`, which strips the leading zero.
 */
function inductanceText(henries: number, id: string): string {
  if (!Number.isFinite(henries) || henries < MIN_HENRIES || henries > MAX_HENRIES) {
    throw new Error(
      `inductance ${henries}H on "${id}" is outside the range this formatter has been proven ` +
        "over (1uH to 100H). Extend lib/kicad/value-notation.ts with a test rather than " +
        "letting it guess a spelling.",
    )
  }
  return henries < 1 ? `${decimal(henries * 1000)}mH` : `${decimal(henries)}H`
}
```

- [ ] **Step 4: Replace the refuse-set with a self-maintaining rule**

Delete the `UNFORMATTED_ELECTRICAL_KINDS` constant and its docblock entirely, and
rewrite `valueFor`'s tail:

```ts
/**
 * Whether a component's parameters carry a numeric electrical quantity.
 *
 * This replaces a hardcoded list of kinds that had no formatter. A list has to
 * be edited whenever a kind gains a quantity, and the failure mode of
 * forgetting is silent: the part's IDENTITY goes into the field meant to hold
 * its VALUE - an inductor's part number where its inductance belongs. Asking
 * the parameters directly cannot be forgotten.
 *
 * A switch is the case that proves the rule is the right one: `positions` and
 * `contacts` are topology, not quantities, so a switch has no value to derive
 * and its identity is legitimately what the value field holds.
 */
function hasNumericQuantity(component: Component): boolean {
  return Object.values(component.parameters).some((value) => typeof value === "number")
}

export function valueFor(component: Component): string {
  if (component.kind === "capacitor") {
    const farads: unknown = Reflect.get(component.parameters, "farads")
    if (typeof farads !== "number") {
      throw new Error(`capacitor "${component.id}" has no numeric farads parameter`)
    }
    return capacitanceText(farads, component.id)
  }
  if (component.kind === "resistor" || component.kind === "potentiometer") {
    const ohms: unknown = Reflect.get(component.parameters, "ohms")
    if (typeof ohms !== "number") {
      throw new Error(`${component.kind} "${component.id}" has no numeric ohms parameter`)
    }
    return resistanceText(ohms, component.id)
  }
  if (component.kind === "inductor") {
    const henries: unknown = Reflect.get(component.parameters, "henries")
    if (typeof henries !== "number") {
      throw new Error(`inductor "${component.id}" has no numeric henries parameter`)
    }
    return inductanceText(henries, component.id)
  }
  if (hasNumericQuantity(component)) {
    throw new Error(
      `component "${component.id}" (kind "${component.kind}") carries a numeric electrical ` +
        "parameter this formatter does not handle, so its value cannot come from an mpn or " +
        "symbol fallback either - that would silently swap the part's identity in for its " +
        "electrical value. Add a formatter for this kind, proven with a test, before lowering " +
        "it to a netlist.",
    )
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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/kicad/value-notation.test.ts && bun run typecheck`

Expected: PASS, and no type errors. Note `taper` is an object, so
`hasNumericQuantity` on a potentiometer is never reached — the pot branch returns
first.

- [ ] **Step 6: Verify against every real Pultec component**

Run:

```bash
bun -e 'import {partitionReference,MODULE_OWNERS} from "./reference/pultec/partition.ts"; import {valueFor} from "./lib/kicad/value-notation.ts"; const s=partitionReference(); let bad=0; for (const o of MODULE_OWNERS) for (const c of s.modules[o]) { try { valueFor(c) } catch (e) { bad++; console.log(c.id, (e as Error).message.split("\n")[0]) } } console.log("refused:", bad)'
```

Expected: `refused: 12` — the six switches and six potentiometers, which have no
`part.symbol` yet. Task 6 gives them one. Every capacitor, resistor and inductor
must now pass; if any of those still refuse, the formatter is wrong.

- [ ] **Step 7: Run the whole suite and commit**

```bash
bun test && bun run typecheck
git add lib/kicad/value-notation.ts tests/kicad/value-notation.test.ts
git commit -m "Value formatters for inductance, pot resistance and sub-kilohm resistors"
```

---

## Task 2: Two new footprint families

`import-string.ts` derives five of the fork's sixteen part types. Two more are
needed: terminal blocks for the nets that cross between boards, and film capacitors
for the Pultec's own capacitors, which are neither ceramic discs nor radial
electrolytics.

Film capacitors get a **whitelist, not a derivation**, and the reason is specific.
Each existing family derives one free measurement into one VeroRoute parameter:
`C_Disc` pitch to span, `CP_Radial` diameter to the nearest enumerated diameter. A
film rule needs two — pitch to span, and body width to a choice between `CAP_FILM`
(one row) and `CAP_FILM_WIDE` (three rows). The second is not a measurement, it is a
classification of body geometry, and deriving it from a width field turns
dimensional similarity into assumed mechanical equivalence. The whitelist starts
empty and refuses loudly; Task 10 populates it from real parts.

**Files:**
- Modify: `lib/kicad/import-string.ts`
- Test: `tests/kicad/import-string.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `importStringFor(footprint: string, overrides?: ReadonlyMap<string,string>): string` — unchanged signature. `FILM_CAPACITOR_IMPORT_STRINGS: ReadonlyMap<string, string>`, exported so Task 10 can add entries and a test can assert it is consulted.

- [ ] **Step 1: Write the failing tests**

Add to `tests/kicad/import-string.test.ts`:

```ts
import { test, expect } from "bun:test"
import { importStringFor, declaredPinCount } from "../../lib/kicad/import-string.ts"

test("a 5.08mm terminal block derives to a 200-mil block", () => {
  expect(importStringFor("TerminalBlock:TerminalBlock_1x03_P5.08mm")).toBe("BLOCK_200MIL3")
})

test("a 5.00mm terminal block also derives to a 200-mil block", () => {
  // 5.00mm is 0.08mm from the 5.08mm grid multiple, inside the 0.15mm tolerance,
  // so the common KiCad 5.00mm parts are usable without an override.
  expect(importStringFor("TerminalBlock:TerminalBlock_1x02_P5.00mm")).toBe("BLOCK_200MIL2")
})

test("a 2.54mm terminal block derives to a 100-mil block", () => {
  expect(importStringFor("TerminalBlock:TerminalBlock_1x04_P2.54mm")).toBe("BLOCK_100MIL4")
})

test("a terminal block at a pitch that is neither one nor two grid steps refuses", () => {
  expect(() => importStringFor("TerminalBlock:TerminalBlock_1x02_P7.62mm")).toThrow(/3 grid steps/)
})

test("a terminal block with no readable pin count refuses", () => {
  expect(() => importStringFor("TerminalBlock:TerminalBlock_P5.08mm")).toThrow(/pin count/)
})

test("block pin counts are declared, so a netlist cannot reference a pin the block lacks", () => {
  expect(declaredPinCount("BLOCK_200MIL3")).toBe(3)
  expect(declaredPinCount("BLOCK_100MIL4")).toBe(4)
})

test("a film capacitor not on the whitelist refuses and says the list is how to add one", () => {
  expect(() => importStringFor("Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"))
    .toThrow(/FILM_CAPACITOR_IMPORT_STRINGS/)
})

test("a whitelisted film capacitor returns its recorded import string", () => {
  const whitelist = new Map([["Capacitor_THT:C_Rect_L4.6mm_W2.5mm_P2.50mm", "CAP_FILM1"]])
  expect(importStringFor("Capacitor_THT:C_Rect_L4.6mm_W2.5mm_P2.50mm", undefined, whitelist))
    .toBe("CAP_FILM1")
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/kicad/import-string.test.ts`

Expected: FAIL. Every new case throws "its name matches none of the footprint
families this repository derives", and the whitelist overload does not exist.

- [ ] **Step 3: Add the film-capacitor whitelist**

In `lib/kicad/import-string.ts`, beside `FOOTPRINT_IMPORT_STRINGS`:

```ts
/**
 * Film capacitors, by exact footprint name.
 *
 * A WHITELIST RATHER THAN A DERIVATION, and the asymmetry with the families
 * below is the reason. Each of those derives ONE free measurement into ONE
 * VeroRoute parameter - C_Disc's pitch to a span, CP_Radial's diameter to the
 * nearest enumerated diameter. A film capacitor needs two: the pitch to a span,
 * and the body width to a choice between CAP_FILM (one strip row) and
 * CAP_FILM_WIDE (three rows, "+++1+2+++"). That second one is not a
 * measurement, it is a classification of body geometry, and deriving it from a
 * width field would turn dimensional similarity into assumed mechanical
 * equivalence - a part that fits three strips because its name says 3.5mm, on a
 * board where it does not.
 *
 * So each entry is a part somebody has actually held. Empty until then: an
 * empty whitelist refuses loudly, where a general rule would quietly accept a
 * guess.
 */
export const FILM_CAPACITOR_IMPORT_STRINGS: ReadonlyMap<string, string> = new Map<string, string>()
```

- [ ] **Step 4: Add both derivations**

Add to `DERIVABLE_SHAPES`, after the `CP_Radial` line:

```ts
  "  TerminalBlock_*_1x<pins>_P<mm>mm         -> BLOCK_100MIL<n> / BLOCK_200MIL<n> by pitch",
```

Add to `derive`, before the final `refuse`:

```ts
  if (bare.startsWith("TerminalBlock")) {
    const pins = field(bare, /_1x([0-9]+)/)
    if (pins === null) {
      refuse(footprint, "it is a TerminalBlock part with no readable _1x<pins> pin count.")
    }
    if (pins < 1 || pins > 255) {
      refuse(footprint, `a terminal block pin count of ${pins} is outside VeroRoute's range 1-255.`)
    }
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) {
      refuse(footprint, "it is a TerminalBlock part with no readable _P<mm>mm pitch field.")
    }
    // VeroRoute has exactly two block pitches. A block at any other pitch does
    // not land on this board's holes at all, so it is refused rather than
    // rounded to whichever is closer.
    const steps = gridSteps(pitch, footprint)
    if (steps === 1) return `BLOCK_100MIL${pins}`
    if (steps === 2) return `BLOCK_200MIL${pins}`
    refuse(
      footprint,
      `its lead pitch ${pitch}mm is ${steps} grid steps, and VeroRoute's terminal blocks come ` +
        "only at 1 step (BLOCK_100MIL) or 2 steps (BLOCK_200MIL).",
    )
  }

  if (bare.startsWith("C_Rect_")) {
    refuse(
      footprint,
      "it is a film capacitor, whose import string is not derived from its name. Add it to " +
        "FILM_CAPACITOR_IMPORT_STRINGS in lib/kicad/import-string.ts, with its VeroRoute type " +
        "(CAP_FILM<n> for a body one strip wide, CAP_FILM_WIDE<n> for one three strips wide) " +
        "taken from the part in your hand rather than from the name.",
    )
  }
```

- [ ] **Step 5: Consult the whitelist in `importStringFor`**

```ts
export function importStringFor(
  footprint: string,
  overrides: ReadonlyMap<string, string> = FOOTPRINT_IMPORT_STRINGS,
  filmCapacitors: ReadonlyMap<string, string> = FILM_CAPACITOR_IMPORT_STRINGS,
): string {
  const override = overrides.get(footprint)
  if (override !== undefined) return override
  const film = filmCapacitors.get(footprint)
  if (film !== undefined) return film
  return derive(footprint)
}
```

- [ ] **Step 6: Extend `declaredPinCount` to cover blocks**

```ts
export function declaredPinCount(importStr: string): number | null {
  for (const type of ["SIP", "DIP", "PADS", "BLOCK_100MIL", "BLOCK_200MIL"]) {
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun test tests/kicad/import-string.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 8: Run the whole suite and commit**

```bash
bun test && bun run typecheck
git add lib/kicad/import-string.ts tests/kicad/import-string.test.ts
git commit -m "Terminal block and film capacitor footprint families"
```

---

## Task 3: Off-board components export as `PADS<n>`

The fork represents an off-board part as `PADS<n>`: it builds it as a `SIP<n>`, then
`BreakComponentIntoPads` splits it into n independently placeable pads, and
`Reconcile.cpp` synthesizes the board-side type back as `PADS<n>` so `--check`
compares like with like.

An off-board component therefore needs **no footprint** — only a pin count and a pad
order. `PIN_NUMBERS` cannot supply that order: it is keyed by kind, and `t_3kHz` is
throw 1 on `SW_HI_BOOST` but throw 8 on `SW_MID`, so one map would have to give one
name two numbers. The pad order is a fact about the concrete part, so it is declared
per component.

**Files:**
- Modify: `lib/kicad/from-network.ts`
- Test: `tests/kicad/from-network.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `export type PadOrders = Readonly<Record<string, readonly string[]>>` — component id to that component's pins in pad order.
  - `toImportedNetlist(network: Network, designators: Readonly<Record<string,string>>, pinNumbers: PinNumbers, offBoard?: ReadonlySet<string>, padOrders?: PadOrders): ImportedNetlist` — the two new parameters are optional so every existing caller compiles unchanged. Tasks 6, 7 and 8 pass them.

- [ ] **Step 1: Write the failing tests**

Add to `tests/kicad/from-network.test.ts`:

```ts
import { test, expect } from "bun:test"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const POT: Component = {
  id: "level_pot",
  kind: "potentiometer",
  parameters: { ohms: 47000, taper: { type: "linear" } },
  part: { symbol: "Device:R_Potentiometer" },
  pins: {},
  units: [{ name: "MAIN", pins: { ccw: net("IN"), wiper: net("W"), cw: net("OUT") } }],
}

const LOAD: Component = {
  id: "load",
  kind: "resistor",
  parameters: { ohms: 10000 },
  part: { footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" },
  pins: {},
  units: [{ name: "MAIN", pins: { a: net("W"), b: net("OUT") } }],
}

const NETWORK: Network = { ports: { input: "IN" }, components: [POT, LOAD] }
const DESIGNATORS = { level_pot: "RV1", load: "R1" }
const PIN_NUMBERS = { resistor: { a: "1", b: "2" } }

test("an off-board component exports as PADS with its pin count", () => {
  const lowered = toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper", "cw"] },
  )
  const pot = lowered.components.find((c) => c.designator === "RV1")
  expect(pot?.footprint).toBe("PADS3")
})

test("pad order decides the pin numbers, not the order the pins were written", () => {
  const lowered = toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["cw", "wiper", "ccw"] },
  )
  expect(lowered.nets["OUT"]).toContain("RV1.1")
  expect(lowered.nets["W"]).toContain("RV1.2")
  expect(lowered.nets["IN"]).toContain("RV1.3")
})

test("an off-board component needs no footprint", () => {
  expect(() => toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper", "cw"] },
  )).not.toThrow()
})

test("an off-board component with no declared pad order refuses", () => {
  expect(() => toImportedNetlist(NETWORK, DESIGNATORS, PIN_NUMBERS, new Set(["level_pot"]), {}))
    .toThrow(/no declared pad order/)
})

test("a pad order that is not a permutation of the component's pins refuses", () => {
  expect(() => toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper"] },
  )).toThrow(/does not list every pin/)

  expect(() => toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper", "cw", "shaft"] },
  )).toThrow(/"shaft"/)
})

test("on-board components are untouched by the off-board machinery", () => {
  const lowered = toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper", "cw"] },
  )
  const load = lowered.components.find((c) => c.designator === "R1")
  expect(load?.footprint).toBe("RESISTOR4")
})

test("a pad order declared for an on-board component refuses, because nothing would use it", () => {
  expect(() => toImportedNetlist(
    NETWORK, DESIGNATORS, PIN_NUMBERS,
    new Set(["level_pot"]),
    { level_pot: ["ccw", "wiper", "cw"], load: ["a", "b"] },
  )).toThrow(/"load" is not off-board/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/kicad/from-network.test.ts`

Expected: FAIL — `toImportedNetlist` takes three arguments, so the five-argument
calls are type errors and the pot throws "has no part.footprint" at runtime.

- [ ] **Step 3: Add the pad-order type and its validation**

In `lib/kicad/from-network.ts`:

```ts
/** Component id -> that component's pins, in the order their pads are numbered. */
export type PadOrders = Readonly<Record<string, readonly string[]>>

/** Every pin a component declares, package pins and unit pins together. */
function allPins(component: Component): readonly string[] {
  const pins = Object.keys(component.pins)
  for (const unit of component.units) pins.push(...Object.keys(unit.pins))
  return pins
}

/**
 * The declared pad order for an off-board component, checked to be a
 * permutation of its pins.
 *
 * A PERMUTATION, not a subset and not a superset. A short order leaves pins
 * with no pad, which reconciles as a part whose connections are missing; a long
 * one numbers a pad that no wire can ever reach. Both are silent on a board
 * nobody has checked, which is why neither is tolerated here.
 */
function padOrderFor(component: Component, padOrders: PadOrders): readonly string[] {
  const order = padOrders[component.id]
  if (order === undefined) {
    throw new Error(
      `off-board component "${component.id}" has no declared pad order. Its pads are numbered ` +
        "in that order and nothing else can supply it: PIN_NUMBERS is keyed by kind, and two " +
        "parts of one kind may put the same pin name in different positions.",
    )
  }
  const pins = new Set(allPins(component))
  for (const pin of order) {
    if (!pins.has(pin)) {
      throw new Error(
        `the pad order for "${component.id}" names "${pin}", which is not a pin of that ` +
          `component. Its pins are: ${[...pins].sort().join(", ")}.`,
      )
    }
  }
  if (order.length !== pins.size) {
    const missing = [...pins].filter((pin) => !order.includes(pin)).sort()
    throw new Error(
      `the pad order for "${component.id}" does not list every pin: ${missing.join(", ")} ` +
        `${missing.length === 1 ? "has" : "have"} no pad.`,
    )
  }
  return order
}
```

- [ ] **Step 4: Branch the export on off-board membership**

Replace the body of `toImportedNetlist`'s component loop. The on-board path is
unchanged; the off-board path skips `footprintFor` and numbers pins by pad order:

```ts
export function toImportedNetlist(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  offBoard: ReadonlySet<string> = new Set(),
  padOrders: PadOrders = {},
): ImportedNetlist {
  const components: ImportedComponent[] = []
  const nets: Record<string, string[]> = {}
  const seenDesignators = new Map<string, string>()

  for (const id of Object.keys(padOrders)) {
    if (!offBoard.has(id)) {
      throw new Error(
        `a pad order is declared for "${id}", but "${id}" is not off-board, so nothing would ` +
          "ever read it. An on-board part's pins are numbered through PIN_NUMBERS and its " +
          "footprint; a stale pad order here is a decision nobody is applying.",
      )
    }
  }

  for (const component of network.components) {
    const designator = designatorFor(component, designators)
    const previousId = seenDesignators.get(designator)
    if (previousId !== undefined) {
      throw new Error(
        `components "${previousId}" and "${component.id}" both map to designator "${designator}" ` +
          "in DESIGNATORS. Every physical part needs its own designator: sharing one merges both " +
          "parts' pins onto one board position, and the second part is never described to the " +
          "reconciler, so its placement and routing are never verified.",
      )
    }
    seenDesignators.set(designator, component.id)

    const isOffBoard = offBoard.has(component.id)
    const order = isOffBoard ? padOrderFor(component, padOrders) : undefined
    const importStr = isOffBoard
      ? `PADS${order?.length ?? 0}`
      : importStringFor(footprintFor(component))
    components.push({ designator, value: valueFor(component), footprint: importStr })

    const emitted: string[] = []
    const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
    for (const group of groups) {
      for (const [pin, connection] of Object.entries(group)) {
        if (connection.kind === "nc") continue
        const number = order === undefined
          ? pinNumberFor(component, pin, pinNumbers)
          : String(order.indexOf(pin) + 1)
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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/kicad/from-network.test.ts && bun run typecheck`

Expected: PASS. `declaredPinCount("PADS3")` returns 3, so `assertPinCount` also
proves the pad order and the pin count agree.

- [ ] **Step 6: Run the whole suite and commit**

```bash
bun test && bun run typecheck
git add lib/kicad/from-network.ts tests/kicad/from-network.test.ts
git commit -m "Export off-board components as PADS with an explicit pad order"
```

---

## Task 4: The physicalization module

A physical board is deliberately not identical to its electrical partition: it
carries components that appear in no electrical model. A terminal block is the
example. It is *electrically transparent* in a precise, checkable sense — it
contributes one pin to each of n **different** nets and joins nothing to anything —
and that property is what makes "project it away" a well-defined operation rather
than a judgement call.

This module owns the marker and the projection. Every equivalence assertion later in
this plan is stated after projecting.

**Files:**
- Create: `lib/board/physicalize.ts`
- Test: `tests/board/physicalize.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PHYSICAL_ONLY: "physical-only"` — the provenance `source` value marking a component as belonging to the board rather than the circuit.
  - `physicalOnly(component: Component): boolean`
  - `assertElectricallyTransparent(component: Component): void` — throws if a physical-only component joins two of its own pins to the same net.
  - `projectPhysical(network: Network): Network` — the same network with physical-only components removed, and with any net left with no members dropped from nothing (nets are implied by pins, so removal is automatic).

- [ ] **Step 1: Write the failing tests**

Create `tests/board/physicalize.test.ts`:

```ts
import { test, expect } from "bun:test"
import {
  PHYSICAL_ONLY,
  assertElectricallyTransparent,
  physicalOnly,
  projectPhysical,
} from "../../lib/board/physicalize.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const CAP: Component = {
  id: "c1",
  kind: "capacitor",
  parameters: { farads: 1e-7 },
  pins: {},
  units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
}

const BLOCK: Component = {
  id: "terminals",
  kind: "connector",
  parameters: {},
  part: { footprint: "TerminalBlock:TerminalBlock_1x02_P5.08mm", electricallyInert: true },
  pins: {},
  units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("GND") } }],
  provenance: { source: PHYSICAL_ONLY },
}

test("a component is physical-only when its provenance says so", () => {
  expect(physicalOnly(BLOCK)).toBe(true)
  expect(physicalOnly(CAP)).toBe(false)
})

test("projection removes physical-only components and keeps the rest", () => {
  const board: Network = { ports: { input: "IN" }, components: [CAP, BLOCK] }
  const projected = projectPhysical(board)
  expect(projected.components.map((c) => c.id)).toEqual(["c1"])
  expect(projected.ports).toEqual({ input: "IN" })
})

test("a transparent component puts each pin on a different net", () => {
  expect(() => assertElectricallyTransparent(BLOCK)).not.toThrow()
})

test("a physical-only component that joins two pins to one net is not transparent", () => {
  const shorting: Component = {
    ...BLOCK,
    id: "shorting_block",
    units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("IN") } }],
  }
  expect(() => assertElectricallyTransparent(shorting)).toThrow(/joins pins/)
})

test("projecting a network with no physical-only components changes nothing", () => {
  const board: Network = { ports: {}, components: [CAP] }
  expect(projectPhysical(board).components).toEqual([CAP])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/board/physicalize.test.ts`

Expected: FAIL with "Cannot find module '../../lib/board/physicalize.ts'".

- [ ] **Step 3: Write the module**

Create `lib/board/physicalize.ts`:

```ts
/**
 * The stage between an electrical module and a physical board.
 *
 * `partitionReference()` answers what portion of the circuit belongs to a
 * module. Physicalization answers how that module is realized on a board: what
 * footprint each component has, which components sit off the board, and what
 * the board carries that the circuit does not.
 *
 * That last part is why this module exists. A board may hold components that
 * appear in NO electrical model - a terminal block, a chassis-ground landing -
 * and without a name for them, any statement that a board matches its partition
 * is either false or has to be weakened until it proves nothing. Naming them
 * makes the statement exact instead: the board matches its partition AFTER the
 * physical-only components are projected away.
 */
import type { Component, Network } from "../model/types.ts"

/** The `provenance.source` that marks a component as the board's, not the circuit's. */
export const PHYSICAL_ONLY = "physical-only"

export function physicalOnly(component: Component): boolean {
  return component.provenance?.source === PHYSICAL_ONLY
}

/**
 * Refuse a physical-only component that is not electrically transparent.
 *
 * Transparent means: it contributes one pin to each of n DIFFERENT nets and
 * joins nothing to anything. That is the whole justification for projecting
 * these components away - a component that shorted two nets together would
 * change the circuit, and projecting it away would hide the change. The
 * projection is only sound because this holds, so it is asserted rather than
 * assumed.
 */
export function assertElectricallyTransparent(component: Component): void {
  const seen = new Map<string, string>()
  const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
  for (const group of groups) {
    for (const [pin, connection] of Object.entries(group)) {
      if (connection.kind !== "net") continue
      const previous = seen.get(connection.net)
      if (previous !== undefined) {
        throw new Error(
          `physical-only component "${component.id}" joins pins "${previous}" and "${pin}" to ` +
            `the same net "${connection.net}". A physical-only component is projected away when ` +
            "the board is compared against its electrical partition, and projecting away " +
            "something that joins two nets would hide a change to the circuit.",
        )
      }
      seen.set(connection.net, pin)
    }
  }
}

/**
 * The board's electrical content: everything except the physical-only parts.
 *
 * Ports are carried through unchanged. Nets need no cleanup because they are
 * implied by pin references rather than declared, so a net whose only member
 * was a projected component simply stops existing.
 */
export function projectPhysical(network: Network): Network {
  return {
    ports: network.ports,
    components: network.components.filter((component) => !physicalOnly(component)),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/board/physicalize.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
bun test && bun run typecheck
git add lib/board/physicalize.ts tests/board/physicalize.test.ts
git commit -m "Physicalization: the physical-only marker and its projection"
```

---

## Task 5: Residency becomes data

`isBoardResident` is a kind rule today: `kind !== "potentiometer" && kind !== "switch"`.
That cannot express an off-board inductor, and it makes moving a pot on-board a code
change rather than a decision. It becomes a lookup against one explicit set.

Every inductor starts off-board. No inductor part has been chosen, and `L_Axial_*`
would be an unfounded claim if the part turns out to be a pot core or a transformer
winding. Per-section placement is the target; this is the honest starting state.

**Files:**
- Create: `reference/pultec/off-board.ts`
- Modify: `reference/pultec/partition.ts`
- Test: `tests/reference/off-board.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `OFF_BOARD: ReadonlySet<string>` from `reference/pultec/off-board.ts`. Tasks 6, 7 and 8 import it. `isBoardResident(component: Component): boolean` keeps its signature.

- [ ] **Step 1: Write the failing test**

Create `tests/reference/off-board.test.ts`:

```ts
import { test, expect } from "bun:test"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { isBoardResident } from "../../reference/pultec/partition.ts"
import { THREE_BAND_REFERENCE } from "../../reference/pultec/three-band.ts"

test("every off-board id names a component that exists", () => {
  const ids = new Set(THREE_BAND_REFERENCE.components.map((c) => c.id))
  const strays = [...OFF_BOARD].filter((id) => !ids.has(id)).sort()
  expect(strays).toEqual([])
})

test("every pot, switch and inductor is named explicitly, with no default", () => {
  const shouldBeNamed = THREE_BAND_REFERENCE.components
    .filter((c) => c.kind === "potentiometer" || c.kind === "switch" || c.kind === "inductor")
    .map((c) => c.id)
  const unnamed = shouldBeNamed.filter((id) => !OFF_BOARD.has(id)).sort()
  expect(unnamed).toEqual([])
})

test("no passive is off-board", () => {
  const passives = THREE_BAND_REFERENCE.components
    .filter((c) => c.kind === "capacitor" || c.kind === "resistor")
    .map((c) => c.id)
  expect(passives.filter((id) => OFF_BOARD.has(id))).toEqual([])
})

test("residency reads the set rather than the kind", () => {
  for (const component of THREE_BAND_REFERENCE.components) {
    expect(isBoardResident(component)).toBe(!OFF_BOARD.has(component.id))
  }
})

test("all nine inductors start off-board, because no part has been chosen", () => {
  const inductors = THREE_BAND_REFERENCE.components.filter((c) => c.kind === "inductor")
  expect(inductors.length).toBe(9)
  for (const inductor of inductors) expect(OFF_BOARD.has(inductor.id)).toBe(true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/reference/off-board.test.ts`

Expected: FAIL with "Cannot find module '../../reference/pultec/off-board.ts'".

- [ ] **Step 3: Write the off-board set**

Create `reference/pultec/off-board.ts`:

```ts
/**
 * Which Pultec components do not sit on a section board.
 *
 * THE SINGLE DEFINITION OF RESIDENCY, and it is data rather than a rule about
 * kinds because residency is a build decision the operator wants to keep open.
 * Moving a part on-board is removing a line here and giving it a footprint;
 * moving one off-board is adding a line. Both then reconcile through
 * `make update`.
 *
 * NOTHING IS DEFAULTED. A component absent from this set is on the board and
 * must have a `part.footprint`, so a forgotten entry fails loudly at export
 * rather than silently becoming a part nobody laid out.
 *
 * POTENTIOMETERS are panel-mount today. On-board mounting is admitted by the
 * architecture but no pot footprint exists yet.
 *
 * ROTARY SELECTORS are permanently off-board: a six- or eleven-position rotary
 * is a panel-mount part with a shaft and a bushing, and does not mount on
 * stripboard under any variant.
 *
 * INDUCTORS are all off-board because no inductor part has been chosen.
 * `reference/pultec/values.md` specifies them electrically and says a catalogue
 * part, a pot core or a transformer winding all qualify - and those do not share
 * a footprint, so naming one now would be a geometry claim nothing supports. The
 * design's per-section placement (the hi boost four on-board, the mid's 2H and
 * 1H off) is the target, reached by deleting lines here once a part exists.
 */
export const OFF_BOARD: ReadonlySet<string> = new Set([
  // Level and Q potentiometers - panel-mount.
  "RV_LO_CUT",
  "RV_LO_BOOST",
  "RV_HI_CUT",
  "RV_HI_BOOST",
  "RV_HI_Q",
  "RV_MID",

  // Rotary selectors - panel-mount, permanently.
  "SW_LO_CUT",
  "SW_LO_BOOST",
  "SW_HI_CUT",
  "SW_HI_BOOST",
  "SW_MID",
  "SW_MID_MODE",

  // Inductors - pending a part choice, not a permanent decision.
  "L_HI_BOOST_600MH",
  "L_HI_BOOST_300MH",
  "L_HI_BOOST_200MH",
  "L_HI_BOOST_100MH",
  "L_MID_2H",
  "L_MID_1H",
  "L_MID_0R45H",
  "L_MID_0R22H",
  "L_MID_0R1H",
])
```

- [ ] **Step 4: Point `isBoardResident` at it**

In `reference/pultec/partition.ts`, add the import and replace the function body.
Keep the docblock's first line and rewrite the rest:

```ts
import { OFF_BOARD } from "./off-board.ts"
```

```ts
/** Whether a part sits on a section board rather than off it.
 *
 * Residency is DATA, in `off-board.ts`, not a rule about kinds. A kind rule
 * could not express an off-board inductor, and it made moving a pot on-board a
 * code change rather than a decision.
 *
 * This is the single definition. Tests that reason about what the boards must
 * emit derive it from here rather than restating the rule, because a second
 * copy is one that can disagree.
 */
export function isBoardResident(component: Component): boolean {
  return !OFF_BOARD.has(component.id)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test tests/reference/off-board.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Check what moved, and update the affected tests**

Run: `bun test`

Expected: `tests/reference/partition.test.ts` may fail, because `boardNetwork()`'s
ports change — the nine inductors are now off-board, so each inductor's tap net is
reached from outside the board and becomes a port again. That is the correct new
answer, not a regression. Update any expected port counts in that file to the values
the code now produces, and add a one-line comment beside each saying the count
follows from inductor residency. Do **not** change `off-board.ts` to make an old
assertion pass.

- [ ] **Step 7: Commit**

```bash
bun test && bun run typecheck
git add reference/pultec/off-board.ts reference/pultec/partition.ts tests/reference/off-board.test.ts tests/reference/partition.test.ts
git commit -m "Residency becomes data: one OFF_BOARD set, all inductors off-board"
```

---

## Task 6: The five physicalized board circuits

Each board circuit takes its module from `partitionReference()`, attaches a footprint
to every on-board component, gives every off-board component a `part.symbol` so its
value field has something in it, and appends two physical-only components: the
terminal block carrying that board's crossing nets, and — on the three boards where
ground is not in the signal topology — nothing extra, because the ground pin is a pin
on that same block.

All five boards get a ground pin. Only `low-boost` and `mid` touch net `0`
electrically; on the other three the pin is a chassis/shield landing and is the only
member of net `0` on that board. That is a genuine singleton and is *declared*
through the existing lint exemption rather than suppressed.

**Files:**
- Create: `circuits/pultec/parts.ts`
- Create: `circuits/pultec/low-cut.ts`, `low-boost.ts`, `hi-cut.ts`, `hi-boost.ts`, `mid.ts`
- Test: `tests/circuits/pultec-boards.test.ts`

**Interfaces:**
- Consumes: `OFF_BOARD` (Task 5); `PHYSICAL_ONLY`, `assertElectricallyTransparent`, `projectPhysical` (Task 4); `valueFor` accepting every Pultec component (Task 1).
- Produces, from each `circuits/pultec/<module>.ts`:
  - a default board function, e.g. `export function pultecLowCut(): Network`
  - `export const DESIGNATORS: Readonly<Record<string, string>>`
  - `export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>>`
  - `export const OFF_BOARD_IDS: ReadonlySet<string>` — this board's off-board components
  - `export const PAD_ORDER: Readonly<Record<string, readonly string[]>>`
  - `export const DECLARED_OPENS: readonly string[]`

  Task 7 reads the last three off the module by name; Task 10's `perfboard.json` names the board function in its `export` field.

- [ ] **Step 1: Write the failing test**

Create `tests/circuits/pultec-boards.test.ts`:

```ts
import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { assertElectricallyTransparent, physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ModuleOwner } from "../../reference/pultec/partition.ts"
import type { Network } from "../../lib/model/types.ts"
import * as lowCut from "../../circuits/pultec/low-cut.ts"
import * as lowBoost from "../../circuits/pultec/low-boost.ts"
import * as hiCut from "../../circuits/pultec/hi-cut.ts"
import * as hiBoost from "../../circuits/pultec/hi-boost.ts"
import * as mid from "../../circuits/pultec/mid.ts"

interface BoardModule {
  readonly DESIGNATORS: Readonly<Record<string, string>>
  readonly PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly OFF_BOARD_IDS: ReadonlySet<string>
  readonly PAD_ORDER: Readonly<Record<string, readonly string[]>>
  readonly DECLARED_OPENS: readonly string[]
}

const BOARDS: readonly (readonly [ModuleOwner, BoardModule, () => Network])[] = [
  ["low-cut", lowCut, lowCut.pultecLowCut],
  ["low-boost", lowBoost, lowBoost.pultecLowBoost],
  ["hi-cut", hiCut, hiCut.pultecHiCut],
  ["hi-boost", hiBoost, hiBoost.pultecHiBoost],
  ["mid", mid, mid.pultecMid],
]

test("each board projects back to its electrical partition", () => {
  for (const [owner, , build] of BOARDS) {
    expect(() => assertSameTopology(boardNetwork(owner), projectPhysical(build())))
      .not.toThrow()
  }
})

test("every physical-only component is electrically transparent", () => {
  for (const [, , build] of BOARDS) {
    for (const component of build().components) {
      if (physicalOnly(component)) assertElectricallyTransparent(component)
    }
  }
})

test("every on-board component has a footprint and every off-board one does not", () => {
  for (const [owner, module, build] of BOARDS) {
    for (const component of build().components) {
      if (physicalOnly(component)) continue
      if (module.OFF_BOARD_IDS.has(component.id)) {
        expect(component.part?.footprint, `${owner}/${component.id}`).toBeUndefined()
      } else {
        expect(component.part?.footprint, `${owner}/${component.id}`).toBeDefined()
      }
    }
  }
})

test("each board's off-board ids are exactly its share of the global set", () => {
  for (const [owner, module, build] of BOARDS) {
    const onThisBoard = build().components.filter((c) => !physicalOnly(c)).map((c) => c.id)
    const expected = onThisBoard.filter((id) => OFF_BOARD.has(id)).sort()
    expect([...module.OFF_BOARD_IDS].sort(), owner).toEqual(expected)
  }
})

test("every off-board component has a pad order that is a permutation of its pins", () => {
  for (const [owner, module, build] of BOARDS) {
    for (const component of build().components) {
      if (!module.OFF_BOARD_IDS.has(component.id)) continue
      const pins = new Set<string>(Object.keys(component.pins))
      for (const unit of component.units) for (const pin of Object.keys(unit.pins)) pins.add(pin)
      const order = module.PAD_ORDER[component.id]
      expect(order, `${owner}/${component.id}`).toBeDefined()
      expect([...(order ?? [])].sort()).toEqual([...pins].sort())
    }
  }
})

/** How many pins on this board name each net. */
function netMembers(board: Network): Map<string, number> {
  const counts = new Map<string, number>()
  for (const component of board.components) {
    const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
    for (const group of groups) {
      for (const connection of Object.values(group)) {
        if (connection.kind !== "net") continue
        counts.set(connection.net, (counts.get(connection.net) ?? 0) + 1)
      }
    }
  }
  return counts
}

test("every singleton net is declared, and every declaration is a singleton", () => {
  // BOTH DIRECTIONS, because neither alone is enough. Checking only that
  // singletons are declared lets a genuine accidental singleton be declared
  // away; checking only that declarations are singletons lets a declaration go
  // stale after the net it named gained a second member.
  for (const [owner, module, build] of BOARDS) {
    const counts = netMembers(build())
    const singletons = [...counts].filter(([, n]) => n === 1).map(([netName]) => netName).sort()
    expect(singletons, `${owner}: singleton nets`).toEqual([...module.DECLARED_OPENS].sort())
  }
})

test("every board carries a ground pin on its terminal block", () => {
  for (const [owner, , build] of BOARDS) {
    const blocks = build().components.filter(physicalOnly)
    const groundPins = blocks.flatMap((block) =>
      block.units.flatMap((unit) =>
        Object.entries(unit.pins).filter(([, c]) => c.kind === "net" && c.net === "0")))
    expect(groundPins.length, owner).toBe(1)
  }
})

test("each board exports to a netlist", () => {
  for (const [owner, module, build] of BOARDS) {
    expect(() => toImportedNetlist(
      build(), module.DESIGNATORS, module.PIN_NUMBERS, module.OFF_BOARD_IDS, module.PAD_ORDER,
    ), owner).not.toThrow()
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/circuits/pultec-boards.test.ts`

Expected: FAIL with "Cannot find module '../../circuits/pultec/low-cut.ts'".

- [ ] **Step 3: Write the shared tables**

Create `circuits/pultec/parts.ts`. The film-capacitor footprint is one name for
every capacitor for now; Task 10 replaces it with per-value names once a family is
chosen. Because `FILM_CAPACITOR_IMPORT_STRINGS` is empty, that name refuses at
export — which is why Task 10 is the task that first produces a board.

```ts
/**
 * What the Pultec boards are built from: footprints, designators and pad
 * orders, shared across the five board modules.
 *
 * THE FOOTPRINT HERE IS A NAME, NOT A CHOICE YET. Every capacitor points at one
 * film footprint, and `FILM_CAPACITOR_IMPORT_STRINGS` in
 * `lib/kicad/import-string.ts` is empty, so every board refuses at export until
 * a real capacitor family has been chosen and entered there. That refusal is
 * the point: an empty whitelist says "nobody has picked a part" out loud, where
 * a derived guess would quietly produce a board built around the wrong body.
 */
import type { Component } from "../../lib/model/types.ts"

/** Placeholder until a capacitor family is chosen - see the module comment. */
export const FILM_CAPACITOR = "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm"

export const AXIAL_RESISTOR =
  "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/** A three-way 5.08mm terminal block: this board's crossing nets plus ground. */
export const TERMINAL_BLOCK_3 = "TerminalBlock:TerminalBlock_1x03_P5.08mm"

/** Symbols for the off-board parts, so their netlist value field is not empty. */
export const ROTARY_SYMBOL = "Switch:SW_Rotary"
export const TOGGLE_SYMBOL = "Switch:SW_SPDT"
export const POT_SYMBOL = "Device:R_Potentiometer"
export const INDUCTOR_SYMBOL = "Device:L"

/** A pot's lugs, in the order a panel-mount part numbers them. */
export const POT_PAD_ORDER: readonly string[] = ["ccw", "wiper", "cw"]

/** A two-terminal off-board part: the inductors. */
export const TWO_PIN_PAD_ORDER: readonly string[] = ["a", "b"]

/**
 * A rotary selector's pads: the common first, then the throws in detent order.
 *
 * Detent order is the order the throws appear in the component's own pins,
 * which the reference builds from its frequency tables, so this derives it
 * rather than restating a list that could disagree with them.
 */
export function rotaryPadOrder(component: Component): readonly string[] {
  const unit = component.units[0]
  if (unit === undefined) throw new Error(`component "${component.id}" has no unit`)
  const pins = Object.keys(unit.pins)
  if (!pins.includes("common")) {
    throw new Error(`rotary "${component.id}" has no "common" pin; its pins are ${pins.join(", ")}`)
  }
  return ["common", ...pins.filter((pin) => pin !== "common")]
}

/** The footprint an on-board component gets, by kind. */
export function footprintForKind(component: Component): string {
  if (component.kind === "capacitor") return FILM_CAPACITOR
  if (component.kind === "resistor") return AXIAL_RESISTOR
  throw new Error(
    `no footprint is defined for on-board component "${component.id}" of kind ` +
      `"${component.kind}". Every on-board part needs one; if this part should be off the ` +
      "board, add it to reference/pultec/off-board.ts instead.",
  )
}
```

- [ ] **Step 4: Write the shared board builder**

Add to `circuits/pultec/parts.ts`:

```ts
import { PHYSICAL_ONLY } from "../../lib/board/physicalize.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import type { ModuleOwner } from "../../reference/pultec/partition.ts"
import { net } from "../../lib/model/types.ts"
import type { Network } from "../../lib/model/types.ts"

/** The symbol an off-board component's value field takes, by kind. */
function symbolFor(component: Component): string {
  if (component.kind === "potentiometer") return POT_SYMBOL
  if (component.kind === "inductor") return INDUCTOR_SYMBOL
  if (component.kind === "switch") {
    const unit = component.units[0]
    if (unit === undefined) throw new Error(`switch "${component.id}" has no unit`)
    return Object.keys(unit.pins).length > 3 ? ROTARY_SYMBOL : TOGGLE_SYMBOL
  }
  throw new Error(`no symbol is defined for off-board component "${component.id}"`)
}

/**
 * One physicalized board: the module's components with footprints or symbols
 * attached, plus the terminal block that carries its crossing nets.
 *
 * `crossingNets` is in pin order and always ends with "0". Ground is on every
 * board, including the three where it is not in the signal topology, because a
 * board with panel wiring and no ground landing gets an improvised wire
 * soldered to it later.
 */
export function physicalizedBoard(owner: ModuleOwner, crossingNets: readonly string[]): Network {
  const electrical = boardNetwork(owner)
  const components: Component[] = electrical.components.map((component) =>
    OFF_BOARD.has(component.id)
      ? { ...component, part: { ...component.part, symbol: symbolFor(component) } }
      : { ...component, part: { ...component.part, footprint: footprintForKind(component) } })

  const pins: Record<string, ReturnType<typeof net>> = {}
  crossingNets.forEach((netName, index) => { pins[String(index + 1)] = net(netName) })

  components.push({
    id: "board_terminals",
    kind: "connector",
    parameters: {},
    part: { footprint: TERMINAL_BLOCK_3, electricallyInert: true },
    pins: {},
    units: [{ name: "MAIN", pins }],
    provenance: { source: PHYSICAL_ONLY },
  })

  return { ports: electrical.ports, components }
}

/** Pad orders for every off-board component on a physicalized board. */
export function padOrdersFor(board: Network): Readonly<Record<string, readonly string[]>> {
  const orders: Record<string, readonly string[]> = {}
  for (const component of board.components) {
    if (!OFF_BOARD.has(component.id)) continue
    if (component.kind === "potentiometer") orders[component.id] = POT_PAD_ORDER
    else if (component.kind === "inductor") orders[component.id] = TWO_PIN_PAD_ORDER
    else if (component.kind === "switch") orders[component.id] = rotaryPadOrder(component)
    else throw new Error(`no pad order rule for off-board "${component.id}"`)
  }
  return orders
}

/** Designators: the reference ids are netlist-derived and already designator-shaped. */
export function designatorsFor(board: Network): Readonly<Record<string, string>> {
  const designators: Record<string, string> = {}
  for (const component of board.components) designators[component.id] = component.id
  return designators
}

/** Two-terminal passives number 1/2; connectors number themselves. */
export const PASSIVE_PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
}
```

- [ ] **Step 5: Write the five board modules**

Create `circuits/pultec/low-cut.ts`. The crossing nets come from
`boundaryConductors()`; the values below are what it reports today.

```ts
/**
 * The low cut section on stripboard.
 *
 * Seven capacitors on the board; the 470K level pot and the six-position
 * selector are panel-mount and appear as PADS landings. Ground is a
 * chassis/shield landing here - the low cut section returns through its pot, so
 * net "0" has no other member on this board, and that singleton is declared.
 */
import { designatorsFor, padOrdersFor, physicalizedBoard, PASSIVE_PIN_NUMBERS } from "./parts.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import type { Network } from "../../lib/model/types.ts"

const CROSSING_NETS: readonly string[] = ["hi_boost_out", "out", "0"]

export function pultecLowCut(): Network {
  return physicalizedBoard("low-cut", CROSSING_NETS)
}

const BOARD = pultecLowCut()

export const DESIGNATORS = designatorsFor(BOARD)
export const PIN_NUMBERS = PASSIVE_PIN_NUMBERS
export const PAD_ORDER = padOrdersFor(BOARD)
export const OFF_BOARD_IDS: ReadonlySet<string> = new Set(
  BOARD.components.filter((c) => OFF_BOARD.has(c.id)).map((c) => c.id),
)
/** Ground is physical-only here, so it has one member and is an intended open. */
export const DECLARED_OPENS: readonly string[] = ["0"]
```

Create the other four the same way, changing only the module comment, the owner
string, the function name, `CROSSING_NETS` and `DECLARED_OPENS`:

| File | Function | Owner | `CROSSING_NETS` | `DECLARED_OPENS` |
| --- | --- | --- | --- | --- |
| `low-boost.ts` | `pultecLowBoost` | `"low-boost"` | `["lo_boost_in", "out", "0"]` | `[]` |
| `hi-cut.ts` | `pultecHiCut` | `"hi-cut"` | `["hi_boost_out", "lo_boost_in", "0"]` | `["0"]` |
| `hi-boost.ts` | `pultecHiBoost` | `"hi-boost"` | `["hi_boost_out", "in", "0"]` | `["0"]` |
| `mid.ts` | `pultecMid` | `"mid"` | `["hi_boost_out", "in", "0"]` | `[]` |

`low-boost` and `mid` have an empty `DECLARED_OPENS` because net `0` is genuinely
part of their signal topology and has other members.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test tests/circuits/pultec-boards.test.ts && bun run typecheck`

**`DECLARED_OPENS` in the table above is a prediction, and the test is the
authority.** It was derived by reasoning about which nets have a second member on
each board, not by running the count. If "every singleton net is declared, and every
declaration is a singleton" fails, read what it reports and correct
`DECLARED_OPENS` to match — a net it names as an undeclared singleton is one whose
only member on that board really is the terminal-block pin. Do **not** weaken the
test to fit the table.

Expected: PASS for every assertion **except** "each board exports to a netlist",
which fails with "no VeroRoute import string for footprint
Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm ... Add it to
FILM_CAPACITOR_IMPORT_STRINGS". That is the correct state: no capacitor family has
been chosen. Mark that one test `test.todo` with a comment naming Task 10 as what
turns it on, and leave every other assertion live.

- [ ] **Step 7: Commit**

```bash
bun test && bun run typecheck
git add circuits/pultec tests/circuits/pultec-boards.test.ts
git commit -m "Five physicalized Pultec board circuits"
```

---

## Task 7: The export reads off-board and pad order from the circuit module

`exportNetlistFor` reads `DESIGNATORS` and `PIN_NUMBERS` off the circuit module and
validates both. It must also read `OFF_BOARD_IDS` and `PAD_ORDER`, with the same
shape of validation, or the boards export every off-board part as a footprint-less
on-board part and refuse.

Both are optional: `pt2399-core` declares neither and must keep working.

**Files:**
- Modify: `tools/perfboard/check.ts`
- Test: `tests/perfboard/export-netlist.test.ts`

**Interfaces:**
- Consumes: `toImportedNetlist`'s two new parameters (Task 3); the board modules' `OFF_BOARD_IDS` and `PAD_ORDER` exports (Task 6).
- Produces: `exportNetlistFor(declaration: PerfboardDeclaration): Promise<string>` — unchanged signature.

- [ ] **Step 1: Write the failing test**

Create `tests/perfboard/export-netlist.test.ts`:

```ts
import { test, expect } from "bun:test"
import { assertOffBoardIds, assertPadOrder } from "../../tools/perfboard/check.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

const DECLARATION: PerfboardDeclaration = {
  file: "/tmp/perfboard.json",
  dir: "/tmp",
  circuitPath: "/tmp/circuit.ts",
  exportName: "board",
  vrtPath: "/tmp/board.vrt",
}

test("an absent off-board export is an empty set, so existing boards keep working", () => {
  expect(assertOffBoardIds(undefined, DECLARATION).size).toBe(0)
})

test("a Set of ids is accepted", () => {
  expect([...assertOffBoardIds(new Set(["RV1", "SW1"]), DECLARATION)].sort()).toEqual(["RV1", "SW1"])
})

test("a non-set off-board export refuses", () => {
  expect(() => assertOffBoardIds(["RV1"], DECLARATION)).toThrow(/must be a Set/)
})

test("an absent pad order export is an empty map", () => {
  expect(assertPadOrder(undefined, DECLARATION)).toEqual({})
})

test("a pad order of string arrays is accepted", () => {
  expect(assertPadOrder({ RV1: ["ccw", "wiper", "cw"] }, DECLARATION))
    .toEqual({ RV1: ["ccw", "wiper", "cw"] })
})

test("a pad order whose entry is not an array of strings refuses, naming the id", () => {
  expect(() => assertPadOrder({ RV1: "ccw" }, DECLARATION)).toThrow(/PAD_ORDER\["RV1"\]/)
  expect(() => assertPadOrder({ RV1: [1, 2] }, DECLARATION)).toThrow(/PAD_ORDER\["RV1"\]/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/perfboard/export-netlist.test.ts`

Expected: FAIL — `assertOffBoardIds` and `assertPadOrder` are not exported from
`tools/perfboard/check.ts`.

- [ ] **Step 3: Add both validators**

In `tools/perfboard/check.ts`, beside `assertPinNumbers`:

```ts
/**
 * Validate `OFF_BOARD_IDS`: absent means none, otherwise a Set of strings.
 *
 * Absent is legitimate and common - `pt2399-core` has no off-board parts - so
 * it defaults to empty. An export of the WRONG SHAPE does not: an array here
 * would pass an `in`-style membership test nowhere and silently put every
 * off-board part back on the board, demanding footprints nobody chose.
 */
export function assertOffBoardIds(
  value: unknown,
  declaration: PerfboardDeclaration,
): ReadonlySet<string> {
  if (value === undefined) return new Set()
  if (!(value instanceof Set)) {
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} exports OFF_BOARD_IDS, but it must be a ` +
        `Set of component ids, got ${Array.isArray(value) ? "an array" : typeof value}.`,
    )
  }
  const ids = new Set<string>()
  for (const id of value) {
    if (typeof id !== "string") {
      throw new Error(
        `${declaration.file}: OFF_BOARD_IDS contains a ${typeof id}, but every entry must be a ` +
          "component id string.",
      )
    }
    ids.add(id)
  }
  return ids
}

/** Validate `PAD_ORDER`: absent means none, otherwise id -> array of pin names. */
export function assertPadOrder(
  value: unknown,
  declaration: PerfboardDeclaration,
): Readonly<Record<string, readonly string[]>> {
  if (value === undefined) return {}
  if (!isRecord(value)) {
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} exports PAD_ORDER, but it must be an ` +
        `object mapping component ids to pin names, got ${typeof value}.`,
    )
  }
  const orders: Record<string, readonly string[]> = {}
  for (const [id, order] of Object.entries(value)) {
    if (!Array.isArray(order) || order.some((pin) => typeof pin !== "string")) {
      throw new Error(
        `${declaration.file}: PAD_ORDER["${id}"] must be an array of pin-name strings.`,
      )
    }
    orders[id] = order
  }
  return orders
}
```

- [ ] **Step 4: Pass both through `exportNetlistFor`**

```ts
  const designators = assertDesignators(imported["DESIGNATORS"], declaration)
  const pinNumbers = assertPinNumbers(imported["PIN_NUMBERS"], declaration)
  const offBoard = assertOffBoardIds(imported["OFF_BOARD_IDS"], declaration)
  const padOrder = assertPadOrder(imported["PAD_ORDER"], declaration)
  const lowered = toImportedNetlist(network, designators, pinNumbers, offBoard, padOrder)
  return writeLegacyNetlist(lowered, { createdAt: new Date().toISOString().slice(0, 19) })
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/perfboard/export-netlist.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Confirm `pt2399-core` is unaffected and commit**

Run: `bun test`

Expected: every existing perfboard test still passes — `pt2399-core` exports neither
new symbol, so both default to empty and its netlist is byte-identical.

```bash
bun run typecheck
git add tools/perfboard/check.ts tests/perfboard/export-netlist.test.ts
git commit -m "Read OFF_BOARD_IDS and PAD_ORDER from the circuit module"
```

---

## Task 8: Whole-system reconstruction

`tests/reference/partition.test.ts:38` already recomposes the partition and asserts
`assertSameTopology(THREE_BAND_REFERENCE, recomposed)`. The same invariant extends
one stage further: take all five *physicalized* boards, project the physical-only
components away, union what remains, and assert the result is the reference.

This catches errors no per-board comparison can — a crossing net landing on the right
pin count on every board while joining the wrong two boards, a component
physicalized onto two boards, a component lost between them.

**Files:**
- Test: `tests/circuits/pultec-reconstruction.test.ts`

**Interfaces:**
- Consumes: the five board functions (Task 6); `projectPhysical` (Task 4); `assertSameTopology` from `lib/model/topology.ts`.
- Produces: nothing. This task is a test only.

- [ ] **Step 1: Write the failing test**

Create `tests/circuits/pultec-reconstruction.test.ts`:

```ts
import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { THREE_BAND_REFERENCE } from "../../reference/pultec/three-band.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import { pultecLowCut } from "../../circuits/pultec/low-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/low-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/hi-cut.ts"
import { pultecHiBoost } from "../../circuits/pultec/hi-boost.ts"
import { pultecMid } from "../../circuits/pultec/mid.ts"

// Reversed on purpose: reconstruction must not depend on board order.
const BOARDS: readonly (() => Network)[] = [
  pultecMid, pultecHiBoost, pultecHiCut, pultecLowBoost, pultecLowCut,
]

/**
 * The five boards wired together: every board's electrical content, with the
 * terminal blocks projected away.
 *
 * Joining the boards needs no explicit step. Nets are implied by pin references
 * and the crossing nets carry the same name on every board, so two boards'
 * components naming "hi_boost_out" are already on one net the moment they sit
 * in one component list. A terminal block is where that wire physically lands,
 * which is exactly why projecting it away leaves the circuit unchanged.
 */
function reconstructed(): Network {
  const components: Component[] = []
  for (const build of BOARDS) components.push(...projectPhysical(build()).components)
  return { ports: THREE_BAND_REFERENCE.ports, components }
}

test("partitioning, physicalization and interconnection do not change the circuit", () => {
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, reconstructed())).not.toThrow()
})

test("every reference component is on exactly one board", () => {
  const counts = new Map<string, number>()
  for (const component of reconstructed().components) {
    counts.set(component.id, (counts.get(component.id) ?? 0) + 1)
  }
  const duplicated = [...counts].filter(([, n]) => n > 1).map(([id]) => id).sort()
  expect(duplicated).toEqual([])

  const missing = THREE_BAND_REFERENCE.components
    .map((c) => c.id)
    .filter((id) => !counts.has(id))
    .sort()
  expect(missing).toEqual([])
})

test("the terminal blocks are the only thing projection removes", () => {
  let projected = 0
  for (const build of BOARDS) projected += build().components.filter(physicalOnly).length
  expect(projected).toBe(BOARDS.length)
})

test("removing a board is caught, so the test is not vacuous", () => {
  const short: Network = {
    ports: THREE_BAND_REFERENCE.ports,
    components: BOARDS.slice(1).flatMap((build) => [...projectPhysical(build()).components]),
  }
  expect(() => assertSameTopology(THREE_BAND_REFERENCE, short)).toThrow()
})
```

- [ ] **Step 2: Run the test to verify it fails, then passes**

Run: `bun test tests/circuits/pultec-reconstruction.test.ts`

Expected: the file does not exist before Step 1; after it, every test passes. If
"partitioning, physicalization and interconnection do not change the circuit" fails,
the fault is in Task 6's `CROSSING_NETS` — a board naming a net that no other board
names produces an orphan, and `assertSameTopology` reports the difference.

- [ ] **Step 3: Verify the test discriminates**

Temporarily change `CROSSING_NETS` in `circuits/pultec/hi-cut.ts` from
`["hi_boost_out", "lo_boost_in", "0"]` to `["hi_boost_out", "out", "0"]` and run the
suite again.

Expected: `tests/circuits/pultec-boards.test.ts` fails on the terminal-block
assertion. Revert the change before committing. A mutation that no test catches means
the tests are not yet doing their job — say so rather than proceeding.

- [ ] **Step 4: Commit**

```bash
bun test && bun run typecheck
git add tests/circuits/pultec-reconstruction.test.ts
git commit -m "Whole-system reconstruction: five boards rebuild the reference"
```

---

## Task 9: The `create` verb

Every CLI verb acts on a `.vrt` that already exists. The fork has
`--import NETLIST -o BOARD`, which builds one from a netlist, and nothing in this
repository calls it. Five new boards need that.

`create` refuses rather than overwriting. The layout is the hand-authored artifact
and `update` is how an existing one changes; a `create` that overwrote would discard
placement and routing silently.

**Files:**
- Create: `tools/perfboard/create.ts`
- Modify: `tools/cli/perfboard.ts`
- Test: `tests/perfboard/create.test.ts`

**Interfaces:**
- Consumes: `exportNetlistFor` (Task 7); `resolveBinary`/`verorouteBinary` from `tools/perfboard/check.ts`; `replaceAtomically` from `tools/perfboard/mutate.ts`.
- Produces: `createBoard(declaration: PerfboardDeclaration, deps?: CreateDeps): Promise<string>` — returns the report text. `CreateDeps` mirrors `CheckDeps`: `{ exportNetlist?, runImport?, repoRoot? }`.

- [ ] **Step 1: Write the failing test**

Create `tests/perfboard/create.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createBoard } from "../../tools/perfboard/create.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

function declarationIn(dir: string): PerfboardDeclaration {
  return {
    file: path.join(dir, "perfboard.json"),
    dir,
    circuitPath: path.join(dir, "circuit.ts"),
    exportName: "board",
    vrtPath: path.join(dir, "board.vrt"),
  }
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-create-"))
}

test("create writes the layout the binary produced", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  const report = await createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: (_netPath, outPath) => {
      fs.writeFileSync(outPath, "VRT")
      return { status: 0, output: "imported 3 parts" }
    },
  })
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("VRT")
  expect(report).toContain("imported 3 parts")
})

test("create refuses when a layout already exists, and does not touch it", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  fs.writeFileSync(declaration.vrtPath, "HAND AUTHORED")
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => { throw new Error("must not run") },
  })).rejects.toThrow(/already exists/)
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("HAND AUTHORED")
})

test("a non-zero exit leaves no layout behind", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => ({ status: 1, output: "netlist unreadable" }),
  })).rejects.toThrow(/netlist unreadable/)
  expect(fs.existsSync(declaration.vrtPath)).toBe(false)
})

test("a zero exit that produced no file is an error, not a success", async () => {
  const dir = tempDir()
  const declaration = declarationIn(dir)
  await expect(createBoard(declaration, {
    exportNetlist: async () => "(export)",
    runImport: () => ({ status: 0, output: "ok" }),
  })).rejects.toThrow(/produced no output file/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/perfboard/create.test.ts`

Expected: FAIL with "Cannot find module '../../tools/perfboard/create.ts'".

- [ ] **Step 3: Write the verb**

Create `tools/perfboard/create.ts`:

```ts
/**
 * Bring a declared board into existence from its circuit.
 *
 * THIS VERB REFUSES RATHER THAN OVERWRITING, and that is the whole difference
 * between it and `update`. A `.vrt` holds placement and routing that a person
 * did by hand; `--import` builds a fresh board with neither. Overwriting one
 * would discard that work with no way back short of git, and would do it
 * silently, because the new file is perfectly valid. `update` is how an
 * existing layout changes.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { exportNetlistFor, verorouteBinary } from "./check.ts"
import type { CheckRun } from "./check.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { replaceAtomically } from "./mutate.ts"
import { moduleRepoRoot } from "./repo-root.ts"

export interface CreateDeps {
  readonly exportNetlist?: (declaration: PerfboardDeclaration) => Promise<string>
  readonly runImport?: (netPath: string, outPath: string) => CheckRun
  readonly repoRoot?: string
}

function runVerorouteImport(netPath: string, outPath: string, repoRoot: string): CheckRun {
  const binary = verorouteBinary(process.env, repoRoot)
  const result = spawnSync(binary, ["--import", netPath, "-o", outPath], { encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run veroroute at ${binary}: ${result.error.message}`)
  }
  if (result.status === null) {
    throw new Error(`veroroute at ${binary} was killed by a signal; no board was created.`)
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : ""
  const stderr = typeof result.stderr === "string" ? result.stderr : ""
  return { status: result.status, output: `${stdout}${stderr}` }
}

export async function createBoard(
  declaration: PerfboardDeclaration,
  deps: CreateDeps = {},
): Promise<string> {
  if (fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath} already exists.\n` +
        "create builds a board with no placement and no routing, so running it over a layout " +
        "somebody authored would discard that work silently. Use `update` to apply the circuit " +
        "to an existing layout, or delete this file first if it really is disposable.",
    )
  }

  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const text = await exportNetlist(declaration)

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-create-"))
  const netPath = path.join(scratch, "circuit.net")
  fs.writeFileSync(netPath, text)
  // Produced beside the declared layout, so the rename that puts it in place is
  // within one directory and therefore atomic.
  const producedPath = `${declaration.vrtPath}.creating`

  const runImport = deps.runImport
    ?? ((net: string, out: string) => runVerorouteImport(net, out, deps.repoRoot ?? moduleRepoRoot()))
  const run = runImport(netPath, producedPath)

  if (run.status !== 0) {
    if (fs.existsSync(producedPath)) fs.rmSync(producedPath)
    throw new Error(
      `veroroute --import exited ${run.status}; no board was created at ${declaration.vrtPath}.\n` +
        run.output,
    )
  }

  replaceAtomically(declaration.vrtPath, producedPath)
  return run.output
}
```

- [ ] **Step 4: Register the verb**

In `tools/cli/perfboard.ts`, add to the `VERBS` list:

```ts
  ["create", "build this board's layout from its circuit (refuses if one exists)"],
```

and beside the other dispatch lines:

```ts
  if (verb === "create") return dispatchCreate(cwd, opts.verbDeps, opts.repoRoot, log, error)
```

Add `dispatchCreate` to `tools/cli/perfboard-binary-verbs.ts`, beside
`dispatchUpdate`. It takes no flags — `create` has nothing to configure, and
`--allow-dirty` would be meaningless because it refuses on an existing file rather
than overwriting one:

```ts
export async function dispatchCreate(
  cwd: string,
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const declaration = boardHere(cwd, "create", error)
  if (declaration === null) return 1
  try {
    log(await createBoard(declaration, mergedVerbDeps(verbDeps, repoRoot)))
    log(`created ${declaration.vrtPath}`)
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
```

Import `createBoard` from `../perfboard/create.ts` at the top of that file. If
`mergedVerbDeps` returns a type that does not structurally satisfy `CreateDeps`,
widen `CreateDeps` to match rather than casting — the constraint against `as Type`
holds here.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/perfboard/create.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
bun test && bun run typecheck
git add tools/perfboard/create.ts tools/cli/perfboard.ts tests/perfboard/create.test.ts
git commit -m "A create verb, so a declared board can come into existence"
```

---

## Task 10: Choose the capacitor family and create the five boards

Everything above is complete and tested, and no board exists yet: the film-capacitor
whitelist is empty, so every board refuses at export. That refusal is the design
working — it says out loud that nobody has chosen a capacitor.

This task chooses one and creates the boards.

> **This task needs a decision an agent cannot make.** Steps 1 and 2 require
> choosing a capacitor series you can buy and reading body dimensions off real
> parts. An implementer without that input should stop at Step 1 and say so rather
> than inventing footprint names — an invented body width produces a layout built
> around a part that does not exist, and every test in this plan would pass.

**Files:**
- Modify: `lib/kicad/import-string.ts` (populate `FILM_CAPACITOR_IMPORT_STRINGS`)
- Modify: `circuits/pultec/parts.ts` (per-value footprints if the family needs them)
- Create: `boards/pultec-<module>/perfboard.json` and `Makefile` × 5
- Test: `tests/circuits/pultec-boards.test.ts` (turn the `test.todo` back on)

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: five directories under `boards/` that `make check` can act on.

- [ ] **Step 1: Choose the capacitor family and record its footprints**

The Pultec's capacitors run from 470pF to 330nF. Pick a film series you can actually
buy, find each value's KiCad footprint name, and read the body dimensions from that
name's own `L`/`W`/`P` fields.

For each distinct footprint, decide `CAP_FILM<n>` or `CAP_FILM_WIDE<n>` from the
**part in your hand**, not from the name: `CAP_FILM` occupies one strip row,
`CAP_FILM_WIDE` occupies three (`"+++1+2+++"` in `CompTypes.h`). `<n>` is the lead
pitch in 100-mil steps, so a 5.00mm or 5.08mm part is `2` and a 2.50mm part is `1`.

Add one entry per footprint to `FILM_CAPACITOR_IMPORT_STRINGS` in
`lib/kicad/import-string.ts`, each with a comment naming the series and the measured
body width:

```ts
export const FILM_CAPACITOR_IMPORT_STRINGS: ReadonlyMap<string, string> = new Map<string, string>([
  // <series>, <value range>: body <W>mm measured, spans <one|three> strip rows.
  ["Capacitor_THT:C_Rect_L<len>mm_W<width>mm_P<pitch>mm", "CAP_FILM<n>"],
])
```

- [ ] **Step 2: Point the capacitors at their footprints**

If one footprint covers every value, change `FILM_CAPACITOR` in
`circuits/pultec/parts.ts` to that name and stop here.

If the family needs several — larger values usually have larger bodies — replace
`footprintForKind`'s capacitor branch with a lookup on capacitance:

```ts
/** Capacitance (farads) -> footprint, largest threshold first. */
const FILM_BY_FARADS: readonly (readonly [number, string])[] = [
  // Fill in from the series chosen in Step 1, e.g.
  // [1e-7, "Capacitor_THT:C_Rect_L<len>mm_W<width>mm_P<pitch>mm"],
]

function filmFootprint(component: Component): string {
  const farads: unknown = Reflect.get(component.parameters, "farads")
  if (typeof farads !== "number") {
    throw new Error(`capacitor "${component.id}" has no numeric farads parameter`)
  }
  for (const [threshold, footprint] of FILM_BY_FARADS) {
    if (farads >= threshold) return footprint
  }
  throw new Error(
    `no film footprint is recorded for ${farads}F ("${component.id}"). Add its value to ` +
      "FILM_BY_FARADS in circuits/pultec/parts.ts, with the footprint of the part you are " +
      "actually fitting.",
  )
}
```

- [ ] **Step 3: Turn the export test back on**

In `tests/circuits/pultec-boards.test.ts`, change the `test.todo` added in Task 6
back to `test` and delete the comment pointing at this task.

Run: `bun test tests/circuits/pultec-boards.test.ts`

Expected: PASS, including "each board exports to a netlist". A refusal here names
the footprint that is missing from the whitelist — add it, do not widen the
derivation.

- [ ] **Step 4: Declare the five boards**

For each of `low-cut`, `low-boost`, `hi-cut`, `hi-boost`, `mid`, create
`boards/pultec-<module>/perfboard.json`:

```json
{
  "circuit": "../../circuits/pultec/<module>.ts",
  "export": "pultec<Module>",
  "vrt": "pultec-<module>.perfboard.vrt"
}
```

`<Module>` is the camel-cased function name from Task 6: `pultecLowCut`,
`pultecLowBoost`, `pultecHiCut`, `pultecHiBoost`, `pultecMid`.

No `sch`/`netlist` pair: these five boards have no KiCad schematic, so each gets the
`schematic-notice` warning on every run instead of a freshness guard. That is the
honest outcome — the Pultec's KiCad source is the as-built single board in another
repository, not these modules.

Create `boards/pultec-<module>/Makefile`, identical to `boards/pt2399-core/Makefile`:

```make
include $(shell git rev-parse --show-toplevel)/make/perfboard.mk
```

- [ ] **Step 5: Build the toolchain and create each board**

```bash
make -C boards/pultec-low-cut veroroute
```

Then, for each of the five:

```bash
make -C boards/pultec-low-cut create
make -C boards/pultec-low-boost create
make -C boards/pultec-hi-cut create
make -C boards/pultec-hi-boost create
make -C boards/pultec-mid create
```

Expected: each prints what `--import` placed and writes a `.vrt`. Each board has no
placement or routing yet — that is bench work in the GUI, and is not part of this
plan.

- [ ] **Step 6: Confirm every board checks**

```bash
make check
```

Expected: from the repository root this recurses into every declared board. Each
Pultec board reports the `schematic-notice` warning and then veroroute's own report.
A newly imported board is **not routed**, so `check` exits non-zero on the Pultec
boards with a report saying so — that is the correct state for a board nobody has
laid out, and is not a failure of this plan. `pt2399-core` must still report `ok`.

- [ ] **Step 7: Commit**

```bash
bun test && bun run typecheck
git add lib/kicad/import-string.ts circuits/pultec/parts.ts boards tests/circuits/pultec-boards.test.ts
git commit -m "Choose the capacitor family and create the five Pultec boards"
```

---

## What this plan leaves open

These are recorded in the spec and are deliberately not tasks:

- **No layouts.** Five `.vrt` files exist with no placement. Placing and routing them
  is bench work in the GUI.
- **No inductor part.** All nine stay off-board until one is chosen. Moving the hi
  boost four on-board is: delete four lines from `reference/pultec/off-board.ts`, add
  an `INDUCTOR<n>` family to `lib/kicad/import-string.ts`, give them footprints in
  `circuits/pultec/parts.ts`, and `make update` each affected board.
- **R3 stays at 4K7.** `reference/pultec/unresolved.md` item 2 disputes it. 4K7 and
  470R are both quarter-watt axial parts — the same two pads, the same span — so the
  dispute cannot invalidate a layout and gets no gating mechanism here.
- **No on-board pot or switch footprints.** The architecture admits them; nothing in
  this plan builds them.
