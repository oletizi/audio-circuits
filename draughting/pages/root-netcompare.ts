/**
 * Compare the kicad-cli netlist export of a board's ROOT - every sheet, joined - against the board's
 * WHOLE model with `compareSheetToModel`, under the board's `DESIGNATORS` and `PIN_NUMBERS`. The same
 * comparison `registerDraftedProjectTests` makes in `bun test`; this is its form for `verify-root.sh`,
 * so a scratch copy of the project (a control) can be judged by one command.
 *
 * Prints every list; exits 1 when `componentIdentity`, `netMembership`, `pinIdentity` or `values` is
 * non-empty, or when the export does not hold exactly the model's components.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun root-netcompare.ts <board-dir> <root-export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { pinNumbersFromTable } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { boardFromArgs } from "./board.ts"

const usage = "bun root-netcompare.ts <board-dir> <root-export.net>"
const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
const file = rest[0]
if (file === undefined) throw new Error(`usage: ${usage} - the root's netlist export is required`)
const module = board.network
const exported = importNetlist(readFileSync(file, "utf8"))
const result = compareSheetToModel(module, new Map(Object.entries(board.designators)), pinNumbersFromTable(module, board.pinNumbers), exported)
for (const [list, entries] of Object.entries(result)) {
  console.log(`${list}: ${entries.length}`)
  for (const entry of entries) console.log(`   ${entry}`)
}
const nets = Object.keys(exported.nets).length
const members = Object.values(exported.nets).reduce((n, m) => n + m.length, 0)
const refs = exported.components.map((c) => c.designator).sort()
const want = module.components.map((c) => board.designators[c.id] ?? `<no designator for ${c.id}>`).sort()
console.log(`export: ${exported.components.length} components, ${nets} nets, ${members} net members; model: ${module.components.length} components`)
const sameParts = refs.length === want.length && refs.every((r, i) => r === want[i])
if (!sameParts) console.log(`components: the export's designators differ from the model's (${refs.length} against ${want.length})`)
const faults = result.componentIdentity.length + result.netMembership.length + result.pinIdentity.length + result.values.length
process.exit(faults === 0 && sameParts ? 0 : 1)
