/**
 * The owner's two hand-built boards, measured the same way a generated seed is -
 * so the clearance figures the construction cites are checked against the boards
 * rather than quoted from a comment.
 *
 * **WHY THIS IS A FIXTURE AND NOT A COMMENT.** `lib/stripboard/seed-area.ts`
 * states four measurements as its evidence: no lead under a rigid part, the
 * nearest-neighbour clearance distribution, the overlapping pairs on
 * `buffered`, and seven of eight wires crossing nothing. *"Check any claim you
 * put in a comment against something you ran"* is this plan's most reliable
 * lesson, so `./seed-room-hand-boards.test.ts` re-derives all four from the dumps and the
 * KiCad files every run.
 *
 * **THE MEASUREMENT GOES THROUGH `partAreasOf`, WHICH IS THE PLACER'S AND THE
 * MOVE GENERATOR'S OWN DERIVATION, AND IT DOES NOT RESTATE ONE.** A board is
 * read into `Placement`s - exactly the ones a dump states, pin for pin - and
 * `lib/stripboard/moves.ts` turns those into rectangles. `./area-agree.test.ts`
 * establishes over 41 real placements and all four facings that `partAreasOf`
 * and `seed-area.ts`'s own `areaRect` give one rectangle per part, so measuring
 * through either is measuring the quantity the rules are written in.
 *
 * **IT USED TO BUILD THE FRAME FROM THE FOOTPRINT'S MOULDED PAD OFFSETS, AND
 * THAT WAS WRONG BY THREE STRIPS ON EVERY TRIMMER.** For a part with more than
 * one pin row the frame came from `padHolesFor`, which says where the pads sit
 * in the footprint's own frame and therefore cannot know the one thing a
 * `Placement` does not carry: the pinned fork's `TRIM_FLAT` cell map exchanges
 * the RM-065's two END terminals, so `facingOf` fits every one of them only
 * REFLECTED, and the reflection lives in `tools/stripboard/vero-import-facing.ts`
 * and nowhere else. The rectangle that came back was the mirror image of where
 * the part is: measured, all eight trimmers across the two boards - RV1-RV4 on
 * `feedback` and RV1-RV4 on `buffered` - had rectangles that did not contain
 * their own lead holes. `./seed-room-hand-boards.test.ts` now asserts that premise directly,
 * because a rectangle that excludes its own leads is wrong whatever else is
 * true, and these figures are the evidence `seed-area.ts` cites for the one hard
 * geometric rule in the system.
 *
 * Taking the leads AS PLACED is what both derivations' own comments say the
 * quantity is, and it makes the reflection a non-question: a dump's `PIN` lines
 * are where the leads are, whatever transform put them there.
 *
 * **`areaRect`, AND THEREFORE THIS, IS CONSERVATIVE ON A STRETCHED PART** by up
 * to `beforeAlong + afterAlong` holes, because the moulded body margins are
 * applied to the placed pads. That is stated in `seed-area.ts`, it errs towards
 * more room, and every figure here is measured with it - so the two sides of
 * every comparison are the same quantity, which the body-and-pads union of
 * `geometryOf` would not be.
 */
import fs from "node:fs"
import { parseBoardDump } from "../../../tools/guide/dump.ts"
import {
  EXEMPTABLE_RULES,
  loadExemptions,
  noticesOf,
  verdictFor,
  type ExemptionVerdict,
} from "../../../tools/stripboard/exemptions.ts"
import { facingOf, type PinHole } from "../../../tools/stripboard/vero-import-facing.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { Hole, Placement } from "../../../lib/stripboard/board.ts"
import { partAreasOf } from "../../../lib/stripboard/moves.ts"
import type { PartArea } from "../../../lib/stripboard/seed-area.ts"
import { COMMITTED_BOARDS, footprintsOf } from "../vero-import-fixtures.ts"
import { rigidOverlapPlaces, routedUnderRigidPlaces } from "./area-places.ts"

/** One hand-built board, reduced to the areas its parts cover and the wires it carries. */
export interface HandBoard {
  readonly name: string
  readonly areas: readonly PartArea[]
  readonly wires: readonly { readonly from: Hole; readonly to: Hole }[]
  readonly skipped: readonly string[]
  /**
   * What the two hard area rules find on this board, answered against
   * `stripboard/exemptions.json` - one verdict per rule, in `EXEMPTABLE_RULES`
   * order.
   *
   * **THE REGISTRY IS CONSULTED WHERE THE BOARD IS MEASURED**, which is here: a
   * measurement that reported a breach with no idea whether it was excused would
   * make somebody re-litigate the question, and the owner granted the exemption
   * precisely so that stops happening - *"so we don't have to keep having this
   * dumb conversation"*. A verdict is a union and not a boolean, so a caller
   * cannot take it for silence; `notices` is what it has to say out loud.
   */
  readonly exemptions: readonly ExemptionVerdict[]
  /** The lines `exemptions` requires a run to report. Empty only if nothing was found. */
  readonly notices: readonly string[]
}

