/**
 * Structural validation of a Network.
 *
 * Throws on the first violation, naming it. Nothing here degrades or repairs:
 * a malformed network is a programming error, and a fallback would hide it.
 */
import { hasOpenVocabulary, packagePins, unitPins } from "./kinds.ts"
import type { Component, Connection, Network, Parameters } from "./types.ts"

function netOf(c: Connection): string | undefined {
  return c.kind === "net" ? c.net : undefined
}

/** `Component.kind` and `Component.parameters` are independent fields - nothing
 * ties `kind: "resistor"` to `parameters` actually carrying `ohms` - so
 * `{kind: "resistor", parameters: {}}` typechecks. Reading an arbitrary
 * `parameters` field generically (rather than `as`-casting to one union member)
 * mirrors `topology.ts`'s `canonicalize`, which does the same for the same reason.
 */
function hasField(parameters: Parameters, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(parameters, field)
}

function fieldValue(parameters: Parameters, field: string): unknown {
  return Reflect.get(parameters, field)
}

const isNumber = (value: unknown): boolean => typeof value === "number"
const isArray = (value: unknown): boolean => Array.isArray(value)
const isObject = (value: unknown): boolean => typeof value === "object" && value !== null

/** Throws naming the component and the missing or mistyped field, rather than
 * letting a malformed value reach a downstream consumer (the SPICE emitter, for
 * instance) that assumes the field is present and correctly typed.
 */
function requireField(
  component: Component,
  field: string,
  isValid: (value: unknown) => boolean,
  describe: string,
): void {
  if (!hasField(component.parameters, field)) {
    throw new Error(
      `component "${component.id}": missing parameter "${field}" required by kind ${component.kind}`,
    )
  }
  if (!isValid(fieldValue(component.parameters, field))) {
    throw new Error(
      `component "${component.id}": parameter "${field}" must be ${describe}, required by kind ${component.kind}`,
    )
  }
}

/** Restores at runtime the guarantee the old `PassiveElement` discriminated union
 * gave for free: a component's `parameters` actually match its `kind`. `Component`
 * and `Parameters` can't express that tie statically (spec 3.5's flat-`Parameters`
 * question is deferred to the device work), so a value like
 * `{kind: "resistor", parameters: {}}` typechecks clean and would otherwise crash
 * far from here, inside the SPICE emitter, with no name attached to the cause.
 */
function checkParameters(component: Component): void {
  switch (component.kind) {
    case "resistor":
      requireField(component, "ohms", isNumber, "a number")
      break
    case "capacitor":
      requireField(component, "farads", isNumber, "a number")
      break
    case "inductor":
      requireField(component, "henries", isNumber, "a number")
      break
    case "potentiometer":
      requireField(component, "ohms", isNumber, "a number")
      requireField(component, "taper", isObject, "a Taper object")
      break
    case "switch":
      requireField(component, "positions", isArray, "an array")
      requireField(component, "contacts", isObject, "an object")
      break
    default:
      break
  }
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
    checkParameters(component)
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
