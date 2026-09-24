/** The mid boost/cut network, from Ian Thompson-Bell's documentation.
 *
 * PROVENANCE DIFFERS FROM THE REST OF THIS REFERENCE. Every other section takes
 * its topology from an exact netlist export of the manufactured board. This one
 * cannot: that board implements a six-position subset whose capacitor values are
 * placeholders in the schematic (`Mid C1A` … `Mid C6B`). The builder's direction
 * is to favour the documented design over the as-built example, and to carry all
 * eleven frequencies into the modular topology so any of them can be omitted at
 * build time rather than designed out.
 *
 * So the values here come from P3bandDoc.pdf page 3, "Pultec Mid Boost/Cut" —
 * the same eleven frequencies as the Pultec MEQ5, using a VTB9050 inductor — and
 * the topology from the builder's master schematic. Nothing here is corroborated
 * by the netlist, and that is a deliberate, recorded difference rather than an
 * oversight.
 *
 * INSERTION. The mid level pot is a rheostat — wiper tied to one end — running
 * from the node where the hi boost and lo cut pots meet, down to the LC
 * network. So the section hangs off `hi_boost_out` as a variable-depth shunt
 * rather than sitting in series with the signal. From there: selector, selected
 * capacitor, its winding tap, the coil, and finally the boost/off/cut switch,
 * which returns the coil's far end through 4K7 to the input for boost, through
 * 1K to ground for cut, or nowhere at all in the centre position.
 */

/** Where the mid network taps the signal path: the node between the hi boost
 * pot's output and the lo cut pot's input. */
export const MID_TAP_POINT = "hi_boost_out"

/** The three positions of the cut/boost switch. `off` opens the coil's return
 * entirely, which takes the whole section out of circuit. */
export type MidMode = "boost" | "off" | "cut"

export const MID_MODES: readonly MidMode[] = ["boost", "off", "cut"]

export interface MidPosition {
  readonly label: string
  /** Winding tap this position uses, in henries. */
  readonly henries: number
  /** Capacitors on this position. Two where the documentation pairs them. */
  readonly capacitors: readonly string[]
}

/** P3bandDoc.pdf page 3, transcribed in full. Eleven positions. */
export const MID_POSITIONS: readonly MidPosition[] = [
  { label: "200Hz", henries: 2, capacitors: ["330nF"] },
  { label: "300Hz", henries: 2, capacitors: ["150nF"] },
  { label: "500Hz", henries: 2, capacitors: ["47nF"] },
  { label: "700Hz", henries: 2, capacitors: ["22nF", "3.3nF"] },
  { label: "1kHz", henries: 1, capacitors: ["22nF", "3.3nF"] },
  { label: "1k5Hz", henries: 1, capacitors: ["12nF"] },
  { label: "2kHz", henries: 0.45, capacitors: ["12nF", "2.2nF"] },
  { label: "3kHz", henries: 0.45, capacitors: ["4.7nF", "1.5nF"] },
  { label: "4kHz", henries: 0.22, capacitors: ["4.7nF", "2.2nF"] },
  { label: "5kHz", henries: 0.22, capacitors: ["4.7nF"] },
  { label: "7kHz", henries: 0.1, capacitors: ["2.2nF", "1nF"] },
]

/** The distinct winding taps the eleven positions call for, largest first.
 * Five taps serve eleven positions, the same economy as the hi boost coil. */
export const MID_TAPS: readonly number[] = [...new Set(MID_POSITIONS.map(p => p.henries))]
  .sort((a, b) => b - a)

/** Fixed resistors around the section, from the master schematic.
 *
 * The cut/boost switch decides where the winding's far end returns: through
 * `boostReturnOhms` to the input for boost, through `cutReturnOhms` to ground
 * for cut, or nowhere in the centre position. `inputShuntOhms` sits across the
 * input independent of the switch.
 */
export const MID_RESISTORS = {
  boostReturnOhms: 4_700,
  cutReturnOhms: 1_000,
  inputShuntOhms: 100_000,
} as const

/** Level control, labelled on both the master schematic and the board. */
export const MID_LEVEL = { ohms: 47_000, taperClass: "log" } as const

/** A tap label usable in a net name: 2H, 1H, 0R45H and so on. */
export function tapLabel(henries: number): string {
  return `${String(henries).replace(".", "R")}H`
}
