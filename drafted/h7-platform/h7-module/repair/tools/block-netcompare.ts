/**
 * Compare a kicad-cli netlist export of ONE h7-module block sheet against that block's part of the
 * model, with `compareSheetToModel` - the same six lists the round-trip tests assert.
 *
 * The model side is `h7Module()` restricted to the components the block's `include()` contributed
 * (`Network.blocks`), under the module's own `DESIGNATORS` and `PIN_NUMBERS`. A net the block
 * shares with other pages (a port: GND, 3V3_D, ...) is therefore compared as its members ON THIS
 * PAGE, which is all one sheet can say; how the pages join is the root's export, checked when the
 * root exists.
 *
 * Prints every list; exits 1 when `componentIdentity`, `netMembership`, `pinIdentity` or `values`
 * is non-empty, since each of those says the page is a different circuit from the model.
 *
 * Then the PORT LABELS (`port-labels.ts`, ruling CR-MODULE-PORT-LABEL-CHECK): membership alone
 * cannot see two one-pin ports' labels swapped, so each port's net `/<port>` in the export must
 * hold exactly the pins `drawingPages()` gives that port. Exits 1 on any mismatch, naming the
 * port, the pins expected and the pins found.
 *
 * usage: bun block-netcompare.ts <block> <export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { DESIGNATORS, PIN_NUMBERS, h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import { pinNumbersFromTable } from "../../../../../lib/kicad/from-network.ts"
import { importNetlist } from "../../../../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../../../../lib/kicad/sheet-agreement.ts"
import type { Network } from "../../../../../lib/model/index.ts"
import { checkPortLabels } from "./port-labels.ts"

const [block, file] = process.argv.slice(2)
if (block === undefined || file === undefined) {
  throw new Error("usage: bun block-netcompare.ts <block> <export.net> - a block name and an export path are both required")
}
const module = h7Module()
const record = module.blocks.find((b) => b.prefix === block)
if (record === undefined) {
  throw new Error(`h7Module() has no block "${block}"; its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`)
}
const ids = new Set(record.componentIds)
const network: Network = { components: module.components.filter((c) => ids.has(c.id)), ports: {}, blocks: [] }
if (network.components.length !== ids.size) {
  throw new Error(`block "${block}" names ${ids.size} components and the module holds ${network.components.length} of them`)
}
const exported = importNetlist(readFileSync(file, "utf8"))
const result = compareSheetToModel(network, new Map(Object.entries(DESIGNATORS)), pinNumbersFromTable(network, PIN_NUMBERS), exported)
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
const ports = checkPortLabels(block, exported)
console.log(`port labels: ${ports.faults.length} of ${ports.checked} ports on the wrong net`)
for (const fault of ports.faults) console.log(`   ${fault}`)
process.exit(faults === 0 && ports.faults.length === 0 ? 0 : 1)
