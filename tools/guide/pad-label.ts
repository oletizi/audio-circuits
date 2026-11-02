/**
 * What a pad's wire IS, in the words the owner asked for: `LO BOOST wiper`,
 * `LO BOOST 60Hz`, `MID MODE boost`, `HI BOOST 100MH a`.
 *
 * **WHY THIS IS NOT THE PAD'S IDENTITY.** The guide used to print a pad's
 * `<ref>.<pin>` identity - `RV_LO_BOOST.1` - which names the terminal exactly
 * and tells a builder nothing. Shown that, the owner said *"I like the more
 * descriptive names"*, and `docs/known-gaps.md` G1 records that the choice was
 * his to make and not this module's. **So no label here ever falls back to the
 * ref, and none falls back to the pin name either.** Every refusal below says
 * that in as many words, because a fallback would reinstate precisely the
 * spelling he rejected while every test still passed.
 *
 * **A LABEL HAS TWO HALVES AND EACH IS READ OFF THE COMPONENT ITSELF.**
 *
 *   - **Which control it is** comes from the ref: the prefix dropped,
 *     underscores as spaces, upper case. `SW_LO_BOOST` -> `LO BOOST`.
 *   - **Which terminal of it** comes from `./pad-terminal.ts`, which indexes
 *     the pad order `padOrderFor` states for the component's kind.
 *   - **What a switch terminal SELECTS** comes from `positionsByPin`
 *     (`lib/board/part-text.ts`), which reads the component's own `contacts`
 *     map - the position that closes `common`-to-`t3` IS `60Hz`.
 *
 * **THE FIRST VERSION OF THIS FILE JOINED A PAD ORDER TO `SELECTORS.positions`
 * BY INDEX, AND THAT WAS THE WRONG MECHANISM.** It needed a count check to be
 * admissible at all, it needed a whitelist of refs it knew, and it could not
 * label `SW_MID_MODE` - three detents, two throws, because a centre-off closes
 * nothing - without refusing a board that is correct. `contacts` pairs a
 * position to its pins directly, so there is no ordering to assume, no count to
 * reconcile and nothing to whitelist: a detent that closes nothing contributes
 * no pin and needs no excuse. `boards/pultec-mid/wiring.md` has printed
 * `SW_MID_MODE` that way on a committed board all along. The index join, its
 * count guard and the control-model parameter are DELETED rather than kept
 * beside this path.
 *
 * **WHAT STILL REFUSES, AND WHY IT MUST.** A switch terminal that `contacts`
 * does not name has no word a builder can act on, so it refuses - that is the
 * one thing the old count check was really protecting, and it survives in a
 * form that cannot be wrong about a correct board. A ref with no known prefix
 * refuses too: there is no function to print, and the ref is not a substitute.
 */
import type { Component, SwitchComponent } from "../../lib/model/types.ts"
import { positionsByPin } from "../../lib/board/part-text.ts"
import { terminalNameOf } from "./pad-terminal.ts"

/**
 * Ref prefixes a function name can be read off, with what each marks.
 *
 * `RV_` and `SW_` are the two the owner's rule names - a panel pot and a panel
 * switch. `L_` is here because the committed layouts put inductor pads on the
 * board: `boards/pultec-hi-boost` carries `L_HI_BOOST_100MH`...`_600MH` and
 * `boards/pultec-mid` carries five `L_MID_*` coils, each expanded into two
 * pads, and a guide that refused them would print no page for either board.
 * The transform is the same one, not a second rule: `L_HI_BOOST_100MH` ->
 * `HI BOOST 100MH`, and the terminal half says `a` or `b`.
 *
 * **A PREFIX IS ADDED HERE DELIBERATELY, WITH THE PARTS IT COVERS NAMED, AND
 * NEVER TO MAKE A BOARD PASS.** An empty whitelist that refuses loudly beats a
 * general rule that quietly accepts a guess.
 */
const FUNCTION_PREFIXES: readonly string[] = ["RV_", "SW_", "L_"]

/** The pad `rotaryPadOrder` puts first on every rotary: the pole, not a throw. */
const COMMON_TERMINAL = "common"

/** Narrows to `SwitchComponent` so `.parameters.contacts` reads without a cast. */
function isSwitch(component: Component): component is SwitchComponent {
  return component.kind === "switch"
}

/**
 * Every position whose contacts close onto a given terminal, by name.
 *
 * A genuine throw closes at exactly one position - `from-netlist.ts` only ever
 * writes one `[["common", throwPin]]` pair per position, so a real throw's
 * name appears here once. A terminal that comes back with zero or more than
 * one position is not a position-selecting throw, whatever it is instead.
 */
function positionsClosingOnto(component: SwitchComponent, terminal: string): readonly string[] {
  const positions: string[] = []
  for (const [position, pairs] of Object.entries(component.parameters.contacts)) {
    if (pairs.some((pair) => pair.includes(terminal))) positions.push(position)
  }
  return positions
}

/**
 * The control's function, read off its ref: the prefix dropped, underscores as
 * spaces, upper case. `RV_LO_BOOST` -> `LO BOOST`.
 *
 * A ref matching no prefix REFUSES rather than printing itself.
 */
