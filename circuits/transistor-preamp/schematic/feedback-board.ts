/**
 * Schematic authoring declaration for `../feedback-board.ts`'s `transistorPreampFeedback()`.
 *
 * **THE BOARD THE OPERATOR BUILT AND TUNED, AND THE SIMPLEST OF THE FIVE: 16 components, no
 * jumpers and no test points.** `../feedback-board.ts` says why it exists - *"the lab board's 32
 * parts made stripboard placement confusing; this one has 16"* - and that difference shows up
 * here as the one structural thing worth saying.
 *
 * **IT HAS FOUR BLOCKS WHERE THE LAB BOARD HAS SIX, AND THE TWO IT LACKS ARE NOT A SIMPLIFICATION
 * OF THE LAB BOARD'S - THEY ARE ABSENT FROM THE CIRCUIT.** `LEGS` on the lab board declares six
 * legs, four of them with a jumper; `FEEDBACK_LEGS` here declares four and none has a jumper at
 * all, because *"there are no jumpers, so a leg is taken out by removing its fixed resistor."*
 * So three of this board's four leg blocks are two components (a floor resistor and a trim) and
 * the fourth is one, where the lab board's are three. **The consequence for the drawing is
 * measurable and is the reason this is worth writing down:** the lab board's only generation
 * failure is inside `tp-leg-emitter-bypass` on a `Jumper:Jumper_2_Open` and on two global labels
 * of the nets a jumper creates (`docs/known-gaps.md` **G247**, **G262**), and **this board has no
 * jumper and neither net.**
 *
 * **ONE LEG BLOCK HOLDS A SINGLE COMPONENT**, `emitter_bypass_trim`, and that is what
 * `FEEDBACK_LEGS.emitterBypass` declares: a trim-pot, no floor, no jumper. Its series capacitor
 * is declared outside the leg constant and lands in the stage core - `./preamp-boards.ts`'s
 * header carries the reasoning, which is `./authoring.ts`'s and plan decision **D1**'s.
 *
 * **THE DESIGNATORS ARE THE BOARD'S OWN**, imported from `../feedback-board.ts`'s `DESIGNATORS`
 * rather than restated. That map is where the semantic and the KiCad vocabularies meet for this
 * circuit and it is *"numbered leg by leg, so each leg's fixed resistor and trim share a
 * number"*; copying it here would create a second copy to drift.
 */

import { DESIGNATORS, transistorPreampFeedback } from "../feedback-board.ts"
import {
  RAILS,
  STAGE_PORT_DIRECTIONS,
  UNSOURCED,
  autoBlock,
  complementOf,
  contextFor,
  sheetFor,
  stageLegBlocks,
} from "./preamp-boards.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

const SHEET = "feedback"

/** `IN_EXT` is this board's own `input` port: the signal arrives at the input header. */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  ...STAGE_PORT_DIRECTIONS,
  IN_EXT: "in",
}

const CONTEXT = contextFor(PORT_DIRECTIONS)

const NETWORK = transistorPreampFeedback()

const LEG_BLOCKS = stageLegBlocks(SHEET, CONTEXT)

/**
 * The complement: stage 1's core, the three headers and the supply decoupling.
 *
 * **NINE COMPONENTS, WHICH IS ONE MORE THAN THE SAME BLOCK ON THE OTHER THREE BOARDS**, because
 * `output_header` is built by `transistorPreampFeedback()` itself here and by `addFollower` on
 * the boards that have a follower. That is the circuit's own declaration of where it belongs and
 * not a choice made here.
 *
 * Its interface is the seven nets the circuit declares as ports plus `BYPASS_CAP`, which leaves
 * because `emitter_bypass_cap` is inside this block and `emitter_bypass_trim` is in the bypass
 * leg.
 */
const CORE: BlockDeclaration = autoBlock(
  "tp-stage",
  SHEET,
  "Collector-feedback gain stage, coupling, decoupling and headers",
  complementOf(NETWORK, LEG_BLOCKS),
  ["IN_EXT", "OUT", "VCC", "GND", "BASE", "EMITTER", "COLLECTOR", "BYPASS_CAP"],
  CONTEXT,
)

/**
 * NO OVERRIDES. All 16 components declare their own symbol in the model, through the shared
 * constructors in `../parts.ts`, and every pin is in a vocabulary a reviewed rule maps: `a`/`b`
 * and `ccw`/`wiper`/`cw` positionally, `base`/`collector`/`emitter` by the symbol's own pin
 * names, and the two headers' `1`/`2` as pin numbers directly.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {}

export const TRANSISTOR_PREAMP_FEEDBACK_SCHEMATIC: SchematicAuthoring = {
  project: "transistor-preamp-feedback",
  designators: DESIGNATORS,
  blocks: [...LEG_BLOCKS, CORE],
  sheets: sheetFor(SHEET, "Transistor preamp collector-feedback board", "feedback.kicad_sch"),
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "circuits/transistor-preamp/feedback-board.ts, which is the authority for every part and " +
      "value and names its own: the brief's Build 2B in " +
      "docs/transistor-preamp/microphone-preamp-feedback-lab.md, cut down from the lab board " +
      "(docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md) to its " +
      "collector-feedback legs with the same parts, ranges and rheostat wiring. Values are " +
      "bench starting points, not design targets, and the capacitors are placeholders until the " +
      "bench confirms them",
    bom: UNSOURCED,
  },
}
