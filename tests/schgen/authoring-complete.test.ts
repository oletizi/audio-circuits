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
import { circuitSpecFrom, pinSidesOf, preferredOrientationsOf, schematicParts } from "../../lib/schgen/from-network.ts"
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

  test("the orientation rule library answers for every part or leaves it open", () => {
    const orientations = preferredOrientationsOf(c.network, c.authoring, symbols)
    expect(orientations.size).toBe(c.network.components.length)
    for (const [label, rotation] of orientations) {
      if (rotation === null) continue
      expect([0, 90, 180, 270], label).toContain(rotation)
    }
  })
})
