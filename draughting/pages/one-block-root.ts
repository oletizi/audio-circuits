/**
 * A ROOT HOLDING ONE BLOCK SHEET of a board, for running ERC on that block in the context it will
 * have in the assembled project. Run on its own, a block sheet's hierarchical labels have no parent
 * sheet, and `kicad-cli sch erc` reports each one as `pin_not_connected` ("cannot be connected to
 * non-existent parent sheet") - an error no repair of the block can remove. Under this root each
 * label meets a sheet pin, as it will under the board's real root.
 *
 * It is `tools/draught/assemble-root.ts` (the same blank text and the same op-list writer) given a
 * network with only this block's `include()` record, so the sheet pins, stubs and parent-net labels
 * are the ones the real root will draw for this block. Scratch: what it writes is never committed.
 *
 * PWR_FLAGS (the board's `pwr-flag-homes.ts`; the module's ruling CR-MODULE-PWR-FLAGS). A net's
 * single flag lives where that table declares it. When that is NOT this block's page - on the root,
 * or on another block - this root places one PWR_FLAG on the net's stub, at its label, standing in for
 * the flag the assembled board carries elsewhere. So a block page with a power input on GND passes
 * its ERC here without a GND flag of its own, and the page which holds GND's flag gets no second one
 * on its stub.
 *
 * CROSS-PAGE DRIVERS (the board's `cross-page-drivers.ts`; the module's ruling
 * CR-MODULE-CROSS-PAGE-DRIVERS). A signal net whose driver is a pin on another page, declared in that
 * table and checked against the model (`./cross-page-drivers.ts`), gets a stand-in driver on its stub
 * when this block is not the driving block: one `Connector:TestPoint` (a single passive pin, which
 * KiCad's ERC counts as driving an input; the ruling has the measurement), at the stub's label,
 * referenced `#DRV<n>`. Not a PWR_FLAG: these are not power nets. The board's real root must clear
 * each such net with its real driver.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun one-block-root.ts <board-dir> <block> <out-dir>
 *   writes <out-dir>/one-block-root.kicad_sch (the blank root) and <out-dir>/one-block-root.json (its op-list)
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Network } from "../../lib/model/index.ts"
import { blankRootSheet, rootSheetOps } from "../../tools/draught/assemble-root.ts"
import type { AkcliOp } from "../../tools/draught/akcli-ops.ts"
import { blockOf, boardFromArgs } from "./board.ts"
import { checkCrossPageDrivers, crossPageDriverTable, STAND_IN_LIB_ID, standInsFor } from "./cross-page-drivers.ts"
import { flagHomes, flagLivesElsewhere } from "./flag-homes.ts"

const usage = "bun one-block-root.ts <board-dir> <block> <out-dir>"
const { board: loaded, rest } = await boardFromArgs(process.argv.slice(2), usage)
const [block, outDir] = rest
if (block === undefined || outDir === undefined) {
  throw new Error(`usage: ${usage} - a block name and an output directory are both required`)
}
const record = blockOf(loaded, block)
const homes = await flagHomes(loaded)
const network: Network = { components: [], ports: {}, blocks: [record] }
const board = "one-block-root"
const base = rootSheetOps(network, board)
const flagged = new Set(Object.values(record.ports).filter((net) => flagLivesElsewhere(homes, net, block)))
const flags: AkcliOp[] = []
for (const op of base.ops) {
  if (op.op !== "add_net_label" || typeof op.name !== "string" || !flagged.has(op.name)) continue
  flags.push({ op: "place_pwr_flag", at: op.at, rotation: 0 })
}
if (flags.length !== flagged.size) {
  throw new Error(`one-block root for "${block}": ${flagged.size} net(s) need a stub PWR_FLAG (${[...flagged].sort().join(", ")}) and ${flags.length} stub label(s) carry their names; assemble-root.ts no longer writes one label per port`)
}
// The cross-page driver table is held to the model on every run, then a stand-in driver goes on the
// stub of each net this block reaches whose driver is on another page.
const table = await crossPageDriverTable(loaded)
checkCrossPageDrivers(table, loaded)
const driven = standInsFor(table, block, record.ports)
const standIns: AkcliOp[] = []
for (const entry of driven) {
  const labels = base.ops.filter((op) => op.op === "add_net_label" && op.name === entry.net)
  const at = labels[0]?.at
  if (labels.length !== 1 || !Array.isArray(at) || typeof at[0] !== "number" || typeof at[1] !== "number") {
    throw new Error(`one-block root for "${block}": ${entry.net} needs a stand-in driver and ${labels.length} stub label(s) carry its name with a point; assemble-root.ts no longer writes one label per port`)
  }
  standIns.push({ op: "place_component", lib_id: STAND_IN_LIB_ID, designator: `#DRV${standIns.length + 1}`, x_mil: at[0], y_mil: at[1], rotation: 0 })
}
writeFileSync(join(outDir, `${board}.kicad_sch`), blankRootSheet(board))
writeFileSync(join(outDir, `${board}.json`), JSON.stringify({ ...base, ops: [...base.ops, ...flags, ...standIns] }, null, 1) + "\n")
const driverText = driven.map((e) => `${e.net} (for ${e.block} ${e.designator} ${e.pinName})`).join(", ") || "none"
console.log(`${board}: one sheet "${block}" with pins ${Object.keys(record.ports).sort().join(", ")}; stub PWR_FLAGs on ${[...flagged].sort().join(", ") || "none"}; stand-in drivers on ${driverText}`)
