/**
 * Compare a kicad-cli netlist export of a sheet against the h7 bring-up carrier's model with
 * `compareSheetToModel` - the same six lists `tests/circuits/drafted-sheet.ts`'s guards and the
 * round-trip test assert. Prints every list; exits 1 when `componentIdentity`, `netMembership` or
 * `pinIdentity` is non-empty, since each of those says the page is a different circuit.
 *
 * usage: bun netcompare.ts <export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { importNetlist } from "../../../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../../../lib/kicad/sheet-agreement.ts"
import { modelForSheet } from "../../../../tests/circuits/sheet-model.ts"

const file = process.argv[2]
if (file === undefined) throw new Error("usage: bun netcompare.ts <export.net> - no export path given")
const exported = importNetlist(readFileSync(file, "utf8"))
const model = modelForSheet("h7-carrier")
const result = compareSheetToModel(model.network, model.designators, model.pinNumbers, exported)
for (const [list, entries] of Object.entries(result)) {
  console.log(`${list}: ${entries.length}`)
  for (const entry of entries) console.log(`   ${entry}`)
}
const nets = Object.keys(exported.nets).length
const pins = Object.values(exported.nets).reduce((n, members) => n + members.length, 0)
console.log(`export: ${exported.components.length} components, ${nets} nets, ${pins} net members`)
// Net NAMES are not connectivity - a page with no label on a net gets KiCad's own name for it -
// so this is reported, never failed on: how many exported nets carry the model's name for them.
const modelNames = new Set<string>()
for (const component of model.network.components) {
  const all = [component.pins, ...component.units.map((u) => u.pins)]
  for (const pinMap of all) {
    for (const connection of Object.values(pinMap)) {
      if (connection.kind === "net") modelNames.add(connection.net)
    }
  }
}
const named = Object.keys(exported.nets).filter((name) => modelNames.has(name.replace(/^\//, "")))
console.log(`net names: ${named.length} of ${nets} exported nets carry a model net name`)
const faults = result.componentIdentity.length + result.netMembership.length + result.pinIdentity.length
process.exit(faults === 0 ? 0 : 1)
