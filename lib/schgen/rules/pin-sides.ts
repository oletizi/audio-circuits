/**
 * WHICH SIDE OF A SYMBOL EACH PIN LEAVES FROM, READ OFF THE SYMBOL'S OWN GEOMETRY.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. This is the sharpest of the five
 * inventions `docs/known-gaps.md` **G99** measured, and the only one that entry calls *"no basis
 * in the model at all"*: the ELK spike split `pt2399-core`'s 16-pin PT2399 *"first half in, second
 * half out"* because nothing said otherwise.
 *
 * **NOTHING HERE IS A CHOICE ABOUT A CIRCUIT.** A KiCad library pin carries an `(at x y angle)`,
 * `extractPins` already reads that angle, and `pinSide(0, pin)` in `render/geometry.ts` already
 * turns an angle into a side. So the partition is a property of the drawn symbol and this module
 * only renames the four sides into the schematic-authoring vocabulary. For `Audio:PT2399` as
 * installed, pins 1-8 carry angle 0 and pins 9-16 carry angle 180 - so the spike's guess happens
 * to agree with the library, which is exactly why a guess that agrees is not evidence that it was
 * derived.
 *
 * **A SYMBOL THAT DOES NOT ANSWER THE QUESTION REFUSES.** Fewer than two distinct sides means the
 * drawn symbol puts every pin on one edge and therefore says nothing about which pins are an
 * interface in and which out. Every `Connector_Generic:Conn_01xNN` is in that class (all pins at
 * angle 0, so all on the left) and so is `Connector:TestPoint` (one pin). Those need a
 * `pinSides` override in the authoring file that states the partition and says why - which is
 * what makes the residue visible instead of letting a backend split the list in half.
 */

import { pinSide, type Rotation } from "../render/geometry.ts"
import type { LibPin, LibSymbol } from "../render/library.ts"
import type { ComponentKind } from "../../model/types.ts"

export type PinSide = "left" | "right" | "top" | "bottom"

export const PIN_SIDES: readonly PinSide[] = ["left", "right", "top", "bottom"]

/**
 * `render/geometry.ts`'s `Side` vocabulary, renamed. That module says "up"/"down" because it is
 * describing a direction in the library frame; a block interface is described by the EDGE a pin
 * sits on, which is what seam B attaches to, so "top"/"bottom" is the word here. The two
 * vocabularies are the same four values and this is the one place they meet.
 */
const SIDE_NAMES: Readonly<Record<string, PinSide>> = {
  left: "left",
  right: "right",
  up: "top",
  down: "bottom",
}

/** The side `pin` leaves from when the symbol is placed at `rot`. */
export function sideOfPin(rot: Rotation, pin: LibPin): PinSide {
  const geometric = pinSide(rot, pin)
  const side = SIDE_NAMES[geometric]
  if (side === undefined) {
    throw new Error(
      `pinSide returned "${geometric}" for pin ${pin.number}, which is not one of ` +
        `${Object.keys(SIDE_NAMES).join(", ")}. SIDE_NAMES in lib/schgen/rules/pin-sides.ts ` +
        "must name every value of render/geometry.ts's Side type; it is not defaulted because a " +
        "missing side would silently put a pin on an edge nobody chose.",
    )
  }
  return side
}

/**
 * Per pin number, the side it leaves from, derived from the symbol's pin angles at rotation 0.
 *
 * Rotation 0 and not the placed rotation: these sides are the block-interface contract of spec
 * §1.9, which is about which edge of the block a net may be reached from, and a block's parts are
 * not placed yet when its interface is declared. An orientation rule that rotates a part
 * (`./orientation.ts`) moves the geometry and not the pin identity - spec §1.5 states that
 * separation - so the rotated side is `sideOfPin(rot, pin)` at drawing time and is deliberately
 * not baked in here.
 *
 * `kind` is read only by the refusal, which is its job: the message a caller gets has to name the
 * component kind whose symbol could not answer, because the fix is a per-component override in
 * that circuit's authoring file.
 */
export function pinSidesFor(kind: ComponentKind, symbol: LibSymbol): ReadonlyMap<string, PinSide> {
  const sides = new Map<string, PinSide>()
  for (const pin of symbol.pins) sides.set(pin.number, sideOfPin(0, pin))
  const distinct = new Set(sides.values())
  if (sides.size === 0) {
    throw new Error(
      `${symbol.libId} (declared for a "${kind}") has no pins, so there is no side for any pin ` +
        "of it. A symbol with no pins cannot be drawn into a netlist; check the lib id.",
    )
  }
  if (distinct.size < 2) {
    throw new Error(
      `${symbol.libId} (declared for a "${kind}") puts all ${sides.size} of its pins on one ` +
        `side ("${[...distinct].join("")}"), so its own geometry does not say which pins are an ` +
        "interface in and which out. This is NOT defaulted and the list is NOT split in half: " +
        "docs/known-gaps.md G99 measured a 16-pin IC partitioned that way with \"no basis in " +
        "the model at all\". Declare a `pinSides` override for this component in its circuit's " +
        "*.schematic.ts / schematic/authoring.ts file, covering every pin number " +
        `(${[...sides.keys()].join(", ")}) and carrying a non-blank \`why\`.`,
    )
  }
  return sides
}

/**
 * True when `symbol`'s own geometry answers the side question, so a caller can report how many
 * components were resolved by rule without catching a refusal to find out.
 *
 * Deliberately not implemented as a try/catch around `pinSidesFor`: using a thrown refusal as a
 * predicate makes the refusal's message part of a control path, and a later edit to the message
 * would change behaviour somewhere that never reads it.
 */
export function symbolStatesItsSides(symbol: LibSymbol): boolean {
  const distinct = new Set(symbol.pins.map((pin) => sideOfPin(0, pin)))
  return symbol.pins.length > 0 && distinct.size >= 2
}
