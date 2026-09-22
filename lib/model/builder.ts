/**
 * The authoring layer: a circuit is a function that returns a Network.
 *
 * The builder exists so declarations read like the circuit rather than like a
 * data structure. It throws as early as it can - a duplicate id is rejected at
 * the declaration that causes it, not at done(), so the stack points at the
 * mistake.
 */
import { parseValue } from "../passives/units.ts"
import { validateNetwork } from "./validate.ts"
import { includeNetwork } from "./include.ts"
import { NC, net } from "./types.ts"
import type { Component, Connection, Network, PartSpec, Unit } from "./types.ts"
import type { PortMap } from "./include.ts"

/** A pin map accepts a bare net name as shorthand for net(name). */
export type PinMap = Readonly<Record<string, string | Connection>>

function toConnections(pins: PinMap): Readonly<Record<string, Connection>> {
  const out: Record<string, Connection> = {}
  for (const [pin, value] of Object.entries(pins)) {
    out[pin] = typeof value === "string" ? net(value) : value
  }
  return out
}

const mainUnit = (pins: PinMap): readonly Unit[] => [
  { name: "MAIN", pins: toConnections(pins) },
]

export class Builder {
  private readonly components: Component[] = []
  private readonly ports: Record<string, string> = {}

  private push(component: Component): this {
    if (this.components.some((c) => c.id === component.id)) {
      throw new Error(`duplicate component id "${component.id}"`)
    }
    this.components.push(component)
    return this
  }

  resistor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "resistor", parameters: { ohms: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  capacitor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "capacitor", parameters: { farads: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  inductor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "inductor", parameters: { henries: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  ic(id: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "ic", parameters: {}, pins: {},
      units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  connector(id: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "connector", parameters: {}, pins: {},
      units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  /** Escape hatch for kinds the builder has no shorthand for yet. */
  add(component: Component): this {
    return this.push(component)
  }

  include(prefix: string, network: Network, portMap: PortMap): this {
    for (const component of includeNetwork(prefix, network, portMap)) {
      this.push(component)
    }
    return this
  }

  port(name: string, netName: string): this {
    if (Object.prototype.hasOwnProperty.call(this.ports, name)) {
      throw new Error(`port "${name}" is already declared`)
    }
    this.ports[name] = netName
    return this
  }

  done(): Network {
    const network: Network = {
      components: [...this.components],
      ports: { ...this.ports },
    }
    validateNetwork(network)
    return network
  }
}

export function circuit(): Builder {
  return new Builder()
}

export { NC }
