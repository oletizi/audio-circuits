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
 * **THIS FUNCTION ONCE REFUSED A SYMBOL GIVING FEWER THAN TWO DISTINCT SIDES. THAT BRANCH IS
 * DELETED, and the reason it was wrong is worth keeping** (Task 9 review, round 1, recorded in
 * `docs/known-gaps.md` **G155**). An `(at x y angle)` is mandatory on a KiCad pin and an angle
 * always yields a side, so **the geometry always answers which EDGE a pin sits on** - a symbol
 * whose pins are all on the left is a definite answer, not an ambiguous one. The branch conflated
 * that question with a different one, *which pins are an interface IN and which OUT*, which is a
 * direction rather than an edge and which already lives in `SchematicAuthoring.portDirections`
 * and `InterfacePort`, both declared. `pinSidesFor` is not the home of the second question and
 * could not guard it.
 *
 * **The measurement that settles it:** the nineteen `pinSides` declarations the refusal forced -
 * every single-row header and every test point in the four parity circuits - agreed with
 * `sideOfPin(0, pin)` on **37 of 37** pins. The refusal produced thirty-seven declarations and
 * bought zero bits. And it never fired on the part that motivated it: `Audio:PT2399` gives two
 * distinct sides and `Amplifier_Operational:TL072` gives four.
 *
 * What closes G99's hole is this function being the SOLE source of a pin's side plus
 * `tests/schgen/authoring-complete.test.ts` asserting that every pin of every resolved symbol has
 * one. Neither depends on the deleted branch.
 */

import { pinSide, type Rotation } from "../render/geometry.ts"
import type { LibPin, LibSymbol } from "../render/library.ts"
import type { ComponentKind } from "../../model/types.ts"

export type PinSide = "left" | "right" | "top" | "bottom"

export const PIN_SIDES: readonly PinSide[] = ["left", "right", "top", "bottom"]

export function isPinSide(side: string): side is PinSide {
  return PIN_SIDES.some((s) => s === side)
}

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
 * **ONE REFUSAL SURVIVES, and it is about a broken symbol rather than an ambiguous one.** A
 * symbol with no pins has no side for any pin and cannot be drawn into a netlist at all. `kind`
 * is read only by that refusal, which is its job: the message has to name the component kind
 * whose symbol could not be read, because the fix is in that circuit's declaration.
 */
export function pinSidesFor(kind: ComponentKind, symbol: LibSymbol): ReadonlyMap<string, PinSide> {
  const sides = new Map<string, PinSide>()
  for (const pin of symbol.pins) sides.set(pin.number, sideOfPin(0, pin))
  if (sides.size === 0) {
    throw new Error(
      `${symbol.libId} (declared for a "${kind}") has no pins, so there is no side for any pin ` +
        "of it. A symbol with no pins cannot be drawn into a netlist; check the lib id.",
    )
  }
  return sides
}
