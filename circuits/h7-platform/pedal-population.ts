/**
 * The pedal's not-fitted positions and its MIDI (h7 pedal pages plan, Task 3; GitHub issue 33, P1).
 *
 * CR-PEDAL-POPULATION. The model is the default fitted build. `Component`, `PartSpec`, the drawing intent
 * and the sheet-agreement path carry no population state, and this plan adds none. So every not-fitted
 * position the sources name falls in one of two classes:
 * - `NOT_FITTED_PARTS`: a part whose fitting would join or load nets. It is left out of the model and off
 *   the page; the block's module comment names it and its source, and the codec page carries a text note
 *   listing these parts with CODEC-10's sheet note verbatim (`CODEC10_SHEET_NOTE`). A drawn one would make
 *   the round trip fail, since the page would carry a part the model does not.
 * - `NOT_FITTED_CONNECTORS`: a connector whose fitting adds no on-board path. It is modelled and drawn, and
 *   its page note says it is not fitted. Whether it is placed is a BOM fact for the assembly consumer (G245).
 * Every other "not fitted" the documents name is listed, with why it is not a pedal position, in the
 * decisions.md entry.
 *
 * `MIDI` is CR-PEDAL-MIDI: what of the MIDI block is drawn and what is not.
 */
import type { PartSpec } from "../../lib/model/index.ts"
import { MIDI_HEADER } from "./pedal-parts.ts"

const CHK = "docs/h7-platform/schematic-checklist.md"

export interface NotFittedPart {
  readonly id: string
  /** What the position is, in the source's words. */
  readonly what: string
  /** The `path:line` that says it is not fitted. */
  readonly source: string
  /** What fitting it would do to the circuit. */
  readonly ifFitted: string
}

/** Class 1: left out of the model and off the page (CR-PEDAL-POPULATION). */
export const NOT_FITTED_PARTS: readonly NotFittedPart[] = [
  {
    id: "codec_mode_link", what: "CODEC-06's 0 ohm from MODE (pin 28) to DGND, for the I2C option", source: `${CHK}:98`,
    ifFitted: "joins MODE to GND, shorting the 220 kohm hardware-mode strap: with the 220 kohm removed, the codec leaves hardware mode",
  },
  {
    id: "codec_demp_pullup", what: "CODEC-09's 4.7 kohm pull-up from MD/SDA/DEMP (pin 2) to VDD, the SDA pull-up for I2C mode", source: `${CHK}:104`,
    ifFitted: "loads pin 2 to the codec's VDD (3V3_CODEC) against its 4.7 kohm pull-down",
  },
  {
    id: "codec_scl_link", what: "CODEC-10's 0 ohm from MC/SCL/FMT (pin 1) to EXP_I2C_SCL (contract pin 12)", source: `${CHK}:105`,
    ifFitted: "joins the codec's pin-1 net to EXP_I2C_SCL, a contract net, across the module/codec domain boundary",
  },
  {
    id: "codec_sda_link", what: "CODEC-10's 0 ohm from MD/SDA/DEMP (pin 2) to EXP_I2C_SDA (contract pin 13)", source: `${CHK}:105`,
    ifFitted: "joins the codec's pin-2 net to EXP_I2C_SDA, a contract net, across the module/codec domain boundary",
  },
  {
    id: "codec_rst_pulldown", what: "v1's R_RST_PD, 10 kohm from CODEC_RST_N to GND", source: "docs/h7-platform/analog.md:63",
    ifFitted: "loads CODEC_RST_N to GND, putting the released RST anywhere from 1.83 V to 2.30 V, across VIH (analog.md:411; R-53); never to be fitted",
  },
]

export interface NotFittedConnector {
  readonly id: string
  readonly what: string
  readonly source: string
  readonly part: PartSpec
  readonly pins: Readonly<Record<string, string>>
  readonly ifFitted: string
}

/** Class 2: modelled and drawn, with a page note that it is not fitted (CR-PEDAL-POPULATION). */
export const NOT_FITTED_CONNECTORS: readonly NotFittedConnector[] = [
  {
    id: "j_midi", what: "USB-08's MIDI UART header, 1 x 4 2.54 mm", source: `${CHK}:217`, part: MIDI_HEADER,
    pins: { "1": "3V3_D", "2": "MIDI_UART_TX", "3": "MIDI_UART_RX", "4": "GND" },
    ifFitted:
      "a header's four pins have no internal connection to each other (MIDI_HEADER is electricallyInert), and each " +
      "lands on a net the board already carries; fitting it gives a cable somewhere to attach and joins no two " +
      "on-board nets, so the fitted and unfitted boards are the same circuit",
  },
]

/** CODEC-10's sheet note, verbatim (schematic-checklist.md:105); the codec page's population note carries it. */
export const CODEC10_SHEET_NOTE =
  "I2C mode = fit both links, fit MODE 0 Ω (CODEC-06) and remove the 220 kΩ, remove the pin-2 4.7 kΩ pull-down and fit the DNF pull-up."

/** CR-PEDAL-POPULATION, as one constant for the heading check. */
export const POPULATION = {
  ruling: "CR-PEDAL-POPULATION",
  parts: NOT_FITTED_PARTS,
  connectors: NOT_FITTED_CONNECTORS,
  sheetNote: CODEC10_SHEET_NOTE,
  sources: [`${CHK}:98`, `${CHK}:104`, `${CHK}:105`, `${CHK}:217`, `${CHK}:245`, "docs/h7-platform/analog.md:63", "docs/h7-platform/decisions.md:613"],
} as const

/**
 * CR-PEDAL-MIDI. Drawn: U_MIDIDRV, R_TXPU, Q_MIDI, R_MGP, RA (four) and RC, up to the nets R-26 names, here
 * MIDI_PIN4 (RA's far end) and MIDI_PIN5 (RC's far end), and the not-fitted header `j_midi`. Not drawn: the
 * connector that carries MIDI pins 4 and 5 (no source names it; open row MIDI-OUT-CONNECTOR) with the CA-033
 * ferrites that would sit at it, and the MIDI IN receiver (until MIDI-IN-RECEIVER-STOCK closes; spec:347-348).
 */
export const MIDI = {
  ruling: "CR-PEDAL-MIDI",
  loopNets: { pin4: "MIDI_PIN4", pin5: "MIDI_PIN5" },
  loopConnector: "not drawn",
  receiver: "not drawn",
  sources: [
    "docs/h7-platform/power.md:460", "docs/h7-platform/decisions.md:1002", "docs/h7-platform/decisions.md:613",
    `${CHK}:217`, "docs/h7-platform/architecture.md:341", "docs/h7-platform/open-items.md:62", "docs/h7-platform/open-items.md:73",
  ],
} as const
