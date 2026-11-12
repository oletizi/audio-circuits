/**
 * Compare the kicad-cli netlist export of the h7-module ROOT - every sheet, joined - against the
 * WHOLE module model with `compareSheetToModel`, under the module's `DESIGNATORS` and `PIN_NUMBERS`.
 * The same comparison `registerDraftedProjectTests` makes in `bun test`; this is its form for
 * `verify-root.sh`, so a scratch copy of the project (a control) can be judged by one command.
 *
 * Prints every list; exits 1 when `componentIdentity`, `netMembership`, `pinIdentity` or `values` is
 * non-empty, or when the export does not hold exactly the model's components.
 *
 * usage: bun root-netcompare.ts <root-export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { DESIGNATORS, PIN_NUMBERS, h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import { pinNumbersFromTable } from "../../../../../lib/kicad/from-network.ts"
import { importNetlist } from "../../../../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../../../../lib/kicad/sheet-agreement.ts"

const file = process.argv[2]
if (file === undefined) throw new Error("usage: bun root-netcompare.ts <root-export.net> - the root's netlist export is required")
const module = h7Module()
const exported = importNetlist(readFileSync(file, "utf8"))
const result = compareSheetToModel(module, new Map(Object.entries(DESIGNATORS)), pinNumbersFromTable(module, PIN_NUMBERS), exported)
for (const [list, entries] of Object.entries(result)) {
  console.log(`${list}: ${entries.length}`)
  for (const entry of entries) console.log(`   ${entry}`)
}
const nets = Object.keys(exported.nets).length
const members = Object.values(exported.nets).reduce((n, m) => n + m.length, 0)
const refs = exported.components.map((c) => c.designator).sort()
const want = module.components.map((c) => DESIGNATORS[c.id] ?? `<no designator for ${c.id}>`).sort()
console.log(`export: ${exported.components.length} components, ${nets} nets, ${members} net members; model: ${module.components.length} components`)
const sameParts = refs.length === want.length && refs.every((r, i) => r === want[i])
if (!sameParts) console.log(`components: the export's designators differ from the model's (${refs.length} against ${want.length})`)
const faults = result.componentIdentity.length + result.netMembership.length + result.pinIdentity.length + result.values.length
process.exit(faults === 0 && sameParts ? 0 : 1)
