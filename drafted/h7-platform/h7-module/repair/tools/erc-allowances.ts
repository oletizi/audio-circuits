/**
 * THE h7-module ERC ALLOWANCES - the one declared table of ERC errors a block page's verification
 * excuses, each under a controller ruling in `docs/h7-platform/decisions.md`. As it stands it holds
 * the one allowance ruling CR-MODULE-VCAP-ERC admits.
 *
 * Why it exists. The stock symbol `MCU_ST_STM32H7:STM32H743IITx` types VCAP1 (pin 81) and VCAP2
 * (pin 125) `power_out`, and the documented circuit joins them (processor-and-memory.md:136; CORE-04;
 * D7), so ERC reports `pin_to_pin`, "Pins of type Power output and Power output are connected", on
 * the mcu sheet. The error comes from the symbol's pin typing, not from the circuit.
 *
 * DATA ONLY. How narrowly an allowance matches, the model check every entry is held to, and the
 * announced test override (`PAGES_ERC_ALLOWANCES_TABLE`) are `draughting/pages/erc-allowances.ts`,
 * moved there from this file by the H7 pedal plan's Task 4; the shared tools read this table through
 * the board's drafted directory, and refuse a board without it, naming the file.
 */
import type { ErcAllowance } from "../../../../../draughting/pages/erc-allowances.ts"

export const ERC_ALLOWANCES: readonly ErcAllowance[] = [
  {
    ruling: "CR-MODULE-VCAP-ERC",
    sheet: "/mcu/",
    type: "pin_to_pin",
    pins: [
      { designator: "U1", pin: "81" },
      { designator: "U1", pin: "125" },
    ],
    net: "VCAP",
    symbolPinType: "power_out",
    source:
      "circuits/h7-platform/module/mcu.ts (SUPPLY_NETS VCAP: processor-and-memory.md:136, VCAP1 pin 81 joined to VCAP2 pin 125; CORE-04; D7); " +
      "MCU_ST_STM32H7:STM32H743IITx types both pins power_out; ruling CR-MODULE-VCAP-ERC in docs/h7-platform/decisions.md",
  },
]
