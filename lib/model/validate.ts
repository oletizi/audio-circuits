/**
 * Structural validation of a Network.
 *
 * Throws on the first violation, naming it. Nothing here degrades or repairs:
 * a malformed network is a programming error, and a fallback would hide it.
 */
import { hasOpenVocabulary, packagePins, unitPins } from "./kinds.ts"
import type { Component, Connection, Network } from "./types.ts"

function netOf(c: Connection): string | undefined {
  return c.kind === "net" ? c.net : undefined
}

function checkVocabulary(component: Component): void {
  const allowedPackage = packagePins(component.kind)
  for (const pin of Object.keys(component.pins)) {
    if (!allowedPackage.includes(pin)) {
      throw new Error(
        `component "${component.id}": package pin "${pin}" is not in the ` +
          `${component.kind} vocabulary [${allowedPackage.join(", ")}]`,
      )
    }
  }
  for (const missing of allowedPackage.filter((p) => !(p in component.pins))) {
    throw new Error(
      `component "${component.id}": missing package pin "${missing}" required by kind ${component.kind}`,
    )
  }

  const open = hasOpenVocabulary(component.kind)
  const allowedUnit = unitPins(component.kind)
  for (const unit of component.units) {
    const names = Object.keys(unit.pins)
    if (names.length === 0) {
      throw new Error(
        `component "${component.id}" unit "${unit.name}" declares no pins`,
      )
    }
    if (open) continue
    for (const pin of names) {
      if (!allowedUnit.includes(pin)) {
        throw new Error(
          `component "${component.id}" unit "${unit.name}": pin "${pin}" is not in ` +
            `the ${component.kind} vocabulary [${allowedUnit.join(", ")}]`,
        )
      }
    }
    for (const missing of allowedUnit.filter((p) => !(p in unit.pins))) {
      throw new Error(
        `component "${component.id}" unit "${unit.name}": missing pin "${missing}" ` +
          `required by kind ${component.kind}`,
      )
    }
  }
}

export function validateNetwork(network: Network): void {
  const seen = new Set<string>()
  for (const component of network.components) {
    if (component.id.length === 0) throw new Error("component id must not be empty")
    if (seen.has(component.id)) {
      throw new Error(`duplicate component id "${component.id}"`)
    }
    seen.add(component.id)
    if (component.units.length === 0) {
      throw new Error(`component "${component.id}" declares no units`)
    }
    const unitNames = new Set<string>()
    for (const unit of component.units) {
      if (unitNames.has(unit.name)) {
        throw new Error(`component "${component.id}": duplicate unit "${unit.name}"`)
      }
      unitNames.add(unit.name)
    }
    checkVocabulary(component)
  }

  // Count component pins per net. An explicit no-connect contributes nothing,
  // which is what makes it exempt from the floating rule below.
  const pinCount = new Map<string, number>()
  const bump = (name: string) => pinCount.set(name, (pinCount.get(name) ?? 0) + 1)
  for (const component of network.components) {
    for (const c of Object.values(component.pins)) {
      const n = netOf(c)
      if (n !== undefined) bump(n)
    }
    for (const unit of component.units) {
      for (const c of Object.values(unit.pins)) {
        const n = netOf(c)
        if (n !== undefined) bump(n)
      }
    }
  }

  for (const [portName, netName] of Object.entries(network.ports)) {
    if (!pinCount.has(netName)) {
      throw new Error(
        `port "${portName}" names net "${netName}", which no component pin sits on`,
      )
    }
  }

  const ported = new Set(Object.values(network.ports))
  for (const [netName, count] of pinCount) {
    if (count === 1 && !ported.has(netName)) {
      throw new Error(
        `net "${netName}" has only one component pin and is not a declared port. ` +
          `Connect it, declare a port for it, or mark the pin as a no-connect.`,
      )
    }
  }
}
