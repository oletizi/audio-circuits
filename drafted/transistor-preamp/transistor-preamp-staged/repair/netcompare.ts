/**
 * Compare a kicad-cli netlist export of a sheet against the staged board's model,
 * the same three claims tests/circuits/committed-schematic.ts's expectSameCircuit
 * makes: the net partition (as sets of REF.PIN sets), per-designator value, and
 * per-component footprint. Prints counts and every difference; exits 1 on any.
 *
 * usage: bun netcompare.ts <export.net>
 */
import { readFileSync } from "node:fs"
import { importNetlist } from "../../../../lib/kicad/netlist.ts"
import { toImportedNetlist } from "../../../../lib/kicad/from-network.ts"
import { DESIGNATORS, PIN_NUMBERS, transistorPreampStaged } from "../../../../circuits/transistor-preamp/staged-board.ts"

const path = process.argv[2]
if (path === undefined) throw new Error("usage: bun netcompare.ts <export.net> - no export path given")
const exported = importNetlist(readFileSync(path, "utf8"))
const network = transistorPreampStaged()
const ours = toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS)

const partition = (nets: Readonly<Record<string, readonly string[]>>): string[] =>
  Object.values(nets).map((m) => [...m].sort().join(" ")).sort()

const theirs = new Set(partition(exported.nets))
const mine = new Set(partition(ours.nets))
let differences = 0
for (const n of mine) if (!theirs.has(n)) { differences++; console.log(`model only:  ${n}`) }
for (const n of theirs) if (!mine.has(n)) { differences++; console.log(`sheet only:  ${n}`) }

const valueOf = new Map(exported.components.map((c) => [c.designator, c.value]))
const footprintOf = new Map(exported.components.map((c) => [c.designator, c.footprint]))
for (const c of ours.components) {
  if (valueOf.get(c.designator) !== c.value) {
    differences++
    console.log(`value ${c.designator}: sheet ${valueOf.get(c.designator)} model ${c.value}`)
  }
}
if (exported.components.length !== ours.components.length) {
  differences++
  console.log(`component count: sheet ${exported.components.length} model ${ours.components.length}`)
}
for (const component of network.components) {
  const designator = DESIGNATORS[component.id]
  if (designator === undefined) throw new Error(`"${component.id}" has no designator`)
  if (footprintOf.get(designator) !== component.part?.footprint) {
    differences++
    console.log(`footprint ${designator}: sheet ${footprintOf.get(designator)} model ${component.part?.footprint}`)
  }
}
console.log(`nets: sheet ${theirs.size}, model ${mine.size}; components: sheet ${exported.components.length}, ` +
  `model ${ours.components.length}; differences ${differences}`)
process.exit(differences === 0 ? 0 : 1)
