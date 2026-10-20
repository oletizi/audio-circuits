/**
 * THE LAYOUT OPTIONS HANDED TO `elkjs`, AND WHERE EVERY VALUE COMES FROM.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. **Nothing in this file was chosen
 * because a drawing looked better with it.** Each value cites the decision, the specification
 * clause or the ported constant it comes from, because `CLAUDE.md`'s governing invariant forbids
 * the agent producing an artifact from authoring the criteria it is judged by - and "tune the
 * options until the picture improves" is exactly that failure with a dial attached.
 *
 * **THE ONE MECHANISM THAT TRANSFERS FROM `netlistsvg`** (spec §1.2): *"every symbol declares
 * which SIDE each pin leaves from, and ELK is told those port positions are FIXED. That one
 * constraint is what turns a generic layered graph drawing into something that reads like a
 * circuit."* `NODE_OPTIONS` is that sentence. **What does NOT transfer is the code path**:
 * `netlistsvg` emits SVG through a skin and this emits `.kicad_sch`, so a node's size here is the
 * symbol library's own `boxes` entry in micrometres and a port is a `LibPin`'s transformed end -
 * not a skin template's declared extent. `docs/known-gaps.md` **G180** records which spike
 * figures were properties of that skin and are therefore not predictions about this driver.
 */

import { GRID, type Um } from "../render/geometry.ts"
import { PITCH, STUB } from "../render/layout-kit.ts"
import type { PinSide } from "../rules/pin-sides.ts"

/**
 * ELK's four port sides, as `"elk.port.side"` spells them.
 *
 * The two vocabularies are the same four edges: `rules/pin-sides.ts` says `top`/`bottom` because a
 * block interface is described by the EDGE a pin sits on, and ELK says `NORTH`/`SOUTH`. This is
 * the one place they meet, and there is no default - a `PinSide` this record does not name fails
 * to typecheck here rather than reaching ELK as an unconstrained port.
 */
export const ELK_SIDE: Readonly<Record<PinSide, string>> = {
  left: "WEST",
  right: "EAST",
  top: "NORTH",
  bottom: "SOUTH",
}

/** `ELK_SIDE`'s image, for a test that pins the vocabulary without restating the mapping. */
export const ELK_SIDES: readonly string[] = ["NORTH", "SOUTH", "EAST", "WEST"]

/**
 * Within-layer node separation, in micrometres: the ported templates' own `STUB`.
 *
 * **WHY A PORTED CONSTANT AND NOT A NUMBER THIS WRITER LIKED.** Spec §3.1 makes the templates the
 * reviewed human arrangement and ELK the thing being made to match it, so the spacing a template
 * already uses is a reviewed value and a fresh one would not be. `STUB` is
 * `lib/schgen/render/layout-kit.ts`'s own `2 * GRID` - the offset `ladder` leaves between a row
 * and the anchor it stubs out to, and the gap it opens above its first row (`origin.y + STUB +
 * GRID`). It is imported rather than restated so the two cannot drift.
 */
export const NODE_SEPARATION: Um = STUB

/**
 * Between-layer separation, in micrometres: the ported templates' own `PITCH`.
 *
 * `PITCH` is `4 * GRID` and `columnXs` uses it as the MINIMUM x-step between adjacent rung
 * columns - `Math.max(PITCH, step)`. Under decision **D4** (`elk.direction = "RIGHT"`) ELK's
 * layers advance along x, so a layer step is the same quantity a template's column step is.
 *
 * **WHICH ported constant maps to which ELK option is this writer's reading of "in whole grid
 * steps", and it is recorded as such** in `docs/known-gaps.md` **G180**: both are whole grid
 * steps and both are reviewed, but nothing in the spec or the plan states the correspondence.
 * Task 17's re-measurement is the criterion.
 */
export const LAYER_SEPARATION: Um = PITCH

/** Whole grid steps, which is what the plan asks both spacings to be - asserted, not assumed. */
export function wholeGridSteps(v: Um): boolean {
  return Number.isInteger(v) && v % GRID === 0
}

/**
 * The root graph's options.
 *
 * - `elk.algorithm = layered` - spec §1.1's measured algorithm; both spikes ran `layered` and
 *   every figure in **G94** through **G101** is about it.
 * - `elk.direction = RIGHT` - plan decision **D4**, which pins flow left-to-right and states its
 *   own cost: *"both spikes' numbers were taken under `DOWN`"*, the analog skin's direction, *"so
 *   every figure in §1.1, §1.8, §3.3 and §3.4 may move."*
 * - `elk.edgeRouting = ORTHOGONAL` - a schematic wire is axis-aligned; a KiCad `wire` is a
 *   two-point segment and nothing in the emitter can draw a spline.
 * - the two spacings above.
 */
export const BLOCK_OPTIONS: Readonly<Record<string, string>> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": String(NODE_SEPARATION),
  "elk.layered.spacing.nodeNodeBetweenLayers": String(LAYER_SEPARATION),
}

/**
 * Every node's options, and the whole of what spec §1.2 says transfers.
 *
 * `FIXED_POS` and not `FIXED_SIDE` or `FIXED_ORDER`: a symbol's pins are at coordinates the
 * library states, so the constraint is the position and not merely the edge. The weaker
 * constraints would let ELK slide a pin along its edge, and a pin that has moved is a pin a wire
 * cannot be attached to without a second transform - which spec §1.4 obligation 3 forbids by
 * name (*"the transform is applied once, to the library pin geometry, and the result is what both
 * ELK and the emitter see"*).
 *
 * It is on EVERY node, boundary-port nodes included, so that no node is quietly unconstrained.
 */
export const NODE_OPTIONS: Readonly<Record<string, string>> = {
  "elk.portConstraints": "FIXED_POS",
}

/**
 * The layer a boundary-port node is pinned to, from the sides `negotiablePort` gives it, or `null`
 * for "the reviewed rule leaves this open".
 *
 * **THE SIDES ARE NOT DECIDED HERE.** `lib/schgen/authoring.ts`'s `negotiablePort` already states,
 * in the tree and reviewed, where a crossing net attaches: a rail where `RailSpec` says its glyph
 * goes (ground at the bottom, supply at the top) and every other net on the left for `in`, the
 * right for `out`, and either for `bidirectional` or for a net the model declares no direction
 * for. This function is only D4's flow applied to that answer - leftmost layer for a net that
 * arrives, rightmost for one that leaves.
 *
 * **A rail gets `null`, and that is the honest answer rather than a gap.** Top and bottom are not
 * layers under `direction = RIGHT`; where a rail's glyph sits inside the block is seam B's
 * question (**D9**, spec §1.9) and not a layering constraint this backend can express.
 */
export function layerConstraintFor(sides: readonly PinSide[]): string | null {
  const horizontal = sides.filter((s) => s === "left" || s === "right")
  if (horizontal.length !== 1) return null
  return horizontal[0] === "left" ? "FIRST_SEPARATE" : "LAST_SEPARATE"
}

/** The option key `layerConstraintFor`'s value goes under. */
export const LAYER_CONSTRAINT_KEY = "elk.layered.layering.layerConstraint"

/** The option key a port's side goes under. */
export const PORT_SIDE_KEY = "elk.port.side"
