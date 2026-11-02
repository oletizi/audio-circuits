/**
 * Task 1: a pad's terminal name, read off the pad order `parts.ts` already
 * states for the component's kind rather than invented here.
 *
 * `padOrderFor` (`circuits/pultec/physical/parts.ts:462`) is the single source
 * of truth: a pot's three lugs are `POT_PAD_ORDER`, a rotary's pads are its
 * common followed by its own throws in `rotaryPadOrder`'s order. `pin` is a
 * 1-based index into that list - a panel part's lugs are numbered 1, 2, 3, not
 * 0, 1, 2 - and nothing else decides a terminal's name.
 *
 * `RV_LO_BOOST` and `SW_LO_BOOST` are read off the real low-boost module
 * (`ownComponents("low-boost")`) rather than built by hand, so the pin counts
 * and pin names asserted below are the ones `padOrderFor` itself would see for
 * these parts - not a fixture shaped to agree with this file's own reading of
 * the rule.
 */
import { test, expect } from "bun:test"
import type { Component } from "../../lib/model/types.ts"
import { ownComponents, padOrderFor } from "../../circuits/pultec/physical/parts.ts"
import { terminalNameOf } from "../../tools/guide/pad-terminal.ts"

function lowBoostComponent(id: string): Component {
  const found = ownComponents("low-boost").find((component) => component.id === id)
  if (found === undefined) {
    throw new Error(`no low-boost component named "${id}"; ownComponents("low-boost") has moved`)
  }
  return found
}

function potComponent(id: string): Component {
  const component = lowBoostComponent(id)
  if (component.kind !== "potentiometer") {
    throw new Error(`"${id}" is a "${component.kind}", not the potentiometer this test needs`)
  }
  return component
}

function rotaryComponent(id: string): Component {
  const component = lowBoostComponent(id)
  if (component.kind !== "switch") {
    throw new Error(`"${id}" is a "${component.kind}", not the rotary switch this test needs`)
  }
  return component
}

test("a pot's three pads are its lugs, in the order a panel part numbers them", () => {
  const pot = potComponent("RV_LO_BOOST")
  expect(terminalNameOf(pot, "1")).toBe("ccw")
  expect(terminalNameOf(pot, "2")).toBe("wiper")
  expect(terminalNameOf(pot, "3")).toBe("cw")
})

test("a rotary's first pad is the common and the rest are its throws in detent order", () => {
  const rotary = rotaryComponent("SW_LO_BOOST")
  const order = padOrderFor(rotary)
  expect(order.length, "the premise: a common and six throws").toBe(7)
  expect(terminalNameOf(rotary, "1")).toBe("common")
  expect(terminalNameOf(rotary, "4")).toBe(order[3])
})

test("a pin outside the pad order refuses rather than naming the wrong terminal", () => {
  expect(() => terminalNameOf(potComponent("RV_LO_BOOST"), "4")).toThrow(/pad order/)
})

test("the refusal names the component, the pin, and the list it was not in", () => {
  const message = (() => {
    try {
      terminalNameOf(potComponent("RV_LO_BOOST"), "4")
      throw new Error("expected terminalNameOf to throw")
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })()
  expect(message, "names the component").toContain("RV_LO_BOOST")
  expect(message, "names the pin").toContain('"4"')
  expect(message, "names the pad order it was not in").toContain("ccw, wiper, cw")
  expect(message, "says the pad order is stated in parts.ts").toContain("parts.ts")
})

test("a non-numeric pin refuses the same way rather than being coerced into an index", () => {
  expect(() => terminalNameOf(potComponent("RV_LO_BOOST"), "wiper")).toThrow(/pad order/)
})
