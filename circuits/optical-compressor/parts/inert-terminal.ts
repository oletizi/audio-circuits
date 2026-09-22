/**
 * The one `PartSpec` every connector in this circuit uses.
 *
 * Spec section 10.1's connectors are screw terminals and pot headers - each
 * terminal is simply a place a wire lands, with no internal electrical
 * relationship of any kind - so each declares `electricallyInert`. The emitter
 * requires the declaration and will not guess it, because guessing "inert" is
 * how a switching part would disappear from a deck silently. There are no jacks
 * in this circuit and no switching behaviour is modelled.
 *
 * No footprint and no mpn: the spec names the connectors and their pins and
 * says nothing about packaging, and inventing either would be fabricated data.
 *
 * Declared once, here, rather than copied into each of the three blocks. Three
 * near-identical constants with three near-identical comments is the shape that
 * makes a later reader guess which one is canon, and it is the shape this
 * project's own rules exist to remove.
 */
import type { PartSpec } from "../../../lib/model/index.ts"

export const INERT_TERMINAL: PartSpec = { electricallyInert: true }
