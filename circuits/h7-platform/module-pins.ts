/**
 * The module's internal MCU pin assignments (MODULE-INTERNAL-PIN-MAP): the MCU
 * ports the module's own circuits use, as opposed to the 31 ports the 40-pin
 * contract carries (`module-interface.json`, read through `contract.ts`).
 *
 * Authority and what was not carried:
 * - The starting point is the pedals repository's CORE-BRIEF.md section 6 table
 *   (`git show 5b926d0:h7-platform/CORE-BRIEF.md`, line numbers in each `source`):
 *   SDRAM bank 1, QUADSPI bank 1, the USB socket's PA11/PA12, SWD and HSE.
 * - Three SDRAM control pins move per split spec section 6.2 (D23, spec line 518):
 *   SDNWE to PH5, SDNE0 to PH3, SDCKE0 to PH2.
 * - SAI1 (CORE-BRIEF.md:362) is not here: on the split it belongs to the
 *   interface (CODEC_* on contract pins 32-35), not to the module's internals.
 * - NRST, BOOT0 and the power pins are not ports; they are checked against the
 *   module model by its own tests, from the same pin data.
 * - The two USB nets are named DFU_USB_DM and DFU_USB_DP, not CORE-BRIEF's
 *   USB_DM and USB_DP, because the contract already owns USB_DM and USB_DP
 *   (pins 36 and 37, PB14 and PB15): a net named twice is a collision.
 *
 * Every `signal` is ST's own signal name and is checked against the pin data by
 * `checkPinMap` (tests/circuits/h7-module-pins.test.ts runs it on every
 * `bun test`), which also refuses a pin or net used twice across this list and
 * the interface.
 *
 * The ID strap is the controller ruling CR-MODULE-ID-STRAP-PIN
 * (docs/h7-platform/decisions.md): the first pin in ascending LQFP position whose
 * signals include an `ADCx_INPy` channel and which no internal or interface
 * assignment uses. The rule is a deterministic choice only; split spec section 6.5
 * says "a free module ADC pin" and prefers none.
 */
import type { PinAssignment } from "./pin-map-check.ts"

