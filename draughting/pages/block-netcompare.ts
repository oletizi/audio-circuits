/**
 * Compare a kicad-cli netlist export of ONE block sheet of a board against that block's part of the
 * board's model, with `compareSheetToModel` - the same six lists the round-trip tests assert.
 *
 * The model side is the board's model restricted to the components the block's `include()`
 * contributed (`Network.blocks`), under the board's own `DESIGNATORS` and `PIN_NUMBERS`. A net the
 * block shares with other pages (a port: GND, 3V3_D, ...) is therefore compared as its members ON
 * THIS PAGE, which is all one sheet can say; how the pages join is the root's export, checked by
 * `verify-root.sh`.
 *
 * Prints every list; exits 1 when `componentIdentity`, `netMembership`, `pinIdentity` or `values`
 * is non-empty, since each of those says the page is a different circuit from the model.
 *
 * Then the PORT LABELS (`port-labels.ts`): membership alone cannot see two one-pin ports' labels
 * swapped, so each port's net `/<port>` in the export must hold exactly the pins `drawingPages()`
 * gives that port. Exits 1 on any mismatch, naming the port, the pins expected and the pins found.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun block-netcompare.ts <board-dir> <block> <export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { pinNumbersFromTable } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import type { Network } from "../../lib/model/index.ts"
import { blockOf, boardFromArgs } from "./board.ts"
import { checkPortLabels } from "./port-labels.ts"

const usage = "bun block-netcompare.ts <board-dir> <block> <export.net>"
const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
const [block, file] = rest
if (block === undefined || file === undefined) {
  throw new Error(`usage: ${usage} - a block name and an export path are both required`)
}
const module = board.network
const record = blockOf(board, block)
const ids = new Set(record.componentIds)
const network: Network = { components: module.components.filter((c) => ids.has(c.id)), ports: {}, blocks: [] }
if (network.components.length !== ids.size) {
  throw new Error(`block "${block}" names ${ids.size} components and the board's model holds ${network.components.length} of them`)
}
const exported = importNetlist(readFileSync(file, "utf8"))
const result = compareSheetToModel(network, new Map(Object.entries(board.designators)), pinNumbersFromTable(network, board.pinNumbers), exported)
for (const [list, entries] of Object.entries(result)) {
  console.log(`${list}: ${entries.length}`)
  for (const entry of entries) console.log(`   ${entry}`)
}
const nets = Object.keys(exported.nets).length
const members = Object.values(exported.nets).reduce((n, m) => n + m.length, 0)
console.log(`export: ${exported.components.length} components, ${nets} nets, ${members} net members; model block: ${network.components.length} components`)
// A PRIVATE net's name is not connectivity - an unlabelled net gets KiCad's own name - so this is
// reported, never failed on: how many exported nets carry the model's unprefixed name for one of this
// block's nets. A PORT's name is the page's connection to the root, and is failed on below.
const modelNames = new Set<string>()
for (const component of network.components) {
  for (const pinMap of [component.pins, ...component.units.map((u) => u.pins)]) {
    for (const connection of Object.values(pinMap)) {
      if (connection.kind === "net") modelNames.add(connection.net.startsWith(`${block}_`) ? connection.net.slice(block.length + 1) : connection.net)
    }
  }
}
const named = Object.keys(exported.nets).filter((name) => modelNames.has(name.replace(/^\//, "")))
console.log(`net names: ${named.length} of ${nets} exported nets carry a model net name (${named.sort().join(", ")})`)
const faults = result.componentIdentity.length + result.netMembership.length + result.pinIdentity.length + result.values.length
const ports = checkPortLabels(board, block, exported)
console.log(`port labels: ${ports.faults.length} of ${ports.checked} ports on the wrong net`)
for (const fault of ports.faults) console.log(`   ${fault}`)
process.exit(faults === 0 && ports.faults.length === 0 ? 0 : 1)
