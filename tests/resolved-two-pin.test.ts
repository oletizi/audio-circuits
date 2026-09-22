import { test, expect } from "bun:test"
import { twoPinElements } from "../lib/model/resolved-two-pin.ts"
import type { ResolvedNetwork } from "../lib/model/control-state.ts"

test("rejects a component that has a package pin: a two-terminal passive has none", () => {
  // Regression coverage: the old `requireTwoPin` (pre-Task-3) counted MERGED
  // package-plus-unit pins, so a stray package pin on a passive was caught. The
  // generalised `resolveNetwork` no longer merges package pins into the unit, and this
  // narrowing used to read only `units[0].pins`, silently ignoring `component.pins`
  // entirely - the net a package pin named would vanish from an emitted SPICE deck
  // with no error and no trace. This asserts the narrowing refuses instead.
  const network: ResolvedNetwork = {
    ports: { input: "in", output: "out" },
    components: [{
      id: "R1", kind: "resistor", parameters: { ohms: 1000 },
      pins: { shield: "CHASSIS" },
      units: [{ name: "MAIN", pins: { a: "in", b: "out" } }],
    }],
  }
  expect(() => twoPinElements(network)).toThrow(/has package pin shield.*R1/)
})

test("rejects a component that does not have exactly one unit", () => {
  const network: ResolvedNetwork = {
    ports: {},
    components: [{
      id: "amp", kind: "opamp", parameters: {}, pins: {},
      units: [
        { name: "A", pins: { a: "x", b: "y" } },
        { name: "B", pins: { a: "p", b: "q" } },
      ],
    }],
  }
  expect(() => twoPinElements(network)).toThrow(/exactly one unit.*amp/)
})

test("rejects a component whose unit does not have exactly two pins keyed a and b", () => {
  // Re-lands, against this module, the pre-existing coverage that the old
  // `resolveNetwork`'s `requireTwoPin` used to provide directly (removed when
  // `resolveNetwork` stopped policing a two-pin shape). This is now the sole guard on
  // that path: `resolveNetwork` never calls `validate.ts`'s `validateNetwork`.
  const network: ResolvedNetwork = {
    ports: {},
    components: [{
      id: "R9", kind: "resistor", parameters: { ohms: 1000 }, pins: {},
      units: [{ name: "MAIN", pins: { a: "in", b: "mid", c: "out" } }],
    }],
  }
  expect(() => twoPinElements(network)).toThrow(/exactly two pins keyed a and b.*R9/)
})
