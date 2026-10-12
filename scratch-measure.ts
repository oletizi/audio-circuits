/**
 * The first real-binary run of the Task 17 climb: one climb from each starting
 * arm on the import-placed low-boost board.
 *
 * Scratch, not committed. Every figure it prints goes into
 * docs/stripboard/pipeline-verification.md with the command beside it.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { physicalBoard } from "./circuits/pultec/physical/board.ts"
import { loadDeclaration } from "./tools/perfboard/declaration.ts"
import { exportNetlistFor } from "./tools/perfboard/check.ts"
import { referenceNetsFromExport } from "./tools/stripboard/equivalence.ts"
import { stockFor } from "./tools/stripboard/grade.ts"
import { loadRules } from "./tools/stripboard/rules.ts"
import { deriveTargets } from "./tools/stripboard/targets.ts"
import { parseSeedArm, seedCandidate, SEED_ARMS, type SpawnVeroroute } from "./tools/stripboard/seed.ts"
import { climb } from "./tools/stripboard/climb.ts"

const BINARY = path.resolve(".tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute")
const DECLARATION = "boards/pultec-low-boost/perfboard.json"
const CAP = Number(process.argv[2] ?? "20000")
const SEED = 0

let invocations = 0
const spawn: SpawnVeroroute = (args) => {
  invocations += 1
  const result = spawnSync(BINARY, [...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

function footprintsOf(section: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const component of physicalBoard(section).components) {
    const footprint = component.part?.footprint
    if (footprint !== undefined) map.set(component.id, footprint)
  }
  return map
}

const rules = { ...loadRules(), evaluationCap: CAP }
const declaration = loadDeclaration(DECLARATION)
const netlistText = await exportNetlistFor(declaration)

const root = fs.mkdtempSync(path.join("/tmp", "stripboard-measure-"))
const netlist = path.join(root, "low-boost.net")
fs.writeFileSync(netlist, netlistText)

// The import-placed board, by the command tests/fixtures/stripboard/provenance.txt records.
const imported = path.join(root, "imported.vrt")
const importRun = spawn(["--import", netlist, "--strips", "horizontal", "-o", imported])
if (importRun.status !== 0) {
  throw new Error(`--import exited ${importRun.status}\n${importRun.stdout}${importRun.stderr}`)
}
console.log(`imported board: ${imported}`)

const targets = deriveTargets(physicalBoard("low-boost"), rules.stockRows, "pultec-low-boost")
const reference = referenceNetsFromExport(netlistText)
const footprints = footprintsOf("low-boost")
const stock = stockFor(DECLARATION, rules)
console.log(`targets: N=${targets.netCount} P=${targets.pinCount} cutFloor=${targets.cutFloor}`)
console.log(`reference nets: ${reference.size}; footprints declared: ${footprints.size}`)

const ARMS: readonly string[] = [...SEED_ARMS, "unpainted-import-board"]

for (const arm of ARMS) {
  const runDir = path.join(root, arm)
  fs.mkdirSync(runDir, { recursive: true })
  const startedAt = Date.now()
  const before = invocations
  let line: string
  try {
    const start =
      arm === "unpainted-import-board"
        ? imported
        : seedCandidate(
            { importedBoard: imported, targets, runDir, rules, arm: parseSeedArm(arm), seed: SEED },
            spawn,
          )
    const result = climb(
      start,
      { runDir, netlist, targets, reference, footprints, stock, rules, batch: false },
      spawn,
    )
    const failing = result.best.results.filter((entry) => !entry.held).map((entry) => entry.id)
    line =
      `arm=${arm} OK rounds=${result.rounds} evaluations=${result.evaluations} ` +
      `acceptedPerRound=[${result.acceptedPerRound.join(",")}] ` +
      `F0=${result.history[0]} Fbest=${result.best.score.objective} ` +
      `C=${result.best.score.cuts} W=${result.best.score.wires} B=${result.best.score.solder} ` +
      `A1=${result.best.admissibleA1} failing=[${failing.join(",")}] ` +
      `stoppedOn=${result.evaluations >= CAP ? "S5-cap" : "S3-no-accepted-move"}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    line = `arm=${arm} REFUSED ${message}`
  }
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`${line} invocations=${invocations - before} seconds=${seconds}`)
}
console.log(`total invocations=${invocations}`)
