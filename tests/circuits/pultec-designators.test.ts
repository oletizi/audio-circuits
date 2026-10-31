import { expect, test } from "bun:test"
import { pultecDesignator } from "../../circuits/pultec/designators.ts"

test("an id upper-cases with dots and hyphens becoming underscores", () => {
  expect(pultecDesignator("c_hi_boost")).toBe("C_HI_BOOST")
  expect(pultecDesignator("SI_HI_CUT_RV_HI_CUT.ccw-wiper")).toBe("SI_HI_CUT_RV_HI_CUT_CCW_WIPER")
})

test("the two junction rows keep the names that say what they are", () => {
  expect(pultecDesignator("junction_signals")).toBe("J_SIGNALS")
  expect(pultecDesignator("junction_grounds")).toBe("J_GROUNDS")
})

// A positive control for the two tests above: a designator this transformation cannot produce
// still throws, naming the id and the offending result, rather than silently returning something
// the IR's partShapes rule would refuse. "2x_bad" upper-cases to "2X_BAD", which starts with a
// digit and so does not match DESIGNATOR (`^[A-Z][A-Z0-9_]*$`).
test("an id whose upper-cased form is not a valid KiCad designator throws, naming both", () => {
  expect(() => pultecDesignator("2x_bad")).toThrow(/"2x_bad"/)
  expect(() => pultecDesignator("2x_bad")).toThrow(/"2X_BAD"/)
})
