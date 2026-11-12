/**
 * A ROOT HOLDING ONE h7-module BLOCK SHEET, for running ERC on that block in the context it will
 * have in the assembled project. Run on its own, a block sheet's hierarchical labels have no parent
 * sheet, and `kicad-cli sch erc` reports each one as `pin_not_connected` ("cannot be connected to
 * non-existent parent sheet") - an error no repair of the block can remove. Under this root each
 * label meets a sheet pin, as it will under the module's real root.
 *
 * It is `tools/draught/assemble-root.ts` (the same blank text and the same op-list writer) given a
 * network with only this block's `include()` record, so the sheet pins, stubs and parent-net labels
 * are the ones the real root will draw for this block. Scratch: what it writes is never committed.
 *
 * PWR_FLAGS (ruling CR-MODULE-PWR-FLAGS). A net's single flag lives where `./pwr-flag-homes.ts`
 * declares it. When that is NOT this block's page - on the root, or on another block - this root
 * places one PWR_FLAG on the net's stub, at its label, standing in for the flag the assembled module
 * carries elsewhere. So a block page with a power input on GND passes its ERC here without a GND
 * flag of its own, and the power page, which holds GND's flag, gets no second one on its stub.
 *
 * usage: bun one-block-root.ts <block> <out-dir>
 *   writes <out-dir>/one-block-root.kicad_sch (the blank root) and <out-dir>/one-block-root.json (its op-list)
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import type { Network } from "../../../../../lib/model/index.ts"
import { blankRootSheet, rootSheetOps } from "../../../../../tools/draught/assemble-root.ts"
import type { AkcliOp } from "../../../../../tools/draught/akcli-ops.ts"
import { flagLivesElsewhere } from "./pwr-flag-homes.ts"

const [block, outDir] = process.argv.slice(2)
if (block === undefined || outDir === undefined) {
  throw new Error("usage: bun one-block-root.ts <block> <out-dir> - a block name and an output directory are both required")
}
const module = h7Module()
const record = module.blocks.find((b) => b.prefix === block)
if (record === undefined) {
  throw new Error(`h7Module() has no block "${block}"; its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`)
}
const network: Network = { components: [], ports: {}, blocks: [record] }
const board = "one-block-root"
const base = rootSheetOps(network, board)
const flagged = new Set(Object.values(record.ports).filter((net) => flagLivesElsewhere(net, block)))
const flags: AkcliOp[] = []
for (const op of base.ops) {
  if (op.op !== "add_net_label" || typeof op.name !== "string" || !flagged.has(op.name)) continue
  flags.push({ op: "place_pwr_flag", at: op.at, rotation: 0 })
}
if (flags.length !== flagged.size) {
  throw new Error(`one-block root for "${block}": ${flagged.size} net(s) need a stub PWR_FLAG (${[...flagged].sort().join(", ")}) and ${flags.length} stub label(s) carry their names; assemble-root.ts no longer writes one label per port`)
}
writeFileSync(join(outDir, `${board}.kicad_sch`), blankRootSheet(board))
writeFileSync(join(outDir, `${board}.json`), JSON.stringify({ ...base, ops: [...base.ops, ...flags] }, null, 1) + "\n")
console.log(`${board}: one sheet "${block}" with pins ${Object.keys(record.ports).sort().join(", ")}; stub PWR_FLAGs on ${[...flagged].sort().join(", ") || "none"}`)
