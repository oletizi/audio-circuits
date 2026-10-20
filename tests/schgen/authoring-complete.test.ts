/**
 * THE COMPLETENESS CHECK: for all four parity circuits, every component resolves a symbol and
 * every pin of that symbol has a side - and the declared blocks agree with the circuit.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. This is `docs/known-gaps.md`
 * **G99**'s criterion made into a check that could fail: *"every input a layout backend needs is
 * either declared in the model or derived by a reviewed rule - none invented at the call site."*
 * Before Task 9, 67 of the four circuits' 102 components declared no symbol at all; a backend
 * handed one of them had to invent one, and G99 measured what the inventions cost.
 */

import { test, expect, describe } from "bun:test"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"
import { circuitSpecFrom, mpnSymbolDisagreements, pinSidesOf, preferredOrientationsOf, schematicParts } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { validateCircuit } from "../../lib/schgen/ir/validate.ts"
import { blockPrefixDisagreements, interfaceDisagreements, unblockedComponents } from "../../lib/schgen/authoring-checks.ts"
import { symbolRefPrefix } from "../../lib/schgen/rules/symbols.ts"
import { authoringProblems } from "../../lib/schgen/authoring.ts"

const symbols = parityResolver()

test("the parity set is the four circuits, so none of the sweeps below iterates nothing", () => {
  expect(PARITY_CASES.map((c) => c.name)).toEqual([
    "opamp-buffer",
    "optical-compressor",
    "pt2399-core",
    "transistor-preamp",
  ])
})

describe.each(PARITY_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
  test("the authoring declaration is well formed on its own", () => {
    expect(authoringProblems(c.authoring, c.network)).toEqual([])
  })

  test("every component resolves a symbol, every pin a side", () => {
    const spec = circuitSpecFrom(c.network, c.authoring, symbols)
    const sides = pinSidesOf(c.network, c.authoring, symbols)
    expect(spec.parts.length, `${c.name} built no parts`).toBe(c.network.components.length)
    for (const part of spec.parts) {
      expect(part.libId, part.label).not.toBe("")
      const symbol = symbols.resolve(part.libId)
      const partSides = sides.get(part.label)
      expect(partSides, `${part.label} has no pin-side map`).toBeDefined()
      expect(symbol.pins.length, `${part.libId} has no pins`).toBeGreaterThan(0)
      for (const pin of symbol.pins) {
        expect(partSides?.get(pin.number), `${part.label}.${pin.number}`).toBeDefined()
      }
    }
  })

  test("every declared designator agrees with the prefix its symbol declares", () => {
    const parts = schematicParts(c.network, c.authoring, symbols)
    const wrong = parts
      .filter((p) => p.spec.refPrefix !== symbolRefPrefix(p.symbol))
      .map((p) => `${p.component.id}: designator ${p.spec.label} against ${p.symbol.libId}'s "${symbolRefPrefix(p.symbol)}"`)
    expect(wrong).toEqual([])
  })

  test("every declared block agrees with the include() prefixes", () => {
    expect(blockPrefixDisagreements(c.network, c.authoring)).toEqual([])
  })

  test("every component is in exactly one block", () => {
    expect(unblockedComponents(c.network, c.authoring)).toEqual([])
  })

  test("a block's declared interface is exactly the nets that leave it", () => {
    expect(interfaceDisagreements(c.network, c.authoring)).toEqual([])
  })

  test("every declared pin side agrees with the symbol's own geometry", () => {
    // Task 9 review, round 1 (G155). The parity circuits declare NO pin sides any more - the
    // deleted two-distinct-sides rule was the only thing that asked for them, and all 37 it
    // forced agreed with sideOfPin(0, pin) - so this asserts the declaration count is zero rather
    // than sweeping an empty list and calling it a pass. `sidesFor` in from-network.ts is what
    // refuses a disagreeing declaration, and tests/schgen/from-network.test.ts drives it.
    const parts = schematicParts(c.network, c.authoring, symbols)
    const asserted = parts.flatMap((p) => [...p.sidesFromOverride].map((n) => `${p.spec.label}.${n}`))
    expect(asserted, "a declared pin side needs the agreement test in from-network.test.ts beside it").toEqual([])
    for (const part of parts) {
      expect(part.pinSides.size, part.spec.label).toBe(part.symbol.pins.length)
    }
  })

  test("the orientation rule library answers for every part or leaves it open", () => {
    const orientations = preferredOrientationsOf(c.network, c.authoring, symbols)
    expect(orientations.size).toBe(c.network.components.length)
    for (const [label, rotation] of orientations) {
      if (rotation === null) continue
      expect([0, 90, 180, 270], label).toContain(rotation)
    }
  })
})

