/**
 * WHAT THE FOUR LATER TRANSISTOR-PREAMP BOARDS' AUTHORING DECLARATIONS SHARE, and only what they
 * share.
 *
 * `./authoring.ts` is the lab board's and was written first; the four boards beside it -
 * `buffered`, `feedback`, `loop`, `staged` - are `docs/known-gaps.md` **G247**'s subject, which
 * warns in so many words that *"four different [leg-constant] shapes and `buffered-board.ts`
 * exports none at all - so each of the four needs its own answer to 'what declares this board's
 * blocks', which is Task 9's work and is a decision per board rather than a copy."*
 *
 * **G247 IS RIGHT ABOUT THE LEG CONSTANTS AND THE CONCLUSION IT DRAWS IS TOO STRONG BY ONE STEP,
 * AND THE STEP IS WORTH NAMING.** It read the four exported leg constants - `FEEDBACK_LEGS`,
 * `LOOP_LEG`, `CHARACTER_LEG`, and none on `buffered` - as four different answers to "what
 * declares this board's blocks". They are not four answers; they are **one answer plus a
 * per-board addition**, because three of the four boards do not declare a bias network at all:
 * they call `addFeedbackStage`, which `./feedback-board.ts` exports and which builds
 * `FEEDBACK_LEGS` on every board that uses it. `buffered-board.ts` exports no leg constant for
 * the same reason it declares no bias network - it has none of its own.
 *
 * So the four boards' blocks come from THREE declaration sources, all of them already in the
 * circuit modules and none of them chosen here:
 *
 * | source | what it declares | which boards |
 * | --- | --- | --- |
 * | `FEEDBACK_LEGS` | four bias legs of the collector-feedback stage | all four |
 * | a SHARED BUILDER FUNCTION, run alone | `addFollower`'s own component set | buffered, loop, staged |
 * | a board's OWN `DESIGNATORS` keys beyond its parent's | what this board adds | loop, staged |
 * | the board's own extra leg constant | `LOOP_LEG`, `CHARACTER_LEG` | loop, staged |
 *
 * **THE SECOND SOURCE IS NEW HERE AND IS A MEASUREMENT, NOT A TRICK.** `addFollower(builder)` can
 * be run on an empty builder and `done()` accepts the result: six components and the `output`
 * port, with no reference to anything stage 1 builds. `[RAN]` and recorded in
 * `docs/known-gaps.md`; its CONTROL is `addFeedbackStage`, which REFUSES the same way
 * (*"net \"IN_EXT\" has only one component pin and is not a declared port"*) because each board
 * owns its own input header - so the probe distinguishes the two functions rather than accepting
 * both. A function that stands alone IS a declaration of a block's membership, and reading it is
 * not the string-prefix matching decision **D1** forbids.
 *
 * **THE COMPLEMENT IS THE STAGE-1 CORE, exactly as `./authoring.ts` derives its seventh block**,
 * and on three of the four boards it is the same eight components.
 *
 * **ONE MEMBERSHIP IS DELIBERATELY NOT WHAT THE ELECTRICITY SUGGESTS, and it is the same call
 * `./authoring.ts` already documents.** `emitter_bypass_cap` sits electrically inside the emitter
 * bypass branch and is declared OUTSIDE `FEEDBACK_LEGS`, because `Leg` has slots for a jumper, a
 * floor resistor and a trim-pot and not for a capacitor. The loop board does it again at a second
 * place: `LOOP_LEG` declares the floor resistor and the trim, and `loop_feedback_cap` - which the
 * module comment calls part of the loop ("C6 ... blocks DC, so the loop acts on the signal only")
 * - is declared outside it. Both land in the complement, and `BYPASS_CAP` and `LOOP_CAP` become
 * interface nets of two blocks each. **Following the declaration rather than the electricity is
 * D1's point**; the alternative is this file choosing a cut.
 */

import { negotiablePort } from "../../../lib/schgen/authoring.ts"
import { circuit } from "../../../lib/model/index.ts"
import { addFollower } from "../buffered-board.ts"
import { FEEDBACK_LEGS } from "../feedback-board.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"
import type { Leg } from "../parts.ts"
import type { Network } from "../../../lib/model/index.ts"
import type { RailSpec, SheetSpec } from "../../../lib/schgen/ir/types.ts"

