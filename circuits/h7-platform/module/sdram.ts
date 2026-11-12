/**
 * The 32 MB SDRAM (H7 module plan, Task 6): U_SDRAM, Winbond W9825G6KH-6I in TSOP-II-54, on FMC
 * SDRAM bank 1 (processor-and-memory.md section 6; parts.md:31; D1).
 *
 * - Signal pins: schematic-checklist.md CORE-19's table, by the datasheet's pin name (Winbond
 *   W9825G6KH Rev. A04 p. 4, `DATASHEET_PIN_NAMES`), each to the net `MODULE_PINS` puts on the
 *   MCU: A0-A12, BS0/BS1 on SDRAM_BA0/BA1, DQ0-DQ15, LDQM/UDQM on SDRAM_NBL0/NBL1, ~WE ~CAS ~RAS
 *   ~CS, CKE, CLK. Pin 40 (NC) unconnected (CORE-19; processor-and-memory.md:210).
 * - VDD (1, 14, 27) and VDDQ (3, 9, 43, 49) on 3V3_D, each with its own 100 nF; VSS and VSSQ on GND
 *   (CORE-20; processor-and-memory.md:107; power.md:387, "SDRAM 100 nF on each of 7 VDD/VDDQ pins").
 * - 10 k pull-up on SDRAM_NE to 3V3_D (CORE-21; processor-and-memory.md:107, OSCAR's pull-up on
 *   FMC_SDNE0).
 */
import { NC } from "../../../lib/model/index.ts"
import type { Connection, Network } from "../../../lib/model/index.ts"
import { DATASHEET_PIN_NAMES, SDRAM } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, part, resistor } from "./build.ts"
import { NET_3V3, NET_GND } from "./nets.ts"

const CORE19 = "schematic-checklist.md CORE-19 (SDRAM pins on the FMC nets)"

/** CORE-19's table, by the datasheet's pin name. */
function signalNet(name: string): string | undefined {
  const address = /^A(\d+)$/.exec(name)
  if (address !== null) return `SDRAM_A${address[1]}`
  if (name === "A10/AP") return "SDRAM_A10"
  const data = /^DQ(\d+)$/.exec(name)
  if (data !== null) return `SDRAM_D${data[1]}`
  const fixed: Readonly<Record<string, string>> = {
    BS0: "SDRAM_BA0", BS1: "SDRAM_BA1", LDQM: "SDRAM_NBL0", UDQM: "SDRAM_NBL1",
    "~{WE}": "SDRAM_NWE", "~{CAS}": "SDRAM_NCAS", "~{RAS}": "SDRAM_NRAS", "~{CS}": "SDRAM_NE",
    CKE: "SDRAM_CKE", CLK: "SDRAM_CLK",
  }
  return fixed[name]
}

export function sdramBlock(): Network {
  const names = DATASHEET_PIN_NAMES["h7-platform:W9825G6KH"]
  if (names === undefined) throw new Error("module-parts.ts records no W9825G6KH pin names; the SDRAM's pins are mapped by them")
  const pins: Record<string, Connection> = {}
  const supplyPins: string[] = []
  const signals = new Set<string>()
  for (const [pin, name] of Object.entries(names)) {
    if (name === "VDD" || name === "VDDQ") {
      pins[pin] = { kind: "net", net: NET_3V3 }
      supplyPins.push(pin)
    } else if (name === "VSS" || name === "VSSQ") {
      pins[pin] = { kind: "net", net: NET_GND }
    } else if (name === "NC") {
      pins[pin] = NC
    } else {
      const net = signalNet(name)
      if (net === undefined) throw new Error(`W9825G6KH pin ${pin} "${name}" has no net in CORE-19's table; it is not defaulted`)
      pins[pin] = { kind: "net", net }
      signals.add(net)
    }
  }
  const decoupling = supplyPins.sort((a, b) => Number(a) - Number(b)).map((pin) =>
    capacitor(`c_sdram_${pin}`, "100n", NET_3V3, NET_GND, CAPACITOR,
      `CORE-20 (100 nF at VDD/VDDQ pin ${pin}); processor-and-memory.md:107; power.md:387`))
  return block([
    part("u_sdram", "ic", pins, SDRAM, `parts.md:31 (U_SDRAM, W9825G6KH-6I, D1); ${CORE19}; CORE-20`),
    ...decoupling,
    resistor("r_sdram_ne_pullup", "10k", "SDRAM_NE", NET_3V3, RESISTOR,
      "schematic-checklist.md CORE-21 (10 kOhm pull-up on SDRAM_NE to the 3.3 V rail); processor-and-memory.md:107"),
  ], [NET_3V3, NET_GND, ...[...signals].sort()])
}
