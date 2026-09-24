/** Physical ownership: which module each reference component lives on.
 *
 * Step 3 of the implementation plan. The split follows the boards that were
 * actually built — the prototype set in `multi-channel-preamp` is already one
 * board per section, interconnected by screw terminals — rather than inventing
 * a new one.
 *
 * Every component is assigned exactly once. Front-panel parts (the level pots
 * and the rotary selectors) belong to the section they control, which is what
 * the built hardware does: each board carries the screw terminals that its
 * own switch and pot wire back to.
 */
import { partitionTopology } from "../../lib/model/topology.ts"
import type { Component, Connection, Network } from "../../lib/model/types.ts"
import { OFF_BOARD } from "./off-board.ts"
import { THREE_BAND_REFERENCE } from "./model/three-band.ts"
import { MID_POSITIONS, MID_TAPS, tapLabel } from "./model/mid.ts"

/** A physical network's components are single-unit: one "MAIN" unit carries every
 * terminal. Package pins stay empty. Mirrors the equivalent helper in
 * `lib/model/control-state.ts`. */
function terminals(component: Component): Readonly<Record<string, Connection>> {
  if (component.units.length !== 1) {
    throw new Error(`Physical network component must have exactly one unit: ${component.id}`)
  }
  const unit = component.units[0]
  for (const pin of Object.keys(unit.pins)) {
    if (Object.prototype.hasOwnProperty.call(component.pins, pin)) {
      throw new Error(
        `Component "${component.id}" unit "${unit.name}": pin "${pin}" collides with a package pin of the same name`,
      )
    }
  }
  return { ...component.pins, ...unit.pins }
}

export type ModuleOwner = "low-cut" | "low-boost" | "hi-cut" | "hi-boost" | "mid"

export const MODULE_OWNERS: readonly ModuleOwner[] = [
  "low-cut",
  "low-boost",
  "hi-cut",
  "hi-boost",
  "mid",
]

/** Mid ownership is generated from the same tables the mid section is built
 * from, so the two cannot drift apart. Everything the mid introduces belongs to
 * the mid module; it shares no component with any other section. */
function midOwnership(): Record<string, ModuleOwner> {
  const owned: Record<string, ModuleOwner> = {
    R_MID_BOOST: "mid",
    R_MID_CUT: "mid",
    R_MID_SHUNT: "mid",
    RV_MID: "mid",
    SW_MID: "mid",
    SW_MID_MODE: "mid",
  }
  for (const position of MID_POSITIONS) {
    position.capacitors.forEach((_, index) => {
      owned[`C_MID_${position.label}_${index === 0 ? "A" : "B"}`] = "mid"
    })
  }
  for (const henries of MID_TAPS) owned[`L_MID_${tapLabel(henries)}`] = "mid"
  return owned
}

/** One entry per element in `THREE_BAND_REFERENCE`. The allowed-owner check
 * rejects a typo here rather than silently creating a phantom module. */
export const OWNERSHIP: Readonly<Record<string, ModuleOwner>> = {
  // Low cut: the Ccut bank, its selector and its 470K level pot.
  C1: "low-cut", C2: "low-cut", C3: "low-cut", C4: "low-cut",
  C5: "low-cut", C6: "low-cut", C7: "low-cut",
  RV_LO_CUT: "low-cut",
  SW_LO_CUT: "low-cut",

  // Low boost: the Cboost bank to ground, R2, its selector and 47K level pot.
  C18: "low-boost", C19: "low-boost", C20: "low-boost",
  C21: "low-boost", C22: "low-boost", C23: "low-boost",
  R2: "low-boost",
  RV_LO_BOOST: "low-boost",
  SW_LO_BOOST: "low-boost",

  // Hi cut: the Ccut bank, the 430R series resistor, selector and 4K7 pot.
  C24: "hi-cut", C25: "hi-cut", C26: "hi-cut", C27: "hi-cut", C28: "hi-cut",
  C29: "hi-cut", C30: "hi-cut", C31: "hi-cut", C32: "hi-cut", C33: "hi-cut",
  R1: "hi-cut",
  RV_HI_CUT: "hi-cut",
  SW_HI_CUT: "hi-cut",

  // Hi boost: the Cboost bank, Qmax, the tapped winding modelled per tap, the
  // level and Q pots, and the selector. The selector is one pole of the high
  // frequency rotary; its other pole is SW_HI_CUT, and the two are ganged.
  C14: "hi-boost", C15: "hi-boost", C16: "hi-boost", C17: "hi-boost",
  C34: "hi-boost", C35: "hi-boost",
  C2a2: "hi-boost", C4a2: "hi-boost", C5a2: "hi-boost",
  R3: "hi-boost",
  L_HI_BOOST_600MH: "hi-boost",
  L_HI_BOOST_300MH: "hi-boost",
  L_HI_BOOST_200MH: "hi-boost",
  L_HI_BOOST_100MH: "hi-boost",
  RV_HI_BOOST: "hi-boost",
  RV_HI_Q: "hi-boost",
  SW_HI_BOOST: "hi-boost",

  // Mid: generated, see midOwnership().
  ...midOwnership(),
}

/** Partition of the reference, with owner names checked against the declared
 * set. Throws if ownership and the reference ever drift apart. */
export function partitionReference(network: Network = THREE_BAND_REFERENCE) {
  return partitionTopology(network, OWNERSHIP, { allowedOwners: MODULE_OWNERS })
}

/** A net that crosses a module boundary, and therefore needs a conductor
 * between boards. This is the connector table the plan asks for; physical pin
 * assignment is a later, separate decision. */
export interface BoundaryConductor {
  readonly net: string
  readonly owners: readonly string[]
  /** Terminals on that net, as `ref.pin`, so each end is traceable. */
  readonly terminals: readonly string[]
}

export function boundaryConductors(
  network: Network = THREE_BAND_REFERENCE,
): readonly BoundaryConductor[] {
  const split = partitionReference(network)
  return split.boundaryNets.map(boundary => ({
    net: boundary.net,
    owners: boundary.owners,
    terminals: network.components
      .flatMap(component =>
        Object.entries(terminals(component))
          .filter(([, connection]) => connection.kind === "net" && connection.net === boundary.net)
          .map(([pin]) => `${component.id}.${pin}`))
      .sort(),
  }))
}

/** External ports are conductors too, even where only one module touches them.
 * The plan calls this out specifically: a port used on one board still has to
 * reach the outside world. */
export function externalPorts(
  network: Network = THREE_BAND_REFERENCE,
): Readonly<Record<string, string>> {
  return network.ports
}
