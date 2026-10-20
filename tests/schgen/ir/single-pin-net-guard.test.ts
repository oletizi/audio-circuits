import { test, expect } from "bun:test"
import type { Circuit } from "../../../lib/schgen/ir/types.ts"
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts"
import { fixtureResolver } from "../__fixtures__/fixture-lib.ts"

/**
 * Hand-written, not ported: a durable, re-runnable home for Task 2 Step 6's
 * guard perturbation (`docs/known-gaps.md` **G112**), after the review
 * (round 2, Important finding 2) correctly rejected citing a perturbation's
 * command and output under `.superpowers/` - gitignored, destroyed by
 * `git clean -fdx`, and not something a later reader can re-derive.
 *
 * This asserts the baseline: `singlePinNets` (`lib/schgen/ir/validate-nets.ts`)
 * is the rule inside `validateCircuit` that reports a single-pin net, by
 * name, for both of this fixture's single-pin nets. To re-run the
 * perturbation itself: edit `singlePinNets` to `return [];`, run
 * `bun test tests/schgen/ir/single-pin-net-guard.test.ts`, confirm it fails
 * naming exactly these two messages missing, then restore the file and
 * confirm it passes again.
 *
 * Builds a `Circuit` directly rather than through `buildCircuit`, which is
 * what keeps this test about `singlePinNets` and nothing else.
 *
 * **It used a hand-built three-field `LibSymbol` stub until Task 4**, because
 * `createResolver` threw until the real `render/library.ts` was ported
 * (`docs/known-gaps.md` G113). The real `LibSymbol` carries ten fields, so the
 * stub stopped typechecking when the port landed, and it is replaced by the
 * real `fixtureResolver()` rather than widened: `Fix:R` is a one-unit,
 * non-power symbol with exactly pins "1" and "2", which is what this
 * fixture's `R_A` declares, and `rails` is empty so nothing reads `isPower`.
 */

// One resistor (R_A) on two nets, LONELY (pin 1) and GND (pin 2), each with
// no other pin - deliberately, so the guard must name both.
const circuit: Circuit = {
  parts: new Map([
    [
      "R_A",
      {
        label: "R_A", refPrefix: "R", libId: "Fix:R", units: [1], value: "1k", footprint: "F",
        bom: { Manufacturer: "M", MPN: "P", Supplier: "S", SupplierPart: "SP", AbsMaxV: null },
        dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlistedReason: null, order: 0,
      },
    ],
  ]),
  pins: [
    { part: "R_A", pin: "1", unit: 1, identity: "", net: "LONELY", origin: "circuit" },
    { part: "R_A", pin: "2", unit: 1, identity: "", net: "GND", origin: "circuit" },
  ],
  nets: new Map([
    ["LONELY", [{ part: "R_A", pin: "1" }]],
    ["GND", [{ part: "R_A", pin: "2" }]],
  ]),
  blocks: new Map([
    [
      "B",
      { id: "B", sheet: "s", title: "B", members: [{ part: "R_A", unit: 1 }], checklist: [], rendering: { kind: "bus", groups: [] }, order: 0 },
    ],
  ]),
  sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
  rails: new Map(),
  unitBlock: new Map([["R_A#1", "B"]]),
  offSheet: new Set(),
}

test("singlePinNets names every single-pin net in the circuit it validates", () => {
  const problems = validateCircuit(circuit, fixtureResolver())
  expect(problems).toContain("net LONELY has only one pin (R_A.1); connect it or declare the pin not connected")
  expect(problems).toContain("net GND has only one pin (R_A.2); connect it or declare the pin not connected")
})
