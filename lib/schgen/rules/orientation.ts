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
 * holds few entries and everything else returns `null`.
 *
 * **IT HELD EXACTLY ONE UNTIL 2026-10-25 AND NOW HOLDS TWO**, and the second exists only because
 * the owner supplied its criterion - *"signal flows left to right"* (`docs/known-gaps.md`
 * **G292**). `signalAxis` below has his words and the reasoning. **The two are ORDERED, not
 * merged**: the rail entry runs first and wins, so a grounded end still goes to the bottom; the
 * signal axis answers only where no rail constraint exists, which is the case §1.5 step 3 used to
 * take and which resolved in practice to rotation 0 - a VERTICAL axis, across the reading
 * direction. *"Left open"* was in practice *"drawn the way that reads worst"*, and nobody had said
 * otherwise until he did.
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
import { comparePinNumbers } from "../ir/order.ts"
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
 * THE OWNER'S LEFT-TO-RIGHT DIRECTIVE, for a two-terminal part with NO rail end: lay its axis
 * along the signal, which means both pins on the left and right sides rather than top and bottom.
 *
 * **IT IS HIS CRITERION AND NOT THIS MODULE'S.** Reviewing the first `pultec-hi-boost` sheet this
 * repository generated, 2026-10-25:
 *
 * > *"It would, however, be easier to read if the capacitors in the capacitor bank were rotated 90
 * > degrees and not fanned out to the top and bottom of the switch symbol, but arranged to the
 * > right of the switch symbol. signal flows left to right."*
 *
 * `docs/known-gaps.md` **G292** has it in full. Readability is exactly the class `CLAUDE.md`
 * reserves from the agent producing the artifact, and **G71** holds that a readability rule
 * invented here would be this project's invention wearing a citation - so this entry exists
 * because he supplied one, and it would not otherwise.
 *
 * **WHY THESE KINDS AND NO OTHERS: the same reasoning `RAIL_END_KINDS` already carries.** A part
 * whose glyph draws its own direction - a diode - has "which way round" decided by what the part
 * does, and turning it to suit a reading direction would be a rule about current dressed up as a
 * rule about layout. So this shares that list rather than widening it. **The probe that measured
 * this directive's value rotated EVERY non-rail part and is not what shipped**; G292 says so.
 *
 * **THE TIE-BREAK IS DETERMINISTIC AND IS NOT A CLAIM ABOUT SIGNAL DIRECTION.** Two rotations put
 * a two-pin part's ends left and right, differing only in which end is which. Choosing between
 * them properly needs the signal's direction through that net, and **the IR cannot express it**:
 * `portDirections` carries direction for boundary nets only, and G292 records that
 * `edgesForNet` currently directs every interior edge by declaration order. So the lower-numbered
 * pin goes left, stated as an arbitrary stable choice rather than dressed up as semantics. When
 * interior signal direction exists, this is the place that should consult it.
 */
