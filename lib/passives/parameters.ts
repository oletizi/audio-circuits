/** A log pot's curve needs a stated constant from the reference; there is no default. */
export type Taper =
  | { readonly type: "linear" }
  | { readonly type: "log"; readonly curveConstant: number }

export interface ResistorParameters { readonly ohms: number }
export interface CapacitorParameters { readonly farads: number }

export interface InductorParameters {
  readonly henries: number
  /** Tap identifier to inductance measured from pin `a`, for tapped windings. */
  readonly taps?: Readonly<Record<string, number>>
}

export interface PotentiometerParameters {
  readonly ohms: number
  readonly taper: Taper
}

export interface SwitchParameters {
  readonly positions: readonly string[]
  /** Position name to the pin pairs shorted in that position. */
  readonly contacts: Readonly<Record<string, readonly (readonly [string, string])[]>>
  /** Identifier shared by ganged switches that must select together. */
  readonly gang?: string
}

/** Source annotations. Deliberately excluded from electrical identity comparison. */
export interface Provenance {
  readonly source: string
  readonly location?: string
  readonly note?: string
  readonly unresolved?: readonly string[]
}
