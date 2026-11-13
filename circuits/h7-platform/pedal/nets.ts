/**
 * The h7-pedal's shared net names: the nets more than one block carries, and so the names of the
 * blocks' ports (`build.ts`). Listed from the source inventory's section 1.2
 * (`docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md`), each with where its name comes
 * from and the blocks that carry it:
 *
 * - **contract**: a net that crosses the 40-pin interface takes the contract's name, read from
 *   `module-interface.json` at its pin (architecture.md section 4.11 rule 7), never retyped;
 * - **document**: a pedal-internal net takes the documents' name, and `written` is the text the cited
 *   line uses for it (a per-channel name is often written once for both, as `FX_IN_x`);
 * - **ruling**: a net section 1.2 marks "name not given", named by controller ruling CR-PEDAL-NETS
 *   (decisions.md; the owner may override). The four codec output nets are named there too, for
 *   their spelling.
 *
 * `blocks` is a claim each group's task tests: a net reaches the blocks listed and no others. The
 * names Task 3 ruled inside one block (VIN_FB, IN_RF_L/R, POSn_NODE, POSn_BTN, FSWn_SW, MIDI_PIN4/5)
 * are block-private, so they are not here; they come from `pedal-rulings.ts` and
 * `pedal-population.ts`.
 */
import { loadContract } from "../contract.ts"
import { PEDAL_BLOCKS } from "./build.ts"

export type NetSource =
  | { readonly kind: "contract"; readonly pin: number }
  | { readonly kind: "document"; readonly lines: readonly string[]; readonly written: string }
  | { readonly kind: "ruling"; readonly ruling: "CR-PEDAL-NETS" }

export interface SharedNet {
  readonly net: string
  readonly from: NetSource
  readonly blocks: readonly string[]
}

/** The contract's signal on `pin`; throws where the contract gives none. */
function signalAt(pin: number): string {
  const found = loadContract().pins.find((p) => p.pin === pin)
  if (found === undefined || found.signal === null) {
    throw new Error(`module-interface.json gives contract pin ${pin} no signal name; the pedal's net on it cannot be named`)
  }
  return found.signal
}

/**
 * A contract net by its name, refused where the contract has no such signal: a block that misspelt a
 * contract net would otherwise make a second net the interface check never compares.
 */
export function contractNet(name: string): string {
  if (!loadContract().pins.some((p) => p.signal === name)) {
    throw new Error(
      `"${name}" is not a signal in circuits/h7-platform/module-interface.json, so it is not a contract net. ` +
        "A net crossing the interface takes the contract's name exactly (architecture.md section 4.11 rule 7); not defaulted, " +
        "because a near-miss name would be a second net the interface check never sees.",
    )
  }
  return name
}

const C = (pin: number, blocks: readonly string[]): SharedNet => ({ net: signalAt(pin), from: { kind: "contract", pin }, blocks })
const D = (net: string, lines: readonly string[], written: string, blocks: readonly string[]): SharedNet =>
  ({ net, from: { kind: "document", lines, written }, blocks })
const R = (net: string, blocks: readonly string[]): SharedNet => ({ net, from: { kind: "ruling", ruling: "CR-PEDAL-NETS" }, blocks })

const POWER = "docs/h7-platform/power.md"
const ANALOG = "docs/h7-platform/analog.md"
const BYPASS = "docs/h7-platform/bypass-relay.md"
const CHK = "docs/h7-platform/schematic-checklist.md"

const ALL_BLOCKS = PEDAL_BLOCKS.map((b) => b.prefix)

