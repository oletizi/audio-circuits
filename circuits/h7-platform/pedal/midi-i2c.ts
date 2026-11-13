/**
 * The pedal's MIDI and I2C expansion block (h7 pedal pages plan, Task 8; inventory section 1.3 B17;
 * CR-PEDAL-BLOCKS `midi_i2c`), as CR-PEDAL-MIDI and CR-PEDAL-I2C-EXPANSION rule it:
 *
 * - R-26's MIDI OUT driver and switch, up to the nets the sources name (power.md:460; R-23, R-28,
 *   R-53): U_MIDIDRV, SN74LVC1G07 on 3V3_D, driven by MIDI_UART_TX, its open-drain output pulling
 *   Q_MIDI's gate low; R_TXPU 18.0 kOhm from MIDI_UART_TX to 3V3_D at its input (R-28); Q_MIDI,
 *   AO3401A, source on 3V3_P, its gate pulled up to 3V3_P by R_MGP 160 ohm, its drain through RA (four
 *   130 ohm in parallel) to "MIDI pin 4", MIDI_PIN4; "pin 5" through RC 10 ohm to GND, MIDI_PIN5
 *   (CR-PEDAL-MIDI's names). U_MIDIDRV's 100 nF is CR-PEDAL-LOGIC-DECOUPLING's; its pin 1 is "No
 *   internal connection" (SCES296AG): NC. Parts and MPNs: parts.md:139-144.
 * - USB-08's MIDI UART header, not fitted, 1 x 4: 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX,
 *   4 = GND (schematic-checklist.md:217; OWN-04). Modelled and drawn, page note "not fitted"
 *   (CR-PEDAL-POPULATION, class 2: `NOT_FITTED_CONNECTORS`).
 * - The I2C expansion pull-ups, 2.40 kOhm 1 % to 3V3_D on EXP_I2C_SCL and EXP_I2C_SDA, on the pedal
 *   only (power.md:413; R-21; parts.md:138).
 * - CR-PEDAL-TEST-PADS' 3V3_D pad, on this page by CR-PEDAL-DIGITAL-READINGS.
 *
 * MIDI_PIN4 and MIDI_PIN5 are ports of this block and of the board (`UNDRAWN_CONNECTOR_NETS`,
 * CR-PEDAL-DIGITAL-READINGS): each runs on to a connector no source names.
 *
 * NOT MODELLED, each named with the open row that holds it:
 * - The connector that carries MIDI pins 4 and 5, and the optional CA-033 ferrites that "go at the
 *   jack" (open-items.md:62): no source names the connector or its pinout. Open row MIDI-OUT-CONNECTOR
 *   (open-items.md:128); CR-PEDAL-MIDI.
 * - The MIDI IN receiver and its network: only TI ISOM8710 is cited, to show 2.0 mA can be met
 *   (parts.md:227); no stocked part is ruled. Open row MIDI-IN-RECEIVER-STOCK (open-items.md:73);
 *   CR-PEDAL-MIDI. MIDI_UART_RX therefore reaches only its socket pad and the header's pin 3.
 * - An I2C expansion connector: no source names one. Open row I2C-EXPANSION-CONNECTOR
 *   (open-items.md:129); CR-PEDAL-I2C-EXPANSION.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { AO3401A, SN74LVC1G07 } from "../pedal-parts.ts"
import { MIDI, NOT_FITTED_CONNECTORS } from "../pedal-population.ts"
import { LOGIC_DECOUPLING, TEST_PADS } from "../pedal-rulings.ts"
import { block, capacitor, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })

const V3D = contractNet("3V3_D")
const V3P = "3V3_P"
const TX = contractNet("MIDI_UART_TX")
const RX = contractNet("MIDI_UART_RX")
const SCL = contractNet("EXP_I2C_SCL")
const SDA = contractNet("EXP_I2C_SDA")
const GND = "GND"
const GATE = "MIDI_GATE"
const DRAIN = "MIDI_DRAIN"
const PIN4 = MIDI.loopNets.pin4
const PIN5 = MIDI.loopNets.pin5

const R26 = "power.md:460 (MIDI OUT; R-26, R-53)"

function header(): { readonly part: PartSpec; readonly pins: Readonly<Record<string, string>>; readonly source: string } {
  const h = NOT_FITTED_CONNECTORS.find((c) => c.id === "j_midi")
  if (h === undefined) {
    throw new Error("NOT_FITTED_CONNECTORS (circuits/h7-platform/pedal-population.ts) has no j_midi; the MIDI header's pins are that ruling's, not retyped here")
  }
  return { part: h.part, pins: h.pins, source: h.source }
}

function single<T>(found: T | undefined, what: string): T {
  if (found === undefined) throw new Error(`circuits/h7-platform/pedal-rulings.ts has no ${what}; midi_i2c reads it from there rather than retyping it`)
  return found
}

export function midiI2cBlock(): Network {
  const h = header()
  const decoupling = single(LOGIC_DECOUPLING.parts.find((p) => p.part === "U_MIDIDRV"), "LOGIC_DECOUPLING entry for U_MIDIDRV")
  const pad = single(TEST_PADS.pads.find((p) => p.id === "tp_3v3_d"), "TEST_PADS entry tp_3v3_d")
  const ra = withMpn(RESISTOR, "1206W4F1300T5E")
  const i2cPullUp = withMpn(RESISTOR, "0603WAF2401T5E")
  return block([
    part("u_mididrv", "ic", { "1": NC, "2": TX, "3": GND, "4": GATE, "5": V3D }, SN74LVC1G07,
      `${R26}: U_MIDIDRV on 3V3_D, driven by MIDI_UART_TX, pulls Q_MIDI's gate low (R-23); parts.md:139`),
    capacitor("c_mididrv", decoupling.farads, V3D, GND, CAPACITOR, "CR-PEDAL-LOGIC-DECOUPLING (U_MIDIDRV, TI SCES296AG p. 11 section 8.3); CR-PEDAL-MIDI; to GND: CR-PEDAL-DIGITAL-READINGS"),
    resistor("r_txpu", "18.0k", TX, V3D, withMpn(RESISTOR, "0603WAF1802T5E"), "R-28 (R_TXPU 18.0 kOhm from MIDI_UART_TX to 3V3_D); parts.md:140"),
    part("q_midi", "ic", { "1": GATE, "2": V3P, "3": DRAIN }, AO3401A, `${R26}: Q_MIDI, high-side P-MOSFET, source on 3V3_P; parts.md:141`),
    resistor("r_mgp", "160", GATE, V3P, withMpn(RESISTOR, "1206W4F1600T5E"), `${R26}: R_MGP 160 ohm gate pull-up to 3V3_P; parts.md:142`),
    ...[1, 2, 3, 4].map((k) => resistor(`r_ra${k}`, "130", DRAIN, PIN4, ra, `${R26}: RA, four 130 ohm in parallel, drain to MIDI pin 4; parts.md:143; CR-PEDAL-MIDI (MIDI_PIN4)`)),
    resistor("r_rc", "10", PIN5, GND, withMpn(RESISTOR, "1206W4F100JT5E"), `${R26}: pin 5 through RC 10 ohm to GND; parts.md:144; CR-PEDAL-MIDI (MIDI_PIN5)`),
    part("j_midi", "connector", h.pins, h.part, `${h.source} (USB-08, not fitted; OWN-04); CR-PEDAL-POPULATION (not-fitted connector); CR-PEDAL-MIDI`),
    resistor("r_scl_pu", "2.40k", SCL, V3D, i2cPullUp, "power.md:413 (2.40 kOhm 1 % pull-ups on the pedal only; R-21); parts.md:138; architecture.md:342"),
    resistor("r_sda_pu_exp", "2.40k", SDA, V3D, i2cPullUp, "power.md:413 (2.40 kOhm 1 % pull-ups on the pedal only; R-21); parts.md:138; architecture.md:342"),
    part(pad.id, "connector", { "1": pad.net }, TEST_PADS.part, "CR-PEDAL-TEST-PADS (3V3_D); its page: CR-PEDAL-DIGITAL-READINGS"),
  ], [V3D, V3P, TX, RX, SCL, SDA, PIN4, PIN5, GND])
}