/**
 * **WHICH `validateCircuit` RULES REFUSE, AND THAT IT IS ONLY THESE FOUR** - Task 9 review, round
 * 1, item I4.
 *
 * `circuitSpecFrom`'s output does NOT pass `validateCircuit`, and that is the consequence of
 * obeying G99's criterion rather than a violation of it: making it pass would need an invented net
 * rename, an invented no-connect reason and invented BOM fields, which are three of the exact
 * inventions the criterion forbids. Each refusing rule has a register entry - `netNames`
 * **G150**, `pinsDeclared` **G151**, `singlePinNets` **G159**, `bomFields` **G149** - and this
 * test locks all four deferrals at once.
 *
 * **It is the check that catches a later task "fixing" one of them the forbidden way:** a
 * generator that normalised net names would drop `netNames` to 0 and fail the counts here, which
 * is what G150's criterion (*"the mapping … is stated once and is reversible"*) requires someone
 * to notice.
 */
const RULE_CLASSES = [
  { name: "netNames", matches: (p: string): boolean => p.includes("is not UPPER_SNAKE") },
  { name: "pinsDeclared", matches: (p: string): boolean => p.includes("is neither on a net nor declared not connected") },
  { name: "singlePinNets", matches: (p: string): boolean => p.includes("has only one pin") },
  { name: "bomFields", matches: (p: string): boolean => p.includes("BOM field") },
] as const

/** Per circuit: total problems, then netNames / pinsDeclared / singlePinNets / bomFields. */
const EXPECTED_REFUSALS: Readonly<Record<string, readonly [number, number, number, number, number]>> = {
  "opamp-buffer": [39, 0, 3, 0, 36],
  "optical-compressor": [162, 14, 0, 0, 148],
  "pt2399-core": [114, 17, 0, 1, 96],
  "transistor-preamp": [100, 0, 0, 0, 100],
}

test("validateCircuit refuses each parity circuit with exactly four rule classes and no others", () => {
  expect(Object.keys(EXPECTED_REFUSALS).length).toBe(PARITY_CASES.length)
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const problems = validateCircuit(circuit, symbols)
    const unclassified = problems.filter((p) => !RULE_CLASSES.some((r) => r.matches(p)))
    expect(
      unclassified,
      `${c.name}: validateCircuit refused for a reason none of the four register entries covers. ` +
        "Either the spec regressed or a fifth deferral needs recording.",
    ).toEqual([])
    const counts = RULE_CLASSES.map((r) => problems.filter((p) => r.matches(p)).length)
    expect([problems.length, ...counts], c.name).toEqual([...(EXPECTED_REFUSALS[c.name] ?? [])])
  }
})

test("the one single-pin net is pt2399-core's CLK_O placeholder, which the declaration declares a port", () => {
  // G159: the authoring file deliberately declares this net a port AND an interface port with a
  // stated reason, and the IR refuses it as a single-pin net. The declaration and the IR disagree
  // about the same net; this names which net, so the disagreement cannot be mistaken for a
  // generic BOM or net-name refusal.
  const c = PARITY_CASES.find((x) => x.name === "pt2399-core")
  expect(c).toBeDefined()
  if (c === undefined) return
  const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
  const singles = validateCircuit(circuit, symbols).filter((p) => p.includes("has only one pin"))
  expect(singles).toEqual([
    "net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5); connect it or declare the pin not connected",
  ])
  const port = c.authoring.blocks[0]?.interface.find((p) => p.net === "unconnected-(U1-CLK_O-Pad5)")
  expect(port, "the declaration no longer declares the net the IR refuses").toBeDefined()
  expect(c.authoring.portDirections["unconnected-(U1-CLK_O-Pad5)"]).toBe("out")
})

/**
 * **A DECLARED SYMBOL'S PART NAME AGAINST THE COMPONENT'S `part.mpn`** - Task 9 review, round 1,
 * item I5. The set is PINNED rather than asserted empty, because a disagreement is often correct
 * (a symbol name is not an order code) and what is unacceptable is one nobody has looked at.
 */
test("every mpn-versus-symbol-name disagreement is one of the eight already classified", () => {
  const all = PARITY_CASES.flatMap((c) =>
    mpnSymbolDisagreements(schematicParts(c.network, c.authoring, symbols)).map(
      (d) => `${c.name}/${d.component}: ${d.mpn} drawn as ${d.libId}`,
    ),
  )
  expect(all).toEqual([
    // THE LIVE HARDWARE CLAIM: Amplifier_Operational:TL072H does not exist, so both op-amps are
    // drawn with TL072 and nobody has read a TL072H datasheet to check the pinout. G156, and the
    // datasheet read is owed by the first task that emits a sheet for this circuit.
    "optical-compressor/audio_signal_opamp: TL072H drawn as Amplifier_Operational:TL072",
    "optical-compressor/sidechain_control_opamp: TL072H drawn as Amplifier_Operational:TL072",
    // BENIGN: RM-065 is Runtron's order code for a single-turn carbon trimmer and
    // Device:R_Potentiometer_Trim is the generic trimmer glyph. A symbol name is not an order
    // code and no hardware claim is being made.
    "transistor-preamp/upper_bias_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
    "transistor-preamp/feedback_bias_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
    "transistor-preamp/lower_bias_a_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
    "transistor-preamp/lower_bias_b_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
    "transistor-preamp/collector_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
    "transistor-preamp/emitter_bypass_trim: RM-065 drawn as Device:R_Potentiometer_Trim",
  ])
})
