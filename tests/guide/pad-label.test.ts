/**
 * Task 2: the whole label a pad's wire carries - the control's function, and
 * what the terminal IS - joined from the two sources that state those things.
 *
 * **THE JOIN UNDER TEST IS BY INDEX, WHICH IS WHY THIS FILE EXISTS.** The pad
 * order (`padOrderFor`, `circuits/pultec/physical/parts.ts`) names a rotary's
 * throws `t1`...`t6`; `SELECTORS` (`circuits/pultec/electrical/controls.ts`)
 * says what each selects. Matching them is only admissible while the counts
 * agree, and the disagreement test below is the one that matters: a frequency
 * against the wrong detent reads as an ordinary instruction and sends a wire to
 * the wrong lug.
 *
 * **WHY THE DISAGREEMENT IS DRIVEN THROUGH A HAND-BUILT MODEL AND COULD NOT BE
 * DRIVEN ANY OTHER WAY.** `buildSelectors`
 * (`circuits/pultec/electrical/from-netlist.ts`) generates a selector's throw
 * pins FROM its `positions` list, so a committed selector's pad order and its
 * positions cannot disagree, and no real component can make the count check
 * fire. A guard nobody can make fire is a guard nobody knows works, which is
 * why `padLabelOf` takes the model it consults.
 *
 * **EVERY COMPONENT HERE IS A REAL ONE**, read off the physicalized sections
 * through `ownComponents`, so the pin counts and throw names the expectations
 * rest on are the ones `padOrderFor` itself sees - not a fixture shaped to
 * agree with this file's reading of the rule. The only hand-built things are
 * the DISAGREEING control models, which is the fault being driven, and
 * `SW_UNKNOWN`, which is a real rotary with its ref changed - exactly the case
 * under test and nothing else.
 *
 * **EVERY EXPECTED FREQUENCY IS READ OUT OF `SELECTORS`, NOT TYPED IN**, except
 * the one in the headline test the plan states verbatim (`LO BOOST 60Hz`). A
 * test that typed its own frequency table would pass against an implementation
 * that had invented one.
 */
import { test, expect } from "bun:test"
import type { Component } from "../../lib/model/types.ts"
import { ownComponents, padOrderFor } from "../../circuits/pultec/physical/parts.ts"
import {
  SELECTORS,
  LO_FREQUENCY_GANG,
  type SelectorTerminals,
} from "../../circuits/pultec/electrical/controls.ts"
import {
  PULTEC_CONTROLS,
  functionNameOf,
  padLabelOf,
  type ControlModel,
} from "../../tools/guide/pad-label.ts"

type Owner = "low-boost" | "low-cut" | "hi-boost" | "hi-cut" | "mid"

function componentOf(owner: Owner, id: string): Component {
  const found = ownComponents(owner).find((component) => component.id === id)
  if (found === undefined) {
    throw new Error(`no ${owner} component named "${id}"; ownComponents("${owner}") has moved`)
  }
  return found
}

function potComponent(id: string): Component {
  const component = componentOf("low-boost", id)
  if (component.kind !== "potentiometer") {
    throw new Error(`"${id}" is a "${component.kind}", not the potentiometer this test needs`)
  }
  return component
}

function rotaryComponent(id: string): Component {
  const component = componentOf("low-boost", id)
  if (component.kind !== "switch") {
    throw new Error(`"${id}" is a "${component.kind}", not the rotary switch this test needs`)
  }
  return component
}

/** The real low-boost rotary under a ref no control model names. */
function unknownRotary(): Component {
  return { ...rotaryComponent("SW_LO_BOOST"), id: "SW_UNKNOWN" }
}

function selectorEntry(ref: string): SelectorTerminals {
  const found = SELECTORS.find((selector) => selector.ref === ref)
  if (found === undefined) throw new Error(`SELECTORS does not name "${ref}"`)
  return found
}

/** The committed model with one selector's positions replaced - the fault driven. */
function withPositions(
  controls: ControlModel,
  ref: string,
  positions: readonly string[],
): ControlModel {
  const named = controls.selectors.filter((selector) => selector.ref === ref)
  if (named.length !== 1) {
    throw new Error(`expected exactly one selector named "${ref}", found ${named.length}`)
  }
  return {
    pots: controls.pots,
    selectors: controls.selectors.map((selector) =>
      selector.ref === ref ? { ...selector, positions } : selector),
  }
}

