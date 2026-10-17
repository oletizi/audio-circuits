/**
 * Task 2: the whole label a pad's wire carries - which part it is, and what the
 * terminal this pad lands IS.
 *
 * **THE LABEL IS DERIVED FROM THE COMPONENT, NOT FROM A LIST OF REFS.** The
 * function name comes off the ref, the terminal off `padOrderFor`, and what a
 * switch terminal selects off the component's own `contacts` through
 * `positionsByPin` (`lib/board/part-text.ts`), which is the derivation the
 * committed `boards/pultec-mid/wiring.md` has printed all along. There is no
 * index join between a pad order and a positions list, so there is no count to
 * check and no whitelist to be absent from - the first version of this file had
 * all three and could not label `SW_MID_MODE`, whose centre `off` detent closes
 * nothing. Those tests are deleted with the mechanism they guarded.
 *
 * **EVERY COMPONENT HERE IS A REAL ONE**, read off the physicalized sections
 * through `ownComponents`, so the pin counts, throw names and contacts the
 * expectations rest on are the ones the guide itself sees - not a fixture shaped
 * to agree with this file's reading of the rule. The only hand-built thing is a
 * real switch with its `contacts` emptied, which is the fault being driven.
 *
 * **THE FREQUENCIES ARE CHECKED AGAINST AN INDEPENDENT SOURCE.** The code reads
 * `contacts`; the sweep below compares what it produces against `SELECTORS` and
 * `HI_BOOST_POSITIONS` in `circuits/pultec/electrical/controls.ts`, the
 * transcribed tables with the document and page behind them. Two derivations
 * agreeing is evidence; a test reading the same map the code reads would be
 * none.
 */
import { test, expect } from "bun:test"
import type { Component } from "../../lib/model/types.ts"
import { ownComponents, padOrderFor } from "../../circuits/pultec/physical/parts.ts"
import { OFF_BOARD } from "../../circuits/pultec/off-board.ts"
import { HI_BOOST_POSITIONS, SELECTORS } from "../../circuits/pultec/electrical/controls.ts"
import { functionNameOf, padLabelOf } from "../../tools/guide/pad-label.ts"

type Owner = "low-boost" | "low-cut" | "hi-boost" | "hi-cut" | "mid"

const OWNERS: readonly Owner[] = ["low-boost", "low-cut", "hi-boost", "hi-cut", "mid"]

function componentOf(owner: Owner, id: string): Component {
  const found = ownComponents(owner).find((component) => component.id === id)
  if (found === undefined) {
    throw new Error(`no ${owner} component named "${id}"; ownComponents("${owner}") has moved`)
  }
  return found
}

function kindOf(owner: Owner, id: string, kind: Component["kind"]): Component {
  const component = componentOf(owner, id)
  if (component.kind !== kind) {
    throw new Error(`"${id}" is a "${component.kind}", not the "${kind}" this test needs`)
  }
  return component
}

/** Every pad of one component, labelled, in pad order. */
function labelsOf(component: Component): readonly string[] {
  return padOrderFor(component).map((_, index) => padLabelOf(component, String(index + 1)))
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
  expect(padLabelOf(kindOf("low-boost", "SW_LO_BOOST", "switch"), "4")).toBe("LO BOOST 60Hz")
})

test("a pot lug is labelled with the control and the lug", () => {
  const pot = kindOf("low-boost", "RV_LO_BOOST", "potentiometer")
  expect(padLabelOf(pot, "2")).toBe("LO BOOST wiper")
  expect(labelsOf(pot)).toEqual(["LO BOOST ccw", "LO BOOST wiper", "LO BOOST cw"])
})

test("a rotary's first pad is its pole, labelled the pole and not a frequency", () => {
  expect(padLabelOf(kindOf("low-boost", "SW_LO_BOOST", "switch"), "1")).toBe("LO BOOST common")
})

/** The ten pads of `pultec-low-boost`, which is the board the printed packet is
 * read off. Unchanged by the move from an index join to `contacts`. */
