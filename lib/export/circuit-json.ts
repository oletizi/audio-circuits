import type { AnyCircuitElement } from "circuit-json"
import { parseValue } from "../passives/units.ts"
import { UnionFind } from "../passives/union-find.ts"
import type { PassiveElement, PassiveNetwork } from "../passives/topology.ts"

export interface ExportMapping {
  /** Emitted component name to canonical reference. Every component must appear. */
  readonly componentNames: Readonly<Record<string, string>>
  /** Emitted net name to canonical net. */
  readonly netNames: Readonly<Record<string, string>>
  /** Emitted port name to canonical pin key. tscircuit names a two-terminal passive's
   * ports `pin1`/`pin2`; the resolver (`resolveNetwork`) requires two-terminal elements
   * keyed `a`/`b`, so this mapping is what joins the export seam to the resolve seam.
   * Typically `{ pin1: "a", pin2: "b" }`. Every emitted port of every exported component
   * must appear; an unmapped port throws rather than passing the raw name through, which
   * would produce a network the resolver rejects.
   */
  readonly pinNames: Readonly<Record<string, string>>
  /** Canonical port name to canonical net. */
  readonly ports: Readonly<Record<string, string>>
}

type PassiveKind = "resistor" | "capacitor" | "inductor"

const FTYPE_KIND: Readonly<Record<string, PassiveKind>> = {
  simple_resistor: "resistor",
  simple_capacitor: "capacitor",
  simple_inductor: "inductor",
}

const FIELD_BY_KIND: Readonly<Record<PassiveKind, "resistance" | "capacitance" | "inductance">> = {
  resistor: "resistance",
  capacitor: "capacitance",
  inductor: "inductance",
}

interface ComponentRecord {
  readonly name: string
}

interface PortRecord {
  readonly name: string
  readonly componentId: string
}

interface NetRecord {
  readonly name: string
}

interface Indices {
  readonly components: ReadonlyMap<string, ComponentRecord>
  readonly ports: ReadonlyMap<string, PortRecord>
  readonly nets: ReadonlyMap<string, NetRecord>
  /** Every port id and net id, the shared id space the union-find groups over. */
  readonly memberIds: ReadonlySet<string>
}

function indexElements(circuitJson: readonly AnyCircuitElement[]): Indices {
  const components = new Map<string, ComponentRecord>()
  const ports = new Map<string, PortRecord>()
  const nets = new Map<string, NetRecord>()
  for (const element of circuitJson) {
    if (element.type === "source_component") {
      components.set(element.source_component_id, { name: element.name })
    } else if (element.type === "source_port") {
      if (element.source_component_id === undefined) {
        throw new Error(`Port without owning component: ${element.name}`)
      }
      ports.set(element.source_port_id, { name: element.name, componentId: element.source_component_id })
    } else if (element.type === "source_net") {
      nets.set(element.source_net_id, { name: element.name })
    }
  }
  const memberIds = new Set<string>([...ports.keys(), ...nets.keys()])
  return { components, ports, nets, memberIds }
}

function assertNoDanglingPins(circuitJson: readonly AnyCircuitElement[], indices: Indices): void {
  const dangling: string[] = []
  for (const element of circuitJson) {
    if (element.type !== "source_pin_missing_trace_warning") continue
    const port = indices.ports.get(element.source_port_id)
    const component = port ? indices.components.get(port.componentId) : undefined
    dangling.push(port && component ? `${component.name}.${port.name}` : element.source_port_id)
  }
  if (dangling.length > 0) throw new Error(`Dangling pins: ${dangling.sort().join(", ")}`)
}

function buildUnionFind(circuitJson: readonly AnyCircuitElement[], indices: Indices): UnionFind {
  const uf = new UnionFind(indices.memberIds, (a, b) => (a < b ? a : b))
  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const ids = [...element.connected_source_port_ids, ...element.connected_source_net_ids]
    const [first, ...rest] = ids
    if (first === undefined) continue
    for (const id of rest) uf.union(first, id)
  }
  return uf
}

/** Groups every port/net id by its union-find root, then resolves each group to a
 * canonical net name. A group with no named `source_net` member has no derived
 * fallback: it throws, naming the ports in that group. A group with more than one
 * DIFFERENT named net has had two declared nets shorted together - also no
 * fallback: picking one would silently discard the other's existence.
 */
function nameGroups(uf: UnionFind, indices: Indices, netNames: Readonly<Record<string, string>>): ReadonlyMap<string, string> {
  const groups = new Map<string, string[]>()
  for (const id of indices.memberIds) {
    const root = uf.find(id)
    const existing = groups.get(root)
    if (existing) existing.push(id)
    else groups.set(root, [id])
  }

  const canonicalNetByRoot = new Map<string, string>()
  for (const [root, ids] of groups) {
    const namedNetIds = ids.filter(id => indices.nets.has(id)).sort()
    if (namedNetIds.length > 1) {
      const names = namesForNetIds(namedNetIds, indices.nets).sort()
      throw new Error(`Conflicting nets in group: ${names.join(", ")}`)
    }
    const resolvedName = resolveGroupNetName(namedNetIds, indices.nets, netNames)
    if (resolvedName !== undefined) {
      canonicalNetByRoot.set(root, resolvedName)
      continue
    }
    throw new Error(`Unnamed net group: ${portLabelsForGroup(ids, indices)}`)
  }
  return canonicalNetByRoot
}

