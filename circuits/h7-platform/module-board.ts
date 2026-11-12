/**
 * The h7 processor module, h7-module (H7 module plan, Task 6): one `include()`d block per function,
 * each in `module/`, each drawn as its own page (design change C3). Model-authoritative: the
 * drawing is derived from this file (TOOLING.md step 0).
 *
 * AUTHORITIES. `docs/h7-platform/processor-and-memory.md`, `power.md` sections 4 and 5,
 * `parts.md` section 1 and `schematic-checklist.md` CORE, PWR and USB items; ST's pin data for the
 * MCU; `module-pins.ts` for the internal pin map; `module-interface.json` for the 40 interface pins;
 * and the module's controller rulings in `decisions.md` (CR-MODULE-*). Each block's comment names
 * its lines, and every component carries its source in `provenance`.
 *
 * NET NAMES. Where a net crosses the interface it takes the contract's name (`module/nets.ts`):
 * the documents' 3V3 is `3V3_D` (pin 38), VDDA = VREF+ is `VREF_A` (pin 21), VIN is `VIN_MOD`
 * (pin 39), VSS is `GND` (pins 20, 40). Every block port is named by the root net it binds to, so
 * each binding below is the identity.
 *
 * NOT CARRIED: footprints (a schematic needs none, CLAUDE.md G245); the TEST-PAD-SPLIT pads beyond
 * D15's and the SWD pogo set; the module's current budget (MODULE-3V3-BUDGET).
 */
import { circuit } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import { drawingPagesFromNetwork, type DrawingPage } from "../../tools/draught/drawing-pages.ts"
import { MODULE_PIN_NUMBERS } from "./module/build.ts"
import { clockBlock } from "./module/clock.ts"
import { idStrapBlock } from "./module/id-strap.ts"
import { interfaceBlock } from "./module/interface.ts"
import { mcuDecouplingBlock } from "./module/mcu-decoupling.ts"
import { mcuBlock } from "./module/mcu.ts"
import { powerBlock } from "./module/power.ts"
import { qspiBlock } from "./module/qspi.ts"
import { resetBootBlock } from "./module/reset-boot.ts"
import { sdramBlock } from "./module/sdram.ts"
import { swdBlock } from "./module/swd.ts"
import { usbDfuBlock } from "./module/usb-dfu.ts"
import { vddaBlock } from "./module/vdda.ts"

// The project symbol library the SDRAM draws from (spec C4); `make draw` reads this export.
export { PROJECT_SYMBOL_LIBRARY } from "./parts.ts"

/** Pin numbers by kind (`module/build.ts`). */
export const PIN_NUMBERS = MODULE_PIN_NUMBERS

/** Block prefix -> its builder and the caption copperhead draws around its page. */
const BLOCKS: readonly (readonly [string, () => Network, string])[] = [
  ["mcu", mcuBlock, "MCU, STM32H743IIT6"],
  ["decoupling", mcuDecouplingBlock, "MCU decoupling and bench pads"],
  ["vdda", vddaBlock, "VDDA / VREF_A"],
  ["power", powerBlock, "3.3 V buck and input network"],
  ["sdram", sdramBlock, "SDRAM"],
  ["qspi", qspiBlock, "QSPI flash"],
  ["clock", clockBlock, "HSE crystal"],
  ["reset_boot", resetBootBlock, "Reset and boot"],
  ["swd", swdBlock, "SWD"],
  ["usb_dfu", usbDfuBlock, "ROM DFU USB socket"],
  ["id_strap", idStrapBlock, "Module ID strap"],
  ["interface", interfaceBlock, "Interface headers"],
]

export const PAGE_GROUPS: Readonly<Record<string, string>> = Object.fromEntries(BLOCKS.map(([p, , caption]) => [p, caption]))

/** The module: every block included, each port bound to the root net of its own name. */
export function h7Module(): Network {
  const builder = circuit()
  for (const [prefix, build] of BLOCKS) {
    const net = build()
    builder.include(prefix, net, Object.fromEntries(Object.keys(net.ports).map((port) => [port, port])))
  }
  return builder.done()
}

