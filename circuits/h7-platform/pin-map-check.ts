/**
 * The collision check the split spec (section 6.2) claimed and never ran: the
 * module's internal MCU pin map against ST's pin data and against the 31 ports
 * the 40-pin contract already uses.
 *
 * `checkPinMap` returns problems; an empty list is a pass. It is pure, so tests
 * feed it deliberately bad maps. Each problem names what is wrong, where, and
 * what to fix; nothing is defaulted or skipped.
 */
import { portName } from "./st-pin-data.ts"
import { loadContract } from "./contract.ts"
import type { McuPinData } from "./st-pin-data.ts"

export interface PinAssignment {
  /** The module net the port drives or reads, e.g. `SDRAM_NWE`. */
  readonly net: string
  /** The MCU port name as ST's data spells it, e.g. `PH5`. */
  readonly pin: string
  /** ST's signal name for the function used on that port, e.g. `FMC_SDNWE`. */
  readonly signal: string
  /** The citation: a pedals doc and line, a docs/h7-platform line, or a ruling. */
  readonly source: string
}

/** One interface pin as the contract states it: its net name and the module MCU port it lands on. */
export interface InterfacePin {
  readonly net: string
  readonly pin: string
}

export function checkPinMap(
  assignments: readonly PinAssignment[],
  interfacePins: readonly InterfacePin[],
  data: McuPinData,
): readonly string[] {
  const problems: string[] = []
  const byName = new Map(data.pins.map((p) => [portName(p), p]))
  const pinOwner = new Map<string, string>()
  const netOwner = new Map<string, string>()

  for (const i of interfacePins) {
    const resolved = byName.get(i.pin) ?? data.pins.find((p) => p.name === i.pin)
    if (resolved === undefined) {
      problems.push(`interface net ${i.net}: ${i.pin} is not a pin in ST's STM32H743IITx data; correct moduleMcuPin in module-interface.json`)
      continue
    }
    pinOwner.set(portName(resolved), `interface net ${i.net}`)
    netOwner.set(i.net, `interface pin ${i.pin}`)
  }

  for (const a of assignments) {
    const pin = byName.get(a.pin)
    if (pin === undefined) {
      problems.push(`net ${a.net}: ${a.pin} is not a pin in ST's STM32H743IITx data; correct the port name in module-pins.ts`)
    } else {
      if (pin.type !== "I/O") {
        problems.push(`net ${a.net}: ${a.pin} is a ${pin.type} pin, not an I/O port; a signal cannot be assigned to it`)
      }
      if (!pin.signals.includes(a.signal)) {
        problems.push(`net ${a.net}: ST does not list ${a.signal} on ${a.pin} (it lists ${pin.signals.join(", ")}); move the function to a pin that carries it`)
      }
    }
    const key = pin === undefined ? a.pin : portName(pin)
    const pinPrior = pinOwner.get(key)
    if (pinPrior !== undefined) {
      problems.push(`pin ${a.pin} is used twice: by ${pinPrior} and by net ${a.net}`)
    } else {
      pinOwner.set(key, `net ${a.net}`)
    }
    const netPrior = netOwner.get(a.net)
    if (netPrior !== undefined) {
      problems.push(`net ${a.net} is used twice: by ${netPrior} and by pin ${a.pin}; a net named on both sides of the module boundary is one net`)
    } else {
      netOwner.set(a.net, `pin ${a.pin}`)
    }
  }
  return problems
}

/**
 * The interface side of the collision check, read from the loaded contract: every
 * pin whose `moduleMcuPin` is a string, as its signal name and module MCU port. Only an
 * explicit null `moduleMcuPin` is skipped (the contract loader refuses an absent key). A
 * non-null `moduleMcuPin` on a pin with no signal name refuses, since the net is unknown.
 */
export function interfaceOccupancy(contract = loadContract()): readonly InterfacePin[] {
  const out: InterfacePin[] = []
  for (const p of contract.pins) {
    if (p.moduleMcuPin === null) continue
    if (p.signal === null) {
      throw new Error(`contract pin ${p.pin} has moduleMcuPin ${p.moduleMcuPin} but no signal name; the interface net cannot be named`)
    }
    out.push({ net: p.signal, pin: p.moduleMcuPin })
  }
  return out
}
