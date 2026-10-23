/**
 * Schematic authoring declaration for `../loop-board.ts`'s `transistorPreampLoop()`.
 *
 * **THE BUFFERED BOARD WITH ONE FEEDBACK LOOP AROUND BOTH STAGES, AND THE LOOP IS WHY THIS
 * BOARD'S BLOCKS ARE NOT THE BUFFERED BOARD'S PLUS ONE.** `../loop-board.ts` is
 * `addFeedbackStage` plus `addFollower` plus four parts of its own, so four of its seven blocks
 * are the ones `./buffered-board.ts` declares, from the same two shared functions and the same
 * `FEEDBACK_LEGS`.
 *
 * **WHAT THE LOOP CHANGES IS A BOUNDARY, NOT A MEMBERSHIP, AND THAT IS THE THING WORTH SAYING.**
 * `addFollower` builds the identical six components here, but `loop_feedback_cap` taps
 * `BUFFER_EMITTER` from outside the follower, so **the follower block has five interface ports on
 * this board and four on the buffered board.** One function, two boundaries: a boundary is a
 * property of the board. Nothing in the follower's declaration changed and nothing here pretends
 * it did.
 *
 * **THE LOOP IS CUT ACROSS TWO BLOCKS, DELIBERATELY, AND IT IS THE SECOND INSTANCE OF A CALL
 * `./authoring.ts` ALREADY MADE ONCE.** `LOOP_LEG` declares the loop's trimmable resistance - a
 * 22k floor and a 200k trim - and `Leg` has no slot for a capacitor, so `loop_feedback_cap`
 * (which `../loop-board.ts` describes as the other working half of the loop: *"C6 ... blocks DC,
 * so the loop acts on the signal only"*) is declared outside the constant and lands in the stage
 * core. `LOOP_CAP` therefore becomes an interface net of both blocks. **Following the declaration
 * rather than the electricity is plan decision D1's point**; the alternative is this file choosing
 * the cut, and `./authoring.ts` names the same alternative and declines it for
 * `emitter_bypass_cap`.
 *
 * **`input_resistor` IS IN THE STAGE CORE AND IT IS THE OTHER HALF OF THE GAIN-SETTING PAIR**
 * (*"R9 22k and RV5 200k ... set the amount of feedback"*, with *"a series input resistor as the
 * other half"*). It is in the core because nothing declares it part of the loop: it is built by
 * `transistorPreampLoop()` directly, between the input header and `IN_EXT`, and it is the reason
 * this is the one board whose `input` port is `IN_SOURCE` rather than `IN_EXT`.
 */

import { DESIGNATORS, LOOP_LEG, transistorPreampLoop } from "../loop-board.ts"
import {
  RAILS,
  STAGE_PORT_DIRECTIONS,
  UNSOURCED,
  autoBlock,
  complementOf,
  contextFor,
  followerMembers,
  legMembers,
  sheetFor,
  stageLegBlocks,
} from "./preamp-boards.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

const SHEET = "loop"

/**
 * **`IN_SOURCE`, NOT `IN_EXT`, AND IT IS THE ONLY BOARD OF THE FOUR WHERE THEY DIFFER.**
 * `../loop-board.ts` declares `.port("input", IN_SOURCE)` and puts `input_resistor` between
 * `IN_SOURCE` and `IN_EXT`, so `IN_EXT` is an interior node here and not a boundary net at all.
 * It therefore has no entry. `authoringProblems` would ACCEPT one - `IN_EXT` is a net this
 * network has pins on - so this is a declaration and not a rule being satisfied: a direction on
 * an interior node asserts a boundary the circuit does not have.
 */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  ...STAGE_PORT_DIRECTIONS,
  IN_SOURCE: "in",
}

const CONTEXT = contextFor(PORT_DIRECTIONS)

const NETWORK = transistorPreampLoop()

/**
 * `addFollower`'s own six components - identical to the buffered board's, with `BUFFER_EMITTER`
 * added to the interface because `loop_feedback_cap` taps it from outside. See the header.
 */
const FOLLOWER: BlockDeclaration = autoBlock(
  "tp-follower",
  SHEET,
  "Emitter follower output stage",
  followerMembers(),
  ["BUFFER_BASE", "BUFFER_EMITTER", "VCC", "GND", "OUT"],
  CONTEXT,
)

/**
 * `LOOP_LEG`: the 22k floor and the 200k trim, which `addLeg(builder, LOOP_LEG, "LOOP",
 * "LOOP_CAP", "BASE")` puts between the loop cap and stage 1's base. `LOOP_FLOOR` is internal to
 * the leg; the two nets its own call site names are its interface.
 */
const LOOP_BLOCK: BlockDeclaration = autoBlock(
  "tp-leg-loop",
  SHEET,
  "Global feedback loop leg",
  legMembers(LOOP_LEG),
  ["LOOP_CAP", "BASE"],
  CONTEXT,
)

const LEG_BLOCKS = stageLegBlocks(SHEET, CONTEXT)

const CLAIMED = [...LEG_BLOCKS, FOLLOWER, LOOP_BLOCK]

/**
 * The complement: stage 1's core and the headers, plus the two parts of this board's own that no
 * declared leg or function claims - `input_resistor` and `loop_feedback_cap`.
 *
 * `LOOP_CAP` is on its interface because `loop_feedback_cap` is in this block and the loop leg is
 * not; `BUFFER_EMITTER` is because that cap taps the follower's emitter.
 */
const CORE: BlockDeclaration = autoBlock(
  "tp-stage",
  SHEET,
  "Collector-feedback gain stage, input resistor, loop blocking cap and headers",
  complementOf(NETWORK, CLAIMED),
  ["IN_SOURCE", "BUFFER_BASE", "BUFFER_EMITTER", "LOOP_CAP", "VCC", "GND", "BASE", "EMITTER", "COLLECTOR", "BYPASS_CAP"],
  CONTEXT,
)

/**
 * NO OVERRIDES. All 25 components declare their own symbol in the model, through the shared
 * constructors in `../parts.ts`, and every pin is in a vocabulary a reviewed rule maps.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {}

export const TRANSISTOR_PREAMP_LOOP_SCHEMATIC: SchematicAuthoring = {
  project: "transistor-preamp-loop",
  designators: DESIGNATORS,
  blocks: [...CLAIMED, CORE],
  sheets: sheetFor(SHEET, "Transistor preamp loop board", "transistor-preamp-loop.kicad_sch"),
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "docs/superpowers/specs/2026-09-25-transistor-preamp-loop-design.md, which " +
      "circuits/transistor-preamp/loop-board.ts names as \"the authority for every part and " +
      "value below\" - the brief's Build 4, first step. Stage 1 and the follower are the " +
      "buffered board's, built by the same shared functions; the loop's own values are starting " +
      "points and the module asks for a scope check for oscillation at both ends of RV5",
    bom: UNSOURCED,
  },
}