/** Prefixed component id -> reference designator, one numbering across every page. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  // mcu
  mcu_u_mcu: "U1",
  // decoupling
  decoupling_c_vdd_15: "C1", decoupling_c_vdd_23: "C2", decoupling_c_vdd_36: "C3", decoupling_c_vdd_49: "C4",
  decoupling_c_vdd_62: "C5", decoupling_c_vdd_72: "C6", decoupling_c_vdd_82: "C7", decoupling_c_vdd_91: "C8",
  decoupling_c_vdd_103: "C9", decoupling_c_vdd_127: "C10", decoupling_c_vdd_136: "C11",
  decoupling_c_vdd_149: "C12", decoupling_c_vdd_159: "C13", decoupling_c_vdd_172: "C14",
  decoupling_c_vdd_bulk: "C15", decoupling_c_vdd33usb: "C16", decoupling_c_vdd33usb_bulk: "C17",
  decoupling_c_vbat: "C18", decoupling_c_vcap1: "C19", decoupling_c_vcap2: "C20", decoupling_tp_vcap: "TP1",
  decoupling_tp_vcap_gnd: "TP2", decoupling_tp_vdda: "TP3", decoupling_tp_vdda_gnd: "TP4",
  decoupling_tp_boot0: "TP5",
  // vdda
  vdda_fb_vdda: "FB1", vdda_c_vdda_bank1: "C21", vdda_c_vdda_bank2: "C22", vdda_c_vdda_bank3: "C23",
  vdda_c_vdda_bank4: "C24", vdda_r_vdda_damp: "R1", vdda_c_vdda_damp: "C25", vdda_r_vssa: "R2",
  // power
  power_l_filt: "L1", power_c_bin1: "C26", power_c_bin2: "C27", power_c_binhf: "C28", power_r_damp: "R3",
  power_c_damp: "C29", power_r_uv1: "R4", power_r_uv2: "R5", power_u_buck: "U2", power_r_bst: "R6",
  power_c_bst: "C30", power_c_ss: "C31", power_l_buck: "L2", power_c_bout1: "C32", power_c_bout2: "C33",
  power_c_bout3: "C34", power_c_bout_hf: "C35", power_r_fb_top: "R7", power_r_fb_bottom: "R8",
  // sdram
  sdram_u_sdram: "U3", sdram_c_sdram_1: "C36", sdram_c_sdram_3: "C37", sdram_c_sdram_9: "C38",
  sdram_c_sdram_14: "C39", sdram_c_sdram_27: "C40", sdram_c_sdram_43: "C41", sdram_c_sdram_49: "C42",
  sdram_r_sdram_ne_pullup: "R9",
  // qspi
  qspi_u_flash: "U4", qspi_r_flash_ncs_pullup: "R10", qspi_c_flash: "C43",
  // clock
  clock_y_hse: "Y1", clock_c_hse_in: "C44", clock_c_hse_out: "C45",
  // reset_boot
  reset_boot_u_sup: "U5", reset_boot_c_sup: "C46", reset_boot_r_nrst_pullup: "R11", reset_boot_c_nrst: "C47",
  reset_boot_sw_reset: "SW1", reset_boot_r_boot0_pulldown: "R12", reset_boot_c_boot0: "C48",
  reset_boot_sw_boot: "SW2",
  // swd
  swd_j_swd: "J3", swd_tp_swdio: "TP6", swd_tp_swclk: "TP7", swd_tp_nrst: "TP8", swd_tp_3v3: "TP9",
  swd_tp_gnd: "TP10",
  // usb_dfu
  usb_dfu_j_usb_mod: "J4", usb_dfu_u_esd: "U6", usb_dfu_c_vbus: "C49", usb_dfu_r_cc1: "R13",
  usb_dfu_r_cc2: "R14", usb_dfu_r_shld: "R15", usb_dfu_c_shld: "C50",
  // id_strap
  id_strap_r_id_top: "R16", id_strap_r_id_bottom: "R17", id_strap_c_id: "C51",
  // interface: J1 and J2, the numbers the carrier's sockets carry
  interface_j_mod_a: "J1", interface_j_mod_b: "J2",
}

/** One page per block (design change C3). */
export function drawingPages(): readonly DrawingPage[] {
  return drawingPagesFromNetwork(h7Module(), DESIGNATORS, PIN_NUMBERS, PAGE_GROUPS)
}