test("the ten pads of the low-boost board each get a label a builder can act on", () => {
  const labels = [
    ...labelsOf(kindOf("low-boost", "RV_LO_BOOST", "potentiometer")),
    ...labelsOf(kindOf("low-boost", "SW_LO_BOOST", "switch")),
  ]
  expect(labels).toEqual([
    "LO BOOST ccw", "LO BOOST wiper", "LO BOOST cw",
    "LO BOOST common",
    "LO BOOST 20Hz", "LO BOOST 30Hz", "LO BOOST 60Hz",
    "LO BOOST 100Hz", "LO BOOST 150Hz", "LO BOOST 200Hz",
  ])
})

/** THE CASE THE INDEX JOIN COULD NOT DO. `SW_MID_MODE` declares three positions
 * and carries two throws, because the centre `off` closes nothing - which is
 * what a centre-off switch IS, not a disagreement to reconcile. The committed
 * `boards/pultec-mid/wiring.md` prints exactly this: pad 1 common with a dash,
 * pad 2 boost, pad 3 cut. */
test("a centre-off switch labels its two throws and needs no entry for the detent that closes nothing", () => {
  const mode = kindOf("mid", "SW_MID_MODE", "switch")
  expect(mode.parameters, "the premise: three positions declared")
    .toMatchObject({ positions: ["boost", "off", "cut"] })
  expect(padOrderFor(mode).length, "the premise: a pole and two throws").toBe(3)
  expect(labelsOf(mode)).toEqual(["MID MODE common", "MID MODE boost", "MID MODE cut"])
})

/** `SW_HI_BOOST`, `SW_MID` and `RV_MID` are in no `POTS`/`SELECTORS` entry, and
 * the first version of this file refused all three. */
test("a control no transcribed control list names is labelled from its own contacts", () => {
  expect(SELECTORS.some((entry) => entry.ref === "SW_HI_BOOST"),
    "the premise: SELECTORS does not name it").toBe(false)
  expect(labelsOf(kindOf("hi-boost", "SW_HI_BOOST", "switch"))).toEqual([
    "HI BOOST common",
    ...HI_BOOST_POSITIONS.map((position) => `HI BOOST ${position.label}`),
  ])
  expect(labelsOf(kindOf("mid", "RV_MID", "potentiometer")))
    .toEqual(["MID ccw", "MID wiper", "MID cw"])
  const mid = labelsOf(kindOf("mid", "SW_MID", "switch"))
  expect(mid.length, "a pole and eleven throws").toBe(12)
  expect(mid[0]).toBe("MID common")
  expect(mid[1]).toBe("MID 200Hz")
  expect(mid[11]).toBe("MID 7kHz")
})

/** The committed hi-boost and mid layouts carry inductor pads - four coils and
 * five, two pads each - so a guide that refused them would print no page for
 * either board. */
test("an off-board coil's pads are labelled with the coil and its end", () => {
  expect(labelsOf(kindOf("hi-boost", "L_HI_BOOST_100MH", "inductor")))
    .toEqual(["HI BOOST 100MH a", "HI BOOST 100MH b"])
  expect(labelsOf(kindOf("mid", "L_MID_0R45H", "inductor")))
    .toEqual(["MID 0R45H a", "MID 0R45H b"])
})

/**
 * THE SWEEP, and it is the check that replaces a known-gaps entry whose
 * "verified" rested on an ASCII grep of the binary `.vrt` files - a check
 * structurally incapable of failing. This one can: every off-board pad of all
 * five committed sections is labelled, and the frequencies are compared against
 * the transcribed tables rather than against the map the code read. A ref the
 * rule cannot name, a switch terminal `contacts` does not cover, or a frequency
 * that disagrees with `SELECTORS` fails here.
 */