export const MODULE_PINS: readonly PinAssignment[] = [
  { net: "SDRAM_A0", pin: "PF0", signal: "FMC_A0", source: "pedals CORE-BRIEF.md:319 @5b926d0" },
  { net: "SDRAM_A1", pin: "PF1", signal: "FMC_A1", source: "pedals CORE-BRIEF.md:320 @5b926d0" },
  { net: "SDRAM_A2", pin: "PF2", signal: "FMC_A2", source: "pedals CORE-BRIEF.md:321 @5b926d0" },
  { net: "SDRAM_A3", pin: "PF3", signal: "FMC_A3", source: "pedals CORE-BRIEF.md:322 @5b926d0" },
  { net: "SDRAM_A4", pin: "PF4", signal: "FMC_A4", source: "pedals CORE-BRIEF.md:323 @5b926d0" },
  { net: "SDRAM_A5", pin: "PF5", signal: "FMC_A5", source: "pedals CORE-BRIEF.md:324 @5b926d0" },
  { net: "SDRAM_A6", pin: "PF12", signal: "FMC_A6", source: "pedals CORE-BRIEF.md:325 @5b926d0" },
  { net: "SDRAM_A7", pin: "PF13", signal: "FMC_A7", source: "pedals CORE-BRIEF.md:326 @5b926d0" },
  { net: "SDRAM_A8", pin: "PF14", signal: "FMC_A8", source: "pedals CORE-BRIEF.md:327 @5b926d0" },
  { net: "SDRAM_A9", pin: "PF15", signal: "FMC_A9", source: "pedals CORE-BRIEF.md:328 @5b926d0" },
  { net: "SDRAM_A10", pin: "PG0", signal: "FMC_A10", source: "pedals CORE-BRIEF.md:329 @5b926d0" },
  { net: "SDRAM_A11", pin: "PG1", signal: "FMC_A11", source: "pedals CORE-BRIEF.md:330 @5b926d0" },
  { net: "SDRAM_A12", pin: "PG2", signal: "FMC_A12", source: "pedals CORE-BRIEF.md:331 @5b926d0" },
  { net: "SDRAM_BA0", pin: "PG4", signal: "FMC_BA0", source: "pedals CORE-BRIEF.md:332 @5b926d0" },
  { net: "SDRAM_BA1", pin: "PG5", signal: "FMC_BA1", source: "pedals CORE-BRIEF.md:333 @5b926d0" },
  { net: "SDRAM_D0", pin: "PD14", signal: "FMC_D0", source: "pedals CORE-BRIEF.md:334 @5b926d0" },
  { net: "SDRAM_D1", pin: "PD15", signal: "FMC_D1", source: "pedals CORE-BRIEF.md:335 @5b926d0" },
  { net: "SDRAM_D2", pin: "PD0", signal: "FMC_D2", source: "pedals CORE-BRIEF.md:336 @5b926d0" },
  { net: "SDRAM_D3", pin: "PD1", signal: "FMC_D3", source: "pedals CORE-BRIEF.md:337 @5b926d0" },
  { net: "SDRAM_D4", pin: "PE7", signal: "FMC_D4", source: "pedals CORE-BRIEF.md:338 @5b926d0" },
  { net: "SDRAM_D5", pin: "PE8", signal: "FMC_D5", source: "pedals CORE-BRIEF.md:339 @5b926d0" },
  { net: "SDRAM_D6", pin: "PE9", signal: "FMC_D6", source: "pedals CORE-BRIEF.md:340 @5b926d0" },
  { net: "SDRAM_D7", pin: "PE10", signal: "FMC_D7", source: "pedals CORE-BRIEF.md:341 @5b926d0" },
  { net: "SDRAM_D8", pin: "PE11", signal: "FMC_D8", source: "pedals CORE-BRIEF.md:342 @5b926d0" },
  { net: "SDRAM_D9", pin: "PE12", signal: "FMC_D9", source: "pedals CORE-BRIEF.md:343 @5b926d0" },
  { net: "SDRAM_D10", pin: "PE13", signal: "FMC_D10", source: "pedals CORE-BRIEF.md:344 @5b926d0" },
  { net: "SDRAM_D11", pin: "PE14", signal: "FMC_D11", source: "pedals CORE-BRIEF.md:345 @5b926d0" },
  { net: "SDRAM_D12", pin: "PE15", signal: "FMC_D12", source: "pedals CORE-BRIEF.md:346 @5b926d0" },
  { net: "SDRAM_D13", pin: "PD8", signal: "FMC_D13", source: "pedals CORE-BRIEF.md:347 @5b926d0" },
  { net: "SDRAM_D14", pin: "PD9", signal: "FMC_D14", source: "pedals CORE-BRIEF.md:348 @5b926d0" },
  { net: "SDRAM_D15", pin: "PD10", signal: "FMC_D15", source: "pedals CORE-BRIEF.md:349 @5b926d0" },
  { net: "SDRAM_NBL0", pin: "PE0", signal: "FMC_NBL0", source: "pedals CORE-BRIEF.md:350 @5b926d0" },
  { net: "SDRAM_NBL1", pin: "PE1", signal: "FMC_NBL1", source: "pedals CORE-BRIEF.md:351 @5b926d0" },
  { net: "SDRAM_CLK", pin: "PG8", signal: "FMC_SDCLK", source: "pedals CORE-BRIEF.md:352 @5b926d0" },
  { net: "SDRAM_NWE", pin: "PH5", signal: "FMC_SDNWE", source: "pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDNWE PC0 to PH5; CORE-BRIEF.md:353 gave PC0" },
  { net: "SDRAM_NRAS", pin: "PF11", signal: "FMC_SDNRAS", source: "pedals CORE-BRIEF.md:354 @5b926d0" },
  { net: "SDRAM_NCAS", pin: "PG15", signal: "FMC_SDNCAS", source: "pedals CORE-BRIEF.md:355 @5b926d0" },
  { net: "SDRAM_NE", pin: "PH3", signal: "FMC_SDNE0", source: "pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDNE0 PC4 to PH3; CORE-BRIEF.md:356 gave PC4" },
  { net: "SDRAM_CKE", pin: "PH2", signal: "FMC_SDCKE0", source: "pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDCKE0 PC3_C to PH2; CORE-BRIEF.md:357 gave PC3_C" },
  { net: "FLASH_CLK", pin: "PF10", signal: "QUADSPI_CLK", source: "pedals CORE-BRIEF.md:382 @5b926d0" },
  { net: "FLASH_NCS", pin: "PB10", signal: "QUADSPI_BK1_NCS", source: "pedals CORE-BRIEF.md:383 @5b926d0" },
  { net: "FLASH_IO0", pin: "PF8", signal: "QUADSPI_BK1_IO0", source: "pedals CORE-BRIEF.md:384 @5b926d0" },
  { net: "FLASH_IO1", pin: "PF9", signal: "QUADSPI_BK1_IO1", source: "pedals CORE-BRIEF.md:385 @5b926d0" },
  { net: "FLASH_IO2", pin: "PF7", signal: "QUADSPI_BK1_IO2", source: "pedals CORE-BRIEF.md:386 @5b926d0" },
  { net: "FLASH_IO3", pin: "PF6", signal: "QUADSPI_BK1_IO3", source: "pedals CORE-BRIEF.md:387 @5b926d0" },
  { net: "DFU_USB_DM", pin: "PA11", signal: "USB_OTG_FS_DM", source: "pedals CORE-BRIEF.md:396 @5b926d0; processor-and-memory.md:102,128,267 (PA11/PA12)" },
  { net: "DFU_USB_DP", pin: "PA12", signal: "USB_OTG_FS_DP", source: "pedals CORE-BRIEF.md:397 @5b926d0; processor-and-memory.md:102,128,267 (PA11/PA12)" },
  { net: "SWDIO", pin: "PA13", signal: "DEBUG_JTMS-SWDIO", source: "pedals CORE-BRIEF.md:399 @5b926d0" },
  { net: "SWCLK", pin: "PA14", signal: "DEBUG_JTCK-SWCLK", source: "pedals CORE-BRIEF.md:400 @5b926d0" },
  { net: "HSE_IN", pin: "PH0", signal: "RCC_OSC_IN", source: "pedals CORE-BRIEF.md:401 @5b926d0" },
  { net: "HSE_OUT", pin: "PH1", signal: "RCC_OSC_OUT", source: "pedals CORE-BRIEF.md:402 @5b926d0" },
  { net: "MODULE_ID_STRAP", pin: "PC2_C", signal: "ADC3_INP0", source: "ruling CR-MODULE-ID-STRAP-PIN (docs/h7-platform/decisions.md); split spec section 6.5 (a free module ADC pin)" },
]
