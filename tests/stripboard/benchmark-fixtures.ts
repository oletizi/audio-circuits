/**
 * What `./benchmark.test.ts` runs against: the frozen fixture's four files, the
 * reduced rules the standing tests use, and the recording spawn.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper the benchmark file imports,
 * following `./climb-fixtures.ts` and seven others.
 *
 * **THE REDUCED CAP IS THE PLAN'S OWN REMEDY AND NOT A WEAKENED TEST.** Task
 * 23: *"if the suite's wall clock becomes a problem, the remedy is a smaller
 * evaluation cap for the test through the injected rules, **not** skipping it:
 * a skipped benchmark looks exactly like a passing one."* Measured on this
 * machine: a cap of 8 evaluations runs in about a second and a cap of 400 in
 * forty, against 20,000 in the committed file. **What the small cap changes is
 * what the search FINDS, and not whether the chain runs** - every link is
 * exercised either way, which is what these tests are about; the quality
 * figures the benchmark is judged on come from the full-cap runs recorded in
 * `docs/stripboard/pipeline-verification.md`.
 */
import fs from "node:fs"
import path from "node:path"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { verorouteSpawn } from "../../tools/stripboard/place.ts"

const ROOT = moduleRepoRoot()
const FIXTURES = path.join(ROOT, "tests", "fixtures", "stripboard")

/** The owner's hand layout, byte for byte as it stood at `2f62ee1`. */
export const FROZEN = path.join(FIXTURES, "pultec-low-boost-frozen.vrt")
/** The export of the model it was built against: 9 nets, 27 pins. */
export const FROZEN_NETLIST = path.join(FIXTURES, "pultec-low-boost-frozen.netlist")
/** The pinned binary's `--dump-board` on that layout. */
export const FROZEN_DUMP = path.join(FIXTURES, "pultec-low-boost-frozen.dump")
/** Designator to KiCad footprint for that same model - what v1.1 cannot carry. */
export const FROZEN_FOOTPRINTS = path.join(FIXTURES, "pultec-low-boost-frozen.footprints.json")

/** The scaffolded board, which meets `B1-current` and never `B1-frozen`. */
export const LOW_BOOST_BOARD = "boards/pultec-low-boost"

/** The frozen fixture's dump, parsed. The GRID line is its own authority. */
export function frozenDump(): ReturnType<typeof parseBoardDump> {
  return parseBoardDump(fs.readFileSync(FROZEN_DUMP, "utf8"))
}

/** The committed footprint map, as the run reads it. */
export function frozenFootprints(): ReadonlyMap<string, string> {
  const parsed: unknown = JSON.parse(fs.readFileSync(FROZEN_FOOTPRINTS, "utf8"))
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${FROZEN_FOOTPRINTS} does not hold a JSON object`)
  }
  const map = new Map<string, string>()
  for (const [ref, footprint] of Object.entries(parsed)) {
    if (typeof footprint !== "string") {
      throw new Error(`${FROZEN_FOOTPRINTS} maps "${ref}" to something other than a string`)
    }
    map.set(ref, footprint)
  }
  return map
}

/**
 * The committed rules with a smaller cap, and the seed list UNTOUCHED.
 *
 * **THE SEED LIST IS `PAR3`'S FILE AND IS NEVER NARROWED HERE** (`V9`): the
 * sweep's own test asserts one row per reviewed seed, and a test that shortened
 * the list would be asserting a rate over a seed set nobody reviewed.
 */
export function reducedRules(evaluationCap: number): StripboardRules {
  return { ...loadRules(), evaluationCap }
}

/** One spawn that records every invocation and then really runs the fork. */
export function recordingSpawn(into: string[][]): SpawnVeroroute {
  const real = verorouteSpawn()
  return (args) => {
    into.push([...args])
    return real(args)
  }
}

/** The message of a thrown refusal, or `""` when nothing was thrown. */
export async function refusalFrom(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}