/**
 * The component ids of one declared leg, in the order `addLeg` adds them.
 *
 * **MOVED HERE FROM `./authoring.ts`, WHICH NOW IMPORTS IT** rather than keeping a private copy:
 * `CLAUDE.md`'s *"supersede means delete"*, and a second copy of this would be a second thing to
 * keep in step with `Leg`'s shape.
 */
export function legMembers(leg: Leg): readonly string[] {
  const ids: string[] = []
  if (leg.jumperId !== undefined) ids.push(leg.jumperId)
  if (leg.floor !== undefined) ids.push(leg.floor.id)
  ids.push(leg.trimId)
  return ids
}

/**
 * `VCC` and `GND`, and neither is forced by a `power_in` pin: as on the lab board, these circuits
 * have no active device with a power pin - the 2N3904's three terminals are all signal - so these
 * are declared because they ARE the board's rails and not because a validation rule insists.
 *
 * `pwrFlag` is null for the reason `circuits/opamp-buffer.schematic.ts` gives.
 */
export const RAILS: readonly RailSpec[] = [
  { net: "VCC", symbol: "power:VCC", kind: "supply", pwrFlag: null },
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null },
]

/**
 * The port directions every board that calls `addFeedbackStage` shares, which is the five ports
 * that function declares (`vcc`, `ground`, `base`, `emitter`, `collector`) plus `OUT`.
 *
 * `BASE`, `EMITTER` and `COLLECTOR` are `bidirectional` for the reason `./authoring.ts` gives at
 * length: the lab board declares them ports so a fitted jumper cannot rename the canonical net,
 * and what leaves the board at each of them is a probe or a clip. A probe neither drives nor is
 * driven, so `bidirectional` is the arrow that asserts nothing. **These boards have no test
 * points and no jumpers at all** - `addFeedbackStage` declares the three ports anyway, and the
 * reading is unchanged: the thing that reaches one is a probe.
 *
 * The board's own input net is NOT here, because it is the one port the boards disagree about:
 * three declare `input` on `IN_EXT` and the loop board declares it on `IN_SOURCE`, with a 4.7k
 * series resistor between them. Each board adds its own entry.
 */
export const STAGE_PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  OUT: "out",
  VCC: "in",
  GND: "bidirectional",
  BASE: "bidirectional",
  EMITTER: "bidirectional",
  COLLECTOR: "bidirectional",
}

/**
 * `addFollower`'s own six components, derived by running it on an empty builder.
 *
 * See the header: the run is the measurement, `addFeedbackStage` is its control, and the function
 * standing alone is what makes this a declaration rather than a guess at a boundary.
 */
export function followerMembers(): readonly string[] {
  const builder = circuit()
  addFollower(builder)
  return builder.done().components.map((c) => c.id)
}

/** Which of `FEEDBACK_LEGS` is which block, with the nets its OWN call site declares at its ends. */
const STAGE_LEG_BLOCKS: readonly {
  readonly leg: keyof typeof FEEDBACK_LEGS
  readonly id: string
  readonly title: string
  /** The `from` and `to` `addFeedbackStage` passes, plus a net a non-member sits on. */
  readonly interface: readonly string[]
}[] = [
  // addLeg(builder, FEEDBACK_LEGS.feedback, "FEEDBACK", COLLECTOR, BASE)
  { leg: "feedback", id: "tp-leg-feedback", title: "Collector-feedback bias leg", interface: ["COLLECTOR", "BASE"] },
  // addLeg(builder, FEEDBACK_LEGS.baseToGround, "BASE_GROUND", BASE, GND)
  { leg: "baseToGround", id: "tp-leg-base-ground", title: "Base-to-ground bias leg", interface: ["BASE", "GND"] },
  // addLeg(builder, FEEDBACK_LEGS.collector, "COLLECTOR_LOAD", VCC, COLLECTOR)
  { leg: "collector", id: "tp-leg-collector", title: "Collector load leg", interface: ["VCC", "COLLECTOR"] },
  // trim(bypass.trimId, bypass.trim, "BYPASS_CAP", GND) - built WITHOUT addLeg, because the leg
  // has neither a jumper nor a floor resistor. BYPASS_CAP leaves because emitter_bypass_cap sits
  // on it and is declared outside FEEDBACK_LEGS: see the header.
  { leg: "emitterBypass", id: "tp-leg-emitter-bypass", title: "Emitter AC bypass leg", interface: ["BYPASS_CAP", "GND"] },
]

