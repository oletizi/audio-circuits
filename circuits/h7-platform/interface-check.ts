/**
 * Compares a board model's J_MOD_A / J_MOD_B connections to the 40-pin contract
 * (design goal G4, open item CONTRACT-MODEL-CHECK).
 *
 * Model conventions this check relies on:
 * - A socket pad is the pin keyed by the pad number as a string, e.g. "8", on the
 *   socket component's units (or its package pins).
 * - Each socket component must list exactly pads "1".."20". A missing pad, or a
 *   pad outside 1..20, is a mismatch: a socket model missing a pad must not pass.
 * - "nc" means an unconnected pad: the pin carries the model's tagged no-connect
 *   (`NC`) and nothing else. An absent pad is not nc. A pad on a net with no other
 *   member is not a third representation; `validateNetwork` refuses that.
 *
 * Rules: a signal pin's net is named exactly the contract signal. Reserved pins
 * are nc on module and pedal; on the carrier they sit on net RESERVED_<pin> with
 * exactly two members, the pad and one breakout terminal (spec G4 exception).
 *
 * Gap, stated rather than hidden: the model has no part-role field, so whether a
 * failsafe-required pin passes through its declared protection part cannot be
 * checked. Those pins are returned in `protectionUnchecked`.
 */
import { loadContract, socketPadFor } from "./contract.ts"
import type { ContractPin } from "./contract.ts"
import type { Component, Connection, Network } from "../../lib/model/index.ts"

export type BoardKind = "carrier" | "module" | "pedal"

export interface InterfaceReport {
  readonly mismatches: readonly string[]
  readonly protectionUnchecked: readonly number[]
}

type SocketIds = { J_MOD_A: string; J_MOD_B: string }

function* allPins(component: Component): Generator<[string, Connection]> {
  for (const entry of Object.entries(component.pins)) yield entry
  for (const unit of component.units) for (const entry of Object.entries(unit.pins)) yield entry
}

function findSocket(network: Network, id: string): Component {
  const found = network.components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`socket component "${id}" is not in the network; pass the id of the J_MOD part`)
  return found
}

/** The connection on a pad, or undefined when the socket does not list it. */
function padConnection(socket: Component, pad: number): Connection | undefined {
  for (const [name, connection] of allPins(socket)) if (name === String(pad)) return connection
  return undefined
}

const PAD_COUNT = 20
const PAD_KEY = /^(?:[1-9]|1\d|20)$/

/** Requires exactly pads "1".."20" on a socket; a missing or stray pad is a mismatch. */
function checkPadSet(socket: Component, part: string, contractPinOf: (pad: number) => number, out: string[]): void {
  const listed = new Set<string>()
  for (const [name] of allPins(socket)) {
    listed.add(name)
    if (!PAD_KEY.test(name)) out.push(`${part} pad "${name}" is outside 1..${PAD_COUNT}; the socket has no such pad`)
  }
  for (let pad = 1; pad <= PAD_COUNT; pad++) {
    if (!listed.has(String(pad))) {
      out.push(`${part} pad ${pad} is missing (contract pin ${contractPinOf(pad)}); the socket must list pads 1..${PAD_COUNT}`)
    }
  }
}

function membersOnNet(network: Network, netName: string): number {
  let count = 0
  for (const component of network.components) {
    for (const [, connection] of allPins(component)) {
      if (connection.kind === "net" && connection.net === netName) count += 1
    }
  }
  return count
}

function describe(connection: Connection): string {
  return connection.kind === "nc" ? "nc" : `"${connection.net}"`
}

function checkPin(
  network: Network, board: BoardKind, sockets: SocketIds, cp: ContractPin, out: string[],
): void {
  const { part, pad } = socketPadFor(cp.pin)
  const where = `contract pin ${cp.pin} (${part} pad ${pad})`
  const found = padConnection(findSocket(network, sockets[part]), pad)
  if (found === undefined) return // reported once by checkPadSet as a missing pad

  if (cp.signal !== null) {
    if (found.kind !== "net" || found.net !== cp.signal) {
      out.push(`${where}: expected net "${cp.signal}", found ${describe(found)}`)
    }
    return
  }
  if (cp.category !== "reservedCompatibility") {
    out.push(`${where}: contract gives category "${cp.category}" no signal, so the check cannot say what it should carry`)
    return
  }
  const unconnected = found.kind === "nc"
  if (board !== "carrier") {
    if (!unconnected) out.push(`${where}: reserved pin must be nc on a ${board}, found ${describe(found)}`)
    return
  }
  const expected = `RESERVED_${cp.pin}`
  if (found.kind !== "net" || found.net !== expected) {
    out.push(`${where}: reserved pin on the carrier must be net "${expected}", found ${describe(found)}`)
    return
  }
  // Counts members only; it does not check that the second member is a breakout terminal (no part-role field).
  const members = membersOnNet(network, expected)
  if (members !== 2) {
    out.push(`${where}: net "${expected}" must hold exactly 2 members (pad and one breakout terminal), found ${members}`)
  }
}

export function checkInterface(network: Network, board: BoardKind, sockets: SocketIds): InterfaceReport {
  const contract = loadContract()
  const mismatches: string[] = []
  checkPadSet(findSocket(network, sockets.J_MOD_A), "J_MOD_A", (pad) => pad, mismatches)
  checkPadSet(findSocket(network, sockets.J_MOD_B), "J_MOD_B", (pad) => pad + 20, mismatches)
  for (const cp of contract.pins) checkPin(network, board, sockets, cp, mismatches)
  const protectionUnchecked = contract.pins.filter((p) => p.failsafeRequired).map((p) => p.pin)
  return { mismatches, protectionUnchecked }
}
