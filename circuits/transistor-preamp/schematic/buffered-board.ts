/**
 * Schematic authoring declaration for `../buffered-board.ts`'s `transistorPreampBuffered()`.
 *
 * **THIS IS THE BOARD `docs/known-gaps.md` G247 NAMES AS THE HARD CASE - *"`buffered-board.ts`
 * exports none at all"* - AND THE REASON IT EXPORTS NO LEG CONSTANT IS THAT IT DECLARES NO BIAS
 * NETWORK.** It is `addFeedbackStage` (which builds `FEEDBACK_LEGS`) plus `addFollower` plus an
 * input header, and that is the whole module: *"stage 1 is built by the feedback board's own
 * addFeedbackStage, so its parts, trim ranges, ids and designators are identical and tuned
 * settings carry across."* So the board declares its blocks through the two shared FUNCTIONS it
 * calls, and `./preamp-boards.ts`'s header carries the measurement that makes reading
 * `addFollower` a declaration rather than a guess.
 *
 * **SIX BLOCKS: the four `FEEDBACK_LEGS` legs, the follower, and the stage core.** The follower
 * has no leg of its own because *"the follower's bias is soft on purpose"* - R5/R6 are a plain
 * divider with no trim and nothing to take out of circuit - so there is no `Leg` to declare and
 * none is invented.
 *
 * **THE FOLLOWER'S INTERFACE IS THE SHORTEST OF THE THREE BOARDS THAT HAVE ONE, AND THAT IS THE
 * INTERESTING DIFFERENCE.** `BUFFER_EMITTER` does NOT cross this board's follower boundary:
 * `addFollower` puts the transistor, the emitter resistor and the output cap on it and nothing
 * outside the block touches it. On the loop board the loop's DC-blocking cap taps exactly that
 * net, so there the same block has one more interface port. One function, two boundaries,
 * because a boundary is a property of the board and not of the function.
 *
 * **THE DESIGNATORS ARE THE BOARD'S OWN**, imported from `../buffered-board.ts`'s `DESIGNATORS`,
 * which is *"stage 1's exactly as on the feedback board, then the follower's"*.
 */

import { DESIGNATORS, transistorPreampBuffered } from "../buffered-board.ts"
import {
  RAILS,
  STAGE_PORT_DIRECTIONS,
  UNSOURCED,
  autoBlock,
  complementOf,
  contextFor,
  followerMembers,
  sheetFor,
  stageLegBlocks,
} from "./preamp-boards.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

const SHEET = "buffered"

/** `IN_EXT` is this board's own `input` port: the signal arrives at the input header. */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  ...STAGE_PORT_DIRECTIONS,
  IN_EXT: "in",
}

const CONTEXT = contextFor(PORT_DIRECTIONS)

const NETWORK = transistorPreampBuffered()

/**
 * `addFollower`'s own six components: the soft divider, Q2, its emitter resistor, the output
 * coupling cap and the output header.
 *
 * `BUFFER_BASE` crosses because stage 1's `output_coupling_cap` lands there; `VCC` and `GND` are
 * rails; `OUT` is the declared `output` port. `BUFFER_EMITTER` does not cross - see the header.
 */
const FOLLOWER: BlockDeclaration = autoBlock(
  "tp-follower",
  SHEET,
  "Emitter follower output stage",
  followerMembers(),
  ["BUFFER_BASE", "VCC", "GND", "OUT"],
  CONTEXT,
)

const LEG_BLOCKS = stageLegBlocks(SHEET, CONTEXT)

/**
 * The complement: stage 1's core, the input and power headers, and the supply decoupling - eight
 * components, and the same eight on the loop and staged boards.
 *
 * `BUFFER_BASE` is on its interface because `output_coupling_cap` is in this block and lands on
 * the follower's base, which is the one wire this board changed from the feedback board: *"only
 * its output coupling cap (C3) now lands on the follower's base."*
 */
const CORE: BlockDeclaration = autoBlock(
  "tp-stage",
  SHEET,
  "Collector-feedback gain stage, coupling, decoupling and headers",
  complementOf(NETWORK, [...LEG_BLOCKS, FOLLOWER]),
  ["IN_EXT", "BUFFER_BASE", "VCC", "GND", "BASE", "EMITTER", "COLLECTOR", "BYPASS_CAP"],
  CONTEXT,
)

/**
 * NO OVERRIDES. All 21 components declare their own symbol in the model, through the shared
 * constructors in `../parts.ts`, and every pin is in a vocabulary a reviewed rule maps.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {}

export const TRANSISTOR_PREAMP_BUFFERED_SCHEMATIC: SchematicAuthoring = {
  project: "transistor-preamp-buffered",
  designators: DESIGNATORS,
  blocks: [...LEG_BLOCKS, FOLLOWER, CORE],
  sheets: sheetFor(SHEET, "Transistor preamp buffered board", "transistor-preamp-buffered.kicad_sch"),
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "docs/superpowers/specs/2026-09-24-transistor-preamp-buffered-design.md, which " +
      "circuits/transistor-preamp/buffered-board.ts names as \"the authority for every part and " +
      "value below\" - the brief's Build 3. Stage 1's parts, values and designators are the " +
      "feedback board's, built by its own addFeedbackStage; Q2's operating point is " +
      "deliberately left soft and is a bench measurement rather than a design target",
    bom: UNSOURCED,
  },
}
