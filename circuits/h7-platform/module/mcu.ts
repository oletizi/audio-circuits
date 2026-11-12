/**
 * The MCU block: U_MCU, the STM32H743IIT6 in LQFP-176, and nothing else (H7 module plan, Task 6).
 * A component is atomic under `include()`, so every other block reaches the MCU through a port.
 *
 * Every one of the 176 pins is accounted for, from three sources and a rule:
 * - a supply, reset or boot pin takes the net its function implies, by ST's pin name
 *   (`SUPPLY_NETS` below, each with its line);
 * - an I/O pin in `MODULE_PINS` (module-pins.ts) takes its internal net (SDRAM, QSPI, HSE, SWD,
 *   the DFU socket's PA11/PA12, the ID strap);
 * - an I/O pin that is some contract pin's `moduleMcuPin` takes that pin's signal name
 *   (module-interface.json, through `interfaceOccupancy`);
 * - every other pin is an I/O that nothing uses, and is marked not connected: CORE-27
 *   (schematic-checklist.md:79) "Unused MCU pins get no external resistor and stay in their reset
 *   state". No private net and no port is made for an unused pin (issue 31, finding 2).
 *
 * Refusals: an I/O pin claimed twice, a non-I/O pin whose name this file has no net for, or an
 * assignment to a pin ST's data does not have. A pin left unaccounted is not possible: the loop
 * runs over ST's 176 pins.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Connection, Network } from "../../../lib/model/index.ts"
import { MCU } from "../module-parts.ts"
import { MODULE_PINS } from "../module-pins.ts"
import { interfaceOccupancy } from "../pin-map-check.ts"
import { loadPinData, portName } from "../st-pin-data.ts"
import type { McuPin } from "../st-pin-data.ts"
import { block, part } from "./build.ts"
import { NET_3V3, NET_BOOT0, NET_GND, NET_NRST, NET_VCAP, NET_VREF_A, NET_VSSA } from "./nets.ts"

/** The MCU's non-I/O pins by ST's name, each to its net, with its source. */
export const SUPPLY_NETS: Readonly<Record<string, { readonly net: string; readonly source: string }>> = {
  VDD: { net: NET_3V3, source: "processor-and-memory.md:137; CORE-01" },
  VSS: { net: NET_GND, source: "CORE-03 (every VSS pin on GND)" },
  VSSA: { net: NET_VSSA, source: "processor-and-memory.md:138 (VSSA to VSS through 0 ohm); CORE-08" },
  VDDA: { net: NET_VREF_A, source: "processor-and-memory.md:138 (VDDA from VDD through FB_VDDA; the net is VREF_A on pin 21, :40 D16)" },
  "VREF+": { net: NET_VREF_A, source: "processor-and-memory.md:138 (VREF+ pin 38 tied to VDDA pin 39); CORE-08" },
  VCAP: { net: NET_VCAP, source: "processor-and-memory.md:136 (VCAP1 pin 81 joined to VCAP2 pin 125); CORE-04" },
  PDR_ON: { net: NET_3V3, source: "processor-and-memory.md:135 (PDR_ON pin 171 tied to VDD); CORE-09" },
  VBAT: { net: NET_3V3, source: "processor-and-memory.md:137 (VBAT pin 6 tied to VDD); CORE-06" },
  VDD33_USB: { net: NET_3V3, source: "processor-and-memory.md:128 (VDD33USB fed from the module's 3V3), :137; CORE-05" },
  NRST: { net: NET_NRST, source: "processor-and-memory.md:264; CORE-10" },
  BOOT0: { net: NET_BOOT0, source: "processor-and-memory.md:265; CORE-12" },
}

export interface McuPinPlan {
  readonly position: number
  readonly name: string
  /** The net, or null for a pin left not connected under CORE-27. */
  readonly net: string | null
  readonly source: string
}

const UNUSED = "CORE-27 (schematic-checklist.md:79): an unused MCU pin gets no external resistor and stays in its reset state"

/** One entry per LQFP-176 position, in position order. */
export function mcuPinPlan(): readonly McuPinPlan[] {
  const data = loadPinData()
  const byPort = new Map<string, McuPin>(data.pins.map((p) => [portName(p), p]))
  const resolve = (pin: string): McuPin => {
    const found = byPort.get(pin) ?? data.pins.find((p) => p.name === pin)
    if (found === undefined) throw new Error(`"${pin}" is not a pin in ST's STM32H743IITx data; correct it where it is assigned`)
    return found
  }
  const claimed = new Map<number, { net: string; source: string }>()
  const claim = (pin: string, net: string, source: string): void => {
    const p = resolve(pin)
    const prior = claimed.get(p.position)
    if (prior !== undefined) throw new Error(`MCU pin ${pin} (position ${p.position}) is claimed by both ${prior.net} and ${net}`)
    claimed.set(p.position, { net, source })
  }
  for (const a of MODULE_PINS) claim(a.pin, a.net, `module-pins.ts (${a.signal}; ${a.source})`)
  for (const i of interfaceOccupancy()) claim(i.pin, i.net, `module-interface.json (moduleMcuPin ${i.pin})`)

  return data.pins.map((p): McuPinPlan => {
    const assigned = claimed.get(p.position)
    if (p.type === "I/O") {
      return assigned === undefined
        ? { position: p.position, name: p.name, net: null, source: UNUSED }
        : { position: p.position, name: p.name, ...assigned }
    }
    if (assigned !== undefined) throw new Error(`MCU pin ${p.name} (position ${p.position}) is a ${p.type} pin and cannot carry ${assigned.net}`)
    const supply = SUPPLY_NETS[p.name]
    if (supply === undefined) {
      throw new Error(`MCU pin ${p.name} (position ${p.position}, type ${p.type}) has no net in SUPPLY_NETS; state its connection with its source, it is not defaulted`)
    }
    return { position: p.position, name: p.name, ...supply }
  }).sort((a, b) => a.position - b.position)
}

/** U_MCU alone. Its ports are the nets its used pins carry, each named by that net. */
export function mcuBlock(): Network {
  const plan = mcuPinPlan()
  const pins: Record<string, Connection> = {}
  for (const p of plan) pins[String(p.position)] = p.net === null ? NC : { kind: "net", net: p.net }
  const u = part("u_mcu", "ic", pins, MCU,
    "parts.md:30 (U_MCU, STM32H743IIT6, owner decision O-3); pins from ST's pin data, module-pins.ts and module-interface.json")
  const nets = [...new Set(plan.flatMap((p) => (p.net === null ? [] : [p.net])))].sort()
  return block([u], nets)
}
