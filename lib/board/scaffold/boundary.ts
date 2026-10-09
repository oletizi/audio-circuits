/**
 * Which of a section's nets are externally shared.
 *
 * DISCOVERED, NEVER LISTED. The scaffold spec's per-section terminal tables are
 * results of this function rather than inputs to it. An implementation that inferred
 * the boundary from the four named ladder nodes would omit ground, and the reduction
 * would then discard a resistor-to-internal-node-to-capacitor-to-ground shunt as "not
 * on a path between two boundary nodes" - a legitimate network, silently gone.
 *
 * The two phrasings "on a path between two boundary nodes" and "not genuinely
 * disconnected" are NOT equivalent, and ground in the boundary set is what reconciles
 * them. See `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`.
 *
 * Ground is not special-cased because it is ground; it is included because it is
 * externally shared. This repository has no implicit or global nets - ground crosses a
 * composition boundary only as a declared port, and it already appears on every
 * section board's terminal block - so including it is discovery, not an exception.
 */
import type { Component } from "../../model/types.ts"

/** Every net any pin of any of these components names. A no-connect pin names none. */
function netsOf(components: readonly Component[]): Set<string> {
  const nets = new Set<string>()
  for (const component of components) {
    for (const connection of Object.values(component.pins)) {
      if (connection.kind === "net") nets.add(connection.net)
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        if (connection.kind === "net") nets.add(connection.net)
      }
    }
  }
  return nets
}

export function discoverBoundary(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  groundNet: string,
): ReadonlySet<string> {
  const own = modules[sectionName]
  if (own === undefined) {
    throw new Error(
      `Unknown section: ${sectionName}. Known sections: ` +
        `${Object.keys(modules).sort().join(", ")}. Section names come from ` +
        `circuits/pultec/partition.ts and are not defaulted.`,
    )
  }
  const ownNets = netsOf(own)
  const foreign = new Set<string>()
  for (const [name, components] of Object.entries(modules)) {
    if (name === sectionName) continue
    for (const net of netsOf(components)) foreign.add(net)
  }

  const boundary = new Set<string>()
  for (const net of ownNets) if (foreign.has(net)) boundary.add(net)
  if (ownNets.has(groundNet)) boundary.add(groundNet)
  return boundary
}
