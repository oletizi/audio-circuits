/**
 * THE CIRCUIT-CONTEXT ORIENTATION RULE LIBRARY - step 2 of spec §1.5's authority order.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. `docs/known-gaps.md` **G99** calls a
 * drawn orientation the second load-bearing invention of the five: it *"decides whether ELK
 * crashes (G94), and moves crossings from 16 to 139 on one circuit"*.
 *
 * **SPEC §1.5's ORDER, VERBATIM, AND THIS MODULE IS ONLY THE MIDDLE OF IT:**
 *
 * 1. an explicit orientation in a reviewed template wins - *"a template is a human arrangement
 *    reviewed once (§3.1); its orientations are part of what was reviewed"*;
 * 2. **otherwise a circuit-context rule gives a preferred orientation. These are rule-library
 *    entries - circuit-independent, reviewed before the artifact exists - not per-block choices.**
 *    That is this file;
 * 3. ELK then places, *"subject to fixed port geometry"*, and *"may choose among orientations the
 *    rules leave open"*.
 *
 * **`null` IS A REAL ANSWER AND IT MEANS STEP 3, NOT "ROTATION 0".** A rule library that returned
 * a rotation for everything would silently take the backend's half of §1.5 away. So the library
 * holds exactly one entry, and everything else returns `null`.
 *
 * **THE ONE ENTRY, AND WHERE IT COMES FROM RATHER THAN FROM THIS AGENT'S TASTE.** `RailSpec` in
 * `lib/schgen/ir/types.ts` states the convention already, in the tree, as the documented meaning
 * of its own `kind` field: *"Ground rails are drawn at the bottom of blocks with downward
 * symbols; supplies at the top."* The entry is that sentence applied to a two-terminal passive
 * one of whose ends sits on a declared rail: the grounded end goes to the bottom, the supplied
 * end to the top. It is checked against the symbol's real geometry rather than assumed -
 * `Device:R`, `Device:C` and `Device:C_Polarized` as installed all put pin 1 at the top and pin 2
 * at the bottom at rotation 0, so a part whose GROUND end is pin 1 wants 180 and one whose ground
 * end is pin 2 wants 0, and this computes which rather than tabulating it.
 *
 * **SEMANTIC ORIENTATION AND PHYSICAL TRANSFORM STAY APART**, which is §1.5's other half: a
 * rotation here moves geometry and never pin identity, and `sideOfPin(rot, pin)` is how a rotated
 * part's sides are read. Nothing in this module rewrites a pin map.
 *
 * **THE CONSUMER.** `preferredOrientationsOf` in `../from-network.ts` applies it across a whole
 * circuit so the answer is measurable per part today; spec §1.5's step-3 backend (Task 12's ELK
 * driver) is the consumer that will act on it.
 */

import { ROTATIONS, type Rotation } from "../render/geometry.ts"
import { sideOfPin, type PinSide } from "./pin-sides.ts"
import type { LibSymbol } from "../render/library.ts"
import type { NetName, RailSpec } from "../ir/types.ts"
import type { ComponentKind } from "../../model/types.ts"

/**
 * Kinds the rail-end entry applies to: two-terminal passives with no drawn polarity of their own.
 *
 * `diode` is deliberately out although it is two-terminal. A diode's glyph carries a direction,
 * so "which end is up" is already decided by what the part does, and a rail rule that overrode it
 * would be a rule about current direction dressed up as a rule about rails. Nothing in this
 * repository has stated that convention, so this library does not invent it: a diode returns
 * `null` and reaches §1.5 step 3.
 */
const RAIL_END_KINDS: readonly ComponentKind[] = ["resistor", "capacitor", "inductor", "photoresistor"]

export interface OrientationContext {
  readonly symbol: LibSymbol
  /** Every pin of `symbol`, by number, with the net it is on or null for a no-connect. */
  readonly pinNets: ReadonlyMap<string, NetName | null>
  /** The circuit's declared rails, by net - the authoring file's declaration, never guessed here. */
  readonly rails: ReadonlyMap<NetName, RailSpec>
}

/** The side a rail end wants to be on, by rail kind. The `RailSpec` sentence quoted above. */
const SIDE_FOR_RAIL: Readonly<Record<RailSpec["kind"], PinSide>> = {
  ground: "bottom",
  supply: "top",
}

/**
 * The preferred rotation for a part of `kind` in `context`, or `null` for "the rules leave this
 * open" - which under spec §1.5 hands it to the backend and is not a synonym for 0.
 *
 * Returns a rotation only when exactly one rotation satisfies every rail-end constraint the
 * context produces. Two satisfying rotations means the constraints do not distinguish them (a
 * capacitor with both ends on ground rails, say) and one satisfying rotation is the answer; none
 * means the constraints contradict each other, and both of those are `null` rather than a pick.
 */
export function preferredOrientation(kind: ComponentKind, context: OrientationContext): Rotation | null {
  if (!RAIL_END_KINDS.includes(kind)) return null
  const constraints: { readonly pin: string; readonly side: PinSide }[] = []
  for (const [pin, net] of context.pinNets) {
    if (net === null) continue
    const rail = context.rails.get(net)
    if (rail === undefined) continue
    constraints.push({ pin, side: SIDE_FOR_RAIL[rail.kind] })
  }
  if (constraints.length === 0) return null
  const satisfying = ROTATIONS.filter((rot) =>
    constraints.every(({ pin, side }) => {
      const libPin = context.symbol.pins.find((p) => p.number === pin)
      return libPin !== undefined && sideOfPin(rot, libPin) === side
    }),
  )
  const only = satisfying.length === 1 ? satisfying[0] : undefined
  return only ?? null
}
