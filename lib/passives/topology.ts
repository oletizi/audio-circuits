/** Source-labelled connectivity, before schematic layout or PCB partitioning.
 * Pin keys and net names are stable reference identifiers, not board-local names.
 * A pot retains all three terminals; a switch retains every contact and its poles.
 */
export interface PassiveElement {
  readonly ref: string
  readonly kind: "resistor" | "capacitor" | "inductor" | "potentiometer" | "switch"
  readonly pins: Readonly<Record<string, string>>
  /** Values, taper, contact tables, winding/tap details, and source annotations. */
  readonly parameters: Readonly<Record<string, string>>
}

export interface PassiveNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly elements: readonly PassiveElement[]
}

function sortedEntries(record: Readonly<Record<string, string>>) {
  return Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
}

function validate(network: PassiveNetwork) {
  const refs = new Set<string>()
  for (const element of network.elements) {
    if (!element.ref || refs.has(element.ref)) throw new Error(`Duplicate or empty reference: ${element.ref}`)
    refs.add(element.ref)
    if (Object.keys(element.pins).length < 2) throw new Error(`Missing pins: ${element.ref}`)
    for (const [pin, net] of Object.entries(element.pins)) {
      if (!pin || !net) throw new Error(`Empty pin/net: ${element.ref}`)
    }
  }
  const nets = new Set(network.elements.flatMap(element => Object.values(element.pins)))
  for (const [port, net] of Object.entries(network.ports)) {
    if (!port || !nets.has(net)) throw new Error(`Unconnected port: ${port}`)
  }
}

/** Deliberately strict: compares labelled topology and parameters, not transfer functions.
 * Does not accept net renaming, resistor reduction, or electrically similar redesigns.
 */
export function assertSameTopology(reference: PassiveNetwork, candidate: PassiveNetwork): void {
  const signature = (network: PassiveNetwork) => {
    validate(network)
    return JSON.stringify({
      ports: sortedEntries(network.ports),
      elements: [...network.elements].sort((a, b) => a.ref.localeCompare(b.ref)).map(e => ({
        ref: e.ref, kind: e.kind, pins: sortedEntries(e.pins), parameters: sortedEntries(e.parameters),
      })),
    })
  }
  if (signature(reference) !== signature(candidate)) throw new Error("Passive topology differs from reference")
}

/** Assigns physical ownership without modifying any electrical connection.
 * Returned boundary nets need one continuous conductor each across their owners.
 * This is not a connector pin order, standalone termination, or PCB implementation.
 */
export function partitionTopology(network: PassiveNetwork, ownerByRef: Readonly<Record<string, string>>) {
  validate(network)
  const refs = new Set(network.elements.map(e => e.ref))
  for (const ref of Object.keys(ownerByRef)) {
    if (!refs.has(ref)) throw new Error(`Unknown reference: ${ref}`)
  }
  const modules: Record<string, PassiveElement[]> = Object.create(null)
  const ownersByNet = new Map<string, Set<string>>()
  for (const element of network.elements) {
    if (!Object.prototype.hasOwnProperty.call(ownerByRef, element.ref) || !ownerByRef[element.ref]) {
      throw new Error(`Missing owner: ${element.ref}`)
    }
    const owner = ownerByRef[element.ref]
    ;(modules[owner] ??= []).push(element)
    for (const net of Object.values(element.pins)) {
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