function signalAxis(kind: ComponentKind, symbol: LibSymbol): Rotation | null {
  // `switch` is admitted for the two-pin jumper `switchFacesItsBank` declines - see
  // `TWO_TERMINAL_BY_GEOMETRY` at the call site for why that membership is the list's own stated
  // criterion rather than an escape hatch. A selector is answered by the turn and never arrives.
  if (!RAIL_END_KINDS.includes(kind) && !TWO_TERMINAL_BY_GEOMETRY.includes(kind)) return null
  const pins = symbol.pins.filter((p) => p.unit === 1 || p.unit === 0)
  if (pins.length !== 2) return null
  const [a, b] = pins
  if (a === undefined || b === undefined) return null
  const horizontal = ROTATIONS.filter((rot) => {
    const sides = [sideOfPin(rot, a), sideOfPin(rot, b)]
    return sides.includes("left") && sides.includes("right")
  })
  if (horizontal.length === 0) return null
  const lowerFirst = [...pins].sort((p, q) => comparePinNumbers(p.number, q.number))[0]
  const chosen = horizontal.find((rot) => sideOfPin(rot, lowerFirst!) === "left")
  return chosen ?? horizontal[0] ?? null
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
/**
 * A SWITCH IS TURNED 180 SO ITS THROWS FACE THE PARTS THAT FEED THEM - **and this is a HACK
 * standing in for reflection, which this generator cannot do.**
 *
 * The owner, 2026-10-26, on the generated Pultec sheets: *"the switch symbol should be reflected
 * across its vertical axis so the input connections point left instead of right. That should fix
 * the primary remaining goofiness."* He is right, and it did: `Switch:SW_Rotary_1x6_MP` draws its
 * throws on the right and its pole on the left, so a bank of capacitors feeding the throws from
 * upstream had every throw wire leave the symbol rightward, turn, and wrap back. Turning the
 * symbol puts the throws on the left, facing the bank, and those wires become short stubs.
 *
 * **180 IS NOT WHAT HE ASKED FOR AND THE DIFFERENCE IS VISIBLE.** A reflection across the vertical
 * axis swaps left for right and keeps the throws reading 1..6 down the symbol. A 180 rotation
 * reaches the same left-right arrangement and **reverses them to 6..1**. He accepted that -
 * *"rotation is ok"* - after seeing it rendered, and asked for reflection to be built properly
 * afterwards. `docs/known-gaps.md` **G295** carries both, and the estimate this writer inflated
 * when asked about the cost.
 *
 * **WHAT THIS ASSUMES, STATED SO IT CAN BE FOUND WHEN IT IS WRONG: that a switch's THROWS are its
 * input side.** That holds for a selector whose bank feeds it, which is every switch in the Pultec
 * sections. It is FALSE for a switch whose pole is fed and whose throws drive downstream - a
 * routing SPDT - and such a switch would be turned the wrong way by this rule. No circuit here
 * has one. Nothing detects the difference, because the rule library has no notion of which side of
 * a part the signal arrives on; when reflection lands, this should be replaced by a rule that asks
 * that question rather than assuming the answer.
 */
function switchFacesItsBank(kind: ComponentKind, symbol: LibSymbol): Rotation | null {
  if (!TURNED_TO_FACE_THE_CIRCUIT.includes(kind)) return null
  // THIS RULE DECLINES WHERE THE TURN CANNOT CHANGE WHICH SIDE ANY PIN FACES - the condition
  // below is the rule's own purpose, written as a test of the symbol, and it is what a review on
  // 2026-10-26 was reaching for when it found the turn firing on `jumper()`.
  //
  // `jumper()` in `circuits/transistor-preamp/parts.ts` returns `kind: "switch"` with
  // `Jumper:Jumper_2_Open`, so the kind covers both a rotary selector with a pole and six throws
  // AND a two-pin header that shorts or does not. `Jumper_2_Open` puts pin 1 at angle 0 and pin 2
  // at angle 180 - one end LEFT and one end RIGHT - so turning it 180 leaves one pin on each
  // side and only swaps which pin is which. "Its throws face the bank that feeds them" has
  // nothing to say about that symbol, so this returns `null` and the part reaches the rail entry
  // and `signalAxis` below.
  //
  // **PIN COUNT IS NOT THE PROPERTY, AND READING IT AS THE PROPERTY WAS A DEFECT: `d379740`
  // tested `pins.length > 2` and so stopped turning `Connector_Generic:Conn_01x02` as well.** A
  // 2-way header is not a two-terminal inline part: it puts BOTH pins at angle 0, both on the
  // LEFT, exactly as `Conn_01x05` does, and `circuits/opamp-buffer.schematic.ts` records that
  // geometry as *"a definite answer rather than an ambiguous one"*. For it the turn does move
  // both pins to the side facing the circuit, which is the whole of what this rule is for, so it
  // applies - and the side-multiset test below says so without a pin count being consulted.
  const pins = symbol.pins.filter((pin) => pin.unit === 1 || pin.unit === 0)
  const sidesAt = (rot: Rotation): string =>
    pins
      .map((pin) => sideOfPin(rot, pin))
      .sort()
      .join(",")
  if (sidesAt(180) === sidesAt(0)) return null
  return 180
}

/**
 * Kinds drawn at 180 so their pins face the circuit rather than away from it.
 *
 * **`switch`** - the owner's note above: a selector's throws face the bank that feeds them.
 *
 * **`connector`** - the same defect, found by looking for it after he asked whether the other
 * orientation problems had been addressed. `Connector_Generic:Conn_01x05` draws **all five pins
 * facing LEFT** at rotation 0, and the Pultec junction bus places both its headers at 0 with
 * everything they feed - the global labels, the board's `out` - to their RIGHT, so every wire
 * left a header leftward and wrapped around it.
 *
 * `[RAN]` turning connectors: **the junction bus becomes a tight adjacent pair with `in` entering
 * left and the labels fanning right**, `pt2399-core` and `transistor-preamp-feedback` BOTH start
 * generating - each had been refusing on a junction disagreement - and `feedback` comes out with
 * **zero** fallback field placements, the first board in this repository to manage that. The
 * board census goes 5 of 11 to 6 of 11. **It costs `transistor-preamp-loop`**, which moves to a
 * text-clearance refusal: that is the minimise-and-disclose class (**G260**) rather than a
 * correctness one, and it is recorded rather than traded away silently.
 *
 * **THE SAME ASSUMPTION AS THE SWITCH, AND THE SAME WARNING.** This says a connector's pins face
 * INTO the circuit, which is true of a board-edge header feeding what is drawn to its right and
 * false of one that receives from the right. Nothing detects the difference. When reflection
 * lands, both entries here should be replaced by a rule that asks which side the signal arrives
 * on instead of assuming it.
 */
const TURNED_TO_FACE_THE_CIRCUIT: readonly ComponentKind[] = ["switch", "connector"]

/**
 * Kinds admitted to the rail entry and to `signalAxis` although they are not in `RAIL_END_KINDS`,
 * because a PART of the kind meets that list's own stated membership criterion.
 *
 * **`switch`, for the two-pin jumper only.** `RAIL_END_KINDS` is documented above as
 * *"two-terminal passives with no drawn polarity of their own"*, and excludes `diode` because a
 * diode's glyph draws a direction. `Jumper:Jumper_2_Open` is two-terminal and its glyph - two
 * pins and a gap - draws no direction, so it satisfies that criterion as written. It arrives here
 * only when `switchFacesItsBank` declined it; a selector was answered there and never reaches
 * this.
 *
 * **WHAT THIS BUYS, MEASURED, AND THE STATED REASON IT REPLACES WAS FALSE.** `d379740` justified
 * admitting `switch` here with *"without this the jumper falls out with `null` - step 3, which
 * resolves to rotation 0, which for `Jumper:Jumper_2_Open` is across the reading direction"*.
 * **Checked against the installed symbol and refuted: `Jumper_2_Open` has pin 1 at angle 0 and
 * pin 2 at angle 180, so rotation 0 puts one end left and one end right - ALONG the reading
 * direction, not across it** - and `signalAxis` returns 0 for it too, so for a jumper on no rail
 * this list changes nothing at all.
 *
 * What it does change is the RAIL entry: a jumper with one end on a declared rail is drawn with
 * that end toward its rail. `JP1` on the transistor preamp's upper leg sits on `VCC` and
 * `UPPER_JUMPED`, and pin 1 reaches the top only at 270. `[RAN]` removing this list:
 * `transistor-preamp-lab` moves to a text-clearance refusal and the board census goes 7 of 11 to
 * 6 of 11. That measurement is the cost of removing it; the reason it is here is the criterion
 * above.
 */
const TWO_TERMINAL_BY_GEOMETRY: readonly ComponentKind[] = ["switch"]

export function preferredOrientation(kind: ComponentKind, context: OrientationContext): Rotation | null {
  const turned = switchFacesItsBank(kind, context.symbol)
  if (turned !== null) return turned
  if (!RAIL_END_KINDS.includes(kind) && !TWO_TERMINAL_BY_GEOMETRY.includes(kind)) return null
  const constraints: { readonly pin: string; readonly side: PinSide }[] = []
  for (const [pin, net] of context.pinNets) {
    if (net === null) continue
    const rail = context.rails.get(net)
    if (rail === undefined) continue
    constraints.push({ pin, side: SIDE_FOR_RAIL[rail.kind] })
  }
  if (constraints.length === 0) return signalAxis(kind, context.symbol)
  const satisfying = ROTATIONS.filter((rot) =>
    constraints.every(({ pin, side }) => {
      const libPin = context.symbol.pins.find((p) => p.number === pin)
      return libPin !== undefined && sideOfPin(rot, libPin) === side
    }),
  )
  const only = satisfying.length === 1 ? satisfying[0] : undefined
  return only ?? null
}

/**
 * THE LIBRARY FRAME, AND THE ONE PLACE §1.5's `null` BECOMES A NUMBER.
 *
 * Spec §1.5 step 3 is *"ELK then places, subject to fixed port geometry, and may choose among
 * orientations the rules leave open"* - and **that freedom is not available to this backend**, for
 * a reason that is a property of the constraint rather than of this code: ELK is handed
 * `elk.portConstraints = FIXED_POS` (the one mechanism spec §1.2 says transfers from
 * `netlistsvg`), so a port's position must be computed before the graph exists, which means a
 * rotation must be chosen before ELK runs. There is no point at which ELK could choose one.
 *
 * So a `null` resolves to **0: the orientation the symbol library itself draws the part in.** That
 * is a stated frame, not a default standing in for an answer - the rule declined, and the drawing
 * falls back to the library's own geometry rather than to a number this writer liked.
 *
 * **IT IS A FUNCTION, AND NOT `?? 0` AT THE CALL SITES, BECAUSE THERE ARE TWO CALL SITES AND SPEC
 * §1.4 OBLIGATION 3 IS ABOUT EXACTLY THAT.** The obligation's operative clause is *"the transform
 * is applied once, to the library pin geometry, and the result is what **both** ELK and the emitter
 * see - so there is one transformed geometry and no second copy to drift"*. `subgraphOf` resolves
 * each unit's rotation through this function ONCE and puts it on `BlockUnit.rot`; `graph.ts` fixes
 * the ELK ports at `u.rot` and `adapt.ts` recomputes every pin end at `u.rot`. One value, two
 * readers. `docs/known-gaps.md` **G182** and ruling **R29**.
 */
export function drawnRotation(preferred: Rotation | null): Rotation {
  return preferred ?? LIBRARY_FRAME
}

/**
 * The rotation a symbol's own library geometry is declared in. Named rather than written as a bare
 * `0` so that `drawnRotation`'s answer says WHY it is that number at the one place it is produced.
 */
export const LIBRARY_FRAME: Rotation = 0
