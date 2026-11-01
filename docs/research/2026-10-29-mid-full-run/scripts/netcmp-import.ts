/**
 * Compare the netlists of the model's generated sheet, the copperhead baseline and
 * the repaired page, THROUGH THE REPOSITORY'S OWN `importNetlist`.
 *
 * `TOOLING.md` trap 5: a hand-rolled netlist parser on the guide run merged all 15
 * hi-cut nets into one 51-member net while printing a clean figure. So nothing here
 * parses a netlist: `lib/kicad/netlist.ts` does, and `kicad-cli` produces it.
 *
 * It prints a POSITIVE CONTROL first - the same comparator run over a deliberately
 * perturbed copy of the baseline, which must report a difference. A comparator that
 * cannot find a difference it was handed makes the real result meaningless.
 *
 * usage: bun netcmp-import.ts <generated.kicad_sch> <before.kicad_sch> <after.kicad_sch>
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { importNetlist, KICAD_CLI } from "../../../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../../../lib/kicad/netlist.ts"

function exportNetlist(sheet: string): ImportedNetlist {
  const dir = mkdtempSync(join(tmpdir(), "netcmp-"))
  const out = join(dir, "net.net")
  execFileSync(KICAD_CLI, ["sch", "export", "netlist", "--format", "kicadsexpr", "-o", out, sheet])
  return importNetlist(readFileSync(out, "utf8"))
}

/** The partition as a set of sorted member lists, names ignored. */
function partition(n: ImportedNetlist): Set<string> {
  return new Set(Object.values(n.nets).map(m => [...m].sort().join(" ")))
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

function report(tag: string, a: ImportedNetlist, b: ImportedNetlist): boolean {
  const pa = partition(a)
  const pb = partition(b)
  const identical = sameSet(pa, pb)
  console.log(`${tag}`)
  console.log(`  components           ${a.components.length} vs ${b.components.length}`)
  console.log(`  nets                 ${Object.keys(a.nets).length} vs ${Object.keys(b.nets).length}`)
  console.log(`  PARTITION (pin sets) ${identical ? "IDENTICAL" : "DIFFERS"}`)
  if (!identical) {
    for (const s of [...pa].filter(s => !pb.has(s)).sort()) console.log(`    only in A: ${s}`)
    for (const s of [...pb].filter(s => !pa.has(s)).sort()) console.log(`    only in B: ${s}`)
  }
  const na = new Set(Object.keys(a.nets))
  const nb = new Set(Object.keys(b.nets))
  const onlyA = [...na].filter(n => !nb.has(n)).sort()
  const onlyB = [...nb].filter(n => !na.has(n)).sort()
  console.log(`  NET NAMES            ${onlyA.length === 0 && onlyB.length === 0 ? "IDENTICAL" : "DIFFER"}`)
  if (onlyA.length > 0) console.log(`    only in A: ${onlyA.join(", ")}`)
  if (onlyB.length > 0) console.log(`    only in B: ${onlyB.join(", ")}`)
  return identical
}

const [generated, before, after] = process.argv.slice(2)
if (generated === undefined || before === undefined || after === undefined) {
  throw new Error("usage: netcmp-import.ts <generated> <before> <after>")
}

// POSITIVE CONTROL: strike one wire out of a copy of the baseline and the
// partition must change. Built before anything is claimed about the real pair.
const control = join(mkdtempSync(join(tmpdir(), "netctl-")), "pultec-mid.kicad_sch")
const src = readFileSync(before, "utf8")
const firstWire = src.indexOf("\n\t(wire")
const endWire = src.indexOf("\n\t)", firstWire)
if (firstWire < 0 || endWire < 0) throw new Error("no wire block to perturb in the control")
writeFileSync(control, src.slice(0, firstWire) + src.slice(endWire + 3))
console.log("=== POSITIVE CONTROL: the baseline with its first wire deleted")
const same = report("  baseline vs perturbed baseline", exportNetlist(before), exportNetlist(control))
if (same) throw new Error("the control reports IDENTICAL, so the comparator cannot fail")
console.log()

const g = exportNetlist(generated)
const b = exportNetlist(before)
const a = exportNetlist(after)
console.log("=== the model's generated sheet vs the copperhead baseline")
report("  generated vs before", g, b)
console.log()
console.log("=== the copperhead baseline vs the repaired page")
report("  before vs after", b, a)
console.log()
console.log("=== the model's generated sheet vs the repaired page")
report("  generated vs after", g, a)