/**
 * The two hard area rules measured over one board's areas and answered against
 * the recorded exemptions.
 *
 * **AN EXEMPT BOARD DOES NOT FAIL AND DOES NOT GO QUIET.** `transistor-preamp-
 * feedback` and `transistor-preamp-buffered` were laid out by hand, built, and
 * are in use; they predate this tooling and were never held to it, and that is
 * recorded with its reason and provenance rather than argued again. What is NOT
 * recorded anywhere is permission to stop mentioning it.
 */
function exemptionsFor(name: string, areas: readonly PartArea[]): readonly ExemptionVerdict[] {
  const registry = loadExemptions()
  const places: ReadonlyMap<string, readonly string[]> = new Map([
    ["rigidOverlap", rigidOverlapPlaces(areas)],
    ["routedUnderRigid", routedUnderRigidPlaces(areas)],
  ])
  return EXEMPTABLE_RULES.map((rule) => {
    const found = places.get(rule)
    if (found === undefined) {
      throw new Error(
        `${name}: no measurement for "${rule}". Every rule in EXEMPTABLE_RULES must be measured ` +
          "here before it is consulted about, because a rule nothing measures is a rule whose " +
          "exemption can never be checked - and an unmeasured rule reported as clean is the " +
          "skipped check that looks like a passing one. Add its measurement to " +
          "tests/stripboard/model/area-places.ts and name it above; nothing is assumed clean.",
      )
    }
    return verdictFor(registry, { subject: name, rule, places: found })
  })
}

/**
 * One ref's `PIN` lines as the `Placement` the model states them in - or, when
 * no transform of its footprint fits those holes, the line `handBoard` records
 * in `skipped`, which both built boards leave empty.
 *
 * **THE PINS ARE THE DUMP'S AND THE FACING IS SOLVED, which is the same split
 * `placementOf` in `tools/stripboard/vero-import.ts` makes** and for the reason
 * that module gives: a dump is the authority for a board that already exists,
 * and the one field it does not reliably print is the direction. `holes` is the
 * pin holes for the same reason it is there - *a placement is its pins* - and
 * nothing here reads the body outline the footprint also has.
 *
 * This is NOT `candidateFromDump`, and the difference is why it exists:
 * `buffered` refuses that importer on `vero-import-bridge-net-unknown` (a
 * `SOLDER` line whose net the dump records nowhere, pinned in
 * `./cuts-agree.test.ts`), and `buffered` is half the evidence
 * `lib/stripboard/seed-area.ts` cites. A bridge's net has no bearing on where a
 * part's leads are, so the two boards are read here through the one thing the
 * measurement needs.
 */
function placementOf(ref: string, footprint: string, pins: readonly PinHole[]): Placement | string {
  const fit = facingOf(footprint, pins, PIN_PATTERNS)
  if (fit.kind !== "fitted") return `${ref}: facing ${fit.kind}`
  return {
    ref,
    footprint,
    origin: fit.facing.origin,
    direction: fit.facing.direction,
    holes: pins.map((entry) => entry.hole),
    pins: new Map(pins.map((entry) => [entry.pin, entry.hole])),
  }
}

export function handBoard(name: string): HandBoard {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) throw new Error(`"${name}" is not in COMMITTED_BOARDS.`)
  const dump = parseBoardDump(fs.readFileSync(board.dump, "utf8"))
  const footprints = footprintsOf(board)
  const placements: Placement[] = []
  const skipped: string[] = []
  for (const [ref, pins] of Object.entries(dump.pins).sort(([a], [b]) => a.localeCompare(b))) {
    const footprint = footprints.get(ref)
    if (footprint === undefined) {
      skipped.push(`${ref}: no footprint in the map`)
      continue
    }
    const holes: readonly PinHole[] = pins.map((pin) => ({
      pin: pin.pin,
      hole: { strip: pin.row, column: pin.col },
    }))
    const placed = placementOf(ref, footprint, holes)
    if (typeof placed === "string") {
      skipped.push(placed)
      continue
    }
    placements.push(placed)
  }
  // THE WIRES AND BRIDGES OF THIS Candidate ARE EMPTY AND THE VALUE NEVER
  // LEAVES THIS FUNCTION. `partAreasOf` answers a question about PARTS - it
  // reads `candidate.placements` and nothing else - and this board's real
  // wires are returned beside the areas below, read off the dump. Carrying
  // them here would mean inventing each one's declared net, which `Wire`
  // requires and the dump does not state for `buffered`; that invention is
  // the whole reason `candidateFromDump` refuses that board.
  const areas = partAreasOf(
    {
      grid: { strips: dump.grid.rows, columns: dump.grid.cols },
      placements,
      wires: [],
      bridges: [],
    },
    LEAD_SPANS,
    PIN_PATTERNS,
  )
  const exemptions = exemptionsFor(name, areas)
  return {
    name,
    areas,
    wires: dump.wires.map((wire) => ({
      from: { strip: wire.ends[0].row, column: wire.ends[0].col },
      to: { strip: wire.ends[1].row, column: wire.ends[1].col },
    })),
    skipped,
    exemptions,
    notices: noticesOf(exemptions),
  }
}
