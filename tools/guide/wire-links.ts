/**
 * What the packet says about a part that resolves to 0 Ω: it is a WIRE LINK.
 *
 * THE RULE IS NOT DECIDED HERE. `lib/model/zero-ohm.ts`'s `isZeroOhmResistor`
 * is the one place that decides what zero ohms means, for the electrical reader
 * (`lib/board/scaffold/shorts.ts`) and the physical ones alike. This module
 * holds the packet's WORDS for the consequence and the set of refs the renderer
 * needs, because the renderer holds no circuit knowledge of its own (see
 * `./render.ts`'s module comment) and cannot ask the question itself.
 *
 * **WHY THE PACKET MUST NOT PRINT `0R`.** `boards/<board>/wiring.md` already
 * said "fit a wire or a solder bridge" where the printed packet listed `0R` in
 * its **Resistors and trim-pots** table with mounting `STAND ON END`: two
 * generated sheets for one board, contradicting each other about one part
 * (`docs/known-gaps.md`'s G55). The owner, 2026-10-18, on what that costs:
 * *"I'm not likely to go looking for a 0 ohm resistor. But, I am likely to
 * question the validity of a perfboard layout that specifies 0 ohm resistors.
 * There are manufacturing reasons to use a 0 ohm resistor and they are
 * electrically equivalent to wires, but in a perfboard context, they raise
 * eyebrows."* So the cost is CREDIBILITY, and the fix is that the packet stops
 * specifying such a part - in the table and in the picture both - rather than
 * explaining one more carefully.
 *
 * **A 0 Ω PART IS LEGITIMATE IN THE MODEL AND ON A FABRICATED BOARD.** Nothing
 * here refuses one: `lib/model/zero-ohm.ts` says why at length.
 */
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
import { componentAt, type BoardCircuit } from "./circuit.ts"
import type { BoardDump } from "./dump.ts"

/**
 * What goes in the holes, where a part's value is printed - the **Value**
 * column and the values image's label.
 *
 * It is the part's value label and not an explanation, because that is what
 * that column and that label are: `valueLabel`'s own comment
 * (`./off-board.ts`) states the rule - "what a part's value label says: what
 * goes in its holes" - and what goes in these two holes is a wire. The sentence
 * a builder acts on is `WIRE_LINK_NOTE`, printed once at the section rather
 * than repeated in every row.
 */
export const WIRE_LINK_VALUE = "wire link"

/**
 * The **Wire links** section's sentence about the rows that are parts rather
 * than W-numbered wires.
 *
 * IT SAYS WHERE THE PART CAME FROM, because a reader who finds
 * `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` among the W-numbered wires will otherwise
 * wonder whether the sheet has mixed two things up - and the answer ("a level
 * pot at its end stop puts the whole track in one half and nothing in the
 * other") is exactly what stops the row reading as a mistake.
 */
export const WIRE_LINK_NOTE =
  "Some of these are listed by designator rather than as W1, W2 ...: they are parts of the " +
  "circuit that carry no resistance. A level pot at the end of its travel puts its whole track " +
  "in one half and nothing in the other, so that other half is a short. Fit a wire or a solder " +
  "bridge between the two holes. There is no resistor to fit in them and none to buy."

/**
 * The refs on this board that are wire links rather than parts with bodies.
 *
 * BUILT ONCE BY THE CALLER AND HANDED TO THE RENDERER, the way `padLabels` is
 * (`./packet.ts`): the images must not be able to draw a resistor where the
 * checklist prints a wire link. Only valid after
 * `assertLayoutMatchesCircuit`, since it reads a component per `PART` line.
 */
export function wireLinkRefs(dump: BoardDump, circuit: BoardCircuit): ReadonlySet<string> {
  return new Set(
    dump.parts.filter((part) => isZeroOhmResistor(componentAt(circuit, part.ref))).map((part) => part.ref),
  )
}
