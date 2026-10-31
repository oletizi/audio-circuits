/**
 * **`ComponentOverride.ncPins`: A PIN OF THE CHOSEN SYMBOL THAT THE CIRCUIT DOES NOT REACH,
 * DECLARED BY NUMBER.**
 *
 * Hand-written for the change that unblocked `pultec-mid`, the one board of eleven that produced
 * no drawing. It refused at `../../lib/schgen/ir/validate.ts`'s `pinsDeclared`: `SW_MID` is the
 * eleven-position mid-frequency selector drawn with `Switch:SW_Rotary_1x12`, because the owner's
 * part choice is a twelve-position switch with its stop set to eleven (*"Assume a 1x12"*, recorded
 * on `ELEVEN_THROW_SYMBOL` in `circuits/pultec/physical/parts.ts`), and pin 12 is the unused
 * twelfth detent that nothing declared.
 *
 * **WHAT EVERY ARM BELOW IS REALLY DEFENDING IS THAT THIS IS A DECLARATION AND NOT AN EXEMPTION.**
 * Three wrong fixes were available and each would have passed a test that only asked whether
 * `pultec-mid` draws:
 *
 * - `MECHANICAL_PINS`, which would exempt a `passive` throw pin at the same pitch on the same side
 *   as the eleven that are wired - the single defect `pinsDeclared` exists to catch;
 * - a twelfth throw in `circuits/pultec/electrical/`, which would put a part-choice artifact in a
 *   model the schematic is the authority for;
 * - `PartSpec.ncUnlisted`, the blanket, which would also excuse every pin a future KiCad adds to
 *   this symbol and every throw a later edit drops from the pin map.
 *
 * So the arms that matter most are the NEGATIVE CONTROLS: `pinsDeclared` still refuses by name
 * with the declaration removed, a sibling pin on the same part still refuses with one pin
 * declared, a declaration naming a pin the symbol does not have refuses, and a pin declared
 * no-connect that is also on a net refuses. A guard that cannot fail is the failure mode
 * `CLAUDE.md` says this whole workflow exists to prevent.
 *
 * **THE INSTALLED-LIBRARY ARMS DO NOT SKIP WHEN KICAD IS ABSENT**, following
 * `./ir/mechanical-pins.test.ts`: `symbolLibraries` refuses, and a skipped check must never look
 * like a passing one. They are what makes a future KiCad that renumbers `SW_Rotary_1x12` fail
 * loudly rather than silently exempting whatever ends up as pin 12.
 *
 * **THE FIXTURE ARMS USE `Fix:BIG8`** (`./__fixtures__/symbols/Fix.kicad_sym`) rather than the
 * rotary, because they need a part with SEVERAL undeclared pins so that "one declared, the rest
 * still refused" is a claim about specificity rather than about a single pin. `BIG8` is an
 * eight-pin `ic`, so the model's own pin names ARE its symbol pin numbers
 * (`canonicalPinNumbers`'s identity rule) and the fixture needs no hand-written `symbolPins` map -
 * the same reasoning `./ir/nc-end-to-end.test.ts` gives, whose fixture shape this follows.
 */

