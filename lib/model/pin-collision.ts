/**
 * One rule, shared by both validators, because the consequence is the same
 * whichever path reaches it.
 *
 * A component's package pins and a unit's pins are merged into ONE map per unit
 * before a device line is emitted (`visiblePins`, lib/sim/device-lines.ts), with
 * the unit's spread second. Two entries spelled the same are therefore not a
 * diagnostic nicety: the unit's wins, and the package pin's net vanishes from
 * the emitted line. Measured on an op-amp whose unit re-declared `v+`, before
 * this rule was enforced on the resolution path - the deck carried
 * `Xu1 IN OUT OUT LOST 0 GENERIC_OPAMP`, with the package's `VCC` nowhere on it.
 *
 * Declared here rather than in either validator because BOTH must enforce it and
 * they must not drift. `validate.ts`'s `validateNetwork` is the authored-circuit
 * check and runs from `Builder.done()`; `control-state.ts`'s
 * `validatePhysicalNetwork` is `resolveNetwork`'s input contract and runs on
 * every network reaching resolution, including hand-built literals that never
 * touch the builder. The second is the path that actually reaches `visiblePins`.
 *
 * PER UNIT AGAINST THE PACKAGE, never unit against unit: two sections of a dual
 * op-amp legitimately share pin names (`in+` on both), and that stays legal.
 */
import type { Component } from "./types.ts"

export function assertNoPackagePinShadowing(component: Component): void {
  for (const unit of component.units) {
    for (const pin of Object.keys(unit.pins)) {
      if (Object.prototype.hasOwnProperty.call(component.pins, pin)) {
        throw new Error(
          `component "${component.id}" unit "${unit.name}": pin "${pin}" collides with a ` +
            `package pin of the same name. A unit pin and a package pin cannot share a name: ` +
            `the emitter merges them into one map per unit, so one of the two nets would be lost.`,
        )
      }
    }
  }
}
