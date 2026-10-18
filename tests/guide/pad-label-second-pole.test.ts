/**
 * G41: a multi-pole rotary's second pole, named anything other than the one
 * spelling `rotaryPadOrder` puts first - `common` - must refuse rather than
 * be labelled with whatever position its contacts happen to land on last.
 *
 * **NO COMMITTED BOARD HAS THIS PART.** `symbolFor` (`circuits/pultec/physical
 * /parts.ts:281-294`) only CONTEMPLATES "one common per pole"; nothing on the
 * five adopted sections carries one. So the fixture here is hand-built: a
 * second pole pin, `pole2`, that - like the real pole does for every real
 * throw - closes onto a DIFFERENT throw at every detent. Before this fix,
 * `positionsByPin` (`lib/board/part-text.ts`) folded that into whichever
 * position was written to it last, a last-write-wins accident, and
 * `padLabelOf` printed that accident as if it were the frequency the pad
 * selects - a frequency printed against a pole, wrong in the quiet way.
 *
 * The fixture reuses the real `SW_LO_BOOST` component (so the ref prefix and
 * function name are not invented either) and only overrides its `units` and
 * `parameters`.
 */
import { test, expect } from "bun:test"
import type { Component } from "../../lib/model/types.ts"
import { net } from "../../lib/model/types.ts"
import { ownComponents } from "../../circuits/pultec/physical/parts.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"

function messageFrom(call: () => string): string {
  try {
    const label = call()
    throw new Error(`expected a refusal, got the label "${label}"`)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function twoPoleFixture(): Component {
  const rotary = ownComponents("low-boost").find((component) => component.id === "SW_LO_BOOST")
  if (rotary === undefined) throw new Error('fixture: "SW_LO_BOOST" has moved')
  return {
    ...rotary,
    units: [
      {
        name: "MAIN",
        pins: {
          common: net("pole1_node"),
          pole2: net("pole2_node"),
          t1: net("t1_node"),
          t2: net("t2_node"),
        },
      },
    ],
    parameters: {
      positions: ["20Hz", "30Hz"],
      contacts: {
        "20Hz": [["common", "t1"], ["pole2", "t1"]],
        "30Hz": [["common", "t2"], ["pole2", "t2"]],
      },
    },
  }
}

test("the first pole still labels as the pole, unaffected by a second one existing", () => {
  expect(padLabelOf(twoPoleFixture(), "1")).toBe("LO BOOST common")
})

test("a real throw still labels correctly even though a second pole is present", () => {
  // pad order: ["common", "pole2", "t1", "t2"] - pad "3" is "t1", closing only at "20Hz".
  expect(padLabelOf(twoPoleFixture(), "3")).toBe("LO BOOST 20Hz")
})

test("a second pole pin not spelled \"common\" refuses rather than printing a frequency", () => {
  // pad order: ["common", "pole2", "t1", "t2"] - pad "2" is "pole2".
  const message = messageFrom(() => padLabelOf(twoPoleFixture(), "2"))
  expect(message, "names the refusal").toContain("pad-label-unselected-throw")
  expect(message, "names the switch").toContain("SW_LO_BOOST")
  expect(message, "names the terminal").toContain('"pole2"')
  expect(message, "says it is not the pole").toContain("neither its pole")
  expect(message, "says it is not a single position").toContain("nor a single position")
  expect(message, "shows both positions it ambiguously closes onto").toContain("20Hz")
  expect(message, "shows both positions it ambiguously closes onto").toContain("30Hz")
})