function namesForNetIds(netIds: readonly string[], nets: ReadonlyMap<string, NetRecord>): string[] {
  return netIds.map(id => {
    const record = nets.get(id)
    if (!record) throw new Error(`Missing net record: ${id}`)
    return record.name
  })
}

function resolveGroupNetName(
  namedNetIds: readonly string[],
  nets: ReadonlyMap<string, NetRecord>,
  netNames: Readonly<Record<string, string>>,
): string | undefined {
  const firstNetId = namedNetIds[0]
  if (firstNetId === undefined) return undefined
  const netRecord = nets.get(firstNetId)
  if (!netRecord) throw new Error(`Missing net record: ${firstNetId}`)
  const canonical = netNames[netRecord.name]
  if (canonical === undefined) throw new Error(`Unmapped net: ${netRecord.name}`)
  return canonical
}

function portLabelsForGroup(ids: readonly string[], indices: Indices): string {
  return ids
    .filter(id => indices.ports.has(id))
    .map(id => {
      const port = indices.ports.get(id)
      if (!port) throw new Error(`Missing port record: ${id}`)
      const component = indices.components.get(port.componentId)
      if (!component) throw new Error(`Missing component record: ${port.componentId}`)
      return `${component.name}.${port.name}`
    })
    .sort()
    .join(", ")
}

function kindForFtype(ftype: string, componentName: string): PassiveKind {
  if (!Object.prototype.hasOwnProperty.call(FTYPE_KIND, ftype)) {
    throw new Error(`Unsupported ftype: ${ftype} (component ${componentName})`)
  }
  return FTYPE_KIND[ftype]
}

function resolveNumericValue(raw: unknown, field: string, componentName: string): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new Error(`Non-finite ${field} on ${componentName}: ${raw}`)
    return raw
  }
  if (typeof raw === "string") return parseValue(raw)
  throw new Error(`Unreadable ${field} on ${componentName}: expected number or string, got ${typeof raw}`)
}

function buildElement(ref: string, kind: PassiveKind, pins: Readonly<Record<string, string>>, value: number): PassiveElement {
  switch (kind) {
    case "resistor":
      return { ref, kind, pins, parameters: { ohms: value } }
    case "capacitor":
      return { ref, kind, pins, parameters: { farads: value } }
    case "inductor":
      return { ref, kind, pins, parameters: { henries: value } }
  }
}

interface PinContext {
  readonly indices: Indices
  readonly uf: UnionFind
  readonly canonicalNetByRoot: ReadonlyMap<string, string>
  readonly pinNames: Readonly<Record<string, string>>
}

/** Rekeys a component's emitted ports to canonical pin keys. An emitted port with no
 * entry in `pinNames` throws naming the component and the port; passing the raw name
 * through instead would build a `PassiveNetwork` keyed `pin1`/`pin2`, which
 * `resolveNetwork` rejects later and further from the cause.
 */
function buildPins(componentId: string, componentName: string, context: PinContext): Record<string, string> {
  const pins: Record<string, string> = {}
  for (const [portId, port] of context.indices.ports) {
    if (port.componentId !== componentId) continue
    const net = context.canonicalNetByRoot.get(context.uf.find(portId))
    if (net === undefined) throw new Error(`Unresolved net for pin: ${componentName}.${port.name}`)
    const pinKey = context.pinNames[port.name]
    if (pinKey === undefined) throw new Error(`Unmapped pin: ${componentName}.${port.name}`)
    const existing = pins[pinKey]
    if (existing !== undefined) {
      throw new Error(`Two emitted ports map to the same canonical pin key: ${componentName}.${pinKey}`)
    }
    pins[pinKey] = net
  }
  return pins
}

/** Flattens tscircuit's emitted circuit JSON to canonical labelled connectivity.
 * Every unmapped component, unmapped net, unmapped pin, dangling pin, unnamed net group,
 * and conflicting (shorted) net pair throws rather than falling back to a derived or
 * default value.
 *
 * The result is intended to feed `resolveNetwork`, so `mapping.pinNames` must rekey each
 * two-terminal passive's emitted ports to `a` and `b`; see `ExportMapping.pinNames`.
 */
export function toLabelledNetwork(circuitJson: readonly AnyCircuitElement[], mapping: ExportMapping): PassiveNetwork {
  const indices = indexElements(circuitJson)
  assertNoDanglingPins(circuitJson, indices)
  const uf = buildUnionFind(circuitJson, indices)
  const canonicalNetByRoot = nameGroups(uf, indices, mapping.netNames)
  const pinContext: PinContext = { indices, uf, canonicalNetByRoot, pinNames: mapping.pinNames }

  const elements: PassiveElement[] = []
  for (const element of circuitJson) {
    if (element.type !== "source_component") continue
    const ref = mapping.componentNames[element.name]
    if (ref === undefined) throw new Error(`Unmapped component: ${element.name}`)

    const kind = kindForFtype(element.ftype, element.name)
    const pins = buildPins(element.source_component_id, element.name, pinContext)
    const raw: unknown = Reflect.get(element, FIELD_BY_KIND[kind])
    const value = resolveNumericValue(raw, FIELD_BY_KIND[kind], element.name)
    elements.push(buildElement(ref, kind, pins, value))
  }

  elements.sort((a, b) => a.ref.localeCompare(b.ref))
  return { ports: mapping.ports, elements }
}
