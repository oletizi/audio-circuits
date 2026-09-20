/** What each KiCad screw terminal actually is.
 *
 * This file is the ONLY hand-authored part of the reference topology. Every
 * net and every capacitor comes from the machine-generated netlist in
 * `source/three-band-eq.netlist.json`; nothing here restates connectivity.
 *
 * The KiCad schematic captures the PCB only — every potentiometer, rotary
 * selector and inductor is off-board, reached through these terminals. The
 * declarations below say what hangs off each one, sourced from Ian
 * Thompson-Bell's master schematic (P3bandDoc.pdf page 5) and, where stated,
 * corroborated by terminal pin counts in the netlist itself.
 */

/** A 3-pin level terminal: pin 1 is ccw, pin 2 the wiper, pin 3 cw. */
export interface PotTerminal {
  readonly kind: "potentiometer"
  readonly ref: string
  readonly connector: string
  readonly ohms: number
  /** "log" and "lin" as printed on the master schematic. "unstated" where no
   * source gives one; such a pot may only be used at a control extreme, where
   * the taper cannot affect the result. */
  readonly taperClass: "log" | "lin" | "unstated"
  readonly source: string
}

/** A rotary selector split across two terminals: a common and its throws.
 *
 * The convention is consistent across all four sections and is corroborated by
 * pin counts — the "common" terminal carries 2 pins wired to the same net, the
 * "throws" terminal carries one pin per selectable position.
 */
export interface SelectorTerminals {
  readonly kind: "selector"
  readonly ref: string
  /** Terminal whose pins are commoned and fed from the signal path. */
  readonly commonConnector: string
  /** Terminal carrying one pin per position. */
  readonly throwsConnector: string
  /** Position labels, ordered to match throw pins 1..n. */
  readonly positions: readonly string[]
  readonly source: string
}

export const POTS: readonly PotTerminal[] = [
  {
    kind: "potentiometer",
    ref: "RV_LO_CUT",
    connector: "J7",
    ohms: 470_000,
    taperClass: "log",
    source: "P3bandDoc.pdf p5, marked 470K LOG",
  },
  {
    kind: "potentiometer",
    ref: "RV_LO_BOOST",
    connector: "J11",
    ohms: 47_000,
    taperClass: "log",
    source: "P3bandDoc.pdf p5, marked 47K LOG",
  },
  {
    kind: "potentiometer",
    ref: "RV_HI_BOOST",
    connector: "J21",
    ohms: 47_000,
    taperClass: "lin",
    source: "P3bandDoc.pdf p5, marked 47K LIN",
  },
  {
    kind: "potentiometer",
    ref: "RV_HI_Q",
    connector: "J20",
    ohms: 10_000,
    taperClass: "lin",
    source: "P3bandDoc.pdf p5, marked 10K LIN (Qmax)",
  },
  {
    kind: "potentiometer",
    ref: "RV_HI_CUT",
    connector: "J4",
    ohms: 4_700,
    // Taper class is stated by no source. It is inert at the control extremes
    // this reference is validated at, where every curve agrees exactly.
    taperClass: "unstated",
    source:
      "SteppedPotsfor3BandPultecv0.2.pdf p4: \"The High Cut pot is the bottom " +
      "arm of the divider used for High Boost so for High Boost to be correct, " +
      "this needs to total exactly 4700 ohms\". Cross-checked against the same " +
      "document's insertion-loss figure, 4.7/(4.7+47) = 20.83dB, which only " +
      "holds if the hi cut pot is 4K7 against the 47K hi boost pot.",
  },
]

/** Frequency labels per selector position, from P3bandDoc.pdf pages 2 and 4,
 * aligned to throw pins by the capacitor values the netlist puts on each pin.
 * The alignment is verified in `values.md`, not assumed. */
export const SELECTORS: readonly SelectorTerminals[] = [
  {
    kind: "selector",
    ref: "SW_LO_CUT",
    commonConnector: "J9",
    throwsConnector: "J5",
    positions: ["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"],
    source: "P3bandDoc.pdf p4 Ccut column",
  },
  {
    kind: "selector",
    ref: "SW_LO_BOOST",
    commonConnector: "J6",
    throwsConnector: "J10",
    positions: ["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"],
    source: "P3bandDoc.pdf p4 Cboost column",
  },
  {
    kind: "selector",
    ref: "SW_HI_CUT",
    commonConnector: "J3",
    throwsConnector: "J12",
    positions: ["3kHz", "4kHz", "5kHz", "8kHz", "10kHz", "16kHz"],
    source: "P3bandDoc.pdf p2 Ccut column",
  },
]

/** Terminals deliberately left out of the reference model, with the reason.
 * Nothing here is silently dropped. */
export const EXCLUDED: Readonly<Record<string, string>> = {
  J13: "hi boost selector common — hi boost section excluded, see below",
  J8: "hi boost selector throws — hi boost section excluded",
  J15: "hi boost inductor taps — hi boost section excluded",
  J19: "hi boost Qmax feed — hi boost section excluded",
  J20: "hi boost Q pot — hi boost section excluded",
  J21: "hi boost level pot — hi boost section excluded",
  J14: "mid inductor selector send — mid section excluded, values unresolved",
  J29: "mid level pot — mid section excluded",
  J31: "mid input — mid section excluded",
  J32: "mid output — mid section excluded",
  J35: "mid inductor return / cap selector send — mid section excluded",
  J36: "mid capacitor selector return — mid section excluded",
  J38: "mid cut/boost switch — mid section excluded",
  J39: "mid cut Q — mid section excluded",
  J40: "mid inductor return — mid section excluded",
}

/** Components excluded along with their sections. */
export const EXCLUDED_COMPONENTS: Readonly<Record<string, string>> = {
  C8: "mid", C9: "mid", C10: "mid", C11: "mid", C12: "mid", C13: "mid",
  C36: "mid", C37: "mid", C38: "mid", C39: "mid", C40: "mid", C41: "mid",
  C14: "hi boost", C15: "hi boost", C16: "hi boost", C17: "hi boost",
  C34: "hi boost", C35: "hi boost",
  C2a2: "hi boost", C4a2: "hi boost", C5a2: "hi boost",
  R3: "hi boost (Qmax)",
}
