/**
 * Schematic authoring declaration for `../staged-board.ts`'s `transistorPreampStaged()`.
 *
 * **THE BIGGEST OF THE FIVE PREAMP BOARDS - 34 components - AND THE ONLY ONE WITH A SECOND
 * VOLTAGE-GAIN STAGE AND FRONT-PANEL CONTROLS.** `../staged-board.ts` is `addFeedbackStage` plus
 * Q3's stage plus `addFollower`, with three panel pots on headers, and the module comment is the
 * authority for what each control does.
 *
 * **SEVEN BLOCKS, AND THE ONE THAT IS NEW NEEDS A DECLARATION SOURCE NEITHER `FEEDBACK_LEGS` NOR
 * A SHARED FUNCTION PROVIDES.** Q3's stage is not a leg and not a shared builder: it is written
 * inline in `transistorPreampStaged()`. What DOES declare it is the board's own designator map,
 * which is written `{ ...buffered.DESIGNATORS, <thirteen keys> }` - *"the buffered board's, then
 * Q3's"*. **The spread is the declaration**: the thirteen keys the board adds are exactly the
 * parts it adds, and `ownAdditions()` below reads them off the two maps rather than listing them
 * again. A board that gains a part gains it in that map, and this file does not change.
 *
 * **`CHARACTER_LEG` IS A LEG CONSTANT THAT `addLeg` NEVER BUILDS, AND THE MODULE SAYS SO:**
 * *"CHARACTER's branch as a leg (floor R12 plus the panel pot), for legPosition. Built explicitly
 * below, because addLeg builds trim-pots, not panel pots."* It is still a declaration of a
 * block's membership - two components, in series between `CHARACTER_CAP` and `GND` - and it is
 * used as one. The two parts it names are therefore subtracted from the thirteen before the
 * second-stage block is declared, which is why the second-stage block holds eleven.
 *
 * **WHAT THE THREE ATTENUATORS DO TO THE BLOCK BOUNDARIES, because a reader would otherwise
 * expect three blocks and find one.** Each control is cap - pot - cap, *"so no pot carries DC or
 * moves a bias"*, and the two caps on either side of DRIVE and TRANSFORMER DRIVE belong to
 * different functional halves: `output_coupling_cap` (stage 1's, declared in
 * `addFeedbackStage`) feeds DRIVE's top, and `buffer_input_cap` feeds the follower's base. So
 * the attenuators are not separable into blocks of their own without cutting a declared unit -
 * the pots and the caps that are declared beside them sit in the second-stage block, and the two
 * caps that belong to stage 1 and to the follower stay where their own declarations put them.
 */

import { CHARACTER_LEG, DESIGNATORS, transistorPreampStaged } from "../staged-board.ts"
import * as buffered from "../buffered-board.ts"
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

const SHEET = "staged"

/** `IN_EXT` is this board's own `input` port: the signal arrives at the input header. */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  ...STAGE_PORT_DIRECTIONS,
  IN_EXT: "in",
}

const CONTEXT = contextFor(PORT_DIRECTIONS)

const NETWORK = transistorPreampStaged()

/**
 * The ids this board's `DESIGNATORS` declares beyond the buffered board's - read off the spread
 * rather than listed, so a part added to the board is added to this block without this file
 * being edited.
 */
function ownAdditions(): readonly string[] {
  return Object.keys(DESIGNATORS).filter((id) => buffered.DESIGNATORS[id] === undefined)
}

/**
 * `CHARACTER_LEG`: R12 (22R) and the CHARACTER panel pot, in series from the bypass cap to
 * ground. `CHARACTER_FLOOR` is internal to the leg; `CHARACTER_CAP` and `GND` are the nets the
 * board's own declarations put at its two ends.
 */
const CHARACTER_BLOCK: BlockDeclaration = autoBlock(
  "tp-leg-character",
  SHEET,
  "CHARACTER emitter-bypass leg",
  legMembers(CHARACTER_LEG),
  ["CHARACTER_CAP", "GND"],
  CONTEXT,
)

/**
 * `addFollower`'s own six components, with the same interface as on the buffered board: Q2's base
 * is reached by `buffer_input_cap` here rather than by stage 1's `output_coupling_cap`, which
 * changes which block sits on `BUFFER_BASE` and not whether the net crosses.
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

const CLAIMED_BEFORE_SECOND_STAGE = [...LEG_BLOCKS, CHARACTER_BLOCK, FOLLOWER]

/**
 * Q3's stage with the DRIVE and TRANSFORMER DRIVE attenuators: the board's own additions, less
 * the two `CHARACTER_LEG` already claims. Eleven components.
 *
 * Its interface: `DRIVE_TOP` (stage 1's output cap lands there), `BUFFER_BASE` (its last cap
 * feeds the follower), `CHARACTER_CAP` (the bypass cap is in this block and the CHARACTER leg is
 * not), and the two rails.
 */
const SECOND_STAGE: BlockDeclaration = autoBlock(
  "tp-second-stage",
  SHEET,
  "Second gain stage with DRIVE and TRANSFORMER DRIVE",
  ownAdditions().filter((id) => !legMembers(CHARACTER_LEG).includes(id)),
  ["DRIVE_TOP", "BUFFER_BASE", "CHARACTER_CAP", "VCC", "GND"],
  CONTEXT,
)

/**
 * The complement: stage 1's core, the input and power headers, and the supply decoupling - the
 * same eight components as on the buffered and loop boards.
 *
 * `DRIVE_TOP` is on its interface because `output_coupling_cap` is in this block and lands on
 * DRIVE's top, which is the one wire this board changed from the buffered board: *"only C3 now
 * lands on DRIVE's top instead of Q2's base."*
 */
const CORE: BlockDeclaration = autoBlock(
  "tp-stage",
  SHEET,
  "Collector-feedback gain stage, coupling, decoupling and headers",
  complementOf(NETWORK, [...CLAIMED_BEFORE_SECOND_STAGE, SECOND_STAGE]),
  ["IN_EXT", "DRIVE_TOP", "VCC", "GND", "BASE", "EMITTER", "COLLECTOR", "BYPASS_CAP"],
  CONTEXT,
)

/**
 * NO OVERRIDES. All 34 components declare their own symbol in the model, through the shared
 * constructors in `../parts.ts` - including the three panel pots, which carry
 * `Device:R_Potentiometer` and a 3-pin header footprint through `panelPot` - and every pin is in
 * a vocabulary a reviewed rule maps.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {}

export const TRANSISTOR_PREAMP_STAGED_SCHEMATIC: SchematicAuthoring = {
  project: "transistor-preamp-staged",
  designators: DESIGNATORS,
  blocks: [...CLAIMED_BEFORE_SECOND_STAGE, SECOND_STAGE, CORE],
  sheets: sheetFor(SHEET, "Transistor preamp staged board", "staged.kicad_sch"),
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md, which " +
      "circuits/transistor-preamp/staged-board.ts names as \"the authority for every part and " +
      "value below, and the decisions behind them\". Q1 and Q2 are the buffered board's, built " +
      "by the same shared functions; Q3's operating point is derived in the module from the " +
      "24 V rail and is checked by the operating-point simulation its powerUpChecks export runs",
    bom: UNSOURCED,
  },
}