/** The four `FEEDBACK_LEGS` blocks `addFeedbackStage` puts on every board that calls it. */
export function stageLegBlocks(sheet: string, context: InterfaceContextOf): readonly BlockDeclaration[] {
  return STAGE_LEG_BLOCKS.map((b): BlockDeclaration => ({
    id: b.id,
    sheet,
    title: b.title,
    members: legMembers(FEEDBACK_LEGS[b.leg]),
    rendering: { kind: "auto" },
    anchor: null,
    interface: b.interface.map((net) => negotiablePort(net, context)),
    prefixes: { prefixes: [], why: null },
  }))
}

/** What `negotiablePort` needs: a board's port directions beside the shared rails. */
export interface InterfaceContextOf {
  readonly portDirections: Readonly<Record<string, PortDirection>>
  readonly rails: readonly RailSpec[]
}

/** A board's own `{ portDirections, rails }`, so no board assembles it twice. */
export function contextFor(portDirections: Readonly<Record<string, PortDirection>>): InterfaceContextOf {
  return { portDirections, rails: RAILS }
}

/** One `{ kind: "auto" }` block with a declared interface and no include() prefix. */
export function autoBlock(
  id: string,
  sheet: string,
  title: string,
  members: readonly string[],
  nets: readonly string[],
  context: InterfaceContextOf,
): BlockDeclaration {
  return {
    id,
    sheet,
    title,
    members,
    // No template on any block, for the reason `circuits/opamp-buffer.schematic.ts` gives:
    // declaring one would be choosing an arrangement, and this file has no criterion for that
    // choice. docs/known-gaps.md G141 records the consequence.
    rendering: { kind: "auto" },
    anchor: null,
    interface: nets.map((net) => negotiablePort(net, context)),
    // Uncomposed: none of these boards uses include(). The shared builder functions push
    // components onto one flat builder, so there is no prefix in any id.
    prefixes: { prefixes: [], why: null },
  }
}

/** The ids of every component of `network` that no block in `blocks` claims, in network order. */
export function complementOf(network: Network, blocks: readonly BlockDeclaration[]): readonly string[] {
  const claimed = new Set(blocks.flatMap((b) => b.members))
  return network.components.map((c) => c.id).filter((id) => !claimed.has(id))
}

/** One sheet per board: the generator's output file, never the authored `*-board.kicad_sch`. */
export function sheetFor(id: string, title: string, file: string): readonly SheetSpec[] {
  return [{ id, title, file, paper: "A3", notes: [] }]
}

/**
 * The `declared.bom` every one of these four boards carries, which is the same declaration
 * `./authoring.ts` makes for the lab board and for the same reason.
 */
export const UNSOURCED: SchematicAuthoring["declared"]["bom"] = {
  kind: "unsourced",
  why:
    "no boards/transistor-preamp-*/bom.json exists (two of the eleven boards in this repository " +
    "have one, and no preamp board is either of them), and the two that exist are keyed by BOARD " +
    "LINE - a \"<kind> <value> <footprint>\" string resolving to a parts/*.json catalog id - with " +
    "nothing joining a line to a circuit model's component. The model carries mpn on the RM-065 " +
    "trimmers and the 2N3904s and has no slot at all for Manufacturer, Supplier or SupplierPart. " +
    "The four keys are empty BY DECLARATION rather than invented; the IR's own bomFields rule, " +
    "through validateSourcing, then names every non-exempt part for any consumer that has to " +
    "source and place them - it does not gate a drawing (Task 20 and docs/known-gaps.md G245).",
}
