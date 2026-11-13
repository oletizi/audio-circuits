/**
 * `bun tools/pcb/drc-cli.ts <board.kicad_pcb> <schematic.kicad_sch> parity | drc --routed | drc --unrouted`
 *
 * `parity` prints the schematic-parity findings and exits non-zero if any.
 * `drc` takes --routed or --unrouted (required) and prints the full verdict
 * under the three-class policy, exiting non-zero unless it passes. A refusal (the check could not establish its own evidence)
 * exits 2 with the guard that refused, which is never the same as a failing
 * board.
 */

import { runDrc, verdictOf, DrcRefusal } from "./drc.ts"

const USAGE = "usage: bun tools/pcb/drc-cli.ts <board.kicad_pcb> <schematic.kicad_sch> parity | drc --routed | drc --unrouted"
const [board, schematic, mode, flag, ...extra] = process.argv.slice(2)
if (board === undefined || schematic === undefined || extra.length > 0) {
  console.error(USAGE)
  process.exit(2)
}
// The policy is explicit and never defaulted: an unrecognised flag must not select the weaker one.
const routed = flag === "--routed" ? true : flag === "--unrouted" ? false : undefined
if (!(mode === "parity" && flag === undefined) && !(mode === "drc" && routed !== undefined)) {
  console.error(USAGE)
  process.exit(2)
}

try {
  const report = runDrc(board, { schematicPath: schematic })
  const verdict = verdictOf(report, { routed: routed === true })
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