function messageFrom(call: () => string): string {
  try {
    const label = call()
    throw new Error(`expected a refusal, got the label "${label}"`)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

test("a rotary throw is labelled with the frequency it selects", () => {
  expect(padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", PULTEC_CONTROLS)).toBe("LO BOOST 60Hz")
})

test("a pot lug is labelled with the control and the lug", () => {
  expect(padLabelOf(potComponent("RV_LO_BOOST"), "2", PULTEC_CONTROLS)).toBe("LO BOOST wiper")
  expect(padLabelOf(potComponent("RV_LO_BOOST"), "1", PULTEC_CONTROLS)).toBe("LO BOOST ccw")
  expect(padLabelOf(potComponent("RV_LO_BOOST"), "3", PULTEC_CONTROLS)).toBe("LO BOOST cw")
})

test("a rotary's first pad is its pole, labelled the pole and not a frequency", () => {
  expect(padLabelOf(rotaryComponent("SW_LO_BOOST"), "1", PULTEC_CONTROLS)).toBe("LO BOOST common")
})

/** The off-by-one in the JOIN, which the headline test alone would not catch:
 * pin 2 is the FIRST position and pin 7 the last, because pin 1 is the pole. */
test("every throw takes the position SELECTORS puts at its own index", () => {
  const rotary = rotaryComponent("SW_LO_BOOST")
  const positions = selectorEntry("SW_LO_BOOST").positions
  expect(padOrderFor(rotary).length, "the premise: a pole and six throws").toBe(positions.length + 1)
  const labels = positions.map((_, index) => padLabelOf(rotary, String(index + 2), PULTEC_CONTROLS))
  expect(labels).toEqual(positions.map((position) => `LO BOOST ${position}`))
})

test("a selector whose positions and throws disagree in count refuses", () => {
  const short = withPositions(PULTEC_CONTROLS, "SW_LO_BOOST", ["20Hz", "30Hz"])
  expect(() => padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", short))
    .toThrow(/six throws .* two positions/)
})

test("the count refusal names both counts, both sources, and what a wrong detent does", () => {
  const long = withPositions(PULTEC_CONTROLS, "SW_LO_BOOST",
    [...selectorEntry("SW_LO_BOOST").positions, "400Hz"])
  const message = messageFrom(() => padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", long))
  expect(message, "names the selector").toContain("SW_LO_BOOST")
  expect(message, "both counts, in words").toMatch(/six throws .* seven positions/)
  expect(message, "names the pad order's source").toContain("rotaryPadOrder")
  expect(message, "names the positions' source").toContain("controls.ts")
  expect(message, "quotes the transcription's provenance")
    .toContain(selectorEntry("SW_LO_BOOST").source)
  expect(message, "refuses to truncate or pad").toContain("neither is padded")
  expect(message, "says what a wrong detent costs").toContain("wrong lug")
})

/** The pole's pad refuses on the same disagreement. One pad that happened to
 * work would hide a selector whose two sources do not line up. */
test("the pole's pad refuses too when the counts disagree", () => {
  const short = withPositions(PULTEC_CONTROLS, "SW_LO_BOOST", ["20Hz", "30Hz"])
  expect(() => padLabelOf(rotaryComponent("SW_LO_BOOST"), "1", short))
    .toThrow(/pad-label-detent-count/)
})

test("a control the model does not name refuses rather than printing its ref", () => {
  expect(() => padLabelOf(unknownRotary(), "1", PULTEC_CONTROLS)).toThrow(/SW_UNKNOWN/)
})

test("the unknown-control refusal names both lists and says why the ref is not used", () => {
  const message = messageFrom(() => padLabelOf(unknownRotary(), "1", PULTEC_CONTROLS))
  expect(message, "names the pads it cannot label").toContain("SW_UNKNOWN.1")
  expect(message, "names what POTS holds").toContain("RV_LO_BOOST")
  expect(message, "names what SELECTORS holds").toContain("SW_LO_CUT")
  expect(message, "says the ref is not a fallback").toContain("NOT labelled with its ref")
  expect(message, "says where to add the control").toContain("controls.ts")
})

/** A real off-board part with no control prefix: the hi-boost inductors. */
test("a ref with no known prefix refuses rather than printing itself", () => {
  const inductor = componentOf("hi-boost", "L_HI_BOOST_100MH")
  expect(inductor.kind, "the premise: a real off-board inductor").toBe("inductor")
  const message = messageFrom(() => padLabelOf(inductor, "1", PULTEC_CONTROLS))
  expect(message, "names the ref").toContain("L_HI_BOOST_100MH")
  expect(message, "names the prefixes a name can be read off").toContain("RV_, SW_")
  expect(message, "says the ref is not printed raw").toContain("NOT printed raw")
})

test("a function name is the ref with its prefix dropped and underscores as spaces", () => {
  expect(functionNameOf("RV_LO_BOOST")).toBe("LO BOOST")
  expect(functionNameOf("SW_LO_BOOST")).toBe("LO BOOST")
  expect(functionNameOf("RV_HI_Q")).toBe("HI Q")
  expect(() => functionNameOf("RV_")).toThrow(/pad-label-unprefixed-ref/)
})

/** A pot listed as a selector: its pad order starts with a lug, not a pole.
 * `RV_MID` is a real pot that `POTS` does not name, so it reaches the selector
 * branch without tripping the in-both-lists refusal first. */
test("a selector whose pad order does not start with the pole refuses", () => {
  const pot = componentOf("mid", "RV_MID")
  expect(pot.kind, "the premise: a real potentiometer").toBe("potentiometer")
  expect(PULTEC_CONTROLS.pots.some((entry) => entry.ref === "RV_MID"),
    "the premise: POTS does not name it").toBe(false)
  const miscast: ControlModel = {
    pots: PULTEC_CONTROLS.pots,
    selectors: [...PULTEC_CONTROLS.selectors, { ...selectorEntry("SW_LO_BOOST"), ref: "RV_MID" }],
  }
  const message = messageFrom(() => padLabelOf(pot, "1", miscast))
  expect(message, "names the refusal").toContain("pad-label-no-common")
  expect(message, "names the pad order it found").toContain("ccw, wiper, cw")
})

test("a control named as both a pot and a selector refuses rather than picking one", () => {
  const both: ControlModel = {
    pots: PULTEC_CONTROLS.pots,
    selectors: [...PULTEC_CONTROLS.selectors,
      { ...selectorEntry("SW_LO_BOOST"), ref: "RV_LO_BOOST" }],
  }
  const message = messageFrom(() => padLabelOf(potComponent("RV_LO_BOOST"), "2", both))
  expect(message, "names the refusal").toContain("pad-label-control-in-both-lists")
  expect(message, "names the control").toContain("RV_LO_BOOST")
})

/** A label is read off the selector's OWN entry. Both poles of the low
 * frequency gang declare the same positions today and nothing in the model
 * requires it, so a label that reached for the gang partner's list would be
 * wrong on one of the five boards the day they diverge. */
test("a pole's label does not move when its gang partner's positions change", () => {
  const boost = selectorEntry("SW_LO_BOOST")
  const cut = selectorEntry("SW_LO_CUT")
  expect(boost.gang, "the premise: one shaft").toBe(LO_FREQUENCY_GANG)
  expect(cut.gang, "the premise: the other pole of it").toBe(LO_FREQUENCY_GANG)
  const divergent = withPositions(PULTEC_CONTROLS, "SW_LO_CUT",
    ["1Hz", "2Hz", "3Hz", "4Hz", "5Hz", "6Hz"])
  expect(padLabelOf(rotaryComponent("SW_LO_BOOST"), "4", divergent)).toBe("LO BOOST 60Hz")
  expect(padLabelOf(componentOf("low-cut", "SW_LO_CUT"), "4", divergent)).toBe("LO CUT 3Hz")
})

/** The ten pads of `pultec-low-boost`, labelled - the board the plan's printed
 * packet is read off. The refs and pins are the ones its frozen dump carries on
 * its `PAD ... FROM <ref>.<pin>` lines. */
test("the ten pads of the low-boost board each get a label a builder can act on", () => {
  const pot = potComponent("RV_LO_BOOST")
  const rotary = rotaryComponent("SW_LO_BOOST")
  const labels = [
    ...["1", "2", "3"].map((pin) => padLabelOf(pot, pin, PULTEC_CONTROLS)),
    ...["1", "2", "3", "4", "5", "6", "7"].map((pin) => padLabelOf(rotary, pin, PULTEC_CONTROLS)),
  ]
  expect(labels).toEqual([
    "LO BOOST ccw", "LO BOOST wiper", "LO BOOST cw",
    "LO BOOST common",
    "LO BOOST 20Hz", "LO BOOST 30Hz", "LO BOOST 60Hz",
    "LO BOOST 100Hz", "LO BOOST 150Hz", "LO BOOST 200Hz",
  ])
})
