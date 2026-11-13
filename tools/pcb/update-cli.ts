/**
 * `bun tools/pcb/update-cli.ts <board.kicad_pcb> <schematic.kicad_sch> [--output <board.kicad_pcb>]`
 *
 * The headless Update PCB from Schematic. Puts every component in the schematic
 * on the board with its nets, in place unless `--output` names somewhere else,
 * and prints the counts read back off the written file.
 *
 * There is no failing outcome, only a refusal: a refusal (the tool could not
 * establish that it did what it was asked) exits 2 with the guard that refused,
 * the same convention `drc-cli.ts` uses, where that is never the same as a
 * failing board. Success exits 0.
 */
import { updateBoardFromSchematic, UpdateRefusal } from "./update-from-schematic.ts"

const USAGE = "usage: bun tools/pcb/update-cli.ts <board.kicad_pcb> <schematic.kicad_sch> [--output <board.kicad_pcb>]"
const [board, schematic, flag, flagValue, ...extra] = process.argv.slice(2)
if (board === undefined || schematic === undefined || extra.length > 0) {
  console.error(USAGE)
  process.exit(2)
}
// An unrecognised flag is never ignored: silently writing in place when the
// caller asked for somewhere else would overwrite a committed board.
if (flag !== undefined && (flag !== "--output" || flagValue === undefined)) {
  console.error(USAGE)
  process.exit(2)
}

try {
  const result = updateBoardFromSchematic(board, {
    schematicPath: schematic,
    ...(flagValue !== undefined ? { outputPath: flagValue } : {}),
  })
  console.log(`wrote: ${result.outputPath} (${result.librariesResolved} footprint libraries resolved)`)
  console.log(
    JSON.stringify({
      components: result.components,
      nodes: result.nodes,
      footprints: result.footprints,
      nettedPads: result.nettedPads,
    }),
  )
  process.exit(0)
} catch (error) {
  if (error instanceof UpdateRefusal) {
    console.error(`REFUSED: ${error.message}`)
    process.exit(2)
  }
  throw error
}
