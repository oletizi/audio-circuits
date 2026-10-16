/**
 * **THIS TEST ASSERTS A DEFECT, AND IT PASSES TODAY. THAT IS DELIBERATE AND IT
 * IS PLAN-MANDATED - IT IS NOT A MISTAKE AND IT IS NOT A TEST THAT GOT STUCK.**
 *
 * `--materialize` takes the component SET from a base `.vrt` and solves each
 * part's corner and facing against THAT board's footprint, which carries
 * whatever span it was last at. The candidate declares its own lead separation.
 * Nothing in the pipeline reconciles the two, so the first materialisation of
 * `pultec-low-boost` refuses on its first capacitor. That is `docs/known-gaps.md`'s
 * **G12**, and this file is the witness for it: the refusal is pinned here so
 * that the change which makes `--materialize` set each part's span from the
 * document it is materialising has something that goes RED.
 *
 * **WHAT THE NEXT CHANGE DOES WITH THIS FILE IS DELETE IT.** A test asserting
 * today's refusal must not survive the fix as a skipped case or an inverted
 * assertion: supersede means delete, and a test that says "this refuses" is
 * worthless the moment it does not. The replacement is a test that materialises
 * low-boost and reads the spans back off the board - not this one with its
 * expectations flipped.
 *
 * **WHY IT ASSERTS SUBSTRINGS AND NOT THE WHOLE MESSAGE.** The fork names the
 * part and the hole pair it could not solve (`( 1@7,3 2@10,3 )` on `rcm s0`
 * against today's committed board), and both of those are properties of the
 * candidate and of the base board rather than of the defect. Pinning them would
 * make this test fail for a reason that is not the one it exists to catch - a
 * re-laid base board, a different seed - and that failure would read as the gap
 * having changed shape. The two substrings asserted are the fork's own statement
 * of what it would not do, from
 * `.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp`'s
 * `SolvePlacement`.
 *
 * **IT DOES NOT SKIP WHEN THE FORK IS UNAVAILABLE.** `spawnSync` failing is a
 * loud throw naming the binary, because a skipped check that looks like a
 * passing one is the failure mode the whole stripboard workflow exists to
 * prevent. Nothing under `boards/` is written: `--materialize` refuses before it
 * writes, and the document and the output path are both in a registered scratch
 * directory.
 */
import { afterAll, expect, test } from "bun:test"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { sectionBoard } from "../../circuits/pultec/physical/board.ts"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../lib/stripboard/board.ts"
import type { ReferenceNets } from "../../lib/stripboard/cuts.ts"
import { seedPartsFrom } from "../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../lib/stripboard/seed.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { assignStrips, referenceNetsFor } from "../../tools/stripboard/seed-arrangement.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"
import { materialize } from "../../tools/stripboard/vero-export.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()
const SECTION = "low-boost"
const BOARD = `pultec-${SECTION}`

/**
 * The seed whose ordering this test materialises.
 *
 * `rcm s0` is the ordering the end-to-end run of this board used, so the
 * refusal below is the one that run recorded rather than a fresh one. It is
 * taken from `stripboard/rules.json`'s own reviewed seed list through
 * `loadRules`, not written here, so there is one place that says which
 * restarts the pipeline takes.
 */
const SEED = 0

/**
 * The low-boost candidate and its reference nets, by the route the capability
 * test already uses (`tests/stripboard/model/pultec-capability.test.ts`).
 *
 * A test may import `tools/` and `lib/stripboard/` may not, which is why the
 * assembly is here: `deriveTargets` and `referenceNetsFor` read the circuit.
 * Residency is DECLARED through `sectionBoard`'s `offBoardIds` rather than
 * inferred from which refs have a footprint - `seedPartsFrom` refuses the
 * disagreement by name, and collapsing the two claims into one would remove
 * that refusal's reason to exist.
 */
