/**
 * The h7 audio pedal board, h7-pedal (h7 pedal pages plan, Task 5): one `include()`d block per
 * function, each in `pedal/`, each drawn as its own page (design change C3). Model-authoritative:
 * the drawing is derived from this file (TOOLING.md step 0).
 *
 * THE BLOCKS are controller ruling CR-PEDAL-BLOCKS (`pedal/build.ts`, `PEDAL_BLOCKS`): 19, in three
 * groups and the interface. This file includes a block once its task has built it, so `h7Pedal()`
 * grows as each group lands: Task 5 the interface, Task 6 the power group, Task 8 the digital and
 * controls group, Task 10 the analog group. `BLOCKS`, `DESIGNATORS`, `PIN_NUMBERS` and `PAGE_GROUPS`
 * hold only what is built.
 *
 * NET NAMES are `pedal/nets.ts`: the contract's names where a net crosses the interface, the
 * documents' names inside the pedal, and CR-PEDAL-NETS where the documents give none. Every block
 * port is named by the root net it binds to, so each binding below is the identity.
 *
 * AUTHORITIES. `docs/h7-platform/` (power.md, analog.md, bypass-relay.md, architecture.md, parts.md,
 * schematic-checklist.md), the 40-pin contract `module-interface.json`, and the pedal's controller
 * rulings in `decisions.md` (CR-PEDAL-*), with the values Task 3 ruled in `pedal-rulings.ts` and
 * `pedal-population.ts`. Every component carries its source in `provenance`.
 */
import { circuit } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import { drawingPagesFromNetwork, type DrawingPage } from "../../tools/draught/drawing-pages.ts"
import { PEDAL_BLOCKS, PEDAL_PIN_NUMBERS } from "./pedal/build.ts"
import { entryBlock } from "./pedal/entry.ts"
import { modswBlock } from "./pedal/modsw.ts"
import { pfBlock } from "./pedal/pf.ts"
import { prailBlock } from "./pedal/prail.ts"
import { interfaceBlock } from "./pedal/interface.ts"
import { ldoVmidBlock } from "./pedal/ldo-vmid.ts"
import { codecSupBlock } from "./pedal/codec-sup.ts"
import { codecBlock } from "./pedal/codec.ts"
import { contractNet } from "./pedal/nets.ts"

// The project symbol library the pedal's project symbols draw from (spec C4); `make draw` reads this export.
export { PROJECT_SYMBOL_LIBRARY } from "./parts.ts"

/** Pin numbers by kind (`pedal/build.ts`). */
export const PIN_NUMBERS = PEDAL_PIN_NUMBERS

/** Block prefix -> its builder and the caption copperhead draws around its page. Built blocks only. */
const BLOCKS: readonly (readonly [string, () => Network, string])[] = [
  ["entry", entryBlock, "Power entry"],
  ["pf", pfBlock, "Power-fail supervisor"],
  ["modsw", modswBlock, "Module load switch"],
  ["prail", prailBlock, "Pedal digital rail 3V3_P"],
  ["ldo_vmid", ldoVmidBlock, "5V_A and VMID"],
  ["codec_sup", codecSupBlock, "Codec supply, clock and reset"],
  ["codec", codecBlock, "Codec PCM3060"],
  ["interface", interfaceBlock, "Module sockets"],
]

for (const [prefix] of BLOCKS) {
  if (!PEDAL_BLOCKS.some((b) => b.prefix === prefix)) {
    throw new Error(`block "${prefix}" is not one of CR-PEDAL-BLOCKS' 19 (pedal/build.ts); a page outside the ruled list has no ruling behind it`)
  }
}

export const PAGE_GROUPS: Readonly<Record<string, string>> = Object.fromEntries(BLOCKS.map(([p, , caption]) => [p, caption]))

/**
 * The contract nets nothing on the pedal loads yet: on the board, each reaches only its socket pad.
 * A one-pin net is refused by validation unless it is a port, and these nets do leave the board, on
 * to the module, so each is a port of the board itself (CR-PEDAL-NETS, "Socket-only nets").
 *
 * - The five spares stay here for good: "SPARE1-SPARE5: signal pins, GPIO inputs, no pedal-board
 *   load" (architecture.md:181).
 * - The rest wait for the block that loads them (`pedal/nets.ts` lists which). The task that builds
 *   that block removes the net here; the board test refuses a net listed here that reaches more than
 *   its pad, and validation refuses one left out that reaches only its pad.
 */
export const SOCKET_ONLY_NETS: readonly string[] = [
  // For good (architecture.md:181).
  "SPARE1", "SPARE2", "SPARE3", "SPARE4", "SPARE5",
  // Until Task 8 (digital and controls group).
  "3V3_D", "VREF_A", "CODEC_DOUT", "CODEC_DIN", "CODEC_LRCK", "CODEC_BCK", "LED1", "LED2", "FSW1", "FSW2",
  "POS1", "POS2", "POS3", "POS4", "POS5", "POS6", "EXPR_TIP", "HW_REV", "EXPR_DETECT",
  "USB_VBUS_SENSE", "USB_EN_N", "USB_DM", "USB_DP", "EXP_I2C_SCL", "EXP_I2C_SDA", "MIDI_UART_TX", "MIDI_UART_RX",
  // Until Task 10 (analog group): jacks_byp.
  "RELAY_EN",
].map(contractNet)

/**
 * Pedal nets that, on the board as built so far, reach one pin only: a block has built one end and
 * the block that loads the other is a later task's. Validation refuses a one-pin net that is not a
 * port, so each is a port of the board until that block lands, and that task removes it here
 * (CR-PEDAL-NETS, "Nets awaiting their other block"). Unlike SOCKET_ONLY_NETS these do not leave
 * the board; the list is a construction state, and the board test refuses an entry that reaches
 * more than one pin or whose loading block is already built.
 */
