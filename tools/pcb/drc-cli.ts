/**
 * `bun tools/pcb/drc-cli.ts <board.kicad_pcb> <schematic.kicad_sch> <parity|drc> [--routed]`
 *
 * `parity` prints the schematic-parity findings and exits non-zero if any.
 * `drc` prints the full verdict under the three-class policy and exits non-zero
 * unless it passes. A refusal (the check could not establish its own evidence)
 * exits 2 with the guard that refused, which is never the same as a failing
 * board.
 */

import { runDrc, verdictOf, DrcRefusal } from "./drc.ts"

const [board, schematic, mode, flag] = process.argv.slice(2)
if (board === undefined || schematic === undefined || (mode !== "parity" && mode !== "drc")) {
  console.error("usage: bun tools/pcb/drc-cli.ts <board.kicad_pcb> <schematic.kicad_sch> <parity|drc> [--routed]")
  process.exit(2)
}

try {
  const report = runDrc(board, { schematicPath: schematic })
  const verdict = verdictOf(report, { routed: flag === "--routed" })
  console.log(`report: ${report.reportPath} (KiCad ${report.kicadVersion}, ${report.netlistComponents} schematic components)`)
  console.log(JSON.stringify(verdict.counts))
  if (mode === "parity") {
    for (const item of report.schematicParity) console.log(`  parity: ${item.description}`)
    process.exit(report.counts.schematicParity === 0 ? 0 : 1)
  }
  for (const failure of verdict.failures) console.log(`  FAIL: ${failure}`)
  if (verdict.leftUnrouted !== undefined) console.log(`  unrouted candidate: ${verdict.leftUnrouted} connection(s) left undone`)
  process.exit(verdict.pass ? 0 : 1)
} catch (error) {
  if (error instanceof DrcRefusal) {
    console.error(`REFUSED: ${error.message}`)
    process.exit(2)
  }
  throw error
}
