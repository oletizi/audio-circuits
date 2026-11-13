/**
 * FAIL WHEN A BLOCK PAGE CARRIES A PWR_FLAG ON A SHARED NET WHOSE FLAG LIVES ELSEWHERE (the board's
 * `pwr-flag-homes.ts`, under the ruling it names; the module's is CR-MODULE-PWR-FLAGS). Each board net
 * carries at most one PWR_FLAG across the hierarchy; a second one, on any sheet, is an ERC
 * `pin_to_pin` error at the assembled root.
 *
 * Input: the `kicad-cli` netlist export of `./flag_probe.py`'s probe copy, in which every placed
 * PWR_FLAG is a component `FLGPROBE<n>` with pin 1 on the net it sits on. The net comes from that
 * export, never from the sheet's text. A flag's net is SHARED when its exported name (less the
 * leading "/") is one of the block's ports, which the block page draws as hierarchical labels; the
 * board net is then the port's binding. Any other net is private to the page and passes.
 *
 * Fails (exit 1), naming the net, when a shared net's declared flag is on another page or the
 * root, or when a shared net has no declared home at all (add it to the table, with its reason).
 * Fails too when the export does not list exactly <expected> probe flags, so a flag the export
 * dropped cannot pass unseen.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun flag-check.ts <board-dir> <block> <probe-export.net> <expected-flag-count>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { boardFromArgs } from "./board.ts"
import { flagHomes } from "./flag-homes.ts"

const usage = "bun flag-check.ts <board-dir> <block> <probe-export.net> <expected-flag-count>"
const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
const [block, file, expectedText] = rest
if (block === undefined || file === undefined || expectedText === undefined) {
  throw new Error(`usage: ${usage} - all four are required`)
}
const expected = Number(expectedText)
if (!Number.isInteger(expected) || expected < 0) {
  throw new Error(`flag-check.ts: expected-flag-count must be a whole number; got "${expectedText}"`)
}
const homes = await flagHomes(board)
const record = board.network.blocks.find((b) => b.prefix === block)
if (record === undefined) {
  throw new Error(`${board.modelName} has no block "${block}"`)
}
const ports: Readonly<Record<string, string>> = record.ports
const exported = importNetlist(readFileSync(file, "utf8"))
const probes = exported.components.map((c) => c.designator).filter((d) => d.startsWith("FLGPROBE")).sort()
const failures: string[] = []
if (probes.length !== expected) {
  failures.push(`the probe export lists ${probes.length} PWR_FLAG(s) and the sheet holds ${expected}; a flag was not exported, so its net is unknown`)
}
for (const probe of probes) {
  const nets = Object.entries(exported.nets).filter(([, members]) => members.includes(`${probe}.1`)).map(([name]) => name)
  if (nets.length !== 1) {
    failures.push(`PWR_FLAG ${probe} is on ${nets.length} nets in the export; expected exactly one`)
    continue
  }
  const exportedName = nets[0] ?? ""
  const port = exportedName.replace(/^\//, "")
  const boardNet = ports[port]
  if (boardNet === undefined) {
    console.log(`PWR_FLAG ${probe}: net ${exportedName}, private to ${block} - allowed`)
    continue
  }
  const home = homes.shared[boardNet]
  if (home === undefined) {
    failures.push(`${block} carries a PWR_FLAG on shared net ${boardNet}, which has no declared flag home; declare it in pwr-flag-homes.ts with its reason (ruling ${homes.ruling})`)
  } else if (home !== block) {
    failures.push(`${block} carries a PWR_FLAG on shared net ${boardNet}, whose single flag lives on ${home} (pwr-flag-homes.ts, ruling ${homes.ruling})`)
  } else {
    console.log(`PWR_FLAG ${probe}: shared net ${boardNet}, whose declared flag home is this page - allowed`)
  }
}
for (const failure of failures) console.error(`flag-check.ts: FAIL - ${failure}`)
process.exit(failures.length === 0 ? 0 : 1)
