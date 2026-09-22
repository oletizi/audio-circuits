/**
 * Composition. One primitive, deliberately.
 *
 * THERE ARE NO IMPLICIT OR GLOBAL NETS. Ground, supply rails and bias
 * references are not special: every net crossing a composition boundary must be
 * a declared port and must be explicitly bound. The property this buys is that
 * `mid_GND` can never silently appear because someone assumed ground was
 * ambient - a rail that should be shared and is not becomes a construction
 * error instead of a subtle simulation result.
 */
import type { Component, Connection, Network, Unit } from "./types.ts"

export type PortMap = Readonly<Record<string, string>>

function rename(
  c: Connection,
  prefix: string,
  bound: Readonly<Record<string, string>>,
): Connection {
  if (c.kind === "nc") return c
  const parent = bound[c.net]
  return { kind: "net", net: parent ?? `${prefix}_${c.net}` }
}

export function includeNetwork(
  prefix: string,
  network: Network,
  portMap: PortMap,
): readonly Component[] {
  if (prefix.length === 0) throw new Error("include prefix must not be empty")

  for (const portName of Object.keys(portMap)) {
    if (!Object.prototype.hasOwnProperty.call(network.ports, portName)) {
      throw new Error(
        `"${portName}" is not a declared port of the included network. ` +
          `Declared: ${Object.keys(network.ports).join(", ") || "(none)"}`,
      )
    }
  }
  for (const portName of Object.keys(network.ports)) {
    if (!Object.prototype.hasOwnProperty.call(portMap, portName)) {
      throw new Error(
        `port "${portName}" of the included network is not bound. There are no ` +
          `implicit global nets: bind every declared port explicitly.`,
      )
    }
  }

  // Internal net name -> parent net name, for the nets the ports name.
  const bound: Record<string, string> = {}
  for (const [portName, parentNet] of Object.entries(portMap)) {
    const internal = network.ports[portName]
    if (internal === undefined) {
      throw new Error(`port "${portName}" has no net`)
    }
    bound[internal] = parentNet
  }

  return network.components.map((component): Component => {
    const units: readonly Unit[] = component.units.map((unit) => ({
      ...unit,
      pins: Object.fromEntries(
        Object.entries(unit.pins).map(([pin, c]) => [pin, rename(c, prefix, bound)]),
      ),
    }))
    return {
      ...component,
      id: `${prefix}_${component.id}`,
      pins: Object.fromEntries(
        Object.entries(component.pins).map(([pin, c]) => [pin, rename(c, prefix, bound)]),
      ),
      units,
    }
  })
}
