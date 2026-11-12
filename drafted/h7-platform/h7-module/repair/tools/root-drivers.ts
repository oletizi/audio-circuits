/**
 * EVERY CROSS-PAGE DRIVER ENTRY, CLEARED BY ITS REAL DRIVER ON THE ASSEMBLED ROOT (ruling
 * CR-MODULE-CROSS-PAGE-DRIVERS; the table is `./cross-page-drivers.ts`). A block page's one-block
 * root put a stand-in on each such net; the real root carries none, so the driving pin itself must be
 * on the net in the root's `kicad-cli` export, together with every pin the model puts on it - in
 * particular the input on the other page that ERC reported undriven.
 *
 * The other half of the ruling's requirement - no `pin_not_driven` on any entry's net - is the root's
 * ERC (`./root_erc.py` fails on any error); this checks the connectivity the ERC result rests on.
 *
 * Fails (exit 1), naming the entry: the driving pin is on no exported net or on several; or its net
 * lacks a pin the model puts on the entry's net. The table is held to the model first.
 *
 * usage: bun root-drivers.ts <root-export.net>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import { importNetlist } from "../../../../../lib/kicad/netlist.ts"
import { checkCrossPageDrivers, crossPageDriverTable } from "./cross-page-drivers.ts"
import { modelPinNets } from "./hierarchy-flags.ts"

const file = process.argv[2]
if (file === undefined) throw new Error("usage: bun root-drivers.ts <root-export.net> - the root's netlist export is required")
const module = h7Module()
const table = crossPageDriverTable()
checkCrossPageDrivers(table, module)
const pinNets = modelPinNets(module)
const exported = importNetlist(readFileSync(file, "utf8"))
const faults: string[] = []
for (const entry of table) {
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
if (faults.length === 0) console.log(`root-drivers.ts: every one of ${table.length} cross-page driver entries is on its net with its real driver`)
process.exit(faults.length === 0 ? 0 : 1)
