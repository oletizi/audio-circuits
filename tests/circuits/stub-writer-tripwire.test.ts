/**
 * **A TRIPWIRE ON A DELETION OBLIGATION.** It fires when a PRECONDITION IS MET, not when a defect
 * appears, and its failure message is an instruction rather than an obstacle.
 *
 * **WHY IT EXISTS.** `CLAUDE.md`: *"A pattern replaced by a better one is removed in the same
 * change, not left as a stub for somebody to find and trust."* `lib/kicad/schematic.ts` was
 * replaced by `lib/schgen/` and is NOT removed, because `generate` refuses this repository's own
 * transistor-preamp boards and those five boards' `kicad-cli` tests are the only proof that KiCad
 * reads their models the way the circuits mean them. `docs/known-gaps.md` **G248** records that
 * non-deletion, its precondition and its price; **G247** is the per-board measurement.
 *
 * **AND WHY PROSE WAS NOT ENOUGH.** **G81**'s criterion already said the stub goes when its
 * replacement lands. The replacement landed and nothing noticed, which is the whole reason that
 * entry is still open. A second entry promising the same thing, with nothing that fires, would be
 * the same failure twice. This is the thing that fires.
 *
 * **THE CRITERION IS THE CONTROLLER'S AND IS NOT THIS FILE'S TO REFINE** (ruling **R72**):
 * *"the writer, its test and the five preamp tests may be deleted when `generate` accepts a preamp
 * board."* An agent may never author the acceptance criteria for the artifact it produces, and a
 * guard deciding when an artifact may be deleted is such a criterion - so it was authored
 * elsewhere and is transcribed here.
 *
 * **WHAT IT COVERS, AND THE HALF IT CANNOT.** Four of the five boards have no
 * `SchematicAuthoring` declaration, so `circuitSpecFrom` has nothing to build from and `generate`
 * cannot be offered them at all - they are absent from `CANDIDATES` below for that reason and not
 * by choice. **No check can cover that half: a test cannot fire on a file nobody has written.**
 * So this tripwire covers the field-placement half, for `lab` only. **G248** says the same in
 * prose so the tripwire is not read as covering both.
 *
 * **ONE MORE THING IT DOES NOT DO.** It is green whenever `generate` refuses, for ANY reason - a
 * broken symbol library or a changed KiCad would hold it green just as **G232** does. It fires on
 * ACCEPTANCE and not on the absence of a particular defect, which is the criterion as authored.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { transistorPreampLab } from "../../circuits/transistor-preamp/lab-board.ts"
import { TRANSISTOR_PREAMP_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/authoring.ts"
import { circuitSpecFrom, nicknamesOf } from "../../lib/schgen/from-network.ts"
import { createResolver, stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts"
import { generate } from "../../tools/schgen/generate.ts"
import { kicadVersion } from "../../tools/schgen/kicad-run.ts"
import type { DesignSpec, LoadedDesign } from "../../lib/schgen/design.ts"
import type { SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { Network } from "../../lib/model/types.ts"

interface Candidate {
  readonly board: string
  readonly network: Network
  readonly authoring: SchematicAuthoring
}

/**
 * The transistor-preamp boards `generate` CAN be offered. `buffered`, `feedback`, `loop` and
 * `staged` are absent because no module in this repository exports a `SchematicAuthoring` for
 * them - see the header. A board gaining one belongs here.
 */
const CANDIDATES: readonly Candidate[] = [
  { board: "lab", network: transistorPreampLab(), authoring: TRANSISTOR_PREAMP_SCHEMATIC },
]

/** Resolves when `generate` accepted the board; throws when it refused. */
async function attempt(candidate: Candidate): Promise<void> {
  const symbols = createResolver(symbolLibraries([...nicknamesOf(candidate.network, candidate.authoring)].sort()))
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `tripwire-${candidate.board}-`))
  try {
    const spec: DesignSpec = {
      project: `transistor-preamp-${candidate.board}`,
      outDir: scratch,
      circuit: circuitSpecFrom(candidate.network, candidate.authoring, symbols),
      symbolLibs: {},
      footprintLibs: {},
      pinTables: null,
      checklist: null,
      oscar: null,
      ercExclusions: [],
    }
    const design: LoadedDesign = {
      file: path.join(scratch, `${spec.project}.design.ts`), dir: scratch, spec, outDir: scratch,
    }
    await generate(design, {
      kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: false,
    })
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}


/** The value the assertion expects while the writer must stay. */
const STILL_REFUSED = "no transistor-preamp board generates"

function instruction(generated: readonly string[]): string {
  return (
    `${generated.join(", ")} NOW GENERATES, so the precondition in docs/known-gaps.md G248 is met. ` +
    "Delete lib/kicad/schematic.ts, tests/kicad/schematic.test.ts and this file, and move what " +
    "moves onto generate and roundTrip: tests/circuits/kicad-round-trip.ts's kicadRoundTrip, and " +
    "with it the five transistor-preamp-*.test.ts boards' KiCad tests. A test that needs editing " +
    "to survive that move is a FINDING and not an edit - a test that only passed against the stub " +
    "was not testing what its name said. Then delete G248, and G81 once its topology half is also " +
    "met. This tripwire goes with them; it is not a thing to update."
  )
}

/** `STILL_REFUSED`, or the instruction naming every board that generated. */
async function tripwireVerdict(): Promise<string> {
  const generated: string[] = []
  for (const candidate of CANDIDATES) {
    try {
      await attempt(candidate)
      generated.push(candidate.board)
    } catch {
      // A refusal is the expected result today. Which refusal it is does not change the verdict:
      // the criterion fires on ACCEPTANCE. G247 carries the refusal text and G232 the defect.
    }
  }
  return generated.length === 0 ? STILL_REFUSED : instruction(generated)
}

test("TRIPWIRE: no transistor-preamp board generates, so lib/kicad/schematic.ts stays", async () => {
  expect(await tripwireVerdict()).toBe(STILL_REFUSED)
}, 60_000)