export function functionNameOf(ref: string): string {
  const prefix = FUNCTION_PREFIXES.find((candidate) => ref.startsWith(candidate))
  if (prefix === undefined || ref.length === prefix.length) {
    throw new Error(
      `pad-label-unprefixed-ref: "${ref}" does not begin with any prefix a function name can ` +
        `be read off - [${FUNCTION_PREFIXES.join(", ")}] - followed by a name, so this pad has ` +
        "no function to print. A label is the part's function: the ref with its prefix " +
        "dropped, underscores as spaces, upper case.\nIt is NOT printed raw. The ref is the " +
        "spelling the owner rejected when he asked for the more descriptive names, so a label " +
        "that degraded to it would reinstate the defect this module exists to fix.\nFix it by " +
        "adding the prefix to FUNCTION_PREFIXES in tools/guide/pad-label.ts, naming the parts " +
        "it covers and the boards that carry them, rather than by widening the rule to whatever " +
        "the ref in front of you happens to start with.",
    )
  }
  return ref.slice(prefix.length).split("_").join(" ").toUpperCase()
}

/**
 * One switch pad's label: the pole, or the position its terminal selects.
 *
 * The pole is labelled `common` because that is what it IS - every position
 * closes onto it, so no one position names it, and `positionsByPin` leaves it
 * out for that reason. `boards/pultec-mid/wiring.md` prints the same thing: a
 * dash in the Selects column of pad 1.
 *
 * **A SECOND POLE REFUSES RATHER THAN GUESSES (G41).** The pole is recognised
 * by the one spelling `rotaryPadOrder` puts first, `common` - that rule is
 * not generalised here, because inventing a second spelling for a pole on a
 * part nobody has chosen would itself be a guess. What IS checked is that a
 * non-pole terminal closes at exactly one position: `positionsClosingOnto`
 * counts them directly from `contacts` rather than trusting the single value
 * `positionsByPin` resolves, because a second pole's pin closes at a
 * different position for every detent, the same shape a real throw has
 * except multiplied - `positionsByPin` folds that down to whichever position
 * was written last and would print it as a frequency. A terminal naming zero
 * or more than one position is neither the pole nor a position, and refuses.
 */
function switchLabel(component: SwitchComponent, terminal: string, functionName: string): string {
  if (terminal === COMMON_TERMINAL) return `${functionName} ${terminal}`
  const matches = positionsClosingOnto(component, terminal)
  if (matches.length === 1) {
    const [position] = matches
    return `${functionName} ${position}`
  }
  const named = Object.keys(positionsByPin(component))
  const whyNotOnePosition =
    matches.length === 0
      ? `nothing in the contacts of the switch "${component.id}" closes onto its terminal ` +
        `"${terminal}" at all`
      : `the contacts of the switch "${component.id}" close onto its terminal "${terminal}" at ` +
        `${matches.length} different positions - [${matches.join(", ")}] - not one, which is ` +
        'what a second pole not spelled "common" would look like, not a throw'
  throw new Error(
    `pad-label-unselected-throw: ${whyNotOnePosition}, so no position can be printed for this ` +
      `pad. Its terminal "${terminal}" is neither its pole - the one pin spelled literally ` +
      `"${COMMON_TERMINAL}" - nor a single position. Its contacts name ` +
      `[${named.length === 0 ? "no terminals at all" : named.join(", ")}].` +
      "\nThe contacts map is the authority for what a throw selects - it pairs a position to " +
      "the contacts that position closes, which is why a detent closing nothing (a " +
      "centre-off) needs no entry and a THROW with no position is a real gap. It is built " +
      "from the circuit's own frequency tables in " +
      "circuits/pultec/electrical/from-netlist.ts.\nThe pad is NOT labelled with its pin name " +
      `and NOT labelled with the ref: "${component.id}.${terminal}" and "${terminal}" each ` +
      "name the terminal exactly and tell a builder nothing, which is the defect this module " +
      "exists to fix.\nFix it where the switch is declared - give the terminal the position " +
      "that closes onto it, or take the pad off the board - rather than here.",
  )
}

/**
 * The label a pad's wire carries on the guide: what the part is, and which of
 * its terminals this pad lands.
 *
 * `pin` is `PadTerminal.pin` (`./pads.ts`) - the number off the dump's
 * `PAD ... FROM <ref>.<pin>` field - and is turned into a terminal name by
 * `terminalNameOf`, which refuses a pin outside the component's pad order.
 *
 * **IT TAKES NO CONTROL MODEL.** Everything it needs is on the component, so
 * there is no list to be absent from: `SW_HI_BOOST`, `SW_MID`, `SW_MID_MODE`,
 * `RV_MID` and the nine coils all label, where the first version of this file
 * refused four of them for not being in `SELECTORS`.
 */
export function padLabelOf(component: Component, pin: string): string {
  const functionName = functionNameOf(component.id)
  const terminal = terminalNameOf(component, pin)
  if (isSwitch(component)) return switchLabel(component, terminal, functionName)
  return `${functionName} ${terminal}`
}
