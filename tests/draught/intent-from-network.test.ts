import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { circuit } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import { intentFromNetwork, type DrawingInputs } from "../../tools/draught/intent-from-network.ts"
import { verifyIntentAgainstModel } from "../../tools/draught/draw-draft.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import * as buffered from "../../circuits/transistor-preamp/buffered-board.ts"
import * as feedback from "../../circuits/transistor-preamp/feedback-board.ts"
import * as lab from "../../circuits/transistor-preamp/lab-board.ts"
import * as loop from "../../circuits/transistor-preamp/loop-board.ts"
import * as staged from "../../circuits/transistor-preamp/staged-board.ts"
import { PIN_NUMBERS, RESISTOR } from "../../circuits/transistor-preamp/parts.ts"

const INPUTS: DrawingInputs = { group: "Board", netKinds: { GND: "ground", VCC: "power" } }

function divider(): Network {
  return circuit()
    .resistor("upper", "10k", { a: "VCC", b: "MID" }, RESISTOR)
    .resistor("lower", "4.7k", { a: "MID", b: "GND" }, RESISTOR)
    .port("vcc", "VCC")
    .port("ground", "GND")
    .done()
}

test("a two-resistor divider lowers to refs, symbols, values, numbered pins and kinds", () => {
  const intent = intentFromNetwork(divider(), { upper: "R1", lower: "R2" }, PIN_NUMBERS, INPUTS)
  expect(intent.version).toBe(1)
  expect(intent.parts).toEqual([
    { ref: "R1", libId: "Device:R", value: "10K", group: "Board" },
    { ref: "R2", libId: "Device:R", value: "4.7K", group: "Board" },
  ])
  expect(intent.nets).toEqual([
    { name: "GND", kind: "ground", pins: ["R2.2"] },
    { name: "MID", pins: ["R1.2", "R2.1"] },
    { name: "VCC", kind: "power", pins: ["R1.1"] },
  ])
  expect(intent.noConnect).toEqual([])
  expect(intent.hints).toEqual({ groupOrder: ["Board"] })
})

test("a component with no designator refuses, naming the component and DESIGNATORS", () => {
  expect(() => intentFromNetwork(divider(), { upper: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/"lower".*DESIGNATORS/)
})

test("a component with no KiCad symbol refuses, naming the component and part.symbol", () => {
  const network = circuit().resistor("bare", "1k", { a: "A", b: "B" }).port("a", "A").port("b", "B").done()
  expect(() => intentFromNetwork(network, { bare: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/"bare".*part\.symbol/)
})

test("two components sharing a designator refuse", () => {
  expect(() => intentFromNetwork(divider(), { upper: "R1", lower: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/R1/)
})

test("a net kind declared for a net the circuit does not have refuses", () => {
  const inputs: DrawingInputs = { group: "Board", netKinds: { GND: "ground", VDD: "power" } }
  expect(() => intentFromNetwork(divider(), { upper: "R1", lower: "R2" }, PIN_NUMBERS, inputs)).toThrow(/VDD/)
})

// THE FIVE PREAMP BOARDS, against the netlists their own perfboard.json files commit. This
// is what makes the module a claim about real circuits and not only about a divider.
const BOARDS: readonly (readonly [string, Network, Readonly<Record<string, string>>])[] = [
  ["transistor-preamp-lab", lab.transistorPreampLab(), lab.DESIGNATORS],
  ["transistor-preamp-feedback", feedback.transistorPreampFeedback(), feedback.DESIGNATORS],
  ["transistor-preamp-buffered", buffered.transistorPreampBuffered(), buffered.DESIGNATORS],
  ["transistor-preamp-loop", loop.transistorPreampLoop(), loop.DESIGNATORS],
  ["transistor-preamp-staged", staged.transistorPreampStaged(), staged.DESIGNATORS],
]

for (const [board, network, designators] of BOARDS) {
  test(`${board}: the generated intent's net partition is the committed netlist's`, () => {
    const intent = intentFromNetwork(network, designators, PIN_NUMBERS, INPUTS)
    const netlist = fs.readFileSync(path.join(moduleRepoRoot(), "tests/fixtures", `${board}.net`), "utf8")
    const agreement = verifyIntentAgainstModel(intent, netlist)
    expect(agreement.agrees ? [] : agreement.disagreements).toEqual([])
  })
}
