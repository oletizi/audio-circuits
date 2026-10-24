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
import { validateCircuit, validateSourcing } from "../../lib/schgen/ir/validate.ts"
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
 * **WHICH RULES REFUSE, AND THAT IT IS ONLY THESE THREE** - Task 9 review, round 1, item I4.
 *
 * **IT WAS FOUR UNTIL TASK 3 OF THE NET-NAMES-AND-FLOATING-PINS PLAN, which DELETED the
 * `netNames` rule on the owner's decision** (*"i absolutely do not care about the letter case of
 * net names. That's a silly quibble."*). The class is gone from this table rather than pinned at
 * zero, because `validateCircuit` cannot produce it at all any more and a zero row here would
 * read as a measurement where it would really be a tautology. **The visible form of the decision
 * is in `tools/schgen/gate-census.ts`**, whose `PROBLEM_CLASSES` keeps an empty `netNames` row for
 * a reader of refusal classes, on the precedent that file states for `bomFields`.
 *
 * `circuitSpecFrom`'s output does NOT validate clean, and that is the consequence of obeying
 * G99's criterion rather than a violation of it: making `validateCircuit` pass would need an
 * invented no-connect reason, and making `validateSourcing` pass would need invented BOM fields -
 * two of the exact inventions the criterion forbids, split across the two compositions rather than
 * gating a drawing together (Task 20, **G245**). Each refusing rule has a register entry -
 * `pinsDeclared` **G151**, `singlePinNets` **G159**, `bomFields` **G149** - and this test locks all
 * three deferrals at once. **The fourth, `netNames` **G150**, is no longer a deferral: the demand
 * was withdrawn rather than satisfied, which is why its row left this table instead of dropping to
 * zero.**
 *
 * **SINCE TASK 20 THE REMAINING THREE ARE SPLIT ACROSS TWO COMPOSITIONS, and the split is the
 * owner's ruling rather than a reorganisation.** The BOM requirement is a property of the CONSUMER
 * of an artifact and not of the circuit, so `validateCircuit` - what `generate` gates a DRAWING on
 * - runs the first two, and `validateSourcing` runs `bomFields` for a consumer that has to source
 * and place the parts. `lib/schgen/ir/validate.ts`'s header carries his words; `docs/known-gaps.md`
 * **G245** carries the decision and this table's figures. **Both halves are pinned here**: the
 * sourcing counts are the same 36 / 148 / 96 / 100 this test asserted before the split, so the
 * rule is still measured on all four circuits and a later task that quietly stopped running it
 * fails here rather than going green.
 *
 * **It is the check that catches a later task "fixing" one of them the forbidden way**, and the
 * example this comment used to give is the one Task 3 removed: a generator that normalised net
 * names would have dropped `netNames` to 0 and failed the counts here. **That tripwire is gone
 * with the rule, and nothing replaces it** - a generator that renamed nets now changes no figure
 * in this file. `docs/known-gaps.md` **G279** records the loss, because the round-trip concern
 * behind G150's *"stated once and is reversible"* did not go away with the case demand.
 */
const RULE_CLASSES = [
  { name: "pinsDeclared", matches: (p: string): boolean => p.includes("is neither on a net nor declared not connected") },
  { name: "singlePinNets", matches: (p: string): boolean => p.includes("has only one pin") },
] as const

/** The one class `validateSourcing` reports, and the one `validateCircuit` must never report again. */
const BOM_CLASS = { name: "bomFields", matches: (p: string): boolean => p.includes("BOM field") } as const

/**
 * Per circuit: total DRAWING problems, then pinsDeclared / singlePinNets.
 *
 * **TASK 3 re-drove every row.** `optical-compressor` went 14 -> 0 and `pt2399-core` 18 -> 1,
 * which is the whole of what deleting the case demand bought on the parity set: its 14 refusals
 * were all net names, and 17 of `pt2399-core`'s 18 were.
 */
const EXPECTED_REFUSALS: Readonly<Record<string, readonly [number, number, number]>> = {
  "opamp-buffer": [3, 3, 0],
  "optical-compressor": [0, 0, 0],
  "pt2399-core": [1, 0, 1],
  // TASK 20: zero. This circuit's 100 gate-1 problems were ALL empty purchasing fields, and
  // nothing else was wrong with it - G238 measured that and G245 records what it unblocked.
  "transistor-preamp": [0, 0, 0],
}

/** Per circuit: `validateSourcing` problems, every one of them a `bomFields` refusal. */
const EXPECTED_SOURCING: Readonly<Record<string, number>> = {
  "opamp-buffer": 36,
  "optical-compressor": 148,
  "pt2399-core": 96,
  "transistor-preamp": 100,
}

test("validateCircuit refuses each parity circuit with exactly two drawing rule classes and no others", () => {
  expect(Object.keys(EXPECTED_REFUSALS).length).toBe(PARITY_CASES.length)
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const problems = validateCircuit(circuit, symbols)
    // The BOM arm is asserted FIRST so that a re-added `bomFields` names itself here rather than
    // arriving as the generic "a reason none of the two classes covers", which is what it looked
    // like when this perturbation was driven in the other order.
    expect(
      problems.filter((p) => BOM_CLASS.matches(p)),
      `${c.name}: a purchasing field refused a DRAWING. Task 20 took bomFields out of the drawing ` +
        "path under the owner's ruling that the BOM requirement belongs to the consumer of an " +
        "artifact; putting it back is the regression this asserts, not a tidy-up.",
    ).toEqual([])
    const unclassified = problems.filter((p) => !RULE_CLASSES.some((r) => r.matches(p)))
    expect(
      unclassified,
      `${c.name}: validateCircuit refused for a reason none of the two register entries covers. ` +
        "Either the spec regressed or a third deferral needs recording.",
    ).toEqual([])
    const counts = RULE_CLASSES.map((r) => problems.filter((p) => r.matches(p)).length)
    expect([problems.length, ...counts], c.name).toEqual([...(EXPECTED_REFUSALS[c.name] ?? [])])
  }
})

test("validateSourcing refuses each parity circuit on its empty purchasing fields and nothing else", () => {
  expect(Object.keys(EXPECTED_SOURCING).length).toBe(PARITY_CASES.length)
  for (const c of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const problems = validateSourcing(circuit, symbols)
    expect(
      problems.filter((p) => !BOM_CLASS.matches(p)),
      `${c.name}: validateSourcing reported something that is not a BOM field refusal`,
    ).toEqual([])
    expect(problems.length, `${c.name}: all four circuits declare bom.kind "unsourced" (G149)`)
      .toBe(EXPECTED_SOURCING[c.name] ?? -1)
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
