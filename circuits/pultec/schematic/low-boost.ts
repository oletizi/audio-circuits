/**
 * Schematic authoring declaration for `../physical/low-boost.ts`'s `pultecLowBoost()`.
 *
 * It was four lines, and that was the finding rather than a shortcut: the five Pultec section
 * boards are each one call to `sectionBoard()`, so one assembler derives all five declarations
 * from the board's own partition sources. `./section-board.ts` carries the whole of the reasoning,
 * the designator mapping it has to declare, and why five copies of it would be five copies of one
 * derivation.
 *
 * **IT IS NO LONGER FOUR LINES, AND THE FIFTH IS A PER-BOARD OVERRIDE.** The assembler stays the
 * one derivation; what is added here is a claim about THIS board that is false of the other four,
 * which is exactly what `SchematicAuthoring.overrides` is for - *"per component id, where the
 * model's symbol or pin sides are not derivable by rule."*
 */

import { sectionAuthoring } from "./section-board.ts"
import type { SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

const base = sectionAuthoring("low-boost")

/**
 * **`R2` IS DRAWN WITH ITS OUTPUT END ON THE RIGHT, AND WITHOUT THIS IT IS ON THE LEFT.**
 *
 * The owner, 2026-10-27, looking at the generated sheet: *"what is odd is R1, which has an
 * unnecessary hairpin to the out label. And the out label is oddly far away. you could easily
 * rotate R1 to get rid of the hairpin."*
 *
 * **MEASURED, which is how this stopped being an opinion.** `lib/schgen/render/fan-geometry.ts`'s
 * `hairpins` over the generated sheet reports net `out` doubling back at the resistor: it leaves
 * going LEFT for 2 grid cells, drops, and then runs RIGHT for 49 to reach the `out` label. The
 * wire covers the same x ground twice because the end it has to reach `out` from is the far side
 * of the part.
 *
 * **THE CAUSE IS A DOCUMENTED COIN-FLIP, NOT A BUG.** `lib/schgen/rules/orientation.ts`'s
 * `signalAxis` has to choose between two rotations that both put a two-terminal part's ends left
 * and right, and it says of its choice: *"the lower-numbered pin goes left, stated as an arbitrary
 * stable choice rather than dressed up as semantics ... When interior signal direction exists,
 * this is the place that should consult it."* `R2`'s canonical pin `a` carries net `out` and maps
 * positionally to KiCad pin 1, so the OUTPUT end is placed on the left and the wire must wrap.
 *
 * **WHY THIS IS AN OVERRIDE HERE AND NOT A RULE CHANGE THERE.** Changing the tie-break flips every
 * two-terminal part on all eleven boards: measured, that takes this board from 26 hairpins to 13
 * and removes this one - and it also takes the census from `10 usable, 0 defective` to
 * `9 usable, 1 defective`, breaking a board elsewhere. A global knob is the wrong instrument for a
 * claim about one part on one board. The rule's own comment names the right instrument -
 * `portDirections`, which this repository already declares per board - and wiring that up is its
 * own piece of work with its own review. **Until then this override says the true thing in the one
 * place it is true**, and it will become redundant rather than wrong when the rule learns to read
 * direction.
 *
 * **IT IS ELECTRICALLY A NO-OP.** A resistor's two pins are interchangeable; swapping which KiCad
 * pin number carries `a` and `b` changes which end of the symbol the wire attaches to and nothing
 * else. `make check`'s netlist comparison is what would catch it if that were untrue.
 */
export const PULTEC_LOW_BOOST_SCHEMATIC: SchematicAuthoring = {
  ...base,
  overrides: {
    ...base.overrides,
    R2: {
      symbolPins: { MAIN: { a: "2", b: "1" } },
      why:
        "R2 carries net `out` on canonical pin `a`, which maps positionally to KiCad pin 1, and " +
        "`signalAxis` puts the lower-numbered pin on the LEFT by an arbitrary stable choice it " +
        "documents as such. That places this resistor's OUTPUT end away from the `out` label, and " +
        "the wire doubles back over itself to reach it - measured by `hairpins` as 2 grid cells " +
        "back before 49 forward, and seen by the owner on the rendered sheet. Swapping the pin " +
        "map puts `out` on pin 2 and the far side, so the wire runs straight. A resistor's pins " +
        "are interchangeable, so this is electrically a no-op. It is declared for THIS board only " +
        "because the alternative, flipping the rule's tie-break, moves every two-terminal part on " +
        "all eleven boards and was measured to break one of them.",
    },
  },
}
