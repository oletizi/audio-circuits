/**
 * THE TWO-BLOCK TEST BOARD FOR DESIGN CHANGE C3 (multi-page drawing). Test data, not a circuit
 * anyone builds: it exists so the per-block drafting, the hierarchical labels and the root
 * assembly fail on two small pages before the H7 module's ten large ones use them. Its drawn
 * pages are never sent to the owner and carry no verdict.
 *
 * Two copies of one block, each a resistor divider with a capacitor on its tap, included as `a`
 * and `b`. They share the `3V3` and `GND` ports and each keeps a PRIVATE `FB` net, which the
 * model names `a_FB` and `b_FB` (`lib/model/include.ts` prefixes every unbound net). Block `b`'s
 * lower resistor differs in value so a swap of the two blocks is visible in the values too.
 *
 * `3V3` reaches ONE pin in each block, so each block page has a port net copperhead cannot draft
 * (it refuses a one-endpoint net) - deliberately, so the case where the hierarchical label goes
 * straight onto a pin is exercised here and not first on the module. `GND` reaches two pins in each
 * block, so the case where copperhead's own label is replaced is exercised too.
 *
 * No perfboard.json sits beside this module: `tools/perfboard/declaration.ts`'s
 * `discoverDeclarations` walks the whole repository for that file name, and a fixture found by
 * the repo-wide walk would be checked as though it were a board. The tests and the replay write a
 * declaration into a scratch directory instead.
 */
import { circuit } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { drawingPagesFromNetwork, type DrawingPage } from "../../../tools/draught/drawing-pages.ts"

const RESISTOR: PartSpec = { symbol: "Device:R" }
const CAPACITOR: PartSpec = { symbol: "Device:C" }

function dividerBlock(lower: string): Network {
  return circuit()
    .resistor("r_top", "10k", { a: "3V3", b: "FB" }, RESISTOR)
    .resistor("r_bot", lower, { a: "FB", b: "GND" }, RESISTOR)
    .capacitor("c_fb", "100nF", { a: "FB", b: "GND" }, CAPACITOR)
    .port("3V3", "3V3")
    .port("GND", "GND")
    .done()
}

export function twoBlockBoard(): Network {
  return circuit()
    .include("a", dividerBlock("10k"), { "3V3": "3V3", GND: "GND" })
    .include("b", dividerBlock("22k"), { "3V3": "3V3", GND: "GND" })
    .done()
}

/** Pin numbers by kind: both kinds here are two-terminal and numbered 1, 2 on `Device:R`/`Device:C`. */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
}

/** Component id -> reference designator, board-wide: one numbering across both pages. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  a_r_top: "R1", a_r_bot: "R2", a_c_fb: "C1",
  b_r_top: "R3", b_r_bot: "R4", b_c_fb: "C2",
}

/** The caption copperhead draws around each block's page, by block prefix. */
export const PAGE_GROUPS: Readonly<Record<string, string>> = { a: "divider a", b: "divider b" }

/** One page per block (design change C3). */
export function drawingPages(): readonly DrawingPage[] {
  return drawingPagesFromNetwork(twoBlockBoard(), DESIGNATORS, PIN_NUMBERS, PAGE_GROUPS)
}
