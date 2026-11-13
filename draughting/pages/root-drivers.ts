/**
 * EVERY CROSS-PAGE DRIVER ENTRY, CLEARED BY ITS REAL DRIVER ON THE ASSEMBLED ROOT (the board's
 * `cross-page-drivers.ts`; the module's ruling CR-MODULE-CROSS-PAGE-DRIVERS). A block page's
 * one-block root put a stand-in on each such net; the real root carries none, so the driving pin
 * itself must be on the net in the root's `kicad-cli` export, together with every pin the model puts
 * on it - in particular the input on the other page that ERC reported undriven.
 *
 * The other half of the requirement - no `pin_not_driven` on any entry's net - is the root's ERC
 * (`./root_erc.py` fails on any error); this checks the connectivity the ERC result rests on.
 *
 * Fails (exit 1), naming the entry: the driving pin is on no exported net or on several; or its net
 * lacks a pin the model puts on the entry's net. The table is held to the model first.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun root-drivers.ts <board-dir> <root-export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { boardFromArgs } from "./board.ts"
import { checkCrossPageDrivers, crossPageDriverTable } from "./cross-page-drivers.ts"
import { modelPinNets } from "./hierarchy-flags.ts"

const usage = "bun root-drivers.ts <board-dir> <root-export.net>"
const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
const file = rest[0]
if (file === undefined) throw new Error(`usage: ${usage} - the root's netlist export is required`)
const table = await crossPageDriverTable(board)
checkCrossPageDrivers(table, board)
const pinNets = modelPinNets(board)
const exported = importNetlist(readFileSync(file, "utf8"))
const faults: string[] = []
for (const entry of table.entries) {
  const driver = `${entry.designator}.${entry.pin}`
  const nets = Object.entries(exported.nets).filter(([, members]) => members.includes(driver))
  const found = nets[0]
  if (found === undefined || nets.length !== 1) {
    faults.push(`${entry.net}: the driving pin ${driver} (${entry.block}, ${entry.pinName}) is on ${nets.length} exported nets; expected one`)
    continue
  }
  const want = [...pinNets].filter(([, net]) => net === entry.net).map(([pin]) => pin)
  const missing = want.filter((m) => !found[1].includes(m))
  if (want.length === 0) faults.push(`${entry.net}: the model has no net of that name`)
  if (missing.length > 0) faults.push(`${entry.net}: the driving pin ${driver}'s exported net ${found[0]} lacks ${missing.join(", ")}`)
  else console.log(`${entry.net}: driven by ${driver} (${entry.block}, ${entry.pinName}) on exported net ${found[0]}, with all ${want.length} of its model pins`)
}
for (const fault of faults) console.error(`root-drivers.ts: FAIL - ${fault}`)
if (faults.length === 0) console.log(`root-drivers.ts: every one of ${table.entries.length} cross-page driver entries is on its net with its real driver`)
process.exit(faults.length === 0 ? 0 : 1)
