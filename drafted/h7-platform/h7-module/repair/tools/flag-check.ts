/**
 * FAIL WHEN A BLOCK PAGE CARRIES A PWR_FLAG ON A SHARED NET WHOSE FLAG LIVES ELSEWHERE (ruling
 * CR-MODULE-PWR-FLAGS; the table is `./pwr-flag-homes.ts`). Each module net carries at most one
 * PWR_FLAG across the hierarchy; a second one, on any sheet, is an ERC `pin_to_pin` error at the
 * assembled root.
 *
 * Input: the `kicad-cli` netlist export of `./flag_probe.py`'s probe copy, in which every placed
 * PWR_FLAG is a component `FLGPROBE<n>` with pin 1 on the net it sits on. The net comes from that
 * export, never from the sheet's text. A flag's net is SHARED when its exported name (less the
 * leading "/") is one of the block's ports, which the block page draws as hierarchical labels; the
 * module net is then the port's binding. Any other net is private to the page and passes.
 *
 * Fails (exit 1), naming the net, when a shared net's declared flag is on another page or the
 * root, or when a shared net has no declared home at all (add it to the table, with its reason).
 * Fails too when the export does not list exactly <expected> probe flags, so a flag the export
 * dropped cannot pass unseen.
 *
 * usage: bun flag-check.ts <block> <probe-export.net> <expected-flag-count>   (from the repository root)
 */
import { readFileSync } from "node:fs"
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import { importNetlist } from "../../../../../lib/kicad/netlist.ts"
import { SHARED_FLAG_HOME } from "./pwr-flag-homes.ts"

const [block, file, expectedText] = process.argv.slice(2)
if (block === undefined || file === undefined || expectedText === undefined) {
  throw new Error("usage: bun flag-check.ts <block> <probe-export.net> <expected-flag-count> - all three are required")
}
const expected = Number(expectedText)
if (!Number.isInteger(expected) || expected < 0) {
  throw new Error(`flag-check.ts: expected-flag-count must be a whole number; got "${expectedText}"`)
}
const record = h7Module().blocks.find((b) => b.prefix === block)
if (record === undefined) {
  throw new Error(`h7Module() has no block "${block}"`)
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
  const moduleNet = ports[port]
  if (moduleNet === undefined) {
    console.log(`PWR_FLAG ${probe}: net ${exportedName}, private to ${block} - allowed`)
    continue
  }
  const home = SHARED_FLAG_HOME[moduleNet]
  if (home === undefined) {
    failures.push(`${block} carries a PWR_FLAG on shared net ${moduleNet}, which has no declared flag home; declare it in pwr-flag-homes.ts with its reason (ruling CR-MODULE-PWR-FLAGS)`)
  } else if (home !== block) {
    failures.push(`${block} carries a PWR_FLAG on shared net ${moduleNet}, whose single flag lives on ${home} (pwr-flag-homes.ts, ruling CR-MODULE-PWR-FLAGS)`)
  } else {
    console.log(`PWR_FLAG ${probe}: shared net ${moduleNet}, whose declared flag home is this page - allowed`)
  }
}
for (const failure of failures) console.error(`flag-check.ts: FAIL - ${failure}`)
process.exit(failures.length === 0 ? 0 : 1)
