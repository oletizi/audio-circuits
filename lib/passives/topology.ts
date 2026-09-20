import type {
  CapacitorParameters, InductorParameters, PotentiometerParameters,
  Provenance, ResistorParameters, SwitchParameters,
} from "./parameters.ts"

/** Source-labelled connectivity, before schematic layout or PCB partitioning.
 * Pin keys and net names are stable reference identifiers, not board-local names.
 * A pot retains all three terminals; a switch retains every contact and its poles.
 */
interface ElementBase<K extends string, P> {
  readonly ref: string
  readonly kind: K
  readonly pins: Readonly<Record<string, string>>
  readonly parameters: P
  /** Provenance is metadata. assertSameTopology ignores it. */
  readonly provenance?: Provenance
}

export type PassiveElement =
  | ElementBase<"resistor", ResistorParameters>
  | ElementBase<"capacitor", CapacitorParameters>
  | ElementBase<"inductor", InductorParameters>
  | ElementBase<"potentiometer", PotentiometerParameters>
  | ElementBase<"switch", SwitchParameters>

export interface PassiveNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly elements: readonly PassiveElement[]
}

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
      ports: canonicalize(network.ports),
      elements: [...network.elements]
        .sort((a, b) => a.ref.localeCompare(b.ref))
        .map(({ ref, kind, pins, parameters }) => ({
          ref, kind, pins: canonicalize(pins), parameters: canonicalize(parameters),
        })),
    })
  }
  if (signature(reference) !== signature(candidate)) throw new Error("Passive topology differs from reference")
}

export interface PartitionOptions {
  /** When present, every owner name must appear here. */
  readonly allowedOwners?: readonly string[]
}

/** Assigns physical ownership without modifying any electrical connection.
 * Returned boundary nets need one continuous conductor each across their owners.
 * This is not a connector pin order, standalone termination, or PCB implementation.
 */
export function partitionTopology(network: PassiveNetwork, ownerByRef: Readonly<Record<string, string>>, options?: PartitionOptions) {
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
    if (options?.allowedOwners && !options.allowedOwners.includes(owner)) {
      throw new Error(`Unknown owner: ${owner} (allowed: ${options.allowedOwners.join(", ")})`)
    }
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
