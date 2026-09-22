/**
 * A two-terminal view over `ResolvedNetwork`, for the consumers that predate active
 * devices and only understand a component with one unit keyed `a`/`b`: the connectivity
 * lint and dead-branch pruning. The SPICE emitter was a third such consumer until it
 * gained per-kind emission and unit lowering; it now walks components and units itself,
 * because most of what it emits is not a single-unit two-terminal passive.
 *
 * `resolveNetwork` (control-state.ts) deliberately stopped producing this shape - it
 * stays structurally faithful to `Network` instead, so a representation invented for
 * one consumer is not baked into a type every future consumer inherits. This module
 * is that consumer-owned narrowing, kept out of control-state.ts on purpose.
 *
 * Active-device emission (multi-unit lowering, package-pin sharing across units) lives
 * in `lib/sim/device-lines.ts` and is NOT what this file does: this only recognizes the
 * two-terminal passives its remaining consumers handle, and throws, naming the
 * component, on anything else.
 *
 * WHAT THAT MEANS FOR THE CIRCUITS IN THIS REPOSITORY, stated here because it is a
 * capability gap and not merely a narrow type. Both consumers - `lintConnectivity`
 * (lib/model/connectivity.ts) and `pruneFloatingBranches` (lib/sim/prepare.ts) - are
 * available for a network of two-terminal passives ONLY. Measured, by resolving each
 * network in the repository and calling `twoPinElements` on it:
 *
 *   reference/pultec THREE_BAND_REFERENCE   OK - 76 two-pin elements
 *   circuits/opamp-buffer.ts                THROWS - "buffer_amp" has package pins v+, v-
 *   circuits/optical-compressor/            THROWS - "power_power_terminal" is not keyed a/b
 *
 * So the Pultec reference is linted and prunable, and NEITHER circuit carrying an active
 * device is. Generalising the two passes to walk components and units the way
 * `device-lines.ts` does is real work and is not attempted here; until it is, a reader
 * must not assume a circuit in `circuits/` has been through either pass.
 */
import type { ResolvedComponent, ResolvedNetwork } from "./control-state.ts"

export interface ResolvedTwoPinElement {
  readonly component: ResolvedComponent
  readonly pins: { readonly a: string; readonly b: string }
}

function twoPinUnit(component: ResolvedComponent): { readonly a: string; readonly b: string } {
  const packagePins = Object.keys(component.pins)
  if (packagePins.length !== 0) {
    // A two-terminal passive has no package pins of its own (see `kinds.ts`'s
    // PACKAGE_PINS), so a component that reaches here with one is not something this
    // narrowing can represent. Refusing beats dropping the pin: silently ignoring
    // `component.pins` would drop a net from the emitted deck with no signal at all.
    throw new Error(
      `Component is not a two-terminal passive (has package pin${packagePins.length === 1 ? "" : "s"} ` +
        `${packagePins.join(", ")}): ${component.id}`,
    )
  }
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
