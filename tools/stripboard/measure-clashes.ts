/**
 * Strip-cell body clashes on one board's dump, the measurement
 * docs/stripboard/pin-pattern.md section 3.1 tabulates: for each placement
 * whose lead geometry IS its footprint's (unstretched), the holes geometryOf
 * claims beyond its own leads, intersected with every other part's leads.
 *
 * Usage: bun tools/stripboard/measure-clashes.ts <dump> <kicad-export>
 */
import fs from "node:fs"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { geometryOf } from "../../lib/stripboard/board.ts"
import { parseBoardDump } from "../guide/dump.ts"
import { referenceNetsFromExport } from "./equivalence.ts"
import { candidateFromDump } from "./vero-import.ts"

const [dumpPath, netPath] = process.argv.slice(2)
if (dumpPath === undefined || netPath === undefined) throw new Error("usage: <dump> <kicad-export>")
const dumpText = fs.readFileSync(dumpPath, "utf8")
const netText = fs.readFileSync(netPath, "utf8")
const footprints = new Map<string, string>()
for (const component of importNetlist(netText).components) {
  if (component.footprint !== undefined) footprints.set(component.designator, component.footprint)
}
const candidate = candidateFromDump(dumpText, referenceNetsFromExport(netText), footprints, PIN_PATTERNS)
const dump = parseBoardDump(dumpText)

const leadAt = new Map<string, string>()
for (const [ref, pins] of Object.entries(dump.pins)) {
  for (const pin of pins) leadAt.set(`${pin.row},${pin.col}`, `${ref}.${pin.pin}`)
}

let unstretched = 0
let stretched = 0
const clashes: string[] = []
for (const placement of candidate.placements) {
  const geometry = geometryOf(placement.footprint, placement.origin, placement.direction, PIN_PATTERNS)
  const same = [...placement.pins].every(([pin, hole]) => {
    const derived = geometry.pins.get(pin)
    return derived !== undefined && derived.strip === hole.strip && derived.column === hole.column
  })
  if (!same) {
    stretched += 1
    continue
  }
  unstretched += 1
  for (const hole of geometry.holes) {
    const key = `${hole.strip},${hole.column}`
    const lead = leadAt.get(key)
    if (lead === undefined || lead.startsWith(`${placement.ref}.`)) continue
    clashes.push(`${placement.ref} (${placement.footprint}) claims ${key}=${lead}`)
  }
}
console.log(`placements ${candidate.placements.length}: ${unstretched} at their footprint's geometry, ${stretched} stretched`)
console.log(`strip-cell clashes: ${clashes.length}`)
for (const clash of clashes) console.log(`  ${clash}`)