export const SHARED_NETS: readonly SharedNet[] = [
  // Ground: pins 20 and 40 both GND, joined to the pedal's one GND (architecture.md section 4.11 rule 9).
  C(20, ALL_BLOCKS),
  // Supplies.
  D("VIN", [`${POWER}:25`, `${POWER}:47`], "VIN", ["entry", "pf"]),
  D("VIN_A", [`${POWER}:27`, `${POWER}:49`], "VIN_A", ["entry", "ldo_vmid", "in_fe", "out"]),
  R("VIN_MSW", ["entry", "modsw"]),
  C(39, ["modsw", "prail", "interface"]),
  // 5V_A: codec_sup reaches it only through R_5VA as 5V_A_CODEC (inventory B6), so it is not listed here.
  D("5V_A", [`${POWER}:50`], "5V_A", ["pf", "ldo_vmid", "adc_drv"]),
  D("5V_A_CODEC", [`${ANALOG}:387`], "5V_A_CODEC", ["ldo_vmid", "codec_sup", "codec"]),
  D("3V3_CODEC", [`${ANALOG}:387`], "3V3_CODEC", ["codec_sup", "codec", "sai_iso"]),
  D("3V3_P", [`${BYPASS}:101`], "3V3_P", ["prail", "jacks_byp", "fsw_led", "midi_i2c"]),
  C(38, ["sai_iso", "controls_a", "controls_b", "fsw_led", "usb", "midi_i2c", "interface"]),
  C(21, ["expr_ref", "controls_a", "controls_b", "interface"]),
  // Power-fail and reset.
  D("PF_TRIP", [`${POWER}:62`], "PF_TRIP", ["pf", "modsw", "prail", "codec_sup", "jacks_byp"]),
  D("PF_ON", [`${POWER}:63`], "PF_ON", ["pf", "modsw", "prail"]),
  D("CODEC_RST_N", [`${ANALOG}:63`], "CODEC_RST_N", ["codec_sup", "codec"]),
  D("XO_OUT", [`${ANALOG}:383`], "XO_OUT", ["codec_sup", "codec"]),
  // Analog signal path.
  D("VMID_L", [`${CHK}:131`], "VMID_L", ["ldo_vmid", "in_fe", "out"]),
  D("VMID_R", [`${CHK}:131`], "VMID_R", ["ldo_vmid", "in_fe", "out"]),
  D("FX_IN_L", [`${BYPASS}:91`], "FX_IN_x", ["jacks_byp", "in_fe"]),
  D("FX_IN_R", [`${BYPASS}:91`], "FX_IN_x", ["jacks_byp", "in_fe"]),
  D("FX_OUT_L", [`${BYPASS}:93`], "FX_OUT_x", ["out", "jacks_byp"]),
  D("FX_OUT_R", [`${BYPASS}:93`], "FX_OUT_x", ["out", "jacks_byp"]),
  R("IN_FOLLOW_L", ["in_fe", "adc_drv"]),
  R("IN_FOLLOW_R", ["in_fe", "adc_drv"]),
  D("VINL", [`${CHK}:110`], "VINL", ["adc_drv", "codec"]),
  D("VINR", [`${CHK}:110`], "VINR", ["adc_drv", "codec"]),
  R("VOUTL+", ["codec", "out"]),
  R("VOUTL-", ["codec", "out"]),
  R("VOUTR+", ["codec", "out"]),
  R("VOUTR-", ["codec", "out"]),
  // Inventory section 1.2 lists IN_TIP_L although only jacks_byp carries it (the right input's tip-normal).
  D("IN_TIP_L", [`${BYPASS}:125`], "IN_TIP_L", ["jacks_byp"]),
  // SAI: the codec side of the isolation (after the 33 ohm on BCK, LRCK, DOUT; DIN into the codec), then the contract nets.
  R("BCK_CODEC", ["codec", "sai_iso"]),
  R("LRCK_CODEC", ["codec", "sai_iso"]),
  R("DOUT_CODEC", ["codec", "sai_iso"]),
  R("DIN_CODEC", ["codec", "sai_iso"]),
  C(32, ["sai_iso", "interface"]),
  C(33, ["sai_iso", "interface"]),
  C(34, ["sai_iso", "interface"]),
  C(35, ["sai_iso", "interface"]),
  // Contract signals to the pedal's controls, switches, LEDs, USB, MIDI and expansion bus.
  C(8, ["jacks_byp", "interface"]),
  C(5, ["fsw_led", "interface"]),
  C(4, ["fsw_led", "interface"]),
  C(6, ["fsw_led", "interface"]),
  C(9, ["fsw_led", "interface"]),
  C(22, ["controls_a", "interface"]),
  C(23, ["controls_a", "interface"]),
  C(24, ["controls_a", "interface"]),
  C(25, ["controls_b", "interface"]),
  C(26, ["controls_b", "interface"]),
  C(27, ["controls_b", "interface"]),
  C(28, ["expr_ref", "interface"]),
  C(29, ["expr_ref", "interface"]),
  C(30, ["expr_ref", "interface"]),
  C(31, ["usb", "interface"]),
  C(11, ["usb", "interface"]),
  C(36, ["usb", "interface"]),
  C(37, ["usb", "interface"]),
  // EXP_I2C_SCL/SDA: the codec's links to them are not fitted and not modelled (CR-PEDAL-POPULATION), so codec is not listed.
  C(12, ["midi_i2c", "interface"]),
  C(13, ["midi_i2c", "interface"]),
  C(14, ["midi_i2c", "interface"]),
  C(15, ["midi_i2c", "interface"]),
  // The spares: "no pedal-board load" (architecture.md:181); the socket pad is all the pedal has on them.
  C(1, ["interface"]),
  C(2, ["interface"]),
  C(3, ["interface"]),
  C(7, ["interface"]),
  C(10, ["interface"]),
]

/** The shared net named `net`; throws where none is listed. */
export function sharedNet(net: string): SharedNet {
  const found = SHARED_NETS.find((n) => n.net === net)
  if (found === undefined) {
    throw new Error(
      `"${net}" is not a shared net of the h7-pedal (circuits/h7-platform/pedal/nets.ts). Add it from the inventory's ` +
        "section 1.2 with its source, or rule its name in CR-PEDAL-NETS; not defaulted, because an unlisted port name is a net nobody checks.",
    )
  }
  return found
}
