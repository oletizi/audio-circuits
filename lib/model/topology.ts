import type { Component, Network } from "./types.ts"

type Canonical = string | number | boolean | null | readonly Canonical[] | { readonly [k: string]: Canonical }

/** Recursively sorts object keys so serialization is order-independent.
 * Keys whose value is `undefined` are skipped, so an explicitly-undefined optional
 * field canonicalizes identically to an absent one.
 */
function canonicalize(value: unknown): Canonical {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    const out: Record<string, Canonical> = {}
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      const entryValue = Reflect.get(value, key)
      if (entryValue === undefined) continue
      out[key] = canonicalize(entryValue)
    }
    return out
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value
  }
  throw new Error(`Non-canonicalizable parameter value: ${String(value)}`)
}

/** Deliberately strict: compares labelled topology and parameters, not transfer functions.
 * Does not accept net renaming, resistor reduction, or electrically similar redesigns.
 *
 * Connectivity comes from a component's package `pins` plus every unit's `pins`, so a
 * two-terminal passive (package pins empty, one "MAIN" unit carrying `a`/`b`) and a
 * multi-unit part with shared supply pins compare the same way. Provenance is metadata
 * and is deliberately excluded from every signature below.
 */
export function assertSameTopology(reference: Network, candidate: Network): void {
  const signature = (network: Network) =>
    JSON.stringify({
      ports: canonicalize(network.ports),
      components: [...network.components]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(({ id, kind, pins, units, parameters }) => ({
          id, kind, pins: canonicalize(pins), units: canonicalize(units), parameters: canonicalize(parameters),
        })),
    })
  const referenceSignature = signature(reference)
  const candidateSignature = signature(candidate)
  if (referenceSignature === candidateSignature) return

  const componentSignature = (component: Component) =>
    JSON.stringify(canonicalize({
      kind: component.kind, pins: component.pins, units: component.units, parameters: component.parameters,
    }))
  const referenceById = new Map(reference.components.map(c => [c.id, componentSignature(c)]))
  const candidateById = new Map(candidate.components.map(c => [c.id, componentSignature(c)]))
  for (const id of [...referenceById.keys()].sort((a, b) => a.localeCompare(b))) {
    const candidateEntry = candidateById.get(id)
    if (candidateEntry === undefined) throw new Error(`Topology differs from reference: ${id} is missing`)
    if (candidateEntry !== referenceById.get(id)) {
      throw new Error(`Topology differs from reference: ${id} differs\n  reference: ${referenceById.get(id)}\n  candidate: ${candidateEntry}`)
    }
  }
  for (const id of candidateById.keys()) {
    if (!referenceById.has(id)) throw new Error(`Topology differs from reference: ${id} is unexpected`)
  }
  throw new Error("Topology differs from reference: external ports differ")
}

export interface PartitionOptions {
  /** When present, every owner name must appear here. */
  readonly allowedOwners?: readonly string[]
}

/** Every net a component touches, across its package pins and every unit's pins.
 * A no-connect contributes nothing - it is not a net. */
function componentNets(component: Component): readonly string[] {
  const nets: string[] = []
  for (const connection of Object.values(component.pins)) {
    if (connection.kind === "net") nets.push(connection.net)
  }
  for (const unit of component.units) {
    for (const connection of Object.values(unit.pins)) {
      if (connection.kind === "net") nets.push(connection.net)
    }
  }
  return nets
}

/** Assigns physical ownership without modifying any electrical connection.
 * Returned boundary nets need one continuous conductor each across their owners.
 * This is not a connector pin order, standalone termination, or PCB implementation.
 */
export function partitionTopology(network: Network, ownerById: Readonly<Record<string, string>>, options?: PartitionOptions) {
  const ids = new Set(network.components.map(c => c.id))
  for (const id of Object.keys(ownerById)) {
    if (!ids.has(id)) throw new Error(`Unknown reference: ${id}`)
  }
  const modules: Record<string, Component[]> = Object.create(null)
  const ownersByNet = new Map<string, Set<string>>()
  for (const component of network.components) {
    if (!Object.prototype.hasOwnProperty.call(ownerById, component.id) || !ownerById[component.id]) {
      throw new Error(`Missing owner: ${component.id}`)
    }
    const owner = ownerById[component.id]
    if (options?.allowedOwners && !options.allowedOwners.includes(owner)) {
      throw new Error(`Unknown owner: ${owner} (allowed: ${options.allowedOwners.join(", ")})`)
    }
    ;(modules[owner] ??= []).push(component)
    for (const net of componentNets(component)) {
      if (!ownersByNet.has(net)) ownersByNet.set(net, new Set())
      ownersByNet.get(net)!.add(owner)
    }
  }
  const boundaryNets = [...ownersByNet.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([net, owners]) => ({ net, owners: [...owners].sort() }))
    .sort((a, b) => a.net.localeCompare(b.net))
  return { modules, boundaryNets, ports: network.ports }
}
