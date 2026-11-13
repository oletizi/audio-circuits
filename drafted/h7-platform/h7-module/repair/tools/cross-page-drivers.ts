/**
 * THE h7-module SIGNAL NETS WHOSE DRIVER IS ON ANOTHER PAGE - the one declared table, under the
 * controller ruling CR-MODULE-CROSS-PAGE-DRIVERS (`docs/h7-platform/decisions.md`).
 *
 * Why it exists. `verify.sh` runs ERC on a block page under a root holding that block alone
 * (`draughting/pages/one-block-root.ts`). A net whose only pin on the page is a KiCad input, and whose driver is a
 * pin on another page, then reports `pin_not_driven` ("Input pin not driven by any Output pins"),
 * an error the page cannot remove, because the driver is not on it. For each net here, the
 * one-block root places a stand-in driver on the net's stub when the block under check is not the
 * driving block. A PWR_FLAG is not the stand-in: these are signal nets, not power nets.
 *
 * Declared, never derived: an entry is written here, from the model, with its source. It is NOT
 * found by scanning drafts or pages. `checkCrossPageDrivers` holds each entry to the model on every
 * run: the driving block exists, the designator is a component of that block, the pin is one of
 * that component's pins and sits on the entry's net, the driving block has a port on the net (so
 * the net crosses pages), and the pin's name is the one the KiCad symbol gives that number (the
 * installed library, or the project library for an `h7-platform` symbol). An entry failing any of
 * these is refused, naming what is missing.
 *
 * Entries for the pages Task 7b and Task 7c repair. A later page that needs one adds it, with its
 * source. Task 7c added the sdram page's 22 input nets: every SDRAM address, bank, byte-mask, clock
 * and command net whose only pin on that page is a W9825G6KH input, driven by the MCU's FMC pin.
 * SDRAM_NE is not one: R9, a passive pin, is on it with U3's /CS, and ERC reports nothing there. The
 * sixteen data nets are not: U3's DQ pins are bidirectional. Task 7d added the mcu page's two:
 * NRST and BOOT0, U1's two KiCad input pins whose nets have no other pin on that page, each driven
 * on the reset_boot page.
 * The assembled module's root ERC (Task 7 step 4) must clear each entry with its REAL driver, since
 * the stand-in only says the net is driven somewhere (`../../RECORD.md`).
 *
 * DATA ONLY. The logic - the model check, the stand-ins, the announced test override
 * (`PAGES_CROSS_PAGE_DRIVERS_TABLE`) - is `draughting/pages/cross-page-drivers.ts`, moved there
 * from this file by the H7 pedal plan's Task 4; the shared tools read this table through the board's
 * drafted directory, and refuse a board without it, naming the file.
 */
import type { CrossPageDriver } from "../../../../../draughting/pages/cross-page-drivers.ts"

/** The ruling this table is declared under; the shared tools' messages name it. */
export const RULING = "CR-MODULE-CROSS-PAGE-DRIVERS"

/** An entry whose driver is the MCU, U1 on the mcu page: the form every entry so far takes. */
function mcuDriver(net: string, pin: string, pinName: string, source: string): CrossPageDriver {
  return { net, block: "mcu", designator: "U1", pin, pinName, source }
}

