/**
 * A pad's terminal name - what a pin number ON an off-board component IS,
 * for the wiring guide to print beside the pad instead of a bare number.
 *
 * **THE RULE, AND NOTHING ELSE DECIDES IT.** `padOrderFor` in
 * `circuits/pultec/physical/parts.ts` already states each off-board kind's
 * terminal order - a pot's three lugs, a two-pin part's two ends, a rotary's
 * common followed by its own throws - because that order is a per-kind fact
 * about how the part is numbered, not something this module is free to
 * restate or re-derive. A `PadTerminal.pin` (`./pads.ts`) is a 1-based index
 * into that list: lug "1" is the list's first entry, never its zeroth. This
 * file does exactly that one lookup and refuses outside it.
 *
 * **WHY 1-BASED, STATED SO IT IS NOT RE-GUESSED.** A panel pot's lugs are
 * numbered 1, 2, 3 by the part itself, and the dump's `PAD ... FROM
 * RV_LO_BOOST.1` line carries that same number straight through from the
 * netlist - see `./pads.ts`'s module comment for the identity this number is
 * part of. Reading it as a 0-based index would still run, still return a
 * string, and still be wrong: pin "2" would come back "wiper" one position
 * early as "ccw" instead, a confidently wrong word on a printed build sheet.
 * There is no type error available to catch that, which is why the plan this
 * file implements calls out a perturbation test for exactly this line rather
 * than trusting review to see it.
 *
 * **THE GUARD.** A pin outside `padOrderFor`'s list is refused by name, not
 * clamped or defaulted - a wrong number on a dump is evidence of a fault
 * upstream (a mis-numbered PAD line, or a component whose pad order has
 * changed shape), and guessing which terminal was "probably" meant would
 * print a wire instruction nobody can trust.
 */
import type { Component } from "../../lib/model/types.ts"
import { padOrderFor } from "../../circuits/pultec/physical/parts.ts"

/** A pin string that is a plain positive integer, with no sign and no leading zero. */
const PLAIN_POSITIVE_INTEGER = /^[1-9][0-9]*$/

/**
 * The terminal name a pad's `pin` refers to, on one off-board component.
 *
 * `pin` is `PadTerminal.pin` (`./pads.ts`) - the number the dump's `PAD ...
 * FROM <ref>.<pin>` field carries, read as text because that is how the dump
 * prints it. It is turned into an index into `padOrderFor(component)` and
 * nothing more: no fallback to the ref, no fallback to the pin itself, and no
 * silent clamp when the pin is out of range.
 */
export function terminalNameOf(component: Component, pin: string): string {
  const order = padOrderFor(component)
  if (!PLAIN_POSITIVE_INTEGER.test(pin)) {
    throw new Error(
      `pad "${component.id}.${pin}" cannot be read as a pad-order position: "${pin}" is not a ` +
        `plain positive integer. The pad order for a "${component.kind}" is [${order.join(", ")}], ` +
        "stated by padOrderFor in circuits/pultec/physical/parts.ts, and a pin is a 1-based " +
        "index into it - not the terminal's own name and not anything else.",
    )
  }
  const index = Number.parseInt(pin, 10)
  const terminal = order[index - 1]
  if (terminal === undefined) {
    throw new Error(
      `pad "${component.id}.${pin}" is outside its pad order: the "${component.kind}" ` +
        `"${component.id}" has ${order.length} terminal(s) - [${order.join(", ")}] - numbered ` +
        `1..${order.length}, and pin "${pin}" is not one of them. The pad order is a per-kind ` +
        "fact stated by padOrderFor in circuits/pultec/physical/parts.ts, not derived here; if " +
        `this pin is genuinely real, that is where to add it.`,
    )
  }
  return terminal
}
