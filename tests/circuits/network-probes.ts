/**
 * Read-only probes a circuit test uses to ask a `Network` questions, plus the
 * two that read an emitted SPICE deck back.
 *
 * Every one of them THROWS rather than returning `undefined` when what it was
 * asked for is absent. That is the point of having them: a probe that returned
 * `undefined` for a renamed component would turn the assertion built on it into
 * a comparison of two absent things, which passes. A test that cannot find what
 * it meant to assert about has not passed, it has failed to run.
 *
 * Split out of `optical-compressor.test.ts` when that file reached this
 * repository's 500-line ceiling. Nothing here is compressor-specific.
 */
import type { Component, Network } from "../../lib/model/types.ts"

export function componentById(network: Network, id: string): Component {
  const found = network.components.find(c => c.id === id)
  if (!found) throw new Error(`no component "${id}"`)
  return found
}

export function parameterOf(network: Network, id: string, field: string): unknown {
  return Reflect.get(componentById(network, id).parameters, field)
}

/** A component's numeric `ohms`, for a test that needs to compute with it
 * rather than compare it. */
export function ohmsOf(network: Network, id: string): number {
  const value = parameterOf(network, id, "ohms")
  if (typeof value !== "number") {
    throw new Error(`component "${id}" carries no numeric "ohms" parameter`)
  }
  return value
}

export function netOfPin(network: Network, id: string, unitName: string, pin: string): string {
  const unit = componentById(network, id).units.find(u => u.name === unitName)
  if (!unit) throw new Error(`component "${id}" has no unit "${unitName}"`)
  const connection = unit.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`component "${id}" unit "${unitName}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

/** The net a PACKAGE pin sits on - the pins shared across a multi-section
 * component's units, which is where a dual op-amp's supplies live. */
export function packageNet(network: Network, id: string, pin: string): string {
  const connection = componentById(network, id).pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`component "${id}" package pin "${pin}" is not on a net`)
  }
  return connection.net
}

/** Every net a component touches, across package and unit pins. */
export function netsTouched(component: Component): readonly string[] {
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

/** A copy of `network` with one resistor's value replaced - a deliberately
 * DIFFERENT circuit, built in memory so nothing on disk is touched. Throws if
 * the id is absent or is not a resistor, so a rename cannot turn a test that
 * compares the two into a comparison of one network against itself. */
export function withResistance(network: Network, id: string, ohms: number): Network {
  const target = componentById(network, id)
  if (target.kind !== "resistor") {
    throw new Error(`component "${id}" is a ${target.kind}, not a resistor`)
  }
  return {
    ports: network.ports,
    components: network.components.map(component =>
      component.id === id ? { ...component, parameters: { ohms } } : component,
    ),
  }
}

/** One element line of an emitted deck, found by its element name. */
export function elementLine(netlist: string, name: string): string {
  const line = netlist.split("\n").find(l => l.startsWith(`${name} `))
  if (line === undefined) {
    throw new Error(`the deck emits no element line named "${name}"`)
  }
  return line
}

/** A SPICE element line's trailing field: the value, or the model name. */
export function lastField(line: string, where: string): string {
  const fields = line.trim().split(/\s+/)
  if (fields.length < 2) throw new Error(`${where}: "${line}" has no value field`)
  return fields[fields.length - 1]
}