export const AWAITING_NETS: readonly string[] = [
  // Until sai_iso (Task 8): the codec side of the SAI isolation (CR-PEDAL-NETS).
  "BCK_CODEC", "LRCK_CODEC", "DOUT_CODEC", "DIN_CODEC",
  // Until Task 10 (adc_drv, out): the codec's analog inputs and outputs (schematic-checklist.md:110).
  "VINL", "VINR", "VOUTL+", "VOUTL-", "VOUTR+", "VOUTR-",
]

/** The pedal: every built block included, each port bound to the root net of its own name. */
export function h7Pedal(): Network {
  const builder = circuit()
  for (const [prefix, build] of BLOCKS) {
    const net = build()
    builder.include(prefix, net, Object.fromEntries(Object.keys(net.ports).map((port) => [port, port])))
  }
  for (const net of [...SOCKET_ONLY_NETS, ...AWAITING_NETS]) builder.port(net, net)
  return builder.done()
}

/** Prefixed component id -> reference designator, one numbering across every page. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  // interface: J1 and J2, the numbers the module's headers and the carrier's sockets carry
  interface_j_mod_a: "J1", interface_j_mod_b: "J2",
  // entry
  entry_j_dc: "J3", entry_fb_in: "FB1", entry_c_sch: "C1", entry_c_prothf: "C2", entry_d_ain: "D1", entry_d_min: "D2",
  entry_c_bulk: "C3", entry_c_bulk2: "C4", entry_c_bulk3: "C5", entry_c_bulk4: "C6", entry_c_prot: "C7",
  entry_r_vbld: "R1", entry_tp_vin: "TP1", entry_tp_vin_a: "TP2", entry_tp_gnd: "TP3",
  // pf
  pf_u_pf: "U1", pf_r_pft1: "R2", pf_r_pft2: "R3", pf_r_pfb: "R4", pf_d_pfcl: "D3", pf_c_pfs: "C8", pf_c_pf: "C9",
  pf_c_pfct: "C10", pf_r_pfpu: "R5", pf_u_pfinv: "U2", pf_c_pfinv: "C11", pf_r_pftpd: "R6", pf_r_pfonpd: "R7",
  // modsw
  modsw_q_msw: "Q1", modsw_r_mswt: "R8", modsw_r_mswb: "R9", modsw_q_mswd: "Q2", modsw_c_ss: "C12", modsw_d_ss: "D4",
  modsw_r_ssr: "R10", modsw_c_gs: "C13", modsw_d_gs: "D5", modsw_r_gsb: "R11", modsw_q_vdis: "Q3", modsw_r_vdis: "R12",
  modsw_tp_vin_mod: "TP4",
  // prail
  prail_u_prail: "U3", prail_c_pin1: "C14", prail_c_pin2: "C15", prail_c_pinhf: "C16", prail_l_prail: "L1",
  prail_c_pout1: "C17", prail_c_pout2: "C18", prail_c_pout3: "C19", prail_c_pout_hf: "C20", prail_r_fb_top: "R13",
  prail_r_fb_bottom: "R14", prail_c_ss: "C21", prail_r_bst: "R15", prail_c_bst: "C22", prail_r_pen: "R16",
  prail_r_penpd: "R17", prail_c_pen1: "C23", prail_c_pen2: "C24", prail_q_pen: "Q4", prail_r_pens: "R18",
  // ldo_vmid
  ldo_vmid_u_ldo: "U4", ldo_vmid_r_ldot: "R19", ldo_vmid_r_ldob: "R20", ldo_vmid_c_lin: "C25", ldo_vmid_c_lout: "C26",
  ldo_vmid_c_nr: "C27", ldo_vmid_c_ff: "C28", ldo_vmid_r_5va: "R21", ldo_vmid_r_vmid_top: "R22",
  ldo_vmid_r_vmid_bottom: "R23", ldo_vmid_c_vmid: "C29", ldo_vmid_r_vmid_in_l: "R24", ldo_vmid_r_vmid_in_r: "R25",
  ldo_vmid_u_vmid: "U5", ldo_vmid_c_vmid_hf: "C30", ldo_vmid_c_vmid_bulk: "C31", ldo_vmid_tp_5v_a: "TP5",
  // codec_sup
  codec_sup_u_cvdd: "U6", codec_sup_c_cvddin: "C32", codec_sup_c_cvddout: "C33", codec_sup_d_cvcl: "D6",
  codec_sup_r_cbld: "R26", codec_sup_u_xo: "U7", codec_sup_c_xo: "C34", codec_sup_u_crst: "U8", codec_sup_c_crst: "C35",
  codec_sup_r_crst: "R27", codec_sup_q_pfr: "Q5",
  // codec
  codec_u_codec: "U9", codec_c_vcc_hf: "C36", codec_c_vcc_bulk: "C37", codec_c_vdd_hf: "C38", codec_c_vdd_bulk: "C39",
  codec_c_vcom_hf: "C40", codec_c_vcom_bulk: "C41", codec_r_mode: "R28", codec_r_fmt: "R29", codec_r_demp: "R30",
  codec_r_bck: "R31", codec_r_lrck: "R32", codec_r_dout: "R33",
}

/** One page per block (design change C3). */
export function drawingPages(): readonly DrawingPage[] {
  return drawingPagesFromNetwork(h7Pedal(), DESIGNATORS, PIN_NUMBERS, PAGE_GROUPS)
}