export const CROSS_PAGE_DRIVERS: readonly CrossPageDriver[] = [
  mcuDriver("FLASH_CLK", "28", "PF10", "circuits/h7-platform/module-pins.ts (FLASH_CLK on PF10, QUADSPI_CLK; pedals CORE-BRIEF.md:382 @5b926d0); PF10 is LQFP-176 position 28 in ST's pin data (module/mcu.ts keys U1's pins by position)"),
  // Task 7c, the sdram page. Each source names the module-pins.ts line and the line it cites.
  mcuDriver("SDRAM_A0", "16", "PF0", "circuits/h7-platform/module-pins.ts:34 (SDRAM_A0 on PF0, FMC_A0; pedals CORE-BRIEF.md:319 @5b926d0); PF0 is LQFP-176 position 16 in ST's pin data"),
  mcuDriver("SDRAM_A1", "17", "PF1", "circuits/h7-platform/module-pins.ts:35 (SDRAM_A1 on PF1, FMC_A1; pedals CORE-BRIEF.md:320 @5b926d0); PF1 is LQFP-176 position 17 in ST's pin data"),
  mcuDriver("SDRAM_A2", "18", "PF2", "circuits/h7-platform/module-pins.ts:36 (SDRAM_A2 on PF2, FMC_A2; pedals CORE-BRIEF.md:321 @5b926d0); PF2 is LQFP-176 position 18 in ST's pin data"),
  mcuDriver("SDRAM_A3", "19", "PF3", "circuits/h7-platform/module-pins.ts:37 (SDRAM_A3 on PF3, FMC_A3; pedals CORE-BRIEF.md:322 @5b926d0); PF3 is LQFP-176 position 19 in ST's pin data"),
  mcuDriver("SDRAM_A4", "20", "PF4", "circuits/h7-platform/module-pins.ts:38 (SDRAM_A4 on PF4, FMC_A4; pedals CORE-BRIEF.md:323 @5b926d0); PF4 is LQFP-176 position 20 in ST's pin data"),
  mcuDriver("SDRAM_A5", "21", "PF5", "circuits/h7-platform/module-pins.ts:39 (SDRAM_A5 on PF5, FMC_A5; pedals CORE-BRIEF.md:324 @5b926d0); PF5 is LQFP-176 position 21 in ST's pin data"),
  mcuDriver("SDRAM_A6", "60", "PF12", "circuits/h7-platform/module-pins.ts:40 (SDRAM_A6 on PF12, FMC_A6; pedals CORE-BRIEF.md:325 @5b926d0); PF12 is LQFP-176 position 60 in ST's pin data"),
  mcuDriver("SDRAM_A7", "63", "PF13", "circuits/h7-platform/module-pins.ts:41 (SDRAM_A7 on PF13, FMC_A7; pedals CORE-BRIEF.md:326 @5b926d0); PF13 is LQFP-176 position 63 in ST's pin data"),
  mcuDriver("SDRAM_A8", "64", "PF14", "circuits/h7-platform/module-pins.ts:42 (SDRAM_A8 on PF14, FMC_A8; pedals CORE-BRIEF.md:327 @5b926d0); PF14 is LQFP-176 position 64 in ST's pin data"),
  mcuDriver("SDRAM_A9", "65", "PF15", "circuits/h7-platform/module-pins.ts:43 (SDRAM_A9 on PF15, FMC_A9; pedals CORE-BRIEF.md:328 @5b926d0); PF15 is LQFP-176 position 65 in ST's pin data"),
  mcuDriver("SDRAM_A10", "66", "PG0", "circuits/h7-platform/module-pins.ts:44 (SDRAM_A10 on PG0, FMC_A10; pedals CORE-BRIEF.md:329 @5b926d0); PG0 is LQFP-176 position 66 in ST's pin data"),
  mcuDriver("SDRAM_A11", "67", "PG1", "circuits/h7-platform/module-pins.ts:45 (SDRAM_A11 on PG1, FMC_A11; pedals CORE-BRIEF.md:330 @5b926d0); PG1 is LQFP-176 position 67 in ST's pin data"),
  mcuDriver("SDRAM_A12", "106", "PG2", "circuits/h7-platform/module-pins.ts:46 (SDRAM_A12 on PG2, FMC_A12; pedals CORE-BRIEF.md:331 @5b926d0); PG2 is LQFP-176 position 106 in ST's pin data"),
  mcuDriver("SDRAM_BA0", "108", "PG4", "circuits/h7-platform/module-pins.ts:47 (SDRAM_BA0 on PG4, FMC_BA0; pedals CORE-BRIEF.md:332 @5b926d0); PG4 is LQFP-176 position 108 in ST's pin data"),
  mcuDriver("SDRAM_BA1", "109", "PG5", "circuits/h7-platform/module-pins.ts:48 (SDRAM_BA1 on PG5, FMC_BA1; pedals CORE-BRIEF.md:333 @5b926d0); PG5 is LQFP-176 position 109 in ST's pin data"),
  mcuDriver("SDRAM_NBL0", "169", "PE0", "circuits/h7-platform/module-pins.ts:65 (SDRAM_NBL0 on PE0, FMC_NBL0; pedals CORE-BRIEF.md:350 @5b926d0); PE0 is LQFP-176 position 169 in ST's pin data"),
  mcuDriver("SDRAM_NBL1", "170", "PE1", "circuits/h7-platform/module-pins.ts:66 (SDRAM_NBL1 on PE1, FMC_NBL1; pedals CORE-BRIEF.md:351 @5b926d0); PE1 is LQFP-176 position 170 in ST's pin data"),
  mcuDriver("SDRAM_CLK", "112", "PG8", "circuits/h7-platform/module-pins.ts:67 (SDRAM_CLK on PG8, FMC_SDCLK; pedals CORE-BRIEF.md:352 @5b926d0); PG8 is LQFP-176 position 112 in ST's pin data"),
  mcuDriver("SDRAM_NWE", "46", "PH5", "circuits/h7-platform/module-pins.ts:68 (SDRAM_NWE on PH5, FMC_SDNWE; pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDNWE PC0 to PH5; CORE-BRIEF.md:353 gave PC0); PH5 is LQFP-176 position 46 in ST's pin data"),
  mcuDriver("SDRAM_NRAS", "59", "PF11", "circuits/h7-platform/module-pins.ts:69 (SDRAM_NRAS on PF11, FMC_SDNRAS; pedals CORE-BRIEF.md:354 @5b926d0); PF11 is LQFP-176 position 59 in ST's pin data"),
  mcuDriver("SDRAM_NCAS", "160", "PG15", "circuits/h7-platform/module-pins.ts:70 (SDRAM_NCAS on PG15, FMC_SDNCAS; pedals CORE-BRIEF.md:355 @5b926d0); PG15 is LQFP-176 position 160 in ST's pin data"),
  mcuDriver("SDRAM_CKE", "43", "PH2", "circuits/h7-platform/module-pins.ts:72 (SDRAM_CKE on PH2, FMC_SDCKE0; pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDCKE0 PC3_C to PH2; CORE-BRIEF.md:357 gave PC3_C); PH2 is LQFP-176 position 43 in ST's pin data"),
  // Task 7d, the mcu page: its two KiCad input pins whose net has no other pin on the page. Every
  // other U1 pin on a port is bidirectional (the GPIOs), power (3V3_D, VREF_A, GND, VSSA, VCAP), or
  // VREF+ and PDR_ON, inputs on nets whose root stub carries the root's PWR_FLAG.
  {
    net: "NRST",
    block: "reset_boot",
    designator: "U5",
    pin: "2",
    pinName: "~{RESET}",
    source: "circuits/h7-platform/module/reset-boot.ts:27 (u_sup pin 2 RESET to NRST, open drain; processor-and-memory.md:264; CORE-11); U5's symbol h7-platform:TLV803EA30DBZR types pin 2 open_collector (ruling CR-MODULE-SUPERVISOR-SYMBOL, as amended 2026-11-12)",
  },
  {
    net: "BOOT0",
    block: "reset_boot",
    designator: "SW2",
    pin: "1",
    pinName: "1",
    source: "circuits/h7-platform/module/reset-boot.ts:35 (sw_boot, the BOOT button to VDD, pin 1 on BOOT0; processor-and-memory.md:265; CORE-12). R12, the 4.7 kOhm pull-down on the same page, is the other passive pin on BOOT0 there; it is not named because the model keys a resistor's pins a/b, not by symbol pin number, which this table's check requires",
  },
]
