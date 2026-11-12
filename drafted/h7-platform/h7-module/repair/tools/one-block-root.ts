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
 * usage: bun one-block-root.ts <block> <out-dir>
 *   writes <out-dir>/one-block-root.kicad_sch (the blank root) and <out-dir>/one-block-root.json (its op-list)
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import type { Network } from "../../../../../lib/model/index.ts"
import { blankRootSheet, rootSheetOps } from "../../../../../tools/draught/assemble-root.ts"

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
writeFileSync(join(outDir, `${board}.kicad_sch`), blankRootSheet(board))
writeFileSync(join(outDir, `${board}.json`), JSON.stringify(rootSheetOps(network, board), null, 1) + "\n")
console.log(`${board}: one sheet "${block}" with pins ${Object.keys(record.ports).sort().join(", ")}`)
