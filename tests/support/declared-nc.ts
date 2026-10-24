/**
 * **THE ONE INPUT EVERY `NC` ALLOWANCE IN THE TEST SUITE IS KEYED ON: the pins a MODEL declares
 * not connected, spelled the way a netlist spells a node.**
 *
 * Written for Task 5 of the 2026-10-23 net-names-and-floating-pins plan, which declared
 * `circuits/pt2399-core/pt2399-core.ts`'s U1 pin 5 `NC` and deleted the fake port that had been
 * standing in for it. **It lives here, shared, because the model is compared against a netlist in
 * TWO places and the rule must not be written twice:** `tests/circuits/pt2399-core.test.ts`
 * (against the committed export, keyed by net name) and `tests/kicad/legacy-netlist.test.ts`
 * (against the same fixture, through `writeLegacyNetlist`'s text). A second copy is a second thing
 * to get wrong, and getting it wrong in the permissive direction is how the gate stops working.
 *
 * **WHAT THE CALLERS MUST DO WITH IT, because this module cannot enforce it.** An allowance keyed
 * on this set is a NAMED PIN. It is never *"a one-member net"*, never a match on `unconnected-*`,
 * and never a class of shapes - a connection dropped by accident looks exactly like an intentional
 * no-connect, and the comparisons exist to catch the first. The spec is
 * `docs/superpowers/specs/2026-10-23-net-names-and-floating-pins-design.md` decision (1), which
 * records the third-party review finding that forced it; `docs/known-gaps.md` **G283** records
 * what each site tolerates.
 */

import type { Connection, Network } from "../../lib/model/types.ts"

/** Canonical pin -> KiCad pin number, per kind, as a circuit module exports it. */
export type PinNumbersByKind = Readonly<Record<string, Readonly<Record<string, string>>>>

/**
 * `"<designator>.<number>"` for every pin `n` declares `{ kind: "nc" }`.
 *
 * It walks the package pins AND each unit's pins, and maps canonical pin names through
 * `pinNumbers` exactly as a netlist derivation does, so a pin cannot be excused under one
 * spelling and compared under another. A component with no designator throws rather than being
 * skipped: a pin silently left out of this set is a pin no allowance can be keyed on, which would
 * read as "nothing was declared NC" instead of "the map is incomplete".
 */
export function declaredNcNodes(
  n: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbersByKind,
): ReadonlySet<string> {
  const out = new Set<string>()
  const addPins = (
    kind: string,
    designator: string,
    pins: Readonly<Record<string, Connection>>,
  ): void => {
    for (const [pin, conn] of Object.entries(pins)) {
      if (conn.kind !== "nc") continue
      out.add(`${designator}.${pinNumbers[kind]?.[pin] ?? pin}`)
    }
  }
  for (const component of n.components) {
    const designator = designators[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    addPins(component.kind, designator, component.pins)
    for (const unit of component.units) addPins(component.kind, designator, unit.pins)
  }
  return out
}
