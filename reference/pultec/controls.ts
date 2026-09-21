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
  /** Selectors sharing a gang identifier are poles of one physical switch and
   * must always be at the same position. The resolver enforces it. */
  readonly gang?: string
  readonly source: string
}

/** The high frequency selector is ONE two-pole rotary, confirmed by the
 * builder: HISWA picks the hi boost capacitor, HISWB picks the hi cut
 * capacitor. The reference documentation is laid out the same way — its
 * "Pultec Hi Boost/Cut" table gives a Cboost and a Ccut on each row, one row
 * per switch position — so boost and cut frequency are not independent
 * controls on this design.
 */
export const HI_FREQUENCY_GANG = "hi_freq"

/** The low frequency selector is likewise ONE two-pole rotary. The builder's
 * master schematic labels the low boost pole LOSWB, matching the HISWA/HISWB
 * pair on the high side, and the reference documentation's "Pultec Lo
 * Boost/Cut" table has the same shape as the high one: a Cboost and a Ccut on
 * each row, one row per switch position. So low boost and low cut frequency are
 * not independent controls either. */
export const LO_FREQUENCY_GANG = "lo_freq"

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
    gang: LO_FREQUENCY_GANG,
    source: "P3bandDoc.pdf p4 Ccut column; LOSWA, one pole of the low frequency selector",
  },
  {
    kind: "selector",
    ref: "SW_LO_BOOST",
    commonConnector: "J6",
    throwsConnector: "J10",
    positions: ["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"],
    gang: LO_FREQUENCY_GANG,
    source: "P3bandDoc.pdf p4 Cboost column; LOSWB, the other pole of the low frequency selector",
  },
  {
    kind: "selector",
    ref: "SW_HI_CUT",
    commonConnector: "J3",
    throwsConnector: "J12",
    positions: ["3kHz", "4kHz", "5kHz", "8kHz", "10kHz", "16kHz"],
    gang: HI_FREQUENCY_GANG,
    source: "P3bandDoc.pdf p2 Ccut column; HISWB, the second pole of the high frequency selector",
  },
]

/** The hi boost rotary is a TWO-POLE switch on one shaft, confirmed by the
 * builder. Both poles move together, so a capacitor and its matching inductor
 * tap are always selected as a pair:
 *
 *   pole A  common J13 (from the input)  ->  throws J8  (the six capacitors)
 *   pole B  common J19 (to Qmax)         ->  throws     (the inductor taps)
 *
 * That pairing is why six positions need only four tap wires: 4k and 5k share
 * the 0.3H tap, 10k and 16k share 0.1H. The grouping is not asserted here — it
 * falls out of which capacitors the netlist puts on each J15 terminal, and
 * independently matches the Lboost column of the reference documentation.
 *
 * Because exactly one tap is live at a time and the rest have nothing connected
 * to them, each tap can be modelled as a plain inductor of its stated value.
 * Magnetic coupling between winding sections would matter if more than one
 * section carried current; the one-at-a-time switching is what makes the simple
 * treatment correct rather than a shortcut. See `three-band.ts`.
 */
export interface HiBoostPosition {
  readonly label: string
  /** Throw pin on J8 carrying this position's capacitor tails. */
  readonly capacitorPin: string
  /** Throw pin on J15 carrying this position's inductor tap. */
  readonly tapPin: string
  /** Tap inductance in henries, from the documentation's Lboost column. */
  readonly henries: number
}

export const HI_BOOST_POSITIONS: readonly HiBoostPosition[] = [
  { label: "3kHz", capacitorPin: "6", tapPin: "4", henries: 0.6 },
  { label: "4kHz", capacitorPin: "5", tapPin: "3", henries: 0.3 },
  { label: "5kHz", capacitorPin: "4", tapPin: "3", henries: 0.3 },
  { label: "8kHz", capacitorPin: "3", tapPin: "2", henries: 0.2 },
  { label: "10kHz", capacitorPin: "2", tapPin: "1", henries: 0.1 },
  { label: "16kHz", capacitorPin: "1", tapPin: "1", henries: 0.1 },
]

/** Terminals deliberately left out of the reference model, with the reason.
 * Nothing here is silently dropped. */
/* The mid section IS modelled now, but from Thompson-Bell's documentation
 * rather than from this board's netlist — the as-built mid carries a
 * six-position subset with placeholder values. So these terminals have no
 * counterpart in the model: they belong to a different realisation of the
 * section, not to an omitted one. See `mid.ts`. */
export const EXCLUDED: Readonly<Record<string, string>> = {
  J14: "mid inductor selector send — as-built mid, not the modelled one",
  J29: "mid level pot — as-built mid, not the modelled one",
  J31: "mid input — as-built mid, not the modelled one",
  J32: "mid output — as-built mid, not the modelled one",
  J35: "mid inductor return / cap selector send — as-built mid, not the modelled one",
  J36: "mid capacitor selector return — as-built mid, not the modelled one",
  J38: "mid cut/boost switch — as-built mid, not the modelled one",
  J39: "mid cut Q — as-built mid, not the modelled one",
  J40: "mid inductor return — as-built mid, not the modelled one",
}

/** Components of the as-built mid that the model does not carry. The mid
 * section itself IS modelled — from Thompson-Bell's documentation — so these
 * are excluded because they belong to this board's realisation of it, with its
 * six-position subset and placeholder values, not because the section is
 * missing. Same distinction as `EXCLUDED` above. */
export const EXCLUDED_COMPONENTS: Readonly<Record<string, string>> = {
  C8: "mid", C9: "mid", C10: "mid", C11: "mid", C12: "mid", C13: "mid",
  C36: "mid", C37: "mid", C38: "mid", C39: "mid", C40: "mid", C41: "mid",
}
