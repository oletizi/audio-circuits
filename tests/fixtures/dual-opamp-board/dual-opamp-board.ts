/**
 * THE DUAL OP-AMP TEST BOARD FOR SPEC C6 (multi-unit packages). Test data, not a circuit anyone
 * builds: it exists so a package with more than one unit is lowered, drafted and exported on one
 * small page before the pedal's four duals and its 4-unit buffer depend on it. Its drawn page is
 * never sent to the owner and carries no verdict.
 *
 * One dual op-amp, both sections wired as unity-gain buffers (each section's output on its own
 * inverting input), and its two supply pins. A six-way header carries every net off the board, so
 * that every net has two endpoints - copperhead refuses a net with one.
 *
 * **THE SYMBOL IS `Amplifier_Operational:TL072`**, which extends `LM2904` in the installed
 * `Amplifier_Operational.kicad_sym` and has three units: unit 1 is section A (pin 1 output, pin 2
 * `-`, pin 3 `+`), unit 2 is section B (pin 5 `+`, pin 6 `-`, pin 7 output), unit 3 the supply
 * (pin 4 `V-`, pin 8 `V+`). `DUAL_OPAMP.symbolPins` below is those numbers;
 * `tests/kicad/multi-unit.test.ts` reads the symbol off disk unit by unit and fails if the two
 * disagree.
 *
 * No perfboard.json sits beside this module, for the reason `../two-block-board/two-block-board.ts`
 * gives: `discoverDeclarations` walks the whole repository for that file name. The replay writes a
 * declaration into a scratch directory instead.
 */
import { circuit, net } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { intentFromNetwork, type CopperheadIntent, type DrawingInputs } from "../../../tools/draught/intent-from-network.ts"

/** The dual's part: one MPN, one symbol, and each unit's pins - plus the package's - by number. */
export const DUAL_OPAMP: PartSpec = {
  mpn: "TL072",
  symbol: "Amplifier_Operational:TL072",
  symbolPins: {
    A: { "in+": "3", "in-": "2", out: "1" },
    B: { "in+": "5", "in-": "6", out: "7" },
    package: { "v+": "8", "v-": "4" },
  },
}

const HEADER: PartSpec = { symbol: "Connector_Generic:Conn_01x06" }

export function dualOpampBoard(): Network {
  return circuit()
    .add({
      id: "dual_amp",
      kind: "opamp",
      parameters: {},
      part: DUAL_OPAMP,
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [
        { name: "A", pins: { "in+": net("IN_A"), "in-": net("OUT_A"), out: net("OUT_A") } },
        { name: "B", pins: { "in+": net("IN_B"), "in-": net("OUT_B"), out: net("OUT_B") } },
      ],
    })
    .connector("header", { "1": "IN_A", "2": "OUT_A", "3": "IN_B", "4": "OUT_B", "5": "VCC", "6": "VEE" }, HEADER)
    .done()
}

/**
 * Pin numbers by kind, for the single-unit parts only. The header's pin names are its pin numbers,
 * so it needs no entry; the dual is numbered through `DUAL_OPAMP.symbolPins`, because a per-kind
 * table cannot tell its two sections apart.
 */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {}

export const DESIGNATORS: Readonly<Record<string, string>> = { dual_amp: "U1", header: "J1" }

const DRAWING: DrawingInputs = { group: "dual op-amp", netKinds: { VCC: "power", VEE: "power" } }

/** The copperhead intent `make draw` drafts this board from. */
export function drawingIntent(): CopperheadIntent {
  return intentFromNetwork(dualOpampBoard(), DESIGNATORS, PIN_NUMBERS, DRAWING)
}