test("every off-board pad of all five sections labels, and the frequencies match the transcribed tables", () => {
  const expectedPads: Readonly<Record<Owner, number>> = {
    "low-boost": 10, "low-cut": 10, "hi-boost": 21, "hi-cut": 10, mid: 28,
  }
  const transcribed = new Map<string, readonly string[]>([
    ...SELECTORS.map((entry): [string, readonly string[]] => [entry.ref, entry.positions]),
    ["SW_HI_BOOST", HI_BOOST_POSITIONS.map((position) => position.label)],
  ])
  let pads = 0
  for (const owner of OWNERS) {
    const offBoard = ownComponents(owner).filter((component) => OFF_BOARD.has(component.id))
    let ownPads = 0
    for (const component of offBoard) {
      const labels = labelsOf(component)
      ownPads += labels.length
      const functionName = functionNameOf(component.id)
      for (const label of labels) {
        expect(label.startsWith(`${functionName} `), `"${label}" names its part`).toBe(true)
        expect(label.length, `"${label}" says more than the part`)
          .toBeGreaterThan(functionName.length + 1)
      }
      const positions = transcribed.get(component.id)
      if (positions === undefined) continue
      expect(labels.slice(1), `${component.id}'s throws, against the transcribed table`)
        .toEqual(positions.map((position) => `${functionName} ${position}`))
    }
    expect(ownPads, `${owner}'s off-board pad count`).toBe(expectedPads[owner])
    pads += ownPads
  }
  expect(pads, "79 off-board pads across the five sections").toBe(79)
})

test("a switch terminal nothing in its contacts closes onto refuses", () => {
  const rotary = kindOf("low-boost", "SW_LO_BOOST", "switch")
  const uncontacted: Component = {
    ...rotary,
    parameters: { positions: ["20Hz"], contacts: { "20Hz": [["common", "t1"]] } },
  }
  expect(padLabelOf(uncontacted, "2"), "the throw its contacts DO name").toBe("LO BOOST 20Hz")
  const message = messageFrom(() => padLabelOf(uncontacted, "4"))
  expect(message, "names the refusal").toContain("pad-label-unselected-throw")
  expect(message, "names the switch").toContain("SW_LO_BOOST")
  expect(message, "names the terminal").toContain('"t3"')
  expect(message, "names what the contacts do cover").toContain("t1")
  expect(message, "says the pin name is not a label").toContain("NOT labelled with its pin name")
  expect(message, "says where to fix it").toContain("from-netlist.ts")
})

/** The pole is named by the pad order, not by `contacts`, so it labels even on a
 * switch whose contacts are empty - every position closes onto it, which is why
 * no one position names it. */
test("the pole labels without any contacts at all", () => {
  const rotary = kindOf("low-boost", "SW_LO_BOOST", "switch")
  const empty: Component = { ...rotary, parameters: { positions: [], contacts: {} } }
  expect(padLabelOf(empty, "1")).toBe("LO BOOST common")
  expect(() => padLabelOf(empty, "2")).toThrow(/no terminals at all/)
})

/** A real on-board part: a pad for one would carry a ref with no control
 * prefix, and there is no function to print for it. */
test("a ref with no known prefix refuses rather than printing itself", () => {
  const capacitor = kindOf("low-boost", "C18", "capacitor")
  const message = messageFrom(() => padLabelOf(capacitor, "1"))
  expect(message, "names the ref").toContain("C18")
  expect(message, "names the prefixes a name can be read off").toContain("RV_, SW_, L_")
  expect(message, "says the ref is not printed raw").toContain("NOT printed raw")
  expect(message, "says where a prefix is added").toContain("FUNCTION_PREFIXES")
})

test("a function name is the ref with its prefix dropped and underscores as spaces", () => {
  expect(functionNameOf("RV_LO_BOOST")).toBe("LO BOOST")
  expect(functionNameOf("SW_LO_BOOST")).toBe("LO BOOST")
  expect(functionNameOf("RV_HI_Q")).toBe("HI Q")
  expect(functionNameOf("L_MID_2H")).toBe("MID 2H")
  expect(() => functionNameOf("RV_")).toThrow(/pad-label-unprefixed-ref/)
  expect(() => functionNameOf("R_MID_SHUNT")).toThrow(/pad-label-unprefixed-ref/)
})

/** A pin outside the pad order is Task 1's refusal, reached through this one -
 * the label path adds no second reading of a pin number. */
test("a pin outside the component's pad order refuses through terminalNameOf", () => {
  expect(() => padLabelOf(kindOf("low-boost", "RV_LO_BOOST", "potentiometer"), "4"))
    .toThrow(/pad order/)
})
