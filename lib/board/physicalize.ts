/**
 * The stage between an electrical module and a physical board.
 *
 * `partitionReference()` answers what portion of the circuit belongs to a
 * module. Physicalization answers how that module is realized on a board: what
 * footprint each component has, which components sit off the board, and what
 * the board carries that the circuit does not.
 *
 * That last part is why this module exists. A board may hold components that
 * appear in NO electrical model - a terminal block, a chassis-ground landing -
 * and without a name for them, any statement that a board matches its partition
 * is either false or has to be weakened until it proves nothing. Naming them
 * makes the statement exact instead: the board matches its partition AFTER the
 * physical-only components are projected away.
 */
import type { Component, Network } from "../model/types.ts"

/** The `provenance.source` that marks a component as the board's, not the circuit's. */
export const PHYSICAL_ONLY = "physical-only"

export function physicalOnly(component: Component): boolean {
  return component.provenance?.source === PHYSICAL_ONLY
}

/**
 * Refuse a physical-only component that is not electrically transparent.
 *
 * Transparent means: it contributes one pin to each of n DIFFERENT nets and
 * joins nothing to anything. That is the whole justification for projecting
 * these components away - a component that shorted two nets together would
 * change the circuit, and projecting it away would hide the change. The
 * projection is only sound because this holds, so it is asserted rather than
 * assumed.
 */
export function assertElectricallyTransparent(component: Component): void {
  const seen = new Map<string, string>()
  const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
  for (const group of groups) {
    for (const [pin, connection] of Object.entries(group)) {
      if (connection.kind !== "net") continue
      const previous = seen.get(connection.net)
      if (previous !== undefined) {
        throw new Error(
          `physical-only component "${component.id}" joins pins "${previous}" and "${pin}" to ` +
            `the same net "${connection.net}". A physical-only component is projected away when ` +
            "the board is compared against its electrical partition, and projecting away " +
            "something that joins two nets would hide a change to the circuit.",
        )
      }
      seen.set(connection.net, pin)
    }
  }
}

/**
 * The board's electrical content: everything except the physical-only parts.
 *
 * Ports are carried through unchanged. Nets need no cleanup because they are
 * implied by pin references rather than declared, so a net whose only member
 * was a projected component simply stops existing.
 */
export function projectPhysical(network: Network): Network {
  // ENFORCED HERE, not left to callers. The soundness of this whole abstraction
  // is "anything that can be projected away is transparent", and a marker that
  // any component can carry is not that - it would let arbitrary circuitry
  // disappear from every equivalence check in this repository by adding one
  // provenance line. Asserting at the point of projection makes the invariant
  // the projection's own precondition rather than a rule somebody has to
  // remember to apply first.
  for (const component of network.components) {
    if (physicalOnly(component)) assertElectricallyTransparent(component)
  }
  return {
    ports: network.ports,
    components: network.components.filter((component) => !physicalOnly(component)),
  }
}
