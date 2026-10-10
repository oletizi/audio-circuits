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
 * Refuse a physical-only component that is not declared electrically inert.
 *
 * Transparent means: the part conducts nothing between its pads, so removing
 * it changes no electrical connection. That is the whole justification for
 * projecting these components away, and only a declaration on the PART can
 * establish it - the same rule `lib/sim/device-lines.ts` already applies to
 * connectors via `PartSpec.electricallyInert`: the kind cannot decide
 * inertness, and a part that might conduct is refused rather than assumed
 * transparent. A 0.001-ohm resistor between two nets and a six-pin ground
 * header look identical to a pin map; only the declaration tells them apart.
 *
 * A PIN MAP CANNOT ANSWER THIS, so this function used to try a different
 * question instead: whether two of the component's pins named the same net,
 * refusing when they did. That was wrong, not merely incomplete - it
 * confused "two pins on the same net" with "joining two different nets".
 * Nets are implied by pin references rather than declared (see
 * `lib/model/types.ts`): two pins naming the same string ARE one net, by the
 * model's own rule, everywhere else in this repository. A physical-only
 * component with six pins all naming net "0" joins nothing that was not
 * already joined elsewhere in the circuit; projecting it away removes no
 * edge, because there was never an edge there to remove. Refusing that case
 * was refusing a correct, intentional design (a connector landing several
 * physically interleaved ground pins on one net) for a hazard it cannot
 * occur. The check below is the inertness declaration alone.
 */
export function assertElectricallyTransparent(component: Component): void {
  if (component.part?.electricallyInert !== true) {
    throw new Error(
      `physical-only component "${component.id}" does not declare part.electricallyInert: true. ` +
        "A pin map cannot show that a part conducts nothing between its pads - a 0.001-ohm " +
        "resistor between two different nets names them just as cleanly as an inert connector " +
        "does. A physical-only component is projected away when the board is compared against " +
        "its electrical partition, so a part that MIGHT conduct (a ground-lift link, a " +
        "chassis-ground resistor) cannot be projected away without declaring electricallyInert: " +
        "true first, the same declaration kind \"connector\" already requires in " +
        "lib/sim/device-lines.ts.",
    )
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
