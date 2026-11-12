/**
 * The h7-module's shared net names: the ones more than one block carries.
 *
 * Where a net crosses the 40-pin interface it takes the CONTRACT's name, read from
 * `module-interface.json` rather than restated (controller ruling for H7 module plan Task 6:
 * "net names follow the contract wherever a net crosses the interface"). So where the documents
 * write "3V3", "VDDA" and "VIN", the model's nets are:
 *
 * - `3V3_D`: the module's 3.3 V rail (contract pin 38; `MODULE_3V3_NET`, module-3v3-budget.ts);
 * - `VREF_A`: VDDA = VREF+ after FB_VDDA (contract pin 21; processor-and-memory.md:40 D16 and :138,
 *   "the VDDA net also leaves the module on interface pin 21 as VREF_A");
 * - `VIN_MOD`: the module's supply input (contract pin 39; power.md:230);
 * - `GND`: contract pins 20 and 40, one GND net (D18).
 *
 * The module-internal nets below have no contract pin, and take the name of the MCU pin they serve.
 */
import { loadContract } from "../contract.ts"
import { MODULE_3V3_NET } from "../module-3v3-budget.ts"

function contractSignal(pin: number): string {
  const found = loadContract().pins.find((p) => p.pin === pin)
  if (found === undefined || found.signal === null) {
    throw new Error(`module-interface.json gives contract pin ${pin} no signal name; the module's net on it cannot be named`)
  }
  return found.signal
}

export const NET_3V3 = MODULE_3V3_NET
export const NET_VREF_A = contractSignal(21)
export const NET_VIN_MOD = contractSignal(39)
export const NET_GND = contractSignal(20)

if (NET_3V3 !== contractSignal(38)) {
  throw new Error(`MODULE_3V3_NET is "${NET_3V3}" but contract pin 38 is "${contractSignal(38)}"; the module's 3V3 net is the contract's`)
}
if (contractSignal(40) !== NET_GND) {
  throw new Error(`contract pins 20 and 40 name different ground nets; the module has one GND (D18)`)
}

/** VSSA (pin 37), joined to GND only through R_VSSA 0 ohm (processor-and-memory.md:138; CORE-08). */
export const NET_VSSA = "VSSA"
/** VCAP1 and VCAP2 joined (processor-and-memory.md:136; CORE-04). */
export const NET_VCAP = "VCAP"
/** NRST (pin 31): supervisor, pull-up, capacitor, button, SWD (processor-and-memory.md:264; CORE-10). */
export const NET_NRST = "NRST"
/** BOOT0 (pin 166) (processor-and-memory.md:265; CORE-12). */
export const NET_BOOT0 = "BOOT0"