import { describe, expect, test } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import { authoringProblems, negotiablePort } from "../../lib/schgen/authoring.ts"
import { circuitSpecFrom, nicknamesOf, schematicParts } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { validateCircuit } from "../../lib/schgen/ir/validate.ts"
import { annotate, EMPTY_LOCK } from "../../lib/schgen/lock/annotate.ts"
import { createResolver } from "../../lib/schgen/render/library.ts"
import { emitContext, emitSheet } from "../../lib/schgen/render/emit.ts"
import { layoutSheet } from "../../lib/schgen/render/sheets.ts"
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts"
import { PULTEC_MID_SCHEMATIC } from "../../circuits/pultec/schematic/mid.ts"
import { pultecMid } from "../../circuits/pultec/physical/mid.ts"
import { symbols as fixtureSymbols } from "./__fixtures__/circuits.ts"
import type { PinMap } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/types.ts"
import type { BlockDeclaration, ComponentOverride, SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { Circuit, PortDirection, RailSpec, SheetSpec } from "../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/* ------------------------------------------------------------------ the fixture ---------- */

const SHEETS: readonly SheetSpec[] = [{ id: "s", title: "ncPins fixture", file: "nc-pins.kicad_sch", paper: "A3", notes: [] }]

const RAILS: readonly RailSpec[] = [
  { net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null },
  { net: "3V3", symbol: "Pwr:+3V3", kind: "supply", pwrFlag: null },
]

const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = { IN: "in", GND: "bidirectional", "3V3": "bidirectional" }

/**
 * `BIG8` with pins 5, 6 and 7 OMITTED by the model, plus the two passives that keep every net it
 * touches at two pins or more - so each arm below produces problems from `pinsDeclared` and from
 * nothing else, and a message identifies which rule found them.
 *
 * Pins 4 and 8 are `power_in` in the library and sit on the two declared rails, because
 * `pinSemantics` refuses a power input on a net that is not a rail and that refusal is not what
 * any arm here measures. No part declares a footprint: `from-network.ts` documents `""` as the
 * faithful transcription of a model that declares none, and a fixture never fabricates one.
 */
function probeNetwork(): Network {
  const pins: PinMap = { "1": "IN", "2": "IN", "3": "IN", "4": "GND", "8": "3V3" }
  return circuit()
    .ic("probe", pins, { mpn: "BIG8", symbol: "Fix:BIG8" })
    .resistor("input_load", "10k", { a: "IN", b: "GND" }, { symbol: "Fix:R" })
    .capacitor("supply_decoupling", "100nF", { a: "3V3", b: "GND" }, { symbol: "Fix:C" })
    .done()
}

/** The model with pin 1 wired, used by the arm where a declaration contradicts a net. */
function probeAuthoring(override: ComponentOverride | null): SchematicAuthoring {
  // One block per component: `lib/schgen/render/bus.ts` refuses a bus block holding more than one
  // unit, so a single block over all three is not a layout this renderer can draw.
  const block = (id: string, members: readonly string[], groupNets: readonly string[], blockNets: readonly string[]): BlockDeclaration => ({
    id,
    sheet: "s",
    title: id,
    members,
    rendering: { kind: "bus", groups: groupNets.length === 0 ? [] : [{ name: `${id}_SIG`, nets: groupNets }] },
    anchor: null,
    interface: blockNets.map((net) => negotiablePort(net, { portDirections: PORT_DIRECTIONS, rails: RAILS })),
    // Empty, because this fixture composes nothing: no member carries an include() prefix.
    prefixes: { prefixes: [], why: null },
  })
  return {
    project: "nc-pins-fixture",
    designators: { probe: "U1", input_load: "R1", supply_decoupling: "C1" },
    blocks: [
      block("PROBE", ["probe"], ["IN"], ["IN", "GND", "3V3"]),
      block("LOAD", ["input_load"], ["IN"], ["IN", "GND"]),
      block("DEC", ["supply_decoupling"], [], ["3V3", "GND"]),
    ],
    sheets: SHEETS,
    rails: RAILS,
    portDirections: PORT_DIRECTIONS,
    overrides: override === null ? {} : { probe: override },
    declared: {
      source: "tests/schgen/nc-pins.test.ts, which is the authority for this fixture",
      bom: { kind: "unsourced", why: "a fixture buys nothing" },
    },
  }
}

/** The reason text an arm needs when the reason itself is not what it measures. */
const A_REASON = "the fixture's model wires five of BIG8's eight pins and this one is not among them"

function ncOverride(ncPins: Readonly<Record<string, string>>): ComponentOverride {
  return { ncPins, why: "a fixture that declares which of BIG8's pins carry no connection" }
}

function probeCircuit(override: ComponentOverride | null): Circuit {
  const network = probeNetwork()
  const spec = circuitSpecFrom(network, probeAuthoring(override), fixtureSymbols)
  return buildCircuit(spec, { symbols: fixtureSymbols })
}

const probeProblems = (override: ComponentOverride | null): string[] => validateCircuit(probeCircuit(override), fixtureSymbols)

const undeclared = (pin: string, name: string): string =>
  `part U1: pin ${pin} (${name}) is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts`

/* --------------------------------------------- the fixture arms: declaration, not exemption -- */

describe("ncPins declares specific pins", () => {
  test("with nothing declared, every pin the model omits is refused by name - the state this feature starts from", () => {
    expect(probeProblems(null).filter((p) => p.startsWith("part U1: pin"))).toEqual([undeclared("5", "CS"), undeclared("6", "D2"), undeclared("7", "NC")])
  })

  test("declaring all three makes the circuit valid, and nothing else was relaxed to do it", () => {
    expect(probeProblems(ncOverride({ "5": A_REASON, "6": A_REASON, "7": A_REASON }))).toEqual([])
  })

  test("a declared pin reaches the IR as an ordinary no-connect: net null, and on no net of the circuit", () => {
    const c = probeCircuit(ncOverride({ "5": A_REASON, "6": A_REASON, "7": A_REASON }))
    const five = c.pins.find((p) => p.part === "U1" && p.pin === "5")
    expect(five).toBeDefined()
    expect(five?.net).toBeNull()
    // The identity is the LIBRARY pin name, which is what gate 6 (`gates/pin-identity.ts`)
    // compares against for a part with no pin table: an identity invented here would make that
    // gate refuse a pin this declaration is supposed to settle.
    expect(five?.identity).toBe("CS")
    expect([...c.nets.values()].flat().filter((p) => p.part === "U1" && p.pin === "5")).toEqual([])
  })

  test("NEGATIVE CONTROL: with ONE pin declared, the other two are still refused - so it is not a blanket", () => {
    const problems = probeProblems(ncOverride({ "5": A_REASON }))
    expect(problems).toContain(undeclared("6", "D2"))
    expect(problems).toContain(undeclared("7", "NC"))
    expect(problems).not.toContain(undeclared("5", "CS"))
  })

  test("NEGATIVE CONTROL: with TWO declared, the third is still refused - the same claim one pin further on", () => {
    const problems = probeProblems(ncOverride({ "5": A_REASON, "7": A_REASON }))
    expect(problems).toEqual([undeclared("6", "D2")])
  })

  test("a declared pin is drawn as a no-connect marker, one per declared pin, not merely left unwired", () => {
    const c = probeCircuit(ncOverride({ "5": A_REASON, "6": A_REASON, "7": A_REASON }))
    const ctx = emitContext("nc-pins-fixture", c, fixtureSymbols, annotate(c, EMPTY_LOCK, new Map()).refs, ["generated by a test"], "usable")
    const sheet = emitSheet(layoutSheet(c, "s", fixtureSymbols, "Pwr:PWR_FLAG"), ctx)
    expect(sheet).toContain("(no_connect")
    expect(sheet.split("(no_connect").length - 1).toBe(3)
  })
})

describe("ncPins refuses rather than guessing", () => {
  test("a declaration naming a pin the symbol does not have refuses, naming the pin and the symbol's pins", () => {
    // **THE GUARD ITERATES THE DECLARATION, NEVER THE SYMBOL'S PINS**, which is the only way it
    // can fire: pin 9 is not a pin of BIG8, so a loop over BIG8's pins would never reach the
    // entry. `pinsDeclared`'s own MECHANICAL_PINS stale-table guard records the same lesson.
    expect(() => probeCircuit(ncOverride({ "9": A_REASON }))).toThrow(/the ncPins declaration names pin number\(s\) \[9\], which Fix:BIG8 does not have/)
    expect(() => probeCircuit(ncOverride({ "9": A_REASON }))).toThrow(/its pins: 1, 2, 3, 4, 5, 6, 7, 8/)
  })

  test("a pin declared no-connect that the model also puts on a net refuses, naming the pin and the net", () => {
    // `pinSemantics` cannot catch this one: it refuses a library pin TYPED `no_connect` that is on
    // a net, and BIG8 pin 1 is `bidirectional` - as detent 12 of SW_Rotary_1x12 is `passive`. With
    // no guard here the contradiction would draw a no-connect marker on a live wire.
    const clash = ncOverride({ "1": A_REASON, "5": A_REASON, "6": A_REASON, "7": A_REASON })
    expect(() => probeCircuit(clash)).toThrow(/the ncPins declaration says pin "1" \(D0\) of Fix:BIG8 carries no connection/)
    expect(() => probeCircuit(clash)).toThrow(/net "IN" on it/)
  })

  test("a blank per-pin reason refuses, because a pin number with nothing said about it is an exemption", () => {
    const problems = authoringProblems(probeAuthoring(ncOverride({ "5": "   " })), probeNetwork())
    expect(problems).toContain(
      'override for probe: ncPins declares pin "5" with a blank reason. Every pin named there is a claim that the ' +
        "chosen symbol has a pin the circuit does not reach, and the reason is what distinguishes that claim from an " +
        "exemption - say what the pin is and why nothing connects to it. It is not defaulted because the only honest " +
        "default would be silence about a pin somebody has to be able to check.",
    )
  })

  test("an override that declares ONLY ncPins is accepted - it overrides something", () => {
    expect(authoringProblems(probeAuthoring(ncOverride({ "5": A_REASON })), probeNetwork())).toEqual([])
  })

  test("an override that declares nothing at all is still refused, with ncPins named in the message", () => {
    const empty: ComponentOverride = { why: "a claim about nothing" }
    expect(authoringProblems(probeAuthoring(empty), probeNetwork())).toContain(
      "override for probe: overrides nothing (no symbol, symbolPins, pinSides or ncPins)",
    )
  })
})

/* ------------------------------------------------- the installed library: SW_Rotary_1x12 ----- */

const pultecNetwork = pultecMid()
const pultecSymbols: SymbolResolver = createResolver(symbolLibraries([...nicknamesOf(pultecNetwork, PULTEC_MID_SCHEMATIC)]))

const ELEVEN_THROW = "Switch:SW_Rotary_1x12"

// The describe block that used to live here - "the selector symbols, read off the INSTALLED
// Switch.kicad_sym" - is gone rather than emptied. All four of its arms moved to
// tests/circuits/pultec-switch-geometry.test.ts: the two with a direct brief-given equivalent
// moved first, and the other two (the pin count/type/name check, and "pin 12 is a THROW and
// nothing like a mounting lug") followed once tests/kicad/symbol-library-disk.ts was widened to
// expose a pin's name, type and geometry - not only its number - so they no longer needed this
// generator's own library resolver. `pultecNetwork`, `pultecSymbols` and `ELEVEN_THROW` stay:
// the "pultec-mid" describe block below still needs them.

/* ------------------------------------------------------------- the board this unblocked ------ */

function midProblems(authoring: SchematicAuthoring): string[] {
  const spec = circuitSpecFrom(pultecNetwork, authoring, pultecSymbols)
  return validateCircuit(buildCircuit(spec, { symbols: pultecSymbols }), pultecSymbols)
}

/** `PULTEC_MID_SCHEMATIC` with the ncPins declaration stripped off every override. */
function withoutNcPins(authoring: SchematicAuthoring): SchematicAuthoring {
  const overrides = Object.fromEntries(
    Object.entries(authoring.overrides).map(([id, o]): [string, ComponentOverride] => {
      const { ncPins: _dropped, ...rest } = o
      return [id, rest]
    }),
  )
  return { ...authoring, overrides }
}

describe("pultec-mid, the board that produced no drawing", () => {
  test("exactly one component declares ncPins, and it is SW_MID's twelfth detent", () => {
    const declaring = Object.entries(PULTEC_MID_SCHEMATIC.overrides).filter(([, o]) => o.ncPins !== undefined)
    expect(declaring.map(([id]) => id)).toEqual(["SW_MID"])
    const ncPins = declaring[0]?.[1].ncPins ?? {}
    expect(Object.keys(ncPins)).toEqual(["12"])
    // The reason names the part decision rather than restating the rule - `CLAUDE.md`'s tell for a
    // demand to question is "a rule that refuses with a restatement of itself".
    expect(ncPins["12"]).toContain("1x12")
    expect(ncPins["12"]).toContain("11 positions")
  })

  test("SW_MID is the eleven-position selector drawn with the twelve-throw symbol, which is where the spare detent comes from", () => {
    const sw = pultecNetwork.components.find((c) => c.id === "SW_MID")
    expect(sw?.part?.symbol).toBe(ELEVEN_THROW)
    expect(Object.keys(sw?.units[0]?.pins ?? {}).filter((p) => p !== "common").length).toBe(11)
  })

  test("the circuit now validates clean, so geometry exists for it to be drawn from", () => {
    expect(midProblems(PULTEC_MID_SCHEMATIC)).toEqual([])
  })

  test("pin 12 is in the IR as a no-connect, on no net, with the library's own pin name as its identity", () => {
    const c = buildCircuit(circuitSpecFrom(pultecNetwork, PULTEC_MID_SCHEMATIC, pultecSymbols), { symbols: pultecSymbols })
    const twelve = c.pins.find((p) => p.part === "SW_MID" && p.pin === "12")
    expect(twelve).toBeDefined()
    expect(twelve?.net).toBeNull()
    expect(twelve?.identity).toBe("12")
    expect([...c.nets.values()].flat().filter((p) => p.part === "SW_MID" && p.pin === "12")).toEqual([])
  })

  test("NEGATIVE CONTROL: strip the declaration and the original refusal comes back, word for word", () => {
    expect(midProblems(withoutNcPins(PULTEC_MID_SCHEMATIC))).toEqual([
      "part SW_MID: pin 12 (12) is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts",
    ])
  })
})
