/**
 * A two-terminal view over `ResolvedNetwork`, for the three consumers that predate
 * active devices and only understand a component with one unit keyed `a`/`b`: the
 * connectivity lint, dead-branch pruning, and the SPICE emitter.
 *
 * `resolveNetwork` (control-state.ts) deliberately stopped producing this shape - it
 * stays structurally faithful to `Network` instead, so a representation invented for
 * one consumer is not baked into a type every future consumer inherits. This module
 * is that consumer-owned narrowing, kept out of control-state.ts on purpose.
 *
 * Active-device SPICE emission (multi-unit lowering, package-pin sharing across
 * units) is a later task's job and is NOT what this file does: it only recognizes
 * the two-terminal passives these three consumers already handled, and throws,
 * naming the component, on anything else.
 */
import type { ResolvedComponent, ResolvedNetwork } from "./control-state.ts"

export interface ResolvedTwoPinElement {
  readonly component: ResolvedComponent
  readonly pins: { readonly a: string; readonly b: string }
}

function twoPinUnit(component: ResolvedComponent): { readonly a: string; readonly b: string } {
  if (component.units.length !== 1) {
    throw new Error(
      `Component is not a two-terminal passive (does not have exactly one unit): ${component.id}`,
    )
  }
  const pins = component.units[0].pins
  const keys = Object.keys(pins)
  if (keys.length !== 2 || !("a" in pins) || !("b" in pins)) {
    throw new Error(`Component does not have exactly two pins keyed a and b: ${component.id}`)
  }
  return { a: pins.a, b: pins.b }
}

export function twoPinElements(network: ResolvedNetwork): readonly ResolvedTwoPinElement[] {
  return network.components.map(component => ({ component, pins: twoPinUnit(component) }))
}
