/**
 * ONE PLACE DECIDES WHAT 0 Ω MEANS: a resistor of zero ohms, and nothing else.
 *
 * WHY IT IS ITS OWN MODULE. Two consumers ask this question for two different
 * reasons, and both used to answer it themselves:
 *
 * - `lib/board/scaffold/shorts.ts` asks it ELECTRICALLY - an ideal short is a
 *   component whose terminals sit at one potential, so its nets are one
 *   electrical node - and carried the `ohms === 0` test inline;
 * - the build packet (`tools/guide/*`) and the wiring sheet
 *   (`lib/board/scaffold/wiring.ts`) ask it PHYSICALLY - what does somebody fit
 *   in those two holes - and the sheet answered it by comparing `describePart`'s
 *   rendered text against the string `"0R"`.
 *
 * Two places deciding what zero ohms means is how one board's generated sheets
 * came to contradict each other about the same part (`docs/known-gaps.md`'s
 * G55): the wiring sheet said "fit a wire or a solder bridge" and the printed
 * packet listed a `0R` resistor to stand on end. The decision is here now, and
 * each consumer keeps its own WORDS for the consequence.
 *
 * **A 0 Ω RESISTOR IS LEGITIMATE AND THIS MODULE DOES NOT BAN ONE.** The owner,
 * 2026-10-18: *"There are manufacturing reasons to use a 0 ohm resistor and they
 * are electrically equivalent to wires, but in a perfboard context, they raise
 * eyebrows."* `lib/model/control-state.ts:293-297` has its own separate reason
 * for emitting a zero-ohm pot section - component counts stay stable across a
 * SPICE sweep - and neither is to be undone. Recognising such a part is how a
 * renderer says the right thing about it, not a step towards refusing it.
 *
 * **ONLY A RESISTOR, AND ONLY EXACTLY ZERO.** A zero-farad capacitor is an OPEN
 * and not a short; nothing a flat Pultec section resolves to is a zero-henry
 * inductor. A further zero-valued kind must be added here deliberately, with a
 * test, rather than inferred from its value being zero: guessing in either
 * direction changes which components survive `shorts.ts`'s reduction AND what a
 * build sheet tells somebody to solder. `lib/board/scaffold/shorts.ts`'s
 * `isIdealShort` states the electrical half of that argument at length.
 */
import type { ComponentKind, Parameters } from "./types.ts"

/**
 * The shape this question needs, and no more: a kind and its parameters.
 *
 * STRUCTURAL ON PURPOSE, so that `Component` (`./types.ts`) and
 * `ResolvedComponent` (`./control-state.ts`) both satisfy it without either
 * layer being converted to the other's type to ask one question. Both declare
 * exactly these two fields with exactly these types.
 */
export interface ValuedComponent {
  readonly kind: ComponentKind
  readonly parameters: Parameters
}

/** Whether this component is a resistor of exactly zero ohms - a wire link in
 * the hand, one electrical node in a netlist. */
export function isZeroOhmResistor(component: ValuedComponent): boolean {
  const parameters = component.parameters
  return component.kind === "resistor" && "ohms" in parameters && parameters.ohms === 0
}
