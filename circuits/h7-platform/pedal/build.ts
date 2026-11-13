/**
 * The vocabulary every h7-pedal block file is written in (h7 pedal pages plan, Task 5).
 *
 * THE BLOCKS (controller ruling CR-PEDAL-BLOCKS, decisions.md; the owner may override). The source
 * inventory's section 1.1 list (`docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md`),
 * with its `controls` split into `controls_a` (positions 1-3) and `controls_b` (positions 4-6): 19
 * blocks, one page each. Each block is one function, so every OPA1688 dual stays whole in its block,
 * channel A = L and B = R (schematic-checklist.md:149). The groups are the plan's: Task 6 models the
 * power group, Task 8 the digital and controls group, Task 10 the analog group; the interface block
 * is Task 5's. `pedal-board.ts` includes a block only once its task has built it.
 *
 * THE COMPONENT HELPERS are the module's (`../module/build.ts`), re-exported so that the pedal's
 * blocks are written in the same words and a block port is named by the net it carries, for the
 * reason that file gives. Kinds the module never needed are added here by the task that needs them.
 */
import type { PinNumbers } from "../../../lib/kicad/from-network.ts"

export { block, capacitor, inductor, part, pushButton, resistor } from "../module/build.ts"
export type { Pins } from "../module/build.ts"

export const PEDAL_GROUPS = ["power", "digital and controls", "analog", "interface"] as const
export type PedalGroup = (typeof PEDAL_GROUPS)[number]

export interface PedalBlock {
  /** The block's prefix: its component ids start `<prefix>_`, and its page is named by it. */
  readonly prefix: string
  readonly group: PedalGroup
  /** The function, in the inventory's section 1.1 words. */
  readonly function: string
}

/** CR-PEDAL-BLOCKS: the 19 blocks, in the inventory's order. */
export const PEDAL_BLOCKS: readonly PedalBlock[] = [
  { prefix: "entry", group: "power", function: "DC jack, reverse-polarity Schottkys, input filter, hold-up reservoir on VIN_A, VIN bleeder" },
  { prefix: "pf", group: "power", function: "power-fail supervisor at VIN, sense divider, inverter making PF_TRIP / PF_ON" },
  { prefix: "modsw", group: "power", function: "module load switch Q_MSW onto VIN_MOD, its soft start, gate hold, VIN_MOD discharge (Q_VDIS)" },
  { prefix: "prail", group: "power", function: "3V3_P buck U_PRAIL and its EN delay / Q_PEN reset" },
  { prefix: "ldo_vmid", group: "power", function: "5V_A LDO, R_5VA link, VMID divider and U_VMID (whole dual)" },
  { prefix: "codec_sup", group: "digital and controls", function: "codec domain supply, oscillator, local reset (U_CVDD, D_CVCL, R_CBLD, U_XO, U_CRST, Q_PFR)" },
  { prefix: "codec", group: "digital and controls", function: "PCM3060, its straps, decoupling, 33 ohm series resistors" },
  { prefix: "sai_iso", group: "digital and controls", function: "SAI domain isolation buffers, biases, 470 ohm module-side resistors" },
  { prefix: "in_fe", group: "analog", function: "input front ends L/R up to the follower (U_IN, whole dual)" },
  { prefix: "adc_drv", group: "analog", function: "ADC drivers L/R (U_ADC, whole dual), VBIAS nodes, codec-pin RC" },
  { prefix: "out", group: "analog", function: "output difference amps L/R (U_OUT, whole dual), DC block, bleed" },
  { prefix: "jacks_byp", group: "analog", function: "four audio jacks, jack ESD, two bypass relays, coil drive, suppressors, Q_PFG" },
  { prefix: "expr_ref", group: "digital and controls", function: "expression jack and ESD, VREF_A blocking network, ring reference, tip chain, U_EXP, plug detect, HW_REV strap" },
  { prefix: "controls_a", group: "digital and controls", function: "control positions 1-3 (pot and button fits)" },
  { prefix: "controls_b", group: "digital and controls", function: "control positions 4-6 (pot and button fits)" },
  { prefix: "fsw_led", group: "digital and controls", function: "two footswitch inputs, two LEDs with MOSFET switches" },
  { prefix: "usb", group: "digital and controls", function: "pedal USB-C, CC resistors, ESD, shield RC, USB isolation switch, VBUS sense divider" },
  { prefix: "midi_i2c", group: "digital and controls", function: "MIDI OUT driver and high-side switch, MIDI header (not fitted), I2C pull-ups" },
  { prefix: "interface", group: "interface", function: "J_MOD_A, J_MOD_B module sockets" },
]

/**
 * Pin numbers by kind, for `intentFromNetwork` and the symbol checks. Only what the built blocks
 * need: the sockets' pins are already their symbol's pin numbers, so the interface block needs no
 * entry. Each later task adds the kinds its blocks bring (a resistor's `a`/`b`, a pot's
 * `POTENTIOMETER_PIN_NUMBERS`), checked by the board test's symbol check.
 */
export const PEDAL_PIN_NUMBERS: PinNumbers = {}