function lowBoostCandidate(): { readonly candidate: Candidate; readonly reference: ReferenceNets } {
  const board = sectionBoard(SECTION)
  const rules = loadRules()
  if (!rules.seeds.includes(SEED)) {
    throw new Error(
      `stripboard/rules.json's seed list is [${rules.seeds.join(", ")}] and this test ` +
        `materialises seed ${SEED}, which is not in it. The seed is not defaulted to the ` +
        "first entry: which ordering this refusal was recorded against is the fact that makes " +
        "it reproducible, and silently taking another one would pin a different candidate's " +
        "refusal under this test's name. Either restore the seed to rules.json or re-record " +
        "the refusal against a seed that is in it.",
    )
  }
  const targets = deriveTargets(board.network, rules.stockRows, BOARD)
  const reference = referenceNetsFor(targets)
  const footprints = new Map<string, string>()
  const offBoard = new Set<string>()
  for (const component of board.network.components) {
    const ref = board.designators[component.id]
    if (ref === undefined) continue
    const footprint = component.part?.footprint
    if (footprint !== undefined) footprints.set(ref, footprint)
    if (board.offBoardIds.has(component.id)) offBoard.add(ref)
  }
  const netlist = seedPartsFrom(
    reference,
    footprints,
    { patterns: PIN_PATTERNS, spans: LEAD_SPANS },
    offBoard,
  )
  const ordering = { name: `rcm s${SEED}`, homes: assignStrips(targets, SEED) }
  const candidate = seedsFrom(
    netlist,
    { strips: rules.stockRows, columns: rules.stockCols },
    LEAD_SPANS,
    [ordering],
  )[0]
  if (candidate === undefined) {
    throw new Error(
      `seedsFrom returned no candidate for ordering "${ordering.name}", so there is no ` +
        "candidate to materialise and this test cannot establish anything about " +
        "--materialize. Fix seedsFrom or the ordering; nothing is substituted, because a " +
        "stand-in candidate would make the refusal below a statement about the stand-in.",
    )
  }
  return { candidate, reference }
}

/**
 * Materialise low-boost onto its committed board and return the refusal.
 *
 * Throws rather than returning when `--materialize` SUCCEEDS, naming G12 - a
 * run that gets through means the gap this test witnesses is closed, and the
 * correct response to that is to delete this file rather than to see a green
 * test that proves nothing.
 */
function materializeLowBoostExpectingRefusal(): string {
  const { candidate, reference } = lowBoostCandidate()
  const scratch = freshTempScratch("stripboard-materialize-span-")
  const binary = verorouteBinary(process.env, REPO)
  try {
    materialize(
      {
        candidate,
        reference,
        base: path.join(REPO, "boards", BOARD, `${BOARD}.perfboard.vrt`),
        layoutPath: path.join(scratch, "low-boost-layout.txt"),
        outPath: path.join(scratch, "materialized.vrt"),
      },
      (args) => {
        const run = spawnSync(binary, [...args], { encoding: "utf8" })
        if (run.error !== undefined) {
          throw new Error(
            `could not run ${binary} ${args.join(" ")}: ${run.error.message}. This test does ` +
              "not skip when the fork is unavailable: a skipped check that looks like a " +
              "passing one is the failure mode the whole stripboard workflow exists to " +
              "prevent. tools/perfboard/acquire.ts names the rebuild and veroroute.pin names " +
              "the commit.",
          )
        }
        return { status: run.status ?? -1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
      },
    )
  } catch (error) {
    if (!(error instanceof Error)) throw error
    return error.message
  }
  throw new Error(
    "--materialize got through on pultec-low-boost without refusing, so docs/known-gaps.md's " +
      "G12 no longer holds and this test no longer witnesses anything. DELETE THIS FILE rather " +
      "than inverting it: its whole content is an assertion that a defect is present, and the " +
      "replacement is a test that materialises low-boost and reads each part's span back off " +
      "the board. The refusal is not treated as optional - a witness that passes whether or " +
      "not the defect is there is the one result that looks like coverage and is none.",
  )
}

test("materialising low-boost refuses on the first span disagreement", () => {
  const refusal = materializeLowBoostExpectingRefusal()
  expect(refusal, "the premise: this is the defect G12 records").toContain(
    'no turn of "C18"\'s footprint puts its leads in the holes the document declares',
  )
  expect(refusal, "and the fork names why").toContain("this verb never stretches one")
})

/**
 * The shape `tests/stripboard/temp-scratch.test.ts` requires, and nothing
 * fancier: that guard matches `afterAll(cleanUpTempScratch)` or
 * `afterAll(() => cleanUpTempScratch...)` literally, so a wrapper that also
 * asserted the removed count would read to it as a file that never armed the
 * hook at all. One shape for every file is the point of that guard.
 */
afterAll(cleanUpTempScratch)
