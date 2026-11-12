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
    pinOwner.set(i.pin, `interface net ${i.net}`)
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
    const pinPrior = pinOwner.get(a.pin)
    if (pinPrior !== undefined) {
      problems.push(`pin ${a.pin} is used twice: by ${pinPrior} and by net ${a.net}`)
    } else {
      pinOwner.set(a.pin, `net ${a.net}`)
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
