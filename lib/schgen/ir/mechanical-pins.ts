/**
 * Library pins that are MECHANICAL MOUNT POINTS: a terminal on the symbol body that no
 * conductor inside the symbol reaches, and which the canonical electrical model is therefore
 * not required to carry.
 *
 * Hand-written, not ported: `digital-pedal-platform`'s `tools/schgen` has no such table, and
 * `./validate.ts` is already a DIVERGED port (see its header), so this file has no upstream to
 * re-derive from. `docs/superpowers/specs/2026-10-24-mechanical-pins-design.md` is the design
 * and `docs/known-gaps.md` **G282** is the measurement behind it.
 *
 * **WHAT AN ENTRY MEANS, AND WHAT IT DOES NOT.** It means: this symbol pin may be OMITTED from
 * a circuit's electrical connections without `pinsDeclared` refusing. It does NOT mean the
 * physical mounting feature can be ignored for PCB design, electrical bonding or safety
 * analysis, and it does NOT exempt an EXPLICIT declaration from validation - a pin listed here
 * and then put on a net is still checked by `singlePinNets` and `pinSemantics`, neither of
 * which consults this table. The exemption is about schematic completeness only.
 *
 * **WHY A WHITELIST AND NOT A RULE DERIVED FROM THE SYMBOL'S DRAWING, which is the question a
 * reader of this file will ask, and the answer is measured rather than asserted.** Inferring
 * "mechanical" from stroke geometry - no graphic stroke endpoint at the pin's body-side end -
 * discriminates PERFECTLY on `Switch:SW_Rotary_1x6_MP` (one endpoint on each of the seven
 * electrical pins, zero on `MP`) and then flags **17 of the 36 pins across eight other symbols
 * this repository uses**, including BOTH terminals of `Device:R`, all three pins of
 * `Switch:SW_SPDT` and SIX of eight on a TL072 - because a symbol body commonly ABUTS its pins
 * rather than meeting them at a stroke endpoint, which is a drawing convention carrying no
 * electrical meaning. A false positive **silently exempts a genuinely undeclared electrical
 * pin**, the one defect `pinsDeclared` exists to catch. `docs/known-gaps.md` **G290** carries
 * the full table. **Do not replace this file with that rule**; if you intend to try, G290
 * states the criterion a candidate must meet first.
 *
 * **EVERY ENTRY IS A DELIBERATE EDIT WITH A TEST BESIDE IT, never a silent widening.** Ten
 * symbols in KiCad's `Switch` library carry an `MP` pin - the seven single-pole rotaries
 * `SW_Rotary_1x3_MP` through `1x9_MP`, plus `SW_SP3T_NR01103`, `SW_SP4T_NR01104` and
 * `SW_SP5T_NR01105` - and `circuits/pultec/physical/parts.ts` already maps selector positions
 * 3..9 onto that family, so more will be wanted. **They are not added until a board needs one**
 * and the claim has been checked against the installed library. An empty whitelist that refuses
 * loudly beats a general rule that quietly accepts a guess.
 *
 * **HOW AN ENTRY IS KEPT HONEST, in two places that both fail loudly.**
 * `tests/schgen/ir/mechanical-pins.test.ts` asserts each listed pin's identity and geometry
 * against the INSTALLED library, and the symbol is also VENDORED
 * (`lib/kicad/symbols/Switch/SW_Rotary_1x6_MP.sexpr`), which puts it under
 * `../render/stock-symbols.ts`' byte-exact refusal. A future KiCad that moves this pin fails
 * loudly rather than silently exempting whatever ends up with that number. `pinsDeclared`
 * additionally refuses an entry naming a pin the symbol does not have, so a stale table cannot
 * sit here looking correct.
 */

/** Mechanical pins by KiCad library id. Keys are `Nickname:Symbol`, values are pin NUMBERS. */
export const MECHANICAL_PINS: Readonly<Record<string, readonly string[]>> = {
  // `MP` is the panel mounting lug: a `passive` pin with an empty name at (-7.62, -5.08) angle 0,
  // whose body-side end at (-5.08, -5.08) no polyline reaches, unlike pole pin 7's at (-5.08, 0).
  // Read off KiCad 10.0.5's Switch.kicad_sym; `docs/known-gaps.md` G282 clause 4 has the pin text.
  "Switch:SW_Rotary_1x6_MP": ["MP"],
};

/**
 * The mechanical pins declared for `libId`, as a set. Empty for a symbol with no entry, which is
 * the common case - absence means "every pin of this symbol is electrical", never "unknown".
 */
export function mechanicalPinsOf(libId: string): ReadonlySet<string> {
  // `Object.hasOwn` rather than a bare lookup, which is this repository's idiom for a
  // string-keyed record (`../gates/pin-identity.ts`' `own()`): a libId colliding with an
  // Object.prototype member would otherwise return a function and exempt nonsense. Unreachable
  // with today's `Nickname:Symbol` keys, and not a reason to spell it the fragile way.
  return new Set(Object.hasOwn(MECHANICAL_PINS, libId) ? MECHANICAL_PINS[libId] : []);
}
